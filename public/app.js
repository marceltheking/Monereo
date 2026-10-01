(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var menu = document.querySelector('.menu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      // A tap on the dimmed backdrop lands on the <details> itself.
      if (e.target.closest('a') || e.target === menu) menu.open = false;
    });
    document.addEventListener('click', function (e) {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
  }

  // Anonymous click counts on category and listing pages; the directory script does this on the homepage.
  if (!document.getElementById('dir-q')) {
    var brand = document.querySelector('.brand');
    var eventUrl = (brand ? brand.getAttribute('href') : '/').replace(/\/$/, '') + '/api/e';
    var noteClick = function (e) {
      if (e.type === 'auxclick' && e.button !== 1) return;
      var a = e.target.closest && e.target.closest('a[data-stat]');
      if (!a || !navigator.sendBeacon) return;
      try {
        navigator.sendBeacon(eventUrl, JSON.stringify({ t: 'click', id: a.getAttribute('data-stat') }));
      } catch (err) { /* counting never gets in the way */ }
    };
    document.addEventListener('click', noteClick);
    document.addEventListener('auxclick', noteClick);
  }

  var navLinks =Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.dataset.nav); })
    .filter(function (el, i, all) { return el && all.indexOf(el) === i; });

  function markNav() {
    var current = sections[0];
    var line = window.innerHeight * 0.35;
    sections.forEach(function (el) {
      if (el.getBoundingClientRect().top <= line) current = el;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', !!current && a.dataset.nav === current.id);
    });
  }

  if (sections.length) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        markNav();
      });
    }, { passive: true });
    markNav();
  }
})();
