// Turns the submit form into steps. Without this script the form is one long page and still works.
(function () {
  'use strict';

  var form = document.querySelector('.sub-form');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.sub-step'));
  var ids = steps.map(function (s) { return s.dataset.step; });
  var tabs = Array.prototype.slice.call(form.querySelectorAll('.step-tab'));
  var bar = form.querySelector('.step-bar span');
  var stepError = form.querySelector('.step-error');
  var serverError = form.querySelector('[data-server-error]');
  var backBtn = form.querySelector('[data-back]');
  var nextBtn = form.querySelector('[data-next]');
  var submitBtn = form.querySelector('.order-submit');
  var review = form.querySelector('[data-review]');
  var catInputs = Array.prototype.slice.call(form.querySelectorAll('input[name=category]'));

  var current = 0;
  // Steps pushed onto the browser history, so Back can use history.back() without leaving the page.
  var depth = 0;
  // Furthest step the visitor has reached; tabs up to it can be clicked.
  var reached = 0;

  var $ = function (sel, root) { return (root || form).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || form).querySelectorAll(sel)); };
  var val = function (name) { var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; };
  var checkedVals = function (name) { return $$('input[name="' + name + '"]:checked').map(function (i) { return i.value; }); };
  // Hidden by category or feature, not just on another step.
  var visible = function (el) { return !el.closest('[hidden]:not(.sub-step)'); };

  function catKey() {
    var c = $('input[name=category]:checked');
    return c ? c.dataset.key : '';
  }

  // Shows only the questions for the chosen category, and the address fields for ticked features.
  function applyCategory() {
    var key = catKey();
    $$('[data-cats]').forEach(function (el) {
      el.hidden = !!key && el.dataset.cats.split(' ').indexOf(key) === -1;
    });
    var pick = $('.sub-pickfirst');
    if (pick) pick.hidden = !!key;
    applyFeatures();
  }

  function applyFeatures() {
    $$('.feat-link').forEach(function (el) {
      var box = form.querySelector('#feat-' + el.className.match(/feat-link-(\w+)/)[1]);
      el.hidden = !(box && box.checked && visible(box));
    });
  }

  // ---------- validation, mirrors the server ----------

  var ONION = /^(?:https?:\/\/)?((?:[a-z0-9-]+\.)*[a-z2-7]{56}\.onion)(\/\S*)?$/i;
  var I2P = /^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+i2p)(\/\S*)?$/i;
  var HANDLE = /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|x\.com|twitter\.com)\/([A-Za-z0-9_]{2,32})\/?$|^@?([A-Za-z0-9_]{2,32})$/i;

  function isUrl(v) {
    if (!v) return false;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
      var u = new URL(v);
      return u.protocol === 'https:' && u.hostname.indexOf('.') > 0 && !/[\s"'<>`]/.test(v);
    } catch (e) {
      return false;
    }
  }

  function has(feature) {
    var box = form.querySelector('#feat-' + feature);
    return box && box.checked && visible(box);
  }

  var RULES = {
    category: function () {
      return catKey() ? null : ['category', 'Pick the category your service belongs in.'];
    },
    basics: function () {
      if (val('name').length < 2) return ['name', 'Enter the name of your service.'];
      if (!isUrl(val('website'))) return ['website', 'Enter the full https:// address of your website.'];
      if (val('summary').length < 20) return ['summary', 'Describe your service in one sentence (at least 20 characters).'];
      return null;
    },
    details: function () {
      var cat = $('input[name=category]:checked');
      if (cat && cat.value === 'exchanges') {
        if (!checkedVals('kinds').length) return ['kinds', 'Pick at least one way your exchange works.'];
        if (!checkedVals('kyc').length) return ['kyc', 'Exchanges need a KYC score. Pick the one that fits your service.'];
      }
      if (has('tor') && !ONION.test(val('onion'))) return ['onion', 'You ticked Tor: paste your .onion address (56 characters before .onion).'];
      if (has('i2p') && !I2P.test(val('i2p'))) return ['i2p', 'You ticked I2P: paste your .i2p or .b32.i2p address.'];
      if (has('opensource') && !isUrl(val('source'))) return ['source', 'You ticked Open source: paste the https:// link to your code (GitHub, Codeberg…).'];
      return null;
    },
    links: function () {
      if (val('x') && !HANDLE.test(val('x'))) return ['x', 'Enter an X username like @yourname or an x.com link.'];
      if (val('tgchannel') && !HANDLE.test(val('tgchannel'))) return ['tgchannel', 'Enter a Telegram channel like @yourchannel or a t.me link.'];
      if (val('nostr') && !/^(?:nostr:)?npub1[a-z0-9]{20,100}$/i.test(val('nostr'))) return ['nostr', 'Enter your Nostr public key, starting with npub1.'];
      if (val('matrix') && !/^[#@!][^\s:]+:[a-z0-9.-]+\.[a-z]{2,}$/i.test(val('matrix')) && !isUrl(val('matrix'))) return ['matrix', 'Enter a Matrix room like #room:server.org or a matrix.to link.'];
      if (val('otherlink') && !isUrl(val('otherlink'))) return ['otherlink', 'Enter the full https:// address of the page.'];
      return null;
    },
    contact: function () {
      if (val('telegram') && !HANDLE.test(val('telegram'))) return ['telegram', 'Enter a Telegram username like @yourname or a t.me link.'];
      if (val('simplex') && !(isUrl(val('simplex')) && /simplex/i.test(val('simplex')))) return ['simplex', 'Paste your SimpleX contact or group link (https://simplex.chat/…).'];
      if (val('email') && !/^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(val('email'))) return ['email', 'That email address does not look right.'];
      if (!val('telegram') && !val('simplex') && !val('email')) return ['telegram', 'Leave at least one way to reach you: Telegram, SimpleX or email.'];
      return null;
    },
  };

  function clearErrors() {
    stepError.hidden = true;
    if (serverError) serverError.hidden = true;
    $$('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
  }

  function showError(err) {
    stepError.querySelector('span').textContent = err[1];
    stepError.hidden = false;
    var target = $('[data-field="' + err[0] + '"]');
    if (!target) return;
    var mark = target.querySelector('.cat-picks, .opt-picks, .grade-picks') || target;
    mark.classList.add('is-invalid');
    var input = target.querySelector('input:not([type=radio]):not([type=checkbox]), textarea');
    if (input) input.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function check(i) {
    var rule = RULES[ids[i]];
    return rule ? rule() : null;
  }

  // ---------- moving between steps ----------

  function show(i, opts) {
    opts = opts || {};
    current = i;
    reached = Math.max(reached, i);
    steps.forEach(function (s, n) {
      s.classList.toggle('is-current', n === i);
      s.hidden = n !== i;
    });
    tabs.forEach(function (t, n) {
      t.classList.toggle('is-current', n === i);
      t.classList.toggle('is-done', n < i || (n <= reached && n !== i && !check(n)));
      t.disabled = n > reached;
      if (n === i) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
    });
    if (bar) bar.style.width = ((i + 1) / steps.length) * 100 + '%';
    backBtn.hidden = i === 0;
    nextBtn.hidden = i === steps.length - 1;
    submitBtn.hidden = i !== steps.length - 1;
    if (ids[i] === 'review') buildReview();
    var tab = tabs[i];
    if (tab && tab.scrollIntoView && tab.parentNode.parentNode.scrollWidth > tab.parentNode.parentNode.clientWidth) {
      tab.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    if (opts.push !== false && location.hash !== '#' + ids[i]) {
      history.pushState({ step: i }, '', '#' + ids[i]);
      depth++;
    }
    if (opts.scroll !== false) {
      var top = form.getBoundingClientRect().top + window.scrollY - 70;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  // Goes to step i, checking every step before it on the way.
  function go(i) {
    clearErrors();
    for (var n = current; n < i; n++) {
      var err = check(n);
      if (err) {
        if (n !== current) show(n);
        showError(err);
        return false;
      }
    }
    show(i);
    var first = steps[i].querySelector('input:not([type=radio]):not([type=checkbox]), textarea');
    if (first && i > current && window.matchMedia('(min-width: 900px)').matches) first.focus({ preventScroll: true });
    return true;
  }

  // ---------- review ----------

  function el(tag, cls, s) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (s != null) e.textContent = s;
    return e;
  }

  function labelOf(input) {
    var f = input.closest('.sub-field');
    var l = f && f.querySelector('.sub-label');
    return l ? l.textContent.replace(/\s*optional$/, '').trim() : input.name;
  }

  function pickedLabels(block) {
    return $$('input:checked', block).filter(visible).map(function (i) {
      var s = i.parentNode.querySelector('strong') || i.nextElementSibling;
      return (i.name === 'kyc' ? i.value + ' · ' : '') + s.textContent.trim();
    });
  }

  function buildReview() {
    review.replaceChildren();
    steps.forEach(function (step, i) {
      if (step.dataset.step === 'review') return;
      var rows = [];
      if (step.dataset.step === 'category') {
        var c = $('input[name=category]:checked');
        if (c) rows.push(['Category', c.parentNode.querySelector('strong').textContent]);
      } else {
        $$('.sub-block, .sub-field', step).forEach(function (block) {
          if (!visible(block)) return;
          if (block.classList.contains('sub-block')) {
            var picks = block.querySelector('.opt-picks, .grade-picks, .seg-picks, .feat-picks');
            if (!picks) return;
            var label = block.querySelector('.sub-label');
            var picked = pickedLabels(picks);
            if (picked.length) rows.push([label.firstChild.textContent.trim(), picked.join(', ')]);
            return;
          }
          var input = block.querySelector('input, textarea');
          if (input && input.value.trim()) rows.push([labelOf(input), input.value.trim()]);
        });
      }
      var card = el('div', 'review-card');
      var head = el('div', 'review-head');
      head.appendChild(el('strong', null, tabs[i].querySelector('.step-label').textContent));
      var edit = el('button', 'btn btn-sm', 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', function () { clearErrors(); show(i); });
      head.appendChild(edit);
      card.appendChild(head);
      if (rows.length) {
        var dl = el('dl');
        rows.forEach(function (r) {
          var row = el('div');
          row.appendChild(el('dt', null, r[0]));
          row.appendChild(el('dd', null, r[1]));
          dl.appendChild(row);
        });
        card.appendChild(dl);
      } else {
        card.appendChild(el('p', 'review-empty', 'Nothing added.'));
      }
      review.appendChild(card);
    });
  }

  // ---------- wiring ----------

  form.classList.add('is-stepped');
  $$('.sub-step').forEach(function (s) { s.removeAttribute('hidden'); });
  applyCategory();

  catInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      applyCategory();
      clearErrors();
      // Picking a category is the whole step, so move on by itself.
      if (current === 0) setTimeout(function () { go(1); }, 180);
    });
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'features') applyFeatures();
    var f = e.target.closest('[data-field]');
    if (f) {
      f.classList.remove('is-invalid');
      $$('.is-invalid', f).forEach(function (x) { x.classList.remove('is-invalid'); });
    }
  });
  form.addEventListener('input', function (e) {
    var f = e.target.closest('.sub-field.is-invalid');
    if (f) f.classList.remove('is-invalid');
    if (e.target.name === 'summary') count(e.target);
  });

  var counter = $('[data-count=summary]');
  function count(input) {
    var n = input.value.trim().length;
    counter.textContent = n < 20 ? (20 - n) + ' more characters needed.' : n + ' / 200 characters.';
    counter.classList.toggle('is-ok', n >= 20);
  }
  if (counter && form.elements.summary.value) count(form.elements.summary);

  nextBtn.addEventListener('click', function () { go(current + 1); });
  backBtn.addEventListener('click', function () {
    clearErrors();
    if (depth > 0) return history.back();
    show(current - 1, { push: false });
    history.replaceState(null, '', '#' + ids[current]);
  });
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      if (i <= current) { clearErrors(); show(i); } else go(i);
    });
  });

  // Enter in a text field moves on instead of sending half a form.
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || current === steps.length - 1) return;
    e.preventDefault();
    go(current + 1);
  });

  form.addEventListener('submit', function (e) {
    clearErrors();
    for (var n = 0; n < steps.length; n++) {
      var err = check(n);
      if (err) {
        e.preventDefault();
        show(n);
        showError(err);
        return;
      }
    }
    submitBtn.disabled = true;
    submitBtn.querySelector('span').firstChild.textContent = 'Sending…';
  });

  // Coming back to this page from the browser's back cache must not leave the button stuck on "Sending…".
  var submitLabel = submitBtn.querySelector('span').firstChild.textContent;
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    submitBtn.disabled = false;
    submitBtn.querySelector('span').firstChild.textContent = submitLabel;
  });

  // The phone's back button walks back through the steps.
  window.addEventListener('popstate', function () {
    var i = ids.indexOf(location.hash.slice(1));
    depth = Math.max(0, depth - 1);
    clearErrors();
    show(i >= 0 && i <= reached ? i : 0, { push: false });
  });

  // First view: the step a server error points at, or the start.
  var start = ids.indexOf(form.dataset.start);
  if (serverError) {
    reached = steps.length - 1;
    history.replaceState({ step: start }, '', '#' + ids[start]);
    show(start, { push: false, scroll: false });
    var bad = form.querySelector('.is-invalid');
    if (bad) bad.scrollIntoView({ block: 'center' });
  } else {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    show(0, { push: false, scroll: false });
  }
})();
