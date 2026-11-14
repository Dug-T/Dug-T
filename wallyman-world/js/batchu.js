'use strict';
// =====================================================================
// Update 2.1 (part 1): new places
//  - DREAM WORLD (15th island): every level has its own dream rule -
//    bouncy ground, floaty jumps, upside-down zones, sleepwalking
//    enemies, clouds that melt under your feet - and the NIGHTMARE boss
//  - KITCHEN KINGDOM (16th island): hot plates, flipping frying pans,
//    rolling peas, wobbly jelly, an oven escape and CHEF GATEAU
//  - STARLIGHT SUMMIT (secret 17th island, opens at 150 medals): every
//    dream rule at once, THE DREAMWEAVER, and the true ending + epilogue
//  - SURF'S UP: a new ride in Wally Town (ride the waves, B for tricks)
//  - LAWNMOWER CHASE: a new bonus level in Bug's-Eye Garden
// Levels 116-134.
// =====================================================================
const U21 = (() => {
  // ---------------- themes: tiles, backgrounds, music ----------------
  Sprites.addTheme('dream', { top: ['#ffd0f0', '#d890c8', '#ffffff'], dirt: ['#c8a8f0', '#9a78c8', '#e8d8ff'], brick: ['#a0c8ff', '#6a90d8', '#d8ecff'], solid: ['#ffe0a0', '#d0a860', '#fff4d8'], plank: ['#ffffff', '#c8b8e8', '#ffffff'] });
  Sprites.addTheme('kitchen', { top: ['#ece4d4', '#a89878', '#ffffff'], dirt: ['#c88850', '#8a5a30', '#e8b078'], brick: ['#f0f0f0', '#a0b0c0', '#ffffff'], solid: ['#b8c0c8', '#707880', '#e8f0f8'], plank: ['#a06a3a', '#6a4020', '#d0985a'] });
  Sprites.addTheme('starlight', { top: ['#a0e8ff', '#4a90c8', '#ffffff'], dirt: ['#3a2a7a', '#1e1450', '#5a4aa0'], brick: ['#ffd860', '#c09020', '#fff4b0'], solid: ['#c8c8ff', '#7878c8', '#ffffff'], plank: ['#e0e8ff', '#9098c8', '#ffffff'] });
  const cnv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h); return c; };
  const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const sky = (stops) => cnv(VW, VH, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const puff = (x, cx, cy, s, col, shade) => { for (const [ox, oy, r] of [[0, 0, 14], [14, 4, 11], [-14, 4, 10], [26, 8, 8], [-24, 8, 7]]) { x.fillStyle = shade; x.beginPath(); x.arc(cx + ox * s, cy + oy * s + 3, r * s, 0, Math.PI * 2); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(cx + ox * s, cy + oy * s, r * s, 0, Math.PI * 2); x.fill(); } };
  Sprites.bg.dream = {
    sky: sky([[0, '#2a1a5a'], [0.55, '#8a5ab0'], [1, '#f8b0d8']]),
    layers: [
      { c: cnv(512, 224, (x) => { const r = rnd(7); for (let i = 0; i < 90; i++) { x.fillStyle = r() < 0.2 ? '#ffe8a0' : '#ffffff'; x.fillRect((r() * 512) | 0, (r() * 120) | 0, 1, 1); } x.fillStyle = '#fff4d0'; x.beginPath(); x.arc(380, 50, 22, 0, Math.PI * 2); x.fill(); x.fillStyle = '#2a1a5a'; x.beginPath(); x.arc(390, 44, 20, 0, Math.PI * 2); x.fill(); }), f: 0.03 },
      { c: cnv(512, 224, (x) => { const r = rnd(11); for (let i = 0; i < 5; i++) { const cx = 40 + i * 104 + r() * 20, cy = 96 + r() * 30; x.fillStyle = '#b080d0'; x.beginPath(); x.moveTo(cx - 34, cy); x.quadraticCurveTo(cx, cy + 40, cx + 34, cy); x.fill(); puff(x, cx, cy - 4, 1, '#f0d0ff', '#c098e0'); } }), f: 0.15 },
      { c: cnv(512, 224, (x) => { const r = rnd(5); for (let i = 0; i < 4; i++) { const sx = 60 + i * 128 + r() * 30, sy = 150; x.fillStyle = '#e8d8f8'; x.beginPath(); x.ellipse(sx, sy, 16, 11, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#5a4a7a'; x.fillRect(sx + 12, sy - 6, 7, 7); x.fillRect(sx - 8, sy + 8, 3, 6); x.fillRect(sx + 6, sy + 8, 3, 6); x.fillStyle = '#ffffff'; x.font = 'bold 8px monospace'; x.fillText('z', sx + 18, sy - 12); x.fillText('Z', sx + 24, sy - 20); } }), f: 0.3 },
      { c: cnv(512, 224, (x) => { for (let i = 0; i < 9; i++) puff(x, i * 60 + 10, 206 + (i % 2) * 6, 1.3, '#ffe0f4', '#e0b0d8'); }), f: 0.55 },
    ],
  };
  Sprites.bg.kitchen = {
    sky: sky([[0, '#f4e6c8'], [1, '#e2c89c']]),
    layers: [
      { c: cnv(512, 224, (x) => { x.strokeStyle = 'rgba(160,130,90,0.35)'; x.lineWidth = 1; for (let y = 0; y < 224; y += 12) { x.beginPath(); x.moveTo(0, y + 0.5); x.lineTo(512, y + 0.5); x.stroke(); } for (let X = 0; X < 512; X += 12) { x.beginPath(); x.moveTo(X + 0.5, 0); x.lineTo(X + 0.5, 224); x.stroke(); }
        for (const wx of [70, 330]) { x.fillStyle = '#8a5a30'; x.fillRect(wx - 4, 26, 88, 70); x.fillStyle = '#9ad0f8'; x.fillRect(wx, 30, 80, 62); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(wx + 24, 52, 9, 0, Math.PI * 2); x.arc(wx + 36, 50, 11, 0, Math.PI * 2); x.fill(); x.fillStyle = '#8a5a30'; x.fillRect(wx + 38, 30, 4, 62); x.fillRect(wx, 59, 80, 4); x.fillStyle = '#e04050'; x.fillRect(wx - 8, 22, 96, 8); for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#ffffff' : '#e04050'; x.fillRect(wx - 8 + k * 16, 30, 16, 6); } } }), f: 0.08 },
      { c: cnv(512, 224, (x) => { for (const sx of [10, 200, 400]) { x.fillStyle = '#a06a3a'; x.fillRect(sx, 110, 110, 6); const r = rnd(sx + 3); for (let k = 0; k < 6; k++) { const jx = sx + 6 + k * 17, h = 14 + r() * 10; x.fillStyle = ['#e06040', '#f0c040', '#60b060', '#c070e0'][k % 4]; x.fillRect(jx, 110 - h, 12, h); x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(jx + 2, 110 - h + 2, 2, h - 4); x.fillStyle = '#d0d0d8'; x.fillRect(jx - 1, 110 - h - 3, 14, 3); } }
        for (const px of [150, 300, 470]) { x.strokeStyle = '#4a4a50'; x.lineWidth = 2; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 40); x.stroke(); x.fillStyle = '#3a3a42'; x.beginPath(); x.arc(px, 52, 13, 0, Math.PI * 2); x.fill(); x.fillStyle = '#5a5a62'; x.beginPath(); x.arc(px - 3, 49, 7, 0, Math.PI * 2); x.fill(); } }), f: 0.25 },
      { c: cnv(512, 224, (x) => { for (let i = 0; i < 4; i++) { const sx = i * 128; x.fillStyle = '#b07848'; x.fillRect(sx, 168, 120, 56); x.fillStyle = '#d0a070'; x.fillRect(sx, 164, 124, 6); x.fillStyle = '#8a5a30'; x.fillRect(sx + 6, 178, 50, 40); x.fillRect(sx + 62, 178, 52, 40); x.fillStyle = '#e8c890'; x.fillRect(sx + 50, 194, 4, 8); x.fillRect(sx + 66, 194, 4, 8); } }), f: 0.5 },
    ],
  };
  Sprites.bg.starlight = {
    sky: sky([[0, '#060418'], [0.6, '#1a1050'], [1, '#3a2a8a']]),
    layers: [
      { c: cnv(512, 224, (x) => { const r = rnd(3); for (let i = 0; i < 180; i++) { const s = r(); x.fillStyle = s < 0.1 ? '#ffe8a0' : s < 0.2 ? '#a0d8ff' : '#ffffff'; x.fillRect((r() * 512) | 0, (r() * 200) | 0, s < 0.05 ? 2 : 1, s < 0.05 ? 2 : 1); } }), f: 0.02 },
      { c: cnv(512, 224, (x) => { for (let k = 0; k < 3; k++) { const g = x.createLinearGradient(0, 30 + k * 18, 0, 70 + k * 18); g.addColorStop(0, 'rgba(90,255,200,0)'); g.addColorStop(0.5, `rgba(${k ? '160,120,255' : '90,255,200'},0.35)`); g.addColorStop(1, 'rgba(90,255,200,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 50 + k * 18); for (let X = 0; X <= 512; X += 16) x.lineTo(X, 40 + k * 18 + Math.sin(X * 0.02 + k) * 12); x.lineTo(512, 90 + k * 18); x.lineTo(0, 90 + k * 18); x.fill(); } }), f: 0.06, drift: 0.05 },
      { c: cnv(512, 224, (x) => { const r = rnd(9); for (let i = 0; i < 9; i++) { const cx = i * 58 + r() * 20, h = 50 + r() * 70; const g = x.createLinearGradient(cx - 10, 0, cx + 10, 0); g.addColorStop(0, '#3a3a9a'); g.addColorStop(0.5, '#a0a0ff'); g.addColorStop(1, '#3a3a9a'); x.fillStyle = g; x.beginPath(); x.moveTo(cx - 12, 224); x.lineTo(cx, 224 - h - 40); x.lineTo(cx + 12, 224); x.fill(); } }), f: 0.25 },
    ],
  };
  if (Audio8.addSong) {
    Audio8.addSong('dream', { bpm: 96, swing: 0, bar: 12, bass: 'waltz', harm: 'arp', drums: 'k.....h.....', lead: 'p50', chords: 'F Dm Bb C F Dm Gm C', mel: 'A4/4 C5/2 F5/6 | E5/4 D5/2 C5/6 | D5/4 F5/2 Bb5/6 | A5/6 G5/6 | A4/4 C5/2 F5/6 | E5/4 D5/2 F5/6 | G5/4 F5/2 E5/6 | F5/12' });
    Audio8.addSong('kitchen', { bpm: 140, swing: 0.3, bass: 'bounce', harm: 'stab', drums: 'k.h.s.h.k.hks.h.', lead: 'p25', chords: 'C A Dm G C A Dm G', mel: 'E5/2 G5/2 C6/4 G5/2 E5/2 C5/4 | C#5/2 E5/2 A5/4 G5/2 E5/2 C#5/4 | D5/2 F5/2 A5/4 F5/2 D5/2 A4/4 | G4/2 B4/2 D5/2 F5/2 G5/4 r/4 | E5/2 G5/2 C6/4 G5/2 E5/2 C5/4 | C#5/2 E5/2 A5/4 G5/2 E5/2 C#5/4 | F5/2 E5/2 D5/2 F5/2 A5/4 F5/4 | G5/2 F5/2 D5/2 B4/2 C5/8' });
    Audio8.addSong('starlight', { bpm: 124, swing: 0, bass: 'drive', harm: 'pad', drums: 'k...s...k.k.s...', lead: 'p12', chords: 'Am F C G Am F E E', mel: 'A4/4 C5/4 E5/4 A5/4 | F5/4 E5/4 C5/4 A4/4 | G4/4 C5/4 E5/4 G5/4 | B5/6 A5/2 G5/8 | A5/4 C6/4 B5/4 A5/4 | F5/4 A5/4 G5/4 F5/4 | E5/4 G#5/4 B5/4 E6/4 | D6/4 B5/4 G#5/8' });
  }

  // ---------------- the levels (116-134) ----------------
  const L = (o) => Object.assign({ music: o.theme }, o);
  const NEW = [
    L({ name: 'PILLOW PEAKS', theme: 'dream', width: 180, bouncy: true, dream: true, tag: 'DW1', world: 'DREAM WORLD 1', tip: 'THE GROUND IS BOUNCY! HOLD A TO BOUNCE HIGHER.',
      build(b) { b.ground(0, 30).set(2, 11, '@').coins(8, 7, 4).ground(36, 60, 10).coins(42, 5, 5).set(50, 9, 'g').ground(66, 90).fill(76, 6, 80, 6, '=').coins(76, 3, 5).set(84, 11, 'C'); b.ground(97, 120, 9).set(108, 8, 'p').coins(100, 4, 6).ground(127, 150).row(136, 7, 'WPW').set(146, 11, 'g').ground(156, 179).set(170, 11, 'G'); } }),
    L({ name: 'FLOATY FIELDS', theme: 'sky', music: 'dream', width: 180, lowGrav: true, dream: true, tag: 'DW2', world: 'DREAM WORLD 2', tip: 'FLOATY DREAM JUMPS - SAIL OVER THE BIG GAPS.',
      build(b) { b.ground(0, 26).set(2, 11, '@').coins(10, 8, 4).ground(40, 52).fill(44, 6, 48, 6, '=').coins(44, 3, 5).set(50, 11, 'z').ground(68, 82).set(76, 11, 'C').ground(98, 108, 10).coins(98, 6, 5).ground(124, 138).set(130, 11, 'h').row(128, 7, 'WOW').ground(154, 179).set(170, 11, 'G'); } }),
    L({ name: 'TOPSY-TURVY TOWERS', theme: 'neon', music: 'dream', width: 170, dream: true, tag: 'DW3', world: 'DREAM WORLD 3', tip: 'IN THE PURPLE GLOW YOU FALL UP! JUMP TO DROP DOWN.',
      build(b) { b.fill(0, 0, 169, 1, 'X').ground(0, 169).set(2, 11, '@').coins(8, 9, 4).fill(30, 2, 52, 11, ':').coins(34, 2, 6).fill(44, 8, 46, 11, 'X').set(40, 2, 'o'); b.set(60, 11, 'g').set(70, 11, 'C').fill(80, 2, 110, 11, ':').fill(88, 2, 90, 5, 'X').fill(98, 8, 100, 11, 'X').coins(92, 2, 5).set(120, 11, 'p').row(130, 8, 'WPW').set(160, 11, 'G'); } }),
    L({ name: 'SLEEPWALK STREET', theme: 'haunted', music: 'dream', width: 180, sleepers: true, dream: true, tag: 'DW4', world: 'DREAM WORLD 4', tip: 'SHH! TIPTOE PAST THE SLEEPWALKERS - THEY WAKE UP CLOSE.',
      build(b) { b.ground(0, 179).set(2, 11, '@').coins(8, 9, 4); for (const x of [24, 40, 58, 74]) b.set(x, 11, x % 2 ? 'p' : 'g'); b.fill(50, 8, 54, 8, '=').coins(50, 6, 5).set(86, 11, 'C'); for (const x of [100, 112, 126, 140, 152]) b.set(x, 11, x % 3 ? 'g' : 'p'); b.row(118, 7, 'WOW').fill(132, 9, 135, 11, 'X').set(170, 11, 'G'); } }),
    L({ name: 'MELTING CLOUDS', theme: 'sky', music: 'dream', width: 190, puffClouds: true, dream: true, tag: 'DW5', world: 'DREAM WORLD 5', tip: 'DREAM CLOUDS MELT SOON AFTER YOU LAND - KEEP MOVING!',
      build(b) { b.ground(0, 20).set(2, 11, '@').coins(8, 9, 4); for (let i = 0; i < 6; i++) { const x = 24 + i * 9, y = 10 - (i % 3) * 2; b.fill(x, y, x + 4, y, '=').coins(x + 1, y - 2, 3); } b.ground(80, 94).set(88, 11, 'C').set(92, 11, 'g');
        for (let i = 0; i < 7; i++) { const x = 98 + i * 10, y = 9 - (i % 2) * 3; b.fill(x, y, x + 4, y, '='); if (i % 2) b.set(x + 2, y - 1, 'z'); } b.ground(170, 189).set(180, 11, 'G'); } }),
    L({ name: 'THE NIGHTMARE', theme: 'dream', music: 'dream', width: 80, boss: true, bossHp: 8, bossName: 'THE NIGHTMARE', bossType: 'nightmare', talk: 'nightmare', dream: true, tag: 'DW6', world: 'DREAM WORLD 6',
      bossMsg: ['THE NIGHTMARE FADES AWAY LIKE', 'MORNING MIST.', '', 'A SMELL OF FRESH CAKE DRIFTS', 'IN FROM A NEARBY ISLAND...', 'TO THE KITCHEN KINGDOM!'],
      build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 9, 4).set(20, 11, 'g').row(28, 8, 'WPW').set(74, 11, '*'); } }),
    L({ name: 'COUNTERTOP CAPERS', theme: 'kitchen', width: 180, kitchen: true, tag: 'KK1', world: 'KITCHEN KINGDOM 1', tip: 'THE GLOWING HOT PLATES BURN - JUMP OVER THEM!',
      build(b) { b.ground(0, 179).set(2, 11, '@').coins(8, 9, 4).fill(24, 12, 27, 12, 'L').fill(40, 9, 43, 11, 'X').coins(40, 7, 4).set(52, 11, 'g').fill(62, 12, 66, 12, 'L').set(78, 11, 'C').fill(90, 12, 93, 12, 'L').set(96, 11, 'J').fill(104, 7, 110, 7, '=').coins(104, 5, 7).set(120, 11, 'h').fill(130, 12, 135, 12, 'L').row(132, 8, 'WPW').set(150, 11, 'p').set(170, 11, 'G'); } }),
    L({ name: 'FRYING PAN FLIP', theme: 'kitchen', width: 180, kitchen: true, pans: [[22, 9], [42, 8], [64, 9], [100, 8], [122, 9], [146, 8]], tag: 'KK2', world: 'KITCHEN KINGDOM 2', tip: 'FRYING PANS FLIP NOW AND THEN - RIDE THE FLIP UP HIGH!',
      build(b) { b.ground(0, 18).set(2, 11, '@').coins(8, 9, 4); for (const [x, y] of [[22, 9], [42, 8], [64, 9], [100, 8], [122, 9], [146, 8]]) b.fill(x, y, x + 3, y, '='); b.coins(42, 3, 4).ground(80, 94).set(86, 11, 'C').set(92, 11, 'g').coins(122, 4, 4).ground(160, 179).set(172, 11, 'G'); } }),
    L({ name: 'OVEN ESCAPE', theme: 'kitchen', width: 200, kitchen: true, autoscroll: 0.85, oven: true, tag: 'KK3', world: 'KITCHEN KINGDOM 3', tip: 'THE OVEN IS OPEN AND THE HEAT IS COMING - KEEP UP!',
      build(b) { b.ground(0, 199).set(4, 11, '@').coins(14, 9, 4); for (const x of [26, 52, 78, 110, 138, 166]) b.fill(x, 10, x + 1, 11, 'X'); for (const x of [38, 94, 124, 152]) b.fill(x, 12, x + 2, 12, 'L'); b.coins(60, 8, 5).set(70, 11, 'g').coins(100, 7, 5).set(130, 11, 'g').set(190, 11, 'G'); } }),
    L({ name: 'JELLY JUNGLE', theme: 'candy', music: 'kitchen', width: 180, kitchen: true, jelly: true, tag: 'KK4', world: 'KITCHEN KINGDOM 4', tip: 'BOUNCE ON THE WOBBLY JELLIES TO REACH THE HIGH TREATS.',
      build(b) { b.ground(0, 34).set(2, 11, '@').coins(8, 9, 4).set(30, 11, 'J').ground(44, 70, 8).coins(48, 4, 6).set(60, 7, 'g').set(68, 7, 'J').ground(82, 100).set(90, 11, 'C').set(98, 11, 'J').fill(104, 4, 112, 4, '=').coins(104, 2, 8).ground(118, 140, 9).set(128, 8, 'h').set(138, 8, 'J').ground(150, 179).row(156, 8, 'WOW').set(170, 11, 'G'); } }),
    L({ name: 'PANTRY PERIL', theme: 'kitchen', width: 190, kitchen: true, peas: true, tag: 'KK5', world: 'KITCHEN KINGDOM 5', tip: 'GIANT PEAS ROLL DOWN THE SHELVES - JUMP OR STOMP THEM!',
      build(b) { b.ground(0, 189).set(2, 11, '@').coins(8, 9, 4).fill(30, 8, 40, 8, '=').coins(30, 6, 6).fill(56, 10, 58, 11, 'X').set(70, 11, 'g').set(86, 11, 'C').fill(96, 7, 108, 7, '=').coins(98, 5, 6).fill(120, 9, 122, 11, 'X').row(134, 8, 'WPW').set(150, 11, 'p').fill(160, 8, 168, 8, '=').set(180, 11, 'G'); } }),
    L({ name: "CHEF GATEAU'S KITCHEN", theme: 'kitchen', width: 80, kitchen: true, boss: true, bossHp: 9, bossName: 'CHEF GATEAU', bossType: 'chef', talk: 'chef', tag: 'KK6', world: 'KITCHEN KINGDOM 6',
      bossMsg: ['CHEF GATEAU THROWS DOWN HIS', "LADLE. 'FINE! HAVE A CAKE!'", '', 'INSIDE THE CAKE IS A STAR', 'MAP. A SECRET ISLAND OPENS', 'FOR HEROES WITH 150 MEDALS...'],
      build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 9, 4).set(18, 11, 'g').row(28, 8, 'WPW').set(74, 11, '*'); } }),
    L({ name: "SURF'S UP", theme: 'beach', width: 260, board: true, surf: true, noAuto: true, tag: 'RIDE6', world: 'WALLY TOWN RIDES', tip: 'RIDE THE WAVES! JUMP OFF THE CRESTS AND PRESS B FOR TRICKS.',
      build(b) { b.ground(0, 259).set(2, 11, '@'); for (let x = 20; x < 240; x += 22) { b.set(x, 11, '/').coins(x + 2, 6, 4); } for (const x of [34, 78, 122, 166, 210]) b.set(x, 10, 'j'); for (const x of [56, 144, 232]) b.fill(x, 8, x + 6, 8, '='); b.set(250, 11, 'G'); } }),
    L({ name: 'LAWNMOWER CHASE', theme: 'grass', width: 200, bug: true, autoscroll: 0.95, mower: true, tag: 'BG7', world: "BUG'S-EYE GARDEN BONUS", tip: 'THE LAWNMOWER IS COMING! RUN, TINY HERO!',
      build(b) { b.ground(0, 199).set(4, 11, '@').coins(12, 9, 4); for (const x of [24, 48, 70, 96, 120, 146, 172]) b.fill(x, 9, x + 1, 11, 'X'); for (const x of [36, 84, 132, 160]) b.gap(x, x + 2); b.coins(56, 7, 5).coins(104, 6, 5).set(190, 11, 'G'); } }),
    L({ name: 'STARDUST STEPS', theme: 'starlight', width: 190, bouncy: true, lowGrav: true, dream: true, tag: 'SS1', world: 'STARLIGHT SUMMIT 1', tip: 'BOUNCY STARS AND FLOATY AIR - THE DREAMS GET STRONGER.',
      build(b) { b.ground(0, 24).set(2, 11, '@').coins(8, 7, 4); for (let i = 0; i < 8; i++) b.ground(32 + i * 17, 38 + i * 17, 9 + (i % 3)); b.set(66, 8, 'z').set(100, 8, 'C').set(120, 9, 'g').ground(172, 189).set(182, 11, 'G'); } }),
    L({ name: 'MOONBEAM MAZE', theme: 'starlight', width: 180, dream: true, sleepers: true, tag: 'SS2', world: 'STARLIGHT SUMMIT 2', tip: 'FALL UP THROUGH THE GLOW, AND DON\'T WAKE THE GUARDS.',
      build(b) { b.fill(0, 0, 179, 1, 'X').ground(0, 179).set(2, 11, '@'); b.fill(20, 2, 60, 11, ':').fill(30, 2, 32, 7, 'X').fill(44, 6, 46, 11, 'X').coins(36, 2, 6).set(70, 11, 'g').set(80, 11, 'C').set(92, 11, 'p').fill(100, 2, 140, 11, ':').fill(110, 2, 112, 6, 'X').fill(124, 7, 126, 11, 'X').set(150, 11, 'g').set(170, 11, 'G'); } }),
    L({ name: 'COMET CLOUDS', theme: 'starlight', width: 200, puffClouds: true, lowGrav: true, dream: true, tag: 'SS3', world: 'STARLIGHT SUMMIT 3', tip: 'MELTING CLOUDS IN FLOATY AIR. LIGHT FEET!',
      build(b) { b.ground(0, 18).set(2, 11, '@'); for (let i = 0; i < 16; i++) { const x = 22 + i * 10, y = 10 - ((i * 3) % 5); b.fill(x, y, x + 4, y, '='); if (i % 4 === 1) b.coins(x, y - 2, 4); if (i === 8) b.set(x + 2, y - 1, 'C'); } b.ground(184, 199).set(192, 11, 'G'); } }),
    L({ name: 'THE LAST DREAM', theme: 'starlight', width: 210, bouncy: true, dream: true, sleepers: true, tag: 'SS4', world: 'STARLIGHT SUMMIT 4', tip: 'EVERY DREAM AT ONCE. YOU CAN DO THIS!',
      build(b) { b.fill(0, 0, 209, 1, 'X').ground(0, 60).set(2, 11, '@').fill(16, 2, 40, 11, ':').fill(26, 2, 28, 6, 'X').set(50, 11, 'g'); b.ground(70, 100, 10).set(84, 9, 'C').set(94, 9, 'p'); for (let i = 0; i < 5; i++) b.fill(106 + i * 10, 9 - (i % 2) * 2, 110 + i * 10, 9 - (i % 2) * 2, '='); b.ground(160, 209).set(170, 11, 'g').row(180, 8, 'WOW').set(200, 11, 'G'); } }),
    L({ name: 'THE DREAMWEAVER', theme: 'starlight', width: 80, boss: true, bossHp: 12, bossName: 'THE DREAMWEAVER', bossType: 'dreamweaver', talk: 'dreamweaver', dream: true, trueEnd: true, tag: 'SS5', world: 'STARLIGHT SUMMIT 5',
      build(b) { b.fill(0, 0, 79, 1, 'X').ground(0, 79).set(2, 11, '@').coins(8, 9, 4).row(24, 8, 'WPW').set(74, 11, '*'); } }),
  ];
  const BASE = 116;
  while (LEVELS.length < BASE) LEVELS.push({ name: 'RESERVED', reserved: true, story: true, secretRoom: true, noAuto: true, theme: 'grass', music: 'grass', width: 40, tag: '-', world: '-', build(b) { b.ground(0, 39).set(2, 11, '@').set(30, 11, 'G'); } });
  NEW.forEach((d) => LEVELS.push(d));
  const LI = { dream: [116, 117, 118, 119, 120, 121], kitchen: [122, 123, 124, 125, 126, 127], surf: 128, mower: 129, star: [130, 131, 132, 133, 134] };

  // ---------------- islands ----------------
  const mk = (nodes, edges, blobs, seed, paint, name, sea, key) => { const isl = makeIsland(nodes, blobs, seed, paint); WORLDS.push({ nodes: () => nodes, edges: () => edges, isle: () => isl, name, sea, key }); return WORLDS.length - 1; };
  const W13 = WORLDS[13], n13 = W13.nodes();
  n13.push({ x: 236, y: 196, kind: 'portal', to: 14, name: 'DREAM BALLOON TO DREAM WORLD' }); W13.edges().push([4, n13.length - 1]);
  const lvNodes = (lis, pts) => lis.map((li, i) => ({ x: pts[i][0], y: pts[i][1], kind: i === lis.length - 1 ? 'castle' : 'level', li }));
  const N14 = [{ x: 24, y: 186, kind: 'portal', to: 13, name: "BALLOON TO BARON'S REVENGE" }, ...lvNodes(LI.dream, [[62, 158], [104, 176], [150, 160], [196, 146], [196, 100], [140, 84]]), { x: 236, y: 196, kind: 'portal', to: 15, name: 'CAKE BOAT TO KITCHEN KINGDOM' }];
  const w14 = mk(N14, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]], [[90, 150, 26], [140, 140, 26], [170, 120, 24], [110, 110, 22]], 1515, (f, near, ch, r) => {
    if (f > 2.3) return near(6, 26) ? (ch ? [120, 80, 170] : [140, 96, 190]) : (r() < 0.05 ? [255, 240, 160] : ch ? [230, 170, 220] : [244, 188, 232]);
    if (f > 1.6) return ch ? [200, 150, 230] : [214, 166, 240]; if (f > 1.25) return ch ? [250, 230, 250] : [255, 244, 255]; return null;
  }, 'DREAM WORLD', ['#2a1a5a', '#3a2a70'], 'node15');
  const N15 = [{ x: 24, y: 186, kind: 'portal', to: 14, name: 'CAKE BOAT TO DREAM WORLD' }, ...lvNodes(LI.kitchen, [[60, 156], [100, 176], [146, 162], [192, 150], [204, 104], [140, 86]]), { x: 236, y: 196, kind: 'portal', to: 16, name: 'STAR PORTAL (150 MEDALS)' }];
  const w15 = mk(N15, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]], [[90, 150, 26], [140, 140, 26], [170, 120, 24], [110, 110, 22]], 1616, (f, near, ch) => {
    if (f > 2.3) return near(6, 26) ? (ch ? [240, 240, 240] : [255, 255, 255]) : ch ? [240, 170, 110] : [250, 190, 130];
    if (f > 1.6) return ch ? [220, 140, 90] : [234, 156, 104]; if (f > 1.25) return ch ? [250, 230, 190] : [255, 242, 206]; return null;
  }, 'KITCHEN KINGDOM', ['#e0a0b0', '#ecb4c4'], 'node16');
  const N16 = [{ x: 24, y: 186, kind: 'portal', to: 15, name: 'STAR PORTAL TO THE KITCHEN' }, ...lvNodes(LI.star, [[70, 160], [118, 172], [168, 156], [196, 112], [130, 84]])];
  const w16 = mk(N16, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], [[100, 150, 30], [150, 130, 28], [130, 100, 24]], 1717, (f, near, ch, r) => {
    if (f > 2.3) return near(5, 28) ? (ch ? [255, 230, 140] : [255, 244, 170]) : (r() < 0.06 ? [255, 255, 255] : ch ? [90, 110, 220] : [104, 126, 236]);
    if (f > 1.6) return ch ? [60, 70, 180] : [72, 84, 196]; if (f > 1.25) return ch ? [160, 180, 255] : [176, 196, 255]; return null;
  }, 'STARLIGHT SUMMIT', ['#060418', '#100a30'], 'node17');
  { const W12 = WORLDS[12], n12 = W12.nodes(); n12.push({ x: 172, y: 124, kind: 'level', li: LI.mower, side: true, after: 110 }); W12.edges().push([5, n12.length - 1]); }
  if (typeof RIDES !== 'undefined') RIDES.push(LI.surf);
  const medalSum = () => (game && game.medals ? game.medals.reduce((a, m) => a + ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1) + ((m >> 4) & 1)), 0) : 0);

  // ---------------- dream, kitchen, surf and mower rules ----------------
  const PP = Play.prototype;
  { const _up = PP.updatePlayer;
    PP.updatePlayer = function () {
      const p = this.p, vy0 = p._vy0 || 0, wasG = p._wasG;
      const r = _up.apply(this, arguments);
      if (this.state !== 'play') return r;
      if (this.def.bouncy && p.onGround && !wasG && vy0 > 1.6 && !p.riding) { p.vy = -(Input.down('jump') ? 7.2 : 5.4) * (this.def.lowGrav ? 0.85 : 1); p.onGround = false; Audio8.sfx('spring'); this.parts.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + p.h, vx: 0, vy: -0.2, life: 14 }); }
      if (this.def.puffClouds && p.onGround && p.groundTile === '=') {
        const tx = Math.floor((p.x + p.w / 2) / TS), ty = Math.floor((p.y + p.h + 2) / TS), k = tx + ',' + ty; this.puffs = this.puffs || {};
        if (!this.puffs[k]) for (let d = -3; d <= 3; d++) if (this.tile(tx + d, ty) === '=') this.puffs[(tx + d) + ',' + ty] = { t: 46 + Math.abs(d) * 4, back: 0 };
      }
      p._vy0 = p.vy; p._wasG = p.onGround;
      return r;
    };
  }
  { const _u = PP.update;
    PP.update = function () {
      const r = _u.apply(this, arguments);
      if (this.state !== 'play' || this.paused) return r;
      if (this.puffs) for (const [k, q] of Object.entries(this.puffs)) { const [tx, ty] = k.split(',').map(Number); if (q.t > 0) { if (--q.t === 0) { this.setTile(tx, ty, '.'); q.back = 200; } } else if (--q.back <= 0) { this.setTile(tx, ty, '='); delete this.puffs[k]; } }
      if (this.def.pans && !this.pans) this.pans = this.def.pans.map(([x, y], i) => ({ x, y, t: 60 + i * 37, up: 0 }));
      if (this.pans) for (const pan of this.pans) {
        if (--pan.t <= 0) { pan.up = 22; pan.t = 150; const p = this.p, top = pan.y * TS; if (p.onGround && p.y + p.h >= top - 2 && p.y + p.h <= top + 4 && p.x + p.w > pan.x * TS && p.x < (pan.x + 4) * TS) { p.vy = -8.6; p.onGround = false; Audio8.sfx('spring'); this.parts.push({ k: 'text', s: 'FLIP!', x: p.x - 6, y: p.y - 12, vy: -0.5, life: 30 }); } for (let d = 0; d < 4; d++) this.setTile(pan.x + d, pan.y, '.'); Audio8.sfx('swoop'); }
        if (pan.up > 0 && --pan.up === 0) for (let d = 0; d < 4; d++) this.setTile(pan.x + d, pan.y, '=');
      }
      if (this.def.peas && frame % 150 === 0) this.ents.push({ type: 'pea', alive: true, t: 0, x: this.cam.x + VW + 8, y: 12 * TS - 12, w: 12, h: 12, vx: -1.5 - Math.random() * 0.6, vy: 0 });
      return r;
    };
  }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      const p = this.p;
      if (e.type === 'pea') {
        e.t++; e.x += e.vx; e.vy = Math.min(5, e.vy + 0.35); e.y += e.vy; const gy = Math.floor((e.y + e.h) / TS); if (SOLID.has(this.tile(Math.floor((e.x + 6) / TS), gy)) || this.tile(Math.floor((e.x + 6) / TS), gy) === '=') { e.y = gy * TS - e.h; e.vy = e.t % 40 < 2 ? -2.4 : 0; }
        if (SOLID.has(this.tile(Math.floor((e.x - 1) / TS), Math.floor((e.y + 6) / TS)))) e.vx = -e.vx * 0.5;
        if (e.x < this.cam.x - 40 || e.y > VH + 20) e.alive = false;
        if (this.state === 'play' && overlap(p, e)) { if (p.vy > 0 && p.y + p.h - e.y < 9) { p.vy = -5; e.alive = false; Audio8.sfx('stomp'); this.addScore(100, e.x, e.y); } else this.hurt(); }
        return;
      }
      if (e.type === 'shade' || e.type === 'pie' || e.type === 'star') {
        e.t++; e.x += e.vx; e.y += e.vy; if (e.type === 'pie') e.vy += 0.16; if (e.type === 'shade') { e.vx *= 1.01; e.vy *= 1.01; }
        if (e.t > 360 || e.y > VH + 20 || e.x < this.camMin - 30 || e.x > this.camMin + VW + 30) e.alive = false;
        if (e.type === 'pie' && SOLID.has(this.tile(Math.floor((e.x + 4) / TS), Math.floor((e.y + 6) / TS)))) { e.alive = false; for (let k = 0; k < 4; k++) this.parts.push({ k: 'dust', x: e.x + 4, y: e.y + 4, vx: (k - 1.5) * 0.6, vy: -1, life: 16 }); }
        if (this.state === 'play' && overlap(p, e) && !(this.freezeT > 0) && !e.reflected) { this.hurt(); if (!e.reflected) e.alive = false; }
        return;
      }
      if (this.def.sleepers && (e.type === 'grumble' || e.type === 'prickle') && !e.dying && e.alive) {
        const near = Math.abs(p.x - e.x) < 56 && Math.abs(p.y - e.y) < 40; e.awake = near ? 40 : Math.max(0, (e.awake || 0) - 1);
        const r = _ue.call(this, e); const dir = Math.sign(e.vx) || -1;
        if (e.awake > 0) { e.vx = (p.x < e.x ? -1 : 1) * 1.05; } else e.vx = dir * 0.15;
        return r;
      }
      if (e.type === 'nightmare') return this.updateNightmare(e);
      if (e.type === 'chef') return this.updateChef(e);
      if (e.type === 'dreamweaver') return this.updateWeaver(e);
      return _ue.call(this, e);
    };
  }

  // ---------------- bosses ----------------
  const locked = (pl) => !pl.bossLock || pl.talk || pl._p2ctx;
  const ring = (pl, cx, cy, n, sp, type, off = 0) => { for (let k = 0; k < n; k++) { const a = off + (k / n) * Math.PI * 2; pl.ents.push({ type, alive: true, t: 0, x: cx, y: cy, w: 8, h: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); } };
  PP.updateNightmare = function (e) { // drifts and throws shadow orbs, then sinks down to sleep: stomp it then
    const p = this.p; if (e.inv > 0) e.inv--; if (locked(this)) return;
    e.t++; const rage = e.maxHp - e.hp, slow = this.freezeT > 0, L0 = this.camMin + 20, R0 = this.camMin + VW - 56, floor = 12 * TS - e.h;
    if (!slow && --e.act <= 0) { e.state = { drift: 'sink', sink: 'nap', nap: 'rise', rise: 'drift' }[e.state] || 'drift'; e.act = { drift: 220 - rage * 14, sink: 40, nap: 120 - rage * 6, rise: 30 }[e.state]; if (e.state === 'sink') Audio8.sfx('swoop'); }
    if (e.state === 'drift' && !slow) { e.x = (L0 + R0) / 2 + Math.sin(e.t * 0.02) * (R0 - L0) / 2; e.y += (40 + Math.sin(e.t * 0.05) * 14 - e.y) * 0.06; if (e.t % Math.max(40, 80 - rage * 6) === 0) { const a = Math.atan2(p.y - e.y, p.x - e.x); for (const d of rage >= 4 ? [-0.3, 0, 0.3] : [0]) this.ents.push({ type: 'shade', alive: true, t: 0, x: e.x + e.w / 2, y: e.y + e.h / 2, w: 8, h: 8, vx: Math.cos(a + d) * 1.6, vy: Math.sin(a + d) * 1.6 }); Audio8.sfx('zap'); } }
    else if (e.state === 'sink') e.y += (floor - e.y) * 0.12; else if (e.state === 'nap') e.y = floor; else if (e.state === 'rise') e.y += (40 - e.y) * 0.1;
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'nap' && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'rise'; e.act = 30; } return; }
    if (e.state !== 'nap' && !slow) this.hurt();
  };
  PP.updateChef = function (e) { // walks, throws pies, has a tantrum (shockwaves), then gets dizzy: stomp him then
    const p = this.p; if (e.inv > 0) e.inv--; if (locked(this)) return;
    e.t++; const rage = e.maxHp - e.hp, slow = this.freezeT > 0, L0 = this.camMin + 12, R0 = this.camMin + VW - 40;
    e.vy = Math.min(6, (e.vy || 0) + 0.4); e.y = Math.min(12 * TS - e.h, e.y + e.vy); const onG = e.y >= 12 * TS - e.h;
    if (!slow && --e.act <= 0) { const o = ['walk', 'pies', 'tantrum', 'dizzy']; e.state = o[(o.indexOf(e.state) + 1) % o.length]; e.act = { walk: 80, pies: 70, tantrum: 60, dizzy: 110 - rage * 6 }[e.state]; if (e.state === 'tantrum') Audio8.sfx('roar'); }
    if (e.state === 'walk' && !slow) { e.face = p.x < e.x ? -1 : 1; e.x += e.face * (0.7 + rage * 0.07); }
    if (e.state === 'pies' && !slow && e.act % 18 === 0) { const dx = p.x - e.x; this.ents.push({ type: 'pie', alive: true, t: 0, x: e.x + 10, y: e.y, w: 10, h: 8, vx: clamp(dx / 50, -3.4, 3.4), vy: -4.4 }); Audio8.sfx('cannon'); }
    if (e.state === 'tantrum' && !slow && onG && e.act % 20 === 10) { e.vy = -4; this.shake = 10; for (const d of [-1, 1]) this.ents.push({ type: 'wave', alive: true, t: 0, x: e.x + 10 + d * 16, y: 12 * TS - 14, w: 12, h: 14, vx: d * 2.2, life: 160 }); Audio8.sfx('bosshit'); }
    e.x = clamp(e.x, L0, R0);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'dizzy' && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -6.8; this.damageBoss(e); if (e.alive) { e.state = 'walk'; e.act = 60; } return; }
    if (e.state !== 'dizzy' && !slow) this.hurt();
  };
  PP.updateWeaver = function (e) { // the final boss: weaves rings of stars, dives, then rests on the ground
    const p = this.p; if (e.inv > 0) e.inv--; if (locked(this)) return;
    e.t++; const rage = e.maxHp - e.hp, phase2 = e.hp <= e.maxHp / 2, slow = this.freezeT > 0, L0 = this.camMin + 20, R0 = this.camMin + VW - 52, floor = 12 * TS - e.h;
    if (!slow && --e.act <= 0) { const o = ['weave', 'aim', 'dive', 'rest', 'rise']; e.state = o[(o.indexOf(e.state) + 1) % o.length]; e.act = { weave: 200 - rage * 8, aim: 40, dive: 50, rest: 100 - rage * 4, rise: 30 }[e.state]; if (e.state === 'dive') Audio8.sfx('swoop'); if (e.state === 'weave') Audio8.sfx('signal'); }
    if (e.state === 'weave' && !slow) { e.x = (L0 + R0) / 2 + Math.cos(e.t * 0.025) * (R0 - L0) / 2; e.y += (36 + Math.sin(e.t * 0.05) * 16 - e.y) * 0.06; if (e.t % (phase2 ? 50 : 70) === 0) { ring(this, e.x + e.w / 2, e.y + e.h / 2, phase2 ? 10 : 7, 1.4, 'star', e.t * 0.1); Audio8.sfx('zap'); } }
    else if (e.state === 'aim') { e.x += clamp(p.x - 8 - e.x, -3, 3); e.y += (30 - e.y) * 0.1; }
    else if (e.state === 'dive') { e.y = Math.min(floor, e.y + 6); if (e.y >= floor && e.act > 1) { e.act = 1; this.shake = 12; Audio8.sfx('bosshit'); if (phase2) for (const d of [-1, 1]) this.ents.push({ type: 'wave', alive: true, t: 0, x: e.x + 12 + d * 16, y: 12 * TS - 14, w: 12, h: 14, vx: d * 2.4, life: 160 }); } }
    else if (e.state === 'rest') e.y = floor; else e.y += (36 - e.y) * 0.1;
    e.x = clamp(e.x, L0, R0);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'rest' && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -6.8; this.damageBoss(e); if (e.alive) { e.state = 'rise'; e.act = 30; } return; }
    if (e.state !== 'rest' && !slow) this.hurt();
  };
  const MINE = ['nightmare', 'chef', 'dreamweaver'];
  { const _sp = PP.spawn;
    PP.spawn = function (sp) {
      const bt = this.def.bossType;
      if (sp.t === '*' && MINE.includes(bt)) {
        const hp = (this.def.bossHp || 8) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0) + (game.plus && !this.rush ? 2 * game.plus : 0), x = sp.x * TS;
        const sz = { nightmare: [36, 28], chef: [26, 34], dreamweaver: [32, 32] }[bt];
        this.ents.push({ type: bt, boss: true, enemy: true, alive: true, t: 0, x: x - 60, y: bt === 'chef' ? 12 * TS - sz[1] : 40, w: sz[0], h: sz[1], hp, maxHp: hp, inv: 0, state: bt === 'chef' ? 'walk' : bt === 'nightmare' ? 'drift' : 'weave', act: 120, face: -1, vy: 0 });
        return;
      }
      return _sp.call(this, sp);
    };
  }
  { const _db = PP.damageBoss;
    PP.damageBoss = function (e) {
      const a = e.alive, sa = Sticker.add, mine = MINE.includes(e.type);
      if (mine) Sticker.add = () => {};
      try { _db.call(this, e); } finally { Sticker.add = sa; }
      if (a && !e.alive && mine) { try { Bestiary.add(e.type); } catch (er) { /* ignore */ } if (e.type === 'dreamweaver' && game && !this.rush && !this.mode) { game.trueEnd = true; Save.persist(); } }
    };
  }

  // ---------------- drawing ----------------
  const glowC = (cx, cy, r, col) => { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); };
  function drawNightmare(x, y, e, t) {
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const nap = e && e.state === 'nap';
    glowC(x + 18, y + 14, 30, 'rgba(90,40,140,0.45)');
    ctx.fillStyle = '#1e1030'; for (const [ox, oy, r] of [[18, 14, 14], [6, 16, 9], [30, 16, 9], [12, 6, 9], [26, 6, 9]]) { ctx.beginPath(); ctx.arc(x + ox + Math.sin(t * 0.1 + ox) * 0.8, y + oy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#6a3aa0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 18, y + 14, 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    for (let k = 0; k < 4; k++) { const tx = x + 6 + k * 8, ty = y + 26; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.sin(t * 0.15 + k) * 3, ty + 6, tx + 2, ty + 10); ctx.strokeStyle = '#1e1030'; ctx.lineWidth = 3; ctx.stroke(); }
    if (nap) { ctx.strokeStyle = '#ffe080'; ctx.lineWidth = 1.2; for (const ex of [12, 24]) { ctx.beginPath(); ctx.arc(x + ex, y + 12, 3, 0.2, Math.PI - 0.2); ctx.stroke(); } if ((t >> 4) & 1) txt('Z', x + 30, y - 6, '#ffe080'); }
    else for (const ex of [12, 24]) { glowC(x + ex, y + 12, 5, e && e.hp < e.maxHp ? 'rgba(255,60,80,0.8)' : 'rgba(255,220,90,0.8)'); ctx.fillStyle = e && e.hp < e.maxHp ? '#ff4050' : '#ffe080'; ctx.beginPath(); ctx.ellipse(x + ex, y + 12, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1e1030'; ctx.fillRect(x + ex - 0.6, y + 10.2, 1.2, 3.6); }
    if (!nap) { ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 11 + k * 4, y + 19); ctx.lineTo(x + 13 + k * 4, y + 23); ctx.lineTo(x + 15 + k * 4, y + 19); ctx.fill(); } }
  }
  function drawChef(x, y, e, t) {
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const dz = e && e.state === 'dizzy', face = e ? e.face || -1 : -1, step = e && e.state === 'walk' ? (t >> 3) & 1 : 0;
    ctx.save(); ctx.translate(x + 13, 0); ctx.scale(face, 1); ctx.translate(-x - 13, 0);
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x + 6 + step * 2, y + 28, 5, 6); ctx.fillRect(x + 15 - step * 2, y + 28, 5, 6);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + 13, y + 20, 11, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#e04050'; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 17, y + 12); ctx.lineTo(x + 13, y + 16); ctx.fill();
    ctx.fillStyle = '#c0c8d0'; for (const by of [18, 22, 26]) { ctx.beginPath(); ctx.arc(x + 13, y + by, 0.9, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f2c0a0'; ctx.beginPath(); ctx.arc(x + 13, y + 7, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; for (const [ox, oy, r] of [[13, -6, 5], [8, -3, 4], [18, -3, 4]]) { ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } ctx.fillRect(x + 7, y - 2, 12, 4);
    ctx.fillStyle = '#5a3018'; ctx.beginPath(); ctx.moveTo(x + 8, y + 10); ctx.quadraticCurveTo(x + 13, y + 8, x + 18, y + 10); ctx.quadraticCurveTo(x + 13, y + 12, x + 8, y + 10); ctx.fill();
    if (dz) { ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 0.8; for (const ex of [11, 15]) { ctx.beginPath(); ctx.moveTo(ex + x - 1, y + 5); ctx.lineTo(ex + x + 1, y + 7); ctx.moveTo(ex + x + 1, y + 5); ctx.lineTo(ex + x - 1, y + 7); ctx.stroke(); } }
    else { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 10, y + 5, 1.6, 2); ctx.fillRect(x + 15, y + 5, 1.6, 2); }
    const arm = e && (e.state === 'pies' || e.state === 'tantrum') ? -6 : 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 22, y + 16); ctx.lineTo(x + 27, y + 18 + arm); ctx.stroke(); ctx.strokeStyle = '#a0a8b0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 27, y + 18 + arm); ctx.lineTo(x + 30, y + 8 + arm); ctx.stroke(); ctx.fillStyle = '#a0a8b0'; ctx.beginPath(); ctx.ellipse(x + 30, y + 7 + arm, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (dz) for (let k = 0; k < 3; k++) { const a = frame * 0.15 + k * 2.1; txt('*', Math.round(x + 10 + Math.cos(a) * 9), Math.round(y - 14 + Math.sin(a) * 3), '#ffe040'); }
  }
  function drawWeaver(x, y, e, t) {
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const rest = e && e.state === 'rest', cx = x + 16, cy = y + 16;
    glowC(cx, cy, 34, 'rgba(255,230,140,0.4)');
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rest ? 0 : t * 0.02);
    ctx.fillStyle = '#ffe080'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 7 : 16, a = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c08020'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(160,220,255,0.7)'; ctx.lineWidth = 1; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(cx, cy, 20 + k * 3, 7, t * 0.03 + k, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2); ctx.fill();
    if (rest) { ctx.strokeStyle = '#3a2a7a'; ctx.lineWidth = 1; for (const ex of [-2.4, 2.4]) { ctx.beginPath(); ctx.arc(cx + ex, cy, 1.4, 0.2, Math.PI - 0.2); ctx.stroke(); } }
    else { ctx.fillStyle = e && e.hp <= e.maxHp / 2 ? '#c02060' : '#3a2a7a'; for (const ex of [-2.4, 2.4]) { ctx.beginPath(); ctx.arc(cx + ex, cy - 0.6, 1.3, 0, Math.PI * 2); ctx.fill(); } }
  }
  const SHOT = { shade: ['rgba(110,50,170,0.6)', '#2a1040'], star: ['rgba(255,240,150,0.7)', '#fff4c0'] };
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) {
      const x = Math.round(e.x - cx), y = Math.round(e.y);
      if (e.type === 'nightmare') { if (!e.dying) drawNightmare(x, y, e, frame); return; }
      if (e.type === 'chef') { if (!e.dying) drawChef(x, y, e, frame); return; }
      if (e.type === 'dreamweaver') { if (!e.dying) drawWeaver(x, y, e, frame); return; }
      if (SHOT[e.type]) { glowC(x + 4, y + 4, 7, SHOT[e.type][0]); ctx.fillStyle = SHOT[e.type][1]; ctx.beginPath(); ctx.arc(x + 4, y + 4, 3, 0, Math.PI * 2); ctx.fill(); return; }
      if (e.type === 'pie') { ctx.fillStyle = '#c87830'; ctx.beginPath(); ctx.ellipse(x + 5, y + 5, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + 5, y + 3, 4.4, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e03040'; ctx.beginPath(); ctx.arc(x + 5, y + 1.4, 1.2, 0, Math.PI * 2); ctx.fill(); return; }
      if (e.type === 'pea') { ctx.save(); ctx.translate(x + 6, y + 6); ctx.rotate(e.x * -0.2); ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(-2, -2, 0.5, 0, 0, 6); g.addColorStop(0, '#b8f080'); g.addColorStop(1, '#3a9a30'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 5.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-3, -3, 2, 1.4); ctx.restore(); return; }
      const r = _de.call(this, e, cx);
      if (this.def.sleepers && (e.type === 'grumble' || e.type === 'prickle') && !e.dying && e.alive && !(e.awake > 0) && ((frame + e.x) >> 5) & 1) txt('z', x + 10, y - 6 - ((frame >> 3) % 3), '#c8d0ff');
      if (this.def.sleepers && (e.type === 'grumble' || e.type === 'prickle') && !e.dying && e.alive) { ctx.fillStyle = '#5a7aff'; ctx.beginPath(); ctx.moveTo(x + 2, y + 1); ctx.lineTo(x + 12, y + 1); ctx.lineTo(x + 15, y - 6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 15, y - 6, 1.6, 0, Math.PI * 2); ctx.fill(); }
      return r;
    };
  }
  { const _dt = PP.drawTiles;
    PP.drawTiles = function (cx) {
      const r = _dt.call(this, cx);
      if (this.def.surf) { // the "ground" is the sea: rolling blue water with foam on the crests
        const tx0 = Math.floor(cx / TS);
        for (let tx = tx0; tx <= tx0 + 16; tx++) for (let ty = 6; ty < 14; ty++) { const c = this.tile(tx, ty); if (c !== '#' && c !== '/') continue; const X = tx * TS - cx, Y = ty * TS, top = this.tile(tx, ty - 1) !== '#';
          const g = ctx.createLinearGradient(0, Y, 0, Y + 16); g.addColorStop(0, top ? '#5ac8f0' : '#2a88c8'); g.addColorStop(1, '#2070b0'); ctx.fillStyle = g; ctx.fillRect(X, Y, 16, 16);
          if (top) { ctx.fillStyle = '#ffffff'; for (let k = 0; k < 16; k += 2) ctx.fillRect(X + k, Y + Math.round(Math.sin((tx * 16 + k) * 0.25 + frame * 0.12) * 1.2), 2, 2); } }
      }
      if (this.pans) for (const pan of this.pans) { const X = pan.x * TS - cx, Y = pan.y * TS, a = pan.up > 0 ? Math.sin((pan.up / 22) * Math.PI) * 0.9 : 0; if (X < -80 || X > VW + 20) continue; ctx.save(); ctx.translate(X + 32, Y + 3); ctx.rotate(-a); ctx.fillStyle = '#1a1020'; ctx.fillRect(-32, -2, 64, 7); ctx.fillStyle = '#4a4a54'; ctx.fillRect(-31, -1, 62, 5); ctx.fillStyle = '#7a7a86'; ctx.fillRect(-31, -1, 62, 1); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(30, 0, 18, 3); ctx.restore(); }
      return r;
    };
  }
  { const _hud = PP.drawHUD;
    PP.drawHUD = function () {
      const cx = Math.round(this.cam.x);
      if (this.def.dream) { ctx.fillStyle = 'rgba(255,170,230,0.07)'; ctx.fillRect(0, 0, VW, VH); for (let i = 0; i < 8; i++) { const x = ((i * 67 - cx * 0.4 + frame * 0.2) % (VW + 20) + VW + 20) % (VW + 20) - 10, y = 30 + ((i * 41 + frame * 0.15) % 160); ctx.fillStyle = `rgba(255,255,255,${(0.35 + 0.3 * Math.sin(frame * 0.05 + i)).toFixed(2)})`; ctx.fillRect(x, y, 1, 1); ctx.fillRect(x - 1, y + 1, 3, 1); ctx.fillRect(x, y + 2, 1, 1); } }
      if (this.def.mower || this.def.oven) { // the thing chasing you, at the left edge of the screen
        const h = this.def.oven;
        if (h) { const g = ctx.createLinearGradient(0, 0, 46, 0); g.addColorStop(0, 'rgba(255,90,20,0.85)'); g.addColorStop(1, 'rgba(255,140,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 46, VH); for (let k = 0; k < 6; k++) { const yy = (k * 40 + frame * 2) % VH; ctx.fillStyle = 'rgba(255,220,120,0.6)'; ctx.fillRect(4 + Math.sin(frame * 0.1 + k) * 4, VH - yy, 2, 6); } }
        else { const y = 12 * TS - 54; ctx.fillStyle = '#c02020'; ctx.fillRect(-20, y, 46, 40); ctx.fillStyle = '#e04040'; ctx.fillRect(-20, y, 46, 8); ctx.fillStyle = '#1a1020'; ctx.fillRect(18, y + 30, 10, 14); ctx.beginPath(); ctx.arc(14, y + 46, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c0c0c8'; for (let k = 0; k < 4; k++) { const a = frame * 0.6 + k * Math.PI / 2; ctx.fillRect(26 + Math.cos(a) * 6, y + 40 + Math.sin(a) * 3, 3, 2); } ctx.fillStyle = '#8a8a90'; ctx.fillRect(-20, y - 26, 4, 26); txt('BRRRR', 2, y - 12 + ((frame >> 2) & 1), '#ff8080', { outline: '#1a1020' }); }
      }
      const r = _hud.apply(this, arguments);
      if (this.stateT < 180 && this.state === 'play' && this.def.tip && NEW.includes(this.def)) { const w = this.def.tip.split(' '), l1 = []; while (w.length && (l1.join(' ') + ' ' + w[0]).length <= 36) l1.push(w.shift()); drawWindow(12, 184, 232, 30); txt(l1.join(' '), 128, 190, '#fff', { align: 'center' }); txt(w.join(' '), 128, 201, '#fff', { align: 'center' }); }
      return r;
    };
  }

  // ---------------- the true ending and epilogue ----------------
  const PAGES = [
    ["THE DREAMWEAVER'S LIGHT FLICKERS...", 'AND THEN IT SMILES.', '', "'YOU WERE NEVER MY ENEMY,", 'WALLYMAN. I SPUN EVERY DREAM', 'TO FIND A HERO BRAVE ENOUGH', "TO WAKE THE WORLD UP.'"],
    ['ACROSS EVERY ISLAND, THE STARS', 'COME OUT AT ONCE.', '', 'GRUMBLES YAWN. DINO SNORES.', 'EVEN BARON STATIC SMILES IN', 'HIS SLEEP.'],
    ['WALLYMAN WAKES UP IN HIS OWN', 'BED, WITH A STAR-SHAPED', 'PEBBLE IN HIS HAND.', '', 'WAS IT ALL A DREAM?', '', 'THE PEBBLE IS STILL WARM.'],
  ];
  const EPILOGUE = ['EPILOGUE', '', 'ONE YEAR LATER, WALLY TOWN', 'HOLDS ITS FIRST DREAM FESTIVAL.', 'DINO BAKES THE CAKE. CHEF', 'GATEAU JUDGES IT (10 OUT OF 10).', 'THE NIGHTMARE RUNS THE', 'NIGHT LIGHTS.', '', 'AND HIGH ABOVE, ONE STAR', 'WINKS AT WALLYMAN.', '', 'THE END... FOR NOW!'];
  function PagesScene(pages, next, bgTheme) {
    let page = 0, t = 0;
    return {
      enter() { Audio8.play('starlight'); },
      update() { t++; if (t > 50 && Input.confirm()) { page++; t = 0; Audio8.sfx('map'); if (page >= pages.length) go(next); } },
      draw() {
        drawParallax(bgTheme || 'starlight', frame * 0.3); drawWindow(16, 40, 224, 140);
        const lines = pages[Math.min(page, pages.length - 1)]; lines.forEach((l, k) => txt(l, 128, 52 + k * 11, k === 0 && l === 'EPILOGUE' ? '#ffe040' : '#fff', { align: 'center' }));
        if (page === 0 && pages === PAGES) drawWeaver(112, 4, null, frame);
        else Wally.draw(ctx, 128, 36, 'idle' + ((frame >> 4) % 4), 1, { t: frame });
        if (t > 50 && (t >> 4) & 1) txt('PRESS A', 128, 190, '#ffe040', { align: 'center' });
      },
    };
  }
  const TrueEnding = () => PagesScene(PAGES, () => CreditsScene(() => PagesScene([EPILOGUE], () => MapScene())));
  { const _M = MapScene;
    MapScene = function (...a) { // eslint-disable-line no-func-assign
      if (game && game.trueEnd && !game.trueEndSeen) { game.trueEndSeen = true; Save.persist(); try { Ach.unlock && Ach.unlock('dreamer'); } catch (e) { /* ignore */ } return TrueEnding(); }
      return _M(...a);
    };
  }
  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['dreamer', 'SWEET DREAMS', 'SEE THE TRUE ENDING']);
  if (typeof BOSS_TALK !== 'undefined') Object.assign(BOSS_TALK, {
    nightmare: [['boss', 'SHHH... GO BACK TO SLEEP, LITTLE HERO. FOREVER AND EVER...'], ['hero', 'NOPE. I AM WIDE AWAKE!']],
    chef: [['boss', 'WHO IS STOMPING ON MY COUNTERTOPS?! YOU ARE ABOUT TO BE... DESSERT!'], ['hero', 'I HOPE YOU LIKE YOUR PIES SQUASHED!']],
    dreamweaver: [['boss', 'EVERY DREAM YOU WALKED THROUGH... I WOVE IT. SHOW ME YOU ARE THE ONE.'], ['hero', 'THEN LET THIS BE THE LAST DREAM!']],
  });
  if (typeof BOSS_ART !== 'undefined') Object.assign(BOSS_ART, { nightmare: 'nightmare', chef: 'chef', dreamweaver: 'dreamweaver' });
  if (typeof stickerArt === 'function') { const _sa = stickerArt; stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    const sc = (f, k, dx, dy) => { ctx.save(); ctx.translate(x, y); ctx.scale(k, k); f(dx, dy); ctx.restore(); };
    if (id === 'nightmare') return sc((dx, dy) => drawNightmare(dx, dy, null, t), 0.6, -18, -14); if (id === 'chef') return sc((dx, dy) => drawChef(dx, dy, null, t), 0.6, -13, -16); if (id === 'dreamweaver') return sc((dx, dy) => drawWeaver(dx, dy, null, t), 0.6, -16, -16);
    return _sa(id, x, y, t); }; }
  if (typeof BOSS_NAMES !== 'undefined') Object.assign(BOSS_NAMES, { nightmare: 'THE NIGHTMARE', chef: 'CHEF GATEAU', dreamweaver: 'THE DREAMWEAVER' });

  return { LI, medalSum, w14, w15, w16, NEW, TrueEnding, drawNightmare, drawChef, drawWeaver };
})();
