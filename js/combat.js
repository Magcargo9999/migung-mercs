// 전투 시뮬레이터: 속도 기반 순서제. 화면 없이 결과와 이벤트 로그만 만든다.
var G = window.G = window.G || {};
G.C = {};
var D = G.D;

// ───── 층별 기준치 (기대 파티 평균 스탯 s) ─────
G.C.ref = function (f) {
  var s = (18 + 3.6 * f) / 10;
  var atk = 2.35 * s + (4 + 0.9 * f);
  var hp = 15.75 * s + 20 + 1.5 * f;
  var def = 1.3 * s + 1.6 + 0.5 * f;
  return { s: s, atk: atk, hp: hp, def: def };
};
G.C.K = { hp: 6.5, atk: 0.19 };
G.C.monsterStats = function (key, floor, elite) {
  var M = D.MONSTERS[key], B = D.BOSSES[key], X = M || B, R = G.C.ref(floor);
  var mdef0 = 2 + floor * 0.8, def0 = 2 + floor * 0.9;
  var hp0 = R.atk * 60 / (60 + def0) * G.C.K.hp;
  var atk0 = G.C.K.atk * R.hp * (60 + R.def) / 60;
  var st = {
    maxHp: Math.round(hp0 * X.hp * (elite ? 1.8 : 1)), atk: atk0 * X.atk * (elite ? 1.3 : 1), mat: atk0 * X.atk * (elite ? 1.3 : 1),
    def: def0 * X.def, mdef: mdef0 * X.mdef, hit: 82 + R.s * 1.6, eva: 2.4 * R.s * X.eva, crit: 5 + floor * 0.2,
    spd: (6.5 + R.s * 0.9) * X.spd, pen: 0
  };
  return st;
};

// ───── 유닛 구성 ─────
G.C.mercUnit = function (m, side, row, slot, ctx) {
  var dctx = { dark: ctx.dark && !ctx.lit, exhausted: m._sta !== undefined && m._sta <= 0, drunkless: G.M.has(m, 'drinker') && !ctx.hasAle, statAdd: ctx.statAdd };
  var d = G.M.derive(m, dctx);
  var u = { id: m.id, side: side, name: m.name, merc: m, cls: m.cls, row: row, slot: slot, hp: Math.min(d.maxHp, m._hp != null ? m._hp : d.maxHp), maxHp: d.maxHp,
    mp: m._mp != null ? Math.min(m._mp, d.mp) : d.mp, maxMp: d.mp, atk: d.atk, mat: d.mat, def: d.def, mdef: d.mdef, hit: d.hit, eva: d.eva, crit: d.crit, spd: d.spd,
    pen: d.pen, leech: d.leech, regen: d.regen, gauge: G.R() * 30, cds: {}, buffs: [], alive: true, ko: false, kind: 'phys',
    range: D.CLASSES[m.cls].range, tags: ['human'], windLeft: G.M.has(m, 'windBlessing') ? 2 : 0, dmgDealt: 0, kills: 0, hitsTaken: 0, injuries: [], tactic: m.tactic,
    agg: m.agg + G.I.optSum(m, 'agg'), ten: m.ten };
  if (G.M.has(m, 'agoraphobia') && !ctx.bossKey) u.eva += 10;
  G.Social.applyQuirks(u, m);
  return u;
};
G.C.monUnit = function (key, floor, elite, row, slot) {
  var M = D.MONSTERS[key] || D.BOSSES[key], st = G.C.monsterStats(key, floor, elite);
  var u = { id: G.uid(), side: 'e', mon: key, name: (elite ? '정예 ' : '') + M.name, row: row, slot: slot, hp: st.maxHp, maxHp: st.maxHp, mp: 0, maxMp: 0,
    atk: st.atk, mat: st.mat, def: st.def, mdef: st.mdef, hit: st.hit, eva: st.eva, crit: st.crit, spd: st.spd, pen: 0, leech: M.leech || 0, regen: 0,
    gauge: G.R() * 30, cds: {}, buffs: [], alive: true, ko: false, kind: M.kind || 'phys', range: M.range || 'melee', tags: (M.tags || []).slice(),
    elite: !!elite, boss: !!D.BOSSES[key], windLeft: 0, dmgDealt: 0, kills: 0, sprite: M.sprite, small: M.small };
  if (M.noAct) u.noAct = true;
  return u;
};
// 적 편성
G.C.makeEncounter = function (floor, kind) {
  var zone = floor <= 10 ? 'upper' : floor <= 30 ? 'mid' : 'deep';
  var pool = D.ZONE_MONSTERS[zone];
  var n = kind === 'elite' ? G.randi(3, 4) : zone === 'upper' ? G.randi(2, 4) : G.randi(3, 5);
  if (floor <= 2) n = Math.min(n, kind === 'elite' ? 3 : 2 + (G.chance(0.4) ? 1 : 0));
  var list = [];
  for (var i = 0; i < n; i++) list.push(G.pick(pool));
  var units = [], fi = 0, bi = 0;
  list.forEach(function (k, i) {
    var M = D.MONSTERS[k], back = M.range === 'ranged';
    var elite = kind === 'elite' && (i === 0 || (i === 1 && floor >= 15));
    if (back && bi < 3) units.push(G.C.monUnit(k, floor, elite, 'back', bi++));
    else if (fi < 3) units.push(G.C.monUnit(k, floor, elite, 'front', fi++));
    else units.push(G.C.monUnit(k, floor, elite, 'back', bi++ % 3));
  });
  if (floor <= 3) units.forEach(function (u) { u.atk *= 0.85; u.mat *= 0.85; });
  return units;
};
G.C.makeBoss = function (bossKey, floor) {
  var B = D.BOSSES[bossKey], u = G.C.monUnit(bossKey, floor, false, 'front', 1);
  var st = G.C.monsterStats(bossKey, floor, false);
  u.maxHp = u.hp = Math.round(G.C.monsterStats('skeleton', floor, false).maxHp * B.hp);
  u.boss = true; u.bossKey = bossKey; u.turns = 0; u.big = true;
  var units = [u];
  if (bossKey === 'guardian' || bossKey === 'archbishop') {
    var minion = bossKey === 'guardian' ? 'rotSoldier' : 'boneKnight';
    units.push(G.C.monUnit(minion, floor, false, 'front', 0));
    if (bossKey === 'archbishop') units.push(G.C.monUnit('arenaWraith', floor, false, 'back', 2));
  }
  return units;
};

// ───── 전투 실행 ─────
// setup: {party:[{m,row,slot}], enemies:[units], ctx:{floor, zone, dark, lit, engage, leader, relics, potions, bossKey, hasAle, gold, rivalTactic}}
G.C.run = function (setup) {
  var ctx = setup.ctx, log = [], units = [];
  var relic = function (k) { return (ctx.relics || []).indexOf(k) >= 0; };
  var stAdd = {}; if (relic('luckyDice')) stAdd.luk = 3; if (relic('founderSeal')) stAdd.com = 2;
  ctx.statAdd = stAdd;
  setup.party.forEach(function (p) { units.push(G.C.mercUnit(p.m, 'p', p.row, p.slot, ctx)); });
  (setup.enemyMercs || []).forEach(function (p) { var u = G.C.mercUnit(p.m, 'e', p.row, p.slot, ctx); u.rival = true; u.tactic = { target: 'nearest', skill: 'normal', potion: 0 }; units.push(u); });
  setup.enemies.forEach(function (u) { units.push(u); });
  var P = function () { return units.filter(function (u) { return u.side === 'p' && u.alive; }); };
  var E = function () { return units.filter(function (u) { return u.side === 'e' && u.alive; }); };
  var byId = function (id) { for (var i = 0; i < units.length; i++) if (units[i].id === id) return units[i]; };
  var snapshot = function (u) { return { id: u.id, side: u.side, name: u.name, row: u.row, slot: u.slot, hp: u.hp, maxHp: u.maxHp, mp: u.mp, maxMp: u.maxMp, mercId: u.merc ? u.merc.id : null, mercRef: u.merc || null, cls: u.cls, mon: u.mon, boss: u.boss, bossKey: u.bossKey, summon: u.summon, egg: u.mon === 'egg', small: u.small, rival: u.rival, elite: u.elite }; };
  var leader = ctx.leader ? units.filter(function (u) { return u.merc && u.merc.id === ctx.leader && u.side === 'p'; })[0] : null;
  var leaderLea = leader ? G.M.stat(leader.merc, 'lea') + (leader.cls === 'knight' ? 2 : 0) + G.I.optSum(leader.merc, 'lea') : 5;
  var partyMelee = units.filter(function (u) { return u.side === 'p' && u.range !== 'ranged'; }).length;
  var hasWarlock = units.some(function (u) { return u.side === 'p' && u.cls === 'warlock'; });
  var hasDemonish = units.some(function (u) { return u.side === 'p' && u.merc && (u.merc.race === 'demon' || u.cls === 'warlock'); });
  var hasFounder = units.some(function (u) { return u.side === 'p' && u.merc && u.merc.founder; });
  var engage = ctx.engage || 'balanced';
  var state = { aura: false, auraNext: false, teamZero: 0, potionsUsed: 0, goldSpent: 0, illusion: 0, phoenix: relic('phoenix') && !ctx.phoenixUsed, actions: 0, round: 0 };
  log.push({ type: 'start', units: units.map(snapshot), text: ctx.bossKey ? '보스전 시작: ' + D.BOSSES[ctx.bossKey].name : '전투 시작' });

  function buff(u, k) { var t = 0; u.buffs.forEach(function (b) { if (b.k === k) t += b.v; }); return t; }
  function hasBuff(u, k) { return u.buffs.some(function (b) { return b.k === k; }); }
  function addBuff(u, k, v, turns) { u.buffs = u.buffs.filter(function (b) { return b.k !== k; }); u.buffs.push({ k: k, v: v, t: turns }); }
  function hpPct(u) { return u.hp / u.maxHp; }
  function teamwork(u) {
    if (!u.merc) return 10;
    var t = G.M.stat(u.merc, 'tea') + G.I.optSum(u.merc, 'tea');
    if (u.side === 'p') {
      if (hasWarlock) t -= 2;
      if (state.teamZero > 0) t = 0;
      if (G.M.has(u.merc, 'pirate') && units.some(function (o) { return o.side === 'p' && (o.cls === 'knight' || o.cls === 'priest'); }) && !(u.merc.story && u.merc.story.done)) t -= 3;
      if (relic('bondKnot')) t = Math.max(12, t);
      if (hasFounder && state.teamZero <= 0) t = Math.max(t, G.M.stat(u.merc, 'tea'));
      if (u.merc.equip.acc && u.merc.equip.acc.fx && u.merc.equip.acc.fx.oath) t = 20;
    }
    return Math.max(0, t);
  }
  function compliance(u) {
    var jud = G.M.stat(u.merc, 'jud');
    var lea = u.side === 'p' ? leaderLea : 10;
    var sc = (lea + teamwork(u) + jud) / (u.ten + 1);
    return u.mind === 'doubt' ? sc * 0.45 : sc;
  }
  var RPK = { front: '전열', mid: '중열', back: '후열' };
  function RP(u) { return u.rp || (u.rp = { n: 0, obey: 0, dis: [], pan: 0, fk: [], taken: 0, heal: 0, ko: null, t0: Math.round(u.ten), tm: Math.round(u.ten), minds: [], cover: 0, grief: 0 }); }
  function bondRank(a, b) { return (ctx.bonds && a.merc && b.merc && ctx.bonds[G.Social.key(a.merc.id, b.merc.id)]) || 0; }
  function adjRankSum(u) {
    if (!u.merc || !ctx.bonds) return 0; var t = 0;
    units.forEach(function (o) { if (o !== u && o.alive && o.side === u.side && o.merc && G.Social.adjacent(u, o)) t += bondRank(u, o); });
    return t;
  }
  function addTen(u, v) {
    if (!u.merc) return;
    if (v > 0 && G.M.has(u.merc, 'emotionless')) return;
    var k = 1;
    if (v > 0) { k *= (1.4 - G.M.stat(u.merc, 'com') / 25); if (G.I.hasOpt(u.merc, 'calm')) k *= 0.6; if (relic('braveBanner')) k *= 0.7; k *= G.Social.tenMul(u.merc); }
    u.ten = G.clamp(u.ten + v * Math.max(0, k), 0, 20);
    if (u.side === 'p' && u.rp && u.ten > u.rp.tm) u.rp.tm = Math.round(u.ten);
    if (v > 0 && u.ten >= 16 && u.side === 'p') checkBreak(u);
  }
  // 긴장 한계(16): 붕괴(공황·분노·위축·의심) 또는 미덕(각성·결의·평정)
  function checkBreak(u) {
    if (u.mind || (u.breaks || 0) >= 2 || !u.alive) return;
    u.breaks = (u.breaks || 0) + 1;
    var key = G.Social.rollMind(u.merc), M = D.MINDS[key];
    u.mind = key; RP(u); if (u.ten > u.rp.tm) u.rp.tm = Math.round(u.ten);
    u.rp.minds.push({ k: key, at: state.actions });
    if (key === 'rage') { u.atk *= 1.25; u.mat *= 1.25; u.def *= 0.85; u.mdef *= 0.85; }
    else if (key === 'fear') { u.hit -= 15; u.spd *= 0.85; }
    else if (key === 'awaken') { u.atk *= 1.25; u.mat *= 1.25; u.crit += 10; u.ten = Math.max(0, u.ten - 6); }
    else if (key === 'resolve') { u.def *= 1.2; u.mdef *= 1.2; u.ten = Math.max(0, u.ten - 6); P().forEach(function (x) { if (x !== u) addTen(x, -2); }); }
    else if (key === 'calm') { u.ten = 4; u.cds = {}; P().forEach(function (x) { if (x !== u) addTen(x, -1); }); }
    log.push({ type: 'mind', a: u.id, mind: key, good: M.good, text: u.name + ' — ' + (M.good ? '미덕: ' : '붕괴: ') + M.name + '! ' + M.desc, targets: [] });
  }
  function foes(u) { return u.side === 'p' ? E() : P(); }
  function allies(u) { return u.side === 'p' ? P() : E(); }
  function frontOf(list) {
    var f = list.filter(function (x) { return x.row === 'front'; });
    if (f.length) return f;
    var m = list.filter(function (x) { return x.row === 'mid'; });
    return m.length ? m : list;
  }
  function pickTarget(u, mode, canReachAll) {
    var fs = foes(u); if (!fs.length) return null;
    var pool = canReachAll ? fs : frontOf(fs);
    var summons = fs.filter(function (x) { return x.summon || x.tags.indexOf('summon') >= 0; });
    if (mode === 'summon') { var reach = summons.filter(function (x) { return canReachAll || pool.indexOf(x) >= 0; }); if (reach.length) { pool = reach; mode = 'lowHp'; } else mode = 'nearest'; }
    if (mode === 'boss') { var b = fs.filter(function (x) { return x.boss; })[0]; if (b && (canReachAll || pool.indexOf(b) >= 0)) return b; mode = 'nearest'; }
    if (mode === 'back' && canReachAll) { var bk = fs.filter(function (x) { return x.row === 'back'; }); if (bk.length) pool = bk; mode = 'lowHp'; }
    if (mode === 'lowHp') return pool.slice().sort(function (a, b) { return hpPct(a) - hpPct(b); })[0];
    var rowOrd = { front: 0, mid: 1, back: 2 };
    return pool.slice().sort(function (a, b) { return rowOrd[a.row] - rowOrd[b.row] || Math.abs(a.slot - u.slot) - Math.abs(b.slot - u.slot); })[0];
  }
  function reachAll(u) { return u.range === 'ranged' || u.range === 'reach'; }
  function rowDmgMul(u) {
    if (u.range === 'ranged') return 1;
    if (u.row === 'front') return 1;
    if (u.row === 'mid') return u.range === 'reach' ? 1 : 0.7;
    return 0.5;
  }
  function zoneMul(u) {
    var k = 1;
    if (u.cls === 'elementalist') k *= ctx.zone === 'mid' ? 1.15 : ctx.zone === 'deep' ? 0.85 : 1;
    if (u.merc && G.M.has(u.merc, 'pirate') && ctx.zone === 'mid') k *= 1.15;
    return k;
  }
  // 피해 처리
  function strike(a, t, mult, kind, o) {
    o = o || {};
    var ev = { id: t.id, dmg: 0 };
    // 명중
    if (!o.autoHit) {
      if (t.windLeft > 0) { t.windLeft--; ev.miss = true; ev.note = '바람의 가호'; return ev; }
      var chance = G.clamp(a.hit - t.eva * (1 - (o.ignoreEva || 0)) - buff(a, 'web') - (a.merc && ctx.dark && !ctx.lit && !relic('owlFeather') && !G.I.hasOpt(a.merc, 'owl') && !(a.merc.equip.weapon && a.merc.equip.weapon.fx && a.merc.equip.weapon.fx.owl) ? 20 : 0), 8, 97);
      if (G.R() * 100 >= chance) { ev.miss = true; return ev; }
    }
    var critC = a.crit + (o.crit || 0);
    if (a.merc && t.tags.indexOf('undead') >= 0 && a.merc.equip.weapon && a.merc.equip.weapon.fx && a.merc.equip.weapon.fx.undeadCrit) critC = 100;
    var crit = G.R() * 100 < critC;
    var base = kind === 'mag' ? a.mat : a.atk;
    var raw = base * mult * G.rand(0.9, 1.1) * (crit ? 1.6 : 1);
    if (a.side === 'p') { if (engage === 'ruthless') raw *= 1.2; if (engage === 'defensive') raw *= 0.9; }
    raw *= 1 + buff(a, 'song');
    raw *= 1 - buff(a, 'curse');
    if (a.cls === 'berserker') raw *= 1 + (1 - hpPct(a)) * 0.6;
    if (a.merc && G.M.has(a.merc, 'packHunt')) raw *= 1 + 0.05 * (a.side === 'p' ? partyMelee : 2);
    if (a.merc && G.M.has(a.merc, 'inquisitor') && (t.tags.indexOf('undead') >= 0 || t.tags.indexOf('demon') >= 0)) raw *= 2;
    if (t.boss && (a.cls === 'rogue' || a.cls === 'hunter')) raw *= 0.8;
    if (o.basic && a.cls === 'priest') raw *= 0.6;
    if (o.basic && a.cls === 'bard') raw *= 0.5;
    if (kind === 'phys' && !o.ranged) raw *= rowDmgMul(a);
    raw *= zoneMul(a);
    if (a.changePen) raw *= 0.85;
    if (a.side === 'p' && a.merc) raw *= 1 + Math.min(0.12, 0.03 * adjRankSum(a));
    // 방어
    var dv = kind === 'mag' ? t.mdef : t.def;
    dv *= 1 - Math.min(80, a.pen + (o.pen || 0)) / 100;
    if (hasBuff(t, 'taunt')) dv *= 1.3;
    if (t.side === 'p') { if (engage === 'defensive') dv *= 1.2; if (engage === 'ruthless') dv *= 0.85; }
    var dmg = raw * 60 / (60 + dv);
    if (kind === 'mag' && t.merc && G.M.has(t.merc, 'manaVoid')) dmg *= 0.3;
    if (o.fire && t.merc && G.M.has(t.merc, 'dragonScale')) dmg *= 0.5;
    dmg *= 1 + buff(t, 'mark');
    if (t.cls === 'archer' && a.range === 'melee' && !o.ranged) dmg *= 1.3;
    if (t.bossKey === 'guardian' && a.row === 'front' && kind === 'phys' && a.range === 'melee') dmg *= 0.6;
    if (o.mul2) dmg *= o.mul2;
    if (t.side === 'p' && t.merc) dmg *= 1 - Math.min(0.12, 0.03 * adjRankSum(t));
    dmg = Math.max(1, Math.round(dmg));
    // 서포트 A: 인접한 동료가 큰 피해를 대신 맞아 줌
    if (t.side === 'p' && t.merc && dmg >= t.maxHp * 0.2 && ctx.bonds) {
      var cov = units.filter(function (x) { return x !== t && x.alive && x.side === 'p' && x.merc && !x.summon && G.Social.adjacent(t, x) && bondRank(t, x) >= 3; })[0];
      if (cov && G.chance(0.25)) { var half = Math.round(dmg / 2); cov.hp -= half; dmg -= half; ev.note = (ev.note ? ev.note + ' / ' : '') + cov.name + '이(가) 대신 맞았다'; RP(cov).cover++; RP(cov).taken += half; if (cov.hp <= 0) knockOut(cov, a); }
    }
    // 맹세의 반지: 다른 착용자가 대신 받음
    if (crit && t.merc && t.merc.equip.acc && t.merc.equip.acc.fx && t.merc.equip.acc.fx.oath) {
      var partner = allies(t).filter(function (x) { return x !== t && x.merc && x.merc.equip.acc && x.merc.equip.acc.fx && x.merc.equip.acc.fx.oath; })[0];
      if (partner) { var half = Math.round(dmg / 2); partner.hp -= half; dmg -= half; ev.note = '맹세의 반지'; if (partner.hp <= 0) knockOut(partner, a); }
    }
    t.hp -= dmg; ev.dmg = dmg; ev.crit = crit;
    a.dmgDealt += dmg;
    if (t.side === 'p' && t.merc) RP(t).taken += dmg;
    if (a.leech) { var l = Math.round(dmg * a.leech); a.hp = Math.min(a.maxHp, a.hp + l); }
    // 피격 부상 판정 (용병)
    if (t.merc && t.hp > 0 && (crit || dmg >= t.maxHp * 0.3)) {
      var p = t.merc.inj * 0.012;
      if (engage === 'ruthless' && t.side === 'p') p *= 1.3;
      if (t.cls === 'berserker') p *= 1.3;
      if (crit && G.M.has(t.merc, 'supple')) p *= 0.3;
      if (crit && G.M.has(t.merc, 'fragile')) p *= 2;
      if (hasDemonish && (t.merc.race === 'human' || t.merc.race === 'elf') && units.some(function (x) { return x.side === t.side && x.merc && x.merc.race === 'demon'; })) p *= 1.2;
      if (G.chance(p)) { var sev = G.chance(t.merc.inj * 0.008) ? 2 : 1; t.injuries.push(sev); ev.injury = sev; }
    }
    if (t.merc && G.M.has(t.merc, 'hothead') && t.hp > 0) t.hotTrigger = true;
    if (t.side === 'p') { addTen(t, crit ? 0.5 : 0.15); t.hitsTaken++; }
    if (t.hp <= 0) knockOut(t, a, ev);
    return ev;
  }
  function knockOut(t, a, ev) {
    if (!t.alive) return;
    t.alive = false; t.ko = true; t.overkill = -t.hp / t.maxHp; t.hp = 0;
    if (ev) ev.ko = true;
    if (t.side === 'p' && t.merc) { RP(t).ko = state.actions; units.forEach(function (o) { var r = o.alive && o.side === 'p' && o.merc ? bondRank(o, t) : 0; if (r > 0) { RP(o).grief++; addTen(o, r * 1.5); } }); }
    if (a) { a.kills++; if (a.merc && (t.tags.indexOf('undead') >= 0 || t.tags.indexOf('demon') >= 0)) a.unholy = (a.unholy || 0) + 1; }
    if (a && a.merc && G.M.has(a.merc, 'bloodlust')) { a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.08); addTen(a, -1); }
    if (t.side === 'p' && t.merc) P().forEach(function (o) { if (!G.M.has(o.merc || { traits: [], race: 'human' }, 'optimist')) addTen(o, 2); });
    if (t.boss && t.bossKey === 'queen') units.forEach(function (x) { if (x.alive && x.side === 'e' && (x.mon === 'egg' || x.mon === 'spiderling')) { x.alive = false; x.ko = true; x.hp = 0; } });
  }
  function healUnit(src, t, amt, label) {
    if (state.aura) { // 치유 반전
      var d = Math.round(amt * 1.3); t.hp -= d;
      var e = { id: t.id, dmg: d, note: '치유 반전!' };
      if (t.hp <= 0) knockOut(t, null, e);
      return e;
    }
    var before = t.hp; t.hp = Math.min(t.maxHp, t.hp + amt);
    if (src && src.merc) RP(src).heal += Math.round(t.hp - before);
    return { id: t.id, heal: Math.round(t.hp - before) };
  }
  function cdReady(u, sk) { return !(u.cds[sk] > 0) && u.mp >= (D.SKILLS[sk].mp || 0) * (u.merc && G.M.has(u.merc, 'manaControl') ? 0.5 : 1); }
  function useSkillCost(u, sk) {
    var S = D.SKILLS[sk]; u.cds[sk] = S.cd; u.mp -= (S.mp || 0) * (u.merc && G.M.has(u.merc, 'manaControl') ? 0.5 : 1);
    if (S.cost) state.goldSpent += S.cost;
    if (u.merc && u.tactic.skill === 'aggressive' && !G.M.has(u.merc, 'manaControl')) addTen(u, 0.3);
    if (u.merc && G.I.hasOpt(u.merc, 'matMul')) { allies(u).forEach(function (o) { addTen(o, 1); }); }
  }
  function freqP(u) { var f = u.tactic ? u.tactic.skill : 'normal'; return f === 'save' ? 0.25 : f === 'aggressive' ? 1 : 0.7; }

  // 용병(양측) 행동
  function mercAct(u) {
    var ev = { a: u.id, type: 'attack', targets: [] };
    var m = u.merc;
    // 패닉
    var com = G.M.stat(m, 'com'); RP(u).n++;
    if (u.mind === 'panic' && G.chance(0.5)) { RP(u).pan++; ev.type = 'panic'; ev.text = u.name + ' — 공황에 빠져 허둥댄다'; return ev; }
    if (u.mind === 'fear' && G.chance(0.3)) { RP(u).pan++; ev.type = 'panic'; ev.text = u.name + ' — 위축되어 움직이지 못한다'; return ev; }
    if (u.mind === 'rage' && G.chance(0.2)) {
      var vs = allies(u).filter(function (x) { return x !== u; });
      if (vs.length) { var v2 = G.pick(vs); var r2 = strike(u, v2, 1, 'phys', {}); RP(u).fk.push({ to: v2.name, why: '분노', dmg: r2.dmg || 0, ko: !!r2.ko }); ev.type = 'friendly'; ev.text = u.name + ' — 분노에 눈이 멀어 아군 ' + v2.name + '을(를) 공격!'; ev.targets.push(r2); return ev; }
    }
    if (u.ten >= 11 && !u.drunk) {
      var pp = (u.ten - 10) * 0.05 - (com - 8) * 0.02 + (state.illusion > 0 ? 0.12 : 0);
      if (G.chance(pp)) {
        if (state.illusion > 0 && G.chance(0.5)) {
          var victims = allies(u).filter(function (x) { return x !== u; });
          if (victims.length) { var v = G.pick(victims); ev.type = 'friendly'; ev.text = u.name + ' — 환영에 홀려 아군 ' + v.name + '을(를) 공격!'; var rr = strike(u, v, 1, 'phys', { autoHit: false }); RP(u).fk.push({ to: v.name, why: '환술사의 환영', dmg: rr.dmg || 0, ko: !!rr.ko }); ev.targets.push(rr); return ev; }
        }
        RP(u).pan++;
        ev.type = 'panic'; ev.text = u.name + ' — 겁에 질려 머뭇거린다 (긴장 ' + Math.round(u.ten) + ')'; return ev;
      }
    }
    // 물약
    var thr = (u.tactic && u.tactic.potion) || 0;
    if (u.side === 'p' && thr && hpPct(u) * 100 <= thr && ctx.potions > state.potionsUsed) {
      var smart = (G.M.stat(m, 'jud') + G.M.stat(m, 'int')) / 2 >= 13;
      if (!(state.aura && smart)) {
        state.potionsUsed++;
        var eff = units.some(function (x) { return x.side === 'p' && x.alive && x.cls === 'alchemist'; }) ? 1.5 : 1;
        ev.type = 'potion'; ev.text = u.name + ' — 물약 복용'; ev.targets.push(healUnit(u, u, u.maxHp * 0.4 * eff)); return ev;
      }
    }
    // 지시 이행 판정
    var mode = u.tactic ? u.tactic.target : 'nearest';
    var score = compliance(u);
    var pObey = G.clamp(0.35 + score * 0.09 - (u.cls === 'rogue' ? 0.08 : 0) + G.Social.obeyMod(m), 0.2, 0.98);
    var disobey = !G.chance(pObey);
    var hot = false;
    if (u.hotTrigger && G.chance(0.4)) { disobey = true; hot = true; u.agg = Math.min(20, u.agg + 4); }
    if (u.mind === 'rage') disobey = true;
    u.hotTrigger = false;
    var whyD = null;
    if (disobey) {
      var lea0 = u.side === 'p' ? leaderLea : 10, tea0 = teamwork(u);
      whyD = hot ? '피격에 다혈질 폭발' : u.mind === 'rage' ? '분노 상태' : u.mind === 'doubt' ? '의심 상태(팀워크 0)' : u.ten >= 9 ? '긴장 ' + Math.round(u.ten) + ' (수행력 ' + Math.round(pObey * 100) + '%)' : tea0 < 6 ? '팀워크 ' + Math.round(tea0) : lea0 < 9 ? '주장 리더십 ' + Math.round(lea0) : m.traits.indexOf('paranoid') >= 0 || m.traits.indexOf('temper') >= 0 ? '성향(의심증·격정)' : '운 나쁜 판정 (수행력 ' + Math.round(pObey * 100) + '%)';
    } else RP(u).obey++;
    if (disobey) {
      if (u.agg >= 13 || u.cls === 'berserker') {
        if (u.range !== 'ranged' && u.row !== 'front') { u.row = 'front'; ev.move = 'front'; }
        u.charged = true; mode = 'nearest';
        ev.disobey = '돌진'; ev.text = u.name + ' — 명령 무시! 돌진한다'; RP(u).dis.push({ t: '돌진', ten: Math.round(u.ten), p: Math.round(pObey * 100), why: '호전성 ' + Math.round(u.agg) + ' + ' + whyD });
      } else if ((G.M.stat(m, 'int') + G.M.stat(m, 'vis')) / 2 < 9) { mode = 'nearest'; ev.disobey = '타겟 착오'; ev.text = u.name + ' — 지시한 대상을 놓쳤다'; RP(u).dis.push({ t: '타겟 착오', ten: Math.round(u.ten), p: Math.round(pObey * 100), why: whyD + ' / 지능·시야 낮음' }); }
      else { mode = 'nearest'; ev.disobey = '지시 무시'; RP(u).dis.push({ t: '지시 무시', ten: Math.round(u.ten), p: Math.round(pObey * 100), why: whyD }); }
    }
    // 천재성
    var gen = G.M.stat(m, 'gen'), genius = false;
    if (gen >= 14 && G.chance((gen - 12) * 0.012 + G.M.stat(m, 'luk') * 0.001)) {
      genius = true; ev.genius = true;
      var caster = foes(u).filter(function (x) { return x.casting; })[0];
      if (caster) { caster.casting = null; if (caster.bossKey === 'archbishop') state.auraNext = false; ev.text = u.name + ' — 천재성 발동! ' + caster.name + '의 시전을 끊었다'; ev.type = 'interrupt'; ev.targets.push(strike(u, caster, 1.2, u.mat > u.atk ? 'mag' : 'phys', { autoHit: true })); return ev; }
      u.cds = {}; u.gauge += 60;
    }
    // 스킬 선택
    var C = D.CLASSES[u.cls], fp = freqP(u);
    var skills = C.skills;
    for (var i = 0; i < skills.length; i++) {
      var sk = skills[i], S = D.SKILLS[sk];
      if (!genius && !cdReady(u, sk)) continue;
      var r = trySkill(u, sk, S, mode, fp, genius);
      if (r) { r.genius = genius; r.disobey = ev.disobey; r.move = ev.move; if (ev.text && !r.text) r.text = ev.text; return r; }
    }
    // 기본 공격
    var t = pickTarget(u, mode, reachAll(u));
    if (!t) return null;
    var kind = (u.cls === 'mage' || u.cls === 'warlock' || u.cls === 'elementalist') ? 'mag' : u.mat > u.atk * 1.2 ? 'mag' : 'phys';
    ev.targets.push(strike(u, t, kind === 'mag' ? 0.7 : 1, kind, { basic: true, ranged: u.range === 'ranged' }));
    // 처형인
    if (m && G.M.has(m, 'executioner') && t.alive && hpPct(t) < 0.3 && !t.boss && G.chance(G.M.stat(m, 'jud') * 0.015 + G.I.optSum(m, 'exec') / 100)) { t.hp = 0; knockOut(t, u, ev.targets[0]); ev.targets[0].note = '처형!'; }
    return ev;
  }
  function trySkill(u, sk, S, mode, fp, forced) {
    var ev = { a: u.id, type: 'skill', skill: sk, targets: [] };
    var al = allies(u), fs = foes(u);
    if (S.kind === 'heal') {
      var thr = u.tactic.skill === 'save' ? 0.45 : u.tactic.skill === 'aggressive' ? 0.8 : 0.6;
      var hurt = al.filter(function (x) { return hpPct(x) < thr; }).sort(function (a, b) { return hpPct(a) - hpPct(b); })[0];
      if (!hurt) return null;
      if (state.aura) {
        if (u.tactic.skill === 'save') return null;
        if ((G.M.stat(u.merc, 'jud') + G.M.stat(u.merc, 'int')) / 2 >= 14 && G.chance(0.7)) return null;
      }
      useSkillCost(u, sk);
      var care = 1;
      ev.targets.push(healUnit(u, hurt, u.mat * 1.1 + G.M.stat(u.merc, 'int') * 2 * care));
      return ev;
    }
    if (S.kind === 'purify') {
      var avgT = G.avg(al.map(function (x) { return x.ten || 0; }));
      var poisoned = al.some(function (x) { return hasBuff(x, 'poison') || hasBuff(x, 'bleed'); });
      var need = u.tactic.skill === 'save' ? avgT >= 12 : u.tactic.skill === 'aggressive' ? avgT >= 5 || poisoned : avgT >= 8 || poisoned;
      if (!need) return null;
      useSkillCost(u, sk);
      al.forEach(function (x) { addTen(x, -2 * (x.merc && G.M.has(x.merc, 'coldBlood') ? 0.5 : 1)); x.buffs = x.buffs.filter(function (b) { return b.k !== 'poison' && b.k !== 'bleed'; }); ev.targets.push({ id: x.id, buff: '정화' }); });
      return ev;
    }
    if (S.kind === 'song') {
      var avgT2 = G.avg(al.map(function (x) { return x.ten || 0; }));
      if (!(avgT2 >= 4 || !al.some(function (x) { return hasBuff(x, 'song'); })) || !G.chance(fp)) return null;
      useSkillCost(u, sk);
      al.forEach(function (x) { addTen(x, -2 * (x.merc && G.M.has(x.merc, 'coldBlood') ? 0.5 : 1)); addBuff(x, 'song', 0.15, 3); ev.targets.push({ id: x.id, buff: '용기' }); });
      return ev;
    }
    if (S.kind === 'taunt') {
      var danger = al.some(function (x) { return x !== u && hpPct(x) < 0.55; }) || fs.some(function (x) { return x.boss; });
      if (!danger || hasBuff(u, 'taunt') || !G.chance(fp + 0.2)) return null;
      useSkillCost(u, sk); addBuff(u, 'taunt', 1, 2); ev.targets.push({ id: u.id, buff: '도발' }); return ev;
    }
    if (S.kind === 'summon') {
      if (al.some(function (x) { return x.summon; }) || !G.chance(fp + 0.2)) return null;
      useSkillCost(u, sk);
      var s = { id: G.uid(), side: u.side, name: '언데드 미끼', summon: true, row: 'front', slot: 3, hp: Math.round(u.maxHp * 0.6), maxHp: Math.round(u.maxHp * 0.6), mp: 0, maxMp: 0,
        atk: u.mat * 0.5, mat: 0, def: u.def * 1.2, mdef: u.mdef, hit: 80, eva: 0, crit: 0, spd: u.spd * 0.6, pen: 0, leech: 0, regen: 0, gauge: 0, cds: {}, buffs: [], alive: true, ko: false, kind: 'phys', range: 'melee', tags: ['undead', 'summon'], windLeft: 0, dmgDealt: 0, kills: 0, mon: 'skeleton' };
      units.push(s); ev.type = 'summon'; ev.spawn = snapshot(s); return ev;
    }
    if (S.kind === 'curse') {
      if (!G.chance(fp)) return null;
      var tc = pickTarget(u, fs.some(function (x) { return x.boss; }) ? 'boss' : 'nearest', true); if (!tc || hasBuff(tc, 'curse')) return null;
      useSkillCost(u, sk); addBuff(tc, 'curse', 0.25, 3); ev.targets.push({ id: tc.id, buff: '저주' }); return ev;
    }
    // 공격 스킬
    if (!forced && !G.chance(fp)) return null;
    var t = pickTarget(u, mode, reachAll(u) || S.kind === 'magAoe' || S.kind === 'bomb');
    if (!t) return null;
    if (u.merc && G.M.has(u.merc, 'perfectionist') && (u.hit - t.eva) < 90 && !forced) return null;
    useSkillCost(u, sk);
    var ranged = u.range === 'ranged';
    if (S.kind === 'magAoe' || S.kind === 'bomb') {
      var kind = S.kind === 'bomb' ? (u.mat > u.atk ? 'mag' : 'phys') : 'mag';
      fs.forEach(function (x) { ev.targets.push(strike(u, x, S.mult, kind, { ranged: true, fire: true })); });
    } else if (S.kind === 'mag') {
      ev.targets.push(strike(u, t, S.mult, 'mag', { ranged: true }));
    } else if (S.kind === 'pierce') {
      ev.targets.push(strike(u, t, S.mult, 'phys', {}));
      var behind = fs.filter(function (x) { return x !== t && x.slot === t.slot && x.row !== t.row; })[0] || fs.filter(function (x) { return x !== t; })[0];
      if (behind) ev.targets.push(strike(u, behind, S.mult * 0.8, 'phys', {}));
    } else if (S.kind === 'mark') {
      addBuff(t, 'mark', 0.25, 3); ev.targets.push(strike(u, t, S.mult, 'phys', { ranged: true })); ev.targets[0].buff = '약점';
    } else if (S.kind === 'spellblade') {
      var useMag = t.mdef < t.def;
      var o = { mul2: 1 }; var save = u.atk; u.atk = (u.atk + u.mat) * 0.6; var saveM = u.mat; u.mat = (save + saveM) * 0.6;
      ev.targets.push(strike(u, t, S.mult, useMag ? 'mag' : 'phys', o)); u.atk = save; u.mat = saveM;
    } else if (S.kind === 'flurry') {
      ev.targets.push(strike(u, t, S.mult, 'phys', {}));
      if (t.alive) { var e2 = strike(u, t, S.mult, 'phys', {}); if (!e2.miss && t.alive && G.chance(0.25) && !t.boss) { addBuff(t, 'stun', 1, 1); e2.buff = '기절'; } ev.targets.push(e2); }
    } else {
      ev.targets.push(strike(u, t, S.mult, 'phys', { crit: S.crit || 0, ignoreEva: S.ignoreEva || 0, ranged: ranged }));
      if (S.selfDmg) { u.hp = Math.max(1, u.hp - Math.round(u.maxHp * S.selfDmg)); }
    }
    return ev;
  }

  // 몬스터 행동
  function monAct(u) {
    var ev = { a: u.id, type: 'attack', targets: [] };
    var M = D.MONSTERS[u.mon] || {};
    var ps = P(); if (!ps.length) return null;
    if (u.boss) return bossAct(u, ev);
    if (M.explode) {
      ev.type = 'explode'; ev.text = '자폭 새끼거미가 터졌다! (지구력·긴장 피해)';
      ps.forEach(function (x) { var e = strike(u, x, 1.3, 'phys', { autoHit: true }); e.sta = 8; x.staLoss = (x.staLoss || 0) + 8; addTen(x, 1.5); ev.targets.push(e); });
      u.alive = false; u.ko = true; u.hp = 0; ev.selfDie = true; return ev;
    }
    var t = enemyTarget(u, M.prefer);
    var e = strike(u, t, 1, u.kind, { ranged: u.range === 'ranged' });
    ev.targets.push(e);
    if (!e.miss && t.alive) {
      if (M.poison && G.chance(M.poison) && !relic('graal')) { addBuff(t, 'poison', 0.04, 3); e.buff = '중독'; }
      if (M.spore) { addTen(t, M.spore); e.buff = '포자'; }
      if (M.fear) { addTen(t, M.fear); e.buff = '공포'; }
      if (M.execute && hpPct(t) < 0.3) { var e2 = strike(u, t, 0.8, 'phys', { autoHit: true }); e2.note = '처형'; ev.targets.push(e2); }
    }
    return ev;
  }
  function enemyTarget(u, prefer) {
    var ps = P();
    var taunter = ps.filter(function (x) { return hasBuff(x, 'taunt'); })[0];
    if (taunter && G.chance(0.75)) return taunter;
    var ranged = u.range === 'ranged';
    var cand;
    if (prefer === 'back') { var bk = ps.filter(function (x) { return x.row === 'back'; }); cand = bk.length && G.chance(0.6) ? bk : ps; }
    else if (!ranged) {
      var fr = ps.filter(function (x) { return x.row === 'front'; }), md = ps.filter(function (x) { return x.row === 'mid'; }), bk2 = ps.filter(function (x) { return x.row === 'back'; });
      if (fr.length) { var r = G.R(); cand = r < 0.7 ? fr : r < 0.9 && md.length ? md : bk2.length ? bk2 : fr; }
      else cand = md.length ? md : ps;
    } else { var r2 = G.R(); var bk3 = ps.filter(function (x) { return x.row === 'back'; }); cand = r2 < 0.45 && bk3.length ? bk3 : ps; }
    var t = G.pick(cand);
    // 철벽: 원거리 공격 대신 맞기
    if (ranged) {
      var wall = ps.filter(function (x) { return x !== t && x.merc && G.M.has(x.merc, 'ironWall') && G.M.hasShield(x.merc); })[0];
      if (wall && G.chance(0.3)) t = wall;
    }
    return t;
  }
  function bossAct(u, ev) {
    u.turns++;
    var ps = P();
    if (u.bossKey === 'queen') {
      var eggs = E().filter(function (x) { return x.mon === 'egg'; });
      // 고치 부화
      eggs.forEach(function (eg) { eg.hatch--; if (eg.hatch <= 0) { eg.mon = 'spiderling'; eg.noAct = false; var st = G.C.monsterStats('spiderling', ctx.floor, false); eg.name = '자폭 새끼거미'; eg.atk = st.atk; eg.spd = st.spd; eg.hit = st.hit; eg.tags = ['beast', 'summon']; eg.small = true; eg.gauge = 80; ev.hatch = (ev.hatch || []).concat([eg.id]); } });
      if (eggs.length < 4) {
        var free = [0, 1, 2, 3].filter(function (s) { return !E().some(function (x) { return x.row === 'back' && x.slot === s; }); });
        var egg = G.C.monUnit('egg', ctx.floor, false, 'back', free.length ? free[0] : 0);
        egg.hatch = 3; egg.tags = ['summon']; egg.noAct = true; units.push(egg);
        ev.type = 'egg'; ev.spawn = snapshot(egg); ev.text = '여왕거미가 고치를 낳았다 (3턴 후 부화)';
        if (u.turns % 2 === 0) return ev;
      }
      var t = enemyTarget(u);
      var e = strike(u, t, 0.9, 'phys', {}); ev.targets.push(e);
      if (!e.miss && G.chance(0.35)) { addBuff(t, 'web', 15, 2); e.buff = '거미줄'; }
      ev.type = ev.type === 'egg' ? 'egg' : 'attack';
      return ev;
    }
    if (u.bossKey === 'guardian') {
      // 후위·최저 HP 돌진
      var back = ps.filter(function (x) { return x.row === 'back'; });
      var t2 = (back.length && G.chance(0.6) ? back : ps).slice().sort(function (a, b) { return hpPct(a) - hpPct(b); })[0];
      ev.type = 'charge'; ev.text = '수문장이 전열을 무시하고 ' + t2.name + '에게 돌진!';
      var mids = ps.filter(function (x) { return x.row === 'mid' && x !== t2 && !hasBuff(x, 'stun'); });
      var blocker = null;
      mids.forEach(function (x) { var c = (x.agi0 || (x.merc ? G.M.stat(x.merc, 'agi') : 5) + (x.agg || 5)) / 60 + (engage === 'defensive' ? 0.15 : 0); if (!blocker && G.chance(c)) blocker = x; });
      if (blocker) { ev.text += ' — ' + blocker.name + '이(가) 몸으로 막았다!'; ev.block = blocker.id; ev.targets.push(strike(u, blocker, 0.7, 'phys', { autoHit: true })); addBuff(u, 'stun', 1, 1); return ev; }
      ev.targets.push(strike(u, t2, 1.4, 'phys', {}));
      return ev;
    }
    if (u.bossKey === 'illusionist') {
      if (u.turns % 3 !== 0) {
        ev.type = 'illusion'; ev.text = '환술사의 환영 — 파티 긴장 폭증, 팀워크 마비';
        state.illusion = 3; state.teamZero = 2;
        ps.forEach(function (x) { addTen(x, 2.8); ev.targets.push({ id: x.id, buff: '환영' }); });
        var tt = G.pick(ps); ev.targets.push(strike(u, tt, 0.7, 'mag', { ranged: true }));
        return ev;
      }
      var t3 = G.pick(ps); ev.targets.push(strike(u, t3, 1, 'mag', { ranged: true })); return ev;
    }
    if (u.bossKey === 'archbishop') {
      if (state.aura && u.turns % 4 === 0) { state.aura = false; ev.type = 'auraOff'; ev.text = '치유 반전 오라가 걷혔다'; }
      if (u.turns % 4 === 1) { u.casting = 'aura'; state.auraNext = true; ev.type = 'cast'; ev.text = '대주교 주위로 검은 기운이 모인다…'; return ev; }
      if (u.turns % 4 === 2 && state.auraNext) { state.aura = true; state.auraNext = false; u.casting = null; ev.type = 'aura'; ev.text = '치유 반전 오라! 회복이 독이 된다'; }
      var ts = G.shuffle(ps.slice()).slice(0, 2);
      ts.forEach(function (x) { ev.targets.push(strike(u, x, 0.85, 'mag', { ranged: true })); });
      return ev;
    }
    return null;
  }

  // 전투 시작 처리: 이단 심문관 아군 공격
  P().forEach(function (u) {
    if (u.merc && G.M.has(u.merc, 'inquisitor') && hasDemonish && !(u.merc.story && u.merc.story.done) && G.chance(0.1)) {
      var v = P().filter(function (x) { return x !== u && x.merc && (x.merc.race === 'demon' || x.cls === 'warlock'); })[0];
      if (v) { var rrr = strike(u, v, 1, 'phys', { autoHit: true }); RP(u).fk.push({ to: v.name, why: '이단 심문관의 증오', dmg: rrr.dmg || 0, ko: !!rrr.ko }); log.push({ a: u.id, type: 'friendly', text: u.name + ' — 이단을 용납할 수 없다! ' + v.name + '을(를) 공격', targets: [rrr] }); }
    }
  });
  // 선제 기습 (전격 돌파)
  if (ctx.ambushFirst) P().forEach(function (u) { u.gauge += 40; });
  if (ctx.ambushed) E().forEach(function (u) { u.gauge += 50; });
  if (ctx.drunk) P().forEach(function (u) { if (u.merc && G.M.has(u.merc, 'drinker')) u.drunk = true; });

  var result = 'ongoing';
  while (state.actions < 360) {
    var alive = units.filter(function (u) { return u.alive && !(u.noAct); });
    if (!E().length) { result = 'win'; break; }
    if (!P().filter(function (u) { return !u.summon; }).length) {
      if (state.phoenix) { state.phoenix = false; ctx.phoenixUsed = true; units.forEach(function (u) { if (u.side === 'p' && u.merc && u.ko) { u.alive = true; u.ko = false; u.hp = Math.round(u.maxHp * 0.3); } }); log.push({ type: 'phoenix', text: '불사조 깃털이 타오른다! 전원 부활', targets: [] }); continue; }
      result = 'lose'; break;
    }
    // 다음 행동자
    var best = null, bt = Infinity;
    alive.forEach(function (u) {
      var spd = u.spd * (u.side === 'p' ? ((engage === 'ruthless' ? 1.1 : 1) * (relic('warDrum') ? 1.1 : 1)) : 1);
      if (hasBuff(u, 'web')) spd *= 0.7;
      u._spd = Math.max(1, spd);
      var t = (100 - u.gauge) / u._spd; if (t < bt) { bt = t; best = u; }
    });
    if (!best) { result = 'lose'; break; }
    alive.forEach(function (u) { u.gauge += u._spd * Math.max(0, bt); });
    best.gauge -= 100;
    state.actions++;
    var u = best;
    // 턴 시작: 상태이상
    var pre = [];
    u.buffs.forEach(function (b) {
      if (b.k === 'poison' || b.k === 'bleed') { var dm = Math.max(1, Math.round(u.maxHp * b.v)); u.hp -= dm; pre.push({ id: u.id, dmg: dm, note: b.k === 'poison' ? '독' : '출혈' }); }
    });
    if (u.hp <= 0) { knockOut(u, null, pre[pre.length - 1]); log.push({ a: u.id, type: 'dot', targets: pre }); continue; }
    if (u.regen && u.merc) {
      if (state.aura) { var gr = G.I.optSum(u.merc, 'regen'); if (gr) { u.hp -= Math.round(gr * 3); pre.push({ id: u.id, dmg: Math.round(gr * 3), note: '재생 반전' }); if (u.hp <= 0) { knockOut(u, null, pre[pre.length - 1]); log.push({ a: u.id, type: 'dot', targets: pre }); continue; } } }
      else u.hp = Math.min(u.maxHp, u.hp + u.regen);
    }
    if (u.merc) u.mp = Math.min(u.maxMp, u.mp + 2 + G.M.stat(u.merc, 'mag') * 0.1);
    for (var k in u.cds) if (u.cds[k] > 0) u.cds[k]--;
    var stunned = hasBuff(u, 'stun');
    u.buffs.forEach(function (b) { b.t--; }); u.buffs = u.buffs.filter(function (b) { return b.t > 0; });
    if (u.merc && u.side === 'p' && u.merc.equip.weapon && G.I.hasOpt(u.merc, 'aggUp')) u.agg = Math.min(20, u.agg + 2);
    if (u.merc && G.M.has(u.merc, 'selfRighteous') && leader && leader !== u && G.M.ca(leader.merc) < G.M.ca(u.merc)) addTen(u, 0.3);
    if (u.side === 'p') { if (state.teamZero > 0 && u === P()[0]) state.teamZero--; if (state.illusion > 0 && u === P()[0]) state.illusion--; }
    if (stunned) { log.push({ a: u.id, type: 'stunned', text: u.name + ' — 기절', targets: pre }); continue; }
    var ev = u.merc ? mercAct(u) : u.summon ? (function () { var t = pickTarget(u, 'nearest', false); return t ? { a: u.id, type: 'attack', targets: [strike(u, t, 1, 'phys', {})] } : null; })() : monAct(u);
    if (ev) { if (pre.length) ev.pre = pre; ev.hp = units.map(function (x) { return [x.id, Math.max(0, Math.round(x.hp)), x.alive ? 1 : 0, x.row]; }); log.push(ev); }
  }
  if (result === 'ongoing') result = 'retreat';
  log.push({ type: 'end', result: result, text: result === 'win' ? '승리!' : result === 'lose' ? '패배…' : '전투가 길어져 후퇴했다' });
  var report = { rounds: state.actions, enemies: units.filter(function (x) { return x.side === 'e' && !x.summon; }).slice(0, 8).map(function (x) { return x.name; }), units: [] };
  units.forEach(function (x) {
    if (x.side !== 'p' || !x.merc || x.summon) return;
    var r = RP(x);
    report.units.push({ id: x.merc.id, name: x.name, cls: x.cls, rowName: RPK[x.row] || '', dealt: Math.round(x.dmgDealt), taken: Math.round(r.taken), heal: Math.round(r.heal), kills: x.kills, n: r.n, obey: r.obey, dis: r.dis, pan: r.pan, fk: r.fk, ko: r.ko, t0: r.t0, tm: r.tm, t1: Math.round(x.ten), minds: r.minds, cover: r.cover, grief: r.grief, hpEnd: Math.round(x.hp / x.maxHp * 100) });
  });
  return { result: result, log: log, units: units, potionsUsed: state.potionsUsed, goldSpent: state.goldSpent, phoenixUsed: ctx.phoenixUsed, actions: state.actions, report: report };
};
