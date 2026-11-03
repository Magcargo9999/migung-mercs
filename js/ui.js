// 화면 (DOM). 메뉴·목록은 DOM, 전투·방 장면은 Canvas
var G = window.G = window.G || {};
G.UI = { tab: 'roster', sel: null, pick: null, qsel: {}, unlockTactics: false, anim: 0 };
var D = G.D;
var $ = function (id) { return document.getElementById(id); };
var E = G.esc;

// ───── 공용 조각 ─────
G.UI.stars = function (v) {
  var s = '', full = Math.floor(v), half = v - full >= 0.5;
  for (var i = 0; i < 5; i++) s += i < full ? '★' : (i === full && half ? '<span class="h">★</span>' : '<span class="h">☆</span>');
  return '<span class="stars">' + s + '</span>';
};
G.UI.bar = function (p, color, w) { return '<div class="bar" style="width:' + (w || 100) + '%"><i style="width:' + Math.round(G.clamp(p, 0, 1) * 100) + '%;background:' + color + '"></i></div>'; };
G.UI.traitTag = function (t, m) {
  var T = D.TRAITS[t]; if (!T) return '';
  var cls = T.type === 'unique' ? 'unique' : T.type === 'race' ? 'race' : T.type === 'special' ? 'special' : T.type === 'growth' ? 'growth' : T.type === 'quirk' ? 'quirk' : 'general';
  if (T.pts < 0 || T.neg) cls += ' neg';
  var lock = m && T.type === 'quirk' && G.Social.isLocked(m, t);
  return '<span class="tag ' + cls + '" data-tip="' + E(T.name + (T.type === 'quirk' ? ' (성향' + (lock ? ', 고정됨' : '') + ')' : '') + '\n' + T.desc) + '">' + (lock ? '🔒 ' : '') + E(T.name) + '</span>';
};
G.UI.traits = function (m) { return G.M.allTraits(m).map(function (t) { return G.UI.traitTag(t, m); }).join(''); };
G.UI.itemName = function (it) { if (!it) return '<span class="dim">비어 있음</span>'; return '<span class="g' + it.grade + '" data-tip="' + E('[' + D.GRADES[it.grade].name + '] ' + it.name + ' (아이템 레벨 ' + it.ilvl + ')\n' + G.I.desc(it)) + '">' + (it.unique ? '★' : '') + E(it.name) + '</span>'; };
G.UI.mercName = function (m) { return E(m.name) + (m.founder ? ' <span class="tag special">창립</span>' : ''); };
G.UI.caText = function (m) { return Math.round(G.M.ca(m)); };
G.UI.statusText = function (m) {
  if (m.status === 'expedition') return '<span class="blue">원정 중</span>';
  if (m.injuries.some(function (j) { return j.sev >= 2; })) return '<span class="bad">중상</span>';
  if (m.injuries.length) return '<span class="bad">경상</span>';
  if (m.training.slot) return '<span class="good">훈련</span>';
  return '<span class="dim">휴식</span>';
};
G.UI.tenBar = function (v, w) { return '<div class="bar tenbar" style="width:' + (w || 100) + '%" data-tip="긴장 ' + G.round1(v) + ' / 20\n8: 주의 · 12: 위험(명령 불복종·패닉) · 16: 한계(전투 중 붕괴 또는 미덕)"><i style="width:' + Math.round(G.clamp(v / 20, 0, 1) * 100) + '%;background:' + G.UI.tenColor(v) + '"></i><u style="left:40%"></u><u style="left:60%"></u><u style="left:80%"></u></div>'; };
G.UI.tenColor = function (t) { return t >= 14 ? '#e05a4a' : t >= 9 ? '#e0a04a' : '#7ab0d0'; };

// ───── 메인 렌더 ─────
G.UI.render = function () {
  var S = G.S; if (!S) return;
  G.UI.renderTop(); G.UI.renderTabs();
  var v = $('view'), fn = G.UI['view_' + G.UI.tab];
  v.innerHTML = fn ? fn() : '';
  G.UI.afterRender();
  G.UI.checkModals();
};
G.UI.commit = function () { G.W.save(G.S); G.UI.render(); };
G.UI.renderTop = function () {
  var S = G.S, F = G.W.fameTier(S), nf = D.FAME[G.W.fameIdx(S) + 1];
  var inExp = !!S.exp;
  $('top').innerHTML = '<span class="gname">' + E(S.guild) + '</span>' +
    '<span class="date">' + (S.ended ? '10년 종료' : G.dateText(S.day) + ' <span class="dim small">(남은 ' + Math.max(0, G.TOTAL_YEARS - G.W.year(S) + 1) + '년)</span>') + '</span>' +
    '<div class="res"><span>골드 <b>' + G.fmt(S.gold) + '</b></span><span>마석 <b>' + S.stones + '</b></span><span>약초 <b>' + S.herbs + '</b></span>' +
    '<span data-tip="' + E(F.desc + (nf ? '\n다음 등급(' + nf.t + ')까지 ' + (nf.pts - S.fame) + '점\n모집 CA 구간 ' + F.ca[0] + '~' + F.ca[1] : '')) + '">명성 <b>' + F.t + '</b> <span class="dim">(' + S.fame + ')</span></span>' +
    (S.infamy ? '<span class="bad" data-tip="악명이 명성의 절반을 넘으면 모집 풀이 어두운 배경(해적·흑마법사·광전사 등) 위주로 바뀐다">악명 ' + S.infamy + '</span>' : '') +
    '<span>최고 <b>' + S.deepest + '층</b></span>' + (S.heroTitle ? '<span class="gold">용사: ' + E(S.heroTitle.by === 'player' ? S.guild : S.heroTitle.by) + '</span>' : '') + '</div>' +
    '<span class="grow"></span>' +
    '<button data-act="nextDay" ' + (inExp || S.ended ? 'disabled' : '') + '>다음 날</button>' +
    '<button data-act="nextWeek" ' + (inExp || S.ended ? 'disabled' : '') + ' data-tip="주간 정산까지 진행: 훈련 성장, 주급, 상점 교체, 라이벌 진행">다음 주까지</button>' +
    '<button data-act="settings">설정</button>';
};
G.UI.TABS = [['roster', '용병단'], ['recruit', '모집'], ['training', '훈련장'], ['tactics', '전술판'], ['expedition', '미궁'], ['facilities', '길드 시설'], ['shop', '상점'], ['quests', '의뢰'], ['storage', '창고'], ['records', '기록'], ['inbox', '알림']];
G.UI.renderTabs = function () {
  var S = G.S;
  $('tabs').innerHTML = G.UI.TABS.map(function (t) {
    var b = '';
    if (t[0] === 'recruit' && S.applicants.length) b = '<span class="badge">' + S.applicants.length + '</span>';
    if (t[0] === 'expedition' && S.exp) b = '<span class="badge">!</span>';
    if (t[0] === 'quests' && S.quests.length) b = '<span class="badge">' + S.quests.length + '</span>';
    if (t[0] === 'inbox' && G.Social.unread(S)) b = '<span class="badge">' + Math.min(99, G.Social.unread(S)) + '</span>';
    return '<button class="' + (G.UI.tab === t[0] ? 'on' : '') + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + b + '</button>';
  }).join('');
};
G.UI.afterRender = function () {
  if (G.UI.tab === 'inbox') { clearTimeout(G.UI._rt); G.UI._rt = setTimeout(function () { if (G.S && G.UI.tab === 'inbox') { G.S.inbox.forEach(function (n) { n.read = true; }); G.UI.renderTabs(); } }, 1200); }
  G.UI.drawPortraits();
  document.querySelectorAll('canvas[data-radar]').forEach(function (c) { var m = G.W.merc(G.S, c.dataset.radar) || G.S.applicants.filter(function (a) { return a.id === c.dataset.radar; })[0]; if (m) G.UI.radar(c, m); });
  var sc = document.querySelector('canvas.scene');
  if (sc && G.S.exp) G.V.scene(sc, G.S, G.X.partyMercs(G.S), G.S.exp.zone, performance.now());
};
G.UI.findMerc = function (id) {
  var S = G.S;
  return G.W.merc(S, id) || S.applicants.filter(function (a) { return a.id === id; })[0] || (S.dead.filter(function (d) { return d.merc.id === id; })[0] || {}).merc;
};
G.UI.drawPortraits = function () {
  var t = performance.now();
  document.querySelectorAll('canvas[data-port]').forEach(function (c) { var m = G.UI.findMerc(c.dataset.port); if (m) G.A.portrait(c, m, G.S, t); });
};
setInterval(function () { if (G.S && G.A.ready) { G.UI.drawPortraits(); var sc = document.querySelector('canvas.scene'); if (sc && G.S.exp && $('battle-root').hidden) G.V.scene(sc, G.S, G.X.partyMercs(G.S), G.S.exp.zone, performance.now()); } }, 300);

G.UI.radar = function (c, m) {
  var ctx = c.getContext('2d'), W = c.width, H = c.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 40;
  ctx.clearRect(0, 0, W, H);
  var st = D.STATS, n = st.length;
  ctx.strokeStyle = 'rgba(200,170,110,0.25)'; ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach(function (k) { ctx.beginPath(); for (var i = 0; i <= n; i++) { var a = -Math.PI / 2 + i / n * Math.PI * 2; var x = cx + Math.cos(a) * R * k, y = cy + Math.sin(a) * R * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
  ctx.beginPath();
  st.forEach(function (s, i) { var a = -Math.PI / 2 + i / n * Math.PI * 2, v = G.clamp(m.stats[s] / 20, 0, 1); var x = cx + Math.cos(a) * R * v, y = cy + Math.sin(a) * R * v; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.closePath(); ctx.fillStyle = 'rgba(181,138,224,0.35)'; ctx.fill(); ctx.strokeStyle = '#c9a0ff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '11px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  st.forEach(function (s, i) { var a = -Math.PI / 2 + i / n * Math.PI * 2; ctx.fillStyle = D.PHYS.indexOf(s) >= 0 ? '#e9c98a' : '#a9c8f0'; ctx.fillText(D.STAT_NAME[s], cx + Math.cos(a) * (R + 15), cy + Math.sin(a) * (R + 12)); });
};

// ───── 모달 ─────
G.UI.modal = function (title, body, buttons, opts) {
  opts = opts || {};
  var root = $('modal-root'), bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = '<div class="modal" style="' + (opts.wide ? 'max-width:1000px' : '') + '"><h2>' + title + '</h2><div class="mb">' + body + '</div><div class="acts"></div></div>';
  var acts = bg.querySelector('.acts');
  (buttons || [{ t: '확인' }]).forEach(function (b, bi) {
    var btn = document.createElement('button'); btn.innerHTML = (bi < 8 ? '<span class="kb">' + (bi + 1) + '</span>' : '') + b.t; if (b.cls) btn.className = b.cls; if (b.dis) btn.disabled = true;
    btn.onclick = function () { if (b.keep) { b.fn && b.fn(bg); return; } root.removeChild(bg); b.fn && b.fn(); };
    acts.appendChild(btn);
  });
  root.appendChild(bg);
  if (opts.after) opts.after(bg);
  return bg;
};
G.UI.toast = function (t) { G.UI.modal('알림', '<pre>' + E(t) + '</pre>'); };
G.UI.res = function (r) { if (r && r.ok === false && r.text) G.UI.toast(r.text); return r; };
G.UI.checkModals = function () {
  var S = G.S;
  if ($('modal-root').children.length || !$('battle-root').hidden) return;
  if (G.UI.tab === 'inbox') S.inbox.forEach(function (n) { n.pop = false; });
  var pops = S.exp ? [] : S.inbox.filter(function (n) { return n.pop; });
  if (pops.length && !S.pendingEval && !(S.retireRequests && S.retireRequests.length)) {
    pops.forEach(function (n) { n.pop = false; });
    var top = pops.slice().sort(function (a, b) { return b.imp - a.imp; }).slice(0, 6);
    G.UI.modal('새 소식 ' + pops.length + '건', top.map(function (n) { return '<div class="note ' + n.s + ' big" style="margin-bottom:6px"><div class="row"><span class="nk">' + D.NOTE_KIND[n.k] + '</span><b>' + E(n.t) + '</b></div><div class="small">' + E(n.x) + '</div></div>'; }).join('') + (pops.length > 6 ? '<div class="small dim">외 ' + (pops.length - 6) + '건은 알림 센터에서 볼 수 있다.</div>' : ''), [{ t: '확인', cls: 'primary', fn: function () { G.UI.render(); } }, { t: '알림 센터', fn: function () { G.UI.tab = 'inbox'; G.UI.render(); } }]);
    return;
  }
  if (S.pendingEval) { var ev = S.pendingEval; S.pendingEval = null; G.UI.evalModal(ev); return; }
  if (S.retireRequests && S.retireRequests.length) {
    var id = S.retireRequests[0], m = G.W.merc(S, id);
    S.retireRequests = S.retireRequests.slice(1);
    if (m && m.status === 'guild') G.UI.modal('은퇴 희망', E(m.name) + '(' + m.age + '세)이(가) 은퇴를 원한다. 노화로 육체 능력이 계속 떨어지는 중이다.', [{ t: '은퇴를 허락한다', fn: function () { G.W.retire(S, id); G.UI.commit(); } }, { t: '조금만 더 함께하자', fn: function () { G.UI.render(); } }]);
    return;
  }
  if (S.ended && !S.endShown) { S.endShown = true; G.UI.endModal(); }
};
G.UI.evalModal = function (ev) {
  var p = ev.parts;
  var html = '<div class="row"><span style="font-size:42px;color:var(--gold2);font-weight:800">' + ev.grade + '</span><span>총점 <b>' + ev.total + '</b></span><span class="dim">' + ev.year + '년차</span></div>' +
    '<table class="t"><tr><th>항목</th><th>점수</th><th>내용</th></tr>' +
    '<tr><td>미궁 진행</td><td>' + p.floor + ' / 30</td><td>' + ev.floorFrom + '층 → ' + ev.floorTo + '층</td></tr>' +
    '<tr><td>재정</td><td>' + p.gold + ' / 20</td><td>순수익 ' + G.fmt(ev.profit) + 'G</td></tr>' +
    '<tr><td>성장</td><td>' + p.grow + ' / 20</td><td>잔류 용병 평균 CA +' + ev.gainCA + '</td></tr>' +
    '<tr><td>생존</td><td>' + p.live + ' / 15</td><td>전사 ' + ev.deaths + '명</td></tr>' +
    '<tr><td>도감·명성</td><td>' + p.codex + ' / 15</td><td></td></tr>' +
    ev.goals.map(function (g) { return '<tr><td>올해의 요구</td><td>' + (g.done ? '+10' : '0') + '</td><td>' + (g.done ? '<span class="good">달성</span> ' : '<span class="bad">미달</span> ') + E(g.text) + '</td></tr>'; }).join('') +
    (ev.fstory ? '<tr><td>창립 멤버 서사</td><td>+10</td><td class="good">완료</td></tr>' : '') + '</table>' +
    '<p>올해의 용병: <b>' + E(ev.bestName) + '</b></p>' +
    '<p class="gold">보상: 명성 +' + ev.reward.fame + ', 후원금 ' + G.fmt(ev.reward.gold) + 'G' + (ev.reward.bonus === 'paFloor' ? ', 내년 공고 지원자 일부 잠재력 100 이상 보장' : ev.reward.bonus === 'slot' ? ', 내년 주간 공고 +1회' : '') + '</p>' +
    (G.S.yearData ? '<h3>' + G.S.yearData.year + '년차 왕국의 요구</h3>' + G.S.yearData.goals.map(function (g) { return '<div>· ' + E(g.text) + '</div>'; }).join('') : '');
  G.UI.modal('연말 길드 평가', html, [{ t: '새해를 맞는다', cls: 'primary', fn: function () { G.UI.commit(); } }]);
};
G.UI.endModal = function () {
  var S = G.S, f = G.W.merc(S, S.founderId), fd = S.dead.filter(function (d) { return d.merc.founder; })[0];
  var html = '<p>' + E(S.guild) + '의 10년이 끝났다.</p>' +
    '<div class="kv"><div><span>최고 층</span>' + S.deepest + '층</div><div><span>명성</span>' + G.W.fameTier(S).t + '</div><div><span>전사자</span>' + S.dead.length + '명</div><div><span>은퇴</span>' + S.retired.length + '명</div></div>' +
    '<p>용사 칭호: ' + (S.heroTitle ? (S.heroTitle.by === 'player' ? '<b class="gold">' + E(S.guild) + '</b>' : E(S.heroTitle.by)) : '아무도 얻지 못했다') + '</p>' +
    '<p>창립 멤버: ' + (f ? E(f.name) + ' — 생존, CA ' + Math.round(G.M.ca(f)) : fd ? E(fd.merc.name) + ' — ' + E(fd.cause) + '에서 잠들었다' : '-') + '</p>' +
    '<h3>연말 평가 기록</h3>' + S.evals.map(function (e) { return '<span class="pill">' + e.year + '년차 ' + e.grade + ' (' + e.total + ')</span> '; }).join('') +
    '<p class="dim small">계속 둘러볼 수 있지만 시간은 더 흐르지 않는다.</p>';
  G.UI.modal('10년의 기록', html, [{ t: '닫기' }]);
};

// ───── 용병단 ─────
G.UI.view_roster = function () {
  var S = G.S;
  if (!G.UI.sel || !G.W.merc(S, G.UI.sel)) G.UI.sel = S.roster[0] ? S.roster[0].id : null;
  var list = S.roster.map(function (m) {
    return '<div class="mcard ' + (m.id === G.UI.sel ? 'sel' : '') + '" data-act="sel" data-id="' + m.id + '"><canvas width="48" height="56" data-port="' + m.id + '"></canvas>' +
      '<div class="grow"><div class="nm">' + G.UI.mercName(m) + '</div><div class="sub">' + D.RACES[m.race].name + ' ' + D.CLASSES[m.cls].name + ' · ' + m.age + '세 · CA ' + G.UI.caText(m) + '</div>' +
      '<div class="row small">' + G.UI.statusText(m) + '<span class="dim">긴장</span><span style="width:60px">' + G.UI.tenBar(m.ten) + '</span>' + (m.story && !m.story.done ? '<span class="tag" data-tip="개인 서사 진행 중">📜</span>' : '') + '</div></div></div>';
  }).join('');
  var cap = G.W.rosterCap(S);
  return '<div class="split"><div><div class="row" style="margin-bottom:6px"><b>로스터 ' + S.roster.length + ' / ' + cap + '</b><span class="dim small">주급 합계 ' + G.sum(S.roster.map(G.M.wage)) + 'G/주</span></div><div class="mlist">' + list + '</div></div>' +
    '<div>' + (G.UI.sel ? G.UI.detail(G.W.merc(S, G.UI.sel), true) : '<div class="panel">용병이 없다. 모집 탭에서 공고를 올리자.</div>') + '</div></div>';
};
G.UI.statRow = function (m, s) {
  var C = D.CLASSES[m.cls], R = D.RACES[m.race], v = m.stats[s], eff = G.M.stat(m, s);
  var cls = 'st' + (C.core.indexOf(s) >= 0 ? ' core' : '');
  var gm = G.M.growthMul(m, s);
  if (gm > 1.01) cls += ' up'; else if (gm < 0.99) cls += ' down';
  var tip = D.STAT_NAME[s] + ': ' + D.STAT_DESC[s] + '\n기본 ' + G.round1(v) + (Math.abs(eff - v) > 0.05 ? ' / 적용 ' + G.round1(eff) : '') + '\nCA 가중치 ×' + G.M.weight(m.cls, s) + ' · 성장 보정 ×' + G.round1(gm * 100) / 100 + (['cns', 'luk', 'gen'].indexOf(s) >= 0 ? '\n훈련 불가 (타고남)' : '');
  return '<div class="' + cls + '" data-tip="' + E(tip) + '"><span class="n">' + D.STAT_NAME[s] + '</span>' + G.UI.bar(eff / 20, '') + '<b>' + Math.floor(eff) + '</b></div>';
};
G.UI.detail = function (m, own) {
  var S = G.S, C = D.CLASSES[m.cls], d = G.M.derive(m), sc = G.M.scout(m, S.buildings.office, m.weeksKnown || 0);
  var ca = G.M.ca(m), used = G.M.usedCA(m);
  var injDiag = S.buildings.infirmary >= 2 ? (m.inj >= 15 ? '<span class="bad">부상이 매우 잦을 체질</span>' : m.inj >= 11 ? '<span class="bad">부상에 다소 취약</span>' : m.inj <= 6 ? '<span class="good">튼튼한 체질</span>' : '보통') : '<span class="dim">? (의무실 2단계에서 진단)</span>';
  var h = '<div class="panel"><div class="detail"><div><canvas class="port" width="200" height="220" data-port="' + m.id + '"></canvas>' +
    '<div style="margin-top:6px"><canvas class="radar" width="240" height="240" data-radar="' + m.id + '" style="width:200px;height:200px"></canvas></div></div><div>' +
    '<div class="row"><h2 style="margin:0">' + G.UI.mercName(m) + '</h2><span class="pill">' + D.RACES[m.race].name + '</span><span class="pill">' + C.name + (C.tier === 2 ? ' (상위)' : '') + '</span><span class="pill">' + m.age + '세</span>' + (own ? G.UI.statusText(m) : '') + '</div>' +
    '<div class="row" style="margin:6px 0"><span data-tip="현재 능력(CA): 직업 가중치로 계산한 스탯 총합 (1~200)">CA <b class="gold" style="font-size:18px">' + Math.round(ca) + '</b> ' + G.UI.stars(G.M.stars(ca)) + '</span>' +
    '<span data-tip="' + E('잠재력(PA)은 숫자로 보이지 않는다. 스카우트 추정치이며 사무소 단계와 함께한 기간에 따라 정확해진다.\n특성 습득에 쓴 어빌: ' + G.M.traitCost(m)) + '">잠재력 추정 <b>' + sc.lo + '~' + sc.hi + '</b> ' + G.UI.stars(sc.stars) + '</span>' +
    '<span class="dim small">“' + E(sc.line) + '”</span></div>' +
    '<div class="row small"><span>주급 ' + G.M.wage(m) + 'G</span><span>호전성 ' + m.agg + '</span><span>부상 빈도 ' + injDiag + '</span>' + (m.changePenalty > 0 ? '<span class="bad">전직 적응 중 (' + m.changePenalty + '일)</span>' : '') + '</div>' +
    '<div class="row small" style="margin:4px 0"><span>긴장</span><span style="width:160px">' + G.UI.tenBar(m.ten) + '</span><span>' + G.round1(m.ten) + ' / 20</span></div>' +
    '<div style="margin:6px 0">' + G.UI.traits(m) + '</div>' +
    (G.Social.quirks(m).length ? '<div class="small" style="margin:3px 0"><span class="dim">성향(퀴크) — 긴장 한계를 겪고 굳어진 습관. 주점에서 제거·고정:</span> ' + G.Social.quirks(m).map(function (q) { return G.UI.traitTag(q, m); }).join('') + '</div>' : '') +
    '<div class="small dim">장점: ' + E(C.plus) + ' · 단점: ' + E(C.minus) + '</div>' +
    (m.injuries.length ? '<div class="bad small">부상: ' + E(G.M.injuryText(m)) + '</div>' : '') +
    (m.perm.length ? '<div class="bad small">영구 손상: ' + m.perm.map(function (p) { return E(p.name) + '(' + D.STAT_NAME[p.stat] + ' ' + p.val + ')'; }).join(', ') + '</div>' : '') +
    '<h3>신체·마법</h3><div class="stats">' + D.PHYS.map(function (s) { return G.UI.statRow(m, s); }).join('') + '</div>' +
    '<h3>멘탈·변수</h3><div class="stats">' + D.MENT.map(function (s) { return G.UI.statRow(m, s); }).join('') + '</div>' +
    '<h3>전투 수치</h3><div class="kv">' +
    [['HP', d.maxHp], ['물리 공격', G.round1(d.atk)], ['마법 공격', G.round1(d.mat)], ['물리 방어', G.round1(d.def)], ['마법 방어', G.round1(d.mdef)], ['명중', Math.round(d.hit) + '%'], ['회피', Math.round(d.eva) + '%'], ['치명타', Math.round(d.crit) + '%'], ['행동 속도', G.round1(d.spd)], ['자연 회복', G.round1(d.regen)], ['마나', Math.round(d.mp)], ['지구력', Math.round(d.staMax)]]
      .map(function (kv) { return '<div><span>' + kv[0] + '</span>' + kv[1] + '</div>'; }).join('') + '</div>' +
    (d.overload > 0 ? '<div class="bad small">장비 무게 초과 ' + G.round1(d.overload) + ' (회피·속도·지구력 페널티)</div>' : '') +
    '</div></div>';
  if (own) {
    h += '<h3>장비</h3><div class="equip">' + ['weapon', 'armor', 'acc'].map(function (sl) {
      return '<div class="slot"><div class="dim">' + { weapon: '무기', armor: '방어구', acc: '장신구' }[sl] + '</div>' + G.UI.itemName(m.equip[sl]) +
        '<div class="row" style="margin-top:4px"><button class="sm" data-act="equipOpen" data-id="' + m.id + '" data-slot="' + sl + '" ' + (m.status !== 'guild' ? 'disabled' : '') + '>교체</button>' + (m.equip[sl] ? '<button class="sm" data-act="unequip" data-id="' + m.id + '" data-slot="' + sl + '" ' + (m.status !== 'guild' ? 'disabled' : '') + '>해제</button>' : '') + '</div></div>';
    }).join('') + '</div>';
    h += '<h3>개별 전술 지시</h3><div class="row">' +
      '타겟 <select data-chg="tac" data-id="' + m.id + '" data-k="target">' + Object.keys(D.TARGETS).map(function (k) { return '<option value="' + k + '"' + (m.tactic.target === k ? ' selected' : '') + '>' + D.TARGETS[k] + '</option>'; }).join('') + '</select>' +
      '스킬 <select data-chg="tac" data-id="' + m.id + '" data-k="skill">' + Object.keys(D.SKILLFREQ).map(function (k) { return '<option value="' + k + '"' + (m.tactic.skill === k ? ' selected' : '') + '>' + D.SKILLFREQ[k] + '</option>'; }).join('') + '</select>' +
      '물약 <select data-chg="tac" data-id="' + m.id + '" data-k="potion">' + Object.keys(D.POTION).map(function (k) { return '<option value="' + k + '"' + (String(m.tactic.potion) === k ? ' selected' : '') + '>' + D.POTION[k] + '</option>'; }).join('') + '</select>' +
      '<span class="dim small">스킬: ' + C.skills.map(function (k) { return '<span class="tag" data-tip="' + E(D.SKILLS[k].desc + ' · 쿨타임 ' + D.SKILLS[k].cd + (D.SKILLS[k].mp ? ' · 마나 ' + D.SKILLS[k].mp : '')) + '">' + D.SKILLS[k].name + '</span>'; }).join('') + '</span></div>';
    // 관계 (서포트)
    var pts = G.Social.partners(S, m.id).filter(function (p) { return G.W.merc(S, p.id); }).slice(0, 5);
    h += '<h3>동료와의 관계 (서포트)</h3>' + (pts.length ? pts.map(function (p) { var o = G.W.merc(S, p.id), nx = D.BOND_RANK[p.rank + 1]; return '<div class="row small" style="margin-bottom:3px"><b style="min-width:78px">' + E(o.name) + '</b><span class="pill" data-tip="' + E(D.BOND_FX[p.rank] || '아직 효과 없음') + '">' + (D.BOND_NAME[p.rank] || '친분 쌓는 중') + '</span><span style="width:120px">' + G.UI.bar(nx ? p.b.p / nx : 1, p.rank >= 3 ? "#e9c98a" : "#9d7ad0") + '</span><span class="dim">' + Math.round(p.b.p) + (nx ? " / " + nx : " (최대)") + '</span>' + (G.Social.friction(m, o) ? '<span class="tag neg" data-tip="오랜 불편한 관계라 서포트가 절반 속도로 쌓이고 가끔 다툰다. 적응력 높은 동료가 있으면 완화된다.">불편한 사이</span>' : '') + (p.b.talks.length ? '<button class="sm" data-act="bondTalk" data-a="' + m.id + '" data-b="' + p.id + '">대화 ' + p.b.talks.length + '</button>' : '') + '</div>'; }).join('') : '<div class="small dim">함께 출전하고 살아남으면 서포트가 쌓인다. 인접 배치와 정예·보스 승리가 더 빠르다.</div>');
    // 서사
    if (m.story) {
      var St = D.STORIES[m.story.id], need = St.kind === 'kill' ? 40 : St.need;
      var pay = !m.story.done && (St.kind === 'payStones' || St.kind === 'payGold');
      h += '<h3>개인 서사 — ' + E(St.name) + (m.story.done ? ' <span class="good">완료</span>' : '') + '</h3><div class="small">' + E(St.goal) + '<br>보상: ' + E(St.reward) +
        (!m.story.done ? '<div class="row">' + G.UI.bar((m.story.prog || 0) / need, '#b58ae0', 40) + '<span>' + Math.round(m.story.prog || 0) + ' / ' + need + '</span>' + (St.kind === 'pupil' ? '<span class="dim">후배: ' + (m.story.pupil && G.W.merc(S, m.story.pupil) ? E(G.W.merc(S, m.story.pupil).name) : '다음 신입(23세 이하)') + '</span>' : '') +
          (pay ? '<button class="sm" data-act="payStory" data-id="' + m.id + '">' + (St.kind === 'payStones' ? '마석 납부' : '골드 송금 (최대 1000)') + '</button>' : '') + '</div>' : '') + '</div>';
    }
    // 전직
    h += '<h3>전직 (훈련장)</h3><div class="choices">' + D.CLASS_ORDER.filter(function (c) { return c !== m.cls; }).map(function (c) {
      var ok = G.M.canChange(m, c, S.buildings.training), after = Math.round(G.M.ca(m, c));
      return '<button class="sm" data-act="changeCls" data-id="' + m.id + '" data-c="' + c + '" ' + (!ok.ok || m.status !== 'guild' ? 'disabled' : '') + ' data-tip="' + E(D.CLASSES[c].name + (D.CLASSES[c].tier === 2 ? ' (상위 직업)' : '') + '\n성장 특화: ' + D.CLASSES[c].up.map(function (s) { return D.STAT_NAME[s]; }).join(', ') + ' / 저하: ' + D.CLASSES[c].down.map(function (s) { return D.STAT_NAME[s]; }).join(', ') + '\n장점: ' + D.CLASSES[c].plus + '\n단점: ' + D.CLASSES[c].minus + '\n전직 후 CA ' + after + ' (현재 ' + Math.round(ca) + ')' + (ok.ok ? '\n적응 기간 약 ' + G.M.changePenaltyDays(m) + '일' : '\n불가: ' + ok.why)) + '">' + D.CLASSES[c].name + ' <span class="dim">' + after + '</span></button>';
    }).join('') + '</div>';
    h += '<div class="row" style="margin-top:12px"><span class="dim small">합류 ' + G.dateText(m.hist.joined) + ' · 전투 ' + m.hist.battles + ' · 처치 ' + m.hist.kills + ' · 원정 ' + m.hist.expeditions + ' · 최심 ' + m.hist.deepest + '층 · 누적 주급 ' + m.hist.wagesPaid + 'G</span><span class="grow"></span>' +
      (m.founder ? '' : '<button class="sm danger" data-act="release" data-id="' + m.id + '" ' + (m.status !== 'guild' ? 'disabled' : '') + '>계약 해지</button>') + '</div>';
  }
  return h + '</div>';
};

// ───── 모집 ─────
G.UI.view_recruit = function () {
  var S = G.S, F = G.W.fameTier(S), lim = G.W.noticeLimit(S);
  var h = '<div class="panel"><div class="row"><h2 style="margin:0">모집 공고</h2><span>명성 <b>' + F.t + '</b> — 지원자 CA ' + F.ca[0] + '~' + F.ca[1] + ' (잠재력은 명성과 무관)</span><span class="grow"></span>' +
    '<span class="dim">이번 주 ' + S.notices + ' / ' + lim + '회</span><button class="primary" data-act="notice" ' + (S.notices >= lim ? 'disabled' : '') + '>공고 올리기 (' + G.W.noticeCost(S) + 'G)</button></div>' +
    '<div class="small dim" style="margin-top:4px">로스터 ' + S.roster.length + ' / ' + G.W.rosterCap(S) + ' · 지원자는 일주일 뒤 떠난다. 나이가 많을수록 최소 능력이 보장되지만 남은 잠재력이 적다.' + (G.W.infamous(S) ? ' <span class="bad">악명 때문에 어두운 배경의 지원자가 늘었다.</span>' : '') + '</div></div>';
  h += '<div class="cards" style="margin-top:10px">' + S.applicants.map(function (a) {
    var sc = G.M.scout(a, S.buildings.office, 0);
    return '<div class="panel"><div class="row"><canvas width="64" height="74" data-port="' + a.id + '" style="width:64px;height:74px;image-rendering:pixelated;background:#17131b;border-radius:5px"></canvas><div class="grow"><b>' + E(a.name) + '</b><div class="small">' + D.RACES[a.race].name + ' ' + D.CLASSES[a.cls].name + ' · ' + a.age + '세</div>' +
      '<div class="small">CA <b class="gold">' + G.UI.caText(a) + '</b> ' + G.UI.stars(G.M.stars(G.M.ca(a))) + '</div><div class="small">잠재력 ' + sc.lo + '~' + sc.hi + ' ' + G.UI.stars(sc.stars) + '</div></div></div>' +
      '<div class="small dim" style="margin:4px 0">스카우트: “' + E(sc.line) + '”</div><div>' + G.UI.traits(a) + '</div>' +
      (a.story ? '<div class="small purple">서사: ' + E(D.STORIES[a.story.id].name) + '</div>' : '') +
      '<div class="row" style="margin-top:6px"><span class="small">주급 ' + G.M.wage(a) + 'G · 계약금 ' + a.fee + 'G</span><span class="grow"></span><button class="sm" data-act="inspect" data-id="' + a.id + '">자세히</button><button class="sm primary" data-act="hire" data-id="' + a.id + '">영입</button></div></div>';
  }).join('') + '</div>';
  if (!S.applicants.length) h += '<div class="panel dim" style="margin-top:10px">지원자가 없다. 공고를 올리자.</div>';
  return h;
};

// ───── 훈련장 ─────
G.UI.view_training = function () {
  var S = G.S, lv = S.buildings.training, cap = G.W.trainingCap(S), n = S.roster.filter(function (m) { return m.training.slot; }).length;
  var progs = { combat: '전투 숙련 (직업 핵심)', body: '체력 단련', mind: '정신 수양', change: '전직 준비', custom: '맞춤 (최대 4개)' };
  var allowed = D.TRAINABLE[lv - 1];
  var slots = G.Social.coachSlots(S);
  var coachH = '<div class="panel" style="margin-bottom:10px"><div class="row"><h2 style="margin:0">코치진 (' + S.coaches.length + ' / ' + slots + ')</h2><span class="dim small">코치의 전문 분야 스탯 성장이 늘고, 강행 훈련 부상이 줄어든다. 주급은 매주 나간다.</span></div><div class="cards" style="margin-top:6px">' +
    S.coaches.map(function (c) { return '<div class="panel"><b>' + E(c.name) + '</b> <span class="gold">' + '★'.repeat(c.q) + '</span><div class="small">' + D.COACH[c.spec].name + ' · ' + c.age + '세 · 주급 ' + c.wage + 'G</div><div class="small good">' + G.Social.coachDesc(c) + '</div><div class="row" style="margin-top:4px"><span class="grow"></span><button class="sm danger" data-act="fireCoach" data-id="' + c.id + '">해고</button></div></div>'; }).join('') +
    (S.coaches.length < slots ? S.coachPool.map(function (c) { return '<div class="panel" style="opacity:.92"><b>' + E(c.name) + '</b> <span class="gold">' + '★'.repeat(c.q) + '</span> <span class="tag">지원자</span><div class="small">' + D.COACH[c.spec].name + ' · ' + c.age + '세 · 주급 ' + c.wage + 'G</div><div class="small good">' + G.Social.coachDesc(c) + '</div><div class="row" style="margin-top:4px"><span class="small dim">계약금 ' + c.wage * 4 + 'G</span><span class="grow"></span><button class="sm primary" data-act="hireCoach" data-id="' + c.id + '">영입</button></div></div>'; }).join('') : '<div class="small dim" style="align-self:center">자리가 가득 찼다. 훈련장을 증축하면 코치 자리가 늘어난다. (1단계 1명 / 2단계 2명 / 3단계 3명)</div>') + '</div></div>';
  var h = coachH + '<div class="panel"><div class="row"><h2 style="margin:0">훈련장 ' + lv + '단계</h2><span>성장 ×' + [1, 1.2, 1.4][lv - 1] + ' · 훈련 인원 ' + n + ' / ' + cap + '</span></div>' +
    '<div class="small" style="margin-top:4px">훈련 가능: ' + allowed.map(function (s) { return D.STAT_NAME[s]; }).join(', ') + ' <span class="dim">· 꾸준함·운·천재성은 타고나며 훈련할 수 없다</span></div>' +
    '<div class="small dim">주간 성장 = 0.25 × 시설 × 종족 보정 × 직업 보정 × 나이(~23세 ×1.5 / ~29세 ×1.25 / 30대 ×1.0 / 40대+ ×0.5, 40대부터 육체 스탯은 오르지 않음) × (1+꾸준함×0.02) × (1−CA÷잠재력) × 특성 × 강도. 훈련에 넣지 않은 용병은 휴식(긴장 회복↑).</div></div>';
  h += '<table class="t" style="margin-top:10px"><tr><th></th><th>용병</th><th>CA</th><th>훈련</th><th>프로그램</th><th>강도</th><th>대상 스탯</th><th>상태</th></tr>' + S.roster.map(function (m) {
    var stats = G.M.programStats(m, m.training.program, lv);
    var custom = m.training.program === 'custom' ? '<div class="choices">' + allowed.map(function (s) { var on = (m.training.custom || []).indexOf(s) >= 0; return '<button class="sm ' + (on ? 'on' : '') + '" data-act="custom" data-id="' + m.id + '" data-s="' + s + '">' + D.STAT_NAME[s] + '</button>'; }).join('') + '</div>' : '';
    var target = m.training.program === 'change' ? '<select data-chg="trainTarget" data-id="' + m.id + '">' + D.CLASS_ORDER.map(function (c) { return '<option value="' + c + '"' + (m.training.target === c ? ' selected' : '') + '>' + D.CLASSES[c].name + '</option>'; }).join('') + '</select>' : '';
    return '<tr><td><canvas width="36" height="42" data-port="' + m.id + '" style="width:36px;height:42px;image-rendering:pixelated"></canvas></td><td><a data-act="selGo" data-id="' + m.id + '" style="cursor:pointer">' + E(m.name) + '</a><div class="small dim">' + D.CLASSES[m.cls].name + ' · ' + m.age + '세' + (G.M.has(m, 'mentor') ? ' · 스승(본인 성장 정지)' : '') + '</div></td>' +
      '<td>' + G.UI.caText(m) + '</td><td><button class="sm ' + (m.training.slot ? 'on' : '') + '" data-act="train" data-id="' + m.id + '" ' + (m.status !== 'guild' ? 'disabled' : '') + '>' + (m.training.slot ? '훈련 중' : '휴식') + '</button></td>' +
      '<td><select data-chg="prog" data-id="' + m.id + '">' + Object.keys(progs).map(function (k) { return '<option value="' + k + '"' + (m.training.program === k ? ' selected' : '') + '>' + progs[k] + '</option>'; }).join('') + '</select>' + target + custom + '</td>' +
      '<td><select data-chg="inten" data-id="' + m.id + '"><option value="light"' + (m.training.intensity === 'light' ? ' selected' : '') + '>가벼움 ×0.7</option><option value="normal"' + (m.training.intensity === 'normal' ? ' selected' : '') + '>보통 ×1.0</option><option value="heavy"' + (m.training.intensity === 'heavy' ? ' selected' : '') + '>강행 ×1.4 (부상↑)</option></select></td>' +
      '<td class="small">' + (G.M.has(m, 'mentor') ? '<span class="dim">스승 — 본인 성장 정지</span>' : '') + stats.map(function (s) { if (G.M.isOld(m) && D.BODY.indexOf(s) >= 0) return D.STAT_NAME[s] + ' <span class="bad">노화로 불가</span>'; var k = 0.25 * [1, 1.2, 1.4][lv - 1] * G.M.growthMul(m, s) * G.M.ageFactor(m) * (1 + 0.02 * m.stats.cns) * G.M.room(m, s) * G.Social.coachMul(S, s); return D.STAT_NAME[s] + ' <span class="dim">+' + k.toFixed(2) + '</span>'; }).join(', ') + '</td>' +
      '<td>' + G.UI.statusText(m) + '</td></tr>';
  }).join('') + '</table>';
  return h;
};

// ───── 전술판 ─────
G.UI.party = function () {
  var S = G.S; S.tactics.party = (S.tactics.party || []).filter(function (id) { return G.W.merc(S, id); });
  if (!S.tactics.party.length) S.tactics.party = S.roster.filter(function (m) { return G.M.canFight(m); }).slice(0, 6).map(function (m) { return m.id; });
  return S.tactics.party;
};
// 출정 명단끼리 칸이 겹치지 않게 정리
G.UI.fixFormation = function () {
  var S = G.S, F = S.tactics.formation, used = {};
  G.UI.party().forEach(function (id) {
    var m = G.W.merc(S, id), f = F[id];
    if (f && !used[f.row + f.slot]) { used[f.row + f.slot] = 1; return; }
    var rows = [D.CLASSES[m.cls].row, 'mid', 'front', 'back'];
    for (var r = 0; r < rows.length; r++) for (var sl = 0; sl < 3; sl++) if (!used[rows[r] + sl]) { F[id] = { row: rows[r], slot: sl }; used[rows[r] + sl] = 1; return; }
  });
};
G.UI.view_tactics = function () {
  G.UI.fixFormation();
  var S = G.S, party = G.UI.party(), F = S.tactics.formation;
  var locked = !!S.exp && !G.UI.unlockTactics;
  var cells = ''; // 화면 기준: 왼쪽이 후열, 오른쪽이 전열(적 방향)
  for (var slot = 0; slot < 3; slot++) {
    ['back', 'mid', 'front'].forEach(function (row) {
      var id = party.filter(function (pid) { var f = F[pid]; return f && f.row === row && f.slot === slot; })[0];
      var m = id ? G.W.merc(S, id) : null;
      cells += '<div class="cell ' + row + (G.UI.pick && id === G.UI.pick ? ' pick' : '') + '" data-act="cell" data-row="' + row + '" data-slot="' + slot + '"><span class="lab">' + { front: '전열', mid: '중열', back: '후열' }[row] + '</span>' +
        (m ? '<canvas width="60" height="70" data-port="' + m.id + '"></canvas><div class="small">' + E(m.name.split(' ')[0]) + '</div><div class="small dim">' + D.CLASSES[m.cls].name + '</div>' : '<span class="dim small">빈 칸</span>') + '</div>';
    });
  }
  var h = '<div class="grid2"><div class="panel"><h2>진형 (최대 6명)</h2>' + (locked ? '<div class="notice">원정 중에는 야영지의 "전술 수정"에서만 바꿀 수 있다.</div>' : '<div class="small dim" style="margin-bottom:6px">칸을 눌러 용병을 고른 뒤 옮길 칸을 누른다. 오른쪽이 적 방향(전열)이다.</div>') +
    '<div class="board" style="' + (locked ? 'pointer-events:none;opacity:.6' : '') + '">' + cells + '</div>' +
    '<div class="small dim" style="margin-top:8px">전열: 적 물리 공격의 70%를 받는다, 근접 무기 정상 피해 · 중열: 창술사·도적·마검사는 정상 피해, 근접은 70% · 후열: 원거리·마법 (근접은 50%)</div>' +
    '<h3>출정 명단</h3><div class="choices">' + S.roster.map(function (m) { var on = party.indexOf(m.id) >= 0; return '<button class="sm ' + (on ? 'on' : '') + '" data-act="partyToggle" data-id="' + m.id + '" ' + (locked ? 'disabled' : '') + '>' + E(m.name) + ' <span class="dim">' + G.UI.caText(m) + '</span>' + (!G.M.canFight(m) ? ' <span class="bad">중상</span>' : '') + '</button>'; }).join('') + '</div></div>';
  h += '<div class="panel"><h2>부대 전술 지침</h2><div style="' + (locked ? 'pointer-events:none;opacity:.6' : '') + '">' +
    '<label>탐험 페이스</label><div class="choices">' + Object.keys(D.TEMPO).map(function (k) { return '<button class="sm ' + (S.tactics.tempo === k ? 'on' : '') + '" data-act="tempo" data-v="' + k + '" data-tip="' + E(D.TEMPO[k].desc) + '">' + D.TEMPO[k].name + '</button>'; }).join('') + '</div>' +
    '<label>교전 기조</label><div class="choices">' + Object.keys(D.ENGAGE).map(function (k) { return '<button class="sm ' + (S.tactics.engage === k ? 'on' : '') + '" data-act="engage" data-v="' + k + '" data-tip="' + E(D.ENGAGE[k].desc) + '">' + D.ENGAGE[k].name + '</button>'; }).join('') + '</div>' +
    '<label>주장 (리더십이 전술 수행력에 쓰인다)</label><select data-chg="leader">' + party.map(function (id) { var m = G.W.merc(S, id); return '<option value="' + id + '"' + (S.tactics.leader === id ? ' selected' : '') + '>' + E(m.name) + ' — 리더십 ' + Math.floor(G.M.stat(m, 'lea')) + (m.cls === 'knight' ? ' (+2 기사)' : '') + '</option>'; }).join('') + '</select>' +
    '<h3>개별 지시</h3><table class="t"><tr><th>용병</th><th>타겟</th><th>스킬</th><th>물약</th><th data-tip="(주장 리더십 + 팀워크 + 판단력) ÷ (긴장+1). 낮을수록 지시를 무시한다.">수행력</th></tr>' + party.map(function (id) {
      var m = G.W.merc(S, id), lead = G.W.merc(S, S.tactics.leader);
      var score = ((lead ? G.M.stat(lead, 'lea') + (lead.cls === 'knight' ? 2 : 0) : 5) + G.M.stat(m, 'tea') + G.M.stat(m, 'jud')) / (m.ten + 1);
      var pObey = G.clamp(0.35 + score * 0.09 - (m.cls === 'rogue' ? 0.08 : 0), 0.2, 0.98);
      return '<tr><td>' + E(m.name) + '<div class="small dim">' + D.CLASSES[m.cls].name + (m.agg >= 13 ? ' · <span class="bad">호전성 ' + m.agg + '</span>' : '') + '</div></td>' +
        '<td><select data-chg="tac" data-id="' + id + '" data-k="target">' + Object.keys(D.TARGETS).map(function (k) { return '<option value="' + k + '"' + (m.tactic.target === k ? ' selected' : '') + '>' + D.TARGETS[k] + '</option>'; }).join('') + '</select></td>' +
        '<td><select data-chg="tac" data-id="' + id + '" data-k="skill">' + Object.keys(D.SKILLFREQ).map(function (k) { return '<option value="' + k + '"' + (m.tactic.skill === k ? ' selected' : '') + '>' + D.SKILLFREQ[k] + '</option>'; }).join('') + '</select></td>' +
        '<td><select data-chg="tac" data-id="' + id + '" data-k="potion">' + Object.keys(D.POTION).map(function (k) { return '<option value="' + k + '"' + (String(m.tactic.potion) === k ? ' selected' : '') + '>' + D.POTION[k] + '</option>'; }).join('') + '</select></td>' +
        '<td><span class="' + (pObey > 0.85 ? 'good' : pObey > 0.6 ? 'gold' : 'bad') + '">' + Math.round(pObey * 100) + '%</span></td></tr>';
    }).join('') + '</table></div>' + (G.UI.unlockTactics ? '<div class="row" style="margin-top:8px"><button class="primary" data-act="tacticsDone">전술 수정 완료</button></div>' : '') + '</div></div>';
  return h;
};

// ───── 미궁 ─────
G.UI.supply = { potion: 6, calmPotion: 1, antidote: 1, torch: 0, ration: 6, ale: 1, stones: 3 };
G.UI.view_expedition = function () {
  var S = G.S;
  if (S.exp) return G.UI.view_explore();
  var party = G.UI.party().map(function (id) { return G.W.merc(S, id); });
  var able = party.filter(function (m) { return G.M.canFight(m) && m.status === 'guild'; });
  var cps = S.checkpoints.slice().sort(function (a, b) { return a - b; });
  var maxF = Math.max.apply(null, cps.concat([S.deepest]));
  if (!G.UI.startFloor || G.UI.startFloor > maxF) G.UI.startFloor = cps[cps.length - 1];
  var fcost = G.X.startCost(S, G.UI.startFloor);
  var cap = 8 + (party.some(function (m) { return G.M.has(m, 'porter'); }) ? 4 : 0);
  var sup = G.UI.supply;
  var supRows = Object.keys(sup).map(function (k) {
    var have = k === 'stones' ? S.stones : (S.inv.cons[k] || 0), v = Math.min(sup[k], have, k === 'stones' ? 99 : cap);
    sup[k] = v;
    var name = k === 'stones' ? '마석 (야영 연료)' : D.CONSUMABLES[k].name;
    return '<tr><td data-tip="' + E(k === 'stones' ? '야영할 때 1개씩 태운다' : D.CONSUMABLES[k].desc) + '">' + name + '</td><td><button class="sm" data-act="sup" data-k="' + k + '" data-d="-1">−</button> <b>' + v + '</b> <button class="sm" data-act="sup" data-k="' + k + '" data-d="1">+</button></td><td class="dim">보유 ' + have + '</td></tr>';
  }).join('');
  var nz = G.X.zoneOf(G.UI.startFloor);
  var h = '<div class="grid2"><div class="panel"><h2>출정 준비</h2>' +
    '<div class="row">' + party.map(function (m) { return '<div style="text-align:center"><canvas width="60" height="70" data-port="' + m.id + '" style="width:60px;height:70px;image-rendering:pixelated"></canvas><div class="small">' + E(m.name.split(' ')[0]) + '</div><div class="small dim">CA ' + G.UI.caText(m) + '</div>' + (!G.M.canFight(m) ? '<div class="small bad">출전 불가</div>' : m.injuries.length ? '<div class="small bad">경상</div>' : '') + '</div>'; }).join('') + '</div>' +
    '<div class="small dim">명단은 전술판에서 바꾼다. 평균 CA ' + Math.round(G.avg(able.map(function (m) { return G.M.ca(m); }))) + ' · 평균 긴장 ' + G.round1(G.avg(able.map(function (m) { return m.ten; }))) + '</div>' +
    '<label class="small gold" style="display:block;margin-top:8px">출발 층 — 귀환석 층은 무료, 이미 도달한 다른 층은 비용을 내고 고를 수 있다</label><div class="row"><select data-chg="startFloor">' + (function () { var o = ''; for (var f = 1; f <= maxF; f++) { var c = G.X.startCost(S, f); o += '<option value="' + f + '"' + (f === G.UI.startFloor ? ' selected' : '') + '>' + f + '층' + (cps.indexOf(f) >= 0 ? ' (귀환석)' : '') + ' — ' + (c ? c + 'G' : '무료') + '</option>'; } return o; })() + '</select><span class="' + (S.gold >= fcost ? 'gold' : 'bad') + '">' + (fcost ? '출발 비용 ' + fcost + 'G' : '무료') + '</span></div>' +
    '<div class="small" style="margin-top:6px">' + E(D.ZONES[nz].name) + ' · 권장 평균 CA 약 ' + Math.round(18 + 3.6 * G.UI.startFloor) + (nz === 'deep' ? ' · <span class="bad">횃불 필수 (없으면 명중 −20, 긴장↑)</span>' : nz === 'mid' ? ' · <span class="purple">늪지: 지구력 소모 ×1.6</span>' : '') + '</div>' +
    '<h3>보급품 (종류당 최대 ' + cap + ')</h3><table class="t">' + supRows + '</table>' +
    '<div class="row" style="margin-top:10px"><button class="primary" data-act="expStart" ' + (able.length ? '' : 'disabled') + '>미궁으로 출정</button><span class="small dim">전술: ' + D.TEMPO[S.tactics.tempo].name + ' · ' + D.ENGAGE[S.tactics.engage].name + '</span></div></div>';
  h += '<div class="panel"><h2>미궁 정보</h2>' + Object.keys(D.ZONES).map(function (z) { var Z = D.ZONES[z]; return '<div><b>' + Z.floors[0] + '~' + Z.floors[1] + '층</b> ' + E(Z.name) + '</div>'; }).join('') +
    '<h3>보스</h3>' + Object.keys(D.BOSSES).map(function (k) { var B = D.BOSSES[k]; var killed = S.bossKills[k]; return '<div class="row" style="align-items:flex-start;margin-bottom:8px"><img src="' + (AMF.ui['boss_' + k] || '') + '" style="width:110px;border-radius:6px;border:1px solid var(--line)"><div class="grow small"><b>' + B.floor + '층 ' + E(B.name) + '</b> ' + (killed ? '<span class="good">격파</span>' : '') + '<div>기믹: ' + E(B.gimmick) + '</div>' + (killed || S.deepest >= B.floor ? '<div class="dim">공략: ' + E(B.counter) + '</div>' : '<div class="dim">공략: ???</div>') + '</div></div>'; }).join('') +
    (S.lastExp ? '<h3>지난 원정</h3><div class="small">' + S.lastExp.start + '층 → ' + S.lastExp.end + '층, ' + S.lastExp.days + '일, 전투 ' + S.lastExp.battles + '회 (승리 ' + S.lastExp.wins + ')<br>' + E(S.lastExp.loot) + '</div>' : '') + '</div></div>';
  return h;
};
G.UI.view_explore = function () {
  var S = G.S, e = S.exp, all = G.X.partyMercs(S);
  var steps = e.steps.map(function (opts, i) {
    return '<div class="stepcol">' + opts.map(function (r, j) {
      var cls = i < e.step ? 'done' : i === e.step ? 'cur' : 'future';
      if (r.type === 'boss') cls += ' boss'; if (r.type === 'stairs') cls += ' stairs';
      var vis = i < e.step || G.X.visible(S, r, i - e.step);
      var label = vis ? G.X.ROOM_NAME[r.type] : '?';
      var act = i === e.step && !e.atStairs ? ' data-act="room" data-i="' + j + '"' : '';
      return '<div class="room ' + cls + '"' + act + '>' + (i === e.step ? '▶ ' : '') + label + '</div>';
    }).join('') + '</div>';
  }).join('');
  var pms = all.map(function (m) {
    var d = G.M.derive(m);
    return '<div class="pm"><div class="row"><b>' + E(m.name) + '</b><span class="dim">' + D.CLASSES[m.cls].name + '</span>' + (m._down ? '<span class="bad">행동 불능</span>' : '') + (m.injuries.length ? '<span class="bad small">' + E(G.M.injuryText(m)) + '</span>' : '') + '</div>' +
      '<div class="bars"><span>HP</span>' + G.UI.bar(m._hp / d.maxHp, '#5fcf6f') + '<span>마나</span>' + G.UI.bar((m._mp || 0) / d.mp, '#6fa8dc') + '<span>지구력</span>' + G.UI.bar(m._sta / m._staMax, m._sta <= 0 ? '#e05a4a' : '#d8b56a') + '<span>긴장</span>' + G.UI.tenBar(m.ten) + '</div></div>';
  }).join('');
  var sup = Object.keys(e.sup).map(function (k) { return (k === 'stones' ? '마석' : D.CONSUMABLES[k].name) + ' ' + e.sup[k]; }).join(' · ');
  var acts;
  if (e.atStairs) {
    var boss = D.BOSS_BY_FLOOR[e.floor];
    acts = '<button class="primary" data-act="descend" ' + (e.floor >= 40 || (boss && !S.bossKills[boss]) ? 'disabled' : '') + '>' + (e.floor + 1) + '층으로 내려간다</button><button data-act="retreat">귀환한다</button>' + (!e.camped ? '<button data-act="camp">야영 (브리핑)</button>' : '');
  } else acts = '<button data-act="camp" ' + (e.camped && !e.freeCamp ? 'disabled' : '') + '>야영 (브리핑)</button><button class="danger" data-act="retreat">귀환 (위험 ' + Math.round(G.X.retreatRisk(S) * 100) + '%)</button>';
  return '<div class="exp"><div><canvas class="scene" width="1280" height="720"></canvas>' +
    '<div class="panel" style="margin-top:8px"><div class="row"><h2 style="margin:0">' + e.floor + '층</h2><span class="dim">' + E(D.ZONES[e.zone].name) + '</span>' + (e.dark ? (e.sup.torch > 0 ? '<span class="gold">횃불 ' + e.sup.torch + '</span>' : '<span class="bad">어둠 (횃불 없음)</span>') : '') + '<span class="grow"></span><span class="small dim">원정 ' + G.round1(e.days) + '일째 · 전투 ' + e.stats.battles + '</span></div>' +
    '<div class="small dim">다음 방을 고른다. 시야 12 이상이면 바로 앞 방의 종류가 보인다.</div><div class="steps">' + steps + '</div>' +
    '<div class="row">' + acts + '</div></div></div>' +
    '<div><div class="panel"><h3 style="margin-top:0">파티</h3>' + pms + '<div class="small">' + sup + '</div><div class="small dim">전리품: ' + E(G.X.lootText(e.loot)) + '</div></div>' +
    '<div class="panel" style="margin-top:8px"><h3 style="margin-top:0">원정 기록</h3><div class="log">' + e.log.slice().reverse().map(function (l) { return '<div class="' + l.c + '">' + E(l.t) + '</div>'; }).join('') + '</div></div></div></div>';
};

// ───── 길드 시설 ─────
G.UI.view_facilities = function () {
  var S = G.S;
  var h = '<div class="grid2">' + D.BUILDING_ORDER.map(function (k) {
    var B = D.BUILDINGS[k], lv = S.buildings[k], c = G.W.upgradeCost(S, k);
    var img = lv > 0 ? AMF.ui[B.img.replace('bld_', 'bld_') + '_' + lv] : AMF.ui[B.img + '_1'];
    var extra = '';
    if (k === 'tavern') extra = '<button class="sm" data-act="banquet" ' + (lv < 2 ? 'disabled' : '') + '>연회 (' + 30 * S.roster.length + 'G, 하루)</button>' + (function () {
      var rows = S.roster.filter(function (m) { return G.Social.quirks(m).length; }).map(function (m) { return '<div class="small" style="margin-top:4px"><b>' + E(m.name) + '</b> ' + G.Social.quirks(m).map(function (q) { var T = D.TRAITS[q], lk = G.Social.isLocked(m, q); return '<span class="tag quirk' + (T.neg ? ' neg' : '') + '" data-tip="' + E(T.desc) + '">' + (lk ? '🔒 ' : '') + E(T.name) + '</span><button class="sm" data-act="quirkRemove" data-id="' + m.id + '" data-q="' + q + '" ' + (lv < 2 ? 'disabled' : '') + ' data-tip="제거: ' + (lk ? '700G, 마석 6' : '350G, 마석 3') + '">제거</button>' + (!T.neg && !lk ? '<button class="sm" data-act="quirkLock" data-id="' + m.id + '" data-q="' + q + '" ' + (lv < 3 ? 'disabled' : '') + ' data-tip="고정: 500G, 마석 6 (용병당 2개까지)">고정</button>' : ''); }).join(' ') + '</div>'; }).join('');
      return '<div style="width:100%"><div class="small dim" style="margin-top:6px">성향(퀴크) 서비스 — 제거는 2단계, 좋은 성향 고정은 3단계</div>' + (rows || '<div class="small dim">아직 성향을 가진 용병이 없다. 전투 중 긴장이 16을 넘으면 붕괴 또는 미덕이 일어나고, 그 경험이 성향으로 굳어질 수 있다.</div>') + '</div>'; })();
    if (k === 'infirmary') extra = Object.keys(G.W.CRAFT).map(function (ck) { var C = G.W.CRAFT[ck]; return '<button class="sm" data-act="craft" data-k="' + ck + '" ' + (lv < C.lv ? 'disabled' : '') + ' data-tip="약초 ' + C.herbs + ' + ' + C.gold + 'G">' + D.CONSUMABLES[ck].name + ' 제조</button>'; }).join('') +
      (lv >= 3 ? '<div class="small">수술(영구 손상 치료): ' + S.roster.filter(function (m) { return m.perm.length; }).map(function (m) { return m.perm.map(function (p, i) { return '<button class="sm" data-act="surgery" data-id="' + m.id + '" data-i="' + i + '">' + E(m.name) + ' — ' + E(p.name) + '</button>'; }).join(''); }).join('') + ' <span class="dim">(800G + 마석 10)</span></div>' : '');
    if (k === 'cemetery' && lv >= 1) extra = '<div class="small">' + (S.dead.length ? S.dead.map(function (d, i) { return '<div>✝ ' + E(d.merc.name) + ' <span class="dim">(' + D.CLASSES[d.merc.cls].name + ', ' + E(d.cause) + ', ' + G.dateText(d.day) + ')</span>' + (lv >= 2 && !d.inherited ? ' <button class="sm" data-act="inherit" data-i="' + i + '">유품 계승</button>' : d.inherited ? ' <span class="dim">계승됨</span>' : '') + '</div>'; }).join('') : '<span class="dim">잠든 이가 없다.</span>') + '</div>';
    return '<div class="panel bldg"><img src="' + img + '" alt=""><div><div class="row"><b>' + B.name + '</b><span class="pill">' + (lv ? lv + '단계' : '미건설') + '</span></div>' +
      B.lv.map(function (t, i) { return '<div class="small ' + (i < lv ? '' : 'dim') + '">' + (i + 1) + '단계: ' + E(t) + '</div>'; }).join('') +
      '<div class="row" style="margin-top:6px">' + (c ? '<button class="sm primary" data-act="upgrade" data-k="' + k + '">' + (lv ? '증축' : '건설') + ' (' + G.fmt(c[0]) + 'G · 마석 ' + c[1] + ' · 명성 ' + c[2] + ')</button>' : '<span class="gold small">최고 단계</span>') + extra + '</div></div></div>';
  }).join('') + '</div>';
  return h;
};

// ───── 상점 ─────
G.UI.view_shop = function () {
  var S = G.S;
  var h = '<div class="grid2"><div class="panel"><h2>장비 상점 <span class="dim small">(매주 교체)</span></h2><table class="t">' + S.shop.map(function (it) { return '<tr><td>' + G.UI.itemName(it) + '<div class="small dim">' + G.I.desc(it).split('\n')[0] + '</div></td><td>' + G.fmt(it.cost) + 'G</td><td><button class="sm" data-act="buy" data-id="' + it.id + '">구매</button></td></tr>'; }).join('') + '</table>' +
    '<h3>소모품</h3><table class="t">' + Object.keys(D.CONSUMABLES).map(function (k) { var C = D.CONSUMABLES[k]; return '<tr><td data-tip="' + E(C.desc) + '">' + C.name + ' <span class="dim small">(보유 ' + (S.inv.cons[k] || 0) + ')</span></td><td>' + C.price + 'G</td><td><button class="sm" data-act="buyCons" data-k="' + k + '" data-n="1">1개</button> <button class="sm" data-act="buyCons" data-k="' + k + '" data-n="5">5개</button></td></tr>'; }).join('') + '</table>' +
    '<h3>마석 판매</h3><div class="row">시세 ' + G.W.stonePrice(S) + 'G/개 · 보유 ' + S.stones + ' <button class="sm" data-act="sellStones" data-n="5">5개 판매</button><button class="sm" data-act="sellStones" data-n="999">모두 판매</button></div></div>';
  h += '<div class="panel"><h2>암시장</h2>' + (S.buildings.market < 1 ? '<div class="dim">암시장을 건설하면 유물과 재능 무시 물약을 거래할 수 있다.</div>' :
    '<table class="t">' + S.market.relics.map(function (o, i) { return '<tr><td data-tip="' + E(D.RELICS[o.k].desc) + '">유물 [' + D.RELICS[o.k].name + ']<div class="small dim">' + E(D.RELICS[o.k].desc) + '</div></td><td>' + G.fmt(o.cost) + 'G</td><td><button class="sm" data-act="buyMarket" data-kind="relics" data-i="' + i + '">구매</button></td></tr>'; }).join('') +
    S.market.potions.map(function (o, i) { var it = D.STAT_ITEMS[o.k]; return '<tr><td data-tip="' + E(it.desc + '\n요구 특성: ' + it.req.map(function (t) { return D.TRAITS[t].name; }).join(' / ')) + '">' + it.name + '<div class="small dim">' + E(it.desc) + '</div></td><td>' + G.fmt(o.cost) + 'G</td><td><button class="sm" data-act="buyMarket" data-kind="potions" data-i="' + i + '">구매</button></td></tr>'; }).join('') + '</table>') +
    '<h2 style="margin-top:14px">경매장</h2>' + (S.buildings.market < 2 ? '<div class="dim">암시장 2단계에서 열린다. NPC와 입찰 경쟁, 결과는 주간 정산 때 확정.</div>' :
      '<table class="t">' + S.auction.map(function (l) { return '<tr><td>' + G.UI.itemName(l.item) + '<div class="small dim">시작가 ' + l.start + 'G' + (l.myBid ? ' · 내 입찰 ' + l.myBid + 'G' : '') + '</div></td><td><input type="number" id="bid-' + l.id + '" value="' + Math.max(l.start, l.myBid + 50) + '" style="width:90px"></td><td><button class="sm" data-act="bid" data-id="' + l.id + '">입찰</button></td></tr>'; }).join('') + '</table>') + '</div></div>';
  return h;
};

// ───── 의뢰 ─────
G.UI.view_quests = function () {
  var S = G.S, idle = S.roster.filter(function (m) { return m.status === 'guild' && G.M.canFight(m); });
  var h = '<div class="notice">의뢰는 재화벌이용이다. "스킵"하면 즉시 결과가 나오고 게임 내 시간이 하루 지난다. 토벌·호위는 직접 전투로 볼 수도 있다(역시 하루 소비).</div><div class="cards">' + S.quests.map(function (q) {
    var sel = G.UI.qsel[q.id] || [];
    var pw = sel.length ? G.W.questPower(S, q, sel) : 0, p = sel.length ? G.clamp(1 / (1 + Math.exp(-(pw - q.req) / (q.req * 0.18 + 4))), 0.05, 0.97) : 0;
    return '<div class="panel"><div class="row"><b>' + E(q.name) + '</b><span class="pill">' + q.size + '명까지</span></div><div class="small">요구 전력 ' + q.req + ' · 중요 스탯 ' + q.stat.map(function (s) { return D.STAT_NAME[s]; }).join(', ') + '</div>' +
      '<div class="small gold">보상 ' + q.gold + 'G · 명성 +' + q.fame + (q.herbs ? ' · 약초' : '') + '</div><div class="choices" style="margin:6px 0">' + idle.map(function (m) { var on = sel.indexOf(m.id) >= 0; return '<button class="sm ' + (on ? 'on' : '') + '" data-act="qsel" data-q="' + q.id + '" data-id="' + m.id + '">' + E(m.name.split(' ')[0]) + '</button>'; }).join('') + '</div>' +
      '<div class="row"><span class="small">' + (sel.length ? '성공 확률 약 ' + Math.round(p * 100) + '%' : '용병을 배정하자') + '</span><span class="grow"></span><button class="sm primary" data-act="qskip" data-q="' + q.id + '" ' + (sel.length ? '' : 'disabled') + '>스킵 (하루)</button>' + (q.battle ? '<button class="sm" data-act="qfight" data-q="' + q.id + '" ' + (sel.length ? '' : 'disabled') + '>직접 수행</button>' : '') + '</div></div>';
  }).join('') + '</div>';
  if (!S.quests.length) h += '<div class="panel dim">이번 주 의뢰를 모두 처리했다. 다음 주에 새 의뢰가 들어온다.</div>';
  return h;
};

// ───── 창고 ─────
G.UI.view_storage = function () {
  var S = G.S;
  var h = '<div class="grid2"><div class="panel"><h2>장비 (' + S.inv.items.length + ')</h2><table class="t">' + S.inv.items.map(function (it) { return '<tr><td>' + G.UI.itemName(it) + '<div class="small dim">' + E(G.I.desc(it).split('\n')[0]) + '</div></td><td>' + { weapon: '무기', armor: '방어구', acc: '장신구' }[it.slot] + '</td><td><button class="sm" data-act="sell" data-id="' + it.id + '">판매 ' + Math.round(G.I.price(it) * G.W.SELL_RATE) + 'G</button></td></tr>'; }).join('') + '</table>' + (S.inv.items.length ? '' : '<div class="dim">비어 있다.</div>') + '</div>';
  h += '<div class="panel"><h2>유물 <span class="dim small">(장착 ' + S.inv.relicSlots.length + ' / 3 — 소지만 해도 효과)</span></h2>' + (S.inv.relics.length ? S.inv.relics.map(function (k, i) {
    var on = S.inv.relicSlots.indexOf(k) >= 0, R = D.RELICS[k];
    return '<div class="row" style="margin-bottom:4px"><b data-tip="' + E(R.desc) + '">' + R.name + '</b><span class="small dim">' + E(R.desc) + '</span><span class="grow"></span><button class="sm ' + (on ? 'on' : '') + '" data-act="relic" data-k="' + k + '">' + (on ? '장착 중' : '장착') + '</button>' + (R.noSell ? '' : '<button class="sm" data-act="relicSell" data-k="' + k + '">판매 ' + G.fmt(R.price) + 'G</button>') + '</div>';
  }).join('') : '<div class="dim">없다. 보스·제단·암시장에서 얻는다.</div>') +
    '<h3>스킬북 (일반 특성 습득, 어빌 소비)</h3>' + (S.inv.books.length ? S.inv.books.map(function (t, i) { return '<div class="row"><span>' + G.UI.traitTag(t) + '</span><span class="small dim">어빌 ' + (D.TRAITS[t].cost || 3) + '</span><span class="grow"></span><button class="sm" data-act="book" data-i="' + i + '">읽힐 용병 선택</button></div>'; }).join('') : '<div class="dim small">없음</div>') +
    '<h3>재능 무시 스탯 물약</h3>' + (S.inv.statItems.length ? S.inv.statItems.map(function (k, i) { var it = D.STAT_ITEMS[k]; return '<div class="row"><span data-tip="' + E('요구 특성: ' + it.req.map(function (t) { return D.TRAITS[t].name; }).join(' / ')) + '">' + it.name + '</span><span class="small dim">' + E(it.desc) + '</span><span class="grow"></span><button class="sm" data-act="statItem" data-i="' + i + '">사용</button></div>'; }).join('') : '<div class="dim small">없음</div>') +
    '<h3>소모품</h3><div class="small">' + Object.keys(S.inv.cons).map(function (k) { return D.CONSUMABLES[k].name + ' ' + S.inv.cons[k]; }).join(' · ') + ' · 약초 ' + S.herbs + ' · 마석 ' + S.stones + '</div></div></div>';
  return h;
};

// ───── 기록 ─────
G.UI.view_records = function () {
  var S = G.S, Y = S.yearData;
  var h = '<div class="grid2"><div><div class="panel"><h2>' + Y.year + '년차 왕국의 요구</h2>' + Y.goals.map(function (g) { var d = G.W.goalDone(S, g); return '<div>' + (d ? '<span class="good">✔</span> ' : '<span class="dim">○</span> ') + E(g.text) + '</div>'; }).join('') +
    '<div class="small dim" style="margin-top:6px">연말 평가: 미궁 진행 30 · 재정 20 · 성장 20 · 생존 15 · 도감·명성 15 + 요구 달성 각 +10 → S/A/B/C/D 등급. 미달해도 게임 오버는 없다.</div>' +
    (S.evals.length ? '<h3>지난 평가</h3>' + S.evals.map(function (e) { return '<span class="pill">' + e.year + '년차 ' + e.grade + ' (' + e.total + ')</span> '; }).join('') : '') + '</div>' +
    '<div class="panel" style="margin-top:10px"><h2>다른 용병단</h2><table class="t"><tr><th>이름</th><th>진행</th><th>전력</th><th>성향</th></tr>' + S.rivals.map(function (r) { return '<tr><td>' + E(r.name) + (r.gone ? ' <span class="dim">(해산)</span>' : '') + '</td><td>' + Math.floor(r.floor) + '층</td><td>' + Math.round(r.power) + '</td><td>' + { friendly: '우호', neutral: '경계', hostile: '적대' }[r.temper] + '</td></tr>'; }).join('') + '</table>' +
    '<div class="small dim">라이벌이 먼저 최하층을 공략해도 게임은 끝나지 않는다. 미궁에서 마주치면 교환·무시·기습을 고를 수 있다.</div></div>' +
    '<div class="panel" style="margin-top:10px"><h2>도감</h2><div class="small">종족 ' + Object.keys(S.codex.races || {}).length + ' / 12 · 특성 ' + Object.keys(S.codex.traits || {}).length + ' / ' + Object.keys(D.TRAITS).length + ' · 몬스터 ' + Object.keys(S.codex.monsters || {}).length + ' / ' + Object.keys(D.MONSTERS).length + ' · 유물 ' + Object.keys(S.codex.relics || {}).length + ' / ' + Object.keys(D.RELICS).length + '</div></div>' +
    '<div class="panel" style="margin-top:10px"><h2>추모</h2>' + (S.dead.length ? S.dead.map(function (d) { return '<div class="small">✝ ' + E(d.merc.name) + ' — ' + D.RACES[d.merc.race].name + ' ' + D.CLASSES[d.merc.cls].name + ', ' + E(d.cause) + ' (' + G.dateText(d.day) + ')</div>'; }).join('') : '<div class="dim small">아직 잃은 동료가 없다.</div>') +
    (S.retired.length ? '<h3>은퇴</h3>' + S.retired.map(function (d) { return '<div class="small">' + E(d.merc.name) + ' (' + G.dateText(d.day) + ')</div>'; }).join('') : '') + '</div></div>' +
    '<div><div class="panel"><h2>최근 전투 리포트 (' + S.reports.length + ')</h2>' + (S.reports.length ? '<table class="t">' + S.reports.map(function (r) { return '<tr><td>' + G.dateText(r.d) + '</td><td>' + (r.floor ? r.floor + '층 ' : '') + ({ normal: '일반', elite: '정예', boss: '보스', rival: '라이벌', quest: '의뢰' }[r.kind] || '') + '</td><td>' + (r.res === 'win' ? '<span class="good">승</span>' : '<span class="bad">패</span>') + '</td><td><button class="sm" data-act="reportOpen" data-id="' + r.id + '">보기</button></td></tr>'; }).join('') + '</table>' : '<div class="dim small">전투를 치르면 기록된다.</div>') + '</div>' +
    '<div class="panel" style="margin-top:10px"><h2>소식</h2><div class="news">' + S.news.slice(0, 120).map(function (n) { return '<div class="' + n.c + '"><span class="d">' + G.dateText(n.d) + '</span>' + E(n.t) + '</div>'; }).join('') + '</div></div></div></div>';
  return h;
};


// ───── 알림 센터 ─────
G.UI.inboxFilter = 'all';
G.UI.view_inbox = function () {
  var S = G.S, f = G.UI.inboxFilter, list = S.inbox.filter(function (n) { return f === 'all' || (f === 'imp' ? n.imp >= 1 : n.k === f); });
  var kinds = ['all', 'imp', 'growth', 'injury', 'death', 'mind', 'quirk', 'bond', 'story', 'battle', 'staff', 'guild'];
  var h = '<div class="panel"><div class="row"><h2 style="margin:0">알림 센터</h2><span class="dim small">큰 성장, 큰 부상, 전사, 멘탈 붕괴, 서포트, 성향 변화, 서사, 원정 결과를 모았다.</span><span class="grow"></span><button class="sm" data-act="inboxRead">모두 읽음</button></div>' +
    '<div class="choices" style="margin-top:6px">' + kinds.map(function (k) { return '<button class="sm ' + (f === k ? 'on' : '') + '" data-act="inboxFilter" data-f="' + k + '">' + (k === 'all' ? '전체' : k === 'imp' ? '중요만' : D.NOTE_KIND[k]) + '</button>'; }).join('') + '</div></div>';
  h += '<div class="inbox">' + list.slice(0, 120).map(function (n) {
    var m = n.m && G.W.merc(S, n.m);
    return '<div class="note ' + n.s + (n.read ? '' : ' unread') + (n.imp >= 2 ? ' big' : '') + '"><div class="row"><span class="nk">' + D.NOTE_KIND[n.k] + '</span><b>' + E(n.t) + '</b><span class="grow"></span><span class="dim small">' + G.dateText(n.d) + '</span></div>' +
      (n.x ? '<div class="small">' + E(n.x) + '</div>' : '') +
      '<div class="row" style="margin-top:3px">' + (m ? '<button class="sm" data-act="selGo" data-id="' + m.id + '">용병 보기</button>' : '') + (n.ref ? '<button class="sm" data-act="bondTalk" data-a="' + n.ref.a + '" data-b="' + n.ref.b + '" data-i="' + n.ref.i + '">대화 보기</button>' : '') + '</div></div>';
  }).join('') + (list.length ? '' : '<div class="panel dim">표시할 알림이 없다.</div>') + '</div>';
  return h;
};
// ───── 전투 리포트 ─────
G.UI.reportHTML = function (rp) {
  var kindN = { normal: '일반 전투', elite: '정예 전투', boss: '보스전', rival: '라이벌전', quest: '의뢰 전투' }[rp.kind] || '전투';
  var h = '<div class="row"><b style="font-size:15px">' + (rp.res === 'win' ? '<span class="good">승리</span>' : rp.res === 'lose' ? '<span class="bad">패배</span>' : '<span class="bad">후퇴</span>') + '</b><span>' + (rp.floor ? rp.floor + '층 ' : '') + kindN + ' · ' + rp.rounds + '번 행동</span><span class="dim small">상대: ' + E(rp.enemies.join(', ')) + '</span></div>';
  h += '<h3>분석</h3><ul>' + rp.notes.map(function (n) { return '<li>' + E(n) + '</li>'; }).join('') + '</ul>';
  h += '<h3>용병별 기록</h3><table class="t"><tr><th>용병</th><th>가한 피해</th><th>받은 피해</th><th>치유</th><th>처치</th><th data-tip="지시를 따른 행동 / 전체 행동">지시 수행</th><th>긴장 (시작 → 최고 → 종료)</th><th>상태</th></tr>' +
    rp.units.map(function (u) {
      var st = [];
      u.minds.forEach(function (x) { var M = D.MINDS[x.k]; st.push('<span class="' + (M.good ? 'good' : 'bad') + '" data-tip="' + E(M.desc) + '">' + (M.good ? '미덕 ' : '붕괴 ') + M.name + '</span>'); });
      if (u.ko != null) st.push('<span class="bad">쓰러짐(' + u.ko + '번째 행동)</span>');
      if (u.pan) st.push('허둥 ' + u.pan + '회');
      if (u.cover) st.push('<span class="good">동료 대신 맞음 ' + u.cover + '회</span>');
      if (u.grief) st.push('<span class="bad">동료의 쓰러짐에 충격</span>');
      return '<tr><td><b>' + E(u.name) + '</b><div class="small dim">' + D.CLASSES[u.cls].name + ' · ' + u.rowName + ' · 남은 HP ' + u.hpEnd + '%</div></td><td>' + u.dealt + '</td><td>' + u.taken + '</td><td>' + (u.heal || '-') + '</td><td>' + u.kills + '</td><td>' + u.obey + ' / ' + u.n + (u.dis.length ? ' <span class="bad">(불복종 ' + u.dis.length + ')</span>' : '') + '</td><td>' + u.t0 + ' → <b class="' + (u.tm >= 16 ? 'bad' : u.tm >= 12 ? 'gold' : '') + '">' + u.tm + '</b> → ' + u.t1 + '</td><td class="small">' + (st.join('<br>') || '-') + '</td></tr>';
    }).join('') + '</table>';
  var dis = [], fk = [];
  rp.units.forEach(function (u) { u.dis.forEach(function (d) { dis.push('<tr><td>' + E(u.name) + '</td><td>' + d.t + '</td><td>' + d.ten + '</td><td>' + d.p + '%</td><td>' + E(d.why) + '</td></tr>'); }); u.fk.forEach(function (f) { fk.push('<tr><td>' + E(u.name) + '</td><td>' + E(f.to) + '</td><td>' + E(f.why) + '</td><td>' + f.dmg + (f.ko ? ' <span class="bad">(쓰러뜨림)</span>' : '') + '</td></tr>'); }); });
  if (dis.length) h += '<h3>지시 불복종 ' + dis.length + '회 — 왜 지시를 안 따랐나</h3><table class="t"><tr><th>용병</th><th>행동</th><th>그때 긴장</th><th>순종 확률</th><th>원인</th></tr>' + dis.join('') + '</table><div class="small dim">순종 확률 = 0.35 + (주장 리더십 + 팀워크 + 판단력) ÷ (긴장 + 1) × 0.09. 긴장을 낮추고 주장의 리더십·팀워크를 올리면 오른다.</div>';
  if (fk.length) h += '<h3>아군 오사 ' + fk.length + '회</h3><table class="t"><tr><th>가해</th><th>피해</th><th>원인</th><th>피해량</th></tr>' + fk.join('') + '</table>';
  return h;
};
G.UI.reportModal = function (rp) {
  if (!rp) return;
  G.UI.modal('전투 리포트 — ' + G.dateText(rp.d), G.UI.reportHTML(rp), [{ t: '닫기' }], { wide: true });
};
G.UI.bondModal = function (a, b, i) {
  var S = G.S, o = G.Social.get(S, a, b), ma = G.UI.findMerc(a), mb = G.UI.findMerc(b); if (!o) return;
  var t = o.talks[i != null ? +i : o.talks.length - 1] || o.talks[0];
  G.UI.modal('서포트 대화 — ' + E(ma.name) + ' · ' + E(mb.name), '<div class="small dim">서포트 ' + D.BOND_NAME[t.r] + ' (' + G.dateText(t.d) + ')</div>' + t.lines.map(function (l) { return '<p>' + E(l) + '</p>'; }).join('') + (o.talks.length > 1 ? '<div class="small dim" style="margin-top:6px">지난 대화: ' + o.talks.map(function (x, j) { return '<button class="sm" data-act="bondTalk" data-a="' + a + '" data-b="' + b + '" data-i="' + j + '">' + D.BOND_NAME[x.r] + '</button>'; }).join(' ') + '</div>' : ''), [{ t: '닫기' }]);
};

// ───── 전투 오버레이 ─────
G.UI.openBattle = function (battle, onDone) {
  var S = G.S;
  // 도감: 몬스터
  battle.setup.enemies.forEach(function (u) { if (u.mon) G.W.codex(S, 'monsters', u.mon); if (u.bossKey) G.W.codex(S, 'monsters', u.bossKey); });
  var res = G.C.run(battle.setup);
  if (S.settings.autoSkip && !battle.setup.ctx.bossKey) { onDone(res); return; }
  var root = $('battle-root'); root.hidden = false;
  root.innerHTML = '<div class="bwrap"><canvas width="1280" height="720"></canvas><div class="bside"><div class="panel"><div class="row"><b>전투</b><span class="grow"></span>' +
    [1, 2, 4].map(function (s) { return '<button class="sm ' + (S.settings.speed === s ? 'on' : '') + '" data-bs="' + s + '">' + s + 'x</button>'; }).join('') + '<button class="sm" data-bskip="1">스킵</button></div>' +
    '<div class="small dim" style="margin-top:4px">' + (battle.setup.ctx.bossKey ? E(D.BOSSES[battle.setup.ctx.bossKey].gimmick) : '교전 기조: ' + D.ENGAGE[battle.setup.ctx.engage || 'balanced'].name) + '</div></div><div class="blog"></div><button class="primary" data-bdone="1" disabled>결과 보기</button></div></div>';
  var cv = root.querySelector('canvas');
  var bv = new G.V.Battle(cv, S, battle, res, function () { var b = root.querySelector('[data-bdone]'); b.disabled = false; b.focus(); });
  bv.logEl = root.querySelector('.blog');
  root.onclick = function (ev) {
    var t = ev.target;
    if (t.dataset.bs) { bv.setSpeed(+t.dataset.bs); root.querySelectorAll('[data-bs]').forEach(function (b) { b.classList.toggle('on', b === t); }); }
    if (t.dataset.bskip) bv.skip();
    if (t.dataset.bdone) { bv.stop(); root.hidden = true; root.innerHTML = ''; onDone(res); }
  };
};
// 탐험 중 전투 처리 → 결과 모달
G.UI.expBattle = function (battle, advance) {
  var S = G.S;
  G.UI.openBattle(battle, function (res) {
    var out = G.X.afterBattle(S, res, battle);
    var t = (res.result === 'win' ? '<h3 class="good">승리</h3>' : res.result === 'lose' ? '<h3 class="bad">패배</h3>' : '<h3 class="bad">후퇴</h3>') +
      (out.loot ? '<div>전리품: ' + E(G.X.lootText(out.loot)) + '</div>' : '') + (out.fame ? '<div class="gold">명성 +' + out.fame + '</div>' : '') +
      out.text.map(function (x) { return '<div class="gold">' + E(x) + '</div>'; }).join('') +
      out.injuries.map(function (x) { return '<div class="bad">부상: ' + E(x) + '</div>'; }).join('') +
      out.kos.map(function (x) { return '<div class="bad">쓰러짐: ' + E(x) + '</div>'; }).join('') +
      out.perms.map(function (x) { return '<div class="bad">' + E(x) + '</div>'; }).join('') +
      out.deaths.map(function (m) { return '<div class="bad" style="font-weight:700">✝ ' + E(m.name) + ' 전사</div>'; }).join('');
    G.UI.modal('전투 결과', t, [{ t: '계속', cls: 'primary', fn: function () {
      if (out.forced || !G.X.able(S).length) { G.UI.goHome(out.forced === 'wipe' || !G.X.able(S).length ? 'wipe' : 'retreat'); return; }
      if (advance) G.X.next(S);
      G.UI.commit();
    } }, { t: '전투 리포트', keep: true, fn: function () { G.UI.reportModal(out.report); } }]);
  });
};
G.UI.goHome = function (reason) {
  var S = G.S, sum = G.X.returnHome(S, reason);
  G.W.autoFormation(S);
  G.UI.modal(reason === 'wipe' ? '전멸 — 귀환' : '귀환', '<pre>' + E(sum.text) + '</pre><div class="small dim">원정 ' + G.round1(sum.days) + '일 · 도달 ' + sum.floor + '층 · 명성 +' + sum.fame + '</div>', [{ t: '길드로', cls: 'primary', fn: function () { G.UI.commit(); } }]);
};
G.UI.handleRoom = function (r) {
  var S = G.S;
  if (!r) { G.UI.commit(); return; }
  if (r.kind === 'battle') {
    var go = function () { G.UI.expBattle(r, true); };
    if (r.text) G.UI.modal(r.boss ? '보스 — ' + E(D.BOSSES[r.boss].name) : '전투', '<pre>' + E(r.text) + '</pre>' + (r.boss ? '<div class="small dim" style="margin-top:6px">공략 힌트: ' + E(D.BOSSES[r.boss].counter) + '</div>' : ''), [{ t: '전투 시작', cls: 'primary', fn: go }]);
    else go();
    return;
  }
  if (r.kind === 'text') { G.UI.modal('방', '<pre>' + E(r.text) + '</pre>', [{ t: '계속', cls: 'primary', fn: function () { G.X.next(S); G.UI.commit(); } }]); return; }
  if (r.kind === 'choice') {
    G.UI.modal('사건', '<pre>' + E(r.text) + '</pre>', r.choices.map(function (c, i) {
      return { t: c, fn: function () { var o = G.X.choose(S, r, i); if (o && o.kind === 'battle') G.UI.handleRoom(o); else G.UI.modal('결과', '<pre>' + E(o ? o.text : '') + '</pre>', [{ t: '계속', cls: 'primary', fn: function () { G.X.next(S); G.UI.commit(); } }]); } };
    }));
    return;
  }
  if (r.kind === 'camp') { G.UI.campModal(true, function () { G.X.next(S); G.UI.commit(); }); return; }
  if (r.kind === 'stairs') { G.UI.commit(); return; }
  G.UI.commit();
};
G.UI.campModal = function (free, after) {
  var S = G.S, e = S.exp;
  var html = '<p>' + (free ? '모닥불 자리가 있다. 마석 없이 야영할 수 있다.' : '마석 1개를 태워 야영한다. (남은 마석 ' + (e.sup.stones || 0) + ')') + ' 반나절이 지난다.</p>' +
    '<p class="small">지구력 45% (+식량 40%, +요리 20%) · HP 30% 회복 · 긴장 −1</p>' +
    '<label class="small"><input type="checkbox" id="calmChk" ' + ((e.sup.calmPotion || 0) > 0 ? '' : 'disabled') + '> 정신 안정 물약 사용 (보유 ' + (e.sup.calmPotion || 0) + ')</label>' +
    '<h3>브리핑</h3><div class="small dim">하프타임 라커룸처럼 용병들의 멘탈을 다룬다. 불빛을 보고 몬스터가 기습할 수 있다(최고 시야가 높을수록 안전).</div>';
  var mk = function (b) { return function () { var calm = document.getElementById('calmChk'); var r = G.X.camp(S, b, calm && calm.checked); if (!r.ok) { G.UI.toast(r.text); return; }
    G.UI.modal('야영지', '<pre>' + E(r.text) + '</pre>', [{ t: '계속', cls: 'primary', fn: function () {
      if (r.battle) { G.UI.expBattle(r.battle, false); return; }
      if (b === 'tactics') { G.UI.unlockTactics = true; G.UI.tab = 'tactics'; }
      if (after) after(); else G.UI.commit();
    } }]); }; };
  G.UI.modal('야영 — 브리핑', html, [
    { t: '휴식만', fn: mk('rest') }, { t: '격려하기 (긴장 −3)', fn: mk('encourage') }, { t: '호통치기 (긴장 +2, 다음 전투 집중↑)', fn: mk('scold') }, { t: '전술 수정', fn: mk('tactics') }, { t: '취소' }]);
};

// ───── 새 게임 ─────
G.UI.newGameScreen = function () {
  $('app').hidden = false;
  $('top').innerHTML = '<span class="gname">미궁 용병단 (가제)</span><span class="dim">기술 테스트 빌드</span>';
  $('tabs').innerHTML = '';
  var races = Object.keys(D.RACES).map(function (k) { return '<option value="' + k + '">' + D.RACES[k].name + '</option>'; }).join('');
  var classes = D.CLASS_ORDER.filter(function (c) { return D.CLASSES[c].tier === 1; }).map(function (c) { return '<option value="' + c + '">' + D.CLASSES[c].name + '</option>'; }).join('');
  var has = !!G.W.load();
  $('view').innerHTML = '<div class="newgame panel"><h2>새 용병단 창단</h2>' +
    '<div class="notice">처음 데려온 친구(창립 멤버)는 직접 만든다. 주급이 없고 탈퇴하지 않으며, 잠재력 140 이상이 보장된다. 대신 하드코어 규칙대로 죽을 수도 있다.</div>' +
    '<div class="grid2"><div><label>용병단 이름</label><input type="text" id="ng-guild" value="잿빛 등불단" maxlength="16">' +
    '<label>창립 멤버 이름</label><input type="text" id="ng-name" value="카렐" maxlength="10">' +
    '<label>종족</label><select id="ng-race">' + races + '</select>' +
    '<label>직업</label><select id="ng-cls">' + classes + '</select>' +
    '<label>나이</label><select id="ng-age">' + [16, 17, 18, 20, 22, 25, 28].map(function (a) { return '<option' + (a === 18 ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select>' +
    '<label>머리색 (배치 A 검사 도트에만 적용)</label><div class="choices" id="ng-hair">' + D.HAIR.map(function (c, i) { return '<button class="sm ' + (i === 0 ? 'on' : '') + '" data-hair="' + c + '" style="background:' + c + ';width:28px;height:22px"></button>'; }).join('') + '</div></div>' +
    '<div><label>창립 동기 (개인 서사)</label>' + ['debt', 'revenge', 'dream'].map(function (k, i) { var St = D.STORIES[{ debt: 'founderDebt', revenge: 'founderRevenge', dream: 'founderDream' }[k]]; return '<label class="small" style="color:var(--text)"><input type="radio" name="motive" value="' + k + '"' + (i === 2 ? ' checked' : '') + '> <b>' + St.name + '</b> — ' + E(St.goal) + ' <span class="dim">(보상: ' + E(St.reward) + ')</span></label>'; }).join('') +
    '<h3>핵심 목표</h3><div class="small">· 창립 멤버를 끝까지 키워내거나 지켜내기<br>· 매년 말 왕국의 길드 평가 (S~D)<br>· 용병마다 하나씩 있는 개인 서사<br>· 10년 안에 미궁 40층까지 (라이벌보다 먼저면 "용사" 칭호)</div></div></div>' +
    '<div class="row" style="margin-top:14px"><button class="primary" data-act="newGame">창단한다</button>' + (has ? '<button data-act="continue">이어하기</button>' : '') + '<button data-act="import">저장 불러오기</button></div></div>';
};

// ───── 설정 ─────
G.UI.settings = function () {
  var S = G.S, st = S.settings;
  var b = function (k, v, t) { return '<button class="sm ' + (st[k] === v ? 'on' : '') + '" data-set="' + k + '" data-v="' + v + '">' + t + '</button>'; };
  G.UI.modal('설정', '<label class="small gold">검사 도트</label><div class="choices">' + b('swordSprite', 'batchA', '배치 A (32×48)') + b('swordSprite', 'sheet', '이미지 시트') + '</div>' +
    '<label class="small gold">인간 도트 (인간 시트: 의상 4방향 + 완성 초상화)</label><div class="choices">' + b('human', 'sheet', '인간 시트') + b('human', 'old', '기존 도트') + '</div>' +
    '<label class="small gold">머리·피부 색을 초상화에 맞춰 변형 (인간 시트 전신 도트)</label><div class="choices">' + b('recolor', true, '켜기') + b('recolor', false, '끄기 (원본 색 그대로)') + '</div>' +
    '<label class="small gold">초상화</label><div class="choices">' + b('portrait', 'variant', '의상 변형 (외형 규격서)') + b('portrait', 'battle', '전투 도트와 동일') + '</div>' +
    '<label class="small gold">미궁 타일</label><div class="choices">' + b('tiles', 'batchA', '배치 A 타일') + b('tiles', 'hd', '고해상도 시트 타일') + '</div>' +
    '<label class="small gold">전투 재생</label><div class="choices">' + b('autoSkip', false, '재생') + b('autoSkip', true, '일반 전투 자동 스킵') + '</div>' +
    '<h3>저장</h3><div class="row"><button class="sm" data-act="save">지금 저장</button><button class="sm" data-act="export">저장 내보내기</button><button class="sm" data-act="import">저장 불러오기</button><button class="sm danger" data-act="reset">새 게임</button></div>' +
    '<div class="small dim" style="margin-top:6px">자동 저장: 브라우저 저장소. 브라우저를 바꾸거나 기록을 지우면 사라지니 가끔 "저장 내보내기"로 백업하자.</div>', [{ t: '닫기', fn: function () { G.UI.render(); } }],
    { after: function (bg) { bg.addEventListener('click', function (ev) { var t = ev.target.closest('[data-set]'); if (!t) return; var v = t.dataset.v; st[t.dataset.set] = v === 'true' ? true : v === 'false' ? false : v; G.A.recolorCache = {}; G.V._bg = null; bg.querySelectorAll('[data-set="' + t.dataset.set + '"]').forEach(function (x) { x.classList.toggle('on', x === t); }); G.W.save(S); }); } });
};

// ───── 선택 모달 (용병/아이템) ─────
G.UI.pickMerc = function (title, filter, fn) {
  var S = G.S, list = S.roster.filter(filter || function () { return true; });
  var bg = G.UI.modal(title, '<div class="choices">' + list.map(function (m) { return '<button data-pm="' + m.id + '">' + E(m.name) + ' <span class="dim">' + D.CLASSES[m.cls].name + '</span></button>'; }).join('') + '</div>', [{ t: '취소' }]);
  bg.addEventListener('click', function (ev) { var t = ev.target.closest('[data-pm]'); if (!t) return; bg.remove(); fn(t.dataset.pm); });
};

// ───── 액션 ─────
G.UI.ACT = {
  tab: function (d) { G.UI.tab = d.t; G.UI.render(); },
  sel: function (d) { G.UI.sel = d.id; G.UI.render(); },
  selGo: function (d) { G.UI.sel = d.id; G.UI.tab = 'roster'; G.UI.render(); },
  nextDay: function () { G.W.advanceDay(G.S); G.UI.commit(); },
  nextWeek: function () { G.W.toNextWeek(G.S); G.UI.commit(); },
  settings: function () { G.UI.settings(); },
  save: function () { G.UI.toast(G.W.save(G.S) ? '저장했다.' : '브라우저 저장소에 저장하지 못했다. 파일로 내려받자.'); },
  export: function () {
    var txt = G.W.exportText(G.S);
    var bg = G.UI.modal('저장 내보내기', '<div class="small dim">아래 내용을 복사해 두거나 파일로 내려받자. (웹 미리보기 환경에서는 내려받기가 막힐 수 있다)</div><textarea readonly style="width:100%;height:160px;margin-top:6px;font-size:11px">' + E(txt) + '</textarea>',
      [{ t: '복사', keep: true, fn: function (b) { var ta = b.querySelector('textarea'); try { navigator.clipboard.writeText(txt).then(function () { b.querySelector('h2').textContent = '저장 내보내기 — 복사했다'; }, function () { ta.select(); }); } catch (e) { ta.select(); } } },
       { t: '파일로 내려받기', keep: true, fn: function () { try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = 'migun_save_' + G.S.day + '.json'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { } } },
       { t: '닫기' }]);
  },
  import: function () {
    var load = function (t) { try { G.S = G.W.importText(t); $('modal-root').innerHTML = ''; G.UI.tab = G.S.exp ? 'expedition' : 'roster'; G.UI.commit(); } catch (e) { G.UI.toast('불러오기 실패: ' + e.message); } };
    G.UI.modal('저장 불러오기', '<div class="small dim">내보낸 저장 내용을 붙여넣거나 파일을 고른다.</div><textarea style="width:100%;height:140px;margin-top:6px;font-size:11px" placeholder="여기에 붙여넣기"></textarea><input type="file" accept=".json,.txt" style="margin-top:6px">',
      [{ t: '붙여넣은 내용 불러오기', cls: 'primary', keep: true, fn: function (b) { var t = b.querySelector('textarea').value.trim(); if (t) { b.remove(); load(t); } } }, { t: '취소' }],
      { after: function (b) { b.querySelector('input[type=file]').onchange = function () { var f = this.files[0]; if (!f) return; f.text().then(function (t) { b.remove(); load(t); }); }; } });
  },
  reset: function () { G.UI.modal('새 게임', '지금 진행을 버리고 새로 시작할까? (필요하면 먼저 "저장 내보내기"로 백업하자)', [{ t: '새로 시작', cls: 'danger', fn: function () { try { localStorage.removeItem(G.W.SAVE_KEY); } catch (e) { } $('modal-root').innerHTML = ''; G.S = null; G.UI.newGameScreen(); } }, { t: '취소' }]); },
  newGame: function () {
    var hair = document.querySelector('#ng-hair .on');
    var motive = document.querySelector('input[name=motive]:checked');
    G.S = G.W.newGame({ guildName: $('ng-guild').value.trim() || '잿빛 등불단', name: $('ng-name').value.trim() || '카렐', race: $('ng-race').value, cls: $('ng-cls').value, age: +$('ng-age').value, motive: motive ? motive.value : 'dream', hair: hair ? hair.dataset.hair : null });
    G.UI.tab = 'recruit';
    G.UI.commit();
    G.UI.modal('창단', '<pre>' + E(G.S.guild) + '이(가) 창단됐다.\n\n첫 공고에 지원자가 몰렸다. 모집 탭에서 동료를 영입하고, 훈련장에서 훈련을 배정한 뒤, 전술판에서 진형을 짜고 미궁으로 출정하자.\n\n시간은 "다음 날 / 다음 주까지"로 흐른다. 주간 정산 때 훈련 성장과 주급이 처리된다.</pre>');
  },
  continue: function () { G.S = G.W.load(); if (G.S) { G.UI.tab = 'roster'; G.UI.render(); } },
  notice: function () { G.UI.res(G.W.postNotice(G.S)); G.UI.commit(); },
  hire: function (d) { G.UI.res(G.W.hire(G.S, d.id)); G.UI.commit(); },
  inspect: function (d) { var a = G.S.applicants.filter(function (x) { return x.id === d.id; })[0]; if (a) G.UI.modal('지원자', G.UI.detail(a, false), [{ t: '닫기' }, { t: '영입 (' + a.fee + 'G)', cls: 'primary', fn: function () { G.UI.res(G.W.hire(G.S, a.id)); G.UI.commit(); } }], { wide: true, after: function () { G.UI.afterRender(); } }); },
  release: function (d) { var m = G.W.merc(G.S, d.id); G.UI.modal('계약 해지', E(m.name) + '을(를) 내보낼까? 장비는 창고로 돌아온다.', [{ t: '내보낸다', cls: 'danger', fn: function () { G.UI.res(G.W.release(G.S, d.id)); G.UI.commit(); } }, { t: '취소' }]); },
  payStory: function (d) { G.UI.res(G.W.payStory(G.S, d.id)); G.UI.commit(); },
  changeCls: function (d) {
    var m = G.W.merc(G.S, d.id), C = D.CLASSES[d.c];
    G.UI.modal('전직', E(m.name) + ' — ' + D.CLASSES[m.cls].name + ' → <b>' + C.name + '</b><br>CA ' + Math.round(G.M.ca(m)) + ' → ' + Math.round(G.M.ca(m, d.c)) + ' (잠재력은 그대로. 새 직업 가중치로 다시 계산)<br>적응 기간 ' + G.M.changePenaltyDays(m) + '일 동안 공격·명중 하락<br><span class="small dim">장점: ' + E(C.plus) + ' / 단점: ' + E(C.minus) + '</span>',
      [{ t: '전직한다', cls: 'primary', fn: function () { G.UI.res(G.W.changeClass(G.S, d.id, d.c)); G.UI.commit(); } }, { t: '취소' }]);
  },
  equipOpen: function (d) {
    var S = G.S, m = G.W.merc(S, d.id), items = S.inv.items.filter(function (it) { return it.slot === d.slot; });
    var bg = G.UI.modal('장비 교체 — ' + E(m.name), items.length ? '<table class="t">' + items.map(function (it) { var ok = G.I.canEquip(m, it); return '<tr><td>' + G.UI.itemName(it) + '<div class="small dim">' + E(G.I.desc(it)).replace(/\n/g, '<br>') + '</div></td><td><button class="sm" data-eq="' + it.id + '" ' + (ok ? '' : 'disabled') + '>' + (ok ? '장착' : '착용 불가') + '</button></td></tr>'; }).join('') + '</table>' : '<div class="dim">창고에 맞는 장비가 없다.</div>', [{ t: '닫기' }]);
    bg.addEventListener('click', function (ev) { var t = ev.target.closest('[data-eq]'); if (!t) return; bg.remove(); G.UI.res(G.W.equip(S, d.id, t.dataset.eq)); G.UI.commit(); });
  },
  unequip: function (d) { G.W.unequip(G.S, d.id, d.slot); G.UI.commit(); },
  train: function (d) { var m = G.W.merc(G.S, d.id); G.UI.res(G.W.setTraining(G.S, d.id, !m.training.slot)); G.UI.commit(); },
  custom: function (d) { var m = G.W.merc(G.S, d.id), c = m.training.custom = m.training.custom || [], i = c.indexOf(d.s); if (i >= 0) c.splice(i, 1); else if (c.length < 4) c.push(d.s); G.UI.commit(); },
  cell: function (d) {
    var S = G.S, F = S.tactics.formation, party = G.UI.party();
    var occ = party.filter(function (id) { var f = F[id]; return f && f.row === d.row && String(f.slot) === d.slot; })[0];
    if (G.UI.pick) {
      var from = F[G.UI.pick];
      if (occ && occ !== G.UI.pick) F[occ] = { row: from.row, slot: from.slot };
      F[G.UI.pick] = { row: d.row, slot: +d.slot }; G.UI.pick = null;
    } else if (occ) G.UI.pick = occ;
    G.UI.commit();
  },
  partyToggle: function (d) {
    var S = G.S, p = G.UI.party(), i = p.indexOf(d.id);
    if (i >= 0) p.splice(i, 1); else if (p.length < 6) {
      p.push(d.id);
      var F = S.tactics.formation, used = {}; p.forEach(function (id) { if (id !== d.id && F[id]) used[F[id].row + F[id].slot] = 1; });
      var m = G.W.merc(S, d.id), rows = [D.CLASSES[m.cls].row, 'mid', 'front', 'back'];
      if (!F[d.id] || used[F[d.id].row + F[d.id].slot]) { outer: for (var r = 0; r < rows.length; r++) for (var s = 0; s < 3; s++) if (!used[rows[r] + s]) { F[d.id] = { row: rows[r], slot: s }; break outer; } }
    } else G.UI.toast('출정 인원은 최대 6명이다.');
    if (p.indexOf(S.tactics.leader) < 0 && p.length) S.tactics.leader = p[0];
    G.UI.commit();
  },
  tempo: function (d) { G.S.tactics.tempo = d.v; G.UI.commit(); },
  engage: function (d) { G.S.tactics.engage = d.v; G.UI.commit(); },
  tacticsDone: function () { G.UI.unlockTactics = false; G.UI.tab = 'expedition'; G.UI.commit(); },
  startFloor: function (d) { G.UI.startFloor = +d.v; G.UI.render(); },
  sup: function (d) { var k = d.k; G.UI.supply[k] = Math.max(0, (G.UI.supply[k] || 0) + (+d.d)); G.UI.render(); },
  expStart: function () {
    var S = G.S, ids = G.UI.party().filter(function (id) { var m = G.W.merc(S, id); return m && m.status === 'guild' && G.M.canFight(m); });
    if (!ids.length) return;
    ids.forEach(function (id) { G.W.merc(S, id).training.slot = false; });
    if (ids.indexOf(S.tactics.leader) < 0) S.tactics.leader = ids[0];
    G.UI.fixFormation();
    var fc = G.X.startCost(S, G.UI.startFloor);
    if (S.gold < fc) { G.UI.toast('출발 비용 ' + fc + 'G가 부족하다.'); return; }
    S.gold -= fc; S.yearData.expense += fc;
    G.X.start(S, ids, G.UI.supply, G.UI.startFloor);
    if (fc) G.X.log(S, '길잡이 비용 ' + fc + 'G를 내고 ' + G.UI.startFloor + '층으로 직행했다.');
    G.UI.commit();
  },
  room: function (d) { G.UI.handleRoom(G.X.enter(G.S, +d.i)); },
  camp: function () { G.UI.campModal(false); },
  descend: function () { var r = G.X.descend(G.S); if (!r.ok) G.UI.toast(r.text); G.UI.commit(); },
  retreat: function () {
    var S = G.S, risk = G.X.retreatRisk(S);
    G.UI.modal('귀환', S.exp.atStairs ? '계단의 귀환석으로 안전하게 돌아간다.' : '층 중간에서 물러난다. ' + Math.round(risk * 100) + '% 확률로 퇴로에서 기습을 받는다.', [{ t: '귀환한다', cls: 'primary', fn: function () {
      if (!S.exp.atStairs && G.chance(risk)) { G.UI.modal('기습!', '퇴로에서 몬스터가 덮쳤다!', [{ t: '싸운다', cls: 'danger', fn: function () { var bt = { kind: 'battle', setup: G.X.battleSetup(S, G.C.makeEncounter(S.exp.floor, 'normal'), { kind: 'normal', ambushed: true }) }; G.UI.openBattle(bt, function (res) { var out = G.X.afterBattle(S, res, bt); G.UI.goHome(out.forced === 'wipe' || !G.X.able(S).length ? 'wipe' : 'retreat'); }); } }]); return; }
      G.UI.goHome(S.exp.atStairs ? 'stairs' : 'retreat');
    } }, { t: '취소' }]);
  },
  upgrade: function (d) { G.UI.res(G.W.upgrade(G.S, d.k)); G.UI.commit(); },
  banquet: function () { var r = G.W.banquet(G.S); G.UI.toast(r.text); G.UI.commit(); },
  craft: function (d) { G.UI.res(G.W.craft(G.S, d.k, 1)); G.UI.commit(); },
  surgery: function (d) { G.UI.res(G.W.surgery(G.S, d.id, +d.i)); G.UI.commit(); },
  inherit: function (d) {
    var S = G.S, dd = S.dead[+d.i], opts = G.W.inheritOptions(S, dd);
    var newbies = S.roster.filter(function (m) { return S.day - m.hist.joined <= 28; });
    if (!newbies.length) { G.UI.toast('입단 4주 이내의 신입이 없다.'); return; }
    var bg = G.UI.modal('유품 계승 — ' + E(dd.merc.name), '<label class="small gold">계승할 특성</label><div class="choices">' + (opts.length ? opts.map(function (t, i) { return '<button class="sm ' + (i === 0 ? 'on' : '') + '" data-it="' + t + '">' + D.TRAITS[t].name + '</button>'; }).join('') : '<span class="dim">특성 없음 (서사만)</span>') + '</div>' +
      '<label class="small gold">받을 신입</label><div class="choices">' + newbies.map(function (m) { return '<button class="sm" data-to="' + m.id + '">' + E(m.name) + '</button>'; }).join('') + '</div>', [{ t: '취소' }]);
    var chosen = opts[0] || null;
    bg.addEventListener('click', function (ev) { var t = ev.target.closest('[data-it]'); if (t) { chosen = t.dataset.it; bg.querySelectorAll('[data-it]').forEach(function (x) { x.classList.toggle('on', x === t); }); } var to = ev.target.closest('[data-to]'); if (to) { bg.remove(); G.UI.res(G.W.inherit(S, +d.i, chosen, to.dataset.to)); G.UI.commit(); } });
  },
  buy: function (d) { G.UI.res(G.W.buyShop(G.S, d.id)); G.UI.commit(); },
  buyCons: function (d) { G.UI.res(G.W.buyCons(G.S, d.k, +d.n)); G.UI.commit(); },
  sellStones: function (d) { G.W.sellStones(G.S, +d.n); G.UI.commit(); },
  buyMarket: function (d) { G.UI.res(G.W.buyMarket(G.S, d.kind, +d.i)); G.UI.commit(); },
  bid: function (d) { var v = +document.getElementById('bid-' + d.id).value; G.UI.res(G.W.bid(G.S, d.id, v)); G.UI.commit(); },
  sell: function (d) { G.W.sellItem(G.S, d.id); G.UI.commit(); },
  relic: function (d) { G.UI.res(G.W.toggleRelic(G.S, d.k)); G.UI.commit(); },
  relicSell: function (d) { G.W.sellRelic(G.S, d.k); G.UI.commit(); },
  book: function (d) { G.UI.pickMerc('스킬북을 읽힐 용병', null, function (id) { G.UI.res(G.W.useBook(G.S, +d.i, id)); G.UI.commit(); }); },
  statItem: function (d) { G.UI.pickMerc('물약을 쓸 용병', null, function (id) { G.UI.res(G.W.useStatItem(G.S, +d.i, id)); G.UI.commit(); }); },
  inboxFilter: function (d) { G.UI.inboxFilter = d.f; G.UI.render(); },
  inboxRead: function () { G.S.inbox.forEach(function (n) { n.read = true; n.pop = false; }); G.UI.render(); },
  bondTalk: function (d) { G.UI.bondModal(d.a, d.b, d.i); },
  reportOpen: function (d) { G.UI.reportModal(G.S.reports.filter(function (r) { return r.id === d.id; })[0]); },
  hireCoach: function (d) { G.UI.res(G.W.hireCoach(G.S, d.id)); G.UI.commit(); },
  fireCoach: function (d) { G.UI.modal('코치 해고', '이 코치를 내보낼까? (계약금은 돌려받지 못한다)', [{ t: '해고', cls: 'danger', fn: function () { G.W.fireCoach(G.S, d.id); G.UI.commit(); } }, { t: '취소' }]); },
  quirkRemove: function (d) { G.UI.res(G.W.quirkRemove(G.S, d.id, d.q)); G.UI.commit(); },
  quirkLock: function (d) { G.UI.res(G.W.quirkLock(G.S, d.id, d.q)); G.UI.commit(); },
  qsel: function (d) { var q = G.S.quests.filter(function (x) { return x.id === d.q; })[0], s = G.UI.qsel[d.q] = G.UI.qsel[d.q] || [], i = s.indexOf(d.id); if (i >= 0) s.splice(i, 1); else if (s.length < q.size) s.push(d.id); G.UI.render(); },
  qskip: function (d) { var r = G.W.questSkip(G.S, d.q, G.UI.qsel[d.q] || []); delete G.UI.qsel[d.q]; if (r.ok) G.UI.modal(r.success ? '의뢰 성공' : '의뢰 실패', '<pre>' + E(r.text) + '</pre>', [{ t: '확인', fn: function () { G.UI.commit(); } }]); else { G.UI.res(r); G.UI.commit(); } },
  qfight: function (d) {
    var S = G.S, b = G.W.questBattle(S, d.q, G.UI.qsel[d.q] || []); if (!b) { G.UI.toast('출전할 수 없는 용병이 있다.'); return; }
    delete G.UI.qsel[d.q];
    G.UI.openBattle(b, function (res) { var t = G.W.questBattleDone(S, d.q, res); var rp = G.Social.storeReport(S, res, { floor: 0, kind: 'quest' }); G.UI.modal('의뢰 결과', '<pre>' + E(t) + '</pre>', [{ t: '확인', fn: function () { G.UI.commit(); } }, { t: '전투 리포트', keep: true, fn: function () { G.UI.reportModal(rp); } }]); });
  }
};
G.UI.CHG = {
  tac: function (d, v) { var m = G.W.merc(G.S, d.id); m.tactic[d.k] = d.k === 'potion' ? +v : v; G.UI.commit(); },
  prog: function (d, v) { var m = G.W.merc(G.S, d.id); m.training.program = v; if (v === 'change' && !m.training.target) m.training.target = 'spellblade'; G.UI.commit(); },
  inten: function (d, v) { G.W.merc(G.S, d.id).training.intensity = v; G.UI.commit(); },
  trainTarget: function (d, v) { G.W.merc(G.S, d.id).training.target = v; G.UI.commit(); },
  startFloor: function (d, v) { G.UI.startFloor = +v; G.UI.render(); },
  leader: function (d, v) { G.S.tactics.leader = v; G.UI.commit(); }
};
G.UI.bind = function () {
  document.addEventListener('click', function (ev) {
    var hb = ev.target.closest('[data-hair]'); if (hb) { document.querySelectorAll('#ng-hair button').forEach(function (b) { b.classList.toggle('on', b === hb); }); return; }
    var el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
    if (el.closest('#battle-root')) return;
    var fn = G.UI.ACT[el.dataset.act]; if (fn) fn(el.dataset, el);
  });
  document.addEventListener('change', function (ev) { var el = ev.target.closest('[data-chg]'); if (!el) return; var fn = G.UI.CHG[el.dataset.chg]; if (fn) fn(el.dataset, el.value); });
  var tip = $('tip');
  document.addEventListener('mouseover', function (ev) { var el = ev.target.closest('[data-tip]'); if (!el) { tip.hidden = true; return; } tip.textContent = el.dataset.tip; tip.hidden = false; });
  document.addEventListener('mousemove', function (ev) { if (tip.hidden) return; var x = ev.clientX + 14, y = ev.clientY + 14; if (x + 330 > innerWidth) x = ev.clientX - 334; if (y + tip.offsetHeight > innerHeight) y = ev.clientY - tip.offsetHeight - 10; tip.style.left = x + 'px'; tip.style.top = y + 'px'; });
};
