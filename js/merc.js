// 용병: 생성, CA/PA, 파생 수치, 성장, 노화, 부상, 전직, 주급, 스카우트
var G = window.G = window.G || {};
G.M = {};
var D = G.D;

G.M.has = function (m, t) {
  if (m.traits.indexOf(t) >= 0) return true;
  var r = D.RACES[m.race]; return r && r.traits.indexOf(t) >= 0;
};
G.M.allTraits = function (m) { return D.RACES[m.race].traits.concat(m.traits); };

// ───── CA (직업 가중치) ─────
G.M.weight = function (cls, s) {
  var C = D.CLASSES[cls];
  if (C.core.indexOf(s) >= 0) return 2;
  if (C.sub.indexOf(s) >= 0) return 1;
  return 0.5;
};
G.M.caFrom = function (stats, cls) {
  var t = 0; D.STATS.forEach(function (s) { t += G.M.weight(cls, s) * stats[s]; });
  return t / 1.9;
};
G.M.ca = function (m, cls) { return G.M.caFrom(m.stats, cls || m.cls); };
G.M.traitCost = function (m) { var t = 0; for (var k in m.learned) t += m.learned[k]; return t; };
G.M.usedCA = function (m) { return G.M.ca(m) + G.M.traitCost(m); };

// ───── 나이 ─────
G.M.effAge = function (m, forAging) {
  var sc = D.RACES[m.race].ageScale;
  if (!sc) return 25; // 호문쿨루스: 노화 없음
  var a = m.age / sc;
  if (forAging) { if (G.M.has(m, 'veteran')) a += 5; if (G.M.has(m, 'lateBloomer')) a -= 5; }
  return a;
};
G.M.ageFactor = function (m) {
  var a = G.M.effAge(m), f = a <= 23 ? 1.5 : a <= 29 ? 1.25 : a <= 39 ? 1.0 : 0.5;
  if (G.M.has(m, 'lateBloomer')) f *= (a < 28 ? 0.8 : 1.3);
  return f;
};
G.M.isOld = function (m) { return D.RACES[m.race].ageScale > 0 && G.M.effAge(m, true) >= 40; };

// ───── 생성 ─────
G.M.genName = function () { return G.pick(D.NAMES) + ' ' + G.pick(D.SURN); };
G.M.pickClass = function (race, infamous) {
  var w = {};
  D.CLASS_ORDER.forEach(function (c) {
    var C = D.CLASSES[c]; if (C.tier !== 1) return;
    var v = C.w;
    var R = D.RACES[race];
    // 종족-직업 궁합 (성장 특화가 겹치면 가중)
    C.up.forEach(function (s) { if (R.up.indexOf(s) >= 0) v *= 1.35; if (R.down.indexOf(s) >= 0) v *= 0.7; });
    if (infamous && (c === 'rogue' || c === 'warlock' || c === 'berserker')) v *= 2.2;
    w[c] = v;
  });
  return G.wpick(w);
};
G.M.pickRace = function (infamous) {
  var w = {}; for (var k in D.RACES) w[k] = D.RACES[k].w * (infamous && (k === 'demon' || k === 'lizard') ? 2.5 : 1);
  return G.wpick(w);
};
G.M.pickAge = function (race) {
  var R = D.RACES[race], a = R.ages;
  // 젊은 쪽으로 치우친 분포
  var t = Math.pow(G.R(), 2.2);
  return Math.round(a[0] + (a[1] - a[0]) * t);
};
// 특성 점수 예산(좀보이드식): 좋은 특성은 점수, 나쁜 특성은 환급. 합이 −3~+5 안에 들도록 생성
G.M.rollTraits = function (cls, uniqueChance, infamous) {
  var traits = [], pts = 0, magic = D.MAGIC_CLASSES.indexOf(cls) >= 0;
  if (G.chance(uniqueChance)) {
    var pool = D.UNIQUE_POOL.filter(function (t) { return !(magic && (t === 'martialBody' || t === 'manaVoid')); });
    if (infamous) pool = pool.concat(['pirate', 'pirate', 'inquisitor']);
    var u = G.pick(pool); traits.push(u); pts += D.TRAITS[u].pts;
  }
  var n = G.wpick({ 0: 30, 1: 45, 2: 25 }) | 0;
  for (var i = 0; i < n; i++) {
    var cand = D.GENERAL_POOL.filter(function (t) { return traits.indexOf(t) < 0 && !(D.TRAITS[t].magic && !magic); });
    var g = G.pick(cand); traits.push(g); pts += D.TRAITS[g].pts;
  }
  // 예산 보정
  var guard = 0;
  while (pts > 5 && guard++ < 5) { var neg = G.pick(['neatFreak', 'drinker', 'hothead', 'lazy', 'singleMinded', 'agoraphobia']); if (traits.indexOf(neg) < 0) { traits.push(neg); pts += D.TRAITS[neg].pts; } }
  while (pts < -3 && guard++ < 10) { var pos = G.pick(['optimist', 'cooking', 'direction', 'weaponMastery', 'firstAid']); if (traits.indexOf(pos) < 0) { traits.push(pos); pts += D.TRAITS[pos].pts; } }
  // 상충 제거
  if (traits.indexOf('lateBloomer') >= 0 && traits.indexOf('veteran') >= 0) traits.splice(traits.indexOf('lateBloomer'), 1);
  if (traits.indexOf('optimist') >= 0 && traits.indexOf('hothead') >= 0) traits.splice(traits.indexOf('hothead'), 1);
  return traits;
};

// opts: {fameIdx, race, cls, age, name, founder, paFloor, caRange, ilvl, infamous}
G.M.create = function (opts) {
  opts = opts || {};
  var fame = D.FAME[opts.fameIdx || 0];
  var race = opts.race || G.M.pickRace(opts.infamous);
  var cls = opts.cls || G.M.pickClass(race, opts.infamous);
  var age = opts.age || G.M.pickAge(race);
  var traits = opts.traits || G.M.rollTraits(cls, opts.uniqueChance != null ? opts.uniqueChance : 0.22 + (opts.fameIdx || 0) * 0.03, opts.infamous);
  if (opts.founder && traits.indexOf('founder') < 0) traits.unshift('founder');
  var m = { id: G.uid(), name: opts.name || G.M.genName(), race: race, cls: cls, age: age, birthWeek: G.randi(0, 51),
    stats: {}, ten: G.rand(0, 2), agg: 10, inj: 10, pa: 100, traits: traits, learned: {}, story: null,
    injuries: [], perm: [], equip: {}, tactic: { target: 'nearest', skill: 'normal', potion: 30 },
    training: { program: 'combat', intensity: 'normal', custom: [], target: null }, fatigue: 0,
    hist: { battles: 0, kills: 0, expeditions: 0, deepest: 0, joined: 0, elites: 0, saves: 0, unholyKills: 0, wagesPaid: 0, bosses: [] },
    changePenalty: 0, status: 'guild', scoutErr: G.rand(-1, 1), founder: !!opts.founder,
    look: { hair: G.pick(D.HAIR), cloth: G.pick(D.CLOTH), cloth2: G.pick(D.CLOTH), eyes: G.pick(['#2a4a7a', '#4a2a1a', '#2a5a2a', '#5a3a6a', '#7a6a2a']) } };
  // 목표 CA: 명성 구간 + 나이 최소 보장
  var rng = opts.caRange || fame.ca;
  var eff = G.M.effAge(m);
  var ageMin = Math.max(0, (eff - 16) * 1.6);
  var lo = Math.max(rng[0], Math.min(ageMin * 0.9, rng[1] + 12)), hi = Math.max(rng[1], Math.min(ageMin + 8, rng[1] + 15));
  var target = G.rand(lo, hi);
  if (G.M.has(m, 'veteran')) target = Math.min(target * 1.2 + 4, rng[1] + 20);
  if (race === 'homun') target *= 1.15;
  // 스탯 성향 벡터
  var R = D.RACES[race], C = D.CLASSES[cls], shape = {};
  D.STATS.forEach(function (s) {
    var p = 1;
    if (R.up.indexOf(s) >= 0) p *= 1.25; if (R.down.indexOf(s) >= 0) p *= 0.8;
    var w = G.M.weight(cls, s); p *= w === 2 ? 1.28 : w === 1 ? 1.05 : 0.88;
    p *= Math.exp((G.R() - 0.5) * 0.45);
    shape[s] = p;
  });
  // 이분 탐색으로 목표 CA에 맞춤
  var a = 0.1, b = 25, st;
  for (var it = 0; it < 30; it++) {
    var L = (a + b) / 2; st = {};
    D.STATS.forEach(function (s) { st[s] = G.clamp(L * shape[s], 1, 20); });
    if (G.M.caFrom(st, cls) < target) a = L; else b = L;
  }
  D.STATS.forEach(function (s) { m.stats[s] = G.round1(st[s]); });
  // 특성 기반 고정치
  var S = m.stats;
  if (G.M.has(m, 'genius')) S.gen = G.rand(16, 20);
  if (G.M.has(m, 'veteran')) S.com = G.rand(18, 20);
  if (G.M.has(m, 'fallenNoble')) S.lea = Math.min(20, S.lea + 6);
  if (G.M.has(m, 'porter')) { S.con = Math.min(20, S.con + 3); S.sta = Math.min(20, S.sta + 3); }
  if (G.M.has(m, 'pirate')) S.str = Math.min(20, S.str + 2);
  if (G.M.has(m, 'emotionless')) { S.com = 20; S.luk = 1; }
  if (G.M.has(m, 'cursedChild')) S.luk = 0;
  if (G.M.has(m, 'manaVoid')) S.mag = 0;
  if (G.M.has(m, 'perfectionist')) S.cns = Math.min(20, S.cns + 3);
  // 성향·숨김 수치
  m.agg = G.clamp(Math.round(G.rand(4, 14) + (race === 'demon' ? 5 : 0) + (race === 'dragon' ? 3 : 0) + (cls === 'berserker' ? 5 : 0) + (cls === 'priest' ? -3 : 0) + (cls === 'bard' ? -2 : 0) + (G.M.has(m, 'pirate') ? 4 : 0) + (G.M.has(m, 'hothead') ? 4 : 0)), 1, 20);
  m.inj = G.M.has(m, 'glassBody') ? 20 : G.clamp(Math.round(4 + G.tri() * 12), 1, 20);
  if (race === 'bear' || race === 'lizard') m.inj = Math.max(1, m.inj - 2);
  if (race === 'fairy') m.inj = Math.min(20, m.inj + 3);
  // 잠재력 PA = 20 + 180 × (난수 3개 평균) → 평균 110
  var ca = G.M.ca(m);
  var pa0 = 20 + 180 * G.tri();
  if (pa0 < ca + 5) pa0 = ca + 5 + G.rand(0, 10);
  var f = eff <= 23 ? 1 : eff <= 27 ? 0.92 : eff <= 31 ? 0.8 : eff <= 35 ? 0.6 : eff <= 39 ? 0.4 : 0.2;
  if (G.M.has(m, 'veteran')) f *= 0.3;
  if (race === 'homun') f *= 0.5;
  var pa = ca + Math.max(3, (pa0 - ca) * f);
  if (opts.paFloor) pa = Math.max(pa, opts.paFloor);
  m.pa = Math.round(Math.min(200, pa));
  // 서사
  var story = null;
  traits.forEach(function (t) { if (D.TRAITS[t].story) story = D.TRAITS[t].story; });
  if (!story && !opts.founder && G.chance(0.35)) story = G.pick(D.GENERIC_STORIES);
  if (opts.story) story = opts.story;
  if (story) m.story = { id: story, prog: 0, done: false };
  // 장비
  var ilvl = opts.ilvl || Math.max(1, Math.round(ca / 6));
  m.equip = G.I.starterKit(cls, ilvl);
  if (m.equip.armor.atype === 'plate' && G.M.load(m) - G.M.capacity(m) > 2) m.equip.armor = G.I.makeArmor('leather', ilvl, 0, []);
  m.tactic.skill = G.M.has(m, 'miser') ? 'save' : 'normal';
  m.tactic.target = cls === 'rogue' ? 'back' : cls === 'hunter' || cls === 'archer' ? 'lowHp' : 'nearest';
  return m;
};

// ───── 유효 스탯 (부상·장비·특성 반영) ─────
G.M.stat = function (m, s, ctx) {
  var v = m.stats[s];
  if (s === 'ten') return m.ten; if (s === 'agg') return m.agg; if (s === 'inj') return m.inj;
  m.injuries.forEach(function (j) { if (j.pen[s]) v += j.pen[s]; });
  ['weapon', 'armor', 'acc'].forEach(function (sl) {
    var it = m.equip[sl]; if (!it) return;
    if (it.stat && it.stat[s]) v += it.stat[s];
    if (sl === 'armor' && s === 'mag' && it.mag) v += it.mag;
    it.opts.forEach(function (o) { var d = G.I.optData(o); if (d.stat && d.stat[s]) v += d.stat[s]; });
  });
  if (s === 'dex' && G.M.has(m, 'weaponMastery') && m.equip.weapon && D.CLASSES[m.cls].weapons[0] === m.equip.weapon.wtype) v += 3;
  if (s === 'con' && G.M.has(m, 'ironWall') && G.M.hasShield(m)) v += 2;
  if (s === 'cns' && G.M.has(m, 'perfectionist')) v += 0; // 생성 시 반영
  if (s === 'com' && G.M.has(m, 'emotionless')) return 20;
  if (s === 'mag' && G.M.has(m, 'manaVoid')) return 0;
  if (s === 'luk' && G.M.has(m, 'cursedChild')) return 0;
  if (ctx) {
    if (ctx.dark && (s === 'vis' || s === 'agi') && (G.M.has(m, 'nocturnal') || G.M.has(m, 'nightCat'))) v *= 1.2;
    if (ctx.exhausted) v *= 0.5;
    if (ctx.drunkless && s === 'jud') v -= 3;
    if (ctx.statAdd && ctx.statAdd[s]) v += ctx.statAdd[s];
  }
  return Math.max(0, v);
};
G.M.hasShield = function (m) { return m.cls === 'knight' || (m.equip.weapon && D.WEAPONS[m.equip.weapon.wtype].shield); };
G.M.load = function (m) {
  var w = 0;
  ['weapon', 'armor'].forEach(function (sl) { var it = m.equip[sl]; if (!it) return; var mul = 1; it.opts.forEach(function (o) { if (G.I.optData(o).wMul) mul *= G.I.optData(o).wMul; }); w += (it.w || 0) * mul; });
  return w;
};
G.M.capacity = function (m) { return G.M.stat(m, 'str') * 0.8 + 6 + (G.M.has(m, 'porter') ? 4 : 0); };

// ───── 파생 전투 수치 (기획서 공식) ─────
G.M.derive = function (m, ctx) {
  ctx = ctx || {};
  var st = function (s) { return G.M.stat(m, s, ctx); };
  var C = D.CLASSES[m.cls];
  var gearMul = G.M.has(m, 'craftsman') ? 1.2 : 1;
  var W = m.equip.weapon, A = m.equip.armor;
  var gAtk = (W ? W.atk : 0) * gearMul, gMat = (W ? W.mat : 0) * gearMul, gDef = ((A ? A.def : 0) + (W ? W.def || 0 : 0)) * gearMul, gMdef = (A ? A.mdef : 0) * gearMul, gHp = (A ? A.hp : 0) * gearMul;
  if (m.cls === 'monk') { gDef *= 0.5; }
  var str = st('str'), agi = st('agi');
  if (G.M.has(m, 'martialBody') && W) { str *= 1.5; agi *= 1.5; }
  var con = st('con'), sta = st('sta'), rec = st('rec'), mag = st('mag'), int = st('int'), dex = st('dex');
  var vis = st('vis'), jud = st('jud'), com = st('com'), gen = st('gen'), luk = st('luk');
  var ten = m.ten;
  var d = {};
  d.maxHp = con * 10 + sta * 5 + gHp + 20;
  if (m.cls === 'mage') d.maxHp *= 0.85; if (m.cls === 'elementalist' || m.cls === 'alchemist') d.maxHp *= 0.9;
  d.regen = rec * 0.5 + sta * 0.2 + G.I.optSum(m, 'regen');
  d.atk = gAtk + str * 1.5 + dex * 0.5;
  var fusion = G.I.optSum(m, 'fusion');
  d.mat = gMat + mag * 1.5 + int * 0.5;
  if (fusion) d.atk += d.mat * fusion;
  d.hit = 80 + vis + dex * 0.5 - ten * 0.5;
  d.crit = 5 + dex + gen * 0.5 + luk * 0.2 + G.I.optSum(m, 'crit') + (W && D.WEAPONS[W.wtype].crit || 0);
  d.def = gDef + con * 0.8 + jud * 0.5;
  d.mdef = gMdef + int + com * 0.5;
  var over = Math.max(0, G.M.load(m) - G.M.capacity(m));
  d.eva = agi * 1.5 + vis + jud * 0.5 - over * 1.5 + (A && A.eva || 0) + (m.cls === 'monk' ? 10 : 0);
  d.spd = agi + m.agg * 0.5 - over * 0.5;
  d.mp = mag * 4 + int * 2 + 10;
  d.staMax = sta * 8 + 40;
  d.pen = G.I.optSum(m, 'pen') + (W && D.WEAPONS[W.wtype].pen || 0);
  d.leech = G.I.optSum(m, 'leech');
  d.overload = over;
  // 특성·직업 보정
  var defPct = 0;
  if (m.cls === 'swordsman') defPct += 10;
  if (G.M.has(m, 'thickHide')) defPct += 20;
  if (G.M.has(m, 'dragonScale')) defPct += 15;
  defPct += G.I.optSum(m, 'defPct');
  if (G.M.has(m, 'dualWield') && C.range !== 'ranged') { d.spd *= 1.3; defPct -= 20; }
  d.def *= (1 + defPct / 100);
  if (m.cls === 'knight') d.spd *= 0.85;
  if (m.cls === 'lancer' || m.cls === 'monk') d.mdef *= 0.85;
  d.spd *= 1 + G.I.optSum(m, 'spd') / 100;
  // 저주 옵션
  var atkPct = G.I.optSum(m, 'atkPct'); if (atkPct) d.atk *= 1 + atkPct / 100;
  if (G.I.hasOpt(m, 'matMul')) d.mat *= 2;
  if (G.I.hasOpt(m, 'defMul')) d.def *= 2;
  // 전직 직후 페널티
  if (m.changePenalty > 0) { d.atk *= 0.85; d.mat *= 0.85; d.hit -= 5; }
  d.maxHp = Math.round(d.maxHp); d.spd = Math.max(1, d.spd); d.eva = Math.max(0, d.eva);
  return d;
};
G.M.power = function (m) { // 대략적 전투력 지표
  var d = G.M.derive(m);
  return Math.round(d.maxHp * 0.15 + Math.max(d.atk, d.mat) * 1.2 + d.def * 0.6 + d.mdef * 0.4 + d.eva * 0.3);
};

// ───── 주급 ─────
G.M.wage = function (m) {
  if (m.founder) return 0;
  var ca = G.M.ca(m), w = 6 + ca * 0.55 + Math.pow(Math.max(0, ca - 60), 2) * 0.015; // 고CA 용병은 몸값이 가파르게 오른다
  if (G.M.has(m, 'fallenNoble') && !(m.story && m.story.done && m.story.id === 'nobleRestore')) w *= 2;
  if (G.M.has(m, 'miser')) w *= 0.7;
  if (G.M.has(m, 'lazy')) w *= 0.8;
  if (m.cls === 'spellblade') w *= 1.4;
  return Math.round(w);
};

// ───── 스카우트 추정 ─────
G.M.scout = function (m, officeLv, weeksKnown) {
  var err = [30, 18, 8][(officeLv || 1) - 1];
  err *= Math.max(0.3, 1 - (weeksKnown || 0) / 104);
  var ca = G.M.usedCA(m), est = G.clamp(m.pa + m.scoutErr * err, ca, 200);
  var lo = Math.round(Math.max(ca, est - err * 0.6)), hi = Math.max(lo, Math.min(200, Math.round(est + err * 0.6)));
  var line = D.SCOUT_LINES.filter(function (l) { return est >= l[0]; })[0][1];
  return { lo: lo, hi: hi, est: est, line: line, stars: Math.round(est / 20) / 2 };
};
G.M.stars = function (v) { return Math.round(v / 20) / 2; };

// ───── 훈련 (주간) ─────
G.M.programStats = function (m, prog, lv) {
  var allowed = D.TRAINABLE[lv - 1], C = D.CLASSES[m.cls], list;
  if (prog === 'combat') list = C.core.concat(C.sub);
  else if (prog === 'body') list = ['con', 'sta', 'str', 'rec', 'agi'];
  else if (prog === 'mind') list = ['com', 'jud', 'tea', 'lea', 'vis', 'ada'];
  else if (prog === 'change') { var T = D.CLASSES[m.training.target || m.cls]; list = (T.req ? Object.keys(T.req) : []).concat(T.core); }
  else list = (m.training.custom || []).slice();
  var out = [];
  list.forEach(function (s) { if (allowed.indexOf(s) >= 0 && out.indexOf(s) < 0) out.push(s); });
  var max = G.M.has(m, 'singleMinded') ? 1 : 5;
  return out.slice(0, max);
};
G.M.growthMul = function (m, s) {
  var R = D.RACES[m.race], C = D.CLASSES[m.cls], k = 1;
  if (m.race !== 'homun') { if (R.up.indexOf(s) >= 0) k *= 1.3; if (R.down.indexOf(s) >= 0) k *= 0.7; }
  if (C.up.indexOf(s) >= 0) k *= 1.3; if (C.down.indexOf(s) >= 0) k *= 0.7;
  return k;
};
G.M.room = function (m, s) {
  if (G.M.has(m, 'glassBody') && ['str', 'mag', 'dex', 'agi'].indexOf(s) >= 0) return 1;
  return Math.max(0, 1 - G.M.usedCA(m) / m.pa);
};
// ctx: {facMul, lv, mentorHere, observerCls}
G.M.train = function (m, ctx) {
  var res = { gains: {}, injured: null, broke: 0 };
  if (G.M.has(m, 'mentor')) return res; // 스승은 본인 성장 정지
  var stats = G.M.programStats(m, m.training.program, ctx.lv);
  var inten = { light: 0.7, normal: 1.0, heavy: 1.4 }[m.training.intensity] || 1;
  if (m.injuries.some(function (j) { return j.sev >= 2; })) return res;
  if (m.injuries.length) inten = Math.min(inten, 0.7);
  var tf = 1;
  if (G.M.has(m, 'genius')) tf *= 1.1; if (G.M.has(m, 'hardWorker')) tf *= 1.2; if (G.M.has(m, 'lazy')) tf *= 0.8; if (G.M.has(m, 'fieldLearner')) tf *= 0.85;
  if (ctx.mentorHere) tf *= ctx.mentorBonus || 1.2;
  var old = G.M.isOld(m);
  var cnsK = 1 + 0.02 * m.stats.cns;
  stats.forEach(function (s) {
    if (old && D.BODY.indexOf(s) >= 0) return;
    var k = 0.25 * ctx.facMul * G.M.growthMul(m, s) * G.M.ageFactor(m) * cnsK * G.M.room(m, s) * tf * inten * (ctx.coachMul ? ctx.coachMul(s) : 1);
    if (G.M.has(m, 'singleMinded')) k *= 1.5;
    if (ctx.observer && D.CLASSES[m.cls].core.indexOf(s) >= 0) k *= 1.15;
    var before = m.stats[s];
    m.stats[s] = Math.min(20, m.stats[s] + k);
    if (m.stats[s] > before) res.gains[s] = m.stats[s] - before;
  });
  // 긴장·피로·부상
  if (m.training.intensity === 'heavy') { m.fatigue++; G.M.addTension(m, 1.5); } else { m.fatigue = Math.max(0, m.fatigue - 1); if (m.training.intensity === 'normal') G.M.addTension(m, 0.4); }
  var injP = m.training.intensity === 'heavy' ? (m.inj * 0.006 + m.fatigue * 0.01) * (G.M.has(m, 'hardWorker') ? 1.2 : 1) * (ctx.injMul || 1) : m.training.intensity === 'normal' ? m.inj * 0.0012 : 0;
  if (G.chance(injP)) res.injured = G.M.addInjury(m, 1, '훈련 중');
  // 꾸준함 → 잠재력 돌파 (극히 낮은 확률)
  if (m.race !== 'homun' && m.stats.cns >= 13 && G.chance((m.stats.cns - 12) * 0.0004)) { var up = G.randi(5, 15); m.pa = Math.min(220, m.pa + up); res.broke = up; }
  return res;
};
// 실전 경험 성장 (전투 1회)
G.M.battleGrowth = function (m, mul) {
  if (G.M.has(m, 'mentor')) return;
  var C = D.CLASSES[m.cls], list = C.core.concat(['com', 'jud', 'vis']);
  var f = mul * G.M.ageFactor(m) * (G.M.has(m, 'fieldLearner') ? 2 : 1);
  var old = G.M.isOld(m);
  list.forEach(function (s) {
    if (['cns', 'luk', 'gen'].indexOf(s) >= 0) return;
    if (old && D.BODY.indexOf(s) >= 0) return;
    m.stats[s] = Math.min(20, m.stats[s] + 0.035 * f * G.M.growthMul(m, s) * G.M.room(m, s));
  });
};

// ───── 긴장 ─────
G.M.addTension = function (m, v, ctx) {
  if (G.M.has(m, 'emotionless')) return 0;
  if (v > 0) {
    v *= (1.4 - G.M.stat(m, 'com') / 25);
    if (G.I.hasOpt(m, 'calm')) v *= 0.6;
    if (ctx && ctx.braveBanner) v *= 0.7;
    v *= G.Social.tenMul(m);
    v = Math.max(0, v);
  }
  m.ten = G.clamp(m.ten + v, 0, 20);
  return v;
};

// ───── 부상 ─────
G.D.INJ_NAMES = [
  ['타박상', '발목 염좌', '찰과상', '근육 경련', '손목 삠'],
  ['갈비뼈 골절', '깊은 자상', '어깨 탈구', '정강이 골절', '화상'],
  ['내장 손상', '두개골 골절', '척추 손상', '대량 출혈']
];
G.D.PERM_NAMES = { str: '팔 힘줄 손상', agi: '왼다리 손상', con: '폐 손상', rec: '만성 통증', sta: '심장 약화', dex: '손가락 절단', vis: '한쪽 눈 실명' };
G.M.addInjury = function (m, sev, cause) {
  var pen = {}, body = ['str', 'agi', 'con', 'dex', 'sta'];
  var n = sev === 1 ? 1 : sev === 2 ? 2 : 3;
  for (var i = 0; i < n; i++) { var s = G.pick(body); pen[s] = (pen[s] || 0) - (sev === 1 ? 1 : sev === 2 ? 2 : 3); }
  var days = sev === 1 ? G.randi(5, 12) : sev === 2 ? G.randi(18, 40) : G.randi(50, 100);
  var j = { name: G.pick(D.INJ_NAMES[sev - 1]), sev: sev, days: days, max: days, pen: pen, cause: cause || '' };
  m.injuries.push(j);
  return j;
};
G.M.addPermanent = function (m) {
  var s = G.pick(Object.keys(D.PERM_NAMES)), v = G.randi(1, 3);
  m.stats[s] = Math.max(1, m.stats[s] - v);
  var p = { name: D.PERM_NAMES[s], stat: s, val: -v };
  m.perm.push(p);
  return p;
};
G.M.healDay = function (m, infMul) {
  var rate = (1 + G.M.stat(m, 'rec') / 25) * infMul * (m.cls === 'lancer' ? 0.8 : 1);
  m.injuries.forEach(function (j) { j.days -= rate * (j.sev === 1 && G.M.has(m, 'regeneration') ? 2 : 1); });
  var healed = m.injuries.filter(function (j) { return j.days <= 0; });
  m.injuries = m.injuries.filter(function (j) { return j.days > 0; });
  return healed;
};
G.M.canFight = function (m) { return !m.injuries.some(function (j) { return j.sev >= 2; }); };
G.M.injuryText = function (m) {
  if (!m.injuries.length) return '';
  return m.injuries.map(function (j) { return ['', '경상', '중상', '치명상'][j.sev] + ' ' + j.name + ' (' + Math.ceil(j.days) + '일)'; }).join(', ');
};

// ───── 노화 (생일) ─────
G.M.birthday = function (m) {
  m.age++;
  var ev = { decline: {}, rise: {}, retire: false };
  if (!D.RACES[m.race].ageScale) return ev;
  var a = G.M.effAge(m, true);
  if (a >= 40) {
    var k = 1 + (a - 40) / 10;
    D.BODY.forEach(function (s) { var d = G.rand(0.2, 0.8) * k; m.stats[s] = Math.max(1, m.stats[s] - d); ev.decline[s] = d; });
    ['int', 'vis', 'lea', 'jud', 'com'].forEach(function (s) { if (G.M.room(m, s) > 0) { var u = G.rand(0, 0.3); m.stats[s] = Math.min(20, m.stats[s] + u); ev.rise[s] = u; } });
  }
  if (a >= 55 && G.chance(0.3)) ev.retire = true;
  return ev;
};

// ───── 전직 ─────
G.M.canChange = function (m, cls, trainingLv) {
  var C = D.CLASSES[cls];
  if (cls === m.cls) return { ok: false, why: '현재 직업' };
  if ((G.M.has(m, 'martialBody') || G.M.has(m, 'manaVoid')) && D.MAGIC_CLASSES.indexOf(cls) >= 0) return { ok: false, why: '마법 직업 불가 (특성)' };
  if (C.tier === 2) {
    if (trainingLv < 2) return { ok: false, why: '훈련장 2단계 필요' };
    for (var s in C.req) if (m.stats[s] < C.req[s]) return { ok: false, why: C.reqText };
    return { ok: true };
  }
  // 기본 직업: 해당 직업 성장 특화 스탯 중 2개 이상이 8 이상
  var n = C.up.filter(function (s) { return m.stats[s] >= 8; }).length;
  if (n < 2) return { ok: false, why: C.up.map(function (s) { return D.STAT_NAME[s]; }).join('·') + ' 중 2개가 8 이상' };
  return { ok: true };
};
G.M.changePenaltyDays = function (m) {
  var d = 56 * (1 - G.M.stat(m, 'ada') / 30);
  if (G.M.has(m, 'genius')) d /= 3;
  if (G.M.has(m, 'versatile')) d *= 0.5;
  if (G.M.has(m, 'singleMinded')) d *= 2;
  if (m.cls === 'swordsman') d *= 1.5;
  return Math.round(Math.max(5, d));
};
G.M.changeClass = function (m, cls, ilvl) {
  var before = G.M.ca(m);
  m.changePenalty = G.M.changePenaltyDays(m);
  m.cls = cls;
  if (!G.I.canEquip(m, m.equip.weapon || { slot: 'weapon', wtype: '' })) {
    var old = m.equip.weapon;
    m.equip.weapon = G.I.makeWeapon(D.CLASSES[cls].weapons[0], Math.max(1, ilvl || (old ? old.ilvl : 1)), 0, []);
    return { before: before, after: G.M.ca(m), oldWeapon: old };
  }
  return { before: before, after: G.M.ca(m) };
};

// ───── 일반 특성 습득 (어빌 소비) ─────
G.M.learnCost = function (m, t) {
  var c = D.TRAITS[t].cost || 3;
  if (D.TRAITS[t].magic && G.M.has(m, 'manaAffinity')) c = Math.ceil(c / 2);
  return c;
};
G.M.canLearn = function (m, t) {
  if (G.M.has(m, t)) return { ok: false, why: '이미 보유' };
  if (D.TRAITS[t].magic && D.MAGIC_CLASSES.indexOf(m.cls) < 0) return { ok: false, why: '마법 직업 전용' };
  var c = G.M.learnCost(m, t);
  if (G.M.usedCA(m) + c > m.pa) return { ok: false, why: '잠재력 여유 부족 (어빌 ' + c + ' 필요)' };
  return { ok: true, cost: c };
};
G.M.learn = function (m, t) { var c = G.M.learnCost(m, t); m.traits.push(t); m.learned[t] = c; };

G.M.describe = function (m) {
  return D.RACES[m.race].name + ' ' + D.CLASSES[m.cls].name + ' · ' + m.age + '세';
};
