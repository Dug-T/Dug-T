'use strict';
// =====================================================================
// Batch J (part 1): Dino Valley (7th island) with raptors, a stampede,
// a pterodactyl ride and the T-Rex; the secret Signal Source and
// Shadow Wally; Mirror Mode; the mech suit; trading cards; restarting
// from the pause menu; captions; daily save backups; pipes that link
// sub-areas in Level Maker courses; and Music Maker songs.
// =====================================================================
ACH_LIST.push(['trex', 'DINO-MITE', 'BEAT THE T-REX'], ['hundred', '100% HERO', 'BEAT SHADOW WALLY AT THE SIGNAL SOURCE'], ['mirror', 'THROUGH THE LOOKING GLASS', 'CLEAR A MIRROR MODE LEVEL'],
  ['mech', 'BIG STOMPER', 'PILOT THE MECH SUIT'], ['cards', 'CARD SHARK', 'COLLECT 20 DIFFERENT CARDS'], ['shiny', 'SHINY!', 'FIND A SHINY CARD'], ['rematch', 'ROUND TWO', 'WIN A BOSS REMATCH'],
  ['composer', 'COMPOSER', 'SAVE A SONG IN THE MUSIC MAKER'], ['makerworld', 'WORLD BUILDER', 'FINISH A LEVEL MAKER WORLD'], ['party', 'PARTY ANIMAL', 'WIN A PARTY MODE GAME']);
Object.assign(BOSS_TALK, {
  trex: [['boss', 'ROOOAAARRR!!'], ['hero', "I'LL TAKE THAT AS A 'WELCOME TO DINO VALLEY'."]],
  shadow: [['boss', 'SO YOU FOUND EVERYTHING... EVERY MEDAL, EVERY STAR.'], ['boss', 'BUT CAN YOU BEAT YOURSELF?'], ['hero', 'ONLY ONE WAY TO FIND OUT!']],
});
Object.assign(BOSS_ART, { trex: 'trex', shadow: 'shadow' }); Object.assign(BOSS_NAMES, { trex: 'T-REX', shadow: 'SHADOW WALLY' });
BEASTS.push(['raptor', 'RAPTOR', 'e'], ['trex', 'T-REX', 'b'], ['shadow', 'SHADOW WALLY', 'b']);
Object.assign(BEAST_INFO, { raptor: 'A QUICK LITTLE DINO THAT DASHES AND HOPS.', trex: 'THE KING OF DINO VALLEY. STOMP HIM WHILE HE IS DIZZY.', shadow: 'YOUR OWN SHADOW. HE COPIES EVERY MOVE YOU MAKE!' });
H_ENTS['ρ'] = 'raptor';
SOLID.add('Ж');

// ---------------- art ----------------
function drawRaptor(x, y, t, face) {
  const C = hCtx || ctx; C.save(); if (face < 0) { C.translate(x * 2 + 16, 0); C.scale(-1, 1); }
  const l = (t >> 2) & 1;
  hR(x, y + 4, 6, 3, '#1a1020'); hR(x + 1, y + 5, 5, 1, '#5ab040');
  hR(x + 4, y + 3, 9, 7, '#1a1020'); hR(x + 5, y + 4, 7, 5, '#5ab040'); hR(x + 6, y + 6, 5, 2, '#c8e8a0');
  hR(x + 10, y, 7, 6, '#1a1020'); hR(x + 11, y + 1, 5, 4, '#5ab040'); hR(x + 14, y + 1, 1, 1, '#ff3040'); hR(x + 15, y + 4, 2, 1, '#ffffff');
  hR(x + 6 + l, y + 10, 2, 4, '#1a1020'); hR(x + 9 - l, y + 10, 2, 4, '#1a1020'); hR(x + 11, y + 7, 3, 1, '#3a8a30');
  C.restore();
}
function drawTRex(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const C = hCtx || ctx, face = e ? e.face || -1 : -1; C.save(); if (face > 0) { C.translate(x * 2 + 48, 0); C.scale(-1, 1); }
  const l = e && e.state === 'charge' ? (t >> 2) & 1 : (t >> 4) & 1, open = e && (e.state === 'roar' || e.state === 'charge');
  hR(x + 30, y + 14, 18, 8, '#1a1020'); hR(x + 31, y + 15, 16, 6, '#4a9a50');
  hR(x + 8, y + 10, 28, 22, '#1a1020'); hR(x + 9, y + 11, 26, 20, '#4a9a50'); hR(x + 12, y + 20, 18, 10, '#c8e0a0');
  hR(x, y, 20, 14, '#1a1020'); hR(x + 1, y + 1, 18, 12, '#4a9a50'); hR(x + 5, y + 3, 3, 3, e && e.state === 'dizzy' ? '#ffe040' : '#ff3040');
  if (open) { hR(x, y + 9, 12, 6, '#1a1020'); hR(x + 1, y + 10, 10, 4, '#a02030'); for (let k = 0; k < 4; k++) hR(x + 1 + k * 3, y + 9, 1, 2, '#ffffff'); } else for (let k = 0; k < 4; k++) hR(x + 1 + k * 3, y + 12, 1, 2, '#ffffff');
  hR(x + 9, y + 18, 5, 3, '#4a9a50'); hR(x + 12 + l * 2, y + 30, 6, 10, '#1a1020'); hR(x + 24 - l * 2, y + 30, 6, 10, '#1a1020'); hR(x + 13 + l * 2, y + 31, 4, 8, '#3a8a40'); hR(x + 25 - l * 2, y + 31, 4, 8, '#3a8a40');
  for (let k = 0; k < 5; k++) hR(x + 14 + k * 5, y + 8, 3, 3, '#2a6a30');
  C.restore();
  if (e && e.state === 'dizzy') for (let k = 0; k < 3; k++) { const a = frame * 0.15 + k * 2.1; txt('*', Math.round(x + (face > 0 ? 38 : 10) + Math.cos(a) * 9), Math.round(y - 8 + Math.sin(a) * 3), '#ffe040'); }
}
function drawShadow(x, feet, face, pose, t) {
  Wally.draw(ctx, x, feet, pose, face, { t, hero: 'wally', hat: 'none', glow: 0.55 + 0.25 * Math.sin(t * 0.15) });
  Wally.draw(ctx, x, feet, pose, face, { t, hero: 'wally', black: true, hat: 'none' });
  ctx.fillStyle = (t >> 3) & 1 ? '#ff2040' : '#ff8090'; ctx.fillRect(Math.round(x + face * 2), Math.round(feet - 26), 2, 1); ctx.fillRect(Math.round(x + face * 2 + 3 * face), Math.round(feet - 26), 2, 1);
}
function drawMechItem(x, y) { hR(x + 1, y + 2, 12, 9, '#1a1020'); hR(x + 2, y + 3, 10, 7, '#c0c8d8'); hR(x + 4, y + 4, 6, 3, '#5ff0ff'); hR(x + 2, y + 11, 3, 3, '#1a1020'); hR(x + 9, y + 11, 3, 3, '#1a1020'); }
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    if (id === 'raptor') { drawRaptor(x - 8, y - 7, t, 1); return; }
    if (id === 'trex') { ctx.save(); ctx.translate(x, y); ctx.scale(0.45, 0.45); drawTRex(-24, -20, null, t); ctx.restore(); return; }
    if (id === 'shadow') { drawShadow(x, y + 12, 1, 'idle0', t); return; }
    return _sa(id, x, y, t);
  };
}

// ---------------- Dino Valley levels and the Signal Source ----------------
LEVELS.push(
  { // 57
    name: 'JURASSIC JUNGLE', theme: 'jungle', music: 'jungle', width: 180, tag: 'DV1', world: 'DINO VALLEY 1', mech: true,
    extras: [['h', 60], ['z', 120]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').coins(8, 10, 4).set(16, 11, 'ρ').row(20, 8, 'WWBW').set(28, 11, 'g');
      b.ground(34, 70).set(40, 11, 'ρ').fill(48, 9, 50, 11, 'X').coins(48, 8, 3).set(58, 11, 'ρ').set(64, 11, 'C');
      b.ground(74, 110).set(80, 11, 'ρ').row(86, 8, 'WPW').fill(96, 7, 99, 7, '=').coins(96, 6, 4).set(104, 11, 'ρ');
      b.ground(114, 179).set(120, 11, 'ρ').set(128, 11, 'g').stairsUp(140, 3).fill(143, 9, 146, 11, 'X').stairsDown(147, 3).set(160, 11, 'ρ').set(172, 11, 'G');
    },
  },
  { // 58
    name: 'STAMPEDE!', theme: 'desert', music: 'jungle', width: 200, chase: { speed: 1.0, delay: 130 }, stampede: true, tag: 'DV2', world: 'DINO VALLEY 2',
    build(b) {
      b.ground(0, 26).set(3, 11, '@').coins(10, 10, 4);
      b.gap(27, 28); b.ground(29, 50).fill(38, 10, 39, 11, 'X').set(46, 11, 'ρ');
      b.gap(51, 53); b.ground(54, 80).row(60, 8, 'WBW').fill(70, 9, 71, 11, 'X').coins(72, 10, 3);
      b.ground(81, 110).set(90, 11, 'C').fill(98, 10, 99, 11, 'X').set(104, 11, 'ρ');
      b.gap(111, 113); b.ground(114, 150).fill(124, 9, 125, 11, 'X').coins(126, 9, 3).set(140, 11, 'ρ');
      b.gap(151, 152); b.ground(153, 199).fill(162, 10, 163, 11, 'X').set(190, 11, 'G');
    },
  },
  { // 59
    name: 'PTERODACTYL PASS', theme: 'jungle', music: 'sky', width: 200, sub: true, ptero: true, autoscroll: 1.0, noAuto: true, noSign: true, tag: 'DV3', world: 'DINO VALLEY 3',
    build(b) {
      b.ground(0, 199, 13).set(4, 6, '@');
      for (let x = 20; x < 180; x += 14) { const top = 2 + ((x * 7) % 5), gapY = top + 4; b.fill(x, 0, x + 1, top, 'X'); b.fill(x, gapY + 3, x + 1, 12, 'X'); b.coins(x - 3, gapY + 1, 2); if (x % 28 === 6) b.set(x + 6, gapY, 'z'); }
      b.ground(186, 199, 11).set(194, 10, 'G');
    },
  },
  { // 60
    name: 'TAR PITS', theme: 'volcano', music: 'volcano', width: 180, tag: 'DV4', world: 'DINO VALLEY 4', mech: true,
    build(b) {
      b.ground(0, 24).set(2, 11, '@').set(14, 11, 'ρ');
      b.fill(25, 12, 28, 13, 'L'); b.fill(26, 9, 27, 9, '='); b.ground(29, 60).row(36, 8, 'WWW').set(44, 11, 'ρ').set(52, 11, 'g');
      b.fill(61, 12, 64, 13, 'L'); b.ground(65, 100).set(70, 11, 'C').fill(80, 9, 82, 11, 'X').set(90, 11, 'ρ');
      b.fill(101, 12, 105, 13, 'L'); b.set(102, 9, 'm'); b.ground(106, 179).set(112, 11, 'ρ').set(124, 11, 'ρ').row(132, 8, 'BPB').set(150, 11, 'ρ').set(170, 11, 'G');
    },
  },
  { // 61
    name: 'FOSSIL CAVE', theme: 'cave', music: 'cave', width: 170, lantern: true, tag: 'DV5', world: 'DINO VALLEY 5',
    extras: [['b', 40], ['b', 110]],
    build(b) {
      b.fill(0, 0, 169, 0, '#');
      b.ground(0, 30).set(2, 11, '@').set(10, 7, CRYS).set(16, 11, 'ρ').row(22, 8, 'WBW');
      b.ground(34, 60).set(40, 11, 'ρ').set(48, 7, CRYS).fill(54, 12, 55, 12, '^');
      b.ground(62, 70).fill(68, 4, 68, 9, 'X').ground(71, 90, 4).set(71, 8, CRYS).coins(74, 3, 4).set(84, 3, 'ρ');
      b.ground(91, 130).set(95, 11, 'C').set(104, 11, 'ρ').set(112, 7, CRYS).set(120, 11, 'ρ');
      b.ground(134, 169).set(140, 11, 'ρ').set(150, 7, CRYS).set(162, 11, 'G');
    },
  },
  { // 62
    name: 'REX ARENA', theme: 'jungle', music: 'jungle', width: 80, boss: true, bossHp: 6, bossName: 'T-REX', bossType: 'trex', talk: 'trex', tag: 'DV6', world: 'DINO VALLEY 6',
    bossMsg: ['THE T-REX IS BEATEN!', '', 'HE ROLLS OVER FOR A BELLY RUB.', 'DINO VALLEY HAS FULL SIGNAL,', 'AND A NEW BEST FRIEND.', '', 'CHECK YOUR COMPLETION IN EXTRAS!'],
    build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 10, 4).set(16, 11, 'ρ').set(26, 11, 'ρ').row(32, 8, 'WEW').set(40, 11, 'C').set(50, 11, 'ρ').row(67, 7, '===').set(74, 11, '*'); },
  },
  { // 63
    name: 'THE SIGNAL SOURCE', theme: 'static', music: 'static', width: 60, boss: true, bossHp: 8, bossName: 'SHADOW WALLY', bossType: 'shadow', talk: 'shadow', tag: '???', world: 'THE SIGNAL SOURCE', noSign: true,
    bossMsg: ['SHADOW WALLY FADES AWAY...', '', 'EVERY SIGNAL ON EVERY ISLAND', 'SHINES AT FULL STRENGTH.', '', 'YOU FOUND IT ALL. YOU BEAT IT', 'ALL. YOU ARE A 100% HERO!'],
    build(b) { b.ground(0, 59).set(2, 11, '@').coins(10, 10, 6).set(30, 11, 'C').row(48, 8, '===').row(54, 8, '==').set(56, 11, '*'); },
  },
);
const DINO_BASE = 57, SECRET_LI = 63;

// ---------------- completion ----------------
const Completion = (() => {
  const main = () => LEVELS.map((_, i) => i).filter((i) => !LEVELS[i].story && i !== TUTORIAL_LI && i !== SECRET_LI);
  let medalCache = null;
  const medalsIn = (i) => { if (!medalCache) medalCache = {}; if (medalCache[i] === undefined) { try { medalCache[i] = buildLevel(i).spawns.filter((s) => s.t === 'M').length; } catch (e) { medalCache[i] = 0; } } return medalCache[i]; };
  const bits = (n) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
  function compute(g = game) {
    if (!g) return null;
    const L = main(), lv = L.filter((i) => g.cleared[i]).length, mTot = L.reduce((n, i) => n + medalsIn(i), 0), mGot = L.reduce((n, i) => n + Math.min(medalsIn(i), bits(g.medals[i] | 0)), 0);
    const sTot = L.length * 3, sGot = L.reduce((n, i) => n + bits((g.stars[i] | 0) & 7), 0), aTot = ACH_LIST.length - 1, aGot = ACH_LIST.filter((a) => a[0] !== 'hundred' && Ach.has(a[0])).length;
    const parts = [['LEVELS', lv, L.length], ['MEDALS', mGot, mTot], ['STARS', sGot, sTot], ['TROPHIES', aGot, aTot]];
    const pct = Math.floor((parts.reduce((s, [, a, b]) => s + (b ? a / b : 1), 0) / parts.length) * 100 + 1e-9);
    return { parts, pct: window.FORCE_100 ? 100 : pct };
  }
  return { compute };
})();

// ---------------- the mech suit, mirror mode, trex, shadow, cards, pipes ----------------
const Cards = (() => {
  const KEY = 'wallyman-cards', got = lsJ(KEY, {});
  return { add(id, shiny) { const c = got[id] || { n: 0, s: 0 }; c.n++; if (shiny) c.s++; got[id] = c; lsS(KEY, got); if (Object.keys(got).length >= 20) Ach.unlock('cards'); if (shiny) Ach.unlock('shiny'); }, get: (id) => got[id] || null, count: () => Object.keys(got).length };
})();
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initJ) this.initJ();
    if (this.mode && this.mode.kind === 'mirror' && this.mirSpawns) { // spawn things as the camera reaches them from the right
      while (this.mirSpawns.length && this.mirSpawns[0].x * TS > this.cam.x - 40) this.spawn(this.mirSpawns.shift());
    }
    _upd.call(this);
    if (this.def.ptero) this.parts = this.parts.filter((q) => q.k !== 'bubble');
  };
  Play.prototype.initJ = function () {
    this._initJ = true;
    const g = this.lv.grid, W = this.lv.w, m = this.mode;
    // a mech suit block in some levels
    if ((this.def.mech || (this.li % 4 === 1 && isRealLi(this.li) && !this.def.boss)) && !this.def.custom && !this.def.sub && !this.def.tower && !this.def.shmup && !this.def.board) {
      let placed = false;
      for (let x = 40; x < W - 20 && !placed; x++) { const y = g.findIndex((r) => r[x] === 'W'); if (y >= 0) { g[y][x] = 'Ж'; placed = true; } }
      for (let x = 44; x < W - 20 && !placed; x++) for (let y = 6; y < 14; y++) if (SOLID.has(g[y][x]) && [1, 2, 3, 4, 5].every((d) => g[y - d][x] === '.')) { g[y - 4][x] = 'Ж'; placed = true; break; } else if (g[y][x] !== '.') break;
    }
    if (m && m.kind === 'mirror') { // flip the whole level left to right
      const flip = { '<': '>', '>': '<', [SL_R]: SL_L, [SL_L]: SL_R, [MIR_A]: MIR_B, [MIR_B]: MIR_A };
      for (const r of g) { r.reverse(); for (let x = 0; x < W; x++) if (flip[r[x]]) r[x] = flip[r[x]]; }
      const fx = (x) => W - 1 - x;
      for (const sp of this.lv.spawns) { sp.x = fx(sp.x) - (sp.t === 'm' ? 2 : 0); }
      const st = this.lv.start; st.x = fx(st.x); if (this.lv.goal) this.lv.goal.x = fx(this.lv.goal.x); if (this.lv.checkpoint) this.lv.checkpoint.x = fx(this.lv.checkpoint.x);
      this.mirSpawns = this.lv.spawns.slice().sort((a, b) => b.x - a.x); this.lv.spawns = []; this.spawnIdx = 0;
      this.ents = this.ents.filter((e) => e.type === 'sign' || e.type === 'owl' ? false : !(e.type === 'checkpoint'));
      const p = this.p; p.x = st.x * TS + 3; p.y = (st.y + 1) * TS - p.h; p.face = -1;
      this.cam.x = clamp(p.x - 140, 0, W * TS - VW); this.speedMul = 1.25;
      this.def = Object.assign({}, this.def, { mirrored: true });
    }
    if (m && m.kind === 'rematch') { const p = this.p; p.x = (W - 17) * TS; p.y = 11 * TS + 16 - p.h; this.cam.x = Math.max(0, p.x - 120); this.spawnIdx = this.lv.spawns.findIndex((s) => s.x >= W - 30); if (this.spawnIdx < 0) this.spawnIdx = 0; game.seenTalk = game.seenTalk || {}; }
  };
  // ---- mech suit ----
  const _hb = Play.prototype.hitBlock;
  Play.prototype.hitBlock = function (tx, ty) {
    if (this.tile(tx, ty) !== 'Ж') return _hb.call(this, tx, ty);
    this.setTile(tx, ty, 'U'); this.bumps.push({ tx, ty, t: 0 }); Audio8.sfx('sprout');
    this.ents.push({ type: 'mechitem', item: true, alive: true, x: tx * TS + 1, y: ty * TS, w: 14, h: 14, rise: 16, t: 0 });
  };
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    const p = this.p, Pr = Input.pressed;
    if (!p.mech || this.state !== 'play') return _up.call(this);
    const fire = Pr('run'); Input.pressed = (k) => (k === 'run' ? false : Pr(k));
    try { _up.call(this); } finally { Input.pressed = Pr; }
    const mc = p.mech; mc.t--;
    if (fire && !mc.cool) { mc.cool = 14; this.pings.push({ x: p.x + (p.face > 0 ? p.w : -16), y: p.y + 8, w: 16, h: 4, vx: p.face * 6, life: 45, laser: true }); Audio8.sfx('laser'); }
    if (mc.cool) mc.cool--;
    if (p.vx) { const tx = Math.floor((p.face > 0 ? p.x + p.w + 2 : p.x - 2) / TS); for (let ty = Math.floor(p.y / TS); ty <= Math.floor((p.y + p.h - 1) / TS); ty++) { const c = this.tile(tx, ty); if (c === 'B' || c === 'R') { if (c === 'R') this.crackReward(tx, ty); this.setTile(tx, ty, '.'); Audio8.sfx('brick'); this.shake = 4; for (const [ox, oy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: tx * TS + ox, y: ty * TS + oy, vx, vy, g: 0.3, life: 60 }); } } }
    if (p.onGround && Math.abs(p.vx) > 0.5 && frame % 16 === 0) { Audio8.sfx('bump'); this.shake = 2; }
    if (mc.t <= 0) this.breakMech();
  };
  Play.prototype.breakMech = function () {
    const p = this.p; p.mech = null; p.inv = 90; Audio8.sfx('boom'); this.shake = 10;
    this.parts.push({ k: 'blast', x: p.x + 5, y: p.y + 10, life: 20 }); for (let k = 0; k < 6; k++) this.parts.push({ k: 'frag', x: p.x + 4, y: p.y + 8, vx: (k - 2.5) * 0.9, vy: -3 - (k % 3), g: 0.3, life: 50 });
    this.parts.push({ k: 'text', s: 'MECH BROKE!', x: p.x - 20, y: p.y - 20, vy: -0.4, life: 60 });
  };
  const _hurt = Play.prototype.hurt;
  Play.prototype.hurt = function (s) {
    const p = this.p;
    if (p.mech && this.state === 'play' && !(p.inv > 0)) { p.mech.hp--; p.inv = 60; Audio8.sfx('bosshit'); this.shake = 8; if (p.mech.hp <= 0) this.breakMech(); return; }
    return _hurt.call(this, s);
  };
  const _pings = Play.prototype.updatePings;
  Play.prototype.updatePings = function () {
    for (const g of this.pings) if (g.laser) for (const e of this.ents) if (e.boss && e.alive && !e.dying && overlap(g, e)) { g.life = 0; if (!e.inv) this.damageBoss(e); break; }
    return _pings.call(this);
  };
  const _dpg = Play.prototype.drawPing;
  Play.prototype.drawPing = function (g, cx) {
    if (g.laser) { const x = Math.round(g.x - cx), y = Math.round(g.y); hR(x, y, 16, 4, '#ff2040'); hR(x, y + 1, 16, 2, '#ffd0d8'); return; }
    if (g.torpedo && this.def.ptero) { const x = Math.round(g.x - cx), y = Math.round(g.y); hR(x, y - 2, 7, 7, '#1a1020'); hR(x + 1, y - 1, 5, 5, '#f0e8c8'); return; }
    return _dpg.call(this, g, cx);
  };
  const _dp = Play.prototype.drawPlayer;
  Play.prototype.drawPlayer = function (cx) {
    const p = this.p;
    if (this.def.ptero && this.def.sub && this.state !== 'dying') { // riding a pterodactyl
      const x = Math.round(p.x - cx), y = Math.round(p.y), flap = Math.sin(frame * 0.3) * 6;
      if (p.inv > 0 && (frame >> 2) & 1) return;
      drawWally(x + 12, y + 12, 'ride', 1);
      hR(x - 4, y + 10, 30, 8, '#1a1020'); hR(x - 3, y + 11, 28, 6, '#c06a3a'); hR(x + 22, y + 8, 10, 6, '#1a1020'); hR(x + 23, y + 9, 8, 4, '#c06a3a'); hR(x + 30, y + 10, 6, 2, '#e8d0a0'); hR(x + 26, y + 9, 1, 1, '#1a1020'); hR(x + 18, y + 5, 2, 4, '#c06a3a');
      for (let s = 0; s < 12; s++) { hR(x + 2 + s, y + 10 - flap * (1 - s / 12) - s * 0.3, 2, 3, '#a05030'); hR(x + 2 + s, y + 18 + flap * (1 - s / 12) * 0.3, 2, 2, '#a05030'); }
      return;
    }
    if (!p.mech) return _dp.call(this, cx);
    const x = Math.round(p.x + p.w / 2 - cx), y = Math.round(p.y + p.h), l = p.onGround && Math.abs(p.vx) > 0.3 ? (frame >> 3) & 1 : 0, f = p.face;
    if (p.inv > 0 && (frame >> 2) & 1) return;
    hR(x - 7 + l * 2, y - 8, 5, 8, '#1a1020'); hR(x + 2 - l * 2, y - 8, 5, 8, '#1a1020'); hR(x - 6 + l * 2, y - 7, 3, 6, '#8a90a8'); hR(x + 3 - l * 2, y - 7, 3, 6, '#8a90a8'); hR(x - 8 + l * 2, y - 1, 7, 2, '#1a1020'); hR(x + 1 - l * 2, y - 1, 7, 2, '#1a1020');
    hR(x - 10, y - 22, 20, 15, '#1a1020'); hR(x - 9, y - 21, 18, 13, '#c0c8d8'); hR(x - 9, y - 21, 18, 2, '#e8eef8'); hR(x - 5, y - 14, 10, 3, '#5a6078');
    hR(x + f * 9, y - 18, 7 * f, 4, '#1a1020'); hR(x + f * 10, y - 17, 6 * f, 2, '#ff4060');
    for (let k = 0; k < p.mech.hp; k++) hR(x - 7 + k * 5, y - 10, 3, 2, '#5ae060');
    drawWally(x, y - 14, 'idle0', f, { sx: 0.85, sy: 0.85 });
    hR(x - 8, y - 27, 16, 8, 'rgba(160,230,255,0.35)');
  };
  // ---- items, enemies and bosses ----
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.type === 'mechitem') { if (e.rise > 0) { e.y -= 0.5; e.rise -= 0.5; return; } if (this.state === 'play' && overlap(p, e) && !p.riding) { e.alive = false; p.mech = { hp: 3, t: 1800, cool: 0 }; Audio8.sfx('power'); Ach.unlock('mech'); this.parts.push({ k: 'text', s: 'MECH SUIT! B: LASER', x: p.x - 36, y: p.y - 20, vy: -0.4, life: 80 }); } return; }
    if (e.type === 'card') { e.t++; e.y = e.oy + Math.sin(e.t * 0.1) * 2; if (this.state === 'play' && overlap(p, e)) { e.alive = false; Cards.add(e.ctype, e.shiny); Audio8.sfx(e.shiny ? 'secret' : 'check'); this.parts.push({ k: 'text', s: (e.shiny ? 'SHINY ' : '') + 'CARD: ' + ((BEASTS.find((k) => k[0] === e.ctype) || [0, '???'])[1]), x: p.x - 40, y: p.y - 24, vy: -0.4, life: 80 }); } if (e.t > 900) e.alive = false; return; }
    if (e.type === 'trex') return this.updateTRex(e);
    if (e.type === 'shadow') return this.updateShadow(e);
    if (p.mech && e.enemy && !e.boss && !e.yeti && e.alive && !e.dying && this.state === 'play' && overlap(p, e)) { this.flipKill(e); return; }
    if (e.type === 'raptor' && !e.dying && !e.iced && !(this.freezeT > 0) && e.x < this.cam.x + VW + 64) {
      e.vy = Math.min(5, (e.vy || 0) + 0.3);
      if (e.onGround) { if (!this.groundAhead(e)) e.vx = -e.vx; if ((e.t % 90) === 45 && Math.abs(p.x - e.x) < 140) { e.vx = (p.x < e.x ? -1 : 1) * 2.1 * DIFF[this.diff].speed; e.vy = -3.4; } else if (Math.abs(e.vx) > 1.2) e.vx *= 0.97; }
      const vx = e.vx; this.move(e, true); if (e.hitWall) e.vx = -Math.sign(vx) * Math.max(0.6, Math.abs(vx)); e.face = Math.sign(e.vx) || e.face;
    }
    return _ue.call(this, e);
  };
  Play.prototype.updateTRex = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    e.vy = Math.min(6, e.vy + 0.35); this.move(e, false);
    if (!this.bossLock || this.talk || this._p2ctx) return;
    e.t++; const L = this.camMin + 4, R = this.camMin + VW - 52, rage = e.maxHp - e.hp;
    if (--e.act <= 0) {
      if (e.state === 'walk') { e.state = e.n++ % 2 ? 'roar' : 'charge'; e.act = e.state === 'roar' ? 70 : 200; e.face = p.x < e.x ? -1 : 1; if (e.state === 'roar') { Audio8.sfx('roar'); this.shake = 20; for (let k = 0; k < 3 + Math.floor(rage / 2); k++) this.addCannonball(clamp(p.x - 50 + k * 40, this.camMin + 8, this.camMin + VW - 8)); } else Audio8.sfx('snort'); }
      else { e.state = 'walk'; e.act = 90 - rage * 6; }
    }
    if (e.state === 'walk') { e.face = p.x + 5 < e.x + 24 ? -1 : 1; e.vx = e.face * (0.5 + rage * 0.08); }
    else if (e.state === 'charge') { e.vx = e.face * (3 + rage * 0.25); if ((e.x <= L && e.face < 0) || (e.x >= R && e.face > 0)) { e.x = clamp(e.x, L, R); e.state = 'dizzy'; e.act = 120 - rage * 8; e.vx = 0; this.shake = 16; Audio8.sfx('bosshit'); } }
    else e.vx = 0;
    e.x = clamp(e.x, L, R);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'dizzy' && p.vy > 0 && p.prevBottom <= e.y + 14) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'walk'; e.act = 50; } return; }
    this.hurt();
  };
  Play.prototype.updateShadow = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    if (!this.bossLock || this.talk || this._p2ctx) { e.vy = Math.min(6, e.vy + 0.4); this.move(e, false); return; }
    e.t++; const mid = this.camMin + VW / 2, rage = e.maxHp - e.hp;
    if (e.state === 'copy') {
      const tx = 2 * mid - (p.x + p.w / 2) - e.w / 2; e.vx = clamp((tx - e.x) * 0.12, -2.6, 2.6); e.face = p.x < e.x ? -1 : 1;
      if (p.vy < -3 && e.onGround) e.vy = p.vy * 1.02;
      if (e.t % Math.max(50, 90 - rage * 6) === 0) { this.ents.push({ type: 'bolt', alive: true, t: 0, x: e.x + 2, y: e.y + 6, w: 8, h: 8, vx: e.face * 2.6, vy: -2.2, g: 0.12, life: 140 }); Audio8.sfx('zap'); }
      if (--e.act <= 0) { e.state = 'tired'; e.act = 100 - rage * 6; e.vx = 0; }
    } else { e.vx = 0; if (--e.act <= 0) { e.state = 'copy'; e.act = 300; } }
    e.vy = Math.min(6, e.vy + 0.4); this.move(e, false);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'tired' && p.vy > 0 && p.prevBottom <= e.y + 10) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'copy'; e.act = 300; } return; }
    this.hurt();
  };
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    const bt = this.def.bossType;
    if (sp.t === '*' && (bt === 'trex' || bt === 'shadow')) {
      const hp = (this.def.bossHp || 6) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0);
      if (bt === 'trex') this.ents.push({ type: 'trex', boss: true, enemy: true, alive: true, t: 0, n: 0, x: sp.x * TS - 30, y: 12 * TS - 40, w: 48, h: 40, hp, maxHp: hp, inv: 0, state: 'walk', act: 80, vx: 0, vy: 0, face: -1 });
      else this.ents.push({ type: 'shadow', boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS, y: 12 * TS - 22, w: 10, h: 22, hp, maxHp: hp, inv: 0, state: 'copy', act: 300, vx: 0, vy: 0, face: -1 });
      return;
    }
    return _sp.call(this, sp);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) {
    const mine = e.type === 'trex' || e.type === 'shadow', a = e.alive, sa = Sticker.add;
    if (mine) Sticker.add = () => {};
    try { _db.call(this, e); } finally { Sticker.add = sa; }
    if (a && !e.alive) {
      if (e.type === 'trex') Ach.unlock('trex'); if (e.type === 'shadow') Ach.unlock('hundred');
      if (mine) Bestiary.add(e.type);
      Cards.add(e.kind === 'mother' ? 'mother' : e.type, Math.random() < 0.1);
      if (this.mode && this.mode.kind === 'rematch') Ach.unlock('rematch');
    }
  };
  const _ck = Play.prototype.countKill;
  Play.prototype.countKill = function (e) {
    _ck.call(this, e);
    if (e && this.state === 'play' && !e.boss && BEASTS.some((b) => b[0] === e.type) && Math.random() < (window.CARD_CHANCE || 0.06)) {
      const sh = Math.random() < 0.1; this.ents.push({ type: 'card', item: true, alive: true, t: 0, ctype: e.type, shiny: sh, x: e.x + 1, y: e.y - 6, oy: e.y - 6, w: 12, h: 14, rise: 0 });
    }
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.type === 'mechitem') { drawMechItem(x, y); return; }
    if (e.type === 'card') { hR(x, y, 12, 15, '#1a1020'); hR(x + 1, y + 1, 10, 13, e.shiny ? ((frame >> 2) & 1 ? '#ffe040' : '#ffffff') : '#f0e8d0'); hR(x + 2, y + 2, 8, 7, '#5cb0f8'); hR(x + 2, y + 10, 8, 1, '#a08060'); hR(x + 2, y + 12, 6, 1, '#a08060'); return; }
    if (e.type === 'raptor') { if (e.dying === 'flip') { ctx.save(); ctx.translate(x + 8, y + 7); ctx.scale(1, -1); drawRaptor(-8, -7, frame, e.face); ctx.restore(); return; } if (e.dying === 'squish') { ctx.save(); ctx.translate(x + 8, y + 14); ctx.scale(1.2, 0.4); drawRaptor(-8, -14, frame, e.face); ctx.restore(); return; } drawRaptor(x - 1, y, frame + (e.t || 0), e.face || -1); return; }
    if (e.type === 'trex') { if (e.dying) return; drawTRex(x, y, e, frame); return; }
    if (e.type === 'shadow') { if (e.inv > 0 && (frame >> 2) & 1) return; drawShadow(x + 5, y + e.h, e.face || -1, !e.onGround ? 'jump' : Math.abs(e.vx) > 0.3 ? 'run' + ((frame >> 2) % 8) : 'idle' + ((frame >> 4) % 4), frame); if (e.state === 'tired' && (frame >> 3) & 1) txt('!', x + 3, y - 12, '#ffe040', { outline: '#1a1020' }); return; }
    return _de.call(this, e, cx);
  };
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    _dt.call(this, cx);
    const t0 = Math.floor(cx / TS);
    for (let ty = 0; ty < 14; ty++) for (let tx = t0; tx <= t0 + 16; tx++) if (this.tile(tx, ty) === 'Ж' && tx >= 0 && tx < this.lv.w) { const b = this.bumps.find((k) => k.tx === tx && k.ty === ty), dy = b ? -Math.round(Math.sin((b.t / 10) * Math.PI) * 6) : 0; ctx.drawImage(this.T.bonus[(frame >> 3) % 4], tx * TS - cx, ty * TS + dy); hR(tx * TS - cx + 4, ty * TS + dy + 4, 8, 8, '#c0c8d8'); hR(tx * TS - cx + 6, ty * TS + dy + 5, 4, 2, '#5ff0ff'); }
  };
  // the stampede chases you instead of lava
  const _dn = Play.prototype.drawNight;
  Play.prototype.drawNight = function (cx) {
    if (!this.def.stampede) return _dn.call(this, cx);
    const lx = this.lavaX; this.lavaX = undefined;
    try { _dn.call(this, cx); } finally { this.lavaX = lx; }
    if (lx === undefined) return;
    const sx = Math.round(lx - cx);
    if (sx > -60) { ctx.fillStyle = 'rgba(160,120,70,0.45)'; ctx.fillRect(0, 150, Math.max(0, sx + 10), 60); for (let k = 0; k < 6; k++) { const x = sx - 20 - k * 22 + Math.sin(frame * 0.2 + k) * 3, yy = 192 - 30 - (k % 2) * 12 + (((frame >> 3) + k) % 2) * 2; ctx.save(); ctx.translate(x, yy); ctx.scale(-0.55, 0.55); drawTRex(-48, 0, { state: 'charge', face: -1, inv: 0 }, frame + k * 3); ctx.restore(); } }
    else if ((frame >> 4) & 1) txt('< STAMPEDE!', 6, 112, '#ffb060', { outline: '#1a1020' });
  };
}

// ---------------- pipes link sub-areas in Level Maker courses ----------------
{
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    const p = this.p;
    if (this.def.custom && this.state === 'play' && p.onGround && !p.riding && !p.pipeT && Input.pressed('down')) {
      const tx = Math.floor((p.x + p.w / 2) / TS), ty = Math.floor((p.y + p.h + 2) / TS);
      if (this.tile(tx, ty) === 'Y' && this.tile(tx, ty - 1) !== 'Y') {
        const tops = []; for (let x = 0; x < this.lv.w; x++) for (let y = 1; y < 14; y++) if (this.tile(x, y) === 'Y' && this.tile(x, y - 1) !== 'Y' && this.tile(x - 1, y) !== 'Y') tops.push([x, y]);
        const me = tops.findIndex(([x, y]) => (x === tx || x + 1 === tx) && y === ty);
        if (me >= 0 && tops.length >= 2) { const to = tops[me ^ 1] || tops[me - 1]; if (to) { p.pipeT = 40; p.pipeTo = to; Audio8.sfx('warp' in Audio8 ? 'warp' : 'swoop'); } }
      }
    }
    if (p.pipeT) { p.pipeT--; p.vx = 0; p.vy = 0; if (p.pipeT === 20) { const [x, y] = p.pipeTo; p.x = x * TS + 11 - p.w / 2; p.y = y * TS - p.h; this.cam.x = clamp(p.x - 120, 0, this.lv.w * TS - VW); } return; }
    return _up.call(this);
  };
}

// ---------------- pause menu restarts ----------------
Play.prototype.restartLevel = function (fromCp) {
  if (this.rush || this.endless || this.daily || this.versus || (game && game.players === 2) || this.p2 || (this.mode && this.mode.kind === 'replay')) { Audio8.sfx('bump'); this.parts.push({ k: 'text', s: "CAN'T RESTART HERE", x: this.cam.x + 80, y: 40, vy: 0, life: 60 }); return; }
  const li = this.li, m = this.mode, ta = this.ta, cp = !!fromCp && this.cpHit;
  if (fromCp && !this.cpHit) this.parts.push({ k: 'text', s: 'NO CHECKPOINT YET', x: this.cam.x + 80, y: 40, vy: 0, life: 60 });
  this.paused = false; this.state = 'done'; Audio8.sfx('confirm');
  go(() => { const s = new Play(li, cp, ta ? { ta: true } : {}); if (m) s.mode = m; return s; });
};

// ---------------- captions for spoken lines ----------------
const Captions = (() => {
  let text = '', t = 0;
  try { if (window.speechSynthesis) { const _sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { if (Settings.get('captions') !== false && u && u.text) { text = String(u.text).toUpperCase().replace(/[^A-Z0-9 .,!?'-]/g, ''); t = Math.max(150, text.length * 6); } return _sp(u); }; } } catch (e) { /* no speech */ }
  const _dt = Ach.drawToast;
  Ach.drawToast = function () { _dt.call(Ach); if (t > 0) { t--; const lines = wrapText(text, 34), h = lines.length * 10 + 6; ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(16, VH - 30 - h, VW - 32, h); lines.forEach((l, i) => txt(l, 128, VH - 27 - h + i * 10, '#ffffff', { align: 'center' })); } };
  return { show(s) { text = String(s).toUpperCase(); t = 180; }, get: () => (t > 0 ? text : '') };
})();

// ---------------- daily save backups ----------------
const Backups = (() => {
  const SAVE_KEY = 'wallyman-world-save-v1', KEY = 'wallyman-backups';
  const list = () => lsJ(KEY, []);
  function daily() {
    try {
      const day = new Date().toDateString(), raw = localStorage.getItem(SAVE_KEY); if (!raw || raw === 'null') return;
      const l = list(); if (l.length && l[0].day === day) return;
      l.unshift({ day, at: Date.now(), data: raw }); lsS(KEY, l.slice(0, 3));
    } catch (e) { /* storage full */ }
  }
  function restore(i) { const b = list()[i]; if (!b) return false; const d = JSON.parse(b.data); if (!Array.isArray(d)) return false; for (let k = 0; k < 3; k++) Save.slots[k] = d[k] || null; Save.persist(); location.reload(); return true; }
  daily();
  return { list, restore };
})();

// ---------------- Music Maker songs ----------------
const MUSIC_NOTES = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6'];
const MUSIC_CHORDS = ['C G Am F', 'Am F C G', 'C Am F G', 'Dm G C Am', 'Em C G D', 'F G Em Am', 'C F C G', 'Am Dm E Am'];
const MUSIC_DRUMS = ['k.h.s.h.k.h.s.h.', 'k...s...k.k.s...', 'kshskshskshsksss', 'k..h..s..h..k.s.', 'k.hsk.hsk.hsksss', ''];
const MUSIC_BASS = ['bounce', 'walk', 'drive', 'hold'], MUSIC_LEAD = ['p25', 'p12', 'p50'];
const MusicMaker = (() => {
  const KEY = 'wallyman-songs', songs = lsJ(KEY, [null, null, null]);
  const blank = () => ({ name: 'MY SONG', bpm: 132, chords: 0, drums: 0, bass: 0, lead: 0, notes: Array(32).fill(-1) });
  const toDef = (s) => {
    let mel = '', rest = 0; const flush = () => { while (rest > 0) { const n = Math.min(rest, 8); mel += `r/${n * 2} `; rest -= n; } };
    for (const n of s.notes) { if (n < 0) rest++; else { flush(); mel += `${MUSIC_NOTES[n]}/2 `; } } flush();
    return { bpm: s.bpm, swing: 0, bass: MUSIC_BASS[s.bass], harm: 'stab', drums: MUSIC_DRUMS[s.drums], lead: MUSIC_LEAD[s.lead], chords: MUSIC_CHORDS[s.chords], mel: mel.trim() };
  };
  const register = (i) => { if (songs[i]) Audio8.addSong('user' + (i + 1), toDef(songs[i])); };
  songs.forEach((_, i) => register(i));
  return { songs, blank, toDef, save(i, s) { songs[i] = JSON.parse(JSON.stringify(s)); lsS(KEY, songs); register(i); Ach.unlock('composer'); }, key: (i) => 'user' + (i + 1) };
})();
{
  const _td = Maker.toDef;
  Maker.toDef = function (lv) {
    const d = _td(lv), slot = Maker.slots.indexOf(lv), map = lsJ('wallyman-maker-music', {}), sg = map[slot];
    if (slot >= 0 && sg !== undefined && MusicMaker.songs[sg]) d.music = MusicMaker.key(sg);
    return d;
  };
}
