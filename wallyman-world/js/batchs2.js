'use strict';
// =====================================================================
// Update 1.9 (part 2):
//  - MODERN mode: particles (dust puffs, coin sparkles, lava embers,
//    bubbles), lighting (glowing lava, torch-lit caves and castles, lit
//    castle windows, glowing power-ups), a glass HUD with animated hearts
//    and coins, glass menu windows and a sliding screen transition
//  - adaptive music (muffled underwater, busier near bosses, a driving
//    beat on speed runs)
//  - SMOOTHNESS: smooth motion on 90/120 Hz screens, or a battery saver
//  - REDUCE MOTION: no shake, flashes or parallax, calmer effects
//  - touch: analogue stick, per-button layout, gestures, button buzz
// =====================================================================
const U19 = (() => {
  const reduce = () => Opt19.get('reduce', '0') === '1';
  const smooth = () => Opt19.get('smooth', 'AUTO');
  const M = () => Modern.on();
  const isPlay = () => typeof Play !== 'undefined' && scene instanceof Play;
  const rr = (X, Y, w, h, r) => { ctx.beginPath(); ctx.moveTo(X + r, Y); ctx.arcTo(X + w, Y, X + w, Y + h, r); ctx.arcTo(X + w, Y + h, X, Y + h, r); ctx.arcTo(X, Y + h, X, Y, r); ctx.arcTo(X, Y, X + w, Y, r); ctx.closePath(); };

  // ---------------- REDUCE MOTION ----------------
  { const _g = Settings.get; Settings.get = function (k) { if (k === 'shake' && reduce()) return false; return _g.apply(this, arguments); }; }
  { const _pp = drawParallax; drawParallax = function (theme, x, ...a) { return _pp(theme, reduce() ? 0 : x, ...a); }; } // eslint-disable-line no-func-assign
  { // soften full-screen white flashes (lightning, hits) to a gentle glow
    const memo = new Map(), _fr = ctx.fillRect;
    const flashAlpha = (fs) => {
      if (typeof fs !== 'string') return 0; let v = memo.get(fs); if (v !== undefined) return v;
      let r, g, b, a = 1, m;
      if ((m = /^#([0-9a-f]{6})$/i.exec(fs))) { const n = parseInt(m[1], 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; } else if ((m = /^rgba?\(([^)]+)\)/.exec(fs))) { const q = m[1].split(',').map(Number); [r, g, b] = q; if (q.length > 3) a = q[3]; } else { memo.set(fs, 0); return 0; }
      v = Math.min(r, g, b) > 190 && a < 1 ? a : 0; memo.set(fs, v); return v;
    };
    ctx.fillRect = function (x, y, w, h) {
      if (w >= VW - 2 && h >= VH - 2 && x <= 2 && y <= 2 && reduce()) {
        const a = flashAlpha(this.fillStyle) * this.globalAlpha;
        if (a > 0.08) { const ga = this.globalAlpha; this.globalAlpha = ga * (0.08 / a); _fr.call(this, x, y, w, h); this.globalAlpha = ga; return; }
      }
      return _fr.call(this, x, y, w, h);
    };
  }

  // ---------------- SMOOTHNESS ----------------
  let ema = 16.7, lastNow = 0, lastRun = 0;
  const interpOn = () => smooth() === 'AUTO' && (ema < 13.5 || window.__forceInterp === true);
  const bodies = (pl) => { const a = [pl.p]; if (pl.p2) a.push(pl.p2); for (const k of ['ents', 'platforms', 'balls', 'bats']) if (Array.isArray(pl[k])) for (const o of pl[k]) a.push(o); return a; };

  // ---------------- MODERN particles ----------------
  function spawnFx(pl) {
    const p = pl.p; if (!p) return;
    const L = pl.mfx || (pl.mfx = []), calm = reduce(), cap = calm ? 40 : 170, R = Math.random;
    if (p.onGround && p._air && (p._vy || 0) > 2.4) for (let i = 0; i < (calm ? 3 : 7); i++) { const s = (i - 3) / 3; L.push({ k: 'puff', x: p.x + p.w / 2 + s * 5, y: p.y + p.h - 1, vx: s * 0.9, vy: -0.25 - R() * 0.3, r: 1.6 + R(), life: 22 + ((R() * 8) | 0), max: 30 }); }
    p._air = !p.onGround; p._vy = p.vy;
    if (p.onGround && Math.abs(p.vx) > 1.7 && frame % 5 === 0) L.push({ k: 'puff', x: p.x + p.w / 2 - Math.sign(p.vx) * 4, y: p.y + p.h - 1, vx: -p.vx * 0.15, vy: -0.2, r: 1.2, life: 16, max: 16 });
    if (p.onGround && p.vx * p.face < -0.6 && frame % 3 === 0) L.push({ k: 'puff', x: p.x + p.w / 2 + p.face * 3, y: p.y + p.h - 1, vx: p.vx * 0.3, vy: -0.35, r: 1.4, life: 14, max: 14 });
    if (!calm && pl.cam) {
      const tx0 = Math.floor(pl.cam.x / TS);
      for (let n = 0; n < 5; n++) {
        const tx = tx0 + ((R() * 17) | 0), ty = (R() * 14) | 0, c = pl.tile(tx, ty);
        if (c === 'o' && R() < 0.35) L.push({ k: 'spark', x: tx * TS + 4 + R() * 8, y: ty * TS + 2 + R() * 12, life: 18, max: 18 });
        else if (c === 'L' && pl.tile(tx, ty - 1) !== 'L') L.push({ k: 'ember', x: tx * TS + R() * 16, y: ty * TS + 2, vx: (R() - 0.5) * 0.3, vy: -0.4 - R() * 0.6, life: 50 + ((R() * 50) | 0), max: 100 });
      }
      if (pl.def.water && frame % 7 === 0) L.push({ k: 'bubble', x: pl.cam.x + R() * VW, y: VH - 4, vy: -0.5 - R() * 0.4, r: 0.8 + R() * 1.4, life: 220, max: 220, ph: R() * 6 });
    }
    for (const q of L) {
      q.life--; q.x += q.vx || 0; q.y += q.vy || 0;
      if (q.k === 'puff') { q.vx *= 0.9; q.r += 0.08; } else if (q.k === 'ember') q.vx += Math.sin((q.life + q.x) * 0.1) * 0.02; else if (q.k === 'bubble') q.x += Math.sin(q.life * 0.08 + q.ph) * 0.3;
    }
    pl.mfx = L.filter((q) => q.life > 0 && q.y > -10); if (pl.mfx.length > cap) pl.mfx.splice(0, pl.mfx.length - cap);
  }
  function drawFx(pl, cx) {
    if (!pl.mfx) return;
    for (const q of pl.mfx) {
      const x = q.x - cx, y = q.y, a = Math.max(0, q.life / q.max);
      if (x < -10 || x > VW + 10) continue;
      if (q.k === 'puff') { ctx.fillStyle = `rgba(236,228,214,${(0.55 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, q.r, 0, Math.PI * 2); ctx.fill(); }
      else if (q.k === 'spark') { const s = Math.sin(a * Math.PI) * 2.6; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,248,200,${a.toFixed(3)})`; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke(); ctx.restore(); }
      else if (q.k === 'ember') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,120,30,${(0.25 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgba(255,210,120,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      else if (q.k === 'bubble') { ctx.strokeStyle = `rgba(220,245,255,${(0.75 * Math.min(1, a * 3)).toFixed(3)})`; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(x, y, q.r, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  { // the game's own dust puffs become soft clouds in modern mode
    const _dp = Play.prototype.drawPart;
    Play.prototype.drawPart = function (q, cx) {
      if (M() && q.k === 'dust') { const a = Math.max(0, Math.min(1, q.life / 18)); ctx.fillStyle = `rgba(236,228,214,${(0.6 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(q.x - cx + 1, q.y + 1, 1.4 + (1 - a) * 1.6, 0, Math.PI * 2); ctx.fill(); return; }
      return _dp.call(this, q, cx);
    };
  }

  // ---------------- MODERN lighting ----------------
  const DIM = new Set(['cave', 'castle', 'haunted', 'crystal']);
  function drawLight(pl, cx) {
    const th = pl.def.theme, p = pl.p;
    if (DIM.has(th) && !pl.def.dark && !pl.def.lantern && !pl.def.dark2 && p) { // torch-lit: darker away from the hero, warm light close by
      const px = p.x + p.w / 2 - cx, py = p.y + p.h / 2, fl = reduce() ? 1 : 1 + Math.sin(frame * 0.23) * 0.03 + Math.sin(frame * 0.57) * 0.02;
      const g = ctx.createRadialGradient(px, py, 40 * fl, px, py, 175); g.addColorStop(0, 'rgba(8,4,20,0)'); g.addColorStop(1, 'rgba(8,4,20,0.42)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const w = ctx.createRadialGradient(px, py, 0, px, py, 60 * fl); w.addColorStop(0, 'rgba(255,170,80,0.13)'); w.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = w; ctx.fillRect(px - 62, py - 62, 124, 124); ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const tx0 = Math.floor(cx / TS);
    for (let tx = tx0; tx <= tx0 + 16; tx++) for (let ty = 0; ty < 14; ty++) {
      if (pl.tile(tx, ty) !== 'L' || pl.tile(tx, ty - 1) === 'L') continue;
      const gx = tx * TS + 8 - cx, gy = ty * TS + 2, f = reduce() ? 0.9 : 0.8 + 0.2 * Math.sin(frame * 0.11 + tx * 1.7);
      const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, 30); g.addColorStop(0, `rgba(255,120,30,${(0.32 * f).toFixed(3)})`); g.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 30, gy - 30, 60, 60);
    }
    ctx.restore();
  }
  { // power-ups glow
    const ITEMS = new Set(['drink', 'phone', 'badge', 'magnet', 'shrink', 'shield', 'shroom', 'ammo', 'battery', 'boots', 'orb', 'medal']);
    const _de = Play.prototype.drawEnt;
    Play.prototype.drawEnt = function (e, cx) {
      if (M() && ITEMS.has(e.type) && !(e.rise > 0) && e.alive !== false) {
        const x = e.x + (e.w || 12) / 2 - cx, y = e.y + (e.h || 12) / 2, k = reduce() ? 1 : 0.85 + 0.15 * Math.sin(frame * 0.08 + e.x);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 1, x, y, 13 * k); g.addColorStop(0, 'rgba(255,244,190,0.32)'); g.addColorStop(1, 'rgba(255,244,190,0)'); ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28); ctx.restore();
      }
      return _de.call(this, e, cx);
    };
  }
  if (typeof drawCastleLayer === 'function') { // Dracula's castle windows glow
    const _cl = drawCastleLayer;
    drawCastleLayer = function (cx, k, t) { // eslint-disable-line no-func-assign
      _cl(cx, k, t);
      if (!M()) return;
      const X = Math.round(430 - cx * 0.15), Y = 52; if (X < -200 || X > VW + 40) return;
      ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'lighter';
      for (const [wx, wy] of [[60, 30], [70, 30], [10, 55], [114, 50], [40, 70], [90, 66], [62, 60], [30, 100], [96, 98]]) { if (((t >> 5) + wx) % 7 === 0) continue; const gx = X + wx + 2, gy = Y + wy + 3, g = ctx.createRadialGradient(gx, gy, 0.5, gx, gy, 9); g.addColorStop(0, 'rgba(255,216,96,0.5)'); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 9, gy - 9, 18, 18); }
      ctx.restore();
    };
  }

  // ---------------- MODERN HUD ----------------
  {
    const _hud = Play.prototype.drawHUD;
    Play.prototype.drawHUD = function () {
      if (!M()) return _hud.apply(this, arguments);
      const cx = this._fxcx !== undefined ? this._fxcx : Math.round(this.cam.x);
      try { drawLight(this, cx); drawFx(this, cx); } catch (e) { /* effects never stop the game */ }
      ctx.save(); rr(3, 2.5, 250, 22, 6); ctx.fillStyle = 'rgba(16,20,56,0.42)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.clip(); const sh = ctx.createLinearGradient(0, 2, 0, 12); sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; ctx.fillRect(3, 2, 250, 10); ctx.restore();
      const p = this.p, me = this;
      if (me._hh !== p.hearts) { if (me._hh !== undefined) me._hpopF = frame + 14; me._hh = p.hearts; }
      if (me._hc !== game.coins) { if (me._hc !== undefined) me._cpopF = frame + 12; me._hc = game.coins; }
      const hp = Math.max(0, (me._hpopF || 0) - frame), cp = Math.max(0, (me._cpopF || 0) - frame), d0 = ctx.drawImage, calm = reduce();
      ctx.drawImage = function (img, ...a) {
        let k = 1;
        if (img === Sprites.heart) { const i = Math.round((a[0] - 65) / 9); k = 1 + (hp ? Math.sin((hp / 14) * Math.PI) * 0.45 : 0) + (!calm && p.hearts === 1 && i === 0 ? Math.max(0, Math.sin(frame * 0.2)) * 0.18 : 0); }
        else if (img === Sprites.coinIcon && cp) k = 1 + Math.sin((cp / 12) * Math.PI) * 0.5;
        if (k !== 1 && a.length === 2) { const cx2 = a[0] + img.width / 2, cy2 = a[1] + img.height / 2; ctx.save(); ctx.translate(cx2, cy2); ctx.scale(k, k); ctx.translate(-cx2, -cy2); d0.call(ctx, img, a[0], a[1]); ctx.restore(); return; }
        return d0.call(ctx, img, ...a);
      };
      try { return _hud.apply(this, arguments); } finally { ctx.drawImage = d0; }
    };
  }
  { // glass menu windows
    const _dw = drawWindow;
    drawWindow = function (x, y, w, h) { // eslint-disable-line no-func-assign
      if (!M()) return _dw(x, y, w, h);
      ctx.save();
      rr(x + 1.5, y + 2.5, w, h, 7); ctx.fillStyle = 'rgba(0,0,10,0.35)'; ctx.fill();
      rr(x, y, w, h, 7); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(40,52,120,0.93)'); g.addColorStop(1, 'rgba(14,18,56,0.93)'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(200,215,255,0.85)'; ctx.lineWidth = 1; ctx.stroke();
      rr(x + 2.5, y + 2.5, w - 5, h - 5, 5); ctx.strokeStyle = 'rgba(120,140,220,0.35)'; ctx.lineWidth = 0.6; ctx.stroke();
      rr(x, y, w, h, 7); ctx.clip(); const s = ctx.createLinearGradient(0, y, 0, y + 16); s.addColorStop(0, 'rgba(255,255,255,0.15)'); s.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = s; ctx.fillRect(x, y, w, 16);
      ctx.restore();
    };
  }
  // sliding screen transition (a cross-fade with REDUCE MOTION)
  Modern.drawFade = function (f, dir) {
    if (reduce()) { ctx.fillStyle = `rgba(4,6,20,${f.toFixed(3)})`; ctx.fillRect(0, 0, VW, VH); return; }
    const e = f * f * (3 - 2 * f), W = VW + 60;
    let x0, x1; if (dir === 1) { x0 = VW - e * W; x1 = VW; } else { x0 = 0; x1 = e * W; }
    ctx.save();
    const solidL = dir === 1 ? x0 + 60 : x0, solidR = dir === 1 ? x1 : x1 - 60;
    if (solidR > solidL) { ctx.fillStyle = '#0a0e2a'; ctx.fillRect(solidL, 0, solidR - solidL, VH); }
    const ex = dir === 1 ? x0 : x1 - 60, g = ctx.createLinearGradient(ex, 0, ex + 60, 0);
    g.addColorStop(dir === 1 ? 0 : 1, 'rgba(10,14,42,0)'); g.addColorStop(dir === 1 ? 1 : 0, 'rgba(10,14,42,1)'); ctx.fillStyle = g; ctx.fillRect(ex, 0, 60, VH);
    const lx = dir === 1 ? x0 + 60 : x1 - 60; ctx.fillStyle = 'rgba(120,160,255,0.55)'; ctx.fillRect(lx - 0.5, 0, 1, VH);
    ctx.restore();
  };

  // ---------------- Play hooks: interpolation, particles ----------------
  {
    const _up = Play.prototype.update;
    Play.prototype.update = function () {
      if (interpOn()) { for (const o of bodies(this)) if (o) { o._ix = o.x; o._iy = o.y; } if (this.cam) this.cam._ix = this.cam.x; }
      const r = _up.apply(this, arguments);
      if (M() && !this.paused) try { spawnFx(this); } catch (e) { /* effects never stop the game */ }
      return r;
    };
    const _dr = Play.prototype.draw;
    Play.prototype.draw = function () {
      const saved = [];
      if (interpOn() && !this.paused) {
        const al = clamp(acc / (1000 / 60), 0, 1);
        const lerp = (o, k, ik) => { if (o[ik] === undefined) return; const v = o[k], d = v - o[ik]; if (!(Math.abs(d) > 0.001) || Math.abs(d) > 40) return; saved.push([o, k, v]); o[k] = o[ik] + d * al; };
        if (al < 0.999) { for (const o of bodies(this)) if (o) { lerp(o, 'x', '_ix'); lerp(o, 'y', '_iy'); } if (this.cam) lerp(this.cam, 'x', '_ix'); }
      }
      this._fxcx = Math.round(this.cam.x);
      try { return _dr.apply(this, arguments); } finally { for (let i = saved.length - 1; i >= 0; i--) saved[i][0][saved[i][1]] = saved[i][2]; }
    };
  }

  // ---------------- adaptive music ----------------
  let lastFx = '';
  function musicHook() {
    let o = {};
    if (Opt19.get('music', '1') === '1' && isPlay() && scene.p && scene.def) {
      const pl = scene, p = pl.p; let I = 0;
      if (pl.bossLock || pl.arena) I = 1;
      else if (pl.def.boss && pl.lv) { const d = (pl.lv.w - 16) * TS - p.x; I = clamp(1 - d / (48 * TS), 0, 1) * 0.9; }
      for (const e of pl.ents) if ((e.boss || e.yeti || e.type === 'dracula') && e.alive !== false && !e.dying && Math.abs(e.x - p.x) < 220) I = Math.max(I, 0.75);
      o = { muffle: pl.def.water ? 1 : pl.focusT > 0 ? 0.55 : 0, intensity: I, drums: !!(pl.ta || pl.rush) }; // (Update 2.1: FOCUS muffles the music too)
    }
    const key = `${o.muffle | 0}|${(o.intensity || 0).toFixed(1)}|${o.drums ? 1 : 0}`;
    if (key !== lastFx) { lastFx = key; if (Audio8.setMusicFx) Audio8.setMusicFx(o); }
  }

  // ---------------- gestures ----------------
  Input.gestureOK = () => isPlay() && scene.state === 'play' && !scene.paused;
  Input.onGesture = (g) => {
    if (g !== 'dash' || !Input.gestureOK()) return;
    const pl = scene, U = (game && game.upgrades) || {};
    if (!U.dash) { if (!pl._dashTip) { pl._dashTip = 1; pl.parts.push({ k: 'text', s: 'BUY DASH IN THE SHOP', x: pl.p.x - 44, y: pl.p.y - 16, vy: -0.4, life: 80 }); } return; }
    const k = pl.p.face < 0 ? 'left' : 'right'; Input.pulse([[k, 2], [null, 2], [k, 3]]);
  };

  // ---------------- analogue stick picture ----------------
  const base = document.createElement('div'), knob = document.createElement('div');
  base.id = 'stickBase'; knob.id = 'stickKnob'; base.appendChild(knob); document.body.appendChild(base);
  function stickView() {
    const on = Opt19.get('stick', 'DPAD') === 'ANALOGUE' && document.body.classList.contains('touch');
    document.body.classList.toggle('analog', on); if (!on) return;
    const g = document.querySelector('#pad .dpad'), up = g && g.querySelector('[data-k="up"]'), dn = g && g.querySelector('[data-k="down"]'); if (!up || !dn) return;
    const a = up.getBoundingClientRect(), b = dn.getBoundingClientRect(), size = b.width, R = size * 1.25, info = Input.stickInfo();
    const cx = info ? info.ax : (b.left + b.right) / 2, cy = info ? info.ay : (a.bottom + b.top) / 2;
    base.style.width = base.style.height = `${R * 2}px`; base.style.left = `${cx - R}px`; base.style.top = `${cy - R}px`;
    const kx = info ? clamp(info.dx, -1, 1) * R : 0, ky = info ? clamp(info.dy, -1, 1) * R : 0;
    knob.style.transform = `translate(${kx}px, ${ky}px)`; base.classList.toggle('on', !!info);
  }

  // ---------------- per-button touch layout ----------------
  const BtnLayout = (() => {
    const KEY = () => (innerWidth > innerHeight ? 'wallyman-touch-btn-land' : 'wallyman-touch-btn');
    const load = () => lsJ(KEY(), {});
    function apply() { const d = load(); document.querySelectorAll('#pad [data-k]').forEach((el) => { const c = d[el.dataset.k]; el.style.transform = c ? `translate(${c.x || 0}px, ${c.y || 0}px) scale(${c.s || 1})` : ''; if (c && c.o !== undefined) el.style.setProperty('--o', c.o); else el.style.removeProperty('--o'); }); }
    apply(); addEventListener('resize', apply);
    return { load, apply, save: (d) => { lsS(KEY(), d); apply(); } };
  })();
  TouchLayoutScene = function () { // eslint-disable-line no-func-assign
    const hadTouch = document.body.classList.contains('touch'), gd = TouchLayout.load(), bd = BtnLayout.load();
    let mode = 'groups', selG = 0, selB = 'jump', drag = null, done = false;
    document.body.classList.add('touch'); if (typeof resize === 'function') resize();
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:60;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:8px;background:rgba(8,10,40,0.9);font:bold 13px monospace;color:#fff';
    const mk = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'font:bold 13px monospace;padding:8px 10px;border-radius:6px;border:2px solid #fff;background:#2f62d0;color:#fff'; b.onclick = (e) => { e.stopPropagation(); fn(); }; bar.appendChild(b); return b; };
    const info = document.createElement('div'); info.style.cssText = 'width:100%;text-align:center;color:#ffe040'; bar.appendChild(info);
    const cur = () => (mode === 'groups' ? (gd[selG] = gd[selG] || { x: 0, y: 0, s: 1 }) : (bd[selB] = bd[selB] || { x: 0, y: 0, s: 1 }));
    const save = () => { TouchLayout.save(gd); BtnLayout.save(bd); };
    const modeBtn = mk('EDIT: GROUPS', () => { mode = mode === 'groups' ? 'buttons' : 'groups'; show(); });
    mk('SMALLER', () => { const c = cur(); c.s = Math.max(0.6, Math.round(((c.s || 1) - 0.1) * 10) / 10); save(); });
    mk('BIGGER', () => { const c = cur(); c.s = Math.min(1.8, Math.round(((c.s || 1) + 0.1) * 10) / 10); save(); });
    const faint = mk('FAINTER', () => { const c = cur(); c.o = Math.max(0.1, Math.round(((c.o !== undefined ? c.o : 0.3) - 0.1) * 10) / 10); save(); show(); });
    const bold = mk('BOLDER', () => { const c = cur(); c.o = Math.min(0.9, Math.round(((c.o !== undefined ? c.o : 0.3) + 0.1) * 10) / 10); save(); show(); });
    mk('RESET', () => { for (const k of Object.keys(gd)) delete gd[k]; for (const k of Object.keys(bd)) delete bd[k]; save(); });
    mk('DONE', () => { done = true; });
    document.body.appendChild(bar);
    const gs = TouchLayout.groups(), btns = [...document.querySelectorAll('#pad [data-k]')];
    function show() {
      modeBtn.textContent = mode === 'groups' ? 'EDIT: GROUPS' : 'EDIT: BUTTONS';
      faint.style.display = bold.style.display = mode === 'buttons' ? '' : 'none';
      const c = mode === 'buttons' ? bd[selB] : null;
      info.textContent = mode === 'groups' ? 'Drag a button group to move it' : `Tap a button, then drag it (see-through: ${Math.round((1 - (c && c.o !== undefined ? c.o : 0.3)) * 100)}%)`;
      gs.forEach((g, k) => { g.style.outline = mode === 'groups' && k === selG ? '2px dashed #ffe040' : ''; });
      btns.forEach((b) => { b.style.outline = mode === 'buttons' && b.dataset.k === selB ? '2px dashed #ffe040' : ''; });
    }
    const down = (e) => {
      if (mode === 'groups') { const i = gs.indexOf(e.currentTarget); selG = i; const c = cur(); drag = { sx: e.clientX, sy: e.clientY, ox: c.x || 0, oy: c.y || 0 }; }
      else { const b = e.target.closest && e.target.closest('[data-k]'); if (!b) return; selB = b.dataset.k; const c = cur(); drag = { sx: e.clientX, sy: e.clientY, ox: c.x || 0, oy: c.y || 0 }; }
      show(); e.preventDefault(); e.stopPropagation();
    };
    const move = (e) => { if (!drag) return; const c = cur(); c.x = Math.round(drag.ox + e.clientX - drag.sx); c.y = Math.round(drag.oy + e.clientY - drag.sy); save(); e.preventDefault(); };
    const up = () => { drag = null; };
    gs.forEach((g) => g.addEventListener('pointerdown', down, true)); addEventListener('pointermove', move); addEventListener('pointerup', up);
    show();
    const finish = () => { bar.remove(); gs.forEach((g) => { g.removeEventListener('pointerdown', down, true); g.style.outline = ''; }); btns.forEach((b) => { b.style.outline = ''; }); removeEventListener('pointermove', move); removeEventListener('pointerup', up); if (!hadTouch) document.body.classList.remove('touch'); if (typeof resize === 'function') resize(); go(() => OptionsScene()); };
    return {
      enter() { Audio8.play('menu'); },
      update() { if (done || Input.pressed('back')) { done = false; finish(); } },
      draw() {
        ctx.fillStyle = '#101848'; ctx.fillRect(0, 0, VW, VH);
        txt('TOUCH LAYOUT', 128, 70, '#ffe040', { scale: 2, align: 'center' });
        ['MOVE WHOLE GROUPS, OR SWITCH', 'TO BUTTONS TO MOVE, RESIZE AND', 'FADE EACH BUTTON ON ITS OWN.', '', 'PRESS DONE WHEN YOU ARE HAPPY.'].forEach((l, k) => txt(l, 128, 100 + k * 11, '#fff', { align: 'center' }));
      },
      _state: () => ({ mode, selG, selB, gd, bd }), _set: (m, b) => { mode = m; if (b) selB = b; show(); },
    };
  };

  // ---------------- the frame loop ----------------
  const _ls = loopStep;
  loopStep = function (now) { // eslint-disable-line no-func-assign
    const dt = now - lastNow; lastNow = now; if (dt > 2 && dt < 100) ema += (dt - ema) * 0.05;
    const mode = smooth();
    if (mode === 'BATTERY') { if (now - lastRun < 30) return; lastRun = now; }
    if (Modern.cap) Modern.cap(mode === 'BATTERY' ? 2 : 3);
    _ls(now);
    try { musicHook(); stickView(); } catch (e) { /* never stop the game */ }
  };

  return { reduce, smooth, interpOn, refresh: () => Math.round(1000 / ema), BtnLayout, drawLight, spawnFx };
})();

UPDATES.unshift(['1.9', [
  'MODERN MODE:', ' NEW ART: GOTHCHICK, DOUG, ROBO,', ' DRACULA, BOSSES, COINS, POWER-UPS', ' DUST, SPARKLES, EMBERS, BUBBLES', ' GLOWING LAVA, TORCH-LIT CAVES', ' CAMERA LOOKS AHEAD AS YOU RUN', ' GLASS MENUS, LIVELY HUD',
  'MUSIC REACTS: BOSSES, WATER, RUNS', 'SMOOTHNESS: 120HZ OR BATTERY SAVER', 'REDUCE MOTION OPTION',
  'TOUCH: ANALOGUE STICK, GESTURES,', ' BUTTON BUZZ, MOVE EACH BUTTON',
]]);
