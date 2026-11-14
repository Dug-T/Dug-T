'use strict';
// =====================================================================
// Update 2.1 (part 2): new moves and power-ups
//  - PARRY: press B just as an enemy or a shot hits you to knock it back
//    (it doesn't work on spikes, lava or falls)
//  - POWER SUITS from the first energy-drink block in many levels:
//    BEE SUIT (hold A in the air to fly in short bursts), ROCK SUIT
//    (heavy: sinks in water, smashes bricks when you land hard, shrugs
//    off wind), BALLOON SUIT (hold A to float up, let go to drift down).
//    A hit takes the suit away instead of a heart.
//  - FOCUS: slows everything except you for 6 seconds
//  - WEATHER ORB: press S to switch between rain and sun. Rain fills the
//    pits with water you can swim across; sun dries them out again.
// =====================================================================
const U21b = (() => {
  const PP = Play.prototype;
  const SUITS = ['bee', 'rock', 'balloon'];
  const itemFor = (pl) => { if (!pl.def || pl.def.boss || pl.def.shmup || pl.def.board || pl.def.sub || pl.def.custom || pl.rush) return null; const li = pl.li | 0, k = li % 4; return k === 0 ? 'suit:' + SUITS[Math.floor(li / 4) % 3] : k === 1 ? 'focus' : k === 2 && !pl.def.water ? 'orb' : null; };

  // ---------------- parry ----------------
  const SHOTS = new Set(['shade', 'star', 'pie', 'note', 'bolt', 'fireball', 'snowball', 'laser', 'cgear', 'spark', 'bullet', 'boomerang']);
  { const _h = PP.hurt;
    PP.hurt = function (spike) {
      const p = this.p;
      if (!spike && this.state === 'play' && p.parryT > 0 && !(p.inv > 0) && !(p.charge > 0)) {
        p.parryT = 0; p.parryCool = 40; p.inv = 24; const cx = p.x + p.w / 2, cy = p.y + p.h / 2; let n = 0;
        for (const e of this.ents) { if (!e.alive || e.dying || e.item) continue; const d = Math.hypot(e.x + (e.w || 8) / 2 - cx, e.y + (e.h || 8) / 2 - cy); if (d > 40) continue;
          if (SHOTS.has(e.type)) { e.vx = -(e.vx || 0) * 1.6 || (e.x < cx ? -3 : 3); e.vy = -Math.abs(e.vy || 1); e.reflected = true; e.t = Math.max(e.t || 0, 300); n++; }
          else if (e.boss) { e.x += e.x < cx ? -14 : 14; e.inv = Math.max(e.inv || 0, 20); n++; }
          else if (e.enemy && typeof this.flipKill === 'function') { this.flipKill(e); n++; } }
        this.parts.push({ k: 'text', s: 'PARRY!', x: p.x - 10, y: p.y - 18, vy: -0.5, life: 40 }); Audio8.sfx('ping'); this.shake = Math.max(this.shake, 4); this.hitstop = 6;
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; this.parts.push({ k: 'spark', x: cx + Math.cos(a) * 10, y: cy + Math.sin(a) * 10, life: 10 }); }
        this.parried = (this.parried || 0) + 1; return;
      }
      if (!spike && p.suit && this.state === 'play' && !(p.inv > 0) && !(p.charge > 0)) { this.parts.push({ k: 'text', s: 'SUIT LOST!', x: p.x - 16, y: p.y - 16, vy: -0.4, life: 40 }); p.suit = null; p.inv = 90; Audio8.sfx('hurt'); return; }
      return _h.apply(this, arguments);
    };
  }

  // ---------------- the player ----------------
  { const _up = PP.updatePlayer;
    PP.updatePlayer = function () {
      const p = this.p, Pr = Input.pressed, D = Input.down;
      if (this.state === 'play') {
        if (p.parryCool > 0) p.parryCool--; if (p.parryT > 0) p.parryT--;
        if (Pr('run') && !(p.parryCool > 0)) p.parryT = 8;
      }
      const orbS = p.orb && this.state === 'play' && Pr('special');
      if (p.orb) Input.pressed = (k) => (k === 'special' ? false : Pr(k)); // S works the orb instead
      const vy0 = p.vy, wet = () => !!this.def.water || this.tile(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h / 2) / TS)) === '~';
      try { _up.apply(this, arguments); } finally { Input.pressed = Pr; }
      if (this.state !== 'play') return;
      if (orbS && !(this.orbCool > 0)) { this.orbRain = !this.orbRain; this.orbCool = 90; this.setPools(this.orbRain); Audio8.sfx(this.orbRain ? 'swim' : 'power'); this.parts.push({ k: 'text', s: this.orbRain ? 'RAIN!' : 'SUNSHINE!', x: p.x - 16, y: p.y - 20, vy: -0.4, life: 50 }); if (typeof forceWeather === 'function') try { forceWeather(this, this.orbRain ? 'rain' : 'clear'); } catch (e) { /* ignore */ } }
      if (this.orbCool > 0) this.orbCool--;
      const s = p.suit;
      if (s === 'bee') { if (p.onGround) p.beeE = 70; if (!p.onGround && D('jump') && p.vy > -0.5 && (p.beeE || 0) > 0) { p.vy = Math.max(p.vy - 0.6, -2.2); p.beeE--; if (frame % 4 === 0) this.parts.push({ k: 'spark', x: p.x + p.w / 2 - p.face * 4, y: p.y + 8, life: 6 }); } }
      if (s === 'balloon' && !p.onGround) { if (D('jump')) p.vy = Math.max(p.vy - 0.42, -1.7); else p.vy = Math.min(p.vy, 1.1); }
      if (s === 'rock') {
        p.vx *= 0.97; if (wet()) p.vy = Math.min(4, p.vy + 0.35);
        if (p.onGround && vy0 > 4.4) { const tx = Math.floor((p.x + p.w / 2) / TS), ty = Math.floor((p.y + p.h + 2) / TS); let broke = 0; for (let d = -1; d <= 1; d++) { const c = this.tile(tx + d, ty); if (c === 'B' || c === 'X') { this.setTile(tx + d, ty, '.'); broke++; for (let k = 0; k < 4; k++) this.parts.push({ k: 'frag', x: (tx + d) * TS + 6, y: ty * TS + 4, vx: (k - 1.5) * 0.8, vy: -3 - k * 0.5, g: 0.3, life: 30 }); } } this.shake = Math.max(this.shake, broke ? 8 : 4); if (broke) { Audio8.sfx('brick'); this.addScore(50 * broke); } }
      }
    };
  }
  PP.setPools = function (on) { // rain fills every pit with water you can swim in; sun dries the water the rain made
    const g = this.lv.grid, W = this.lv.w; this.pools = this.pools || [];
    if (on) { for (let x = 0; x < W; x++) if (g[13][x] === '.' && g[12][x] === '.') for (let y = 10; y <= 13; y++) if (g[y][x] === '.') { g[y][x] = '~'; this.pools.push([x, y]); } }
    else { for (const [x, y] of this.pools) if (g[y][x] === '~') g[y][x] = '.'; this.pools = []; }
    if (this.lv._mv !== undefined) this.lv._mv++;
  };

  // ---------------- items, focus and slow motion ----------------
  { const _u = PP.update;
    PP.update = function () {
      if (this.hitstop > 0) { this.hitstop--; return; }
      if (this._item19 === undefined) this._item19 = itemFor(this);
      if (this._item19) for (const e of this.ents) if (e.type === 'drink' && !e._chk) { e._chk = true; if (this._item19) { const k = this._item19; this._item19 = null; e.type = 'suititem'; e.kind = k; break; } }
      if (this.focusT > 0) this.focusT--;
      return _u.apply(this, arguments);
    };
  }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type === 'suititem') {
        e.t = (e.t || 0) + 1; if (e.rise > 0) { e.rise--; e.y -= 1; } else e.y += Math.sin(e.t * 0.08) * 0.15;
        const p = this.p;
        if (e.rise <= 0 && this.state === 'play' && overlap(p, e)) {
          e.alive = false; Audio8.sfx('power');
          if (e.kind === 'focus') { this.focusT = 360; this.parts.push({ k: 'text', s: 'FOCUS!', x: e.x - 8, y: e.y - 8, vy: -0.5, life: 50 }); }
          else if (e.kind === 'orb') { p.orb = true; this.parts.push({ k: 'text', s: 'WEATHER ORB! PRESS S', x: e.x - 40, y: e.y - 8, vy: -0.4, life: 80 }); }
          else { p.suit = e.kind.split(':')[1]; p.beeE = 70; this.parts.push({ k: 'text', s: { bee: 'BEE SUIT!', rock: 'ROCK SUIT!', balloon: 'BALLOON SUIT!' }[p.suit], x: e.x - 20, y: e.y - 8, vy: -0.5, life: 60 }); }
        }
        return;
      }
      if (this.focusT > 0 && (frame & 1) && !e.item && e !== this.p) return; // slow motion: everything else moves at half speed
      if (e.reflected) { // a parried shot flies back and can hit the boss
        for (const b of this.ents) if (b.boss && b.alive && !b.dying && overlap(e, b)) { e.alive = false; if (typeof this.damageBoss === 'function') this.damageBoss(b); return; }
        e.x += e.vx || 0; e.y += e.vy || 0; if (e.y < -20 || e.x < this.cam.x - 40 || e.x > this.cam.x + VW + 40) e.alive = false; return;
      }
      return _ue.call(this, e);
    };
  }
  const ICON = (kind, x, y, t) => {
    if (kind === 'focus') { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 2, y, 10, 2); ctx.fillRect(x + 2, y + 12, 10, 2); ctx.fillStyle = '#a0e8ff'; ctx.beginPath(); ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + 11, y + 2); ctx.lineTo(x + 7, y + 7); ctx.lineTo(x + 11, y + 12); ctx.lineTo(x + 3, y + 12); ctx.lineTo(x + 7, y + 7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = '#ffe080'; ctx.fillRect(x + 6, y + 6 + ((t >> 3) & 1), 2, 4); return; }
    if (kind === 'orb') { const g = ctx.createRadialGradient(x + 5, y + 5, 1, x + 7, y + 7, 7); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, (t >> 5) & 1 ? '#80c8ff' : '#ffe060'); g.addColorStop(1, (t >> 5) & 1 ? '#2a6ad0' : '#e08020'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 7, y + 7, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 0.8; ctx.stroke(); return; }
    const s = kind.split(':')[1]; ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x + 7, y + 8, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s === 'bee' ? '#ffd030' : s === 'rock' ? '#9a948c' : '#ff5a8a'; ctx.beginPath(); ctx.arc(x + 7, y + 8, 5.5, 0, Math.PI * 2); ctx.fill();
    if (s === 'bee') { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 3, y + 6, 8, 1.5); ctx.fillRect(x + 3, y + 9, 8, 1.5); ctx.fillStyle = 'rgba(220,245,255,0.9)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 2, 3, 2, -0.4, 0, Math.PI * 2); ctx.ellipse(x + 10, y + 2, 3, 2, 0.4, 0, Math.PI * 2); ctx.fill(); }
    else if (s === 'rock') { ctx.fillStyle = '#6a645c'; ctx.fillRect(x + 4, y + 6, 3, 2); ctx.fillRect(x + 8, y + 9, 3, 2); }
    else { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + 7, y + 14); ctx.lineTo(x + 7, y + 16); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + 4, y + 5, 2, 2); }
  };
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) { if (e.type === 'suititem') { const x = Math.round(e.x - cx), y = Math.round(e.y); const g = ctx.createRadialGradient(x + 7, y + 7, 1, x + 7, y + 7, 12); g.addColorStop(0, 'rgba(255,250,200,0.35)'); g.addColorStop(1, 'rgba(255,250,200,0)'); ctx.fillStyle = g; ctx.fillRect(x - 5, y - 5, 24, 24); ICON(e.kind, x, y, frame); return; } return _de.call(this, e, cx); };
  }
  { const _dp = PP.drawPlayer;
    PP.drawPlayer = function (cx) {
      const p = this.p, x = Math.round(p.x + p.w / 2 - cx), y = Math.round(p.y);
      if (p.suit === 'balloon') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 1, y - 10); ctx.stroke(); ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.ellipse(x + 1, y - 16, 6, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - 2, y - 20, 2, 3); }
      const r = _dp.call(this, cx);
      if (p.suit === 'bee') { const f = (frame >> 1) & 1; ctx.fillStyle = 'rgba(220,245,255,0.85)'; ctx.beginPath(); ctx.ellipse(x - p.face * 5, y + 8 - f * 2, 4, 2.4, -0.5 * p.face, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x - 1, y - 1); ctx.lineTo(x - 3, y - 5); ctx.moveTo(x + 1, y - 1); ctx.lineTo(x + 3, y - 5); ctx.stroke(); ctx.fillStyle = '#ffd030'; ctx.fillRect(x - 4, y - 6, 2, 2); ctx.fillRect(x + 2, y - 6, 2, 2); }
      if (p.suit === 'rock') { ctx.fillStyle = 'rgba(140,132,120,0.55)'; ctx.fillRect(x - 6, y + 10, 12, 10); ctx.fillStyle = '#6a645c'; ctx.fillRect(x - 5, y + 12, 3, 2); ctx.fillRect(x + 2, y + 16, 3, 2); }
      if (p.parryT > 0 && p.parryT > 5) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y + p.h / 2, 14, 0, Math.PI * 2); ctx.stroke(); }
      return r;
    };
  }
  { const _hud = PP.drawHUD;
    PP.drawHUD = function () {
      if (this.focusT > 0) { ctx.fillStyle = `rgba(80,140,255,${Math.min(0.18, this.focusT / 600).toFixed(3)})`; ctx.fillRect(0, 0, VW, VH); const g = ctx.createRadialGradient(128, 112, 80, 128, 112, 190); g.addColorStop(0, 'rgba(0,10,40,0)'); g.addColorStop(1, 'rgba(0,10,40,0.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
      if (this.orbRain) { ctx.fillStyle = 'rgba(20,40,80,0.18)'; ctx.fillRect(0, 0, VW, VH); ctx.strokeStyle = 'rgba(190,220,255,0.55)'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let i = 0; i < 40; i++) { const x = (i * 37 + frame * 3) % (VW + 20) - 10, y = (i * 53 + frame * 7) % VH; ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 6); } ctx.stroke(); }
      const r = _hud.apply(this, arguments), p = this.p;
      let ix = 6; const ic = (k) => { ctx.save(); ctx.translate(ix, 200); ctx.scale(0.8, 0.8); ICON(k, 0, 0, frame); ctx.restore(); ix += 14; };
      if (p.suit) ic('suit:' + p.suit); if (p.orb) ic('orb'); if (this.focusT > 0) ic('focus');
      return r;
    };
  }
  return { itemFor, SUITS };
})();
UPDATES.unshift(['2.1', [
  'NEW ISLAND: DREAM WORLD', ' BOUNCY, FLOATY, UPSIDE-DOWN,', ' SLEEPWALKERS, MELTING CLOUDS', 'NEW ISLAND: KITCHEN KINGDOM', 'SECRET: STARLIGHT SUMMIT', ' (150 MEDALS) + TRUE ENDING', "NEW RIDE: SURF'S UP", 'NEW: LAWNMOWER CHASE (BUG ISLE)',
  'PARRY: PRESS B AS YOU ARE HIT', 'SUITS: BEE, ROCK, BALLOON', 'FOCUS: SLOW MOTION', 'WEATHER ORB: S = RAIN OR SUN',
]]);
