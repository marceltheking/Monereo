import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_DIRECTORY, SEED_PROVIDERS, SEED_SETTINGS } from './seed.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const AUDIT_LIMIT = 1000;

let state = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

// Version 2: the swap system was removed and the site became a link directory.
// Version 3: several admin accounts instead of one.
const VERSION = 3;

function seed() {
  return {
    version: VERSION,
    admins: [],
    providers: clone(SEED_PROVIDERS),
    settings: clone(SEED_SETTINGS),
    directory: clone(SEED_DIRECTORY),
    audit: [],
    submissions: [],
  };
}

// Swap-only data from version 1 stores. Backups made before the change still have it.
const SWAP_SETTINGS = ['defaults', 'fixedExtra', 'showUnavailable', 'prices', 'recommended'];
const SWAP_PROVIDER_FIELDS = ['swapUrl', 'refCode', 'fixedExtra', 'minUsd', 'maxUsd', 'coinMode', 'coinList', 'integration', 'onsiteSwaps', 'apiKey', 'apiSecret'];

function toVersion2(data) {
  delete data.coins;
  delete data.swaps;
  delete data.secrets;
  for (const key of SWAP_SETTINGS) delete data.settings[key];
  for (const p of data.providers) for (const key of SWAP_PROVIDER_FIELDS) delete p[key];
  if (data.settings.heroTitle === 'Compare crypto swap rates') {
    data.settings.heroTitle = SEED_SETTINGS.heroTitle;
    data.settings.heroLede = SEED_SETTINGS.heroLede;
  }
  // Directory links get the logos shipped with this version, and UnstoppableSwap is now eigenwallet.
  const seeded = new Map(SEED_DIRECTORY.links.map((l) => [l.id, l]));
  for (const l of data.directory.links) {
    if (l.id === 'exchanges-unstoppableswap' && l.url === 'https://unstoppableswap.net') Object.assign(l, seeded.get('exchanges-eigenwallet'), { id: l.id, enabled: l.enabled });
    const logo = l.id === 'exchanges-unstoppableswap' ? 'dir-exchanges-eigenwallet.png' : `dir-${l.id}.png`;
    if (!l.logo && fs.existsSync(path.join(ROOT, 'public', logo))) l.logo = logo;
  }
  data.version = 2;
}

// The single admin account becomes the first owner.
function toVersion3(data) {
  data.admins = data.admin ? [{ id: 'a1', role: 'owner', createdAt: data.admin.updatedAt, ...data.admin }] : [];
  delete data.admin;
  data.version = 3;
}

// Fill in keys added after the store was first created, so older files keep working.
function migrate(data) {
  const base = seed();
  data.settings = { ...base.settings, ...data.settings };
  for (const key of ['banner', 'maintenance', 'socials']) {
    data.settings[key] = { ...base.settings[key], ...data.settings[key] };
  }
  data.settings.kycGrades = { ...base.settings.kycGrades, ...data.settings.kycGrades };
  data.providers ??= base.providers;
  const oldKyc = { none: 'A', rare: 'C', required: 'F' };
  for (const p of data.providers) {
    if (oldKyc[p.kyc]) p.kyc = oldKyc[p.kyc];
    p.guaranteeNote ??= '';
    // Older stores had one amount plus a "held by" flag; Monereo-held amounts move to their own field.
    if (p.guaranteeHolder === 'monereo' && p.guarantee) { p.guaranteeOurs = p.guarantee; p.guarantee = null; }
    delete p.guaranteeHolder;
    p.guaranteeOurs ??= null;
    p.liquidity ??= '';
  }
  data.submissions ??= [];
  data.directory ??= base.directory;
  // Exchanges lead the directory; stores made before it existed get the category added at the top.
  if (!data.directory.categories.some((c) => c.id === 'exchanges')) {
    data.directory.categories.unshift(base.directory.categories.find((c) => c.id === 'exchanges'));
  }
  data.audit ??= [];
  if ((data.version ?? 1) < 2) toVersion2(data);
  if (data.version < 3) toVersion3(data);
  return data;
}

export function load() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 });
  // Saved right away so the migration's changes are on disk before anything else runs.
  state = migrate(fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : seed());
  save();
  return state;
}

export function db() {
  return state ?? load();
}

export function save() {
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}

export function audit(entry) {
  const list = db().audit;
  list.unshift({ t: new Date().toISOString(), detail: '', ...entry });
  if (list.length > AUDIT_LIMIT) list.length = AUDIT_LIMIT;
  save();
}
