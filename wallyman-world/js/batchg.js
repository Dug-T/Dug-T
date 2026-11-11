'use strict';
// =====================================================================
// Batch G: Drill / Balloon / Giga / Ghost Cloak power-ups, buried
// treasure, snowboarding, submarine, haunted train, Neon City, combo
// meter, Wally Town (quests + home decorating), EX Boss Rush, daily
// login rewards, online ghost races, credits, intro movie, boss music,
// colour assist, readable text, and installing the game as an app.
// =====================================================================
ACH_LIST.push(['combo', 'COMBO KING', 'REACH AN X8 COMBO'], ['treasure', 'X MARKS THE SPOT', 'DIG UP BURIED TREASURE'], ['shredder', 'SHREDDER', 'SCORE 2000 TRICK POINTS IN ONE RUN'], ['squid', 'INK-CREDIBLE', 'BEAT THE GIANT SQUID'], ['quests', 'GOOD NEIGHBOUR', 'FINISH 3 TOWN QUESTS'], ['decorator', 'HOME SWEET HOME', 'FILL EVERY SPOT IN YOUR HOME'], ['exrush', 'EX-TREME', 'CLEAR THE EX BOSS RUSH']);
STICKERS.push(['squid', 'GIANT SQUID', 'b']);
Object.assign(BOSS_TALK, { squid: [['boss', 'BLUB BLUB... WHO DARES DIVE INTO MY TRENCH?'], ['hero', 'JUST ME AND MY TORPEDOES. SORRY, SQUIDDY!']] });
Object.assign(BOSS_ART, { squid: 'squid' }); Object.assign(BOSS_NAMES, { squid: 'GIANT SQUID' });
Object.assign(SONG_NAMES, { neon: 'NEON CITY', bossufo: 'UFO SHOWDOWN', bossice: 'FROZEN FURY', bosscarn: 'BIG TOP BATTLE', bossjungle: 'TEMPLE GUARDIAN', bossdesert: 'DUNE DUEL', bossfinal: 'STATIC EMPEROR', jungle: 'VINE TEMPLE', desert: 'DUNE DRIFT', static: 'STATIC DIMENSION', carnival: 'CARNIVAL ISLE' });

function drawSquid(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const R = (X, Y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + X), Math.round(y + Y), w, h); };
  for (let k = 0; k < 6; k++) { const ph = t * 0.12 + k; for (let s = 0; s < 8; s++) R(4 + k * 5 + Math.sin(ph + s * 0.6) * 3, 30 + s * 3, 4, 4, s % 2 ? '#a050c0' : '#c070e0'); }
  R(0, -2, 36, 34, '#1a1020'); R(1, -1, 34, 32, '#b060d0'); R(4, -1, 28, 6, '#d090f0'); R(8, 2, 6, 3, '#e0b0ff');
  R(6, 14, 9, 9, '#ffffff'); R(21, 14, 9, 9, '#ffffff'); R(9, 17, 4, 4, '#1a1020'); R(24, 17, 4, 4, '#1a1020');
  R(10, 26, 16, 3, '#802090');
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { if (id === 'squid') { ctx.save(); ctx.translate(x, y); ctx.scale(0.5, 0.5); drawSquid(-18, -22, null, t); ctx.restore(); return; } return _sa(id, x, y, t); }; // eslint-disable-line no-func-assign
}

// ---------------- power-ups: Drill Helmet, Balloon Pack, Giga Wally, Ghost Cloak ----------------
const POWER_BLOCKS = { F: 'drill', '+': 'balloon', '}': 'giga', '?': 'cloak' };
const POWER_NAMES = { drill: 'DRILL HELMET! DOWN TO DIG', balloon: 'BALLOON PACK!', giga: 'GIGA WALLY!', cloak: 'GHOST CLOAK!' };
function drawPowerItem(type, x, y) {
  const R = (X, Y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + X, y + Y, w, h); };
  if (type === 'drill') { R(1, 4, 12, 7, '#1a1020'); R(2, 5, 10, 5, '#ffd040'); R(3, 5, 3, 2, '#fff0a0'); for (let k = 0; k < 4; k++) R(5 + k, 11 + k, 5 - k * 2 + 2, 1, '#a0a8c0'); R(6, 1, 2, 3, '#ff4040'); }
  else if (type === 'balloon') { R(3, 0, 8, 9, '#1a1020'); R(4, 1, 6, 7, '#ff5080'); R(5, 2, 2, 2, '#ffc0d0'); R(6, 9, 2, 1, '#c03060'); R(7, 10, 1, 4, '#e0e0e0'); }
  else if (type === 'giga') { R(1, 2, 12, 10, '#1a1020'); R(2, 3, 10, 8, '#ff7020'); R(4, 5, 2, 2, '#ffffff'); R(8, 5, 2, 2, '#ffffff'); R(5, 0, 4, 3, '#ffd040'); R(4, 12, 6, 2, '#a04010'); }
  else if (type === 'cloak') { ctx.save(); ctx.globalAlpha = 0.6 + 0.3 * Math.sin(frame * 0.2); R(2, 1, 10, 12, '#1a1020'); R(3, 2, 8, 10, '#d0e0ff'); R(5, 5, 1, 2, '#1a1020'); R(8, 5, 1, 2, '#1a1020'); R(3, 12, 2, 2, '#d0e0ff'); R(7, 12, 2, 2, '#d0e0ff'); ctx.restore(); }
  else if (type === 'chest') { R(0, 3, 14, 11, '#1a1020'); R(1, 4, 12, 9, '#a06a2a'); R(1, 4, 12, 3, '#c08a40'); R(6, 7, 2, 3, '#ffd040'); }
  else if (type === 'kitty') { R(2, 4, 10, 8, '#1a1020'); R(3, 5, 8, 6, '#f0a040'); R(3, 2, 2, 3, '#f0a040'); R(9, 2, 2, 3, '#f0a040'); R(5, 7, 1, 1, '#1a1020'); R(8, 7, 1, 1, '#1a1020'); R(12, 8, 2, 1, '#f0a040'); }
}
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initG) {
      this._initG = true;
      const g = this.lv.grid, W = this.lv.w, normal = !this.def.custom && !this.ta && !this.rush && isRealLi(this.li) && !this.def.tower && !this.def.shmup && !this.def.sub;
      if (normal) { // turn a few ? blocks into the new power-ups and bury some treasure
        const ws = []; for (let y = 1; y < 13; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'W') ws.push([x, y]);
        ws.sort((a, b) => a[0] - b[0]); const kinds = Object.keys(POWER_BLOCKS);
        [0.3, 0.65].forEach((f, i) => { const w = ws[Math.floor(ws.length * f)]; if (w && ws.length >= 2) g[w[1]][w[0]] = kinds[(this.li + i * 2) % 4]; });
        let n = 0; for (let x = Math.floor(W * 0.2) + (this.li % 7); x < W - 20 && n < 2; x += 37) if (g[12][x] === '#' && g[11][x] === '.' && g[13][x] === '#') { g[12][x] = '`'; n++; }
      }
      if (this.def.mines) for (const [mx, my] of this.def.mines) this.ents.push({ type: 'mine', alive: true, t: mx, x: mx * TS + 2, y: my * TS + 2, oy: my * TS + 2, w: 12, h: 12, hazard: true });
      if (this.li === 1 && game.quests && game.quests.kitty && game.quests.kitty.state === 'active') { for (let x = 150; x < 190; x++) if (g[12][x] === '#' && g[11][x] === '.') { this.ents.push({ type: 'kitty', item: true, alive: true, t: 0, x: x * TS + 1, y: 11 * TS + 2, w: 14, h: 14, rise: 0 }); break; } }
      this.trickScore = 0; this.comboN = 0; this.comboT = 0;
    }
    _upd.call(this);
    if (this.paused || this.talk || this.photo) return;
    if (this.comboT > 0 && --this.comboT === 0) { if (this.comboN >= 3) this.parts.push({ k: 'text', s: `COMBO x${this.comboN}!`, x: this.p.x - 24, y: this.p.y - 24, vy: -0.4, life: 60 }); this.comboN = 0; }
    // torpedoes damage the squid
    for (const g of this.pings) if (g.torpedo) for (const e of this.ents) if (e.boss && e.alive && !e.dying && overlap(g, e)) { g.life = 0; this.damageBoss(e); this.parts.push({ k: 'blast', x: g.x, y: g.y, life: 14 }); break; }
  };
  const _hb = Play.prototype.hitBlock;
  Play.prototype.hitBlock = function (tx, ty) {
    const c = this.tile(tx, ty), type = POWER_BLOCKS[c];
    if (!type) return _hb.call(this, tx, ty);
    this.setTile(tx, ty, 'U'); this.bumps.push({ tx, ty, t: 0 }); Audio8.sfx('sprout');
    this.ents.push({ type, item: true, power: true, alive: true, x: tx * TS + 1, y: ty * TS, w: 14, h: 14, vx: 0, vy: 0, rise: 16, t: 0 });
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.power || e.type === 'chest' || e.type === 'kitty') {
      if (e.rise > 0) { e.y -= 0.5; e.rise -= 0.5; return; }
      if (e.type === 'chest') { e.vy = Math.min(4, (e.vy || 0) + 0.3); this.move(e, true); }
      if (this.state !== 'play' || !overlap(p, e)) return;
      e.alive = false;
      if (e.type === 'chest') { for (let k = 0; k < 10; k++) this.addCoin(); if (Math.random() < 0.35) { game.lives++; this.parts.push({ k: 'text', s: '1UP!', x: e.x, y: e.y - 20, vy: -0.4, life: 60 }); } Audio8.sfx('oneup'); Ach.unlock('treasure'); this.parts.push({ k: 'text', s: 'TREASURE! +10 COINS', x: e.x - 40, y: e.y - 8, vy: -0.4, life: 70 }); return; }
      if (e.type === 'kitty') { game.quests.kitty.state = 'done'; Save.persist(); Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: 'FOUND THE KITTY! MEOW!', x: e.x - 40, y: e.y - 10, vy: -0.4, life: 80 }); return; }
      const q = p; Audio8.sfx('power'); this.parts.push({ k: 'text', s: POWER_NAMES[e.type], x: e.x - 30, y: e.y - 10, vy: -0.4, life: 70 });
      if (e.type === 'drill') q.drill = 1200;
      if (e.type === 'balloon') { q.balloon = 330; q.vy = Math.min(q.vy, -2); }
      if (e.type === 'giga') { q.giga = 600; q.charge = Math.max(q.charge || 0, 600); Audio8.play('charge'); }
      if (e.type === 'cloak') q.cloak = 300;
      return;
    }
    if (e.type === 'mine') { e.t++; e.y = e.oy + Math.sin(e.t * 0.05) * 3; if (this.state === 'play' && overlap(p, e)) { e.alive = false; Audio8.sfx('boom'); this.parts.push({ k: 'blast', x: e.x + 6, y: e.y + 6, life: 20 }); this.hurt(); } for (const g of this.pings) if (overlap(g, e)) { g.life = 0; e.alive = false; Audio8.sfx('boom'); this.parts.push({ k: 'blast', x: e.x + 6, y: e.y + 6, life: 20 }); } return; }
    if (e.type === 'squid') return this.updateSquid(e);
    if (e.type === 'ink') { e.x += e.vx; e.y += clamp(p.y + 8 - e.y, -0.4, 0.4); if (++e.t > 200) e.alive = false; return _ue.call(this, e); }
    return _ue.call(this, e);
  };
  Play.prototype.updateSquid = function (e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    if (!this.bossLock || e.dying || this._p2ctx) return;
    e.t++; e.act--; const rage = e.maxHp - e.hp;
    e.y += (60 + Math.sin(e.t * 0.04) * 50 - e.y) * 0.03; e.x = this.camMin + VW - 56 + Math.sin(e.t * 0.02) * 10;
    if (e.state === 'idle' && e.act <= 0) { e.state = (e.t >> 5) % 2 ? 'ink' : 'swipe'; e.act = e.state === 'ink' ? 60 : 90; if (e.state === 'swipe') e.sy = clamp(p.y + 6, 30, 190); Audio8.sfx('lasercharge'); }
    if (e.state === 'ink' && e.act % 15 === 0 && e.act > 0) { this.ents.push({ type: 'ink', alive: true, t: 0, x: e.x, y: e.y + 16, w: 10, h: 10, vx: -1.6 - rage * 0.15, hazard: true }); Audio8.sfx('swim'); }
    if (e.state === 'swipe') { e.swipeX = e.act < 60 ? Math.max(this.camMin, e.x - (60 - e.act) * 6) : null; if (e.swipeX !== null && this.state === 'play' && p.x + p.w > e.swipeX && p.x < e.x && Math.abs(p.y + p.h / 2 - e.sy) < 12) this.hurt(); }
    if (e.state !== 'idle' && e.act <= 0) { e.state = 'idle'; e.act = 80 - rage * 6; e.swipeX = null; }
    if (this.state === 'play' && overlap(p, e)) this.hurt();
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.power || e.type === 'chest' || e.type === 'kitty') { drawPowerItem(e.type, x, y + (e.rise > 0 ? 0 : Math.round(Math.sin(frame * 0.1)))); return; }
    if (e.type === 'mine') { ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y, 12, 12); ctx.fillStyle = '#4a4a5a'; ctx.fillRect(x + 1, y + 1, 10, 10); ctx.fillStyle = '#1a1020'; for (const [a, b] of [[5, -3], [5, 12], [-3, 5], [12, 5]]) ctx.fillRect(x + a, y + b, 2, 3); ctx.fillStyle = (frame >> 3) & 1 ? '#ff3040' : '#601020'; ctx.fillRect(x + 5, y + 5, 2, 2); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 5, y + 12, 1, VH - y); return; }
    if (e.type === 'squid') { if (e.dying) { ctx.save(); ctx.translate(x + 18, y + 20); ctx.scale(1, -1); drawSquid(-18, -20, e, frame); ctx.restore(); return; } drawSquid(x, y, e, frame); if (e.swipeX !== null && e.swipeX !== undefined) { const sx = Math.round(e.swipeX - cx); ctx.fillStyle = '#1a1020'; ctx.fillRect(sx, e.sy - 4, x - sx, 9); ctx.fillStyle = '#c070e0'; ctx.fillRect(sx, e.sy - 3, x - sx, 7); for (let k = sx; k < x; k += 6) { ctx.fillStyle = '#ffe0ff'; ctx.fillRect(k, e.sy - 1, 2, 2); } } else if (e.state === 'swipe' && (frame >> 2) & 1) { ctx.fillStyle = 'rgba(255,80,200,0.5)'; ctx.fillRect(0, e.sy - 1, x, 2); } return; }
    if (e.type === 'ink') { ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y, 10, 10); ctx.fillStyle = '#3a1050'; ctx.fillRect(x + 1, y + 1, 8, 8); ctx.fillStyle = '#7a40a0'; ctx.fillRect(x + 2, y + 2, 3, 2); return; }
    return _de.call(this, e, cx);
  };
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    if (sp.t === '*' && this.def.bossType === 'squid') { const hp = (this.def.bossHp || 8) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0); this.ents.push({ type: 'squid', boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS - 20, y: 60, w: 36, h: 32, hp, maxHp: hp, inv: 0, state: 'idle', act: 90, vx: 0, vy: 0 }); return; }
    return _sp.call(this, sp);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) { const a = e.alive; _db.call(this, e); if (a && !e.alive && e.type === 'squid') { Sticker.add('squid'); Ach.unlock('squid'); this.ents.forEach((k) => { if (k.type === 'ink') k.alive = false; }); } };
}

// ---------------- the player: power-ups, snowboard, submarine, train ducking ----------------
{
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    const p = this.p, D = Input.down, Pr = Input.pressed;
    if (this.def.sub && this.state === 'play') return this.updateSub();
    // snowboard: always heading downhill
    const board = this.def.board && this.state === 'play';
    if (board) { Input.down = (k) => (k === 'right' || k === 'run' ? true : k === 'left' ? false : D(k)); Input.pressed = (k) => (k === 'run' ? false : Pr(k)); }
    const ox = p.x, oy = p.y;
    try { _up.call(this); } finally { Input.down = D; Input.pressed = Pr; }
    if (this.state !== 'play') return;
    // Drill Helmet: press Down on the ground to dig straight down
    if (p.drill > 0) {
      p.drill--;
      if (p.onGround && Pr('down') && !p.riding) {
        const tx = Math.floor((p.x + p.w / 2) / TS), ty = Math.floor((p.y + p.h + 2) / TS), c = this.tile(tx, ty);
        if (ty <= 12 && '#B`'.includes(c)) {
          this.setTile(tx, ty, '.'); Audio8.sfx('dig'); this.shake = 4;
          for (let k = 0; k < 6; k++) this.parts.push({ k: 'frag', x: tx * TS + 8, y: ty * TS + 4, vx: (k - 3) * 0.5, vy: -2 - (k % 3), g: 0.3, life: 30 });
          if (c === '`') this.ents.push({ type: 'chest', alive: true, t: 0, x: tx * TS + 1, y: ty * TS, w: 14, h: 14, vx: 0, vy: -3, rise: 0 });
          else if (Math.random() < 0.25) { this.addCoin(); this.parts.push({ k: 'coinpop', x: tx * TS + 4, y: ty * TS - 8, vy: -3, life: 20 }); }
        } else Audio8.sfx('bump');
      }
    }
    // Balloon Pack: float upward and steer
    if (p.balloon > 0) { p.balloon--; p.vy = Math.max(p.vy - 0.75, -1.4); if (p.balloon === 0) { Audio8.sfx('stomp'); this.parts.push({ k: 'text', s: 'POP!', x: p.x - 4, y: p.y - 20, vy: -0.4, life: 30 }); } }
    // Giga Wally: smash blocks you touch
    if (p.giga > 0) {
      p.giga--; if (p.onGround && Math.abs(p.vx) > 0.5 && frame % 12 === 0) this.shake = Math.max(this.shake, 4);
      const x0 = Math.floor((p.x - 10) / TS), x1 = Math.floor((p.x + p.w + 10) / TS), y0 = Math.floor((p.y - 26) / TS), y1 = Math.floor((p.y + p.h - 2) / TS);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const c = this.tile(tx, ty); if (c === 'B' || c === 'X' || c === 'R') { this.setTile(tx, ty, '.'); Audio8.sfx('brick'); this.addScore(50); for (const [dx, dy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: tx * TS + dx, y: ty * TS + dy, vx, vy, g: 0.3, life: 60 }); } else if (POWER_BLOCKS[c] || 'WPSOAVQDNTEH'.includes(c) && c !== '.') { if (ty < y0 + 1) this.hitBlock(tx, ty); } }
      if (p.giga === 0) p.charge = 0;
    }
    // Ghost Cloak: drift through walls
    if (p.cloak > 0) {
      p.cloak--;
      if (p.hitWall) { p.x = ox + (D('right') ? 1.6 : D('left') ? -1.6 : 0); }
      if (this.solidOverlap(p)) { p.vy = Math.min(p.vy, 0); p.y = Math.min(p.y, oy); if (D('up')) p.y -= 1.5; }
      if (p.cloak === 0) { let n = 0; while (this.solidOverlap(p) && n++ < 40) p.y -= 4; }
    }
    // snowboard tricks and grinds
    if (board) {
      if (p.onGround) p.vx = Math.max(p.vx, Math.min(3.6, Math.abs(p.vx) + 0.04));
      const tx = Math.floor((p.x + p.w / 2) / TS), ty = Math.floor((p.y + p.h / 2) / TS);
      if (p.onGround && (this.tile(tx, ty) === '/' || this.tile(tx + 1, ty) === '/')) { p.vy = -7.2; p.onGround = false; Audio8.sfx('spring'); this.parts.push({ k: 'text', s: 'AIR!', x: p.x, y: p.y - 12, vy: -0.4, life: 30 }); }
      if (!p.onGround && Pr('run') && !p.spinT) { p.spinT = 16; Audio8.sfx('swoop'); }
      if (p.spinT > 0) { p.spinT--; if (p.spinT === 0) { p.tricks = (p.tricks || 0) + 1; } }
      if (p.onGround && !p.wasGround) { if (p.spinT > 0) { p.vx = 0.6; p.spinT = 0; p.tricks = 0; Audio8.sfx('hurt'); this.parts.push({ k: 'text', s: 'WIPEOUT!', x: p.x - 16, y: p.y - 14, vy: -0.4, life: 50 }); } else if (p.tricks) { const pts = 250 * p.tricks * p.tricks; this.trickScore += pts; game.score += pts; this.parts.push({ k: 'text', s: `TRICK x${p.tricks}! +${pts}`, x: p.x - 30, y: p.y - 16, vy: -0.4, life: 60 }); Audio8.sfx('coin'); p.tricks = 0; } }
      if (p.onGround && p.groundTile === '=') { if (frame % 3 === 0) { this.trickScore += 15; game.score += 15; this.parts.push({ k: 'spark', x: p.x + p.w / 2, y: p.y + p.h, life: 8 }); } if (!p.grinding) this.parts.push({ k: 'text', s: 'GRIND!', x: p.x - 10, y: p.y - 14, vy: -0.4, life: 30 }); p.grinding = true; } else p.grinding = false;
      if (this.trickScore >= 2000) Ach.unlock('shredder');
      p.wasGround = p.onGround;
    }
    // haunted train: duck under low tunnels
    if (this.def.train && !p.riding) {
      if (D('down') && p.onGround && !p.duck) { const b = p.y + p.h; p.duck = true; p.h = 12; p.y = b - 12; }
      else if (!D('down') && p.duck) { const b = p.y + p.h; p.y = b - 22; p.h = 22; if (this.solidOverlap(p)) { p.h = 12; p.y = b - 12; } else p.duck = false; }
    }
  };
  Play.prototype.updateSub = function () {
    const p = this.p, D = Input.down;
    if (p.inv > 0) p.inv--; if (p.hurtT > 0) p.hurtT--;
    const ax = (D('right') ? 1 : 0) - (D('left') ? 1 : 0), ay = (D('down') ? 1 : 0) - (D('up') ? 1 : 0);
    p.vx += (ax * 1.7 - p.vx) * 0.1; p.vy += (ay * 1.5 - p.vy) * 0.1 + 0.01;
    p.prevBottom = p.y + p.h; p.vx += this.def.autoscroll ? 0 : 0;
    const w = p.w; p.w = 24; this.move(p, false); p.w = w; p.x += this.bossLock ? 0 : 0;
    p.x = clamp(p.x, this.cam.x + 2, this.cam.x + VW - 30); p.y = clamp(p.y, 18, VH - 34); p.face = 1; p.onGround = false;
    if (p.torCool > 0) p.torCool--;
    if (Input.pressed('run') && !p.torCool) { p.torCool = 16; this.pings.push({ x: p.x + 26, y: p.y + 10, w: 10, h: 4, vx: 3.4, life: 80, torpedo: true }); Audio8.sfx('swim'); }
    if (Input.pressed('special') && p.special > 0 && !p.spCool) { p.special--; p.spCool = 30; const h = heroOf(); if (h === 'goth') this.batSwarm(); else if (h === 'doug' || h === 'frost') this.pauseFreeze(); else this.shockwave(); }
    if (p.spCool > 0) p.spCool--;
    for (let ty = Math.floor(p.y / TS); ty <= Math.floor((p.y + p.h) / TS); ty++) for (let tx = Math.floor(p.x / TS); tx <= Math.floor((p.x + 24) / TS); tx++) if (this.tile(tx, ty) === 'o') { this.setTile(tx, ty, '.'); this.addCoin(); }
    if (frame % 10 === 0) this.parts.push({ k: 'bubble', x: p.x - 2, y: p.y + 10, vy: -0.5, life: 50 });
  };
  const _pp = Play.prototype.playerPose;
  Play.prototype.playerPose = function () { if (this.def.board && this.p.onGround) return 'crouch'; if (this.def.sub) return 'ride'; return _pp.call(this); };
  const _dp = Play.prototype.drawPlayer;
  Play.prototype.drawPlayer = function (cx) {
    const p = this.p;
    if (this.def.sub && this.state !== 'dying') {
      if (p.inv > 0 && (frame >> 2) & 1) return;
      const x = Math.round(p.x - cx) - 4, y = Math.round(p.y) + 4;
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y + 2, 34, 16); ctx.fillRect(x + 12, y - 4, 10, 7); ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 1, y + 3, 32, 14); ctx.fillStyle = '#e0a020'; ctx.fillRect(x + 1, y + 13, 32, 4); ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 13, y - 3, 8, 6);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(x + 20, y + 6, 8, 6); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 16, y - 9, 2, 6); ctx.fillRect(x + 16, y - 9, 5, 2);
      ctx.drawImage(Wally.frame('idle0', 0, false, 1, 'n', Wally.current, Wally.hero), 0, 2, 24, 12, x + 18, y + 4, 12, 6);
      ctx.fillStyle = (frame >> 1) & 1 ? '#c0c8d8' : '#808898'; ctx.fillRect(x - 3, y + 6, 3, 8);
      return;
    }
    const spin = this.def.board && p.spinT > 0;
    if (spin) { ctx.save(); const cxp = p.x + p.w / 2 - cx, cyp = p.y + p.h / 2; ctx.translate(cxp, cyp); ctx.rotate(((16 - p.spinT) / 16) * Math.PI * 2); ctx.translate(-cxp, -cyp); }
    const big = p.giga > 0, ghost = p.cloak > 0;
    if (big || ghost) { ctx.save(); if (ghost) ctx.globalAlpha = 0.45 + 0.15 * Math.sin(frame * 0.3); if (big) { const fx = p.x + p.w / 2 - cx, fy = p.y + p.h; ctx.translate(fx, fy); ctx.scale(2, 2); ctx.translate(-fx, -fy); } }
    _dp.call(this, cx);
    if (big || ghost) ctx.restore();
    if (this.def.board && !p.riding) { const x = Math.round(p.x + p.w / 2 - cx), y = Math.round(p.y + p.h); ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 11, y - 2, 22, 4); ctx.fillStyle = '#40a0ff'; ctx.fillRect(x - 10, y - 1, 20, 2); ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 3, y - 1, 6, 1); }
    if (spin) ctx.restore();
    if (p.balloon > 0) { const x = Math.round(p.x + p.w / 2 - cx), y = Math.round(p.y) - 22; ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x, y + 12, 1, 12); ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 6, y - 1, 13, 14); ctx.fillStyle = p.balloon < 60 && (frame >> 2) & 1 ? '#ffb0c0' : '#ff5080'; ctx.fillRect(x - 5, y, 11, 12); ctx.fillStyle = '#ffd0e0'; ctx.fillRect(x - 3, y + 2, 3, 3); }
    if (p.drill > 0 && !big) { const x = Math.round(p.x + p.w / 2 - cx), y = Math.round(p.y) - 6; ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 5, y, 10, 4); ctx.fillStyle = '#a0a8c0'; ctx.fillRect(x - 1, y - 3, 2, 3); }
  };
  const _hurt = Play.prototype.hurt;
  Play.prototype.hurt = function (spike) { const p = this.p; if (p.cloak > 0 || p.giga > 0) return; const h = p.hearts; _hurt.call(this, spike); if (p.hearts < h) { p.balloon = 0; p.drill = 0; } };
  const _dw = Play.prototype.drawWeather;
  Play.prototype.drawWeather = function (cx) {
    _dw.call(this, cx);
    if (this.def.train) { ctx.fillStyle = 'rgba(200,210,255,0.35)'; for (let i = 0; i < 24; i++) { const x = VW - ((i * 53 + frame * (6 + (i % 3) * 2)) % (VW + 40)), y = 30 + (i * 37) % 170; ctx.fillRect(x, y, 14 + (i % 4) * 6, 1); } ctx.fillStyle = '#3a3040'; for (let x = -((frame * 8) % 24); x < VW; x += 24) ctx.fillRect(x, 206, 12, 2); }
    if (this.comboN >= 2 && this.comboT > 0) { const x = 128, y = 30; txt(`COMBO x${this.comboN}`, x, y, this.comboN >= 8 ? '#ff60ff' : this.comboN >= 5 ? '#ffe040' : '#fff', { align: 'center', outline: '#101848', scale: this.comboN >= 5 ? 2 : 1 }); ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 21, y + (this.comboN >= 5 ? 16 : 9), 42, 3); ctx.fillStyle = '#5ff0ff'; ctx.fillRect(x - 20, y + (this.comboN >= 5 ? 17 : 10), Math.round((this.comboT / 75) * 40), 1); }
    { const t0 = Math.floor(cx / TS); for (let tx = t0; tx <= t0 + 16; tx++) if (this.tile(tx, 12) === '`' && (frame + tx * 7) % 50 < 6) { ctx.fillStyle = '#fff8c0'; ctx.fillRect(tx * TS - cx + 7, 193, 2, 2); } }
    if (this.def.board && this.trickScore) txt('TRICKS ' + this.trickScore, 128, 214, '#5ff0ff', { align: 'center', outline: '#101848' });
  };
}

// ---------------- combo meter ----------------
{
  const bump = function (e) {
    if (this.state !== 'play' || !e || e.boss) return;
    this.comboN = this.comboT > 0 ? this.comboN + 1 : 1; this.comboT = 75;
    if (this.comboN >= 2) { const bonus = 100 * (this.comboN - 1); game.score += bonus; this.parts.push({ k: 'text', s: `x${this.comboN} COMBO! +${bonus}`, x: e.x - 24, y: e.y - 24, vy: -0.5, life: 50 }); }
    if (this.comboN === 8) { game.lives++; Audio8.sfx('oneup'); Ach.unlock('combo'); this.parts.push({ k: 'text', s: 'COMBO 1UP!', x: e.x - 20, y: e.y - 36, vy: -0.5, life: 70 }); }
    if (game.quests && game.quests.bugs && game.quests.bugs.state === 'active' && e.type === 'grumble' && ++game.quests.bugs.n >= 25) game.quests.bugs.state = 'done';
  };
  const _ck = Play.prototype.countKill;
  Play.prototype.countKill = function (e) { _ck.call(this, e); bump.call(this, e); };
}

// ---------------- Wally Town: NPCs, quests, rides and home decorating ----------------
const QUESTS = [
  { id: 'kitty', npc: 'MRS MITTENS', hero: 'goth', costume: 'gold', title: 'LOST KITTY', ask: 'MY KITTY WANDERED INTO CAVERN COMMUTE! COULD YOU FIND HER?', reward: 40, life: 0 },
  { id: 'nohit', npc: 'COACH', hero: 'doug', costume: 'fire', title: 'NOT A SCRATCH', ask: 'SHOW ME YOUR SKILLS: BEAT SUNNY SHORELINE WITHOUT GETTING HIT!', reward: 50, life: 0 },
  { id: 'coins', npc: 'OLD SALT', hero: 'wally', costume: 'ice', title: 'TREASURE HUNTER', ask: 'ARR! COLLECT 150 COINS IN THE LEVELS AND I WILL SHARE MY BOOTY.', reward: 20, life: 1 },
  { id: 'tricks', npc: 'BOARD BRO', hero: 'robo', costume: 'classic', title: 'SICK TRICKS', ask: 'DUDE! SCORE 2000 TRICK POINTS ON POWDER PEAK. TOTALLY RADICAL!', reward: 60, life: 0 },
  { id: 'bugs', npc: 'GARDENER', hero: 'wally', costume: 'dino', title: 'BUG HUNT', ask: 'GRUMBLES ARE EATING MY VEGGIES! STOMP 25 OF THEM FOR ME.', reward: 60, life: 0 },
];
function questProgress(q) {
  const s = (game.quests || {})[q.id]; if (!s) return '';
  if (q.id === 'coins') return `${Math.min(150, ((game.stats && game.stats.coins) || 0) - s.base)}/150`;
  if (q.id === 'bugs') return `${Math.min(25, s.n || 0)}/25`;
  return '';
}
function questCheck() {
  const Q = game.quests || {};
  if (Q.coins && Q.coins.state === 'active' && ((game.stats && game.stats.coins) || 0) - Q.coins.base >= 150) Q.coins.state = 'done';
}
{
  const _cl = Play.prototype.clear;
  Play.prototype.clear = function (s) {
    const was = this.state; _cl.call(this, s);
    if (was !== 'play' || !game.quests) return;
    if (this.li === 4 && !this.tookHit && game.quests.nohit && game.quests.nohit.state === 'active') game.quests.nohit.state = 'done';
    if (this.li === LEVELS.findIndex((d) => d.board) && this.trickScore >= 2000 && game.quests.tricks && game.quests.tricks.state === 'active') game.quests.tricks.state = 'done';
    questCheck();
  };
}
const RIDES = [33, 34, 35, 36, 37];
const HOME_SLOTS = [{ name: 'WALL LEFT', kind: 'wall', x: 40, y: 50 }, { name: 'WALL RIGHT', kind: 'wall', x: 180, y: 50 }, { name: 'FLOOR LEFT', kind: 'floor', x: 30, y: 150 }, { name: 'FLOOR MIDDLE', kind: 'floor', x: 110, y: 150 }, { name: 'FLOOR RIGHT', kind: 'floor', x: 190, y: 150 }, { name: 'RUG', kind: 'rug', x: 128, y: 172 }];
const FURNITURE = {
  painting: { name: 'PAINTING', kind: 'wall', price: 20, draw: (x, y) => { ctx.fillStyle = '#6a3a1a'; ctx.fillRect(x, y, 36, 26); ctx.fillStyle = '#5cb0f8'; ctx.fillRect(x + 3, y + 3, 30, 20); ctx.fillStyle = '#5ad84a'; ctx.fillRect(x + 3, y + 15, 30, 8); ctx.fillStyle = '#fff4c0'; ctx.fillRect(x + 24, y + 6, 5, 5); } },
  clock: { name: 'CLOCK', kind: 'wall', price: 15, draw: (x, y) => { ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x + 14, y + 12, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(x + 14, y + 12, 10, 0, Math.PI * 2); ctx.fill(); const a = frame * 0.02; ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 13, y + 5, 2, 7); ctx.fillRect(Math.round(x + 14 + Math.cos(a) * 6), Math.round(y + 12 + Math.sin(a) * 6), 2, 2); } },
  shelf: { name: 'TROPHY SHELF', kind: 'wall', price: 40, draw: (x, y) => { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x, y + 20, 40, 4); const n = Math.min(6, Math.ceil(Ach.count() / 6)); for (let k = 0; k < n; k++) { ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 3 + k * 6, y + 10, 4, 6); ctx.fillRect(x + 4 + k * 6, y + 16, 2, 4); } } },
  poster: { name: 'HERO POSTER', kind: 'wall', price: 25, draw: (x, y) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 28, 36); ctx.fillStyle = '#ffd0a0'; ctx.fillRect(x + 2, y + 2, 24, 32); Wally.draw(ctx, x + 14, y + 33, 'win0', 1, { t: frame }); } },
  sofa: { name: 'COMFY SOFA', kind: 'floor', price: 50, draw: (x, y) => { ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y, 44, 22); ctx.fillStyle = '#c03050'; ctx.fillRect(x + 1, y + 1, 42, 20); ctx.fillStyle = '#e05070'; ctx.fillRect(x + 4, y + 4, 16, 8); ctx.fillRect(x + 24, y + 4, 16, 8); } },
  lamp: { name: 'LAVA LAMP', kind: 'floor', price: 20, draw: (x, y) => { ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x + 6, y + 14, 10, 8); ctx.fillStyle = '#ff60a0'; ctx.fillRect(x + 7, y - 4, 8, 18); ctx.fillStyle = '#ffe040'; ctx.fillRect(x + 9, y + Math.round(4 + Math.sin(frame * 0.05) * 6), 4, 4); } },
  plant: { name: 'BIG PLANT', kind: 'floor', price: 15, draw: (x, y) => { ctx.fillStyle = '#a06a3a'; ctx.fillRect(x + 6, y + 10, 14, 12); ctx.fillStyle = '#30a040'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 2 + k * 4, y - 4 + (k % 2) * 4, 5, 14); } },
  arcade: { name: 'ARCADE MACHINE', kind: 'floor', price: 80, draw: (x, y) => { ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y - 18, 24, 40); ctx.fillStyle = '#3060c0'; ctx.fillRect(x + 1, y - 17, 22, 38); ctx.fillStyle = '#101820'; ctx.fillRect(x + 4, y - 13, 16, 12); ctx.fillStyle = (frame >> 4) & 1 ? '#5ff0ff' : '#ff60c0'; ctx.fillRect(x + 6, y - 11, 4, 4); ctx.fillStyle = '#ff3040'; ctx.fillRect(x + 6, y + 3, 3, 3); } },
  aquarium: { name: 'AQUARIUM', kind: 'floor', price: 60, draw: (x, y) => { ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y - 4, 40, 26); ctx.fillStyle = '#4a9ae0'; ctx.fillRect(x + 1, y - 3, 38, 24); ctx.fillStyle = '#ff9020'; const fx = x + 4 + ((frame >> 1) % 28); ctx.fillRect(fx, y + 6, 6, 3); ctx.fillStyle = '#30a040'; ctx.fillRect(x + 4, y + 12, 2, 9); ctx.fillRect(x + 32, y + 10, 2, 11); } },
  rugred: { name: 'RED RUG', kind: 'rug', price: 15, draw: (x, y) => { ctx.fillStyle = '#c03040'; ctx.fillRect(x - 40, y, 80, 10); ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 36, y + 4, 72, 2); } },
  rugstar: { name: 'STAR RUG', kind: 'rug', price: 30, draw: (x, y) => { ctx.fillStyle = '#3050c0'; ctx.fillRect(x - 40, y, 80, 10); for (let k = 0; k < 5; k++) txt('#', x - 34 + k * 15, y + 2, '#ffe040', { shadow: null }); } },
};
function TownScene() {
  const buildings = [{ x: 40, name: "DINO'S HOUSE", go: () => HouseScene(), col: '#e0a040' }, { x: 160, name: 'QUEST BOARD', go: () => QuestBoardScene(), col: '#a06a2a', board: true }, { x: 300, name: 'RIDES', go: () => RidesScene(), col: '#d05050' }, { x: 430, name: 'MY HOME', go: () => HomeScene(), col: '#5080e0' }];
  const npcs = QUESTS.map((q, i) => ({ q, x: 100 + i * 82 }));
  let px = 60, face = 1, t = 0, talk = null;
  game.quests = game.quests || {}; questCheck();
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (talk) {
        if (Input.confirm() || Input.pressed('run')) {
          const q = talk.q, s = game.quests[q.id];
          if (talk.offer && Input.confirm()) { game.quests[q.id] = { state: 'active', base: (game.stats && game.stats.coins) || 0, n: 0 }; Save.persist(); Audio8.sfx('confirm'); }
          talk = null;
        }
        return;
      }
      const d = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0); if (d) { px = clamp(px + d * 1.6, 10, 500); face = d; }
      if (Input.pressed('back') || Input.pressed('start')) { go(() => MapScene()); return; }
      if (Input.pressed('up') || Input.pressed('jump')) {
        const b = buildings.find((k) => Math.abs(px - (k.x + 24)) < 22);
        const n = Input.pressed('jump') ? npcs.find((k) => Math.abs(px - k.x) < 14) : null;
        if (n) {
          const q = n.q, s = game.quests[q.id];
          if (!s) talk = { q, lines: wrapText(q.ask, 34).concat(['', 'A: ACCEPT   B: LATER']), offer: true };
          else if (s.state === 'done') { s.state = 'claimed'; game.coins += q.reward; game.lives += q.life; while (game.coins >= 100) { game.coins -= 100; game.lives++; } Save.persist(); Audio8.sfx('oneup'); talk = { q, lines: ['THANK YOU SO MUCH!', '', `REWARD: ${q.reward} COINS${q.life ? ' AND A 1-UP' : ''}!`] }; if (Object.values(game.quests).filter((k) => k.state === 'claimed').length >= 3) Ach.unlock('quests'); }
          else if (s.state === 'claimed') talk = { q, lines: ['THANKS AGAIN, HERO!', 'YOU ARE THE BEST NEIGHBOUR.'] };
          else talk = { q, lines: ['HOW IS IT GOING?', '', q.title + '  ' + questProgress(q)] };
          Audio8.sfx('select');
        } else if (b && Input.pressed('up')) { Audio8.sfx('confirm'); go(b.go); }
      }
    },
    draw() {
      const cam = clamp(px - 128, 0, 512 - VW);
      drawParallax('grass', cam * 0.5 + t * 0.1);
      ctx.fillStyle = '#c8a878'; ctx.fillRect(0, 186, VW, 38); ctx.fillStyle = '#b09060'; for (let x = -(cam % 16); x < VW; x += 16) ctx.fillRect(x, 186, 1, 38); ctx.fillStyle = '#7a5a3a'; ctx.fillRect(0, 186, VW, 2);
      for (const b of buildings) {
        const x = b.x - cam;
        if (b.board) { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 6, 150, 4, 36); ctx.fillRect(x + 38, 150, 4, 36); ctx.fillStyle = '#a06a2a'; ctx.fillRect(x, 120, 48, 34); ctx.fillStyle = '#fff8e0'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 4 + (k % 2) * 22, 124 + (k >> 1) * 14, 18, 11); }
        else { ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, 109, 50, 78); ctx.fillStyle = b.col; ctx.fillRect(x, 110, 48, 76); ctx.fillStyle = '#802020'; for (let k = 0; k < 10; k++) ctx.fillRect(x - 4 + k, 100 + 10 - k, 56 - k * 2, 1); ctx.fillStyle = '#5a3418'; ctx.fillRect(x + 18, 160, 12, 26); ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 6, 124, 10, 10); ctx.fillRect(x + 32, 124, 10, 10); }
        txt(b.name, x + 24, b.board ? 108 : 90, '#fff', { align: 'center', outline: '#101848' });
      }
      for (const n of npcs) { const x = n.x - cam, s = game.quests[n.q.id]; Wally.draw(ctx, x, 186, 'idle' + (((t >> 4) + n.x) % 4), px < n.x ? -1 : 1, { t, hero: n.q.hero, costume: n.q.costume, hat: 'none' }); if (!s || s.state === 'done') txt(s ? '!' : '?', x, 150 + ((t >> 3) & 1), s ? '#5ae060' : '#ffe040', { align: 'center', outline: '#101848', scale: 2 }); if (Math.abs(px - n.x) < 14) txt(n.q.npc, x, 194, '#ffe040', { align: 'center', outline: '#101848' }); }
      drawWally(px - cam, 186, Input.down('left') || Input.down('right') ? 'walk' + ((t >> 2) % 8) : 'idle' + ((t >> 4) % 4), face);
      drawWindow(4, 4, 248, 20); txt('WALLY TOWN', 10, 10, '#ffe040'); ctx.drawImage(Sprites.coinIcon, 150, 10); txt('*' + pad(game.coins, 2), 157, 10); ctx.drawImage(Sprites.heart, 200, 10); txt('*' + pad(game.lives, 2), 209, 10);
      txt('UP: ENTER   A: TALK   START: LEAVE', 128, 212, '#fff', { align: 'center', outline: '#101848' });
      if (talk) { drawWindow(16, 40, 224, 20 + talk.lines.length * 10); txt(talk.q.npc, 24, 46, '#ffe040'); talk.lines.forEach((l, i) => txt(l, 24, 58 + i * 10, '#fff')); }
    },
  };
}
function QuestBoardScene() {
  let t = 0; questCheck();
  return {
    enter() { Audio8.play('menu'); },
    update() { t++; if (t > 10 && (Input.confirm() || Input.pressed('back') || Input.pressed('run'))) go(() => TownScene()); },
    draw() {
      ctx.fillStyle = '#a06a2a'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#8a5a20'; for (let y = 0; y < VH; y += 14) ctx.fillRect(0, y, VW, 1);
      txt('QUEST BOARD', 128, 8, '#fff8e0', { align: 'center', outline: '#3a2010' });
      QUESTS.forEach((q, i) => {
        const s = (game.quests || {})[q.id], y = 24 + i * 38;
        ctx.fillStyle = '#fff8e0'; ctx.fillRect(14, y, 228, 32); ctx.fillStyle = '#e83040'; ctx.fillRect(126, y - 2, 4, 4);
        txt(q.title, 20, y + 4, '#3a2010', { shadow: null }); txt('FOR ' + q.npc, 236, y + 4, '#8a5a2a', { align: 'right', shadow: null });
        const st = !s ? 'TALK TO ' + q.npc + ' IN TOWN' : s.state === 'active' ? 'IN PROGRESS ' + questProgress(q) : s.state === 'done' ? 'DONE! CLAIM YOUR REWARD' : 'COMPLETE!';
        txt(st, 20, y + 18, s && s.state === 'claimed' ? '#2a8a3a' : s && s.state === 'done' ? '#c03040' : '#5a4030', { shadow: null });
      });
    },
  };
}
function RidesScene() {
  let sel = 0, t = 0;
  const open = (i) => i < 4 || !!game.cleared[RIDES[3]];
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % (RIDES.length + 1); Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + RIDES.length) % (RIDES.length + 1); Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === RIDES.length)) { go(() => TownScene()); return; }
      if (Input.confirm()) { if (!open(sel)) { Audio8.sfx('bump'); return; } Audio8.sfx('confirm'); const li = RIDES[sel]; go(() => IntroScene(li, false)); }
    },
    draw() {
      drawParallax('neon', t * 0.5); drawWindow(24, 30, 208, 150);
      txt('WALLY TOWN RIDES', 128, 38, '#ffe040', { align: 'center' });
      const tips = ['SNOWBOARD DOWNHILL: B FOR TRICKS', 'PILOT A SUB: B FIRES TORPEDOES', 'RIDE THE ROOF: DOWN TO DUCK', 'NEON CITY ROOFTOPS', 'NEON CITY: THE TOP FLOORS'];
      RIDES.forEach((li, i) => { const y = 58 + i * 18, on = i === sel; if (on) txt('>', 36 + ((t >> 3) & 1), y, '#ffe040'); txt(open(i) ? LEVELS[li].name : '???', 46, y, on ? '#ffe040' : '#fff'); if (game.cleared[li]) txt('#', 220, y, '#ffe040'); if (on) txt(open(i) ? tips[i] : 'CLEAR ROOFTOP RUN FIRST', 46, y + 8, '#a8b0d8'); });
      const y = 58 + RIDES.length * 18; txt('BACK', 46, y, sel === RIDES.length ? '#ffe040' : '#fff'); if (sel === RIDES.length) txt('>', 36 + ((t >> 3) & 1), y, '#ffe040');
    },
  };
}
function HomeScene() {
  let slot = 0, cat = null, ci = 0, t = 0, msg = '', msgT = 0;
  game.home = game.home || []; game.homeItems = game.homeItems || [];
  const list = () => Object.keys(FURNITURE).filter((k) => FURNITURE[k].kind === HOME_SLOTS[slot].kind).concat(['none']);
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (msgT > 0) msgT--;
      if (cat) {
        const L = list();
        if (Input.pressed('down')) { ci = (ci + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('up')) { ci = (ci + L.length - 1) % L.length; Audio8.sfx('select'); }
        if (Input.pressed('run') || Input.pressed('back')) { cat = null; return; }
        if (Input.pressed('jump')) {
          const id = L[ci];
          if (id === 'none') { game.home[slot] = null; cat = null; Audio8.sfx('stomp'); }
          else if (game.homeItems.includes(id)) { game.home[slot] = id; cat = null; Audio8.sfx('power'); }
          else if (game.coins >= FURNITURE[id].price) { game.coins -= FURNITURE[id].price; game.homeItems.push(id); game.home[slot] = id; cat = null; Audio8.sfx('oneup'); msg = 'BOUGHT ' + FURNITURE[id].name + '!'; msgT = 90; }
          else { msg = 'NOT ENOUGH COINS!'; msgT = 90; Audio8.sfx('bump'); }
          Save.persist(); if (HOME_SLOTS.every((s, i) => game.home[i])) Ach.unlock('decorator');
        }
        return;
      }
      if (Input.pressed('right')) { slot = (slot + 1) % HOME_SLOTS.length; Audio8.sfx('select'); } if (Input.pressed('left')) { slot = (slot + HOME_SLOTS.length - 1) % HOME_SLOTS.length; Audio8.sfx('select'); }
      if (Input.pressed('jump')) { cat = true; ci = 0; Audio8.sfx('confirm'); }
      if (Input.pressed('back') || Input.pressed('start') || Input.pressed('run')) go(() => TownScene());
    },
    draw() {
      ctx.fillStyle = '#f8e0b0'; ctx.fillRect(0, 0, VW, 140); ctx.fillStyle = '#f0d098'; for (let x = 0; x < VW; x += 12) ctx.fillRect(x, 0, 6, 140);
      ctx.fillStyle = '#b07a48'; ctx.fillRect(0, 140, VW, 84); ctx.fillStyle = '#9a6a3a'; for (let y = 146; y < VH; y += 10) ctx.fillRect(0, y, VW, 1);
      HOME_SLOTS.forEach((s, i) => { const id = game.home[i]; if (id && FURNITURE[id]) FURNITURE[id].draw(s.x, s.y); if (i === slot && !cat) { ctx.strokeStyle = (t >> 3) & 1 ? '#ffe040' : '#ffffff'; ctx.strokeRect(s.x - 6.5, s.y - (s.kind === 'floor' ? 22 : 6) - 0.5, s.kind === 'rug' ? 1 : 56, s.kind === 'floor' ? 48 : 40); if (s.kind === 'rug') ctx.strokeRect(s.x - 44.5, s.y - 4.5, 89, 19); } });
      drawWally(128, 168, 'idle' + ((t >> 4) % 4), 1);
      drawWindow(4, 4, 248, 18); txt('MY HOME - ' + HOME_SLOTS[slot].name, 10, 9, '#ffe040'); ctx.drawImage(Sprites.coinIcon, 200, 9); txt('*' + pad(game.coins, 2), 207, 9);
      if (cat) { const L = list(); drawWindow(56, 40, 144, 18 + L.length * 11); L.forEach((id, i) => { const y = 48 + i * 11, f = FURNITURE[id]; txt(id === 'none' ? 'EMPTY' : f.name, 74, y, i === ci ? '#ffe040' : '#fff'); if (i === ci) txt('>', 64, y, '#ffe040'); if (f) txt(game.homeItems.includes(id) ? 'OWN' : String(f.price), 192, y, game.homeItems.includes(id) ? '#5ae060' : game.coins >= f.price ? '#fff' : '#ff6060', { align: 'right' }); }); }
      txt(cat ? 'A: BUY / PLACE   B: BACK' : '< >: SPOT   A: DECORATE   B: LEAVE', 128, 212, '#fff', { align: 'center', outline: '#3a2010' });
      if (msgT) txt(msg, 128, 120, '#5ff0ff', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------------- EX Boss Rush (after beating the Static Emperor) ----------------
const RUSH_EX = RUSH_STAGES.concat([
  { id: 'ringmaster', name: 'RINGMASTER', theme: 'carnival', c: 'r', y: 10, boss: true, hp: 6 },
  { id: 'golem', name: 'STONE GOLEM', theme: 'jungle', c: '*', y: 10, boss: true, hp: 6, type: 'golem' },
  { id: 'sandworm', name: 'SANDWORM', theme: 'desert', c: '*', y: 11, boss: true, hp: 6, type: 'sandworm' },
  { id: 'emperor', name: 'STATIC EMPEROR', theme: 'static', c: '*', y: 10, boss: true, hp: 10, type: 'emperor' },
]);
const rushList = () => (RUSH && RUSH.ex ? RUSH_EX : RUSH_STAGES);
function rushDef(i) { // eslint-disable-line no-func-assign
  const s = rushList()[i], W = 26;
  const def = {
    name: RUSH && RUSH.ex ? 'EX BOSS RUSH' : 'BOSS RUSH', theme: s.theme, music: s.theme, width: W, noAuto: true, rushStage: i, lowGrav: !!s.lowGrav, ice: s.theme === 'snow',
    build(b) { b.ground(0, W - 1).fill(0, 0, 0, 11, 'X').fill(W - 1, 0, W - 1, 11, 'X'); b.row(4, 8, '====').row(W - 8, 8, '===='); b.set(s.boss ? 12 : 7, 11, '@'); b.set(s.boss ? (s.c === 'k' ? 18 : 21) : 19, s.y, s.c); b.set(3, 11, 'a'); b.set(W - 4, 11, 's'); },
  };
  if (s.boss) Object.assign(def, { boss: true, bossHp: s.hp, bossName: s.c === 'k' ? 'MOTHERSHIP' : s.name, bossType: s.type });
  else if (s.yeti) def.yetiArena = [1, W - 2]; else def.miniArena = [1, W - 2];
  return def;
}
function rushNext(pl) { // eslint-disable-line no-func-assign
  RUSH.splits.push(RUSH.frames);
  const b = RUSH.best && RUSH.best[RUSH.stage]; RUSH.lastDiff = b ? RUSH.frames - b : null;
  RUSH.hearts = Math.min(3, pl.p.hearts + 1); RUSH.ammo = pl.p.ammo; RUSH.special = pl.p.special; RUSH.stage++;
  if (RUSH.stage >= rushList().length) go(() => RushResult(true)); else go(() => startRushStage());
}
{
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) { const n = this.ents.length; _sp.call(this, sp); if (this.rush && RUSH && RUSH.ex) { this.speedMul = 1.35; for (let i = n; i < this.ents.length; i++) { const e = this.ents[i]; if ((e.boss || e.yeti) && e.hp) { e.hp = Math.ceil(e.hp * 1.75); e.maxHp = e.hp; } } } };
  const _upd = Play.prototype.update;
  Play.prototype.update = function () { if (this.rush && RUSH && RUSH.ex && !this._exInit) { this._exInit = true; this.speedMul = 1.35; } return _upd.call(this); };
}
function RushIntroScene() { // eslint-disable-line no-func-assign
  let t = 0, ex = false; const exOpen = Ach.has('truehero');
  return {
    enter() { Audio8.play('boss'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(() => ChallengeScene(1)); return; }
      if (exOpen && (Input.pressed('left') || Input.pressed('right'))) { ex = !ex; Audio8.sfx('select'); }
      if (t > 20 && Input.confirm()) { game = challengeGame(); RUSH = { ex, stage: 0, frames: 0, splits: [], hearts: 3, ammo: 6, special: 3, lastDiff: null, best: lsGet(ex ? 'wallyman-rushex-splits' : 'wallyman-rush-splits', null) }; Audio8.sfx('confirm'); go(() => startRushStage()); }
    },
    draw() {
      ctx.fillStyle = ex ? '#200010' : '#100818'; ctx.fillRect(0, 0, VW, VH);
      txt(ex ? 'EX BOSS RUSH' : 'BOSS RUSH', 128, 10, ex ? '#ff40c0' : '#ff6060', { scale: 2, align: 'center', outline: '#000' });
      const L = ex ? RUSH_EX : RUSH_STAGES, cols = ex ? 5 : 6, size = ex ? 40 : 37;
      L.forEach((s, i) => { const x = 128 - (cols * size) / 2 + (i % cols) * size + 4, y = 34 + Math.floor(i / cols) * 40; ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x - 2, y, 32, 32); ctx.save(); stickerArt(s.id === 'ringmaster' ? 'ringmaster' : s.id, x + 14, y + 17, t); ctx.restore(); });
      txt(ex ? 'ALL TEN BOSSES - TOUGHER AND FASTER!' : 'BEAT ALL SIX BOSSES IN A ROW.', 128, ex ? 118 : 80, '#fff', { align: 'center' });
      if (exOpen) txt('< >: ' + (ex ? 'NORMAL MODE' : 'EX MODE'), 128, ex ? 128 : 92, '#ffb0e0', { align: 'center' }); else txt('BEAT THE STATIC EMPEROR TO UNLOCK EX', 128, 92, '#8080a0', { align: 'center' });
      const best = lsGet(ex ? 'wallyman-rushex' : 'wallyman-rush', []);
      drawWindow(48, 138, 160, 62); txt('BEST TIMES', 128, 143, '#ffe040', { align: 'center' });
      if (!best.length) txt('NO RECORDS YET!', 128, 166, '#a8b0d8', { align: 'center' });
      best.slice(0, 4).forEach((r, i) => { txt(`${i + 1}. ${r.name}`, 60, 155 + i * 10, i === 0 ? '#ffe040' : '#fff'); txt(fmtTime(r.t), 196, 155 + i * 10, '#fff', { align: 'right' }); });
      if ((t >> 4) & 1) txt('PRESS START', 128, 208, '#fff', { align: 'center' });
    },
  };
}
function RushResult(won) { // eslint-disable-line no-func-assign
  let t = 0, record = false; const ex = !!RUSH.ex, L = rushList(), key = ex ? 'wallyman-rushex' : 'wallyman-rush';
  const best = lsGet(key, []), name = HEROES[heroOf()].short || HEROES[heroOf()].name;
  if (won) { record = !best.length || RUSH.frames < best[0].t; best.push({ t: RUSH.frames, name: name.slice(0, 10) }); best.sort((a, b) => a.t - b.t); lsSet(key, best.slice(0, 5)); if (record) lsSet(key + '-splits', RUSH.splits); Ach.unlock(ex ? 'exrush' : 'bossrush'); }
  return {
    enter() { Audio8.play(won ? 'victory' : 'gameover'); },
    update() { t++; if (t > 40 && (Input.confirm() || Input.pressed('back'))) go(() => RushIntroScene()); },
    draw() {
      ctx.fillStyle = '#100818'; ctx.fillRect(0, 0, VW, VH);
      txt(won ? (ex ? 'EX RUSH CLEAR!' : 'BOSS RUSH CLEAR!') : 'RUSH OVER!', 128, 8, won ? '#ffe040' : '#ff6060', { scale: 2, align: 'center', outline: '#000' });
      if (record && (t >> 3) & 1) txt('NEW RECORD!', 128, 28, '#5ff0ff', { align: 'center' });
      drawWindow(30, 38, 196, 22 + L.length * 12);
      L.forEach((s, i) => { const y = 46 + i * 12, f = RUSH.splits[i], b = RUSH.best && RUSH.best[i]; txt(s.name, 38, y, f !== undefined ? '#fff' : '#6a6a8a'); if (f !== undefined) { txt(fmtTime(f), 176, y, '#fff', { align: 'right' }); if (b) txt(fmtDiff(f - b), 220, y, f <= b ? '#5ae060' : '#ff6060', { align: 'right' }); } });
      txt('TOTAL ' + (won ? fmtTime(RUSH.frames) : '--'), 128, 66 + L.length * 12, '#ffe040', { align: 'center' });
      if (t > 40 && (t >> 4) & 1) txt('PRESS START', 128, 212, '#fff', { align: 'center' });
    },
  };
}

// ---------------- daily login rewards ----------------
const LOGIN_REWARDS = [[10, 0], [15, 0], [20, 0], [25, 0], [30, 0], [40, 0], [50, 1]];
function LoginScene(next) {
  const today = todayKey(), y = new Date(); y.setDate(y.getDate() - 1); const yKey = y.getFullYear() * 10000 + (y.getMonth() + 1) * 100 + y.getDate();
  const L = game.login || { last: 0, streak: 0 }, streak = L.last === yKey ? (L.streak % 7) + 1 : 1, [c, l] = LOGIN_REWARDS[streak - 1];
  game.login = { last: today, streak }; game.coins += c; game.lives += l; while (game.coins >= 100) { game.coins -= 100; game.lives++; } Save.persist();
  let t = 0;
  return {
    enter() { Audio8.play('victory'); Audio8.sfx('oneup'); },
    update() { t++; if (t > 40 && (Input.confirm() || Input.pressed('back'))) go(next); },
    draw() {
      drawParallax('sky', t * 0.4); drawWindow(16, 30, 224, 160);
      txt('DAILY GIFT!', 128, 38, '#ffe040', { scale: 2, align: 'center' });
      txt(`DAY ${streak} OF YOUR STREAK`, 128, 60, '#5ff0ff', { align: 'center' });
      LOGIN_REWARDS.forEach(([cc, ll], i) => { const x = 28 + i * 30, yy = 78, on = i === streak - 1, got = i < streak; ctx.fillStyle = on ? ((t >> 3) & 1 ? '#ffe040' : '#ffa020') : got ? '#3a7a4a' : '#2a2a4a'; ctx.fillRect(x, yy, 26, 40); txt('D' + (i + 1), x + 13, yy + 3, '#fff', { align: 'center' }); ctx.drawImage(Sprites.coinIcon, x + 4, yy + 16); txt(String(cc), x + 11, yy + 16, '#fff'); if (ll) ctx.drawImage(Sprites.heart, x + 10, yy + 28); });
      txt(`YOU GOT ${c} COINS${l ? ' AND A 1-UP' : ''}!`, 128, 132, '#fff', { align: 'center' });
      txt('COME BACK TOMORROW FOR MORE!', 128, 148, '#a8b0d8', { align: 'center' });
      if (t > 40 && (t >> 4) & 1) txt('PRESS START', 128, 174, '#fff', { align: 'center' });
    },
  };
}
{ // the map shows the daily gift first, and the credits after the true ending
  const _Map = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    if (game && game.rollCredits) { game.rollCredits = false; Save.persist(); return CreditsScene(() => MapScene()); }
    if (game && (!game.login || game.login.last !== todayKey())) return LoginScene(() => MapScene());
    return _Map(...a);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) { const a = e.alive; _db.call(this, e); if (a && !e.alive && e.type === 'emperor' && !this.rush) game.rollCredits = true; };
}

// ---------------- online ghost races (Firebase) ----------------
const OnlineGhosts = (() => {
  const cfg = window.WALLYMAN_ONLINE || {}, on = !!(cfg.projectId && cfg.apiKey && window.fetch);
  const base = on ? `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/ghosts` : '';
  const key = () => `key=${encodeURIComponent(cfg.apiKey)}`, cache = {};
  async function best(li) {
    if (cache[li] !== undefined) return cache[li];
    const res = await fetch(`${base}/L${li}?${key()}`); if (!res.ok) { cache[li] = null; return null; }
    const f = (await res.json()).fields || {}; const rec = JSON.parse((f.rec && f.rec.stringValue) || 'null');
    cache[li] = Array.isArray(rec) ? { rec, frames: Number((f.frames || {}).integerValue) || 0, name: (f.name || {}).stringValue || '???' } : null; return cache[li];
  }
  async function submit(li, frames, rec) {
    const cur = await best(li).catch(() => null); if (cur && cur.frames <= frames) return false;
    const name = (localStorage.getItem('wallyman-world-lastname') || HEROES[heroOf()].short || 'PLAYER').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 10);
    const res = await fetch(`${base}/L${li}?${key()}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { li: { integerValue: String(li) }, frames: { integerValue: String(frames) }, name: { stringValue: name }, rec: { stringValue: JSON.stringify(rec) } } }) });
    if (res.ok) cache[li] = { rec, frames, name }; return res.ok;
  }
  return { on, best, submit };
})();
{
  const _TA = TimeAttackSelect;
  TimeAttackSelect = function (...a) { // eslint-disable-line no-func-assign
    const s = _TA(...a), u = s.update, d = s.draw;
    s.update = function () { if (Input.pressed('special') && OnlineGhosts.on) { window.worldGhost = !window.worldGhost; Audio8.sfx('select'); } return u.call(this); };
    s.draw = function () { d.call(this); txt(OnlineGhosts.on ? `S: WORLD GHOST ${window.worldGhost ? 'ON' : 'OFF'}` : 'WORLD GHOSTS NEED FIREBASE', 128, 189, OnlineGhosts.on ? '#5ff0ff' : '#8090b0', { align: 'center', outline: '#101848' }); };
    return s;
  };
  const _TR = TAResultScene;
  TAResultScene = function (li, frames, rec, sp) { // eslint-disable-line no-func-assign
    const old = taLoad()[li], s = _TR(li, frames, rec, sp);
    if ((!old || frames < old) && OnlineGhosts.on && rec && rec.length) OnlineGhosts.submit(li, frames, rec).catch(() => {});
    return s;
  };
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (this.ta && window.worldGhost && OnlineGhosts.on && !this._wg) { this._wg = true; OnlineGhosts.best(this.li).then((g) => { if (g && g.rec) { this.ghost = g.rec; this.parts.push({ k: 'text', s: `WORLD GHOST: ${g.name} ${fmtTime(g.frames)}`, x: 40, y: 40, vy: 0, life: 150, fixed: true }); } }, () => {}); }
    return _upd.call(this);
  };
}

// ---------------- credits and the title-screen intro movie ----------------
function CreditsScene(next) {
  let t = 0;
  const cast = [['heroes', HERO_IDS.map((h) => ['h', h])], ['friends', [['dino', 'teal'], ['dino', 'red'], ['dino', 'blue'], ['dino', 'ice']]], ['enemies', ['grumble', 'prickle', 'buzzer', 'hopper', 'bat', 'charger', 'turret', 'ghost', 'slime', 'boomer', 'magdrone', 'cactus', 'beamling', 'squad'].map((k) => ['s', k])], ['bosses', ['boss', 'yeti', 'crab', 'mole', 'dragon', 'mother', 'ringmaster', 'golem', 'sandworm', 'squid', 'emperor'].map((k) => ['s', k])]];
  const lines = ['WALLYMAN WORLD', '', 'CREATED BY', 'DUG-T', '', 'STARRING', 'WALLYMAN', 'GOTHCHICK', 'DOUG THOMSON', 'ROBO-WALLY', 'FROST QUEEN', 'DINO', 'BARON STATIC', '', 'MUSIC', 'ORIGINAL CHIPTUNES', '', 'BUILT WITH', 'CLAUDE BY ANTHROPIC', '', 'THANK YOU', 'FOR PLAYING!'];
  return {
    enter() { Audio8.play('title'); },
    update() { t++; if ((t > 60 && (Input.confirm() || Input.pressed('back'))) || t > 2000) go(next || (() => ExtrasScene())); },
    draw() {
      drawParallax(['grass', 'sky', 'carnival', 'neon', 'static'][Math.floor(t / 480) % 5], t * 0.8);
      ctx.fillStyle = 'rgba(8,10,40,0.45)'; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, 160); ctx.clip();
      lines.forEach((l, i) => { const y = 170 + i * 14 - t * 0.5; if (y > -10 && y < 170) txt(l, 128, y, i === 0 ? '#ffe040' : ['CREATED BY', 'STARRING', 'MUSIC', 'BUILT WITH'].includes(l) ? '#5ff0ff' : '#fff', { align: 'center', outline: '#101848', scale: i === 0 ? 2 : 1 }); });
      ctx.restore();
      // the cast marches along the bottom
      let x = VW + 20 - ((t * 0.9) % (VW + 900));
      for (const [label, list] of cast) { txt(label.toUpperCase(), x, 170, '#ffe040', { outline: '#101848' }); x += 60; for (const [k, v] of list) { if (x > -30 && x < VW + 30) { if (k === 'h') Wally.draw(ctx, x, 210, 'walk' + ((t >> 2) % 8), 1, { t, hero: v, costume: 'classic' }); else if (k === 'dino') ctx.drawImage(Sprites.dinos[v].r[1 + ((t >> 3) & 1)], x - 12, 190); else { ctx.save(); stickerArt(v, x, 198, t); ctx.restore(); } } x += 30; } x += 30; }
    },
  };
}
function IntroMovieScene() {
  let t = 0;
  const shots = [
    [0, 260, 'WALLY ISLAND. A HAPPY PLACE WITH FULL SIGNAL EVERYWHERE...'],
    [260, 500, 'UNTIL ONE DAY, BARON STATIC ARRIVED!'],
    [500, 760, 'PHONES DIED. TVS FIZZLED. NOBODY COULD CALL HOME!'],
    [760, 1060, 'BUT A BAND OF HEROES ANSWERED THE CALL...'],
    [1060, 1320, ''],
  ];
  return {
    enter() { Audio8.play('title'); },
    update() { t++; if (Input.confirm() || Input.pressed('back') || Input.pressed('jump') || t > 1320) go(() => TitleScene()); },
    draw() {
      const s = shots.findIndex(([a, b]) => t >= a && t < b), [a] = shots[Math.max(0, s)], k = t - a;
      if (s === 0) { drawParallax('grass', t * 0.5); drawWally(60 + k * 0.4, 192, 'walk' + ((t >> 2) % 8), 1); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#40e090'; ctx.fillRect(220 + i * 5, 30 - i * 3, 3, 6 + i * 3); } }
      else if (s === 1) { drawParallax('castle', t * 0.3); ctx.save(); ctx.translate(128, 140); ctx.scale(2 + Math.min(1, k / 60), 2 + Math.min(1, k / 60)); stickerArt('boss', 0, 0, t); ctx.restore(); if ((k >> 2) % 6 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, 0, VW, VH); } }
      else if (s === 2) { drawParallax('haunted', t * 0.2); for (let y = 0; y < VH; y += 2) { ctx.fillStyle = `rgba(${(y * 37 + t * 13) % 255},${(y * 53 + t * 7) % 255},${(y * 91 + t * 3) % 255},0.25)`; ctx.fillRect(0, y, VW, 1); } for (let i = 0; i < 4; i++) { ctx.fillStyle = i < 4 - Math.floor(k / 50) ? '#40e090' : '#4a4a60'; ctx.fillRect(110 + i * 9, 120 - i * 6, 6, 10 + i * 6); } }
      else if (s === 3) { drawParallax('sky', t * 0.8); HERO_IDS.filter(heroOpen).forEach((h, i) => Wally.draw(ctx, -40 + k * 1.2 - i * 34 + 240, 200, 'run' + ((t >> 2) % 8), 1, { t, hero: h })); }
      else { drawParallax('grass', t * 0.6); drawLogo(40 - Math.max(0, 60 - k)); if ((k >> 4) & 1) txt('PRESS START', 128, 150, '#fff', { align: 'center', outline: '#101848' }); }
      const cap = shots[Math.max(0, s)][2];
      if (cap) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, VH - 34, VW, 34); wrapText(cap, 40).forEach((l, i) => txt(l.slice(0, Math.max(0, Math.floor(k * 1.2) - i * 40)), 128, VH - 28 + i * 11, '#fff', { align: 'center' })); }
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, 10); ctx.fillRect(0, VH - 4, VW, 4);
    },
  };
}
{ // play the intro movie if the title screen is left alone for a while
  const _T = TitleScene;
  TitleScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _T(...a), u = s.update; let idle = 0;
    s.update = function () { const any = ['left', 'right', 'up', 'down', 'jump', 'run', 'special', 'start', 'back'].some((k) => Input.down(k)); idle = any ? 0 : idle + 1; if (idle > 1500) { idle = 0; go(() => IntroMovieScene()); return; } return u.call(this); };
    return s;
  };
}

// ---------------- unique boss music ----------------
{
  const _play = Audio8.play;
  const pick = () => {
    if (!(typeof scene !== 'undefined' && scene instanceof Play)) return null;
    const d = scene.def, mini = (scene.ents.find((e) => e.yeti && e.active) || {}).type;
    if (d.bossType === 'emperor') return 'bossfinal'; if (d.bossType === 'golem') return 'bossjungle'; if (d.bossType === 'sandworm') return 'bossdesert'; if (d.bossType === 'squid') return 'bossufo';
    if (scene.ents.some((e) => e.type === 'ringmaster')) return 'bosscarn';
    if (d.bossName && /MOTHERSHIP/.test(d.bossName)) return 'bossufo';
    if (mini === 'yeti' || d.yetiArena) return 'bossice'; if (mini === 'crab') return 'bossdesert'; if (mini === 'mole') return 'bossjungle'; if (mini === 'dragon') return 'bossufo';
    return null;
  };
  Audio8.play = function (name) { if (name === 'boss') { const p = pick(); if (p) return _play.call(Audio8, p); } return _play.call(Audio8, name); };
}

// ---------------- colour assist and readable text ----------------
const COLOR_MODES = ['NORMAL', 'HIGH CONTRAST', 'VIVID', 'RED-GREEN ASSIST', 'BLUE-YELLOW ASSIST'];
(() => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
  svg.innerHTML = '<filter id="wm-rg"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0.7 -0.7 1 0 0  0 0 0 1 0"/></filter><filter id="wm-by"><feColorMatrix type="matrix" values="0.7 -0.3 0.6 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>';
  document.body.appendChild(svg);
})();
function applyColorMode() { const m = Settings.get('colors') || 'NORMAL'; cv.style.filter = { NORMAL: '', 'HIGH CONTRAST': 'contrast(1.35) saturate(1.15)', VIVID: 'saturate(1.8)', 'RED-GREEN ASSIST': 'url(#wm-rg)', 'BLUE-YELLOW ASSIST': 'url(#wm-by)' }[m] || ''; }
applyColorMode();
{
  const _fd = Font.draw;
  Font.draw = function (c, s, x, y, o = {}) { if (Settings.get('readable') && !o.outline && o.shadow !== null) o = Object.assign({}, o, { outline: '#000', shadow: null }); return _fd.call(Font, c, s, x, y, o); };
}

// ---------------- install as an app (PWA) ----------------
let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window) { try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* ignore */ } }
function InstallScene() {
  let t = 0, msg = '';
  const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene()); return; }
      if (Input.confirm() && installPrompt) { installPrompt.prompt(); installPrompt.userChoice.then((r) => { msg = r.outcome === 'accepted' ? 'INSTALLED! LOOK FOR THE ICON.' : 'MAYBE LATER!'; installPrompt = null; }); }
    },
    draw() {
      drawParallax('sky', t * 0.4); drawWindow(16, 24, 224, 176);
      txt('INSTALL AS AN APP', 128, 32, '#ffe040', { align: 'center' });
      const lines = standalone ? ['YOU ARE ALREADY PLAYING THE', 'INSTALLED APP. HAVE FUN!'] : installPrompt ? ['PRESS START TO ADD WALLYMAN WORLD', 'TO YOUR HOME SCREEN OR DESKTOP.', '', 'IT GETS ITS OWN ICON AND', 'WORKS OFFLINE TOO!'] : ['ON A PHONE: OPEN YOUR BROWSER MENU', '(SHARE ON IPHONE) AND CHOOSE', '"ADD TO HOME SCREEN".', '', 'ON A COMPUTER: LOOK FOR THE', 'INSTALL ICON IN THE ADDRESS BAR.', '', 'WORKS BEST FROM THE GITHUB', 'PAGES LINK. ONCE INSTALLED IT', 'PLAYS OFFLINE WITH ITS OWN ICON.'];
      lines.forEach((l, i) => txt(l, 128, 52 + i * 12, '#fff', { align: 'center' }));
      if (msg) txt(msg, 128, 176, '#5ff0ff', { align: 'center' });
      txt('B: BACK', 128, 188, '#a8b0d8', { align: 'center' });
    },
  };
}
function ExtrasScene() { // eslint-disable-line no-func-assign
  const items = [['LEVEL MAKER', () => LevelMakerScene(null)], ['COURSE WORLD', () => CourseWorldScene()], ['TROPHY ROOM', () => TrophyScene()], ['STICKER BOOK', () => StickerScene()], ['ART GALLERY', () => ArtScene()], ['JUKEBOX', () => JukeboxScene()], ['GALLERY', () => GalleryScene()], ['CREDITS', () => CreditsScene()], ['IMPORT SAVE', () => ImportSaveScene()], ['INSTALL APP', () => InstallScene()], ['OPTIONS', () => OptionsScene()], ['BACK', null]];
  let sel = 0, t = 0;
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
      drawParallax('sky', t * 0.3);
      drawLogo(4);
      drawWindow(60, 78, 136, 134);
      txt('EXTRAS', 128, 83, '#ffe040', { align: 'center' });
      items.forEach(([s], i) => { const y = 94 + i * 9.5; txt(s, 84, Math.round(y), i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 72 + ((t >> 3) & 1), Math.round(y), '#ffe040'); });
      txt(`TROPHIES ${Ach.count()}/${ACH_LIST.length}`, 128, 215, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
