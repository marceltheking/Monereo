// Keeps the price bar at the bottom of the page current. Without this script it shows the price from page load.
(function () {
  'use strict';

  var bar = document.querySelector('[data-ticker]');
  if (!bar) return;

  var el = function (k) { return bar.querySelector('[data-tk="' + k + '"]'); };
  var price = el('usd');
  var change = el('change');
  var updated = el('updated');
  var refresh = bar.querySelector('[data-tk-refresh]');
  var top = bar.querySelector('[data-tk-top]');
  var busy = false;

  var money = function (n, sign) {
    return n == null ? '-' : sign + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // "just now", "40s ago", "3m ago"
  function ago() {
    var t = Date.parse(updated.dataset.time || '');
    if (!t) return;
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    updated.textContent = s < 10 ? 'just now' : s < 60 ? s + 's ago' : Math.floor(s / 60) + 'm ago';
  }

  function render(t) {
    var old = parseFloat(price.textContent.replace(/[^0-9.]/g, ''));
    price.textContent = money(t.usd, '$');
    el('btc').textContent = t.btc == null ? '-' : t.btc.toFixed(6) + ' BTC';
    change.textContent = t.change == null ? '' : (t.change >= 0 ? '+' : '') + t.change.toFixed(2) + '%';
    change.classList.toggle('is-up', t.change != null && t.change >= 0);
    change.classList.toggle('is-down', t.change != null && t.change < 0);
    updated.dataset.time = t.updatedAt;
    updated.title = 'Price from ' + t.source + ', fetched by our server';
    bar.classList.remove('is-off');
    // A short flash when the price moves.
    if (old && old !== t.usd) {
      price.classList.remove('flash-up', 'flash-down');
      void price.offsetWidth;
      price.classList.add(t.usd > old ? 'flash-up' : 'flash-down');
    }
    ago();
  }

  function load() {
    if (busy) return;
    busy = true;
    refresh.classList.add('is-spinning');
    fetch('/api/ticker', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(render)
      .catch(function () { bar.classList.add('is-off'); })
      .then(function () {
        busy = false;
        setTimeout(function () { refresh.classList.remove('is-spinning'); }, 400);
      });
  }

  refresh.hidden = false;
  refresh.addEventListener('click', load);

  top.addEventListener('click', function (e) {
    e.preventDefault();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  // The top button only shows once the page is scrolled.
  function markTop() { top.classList.toggle('is-shown', window.scrollY > 400); }
  window.addEventListener('scroll', markTop, { passive: true });
  markTop();

  ago();
  setInterval(ago, 5000);
  // A fresh price every minute while the tab is open and visible.
  setInterval(function () { if (!document.hidden) load(); }, 60000);
  document.addEventListener('visibilitychange', function () {
    // With no price yet there is no time, which counts as stale.
    if (!document.hidden && !(Date.now() - Date.parse(updated.dataset.time || '') <= 60000)) load();
  });
})();
