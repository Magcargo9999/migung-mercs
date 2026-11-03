// 장비·아이템 생성
var G = window.G = window.G || {};
G.I = {};

G.I.weaponPower = function (ilvl) { return 4 + ilvl * 0.9; };
G.I.armorPower = function (ilvl) { return 2 + ilvl * 0.6; };

// 직업 기본 방어구
G.I.CLASS_ARMOR = { knight: 'plate', lancer: 'plate', swordsman: 'plate', berserker: 'leather', monk: 'leather', spellblade: 'leather',
  rogue: 'leather', hunter: 'leather', archer: 'leather', priest: 'robe', mage: 'robe', elementalist: 'robe', bard: 'robe', alchemist: 'leather', warlock: 'robe' };

G.I.rollGrade = function (ilvl, luck, bonus) {
  var r = G.R() * 100 - (luck || 0) * 0.6 - (bonus || 0) - ilvl * 0.4;
  if (r < 1.5) return 4; if (r < 7) return 3; if (r < 20) return 2; if (r < 45) return 1; return 0;
};
G.I.rollOptions = function (n, allowCurse) {
  var keys = Object.keys(G.D.OPTIONS), out = [];
  if (allowCurse && n > 0 && G.chance(0.12)) { out.push(G.pick(Object.keys(G.D.CURSED))); n--; }
  G.shuffle(keys.slice()).slice(0, n).forEach(function (k) { out.push(k); });
  return out;
};
G.I.optData = function (k) { return G.D.OPTIONS[k] || G.D.CURSED[k] || {}; };

G.I.makeWeapon = function (wtype, ilvl, grade, opts) {
  var W = G.D.WEAPONS[wtype], gm = G.D.GRADES[grade].mult, P = G.I.weaponPower(ilvl);
  return { id: G.uid(), slot: 'weapon', wtype: wtype, ilvl: ilvl, grade: grade, opts: opts || [],
    atk: G.round1(P * W.atk * gm), mat: G.round1(P * W.mat * gm), def: W.def ? G.round1(G.I.armorPower(ilvl) * W.def * gm) : 0,
    w: W.w, name: (opts && opts[0] ? G.I.optData(opts[0]).name + ' ' : '') + W.name };
};
G.I.makeArmor = function (atype, ilvl, grade, opts) {
  var A = G.D.ARMORS[atype], gm = G.D.GRADES[grade].mult, P = G.I.armorPower(ilvl);
  var hpk = { plate: 2.2, leather: 1.4, robe: 0.7 }[atype];
  return { id: G.uid(), slot: 'armor', atype: atype, ilvl: ilvl, grade: grade, opts: opts || [],
    def: G.round1(P * A.def * gm), mdef: G.round1(P * A.mdef * gm), hp: Math.round(ilvl * hpk * gm), eva: A.eva || 0, mag: A.mag || 0,
    w: A.w, name: (opts && opts[0] ? G.I.optData(opts[0]).name + ' ' : '') + A.name };
};
G.I.makeAcc = function (atype, ilvl, grade, opts) {
  var st = {}, keys = G.D.STATS.filter(function (s) { return ['cns', 'gen', 'luk'].indexOf(s) < 0; });
  var n = 1 + Math.floor(grade / 2), amt = 1 + Math.floor(ilvl / 14);
  for (var i = 0; i < n; i++) { var k = G.pick(keys); st[k] = (st[k] || 0) + amt; }
  return { id: G.uid(), slot: 'acc', atype: atype, ilvl: ilvl, grade: grade, opts: opts || [], stat: st, w: 0,
    name: (opts && opts[0] ? G.I.optData(opts[0]).name + ' ' : '') + G.D.ACCS[atype].name };
};
G.I.makeUnique = function (key, ilvl) {
  var U = G.D.UNIQUES[key], it;
  if (U.slot === 'weapon') it = G.I.makeWeapon(U.wtype, ilvl, U.grade, []);
  else if (U.slot === 'armor') it = G.I.makeArmor(U.atype, ilvl, U.grade, []);
  else it = G.I.makeAcc('ring', ilvl, U.grade, []);
  it.unique = key; it.name = U.name; it.fx = U.fx; return it;
};
// 무작위 장비 (층·운 반영)
G.I.randomGear = function (ilvl, luck, gradeBonus, allowCurse) {
  var grade = G.I.rollGrade(ilvl, luck, gradeBonus), opts = G.I.rollOptions(G.D.GRADES[grade].opts, allowCurse !== false);
  var r = G.R();
  if (r < 0.45) return G.I.makeWeapon(G.pick(Object.keys(G.D.WEAPONS)), ilvl, grade, opts);
  if (r < 0.8) return G.I.makeArmor(G.pick(Object.keys(G.D.ARMORS)), ilvl, grade, opts);
  return G.I.makeAcc(G.pick(Object.keys(G.D.ACCS)), ilvl, grade, opts);
};
G.I.starterKit = function (cls, ilvl) {
  var C = G.D.CLASSES[cls];
  return { weapon: G.I.makeWeapon(C.weapons[0], ilvl, 0, []), armor: G.I.makeArmor(G.I.CLASS_ARMOR[cls], ilvl, 0, []), acc: null };
};
G.I.price = function (it) {
  var base = 30 + it.ilvl * 14;
  var p = base * [1, 1.8, 3.2, 6, 11][it.grade];
  if (it.unique) p *= 2.5;
  it.opts.forEach(function (o) { if (G.D.CURSED[o]) p *= 0.85; });
  return Math.round(p);
};
G.I.canEquip = function (m, it) {
  if (it.slot === 'weapon') {
    var C = G.D.CLASSES[m.cls];
    return C.weapons.indexOf(it.wtype) >= 0;
  }
  return true;
};
G.I.desc = function (it) {
  var s = [];
  if (it.atk) s.push('공격 ' + it.atk);
  if (it.mat) s.push('마공 ' + it.mat);
  if (it.def) s.push('방어 ' + it.def);
  if (it.mdef) s.push('마방 ' + it.mdef);
  if (it.hp) s.push('HP ' + it.hp);
  if (it.stat) for (var k in it.stat) s.push(G.D.STAT_NAME[k] + ' +' + it.stat[k]);
  s.push('무게 ' + (it.w || 0));
  var o = it.opts.map(function (k) { var d = G.I.optData(k); return (d.cursed ? '☠' : '') + d.name + ': ' + d.desc; });
  if (it.unique) o.unshift(G.D.UNIQUES[it.unique].desc);
  return s.join(' · ') + (o.length ? '\n' + o.join('\n') : '');
};
G.I.optSum = function (m, key) { // 장착 장비 옵션 수치 합
  var t = 0;
  ['weapon', 'armor', 'acc'].forEach(function (sl) {
    var it = m.equip[sl]; if (!it) return;
    it.opts.forEach(function (o) { var d = G.I.optData(o); if (d[key]) t += (typeof d[key] === 'number' ? d[key] : 1); });
    if (it.fx && it.fx[key]) t += (typeof it.fx[key] === 'number' ? it.fx[key] : 1);
  });
  return t;
};
G.I.hasOpt = function (m, key) { return G.I.optSum(m, key) > 0; };
