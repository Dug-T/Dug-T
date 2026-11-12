'use strict';
// =====================================================================
// Update 1.7: MODERN graphics and sound, chosen in Options (the retro
// look and sound stay the default).
// Modern graphics draw the screen at the display's real resolution, run
// every sprite, tile and background through a smoothing pixel-art
// upscaler (EPX, twice for small sprites), switch to a modern typeface,
// and add soft shadows, sky haze, sunlight and a gentle vignette.
// =====================================================================
const Modern = (() => {
  let on = false; try { on = localStorage.getItem('wallyman-graphics') === 'modern'; } catch (e) { /* ignore */ }
  let S = 1;
  const proto = CanvasRenderingContext2D.prototype, rawDraw = proto.drawImage;
  // note when an off-screen canvas is drawn on, so its smoothed copy can be refreshed
  for (const m of ['fillRect', 'clearRect', 'strokeRect', 'drawImage', 'putImageData', 'fill', 'stroke', 'fillText', 'strokeText']) {
    const f = proto[m];
    proto[m] = function (...a) { if (this !== ctx && this.canvas) this.canvas._mv = (this.canvas._mv || 0) + 1; return f.apply(this, a); };
  }
  // EPX / Scale2x: doubles a sprite, rounding off its stair-step edges
  function epx(src, w, h) {
    const out = new Uint32Array(w * h * 4), W2 = w * 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const P = src[y * w + x], A = y > 0 ? src[(y - 1) * w + x] : P, B = x < w - 1 ? src[y * w + x + 1] : P, C = x > 0 ? src[y * w + x - 1] : P, D = y < h - 1 ? src[(y + 1) * w + x] : P;
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A; if (A === B && A !== C && B !== D) p2 = B; if (D === C && D !== B && C !== A) p3 = C; if (B === D && B !== A && D !== C) p4 = D;
      const o = y * 2 * W2 + x * 2; out[o] = p1; out[o + 1] = p2; out[o + W2] = p3; out[o + W2 + 1] = p4;
    }
    return out;
  }
  const cache = new WeakMap(), painters = new WeakMap(); // painters: hand-made high-resolution versions of a sprite
  function upscale(img, k) {
    let w = img.width, h = img.height, px = new Uint32Array(img.getContext('2d').getImageData(0, 0, w, h).data.buffer);
    for (let s = 1; s < k; s *= 2) { px = epx(px, w, h); w *= 2; h *= 2; }
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px.buffer), w, h), 0, 0); return c;
  }
  function hd(img) {
    if (!(img instanceof HTMLCanvasElement) || img === cv) return null;
    const w = img.width, h = img.height; if (!w || !h || w * h > 260000) return null;
    let e = cache.get(img);
    if (e && e.dyn) return null;
    if (e && e.v === img._mv && e.w === w && e.h === h) return e;
    const changes = e ? (e.changes || 0) + 1 : 0;
    const pf = painters.get(img);
    if (pf) { const c = document.createElement('canvas'); c.width = w * 4; c.height = h * 4; const x = c.getContext('2d'); x.scale(4, 4); try { pf(x, w, h); } catch (err) { console.warn(err); } e = { c, k: 4, v: img._mv, w, h, changes: 0 }; cache.set(img, e); return e; }
    if (changes > 3) { cache.set(img, { dyn: true }); return null; } // a canvas redrawn all the time: draw it as it is
    const k = w * h <= 9000 ? 4 : 2;
    try { e = { c: upscale(img, k), k, v: img._mv, w, h, changes }; } catch (err) { e = { dyn: true }; }
    cache.set(img, e); return e.dyn ? null : e;
  }
  const mainDraw = function (img, ...a) {
    if (!on) return rawDraw.call(ctx, img, ...a);
    if (img === cv) { if (a.length === 8) return rawDraw.call(ctx, img, a[0] * S, a[1] * S, a[2] * S, a[3] * S, a[4], a[5], a[6], a[7]); if (a.length === 2) return rawDraw.call(ctx, img, a[0], a[1], VW, VH); return rawDraw.call(ctx, img, ...a); }
    const e = hd(img); if (!e) return rawDraw.call(ctx, img, ...a);
    if (a.length === 2) return rawDraw.call(ctx, e.c, a[0], a[1], img.width, img.height);
    if (a.length === 4) return rawDraw.call(ctx, e.c, a[0], a[1], a[2], a[3]);
    if (a.length === 8) return rawDraw.call(ctx, e.c, a[0] * e.k, a[1] * e.k, a[2] * e.k, a[3] * e.k, a[4], a[5], a[6], a[7]);
    return rawDraw.call(ctx, img, ...a);
  };
  ctx.drawImage = mainDraw;
  // resolution: up to 3x the game's pixels, and it steps down to 2x by itself if frames start taking too long
  let maxS = 3, lastT = 0, slowN = 0;
  const wantS = () => { const r = cv.getBoundingClientRect(), css = r.width || VW * 2; return clamp(Math.round((css / VW) * (window.devicePixelRatio || 1)), 2, maxS); };
  function frameStart() {
    if (!on) return;
    const now = performance.now(), dt = now - lastT; lastT = now;
    if (dt > 26 && dt < 250) { if (++slowN > 90 && maxS > 2) { maxS--; slowN = 0; } } else if (slowN > 0) slowN--;
    const s = wantS(); if (s !== S || cv.width !== VW * s) { S = s; cv.width = VW * S; cv.height = VH * S; }
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  }
  function frameEnd() {
    if (!on) return;
    const g = ctx.createRadialGradient(128, 112, 90, 128, 112, 190); g.addColorStop(0, 'rgba(0,0,20,0)'); g.addColorStop(1, 'rgba(0,0,20,0.32)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function set(v) {
    on = !!v; try { localStorage.setItem('wallyman-graphics', on ? 'modern' : 'retro'); } catch (e) { /* ignore */ }
    if (!on) { S = 1; cv.width = VW; cv.height = VH; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; }
  }
  const paint = (img, fn) => { if (img) { painters.set(img, fn); cache.delete(img); } };
  return { on: () => on, set, frameStart, frameEnd, scale: () => S, paint, painted: (img) => painters.has(img), _hd: (img) => { const e = hd(img); return e && e.c; } };
})();
{ // every frame: draw in high resolution, then add the finishing touches
  const _ls = loopStep;
  loopStep = function (now) { Modern.frameStart(); _ls(now); Modern.frameEnd(); }; // eslint-disable-line no-func-assign
}
{ // a modern typeface (the pixel font's little symbols map to real ones)
  const _fd = Font.draw, SYM = { '*': '×', '@': '©', '#': '★', '$': '♥' };
  Font.draw = function (c, str, x, y, o = {}) {
    if (!Modern.on() || c !== ctx) return _fd(c, str, x, y, o);
    str = String(str).toUpperCase().replace(/[*@#$]/g, (k) => SYM[k]);
    const sc = o.scale || 1, size = 8.8 * sc;
    c.save(); c.font = `bold ${size}px "Trebuchet MS", "Segoe UI", Verdana, Arial, sans-serif`; c.textBaseline = 'top';
    const w = c.measureText(str).width; let dx = x; if (o.align === 'center') dx = x - w / 2; else if (o.align === 'right') dx = x - w;
    const dy = y - 0.5 * sc;
    if (o.shadow) { c.fillStyle = o.shadow; c.globalAlpha = 0.85; c.fillText(str, dx + (o.sd || 1) * 0.8, dy + (o.sd || 1) * 0.8); c.globalAlpha = 1; }
    if (o.outline) { c.lineWidth = 1.6 * (o.ot || 1) * Math.max(1, sc * 0.7); c.lineJoin = 'round'; c.strokeStyle = o.outline; c.strokeText(str, dx, dy); }
    const col = o.color || '#fff';
    if (Array.isArray(col)) { const g = c.createLinearGradient(0, dy, 0, dy + size); col.forEach((k, i) => g.addColorStop(i / Math.max(1, col.length - 1), k)); c.fillStyle = g; } else c.fillStyle = col;
    c.fillText(str, dx, dy); c.restore();
    return Math.ceil(w);
  };
}
{ // sky haze and sunlight over the backgrounds
  const SUNNY = ['grass', 'beach', 'sky', 'candy', 'carnival', 'desert', 'airship', 'jungle'];
  const _dp = drawParallax;
  drawParallax = function (theme, x, ...a) { // eslint-disable-line no-func-assign
    const r = _dp(theme, x, ...a);
    if (!Modern.on()) return r;
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, 'rgba(20,30,110,0.16)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,250,240,0.14)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    if (SUNNY.includes(theme)) { const s = ctx.createRadialGradient(214, 18, 4, 214, 18, 120); s.addColorStop(0, 'rgba(255,248,210,0.5)'); s.addColorStop(1, 'rgba(255,248,210,0)'); ctx.fillStyle = s; ctx.fillRect(0, 0, VW, VH); }
    return r;
  };
}
{ // soft shadows under the heroes and their foes
  const shadow = (pl, cx, px, bottom, w) => {
    const gy = groundRow(pl, Math.floor(px / TS)); if (gy < 0) return;
    const d = gy * TS - bottom; if (d < -2 || d > 140) return;
    const k = 1 - d / 150; ctx.fillStyle = `rgba(10,10,30,${0.32 * k})`; ctx.beginPath(); ctx.ellipse(px - cx, gy * TS - 0.5, Math.max(2, w * 0.6 * k), 2.2 * k, 0, 0, Math.PI * 2); ctx.fill();
  };
  const _dpl = Play.prototype.drawPlayer;
  Play.prototype.drawPlayer = function (cx) {
    if (Modern.on() && this.state !== 'dying' && !this.def.water && !this.def.shmup) { const p = this.p; shadow(this, cx, p.x + p.w / 2, p.y + p.h, p.riding ? 22 : 13); if (this.p2 && !this.p2.down && !this.p2.out) shadow(this, cx, this.p2.x + this.p2.w / 2, this.p2.y + this.p2.h, 13); }
    return _dpl.call(this, cx);
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    if (Modern.on() && e.enemy && !e.dying && e.alive && e.h <= 64 && !this.def.water && e.type !== 'bolt' && e.type !== 'tornado' && e.x > cx - 40 && e.x < cx + VW + 40) shadow(this, cx, e.x + e.w / 2, e.y + e.h, Math.min(40, e.w + 4));
    return _de.call(this, e, cx);
  };
}

// ---------------- the title screen: press B to switch between RETRO and MODERN ----------------
{
  const _T = TitleScene;
  TitleScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _T(...a), u = s.update, d = s.draw; let flash = 0, t = 0;
    const atStart = () => !s.stage || s.stage() === 'press';
    s.update = function () {
      t++; if (flash) flash--;
      if (atStart() && Input.pressed('run')) {
        const m = !Modern.on(); Modern.set(m); Audio8.setStyle(m ? 'modern' : 'retro'); Audio8.unlock(); Audio8.sfx(m ? 'oneup' : 'coin'); flash = 100; return;
      }
      return u.call(this);
    };
    s.draw = function () {
      d.call(this);
      if (!atStart()) return;
      const m = Modern.on(), name = m ? 'MODERN' : 'RETRO';
      hR(58, 108, 140, 14, 'rgba(16,24,72,0.8)'); txt('STYLE: ' + name, 98, 111, m ? '#5ff0ff' : '#ffe040', { align: 'center' }); txt('B: CHANGE', 170, 111, '#a8b0d8', { align: 'center' });
      if (flash) { const k = Math.min(1, flash / 20), w = 160; ctx.save(); ctx.globalAlpha = k; hR(128 - w / 2, 60, w, 40, m ? 'rgba(10,60,90,0.9)' : 'rgba(90,40,10,0.9)'); txt(m ? 'RETRO > MODERN' : 'MODERN > RETRO', 128, 66, '#fff', { align: 'center' }); txt(name + '!', 128, 79, m ? '#5ff0ff' : '#ffe040', { align: 'center', scale: 2, outline: '#101848' }); ctx.restore(); }
    };
    return s;
  };
}
if (typeof scene !== 'undefined' && scene && scene.isTitle) { scene = TitleScene(); if (scene.enter) scene.enter(); }

// ---------------- What's New ----------------
UPDATES.unshift(['1.7', ['NEW: MODERN GRAPHICS (OPTIONS)', 'HIGH RESOLUTION, SMOOTH SPRITES', 'A MODERN FONT, SHADOWS AND LIGHT', 'NEW: MODERN SOUND STYLE (OPTIONS)', 'RICHER INSTRUMENTS AND REVERB', 'RETRO STAYS THE DEFAULT', 'PRESS B ON THE TITLE TO SWITCH']]);
