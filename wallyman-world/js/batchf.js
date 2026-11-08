'use strict';
// =====================================================================
// Batch F (part 1): Lost Lands + Static Dimension, vines, ziplines,
// barrel cannons, gravity zones, on/off switches, portals, quicksand,
// towers, new bosses, Dino and Baron Static as heroes, seasonal events
// and assist mode.
// =====================================================================

// ---------- settings helpers ----------
const ASSIST_MODES = ['OFF', 'SLOW', 'HEARTS', 'WIDE', 'ALL'];
const assist = (k) => { const a = Settings.get('assist') || 'OFF'; return a === 'ALL' || a === k; };
function eventNow() {
  if (Settings.get('events') === false) return null;
  if (window.FORCE_EVENT) return window.FORCE_EVENT;
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  if (m === 10 && day === 2) return 'birthday'; // WallyMan World was first made on 2 November 2026
  if ((m === 9 && day >= 20) || (m === 10 && day <= 2)) return 'halloween';
  if (m === 11) return 'xmas';
  return null;
}

// ---------- trophies, stickers, talk ----------
ACH_LIST.push(['truehero', 'TRUE HERO', 'BEAT THE STATIC EMPEROR'], ['ngplus', 'SECOND TIME AROUND', 'BEAT BARON STATIC IN NEW GAME+'], ['tower', 'SKY HIGH', 'CLIMB TO THE TOP OF A TOWER'], ['versus', 'FRIENDLY RIVALS', 'WIN A VERSUS MATCH'], ['fisher', 'GONE FISHING', 'CATCH A GOLDEN CARP'], ['kart', 'KART CHAMP', 'WIN A KART RACE'], ['photo', 'SAY CHEESE!', 'SAVE A PHOTO']);
STICKERS.push(['cactus', 'SPIKY CACTUS', 'e'], ['golem', 'STONE GOLEM', 'b'], ['sandworm', 'SANDWORM', 'b'], ['emperor', 'STATIC EMPEROR', 'b']);
Object.assign(BOSS_TALK, {
  golem: [['boss', 'RUMMMBLE... WHO WAKES THE GUARDIAN OF THE TEMPLE?'], ['hero', 'JUST PASSING THROUGH! MIND IF I SQUEEZE PAST?']],
  sandworm: [['boss', 'SSSSS... FRESH SNACKS IN MY DESERT!'], ['hero', 'I AM NOT ON THE MENU, WORMY!']],
  emperor: [['boss', 'SO... YOU BEAT MY BARON, MY MOTHERSHIPS AND MY RINGMASTER.'], ['boss', 'I AM THE STATIC EMPEROR. EVERY SIGNAL IN EVERY WORLD BELONGS TO ME!'], ['hero', 'NOT ANY MORE. THIS ENDS NOW!']],
});
Object.assign(BOSS_ART, { golem: 'golem', sandworm: 'sandworm', emperor: 'emperor' });
Object.assign(BOSS_NAMES, { golem: 'STONE GOLEM', sandworm: 'SANDWORM', emperor: 'STATIC EMPEROR' });

// ---------- art for the new characters ----------
function drawGolem(x, y, e, t) {
  const R = (X, Y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + X), Math.round(y + Y), w, h); };
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const step = e && e.state === 'walk' ? (t >> 3) & 1 : 0, stun = e && e.state === 'stun';
  R(2, 4, 28, 26, '#1a1020'); R(3, 5, 26, 24, '#7a7a6a'); R(5, 7, 10, 8, '#8a8a7a'); R(18, 15, 8, 9, '#6a6a5a');
  R(6, -6, 20, 12, '#1a1020'); R(7, -5, 18, 10, '#8a8a78'); R(9, -2, 4, 3, stun ? '#ffe040' : '#ff4020'); R(19, -2, 4, 3, stun ? '#ffe040' : '#ff4020');
  R(13, -10, 6, 5, '#1a1020'); R(14, -9, 4, 3, stun ? ((t >> 2) & 1 ? '#80ffb0' : '#ffffff') : '#40a060');
  R(-4, 8, 8, 16, '#1a1020'); R(-3, 9, 6, 14, '#7a7a6a'); R(28, 8, 8, 16, '#1a1020'); R(29, 9, 6, 14, '#7a7a6a');
  R(4 + step * 2, 29, 9, 7, '#1a1020'); R(5 + step * 2, 30, 7, 5, '#6a6a5a'); R(19 - step * 2, 29, 9, 7, '#1a1020'); R(20 - step * 2, 30, 7, 5, '#6a6a5a');
  R(8, 20, 2, 2, '#4a8a4a'); R(22, 10, 3, 2, '#4a8a4a');
  if (stun) for (let k = 0; k < 3; k++) { const a = t * 0.15 + k * 2.1; R(16 + Math.cos(a) * 12, -14 + Math.sin(a) * 3, 2, 2, '#ffe040'); }
}
function drawWorm(x, y, e, t, groundY) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const segs = Math.max(0, Math.floor((groundY - y) / 8));
  for (let k = segs; k >= 1; k--) { const sx = x + 4 + Math.sin(t * 0.15 + k) * 2, sy = y + 10 + k * 8; ctx.fillStyle = '#1a1020'; ctx.fillRect(sx - 1, sy - 1, 18, 10); ctx.fillStyle = k % 2 ? '#c8905a' : '#a87040'; ctx.fillRect(sx, sy, 16, 8); }
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 26, 22); ctx.fillStyle = '#d8a060'; ctx.fillRect(x, y, 24, 20); ctx.fillStyle = '#e8b878'; ctx.fillRect(x + 2, y + 2, 20, 4);
  ctx.fillStyle = '#5a1010'; ctx.fillRect(x + 4, y + 8, 16, 10); ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { ctx.fillRect(x + 5 + k * 4, y + 8, 2, 3); ctx.fillRect(x + 7 + k * 4, y + 15, 2, 3); }
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 4, y + 3, 3, 3); ctx.fillRect(x + 17, y + 3, 3, 3); ctx.fillStyle = '#ff3030'; ctx.fillRect(x + 5, y + 4, 1, 1); ctx.fillRect(x + 18, y + 4, 1, 1);
}
function drawEmperor(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const R = (X, Y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + X), Math.round(y + Y), w, h); };
  const g = (t >> 2) & 1, dizzy = e && e.state === 'dizzy';
  R(-6, 12, 40, 26, '#1a1020'); R(-5, 13, 38, 24, '#3a1a6a'); for (let k = 0; k < 5; k++) R(-4 + k * 8, 30, 6, 7, k % 2 ? '#ff40c0' : '#40ffe0');
  R(2, -4, 24, 18, '#1a1020'); R(3, -3, 22, 16, '#5a5a7a'); R(5, -1, 18, 12, '#100820');
  for (let k = 0; k < 6; k++) R(5, -1 + k * 2, 18, 1, (k + (t >> 1)) % 2 ? 'rgba(255,255,255,0.25)' : 'rgba(64,255,240,0.2)');
  if (dizzy) { R(8, 2, 3, 3, '#ffe040'); R(17, 2, 3, 3, '#ffe040'); } else { R(7, 2, 5, 3, '#ff3040'); R(16, 2, 5, 3, '#ff3040'); R(9, 8, 10, 2, g ? '#ff3040' : '#ff80a0'); }
  R(4, -12, 4, 8, '#ffd040'); R(12, -14, 4, 10, '#ffd040'); R(20, -12, 4, 8, '#ffd040'); R(4, -6, 20, 3, '#ffd040'); R(13, -12, 2, 2, '#ff40c0');
  R(-10, 16, 6, 14, '#1a1020'); R(-9, 17, 4, 12, '#5a5a7a'); R(32, 16, 6, 14, '#1a1020'); R(33, 17, 4, 12, '#5a5a7a');
  if (!dizzy && g) { ctx.fillStyle = '#40ffe0'; ctx.fillRect(Math.round(x - 12), Math.round(y + 30), 2, 4); ctx.fillRect(Math.round(x + 38), Math.round(y + 30), 2, 4); }
  if (dizzy) for (let k = 0; k < 3; k++) { const a = t * 0.15 + k * 2.1; R(14 + Math.cos(a) * 14, -18 + Math.sin(a) * 3, 2, 2, '#ffe040'); }
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    const sc = (s, fn) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); fn(); ctx.restore(); };
    if (id === 'golem') return sc(0.5, () => drawGolem(-16, -14, null, t));
    if (id === 'sandworm') return sc(0.6, () => drawWorm(-12, -14, null, t, 6));
    if (id === 'emperor') return sc(0.45, () => drawEmperor(-14, -14, null, t));
    if (id === 'cactus') { ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 4, y - 9, 8, 18); ctx.fillStyle = '#3aa040'; ctx.fillRect(x - 3, y - 8, 6, 16); ctx.fillRect(x - 8, y - 3, 4, 3); ctx.fillRect(x + 4, y - 5, 4, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 5, 1, 1); ctx.fillRect(x + 1, y, 1, 1); return; }
    return _sa(id, x, y, t);
  };
}

// ---------- Dino and Baron Static as playable heroes ----------
Wally.extraHero = function (hero, pose, capeF) {
  const c = Sprites.canvas(Wally.W, Wally.H), x = c.getContext('2d');
  const k = parseInt(pose.replace(/\D/g, ''), 10) || 0, moving = /walk|run/.test(pose), air = /jump|fall/.test(pose);
  if (hero === 'dino') {
    const fr = Sprites.dinos.teal.r[air ? 1 : moving ? 1 + (k % 2) : 0];
    const crouch = pose === 'crouch';
    x.drawImage(fr, 0, 0, fr.width, fr.height, 0, Wally.H - 1 - fr.height + (crouch ? 3 : 0), fr.width, fr.height - (crouch ? 3 : 0));
    if (/win/.test(pose)) { x.fillStyle = '#ffe040'; x.fillRect(19, Wally.H - fr.height - 4, 2, 2); }
    return c;
  }
  // Baron Static: a TV-headed villain in a purple suit and cape
  const R = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const leg = air ? [2, -2] : moving ? [[0, 0], [2, -1], [0, 0], [-2, 1]][k % 4] : [0, 0], bob = moving && k % 2 ? 1 : 0;
  R(1 + (capeF & 1), 12 + bob, 6, 14, '#8a1a3a'); R(2, 13 + bob, 4, 12, '#c02a50');
  R(6, 12 + bob, 12, 10, '#5a2a8a'); R(7, 13 + bob, 10, 2, '#7a4aaa'); R(11, 15 + bob, 2, 6, '#ffd040');
  R(4, 1 + bob, 16, 12, '#4a4a5a'); R(5, 2 + bob, 14, 10, '#6a6a7a'); R(6, 3 + bob, 12, 8, '#101820');
  R(7, 5 + bob, 3, 2, '#ff3040'); R(14, 5 + bob, 3, 2, '#ff3040'); R(8, 9 + bob, 8, 1, '#ff3040');
  for (let i = 0; i < 4; i++) R(6, 3 + bob + i * 2, 12, 1, 'rgba(255,255,255,0.12)');
  R(8, bob - 1, 1, 2, '#c0c0c0'); R(15, bob - 1, 1, 2, '#c0c0c0'); R(7, bob - 2, 1, 1, '#ffd040'); R(16, bob - 2, 1, 1, '#ffd040');
  R(4, 13 + bob, 2, 7, '#5a2a8a'); R(18, 13 + bob, 2, 7, '#5a2a8a');
  R(7 + leg[0], 22, 4, 7, '#3a1a5a'); R(13 - leg[0], 22, 4, 7, '#3a1a5a'); R(6 + leg[0], 29, 5, 2, '#1a1020'); R(13 - leg[0], 29, 5, 2, '#1a1020');
  return c;
};
Object.assign(HEROES, {
  dino: { name: 'DINO', alt: 'DINO', short: 'DINO', color: '#2ec4b6', secret: true, hint: ['BEAT BARON STATIC', 'AT THE STATIC TOWER'], ok: () => Ach.has('savior'), lines: ['SECRET HERO! B: TONGUE-GRAB', 'HOLD JUMP TO FLUTTER.', 'SPECIAL: DINO ROAR'] },
  baron: { name: 'BARON STATIC', alt: 'BARON STATIC', short: 'BARON', color: '#c060ff', secret: true, hint: ['BEAT BARON STATIC', 'IN NEW GAME+'], ok: () => Ach.has('ngplus'), lines: ['SECRET HERO! THE VILLAIN', 'TURNS HERO. HOVERS ON STATIC.', 'SPECIAL: STATIC ZAP!'] },
});
HERO_IDS.push('dino', 'baron');

// ---------- per-level setup: towers, wide platforms, presents, switches, ziplines, portals ----------
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initF) {
      this._initF = true;
      const def = this.def;
      if (def.tower) { this.def = Object.assign({}, this.def); this.tw = { screen: 0, n: def.tower.screens, h: -70, delay: 160, air: 600, hz: def.tower.hazard }; this.time = Math.ceil((60 + def.tower.screens * 12) * this.timeMul / 5) * 5; }
      if (assist('WIDE') && !def.tower && !def.shmup && !def.minecart) this.widenPlatforms();
      const ev = eventNow();
      if (ev === 'xmas' && this.T) this.T = Object.assign({}, this.T, { bonus: PRESENT_FRAMES });
      this.zips = (def.ziplines || []).map(([a, b, c, d]) => ({ x1: a * TS + 8, y1: b * TS + 8, x2: c * TS + 8, y2: d * TS + 8 }));
      this.portals = (def.portals || []).map(([a, b, c, d], i) => ({ a: { x: a * TS, y: (b - 1) * TS, w: 16, h: 32 }, b: { x: c * TS, y: (d - 1) * TS, w: 16, h: 32 }, col: ['#ff9020', '#40a0ff'][i % 2] }));
    }
    // assist: slow motion runs the game at 75% speed
    if (assist('SLOW') && !this.paused) { this._slow = (this._slow || 0) + 0.75; if (this._slow < 1) return; this._slow -= 1; }
    _upd.call(this);
    if (this.tw && !this.paused && !this.talk) this.updateTower();
  };
  Play.prototype.widenPlatforms = function () {
    const g = this.lv.grid, W = this.lv.w, add = [];
    for (let y = 1; y < 13; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '=' && g[y][x - 1] === '.') add.push([x - 1, y]); else if (g[y][x] === '=' && g[y][x + 1] === '.') add.push([x + 1, y]);
    add.forEach(([x, y]) => { g[y][x] = '='; });
    for (let x = 2; x < W - 3; x++) if (g[12][x] === '.' && SOLID.has(g[12][x - 1])) { let w = 0; while (x + w < W && g[12][x + w] === '.') w++; if (w >= 3 && w < 12) { g[12][x] = g[12][x - 1]; g[12][x + w - 1] = g[12][x + w] || '#'; } x += w; }
  };
}
const PRESENT_FRAMES = [0, 1, 2, 3].map((k) => {
  const c = Sprites.canvas(16, 16), x = c.getContext('2d'), col = ['#e83040', '#30a050', '#3060e0', '#e0a020'][k % 4];
  x.fillStyle = '#1a1020'; x.fillRect(0, 0, 16, 16); x.fillStyle = col; x.fillRect(1, 1, 14, 14); x.fillStyle = '#ffe060'; x.fillRect(7, 1, 2, 14); x.fillRect(1, 7, 14, 2);
  x.fillRect(4, 0, 3, 2); x.fillRect(9, 0, 3, 2); x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(2, 2, 4, 1); if (k === 1) { x.fillStyle = '#ffffff'; x.fillRect(12, 3, 1, 1); }
  return c;
});

// ---------- towers: climb room by room while lava or floodwater rises ----------
Play.prototype.towerScreen = function (k) {
  const def = LEVELS[this.li];
  window.TOWER_SCREEN = { width: 16, noAuto: true, theme: def.theme, build(b) { towerBuild(b, def, k); } };
  const lv = buildLevel(96);
  this.lv.grid = lv.grid; this.lv.spawns = lv.spawns; this.spawnIdx = 0; this.lv.goal = lv.goal;
  this.ents = []; this.platforms = []; this.balls = []; this.pings = []; this.fires = [];
  this.tw.screen = k;
  if (this.p2) { this.p2.x = this.p.x; this.p2.y = this.p.y; }
  this.parts.push({ k: 'text', s: `FLOOR ${k + 1}/${this.tw.n}`, x: 100, y: 30, vy: 0, life: 70, fixed: true });
};
Play.prototype.updateTower = function () {
  const tw = this.tw, p = this.p;
  if (this.state === 'play') {
    if (tw.delay > 0) tw.delay--; else tw.h += tw.hz === 'lava' ? 0.3 : 0.26;
    if (p.y + p.h / 2 < 0 && tw.screen < tw.n - 1) { this.towerScreen(tw.screen + 1); p.y += VH; }
    else if (p.y > VH - 8 && tw.screen > 0 && p.vy > 0) { this.towerScreen(tw.screen - 1); p.y -= VH; }
  }
  const top = VH - (tw.h - tw.screen * VH);
  tw.top = top;
  if (this.state !== 'play') return;
  if (tw.hz === 'lava') { if (p.y + p.h > top + 3) { this.parts.push({ k: 'text', s: 'TOO HOT!', x: p.x - 10, y: Math.min(p.y, 200) - 10, vy: -0.5, life: 50 }); this.die(); } }
  else {
    this.def.water = p.y + p.h / 2 > top;
    if (p.y + 4 > top) { tw.air--; if (tw.air <= 0) { this.parts.push({ k: 'text', s: 'OUT OF AIR!', x: p.x - 14, y: p.y - 10, vy: -0.5, life: 50 }); this.die(); } } else tw.air = Math.min(600, tw.air + 5);
  }
};

// ---------- the player: vines, ziplines, barrels, gravity zones, quicksand, portals, hero powers ----------
{
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    const p = this.p, D = Input.down, Pr = Input.pressed, hid = heroOf();
    if (p.inBarrel) {
      const e = p.inBarrel; p.x = e.x + 8 - p.w / 2; p.y = e.y + 6; p.vx = 0; p.vy = 0; e.hold = (e.hold || 0) + 1;
      if (Pr('jump') || e.hold > 240) { const a = e.ang; p.vx = Math.cos(a) * 8.5; p.vy = Math.sin(a) * 8.5; p.launchT = 34; p.launchVx = p.vx; p.inBarrel = null; e.cool = 40; e.hold = 0; this.shake = 6; Audio8.sfx('boom'); this.parts.push({ k: 'blast', x: e.x + 8 + Math.cos(a) * 14, y: e.y + 8 + Math.sin(a) * 14, life: 14 }); }
      return;
    }
    if (p.zip) {
      const z = p.zip.z, dx = z.x2 - z.x1, dy = z.y2 - z.y1, L = Math.hypot(dx, dy), dir = p.zip.dir;
      p.zip.v = Math.min(4.2, p.zip.v + 0.07); p.zip.s += p.zip.v * dir;
      const u = clamp(p.zip.s / L, 0, 1); p.x = z.x1 + dx * u - p.w / 2; p.y = z.y1 + dy * u + 2; p.vx = 0; p.vy = 0; p.face = dx * dir > 0 ? 1 : -1; p.onGround = false;
      if (frame % 4 === 0) this.parts.push({ k: 'spark', x: p.x + p.w / 2, y: p.y - 2, life: 6 });
      if (Pr('jump') || u <= 0 || u >= 1 || this.solidOverlap(p)) { p.vx = (dx / L) * dir * p.zip.v; p.vy = Pr('jump') ? -4.5 : (dy / L) * dir * p.zip.v; p.launchT = 20; p.launchVx = p.vx; p.zip = null; p.zipCool = 20; Audio8.sfx('jump'); }
      p.prevBottom = p.y + p.h; return;
    }
    const at = (dx = 0, dy = 0) => this.tile(Math.floor((p.x + p.w / 2 + dx) / TS), Math.floor((p.y + p.h / 2 + dy) / TS));
    if (p.climb) {
      if (p.inv > 0) p.inv--; if (p.hurtT > 0) p.hurtT--;
      p.vx = ((D('right') ? 1 : 0) - (D('left') ? 1 : 0)) * 0.8; p.vy = ((D('down') ? 1 : 0) - (D('up') ? 1 : 0)) * 1.4;
      if (p.vx) p.face = Math.sign(p.vx);
      this.move(p, false); p.anim = (p.anim || 0) + (p.vy ? 0.25 : 0);
      if (Pr('jump')) { p.climb = false; p.vy = -5.2; p.vx = p.face * 1.5; Audio8.sfx('jump'); } else if (at() !== '|' && at(0, -8) !== '|') { p.climb = false; if (p.vy < 0) p.vy = -3; }
      p.prevBottom = p.y + p.h; return;
    }
    if (!p.riding && at() === '|' && (Pr('up') || (D('up') && !p.onGround))) { p.climb = true; p.vy = 0; p.x = Math.floor((p.x + p.w / 2) / TS) * TS + 8 - p.w / 2; Audio8.sfx('select'); return; }
    if (!p.onGround && !(p.zipCool > 0) && !p.riding) for (const z of this.zips || []) {
      const cx = p.x + p.w / 2, lo = Math.min(z.x1, z.x2), hi = Math.max(z.x1, z.x2);
      if (cx < lo + 4 || cx > hi - 4) continue;
      const ly = z.y1 + ((cx - z.x1) / (z.x2 - z.x1)) * (z.y2 - z.y1);
      if (Math.abs(ly - (p.y - 2)) < 9) { const L = Math.hypot(z.x2 - z.x1, z.y2 - z.y1); p.zip = { z, s: ((cx - z.x1) / (z.x2 - z.x1)) * L, v: 1.2, dir: z.y2 >= z.y1 ? 1 : -1 }; Audio8.sfx('swoop'); return; }
    }
    if (p.zipCool > 0) p.zipCool--;
    // hero powers that replace B / special
    const dinoTongue = hid === 'dino' && !p.riding && Pr('run'), baronZap = hid === 'baron' && Pr('special') && !p.spCool;
    if (dinoTongue || baronZap || (hid === 'dino' && p.riding === false && false)) Input.pressed = (k) => (k === 'run' && dinoTongue) || (k === 'special' && baronZap) ? false : Pr(k);
    const flip = at() === ':';
    try { _up.call(this); } finally { Input.pressed = Pr; }
    if (dinoTongue && !p.chompT) { this.chomp(); p.tongueT = 14; }
    if (baronZap) { if (p.special > 0) { p.special--; p.spCool = 30; this.staticZap(); } else Audio8.sfx('tick'); }
    if (hid === 'dino' && !p.onGround && !p.riding && D('jump') && p.vy > 0.3 && (p.flut || 0) < 50) { p.vy = (p.flut || 0) < 18 ? -0.5 : 0.25; p.flut = (p.flut || 0) + 1; if (frame % 4 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + p.h, vx: 0, vy: 0.5, life: 10 }); }
    if (hid === 'baron' && !p.onGround && D('jump') && p.vy > 1) { p.vy = 1; if (frame % 6 === 0) this.parts.push({ k: 'spark', x: p.x + p.w / 2, y: p.y - 4, life: 8 }); }
    if (p.onGround) p.flut = 0;
    if (p.tongueT > 0) p.tongueT--;
    if (p.launchT > 0) { p.launchT--; p.vx = p.launchVx; if (p.onGround || p.hitWall) p.launchT = 0; }
    // gravity zones: fall upward and walk on the ceiling
    p.flipG = flip;
    if (flip) { p.vy = Math.max(-5.5, p.vy - 1.0); p.ceilT = p.ceil ? (p.ceilT || 0) + 1 : 0; if (p.ceil && Pr('jump')) { p.vy = 5.2; Audio8.sfx('jump'); } }
    else p.ceilT = 0;
    // quicksand: sink slowly, struggle out by jumping
    if (at(0, 4) === '$' || at(0, -2) === '$') { p.vy = Math.min(p.vy, 0.35); p.vx *= 0.6; if (Pr('jump')) { p.vy = -3.6; Audio8.sfx('swim'); } if (frame % 8 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + p.h - 4, vx: 0, vy: -0.4, life: 12 }); }
    // portals
    if (p.portCool > 0) p.portCool--;
    for (const pr of this.portals || []) for (const [a, b] of [[pr.a, pr.b], [pr.b, pr.a]]) {
      if (p.portCool > 0 || !overlap(p, a)) continue;
      p.x = b.x + 8 - p.w / 2 + (p.vx >= 0 ? 6 : -6); p.y = b.y + 32 - p.h; p.portCool = 40; Audio8.sfx('secret'); this.parts.push({ k: 'star', x: b.x + 8, y: b.y + 16, life: 14 }); break;
    }
  };
  const _hb = Play.prototype.hitBlock;
  Play.prototype.hitBlock = function (tx, ty) {
    const p = this.p;
    if (p.flipG && p.ceilT > 1) return;
    if (this.tile(tx, ty) === '{') {
      this.switchOff = !this.switchOff; this.bumps.push({ tx, ty, t: 0 }); Audio8.sfx('secret'); rumble(0.3, 100);
      const g = this.lv.grid, sw = { '[': '(', '(': '[', ']': ')', ')': ']' };
      for (const row of g) for (let x = 0; x < row.length; x++) if (sw[row[x]]) row[x] = sw[row[x]];
      for (const q of [p, this.p2]) if (q && this.solidOverlap(q)) q.y -= 16;
      return;
    }
    return _hb.call(this, tx, ty);
  };
  Play.prototype.staticZap = function () {
    const p = this.p, near = this.ents.filter((e) => e.enemy && e.alive && !e.dying && Math.abs(e.x - p.x) < VW).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)).slice(0, 3);
    Audio8.sfx('zap'); this.shake = 8; rumble(0.5, 160);
    this.zaps = near.map((e) => ({ x1: p.x + p.w / 2, y1: p.y, x2: e.x + e.w / 2, y2: e.y + e.h / 2, t: 14 }));
    for (const e of near) { if (e.boss) this.damageBoss(e); else if (e.yeti) this.damageYeti(e); else this.flipKill(e); }
    if (!near.length) this.zaps = [{ x1: p.x + p.w / 2, y1: p.y, x2: p.x + p.w / 2 + p.face * 60, y2: p.y - 20, t: 12 }];
  };
  const _mount = Play.prototype.mount;
  Play.prototype.mount = function (e) { if (heroOf() === 'dino') { e.alive = false; this.addScore(1000, e.x, e.y); this.parts.push({ k: 'text', s: 'DINO PAL!', x: e.x - 10, y: e.y - 10, vy: -0.5, life: 50 }); return; } return _mount.call(this, e); };
  const _dp = Play.prototype.drawPlayer;
  Play.prototype.drawPlayer = function (cx) {
    const p = this.p;
    for (const z of this.zips || []) { ctx.strokeStyle = '#d0d8e8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(z.x1 - cx, z.y1); ctx.lineTo(z.x2 - cx, z.y2); ctx.stroke(); for (const [x, y] of [[z.x1, z.y1], [z.x2, z.y2]]) { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(Math.round(x - cx) - 2, y - 4, 4, 8); } }
    if (p.inBarrel) return;
    if (p.flipG) { ctx.save(); const my = p.y + p.h / 2; ctx.translate(0, my * 2); ctx.scale(1, -1); _dp.call(this, cx); ctx.restore(); }
    else _dp.call(this, cx);
    if (p.zip) { ctx.fillStyle = '#5a5a6a'; ctx.fillRect(Math.round(p.x + p.w / 2 - cx) - 4, Math.round(p.y) - 4, 8, 3); }
    if (p.tongueT > 0) { const len = Math.round(Math.sin((p.tongueT / 14) * Math.PI) * 26), x0 = Math.round(p.x + p.w / 2 - cx + p.face * 8), y0 = Math.round(p.y + 8); ctx.fillStyle = '#ff6080'; ctx.fillRect(p.face > 0 ? x0 : x0 - len, y0, len, 2); ctx.fillRect(p.face > 0 ? x0 + len - 2 : x0 - len - 1, y0 - 1, 4, 4); }
  };
}

// ---------- new entities and bosses ----------
{
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    const x = sp.x * TS, y = sp.y * TS, E = (o) => { const e = Object.assign({ t: 0, alive: true, vx: 0, vy: 0, enemy: false }, o); this.ents.push(e); return e; };
    switch (sp.t) {
      case '8': E({ type: 'cactus', x: x + 2, y: y - 4, w: 12, h: 20, enemy: true, stomp: false, cool: 60 + (sp.x % 5) * 10 }); return;
      case '9': E({ type: 'boulderTrig', x, y, w: 1, h: 1 }); return;
      case 'd': E({ type: 'darts', x, y, w: 16, h: 16, cool: 40 }); return;
      case '0': E({ type: 'barrel', x, y, w: 16, h: 16, ang: -Math.PI / 4, t: 0 }); return;
      case '*': {
        const kind = this.def.bossType || 'golem', hpBase = (this.def.bossHp || 6) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0) + (game.plus && !this.rush ? 2 * game.plus : 0);
        const sz = { golem: [28, 36], sandworm: [24, 20], emperor: [28, 34] }[kind];
        E({ type: kind, boss: true, enemy: true, x, y: y + 16 - sz[1], w: sz[0], h: sz[1], hp: hpBase, maxHp: hpBase, inv: 0, state: kind === 'sandworm' ? 'under' : 'idle', act: 80, face: -1, groundY: y + 16 });
        return;
      }
      default: return _sp.call(this, sp);
    }
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p, frozen = this.freezeT > 0;
    switch (e.type) {
      case 'cactus':
        if (!e.dying && !frozen && !this._p2ctx && --e.cool <= 0 && Math.abs(p.x - e.x) < 200) { e.cool = 130; for (const d of [-1, 1]) this.ents.push({ type: 'needle', alive: true, t: 0, x: e.x + 4, y: e.y + 6, w: 6, h: 3, vx: d * 2.4, hazard: true }); Audio8.sfx('tick'); }
        break;
      case 'needle': if (!frozen) { e.x += e.vx; if (++e.t > 90 || SOLID.has(this.tile(Math.floor((e.x + 3) / TS), Math.floor(e.y / TS)))) e.alive = false; } break;
      case 'boulderTrig':
        if (!this._p2ctx && p.x > e.x && this.state === 'play') { e.alive = false; this.ents.push({ type: 'boulder', alive: true, t: 0, x: this.cam.x - 40, y: e.y - 16, w: 30, h: 30, vx: 1.6, vy: 0, rot: 0 }); Audio8.sfx('thunder'); this.shake = 20; this.parts.push({ k: 'text', s: 'RUN!!', x: this.cam.x + 110, y: 60, vy: 0, life: 80 }); }
        return;
      case 'boulder':
        if (this._p2ctx) { if (overlap(p, e) && this.state === 'play') this.die(); return; }
        e.vx = Math.min(2.45, e.vx + 0.01); e.vy = Math.min(6, e.vy + 0.3); this.move(e, false); e.rot += e.vx * 0.06; this.shake = Math.max(this.shake, 2);
        for (const o of this.ents) if (o.enemy && o.alive && !o.dying && !o.boss && overlap(o, e)) this.flipKill(o);
        if (e.hitWall || e.y > VH) { e.alive = false; Audio8.sfx('boom'); this.shake = 14; for (let k = 0; k < 8; k++) this.parts.push({ k: 'frag', x: e.x + 15, y: e.y + 15, vx: (k - 4) * 0.6, vy: -3 - (k % 3), g: 0.3, life: 50 }); }
        if (this.state === 'play' && overlap(p, e)) { this.parts.push({ k: 'text', s: 'SQUASHED!', x: p.x - 10, y: p.y - 10, vy: -0.5, life: 50 }); this.die(); }
        return;
      case 'darts':
        if (!frozen && !this._p2ctx && --e.cool <= 0 && Math.abs(p.y - e.y) < 50 && Math.abs(p.x - e.x) < 180) { e.cool = 100; const d = p.x < e.x ? -1 : 1; this.ents.push({ type: 'dart', alive: true, t: 0, x: e.x + 8 + d * 8, y: e.y + 6, w: 8, h: 3, vx: d * 3.4, hazard: true }); Audio8.sfx('swoop'); }
        return;
      case 'dart': if (!frozen) { e.x += e.vx; if (++e.t > 80 || SOLID.has(this.tile(Math.floor((e.x + 4) / TS), Math.floor(e.y / TS)))) e.alive = false; } break;
      case 'barrel':
        e.t++; if (e.cool > 0) e.cool--;
        if (!p.inBarrel || p.inBarrel !== e) e.ang = -Math.PI / 2 + Math.sin(e.t * 0.035) * 1.1;
        if (!this._p2ctx && !p.inBarrel && !e.cool && this.state === 'play' && overlap(p, e) && !p.riding) { p.inBarrel = e; e.hold = 0; p.swing = null; p.zip = null; p.climb = false; Audio8.sfx('select'); }
        return;
      case 'golem': return this.updateGolem(e);
      case 'sandworm': return this.updateWorm(e);
      case 'emperor': return this.updateEmperor(e);
      case 'wave': if (!frozen) { e.x += e.vx; if (++e.t > 100) e.alive = false; } break;
      case 'rock2': if (!frozen) { e.vy += 0.25; e.x += e.vx; e.y += e.vy; if (e.y > VH || SOLID.has(this.tile(Math.floor((e.x + 4) / TS), Math.floor((e.y + 8) / TS)))) { e.alive = false; this.parts.push({ k: 'dust', x: e.x + 4, y: e.y + 4, vx: 0, vy: -0.5, life: 14 }); } } break;
      default:
    }
    return _ue.call(this, e);
  };
  const contact = function (e, stompable, top = 10) {
    const p = this.p;
    if (this.state !== 'play' || !overlap(p, e)) return;
    if (p.charge > 0) { this.damageBoss(e); return; }
    if (stompable && p.vy > 0 && p.prevBottom <= e.y + top) { p.vy = Input.down('jump') ? -7 : -5.5; this.damageBoss(e); } else this.hurt();
  };
  const wave = (pl, x, y, d) => pl.ents.push({ type: 'wave', alive: true, t: 0, x, y: y - 10, w: 10, h: 10, vx: d * 2.6, hazard: true });
  Play.prototype.updateGolem = function (e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    if (!this.bossLock || e.dying || this._p2ctx) return;
    if (this.freezeT > 0) { contact.call(this, e, true); return; }
    e.t++; e.act--; e.vy = Math.min(6, e.vy + 0.35); const rage = e.maxHp - e.hp;
    if (e.state === 'idle' || e.state === 'walk') { e.state = 'walk'; e.vx = (p.x < e.x ? -1 : 1) * (0.4 + rage * 0.06); e.face = Math.sign(e.vx); if (e.act <= 0) { e.state = (e.t >> 4) % 2 ? 'slam' : 'throw'; e.act = 50; e.vx = 0; if (e.state === 'slam') { e.vy = -6.5; Audio8.sfx('roar'); } } }
    else if (e.state === 'slam') { if (e.onGround && e.act < 40) { this.shake = 18; Audio8.sfx('thunder'); rumble(0.7, 250); wave(this, e.x - 8, e.y + e.h, -1); wave(this, e.x + e.w - 2, e.y + e.h, 1); if (rage >= 3) { wave(this, e.x - 30, e.y + e.h, -1); } e.state = 'stun'; e.act = 90 - rage * 6; } }
    else if (e.state === 'throw') { if (e.act === 25) { for (let k = 0; k < 1 + (rage >> 1); k++) this.ents.push({ type: 'rock2', alive: true, t: 0, x: e.x + 12, y: e.y - 6, w: 8, h: 8, vx: (p.x - e.x) / 55 + (k - 0.5) * 0.6, vy: -5, hazard: true }); Audio8.sfx('swoop'); } if (e.act <= 0) { e.state = 'walk'; e.act = 110 - rage * 10; } }
    else if (e.state === 'stun') { e.vx = 0; if (e.act <= 0) { e.state = 'walk'; e.act = 100 - rage * 8; } }
    this.move(e, false); e.x = clamp(e.x, this.camMin + 12, this.camMin + VW - 44);
    contact.call(this, e, e.state === 'stun', 12);
  };
  Play.prototype.updateWorm = function (e) {
    const p = this.p, gy = e.groundY;
    if (e.inv > 0) e.inv--;
    if (!this.bossLock || e.dying || this._p2ctx) return;
    if (this.freezeT > 0) { if (e.state === 'up') contact.call(this, e, true); return; }
    e.t++; e.act--; const rage = e.maxHp - e.hp;
    if (e.state === 'under') { e.enemy = false; e.y = gy + 6; e.x += clamp(p.x - e.x, -1 - rage * 0.15, 1 + rage * 0.15); if (frame % 6 === 0) this.parts.push({ k: 'dust', x: e.x + 12, y: gy - 2, vx: 0, vy: -0.6, life: 12 }); if (e.act <= 0) { e.state = 'warn'; e.act = 40; Audio8.sfx('dig'); } }
    else if (e.state === 'warn') { this.shake = 3; if (frame % 3 === 0) this.parts.push({ k: 'dust', x: e.x + 4 + ((frame * 7) % 16), y: gy - 4, vx: 0, vy: -1.2, life: 14 }); if (e.act <= 0) { e.state = 'rise'; e.act = 22; e.enemy = true; Audio8.sfx('roar'); } }
    else if (e.state === 'rise') { e.y = gy - 6 - (1 - e.act / 22) * 66; if (this.state === 'play' && overlap(p, e)) this.hurt(); if (e.act <= 0) { e.state = 'up'; e.act = 90 - rage * 8; } }
    else if (e.state === 'up') { e.y = gy - 72 + Math.sin(e.t * 0.1) * 3; if (e.act % 40 === 20) { this.ents.push({ type: 'rock2', alive: true, t: 0, x: e.x + 8, y: e.y + 10, w: 8, h: 8, vx: (p.x - e.x) / 45, vy: -2.5, hazard: true, sand: true }); Audio8.sfx('chomp'); } contact.call(this, e, true, 10); if (e.act <= 0) { e.state = 'sink'; e.act = 22; } }
    else if (e.state === 'sink') { e.y = gy - 72 + (1 - e.act / 22) * 78; if (e.act <= 0) { e.state = 'under'; e.act = 100 - rage * 10; } }
    e.x = clamp(e.x, this.camMin + 16, this.camMin + VW - 40);
  };
  Play.prototype.updateEmperor = function (e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    if (!this.bossLock || e.dying || this._p2ctx) return;
    if (this.freezeT > 0) { contact.call(this, e, true); return; }
    e.t++; e.act--; const rage = e.maxHp - e.hp, floorY = e.groundY - e.h;
    if (e.state === 'idle') {
      e.x += clamp(p.x - e.x - 10, -1.2, 1.2) * 0.5; e.y += (60 + Math.sin(e.t * 0.05) * 10 - e.y) * 0.08;
      if (e.act <= 0) { const seq = ['bolts', 'laser', 'stomp', 'balls']; e.state = seq[(e.n = ((e.n || 0) + 1)) % 4]; e.act = { bolts: 120, laser: 150, stomp: 70, balls: 80 }[e.state]; if (e.state === 'laser') e.beamX = this.camMin + 16; Audio8.sfx('lasercharge'); }
    } else if (e.state === 'bolts') { if (e.act % 34 === 0) this.ents.push({ type: 'bolt', alive: true, t: 0, x: p.x + p.w / 2 - 4 + ((e.act * 13) % 40) - 20, y: 0, w: 8, h: 8 }); if (e.act <= 0) { e.state = 'idle'; e.act = 70 - rage * 3; } }
    else if (e.state === 'laser') { e.beamX += 1.6 + rage * 0.12; if (this.state === 'play' && e.act < 130 && Math.abs(p.x + p.w / 2 - e.beamX) < 6) this.hurt(); if (e.act <= 0 || e.beamX > this.camMin + VW - 16) { e.state = 'idle'; e.act = 60; e.beamX = null; } }
    else if (e.state === 'stomp') { if (e.act > 40) { e.x += clamp(p.x - e.x - 10, -2, 2); e.y += (20 - e.y) * 0.1; } else { e.y = Math.min(floorY, e.y + 7); if (e.y >= floorY && !e.landed) { e.landed = true; this.shake = 20; Audio8.sfx('thunder'); rumble(0.8, 250); wave(this, e.x - 8, e.groundY, -1); wave(this, e.x + e.w, e.groundY, 1); e.state = 'dizzy'; e.act = 90 - rage * 4; } } }
    else if (e.state === 'dizzy') { e.landed = false; if (e.act <= 0) { e.state = 'idle'; e.act = 60; } }
    else if (e.state === 'balls') { if (e.act % 20 === 0 && e.act > 0) { this.ents.push({ type: 'jball', alive: true, t: 0, x: e.x + 10, y: e.y + 20, w: 8, h: 8, vx: (p.x < e.x ? -1 : 1) * (1 + (e.act % 3) * 0.5), vy: -3, hazard: true, col: ['#ff40c0', '#40ffe0', '#a040ff'][(e.act / 20) % 3] }); Audio8.sfx('swoop'); } if (e.act <= 0) { e.state = 'idle'; e.act = 60; } }
    e.x = clamp(e.x, this.camMin + 16, this.camMin + VW - 44);
    contact.call(this, e, e.state === 'dizzy', 12);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) {
    const was = e.alive; _db.call(this, e);
    if (was && !e.alive) {
      if (['golem', 'sandworm', 'emperor'].includes(e.type)) { Sticker.add(e.type); this.ents.forEach((k) => { if (['wave', 'rock2', 'jball', 'bolt'].includes(k.type)) k.alive = false; }); }
      if (e.type === 'emperor') Ach.unlock('truehero');
      if (this.def.final && game.plus) Ach.unlock('ngplus');
    }
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    switch (e.type) {
      case 'cactus': { if (e.dying) { ctx.save(); ctx.translate(x + 6, y + 10); ctx.scale(1, -1); stickerArt('cactus', 0, 0, frame); ctx.restore(); } else { ctx.save(); ctx.translate(x + 6, y + 11); ctx.scale(1.2, 1.2); stickerArt('cactus', 0, 0, frame); ctx.restore(); } return; }
      case 'needle': ctx.fillStyle = '#e8e0c0'; ctx.fillRect(x, y, 6, 1); ctx.fillRect(x + (e.vx > 0 ? 5 : 0), y - 1, 1, 3); return;
      case 'boulder': { ctx.save(); ctx.translate(x + 15, y + 15); ctx.rotate(e.rot); ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a7a6a'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6a5a4a'; ctx.fillRect(-8, -4, 6, 5); ctx.fillRect(3, 5, 7, 4); ctx.fillRect(2, -10, 4, 4); ctx.fillStyle = '#a89888'; ctx.fillRect(-10, -9, 5, 2); ctx.restore(); return; }
      case 'darts': { ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = '#7a8a6a'; ctx.fillRect(x + 1, y + 1, 14, 14); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 3, y + 4, 3, 3); ctx.fillRect(x + 10, y + 4, 3, 3); ctx.fillRect(x + 5, y + 10, 6, 3); ctx.fillStyle = e.cool < 15 ? '#ff4020' : '#3a4a2a'; ctx.fillRect(x + 4, y + 5, 1, 1); ctx.fillRect(x + 11, y + 5, 1, 1); return; }
      case 'dart': ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x, y, 8, 2); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(e.vx > 0 ? x + 6 : x, y - 1, 2, 4); ctx.fillStyle = '#ff4060'; ctx.fillRect(e.vx > 0 ? x : x + 6, y - 1, 2, 4); return;
      case 'barrel': {
        ctx.save(); ctx.translate(x + 8, y + 8); ctx.rotate(e.ang + Math.PI / 2);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(-9, -11, 18, 22); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-8, -10, 16, 20); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-8, -6, 16, 2); ctx.fillRect(-8, 4, 16, 2); ctx.fillStyle = '#1a1020'; ctx.fillRect(-6, -12, 12, 3);
        if (this.p.inBarrel === e && (frame >> 3) & 1) { ctx.fillStyle = '#ffe040'; ctx.fillRect(-1, -20, 2, 6); }
        ctx.restore();
        if (this.p.inBarrel === e) txt('A!', x + 8, y - 16, '#ffe040', { align: 'center', outline: '#101848' });
        return;
      }
      case 'golem': drawGolem(x, y + 4, e, frame); return;
      case 'sandworm': if (e.state === 'under' || e.state === 'warn') { ctx.fillStyle = '#c89048'; for (let k = 0; k < 5; k++) ctx.fillRect(x + k * 6 - 4, e.groundY - 3 - ((frame + k * 3) >> 2) % 3, 5, 3); return; } drawWorm(x, y, e, frame, e.groundY); return;
      case 'emperor': drawEmperor(x, y, e, frame); if (e.state === 'laser' && e.beamX) { const bx = Math.round(e.beamX - cx); ctx.fillStyle = e.act > 130 ? ((frame >> 1) & 1 ? 'rgba(255,60,200,0.7)' : 'rgba(255,255,255,0.4)') : '#ff40c0'; ctx.fillRect(bx - (e.act > 130 ? 1 : 4), 0, e.act > 130 ? 2 : 8, VH); if (e.act <= 130) { ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 1, 0, 2, VH); } } return;
      case 'wave': ctx.fillStyle = (frame >> 1) & 1 ? '#ffe080' : '#ffffff'; for (let k = 0; k < 3; k++) ctx.fillRect(x + k * 3, y + 10 - k * 3 - (k === 1 ? 3 : 0), 3, k * 3 + 3); return;
      case 'rock2': ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 10, 10); ctx.fillStyle = e.sand ? '#d8a060' : '#8a8a78'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = e.sand ? '#f0c888' : '#a8a898'; ctx.fillRect(x + 1, y + 1, 3, 2); return;
      default:
    }
    return _de.call(this, e, cx);
  };
}

// ---------- drawing extras: portals, tower hazard, zaps, glitches, sandstorm, seasonal touches ----------
{
  const _dw = Play.prototype.drawWeather;
  Play.prototype.drawWeather = function (cx) {
    for (const pr of this.portals || []) for (const r of [pr.a, pr.b]) {
      const x = Math.round(r.x - cx), y = r.y;
      for (let k = 0; k < 6; k++) { const s = 1 - k * 0.14; ctx.strokeStyle = k % 2 ? '#ffffff' : pr.col; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 8, y + 16, 7 * s, 15 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = pr.col; ctx.fillRect(x + 7 + Math.round(Math.sin(frame * 0.2) * 4), y + 4 + ((frame >> 1) % 24), 2, 2);
    }
    _dw.call(this, cx);
    if (this.def.weather === 'sandstorm') {
      const w = Math.abs(this.windNow());
      ctx.fillStyle = `rgba(220,170,100,${0.12 + w * 0.22})`; ctx.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 50 + w * 60; i++) { const x = (((i * 97 + frame * (3 + (i % 4))) % VW) + VW) % VW, y = (i * 37 + Math.sin(frame * 0.05 + i) * 10) % VH; ctx.fillStyle = i % 3 ? 'rgba(240,200,140,0.8)' : 'rgba(200,150,90,0.8)'; ctx.fillRect(Math.round(x), Math.round(y), 2, 1); }
    }
    if (this.tw) {
      const top = this.tw.top || VH, lava = this.tw.hz === 'lava';
      if (top < VH) {
        ctx.fillStyle = lava ? 'rgba(255,90,20,0.92)' : 'rgba(40,110,220,0.55)'; ctx.fillRect(0, Math.max(0, Math.round(top)), VW, VH);
        ctx.fillStyle = lava ? '#ffd060' : 'rgba(210,240,255,0.9)'; for (let x = 0; x < VW; x += 4) ctx.fillRect(x, Math.round(top + Math.sin(x * 0.1 + frame * 0.12) * 2), 4, 2);
        if (lava) for (let k = 0; k < 6; k++) { ctx.fillStyle = '#ffe080'; ctx.fillRect((k * 53 + frame) % VW, Math.round(top) + 6 + ((k * 7 + frame) % 20), 2, 2); }
      }
      if (!lava && this.tw.air < 600) { const n = Math.ceil(this.tw.air / 100); for (let k = 0; k < 6; k++) { ctx.fillStyle = k < n ? '#d0f0ff' : 'rgba(255,255,255,0.15)'; ctx.fillRect(Math.round(this.p.x - cx) - 6 + k * 4, Math.round(this.p.y) - 10, 3, 3); } }
    }
    for (const z of this.zaps || []) { if (z.t-- <= 0) continue; ctx.fillStyle = z.t & 1 ? '#c080ff' : '#ffffff'; let px = z.x1 - cx, py = z.y1; for (let s = 1; s <= 8; s++) { const nx = z.x1 - cx + ((z.x2 - z.x1) * s) / 8 + (s < 8 ? ((s * 37 + frame) % 9) - 4 : 0), ny = z.y1 + ((z.y2 - z.y1) * s) / 8 + (s < 8 ? ((s * 53 + frame) % 9) - 4 : 0); const steps = Math.max(Math.abs(nx - px), Math.abs(ny - py)); for (let q = 0; q < steps; q += 1) ctx.fillRect(Math.round(px + ((nx - px) * q) / steps), Math.round(py + ((ny - py) * q) / steps), 2, 2); px = nx; py = ny; } }
    const ev = eventNow();
    if (ev === 'halloween') for (let k = 0; k < 5; k++) { const bx = ((k * 83 + frame * (0.6 + k * 0.1)) % (VW + 40)) - 20, by = 30 + k * 14 + Math.sin(frame * 0.1 + k) * 6, f = (frame >> 2) & 1; ctx.fillStyle = '#1a1020'; ctx.fillRect(Math.round(bx), Math.round(by), 6, 3); ctx.fillRect(Math.round(bx) - 3, Math.round(by) - (f ? 2 : 0), 3, 2); ctx.fillRect(Math.round(bx) + 6, Math.round(by) - (f ? 2 : 0), 3, 2); }
    if (ev === 'birthday') for (let k = 0; k < 24; k++) { ctx.fillStyle = ['#ff4060', '#ffe040', '#40c0ff', '#40e080', '#c060ff'][k % 5]; ctx.fillRect((k * 61 + Math.sin(frame * 0.03 + k) * 10) % VW, (k * 37 + frame * (0.5 + (k % 3) * 0.3)) % VH, 2, 2); }
  };
  const _windNow = Play.prototype.windNow;
  Play.prototype.windNow = function () {
    if (this.def.weather !== 'sandstorm') return _windNow.call(this);
    const cyc = frame % 540, dir = ((frame / 540) | 0) % 2 ? 1 : -1;
    return cyc < 260 ? 0 : dir * 0.8 * Math.min(1, (cyc - 260) / 40, (540 - cyc) / 40);
  };
  const _draw = Play.prototype.draw;
  Play.prototype.draw = function () {
    _draw.call(this);
    if (this.def.glitch && !this.photo) { // the Static Dimension flickers and tears
      const g = frame % 150;
      if (g < 8) for (let k = 0; k < 5; k++) { const y = ((frame * 37 + k * 53) % (VH - 12)), h = 3 + ((k * 7 + frame) % 9), dx = ((k * 13 + frame * 5) % 13) - 6; ctx.drawImage(cv, 0, y, VW, h, dx, y, VW, h); }
      if (g < 3) { ctx.fillStyle = 'rgba(255,40,200,0.15)'; ctx.fillRect(0, 0, VW, VH); }
    }
    if (this.tw) txt(`FLOOR ${this.tw.screen + 1}/${this.tw.n}`, 128, 214, '#fff', { align: 'center', outline: '#101848' });
  };
  const _dh = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _dh.call(this);
    const ev = eventNow();
    if (ev && this.stateT < 150 && this.state === 'play') txt({ halloween: 'HAPPY HALLOWEEN!', xmas: 'MERRY CHRISTMAS!', birthday: 'HAPPY BIRTHDAY WALLYMAN!' }[ev], 128, 76, ev === 'halloween' ? '#ff9020' : ev === 'xmas' ? '#ff6060' : '#ffe040', { align: 'center', outline: '#101848' });
  };
  const _clear = Play.prototype.clear;
  Play.prototype.clear = function (s) { const was = this.state; _clear.call(this, s); if (was === 'play' && this.state === 'clear' && this.def.tower) Ach.unlock('tower'); };
}
// halloween witch hats on Grumbles, a santa hat for the hero at Christmas
{
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    _de.call(this, e, cx);
    if (e.type === 'grumble' && !e.dying && eventNow() === 'halloween') { const x = Math.round(e.x - cx), y = Math.round(e.y) - 1; ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y, 16, 2); for (let k = 0; k < 6; k++) ctx.fillRect(x + 4 + (k >> 1), y - 1 - k, 6 - k, 1); ctx.fillStyle = '#ff9020'; ctx.fillRect(x + 4, y - 1, 6, 1); }
  };
  Wally.HATS.santa = { w: 11, h: 9, draw(x, p, t) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); }; for (let i = 0; i < 6; i++) r(3 + Math.floor(i / 2), 1 + i, 7 - i, 1, '#e02030'); r(9, 0, 2, 2, '#ffffff'); r(0, 7, 11, 2, '#ffffff'); } };
  const _wd = Wally.draw;
  Wally.draw = function (c, x, y, pose, face, o = {}) { if (o.hat === undefined && Wally.hat === 'none' && eventNow() === 'xmas' && !o.ghost && !o.black) o = Object.assign({}, o, { hat: 'santa' }); return _wd(c, x, y, pose, face, o); };
}
{ // the map and title screen dress up for events
  const _Map = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _Map(...a), d = s.draw;
    s.draw = function () {
      d.call(this);
      const ev = eventNow(); if (!ev) return;
      const nodes = WORLDS[game.world || 0].nodes();
      if (ev === 'halloween') nodes.forEach((n, i) => { if (i % 2) return; const x = n.x + 10, y = n.y + 2; ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 9, 8); ctx.fillStyle = '#ff8a20'; ctx.fillRect(x, y, 7, 6); ctx.fillStyle = '#3a8a2a'; ctx.fillRect(x + 3, y - 2, 1, 2); ctx.fillStyle = (frame >> 3) & 1 ? '#ffe040' : '#1a1020'; ctx.fillRect(x + 1, y + 2, 1, 1); ctx.fillRect(x + 5, y + 2, 1, 1); ctx.fillRect(x + 2, y + 4, 3, 1); });
      if (ev === 'xmas') { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 67 + Math.sin(frame * 0.02 + i) * 6) % VW, (i * 41 + frame * 0.5) % 170 + 28, 1, 1); nodes.forEach((n, i) => { if (i % 3) return; ctx.drawImage(PRESENT_FRAMES[i % 4], n.x + 8, n.y - 2, 8, 8); }); }
      if (ev === 'birthday') { const h = nodes[0]; ctx.fillStyle = '#1a1020'; ctx.fillRect(h.x + 9, h.y - 6, 12, 8); ctx.fillStyle = '#ffe0f0'; ctx.fillRect(h.x + 10, h.y - 5, 10, 6); ctx.fillStyle = '#ff60a0'; ctx.fillRect(h.x + 10, h.y - 5, 10, 2); ctx.fillStyle = '#ffe040'; ctx.fillRect(h.x + 14, h.y - 9, 2, 3); for (let k = 0; k < 20; k++) { ctx.fillStyle = ['#ff4060', '#ffe040', '#40c0ff'][k % 3]; ctx.fillRect((k * 61 + frame) % VW, (k * 29 + frame * 0.7) % 170 + 28, 2, 2); } }
    };
    return s;
  };
  const _Title = TitleScene;
  TitleScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _Title(...a), d = s.draw;
    s.draw = function () {
      d.call(this);
      const ev = eventNow(); if (!ev) return;
      txt({ halloween: 'HAPPY HALLOWEEN!', xmas: 'MERRY CHRISTMAS!', birthday: 'HAPPY BIRTHDAY, WALLYMAN!' }[ev], 128, 94, ev === 'halloween' ? '#ff9020' : ev === 'xmas' ? '#ff6060' : '#ffe040', { align: 'center', outline: '#101848' });
      if (ev === 'xmas') { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 50; i++) ctx.fillRect((i * 67 + Math.sin(frame * 0.02 + i) * 6) % VW, (i * 41 + frame * 0.6) % VH, i % 4 ? 1 : 2, i % 4 ? 1 : 2); }
      if (ev === 'halloween') for (let k = 0; k < 3; k++) { const x = 20 + k * 100, y = 196; ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 13, 11); ctx.fillStyle = '#ff8a20'; ctx.fillRect(x, y, 11, 9); ctx.fillStyle = (frame >> 3) & 1 ? '#ffe040' : '#1a1020'; ctx.fillRect(x + 2, y + 2, 2, 2); ctx.fillRect(x + 7, y + 2, 2, 2); ctx.fillRect(x + 3, y + 6, 5, 1); }
      if (ev === 'birthday') for (let k = 0; k < 40; k++) { ctx.fillStyle = ['#ff4060', '#ffe040', '#40c0ff', '#40e080', '#c060ff'][k % 5]; ctx.fillRect((k * 61 + Math.sin(frame * 0.03 + k) * 10) % VW, (k * 37 + frame * 0.8) % VH, 2, 3); }
    };
    return s;
  };
}

// ---------- assist mode: infinite hearts, and a safe catch when falling into a pit ----------
{
  const _hurt = Play.prototype.hurt;
  Play.prototype.hurt = function (spike) { if (assist('HEARTS') && this.p.hearts <= 1 && !this.versus) this.p.hearts = 2; return _hurt.call(this, spike); };
  const safeSpot = (pl, q) => {
    for (let tx = Math.floor((q.x + q.w / 2) / TS); tx > 0; tx--) for (let ty = 2; ty < 14; ty++) if (SOLID.has(pl.tile(tx, ty)) && !SOLID.has(pl.tile(tx, ty - 1)) && !SOLID.has(pl.tile(tx, ty - 2)) && pl.tile(tx, ty) !== '^') return [tx * TS + 3, (ty - 1) * TS + 16 - q.h];
    return [q.x, 40];
  };
  window.safeSpot = safeSpot;
  const _die = Play.prototype.die;
  Play.prototype.die = function () {
    if (assist('HEARTS') && !this.versus && !this.tw && this.state === 'play' && !this.def.shmup && this.time > 0 && !this._p2ctx) {
      const p = this.p, [x, y] = safeSpot(this, p); p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.inv = 120; p.hearts = Math.max(p.hearts, 2); p.climb = false; p.zip = null; p.inBarrel = null;
      this.parts.push({ k: 'text', s: 'ASSIST SAVE!', x: x - 20, y: y - 14, vy: -0.4, life: 60 }); Audio8.sfx('secret'); return;
    }
    return _die.call(this);
  };
}
