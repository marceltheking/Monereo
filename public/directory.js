(function () {
  'use strict';

  // Instant directory search. The server renders the same filtering for ?q= without JavaScript.
  var input = document.getElementById('dir-q');
  if (!input) return;
  var form = input.form;
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-cat]'));
  var count = document.getElementById('dir-count');
  var none = document.getElementById('dir-none');
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var filters = Array.prototype.slice.call(document.querySelectorAll('.dir-filters input[type="checkbox"]'));

  function apply() {
    var q = input.value.replace(/\s+/g, ' ').trim();
    var terms = q.toLowerCase().split(' ').filter(Boolean);
    var active = filters.filter(function (f) { return f.checked; }).map(function (f) { return f.name; });
    var total = 0;
    sections.forEach(function (sec) {
      var shown = 0;
      each(sec.querySelectorAll('[data-group]'), function (group) {
        var n = 0;
        each(group.querySelectorAll('[data-search]'), function (item) {
          var text = item.getAttribute('data-search');
          var flags = (item.getAttribute('data-f') || '').split(' ');
          var ok = terms.every(function (t) { return text.indexOf(t) !== -1; })
            && active.every(function (k) { return flags.indexOf(k) !== -1; });
          item.hidden = !ok;
          if (ok) n += 1;
        });
        group.hidden = !n;
        shown += n;
      });
      sec.hidden = !shown;
      total += shown;
      var secCount = sec.querySelector('.dir-sec-count');
      if (secCount) secCount.textContent = terms.length || active.length ? shown : secCount.getAttribute('data-total');
      var link = document.querySelector('[data-cat-link="' + sec.getAttribute('data-cat') + '"]');
      if (link) {
        // Empty categories stay in the list, dimmed, so the filters under it don't move.
        link.classList.toggle('is-empty', !shown);
        link.querySelector('.n').textContent = shown;
      }
    });
    none.hidden = total > 0;
    count.hidden = !terms.length && !active.length;
    count.querySelector('.n').textContent = total;
    count.querySelector('.w').textContent = total === 1 ? 'result' : 'results';
    count.querySelector('.for').hidden = !terms.length;
    count.querySelector('.q').textContent = q;
    count.querySelector('.dir-clear').textContent = terms.length && active.length ? 'Clear all' : active.length ? 'Clear filters' : 'Clear search';
    keepResultsInView();
    current = null;
    if (typeof markCategory === 'function') markCategory();
    var query = (terms.length ? ['q=' + encodeURIComponent(q)] : []).concat(active.map(function (k) { return k + '=1'; }));
    try {
      window.history.replaceState(null, '', query.length ? '?' + query.join('&') : window.location.pathname);
    } catch (e) { /* history can be unavailable in sandboxed frames */ }
  }

  // Hiding listings makes the page shorter, and the browser would keep the old scroll position,
  // which drops the reader at the footer. When the reader was down in the listings, jump back to the
  // results line. On desktop the offset matches the sticky sidebar, so the boxes stay under the pointer.
  var main = document.querySelector('.dir-main');
  var side = document.querySelector('.dir-side');
  function keepResultsInView() {
    if (!main) return;
    var sideStyle = side && window.getComputedStyle(side);
    var pad = sideStyle && sideStyle.position === 'sticky'
      ? parseFloat(sideStyle.top)
      : parseFloat(window.getComputedStyle(document.documentElement).scrollPaddingTop);
    var top = main.getBoundingClientRect().top - (pad || 0);
    if (top < 0) window.scrollTo({ top: window.pageYOffset + top, behavior: 'instant' });
  }

  input.addEventListener('input', apply);
  filters.forEach(function (f) { f.addEventListener('change', apply); });

  // Anonymous counts for the admin statistics: which listings are opened and what people search for.
  // Only the listing or the search words are sent; no cookie or identifier is involved.
  var eventUrl = form.getAttribute('action').replace(/\/$/, '') + '/api/e';
  function sendEvent(data) {
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(eventUrl, JSON.stringify(data));
    } catch (e) { /* counting never gets in the way */ }
  }
  var searchTimer = null;
  var lastSent = '';
  function noteSearch() {
    clearTimeout(searchTimer);
    searchTimer = null;
    var q = input.value.replace(/\s+/g, ' ').trim().toLowerCase();
    if (q.length >= 2 && q !== lastSent) {
      lastSent = q;
      sendEvent({ t: 'search', q: q.slice(0, 40) });
    }
  }
  input.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(noteSearch, 2000);
  });
  function noteClick(e) {
    if (e.type === 'auxclick' && e.button !== 1) return;
    var a = e.target.closest && e.target.closest('a[data-stat]');
    if (!a) return;
    if (searchTimer) noteSearch();
    sendEvent({ t: 'click', id: a.getAttribute('data-stat') });
  }
  document.addEventListener('click', noteClick);
  document.addEventListener('auxclick', noteClick);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    apply();
    var first = sections.filter(function (sec) { return !sec.hidden; })[0];
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  var clear = count.querySelector('.dir-clear');
  if (clear) {
    clear.addEventListener('click', function (e) {
      e.preventDefault();
      input.value = '';
      filters.forEach(function (f) { f.checked = false; });
      apply();
      input.focus();
    });
  }

  // Popular searches fill the box instead of reloading the page.
  each(document.querySelectorAll('.dir-popular a[data-q]'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      input.value = a.textContent;
      apply();
      var first = sections.filter(function (sec) { return !sec.hidden; })[0];
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // The sidebar marks the category being read; on phones the chip row scrolls to keep it visible.
  var catList = document.querySelector('.dir-cats ul');
  var current = null;
  function markCategory() {
    var line = window.innerHeight * 0.3;
    var active = null;
    sections.forEach(function (sec) {
      if (!sec.hidden && sec.getBoundingClientRect().top <= line) active = sec;
    });
    if (!active) active = sections.filter(function (sec) { return !sec.hidden; })[0];
    var id = active ? active.getAttribute('data-cat') : null;
    if (id === current) return;
    current = id;
    each(document.querySelectorAll('[data-cat-link]'), function (li) {
      var on = li.getAttribute('data-cat-link') === id;
      li.classList.toggle('is-current', on);
      if (on && catList && catList.scrollWidth > catList.clientWidth) {
        catList.scrollTo({ left: li.offsetLeft - 16, behavior: 'smooth' });
      }
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      markCategory();
    });
  }, { passive: true });
  markCategory();

  // "/" jumps to search, like most directories.
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
    e.preventDefault();
    input.focus();
    input.select();
  });
})();
