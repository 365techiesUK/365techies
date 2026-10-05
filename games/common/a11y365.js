/*
 * The website's own accessibility choices reach the games (games audit, 5 Oct 2026; critic: "Text size", "High
 * contrast" and "Reduce motion" set on the Games page did nothing once a game opened). /js/a11y.js keeps them in
 * localStorage as tt_a11y = { text: 0-3, contrast, readable, reduce }; this file reads the same record on every game
 * page and the games' Settings can change it (so a choice made in either place holds in both).
 *
 * Text size: the sheets, the messages and the game-over boxes grow (CSS zoom, kept inside the screen), and the cards'
 * corner index grows a step. High contrast: solid black-edged cards, black messages, outlined buttons. Reduce motion:
 * the engines treat it exactly like the phone's or computer's own "reduce motion" (no flying cards, no fireworks), and
 * every CSS animation and transition is cut short.
 *
 * Load it BEFORE the engine (table.js / rivals.js / arcade.js); they ask A11y365.reduce() and call A11y365.mount() for
 * the Settings row. Without this file they behave as before.
 */
(function () {
  'use strict';
  var KEY = 'tt_a11y', root = document.documentElement, Z = [1, 1.15, 1.3, 1.45];
  function get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function put(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function apply() {
    var s = get(), t = Math.max(0, Math.min(3, +s.text || 0));
    root.classList.remove('a11y-text-1', 'a11y-text-2', 'a11y-text-3');
    if (t) root.classList.add('a11y-text-' + t);
    root.classList.toggle('a11y-contrast', !!s.contrast);
    root.classList.toggle('a11y-reduce', !!s.reduce);
  }
  var css = '';
  [1, 2, 3].forEach(function (t) {
    var z = Z[t], p = '.a11y-text-' + t + ' ';
    // a sheet grows but stays inside the screen (its own size limits are divided by the zoom)
    css += [p + '.sheet', p + '.gs-sheet', p + '.hf-sheet', p + '.jy-sheet', p + '.lk-sheet'].join(',')
      + '{zoom:' + z + ';max-width:calc((100vw - 24px) / ' + z + ');max-height:calc((100vh - 24px) / ' + z + ')}';
    css += p + '#toast{zoom:' + z + '}' + p + '.ovbox{zoom:' + z + ';max-width:calc((100vw - 24px) / ' + z + ')}';
    css += p + '.idx{font-size:calc(var(--cw) * ' + (0.32 + 0.025 * t).toFixed(3) + ')}' + p + '.sui{font-size:calc(var(--cw) * ' + (0.29 + 0.02 * t).toFixed(3) + ')}';
  });
  css += '.a11y-contrast .card .front{box-shadow:0 0 0 2px #000,0 2px 6px rgba(0,0,0,.55)!important}'
    + '.a11y-contrast .idx,.a11y-contrast .sui,.a11y-contrast .su2{text-shadow:none!important;font-weight:800}'
    + '.a11y-contrast #toast{background:#000!important;color:#fff!important;outline:3px solid #fff;opacity:1!important}'
    + '.a11y-contrast .tb{outline:2px solid rgba(255,255,255,.85);outline-offset:-2px}'
    + '.a11y-contrast .sheet,.a11y-contrast .gs-sheet{background:#fff!important;color:#000!important}'
    + '.a11y-contrast .chip,.a11y-contrast .rv-plate{background:#000!important;color:#fff!important;outline:2px solid #fff}'
    + '.a11y-reduce *,.a11y-reduce *::before,.a11y-reduce *::after{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important;scroll-behavior:auto!important}'
    + '.a11y365{margin:14px 0 4px;padding-top:12px;border-top:1px solid rgba(127,127,127,.25)}'
    + '.a11y365 .a11y-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;margin:8px 0}'
    + '.a11y365 .a11y-seg{display:flex;gap:6px}.a11y365 .a11y-seg button,.a11y365 .a11y-tog{min-width:52px;min-height:44px;padding:0 12px;border-radius:12px;border:2px solid rgba(127,127,127,.4);background:transparent;color:inherit;font:700 16px/1 Archivo,sans-serif;cursor:pointer}'
    + '.a11y365 .a11y-seg button[aria-pressed="true"],.a11y365 .a11y-tog[aria-checked="true"]{background:#1f7a45;border-color:#1f7a45;color:#fff}';
  var st = document.createElement('style'); st.textContent = css; (document.head || root).appendChild(st);
  apply();
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(); });   // changed on another page or tab

  // the Settings row: Text size (four steps), High contrast, Less movement (the last needs a reload to take full hold -
  // the cards' movement is decided when the game starts - so the switch says so)
  function mount(into, opt) {
    opt = opt || {};
    if (!into || into.querySelector('.a11y365')) return;
    var box = document.createElement('div'); box.className = 'a11y365';
    box.innerHTML = '<div class="a11y-row"><b>Text size</b><div class="a11y-seg" role="group" aria-label="Text size">'
      + ['A', 'A+', 'A++', 'A+++'].map(function (l, i) { return '<button type="button" data-a11y-text="' + i + '" aria-label="' + ['Normal', 'Large', 'Larger', 'Largest'][i] + ' text">' + l + '</button>'; }).join('') + '</div></div>'
      + '<div class="a11y-row"><b>High contrast</b><button type="button" class="a11y-tog" role="switch" data-a11y="contrast">Off</button></div>'
      + '<div class="a11y-row"><span><b>Less movement</b><br><small>' + (opt.reduceText || 'Cards jump instead of flying') + '</small></span><button type="button" class="a11y-tog" role="switch" data-a11y="reduce">Off</button></div>';
    var foot = into.querySelector('.foot'), close = into.querySelector('.row:last-child');   // (before the made-by line - critic 4)
    into.insertBefore(box, foot && foot.parentNode === into ? foot : close && close.parentNode === into ? close : null);
    function show() {
      var s = get();
      [].forEach.call(box.querySelectorAll('[data-a11y-text]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-a11y-text') === (+s.text || 0))); });
      [].forEach.call(box.querySelectorAll('[data-a11y]'), function (b) { var on = !!s[b.getAttribute('data-a11y')]; b.setAttribute('aria-checked', String(on)); b.textContent = on ? 'On' : 'Off'; });
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      var s = get();
      if (b.hasAttribute('data-a11y-text')) s.text = +b.getAttribute('data-a11y-text');
      else { var k = b.getAttribute('data-a11y'); s[k] = !s[k]; }
      put(s); apply(); show();
      if (b.getAttribute('data-a11y') === 'reduce' && window.A11y365.onReduce) window.A11y365.onReduce(!!s.reduce);
    });
    show();
  }
  window.A11y365 = {
    get: get, apply: apply, mount: mount, onReduce: null,
    reduce: function () { return !!get().reduce || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  };
})();
