'use strict';
// =====================================================================
// Update 2.0 (part 2), MODERN mode:
//  - painted backgrounds: every world's background layers are re-painted
//    with soft brush edges, light from above, depth haze (far layers
//    fade into the sky and blur more) and a canvas grain; skies are
//    re-painted as smooth gradients
//  - living scenery: grass that sways (and parts around your feet),
//    leaves drifting in green worlds, light rippling underwater, and a
//    pennant flapping on top of the Signal Tower
//  - the island map: a painted island with surf along the shore, a
//    shimmering sea, drifting clouds and their shadows, and cleared
//    levels glowing gold
// =====================================================================
(() => {
  const FILTER = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(1px)'; return c.filter === 'blur(1px)'; } catch (e) { return false; } })();
  const calm = () => typeof U19 !== 'undefined' && U19.reduce();
  const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), d = x.createImageData(64, 64); for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 145; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; })();
  const avg = (c, x0, y0, w, h) => { try { const d = c.getContext('2d').getImageData(x0, y0, w, h).data; let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 128) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } return n ? [r / n, g / n, b / n] : null; } catch (e) { return null; } };

  // ---------------- painted backgrounds ----------------
  function paintLayer(L, depth, sky) {
    const fn = (x, w, h) => {
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      if (FILTER) x.filter = `blur(${(0.5 + depth * 1.1).toFixed(2)}px)`;
      x.drawImage(L.c, 0, 0, w, h);
      if (FILTER) { x.filter = 'none'; x.globalAlpha = 0.55; x.drawImage(L.c, 0, 0, w, h); x.globalAlpha = 1; } // keep shapes readable over the soft wash
      x.globalCompositeOperation = 'source-atop';
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,250,235,0.12)'); g.addColorStop(0.6, 'rgba(255,250,235,0)'); g.addColorStop(1, 'rgba(20,10,40,0.14)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      if (sky && depth > 0.15) { x.fillStyle = `rgba(${sky.map(Math.round).join(',')},${(depth * 0.12).toFixed(3)})`; x.fillRect(0, 0, w, h); }
      x.globalAlpha = 0.06; x.globalCompositeOperation = 'overlay'; x.fillStyle = x.createPattern(grain, 'repeat'); x.fillRect(0, 0, w, h);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    };
    fn.k = 2; return fn;
  }
  function paintSky(sky) {
    const fn = (x, w, h) => {
      const top = avg(sky, 0, 0, sky.width, Math.max(1, sky.height * 0.08)), bot = avg(sky, 0, Math.floor(sky.height * 0.9), sky.width, Math.max(1, Math.floor(sky.height * 0.1))), mid = avg(sky, 0, Math.floor(sky.height * 0.45), sky.width, Math.max(1, Math.floor(sky.height * 0.1)));
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(sky, 0, 0, w, h);
      if (top && bot && mid) { const g = x.createLinearGradient(0, 0, 0, h), c = (a) => `rgb(${a.map(Math.round).join(',')})`; g.addColorStop(0, c(top)); g.addColorStop(0.5, c(mid)); g.addColorStop(1, c(bot)); x.globalAlpha = 0.85; x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalAlpha = 1; }
      x.globalAlpha = 0.035; x.globalCompositeOperation = 'overlay'; x.fillStyle = x.createPattern(grain, 'repeat'); x.fillRect(0, 0, w, h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    };
    fn.k = 2; return fn;
  }
  const painted = new WeakSet();
  function paintTheme(theme) {
    const bg = Sprites.bg && Sprites.bg[theme]; if (!bg || painted.has(bg)) return; painted.add(bg);
    const sky = bg.sky ? avg(bg.sky, 0, 0, bg.sky.width, bg.sky.height) : null;
    if (bg.sky) Modern.paint(bg.sky, paintSky(bg.sky));
    const n = bg.layers.length; bg.layers.forEach((L, i) => { if (L.c && L.c.width * L.c.height <= 260000) Modern.paint(L.c, paintLayer(L, n > 1 ? Math.max(0, 1 - i / (n - 1)) * Math.min(1, 1 - (L.f || 0)) : 0, sky)); });
  }
  { const _pp = drawParallax; drawParallax = function (theme, ...a) { if (Modern.on()) paintTheme(theme); return _pp(theme, ...a); }; } // eslint-disable-line no-func-assign

  // ---------------- living scenery ----------------
  const greenTop = {};
  const isGreen = (theme) => { if (greenTop[theme] !== undefined) return greenTop[theme]; const T = Sprites.tiles[theme]; const c = T && avg(T.top, 0, 0, 16, 4); return (greenTop[theme] = !!(c && c[1] > c[0] + 20 && c[1] > c[2] + 10)); };
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    const r = _dt.call(this, cx);
    if (!Modern.on() || !this.def || !isGreen(this.def.theme)) return r;
    const tx0 = Math.floor(cx / TS), p = this.p, still = calm(), T = Sprites.tiles[this.def.theme], col = avg(T.top, 0, 0, 16, 3) || [80, 200, 80];
    const light = `rgb(${col.map((v) => Math.min(255, v * 1.25 + 20) | 0).join(',')})`, dark = `rgb(${col.map((v) => v * 0.7 | 0).join(',')})`;
    ctx.lineCap = 'round'; ctx.lineWidth = 0.7;
    for (let tx = tx0; tx <= tx0 + 16; tx++) for (let ty = 1; ty < 14; ty++) {
      if (this.tile(tx, ty) !== '#' || this.tile(tx, ty - 1) !== '.') continue;
      for (let k = 0; k < 4; k++) {
        const bx = tx * TS + 2 + k * 4 + ((tx * 7 + k * 3) % 3) - cx, by = ty * TS + 1.5, hgt = 3 + ((tx + k) % 3);
        let sway = still ? 0 : Math.sin(frame * 0.05 + tx * 0.7 + k * 1.3) * 1.2;
        if (p) { const dx = bx + cx - (p.x + p.w / 2), dy = by - (p.y + p.h); if (Math.abs(dx) < 10 && Math.abs(dy) < 6) sway += (dx < 0 ? -1 : 1) * (10 - Math.abs(dx)) * 0.35; }
        ctx.strokeStyle = k % 2 ? light : dark; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sway * 0.4, by - hgt * 0.6, bx + sway, by - hgt); ctx.stroke();
      }
    }
    return r;
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    if (Modern.on() && this.def && !calm()) {
      const cx = this._fxcx !== undefined ? this._fxcx : Math.round(this.cam.x);
      if (this.def.water) { // light rippling down through the water
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) { const x0 = ((i * 53 - cx * 0.2 + frame * 0.15) % (VW + 80)) - 40; const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, 'rgba(200,240,255,0.10)'); g.addColorStop(1, 'rgba(200,240,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 10 + Math.sin(frame * 0.02 + i) * 4, 0); ctx.lineTo(x0 + 40 + Math.sin(frame * 0.017 + i) * 10, VH); ctx.lineTo(x0 + 22, VH); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      if (isGreen(this.def.theme) && !this.def.water) { // drifting leaves
        const L = this.leaves || (this.leaves = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * VW, y: Math.random() * VH, s: 0.3 + Math.random() * 0.4, ph: i })));
        for (const l of L) { l.x -= l.s * 0.6; l.y += l.s * 0.45; if (l.y > VH + 4 || l.x < -6) { l.x = VW + Math.random() * 40; l.y = -4 - Math.random() * 60; } const a = Math.sin(frame * 0.05 + l.ph) * 0.9; ctx.save(); ctx.translate(l.x, l.y + Math.sin(frame * 0.04 + l.ph) * 3); ctx.rotate(a); ctx.fillStyle = l.ph % 2 ? '#7ac850' : '#d8a040'; ctx.beginPath(); ctx.ellipse(0, 0, 1.8, 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      }
    }
    return _hud.apply(this, arguments);
  };
  const _tw = Play.prototype.drawTower;
  Play.prototype.drawTower = function (x, y) {
    const r = _tw.call(this, x, y);
    if (!Modern.on()) return r;
    const still = calm(), x0 = x + 9, y0 = y - 3; // a pennant flapping from the aerial
    ctx.beginPath(); ctx.moveTo(x0, y0); for (let i = 0; i <= 10; i++) ctx.lineTo(x0 + i, y0 + (still ? 0 : Math.sin(frame * 0.18 - i * 0.6) * i * 0.18) + i * 0.08);
    for (let i = 10; i >= 0; i--) ctx.lineTo(x0 + i, y0 + 5 - i * 0.3 + (still ? 0 : Math.sin(frame * 0.18 - i * 0.6) * i * 0.18)); ctx.closePath();
    ctx.fillStyle = '#e83850'; ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.fillStyle = '#ffe040'; ctx.beginPath(); ctx.arc(x0 + 3, y0 + 2, 0.9, 0, Math.PI * 2); ctx.fill();
    return r;
  };

  // ---------------- the island map ----------------
  const isles = new WeakSet();
  function paintIsle(img) {
    if (!img || isles.has(img)) return; isles.add(img);
    const fn = (x, w, h) => {
      x.save(); x.shadowColor = 'rgba(255,255,255,0.85)'; x.shadowBlur = 5; x.drawImage(img, 0, 0, w, h); x.restore(); // surf along every shore
      x.save(); x.shadowColor = 'rgba(0,10,40,0.45)'; x.shadowBlur = 6; x.shadowOffsetY = 3; x.globalCompositeOperation = 'destination-over'; x.drawImage(img, 0, 0, w, h); x.restore();
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; if (FILTER) x.filter = 'blur(0.6px)'; x.drawImage(img, 0, 0, w, h); x.filter = 'none'; x.globalAlpha = 0.5; x.drawImage(img, 0, 0, w, h); x.globalAlpha = 1;
      x.globalCompositeOperation = 'source-atop'; const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,250,220,0.16)'); g.addColorStop(1, 'rgba(10,20,60,0.16)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.globalAlpha = 0.07; x.globalCompositeOperation = 'overlay'; x.fillStyle = x.createPattern(grain, 'repeat'); x.fillRect(0, 0, w, h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    };
    fn.k = 3; Modern.paint(img, fn);
  }
  const _ms = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _ms(...a), d = s.draw;
    s.draw = function () {
      if (!Modern.on()) return d.apply(this, arguments);
      const WD = WORLDS[game.world || 0], isle = WD && WD.isle ? WD.isle() : null, still = calm(); paintIsle(isle);
      const d0 = ctx.drawImage;
      ctx.drawImage = function (img, ...b) {
        if (img === isle) {
          // a shimmering sea under the islands
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let yy = 6; yy < VH; yy += 9) { ctx.strokeStyle = `rgba(200,240,255,${0.05 + 0.04 * Math.sin(yy + frame * 0.03)})`; ctx.lineWidth = 0.7; ctx.beginPath(); for (let xx = -4; xx <= VW + 4; xx += 4) { const wy = yy + Math.sin(xx * 0.07 + (still ? 0 : frame * 0.04) + yy) * 1.4; if (xx < 0) ctx.moveTo(xx, wy); else ctx.lineTo(xx, wy); } ctx.stroke(); }
          for (let i = 0; i < 14; i++) { const sx = (i * 73 + (still ? 0 : frame * 0.2)) % VW, sy = (i * 41) % VH, tw = Math.max(0, Math.sin(frame * 0.07 + i * 1.7)); ctx.fillStyle = `rgba(255,255,255,${(0.35 * tw).toFixed(3)})`; ctx.fillRect(sx, sy, 1.2, 0.6); }
          ctx.restore();
          d0.call(ctx, img, ...b);
          // cleared levels glow gold
          try { for (const n of WD.nodes()) if (n.li !== undefined && n.kind !== 'door' && game.cleared[n.li]) { const g = ctx.createRadialGradient(n.x, n.y, 1, n.x, n.y, 11); g.addColorStop(0, `rgba(255,220,90,${(0.45 + 0.15 * Math.sin(frame * 0.06 + n.x)).toFixed(3)})`); g.addColorStop(1, 'rgba(255,220,90,0)'); ctx.fillStyle = g; ctx.fillRect(n.x - 11, n.y - 11, 22, 22); } } catch (e) { /* ignore */ }
          // clouds and their shadows drifting over
          for (let i = 0; i < 4; i++) { const cx = ((i * 97 + (still ? 0 : frame * (0.08 + i * 0.02))) % (VW + 120)) - 60, cy = 40 + i * 42; ctx.fillStyle = 'rgba(0,10,40,0.10)'; for (const [ox, oy, r] of [[0, 0, 12], [12, 3, 9], [-11, 3, 8]]) { ctx.beginPath(); ctx.ellipse(cx + ox + 6, cy + oy + 10, r * 1.3, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (const [ox, oy, r] of [[0, 0, 12], [12, 3, 9], [-11, 3, 8]]) { ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, r * 1.3, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); } }
          return;
        }
        return d0.call(ctx, img, ...b);
      };
      try { return d.apply(this, arguments); } finally { ctx.drawImage = d0; }
    };
    return s;
  };
})();
