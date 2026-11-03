/* あさまど珈琲（架空）— 「今日開いているか・何時まで」を出す小さなスクリプト（defer で読み込む）
   - 外へは何も送らず、何も読み込まない（CSP script-src 'self'）。HTML の文字列は使わず、textContent だけで書く。
   - このファイルが動かなくても、営業時間・お休み・臨時のお休みはページにそのまま書いてある。
   - お休みの決まり：月曜と第3火曜（このファイルの isRegularOff）。臨時のお休みは、ページの
     「臨時のお休み」の一覧（#off-days の li の data-from／data-to）を読む。直すのは一覧の1か所だけ。
   - 時刻は日本の時刻（Asia/Tokyo）で見る。
   - 見本の確かめ用に ?d=2026-11-17T09:30 で「今」を変えられる（使ったときは画面にその旨を出す）。 */
(function () {
  'use strict';
  var OPEN = 8 * 60, LAST = 17 * 60 + 30, CLOSE = 18 * 60, MORNING_END = 10 * 60 + 30;
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var testing = false;

  /* 今の日付と時刻（日本の時刻）。d は日付だけの Date（端末の時刻帯で 0時）、t は 0時からの分 */
  function now() {
    var m = /[?&]d=(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(location.search);
    if (m) {
      testing = true;
      return { d: new Date(+m[1], +m[2] - 1, +m[3]), t: (m[4] ? +m[4] : 12) * 60 + (m[5] ? +m[5] : 0) };
    }
    var p = {};
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    } catch (e) { p = null; }
    if (p && p.year) return { d: new Date(+p.year, +p.month - 1, +p.day), t: (+p.hour % 24) * 60 + (+p.minute) };
    var n = new Date();
    return { d: new Date(n.getFullYear(), n.getMonth(), n.getDate()), t: n.getHours() * 60 + n.getMinutes() };
  }
  function key(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? +m[1] * 10000 + +m[2] * 100 + +m[3] : 0;
  }
  /* 臨時のお休み：[{from, to, text}] */
  var extra = [];
  function readExtra() {
    var list = document.querySelectorAll('#off-days li');
    Array.prototype.forEach.call(list, function (li) {
      var f = parse(li.getAttribute('data-from')), t = parse(li.getAttribute('data-to')) || f;
      if (f) extra.push({ from: f, to: t, text: li.textContent.replace(/\s+/g, ' ').trim(), li: li });
    });
  }
  function extraOff(d) {
    var k = key(d);
    for (var i = 0; i < extra.length; i++) if (k >= extra[i].from && k <= extra[i].to) return extra[i];
    return null;
  }
  function isRegularOff(d) {
    var w = d.getDay(), n = d.getDate();
    return w === 1 || (w === 2 && n >= 15 && n <= 21);
  }
  function isOff(d) { return isRegularOff(d) || !!extraOff(d); }
  function label(d) { return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）'; }
  function nextOpen(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    for (var i = 0; i < 30; i++) {
      x.setDate(x.getDate() + 1);
      if (!isOff(x)) return x;
    }
    return null;
  }
  function set(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }

  function today() {
    var box = document.getElementById('today');
    if (!box) return;
    readExtra();
    var c = now(), d = c.d, t = c.t;
    var state, main, sub, nx, ex = extraOff(d);
    set('today-date', '今日 ' + label(d) + (testing ? '（確かめ用の日時）' : ''));
    if (isOff(d)) {
      state = 'off'; main = '今日はお休みです';
      nx = nextOpen(d); sub = nx ? '次は ' + label(nx) + ' の 8:00 から開けます。' : '';
      if (ex) sub = '臨時のお休み（' + ex.text + '）。' + sub;
      else if (d.getDay() === 2) sub = '第3火曜のお休みです。' + sub;
    } else if (t < OPEN) {
      state = 'soon'; main = '8:00 から開きます';
      sub = '今日は 18:00 まで（ご注文は 17:30 まで）。朝の時間のセットは 10:30 までです。';
    } else if (t < LAST) {
      state = 'open'; main = '営業中　18:00 まで';
      sub = t < MORNING_END ? 'ご注文は 17:30 まで。朝の時間のセットは 10:30 までです。' : 'ご注文は 17:30 までです。';
    } else if (t < CLOSE) {
      state = 'last'; main = 'まもなく閉店です（18:00）';
      sub = 'ご注文は 17:30 で終わりました。豆のお持ち帰りは 18:00 までお受けします。';
    } else {
      state = 'done'; main = '今日の営業は終わりました';
      nx = nextOpen(d); sub = nx ? '次は ' + label(nx) + ' の 8:00 から開けます。' : '';
    }
    box.setAttribute('data-state', state);
    set('today-main', main);
    set('today-sub', sub);

    /* 過ぎた臨時のお休みの行は、一覧から見えなくする */
    extra.forEach(function (e) { if (e.to < key(d)) e.li.classList.add('is-past'); });

    /* この先14日のうちに臨時のお休みがあれば、「今日」の欄に一行で出す */
    var k0 = key(d), end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 14), k1 = key(end);
    for (var i = 0; i < extra.length; i++) {
      var e = extra[i];
      if (e.to >= k0 && e.from <= k1 && !(ex && ex === e)) {
        var note = document.getElementById('today-notice');
        if (note) { note.textContent = 'お知らせ：臨時のお休み　' + e.text; note.hidden = false; }
        e.li.classList.add('is-soon');
        break;
      }
    }

    /* 営業日の表：今日の行に印。今日がお休み（第3火曜・臨時）なら、その行を「今日はお休み」に */
    var row = document.querySelector('#week tr[data-day="' + d.getDay() + '"]');
    if (row) {
      row.classList.add('is-today');
      var th = row.querySelector('th'), td = row.querySelector('td');
      if (th) {
        var tag = document.createElement('span');
        tag.className = 'today-tag';
        tag.textContent = '今日';
        th.appendChild(tag);
      }
      if (isOff(d) && !row.classList.contains('off') && td) {
        row.classList.add('off');
        td.textContent = ex ? '今日は臨時のお休み' : '今日はお休み（第3火曜）';
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', today);
  else today();
})();
