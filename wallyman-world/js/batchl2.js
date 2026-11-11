'use strict';
// =====================================================================
// Update 1.1 (part 2): Storm Peaks (lightning rods that power platforms,
// wind tunnels, ice skating with tricks, King Thunderhead) and the
// Underwater Kingdom (an air meter with bubble streams, currents,
// giant clams, Serpentina the sea serpent), their maps, and the menus.
// =====================================================================
ACH_LIST.push(['thunderhead', 'STORM CHASER', 'BEAT KING THUNDERHEAD'], ['serpent', 'DEEP DIVER', 'BEAT SERPENTINA'], ['skater', 'TRICK STAR', 'SCORE 2000 TRICK POINTS IN ONE RUN']);
Object.assign(BOSS_TALK, { thunderhead: [['boss', 'WHO DARES CLIMB MY PEAKS? I SHALL RAIN ON YOU FOREVER!'], ['hero', 'GOOD THING I BROUGHT A HAT!']], serpent: [['boss', 'SSSO... A LITTLE HERO SWIMSSS IN MY PALACE.'], ['hero', 'AND A LITTLE HERO IS ABOUT TO TIE YOU IN A KNOT!']] });
Object.assign(BOSS_ART, { thunderhead: 'thunderhead', serpent: 'serpent' }); Object.assign(BOSS_NAMES, { thunderhead: 'KING THUNDERHEAD', serpent: 'SERPENTINA' });
BEASTS.push(['thunderhead', 'KING THUNDERHEAD', 'b'], ['serpent', 'SERPENTINA', 'b']);
Object.assign(BEAST_INFO, { thunderhead: 'RULER OF STORM PEAKS. WHEN HE SINKS LOW AND PUFFS, BOUNCE ON HIS HEAD.', serpent: 'QUEEN OF THE DEEP. MAKE HER CHARGE INTO A WALL, THEN STOMP HER DIZZY HEAD.' });
SOLID.add('Ϟ');

// ---------------- art ----------------
function drawThunderhead(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const tired = e && e.state === 'sink', dark = tired ? '#8a90a8' : '#4a5068', mid = tired ? '#b0b8c8' : '#6a7090', hi = tired ? '#e0e4f0' : '#9aa0b8';
  for (const [cx, cy, r] of [[10, 18, 10], [24, 12, 13], [38, 18, 10], [18, 22, 9], [32, 23, 9]]) { ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x + cx, y + cy, r + 1, 0, Math.PI * 2); ctx.fill(); }
  for (const [cx, cy, r, c] of [[10, 18, 10, dark], [24, 12, 13, mid], [38, 18, 10, dark], [18, 22, 9, mid], [32, 23, 9, mid], [22, 8, 6, hi]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2); ctx.fill(); }
  hR(x + 14, y - 6, 20, 6, '#1a1020'); hR(x + 15, y - 5, 18, 4, '#ffd040'); hR(x + 15, y - 9, 3, 4, '#ffd040'); hR(x + 22, y - 10, 4, 5, '#ffd040'); hR(x + 30, y - 9, 3, 4, '#ffd040'); hR(x + 23, y - 4, 2, 2, '#ff3040');
  if (tired) { hR(x + 15, y + 14, 6, 2, '#1a1020'); hR(x + 27, y + 14, 6, 2, '#1a1020'); hR(x + 21, y + 20, 6, 4, '#1a1020'); if ((t >> 4) & 1) txt('PUFF', x + 34, y - 4, '#fff', { outline: '#1a1020' }); }
  else { hR(x + 15, y + 12, 6, 5, '#fff'); hR(x + 27, y + 12, 6, 5, '#fff'); hR(x + 17, y + 13, 3, 3, '#ff3040'); hR(x + 29, y + 13, 3, 3, '#ff3040'); hR(x + 14, y + 10, 7, 2, '#1a1020'); hR(x + 27, y + 10, 7, 2, '#1a1020'); hR(x + 19, y + 21, 10, 2, '#1a1020'); }
  if (!tired && (t >> 3) % 4 === 0) { hR(x + 8, y + 31, 2, 5, '#ffe040'); hR(x + 10, y + 35, 2, 4, '#ffe040'); hR(x + 36, y + 31, 2, 4, '#ffe040'); }
}
function drawSerpentHead(x, y, e, t, face) {
  const dz = e && e.state === 'dazed', f = face || -1;
  ctx.save(); ctx.translate(x + 12, y + 9); ctx.scale(-f, 1); ctx.translate(-12, -9);
  hR(0, 2, 24, 14, '#1a1020'); hR(1, 3, 22, 12, '#30a080'); hR(1, 3, 22, 3, '#60d0a0'); hR(1, 12, 22, 3, '#e0d080'); hR(14, -3, 4, 6, '#1a1020'); hR(15, -2, 2, 5, '#ff6080'); hR(19, -2, 3, 6, '#1a1020'); hR(20, -1, 1, 5, '#ff6080');
  if (dz) { txt('X', 4, 4, '#1a1020', { shadow: null }); } else { hR(4, 5, 5, 5, '#fff'); hR(5, 6, 3, 3, e && e.state === 'aim' && (t >> 2) & 1 ? '#ff2020' : '#1a1020'); }
  hR(-4, 11, 6, 2, '#ff6080'); hR(-6, 10, 3, 1, '#ff6080'); hR(-6, 13, 3, 1, '#ff6080');
  ctx.restore();
  if (dz) for (let i = 0; i < 3; i++) { const a = t * 0.12 + (i * Math.PI * 2) / 3; hR(x + 12 + Math.cos(a) * 12, y - 6 + Math.sin(a) * 4, 3, 3, '#ffe040'); }
}
function drawSerpent(e, cx, t) {
  if (e.inv > 0 && (frame >> 2) & 1) return;
  const seg = e.trail || [];
  for (let i = seg.length - 1; i >= 0; i -= 1) { const s = seg[i], r = 8 - (i / seg.length) * 4, X = s[0] - cx + 12, Y = s[1] + 9; ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(X, Y, r + 1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = i % 2 ? '#30a080' : '#289070'; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill(); if (i % 3 === 0) hR(X - 1, Y - r - 2, 3, 3, '#ff6080'); }
  drawSerpentHead(Math.round(e.x - cx), Math.round(e.y), e, t, e.face);
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    if (id === 'thunderhead') { ctx.save(); ctx.translate(x, y); ctx.scale(0.5, 0.5); drawThunderhead(-24, -16, null, t); ctx.restore(); return; }
    if (id === 'serpent') { ctx.save(); ctx.translate(x, y); ctx.scale(0.7, 0.7); for (let i = 4; i >= 1; i--) { ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(10 + i * 6, 6 + Math.sin(i) * 4, 7 - i * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#30a080'; ctx.beginPath(); ctx.arc(10 + i * 6, 6 + Math.sin(i) * 4, 6 - i * 0.6, 0, Math.PI * 2); ctx.fill(); } drawSerpentHead(-16, -6, null, t, -1); ctx.restore(); return; }
    return _sa(id, x, y, t);
  };
}

// ---------------- the levels ----------------
LEVELS.push(
  { // 73
    name: 'SQUALL SLOPES', theme: 'snow', music: 'snow', width: 170, storm: true, tag: 'SP1', world: 'STORM PEAKS 1',
    build(b) {
      b.ground(0, 30).set(2, 11, '@').coins(8, 9, 4).set(16, 11, 'g').row(20, 8, 'BWB');
      b.ground(34, 70).stairsUp(38, 4).fill(42, 8, 48, 11, '#').coins(43, 6, 5).stairsDown(49, 4).set(58, 11, 'p').set(64, 11, 'C');
      b.ground(74, 110).set(80, 11, 'h').row(86, 8, 'WPW').set(94, 7, 'z').set(100, 11, 'g').set(104, 11, 'g');
      b.ground(114, 169).stairsUp(118, 3).fill(121, 9, 128, 11, '#').set(124, 8, 'c').coins(130, 9, 4).set(140, 11, 'p').set(150, 11, 'h').set(162, 11, 'G');
    },
  },
  { // 74
    name: 'LIGHTNING ROD RIDGE', theme: 'snow', music: 'snow', width: 180, storm: true, tag: 'SP2', world: 'STORM PEAKS 2',
    rods: [[30, 9, 33, 42, 9, 0], [62, 9, 65, 76, 8, 110], [104, 9, 107, 118, 9, 220], [140, 9, 143, 154, 8, 60]],
    build(b) {
      b.ground(0, 32).set(2, 11, '@').coins(8, 9, 4).set(20, 11, 'g').fill(30, 10, 30, 11, 'X');
      b.ground(43, 64).set(48, 11, 'p').set(54, 11, 'C').fill(62, 10, 62, 11, 'X').coins(46, 9, 3);
      b.ground(77, 106).row(84, 8, 'BWB').set(92, 11, 'h').fill(104, 10, 104, 11, 'X');
      b.ground(119, 142).set(124, 11, 'g').set(130, 11, 'C').fill(140, 10, 140, 11, 'X');
      b.ground(155, 179).set(160, 11, 'p').coins(164, 9, 4).set(172, 11, 'G');
    },
  },
  { // 75
    name: 'WIND TUNNEL PASS', theme: 'snow', music: 'sky', width: 180, storm: true, tag: 'SP3', world: 'STORM PEAKS 3',
    zones: [[26, 31, 2, 13, 0, -0.62], [58, 63, 2, 13, 0, -0.62], [80, 118, 0, 11, -0.06, 0], [134, 139, 2, 13, 0, -0.62]],
    build(b) {
      b.ground(0, 25).set(2, 11, '@').coins(8, 9, 4).set(16, 11, 'g');
      b.fill(32, 4, 44, 5, '#').coins(34, 2, 4).set(40, 3, 'p').ground(45, 57, 12).set(50, 11, 'h');
      b.fill(64, 4, 76, 5, '#').set(70, 3, 'C').ground(77, 120).coins(84, 9, 6).set(92, 11, 'g').set(100, 11, 'g').row(106, 8, 'WPW').set(114, 11, 'c');
      b.ground(121, 133).set(126, 11, 'p');
      b.fill(140, 4, 152, 5, '#').coins(142, 2, 4).ground(153, 179).set(160, 11, 'h').set(172, 11, 'G');
    },
  },
  { // 76
    name: 'FROZEN LAKE', theme: 'snow', music: 'snow', width: 210, skate: true, ice: true, tag: 'SP4', world: 'STORM PEAKS 4',
    build(b) {
      b.ground(0, 209).set(2, 11, '@');
      for (let x = 14; x < 196; x += 22) { b.set(x, 11, 'J'); b.coins(x + 3, 5, 4); b.coins(x + 3, 3, 4); }
      b.fill(60, 10, 62, 11, 'X').fill(120, 10, 122, 11, 'X').set(100, 11, 'C').set(150, 11, 'g').set(176, 11, 'g').set(202, 11, 'G');
    },
  },
  { // 77
    name: 'HAIL HOLLOW', theme: 'snow', music: 'snow', width: 180, hailFix: true, tag: 'SP5', world: 'STORM PEAKS 5',
    build(b) {
      b.ground(0, 40).set(2, 11, '@').coins(8, 9, 4).fill(18, 8, 24, 8, 'X').set(30, 11, 'g').set(36, 11, 'h');
      b.ground(45, 90).fill(50, 7, 60, 7, 'X').coins(51, 9, 9).set(66, 11, 'p').set(74, 11, 'C').row(80, 8, 'BWB');
      b.ground(95, 140).fill(100, 8, 108, 8, 'X').set(104, 11, 'c').set(116, 11, 'g').set(124, 11, 'g').fill(128, 7, 136, 7, 'X').coins(129, 9, 7);
      b.ground(145, 179).set(150, 11, 'h').set(158, 11, 'C').set(172, 11, 'G');
    },
  },
  { // 78
    name: "THUNDERHEAD'S THRONE", theme: 'snow', music: 'sky', width: 80, boss: true, bossHp: 8, bossName: 'KING THUNDERHEAD', bossType: 'thunderhead', talk: 'thunderhead', storm: true, tag: 'SP6', world: 'STORM PEAKS 6',
    bossMsg: ['KING THUNDERHEAD FIZZLES OUT', 'INTO A GENTLE DRIZZLE!', '', 'THE STORM CLEARS, AND FAR', 'BELOW THE WAVES A SUNKEN', 'KINGDOM GLITTERS...'],
    build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 10, 4).set(18, 11, 'g').row(26, 8, 'WPW').set(36, 11, 'C').set(46, 11, 'h').set(74, 11, '*'); },
  },
  { // 79
    name: 'GLACIER RINK', theme: 'snow', music: 'snow', width: 180, skate: true, ice: true, side: true, tag: 'SP+', world: 'STORM PEAKS',
    build(b) {
      b.ground(0, 179).set(2, 11, '@');
      for (let x = 12; x < 168; x += 14) { b.set(x, 11, 'J'); b.coins(x + 2, 4, 3); }
      b.fill(40, 9, 44, 9, '=').fill(90, 8, 96, 8, '=').fill(130, 9, 134, 9, '=').coins(91, 6, 5).set(172, 11, 'G');
    },
  },
  { // 80
    name: 'KELP GARDENS', theme: 'water', music: 'water', width: 170, water: true, air: true, tag: 'UK1', world: 'UNDERWATER KINGDOM 1',
    streams: [[36, 3], [86, 3], [140, 3]],
    build(b) {
      b.ground(0, 40).set(2, 11, '@').coins(8, 7, 4).set(20, 8, 'f').set(28, 5, 'j');
      b.fill(44, 6, 45, 11, 'B').coins(43, 3, 4).ground(41, 90).set(56, 7, 'f').set(64, 9, 'j').set(72, 11, 'C').row(78, 7, 'BWB');
      b.ground(91, 130).fill(96, 0, 98, 6, 'X').set(104, 9, 'f').set(112, 5, 'f').set(120, 8, 'j');
      b.ground(131, 169).set(146, 6, 'f').row(152, 7, 'WPW').set(162, 11, 'G');
    },
  },
  { // 81
    name: 'CURRENT CANYON', theme: 'water', music: 'water', width: 180, water: true, air: true, tag: 'UK2', world: 'UNDERWATER KINGDOM 2',
    streams: [[30, 3], [92, 3], [150, 3]], zones: [[40, 70, 0, 11, -0.05, 0], [100, 130, 0, 11, 0.06, 0], [134, 137, 2, 11, 0, -0.18]],
    build(b) {
      b.ground(0, 36).set(2, 11, '@').coins(8, 8, 4).set(22, 6, 'j');
      b.ground(37, 75).fill(50, 0, 52, 5, 'X').coins(54, 9, 6).set(60, 7, 'f').set(70, 11, 'C');
      b.ground(76, 132).fill(84, 8, 86, 11, 'X').set(108, 6, 'f').set(116, 9, 'j').coins(104, 3, 6);
      b.ground(133, 179).fill(138, 4, 146, 4, 'X').coins(139, 2, 6).set(156, 8, 'f').set(172, 11, 'G');
    },
  },
  { // 82
    name: 'BUBBLE GROTTO', theme: 'water', music: 'water', width: 170, water: true, air: true, airMax: 900, tag: 'UK3', world: 'UNDERWATER KINGDOM 3',
    streams: [[24, 2], [58, 2], [92, 2], [126, 2], [156, 2]],
    build(b) {
      b.fill(0, 0, 169, 1, 'X').ground(0, 169).set(2, 11, '@');
      b.fill(36, 2, 38, 8, 'X').fill(70, 6, 72, 11, 'X').fill(104, 2, 106, 8, 'X').fill(138, 6, 140, 11, 'X');
      b.coins(30, 10, 4).coins(64, 4, 4).coins(98, 10, 4).coins(132, 4, 4).set(46, 6, 'f').set(82, 9, 'j').set(116, 5, 'f').set(88, 11, 'C').set(150, 7, 'j').set(162, 11, 'G');
    },
  },
  { // 83
    name: 'CLAM BEDS', theme: 'water', music: 'water', width: 170, water: true, air: true, tag: 'UK4', world: 'UNDERWATER KINGDOM 4',
    streams: [[40, 3], [100, 3], [150, 3]], clams: [[20, 0], [48, 80], [74, 40], [112, 120], [136, 20]],
    build(b) {
      b.ground(0, 169).set(2, 11, '@').coins(8, 8, 4).set(30, 6, 'f').set(60, 8, 'j').set(84, 11, 'C').set(92, 5, 'f').row(120, 7, 'BWB').set(128, 9, 'j').set(162, 11, 'G');
      b.fill(56, 9, 58, 11, 'X').fill(124, 9, 126, 11, 'X');
    },
  },
  { // 84
    name: 'SUNKEN PALACE', theme: 'water', music: 'water', width: 180, water: true, air: true, tag: 'UK5', world: 'UNDERWATER KINGDOM 5',
    streams: [[34, 3], [96, 3], [146, 3]], clams: [[60, 60], [128, 0]], zones: [[106, 124, 0, 11, -0.05, 0]],
    build(b) {
      b.fill(0, 0, 179, 0, 'X').ground(0, 179).set(2, 11, '@').coins(8, 8, 4);
      for (const x of [20, 44, 76, 106, 136, 160]) b.fill(x, 4, x + 1, 11, 'X');
      b.coins(24, 6, 4).set(30, 9, 'f').set(52, 6, 'j').row(66, 7, 'WPW').set(84, 11, 'C').set(90, 8, 'f').set(116, 5, 'j').coins(140, 6, 4).set(150, 9, 'f').set(172, 11, 'G');
    },
  },
  { // 85
    name: "SERPENTINA'S LAIR", theme: 'water', music: 'water', width: 80, water: true, boss: true, bossHp: 7, bossName: 'SERPENTINA', bossType: 'serpent', talk: 'serpent', tag: 'UK6', world: 'UNDERWATER KINGDOM 6',
    bossMsg: ['SERPENTINA SWIMS AWAY TO SULK', 'IN A FAR-OFF TRENCH!', '', 'THE UNDERWATER KINGDOM', 'THROWS A PARTY WITH BUBBLES', 'AND VERY SOGGY CAKE.'],
    build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 8, 4).set(18, 7, 'f').row(26, 7, 'WPW').set(36, 11, 'C').set(46, 6, 'j').set(74, 11, '*'); },
  },
);
const STORM_BASE = 73, DEEP_BASE = 80;
REMATCH.push(69, 78, 85);

{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initL) {
      this._initL = true;
      if (this.def.storm && this.wx === undefined) forceWeather(this, 'thunder');
      if (this.def.hailFix && this.wx === undefined) forceWeather(this, 'hail');
      if (this.def.skate && this.wx === undefined) this.wx = null;
      if (this.def.air) { this.airMax = this.def.airMax || 1200; this.air = this.airMax; }
      for (const r of this.def.rods || []) r.on = false;
      for (const [x, ph] of this.def.clams || []) { let gy = 12; for (let y = 13; y > 2; y--) if (SOLID.has(this.tile(x, y)) && !SOLID.has(this.tile(x, y - 1))) { gy = y; break; } this.ents.push({ type: 'clam', alive: true, t: ph, x: x * TS - 8, y: gy * TS - 14, w: 32, h: 14, pearl: true }); }
      this.trick = { pts: 0, total: 0, combo: 0, name: '', show: 0 };
    }
    _upd.call(this);
    if (this.paused || this.talk || this.photo || this.state !== 'play') return;
    const p = this.p, hF = this.hF || 0;
    // lightning rods: a bolt hits the rod, and its platform crackles into life for a few seconds
    for (const r of this.def.rods || []) {
      const [rx, ry, x0, x1, py, ph] = r, c = (hF + ph) % 330;
      if (c === 60) { r.on = true; for (let x = x0; x <= x1; x++) if (this.tile(x, py) === '.') this.setTile(x, py, 'Ϟ'); if (Math.abs(rx * TS - p.x) < 300) { Audio8.thunder(0.05); this.shake = Math.max(this.shake, 6); if (this.wx) this.wx.flash = 8; } }
      if (c === 270) { r.on = false; for (let x = x0; x <= x1; x++) if (this.tile(x, py) === 'Ϟ') this.setTile(x, py, '.'); }
      r.c = c;
    }
    // wind tunnels and sea currents push you along
    this.windZoneT = Math.max(0, (this.windZoneT || 0) - 1);
    for (const [x0, x1, y0, y1, fx, fy] of this.def.zones || []) {
      const cx = (p.x + p.w / 2) / TS, cy = (p.y + p.h / 2) / TS;
      if (cx >= x0 && cx < x1 + 1 && cy >= y0 && cy < y1 + 1) { p.vx += fx; if (fy) { p.vy = Math.max(-3.2, p.vy + fy); p.onGround = false; } this.windZoneT = 2; }
    }
    // the air meter, topped up in bubble streams
    if (this.def.air) {
      let inStream = false; for (const [sx, sy] of this.def.streams || []) if (Math.abs(p.x + p.w / 2 - (sx * TS + 8)) < 12 && p.y + p.h > sy * TS) inStream = true;
      if (inStream) { if (this.air < this.airMax && frame % 8 === 0) Audio8.sfx('swim'); this.air = Math.min(this.airMax, this.air + 14); p.vy = Math.max(-2, p.vy - 0.08); } else this.air--;
      if (this.air < 300 && this.air > 0 && this.air % 60 === 0) Audio8.sfx('ping');
      if (this.air <= 0) { this.air = this.airMax / 2; p.inv = 0; this.hurt(); this.parts.push({ k: 'text', s: 'OUT OF AIR!', x: p.x - 24, y: p.y - 20, vy: -0.4, life: 70 }); }
    }
    // ice skating: tricks in the air score points when you land cleanly
    if (this.def.skate) {
      const T = this.trick; if (T.show) T.show--;
      if (!p.onGround) {
        const add = (name, pts) => { T.spin = 22; T.kind = name; T.pts += pts * (T.combo + 1); T.combo++; T.name = name + (T.combo > 1 ? ' x' + T.combo : ''); T.show = 50; Audio8.sfx('swoop'); };
        if (!T.spin && Input.pressed('run')) add('SPIN', 100);
        if (!T.spin && Input.pressed('up')) add('STAR JUMP', 150);
        if (!T.spin && Input.pressed('special')) add('TRIPLE AXEL', 300);
      } else if (T.combo) {
        if (T.spin > 8) { T.name = 'WIPEOUT!'; T.show = 60; Audio8.sfx('bump'); p.vx *= 0.3; }
        else { this.addScore(T.pts, p.x, p.y - 10); T.total += T.pts; T.name = 'LANDED! +' + T.pts; T.show = 60; Audio8.sfx('coin'); if (T.total >= 2000) Ach.unlock('skater'); }
        T.pts = 0; T.combo = 0;
      }
      if (T.spin) T.spin--;
      if (p.onGround && Math.abs(p.vx) < 1.2 && !Input.down('left')) p.vx += 0.04 * (p.face || 1); // skates keep you gliding
    }
  };
  // skating: the run and special buttons do tricks instead of throwing things
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    if (!this.def.skate || this.state !== 'play' || this.p.onGround) return _up.call(this);
    const P = Input.pressed; Input.pressed = (k) => (k === 'run' || k === 'special' ? false : P(k));
    try { return _up.call(this); } finally { Input.pressed = P; }
  };
  const _dp = Play.prototype.drawPlayer;
  Play.prototype.drawPlayer = function (cx) {
    const T = this.trick, p = this.p;
    if (!this.def.skate || !T || !T.spin || this._p2ctx) return _dp.call(this, cx);
    const X = p.x + p.w / 2 - cx, Y = p.y + p.h / 2;
    ctx.save(); ctx.translate(X, Y);
    if (T.kind === 'STAR JUMP') ctx.scale(1 + Math.sin(T.spin / 4) * 0.25, 1 - Math.sin(T.spin / 4) * 0.15); else ctx.rotate((1 - T.spin / 22) * Math.PI * 2 * (T.kind === 'TRIPLE AXEL' ? 3 : 1));
    ctx.translate(-X, -Y); _dp.call(this, cx); ctx.restore();
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.type === 'clam') { // opens for a while (grab the pearl!), shakes, then snaps shut
      if (this._p2ctx) { if (this.state === 'play' && e.snap && overlap(p, e)) this.hurt(); return; }
      e.t = (e.t + 1) % 240; e.snap = e.t >= 180 && e.t < 192;
      if (e.t === 0) e.pearl = true;
      if (e.t === 180 && Math.abs(e.x - p.x) < 200) Audio8.sfx('chomp');
      if (this.state !== 'play') return;
      if (e.t < 150 && e.pearl && overlap(p, { x: e.x + 12, y: e.y - 2, w: 8, h: 8 })) { e.pearl = false; for (let k = 0; k < 5; k++) this.addCoin(); Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: 'PEARL! +5', x: e.x, y: e.y - 16, vy: -0.4, life: 50 }); }
      if (e.snap && overlap(p, e)) this.hurt();
      return;
    }
    if (e.type === 'thunderhead') return this.updateThunderhead(e);
    if (e.type === 'serpent') return this.updateSerpent(e);
    return _ue.call(this, e);
  };
  Play.prototype.updateThunderhead = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    if (!this.bossLock || this.talk || this._p2ctx) { if (this._p2ctx && this.state === 'play' && overlap(p, e) && !(e.state === 'sink' && p.vy > 0 && p.prevBottom <= e.y + 10)) this.hurt(); return; }
    e.t++; const L = this.camMin + 8, R = this.camMin + VW - 56, rage = e.maxHp - e.hp;
    if (--e.act <= 0) {
      const next = { drift: 'gust', gust: 'sink', sink: 'drift' }[e.state] || 'drift';
      e.state = next; e.act = { drift: 220 - rage * 10, gust: 120, sink: 150 - rage * 6 }[next];
      if (next === 'gust') Audio8.sfx('swoop');
    }
    if (e.state === 'drift') {
      e.ty = 30; e.x += Math.sin(e.t * 0.02) * (1 + rage * 0.15);
      if (e.t % Math.max(40, 80 - rage * 6) === 0) this.ents.push({ type: 'bolt', alive: true, t: 0, x: p.x + p.w / 2 - 4 + (rage > 3 ? (Math.random() * 40 - 20) : 0), y: 0, w: 8, h: 8 });
    } else if (e.state === 'gust') {
      e.ty = 30; const dir = p.x < e.x + 24 ? -1 : 1; if (p.onGround || true) p.vx += dir * (0.09 + rage * 0.01); this.windZoneT = 2;
      if (e.t % 6 === 0) this.parts.push({ k: 'dust', x: e.x + 24, y: e.y + 20 + Math.random() * 20, vx: dir * 3, vy: 0, life: 30 });
    } else e.ty = 12 * TS - 30 - 40; // sinks low and puffs: jump on his head
    e.y += (e.ty - e.y) * 0.05; e.x = clamp(e.x, L, R);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'sink' && p.vy > 0 && p.prevBottom <= e.y + 10) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'drift'; e.act = 160; } return; }
    this.hurt();
  };
  Play.prototype.updateSerpent = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    const hitBody = () => (e.trail || []).some((s, i) => i > 2 && i % 2 === 0 && overlap(p, { x: s[0] + 4, y: s[1] + 4, w: 14, h: 12 }));
    if (!this.bossLock || this.talk || this._p2ctx) { if (this._p2ctx && this.state === 'play' && e.state !== 'dazed' && (overlap(p, e) || hitBody())) this.hurt(); return; }
    e.t++; const L = this.camMin + 6, R = this.camMin + VW - 30, rage = e.maxHp - e.hp;
    e.trail = e.trail || []; if (e.t % 3 === 0) { e.trail.unshift([e.x, e.y]); if (e.trail.length > 14) e.trail.pop(); }
    if (--e.act <= 0) {
      if (e.state === 'swim') { e.state = 'aim'; e.act = 45; Audio8.sfx('lasercharge'); }
      else if (e.state === 'aim') { e.state = 'lunge'; e.act = 90; const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; e.vx = (dx / d) * (3.2 + rage * 0.2); e.vy = (dy / d) * (3.2 + rage * 0.2); Audio8.sfx('roar'); }
      else if (e.state === 'lunge') { e.state = 'swim'; e.act = 150; }
      else if (e.state === 'dazed') { e.state = 'swim'; e.act = 150 - rage * 8; }
    }
    if (e.state === 'swim') { e.vx = (e.face || -1) * (1.1 + rage * 0.12); e.x += e.vx; e.y += ((70 + Math.sin(e.t * 0.04) * 40) - e.y) * 0.04; if (e.x <= L) e.face = 1; if (e.x >= R) e.face = -1; }
    else if (e.state === 'aim') { e.face = p.x < e.x ? -1 : 1; e.y += Math.sin(e.t * 0.5); }
    else if (e.state === 'lunge') {
      e.x += e.vx; e.y += e.vy; e.face = e.vx < 0 ? -1 : 1;
      if (e.x <= L || e.x >= R || e.y >= 12 * TS - 18) { e.x = clamp(e.x, L, R); e.y = Math.min(e.y, 12 * TS - 18); e.state = 'dazed'; e.act = 150 - rage * 6; this.shake = 12; Audio8.sfx('bosshit'); rumble(0.6, 200); }
    } else if (e.state === 'dazed') e.y += (12 * TS - 18 - e.y) * 0.1;
    if (this.state !== 'play' || e.inv > 0) return;
    if (overlap(p, e)) {
      if (e.state === 'dazed' && p.vy > -0.5 && p.y + p.h <= e.y + 10) { p.vy = -4.5; this.damageBoss(e); if (e.alive) { e.state = 'swim'; e.act = 120; } return; }
      if (e.state !== 'dazed') this.hurt();
    } else if (e.state !== 'dazed' && hitBody()) this.hurt();
  };
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    const bt = this.def.bossType;
    if (sp.t === '*' && (bt === 'thunderhead' || bt === 'serpent')) {
      const hp = (this.def.bossHp || 8) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0) + (game.plus && !this.rush ? 2 * game.plus : 0);
      if (bt === 'thunderhead') this.ents.push({ type: 'thunderhead', boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS - 40, y: 30, ty: 30, w: 48, h: 30, hp, maxHp: hp, inv: 0, state: 'drift', act: 120 });
      else this.ents.push({ type: 'serpent', boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS - 20, y: 80, w: 24, h: 18, hp, maxHp: hp, inv: 0, state: 'swim', act: 160, face: -1, vx: 0, vy: 0 });
      return;
    }
    return _sp.call(this, sp);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) {
    const a = e.alive, sa = Sticker.add, mine = e.type === 'thunderhead' || e.type === 'serpent';
    if (mine) Sticker.add = () => {};
    try { _db.call(this, e); } finally { Sticker.add = sa; }
    if (a && !e.alive && mine) { Ach.unlock(e.type); Bestiary.add(e.type); }
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.type === 'thunderhead') { if (!e.dying) drawThunderhead(x, y, e, frame); return; }
    if (e.type === 'serpent') { if (!e.dying) drawSerpent(e, cx, frame); return; }
    if (e.type === 'clam') {
      const open = e.t < 180 || e.t >= 200, shake = e.t >= 150 && e.t < 180 ? ((frame >> 1) & 1) * 2 - 1 : 0, gap = open ? (e.t >= 200 ? Math.min(10, (e.t - 200) / 2) : 10) : 0;
      hR(x + shake, y + 4, 32, 10, '#1a1020'); hR(x + 1 + shake, y + 5, 30, 8, '#c080c0'); for (let k = 0; k < 4; k++) hR(x + 4 + k * 7 + shake, y + 6, 2, 6, '#e0a8e0');
      if (open && e.pearl) { hR(x + 13, y - 2, 6, 6, '#1a1020'); hR(x + 14, y - 1, 4, 4, '#f8f8ff'); hR(x + 14, y - 1, 2, 2, '#ffffff'); }
      hR(x + shake, y + 4 - gap - 4, 32, 6, '#1a1020'); hR(x + 1 + shake, y + 4 - gap - 3, 30, 4, '#d090d0'); if (e.t >= 150 && e.t < 180 && (frame >> 3) & 1) txt('!', x + 13, y - 18, '#ff6060', { outline: '#1a1020' });
      return;
    }
    return _de.call(this, e, cx);
  };
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    _dt.call(this, cx);
    const t0 = Math.floor(cx / TS);
    for (let ty = 0; ty < 14; ty++) for (let tx = t0; tx <= t0 + 16; tx++) {
      if (this.tile(tx, ty) !== 'Ϟ') continue;
      const X = tx * TS - cx, Y = ty * TS, r = (this.def.rods || []).find((k) => tx >= k[2] && tx <= k[3]), blink = r && r.c > 230 && (frame >> 2) & 1;
      if (blink) { hR(X, Y, 16, 6, 'rgba(255,255,160,0.35)'); continue; }
      hR(X, Y, 16, 6, '#1a1020'); hR(X, Y + 1, 16, 4, '#5ff0ff'); hR(X, Y + 2, 16, 1, '#ffffff'); if ((tx + (frame >> 2)) % 4 === 0) hR(X + 4, Y - 2, 2, 2, '#ffe040');
    }
    for (const [rx, ry, x0, , py, , ] of this.def.rods || []) { // the rods, with a cable to their platform
      const X = rx * TS - cx; if (X < -60 || X > VW + 60) continue;
      const r = this.def.rods.find((k) => k[0] === rx), live = r && (r.on || (r.c > 0 && r.c < 60 && (frame >> 2) & 1));
      hR(X + 6, (ry - 3) * TS, 4, 3 * TS + 16, '#1a1020'); hR(X + 7, (ry - 3) * TS, 2, 3 * TS + 16, '#a0a8b8'); hR(X + 5, (ry - 3) * TS - 4, 6, 5, live ? '#ffe040' : '#6a7080');
      ctx.strokeStyle = live ? '#5ff0ff' : '#3a4050'; ctx.beginPath(); ctx.moveTo(X + 9, (ry - 3) * TS + 6); ctx.quadraticCurveTo((X + x0 * TS - cx) / 2 + 8, py * TS - 30, x0 * TS - cx, py * TS + 2); ctx.stroke();
      if (r && r.c > 20 && r.c < 60) txt('!', X + 5, (ry - 3) * TS - 16, '#ffe040', { outline: '#1a1020' });
    }
    for (const [x0, x1, y0, y1, fx, fy] of this.def.zones || []) { // wind and currents
      const X0 = x0 * TS - cx, X1 = (x1 + 1) * TS - cx; if (X1 < 0 || X0 > VW) continue;
      ctx.fillStyle = this.def.water ? 'rgba(220,245,255,0.55)' : 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 14; i++) {
        if (fy) { const x = X0 + ((i * 29) % Math.max(8, X1 - X0)), y = (((y1 + 1) * TS - ((frame * 3 + i * 37) % ((y1 - y0 + 1) * TS)))); ctx.fillRect(Math.round(x), Math.round(y), 1, 6); }
        else { const len = (X1 - X0), x = X0 + ((((frame * 2.5 * Math.sign(fx) + i * 53) % len) + len) % len), y = y0 * TS + ((i * 41) % ((y1 - y0 + 1) * TS)); ctx.fillRect(Math.round(x), Math.round(y), 8, 1); }
      }
    }
    for (const [sx, sy] of this.def.streams || []) { // bubble streams
      const X = sx * TS - cx + 8; if (X < -20 || X > VW + 20) continue;
      for (let i = 0; i < 10; i++) { const y = 12 * TS - ((frame * 1.2 + i * 19) % ((12 - sy) * TS)), x = X + Math.sin((frame + i * 20) * 0.08) * 3; ctx.fillStyle = 'rgba(230,250,255,0.85)'; ctx.fillRect(Math.round(x - 1), Math.round(y), 3, 3); ctx.fillStyle = 'rgba(255,255,255,1)'; ctx.fillRect(Math.round(x - 1), Math.round(y), 1, 1); }
    }
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _hud.call(this);
    if (this.def.air && this.air !== undefined) {
      const f = this.air / this.airMax, low = f < 0.25 && (frame >> 3) & 1;
      hR(8, 40, 64, 10, 'rgba(16,24,72,0.8)'); txt('AIR', 11, 41, low ? '#ff6060' : '#fff'); hR(31, 42, 38, 6, '#1a1020'); hR(32, 43, Math.round(36 * f), 4, f < 0.25 ? '#ff6060' : '#5ff0ff');
    }
    const T = this.trick;
    if (this.def.skate && T) { txt('TRICKS ' + T.total, 128, 62, '#5ff0ff', { align: 'center', outline: '#101848' }); if (T.show && T.name) txt(T.name, 128, 74, T.name === 'WIPEOUT!' ? '#ff6060' : '#ffe040', { align: 'center', outline: '#101848' }); if (this.hF < 400) txt('IN THE AIR: B SPIN, UP STAR JUMP, S AXEL', 128, 190, '#fff', { align: 'center', outline: '#101848' }); }
  };
}

// ---------------- the maps ----------------
NODES8.push({ x: 236, y: 186, kind: 'portal', to: 8, name: 'ROCKET TO STORM PEAKS' }); EDGES8.push([6, NODES8.length - 1]);
const NODES9 = [
  { x: 24, y: 182, kind: 'portal', to: 7, name: 'ROCKET TO ORBIT ONE' },
  { x: 62, y: 164, kind: 'level', li: 73 }, { x: 98, y: 140, kind: 'level', li: 74 }, { x: 140, y: 154, kind: 'level', li: 75 }, { x: 182, y: 140, kind: 'level', li: 76 }, { x: 208, y: 104, kind: 'level', li: 77 }, { x: 150, y: 72, kind: 'castle', li: 78 },
  { x: 222, y: 166, kind: 'level', li: 79, side: true, after: 76 }, { x: 236, y: 196, kind: 'portal', to: 9, name: 'SUBMARINE TO THE DEEP' },
];
const EDGES9 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7], [6, 8]];
const Island9 = makeIsland(NODES9, [[80, 150, 26], [120, 150, 24], [160, 130, 26], [190, 110, 24], [150, 96, 26], [120, 110, 20]], 919, (f, near, ch) => {
  if (f > 2.6) return ch ? [240, 244, 252] : [220, 228, 240];
  if (f > 1.9) return near(6, 30) ? (ch ? [150, 156, 176] : [170, 176, 196]) : ch ? [120, 126, 146] : [134, 140, 160];
  if (f > 1.45) return ch ? [96, 104, 120] : [108, 116, 132];
  if (f > 1.25) return [70, 78, 96];
  return null;
});
WORLDS.push({ nodes: () => NODES9, edges: () => EDGES9, isle: () => Island9, name: 'STORM PEAKS', sea: ['#1a2030', '#2a3448'], key: 'node9' });
const NODES10 = [
  { x: 24, y: 70, kind: 'portal', to: 8, name: 'SUBMARINE TO STORM PEAKS' },
  { x: 60, y: 96, kind: 'level', li: 80 }, { x: 96, y: 128, kind: 'level', li: 81 }, { x: 70, y: 168, kind: 'level', li: 82 }, { x: 128, y: 180, kind: 'level', li: 83 }, { x: 178, y: 156, kind: 'level', li: 84 }, { x: 196, y: 104, kind: 'castle', li: 85 },
];
const EDGES10 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
const Island10 = makeIsland(NODES10, [[110, 150, 30], [150, 160, 26], [150, 120, 24], [86, 140, 24]], 1010, (f, near, ch, r) => {
  if (f > 2.2) return near(6, 26) ? (ch ? [240, 200, 120] : [250, 216, 140]) : (r() < 0.07 ? (r() < 0.5 ? [255, 110, 140] : [255, 170, 80]) : ch ? [200, 186, 130] : [214, 200, 146]);
  if (f > 1.5) return ch ? [214, 196, 140] : [226, 210, 156];
  if (f > 1.2) return ch ? [40, 140, 150] : [50, 156, 166];
  return null;
});
WORLDS.push({ nodes: () => NODES10, edges: () => EDGES10, isle: () => Island10, name: 'UNDERWATER KINGDOM', sea: ['#04304a', '#0a4a6a'], key: 'node10' });

// ---------------- menus ----------------
function HouseScene(start = 0) { // eslint-disable-line no-func-assign
  const items = () => ["DINO'S SHOP", 'UPGRADE TREE', 'MINI-GAMES', 'GARDEN', 'PETS', 'PET SHOP', 'COSTUME SHOP', 'FILE STATS', 'SAVE CODE', 'CLOUD SAVE', "WALLYMAN'S DIARY", 'STATUE GARDEN'].concat(game.cleared[7] ? ['NEW GAME+'] : []).concat(['LEAVE']);
  let sel = start, t = 0, dom = false;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return; const it = items(); sel = Math.min(sel, it.length - 1);
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && it[sel] === 'LEAVE')) { go(() => MapScene()); return; }
      if (Input.confirm() && it[sel] === 'SAVE CODE') { Save.persist(); dom = true; codeBox('YOUR SAVE CODE - KEEP IT SAFE!', SaveCode.encode(game), null, () => { dom = false; }); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go({ "DINO'S SHOP": () => ShopScene(), 'UPGRADE TREE': () => UpgradeScene(), 'MINI-GAMES': () => MiniGamesScene(), GARDEN: () => GardenScene(), PETS: () => PetScene(), 'PET SHOP': () => PetShopScene(), 'COSTUME SHOP': () => CostumeShopScene(), 'FILE STATS': () => StatsScene(), 'CLOUD SAVE': () => CloudScene(), "WALLYMAN'S DIARY": () => DiaryScene(), 'STATUE GARDEN': () => StatueGardenScene(), 'NEW GAME+': () => PlusScene() }[it[sel]]); }
    },
    draw() {
      ctx.fillStyle = '#f0c890'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0b478'; for (let x = 0; x < VW; x += 20) ctx.fillRect(x, 0, 2, 140);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 140, VW, 84); ctx.fillStyle = '#a06a34'; for (let x = 0; x < VW; x += 32) ctx.fillRect(x, 140, 30, 84);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(170, 22, 60, 44); ctx.fillStyle = '#fff'; ctx.fillRect(170, 43, 60, 2); ctx.fillRect(199, 22, 2, 44); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(168, 20, 64, 2); ctx.fillRect(168, 66, 64, 2);
      ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 210, 176);
      const q = PETS[game.petKind || heroOf()] || PETS.wally; ctx.drawImage(q.img[0], 196, 188 + ((t >> 4) & 1));
      drawWally(180, 200, 'idle' + ((t >> 4) % 4), 1);
      drawWindow(8, 8, 150, 22); txt("DINO'S HOUSE", 83, 15, '#ffe040', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 172, 76); txt('*' + pad(game.coins, 2), 179, 76, '#3a2010', { shadow: null });
      const it = items(); drawWindow(8, 34, 150, 12 + it.length * 10);
      it.forEach((s, i) => { const y = 40 + i * 10; txt(s, 26, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); });
    },
  };
}
function MiniGamesScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['SLOT MACHINE (5 COINS)', 'MEMORY MATCH (10 COINS)', 'FISHING (3 COINS A CAST)', 'KART RACE (FREE)', 'BEAT TAPPER (3 COINS)', 'SNOWBALL FIGHT (3 COINS)', 'WHACK-A-GRUMBLE (3 COINS)', 'BACK'];
  const cost = [0, 0, 0, 0, 3, 3, 3];
  let sel = start, t = 0, msg = '';
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => HouseScene(2)); return; }
      if (Input.confirm()) { if (game.coins < cost[sel]) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); return; } game.coins -= cost[sel]; Audio8.sfx('confirm'); go([() => SlotScene(), () => MemoryScene(), () => FishScene(), () => KartScene(), () => TapperPick(), () => SnowballScene(), () => WhackScene()][sel]); }
    },
    draw() {
      drawParallax('carnival', t * 0.4);
      drawWindow(20, 40, 216, 130); txt('MINI-GAMES', 128, 46, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 62 + i * 12; txt(s, 40, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); });
      ctx.drawImage(Sprites.coinIcon, 100, 176); txt('*' + pad(game.coins, 2), 107, 176, '#fff', { outline: '#101848' }); if (msg) txt(msg, 128, 190, '#ff8080', { align: 'center', outline: '#101848' });
    },
  };
}
function ExtrasList(start) { // eslint-disable-line no-func-assign
  const items = [['LEVEL MAKER', () => LevelMakerScene(null)], ['MAKER WORLDS', () => MakerWorldScene()], ['MUSIC MAKER', () => MusicMakerScene()], ['COURSE WORLD', () => CourseWorldScene()], ['HERO MAKER', () => HeroMakerScene()], ['COMPLETION', () => CompletionScene()], ['TITLES', () => TitlesScene()],
    ['TROPHY ROOM', () => TrophyScene()], ['STICKER BOOK', () => StickerScene()], ['CARD ALBUM', () => CardScene()], ['BESTIARY', () => BestiaryScene()], ['PHOTO ALBUM', () => PhotoAlbumScene()], ['ART GALLERY', () => ArtScene()], ['JUKEBOX', () => JukeboxScene()],
    ['GALLERY', () => GalleryScene()], ['THEATRE', () => TheatreScene()], ['BOSS REMATCH', () => RematchScene()], ['REPLAYS', () => ReplaysScene()], ['GHOST RACES', () => GhostScene()], ['LEADERBOARDS', () => LeaderScene()], ['HELP BOOK', () => HelpScene()], ['UPDATES', () => UpdatesScene()], ['CREDITS', () => CreditsScene()],
    ['IMPORT SAVE', () => ImportSaveScene()], ['BACKUPS', () => BackupScene()], ['INSTALL APP', () => InstallScene()], ['OPTIONS', () => OptionsScene()], ['BACK', null]];
  let sel = typeof start === 'string' ? Math.max(0, items.findIndex((k) => k[0] === start)) : start, t = 0; const SHOW = 11;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && !items[sel][1])) { go(() => TitleScene()); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go(items[sel][1]); }
    },
    draw() {
      drawParallax('sky', t * 0.3); drawLogo(4); drawWindow(60, 78, 136, 134); txt('EXTRAS', 128, 83, '#ffe040', { align: 'center' });
      const top = clamp(sel - 5, 0, items.length - SHOW);
      for (let i = 0; i < SHOW; i++) { const k = top + i, y = Math.round(95 + i * 10); txt(items[k][0], 84, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 72 + ((t >> 3) & 1), y, '#ffe040'); }
      if (top > 0) txt('^', 186, 92, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 186, 196, '#a8b0d8');
      txt(`TROPHIES ${Ach.count()}/${ACH_LIST.length}`, 128, 215, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function ChallengeScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'ROGUELIKE TOWER', 'GOLDEN LEVELS', 'TUTORIAL', 'MIRROR MODE', 'PARTY MODE', 'SPEEDRUN', 'WEEKLY CHALLENGE', 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', 'RANDOM FLOORS, UPGRADES, ONE LIFE', 'HUNT 100 GOLD COINS PER LEVEL', 'LEARN ALL THE MOVES', 'EVERY LEVEL FLIPPED AROUND', 'UP TO 4 PLAYERS, 3 MINI-GAMES', 'ONE TIMER FOR THE WHOLE GAME', '3 LEVELS, 1 RULE, NEW EVERY WEEK', ''];
  const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone())), () => RogueIntro(), () => GoldScene(), () => startTutorial(false), () => MirrorScene(), () => PartyScene(), () => SpeedrunScene(), () => WeeklyScene()];
  let sel = Math.min(start, items.length - 1), t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => TitleScene()); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go(go_[sel]); }
    },
    draw() {
      drawParallax('castle', t * 0.4); drawLogo(2); drawWindow(48, 72, 160, 136); txt('CHALLENGES', 128, 77, '#ffe040', { align: 'center' });
      const SHOW = 12, top = clamp(sel - 6, 0, items.length - SHOW);
      for (let i = 0; i < SHOW; i++) { const k = top + i, y = 88 + i * 10; txt(items[k], 74, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); }
      if (top > 0) txt('^', 196, 86, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 196, 198, '#a8b0d8');
      txt(tips[sel], 128, 212, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// the help book gets a page for the new update
HELP_CH.push(['UPDATE 1.1', [
  [['STORM PEAKS: LIGHTNING RODS', 'POWER PLATFORMS FOR A FEW', 'SECONDS. UPDRAFTS LIFT YOU', 'TO HIGH LEDGES.'], 'jump'],
  [['SKATING: IN THE AIR PRESS', 'B TO SPIN, UP FOR A STAR', 'JUMP, S FOR AN AXEL. LAND', 'BEFORE THE MOVE ENDS!'], 'run'],
  [['UNDERWATER: WATCH YOUR AIR', 'METER. SWIM INTO BUBBLE', 'STREAMS TO REFILL IT. GRAB', 'PEARLS BEFORE CLAMS SNAP!'], 'item'],
  [['CO-OP BOSSES: IN BOSS', 'REMATCH PRESS S. BOTH PRESS', 'SPECIAL CLOSE TOGETHER FOR', 'A TEAM BLAST!'], 'throw'],
]]);

// the first title screen was built before these files loaded: rebuild it so the newest extras apply
if (typeof scene !== 'undefined' && scene && scene.isTitle) { scene = TitleScene(); if (scene.enter) scene.enter(); }
