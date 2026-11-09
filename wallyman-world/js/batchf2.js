'use strict';
// =====================================================================
// Batch F (part 2): photo mode, versus mode, fishing, kart racing,
// online course sharing, save codes, options, and control remapping.
// =====================================================================

// ---------------- photo mode (from the pause menu) ----------------
const PHOTO_STICKERS = [
  (x, y) => txt('#', x - 6, y - 7, '#ffe040', { scale: 2, outline: '#101848' }),
  (x, y) => ctx.drawImage(Sprites.heart, x - 7, y - 7, 14, 14),
  (x, y) => txt('WOW!', x, y - 7, '#ff60a0', { scale: 2, align: 'center', outline: '#101848' }),
  (x, y) => txt('COOL', x, y - 7, '#40e0ff', { scale: 2, align: 'center', outline: '#101848' }),
  (x, y) => ctx.drawImage(Sprites.medal, x - 8, y - 8),
  (x, y) => ctx.drawImage(Sprites.coin, x - 4, y - 7),
  (x, y) => { ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 10, y - 3, 8, 5); ctx.fillRect(x + 2, y - 3, 8, 5); ctx.fillRect(x - 2, y - 2, 4, 1); ctx.fillStyle = '#4a4a6a'; ctx.fillRect(x - 9, y - 2, 2, 1); ctx.fillRect(x + 3, y - 2, 2, 1); },
];
const PHOTO_FRAMES = ['NONE', 'POLAROID', 'GOLD', 'COMIC'];
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    const ph = this.photo;
    if (!ph) return _upd.call(this);
    const D = Input.down, Pr = Input.pressed, sp = D('run') ? 4 : 2;
    if (D('left')) ph.x -= sp; if (D('right')) ph.x += sp; if (D('up')) ph.y -= sp; if (D('down')) ph.y += sp;
    ph.x = clamp(ph.x, 8, VW - 8); ph.y = clamp(ph.y, 8, VH - 8);
    if (Pr('jump')) { ph.items.push({ k: ph.sticker, x: ph.x, y: ph.y }); Audio8.sfx('coin'); }
    if (Pr('special')) { ph.sticker = (ph.sticker + 1) % PHOTO_STICKERS.length; Audio8.sfx('select'); }
    if (Pr('run') && !D('left') && !D('right') && !D('up') && !D('down')) { ph.frame = (ph.frame + 1) % PHOTO_FRAMES.length; Audio8.sfx('select'); }
    if (Pr('start')) { ph.snap = true; Audio8.sfx('secret'); }
    if (Pr('back')) { if (ph.items.length) { ph.items.pop(); Audio8.sfx('stomp'); } else { this.photo = null; Audio8.sfx('pause'); } }
    if (ph.msgT > 0) ph.msgT--;
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () { if (this.photo || this._noHud) return; return _hud.call(this); };
  const _draw = Play.prototype.draw;
  Play.prototype.draw = function () {
    _draw.call(this);
    const ph = this.photo; if (!ph) return;
    for (const it of ph.items) PHOTO_STICKERS[it.k](it.x, it.y);
    const f = PHOTO_FRAMES[ph.frame];
    if (f === 'POLAROID') { ctx.fillStyle = '#f8f4ec'; ctx.fillRect(0, 0, VW, 8); ctx.fillRect(0, 0, 8, VH); ctx.fillRect(VW - 8, 0, 8, VH); ctx.fillRect(0, VH - 26, VW, 26); txt('WALLYMAN WORLD', 128, VH - 18, '#3a3a4a', { align: 'center', shadow: null }); }
    else if (f === 'GOLD') { for (let k = 0; k < 6; k++) { ctx.strokeStyle = k % 2 ? '#a07010' : '#ffd040'; ctx.lineWidth = 1; ctx.strokeRect(k + 0.5, k + 0.5, VW - 2 * k - 1, VH - 2 * k - 1); } for (const [cx, cy] of [[8, 8], [VW - 8, 8], [8, VH - 8], [VW - 8, VH - 8]]) { ctx.fillStyle = '#ffd040'; ctx.fillRect(cx - 4, cy - 4, 8, 8); ctx.fillStyle = '#e83050'; ctx.fillRect(cx - 2, cy - 2, 4, 4); } }
    else if (f === 'COMIC') { ctx.fillStyle = '#1a1020'; ctx.fillRect(0, 0, VW, 4); ctx.fillRect(0, VH - 4, VW, 4); ctx.fillRect(0, 0, 4, VH); ctx.fillRect(VW - 4, 0, 4, VH); ctx.fillStyle = '#fff8c0'; ctx.fillRect(8, 8, 96, 14); ctx.fillStyle = '#1a1020'; ctx.fillRect(8, 22, 96, 1); txt('MEANWHILE...', 12, 12, '#1a1020', { shadow: null }); }
    if (ph.snap) {
      ph.snap = false;
      try {
        const c = document.createElement('canvas'); c.width = VW * 4; c.height = VH * 4; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, VW * 4, VH * 4);
        const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'wallyman-photo-' + Date.now() + '.png'; document.body.appendChild(a); a.click(); a.remove();
        ph.msg = 'PHOTO SAVED!'; Ach.unlock('photo');
      } catch (e) { ph.msg = 'COULD NOT SAVE THE PHOTO'; }
      ph.msgT = 90;
    }
    // cursor and help (not part of the photo)
    ctx.save(); ctx.globalAlpha = 0.6; PHOTO_STICKERS[ph.sticker](ph.x, ph.y); ctx.restore();
    ctx.strokeStyle = (frame >> 3) & 1 ? '#ffffff' : '#ffe040'; ctx.strokeRect(ph.x - 10.5, ph.y - 10.5, 21, 21);
    ctx.fillStyle = 'rgba(16,24,72,0.8)'; ctx.fillRect(0, 0, VW, 11);
    txt(`PHOTO MODE  A:STICK S:NEXT B:FRAME(${PHOTO_FRAMES[ph.frame]}) START:SAVE`, 128, 2, '#fff', { align: 'center' });
    if (ph.msgT) txt(ph.msg, 128, 100, '#ffe040', { align: 'center', outline: '#101848' });
  };
}

// ---------------- versus mode ----------------
function raceDef(seed) {
  const r = Sprites.rng(seed), W = 240, theme = ['grass', 'beach', 'candy', 'carnival', 'jungle', 'desert'][Math.floor(r() * 6)];
  return {
    name: 'VERSUS RACE', theme, music: theme, width: W, noAuto: true,
    build(b) {
      b.ground(0, 20).set(3, 11, '@');
      let x = 21;
      while (x < W - 24) {
        const k = r();
        if (k < 0.25) { const g = 2 + Math.floor(r() * 3); x += g; b.ground(x, x + 8); b.coins(x - g, 9, g); x += 9; }
        else if (k < 0.45) { b.ground(x, x + 10); b.set(x + 5, 11, 'gp4'[Math.floor(r() * 3)]); x += 11; }
        else if (k < 0.6) { b.ground(x, x + 10).stairsUp(x + 2, 3).stairsDown(x + 6, 3); x += 11; }
        else if (k < 0.75) { b.row(x + 1, 9, '===').row(x + 6, 8, '===').coins(x + 6, 6, 3); x += 10; b.ground(x, x + 5); x += 6; }
        else if (k < 0.88) { b.ground(x, x + 12).set(x + 3, 11, 'J').fill(x + 7, 7, x + 11, 11, 'X'); x += 13; }
        else { b.ground(x, x + 10).row(x + 3, 8, 'BWB'); x += 11; }
      }
      b.ground(W - 24, W - 1).set(W - 8, 11, 'G');
    },
  };
}
const battleDef = () => ({
  name: 'VERSUS BATTLE', theme: ['castle', 'carnival', 'static', 'moon'][Math.floor(Math.random() * 4)], music: 'boss', width: 16, noAuto: true, battle: true,
  build(b) {
    b.ground(0, 15).fill(0, 0, 0, 11, 'X').fill(15, 0, 15, 11, 'X').fill(1, 0, 14, 0, 'X');
    b.row(2, 8, '====').row(10, 8, '====').row(6, 5, '====').set(2, 11, '@');
    b.set(4, 11, 'a').set(11, 11, 'a').set(7, 4, 'a').set(3, 7, 'a').set(12, 7, 'a');
  },
});
function VersusScene() {
  let row = 0, mode = 0, h1 = Math.max(0, HERO_IDS.indexOf(lastHero())), h2 = 1, t = 0;
  const open = () => HERO_IDS.filter((h) => heroOpen(h));
  return {
    enter() { Audio8.play('boss'); },
    update() {
      t++; const ids = open(); h1 %= ids.length; h2 %= ids.length;
      if (Input.pressed('down')) { row = (row + 1) % 4; Audio8.sfx('select'); } if (Input.pressed('up')) { row = (row + 3) % 4; Audio8.sfx('select'); }
      const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
      if (d) { Audio8.sfx('select'); if (row === 0) mode ^= 1; if (row === 1) h1 = (h1 + d + ids.length) % ids.length; if (row === 2) h2 = (h2 + d + ids.length) % ids.length; }
      if (Input.pressed('back')) { go(() => ChallengeScene(4)); return; }
      if (t > 15 && (Input.pressed('start') || (Input.pressed('jump') && row === 3))) {
        game = challengeGame(); game.hero = ids[h1]; game.coop = true; game.other = { hero: ids[h2], costume: ids[h1] === ids[h2] ? 'junior' : 'classic', lives: 99 };
        const def = mode === 0 ? raceDef((Date.now() & 0xffff) + 3) : battleDef(); window.VERSUS_LEVEL = def;
        Audio8.sfx('confirm'); go(() => new Play(95, false, { versus: mode === 0 ? 'race' : 'battle' }));
      }
    },
    draw() {
      drawParallax('carnival', t * 0.6); const ids = open();
      txt('VERSUS', 128, 12, '#ff6060', { scale: 2, align: 'center', outline: '#101848' });
      drawWindow(24, 36, 208, 120);
      const rows = [['MODE', mode === 0 ? 'RACE TO THE GOAL' : 'CANNONBALL BATTLE'], ['P1 HERO', HEROES[ids[h1 % ids.length]].name], ['P2 HERO', HEROES[ids[h2 % ids.length]].name], ['START!', '']];
      rows.forEach(([k, v], i) => { const y = 46 + i * 16; txt(k, 44, y, i === row ? '#ffe040' : '#a8b0d8'); if (v) txt('< ' + v + ' >', 220, y, '#fff', { align: 'right' }); if (i === row) txt('>', 34 + ((t >> 3) & 1), y, '#ffe040'); });
      Wally.draw(ctx, 80, 150, 'run' + ((t >> 2) % 8), 1, { t, hero: ids[h1 % ids.length] }); Wally.draw(ctx, 176, 150, 'run' + ((t >> 2) % 8), -1, { t, hero: ids[h2 % ids.length], costume: ids[h1 % ids.length] === ids[h2 % ids.length] ? 'junior' : 'classic' });
      txt('VS', 128, 128, '#ffe040', { scale: 2, align: 'center', outline: '#101848' });
      txt(mode === 0 ? 'SPLIT SCREEN - FIRST TO THE GOAL WINS' : '3 HEARTS EACH - BLAST OR STOMP YOUR RIVAL', 128, 166, '#fff', { align: 'center', outline: '#101848' });
      txt('P1: ARROWS + Z X C    P2: WASD + F G H', 128, 180, '#a8b0d8', { align: 'center', outline: '#101848' });
      txt('(OR TWO GAMEPADS)', 128, 191, '#a8b0d8', { align: 'center', outline: '#101848' });
    },
  };
}
function VersusResult(winner, mode) {
  let t = 0; Ach.unlock('versus');
  const hero = winner === 1 ? game.hero : game.other.hero;
  return {
    enter() { Audio8.play('victory'); },
    update() { t++; if (t > 40 && (Input.confirm() || Input.pressed('back'))) go(() => VersusScene()); },
    draw() {
      drawParallax('sky', t * 0.5);
      txt(`PLAYER ${winner} WINS!`, 128, 50, winner === 1 ? '#ffe040' : '#5ae060', { scale: 2, align: 'center', outline: '#101848' });
      txt(HEROES[hero].name, 128, 76, HEROES[hero].color, { align: 'center', outline: '#101848' });
      Wally.draw(ctx, 128, 160, 'win' + ((t >> 4) & 1), 1, { t, hero, sx: 2, sy: 2, costume: winner === 2 && game.other.costume === 'junior' ? 'junior' : 'classic' });
      txt(mode === 'race' ? 'FIRST TO THE GOAL!' : 'LAST ONE STANDING!', 128, 176, '#fff', { align: 'center', outline: '#101848' });
      if (t > 40 && (t >> 4) & 1) txt('PRESS START', 128, 200, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (this.versus === undefined) { this.versus = this.li === 95 ? (this.lv.def.battle ? 'battle' : 'race') : null; if (this.versus) { this.p.hearts = 3; this.pet = null; } }
    _upd.call(this);
    if (!this.versus) return;
    this.time = 999;
    if (this.p2 && !this._vsInit) { this._vsInit = true; this.p2.hearts = 3; if (this.versus === 'battle') this.p2.x = 12 * TS; }
    if (this.versus === 'race' && this.p2) { const lead = Math.max(this.p.x, this.p2.x); this.cam.x = clamp(lead - 100, 0, this.lv.w * TS - VW); }
  };
  const _upP = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    const n = this.balls.length; _upP.call(this);
    if (this.versus) for (let i = n; i < this.balls.length; i++) this.balls[i].owner = this._p2ctx ? 2 : 1;
  };
  const _ub = Play.prototype.updateBalls;
  Play.prototype.updateBalls = function () {
    const before = this.balls.slice(); _ub.call(this);
    if (this.versus !== 'battle') return;
    for (const bl of before) if (!this.balls.includes(bl) && bl.y < VH) {
      for (const [who, q] of [[1, this.p], [2, this.p2]]) if (q && who !== bl.owner && !q.down && Math.hypot(q.x + q.w / 2 - bl.x - 4, q.y + q.h / 2 - bl.y - 4) < 34) { if (who === 1) this.hurt(); else this.withP2(() => this.hurt()); }
    }
  };
  const _p2u = Play.prototype.updateP2;
  Play.prototype.updateP2 = function () { // in a race, wake the world around player 2 while their touches are checked
    if (this.versus !== 'race' || !this.p2) return _p2u.call(this);
    const keep = this.cam.x; this.cam.x = clamp(this.p2.x - 100, 0, this.lv.w * TS - VW);
    try { return _p2u.call(this); } finally { this.cam.x = keep; }
  };
  Play.prototype.onHeadBounce = function (a, b) { if (this.versus !== 'battle') return; if (b === this.p) this.hurt(); else this.withP2(() => this.hurt()); };
  const respawn = (pl, q) => { const [x, y] = safeSpot(pl, { x: q.x - 48, w: q.w, h: q.h }); Object.assign(q, { x, y, vx: 0, vy: 0, inv: 90, hearts: 3, climb: false, zip: null, inBarrel: null }); };
  const _die = Play.prototype.die;
  Play.prototype.die = function () {
    if (this.versus === 'race' && !this._p2ctx) { respawn(this, this.p); this.parts.push({ k: 'text', s: 'P1 RESPAWN', x: this.p.x - 14, y: this.p.y - 12, vy: -0.4, life: 40 }); return; }
    if (this.versus === 'battle' && !this._p2ctx) { if (this.state !== 'play') return; this.state = 'done'; go(() => VersusResult(2, 'battle')); return; }
    return _die.call(this);
  };
  const _p2d = Play.prototype.p2Down;
  Play.prototype.p2Down = function () {
    if (this.versus === 'race') { respawn(this, this.p2); return; }
    if (this.versus === 'battle') { if (this.state !== 'play') return; this.state = 'done'; go(() => VersusResult(1, 'battle')); return; }
    return _p2d.call(this);
  };
  const _clear = Play.prototype.clear;
  Play.prototype.clear = function (s) {
    if (this.versus === 'race') { if (this.state !== 'play') return; this.state = 'done'; const w = this._p2ctx ? 2 : 1; Audio8.play('clear'); go(() => VersusResult(w, 'race')); return; }
    return _clear.call(this, s);
  };
  const _draw = Play.prototype.draw;
  Play.prototype.draw = function () {
    if (this.versus !== 'race' || !this.p2 || this.photo) {
      _draw.call(this);
      if (this.versus === 'battle' && this.p2) { // battle HUD
        ctx.fillStyle = 'rgba(16,24,72,0.75)'; ctx.fillRect(0, 0, VW, 12);
        txt('P1', 4, 3, '#ffe040'); for (let i = 0; i < 3; i++) ctx.drawImage(i < this.p.hearts ? Sprites.heart : Sprites.heartEmpty, 20 + i * 9, 3); txt('*' + this.p.ammo, 50, 3, '#fff');
        txt('P2', 230, 3, '#5ae060'); for (let i = 0; i < 3; i++) ctx.drawImage(i < this.p2.hearts ? Sprites.heart : Sprites.heartEmpty, 200 + i * 9, 3); txt('*' + this.p2.ammo, 176, 3, '#fff');
      }
      return;
    }
    const keep = this.cam.x, maxC = this.lv.w * TS - 128;
    [this.p, this.p2].forEach((q, k) => {
      ctx.save(); ctx.beginPath(); ctx.rect(k * 128, 0, 128, VH); ctx.clip(); ctx.translate(k * 128, 0);
      this.cam.x = clamp(q.x - 44, 0, maxC); this._noHud = true;
      _draw.call(this);
      this._noHud = false; ctx.restore();
    });
    this.cam.x = keep;
    ctx.fillStyle = '#101848'; ctx.fillRect(127, 0, 2, VH);
    const W = this.lv.w * TS;
    [this.p, this.p2].forEach((q, k) => { const x0 = k * 128; ctx.fillStyle = 'rgba(16,24,72,0.75)'; ctx.fillRect(x0 + 2, 2, 124, 12); txt(k ? 'P2' : 'P1', x0 + 5, 4, k ? '#5ae060' : '#ffe040'); txt(Math.floor(q.x / TS) + 'M', x0 + 124, 4, '#fff', { align: 'right' }); });
    ctx.fillStyle = 'rgba(16,24,72,0.85)'; ctx.fillRect(16, 214, 224, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(238, 212, 2, 10);
    ctx.fillStyle = '#ffe040'; ctx.fillRect(16 + Math.round((this.p.x / W) * 220), 213, 4, 8); ctx.fillStyle = '#5ae060'; ctx.fillRect(16 + Math.round((this.p2.x / W) * 220), 213, 4, 8);
  };
}

// ---------------- fishing ----------------
const FISH = [['MINNOW', 2, '#a0b0c0', 40], ['TROUT', 5, '#80a060', 30], ['SALMON', 8, '#e08070', 18], ['OLD BOOT', 0, '#6a4a2a', 8], ['GOLDEN CARP', 20, '#ffd040', 3], ['TREASURE!', 30, '#c09040', 1]];
function FishScene() {
  let t = 0, st = 'aim', pow = 0, powD = 1, dist = 0, wait = 0, tension = 0, prog = 0, fish = null, msg = 'A: CAST (3 COINS)';
  const pick = () => { let r = Math.random() * FISH.reduce((a, f) => a + f[3], 0) * (dist > 0.7 ? 0.8 : 1); for (const f of FISH) { r -= f[3]; if (r <= 0) return f; } return FISH[0]; };
  return {
    enter() { Audio8.play('beach'); },
    update() {
      t++;
      if (Input.pressed('back') || (Input.pressed('run') && st !== 'reel')) { go(() => MiniGamesScene()); return; }
      if (st === 'aim') { pow += powD * 0.025; if (pow >= 1 || pow <= 0) powD = -powD; if (Input.pressed('jump')) { if (game.coins < 3) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); } else { game.coins -= 3; dist = pow; st = 'wait'; wait = 60 + Math.floor(Math.random() * 180); msg = 'WAIT FOR A BITE...'; Audio8.sfx('swoop'); } } }
      else if (st === 'wait') { if (--wait <= 0) { st = 'bite'; wait = 32; fish = pick(); msg = 'A BITE! PRESS A!'; Audio8.sfx('select'); rumble(0.4, 120); } else if (Input.pressed('jump')) { st = 'aim'; msg = 'TOO EARLY! A: CAST AGAIN'; } }
      else if (st === 'bite') { if (Input.pressed('jump')) { st = 'reel'; tension = 30; prog = 0; msg = 'HOLD A TO REEL - KEEP IT GREEN!'; } else if (--wait <= 0) { st = 'aim'; msg = 'IT GOT AWAY! A: CAST AGAIN'; Audio8.sfx('bump'); } }
      else if (st === 'reel') {
        const pull = (fish[1] / 10 + 0.3) * (Math.sin(t * 0.13) + 1.2);
        if (Input.down('jump')) { prog += 0.7; tension += 1.4; } else tension -= 1.6;
        tension += pull * 0.6 - 0.2; tension = Math.max(0, tension);
        if (tension > 100) { st = 'aim'; msg = 'SNAP! THE LINE BROKE'; Audio8.sfx('hurt'); rumble(0.6, 200); }
        else if (tension < 2 && !Input.down('jump') && prog < 100) prog = Math.max(0, prog - 0.4);
        if (prog >= 100) { st = 'caught'; wait = 120; game.coins += fish[1]; while (game.coins >= 100) { game.coins -= 100; game.lives++; } if (fish[0] === 'GOLDEN CARP') Ach.unlock('fisher'); Save.persist(); msg = `CAUGHT A ${fish[0]}! +${fish[1]} COINS`; Audio8.sfx(fish[1] ? 'oneup' : 'bump'); }
      } else if (st === 'caught') { if (--wait <= 0 || Input.pressed('jump')) { st = 'aim'; msg = 'A: CAST (3 COINS)'; } }
    },
    draw() {
      const g = ctx.createLinearGradient(0, 0, 0, 110); g.addColorStop(0, '#ffb070'); g.addColorStop(1, '#ffe0b0'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 110);
      ctx.fillStyle = '#2a6ab0'; ctx.fillRect(0, 110, VW, 114); ctx.fillStyle = '#4a8ad0'; for (let y = 112; y < VH; y += 8) for (let x = ((y * 5 + t) % 20) - 20; x < VW; x += 20) ctx.fillRect(x, y, 8, 1);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 100, 70, 10); ctx.fillStyle = '#5a3a1a'; for (let x = 6; x < 70; x += 16) ctx.fillRect(x, 110, 4, 40);
      drawWally(40, 100, st === 'reel' ? 'throw' : 'idle0', 1);
      const bx = 70 + dist * 160, by = 116 + (st === 'bite' ? 4 + ((t >> 1) & 1) * 3 : Math.sin(t * 0.08) * 1.5);
      if (st !== 'aim') { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(54, 78); ctx.quadraticCurveTo(bx - 20, 60, bx, by); ctx.stroke(); ctx.fillStyle = '#ff3040'; ctx.fillRect(bx - 2, by - 3, 5, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 2, by, 5, 2); }
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(46, 70, 2, 18); ctx.fillRect(48, 70, 8, 2);
      if (st === 'aim') { ctx.fillStyle = '#1a1020'; ctx.fillRect(80, 130, 102, 8); ctx.fillStyle = '#5ae060'; ctx.fillRect(81, 131, Math.round(pow * 100), 6); txt('POWER', 131, 140, '#fff', { align: 'center' }); }
      if (st === 'reel') { ctx.fillStyle = '#1a1020'; ctx.fillRect(60, 150, 136, 10); ctx.fillStyle = tension > 80 ? '#ff3040' : tension > 55 ? '#ffd040' : '#5ae060'; ctx.fillRect(61, 151, Math.min(134, Math.round(tension * 1.34)), 8); txt('TENSION', 128, 162, '#fff', { align: 'center' }); ctx.fillStyle = '#1a1020'; ctx.fillRect(60, 176, 136, 8); ctx.fillStyle = '#40c0ff'; ctx.fillRect(61, 177, Math.min(134, Math.round(prog * 1.34)), 6); txt('REEL', 128, 186, '#fff', { align: 'center' }); }
      if (st === 'caught' && fish) { ctx.fillStyle = '#1a1020'; ctx.fillRect(110, 66, 36, 14); ctx.fillStyle = fish[2]; ctx.fillRect(111, 67, 30, 12); ctx.fillRect(141, 64, 6, 18); ctx.fillStyle = '#1a1020'; ctx.fillRect(114, 70, 2, 2); }
      drawWindow(8, 196, 240, 24); txt(msg, 128, 202, '#fff', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 200, 6); txt('*' + pad(game.coins, 2), 207, 6, '#3a2010', { shadow: null });
    },
  };
}

// ---------------- kart racing ----------------
function KartScene() {
  const CX = 128, CY = 118, RX = 100, RY = 70, LAPS = 3;
  let t = 0, count = 180, done = false, place = 0, award = 0;
  const me = { a: Math.PI / 2 + 0.06, x: CX, y: CY + RY, h: 0, v: 0, prog: 0, last: null, lap: 0, col: '#ff5040', name: HEROES[heroOf()].short || 'YOU' };
  const ai = [['#40a0ff', 0.0162, 'DINO'], ['#5ae060', 0.0168, 'GRUMB'], ['#ffd040', 0.0156, 'BARON']].map(([col, sp, name], i) => ({ col, sp, name, th: Math.PI / 2 + 0.06 + (i + 1) * 0.04, prog: 0 }));
  const thOf = (x, y) => Math.atan2((y - CY) / RY, (x - CX) / RX);
  return {
    enter() { Audio8.play('charge'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(() => MiniGamesScene()); return; }
      if (done) { if (Input.confirm() && t > 60) go(() => MiniGamesScene()); return; }
      if (count > 0) { count--; if (count % 60 === 0) Audio8.sfx(count ? 'tick' : 'confirm'); return; }
      const steer = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
      me.h += steer * 0.055 * (0.4 + Math.min(1, me.v / 2));
      const th = thOf(me.x, me.y), ex = CX + Math.cos(th) * RX, ey = CY + Math.sin(th) * RY, off = Math.hypot(me.x - ex, me.y - ey) > 16;
      const maxV = off ? 0.9 : 2.3;
      if (Input.down('jump')) me.v = Math.min(maxV, me.v + 0.05); else me.v = Math.max(0, me.v - 0.03);
      if (Input.down('run')) me.v = Math.max(0, me.v - 0.08); if (me.v > maxV) me.v -= 0.08;
      me.x += Math.cos(me.h) * me.v; me.y += Math.sin(me.h) * me.v; me.x = clamp(me.x, 6, VW - 6); me.y = clamp(me.y, 28, VH - 6);
      const nth = thOf(me.x, me.y); if (me.last !== null) { let d = nth - me.last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; me.prog += d; } me.last = nth;
      for (const k of ai) { k.th += k.sp * (1 + Math.sin(t * 0.01 + k.sp * 900) * 0.08); k.prog = k.th - (Math.PI / 2 + 0.06); }
      const racers = [{ p: me.prog, me: true }].concat(ai.map((k) => ({ p: k.prog })));
      if (me.prog >= LAPS * Math.PI * 2 || ai.some((k) => k.prog >= LAPS * Math.PI * 2 + 0.4)) {
        done = true; t = 0; place = 1 + ai.filter((k) => k.prog > me.prog).length; award = [0, 20, 10, 5, 2][place];
        game.coins += award; while (game.coins >= 100) { game.coins -= 100; game.lives++; } if (place === 1) Ach.unlock('kart'); Save.persist(); Audio8.play(place === 1 ? 'victory' : 'clear');
      }
      me.lap = Math.min(LAPS, Math.floor(Math.max(0, me.prog) / (Math.PI * 2)) + 1); me.rank = 1 + racers.filter((r) => !r.me && r.p > me.prog).length;
    },
    draw() {
      ctx.fillStyle = '#5ac858'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#4ab048'; for (let y = 0; y < VH; y += 12) for (let x = (y % 24); x < VW; x += 24) ctx.fillRect(x, y, 2, 2);
      ctx.lineWidth = 32; ctx.strokeStyle = '#7a7a8a'; ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1; ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff'; for (let k = 0; k < 8; k++) ctx.fillRect(CX - 2 + (k % 2) * 2, CY + RY - 16 + k * 4, 2, 4);
      ctx.fillStyle = '#f0d890'; ctx.beginPath(); ctx.ellipse(CX, CY, RX - 30, RY - 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.drawImage(Island, 64, 56, 128, 112, CX - 50, CY - 32, 100, 64);
      const kart = (x, y, h, col, head) => { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(h); ctx.fillStyle = '#1a1020'; ctx.fillRect(-7, -5, 14, 10); ctx.fillStyle = col; ctx.fillRect(-6, -4, 12, 8); ctx.fillStyle = '#1a1020'; ctx.fillRect(-6, -6, 4, 2); ctx.fillRect(2, -6, 4, 2); ctx.fillRect(-6, 4, 4, 2); ctx.fillRect(2, 4, 4, 2); ctx.restore(); if (head) { ctx.fillStyle = '#f2b48a'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 3, 4, 4); } };
      for (const k of ai) kart(CX + Math.cos(k.th) * RX, CY + Math.sin(k.th) * RY, k.th + Math.PI / 2, k.col, false);
      kart(me.x, me.y, me.h, me.col, true);
      drawWindow(4, 2, 248, 20); txt(`LAP ${me.lap}/${LAPS}`, 10, 8, '#ffe040'); txt(`POSITION ${me.rank || 1}/4`, 246, 8, '#fff', { align: 'right' }); if (count > -200 && !done) txt('A: GO   B: BRAKE   < >: STEER', 128, 212, '#fff', { align: 'center', outline: '#101848' });
      if (count > 0) txt(String(Math.ceil(count / 60)), 128, 100, '#ffe040', { scale: 3, align: 'center', outline: '#101848' });
      if (count <= 0 && count > -40) txt('GO!', 128, 100, '#5ae060', { scale: 3, align: 'center', outline: '#101848' });
      if (done) { drawWindow(48, 80, 160, 60); txt(['', '1ST PLACE!', '2ND PLACE', '3RD PLACE', '4TH PLACE'][place], 128, 90, place === 1 ? '#ffe040' : '#fff', { scale: 2, align: 'center' }); txt(`+${award} COINS`, 128, 112, '#5ff0ff', { align: 'center' }); if ((t >> 4) & 1) txt('PRESS START', 128, 126, '#fff', { align: 'center' }); }
      if (count <= 0) count--;
    },
  };
}
function MiniGamesScene() { // eslint-disable-line no-func-assign
  const items = ['SLOT MACHINE (5 COINS)', 'MEMORY MATCH (10 COINS)', 'FISHING (3 COINS A CAST)', 'KART RACE (FREE)', 'BACK'];
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === 4)) { go(() => HouseScene(2)); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go([() => SlotScene(), () => MemoryScene(), () => FishScene(), () => KartScene()][sel]); }
    },
    draw() {
      drawParallax('carnival', t * 0.4);
      drawWindow(20, 60, 216, 90); txt('MINI-GAMES', 128, 66, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 82 + i * 12; txt(s, 40, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); });
      ctx.drawImage(Sprites.coinIcon, 100, 160); txt('*' + pad(game.coins, 2), 107, 160, '#fff', { outline: '#101848' });
    },
  };
}

// ---------------- online course sharing (Firebase) ----------------
const OnlineCourses = (() => {
  const cfg = window.WALLYMAN_ONLINE || {}, on = !!(cfg.projectId && cfg.apiKey && window.fetch);
  const base = on ? `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents` : '';
  const key = () => `key=${encodeURIComponent(cfg.apiKey)}`;
  const val = (f) => (!f ? undefined : 'stringValue' in f ? f.stringValue : 'integerValue' in f ? Number(f.integerValue) : undefined);
  const clean = (s, n) => String(s || '').toUpperCase().replace(/[^A-Z0-9 .!?-]/g, '').slice(0, n).trim();
  async function list(by) {
    const res = await fetch(`${base}:runQuery?${key()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'levels' }], orderBy: [{ field: { fieldPath: by === 'top' ? 'likes' : 'ts' }, direction: 'DESCENDING' }], limit: 30 } }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return (await res.json()).filter((r) => r.document).map((r) => { const f = r.document.fields || {}; return { id: r.document.name.split('/').pop(), name: clean(val(f.name), 16) || 'UNTITLED', author: clean(val(f.author), 10) || '???', code: val(f.code) || '', likes: val(f.likes) | 0, ts: val(f.ts) | 0 }; }).filter((c) => Maker.decode(c.code));
  }
  async function upload(code, name, author) {
    const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const res = await fetch(`${base}/levels?documentId=${id}&${key()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: { stringValue: clean(name, 16) || 'UNTITLED' }, author: { stringValue: clean(author, 10) || 'PLAYER' }, code: { stringValue: code }, likes: { integerValue: '0' }, ts: { integerValue: String(Date.now()) } } }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  }
  async function like(c) {
    const res = await fetch(`${base}/levels/${encodeURIComponent(c.id)}?updateMask.fieldPaths=likes&${key()}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { likes: { integerValue: String(c.likes + 1) } } }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  }
  return { on, list, upload, like };
})();
function textBox(title, placeholder, done) { // small page overlay with a text field (for naming a course)
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,40,0.82);display:flex;align-items:center;justify-content:center;z-index:50;font-family:monospace';
  wrap.innerHTML = '<div style="background:#101848;border:3px solid #ffe040;border-radius:8px;padding:14px;width:min(90vw,360px);color:#fff;text-align:center"><div style="color:#ffe040;font-weight:bold;margin-bottom:8px"></div><input maxlength="16" style="width:100%;box-sizing:border-box;font:16px monospace;padding:6px;text-transform:uppercase"><div style="display:flex;gap:8px;justify-content:center;margin-top:10px"><button>OK</button><button>CANCEL</button></div></div>';
  wrap.querySelector('div div').textContent = title;
  const input = wrap.querySelector('input'); input.placeholder = placeholder;
  const [ok, cancel] = wrap.querySelectorAll('button');
  [ok, cancel].forEach((b) => { b.style.cssText = 'font:bold 14px monospace;padding:8px 14px;border-radius:6px;border:2px solid #fff;background:#2f62d0;color:#fff'; });
  const close = (v) => { wrap.remove(); done(v); };
  ok.onclick = () => close(input.value); cancel.onclick = () => close(null);
  ['keydown', 'keyup'].forEach((ev) => wrap.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'keydown' && e.key === 'Enter') close(input.value); }));
  document.body.appendChild(wrap); setTimeout(() => input.focus(), 50);
}
function CourseWorldScene() {
  let tab = 'new', list = [], sel = 0, t = 0, status = OnlineCourses.on ? 'LOADING...' : '', busy = false;
  const liked = (() => { try { return JSON.parse(localStorage.getItem('wallyman-liked')) || {}; } catch (e) { return {}; } })();
  const load = () => { if (!OnlineCourses.on) return; status = 'LOADING...'; list = []; OnlineCourses.list(tab).then((l) => { list = l; status = l.length ? '' : 'NO COURSES YET - BE THE FIRST!'; sel = 0; }, () => { status = 'COULD NOT REACH THE SERVER'; }); };
  load();
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(() => ExtrasScene()); return; }
      if (!OnlineCourses.on) { if (Input.confirm()) go(() => ExtrasScene()); return; }
      if (Input.pressed('left') || Input.pressed('right')) { tab = tab === 'new' ? 'top' : 'new'; Audio8.sfx('select'); load(); }
      if (list.length) {
        if (Input.pressed('down')) { sel = (sel + 1) % list.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + list.length - 1) % list.length; Audio8.sfx('select'); }
        const c = list[sel];
        if (Input.pressed('jump')) { const lv = Maker.decode(c.code); if (lv) { if (!game) game = Save.fresh(); window.CUSTOM_LEVEL = Object.assign(Maker.toDef(lv), { fromWorld: true, name: c.name }); Audio8.sfx('confirm'); go(() => new Play(99, false)); } }
        if (Input.pressed('run') && !busy && !liked[c.id]) { busy = true; OnlineCourses.like(c).then(() => { c.likes++; liked[c.id] = 1; try { localStorage.setItem('wallyman-liked', JSON.stringify(liked)); } catch (e) { /* ignore */ } Audio8.sfx('coin'); busy = false; }, () => { busy = false; Audio8.sfx('bump'); }); }
      }
    },
    draw() {
      drawParallax('sky', t * 0.4); drawWindow(8, 6, 240, 212);
      txt('COURSE WORLD', 128, 12, '#ffe040', { align: 'center' });
      if (!OnlineCourses.on) { ['SHARE LEVEL MAKER COURSES WITH', 'PLAYERS EVERYWHERE!', '', 'THIS SWITCHES ON ONCE THE', 'FIREBASE SETTINGS ARE ADDED TO', 'JS/ONLINE-CONFIG.JS', '', 'UNTIL THEN, SHARE COURSES WITH', 'THE SHARE CODE IN THE LEVEL MAKER.'].forEach((l, i) => txt(l, 128, 50 + i * 12, '#fff', { align: 'center' })); txt('PRESS START', 128, 196, (t >> 4) & 1 ? '#ffe040' : '#fff', { align: 'center' }); return; }
      txt(tab === 'new' ? '< NEWEST >' : '< MOST LIKED >', 128, 26, '#5ff0ff', { align: 'center' });
      if (status) txt(status, 128, 100, '#fff', { align: 'center' });
      const top = Math.max(0, Math.min(list.length - 12, sel - 5));
      list.slice(top, top + 12).forEach((c, j) => { const i = top + j, y = 42 + j * 12, on = i === sel; if (on) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); txt(c.name, 26, y, on ? '#ffe040' : '#fff'); txt(c.author, 150, y, '#a8b0d8'); txt((liked[c.id] ? '$' : '') + c.likes, 240, y, '#ff8080', { align: 'right' }); });
      txt('A: PLAY   B: LIKE   < >: SORT', 128, 202, '#a8b0d8', { align: 'center' });
    },
  };
}
{ // courses from Course World return there after a clear or a lost life
  const _uc = Play.prototype.updateClear, _ud = Play.prototype.updateDying;
  Play.prototype.updateClear = function () { if (this.def.fromWorld) { if (this.stateT === 150) go(() => CourseWorldScene()); return; } return _uc.call(this); };
  Play.prototype.updateDying = function () { if (this.def.fromWorld) { const p = this.p, t = this.stateT; if (t === 30) p.vy = -5.5; if (t > 30) { p.vy += 0.25; p.y += p.vy; } if (t === 110) go(() => CourseWorldScene()); return; } return _ud.call(this); };
}

// ---------------- save codes ----------------
const SaveCode = {
  encode(g) { return 'WMS1-' + btoa(unescape(encodeURIComponent(JSON.stringify(g)))); },
  decode(code) {
    try {
      const m = String(code).replace(/\s+/g, '').match(/^WMS1-([A-Za-z0-9+/=]+)$/); if (!m) return null;
      const g = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      if (!g || typeof g !== 'object' || !Array.isArray(g.cleared) || typeof g.lives !== 'number') return null;
      const N = LEVELS.length; g.cleared = Array.from({ length: N }, (_, i) => !!g.cleared[i]);
      for (const k of ['medals', 'stars', 'bars']) g[k] = Array.from({ length: N }, (_, i) => ((g[k] || [])[i]) | 0);
      g.secrets = g.secrets || {}; g.hero = HEROES[g.hero] ? g.hero : 'wally'; g.costume = g.costume || 'classic';
      return g;
    } catch (e) { return null; }
  },
};
function HouseScene(start = 0) { // eslint-disable-line no-func-assign
  const items = () => ["DINO'S SHOP", 'UPGRADE TREE', 'MINI-GAMES', 'FILE STATS', 'SAVE CODE'].concat(game.cleared[7] ? ['NEW GAME+'] : []).concat(['LEAVE']);
  let sel = start, t = 0, dom = false;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return; const it = items();
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && it[sel] === 'LEAVE')) { go(() => MapScene()); return; }
      if (Input.confirm() && it[sel] === 'SAVE CODE') { Save.persist(); dom = true; codeBox('YOUR SAVE CODE - KEEP IT SAFE!', SaveCode.encode(game), null, () => { dom = false; }); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go({ "DINO'S SHOP": () => ShopScene(), 'UPGRADE TREE': () => UpgradeScene(), 'MINI-GAMES': () => MiniGamesScene(), 'FILE STATS': () => StatsScene(), 'NEW GAME+': () => PlusScene() }[it[sel]]); }
    },
    draw() {
      ctx.fillStyle = '#f0c890'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0b478'; for (let x = 0; x < VW; x += 20) ctx.fillRect(x, 0, 2, 140);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 140, VW, 84); ctx.fillStyle = '#a06a34'; for (let x = 0; x < VW; x += 32) ctx.fillRect(x, 140, 30, 84);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(170, 22, 60, 44); ctx.fillStyle = '#fff'; ctx.fillRect(170, 43, 60, 2); ctx.fillRect(199, 22, 2, 44); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(168, 20, 64, 2); ctx.fillRect(168, 66, 64, 2);
      ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 190, 116);
      const q = PETS[heroOf()]; if (q) ctx.drawImage(q.img[0], 150, 128 + ((t >> 4) & 1));
      drawWally(130, 140, 'idle' + ((t >> 4) % 4), 1);
      drawWindow(8, 8, 150, 22); txt("DINO'S HOUSE", 83, 15, '#ffe040', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 172, 76); txt('*' + pad(game.coins, 2), 179, 76, '#3a2010', { shadow: null });
      const it = items(); drawWindow(8, 142, 150, 12 + it.length * 10);
      it.forEach((s, i) => { const y = 148 + i * 10; txt(s, 26, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); });
    },
  };
}
function ImportSaveScene() {
  let t = 0, data = null, slot = 0, dom = false, msg = 'A: PASTE A SAVE CODE';
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return;
      if (Input.pressed('back')) { go(() => ExtrasScene()); return; }
      if (!data && Input.confirm()) { dom = true; codeBox('PASTE YOUR SAVE CODE', '', (code) => { const g = SaveCode.decode(code); if (!g) return false; data = g; msg = 'PICK A FILE TO LOAD IT INTO'; return true; }, () => { dom = false; }); return; }
      if (data) {
        if (Input.pressed('down')) { slot = (slot + 1) % 3; Audio8.sfx('select'); } if (Input.pressed('up')) { slot = (slot + 2) % 3; Audio8.sfx('select'); }
        if (Input.confirm()) { Save.slots[slot] = data; Save.persist(); Audio8.sfx('oneup'); msg = `LOADED INTO FILE ${'ABC'[slot]}!`; data = null; }
      }
    },
    draw() {
      drawParallax('grass', t * 0.4); drawWindow(24, 40, 208, 140);
      txt('IMPORT SAVE', 128, 48, '#ffe040', { align: 'center' });
      txt('MOVE YOUR PROGRESS BETWEEN DEVICES:', 128, 66, '#fff', { align: 'center' }); txt("GET A CODE FROM DINO'S HOUSE", 128, 78, '#a8b0d8', { align: 'center' }); txt('ON THE OLD DEVICE, PASTE IT HERE.', 128, 90, '#a8b0d8', { align: 'center' });
      if (data) for (let i = 0; i < 3; i++) { const s = Save.slots[i], y = 112 + i * 14; txt(`FILE ${'ABC'[i]}  ${s ? 'OVERWRITE' : 'EMPTY'}`, 70, y, i === slot ? '#ffe040' : '#fff'); if (i === slot) txt('>', 58 + ((t >> 3) & 1), y, '#ffe040'); }
      txt(msg, 128, 164, '#5ff0ff', { align: 'center' });
    },
  };
}

// ---------------- options and controls ----------------
function OptionsScene() { // eslint-disable-line no-func-assign
  const order = ['easy', 'normal', 'hard'];
  const toggle = (k) => ({ get: () => (Settings.get(k) !== false ? 'ON' : 'OFF'), set: () => Settings.set(k, Settings.get(k) === false) });
  const rows = [
    ['DIFFICULTY', { get: () => `< ${DIFF[Settings.get('difficulty')].name} >`, step: (d) => Settings.set('difficulty', order[(order.indexOf(Settings.get('difficulty')) + d + 3) % 3]) }],
    ['MUSIC', { vol: 'music' }], ['SOUND FX', { vol: 'sfx' }],
    ['SOUND', { get: () => (Audio8.isEnabled() ? 'ON' : 'OFF'), set: () => Audio8.setEnabled(!Audio8.isEnabled()) }],
    ['CRT FILTER', { get: () => (Settings.get('crt') ? 'ON' : 'OFF'), set: () => Settings.set('crt', !Settings.get('crt')) }],
    ['SCREEN SHAKE', { get: () => (Settings.get('shake') ? 'ON' : 'OFF'), set: () => Settings.set('shake', !Settings.get('shake')) }],
    ['RUMBLE', toggle('rumble')], ['PET', toggle('pet')], ['WEATHER', toggle('weather')],
    ['ASSIST', { get: () => `< ${Settings.get('assist') || 'OFF'} >`, step: (d) => Settings.set('assist', ASSIST_MODES[(ASSIST_MODES.indexOf(Settings.get('assist') || 'OFF') + d + ASSIST_MODES.length) % ASSIST_MODES.length]) }],
    ['EVENTS', { get: () => (Settings.get('events') === false ? 'OFF' : 'AUTO'), set: () => Settings.set('events', Settings.get('events') === false) }],
    ['COLORS', { get: () => `< ${Settings.get('colors') || 'NORMAL'} >`, step: (d) => { Settings.set('colors', COLOR_MODES[(COLOR_MODES.indexOf(Settings.get('colors') || 'NORMAL') + d + COLOR_MODES.length) % COLOR_MODES.length]); applyColorMode(); } }],
    ['READABLE TEXT', { get: () => (Settings.get('readable') ? 'ON' : 'OFF'), set: () => Settings.set('readable', !Settings.get('readable')) }],
    ['CONTROLS', { go: () => ControlsScene() }], ['BACK', { back: true }],
  ];
  const TIPS = { ASSIST: { OFF: 'ASSIST MODE IS OFF', SLOW: 'SLOW: THE GAME RUNS AT 75% SPEED', HEARTS: 'HEARTS: NEVER RUN OUT OF HEARTS', WIDE: 'WIDE: BIGGER PLATFORMS, NARROWER GAPS', ALL: 'ALL: SLOW + HEARTS + WIDE' }, EVENTS: 'SEASONAL EVENTS SWITCH ON BY DATE', CONTROLS: 'CHANGE YOUR KEYS AND PAD BUTTONS', COLORS: 'COLOUR FILTERS TO HELP TELL THINGS APART', 'READABLE TEXT': 'BOLD OUTLINES ON ALL TEXT', PET: 'A LITTLE BUDDY WHO TAKES A HIT', WEATHER: 'RAIN, STORMS AND SNOW OUTDOORS' };
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % rows.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + rows.length - 1) % rows.length; Audio8.sfx('select'); }
      const [, r] = rows[sel], d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0), a = Input.pressed('jump') || Input.pressed('start');
      if (Input.pressed('back') || (r.back && a)) { go(() => ExtrasScene()); return; }
      if (r.go && a) { Audio8.sfx('confirm'); go(r.go); return; }
      if (r.vol && d) { Audio8.setVolume(r.vol, Audio8.getVolume(r.vol) + d * 0.2); Audio8.sfx('coin'); }
      if (r.step && (d || a)) { r.step(d || 1); Audio8.sfx('coin'); }
      if (r.set && (d || a)) { r.set(); Audio8.sfx('coin'); if (rows[sel][0] === 'RUMBLE' && Settings.get('rumble') !== false) rumble(0.7, 200); }
    },
    draw() {
      drawParallax('sky', t * 0.3); drawWindow(16, 4, 224, 216);
      txt('OPTIONS', 128, 10, '#ffe040', { align: 'center' });
      rows.forEach(([name, r], i) => {
        const y = 20 + i * 12, on = i === sel;
        if (on) txt('>', 26 + ((t >> 3) & 1), y, '#ffe040');
        txt(name, 36, y, on ? '#ffe040' : '#fff');
        if (r.vol) { const v = Math.round(Audio8.getVolume(r.vol) * 5); for (let k = 0; k < 5; k++) { ctx.fillStyle = k < v ? '#5ff0ff' : '#3a3a58'; ctx.fillRect(150 + k * 9, y + 6 - k, 7, 2 + k); } }
        else if (r.get) txt(r.get(), 226, y, '#5ff0ff', { align: 'right' });
      });
      const nm = rows[sel][0], tip = nm === 'DIFFICULTY' ? ['EASY: 3 HEARTS, MORE TIME, SLOWER FOES', 'NORMAL: THE CLASSIC CHALLENGE', 'HARD: 1 HEART, LESS TIME, FAST FOES'][order.indexOf(Settings.get('difficulty'))] : nm === 'ASSIST' ? TIPS.ASSIST[Settings.get('assist') || 'OFF'] : TIPS[nm] || '';
      txt(tip, 128, 205, '#a8b0d8', { align: 'center' });
    },
  };
}
const DEFAULT_KEYS = Object.assign({}, Input.map), DEFAULT_PAD = JSON.parse(JSON.stringify(Input.gpMap));
// apply any custom controls saved earlier
(() => {
  try {
    const keys = JSON.parse(localStorage.getItem('wallyman-keys')) || {}; for (const [code, act] of Object.entries(keys)) Input.map[code] = act;
    const pad = JSON.parse(localStorage.getItem('wallyman-pad')) || {}; for (const [act, btns] of Object.entries(pad)) Input.gpMap[act] = btns;
  } catch (e) { /* ignore */ }
})();

function ControlsScene() {
  const acts = [['left', 'LEFT'], ['right', 'RIGHT'], ['up', 'UP'], ['down', 'DOWN'], ['jump', 'JUMP'], ['run', 'RUN / FIRE'], ['special', 'SPECIAL'], ['start', 'START / PAUSE']];
  let sel = 0, t = 0, wait = null, msg = 'A: CHANGE KEY   S: CHANGE PAD BUTTON', padPrev = null;
  const nice = (c) => c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '').replace('Left', 'L').replace('Right', 'R').replace('Shift', 'SHIFT').toUpperCase();
  const keysFor = (a) => Object.keys(Input.map).filter((c) => Input.map[c] === a).map(nice).slice(0, 4).join(' ');
  const saveKeys = () => { const diff = {}; for (const [c, a] of Object.entries(Input.map)) if (DEFAULT_KEYS[c] !== a) diff[c] = a; try { localStorage.setItem('wallyman-keys', JSON.stringify(diff)); localStorage.setItem('wallyman-pad', JSON.stringify(Input.gpMap)); } catch (e) { /* ignore */ } };
  const onKey = (e) => {
    if (!wait || wait.kind !== 'key') return;
    e.preventDefault(); e.stopPropagation();
    if (e.code === 'Escape') { wait = null; msg = 'CANCELLED'; return; }
    Input.map[e.code] = wait.act; saveKeys(); msg = `${nice(e.code)} NOW DOES ${wait.label}`; wait = null; Audio8.sfx('coin');
  };
  addEventListener('keydown', onKey, true);
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (wait && wait.kind === 'pad') {
        const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [], now = pads[0] ? pads[0].buttons.map((b) => b.pressed) : [];
        if (padPrev) { const i = now.findIndex((v, k) => v && !padPrev[k]); if (i >= 0) { Input.gpMap[wait.act] = [i]; saveKeys(); msg = `PAD BUTTON ${i} NOW DOES ${wait.label}`; wait = null; Audio8.sfx('coin'); } }
        padPrev = now; if (Input.pressed('back')) { wait = null; msg = 'CANCELLED'; } return;
      }
      if (wait) return;
      if (Input.pressed('down')) { sel = (sel + 1) % (acts.length + 2); Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + acts.length + 1) % (acts.length + 2); Audio8.sfx('select'); }
      const leave = () => { removeEventListener('keydown', onKey, true); go(() => OptionsScene()); };
      if (Input.pressed('back')) { leave(); return; }
      if (sel === acts.length + 1 && Input.confirm()) { leave(); return; }
      if (sel === acts.length && Input.confirm()) { for (const k of Object.keys(Input.map)) delete Input.map[k]; Object.assign(Input.map, DEFAULT_KEYS); for (const k of Object.keys(Input.gpMap)) Input.gpMap[k] = DEFAULT_PAD[k].slice(); saveKeys(); msg = 'CONTROLS RESET'; Audio8.sfx('secret'); return; }
      if (sel < acts.length && Input.pressed('jump')) { wait = { kind: 'key', act: acts[sel][0], label: acts[sel][1] }; msg = `PRESS A KEY FOR ${acts[sel][1]} (ESC: CANCEL)`; }
      if (sel < acts.length && Input.pressed('special')) { if (!Input.gpMap[acts[sel][0]]) { msg = 'PAD D-PAD STAYS ON THE D-PAD'; return; } wait = { kind: 'pad', act: acts[sel][0], label: acts[sel][1] }; padPrev = null; msg = `PRESS A PAD BUTTON FOR ${acts[sel][1]}`; }
    },
    draw() {
      drawParallax('sky', t * 0.3); drawWindow(12, 8, 232, 208);
      txt('CONTROLS', 128, 14, '#ffe040', { align: 'center' });
      acts.forEach(([a, label], i) => { const y = 32 + i * 15, on = i === sel; if (on) txt('>', 20 + ((t >> 3) & 1), y, '#ffe040'); txt(label, 30, y, on ? '#ffe040' : '#fff'); txt(keysFor(a), 236, y, '#5ff0ff', { align: 'right' }); if (Input.gpMap[a]) txt('PAD ' + Input.gpMap[a].join(','), 236, y + 7, '#8090b0', { align: 'right' }); });
      [['RESET TO DEFAULTS', acts.length], ['BACK', acts.length + 1]].forEach(([l, i]) => { const y = 32 + i * 15, on = i === sel; if (on) txt('>', 20 + ((t >> 3) & 1), y, '#ffe040'); txt(l, 30, y, on ? '#ffe040' : '#fff'); });
      txt(msg, 128, 196, wait ? ((t >> 3) & 1 ? '#ffe040' : '#fff') : '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- challenges menu with versus ----------------
function ChallengeScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', ''];
  let sel = start, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === 5)) { go(() => TitleScene()); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go([() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene()][sel]); }
    },
    draw() {
      drawParallax('castle', t * 0.4);
      drawLogo(8);
      drawWindow(48, 96, 160, 92);
      txt('CHALLENGES', 128, 102, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 115 + i * 12; txt(s, 74, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(tips[sel], 128, 194, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
