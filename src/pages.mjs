import { icon } from './icons.mjs';
import { imageUrl } from './assets.mjs';
import { absolute, breadcrumbLd, faqLd } from './seo.mjs';
import { categoryPath, categorySeo, seoText } from './seo-content.mjs';
import { guideCards, guidesFor } from './guides.mjs';
import { BASE, KYC_GRADES, kycGrade, LIQUIDITY, LIQUIDITY_MIXED_HELP, LIQUIDITY_THIRD_HELP, settings } from './data.mjs';
import {
  layout, esc, exLogo, hostOf, tagList, verifyBadge, exchangeCard, directoryCard, kycCell, feeCell,
  liquidityCell, guaranteeCell, catIcon, maintenancePage,
} from './views.mjs';

const all = () => true;

const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb"><ol>
${items.map(([name, path], i) => `<li>${i < items.length - 1 ? `<a href="${esc(path)}">${esc(name)}</a>` : `<span aria-current="page">${esc(name)}</span>`}</li>`).join('\n')}
</ol></nav>`;

const faqBlock = (faq, heading) => (faq.length ? `<section class="seo-faq">
<h2>${esc(heading)}</h2>
<div class="faq">
${faq.map(([q, a]) => `<details><summary>${esc(q)}${icon('chevron', 16)}</summary><p>${esc(a)}</p></details>`).join('\n')}
</div>
</section>` : '');

// Links to every other category, so each page passes visitors (and crawlers) on.
const otherCategories = (cats, current) => {
  const others = cats.filter((c) => c.id !== current.id);
  return others.length ? `<section class="seo-related">
<h2>More categories</h2>
<ul class="seo-cats">
${others.map((c) => `<li><a href="${categoryPath(c)}">${catIcon(c, 16)}<span>${esc(categorySeo(c).h1)}</span></a></li>`).join('\n')}
</ul>
</section>` : '';
};

const itemName = (x) => x.item.name;

function itemListLd(c, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: categorySeo(c).h1,
    numberOfItems: items.length,
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: itemName(x), url: absolute(x.path) })),
  };
}

const gradeLegend = () => `<ul class="grade-legend" aria-label="KYC score legend">
${KYC_GRADES.map((g) => { const k = kycGrade(g); return `<li title="${esc(k.description)}"><span class="grade grade-${g.toLowerCase()}">${g}</span>${esc(k.label)}</li>`; }).join('\n')}
</ul>`;

// ---------- category page ----------

export function categoryPage({ c, items, cats }) {
  if (settings().maintenance.enabled) return maintenancePage();
  const seo = categorySeo(c);
  const n = items.length;
  const path = categoryPath(c);
  const exchanges = items.filter((x) => x.kind === 'exchange');
  const links = items.filter((x) => x.kind === 'link');
  const verified = items.filter((x) => x.item.verified).length;

  const linkGrid = (list) => `<ul class="dir-grid">
${list.map((x) => directoryCard(x.item, c, all, x.path).html).join('\n')}
</ul>`;

  const listings = exchanges.length
    ? `<h2 class="dir-sub">Instant exchanges</h2>
<ul class="xc-grid">
${exchanges.map((x) => exchangeCard(x.item, all, x.path).html).join('\n')}
</ul>
${gradeLegend()}
${links.length ? `<h2 class="dir-sub">Peer-to-peer and atomic swaps</h2>\n${linkGrid(links)}` : ''}`
    : linkGrid(links);

  const body = `
<div class="container seo-page">
${crumbs([['Directory', `${BASE}/`], [seo.h1, path]])}
<header class="seo-head">
<span class="dir-sec-icon">${catIcon(c, 22)}</span>
<div>
<h1>${esc(seo.h1)}</h1>
<p class="seo-count">${n} ${n === 1 ? 'listing' : 'listings'}${verified ? ` &middot; ${verified} tested by the Monereo team` : ''}</p>
</div>
</header>
<div class="seo-intro">
${seo.intro.map((p) => `<p>${esc(seoText(p, n))}</p>`).join('\n')}
</div>
<section class="seo-listings" aria-label="${esc(seo.h1)}">
${listings}
</section>
${guidesFor(c.id).length ? `<section class="seo-related">
<h2>Guides</h2>
${guideCards(guidesFor(c.id))}
</section>` : ''}
${faqBlock(seo.faq, `${seo.h1}: questions`)}
${otherCategories(cats, c)}
<div class="dir-cta">
<div>
<h2>Know one we missed?</h2>
<p>If it respects your privacy and works without ID, tell us about it. We review every submission by hand.</p>
</div>
<a class="btn btn-primary" href="${BASE}/submit">Submit a service${icon('arrowRight', 16)}</a>
</div>
</div>`;

  return layout({
    title: `${seoText(seo.title, n)} | Monereo`,
    description: seoText(seo.description, n),
    body,
    canonical: path,
    ld: [
      breadcrumbLd([['Directory', `${BASE}/`], [seo.h1, path]]),
      itemListLd(c, items),
      seo.faq.length ? faqLd(seo.faq) : null,
    ],
  });
}

// ---------- listing page ----------

// Joins sentences while they fit; the first is cut at a word if it alone is too long.
function fitText(parts, max) {
  let out = '';
  for (const p of parts.filter(Boolean)) {
    if (!out) out = p.length > max ? `${p.slice(0, max - 1).replace(/[\s,;:]+\S*$/, '')}…` : p;
    else if (out.length + 1 + p.length <= max) out += ` ${p}`;
  }
  return out;
}

const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;

function exchangeFacts(p) {
  const g = kycGrade(p.kyc);
  const liq = p.liquidity === 'third' ? LIQUIDITY_THIRD_HELP : p.liquidity === 'mixed' ? LIQUIDITY_MIXED_HELP : p.liquidity === 'own' ? 'Pays out from its own reserves, so no third party can hold the swap.' : '';
  return {
    facts: [
      fact('KYC score', `${kycCell(p)}<small>${esc(g.description)}</small>`),
      fact('Fee', `${feeCell(p)}<small>Floating-rate fee published by the exchange.</small>`),
      fact('Typical swap time', `~${esc(p.eta)} min`),
      fact('Rate types', p.kinds.map((k) => esc(k)).join(', ') || '<span class="dim">Not stated</span>'),
      fact('Liquidity', `${liquidityCell(p)}${liq && LIQUIDITY[p.liquidity] ? `<small>${esc(liq)}</small>` : ''}`),
      fact('Guarantee', guaranteeCell(p)),
    ],
    tags: p.kinds.map((k) => `${k} rate`),
    url: p.website,
    description: `Instant crypto exchange with a KYC score of ${g.grade} (${g.label}), a ${(p.spread * 100).toFixed(2).replace(/\.?0+$/, '')}% fee and swaps in about ${p.eta} minutes.`,
    stat: `x:${p.id}`,
  };
}

export function listingPage({ c, items, entry }) {
  if (settings().maintenance.enabled) return maintenancePage();
  const seo = categorySeo(c);
  const x = entry.item;
  const isExchange = entry.kind === 'exchange';
  const ex = isExchange ? exchangeFacts(x) : null;
  const url = isExchange ? ex.url : x.url;
  const host = hostOf(url);
  const description = isExchange ? ex.description : x.description || '';
  const tags = isExchange ? ex.tags : x.tags;
  const stat = isExchange ? ex.stat : `l:${x.id}`;
  const catPath = categoryPath(c);

  const logo = isExchange
    ? exLogo(x, 64)
    : x.logo
      ? `<img class="dir-logo" src="${esc(imageUrl(x.logo))}" width="64" height="64" alt="">`
      : `<span class="dir-logo dir-letter" aria-hidden="true">${esc(x.name.slice(0, 1).toUpperCase())}</span>`;

  const facts = [
    fact('Category', `<a href="${catPath}">${esc(seo.h1)}</a>`),
    ...(host ? [fact('Website', `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow" data-stat="${esc(stat)}">${esc(host)}</a>`)] : []),
    ...(isExchange ? ex.facts : []),
    fact('Status', `${verifyBadge(x)}<small>${x.verified ? 'The Monereo team has tested this service itself.' : 'Listed after a check of its site, but not yet tested by the Monereo team.'}</small>`),
    ...(tags.length ? [fact('Features', tagList(tags))] : []),
  ];

  // Up to six others from the same category, Recommended ones first (the category order already does that).
  const alternatives = items.filter((y) => y !== entry).slice(0, 6);
  const altCards = alternatives.map((y) => (y.kind === 'exchange'
    ? directoryCard({ ...y.item, url: y.item.website, description: exchangeFacts(y.item).description, tags: exchangeFacts(y.item).tags }, c, all, y.path)
    : directoryCard(y.item, c, all, y.path)).html);

  const name = x.name;
  const body = `
<div class="container seo-page seo-listing">
${crumbs([['Directory', `${BASE}/`], [seo.h1, catPath], [name, entry.path]])}
<header class="lst-head${x.recommended ? ' is-recommended' : ''}">
${logo}
<div class="lst-title">
<h1>${esc(name)}</h1>
<p class="lst-meta">${verifyBadge(x)}${x.recommended ? `<span class="lst-rec">${icon('star', 12)}Recommended</span>` : ''}${host ? `<span class="dim">${esc(host)}</span>` : ''}</p>
</div>
${url ? `<a class="btn btn-primary lst-visit" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow" data-stat="${esc(stat)}">Visit ${esc(name)}${icon('arrowRight', 16)}</a>` : ''}
</header>
${description ? `<p class="lst-desc">${esc(description)}</p>` : ''}
<dl class="lst-facts">
${facts.join('\n')}
</dl>
<p class="lst-note">${icon('info', 15)}<span>Monereo only links to ${esc(name)}; we never hold your funds or data. Check the service yourself and start with a small amount.</span></p>
${alternatives.length ? `<section class="seo-alts">
<h2>Alternatives to ${esc(name)}</h2>
<ul class="dir-grid">
${altCards.join('\n')}
</ul>
<p class="dir-more"><a href="${catPath}">${esc(seo.browse)} (${items.length})${icon('arrowRight', 14)}</a></p>
</section>` : ''}
</div>`;

  // Titles stay near 60 characters and descriptions near 155, the most search results show.
  const titleTail = isExchange ? `KYC score ${kycGrade(x.kyc).grade}, fees & alternatives` : `${seo.short} & alternatives`;
  const metaDesc = fitText([
    `${name}: ${description ? description.replace(/\.$/, '') : seo.single}.`,
    tags.length ? `${tags.slice(0, 3).join(', ')}.` : '',
    alternatives.length ? `Compare ${items.length - 1} alternatives.` : '',
  ], 158);
  return layout({
    title: `${name}: ${titleTail} | Monereo`,
    description: metaDesc,
    body,
    canonical: entry.path,
    ld: [breadcrumbLd([['Directory', `${BASE}/`], [seo.h1, catPath], [name, entry.path]])],
  });
}

