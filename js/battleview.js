// 전투 재생 (Canvas): 시뮬레이터가 만든 로그를 보기 좋게 재생한다. 스킵하면 결과만 적용.
var G = window.G = window.G || {};
G.V = {};
var AMF = window.ASSET_MANIFEST;
G.V.W = 1280; G.V.H = 720;

// ───── 방 배경 ─────
G.V.roomBg = function (S, zone, seed, opts) {
  opts = opts || {};
  var c = document.createElement('canvas'); c.width = G.V.W; c.height = G.V.H;
  var x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  var rr = new G.RNG(seed || 7), R = function () { return rr.next(); };
  x.fillStyle = '#121016'; x.fillRect(0, 0, c.width, c.height);
  var hd = S.settings.tiles === 'hd';
  var T = AMF.tiles.hd.frames, himg = G.A.img['tiles:hd'];
  var tile = function (name, px, py, sz) {
    if (hd) { var r = T[name]; if (r && himg.width) x.drawImage(himg, r[0], r[1], r[2], r[3], px, py, sz, sz); }
    else { var im = G.A.img['bat:' + name]; if (im && im.width) x.drawImage(im, px, py, sz, sz); }
  };
  var prop = function (name, px, py, s) {
    if (hd) { var r = T['prop_' + name]; if (r && himg.width) { x.imageSmoothingEnabled = true; x.drawImage(himg, r[0], r[1], r[2], r[3], Math.round(px - r[4] * s), Math.round(py - r[5] * s), r[2] * s, r[3] * s); x.imageSmoothingEnabled = false; } }
    else { var map = { column: 'column', torch: 'wall_torch', door: 'door' }; var im = G.A.img['bat:' + (map[name] || name)]; if (im && im.width) x.drawImage(im, Math.round(px - 16 * 3), Math.round(py - 48 * 3), 96, 144); }
  };
  var sz = 96, wallTop = 40, wallH = 144, floorY = wallTop + wallH - 8;
  // 바닥
  var floorSet = hd
    ? (zone === 'mid' ? ['floor_2_0', 'floor_2_1', 'floor_2_3', 'floor_2_4', 'floor_1_0', 'floor_1_2'] : zone === 'deep' ? ['floor_0_0', 'floor_0_3', 'floor_0_4', 'floor_5_0', 'floor_0_5'] : ['floor_0_0', 'floor_0_1', 'floor_1_0', 'floor_1_1', 'floor_0_3', 'floor_1_3', 'floor_5_1'])
    : (zone === 'mid' ? ['floor_wet', 'floor_wet', 'floor_moss', 'floor_stone_variation', 'floor_water'] : zone === 'deep' ? ['floor_stone', 'floor_crack', 'floor_stone_variation', 'floor_dirt'] : ['floor_stone', 'floor_stone_variation', 'floor_moss', 'floor_crack', 'floor_stone']);
  for (var ty = floorY; ty < c.height; ty += sz) for (var tx = 0; tx < c.width; tx += sz) tile(floorSet[Math.floor(R() * floorSet.length)], tx, ty, sz);
  // 벽
  if (hd) {
    var wl = ['wall', 'wall_moss', 'wall', 'wall_broken'];
    for (var wx = -20; wx < c.width; wx += 160) { var r = T['prop_' + wl[Math.floor(R() * wl.length)]]; if (r) { x.imageSmoothingEnabled = true; x.drawImage(himg, r[0], r[1], r[2], r[3], wx, wallTop + 10, 165, 135); x.imageSmoothingEnabled = false; } }
  } else {
    for (var wx2 = 0; wx2 < c.width; wx2 += sz) { var im = G.A.img['bat:' + (R() < 0.3 ? 'wall_moss' : 'wall_stone')]; if (im && im.width) x.drawImage(im, wx2, wallTop, sz, wallH); }
  }
  // 소품
  prop('torch', 230, wallTop + wallH - 10, 1.1); prop('torch', 1050, wallTop + wallH - 10, 1.1);
  if (opts.boss) { if (hd || true) { var ag = T.prop_arch_gate; if (ag) { x.imageSmoothingEnabled = true; x.drawImage(himg, ag[0], ag[1], ag[2], ag[3], 760, wallTop - 20, ag[2] * 1.4, ag[3] * 1.0); x.imageSmoothingEnabled = false; } } }
  else prop('door', 640, wallTop + wallH - 4, 1.0);
  if (hd) {
    var deco = zone === 'deep' ? ['bones', 'column_broken', 'grate_trap', 'rubble_pile'] : zone === 'mid' ? ['statue', 'column_cracked', 'barrel_broken', 'web'] : ['column', 'barrel', 'crate', 'web', 'bones', 'chest'];
    [[70, 300], [1210, 300], [90, 690], [1200, 700]].forEach(function (p) { prop(deco[Math.floor(R() * deco.length)], p[0], p[1], 0.8); });
  } else { prop('column', 70, 360, 1); prop('column', 1210, 360, 1); }
  // 구역 분위기 (조명·안개 오버레이 — 원본 도트 자체는 변경하지 않음)
  if (zone === 'mid') { x.fillStyle = 'rgba(70,30,90,0.20)'; x.fillRect(0, 0, c.width, c.height); var gfog = x.createLinearGradient(0, c.height, 0, c.height * 0.5); gfog.addColorStop(0, 'rgba(60,110,60,0.25)'); gfog.addColorStop(1, 'rgba(60,110,60,0)'); x.fillStyle = gfog; x.fillRect(0, 0, c.width, c.height); }
  if (zone === 'deep') { x.fillStyle = 'rgba(40,0,0,0.18)'; x.fillRect(0, 0, c.width, c.height); }
  // 비네트
  var vg = x.createRadialGradient(c.width / 2, c.height * 0.55, c.height * 0.35, c.width / 2, c.height * 0.55, c.width * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); x.fillStyle = vg; x.fillRect(0, 0, c.width, c.height);
  return c;
};

// ───── 위치 ─────
G.V.pos = function (side, row, slot, big) {
  if (big) return { x: 930, y: 590 };
  var s = slot % 4, y = 380 + s * 98 - (s === 3 ? 0 : 0);
  if (side === 'p') return { x: { front: 520, mid: 375, back: 230 }[row] - s * 26, y: s === 3 ? 300 : y };
  return { x: { front: 780, mid: 905, back: 1040 }[row] + s * 26, y: s === 3 ? 300 : y };
};

// ───── 재생기 ─────
G.V.Battle = function (canvas, S, battle, res, onEnd) {
  var self = this;
  this.c = canvas; this.ctx = canvas.getContext('2d'); this.S = S; this.res = res; this.onEnd = onEnd;
  this.speed = S.settings.speed || 1; this.clock = 0; this.sched = []; this.fx = []; this.texts = []; this.banner = null; this.tint = null;
  this.i = 0; this.busy = false; this.done = false; this.paused = false;
  this.zone = battle.setup.ctx.zone || 'upper';
  this.dark = battle.setup.ctx.dark && !battle.setup.ctx.lit;
  this.bg = G.V.roomBg(S, this.zone, (S.day * 31 + (battle.setup.ctx.floor || 1) * 7) | 0, { boss: !!battle.setup.ctx.bossKey });
  this.units = {};
  var start = res.log[0];
  start.units.forEach(function (u) { self.addUnit(u); });
  this.logEl = null;
  this.last = performance.now();
  this.raf = requestAnimationFrame(function f(t) { self.frame(t); if (!self.stopped) self.raf = requestAnimationFrame(f); });
  if (start.text) this.showBanner(start.text, 1400);
  this.at(600, function () { self.nextEvent(); });
};
G.V.Battle.prototype.addUnit = function (u) {
  var vis = G.A.visual(u, this.S);
  var p = G.V.pos(u.side, u.row, u.slot, u.boss && vis.type !== 'sheet' ? true : u.boss);
  var merc = u.mercRef || (u.mercId ? (this.S.roster.filter(function (m) { return m.id === u.mercId; })[0] || null) : null);
  this.units[u.id] = { id: u.id, side: u.side, name: u.name, vis: vis, hx: p.x, hy: p.y, x: p.x, y: p.y, anim: 'idle', at: Math.random() * 1000, hp: u.hp, maxHp: u.maxHp, alive: true,
    dead: false, flip: u.side === 'e' && !!u.cls, look: merc ? merc.look : null, egg: u.egg, boss: u.boss, alpha: u.spawned ? 0 : 1, row: u.row, slot: u.slot, status: {}, flash: 0, cls: u.cls };
};
G.V.Battle.prototype.at = function (ms, fn) { this.sched.push({ t: this.clock + ms, fn: fn }); };
G.V.Battle.prototype.showBanner = function (t, ms, cls) { this.banner = { t: t, until: this.clock + (ms || 1200), cls: cls || '' }; };
G.V.Battle.prototype.float = function (u, txt, color, big) { if (!u) return; this.texts.push({ x: u.x + (Math.random() - 0.5) * 30, y: u.y - 120, txt: txt, color: color, t0: this.clock, big: big }); };
G.V.Battle.prototype.pushLog = function (t, cls) { if (this.logEl && t) { var d = document.createElement('div'); d.className = 'bl ' + (cls || ''); d.textContent = t; this.logEl.appendChild(d); this.logEl.scrollTop = 1e9; } };
G.V.Battle.prototype.setSpeed = function (s) { this.speed = s; this.S.settings.speed = s; };
G.V.Battle.prototype.frame = function (t) {
  var dt = Math.min(100, t - this.last); this.last = t;
  if (!this.paused) {
    this.clock += dt * this.speed;
    var now = this.clock, due = this.sched.filter(function (s) { return s.t <= now; });
    this.sched = this.sched.filter(function (s) { return s.t > now; });
    due.sort(function (a, b) { return a.t - b.t; }).forEach(function (s) { s.fn(); });
  }
  this.draw(dt * this.speed);
};
G.V.Battle.prototype.tween = function (u, tx, ty, ms) {
  var self = this, sx = u.x, sy = u.y, t0 = this.clock;
  u.tw = { sx: sx, sy: sy, tx: tx, ty: ty, t0: t0, ms: ms };
};
G.V.Battle.prototype.nextEvent = function () {
  if (this.done) return;
  var ev = this.res.log[++this.i];
  if (!ev) { this.finish(); return; }
  var d = this.play(ev) || 300;
  var self = this;
  this.at(d, function () { self.sync(ev); self.nextEvent(); });
};
G.V.Battle.prototype.sync = function (ev) {
  var self = this;
  if (!ev.hp) return;
  ev.hp.forEach(function (h) {
    var u = self.units[h[0]]; if (!u) return;
    u.hp = h[1];
    if (!h[2] && u.alive) self.kill(u);
    if (h[3] && h[3] !== u.row) { u.row = h[3]; var p = G.V.pos(u.side, u.row, u.slot, false); u.hx = p.x; u.hy = p.y; self.tween(u, p.x, p.y, 250); }
  });
};
G.V.Battle.prototype.kill = function (u) {
  if (!u.alive) return;
  u.alive = false; u.anim = 'death'; u.at = 0; u.deathT = this.clock;
};
G.V.Battle.prototype.impact = function (ev, a, kindMag) {
  var self = this;
  (ev.targets || []).forEach(function (r) {
    var t = self.units[r.id]; if (!t) return;
    if (r.miss) { self.float(t, r.note || 'MISS', '#bbb'); return; }
    if (r.buff && !r.dmg && !r.heal) { self.float(t, r.buff, '#9fd3ff'); self.fx.push({ k: 'glow', x: t.x, y: t.y - 50, t0: self.clock, color: '#9fd3ff' }); return; }
    if (r.heal != null && !r.dmg) { self.float(t, '+' + r.heal, '#6fe08a'); self.fx.push({ k: 'heal', x: t.x, y: t.y - 40, t0: self.clock }); return; }
    if (r.dmg) {
      self.float(t, (r.crit ? '치명! ' : '') + r.dmg + (r.note ? ' ' + r.note : ''), r.crit ? '#ffd24a' : r.note === '치유 반전!' ? '#c27ce6' : '#ff6b5e', r.crit);
      t.flash = 160; if (t.alive) { t.anim = 'hit'; t.at = 0; t.animUntil = self.clock + 260; }
      if (!kindMag && a && a.vis && (a.vis.type === 'batchA' || (a.cls && ['swordsman', 'knight', 'berserker', 'spellblade', 'lancer', 'monk', 'rogue'].indexOf(a.cls) >= 0))) self.fx.push({ k: 'slash', x: t.x, y: t.y - 50, t0: self.clock, flip: a.side === 'e' });
      else self.fx.push({ k: kindMag ? 'burst' : 'spark', x: t.x, y: t.y - 50, t0: self.clock, color: kindMag ? '#ff9a3c' : '#fff3c0' });
      if (r.buff) self.float(t, r.buff, '#c9a0ff');
      if (r.injury) self.float(t, r.injury === 2 ? '중상!' : '부상!', '#ff4040');
    }
    if (r.ko) self.at(120, function () { self.kill(t); });
  });
};
G.V.Battle.prototype.play = function (ev) {
  var self = this, a = this.units[ev.a], D = G.D;
  var txt = ev.text || '';
  if (ev.genius) txt = txt || (a ? a.name + ' — 천재성 발동!' : '');
  if (ev.disobey && !ev.text) txt = a ? a.name + ' — ' + ev.disobey : '';
  if (ev.skill && a) { var sn = D.SKILLS[ev.skill].name; this.float(a, sn, '#ffe9a8'); this.pushLog(a.name + ' — ' + sn); }
  if (txt) { this.showBanner(txt, 1200, ev.genius ? 'genius' : ev.disobey ? 'warn' : ''); this.pushLog(txt, ev.genius ? 'genius' : ev.disobey ? 'warn' : ''); }
  if (ev.pre) ev.pre.forEach(function (r) { var t = self.units[r.id]; if (t) self.float(t, r.dmg + ' ' + (r.note || ''), '#a5e36b'); });
  switch (ev.type) {
    case 'mind': if (a) { var gd = ev.good; this.float(a, G.D.MINDS[ev.mind].name + '!', gd ? '#ffe9a8' : '#e08ae0', true); this.tint = { c: gd ? 'rgba(255,220,120,0.22)' : 'rgba(150,40,160,0.28)', until: this.clock + 700 }; this.fx.push({ k: 'glow', x: a.x, y: a.y - 50, t0: this.clock, color: gd ? '#ffe9a8' : '#c070e0' }); } return 800;
    case 'dot': case 'stunned': case 'panic': if (a && ev.type !== 'dot') this.float(a, ev.type === 'panic' ? '패닉' : '기절', '#ccc'); return 450;
    case 'phoenix': this.tint = { c: 'rgba(255,160,60,0.35)', until: this.clock + 700 }; Object.keys(this.units).forEach(function (k) { var u = self.units[k]; if (u.side === 'p' && !u.alive) { u.alive = true; u.dead = false; u.anim = 'idle'; } }); return 900;
    case 'illusion': this.tint = { c: 'rgba(120,40,170,0.35)', until: this.clock + 800 }; this.impact(ev, a, true); return 900;
    case 'aura': case 'cast': this.tint = { c: ev.type === 'aura' ? 'rgba(40,0,40,0.45)' : 'rgba(20,0,30,0.25)', until: this.clock + 900 }; this.impact(ev, a, true); return 900;
    case 'auraOff': this.impact(ev, a, true); return 700;
    case 'egg': case 'summon':
      if (ev.spawn) { var sp = ev.spawn; sp.spawned = true; this.addUnit(sp); var nu = this.units[sp.id]; this.fx.push({ k: 'glow', x: nu.x, y: nu.y - 30, t0: this.clock, color: ev.type === 'egg' ? '#e8e0c0' : '#8f6fd0' }); }
      if (ev.targets && ev.targets.length) return this.attackAnim(ev, a);
      return 700;
    case 'potion': if (a) { this.fx.push({ k: 'heal', x: a.x, y: a.y - 40, t0: this.clock }); this.impact(ev, a); } return 600;
    case 'explode': if (a) { this.fx.push({ k: 'burst', x: a.x, y: a.y - 30, t0: this.clock, color: '#ff7a3c', big: true }); this.impact(ev, a, true); this.kill(a); } return 700;
  }
  if (ev.hatch) ev.hatch.forEach(function (id) { var u = self.units[id]; if (u) { u.vis = { type: 'sheet', sheet: 'mon_spider', scale: 0.6 }; u.egg = false; u.name = '자폭 새끼거미'; self.float(u, '부화!', '#ff9a3c'); } });
  if (ev.move && a) { var p = G.V.pos(a.side, 'front', a.slot, false); a.hx = p.x; a.hy = p.y; }
  return this.attackAnim(ev, a);
};
G.V.Battle.prototype.attackAnim = function (ev, a) {
  var self = this;
  if (!a) { this.impact(ev, null); return 400; }
  var tgt = ev.targets && ev.targets[0] ? this.units[ev.targets[0].id] : null;
  var skill = ev.skill ? G.D.SKILLS[ev.skill] : null;
  var mag = skill && ['mag', 'magAoe', 'heal', 'purify', 'song', 'curse', 'summon'].indexOf(skill.kind) >= 0 || (a.cls && ['mage', 'warlock', 'elementalist', 'priest', 'bard'].indexOf(a.cls) >= 0 && !skill);
  var support = skill && ['heal', 'purify', 'song', 'taunt', 'summon', 'curse'].indexOf(skill.kind) >= 0;
  var melee = !support && !mag && a.cls && ['swordsman', 'knight', 'berserker', 'monk', 'spellblade', 'lancer', 'rogue'].indexOf(a.cls) >= 0 || (!a.cls && a.side === 'e' && tgt && !mag && !support && this.isMeleeMon(a));
  a.anim = 'attack'; a.at = 0; a.animUntil = this.clock + 520;
  if (melee && tgt && tgt !== a) {
    var dir = a.side === 'p' ? -1 : 1;
    var ox = tgt.x + dir * (tgt.boss ? 150 : 85);
    this.tween(a, ox, tgt.y + 2, 200);
    this.at(200, function () { a.anim = 'attack'; a.at = 0; a.animUntil = self.clock + 450; });
    this.at(400, function () { self.impact(ev, a, false); });
    this.at(650, function () { self.tween(a, a.hx, a.hy, 220); });
    return 950;
  }
  if (support) {
    this.fx.push({ k: 'glow', x: a.x, y: a.y - 60, t0: this.clock, color: '#ffe9a8' });
    this.at(300, function () { self.impact(ev, a, true); });
    return 750;
  }
  // 원거리·마법: 투사체
  var col = mag ? '#ff9a3c' : '#e8e0c8';
  (ev.targets || []).forEach(function (r, i) { var t = self.units[r.id]; if (t) self.fx.push({ k: 'proj', sx: a.x + (a.side === 'p' ? 30 : -30), sy: a.y - 60, tx: t.x, ty: t.y - 50, t0: self.clock + 150 + i * 40, ms: 260, color: col, mag: mag }); });
  this.at(430, function () { self.impact(ev, a, mag); });
  return 850;
};
G.V.Battle.prototype.isMeleeMon = function (a) {
  var key = null; for (var k in this.res.units) { }
  var u = this.res.units.filter(function (x) { return x.id === a.id; })[0];
  return u ? u.range !== 'ranged' : true;
};
G.V.Battle.prototype.finish = function () {
  if (this.done) return; this.done = true;
  var self = this;
  var end = this.res.log[this.res.log.length - 1];
  this.showBanner(end.text, 99999, this.res.result === 'win' ? 'win' : 'lose');
  setTimeout(function () { self.stop(); self.onEnd && self.onEnd(); }, 900);
};
G.V.Battle.prototype.skip = function () {
  if (this.done) return;
  var self = this;
  for (var j = this.i + 1; j < this.res.log.length; j++) this.sync(this.res.log[j]);
  this.i = this.res.log.length; this.sched = []; this.fx = [];
  Object.keys(this.units).forEach(function (k) { var u = self.units[k]; u.tw = null; if (u.hx != null) { u.x = u.hx; u.y = u.hy; } if (!u.alive) { u.deathT = self.clock - 1500; u.at = 9999; } });
  this.res.log.slice(1).forEach(function (ev) { if (ev.text) self.pushLog(ev.text); });
  this.finish();
};
G.V.Battle.prototype.stop = function () { this.stopped = true; cancelAnimationFrame(this.raf); };

// ───── 그리기 ─────
G.V.Battle.prototype.draw = function (dt) {
  var ctx = this.ctx, self = this, now = this.clock;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(this.bg, 0, 0);
  var us = Object.keys(this.units).map(function (k) { return self.units[k]; });
  us.forEach(function (u) {
    if (u.tw) { var p = Math.min(1, (now - u.tw.t0) / u.tw.ms); var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; u.x = u.tw.sx + (u.tw.tx - u.tw.sx) * e; u.y = u.tw.sy + (u.tw.ty - u.tw.sy) * e; if (p >= 1) u.tw = null; }
    u.at += dt;
    if (u.animUntil && now > u.animUntil && u.alive) { u.anim = 'idle'; u.animUntil = 0; }
    if (u.alpha < 1 && u.alive) u.alpha = Math.min(1, u.alpha + dt / 400);
    if (u.flash > 0) u.flash -= dt;
  });
  us.sort(function (a, b) { return a.y - b.y; });
  us.forEach(function (u) {
    var fr, anim = u.anim, len = G.A.animLen(u.vis, anim);
    var ms = anim === 'attack' ? 90 : anim === 'death' ? 150 : anim === 'hit' ? 120 : 260;
    fr = Math.floor(u.at / ms);
    if (anim === 'death' || anim === 'attack' || anim === 'hit') fr = Math.min(fr, len - 1); else fr = fr % len;
    var alpha = u.alpha;
    if (!u.alive) { var dt2 = now - (u.deathT || now); if (u.side === 'e') alpha = Math.max(0, 1 - Math.max(0, dt2 - 800) / 700); else alpha = 0.75; }
    if (alpha <= 0) return;
    var sw = u.vis.type === 'concept' ? 260 : u.boss ? 240 : u.vis.type === 'icon' ? 64 : 70;
    if (u.alive) G.A.shadow(ctx, u.x, u.y, sw);
    G.A.drawUnit(ctx, u.vis, u.x, u.y, { anim: u.egg ? 'idle' : anim, frame: fr, flip: u.flip, alpha: alpha, look: u.look, recolor: self.S.settings.recolor, dir: u.side === 'e' ? 'left' : 'right', t: now + u.at });
    if (u.flash > 0 && u.alive) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.A.drawUnit(ctx, u.vis, u.x, u.y, { anim: u.egg ? 'idle' : anim, frame: fr, flip: u.flip, alpha: 0.55, look: u.look, recolor: self.S.settings.recolor, dir: u.side === 'e' ? 'left' : 'right', t: now + u.at }); ctx.restore(); }
    if (u.alive) self.drawBar(u);
  });
  // 어둠 (횃불 없음)
  if (this.dark) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.globalCompositeOperation = 'source-over';
    var dk = document.createElement('canvas'); dk.width = G.V.W; dk.height = G.V.H; var dx = dk.getContext('2d');
    dx.fillStyle = 'rgba(0,0,0,0.72)'; dx.fillRect(0, 0, dk.width, dk.height); dx.globalCompositeOperation = 'destination-out';
    us.forEach(function (u) { if (u.side === 'p' && u.alive) { var g = dx.createRadialGradient(u.x, u.y - 40, 10, u.x, u.y - 40, 150); g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); dx.fillStyle = g; dx.fillRect(u.x - 160, u.y - 200, 320, 320); } });
    ctx.drawImage(dk, 0, 0); ctx.restore();
  }
  // 효과
  this.fx = this.fx.filter(function (f) { return now - f.t0 < 700 || (f.k === 'proj' && now - f.t0 < f.ms + 60); });
  this.fx.forEach(function (f) { self.drawFx(f, now); });
  // 떠오르는 숫자
  this.texts = this.texts.filter(function (t) { return now - t.t0 < 1100; });
  this.texts.forEach(function (t) {
    var p = (now - t.t0) / 1100;
    ctx.save(); ctx.globalAlpha = 1 - p * p; ctx.font = (t.big ? 'bold 30px' : 'bold 22px') + ' "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(t.txt, t.x, t.y - p * 50); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y - p * 50); ctx.restore();
  });
  if (this.tint && now < this.tint.until) { ctx.fillStyle = this.tint.c; ctx.fillRect(0, 0, G.V.W, G.V.H); }
  if (this.banner && now < this.banner.until) {
    var b = this.banner; ctx.save(); ctx.font = 'bold 26px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
    var w = Math.min(1180, ctx.measureText(b.t).width + 60);
    ctx.fillStyle = b.cls === 'genius' ? 'rgba(80,60,0,0.85)' : b.cls === 'warn' ? 'rgba(90,20,20,0.85)' : b.cls === 'win' ? 'rgba(20,70,30,0.9)' : b.cls === 'lose' ? 'rgba(70,10,10,0.9)' : 'rgba(10,10,18,0.8)';
    ctx.fillRect(G.V.W / 2 - w / 2, 18, w, 46); ctx.strokeStyle = 'rgba(220,190,120,0.6)'; ctx.strokeRect(G.V.W / 2 - w / 2 + 0.5, 18.5, w - 1, 45);
    ctx.fillStyle = '#f2e6c8'; ctx.fillText(b.t, G.V.W / 2, 50); ctx.restore();
  }
};
G.V.Battle.prototype.drawBar = function (u) {
  var ctx = this.ctx, w = u.boss ? 160 : 64, h = u.boss ? 9 : 6;
  var top = u.vis.type === 'concept' ? u.y - 330 : u.boss ? u.y - 250 : u.vis.type === 'batchA' ? u.y - 112 : u.y - 118;
  if (u.vis.type === 'icon') top = u.y - 105;
  if (u.egg) top = u.y - 90;
  var x = u.x - w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 1, top - 1, w + 2, h + 2);
  var p = Math.max(0, u.hp / u.maxHp);
  ctx.fillStyle = u.side === 'p' ? (p > 0.5 ? '#5fcf6f' : p > 0.25 ? '#e0b84a' : '#e05a4a') : '#c94a3a';
  ctx.fillRect(x, top, w * p, h);
  ctx.font = (u.boss ? 'bold 16px' : '13px') + ' "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(u.name, u.x, top - 5); ctx.fillStyle = u.side === 'p' ? '#e8f0ff' : '#ffd9d0'; ctx.fillText(u.name, u.x, top - 5);
};
G.V.Battle.prototype.drawFx = function (f, now) {
  var ctx = this.ctx, p = (now - f.t0) / 700;
  if (f.k === 'slash') {
    var im = G.A.img['ba:fx'], fr = Math.min(4, Math.floor((now - f.t0) / 85));
    if (im && im.width && fr >= 0) { ctx.save(); ctx.imageSmoothingEnabled = false; if (f.flip) { ctx.translate(f.x, 0); ctx.scale(-1, 1); ctx.drawImage(im, fr * 64, 0, 64, 64, -96, f.y - 96, 192, 192); } else ctx.drawImage(im, fr * 64, 0, 64, 64, f.x - 96, f.y - 96, 192, 192); ctx.restore(); }
    return;
  }
  if (f.k === 'proj') {
    var q = (now - f.t0) / f.ms; if (q < 0 || q > 1) return;
    var x = f.sx + (f.tx - f.sx) * q, y = f.sy + (f.ty - f.sy) * q - Math.sin(q * Math.PI) * 40;
    ctx.save();
    if (f.mag) { var g = ctx.createRadialGradient(x, y, 2, x, y, 18); g.addColorStop(0, '#fff8d0'); g.addColorStop(0.4, f.color); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); }
    else { var ang = Math.atan2(f.ty - f.sy, f.tx - f.sx); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = f.color; ctx.fillRect(-16, -1.5, 32, 3); ctx.fillStyle = '#ccc'; ctx.fillRect(12, -3, 6, 6); }
    ctx.restore(); return;
  }
  if (p < 0 || p > 1) return;
  ctx.save();
  if (f.k === 'burst' || f.k === 'spark') {
    var r = (f.big ? 90 : 46) * (0.4 + p); ctx.globalAlpha = 1 - p;
    var g2 = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, r); g2.addColorStop(0, '#fffbe6'); g2.addColorStop(0.35, f.color); g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
  } else if (f.k === 'heal') {
    ctx.globalAlpha = 1 - p; ctx.fillStyle = '#7dff9a';
    for (var i = 0; i < 7; i++) { var a = i * 0.9 + f.t0; ctx.fillRect(f.x + Math.sin(a) * 26 - 3, f.y + 20 - p * 70 - (i % 3) * 12, 6, 6); }
  } else if (f.k === 'glow') {
    ctx.globalAlpha = (1 - p) * 0.8; ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x, f.y + 40, 40 + p * 30, 14 + p * 8, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
};

// ───── 탐험 화면 정지 장면 ─────
G.V.scene = function (canvas, S, party, zone, t) {
  var ctx = canvas.getContext('2d');
  var key = 'scene:' + zone + ':' + S.settings.tiles + ':' + (S.exp ? S.exp.floor : 0);
  if (!G.V._bg || G.V._bgKey !== key) { G.V._bg = G.V.roomBg(S, zone, (S.exp ? S.exp.floor : 1) * 13, {}); G.V._bgKey = key; }
  ctx.drawImage(G.V._bg, 0, 0);
  var rows = { front: 0, mid: 0, back: 0 };
  party.slice().map(function (m) { var f = S.tactics.formation[m.id] || { row: G.D.CLASSES[m.cls].row, slot: 0 }; return { m: m, f: f }; })
    .sort(function (a, b) { return a.f.slot - b.f.slot; })
    .forEach(function (o) {
      var p = G.V.pos('p', o.f.row, o.f.slot, false);
      var x = p.x + 180, y = p.y;
      var vis = G.A.visual({ cls: o.m.cls, mercRef: o.m }, S);
      G.A.shadow(ctx, x, y, 70);
      G.A.drawUnit(ctx, vis, x, y, { anim: 'idle', frame: Math.floor((t || 0) / 300) % 2, look: o.m.look, recolor: S.settings.recolor, alpha: o.m._down ? 0.5 : 1 });
      ctx.font = '13px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(o.m.name, x, y + 22); ctx.fillStyle = '#e8f0ff'; ctx.fillText(o.m.name, x, y + 22);
    });
  if (zone === 'deep' && S.exp && !(S.exp.sup.torch > 0)) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, G.V.W, G.V.H); }
};
