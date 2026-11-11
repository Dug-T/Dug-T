'use strict';
// =====================================================================
// Batch I (part 1): Pirate Cove (6th island) with cannon volleys, the
// rising tide, skelly pirates and Captain Gloombeard; the Roguelike
// Tower, Golden Levels and the tutorial; Volt and your own hero as
// playable heroes; the item reserve box; auto-run and one-button
// modes; pet tricks; boss phase 2; and hero catchphrases.
// =====================================================================
ACH_LIST.push(['pirate', 'SHIVER ME TIMBERS', 'BEAT CAPTAIN GLOOMBEARD'], ['rogue10', 'TOWER CLIMBER', 'REACH FLOOR 10 OF THE ROGUELIKE TOWER'], ['golden', 'GOLD RUSH', 'FIND ALL 100 GOLD COINS IN A LEVEL'],
  ['tutorial', 'STUDENT OF WALLY', 'FINISH THE TRAINING GROUNDS'], ['voltplay', 'SPARK PLUG', 'PLAY A LEVEL AS VOLT'], ['makerhero', 'ORIGINAL CHARACTER', 'DESIGN YOUR OWN HERO'], ['gardener', 'GREEN THUMB', 'HARVEST 5 PLANTS'],
  ['petmax', 'BEST FRIENDS', 'GET A PET TO LEVEL 4'], ['phase2', 'NOT SO FAST', 'BEAT A BOSS IN ITS PHASE 2'], ['reserve', 'SAVED FOR LATER', 'USE AN ITEM FROM YOUR RESERVE BOX']);
Object.assign(SONG_NAMES, { pirate: 'PIRATE COVE' });
Object.assign(BOSS_TALK, { gloom: [['boss', 'ARRR... WHO BOARDS ME GHOST GALLEON?'], ['hero', 'THE HERO WHO SUNK YOUR CANNONS!'], ['boss', 'THEN WALK THE PLANK, LANDLUBBER!']] });
Object.assign(BOSS_ART, { gloom: 'gloom' }); Object.assign(BOSS_NAMES, { gloom: 'CAPTAIN GLOOMBEARD' });
BEASTS.push(['skelly', 'SKELLY PIRATE', 'e'], ['gloom', 'CAPTAIN GLOOMBEARD', 'b']);
Object.assign(BEAST_INFO, { skelly: 'A RATTLY SKELETON PIRATE. STOMP ITS BONES!', gloom: 'A GHOST PIRATE CAPTAIN. STOMP HIM WHILE HE STANDS ON DECK.' });
H_ENTS['ξ'] = 'skelly';

// ---------------- art ----------------
function drawSkelly(x, y, t, face) {
  const C = hCtx || ctx; C.save(); if (face < 0) { C.translate(x * 2 + 14, 0); C.scale(-1, 1); }
  hR(x + 3, y - 2, 9, 8, '#1a1020'); hR(x + 4, y - 1, 7, 6, '#f0ecd8'); hR(x + 3, y - 3, 9, 3, '#e03040'); hR(x + 11, y - 2, 3, 2, '#e03040');
  hR(x + 6, y + 1, 2, 2, '#1a1020'); hR(x + 9, y + 1, 2, 2, '#1a1020'); hR(x + 6, y + 4, 4, 1, '#1a1020');
  hR(x + 4, y + 6, 7, 6, '#1a1020'); for (let k = 0; k < 3; k++) hR(x + 5, y + 7 + k * 2, 5, 1, '#f0ecd8'); hR(x + 11, y + 5, 1, 7, '#c0c8d8'); hR(x + 10, y + 11, 3, 1, '#a07040');
  const l = (t >> 3) & 1; hR(x + 5 - l, y + 12, 2, 2, '#f0ecd8'); hR(x + 8 + l, y + 12, 2, 2, '#f0ecd8');
  C.restore();
}
function drawGloom(x, y, e, t) {
  const C = hCtx || ctx; C.save();
  const a = e ? (e.state === 'fade' ? 0.12 : e.state === 'appear' ? 0.25 + (e.act < 30 ? (30 - e.act) / 40 : 0) : e.inv > 0 && (frame >> 2) & 1 ? 0.35 : 0.9) : 0.9;
  C.globalAlpha = a; const bob = Math.round(Math.sin(t * 0.08) * 2);
  hR(x + 2, y + 10 + bob, 24, 22, '#1a1020'); hR(x + 3, y + 11 + bob, 22, 20, '#a02030'); hR(x + 12, y + 11 + bob, 4, 20, '#ffd040');
  for (let k = 0; k < 5; k++) hR(x + 4 + k * 4, y + 31 + bob + (((t >> 3) + k) % 2), 3, 4, 'rgba(120,255,200,0.7)');
  hR(x + 6, y + 2 + bob, 16, 10, '#1a1020'); hR(x + 7, y + 3 + bob, 14, 8, '#a8f0d0'); hR(x + 9, y + 5 + bob, 3, 2, '#1a1020'); hR(x + 16, y + 5 + bob, 3, 2, '#1a1020'); hR(x + 15, y + 4 + bob, 5, 1, '#1a1020');
  hR(x + 7, y + 9 + bob, 14, 5, '#e0e8f0'); hR(x + 9, y + 13 + bob, 10, 3, '#e0e8f0');
  hR(x, y - 2 + bob, 28, 5, '#1a1020'); hR(x + 1, y - 1 + bob, 26, 3, '#3a2a4a'); hR(x + 7, y - 6 + bob, 14, 5, '#1a1020'); hR(x + 8, y - 5 + bob, 12, 4, '#3a2a4a'); hR(x + 13, y - 4 + bob, 2, 2, '#f0ecd8');
  hR(x + 24, y + 14 + bob, 3, 10, '#c0c8d8'); hR(x + 23, y + 23 + bob, 5, 2, '#ffd040');
  C.restore();
  if (e && e.state === 'rest' && (frame >> 3) & 1) txt('!', x + 12, y - 18, '#ffe040', { outline: '#1a1020' });
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    if (id === 'skelly') { drawSkelly(x - 7, y - 6, t, 1); return; }
    if (id === 'gloom') { ctx.save(); ctx.translate(x, y); ctx.scale(0.55, 0.55); drawGloom(-14, -16, null, t); ctx.restore(); return; }
    return _sa(id, x, y, t);
  };
}

// ---------------- Pirate Cove levels, the tutorial and the tower floors ----------------
LEVELS.push(
  { // 51
    name: 'SHIPWRECK SHORE', theme: 'beach', music: 'pirate', width: 150, tag: 'PC1', world: 'PIRATE COVE 1',
    extras: [['h', 46], ['u', 100]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').coins(7, 10, 4).set(14, 11, 'ξ').fill(20, 9, 26, 11, 'X').coins(21, 8, 5).set(28, 11, 'g');
      b.ground(34, 60).set(40, 11, 'ξ').row(48, 8, 'WPW').set(56, 11, 'C');
      b.fill(62, 10, 64, 10, '=');
      b.ground(67, 100).set(72, 11, 'ξ').set(80, 11, 'g').stairsUp(88, 3).fill(91, 9, 94, 11, 'X').stairsDown(95, 3).coins(91, 8, 4);
      b.ground(104, 149).set(110, 11, 'ξ').set(118, 11, 'ξ').row(124, 8, 'BWB').coins(130, 10, 5).set(143, 11, 'G');
    },
  },
  { // 52
    name: 'CANNON DECK', theme: 'airship', music: 'airship', width: 150, volley: true, tag: 'PC2', world: 'PIRATE COVE 2',
    extras: [['t', 60]],
    build(b) {
      b.ground(0, 26, 10).set(2, 9, '@').coins(8, 8, 4).set(16, 9, 'ξ');
      b.ground(30, 52, 9).set(36, 8, 'ξ').row(42, 5, 'WEW').set(48, 8, 'g');
      b.ground(56, 78, 10).set(60, 9, 'C').set(66, 9, 'ξ').set(72, 9, 'ξ');
      b.ground(82, 100, 8).set(88, 7, 'ξ').coins(90, 6, 4);
      b.ground(104, 120, 10).set(110, 9, 'g').row(114, 6, 'BPB');
      b.ground(124, 149, 9).set(130, 8, 'ξ').set(143, 8, 'G');
    },
  },
  { // 53
    name: 'RISING TIDE', theme: 'beach', music: 'pirate', width: 150, tide: { low: 12, high: 6, period: 1300 }, tag: 'PC3', world: 'PIRATE COVE 3',
    build(b) {
      b.ground(0, 14).set(2, 11, '@').coins(6, 10, 4);
      b.set(18, 12, 'f').fill(21, 7, 22, 13, '#').coins(21, 5, 2);
      b.ground(26, 40).set(30, 11, 'ξ').fill(36, 3, 37, 11, 'X').coins(36, 2, 2);
      b.set(44, 12, 'f').fill(47, 9, 48, 13, '#').coins(47, 4, 2);
      b.ground(52, 70).set(56, 11, 'C').set(62, 11, 'ξ').row(66, 4, 'WOW');
      b.set(74, 12, 'f').fill(76, 8, 77, 13, '#').set(80, 11, 'f').fill(83, 6, 84, 13, '#').coins(83, 2, 2);
      b.ground(88, 110).set(94, 11, 'ξ').fill(100, 4, 101, 11, 'X').coins(100, 3, 2);
      b.set(114, 12, 'f').fill(116, 9, 117, 13, '#');
      b.ground(120, 149).set(126, 11, 'ξ').set(143, 11, 'G');
    },
  },
  { // 54
    name: 'SKULL CAVE', theme: 'cave', music: 'cave', width: 160, lantern: true, tag: 'PC4', world: 'PIRATE COVE 4',
    extras: [['b', 30], ['b', 90], ['b', 130]],
    build(b) {
      b.fill(0, 0, 159, 0, '#');
      b.ground(0, 26).set(2, 11, '@').set(10, 8, CRYS).set(14, 11, 'ξ').fill(20, 12, 21, 12, '^');
      b.ground(30, 56).set(34, 11, 'ξ').set(40, 7, CRYS).row(44, 8, 'BWB').set(50, 11, 'ξ');
      b.ground(60, 64).fill(63, 4, 63, 9, 'X').ground(66, 82, 4).set(66, 8, CRYS).coins(69, 3, 4).set(76, 3, 'ξ');
      b.ground(83, 110).set(86, 11, 'C').set(92, 11, 'ξ').fill(98, 12, 99, 12, '^').set(104, 7, CRYS).coins(106, 10, 3);
      b.ground(114, 159).set(120, 11, 'ξ').set(128, 11, 'ξ').set(136, 7, CRYS).row(140, 8, 'WPW').set(152, 11, 'G');
    },
  },
  { // 55
    name: 'GHOST GALLEON', theme: 'haunted', music: 'pirate', width: 90, boss: true, bossHp: 7, bossName: 'CAPTAIN GLOOMBEARD', bossType: 'gloom', talk: 'gloom', tag: 'PC5', world: 'PIRATE COVE 5',
    bossMsg: ['CAPTAIN GLOOMBEARD SINKS INTO', 'THE SEA FOR GOOD!', '', 'HIS TREASURE CHEST IS FULL OF', 'SIGNAL CHIPS. PIRATE COVE', 'HAS FULL SIGNAL AGAIN.', '', 'YO HO HO, WALLYMAN!'],
    build(b) {
      b.ground(0, 89).set(2, 11, '@').coins(8, 10, 4).set(14, 11, 'ξ').set(22, 11, 'ξ').row(28, 8, 'WEW').set(36, 11, 'C').set(44, 11, 'ξ').set(52, 11, 'ξ');
      b.row(77, 8, '===').row(84, 8, '===').set(82, 11, '*');
    },
  },
  { // 56
    name: 'TRAINING GROUNDS', theme: 'grass', music: 'grass', width: 112, noAuto: true, noSign: true, tag: 'TR', world: 'TUTORIAL',
    signs: {
      4: ['HOLD RIGHT TO WALK.', 'HOLD B TO RUN!'], 12: ['PRESS A TO JUMP. HOLD', 'A TO JUMP HIGHER!'], 20: ['RUN AND JUMP TO', 'CLEAR GAPS!'], 29: ['JUMP ON ENEMIES', 'TO STOMP THEM!'],
      36: ['JUMP UP INTO BONUS', 'BLOCKS FOR GOODIES!'], 45: ["PRICKLES ARE SPIKY! DON'T", 'STOMP. PRESS B TO THROW', 'A CANNONBALL INSTEAD.'], 55: ['IN THE AIR, PRESS DOWN', 'TO GROUND POUND!', 'SMASH THESE BRICKS.'],
      64: ['PUSH INTO A WALL IN THE', 'AIR TO SLIDE. JUMP TO', 'KICK OFF IT. CLIMB UP!'], 84: ['PRESS S FOR A SPECIAL', 'ATTACK. IT HITS ALL', 'THE FOES NEAR YOU!'], 98: ['TOUCH THE TOWER TO FINISH.', 'YOU ARE READY. GOOD LUCK!'],
    },
    build(b) {
      b.ground(0, 111).set(2, 11, '@');
      for (const x of [4, 12, 20, 29, 36, 45, 55, 64, 84, 98]) b.set(x, 11, 'ς');
      b.fill(16, 10, 17, 11, 'X').gap(23, 25).set(32, 11, 'g').row(38, 8, 'WPW').set(49, 11, 'p').set(53, 11, 'a');
      b.fill(58, 12, 60, 12, 'B').fill(58, 13, 60, 13, 'B').set(59, 13, 'B');
      b.fill(67, 4, 67, 9, 'X').ground(70, 80, 4).coins(72, 3, 4).set(82, 11, 'C');
      b.set(88, 11, 'g').set(90, 11, 'g').set(92, 11, 'g').set(104, 11, 'G');
    },
  },
);
const PIRATE_BASE = 51, TUTORIAL_LI = 56;
function rogueDef(floor) {
  let s = (floor * 7919 + 13) >>> 0; const r = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
  const themes = ['castle', 'cave', 'haunted', 'volcano', 'factory', 'static', 'crystal', 'neon'], th = themes[(floor - 1) % themes.length];
  const foes = 'gphzcbt'.slice(0, Math.min(7, 2 + Math.floor(floor / 2)));
  return {
    name: `TOWER FLOOR ${floor}`, theme: th, music: th === 'crystal' ? 'crystal' : th === 'neon' ? 'neon' : th, width: 96, noAuto: true, noSign: true, rogue: true,
    build(b) {
      b.ground(0, 9).set(2, 11, '@');
      let x = 10;
      while (x < 82) {
        const k = r(), d = Math.min(1, floor / 12);
        if (k < 0.18) { const g = 2 + (r() < d ? 1 : 0); x += g; b.ground(x, x + 6); if (r() < 0.6) b.set(x + 3, 11, foes[Math.floor(r() * foes.length)]); x += 7; }
        else if (k < 0.32) { b.ground(x, x + 8).stairsUp(x + 2, 3).fill(x + 5, 9, x + 6, 11, 'X').coins(x + 5, 8, 2); x += 9; }
        else if (k < 0.46) { b.ground(x, x + 9).row(x + 3, 8, r() < 0.5 ? 'WPW' : 'BWB'); if (r() < 0.7) b.set(x + 7, 11, foes[Math.floor(r() * foes.length)]); x += 10; }
        else if (k < 0.58) { b.fill(x + 1, 9, x + 4, 9, '='); x += 6; b.ground(x, x + 5); x += 6; }
        else if (k < 0.68) { b.ground(x, x + 8).fill(x + 3, 12, x + 4, 12, '^').coins(x + 3, 9, 2); x += 9; }
        else if (k < 0.78 && floor > 2) { b.set(x + 1, 9, 'm'); x += 8; b.ground(x, x + 5); x += 6; }
        else { b.ground(x, x + 8); for (let i = 0; i < 1 + Math.floor(d * 2); i++) b.set(x + 2 + i * 3, 11, foes[Math.floor(r() * foes.length)]); if (r() < 0.4) b.set(x + 4, 4, 'z'); x += 9; }
      }
      b.ground(x, 95).set(Math.min(90, x + 6), 11, 'G');
    },
  };
}
const ROGUE_PERKS = [
  { id: 'boots', name: 'JET BOOTS', desc: 'DOUBLE JUMP ON EVERY FLOOR' }, { id: 'heart', name: 'TOUGH STUFF', desc: 'START EACH FLOOR WITH 3 HEARTS' },
  { id: 'magnet', name: 'COIN MAGNET', desc: 'PULL IN COINS ALL THE TIME' }, { id: 'shield', name: 'BUBBLE SHIELD', desc: 'A FREE SHIELD EVERY FLOOR' },
  { id: 'ammo', name: 'CANNON PRO', desc: '9 CANNONBALLS EVERY FLOOR' }, { id: 'special', name: 'SUPER SPECIAL', desc: '9 SPECIALS EVERY FLOOR' },
  { id: 'speed', name: 'SPEEDY SHOES', desc: 'RUN FASTER THAN EVER' }, { id: 'time', name: 'SLOW CLOCK', desc: '+40 SECONDS EVERY FLOOR' },
];

// ---------------- the new playable heroes: Volt and your own design ----------------
const MAKER_SUITS = [['#2f62d0', '#1d3f94', '#5a8af0', '#86aaff'], ['#e83030', '#a01818', '#ff7060', '#ffb0a0'], ['#2ea84a', '#1a7030', '#5ad070', '#90f0a0'], ['#8a3ac8', '#5a1a8a', '#b070f0', '#d8b0ff'], ['#1a1a24', '#0a0a10', '#3a3a4a', '#6a6a80'], ['#f0f0f8', '#a8a8c0', '#ffffff', '#ffffff'], ['#ff8a20', '#c05a10', '#ffb060', '#ffd8a0'], ['#ff60b0', '#c02a7a', '#ff90d0', '#ffc8e8']];
const MAKER_CAPES = [['#f2702a', '#b4461a', '#ffa060'], ['#ffd040', '#c09010', '#fff0a0'], ['#e83050', '#a01830', '#ff8090'], ['#40c0ff', '#1a80c0', '#a0e0ff'], ['#5ae060', '#2a9a30', '#a0f0a0'], ['#1a1a24', '#0a0a10', '#4a4a5a'], ['#ffffff', '#b0b0c8', '#ffffff'], ['#b060ff', '#7020c0', '#d8b0ff']];
const MAKER_SKINS = [['#f2b48a', '#c97c58', '#ffd8b8'], ['#ffd8c0', '#e0a888', '#fff0e0'], ['#c88a5a', '#9a5a30', '#e8b088'], ['#8a5a3a', '#5a3418', '#b07a50'], ['#5a3a24', '#3a2010', '#7a5038'], ['#90e070', '#5aa040', '#c0ffa0']];
const MAKER_LENS = ['#d8f0ff', '#5ff0ff', '#ff3040', '#ffe040', '#5ae060', '#1a1020'];
const MAKER_HAIR = ['none', 'spiky', 'mohawk', 'long', 'bun', 'curly'];
const MAKER_HAIRCOL = ['#3a2010', '#1a1020', '#ffd040', '#e05a20', '#c0c8d8', '#ff60b0', '#40a0ff'];
const makerCfg = () => Object.assign({ suit: 0, cape: 0, skin: 0, lens: 0, hair: 1, hairCol: 0, name: 'MY HERO' }, Settings.get('maker') || {});
const makerKey = (c = makerCfg()) => `mk${c.suit}${c.cape}${c.skin}${c.lens}`;
function makerRegister(c = makerCfg()) {
  const k = makerKey(c), S = MAKER_SUITS[c.suit] || MAKER_SUITS[0], O = MAKER_CAPES[c.cape] || MAKER_CAPES[0], K = MAKER_SKINS[c.skin] || MAKER_SKINS[0];
  if (!Wally.COSTUMES[k]) Wally.COSTUMES[k] = { blue: S[0], blueD: S[1], blueL: S[2], blueLL: S[3], org: O[0], orgD: O[1], orgL: O[2], skin: K[0], skinD: K[1], skinL: K[2], lens: MAKER_LENS[c.lens] || MAKER_LENS[0] };
  return k;
}
{ // hair styles are drawn like hats, in the chosen colour
  const hairDraw = (rows) => ({ w: rows[0].length, h: rows.length, draw(x, p) { const col = MAKER_HAIRCOL[makerCfg().hairCol] || '#3a2010'; rows.forEach((r, Y) => { for (let X = 0; X < r.length; X++) if (r[X] !== '.') { x.fillStyle = r[X] === 'K' ? '#1a1020' : col; x.fillRect(p.x + X * p.s, p.y + Y * p.s, p.s, p.s); } }); } });
  Object.assign(Wally.HATS, {
    hair_spiky: hairDraw(['.K.K.K.K.', 'KhKhKhKhK', 'KhhhhhhhK', '.KhhhhhK.']), hair_mohawk: hairDraw(['...KK...', '..KhhK..', '..KhhK..', '.KKhhKK.']),
    hair_long: hairDraw(['..KKKKKKK..', '.KhhhhhhhK.', 'KhhhhhhhhhK', 'Khh.....hhK', 'Khh.....hhK', 'KK.......KK']), hair_bun: hairDraw(['...KKK...', '..KhhhK..', '.KKKKKKK.', 'KhhhhhhhK', '.KhhhhhK.']),
    hair_curly: hairDraw(['.K.KK.K..', 'KhKhhKhK.', 'KhhhhhhhK', 'KhKhhKhhK', '.K.KK.KK.']),
    pirate: { w: 13, h: 6, draw(x, p) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); }; r(0, 2, 13, 3, '#1a1020'); r(2, 0, 9, 3, '#1a1020'); r(1, 3, 11, 1, '#3a2a4a'); r(5, 1, 3, 2, '#f0ecd8'); r(0, 5, 13, 1, '#ffd040'); } },
    flower: { w: 11, h: 4, draw(x, p, t) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); }; r(0, 2, 11, 1, '#2a9a30'); [['#ff60b0', 0], ['#ffe040', 3], ['#40c0ff', 6], ['#ff8a20', 9]].forEach(([c, X]) => { r(X, 1, 2, 2, c); r(X + 0.5, 0, 1, 1, c); }); } },
    viking: { w: 13, h: 7, draw(x, p) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); }; r(3, 2, 7, 5, '#1a1020'); r(4, 3, 5, 4, '#a0a8b8'); r(4, 5, 5, 1, '#c09010'); r(0, 0, 2, 4, '#f0ecd8'); r(1, 3, 2, 2, '#f0ecd8'); r(11, 0, 2, 4, '#f0ecd8'); r(10, 3, 2, 2, '#f0ecd8'); } },
  });
  HAT_LIST.push({ id: 'pirate', name: 'PIRATE HAT', price: 9999, garden: true }, { id: 'flower', name: 'FLOWER CROWN', price: 9999, garden: true }, { id: 'viking', name: 'VIKING HELMET', price: 9999, garden: true });
}
Object.assign(HEROES, {
  volt: { name: 'VOLT', alt: 'VOLT', short: 'VOLT', color: '#5aa0ff', secret: true, hint: ['FINISH', "DOUG'S STORY"], ok: () => storyDone() >= 3, lines: ['SECRET HERO! THE FASTEST', 'RUNNER OF ALL. SPECIAL:', 'LIGHTNING DASH THROUGH FOES!'] },
  maker: { alt: 'MY HERO', color: '#ffe040', lines: ['THE HERO YOU DESIGNED!', 'DESIGN THEM IN', 'EXTRAS > HERO MAKER.'] },
});
Object.defineProperty(HEROES.maker, 'name', { get: () => makerCfg().name || 'MY HERO', enumerable: true });
Object.defineProperty(HEROES.maker, 'short', { get: () => (makerCfg().name || 'MY HERO').slice(0, 8), enumerable: true });
HERO_IDS.push('volt', 'maker');
{
  const _frame = Wally.frame, _draw = Wally.draw, vcache = new Map();
  const tintC = (src, col) => { const c = Sprites.canvas(Wally.W, Wally.H), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, Wally.W, Wally.H); return c; };
  const voltFrame = (pose, face, variant) => {
    const key = `${pose}|${face > 0 ? 1 : 0}|${variant}`; let c = vcache.get(key); if (c) return c;
    if (variant !== 'n') c = tintC(voltFrame(pose, face, 'n'), variant === 'w' ? '#ffffff' : variant === 'k' ? '#1a1020' : '#5ff0ff');
    else if (face < 0) c = Sprites.flip(voltFrame(pose, 1, 'n'));
    else { c = Sprites.canvas(Wally.W, Wally.H); hCtx = c.getContext('2d'); const k = parseInt(String(pose).replace(/\D/g, ''), 10) || 0; try { drawVolt(12, 31, 1, k * 4, /walk|run/.test(pose) ? 'run' : 'idle'); } finally { hCtx = null; } }
    vcache.set(key, c); return c;
  };
  Wally.frame = function (pose, capeF, signal, face, variant = 'n', costume = 'classic', hero = 'wally') {
    if (hero === 'volt') return voltFrame(pose, face, variant);
    if (hero === 'maker') return _frame(pose, capeF, signal, face, variant, makerRegister(), 'wally');
    return _frame(pose, capeF, signal, face, variant, costume, hero);
  };
  Wally.draw = function (c2, cx, feetY, pose, face, o = {}) {
    const hero = o.hero || Wally.hero;
    if (hero !== 'volt' && hero !== 'maker') return _draw(c2, cx, feetY, pose, face, o);
    const capeF = o.capeF !== undefined ? o.capeF : (Math.floor((o.t !== undefined ? o.t : 0) / 6) & 3), sx = o.sx || 1, sy = o.sy || 1;
    const w = Math.round(Wally.W * sx), h = Math.round(Wally.H * sy), X = Math.round(cx - w / 2), Y = Math.round(feetY - h);
    if (o.glow) { const g = Wally.frame(pose, capeF, o.signal, face, 'g', 'classic', hero); c2.save(); c2.globalAlpha = o.glow; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c2.drawImage(g, X + dx, Y + dy, w, h); c2.restore(); }
    const img = Wally.frame(pose, capeF, o.signal, face, o.white ? 'w' : o.ghost ? 'g' : o.black ? 'k' : 'n', 'classic', hero);
    c2.drawImage(img, X, Y, w, h);
    if (o.ghost || o.black) return;
    if (hero === 'maker') { const style = MAKER_HAIR[makerCfg().hair] || 'none'; if (style !== 'none') Wally.drawHat(c2, img, X, Y, w / Wally.W, h / Wally.H, 'hair_' + style, o.t); }
    const hat = o.hat !== undefined ? o.hat : Wally.hat;
    if (hat && hat !== 'none') Wally.drawHat(c2, img, X, Y, w / Wally.W, h / Wally.H, hat, o.t);
  };
}

// ---------------- in-level additions ----------------
const RESERVE_FULL = { drink: (p) => p.hearts >= 3, boots: (p) => p.boots, shield: (p) => p.shield, battery: (p) => p.charge > 0, magnet: (p) => p.magnet > 0, phone: (p) => p.power === 'signal' };
const RESERVE_NAMES = { drink: 'ENERGY DRINK', boots: 'JET BOOTS', shield: 'BUBBLE SHIELD', battery: 'SUPER CHARGE', magnet: 'COIN MAGNET', phone: 'SIGNAL PHONE' };
const petLevel = (kind) => { const xp = ((game && game.petXP) || {})[kind] | 0; return xp >= 18 ? 4 : xp >= 10 ? 3 : xp >= 4 ? 2 : 1; };
const PET_TRICKS = ['SAVES YOU FROM ONE HIT A LIFE', 'FETCH: GRABS COINS FROM FURTHER', 'SNIFF: BARKS NEAR SECRETS', 'GUARD: COMES BACK 3X FASTER'];
const goldOpen = (li) => { const isl = [[7, [0, 1, 2, 4, 5, 6, 8, 9]], [14, [11, 12, 13]], [20, [15, 16, 17, 18, 19]], [27, [24, 26, 30, 31]], [44, [38, 39, 40, 41, 42]], [55, [51, 52, 53, 54]]]; for (const [c, ls] of isl) if (ls.includes(li)) return Save.slots.some((s) => s && s.cleared && s.cleared[c]); return false; };
const GOLD_LV = [0, 1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19, 24, 26, 30, 31, 38, 39, 40, 41, 42, 51, 52, 53, 54];
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initI) this.initI();
    _upd.call(this);
    if (this.paused || this.talk || this.photo || this.state !== 'play') return;
    const p = this.p;
    // cannon volleys from pirate ships out at sea
    if (this.def.volley && !this.bossLock && ++this.volT % 170 === 60) for (const dx of [-36, 4, 46]) this.addCannonball(clamp(p.x + dx, this.cam.x + 8, this.cam.x + VW - 8));
    // the tide comes in and goes out
    if (this.def.tide) {
      const td = this.def.tide, ph = (1 - Math.cos((this.hF || 0) / td.period * Math.PI * 2)) / 2, row = Math.round(td.low - (td.low - td.high) * ph);
      if (row !== this.tideRow) { const g = this.lv.grid, W = this.lv.w; for (let y = 0; y < 14; y++) for (let x = 0; x < W; x++) { if (y >= row && g[y][x] === '.') g[y][x] = '~'; else if (y < row && g[y][x] === '~') g[y][x] = '.'; } this.tideUp = row < (this.tideRow || 99); this.tideRow = row; }
    }
  };
  Play.prototype.addCannonball = function (gx) {
    let gy = VH; for (let y = 2; y < 14; y++) if (SOLID.has(this.tile(Math.floor(gx / TS), y))) { gy = y * TS; break; }
    this.ents.push({ type: 'cball', alive: true, t: 0, warn: 50, gx, gy, x: gx, y: gy - 8, w: 8, h: 8, vx: 0, vy: 0 });
  };
  Play.prototype.initI = function () {
    this._initI = true;
    const m = this.mode, p = this.p, kind = m && m.kind;
    this.volT = 0;
    if (heroOf() === 'volt' && !kind) Ach.unlock('voltplay');
    if (kind === 'rogue') {
      const k = new Set(m.perks || []);
      if (k.has('boots')) p.boots = true; if (k.has('heart')) p.hearts = 3; if (k.has('shield')) p.shield = true; if (k.has('ammo')) p.ammo = 9; if (k.has('special')) p.special = 9; if (k.has('time')) this.time += 40;
      this.parts.push({ k: 'text', s: `FLOOR ${m.floor}`, x: 100, y: 70, vy: 0, life: 100, fixed: true });
    }
    if (kind === 'gold') { // scatter 100 gold coins over the level
      this.def = Object.assign({}, this.def, { goldTint: true }); this.time = Math.ceil(this.time * 1.6 / 5) * 5; this.goldGot = 0;
      const g = this.lv.grid, W = this.lv.w, gx = this.lv.goal ? this.lv.goal.x - 2 : W - 6, cand = [];
      const firm = (c) => SOLID.has(c) || c === '=';
      for (let x = 4; x < gx; x++) for (let y = 2; y < 12; y++) { if (g[y][x] !== '.') continue; let ok = false; for (let d = 1; d <= 3 && y + d < 14; d++) { const c = g[y + d][x]; if (firm(c)) { ok = c !== '^' && c !== 'L'; break; } if (c !== '.' && c !== 'o') break; } if (ok) cand.push([x, y]); }
      cand.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
      const pick = []; for (let i = 0; i < 100 && cand.length; i++) pick.push(cand[Math.floor(i * cand.length / 100)]);
      for (const [x, y] of pick) this.ents.push({ type: 'gcoin', alive: true, t: x * 3, x: x * TS + 3, y: y * TS + 2, w: 10, h: 12 });
      this.goldTotal = pick.length;
    }
    if (kind === 'tutorial') this.time = 400;
  };
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    if (this.mode && this.mode.kind === 'replay') return _up.call(this);
    const p = this.p, D = Input.down, Pr = Input.pressed, ar = !!Settings.get('autorun'), ob = !!Settings.get('onebtn');
    // the reserve box: hold Up and press S to drop your stored item
    let useRes = false;
    if (this.state === 'play' && game && game.reserve && D('up') && Pr('special')) {
      useRes = true; const type = game.reserve; game.reserve = null; Audio8.sfx('sprout'); Ach.unlock('reserve');
      this.ents.push({ type, item: true, alive: true, fromRes: true, x: p.x - 1, y: Math.max(8, p.y - 56), w: 12, h: 14, vx: 0, vy: 0, rise: 0, t: 0 });
      this.parts.push({ k: 'text', s: RESERVE_NAMES[type] + '!', x: p.x - 24, y: p.y - 30, vy: -0.4, life: 50 });
    }
    const masked = useRes || ((ar || ob) && this.state === 'play');
    if (masked) {
      Input.down = (k) => {
        if (ob) { if (k === 'jump') return D('jump') || D('run') || D('special'); if (k === 'right' || k === 'run') return true; if (['left', 'up', 'down', 'special'].includes(k)) return false; return D(k); }
        if (ar) { if (k === 'right') return !D('left'); if (k === 'run') return true; }
        return D(k);
      };
      Input.pressed = (k) => {
        if (useRes && k === 'special') return false;
        if (ob) { if (k === 'jump') return Pr('jump') || Pr('run') || Pr('special'); if (['run', 'special', 'up', 'down', 'left', 'right'].includes(k)) return false; }
        return Pr(k);
      };
    }
    try { _up.call(this); } finally { Input.down = D; Input.pressed = Pr; }
    if (this.state !== 'play') return;
    // Volt and the Speedy Shoes perk run faster
    const fast = heroOf() === 'volt' ? 3.45 : this.mode && this.mode.kind === 'rogue' && (this.mode.perks || []).includes('speed') ? 3.2 : 0;
    if (fast && p.onGround && (D('run') || ar || ob) && Math.abs(p.vx) > 2.5) p.vx = Math.sign(p.vx) * Math.min(fast, Math.abs(p.vx) + 0.13);
    if (this.mode && this.mode.kind === 'rogue' && (this.mode.perks || []).includes('magnet')) p.magnet = Math.max(p.magnet || 0, 200);
    // Volt's lightning dash
    if (p.dashT > 0) {
      p.dashT--; p.vx = p.face * 5.2; p.vy = Math.min(p.vy, 0.6); p.inv = Math.max(p.inv, 6);
      if (frame % 2 === 0) this.parts.push({ k: 'spark', x: p.x + p.w / 2 - p.face * 8, y: p.y + 6 + (frame % 3) * 4, life: 10 });
      for (const e of this.ents) if (e.enemy && e.alive && !e.dying && overlap({ x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, e)) { if (e.boss) { if (!e.inv) this.damageBoss(e); } else this.flipKill(e); }
    }
  };
  const _sw = Play.prototype.shockwave;
  Play.prototype.shockwave = function (...a) {
    if (heroOf() === 'volt') { this.p.dashT = 26; this.p.shockT = 14; Audio8.sfx('zap'); Audio8.sfx('swoop'); this.usedSpecial = true; return; }
    return _sw.apply(this, a);
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.type === 'gcoin') { e.t++; if (this.state === 'play' && overlap(p, e)) { e.alive = false; this.goldGot++; game.score += 50; Audio8.sfx('coin'); this.parts.push({ k: 'spark', x: e.x + 2, y: e.y + 2, life: 10 }); if (this.goldGot === this.goldTotal) { Ach.unlock('golden'); Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: 'ALL 100 GOLD COINS!', x: p.x - 40, y: p.y - 30, vy: -0.3, life: 120 }); } } return; }
    if (e.type === 'cball') {
      e.t++;
      if (e.t === e.warn) { e.x = e.gx + 42; e.y = -12; e.vx = -1; e.vy = 4.5; Audio8.sfx('cannon'); }
      if (e.t > e.warn) { e.x += e.vx; e.y += e.vy; if (this.state === 'play' && overlap(p, e)) this.hurt(); if (e.y + 8 >= e.gy || e.y > VH) { e.alive = false; this.parts.push({ k: 'blast', x: e.x + 4, y: e.y + 4, life: 16 }); if (Math.abs(e.x - this.cam.x - 128) < 160) Audio8.sfx('boom'); if (this.state === 'play' && Math.abs(p.x + p.w / 2 - e.x - 4) < 14 && Math.abs(p.y + p.h - e.gy) < 8) this.hurt(); } }
      return;
    }
    if (e.type === 'cutlass') { e.t++; e.vx += (e.home.x - e.x > 0 ? 0.09 : -0.09); e.x += e.vx; e.y += (p.y + 8 - e.y) * 0.01; if (this.state === 'play' && overlap(p, e)) this.hurt(); if (e.t > 40 && Math.abs(e.x - e.home.x) < 10) e.alive = false; if (e.t > 240) e.alive = false; return; }
    if (e.type === 'gloom') return this.updateGloom(e);
    if (e.type === 'skelly' && !e.dying && !e.iced && !(this.freezeT > 0) && e.x < this.cam.x + VW + 64) {
      e.vy = Math.min(5, (e.vy || 0) + 0.3); if (e.onGround && !this.groundAhead(e)) e.vx = -e.vx;
      const vx = e.vx; this.move(e, true); if (e.hitWall) e.vx = -Math.sign(vx) * Math.abs(vx); e.face = Math.sign(e.vx) || e.face;
    }
    if (e.drop || (e.fromRes && e.y < p.y - 2 && !e.landed)) { e.y += 1.6; if (e.y >= p.y) e.landed = true; }
    // a power-up you don't need right now goes into the reserve box
    if (e.item && !e.fromRes && e.rise <= 0 && RESERVE_FULL[e.type] && this.state === 'play' && game && !game.reserve && overlap(p, e) && RESERVE_FULL[e.type](p)) {
      e.alive = false; game.reserve = e.type; Audio8.sfx('check'); this.parts.push({ k: 'text', s: 'STORED! UP + S TO USE', x: p.x - 40, y: p.y - 24, vy: -0.4, life: 70 }); return;
    }
    return _ue.call(this, e);
  };
  Play.prototype.updateGloom = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    if (!this.bossLock || this.talk || this._p2ctx) return;
    e.t++; const rage = e.maxHp - e.hp, L = this.camMin + 16, R = this.camMin + VW - 44;
    if (--e.act <= 0) {
      const next = { fade: 'appear', appear: 'throw', throw: 'volley', volley: 'rest', rest: 'fade' }[e.state] || 'fade';
      e.state = next; e.act = { fade: 50, appear: 40, throw: 70, volley: 60, rest: 110 - rage * 8 }[next];
      if (next === 'fade') { Audio8.sfx('swoop'); e.tx = p.x < this.camMin + VW / 2 ? R : L; }
      if (next === 'throw') { const d = p.x < e.x ? -1 : 1; this.ents.push({ type: 'cutlass', alive: true, t: 0, x: e.x + 10, y: e.y + 14, w: 10, h: 8, vx: d * (3.4 + rage * 0.15), home: { x: e.x + 10 } }); Audio8.sfx('swoop'); }
      if (next === 'volley') { for (const dx of [-30, 10, 50]) this.addCannonball(clamp(p.x + dx, this.camMin + 8, this.camMin + VW - 8)); if (rage >= 4) this.addCannonball(clamp(p.x - 70, this.camMin + 8, this.camMin + VW - 8)); }
    }
    if (e.state === 'fade') e.x += (e.tx - e.x) * 0.06;
    e.y = e.state === 'rest' ? 12 * TS - 36 : 12 * TS - 36 - 26 + Math.sin(e.t * 0.05) * 6;
    e.weak = e.state === 'rest';
    if (e.state === 'fade' || this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.weak && p.vy > 0 && p.prevBottom <= e.y + 12) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'fade'; e.act = 50; e.tx = p.x < this.camMin + VW / 2 ? R : L; } return; }
    if (e.state !== 'appear') this.hurt();
  };
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    if (sp.t === '*' && this.def.bossType === 'gloom') { const hp = (this.def.bossHp || 7) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0); this.ents.push({ type: 'gloom', boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS - 20, y: 120, w: 28, h: 36, hp, maxHp: hp, inv: 0, state: 'rest', act: 60, vx: 0, vy: 0 }); return; }
    return _sp.call(this, sp);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) {
    const a = e.alive, sa = Sticker.add; if (e.type === 'gloom') Sticker.add = () => {};
    try { _db.call(this, e); } finally { Sticker.add = sa; }
    if (a && !e.alive) {
      if (e.type === 'gloom') { Ach.unlock('pirate'); this.ents.forEach((k) => { if (k.type === 'cball' || k.type === 'cutlass') k.alive = false; }); }
      if (e.p2) Ach.unlock('phase2');
      Quips.say('boss');
    }
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.type === 'gcoin') { if (x < -16 || x > VW + 16) return; const w = [8, 6, 2, 6][((frame + e.t) >> 3) % 4]; hR(x + 5 - w / 2 - 1, y - 1, w + 2, 14, '#7a4a08'); hR(x + 5 - w / 2, y, w, 12, '#ffd040'); if (w > 2) hR(x + 5 - w / 2 + 1, y + 2, 1, 6, '#fff8c0'); return; }
    if (e.type === 'cball') { if (e.t < e.warn) { if ((frame >> 2) & 1) { hR(x - 3, e.gy - 3, 3, 3, '#ff3040'); hR(x + 8, e.gy - 3, 3, 3, '#ff3040'); hR(x + 2, e.gy - 6, 4, 3, '#ff3040'); } return; } hR(x, y, 8, 8, '#1a1020'); hR(x + 1, y + 1, 6, 6, '#3a3a48'); hR(x + 2, y + 2, 2, 2, '#8a8aa0'); hR(x + 6, y - 3, 2, 3, '#ff8020'); return; }
    if (e.type === 'cutlass') { const k = (frame >> 2) % 2; hR(x, y + 3, 10, 2, '#c0c8d8'); hR(x + (k ? 0 : 8), y + 1, 2, 6, '#ffd040'); return; }
    if (e.type === 'skelly') { if (e.dying === 'flip') { ctx.save(); ctx.translate(x + 7, y + 7); ctx.scale(1, -1); drawSkelly(-7, -5, frame, e.face); ctx.restore(); return; } if (e.dying === 'squish') { ctx.save(); ctx.translate(x + 7, y + 14); ctx.scale(1.2, 0.4); drawSkelly(-7, -12, frame, e.face); ctx.restore(); return; } drawSkelly(x, y + 2, frame + (e.t || 0), e.face || -1); return; }
    if (e.type === 'gloom') { if (e.dying) return; drawGloom(x, y, e, frame); return; }
    _de.call(this, e, cx);
    if (e.type === 'boss' && e.p2 && !e.dying) { ctx.strokeStyle = (frame >> 2) & 1 ? '#ff3040' : '#ffe040'; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, y - 2.5, e.w + 5, e.h + 5); if (frame % 4 === 0) this.parts.push({ k: 'spark', x: e.x + Math.random() * e.w, y: e.y + Math.random() * e.h, life: 8 }); }
  };
}

// ---------------- boss phase 2: Baron Static and the Motherships change form at half health ----------------
{
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const r = _ue.call(this, e);
    if (e.type !== 'boss' || !e.alive || e.dying || !this.bossLock || this.talk || this.state !== 'play') return r;
    if (!e.p2 && e.hp <= Math.ceil(e.maxHp / 2) && e.maxHp >= 2) {
      e.p2 = true; e.inv = Math.max(e.inv, 60); this.shake = 20; Audio8.sfx('roar'); rumble(0.8, 300);
      this.parts.push({ k: 'text', s: 'PHASE 2!', x: this.cam.x + 104, y: 60, vy: 0, life: 100 });
    }
    if (!e.p2) return r;
    e.p2t = (e.p2t || 0) + 1; const p = this.p;
    if (e.kind === 'mother') { // bomb drops on top of the usual beam
      if (e.p2t % 95 === 0) for (const dx of [-28, 0, 28]) this.ents.push({ type: 'bolt', alive: true, t: 0, x: e.x + e.w / 2 + dx, y: e.y + e.h, w: 8, h: 8, vx: dx * 0.02, vy: 0.5, g: 0.12, life: 200 });
    } else if (e.p2t % 110 === 0) { // Baron throws a fan of static bolts
      const d = p.x < e.x ? -1 : 1; for (const k of [1.4, 2.2, 3.0]) this.ents.push({ type: 'bolt', alive: true, t: 0, x: e.x + 10, y: e.y + 4, w: 8, h: 8, vx: d * k, vy: -3.4, g: 0.16, life: 160 });
      Audio8.sfx('zap');
    }
    return r;
  };
}

// ---------------- pets learn tricks ----------------
{
  const _cl = Play.prototype.clear;
  Play.prototype.clear = function (s) {
    const was = this.state; _cl.call(this, s);
    if (was !== 'play' || this.state !== 'clear') return;
    if (this.mode && this.mode.kind === 'replay') return;
    if (this.pet && !this.mode && !this.ta && !this.rush && !this.daily && !this.def.custom) {
      const k = this.pet.kind, before = petLevel(k); game.petXP = game.petXP || {}; game.petXP[k] = (game.petXP[k] | 0) + 1; const after = petLevel(k);
      if (after > before) { this.parts.push({ k: 'text', s: `${(PETS[k] || PETS.wally).name} LEVEL ${after}!`, x: this.p.x - 30, y: this.p.y - 56, vy: -0.2, life: 140 }); if (after === 4) Ach.unlock('petmax'); }
    }
    if (Math.random() < 0.35) Quips.say('clear');
  };
  if (Play.prototype.updatePet) {
    const _pet = Play.prototype.updatePet;
    Play.prototype.updatePet = function () {
      _pet.call(this);
      const q = this.pet; if (!q || q.down) return;
      const lv = petLevel(q.kind), cx0 = Math.floor((q.x + 6) / TS), cy0 = Math.floor((q.y + 5) / TS);
      if (lv >= 2) for (let ty = cy0 - 3; ty <= cy0 + 3; ty++) for (let tx = cx0 - 3; tx <= cx0 + 3; tx++) if (this.tile(tx, ty) === 'o') { this.setTile(tx, ty, '.'); this.addCoin(); this.parts.push({ k: 'coinpop', x: tx * TS + 4, y: ty * TS, vy: -2, life: 12 }); }
      if (lv >= 3 && frame % 30 === 0) {
        this.sniffed = this.sniffed || new Set(); q.sniff = Math.max(0, (q.sniff || 0) - 30);
        for (let ty = 0; ty < 14; ty++) for (let tx = cx0 - 6; tx <= cx0 + 6; tx++) { const c = this.tile(tx, ty); if ((c === 'I' || c === 'R' || c === '`') && !this.sniffed.has(tx + ',' + ty)) { this.sniffed.add(tx + ',' + ty); q.sniff = 120; Audio8.sfx('ping'); this.parts.push({ k: 'text', s: 'SNIFF! A SECRET!', x: q.x - 30, y: q.y - 18, vy: -0.3, life: 70 }); } }
      }
    };
    const _hurt = Play.prototype.hurt;
    Play.prototype.hurt = function (s) { _hurt.call(this, s); const q = this.pet; if (q && q.down === 1200 && petLevel(q.kind) >= 4) q.down = 400; };
  }
}

// ---------------- HUD: reserve box, gold count, tide, golden tint ----------------
{
  const _dn = Play.prototype.drawNight;
  Play.prototype.drawNight = function (cx) {
    _dn.call(this, cx);
    if (this.def.goldTint) { ctx.fillStyle = 'rgba(255,200,40,0.10)'; ctx.fillRect(0, 0, VW, VH); }
    if (this.def.tide && this.tideRow !== undefined) { // the sea level, with rolling waves on top
      const y0 = this.tideRow * TS; ctx.fillStyle = 'rgba(20,90,190,0.30)'; ctx.fillRect(0, y0, VW, VH - y0);
      for (let x = 0; x < VW; x += 2) { const w = Math.round(Math.sin((x + cx) * 0.08 + frame * 0.08) * 2); ctx.fillStyle = 'rgba(220,245,255,0.85)'; ctx.fillRect(x, y0 + w, 2, 1); ctx.fillStyle = 'rgba(120,200,255,0.5)'; ctx.fillRect(x, y0 + w + 1, 2, 2); }
    }
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _hud.call(this);
    if (game && game.reserve) { hR(236, 23, 16, 16, '#1a1020'); hR(237, 24, 14, 14, '#3a3a68'); const t = game.reserve, fake = { type: t, item: true, x: 238 + Math.round(this.cam.x), y: 24, w: 12, h: 14, rise: 0, t: 0 }; ctx.save(); ctx.beginPath(); ctx.rect(237, 24, 14, 14); ctx.clip(); this.drawEnt(fake, Math.round(this.cam.x)); ctx.restore(); }
    if (this.mode && this.mode.kind === 'gold') { hR(102, 26, 52, 11, '#5a3a08'); txt(`GOLD ${this.goldGot || 0}/${this.goldTotal || 100}`, 128, 28, '#ffe040', { align: 'center' }); }
    if (this.mode && this.mode.kind === 'rogue') txt(`FLOOR ${this.mode.floor}`, 128, 28, '#ff8080', { align: 'center', outline: '#101848' });
    if (this.def.tide && this.tideRow !== undefined && this.hF % 600 < 200) txt(this.tideUp ? 'THE TIDE IS RISING!' : 'THE TIDE IS GOING OUT', 128, 30, '#5ff0ff', { align: 'center', outline: '#101848' });
    const q = this.pet; if (q && q.sniff > 0 && !q.down) { const x = Math.round(q.x - this.cam.x) + 2; hR(x - 1, q.y - 14, 9, 10, '#1a1020'); txt('!', x + 1, q.y - 13, '#ffe040'); }
  };
}

// ---------------- hero catchphrases (now and then, out loud) ----------------
const Quips = (() => {
  const L = {
    wally: { boss: 'Signal restored!', clear: 'Full bars!', oneup: 'One more go!' }, doug: { boss: 'Paused and stomped!', clear: 'Too easy!', oneup: 'Extra life, nice one!' },
    goth: { boss: 'Bats away!', clear: 'Totally spooky.', oneup: 'Another life? Sweet.' }, robo: { boss: 'Target offline.', clear: 'Mission complete.', oneup: 'Backup battery acquired.' },
    frost: { boss: 'Chill out!', clear: 'Ice and easy.', oneup: 'Cool, an extra life.' }, dino: { boss: 'Rawr!', clear: 'Rawr rawr!', oneup: 'Rawr?' },
    baron: { boss: 'Static wins again!', clear: 'Ha ha ha!', oneup: 'Excellent.' }, volt: { boss: 'Too slow!', clear: 'Faster than lightning!', oneup: 'Charged up!' }, maker: { boss: 'Nailed it!', clear: 'Easy peasy!', oneup: 'Woo hoo!' },
  };
  const female = (h) => h === 'goth' || h === 'frost';
  let last = 0;
  function say(kind) {
    if (Settings.get('quips') === false || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
    const now = Date.now(); if (now - last < 9000) return; last = now;
    try {
      const h = heroOf(), text = (L[h] || L.wally)[kind]; if (!text) return;
      const u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
      const fem = /female|samantha|victoria|karen|moira|tessa|serena|fiona|zira|hazel|susan|libby|sonia|aria|jenny/i;
      const v = female(h) ? vs.find((x) => fem.test(x.name)) : vs.find((x) => !fem.test(x.name)) || vs[0]; if (v) u.voice = v;
      u.pitch = h === 'dino' ? 0.4 : h === 'robo' ? 0.6 : h === 'baron' ? 0.5 : h === 'volt' ? 1.3 : female(h) ? 1.15 : 1; u.rate = h === 'volt' ? 1.35 : 1.05; u.volume = 0.9;
      speechSynthesis.speak(u); window.lastQuip = text;
    } catch (e) { /* no voice */ }
  }
  const _sfx = Audio8.sfx;
  Audio8.sfx = function (name) { if (name === 'oneup' && typeof scene !== 'undefined' && scene instanceof Play && scene.state === 'play') say('oneup'); return _sfx.call(Audio8, name); };
  return { say };
})();

// ---------------- mode endings ----------------
{
  const _me = modeExit;
  modeExit = function (pl, won) { // eslint-disable-line no-func-assign
    const m = pl.mode;
    if (m.kind === 'rogue') return won ? RoguePick(m.floor + 1, m.perks || []) : RogueResult(m.floor - 1, m.perks || []);
    if (m.kind === 'gold') return GoldResult(pl.li, pl.goldGot || 0, pl.goldTotal || 100, won);
    if (m.kind === 'tutorial') { if (won) { Ach.unlock('tutorial'); if (m.file) { game.tutorialDone = true; Save.persist(); } } return m.file ? MapScene() : ChallengeScene(10); }
    return _me(pl, won);
  };
}
{ // boss music for the Ghost Galleon
  const _play = Audio8.play;
  Audio8.play = function (name) { if (name === 'boss' && typeof scene !== 'undefined' && scene instanceof Play && scene.def.bossType === 'gloom') return _play.call(Audio8, 'bosscarn'); return _play.call(Audio8, name); };
}
