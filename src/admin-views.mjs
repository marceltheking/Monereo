import { asset } from './assets.mjs';
import { icon } from './icons.mjs';
import { BASE } from './data.mjs';

const NAV = [
  ['dashboard', 'Dashboard', 'barChart'],
  ['stats', 'Statistics', 'trendingUp'],
  ['exchanges', 'Exchanges', 'repeat'],
  ['submissions', 'Submissions', 'plus'],
  ['directory', 'Directory', 'link'],
  ['settings', 'Site settings', 'landmark'],
  ['activity', 'Activity', 'activity'],
  ['admins', 'Admins', 'users'],
  ['account', 'Account', 'lock'],
];

function shell(page, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#1c1c1f">
<meta name="robots" content="noindex, nofollow">
<title>Admin | Monereo</title>
<link rel="icon" type="image/png" href="${asset('favicon.png')}">
<link rel="preload" href="${BASE}/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset('style.css')}">
<link rel="stylesheet" href="${asset('admin.css')}">
</head>
<body class="admin" data-page="${page}" data-base="${BASE}">
${body}
<noscript><p class="adm-noscript">The admin panel needs JavaScript.</p></noscript>
<script src="${asset('admin.js')}" defer></script>
</body>
</html>`;
}

const brand = `<a class="brand" href="${BASE}/"><img src="${asset('logo.png')}" width="26" height="26" alt=""><span class="wordmark">Mone<em>reo</em></span></a>`;

export function adminLoginPage() {
  return shell('login', `<main class="adm-login">
<form class="adm-login-card" id="login-form" autocomplete="on">
${brand}
<h1>Admin sign in</h1>
<label class="adm-field"><span>Username</span><input name="username" autocomplete="username" required autofocus spellcheck="false" autocapitalize="off"></label>
<label class="adm-field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
<p class="adm-error" id="login-error" role="alert" hidden></p>
<button class="btn btn-primary" type="submit">Sign in</button>
</form>
</main>`);
}

export function adminAppPage() {
  const links = NAV.map(([id, label, ic]) => `<a href="#${id}" data-view="${id}"${id === 'admins' ? ' hidden' : ''}>${icon(ic, 17)}<span>${label}</span></a>`).join('\n');
  return shell('app', `<div class="adm">
<aside class="adm-side">
<div class="adm-side-top">${brand}<span class="adm-badge">Admin</span></div>
<nav class="adm-nav" aria-label="Admin">
${links}
</nav>
<div class="adm-side-foot">
<a class="adm-view-site" href="${BASE}/" target="_blank" rel="noopener">${icon('arrowRight', 15)}<span>View site</span></a>
<div class="adm-user"><span id="me-name"></span><button type="button" class="btn btn-sm" id="logout">Sign out</button></div>
</div>
</aside>
<main class="adm-main" id="view" tabindex="-1"><p class="adm-loading">Loading…</p></main>
</div>
<div class="adm-toasts" id="toasts" aria-live="polite"></div>
<dialog class="dialog adm-dialog" id="modal"></dialog>`);
}
