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
//       draw(g, cx, by, phase, flash)  - draws the gun. cx = screen centre x,
//                   by = bottom of the 3D view, phase = 0 idle .. 1 end of fire anim.
//  2. Add a pickup letter for it in levels.js (ITEM_TYPES) and a pickup sprite in sprites.js.
//  That's it - the HUD, weapon switching and ammo handling pick it up automatically.
// ------------------------------------------------------------------
'use strict';

const AMMO_TYPES = {
  bullets: { name: 'BULLETS', max: 200 },
  shells: { name: 'SHELLS', max: 50 },
  skulls: { name: 'SKULLS', max: 50 },
  souls: { name: 'SOULS', max: 300 },
};

// ---------- shared drawing helpers for the first-person view ----------
const WDraw = (() => {
  const SKIN = '#f3d9cc', SKIN_D = '#d9b2a2', NAIL = '#0b0b0d', LACE = '#121014', TRIM = '#ff3fa8';
  const P = (g, c, pts) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const E = (g, c, x, y, rx, ry, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); g.fill(); };
  const glow = (g, x, y, r, c1, c2) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };

  // A gothic forearm coming up from the bottom of the screen: black lace sleeve, pale hand, black nails.
  // (x,y) = knuckle position, dir = +1 right hand / -1 left hand, grip = 0 open .. 1 fist
  function arm(g, x, y, dir = 1, size = 1, fist = true) {
    const s = size;
    // sleeve
    P(g, LACE, [x - 16 * s * dir, y + 10 * s, x + 6 * s * dir, y + 12 * s, x + 34 * s * dir, y + 120 * s, x - 10 * s * dir, y + 120 * s]);
    for (let i = 0; i < 6; i++) E(g, '#2a2430', x + (4 + i * 4) * s * dir, y + (30 + i * 15) * s, 3 * s, 2 * s);
    R(g, TRIM, Math.min(x - 14 * s * dir, x + 8 * s * dir), y + 14 * s, 22 * s, 2 * s);
    // back of the hand
    g.fillStyle = SKIN; g.beginPath(); g.roundRect(x - 14 * s, y - 6 * s, 28 * s, 22 * s, 6 * s); g.fill();
    if (fist) {
      // curled fingers: one solid knuckle ridge with creases (reads as a fist, not a face)
      g.fillStyle = SKIN; g.beginPath(); g.roundRect(x - 15 * s, y - 13 * s, 30 * s, 12 * s, 5 * s); g.fill();
      for (let i = 1; i < 4; i++) R(g, SKIN_D, x - 15 * s + i * 7.5 * s, y - 11 * s, 1 * s, 9 * s);
      R(g, 'rgba(255,255,255,0.35)', x - 12 * s, y - 12 * s, 24 * s, 2 * s);
      // thumb wrapped across the front, with black nail
      g.fillStyle = SKIN_D; g.beginPath(); g.roundRect(x + (dir > 0 ? -16 : 2) * s, y - 2 * s, 14 * s, 6 * s, 3 * s); g.fill();
      R(g, NAIL, x + (dir > 0 ? -16 : 12) * s, y - 1.5 * s, 4 * s, 5 * s);
    }
  }
  return { P, R, E, glow, arm, SKIN, SKIN_D, NAIL, LACE, TRIM };
})();

const WEAPONS = [
  {
    slot: 1, key: 'knuckles', name: 'SPIKED KNUCKLES', ammo: null, cost: 0, cooldown: 0.42,
    type: 'melee', damage: [10, 28], range: 1.3, sound: 'punch', kick: 0,
    draw(g, cx, by, phase) {
      const { P, R, arm } = WDraw;
      const punch = phase > 0 ? Math.sin(Math.min(1, phase) * Math.PI) : 0;
      // left fist resting
      arm(g, cx - 92, by - 34, -1, 1.05);
      // right fist punching toward centre
      const x = cx + 80 - punch * 70, y = by - 40 - punch * 46, s = 1.1 + punch * 0.45;
      arm(g, x, y, 1, s);
      R(g, '#b8b8c4', x - 14 * s, y - 10 * s, 26 * s, 4 * s);
      for (let i = 0; i < 4; i++) P(g, '#e6e6f0', [x + (-13 + i * 6.5) * s, y - 10 * s, x + (-10 + i * 6.5) * s, y - 18 * s, x + (-7 + i * 6.5) * s, y - 10 * s]);
      [cx - 92].forEach(lx => { R(g, '#b8b8c4', lx - 14, by - 44, 26, 4); for (let i = 0; i < 4; i++) P(g, '#e6e6f0', [lx - 13 + i * 6.5, by - 44, lx - 10 + i * 6.5, by - 51, lx - 7 + i * 6.5, by - 44]); });
    },
  },
  {
    slot: 2, key: 'pistol', name: 'HEX PISTOL', ammo: 'bullets', cost: 1, cooldown: 0.36,
    type: 'hitscan', damage: [6, 15], pellets: 1, spread: 0.015, sound: 'pistol', kick: 1,
    draw(g, cx, by, phase, flash) {
      const { P, R, E, glow, arm } = WDraw;
      const rec = phase > 0 ? Math.sin(Math.min(1, phase) * Math.PI) * 10 : 0;
      const x = cx + 8, y = by - 72 + rec;
      if (flash) { glow(g, x + 4, y - 18, 34, 'rgba(255,230,255,1)', 'rgba(200,60,255,0)'); E(g, '#fff', x + 4, y - 16, 6, 8); }
      // barrel + frame (black with purple filigree)
      R(g, '#1a1a1f', x - 6, y - 8, 20, 36); R(g, '#2c2c34', x - 4, y - 10, 16, 6);
      E(g, '#000', x + 4, y - 7, 4, 3);
      R(g, '#3a3644', x - 10, y + 20, 28, 18); // cylinder
      for (let i = 0; i < 3; i++) R(g, '#121216', x - 8 + i * 9, y + 22, 6, 14);
      R(g, '#9c27b0', x - 4, y + 2, 1, 16); R(g, '#9c27b0', x + 12, y + 2, 1, 16);
      P(g, '#ff4fb8', [x + 4, y + 6, x + 2, y + 12, x + 4, y + 10, x + 6, y + 12]);
      // grip
      P(g, '#2b0a1e', [x - 12, y + 36, x + 20, y + 36, x + 26, y + 80, x - 18, y + 80]);
      arm(g, x + 4, y + 52, 1, 1.15);
      arm(g, x - 18, y + 60, -1, 1.0);
    },
  },
  {
    slot: 3, key: 'shotgun', name: 'COFFIN SHOTGUN', ammo: 'shells', cost: 1, cooldown: 0.95,
    type: 'hitscan', damage: [5, 15], pellets: 7, spread: 0.1, sound: 'shotgun', after: 'shotgunPump', kick: 3,
    draw(g, cx, by, phase, flash) {
      const { P, R, E, glow, arm } = WDraw;
      const rec = phase > 0 ? Math.sin(Math.min(1, phase * 2) * Math.PI) * 16 : 0;
      const pump = phase > 0.35 && phase < 0.95 ? Math.sin((phase - 0.35) / 0.6 * Math.PI) * 26 : 0;
      const x = cx, y = by - 84 + rec;
      if (flash) { glow(g, x, y - 16, 52, 'rgba(255,240,200,1)', 'rgba(255,90,40,0)'); E(g, '#fff', x - 6, y - 12, 8, 8); E(g, '#fff', x + 6, y - 12, 8, 8); }
      // double barrels
      R(g, '#1c1c22', x - 15, y - 10, 14, 70); R(g, '#1c1c22', x + 1, y - 10, 14, 70);
      R(g, '#2e2e38', x - 13, y - 10, 3, 70); R(g, '#2e2e38', x + 3, y - 10, 3, 70);
      E(g, '#000', x - 8, y - 9, 5, 3); E(g, '#000', x + 8, y - 9, 5, 3);
      // coffin-shaped wooden fore-end (pump)
      P(g, '#4a2516', [x - 24, y + 40 + pump, x + 24, y + 40 + pump, x + 30, y + 58 + pump, x + 20, y + 82 + pump, x - 20, y + 82 + pump, x - 30, y + 58 + pump]);
      P(g, '#5d311d', [x - 18, y + 44 + pump, x + 18, y + 44 + pump, x + 23, y + 58 + pump, x + 15, y + 76 + pump, x - 15, y + 76 + pump, x - 23, y + 58 + pump]);
      // silver bat inlay
      P(g, '#d0d0dc', [x, y + 56 + pump, x - 11, y + 52 + pump, x - 8, y + 58 + pump, x - 13, y + 59 + pump, x - 5, y + 64 + pump, x, y + 62 + pump, x + 5, y + 64 + pump, x + 13, y + 59 + pump, x + 8, y + 58 + pump, x + 11, y + 52 + pump]);
      arm(g, x - 26, y + 70 + pump, -1, 1.2);
      arm(g, x + 30, y + 90, 1, 1.2);
    },
  },
  {
    slot: 4, key: 'gatling', name: 'BONE GATLING', ammo: 'bullets', cost: 1, cooldown: 0.1,
    type: 'hitscan', damage: [6, 15], pellets: 1, spread: 0.045, sound: 'gatling', kick: 1, auto: true,
    draw(g, cx, by, phase, flash, t) {
      const { P, R, E, glow, arm } = WDraw;
      const spin = (t || 0) * (phase > 0 ? 40 : 2);
      const shake = phase > 0 ? (Math.random() - 0.5) * 4 : 0;
      const x = cx + shake, y = by - 90 + (phase > 0 ? 4 : 0);
      if (flash) { glow(g, x, y - 14, 46, 'rgba(255,250,210,1)', 'rgba(255,150,40,0)'); E(g, '#fff', x, y - 10, 7, 9); }
      // rotating bone barrels
      for (let i = 0; i < 6; i++) {
        const a = spin + i * Math.PI / 3, dx = Math.cos(a) * 14, front = Math.sin(a);
        if (front < 0) R(g, '#b9b2a2', x + dx - 4, y - 6, 8, 64);
      }
      for (let i = 0; i < 6; i++) {
        const a = spin + i * Math.PI / 3, dx = Math.cos(a) * 14, front = Math.sin(a);
        if (front >= 0) { R(g, '#ece5d4', x + dx - 4, y - 8, 8, 66); E(g, '#ece5d4', x + dx, y - 8, 5, 4); E(g, '#3a3020', x + dx, y - 8, 2, 2); }
      }
      // vertebra housing + skull
      for (let i = 0; i < 3; i++) E(g, '#d8d0bc', x, y + 60 + i * 10, 26 - i * 2, 7);
      R(g, '#2a2430', x - 30, y + 64, 60, 46);
      E(g, '#ece5d4', x, y + 82, 12, 12); R(g, '#000', x - 7, y + 78, 5, 5); R(g, '#000', x + 2, y + 78, 5, 5); R(g, '#000', x - 5, y + 88, 10, 2);
      arm(g, x - 34, y + 100, -1, 1.2);
      arm(g, x + 36, y + 100, 1, 1.2);
    },
  },
  {
    slot: 5, key: 'launcher', name: 'SKULL LAUNCHER', ammo: 'skulls', cost: 1, cooldown: 0.8,
    type: 'projectile', projectile: 'skull', sound: 'launcher', kick: 4,
    draw(g, cx, by, phase, flash) {
      const { P, R, E, glow, arm } = WDraw;
      const rec = phase > 0 ? Math.sin(Math.min(1, phase * 1.5) * Math.PI) * 18 : 0;
      const x = cx + 6, y = by - 96 + rec;
      if (flash) glow(g, x, y - 6, 56, 'rgba(255,220,120,1)', 'rgba(255,60,0,0)');
      // big tube
      R(g, '#2c2733', x - 28, y, 56, 100); R(g, '#3d3646', x - 22, y, 10, 100);
      R(g, '#d4af37', x - 28, y + 40, 56, 4); R(g, '#d4af37', x - 28, y + 80, 56, 4);
      // skull muzzle
      E(g, '#ece5d4', x, y + 2, 30, 18);
      E(g, '#000', x - 11, y - 1, 7, 6); E(g, '#000', x + 11, y - 1, 7, 6);
      P(g, '#000', [x, y + 4, x - 3, y + 10, x + 3, y + 10]);
      E(g, flash ? '#ffe08a' : '#1a0008', x, y + 15, 12, 4);
      arm(g, x - 32, y + 104, -1, 1.25);
      arm(g, x + 38, y + 96, 1, 1.25);
    },
  },
  {
    slot: 6, key: 'hexcaster', name: 'HEXCASTER', ammo: 'souls', cost: 1, cooldown: 0.085,
    type: 'projectile', projectile: 'hex', sound: 'hex', kick: 1, auto: true,
    draw(g, cx, by, phase, flash, t) {
      const { P, R, E, glow, arm } = WDraw;
      const x = cx, y = by - 92 + (phase > 0 ? 3 : 0), pulse = 0.5 + 0.5 * Math.sin((t || 0) * 6);
      glow(g, x, y + 4, 30 + pulse * 8 + (flash ? 20 : 0), 'rgba(255,140,255,0.95)', 'rgba(120,0,255,0)');
      // gold prongs
      P(g, '#d4af37', [x - 30, y + 60, x - 22, y - 10, x - 16, y - 10, x - 20, y + 60]);
      P(g, '#d4af37', [x + 30, y + 60, x + 22, y - 10, x + 16, y - 10, x + 20, y + 60]);
      // crystal orb
      E(g, '#2a0040', x, y + 6, 15, 15); E(g, flash ? '#fff' : '#ff8bf0', x, y + 6, 9 + pulse * 2, 9 + pulse * 2); E(g, '#fff', x - 4, y + 2, 3, 3);
      R(g, '#22202a', x - 34, y + 56, 68, 60); R(g, '#3a3644', x - 34, y + 56, 68, 6);
      for (let i = 0; i < 5; i++) E(g, i % 2 ? '#ff4fb8' : '#9c27b0', x - 24 + i * 12, y + 76, 3, 3);
      arm(g, x - 38, y + 110, -1, 1.2);
      arm(g, x + 40, y + 110, 1, 1.2);
    },
  },
  {
    slot: 7, key: 'bfg', name: "B.F.G. - BIG FREAKIN' GLOOM", ammo: 'souls', cost: 40, cooldown: 1.6,
    type: 'projectile', projectile: 'gloom', sound: 'bfgBoom', windup: 0.7, windupSound: 'bfgCharge', kick: 7,
    draw(g, cx, by, phase, flash, t) {
      const { P, R, E, glow, arm } = WDraw;
      const charge = phase > 0 && phase < 0.45 ? phase / 0.45 : 0;
      const x = cx + (charge ? (Math.random() - 0.5) * 4 * charge : 0), y = by - 104;
      R(g, '#141418', x - 54, y + 10, 108, 120); R(g, '#24242c', x - 50, y + 10, 100, 8);
      R(g, '#ff4fb8', x - 54, y + 40, 108, 3); R(g, '#ff4fb8', x - 54, y + 70, 108, 3);
      // vortex core
      const r = 22 + charge * 10 + (flash ? 14 : 0);
      glow(g, x, y + 20, r * 1.8, 'rgba(255,60,180,1)', 'rgba(40,0,60,0)');
      E(g, '#0a0010', x, y + 20, r * 0.8, r * 0.8);
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = i % 2 ? '#ff4fb8' : '#b04cff'; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y + 20, r * (0.3 + i * 0.18), (t || 0) * (3 + i) + i, (t || 0) * (3 + i) + i + 3.6); g.stroke();
      }
      for (const dx of [-44, 44]) { R(g, '#2c2c36', x + dx - 6, y + 6, 12, 40); E(g, '#ff4fb8', x + dx, y + 10, 4, 4); }
      arm(g, x - 50, y + 118, -1, 1.3);
      arm(g, x + 52, y + 118, 1, 1.3);
    },
  },
];
