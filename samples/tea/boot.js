/* 最初に一度だけ：動きを出すか、止めた版にするかを決める（色や形が出る前に） */
(function () {
  var d = document.documentElement, q = new URLSearchParams(location.search);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && q.get('motion') !== '1';
  var gl = false;
  try {
    var c = document.createElement('canvas');
    var x = c.getContext('webgl2') || c.getContext('webgl');
    gl = !!x;
    if (x) { var l = x.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); }
  } catch (e) { gl = false; }
  if (q.get('nogl') === '1') gl = false;
  d.classList.remove('nojs');
  d.classList.add(reduce || q.get('static') === '1' ? 'still' : 'motion');
  if (!gl) d.classList.add('nogl');
  if (reduce) d.classList.add('reduced');
})();
