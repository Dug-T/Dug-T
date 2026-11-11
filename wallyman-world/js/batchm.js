'use strict';
// =====================================================================
// Update 1.2 (part 1): tornadoes and earthquakes, the jetpack and the
// time-stop clock, stealth levels with searchlight guards, Ninja Nell,
// and the Clockwork Kingdom (gear wheels, rewind switches, pendulums
// and the Clockmaker).
// =====================================================================
ACH_LIST.push(['jetpack', 'ROCKET MAN', 'FLY WITH A JETPACK'], ['timestop', 'TIME OUT', 'STOP TIME WITH A CLOCK'], ['unseen', 'NEVER SEEN', 'FINISH A STEALTH LEVEL WITH NO ALARM'],
  ['clockmaker', "TIME'S UP", 'BEAT THE CLOCKMAKER'], ['twister', 'TWISTER', 'GET THROWN BY A TORNADO'], ['ninjadash', 'SHADOW DASH', 'DASH THROUGH 10 ENEMIES AS NINJA NELL']);
Object.assign(BOSS_TALK, { clockmaker: [['boss', 'TICK... TOCK... YOU ARE LATE, HERO. AND LATE IS... OVER!'], ['hero', "THEN IT'S TIME TO WIND YOU DOWN!"]] });
Object.assign(BOSS_ART, { clockmaker: 'clockmaker' }); Object.assign(BOSS_NAMES, { clockmaker: 'THE CLOCKMAKER' });
BEASTS.push(['clockmaker', 'THE CLOCKMAKER', 'b'], ['guard', 'VAULT GUARD', 'e']);
Object.assign(BEAST_INFO, { clockmaker: 'RULER OF THE CLOCKWORK KINGDOM. WHEN HE LANDS TO WIND HIS KEY, STOMP HIM.', guard: 'SWEEPS A SEARCHLIGHT. IF IT SPOTS YOU, THE ALARM SENDS MORE FOES.' });
SOLID.add('Ж');

// ---------------- Ninja Nell ----------------
Object.assign(HEROES, { ninja: { name: 'NINJA NELL', alt: 'NINJA NELL', short: 'NELL', color: '#c02030', secret: true, hint: ['BEAT', 'WALLY ISLAND'], ok: () => anySlot((s) => s.cleared[7]), lines: ['SECRET HERO! HOLD UP AGAINST', 'A WALL TO CLIMB IT. HIDDEN', 'WHEN CROUCHING. S: DASH!'] } });
HERO_IDS.push('ninja');
{ const img = Sprites.fromRows(['..K......K..', '.KrK....KrK.', '.KrrKKKKrrK.', '.KrrrrrrrrK.', 'KrwKrrrrKwrK', 'KrrrrKKrrrrK', '.KrwwwwwwrK.', '..KrrrrrrK..', '..KrK..KrK..', '..KK....KK..'], { K: '#1a1020', r: '#e06020', w: '#fff0e0' }); PETS.ninja = { name: 'FOX', rows: [], pal: {}, fly: false, img: [img, Sprites.flip(img)] }; }

// ---------------- art ----------------
function drawClockmaker(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const wind = e && e.state === 'wind';
  hR(x + 8, y + 30, 6, 10, '#1a1020'); hR(x + 18, y + 30, 6, 10, '#1a1020'); hR(x + 9, y + 31, 4, 8, '#5a3a18'); hR(x + 19, y + 31, 4, 8, '#5a3a18');
  hR(x + 2, y + 12, 28, 20, '#1a1020'); hR(x + 3, y + 13, 26, 18, '#8a5a2a'); hR(x + 3, y + 13, 26, 3, '#c08040'); hR(x + 14, y + 16, 4, 14, '#d0a040');
  ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x + 16, y + 6, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f4ecd0'; ctx.beginPath(); ctx.arc(x + 16, y + 6, 9.5, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; hR(x + 16 + Math.cos(a) * 7.5, y + 6 + Math.sin(a) * 7.5, 1, 1, '#1a1020'); }
  const a1 = t * 0.05, a2 = t * 0.004; ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 16, y + 6); ctx.lineTo(x + 16 + Math.cos(a1) * 7, y + 6 + Math.sin(a1) * 7); ctx.moveTo(x + 16, y + 6); ctx.lineTo(x + 16 + Math.cos(a2) * 4.5, y + 6 + Math.sin(a2) * 4.5); ctx.stroke(); ctx.lineWidth = 1;
  hR(x + 11, y - 10, 10, 6, '#1a1020'); hR(x + 12, y - 9, 8, 4, '#3a2a4a'); hR(x + 8, y - 5, 16, 2, '#1a1020');
  const ka = wind ? t * 0.3 : 0; hR(x + 30, y + 18, 6, 3, '#1a1020'); hR(x + 34, y + 14 + Math.sin(ka) * 3, 3, 10, '#ffd040');
  hR(x - 4, y + 14, 6, 12, '#1a1020'); hR(x - 3, y + 15, 4, 10, '#c08040');
  if (wind && (t >> 4) & 1) txt('WINDING!', x - 6, y - 22, '#ffe040', { outline: '#1a1020' });
}
function drawGearShape(cx, cy, r, a, col, dark) {
  ctx.fillStyle = dark; for (let k = 0; k < 10; k++) { const an = a + (k / 10) * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(an) * r - 2), Math.round(cy + Math.sin(an) * r - 2), 4, 4); }
  ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.fill();
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    if (id === 'clockmaker') { ctx.save(); ctx.translate(x, y); ctx.scale(0.6, 0.6); drawClockmaker(-16, -14, null, t); ctx.restore(); return; }
    if (id === 'guard') { ctx.save(); ctx.translate(x - 7, y - 11); drawGuardBody(0, 0, 1, t, false); ctx.restore(); return; }
    return _sa(id, x, y, t);
  };
}
function drawGuardBody(x, y, dir, t, alarm) {
  const l = (t >> 3) & 1;
  hR(x + 2 + l, y + 16, 4, 6, '#1a1020'); hR(x + 8 - l, y + 16, 4, 6, '#1a1020');
  hR(x + 1, y + 6, 12, 11, '#1a1020'); hR(x + 2, y + 7, 10, 9, '#3a4a7a'); hR(x + 6, y + 8, 2, 2, '#ffd040');
  hR(x + 2, y, 10, 7, '#1a1020'); hR(x + 3, y + 1, 8, 5, '#f0c8a0'); hR(x + (dir > 0 ? 8 : 4), y + 3, 2, 2, '#1a1020');
  hR(x + 1, y - 2, 12, 3, '#1a1020'); hR(x + 2, y - 1, 10, 2, '#2a3a6a'); hR(x + (dir > 0 ? 10 : 0), y, 4, 1, '#1a1020');
  hR(x + (dir > 0 ? 12 : -2), y + 9, 4, 3, '#1a1020'); hR(x + (dir > 0 ? 15 : -3), y + 9, 1, 3, alarm ? '#ff4040' : '#ffffa0');
  if (alarm) txt('!', x + 4, y - 14, '#ff4040', { outline: '#1a1020' });
}

// ---------------- weather: tornadoes and earthquakes ----------------
Object.assign(WX_MSG, { tornado: 'TORNADO WARNING!', quake: 'EARTHQUAKE! WATCH FOR ROCKS!' });
{
  const _pw = pickWeather;
  pickWeather = function (theme, not) { // eslint-disable-line no-func-assign
    if (Math.random() < 0.12) { const k = Math.random() < 0.5 ? 'tornado' : 'quake'; if (k !== not) return k; }
    return _pw(theme, not);
  };
}

// ---------------- the jetpack and the time clock ----------------
Object.assign(RESERVE_NAMES, { jetpack: 'JETPACK', tclock: 'TIME CLOCK' });
Object.assign(RESERVE_FULL, { jetpack: (p) => p.jet > 0, tclock: () => false });
function drawJetpackItem(x, y, t) { const b = Math.sin(t * 0.1) * 2; hR(x, y + b, 12, 14, '#1a1020'); hR(x + 1, y + 1 + b, 4, 10, '#c0c8d8'); hR(x + 7, y + 1 + b, 4, 10, '#c0c8d8'); hR(x + 1, y + 1 + b, 4, 2, '#ff3040'); hR(x + 7, y + 1 + b, 4, 2, '#ff3040'); hR(x + 2, y + 11 + b, 2, 3, (t >> 2) & 1 ? '#ffe040' : '#ff8020'); hR(x + 8, y + 11 + b, 2, 3, (t >> 2) & 1 ? '#ff8020' : '#ffe040'); }
function drawClockItem(x, y, t) { const b = Math.sin(t * 0.1) * 2; ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x + 6, y + 7 + b, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(x + 6, y + 7 + b, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(x + 6, y + 7 + b, 4.5, 0, Math.PI * 2); ctx.fill(); hR(x + 5, y + 3 + b, 1, 4, '#1a1020'); hR(x + 6, y + 6 + b, 3, 1, '#1a1020'); hR(x + 5, y - 1 + b, 3, 2, '#1a1020'); }

// ---------------- the levels: the Clockwork Kingdom ----------------
LEVELS.push(
  { // 86
    name: 'COG CANYON', theme: 'factory', music: 'factory', width: 180, tag: 'CK1', world: 'CLOCKWORK KINGDOM 1',
    gears: [[40, 7, 3, 3, 0.012], [96, 7, 3, 4, -0.01], [146, 7, 3, 3, 0.014]],
    build(b) {
      b.ground(0, 32).set(2, 11, '@').coins(8, 9, 4).set(20, 11, 'g').row(24, 8, 'BWB');
      b.ground(49, 86).set(56, 11, 'h').set(64, 11, 'C').coins(70, 9, 5).set(80, 11, 'g');
      b.ground(106, 136).set(112, 11, 'c').row(118, 8, 'WPW').set(128, 11, 'p');
      b.ground(156, 179).coins(160, 9, 4).set(172, 11, 'G');
    },
  },
  { // 87
    name: 'REWIND BRIDGE', theme: 'factory', music: 'factory', width: 180, tag: 'CK2', world: 'CLOCKWORK KINGDOM 2',
    rewinds: [[22, 11, 26, 40, 12, 300], [66, 11, 70, 86, 12, 280], [116, 11, 120, 138, 12, 260]],
    build(b) {
      b.ground(0, 25).set(2, 11, '@').coins(8, 9, 4).set(14, 11, 'g');
      b.ground(41, 69).set(48, 11, 'p').set(56, 11, 'C').row(58, 8, 'BWB');
      b.ground(87, 119).set(94, 11, 'h').coins(100, 9, 5).set(108, 11, 'g');
      b.ground(139, 179).set(146, 11, 'c').set(152, 11, 'C').coins(158, 9, 4).set(172, 11, 'G');
    },
  },
  { // 88
    name: 'PENDULUM HALL', theme: 'factory', music: 'castle', width: 180, tag: 'CK3', world: 'CLOCKWORK KINGDOM 3',
    pendulums: [[30, 9, 0], [48, 9, 60], [80, 9, 30], [98, 9, 90], [130, 9, 0], [148, 9, 45]],
    items: [['tclock', 64, 9]],
    build(b) {
      b.fill(0, 0, 179, 0, 'X').ground(0, 179).set(2, 11, '@').coins(8, 9, 4).set(20, 11, 'g');
      b.coins(28, 10, 4).coins(46, 10, 4).set(60, 11, 'C').set(70, 11, 'p').coins(78, 10, 4).coins(96, 10, 4).row(110, 8, 'BWB').set(118, 11, 'h');
      b.coins(128, 10, 4).coins(146, 10, 4).set(160, 11, 'g').set(172, 11, 'G');
    },
  },
  { // 89
    name: 'THE VAULT', theme: 'factory', music: 'haunted', width: 180, stealth: true, tag: 'CK4', world: 'CLOCKWORK KINGDOM 4',
    guards: [[20, 40], [52, 74], [90, 112], [128, 150]],
    build(b) {
      b.fill(0, 0, 179, 1, 'X').ground(0, 179).set(2, 11, '@').coins(8, 9, 4);
      b.fill(30, 8, 33, 8, 'X').coins(30, 6, 4).fill(62, 7, 66, 7, 'X').coins(62, 5, 5).set(80, 11, 'C').fill(100, 8, 104, 8, 'X').coins(100, 6, 5).fill(138, 7, 142, 7, 'X').coins(138, 5, 5);
      b.row(118, 8, 'WPW').set(172, 11, 'G');
    },
  },
  { // 90
    name: 'TIME TOWER', theme: 'factory', music: 'factory', width: 190, tag: 'CK5', world: 'CLOCKWORK KINGDOM 5',
    items: [['jetpack', 30, 10], ['tclock', 120, 9]], gears: [[150, 7, 3, 3, 0.015]], pendulums: [[96, 8, 0], [110, 8, 50]],
    build(b) {
      b.ground(0, 40).set(2, 11, '@').coins(8, 9, 4).set(20, 11, 'g');
      b.gap(41, 70).fill(52, 3, 58, 3, 'X').coins(53, 1, 5).fill(70, 0, 71, 9, 'X');
      b.ground(70, 140).set(76, 11, 'C').set(84, 11, 'h').coins(94, 10, 4).coins(108, 10, 4).set(126, 11, 'p').set(132, 11, 'g');
      b.ground(160, 189).set(166, 11, 'c').coins(170, 9, 4).set(182, 11, 'G');
    },
  },
  { // 91
    name: "THE CLOCKMAKER'S STUDIO", theme: 'factory', music: 'factory', width: 80, boss: true, bossHp: 8, bossName: 'THE CLOCKMAKER', bossType: 'clockmaker', talk: 'clockmaker', tag: 'CK6', world: 'CLOCKWORK KINGDOM 6',
    bossMsg: ['THE CLOCKMAKER WINDS DOWN', 'WITH ONE LAST... TICK.', '', 'EVERY CLOCK IN THE KINGDOM', 'CHIMES AT ONCE TO CHEER', 'FOR YOU. RIGHT ON TIME!'],
    build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 10, 4).set(18, 11, 'g').row(26, 8, 'WPW').set(36, 11, 'C').set(46, 11, 'h').set(74, 11, '*'); },
  },
  { // 92
    name: 'NINJA DOJO', theme: 'castle', music: 'castle', width: 160, stealth: true, side: true, tag: 'CK+', world: 'CLOCKWORK KINGDOM',
    guards: [[16, 30], [40, 56], [66, 80], [92, 108], [118, 134]],
    build(b) {
      b.fill(0, 0, 159, 1, 'X').ground(0, 159).set(2, 11, '@');
      for (const x of [34, 60, 86, 112, 138]) { b.fill(x, 6, x + 1, 11, 'X'); b.coins(x - 1, 4, 4); }
      b.set(84, 11, 'C').set(152, 11, 'G');
    },
  },
);
const CLOCK_BASE = 86;
REMATCH.push(91);
DIARY.push([91, 'CLOCKWORK KINGDOM', ['DEAR DIARY, I BEAT THE', 'CLOCKMAKER. NOW EVERY', 'CLOCK HERE TICKS ON TIME.', 'EXCEPT MINE. MINE GOES', 'TICK-TOCK-TICK-TICK-BONG.']]);

// ---------------- the update loop ----------------
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initM) this.initM();
    const p = this.p;
    if (!this.paused && !this.talk && !this.photo) {
      // gear wheels turn (unless time is stopped), carrying their platforms round
      for (const pl of this.platforms) {
        if (!pl.gear) continue;
        const g = pl.gear; if (!(this.timeStopT > 0)) g.a += g.spd;
        pl.ox = g.cx + Math.cos(g.a) * g.r - pl.w / 2; pl.oy = g.cy + Math.sin(g.a) * g.r;
      }
      if (this.timeStopT > 0) for (const pl of this.platforms) if (!pl.gear) pl.t--; // other platforms hold still too
    }
    _upd.call(this);
    if (this.paused || this.talk || this.photo || this.state !== 'play') return;
    const hF = this.hF || 0;
    if (this.timeStopT > 0) { this.timeStopT--; if (this.timeStopT % 30 === 0) Audio8.sfx('letter'); }
    if (this.dashCool > 0) this.dashCool--;
    // rewind switches rebuild a bridge for a while, then it crumbles again
    for (const r of this.def.rewinds || []) {
      const [sx, sy, x0, x1, y, dur] = r;
      if (!r.t && overlap(p, { x: sx * TS, y: sy * TS - 4, w: 16, h: 20 })) { r.t = dur; for (let x = x0; x <= x1; x++) if (this.tile(x, y) === '.') this.setTile(x, y, 'Ж'); Audio8.sfx('secret'); this.parts.push({ k: 'text', s: 'REWIND!', x: sx * TS - 10, y: sy * TS - 20, vy: -0.4, life: 50 }); }
      if (r.t > 0) { if (!(this.timeStopT > 0)) r.t--; if (r.t > 0 && r.t < 70 && r.t % 15 === 0) Audio8.sfx('letter'); if (r.t === 0) { for (let x = x0; x <= x1; x++) if (this.tile(x, y) === 'Ж') { this.setTile(x, y, '.'); this.parts.push({ k: 'dust', x: x * TS + 8, y: y * TS + 4, vx: 0, vy: 1, life: 20 }); } Audio8.sfx('brick'); } }
    }
    // pendulums swing through the hall
    for (const [px, len, ph] of this.def.pendulums || []) {
      const b = pendBob(this, px, len, ph);
      if (overlap(p, { x: b.x - 8, y: b.y - 8, w: 16, h: 16 })) this.hurt();
    }
    // the stealth alarm: more foes drop in while it rings
    if (this.alarmT > 0) {
      this.alarmT--; if (this.alarmT % 40 === 0) Audio8.sfx('lasercharge');
      if (this.alarmT === 330 || this.alarmT === 250 || this.alarmT === 170) { const tx = Math.floor((p.x + (Math.random() < 0.5 ? -70 : 90)) / TS); if (groundRow(this, tx) > 0) this.spawn({ t: 'g', x: tx, y: 2 }); }
    }
    // weather: tornadoes and quakes
    const w = this.wx;
    if (w && w.cur === 'tornado' && w.amt > 0.7 && !this.bossLock && !this.ents.some((e) => e.type === 'tornado' && e.alive)) {
      if (--w.twT <= 0 || !(w.twT > 0)) { w.twT = 300 + Math.floor(Math.random() * 200); const left = Math.random() < 0.5; this.ents.push({ type: 'tornado', alive: true, t: 0, x: this.cam.x + (left ? -50 : VW + 14), y: 0, w: 36, h: 12 * TS, vx: left ? 0.75 : -0.75, hold: 0, life: 1000 }); }
    }
    if (w && w.cur === 'quake' && w.amt > 0.7 && !this.bossLock) {
      if (--w.qT <= 0 || !(w.qT > 0)) {
        w.qT = 260 + Math.floor(Math.random() * 160); this.quakeT = 50; Audio8.thunder(0.85); buzz([200, 60, 200]); rumble(0.6, 400);
        for (let k = 0; k < 3; k++) { const x = p.x + p.w / 2 + (k - 1) * 46 + Math.random() * 30 - 15, gy = groundRow(this, Math.floor(x / TS)); if (gy > 0) this.ents.push({ type: 'hailstone', rock: true, alive: true, t: 0, x: x - 6, y: -16, w: 12, h: 12, vy: 0, gy: gy * TS, warn: 45 + k * 10 }); }
      }
    }
    if (this.quakeT > 0) { this.quakeT--; this.shake = Math.max(this.shake, 4); }
  };
  Play.prototype.initM = function () {
    this._initM = true;
    for (const [cx, cy, r, n, spd] of this.def.gears || []) for (let k = 0; k < n; k++) { const pl = { x: 0, y: 0, w: 32, h: 8, ox: 0, oy: 0, axis: 'gear', t: 0, gear: { cx: cx * TS + 8, cy: cy * TS + 8, r: r * TS, a: (k / n) * Math.PI * 2, spd } }; pl.ox = pl.gear.cx + Math.cos(pl.gear.a) * pl.gear.r - 16; pl.oy = pl.gear.cy + Math.sin(pl.gear.a) * pl.gear.r; pl.x = pl.ox; pl.y = pl.oy; this.platforms.push(pl); }
    for (const r of this.def.rewinds || []) r.t = 0;
    for (const [type, x, y] of this.def.items || []) this.ents.push({ type, item: true, alive: true, t: 0, x: x * TS + 2, y: y * TS + 1, w: 12, h: 14, rise: 0 });
    for (const [x0, x1] of this.def.guards || []) { const gy = groundRow(this, x0); if (gy > 0) this.ents.push({ type: 'guard', enemy: true, alive: true, t: 0, x: x0 * TS, y: gy * TS - 22, w: 14, h: 22, x0: x0 * TS, x1: x1 * TS, dir: 1, wait: 0 }); }
    this.alarms = 0;
  };
  Play.prototype.alarm = function () {
    if (this.alarmT > 0) return;
    this.alarmT = 360; this.alarms = (this.alarms || 0) + 1; Audio8.sfx('roar'); buzz([100, 50, 100, 50, 100]);
    this.parts.push({ k: 'text', s: 'ALARM! YOU WERE SPOTTED!', x: this.p.x - 60, y: this.p.y - 30, vy: -0.3, life: 90 });
  };
  const _cl = Play.prototype.clear;
  Play.prototype.clear = function (s) { const was = this.state; _cl.call(this, s); if (was === 'play' && this.state === 'clear' && this.def.stealth && !this.alarms) Ach.unlock('unseen'); };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.type === 'jetpack' || e.type === 'tclock') {
      e.t++; if (this.state !== 'play' || !overlap(p, e)) return;
      e.alive = false; Audio8.sfx('power');
      if (e.type === 'jetpack') { p.jet = 300; this.parts.push({ k: 'text', s: 'JETPACK! HOLD JUMP TO FLY', x: p.x - 50, y: p.y - 24, vy: -0.4, life: 90 }); }
      else { this.freezeT = 300; this.timeStopT = 300; Audio8.sfx('freeze'); Ach.unlock('timestop'); this.parts.push({ k: 'text', s: 'TIME STOPPED!', x: p.x - 30, y: p.y - 24, vy: -0.4, life: 80 }); }
      return;
    }
    if (e.type === 'guard') {
      if (this._p2ctx) return;
      e.t++;
      if (e.dying) { e.y += (e.vy = (e.vy || -3) + 0.3); if (e.y > VH + 30) e.alive = false; return; }
      if (!(this.freezeT > 0)) {
        if (this.alarmT > 0) { e.dir = p.x < e.x ? -1 : 1; e.x += e.dir * 1.1; }
        else if (e.wait > 0) { if (--e.wait === 0) e.dir = -e.dir; }
        else { e.x += e.dir * 0.5; if ((e.dir > 0 && e.x >= e.x1) || (e.dir < 0 && e.x <= e.x0)) e.wait = 70; }
        // the searchlight: a cone in front of the guard (Ninja Nell is hidden while she crouches)
        const hid = heroOf() === 'ninja' && p.crouch, ex = e.x + 7, ey = e.y + 10, dx = (p.x + p.w / 2 - ex) * e.dir, dy = p.y + p.h / 2 - ey;
        if (!hid && this.state === 'play' && dx > 0 && dx < 88 && Math.abs(dy) < dx * 0.42 + 8) this.alarm();
      }
      if (this.state !== 'play' || !overlap(p, e)) return;
      if (p.vy > 0 && p.y + p.h - e.y < 10) { e.dying = true; e.vy = -3; p.vy = -5.5; Audio8.sfx('stomp'); this.addScore(200, e.x, e.y - 8); this.countKill && this.countKill(e); Bestiary.add('guard'); return; }
      if (!(this.freezeT > 0)) this.hurt();
      return;
    }
    if (e.type === 'tornado') {
      if (this._p2ctx) return;
      e.t++; e.x += e.vx + Math.sin(e.t * 0.05) * 0.4; if (--e.life <= 0 || e.x < this.cam.x - 120 || e.x > this.cam.x + VW + 120) e.alive = false;
      if (e.t % 30 === 0) Audio8.sfx('swoop');
      const cx = e.x + 18, pc = p.x + p.w / 2;
      if (this.state === 'play' && Math.abs(pc - cx) < 16) {
        e.hold++; p.vy = Math.max(-3.2, p.vy - 0.65); p.onGround = false; p.vx += (cx - pc) * 0.03 + e.vx * 0.2;
        if (e.hold > 55) { e.hold = 0; p.vy = -6.5; p.vx = (e.vx > 0 ? 1 : -1) * 4.5; Audio8.sfx('spring'); Ach.unlock('twister'); this.parts.push({ k: 'text', s: 'WHOOOSH!', x: p.x - 20, y: p.y - 20, vy: -0.4, life: 50 }); }
      } else e.hold = 0;
      return;
    }
    if (e.type === 'clockmaker') return this.updateClockmaker(e);
    if (e.type === 'cgear') {
      if (this._p2ctx) { if (this.state === 'play' && overlap(p, e)) this.hurt(); return; }
      e.t++; if (!(this.freezeT > 0)) { e.vy = Math.min(6, e.vy + 0.3); e.y += e.vy; const gy = 12 * TS - e.h; if (e.y >= gy) { e.y = gy; e.vy = 0; } e.x += e.vx; e.a = (e.a || 0) + e.vx * 0.15; }
      if (e.x < this.camMin - 20 || e.x > this.camMin + VW + 20 || e.t > 400) e.alive = false;
      if (this.state !== 'play' || !overlap(p, e)) return;
      if (p.vy > 0 && p.y + p.h - e.y < 8) { e.alive = false; p.vy = -5; Audio8.sfx('brick'); this.addScore(100, e.x, e.y - 8); return; }
      if (!(this.freezeT > 0)) this.hurt();
      return;
    }
    return _ue.call(this, e);
  };
  Play.prototype.updateClockmaker = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    if (!this.bossLock || this.talk || this._p2ctx) { if (this._p2ctx && this.state === 'play' && overlap(p, e) && e.state !== 'wind') this.hurt(); return; }
    e.t++; const L = this.camMin + 10, R = this.camMin + VW - 44, rage = e.maxHp - e.hp, floorY = 12 * TS - 40, slow = this.freezeT > 0;
    if (!slow && --e.act <= 0) {
      e.state = { hover: 'wind', wind: 'hover' }[e.state] || 'hover'; e.act = e.state === 'hover' ? 240 - rage * 12 : 130 - rage * 6;
      if (e.state === 'wind') Audio8.sfx('letter');
    }
    if (e.state === 'hover') {
      if (!slow) { e.x += e.dir * (0.8 + rage * 0.1); if (e.x <= L) e.dir = 1; if (e.x >= R) e.dir = -1; e.y += (50 + Math.sin(e.t * 0.05) * 10 - e.y) * 0.05; }
      if (!slow && e.t % Math.max(45, 80 - rage * 5) === 0) { const d = p.x < e.x ? -1 : 1; this.ents.push({ type: 'cgear', enemy: true, alive: true, t: 0, x: e.x + 12, y: e.y + 20, w: 14, h: 14, vx: d * (1.4 + rage * 0.12), vy: -2 }); Audio8.sfx('cannon'); }
    } else { e.y += (floorY - e.y) * 0.12; if (e.t % 20 === 0) Audio8.sfx('letter'); }
    e.x = clamp(e.x, L, R);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'wind' && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'hover'; e.act = 200; } return; }
    if (!slow) this.hurt();
  };
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    if (sp.t === '*' && this.def.bossType === 'clockmaker') {
      const hp = (this.def.bossHp || 8) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0) + (game.plus && !this.rush ? 2 * game.plus : 0);
      this.ents.push({ type: 'clockmaker', boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS - 40, y: 50, w: 32, h: 40, hp, maxHp: hp, inv: 0, state: 'hover', act: 200, dir: -1 }); return;
    }
    return _sp.call(this, sp);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) {
    const a = e.alive, sa = Sticker.add, mine = e.type === 'clockmaker';
    if (mine) Sticker.add = () => {};
    try { _db.call(this, e); } finally { Sticker.add = sa; }
    if (a && !e.alive && mine) { Ach.unlock('clockmaker'); Bestiary.add('clockmaker'); }
  };
  // Ninja Nell climbs walls and dashes through foes; the jetpack lifts anyone
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    const p = this.p, ninja = heroOf() === 'ninja' && this.state === 'play';
    const mask = ninja && !this._p2ctx && !Input.down('up');
    if (mask && Input.pressed('special') && !(this.dashCool > 0) && !p.riding) { p.nDashT = 14; this.dashCool = 40; p.inv = Math.max(p.inv, 16); Audio8.sfx('swoop'); }
    let r;
    if (mask) { const P = Input.pressed; Input.pressed = (k) => (k === 'special' ? false : P(k)); try { r = _up.call(this); } finally { Input.pressed = P; } } else r = _up.call(this);
    if (this.state !== 'play') return r;
    if (p.nDashT > 0) {
      p.nDashT--; p.vx = (p.face || 1) * 5.2; p.vy = Math.min(p.vy, 0.5);
      if (frame % 2 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + 10, vx: -p.face, vy: 0, life: 14 });
      for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss && e.type !== 'guard' && overlap({ x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, e)) { this.flipKill(e); game.ninjaKills = (game.ninjaKills | 0) + 1; if (game.ninjaKills >= 10) Ach.unlock('ninjadash'); }
      for (const e of this.ents) if (e.type === 'guard' && e.alive && !e.dying && overlap({ x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, e)) { e.dying = true; e.vy = -3; this.addScore(200, e.x, e.y - 8); }
    }
    if (ninja && p.wallTouch && Input.down('up') && !p.onGround) { p.vy = -1.7; if (frame % 6 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2 + p.wallTouch * 6, y: p.y + p.h, vx: 0, vy: 0.3, life: 10 }); }
    if (p.jet > 0 && !p.onGround && Input.down('jump') && !p.riding && p.vy > -2.2) {
      p.jet--; Ach.unlock('jetpack'); p.vy = approach(p.vy, p.y < 28 ? 0.2 : -1.4, 0.9);
      if (frame % 2 === 0) this.parts.push({ k: 'spark', x: p.x + p.w / 2 - p.face * 4, y: p.y + p.h - 2, vx: 0, vy: 1.2, life: 10 });
      if (frame % 10 === 0) Audio8.sfx('flap');
    }
    return r;
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.type === 'jetpack') { drawJetpackItem(x, y, frame + e.t); return; }
    if (e.type === 'tclock') { drawClockItem(x, y, frame + e.t); return; }
    if (e.type === 'guard') {
      if (!e.dying) { // the searchlight cone
        const ex = x + 7 + e.dir * 8, ey = y + 10, al = this.alarmT > 0;
        ctx.fillStyle = al ? 'rgba(255,60,60,0.28)' : 'rgba(255,250,160,0.28)'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + e.dir * 88, ey - 44); ctx.lineTo(ex + e.dir * 88, ey + 44); ctx.closePath(); ctx.fill();
      }
      ctx.save(); if (e.dying) { ctx.translate(x + 7, y + 11); ctx.scale(1, -1); ctx.translate(-x - 7, -y - 11); } drawGuardBody(x, y, e.dir, frame + e.t, this.alarmT > 0); ctx.restore(); return;
    }
    if (e.type === 'tornado') {
      const gy = 12 * TS;
      for (let i = 0; i < 16; i++) { const yy = gy - i * 12, ww = 6 + i * 2.2, sw = Math.sin(frame * 0.25 + i * 0.7) * (4 + i * 0.4); ctx.fillStyle = i % 2 ? 'rgba(120,128,150,0.75)' : 'rgba(160,168,188,0.75)'; ctx.fillRect(Math.round(x + 18 - ww / 2 + sw), yy - 12, Math.round(ww), 10); }
      ctx.fillStyle = '#6a5a40'; for (let k = 0; k < 5; k++) { const a = frame * 0.2 + k * 1.3, r = 10 + k * 4; ctx.fillRect(Math.round(x + 18 + Math.cos(a) * r), Math.round(gy - 30 - k * 24 + Math.sin(a) * 4), 3, 3); }
      return;
    }
    if (e.type === 'hailstone' && e.rock) {
      if (e.warn > 0 || e.y < e.gy - 40) { const s = 6 + Math.round((1 - Math.max(0, e.warn) / 60) * 8); ctx.fillStyle = 'rgba(40,20,10,0.45)'; ctx.fillRect(x + 6 - s / 2, e.gy - 3, s, 3); }
      if (e.warn > 0) { if ((frame >> 2) & 1) hR(x + 4, 2, 4, 2, '#8a6a40'); return; }
      hR(x, y, 12, 12, '#1a1020'); hR(x + 1, y + 1, 10, 10, '#8a6a40'); hR(x + 2, y + 2, 4, 3, '#b08a5a'); hR(x + 7, y + 7, 3, 3, '#5a4028'); return;
    }
    if (e.type === 'clockmaker') { if (!e.dying) drawClockmaker(x, y, e, frame); return; }
    if (e.type === 'cgear') { ctx.save(); drawGearShape(x + 7, y + 7, 6, e.a || 0, '#d0a040', '#1a1020'); ctx.restore(); return; }
    return _de.call(this, e, cx);
  };
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    // the big gear wheels sit behind the level
    for (const [gx, gy, r, , spd] of this.def.gears || []) {
      const X = gx * TS + 8 - cx, Y = gy * TS + 8; if (X < -r * TS - 30 || X > VW + r * TS + 30) continue;
      const pl = this.platforms.find((k) => k.gear && k.gear.cx === gx * TS + 8), a = pl ? pl.gear.a : 0;
      drawGearShape(X, Y, 14, a, '#b08040', '#5a3a18');
      ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 2; for (const k of this.platforms) if (k.gear && k.gear.cx === gx * TS + 8) { ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(k.x + k.w / 2 - cx, k.y + 2); ctx.stroke(); } ctx.lineWidth = 1;
    }
    _dt.call(this, cx);
    const t0 = Math.floor(cx / TS);
    for (let ty = 0; ty < 14; ty++) for (let tx = t0; tx <= t0 + 16; tx++) {
      if (this.tile(tx, ty) !== 'Ж') continue;
      const X = tx * TS - cx, Y = ty * TS, r = (this.def.rewinds || []).find((k) => tx >= k[2] && tx <= k[3]), blink = r && r.t < 70 && (frame >> 2) & 1;
      if (blink) { hR(X, Y, 16, 16, 'rgba(208,160,64,0.4)'); continue; }
      hR(X, Y, 16, 16, '#1a1020'); hR(X + 1, Y + 1, 14, 6, '#d0a040'); hR(X + 1, Y + 7, 14, 8, '#8a5a2a'); hR(X + 7, Y + 2, 2, 2, '#ffe080');
    }
    for (const r of this.def.rewinds || []) { // switches, and a ghost of the bridge they bring back
      const [sx, sy, x0, x1, y] = r, X = sx * TS - cx; if (X < -300 || X > VW + 40) continue;
      ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(X + 8, sy * TS + 8, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = r.t ? '#5ae060' : '#ffd040'; ctx.beginPath(); ctx.arc(X + 8, sy * TS + 8, 6.5, 0, Math.PI * 2); ctx.fill();
      const a = r.t ? -r.t * 0.2 : frame * 0.05; hR(X + 7, sy * TS + 3, 2, 6, '#1a1020'); hR(X + 8 + Math.cos(a) * 3 - 1, sy * TS + 8 + Math.sin(a) * 3 - 1, 2, 2, '#1a1020');
      if (!r.t) { ctx.strokeStyle = 'rgba(208,160,64,0.35)'; ctx.setLineDash([3, 3]); ctx.strokeRect(x0 * TS - cx + 0.5, y * TS + 0.5, (x1 - x0 + 1) * TS - 1, 15); ctx.setLineDash([]); if ((frame >> 5) & 1) txt('<<', X - 2, sy * TS - 12, '#ffd040', { outline: '#1a1020' }); }
    }
    for (const [px, len, ph] of this.def.pendulums || []) {
      const X = px * TS + 8 - cx; if (X < -200 || X > VW + 200) continue;
      const b = pendBob(this, px, len, ph); ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, 16); ctx.lineTo(b.x - cx, b.y); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(b.x - cx, b.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d0a040'; ctx.beginPath(); ctx.arc(b.x - cx, b.y, 7.5, 0, Math.PI * 2); ctx.fill(); hR(b.x - cx - 3, b.y - 4, 3, 3, '#ffe080');
    }
  };
  const _dw = Play.prototype.drawWeather;
  Play.prototype.drawWeather = function (cx) {
    _dw.call(this, cx);
    if (this.timeStopT > 0) { ctx.fillStyle = `rgba(150,110,40,${Math.min(0.25, this.timeStopT / 400)})`; ctx.fillRect(0, 0, VW, VH); }
    if (this.alarmT > 0 && (this.alarmT >> 3) & 1) { ctx.fillStyle = 'rgba(255,0,0,0.12)'; ctx.fillRect(0, 0, VW, VH); }
    if (this.def.stealth) { ctx.fillStyle = 'rgba(10,10,30,0.3)'; ctx.fillRect(0, 0, VW, VH); }
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _hud.call(this);
    const p = this.p;
    if (p.jet > 0) { hR(8, 52, 64, 10, 'rgba(16,24,72,0.8)'); txt('JET', 11, 53, '#fff'); hR(31, 54, 38, 6, '#1a1020'); hR(32, 55, Math.round(36 * p.jet / 300), 4, p.jet < 80 ? '#ff8040' : '#ffe040'); }
    if (this.timeStopT > 0) txt('TIME STOP ' + Math.ceil(this.timeStopT / 60), 128, 40, '#ffd040', { align: 'center', outline: '#101848' });
    if (this.alarmT > 0) txt('ALARM ' + Math.ceil(this.alarmT / 60), 128, 52, '#ff4040', { align: 'center', outline: '#101848' });
    if (this.def.stealth && this.hF < 360) txt(heroOf() === 'ninja' ? 'CROUCH TO HIDE FROM SEARCHLIGHTS' : 'STAY OUT OF THE SEARCHLIGHTS!', 128, 190, '#fff', { align: 'center', outline: '#101848' });
  };
  // a stomp or dash can't be undone by a dash's own invincibility running out mid-dash
  const _hurt = Play.prototype.hurt;
  Play.prototype.hurt = function (spike) { if (this.p.nDashT > 0 && !this._p2ctx) return; return _hurt.call(this, spike); };
}
function pendBob(pl, px, len, ph) { const a = Math.sin(((pl.hF || 0) + ph) * 0.035) * 1.05; return { x: px * TS + 8 + Math.sin(a) * len * TS, y: 16 + Math.cos(a) * len * TS }; }

// ---------------- the Clockwork Kingdom map ----------------
NODES10.push({ x: 236, y: 196, kind: 'portal', to: 10, name: 'CLOCK TRAIN TO THE KINGDOM' }); EDGES10.push([6, NODES10.length - 1]);
const NODES11 = [
  { x: 24, y: 186, kind: 'portal', to: 9, name: 'CLOCK TRAIN TO THE DEEP' },
  { x: 60, y: 160, kind: 'level', li: 86 }, { x: 104, y: 176, kind: 'level', li: 87 }, { x: 150, y: 160, kind: 'level', li: 88 }, { x: 196, y: 148, kind: 'level', li: 89 }, { x: 200, y: 100, kind: 'level', li: 90 }, { x: 136, y: 82, kind: 'castle', li: 91 },
  { x: 232, y: 176, kind: 'level', li: 92, side: true, after: 89 },
];
const EDGES11 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [4, 7]];
const Island11 = makeIsland(NODES11, [[90, 150, 26], [130, 140, 26], [170, 124, 24], [110, 110, 22], [160, 96, 22]], 1111, (f, near, ch) => {
  if (f > 2.3) return near(6, 28) ? (ch ? [180, 130, 60] : [200, 150, 80]) : ch ? [150, 110, 60] : [166, 124, 70];
  if (f > 1.6) return ch ? [120, 90, 50] : [134, 100, 58];
  if (f > 1.25) return ch ? [90, 70, 44] : [100, 78, 50];
  return null;
});
WORLDS.push({ nodes: () => NODES11, edges: () => EDGES11, isle: () => Island11, name: 'CLOCKWORK KINGDOM', sea: ['#2a2018', '#3a2c20'], key: 'node11' });
