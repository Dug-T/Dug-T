'use strict';
// =====================================================================
// Update 2.0 (part 1): the rest of the enemies and bosses, hand-drawn
// at high resolution for MODERN mode: bats, chargers, turrets, fish,
// jellyfish, ghosts, slimes, boomers, magnet drones, asteroids, beam-
// down aliens and the Zappling squadron; and the Giant Squid, the T-Rex,
// Volt, Baron's Mega-Mech, the Mothership, the Crab, the Drill Mole and
// Nimbus the cloud dragon.
// =====================================================================
(() => {
  const { INK, shade, path, blob, rrect, eye } = HD.util;
  const circ = (x, cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); };
  const ell = (x, cx, cy, rx, ry, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); };
  const lg = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rg = (x, cx, cy, r, c0, c1) => { const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
  const ink = (x, fill, lw = 1) => { x.strokeStyle = INK; x.lineWidth = lw; x.stroke(); x.fillStyle = fill; x.fill(); };
  const glow = (x, cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
  const P = (img, fn) => { if (img) Modern.paint(img, fn); };
  const mirror = (fn) => (x, w, h) => { x.translate(w, 0); x.scale(-1, 1); fn(x, w, h); };

  // ---------------- enemies ----------------
  const bat = (x, f) => {
    for (const d of [-1, 1]) {
      x.beginPath(); x.moveTo(8 + d * 2, 6);
      if (!f) { x.quadraticCurveTo(8 + d * 5, 0, 8 + d * 7.6, 1.2); x.quadraticCurveTo(8 + d * 6.6, 4.4, 8 + d * 7, 7.4); x.quadraticCurveTo(8 + d * 5, 6, 8 + d * 4, 8); }
      else { x.quadraticCurveTo(8 + d * 6, 5, 8 + d * 7.6, 9.6); x.quadraticCurveTo(8 + d * 6.4, 9, 8 + d * 6, 11); x.quadraticCurveTo(8 + d * 5, 9.4, 8 + d * 3.6, 9.6); }
      x.closePath(); ink(x, lg(x, 0, 0, 0, 12, [[0, '#9a5ac8'], [1, '#5a2a88']]), 0.8);
    }
    ell(x, 8, 6.6, 3.4, 3.2); ink(x, rg(x, 8, 6.6, 3.4, '#b07ae0', '#6a3498'), 0.8);
    x.fillStyle = '#7a3aa8'; for (const d of [-1, 1]) { path(x, [[8 + d * 1, 4], [8 + d * 2.6, 1.6], [8 + d * 2.8, 4.6]]); x.fill(); }
    for (const d of [-1, 1]) { x.fillStyle = '#ffffff'; circ(x, 8 + d * 1.4, 6, 0.9); x.fill(); x.fillStyle = '#ff3040'; circ(x, 8 + d * 1.4, 6.2, 0.5); x.fill(); }
    x.fillStyle = '#ffffff'; path(x, [[6.8, 8.4], [7.2, 9.6], [7.6, 8.4]]); x.fill(); path(x, [[8.4, 8.4], [8.8, 9.6], [9.2, 8.4]]); x.fill();
  };
  (Sprites.bat || []).forEach((c, i) => P(c, (x) => bat(x, i)));
  const charger = (x, f) => { // a robot rhino
    for (const [lx, d] of [[4.5, f ? 1 : -1], [10, f ? -1 : 1]]) { rrect(x, lx + d * 0.6, 11, 2.8, 4, 0.8); ink(x, '#4a4a5a', 0.7); }
    rrect(x, 1.4, 5.6, 12.6, 7, 3); ink(x, lg(x, 0, 5, 0, 13, [[0, '#d8e0f0'], [0.5, '#9aa0b8'], [1, '#6a7088']]));
    x.strokeStyle = 'rgba(60,60,80,0.5)'; x.lineWidth = 0.4; for (const sx of [5, 8]) { x.beginPath(); x.moveTo(sx, 6); x.lineTo(sx, 12.4); x.stroke(); }
    x.beginPath(); x.moveTo(10, 6.4); x.quadraticCurveTo(10.6, 2.4, 12, 2.6); x.quadraticCurveTo(11.4, 4.4, 12.2, 6.4); x.closePath(); ink(x, lg(x, 10, 2, 12, 6, [[0, '#ffffff'], [1, '#c8c8d8']]), 0.6);
    glow(x, 12.6, 8, 2.4, 'rgba(255,48,64,0.6)'); x.fillStyle = '#ff3040'; circ(x, 12.6, 8, 0.8); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.5)'; ell(x, 5, 6.8, 2.6, 0.6); x.fill();
  };
  (Sprites.charger ? Sprites.charger.r : []).forEach((c, i) => P(c, (x) => charger(x, i)));
  (Sprites.charger ? Sprites.charger.l : []).forEach((c, i) => P(c, mirror((x) => charger(x, i))));
  const turret = (x) => {
    x.beginPath(); x.moveTo(2, 15); x.lineTo(3.4, 11.2); x.lineTo(12.6, 11.2); x.lineTo(14, 15); x.closePath(); ink(x, lg(x, 0, 11, 0, 15, [[0, '#5a5a6a'], [1, '#2a2a36']]));
    rrect(x, 11, 8.4, 4.4, 2.6, 0.8); ink(x, lg(x, 0, 8, 0, 11, [[0, '#b0c0d8'], [1, '#5a6a8a']]), 0.7);
    x.beginPath(); x.moveTo(3.4, 11.4); x.lineTo(3.4, 8); x.quadraticCurveTo(3.4, 5, 7.4, 5); x.quadraticCurveTo(11.4, 5, 11.4, 8); x.lineTo(11.4, 11.4); x.closePath(); ink(x, lg(x, 3, 0, 12, 0, [[0, '#4a5a7a'], [0.5, '#8a9ab8'], [1, '#4a5a7a']]));
    for (const ex of [5.6, 9]) { glow(x, ex, 8, 2, 'rgba(255,48,64,0.55)'); x.fillStyle = '#ff3040'; ell(x, ex, 8, 1, 0.8); x.fill(); }
    x.strokeStyle = INK; x.lineWidth = 0.6; x.beginPath(); x.moveTo(7.4, 5); x.lineTo(7.4, 2.4); x.stroke(); glow(x, 7.4, 2, 2.4, 'rgba(255,224,64,0.6)'); blob(x, 7.4, 2, 0.9, 0.9, '#ffe040', '#ffffff');
  };
  if (Sprites.turret) { P(Sprites.turret.r, turret); P(Sprites.turret.l, mirror(turret)); }
  const fish = (x, f) => {
    x.beginPath(); x.moveTo(4, 8); x.lineTo(0.6, f ? 5.2 : 4.4); x.lineTo(1.4, 8); x.lineTo(0.6, f ? 10.8 : 11.6); x.closePath(); ink(x, '#d06010', 0.7);
    ell(x, 8.4, 8, 5.4, 3.8); ink(x, lg(x, 0, 4, 0, 12, [[0, '#ffc060'], [0.5, '#ff9020'], [1, '#c05010']]));
    x.fillStyle = '#c05010'; path(x, [[7, 4.6], [9.4, 2.8], [10, 4.6]]); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 0.4; for (const sx of [6, 8]) { x.beginPath(); x.arc(sx, 8, 2.4, -0.9, 0.9); x.stroke(); }
    eye(x, 11.4, 6.9, 1.2, 0.3, 0); x.strokeStyle = INK; x.lineWidth = 0.5; x.beginPath(); x.arc(13.2, 9, 0.8, 1.6, 3); x.stroke();
  };
  if (Sprites.fish) { Sprites.fish.r.forEach((c, i) => P(c, (x) => fish(x, i))); Sprites.fish.l.forEach((c, i) => P(c, mirror((x) => fish(x, i)))); }
  const jelly = (x, f) => {
    x.strokeStyle = 'rgba(120,40,160,0.8)'; x.lineWidth = 0.6; x.lineCap = 'round';
    for (let k = 0; k < 5; k++) { const bx = 3.6 + k * 2.2; x.beginPath(); x.moveTo(bx, 7.6); for (let s = 1; s <= 6; s++) x.lineTo(bx + Math.sin(s * 1.2 + k + f * 1.5) * 0.8, 7.6 + s * 1.15); x.stroke(); }
    x.beginPath(); x.moveTo(2, 7.8); x.quadraticCurveTo(2, 1, 8, 1); x.quadraticCurveTo(14, 1, 14, 7.8); x.quadraticCurveTo(11, 6.8, 8, 7.8); x.quadraticCurveTo(5, 6.8, 2, 7.8); x.closePath();
    x.fillStyle = (() => { const g = x.createRadialGradient(6, 3, 0.4, 8, 5, 7); g.addColorStop(0, 'rgba(255,230,255,0.95)'); g.addColorStop(1, 'rgba(210,110,250,0.85)'); return g; })(); x.fill(); x.strokeStyle = '#5a1a7a'; x.lineWidth = 0.7; x.stroke();
    x.fillStyle = INK; circ(x, 6, 5.4, 0.6); x.fill(); circ(x, 10, 5.4, 0.6); x.fill(); x.fillStyle = 'rgba(255,255,255,0.7)'; ell(x, 5.4, 2.8, 1.6, 0.6, -0.3); x.fill();
  };
  (Sprites.jelly || []).forEach((c, i) => P(c, (x) => jelly(x, i)));
  const ghost = (x, f) => {
    x.beginPath(); x.moveTo(2.4, 13); x.lineTo(2.4, 6.4); x.quadraticCurveTo(2.4, 1.2, 8, 1.2); x.quadraticCurveTo(13.6, 1.2, 13.6, 6.4); x.lineTo(13.6, 13);
    for (let k = 0; k < 4; k++) { const ax = 13.6 - (k + 1) * 2.8; x.quadraticCurveTo(ax + 1.4, f ? 11 : 14.6, ax, 13); }
    x.closePath(); x.fillStyle = (() => { const g = x.createRadialGradient(6, 4, 0.5, 8, 7, 9); g.addColorStop(0, 'rgba(255,255,255,0.97)'); g.addColorStop(1, 'rgba(200,200,245,0.9)'); return g; })(); x.fill(); x.strokeStyle = '#6a5a9a'; x.lineWidth = 0.7; x.stroke();
    x.fillStyle = '#2a1a4a'; ell(x, 6, 5.6, 1.2, 1.6); x.fill(); ell(x, 10, 5.6, 1.2, 1.6); x.fill(); ell(x, 8, 9, 1.2, 1.6); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.8)'; circ(x, 5.6, 5, 0.35); x.fill(); circ(x, 9.6, 5, 0.35); x.fill();
  };
  if (Sprites.ghost) { Sprites.ghost.r.forEach((c, i) => P(c, (x) => ghost(x, i))); Sprites.ghost.l.forEach((c, i) => P(c, mirror((x) => ghost(x, i)))); }
  const slime = (x, w, h) => {
    x.beginPath(); x.moveTo(0.6, h - 0.6); x.quadraticCurveTo(0.2, h * 0.25, w / 2, h * 0.22); x.quadraticCurveTo(w - 0.2, h * 0.25, w - 0.6, h - 0.6); x.closePath();
    ink(x, (() => { const g = x.createRadialGradient(w * 0.35, h * 0.4, 0.5, w / 2, h * 0.6, w * 0.6); g.addColorStop(0, '#ffc0ec'); g.addColorStop(0.6, '#ff70d0'); g.addColorStop(1, '#c040a0'); return g; })(), 0.8);
    x.fillStyle = 'rgba(255,255,255,0.75)'; ell(x, w * 0.3, h * 0.42, w * 0.08, h * 0.08); x.fill();
    eye(x, w * 0.36, h * 0.62, w * 0.09, 0.2, 0); eye(x, w * 0.64, h * 0.62, w * 0.09, 0.2, 0);
  };
  P(Sprites.slime, slime); P(Sprites.slimeS, slime);
  const boomer = (x, f) => {
    for (const lx of f ? [3.6, 8.6] : [4.6, 7.4]) { rrect(x, lx, 10.2, 2.4, 2.6, 0.8); ink(x, '#30a060', 0.6); }
    ell(x, 6.2, 8.4, 4.6, 2.6); ink(x, rg(x, 6.2, 8.4, 4.6, '#70e0a0', '#208050'));
    x.strokeStyle = '#1a6040'; x.lineWidth = 0.4; x.beginPath(); x.moveTo(3, 8); x.lineTo(9.4, 8); x.moveTo(6.2, 6); x.lineTo(6.2, 10.6); x.stroke();
    x.beginPath(); x.moveTo(2, 4.6); x.quadraticCurveTo(2.4, 0.4, 6.4, 0.4); x.quadraticCurveTo(10.6, 0.6, 10.4, 4); x.lineTo(7.4, 4.4); x.lineTo(7, 5.8); x.lineTo(3.4, 5.8); x.closePath(); ink(x, lg(x, 0, 0, 0, 6, [[0, '#ffe0a0'], [1, '#e0a030']]), 0.8);
    eye(x, 4.4, 3.2, 1.1, -0.3, 1);
  };
  (Sprites.boomer || []).forEach((c, i) => P(c, (x) => boomer(x, i)));
  const magdrone = (x, f) => {
    x.strokeStyle = INK; x.lineWidth = 0.6; x.beginPath(); x.moveTo(8, 1); x.lineTo(8, 2.6); x.stroke();
    x.fillStyle = 'rgba(200,210,230,0.7)'; ell(x, 8, 0.8, f ? 6.4 : 3.6, 0.6); x.fill();
    x.lineCap = 'butt'; x.strokeStyle = INK; x.lineWidth = 3.6; x.beginPath(); x.moveTo(4, 8); x.lineTo(4, 5.6); x.arc(8, 5.6, 4, Math.PI, 0); x.lineTo(12, 8); x.stroke();
    x.lineWidth = 2.6; x.strokeStyle = '#e83030'; x.beginPath(); x.moveTo(4, 7.6); x.lineTo(4, 5.6); x.arc(8, 5.6, 4, Math.PI, Math.PI * 1.5); x.stroke(); x.strokeStyle = '#2f62d0'; x.beginPath(); x.arc(8, 5.6, 4, Math.PI * 1.5, 0); x.lineTo(12, 7.6); x.stroke();
    x.fillStyle = '#e0e0e8'; x.fillRect(2.7, 7.2, 2.6, 1.2); x.fillRect(10.7, 7.2, 2.6, 1.2);
    glow(x, 8, 4.4, 2, 'rgba(95,240,255,0.6)'); x.fillStyle = '#5ff0ff'; circ(x, 8, 4.4, 0.7); x.fill();
  };
  (Sprites.magdrone || []).forEach((c, i) => P(c, (x) => magdrone(x, i)));
  P(Sprites.asteroid, (x, w, h) => {
    x.beginPath(); const pts = 11; for (let k = 0; k < pts; k++) { const a = (k / pts) * Math.PI * 2, r = (k % 3 ? 5.6 : 5) + (k % 2) * 0.4; const px = w / 2 + Math.cos(a) * r * 1.08, py = h / 2 + Math.sin(a) * r * 0.92; if (k) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath();
    ink(x, rg(x, w / 2, h / 2, 6, '#b8a898', '#5a4a40'));
    for (const [cx, cy, r] of [[5, 5, 1.4], [9.4, 7.4, 1.1], [6.4, 9, 0.8]]) { x.fillStyle = 'rgba(60,45,35,0.6)'; circ(x, cx, cy, r); x.fill(); x.fillStyle = 'rgba(255,255,255,0.18)'; circ(x, cx - 0.3, cy - 0.3, r * 0.5); x.fill(); }
  });
  const beamling = (x, f) => {
    x.strokeStyle = INK; x.lineWidth = 0.6; for (const d of [-1, 1]) { x.beginPath(); x.moveTo(8 + d * 1.6, 3.4); x.lineTo(8 + d * 3, 0.8); x.stroke(); blob(x, 8 + d * 3, 0.8, 0.8, 0.8, '#7ae040', '#d0ffa0', false); }
    for (const lx of f ? [5.6, 10.4] : [6.4, 9.6]) { rrect(x, lx - 1, 12.4, 2, 3.2, 0.8); ink(x, '#7ae040', 0.6); }
    rrect(x, 5.4, 8.4, 5.2, 4.6, 1.4); ink(x, lg(x, 5, 0, 11, 0, [[0, '#8a20a8'], [0.5, '#d060f0'], [1, '#8a20a8']]), 0.7);
    x.fillStyle = '#d0d8e8'; rrect(x, 3.8, 9.4, 1.8, 2.4, 0.6); x.fill(); rrect(x, 10.4, 9.4, 1.8, 2.4, 0.6); x.fill();
    ell(x, 8, 5.8, 5, 3.2); ink(x, rg(x, 8, 5.8, 5, '#b8ff80', '#4aa020'));
    eye(x, 6, 5.6, 1.3, 0.2, 0); eye(x, 10, 5.6, 1.3, 0.2, 0);
  };
  if (Sprites.beamling) { Sprites.beamling.forEach((c, i) => P(c, (x) => beamling(x, i))); (Sprites.beamlingL || []).forEach((c, i) => P(c, mirror((x) => beamling(x, i)))); }
  if (Sprites.zappling) {
    const cols = [['#40d860', '#1a8a30'], ['#ff60c0', '#a02880'], ['#50d8ff', '#2080b0']];
    Sprites.zappling.forEach((pair, ci) => pair.forEach((c, f) => P(c, (x) => {
      const [g, G] = cols[ci] || cols[0];
      x.strokeStyle = INK; x.lineWidth = 0.6; for (const d of [-1, 1]) { x.beginPath(); x.moveTo(6 + d * 1.5, 2.4); x.lineTo(6 + d * 2.6, 0.4); x.stroke(); }
      x.lineWidth = 0.9; x.strokeStyle = G; x.lineCap = 'round'; for (const lx of [3, 6, 9]) { x.beginPath(); x.moveTo(lx, 8); x.lineTo(lx + (f ? 1 : -1) * (lx === 6 ? 0 : 1), 9.6); x.stroke(); }
      x.beginPath(); x.moveTo(0.6, 6.4); x.quadraticCurveTo(0.6, 2.2, 6, 2.2); x.quadraticCurveTo(11.4, 2.2, 11.4, 6.4); x.quadraticCurveTo(11.4, 8.6, 6, 8.4); x.quadraticCurveTo(0.6, 8.6, 0.6, 6.4); x.closePath(); ink(x, rg(x, 6, 5, 6, shade(g, 0.4), G), 0.7);
      eye(x, 3.8, 5, 1.2, 0, 0); eye(x, 8.2, 5, 1.2, 0, 0);
    })));
  }

  // ---------------- bosses ----------------
  if (typeof drawSquid === 'function') {
    const _sq = drawSquid;
    drawSquid = function (x, y, e, t) { // eslint-disable-line no-func-assign
      if (!Modern.on()) return _sq(x, y, e, t);
      if (e && e.inv > 0 && (frame >> 2) & 1) return;
      const c = ctx; c.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const ph = t * 0.12 + k, pts = []; for (let s = 0; s <= 8; s++) pts.push([x + 6 + k * 5 + Math.sin(ph + s * 0.6) * 3, y + 30 + s * 3]); c.strokeStyle = INK; c.lineWidth = 5; path(c, pts); c.stroke(); c.strokeStyle = k % 2 ? '#a050c0' : '#c070e0'; c.lineWidth = 3.6; path(c, pts); c.stroke(); c.fillStyle = '#f0c0ff'; for (let s = 2; s <= 8; s += 2) { circ(c, pts[s][0] + 0.8, pts[s][1], 0.6); c.fill(); } }
      c.beginPath(); c.moveTo(x, y + 30); c.quadraticCurveTo(x - 1, y - 6, x + 18, y - 4); c.quadraticCurveTo(x + 37, y - 6, x + 36, y + 30); c.quadraticCurveTo(x + 18, y + 34, x, y + 30); c.closePath();
      ink(c, rg(c, x + 18, y + 12, 22, '#e8b0ff', '#8a40b0'), 1.1);
      c.fillStyle = 'rgba(255,255,255,0.18)'; for (const [sx, sy, r] of [[8, 4, 2], [26, 8, 1.6], [14, 9, 1.2], [30, 18, 1.4]]) { circ(c, x + sx, y + sy, r); c.fill(); }
      const angry = e && e.hp < e.maxHp; for (const ex of [10.5, 25.5]) { eye(c, x + ex, y + 18.5, 4.4, (e && e.face) || 0, angry ? 1.4 : 0); }
      c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x + 11, y + 27.4); c.quadraticCurveTo(x + 18, y + 25.4, x + 25, y + 27.4); c.stroke();
    };
  }
  if (typeof drawTRex === 'function') {
    const _tr = drawTRex;
    drawTRex = function (x, y, e, t) { // eslint-disable-line no-func-assign
      if (!Modern.on()) return _tr(x, y, e, t);
      if (e && e.inv > 0 && (frame >> 2) & 1) return;
      const C = hCtx || ctx, face = e ? e.face || -1 : -1; C.save(); if (face > 0) { C.translate(x * 2 + 48, 0); C.scale(-1, 1); }
      const l = e && e.state === 'charge' ? (t >> 2) & 1 : (t >> 4) & 1, open = e && (e.state === 'roar' || e.state === 'charge'), G = '#4a9a50', GD = '#2a6a30';
      for (const [lx, d] of [[13 + l * 2, 0], [25 - l * 2, 1]]) { rrect(C, x + lx - 1, y + 28, 7, 12, 2.4); ink(C, d ? GD : '#3a8a40'); rrect(C, x + lx - 2, y + 38, 9, 2.4, 1); ink(C, GD, 0.8); }
      C.beginPath(); C.moveTo(x + 30, y + 14); C.quadraticCurveTo(x + 44, y + 13, x + 48, y + 19); C.quadraticCurveTo(x + 42, y + 22, x + 32, y + 24); C.closePath(); ink(C, lg(C, 0, y + 13, 0, y + 24, [[0, '#6aba70'], [1, GD]]));
      ell(C, x + 22, y + 21, 14.4, 11.4); ink(C, rg(C, x + 22, y + 21, 15, '#7ac880', '#3a7a40'), 1.1);
      ell(C, x + 21, y + 25, 8.4, 5.4); C.fillStyle = '#c8e0a0'; C.fill();
      C.fillStyle = GD; for (let k = 0; k < 5; k++) { const sx = x + 14 + k * 5; path(C, [[sx - 2, y + 11.4 - (k ? 0 : 0)], [sx + 0.6, y + 6.4], [sx + 2.6, y + 11]]); C.fill(); }
      rrect(C, x + 9, y + 17.4, 6, 3, 1.4); ink(C, G, 0.8);
      C.beginPath(); C.moveTo(x + 20, y + 3); C.quadraticCurveTo(x + 20, y - 1, x + 10, y - 0.5); C.quadraticCurveTo(x - 0.6, y, x, y + 7); C.lineTo(x, y + (open ? 9 : 12.4)); C.lineTo(x + 12, y + (open ? 9.4 : 12.6)); C.quadraticCurveTo(x + 20, y + 13, x + 20, y + 3); C.closePath(); ink(C, lg(C, 0, y, 0, y + 13, [[0, '#7ac880'], [1, '#3a8a40']]), 1.1);
      if (open) { C.beginPath(); C.moveTo(x, y + 9); C.lineTo(x + 12, y + 9.4); C.quadraticCurveTo(x + 10, y + 16, x + 1, y + 15); C.closePath(); ink(C, '#a02030', 0.9); C.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { path(C, [[x + 1 + k * 3, y + 9.2], [x + 2 + k * 3, y + 11.4], [x + 3 + k * 3, y + 9.2]]); C.fill(); } }
      else { C.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { path(C, [[x + 1 + k * 3, y + 12.4], [x + 2 + k * 3, y + 14], [x + 3 + k * 3, y + 12.4]]); C.fill(); } }
      const dz = e && e.state === 'dizzy'; glow(C, x + 6.4, y + 4.6, 3.4, dz ? 'rgba(255,224,64,0.5)' : 'rgba(255,48,64,0.5)'); C.fillStyle = dz ? '#ffe040' : '#ff3040'; ell(C, x + 6.4, y + 4.6, 1.8, 1.4); C.fill(); C.fillStyle = INK; ell(C, x + 6.2, y + 4.6, 0.5, 1.2); C.fill();
      C.strokeStyle = INK; C.lineWidth = 0.8; C.beginPath(); C.moveTo(x + 3.6, y + 2.6); C.lineTo(x + 9, y + 3.2); C.stroke();
      C.restore();
      if (dz) for (let k = 0; k < 3; k++) { const a = frame * 0.15 + k * 2.1; txt('*', Math.round(x + (face > 0 ? 38 : 10) + Math.cos(a) * 9), Math.round(y - 8 + Math.sin(a) * 3), '#ffe040'); }
    };
  }
  if (typeof drawVolt === 'function') {
    const _vo = drawVolt;
    drawVolt = function (cx, feet, face, t, pose) { // eslint-disable-line no-func-assign
      if (!Modern.on()) return _vo(cx, feet, face, t, pose);
      const x = cx - 5, y = feet - 22, run = pose === 'run', leg = run ? ((t >> 2) & 1) : 0;
      const C = hCtx || ctx; C.save(); if (face < 0) { C.translate(x * 2 + 10, 0); C.scale(-1, 1); }
      for (const [lx, d] of [[3.4 + leg * 2, 0], [7.4 - leg * 2, 1]]) { rrect(C, x + lx - 1.4, y + 15, 2.8, 6, 1); ink(C, d ? '#20204a' : '#303060', 0.8); rrect(C, x + lx - 2, y + 19.8, 4.4, 2.2, 0.9); ink(C, '#ff3040', 0.7); }
      rrect(C, x + 1.4, y + 8.4, 8.2, 7.6, 2); ink(C, lg(C, x, 0, x + 10, 0, [[0, '#e0a820'], [0.5, '#ffe060'], [1, '#e0a820']]));
      C.fillStyle = '#2a6aff'; path(C, [[x + 6.4, y + 9.4], [x + 4, y + 12.6], [x + 5.6, y + 12.6], [x + 4.6, y + 15], [x + 7.4, y + 11.6], [x + 5.8, y + 11.6]]); C.fill();
      C.fillStyle = '#2a6aff'; for (let k = 0; k < 5; k++) { path(C, [[x - 1 + k * 2.6, y + 2.6], [x - 3 + k * 2.4 - (k === 0 ? 2 : 0), y - 2.6 + (k % 2) * 1.4], [x + 1.6 + k * 2.6, y + 1.6]]); C.fill(); C.strokeStyle = INK; C.lineWidth = 0.5; C.stroke(); }
      blob(C, x + 5.6, y + 4.6, 3.8, 3.6, '#f0c090', '#ffe0c0');
      C.fillStyle = '#2a6aff'; C.beginPath(); C.moveTo(x + 1.8, y + 3.4); C.quadraticCurveTo(x + 4, y + 0.2, x + 9.2, y + 2.2); C.quadraticCurveTo(x + 6, y + 2.4, x + 4.4, y + 4); C.closePath(); C.fill();
      C.fillStyle = INK; ell(C, x + 7.4, y + 4.4, 0.7, 1); C.fill(); C.strokeStyle = INK; C.lineWidth = 0.6; C.beginPath(); C.moveTo(x + 6.4, y + 6.6); C.quadraticCurveTo(x + 7.6, y + 7.4, x + 8.6, y + 6.2); C.stroke();
      if (run && (t >> 1) & 1) { C.strokeStyle = '#ffe040'; C.lineWidth = 0.8; C.beginPath(); C.moveTo(x - 2, y + 10); C.lineTo(x - 6, y + 9); C.lineTo(x - 5, y + 11); C.lineTo(x - 9, y + 10); C.moveTo(x - 3, y + 14); C.lineTo(x - 8, y + 14); C.stroke(); }
      C.restore();
    };
  }
  if (typeof drawBaronMech === 'function') {
    const _bm = drawBaronMech;
    drawBaronMech = function (x, y, e, t) { // eslint-disable-line no-func-assign
      if (!Modern.on()) return _bm(x, y, e, t);
      if (e && e.inv > 0 && (frame >> 2) & 1) return;
      const c = ctx, open = e && e.state === 'hatch', l = e && Math.abs(e.vx || 0) > 0.2 ? (t >> 3) & 1 : 0;
      for (const lx of [6 + l * 3, 36 - l * 3]) { rrect(c, x + lx, y + 44, 14, 16, 3); ink(c, lg(c, 0, y + 44, 0, y + 60, [[0, '#7a5aaa'], [1, '#3a2a58']]), 1); rrect(c, x + lx - 2, y + 57, 18, 3.6, 1.6); ink(c, '#2a1a40', 0.9); }
      for (const [ax, d] of [[-8, -1], [54, 1]]) { rrect(c, x + ax, y + 20, 10, 20, 3); ink(c, lg(c, x + ax, 0, x + ax + 10, 0, [[0, '#4a3a78'], [0.5, '#7a5aaa'], [1, '#4a3a78']])); glow(c, x + ax + 5, y + 39, 5, 'rgba(255,48,64,0.6)'); blob(c, x + ax + 5, y + 39, 3, 3, '#ff3040', '#ffa0a0'); }
      rrect(c, x, y + 16, 56, 30, 6); ink(c, lg(c, 0, y + 16, 0, y + 46, [[0, '#b080f0'], [0.35, '#7a4ab0'], [1, '#4a2a78']]), 1.2);
      for (const gx of [14, 42]) { c.save(); c.translate(x + gx, y + 32); c.rotate(t * 0.1 * (gx < 30 ? 1 : -1)); c.fillStyle = '#d0a040'; for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.fillRect(-1.4, -7.4, 2.8, 3); } circ(c, 0, 0, 5.6); ink(c, lg(c, -5, -5, 5, 5, [[0, '#ffe080'], [1, '#a07020']]), 0.8); c.fillStyle = INK; circ(c, 0, 0, 1.6); c.fill(); c.restore(); }
      rrect(c, x + 14, y, 28, 18, 6); c.save(); c.clip(); c.fillStyle = open ? '#ffe040' : lg(c, 0, y, 0, y + 18, [[0, '#a8ffff'], [1, '#30b0d0']]); c.fillRect(x + 14, y, 28, 18);
      blob(c, x + 28, y + 9, 5.4, 5, '#e8c8a8', '#fff0e0'); c.fillStyle = '#3a2a58'; c.beginPath(); c.ellipse(x + 28, y + 6, 5.6, 2.6, 0, Math.PI, 0); c.fill();
      c.fillStyle = INK; ell(c, x + 26, y + 9.4, 0.8, 1); c.fill(); ell(c, x + 30, y + 9.4, 0.8, 1); c.fill(); c.strokeStyle = '#a02040'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + 25.6, y + 12.4); c.quadraticCurveTo(x + 28, y + 11.6, x + 30.4, y + 12.4); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.3)'; ell(c, x + 20, y + 4, 4, 1.6, -0.4); c.fill(); c.restore(); rrect(c, x + 14, y, 28, 18, 6); c.strokeStyle = INK; c.lineWidth = 1.1; c.stroke();
      if (open) txt('!', x + 26, y - 14, '#ffe040', { outline: '#1a1020' }); else { c.strokeStyle = '#c0c8d8'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x + 28, y); c.lineTo(x + 28, y - 5); c.stroke(); const on = (t >> 3) & 1; glow(c, x + 28, y - 6.6, 4, on ? 'rgba(255,48,64,0.6)' : 'rgba(255,224,64,0.6)'); blob(c, x + 28, y - 6.6, 1.8, 1.8, on ? '#ff3040' : '#ffe040', '#ffffff'); }
    };
  }
  { // Play methods: Mothership, Crab, Drill Mole, Nimbus
    const PP = Play.prototype;
    const _mo = PP.drawMother;
    PP.drawMother = function (e, x, y) {
      if (!Modern.on()) return _mo.call(this, e, x, y);
      const c = ctx, bx = Math.round(e.beamX - (e.x - x)), top = y + 16;
      if (e.mode === 'charge' && (frame >> 1) & 1) { c.fillStyle = 'rgba(255,80,80,0.8)'; c.fillRect(bx - 1, top, 2, e.beamEnd - top); }
      if (e.mode === 'fire') { const g = c.createLinearGradient(bx - 13, 0, bx + 13, 0); g.addColorStop(0, 'rgba(255,90,200,0)'); g.addColorStop(0.3, 'rgba(255,112,224,0.8)'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.7, 'rgba(255,112,224,0.8)'); g.addColorStop(1, 'rgba(255,90,200,0)'); c.fillStyle = g; c.fillRect(bx - 13, top, 26, e.beamEnd - top); }
      if (e.inv > 0 && (frame >> 2) % 2) return;
      c.beginPath(); c.ellipse(x + 28, y + 6, 13, 10, 0, Math.PI, 0); c.closePath(); c.fillStyle = (() => { const g = c.createRadialGradient(x + 24, y - 1, 1, x + 28, y + 4, 14); g.addColorStop(0, 'rgba(240,252,255,0.95)'); g.addColorStop(1, 'rgba(120,200,240,0.85)'); return g; })(); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
      rrect(c, x + 22, y - 2, 12, 8, 2); ink(c, '#8a5a3a', 0.8); c.fillStyle = '#2a2a3a'; c.fillRect(x + 24, y, 8, 5); const ec = (frame >> 2) & 1 ? '#ff3040' : '#ff8030'; for (const ex of [26, 30]) { glow(c, x + ex, y + 2.4, 2.4, 'rgba(255,80,48,0.6)'); c.fillStyle = ec; circ(c, x + ex, y + 2.4, 0.9); c.fill(); }
      c.beginPath(); c.ellipse(x + 28, y + 11, 33, 6.6, 0, 0, Math.PI * 2); ink(c, lg(c, 0, y + 4, 0, y + 18, [[0, '#e8ecff'], [0.45, '#b8c0d8'], [1, '#5a6080']]), 1.1);
      c.beginPath(); c.ellipse(x + 28, y + 16.4, 22, 3.4, 0, 0, Math.PI); ink(c, '#5a6080', 0.9);
      for (let i = 0; i < 9; i++) { const k = ((frame >> 3) + i) % 3, lx = x + 2 + i * 6.6, ly = y + 11.4 + Math.sin(i / 8 * Math.PI) * 1.6, col = k === 0 ? '255,224,64' : k === 1 ? '255,48,64' : '95,240,255'; glow(c, lx, ly, 3, `rgba(${col},0.55)`); c.fillStyle = `rgb(${col})`; circ(c, lx, ly, 1.1); c.fill(); }
      if (e.mode === 'charge') { c.fillStyle = (frame >> 1) & 1 ? '#ff3040' : '#ffffff'; rrect(c, x + 22, y + 16, 12, 3, 1.4); c.fill(); }
    };
    const _cr = PP.drawCrab;
    PP.drawCrab = function (e, x, y) {
      if (!Modern.on()) return _cr.call(this, e, x, y);
      if (e.inv > 0 && (frame >> 2) % 2) return;
      const c = ctx, up = e.state === 'claw' ? -8 : e.state === 'leap' ? -5 : 0, step = (e.t >> 2) & 1;
      c.lineCap = 'round'; for (let k = 0; k < 3; k++) for (const d of [-1, 1]) { const bx = x + 17 + d * (8 + k * 4), lift = (k + step + (d > 0 ? 1 : 0)) & 1; c.strokeStyle = INK; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x + 17 + d * (5 + k * 3), y + 13); c.lineTo(bx + d * 2, y + 16 - lift); c.lineTo(bx + d * 3, y + 21 - lift); c.stroke(); c.strokeStyle = '#e83828'; c.lineWidth = 1.6; c.stroke(); }
      c.beginPath(); c.ellipse(x + 17, y + 10, 18, 8.4, 0, 0, Math.PI * 2); ink(c, lg(c, 0, y + 2, 0, y + 18, [[0, '#ff9080'], [0.5, '#e83828'], [1, '#a01810']]), 1.1);
      c.fillStyle = 'rgba(160,24,16,0.7)'; for (let k = 0; k < 4; k++) { circ(c, x + 10 + k * 5, y + 7.6, 1.1); c.fill(); } c.fillStyle = 'rgba(255,255,255,0.3)'; ell(c, x + 10, y + 5, 5, 1.4, -0.15); c.fill();
      for (const ex of [13, 21]) { c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + ex, y + 4); c.lineTo(x + ex, y - 2); c.stroke(); eye(c, x + ex, y - 4, 2.2, 0, 0); if (e.hp < e.maxHp) { c.fillStyle = 'rgba(255,32,32,0.6)'; circ(c, x + ex, y - 4, 2.3); c.fill(); } }
      for (const [cx2, d] of [[x - 1, -1], [x + 35, 1]]) { c.save(); c.translate(cx2, y + 6 + up); c.scale(d, 1); c.beginPath(); c.moveTo(-1, 2); c.quadraticCurveTo(-7, -3, -2, -6); c.quadraticCurveTo(0, -3, 2, -4.6); c.quadraticCurveTo(4, 2, -1, 2); c.closePath(); ink(c, lg(c, 0, -6, 0, 3, [[0, '#ffb0a0'], [1, '#d03020']]), 1); c.strokeStyle = INK; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-2, -6); c.lineTo(-1, -2.4); c.stroke(); c.restore(); }
    };
    const _ml = PP.drawMole;
    PP.drawMole = function (e, x, y) {
      if (!Modern.on() || e.state === 'under') return _ml.call(this, e, x, y);
      if (e.inv > 0 && (frame >> 2) % 2) return;
      const c = ctx, gy = Math.round(e.groundY + e.h);
      c.save(); c.beginPath(); c.rect(x - 10, 0, 50, gy); c.clip();
      for (const d of [-1, 1]) { blob(c, x + 12 + d * 12, y + 17, 2.6, 3.4, '#e8d0b0', '#fff0e0'); c.strokeStyle = INK; c.lineWidth = 0.5; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + 12 + d * 12 + k, y + 19); c.lineTo(x + 12 + d * 12 + k * 1.4, y + 21); c.stroke(); } }
      rrect(c, x + 1, y + 4, 22, 18, 8); ink(c, rg(c, x + 12, y + 12, 13, '#b090c0', '#5a3a6a'), 1.1);
      rrect(c, x + 3.6, y + 8.6, 16.8, 4.6, 2); ink(c, '#2a2a3a', 0.8); for (const gx of [8, 16]) { c.fillStyle = lg(c, x + gx - 3, 0, x + gx + 3, 0, [[0, '#4a5a7a'], [1, '#a0c0e8']]); ell(c, x + gx, y + 10.9, 2.6, 1.6); c.fill(); c.fillStyle = 'rgba(255,255,255,0.8)'; circ(c, x + gx - 1, y + 10.4, 0.5); c.fill(); }
      blob(c, x + 12, y + 15.6, 2.2, 1.6, '#ff90a0', '#ffd0d8');
      const sp = frame * 0.5; c.save(); c.beginPath(); c.moveTo(x + 7.6, y + 4.6); c.lineTo(x + 12, y - 4.6); c.lineTo(x + 16.4, y + 4.6); c.closePath(); c.fillStyle = lg(c, x + 8, 0, x + 16, 0, [[0, '#6a6e80'], [0.5, '#e8ecf8'], [1, '#6a6e80']]); c.fill(); c.clip(); c.strokeStyle = 'rgba(40,40,60,0.6)'; c.lineWidth = 0.8; for (let k = -2; k < 8; k++) { const yy = y - 4 + k * 1.6 + (sp % 1.6); c.beginPath(); c.moveTo(x + 6, yy + 1.4); c.lineTo(x + 18, yy - 1.4); c.stroke(); } c.restore();
      c.strokeStyle = INK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x + 7.6, y + 4.6); c.lineTo(x + 12, y - 4.6); c.lineTo(x + 16.4, y + 4.6); c.stroke();
      c.restore();
    };
    const _dg = PP.drawDragon;
    PP.drawDragon = function (e, x, y, cx) {
      if (!Modern.on()) return _dg.call(this, e, x, y, cx);
      const c = ctx, blink = e.inv > 0 && (frame >> 2) % 2;
      for (let k = 6; k >= 1; k--) { const tp = e.trail[Math.min(e.trail.length - 1, k * 6)]; if (!tp) continue; const bx = tp[0] - cx + 10, by = tp[1] + 6, r = 9 - k; circ(c, bx, by, r); c.fillStyle = (() => { const g = c.createRadialGradient(bx - r * 0.3, by - r * 0.4, 0.4, bx, by, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b8b0e8'); return g; })(); c.fill(); c.strokeStyle = 'rgba(120,110,190,0.6)'; c.lineWidth = 0.6; c.stroke(); }
      if (blink) return;
      const f = e.trail.length > 2 && e.trail[0][0] < e.trail[2][0] ? -1 : 1;
      c.save(); c.translate(x + 14, y + 8); c.scale(f, 1);
      c.beginPath(); c.moveTo(-14, -2); c.quadraticCurveTo(-12, -8, 2, -7); c.quadraticCurveTo(14, -6, 15, 1); c.quadraticCurveTo(14, 6, 2, 6.4); c.quadraticCurveTo(-12, 7, -14, -2); c.closePath(); ink(c, lg(c, 0, -8, 0, 7, [[0, '#ffffff'], [0.6, '#e8e4ff'], [1, '#a8a0e0']]), 1);
      c.fillStyle = '#ffd860'; for (const hx2 of [-10, -5]) { path(c, [[hx2, -6], [hx2 - 1.4, -12], [hx2 + 1.6, -6.4]]); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke(); }
      const ec = e.hp < e.maxHp ? '#ff3040' : '#7a4ae8'; glow(c, 6, -1.4, 3.6, e.hp < e.maxHp ? 'rgba(255,48,64,0.5)' : 'rgba(122,74,232,0.5)'); c.fillStyle = ec; ell(c, 6, -1.4, 2, 1.6); c.fill(); c.fillStyle = '#ffffff'; circ(c, 5.4, -2, 0.5); c.fill();
      c.fillStyle = INK; ell(c, 12.6, 2.6, 1.4, 0.8); c.fill();
      c.strokeStyle = '#b8b0e8'; c.lineWidth = 0.9; c.lineCap = 'round'; c.beginPath(); for (let k = 0; k < 9; k++) { const wx = 14 + k, wy = 3 + Math.sin(k * 0.8 + frame * 0.2) * 2; if (k) c.lineTo(wx, wy); else c.moveTo(wx, wy); } c.stroke();
      c.restore();
    };
  }
})();
