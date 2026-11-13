'use strict';
// =====================================================================
// Update 1.7 (part 2): hand-drawn high-resolution art for MODERN mode.
// This first set redraws WallyMan (every pose and costume, from the
// same skeleton as the pixel sprite), the Grumble, Prickle, Buzzer and
// Hopper, and the ground tiles (grass top, earth, bricks, stone) for
// every theme. Anything not redrawn yet uses the smoothed pixel art.
// =====================================================================
const HD = (() => {
  const INK = '#1a1020';
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgb = (a) => `rgb(${a.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(',')})`;
  const shade = (h, k) => { const c = hex(h); return rgb(k >= 0 ? c.map((v) => v + (255 - v) * k) : c.map((v) => v * (1 + k))); };
  const path = (x, pts) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); };
  const limb = (x, pts, w, col) => { x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = INK; x.lineWidth = w + 1.1; path(x, pts); x.stroke(); x.strokeStyle = col; x.lineWidth = w; path(x, pts); x.stroke(); };
  const blob = (x, cx, cy, rx, ry, col, light, outline = true) => {
    x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (outline) { x.strokeStyle = INK; x.lineWidth = 1.1; x.stroke(); }
    if (light) { const g = x.createRadialGradient(cx - rx * 0.35, cy - ry * 0.45, 0.3, cx, cy, Math.max(rx, ry) * 1.1); g.addColorStop(0, light); g.addColorStop(1, col); x.fillStyle = g; } else x.fillStyle = col;
    x.fill();
  };
  const rrect = (x, X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };

  // ---------------- WallyMan ----------------
  const PAL0 = { blue: '#2f62d0', blueD: '#1d3f94', blueL: '#5a8af0', blueLL: '#86aaff', org: '#f2702a', orgD: '#b4461a', orgL: '#ffa060', skin: '#f2b48a', skinD: '#c97c58', skinL: '#ffd8b8', lens: '#d8f0ff', glint: '#ffffff', green: '#1f9a3a', greenD: '#0e5a1e', phone: '#2a3038', screen: '#4a6070', screenOn: '#5ff0ff', sole: '#5a2a10' };
  const dir = (a, L) => [Math.sin(a) * L, Math.cos(a) * L];
  function wally(x, P, capeF, signal, C) {
    const bob = P.bob, lean = P.lean, hipX = 12, hipY = 21 + bob, shX = hipX + lean, shY = 13 + bob, t = capeF * (Math.PI / 2);
    // cape: a flowing ribbon with a lit edge
    { const [ang, amp, len] = P.cape; let cx = shX - 3, cy = shY; const pts = [];
      for (let i = 0; i <= len; i++) { const s = i / len, a = ang + Math.sin(t + s * 3.2) * amp * 0.35 * s; pts.push([cx, cy, 1.6 + s * 2.4]); cx -= Math.sin(a); cy += Math.cos(a); }
      x.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) { x.strokeStyle = INK; x.lineWidth = pts[i][2] + 1.1; path(x, [pts[i - 1], pts[i]]); x.stroke(); }
      for (let i = 1; i < pts.length; i++) { x.strokeStyle = i > pts.length * 0.6 ? C.orgD : C.org; x.lineWidth = pts[i][2]; path(x, [pts[i - 1], pts[i]]); x.stroke(); }
      x.strokeStyle = C.orgL; x.lineWidth = 0.7; path(x, pts.slice(0, Math.ceil(pts.length / 2)).map(([X, Y]) => [X + 0.4, Y - 0.4])); x.stroke(); }
    const leg = ([th, bend], back) => {
      const hip = [hipX + (back ? -1 : 1), hipY], k = dir(th, 4), f = dir(th - bend, 4), kn = [hip[0] + k[0], hip[1] + k[1]], ft = [kn[0] + f[0], kn[1] + f[1]];
      limb(x, [hip, kn], 3.1, back ? C.blueD : C.blue);
      limb(x, [kn, ft], 3.1, back ? C.orgD : C.org);
      x.strokeStyle = back ? C.org : C.orgL; x.lineWidth = 0.8; path(x, [[kn[0] - 1.2, kn[1]], [kn[0] + 1.2, kn[1]]]); x.stroke();
      const sole = Math.max(ft[1] + 1, 0); rrect(x, ft[0] - 1.6, sole - 1.5, 4.8, 2.6, 1.1); x.strokeStyle = INK; x.lineWidth = 1; x.stroke(); x.fillStyle = back ? C.orgD : C.org; x.fill();
      x.fillStyle = C.sole; x.fillRect(ft[0] - 1.4, sole + 0.6, 4.4, 0.6);
    };
    const arm = ([ua, fa], back) => {
      const s = [shX + (back ? -2 : 2), shY + 1], e = dir(ua, 4), hh = dir(fa, 4), el = [s[0] + e[0], s[1] + e[1]], h = [el[0] + hh[0], el[1] + hh[1]], c0 = [el[0] + hh[0] * 0.5, el[1] + hh[1] * 0.5];
      limb(x, [s, el, c0], 2.2, back ? C.blueD : C.blueL);
      limb(x, [c0, [h[0] - hh[0] * 0.12, h[1] - hh[1] * 0.12]], 2.3, back ? C.orgD : C.org);
      blob(x, h[0], h[1], 1.25, 1.25, back ? C.skinD : C.skin, back ? null : C.skinL);
      return h;
    };
    leg(P.back, true);
    arm(P.armB, true);
    // torso: shaded suit, belt and the chest emblem
    { const o12 = (lean * 9) / 9, ob = 0, top = 12 + bob, bot = 22 + bob;
      x.beginPath(); x.moveTo(9 + o12, top); x.lineTo(15 + o12, top); x.quadraticCurveTo(16.2 + o12 * 0.5, top + 4, 16 + ob, bot); x.lineTo(8 + ob, bot); x.quadraticCurveTo(7.8 + o12 * 0.5, top + 4, 9 + o12, top); x.closePath();
      x.strokeStyle = INK; x.lineWidth = 1.1; x.stroke(); const g = x.createLinearGradient(8, 0, 16, 0); g.addColorStop(0, C.blueD); g.addColorStop(0.45, C.blue); g.addColorStop(1, C.blueL); x.fillStyle = g; x.fill();
      const bl = (lean * 2) / 9; rrect(x, 8 + bl, 19 + bob, 8, 2, 0.6); x.fillStyle = C.org; x.fill(); x.fillStyle = C.orgD; x.fillRect(8 + bl, 20.4 + bob, 8, 0.6);
      const o = (lean * 6) / 9, ey = 15 + bob; blob(x, 13 + o, ey, 2.2, 1.7, C.org, C.orgL); blob(x, 13 + o, ey, 1.1, 0.9, C.green, '#5ad870', false); }
    leg(P.front, false);
    // head: round with a shine, goggles, flowing strap
    { const hx = shX + 0.5, hy = 8 + bob, sa = P.cape[0] * 0.8 + Math.sin(t) * 0.3;
      x.lineCap = 'round'; const strap = [[hx - 4, hy - 0.2]]; for (let i = 1; i <= 4; i++) strap.push([hx - 4 - Math.sin(sa) * i, hy - 0.2 + Math.cos(sa) * i * 0.6 + (i > 2 ? Math.sin(t + i) * 0.6 : 0)]);
      x.strokeStyle = INK; x.lineWidth = 2; path(x, strap); x.stroke(); x.strokeStyle = C.blueD; x.lineWidth = 1.1; path(x, strap); x.stroke();
      blob(x, hx, hy, 4.3, 4.2, C.skin, C.skinL);
      x.fillStyle = C.skinD; x.globalAlpha = 0.35; x.beginPath(); x.ellipse(hx, hy + 2.6, 3.4, 1.3, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
      x.strokeStyle = C.blueD; x.lineWidth = 1.9; x.beginPath(); x.moveTo(hx - 4.1, hy - 0.3); x.lineTo(hx + 4.2, hy - 0.3); x.stroke();
      rrect(x, hx + 0.6, hy - 1.5, 3.3, 2.3, 0.9); x.strokeStyle = INK; x.lineWidth = 0.7; x.stroke(); x.fillStyle = C.lens; x.fill();
      if (P.ouch) { x.strokeStyle = INK; x.lineWidth = 0.55; x.beginPath(); x.moveTo(hx + 1.4, hy - 1); x.lineTo(hx + 3.1, hy + 0.3); x.moveTo(hx + 3.1, hy - 1); x.lineTo(hx + 1.4, hy + 0.3); x.stroke(); } else { x.fillStyle = C.glint; x.beginPath(); x.arc(hx + 1.6, hy - 0.8, 0.45, 0, Math.PI * 2); x.fill(); }
      blob(x, hx - 1, hy + 1.3, 0.7, 0.9, C.skinD, null, false);
      x.strokeStyle = P.ouch ? INK : C.skinD; x.lineWidth = 0.7; x.beginPath(); if (P.ouch) x.ellipse(hx + 2.6, hy + 2.6, 0.8, 0.6, 0, 0, Math.PI * 2); else { x.moveTo(hx + 1.6, hy + 2.4); x.quadraticCurveTo(hx + 2.6, hy + 3.1, hx + 3.6, hy + 2.3); } x.stroke(); }
    const hand = arm(P.armF, false);
    if (P.phone) { rrect(x, hand[0] - 0.2, hand[1] - 3.3, 2.2, 3.3, 0.5); x.strokeStyle = INK; x.lineWidth = 0.6; x.stroke(); x.fillStyle = C.phone; x.fill(); x.fillStyle = signal ? C.screenOn : C.screen; x.fillRect(hand[0] + 0.2, hand[1] - 2.9, 1.4, 1.7);
      if (signal) { const g = x.createRadialGradient(hand[0] + 0.9, hand[1] - 3.6, 0, hand[0] + 0.9, hand[1] - 3.6, 3); g.addColorStop(0, 'rgba(95,240,255,0.6)'); g.addColorStop(1, 'rgba(95,240,255,0)'); x.fillStyle = g; x.fillRect(hand[0] - 2.5, hand[1] - 7, 7, 7); } }
    if (P.fist) blob(x, hand[0], hand[1], 1.6, 1.6, C.skin, C.skinL);
  }
  const tintHD = (x, w, h, col) => { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, w * 4, h * 4); x.restore(); };
  function wallyPainter(m) {
    return (x, w, h) => {
      const C = Object.assign({}, PAL0, Wally.COSTUMES[m.costume] || {});
      if (m.face < 0) { x.translate(w, 0); x.scale(-1, 1); }
      wally(x, Wally.POSES[m.pose] || Wally.POSES.idle0, m.capeF, m.signal, C);
      if (m.variant !== 'n') tintHD(x, w, h, m.variant === 'w' ? '#ffffff' : m.variant === 'k' ? INK : '#5ff0ff');
    };
  }
  { // learn which pose each WallyMan frame shows, so the redrawn version can be painted for it
    const _d = Wally.draw;
    Wally.draw = function (c, cx, feetY, pose, face, o = {}) {
      if (Modern.on() && (o.hero || Wally.hero) === 'wally') {
        const capeF = o.capeF !== undefined ? o.capeF : (Math.floor((o.t !== undefined ? o.t : 0) / 6) & 3), costume = o.costume || Wally.current;
        const reg = (variant) => { const img = Wally.frame(Wally.POSES[pose] ? pose : 'idle0', capeF, o.signal, face, variant, costume, 'wally'); if (!Modern.painted(img)) Modern.paint(img, wallyPainter({ pose: Wally.POSES[pose] ? pose : 'idle0', capeF, signal: !!o.signal, face, variant, costume })); };
        reg(o.white ? 'w' : o.ghost ? 'g' : o.black ? 'k' : 'n'); if (o.glow) reg('g');
      }
      return _d.call(this, c, cx, feetY, pose, face, o);
    };
  }

  // ---------------- enemies ----------------
  const eye = (x, cx, cy, r, look, angry) => { blob(x, cx, cy, r, r * 1.15, '#ffffff', null); x.fillStyle = INK; x.beginPath(); x.arc(cx + look, cy + 0.3, r * 0.5, 0, Math.PI * 2); x.fill(); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx + look - r * 0.2, cy - r * 0.15, r * 0.16, 0, Math.PI * 2); x.fill(); if (angry) { x.strokeStyle = INK; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - r, cy - r * 1.2 - angry); x.lineTo(cx + r, cy - r * 0.6); x.stroke(); } };
  function grumble(x, f) {
    for (const [fx, d] of f ? [[5.5, 0], [10.5, 0]] : [[3.8, 0], [12.2, 0]]) { x.beginPath(); x.ellipse(fx, 14.6 + d, 2.4, 1.3, 0, 0, Math.PI * 2); x.strokeStyle = INK; x.lineWidth = 1; x.stroke(); x.fillStyle = '#f2a040'; x.fill(); }
    x.beginPath(); x.moveTo(1.2, 12.6); x.quadraticCurveTo(0.6, 1, 8, 0.8); x.quadraticCurveTo(15.4, 1, 14.8, 12.6); x.quadraticCurveTo(8, 14.8, 1.2, 12.6); x.closePath();
    x.strokeStyle = INK; x.lineWidth = 1.1; x.stroke(); const g = x.createRadialGradient(5.5, 3.5, 0.5, 8, 7, 9); g.addColorStop(0, '#c890e0'); g.addColorStop(0.6, '#9a5ab8'); g.addColorStop(1, '#6a3488'); x.fillStyle = g; x.fill();
    eye(x, 5.4, 6.3, 1.9, 0.4, 0); eye(x, 10.6, 6.3, 1.9, 0.4, 0);
    x.strokeStyle = INK; x.lineWidth = 1.1; x.beginPath(); x.moveTo(3.2, 3.7); x.lineTo(7.2, 4.9); x.moveTo(12.8, 3.7); x.lineTo(8.8, 4.9); x.stroke();
    x.beginPath(); x.moveTo(5.6, 10.6); x.quadraticCurveTo(8, 9.4, 10.4, 10.6); x.stroke();
  }
  function prickle(x, f) {
    for (const lx of f ? [4.6, 9.6] : [5.4, 10.6]) { x.strokeStyle = INK; x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(lx, 12); x.lineTo(lx + (f ? -0.6 : 0.6), 14.6); x.stroke(); x.strokeStyle = '#f0c890'; x.lineWidth = 1.2; x.stroke(); }
    // spikes
    for (let i = 0; i < 6; i++) { const a = Math.PI * (1.05 + i * 0.16), bx = 6.5 + Math.cos(a) * 5.2, by = 8.6 + Math.sin(a) * 4.6, tx = 6.5 + Math.cos(a) * 8.6, ty = 8.6 + Math.sin(a) * 8.2;
      x.beginPath(); x.moveTo(bx - Math.sin(a) * 1.6, by + Math.cos(a) * 1.6); x.lineTo(tx, ty); x.lineTo(bx + Math.sin(a) * 1.6, by - Math.cos(a) * 1.6); x.closePath(); x.strokeStyle = INK; x.lineWidth = 0.9; x.stroke(); x.fillStyle = i % 2 ? '#8a9ad8' : '#4a5a9a'; x.fill(); }
    blob(x, 6.6, 8.6, 6, 4.4, '#4a5a9a', '#8a9ad8');
    blob(x, 11.6, 9, 3.2, 2.6, '#f0c890', '#fff0d8');
    eye(x, 12, 7.9, 1, 0.3, 0); blob(x, 14.8, 8.7, 1.1, 0.9, '#e04060', '#ff90a8');
  }
  function buzzer(x, f) {
    for (const [wx, wy, ra] of f ? [[5.2, 2.6, -0.5], [9.2, 2.6, 0.5]] : [[5.2, 3.8, -0.15], [9.2, 3.8, 0.15]]) { x.save(); x.translate(wx, wy); x.rotate(ra); x.beginPath(); x.ellipse(0, 0, 2.6, 1.5, 0, 0, Math.PI * 2); x.strokeStyle = 'rgba(26,16,32,0.6)'; x.lineWidth = 0.6; x.stroke(); x.fillStyle = 'rgba(220,245,255,0.75)'; x.fill(); x.restore(); }
    x.save(); x.beginPath(); x.ellipse(7, 8, 6.2, 3.1, 0, 0, Math.PI * 2); x.strokeStyle = INK; x.lineWidth = 1.1; x.stroke(); x.clip();
    const g = x.createLinearGradient(0, 5, 0, 11); g.addColorStop(0, '#ffe880'); g.addColorStop(1, '#e0a810'); x.fillStyle = g; x.fillRect(0, 4, 14, 8);
    x.fillStyle = INK; for (const sx of [2.6, 5.4, 8.2]) x.fillRect(sx, 4, 1.2, 8); x.restore();
    x.fillStyle = INK; x.beginPath(); x.moveTo(0.9, 8); x.lineTo(-0.6, 8.6); x.lineTo(0.9, 9); x.fill();
    eye(x, 11.3, 7.4, 1.3, 0.4, 0);
  }
  function hopper(x, f) {
    const legs = f ? [[2.5, 13.5, 0.9, 15.8], [13.5, 13.5, 15.1, 15.8]] : [[3, 13.2, 2, 14.6], [13, 13.2, 14, 14.6]];
    for (const [a, b, c, d] of legs) { x.strokeStyle = INK; x.lineWidth = 2.6; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); x.strokeStyle = '#1f8030'; x.lineWidth = 1.6; x.stroke(); }
    blob(x, 8, 10.8, 7.4, 4.2, '#3cc048', '#8af08a');
    x.beginPath(); x.ellipse(8, 12.2, 4.6, 2.2, 0, 0, Math.PI * 2); x.fillStyle = '#e8e070'; x.fill();
    x.beginPath(); x.moveTo(3.4, 9.6); x.quadraticCurveTo(8, 12, 12.6, 9.6); x.strokeStyle = INK; x.lineWidth = 0.8; x.stroke(); x.fillStyle = '#e05070'; x.beginPath(); x.moveTo(4.4, 9.7); x.quadraticCurveTo(8, 11.6, 11.6, 9.7); x.quadraticCurveTo(8, 10.4, 4.4, 9.7); x.fill();
    blob(x, 4.8, 5.8, 2.2, 2.2, '#3cc048', null); blob(x, 11.2, 5.8, 2.2, 2.2, '#3cc048', null); eye(x, 4.8, 5.6, 1.4, 0.2, 0); eye(x, 11.2, 5.6, 1.4, 0.2, 0);
  }
  const mirror = (fn) => (x, w) => { x.translate(w, 0); x.scale(-1, 1); fn(x); };
  Sprites.grumble.forEach((c, i) => Modern.paint(c, (x) => grumble(x, i)));
  Sprites.prickle.r.forEach((c, i) => Modern.paint(c, (x) => prickle(x, i))); Sprites.prickle.l.forEach((c, i) => Modern.paint(c, mirror((x) => prickle(x, i))));
  Sprites.buzzer.r.forEach((c, i) => Modern.paint(c, (x) => buzzer(x, i))); Sprites.buzzer.l.forEach((c, i) => Modern.paint(c, mirror((x) => buzzer(x, i))));
  Sprites.hopper.forEach((c, i) => Modern.paint(c, (x) => hopper(x, i)));

  // ---------------- ground tiles ----------------
  function dominant(c, y0 = 0, y1 = 16) { const d = c.getContext('2d').getImageData(0, y0, 16, y1 - y0).data, n = {}; let best = null, bn = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; const k = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''); n[k] = (n[k] || 0) + 1; if (n[k] > bn) { bn = n[k]; best = k; } } return best || '#888888'; }
  const pebbles = (x, col, seed) => { let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let i = 0; i < 5; i++) { const px = 2 + r() * 12, py = 3 + r() * 11, rr = 0.7 + r() * 0.9; x.fillStyle = shade(col, -0.22); x.beginPath(); x.ellipse(px, py + 0.25, rr, rr * 0.75, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = shade(col, 0.18); x.beginPath(); x.ellipse(px - 0.2, py - 0.2, rr * 0.7, rr * 0.5, 0, 0, Math.PI * 2); x.fill(); } };
  const earth = (x, dirt, seed) => { const g = x.createLinearGradient(0, 0, 0, 16); g.addColorStop(0, shade(dirt, 0.06)); g.addColorStop(1, shade(dirt, -0.1)); x.fillStyle = g; x.fillRect(0, 0, 16, 16); pebbles(x, dirt, seed); };
  for (const [theme, T] of Object.entries(Sprites.tiles)) {
    let dirt, top, brick, solid;
    try { dirt = dominant(T.fill); top = dominant(T.top, 0, 5); brick = dominant(T.brick); solid = dominant(T.solid); } catch (e) { continue; }
    const seed = theme.length * 97 + 13;
    Modern.paint(T.fill, (x) => earth(x, dirt, seed));
    Modern.paint(T.top, (x) => {
      earth(x, dirt, seed + 7);
      const g = x.createLinearGradient(0, 0, 0, 7); g.addColorStop(0, shade(top, 0.25)); g.addColorStop(1, shade(top, -0.08)); x.fillStyle = g;
      x.beginPath(); x.moveTo(0, 0); x.lineTo(16, 0); for (let i = 16; i >= 0; i -= 2) x.lineTo(i, 5.6 + Math.sin(i * 0.9) * 0.9); x.closePath(); x.fill();
      x.strokeStyle = shade(top, -0.3); x.lineWidth = 0.8; x.beginPath(); for (let i = 0; i <= 16; i += 2) { const y = 5.6 + Math.sin(i * 0.9) * 0.9; if (i) x.lineTo(i, y); else x.moveTo(i, y); } x.stroke();
      x.strokeStyle = shade(top, 0.45); x.lineWidth = 0.7; x.lineCap = 'round'; for (let i = 1; i < 16; i += 3) { x.beginPath(); x.moveTo(i, 1.6); x.quadraticCurveTo(i + 0.6, 0.4, i + 1.2, -0.2); x.stroke(); }
    });
    Modern.paint(T.brick, (x) => {
      x.fillStyle = shade(brick, -0.45); x.fillRect(0, 0, 16, 16);
      const rows = [[0, [[0.5, 7], [8.5, 7]]], [8, [[-3.5, 7], [4.5, 7], [12.5, 7]]]];
      for (const [y, bs] of rows) for (const [bx, bw] of bs) { rrect(x, bx, y + 0.5, bw, 7, 1.2); const g = x.createLinearGradient(0, y, 0, y + 8); g.addColorStop(0, shade(brick, 0.22)); g.addColorStop(1, shade(brick, -0.12)); x.fillStyle = g; x.fill(); x.fillStyle = shade(brick, 0.4); x.fillRect(bx + 1.2, y + 1.2, bw - 2.4, 0.6); }
    });
    Modern.paint(T.solid, (x) => {
      rrect(x, 0.4, 0.4, 15.2, 15.2, 2.4); const g = x.createLinearGradient(0, 0, 16, 16); g.addColorStop(0, shade(solid, 0.3)); g.addColorStop(1, shade(solid, -0.25)); x.fillStyle = g; x.fill(); x.strokeStyle = shade(solid, -0.45); x.lineWidth = 0.8; x.stroke();
      rrect(x, 4, 4, 8, 8, 1.4); const g2 = x.createLinearGradient(16, 16, 0, 0); g2.addColorStop(0, shade(solid, 0.15)); g2.addColorStop(1, shade(solid, -0.12)); x.fillStyle = g2; x.fill();
    });
  }
  return { wally, grumble, prickle, buzzer, hopper };
})();
UPDATES[0][1].splice(3, 0, 'REDRAWN: WALLYMAN, 4 ENEMIES, GROUND');
UPDATES.unshift(['1.8', ['NEW: BUTTON REACH (OPTIONS)', 'THUMBS NEEDN\'T HIT BUTTONS EXACTLY', 'THE D-PAD WORKS LIKE A STICK:', 'SLIDE ANYWHERE NEAR IT TO STEER', 'A, B AND S STAY HELD AS YOU DRIFT', 'SLIDE FROM B ONTO A TO JUMP', 'CHOOSE OFF, NORMAL OR WIDE']]);
