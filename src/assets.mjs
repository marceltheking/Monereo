import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE } from './data.mjs';
import { UPLOAD_DIR } from './store.mjs';

export const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
};

const hashes = Object.fromEntries(
  readdirSync(PUBLIC_DIR).map((name) => [
    name,
    createHash('sha1').update(readFileSync(path.join(PUBLIC_DIR, name))).digest('hex').slice(0, 10),
  ])
);

export function asset(name) {
  return `${BASE}/${name}?v=${hashes[name]}`;
}

// Uploaded files are named by their content hash, so their URLs never need a version.
export const MEDIA_PREFIX = 'media:';
export const MEDIA_NAME = /^[a-f0-9]{20}\.(png|jpg|webp)$/;

export function imageUrl(ref) {
  if (typeof ref === 'string' && ref.startsWith(MEDIA_PREFIX)) return `${BASE}/media/${ref.slice(MEDIA_PREFIX.length)}`;
  return hashes[ref] ? asset(ref) : asset('favicon.png');
}

export function isKnownImage(ref) {
  if (typeof ref !== 'string') return false;
  if (ref.startsWith(MEDIA_PREFIX)) {
    const name = ref.slice(MEDIA_PREFIX.length);
    return MEDIA_NAME.test(name) && readdirSync(UPLOAD_DIR).includes(name);
  }
  return Boolean(hashes[ref]) && /\.(png|svg|jpg|webp)$/.test(ref);
}

export function listImages() {
  const builtIn = Object.keys(hashes).filter((n) => /^(ex|dir)-.*\.(png|svg|jpg)$/.test(n));
  const uploaded = readdirSync(UPLOAD_DIR).filter((n) => MEDIA_NAME.test(n)).map((n) => MEDIA_PREFIX + n);
  return [...uploaded, ...builtIn].map((ref) => ({ ref, url: imageUrl(ref) }));
}
