// 에셋 로딩·스프라이트 그리기 (도트 원본 색은 건드리지 않음. 배치 A 검사만 제공된 마스크로 색 변형)
var G = window.G = window.G || {};
G.A = { img: {}, ready: false, recolorCache: {} };
var AM = window.ASSET_MANIFEST, AH = window.ASSET_HUMAN, AE = window.ASSET_ELF, AD = window.ASSET_DWARF, AM2 = window.ASSET_DEMON, ADN = window.ASSET_DNH, AWF = window.ASSET_WOLF, ACT = window.ASSET_CAT, ALZ = window.ASSET_LIZARD, ADR = window.ASSET_DRAGON, AHM = window.ASSET_HMOD;
// 종족별 도트 세트: 인간·엘프 시트가 있다 (없는 종족은 기존 도트)
G.A.setOf = function (m) { return m.race === 'human' ? { A: AH, p: 'hum' } : m.race === 'elf' && AE ? { A: AE, p: 'elf' } : m.race === 'dwarf' && AD ? { A: AD, p: 'dwarf' } : m.race === 'demon' && AM2 ? { A: AM2, p: 'demon' } : m.race === 'wolf' && AWF ? { A: AWF, p: 'wolf' } : m.race === 'cat' && ACT ? { A: ACT, p: 'cat' } : m.race === 'lizard' && ALZ ? { A: ALZ, p: 'lizard' } : m.race === 'dragon' && ADR ? { A: ADR, p: 'dragon' } : null; };

G.A.load = function (onDone, onProgress) {
  var files = {};
  Object.keys(AM.sheets).forEach(function (k) { files['sheet:' + k] = AM.sheets[k].file; });
  Object.keys(AM.ui).forEach(function (k) { files['ui:' + k] = AM.ui[k]; });
  files['tiles:hd'] = AM.tiles.hd.file;
  var B = AM.batchA;
  Object.keys(B.anims).forEach(function (k) { files['ba:' + k] = B.anims[k].file; });
  Object.keys(B.masks).forEach(function (an) { Object.keys(B.masks[an]).forEach(function (ch) { files['bam:' + an + ':' + ch] = B.masks[an][ch]; }); });
  [['hum', AH], ['elf', AE], ['dwarf', AD], ['demon', AM2], ['dnh', ADN], ['wolf', AWF], ['cat', ACT], ['lizard', ALZ], ['dragon', ADR]].forEach(function (q) { if (!q[1]) return; files[q[0] + ':outfits'] = q[1].outfits.file; files[q[0] + ':mh'] = q[1].outfits.maskHair; files[q[0] + ':ms'] = q[1].outfits.maskSkin; if (q[1].portraits) files[q[0] + ':portraits'] = q[1].portraits.file; });
  ['human', 'elf', 'dwarf'].forEach(function (r) { var H = G.A.HM && G.A.HM[r]; if (H) files['hmod:parts:' + r] = H.file; });
  files['ba:shadow'] = B.shadow; files['ba:fx'] = B.fx.file;
  Object.keys(B.tiles).forEach(function (k) { files['bat:' + k] = B.tiles[k]; });
  var keys = Object.keys(files), n = 0;
  keys.forEach(function (k) {
    var im = new Image();
    im.onload = im.onerror = function () { n++; if (onProgress) onProgress(n / keys.length); if (n === keys.length) { G.A.ready = true; onDone(); } };
    im.src = files[k];
    G.A.img[k] = im;
  });
};

// ───── 유닛 외형 결정 ─────
// 반환: {type:'batchA'|'sheet'|'icon'|'concept', sheet, scale}
G.A.visual = function (u, S) {
  if (u.cls) {
    var mh = u.mercRef || u.m;
    if (mh && G.A.setOf(mh) && (!S || S.settings.human !== 'old')) return { type: 'human', merc: mh, scale: ({ hum: 0.82, dwarf: 1.05, wolf: 0.9, cat: 1.05, lizard: 1.08, dragon: 1.15 }[G.A.setOf(mh).p] || 1.0) * G.A.build(mh) };
    var sp = G.D.CLASSES[u.cls].sprite;
    if (sp === 'swordsman' && u.cls === 'swordsman' && S && S.settings.swordSprite === 'batchA') return { type: 'batchA', scale: 3 };
    return { type: 'sheet', sheet: 'ch_' + sp, scale: 0.85 };
  }
  if (u.summon) return { type: 'sheet', sheet: 'mon_skeleton', scale: 0.8 };
  var key = u.mon || u.bossKey;
  var spr = u.bossKey ? G.D.BOSSES[u.bossKey].sprite : (G.D.MONSTERS[key] || {}).sprite;
  if (!spr) return { type: 'sheet', sheet: 'mon_rat', scale: 0.85 };
  if (spr === 'boss_queen') return { type: 'sheet', sheet: 'boss_queen', scale: 0.95 };
  if (spr === 'boss_queen:egg') return { type: 'egg', sheet: 'boss_queen', scale: 0.9 };
  if (spr.indexOf('ui:') === 0) return { type: 'concept', key: spr.slice(3), scale: 2.6 };
  if (spr.indexOf('icon:') === 0) return { type: 'icon', key: spr.slice(5), scale: u.elite ? 2.4 : 2.1 };
  return { type: 'sheet', sheet: spr, scale: u.small ? 0.6 : (u.elite ? 1.0 : 0.85) };
};
// 애니메이션 이름 → 시트 애니메이션
G.A.animKeys = function (vis, anim, side) {
  var sh = AM.sheets[vis.sheet]; if (!sh) return [];
  var A = sh.anims;
  if (vis.sheet.indexOf('ch_') === 0) {
    if (anim === 'idle') return A.battle_ready;
    if (anim === 'front') return A.idle_front;
    if (anim === 'walk') return A.battle_ready;
    if (anim === 'attack') return A.attack;
    if (anim === 'hit') return A.hit;
    if (anim === 'death') return A.death;
  }
  if (vis.sheet === 'boss_queen') {
    if (anim === 'idle') return A.idle; if (anim === 'attack') return A.attack; if (anim === 'hit') return A.hit; if (anim === 'death') return A.death; if (anim === 'lay') return A.lay;
    return A.idle;
  }
  if (A[anim]) return A[anim];
  if (anim === 'front') return A.idle;
  return A.idle || [];
};
G.A.animLen = function (vis, anim) {
  if (vis.type === 'human') return { idle: 2, front: 2, walk: 4, attack: 5, hit: 2, death: 5 }[anim] || 1;
  if (vis.type === 'batchA') { var a = AM.batchA.anims[anim === 'front' ? 'idle' : anim]; return a ? a.per : 1; }
  if (vis.type === 'icon' || vis.type === 'concept') return 1;
  if (vis.type === 'egg') return 1;
  return G.A.animKeys(vis, anim).length || 1;
};

// ───── 인간 시트 (의상 세트 4방향 + 머리·피부 마스크 + 완성 초상화) ─────
// 직업 → 의상 계열 (시트에 있는 검사·기사·도적·궁수 4계열. 나머지 직업은 가장 가까운 계열을 빌려 씀)
G.A.HGRP = { swordsman: 'swordsman', berserker: 'swordsman', spellblade: 'swordsman', knight: 'knight', lancer: 'knight', priest: 'knight',
  rogue: 'rogue', alchemist: 'rogue', monk: 'rogue', bard: 'rogue', mage: 'rogue', warlock: 'rogue', elementalist: 'rogue', archer: 'archer', hunter: 'archer' };
G.A.HVAR = { mage: [1, 2], warlock: [1, 2], elementalist: [1, 2], bard: [0, 3], priest: [2], alchemist: [0, 3], monk: [0] };
G.A.hash = function (str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); };
// 용병 외형 확정 (처음 한 번만 정해지고 저장된다. 직업이 바뀌면 의상 계열만 바뀐다)
G.A.humanLook = function (m) {
  var L = m.look = m.look || {}, grp = G.A.HGRP[m.cls] || 'swordsman', h = G.A.hash(String(m.id) + m.name), og = G.A.setOf(m).A.outfits.groups || (ADN && ADN.outfits.groups);
  var pg = grp; if (og && og.indexOf(m.cls) >= 0) grp = m.cls; // 직업 전용 의상 시트가 있으면 사용
  var PM = G.A.setOf(m).A.portraits.meta, order = G.A.setOf(m).A.portraits.order;
  if (!L.pv || !PM[L.pv]) {
    var pool = order.filter(function (k) { return PM[k].grp === pg; });
    L.pv = (pool.length ? pool : order)[h % (pool.length || order.length)];
  }
  if (L.hg !== grp || L.hc !== m.cls || L.vi == null) {
    var vars = (grp === m.cls && grp !== pg) ? [0, 1, 2, 3] : (G.A.HVAR[m.cls] || [0, 1, 2, 3]);
    L.vi = vars[(h >> 3) % vars.length]; L.hg = grp; L.hc = m.cls;
  }
  if (L.eye == null) L.eye = (h >> 5) % 4;
  return L;
};
G.A.build = function (m) {
  var st = m.stats || {}, v = ((st.str || 8) + (st.con || 8)) / 2 / 20;
  return 0.94 + 0.12 * Math.max(0, Math.min(1, v));
};
G.A.hex = function (h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; };
G.A.EYES = ['#2a1c1c', '#27406a', '#2f5a35', '#5a3318'];
// 마스크 영역의 색을 목표색으로 옮긴다 (곱하기 + 더하기, 명암 유지. getImageData 없이 → file://에서도 동작)
G.A.tintRegion = function (base, fr, maskImg, c0, target, pre) {
  var w = fr[2], h = fr[3];
  var R = document.createElement('canvas'); R.width = w; R.height = h; var rx = R.getContext('2d'); rx.imageSmoothingEnabled = false;
  rx.drawImage(G.A.img[pre + ':outfits'], fr[0], fr[1], w, h, 0, 0, w, h);
  rx.globalCompositeOperation = 'destination-in'; rx.drawImage(maskImg, fr[0], fr[1], w, h, 0, 0, w, h);
  var T = G.A.hex(target), mul = [0, 1, 2].map(function (i) { return Math.min(1, T[i] / Math.max(1, c0[i])); });
  var add = [0, 1, 2].map(function (i) { return Math.max(0, T[i] - c0[i] * mul[i]); });
  rx.globalCompositeOperation = 'multiply'; rx.fillStyle = 'rgb(' + mul.map(function (v) { return Math.round(v * 255); }).join(',') + ')'; rx.fillRect(0, 0, w, h);
  rx.globalCompositeOperation = 'lighter'; rx.fillStyle = 'rgb(' + add.map(function (v) { return Math.round(v); }).join(',') + ')'; rx.fillRect(0, 0, w, h);
  rx.globalCompositeOperation = 'destination-in'; rx.drawImage(maskImg, fr[0], fr[1], w, h, 0, 0, w, h);
  var bx = base.getContext('2d');
  bx.globalCompositeOperation = 'destination-out'; bx.drawImage(maskImg, fr[0], fr[1], w, h, 0, 0, w, h);
  bx.globalCompositeOperation = 'source-over'; bx.drawImage(R, 0, 0);
};
// 얼굴: 시트의 얼굴은 비어 있어서 눈·눈썹·입만 작게 그려 넣는다
G.A.drawFace = function (cx, meta, eyeHex, browHex, dirTag) {
  var f = meta.face; if (!f || dirTag === 'B') return;
  var fw = f[2] - f[0], fh = f[3] - f[1], ew = Math.max(3, Math.round(fw * 0.1)), eh = Math.round(ew * 1.7);
  var ey = Math.round(f[1] + fh * 0.5), mouthY = Math.round(f[1] + fh * 0.82);
  cx.save(); cx.imageSmoothingEnabled = false;
  var eye = function (x) { cx.fillStyle = '#16100e'; cx.fillRect(x - 1, ey - 1, ew + 2, eh + 2); cx.fillStyle = eyeHex; cx.fillRect(x, ey, ew, eh); cx.fillStyle = 'rgba(255,255,255,0.85)'; cx.fillRect(x, ey, Math.max(1, Math.round(ew * 0.4)), Math.max(1, Math.round(eh * 0.3))); };
  var brow = function (x, w) { cx.fillStyle = browHex; cx.fillRect(x, ey - Math.round(eh * 0.7) - 2, w, 2); };
  var mouth = function (x, w) { cx.fillStyle = '#7a3a34'; cx.fillRect(x, mouthY, w, 2); };
  if (dirTag === 'F') {
    var mid = (f[0] + f[2]) / 2, dx = fw * 0.2;
    eye(Math.round(mid - dx - ew / 2)); eye(Math.round(mid + dx - ew / 2));
    brow(Math.round(mid - dx - ew), ew * 2); brow(Math.round(mid + dx - ew), ew * 2); mouth(Math.round(mid - fw * 0.09), Math.round(fw * 0.18));
  } else {
    var R = dirTag === 'R', ex = R ? f[2] - fw * 0.3 - ew : f[0] + fw * 0.3;
    eye(Math.round(ex)); brow(Math.round(ex - ew * 0.5), ew * 2); mouth(Math.round(R ? f[2] - fw * 0.34 : f[0] + fw * 0.16), Math.round(fw * 0.18));
  }
  cx.restore();
};
G.A.dirIndex = function (A, grp, vi, dir) {
  var M = A.outfits.meta, want = dir === 'left' ? 'L' : dir === 'right' ? 'R' : dir === 'up' ? 'B' : 'F';
  for (var di = 0; di < 4; di++) if (M[grp + '_' + vi + '_' + di].facing === want) return di;
  return 0;
};
// 합성된 한 장 (캐시): {cv, ax, ay}

// ───── 인간 모듈러 조합 (머리 없는 복장 + 머리 바탕 + 얼굴 부품 + 헤어) ─────
G.A.SKINS = ['#f6d2b0', '#eec29a', '#dba37c', '#c4875f', '#a96a45', '#7e4d33'];
G.A.HM = { human: AHM, elf: window.ASSET_HMOD_ELF, dwarf: window.ASSET_HMOD_DWARF };
G.A.HMT = { human: { es: 0.62, bs: 0.55, ms: 0.45, hs: 1.25, ey: 4 }, elf: { es: 0.62, bs: 0.55, ms: 0.45, hs: 1.25, ey: 4 }, dwarf: { es: 0.6, bs: 0.55, ms: 0.45, hs: 1.2, ey: 4 } };
G.A.isMod = function (m) { return !!G.A.HM[m.race] && G.S && G.S.settings.human === 'mod'; };
G.A.hmN = function (H, pre) { var n = 0; while (H.frames[pre + '_' + n]) n++; return n; };
G.A.modLook = function (m, L) {
  var h = G.A.hash(String(m.id) + m.name + 'mod');
  var H = G.A.HM[m.race], nm = G.A.hmN(H, 'mouth'), nb = G.A.hmN(H, 'beardF');
  if (L.hs == null) L.hs = h % 12;
  if (L.hcol == null) L.hcol = (m.race === 'human' && L.hs === 11) || (m.race !== 'human' && L.hs === (m.race === 'dwarf' ? 11 : 8)) ? 6 : (h >> 4) % 12;
  if (L.sk == null) L.sk = m.race === 'human' ? (h >> 8) % 4 : (h >> 8) % 2;
  if (L.br == null) L.br = (h >> 11) % 5;
  if (L.mo == null) L.mo = (h >> 14) % nm;
  if (L.bd == null) L.bd = m.race === 'elf' || !nb ? -1 : m.race === 'dwarf' ? ((h >> 17) % 5 === 0 ? -1 : (h >> 19) % nb) : (m.age >= 30 && (h >> 17) % 3 === 0) ? (h >> 19) % nb : -1;
  var st = m.stats || {}, b = ((st.str || 8) + (st.con || 8)) / 2;
  L.bld = b < 7 ? 0 : b < 12 ? 1 : 2;
  return L;
};
G.A.partCanvas = function (race, key, target) {
  var H = G.A.HM[race], fr = H.frames[key], im = G.A.img['hmod:parts:' + race], w = fr[2], h = fr[3];
  var ck = 'pc:' + race + key + '|' + (target || ''); if (G.A.recolorCache[ck]) return G.A.recolorCache[ck];
  var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(im, fr[0], fr[1], w, h, 0, 0, w, h);
  var c0 = H.c0[key];
  if (target && c0) {
    var T = G.A.hex(target), mul = [0, 1, 2].map(function (i) { return Math.min(1, T[i] / Math.max(1, c0[i])); });
    var add = [0, 1, 2].map(function (i) { return Math.max(0, T[i] - c0[i] * mul[i]); });
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgb(' + mul.map(function (v) { return Math.round(v * 255); }).join(',') + ')'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgb(' + add.map(Math.round).join(',') + ')'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(im, fr[0], fr[1], w, h, 0, 0, w, h);
  }
  return G.A.recolorCache[ck] = c;
};
G.A.modFrame = function (m, dir, recolor) {
  var L = G.A.modLook(m, G.A.humanLook(m)), d = { down: 0, left: 1, up: 2, right: 3 }[dir] || 0;
  var race = m.race, H = G.A.HM[race], T = G.A.HMT[race], ck = 'mf:' + [race, L.hg, L.vi, L.bld, L.hs, L.hcol, L.sk, L.eye, L.br, L.mo, L.bd, d, recolor ? 1 : 0].join('|');
  if (G.A.recolorCache[ck]) return G.A.recolorCache[ck];
  if (!G.A.img['hmod:parts:' + race] || !G.A.img['hmod:parts:' + race].width) return null;
  var F = H.frames, W = 170, HH = 170, cx = W / 2;
  var cv = document.createElement('canvas'); cv.width = W; cv.height = HH; var x = cv.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  var put = function (c, px, py, sc) { sc = sc || 1; x.drawImage(c, Math.round(px), Math.round(py), Math.round(c.width * sc), Math.round(c.height * sc)); };
  var og = G.A.HGRP[m.cls] || 'swordsman', okey = 'out_' + og + '_' + L.vi + '_' + d; if (!F[okey]) okey = 'out_swordsman_0_' + d;
  var oc = G.A.partCanvas(race, okey), ox = cx - oc.width / 2, oy = 150 - oc.height; put(oc, ox, oy);
  var hk = 'head_' + L.bld + '_' + d, hc = G.A.partCanvas(race, hk, recolor ? G.A.SKIN_OF(race, L.sk) : null), hx = cx - hc.width / 2, hy = oy - hc.height + 8;
  put(hc, hx, hy);
  var hcx = hx + hc.width / 2, hcy = hy + hc.height / 2, sc = function (k, s) { var c = G.A.partCanvas(race, k); return { c: c, w: Math.round(c.width * s), h: Math.round(c.height * s) }; };
  var draw = function (o, px, py) { x.drawImage(o.c, Math.round(px), Math.round(py), o.w, o.h); };
  if (d === 0) {
    var l = sc('eyeF_' + L.eye * 2, T.es), r = sc('eyeF_' + (L.eye * 2 + 1), T.es), ey = hcy + T.ey;
    draw(l, hcx - l.w - 4, ey - l.h / 2); draw(r, hcx + 4, ey - r.h / 2);
    var b = sc('brow_' + L.br, T.bs); draw(b, hcx - b.w / 2, ey - l.h / 2 - b.h);
    var mo = sc('mouth_' + L.mo, T.ms); draw(mo, hcx - mo.w / 2, hy + hc.height - mo.h - 9);
    if (L.bd >= 0) { var bb = sc('beardF_' + L.bd, 0.75); draw(bb, hcx - bb.w / 2, hy + hc.height - bb.h + 1); }
  } else if (d === 1 || d === 3) {
    var fx = d === 1 ? -1 : 1, e = sc('eyeS_' + (L.eye * 2 + (d === 1 ? 0 : 1)), T.es);
    draw(e, hcx + fx * 10 - e.w / 2, hcy - e.h / 2 + T.ey);
    var m2 = sc('mouth_' + L.mo, T.ms * 0.9); draw(m2, hcx + fx * 13 - m2.w / 2, hy + hc.height - m2.h - 9);
    if (L.bd >= 0) { var bs = sc('beardS_' + L.bd, 0.75); draw(bs, hcx + fx * 9 - bs.w / 2 + (fx > 0 ? 3 : -3), hy + hc.height - bs.h + 1); }
  }
  if (race === 'dwarf' && L.hs === 0) return G.A.recolorCache[ck] = { cv: cv, ax: cx, ay: 150 }; // 민머리
  var hair = G.A.partCanvas(race, 'hair_' + L.hs + '_' + d, recolor ? H.sw[L.hcol] : null), hs = T.hs;
  x.drawImage(hair, Math.round(hcx - hair.width * hs / 2), Math.round(hcy - hair.height * hs + 14), Math.round(hair.width * hs), Math.round(hair.height * hs));
  return G.A.recolorCache[ck] = { cv: cv, ax: cx, ay: 150 };
};
G.A.SKIN_OF = function (race, i) { return race === 'human' ? G.A.SKINS[i] : race === 'elf' ? ['#f2d2b4', '#e4bc98'][i % 2] : ['#f0c4a0', '#dba37c'][i % 2]; };
G.A.humanFrame = function (m, dir, recolor) {
  if (G.A.isMod(m)) return G.A.modFrame(m, dir, recolor !== false);
  var SO = G.A.setOf(m), A = SO.A, pre = SO.p, L = G.A.humanLook(m), PM = A.portraits.meta[L.pv];
  var AO = A; if (!A.outfits.frames[L.hg + '_0_0'] && ADN) { AO = ADN; pre = 'dnh'; } // 다른 종족의 나머지 직업: 뿔을 지운 마족 직업 복장
  var di = G.A.dirIndex(AO, L.hg, L.vi, dir);
  var key = L.hg + '_' + L.vi + '_' + di, fr = AO.outfits.frames[key], meta = AO.outfits.meta[key];
  var ck = 'hf:' + pre + key + '|' + (recolor ? PM.hair + PM.skin : '') + '|' + L.eye;
  var c = G.A.recolorCache[ck]; if (c) return c;
  var im = G.A.img[pre + ':outfits']; if (!im || !im.width) return null;
  var cv = document.createElement('canvas'); cv.width = fr[2]; cv.height = fr[3];
  var cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(im, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
  var hairHex = recolor ? PM.hair : '#6b4a30';
  if (recolor) {
    if (meta.hairable && meta.hair0) G.A.tintRegion(cv, fr, G.A.img[pre + ':mh'], meta.hair0, PM.hair, pre);
    if (meta.skin0) G.A.tintRegion(cv, fr, G.A.img[pre + ':ms'], meta.skin0, PM.skin, pre);
  }
  var hc = G.A.hex(hairHex), brow = 'rgb(' + hc.map(function (v) { return Math.round(v * 0.55); }).join(',') + ')';
  G.A.drawFace(cx, meta, G.A.EYES[L.eye], brow, meta.facing);
  c = G.A.recolorCache[ck] = { cv: cv, ax: fr[4], ay: fr[5] };
  return c;
};
// 종족 시트의 기본 도트 키(마족 기본 4직업 ≈ 100px 기준) 대비 비율
G.A.raceH = function (SO) {
  if (SO._h) return SO._h; var hs = []; ['swordsman', 'knight', 'rogue', 'archer'].forEach(function (g) { for (var d = 0; d < 4; d++) { var f = SO.A.outfits.frames[g + '_0_' + d]; if (f) hs.push(f[3]); } });
  hs.sort(function (x, y) { return x - y; }); return (SO._h = (hs[hs.length >> 1] || 100) / 100);
};
// 손으로 만든 움직임 (스프라이트가 정지 컷이라 몸 전체를 움직인다)
G.A.drawHuman = function (ctx, vis, x, y, opt) {
  var m = vis.merc, anim = opt.anim || 'idle', fr = opt.frame || 0, s = vis.scale * (opt.scale || 1);
  var dir = anim === 'front' ? 'down' : (opt.dir || 'right');
  var F = G.A.humanFrame(m, dir, opt.recolor !== false); if (!F) return;
  var gs = (G.A.setOf(m).A.outfits.gscale || (ADN && ADN.outfits.gscale) || {})[G.A.humanLook(m).hg] || 1;
  if (!G.A.setOf(m).A.outfits.frames[G.A.humanLook(m).hg + '_0_0']) gs *= G.A.raceH(G.A.setOf(m)); s *= gs;
  var sgn = dir === 'left' ? -1 : 1, ox = 0, oy = 0, rot = 0, sy = 1, reach = G.D.CLASSES[m.cls].range === 'ranged' ? 0.35 : 1;
  if (anim === 'idle' || anim === 'front') { oy = -(fr % 2) * 2.2; sy = 1 + (fr % 2) * 0.012; }
  else if (anim === 'walk') { oy = -Math.abs(Math.sin(fr * Math.PI / 2)) * 4; rot = Math.sin(fr * Math.PI / 2) * 0.03; }
  else if (anim === 'attack') { ox = sgn * reach * [-6, -12, 14, 30, 10][Math.min(4, fr)]; rot = sgn * reach * [-0.05, -0.08, 0.10, 0.16, 0.05][Math.min(4, fr)]; oy = [0, 0, -3, -2, 0][Math.min(4, fr)]; }
  else if (anim === 'hit') { ox = -sgn * [14, 6][Math.min(1, fr)]; rot = -sgn * [0.12, 0.05][Math.min(1, fr)]; }
  else if (anim === 'death') { var k = Math.min(4, fr) / 4; rot = -sgn * (Math.PI / 2) * k * 0.96; oy = k * 6; ox = -sgn * k * 14; }
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.translate(Math.round(x + ox), Math.round(y + oy)); ctx.rotate(rot); ctx.scale(1, sy);
  ctx.drawImage(F.cv, -F.ax * s, -F.ay * s, F.cv.width * s, F.cv.height * s);
  ctx.restore();
};

// ───── 배치 A 색 변형 (마스크 사용) ─────
G.A.recolored = function (anim, look) {
  var key = anim + '|' + look.hair + look.cloth + look.cloth2 + look.eyes;
  if (G.A.recolorCache[key]) return G.A.recolorCache[key];
  var base = G.A.img['ba:' + anim]; if (!base || !base.width) return base;
  var c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
  var x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(base, 0, 0);
  [['hair', look.hair], ['cloth_main', look.cloth], ['cloth_secondary', look.cloth2], ['eyes', look.eyes]].forEach(function (p) {
    var mk = G.A.img['bam:' + anim + ':' + p[0]]; if (!mk || !mk.width) return;
    var t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    var tx = t.getContext('2d'); tx.drawImage(mk, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = p[1]; tx.fillRect(0, 0, t.width, t.height);
    x.globalCompositeOperation = 'color'; x.drawImage(t, 0, 0); x.globalCompositeOperation = 'source-over';
  });
  // 알파 복원 (색 합성이 투명 영역에 번지지 않게)
  x.globalCompositeOperation = 'destination-in'; x.drawImage(base, 0, 0); x.globalCompositeOperation = 'source-over';
  G.A.recolorCache[key] = c;
  return c;
};

// ───── 그리기 ─────
// opt: {anim, frame, dir('right'|'left'|'down'), flip, alpha, look, recolor}
G.A.drawUnit = function (ctx, vis, x, y, opt) {
  opt = opt || {};
  ctx.save();
  if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
  var anim = opt.anim || 'idle', fr = opt.frame || 0, s = vis.scale * (opt.scale || 1);
  if (vis.type === 'human') {
    G.A.drawHuman(ctx, vis, x, y, opt);
  } else if (vis.type === 'batchA') {
    ctx.imageSmoothingEnabled = false;
    var B = AM.batchA, an = anim === 'front' ? 'idle' : anim;
    var A = B.anims[an] || B.anims.idle;
    var dir = an === 'death' ? 'down' : (opt.dir || (anim === 'front' ? 'down' : 'right'));
    var row = Math.max(0, A.rows.indexOf(dir));
    var per = A.per, f = fr % per;
    var img = opt.recolor && opt.look ? G.A.recolored(an, opt.look) : G.A.img['ba:' + an];
    if (img && img.width) ctx.drawImage(img, f * 32, row * 48, 32, 48, Math.round(x - 16 * s), Math.round(y - 40 * s), 32 * s, 48 * s);
  } else if (vis.type === 'sheet' || vis.type === 'egg') {
    var sh = AM.sheets[vis.sheet], keys = vis.type === 'egg' ? sh.anims.egg : G.A.animKeys(vis, anim);
    var k = vis.type === 'egg' ? keys[opt.hatching ? 1 : 0] : keys[fr % Math.max(1, keys.length)];
    var r = sh.frames[k], im = G.A.img['sheet:' + vis.sheet];
    if (r && im && im.width) {
      ctx.imageSmoothingEnabled = s < 1;
      if (opt.flip) { ctx.translate(x, 0); ctx.scale(-1, 1); x = 0; }
      ctx.drawImage(im, r[0], r[1], r[2], r[3], Math.round(x - r[4] * s), Math.round(y - r[5] * s), r[2] * s, r[3] * s);
    }
  } else if (vis.type === 'icon') {
    var shi = AM.sheets.mon_icons, ri = shi.frames[vis.key], imi = G.A.img['sheet:mon_icons'];
    if (ri && imi.width) {
      ctx.imageSmoothingEnabled = false;
      var bob = anim === 'idle' ? Math.sin((opt.t || 0) / 260) * 2 : 0;
      ctx.drawImage(imi, ri[0], ri[1], ri[2], ri[3], Math.round(x - ri[4] * s), Math.round(y - ri[5] * s + bob), ri[2] * s, ri[3] * s);
    }
  } else if (vis.type === 'concept') {
    var ci = G.A.img['ui:' + vis.key];
    if (ci && ci.width) {
      // 컨셉 원화 임시 사용: 가장자리만 부드럽게 가려 배경에 녹임 (색 변경 없음)
      var w = ci.width * s, h = ci.height * s;
      var key = 'fade:' + vis.key + ':' + s;
      var fc = G.A.recolorCache[key];
      if (!fc) {
        fc = document.createElement('canvas'); fc.width = Math.round(w); fc.height = Math.round(h);
        var fx = fc.getContext('2d'); fx.imageSmoothingEnabled = true; fx.drawImage(ci, 0, 0, w, h);
        var gr = fx.createRadialGradient(w / 2, h * 0.52, Math.min(w, h) * 0.3, w / 2, h * 0.52, Math.max(w, h) * 0.56);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        fx.globalCompositeOperation = 'destination-in'; fx.fillStyle = gr; fx.fillRect(0, 0, w, h);
        G.A.recolorCache[key] = fc;
      }
      var bob2 = Math.sin((opt.t || 0) / 400) * 3;
      ctx.drawImage(fc, Math.round(x - w / 2), Math.round(y - h * 0.92 + bob2));
    }
  }
  ctx.restore();
};
G.A.shadow = function (ctx, x, y, w) {
  var im = G.A.img['ba:shadow'];
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.55;
  if (im && im.width) ctx.drawImage(im, Math.round(x - w / 2), Math.round(y - w / 4), w, w / 2);
  ctx.restore();
};
// 초상화 변형: 외형 규격서의 직업별 의상 세트(검사·기사·도적·궁수 각 8) + 자동 생성 샘플 50(검사 계열)
G.A.PV = (function () {
  var P = {}, n;
  ['swordsman', 'knight', 'rogue', 'archer'].forEach(function (c) { P[c] = []; for (n = 0; n < 8; n++) P[c].push('pv_' + c + '_' + n); });
  for (n = 0; n < 50; n++) P.swordsman.push('pv_gen_' + n);
  return P;
})();
G.A.pvFor = function (m) {
  if (m.founder) return null;
  var pool = G.A.PV[G.D.CLASSES[m.cls].sprite]; if (!pool) return null;
  if (m.pv && pool.indexOf(m.pv) >= 0) return m.pv;
  var h = 0, id = String(m.id) + m.name; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  m.pv = pool[Math.abs(h) % pool.length];
  return m.pv;
};
// 초상화 (용병: 정면 대기)
G.A.portrait = function (canvas, m, S, t) {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (G.A.setOf(m) && S.settings.human !== 'old') {
    var L = G.A.humanLook(m), SO = G.A.setOf(m);
    if (S.settings.portrait !== 'battle' && !G.A.isMod(m)) {
      var pf = SO.A.portraits.frames[L.pv], pim = G.A.img[SO.p + ':portraits'];
      if (pf && pim && pim.width) {
        var k = Math.min(canvas.width / pf[2], canvas.height / pf[3]), w = pf[2] * k, h = pf[3] * k;
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(pim, pf[0], pf[1], pf[2], pf[3], Math.round((canvas.width - w) / 2), Math.round(canvas.height - h), Math.round(w), Math.round(h));
      }
    } else {
      var vis = G.A.visual({ cls: m.cls, mercRef: m }, S); vis.scale = canvas.height / 160;
      G.A.drawHuman(ctx, vis, canvas.width / 2, canvas.height * 0.94, { anim: 'front', frame: Math.floor((t || 0) / 450) % 2, recolor: S.settings.recolor });
    }
    return;
  }
  var pv = S.settings.portrait !== 'battle' ? G.A.pvFor(m) : null, sh = AM.sheets.portraits, im = G.A.img['sheet:portraits'];
  if (pv && sh && sh.frames[pv] && im && im.width) {
    var f = sh.frames[pv], k = Math.min(canvas.width * 0.92 / f[2], canvas.height * 0.94 / f[3]);
    if (k > 1) k = Math.floor(k * 2) / 2;
    var w = f[2] * k, h = f[3] * k, bob = (Math.floor((t || 0) / 600) % 2) * Math.max(1, Math.round(k / 2));
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, f[0], f[1], f[2], f[3], Math.round((canvas.width - w) / 2), Math.round(canvas.height * 0.97 - h - bob), Math.round(w), Math.round(h));
    ctx.restore();
    return;
  }
  var u = { cls: m.cls };
  var vis = G.A.visual(u, S);
  var fr = Math.floor((t || 0) / 450) % 2;
  var sc = canvas.height / 120;
  if (vis.type === 'batchA') { vis = { type: 'batchA', scale: 3 * sc * 0.95 }; G.A.drawUnit(ctx, vis, canvas.width / 2, canvas.height * 0.86, { anim: 'front', frame: fr, look: m.look, recolor: S.settings.recolor }); }
  else { vis.scale = 1.0 * sc; G.A.drawUnit(ctx, vis, canvas.width / 2, canvas.height * 0.94, { anim: 'front', frame: fr }); }
};
