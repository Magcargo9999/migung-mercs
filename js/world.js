// 길드·시간·경제·라이벌·의뢰·연말 평가·서사·저장
var G = window.G = window.G || {};
G.W = {};
var D = G.D;

G.W.fameIdx = function (S) { var i = 0; D.FAME.forEach(function (f, k) { if (S.fame >= f.pts) i = k; }); return i; };
G.W.fameTier = function (S) { return D.FAME[G.W.fameIdx(S)]; };
G.W.infamous = function (S) { return S.infamy > 40 && S.infamy > S.fame * 0.5; };
G.W.year = function (S) { return Math.floor(S.day / G.DAYS_PER_YEAR) + 1; };
G.W.week = function (S) { return Math.floor(S.day / 7); };
G.W.rosterCap = function (S) { return [6, 8, 10][S.buildings.office - 1]; };
G.W.merc = function (S, id) { for (var i = 0; i < S.roster.length; i++) if (S.roster[i].id === id) return S.roster[i]; return null; };
G.W.news = function (S, t, cls) { S.news.unshift({ d: S.day, t: t, c: cls || '' }); if (S.news.length > 200) S.news.pop(); };
G.W.codex = function (S, cat, key) { S.codex[cat] = S.codex[cat] || {}; if (!S.codex[cat][key]) { S.codex[cat][key] = S.day + 1; return true; } return false; };

// ───── 새 게임 ─────
// f: {guildName, name, race, cls, motive, age, hair}
G.W.newGame = function (f) {
  G.rng = new G.RNG((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  var S = {
    ver: 1, day: 0, guild: f.guildName || '무명 용병단', gold: 2000, stones: 6, herbs: 4, fame: 0, infamy: 0,
    roster: [], dead: [], retired: [], applicants: [], notices: 0, quests: [], shop: [], market: { relics: [], potions: [] }, auction: [],
    inv: { items: [], cons: { potion: 6, calmPotion: 1, antidote: 2, torch: 0, ration: 8, ale: 2 }, books: [], statItems: [], relics: [], relicSlots: [] },
    buildings: {}, deepest: 1, checkpoints: [1], bossKills: {}, rivals: [], news: [], codex: { monsters: {}, traits: {}, items: {}, relics: {}, races: {} },
    tactics: { formation: {}, tempo: 'normal', engage: 'balanced', leader: null }, settings: { swordSprite: 'batchA', tiles: 'batchA', recolor: true, speed: 1, portrait: 'variant', human: 'sheet', autoSkip: false },
    exp: null, heroTitle: null, yearData: null, evals: [], bonus: {}, unpaid: 0, founderId: null, lastExp: null, ended: false,
    inbox: [], bonds: {}, reports: [], coaches: [], coachPool: []
  };
  for (var k in D.BUILDINGS) S.buildings[k] = D.BUILDINGS[k].start;
  var motive = { debt: 'founderDebt', revenge: 'founderRevenge', dream: 'founderDream' }[f.motive || 'dream'];
  var fm = G.M.create({ founder: true, name: f.name || '카렐', race: f.race || 'human', cls: f.cls || 'swordsman', age: f.age || 18, caRange: [18, 28], paFloor: 140, story: motive, fameIdx: 0, uniqueChance: 0 });
  if (f.hair) fm.look.hair = f.hair;
  fm.traits = ['founder'].concat(fm.traits.filter(function (t) { return t !== 'founder' && D.TRAITS[t].pts >= 0; }).slice(0, 1));
  fm.hist.joined = 0; fm.tactic.potion = 30;
  S.roster.push(fm); S.founderId = fm.id; S.tactics.leader = fm.id;
  // 라이벌 용병단
  G.shuffle(D.RIVAL_NAMES.slice()).slice(0, 4).forEach(function (n, i) {
    S.rivals.push({ id: 'r' + i, name: n, floor: G.randi(1, 4), power: 22 + G.rand(0, 10), rate: G.rand(0.075, 0.105), temper: G.pick(['friendly', 'neutral', 'neutral', 'hostile']), attitude: 0, gone: false, kills: {} });
  });
  G.Social.refreshCoaches(S);
  G.W.newYear(S);
  G.W.postNotice(S, true);
  G.W.restockShop(S); G.W.genQuests(S);
  G.W.autoFormation(S);
  G.W.news(S, S.guild + ' 창단! 창립 멤버 ' + fm.name + '과 함께 미궁에 도전한다.', 'big');
  return S;
};

// ───── 시간 ─────
G.W.advanceDay = function (S) {
  if (S.ended) return;
  S.day++;
  var infMul = [1, 1.4, 1.8][S.buildings.infirmary - 1];
  var tav = [0.6, 0.9, 1.3][S.buildings.tavern - 1];
  S.roster.forEach(function (m) {
    if (m.status === 'expedition') return;
    var healed = G.M.healDay(m, infMul);
    healed.forEach(function (j) { G.W.news(S, m.name + '의 ' + j.name + '이(가) 나았다.'); });
    var rest = m.training.slot ? 0 : 0.3;
    var t = tav + rest;
    if (G.M.has(m, 'neatFreak') && S.buildings.tavern < 3) t *= 0.5;
    G.M.addTension(m, -t);
    if (m.changePenalty > 0) m.changePenalty--;
  });
  if (S.day % 7 === 0) G.W.weekly(S);
  if (S.day % G.DAYS_PER_YEAR === 0) { G.W.yearEnd(S); if (S.day >= G.DAYS_PER_YEAR * G.TOTAL_YEARS) { S.ended = true; G.W.news(S, '10년이 흘렀다. 용병단의 이야기가 일단락됐다.', 'big'); } else G.W.newYear(S); }
};
G.W.advance = function (S, days) { for (var i = 0; i < days && !S.ended; i++) G.W.advanceDay(S); };
G.W.toNextWeek = function (S) { var n = 7 - (S.day % 7); G.W.advance(S, n); return n; };

// ───── 주간 정산 ─────
G.W.weekly = function (S) {
  var rep = { train: [], wages: 0, left: [] };
  // 훈련
  var lv = S.buildings.training, fac = [1, 1.2, 1.4][lv - 1], cap = [3, 5, 10][lv - 1];
  var home = S.roster.filter(function (m) { return m.status === 'guild'; });
  var mentor = home.filter(function (m) { return G.M.has(m, 'mentor'); })[0];
  var trainees = home.filter(function (m) { return m.training.slot; }).slice(0, cap);
  trainees.forEach(function (m) {
    var observer = G.M.has(m, 'observer') && S.roster.some(function (o) { return o !== m && o.cls === m.cls && G.M.ca(o) > G.M.ca(m); });
    var snap = Object.assign({}, m.stats), caB = G.M.ca(m);
    var r = G.M.train(m, { facMul: fac, lv: lv, mentorHere: !!mentor && mentor !== m, mentorBonus: mentor && mentor.story && mentor.story.done ? 1.35 : 1.2, observer: observer,
      coachMul: function (s) { return G.Social.coachMul(S, s); }, injMul: G.Social.injMul(S) });
    Object.keys(r.gains).forEach(function (s) { snap[s] = m.stats[s] - r.gains[s]; });
    G.Social.growthNotice(S, m, snap, caB, r.gains);
    if (r.injured) { G.W.news(S, m.name + ' — 훈련 중 부상: ' + r.injured.name, 'bad'); G.Social.injuryNotice(S, m, r.injured, '강행 훈련 중'); }
    if (r.broke) { G.W.news(S, m.name + ' — 꾸준함이 결실을 맺었다! 잠재력이 한 단계 열렸다.', 'big'); G.W.notify(S, { kind: 'growth', sev: 'good', imp: 2, mid: m.id, title: m.name + ' — 한계를 넘어섰다', text: '꾸준함이 결실을 맺어 잠재력이 ' + r.broke + ' 열렸다. (잠재력 수치는 직접 보이지 않지만 스카우트 평가가 달라진다.)' }); }
    rep.train.push(m.id);
  });
  // 주급
  var total = 0; S.roster.forEach(function (m) { total += G.M.wage(m); });
  if (S.gold >= total) {
    S.gold -= total; S.unpaid = 0; rep.wages = total;
    S.roster.forEach(function (m) { var w = G.M.wage(m); m.hist.wagesPaid += w; if (m.story && m.story.id === 'nobleRestore' && !m.story.done) m.story.prog = Math.min(1500, m.hist.wagesPaid); });
    S.yearData.expense += total;
  } else {
    S.unpaid++;
    G.W.news(S, '주급 ' + total + 'G를 지급하지 못했다!', 'bad');
    S.roster.slice().forEach(function (m) {
      if (m.founder) return;
      if (G.M.has(m, 'fallenNoble')) { G.W.removeMerc(S, m, '주급 체불로 즉시 탈퇴'); return; }
      G.M.addTension(m, 2);
      if (S.unpaid >= 2 && G.chance(0.25)) G.W.removeMerc(S, m, '주급 체불로 탈퇴');
    });
  }
  G.Social.payCoaches(S); G.Social.refreshCoaches(S); G.Social.weeklyQuirks(S); G.Social.weekly(S);
  // 상점·암시장·경매·의뢰
  G.W.restockShop(S); G.W.rotateMarket(S); G.W.resolveAuction(S); G.W.genQuests(S);
  S.notices = 0;
  S.applicants = S.applicants.filter(function (a) { return a.expires > S.day; });
  // 라이벌 진행
  G.W.rivalsWeek(S);
  // 생일·서사
  var wk = G.W.week(S) % 52;
  S.roster.slice().forEach(function (m) {
    m.weeksKnown = (m.weeksKnown || 0) + 1;
    if (m.birthWeek === wk && m.status !== 'expedition') {
      var ev = G.M.birthday(m);
      var dec = Object.keys(ev.decline);
      if (dec.length) { G.W.news(S, m.name + '(' + m.age + '세) — 노화로 육체 능력이 떨어지기 시작했다.', 'bad'); G.W.notify(S, { kind: 'growth', sev: 'warn', imp: 1, mid: m.id, title: m.name + ' — ' + m.age + '세, 노화가 시작됐다', text: '육체 스탯이 줄었다: ' + dec.map(function (s) { return D.STAT_NAME[s] + ' −' + (Math.round(ev.decline[s] * 10) / 10); }).join(', ') + '. 40대부터 육체 훈련은 효과가 없다.' }); }
      if (ev.retire) G.W.notify(S, { kind: 'guild', sev: 'info', imp: 1, mid: m.id, title: m.name + ' — 은퇴를 고민한다', text: m.age + '세. 곧 은퇴 의사를 밝힐 것이다. 후계자 육성(스승 특성·서사)을 고려하자.' });
      if (ev.retire) S.retireRequests = (S.retireRequests || []).concat([m.id]);
    }
    G.W.checkStories(S, m);
  });
  return rep;
};

// ───── 모집 ─────
G.W.noticeLimit = function (S) { return S.buildings.office + (S.bonus.slotYear === G.W.year(S) ? 1 : 0); };
G.W.noticeCost = function (S) { return 40 + G.W.fameIdx(S) * 40; };
G.W.postNotice = function (S, free) {
  if (!free) {
    if (S.notices >= G.W.noticeLimit(S)) return { ok: false, text: '이번 주 공고 횟수를 모두 썼다.' };
    var c = G.W.noticeCost(S); if (S.gold < c) return { ok: false, text: '골드가 부족하다.' };
    S.gold -= c; S.notices++; S.yearData.expense += c;
  }
  var n = [3, 4, 5][S.buildings.office - 1] + (free ? 3 : 0);
  var fi = G.W.fameIdx(S), inf = G.W.infamous(S);
  var paFloor = S.bonus.paFloorYear === G.W.year(S) ? 100 : 0;
  var list = [];
  for (var i = 0; i < n; i++) {
    var m = G.M.create({ fameIdx: fi, infamous: inf, paFloor: paFloor && G.chance(0.5) ? paFloor : 0, ilvl: Math.max(1, Math.round(D.FAME[fi].ca[0] / 5)) });
    m.expires = S.day + 7; m.fee = S.roster.length === 0 && free ? 0 : G.M.wage(m) * 4;
    list.push(m);
  }
  S.applicants = S.applicants.concat(list);
  return { ok: true, list: list };
};
G.W.hire = function (S, id) {
  var a = S.applicants.filter(function (x) { return x.id === id; })[0];
  if (!a) return { ok: false, text: '지원자가 없다.' };
  if (S.roster.length >= G.W.rosterCap(S)) return { ok: false, text: '로스터가 가득 찼다 (길드 사무소 증축 필요).' };
  if (S.gold < a.fee) return { ok: false, text: '계약금이 부족하다.' };
  S.gold -= a.fee; S.yearData.expense += a.fee;
  S.applicants = S.applicants.filter(function (x) { return x.id !== id; });
  delete a.expires; a.hist.joined = S.day; a.weeksKnown = 0; a.status = 'guild';
  // 유품 계승 대기
  S.roster.push(a);
  G.W.codex(S, 'races', a.race); G.M.allTraits(a).forEach(function (t) { G.W.codex(S, 'traits', t); });
  G.W.news(S, a.name + '(' + G.M.describe(a) + ')이(가) 용병단에 합류했다.');
  // 스승 서사: 첫 제자 지정
  S.roster.forEach(function (m) { if (m.story && m.story.id === 'mentorPupil' && !m.story.pupil && m !== a && G.M.effAge(a) <= 23) m.story.pupil = a.id; });
  G.W.autoFormation(S);
  return { ok: true, merc: a };
};
G.W.removeMerc = function (S, m, why) {
  S.roster = S.roster.filter(function (x) { return x !== m; });
  if (S.tactics.leader === m.id) S.tactics.leader = S.roster[0] ? S.roster[0].id : null;
  delete S.tactics.formation[m.id];
  G.Social.dropBonds(S, m.id);
  if (S.exp) S.exp.party = S.exp.party.filter(function (id) { return id !== m.id; });
  // 장비는 창고로
  ['weapon', 'armor', 'acc'].forEach(function (sl) { if (m.equip[sl] && why !== '전사') S.inv.items.push(m.equip[sl]); });
  G.W.news(S, m.name + ' — ' + why, 'bad');
  if (why.indexOf('전사') !== 0) G.W.notify(S, { kind: 'guild', sev: 'warn', imp: 1, mid: m.id, title: m.name + ' — 길드를 떠났다', text: why + '. (' + G.Social.mercLine(m) + ')' });
};
G.W.release = function (S, id) {
  var m = G.W.merc(S, id); if (!m || m.founder) return { ok: false, text: '창립 멤버는 내보낼 수 없다.' };
  if (m.status !== 'guild') return { ok: false, text: '길드에 있는 용병만 내보낼 수 있다.' };
  G.W.removeMerc(S, m, '계약 해지'); G.W.autoFormation(S); return { ok: true };
};
G.W.killMerc = function (S, m, cause) {
  var ca0 = Math.round(G.M.ca(m)), line = G.Social.mercLine(m);
  G.Social.onDeath(S, m, cause);
  G.W.notify(S, { kind: 'death', sev: 'bad', imp: 2, mid: m.id, title: '전사: ' + m.name, text: line + '. ' + cause + '에서 쓰러졌다. 함께한 기간 ' + Math.max(1, S.day - m.hist.joined) + '일 · 전투 ' + m.hist.battles + '회 · 처치 ' + m.hist.kills + ' · 최심 ' + m.hist.deepest + '층.' + (S.buildings.cemetery >= 1 ? ' 묘지에 안치됐다.' + (S.buildings.cemetery >= 2 ? ' 유품 계승이 가능하다.' : '') : ' 묘지가 없어 동료들의 충격이 크다.') });
  S.dead.push({ merc: m, day: S.day, cause: cause, buried: S.buildings.cemetery >= 1, inherited: false });
  if (S.exp) S.exp.deaths.push(m);
  G.W.removeMerc(S, m, '전사 (' + cause + ')');
  S.yearData.deaths++;
  if (m.founder) { S.fame = Math.max(0, S.fame - 30); G.W.news(S, '창립 멤버 ' + m.name + '이(가) 잠들었다. 유품 [창립자의 인장]이 남았다.', 'big'); S.inv.relics.push('founderSeal'); }
  if (S.buildings.cemetery < 1) S.roster.forEach(function (o) { if (!G.M.has(o, 'optimist')) G.M.addTension(o, 3); });
};
G.W.retire = function (S, id) {
  var m = G.W.merc(S, id); if (!m || m.status !== 'guild') return { ok: false };
  S.retired.push({ merc: m, day: S.day });
  G.W.removeMerc(S, m, '은퇴');
  S.retireRequests = (S.retireRequests || []).filter(function (x) { return x !== id; });
  return { ok: true };
};

// ───── 유품 계승 (묘지 2단계) ─────
G.W.inheritOptions = function (S, d) {
  var opts = d.merc.traits.filter(function (t) { return t !== 'founder' && (D.TRAITS[t].type === 'unique' || D.TRAITS[t].type === 'general' || D.TRAITS[t].type === 'growth') && D.TRAITS[t].pts > 0; });
  return opts;
};
G.W.inherit = function (S, deadIdx, trait, toId) {
  var d = S.dead[deadIdx], m = G.W.merc(S, toId);
  if (!d || d.inherited || !m || S.buildings.cemetery < 2) return { ok: false, text: '유품 계승 불가' };
  if (S.day - m.hist.joined > 28) return { ok: false, text: '입단 4주 이내 신입만 계승할 수 있다.' };
  if (trait && !G.M.has(m, trait)) m.traits.push(trait);
  if (!m.story && d.merc.story && !d.merc.story.done) m.story = G.deep(d.merc.story);
  if (S.buildings.cemetery >= 3) m.pa = Math.min(200, m.pa + 10);
  d.inherited = true;
  G.W.news(S, m.name + '이(가) ' + d.merc.name + '의 유품을 이어받았다.', 'big');
  return { ok: true };
};

// ───── 훈련 슬롯 ─────
G.W.trainingCap = function (S) { return [3, 5, 10][S.buildings.training - 1]; };
G.W.setTraining = function (S, id, on) {
  var m = G.W.merc(S, id); if (!m) return { ok: false };
  if (on && !m.training.slot && S.roster.filter(function (x) { return x.training.slot; }).length >= G.W.trainingCap(S)) return { ok: false, text: '훈련 인원이 가득 찼다.' };
  m.training.slot = !!on; return { ok: true };
};
G.W.changeClass = function (S, id, cls) {
  var m = G.W.merc(S, id), c = G.M.canChange(m, cls, S.buildings.training);
  if (!c.ok) return c;
  var r = G.M.changeClass(m, cls, Math.max(1, S.deepest));
  if (r.oldWeapon) S.inv.items.push(r.oldWeapon);
  G.W.news(S, m.name + ' — ' + D.CLASSES[cls].name + '(으)로 전직 (CA ' + Math.round(r.before) + ' → ' + Math.round(r.after) + ', 적응 기간 ' + m.changePenalty + '일)');
  G.W.autoFormation(S);
  return { ok: true, r: r };
};

// ───── 장비·아이템 ─────
G.W.equip = function (S, mid, itemId) {
  var m = G.W.merc(S, mid), idx = S.inv.items.findIndex(function (x) { return x.id === itemId; });
  if (!m || idx < 0) return { ok: false };
  var it = S.inv.items[idx];
  if (!G.I.canEquip(m, it)) return { ok: false, text: D.CLASSES[m.cls].name + '은(는) 이 무기를 쓸 수 없다.' };
  S.inv.items.splice(idx, 1);
  if (m.equip[it.slot]) S.inv.items.push(m.equip[it.slot]);
  m.equip[it.slot] = it;
  return { ok: true };
};
G.W.unequip = function (S, mid, slot) { var m = G.W.merc(S, mid); if (m && m.equip[slot]) { S.inv.items.push(m.equip[slot]); m.equip[slot] = null; } };
G.W.sellItem = function (S, itemId) {
  var idx = S.inv.items.findIndex(function (x) { return x.id === itemId; }); if (idx < 0) return 0;
  var p = Math.round(G.I.price(S.inv.items[idx]) * G.W.SELL_RATE); S.gold += p; S.yearData.income += p; S.inv.items.splice(idx, 1); return p;
};
G.W.sellStones = function (S, n) { n = Math.min(n, S.stones); var p = n * G.W.stonePrice(S); S.stones -= n; S.gold += p; S.yearData.income += p; return p; };
G.W.SELL_RATE = 0.25;
G.W.stonePrice = function (S) { return 12 + Math.min(18, Math.floor(S.deepest * 0.45)); };
G.W.sellRelic = function (S, k) {
  var i = S.inv.relics.indexOf(k); if (i < 0 || D.RELICS[k].noSell) return 0;
  S.inv.relics.splice(i, 1); S.gold += D.RELICS[k].price; S.yearData.income += D.RELICS[k].price; return D.RELICS[k].price;
};
G.W.toggleRelic = function (S, k) {
  var i = S.inv.relicSlots.indexOf(k);
  if (i >= 0) { S.inv.relicSlots.splice(i, 1); return { ok: true }; }
  if (S.inv.relicSlots.length >= 3) return { ok: false, text: '유물은 3개까지 장착' };
  var have = S.inv.relics.filter(function (x) { return x === k; }).length, used = S.inv.relicSlots.filter(function (x) { return x === k; }).length;
  if (have <= used) return { ok: false };
  S.inv.relicSlots.push(k); return { ok: true };
};
G.W.useBook = function (S, idx, mid) {
  var t = S.inv.books[idx], m = G.W.merc(S, mid); if (!t || !m) return { ok: false };
  var c = G.M.canLearn(m, t); if (!c.ok) return c;
  G.M.learn(m, t); S.inv.books.splice(idx, 1); G.W.codex(S, 'traits', t);
  G.W.news(S, m.name + '이(가) [' + D.TRAITS[t].name + ']을(를) 익혔다 (어빌 ' + c.cost + ' 사용).');
  return { ok: true };
};
G.W.useStatItem = function (S, idx, mid) {
  var k = S.inv.statItems[idx], m = G.W.merc(S, mid), it = D.STAT_ITEMS[k]; if (!it || !m) return { ok: false };
  if (!it.req.some(function (t) { return G.M.has(m, t); })) return { ok: false, text: '요구 특성: ' + it.req.map(function (t) { return D.TRAITS[t].name; }).join(' / ') };
  m.stats[it.stat] = Math.min(20, m.stats[it.stat] + 1); S.inv.statItems.splice(idx, 1);
  G.W.news(S, m.name + ' — ' + it.name + ' 복용 (' + D.STAT_NAME[it.stat] + ' +1)');
  return { ok: true };
};

// ───── 상점 (주마다 교체) ─────
G.W.restockShop = function (S) {
  var fi = G.W.fameIdx(S), il = Math.max(1, Math.min(40, S.deepest + 1));
  S.shop = [];
  for (var i = 0; i < 6 + fi; i++) { var it = G.I.randomGear(Math.max(1, il - G.randi(0, 3)), 0, fi * 2, false); it.cost = G.I.price(it); S.shop.push(it); }
};
G.W.buyShop = function (S, id) {
  var i = S.shop.findIndex(function (x) { return x.id === id; }); if (i < 0) return { ok: false };
  var it = S.shop[i]; if (S.gold < it.cost) return { ok: false, text: '골드 부족' };
  S.gold -= it.cost; S.yearData.expense += it.cost; S.shop.splice(i, 1); delete it.cost; S.inv.items.push(it); return { ok: true };
};
G.W.buyCons = function (S, k, n) { var c = D.CONSUMABLES[k].price * n; if (S.gold < c) return { ok: false, text: '골드 부족' }; S.gold -= c; S.yearData.expense += c; S.inv.cons[k] = (S.inv.cons[k] || 0) + n; return { ok: true }; };
// 암시장
G.W.rotateMarket = function (S) {
  if (S.buildings.market < 1) { S.market = { relics: [], potions: [] }; return; }
  var rel = Object.keys(D.RELICS).filter(function (k) { return !D.RELICS[k].noSell; });
  S.market = { relics: G.shuffle(rel.slice()).slice(0, S.buildings.market >= 3 ? 3 : 2).map(function (k) { return { k: k, cost: Math.round(D.RELICS[k].price * 1.6) }; }),
    potions: G.shuffle(Object.keys(D.STAT_ITEMS).slice()).slice(0, 2).map(function (k) { return { k: k, cost: 900 + G.randi(0, 400) }; }) };
};
G.W.buyMarket = function (S, kind, i) {
  var o = S.market[kind][i]; if (!o) return { ok: false }; if (S.gold < o.cost) return { ok: false, text: '골드 부족' };
  S.gold -= o.cost; S.yearData.expense += o.cost; S.market[kind].splice(i, 1);
  if (kind === 'relics') { S.inv.relics.push(o.k); G.W.codex(S, 'relics', o.k); } else S.inv.statItems.push(o.k);
  return { ok: true };
};
// 경매장: 매주 1~2개 로트, NPC 입찰가가 주말에 확정
G.W.resolveAuction = function (S) {
  var out = [];
  (S.auction || []).forEach(function (l) {
    if (l.myBid && l.myBid >= l.npc) { S.inv.items.push(l.item); out.push(l.item.name + ' 낙찰!'); G.W.news(S, '경매 낙찰: ' + l.item.name + ' (' + l.myBid + 'G)', 'good'); }
    else if (l.myBid) { S.gold += l.myBid; G.W.news(S, '경매 유찰: ' + l.item.name + ' — NPC가 ' + l.npc + 'G에 가져갔다. 입찰금 반환.'); }
  });
  S.auction = [];
  if (S.buildings.market >= 2) {
    for (var i = 0; i < 2; i++) {
      var g = S.buildings.market >= 3 ? 25 : 12, it = G.chance(0.18) ? G.I.makeUnique(G.pick(Object.keys(D.UNIQUES)), Math.max(1, S.deepest)) : G.I.randomGear(Math.max(1, S.deepest + 2), 0, g, true);
      var p = G.I.price(it);
      S.auction.push({ id: G.uid(), item: it, start: Math.round(p * 0.6), npc: Math.round(p * G.rand(0.8, 1.5)), myBid: 0 });
    }
  }
  return out;
};
G.W.bid = function (S, id, amount) {
  var l = (S.auction || []).filter(function (x) { return x.id === id; })[0]; if (!l) return { ok: false };
  amount = Math.round(amount); if (amount < l.start) return { ok: false, text: '시작가 ' + l.start + 'G 이상' };
  var extra = amount - (l.myBid || 0); if (extra > S.gold) return { ok: false, text: '골드 부족' };
  S.gold -= extra; l.myBid = amount; return { ok: true };
};

// ───── 시설 ─────
G.W.upgradeCost = function (S, k) { var B = D.BUILDINGS[k], lv = S.buildings[k]; if (lv >= 3) return null; return B.cost[lv] || null; };
G.W.upgrade = function (S, k) {
  var c = G.W.upgradeCost(S, k); if (!c) return { ok: false, text: '최고 단계' };
  var req = D.FAME.findIndex(function (f) { return f.t === c[2]; });
  if (G.W.fameIdx(S) < req) return { ok: false, text: '명성 ' + c[2] + '등급 필요' };
  if (S.gold < c[0] || S.stones < c[1]) return { ok: false, text: '골드 ' + c[0] + ' · 마석 ' + c[1] + ' 필요' };
  S.gold -= c[0]; S.stones -= c[1]; S.yearData.expense += c[0]; S.buildings[k]++;
  G.W.news(S, D.BUILDINGS[k].name + ' ' + S.buildings[k] + '단계 완공!', 'good');
  if (k === 'market') G.W.rotateMarket(S);
  return { ok: true };
};
G.W.banquet = function (S) {
  if (S.buildings.tavern < 2) return { ok: false, text: '주점 2단계 필요' };
  var c = 30 * S.roster.length; if (S.gold < c) return { ok: false, text: '골드 부족' };
  S.gold -= c; S.yearData.expense += c; S.roster.forEach(function (m) { if (m.status === 'guild') m.ten = 0; });
  G.W.advanceDay(S);
  return { ok: true, text: '연회를 열었다. 길드에 있는 용병의 긴장이 모두 풀렸다. (하루 소비)' };
};
G.W.CRAFT = { potion: { lv: 1, herbs: 2, gold: 10 }, calmPotion: { lv: 2, herbs: 3, gold: 20 }, antidote: { lv: 3, herbs: 1, gold: 5 } };
G.W.craft = function (S, k, n) {
  var c = G.W.CRAFT[k]; n = n || 1;
  if (S.buildings.infirmary < c.lv) return { ok: false, text: '의무실 ' + c.lv + '단계 필요' };
  if (S.herbs < c.herbs * n || S.gold < c.gold * n) return { ok: false, text: '약초 ' + c.herbs * n + ' · 골드 ' + c.gold * n + ' 필요' };
  S.herbs -= c.herbs * n; S.gold -= c.gold * n; S.inv.cons[k] = (S.inv.cons[k] || 0) + n; return { ok: true };
};
G.W.surgery = function (S, mid, pi) {
  var m = G.W.merc(S, mid); if (!m || S.buildings.infirmary < 3) return { ok: false, text: '의무실 3단계 필요' };
  var p = m.perm[pi]; if (!p) return { ok: false };
  if (S.gold < 800 || S.stones < 10) return { ok: false, text: '골드 800 · 마석 10 필요' };
  S.gold -= 800; S.stones -= 10; m.stats[p.stat] = Math.min(20, m.stats[p.stat] - p.val); m.perm.splice(pi, 1);
  G.M.addInjury(m, 2, '수술 회복'); return { ok: true };
};

// ───── 의뢰 (사이드퀘스트) ─────
G.W.QUEST_TYPES = [
  { k: 'escort', name: '상단 호위', stat: ['con', 'vis', 'jud'], battle: true },
  { k: 'hunt', name: '마물 토벌', stat: ['str', 'agi', 'dex'], battle: true },
  { k: 'gather', name: '약초 채집', stat: ['vis', 'int', 'sta'], herbs: true },
  { k: 'investigate', name: '실종 조사', stat: ['int', 'jud', 'vis'] },
  { k: 'deliver', name: '급한 배달', stat: ['agi', 'sta', 'luk'] }
];
G.W.genQuests = function (S) {
  var fi = G.W.fameIdx(S), base = D.FAME[fi].ca;
  S.quests = [];
  for (var i = 0; i < 3; i++) {
    var T = G.pick(G.W.QUEST_TYPES), size = G.randi(1, 3), req = Math.round(G.rand(base[0], base[1]) * size * 0.9);
    S.quests.push({ id: G.uid(), k: T.k, name: T.name, stat: T.stat, battle: !!T.battle, herbs: !!T.herbs, size: size, req: req,
      gold: Math.round(req * G.rand(2.2, 3.2) + 40), fame: 1 + Math.floor(fi / 2) + size, floor: Math.max(1, Math.min(30, Math.round(base[1] / 4))) });
  }
};
G.W.questPower = function (S, q, ids) {
  return G.sum(ids.map(function (id) { var m = G.W.merc(S, id); var s = G.avg(q.stat.map(function (k) { return G.M.stat(m, k); })); return G.M.ca(m) * 0.6 + s * 4; }));
};
// 스킵: 하루 소비, 자동 판정
G.W.questSkip = function (S, qid, ids) {
  var q = S.quests.filter(function (x) { return x.id === qid; })[0]; if (!q) return { ok: false };
  if (!ids.length || ids.length > q.size) return { ok: false, text: '1~' + q.size + '명 배정' };
  var ms = ids.map(function (id) { return G.W.merc(S, id); });
  if (ms.some(function (m) { return !m || m.status !== 'guild' || !G.M.canFight(m); })) return { ok: false, text: '길드에 있고 중상이 없는 용병만' };
  var pw = G.W.questPower(S, q, ids), p = G.clamp(1 / (1 + Math.exp(-(pw - q.req) / (q.req * 0.18 + 4))), 0.05, 0.97);
  var ok = G.chance(p), out = [];
  if (ok) { S.gold += q.gold; S.fame += q.fame; S.yearData.income += q.gold; if (q.herbs) S.herbs += G.randi(2, 5); out.push('성공! +' + q.gold + 'G, 명성 +' + q.fame); }
  else { var g = Math.round(q.gold * 0.25); S.gold += g; S.yearData.income += g; out.push('실패… 착수금 ' + g + 'G만 받았다.'); }
  ms.forEach(function (m) {
    G.M.addTension(m, ok ? 0.5 : 1.5);
    G.M.battleGrowth(m, 0.6);
    if (q.battle && G.chance(m.inj * (ok ? 0.004 : 0.012))) { var j = G.M.addInjury(m, 1, '의뢰'); out.push(m.name + ' 경상: ' + j.name); }
  });
  S.quests = S.quests.filter(function (x) { return x !== q; });
  G.W.advanceDay(S);
  G.W.news(S, '의뢰 [' + q.name + '] ' + (ok ? '성공' : '실패'), ok ? 'good' : 'bad');
  return { ok: true, success: ok, text: out.join('\n'), chance: p };
};
// 직접 수행 (토벌·호위): 전투를 직접 본다
G.W.questBattle = function (S, qid, ids) {
  var q = S.quests.filter(function (x) { return x.id === qid; })[0]; if (!q || !q.battle) return null;
  var ms = ids.map(function (id) { return G.W.merc(S, id); }).filter(Boolean);
  if (!ms.length || ms.length > q.size || ms.some(function (m) { return m.status !== 'guild' || !G.M.canFight(m); })) return null;
  var rows = { front: 0, mid: 0, back: 0 };
  var party = ms.map(function (m) { var r = (S.tactics.formation[m.id] || {}).row || D.CLASSES[m.cls].row; return { m: m, row: r, slot: rows[r]++ % 3 }; });
  var fl = Math.max(1, Math.round((q.req / q.size - 18) / 3.6));
  var en = G.C.makeEncounter(fl, q.size >= 3 ? 'elite' : 'normal').slice(0, q.size + 1);
  return { kind: 'battle', quest: q.id, setup: { party: party, enemies: en, ctx: { floor: fl, zone: 'upper', engage: S.tactics.engage, leader: S.tactics.leader, relics: [], potions: 0, lit: true }, kind: 'quest', meta: {} } };
};
G.W.questBattleDone = function (S, qid, res) {
  var q = S.quests.filter(function (x) { return x.id === qid; })[0]; if (!q) return '';
  var ok = res.result === 'win', out = [];
  if (ok) { S.gold += q.gold; S.fame += q.fame + 1; S.yearData.income += q.gold; out.push('의뢰 성공! +' + q.gold + 'G, 명성 +' + (q.fame + 1)); }
  else out.push('의뢰 실패…');
  res.units.forEach(function (u) {
    if (!u.merc || u.side !== 'p') return;
    var m = u.merc; m.ten = u.ten;
    u.injuries.forEach(function (sev) { var j = G.M.addInjury(m, sev, '의뢰'); out.push(m.name + ' — ' + j.name); });
    if (u.ko) { var j2 = G.M.addInjury(m, 2, '의뢰 중 쓰러짐'); out.push(m.name + ' 쓰러짐 — ' + j2.name); }
    if (ok && u.alive) G.M.battleGrowth(m, 1);
  });
  S.quests = S.quests.filter(function (x) { return x !== q; });
  G.W.advanceDay(S);
  G.W.news(S, '의뢰 [' + q.name + '] ' + (ok ? '성공' : '실패'), ok ? 'good' : 'bad');
  return out.join('\n');
};

// ───── 라이벌 ─────
G.W.rivalsWeek = function (S) {
  S.rivals.forEach(function (r) {
    if (r.gone) return;
    r.power += 0.42 + G.rand(-0.1, 0.15);
    var gate = D.BOSS_BY_FLOOR[Math.floor(r.floor)];
    var need = 18 + 3.6 * r.floor;
    var prog = r.rate * (r.power >= need ? 1 : 0.35) * G.rand(0.5, 1.5);
    var before = Math.floor(r.floor);
    if (gate && !r.kills[gate]) {
      if (r.power >= need * 1.05 && G.chance(0.12)) { r.kills[gate] = S.day; G.W.news(S, r.name + '이(가) ' + before + '층 보스 [' + D.BOSSES[gate].name + ']를 격파했다.', 'rival'); r.floor = before + 1; }
      return;
    }
    r.floor = Math.min(40, r.floor + prog);
    if (Math.floor(r.floor) > before && Math.floor(r.floor) % 5 === 0) G.W.news(S, r.name + '이(가) ' + Math.floor(r.floor) + '층에 도달했다는 소문이다.', 'rival');
    if (r.floor >= 40 && !r.kills.archbishop && r.power >= need * 1.05 && G.chance(0.08)) {
      r.kills.archbishop = S.day;
      if (!S.heroTitle) { S.heroTitle = { by: r.name, day: S.day }; G.W.news(S, r.name + '이(가) 최하층을 공략해 "용사" 칭호를 차지했다. (게임은 계속된다)', 'big'); }
    }
    if (G.chance(0.004)) { r.gone = true; G.W.news(S, r.name + '이(가) 미궁에서 큰 피해를 입고 해산했다.', 'rival'); }
  });
};

// ───── 서사 ─────
G.W.storyProgress = function (S, m, amt) {
  if (!m.story || m.story.done) return;
  var St = D.STORIES[m.story.id];
  m.story.prog = (m.story.prog || 0) + amt;
  if (m.story.prog >= (St.kind === 'kill' ? 40 : St.need) || amt >= 99) G.W.completeStory(S, m);
};
G.W.checkStories = function (S, m) {
  if (!m.story || m.story.done) return;
  var St = D.STORIES[m.story.id];
  if (St.kind === 'pupil' && m.story.pupil) { var p = G.W.merc(S, m.story.pupil); if (p) { m.story.prog = Math.round(G.M.ca(p)); if (G.M.ca(p) >= 100) G.W.completeStory(S, m); } else m.story.pupil = null; }
  if (St.kind === 'stat15') { var mx = Math.max.apply(null, D.CLASSES[m.cls].core.map(function (s) { return m.stats[s]; })); m.story.prog = Math.floor(mx); if (mx >= 15) G.W.completeStory(S, m); }
  if (St.kind === 'kill') { m.story.prog = m.hist.unholyKills; if (m.hist.unholyKills >= 40) G.W.completeStory(S, m); }
};
G.W.payStory = function (S, mid) {
  var m = G.W.merc(S, mid); if (!m || !m.story || m.story.done) return { ok: false };
  var St = D.STORIES[m.story.id];
  if (St.kind === 'payStones') { var n = Math.min(S.stones, St.need - m.story.prog); if (n <= 0) return { ok: false, text: '마석 부족' }; S.stones -= n; G.W.storyProgress(S, m, n); return { ok: true }; }
  if (St.kind === 'payGold') { var g = Math.min(S.gold, St.need - m.story.prog, 1000); if (g <= 0) return { ok: false, text: '골드 부족' }; S.gold -= g; S.yearData.expense += g; G.W.storyProgress(S, m, g); return { ok: true }; }
  return { ok: false };
};
G.W.completeStory = function (S, m) {
  if (m.story.done) return;
  G.W.notify(S, { kind: 'story', sev: 'good', imp: 2, mid: m.id, title: m.name + ' — 서사 완료: ' + D.STORIES[m.story.id].name, text: '보상: ' + D.STORIES[m.story.id].reward });
  m.story.done = true; var id = m.story.id;
  var add = function (s, v) { m.stats[s] = Math.min(20, m.stats[s] + v); };
  var learn = function (t) { if (!G.M.has(m, t)) m.traits.push(t); };
  if (id === 'founderDebt') { add('com', 2); S.fame += 40; }
  if (id === 'founderRevenge') { add('gen', 2); learn('executioner'); }
  if (id === 'founderDream') { add('lea', 2); S.fame += 60; }
  if (id === 'nobleRestore') add('lea', 2);
  if (id === 'medicSave') learn('firstAid');
  if (id === 'homeMoney') m.pa = Math.min(200, m.pa + 8);
  if (id === 'lostSibling') { m.pa = Math.min(200, m.pa + 5); learn('optimist'); }
  if (id === 'honor') add('com', 2);
  if (id === 'training') learn('weaponMastery');
  S.yearData.stories++;
  G.W.news(S, m.name + '의 서사 [' + D.STORIES[id].name + '] 완료! 보상: ' + D.STORIES[id].reward, 'big');
};

// ───── 자동 진형 ─────
G.W.autoFormation = function (S) {
  var f = S.tactics.formation, used = {};
  Object.keys(f).forEach(function (id) { if (!G.W.merc(S, id)) delete f[id]; else used[f[id].row + f[id].slot] = id; });
  S.roster.forEach(function (m) {
    if (f[m.id]) return;
    var row = D.CLASSES[m.cls].row, rows = [row, 'mid', 'front', 'back'];
    for (var i = 0; i < rows.length; i++) for (var s = 0; s < 3; s++) if (!used[rows[i] + s]) { f[m.id] = { row: rows[i], slot: s }; used[rows[i] + s] = m.id; return; }
    f[m.id] = { row: row, slot: 0 };
  });
  if (!S.tactics.leader || !G.W.merc(S, S.tactics.leader)) S.tactics.leader = S.roster[0] ? S.roster[0].id : null;
};

// ───── 연간 목표·연말 평가 ─────
G.W.bestCA = function (S) { return Math.max.apply(null, S.roster.map(function (m) { return G.M.ca(m); }).concat([0])); };
G.W.newYear = function (S) {
  var Y = G.W.year(S);
  var snap = { year: Y, fameIdx: G.W.fameIdx(S), deepest: S.deepest, bestCA: G.W.bestCA(S) };
  var pool = G.shuffle(D.YEAR_GOALS.filter(function (g) { return !(g.id === 'boss' && g.gen(snap) === 0); }).slice()).slice(0, 2);
  S.yearData = { year: Y, startDay: S.day, startGold: S.gold, startDeepest: S.deepest, startFame: S.fame, income: 0, expense: 0, deaths: 0, perms: 0, stories: 0,
    startCA: G.avg(S.roster.map(function (m) { return G.M.ca(m); })), startIds: S.roster.map(function (m) { return m.id; }),
    goals: pool.map(function (g) { return { id: g.id, v: g.gen(snap), text: g.text(g.gen(snap)) }; }), codexStart: G.W.codexCount(S) };
};
G.W.codexCount = function (S) { var n = 0; for (var c in S.codex) n += Object.keys(S.codex[c]).length; return n; };
G.W.goalDone = function (S, g) {
  var Y = S.yearData;
  if (g.id === 'floor') return S.deepest >= g.v;
  if (g.id === 'ca') return G.W.bestCA(S) >= g.v;
  if (g.id === 'gold') return S.gold - Y.startGold >= g.v;
  if (g.id === 'noDeath') return Y.deaths === 0;
  if (g.id === 'boss') { var k = D.BOSS_BY_FLOOR[g.v]; return !!S.bossKills[k]; }
  if (g.id === 'fame') return G.W.fameIdx(S) >= D.FAME.findIndex(function (f) { return f.t === g.v; });
  return false;
};
G.W.evaluate = function (S) {
  var Y = S.yearData;
  var dFloor = S.deepest - Y.startDeepest, targetGain = Math.max(3, Math.min(8, 40 - Y.startDeepest));
  var sFloor = G.clamp(dFloor / targetGain, 0, 1) * 30;
  var profit = S.gold - Y.startGold;
  var sGold = G.clamp((profit + 500) / 3000, 0, 1) * 20;
  var stayed = S.roster.filter(function (m) { return Y.startIds.indexOf(m.id) >= 0; });
  var gainCA = stayed.length ? G.avg(stayed.map(function (m) { return G.M.ca(m); })) - Y.startCA : 0;
  var sGrow = G.clamp(gainCA / 18, 0, 1) * 20;
  var sLive = G.clamp(15 - Y.deaths * 6 - Y.perms * 2, 0, 15);
  var sCodex = G.clamp((G.W.codexCount(S) - Y.codexStart) / 12, 0, 0.5) * 15 + G.W.fameIdx(S) / 6 * 7.5;
  var goals = Y.goals.map(function (g) { return { text: g.text, done: G.W.goalDone(S, g) }; });
  var bonus = goals.filter(function (g) { return g.done; }).length * 10;
  var founder = G.W.merc(S, S.founderId);
  var fstory = founder && founder.story && founder.story.done && !S.flags_fstory ? 10 : 0;
  if (fstory) S.flags_fstory = true;
  var total = Math.round(sFloor + sGold + sGrow + sLive + sCodex + bonus + fstory);
  var grade = total >= 85 ? 'S' : total >= 70 ? 'A' : total >= 55 ? 'B' : total >= 40 ? 'C' : 'D';
  return { year: Y.year, parts: { floor: Math.round(sFloor), gold: Math.round(sGold), grow: Math.round(sGrow), live: Math.round(sLive), codex: Math.round(sCodex) }, goals: goals, bonus: bonus, fstory: fstory,
    total: Math.min(120, total), grade: grade, profit: profit, gainCA: G.round1(gainCA), deaths: Y.deaths, floorFrom: Y.startDeepest, floorTo: S.deepest,
    best: S.roster.slice().sort(function (a, b) { return G.M.ca(b) - G.M.ca(a); })[0] };
};
G.W.yearEnd = function (S) {
  var ev = G.W.evaluate(S), R = D.GRADE_REWARD[ev.grade];
  S.fame += R.fame; S.gold += R.gold;
  if (R.bonus === 'paFloor') S.bonus.paFloorYear = ev.year + 1;
  if (R.bonus === 'slot') S.bonus.slotYear = ev.year + 1;
  ev.reward = R; ev.bestName = ev.best ? ev.best.name + ' (CA ' + Math.round(G.M.ca(ev.best)) + ')' : '-';
  delete ev.best;
  S.evals.push(ev); S.pendingEval = ev;
  G.W.notify(S, { kind: 'guild', sev: 'SAB'.indexOf(ev.grade) >= 0 ? 'good' : 'info', title: ev.year + '년차 연말 평가: ' + ev.grade + ' (' + ev.total + '점)', text: '순수익 ' + ev.profit + 'G, 전사 ' + ev.deaths + '명, 올해의 용병 ' + ev.bestName + '. 보상: 명성 +' + R.fame + ', 후원금 ' + R.gold + 'G.' });
  G.W.news(S, ev.year + '년차 연말 길드 평가: ' + ev.grade + '등급 (' + ev.total + '점). 명성 +' + R.fame + ', 후원금 ' + R.gold + 'G', 'big');
};

// ───── 저장 ─────
G.W.SAVE_KEY = 'migun_save_v1';
G.W.save = function (S) {
  try { localStorage.setItem(G.W.SAVE_KEY, JSON.stringify({ S: S, rng: G.rng.s })); return true; } catch (e) { return false; }
};
G.W.load = function () {
  try { var raw = localStorage.getItem(G.W.SAVE_KEY); if (!raw) return null; var o = JSON.parse(raw); G.rng = new G.RNG(o.rng); o.S.settings = Object.assign({ swordSprite: 'batchA', tiles: 'batchA', recolor: true, speed: 1, portrait: 'variant', human: 'sheet', autoSkip: false }, o.S.settings || {}); G.Social.ensure(o.S); return o.S; } catch (e) { return null; }
};
G.W.exportText = function (S) { return JSON.stringify({ S: S, rng: G.rng.s }); };
G.W.importText = function (t) { var o = JSON.parse(t); if (!o || !o.S || !o.S.roster) throw new Error('저장 파일 형식이 아니다'); G.rng = new G.RNG(o.rng); o.S.settings = Object.assign({ swordSprite: 'batchA', tiles: 'batchA', recolor: true, speed: 1, portrait: 'variant', human: 'sheet', autoSkip: false }, o.S.settings || {}); G.Social.ensure(o.S); return o.S; };
