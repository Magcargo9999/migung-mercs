// 공용 유틸리티 (전역 G 네임스페이스)
var G = window.G = window.G || {};

// 시드 고정 난수 (저장/불러오기 후에도 이어짐)
G.RNG = function (seed) {
  this.s = (seed >>> 0) || 1;
};
G.RNG.prototype.next = function () {
  var t = (this.s += 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
G.rng = new G.RNG(Date.now() & 0xffffffff);
G.R = function () { return G.rng.next(); };
G.rand = function (a, b) { return a + (b - a) * G.R(); };
G.randi = function (a, b) { return Math.floor(a + (b - a + 1) * G.R()); };
G.chance = function (p) { return G.R() < p; };
G.pick = function (arr) { return arr[Math.floor(G.R() * arr.length)]; };
G.wpick = function (obj) { // {key: weight}
  var tot = 0, k;
  for (k in obj) tot += Math.max(0, obj[k]);
  var r = G.R() * tot;
  for (k in obj) { r -= Math.max(0, obj[k]); if (r <= 0) return k; }
  return k;
};
G.shuffle = function (a) {
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(G.R() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};
G.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
G.round1 = function (v) { return Math.round(v * 10) / 10; };
G.sum = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; };
G.avg = function (a) { return a.length ? G.sum(a) / a.length : 0; };
G.uid = function () { G._uid = (G._uid || 0) + 1; return 'u' + Date.now().toString(36) + G._uid.toString(36) + Math.floor(G.R() * 1e6).toString(36); };
G.fmt = function (n) { return Math.round(n).toLocaleString('ko-KR'); };
G.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
G.deep = function (o) { return JSON.parse(JSON.stringify(o)); };
// 정규분포 근사 (난수 3개 평균)
G.tri = function () { return (G.R() + G.R() + G.R()) / 3; };
// 날짜 표기
G.DAYS_PER_WEEK = 7; G.WEEKS_PER_YEAR = 52; G.DAYS_PER_YEAR = 364; G.TOTAL_YEARS = 10;
G.dateText = function (day) {
  var y = Math.floor(day / G.DAYS_PER_YEAR) + 1, d = day % G.DAYS_PER_YEAR;
  var w = Math.floor(d / 7) + 1, wd = d % 7 + 1;
  return y + '년차 ' + w + '주 ' + wd + '일';
};
