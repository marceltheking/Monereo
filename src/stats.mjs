import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, db } from './store.mjs';
import { SITE_URL } from './seo.mjs';

// Anonymous visitor statistics. Only daily totals are kept. A visitor is recognised within one day by a
// hash of their IP address and user agent with a random key; the key and the day's hashes are deleted at
// midnight UTC, so nobody can be followed across days and no IP address is ever written to disk.

const FILE = path.join(DATA_DIR, 'stats.json');
const KEEP_DAYS = 730;
const MAX_KEYS = 300;
const ONLINE_MS = 5 * 60_000;
const EVENTS_PER_VISITOR = 200;
const SAVE_EVERY_MS = 30_000;

const BOT = /bot|crawl|spider|slurp|scrap|fetch|curl|wget|python|httpx|aiohttp|go-http|java\/|okhttp|axios|node|headless|phantom|puppeteer|playwright|selenium|lighthouse|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|feed|rss|validator|scan|archive/i;

let data = null;
let dirty = false;
const online = new Map();

const today = () => new Date().toISOString().slice(0, 10);

function emptyDay() {
  return {
    views: 0, visitors: 0, clicks: 0, searches: 0,
    pages: {}, refs: {}, browsers: {}, os: {}, devices: {}, langs: {}, terms: {}, links: {}, missing: {},
    hours: Array(24).fill(0),
  };
}

function load() {
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    data = { days: {}, current: null };
  }
  data.days ??= {};
  rollover();
}

// Starts a new day: a fresh key and an empty visitor list, and days past the retention period go.
function rollover() {
  const d = today();
  if (data.current?.date === d) return;
  data.current = { date: d, key: crypto.randomBytes(32).toString('hex'), seen: {} };
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400_000).toISOString().slice(0, 10);
  for (const k of Object.keys(data.days)) if (k < cutoff) delete data.days[k];
  online.clear();
  dirty = true;
}

function day() {
  if (!data) load();
  rollover();
  return (data.days[data.current.date] ??= emptyDay());
}

export function flush() {
  if (!data || !dirty) return;
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
  dirty = false;
}

setInterval(flush, SAVE_EVERY_MS).unref();

function bump(map, key, by = 1) {
  if (!key) return;
  if (!(key in map) && Object.keys(map).length >= MAX_KEYS) key = '(other)';
  map[key] = (map[key] || 0) + by;
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  return xff ? xff.split(',').pop().trim() : req.socket.remoteAddress || '';
}

function visitorHash(req) {
  return crypto.createHash('sha256').update(`${data.current.key}|${clientIp(req)}|${req.headers['user-agent'] || ''}`).digest('base64url').slice(0, 22);
}

function isBot(req) {
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.length < 20 || BOT.test(ua)) return true;
  const purpose = req.headers['sec-purpose'] || req.headers.purpose || '';
  return /prefetch|prerender/i.test(purpose);
}

function browserOf(ua) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

function osOf(ua) {
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux|BSD/.test(ua)) return 'Linux';
  return 'Other';
}

function deviceOf(ua) {
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'Tablet';
  if (/Mobi|iPhone|Android/.test(ua)) return 'Phone';
  return 'Desktop';
}

function referrerOf(req, url) {
  const tag = url.searchParams.get('ref') || url.searchParams.get('utm_source');
  if (tag) return tag.toLowerCase().replace(/[^\w.-]/g, '').slice(0, 40) || null;
  const ref = req.headers.referer || req.headers.referrer;
  if (!ref) return '(direct)';
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '').toLowerCase();
    if (!host || host === String(req.headers.host || '').replace(/^www\./, '').split(':')[0] || host === new URL(SITE_URL).hostname.replace(/^www\./, '')) return null;
    return host.slice(0, 60);
  } catch {
    return '(direct)';
  }
}

const cleanTerm = (q) => String(q || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 40);

// Counts a finished HTML page request. Returns whether it was counted.
export function recordPage(req, url, status) {
  if (req.method !== 'GET' || isBot(req)) return false;
  const d = day();
  const ua = req.headers['user-agent'];
  const hash = visitorHash(req);
  online.set(hash, Date.now());
  if (status === 404) {
    bump(d.missing, url.pathname.slice(0, 80));
    dirty = true;
    return true;
  }
  if (status !== 200 && status !== 503) return false;
  const isNew = !(hash in data.current.seen);
  if (isNew) {
    data.current.seen[hash] = 0;
    d.visitors += 1;
    bump(d.browsers, browserOf(ua));
    bump(d.os, osOf(ua));
    bump(d.devices, deviceOf(ua));
    const lang = String(req.headers['accept-language'] || '').split(/[,;-]/)[0].trim().toLowerCase();
    bump(d.langs, /^[a-z]{2,3}$/.test(lang) ? lang : 'unknown');
  }
  d.views += 1;
  d.hours[new Date().getUTCHours()] += 1;
  bump(d.pages, url.pathname.slice(0, 80) || '/');
  // Referrers count once per visitor and day, so browsing around the site doesn't inflate them.
  const ref = referrerOf(req, url);
  if (ref && (isNew || ref !== '(direct)')) bump(d.refs, ref);
  const q = cleanTerm(url.searchParams.get('q'));
  if (q.length >= 2) {
    d.searches += 1;
    bump(d.terms, q);
  }
  dirty = true;
  return true;
}

function knownListing(id) {
  if (typeof id !== 'string') return false;
  if (id.startsWith('x:')) return db().providers.some((p) => p.id === id.slice(2));
  if (id.startsWith('l:')) return db().directory.links.some((l) => l.id === id.slice(2));
  return false;
}

// Events sent by the directory script: a click on a listing, or a search typed in the box.
export function recordEvent(req, body) {
  if (isBot(req) || !body || typeof body !== 'object') return;
  const d = day();
  const hash = visitorHash(req);
  if (!(hash in data.current.seen)) return;
  if (data.current.seen[hash] >= EVENTS_PER_VISITOR) return;
  data.current.seen[hash] += 1;
  online.set(hash, Date.now());
  if (body.t === 'click' && knownListing(body.id)) {
    d.clicks += 1;
    bump(d.links, body.id);
  } else if (body.t === 'search') {
    const q = cleanTerm(body.q);
    if (q.length < 2) return;
    d.searches += 1;
    bump(d.terms, q);
  } else {
    return;
  }
  dirty = true;
}

// ---------- reading ----------

const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 86400_000).toISOString().slice(0, 10);

function sumRange(from, to) {
  const out = emptyDay();
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const d = data.days[date];
    if (!d) continue;
    for (const k of ['views', 'visitors', 'clicks', 'searches']) out[k] += d[k] || 0;
    for (const k of ['pages', 'refs', 'browsers', 'os', 'devices', 'langs', 'terms', 'links', 'missing']) {
      for (const [key, n] of Object.entries(d[k] || {})) out[k][key] = (out[k][key] || 0) + n;
    }
    (d.hours || []).forEach((n, i) => { out.hours[i] += n; });
  }
  return out;
}

const top = (map, n = 50) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));

function listingName(id) {
  if (id.startsWith('x:')) {
    const p = db().providers.find((x) => x.id === id.slice(2));
    return p ? { name: p.name, section: 'Exchanges' } : { name: id.slice(2) + ' (removed)', section: 'Exchanges' };
  }
  const l = db().directory.links.find((x) => x.id === id.slice(2));
  const c = l && db().directory.categories.find((x) => x.id === l.category);
  return l ? { name: l.name, section: c ? c.name : '' } : { name: id.slice(2) + ' (removed)', section: '' };
}

export function report(days) {
  day();
  const to = data.current.date;
  const from = addDays(to, -(days - 1));
  const sum = sumRange(from, to);
  const prev = sumRange(addDays(from, -days), addDays(from, -1));
  const series = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const d = data.days[date];
    series.push({ date, visitors: d?.visitors || 0, views: d?.views || 0, clicks: d?.clicks || 0 });
  }
  const now = Date.now();
  for (const [h, t] of online) if (now - t > ONLINE_MS) online.delete(h);
  const first = Object.keys(data.days).sort()[0] || to;
  return {
    from, to, days, since: first, online: online.size,
    totals: { views: sum.views, visitors: sum.visitors, clicks: sum.clicks, searches: sum.searches },
    previous: { views: prev.views, visitors: prev.visitors, clicks: prev.clicks, searches: prev.searches },
    series,
    hours: sum.hours,
    pages: top(sum.pages),
    refs: top(sum.refs),
    browsers: top(sum.browsers),
    os: top(sum.os),
    devices: top(sum.devices),
    langs: top(sum.langs),
    terms: top(sum.terms),
    missing: top(sum.missing),
    links: top(sum.links, 100).map((x) => ({ ...x, ...listingName(x.key) })),
  };
}

export function todaySummary() {
  const d = day();
  const now = Date.now();
  for (const [h, t] of online) if (now - t > ONLINE_MS) online.delete(h);
  return { visitors: d.visitors, views: d.views, clicks: d.clicks, online: online.size };
}
