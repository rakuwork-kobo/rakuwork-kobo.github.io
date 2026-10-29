/* ヘアサロン 見本（架空）— 動きのための小さなスクリプト（defer で読み込む）
   - 外へは何も送らず、何も読み込まない（CSP script-src 'self'）。HTML の文字列は使わない。
   - このファイルが動かなくても、中身はすべて読める。隠すのは html に rv-on を付けたあと、
     まだ画面に入っていない物だけ（最初から見えている物は隠さない）。
   - 見本の確かめ用に ?d=2026-11-17 で「今日」を変えて見られる。 */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* iOS Safari で、押したときの :active の見た目を確実に出す */
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* スクロールで現れる物（CSS の .rv-on の一覧と同じ） */
  var REVEAL = '.section-head,.journal-head,.reserve-text,.pick,.menu-col,.story-text,.story-plan,.staff-photo,.staff-text,.note,.steps,.first-bottom,.styles,.cal,.faq-wrap,.reserve-ways,.access>div,.map';

  function reveal() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var els = Array.prototype.slice.call(document.querySelectorAll(REVEAL));
    var vh = window.innerHeight;
    var rest = [];
    /* 先に、いま見えている物へ .in を付ける（ちらつかないように）。読むのを全部すませてから書く */
    var tops = els.map(function (el) { return el.getBoundingClientRect().top; });
    els.forEach(function (el, i) { if (tops[i] < vh) el.classList.add('in'); else rest.push(el); });
    root.classList.add('rv-on');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px 40px 0px', threshold: 0 });
    rest.forEach(function (el) { io.observe(el); });
    /* 戻る・#付きで開いたとき、ブラウザがあとから位置を戻すので、いま見えている物を出しなおす */
    function showVisible() {
      var h = window.innerHeight;
      var hit = rest.filter(function (el) { var r = el.getBoundingClientRect(); return r.top < h && r.bottom > 0; });
      hit.forEach(function (el) { el.classList.add('in'); io.unobserve(el); });
    }
    window.addEventListener('pageshow', showVisible);
    window.addEventListener('load', showVisible);
  }


  /* スタイルの横送り：ボタンで1枚ずつ。見えている範囲を「1–4 / 5」の形で出す */
  function carousel() {
    var track = document.getElementById('styles');
    var nav = document.getElementById('styles-nav');
    var now = document.getElementById('styles-now');
    if (!track || !nav) return;
    var btns = nav.querySelectorAll('button');
    var cards = track.querySelectorAll('.style-card');
    var n = cards.length, stepW = 0, cardW = 0, viewW = 0, maxX = 0;
    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      cardW = cards[0].getBoundingClientRect().width;
      stepW = cardW + gap;
      viewW = track.clientWidth - (parseFloat(getComputedStyle(track).paddingLeft) || 0);
      maxX = track.scrollWidth - track.clientWidth - 2;
    }
    nav.hidden = false;
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        track.scrollBy({ left: stepW * Number(b.getAttribute('data-dir')), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    var last = '', wasStart = null, wasEnd = null, rz = false;
    function sync() {
      ticking = false;
      var x = track.scrollLeft;
      var first = Math.min(n, Math.round(x / stepW) + 1);
      var shown = Math.max(1, Math.floor((viewW + 8) / stepW));
      var lastIdx = x >= maxX ? n : Math.min(n, first + shown - 1);
      if (x >= maxX) first = Math.max(1, n - shown + 1);
      var label = first === lastIdx ? String(first) : first + '–' + lastIdx;
      var atStart = x <= 2, atEnd = x >= maxX;
      if (label !== last && now) { now.textContent = label; last = label; }
      if (atStart !== wasStart) { btns[0].setAttribute('aria-disabled', atStart ? 'true' : 'false'); wasStart = atStart; }
      if (atEnd !== wasEnd) { btns[1].setAttribute('aria-disabled', atEnd ? 'true' : 'false'); wasEnd = atEnd; }
    }
    var ticking = false;
    track.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }, { passive: true });
    window.addEventListener('resize', function () { if (!rz) { rz = true; requestAnimationFrame(function () { rz = false; measure(); sync(); }); } });
    measure();
    sync();
  }

  /* お休みのカレンダー：今日に丸を付け、今日が営業日かを一行で */
  function calendar() {
    var cal = document.getElementById('cal');
    var line = document.getElementById('cal-today');
    if (!cal || !line) return;
    var q = new URLSearchParams(location.search).get('d');
    var t;
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) { var p = q.split('-'); t = new Date(+p[0], +p[1] - 1, +p[2]); }
    else {
      try {
        var f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
        t = new Date(+f[0], +f[1] - 1, +f[2]);
      } catch (e) { t = new Date(); }
    }
    var pad = function (v) { return (v < 10 ? '0' : '') + v; };
    var iso = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    var W = ['日', '月', '火', '水', '木', '金', '土'];
    var cell = cal.querySelector('[data-date="' + iso + '"]');
    var wd = t.getDay(), m = t.getMonth() + 1, d = t.getDate();
    var off, hol = false;
    if (cell) {
      cell.classList.add('is-today');
      off = cell.classList.contains('off'); hol = cell.classList.contains('hol');
      /* 今日のある月を、動かさずに開いておく */
      if (iso.slice(5, 7) === '12') {
        var r = document.getElementById('cal-m12');
        if (r) {
          cal.classList.add('no-tr'); r.checked = true;
          requestAnimationFrame(function () { requestAnimationFrame(function () { cal.classList.remove('no-tr'); }); });
        }
      }
    } else {
      /* 表の外の日は、決まりから出す（毎週月曜・第3火曜・年末年始 12/30〜1/4 が休み） */
      off = wd === 1 || (wd === 2 && d >= 15 && d <= 21) || (m === 12 && d >= 30) || (m === 1 && d <= 4);
    }
    var b = document.createElement('b');
    var rest;
    if (off) { b.textContent = 'お休み'; rest = 'です。'; line.classList.add('is-off'); }
    else { b.textContent = '営業日'; rest = !cell ? 'です。' : (wd === 0 || wd === 6 || hol) ? '　9:00〜18:00' : '　10:00〜19:00'; line.classList.add('is-open'); }
    while (line.firstChild) line.removeChild(line.firstChild);
    line.appendChild(document.createTextNode('今日 ' + m + '月' + d + '日（' + W[wd] + '）は '));
    line.appendChild(b);
    line.appendChild(document.createTextNode(rest));
  }

  function init() {
    try { calendar(); } catch (e) { /* 表はそのまま読める */ }
    try { carousel(); } catch (e) { }
    try { reveal(); } catch (e) { root.classList.remove('rv-on'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
