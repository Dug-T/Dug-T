'use strict';
// =====================================================================
// Update 2.4: new places and rides
//  - WIZARD'S ACADEMY (18th island, from the Kitchen Kingdom): spell
//    books give you a spell to cast with S - FREEZE (water turns to ice
//    for a while), FLOAT (a magic platform under your feet, 3 charges)
//    and LIGHT (lights up the dark and shows hidden blocks) - then
//    ARCHMAGE ZORA, who teleports and casts
//  - TIME MACHINE ISLAND (19th island): every level has a past and a
//    future; press S to jump between them (a wall in the future can be a
//    doorway in the past) - then the CHRONO CLOCK boss
//  - two new rides in Wally Town: BMX TRAIL and HANG-GLIDER
// Levels 138-149.
// =====================================================================
const U24 = (() => {
  const PP = Play.prototype;
  const cnv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // ---------------- the arcane theme ----------------
  Sprites.addTheme('arcane', { top: ['#b090ff', '#6a4ac8', '#e0d0ff'], dirt: ['#3a2a6a', '#22184a', '#5a4a8a'], brick: ['#6a5ac8', '#3a2a88', '#a090f0'], solid: ['#8a8ab8', '#4a4a78', '#c8c8f0'], plank: ['#8a5a30', '#5a3a18', '#c08850'] });
  Sprites.bg.arcane = {
    sky: cnv(VW, VH, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0628'); g.addColorStop(0.6, '#2a1a5a'); g.addColorStop(1, '#5a3a8a'); x.fillStyle = g; x.fillRect(0, 0, w, h); }),
    layers: [
      { c: cnv(512, 224, (x) => { const r = rnd(4); for (let i = 0; i < 120; i++) { x.fillStyle = r() < 0.2 ? '#ffe8a0' : '#ffffff'; x.fillRect((r() * 512) | 0, (r() * 140) | 0, 1, 1); } for (const [mx, my, mr] of [[90, 40, 16], [330, 60, 9]]) { x.fillStyle = '#e8e0ff'; x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.fill(); } }), f: 0.03 },
      { c: cnv(512, 224, (x) => { const r = rnd(9); for (let i = 0; i < 6; i++) { const tx = 20 + i * 86 + r() * 20, h = 70 + r() * 60; x.fillStyle = '#2a1a50'; x.fillRect(tx, 224 - h, 22, h); x.beginPath(); x.moveTo(tx - 6, 224 - h); x.lineTo(tx + 11, 224 - h - 30); x.lineTo(tx + 28, 224 - h); x.fill(); x.fillStyle = '#ffd860'; for (let k = 0; k < 3; k++) x.fillRect(tx + 8, 224 - h + 14 + k * 18, 6, 8); } }), f: 0.15 },
      { c: cnv(512, 224, (x) => { const r = rnd(2); for (let i = 0; i < 9; i++) { const bx = r() * 500, by = 40 + r() * 100; x.fillStyle = ['#c04060', '#4080c0', '#40a060'][i % 3]; x.fillRect(bx, by, 14, 10); x.fillStyle = '#f0e8d0'; x.fillRect(bx + 1, by + 1, 12, 2); x.fillStyle = '#ffffff'; x.fillRect(bx - 4, by + 3, 4, 1); x.fillRect(bx + 14, by + 3, 4, 1); } }), f: 0.35, drift: 0.08 },
    ],
  };
  if (Audio8.addSong) Audio8.addSong('arcane', { bpm: 108, swing: 0.2, bass: 'walk', harm: 'arp', drums: 'k...h.s.k...h.s.', lead: 'p50', chords: 'Dm A Dm C Bb F Gm A', mel: 'D5/4 F5/2 A5/2 D6/4 C6/4 | C#5/4 E5/4 A5/8 | F5/4 A5/2 D6/2 F6/4 E6/4 | E5/4 G5/4 C6/8 | D6/4 Bb5/4 F5/8 | C6/4 A5/4 F5/8 | G5/4 Bb5/4 D6/4 G5/4 | A5/8 E5/8' });

  // ---------------- levels 138-149 ----------------
  const L = (o) => Object.assign({ music: o.theme }, o);
  const NEW = [
    L({ name: 'SPELLBOOK STEPS', theme: 'arcane', width: 180, wizard: true, spells: [[8, 9, 'float']], tag: 'WA1', world: "WIZARD'S ACADEMY 1", tip: 'THE FLOAT SPELL! IN THE AIR, PRESS S FOR A MAGIC PLATFORM.',
      build(b) { b.ground(0, 30).set(2, 11, '@').coins(14, 9, 4); b.ground(46, 70).set(56, 11, 'g').coins(48, 6, 5); b.ground(88, 112).set(98, 11, 'C').set(104, 11, 'p'); b.ground(130, 150).row(136, 8, 'WPW'); b.ground(166, 179).set(172, 11, 'G'); } }),
    L({ name: 'FROZEN MOAT', theme: 'arcane', width: 190, wizard: true, spells: [[8, 9, 'freeze']], tag: 'WA2', world: "WIZARD'S ACADEMY 2", tip: 'THE FREEZE SPELL! PRESS S TO TURN THE WATER TO ICE.',
      build(b) { b.ground(0, 24).set(2, 11, '@'); b.fill(25, 9, 52, 13, '~').set(36, 11, 'j').set(46, 12, 'j'); b.ground(53, 80).set(64, 11, 'g').set(72, 11, 'C'); b.fill(81, 8, 120, 13, '~').set(94, 10, 'j').set(108, 12, 'j').coins(96, 6, 6); b.ground(121, 150).set(132, 11, 'p'); b.fill(151, 9, 168, 13, '~').set(158, 11, 'j'); b.ground(169, 189).set(180, 11, 'G'); } }),
    L({ name: 'MIDNIGHT LIBRARY', theme: 'haunted', music: 'arcane', width: 180, wizard: true, dark: true, spells: [[8, 9, 'light']], tag: 'WA3', world: "WIZARD'S ACADEMY 3", tip: 'THE LIGHT SPELL! PRESS S TO LIGHT THE ROOM AND SHOW HIDDEN BLOCKS.',
      build(b) { b.ground(0, 179).set(2, 11, '@'); b.gap(30, 34).fill(31, 8, 33, 8, 'I'); b.gap(60, 66).fill(61, 9, 65, 9, 'I'); b.set(50, 11, 'g').set(80, 11, 'C').gap(96, 102).fill(97, 8, 101, 8, 'I').set(110, 11, 'e').gap(124, 130).fill(125, 9, 129, 9, 'I').coins(140, 9, 5).set(170, 11, 'G'); } }),
    L({ name: 'THE SPELL TOWER', theme: 'arcane', width: 200, wizard: true, spells: [[6, 9, 'float'], [66, 9, 'freeze'], [134, 9, 'light']], darkFrom: 140, tag: 'WA4', world: "WIZARD'S ACADEMY 4", tip: 'ALL THREE SPELLS! PICK UP A BOOK TO SWITCH SPELLS.',
      build(b) { b.ground(0, 20).set(2, 11, '@'); b.ground(38, 74).set(52, 11, 'g'); b.fill(75, 9, 100, 13, '~').set(88, 11, 'j'); b.ground(101, 150).set(110, 11, 'C').set(120, 11, 'p'); b.gap(156, 162).fill(157, 8, 161, 8, 'I'); b.ground(151, 155).ground(163, 199).set(190, 11, 'G'); } }),
    L({ name: 'ARCHMAGE ZORA', theme: 'arcane', width: 80, wizard: true, boss: true, bossHp: 10, bossName: 'ARCHMAGE ZORA', bossType: 'archmage', talk: 'archmage', tag: 'WA5', world: "WIZARD'S ACADEMY 5",
      bossMsg: ['ZORA LOWERS HER STAFF AND LAUGHS.', "'A STUDENT WHO BEATS THE TEACHER!'", '', 'SHE HANDS YOU A POCKET WATCH.', "'IT TICKS IN TWO TIMES AT ONCE.", "FIND THE ISLAND WHERE TIME BENDS.'"],
      build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 9, 4).set(74, 11, '*'); } }),
    L({ name: 'CLOCKWORK CROSSING', theme: 'jungle', width: 180, time: 260, timeLv: true, eras: ['jungle', 'neon'], tag: 'TM1', world: 'TIME MACHINE 1', tip: 'PRESS S TO JUMP BETWEEN THE PAST AND THE FUTURE!',
      future: [[30, 2, 31, 11, 'X'], [60, 12, 70, 13, '.'], [100, 2, 101, 11, '.'], [130, 12, 140, 13, '#']],
      build(b) { b.ground(0, 179).set(2, 11, '@').coins(10, 9, 4); b.fill(100, 2, 101, 11, 'X'); b.gap(130, 140); b.set(50, 11, 'g').set(84, 11, 'C').set(116, 11, 'p').coins(132, 6, 6).set(170, 11, 'G'); } }),
    L({ name: 'OVERGROWN RUINS', theme: 'jungle', width: 190, timeLv: true, eras: ['jungle', 'neon'], tag: 'TM2', world: 'TIME MACHINE 2', tip: 'IN THE PAST THE BRIDGES STAND. IN THE FUTURE THE TREES HAVE GROWN.',
      future: [[24, 12, 34, 13, '.'], [24, 9, 34, 9, '.'], [60, 6, 61, 11, '#'], [62, 10, 70, 10, '='], [96, 12, 108, 13, '#'], [140, 2, 141, 11, 'X']],
      build(b) { b.ground(0, 190).set(2, 11, '@'); b.fill(24, 9, 34, 9, '='); b.gap(96, 108); b.fill(62, 4, 70, 4, 'X'); b.set(46, 11, 'g').set(80, 11, 'C').set(120, 11, 'h').coins(64, 8, 5).set(150, 11, 'p').set(180, 11, 'G'); } }),
    L({ name: 'NEON TOMORROW', theme: 'neon', width: 190, timeLv: true, eras: ['jungle', 'neon'], startFuture: true, tag: 'TM3', world: 'TIME MACHINE 3', tip: 'THIS TIME YOU START IN THE FUTURE. THE PAST HIDES THE WAY ON.',
      future: [[40, 2, 41, 11, 'X'], [80, 12, 92, 13, '.'], [120, 2, 121, 11, 'X'], [150, 12, 160, 13, '.']],
      build(b) { b.ground(0, 189).set(2, 11, '@'); b.fill(66, 6, 74, 6, '=').coins(66, 4, 9); b.set(30, 11, 'g').set(100, 11, 'C').set(108, 11, 'c').set(140, 11, 'p').set(180, 11, 'G'); } }),
    L({ name: 'THE TIME STORM', theme: 'jungle', width: 200, timeLv: true, eras: ['jungle', 'neon'], timeStorm: 300, tag: 'TM4', world: 'TIME MACHINE 4', tip: 'THE STORM SWAPS TIME BY ITSELF TOO - WATCH THE CLOCK!',
      future: [[30, 12, 40, 13, '.'], [60, 2, 61, 11, 'X'], [90, 12, 100, 13, '#'], [130, 2, 131, 11, '.'], [160, 12, 168, 13, '.']],
      build(b) { b.ground(0, 199).set(2, 11, '@'); b.gap(90, 100); b.fill(130, 2, 131, 11, 'X'); b.set(50, 11, 'g').set(110, 11, 'C').set(120, 11, 'h').set(150, 11, 'p').coins(160, 7, 8).set(190, 11, 'G'); } }),
    L({ name: 'THE CHRONO CLOCK', theme: 'jungle', width: 80, timeLv: true, eras: ['jungle', 'neon'], future: [], boss: true, bossHp: 10, bossName: 'THE CHRONO CLOCK', bossType: 'chrono', talk: 'chrono', tag: 'TM5', world: 'TIME MACHINE 5',
      bossMsg: ['THE CHRONO CLOCK WINDS DOWN...', 'TICK... TICK... TOCK.', '', 'PAST AND FUTURE SETTLE INTO', 'ONE. TIME IS SAFE AGAIN!'],
      build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 9, 4).set(74, 11, '*'); } }),
    L({ name: 'BMX TRAIL', theme: 'desert', width: 260, board: true, bmx: true, noAuto: true, tag: 'RIDE7', world: 'WALLY TOWN RIDES', tip: 'A TO BUNNY-HOP, RAMPS FOR AIR, B IN THE AIR FOR TRICKS!',
      build(b) { b.ground(0, 259).set(2, 11, '@'); for (let x = 22; x < 240; x += 26) b.set(x, 11, '/').coins(x + 2, 6, 3); for (const x of [36, 88, 140, 192]) b.fill(x, 11, x, 11, 'X'); for (const x of [60, 112, 164, 216]) b.fill(x, 8, x + 6, 8, '='); b.set(250, 11, 'G'); } }),
    L({ name: 'HANG-GLIDER', theme: 'sky', width: 280, glider: true, noAuto: true, thermals: [[30, 36], [70, 76], [112, 118], [150, 156], [190, 196], [232, 238]], storms: [[90, 4], [130, 9], [170, 3], [210, 8], [250, 5]], tag: 'RIDE8', world: 'WALLY TOWN RIDES', tip: 'UP CLIMBS, DOWN DIVES. RIDE THE WARM AIR AND DODGE THE STORMS!',
      build(b) { b.ground(0, 16, 5).set(2, 4, '@'); for (let x = 24, k = 0; x < 260; x += 18, k++) b.coins(x, 4 + (k % 5), 3); for (const [x, y] of [[50, 6], [100, 3], [160, 8], [220, 5]]) b.set(x, y, 'z'); b.ground(262, 279, 9).set(272, 8, 'G'); } }),
  ];
  const BASE = LEVELS.length; // 138
  NEW.forEach((d) => LEVELS.push(d));
  const LI = { wizard: [BASE, BASE + 1, BASE + 2, BASE + 3, BASE + 4], time: [BASE + 5, BASE + 6, BASE + 7, BASE + 8, BASE + 9], bmx: BASE + 10, glider: BASE + 11 };

  // ---------------- islands ----------------
  const mk = (nodes, edges, blobs, seed, paint, name, sea, key) => { const isl = makeIsland(nodes, blobs, seed, paint); WORLDS.push({ nodes: () => nodes, edges: () => edges, isle: () => isl, name, sea, key }); return WORLDS.length - 1; };
  { const W15 = WORLDS[15], n = W15.nodes(); n.push({ x: 96, y: 108, kind: 'portal', to: 17, name: "BROOMSTICK TO WIZARD'S ACADEMY" }); W15.edges().push([6, n.length - 1]); }
  const lvN = (lis, pts) => lis.map((li, i) => ({ x: pts[i][0], y: pts[i][1], kind: i === lis.length - 1 ? 'castle' : 'level', li }));
  const N17 = [{ x: 24, y: 186, kind: 'portal', to: 15, name: 'BROOMSTICK TO THE KITCHEN' }, ...lvN(LI.wizard, [[70, 160], [118, 172], [168, 156], [196, 112], [130, 84]]), { x: 236, y: 196, kind: 'portal', to: 18, name: 'POCKET WATCH TO TIME MACHINE' }];
  mk(N17, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]], [[100, 150, 30], [150, 130, 28], [130, 100, 24]], 1818, (f, near, ch, r) => {
    if (f > 2.3) return near(5, 28) ? (ch ? [150, 110, 220] : [170, 130, 240]) : (r() < 0.05 ? [255, 230, 140] : ch ? [90, 70, 160] : [104, 84, 176]);
    if (f > 1.6) return ch ? [70, 54, 130] : [84, 66, 146]; if (f > 1.25) return ch ? [190, 180, 230] : [206, 196, 244]; return null;
  }, "WIZARD'S ACADEMY", ['#0a0628', '#160c3a'], 'node18');
  const N18 = [{ x: 24, y: 186, kind: 'portal', to: 17, name: "POCKET WATCH TO THE ACADEMY" }, ...lvN(LI.time, [[70, 160], [118, 172], [168, 156], [196, 112], [130, 84]])];
  mk(N18, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], [[100, 150, 30], [150, 130, 28], [130, 100, 24]], 1919, (f, near, ch, r) => {
    if (f > 2.3) return near(5, 28) ? (ch ? [220, 200, 120] : [240, 220, 140]) : (r() < 0.5 ? (ch ? [90, 160, 70] : [104, 176, 84]) : (ch ? [70, 170, 200] : [84, 190, 220]));
    if (f > 1.6) return ch ? [70, 130, 90] : [84, 146, 104]; if (f > 1.25) return ch ? [210, 200, 160] : [226, 216, 176]; return null;
  }, 'TIME MACHINE ISLAND', ['#103040', '#18405a'], 'node19');
  if (typeof RIDES !== 'undefined') RIDES.push(LI.bmx, LI.glider);

  // ---------------- spells ----------------
  const SPELL = { float: ['FLOAT', '#80e0ff'], freeze: ['FREEZE', '#c0f0ff'], light: ['LIGHT', '#ffe080'] };
  { const _en = PP.enter;
    PP.enter = function () {
      const r = _en.apply(this, arguments);
      if (this.def.wizard || this.def.timeLv) this.def = Object.assign({}, this.def); // this level's own copy (spells and time change it)
      if (this.def.wizard && this.def.spells) for (const [x, y, kind] of this.def.spells) this.ents.push({ type: 'spellbook', kind, alive: true, item: true, t: 0, x: x * TS + 2, y: y * TS, w: 12, h: 14 });
      if (this.def.timeLv) { // build the future from the past
        const past = this.lv.grid, fut = past.map((row) => row.slice()); for (const [x0, y0, x1, y1, c] of this.def.future || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (fut[y] && x < fut[y].length) fut[y][x] = c;
        this.eras = [past, fut]; this.era = 0; if (this.def.startFuture) this.setEra(1, true);
      }
      return r;
    };
  }
  PP.setEra = function (k, quiet) {
    const p = this.p, prev = this.era; this.era = k; this.lv.grid = this.eras[k]; this.def.theme = this.def.eras[k]; this.T = Sprites.tiles[this.def.theme] || this.T;
    if (!quiet && this.solidOverlap(p)) { this.era = prev; this.lv.grid = this.eras[prev]; this.def.theme = this.def.eras[prev]; this.T = Sprites.tiles[this.def.theme] || this.T; Audio8.sfx('bump'); this.parts.push({ k: 'text', s: 'BLOCKED!', x: p.x - 14, y: p.y - 14, vy: -0.4, life: 30 }); return false; }
    if (!quiet) { Audio8.sfx('secret'); this.eraFlash = 14; this.parts.push({ k: 'text', s: k ? 'THE FUTURE!' : 'THE PAST!', x: p.x - 20, y: p.y - 16, vy: -0.4, life: 40 }); }
    return true;
  };
  { const _up = PP.updatePlayer;
    PP.updatePlayer = function () {
      const p = this.p, Pr = Input.pressed, D = Input.down;
      const castS = (this.def.wizard || this.def.timeLv) && this.state === 'play' && Pr('special');
      if (this.def.wizard || this.def.timeLv) Input.pressed = (k) => (k === 'special' ? false : Pr(k));
      if ((this.def.bmx || this.def.glider) && this.state === 'play') { Input.down = (k) => (k === 'right' || k === 'run' ? true : k === 'left' ? false : D(k)); }
      let vy0 = p.vy;
      try { _up.apply(this, arguments); } finally { Input.pressed = Pr; Input.down = D; }
      if (this.state !== 'play') return;
      if (castS && this.def.wizard) this.cast();
      if (castS && this.def.timeLv && !(this.eraCool > 0)) { if (this.setEra(this.era ? 0 : 1)) this.eraCool = 30; }
      if (this.eraCool > 0) this.eraCool--;
      if (this.def.timeStorm && this.def.timeLv && this.stateT % this.def.timeStorm === this.def.timeStorm - 1) this.setEra(this.era ? 0 : 1);
      if (this.def.glider && !p.onGround) { // the hang-glider: steady forward speed, gentle sink, warm air lifts you
        p.vx = 2.1; const inThermal = (this.def.thermals || []).some(([a, b]) => p.x / TS >= a && p.x / TS <= b);
        p.vy = Math.min(p.vy, 0.7); if (D('up')) p.vy = Math.max(p.vy - 0.12, -1.6); if (D('down')) p.vy = Math.min(p.vy + 0.3, 3); if (inThermal) p.vy = Math.max(p.vy - 0.32, -2.4);
        if (p.y < 6) { p.y = 6; p.vy = Math.max(p.vy, 0); }
        for (const [sx, sy] of this.def.storms || []) { const cx = sx * TS + 16, cy = sy * TS + 8; if (Math.abs(p.x + p.w / 2 - cx) < 18 && Math.abs(p.y + p.h / 2 - cy) < 12 && ((frame >> 4) & 3) === 0) this.hurt(); }
      }
      if (this.def.bmx && p.onGround && vy0 > 3 && p.spinT === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + p.h, vx: 0, vy: -0.3, life: 12 });
      if (this.frozen) { if (--this.frozen.t <= 0) { for (const [x, y] of this.frozen.cells) if (this.tile(x, y) === 'X') this.setTile(x, y, '~'); this.frozen = null; Audio8.sfx('swim'); } }
      if (this.floats) this.floats = this.floats.filter((f) => { if (--f.t > 0) return true; for (let x = f.x; x < f.x + 3; x++) if (this.tile(x, f.y) === '=') this.setTile(x, f.y, '.'); return false; });
      if (this.lightT > 0 && --this.lightT === 0) this.def.dark = this.baseDark;
    };
  }
  PP.cast = function () {
    const p = this.p, s = p.spell;
    if (!s) { Audio8.sfx('bump'); this.parts.push({ k: 'text', s: 'FIND A SPELL BOOK', x: p.x - 30, y: p.y - 14, vy: -0.4, life: 40 }); return; }
    if (s === 'float') { if (p.onGround || (p.spellN || 0) <= 0) { Audio8.sfx('bump'); return; } const x = Math.floor((p.x + p.w / 2) / TS) - 1, y = Math.floor((p.y + p.h) / TS) + 1; if (y > 12) return; let ok = 0; for (let k = 0; k < 3; k++) if (this.tile(x + k, y) === '.') { this.setTile(x + k, y, '='); ok++; } if (ok) { p.spellN--; (this.floats = this.floats || []).push({ x, y, t: 240 }); Audio8.sfx('signal'); } }
    if (s === 'freeze') { if (this.frozen) return; const cells = [], cx = Math.floor((p.x + p.w / 2) / TS); for (let x = cx - 12; x <= cx + 12; x++) for (let y = 0; y < 14; y++) if (this.tile(x, y) === '~') { this.setTile(x, y, 'X'); cells.push([x, y]); } for (const e of this.ents) if (e.type === 'jelly' && e.alive && cells.some(([x, y]) => Math.abs(e.x / TS - x) < 1.2 && Math.abs(e.y / TS - y) < 1.2)) e.alive = false; this.frozen = { cells, t: 480 }; Audio8.sfx('power'); this.shake = 4; }
    if (s === 'light') { if (this.lightT > 0) return; this.baseDark = this.baseDark === undefined ? this.def.dark : this.baseDark; this.def.dark = false; this.lightT = 600; Audio8.sfx('power'); const cx = Math.floor((p.x + p.w / 2) / TS); for (let x = cx - 16; x <= cx + 16; x++) for (let y = 0; y < 14; y++) if (this.tile(x, y) === 'I') this.setTile(x, y, 'U'); } // hidden blocks become real blocks
    this.parts.push({ k: 'text', s: SPELL[s][0] + '!', x: p.x - 10, y: p.y - 18, vy: -0.5, life: 30 });
  };
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type === 'spellbook') { e.t++; if (this.state === 'play' && overlap(this.p, e)) { e.alive = false; this.p.spell = e.kind; this.p.spellN = 3; Audio8.sfx('power'); this.spellMsg = 160; } return; }
      if (e.type === 'archmage') return this.updateArchmage(e);
      if (e.type === 'chrono') return this.updateChrono(e);
      if (e.type === 'mbolt') { e.t++; e.x += e.vx; e.y += e.vy; if (e.t > 300 || e.y > VH + 20) e.alive = false; if (this.state === 'play' && overlap(this.p, e) && !e.reflected) { this.hurt(); if (!e.reflected) e.alive = false; } return; }
      return _ue.call(this, e);
    };
  }
  // the dark library: light the room, show hidden blocks; the tower's top floor is dark
  { const _u = PP.update; PP.update = function () { if (this.def.darkFrom && this.state === 'play' && !(this.lightT > 0)) this.def.dark = this.p.x > this.def.darkFrom * TS; return _u.apply(this, arguments); }; }

  // ---------------- bosses ----------------
  const locked = (pl) => !pl.bossLock || pl.talk || pl._p2ctx;
  PP.updateArchmage = function (e) { // teleports between three spots, casts, then is dizzy on the ground: stomp her
    const p = this.p; if (e.inv > 0) e.inv--; if (locked(this)) return;
    e.t++; const rage = e.maxHp - e.hp, slow = this.freezeT > 0, floor = 12 * TS - e.h, spots = [this.camMin + 30, this.camMin + VW / 2 - 12, this.camMin + VW - 54];
    if (!slow && --e.act <= 0) { const o = ['float', 'cast', 'blink', 'cast2', 'dizzy']; e.state = o[(o.indexOf(e.state) + 1) % o.length]; e.act = { float: 70, cast: 60, blink: 24, cast2: 60, dizzy: 100 - rage * 5 }[e.state];
      if (e.state === 'blink') { e.x = spots[(Math.floor(Math.random() * 3) + (e.t % 2)) % 3]; Audio8.sfx('secret'); for (let k = 0; k < 6; k++) this.parts.push({ k: 'spark', x: e.x + 12, y: e.y + 10 + k * 2, life: 12 }); } }
    if (e.state === 'float' || e.state === 'blink') e.y += (50 + Math.sin(e.t * 0.06) * 10 - e.y) * 0.1;
    if ((e.state === 'cast' || e.state === 'cast2') && !slow) { e.y += (44 - e.y) * 0.1; if (e.act % (rage > 4 ? 14 : 20) === 0) { const a = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - 0.5) * 0.4; this.ents.push({ type: 'mbolt', alive: true, t: 0, x: e.x + 12, y: e.y + 12, w: 8, h: 8, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2 }); Audio8.sfx('zap'); } }
    if (e.state === 'dizzy') e.y += (floor - e.y) * 0.2;
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'dizzy' && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -6.6; this.damageBoss(e); if (e.alive) { e.state = 'float'; e.act = 40; } return; }
    if (e.state !== 'dizzy' && !slow) this.hurt();
  };
  PP.updateChrono = function (e) { // in the future it fires lasers; in the past its gears are open: stomp it then
    const p = this.p; if (e.inv > 0) e.inv--; if (locked(this)) return;
    e.t++; const rage = e.maxHp - e.hp, slow = this.freezeT > 0, floor = 12 * TS - e.h;
    if (!slow && e.t % Math.max(240, 360 - rage * 12) === 0) this.setEra(this.era ? 0 : 1, true), this.eraFlash = 14, Audio8.sfx('secret');
    e.y = floor; e.x += (this.camMin + VW / 2 - 18 + Math.sin(e.t * 0.02) * 70 - e.x) * 0.04;
    if (this.era === 1 && !slow && e.t % Math.max(30, 60 - rage * 3) === 0) { for (const d of [-1, 1]) this.ents.push({ type: 'mbolt', alive: true, t: 0, x: e.x + 18, y: e.y + 10, w: 8, h: 8, vx: d * 2.6, vy: 0 }); Audio8.sfx('laser'); }
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (this.era === 0 && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -6.8; this.damageBoss(e); return; }
    if (!slow) this.hurt();
  };
  const MINE = ['archmage', 'chrono'];
  { const _sp = PP.spawn;
    PP.spawn = function (sp) {
      const bt = this.def.bossType;
      if (sp.t === '*' && MINE.includes(bt)) { const hp = (this.def.bossHp || 8) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0) + (game.plus && !this.rush ? 2 * game.plus : 0), sz = { archmage: [24, 30], chrono: [36, 36] }[bt];
        this.ents.push({ type: bt, boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS - 60, y: bt === 'chrono' ? 12 * TS - sz[1] : 50, w: sz[0], h: sz[1], hp, maxHp: hp, inv: 0, state: 'float', act: 90 }); return; }
      return _sp.call(this, sp);
    };
  }
  { const _db = PP.damageBoss; PP.damageBoss = function (e) { const sa = Sticker.add, mine = MINE.includes(e.type); if (mine) Sticker.add = () => {}; try { return _db.call(this, e); } finally { Sticker.add = sa; } }; }
  function drawArchmage(x, y, e, t) {
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const dz = e && e.state === 'dizzy', casting = e && (e.state === 'cast' || e.state === 'cast2');
    ctx.fillStyle = '#3a1a7a'; ctx.beginPath(); ctx.moveTo(x + 2, y + 30); ctx.lineTo(x + 12, y + 8); ctx.lineTo(x + 22, y + 30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffd860'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + 8 + k * 4, y + 18 + (k % 2) * 6, 1, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f2c8a8'; ctx.beginPath(); ctx.arc(x + 12, y + 8, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.moveTo(x + 8, y + 10); ctx.quadraticCurveTo(x + 12, y + 20, x + 16, y + 10); ctx.fill();
    ctx.fillStyle = '#3a1a7a'; ctx.beginPath(); ctx.moveTo(x + 4, y + 5); ctx.lineTo(x + 14, y - 12); ctx.lineTo(x + 20, y + 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd860'; ctx.fillRect(x + 4, y + 3, 16, 2);
    ctx.fillStyle = '#1a1020'; if (dz) { ctx.fillRect(x + 9, y + 7, 2, 1); ctx.fillRect(x + 13, y + 7, 2, 1); } else { ctx.fillRect(x + 9, y + 6, 1.6, 2); ctx.fillRect(x + 13, y + 6, 1.6, 2); }
    ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 22, y + 30); ctx.lineTo(x + 24, y + 4); ctx.stroke();
    const g = ctx.createRadialGradient(x + 24, y + 3, 0, x + 24, y + 3, casting ? 8 : 4); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(160,120,255,0)'); ctx.fillStyle = g; ctx.fillRect(x + 14, y - 7, 20, 20);
    if (dz) for (let k = 0; k < 3; k++) { const a = frame * 0.15 + k * 2.1; txt('*', Math.round(x + 10 + Math.cos(a) * 9), Math.round(y - 18 + Math.sin(a) * 3), '#ffe040'); }
  }
  function drawChrono(x, y, e, t, era) {
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const cx = x + 18, cy = y + 16, past = era === 0;
    ctx.fillStyle = past ? '#8a6a3a' : '#2a3a5a'; ctx.fillRect(x + 4, y + 24, 28, 12); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1; ctx.strokeRect(x + 4, y + 24, 28, 12);
    ctx.fillStyle = past ? '#d8b070' : '#5ff0ff'; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = past ? '#fff4d8' : '#102030'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = past ? '#1a1020' : '#5ff0ff'; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); ctx.lineTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11); ctx.stroke(); }
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t * 0.08) * 9, cy + Math.sin(t * 0.08) * 9); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t * 0.01) * 6, cy + Math.sin(t * 0.01) * 6); ctx.stroke();
    if (past) { ctx.fillStyle = '#c09020'; for (const gx of [x + 8, x + 28]) { ctx.beginPath(); ctx.arc(gx, y + 30, 4, 0, Math.PI * 2); ctx.fill(); } txt('!', cx, y - 12, '#ffe040', { align: 'center', outline: '#1a1020' }); }
    else { ctx.fillStyle = '#ff3040'; ctx.fillRect(x + 2, y + 27, 4, 3); ctx.fillRect(x + 30, y + 27, 4, 3); }
  }
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) {
      const x = Math.round(e.x - cx), y = Math.round(e.y);
      if (e.type === 'spellbook') { const b = Math.sin(e.t * 0.1) * 1.5, c = SPELL[e.kind][1]; const g = ctx.createRadialGradient(x + 6, y + 6, 0, x + 6, y + 6, 12); g.addColorStop(0, 'rgba(255,255,220,0.5)'); g.addColorStop(1, 'rgba(255,255,220,0)'); ctx.fillStyle = g; ctx.fillRect(x - 6, y - 6, 24, 24); ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y + 2 + b, 13, 11); ctx.fillStyle = c; ctx.fillRect(x + 1, y + 3 + b, 11, 9); ctx.fillStyle = '#f0e8d0'; ctx.fillRect(x + 2, y + 4 + b, 1, 7); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 6, y + 6 + b, 4, 1); ctx.fillRect(x + 6, y + 8 + b, 3, 1); return; }
      if (e.type === 'archmage') { if (!e.dying) drawArchmage(x, y, e, frame); return; }
      if (e.type === 'chrono') { if (!e.dying) drawChrono(x, y, e, frame, this.era); return; }
      if (e.type === 'mbolt') { const g = ctx.createRadialGradient(x + 4, y + 4, 0, x + 4, y + 4, 7); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#c080ff'); g.addColorStop(1, 'rgba(120,60,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 3, y - 3, 14, 14); return; }
      return _de.call(this, e, cx);
    };
  }
  { const _dt = PP.drawTiles;
    PP.drawTiles = function (cx) {
      const r = _dt.call(this, cx);
      if (this.frozen) for (const [x, y] of this.frozen.cells) if (this.tile(x, y) === 'X') { const X = x * TS - cx; if (X < -16 || X > VW) continue; ctx.fillStyle = '#c0f0ff'; ctx.fillRect(X, y * TS, 16, 16); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(X + 2, y * TS + 2, 5, 1); ctx.fillRect(X + 9, y * TS + 8, 4, 1); ctx.fillStyle = 'rgba(80,160,220,0.5)'; ctx.fillRect(X, y * TS + 15, 16, 1); }
      if (this.floats) for (const f of this.floats) for (let k = 0; k < 3; k++) { const X = (f.x + k) * TS - cx, Y = f.y * TS; ctx.fillStyle = `rgba(128,224,255,${(0.5 + 0.3 * Math.sin(frame * 0.2 + k)).toFixed(2)})`; ctx.fillRect(X, Y, 16, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 3 + k * 3, Y + 1, 2, 2); }
      if (this.lightT > 0 || (this.def.wizard && this.p.spell === 'light' && this.lightT > 0)) { const tx0 = Math.floor(cx / TS); for (let tx = tx0; tx <= tx0 + 16; tx++) for (let ty = 0; ty < 14; ty++) if (this.tile(tx, ty) === 'I') { ctx.strokeStyle = 'rgba(255,224,128,0.9)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.strokeRect(tx * TS - cx + 0.5, ty * TS + 0.5, 15, 15); ctx.setLineDash([]); } }
      if (this.def.glider) { for (const [a, b] of this.def.thermals || []) { const X = a * TS - cx, W = (b - a + 1) * TS; if (X > VW || X + W < 0) continue; for (let k = 0; k < 5; k++) { ctx.strokeStyle = 'rgba(255,200,120,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let yy = VH; yy > 0; yy -= 8) ctx.lineTo(X + W / 2 + (k - 2) * 12 + Math.sin(yy * 0.05 + frame * 0.1 + k) * 4, yy); ctx.stroke(); } }
        for (const [sx, sy] of this.def.storms || []) { const X = sx * TS - cx + 16, Y = sy * TS + 8; if (X < -40 || X > VW + 40) continue; ctx.fillStyle = '#4a4a5a'; for (const [ox, oy, r] of [[0, 0, 12], [12, 3, 9], [-11, 3, 8]]) { ctx.beginPath(); ctx.arc(X + ox, Y + oy, r, 0, Math.PI * 2); ctx.fill(); } if (((frame >> 4) & 3) === 0) { ctx.strokeStyle = '#ffe040'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X, Y + 8); ctx.lineTo(X - 4, Y + 18); ctx.lineTo(X + 2, Y + 18); ctx.lineTo(X - 3, Y + 30); ctx.stroke(); } } }
      return r;
    };
  }
  { const _dp = PP.drawPlayer;
    PP.drawPlayer = function (cx) {
      const p = this.p, x = Math.round(p.x + p.w / 2 - cx), y = Math.round(p.y);
      if (this.def.glider && !p.onGround) { ctx.fillStyle = '#e83850'; ctx.beginPath(); ctx.moveTo(x - 20, y - 4); ctx.lineTo(x + 18, y - 8); ctx.lineTo(x + 2, y - 14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1; ctx.stroke(); ctx.strokeStyle = '#ffe040'; ctx.beginPath(); ctx.moveTo(x - 10, y - 6); ctx.lineTo(x + 8, y - 9); ctx.stroke(); ctx.strokeStyle = '#3a3a48'; ctx.beginPath(); ctx.moveTo(x - 4, y - 6); ctx.lineTo(x, y + 6); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x + 2, y + 6); ctx.stroke(); }
      if (this.def.bmx) { const b = this.def.board; this.def.board = false; let r; try { r = _dp.call(this, cx); } finally { this.def.board = b; } if (!p.riding) { const fy = Math.round(p.y + p.h) + 1, tilt = p.spinT > 0 ? Math.sin(p.spinT * 0.8) * 0.6 : 0; ctx.save(); ctx.translate(x, fy - 4); ctx.rotate(tilt); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1.6; for (const wx of [-8, 8]) { ctx.beginPath(); ctx.arc(wx, 0, 4.5, 0, Math.PI * 2); ctx.stroke(); } ctx.strokeStyle = '#e83850'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-2, -5); ctx.lineTo(6, -5); ctx.lineTo(8, 0); ctx.moveTo(-2, -5); ctx.lineTo(0, 0); ctx.lineTo(-8, 0); ctx.moveTo(6, -5); ctx.lineTo(7, -9); ctx.stroke(); ctx.restore(); } return r; }
      return _dp.call(this, cx);
    };
  }
  { const _hud = PP.drawHUD;
    PP.drawHUD = function () {
      if (this.def.timeLv) { ctx.fillStyle = this.era ? 'rgba(40,200,255,0.10)' : 'rgba(170,120,40,0.16)'; ctx.fillRect(0, 0, VW, VH); if (this.eraFlash > 0) { this.eraFlash--; ctx.fillStyle = `rgba(255,255,255,${(this.eraFlash / 20).toFixed(2)})`; ctx.fillRect(0, 0, VW, VH); } }
      const r = _hud.apply(this, arguments), p = this.p;
      if (this.def.timeLv) { txt(this.era ? 'FUTURE' : 'PAST', 250, 30, this.era ? '#5ff0ff' : '#ffc060', { align: 'right', outline: '#101848' }); if (this.def.timeStorm) { const left = this.def.timeStorm - (this.stateT % this.def.timeStorm); txt(`STORM ${Math.ceil(left / 60)}`, 250, 40, '#ff8080', { align: 'right', outline: '#101848' }); } }
      if (this.def.wizard && p.spell) { const s = SPELL[p.spell]; txt(`S: ${s[0]}${p.spell === 'float' ? ' x' + (p.spellN || 0) : ''}`, 250, 30, s[1], { align: 'right', outline: '#101848' }); }
      if (this.spellMsg > 0 && p.spell) { this.spellMsg--; const m = { float: 'IN THE AIR, PRESS S FOR A PLATFORM', freeze: 'PRESS S TO FREEZE THE WATER', light: 'PRESS S TO LIGHT THE DARK' }[p.spell]; drawWindow(24, 60, 208, 30); txt(SPELL[p.spell][0] + ' SPELL!', 128, 66, SPELL[p.spell][1], { align: 'center' }); txt(m, 128, 78, '#fff', { align: 'center' }); }
      if (this.stateT < 180 && this.state === 'play' && this.def.tip && NEW.includes(LEVELS[this.li])) { const w = this.def.tip.split(' '), l1 = []; while (w.length && (l1.join(' ') + ' ' + w[0]).length <= 36) l1.push(w.shift()); drawWindow(12, 184, 232, 30); txt(l1.join(' '), 128, 190, '#fff', { align: 'center' }); txt(w.join(' '), 128, 201, '#fff', { align: 'center' }); }
      return r;
    };
  }
  if (typeof BOSS_TALK !== 'undefined') Object.assign(BOSS_TALK, {
    archmage: [['boss', 'CLASS IS IN SESSION! TODAY: DODGING. TOMORROW: ALSO DODGING.'], ['hero', 'I DID MY HOMEWORK. LET\'S GO!']],
    chrono: [['boss', 'TICK. YOU ARE LATE. TOCK. YOU ARE EARLY. EITHER WAY... YOU LOSE.'], ['hero', 'THEN I\'LL BE RIGHT ON TIME!']],
  });
  if (typeof BOSS_NAMES !== 'undefined') Object.assign(BOSS_NAMES, { archmage: 'ARCHMAGE ZORA', chrono: 'THE CHRONO CLOCK' });
  if (typeof BOSS_ART !== 'undefined') Object.assign(BOSS_ART, { archmage: 'archmage', chrono: 'chrono' });
  if (typeof stickerArt === 'function') { const _sa = stickerArt; stickerArt = function (id, x, y, t) { if (id === 'archmage') { ctx.save(); ctx.translate(x, y); ctx.scale(0.6, 0.6); drawArchmage(-12, -16, null, t); ctx.restore(); return; } if (id === 'chrono') { ctx.save(); ctx.translate(x, y); ctx.scale(0.5, 0.5); drawChrono(-18, -18, null, t, (t >> 6) & 1); ctx.restore(); return; } return _sa(id, x, y, t); }; } // eslint-disable-line no-func-assign
  return { LI, NEW, SPELL, drawArchmage, drawChrono };
})();
UPDATES.unshift(['2.4', ["NEW ISLAND: WIZARD'S ACADEMY", ' SPELLS: FLOAT, FREEZE, LIGHT', ' BOSS: ARCHMAGE ZORA', 'NEW ISLAND: TIME MACHINE', ' S SWAPS PAST AND FUTURE', ' BOSS: THE CHRONO CLOCK', 'NEW RIDES: BMX TRAIL, HANG-GLIDER']]);
