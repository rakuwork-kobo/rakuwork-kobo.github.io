/* 最初に一度だけ：動く版か、止めた版（静かな版）かを決める（色や形が出る前に・軽く） */
(function () {
  var d = document.documentElement, q = new URLSearchParams(location.search);
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var still = q.get('static') === '1' || (reduce && q.get('motion') !== '1');
  d.classList.remove('nojs');
  d.classList.add(still ? 'still' : 'motion');
  if (reduce) d.classList.add('reduced');
  if (q.get('nogl') === '1') d.classList.add('nogl');
})();
