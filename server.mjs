import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BASE, settings } from './src/data.mjs';
import { CONTENT_TYPES, PUBLIC_DIR, MEDIA_NAME } from './src/assets.mjs';
import { load, UPLOAD_DIR } from './src/store.mjs';
import { ADMIN_PATH, ensureAdmin, handleAdmin } from './src/admin.mjs';
import { directoryPage, notFoundPage } from './src/views.mjs';
import { categoryPage, listingPage } from './src/pages.mjs';
import { findSeoPage } from './src/seo-content.mjs';
import { GUIDES_PATH, findGuide, guidePage, guidesIndexPage } from './src/guides.mjs';
import { SUBMIT_PATH, handleSubmit } from './src/submit.mjs';
import { TERMS_PATH, PRIVACY_PATH, handleLegal } from './src/legal.mjs';
import { robotsTxt, sitemapXml } from './src/seo.mjs';
import { flush as flushStats, recordEvent, recordPage } from './src/stats.mjs';
import { ticker, startTicker } from './src/ticker.mjs';

const PORT = Number(process.env.PORT || 3004);

const LEGACY = ['/swap', '/compare', '/pairs', '/quote'].map((p) => `${BASE}${p}`);

const EVENT_PATH = `${BASE}/api/e`;

// Clicks and searches from the directory script, sent with navigator.sendBeacon.
function handleEvent(req, res) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > 1024) req.destroy();
    else chunks.push(c);
  });
  req.on('end', () => {
    try {
      recordEvent(req, JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch {
      // Malformed events are ignored.
    }
    res.writeHead(204, { 'cache-control': 'no-store' });
    res.end();
  });
}

const CSP = "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

async function serveStatic(req, res, pathname) {
  const rel = pathname.slice(BASE.length + 1);
  if (!rel || rel.includes('..') || rel.includes('/')) return false;
  const contentType = CONTENT_TYPES[path.extname(rel)];
  if (!contentType) return false;
  try {
    const data = await readFile(path.join(PUBLIC_DIR, rel));
    const versioned = new URL(req.url, 'http://internal').searchParams.has('v');
    res.writeHead(200, {
      'content-type': contentType,
      'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=60',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
    return true;
  } catch {
    return false;
  }
}

async function serveMedia(req, res, pathname) {
  const name = pathname.slice(`${BASE}/media/`.length);
  if (!MEDIA_NAME.test(name)) return false;
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    res.writeHead(200, {
      'content-type': CONTENT_TYPES[path.extname(name)],
      'cache-control': 'public, max-age=31536000, immutable',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
    return true;
  } catch {
    return false;
  }
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://internal');
  const pathname = url.pathname;
  const params = Object.fromEntries(url.searchParams);

  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('content-security-policy', CSP);

  if (pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`)) {
    await handleAdmin(req, res, url);
    return;
  }

  if (pathname === EVENT_PATH) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'text/plain' });
      res.end();
      return;
    }
    handleEvent(req, res);
    return;
  }

  if (pathname === `${BASE}/api/ticker`) {
    const t = await ticker();
    res.writeHead(t ? 200 : 503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(t || { error: 'Price unavailable' }));
    return;
  }

  // Every HTML page shown to a visitor is counted once the response is sent.
  res.on('finish', () => {
    if (String(res.getHeader('content-type') || '').startsWith('text/html')) recordPage(req, url, res.statusCode);
  });

  if (pathname === SUBMIT_PATH || pathname === `${SUBMIT_PATH}/`) {
    await handleSubmit(req, res, url);
    return;
  }

  // The swap system and rate comparison were removed: their old addresses lead to the directory.
  if (LEGACY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    res.writeHead(301, { location: `${BASE}/` });
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'text/plain' });
    res.end(req.method === 'HEAD' ? undefined : 'Method not allowed');
    return;
  }

  const sendHtml = (status, html) => {
    res.writeHead(status, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : html);
  };

  if (pathname === BASE || pathname === `${BASE}/`) {
    // Old swap searches (?from=…&compare=1) drop their query.
    if (['compare', 'from', 'to', 'amount'].some((k) => k in params)) {
      res.writeHead(301, { location: `${BASE}/` });
      res.end();
      return;
    }
    return sendHtml(settings().maintenance.enabled ? 503 : 200, directoryPage(params));
  }
  if (pathname === TERMS_PATH || pathname === PRIVACY_PATH) return handleLegal(req, res, url);
  if (pathname === `${BASE}/robots.txt` || pathname === `${BASE}/sitemap.xml`) {
    const robots = pathname.endsWith('.txt');
    res.writeHead(200, { 'content-type': robots ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : robots ? robotsTxt() : sitemapXml());
    return;
  }
  if (pathname.startsWith(`${BASE}/media/`) && (await serveMedia(req, res, pathname))) return;
  if (pathname.startsWith(`${BASE}/`) && (await serveStatic(req, res, pathname))) return;

  const trimmed = pathname.length > BASE.length + 1 && pathname.endsWith('/') ? pathname.replace(/\/+$/, '') : pathname;
  const pageStatus = () => (settings().maintenance.enabled ? 503 : 200);

  // Guides (/guides and /guides/buy-monero-without-kyc).
  const guide = trimmed.startsWith(`${GUIDES_PATH}/`) ? findGuide(trimmed.slice(GUIDES_PATH.length + 1)) : null;
  if (trimmed === GUIDES_PATH || guide) {
    if (trimmed !== pathname) {
      res.writeHead(301, { location: trimmed + url.search });
      res.end();
      return;
    }
    return sendHtml(pageStatus(), guide ? guidePage(guide) : guidesIndexPage());
  }

  // Category pages (/anonymous-vpn) and listing pages (/anonymous-vpn/mullvad).
  const seoPage = findSeoPage(trimmed);
  if (seoPage) {
    if (trimmed !== pathname) {
      res.writeHead(301, { location: trimmed + url.search });
      res.end();
      return;
    }
    return sendHtml(pageStatus(), seoPage.type === 'category' ? categoryPage(seoPage) : listingPage(seoPage));
  }
  sendHtml(404, notFoundPage());
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error('request failed', req.method, req.url, e);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Internal error');
  });
});

load();
await ensureAdmin();
startTicker();

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    flushStats();
    process.exit(0);
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`monereo listening on 127.0.0.1:${PORT}`);
});
