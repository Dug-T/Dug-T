'use strict';
// =====================================================================
// Update 2.7: three new islands past Time Machine Island -
//   TOY BOX ISLAND   (playroom: toy trains, push-and-stack blocks,
//                     wind-up toys; boss JACK-IN-THE-BOX)
//   PAPER CRAFT ISLE (paper tabs fold pages open and shut; snipping
//                     scissors; boss the ORIGAMI DRAGON)
//   BEAT ISLAND      (blocks and spikes move to the beat of the music;
//                     boss THE BASS DROP)
// plus TREASURE MAPS (15 torn pieces hidden in levels; finish a map
// and dig at the X) and BOSS REMATCHES (harder second forms).
// =====================================================================
const U27 = (() => {
  const PP = Play.prototype;
  const cnv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------------- themes, backgrounds and music ----------------
  Sprites.addTheme('toybox', { top: ['#ff5a5a', '#c02838', '#ffa0a0'], dirt: ['#4a8af0', '#2a5ac0', '#8ab8ff'], brick: ['#ffd040', '#c09010', '#fff090'], solid: ['#3cc060', '#20843a', '#8af0a0'], plank: ['#c08a50', '#8a5a28', '#e8b878'] });
  Sprites.addTheme('paper', { top: ['#ffffff', '#b8b0a0', '#ffffff'], dirt: ['#f4ecd8', '#cfc2a2', '#fffaf0'], brick: ['#f6b0b0', '#c87878', '#ffd8d8'], solid: ['#c8d8f0', '#8aa0c8', '#eef4ff'], plank: ['#e8c890', '#b0905a', '#fff0c8'] });
  Sprites.addTheme('beat', { top: ['#ff40c0', '#a01080', '#ff9ae0'], dirt: ['#2a1050', '#160830', '#4a2080'], brick: ['#40d8ff', '#1a80b0', '#a8f0ff'], solid: ['#6a5ad0', '#3a2a90', '#a898ff'], plank: ['#ffd040', '#b08a10', '#fff0a0'] });
  Sprites.bg.toybox = {
    sky: cnv(VW, VH, (x, w, h) => { x.fillStyle = '#fbe6c8'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 24) { x.fillStyle = (i / 24) % 2 ? '#f6d8b0' : '#fbe6c8'; x.fillRect(i, 0, 12, h); } x.fillStyle = '#8a5a30'; x.fillRect(0, h - 26, w, 26); x.fillStyle = '#a06a3a'; for (let i = 0; i < w; i += 40) x.fillRect(i, h - 26, 38, 26); }),
    layers: [
      { c: cnv(512, 224, (x) => { x.fillStyle = '#7ab8f0'; x.fillRect(60, 30, 90, 60); x.fillStyle = '#fff'; x.fillRect(103, 30, 4, 60); x.fillRect(60, 58, 90, 4); x.fillStyle = '#c83a50'; x.fillRect(52, 24, 10, 74); x.fillRect(148, 24, 10, 74); x.fillStyle = '#ffd860'; x.beginPath(); x.arc(380, 50, 14, 0, Math.PI * 2); x.fill(); x.fillStyle = '#8a5a30'; x.fillRect(300, 100, 160, 8); x.fillRect(306, 108, 6, 30); x.fillRect(448, 108, 6, 30); }), f: 0.04 },
      { c: cnv(512, 224, (x) => { const r = rnd(7); // giant teddy, block towers, a ball
        x.fillStyle = '#b07840'; x.beginPath(); x.arc(110, 150, 34, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(110, 100, 24, 0, Math.PI * 2); x.fill(); for (const d of [-1, 1]) { x.beginPath(); x.arc(110 + d * 20, 80, 9, 0, Math.PI * 2); x.fill(); } x.fillStyle = '#e8c8a0'; x.beginPath(); x.arc(110, 108, 10, 0, Math.PI * 2); x.fill(); x.fillStyle = '#1a1020'; x.fillRect(102, 94, 4, 4); x.fillRect(114, 94, 4, 4);
        const cols = ['#ff5a5a', '#4a8af0', '#ffd040', '#3cc060']; for (let t = 0; t < 3; t++) { const bx = 230 + t * 90, n = 2 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { x.fillStyle = cols[(t + k) % 4]; x.fillRect(bx, 198 - (k + 1) * 26, 26, 26); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(bx + 3, 198 - (k + 1) * 26 + 3, 20, 3); } }
        x.fillStyle = '#e83850'; x.beginPath(); x.arc(470, 180, 18, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.fillRect(452, 178, 36, 4); }), f: 0.18 },
    ],
  };
  Sprites.bg.paper = {
    sky: cnv(VW, VH, (x, w, h) => { x.fillStyle = '#fbf6e8'; x.fillRect(0, 0, w, h); x.fillStyle = '#b8d0f0'; for (let y = 20; y < h; y += 14) x.fillRect(0, y, w, 1); x.fillStyle = '#f0a0a0'; x.fillRect(28, 0, 1, h); }),
    layers: [
      { c: cnv(512, 224, (x) => { x.fillStyle = '#ffd860'; x.beginPath(); x.arc(400, 46, 18, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#e0a020'; x.lineWidth = 2; for (let k = 0; k < 10; k++) { const a = k * 0.628; x.beginPath(); x.moveTo(400 + Math.cos(a) * 22, 46 + Math.sin(a) * 22); x.lineTo(400 + Math.cos(a) * 30, 46 + Math.sin(a) * 30); x.stroke(); }
        for (const [cx, cy] of [[90, 40], [240, 60], [470, 30]]) { x.strokeStyle = '#a8a8a8'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx, cy - 8); x.stroke(); x.fillStyle = '#ffffff'; for (const [ox, r] of [[-12, 9], [0, 13], [12, 9]]) { x.beginPath(); x.arc(cx + ox, cy, r, 0, Math.PI * 2); x.fill(); } x.strokeStyle = '#c8c0b0'; x.stroke(); } }), f: 0.05 },
      { c: cnv(512, 224, (x) => { const hills = [['#9ad08a', 150, 60], ['#7ab86a', 170, 40]]; for (const [col, base, amp] of hills) { x.fillStyle = col; x.beginPath(); x.moveTo(0, 224); for (let i = 0; i <= 512; i += 8) x.lineTo(i, base - Math.abs(Math.sin(i * 0.012 + amp)) * amp); x.lineTo(512, 224); x.fill(); x.strokeStyle = '#4a6a3a'; x.setLineDash([3, 3]); x.stroke(); x.setLineDash([]); }
        x.fillStyle = '#ff9a5a'; for (const hx of [120, 330]) { x.fillRect(hx, 120, 30, 26); x.beginPath(); x.moveTo(hx - 4, 120); x.lineTo(hx + 15, 104); x.lineTo(hx + 34, 120); x.fill(); } }), f: 0.2 },
    ],
  };
  Sprites.bg.beat = {
    sky: cnv(VW, VH, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0c0420'); g.addColorStop(1, '#3a0a5a'); x.fillStyle = g; x.fillRect(0, 0, w, h); }),
    layers: [
      { c: cnv(512, 224, (x) => { const r = rnd(5); for (let i = 0; i < 80; i++) { x.fillStyle = ['#ff40c0', '#40d8ff', '#ffd040'][i % 3]; x.globalAlpha = 0.5; x.fillRect((r() * 512) | 0, (r() * 120) | 0, 2, 2); } x.globalAlpha = 1; x.fillStyle = '#c8c8d8'; x.beginPath(); x.arc(256, 26, 14, 0, Math.PI * 2); x.fill(); x.fillStyle = '#ffffff'; for (let k = 0; k < 12; k++) x.fillRect(246 + (k % 4) * 6, 16 + Math.floor(k / 4) * 7, 3, 3); }), f: 0.03 },
      { c: cnv(512, 224, (x) => { for (const sx of [20, 150, 300, 430]) { x.fillStyle = '#1a0a30'; x.fillRect(sx, 120, 60, 104); x.fillStyle = '#3a2a5a'; for (const [cy, r] of [[146, 16], [190, 24]]) { x.beginPath(); x.arc(sx + 30, cy, r, 0, Math.PI * 2); x.fill(); } x.fillStyle = '#0c0420'; for (const [cy, r] of [[146, 7], [190, 10]]) { x.beginPath(); x.arc(sx + 30, cy, r, 0, Math.PI * 2); x.fill(); } } }), f: 0.2 },
    ],
  };
  { const _dp = drawParallax; // Beat Island's equaliser lights pulse with the music
    drawParallax = function (name, x) { // eslint-disable-line no-func-assign
      const r = _dp.apply(this, arguments);
      if (name === 'beat') { const st = Audio8.songStep(), b = st >= 0 ? st : frame / 7.5; for (let i = 0; i < 16; i++) { const h = 10 + Math.abs(Math.sin(b * 0.8 + i * 0.7)) * 40 * (Math.floor(b) % 4 === 0 ? 1.2 : 0.85); ctx.fillStyle = ['rgba(255,64,192,0.28)', 'rgba(64,216,255,0.28)'][i % 2]; ctx.fillRect(i * 16 + 2, 120 - h, 12, h); } }
      return r;
    };
  }
  if (Audio8.addSong) {
    Audio8.addSong('toybox', { bpm: 132, swing: 0, bass: 'waltz', harm: 'waltz', drums: 'k...h...h...h...', lead: 'p12', chords: 'C F G C Am F G C', mel: 'E6/4 G6/4 C6/4 E6/4 | F6/4 A6/4 C7/8 | G6/4 F6/4 E6/4 D6/4 | C6/8 G5/8 | A5/4 C6/4 E6/4 A6/4 | F6/4 E6/4 D6/8 | B5/4 D6/4 G6/4 F6/4 | E6/8 C6/8' });
    Audio8.addSong('paper', { bpm: 104, swing: 0.25, bass: 'walk', harm: 'arp', drums: 'k.......s.......', lead: 'p25', chords: 'G Em C D G Em C D', mel: 'D5/4 G5/4 B5/8 | E5/4 G5/4 B5/8 | C6/4 B5/4 A5/4 G5/4 | A5/8 F#5/8 | G5/4 B5/4 D6/8 | E6/4 D6/4 B5/8 | C6/4 E6/4 D6/4 C6/4 | B5/8 A5/8' });
    Audio8.addSong('beat', { bpm: 124, swing: 0, bass: 'drive', harm: 'stab', drums: 'k.h.s.h.k.h.s.hk', lead: 'p50', chords: 'Am F C G Am F C E', mel: 'A5/2 A5/2 C6/2 E6/2 A6/4 G6/4 | F6/4 E6/4 C6/8 | E6/2 E6/2 G6/2 C7/2 B6/4 G6/4 | D6/8 B5/8 | A5/2 C6/2 E6/2 A6/2 G6/4 E6/4 | F6/4 A6/4 C7/8 | E6/4 G6/4 C7/4 B6/4 | G#6/8 E6/8' });
  }

  // ---------------- levels 150-164 ----------------
  const L = (o) => Object.assign({ music: o.theme }, o);
  const NEW = [
    L({ name: 'BUILDING BLOCKS', theme: 'toybox', width: 180, tag: 'TB1', world: 'TOY BOX 1', tip: 'PUSH THE TOY BLOCKS TO CLIMB THE TALL WALLS!',
      build(b) { b.ground(0, 70).set(2, 11, '@').coins(8, 9, 4).set(18, 11, 'β').fill(28, 7, 29, 11, 'X').coins(30, 5, 3); b.set(40, 11, 'μ').set(52, 11, 'β').fill(60, 6, 62, 11, 'X'); b.ground(78, 120).set(84, 11, 'C').set(96, 11, 'σ').fill(104, 8, 110, 8, '=').coins(104, 6, 7).set(116, 11, 'μ'); b.ground(128, 179).set(134, 11, 'β').set(140, 10, 'β').fill(146, 6, 147, 11, 'X').set(158, 11, 'σ').set(170, 11, 'G'); } }),
    L({ name: 'TRAIN SET EXPRESS', theme: 'toybox', width: 200, tag: 'TB2', world: 'TOY BOX 2', tip: 'HOP ON THE TOY TRAINS TO CROSS THE GAPS!', trains: [[22, 11, 7, 260], [62, 11, 9, 300], [112, 10, 8, 280], [158, 11, 10, 320]],
      build(b) { b.ground(0, 21).set(2, 11, '@').coins(8, 9, 4); b.ground(34, 61).set(44, 11, 'μ').coins(40, 8, 5); b.ground(76, 111).set(84, 11, 'C').set(98, 11, 'σ'); b.ground(124, 157).set(134, 11, 'μ').coins(130, 7, 6); b.ground(172, 199).set(190, 11, 'G'); } }),
    L({ name: 'WIND-UP PARADE', theme: 'toybox', width: 190, tag: 'TB3', world: 'TOY BOX 3', tip: 'THE WIND-UP TOYS NEVER STOP MARCHING. STOMP OR DODGE THEM!',
      build(b) { b.ground(0, 189).set(2, 11, '@'); for (const x of [20, 34, 48, 66, 90, 104, 128, 142, 160]) b.set(x, 11, x % 3 ? 'μ' : 'σ'); b.fill(26, 8, 32, 8, '=').coins(26, 6, 7).set(76, 11, 'C').fill(112, 7, 120, 7, '=').coins(112, 5, 9).set(150, 11, 'β').fill(156, 7, 157, 11, 'X').set(180, 11, 'G'); } }),
    L({ name: 'BEDTIME SHELF', theme: 'toybox', width: 200, tag: 'TB4', world: 'TOY BOX 4', tip: 'CLIMB THE SHELVES. THE LAST TRAIN LEAVES AT BEDTIME!', trains: [[100, 8, 10, 300]],
      build(b) { b.ground(0, 40).set(2, 11, '@').fill(14, 9, 20, 9, '=').fill(24, 6, 30, 6, '=').coins(24, 4, 7).set(36, 11, 'μ'); b.ground(52, 98).set(60, 11, 'β').fill(70, 6, 71, 11, 'X').set(80, 11, 'C').set(90, 11, 'σ'); b.ground(118, 199).fill(124, 9, 130, 9, '=').fill(134, 6, 140, 6, '=').coins(134, 4, 7).set(150, 11, 'μ').set(164, 11, 'β').fill(172, 7, 173, 11, 'X').set(190, 11, 'G'); } }),
    L({ name: 'JACK-IN-THE-BOX', theme: 'toybox', width: 80, boss: true, bossHp: 10, bossName: 'JACK-IN-THE-BOX', bossType: 'jackbox', talk: 'jackbox', tag: 'TB5', world: 'TOY BOX 5',
      bossMsg: ['THE SPRING GOES BOING... AND STOPS.', 'JACK FOLDS BACK INTO HIS BOX.', '', 'A PAPER PLANE FLIES OUT OF THE', 'TOY BOX. IT HAS A MAP DRAWN ON', 'IT: PAPER CRAFT ISLE!'],
      build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 9, 4).set(74, 11, '*'); } }),
    L({ name: 'FOLD-OUT FIELDS', theme: 'paper', width: 180, tag: 'PC1', world: 'PAPER CRAFT 1', tip: 'TOUCH A PAPER TAB TO FOLD THE PAGE AND OPEN A NEW PATH!',
      folds: [{ tab: [36, 10], cells: [[41, 12, 52, 13, '#']] }, { tab: [104, 10], cells: [[112, 4, 113, 11, '.'], [118, 8, 126, 8, '=']] }],
      build(b) { b.ground(0, 40).set(2, 11, '@').coins(10, 9, 4).set(24, 11, 'g'); b.gap(41, 52); b.ground(53, 179).set(62, 11, 'p').set(80, 11, 'C').coins(84, 8, 5).fill(112, 4, 113, 11, 'X').set(140, 11, 'g').set(170, 11, 'G'); } }),
    L({ name: 'SCISSOR SKIES', theme: 'paper', width: 190, tag: 'PC2', world: 'PAPER CRAFT 2', tip: 'SCISSORS SNIP WHEN OPEN. STOMP THEM WHEN THEY CLOSE!', snips: [[30, 6], [58, 4], [90, 7], [120, 5], [150, 6]],
      build(b) { b.ground(0, 189).set(2, 11, '@').coins(8, 9, 4).fill(40, 8, 46, 8, '=').coins(40, 6, 7).set(70, 11, 'C').gap(100, 106).fill(100, 9, 106, 9, '=').set(130, 11, 'g').fill(160, 7, 166, 7, '=').coins(160, 5, 7).set(180, 11, 'G'); } }),
    L({ name: 'POP-UP CASTLE', theme: 'paper', width: 190, tag: 'PC3', world: 'PAPER CRAFT 3', tip: 'EACH TAB POPS UP A NEW BIT OF THE CASTLE. TRY THEM ALL!', snips: [[100, 5]],
      folds: [{ tab: [20, 10], cells: [[30, 10, 32, 11, 'X'], [34, 8, 36, 11, 'X'], [38, 6, 40, 11, 'X']] }, { tab: [70, 10], cells: [[78, 12, 92, 13, '#']] }, { tab: [128, 10], cells: [[136, 2, 137, 11, '.']] }],
      build(b) { b.ground(0, 77).set(2, 11, '@').fill(42, 4, 50, 11, 'X').coins(44, 2, 5); b.ground(51, 77).set(60, 11, 'g'); b.gap(78, 92); b.ground(93, 189).set(110, 11, 'C').fill(136, 2, 137, 11, 'X').set(150, 11, 'p').coins(154, 9, 5).set(180, 11, 'G'); } }),
    L({ name: 'THE LAST PAGE', theme: 'paper', width: 200, tag: 'PC4', world: 'PAPER CRAFT 4', tip: 'THE BOOK IS CLOSING! FOLD, SNIP-DODGE AND RUN!', snips: [[60, 6], [140, 4]],
      folds: [{ tab: [26, 10], cells: [[32, 12, 44, 13, '#']] }, { tab: [96, 10], cells: [[104, 9, 112, 9, '='], [116, 6, 124, 6, '=']] }, { tab: [150, 10], cells: [[158, 2, 159, 11, '.']] }],
      build(b) { b.ground(0, 31).set(2, 11, '@'); b.gap(32, 44); b.ground(45, 103).set(70, 11, 'g').set(84, 11, 'C'); b.gap(104, 128); b.ground(129, 199).fill(116, 4, 124, 4, 'X').coins(116, 2, 9).fill(158, 2, 159, 11, 'X').set(170, 11, 'p').set(190, 11, 'G'); } }),
    L({ name: 'ORIGAMI DRAGON', theme: 'paper', width: 80, boss: true, bossHp: 10, bossName: 'ORIGAMI DRAGON', bossType: 'origami', talk: 'origami', tag: 'PC5', world: 'PAPER CRAFT 5',
      bossMsg: ['THE DRAGON UNFOLDS INTO A', 'FLAT SHEET OF PAPER.', '', 'ON THE BACK IS A SONG, WITH', 'A NOTE: BRING THE BEAT TO', 'BEAT ISLAND!'],
      build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 9, 4).set(74, 11, '*'); } }),
    L({ name: 'FIRST BEAT', theme: 'beat', width: 180, tag: 'BI1', world: 'BEAT ISLAND 1', tip: 'BLOCKS APPEAR AND VANISH TO THE BEAT. WATCH THE OUTLINES!', beatA: [[30, 11, 33, 11], [52, 9, 55, 9], [96, 10, 99, 10]], beatB: [[38, 10, 41, 10], [60, 11, 63, 11], [104, 9, 107, 9], [114, 11, 117, 11]],
      build(b) { b.ground(0, 28).set(2, 11, '@').coins(8, 9, 4); b.ground(46, 49).ground(66, 92).set(76, 11, 'C').set(84, 11, 'g'); b.ground(120, 179).set(134, 11, 'h').coins(140, 8, 6).set(170, 11, 'G'); } }),
    L({ name: 'SPIKE STEP', theme: 'beat', width: 190, tag: 'BI2', world: 'BEAT ISLAND 2', tip: 'SPIKES POP UP ON EVERY OTHER BEAT. HOP IN TIME!', beatSpikes: [[24, 11, 26, 11], [44, 11, 47, 11], [70, 11, 72, 11], [100, 11, 104, 11], [130, 11, 133, 11], [156, 11, 159, 11]],
      build(b) { b.ground(0, 189).set(2, 11, '@').coins(8, 9, 4).set(58, 11, 'g').set(86, 11, 'C').fill(110, 8, 118, 8, '=').coins(110, 6, 9).set(144, 11, 'h').set(180, 11, 'G'); } }),
    L({ name: 'BASS BRIDGES', theme: 'beat', width: 190, tag: 'BI3', world: 'BEAT ISLAND 3', tip: 'BRIDGES PULSE IN AND OUT. KEEP MOVING TO THE MUSIC!', beatA: [[22, 11, 26, 11], [70, 11, 74, 11], [120, 9, 124, 9]], beatB: [[30, 11, 34, 11], [78, 10, 82, 10], [128, 10, 132, 10], [136, 11, 140, 11]], beatSpikes: [[52, 11, 54, 11], [100, 11, 102, 11]],
      build(b) { b.ground(0, 20).set(2, 11, '@'); b.ground(38, 68).set(60, 11, 'C'); b.ground(86, 118).set(108, 11, 'g'); b.ground(144, 189).set(160, 11, 'h').coins(164, 8, 6).set(180, 11, 'G'); } }),
    L({ name: 'ENCORE', theme: 'beat', width: 200, tag: 'BI4', world: 'BEAT ISLAND 4', tip: 'ONE MORE TIME! EVERYTHING MOVES TO THE BEAT.', beatA: [[26, 10, 29, 10], [90, 11, 93, 11], [150, 9, 153, 9]], beatB: [[34, 11, 37, 11], [98, 9, 101, 9], [106, 11, 109, 11], [158, 11, 161, 11]], beatSpikes: [[58, 11, 61, 11], [124, 11, 127, 11], [176, 11, 178, 11]],
      build(b) { b.ground(0, 24).set(2, 11, '@').coins(8, 9, 4); b.ground(40, 88).set(50, 11, 'g').set(70, 11, 'C').fill(74, 7, 80, 7, '=').coins(74, 5, 7); b.ground(112, 148).set(138, 11, 'h'); b.ground(164, 199).set(190, 11, 'G'); } }),
    L({ name: 'THE BASS DROP', theme: 'beat', width: 80, boss: true, bossHp: 10, bossName: 'THE BASS DROP', bossType: 'bassdrop', talk: 'bassdrop', tag: 'BI5', world: 'BEAT ISLAND 5',
      bossMsg: ['THE GIANT SPEAKER CRACKLES...', '...AND PLAYS A GENTLE LULLABY.', '', 'THE PARTY IS OVER - AND YOU', 'SAVED THE THREE NEW ISLANDS!', 'TRY THE BOSS REMATCHES NEXT.'],
      build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 9, 4).set(74, 11, '*'); } }),
  ];
  const BASE = LEVELS.length; // 150
  NEW.forEach((d) => LEVELS.push(d));
  const LI = { toy: [0, 1, 2, 3, 4].map((k) => BASE + k), paper: [5, 6, 7, 8, 9].map((k) => BASE + k), beat: [10, 11, 12, 13, 14].map((k) => BASE + k) };

  // ---------------- islands 19-21 ----------------
  const mk = (nodes, edges, blobs, seed, paint, name, sea, key) => { const isl = makeIsland(nodes, blobs, seed, paint); WORLDS.push({ nodes: () => nodes, edges: () => edges, isle: () => isl, name, sea, key }); return WORLDS.length - 1; };
  const W0 = WORLDS.length; // 19
  { const W18 = WORLDS[18], n = W18.nodes(); n.push({ x: 236, y: 196, kind: 'portal', to: W0, name: 'WIND-UP KEY TO TOY BOX ISLAND' }); W18.edges().push([5, n.length - 1]); }
  const lvN = (lis, pts) => lis.map((li, i) => ({ x: pts[i][0], y: pts[i][1], kind: i === lis.length - 1 ? 'castle' : 'level', li }));
  const PTS = [[70, 160], [118, 172], [168, 156], [196, 112], [130, 84]];
  const E = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
  const BLOBS = [[100, 150, 30], [150, 130, 28], [130, 100, 24]];
  mk([{ x: 24, y: 186, kind: 'portal', to: 18, name: 'BACK TO TIME MACHINE ISLAND' }, ...lvN(LI.toy, PTS), { x: 236, y: 196, kind: 'portal', to: W0 + 1, name: 'PAPER PLANE TO PAPER CRAFT ISLE' }], E, BLOBS, 2020, (f, near, ch, r) => {
    if (f > 2.3) return near(5, 28) ? (ch ? [255, 210, 80] : [255, 226, 110]) : (r() < 0.08 ? [255, 90, 90] : r() < 0.08 ? [74, 138, 240] : ch ? [120, 200, 120] : [134, 214, 134]);
    if (f > 1.6) return ch ? [190, 130, 80] : [206, 146, 96]; if (f > 1.25) return ch ? [250, 230, 200] : [255, 242, 214]; return null;
  }, 'TOY BOX ISLAND', ['#3a6ad0', '#4a7ae0'], 'node20');
  mk([{ x: 24, y: 186, kind: 'portal', to: W0, name: 'BACK TO TOY BOX ISLAND' }, ...lvN(LI.paper, [[64, 150], [104, 176], [152, 166], [192, 138], [146, 98]]), { x: 236, y: 196, kind: 'portal', to: W0 + 2, name: 'SHEET MUSIC TO BEAT ISLAND' }], E, [[110, 152, 32], [162, 142, 26], [146, 110, 22]], 2121, (f, near, ch, r) => {
    if (f > 2.3) return near(5, 28) ? (ch ? [240, 170, 170] : [250, 186, 186]) : (r() < 0.05 ? [184, 208, 240] : ch ? [236, 230, 214] : [248, 244, 230]);
    if (f > 1.6) return ch ? [200, 190, 170] : [214, 204, 184]; if (f > 1.25) return ch ? [184, 208, 240] : [200, 220, 248]; return null;
  }, 'PAPER CRAFT ISLE', ['#9ab0d8', '#aac0e4'], 'node21');
  mk([{ x: 24, y: 186, kind: 'portal', to: W0 + 1, name: 'BACK TO PAPER CRAFT ISLE' }, ...lvN(LI.beat, [[66, 168], [110, 148], [156, 172], [196, 130], [140, 90]])], E.slice(0, 5), [[100, 160, 28], [152, 142, 30], [140, 104, 24]], 2222, (f, near, ch, r) => {
    if (f > 2.3) return near(5, 28) ? (ch ? [255, 64, 192] : [255, 110, 210]) : (r() < 0.1 ? [64, 216, 255] : ch ? [70, 40, 120] : [86, 52, 140]);
    if (f > 1.6) return ch ? [42, 16, 80] : [56, 24, 100]; if (f > 1.25) return ch ? [255, 208, 64] : [255, 224, 110]; return null;
  }, 'BEAT ISLAND', ['#12062a', '#1e0a40'], 'node22');
  const portalOpen = (to) => (to === W0 ? !!game.cleared[147] : to === W0 + 1 ? !!game.cleared[LI.toy[4]] : to === W0 + 2 ? !!game.cleared[LI.paper[4]] : true);

  // ---------------- toy trains, paper folds, scissors, beat blocks ----------------
  { const _en = PP.enter;
    PP.enter = function () {
      const r = _en.apply(this, arguments), d = this.def;
      if (d.trains && !this._trains) { this._trains = true; for (const [x, y, amp, per] of d.trains) this.platforms.push({ x: x * TS, y: y * TS, w: 48, h: 8, ox: x * TS, oy: y * TS, x0: x * TS, a: amp * TS, sp: (Math.PI * 2) / per, axis: 'train', train: true, t: 0, dx: 0, dy: 0 }); }
      if (d.folds && !this.folds) { this.folds = d.folds.map((f) => ({ f, on: false, anim: 0, keep: f.cells.map(([x0, y0, x1, y1]) => { const a = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a.push([x, y, this.tile(x, y)]); return a; }) })); for (const F of this.folds) this.ents.push({ type: 'ptab', F, alive: true, t: 0, x: F.f.tab[0] * TS + 2, y: F.f.tab[1] * TS, w: 12, h: 16, cool: 0 }); }
      if (d.snips && !this._snips) { this._snips = true; for (const [x, y] of d.snips) this.ents.push({ type: 'snip', enemy: true, alive: true, t: (x * 7) % 80, x: x * TS, y: y * TS, by: y * TS, w: 14, h: 12, vx: -0.6, vy: 0 }); }
      if ((d.beatA || d.beatB || d.beatSpikes) && !this.beat) this.beat = { phase: -1, sp: -1 };
      return r;
    };
  }
  const cellsOf = (rects) => { const a = []; for (const [x0, y0, x1, y1] of rects || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a.push([x, y]); return a; };
  const inPlayer = (pl, x, y) => { const p = pl.p; return p.x + p.w > x * TS && p.x < (x + 1) * TS && p.y + p.h > y * TS && p.y < (y + 1) * TS; };
  function beatNow(pl) { const st = Audio8.songStep(); if (st >= 0 && Audio8.current && Audio8.current() === pl.def.music) return st / 4; return pl.stateT / 29; }
  PP.updateBeat = function () {
    const d = this.def, bt = beatNow(this), phase = Math.floor(bt / 2) % 2, sp = Math.floor(bt) % 2;
    if (phase !== this.beat.phase) { this.beat.phase = phase; for (const [x, y] of cellsOf(d.beatA)) if (phase === 0 ? !inPlayer(this, x, y) : true) this.setTile(x, y, phase === 0 ? 'X' : '.'); for (const [x, y] of cellsOf(d.beatB)) if (phase === 1 ? !inPlayer(this, x, y) : true) this.setTile(x, y, phase === 1 ? 'X' : '.'); }
    if (sp !== this.beat.sp) { this.beat.sp = sp; for (const [x, y] of cellsOf(d.beatSpikes)) this.setTile(x, y, sp ? '^' : '.'); if (sp && d.beatSpikes) Audio8.sfx('tick'); }
    this.beat.frac = bt % 1; this.beat.bt = bt;
  };
  PP.toggleFold = function (F) {
    F.on = !F.on; F.anim = 18; Audio8.sfx(F.on ? 'spring' : 'flap');
    if (F.on) for (const [x0, y0, x1, y1, ch] of F.f.cells) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (ch !== '.' && inPlayer(this, x, y)) continue; this.setTile(x, y, ch); }
    else for (const k of F.keep) for (const [x, y, ch] of k) { if (ch !== '.' && inPlayer(this, x, y)) continue; this.setTile(x, y, ch); }
  };
  { const _u = PP.update;
    PP.update = function () {
      for (const pl of this.platforms) if (pl.train) pl.ox = pl.x0 + ((1 - Math.cos(pl.t * pl.sp)) / 2) * pl.a;
      if (this.beat && (this.state === 'play' || this.state === 'clear')) this.updateBeat();
      if (this.folds) for (const F of this.folds) if (F.anim > 0) F.anim--;
      return _u.apply(this, arguments);
    };
  }

  // ---------------- bosses ----------------
  const locked = (pl) => !pl.bossLock || pl.talk || pl._p2ctx;
  const bolt = (pl, x, y, a, sp = 2.2) => pl.ents.push({ type: 'mbolt', alive: true, t: 0, x, y, w: 8, h: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
  PP.updateJackbox = function (e) { // winds up, springs out and bounces around, then flops over dizzy: stomp the head
    const p = this.p; if (e.inv > 0) e.inv--; if (locked(this)) return;
    e.t++; const rage = e.maxHp - e.hp, floor = 12 * TS;
    if (--e.act <= 0) { const o = ['wind', 'pop', 'flop']; e.state = o[(o.indexOf(e.state) + 1) % 3]; e.act = { wind: 70 - rage * 3, pop: 150 + rage * 6, flop: 100 - rage * 4 }[e.state]; if (e.state === 'pop') { Audio8.sfx('spring'); e.hx = e.bx; } if (e.state === 'wind') { e.bx = clamp(p.x + (p.x > this.camMin + VW / 2 ? -90 : 70), this.camMin + 20, this.camMin + VW - 52); } }
    if (e.state === 'wind') { e.x = e.bx + 6; e.y = floor - 32; if (e.t % 12 === 0) Audio8.sfx('tick'); }
    else if (e.state === 'pop') { const k = 1 - e.act / 160; e.hx += clamp(p.x - e.hx, -1.6 - rage * 0.1, 1.6 + rage * 0.1); e.hx = clamp(e.hx, e.bx - 70, e.bx + 70); e.x = e.hx; e.y = floor - 32 - 50 - Math.abs(Math.sin(e.t * 0.12)) * 40 + k * 10; if (rage > 3 && e.t % 50 === 0) bolt(this, e.x + 10, e.y + 10, Math.atan2(p.y - e.y, p.x - e.x)); }
    else { e.x += ((e.bx + (e.hx > e.bx ? 36 : -24)) - e.x) * 0.2; e.y += (floor - 20 - e.y) * 0.25; }
    e.w = 20; e.h = 20;
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'flop' && p.vy > 0 && p.y + p.h - e.y < 12) { p.vy = -6.6; this.damageBoss(e); if (e.alive) { e.state = 'flop'; e.act = 1; } return; }
    if (e.state === 'wind' && p.vy > 0) { p.vy = -5.5; Audio8.sfx('bump'); return; }
    this.hurt();
  };
  PP.updateOrigami = function (e) { // flies and drops paper flames, swoops low, then folds up on the ground: stomp it
    const p = this.p; if (e.inv > 0) e.inv--; if (locked(this)) return;
    e.t++; const rage = e.maxHp - e.hp, floor = 12 * TS - e.h;
    if (--e.act <= 0) { const o = ['fly', 'swoop', 'fold']; e.state = o[(o.indexOf(e.state) + 1) % 3]; e.act = { fly: 140 - rage * 4, swoop: 80, fold: 100 - rage * 4 }[e.state]; if (e.state === 'swoop') { e.sx = e.x; e.tx = p.x; Audio8.sfx('swoop'); } }
    if (e.state === 'fly') { e.x += (this.camMin + VW / 2 - 20 + Math.sin(e.t * 0.02) * 90 - e.x) * 0.05; e.y += (34 + Math.sin(e.t * 0.07) * 10 - e.y) * 0.1; if (e.t % Math.max(18, 34 - rage * 2) === 0) { bolt(this, e.x + 20, e.y + 16, Math.PI / 2 + (Math.random() - 0.5) * 0.9, 1.8); Audio8.sfx('fireball'); } }
    else if (e.state === 'swoop') { const k = 1 - e.act / 80; e.x = e.sx + (e.tx - e.sx) * k * 1.4; e.y = 34 + Math.sin(k * Math.PI) * (floor - 34); }
    else { e.y += (floor - e.y) * 0.25; }
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'fold' && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -6.8; this.damageBoss(e); if (e.alive) { e.state = 'fold'; e.act = 1; } return; }
    this.hurt();
  };
  PP.updateBassdrop = function (e) { // shockwaves on every beat, notes every bar; after 8 beats it overheats: stomp the top
    const p = this.p; if (e.inv > 0) e.inv--; if (locked(this)) return;
    e.t++; const rage = e.maxHp - e.hp, per = Math.max(20, 30 - rage);
    e.y = 12 * TS - e.h; e.x += (this.camMin + VW - 70 - e.x) * 0.1;
    if (e.state === 'play') { if (e.t % per === 0) { e.beats = (e.beats || 0) + 1; e.pulse = 8; this.ents.push({ type: 'bwave', alive: true, t: 0, x: e.x - 10, y: 12 * TS - 10, w: 12, h: 10, vx: -(2 + rage * 0.12) }); Audio8.sfx('boom'); if (e.beats % 4 === 0) for (const a of [-2.4, -2.0, -1.6]) bolt(this, e.x + 10, e.y + 10, a, 2.4); if (e.beats >= 8) { e.state = 'hot'; e.act = 110 - rage * 4; Audio8.sfx('shock'); } } }
    else if (--e.act <= 0) { e.state = 'play'; e.beats = 0; }
    if (e.pulse > 0) e.pulse--;
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'hot' && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -7; this.damageBoss(e); if (e.alive) { e.state = 'play'; e.beats = 0; } return; }
    if (p.vy > 0 && p.y + p.h - e.y < 10) { p.vy = -5.5; Audio8.sfx('bump'); return; }
    this.hurt();
  };
  const MINE = ['jackbox', 'origami', 'bassdrop'];
  { const _sp = PP.spawn;
    PP.spawn = function (sp) {
      const bt = this.def.bossType;
      if (sp.t === '*' && MINE.includes(bt)) { const hp = (this.def.bossHp || 8) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0) + (game.plus && !this.rush ? 2 * game.plus : 0), sz = { jackbox: [20, 20], origami: [40, 24], bassdrop: [40, 48] }[bt];
        this.ents.push({ type: bt, boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS - 60, y: 60, w: sz[0], h: sz[1], hp, maxHp: hp, inv: 0, state: bt === 'bassdrop' ? 'play' : bt === 'jackbox' ? 'flop' : 'fly', act: 60, bx: sp.x * TS - 70, hx: sp.x * TS - 70 }); return; }
      return _sp.call(this, sp);
    };
  }
  { const _db = PP.damageBoss; PP.damageBoss = function (e) { const sa = Sticker.add, mine = MINE.includes(e.type); if (mine) Sticker.add = () => {}; try { return _db.call(this, e); } finally { Sticker.add = sa; } }; }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type === 'jackbox') return this.updateJackbox(e);
      if (e.type === 'origami') return this.updateOrigami(e);
      if (e.type === 'bassdrop') return this.updateBassdrop(e);
      if (e.type === 'bwave') { e.t++; e.x += e.vx; if (e.x < this.cam.x - 40 || e.t > 400) e.alive = false; if (this.state === 'play' && overlap(this.p, e)) { this.hurt(); e.alive = false; } return; }
      if (e.type === 'ptab') { e.t++; if (e.cool > 0) e.cool--; if (this.state === 'play' && !e.cool && overlap(this.p, e)) { e.cool = 50; this.toggleFold(e.F); } return; }
      if (e.type === 'snip' && !e.dying) {
        e.t++; if (e.x > this.cam.x + VW + 64) return; if (e.x < this.cam.x - 200) { e.alive = false; return; }
        e.x += e.vx; e.y = e.by + Math.sin(e.t * 0.05) * 18; e.open = ((e.t / 40) | 0) % 2 === 0;
        const p = this.p; if (this.state !== 'play' || !overlap(p, e) || p.inv > 0) return;
        if (!e.open && p.vy > 0 && p.y + p.h - e.y < 10) { p.vy = -5.5; this.flipKill(e); this.addScore(200, e.x, e.y); Audio8.sfx('stomp'); return; }
        this.hurt(); return;
      }
      return _ue.call(this, e);
    };
  }
  const outline = (w) => { ctx.lineWidth = w || 1; ctx.strokeStyle = '#1a1020'; };
  function drawJackbox(x, y, e, t) { // x,y = the head; e.bx = the box
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const bx = e ? e.bx - (e._cx || 0) : x - 6, by = 12 * TS - 32, st = e ? e.state : 'pop';
    // the box
    const cols = ['#e83850', '#3a7af0', '#ffd040', '#3cc060']; ctx.fillStyle = '#1a1020'; ctx.fillRect(bx - 1, by - 1, 34, 34); for (let k = 0; k < 4; k++) { ctx.fillStyle = cols[k]; ctx.fillRect(bx + (k % 2) * 16, by + (k >> 1) * 16, 16, 16); } ctx.fillStyle = '#ffffff'; txt('?', bx + 16, by + 12, '#ffffff', { align: 'center' });
    ctx.fillStyle = '#c0c8d8'; ctx.fillRect(bx + 32, by + 12, 6, 3); ctx.save(); ctx.translate(bx + 40, by + 13); ctx.rotate(t * (st === 'wind' ? 0.3 : 0.02)); ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-6, -1, 12, 2); ctx.restore();
    if (st === 'wind') { ctx.fillStyle = '#e83850'; ctx.fillRect(bx - 2, by - 4, 36, 4); return; }
    // the spring and the head
    ctx.strokeStyle = '#a0a8b8'; ctx.lineWidth = 2; ctx.beginPath(); const sx = bx + 16, sy = by, hx = x + 10, hy = y + 20; for (let k = 0; k <= 10; k++) { const kx = sx + (hx - sx) * (k / 10), ky = sy + (hy - sy) * (k / 10); ctx.lineTo(kx + (k % 2 ? -4 : 4), ky); } ctx.stroke();
    ctx.fillStyle = '#ffe8d0'; ctx.beginPath(); ctx.arc(x + 10, y + 10, 10, 0, Math.PI * 2); ctx.fill(); outline(); ctx.stroke();
    ctx.fillStyle = '#e83850'; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x - 6, y - 8); ctx.lineTo(x + 6, y + 1); ctx.lineTo(x + 10, y - 12); ctx.lineTo(x + 14, y + 1); ctx.lineTo(x + 26, y - 8); ctx.lineTo(x + 20, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd040'; for (const [dx, dy] of [[-6, -8], [10, -12], [26, -8]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#e83850'; ctx.beginPath(); ctx.arc(x + 10, y + 12, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1020'; if (st === 'flop') { txt('X', x + 6, y + 5, '#1a1020', { align: 'center', shadow: null }); txt('X', x + 14, y + 5, '#1a1020', { align: 'center', shadow: null }); for (let k = 0; k < 3; k++) { const a = frame * 0.15 + k * 2.1; txt('*', Math.round(x + 8 + Math.cos(a) * 10), Math.round(y - 20 + Math.sin(a) * 3), '#ffe040'); } }
    else { ctx.fillRect(x + 5, y + 6, 2, 3); ctx.fillRect(x + 13, y + 6, 2, 3); ctx.beginPath(); ctx.arc(x + 10, y + 15, 4, 0, Math.PI); ctx.stroke(); }
  }
  function drawOrigami(x, y, e, t) {
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const fold = e && e.state === 'fold', flap = Math.sin(t * 0.2) * 8, c1 = '#e83850', c2 = '#b02840';
    outline(1);
    if (fold) { ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x + 4, y + 24); ctx.lineTo(x + 20, y + 4); ctx.lineTo(x + 36, y + 24); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x + 20, y + 4); ctx.lineTo(x + 20, y + 24); ctx.lineTo(x + 36, y + 24); ctx.closePath(); ctx.fill(); ctx.stroke(); for (let k = 0; k < 3; k++) { const a = frame * 0.15 + k * 2.1; txt('*', Math.round(x + 18 + Math.cos(a) * 12), Math.round(y - 10 + Math.sin(a) * 3), '#ffe040'); } return; }
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x + 14, y + 12); ctx.lineTo(x + 2, y - 4 - flap); ctx.lineTo(x + 24, y + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + 30, y + 10); ctx.lineTo(x + 40, y + 2); ctx.lineTo(x + 34, y + 14); ctx.lineTo(x + 18, y + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f06a7a'; ctx.beginPath(); ctx.moveTo(x + 18, y + 12); ctx.lineTo(x + 30, y - 6 + flap); ctx.lineTo(x + 26, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x - 10, y + 22); ctx.lineTo(x + 6, y + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 35, y + 5, 2, 2);
  }
  function drawBassdrop(x, y, e, t) {
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const hot = e && e.state === 'hot', pul = e ? e.pulse || 0 : (t >> 3) % 8;
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 42, 50); ctx.fillStyle = hot ? '#8a2a2a' : '#2a2050'; ctx.fillRect(x, y, 40, 48);
    for (const [cy, r] of [[14, 9], [34, 13]]) { const R = r + pul * 0.4; ctx.fillStyle = '#4a3a7a'; ctx.beginPath(); ctx.arc(x + 20, y + cy, R, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.stroke(); ctx.fillStyle = hot ? '#ff6a3a' : '#0c0420'; ctx.beginPath(); ctx.arc(x + 20, y + cy, R * 0.45, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = (frame >> 3) & 1 ? '#ff40c0' : '#40d8ff'; ctx.fillRect(x + 4, y + 2, 4, 2); ctx.fillRect(x + 32, y + 2, 4, 2);
    if (hot) { for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(220,220,230,0.6)'; ctx.beginPath(); ctx.arc(x + 10 + k * 10, y - 6 - ((frame + k * 9) % 24) * 0.6, 4, 0, Math.PI * 2); ctx.fill(); } txt('!', x + 20, y - 18, '#ffe040', { align: 'center', outline: '#1a1020' }); }
  }
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) {
      const x = Math.round(e.x - cx), y = Math.round(e.y);
      if (e.type === 'jackbox') { if (!e.dying) { e._cx = cx; drawJackbox(x, y, e, frame); } return; }
      if (e.type === 'origami') { if (!e.dying) drawOrigami(x, y, e, frame); return; }
      if (e.type === 'bassdrop') { if (!e.dying) drawBassdrop(x, y, e, frame); return; }
      if (e.type === 'bwave') { ctx.fillStyle = 'rgba(255,64,192,0.8)'; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.quadraticCurveTo(x + 6, y - 6, x + 12, y + 10); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.stroke(); return; }
      if (e.type === 'ptab') { const on = e.F.on; ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 5, y + 4, 2, 12); ctx.fillStyle = on ? '#5ae060' : '#ff9a5a'; ctx.beginPath(); ctx.moveTo(x + 6, y + 2); ctx.lineTo(x + 16, y + 6); ctx.lineTo(x + 6, y + 10); ctx.closePath(); ctx.fill(); ctx.stroke(); if (!on && (frame >> 4) & 1) txt('!', x + 6, y - 10, '#ffe040', { align: 'center', outline: '#101848' }); return; }
      if (e.type === 'snip') {
        const o = e.dying ? 0.4 : e.open ? 0.55 : 0.05, cxp = x + 7, cyp = y + 6; ctx.save(); ctx.translate(cxp, cyp); if (e.dying) ctx.rotate(e.t * 0.3);
        for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * o); ctx.fillStyle = '#c8d0e0'; ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(4, -2); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1a1020'; ctx.stroke(); ctx.fillStyle = s < 0 ? '#e83850' : '#3a7af0'; ctx.beginPath(); ctx.arc(6, s * 3, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
        ctx.restore(); return;
      }
      return _de.call(this, e, cx);
    };
  }
  { const _dpl = PP.drawPlatform;
    PP.drawPlatform = function (pl, cx) {
      if (!pl.train) return _dpl.call(this, pl, cx);
      const x = Math.round(pl.x - cx), y = Math.round(pl.y); if (x < -60 || x > VW + 10) return;
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 50, 18); ctx.fillStyle = '#e83850'; ctx.fillRect(x, y, 48, 16); ctx.fillStyle = '#ffd040'; ctx.fillRect(x, y, 48, 3); ctx.fillStyle = '#7ac8ff'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 5 + k * 14, y + 6, 9, 6);
      ctx.fillStyle = '#1a1020'; for (const wx of [x + 8, x + 24, x + 40]) { ctx.beginPath(); ctx.arc(wx, y + 18, 4, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#c0c8d8'; for (const wx of [x + 8, x + 24, x + 40]) ctx.fillRect(wx - 1, y + 17, 2, 2);
      ctx.fillStyle = '#3a3a48'; ctx.fillRect(x + 36, y - 8, 7, 8); if ((frame >> 3) & 1) { ctx.fillStyle = 'rgba(230,230,240,0.7)'; ctx.beginPath(); ctx.arc(x + 39, y - 13, 3, 0, Math.PI * 2); ctx.fill(); }
    };
  }
  { const _dt = PP.drawTiles;
    PP.drawTiles = function (cx) {
      const r = _dt.call(this, cx), d = this.def;
      if (this.beat) { // outlines show where the next blocks will be, and active ones glow on the beat
        const glow = 1 - (this.beat.frac || 0), show = (rects, solidNow) => { for (const [x, y] of cellsOf(rects)) { const X = x * TS - cx; if (X < -16 || X > VW) continue; if (solidNow) { ctx.fillStyle = `rgba(255,255,255,${(glow * 0.35).toFixed(2)})`; ctx.fillRect(X, y * TS, 16, 16); } else { ctx.strokeStyle = 'rgba(255,64,192,0.75)'; ctx.setLineDash([3, 2]); ctx.strokeRect(X + 0.5, y * TS + 0.5, 15, 15); ctx.setLineDash([]); } } };
        show(d.beatA, this.beat.phase === 0); show(d.beatB, this.beat.phase === 1);
        if (d.beatSpikes && !this.beat.sp) for (const [x, y] of cellsOf(d.beatSpikes)) { const X = x * TS - cx; if (X < -16 || X > VW) continue; ctx.fillStyle = 'rgba(255,64,64,0.5)'; for (let k = 0; k < 4; k++) ctx.fillRect(X + 1 + k * 4, y * TS + 13, 2, 3); }
      }
      if (this.folds) for (const F of this.folds) if (F.anim > 0) for (const [x0, y0, x1, y1] of F.f.cells) { const X = x0 * TS - cx, W = (x1 - x0 + 1) * TS, H = (y1 - y0 + 1) * TS, k = F.anim / 18; ctx.fillStyle = `rgba(255,255,255,${(k * 0.8).toFixed(2)})`; ctx.fillRect(X + (W * (1 - k)) / 2, y0 * TS, W * k, H); ctx.strokeStyle = 'rgba(150,140,120,0.8)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X + W / 2, y0 * TS); ctx.lineTo(X + W / 2, y0 * TS + H); ctx.stroke(); ctx.setLineDash([]); }
      return r;
    };
  }

  // ---------------- treasure maps ----------------
  const MAPS = ['SKULL ROCK', 'PALM COVE', 'SUNKEN BELL', 'GOLDEN DUNE', 'DRAGON PEAK'];
  const REWARDS = [['50 COINS', (g) => { g.coins += 50; }], ['2 LIVES', (g) => { g.lives += 2; }], ['80 COINS', (g) => { g.coins += 80; }], ['3 LIVES', (g) => { g.lives += 3; }], ['TREASURE HUNTER COSTUME', (g) => { g.outfits = g.outfits || []; if (!g.outfits.includes('treasure')) g.outfits.push('treasure'); }]];
  let SPOTS = null; // [{li, map, piece}] and dig levels per map
  function spots() {
    if (SPOTS) return SPOTS;
    const cand = [];
    for (let w = 0; w <= 14 && w < WORLDS.length; w++) for (const n of WORLDS[w].nodes()) { const d = n.li !== undefined && LEVELS[n.li]; if (n.kind === 'level' && d && !d.boss && !d.reserved && !d.board && !d.sub && !d.shmup && !d.explore && !d.water && (d.width || 0) >= 120 && !cand.includes(n.li)) cand.push(n.li); }
    const pick = (k, n) => cand[Math.floor((k * cand.length) / n) % cand.length];
    const pieces = []; for (let i = 0; i < 15; i++) pieces.push({ li: pick(i, 15), map: i % 5, piece: Math.floor(i / 5) });
    const dig = MAPS.map((_, m) => { let li = pick(m * 3 + 1, 15) ; let k = 0; while (pieces.some((p) => p.li === li) && k < cand.length) li = cand[(cand.indexOf(li) + 1) % cand.length], k++; return li; });
    SPOTS = { pieces, dig }; return SPOTS;
  }
  const tm = () => { game.tmaps = game.tmaps || { got: [0, 0, 0, 0, 0], dug: [false, false, false, false, false] }; return game.tmaps; };
  const complete = (m) => tm().got[m] === 7;
  const groundAt = (pl, x0) => { for (let x = x0; x < Math.min(pl.lv.w - 4, x0 + 30); x++) for (let y = 4; y < 13; y++) if (SOLID.has(pl.tile(x, y)) && pl.tile(x, y - 1) === '.' && pl.tile(x, y - 2) === '.' && pl.tile(x, y - 3) === '.') return [x, y]; return null; };
  { const _en = PP.enter;
    PP.enter = function () {
      const r = _en.apply(this, arguments);
      if (!game || this.def !== LEVELS[this.li] || this.rush || this._tm) return r; this._tm = true;
      const S = spots(), T = tm();
      for (const pc of S.pieces) if (pc.li === this.li && !(T.got[pc.map] & (1 << pc.piece))) { const g = groundAt(this, Math.floor(this.lv.w * (0.35 + pc.piece * 0.12))); if (g) this.ents.push({ type: 'mappiece', item: true, alive: true, t: 0, map: pc.map, piece: pc.piece, x: g[0] * TS + 2, y: (g[1] - 3) * TS, w: 12, h: 12, vx: 0, vy: 0, rise: 0 }); }
      S.dig.forEach((li, m) => { if (li === this.li && complete(m) && !T.dug[m]) { const g = groundAt(this, Math.floor(this.lv.w * 0.45)); if (g) this.ents.push({ type: 'xspot', alive: true, t: 0, map: m, x: g[0] * TS, y: (g[1] - 1) * TS, w: 16, h: 16, dig: 0 }); } });
      return r;
    };
  }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type === 'mappiece') { e.t++; if (this.state === 'play' && overlap(this.p, e)) { e.alive = false; const T = tm(); T.got[e.map] |= 1 << e.piece; const n = [0, 1, 2].filter((k) => T.got[e.map] & (1 << k)).length; Audio8.sfx('secret'); this.parts.push({ k: 'text', s: n === 3 ? 'TREASURE MAP COMPLETE!' : `MAP PIECE! ${n}/3`, x: e.x - 40, y: e.y - 10, vy: -0.4, life: 90 }); if (n === 3) this.tmMsg = [MAPS[e.map], `DIG AT THE X IN ${LEVELS[spots().dig[e.map]].name}`, 150]; Save.persist(); } return; }
      if (e.type === 'xspot') {
        e.t++; const p = this.p, on = this.state === 'play' && p.x + p.w > e.x && p.x < e.x + 16 && Math.abs(p.y + p.h - (e.y + 16)) < 4;
        if (e.dig > 0) { if (++e.dig > 50) { e.alive = false; const T = tm(); T.dug[e.map] = true; const [what, fn] = REWARDS[e.map]; fn(game); while (game.coins >= 100) { game.coins -= 100; game.lives++; } Save.persist(); Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: 'TREASURE! ' + what, x: e.x - 50, y: e.y - 24, vy: -0.3, life: 140 }); for (let k = 0; k < 14; k++) this.parts.push({ k: 'spark', x: e.x + 8, y: e.y - k * 2, life: 30 }); try { if (T.dug.every(Boolean)) Ach.unlock('treasure'); } catch (er) { /* ignore */ } } else if (e.dig % 8 === 0) Audio8.sfx('dig'); return; }
        if (on && Input.pressed('down')) { e.dig = 1; Audio8.sfx('dig'); }
        e.near = on; return;
      }
      return _ue.call(this, e);
    };
  }
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) {
      const x = Math.round(e.x - cx), y = Math.round(e.y);
      if (e.type === 'mappiece') { const b = Math.round(Math.sin(e.t * 0.08) * 2); const g = ctx.createRadialGradient(x + 6, y + 6 + b, 1, x + 6, y + 6 + b, 12); g.addColorStop(0, 'rgba(255,240,180,0.6)'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.fillRect(x - 6, y - 6 + b, 24, 24); ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.moveTo(x - 1, y + b - 1); ctx.lineTo(x + 13, y + 1 + b); ctx.lineTo(x + 12, y + 13 + b); ctx.lineTo(x + 3, y + 11 + b); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f0d8a0'; ctx.beginPath(); ctx.moveTo(x, y + b); ctx.lineTo(x + 12, y + 2 + b); ctx.lineTo(x + 11, y + 12 + b); ctx.lineTo(x + 3, y + 10 + b); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#a07040'; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x + 2, y + 4 + b); ctx.lineTo(x + 9, y + 8 + b); ctx.stroke(); ctx.setLineDash([]); txt('X', x + 7, y + 3 + b, '#e83850', { align: 'center', shadow: null }); return; }
      if (e.type === 'xspot') { const s = e.dig ? Math.min(1, e.dig / 50) : 0; ctx.fillStyle = '#e83850'; ctx.save(); ctx.translate(x + 8, y + 12); for (const a of [0.7, -0.7]) { ctx.save(); ctx.rotate(a); ctx.fillRect(-8, -1.5, 16, 3); ctx.restore(); } ctx.restore(); if (e.dig) { ctx.fillStyle = '#7a5a30'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 2 + ((k * 5 + e.dig) % 12), y + 4 - ((e.dig * 2 + k * 7) % 14), 3, 3); ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 3, y + 10 - s * 10, 10, 6); } else if (e.near) txt('DOWN: DIG', x + 8, y - 12, '#ffe040', { align: 'center', outline: '#101848' }); else if ((frame >> 4) & 1) txt('X', x + 8, y - 8, '#ff8080', { align: 'center', outline: '#101848' }); return; }
      return _de.call(this, e, cx);
    };
  }
  Wally.COSTUMES.treasure = { blue: '#d0a030', blueD: '#8a6010', blueL: '#ffe080', blueLL: '#fff6c0', org: '#2a8a5a', orgD: '#14583a', orgL: '#6ae0a0', lens: '#ff3060' };
  COSTUME_LIST.push({ id: 'treasure', name: 'TREASURE HUNTER', hint: 'DIG UP ALL 5 TREASURES', ok: () => !!(game && game.outfits && game.outfits.includes('treasure')) });
  function TreasureScene(back) {
    let sel = 0, t = 0;
    const draw1 = (m, X, Y, W, H) => { // a parchment map drawn in three torn pieces
      const T = tm(), r = rnd(31 + m * 17);
      for (let k = 0; k < 3; k++) {
        const px = X + (k * W) / 3, got = T.got[m] & (1 << k);
        if (!got) { ctx.strokeStyle = 'rgba(240,216,160,0.5)'; ctx.setLineDash([3, 3]); ctx.strokeRect(px + 1.5, Y + 1.5, W / 3 - 3, H - 3); ctx.setLineDash([]); txt('?', px + W / 6, Y + H / 2 - 3, 'rgba(240,216,160,0.6)', { align: 'center' }); continue; }
        ctx.fillStyle = '#f0d8a0'; ctx.fillRect(px, Y, W / 3 - 1, H); ctx.fillStyle = '#c8a870'; ctx.fillRect(px, Y, W / 3 - 1, 2);
      }
      ctx.save(); ctx.beginPath(); for (let k = 0; k < 3; k++) if (T.got[m] & (1 << k)) ctx.rect(X + (k * W) / 3, Y, W / 3 - 1, H); ctx.clip();
      ctx.fillStyle = '#6ac0e0'; ctx.fillRect(X, Y, W, H); ctx.fillStyle = '#e8d090'; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2, rr = H * 0.32 * (0.75 + r() * 0.4); ctx.lineTo(X + W / 2 + Math.cos(a) * rr * 1.6, Y + H / 2 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5ab060'; ctx.beginPath(); ctx.arc(X + W * 0.4, Y + H * 0.45, H * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a05030'; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(X + W * 0.2, Y + H * 0.7); ctx.quadraticCurveTo(X + W * 0.5, Y + H * 0.2, X + W * 0.72, Y + H * 0.55); ctx.stroke(); ctx.setLineDash([]); txt('X', X + W * 0.74, Y + H * 0.5 - 3, '#e83850', { align: 'center', shadow: null }); ctx.restore();
    };
    return {
      _s: () => ({ sel, tm: JSON.parse(JSON.stringify(tm())) }),
      enter() { Audio8.play('menu'); },
      update() { t++; if (Input.pressed('down')) { sel = (sel + 1) % 5; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + 4) % 5; Audio8.sfx('select'); } if (t > 10 && (Input.pressed('back') || Input.pressed('run') || Input.confirm())) go(back); },
      draw() {
        drawParallax('beach', t * 0.3); drawWindow(6, 4, 244, 216); txt('TREASURE MAPS', 128, 10, '#ffe040', { align: 'center', scale: 2 });
        const S = spots(), T = tm();
        MAPS.forEach((nm, m) => { const y = 32 + m * 26, on = m === sel, n = [0, 1, 2].filter((k) => T.got[m] & (1 << k)).length; draw1(m, 24, y, 54, 22); txt(nm, 86, y + 2, on ? '#ffe040' : '#fff'); txt(T.dug[m] ? 'TREASURE FOUND!' : n === 3 ? 'READY TO DIG!' : `PIECES ${n}/3`, 86, y + 12, T.dug[m] ? '#5ae060' : n === 3 ? '#ff9a5a' : '#a8b0d8'); if (on) txt('>', 13 + ((t >> 3) & 1), y + 7, '#ffe040'); });
        const m = sel, n = [0, 1, 2].filter((k) => T.got[m] & (1 << k)).length; drawWindow(10, 164, 236, 50);
        if (T.dug[m]) txt(`YOU DUG UP: ${REWARDS[m][0]}`, 128, 172, '#5ae060', { align: 'center' });
        else if (n === 3) { txt('DIG AT THE X IN', 128, 172, '#fff', { align: 'center' }); txt(`${levelTag(S.dig[m])} ${LEVELS[S.dig[m]].name}`, 128, 184, '#ffe040', { align: 'center' }); txt('STAND ON THE X AND PRESS DOWN', 128, 198, '#a8b0d8', { align: 'center' }); }
        else { txt('PIECES ARE HIDDEN IN:', 128, 172, '#fff', { align: 'center' }); txt(S.pieces.filter((p) => p.map === m).map((p) => (T.got[m] & (1 << p.piece) ? '#' : '') + levelTag(p.li)).join('  '), 128, 186, '#a8f0ff', { align: 'center' }); txt('# = FOUND', 128, 200, '#a8b0d8', { align: 'center' }); }
      },
    };
  }

  // ---------------- boss rematches ----------------
  const REM = { on: false, li: -1, won: false };
  const bossLevels = () => LEVELS.map((d, li) => [d, li]).filter(([d, li]) => d && d.boss && !d.reserved && !d.custom && !d.explore && !d.bossTest && !d.rush && game && game.cleared[li]).map(([, li]) => li);
  { const _sp = PP.spawn;
    PP.spawn = function (sp) {
      const n0 = this.ents.length, r = _sp.call(this, sp);
      if (this.rematch) for (let i = n0; i < this.ents.length; i++) { const e = this.ents[i]; if (e.boss && !e._rm) { e._rm = true; e.hp = e.maxHp = Math.ceil(e.hp * 1.5); } }
      return r;
    };
  }
  { const _en = PP.enter; PP.enter = function () { if (REM.on && this.li === REM.li) this.rematch = true; return _en.apply(this, arguments); }; }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      const r = _ue.call(this, e);
      if (this.rematch && e.boss && e.alive && !e.dying && this.state === 'play' && !locked(this)) {
        if (!e.phase2 && e.hp <= e.maxHp / 2) { e.phase2 = true; this.parts.push({ k: 'text', s: 'SECOND FORM!', x: e.x - 20, y: Math.max(20, e.y - 16), vy: -0.3, life: 90 }); Audio8.sfx('roar'); this.shake = 20; }
        e.rmT = (e.rmT || 0) + 1;
        if (e.rmT % (e.phase2 ? 80 : 130) === 0) { const p = this.p, a = Math.atan2(p.y - e.y, p.x - e.x); for (const d of e.phase2 ? [-0.35, 0, 0.35] : [-0.2, 0.2]) bolt(this, e.x + e.w / 2, e.y + e.h / 2, a + d, 2); Audio8.sfx('zap'); }
        if (e.phase2 && (frame & 1) && !e._dbl) { e._dbl = true; try { _ue.call(this, e); } finally { e._dbl = false; } }
      }
      return r;
    };
  }
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) {
      if (!(this.rematch && e.boss && !e.dying)) return _de.call(this, e, cx);
      const x = Math.round(e.x + e.w / 2 - cx), y = Math.round(e.y + e.h / 2), g = ctx.createRadialGradient(x, y, 2, x, y, Math.max(e.w, e.h)); g.addColorStop(0, e.phase2 ? 'rgba(255,60,60,0.45)' : 'rgba(180,80,255,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - e.w * 1.2, y - e.h * 1.2, e.w * 2.4, e.h * 2.4);
      ctx.save(); try { ctx.filter = e.phase2 ? 'hue-rotate(150deg) saturate(1.5)' : 'hue-rotate(60deg) saturate(1.2)'; } catch (er) { /* ignore */ } try { return _de.call(this, e, cx); } finally { ctx.restore(); }
    };
  }
  { const _db = PP.damageBoss;
    PP.damageBoss = function (e) { const r = _db.call(this, e); if (this.rematch && !e.alive && !this._rmWon) { this._rmWon = true; REM.won = true; game.rematch = game.rematch || {}; const first = !game.rematch[this.li]; game.rematch[this.li] = true; if (first) payCoins(30); Save.persist(); try { if (Object.keys(game.rematch).length >= 5) Ach.unlock('rematch'); } catch (er) { /* ignore */ } } return r; };
  }
  { const _M = MapScene; MapScene = function (...a) { if (REM.on) { REM.on = false; const w = REM.won; REM.won = false; return RematchScene(w ? 'YOU BEAT ITS SECOND FORM! +30 COINS THE FIRST TIME' : 'TRY AGAIN SOME TIME!'); } return _M(...a); }; } // eslint-disable-line no-func-assign
  function RematchScene(note) {
    let sel = 0, t = 0; const msg = note || '';
    return {
      _s: () => ({ list: bossLevels(), sel }),
      enter() { Audio8.play('boss'); },
      update() {
        t++; const L = bossLevels();
        if (Input.pressed('back') || (Input.confirm() && !L.length)) { go(() => ChallengeScene(23)); return; }
        if (!L.length) return;
        if (Input.pressed('down')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
        if (Input.confirm() && t > 10) { Object.assign(REM, { on: true, li: L[sel], won: false }); Audio8.sfx('confirm'); go(() => IntroScene(L[sel], false)); }
      },
      draw() {
        drawParallax('castle', t * 0.4); drawWindow(12, 8, 232, 208); txt('BOSS REMATCHES', 128, 14, '#ff6060', { align: 'center', scale: 2 });
        const L = bossLevels();
        if (!L.length) { ['BEAT A BOSS FIRST, THEN COME', 'BACK FOR ITS SECOND FORM!'].forEach((l, i) => txt(l, 128, 90 + i * 12, '#fff', { align: 'center' })); return; }
        txt('MORE HEALTH, NEW ATTACKS, AND A', 128, 34, '#a8b0d8', { align: 'center' }); txt('FASTER SECOND FORM AT HALF HEALTH', 128, 44, '#a8b0d8', { align: 'center' });
        const SHOW = 11, top = clamp(sel - 5, 0, Math.max(0, L.length - SHOW));
        for (let i = 0; i < Math.min(SHOW, L.length); i++) { const k = top + i, li = L[k], y = 60 + i * 12, d = LEVELS[li]; txt(`${levelTag(li)} ${d.bossName || d.name}`.slice(0, 30), 32, y, k === sel ? '#ffe040' : '#fff'); if (game.rematch && game.rematch[li]) txt('#', 228, y, '#ff6060', { align: 'right' }); if (k === sel) txt('>', 22 + ((t >> 3) & 1), y, '#ffe040'); }
        txt(msg, 128, 204, '#5ae060', { align: 'center' });
      },
    };
  }
  // the Challenges menu, now with BOSS REMATCHES
  ChallengeScene = function (start = 0) { // eslint-disable-line no-func-assign
    const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'ROGUELIKE TOWER', 'GOLDEN LEVELS', 'TUTORIAL', 'MIRROR MODE', 'PARTY MODE', 'SPEEDRUN', 'WEEKLY CHALLENGE', 'MEGA BOSS RUSH', 'IRON HERO', 'RANDOMIZER', 'EXPLORE CASTLE', 'PRACTICE', 'TAG', 'ONLINE CO-OP', 'PROBLEM SPOTS', 'BOSS REMATCHES', 'BACK'];
    const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', 'RANDOM FLOORS, UPGRADES, ONE LIFE', 'HUNT 100 GOLD COINS PER LEVEL', 'LEARN ALL THE MOVES', 'EVERY LEVEL FLIPPED AROUND', 'UP TO 4 PLAYERS, 3 MINI-GAMES', 'ONE TIMER FOR THE WHOLE GAME', '3 LEVELS, 1 RULE, NEW EVERY WEEK', 'EVERY BOSS IN THE GAME IN A ROW', 'ONE LIFE FOR THE WHOLE GAME', '8 SHUFFLED LEVELS FROM A SEED', 'ONE BIG CASTLE, 4 RELICS', 'ANY BIT OF A LEVEL, SLOWED DOWN', 'CHASE OR BE CHASED! 1 OR 2 PLAYERS', 'PLAY A LEVEL WITH A FRIEND ONLINE', 'SEE WHERE YOU LOSE LIVES, PRACTISE', 'HARDER SECOND FORMS OF EVERY BOSS', ''];
    const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone())), () => RogueIntro(), () => GoldScene(), () => startTutorial(false), () => MirrorScene(), () => PartyScene(), () => SpeedrunScene(), () => WeeklyScene(), () => MegaIntro(), () => IronScene(), () => U22.RandomizerScene(), () => U22.ExploreIntro(), () => U22.PracticeScene(), () => TagScene(), () => CoopScene(), () => ProblemScene(-1), () => RematchScene()];
    let sel = Math.min(start, items.length - 1), t = 0;
    return {
      _sel: () => sel,
      enter() { Audio8.play('menu'); },
      update() {
        t++;
        if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
        if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => TitleScene()); return; }
        if (Input.confirm()) { Audio8.sfx('confirm'); go(go_[sel]); }
      },
      draw() {
        drawParallax('castle', t * 0.4); drawLogo(2); drawWindow(48, 72, 160, 136); txt('CHALLENGES', 128, 77, '#ffe040', { align: 'center' });
        const SHOW = 12, top = clamp(sel - 6, 0, items.length - SHOW);
        for (let i = 0; i < SHOW; i++) { const k = top + i, y = 88 + i * 10; txt(items[k], 74, y, k === sel ? '#ffe040' : k === 23 ? '#ff9090' : '#fff'); if (k === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); }
        if (top > 0) txt('^', 196, 86, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 196, 198, '#a8b0d8');
        txt(tips[sel], 128, 212, '#fff', { align: 'center', outline: '#101848' });
      },
    };
  };

  // ---------------- tips, talk, names, art ----------------
  { const _hud = PP.drawHUD;
    PP.drawHUD = function () {
      const r = _hud.apply(this, arguments);
      if (this.stateT < 180 && this.state === 'play' && this.def.tip && NEW.includes(LEVELS[this.li])) { const w = this.def.tip.split(' '), l1 = []; while (w.length && (l1.join(' ') + ' ' + w[0]).length <= 36) l1.push(w.shift()); drawWindow(12, 184, 232, 30); txt(l1.join(' '), 128, 190, '#fff', { align: 'center' }); txt(w.join(' '), 128, 201, '#fff', { align: 'center' }); }
      if (this.tmMsg && this.tmMsg[2] > 0) { this.tmMsg[2]--; drawWindow(16, 56, 224, 40); txt('TREASURE MAP: ' + this.tmMsg[0], 128, 63, '#ffe040', { align: 'center' }); txt(this.tmMsg[1].slice(0, 36), 128, 77, '#fff', { align: 'center' }); }
      if (this.rematch) txt('REMATCH', 250, 30, '#ff6060', { align: 'right', outline: '#101848' });
      return r;
    };
  }
  if (typeof BOSS_TALK !== 'undefined') Object.assign(BOSS_TALK, {
    jackbox: [['boss', 'POP GOES THE HERO! WIND ME UP AND WATCH ME BOUNCE!'], ['hero', "I'LL PUT A LID ON THIS!"]],
    origami: [['boss', 'I WAS FOLDED A THOUSAND TIMES. YOU WILL NOT CREASE ME!'], ['hero', 'TIME TO TURN THE PAGE!']],
    bassdrop: [['boss', 'CAN YOU FEEL IT? THE BASS IS ABOUT TO... DROP!'], ['hero', 'TURN IT DOWN! SOME OF US ARE TRYING TO SAVE THE WORLD!']],
  });
  if (typeof BOSS_NAMES !== 'undefined') Object.assign(BOSS_NAMES, { jackbox: 'JACK-IN-THE-BOX', origami: 'ORIGAMI DRAGON', bassdrop: 'THE BASS DROP' });
  if (typeof BOSS_ART !== 'undefined') Object.assign(BOSS_ART, { jackbox: 'jackbox', origami: 'origami', bassdrop: 'bassdrop' });
  if (typeof stickerArt === 'function') { const _sa = stickerArt; stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    if (id === 'jackbox') { ctx.save(); ctx.translate(x, y); ctx.scale(0.55, 0.55); drawJackbox(-10, -40, { bx: -16, state: 'pop', inv: 0 }, t); ctx.restore(); return; }
    if (id === 'origami') { ctx.save(); ctx.translate(x, y); ctx.scale(0.6, 0.6); drawOrigami(-20, -12, null, t); ctx.restore(); return; }
    if (id === 'bassdrop') { ctx.save(); ctx.translate(x, y); ctx.scale(0.45, 0.45); drawBassdrop(-20, -24, null, t); ctx.restore(); return; }
    return _sa(id, x, y, t); }; }
  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['treasure', 'X MARKS THE SPOT', 'DIG UP ALL 5 TREASURES'], ['rematch', 'SECOND FORM, SECOND WIN', 'BEAT 5 BOSS REMATCHES']);
  UPDATES.unshift(['2.7', ['NEW ISLAND: TOY BOX ISLAND', ' TOY TRAINS AND WIND-UP TOYS', ' BOSS: JACK-IN-THE-BOX', 'NEW ISLAND: PAPER CRAFT ISLE', ' FOLD THE PAGES, DODGE SCISSORS', ' BOSS: THE ORIGAMI DRAGON', 'NEW ISLAND: BEAT ISLAND', ' EVERYTHING MOVES TO THE MUSIC', ' BOSS: THE BASS DROP', 'TREASURE MAPS: 15 PIECES TO FIND', 'BOSS REMATCHES (CHALLENGES)']]);
  return { LI, NEW, W0, portalOpen, spots, tm, MAPS, TreasureScene, RematchScene, REM, bossLevels, drawJackbox, drawOrigami, drawBassdrop };
})();
function TreasureScene(back) { return U27.TreasureScene(back); }
function RematchScene(note) { return U27.RematchScene(note); }
