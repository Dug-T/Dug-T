// GOFFICHICK - weapon definitions and first-person weapon art
//
// ------------------------------------------------------------------
//  HOW TO ADD A NEW WEAPON
// ------------------------------------------------------------------
//  1. Add an entry to the WEAPONS array below. Fields:
//       slot      - number key that selects it (1-9). Several weapons may share a slot.
//       name      - shown on screen when picked up / selected
//       ammo      - one of the keys in AMMO_TYPES, or null for unlimited (melee)
//       cost      - ammo used per shot
//       cooldown  - seconds between shots
//       type      - 'melee' | 'hitscan' | 'projectile'
//         melee:      damage:[min,max], range (tiles)
//         hitscan:    damage:[min,max], pellets, spread (radians)
//         projectile: projectile: key of PROJECTILES in game.js (or add a new one there)
//       sound     - key of Sfx.play (audio.js)
//       windup    - optional delay before the shot happens (BFG charge)
//       kick      - screen shake strength
//       draw(g, cx, by, phase, flash, t) - draws the gun. cx = screen centre x,
//                   by = bottom of the 3D view, phase = 0 idle .. 1 end of fire anim.
//                   The gun is drawn on a 3x-resolution layer, so gradients, curves and
//                   fractional sizes all show. WDraw has shaded metal, wood, hands etc.
//  2. Add a pickup letter for it in levels.js (ITEM_TYPES) and a pickup sprite in sprites.js.
//  That's it - the HUD, weapon switching and ammo handling pick it up automatically.
// ------------------------------------------------------------------
'use strict';

const AMMO_TYPES = {
  bullets: { name: 'BULLETS', max: 200 },
  shells: { name: 'SHELLS', max: 50 },
  skulls: { name: 'SKULLS', max: 50 },
  rockets: { name: 'ROCKETS', max: 50 },
  souls: { name: 'SOULS', max: 300 },
};

// ---------- shared drawing helpers: realistic shading ----------
const WDraw = (() => {
  const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };
  const rad = (g, x, y, r, stops) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };
  const poly = (g, fill, pts) => { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  const ell = (g, fill, x, y, rx, ry, rot = 0) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); g.fill(); };
  const rr = (g, fill, x, y, w, h, r) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const line = (g, color, w, pts) => { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };

  // metal palettes: shading across a cylinder or a bevelled block, left -> right
  const PAL = {
    gun: [[0, '#0d0e10'], [0.16, '#2b2e33'], [0.36, '#80858f'], [0.46, '#4a4e56'], [0.78, '#22252a'], [1, '#08090a']],
    blued: [[0, '#0a0c12'], [0.2, '#252a38'], [0.38, '#7d879f'], [0.5, '#3a4154'], [0.8, '#1a1e28'], [1, '#07080b']],
    steel: [[0, '#3a3c40'], [0.2, '#8a8e96'], [0.4, '#e2e5ea'], [0.52, '#a3a7af'], [0.8, '#5c6066'], [1, '#2a2c30']],
    polymer: [[0, '#0b0b0c'], [0.25, '#1f2022'], [0.45, '#3a3b3e'], [0.6, '#242527'], [1, '#09090a']],
    olive: [[0, '#1c2214'], [0.2, '#3f4a2c'], [0.4, '#7a8a58'], [0.55, '#55623d'], [0.85, '#2c341f'], [1, '#14180e']],
    brass: [[0, '#4a3510'], [0.3, '#b08a2e'], [0.45, '#f4dc8a'], [0.6, '#b8902f'], [1, '#3a280a']],
  };
  const metal = (g, x0, x1, pal = 'gun') => lin(g, x0, 0, x1, 0, PAL[pal]);

  // a barrel / tube receding into the screen: back (near, wide) at yb, front (far, narrow) at yf
  function tube(g, cx, yb, wb, yf, wf, pal = 'gun') {
    poly(g, metal(g, cx - wb / 2, cx + wb / 2, pal), [cx - wb / 2, yb, cx - wf / 2, yf, cx + wf / 2, yf, cx + wb / 2, yb]);
  }
  function bore(g, cx, y, w, rim = 'gun') {
    ell(g, metal(g, cx - w / 2, cx + w / 2, rim), cx, y, w / 2, w * 0.22);
    ell(g, '#030304', cx, y, w * 0.36, w * 0.14);
  }
  // walnut with grain, clipped to a polygon
  function wood(g, pts, x0, x1) {
    poly(g, lin(g, x0, 0, x1, 0, [[0, '#2a140a'], [0.3, '#6b3a1e'], [0.5, '#8a4f2a'], [0.75, '#5a2f17'], [1, '#22100a']]), pts);
    g.save(); g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.clip();
    g.strokeStyle = 'rgba(30,12,4,0.45)'; g.lineWidth = 0.6;
    const ys = pts.filter((_, i) => i % 2), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (let i = 0; i < 9; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / 9; g.beginPath(); g.moveTo(x, y1); g.bezierCurveTo(x + 3, y1 - (y1 - y0) * 0.3, x - 3, y0 + (y1 - y0) * 0.3, x + 1, y0); g.stroke(); }
    g.fillStyle = 'rgba(255,220,180,0.12)'; g.fillRect(x0 + (x1 - x0) * 0.42, y0, (x1 - x0) * 0.08, y1 - y0);
    g.restore();
  }
  // realistic muzzle flash: hot core, glow and irregular spikes
  function flash(g, x, y, r) {
    g.save(); g.globalCompositeOperation = 'lighter';
    ell(g, rad(g, x, y, r * 1.6, [[0, 'rgba(255,240,200,0.9)'], [0.35, 'rgba(255,170,60,0.55)'], [1, 'rgba(255,80,0,0)']]), x, y, r * 1.6, r * 1.3);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, l = r * (0.8 + Math.random() * 1.1), w = r * 0.22;
      poly(g, 'rgba(255,200,110,0.85)', [x + Math.cos(a + 1.57) * w, y + Math.sin(a + 1.57) * w, x + Math.cos(a) * l, y + Math.sin(a) * l, x + Math.cos(a - 1.57) * w, y + Math.sin(a - 1.57) * w]);
    }
    ell(g, '#fffbe8', x, y, r * 0.45, r * 0.35);
    g.restore();
  }

  // ---- Goffichick's arms: black lace sleeves, pink ribbon, pale skin, black nails ----
  const SK = { hi: '#fbe6dc', mid: '#efc9b8', lo: '#cf9886', deep: '#a8705f' };
  const NAIL = '#121015', NAIL_HI = '#6a5a70';
  function sleeve(g, x, y, w, tilt = 0) {
    const bx = x + tilt, by = y + 140;
    poly(g, lin(g, x - w, 0, x + w, 0, [[0, '#050406'], [0.4, '#2a2430'], [0.6, '#1a161e'], [1, '#040305']]), [x - w * 0.55, y, x + w * 0.55, y, bx + w, by, bx - w, by]);
    g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#4a4252'; g.lineWidth = 0.6; // lace pattern
    for (let k = 0; k < 5; k++) for (let j = -2; j <= 2; j++) { g.beginPath(); g.arc(x + j * w * 0.3 + tilt * k / 5, y + 18 + k * 22, 3, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    rr(g, lin(g, 0, y, 0, y + 4, [[0, '#ff7cc4'], [1, '#c2186f']]), x - w * 0.58, y - 1, w * 1.16, 4, 2); // ribbon cuff
  }
  // right hand wrapped round a pistol grip, seen from behind
  function gripHand(g, x, y, s = 1, dir = 1) {
    sleeve(g, x + 4 * dir * s, y + 22 * s, 22 * s, 6 * dir);
    // back of hand
    g.fillStyle = lin(g, x - 18 * s, y - 14 * s, x + 18 * s, y + 20 * s, [[0, SK.hi], [0.55, SK.mid], [1, SK.lo]]);
    g.beginPath(); g.moveTo(x - 17 * s, y - 6 * s); g.quadraticCurveTo(x, y - 16 * s, x + 17 * s, y - 8 * s);
    g.lineTo(x + 15 * s, y + 22 * s); g.quadraticCurveTo(x, y + 26 * s, x - 15 * s, y + 22 * s); g.closePath(); g.fill();
    // knuckles + tendons
    for (let i = 0; i < 4; i++) ell(g, 'rgba(255,255,255,0.22)', x + (-11 + i * 7.3) * s, y - 7 * s + Math.abs(i - 1.5) * s, 3 * s, 1.6 * s);
    for (let i = 0; i < 4; i++) line(g, 'rgba(160,100,85,0.25)', 0.7 * s, [x + (-10 + i * 7) * s, y - 4 * s, x + (-6 + i * 4) * s, y + 18 * s]);
    // curled finger tips showing on the far side of the grip
    for (let i = 0; i < 4; i++) {
      const fy = y - 2 * s + i * 6 * s;
      rr(g, lin(g, 0, fy, 0, fy + 5 * s, [[0, SK.mid], [1, SK.lo]]), x - 22 * s * dir - (dir > 0 ? 0 : 7 * s), fy, 8 * s, 5.2 * s, 2.5 * s);
      rr(g, NAIL, x - 22 * s * dir - (dir > 0 ? 0 : 7 * s) + (dir > 0 ? 0 : 4 * s), fy + 0.8 * s, 3.4 * s, 3.6 * s, 1.5 * s);
    }
    // thumb along the near side
    g.fillStyle = lin(g, x + 10 * s * dir, y, x + 22 * s * dir, y, [[0, SK.mid], [1, SK.lo]]);
    g.beginPath(); g.ellipse(x + 15 * s * dir, y - 4 * s, 5 * s, 13 * s, 0.25 * dir, 0, Math.PI * 2); g.fill();
    ell(g, NAIL, x + 13.5 * s * dir, y - 14 * s, 2.6 * s, 3.4 * s, 0.25 * dir); ell(g, NAIL_HI, x + 13 * s * dir, y - 15.5 * s, 0.8 * s, 1.2 * s);
  }
  // left hand supporting from underneath. Call supportHand BEFORE drawing the part it holds,
  // then supportFingers AFTER it: the palm is hidden under the gun, the fingers curl over
  // its left edge and the thumb lies along its right edge.
  function supportHand(g, x, y, w, s = 1) {
    sleeve(g, x - 6 * s, y + 2 * s, 16 * s, -26);
    g.fillStyle = lin(g, x - w / 2, y, x + w / 2, y + 8 * s, [[0, SK.hi], [0.6, SK.mid], [1, SK.lo]]);
    g.beginPath(); g.moveTo(x - w / 2 - 2 * s, y - 12 * s); g.lineTo(x + w / 2 + 2 * s, y - 12 * s);
    g.lineTo(x + w / 2 - 2 * s, y + 2 * s); g.quadraticCurveTo(x, y + 7 * s, x - w / 2 + 2 * s, y + 2 * s); g.closePath(); g.fill();
  }
  function supportFingers(g, x, y, w, s = 1) {
    for (let i = 0; i < 3; i++) {
      const fx = x - w / 2 - 3 * s + i * 0.6 * s, fy = y - 13 * s + i * 5.2 * s;
      rr(g, lin(g, fx, 0, fx + 8 * s, 0, [[0, SK.lo], [0.55, SK.mid], [1, SK.hi]]), fx, fy, 8 * s, 4.6 * s, 2.3 * s);
      rr(g, NAIL, fx + 4.8 * s, fy + 0.7 * s, 3 * s, 3.2 * s, 1.4 * s);
      ell(g, NAIL_HI, fx + 6 * s, fy + 1.3 * s, 0.6 * s, 0.6 * s);
    }
    g.fillStyle = lin(g, x + w / 2 - 3 * s, y, x + w / 2 + 5 * s, y, [[0, SK.mid], [1, SK.lo]]);
    g.beginPath(); g.ellipse(x + w / 2 + 0.5 * s, y - 6 * s, 3.6 * s, 9 * s, -0.15, 0, Math.PI * 2); g.fill();
    ell(g, NAIL, x + w / 2 + 1.3 * s, y - 13.2 * s, 2 * s, 2.6 * s, -0.15);
  }
  // a clenched fist from behind (knuckle ridge on top, thumb across the front)
  function fist(g, x, y, s = 1, dir = 1) {
    sleeve(g, x, y + 20 * s, 22 * s, 8 * dir);
    g.fillStyle = lin(g, x - 18 * s, y - 16 * s, x + 18 * s, y + 22 * s, [[0, SK.hi], [0.5, SK.mid], [1, SK.lo]]);
    g.beginPath(); g.roundRect(x - 18 * s, y - 16 * s, 36 * s, 38 * s, 10 * s); g.fill();
    for (let i = 0; i < 4; i++) {
      const fx = x + (-17 + i * 8.6) * s;
      rr(g, lin(g, 0, y - 18 * s, 0, y - 4 * s, [[0, SK.hi], [0.6, SK.mid], [1, SK.lo]]), fx, y - 18 * s, 8 * s, 14 * s, 3.5 * s);
      ell(g, 'rgba(255,255,255,0.35)', fx + 4 * s, y - 15 * s, 2.5 * s, 1.4 * s);
    }
    g.fillStyle = lin(g, 0, y - 4 * s, 0, y + 6 * s, [[0, SK.mid], [1, SK.deep]]);
    g.beginPath(); g.roundRect(x + (dir > 0 ? -18 : 0) * s, y - 4 * s, 18 * s, 8 * s, 4 * s); g.fill();
    rr(g, NAIL, x + (dir > 0 ? -19 : 13) * s, y - 3.4 * s, 5 * s, 6.4 * s, 2 * s);
  }
  return { lin, rad, poly, ell, rr, line, metal, tube, bore, wood, flash, sleeve, gripHand, supportHand, supportFingers, fist, PAL };
})();

const WEAPONS = [
  {
    slot: 1, key: 'knuckles', name: 'SPIKED KNUCKLES', ammo: null, cost: 0, cooldown: 0.42,
    type: 'melee', damage: [10, 28], range: 1.3, sound: 'punch', kick: 0,
    draw(g, cx, by, phase) {
      const { poly, rr, fist, metal } = WDraw;
      const knuckles = (x, y, s) => {
        rr(g, metal(g, x - 19 * s, x + 19 * s, 'steel'), x - 19 * s, y - 20 * s, 38 * s, 7 * s, 3 * s);
        for (let i = 0; i < 4; i++) poly(g, metal(g, x + (-17 + i * 8.6) * s, x + (-9 + i * 8.6) * s, 'steel'), [x + (-17 + i * 8.6) * s, y - 20 * s, x + (-13 + i * 8.6) * s, y - 30 * s, x + (-9 + i * 8.6) * s, y - 20 * s]);
      };
      const punch = phase > 0 ? Math.sin(Math.min(1, phase) * Math.PI) : 0;
      fist(g, cx - 96, by - 40, 1.1, -1); knuckles(cx - 96, by - 40, 1.1);
      const x = cx + 86 - punch * 76, y = by - 46 - punch * 52, s = 1.15 + punch * 0.5;
      fist(g, x, y, s, 1); knuckles(x, y, s);
    },
  },
  {
    slot: 2, key: 'pistol', name: 'HEX PISTOL', ammo: 'bullets', cost: 1, cooldown: 0.36,
    type: 'hitscan', damage: [6, 15], pellets: 1, spread: 0.015, sound: 'pistol', kick: 1,
    draw(g, cx, by, phase, flash) {
      const { lin, poly, ell, rr, tube, metal, flash: fl, gripHand, supportHand, supportFingers } = WDraw;
      const rec = phase > 0 ? Math.sin(Math.min(1, phase * 1.4) * Math.PI) * 9 : 0;
      const slide = phase > 0 && phase < 0.35 ? Math.sin(phase / 0.35 * Math.PI) * 7 : 0;
      const x = cx + 8, yb = by - 70 + rec, yf = by - 104 + rec;
      // grip + frame
      poly(g, metal(g, x - 15, x + 15, 'polymer'), [x - 13, yb + 18, x + 13, yb + 18, x + 16, by + 20, x - 16, by + 20]);
      g.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 40; i++) g.fillRect(x - 11 + (i % 8) * 3, yb + 24 + Math.floor(i / 8) * 5, 1, 1);
      // slide top receding to the muzzle
      tube(g, x, yb + slide, 30, yf, 19, 'gun');
      line3(g, x, yb + slide, yf);
      // rear face of the slide with serrations and the rear sight
      rr(g, metal(g, x - 15, x + 15, 'gun'), x - 15, yb + slide, 30, 20, 2);
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 14, yb + slide + 3 + i * 2.6, 5, 1); g.fillRect(x + 9, yb + slide + 3 + i * 2.6, 5, 1); }
      rr(g, '#0b0b0d', x - 9, yb + slide - 5, 7, 6, 1); rr(g, '#0b0b0d', x + 2, yb + slide - 5, 7, 6, 1);
      ell(g, '#ff9fd8', x - 5.5, yb + slide - 2, 1.2, 1.2); ell(g, '#ff9fd8', x + 5.5, yb + slide - 2, 1.2, 1.2);
      // front sight + muzzle
      rr(g, '#0b0b0d', x - 1.6, yf - 5, 3.2, 6, 1); ell(g, '#ffffff', x, yf - 3, 1, 1);
      ell(g, '#050506', x, yf + 2, 4, 2);
      // engraved crescent on the slide
      g.strokeStyle = 'rgba(200,140,220,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.arc(x, yb + slide + 10, 4, 0.7, 5.6); g.stroke();
      if (flash) fl(g, x, yf - 6, 16);
      gripHand(g, x + 2, yb + 34, 1, 1);
      function line3(g, x, y0, y1) { g.fillStyle = 'rgba(255,255,255,0.18)'; poly(g, 'rgba(255,255,255,0.14)', [x - 1.5, y0, x - 0.8, y1, x + 0.8, y1, x + 1.5, y0]); }
    },
  },
  {
    slot: 3, key: 'shotgun', name: 'SHOTGUN', ammo: 'shells', cost: 1, cooldown: 0.9,
    type: 'hitscan', damage: [5, 15], pellets: 7, spread: 0.09, sound: 'shotgun', after: 'shotgunPump', kick: 3,
    draw(g, cx, by, phase, flash) {
      const { lin, poly, ell, rr, tube, bore, metal, flash: fl, gripHand, supportHand, supportFingers } = WDraw;
      const rec = phase > 0 ? Math.sin(Math.min(1, phase * 2.2) * Math.PI) * 13 : 0;
      const pump = phase > 0.3 && phase < 0.9 ? Math.sin((phase - 0.3) / 0.6 * Math.PI) * 20 : 0;
      const x = cx + 4, yb = by - 52 + rec, yf = by - 128 + rec;
      supportHand(g, x, by - 76 + rec + pump, 38, 1.05);
      // receiver
      poly(g, metal(g, x - 24, x + 24, 'blued'), [x - 19, yb, x + 19, yb, x + 25, by + 20, x - 25, by + 20]);
      rr(g, '#050608', x + 6, yb + 10, 10, 16, 2); // ejection port
      if (pump > 4) { rr(g, lin(g, x + 7, 0, x + 15, 0, [[0, '#7a0c16'], [0.5, '#e2283c'], [1, '#6a0a12']]), x + 7, yb + 12, 8, 10, 2); rr(g, WDraw.metal(g, x + 7, x + 15, 'brass'), x + 7, yb + 20, 8, 3, 1); }
      // barrel over magazine tube
      tube(g, x, yb, 22, yf + 6, 12, 'blued');
      tube(g, x, yb + 2, 15, yf, 8, 'blued');
      bore(g, x, yf, 8, 'blued');
      ell(g, WDraw.metal(g, x - 2, x + 2, 'steel'), x, yf - 2.5, 1.7, 1.7); // bead sight
      // pump
      const py0 = by - 74 + rec + pump, py1 = by - 100 + rec + pump;
      poly(g, metal(g, x - 22, x + 22, 'polymer'), [x - 22, py0, x - 16, py1, x + 16, py1, x + 22, py0]);
      for (let i = 1; i < 6; i++) { const yy = py0 + (py1 - py0) * i / 6, hw = 22 - 6 * i / 6; g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(x - hw, yy, hw * 2, 1); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - hw, yy + 1, hw * 2, 1); }
      supportFingers(g, x, py0 - 4, 40, 1.05);
      if (flash) fl(g, x, yf - 8, 22);
      gripHand(g, x + 22, by - 6, 1.1, 1);
    },
  },
  {
    slot: 3, key: 'coffin', name: 'COFFIN SHOTGUN (double barrel)', ammo: 'shells', cost: 2, cooldown: 1.35,
    type: 'hitscan', damage: [5, 15], pellets: 20, spread: 0.19, sound: 'shotgun', after: 'shotgunPump', kick: 5,
    draw(g, cx, by, phase, flash) {
      const { lin, poly, ell, rr, tube, bore, metal, wood, flash: fl, gripHand, supportHand, supportFingers } = WDraw;
      const rec = phase > 0 ? Math.sin(Math.min(1, phase * 2) * Math.PI) * 18 : 0;
      const brk = phase > 0.35 && phase < 0.9 ? Math.sin((phase - 0.35) / 0.55 * Math.PI) * 26 : 0; // break-open reload
      const x = cx, yb = by - 56 + rec, yf = by - 126 + rec + brk * 1.6;
      supportHand(g, x, by - 80 + rec + brk * 0.8, 44, 1.1);
      // engraved silver receiver
      poly(g, metal(g, x - 28, x + 28, 'steel'), [x - 24, yb, x + 24, yb, x + 30, by + 20, x - 30, by + 20]);
      g.strokeStyle = 'rgba(40,40,46,0.55)'; g.lineWidth = 0.6;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x - 12 + i * 8, yb + 22, 4, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(x - 8 + i * 8, yb + 30, 4, 0, Math.PI); g.stroke(); }
      // two barrels side by side, with a rib
      tube(g, x - 9, yb + brk, 19, yf, 11, 'blued');
      tube(g, x + 9, yb + brk, 19, yf, 11, 'blued');
      poly(g, metal(g, x - 2, x + 2, 'steel'), [x - 2, yb + brk, x - 1, yf, x + 1, yf, x + 2, yb + brk]);
      bore(g, x - 5.5, yf, 10, 'blued'); bore(g, x + 5.5, yf, 10, 'blued');
      ell(g, '#e8e8ee', x, yf - 2, 1.4, 1.4);
      // coffin-shaped walnut forend with a silver bat inlay
      const fy0 = by - 76 + rec + brk * 0.7, fy1 = by - 102 + rec + brk * 1.1;
      wood(g, [x - 30, fy0 - 8, x - 24, fy1, x + 24, fy1, x + 30, fy0 - 8, x + 22, fy0 + 8, x - 22, fy0 + 8], x - 30, x + 30);
      poly(g, metal(g, x - 10, x + 10, 'steel'), [x, fy0 - 10, x - 10, fy0 - 14, x - 7, fy0 - 9, x - 12, fy0 - 8, x - 4, fy0 - 3, x, fy0 - 5, x + 4, fy0 - 3, x + 12, fy0 - 8, x + 7, fy0 - 9, x + 10, fy0 - 14]);
      supportFingers(g, x, fy0 + 2, 50, 1.1);
      if (flash) { fl(g, x - 6, yf - 8, 22); fl(g, x + 6, yf - 8, 22); }
      gripHand(g, x + 26, by - 6, 1.15, 1);
    },
  },
  {
    slot: 4, key: 'machinegun', name: 'MACHINE GUN', ammo: 'bullets', cost: 1, cooldown: 0.085,
    type: 'hitscan', damage: [5, 14], pellets: 1, spread: 0.022, sound: 'pistol', kick: 1, auto: true,
    draw(g, cx, by, phase, flash) {
      const { lin, poly, ell, rr, tube, bore, metal, flash: fl, gripHand, supportHand, supportFingers } = WDraw;
      const jit = phase > 0 ? (Math.random() - 0.5) * 3 : 0;
      const x = cx + 10 + jit, rec = phase > 0 ? 3 + Math.random() * 3 : 0;
      const yb = by - 54 + rec, yh = by - 98 + rec, yf = by - 132 + rec;
      supportHand(g, x, yb - 18, 30, 1);
      // curved magazine dropping down on the left
      poly(g, metal(g, x - 40, x - 12, 'gun'), [x - 14, yb + 6, x - 28, yb + 4, x - 42, by + 20, x - 24, by + 20]);
      for (let i = 0; i < 5; i++) line2(x - 16 - i * 2.6, yb + 10 + i * 9, x - 26 - i * 2.6, yb + 10 + i * 9);
      // upper receiver
      poly(g, metal(g, x - 20, x + 20, 'gun'), [x - 17, yb, x + 17, yb, x + 22, by + 20, x - 22, by + 20]);
      // handguard with vent holes
      poly(g, metal(g, x - 20, x + 20, 'polymer'), [x - 18, yb, x - 12, yh, x + 12, yh, x + 18, yb]);
      for (let r = 0; r < 5; r++) for (const side of [-1, 1]) { const t = (r + 0.5) / 5, yy = yb + (yh - yb) * t, hw = 18 - 6 * t; ell(g, '#050506', x + side * hw * 0.55, yy, 2.2 - t, 1.3 - t * 0.4); }
      // A-frame front sight + barrel + flash hider
      poly(g, metal(g, x - 9, x + 9, 'gun'), [x - 9, yh + 2, x - 1.2, yh - 16, x + 1.2, yh - 16, x + 9, yh + 2]);
      poly(g, '#050506', [x - 4, yh, x, yh - 10, x + 4, yh]);
      tube(g, x, yh, 7, yf, 5, 'gun');
      tube(g, x, yf + 12, 7, yf, 6, 'gun');
      for (let i = 0; i < 3; i++) { g.fillStyle = '#050506'; g.fillRect(x - 2.6, yf + 2 + i * 3, 1, 2); g.fillRect(x + 1.6, yf + 2 + i * 3, 1, 2); }
      bore(g, x, yf, 6);
      // rear aperture sight on the carry handle
      rr(g, metal(g, x - 7, x + 7, 'gun'), x - 7, yb - 14, 14, 16, 2);
      g.strokeStyle = '#050506'; g.lineWidth = 2; g.beginPath(); g.arc(x, yb - 8, 3, 0, Math.PI * 2); g.stroke();
      ell(g, '#ff4fb8', x, yb - 8, 0.8, 0.8);
      supportFingers(g, x, yb - 18, 32, 1);
      if (flash) fl(g, x, yf - 6, 15);
      gripHand(g, x + 22, by - 6, 1.1, 1);
      function line2(x0, y0, x1, y1) { g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    },
  },
  {
    slot: 4, key: 'gatling', name: 'GATLING GUN', ammo: 'bullets', cost: 1, cooldown: 0.1,
    type: 'hitscan', damage: [6, 15], pellets: 1, spread: 0.03, sound: 'gatling', kick: 1, auto: true,
    draw(g, cx, by, phase, flash, t) {
      const { lin, poly, ell, rr, metal, bore, flash: fl, fist, PAL } = WDraw;
      const spin = (t || 0) * (phase > 0 ? 30 : 0.6);
      const shake = phase > 0 ? (Math.random() - 0.5) * 3 : 0;
      const x = cx + shake, yb = by - 54 + (phase > 0 ? 3 : 0), yf = by - 126;
      // motor housing + handles
      rr(g, metal(g, x - 46, x + 46, 'gun'), x - 46, yb + 6, 92, 70, 10);
      for (let i = 0; i < 6; i++) rr(g, 'rgba(0,0,0,0.55)', x - 30 + i * 11, yb + 20, 5, 26, 2);
      ell(g, metal(g, x - 36, x + 36, 'gun'), x, yb + 4, 36, 15);
      // six rotating barrels converging into the distance
      const bars = [];
      for (let i = 0; i < 6; i++) { const a = spin + i * Math.PI / 3; bars.push({ a, depth: Math.sin(a) }); }
      bars.sort((p, q) => p.depth - q.depth);
      for (const { a, depth } of bars) {
        const bx = x + Math.cos(a) * 22, byy = yb + Math.sin(a) * 9, fx = x + Math.cos(a) * 10, fy = yf + Math.sin(a) * 4;
        const shade = 0.55 + 0.45 * (depth + 1) / 2;
        g.save(); g.globalAlpha = 1; poly(g, metal(g, bx - 5, bx + 5, 'blued'), [bx - 5, byy, fx - 2.4, fy, fx + 2.4, fy, bx + 5, byy]);
        g.fillStyle = `rgba(0,0,0,${0.6 - shade * 0.6})`; g.beginPath(); g.moveTo(bx - 5, byy); g.lineTo(fx - 2.4, fy); g.lineTo(fx + 2.4, fy); g.lineTo(bx + 5, byy); g.fill(); g.restore();
        ell(g, '#050506', fx, fy, 1.8, 0.9);
      }
      // clamp ring part-way up the barrels
      g.strokeStyle = metal(g, x - 16, x + 16, 'steel'); g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, yb + (yf - yb) * 0.55, 17, 6.5, 0, 0, Math.PI * 2); g.stroke();
      if (flash) fl(g, x, yf - 6, 20);
      fist(g, x - 62, by - 26, 1.05, -1);
      fist(g, x + 62, by - 26, 1.05, 1);
      rr(g, metal(g, x - 70, x - 54, 'polymer'), x - 70, by - 46, 16, 10, 3);
      rr(g, metal(g, x + 54, x + 70, 'polymer'), x + 54, by - 46, 16, 10, 3);
    },
  },
  {
    slot: 5, key: 'rocketlauncher', name: 'ROCKET LAUNCHER', ammo: 'rockets', cost: 1, cooldown: 0.8,
    type: 'projectile', projectile: 'rocket', sound: 'launcher', kick: 4,
    draw(g, cx, by, phase, flash) {
      const { lin, poly, ell, rr, tube, metal, flash: fl, gripHand, supportHand, supportFingers } = WDraw;
      const rec = phase > 0 ? Math.sin(Math.min(1, phase * 1.6) * Math.PI) * 20 : 0;
      const x = cx + 22, yb = by - 18 + rec, yf = by - 118 + rec;
      supportHand(g, x - 18, by - 62, 30, 1.1);
      tube(g, x, yb, 86, yf, 52, 'olive');
      // reinforcing bands
      for (const t of [0.22, 0.6]) { const yy = yb + (yf - yb) * t, w = 86 - 34 * t; poly(g, metal(g, x - w / 2, x + w / 2, 'gun'), [x - w / 2 - 1, yy + 4, x - w / 2, yy - 4, x + w / 2, yy - 4, x + w / 2 + 1, yy + 4]); }
      rr(g, '#d8b02a', x + 4, yb - 46, 26, 8, 1); g.fillStyle = '#1a1a1a'; g.font = 'bold 5px sans-serif'; g.textAlign = 'left'; g.fillText('DANGER', x + 7.5, yb - 40.3);
      // muzzle with the next warhead inside
      ell(g, metal(g, x - 26, x + 26, 'gun'), x, yf, 27, 10);
      ell(g, '#060607', x, yf + 1, 21, 7);
      if (phase === 0 || phase > 0.7) {
        ell(g, metal(g, x - 13, x + 13, 'gun'), x, yf + 3, 13, 5);
        poly(g, lin(g, x - 9, 0, x + 9, 0, [[0, '#5a0a10'], [0.45, '#e2283c'], [1, '#4a0a0e']]), [x - 9, yf + 3, x, yf - 6, x + 9, yf + 3]);
      }
      // optic on the left rail
      rr(g, metal(g, x - 60, x - 40, 'gun'), x - 58, yb - 78, 18, 30, 3);
      ell(g, WDraw.rad(g, x - 49, yb - 76, 7, [[0, '#d0f0ff'], [0.4, '#3a7ab0'], [1, '#0a1a2a']]), x - 49, yb - 78, 7, 3);
      supportFingers(g, x - 30, by - 66, 34, 1.1);
      if (flash) fl(g, x, yf - 10, 34);
      gripHand(g, x + 28, by - 6, 1.2, 1);
    },
  },
  {
    slot: 5, key: 'launcher', name: 'SKULL LAUNCHER', ammo: 'skulls', cost: 1, cooldown: 0.8,
    type: 'projectile', projectile: 'skull', sound: 'launcher', kick: 4,
    draw(g, cx, by, phase, flash) {
      const { lin, poly, ell, rr, tube, bore, metal, flash: fl, gripHand, supportHand, supportFingers } = WDraw;
      const rec = phase > 0 ? Math.sin(Math.min(1, phase * 1.5) * Math.PI) * 16 : 0;
      const turn = phase > 0.3 ? Math.min(1, (phase - 0.3) / 0.5) : 0;
      const x = cx + 6, yb = by - 44 + rec, yf = by - 118 + rec;
      supportHand(g, x, yb - 30, 36, 1.05);
      // revolving drum (six chambers), fluted, with a skull on the back plate
      ell(g, metal(g, x - 46, x + 46, 'blued'), x, yb + 10, 46, 30);
      for (let i = 0; i < 6; i++) { const a = turn * Math.PI / 3 + i * Math.PI / 3; ell(g, 'rgba(0,0,0,0.55)', x + Math.cos(a) * 32, yb + 10 + Math.sin(a) * 19, 7, 5); }
      ell(g, metal(g, x - 14, x + 14, 'steel'), x, yb + 10, 14, 11);
      ell(g, '#1a1a1e', x - 5, yb + 8, 3.6, 3.2); ell(g, '#1a1a1e', x + 5, yb + 8, 3.6, 3.2); poly(g, '#1a1a1e', [x, yb + 11, x - 2, yb + 15, x + 2, yb + 15]);
      // short heavy barrel
      tube(g, x, yb - 18, 40, yf, 30, 'blued');
      bore(g, x, yf, 30, 'blued');
      // ladder sight
      rr(g, metal(g, x - 4, x + 4, 'gun'), x - 4, yb - 46, 8, 22, 1);
      for (let i = 0; i < 4; i++) { g.fillStyle = '#e8e8ee'; g.fillRect(x - 3, yb - 43 + i * 5, 6, 0.8); }
      supportFingers(g, x, yb - 32, 38, 1.05);
      if (flash) fl(g, x, yf - 10, 30);
      gripHand(g, x + 28, by - 6, 1.15, 1);
    },
  },
  {
    slot: 6, key: 'hexcaster', name: 'HEXCASTER', ammo: 'souls', cost: 1, cooldown: 0.085,
    type: 'projectile', projectile: 'hex', sound: 'hex', kick: 1, auto: true,
    draw(g, cx, by, phase, flash, t) {
      const { lin, rad, poly, ell, rr, tube, metal, gripHand, supportHand, supportFingers } = WDraw;
      const pulse = 0.5 + 0.5 * Math.sin((t || 0) * 6);
      const x = cx + 4, yb = by - 50 + (phase > 0 ? 3 : 0), yf = by - 124;
      supportHand(g, x, yb - 10, 44, 1.05);
      // gunmetal shroud with panel seams
      poly(g, metal(g, x - 30, x + 30, 'gun'), [x - 30, by + 20, x - 26, yb, x - 15, yf + 20, x + 15, yf + 20, x + 26, yb, x + 30, by + 20]);
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.8;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 18, by); g.lineTo(x + s * 10, yf + 22); g.stroke(); }
      // twin copper coils with energy between them
      for (const s of [-1, 1]) {
        tube(g, x + s * 13, yb, 7, yf + 16, 4, 'brass');
        for (let i = 0; i < 9; i++) { const k = i / 9, yy = yb + (yf + 16 - yb) * k; g.fillStyle = 'rgba(60,30,0,0.6)'; g.fillRect(x + s * (13 - 4 * k) - 3.5 + k * 1.5, yy, 7 - k * 3, 1); }
      }
      g.save(); g.globalCompositeOperation = 'lighter';
      poly(g, lin(g, x - 8, 0, x + 8, 0, [[0, 'rgba(160,40,255,0)'], [0.5, `rgba(255,140,255,${0.5 + pulse * 0.4})`], [1, 'rgba(160,40,255,0)']]), [x - 9, yb, x - 4, yf + 16, x + 4, yf + 16, x + 9, yb]);
      g.restore();
      // emitter ring + crystal
      g.strokeStyle = metal(g, x - 14, x + 14, 'steel'); g.lineWidth = 3; g.beginPath(); g.ellipse(x, yf + 14, 14, 6, 0, 0, Math.PI * 2); g.stroke();
      ell(g, rad(g, x, yf + 10, 26 + pulse * 6 + (flash ? 14 : 0), [[0, 'rgba(255,220,255,0.9)'], [0.3, 'rgba(220,90,255,0.5)'], [1, 'rgba(120,0,255,0)']]), x, yf + 10, 30 + (flash ? 14 : 0), 24 + (flash ? 10 : 0));
      ell(g, rad(g, x - 2, yf + 8, 8, [[0, '#ffffff'], [0.5, '#e070ff'], [1, '#5a0a9a']]), x, yf + 10, 7, 7);
      supportFingers(g, x, yb - 12, 50, 1.05);
      gripHand(g, x + 28, by - 6, 1.15, 1);
    },
  },
  {
    slot: 7, key: 'bfg', name: "B.F.G. - BIG FREAKIN' GLOOM", ammo: 'souls', cost: 40, cooldown: 1.6,
    type: 'projectile', projectile: 'gloom', sound: 'bfgBoom', windup: 0.7, windupSound: 'bfgCharge', kick: 7,
    draw(g, cx, by, phase, flash, t) {
      const { lin, rad, poly, ell, rr, metal, fist } = WDraw;
      const charge = phase > 0 && phase < 0.45 ? phase / 0.45 : 0;
      const x = cx + (charge ? (Math.random() - 0.5) * 4 * charge : 0), yb = by - 30, yf = by - 112;
      // heavy housing in perspective
      poly(g, metal(g, x - 74, x + 74, 'gun'), [x - 74, by + 20, x - 66, yb, x - 50, yf, x + 50, yf, x + 66, yb, x + 74, by + 20]);
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 40, by); g.lineTo(x + s * 30, yf); g.stroke(); }
      for (let i = 0; i < 5; i++) rr(g, 'rgba(0,0,0,0.6)', x - 62, yb - 6 - i * 12, 14, 5, 2);
      for (let i = 0; i < 5; i++) rr(g, 'rgba(0,0,0,0.6)', x + 48, yb - 6 - i * 12, 14, 5, 2);
      for (let i = 0; i < 8; i++) poly(g, i % 2 ? '#141414' : '#d8b02a', [x - 40 + i * 10, yb + 10, x - 32 + i * 10, yb + 10, x - 36 + i * 10, yb + 18, x - 44 + i * 10, yb + 18]);
      // emitter
      const r = 30 + charge * 10 + (flash ? 14 : 0);
      ell(g, metal(g, x - 42, x + 42, 'steel'), x, yf + 8, 42, 18);
      ell(g, '#0a0410', x, yf + 8, 34, 14);
      ell(g, rad(g, x, yf + 8, r * 1.4, [[0, 'rgba(255,200,240,1)'], [0.3, 'rgba(255,60,180,0.8)'], [1, 'rgba(80,0,140,0)']]), x, yf + 8, r * 1.4, r * 0.7);
      for (let i = 0; i < 3; i++) { g.strokeStyle = i % 2 ? 'rgba(255,79,184,0.9)' : 'rgba(176,76,255,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, yf + 8, 10 + i * 8, 4 + i * 3, 0, (t || 0) * (3 + i) + i, (t || 0) * (3 + i) + i + 3.8); g.stroke(); }
      // side capacitors
      for (const s of [-1, 1]) { rr(g, metal(g, x + s * 60 - 8, x + s * 60 + 8, 'steel'), x + s * 60 - 8, yb - 70, 16, 46, 6); for (let i = 0; i < 3; i++) ell(g, `rgba(255,79,184,${0.4 + charge * 0.6})`, x + s * 60, yb - 60 + i * 14, 6, 2); }
      fist(g, x - 84, by - 24, 1.1, -1);
      fist(g, x + 84, by - 24, 1.1, 1);
    },
  },
];
