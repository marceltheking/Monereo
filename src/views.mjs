import { asset, imageUrl } from './assets.mjs';
import { icon } from './icons.mjs';
import { absolute, jsonLd, organizationLd, websiteLd, faqLd } from './seo.mjs';
import { categoryItems, categoryPath, categorySeo } from './seo-content.mjs';
import { GUIDES, guideCards } from './guides.mjs';
import { tickerNow, fmtUsd, fmtBtc, fmtChange } from './ticker.mjs';
import {
  BASE,
  KYC_GRADES,
  kycGrade,
  providers,
  directory,
  socials as socialLinks,
  settings,
  formatGuarantee,
  guaranteeParts,
  hasGuarantee,
  LIQUIDITY,
  LIQUIDITY_MIXED_HELP,
  LIQUIDITY_THIRD_HELP,
} from './data.mjs';

export const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

export const exLogo = (p, size = 36) =>
  `<img class="ex-logo" src="${imageUrl(p.logo)}" width="${size}" height="${size}" alt="">`;

export const guaranteeCell = (p) => hasGuarantee(p)
  ? `<span class="guarantees">${guaranteeParts(p).map((g) => `<span class="guarantee${g.ours ? ' is-ours' : ''}">${formatGuarantee(g.amount)}${helpTip(g.note)}</span>`).join('<span class="g-plus">+</span>')}</span>`
  : '<span class="dim">None</span>';

// A "?" that explains something on hover or focus. The title attribute covers visitors without JavaScript.
export const helpTip = (text) => text
  ? `<span class="help-tip" tabindex="0" role="img" aria-label="${esc(text)}" title="${esc(text)}" data-tip="${esc(text)}">?</span>`
  : '';

// The fee an exchange publishes for a floating-rate swap, as set in the admin. Left empty there, it is unknown.
export const hasFee = (p) => typeof p.spread === 'number';

export const feeText = (p) => {
  const pct = p.spread * 100;
  return `${pct < 10 ? pct.toFixed(2).replace(/\.?0+$/, '') : pct.toFixed(1)}%`;
};

export function feeCell(p) {
  if (!hasFee(p)) return '<span class="dim">Unknown</span>';
  return `<span class="fee">${feeText(p)}</span>`;
}

export function liquidityCell(p) {
  return LIQUIDITY[p.liquidity]
    ? `<span class="liq liq-${p.liquidity}">${LIQUIDITY[p.liquidity]}${p.liquidity === 'third' ? helpTip(LIQUIDITY_THIRD_HELP) : p.liquidity === 'mixed' ? helpTip(LIQUIDITY_MIXED_HELP) : ''}</span>`
    : '<span class="dim">Not stated</span>';
}

export function kycCell(p) {
  const g = kycGrade(p.kyc);
  return `<span class="kyc" title="KYC score ${g.grade}: ${esc(g.description)}"><span class="grade grade-${g.grade.toLowerCase()}">${g.grade}</span><span class="kyc-label">${esc(g.label)}</span></span>`;
}

// [label, href, key]. On the directory the key is also the id of the section the link scrolls to.
const NAV = [
  ['Directory', `${BASE}/`, 'top'],
  ['Exchanges', `${BASE}/#exchanges`, 'exchanges'],
  ['Services', `${BASE}/#services`, 'services'],
  ['Guides', `${BASE}/guides`, 'guides'],
  ['FAQ', `${BASE}/#faq`, 'faq'],
];

// Services only shows up in the menus once the directory has links outside Exchanges.
const navItems = () => NAV.filter(([, , key]) => key !== 'services' || directory().some((c) => c.id !== 'exchanges'));

function emailLink(size, withText) {
  const email = settings().contactEmail;
  if (!email) return '';
  return `<a href="mailto:${esc(email)}" aria-label="Email ${esc(email)}" title="${esc(email)}">${icon('mail', size)}${withText ? esc(email) : ''}</a>`;
}

function socials(cls, labels = false) {
  const email = emailLink(17, false);
  return `<ul class="${cls}">
${socialLinks().map((s) => `<li><a${s.short ? ' class="has-label"' : ''} href="${esc(s.href || '#')}" aria-label="${s.label}" title="${s.label}"${s.href ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(s.icon, 17)}${labels ? `<span>${s.label}</span>` : s.short ? `<span>${s.short}</span>` : ''}</a></li>`).join('\n')}
${email ? `<li>${email}</li>` : ''}
</ul>`;
}

function brand() {
  return `<a class="brand" href="${BASE}/"><img src="${asset('logo.png')}" width="26" height="26" alt=""><span class="wordmark">Mone<em>reo</em></span></a>`;
}

// page = 'directory' highlights the section links as the visitor scrolls.
function header(page) {
  const links = navItems().map(([label, href, key]) => {
    const spy = page === 'directory' ? ` data-nav="${key}"` : '';
    return `<a href="${href}"${spy}>${label}</a>`;
  }).join('\n');
  return `<header class="nav">
<div class="container nav-inner">
${brand()}
<nav class="nav-links" aria-label="Primary">
${links}
</nav>
<div class="nav-end">
${socials('social')}
<span class="nav-sep" aria-hidden="true"></span>
<a class="btn btn-outline btn-sm" href="${BASE}/submit">Submit</a>
</div>
<details class="menu">
<summary aria-label="Menu">${icon('menu', 20)}</summary>
<div class="menu-panel">
<nav aria-label="Mobile">
${links}
</nav>
<a class="btn btn-outline btn-sm menu-submit" href="${BASE}/submit">Submit</a>
${socials('social')}
</div>
</details>
</div>
</header>`;
}

function footer() {
  const links = navItems().map(([label, href]) => `<a href="${href}">${label}</a>`).join('\n');
  // Every category page is linked from every page, which is how search engines find them.
  const categoryLinks = directory().map((c) => `<a href="${categoryPath(c)}" title="${esc(categorySeo(c).h1)}">${esc(c.name)}</a>`).join('\n');
  return `<footer class="footer">
<div class="container footer-inner">
<div class="footer-brand">
${brand()}
<p>Directory of no-KYC exchanges and privacy services. Independent project, not affiliated with the Monero project.</p>
</div>
<div class="footer-col">
<h3>Site</h3>
${links}
</div>
${categoryLinks ? `<div class="footer-col footer-cats">
<h3>Categories</h3>
${categoryLinks}
</div>` : ''}
<div class="footer-col">
<h3>Community</h3>
${socialLinks().map((so) => `<a href="${esc(so.href || '#')}"${so.href ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(so.icon, 15)}${so.label}</a>`).join('\n')}
${emailLink(15, true)}
</div>
</div>
<div class="container footer-bottom"><span>&copy; ${new Date().getUTCFullYear()} Monereo &middot; <a href="${BASE}/terms">Terms</a> &middot; <a href="${BASE}/privacy">Privacy</a></span><span>No accounts &middot; No tracking</span></div>
</footer>`;
}

function banner() {
  const b = settings().banner;
  if (!b.enabled || !b.text) return '';
  return `<div class="banner banner-${b.tone === 'warning' ? 'warning' : 'info'}" role="status"><div class="container">${icon('info', 16)}<span>${esc(b.text)}</span></div></div>`;
}

// The Monero symbol, drawn inline so the bar needs no extra request.
const MONERO_MARK = '<svg class="tk-xmr" viewBox="0 0 256 256" width="15" height="15" aria-hidden="true"><path fill="#ff6600" d="M128 0C57.3 0 0 57.3 0 128c0 14.1 2.3 27.7 6.5 40.4h38.3V60.7l83.2 83.2 83.2-83.2v107.7h38.3c4.2-12.7 6.5-26.3 6.5-40.4C256 57.3 198.7 0 128 0"/><path fill="#4c4c4c" d="m108.9 163.1-36.3-36.3v67.8H18.6c22.5 36.9 63.1 61.5 109.4 61.5s86.9-24.6 109.4-61.5h-53.9v-67.8l-36.3 36.3-19.1 19.1-19.2-19.1z"/></svg>';

// Thin bar fixed to the bottom of every page: the XMR price and two small buttons.
function tickerBar() {
  const t = tickerNow();
  const dir = t?.change == null ? '' : t.change >= 0 ? ' is-up' : ' is-down';
  const time = t ? new Date(t.updatedAt) : null;
  return `<div class="tickerbar${t ? '' : ' is-off'}" data-ticker>
<div class="container tickerbar-inner">
<div class="tk-main">
${MONERO_MARK}
<strong class="tk-price" data-tk="usd" aria-live="polite">${fmtUsd(t?.usd)}</strong>
<span class="tk-change${dir}" data-tk="change" title="Change over the last 24 hours">${fmtChange(t?.change)}</span>
<span class="tk-alt tk-wide" data-tk="btc" title="Price in bitcoin">${fmtBtc(t?.btc)}</span>
</div>
<div class="tk-end">
<span class="tk-updated" data-tk="updated"${time ? ` data-time="${time.toISOString()}" title="Price from ${esc(t.source)}, fetched by our server"` : ''}>${time ? `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')} UTC` : 'Price unavailable'}</span>
<button class="tk-btn" type="button" data-tk-refresh aria-label="Refresh price" title="Refresh price" hidden>${icon('refresh', 12)}</button>
<a class="tk-btn" href="#" data-tk-top aria-label="Back to top" title="Back to top">${icon('arrowUp', 12)}</a>
</div>
</div>
</div>`;
}

export function layout({ title, description, body, head = '', script = 'app.js', canonical = null, robots = null, ld = [], page = '' }) {
  const canon = canonical ? absolute(canonical) : null;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#1c1c1f">
<meta name="description" content="${esc(description)}">
${robots ? `<meta name="robots" content="${robots}">` : ''}
<title>${esc(title)}</title>
${canon ? `<link rel="canonical" href="${esc(canon)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Monereo">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canon ? `<meta property="og:url" content="${esc(canon)}">` : ''}
<meta property="og:image" content="${absolute('/og.png')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${absolute('/og.png')}">
<link rel="icon" type="image/png" href="${asset('favicon.png')}">
<link rel="apple-touch-icon" href="${asset('logo.png')}">
${jsonLd(ld)}
<link rel="preload" href="${BASE}/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset('style.css')}">
${head}
</head>
<body>
${header(page)}
${banner()}
<main>
${body}
</main>
${footer()}
${tickerBar()}
<script src="${asset('tip.js')}" defer></script>
<script src="${asset('ticker.js')}" defer></script>
${[].concat(script).map((name) => `<script src="${asset(name)}" defer></script>`).join('\n')}
</body>
</html>`;
}

// ---------- link directory (homepage) ----------

export const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

const CATEGORY_ICONS = {
  exchanges: 'repeat', aggregators: 'barChart', directories: 'book', wallets: 'wallet', vpn: 'shieldCheck', email: 'mail',
  hosting: 'server', domains: 'globe', phone: 'phone', giftcards: 'gift', messaging: 'message', tools: 'lock', merchants: 'coins',
};

export const catIcon = (c, size) => icon(CATEGORY_ICONS[c.id] || 'link', size);

// Section ids double as #anchors; ids the page already uses get a prefix.
const catAnchor = (c) => (['top', 'faq', 'services', 'results', 'dir-none'].includes(c.id) ? `cat-${c.id}` : c.id);

const DIR_FAQ = [
  ['What is Monereo?', 'A directory of no-KYC crypto exchanges and privacy services, with a focus on Monero. Every listing links straight to the service.'],
  ['How are services picked?', 'Listings are chosen for privacy: they work without ID for everyday use, take crypto, or both. Exchanges also get a KYC score from A to F based on how often they ask for ID.'],
  ['What does the KYC score mean?', 'A means an exchange never asks for ID. F means ID is required for every swap. The letters in between show how often checks happen, so you can judge the risk before you send funds.'],
  ['Does Monereo handle my funds?', 'No. Monereo only links to services. Anything you do happens on the service itself, under its own terms.'],
  ['What do Verified and Recommended mean?', 'Verified means the Monereo team has tested the service itself. Unverified listings have not been tested by us yet, so take extra care. Recommended marks the services we would pick first in their category; they are shown at the top.'],
  ['Is a listing an endorsement?', 'No. Listings are a starting point, not a guarantee. Always check a service yourself and start with a small amount.'],
  ['Does it need JavaScript?', 'No. Search and every link work with scripts disabled. A small self-hosted script makes search instant. There are no trackers or cookies; visits are only counted anonymously.'],
];

// Tags that matter most for privacy get a colour: orange for Monero, green for "no ID" style promises.
export function tagList(tags) {
  const tone = (t) => (/xmr|monero/i.test(t) ? ' class="is-xmr"' : /no kyc|no email|no phone|non-custodial/i.test(t) ? ' class="is-good"' : '');
  return tags.length ? `<span class="dir-tags">${tags.map((t) => `<span${tone(t)}>${esc(t)}</span>`).join('')}</span>` : '';
}

// Every listing says whether Monereo has checked it; the admin ticks Verified per service.
const VERIFIED_NOTE = 'Verified: the Monereo team has tested this service itself.';
const UNVERIFIED_NOTE = 'Unverified: listed, but not yet tested by the Monereo team.';

export const verifyBadge = (x) => x.verified
  ? `<span class="vbadge is-verified" title="${VERIFIED_NOTE}">${icon('badgeCheck', 14)}<span>Verified</span></span>`
  : `<span class="vbadge is-unverified" title="${UNVERIFIED_NOTE}">${icon('circleDashed', 12)}<span>Unverified</span></span>`;

export const recommendedRibbon = (x) => (x.recommended ? `<span class="rec-ribbon">${icon('star', 11)}Recommended</span>` : '');

const trustWords = (x) => [x.verified ? 'verified' : 'unverified', x.recommended ? 'recommended' : ''];

// Filters under the category list. Each one is a query flag (?verified=1), so they work without scripts too.
// Tags are matched exactly as the admin sets them; exchanges have no tags, so only the trust filters apply to them.
const hasTag = (x, ...names) => (x.tags ?? []).some((t) => names.includes(t));
export const FILTERS = [
  { key: 'verified', label: 'Verified only', icon: 'badgeCheck', test: (x) => Boolean(x.verified) },
  { key: 'recommended', label: 'Recommended', icon: 'star', test: (x) => Boolean(x.recommended) },
  { key: 'xmr', label: 'Accepts Monero', icon: 'coins', test: (x) => hasTag(x, 'Accepts XMR', 'Monero') },
  { key: 'oss', label: 'Open source', icon: 'code', test: (x) => hasTag(x, 'Open source') },
  { key: 'tor', label: 'Tor', icon: 'eyeOff', test: (x) => hasTag(x, 'Tor') },
  { key: 'noaccount', label: 'No account', icon: 'userX', test: (x) => hasTag(x, 'No account') },
  { key: 'free', label: 'Free', icon: 'gift', test: (x) => hasTag(x, 'Free', 'Free tier') },
];
const filterFlags = (x) => FILTERS.filter((f) => f.test(x)).map((f) => f.key);

const POPULAR = ['Monero', 'No KYC', 'P2P', 'Accepts XMR', 'Open source'];

// Lowercased text a listing is searched by, on the server and in the browser.
// Coin tickers and names are searched as one word: a search for "monero" finds "Accepts XMR".
const SYNONYMS = [['xmr', 'monero'], ['btc', 'bitcoin']];
const searchText = (...parts) => {
  const text = parts.filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ');
  const extra = SYNONYMS.filter((pair) => pair.some((w) => text.includes(w))).flat().filter((w) => !text.includes(w));
  return extra.length ? `${text} ${extra.join(' ')}` : text;
};

export function exchangeCard(p, match, detailPath = '') {
  const host = hostOf(p.website);
  const g = kycGrade(p.kyc);
  const tags = p.kinds.map((k) => `${k} rate`);
  const text = searchText(p.name, host, 'exchange instant swap', g.label, `kyc ${g.grade}`, ...tags, ...trustWords(p));
  const flags = filterFlags(p);
  const hidden = !match(text, flags);
  const html = `<li class="xc${p.featured ? ' is-featured' : ''}${p.recommended ? ' is-recommended' : ''}" data-search="${esc(text)}" data-f="${flags.join(' ')}"${hidden ? ' hidden' : ''}>
${recommendedRibbon(p)}<div class="xc-top">${exLogo(p, 48)}<span class="xc-name"><strong>${esc(p.name)}</strong>${verifyBadge(p)}${p.featured ? '<span class="tag">Featured</span>' : ''}<small>${esc(host)}</small></span>${kycCell(p)}</div>
<dl class="xc-stats">
<div><dt>Fee</dt><dd>${feeCell(p)}</dd></div>
<div><dt>Avg. time</dt><dd>~${p.eta} min</dd></div>
<div><dt>Liquidity</dt><dd>${liquidityCell(p)}</dd></div>
<div><dt>Guarantee</dt><dd>${guaranteeCell(p)}</dd></div>
</dl>
${tagList(tags)}
${p.website || detailPath ? `<div class="xc-actions">${detailPath ? `<a class="btn btn-sm" href="${esc(detailPath)}">Details</a>` : ''}${p.website ? `<a class="btn btn-sm btn-primary" href="${esc(p.website)}" target="_blank" rel="noopener noreferrer nofollow" data-stat="x:${esc(p.id)}">Visit ${esc(p.name)}${icon('arrowRight', 14)}</a>` : ''}</div>` : ''}
</li>`;
  return { html, hidden };
}

// With detailPath the card opens the listing's page on Monereo instead of the service itself.
export function directoryCard(l, c, match, detailPath = '') {
  const host = hostOf(l.url);
  const text = searchText(l.name, host, l.description, c.name, ...l.tags, ...trustWords(l));
  const logo = l.logo
    ? `<img class="dir-logo" src="${esc(imageUrl(l.logo))}" width="40" height="40" alt="" loading="lazy">`
    : `<span class="dir-logo dir-letter" aria-hidden="true">${esc(l.name.slice(0, 1).toUpperCase())}</span>`;
  const flags = filterFlags(l);
  const hidden = !match(text, flags);
  const html = `<li data-search="${esc(text)}" data-f="${flags.join(' ')}"${hidden ? ' hidden' : ''}><a class="dir-card${l.recommended ? ' is-recommended' : ''}" ${detailPath ? `href="${esc(detailPath)}"` : `href="${esc(l.url)}" target="_blank" rel="noopener noreferrer nofollow" data-stat="l:${esc(l.id)}"`}>
${recommendedRibbon(l)}<span class="dir-top">${logo}<span class="dir-name"><span class="dir-title"><strong>${esc(l.name)}</strong>${verifyBadge(l)}</span><small>${esc(host)}</small></span>${icon('arrowRight', 16)}</span>
${l.description ? `<p>${esc(l.description)}</p>` : ''}${tagList(l.tags)}
</a></li>`;
  return { html, hidden };
}

// A titled list inside a category. Hidden when a search leaves it empty; the browser script does the same.
function dirGroup(title, items, list, extra = '') {
  const shown = items.filter((x) => !x.hidden).length;
  return `<div class="dir-group" data-group${shown ? '' : ' hidden'}>
${title ? `<h3 class="dir-sub">${title}</h3>` : ''}
<ul class="${list}">
${items.map((x) => x.html).join('\n')}
</ul>${extra}
</div>`;
}

// While a search or filter is on, the heading counts what is shown; data-total lets the browser script switch back.
function dirSection(c, groups, narrowed, lead = '') {
  const more = `<p class="dir-more"><a href="${categoryPath(c)}">${esc(categorySeo(c).browse)}${icon('arrowRight', 14)}</a></p>`;
  const count = groups.reduce((n, g) => n + g.shown, 0);
  const total = groups.reduce((n, g) => n + g.total, 0);
  return `<section class="dir-sec${c.id === 'exchanges' ? ' is-main' : ''}" id="${esc(catAnchor(c))}" data-cat="${esc(c.id)}"${count ? '' : ' hidden'}>
<header class="dir-sec-head">
<span class="dir-sec-icon">${catIcon(c, 20)}</span>
<div><h2>${esc(c.name)}<span class="dir-sec-count" data-total="${total}">${narrowed ? count : total}</span></h2>${c.blurb ? `<p>${esc(c.blurb)}</p>` : ''}</div>
</header>
${lead}${groups.map((g) => g.html).join('\n')}
${more}
</section>`;
}

export function directoryPage(params = {}) {
  if (settings().maintenance.enabled) return maintenancePage();
  const q = String(params.q ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const terms = q.toLowerCase().split(' ').filter(Boolean);
  const active = FILTERS.filter((f) => params[f.key]).map((f) => f.key);
  const narrowed = terms.length || active.length;
  const match = (text, flags) => terms.every((t) => text.includes(t)) && active.every((k) => flags.includes(k));
  const cats = directory();
  const exchanges = providers();
  const everything = [...exchanges, ...cats.flatMap((c) => c.links)];
  const filterCounts = FILTERS.map((f) => ({ ...f, n: everything.filter(f.test).length })).filter((f) => f.n);

  const build = (items, render) => items.map(render);
  const group = (title, items, list, extra) => ({
    html: dirGroup(title, items, list, extra),
    shown: items.filter((x) => !x.hidden).length,
    total: items.length,
  });

  const sections = cats.map((c) => {
    const links = build(c.links, (l) => directoryCard(l, c, match));
    if (c.id !== 'exchanges') return { c, groups: [group('', links, 'dir-grid')] };
    const legend = `<ul class="grade-legend" aria-label="KYC score legend">
${KYC_GRADES.map((g) => { const k = kycGrade(g); return `<li title="${esc(k.description)}"><span class="grade grade-${g.toLowerCase()}">${g}</span>${esc(k.label)}</li>`; }).join('\n')}
</ul>`;
    const groups = [];
    const paths = new Map(categoryItems(c).map((x) => [x.item, x.path]));
    if (exchanges.length) groups.push(group('Instant exchanges', build(exchanges, (p) => exchangeCard(p, match, paths.get(p))), 'xc-grid', legend));
    if (links.length) groups.push(group(exchanges.length ? 'Peer-to-peer and atomic swaps' : '', links, 'dir-grid'));
    return { c, groups };
  });

  const shownOf = (sec) => sec.groups.reduce((n, g) => n + g.shown, 0);
  const totalOf = (sec) => sec.groups.reduce((n, g) => n + g.total, 0);
  const total = sections.reduce((n, sec) => n + totalOf(sec), 0);
  const found = sections.reduce((n, sec) => n + shownOf(sec), 0);
  const main = sections.find((sec) => sec.c.id === 'exchanges');
  const rest = sections.filter((sec) => sec !== main);

  const side = `<aside class="dir-side">
<nav class="dir-cats" aria-label="Categories">
<h2>Categories</h2>
<ul>
${sections.map((sec) => `<li data-cat-link="${esc(sec.c.id)}"${shownOf(sec) ? '' : ' class="is-empty"'}><a href="#${esc(catAnchor(sec.c))}">${catIcon(sec.c, 16)}<span>${esc(sec.c.name)}</span><span class="n">${shownOf(sec)}</span></a></li>`).join('\n')}
</ul>
</nav>
${filterCounts.length ? `<div class="dir-filters" role="group" aria-labelledby="dir-f-h">
<h2 id="dir-f-h">Filters</h2>
<ul>
${filterCounts.map((f) => `<li><label class="dir-f" title="${f.n} ${f.n === 1 ? 'listing' : 'listings'}"><input type="checkbox" name="${f.key}" value="1" form="dir-form"${active.includes(f.key) ? ' checked' : ''}><span>${icon(f.icon, 15)}<span>${esc(f.label)}</span><span class="n">${f.n}</span></span></label></li>`).join('\n')}
</ul>
<button class="btn btn-outline btn-sm dir-f-apply" type="submit" form="dir-form">Apply filters</button>
</div>` : ''}
<div class="dir-side-cta">
<strong>Run a no-KYC service?</strong>
<p>Get it in front of people who care about privacy.</p>
<a class="btn btn-outline btn-sm" href="${BASE}/submit">Submit a listing</a>
</div>
</aside>`;

  const clearLabel = terms.length && active.length ? 'Clear all' : active.length ? 'Clear filters' : 'Clear search';
  const resultsLine = `<p class="dir-count" id="dir-count"${narrowed ? '' : ' hidden'} role="status"><span class="n">${found}</span> <span class="w">${found === 1 ? 'result' : 'results'}</span><span class="for"${terms.length ? '' : ' hidden'}> for &ldquo;<span class="q">${esc(q)}</span>&rdquo;</span> <a href="${BASE}/" class="dir-clear">${clearLabel}</a></p>`;

  const body = `
<section class="dir-hero" id="top">
<div class="container dir-hero-inner">
<h1>${esc(settings().heroTitle)}</h1>
<p class="lede">${esc(settings().heroLede)}</p>
<form class="dir-search" id="dir-form" method="get" action="${BASE}/" role="search">
<label class="search">${icon('search', 18)}<input type="search" name="q" id="dir-q" value="${esc(q)}" placeholder="Search ${total} exchanges and services" autocomplete="off" spellcheck="false" aria-label="Search the directory"><kbd>/</kbd></label>
<button class="btn btn-primary" type="submit">Search</button>
</form>
<p class="dir-popular"><span>Popular:</span>${POPULAR.map((t) => `<a href="${BASE}/?q=${encodeURIComponent(t.toLowerCase())}" data-q="${esc(t.toLowerCase())}">${esc(t)}</a>`).join('')}</p>
</div>
</section>

<div class="container dir-layout">
${side}
<div class="dir-main">
${resultsLine}
${main ? dirSection(main.c, main.groups, narrowed) : ''}
${rest.length ? `<div id="services">
${rest.map((sec) => dirSection(sec.c, sec.groups, narrowed)).join('\n')}
</div>` : ''}
<div class="dir-none" id="dir-none"${found ? ' hidden' : ''}>
${icon('search', 22)}
<p><strong>Nothing matches.</strong> Try another word or fewer filters, or <a href="${BASE}/">browse every category</a>.</p>
</div>
</div>
</div>

<section class="container">
<div class="dir-cta">
<div>
<h2>Know a service that belongs here?</h2>
<p>Exchanges, VPNs, email, hosting: if it respects your privacy and works without ID, tell us about it. We review every submission by hand.</p>
</div>
<a class="btn btn-primary" href="${BASE}/submit">Submit a service${icon('arrowRight', 16)}</a>
</div>
</section>

<section class="container dir-guides" id="guides">
<div class="dir-guides-head"><h2>Guides</h2><a href="${BASE}/guides">All guides${icon('arrowRight', 14)}</a></div>
${guideCards(GUIDES.slice(0, 6))}
</section>

<section class="section container dir-faq" id="faq">
<div class="dir-faq-head">
<h2>FAQ</h2>
</div>
<div class="faq">
${DIR_FAQ.map(([question, a]) => `<details><summary>${question}${icon('chevron', 16)}</summary><p>${a}</p></details>`).join('\n')}
</div>
</section>`;

  const names = exchanges.slice(0, 3).map((p) => p.name).join(', ');
  return layout({
    title: 'Monereo | No-KYC crypto exchange and privacy directory',
    description: `Directory of no-KYC crypto exchanges${names ? ` like ${names}` : ''}, plus wallets, VPNs, email, hosting and more. No accounts, no tracking.`,
    body,
    canonical: `${BASE}/`,
    robots: narrowed ? 'noindex, follow' : null,
    ld: narrowed ? [] : [organizationLd(), websiteLd(), faqLd(DIR_FAQ)],
    page: 'directory',
    script: ['app.js', 'directory.js'],
  });
}

export function maintenancePage() {
  const body = `
<section class="container empty">
<h1>Down for maintenance</h1>
<p>${esc(settings().maintenance.message)}</p>
</section>`;
  return layout({ title: 'Maintenance | Monereo', description: 'Monereo is down for maintenance.', body, robots: 'noindex' });
}

export function notFoundPage() {
  const body = `
<section class="container empty">
<h1>Page not found</h1>
<p>There is nothing at this address.</p>
<a class="btn btn-primary" href="${BASE}/">Back to the directory</a>
</section>`;
  return layout({ title: 'Not found | Monereo', description: 'Page not found.', body, robots: 'noindex' });
}
