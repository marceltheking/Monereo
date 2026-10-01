import crypto from 'node:crypto';
import { db, save } from './store.mjs';
import { BASE, KYC_GRADES, kycGrade, LIQUIDITY } from './data.mjs';
import { icon } from './icons.mjs';
import { layout, esc, catIcon } from './views.mjs';

export const SUBMIT_PATH = `${BASE}/submit`;

const LIMIT = 3;
const WINDOW_MS = 60 * 60_000;
const KEEP = 1000;
const recent = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of recent) if (!list.some((t) => now - t < WINDOW_MS)) recent.delete(ip);
}, 60_000).unref();

function allow(req) {
  const xff = req.headers['x-forwarded-for'];
  const ip = xff ? xff.split(',').pop().trim() : req.socket.remoteAddress || '';
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT) return false;
  list.push(now);
  recent.set(ip, list);
  return true;
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 32768) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    // Checkbox groups send the same name more than once, so keep every value.
    req.on('end', () => {
      const out = {};
      for (const [k, v] of new URLSearchParams(Buffer.concat(chunks).toString('utf8'))) (out[k] ??= []).push(v);
      resolve(out);
    });
    req.on('error', reject);
  });
}

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);

function httpsUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !/[\s"'<>`]/.test(v) ? u.toString() : null;
  } catch {
    return null;
  }
}

// The directory's categories, plus a way out for services that fit none of them.
const OTHER = { id: 'other', name: 'Something else', blurb: 'None of these fit. Tell us what it is.' };
const categories = () => [...db().directory.categories, OTHER];

// Categories that get their own questions. Any other category, including ones added later in the admin, gets the '_' set.
const KNOWN = ['exchanges', 'aggregators', 'wallets', 'vpn', 'email', 'hosting', 'domains', 'phone', 'giftcards', 'messaging'];
const catKey = (id) => (KNOWN.includes(id) ? id : '_');
const PAID = ['vpn', 'email', 'hosting', 'domains', 'phone', 'giftcards', '_'];

// Where a KYC score makes sense: services that swap coins for you.
const KYC_CATS = ['exchanges', 'aggregators'];

// Checkboxes that become the listing's tags. `cats` limits which categories see one; `link` is the address it asks for.
export const FEATURES = [
  { key: 'xmr', label: 'Accepts XMR', cats: [...PAID, 'exchanges', 'aggregators'] },
  { key: 'nokyc', label: 'No KYC', cats: PAID },
  { key: 'noaccount', label: 'No account needed', cats: ['exchanges', 'aggregators', 'giftcards', 'vpn', '_'] },
  { key: 'noemail', label: 'No email needed', cats: ['vpn', 'hosting', 'domains', 'phone', '_'] },
  { key: 'nophone', label: 'No phone number', cats: ['email', 'messaging', '_'] },
  { key: 'noncustodial', label: 'Non-custodial', cats: ['exchanges', 'wallets'] },
  { key: 'nologs', label: 'No-logs policy', cats: ['vpn', 'email', 'hosting'] },
  { key: 'e2e', label: 'End-to-end encrypted', cats: ['email', 'messaging'] },
  { key: 'opensource', label: 'Open source', link: 'source' },
  { key: 'tor', label: 'Tor onion site', link: 'onion' },
  { key: 'i2p', label: 'I2P site', link: 'i2p' },
];

export const EXCHANGE_KINDS = [
  ['instant', 'Instant swap', 'Send coins, get other coins back. No order book.'],
  ['p2p', 'Peer-to-peer', 'Users trade with each other, often with escrow.'],
  ['dex', 'DEX / atomic swaps', 'Trustless swaps, on-chain or through an app.'],
  ['orderbook', 'Order book exchange', 'Deposit, trade on a market, withdraw.'],
];

export const PLATFORMS = ['Android', 'iOS', 'Windows', 'macOS', 'Linux', 'Web', 'Hardware'];
const PLATFORM_CATS = ['wallets', 'messaging', 'vpn'];

// Public links a listing can show besides the website.
const SOCIALS = [
  ['x', 'Twitter / X', '@yourname or x.com/…'],
  ['tgchannel', 'Telegram channel', '@yourchannel or t.me/…'],
  ['nostr', 'Nostr', 'npub1…'],
  ['matrix', 'Matrix', '#room:server.org'],
  ['otherlink', 'Other page', 'https:// status page, forum thread, review…'],
];

// Labels for the admin's submission cards.
export const SUBMISSION_LABELS = {
  features: Object.fromEntries(FEATURES.map((f) => [f.key, f.label])),
  kinds: Object.fromEntries(EXCHANGE_KINDS.map(([k, l]) => [k, l])),
  liquidity: { ...LIQUIDITY, unsure: 'Not sure' },
  socials: Object.fromEntries(SOCIALS.map(([k, l]) => [k, l])),
};

// Steps of the form. Fields name the step they are on so an error can open it.
const STEPS = [
  ['category', 'Category'],
  ['basics', 'Basics'],
  ['details', 'Details'],
  ['links', 'Links'],
  ['contact', 'Contact'],
  ['review', 'Review'],
];
const FIELD_STEP = {
  category: 'category', name: 'basics', website: 'basics', summary: 'basics', description: 'basics',
  kinds: 'details', kyc: 'details', liquidity: 'details', coins: 'details', platforms: 'details', payments: 'details', onion: 'details', i2p: 'details', source: 'details',
  x: 'links', tgchannel: 'links', nostr: 'links', matrix: 'links', otherlink: 'links',
  telegram: 'contact', simplex: 'contact', email: 'contact',
};

const handleOf = (v) =>
  /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|x\.com|twitter\.com)\/([A-Za-z0-9_]{2,32})\/?$/i.exec(v)?.[1] ?? /^@?([A-Za-z0-9_]{2,32})$/.exec(v)?.[1];

// Returns [submission, null] or [null, { field, message }].
function validate(form) {
  const one = (k, max) => clean(form[k]?.[0], max);
  const many = (k) => form[k] || [];
  const category = categories().some((c) => c.id === one('category', 40)) ? one('category', 40) : '';
  const key = catKey(category);
  const features = FEATURES.filter((f) => (!f.cats || f.cats.includes(key)) && many('features').includes(f.key)).map((f) => f.key);
  const has = (f) => features.includes(f);
  const v = {
    category,
    name: one('name', 60),
    website: one('website', 300),
    summary: one('summary', 200).replace(/\s+/g, ' '),
    description: one('description', 1500),
    features,
    kinds: category === 'exchanges' ? EXCHANGE_KINDS.map(([k]) => k).filter((k) => many('kinds').includes(k)) : [],
    kyc: KYC_CATS.includes(category) && KYC_GRADES.includes(one('kyc', 1)) ? one('kyc', 1) : '',
    liquidity: category === 'exchanges' && ['own', 'mixed', 'third', 'unsure'].includes(one('liquidity', 10)) ? one('liquidity', 10) : '',
    coins: ['exchanges', 'aggregators', 'wallets'].includes(key) ? one('coins', 300) : '',
    platforms: PLATFORM_CATS.includes(key) ? PLATFORMS.filter((p) => many('platforms').includes(p)) : [],
    payments: PAID.includes(key) ? one('payments', 200) : '',
    onion: has('tor') ? one('onion', 200) : '',
    i2p: has('i2p') ? one('i2p', 600) : '',
    source: has('opensource') ? one('source', 300) : '',
    links: {},
    telegram: one('telegram', 120),
    simplex: one('simplex', 600),
    email: one('email', 160),
  };
  for (const [k] of SOCIALS) v.links[k] = one(k, 300);
  const fail = (field, message) => [v, { field, message, step: FIELD_STEP[field] }];

  if (!v.category) return fail('category', 'Pick the category your service belongs in.');
  if (v.name.length < 2) return fail('name', 'Enter the name of your service.');
  if (v.website && !/^https?:\/\//i.test(v.website)) v.website = `https://${v.website}`;
  const site = httpsUrl(v.website);
  if (!site) return fail('website', 'Enter the full https:// address of your website.');
  v.website = site;
  if (v.summary.length < 20) return fail('summary', 'Describe your service in one sentence (at least 20 characters).');

  if (v.category === 'exchanges' && !v.kinds.length) return fail('kinds', 'Pick at least one way your exchange works.');
  if (v.category === 'exchanges' && !v.kyc) return fail('kyc', 'Exchanges need a KYC score. Pick the one that fits your service.');
  if (has('tor')) {
    const m = /^(?:https?:\/\/)?((?:[a-z0-9-]+\.)*[a-z2-7]{56}\.onion)(\/\S*)?$/i.exec(v.onion);
    if (!m) return fail('onion', 'You ticked Tor: paste your .onion address (56 characters before .onion).');
    v.onion = `http://${m[1].toLowerCase()}${m[2] || '/'}`;
  }
  if (has('i2p')) {
    const m = /^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+i2p)(\/\S*)?$/i.exec(v.i2p);
    if (!m) return fail('i2p', 'You ticked I2P: paste your .i2p or .b32.i2p address.');
    v.i2p = `http://${m[1].toLowerCase()}${m[2] || '/'}`;
  }
  if (has('opensource')) {
    if (v.source && !/^https?:\/\//i.test(v.source)) v.source = `https://${v.source}`;
    const src = httpsUrl(v.source);
    if (!src) return fail('source', 'You ticked Open source: paste the https:// link to your code (GitHub, Codeberg…).');
    v.source = src;
  }

  const L = v.links;
  if (L.x) {
    const h = handleOf(L.x);
    if (!h) return fail('x', 'Enter an X username like @yourname or an x.com link.');
    L.x = `@${h}`;
  }
  if (L.tgchannel) {
    const h = handleOf(L.tgchannel);
    if (!h || h.length < 4) return fail('tgchannel', 'Enter a Telegram channel like @yourchannel or a t.me link.');
    L.tgchannel = `@${h}`;
  }
  if (L.nostr && !/^(?:nostr:)?(npub1[a-z0-9]{20,100})$/i.test(L.nostr)) return fail('nostr', 'Enter your Nostr public key, starting with npub1.');
  if (L.nostr) L.nostr = L.nostr.replace(/^nostr:/i, '');
  if (L.matrix && !/^[#@!][^\s:]+:[a-z0-9.-]+\.[a-z]{2,}$/i.test(L.matrix) && !httpsUrl(L.matrix)) return fail('matrix', 'Enter a Matrix room like #room:server.org or a matrix.to link.');
  if (L.otherlink) {
    if (!/^https?:\/\//i.test(L.otherlink)) L.otherlink = `https://${L.otherlink}`;
    const u = httpsUrl(L.otherlink);
    if (!u) return fail('otherlink', 'Enter the full https:// address of the page.');
    L.otherlink = u;
  }
  for (const k of Object.keys(L)) if (!L[k]) delete L[k];

  if (v.telegram) {
    const h = handleOf(v.telegram);
    if (!h || h.length < 4) return fail('telegram', 'Enter a Telegram username like @yourname or a t.me link.');
    v.telegram = `@${h}`;
  }
  if (v.simplex) {
    const link = httpsUrl(v.simplex);
    if (!link || !/simplex/i.test(new URL(link).host)) return fail('simplex', 'Paste your SimpleX contact or group link (https://simplex.chat/…).');
    v.simplex = link;
  }
  if (v.email && !/^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(v.email)) return fail('email', 'That email address does not look right.');
  if (!v.telegram && !v.simplex && !v.email) return fail('telegram', 'Leave at least one way to reach you: Telegram, SimpleX or email.');
  return [v, null];
}

// ---------- page ----------

const invalid = (error, name) => (error?.field === name ? ' is-invalid' : '');
const optional = '<em>optional</em>';

function field(name, label, control, { help, error, opt, cls = '' } = {}) {
  return `<label class="sub-field${cls}${invalid(error, name)}" data-field="${name}">
<span class="sub-label">${label}${opt ? ` ${optional}` : ''}</span>
${control}
${help ? `<small>${help}</small>` : ''}
</label>`;
}

// A group of fields that only shows for some categories (see the :has rules in style.css).
const only = (cats) => ` data-cats="${cats.join(' ')}"`;

function stepHead(i, title, lead) {
  return `<header class="step-head">
<span class="step-num">Step ${i + 1} of ${STEPS.length}</span>
<h2>${title}</h2>
${lead ? `<p>${lead}</p>` : ''}
</header>`;
}

function formPage(values = {}, error = null) {
  const v = (k) => esc(values[k] || '');
  const lv = (k) => esc(values.links?.[k] || '');
  const checked = (cond) => (cond ? ' checked' : '');
  const step = (id) => STEPS.findIndex(([s]) => s === id);

  const cats = categories().map((c) => `<label class="cat-pick"><input type="radio" name="category" value="${esc(c.id)}" data-key="${catKey(c.id)}"${checked(values.category === c.id)}><span class="cat-pick-box">${catIcon(c, 20)}<span><strong>${esc(c.name)}</strong>${c.blurb ? `<small>${esc(c.blurb)}</small>` : ''}</span><span class="cat-tick">${icon('check', 14)}</span></span></label>`).join('\n');

  const feature = (f) => `<label class="feat-pick"${f.cats ? only(f.cats) : ''}><input type="checkbox" name="features" value="${f.key}" id="feat-${f.key}"${checked(values.features?.includes(f.key))}><span>${icon('check', 13)}${esc(f.label)}</span></label>`;

  const kinds = EXCHANGE_KINDS.map(([k, label, help]) => `<label class="opt-pick"><input type="checkbox" name="kinds" value="${k}"${checked(values.kinds?.includes(k))}><span class="opt-box"><strong>${label}</strong><small>${help}</small></span></label>`).join('\n');

  const grades = KYC_GRADES.map((g) => {
    const k = kycGrade(g);
    return `<label class="grade-pick"><input type="radio" name="kyc" value="${g}"${checked(values.kyc === g)}><span class="grade-pick-box"><span class="grade grade-${g.toLowerCase()}">${g}</span><strong>${esc(k.label)}</strong><small>${esc(k.description)}</small></span></label>`;
  }).join('\n');

  const liquidity = Object.entries(SUBMISSION_LABELS.liquidity).map(([k, label]) => `<label class="seg-pick"><input type="radio" name="liquidity" value="${k}"${checked(values.liquidity === k)}><span>${label}</span></label>`).join('\n');

  const platforms = PLATFORMS.map((p) => `<label class="feat-pick"><input type="checkbox" name="platforms" value="${p}"${checked(values.platforms?.includes(p))}><span>${icon('check', 13)}${p}</span></label>`).join('\n');

  const socials = SOCIALS.map(([k, label, ph]) => field(k, label, `<input name="${k}" maxlength="300" value="${lv(k)}" placeholder="${ph}" autocomplete="off" autocapitalize="off" spellcheck="false">`, { error, opt: true })).join('\n');

  const sections = [
    // 1. Category
    `<fieldset class="sub-step" id="step-category" data-step="category">
${stepHead(step('category'), 'What kind of service is it?', 'Pick the section of the directory it belongs in. The next steps only ask what matters for that kind of service.')}
<div class="cat-picks${invalid(error, 'category')}" data-field="category">
${cats}
</div>
</fieldset>`,

    // 2. Basics
    `<fieldset class="sub-step" id="step-basics" data-step="basics">
${stepHead(step('basics'), 'The basics', 'This is what visitors see on your listing.')}
${field('name', 'Service name', `<input name="name" maxlength="60" value="${v('name')}" placeholder="e.g. MyVPN" autocomplete="organization">`, { error })}
${field('website', 'Website', `<input name="website" type="url" inputmode="url" maxlength="300" value="${v('website')}" placeholder="https://example.com" autocomplete="url" autocapitalize="off" spellcheck="false">`, { error, help: 'Your main clearnet address. A .onion or I2P address goes in the next step.' })}
${field('summary', 'One-line description', `<input name="summary" maxlength="200" value="${v('summary')}" placeholder="e.g. No-logs VPN you can pay for with Monero, no email needed.">`, { error, help: '<span data-count="summary">20 to 200 characters.</span> It appears on your listing.' })}
${field('description', 'More about it', `<textarea name="description" rows="4" maxlength="1500" placeholder="Anything that helps us review it: fees, limits, how long you have been running, where you are based…">${v('description')}</textarea>`, { error, opt: true, help: 'Up to 1500 characters. Only the Monereo team reads this.' })}
</fieldset>`,

    // 3. Details
    `<fieldset class="sub-step" id="step-details" data-step="details">
${stepHead(step('details'), 'Details', 'Tick what applies. If a box needs a link, a field for it opens right below.')}
<p class="sub-pickfirst">Pick a category in step 1 and the questions for it appear here.</p>

<div class="sub-block"${only(['exchanges'])} data-field="kinds">
<span class="sub-label">How does your exchange work? <em>pick all that apply</em></span>
<div class="opt-picks${invalid(error, 'kinds')}">
${kinds}
</div>
</div>

<div class="sub-block"${only(KYC_CATS)} data-field="kyc">
<span class="sub-label">KYC score <em class="kyc-req">required</em></span>
<small class="sub-help">How often do you, or the exchanges you route swaps to, ask customers for ID? Be honest: we test it, and a wrong score gets a listing removed.</small>
<div class="grade-picks${invalid(error, 'kyc')}">
${grades}
</div>
</div>

<div class="sub-block"${only(['exchanges'])} data-field="liquidity">
<span class="sub-label">Where do payouts come from? ${optional}</span>
<div class="seg-picks">
${liquidity}
</div>
<small class="sub-help">Own funds means you pay out from your own reserves. Third-party LP means swaps are routed through other exchanges, which can run their own checks.</small>
</div>

<div class="sub-block"${only(['exchanges', 'aggregators', 'wallets'])}>
${field('coins', 'Supported coins', `<input name="coins" maxlength="300" value="${v('coins')}" placeholder="e.g. XMR, BTC, LTC, ETH, USDT">`, { error, opt: true })}
</div>

<div class="sub-block"${only(PLATFORM_CATS)}>
<span class="sub-label">Platforms ${optional}</span>
<div class="feat-picks">
${platforms}
</div>
</div>

<div class="sub-block"${only(PAID)}>
${field('payments', 'Payment methods', `<input name="payments" maxlength="200" value="${v('payments')}" placeholder="e.g. XMR, BTC, Lightning, cash by mail">`, { error, opt: true })}
</div>

<div class="sub-block" data-field="features">
<span class="sub-label">Features <em>tick what applies</em></span>
<div class="feat-picks">
${FEATURES.map(feature).join('\n')}
</div>
<div class="feat-links">
${field('onion', `${icon('eyeOff', 14)}Onion address`, `<input name="onion" maxlength="200" value="${v('onion')}" placeholder="http://…56 characters….onion" autocomplete="off" autocapitalize="off" spellcheck="false">`, { error, cls: ' feat-link feat-link-tor', help: 'Required because you ticked Tor.' })}
${field('i2p', `${icon('eyeOff', 14)}I2P address`, `<input name="i2p" maxlength="600" value="${v('i2p')}" placeholder="http://yoursite.i2p or ….b32.i2p" autocomplete="off" autocapitalize="off" spellcheck="false">`, { error, cls: ' feat-link feat-link-i2p', help: 'Required because you ticked I2P.' })}
${field('source', `${icon('code', 14)}Source code`, `<input name="source" type="url" inputmode="url" maxlength="300" value="${v('source')}" placeholder="https://github.com/… or codeberg.org/…" autocomplete="off" autocapitalize="off" spellcheck="false">`, { error, cls: ' feat-link feat-link-opensource', help: 'Required because you ticked Open source.' })}
</div>
</div>
</fieldset>`,

    // 4. Links
    `<fieldset class="sub-step" id="step-links" data-step="links">
${stepHead(step('links'), 'Public links', 'Where people can follow you or read about you. All optional; these may be shown on your listing.')}
<div class="sub-grid">
${socials}
</div>
</fieldset>`,

    // 5. Contact
    `<fieldset class="sub-step" id="step-contact" data-step="contact">
${stepHead(step('contact'), 'How can we reach you?', 'Leave at least one. This is private: only the Monereo team sees it, and we use it only about this listing.')}
${field('telegram', `${icon('telegram', 15)}Telegram`, `<input name="telegram" maxlength="120" value="${v('telegram')}" placeholder="@yourname or t.me/…" autocomplete="off" autocapitalize="off" spellcheck="false">`, { error, opt: true })}
${field('simplex', `${icon('message', 15)}SimpleX`, `<input name="simplex" type="url" inputmode="url" maxlength="600" value="${v('simplex')}" placeholder="https://simplex.chat/contact#…" autocomplete="off" autocapitalize="off" spellcheck="false">`, { error, opt: true })}
${field('email', `${icon('mail', 15)}Email`, `<input name="email" type="email" inputmode="email" maxlength="160" value="${v('email')}" placeholder="you@example.com" autocomplete="email" autocapitalize="off" spellcheck="false">`, { error, opt: true })}
</fieldset>`,

    // 6. Review (filled in by submit.js; without scripts the form ends at Contact)
    `<section class="sub-step sub-review" id="step-review" data-step="review" hidden>
${stepHead(step('review'), 'Check and send', 'Make sure everything is right. Tap Edit to change a section.')}
<div class="review-list" data-review></div>
</section>`,
  ];

  const tabs = STEPS.map(([id, label], i) => `<li><button type="button" class="step-tab" data-go="${id}"><span class="step-dot">${i + 1}</span><span class="step-label">${label}</span></button></li>`).join('\n');
  const startStep = error?.step || 'category';

  const body = `
<section class="container swap-page order-page submit-page">
<a class="back-link" href="${BASE}/">${icon('chevron', 15)}Back to the directory</a>
<div class="order-title">
<div><h1>Submit a service</h1><p>Run a no-KYC exchange or a privacy service? Tell us about it in a few short steps. Listing is free, and we review every submission by hand.</p></div>
</div>
<div class="order-grid">
<form class="order-card sub-form" method="post" action="${SUBMIT_PATH}" novalidate data-start="${startStep}">
<ol class="step-tabs" aria-label="Steps">
${tabs}
</ol>
<div class="step-bar" aria-hidden="true"><span></span></div>
<div class="order-body">
${error ? `<p class="form-error" role="alert" data-server-error>${icon('info', 16)}<span>${esc(error.message)}</span></p>` : ''}
<p class="form-error step-error" role="alert" hidden>${icon('info', 16)}<span></span></p>
${sections.join('\n')}
<label class="sub-honey" aria-hidden="true">Leave this empty<input name="company" tabindex="-1" autocomplete="off"></label>
<p class="order-foot">${icon('lock', 13)}Only the Monereo team sees your contact details. See our <a href="${BASE}/privacy">Privacy Policy</a>.</p>
<div class="step-nav">
<button class="btn step-back" type="button" data-back>${icon('chevron', 16)}Back</button>
<button class="btn btn-primary step-next" type="button" data-next><span>Next</span>${icon('arrowRight', 16)}</button>
<button class="btn btn-primary btn-cta order-submit" type="submit"><span>Submit service${icon('arrowRight', 16)}</span></button>
</div>
</div>
</form>
<aside class="order-side">
<div class="side-card">
<span class="side-kicker">What we look for</span>
<ol class="timeline">
<li><strong>No KYC or rare KYC</strong><span>Monereo lists privacy-friendly services. Exchanges get a KYC score from A to F, and we check it.</span></li>
<li><strong>Crypto payments</strong><span>Services that take crypto, ideally Monero, without asking for personal details.</span></li>
<li><strong>A track record</strong><span>Public terms, a working support channel and a history of paying out.</span></li>
</ol>
</div>
<div class="side-card">
<span class="side-kicker">After you submit</span>
<p class="side-text">We review your service, usually within a few days, and contact you on the channel you gave. Listing is free.</p>
</div>
</aside>
</div>
</section>`;
  return layout({
    title: 'Submit a service | Monereo',
    description: 'Run a no-KYC exchange or privacy service? Submit it to be listed in the Monereo directory.',
    body,
    canonical: SUBMIT_PATH,
    script: ['app.js', 'submit.js'],
  });
}

function thanksPage() {
  const body = `
<section class="container swap-page order-page submit-page">
<div class="order-card sub-thanks">
<div class="order-body">
<div class="state-panel is-good"><span class="state-icon">${icon('check', 22)}</span><div>
<h1>Thanks, we got your submission</h1>
<p>We'll review your service and get back to you on the contact you left. There's nothing else you need to do.</p>
</div></div>
<a class="btn" href="${BASE}/">Back to the directory</a>
</div>
</div>
</section>`;
  return layout({ title: 'Submission received | Monereo', description: 'Submission received.', body, robots: 'noindex' });
}

function send(res, req, status, html) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : html);
}

export async function handleSubmit(req, res, url) {
  if (url.pathname !== SUBMIT_PATH && url.pathname !== `${SUBMIT_PATH}/`) return send(res, req, 404, formPage());
  if (req.method === 'GET' || req.method === 'HEAD') {
    return send(res, req, 200, url.searchParams.get('sent') === '1' ? thanksPage() : formPage());
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { 'content-type': 'text/plain' });
    return res.end('Method not allowed');
  }
  const form = await readForm(req);
  // Bots fill every field, people never see this one.
  if (form.company?.[0]) {
    res.writeHead(303, { location: `${SUBMIT_PATH}?sent=1` });
    return res.end();
  }
  const [values, error] = validate(form);
  if (error) return send(res, req, 400, formPage(values, error));
  if (!allow(req)) return send(res, req, 429, formPage(values, { message: 'Too many submissions from your connection. Please try again in an hour.', step: 'review' }));

  const list = db().submissions;
  list.unshift({ id: crypto.randomBytes(8).toString('hex'), ...values, status: 'new', createdAt: new Date().toISOString() });
  if (list.length > KEEP) list.length = KEEP;
  save();
  res.writeHead(303, { location: `${SUBMIT_PATH}?sent=1` });
  return res.end();
}
