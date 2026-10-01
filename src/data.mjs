import { db } from './store.mjs';

export const BASE = '';

export const KYC_GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];

export const kycGrade = (grade) => ({ grade, ...settings().kycGrades[grade] });

export const SOCIAL_LABELS = { x: 'Twitter/X', telegram: 'Telegram Channel', support: 'Telegram Support', matrix: 'Matrix', github: 'GitHub' };

// Icon per link; both Telegram links use the Telegram logo, so the header labels them.
const SOCIAL_ICONS = { support: 'telegram' };
const SOCIAL_SHORT = { x: 'Twitter/X', telegram: 'Channel', support: 'Support', github: 'GitHub' };

export const settings = () => db().settings;

// Exchanges from the admin's Exchanges list, shown at the top of the directory.
// Recommended listings go first; the rest keep the order set in the admin (sort is stable).
const recommendedFirst = (list) => list.slice().sort((a, b) => Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)));

export const providers = () => recommendedFirst(db().providers.filter((p) => p.enabled));

// Directory categories that have at least one enabled link, each with its links in display order.
// Exchanges always stays while there are enabled exchanges, since they are listed there too.
export function directory() {
  const { categories, links } = db().directory;
  return categories
    .map((c) => ({ ...c, links: recommendedFirst(links.filter((l) => l.enabled && l.category === c.id)) }))
    .filter((c) => c.links.length || (c.id === 'exchanges' && providers().length));
}

export function socials() {
  const links = settings().socials;
  // Links left empty in the admin are not shown at all.
  return Object.entries(SOCIAL_LABELS)
    .map(([key, label]) => ({ key, label, short: SOCIAL_SHORT[key] ?? '', icon: SOCIAL_ICONS[key] ?? key, href: links[key] || '' }))
    .filter((s) => s.href);
}

// "50K" / "1.5M" style amount for sentences.
function compactUsd(n) {
  const short = (x) => String(Number(x.toFixed(1)));
  if (n >= 1e6) return `${short(n / 1e6)}M`;
  if (n >= 1e3) return `${short(n / 1e3)}K`;
  return String(n);
}

// Explanation shown in the "?" popup next to a guarantee; an exchange can override it in the admin.
// An exchange can have a deposit with Monereo (green) and deposits with third-party aggregators (yellow) at once.
// `guarantee` is the third-party amount, `guaranteeOurs` the amount held by Monereo.
export function guaranteeParts(p) {
  return [
    p.guaranteeOurs ? {
      ours: true,
      amount: Number(p.guaranteeOurs),
      note: `This service has deposited ${compactUsd(Number(p.guaranteeOurs))} USD with Monereo as a guarantee.`,
    } : null,
    p.guarantee ? {
      ours: false,
      amount: Number(p.guarantee),
      note: p.guaranteeNote || `This service has ${compactUsd(Number(p.guarantee))} USD in deposits with third party aggregators.`,
    } : null,
  ].filter(Boolean);
}

export const hasGuarantee = (p) => Boolean(p.guarantee || p.guaranteeOurs);

// Where an exchange's payouts come from: its own reserves, third-party liquidity providers, or a mix of both.
export const LIQUIDITY = { own: 'Own funds', mixed: 'Mixed', third: 'Third-party LP' };

export const LIQUIDITY_MIXED_HELP = 'This exchange pays out from its own reserves where it can, and routes some swaps through third-party liquidity providers. '
  + 'Swaps that go through a third party can take longer or face extra checks.';

export const LIQUIDITY_THIRD_HELP = 'This exchange routes your swap through third-party liquidity providers, such as other exchanges. '
  + 'They can add delays or run their own checks, like AML reviews that may hold a swap until it is cleared.';

// Compact amounts: 50000 → $50k, 1500000 → $1.5M.
export function formatGuarantee(value) {
  const n = Number(value);
  if (!n) return '';
  const short = (x) => String(Number(x.toFixed(1)));
  if (n >= 1e6) return `$${short(n / 1e6)}M`;
  if (n >= 1e3) return `$${short(n / 1e3)}k`;
  return `$${n}`;
}
