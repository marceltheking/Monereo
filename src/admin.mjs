import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, save, audit, UPLOAD_DIR } from './store.mjs';
import { BASE, KYC_GRADES, SOCIAL_LABELS } from './data.mjs';
import { isKnownImage, listImages, imageUrl, MEDIA_PREFIX } from './assets.mjs';
import { adminAppPage, adminLoginPage } from './admin-views.mjs';
import { report, todaySummary } from './stats.mjs';
import { SUBMISSION_LABELS } from './submit.mjs';

const scrypt = promisify(crypto.scrypt);

export const ADMIN_PATH = `${BASE}/admin`;
const API = `${ADMIN_PATH}/api`;
const COOKIE = 'monereo_admin';
const SESSION_IDLE_MS = 8 * 3600_000;
const SESSION_MAX_MS = 7 * 24 * 3600_000;
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60_000;
const BODY_LIMIT = 256 * 1024;
const UPLOAD_BODY_LIMIT = 1024 * 1024;
const IMAGE_LIMIT = 512 * 1024;
const MIN_PASSWORD = 10;

// ---------- passwords ----------

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}

async function checkPassword(password, record) {
  const hash = await scrypt(password, Buffer.from(record.salt, 'hex'), 64);
  return crypto.timingSafeEqual(hash, Buffer.from(record.hash, 'hex'));
}

// Fresh stores start with a "root" owner. Its password comes from ADMIN_PASSWORD, or is random and
// printed once to the server log; either way it must be changed at first login. A fixed default would let
// anyone who finds a new install sign in before its owner does.
export async function ensureAdmin() {
  if (db().admins.length) return;
  const given = process.env.ADMIN_PASSWORD;
  const password = given || crypto.randomBytes(12).toString('base64url');
  const now = new Date().toISOString();
  db().admins.push({ id: 'a1', username: 'root', role: 'owner', ...(await hashPassword(password)), mustChange: true, createdAt: now, updatedAt: now });
  save();
  console.log(given
    ? 'Created admin "root" with the password from ADMIN_PASSWORD. Change it at first sign-in.'
    : `Created admin "root" with password ${password} . Sign in at ${ADMIN_PATH} and change it; it is not shown again.`);
}

const ROLES = ['owner', 'admin'];
const findAdminById = (id) => db().admins.find((a) => a.id === id);
const findAdminByName = (name) => db().admins.find((a) => a.username.toLowerCase() === String(name).toLowerCase());
const owners = () => db().admins.filter((a) => a.role === 'owner');

// Compared against when the username is unknown, so a miss takes as long as a wrong password.
const dummyRecord = hashPassword(crypto.randomBytes(16).toString('hex'));

function cleanUsername(value, taken) {
  const username = text(value ?? '', 'username', { min: 3, max: 32, label: 'Username' });
  if (!/^[A-Za-z0-9._-]+$/.test(username)) throw bad('Username can use letters, digits, dot, dash and underscore.', 'username');
  const other = findAdminByName(username);
  if (other && other !== taken) throw bad('Another admin already has that username.', 'username');
  return username;
}

function passwordProblem(password, username) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > 200) return 'Password is too long.';
  const lower = password.toLowerCase();
  if (lower === 'root' || lower === username.toLowerCase() || /^(.)\1*$/.test(password)) return 'Choose a less guessable password.';
  if (['password', 'monereo', '1234567890', 'qwertyuiop'].some((w) => lower.includes(w))) return 'Choose a less guessable password.';
  return null;
}

// ---------- sessions and throttling ----------

const sessions = new Map();
const failures = new Map();

function clientIp(req) {
  // The server only listens on localhost behind Caddy, which appends the real client address last.
  const xff = req.headers['x-forwarded-for'];
  return xff ? xff.split(',').pop().trim() : req.socket.remoteAddress || '';
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

const tokenKey = (token) => crypto.createHash('sha256').update(token).digest('hex');

function currentSession(req) {
  const token = cookies(req)[COOKIE];
  if (!token || token.length > 100) return null;
  const key = tokenKey(token);
  const s = sessions.get(key);
  if (!s) return null;
  const now = Date.now();
  const admin = findAdminById(s.adminId);
  if (now - s.lastSeen > SESSION_IDLE_MS || now - s.created > SESSION_MAX_MS || !admin) {
    sessions.delete(key);
    return null;
  }
  s.lastSeen = now;
  s.username = admin.username;
  return { key, ...s, record: s, admin };
}

function sessionCookie(req, token, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=${ADMIN_PATH}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function lockedFor(ip) {
  const f = failures.get(ip);
  if (!f) return 0;
  if (Date.now() - f.first > LOCK_MS) {
    failures.delete(ip);
    return 0;
  }
  return f.count >= LOCK_AFTER ? f.first + LOCK_MS - Date.now() : 0;
}

function noteFailure(ip) {
  const f = failures.get(ip);
  if (!f || Date.now() - f.first > LOCK_MS) failures.set(ip, { count: 1, first: Date.now() });
  else f.count += 1;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, f] of failures) if (now - f.first > LOCK_MS) failures.delete(ip);
  for (const [key, s] of sessions) if (now - s.lastSeen > SESSION_IDLE_MS || now - s.created > SESSION_MAX_MS) sessions.delete(key);
}, 60_000).unref();

// Signs out every session of one admin, except `keepKey` when given.
function endSessions(adminId, keepKey) {
  let n = 0;
  for (const [key, s] of sessions) if (s.adminId === adminId && key !== keepKey) { sessions.delete(key); n += 1; }
  return n;
}

// ---------- http helpers ----------

class HttpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const bad = (message, field) => new HttpError(400, message, field);

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, 'Request is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!size) return resolve({});
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
        resolve(value);
      } catch {
        reject(bad('Request body must be a JSON object.'));
      }
    });
    req.on('error', reject);
  });
}

// ---------- validation ----------

function text(value, field, { max, min = 0, label = field, multiline = false } = {}) {
  if (typeof value !== 'string') throw bad(`${label} must be text.`, field);
  const v = value.trim();
  if (v.length < min) throw bad(min === 1 ? `${label} is required.` : `${label} is too short.`, field);
  if (v.length > max) throw bad(`${label} can be at most ${max} characters.`, field);
  const invalid = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
  if (invalid.test(v)) throw bad(`${label} contains invalid characters.`, field);
  return v;
}

function number(value, field, { min, max, nullable = false, integer = false, label = field }) {
  if (nullable && (value === null || value === '' || value === undefined)) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw bad(`${label} must be a number.`, field);
  if (integer && !Number.isInteger(n)) throw bad(`${label} must be a whole number.`, field);
  if (n < min && min > 0 && min < 1e-6) throw bad(`${label} must be above zero.`, field);
  if (n < min || n > max) throw bad(`${label} must be between ${min} and ${max.toLocaleString('en-US')}.`, field);
  return n;
}

const bool = (value) => value === true;

function httpsUrl(value, field, { label = field, template = false } = {}) {
  const v = text(value ?? '', field, { max: 600, label });
  if (!v) return '';
  if (/[\s"'<>`\\]/.test(v)) throw bad(`${label} contains characters that are not allowed in a URL.`, field);
  try {
    const u = new URL(template ? v.replace(/\{\w+\}/g, 'x') : v);
    if (u.protocol !== 'https:') throw new Error();
  } catch {
    throw bad(`${label} must be a full https:// address.`, field);
  }
  return v;
}

function image(value, field) {
  if (!isKnownImage(value)) throw bad('Choose a logo from the library or upload one.', field);
  return value;
}

function slugify(name) {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'exchange';
}

function uniqueId(base) {
  const ids = new Set(db().providers.map((p) => p.id));
  let id = base;
  for (let i = 2; ids.has(id); i += 1) id = `${base}-${i}`;
  return id;
}

function cleanProvider(input, existing) {
  const src = { ...existing, ...input };
  const p = {
    id: existing?.id,
    name: text(src.name ?? '', 'name', { min: 1, max: 40, label: 'Name' }),
    logo: image(src.logo, 'logo'),
    website: httpsUrl(src.website, 'website', { label: 'Website' }),
    enabled: bool(src.enabled),
    featured: bool(src.featured),
    verified: bool(src.verified),
    recommended: bool(src.recommended),
    spread: number(src.spread, 'spread', { min: 0, max: 0.5, label: 'Fee' }),
    eta: number(src.eta, 'eta', { min: 1, max: 1440, integer: true, label: 'Average time' }),
    kinds: ['Fixed', 'Floating'].filter((k) => Array.isArray(src.kinds) && src.kinds.includes(k)),
    kyc: KYC_GRADES.includes(src.kyc) ? src.kyc : null,
    guarantee: number(src.guarantee, 'guarantee', { min: 0, max: 1e9, nullable: true, label: 'Guarantee with third parties' }),
    guaranteeOurs: number(src.guaranteeOurs, 'guaranteeOurs', { min: 0, max: 1e9, nullable: true, label: 'Guarantee with Monereo' }),
    guaranteeNote: text(src.guaranteeNote ?? '', 'guaranteeNote', { max: 240, label: 'Guarantee note' }),
    liquidity: ['own', 'mixed', 'third'].includes(src.liquidity) ? src.liquidity : '',
    rating: number(src.rating, 'rating', { min: 0, max: 5, nullable: true, label: 'Rating' }),
    notes: text(src.notes ?? '', 'notes', { max: 4000, label: 'Notes', multiline: true }),
  };
  if (!p.kinds.length) throw bad('Pick at least one rate type.', 'kinds');
  if (!p.kyc) throw bad('Pick a KYC score from A to F.', 'kyc');
  if (p.guarantee === 0) p.guarantee = null;
  if (p.guaranteeOurs === 0) p.guaranteeOurs = null;
  if (p.rating === 0) p.rating = null;
  return p;
}

function cleanCategory(input, existing) {
  const src = { ...existing, ...input };
  return {
    id: existing?.id,
    name: text(src.name ?? '', 'name', { min: 1, max: 40, label: 'Name' }),
    blurb: text(src.blurb ?? '', 'blurb', { max: 200, label: 'Description' }),
  };
}

function cleanLink(input, existing) {
  const src = { ...existing, ...input };
  const tags = (Array.isArray(src.tags) ? src.tags : String(src.tags ?? '').split(','))
    .map((t, i) => text(String(t), 'tags', { max: 24, label: `Tag ${i + 1}` })).filter(Boolean);
  if (tags.length > 5) throw bad('At most 5 tags.', 'tags');
  const l = {
    id: existing?.id,
    category: String(src.category ?? ''),
    name: text(src.name ?? '', 'name', { min: 1, max: 40, label: 'Name' }),
    url: httpsUrl(src.url, 'url', { label: 'Link' }),
    logo: src.logo && isKnownImage(src.logo) ? src.logo : '',
    description: text(src.description ?? '', 'description', { max: 200, label: 'Description' }),
    tags: [...new Set(tags)],
    enabled: bool(src.enabled),
    verified: bool(src.verified),
    recommended: bool(src.recommended),
  };
  if (!db().directory.categories.some((c) => c.id === l.category)) throw bad('Pick a category.', 'category');
  if (!l.url) throw bad('Link is required.', 'url');
  return l;
}

function uniqueIn(list, base) {
  const ids = new Set(list.map((x) => x.id));
  let id = base;
  for (let i = 2; ids.has(id); i += 1) id = `${base}-${i}`;
  return id;
}

function cleanSettings(input, current) {
  const src = { ...current, ...input };
  const obj = (key) => ({ ...current[key], ...(src[key] && typeof src[key] === 'object' ? src[key] : {}) });
  const banner = obj('banner');
  const maintenance = obj('maintenance');
  const socials = obj('socials');
  const grades = obj('kycGrades');

  const out = {
    heroTitle: text(src.heroTitle ?? '', 'heroTitle', { min: 1, max: 80, label: 'Headline' }),
    heroLede: text(src.heroLede ?? '', 'heroLede', { max: 200, label: 'Subheadline' }),
    banner: {
      enabled: bool(banner.enabled),
      tone: banner.tone === 'warning' ? 'warning' : 'info',
      text: text(banner.text ?? '', 'banner.text', { max: 240, label: 'Banner text' }),
    },
    maintenance: {
      enabled: bool(maintenance.enabled),
      message: text(maintenance.message ?? '', 'maintenance.message', { min: 1, max: 240, label: 'Maintenance message' }),
    },
    kycGrades: Object.fromEntries(KYC_GRADES.map((g) => {
      const v = grades[g] && typeof grades[g] === 'object' ? grades[g] : {};
      return [g, {
        label: text(v.label ?? '', `kycGrades.${g}.label`, { min: 1, max: 24, label: `Grade ${g} name` }),
        description: text(v.description ?? '', `kycGrades.${g}.description`, { max: 200, label: `Grade ${g} description` }),
      }];
    })),
    socials: Object.fromEntries(Object.keys(SOCIAL_LABELS).map((k) => [k, httpsUrl(socials[k] ?? '', `socials.${k}`, { label: SOCIAL_LABELS[k] })])),
    contactEmail: (() => {
      const v = text(src.contactEmail ?? '', 'contactEmail', { max: 120, label: 'Contact email' });
      if (v && !/^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(v)) throw bad('Enter a valid email address or leave it empty.', 'contactEmail');
      return v;
    })(),
  };
  if (out.banner.enabled && !out.banner.text) throw bad('Write the banner text or turn the banner off.', 'banner.text');
  return out;
}

// ---------- output shaping ----------

const providerOut = (p) => ({ ...p, logoUrl: imageUrl(p.logo) });

const linkOut = (l) => ({ ...l, logoUrl: l.logo ? imageUrl(l.logo) : '' });

const directoryOut = () => ({ categories: db().directory.categories, links: db().directory.links.map(linkOut) });

const meOut = (a) => ({ id: a.id, username: a.username, role: a.role, mustChange: a.mustChange });

const adminOut = (a) => ({
  id: a.id, username: a.username, role: a.role, mustChange: a.mustChange, createdAt: a.createdAt, updatedAt: a.updatedAt,
  lastLogin: a.lastLogin ?? null, sessions: [...sessions.values()].filter((s) => s.adminId === a.id).length,
});

function stateOut(session) {
  const d = db();
  return {
    me: meOut(session.admin),
    providers: d.providers.map(providerOut),
    directory: directoryOut(),
    settings: d.settings,
    kycGrades: KYC_GRADES,
    socialLabels: SOCIAL_LABELS,
    sessionId: session.key.slice(0, 12),
    newSubmissions: d.submissions.filter((x) => x.status === 'new').length,
    today: todaySummary(),
  };
}

// ---------- route handlers ----------

function log(ctx, action, detail = '') {
  audit({ user: ctx.session?.username ?? '-', ip: ctx.ip, action, detail: String(detail).slice(0, 300) });
}

function findProvider(id) {
  const p = db().providers.find((x) => x.id === id);
  if (!p) throw new HttpError(404, 'Exchange not found.');
  return p;
}

function applyOrder(list, ids, key) {
  if (!Array.isArray(ids) || ids.length !== list.length) throw bad('Order must list every item once.');
  const byKey = new Map(list.map((item) => [item[key], item]));
  if (new Set(ids).size !== ids.length || !ids.every((k) => byKey.has(k))) throw bad('Order must list every item once.');
  return ids.map((k) => byKey.get(k));
}

function decodeImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw bad('Upload a PNG, JPEG or WebP image.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > IMAGE_LIMIT) throw bad('Images can be at most 512 KB.');
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isWebp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
  const ext = isPng ? 'png' : isJpeg ? 'jpg' : isWebp ? 'webp' : null;
  if (!ext) throw bad('That file is not a valid PNG, JPEG or WebP image.');
  return { buf, ext };
}

const routes = [];
const route = (method, pattern, handler, opts = {}) => routes.push({ method, pattern, handler, ...opts });

route('POST', /^\/login$/, async (ctx) => {
  const wait = lockedFor(ctx.ip);
  if (wait) throw new HttpError(429, `Too many failed attempts. Try again in ${Math.ceil(wait / 60_000)} minutes.`);
  const { username, password } = ctx.body;
  const valid = typeof username === 'string' && typeof password === 'string' && password.length <= 200;
  const admin = valid ? findAdminByName(username) : null;
  const ok = valid && (await checkPassword(password, admin ?? (await dummyRecord))) && !!admin;
  if (!ok) {
    noteFailure(ctx.ip);
    audit({ user: String(username ?? '').slice(0, 40), ip: ctx.ip, action: 'login.failed' });
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
    throw new HttpError(401, 'Wrong username or password.');
  }
  failures.delete(ctx.ip);
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  admin.lastLogin = new Date(now).toISOString();
  save();
  sessions.set(tokenKey(token), {
    adminId: admin.id, username: admin.username, created: now, lastSeen: now, ip: ctx.ip,
    agent: String(ctx.req.headers['user-agent'] || '').slice(0, 160),
  });
  audit({ user: admin.username, ip: ctx.ip, action: 'login' });
  return [200, { ok: true, mustChange: admin.mustChange }, { 'set-cookie': sessionCookie(ctx.req, token, SESSION_MAX_MS / 1000) }];
}, { public: true });

route('POST', /^\/logout$/, (ctx) => {
  sessions.delete(ctx.session.key);
  log(ctx, 'logout');
  return [200, { ok: true }, { 'set-cookie': sessionCookie(ctx.req, '', 0) }];
}, { duringSetup: true });

route('GET', /^\/state$/, (ctx) => stateOut(ctx.session), { duringSetup: true });

route('POST', /^\/account$/, async (ctx) => {
  const admin = ctx.session.admin;
  const { currentPassword, newPassword } = ctx.body;
  const username = cleanUsername(ctx.body.username ?? admin.username, admin);
  if (!admin.mustChange) {
    if (typeof currentPassword !== 'string' || !(await checkPassword(currentPassword, admin))) {
      throw bad('Current password is wrong.', 'currentPassword');
    }
  }
  const changingPassword = admin.mustChange || (typeof newPassword === 'string' && newPassword !== '');
  if (changingPassword) {
    const problem = passwordProblem(newPassword, username);
    if (problem) throw bad(problem, 'newPassword');
    if (await checkPassword(newPassword, admin)) throw bad('Pick a password different from the current one.', 'newPassword');
    Object.assign(admin, await hashPassword(newPassword));
  } else if (username === admin.username) {
    throw bad('Nothing to change.');
  }
  const renamed = username !== admin.username;
  admin.username = username;
  admin.mustChange = false;
  admin.updatedAt = new Date().toISOString();
  save();
  // Your other sessions are signed out; the current one moves to the new username.
  endSessions(admin.id, ctx.session.key);
  ctx.session.record.username = username;
  ctx.session.username = username;
  log(ctx, 'account.updated', [changingPassword && 'password', renamed && `username → ${username}`].filter(Boolean).join(', '));
  return { ok: true, me: meOut(admin) };
}, { duringSetup: true });

route('GET', /^\/sessions$/, (ctx) => ({
  sessions: [...sessions.entries()].filter(([, s]) => s.adminId === ctx.session.adminId).map(([key, s]) => ({
    id: key.slice(0, 12), current: key === ctx.session.key, ip: s.ip, agent: s.agent,
    created: new Date(s.created).toISOString(), lastSeen: new Date(s.lastSeen).toISOString(),
  })),
}));

route('POST', /^\/sessions\/revoke-others$/, (ctx) => {
  const n = endSessions(ctx.session.adminId, ctx.session.key);
  log(ctx, 'sessions.revoked', `${n} other sessions`);
  return { ok: true, revoked: n };
});

// Admin accounts (owners only)

function findAdmin(id) {
  const a = findAdminById(id);
  if (!a) throw new HttpError(404, 'Admin not found.');
  return a;
}

function newAdminId() {
  const ids = new Set(db().admins.map((a) => a.id));
  let n = db().admins.length + 1;
  while (ids.has(`a${n}`)) n += 1;
  return `a${n}`;
}

const role = (value) => {
  if (!ROLES.includes(value)) throw bad('Pick a role.', 'role');
  return value;
};

route('GET', /^\/admins$/, () => ({ admins: db().admins.map(adminOut) }), { owner: true });

route('POST', /^\/admins$/, async (ctx) => {
  const username = cleanUsername(ctx.body.username, null);
  const problem = passwordProblem(ctx.body.password, username);
  if (problem) throw bad(problem, 'password');
  const now = new Date().toISOString();
  const a = {
    id: newAdminId(), username, role: role(ctx.body.role), ...(await hashPassword(ctx.body.password)),
    mustChange: ctx.body.mustChange !== false, createdAt: now, updatedAt: now,
  };
  db().admins.push(a);
  save();
  log(ctx, 'admin.created', `${a.username} (${a.role})`);
  return { admins: db().admins.map(adminOut) };
}, { owner: true });

route('PUT', /^\/admins\/(a\d+)$/, (ctx, id) => {
  const a = findAdmin(id);
  const username = cleanUsername(ctx.body.username ?? a.username, a);
  const nextRole = role(ctx.body.role ?? a.role);
  if (a.role === 'owner' && nextRole !== 'owner' && owners().length === 1) throw bad('There must always be at least one owner.', 'role');
  const changes = [username !== a.username && `username → ${username}`, nextRole !== a.role && `role → ${nextRole}`].filter(Boolean);
  if (!changes.length) throw bad('Nothing to change.');
  a.username = username;
  a.role = nextRole;
  a.updatedAt = new Date().toISOString();
  save();
  log(ctx, 'admin.updated', `${a.username}: ${changes.join(', ')}`);
  return { admins: db().admins.map(adminOut), me: meOut(ctx.session.admin) };
}, { owner: true });

route('POST', /^\/admins\/(a\d+)\/password$/, async (ctx, id) => {
  const a = findAdmin(id);
  if (a.id === ctx.session.adminId) throw bad('Change your own password under Account.');
  const problem = passwordProblem(ctx.body.password, a.username);
  if (problem) throw bad(problem, 'password');
  Object.assign(a, await hashPassword(ctx.body.password), { mustChange: ctx.body.mustChange !== false, updatedAt: new Date().toISOString() });
  save();
  const n = endSessions(a.id);
  log(ctx, 'admin.password-reset', `${a.username}, ${n} sessions signed out`);
  return { admins: db().admins.map(adminOut) };
}, { owner: true });

route('POST', /^\/admins\/(a\d+)\/sign-out$/, (ctx, id) => {
  const a = findAdmin(id);
  const n = endSessions(a.id, ctx.session.key);
  log(ctx, 'admin.signed-out', `${a.username}, ${n} sessions`);
  return { admins: db().admins.map(adminOut), revoked: n };
}, { owner: true });

route('DELETE', /^\/admins\/(a\d+)$/, (ctx, id) => {
  const a = findAdmin(id);
  if (a.id === ctx.session.adminId) throw bad('You cannot remove your own account.');
  if (a.role === 'owner' && owners().length === 1) throw bad('There must always be at least one owner.');
  db().admins = db().admins.filter((x) => x !== a);
  save();
  endSessions(a.id);
  log(ctx, 'admin.deleted', a.username);
  return { admins: db().admins.map(adminOut) };
}, { owner: true });

route('GET', /^\/images$/, () => ({ images: listImages() }));

route('POST', /^\/upload$/, (ctx) => {
  const { buf, ext } = decodeImage(ctx.body.data);
  const name = `${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 20)}.${ext}`;
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buf, { mode: 0o600 });
  log(ctx, 'image.uploaded', name);
  return { ref: MEDIA_PREFIX + name, url: imageUrl(MEDIA_PREFIX + name) };
}, { bodyLimit: UPLOAD_BODY_LIMIT });

// Exchanges

route('POST', /^\/providers$/, (ctx) => {
  const p = cleanProvider(ctx.body, null);
  p.id = uniqueId(slugify(p.name));
  p.createdAt = p.updatedAt = new Date().toISOString();
  db().providers.push(p);
  save();
  log(ctx, 'exchange.created', p.name);
  return providerOut(p);
});

route('PUT', /^\/providers\/([\w-]+)$/, (ctx, id) => {
  const existing = findProvider(id);
  const p = cleanProvider(ctx.body, existing);
  const changed = Object.keys(p).filter((k) => JSON.stringify(p[k]) !== JSON.stringify(existing[k]));
  Object.assign(existing, p, { updatedAt: new Date().toISOString() });
  save();
  log(ctx, 'exchange.updated', `${p.name}: ${changed.join(', ') || 'no changes'}`);
  return providerOut(existing);
});

route('DELETE', /^\/providers\/([\w-]+)$/, (ctx, id) => {
  const p = findProvider(id);
  db().providers = db().providers.filter((x) => x !== p);
  save();
  log(ctx, 'exchange.deleted', p.name);
  return { ok: true };
});

route('POST', /^\/providers\/order$/, (ctx) => {
  db().providers = applyOrder(db().providers, ctx.body.ids, 'id');
  save();
  log(ctx, 'exchange.reordered');
  return { ok: true };
});

// Directory

function findCategory(id) {
  const c = db().directory.categories.find((x) => x.id === id);
  if (!c) throw new HttpError(404, 'Category not found.');
  return c;
}

function findLink(id) {
  const l = db().directory.links.find((x) => x.id === id);
  if (!l) throw new HttpError(404, 'Link not found.');
  return l;
}

route('POST', /^\/directory\/categories$/, (ctx) => {
  const c = cleanCategory(ctx.body, null);
  c.id = uniqueIn(db().directory.categories, slugify(c.name));
  db().directory.categories.push(c);
  save();
  log(ctx, 'directory.category-created', c.name);
  return directoryOut();
});

route('PUT', /^\/directory\/categories\/([\w-]+)$/, (ctx, id) => {
  const existing = findCategory(id);
  Object.assign(existing, cleanCategory(ctx.body, existing));
  save();
  log(ctx, 'directory.category-updated', existing.name);
  return directoryOut();
});

route('DELETE', /^\/directory\/categories\/([\w-]+)$/, (ctx, id) => {
  const c = findCategory(id);
  if (db().directory.links.some((l) => l.category === id)) throw bad(`Move or delete the links in ${c.name} first.`);
  db().directory.categories = db().directory.categories.filter((x) => x !== c);
  save();
  log(ctx, 'directory.category-deleted', c.name);
  return directoryOut();
});

route('POST', /^\/directory\/categories\/order$/, (ctx) => {
  db().directory.categories = applyOrder(db().directory.categories, ctx.body.ids, 'id');
  save();
  log(ctx, 'directory.categories-reordered');
  return directoryOut();
});

route('POST', /^\/directory\/links$/, (ctx) => {
  const l = cleanLink(ctx.body, null);
  l.id = uniqueIn(db().directory.links, slugify(l.name));
  db().directory.links.push(l);
  save();
  log(ctx, 'directory.link-created', l.name);
  return directoryOut();
});

route('PUT', /^\/directory\/links\/([\w-]+)$/, (ctx, id) => {
  const existing = findLink(id);
  Object.assign(existing, cleanLink(ctx.body, existing));
  save();
  log(ctx, 'directory.link-updated', existing.name);
  return directoryOut();
});

route('DELETE', /^\/directory\/links\/([\w-]+)$/, (ctx, id) => {
  const l = findLink(id);
  db().directory.links = db().directory.links.filter((x) => x !== l);
  save();
  log(ctx, 'directory.link-deleted', l.name);
  return directoryOut();
});

route('POST', /^\/directory\/links\/order$/, (ctx) => {
  db().directory.links = applyOrder(db().directory.links, ctx.body.ids, 'id');
  save();
  log(ctx, 'directory.links-reordered');
  return directoryOut();
});

// Settings, backup, activity

route('PUT', /^\/settings$/, (ctx) => {
  const before = db().settings;
  const next = cleanSettings(ctx.body, before);
  const changed = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(before[k]));
  db().settings = next;
  save();
  log(ctx, 'settings.updated', changed.join(', ') || 'no changes');
  return next;
});

route('GET', /^\/export$/, (ctx) => {
  log(ctx, 'backup.exported');
  const d = db();
  return { app: 'monereo', version: 1, exportedAt: new Date().toISOString(), providers: d.providers, settings: d.settings, directory: d.directory };
});

route('POST', /^\/import$/, (ctx) => {
  const data = ctx.body;
  // Backups from before the swap system was removed still import: their coins and swap fields are ignored.
  if (data.app !== 'monereo' || !Array.isArray(data.providers) || !data.settings) {
    throw bad('That file is not a Monereo backup.');
  }
  const fixImage = (ref) => (isKnownImage(ref) ? ref : 'favicon.png');
  const ids = new Set();
  const providers = data.providers.map((raw) => {
    const p = cleanProvider({ ...raw, logo: fixImage(raw.logo) }, null);
    p.id = slugify(typeof raw.id === 'string' ? raw.id : p.name);
    for (let i = 2; ids.has(p.id); i += 1) p.id = `${slugify(p.name)}-${i}`;
    ids.add(p.id);
    p.createdAt = raw.createdAt ?? new Date().toISOString();
    p.updatedAt = new Date().toISOString();
    return p;
  });
  // Older backups have no directory: keep the current one.
  let directory = db().directory;
  if (data.directory && Array.isArray(data.directory.categories) && Array.isArray(data.directory.links)) {
    const prevDirectory = db().directory;
    const categories = [];
    for (const raw of data.directory.categories) {
      const c = cleanCategory(raw, null);
      c.id = uniqueIn(categories, slugify(typeof raw.id === 'string' ? raw.id : c.name));
      categories.push(c);
    }
    db().directory = { categories, links: [] };
    try {
      for (const raw of data.directory.links) {
        const l = cleanLink({ ...raw, logo: raw.logo && isKnownImage(raw.logo) ? raw.logo : '' }, null);
        l.id = uniqueIn(db().directory.links, slugify(typeof raw.id === 'string' ? raw.id : l.name));
        db().directory.links.push(l);
      }
      directory = db().directory;
    } finally {
      db().directory = prevDirectory;
    }
  }
  // Backups from the swap era carry the old comparison headline; the directory's own one replaces it.
  const oldHero = data.settings.heroTitle === 'Compare crypto swap rates';
  const settings = cleanSettings(oldHero ? { ...data.settings, heroTitle: db().settings.heroTitle, heroLede: db().settings.heroLede } : data.settings, db().settings);
  db().settings = settings;
  db().providers = providers;
  db().directory = directory;
  save();
  log(ctx, 'backup.imported', `${providers.length} exchanges, ${directory.links.length} links`);
  return stateOut(ctx.session);
}, { bodyLimit: UPLOAD_BODY_LIMIT });

const STAT_RANGES = [1, 7, 30, 90, 365];

route('GET', /^\/stats$/, (ctx) => {
  const days = Number(ctx.query.days);
  return report(STAT_RANGES.includes(days) ? days : 30);
});

route('GET', /^\/activity$/, () => ({ entries: db().audit }));

// Listing requests from the public /submit page

const SUBMISSION_STATUSES = ['new', 'contacted', 'listed', 'rejected'];

function findSubmission(id) {
  const x = db().submissions.find((s) => s.id === id);
  if (!x) throw new HttpError(404, 'Submission not found.');
  return x;
}

route('GET', /^\/submissions$/, () => ({ submissions: db().submissions, labels: SUBMISSION_LABELS }));

route('PUT', /^\/submissions\/([a-f0-9]+)$/, (ctx, id) => {
  const x = findSubmission(id);
  if (!SUBMISSION_STATUSES.includes(ctx.body.status)) throw bad('Unknown status.');
  x.status = ctx.body.status;
  x.note = text(ctx.body.note ?? x.note ?? '', 'note', { max: 1000, label: 'Note', multiline: true });
  save();
  log(ctx, 'submission.updated', `${x.name}: ${x.status}`);
  return x;
});

route('DELETE', /^\/submissions\/([a-f0-9]+)$/, (ctx, id) => {
  const x = findSubmission(id);
  db().submissions = db().submissions.filter((s) => s !== x);
  save();
  log(ctx, 'submission.deleted', x.name);
  return { ok: true };
});

// ---------- dispatcher ----------

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function handleApi(req, res, url) {
  const sub = url.pathname.slice(API.length) || '/';
  const ip = clientIp(req);
  const match = routes.map((r) => ({ r, m: r.method === req.method && r.pattern.exec(sub) })).find((x) => x.m);
  if (!match) {
    const exists = routes.some((r) => r.pattern.test(sub));
    return send(res, exists ? 405 : 404, { error: exists ? 'Method not allowed.' : 'Not found.' });
  }
  const { r, m } = match;
  try {
    if (req.method !== 'GET') {
      // A custom header can't be set by cross-site forms, and SameSite=Strict already keeps the cookie home.
      if (req.headers['x-monereo-admin'] !== '1' || !sameOrigin(req) || !String(req.headers['content-type'] || '').startsWith('application/json')) {
        throw new HttpError(403, 'Request blocked.');
      }
    }
    const session = currentSession(req);
    if (!r.public && !session) throw new HttpError(401, 'Your session has ended. Sign in again.');
    if (session && !r.duringSetup && session.admin.mustChange) throw new HttpError(403, 'Change your temporary password first.');
    if (r.owner && session.admin.role !== 'owner') throw new HttpError(403, 'Only owners can manage admin accounts.');
    const body = req.method === 'GET' ? {} : await readBody(req, r.bodyLimit ?? BODY_LIMIT);
    const ctx = { req, ip, session, body, query: Object.fromEntries(url.searchParams) };
    const out = await r.handler(ctx, ...m.slice(1));
    if (Array.isArray(out)) return send(res, out[0], out[1], out[2]);
    return send(res, 200, out);
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message, field: e.field });
    console.error('admin api error', e);
    return send(res, 500, { error: 'Something went wrong on the server.' });
  }
}

export async function handleAdmin(req, res, url) {
  res.setHeader('x-robots-tag', 'noindex, nofollow');
  res.setHeader('cache-control', 'no-store');
  if (url.pathname.startsWith(`${API}/`) || url.pathname === API) return handleApi(req, res, url);

  if (url.pathname !== ADMIN_PATH && url.pathname !== `${ADMIN_PATH}/`) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('Not found');
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'text/plain' });
    return res.end('Method not allowed');
  }
  const session = currentSession(req);
  const html = session ? adminAppPage() : adminLoginPage();
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  return res.end(req.method === 'HEAD' ? undefined : html);
}
