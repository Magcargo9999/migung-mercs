// 알림 센터 · 용병 서포트(관계) · 퀴크(붕괴·미덕) · 훈련 코치 · 전투 리포트
var G = window.G = window.G || {};
var D = G.D;
G.Social = {};
var SO = G.Social;

// ───────────── 데이터 ─────────────
// 퀴크: 긴장 한계를 넘은 경험에서 굳어지는 성향 특성 (type 'quirk'). 주점에서 고정/제거.
D.TRAITS.coward = { name: '겁쟁이', type: 'quirk', pts: 0, neg: true, desc: '긴장 상승 +25%, 명중 −4. (공황·위축을 겪고 굳어진 성향)' };
D.TRAITS.temper = { name: '격정', type: 'quirk', pts: 0, neg: true, desc: '호전성 +3, 지시 수행력 −8%p. (분노를 겪고 굳어진 성향)' };
D.TRAITS.paranoid = { name: '의심증', type: 'quirk', pts: 0, neg: true, desc: '지시 수행력 −10%p. (의심에 빠졌던 경험)' };
D.TRAITS.stout = { name: '담대함', type: 'quirk', pts: 0, desc: '긴장 상승 −20%. (결의를 보인 경험)' };
D.TRAITS.fervor = { name: '투지', type: 'quirk', pts: 0, desc: '공격력·마법 공격력 +8%. (각성을 겪은 경험)' };
D.TRAITS.serene = { name: '평온', type: 'quirk', pts: 0, desc: '전투 시작 시 긴장 −2. (평정을 찾은 경험)' };
D.MINDS = {
  panic: { name: '공황', good: false, desc: '행동의 절반을 허둥대며 낭비한다.' },
  rage: { name: '분노', good: false, desc: '공격 +25%, 방어 −15%. 가끔 아군에게 칼을 휘두른다.' },
  fear: { name: '위축', good: false, desc: '명중 −15, 속도 −15%, 행동의 30%를 포기한다.' },
  doubt: { name: '의심', good: false, desc: '팀워크가 0이 되어 지시를 거의 따르지 않는다.' },
  awaken: { name: '각성', good: true, desc: '공격 +25%, 치명타 +10. 긴장이 크게 가라앉는다.' },
  resolve: { name: '결의', good: true, desc: '방어 +20%. 파티 전원의 긴장이 −2 가라앉는다.' },
  calm: { name: '평정', good: true, desc: '긴장이 4로 내려가고 파티가 안정된다. 스킬 대기시간 초기화.' }
};
D.MIND_QUIRK = { panic: 'coward', fear: 'coward', rage: 'temper', doubt: 'paranoid', awaken: 'fervor', resolve: 'stout', calm: 'serene' };
D.BUILDINGS.tavern.lv = ['하루 긴장 −0.6', '하루 긴장 −0.9, 연회(전원 긴장 해소), 퀴크 제거', '하루 긴장 −1.3, 고급 목욕탕, 좋은 퀴크 고정'];
D.COACH = {
  body: { name: '전투·체력 코치', stats: ['str', 'agi', 'con', 'sta', 'rec', 'dex'], k: 1 },
  magic: { name: '마도 코치', stats: ['mag', 'int'], k: 1 },
  mind: { name: '정신·지휘 코치', stats: ['com', 'jud', 'tea', 'lea', 'vis', 'ada'], k: 1 },
  general: { name: '종합 코치', stats: null, k: 0.6 }
};
D.BOND_RANK = [0, 8, 24, 50];
D.BOND_NAME = ['', 'C', 'B', 'A'];
D.BOND_FX = ['', '인접 시 피해·방어 +3%', '인접 시 피해·방어 +6%', '인접 시 피해·방어 +9%, 큰 피해를 25% 확률로 대신 맞아 줌'];
D.FRICTION = [['elf', 'dwarf'], ['elf', 'demon'], ['dwarf', 'demon']];
D.NOTE_KIND = { growth: '성장', injury: '부상', death: '전사', mind: '멘탈', bond: '관계', quirk: '성향', staff: '스태프', story: '서사', guild: '길드', battle: '전투' };

// ───────────── 상태 보장 ─────────────
SO.ensure = function (S) {
  S.inbox = S.inbox || []; S.bonds = S.bonds || {}; S.reports = S.reports || []; S.coaches = S.coaches || []; S.coachPool = S.coachPool || [];
  S.roster.forEach(function (m) { m.locked = m.locked || []; });
  return S;
};

// ───────────── 알림 센터 ─────────────
// o: {kind, sev:'good'|'info'|'warn'|'bad', title, text, mid, imp:0|1|2, ref}
G.W.notify = function (S, o) {
  S = S || G.S; if (!S) return null; S.inbox = S.inbox || [];
  var n = { id: G.uid(), d: S.day, k: o.kind || 'guild', s: o.sev || 'info', t: o.title, x: o.text || '', m: o.mid || null, imp: o.imp | 0, read: false, pop: (o.imp | 0) >= 1, ref: o.ref || null };
  S.inbox.unshift(n); if (S.inbox.length > 300) S.inbox.pop();
  return n;
};
SO.unread = function (S) { return (S.inbox || []).filter(function (n) { return !n.read; }).length; };
SO.statList = function (pen) { return Object.keys(pen).map(function (s) { return D.STAT_NAME[s] + ' ' + pen[s]; }).join(', '); };
SO.mercLine = function (m) { return D.RACES[m.race].name + ' ' + D.CLASSES[m.cls].name + ', ' + m.age + '세, CA ' + Math.round(G.M.ca(m)); };
SO.injuryNotice = function (S, m, j, where) {
  var sevName = ['', '경상', '중상', '치명상'][j.sev];
  G.W.notify(S, { kind: 'injury', sev: j.sev >= 3 ? 'bad' : 'warn', imp: j.sev >= 2 ? 2 : 0, mid: m.id, title: m.name + ' — ' + sevName + ': ' + j.name,
    text: (where || j.cause || '') + '. 회복까지 약 ' + j.days + '일. 능력 저하: ' + SO.statList(j.pen) + '.' + (j.sev >= 3 ? ' 의무실 단계와 약초·물약으로 회복을 앞당길 수 있다.' : '') });
};

// ───────────── 퀴크 / 붕괴·미덕 ─────────────
SO.quirks = function (m) { return m.traits.filter(function (t) { return D.TRAITS[t] && D.TRAITS[t].type === 'quirk'; }); };
SO.isLocked = function (m, q) { return (m.locked || []).indexOf(q) >= 0; };
SO.hasQ = function (m, q) { return m.traits.indexOf(q) >= 0; };
// 전투 중 긴장이 한계(16)를 넘었을 때 어떤 상태가 되는가
SO.rollMind = function (m) {
  var com = G.M.stat(m, 'com'), luk = G.M.stat(m, 'luk'), agg = m.agg, vis = G.M.stat(m, 'vis'), jud = G.M.stat(m, 'jud'), lea = G.M.stat(m, 'lea'), gen = G.M.stat(m, 'gen');
  var pv = G.clamp(0.12 + (com - 8) * 0.012 + luk * 0.004 + (G.M.has(m, 'optimist') ? 0.08 : 0) + (SO.hasQ(m, 'stout') ? 0.08 : 0) - (SO.hasQ(m, 'coward') ? 0.06 : 0), 0.04, 0.45);
  if (G.chance(pv)) {
    return G.wpick({ resolve: 2 + lea * 0.5, awaken: 2 + agg * 0.4 + gen * 0.3, calm: 2 + com * 0.4 });
  }
  return G.wpick({
    rage: 1 + agg * 0.6 + (G.M.has(m, 'hothead') ? 8 : 0) + (SO.hasQ(m, 'temper') ? 6 : 0) + (m.cls === 'berserker' ? 5 : 0),
    panic: 1 + Math.max(0, 16 - com) * 0.8 + (SO.hasQ(m, 'coward') ? 6 : 0),
    fear: 3 + Math.max(0, 14 - vis) * 0.5,
    doubt: 1 + Math.max(0, 14 - jud) * 0.6 + (SO.hasQ(m, 'paranoid') ? 6 : 0)
  });
};
SO.applyQuirks = function (u, m) {
  if (SO.hasQ(m, 'coward')) u.hit -= 4;
  if (SO.hasQ(m, 'temper')) u.agg = Math.min(20, u.agg + 3);
  if (SO.hasQ(m, 'fervor')) { u.atk *= 1.08; u.mat *= 1.08; }
  if (SO.hasQ(m, 'serene')) u.ten = Math.max(0, u.ten - 2);
};
SO.tenMul = function (m) { return (SO.hasQ(m, 'coward') ? 1.25 : 1) * (SO.hasQ(m, 'stout') ? 0.8 : 1); };
SO.obeyMod = function (m) { return (SO.hasQ(m, 'paranoid') ? -0.10 : 0) + (SO.hasQ(m, 'temper') ? -0.08 : 0); };
SO.gainQuirk = function (S, m, q, why) {
  if (SO.hasQ(m, q)) return false;
  m.locked = m.locked || [];
  var cur = SO.quirks(m);
  if (cur.length >= 3) {
    var drop = cur.filter(function (t) { return !SO.isLocked(m, t); })[0];
    if (!drop) return false;
    m.traits = m.traits.filter(function (t) { return t !== drop; });
    G.W.notify(S, { kind: 'quirk', sev: 'info', mid: m.id, title: m.name + ' — [' + D.TRAITS[drop].name + '] 성향이 옅어졌다', text: '새 성향이 자리를 잡으면서 고정되지 않은 [' + D.TRAITS[drop].name + ']이(가) 사라졌다.' });
  }
  m.traits.push(q); G.W.codex(S, 'traits', q);
  var T = D.TRAITS[q];
  G.W.notify(S, { kind: 'quirk', sev: T.neg ? 'warn' : 'good', imp: 1, mid: m.id, title: m.name + ' — 새 성향 [' + T.name + ']', text: why + ' ' + T.desc + (T.neg ? ' 주점(2단계)에서 제거할 수 있다.' : ' 고정하지 않으면 시간이 지나 사라질 수 있다. 주점(3단계)에서 고정할 수 있다.') });
  return true;
};
G.W.quirkRemove = function (S, mid, q) {
  var m = G.W.merc(S, mid); if (!m || !SO.hasQ(m, q)) return { ok: false };
  if (S.buildings.tavern < 2) return { ok: false, text: '주점 2단계가 필요하다.' };
  if (m.status !== 'guild') return { ok: false, text: '원정 중에는 받을 수 없다.' };
  var gold = SO.isLocked(m, q) ? 700 : 350, st = SO.isLocked(m, q) ? 6 : 3;
  if (S.gold < gold || S.stones < st) return { ok: false, text: '필요: ' + gold + 'G, 마석 ' + st };
  S.gold -= gold; S.stones -= st; S.yearData.expense += gold;
  m.traits = m.traits.filter(function (t) { return t !== q; }); m.locked = (m.locked || []).filter(function (t) { return t !== q; });
  G.W.notify(S, { kind: 'quirk', sev: 'info', mid: m.id, title: m.name + ' — [' + D.TRAITS[q].name + '] 제거', text: '주점 주인의 도움으로 마음을 정리했다. (' + gold + 'G, 마석 ' + st + ')' });
  return { ok: true };
};
G.W.quirkLock = function (S, mid, q) {
  var m = G.W.merc(S, mid); if (!m || !SO.hasQ(m, q)) return { ok: false };
  if (S.buildings.tavern < 3) return { ok: false, text: '주점 3단계가 필요하다.' };
  if (D.TRAITS[q].neg) return { ok: false, text: '나쁜 성향은 고정할 수 없다.' };
  if (SO.isLocked(m, q)) return { ok: false, text: '이미 고정됐다.' };
  if ((m.locked || []).length >= 2) return { ok: false, text: '용병 한 명당 2개까지 고정할 수 있다.' };
  if (m.status !== 'guild') return { ok: false, text: '원정 중에는 받을 수 없다.' };
  if (S.gold < 500 || S.stones < 6) return { ok: false, text: '필요: 500G, 마석 6' };
  S.gold -= 500; S.stones -= 6; S.yearData.expense += 500;
  m.locked = (m.locked || []).concat([q]);
  G.W.notify(S, { kind: 'quirk', sev: 'good', mid: m.id, title: m.name + ' — [' + D.TRAITS[q].name + '] 고정', text: '이 성향은 이제 쉽게 사라지지 않는다. (500G, 마석 6)' });
  return { ok: true };
};
SO.weeklyQuirks = function (S) {
  S.roster.forEach(function (m) {
    SO.quirks(m).forEach(function (q) {
      if (D.TRAITS[q].neg || SO.isLocked(m, q)) return;
      if (G.chance(0.05)) {
        m.traits = m.traits.filter(function (t) { return t !== q; });
        G.W.notify(S, { kind: 'quirk', sev: 'info', mid: m.id, title: m.name + ' — [' + D.TRAITS[q].name + '] 기세가 사그라들었다', text: '고정하지 않은 좋은 성향은 시간이 지나면 사라질 수 있다.' });
      }
    });
  });
};

// ───────────── 서포트(관계) ─────────────
SO.key = function (a, b) { return a < b ? a + '|' + b : b + '|' + a; };
SO.rankOf = function (pts) { var r = 0; for (var i = 1; i < D.BOND_RANK.length; i++) if (pts >= D.BOND_RANK[i]) r = i; return r; };
SO.get = function (S, a, b) { return (S.bonds || {})[SO.key(a, b)]; };
SO.rank = function (S, a, b) { var o = SO.get(S, a, b); return o ? SO.rankOf(o.p) : 0; };
SO.friction = function (ma, mb) {
  for (var i = 0; i < D.FRICTION.length; i++) { var f = D.FRICTION[i]; if ((ma.race === f[0] && mb.race === f[1]) || (ma.race === f[1] && mb.race === f[0])) return true; }
  var pir = function (x, y) { return G.M.has(x, 'pirate') && (y.cls === 'knight' || y.cls === 'priest'); };
  return pir(ma, mb) || pir(mb, ma);
};
SO.ranks = function (S) { var o = {}; for (var k in S.bonds) { var r = SO.rankOf(S.bonds[k].p); if (r > 0) o[k] = r; } return o; };
SO.partners = function (S, id) {
  var out = [];
  for (var k in S.bonds) { var ids = k.split('|'); if (ids.indexOf(id) < 0) continue; var other = ids[0] === id ? ids[1] : ids[0]; out.push({ id: other, b: S.bonds[k], rank: SO.rankOf(S.bonds[k].p), key: k }); }
  return out.sort(function (a, b) { return b.b.p - a.b.p; });
};
// 두 용병 사이의 첫 대사 (직업·성향별)
SO.CLS_LINE = { swordsman: '앞은 내가 맡을게.', knight: '내 방패 뒤에 있어.', rogue: '등 뒤는 신경 쓰지 마. 내가 본다.', archer: '네 어깨 너머로 쏠게. 움직이지 마.', priest: '다치면 말해. 숨기지 말고.', mage: '내 주문에 맞지 않게 조심해.', lancer: '내 창이 닿는 곳이 네 안전지대야.', elementalist: '바람이 네 편이라고 하네.', bard: '이 노래, 네 이야기로 지어도 될까?', berserker: '네가 쓰러지면 내가 다 부술게.', hunter: '짐승보다 사람이 더 무섭더라. 너는 괜찮아.', alchemist: '새로 만든 건데 먼저 써 봐. 아마 괜찮을 거야.', warlock: '나를 무서워하지 않는 건 너뿐이군.', spellblade: '검도 마법도 네 곁에서 가장 잘 선다.', monk: '숨을 고르면 돼. 같이 하자.' };
SO.talk = function (S, ma, mb, rank) {
  var A = ma.name.split(' ')[0], B = mb.name.split(' ')[0];
  var L = [];
  if (rank === 1) {
    L.push(A + ': 오늘 전투, 고마웠어. 네가 옆에 있으니 덜 무섭더라.');
    L.push(B + ': ' + (SO.CLS_LINE[mb.cls] || '나도 마찬가지야.'));
    L.push('둘은 어색하게 웃고는 각자의 장비를 손질했다.');
  } else if (rank === 2) {
    L.push(B + ': 지난번에 내가 쓰러졌을 때, 네가 먼저 달려왔다고 들었어.');
    L.push(A + ': ' + (SO.CLS_LINE[ma.cls] || '당연한 거지.'));
    L.push(B + ': …다음엔 내가 먼저 갈게. 약속이야.');
  } else {
    L.push(A + ': 미궁에서 몇 번이나 죽을 뻔했는지 세어 봤어. 그때마다 네가 있었어.');
    L.push(B + ': 나도 마찬가지야. ' + (SO.CLS_LINE[mb.cls] || ''));
    L.push('이제 둘은 말없이도 서로의 간격과 호흡을 안다. 길드의 모두가 그것을 안다.');
  }
  return L;
};
SO.add = function (S, a, b, pts, why) {
  if (a === b) return;
  var ma = G.W.merc(S, a), mb = G.W.merc(S, b); if (!ma || !mb) return;
  var k = SO.key(a, b), o = S.bonds[k] || (S.bonds[k] = { p: 0, talks: [] });
  if (pts > 0 && SO.friction(ma, mb)) pts *= 0.5;
  var before = SO.rankOf(o.p);
  o.p = Math.max(0, o.p + pts);
  var after = SO.rankOf(o.p);
  if (after > before) {
    var lines = SO.talk(S, ma, mb, after);
    o.talks.push({ r: after, d: S.day, lines: lines });
    G.W.notify(S, { kind: 'bond', sev: 'good', imp: 2, mid: a, title: ma.name + ' ♥ ' + mb.name + ' — 서포트 ' + D.BOND_NAME[after] + ' 달성', text: (why || '') + ' 효과: ' + D.BOND_FX[after] + '. 대화가 열렸다.', ref: { a: a, b: b, i: o.talks.length - 1 } });
  } else if (after < before) {
    G.W.notify(S, { kind: 'bond', sev: 'warn', imp: 1, mid: a, title: ma.name + ' · ' + mb.name + ' — 서포트가 ' + D.BOND_NAME[after || 0] + '로 약해졌다', text: why || '' });
  }
};
// 전투 후: 함께 살아남은 쌍마다 서포트 상승 (인접 배치·정예/보스 승리 가산)
SO.afterBattle = function (S, res, battle, win) {
  var kind = battle.setup.kind, ps = res.units.filter(function (u) { return u.side === 'p' && u.merc && !u.summon; });
  for (var i = 0; i < ps.length; i++) for (var j = i + 1; j < ps.length; j++) {
    var A = ps[i], B = ps[j]; if (!A.alive || !B.alive) continue;
    var pts = 0.8 + (win ? 0.5 : 0) + (SO.adjacent(A, B) ? 0.8 : 0) + (win && (kind === 'elite' || kind === 'boss') ? 1.2 : 0);
    SO.add(S, A.merc.id, B.merc.id, pts, '함께 싸우고 살아남았다.');
  }
};
SO.adjacent = function (a, b) {
  var R = { front: 0, mid: 1, back: 2 };
  return (a.row === b.row && Math.abs(a.slot - b.slot) === 1) || (a.slot === b.slot && Math.abs(R[a.row] - R[b.row]) === 1);
};
SO.weekly = function (S) {
  var home = S.roster.filter(function (m) { return m.status === 'guild'; });
  var bestAda = Math.max.apply(null, home.map(function (m) { return G.M.stat(m, 'ada'); }).concat([0]));
  for (var i = 0; i < home.length; i++) for (var j = i + 1; j < home.length; j++) {
    var a = home[i], b = home[j];
    if (a.training.slot && b.training.slot) SO.add(S, a.id, b.id, 0.5, '같이 훈련하며 땀을 흘렸다.');
    if (SO.friction(a, b) && G.chance(0.03 * (1 - bestAda / 25))) {
      var o = SO.get(S, a.id, b.id);
      G.M.addTension(a, 1.5); G.M.addTension(b, 1.5);
      var med = home.filter(function (x) { return x !== a && x !== b && G.M.stat(x, 'ada') >= 14; })[0];
      G.W.notify(S, { kind: 'bond', sev: 'warn', imp: 1, mid: a.id, title: a.name + ' · ' + b.name + ' — 말다툼', text: D.RACES[a.race].name + '과(와) ' + D.RACES[b.race].name + '의 오래된 불편함이 터졌다. 둘의 긴장이 올랐다.' + (med ? ' (' + med.name + '이(가) 말려서 더 커지지는 않았다.)' : ' 적응력이 높은 동료가 있으면 이런 일이 줄어든다.') });
      if (o && o.p > 0) SO.add(S, a.id, b.id, med ? -1 : -3, '다툼의 여파로');
    }
  }
};
SO.onDeath = function (S, m, cause) {
  SO.partners(S, m.id).forEach(function (p) {
    var o = G.W.merc(S, p.id); if (!o || p.rank < 1) return;
    var ten = 2 + p.rank * 2;
    G.M.addTension(o, ten);
    G.W.notify(S, { kind: 'bond', sev: 'bad', imp: 2, mid: o.id, title: o.name + ' — ' + m.name + '의 죽음에 무너졌다', text: '서포트 ' + D.BOND_NAME[p.rank] + '였던 동료를 잃었다. 긴장이 ' + Math.round(ten) + ' 올랐다. 주점과 묘지가 위로가 된다.' });
  });
};
SO.dropBonds = function (S, id) { for (var k in S.bonds) if (k.split('|').indexOf(id) >= 0) delete S.bonds[k]; };

// ───────────── 훈련 코치 ─────────────
SO.genCoach = function (S) {
  var fi = G.W.fameIdx(S), q = G.clamp(Math.round(1 + fi * 0.55 + G.rand(-0.9, 1.3)), 1, 5), spec = G.pick(['body', 'body', 'magic', 'mind', 'mind', 'general']);
  return { id: G.uid(), name: G.M.genName(), spec: spec, q: q, wage: 30 + q * 22, age: G.randi(32, 62), since: 0 };
};
SO.refreshCoaches = function (S) { S.coachPool = []; for (var i = 0; i < 3; i++) S.coachPool.push(SO.genCoach(S)); };
SO.coachSlots = function (S) { return [1, 2, 3][S.buildings.training - 1]; };
G.W.hireCoach = function (S, id) {
  var c = S.coachPool.filter(function (x) { return x.id === id; })[0]; if (!c) return { ok: false };
  if (S.coaches.length >= SO.coachSlots(S)) return { ok: false, text: '코치 자리가 없다. 훈련장을 증축하면 자리가 늘어난다.' };
  var fee = c.wage * 4; if (S.gold < fee) return { ok: false, text: '계약금 ' + fee + 'G가 필요하다.' };
  S.gold -= fee; S.yearData.expense += fee; c.since = S.day;
  S.coachPool = S.coachPool.filter(function (x) { return x !== c; }); S.coaches.push(c);
  G.W.notify(S, { kind: 'staff', sev: 'good', imp: 1, title: '코치 영입: ' + c.name, text: D.COACH[c.spec].name + ' ' + '★'.repeat(c.q) + ' — 주 ' + c.wage + 'G. ' + SO.coachDesc(c) });
  return { ok: true };
};
G.W.fireCoach = function (S, id) {
  var c = S.coaches.filter(function (x) { return x.id === id; })[0]; if (!c) return { ok: false };
  S.coaches = S.coaches.filter(function (x) { return x !== c; });
  G.W.notify(S, { kind: 'staff', sev: 'info', title: '코치 해고: ' + c.name, text: '계약을 끝냈다.' });
  return { ok: true };
};
SO.coachDesc = function (c) {
  var C = D.COACH[c.spec], pct = Math.round(7 * c.q * C.k);
  return (C.stats ? C.stats.map(function (s) { return D.STAT_NAME[s]; }).join('·') : '모든 스탯') + ' 성장 +' + pct + '%' + (c.spec === 'body' ? ', 강행 훈련 부상 확률 −' + c.q * 6 + '%' : '');
};
// 스탯별 성장 배율 (같은 분야 최고 코치 + 나머지 절반)
SO.coachMul = function (S, stat) {
  var gains = [];
  (S.coaches || []).forEach(function (c) { var C = D.COACH[c.spec]; if (!C.stats || C.stats.indexOf(stat) >= 0) gains.push(0.07 * c.q * C.k); });
  if (!gains.length) return 1;
  gains.sort(function (a, b) { return b - a; });
  var t = gains[0]; for (var i = 1; i < gains.length; i++) t += gains[i] * 0.5;
  return 1 + Math.min(0.6, t);
};
SO.injMul = function (S) { var q = 0; (S.coaches || []).forEach(function (c) { if (c.spec === 'body') q = Math.max(q, c.q); }); return 1 - q * 0.06; };
SO.coachWages = function (S) { return (S.coaches || []).reduce(function (t, c) { return t + c.wage; }, 0); };
SO.payCoaches = function (S) {
  var w = SO.coachWages(S); if (!w) return;
  if (S.gold >= w) { S.gold -= w; S.yearData.expense += w; return; }
  var c = S.coaches.shift();
  G.W.notify(S, { kind: 'staff', sev: 'bad', imp: 1, title: '코치 ' + c.name + ' 사직', text: '급료를 받지 못해 떠났다.' });
};

// ───────────── 주간 훈련 성장 알림 ─────────────
SO.growthNotice = function (S, m, before, caB, gains) {
  var caA = G.M.ca(m), dCA = caA - caB, lines = [], mile = [];
  Object.keys(gains).forEach(function (s) {
    var b = Math.floor(before[s]), a = Math.floor(m.stats[s]);
    if (a > b) { lines.push(D.STAT_NAME[s] + ' ' + b + ' → ' + a); [10, 15, 18, 20].forEach(function (t) { if (b < t && a >= t) mile.push(D.STAT_NAME[s] + ' ' + t); }); }
  });
  if (dCA >= 1.5 || mile.length) {
    G.W.notify(S, { kind: 'growth', sev: 'good', imp: mile.length || dCA >= 2.5 ? 2 : 1, mid: m.id, title: m.name + ' — ' + (mile.length ? '재능이 꽃피었다 (' + mile.join(', ') + ')' : '눈에 띄는 성장'),
      text: '이번 주 CA ' + Math.round(caB) + ' → ' + Math.round(caA) + ' (+' + (Math.round(dCA * 10) / 10) + ')' + (lines.length ? '. ' + lines.join(', ') : '') + '.' });
  }
};

// ───────────── 전투 리포트 ─────────────
SO.analyze = function (rp) {
  var notes = [], us = rp.units, tot = 0, dis = 0;
  us.forEach(function (u) { tot += u.n; dis += u.dis.length; });
  var firstKO = us.filter(function (u) { return u.ko != null; }).sort(function (a, b) { return a.ko - b.ko; })[0];
  if (rp.res !== 'win' && firstKO) notes.push('가장 먼저 쓰러진 사람은 ' + firstKO.name + '(' + D.CLASSES[firstKO.cls].name + ', ' + firstKO.rowName + ')이며 ' + firstKO.ko + '번째 행동 즈음이었다.');
  if (rp.res !== 'win' && rp.boss && D.BOSSES[rp.boss]) notes.push('보스 공략 힌트: ' + D.BOSSES[rp.boss].counter);
  if (tot && dis / tot >= 0.2) {
    var worst = us.slice().sort(function (a, b) { return b.dis.length - a.dis.length; })[0];
    var causes = {}; us.forEach(function (u) { u.dis.forEach(function (d) { var k = d.why.split(' (')[0].replace(/ \d+$/, ''); causes[k] = (causes[k] || 0) + 1; }); });
    var top = Object.keys(causes).sort(function (a, b) { return causes[b] - causes[a]; })[0];
    notes.push('지시 불복종이 전체 행동의 ' + Math.round(dis / tot * 100) + '%였다. 가장 많은 사람은 ' + worst.name + '(' + worst.dis.length + '회), 주된 원인은 [' + top + '].');
  }
  var tenAvg = G.avg(us.map(function (u) { return u.tm; }));
  if (tenAvg >= 13) notes.push('전투 중 평균 최고 긴장이 ' + Math.round(tenAvg) + '까지 올랐다. 출정 전 긴장을 낮추거나(주점·연회), 야영에서 격려·정신 안정 물약을 쓰자.');
  var fk = []; us.forEach(function (u) { u.fk.forEach(function (f) { fk.push(u.name + ' → ' + f.to + ' (' + f.why + ')'); }); });
  if (fk.length) notes.push('아군 오사 ' + fk.length + '회: ' + fk.join(', ') + '.');
  var minds = []; us.forEach(function (u) { u.minds.forEach(function (m) { minds.push(u.name + ' [' + D.MINDS[m.k].name + ']'); }); });
  if (minds.length) notes.push('긴장 한계 돌파: ' + minds.join(', ') + '. 전투 뒤 성향(퀴크)으로 굳어질 수 있다.');
  var healer = us.some(function (u) { return u.cls === 'priest' || u.heal > 0; });
  var dmgTaken = us.reduce(function (t, u) { return t + u.taken; }, 0);
  if (!healer && dmgTaken > 0 && rp.res !== 'win') notes.push('치유 수단이 없었다. 사제·물약 설정(HP 몇 % 이하)을 점검하자.');
  var dealt = us.reduce(function (t, u) { return t + u.dealt; }, 0), topD = us.slice().sort(function (a, b) { return b.dealt - a.dealt; })[0];
  if (dealt > 0 && topD && topD.dealt / dealt > 0.5 && us.length >= 3) notes.push('피해량의 ' + Math.round(topD.dealt / dealt * 100) + '%를 ' + topD.name + '이(가) 맡았다. 딜 편중: 이 용병이 쓰러지면 승부가 크게 흔들린다.');
  if (!notes.length) notes.push(rp.res === 'win' ? '큰 문제 없이 이겼다.' : '특별한 원인이 보이지 않는다. 장비·CA가 권장 수준에 못 미쳤을 수 있다.');
  return notes;
};
SO.storeReport = function (S, res, meta) {
  if (!res.report) return null;
  var rp = res.report; rp.id = G.uid(); rp.d = S.day; rp.floor = meta.floor || 0; rp.kind = meta.kind || 'normal'; rp.res = res.result; rp.boss = meta.boss || null;
  rp.notes = SO.analyze(rp);
  S.reports = S.reports || []; S.reports.unshift(rp); if (S.reports.length > 20) S.reports.pop();
  return rp;
};
// 전투가 끝난 뒤: 긴장 한계를 겪은 용병은 성향이 굳을 수 있다
SO.mindAfter = function (S, res) {
  res.units.forEach(function (u) {
    if (u.side !== 'p' || !u.merc || !u.rp || !u.rp.minds.length) return;
    var m = G.W.merc(S, u.merc.id); if (!m) return;
    u.rp.minds.forEach(function (x) {
      var M = D.MINDS[x.k];
      G.W.notify(S, { kind: 'mind', sev: M.good ? 'good' : 'bad', imp: 1, mid: m.id, title: m.name + ' — ' + (M.good ? '미덕: ' : '붕괴: ') + M.name, text: '긴장이 한계를 넘었다. ' + M.desc });
      var q = D.MIND_QUIRK[x.k];
      if (G.chance(M.good ? 0.3 : 0.4)) SO.gainQuirk(S, m, q, '이번 전투에서 겪은 [' + M.name + '] 이(가) 마음에 새겨졌다.');
    });
  });
};
