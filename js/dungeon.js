// 미궁 탐험: 층·방 생성, 이동, 지구력·긴장, 함정·사건·조우, 야영지 브리핑, 귀환
var G = window.G = window.G || {};
G.X = {};
var D = G.D;

G.X.zoneOf = function (f) { return f <= 10 ? 'upper' : f <= 30 ? 'mid' : 'deep'; };
G.X.merc = function (S, id) { for (var i = 0; i < S.roster.length; i++) if (S.roster[i].id === id) return S.roster[i]; return null; };
G.X.partyMercs = function (S) { var e = S.exp; return e.party.map(function (id) { return G.X.merc(S, id); }).filter(Boolean); };
G.X.able = function (S) { return G.X.partyMercs(S).filter(function (m) { return !m._down; }); };
G.X.relics = function (S) { return S.inv.relicSlots.slice(); };
G.X.hasRelic = function (S, k) { return S.inv.relicSlots.indexOf(k) >= 0; };
G.X.partyHas = function (S, t) { return G.X.able(S).some(function (m) { return G.M.has(m, t); }); };
G.X.partyClass = function (S, c) { return G.X.able(S).some(function (m) { return m.cls === c; }); };

// ───── 출정 ─────
// sup: {potion, calmPotion, antidote, torch, ration, ale, stones}
// 이미 도달한 층으로 직행하는 비용 (귀환석 층은 무료)
G.X.startCost = function (S, f) { return S.checkpoints.indexOf(f) >= 0 || f <= 1 ? 0 : 40 + f * 22; };
G.X.start = function (S, ids, sup, startFloor) {
  var cap = 8 + (ids.some(function (id) { var m = G.X.merc(S, id); return m && G.M.has(m, 'porter'); }) ? 4 : 0);
  var e = S.exp = { party: ids.slice(0, 6), floor: startFloor || 1, startFloor: startFloor || 1, step: 0, steps: [], sup: {}, loot: { gold: 0, stones: 0, herbs: 0, items: [], relics: [], books: [], statItems: [], uniques: [] },
    dayAcc: 0, days: 0, log: [], deaths: [], kos: [], medicUsed: false, phoenixUsed: false, camped: false, noFight: 0, encourage: 0, scold: false, encPenalty: false, atStairs: false, drunk: false,
    fameGain: 0, kills: 0, battles: 0, cap: cap, rivalMet: {}, bossDone: false, stats: { battles: 0, wins: 0 } };
  for (var k in sup) { var n = Math.min(sup[k] || 0, k === 'stones' ? S.stones : (S.inv.cons[k] || 0)); e.sup[k] = n; if (k === 'stones') S.stones -= n; else S.inv.cons[k] -= n; }
  G.X.partyMercs(S).forEach(function (m) {
    var d = G.M.derive(m); m.status = 'expedition'; m._hp = d.maxHp; m._mp = d.mp;
    m._staMax = Math.round(d.staMax * (G.X.hasRelic(S, 'stoneHeart') ? 1.3 : 1)); m._sta = m._staMax; m._down = false;
    m.hist.expeditions++;
  });
  G.X.log(S, '미궁 ' + e.floor + '층으로 출정했다. (' + e.party.length + '명)');
  G.X.genFloor(S);
  return e;
};
G.X.log = function (S, t, cls) { S.exp.log.push({ t: t, c: cls || '', d: S.day }); if (S.exp.log.length > 300) S.exp.log.shift(); };

// ───── 층 생성 ─────
G.X.genFloor = function (S) {
  var e = S.exp, f = e.floor, zone = G.X.zoneOf(f);
  var n = G.randi(4, 6), steps = [];
  var rivalNear = S.rivals.filter(function (r) { return !r.gone && Math.abs(r.floor - f) <= 3; });
  for (var i = 0; i < n; i++) {
    var opts = [], k = G.chance(0.55) ? 2 : 1;
    for (var j = 0; j < k; j++) {
      var w = { battle: 46, elite: f >= 3 ? 9 : 0, treasure: 11, trap: 10, altar: 3, lost: 3, merchant: 2, campfire: 4, empty: 6, rival: rivalNear.length ? 6 : 0 };
      if (i === 0) { w.elite = 0; w.rival = 0; }
      var t = G.wpick(w);
      var room = { type: t, id: G.uid() };
      if (t === 'rival') room.rival = G.pick(rivalNear).id;
      opts.push(room);
    }
    steps.push(opts);
  }
  var boss = D.BOSS_BY_FLOOR[f];
  if (boss && !S.bossKills[boss]) steps.push([{ type: 'boss', boss: boss, id: G.uid() }]);
  steps.push([{ type: 'stairs', id: G.uid() }]);
  // 실종된 동생 서사 단서
  if (f >= 11 && G.X.partyMercs(S).some(function (m) { return m.story && m.story.id === 'lostSibling' && !m.story.done; }) && G.chance(0.25)) {
    steps[G.randi(1, n - 1)][0] = { type: 'sibling', id: G.uid() };
  }
  e.steps = steps; e.step = 0; e.camped = false; e.atStairs = false; e.zone = zone;
  e.dark = zone === 'deep';
  // 정찰·시야
  e.reveal = G.X.hasRelic(S, 'ancientMap') || G.X.partyHas(S, 'scout');
  if (G.X.able(S).some(function (m) { return m.equip.acc && m.equip.acc.fx && m.equip.acc.fx.compass; })) e.reveal = false, e.compass = true; else e.compass = false;
  G.X.log(S, '— ' + f + '층 (' + D.ZONES[zone].name + ')', 'floor');
  if (G.X.partyHas(S, 'weatherSense')) {
    var nz = G.X.zoneOf(f + 1);
    G.X.log(S, '기상 예측: "' + (nz === 'mid' && zone === 'upper' ? '아래쪽에서 축축한 독기가 올라오는군…' : nz === 'deep' && zone !== 'deep' ? '곧 빛 한 점 없는 어둠이 온다.' : G.pick(['물이 불어나는 냄새가 나.', '오늘은 바람이 잠잠하군.', '천장에서 물방울이 떨어지는데… 조심해.'])) + '"', 'info');
  }
};
G.X.visible = function (S, room, ahead) {
  var e = S.exp;
  if (room.type === 'stairs' || room.type === 'boss') return true;
  if (e.compass) return false;
  if (e.reveal) return true;
  var bestVis = Math.max.apply(null, G.X.able(S).map(function (m) { return G.M.stat(m, 'vis'); }).concat([0]));
  return ahead === 0 && bestVis >= 12;
};
G.X.ROOM_NAME = { battle: '전투', elite: '정예 전투', treasure: '보물', trap: '함정', altar: '저주받은 제단', lost: '갈림길', merchant: '떠돌이 상인', campfire: '야영지', empty: '빈 방', rival: '다른 용병단', boss: '보스', stairs: '계단', sibling: '수상한 흔적' };

// ───── 시간·지구력·긴장 ─────
G.X.passTime = function (S, dt) {
  var e = S.exp; e.dayAcc += dt; e.days += dt;
  while (e.dayAcc >= 1) { e.dayAcc -= 1; G.W.advanceDay(S); }
};
G.X.staCost = function (S, m, base) {
  var e = S.exp, Z = D.ZONES[e.zone], T = D.TEMPO[S.tactics.tempo];
  var k = base * T.staMul;
  var swamp = Z.sta;
  if (G.M.has(m, 'spiritFriend') || G.X.partyClass(S, 'elementalist')) swamp = 1 + (swamp - 1) * (G.M.has(m, 'spiritFriend') ? 0 : 0.5);
  if (m.race === 'lizard' && e.zone === 'mid') swamp = 1;
  k *= swamp;
  if (G.X.partyHas(S, 'direction')) k *= 0.75;
  if (G.X.partyHas(S, 'porter')) k *= 0.9;
  if (m.cls === 'knight') k *= 1.3;
  k *= 1 + G.M.derive(m).overload * 0.04;
  k *= 1 - G.I.optSum(m, 'staSave');
  return k;
};
G.X.roomTick = function (S, kind) {
  var e = S.exp, Z = D.ZONES[e.zone], T = D.TEMPO[S.tactics.tempo];
  G.X.passTime(S, 0.25 * T.dayMul);
  var dark = e.dark && !(e.sup.torch > 0);
  if (e.dark && e.sup.torch > 0) e.sup.torch--;
  e.lit = !dark;
  if (kind !== 'battle') e.noFight++;
  G.X.able(S).forEach(function (m) {
    m._sta = Math.max(0, m._sta - G.X.staCost(S, m, 6));
    var t = 0.4 * Z.ten * (S.tactics.tempo === 'rush' ? 1.4 : 1);
    if (e.zone === 'upper' && G.M.has(m, 'pioneer')) t *= 0.5;
    if (dark && !G.X.hasRelic(S, 'owlFeather')) t += 0.5;
    if (G.M.has(m, 'arrogance') && G.X.able(S).some(function (o) { return o.race === 'dwarf' || o.race === 'demon'; })) t *= 1.5;
    if (G.M.has(m, 'bloodlust') && e.noFight >= 3) t += 1.5;
    G.M.addTension(m, t, { braveBanner: G.X.hasRelic(S, 'braveBanner') });
  });
};

// ───── 다음 방 선택 ─────
G.X.options = function (S) { var e = S.exp; return e.steps[e.step] || []; };
G.X.enter = function (S, idx) {
  var e = S.exp, room = G.X.options(S)[idx || 0];
  if (!room) return null;
  e.curRoom = room;
  if (room.type === 'stairs') { e.atStairs = true; G.X.log(S, '계단에 도착했다. 내려갈지 귀환할지 정하자.', 'info'); return { kind: 'stairs' }; }
  G.X.roomTick(S, room.type === 'battle' || room.type === 'elite' || room.type === 'boss' ? 'battle' : 'other');
  var r = G.X['room_' + room.type](S, room);
  return r;
};
G.X.next = function (S) { var e = S.exp; e.step++; e.curRoom = null; };

// 전투 셋업
G.X.battleSetup = function (S, enemies, opts) {
  opts = opts || {};
  var e = S.exp, able = G.X.able(S), form = S.tactics.formation, used = {};
  var party = able.map(function (m) {
    var p = form[m.id] || { row: D.CLASSES[m.cls].row, slot: 0 };
    var row = p.row, slot = p.slot;
    if (used[row + slot]) { // 칸이 겹치면 같은 열의 빈 칸 → 다른 열의 빈 칸
      var rows = [p.row, 'mid', 'front', 'back'], found = false;
      for (var r = 0; r < rows.length && !found; r++) for (var s2 = 0; s2 < 3 && !found; s2++) if (!used[rows[r] + s2]) { row = rows[r]; slot = s2; found = true; }
    }
    used[row + slot] = 1;
    return { m: m, row: row, slot: slot };
  });
  var statAdd = {};
  if (e.encPenalty) statAdd.jud = -2;
  var ctx = { floor: e.floor, zone: e.zone, dark: e.dark, lit: e.lit, engage: S.tactics.engage, leader: S.tactics.leader, relics: G.X.relics(S), potions: e.sup.potion || 0,
    bonds: G.Social.ranks(S), bossKey: opts.bossKey || null, hasAle: (e.sup.ale || 0) > 0, drunk: e.drunk, phoenixUsed: e.phoenixUsed, ambushFirst: opts.ambushFirst, ambushed: opts.ambushed };
  if (e.scold) ctx.statAdd = { vis: 4 };
  return { party: party, enemies: enemies || [], enemyMercs: opts.enemyMercs, ctx: ctx, kind: opts.kind || 'battle', meta: opts.meta || {} };
};
G.X.room_battle = function (S, room) {
  var e = S.exp, ambushFirst = S.tactics.tempo === 'rush' && G.chance(0.35);
  return { kind: 'battle', setup: G.X.battleSetup(S, G.C.makeEncounter(e.floor, 'normal'), { kind: 'normal', ambushFirst: ambushFirst }), text: ambushFirst ? '빠르게 치고 들어가 선제 기습!' : '' };
};
G.X.room_elite = function (S, room) { var e = S.exp; return { kind: 'battle', setup: G.X.battleSetup(S, G.C.makeEncounter(e.floor, 'elite'), { kind: 'elite' }) }; };
G.X.room_boss = function (S, room) {
  var e = S.exp, B = D.BOSSES[room.boss];
  G.X.able(S).forEach(function (m) { G.M.addTension(m, G.M.has(m, 'agoraphobia') ? 4 : 2, { braveBanner: G.X.hasRelic(S, 'braveBanner') }); });
  return { kind: 'battle', boss: room.boss, setup: G.X.battleSetup(S, G.C.makeBoss(room.boss, e.floor), { kind: 'boss', bossKey: room.boss }), text: B.name + ' — ' + B.gimmick };
};
G.X.room_empty = function (S) { G.X.log(S, '아무것도 없는 방이다.'); return { kind: 'text', text: '아무것도 없는 방이다. 발소리만 울린다.' }; };
G.X.room_campfire = function (S) { S.exp.freeCamp = true; return { kind: 'camp', free: true, text: '꺼진 모닥불 자리가 있다. 마석 없이 야영할 수 있다.' }; };
G.X.room_lost = function (S) {
  if (G.X.partyHas(S, 'direction')) { G.X.log(S, '갈림길 — 방향 감각 덕분에 바로 길을 찾았다.'); return { kind: 'text', text: '갈림길이지만 방향 감각이 좋은 동료가 길을 찾았다.' }; }
  G.X.passTime(S, 0.5);
  G.X.able(S).forEach(function (m) { m._sta = Math.max(0, m._sta - m._staMax * 0.15); });
  G.X.log(S, '길을 잃어 반나절을 헤맸다. (지구력 −15%)', 'bad');
  return { kind: 'text', text: '길을 잃어 반나절을 헤맸다. 모두 지구력 −15%.' };
};
G.X.room_trap = function (S) {
  var e = S.exp, able = G.X.able(S);
  var trapper = G.X.partyHas(S, 'trapper');
  var bestVis = Math.max.apply(null, able.map(function (m) { return G.M.stat(m, 'vis'); }));
  var bestDex = Math.max.apply(null, able.map(function (m) { return G.M.stat(m, 'dex') + (m.cls === 'rogue' ? 6 : 0) + (m.cls === 'hunter' ? 3 : 0); }));
  var detect = trapper ? 1 : G.clamp(0.25 + bestVis * 0.03 + D.TEMPO[S.tactics.tempo].trap + (G.X.partyClass(S, 'archer') ? 0.08 : 0) + (G.X.partyClass(S, 'hunter') ? 0.12 : 0), 0.1, 0.95);
  if (G.chance(detect)) {
    var disarm = trapper ? 1 : G.clamp(0.3 + bestDex * 0.035 + (G.X.partyClass(S, 'rogue') ? 0.15 : 0), 0.1, 0.97);
    if (G.chance(disarm)) { G.X.log(S, '함정을 발견하고 해체했다.', 'good'); if (trapper) e.loot.herbs += 1; return { kind: 'text', text: '함정을 발견하고 해체했다.' + (trapper ? ' (덫 사냥꾼이 부품을 챙겼다)' : '') }; }
  }
  // 발동
  var pool = able.slice(); able.forEach(function (m) { if (G.M.has(m, 'cursedChild')) pool.push(m); });
  var v = G.pick(pool), d = G.M.derive(v), dmg = Math.round(d.maxHp * G.rand(0.12, 0.25));
  v._hp = Math.max(1, v._hp - dmg);
  G.M.addTension(v, 1);
  var extra = '';
  if (G.chance(v.inj * 0.012)) { var j = G.M.addInjury(v, 1, '함정'); extra = ' — 경상: ' + j.name; }
  G.X.log(S, '함정 발동! ' + v.name + ' 피해 ' + dmg + extra, 'bad');
  return { kind: 'text', text: '함정이 발동했다! ' + v.name + '이(가) ' + dmg + '의 피해를 입었다.' + extra };
};
G.X.room_treasure = function (S) {
  var e = S.exp, loot = G.X.rollLoot(S, 'treasure');
  G.X.log(S, '보물상자: ' + G.X.lootText(loot), 'good');
  return { kind: 'text', text: '보물상자를 열었다! ' + G.X.lootText(loot) };
};
G.X.room_altar = function (S) { return { kind: 'choice', key: 'altar', text: '검붉은 빛을 내는 저주받은 제단이다. 만지면 무작위 동료 1명이 영구적인 손상을 입지만, 유물이나 스킬북을 확정으로 얻는다.', choices: ['제단을 만진다', '무시한다'] }; };
G.X.room_merchant = function (S) { return { kind: 'choice', key: 'merchant', text: '떠돌이 상인을 만났다. "물약 하나에 90골드, 횃불 하나에 20골드."', choices: ['물약 2개 구매 (180G)', '횃불 3개 구매 (60G)', '지나간다'] }; };
G.X.room_sibling = function (S) {
  var m = G.X.partyMercs(S).filter(function (x) { return x.story && x.story.id === 'lostSibling' && !x.story.done; })[0];
  if (m) { G.W.storyProgress(S, m, 1); return { kind: 'text', text: m.name + '이(가) 바닥에서 낡은 펜던트를 발견했다. 실종된 동생의 것이다!' }; }
  return G.X.room_empty(S);
};
G.X.room_rival = function (S, room) {
  var r = S.rivals.filter(function (x) { return x.id === room.rival; })[0];
  if (!r) return G.X.room_empty(S);
  var tmp = { friendly: '우호적인', neutral: '경계하는', hostile: '적대적인' }[r.temper];
  return { kind: 'choice', key: 'rival', rival: r.id, text: tmp + ' "' + r.name + '"(' + r.floor + '층 진행, 전력 ' + Math.round(r.power) + ')을 마주쳤다.', choices: ['물물교환 (물약 1 → 정보·식량)', '무시하고 지나간다', '기습해 전리품을 빼앗는다 (악명↑)'] };
};
G.X.choose = function (S, ev, idx) {
  var e = S.exp;
  if (ev.key === 'altar') {
    if (idx !== 0) { G.X.log(S, '제단을 무시했다.'); return { kind: 'text', text: '불길한 제단을 지나쳤다.' }; }
    var v = G.pick(G.X.able(S)), txt;
    if (G.chance(0.5)) { var p = G.M.addPermanent(v); S.yearData.perms++; txt = v.name + ' — 영구 손상: ' + p.name + ' (' + D.STAT_NAME[p.stat] + ' ' + p.val + ')'; }
    else { v.inj = Math.min(20, v.inj + 3); txt = v.name + ' — 몸이 약해졌다 (부상 빈도 상승)'; }
    var got;
    if (G.chance(0.55)) { var rk = G.pick(Object.keys(D.RELICS).filter(function (k) { return !D.RELICS[k].noSell; })); e.loot.relics.push(rk); got = '유물 [' + D.RELICS[rk].name + ']'; }
    else { var bk = G.pick(D.SKILLBOOK_TRAITS); e.loot.books.push(bk); got = '스킬북 [' + D.TRAITS[bk].name + ']'; }
    G.X.log(S, '제단: ' + txt + ' / 획득: ' + got, 'bad');
    return { kind: 'text', text: txt + '\n획득: ' + got };
  }
  if (ev.key === 'merchant') {
    if (idx === 0 && S.gold >= 180) { S.gold -= 180; e.sup.potion = (e.sup.potion || 0) + 2; return { kind: 'text', text: '물약 2개를 샀다.' }; }
    if (idx === 1 && S.gold >= 60) { S.gold -= 60; e.sup.torch = (e.sup.torch || 0) + 3; return { kind: 'text', text: '횃불 3개를 샀다.' }; }
    return { kind: 'text', text: idx === 2 ? '상인과 헤어졌다.' : '골드가 부족하다.' };
  }
  if (ev.key === 'rival') {
    var r = S.rivals.filter(function (x) { return x.id === ev.rival; })[0];
    if (idx === 0) {
      if ((e.sup.potion || 0) > 0) { e.sup.potion--; e.sup.ration = (e.sup.ration || 0) + 2; e.reveal = true; r.attitude = (r.attitude || 0) + 1; G.X.log(S, r.name + '과 교환: 식량 2 + 이 층 지도', 'good'); return { kind: 'text', text: '물약 1개를 주고 식량 2개와 이 층의 지도를 얻었다.' }; }
      return { kind: 'text', text: '줄 물약이 없다. 그냥 지나쳤다.' };
    }
    if (idx === 1) {
      if (r.temper === 'hostile' && G.chance(0.4)) { G.X.log(S, r.name + '이(가) 먼저 공격해 왔다!', 'bad'); return G.X.rivalBattle(S, r, { ambushed: true }); }
      return { kind: 'text', text: r.name + '을(를) 지나쳤다.' };
    }
    S.infamy += 20; S.fame = Math.max(0, S.fame - 10);
    G.X.log(S, r.name + '을(를) 기습했다. 악명 +20', 'bad');
    return G.X.rivalBattle(S, r, { ambushFirst: true });
  }
  return null;
};
G.X.rivalBattle = function (S, r, o) {
  var e = S.exp, n = G.randi(3, 5), ca = r.power;
  var cls = ['swordsman', 'knight', 'archer', 'priest', 'mage', 'rogue', 'lancer'];
  var rows = { front: 0, mid: 0, back: 0 }, ms = [];
  for (var i = 0; i < n; i++) {
    var c = cls[i % cls.length], m = G.M.create({ cls: c, caRange: [ca - 8, ca + 8], ilvl: Math.max(1, r.floor), uniqueChance: 0.1 });
    var row = D.CLASSES[c].row; ms.push({ m: m, row: row, slot: rows[row]++ % 3 });
  }
  return { kind: 'battle', rival: r.id, setup: G.X.battleSetup(S, [], { kind: 'rival', enemyMercs: ms, ambushFirst: o.ambushFirst, ambushed: o.ambushed, meta: { rival: r.id } }), text: r.name + '과의 전투!' };
};

// ───── 전리품 ─────
G.X.rollLoot = function (S, kind) {
  var e = S.exp, f = e.floor;
  var luck = G.sum(G.X.able(S).map(function (m) { return G.M.stat(m, 'luk'); })) / Math.max(1, G.X.able(S).length) + (G.X.hasRelic(S, 'luckyDice') ? 3 : 0);
  var mul = (G.X.partyClass(S, 'hunter') ? 1.2 : 1) * (G.X.hasRelic(S, 'goldScale') ? 1.3 : 1);
  var L = { gold: 0, stones: 0, herbs: 0, items: [], relics: [], books: [], statItems: [], uniques: [] };
  var q = { normal: 1, elite: 1.8, treasure: 1.5, boss: 4, rival: 2 }[kind] || 1;
  L.gold = Math.round(G.randi(12, 24) * (1 + f * 0.14) * q * mul);
  L.stones = Math.round((G.randi(1, 2) + (f > 15 ? 1 : 0)) * q * mul);
  L.herbs = G.chance(0.4) ? G.randi(1, 2) : 0;
  var itemP = { normal: 0.22, elite: 0.55, treasure: 0.7, boss: 1, rival: 0.6 }[kind] || 0.2;
  if (G.chance(itemP)) L.items.push(G.I.randomGear(f, luck, kind === 'boss' ? 25 : kind === 'elite' ? 8 : 0));
  if (kind === 'boss') L.items.push(G.I.randomGear(f, luck, 30));
  if (G.chance(kind === 'treasure' ? 0.08 : kind === 'boss' ? 0.6 : kind === 'elite' ? 0.06 : 0.025)) L.books.push(G.pick(D.SKILLBOOK_TRAITS));
  if (G.chance(kind === 'treasure' ? 0.06 : kind === 'boss' ? 0.4 : 0.02)) L.statItems.push(G.pick(Object.keys(D.STAT_ITEMS)));
  if (G.chance(kind === 'boss' ? 0.5 : kind === 'treasure' ? 0.02 : 0.004)) L.relics.push(G.pick(Object.keys(D.RELICS).filter(function (k) { return !D.RELICS[k].noSell; })));
  if (kind === 'boss' && G.chance(0.35)) L.uniques.push(G.I.makeUnique(G.pick(Object.keys(D.UNIQUES)), f));
  // 탐험 보관
  e.loot.gold += L.gold; e.loot.stones += L.stones; e.loot.herbs += L.herbs;
  ['items', 'relics', 'books', 'statItems', 'uniques'].forEach(function (k) { e.loot[k] = e.loot[k].concat(L[k]); });
  return L;
};
G.X.lootText = function (L) {
  var s = [];
  if (L.gold) s.push(L.gold + 'G'); if (L.stones) s.push('마석 ' + L.stones); if (L.herbs) s.push('약초 ' + L.herbs);
  L.items.forEach(function (it) { s.push('[' + D.GRADES[it.grade].name + '] ' + it.name); });
  L.uniques.forEach(function (it) { s.push('★' + it.name); });
  L.relics.forEach(function (k) { s.push('유물 ' + D.RELICS[k].name); });
  L.books.forEach(function (k) { s.push('스킬북 ' + D.TRAITS[k].name); });
  L.statItems.forEach(function (k) { s.push(D.STAT_ITEMS[k].name); });
  return s.join(', ') || '없음';
};

// ───── 전투 후 처리 ─────
G.X.afterBattle = function (S, res, battle) {
  var e = S.exp, kind = battle.setup.kind, out = { deaths: [], kos: [], injuries: [], perms: [], loot: null, fame: 0, text: [] };
  e.battles++; e.stats.battles++; e.noFight = 0;
  e.sup.potion = Math.max(0, (e.sup.potion || 0) - res.potionsUsed);
  if (res.goldSpent) { S.gold -= res.goldSpent; out.text.push('화염병 재료비 ' + res.goldSpent + 'G'); }
  if (res.phoenixUsed) e.phoenixUsed = true;
  var win = res.result === 'win';
  var growthMul = 1 * (G.X.hasRelic(S, 'tomeExp') ? 2 : 1);
  var mentorIn = G.X.able(S).filter(function (m) { return G.M.has(m, 'mentor'); })[0];
  if (mentorIn) growthMul *= (mentorIn.story && mentorIn.story.done && mentorIn.story.id === 'mentorPupil') ? 1.35 : 1.2;
  var actorsPer = res.actions / Math.max(1, res.units.length);
  res.units.forEach(function (u) {
    if (u.side !== 'p' || !u.merc) return;
    var m = u.merc;
    m._hp = Math.max(0, Math.round(u.hp)); m._mp = u.mp; m.ten = u.ten;
    m._sta = Math.max(0, m._sta - G.X.staCost(S, m, 3 + actorsPer * 0.35) - (u.staLoss || 0));
    m.hist.battles++; m.hist.kills += u.kills; if (u.unholy) m.hist.unholyKills += u.unholy;
    if (G.M.has(m, 'regeneration') && u.alive) m._hp = Math.min(G.M.derive(m).maxHp, m._hp + Math.round((G.M.derive(m).maxHp - m._hp) * 0.3));
    u.injuries.forEach(function (sev) { var j = G.M.addInjury(m, sev, '전투'); out.injuries.push(m.name + ' — ' + ['', '경상', '중상'][sev] + ' ' + j.name); if (sev >= 2) G.Social.injuryNotice(S, m, j, e.floor + '층 전투에서 치명타를 맞았다'); });
    if (u.ko) {
      // 사망 판정
      var Z = D.ZONES[e.zone];
      var p = Z.deathBase + Math.min(0.25, u.overkill * 0.15) + (S.tactics.engage === 'ruthless' ? 0.05 : 0) - G.M.stat(m, 'luk') * 0.008;
      p *= 1 - G.I.optSum(m, 'deathCut');
      if (G.X.hasRelic(S, 'wardCharm')) p *= 0.5;
      if (G.M.has(m, 'fragile')) p *= 2.5;
      p = G.clamp(p, 0.02, 0.6);
      if (G.chance(p)) {
        var medic = G.X.partyMercs(S).filter(function (x) { return G.M.has(x, 'fieldMedic') && x !== m; })[0] || (G.M.has(m, 'fieldMedic') ? null : null);
        if (medic && !e.medicUsed) {
          e.medicUsed = true; m._hp = 1; var jm = G.M.addInjury(m, 3, '치명상'); out.text.push('야전 의사 ' + medic.name + '이(가) ' + m.name + '을(를) 살려냈다! (치명상: ' + jm.name + ')');
          medic.hist.saves++; if (medic.story && medic.story.id === 'medicSave') G.W.storyProgress(S, medic, 1);
          m._down = true;
        } else {
          out.deaths.push(m); G.W.killMerc(S, m, e.floor + '층 전투');
          return;
        }
      } else {
        var sev = u.overkill > 0.5 || G.chance(0.25) ? 3 : 2;
        var j2 = G.M.addInjury(m, sev, '쓰러짐');
        out.kos.push(m.name + ' — ' + ['', '', '중상', '치명상'][sev] + ' ' + j2.name); G.Social.injuryNotice(S, m, j2, e.floor + '층 전투에서 쓰러졌다 (사망은 면했다)');
        var pp = 0.15 + m.inj * 0.02 - G.M.stat(m, 'luk') * 0.005; if (G.M.has(m, 'fragile')) pp *= 2;
        if (G.chance(pp)) { var pm = G.M.addPermanent(m); out.perms.push(m.name + ' — 영구 손상: ' + pm.name); S.yearData.perms++; G.W.notify(S, { kind: 'injury', sev: 'bad', imp: 2, mid: m.id, title: m.name + ' — 영구 손상: ' + pm.name, text: D.STAT_NAME[pm.stat] + ' ' + pm.val + ' (영구). 의무실 3단계의 수술로 치료할 수 있다.' }); }
        m._hp = 1; m._down = true;
      }
    }
    if (win && u.alive) {
      var gm = growthMul * (m.equip.acc && m.equip.acc.fx && m.equip.acc.fx.compass ? 2 : 1) * (G.M.has(m, 'cursedChild') ? 1.5 : 1) * (kind === 'elite' ? 1.5 : kind === 'boss' ? 3 : 1);
      G.M.battleGrowth(m, gm);
      if (kind === 'elite') { m.hist.elites++; if (m.story && m.story.id === 'honor') G.W.storyProgress(S, m, 1); }
      if (kind === 'boss') { m.hist.bosses.push(battle.boss); if (m.story && m.story.id === 'veteranLast') G.W.storyProgress(S, m, 1); }
    }
  });
  G.Social.mindAfter(S, res);
  G.Social.afterBattle(S, res, battle, win);
  var rp = G.Social.storeReport(S, res, { floor: e.floor, kind: kind, boss: battle.boss });
  out.report = rp;
  // 동료의 죽음: 긴장 충격
  if (out.deaths.length) {
    var shock = 4 * out.deaths.length * (S.buildings.cemetery >= 1 ? 0.5 : 1);
    G.X.able(S).forEach(function (m) { if (!G.M.has(m, 'optimist')) G.M.addTension(m, shock); });
    out.deaths.forEach(function (m) { if (m.founder) { G.X.able(S).forEach(function (o) { G.M.addTension(o, 6); }); } });
  }
  e.scold = false; e.encPenalty = false; e.drunk = false;
  if (win) {
    e.stats.wins++;
    var lk = kind === 'rival' ? 'rival' : kind;
    out.loot = G.X.rollLoot(S, lk === 'boss' ? 'boss' : lk === 'elite' ? 'elite' : lk === 'rival' ? 'rival' : 'normal');
    var front = e.floor >= S.deepest - 2; // 최전선 전투만 명성이 오른다
    var fame = kind === 'elite' ? (front ? 2 : G.chance(0.3) ? 1 : 0) : kind === 'normal' ? (front && G.chance(0.4) ? 1 : 0) : 0;
    if (kind === 'boss') {
      var bk = battle.boss; S.bossKills[bk] = S.day; e.bossDone = true;
      fame = { queen: 40, guardian: 80, illusionist: 120, archbishop: 200 }[bk];
      G.W.news(S, '용병단이 ' + e.floor + '층 보스 [' + D.BOSSES[bk].name + ']를 격파했다!', 'big');
      G.W.notify(S, { kind: 'battle', sev: 'good', imp: 2, title: '보스 격파: ' + D.BOSSES[bk].name, text: e.floor + '층. 파티 ' + G.X.able(S).map(function (m) { return m.name; }).join(', ') + '. 명성 +' + ({ queen: 40, guardian: 80, illusionist: 120, archbishop: 200 }[bk]) + '.' });
      if (bk === 'archbishop' && !S.heroTitle) { S.heroTitle = { by: 'player', day: S.day }; G.W.news(S, '최하층 공략! 용병단이 "용사" 칭호를 얻었다!', 'big'); }
      S.roster.forEach(function (m) { if (m.story && !m.story.done && m.story.id === 'founderRevenge' && bk === 'illusionist') G.W.storyProgress(S, m, 1); });
    }
    if (kind === 'rival') { var r = S.rivals.filter(function (x) { return x.id === battle.setup.meta.rival; })[0]; if (r) { r.power *= 0.9; r.attitude = -5; r.temper = 'hostile'; } }
    S.fame += fame; e.fameGain += fame; out.fame = fame;
    G.X.able(S).forEach(function (m) { if (m.story && m.story.id === 'inquisitorHunt' && !m.story.done && m.hist.unholyKills >= 40) G.W.storyProgress(S, m, 99); });
  }
  // 생존자 판단
  if (!G.X.able(S).length || res.result !== 'win') out.forced = res.result === 'lose' ? 'wipe' : res.result === 'retreat' ? 'retreat' : 'noable';
  if (out.forced === 'noable' && G.X.able(S).length) out.forced = null;
  G.X.log(S, (win ? '승리' : res.result === 'lose' ? '패배' : '후퇴') + (out.loot ? ' — ' + G.X.lootText(out.loot) : '') + (out.deaths.length ? ' / 전사: ' + out.deaths.map(function (m) { return m.name; }).join(', ') : ''), win ? 'good' : 'bad');
  G.X.passTime(S, 0.1);
  return out;
};

// ───── 야영지 브리핑 ─────
// brief: 'rest' | 'encourage' | 'scold' | 'tactics'
G.X.camp = function (S, brief, useCalm) {
  var e = S.exp, out = [];
  var free = e.freeCamp;
  if (!free) { if ((e.sup.stones || 0) <= 0) return { ok: false, text: '야영할 마석이 없다.' }; e.sup.stones--; }
  e.freeCamp = false; e.camped = true;
  G.X.passTime(S, 0.5);
  var able = G.X.able(S), all = G.X.partyMercs(S);
  var cook = able.some(function (m) { return G.M.has(m, 'cooking'); });
  var ration = (e.sup.ration || 0) > 0;
  if (ration) e.sup.ration = Math.max(0, e.sup.ration - Math.ceil(all.length / 3));
  all.forEach(function (m) {
    var d = G.M.derive(m), rec = 0.45 + (ration ? 0.4 : 0) + (cook ? 0.2 : 0);
    if (G.M.has(m, 'manastoneCore')) rec = 1;
    if (G.M.has(m, 'ironStomach') || G.M.has(m, 'ironStomachU')) rec += 0.1;
    m._sta = Math.min(m._staMax, m._sta + m._staMax * rec);
    m._hp = Math.min(d.maxHp, m._hp + d.maxHp * 0.3);
    m._mp = Math.min(d.mp, (m._mp || 0) + d.mp * 0.5);
    G.M.addTension(m, -1 - (cook ? 3 : 0));
  });
  if (cook) out.push('요리 특성 동료가 몬스터 고기로 식사를 만들었다. (긴장 −3)');
  if (!ration) out.push('식량이 없어 회복이 적다.');
  if (useCalm && (e.sup.calmPotion || 0) > 0) { e.sup.calmPotion--; all.forEach(function (m) { G.M.addTension(m, -3); }); out.push('정신 안정 물약 (긴장 −3)'); }
  if ((e.sup.ale || 0) > 0) { e.sup.ale--; e.drunk = true; all.forEach(function (m) { G.M.addTension(m, -1); }); out.push('술 한 잔 (긴장 −1, 애주가 만족)'); }
  if (able.some(function (m) { return G.M.has(m, 'chatterbox'); })) { all.forEach(function (m) { G.M.addTension(m, -0.5); }); out.push('수다쟁이 덕분에 분위기가 풀렸다.'); }
  if (brief === 'encourage') {
    e.encourage++;
    all.forEach(function (m) { G.M.addTension(m, -3); });
    if (e.encourage >= 2) { e.encPenalty = true; out.push('격려하기 (긴장 −3). 연속 격려로 나태해져 다음 전투 판단력 −2.'); } else out.push('격려하기 (긴장 −3)');
  } else e.encourage = 0;
  if (brief === 'scold') {
    all.forEach(function (m) { G.M.addTension(m, 2); m.agg = Math.min(20, m.agg + 0); });
    e.scold = true; out.push('호통치기! 긴장 +2, 다음 전투 명중·호전성 상승');
    able.forEach(function (m) {
      if (!m.founder && G.M.stat(m, 'tea') < 6 && G.chance(0.04)) {
        out.push(m.name + '이(가) 짐을 싸서 탈주했다!');
        G.W.removeMerc(S, m, '탈주'); e.party = e.party.filter(function (id) { return id !== m.id; });
      }
    });
  }
  if (brief === 'tactics') {
    var lead = G.X.merc(S, S.tactics.leader);
    if (!lead || G.M.stat(lead, 'lea') < 12) { all.forEach(function (m) { G.M.addTension(m, 1); }); out.push('주장의 리더십이 부족해 전술 수정에 혼선이 생겼다. (긴장 +1)'); }
    else out.push('주장이 깔끔하게 전술을 재정비했다.');
  }
  // 기습
  var bestVis = Math.max.apply(null, able.map(function (m) { return G.M.stat(m, 'vis'); }).concat([0]));
  var amb = G.clamp(0.22 - bestVis * 0.012 + (able.some(function (m) { return G.M.has(m, 'chatterbox'); }) ? 0.1 : 0), 0.02, 0.4);
  if (able.length && G.chance(amb)) {
    out.push('불빛을 보고 몬스터가 기습해 왔다!');
    G.X.log(S, '야영 — ' + out.join(' / '), 'info');
    var ambushed = !able.some(function (m) { return G.M.has(m, 'supple'); });
    return { ok: true, text: out.join('\n'), battle: { kind: 'battle', setup: G.X.battleSetup(S, G.C.makeEncounter(e.floor, 'normal'), { kind: 'normal', ambushed: ambushed }) } };
  }
  G.X.log(S, '야영 — ' + out.join(' / '), 'info');
  return { ok: true, text: out.join('\n') };
};

// ───── 계단: 내려가기 ─────
G.X.descend = function (S) {
  var e = S.exp;
  var boss = D.BOSS_BY_FLOOR[e.floor];
  if (boss && !S.bossKills[boss]) return { ok: false, text: '보스를 쓰러뜨려야 내려갈 수 있다.' };
  if (e.floor >= 40) return { ok: false, text: '최하층이다.' };
  G.X.able(S).forEach(function (m) { m.stats.sta = Math.min(20, m.stats.sta + 0.03 * G.M.ageFactor(m) * G.M.room(m, 'sta')); m.hist.deepest = Math.max(m.hist.deepest, e.floor + 1); });
  e.floor++;
  if (e.floor > S.deepest) { S.deepest = e.floor; S.fame += 2 + Math.floor(e.floor / 5); e.fameGain += 2; G.W.news(S, '용병단이 미궁 ' + e.floor + '층에 처음 도달했다.'); }
  if ((e.floor - 1) % 5 === 0 && S.checkpoints.indexOf(e.floor) < 0) { S.checkpoints.push(e.floor); G.X.log(S, e.floor + '층 귀환석을 활성화했다. 다음부터 이 층에서 출발할 수 있다.', 'good'); }
  G.X.genFloor(S);
  S.roster.forEach(function (m) { if (m.founder && m.story && m.story.id === 'founderDream' && !m.story.done && e.floor >= 20 && G.M.ca(m) >= 120 && e.party.indexOf(m.id) >= 0) G.W.storyProgress(S, m, 1); });
  S.roster.forEach(function (m) { if (m.story && m.story.id === 'nobleRestore' && !m.story.done && m.hist.wagesPaid >= 1500 && e.party.indexOf(m.id) >= 0 && e.floor >= 15) G.W.storyProgress(S, m, 1); });
  return { ok: true };
};

// ───── 귀환 ─────
// reason: 'stairs' | 'retreat' | 'wipe'
G.X.retreatRisk = function (S) { return S.exp.atStairs ? 0 : G.X.partyClass(S, 'rogue') ? 0.15 : 0.3; };
G.X.returnHome = function (S, reason) {
  var e = S.exp, out = [];
  if (reason === 'wipe') {
    out.push('파티가 전멸했다. 구조대가 생존자를 데려왔지만 전리품은 모두 잃었다.');
    e.loot = { gold: 0, stones: 0, herbs: 0, items: [], relics: [], books: [], statItems: [], uniques: [] };
    S.fame = Math.max(0, S.fame - 10); S.gold = Math.max(0, S.gold - 100);
  }
  G.X.passTime(S, 0.3 + e.floor * 0.08);
  if (e.dayAcc > 0) { e.dayAcc = 0; G.W.advanceDay(S); } // 남은 반나절도 하루로 친다
  var L = e.loot;
  S.gold += L.gold; S.stones += L.stones; S.herbs += L.herbs;
  L.items.concat(L.uniques).forEach(function (it) { S.inv.items.push(it); G.W.codex(S, 'items', it.unique || it.wtype || it.atype || it.slot); });
  L.relics.forEach(function (k) { S.inv.relics.push(k); G.W.codex(S, 'relics', k); });
  L.books.forEach(function (k) { S.inv.books.push(k); });
  L.statItems.forEach(function (k) { S.inv.statItems.push(k); });
  for (var k in e.sup) if (k !== 'stones') S.inv.cons[k] = (S.inv.cons[k] || 0) + e.sup[k]; S.stones += e.sup.stones || 0;
  out.push('획득: ' + G.X.lootText(L));
  var firstAid = G.X.partyHas(S, 'firstAid') || e.sup.antidote > 0;
  G.X.partyMercs(S).forEach(function (m) {
    m.status = 'guild'; delete m._hp; delete m._mp; delete m._sta; delete m._staMax; m._down = false;
    if (G.M.has(m, 'hibernate')) m.injuries = m.injuries.filter(function (j) { return j.sev > 1; });
    if (!firstAid) m.injuries.forEach(function (j) { if (G.chance(m.inj * 0.015)) { j.days *= 1.5; out.push(m.name + '의 ' + j.name + '이(가) 악화됐다.'); } });
    if (G.M.isOld(m) && G.chance(0.15)) { var s = G.pick(D.BODY); m.stats[s] = Math.max(1, m.stats[s] - 0.5); out.push(m.name + ' — 나이 탓에 ' + D.STAT_NAME[s] + '이(가) 영구히 떨어졌다.'); }
  });
  G.W.news(S, '원정 귀환: ' + e.startFloor + '층 → ' + e.floor + '층, 전투 ' + e.stats.battles + '회' + (e.deaths.length ? ', 전사 ' + e.deaths.length : '') + '.');
  var summary = { text: out.join('\n'), days: e.days, floor: e.floor, fame: e.fameGain, loot: L };
  G.W.notify(S, { kind: 'battle', sev: reason === 'wipe' ? 'bad' : 'info', imp: reason === 'wipe' || e.deaths.length ? 2 : 0, title: '원정 귀환: ' + e.startFloor + '층 → ' + e.floor + '층' + (reason === 'wipe' ? ' (전멸)' : ''), text: '전투 ' + e.stats.battles + '회 (승리 ' + e.stats.wins + '), ' + Math.round(e.days * 10) / 10 + '일. 전리품: ' + G.X.lootText(L) + (e.deaths.length ? '. 전사: ' + e.deaths.map(function (m) { return m.name; }).join(', ') : '') + '.' });
  S.lastExp = { start: e.startFloor, end: e.floor, days: Math.round(e.days * 10) / 10, battles: e.stats.battles, wins: e.stats.wins, loot: G.X.lootText(L), deaths: e.deaths.slice(), reason: reason };
  S.exp = null;
  return summary;
};
