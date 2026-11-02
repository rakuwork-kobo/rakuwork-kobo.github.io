/* ヘアサロン 見本（架空）— 動きのための小さなスクリプト（defer で読み込む）
   - 外へは何も送らず、何も読み込まない（CSP script-src 'self'）。HTML の文字列は使わない。
   - このファイルが動かなくても、中身はすべて読める。隠すのは html に rv-on を付けたあと、
     まだ画面に入っていない物だけ（最初から見えている物は隠さない）。
   - 見本の確かめ用に ?d=2026-11-17 で「今日」を変えて見られる（カレンダーはその日の月と次の月）。 */
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

  /* お休みのカレンダー：今日（日本時間）の月と次の月の表を作り、今日に丸を付け、今日が営業日かを一行で。
     HTML に書いてある表は JS が動かないときの控え。動いたら中身を差し替える（文字は textContent だけ）。
     休みの決まり：毎週月曜・第3火曜・年末年始 12/30〜1/4。祝日（振替休日を含む）は下の一覧（2026〜2028年）。 */
  var HOL = {
    2026: { '0101': '元日', '0112': '成人の日', '0211': '建国記念の日', '0223': '天皇誕生日', '0320': '春分の日', '0429': '昭和の日',
      '0503': '憲法記念日', '0504': 'みどりの日', '0505': 'こどもの日', '0506': '振替休日', '0720': '海の日', '0811': '山の日',
      '0921': '敬老の日', '0922': '国民の休日', '0923': '秋分の日', '1012': 'スポーツの日', '1103': '文化の日', '1123': '勤労感謝の日' },
    2027: { '0101': '元日', '0111': '成人の日', '0211': '建国記念の日', '0223': '天皇誕生日', '0321': '春分の日', '0322': '振替休日',
      '0429': '昭和の日', '0503': '憲法記念日', '0504': 'みどりの日', '0505': 'こどもの日', '0719': '海の日', '0811': '山の日',
      '0920': '敬老の日', '0923': '秋分の日', '1011': 'スポーツの日', '1103': '文化の日', '1123': '勤労感謝の日' },
    2028: { '0101': '元日', '0110': '成人の日', '0211': '建国記念の日', '0223': '天皇誕生日', '0320': '春分の日', '0429': '昭和の日',
      '0503': '憲法記念日', '0504': 'みどりの日', '0505': 'こどもの日', '0717': '海の日', '0811': '山の日', '0918': '敬老の日',
      '0922': '秋分の日', '1009': 'スポーツの日', '1103': '文化の日', '1123': '勤労感謝の日' }
  };
  var W = ['日', '月', '火', '水', '木', '金', '土'];
  function pad(v) { return (v < 10 ? '0' : '') + v; }

  /* その日の決まり：off=休み、why=休みの理由、hol=祝日の名前 */
  function dayInfo(y, m, d) {
    var wd = new Date(y, m - 1, d).getDay();
    var hol = (HOL[y] || {})[pad(m) + pad(d)] || '';
    var why = '';
    if (m === 12 && d >= 30) why = '年末の休み';
    else if (m === 1 && d <= 4) why = '年始の休み';
    else if (wd === 2 && d >= 15 && d <= 21) why = '第3火曜の休み';
    else if (wd === 1) why = '休み';
    return { wd: wd, off: !!why, why: why, hol: hol };
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function monthCells(y, m, todayIso) {
    var frag = document.createDocumentFragment();
    var last = new Date(y, m, 0).getDate();
    for (var d = 1; d <= last; d++) {
      var k = dayInfo(y, m, d);
      var cls = [];
      if (k.wd === 0) cls.push('sun'); else if (k.wd === 6) cls.push('sat');
      if (d === 1) cls.push('s' + (k.wd + 1));
      if (k.off) cls.push('off');
      if (k.hol) cls.push('hol');
      var iso = y + '-' + pad(m) + '-' + pad(d);
      if (iso === todayIso) cls.push('is-today');
      var li = el('li', cls.join(' '));
      li.setAttribute('data-date', iso);
      li.appendChild(el('span', 'cal-d', String(d)));
      var say = '';
      if (k.off) {
        var mk = el('span', 'cal-mark', '休');
        mk.setAttribute('aria-hidden', 'true');
        li.appendChild(mk);
        say = k.why + (k.hol ? '・' + k.hol : '');
      } else if (k.hol) {
        say = k.hol + '・9:00〜18:00';
      }
      if (say) li.appendChild(el('span', 'visually-hidden', '（' + say + '）'));
      frag.appendChild(li);
    }
    return frag;
  }

  function calendar() {
    var cal = document.getElementById('cal');
    var line = document.getElementById('cal-today');
    if (!cal || !line) return;
    /* 今日：?d=YYYY-MM-DD があればその日（見本の確かめ用）、なければ日本時間の今日 */
    var t = null;
    var q = new URLSearchParams(location.search).get('d');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) {
      var p = q.split('-');
      var c = new Date(+p[0], +p[1] - 1, +p[2]);
      if (c.getFullYear() === +p[0] && c.getMonth() === +p[1] - 1 && c.getDate() === +p[2]) t = c;
    }
    if (!t) {
      try {
        var f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
        t = new Date(+f[0], +f[1] - 1, +f[2]);
      } catch (e) { t = new Date(); }
    }
    var y = t.getFullYear(), m = t.getMonth() + 1, d = t.getDate();
    var todayIso = y + '-' + pad(m) + '-' + pad(d);

    /* 2か月分の表を作って差し替える（今月が1つ目のタブ） */
    var months = [[y, m], m === 12 ? [y + 1, 1] : [y, m + 1]];
    for (var i = 0; i < 2; i++) {
      var n = i + 1;
      var radio = document.getElementById('cal-m' + n);
      var label = cal.querySelector('label[for="cal-m' + n + '"]');
      var title = document.getElementById('cal-p' + n + '-h');
      var grid = document.querySelector('#cal-p' + n + ' .cal-grid');
      if (!radio || !label || !title || !grid) return;
      var my = months[i][0], mm = months[i][1];
      label.textContent = mm + '月';
      title.textContent = my + '年' + mm + '月';
      var cells = monthCells(my, mm, todayIso);
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      grid.appendChild(cells);
    }
    /* 今月を、動かさずに開いておく（戻るでフォームの状態が残っていても今月から） */
    var r1 = document.getElementById('cal-m1');
    if (!r1.checked) {
      cal.classList.add('no-tr'); r1.checked = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { cal.classList.remove('no-tr'); }); });
    }

    var k = dayInfo(y, m, d);
    var b = document.createElement('b');
    var rest;
    if (k.off) { b.textContent = 'お休み'; rest = 'です。'; line.classList.add('is-off'); }
    else { b.textContent = '営業日'; rest = (k.wd === 0 || k.wd === 6 || k.hol) ? '　9:00〜18:00' : '　10:00〜19:00'; line.classList.add('is-open'); }
    while (line.firstChild) line.removeChild(line.firstChild);
    line.appendChild(document.createTextNode('今日 ' + m + '月' + d + '日（' + W[k.wd] + '）は '));
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
