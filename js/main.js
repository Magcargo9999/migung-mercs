// 부팅: 도트 로드 → 저장 불러오기 또는 새 게임
(function () {
  var G = window.G;
  G.UI.bind();
  G.A.load(function () {
    document.getElementById('boot').hidden = true;
    document.getElementById('app').hidden = false;
    var S = G.W.load();
    if (S) { G.S = S; G.UI.tab = S.exp ? 'expedition' : 'roster'; G.UI.render(); }
    else G.UI.newGameScreen();
  }, function (p) {
    document.getElementById('bootbar').style.width = Math.round(p * 100) + '%';
    document.getElementById('boottxt').textContent = '도트 불러오는 중… ' + Math.round(p * 100) + '%';
  });
  window.addEventListener('beforeunload', function () { if (G.S) G.W.save(G.S); });
  // 키보드: 전투 Enter=스킵/결과 · 1·2·3=배속 / 창 숫자=버튼, Enter=확인(주 버튼), Esc=취소·닫기 / 탭 숫자 / 탐험 Enter=첫 방
  window.addEventListener('keydown', function (ev) {
    if (!G.S || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var tg = ev.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    var $ = function (id) { return document.getElementById(id); }, k = ev.key;
    var br = $('battle-root');
    if (!br.hidden) {
      var done = br.querySelector('[data-bdone]');
      if (k === 'Enter' || k === ' ') { ev.preventDefault(); if (done && !done.disabled) done.click(); else { var sk = br.querySelector('[data-bskip]'); if (sk) sk.click(); } }
      else if (k === '1' || k === '2' || k === '3') { var sp = br.querySelector('[data-bs="' + [1, 2, 4][+k - 1] + '"]'); if (sp) sp.click(); }
      return;
    }
    var roots = $('modal-root').children;
    if (roots.length) {
      var bg = roots[roots.length - 1], acts = [].slice.call(bg.querySelectorAll('.acts button')), body = [].slice.call(bg.querySelectorAll('.mb button:not([disabled])'));
      if (/^[1-8]$/.test(k)) { ev.preventDefault(); var list = body.length ? body : acts, t = list[+k - 1]; if (t && !t.disabled) t.click(); }
      else if (k === 'Enter') { ev.preventDefault(); var pr = bg.querySelector('.acts button.primary:not([disabled])') || acts.filter(function (b) { return !b.disabled; })[0]; if (pr) pr.click(); }
      else if (k === 'Escape') { var cx = acts.filter(function (b) { return /취소|닫기/.test(b.textContent); })[0] || (acts.length === 1 ? acts[0] : null); if (cx) cx.click(); }
      return;
    }
    if ($('app').hidden) return;
    var n = parseInt(k, 10), T = G.UI.TABS;
    if (n >= 1 && n <= 9) { G.UI.tab = T[n - 1][0]; G.UI.render(); }
    else if (k === '0') { G.UI.tab = T[9][0]; G.UI.render(); }
    else if (k === 'Enter' && G.UI.tab === 'expedition' && G.S.exp) { var r = document.querySelector('[data-act=room]'); if (r) { ev.preventDefault(); r.click(); } else { var d = document.querySelector('[data-act=descend]:not([disabled])'); if (d) d.click(); } }
    else if (k === 'Enter' && G.UI.tab === 'expedition' && !G.S.exp) { var es = document.querySelector('[data-act=expStart]:not([disabled])'); if (es) es.click(); }
    else if (k === 'i' || k === 'I') { G.UI.tab = 'inbox'; G.UI.render(); }
    else if (k === 'n' || k === 'N') { var nd = document.querySelector('[data-act=nextDay]:not([disabled])'); if (nd) nd.click(); }
    else if (k === 'm' || k === 'M') { var nw = document.querySelector('[data-act=nextWeek]:not([disabled])'); if (nw) nw.click(); }
  });
})();
