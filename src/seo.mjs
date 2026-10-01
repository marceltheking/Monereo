import { BASE, directory, settings, socials } from './data.mjs';
import { categoryItems, categoryPath } from './seo-content.mjs';
import { GUIDES, GUIDES_PATH, guidePath } from './guides.mjs';

// Public origin used in canonical links, the sitemap and social previews.
export const SITE_URL = (process.env.SITE_URL || 'https://monereo.com').replace(/\/$/, '');

export const absolute = (path) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export function robotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    `Disallow: ${BASE}/admin`,
    // Directory searches are the same page with a filter applied.
    'Disallow: /*?q=',
    '',
    `Sitemap: ${absolute('/sitemap.xml')}`,
    '',
  ].join('\n');
}

export function sitemapXml() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: absolute(`${BASE}/`), priority: '1.0', changefreq: 'daily' },
    { loc: absolute(GUIDES_PATH), priority: '0.8', changefreq: 'weekly' },
    ...GUIDES.map((g) => ({ loc: absolute(guidePath(g)), priority: '0.8', changefreq: 'monthly' })),
    // One page per category and per listing; see seo-content.mjs.
    ...directory().flatMap((c) => [
      { loc: absolute(categoryPath(c)), priority: '0.8', changefreq: 'weekly' },
      ...categoryItems(c).map((x) => ({ loc: absolute(x.path), priority: '0.6', changefreq: 'weekly', lastmod: x.item.updatedAt })),
    ]),
    { loc: absolute(`${BASE}/submit`), priority: '0.4', changefreq: 'monthly' },
    { loc: absolute(`${BASE}/terms`), priority: '0.2', changefreq: 'yearly' },
    { loc: absolute(`${BASE}/privacy`), priority: '0.2', changefreq: 'yearly' },
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u.loc}</loc><lastmod>${u.lastmod ? String(u.lastmod).slice(0, 10) : today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
}

// JSON-LD blocks. They are data, not scripts, so the strict script-src CSP does not apply to them.
export function jsonLd(objects) {
  return objects.filter(Boolean)
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`)
    .join('\n');
}

export function organizationLd() {
  const email = settings().contactEmail;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Monereo',
    url: absolute('/'),
    logo: absolute('/logo.png'),
    sameAs: socials().map((s) => s.href),
    ...(email ? { email } : {}),
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Monereo',
    url: absolute('/'),
    description: 'Directory of no-KYC crypto exchanges and privacy services.',
  };
}

export function faqLd(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absolute(path) })),
  };
}
