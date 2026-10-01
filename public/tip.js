(function () {
  'use strict';

  // One floating popup for every [data-tip] element, including ones added later (new search results).
  // It lives on <body>, so tables and collapsing panels with hidden overflow can't cut it off.
  var pop = document.createElement('div');
  pop.className = 'tip-pop';
  pop.setAttribute('role', 'tooltip');
  pop.hidden = true;
  document.body.appendChild(pop);
  var current = null;

  function place(el) {
    var r = el.getBoundingClientRect();
    var w = pop.offsetWidth;
    var h = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    var above = r.top - h - 10;
    var below = above < 8;
    pop.style.left = left + 'px';
    pop.style.top = (below ? r.bottom + 10 : above) + 'px';
    pop.classList.toggle('is-below', below);
    pop.style.setProperty('--arrow', (r.left + r.width / 2 - left) + 'px');
  }

  function show(el) {
    // The browser's own title tooltip would double up with ours.
    el.removeAttribute('title');
    current = el;
    pop.textContent = el.dataset.tip;
    pop.hidden = false;
    place(el);
  }

  function hide() {
    current = null;
    pop.hidden = true;
  }

  var tipOf = function (e) { return e.target.closest && e.target.closest('[data-tip]'); };

  document.addEventListener('mouseover', function (e) {
    var el = tipOf(e);
    if (el && el !== current) show(el);
  });
  document.addEventListener('mouseout', function (e) {
    var el = tipOf(e);
    if (el && el === current && !el.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('focusin', function (e) {
    var el = tipOf(e);
    if (el) show(el);
  });
  document.addEventListener('focusout', function (e) {
    if (tipOf(e) === current) hide();
  });
  document.addEventListener('click', function (e) {
    var el = tipOf(e);
    if (!el) return hide();
    e.stopPropagation();
    if (current === el && !pop.hidden) hide();
    else show(el);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', function () { if (current) place(current); }, { passive: true, capture: true });
  window.addEventListener('resize', function () { if (current) place(current); });
})();
