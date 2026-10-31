/* 最初に一度だけ：動く版か、止めた版（静かな版）かを決める（色や形が出る前に・軽く） */
(function () {
  var d = document.documentElement, q = new URLSearchParams(location.search);
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var still = q.get('static') === '1' || (reduce && q.get('motion') !== '1');
  d.classList.remove('nojs');
  d.classList.add(still ? 'still' : 'motion');
  if (reduce && q.get('motion') !== '1') d.classList.add('reduced');
  if (q.get('nogl') === '1') d.classList.add('nogl');
  // 文字の形（本文 Noto Sans JP・見出し Shippori Mincho、このページで使う字だけ）は、最初の絵を止めないように後から
  ['data-font', 'data-font-b'].forEach(function (k) {
    var f = d.getAttribute(k);
    if (f) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = f; document.head.appendChild(l); }
  });
})();
