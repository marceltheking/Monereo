(function () {
  'use strict';

  const BASE = document.body.dataset.base || '';
  const API = BASE + '/admin/api';

  // ---------- small DOM helpers ----------

  const $ = (id) => document.getElementById(id);

  // Builds elements without innerHTML, so text from the store can never become markup.
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    const late = {};
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'value' || k === 'checked' || k === 'selected') late[k] = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (typeof v === 'boolean' && k in el) el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    append(el, kids);
    Object.assign(el, late);
    return el;
  }

  function append(el, kids) {
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  }

  const ICONS = {
    edit: '<path d="M12 20h9"/><path d="M16.38 3.62a2.12 2.12 0 1 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    copy: '<rect width="14" height="14" x="8" y="8"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    star: '<path d="M11.52 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.9l5.16-.76a2.12 2.12 0 0 0 1.6-1.16z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  };

  function icon(name, size = 16) {
    const t = document.createElement('template');
    t.innerHTML = `<svg class="i" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
    return t.content.firstChild;
  }

  const iconBtn = (name, label, onclick, extra = {}) =>
    h('button', { type: 'button', class: 'adm-icon-btn' + (extra.danger ? ' is-danger' : ''), 'aria-label': label, title: label, onclick, disabled: !!extra.disabled }, icon(name));

  const grade = (g) => h('span', { class: 'grade grade-' + g.toLowerCase(), title: S.settings.kycGrades[g].label + ': ' + S.settings.kycGrades[g].description }, g);

  const pill = (label, tone) => h('span', { class: 'adm-pill' + (tone ? ' is-' + tone : '') }, label);

  function switchEl(checked, onchange, label) {
    return h('label', { class: 'switch', title: label },
      h('input', { type: 'checkbox', checked: !!checked, 'aria-label': label, onchange }),
      h('span'));
  }

  // ---------- formatting ----------

  const trim = (s) => s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  const pct = (f) => (f === null || f === undefined ? '' : trim((f * 100).toFixed(4)));
  const pctLabel = (f) => pct(f) + '%';
  const fromPct = (v) => (String(v).trim() === '' ? null : Number(v) / 100);
  const numOrNull = (v) => (String(v).trim() === '' ? null : Number(v));

  function ago(iso) {
    if (!iso) return 'never';
    const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  }

  const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  function host(url) {
    try {
      return new URL(url).host;
    } catch (e) {
      return '';
    }
  }

  // ---------- api ----------

  async function api(method, path, body) {
    const opts = { method, credentials: 'same-origin', headers: { accept: 'application/json' } };
    if (method !== 'GET') {
      opts.headers['content-type'] = 'application/json';
      opts.headers['x-monereo-admin'] = '1';
      opts.body = JSON.stringify(body || {});
    }
    let res;
    try {
      res = await fetch(API + path, opts);
    } catch (e) {
      throw new Error('Could not reach the server. Check your connection.');
    }
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      // Non-JSON error pages fall through to the generic message below.
    }
    if (res.status === 401 && path !== '/login') {
      window.location.href = BASE + '/admin';
      throw new Error(data.error || 'Signed out.');
    }
    if (!res.ok) {
      const err = new Error(data.error || 'Request failed (' + res.status + ').');
      err.field = data.field;
      throw err;
    }
    return data;
  }

  // ---------- toasts and dialogs ----------

  function toast(message, isError) {
    const el = h('div', { class: 'adm-toast' + (isError ? ' is-error' : ''), role: isError ? 'alert' : 'status' }, message);
    $('toasts').append(el);
    setTimeout(() => el.remove(), isError ? 6000 : 3200);
  }

  const modal = $('modal');
  let modalLocked = false;

  if (modal) {
    modal.addEventListener('cancel', (e) => {
      if (modalLocked) e.preventDefault();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal && !modalLocked) modal.close();
    });
  }

  function openModal(content, { small = false, locked = false } = {}) {
    modalLocked = locked;
    modal.className = 'dialog adm-dialog' + (small ? ' is-small' : '');
    modal.replaceChildren(content);
    if (!modal.open) modal.showModal();
    const first = modal.querySelector('input:not([type=hidden]):not([disabled]), select, textarea');
    if (first) first.focus();
  }

  function closeModal() {
    modalLocked = false;
    if (modal.open) modal.close();
  }

  function dialogHead(title, locked) {
    return h('div', { class: 'adm-dialog-head' },
      h('h2', null, title),
      locked ? null : h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: closeModal }, icon('close', 18)));
  }

  // Builds a modal form; `onSubmit` returns a promise and errors are shown inline.
  function formModal({ title, body, submitLabel = 'Save', onSubmit, small, locked, danger }) {
    const error = h('p', { class: 'adm-error', role: 'alert', hidden: true });
    const submit = h('button', { type: 'submit', class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary') }, submitLabel);
    const form = h('form', { novalidate: true },
      dialogHead(title, locked),
      h('div', { class: 'adm-dialog-body' }, body),
      h('div', { class: 'adm-dialog-foot' },
        error,
        locked ? null : h('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancel'),
        submit));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearInvalid(form);
      error.hidden = true;
      submit.disabled = true;
      try {
        await onSubmit(form);
      } catch (err) {
        showError(form, error, err);
      } finally {
        submit.disabled = false;
      }
    });
    openModal(form, { small, locked });
    return form;
  }

  function clearInvalid(root) {
    root.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  }

  function showError(root, box, err) {
    box.textContent = err.message;
    box.hidden = false;
    if (err.field) {
      const target = root.querySelector('[data-field="' + CSS.escape(err.field) + '"]');
      if (target) {
        target.classList.add('is-invalid');
        const input = target.querySelector('input, select, textarea');
        if (input) input.focus();
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  function confirmBox(title, text, { confirmLabel = 'Confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        closeModal();
        resolve(value);
      };
      const box = h('div', null,
        dialogHead(title),
        h('div', { class: 'adm-dialog-body' }, h('p', null, text)),
        h('div', { class: 'adm-dialog-foot' },
          h('button', { type: 'button', class: 'btn', onclick: () => finish(false) }, 'Cancel'),
          h('button', { type: 'button', class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), onclick: () => finish(true) }, confirmLabel)));
      openModal(box, { small: true });
      modal.addEventListener('close', () => finish(false), { once: true });
    });
  }

  // ---------- form helpers ----------

  function field(label, control, { help, name, span } = {}) {
    return h('label', { class: 'adm-field' + (span ? ' span-all' : ''), 'data-field': name },
      h('span', null, label), control, help ? h('small', null, help) : null);
  }

  const input = (name, value, attrs = {}) =>
    h('input', { name, value: value === null || value === undefined ? '' : String(value), autocomplete: 'off', spellcheck: 'false', ...attrs });

  function suffixed(suffix, el) {
    return h('div', { class: 'adm-suffix', 'data-suffix': suffix }, el);
  }

  function select(name, options, value, attrs = {}) {
    return h('select', { name, ...attrs },
      options.map(([v, label]) => h('option', { value: v, selected: v === value }, label)));
  }

  const check = (name, label, checked) =>
    h('label', { class: 'adm-check' }, h('input', { type: 'checkbox', name, checked: !!checked }), label);

  function toggleRow(name, title, note, checked) {
    return h('div', { class: 'adm-toggle-row', 'data-field': name },
      h('div', null, h('strong', null, title), note ? h('small', null, note) : null),
      h('label', { class: 'switch' }, h('input', { type: 'checkbox', name, checked: !!checked, 'aria-label': title }), h('span')));
  }

  const fieldset = (legend, ...kids) => h('fieldset', { class: 'adm-fieldset' }, h('legend', null, legend), kids);

  const val = (form, name) => {
    const el = form.elements[name];
    if (!el) return undefined;
    return el.type === 'checkbox' ? el.checked : el.value;
  };


  // Logo / icon chooser: pick from the image library or upload a new file.
  function imagePicker(ref, url, fieldName, opts = {}) {
    let current = ref;
    let loaded = false;
    const preview = h('img', { src: url, width: 48, height: 48, alt: '' });
    const gallery = h('div', { class: 'adm-gallery', hidden: true });
    const fileInput = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true });

    function set(nextRef, nextUrl) {
      current = nextRef;
      preview.src = nextUrl;
      gallery.querySelectorAll('button').forEach((b) => b.classList.toggle('is-selected', b.dataset.ref === nextRef));
    }

    async function openGallery() {
      gallery.hidden = !gallery.hidden;
      if (loaded || gallery.hidden) return;
      loaded = true;
      gallery.replaceChildren(h('span', { class: 'adm-dim' }, 'Loading…'));
      try {
        const { images } = await api('GET', '/images');
        gallery.replaceChildren(...images.map((img) =>
          h('button', { type: 'button', class: img.ref === current ? 'is-selected' : '', 'data-ref': img.ref, title: img.ref, onclick: () => set(img.ref, img.url) },
            h('img', { src: img.url, alt: '', loading: 'lazy' }))));
      } catch (e) {
        loaded = false;
        gallery.replaceChildren(h('span', { class: 'adm-dim' }, e.message));
      }
    }

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      if (file.size > 512 * 1024) return toast('Images can be at most 512 KB.', true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const out = await api('POST', '/upload', { data: reader.result });
          loaded = false;
          gallery.hidden = true;
          set(out.ref, out.url);
          toast('Image uploaded.');
        } catch (e) {
          toast(e.message, true);
        }
      };
      reader.readAsDataURL(file);
    });

    const el = h('div', { class: 'adm-field span-all', 'data-field': fieldName },
      h('span', null, opts.label || (fieldName === 'icon' ? 'Icon' : 'Logo')),
      h('div', { class: 'adm-logo-field' },
        preview,
        h('button', { type: 'button', class: 'btn btn-sm', onclick: openGallery }, 'Choose from library'),
        h('button', { type: 'button', class: 'btn btn-sm', onclick: () => fileInput.click() }, icon('upload', 14), 'Upload'),
        fileInput),
      gallery,
      h('small', null, opts.help || 'PNG, JPEG or WebP, up to 512 KB. Square images look best.'));
    return { el, get value() { return current; } };
  }

  // ---------- state ----------

  let S = null;
  let dirty = false;
  const view = $('view');

  // On phones the tables turn into cards (admin.css); each cell shows its column name from data-label.
  function labelCells() {
    view.querySelectorAll('.adm-table').forEach((table) => {
      const names = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      table.querySelectorAll('tbody tr').forEach((tr) => {
        [...tr.children].forEach((td, i) => {
          if (names[i] && !td.dataset.label) td.dataset.label = names[i];
          td.classList.toggle('adm-blank', !td.children.length && !td.textContent.trim());
        });
      });
    });
  }
  if (view) new MutationObserver(labelCells).observe(view, { childList: true, subtree: true });

  async function loadState() {
    S = await api('GET', '/state');
    showMe();
    markSubmissions();
  }

  const isOwner = () => S.me.role === 'owner';

  function showMe() {
    $('me-name').textContent = S.me.username;
    const link = document.querySelector('.adm-nav a[data-view="admins"]');
    if (link) link.hidden = !isOwner();
  }

  const liveProviders = () => S.providers.filter((p) => p.enabled);

  function head(title, sub, ...actions) {
    return h('div', { class: 'adm-head' },
      h('div', null, h('h1', null, title), sub ? h('p', null, sub) : null),
      actions.length ? h('div', { class: 'adm-actions' }, actions) : null);
  }

  // ---------- dashboard ----------

  function warnings() {
    const out = [];
    if (S.settings.maintenance.enabled) out.push('Maintenance mode is on. Visitors see the maintenance page.');
    if (S.newSubmissions) out.push(S.newSubmissions + ' new listing ' + (S.newSubmissions === 1 ? 'request waits' : 'requests wait') + ' for review under Submissions.');
    if (!liveProviders().length) out.push('No exchange is enabled, so the Exchanges section only shows directory links.');
    const noLogo = S.directory.links.filter((l) => l.enabled && !l.logo);
    if (noLogo.length) out.push(noLogo.length + ' directory ' + (noLogo.length === 1 ? 'link has no logo and shows' : 'links have no logo and show') + ' a letter instead: ' + noLogo.map((l) => l.name).join(', ') + '.');
    return out;
  }

  function card(label, value, note, tone) {
    return h('div', { class: 'adm-card' + (tone ? ' is-' + tone : '') },
      h('div', { class: 'adm-card-label' }, label),
      h('div', { class: 'adm-card-value' }, value),
      note ? h('div', { class: 'adm-card-note' }, note) : null);
  }

  function renderDashboard() {
    const live = liveProviders();
    const links = S.directory.links.filter((l) => l.enabled);
    const list = warnings();

    const activity = h('ul', { class: 'adm-list' }, h('li', { class: 'adm-dim' }, 'Loading…'));
    api('GET', '/activity').then(({ entries }) => {
      activity.replaceChildren(...(entries.length ? entries.slice(0, 8).map((e) =>
        h('li', null, h('span', { class: 'adm-pill' }, e.action), h('span', { class: 'adm-muted' }, e.detail || ''), h('span', { class: 'adm-dim' }, ' · ' + ago(e.t))))
        : [h('li', { class: 'adm-dim' }, 'No activity yet.')]));
    }).catch(() => activity.replaceChildren(h('li', { class: 'adm-dim' }, 'Could not load activity.')));

    view.replaceChildren(
      head('Dashboard', 'Overview of your Monereo site.',
        h('a', { class: 'btn', href: BASE + '/', target: '_blank', rel: 'noopener' }, icon('external', 15), 'View site')),
      h('div', { class: 'adm-cards' },
        card('Exchanges', h('span', null, String(live.length), h('small', null, ' / ' + S.providers.length)), 'Enabled on the site', live.length ? null : 'warn'),
        card('Directory links', h('span', null, String(links.length), h('small', null, ' / ' + S.directory.links.length)), S.directory.categories.length + ' categories'),
        card('Submissions', String(S.newSubmissions), 'Waiting for review', S.newSubmissions ? 'warn' : null),
        card('Visitors today', fmt(S.today.visitors), fmt(S.today.views) + ' page views · ' + fmt(S.today.online) + ' online now'),
        card('Site status', S.settings.maintenance.enabled ? 'Maintenance' : 'Online', S.settings.banner.enabled ? 'Banner is showing' : 'No banner', S.settings.maintenance.enabled ? 'warn' : 'on')),
      h('div', { class: 'adm-two adm-section' },
        h('div', null,
          h('section', { class: 'adm-panel' },
            h('h2', { class: 'adm-panel-title' }, 'Checklist'),
            h('ul', { class: 'adm-list' }, list.length
              ? list.map((w) => h('li', null, h('span', { class: 'adm-warn-icon' }, icon('alert', 16)), w))
              : h('li', null, h('span', { class: 'adm-ok-icon' }, icon('check', 16)), 'Everything looks good.'))),
          h('section', { class: 'adm-panel adm-section' },
            h('h2', { class: 'adm-panel-title' }, 'Recent activity'),
            activity,
            h('a', { class: 'btn btn-sm btn-ghost', href: '#activity' }, 'All activity')))));
  }

  // ---------- statistics ----------

  const STAT_RANGES = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];
  let statDays = 30;
  const fmt = (n) => Number(n || 0).toLocaleString('en-US');
  const shortDate = (iso, withYear) => new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: withYear ? 'numeric' : undefined, timeZone: 'UTC' });

  function change(cur, prev) {
    if (!prev) return cur ? 'New this period' : 'No data yet';
    const pct = Math.round(((cur - prev) / prev) * 100);
    return (pct > 0 ? '+' : '') + pct + '% vs previous ' + (statDays === 1 ? 'day' : statDays + ' days');
  }

  const SVG = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, ...kids) {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, String(v));
    kids.forEach((k) => el.append(k));
    return el;
  }

  // One series of columns with a hover tooltip; `points` are { label, value, lines }.
  function columnChart(points, valueName) {
    const W = 900, H = 240, L = 44, R = 8, T = 12, B = 26;
    const max = Math.max(1, ...points.map((p) => p.value));
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((v) => v * 4 >= max) || max;
    const top = nice * 4;
    const slot = (W - L - R) / points.length;
    const gap = slot > 6 ? 2 : 0;
    const bw = Math.max(1, slot - gap);
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'adm-chart', role: 'img', 'aria-label': valueName + ' chart' });
    for (let i = 0; i <= 4; i += 1) {
      const v = (top / 4) * i;
      chart.append(svg('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: i ? 'grid' : 'base' }));
      chart.append(svg('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' }, fmt(v)));
    }
    const every = Math.ceil(points.length / 8);
    const tip = h('div', { class: 'adm-chart-tip', hidden: true });
    points.forEach((p, i) => {
      const x = L + i * slot + gap / 2;
      const hgt = Math.max(0, y(0) - y(p.value));
      const r = Math.min(4, bw / 2, hgt);
      // Rounded at the data end, square at the baseline.
      const d = hgt ? `M${x},${y(0)}V${y(p.value) + r}Q${x},${y(p.value)} ${x + r},${y(p.value)}H${x + bw - r}Q${x + bw},${y(p.value)} ${x + bw},${y(p.value) + r}V${y(0)}Z` : '';
      if (d) chart.append(svg('path', { d, class: 'bar' }));
      if (i % every === 0) chart.append(svg('text', { x: x + bw / 2, y: H - 8, 'text-anchor': 'middle', class: 'tick' }, p.label));
      const hit = svg('rect', { x: L + i * slot, y: T, width: slot, height: H - T - B, class: 'hit' });
      const show = () => {
        chart.querySelectorAll('.bar.is-on').forEach((b) => b.classList.remove('is-on'));
        const bar = chart.querySelectorAll('.bar')[points.slice(0, i).filter((q) => q.value > 0).length];
        if (p.value && bar) bar.classList.add('is-on');
        tip.replaceChildren(h('strong', null, p.title || p.label), ...p.lines.map((l) => h('div', null, l)));
        tip.hidden = false;
        const box = chart.getBoundingClientRect();
        const px = ((L + i * slot + slot / 2) / W) * box.width;
        tip.style.left = Math.min(Math.max(px, 70), box.width - 70) + 'px';
      };
      hit.addEventListener('mouseenter', show);
      hit.addEventListener('touchstart', show, { passive: true });
      chart.append(hit);
    });
    chart.addEventListener('mouseleave', () => {
      tip.hidden = true;
      chart.querySelectorAll('.bar.is-on').forEach((b) => b.classList.remove('is-on'));
    });
    return h('div', { class: 'adm-chart-wrap' }, chart, tip);
  }

  function rankPanel(title, rows, { label = (r) => r.key, sub = null, empty = 'Nothing yet.', total = null, wide = false, help = null } = {}) {
    const sum = total || rows.reduce((a, r) => a + r.count, 0) || 1;
    const max = rows.length ? rows[0].count : 1;
    let limit = 10;
    const list = h('ol', { class: 'adm-rank' });
    const more = h('button', { type: 'button', class: 'btn btn-sm btn-ghost' });
    function draw() {
      list.replaceChildren(...rows.slice(0, limit).map((r) => h('li', { style: '--w:' + ((r.count / max) * 100).toFixed(1) + '%' },
        h('span', { class: 'adm-rank-label' }, label(r), sub ? h('small', null, sub(r)) : null),
        h('span', { class: 'adm-rank-n' }, fmt(r.count)),
        h('span', { class: 'adm-rank-pct' }, Math.round((r.count / sum) * 100) + '%'))));
      more.hidden = rows.length <= limit;
      more.textContent = 'Show all ' + rows.length;
    }
    more.addEventListener('click', () => { limit = rows.length; draw(); });
    draw();
    return h('section', { class: 'adm-panel' + (wide ? ' span-all' : '') },
      h('h2', { class: 'adm-panel-title' }, title),
      help ? h('p', { class: 'adm-help' }, help) : null,
      rows.length ? [list, more] : h('p', { class: 'adm-dim' }, empty));
  }

  async function renderStats() {
    const ranges = h('div', { class: 'adm-seg', role: 'group', 'aria-label': 'Period' },
      STAT_RANGES.map(([d, label]) => h('button', { type: 'button', class: 'btn btn-sm' + (d === statDays ? ' is-on' : ''), 'aria-pressed': String(d === statDays), onclick: () => { statDays = d; renderStats(); } }, label)));
    view.replaceChildren(
      head('Statistics', 'Anonymous counts: no cookies, no tracking scripts, and no IP addresses are stored.', ranges),
      h('p', { class: 'adm-loading' }, 'Loading…'));
    let r;
    try {
      r = await api('GET', '/stats?days=' + statDays);
    } catch (e) {
      view.lastChild.replaceWith(h('p', { class: 'adm-error' }, e.message));
      return;
    }
    const t = r.totals, p = r.previous;
    const rate = t.visitors ? Math.round((t.clicks / t.visitors) * 100) : 0;

    const points = statDays === 1
      ? r.hours.map((n, i) => ({ label: String(i).padStart(2, '0'), title: String(i).padStart(2, '0') + ':00–' + String(i).padStart(2, '0') + ':59 UTC', value: n, lines: [fmt(n) + ' page views'] }))
      : r.series.map((d) => ({ label: shortDate(d.date), title: shortDate(d.date, true), value: d.visitors, lines: [fmt(d.visitors) + ' visitors', fmt(d.views) + ' page views', fmt(d.clicks) + ' listing clicks'] }));
    const chartTitle = statDays === 1 ? 'Page views by hour today (UTC)' : 'Visitors per day';
    const table = h('details', { class: 'adm-section' }, h('summary', { class: 'adm-muted' }, 'Show as table'),
      h('div', { class: 'adm-table-wrap' }, h('table', { class: 'adm-table' },
        h('thead', null, statDays === 1
          ? h('tr', null, h('th', null, 'Hour (UTC)'), h('th', null, 'Page views'))
          : h('tr', null, h('th', null, 'Day'), h('th', null, 'Visitors'), h('th', null, 'Page views'), h('th', null, 'Listing clicks'))),
        h('tbody', null, statDays === 1
          ? r.hours.map((n, i) => h('tr', null, h('td', null, String(i).padStart(2, '0') + ':00'), h('td', null, fmt(n))))
          : r.series.slice().reverse().map((d) => h('tr', null, h('td', null, shortDate(d.date, true)), h('td', null, fmt(d.visitors)), h('td', null, fmt(d.views)), h('td', null, fmt(d.clicks))))))));

    const busiest = statDays === 1 ? null : r.hours.some(Boolean) ? r.hours.map((n, i) => ({ label: String(i).padStart(2, '0'), title: String(i).padStart(2, '0') + ':00–' + String(i).padStart(2, '0') + ':59 UTC', value: n, lines: [fmt(n) + ' page views'] })) : null;

    view.lastChild.replaceWith(h('div', null,
      h('div', { class: 'adm-cards' },
        card('Visitors', fmt(t.visitors), change(t.visitors, p.visitors)),
        card('Page views', fmt(t.views), change(t.views, p.views)),
        card('Listing clicks', fmt(t.clicks), rate + '% of visitors · ' + change(t.clicks, p.clicks)),
        card('Online now', fmt(r.online), 'Active in the last 5 minutes', r.online ? 'on' : null)),
      h('section', { class: 'adm-panel adm-section' },
        h('h2', { class: 'adm-panel-title' }, chartTitle),
        columnChart(points, chartTitle),
        table),
      h('div', { class: 'adm-stats-grid adm-section' },
        rankPanel('Where visitors come from', r.refs, { label: (x) => x.key === '(direct)' ? 'Direct or hidden' : x.key, help: 'Many privacy browsers hide where a visit came from; those count as direct. Links tagged ?ref=name show that name.' }),
        rankPanel('Browsers', r.browsers, { help: 'Tor Browser and Brave report themselves as Firefox and Chrome.' }),
        rankPanel('Operating systems', r.os),
        busiest ? h('section', { class: 'adm-panel span-all' }, h('h2', { class: 'adm-panel-title' }, 'Busiest hours (UTC)'), columnChart(busiest, 'Busiest hours')) : null),
      h('p', { class: 'adm-help adm-section' },
        'A visitor is counted once per day, so over longer periods the total is the sum of daily visitors. Bots and link previews are left out. Days run in UTC. Counting started ' + shortDate(r.since, true) + '.')));
  }

  // ---------- exchanges ----------

  // Pills for the per-service Verified and Recommended switches.
  const trustPills = (x) => [
    x.recommended ? pill('Recommended', 'accent') : null,
    x.verified ? pill('Verified', 'good') : pill('Unverified'),
  ];

  // The two switches every service's edit form has.
  const trustToggles = (src) => [
    toggleRow('verified', 'Verified', 'Shows a blue "Verified" badge. Turn on once you have tested the service yourself; otherwise it shows as "Unverified".', src.verified),
    toggleRow('recommended', 'Recommended', 'Adds a "Recommended" label and orange frame, and moves it above the others in its list.', src.recommended),
  ];

  const EDITABLE_PROVIDER = ['name', 'logo', 'website', 'enabled', 'featured', 'verified', 'recommended', 'spread', 'eta', 'kinds', 'kyc', 'guarantee', 'rating', 'notes', 'guaranteeNote', 'guaranteeOurs', 'liquidity'];

  const providerPayload = (p, changes) => Object.assign(Object.fromEntries(EDITABLE_PROVIDER.map((k) => [k, p[k]])), changes);

  const exFilter = { q: '', status: 'all' };

  function renderExchanges() {
    const total = S.providers.length;
    const search = h('input', { class: 'adm-input', type: 'search', placeholder: 'Search exchanges', value: exFilter.q, 'aria-label': 'Search exchanges' });
    const status = select('status', [['all', 'All'], ['live', 'Enabled'], ['off', 'Disabled']], exFilter.status, { class: 'adm-input', 'aria-label': 'Status filter' });
    const body = h('tbody');
    const tableWrap = h('div', { class: 'adm-table-wrap' });

    function draw() {
      const q = exFilter.q.trim().toLowerCase();
      const filtered = q || exFilter.status !== 'all';
      const list = S.providers.filter((p) =>
        (!q || p.name.toLowerCase().includes(q) || p.id.includes(q)) &&
        (exFilter.status === 'all' || (exFilter.status === 'live') === p.enabled));
      body.replaceChildren(...list.map((p) => providerRow(p, filtered)));
      tableWrap.replaceChildren(list.length
        ? h('table', { class: 'adm-table' },
          h('thead', null, h('tr', null,
            h('th', null, 'Order'), h('th', null, 'Exchange'), h('th', null, 'Live'), h('th', { class: 'num' }, 'Fee'),
            h('th', { class: 'num' }, 'Time'), h('th', null, 'Rates'), h('th', null, 'KYC'), h('th', null, 'Liquidity'), h('th'))),
          body)
        : h('p', { class: 'adm-empty' }, total ? 'No exchange matches.' : 'No exchanges yet. Add your first one.'));
    }

    search.addEventListener('input', () => { exFilter.q = search.value; draw(); });
    status.addEventListener('change', () => { exFilter.status = status.value; draw(); });

    view.replaceChildren(
      head('Exchanges', total + ' exchanges, ' + liveProviders().length + ' enabled. Shown at the top of the directory in this order, with Recommended ones first.',
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => providerForm(null) }, icon('plus', 15), 'Add exchange')),
      h('div', { class: 'adm-toolbar' }, search, status),
      tableWrap);
    draw();
  }

  function providerRow(p, filtered) {
    const i = S.providers.indexOf(p);
    return h('tr', { class: p.enabled ? '' : 'is-off' },
      h('td', { class: 'adm-keep adm-order' },
        iconBtn('up', 'Move up', () => moveProvider(i, -1), { disabled: filtered || i === 0 }),
        iconBtn('down', 'Move down', () => moveProvider(i, 1), { disabled: filtered || i === S.providers.length - 1 })),
      h('td', null, h('div', { class: 'adm-name' },
        h('img', { src: p.logoUrl, width: 32, height: 32, alt: '' }),
        h('div', null, h('strong', null, p.name, p.featured ? ' ' : null, p.featured ? pill('Featured', 'accent') : null),
          h('small', null, host(p.website) || p.id),
          h('div', { class: 'adm-pills adm-trust' }, trustPills(p))))),
      h('td', { class: 'adm-keep' }, switchEl(p.enabled, (e) => updateProvider(p, { enabled: e.target.checked }, e.target), 'Enabled')),
      h('td', { class: 'num' }, pctLabel(p.spread)),
      h('td', { class: 'num' }, '~' + p.eta + ' min'),
      h('td', null, h('div', { class: 'adm-pills' }, p.kinds.map((k) => pill(k)))),
      h('td', null, grade(p.kyc)),
      h('td', { class: 'adm-muted' }, { own: 'Own funds', mixed: 'Mixed', third: 'Third-party LP' }[p.liquidity] || '-'),
      h('td', { class: 'adm-row-actions adm-keep' },
        iconBtn('edit', 'Edit', () => providerForm(p)),
        iconBtn('copy', 'Duplicate', () => providerForm(p, { duplicate: true })),
        iconBtn('trash', 'Delete', () => deleteProvider(p), { danger: true })));
  }

  async function updateProvider(p, changes, control) {
    try {
      const saved = await api('PUT', '/providers/' + encodeURIComponent(p.id), providerPayload(p, changes));
      S.providers[S.providers.indexOf(p)] = saved;
      toast(saved.name + (changes.enabled === undefined ? ' saved.' : changes.enabled ? ' enabled.' : ' disabled.'));
      renderExchanges();
    } catch (e) {
      if (control) control.checked = !control.checked;
      toast(e.message, true);
    }
  }

  async function moveProvider(i, dir) {
    const list = S.providers.slice();
    const [item] = list.splice(i, 1);
    list.splice(i + dir, 0, item);
    try {
      await api('POST', '/providers/order', { ids: list.map((p) => p.id) });
      S.providers = list;
      renderExchanges();
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function deleteProvider(p) {
    const ok = await confirmBox('Delete ' + p.name + '?', 'It disappears from the site right away. This cannot be undone, but you can restore it from a backup.', { confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api('DELETE', '/providers/' + encodeURIComponent(p.id));
      S.providers = S.providers.filter((x) => x !== p);
      toast(p.name + ' deleted.');
      renderExchanges();
    } catch (e) {
      toast(e.message, true);
    }
  }

  function providerForm(p, { duplicate = false, prefill = null, onCreated = null } = {}) {
    const creating = !p || duplicate;
    const src = p || {
      ...{
      name: '', logo: 'favicon.png', logoUrl: BASE + '/favicon.png', website: '', enabled: true, featured: false,
      spread: 0.01, eta: 10, kinds: ['Fixed', 'Floating'], kyc: 'A', guarantee: null, rating: null, notes: '',
      },
      ...prefill,
    };
    const logo = imagePicker(src.logo, src.logoUrl, 'logo');
    const body = h('div', null,
      fieldset('Basics', h('div', { class: 'adm-grid' },
        field('Name', input('name', duplicate ? src.name + ' copy' : src.name, { required: true, maxlength: 40 }), { name: 'name' }),
        field('Website', input('website', src.website, { type: 'url', placeholder: 'https://' }), { name: 'website', help: 'Where the "Visit" button on the directory goes.' }),
        logo.el,
        h('div', { class: 'span-all adm-grid' },
          toggleRow('enabled', 'Enabled', 'Shown in the Exchanges section of the directory.', duplicate ? false : src.enabled),
          toggleRow('featured', 'Featured', 'Adds a "Featured" tag and an orange border.', src.featured),
          ...trustToggles(src)))),
      fieldset('Fees and speed', h('div', { class: 'adm-grid adm-grid-3' },
        field('Fee', suffixed('%', input('spread', pct(src.spread), { type: 'number', step: 'any', min: 0, max: 50, required: true })), { name: 'spread', help: 'The exchange\'s published fee, shown on its card.' }),
        field('Average time', suffixed('min', input('eta', src.eta, { type: 'number', min: 1, max: 1440, step: 1, required: true })), { name: 'eta' }),
        h('div', { class: 'adm-field span-all', 'data-field': 'kinds' }, h('span', null, 'Rate types'),
          h('div', { class: 'adm-checks' }, check('kind:Floating', 'Floating', src.kinds.includes('Floating')), check('kind:Fixed', 'Fixed', src.kinds.includes('Fixed')))))),
      fieldset('Trust', h('div', { class: 'adm-grid adm-grid-3' },
        field('KYC score', select('kyc', S.kycGrades.map((g) => [g, g + ' - ' + S.settings.kycGrades[g].label]), src.kyc), { name: 'kyc', help: 'Grades are defined in Site settings.' }),
        field('Guarantee with Monereo', suffixed('USD', input('guaranteeOurs', src.guaranteeOurs, { type: 'number', step: 1, min: 0, placeholder: 'None' })), { name: 'guaranteeOurs', help: 'Deposit held by Monereo. Shown in green.' }),
        field('Guarantee with third parties', suffixed('USD', input('guarantee', src.guarantee, { type: 'number', step: 1, min: 0, placeholder: 'None' })), { name: 'guarantee', help: 'Deposits with other aggregators. Shown in yellow.' }),
        field('Rating', suffixed('/ 5', input('rating', src.rating, { type: 'number', step: 0.1, min: 0, max: 5, placeholder: 'Hidden' })), { name: 'rating' }),
        field('Liquidity', select('liquidity', [['', 'Not stated'], ['own', 'Own funds (pays out from own reserves)'], ['mixed', 'Mixed (own funds plus third-party LPs)'], ['third', 'Third-party LP (routes via other exchanges)']], src.liquidity || ''), {
          name: 'liquidity', help: 'Shown on the exchange\'s card.',
        }),
        field('Third-party guarantee note', input('guaranteeNote', src.guaranteeNote || '', { maxlength: 240, placeholder: 'This service has 50K USD in deposits with third party aggregators.' }), {
          name: 'guaranteeNote', span: true,
          help: 'Shown when visitors hover the yellow ? next to the third-party amount. Leave empty for the default sentence.',
        }))),
      fieldset('Private notes', field('Notes', h('textarea', { name: 'notes', maxlength: 4000, rows: 3, placeholder: 'Contacts, contract terms, anything useful. Only admins see this.' }, src.notes || ''), { name: 'notes', span: true })));

    formModal({
      title: duplicate ? 'Duplicate ' + src.name : prefill ? 'Add ' + src.name : creating ? 'Add exchange' : 'Edit ' + src.name,
      body,
      submitLabel: creating ? 'Create exchange' : 'Save changes',
      onSubmit: async (form) => {
        const data = {
          name: val(form, 'name'),
          logo: logo.value,
          website: val(form, 'website').trim(),
          enabled: val(form, 'enabled'),
          featured: val(form, 'featured'),
          verified: val(form, 'verified'),
          recommended: val(form, 'recommended'),
          spread: fromPct(val(form, 'spread')),
          eta: Number(val(form, 'eta')),
          kinds: ['Floating', 'Fixed'].filter((k) => val(form, 'kind:' + k)),
          kyc: val(form, 'kyc'),
          guarantee: numOrNull(val(form, 'guarantee')),
          guaranteeNote: val(form, 'guaranteeNote').trim(),
          guaranteeOurs: numOrNull(val(form, 'guaranteeOurs')),
          liquidity: val(form, 'liquidity'),
          rating: numOrNull(val(form, 'rating')),
          notes: form.elements.notes.value,
        };
        if (data.spread === null) data.spread = NaN;
        if (creating) {
          const saved = await api('POST', '/providers', data);
          S.providers.push(saved);
          toast(saved.name + ' created.');
          if (onCreated) {
            closeModal();
            await onCreated(saved);
            return;
          }
        } else {
          const saved = await api('PUT', '/providers/' + encodeURIComponent(p.id), data);
          S.providers[S.providers.indexOf(p)] = saved;
          toast(saved.name + ' saved.');
        }
        closeModal();
        renderExchanges();
      },
    });
  }

  // ---------- directory ----------

  function renderDirectory() {
    const { categories, links } = S.directory;
    const panels = categories.map((c, ci) => {
      const own = links.filter((l) => l.category === c.id);
      const shown = own.filter((l) => l.enabled).length;
      return h('section', { class: 'adm-panel adm-section' },
        h('div', { class: 'adm-head' },
          h('div', null, h('h2', null, c.name, ' ', pill(shown ? shown + ' shown' : 'Hidden on site', shown ? 'good' : 'warn')),
            c.blurb ? h('p', null, c.blurb) : null),
          h('div', { class: 'adm-actions' },
            iconBtn('up', 'Move category up', () => moveCategory(ci, -1), { disabled: ci === 0 }),
            iconBtn('down', 'Move category down', () => moveCategory(ci, 1), { disabled: ci === categories.length - 1 }),
            iconBtn('edit', 'Edit category', () => categoryForm(c)),
            iconBtn('trash', 'Delete category', () => deleteCategory(c), { danger: true }),
            h('button', { type: 'button', class: 'btn btn-sm', onclick: () => linkForm(null, c.id) }, icon('plus', 14), 'Add link'))),
        own.length
          ? h('div', { class: 'adm-table-wrap' }, h('table', { class: 'adm-table' },
            h('thead', null, h('tr', null, h('th', null, 'Order'), h('th', null, 'Link'), h('th', null, 'Shown'), h('th', null, 'Tags'), h('th'))),
            h('tbody', null, own.map((l, i) => h('tr', { class: l.enabled ? '' : 'is-off' },
              h('td', { class: 'adm-keep adm-order' },
                iconBtn('up', 'Move up', () => moveLink(own, i, -1), { disabled: i === 0 }),
                iconBtn('down', 'Move down', () => moveLink(own, i, 1), { disabled: i === own.length - 1 })),
              h('td', null, h('div', { class: 'adm-name' },
                l.logoUrl ? h('img', { src: l.logoUrl, width: 32, height: 32, alt: '' }) : null,
                h('div', null, h('strong', null, l.name), h('small', null, host(l.url) || l.url),
                  h('div', { class: 'adm-pills adm-trust' }, trustPills(l))))),
              h('td', { class: 'adm-keep' }, switchEl(l.enabled, (e) => saveLink(l, { enabled: e.target.checked }, e.target), 'Shown')),
              h('td', null, h('div', { class: 'adm-pills' }, l.tags.map((t) => pill(t)))),
              h('td', { class: 'adm-row-actions adm-keep' },
                iconBtn('edit', 'Edit', () => linkForm(l)),
                iconBtn('trash', 'Delete', () => deleteLink(l), { danger: true })))))))
          : h('p', { class: 'adm-empty' }, 'No links yet. Categories without links are hidden on the site.'));
    });

    view.replaceChildren(
      head('Directory', links.length + ' links in ' + categories.length + ' categories. Shown on the homepage in this order, Recommended links first in their category; enabled exchanges from Exchanges are listed at the top of their category.',
        h('button', { type: 'button', class: 'btn', onclick: () => categoryForm(null) }, icon('plus', 15), 'Add category'),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => linkForm(null), disabled: !categories.length }, icon('plus', 15), 'Add link')),
      ...(categories.length ? panels : [h('p', { class: 'adm-empty' }, 'No categories yet. Add one to start the directory.')]));
  }

  async function dirCall(method, path, body, message) {
    try {
      S.directory = await api(method, '/directory' + path, body);
      if (message) toast(message);
      renderDirectory();
      return true;
    } catch (e) {
      toast(e.message, true);
      return false;
    }
  }

  const linkPayload = (l, changes) => Object.assign({ category: l.category, name: l.name, url: l.url, logo: l.logo, description: l.description, tags: l.tags, enabled: l.enabled, verified: l.verified, recommended: l.recommended }, changes);

  async function saveLink(l, changes, control) {
    const ok = await dirCall('PUT', '/links/' + encodeURIComponent(l.id), linkPayload(l, changes), l.name + (changes.enabled ? ' shown.' : ' hidden.'));
    if (!ok && control) control.checked = !control.checked;
  }

  function moveCategory(i, dir) {
    const ids = S.directory.categories.map((c) => c.id);
    ids.splice(i + dir, 0, ids.splice(i, 1)[0]);
    dirCall('POST', '/categories/order', { ids });
  }

  // Swaps a link with its neighbour in the same category; the full list keeps every other position.
  function moveLink(own, i, dir) {
    const ids = S.directory.links.map((l) => l.id);
    const a = ids.indexOf(own[i].id);
    const b = ids.indexOf(own[i + dir].id);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    dirCall('POST', '/links/order', { ids });
  }

  async function deleteCategory(c) {
    const ok = await confirmBox('Delete ' + c.name + '?', 'The category must be empty. This cannot be undone.', { confirmLabel: 'Delete', danger: true });
    if (ok) dirCall('DELETE', '/categories/' + encodeURIComponent(c.id), undefined, c.name + ' deleted.');
  }

  async function deleteLink(l) {
    const ok = await confirmBox('Delete ' + l.name + '?', 'It disappears from the site right away. This cannot be undone.', { confirmLabel: 'Delete', danger: true });
    if (ok) dirCall('DELETE', '/links/' + encodeURIComponent(l.id), undefined, l.name + ' deleted.');
  }

  function categoryForm(c) {
    formModal({
      title: c ? 'Edit ' + c.name : 'Add category',
      small: true,
      body: h('div', { class: 'adm-grid' },
        field('Name', input('name', c ? c.name : '', { required: true, maxlength: 40, placeholder: 'e.g. Wallets' }), { name: 'name', span: true }),
        field('Description', input('blurb', c ? c.blurb : '', { maxlength: 200 }), { name: 'blurb', span: true, help: 'One line under the category title.' })),
      submitLabel: c ? 'Save changes' : 'Create category',
      onSubmit: async (form) => {
        const data = { name: val(form, 'name'), blurb: val(form, 'blurb') };
        S.directory = await api(c ? 'PUT' : 'POST', '/directory/categories' + (c ? '/' + encodeURIComponent(c.id) : ''), data);
        toast(data.name + (c ? ' saved.' : ' created.'));
        closeModal();
        renderDirectory();
      },
    });
  }

  function linkForm(l, categoryId, { prefill = null, onCreated = null } = {}) {
    const src = l || { category: categoryId || S.directory.categories[0].id, name: '', url: '', logo: '', logoUrl: '', description: '', tags: [], enabled: true, ...prefill };
    const logo = imagePicker(src.logo, src.logoUrl || BASE + '/favicon.png', 'logo', { help: 'Optional. PNG, JPEG or WebP, up to 512 KB. Without a logo the first letter is shown.' });
    formModal({
      title: l ? 'Edit ' + l.name : prefill ? 'Add ' + src.name : 'Add link',
      body: h('div', { class: 'adm-grid' },
        field('Name', input('name', src.name, { required: true, maxlength: 40 }), { name: 'name' }),
        field('Category', select('category', S.directory.categories.map((c) => [c.id, c.name]), src.category), { name: 'category' }),
        field('Link', input('url', src.url, { type: 'url', required: true, placeholder: 'https://' }), { name: 'url', span: true, help: 'Include your referral code here if you have one.' }),
        field('Description', input('description', src.description, { maxlength: 200, placeholder: 'e.g. No-logs VPN, pay with Monero, no email needed.' }), { name: 'description', span: true }),
        field('Tags', input('tags', src.tags.join(', '), { maxlength: 140, placeholder: 'Accepts XMR, No KYC' }), { name: 'tags', span: true, help: 'Up to 5, separated by commas.' }),
        logo.el,
        h('div', { class: 'span-all adm-grid' }, toggleRow('enabled', 'Shown on site', 'Hidden links stay here for later.', src.enabled), ...trustToggles(src))),
      submitLabel: l ? 'Save changes' : 'Create link',
      onSubmit: async (form) => {
        const data = {
          name: val(form, 'name'),
          category: val(form, 'category'),
          url: val(form, 'url').trim(),
          description: val(form, 'description'),
          tags: val(form, 'tags').split(',').map((t) => t.trim()).filter(Boolean),
          logo: logo.value && logo.value !== 'favicon.png' ? logo.value : '',
          enabled: val(form, 'enabled'),
          verified: val(form, 'verified'),
          recommended: val(form, 'recommended'),
        };
        S.directory = await api(l ? 'PUT' : 'POST', '/directory/links' + (l ? '/' + encodeURIComponent(l.id) : ''), data);
        toast(data.name + (l ? ' saved.' : ' created.'));
        closeModal();
        if (onCreated) await onCreated(data);
        else renderDirectory();
      },
    });
  }

  // ---------- settings ----------

  function renderSettings() {
    const s = S.settings;
    const error = h('p', { class: 'adm-error', role: 'alert', hidden: true });
    const status = h('span', null, 'All changes saved.');
    const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Save settings');
    const importInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    const form = h('form', { class: 'adm-settings', novalidate: true },
      h('div', { class: 'adm-panel' }, fieldset('Homepage',
        h('div', { class: 'adm-grid' },
          field('Headline', input('heroTitle', s.heroTitle, { maxlength: 80 }), { name: 'heroTitle', span: true }),
          field('Subheadline', input('heroLede', s.heroLede, { maxlength: 200 }), { name: 'heroLede', span: true })))),
      h('div', { class: 'adm-panel adm-section' }, fieldset('Announcement banner',
        h('div', { class: 'adm-grid' },
          h('div', { class: 'span-all' }, toggleRow('banner.enabled', 'Show banner', 'A strip under the top bar on every page.', s.banner.enabled)),
          field('Message', input('banner.text', s.banner.text, { maxlength: 240, placeholder: 'e.g. New: 10 VPNs added to the directory' }), { name: 'banner.text' }),
          field('Style', select('banner.tone', [['info', 'Info (orange)'], ['warning', 'Warning (red)']], s.banner.tone), { name: 'banner.tone' })))),
      h('div', { class: 'adm-panel adm-section' }, fieldset('Maintenance mode',
        h('div', { class: 'adm-grid' },
          h('div', { class: 'span-all' }, toggleRow('maintenance.enabled', 'Maintenance mode', 'Replaces the directory with a message and answers 503. The admin keeps working.', s.maintenance.enabled)),
          field('Message', input('maintenance.message', s.maintenance.message, { maxlength: 240 }), { name: 'maintenance.message', span: true })))),
      h('div', { class: 'adm-panel adm-section' }, fieldset('KYC scores',
        h('p', { class: 'adm-help' }, 'Each exchange gets a grade from A (no KYC) to F (always KYC). Visitors see the grade, its name, and the description on hover.'),
        h('div', { class: 'adm-grades adm-section' }, S.kycGrades.map((g) => h('div', { class: 'adm-grade-row' },
          grade(g),
          field('Name', input('kycGrades.' + g + '.label', s.kycGrades[g].label, { maxlength: 24 }), { name: 'kycGrades.' + g + '.label' }),
          field('Description', input('kycGrades.' + g + '.description', s.kycGrades[g].description, { maxlength: 200 }), { name: 'kycGrades.' + g + '.description' })))))),
      h('div', { class: 'adm-panel adm-section' }, fieldset('Social links',
        h('div', { class: 'adm-grid' },
          Object.entries(S.socialLabels).map(([k, label]) =>
            field(label, input('socials.' + k, s.socials[k], { type: 'url', placeholder: 'https://' }), { name: 'socials.' + k })),
          field('Contact email', input('contactEmail', s.contactEmail || '', { type: 'email', placeholder: 'admin@example.com' }), { name: 'contactEmail', help: 'Shown as a mail icon in the top bar and in the footer.' })),
        h('p', { class: 'adm-help adm-section' }, 'Empty links are hidden on the site. Both Telegram links show the Telegram icon, with their name on hover and in the footer.'))),
      h('div', { class: 'adm-savebar' }, status, error, saveBtn));

    form.addEventListener('input', () => { dirty = true; status.textContent = 'Unsaved changes.'; });
    form.addEventListener('change', () => { dirty = true; status.textContent = 'Unsaved changes.'; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearInvalid(form);
      error.hidden = true;
      saveBtn.disabled = true;
      const g = (n) => val(form, n);
      const data = {
        heroTitle: g('heroTitle'),
        heroLede: g('heroLede'),
        banner: { enabled: g('banner.enabled'), text: g('banner.text'), tone: g('banner.tone') },
        maintenance: { enabled: g('maintenance.enabled'), message: g('maintenance.message') },
        kycGrades: Object.fromEntries(S.kycGrades.map((k) => [k, { label: g('kycGrades.' + k + '.label'), description: g('kycGrades.' + k + '.description') }])),
        socials: Object.fromEntries(Object.keys(S.socialLabels).map((k) => [k, g('socials.' + k).trim()])),
        contactEmail: g('contactEmail').trim(),
      };
      try {
        S.settings = await api('PUT', '/settings', data);
        dirty = false;
        status.textContent = 'All changes saved.';
        toast('Settings saved.');
      } catch (err) {
        showError(form, error, err);
      } finally {
        saveBtn.disabled = false;
      }
    });

    importInput.addEventListener('change', () => {
      const file = importInput.files[0];
      importInput.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let data;
        try {
          data = JSON.parse(reader.result);
        } catch (e) {
          return toast('That file is not valid JSON.', true);
        }
        const ok = await confirmBox('Restore this backup?', 'It replaces all exchanges, directory links and site settings with the ones in "' + file.name + '". Your admin account stays as it is.', { confirmLabel: 'Restore', danger: true });
        if (!ok) return;
        try {
          const fresh = await api('POST', '/import', data);
          Object.assign(S, fresh);
          toast('Backup restored.');
          renderSettings();
        } catch (e) {
          toast(e.message, true);
        }
      };
      reader.readAsText(file);
    });

    async function exportBackup() {
      try {
        const data = await api('GET', '/export');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: 'monereo-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast('Backup downloaded.');
      } catch (e) {
        toast(e.message, true);
      }
    }

    view.replaceChildren(
      head('Site settings', 'Content and behaviour of the public site. Changes go live as soon as you save.'),
      form,
      h('div', { class: 'adm-panel adm-section' }, fieldset('Backup',
        h('p', { class: 'adm-help' }, 'Download every exchange, directory link and setting as JSON, or restore a previous file. Uploaded images are not part of the file.'),
        h('div', { class: 'adm-actions adm-section' },
          h('button', { type: 'button', class: 'btn', onclick: exportBackup }, icon('download', 15), 'Download backup'),
          h('button', { type: 'button', class: 'btn', onclick: () => importInput.click() }, icon('upload', 15), 'Restore from file'),
          importInput))));
  }

  // ---------- submissions ----------

  const SUB_STATUS = [['new', 'New'], ['contacted', 'Contacted'], ['listed', 'Listed'], ['rejected', 'Rejected']];
  const SUB_TONES = { new: 'accent', contacted: 'warn', listed: 'good', rejected: 'bad' };
  // Features ticked on the submit form and the directory tag each one becomes. The server sends the full label lists.
  const SUB_TAGS = { xmr: 'Accepts XMR', nokyc: 'No KYC', noemail: 'No email', opensource: 'Open source', tor: 'Tor', i2p: 'I2P', noaccount: 'No account', nophone: 'No phone', noncustodial: 'Non-custodial', nologs: 'No logs', e2e: 'E2E encrypted' };
  const SUB_KIND_TAGS = { instant: 'Instant swap', p2p: 'P2P', dex: 'DEX', orderbook: 'Order book' };
  let subLabels = { features: {}, kinds: {}, liquidity: {}, socials: {} };
  const subCategory = (x) => S.directory.categories.find((c) => c.id === x.category);
  const subFilter = { status: 'open' };

  function contactLinks(x) {
    const out = [];
    if (x.telegram) out.push(h('a', { href: 'https://t.me/' + x.telegram.replace(/^@/, ''), target: '_blank', rel: 'noopener noreferrer' }, 'Telegram ' + x.telegram));
    if (x.simplex) out.push(h('a', { href: x.simplex, target: '_blank', rel: 'noopener noreferrer' }, 'SimpleX'));
    if (x.email) out.push(h('a', { href: 'mailto:' + x.email }, x.email));
    return out;
  }

  const extLink = (href, label) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label || href);

  // Everything else the form asked for: exchange details, alternative addresses and public links.
  function subFacts(x) {
    const L = x.links || {};
    const rows = [
      ['Works as', (x.kinds || []).map((k) => subLabels.kinds[k] || k).join(', ')],
      ['Payouts from', x.liquidity ? subLabels.liquidity[x.liquidity] || x.liquidity : ''],
      ['Coins', x.coins],
      ['Platforms', (x.platforms || []).join(', ')],
      ['Payments', x.payments],
      ['Onion', x.onion ? extLink(x.onion) : ''],
      ['I2P', x.i2p ? extLink(x.i2p) : ''],
      ['Source code', x.source ? extLink(x.source) : ''],
      [subLabels.socials.x || 'X', L.x ? extLink('https://x.com/' + L.x.replace(/^@/, ''), L.x) : ''],
      [subLabels.socials.tgchannel || 'Telegram channel', L.tgchannel ? extLink('https://t.me/' + L.tgchannel.replace(/^@/, ''), L.tgchannel) : ''],
      [subLabels.socials.nostr || 'Nostr', L.nostr],
      [subLabels.socials.matrix || 'Matrix', L.matrix ? (/^https:/.test(L.matrix) ? extLink(L.matrix) : extLink('https://matrix.to/#/' + L.matrix, L.matrix)) : ''],
      [subLabels.socials.otherlink || 'Other page', L.otherlink ? extLink(L.otherlink) : ''],
    ].filter(([, v]) => v);
    return rows.length ? h('dl', { class: 'adm-sub-facts' }, rows.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v)))) : null;
  }

  async function renderSubmissions() {
    view.replaceChildren(head('Submissions', 'Services asking to be listed, from the "Submit" page.'), h('p', { class: 'adm-loading' }, 'Loading…'));
    let list;
    try {
      const res = await api('GET', '/submissions');
      list = res.submissions;
      if (res.labels) subLabels = res.labels;
    } catch (e) {
      view.lastChild.replaceWith(h('p', { class: 'adm-error' }, e.message));
      return;
    }
    const status = select('status', [['open', 'New and contacted'], ['all', 'All']].concat(SUB_STATUS), subFilter.status, { class: 'adm-input', 'aria-label': 'Status filter' });
    const wrap = h('div', { class: 'adm-subs' });

    async function update(x, changes) {
      try {
        Object.assign(x, await api('PUT', '/submissions/' + x.id, { status: x.status, note: x.note || '', ...changes }));
        S.newSubmissions = list.filter((y) => y.status === 'new').length;
        markSubmissions();
        toast(x.name + ': ' + x.status + '.');
        draw();
      } catch (e) {
        toast(e.message, true);
      }
    }

    async function remove(x) {
      if (!(await confirmBox('Delete ' + x.name + '?', 'The submission and its contact details are removed for good.', { confirmLabel: 'Delete', danger: true }))) return;
      try {
        await api('DELETE', '/submissions/' + x.id);
        list = list.filter((y) => y !== x);
        S.newSubmissions = list.filter((y) => y.status === 'new').length;
        markSubmissions();
        draw();
      } catch (e) {
        toast(e.message, true);
      }
    }

    function reviewNotes(x) {
      const L = x.links || {};
      return ['Submitted ' + when(x.createdAt) + '.', x.summary, x.description, '',
        x.onion ? 'Onion: ' + x.onion : '', x.i2p ? 'I2P: ' + x.i2p : '', x.source ? 'Source: ' + x.source : '',
        x.coins ? 'Coins: ' + x.coins : '', x.liquidity ? 'Payouts: ' + (subLabels.liquidity[x.liquidity] || x.liquidity) : '',
        ...Object.keys(L).map((k) => (subLabels.socials[k] || k) + ': ' + L[k]),
        x.telegram ? 'Telegram: ' + x.telegram : '', x.simplex ? 'SimpleX: ' + x.simplex : '', x.email ? 'Email: ' + x.email : '']
        .filter((l, i) => l || i === 3).join('\n').slice(0, 4000);
    }

    function addAsExchange(x) {
      providerForm(null, {
        prefill: { name: x.name.slice(0, 40), website: x.website, kyc: x.kyc || 'A', notes: reviewNotes(x), enabled: false },
        onCreated: async (saved) => {
          await update(x, { status: 'listed' });
          toast(saved.name + ' added as a disabled exchange. Check its fees and turn it on under Exchanges.');
        },
      });
    }

    // Opens the directory link form, filled in from the submission and hidden until you switch it on.
    function addToDirectory(x) {
      const cat = subCategory(x);
      linkForm(null, cat ? cat.id : null, {
        prefill: {
          name: x.name.slice(0, 40),
          url: x.website,
          description: (x.summary || x.description || '').slice(0, 200),
          tags: (x.kinds || []).map((k) => SUB_KIND_TAGS[k]).concat((x.features || []).map((f) => SUB_TAGS[f])).filter(Boolean).slice(0, 5),
          enabled: false,
        },
        onCreated: async (saved) => {
          await update(x, { status: 'listed' });
          toast(saved.name + ' added to the directory, hidden. Add a logo and switch it on under Directory.');
        },
      });
    }

    function draw() {
      const shown = list.filter((x) => subFilter.status === 'all' || (subFilter.status === 'open' ? ['new', 'contacted'].includes(x.status) : x.status === subFilter.status));
      wrap.replaceChildren(...(shown.length ? shown.map((x) => {
        const note = h('textarea', { class: 'adm-input adm-sub-note', rows: 2, maxlength: 1000, placeholder: 'Internal note' }, x.note || '');
        const cat = subCategory(x);
        const isExchange = x.category === 'exchanges';
        return h('article', { class: 'adm-panel adm-sub' + (x.status === 'new' ? ' is-new' : '') },
          h('div', { class: 'adm-sub-head' },
            x.kyc ? grade(x.kyc) : null,
            h('div', null,
              h('strong', null, x.name),
              h('a', { href: x.website, target: '_blank', rel: 'noopener noreferrer', class: 'adm-sub-site' }, host(x.website) || x.website, ' ', icon('external', 12))),
            pill(cat ? cat.name : x.category === 'other' ? 'Something else' : 'No category', cat ? 'accent' : 'warn'),
            pill(SUB_STATUS.find(([k]) => k === x.status)?.[1] || x.status, SUB_TONES[x.status]),
            h('small', { class: 'adm-dim adm-sub-date' }, when(x.createdAt))),
          x.summary ? h('p', { class: 'adm-sub-desc' }, h('strong', null, x.summary)) : null,
          x.features && x.features.length ? h('div', { class: 'adm-pills adm-sub-tags' }, x.features.map((f) => pill(subLabels.features[f] || SUB_TAGS[f] || f, 'good'))) : null,
          x.description ? h('p', { class: 'adm-sub-desc' }, x.description) : null,
          subFacts(x),
          h('div', { class: 'adm-sub-contacts' }, contactLinks(x)),
          h('div', { class: 'adm-sub-actions' },
            select('st', SUB_STATUS, x.status, { class: 'adm-input', 'aria-label': 'Status', onchange: (e) => update(x, { status: e.target.value, note: note.value }) }),
            note,
            h('button', { type: 'button', class: 'btn btn-sm', onclick: () => update(x, { note: note.value }) }, 'Save note'),
            h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => addToDirectory(x), disabled: x.status === 'listed' }, icon('plus', 14), 'Add to ' + (cat ? cat.name : 'directory')),
            isExchange ? h('button', { type: 'button', class: 'btn btn-sm', onclick: () => addAsExchange(x), disabled: x.status === 'listed', title: 'Adds it to the instant exchanges with KYC score, fee and guarantee' }, 'Add as instant exchange') : null,
            iconBtn('trash', 'Delete', () => remove(x), { danger: true })));
      }) : [h('p', { class: 'adm-empty adm-panel' }, list.length ? 'Nothing in this filter.' : 'No submissions yet. They arrive from the "Submit" page.')]));
    }

    status.addEventListener('change', () => { subFilter.status = status.value; draw(); });
    view.lastChild.replaceWith(h('div', null, h('div', { class: 'adm-toolbar' }, status), wrap));
    draw();
  }

  // Shows how many new submissions wait, next to the sidebar link.
  function markSubmissions() {
    const link = document.querySelector('.adm-nav a[data-view="submissions"]');
    if (!link) return;
    let badge = link.querySelector('.adm-count');
    if (!S.newSubmissions) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = h('span', { class: 'adm-count' });
      link.append(badge);
    }
    badge.textContent = String(S.newSubmissions);
  }

  // ---------- activity ----------

  const ACTION_TONES = {
    'login.failed': 'bad', login: 'good', 'account.updated': 'accent', 'backup.imported': 'warn',
    'admin.created': 'accent', 'admin.updated': 'accent', 'admin.password-reset': 'warn', 'admin.deleted': 'bad',
  };

  async function renderActivity() {
    view.replaceChildren(head('Activity', 'Sign-ins and every change made in the admin. The latest 1000 entries are kept.'), h('p', { class: 'adm-loading' }, 'Loading…'));
    let entries;
    try {
      ({ entries } = await api('GET', '/activity'));
    } catch (e) {
      view.lastChild.replaceWith(h('p', { class: 'adm-error' }, e.message));
      return;
    }
    let limit = 100;
    const search = h('input', { class: 'adm-input', type: 'search', placeholder: 'Filter by action, user, IP or detail', 'aria-label': 'Filter' });
    const wrap = h('div');

    function draw() {
      const q = search.value.trim().toLowerCase();
      const list = entries.filter((e) => !q || [e.action, e.user, e.ip, e.detail].join(' ').toLowerCase().includes(q));
      wrap.replaceChildren(list.length
        ? h('div', { class: 'adm-table-wrap' }, h('table', { class: 'adm-table' },
          h('thead', null, h('tr', null, h('th', null, 'Time'), h('th', null, 'Action'), h('th', null, 'Details'), h('th', null, 'User'), h('th', null, 'IP'))),
          h('tbody', null, list.slice(0, limit).map((e) => h('tr', null,
            h('td', { class: 'adm-muted', title: e.t }, when(e.t)),
            h('td', null, pill(e.action, ACTION_TONES[e.action])),
            h('td', null, e.detail || ''),
            h('td', null, e.user),
            h('td', { class: 'adm-mono adm-muted' }, e.ip))))))
        : h('p', { class: 'adm-empty adm-panel' }, 'Nothing here yet.'),
      list.length > limit ? h('button', { type: 'button', class: 'btn adm-section', onclick: () => { limit += 200; draw(); } }, 'Show more (' + (list.length - limit) + ' left)') : null);
    }
    search.addEventListener('input', draw);
    view.lastChild.replaceWith(h('div', null, h('div', { class: 'adm-toolbar' }, search), wrap));
    draw();
  }

  // ---------- account ----------

  function passwordInputs(withCurrent) {
    const generated = h('small');
    const newPw = input('newPassword', '', { type: 'password', autocomplete: 'new-password', minlength: 10 });
    const confirmPw = input('confirmPassword', '', { type: 'password', autocomplete: 'new-password' });
    function generate() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_.!';
      const bytes = crypto.getRandomValues(new Uint8Array(20));
      const pw = Array.from(bytes, (b) => chars[b % chars.length]).join('');
      newPw.type = confirmPw.type = 'text';
      newPw.value = confirmPw.value = pw;
      generated.textContent = 'Generated. Save it in your password manager before continuing.';
    }
    return [
      withCurrent ? field('Current password', input('currentPassword', '', { type: 'password', autocomplete: 'current-password' }), { name: 'currentPassword', span: true }) : null,
      field('New password', newPw, { name: 'newPassword', help: 'At least 10 characters.' }),
      field('Repeat new password', confirmPw, { name: 'confirmPassword' }),
      h('div', { class: 'span-all adm-checks' },
        h('button', { type: 'button', class: 'btn btn-sm', onclick: generate }, icon('key', 14), 'Generate strong password'),
        h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { newPw.type = confirmPw.type = newPw.type === 'password' ? 'text' : 'password'; } }, 'Show / hide'),
        generated),
    ];
  }

  function checkRepeat(form, required) {
    const a = val(form, 'newPassword');
    const b = val(form, 'confirmPassword');
    if (required && !a) {
      const e = new Error('Choose a new password.');
      e.field = 'newPassword';
      throw e;
    }
    if (a !== b) {
      const e = new Error('The two passwords do not match.');
      e.field = 'confirmPassword';
      throw e;
    }
  }

  function forcePasswordChange() {
    view.replaceChildren(h('p', { class: 'adm-loading' }, 'Set a new password to continue.'));
    formModal({
      title: 'Secure your admin account',
      locked: true,
      small: true,
      submitLabel: 'Save and continue',
      body: h('div', null,
        h('p', null, 'You signed in with a temporary password. Choose your own password now. You can also change the username.'),
        h('div', { class: 'adm-grid' },
          field('Username', input('username', S.me.username, { autocomplete: 'username', maxlength: 32 }), { name: 'username', span: true }),
          passwordInputs(false))),
      onSubmit: async (form) => {
        checkRepeat(form, true);
        const out = await api('POST', '/account', { username: val(form, 'username').trim(), newPassword: val(form, 'newPassword') });
        S.me = out.me;
        closeModal();
        await loadState();
        toast('Password changed. Welcome, ' + S.me.username + '.');
        route();
      },
    });
  }

  function renderAccount() {
    const error = h('p', { class: 'adm-error', role: 'alert', hidden: true });
    const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Update account');
    const form = h('form', { class: 'adm-panel', novalidate: true },
      fieldset('Sign-in details', h('div', { class: 'adm-grid' },
        field('Username', input('username', S.me.username, { autocomplete: 'username', maxlength: 32 }), { name: 'username', span: true }),
        passwordInputs(true),
        h('p', { class: 'adm-help span-all' }, 'Leave the new password empty to only change the username. Saving signs out every other session.'))),
      h('div', { class: 'adm-actions adm-section' }, saveBtn),
      error);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearInvalid(form);
      error.hidden = true;
      saveBtn.disabled = true;
      try {
        checkRepeat(form, false);
        const out = await api('POST', '/account', {
          username: val(form, 'username').trim(),
          currentPassword: val(form, 'currentPassword'),
          newPassword: val(form, 'newPassword'),
        });
        S.me = out.me;
        showMe();
        toast('Account updated.');
        renderAccount();
      } catch (err) {
        showError(form, error, err);
      } finally {
        saveBtn.disabled = false;
      }
    });

    const sessionsBox = h('div', null, h('p', { class: 'adm-loading' }, 'Loading…'));
    async function loadSessions() {
      try {
        const { sessions } = await api('GET', '/sessions');
        sessionsBox.replaceChildren(
          h('div', { class: 'adm-table-wrap' }, h('table', { class: 'adm-table' },
            h('thead', null, h('tr', null, h('th', null, 'Device'), h('th', null, 'IP'), h('th', null, 'Signed in'), h('th', null, 'Last active'))),
            h('tbody', null, sessions.map((s) => h('tr', null,
              h('td', null, s.current ? pill('This device', 'good') : null, ' ', h('span', { class: 'adm-muted' }, s.agent.slice(0, 80) || 'Unknown')),
              h('td', { class: 'adm-mono adm-muted' }, s.ip),
              h('td', { class: 'adm-muted' }, when(s.created)),
              h('td', { class: 'adm-muted' }, ago(s.lastSeen))))))),
          sessions.length > 1 ? h('button', { type: 'button', class: 'btn btn-danger adm-section', onclick: revokeOthers }, 'Sign out all other sessions') : null);
      } catch (e) {
        sessionsBox.replaceChildren(h('p', { class: 'adm-error' }, e.message));
      }
    }
    async function revokeOthers() {
      try {
        const out = await api('POST', '/sessions/revoke-others');
        toast(out.revoked + ' other sessions signed out.');
        loadSessions();
      } catch (e) {
        toast(e.message, true);
      }
    }
    loadSessions();

    view.replaceChildren(
      head('Account', 'Your admin sign-in' + (isOwner() ? ' (owner)' : '') + '. Sessions end after 8 hours without activity.'),
      form,
      h('section', { class: 'adm-section' }, h('h2', null, 'Active sessions'), sessionsBox));
  }

  // ---------- admins (owners only) ----------

  const ROLE_LABELS = { owner: 'Owner', admin: 'Admin' };
  const ROLE_HELP = 'Owners can do everything, including managing admin accounts. Admins can do everything except that.';

  function newPasswordFields(label) {
    const pw = input('password', '', { type: 'text', autocomplete: 'new-password', minlength: 10 });
    const note = h('small', null, 'At least 10 characters. Send it to them privately.');
    function generate() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
      pw.value = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => chars[b % chars.length]).join('');
    }
    generate();
    return [
      h('label', { class: 'adm-field span-all', 'data-field': 'password' }, h('span', null, label), pw, note),
      h('div', { class: 'span-all adm-checks' },
        h('button', { type: 'button', class: 'btn btn-sm', onclick: generate }, icon('key', 14), 'Generate another'),
        check('mustChange', 'Ask them to choose their own password at first sign-in', true)),
    ];
  }

  async function renderAdmins() {
    if (!isOwner()) {
      view.replaceChildren(head('Admins'), h('p', { class: 'adm-empty adm-panel' }, 'Only owners can manage admin accounts.'));
      return;
    }
    const addBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => adminForm(null) }, icon('plus', 15), 'Add admin');
    view.replaceChildren(head('Admins', 'Everyone who can sign in to this panel. ' + ROLE_HELP, addBtn), h('p', { class: 'adm-loading' }, 'Loading…'));
    let admins;
    try {
      ({ admins } = await api('GET', '/admins'));
    } catch (e) {
      view.lastChild.replaceWith(h('p', { class: 'adm-error' }, e.message));
      return;
    }
    const wrap = h('div');

    function draw() {
      wrap.replaceChildren(h('div', { class: 'adm-table-wrap' }, h('table', { class: 'adm-table' },
        h('thead', null, h('tr', null, h('th', null, 'Username'), h('th', null, 'Role'), h('th', null, 'Last sign-in'), h('th', null, 'Sessions'), h('th', null, ''))),
        h('tbody', null, admins.map((a) => {
          const me = a.id === S.me.id;
          return h('tr', null,
            h('td', null, h('strong', null, a.username), me ? [' ', pill('You', 'good')] : null, a.mustChange ? [' ', pill('Temporary password', 'warn')] : null),
            h('td', null, pill(ROLE_LABELS[a.role] || a.role, a.role === 'owner' ? 'accent' : null)),
            h('td', { class: 'adm-muted' }, a.lastLogin ? ago(a.lastLogin) : 'Never'),
            h('td', { class: 'adm-muted' }, String(a.sessions)),
            h('td', { class: 'adm-row-actions adm-keep' },
              iconBtn('edit', 'Edit ' + a.username, () => adminForm(a)),
              me ? null : iconBtn('key', 'Set a new password for ' + a.username, () => resetForm(a)),
              me ? null : iconBtn('trash', 'Remove ' + a.username, () => remove(a), { danger: true })));
        })))));
    }

    function update(out, message) {
      admins = out.admins;
      if (out.me) { S.me = out.me; showMe(); }
      closeModal();
      toast(message);
      if (!isOwner()) { route(); return; }
      draw();
    }

    function adminForm(a) {
      formModal({
        title: a ? 'Edit ' + a.username : 'Add admin',
        small: true,
        submitLabel: a ? 'Save' : 'Add admin',
        body: h('div', { class: 'adm-grid' },
          field('Username', input('username', a ? a.username : '', { maxlength: 32 }), { name: 'username', span: true }),
          field('Role', select('role', Object.entries(ROLE_LABELS), a ? a.role : 'admin'), { name: 'role', span: true, help: ROLE_HELP }),
          a ? null : newPasswordFields('Starting password')),
        onSubmit: async (form) => {
          const body = { username: val(form, 'username').trim(), role: form.elements.role.value };
          if (!a) Object.assign(body, { password: val(form, 'password'), mustChange: form.elements.mustChange.checked });
          const out = a ? await api('PUT', '/admins/' + a.id, body) : await api('POST', '/admins', body);
          update(out, a ? 'Admin updated.' : body.username + ' can now sign in.');
        },
      });
    }

    function resetForm(a) {
      formModal({
        title: 'New password for ' + a.username,
        small: true,
        submitLabel: 'Set password',
        body: h('div', null,
          h('p', null, 'This replaces their current password and signs them out everywhere.'),
          h('div', { class: 'adm-grid' }, newPasswordFields('New password'))),
        onSubmit: async (form) => {
          const out = await api('POST', '/admins/' + a.id + '/password', { password: val(form, 'password'), mustChange: form.elements.mustChange.checked });
          update(out, 'Password set for ' + a.username + '.');
        },
      });
    }

    async function remove(a) {
      if (!(await confirmBox('Remove ' + a.username + '?', 'They are signed out right away and can no longer sign in.', { confirmLabel: 'Remove', danger: true }))) return;
      try {
        update(await api('DELETE', '/admins/' + a.id), a.username + ' removed.');
      } catch (e) {
        toast(e.message, true);
      }
    }

    view.lastChild.replaceWith(wrap);
    draw();
  }

  // ---------- router ----------

  const VIEWS = { dashboard: renderDashboard, exchanges: renderExchanges, directory: renderDirectory, submissions: renderSubmissions, settings: renderSettings, activity: renderActivity, stats: renderStats, admins: renderAdmins, account: renderAccount };
  let currentView = null;

  function route() {
    const id = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard';
    if (dirty && currentView === 'settings' && id !== 'settings') {
      if (!window.confirm('You have unsaved settings. Leave without saving?')) {
        history.replaceState(null, '', '#settings');
        return;
      }
    }
    dirty = false;
    currentView = id;
    document.querySelectorAll('.adm-nav a').forEach((a) => a.classList.toggle('is-active', a.dataset.view === id));
    VIEWS[id]();
    window.scrollTo(0, 0);
  }

  // ---------- boot ----------

  async function bootApp() {
    try {
      await loadState();
    } catch (e) {
      view.replaceChildren(h('p', { class: 'adm-error' }, e.message));
      return;
    }
    $('logout').addEventListener('click', async () => {
      try {
        await api('POST', '/logout');
      } finally {
        window.location.href = BASE + '/admin';
      }
    });
    window.addEventListener('beforeunload', (e) => {
      if (dirty) e.preventDefault();
    });
    window.addEventListener('hashchange', () => {
      if (!S.me.mustChange) route();
    });
    if (S.me.mustChange) forcePasswordChange();
    else route();
  }

  function bootLogin() {
    const form = $('login-form');
    const error = $('login-error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.hidden = true;
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        await api('POST', '/login', { username: form.elements.username.value.trim(), password: form.elements.password.value });
        window.location.href = BASE + '/admin';
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
        form.elements.password.value = '';
        form.elements.password.focus();
        btn.disabled = false;
      }
    });
  }

  if (document.body.dataset.page === 'login') bootLogin();
  else bootApp();
})();
