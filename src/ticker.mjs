// XMR price for the bar at the bottom of every page. The server asks the price APIs, so visitors never contact them.

import { SITE_URL } from './seo.mjs';

const TIMEOUT = 6000;
const FRESH_MS = 60_000;

let last = null;
let pending = null;

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { accept: 'application/json', 'user-agent': new URL(SITE_URL).host } });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

async function fromCoinGecko() {
  const j = await getJson('https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=usd,eur,btc&include_24hr_change=true');
  const m = j.monero;
  if (!(m?.usd > 0)) throw new Error('CoinGecko sent no price');
  return { usd: m.usd, eur: m.eur, btc: m.btc, change: m.usd_24h_change ?? null, source: 'CoinGecko' };
}

// Kraken has no rolling 24h change, so the change is left out.
async function fromKraken() {
  const j = await getJson('https://api.kraken.com/0/public/Ticker?pair=XMRUSD,XMREUR,XMRXBT');
  const r = j.result || {};
  const last = (k) => Number(r[k]?.c?.[0]) || null;
  if (!last('XXMRZUSD')) throw new Error('Kraken sent no price');
  return { usd: last('XXMRZUSD'), eur: last('XXMRZEUR'), btc: last('XXMRXXBT'), change: null, source: 'Kraken' };
}

async function fetchPrice() {
  try {
    return await fromCoinGecko();
  } catch {
    return fromKraken();
  }
}

// The last known price, or null before the first answer.
export const tickerNow = () => last;

// Fresh price, asking the APIs at most once a minute however many visitors press refresh.
export async function ticker() {
  if (last && Date.now() - Date.parse(last.updatedAt) < FRESH_MS) return last;
  pending ??= fetchPrice()
    .then((p) => (last = { ...p, updatedAt: new Date().toISOString() }))
    .catch((e) => {
      console.error('xmr price failed:', e.message);
      return last;
    })
    .finally(() => { pending = null; });
  return pending;
}

// Keeps the price warm so pages render with it straight away.
export function startTicker() {
  ticker();
  setInterval(ticker, FRESH_MS).unref();
}

// Display helpers shared by the page and the script.
export const fmtUsd = (n) => (n == null ? '-' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export const fmtBtc = (n) => (n == null ? '-' : `${n.toFixed(6)} BTC`);
export const fmtChange = (n) => (n == null ? '' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`);
