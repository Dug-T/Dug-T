'use strict';
// =====================================================================
// Batch H (part 1): Crystal Isle (5th island), slopes + belly slide,
// fans and wind gusts, wall-jump for everyone, bigger ground pound,
// toy factory hazards, lava chase, lantern darkness, push-block and
// light-beam puzzle rooms, new enemies, Crystal Dragon and DJ Decibel
// (a boss that attacks on the beat), Volt the rival, signposts and
// the hint owl, Survival Arena, Hard Remix and Doug's story levels.
// =====================================================================
ACH_LIST.push(['crystal', 'CRYSTAL CLEAR', 'BEAT THE CRYSTAL DRAGON'], ['dj', 'DROP THE BEAT', 'BEAT DJ DECIBEL'], ['puzzles', 'BRAIN BOX', 'SOLVE ALL 3 PUZZLE ROOMS'], ['rival', 'FASTER THAN VOLT', 'BEAT VOLT IN A RACE'],
  ['arena10', 'ARENA HERO', 'REACH WAVE 10 IN THE SURVIVAL ARENA'], ['remix', 'REMIXED', 'CLEAR A HARD REMIX LEVEL'], ['dougstory', 'THE DOUG THOMSON STORY', "FINISH DOUG'S STORY"], ['slider', 'BELLY FLOPPER', 'BELLY-SLIDE INTO 3 FOES AT ONCE'],
  ['kartboom', 'DEMOLITION DERBY', 'BLOW UP A RIVAL KART'], ['bestiary', 'MONSTER EXPERT', 'FILL 25 BESTIARY PAGES']);
Object.assign(SONG_NAMES, { crystal: 'CRYSTAL CAVERNS', toy: 'TOY FACTORY', bossbeat: 'DJ DECIBEL', bosscrystal: 'CRYSTAL DRAGON', arena: 'SURVIVAL ARENA', doug: "DOUG'S THEME" });
Object.assign(BOSS_TALK, {
  cdragon: [['boss', 'SKREEE! WHO DARES CLIMB TO MY CRYSTAL CROWN?'], ['hero', 'THE HERO WHO JUST SMASHED ALL YOUR GEMS!'], ['boss', 'THEN YOU WILL BE MY NEXT CRYSTAL!']],
  dj: [['boss', 'YO YO YO! WELCOME TO THE BEAT BOX!'], ['boss', 'EVERY ATTACK HITS ON THE BEAT. FEEL THE RHYTHM!'], ['hero', 'WHEN YOUR LID POPS OPEN, I DROP IN!']],
  volt: [['boss', 'YOU AGAIN, DOUG? THE SIGNAL CHIP IS MINE!'], ['hero', 'ONLY IF YOU CAN OUTRUN ME, VOLT!']],
});
Object.assign(BOSS_ART, { cdragon: 'cdragon', dj: 'dj', volt: 'volt' }); Object.assign(BOSS_NAMES, { cdragon: 'CRYSTAL DRAGON', dj: 'DJ DECIBEL', volt: 'VOLT' });
// everyone can wall-jump now: the old upgrade becomes free
{ const u = typeof UPGRADES !== 'undefined' && UPGRADES.find((k) => k.id === 'wall'); if (u) { u.price = 0; u.tip = ['EVERY HERO CAN SLIDE DOWN', 'WALLS AND JUMP OFF THEM!']; } }

// ---------------- new tiles ----------------
const SL_R = '◢', SL_L = '◣', FAN = 'φ', CRYS = 'κ', GATE = 'Γ', PLATE = 'π', POUNDP = 'Π', POUNDED = 'ϖ', EMIT = 'ε', RECV = 'ω', MIR_A = '╱', MIR_B = '╲';
[FAN, CRYS, GATE, POUNDP, POUNDED, EMIT, RECV].forEach((c) => SOLID.add(c));
const isSlope = (c) => c === SL_R || c === SL_L;
const H_ENTS = { 'σ': 'toysoldier', 'μ': 'windup', 'ζ': 'crystalbug', 'ψ': 'gustbird', 'χ': 'crusher', 'β': 'crate', 'ς': 'sign' };
let hCtx = null; // draw the new characters onto another canvas when set
const hR = (X, Y, w, h, c) => { const C = hCtx || ctx; C.fillStyle = c; C.fillRect(Math.round(X), Math.round(Y), w, h); };

// ---------------- art for the new characters ----------------
function drawVolt(cx, feet, face, t, pose) {
  const x = Math.round(cx) - 5, y = Math.round(feet) - 22, run = pose === 'run', leg = run ? ((t >> 2) & 1) : 0;
  const C = hCtx || ctx; C.save(); if (face < 0) { C.translate(x * 2 + 10, 0); C.scale(-1, 1); }
  hR(x + 1, y + 1, 9, 7, '#1a1020'); hR(x + 2, y + 2, 7, 5, '#f0c090'); hR(x + 6, y + 3, 2, 2, '#1a1020');
  for (let k = 0; k < 4; k++) hR(x - 1 + k * 3, y - 2 + (k % 2), 3, 4, '#2a6aff'); hR(x - 3, y + 1, 4, 2, '#2a6aff'); hR(x - 5, y + 2, 3, 1, '#5aa0ff');
  hR(x + 1, y + 8, 9, 8, '#1a1020'); hR(x + 2, y + 9, 7, 6, '#ffd040'); hR(x + 4, y + 10, 2, 2, '#2a6aff'); hR(x + 5, y + 12, 2, 2, '#2a6aff');
  hR(x + 1, y + 15, 9, 7, '#1a1020'); hR(x + 2 + (leg ? 2 : 0), y + 16, 3, 5, '#303060'); hR(x + 6 - (leg ? 2 : 0), y + 16, 3, 5, '#303060');
  hR(x + 1 + (leg ? 2 : 0), y + 20, 4, 2, '#ff3040'); hR(x + 6 - (leg ? 2 : 0), y + 20, 4, 2, '#ff3040');
  if (run && (t >> 1) & 1) { hR(x - 6, y + 10, 4, 1, '#ffe040'); hR(x - 9, y + 14, 5, 1, '#ffe040'); }
  C.restore();
}
function drawHEnemy(type, x, y, t, face = 1) {
  ctx.save(); if (face < 0) { ctx.translate(x * 2 + 14, 0); ctx.scale(-1, 1); }
  if (type === 'toysoldier') {
    hR(x + 3, y - 4, 8, 6, '#1a1020'); hR(x + 4, y - 3, 6, 4, '#202060'); hR(x + 5, y - 5, 4, 2, '#ffd040');
    hR(x + 3, y + 1, 8, 5, '#1a1020'); hR(x + 4, y + 2, 6, 3, '#f0c090'); hR(x + 7, y + 3, 1, 1, '#1a1020');
    hR(x + 2, y + 6, 10, 6, '#1a1020'); hR(x + 3, y + 7, 8, 4, '#e83040'); hR(x + 6, y + 7, 2, 4, '#ffd040'); hR(x + 10, y + 7, 5, 2, '#5a3a20');
    hR(x + 3, y + 11, 8, 3, '#1a1020'); hR(x + 4 + ((t >> 3) & 1), y + 12, 2, 2, '#202060'); hR(x + 8 - ((t >> 3) & 1), y + 12, 2, 2, '#202060');
  } else if (type === 'windup') {
    hR(x + 1, y + 4, 13, 9, '#1a1020'); hR(x + 2, y + 5, 11, 7, '#a0a8b8'); hR(x + 3, y + 5, 9, 2, '#d0d8e8'); hR(x + 11, y + 6, 2, 2, '#1a1020'); hR(x + 13, y + 8, 2, 2, '#ff70a0');
    hR(x + 9, y + 2, 3, 3, '#a0a8b8'); const k = (t >> 2) % 4; hR(x + 4, y + (k < 2 ? 0 : 1), 2, 4, '#ffd040'); hR(x + 2 + (k % 2) * 3, y, 3, 1, '#ffd040');
    hR(x - 2, y + 9, 4, 1, '#ff70a0'); hR(x + 3 + ((t >> 1) & 1), y + 13, 2, 1, '#1a1020'); hR(x + 9 - ((t >> 1) & 1), y + 13, 2, 1, '#1a1020');
  } else if (type === 'crystalbug') {
    const g = 0.6 + 0.4 * Math.sin(t * 0.15);
    hR(x + 1, y + 6, 12, 7, '#1a1020'); hR(x + 2, y + 7, 10, 5, '#3a2a6a');
    ctx.globalAlpha = g; hR(x + 3, y + 1, 3, 6, '#80f0ff'); hR(x + 6, y - 1, 3, 8, '#c0a0ff'); hR(x + 9, y + 2, 3, 5, '#80f0ff'); ctx.globalAlpha = 1;
    hR(x + 11, y + 8, 2, 2, '#ffe040'); for (let k = 0; k < 3; k++) hR(x + 2 + k * 4, y + 12 + ((t >> 2) + k) % 2, 2, 2, '#1a1020');
  } else if (type === 'gustbird') {
    const up = (t >> 3) & 1;
    hR(x + 2, y + 3, 11, 7, '#1a1020'); hR(x + 3, y + 4, 9, 5, '#e0f0ff'); hR(x + 9, y + 5, 2, 2, '#1a1020'); hR(x + 12, y + 6, 3, 2, '#ffa020');
    hR(x + 3, y + (up ? -1 : 8), 7, 3, '#1a1020'); hR(x + 4, y + (up ? 0 : 8), 5, 2, '#a0c8ff'); hR(x - 2, y + 5, 5, 1, '#c0e0ff'); hR(x - 4, y + 7, 6, 1, '#c0e0ff');
  }
  ctx.restore();
}
function drawCDragon(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const perch = e && e.state === 'perch', flap = perch ? 0 : Math.sin(t * 0.25) * 6;
  for (let k = 0; k < 2; k++) { const wx = x + 8 + k * 16; for (let s = 0; s < 10; s++) hR(wx - 6 + s, y + 4 - flap * (1 - s / 10) - s * 0.5, 2, 6, s % 2 ? '#80e0ff' : '#c0a0ff'); }
  hR(x + 2, y + 10, 36, 16, '#1a1020'); hR(x + 3, y + 11, 34, 14, '#4a7ad0'); for (let k = 0; k < 6; k++) hR(x + 5 + k * 5, y + 9 - (k % 2) * 2, 3, 4, '#a0f0ff');
  hR(x + 30, y + 4, 14, 12, '#1a1020'); hR(x + 31, y + 5, 12, 10, '#5a8ae0'); hR(x + 39, y + 7, 3, 3, perch ? '#ff4060' : '#ffe040'); hR(x + 42, y + 11, 4, 2, '#e0f0ff');
  hR(x - 8, y + 16, 12, 4, '#1a1020'); hR(x - 7, y + 17, 10, 2, '#4a7ad0'); hR(x - 10, y + 14, 4, 4, '#a0f0ff');
  hR(x + 8, y + 25, 4, 5, '#1a1020'); hR(x + 26, y + 25, 4, 5, '#1a1020');
  if (perch && (frame >> 3) & 1) txt('!', x + 20, y - 10, '#ffe040', { outline: '#1a1020' });
}
function drawDJ(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const pulse = e ? e.pulse || 0 : (t >> 4) & 1 ? 2 : 0, open = e && e.lid > 0;
  hR(x, y + 6, 40, 34, '#1a1020'); hR(x + 1, y + 7, 38, 32, '#3a2a5a'); hR(x + 1, y + 7, 38, 3, '#5a4a8a');
  for (const cy of [16, 30]) { const r = cy === 30 ? 7 + pulse : 5 + (pulse >> 1); for (let yy = -r; yy <= r; yy++) { const w = Math.round(Math.sqrt(r * r - yy * yy)); hR(x + 20 - w, y + cy + yy, w * 2, 1, '#1a1020'); } hR(x + 18, y + cy - 2, 4, 4, '#ff40c0'); }
  if (open) { hR(x + 4, y - 6, 32, 10, '#1a1020'); hR(x + 5, y - 5, 30, 8, '#ffe040'); txt('!', x + 18, y - 18, '#ffe040', { outline: '#1a1020' }); } else { hR(x + 4, y + 2, 32, 5, '#1a1020'); hR(x + 5, y + 3, 30, 3, '#8a7ab0'); }
  hR(x + 6, y + 10, 8, 3, '#40e0ff'); hR(x + 26, y + 10, 8, 3, '#40e0ff');
  hR(x - 4, y + 24, 6, 4, '#1a1020'); hR(x + 38, y + 24, 6, 4, '#1a1020'); hR(x + 6, y + 40, 8, 4, '#1a1020'); hR(x + 26, y + 40, 8, 4, '#1a1020');
}
{ // these show up in boss talk portraits, the bestiary and the gallery
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    if (id === 'cdragon') { ctx.save(); ctx.translate(x, y); ctx.scale(0.5, 0.5); drawCDragon(-20, -16, null, t); ctx.restore(); return; }
    if (id === 'dj') { ctx.save(); ctx.translate(x, y); ctx.scale(0.5, 0.5); drawDJ(-20, -22, null, t); ctx.restore(); return; }
    if (id === 'volt') { drawVolt(x, y + 11, 1, t, 'run'); return; }
    if (['toysoldier', 'windup', 'crystalbug', 'gustbird'].includes(id)) { drawHEnemy(id, x - 7, y - 7, t); return; }
    return _sa(id, x, y, t);
  };
}

// ---------------- slopes ----------------
function slopeSurf(pl, cx, footY) { // the slope surface nearest to footY under x = cx, or null
  const tx = Math.floor(cx / TS), r0 = Math.floor((footY - 1) / TS); let best = null;
  for (let ty = r0 - 1; ty <= r0 + 1; ty++) { const c = pl.tile(tx, ty); if (!isSlope(c)) continue; const lx = cx - tx * TS, s = ty * TS + (c === SL_R ? TS - lx : lx); if (!best || Math.abs(s - footY) < Math.abs(best.s - footY)) best = { s, c }; }
  return best;
}
{
  const _mv = Play.prototype.move;
  Play.prototype.move = function (b, wp) {
    if (!this.hasSlopes) return _mv.call(this, b, wp);
    const was = !!b.onSlope && b.vy >= 0, lift = was ? 8 : 0;
    b.y -= lift;
    _mv.call(this, b, wp);
    b.onSlope = false;
    const cx = b.x + b.w / 2, foot = b.y + b.h, hit = b.vy >= 0 ? slopeSurf(this, cx, foot) : null, dy = hit ? hit.s - foot : 0;
    if (hit && ((dy >= -12 && dy <= 1) || (b._g && dy > 0 && dy <= lift + 10))) { b.y = hit.s - b.h; b.vy = 0; b.onGround = true; b.onSlope = hit.c; b.groundTile = null; }
    else if (was && !b.onGround) { // stepped off the slope: settle onto the flat ground just below, if any
      const ty = Math.floor((foot + lift + 1) / TS), x0 = Math.floor(b.x / TS), x1 = Math.floor((b.x + b.w - 0.01) / TS);
      let got = false; for (let tx = x0; tx <= x1; tx++) if (SOLID.has(this.tile(tx, ty)) && ty * TS - foot <= lift + 1) { b.y = ty * TS - b.h; b.vy = 0; b.onGround = true; b.groundTile = this.tile(tx, ty); got = true; break; }
      if (!got) b.y += lift;
    }
    b._g = b.onGround;
  };
}

// ---------------- the player: belly slide, fans, pound plates, wall-jump for all ----------------
{
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    const p = this.p;
    if (this.mode && this.mode.kind === 'replay') return this.updateReplay();
    if (game && !(game.upgrades && game.upgrades.wall)) { game.upgrades = game.upgrades || {}; game.upgrades.wall = true; }
    const pounding = p.pound === -1, vx0 = p.vx;
    _up.call(this);
    if (this.state !== 'play') return;
    // a ground pound that lands on a pound plate presses it for good, and sends out a shock ring
    if (pounding && p.pound === 0 && p.onGround) {
      const ty = Math.floor((p.y + p.h + 1) / TS);
      for (let tx = Math.floor(p.x / TS); tx <= Math.floor((p.x + p.w - 1) / TS); tx++) if (this.tile(tx, ty) === POUNDP) { this.setTile(tx, ty, POUNDED); Audio8.sfx('check'); this.parts.push({ k: 'text', s: 'CLUNK!', x: tx * TS - 6, y: ty * TS - 20, vy: -0.4, life: 50 }); }
      this.parts.push({ k: 'ring', x: p.x + p.w / 2, y: p.y + p.h, life: 18 });
      for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss && !e.yeti && Math.abs(e.y + e.h - (p.y + p.h)) < 10 && Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < 64) this.flipKill(e);
    }
    // belly slide: hold Down on a slope (or while running) to slide along on your tummy
    const D = Input.down('down');
    if (p.onGround && D && !p.riding && !p.tiny && (p.onSlope || Math.abs(p.vx) > 1.7 || p.sliding)) {
      if (!p.sliding) { Audio8.sfx('swoop'); p.slideKills = 0; }
      p.sliding = true;
      const c = p.onSlope || null;
      if (c) p.vx = clamp(vx0 + (c === SL_R ? -0.24 : 0.24), -4.4, 4.4); else p.vx = approach(vx0, 0, 0.04);
      if (Math.abs(p.vx) < 0.25 && !c) p.sliding = false;
      if (frame % 3 === 0) this.dust(p.x + p.w / 2 - Math.sign(p.vx) * 4, p.y + p.h, 1);
      for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss && !e.yeti && overlap(p, e)) { this.flipKill(e); if (++p.slideKills >= 3) Ach.unlock('slider'); }
    } else if (p.onGround || !D) p.sliding = false;
    // fans blow you upward
    let tx = Math.floor((p.x + p.w / 2) / TS);
    for (const ex of [p.x + 1, p.x + p.w - 1]) { const ax = Math.floor(ex / TS); for (let d = 0; d < 8; d++) { const c = this.tile(ax, Math.floor((p.y + p.h - 1) / TS) + d); if (c === FAN) { tx = ax; break; } if (SOLID.has(c)) break; } }
    for (let d = 0; d < 8; d++) {
      const c = this.tile(tx, Math.floor((p.y + p.h - 1) / TS) + d);
      if (c === FAN) { p.vy = Math.max(-3.1, p.vy - (0.62 + 0.55 * (1 - d / 7))); p.onGround = false; p.pound = 0; if (frame % 4 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2 + ((frame >> 2) % 3 - 1) * 4, y: p.y + p.h, vx: 0, vy: 0.6, life: 10 }); break; }
      if (SOLID.has(c)) break;
    }
  };
  const _pp = Play.prototype.playerPose;
  Play.prototype.playerPose = function () { if (this.mode && this.mode.kind === 'replay' && this.replayPose) return this.replayPose; if (this.p.sliding && this.p.onGround) return 'crouch'; return _pp.call(this); };
  const _wn = Play.prototype.windNow;
  Play.prototype.windNow = function () {
    if (!this.def.gusts) return _wn.call(this);
    const cyc = frame % 420, dir = ((frame / 420) | 0) % 3 === 2 ? -1 : 1;
    return cyc < 180 ? 0 : dir * Math.min(1.15, (cyc - 180) / 30, (420 - cyc) / 30);
  };
}

// ---------------- puzzle rooms, crates, lava chase, signs and the rival ----------------
const SIGN_TIPS = [
  ['HOLD B TO RUN.', 'RUN + JUMP GOES FURTHER!'], ['PRESS DOWN IN THE AIR', 'TO GROUND POUND!'], ['PUSH INTO A WALL IN THE', 'AIR TO SLIDE, THEN JUMP!'],
  ['HOLD DOWN WHILE RUNNING', 'OR ON A SLOPE TO SLIDE!'], ['5 MEDALS AND 3 SIGNAL BARS', 'ARE HIDDEN IN EVERY LEVEL.'], ['S BUTTON: SPECIAL ATTACK.', 'ORBS GIVE YOU 3 MORE.'],
  ['TOUCH THE FLAG HALFWAY', 'TO SAVE YOUR PROGRESS.'], ['HOLD UP AND PRESS B', 'TO LOB A CANNONBALL.'],
];
function levelTip(def, li) {
  if (def.tipLines) return def.tipLines;
  if (def.chase) return ['THE LAVA IS COMING!', 'RUN! DO NOT LOOK BACK!'];
  if (def.lantern) return ['IT IS DARK IN HERE.', 'GLOWING CRYSTALS LIGHT UP!'];
  if (def.gusts) return ['STRONG WINDS AHEAD!', 'FANS BLOW YOU UPWARD.'];
  if (def.water) return ['TAP JUMP TO SWIM UP.', 'MIND THE JELLYFISH!'];
  if (def.ice) return ['ICE IS SLIPPERY.', 'TAKE IT SLOW!'];
  return SIGN_TIPS[li % SIGN_TIPS.length];
}
function levelHint(def, li) {
  if (def.boss) return ['BOSSES ONLY GET HURT', 'FROM ABOVE. LEARN THE', 'PATTERN, THEN POUNCE!'];
  if (def.chase) return ['HOLD B THE WHOLE TIME', 'AND DO NOT STOP FOR', 'COINS. JUST RUN!'];
  if (def.autoscroll) return ['KEEP MOVING RIGHT.', 'THE SCREEN WILL NOT', 'WAIT FOR YOU!'];
  if (def.water) return ['SWIM IN SHORT TAPS.', 'STAY IN THE MIDDLE,', 'AWAY FROM SPIKES.'];
  if (def.puzzle) return ['STUCK? PRESS UP AT', 'THE SIGN TO RESET', 'THE ROOM.'];
  if (def.lantern) return ['WALK SLOWLY IN THE', 'DARK. CRYSTALS SHOW', 'WHERE THE GROUND IS.'];
  return ['GRAB ENERGY DRINKS', 'FOR EXTRA HEARTS. ALSO', 'TRY OPTIONS > ASSIST!'];
}
const RIVAL_LEVELS = [1, 12, 13, 15, 26, 39, 41];
const rivalOK = (pl) => pl.lv.goal && !pl.def.autoscroll && !pl.def.board && !pl.def.sub && !pl.def.shmup && !pl.def.tower && !pl.def.water && !pl.def.boss && !pl.def.chase && !pl.def.miniArena && !pl.def.yetiArena && !pl.def.coasters && !pl.def.minecart && !pl.def.train;
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initH) this.initH();
    const m = this.mode;
    if (m && this.paused && this.pauseSel === 6 && Input.pressed('jump')) { this.paused = false; this.state = 'done'; go(() => modeExit(this, false)); return; }
    _upd.call(this);
    if (this.paused || this.talk || this.photo) return;
    if (m && this.state === 'dying' && this.stateT === 110) { this.state = 'done'; go(() => modeExit(this, false)); return; }
    if (m && this.state === 'clear' && this.stateT === 150) { this.state = 'done'; go(() => modeExit(this, true)); return; }
    if (m && this.state === 'bossdead' && this.stateT === 240) { this.state = 'done'; go(() => modeExit(this, true)); return; }
    if (m && this.state === 'play') this.time = Math.max(this.time, m.kind === 'arena' ? 999 : this.time);
    if (this.state === 'play') this.hF = (this.hF || 0) + 1;
    if (this.state === 'play' && this.recOn && (this.hF & 1) === 0 && this.rec.length < 9000) { const p = this.p; this.rec.push([Math.round(p.x), Math.round(p.y), p.riding ? 'ride' : this.playerPose(), p.skid ? -p.face : p.face]); }
    this.updateCrates();
    if (this.def.puzzle) this.updatePuzzle();
    if (this.def.chase) this.updateChase();
    if (m && m.kind === 'arena') this.updateArena();
  };
  Play.prototype.initH = function () {
    this._initH = true;
    const g = this.lv.grid, W = this.lv.w, normal = !this.ta && !this.rush && !this.daily && !this.endless && !this.def.custom && this.li < LEVELS.length && !this.mode;
    this.hasSlopes = g.some((r) => r.some(isSlope));
    // custom entities placed with special characters in the level layouts
    for (let y = 0; y < 14; y++) for (let x = 0; x < W; x++) {
      const type = H_ENTS[g[y][x]]; if (!type) continue; g[y][x] = '.';
      const X = x * TS, Y = y * TS;
      if (type === 'crate') this.platforms.push({ crate: true, x: X, y: Y, w: 16, h: 16, ox: X, oy: Y, axis: 'c', t: 0, dx: 0, dy: 0, vy: 0 });
      else if (type === 'sign') this.ents.push({ type: 'sign', alive: true, t: 0, x: X + 2, y: Y + 2, w: 12, h: 14, lines: (this.def.signs && this.def.signs[x]) || this.def.signLines || levelTip(this.def, this.li) });
      else if (type === 'crusher') this.ents.push({ type: 'crusher', alive: true, t: (x * 13) % 90, x: X - 6, y: Y, top: Y, w: 28, h: 16, state: 'wait', act: 60 + (x * 7) % 60, hazard: false });
      else if (type === 'gustbird') this.ents.push({ type, alive: true, enemy: true, stomp: true, t: x * 3, x: X, y: Y, oy: Y, ox: X, w: 14, h: 10, vx: -0.7, face: -1 });
      else this.ents.push({ type, alive: true, enemy: true, stomp: true, t: 0, x: X + 1, y: Y + 2, w: 14, h: 14, vx: (type === 'windup' ? -1.35 : -0.45) * DIFF[this.diff].speed, vy: 0, face: -1, cool: 90 });
    }
    if (this.def.dark2) this.def = Object.assign({}, this.def, { lantern: true });
    // a signpost with a tip near the start of normal levels, and the hint owl after a few tries
    if (normal && !this.def.puzzle && !this.def.noSign) {
      const sx = Math.floor(this.p.x / TS);
      for (let x = sx + 3; x < sx + 12; x++) { let gy = -1; for (let y = 4; y < 14; y++) if (SOLID.has(g[y][x]) && g[y - 1][x] === '.' && g[y - 2][x] === '.') { gy = y; break; } if (gy > 0) { this.ents.push({ type: 'sign', alive: true, t: 0, x: x * TS + 2, y: (gy - 1) * TS + 2, w: 12, h: 14, lines: levelTip(this.def, this.li) }); break; } }
      if (game && game.deathsAt && (game.deathsAt[this.li] | 0) >= 3) this.ents.push({ type: 'owl', alive: true, t: 0, x: this.p.x - 22, y: this.p.y - 6, w: 14, h: 14, lines: levelHint(this.def, this.li) });
    }
    // Volt, the rival, races you in some levels
    if ((normal && RIVAL_LEVELS.includes(this.li) && !((game.rival || {})[this.li] === 'won') && rivalOK(this)) || (this.def.rival && this.mode && this.mode.kind === 'story')) {
      const p = this.p; this.ents.push({ type: 'rival', alive: true, t: 0, x: p.x - 14, y: p.y + p.h - 22, w: 10, h: 22, vx: 0, vy: 0, face: 1, wait: 110, stuck: 0, lastX: 0 });
    }
    if (normal && !this.def.puzzle) { this.recOn = true; this.rec = []; }
    if (this.def.chase) { this.lavaX = this.p.x - 170; this.lavaT = 0; }
    if (this.mode && this.mode.kind === 'remix') this.remixLevel();
    if (this.mode && this.mode.kind === 'arena') { this.wave = 0; this.waveT = 90; this.arenaKills = 0; }
    if (this.def.puzzle) { this.puz = { done: false }; }
  };
  // ---- crates: push them sideways, stand on them, drop them onto pressure plates ----
  Play.prototype.crateFree = function (x, y) { const x0 = Math.floor(x / TS), x1 = Math.floor((x + 15.99) / TS), y0 = Math.floor(y / TS), y1 = Math.floor((y + 15.99) / TS); for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (SOLID.has(this.tile(tx, ty))) return false; return true; };
  Play.prototype.updateCrates = function () {
    const p = this.p;
    for (const c of this.platforms) {
      if (!c.crate) continue;
      c.vy = Math.min(5, (c.vy || 0) + 0.35);
      if (this.crateFree(c.ox, c.oy + c.vy)) c.oy += c.vy; else { if (c.vy > 2) { Audio8.sfx('bump'); this.dust(c.ox + 8, c.oy + 16, 2); } c.oy = Math.floor((c.oy + c.vy + 16) / TS) * TS - 16; c.vy = 0; }
      if (c.oy > VH + 30) { c.oy = -20; c.ox = c.sx !== undefined ? c.sx : c.ox; }
      if (c.sx === undefined) c.sx = c.ox;
      if (this.state !== 'play') continue;
      const side = p.y + p.h > c.oy + 3 && p.y < c.oy + 16 && p.platform !== c;
      if (side && p.x + p.w > c.ox && p.x < c.ox + 16) { // push the player out, and shove the crate along
        const fromLeft = p.x + p.w / 2 < c.ox + 8, dir = fromLeft ? 1 : -1;
        if (p.onGround && c.vy === 0 && Input.down(fromLeft ? 'right' : 'left') && this.crateFree(c.ox + dir * 1.1, c.oy)) { c.ox += dir * 1.1; if (frame % 10 === 0) Audio8.sfx('dig'); }
        p.x = fromLeft ? c.ox - p.w : c.ox + 16; p.vx = 0; c.pushT = 8;
      }
      if (c.pushT > 0) c.pushT--; else if (c.vy === 0) { // a crate close to a pressure plate settles onto it
        const tx = Math.floor((c.ox + 8) / TS), ty = Math.floor((c.oy + 8) / TS);
        if (this.tile(tx, ty) === PLATE && this.crateFree(tx * TS, c.oy)) c.ox = approach(c.ox, tx * TS, 0.6);
      }
    }
  };
  Play.prototype.platePressed = function (tx, ty) {
    const p = this.p, cell = { x: tx * TS + 2, y: ty * TS + 8, w: 12, h: 8 };
    if (this.state === 'play' && overlap(p, cell) && p.onGround) return true;
    return this.platforms.some((c) => c.crate && Math.abs(c.ox + 8 - (tx * TS + 8)) < 9 && Math.abs(c.oy + 16 - (ty + 1) * TS) < 3);
  };
  // ---- light beams: emitters fire beams that bounce off crystal mirrors into receivers ----
  Play.prototype.traceBeams = function () {
    const segs = [], lit = new Set(), em = (this.def.puzzle && this.def.puzzle.beams) || [];
    for (const [ex, ey, d0] of em) {
      let x = ex, y = ey, [dx, dy] = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] }[d0], pts = [[x, y]];
      for (let n = 0; n < 120; n++) {
        x += dx; y += dy; const c = this.tile(x, y);
        if (c === MIR_A) { [dx, dy] = [-dy, -dx]; pts.push([x, y]); continue; }
        if (c === MIR_B) { [dx, dy] = [dy, dx]; pts.push([x, y]); continue; }
        if (c === RECV) { lit.add(x + ',' + y); pts.push([x - dx * 0.5, y - dy * 0.5]); break; }
        if (SOLID.has(c) || y < 0 || y > 13 || this.platforms.some((k) => k.crate && Math.floor((k.ox + 8) / TS) === x && Math.floor((k.oy + 8) / TS) === y)) { pts.push([x - dx * 0.5, y - dy * 0.5]); break; }
      }
      segs.push(pts);
    }
    this.beams = segs; this.litRecv = lit;
  };
  Play.prototype.updatePuzzle = function () {
    const g = this.lv.grid, p = this.p, pz = this.puz;
    this.traceBeams();
    // UP while touching a mirror turns it; UP at the sign resets the room
    if (this.state === 'play' && Input.pressed('up')) {
      for (let ty = Math.floor(p.y / TS); ty <= Math.floor((p.y + p.h - 1) / TS); ty++) for (let tx = Math.floor(p.x / TS); tx <= Math.floor((p.x + p.w - 1) / TS); tx++) { const c = this.tile(tx, ty); if (c === MIR_A || c === MIR_B) { this.setTile(tx, ty, c === MIR_A ? MIR_B : MIR_A); Audio8.sfx('zap'); this.parts.push({ k: 'spark', x: tx * TS + 6, y: ty * TS + 6, life: 12 }); } }
      if (this.ents.some((e) => e.type === 'sign' && overlap(p, e))) { Audio8.sfx('warp' in Audio8 ? 'warp' : 'swoop'); const li = this.li, mode = this.mode; this.state = 'done'; go(() => { const s = new Play(li, false); s.mode = mode; return s; }); return; }
    }
    if (pz.done) return;
    let need = 0, have = 0;
    for (let y = 0; y < 14; y++) for (let x = 0; x < this.lv.w; x++) {
      const c = g[y][x];
      if (c === PLATE) { need++; if (this.platePressed(x, y)) have++; } else if (c === RECV) { need++; if (this.litRecv.has(x + ',' + y)) have++; } else if (c === POUNDP) need++; else if (c === POUNDED) { need++; have++; }
    }
    pz.need = need; pz.have = have;
    if (need && have >= need) {
      pz.done = true; Audio8.sfx('secret'); this.shake = 10;
      for (let y = 0; y < 14; y++) for (let x = 0; x < this.lv.w; x++) if (g[y][x] === GATE) { g[y][x] = '.'; this.parts.push({ k: 'dust', x: x * TS + 8, y: y * TS + 8, vx: 0, vy: -0.4, life: 24 }); }
      this.parts.push({ k: 'text', s: 'PUZZLE SOLVED! GATE OPEN!', x: this.cam.x + 40, y: 60, vy: 0, life: 120, fixed: true });
    }
  };
  // ---- lava chase: a wall of molten rock rolls in from the left ----
  Play.prototype.updateChase = function () {
    if (this.state !== 'play' || this.bossLock) return;
    const p = this.p, c = this.def.chase;
    if (++this.lavaT > (c.delay || 150)) this.lavaX += (c.speed || 0.95) * (this.diff === 'easy' ? 0.85 : this.diff === 'hard' ? 1.12 : 1) * (assist('SLOW') ? 0.85 : 1);
    this.lavaX = Math.max(this.lavaX, p.x - 300);
    if (this.lavaT % 40 === 0) Audio8.sfx('dig');
    for (const e of this.ents) if ((e.enemy || e.item) && e.x + e.w < this.lavaX) e.alive = false;
    if (p.x < this.lavaX + 4) this.die();
  };
  // ---- Survival Arena waves ----
  const WAVE_FOES = ['g', 'g', 'p', 'z', 'h', 'c', 'b', 'e', 't', 'μ', 'σ', 'ψ', 'ζ'];
  Play.prototype.updateArena = function () {
    if (this.state !== 'play') return;
    const foes = this.ents.filter((e) => e.enemy && !e.dying).length;
    if (this.waveT > 0) { if (--this.waveT === 0) this.spawnWave(); return; }
    if (foes === 0) {
      this.waveT = 120; Audio8.sfx('check');
      if (this.wave >= 10) Ach.unlock('arena10');
      if (this.wave % 3 === 0) this.ents.push({ type: 'drink', item: true, alive: true, x: 120, y: 40, w: 12, h: 14, vx: 0, vy: 0, rise: 0, t: 0 });
      if (this.wave % 4 === 0) this.ents.push({ type: 'orb', item: true, alive: true, x: 60 + (this.wave * 37) % 140, y: 120, w: 12, h: 14, rise: 0, oy: 120 });
      this.parts.push({ k: 'text', s: `WAVE ${this.wave} CLEAR!`, x: 90, y: 70, vy: 0, life: 100, fixed: true });
    }
  };
  Play.prototype.spawnWave = function () {
    this.wave++; Audio8.sfx('lasercharge');
    const n = Math.min(12, 2 + this.wave), pool = WAVE_FOES.slice(0, Math.min(WAVE_FOES.length, 3 + this.wave));
    for (let k = 0; k < n; k++) {
      const t = pool[(k * 7 + this.wave * 3) % pool.length], x = 2 + ((k * 5 + this.wave * 3) % 12), fly = 'zbeψ'.includes(t);
      if (H_ENTS[t]) { const type = H_ENTS[t]; this.ents.push({ type, alive: true, enemy: true, stomp: true, t: 0, x: x * TS, y: fly ? 50 : 10, oy: fly ? 50 : 10, ox: x * TS, w: 14, h: type === 'gustbird' ? 10 : 14, vx: k % 2 ? 0.5 : -0.5, vy: 0, face: -1, cool: 90 }); } else this.spawn({ t, x, y: fly ? (t === 'b' ? 2 : 4) : 1 });
    }
    this.parts.push({ k: 'text', s: `WAVE ${this.wave}`, x: 104, y: 60, vy: 0, life: 80, fixed: true });
  };
  // ---- Hard Remix: the same level, meaner ----
  Play.prototype.remixLevel = function () {
    const g = this.lv.grid, W = this.lv.w, themes = { grass: 'candy', cave: 'crystal', sky: 'neon', castle: 'haunted', beach: 'desert', snow: 'static', water: 'moon', haunted: 'volcano', airship: 'carnival' };
    this.def = Object.assign({}, this.def, { theme: themes[this.def.theme] || 'neon', remix: true, tipLines: null });
    this.T = Sprites.tiles[this.def.theme] || this.T;
    const harder = { g: 'c', p: 'p', z: 'u', h: 'c', b: 'b' }, extra = [];
    for (const sp of this.lv.spawns) if (harder[sp.t] && sp.x > 12) { if (sp.t === 'g' || sp.t === 'h') sp.t = harder[sp.t]; extra.push({ t: sp.t === 'u' ? 'z' : 'g', x: sp.x + 3, y: sp.y }); }
    for (let x = 30; x < W - 24; x += 23) { const y = g.findIndex((r) => r[x] === '#'); if (y > 3 && g[y - 1][x] === '.' && g[y - 2][x] === '.' && g[y][x - 1] === '#' && g[y][x + 1] === '#') extra.push({ t: x % 2 ? 'p' : 'h', x, y: y - 1 }); }
    for (let y = 0; y < 14; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'P' && (x % 2)) g[y][x] = 'B';
    this.lv.spawns.push(...extra); this.lv.spawns.sort((a, b) => a.x - b.x);
    this.time = Math.ceil(this.time * 0.7 / 5) * 5; this.p.hearts = Math.min(this.p.hearts, 2);
  };
  // ---- replays: play back a recorded run ----
  Play.prototype.updateReplay = function () {
    const r = this.mode.rec, i = Math.floor((this.hF || 0) / 2), p = this.p, f = r[Math.min(r.length - 1, i)];
    if (f) { p.x = f[0]; p.y = f[1]; this.replayPose = f[2] === 'ride' ? 'jump' : f[2]; p.face = f[3] || 1; p.vx = 0; p.vy = 0; p.inv = 10; }
    if (i >= r.length + 40 && this.state === 'play') { this.state = 'done'; go(() => modeExit(this, true)); }
  };
  const _hurt = Play.prototype.hurt;
  Play.prototype.hurt = function (s) { if (this.mode && this.mode.kind === 'replay') return; return _hurt.call(this, s); };
  const _die = Play.prototype.die;
  Play.prototype.die = function () {
    if (this.mode && this.mode.kind === 'replay') return;
    if (this.state === 'play' && !this.mode && !this.ta && !this.rush && !this.daily && !this.endless && !this.def.custom && this.li < LEVELS.length && !this._p2ctx && game) { game.deathsAt = game.deathsAt || {}; game.deathsAt[this.li] = (game.deathsAt[this.li] | 0) + 1; }
    return _die.call(this);
  };
  const _clear = Play.prototype.clear;
  Play.prototype.clear = function (s) {
    if (this.mode && this.mode.kind === 'replay') return;
    const was = this.state; _clear.call(this, s);
    if (was !== 'play' || this.state !== 'clear') return;
    const rv = this.ents.find((e) => e.type === 'rival');
    if (rv && !rv.won) { rv.lost = true; game.rival = game.rival || {}; game.rival[this.li] = 'won'; Ach.unlock('rival'); for (let k = 0; k < 20; k++) this.addCoin(); this.parts.push({ k: 'text', s: 'YOU BEAT VOLT! +20 COINS', x: this.p.x - 50, y: this.p.y - 44, vy: -0.2, life: 140 }); }
    if (game && game.deathsAt) delete game.deathsAt[this.li];
    if (this.def.puzzle) { this.runStars = 7; game.stars[this.li] = 7; if ([45, 46, 47].every((k) => game.cleared[k] || k === this.li)) Ach.unlock('puzzles'); }
    if (this.recOn && this.rec.length) Replays.save(this.li, this.hF || 0, this.rec);
    if (this.recOn) BestTimes.submit(this.li, this.hF || 0);
  };
  const _as = Play.prototype.awardStars;
  Play.prototype.awardStars = function () { if (this.mode) { this.runStars = undefined; return; } return _as.call(this); };
}
function modeExit(pl, won) {
  const m = pl.mode;
  if (m.kind === 'arena') return ArenaResult(pl.wave || 0, pl.arenaKills || 0);
  if (m.kind === 'remix') { if (won) { RemixSave(pl.li); Ach.unlock('remix'); } return RemixScene(m.sel || 0, won ? 'REMIX CLEARED!' : 'TRY AGAIN!'); }
  if (m.kind === 'story') { if (game && m.hero) game.hero = m.hero; return won ? StoryWin(m.ch) : StoryMenu(m.ch); }
  if (m.kind === 'replay') return ReplaysScene(m.sel || 0);
  return TitleScene();
}

// ---------------- new enemies, hazards, the rival and the bosses ----------------
{
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.type === 'rival') return this.updateRival(e);
    if (e.type === 'sign' || e.type === 'owl') { e.t++; e.near = this.state === 'play' && Math.abs(p.x + p.w / 2 - (e.x + 7)) < 18 && Math.abs(p.y + p.h - (e.y + e.h)) < 30; return; }
    if (e.type === 'cdragon') return this.updateCDragon(e);
    if (e.type === 'dj') return this.updateDJ(e);
    if (e.type === 'volt') return this.updateVoltBoss(e);
    if (e.type === 'crusher') {
      e.t++;
      if (e.state === 'wait') { e.hazard = false; if (--e.act <= 0) { e.state = 'fall'; e.vy = 0; } }
      else if (e.state === 'fall') { e.hazard = true; e.vy = Math.min(7, (e.vy || 0) + 0.6); e.y += e.vy; const ty = Math.floor((e.y + e.h) / TS); if (SOLID.has(this.tile(Math.floor((e.x + 14) / TS), ty))) { e.y = ty * TS - e.h; e.state = 'down'; e.act = 40; if (Math.abs(e.x - p.x) < 200) { this.shake = 6; Audio8.sfx('bump'); this.dust(e.x + 14, e.y + e.h, 3); } } }
      else if (e.state === 'down') { e.hazard = false; if (--e.act <= 0) e.state = 'rise'; }
      else { e.y -= 0.8; if (e.y <= e.top) { e.y = e.top; e.state = 'wait'; e.act = 70; } }
      if (e.hazard && this.state === 'play' && overlap(p, e) && p.y + p.h > e.y + 6) this.hurt();
      return;
    }
    if (['shard', 'note', 'wave', 'bolt', 'cork', 'blast2'].includes(e.type)) {
      e.t++; e.x += e.vx || 0; e.y += e.vy || 0; if (e.g) e.vy += e.g;
      if (e.type === 'shard' && SOLID.has(this.tile(Math.floor((e.x + 4) / TS), Math.floor((e.y + 8) / TS)))) { e.alive = false; this.parts.push({ k: 'frag', x: e.x, y: e.y, vx: -1, vy: -2, g: 0.3, life: 20 }); return; }
      if (e.t > (e.life || 240) || e.y > VH + 20) { e.alive = false; return; }
      if (this.state === 'play' && overlap(p, e) && !(e.warn > e.t)) this.hurt();
      return;
    }
    if (['toysoldier', 'windup', 'crystalbug', 'gustbird'].includes(e.type) && !e.dying && !e.iced && !(this.freezeT > 0) && e.x < this.cam.x + VW + 64) {
      if (e.type === 'gustbird') { e.x += e.vx; e.y = e.oy + Math.sin((e.t || 0) * 0.05) * 22 + this.windNow() * 6; e.face = Math.sign(e.vx) || -1; if (Math.abs(e.x - e.ox) > 110) e.vx = -e.vx; }
      else {
        e.vy = Math.min(5, (e.vy || 0) + 0.3);
        if (e.onGround && !this.groundAhead(e) && e.type !== 'crystalbug') e.vx = -e.vx;
        if (e.type === 'toysoldier') { if (--e.cool <= 0 && Math.abs(p.x - e.x) < 180) { e.cool = 130; e.face = p.x < e.x ? -1 : 1; this.ents.push({ type: 'cork', alive: true, hazard: true, t: 0, x: e.x + 4, y: e.y + 6, w: 6, h: 4, vx: e.face * 2.1, life: 120 }); Audio8.sfx('kick'); } if (e.cool > 100) { e.t++; return _ue.call(this, e); } }
        const vx = e.vx; this.move(e, true); if (e.hitWall) e.vx = -Math.sign(vx) * Math.abs(vx); e.face = Math.sign(e.vx) || e.face;
      }
    }
    return _ue.call(this, e);
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (['toysoldier', 'windup', 'crystalbug', 'gustbird'].includes(e.type)) { if (e.dying === 'squish') { ctx.save(); ctx.translate(x + 7, y + 14); ctx.scale(1.2, 0.4); drawHEnemy(e.type, -7, -14, frame, e.face); ctx.restore(); return; } if (e.dying === 'flip') { ctx.save(); ctx.translate(x + 7, y + 7); ctx.scale(1, -1); drawHEnemy(e.type, -7, -7, frame, e.face); ctx.restore(); return; } drawHEnemy(e.type, x, y, frame + (e.t || 0), e.face); return; }
    if (e.type === 'rival') { if (!e.gone) drawVolt(x + 5, y + 22, e.face, frame, e.onGround && Math.abs(e.vx) > 0.2 ? 'run' : 'idle'); if (e.say && e.sayT > 0) { const w = Font.width(e.say) + 8; drawWindow(clamp(x + 5 - w / 2, 2, VW - w - 2), y - 22, w, 14); txt(e.say, clamp(x + 5, w / 2 + 2, VW - w / 2 - 2), y - 18, '#5aa0ff', { align: 'center' }); } return; }
    if (e.type === 'sign') { hR(x + 5, y + 6, 3, 8, '#5a3418'); hR(x - 1, y - 2, 15, 10, '#1a1020'); hR(x, y - 1, 13, 8, '#c08848'); hR(x + 2, y + 1, 9, 1, '#6a4020'); hR(x + 2, y + 3, 7, 1, '#6a4020'); if (!e.near && (frame >> 4) & 1) txt('?', x + 4, y - 12, '#ffe040', { outline: '#1a1020' }); return; }
    if (e.type === 'owl') { const b = (frame >> 4) & 1; hR(x, y + b, 14, 14, '#1a1020'); hR(x + 1, y + 1 + b, 12, 12, '#a07040'); hR(x + 2, y + 3 + b, 4, 4, '#ffffff'); hR(x + 8, y + 3 + b, 4, 4, '#ffffff'); hR(x + 3, y + 4 + b, 2, 2, '#1a1020'); hR(x + 9, y + 4 + b, 2, 2, '#1a1020'); hR(x + 6, y + 7 + b, 2, 2, '#ffb020'); hR(x + 1, y - 1 + b, 3, 2, '#a07040'); hR(x + 10, y - 1 + b, 3, 2, '#a07040'); if (!e.near && (frame >> 4) & 1) txt('!', x + 5, y - 12, '#ffe040', { outline: '#1a1020' }); return; }
    if (e.type === 'crusher') { hR(x + 12, 0, 4, y, '#4a4a5a'); hR(x + 13, 0, 1, y, '#8a8aa0'); hR(x, y, 28, 16, '#1a1020'); hR(x + 1, y + 1, 26, 14, '#ff5060'); hR(x + 1, y + 1, 26, 3, '#ffb0b8'); for (let k = 0; k < 6; k++) hR(x + 2 + k * 4, y + 13, 3, 3, '#ffe040'); if (e.state === 'wait' && e.act < 30 && (frame >> 2) & 1) hR(x + 10, y + 6, 8, 3, '#ffffff'); return; }
    if (e.type === 'cork') { hR(x, y, 6, 4, '#1a1020'); hR(x + 1, y + 1, 4, 2, '#d0a060'); return; }
    if (e.type === 'shard') { if (e.warn > e.t) { if ((frame >> 2) & 1) { hR(x, 26, 8, 2, '#ff4060'); txt('!', x + 1, 30, '#ff4060'); } return; } hR(x + 2, y, 4, 12, '#1a1020'); hR(x + 3, y + 1, 2, 10, '#a0f0ff'); hR(x + 1, y + 8, 6, 3, '#c0a0ff'); return; }
    if (e.type === 'note') { if (e.warn > e.t) { if ((frame >> 2) & 1) txt('!', x + 2, 34, '#ff40c0', { outline: '#1a1020' }); return; } hR(x + 1, y + 6, 7, 6, '#1a1020'); hR(x + 2, y + 7, 5, 4, '#ff40c0'); hR(x + 6, y - 2, 2, 10, '#1a1020'); hR(x + 6, y - 2, 5, 3, '#1a1020'); hR(x + 7, y - 1, 3, 1, '#ff40c0'); return; }
    if (e.type === 'wave') { for (let k = 0; k < 3; k++) { ctx.strokeStyle = k ? 'rgba(255,64,192,0.6)' : '#5ff0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 6 + k * 3, y + e.h, e.h - k * 2, Math.PI, Math.PI * 1.5 + (e.vx > 0 ? Math.PI * 0.5 : 0)); ctx.stroke(); } return; }
    if (e.type === 'blast2') { ctx.strokeStyle = (frame >> 1) & 1 ? '#ffe040' : '#ff40c0'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x + 6 - k * 4, y + 6, 3, 6 + k, 0, 0, Math.PI * 2); ctx.stroke(); } return; }
    if (e.type === 'bolt') { hR(x, y, 8, 8, '#1a1020'); hR(x + 1, y + 1, 6, 6, (frame >> 1) & 1 ? '#ffe040' : '#5aa0ff'); return; }
    if (e.type === 'cdragon') { if (e.dying) { ctx.save(); ctx.translate(x + 20, y + 16); ctx.scale(1, -1); drawCDragon(-20, -16, e, frame); ctx.restore(); return; } drawCDragon(x, y, e, frame); return; }
    if (e.type === 'dj') { drawDJ(x, y, e, frame); return; }
    if (e.type === 'volt') { if (e.inv > 0 && (frame >> 2) & 1) return; drawVolt(x + 7, y + e.h, e.face, frame, e.state === 'dash' || e.state === 'run' ? 'run' : 'idle'); if (e.state === 'tired') txt('ZZ', x + 4, y - 12, '#a0c8ff', { outline: '#1a1020' }); return; }
    return _de.call(this, e, cx);
  };
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    if (sp.t === '*' && ['cdragon', 'dj', 'volt'].includes(this.def.bossType)) {
      const bt = this.def.bossType, hp0 = (this.def.bossHp || 6) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0), X = sp.x * TS;
      const base = { type: bt, boss: true, enemy: true, alive: true, t: 0, hp: hp0, maxHp: hp0, inv: 0, act: 90, vx: 0, vy: 0, state: 'idle' };
      if (bt === 'cdragon') this.ents.push(Object.assign(base, { x: X - 30, y: 40, w: 40, h: 26 }));
      if (bt === 'dj') this.ents.push(Object.assign(base, { x: X - 8, y: 11 * TS + 16 - 44 - 4, w: 40, h: 44, lid: 0, lastBeat: -1, beatN: 0 }));
      if (bt === 'volt') this.ents.push(Object.assign(base, { x: X, y: 12 * TS - 22, w: 12, h: 22, face: -1 }));
      return;
    }
    return _sp.call(this, sp);
  };
  const stompBoss = function (e) {
    const p = this.p;
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return false;
    if (p.vy > 0 && p.prevBottom <= e.y + 10 && e.weak !== false) { p.vy = -6.5; this.damageBoss(e); return true; }
    this.hurt(); return false;
  };
  Play.prototype.updateCDragon = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    if (!this.bossLock || this.talk || this._p2ctx) { e.y = 40 + Math.sin(frame * 0.05) * 6; return; }
    e.t++; const rage = e.maxHp - e.hp, L = this.camMin, R = this.camMin + VW;
    if (e.state === 'idle') {
      e.x += (e.dir || -1) * (1 + rage * 0.1); e.y = 36 + Math.sin(e.t * 0.06) * 14;
      if (e.x < L + 6) e.dir = 1; if (e.x > R - 52) e.dir = -1;
      if (--e.act <= 0) { const k = (e.n = (e.n || 0) + 1) % 3; e.state = k === 1 ? 'shards' : k === 2 ? 'swoop' : 'perchgo'; e.act = 60; if (e.state === 'swoop') { e.tx = p.x; e.ty = p.y; Audio8.sfx('roar'); } }
    } else if (e.state === 'shards') {
      if (e.act % 12 === 0) { const sx = clamp(p.x + ((e.act * 37) % 90) - 45, L + 8, R - 16); this.ents.push({ type: 'shard', alive: true, t: 0, warn: 40, x: sx, y: 20, w: 8, h: 12, vy: 0, g: 0, life: 200 }); }
      for (const s of this.ents) if (s.type === 'shard' && s.t === s.warn) { s.vy = 3.4 + rage * 0.15; Audio8.sfx('spark'); }
      e.y = 36 + Math.sin(e.t * 0.06) * 6; if (--e.act <= 0) { e.state = 'idle'; e.act = 70 - rage * 4; }
    } else if (e.state === 'swoop') {
      const dx = e.tx - (e.x + 20), dy = e.ty - (e.y + 13); e.x += clamp(dx * 0.06, -3.5, 3.5); e.y += clamp(dy * 0.06, -3, 3.5);
      if (--e.act <= 0) { e.state = 'rise'; e.act = 40; }
    } else if (e.state === 'rise') { e.y = Math.max(30, e.y - 2); if (--e.act <= 0) { e.state = 'idle'; e.act = 60; } }
    else if (e.state === 'perchgo') { // lands on the ground: its head is open to a stomp
      const gy = 12 * TS - e.h; e.y = Math.min(gy, e.y + 2.5); if (e.y >= gy) { e.state = 'perch'; e.act = 120 - rage * 6; this.shake = 8; Audio8.sfx('bump'); this.dust(e.x + 20, 12 * TS, 4); }
    } else if (e.state === 'perch') { if (--e.act <= 0) { e.state = 'rise'; e.act = 40; } }
    e.weak = e.state === 'perch';
    if (stompBoss.call(this, e) && e.alive) { e.state = 'rise'; e.act = 40; }
  };
  // ---- DJ Decibel: every attack lands on the beat of the music ----
  Play.prototype.beatNow = function () {
    const st = Audio8.songStep(), cur = Audio8.current && Audio8.current();
    if (st >= 0 && cur === 'bossbeat') return st / 4;
    this._fb = (this._fb || 0) + 1 / 30; return this._fb;
  };
  Play.prototype.updateDJ = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    e.pulse = Math.max(0, (e.pulse || 0) - 0.3);
    if (!this.bossLock || this.talk || this._p2ctx) return;
    const bt = this.beatNow(), b = Math.floor(bt), rage = e.maxHp - e.hp, floorY = 12 * TS;
    this.beatPhase = bt - b; this.beatIdx = b;
    if (b !== e.lastBeat) {
      e.lastBeat = b; e.beatN++; e.pulse = 3; const k = e.beatN % 4, bar = Math.floor(e.beatN / 4);
      if (e.beatN > 2) {
        if (k === 0) { if (bar % 2 === 0) this.ents.push({ type: 'wave', alive: true, t: 0, x: e.x - 8, y: floorY - 14, w: 12, h: 14, vx: -2.2 - rage * 0.12, life: 200 }); else this.ents.push({ type: 'blast2', alive: true, t: 0, x: e.x - 8, y: floorY - 40, w: 10, h: 12, vx: -2.4 - rage * 0.1, life: 200 }); Audio8.sfx('bosshit'); }
        if (k === 1 || (k === 2 && rage >= 3)) { this.ents.push({ type: 'note', alive: true, t: 0, warn: 30, x: clamp(p.x, this.camMin + 4, this.camMin + VW - 60), y: 24, w: 10, h: 12, vy: 0, life: 160 }); }
        if (k === 3) { e.lid = 70 - rage * 4; Audio8.sfx('spring'); }
      }
    }
    for (const s of this.ents) if (s.type === 'note' && s.t === s.warn) s.vy = 3.6;
    if (e.lid > 0) e.lid--;
    e.weak = e.lid > 0;
    stompBoss.call(this, e);
  };
  // ---- Volt as a boss: dashes, lightning, then runs out of puff ----
  Play.prototype.updateVoltBoss = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    e.vy = Math.min(6, e.vy + 0.3); this.move(e, false);
    if (!this.bossLock || this.talk || this._p2ctx) return;
    const L = this.camMin + 8, R = this.camMin + VW - 20, rage = e.maxHp - e.hp;
    if (--e.act <= 0) {
      if (e.state === 'idle' || e.state === 'tired') { e.state = (e.n = (e.n || 0) + 1) % 2 ? 'dash' : 'zap'; e.act = e.state === 'dash' ? 90 : 70; e.face = p.x < e.x ? -1 : 1; if (e.state === 'dash') Audio8.sfx('swoop'); }
      else { e.state = 'tired'; e.act = 110 - rage * 10; e.vx = 0; }
    }
    if (e.state === 'dash') { e.vx = e.face * (3 + rage * 0.3); if (e.x < L) { e.x = L; e.face = 1; } if (e.x > R) { e.x = R; e.face = -1; } if (e.onGround && e.act % 30 === 0) e.vy = -4; }
    else if (e.state === 'zap') { e.vx = 0; if (e.act % 22 === 0) { const d = p.x < e.x ? -1 : 1; this.ents.push({ type: 'bolt', alive: true, t: 0, x: e.x + 2, y: e.y + 4, w: 8, h: 8, vx: d * 2.2, vy: -3.6, g: 0.16, life: 120 }); Audio8.sfx('zap'); } }
    else e.vx = 0;
    e.weak = e.state === 'tired';
    stompBoss.call(this, e);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) {
    const mine = ['cdragon', 'dj', 'volt'].includes(e.type), a = e.alive, sa = Sticker.add;
    if (mine) Sticker.add = () => {};
    try { _db.call(this, e); } finally { Sticker.add = sa; }
    if (mine && a && !e.alive) {
      Bestiary.add(e.type); this.ents.forEach((k) => { if (['shard', 'note', 'wave', 'bolt', 'blast2'].includes(k.type)) k.alive = false; });
      if (e.type === 'cdragon') Ach.unlock('crystal'); if (e.type === 'dj') Ach.unlock('dj');
    }
  };
  // ---- the rival: runs, jumps gaps and walls, and zaps back if he falls ----
  Play.prototype.updateRival = function (e) {
    const p = this.p, goalX = this.lv.goal ? this.lv.goal.x * TS : this.lv.w * TS;
    e.t++; if (e.sayT > 0) e.sayT--;
    if (e.t === 1) { e.say = ['RACE YOU TO THE FLAG!', 'TRY TO KEEP UP!', 'TOO SLOW, AS USUAL?'][this.li % 3]; e.sayT = 100; }
    if (e.won || e.lost) { e.vx = 0; e.vy = Math.min(5, e.vy + 0.3); this.move(e, false); if (e.lost && !e.gone && e.t % 120 === 0) { e.say = 'NO FAIR! REMATCH!'; e.sayT = 80; } return; }
    if (this.state !== 'play' && this.state !== 'clear') return;
    if (e.wait > 0) { e.wait--; e.vy = Math.min(5, e.vy + 0.3); this.move(e, false); if (e.wait === 1) { e.say = 'GO!'; e.sayT = 30; Audio8.sfx('zap'); } return; }
    const sp = (this.def.rivalSpeed || 2.05) * (this.diff === 'easy' ? 0.88 : this.diff === 'hard' ? 1.08 : 1);
    e.vx = sp; e.face = 1; e.vy = Math.min(5.5, e.vy + 0.42);
    const ahead = (dx) => { const tx = Math.floor((e.x + e.w / 2 + dx) / TS); for (let ty = Math.floor((e.y + e.h) / TS); ty < 14; ty++) if (SOLID.has(this.tile(tx, ty)) || this.tile(tx, ty) === '=' || isSlope(this.tile(tx, ty))) return ty - Math.floor((e.y + e.h) / TS) < 4; return false; };
    if (e.onGround && (!ahead(18) || !ahead(30) || e.hitWall)) { e.vy = -6.4; Audio8.sfx('jump'); }
    this.move(e, true);
    for (let ty = Math.floor(e.y / TS); ty <= Math.floor((e.y + e.h - 1) / TS); ty++) if (this.tile(Math.floor((e.x + 5) / TS), ty) === 'L') e.y = VH + 99;
    if (e.x - e.lastX < 0.3) e.stuck++; else e.stuck = 0; e.lastX = e.x;
    if (e.y > VH || e.stuck > 50) { // zap forward to the next safe ground
      for (let tx = Math.floor(e.x / TS) + 2; tx < this.lv.w; tx++) { let gy = -1; for (let ty = 2; ty < 14; ty++) if (SOLID.has(this.tile(tx, ty)) && this.tile(tx, ty) !== '^' && !SOLID.has(this.tile(tx, ty - 1)) && !SOLID.has(this.tile(tx, ty - 2))) { gy = ty; break; } if (gy > 0) { e.x = tx * TS + 3; e.y = gy * TS - e.h; e.vy = 0; e.stuck = 0; this.parts.push({ k: 'spark', x: e.x, y: e.y, life: 14 }); break; } }
    }
    if (e.x >= goalX && this.state === 'play') { e.won = true; e.say = 'I WIN! BETTER LUCK NEXT TIME!'; e.sayT = 200; Audio8.sfx('pause'); game.rival = game.rival || {}; if (game.rival[this.li] !== 'won') game.rival[this.li] = 'lost'; }
  };
}

// ---------------- drawing: new tiles, darkness, lava wall, beams, gusts, hints ----------------
{
  const topCol = {};
  const tc = (pl) => { const k = pl.def.theme; if (!topCol[k]) { try { const d = pl.T.top.getContext('2d').getImageData(4, 1, 1, 1).data; const f = pl.T.fill.getContext('2d').getImageData(8, 8, 1, 1).data; topCol[k] = [`rgb(${d[0]},${d[1]},${d[2]})`, `rgb(${f[0]},${f[1]},${f[2]})`]; } catch (er) { topCol[k] = ['#5ad84a', '#a0602e']; } } return topCol[k]; };
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    _dt.call(this, cx);
    const t0 = Math.floor(cx / TS);
    for (let ty = 0; ty < 14; ty++) for (let tx = t0; tx <= t0 + 16; tx++) {
      const c = this.tile(tx, ty); if (c === '.' || tx < 0 || tx >= this.lv.w) continue;
      const X = tx * TS - cx, Y = ty * TS;
      if (c === SL_R || c === SL_L) {
        const [top, fill] = tc(this); ctx.fillStyle = fill;
        for (let k = 0; k < 16; k++) { const h = c === SL_R ? k + 1 : 16 - k; ctx.fillRect(X + k, Y + 16 - h, 1, h); }
        ctx.fillStyle = top; for (let k = 0; k < 16; k++) { const h = c === SL_R ? k + 1 : 16 - k; ctx.fillRect(X + k, Y + 16 - h, 1, 3); }
      } else if (c === FAN) {
        hR(X, Y, 16, 16, '#1a1020'); hR(X + 1, Y + 1, 14, 14, '#7a8090'); hR(X + 1, Y + 1, 14, 2, '#b0b8c8');
        const a = (frame * 0.5) % 4; for (let k = 0; k < 4; k++) { const w = Math.abs(Math.cos((a + k) * Math.PI / 4)) * 5 + 1; hR(X + 8 - w, Y + 4 + k * 3, w * 2, 2, '#d0e0f0'); }
        ctx.fillStyle = 'rgba(220,240,255,0.35)'; for (let k = 0; k < 3; k++) { const yy = Y - ((frame * 2 + k * 30) % 100); ctx.fillRect(X + 3 + k * 4, yy, 1, 8); }
      } else if (c === CRYS) {
        const gl = 0.75 + 0.25 * Math.sin(frame * 0.08 + tx);
        hR(X, Y, 16, 16, '#1a1020'); hR(X + 1, Y + 1, 14, 14, '#2a3a6a'); ctx.globalAlpha = gl; hR(X + 3, Y + 2, 4, 12, '#80f0ff'); hR(X + 8, Y + 4, 4, 10, '#c0a0ff'); hR(X + 4, Y + 3, 1, 6, '#ffffff'); ctx.globalAlpha = 1;
      } else if (c === GATE) {
        hR(X + 2, Y, 12, 16, '#1a1020'); for (let k = 0; k < 3; k++) hR(X + 3 + k * 4, Y, 2, 16, '#c0a040'); hR(X + 2, Y + 7, 12, 2, '#806020'); if (this.tile(tx, ty - 1) !== GATE) hR(X + 1, Y, 14, 3, '#ffd040');
      } else if (c === PLATE) {
        const on = this.platePressed(tx, ty); hR(X + 1, Y + (on ? 14 : 11), 14, on ? 2 : 5, '#1a1020'); hR(X + 2, Y + (on ? 14 : 12), 12, on ? 1 : 3, on ? '#5ae060' : '#e05050');
      } else if (c === POUNDP || c === POUNDED) {
        hR(X, Y, 16, 16, '#1a1020'); hR(X + 1, Y + 1, 14, 14, c === POUNDED ? '#5ae060' : '#e0a040'); hR(X + 3, Y + 3, 10, 2, '#ffffff'); txt(c === POUNDED ? '#' : 'V', X + 5, Y + 6, '#1a1020');
      } else if (c === EMIT) {
        hR(X, Y, 16, 16, '#1a1020'); hR(X + 1, Y + 1, 14, 14, '#4a4a6a'); hR(X + 5, Y + 5, 6, 6, (frame >> 2) & 1 ? '#ffe040' : '#fff0a0');
      } else if (c === RECV) {
        const lit = this.litRecv && this.litRecv.has(tx + ',' + ty); hR(X, Y, 16, 16, '#1a1020'); hR(X + 1, Y + 1, 14, 14, lit ? '#ffe040' : '#3a3a58'); hR(X + 4, Y + 4, 8, 8, lit ? '#ffffff' : '#6a6a90');
      } else if (c === MIR_A || c === MIR_B) {
        ctx.fillStyle = '#1a1020'; for (let k = 0; k < 16; k++) ctx.fillRect(X + (c === MIR_A ? 15 - k : k) - 1, Y + k, 4, 1);
        ctx.fillStyle = '#c0f8ff'; for (let k = 1; k < 15; k++) ctx.fillRect(X + (c === MIR_A ? 15 - k : k), Y + k, 2, 1);
        if (this.state === 'play' && overlap(this.p, { x: tx * TS, y: Y, w: 16, h: 16 }) && (frame >> 4) & 1) txt('^', X + 5, Y - 9, '#ffe040', { outline: '#1a1020' });
      }
    }
  };
  const _dpl = Play.prototype.drawPlatform;
  Play.prototype.drawPlatform = function (pl, cx) {
    if (!pl.crate) return _dpl.call(this, pl, cx);
    const x = Math.round(pl.x - cx), y = Math.round(pl.y);
    hR(x, y, 16, 16, '#1a1020'); hR(x + 1, y + 1, 14, 14, '#c08848'); hR(x + 1, y + 1, 14, 2, '#e8b878'); hR(x + 2, y + 7, 12, 2, '#7a4a20'); hR(x + 7, y + 2, 2, 12, '#7a4a20');
  };
  const _dn = Play.prototype.drawNight;
  Play.prototype.drawNight = function (cx) {
    const p = this.p;
    if (this.beams) for (const pts of this.beams) { ctx.strokeStyle = 'rgba(255,240,140,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([bx, by], i) => { const X = bx * TS + 8 - cx, Y = by * TS + 8; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); }
    if (this.def.chase && this.lavaX !== undefined) {
      const lx = Math.round(this.lavaX - cx);
      if (lx > -40) {
        for (let y = 0; y < VH; y += 4) { const w = lx + Math.round(Math.sin(y * 0.15 + frame * 0.2) * 5); hR(0, y, Math.max(0, w), 4, y % 8 ? '#ff6a10' : '#ffa030'); hR(Math.max(0, w), y, 3, 4, '#ffe060'); }
        for (let k = 0; k < 8; k++) hR(lx - 10 - ((frame * 2 + k * 23) % 60), (k * 29 + frame) % VH, 3, 3, '#ffe060');
      }
      if (lx < -40 && (frame >> 4) & 1) txt('< LAVA', 6, 112, '#ff8040', { outline: '#1a1020' });
    }
    if (this.def.gusts) { const w = this.windNow(); if (Math.abs(w) > 0.2) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (let k = 0; k < 18; k++) { const yy = (k * 47) % 200 + 12, xx = ((k * 97 + frame * 7 * Math.sign(w)) % (VW + 60) + VW + 60) % (VW + 60) - 30; ctx.fillRect(xx, yy, 14 + (k % 3) * 6, 1); } } }
    _dn.call(this, cx);
    if (this.def.lantern) {
      const dk = this._dk || (this._dk = Sprites.canvas(VW, VH)), d = dk.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, VW, VH); d.fillStyle = 'rgba(4,2,16,0.93)'; d.fillRect(0, 0, VW, VH);
      d.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r) => { const gr = d.createRadialGradient(x, y, r * 0.35, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.fillRect(x - r, y - r, r * 2, r * 2); };
      hole(p.x + p.w / 2 - cx, p.y + p.h / 2, 70 + Math.sin(frame * 0.3) * 2 + (this.def.puzzle ? 30 : 0));
      const t0 = Math.floor(cx / TS);
      for (let ty = 0; ty < 14; ty++) for (let tx = t0 - 2; tx <= t0 + 18; tx++) { const c = this.tile(tx, ty); if (c === CRYS) hole(tx * TS + 8 - cx, ty * TS + 8, 40); else if (c === 'L' || c === EMIT || c === RECV) hole(tx * TS + 8 - cx, ty * TS + 8, 26); }
      for (const e of this.ents) if (e.type === 'crystalbug' || e.type === 'goal' || e.type === 'checkpoint' || e.type === 'sign' || e.type === 'cdragon') hole(e.x + e.w / 2 - cx, e.y + Math.min(e.h, 20) / 2, e.type === 'goal' ? 46 : 30);
      if (this.beams) for (const pts of this.beams) for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay))); for (let s = 0; s <= n; s++) hole((ax + (bx - ax) * s / n) * TS + 8 - cx, (ay + (by - ay) * s / n) * TS + 8, 22); }
      ctx.drawImage(dk, 0, 0);
    }
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _hud.call(this);
    const m = this.mode, cx = Math.round(this.cam.x);
    if (m && m.kind === 'arena') { hR(104, 4, 46, 19, '#101830'); txt('WAVE', 112, 6, '#ff8080'); txt(String(this.wave || 0), 117, 15, '#fff'); }
    if (m && m.kind === 'replay') { if ((frame >> 5) & 1) txt('REPLAY', 128, 30, '#ff6060', { align: 'center', outline: '#101848' }); txt(fmtTime(m.frames || 0), 128, 40, '#fff', { align: 'center', outline: '#101848' }); txt('START: EXIT', 128, 212, '#a8b0d8', { align: 'center', outline: '#101848' }); }
    if (m && m.kind === 'remix' && this.hF < 200) txt('HARD REMIX!', 128, 40, '#ff6060', { align: 'center', scale: 2, outline: '#3a0010' });
    if (this.def.puzzle && this.puz && !this.puz.done && this.puz.need) txt(`PUZZLE ${this.puz.have}/${this.puz.need}`, 128, 30, '#ffe040', { align: 'center', outline: '#101848' });
    // DJ Decibel's beat lights
    if (this.def.bossType === 'dj' && this.bossLock && this.beatIdx !== undefined) for (let k = 0; k < 4; k++) { const on = (this.ents.find((e) => e.type === 'dj') || { beatN: 0 }).beatN % 4 === k; hR(104 + k * 12, 36, 9, 9, '#1a1020'); hR(105 + k * 12, 37, 7, 7, on ? (k === 3 ? '#ffe040' : '#ff40c0') : '#3a2a5a'); }
    // speech bubbles for signs, the hint owl and the rival
    for (const e of this.ents) if ((e.type === 'sign' || e.type === 'owl') && e.near) {
      const lines = e.lines || [], w = Math.max(...lines.map((l) => Font.width(l))) + 14, h = lines.length * 10 + 8 + (e.type === 'owl' ? 10 : 0), x = clamp(e.x + 7 - cx - w / 2, 4, VW - w - 4), y = 34;
      drawWindow(x, y, w, h); if (e.type === 'owl') txt('PROFESSOR HOOT:', x + 7, y + 5, '#ffb020');
      lines.forEach((l, i) => txt(l, x + 7, y + 5 + (e.type === 'owl' ? 10 : 0) + i * 10, '#fff'));
      if (this.def.puzzle && e.type === 'sign') txt('UP: RESET ROOM', x + w / 2, y + h + 3, '#ffe040', { align: 'center', outline: '#101848' });
    }
    const rv = this.ents.find((e) => e.type === 'rival');
    if (rv && !rv.won && !rv.lost && this.lv.goal) { // race bar
      const L = this.lv.goal.x * TS, bx = 70, bw = 116; hR(bx - 1, 26, bw + 2, 5, '#1a1020'); hR(bx, 27, bw, 3, '#3a3a58');
      hR(bx + clamp(rv.x / L, 0, 1) * bw - 1, 25, 3, 7, '#5aa0ff'); hR(bx + clamp(this.p.x / L, 0, 1) * bw - 1, 25, 3, 7, HEROES[heroOf()].color || '#ff8040'); txt('VS VOLT', bx + bw + 6, 25, '#5aa0ff');
    }
    if (rv && rv.won && rv.sayT > 0) txt('VOLT WON THE RACE!', 128, 46, '#5aa0ff', { align: 'center', outline: '#101848' });
  };
  // a new particle: the ground-pound shock ring
  const _dpt = Play.prototype.drawPart;
  Play.prototype.drawPart = function (q, cx) {
    if (q.k === 'ring') { const r = (18 - q.life) * 4; ctx.strokeStyle = `rgba(255,240,160,${q.life / 18})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(q.x - cx, q.y - 2, r, r * 0.25, 0, 0, Math.PI * 2); ctx.stroke(); return; }
    return _dpt.call(this, q, cx);
  };
}

// ---------------- boss music for the new bosses ----------------
{
  const _play = Audio8.play;
  Audio8.play = function (name) {
    if (name === 'boss' && typeof scene !== 'undefined' && scene instanceof Play) { const bt = scene.def.bossType; if (bt === 'dj') return _play.call(Audio8, 'bossbeat'); if (bt === 'cdragon') return _play.call(Audio8, 'bosscrystal'); if (bt === 'volt') return _play.call(Audio8, 'arena'); }
    return _play.call(Audio8, name);
  };
}

// puzzle rooms and dark caves get extra time on the clock
{ const _lt = levelTime; levelTime = function (def) { return _lt(def) + (def.puzzle ? 110 : 0) + (def.lantern || def.dark2 ? 15 : 0) + (def.gusts ? 10 : 0); }; } // eslint-disable-line no-func-assign
