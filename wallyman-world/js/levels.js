'use strict';
// Level layouts. Tiles:  # ground  B brick  W bonus(coin)  P bonus(energy drink)  S bonus(signal phone)
// O bonus(1-up badge)  X solid block  = one-way platform  ^ spikes  L lava  o coin  J springboard
// Spawns: @ start  g grumble  p prickle  z buzzer  h hopper  m/n moving platform (horiz/vert)
//         C checkpoint  G goal tower  K boss
function LevelBuilder(w) {
  this.w = w; this.h = 14;
  this.g = Array.from({ length: 14 }, () => Array(w).fill('.'));
}
LevelBuilder.prototype = {
  set(x, y, c) { if (x >= 0 && x < this.w && y >= 0 && y < 14) this.g[y][x] = c; return this; },
  fill(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c); return this; },
  ground(x0, x1, top = 12) { return this.fill(x0, top, x1, 13, '#'); },
  gap(x0, x1) { return this.fill(x0, 0, x1, 13, '.'); },
  row(x, y, s) { for (let i = 0; i < s.length; i++) if (s[i] !== ' ') this.set(x + i, y, s[i]); return this; },
  coins(x, y, n) { for (let i = 0; i < n; i++) this.set(x + i, y, 'o'); return this; },
  stairsUp(x, n, base = 12, c = 'X') { for (let i = 0; i < n; i++) this.fill(x + i, base - 1 - i, x + i, base - 1, c); return this; },
  stairsDown(x, n, base = 12, c = 'X') { for (let i = 0; i < n; i++) this.fill(x + i, base - n + i, x + i, base - 1, c); return this; },
};

const LEVELS = [
  {
    name: "WALLY'S BACKYARD", theme: 'grass', music: 'grass', time: 300, width: 200,
    extras: [['u', 12], ['c', 58], ['t', 96], ['u', 108], ['g', 134], ['p', 166], ['h', 45]],
    build(b) {
      b.ground(0, 38).set(3, 11, '@');
      b.coins(8, 9, 4);
      b.row(15, 8, 'W  BPBW').set(19, 4, 'W');
      b.set(24, 11, 'g').set(33, 11, 'g');
      b.ground(42, 70);
      b.set(48, 11, 'X').fill(49, 10, 49, 11, 'X').fill(50, 9, 50, 11, 'X');
      b.row(53, 8, '=====').coins(53, 6, 5);
      b.set(62, 11, 'p').set(67, 11, 'g');
      b.set(71, 9, 'o').set(72, 8, 'o').set(73, 9, 'o');
      b.ground(74, 110).fill(80, 10, 88, 11, '#').set(84, 9, 'g');
      b.set(92, 11, 'C');
      b.set(95, 11, 'h');
      b.row(98, 8, 'BWSWB');
      b.set(104, 11, 'g').set(106, 11, 'g');
      b.row(112, 9, '==');
      b.ground(115, 157);
      b.stairsUp(120, 4).gap(124, 126).stairsDown(127, 4);
      b.set(136, 7, 'z');
      b.coins(140, 9, 6).set(142, 5, 'O');
      b.set(148, 11, 'p').set(150, 11, 'g').set(152, 11, 'g');
      b.ground(161, 199);
      b.set(165, 11, 'h');
      b.stairsUp(172, 6);
      b.coins(179, 8, 3);
      b.set(188, 11, 'G');
    },
  },
  {
    name: 'CAVERN COMMUTE', theme: 'cave', music: 'cave', time: 300, width: 190,
    secret: { to: 8, x: 176, y: 5, prep: (b) => b.fill(176, 6, 176, 11, 'X').fill(174, 10, 174, 11, 'X') },
    extras: [['b', 20], ['b', 56], ['t', 98], ['c', 136], ['b', 148], ['b', 172], ['g', 86]],
    build(b) {
      b.fill(0, 0, 189, 1, '#');
      b.ground(0, 30).set(2, 11, '@');
      b.row(10, 8, 'BBWBB').coins(10, 6, 5);
      b.set(18, 11, 'g').set(26, 11, 'p');
      b.fill(31, 13, 33, 13, '^');
      b.ground(34, 60).fill(40, 2, 55, 7, '#').coins(42, 10, 12);
      b.set(46, 11, 'g').set(52, 11, 'g');
      b.fill(61, 13, 80, 13, '^');
      b.row(63, 10, '===').row(69, 10, '===').row(75, 10, '===').set(70, 6, 'W').set(70, 9, 'h');
      b.ground(81, 120).set(84, 11, 'C');
      b.row(90, 8, 'BBPBB').coins(90, 6, 5);
      b.set(95, 11, 'p').set(100, 11, 'p').set(108, 11, 'h');
      b.fill(112, 10, 112, 11, 'X').fill(116, 9, 116, 11, 'X');
      b.ground(125, 189);
      b.row(130, 8, 'WSW').set(131, 4, 'O');
      b.set(135, 11, 'g').set(140, 11, 'g').set(145, 11, 'g').set(150, 6, 'z').set(155, 11, 'p');
      b.fill(158, 2, 170, 8, '#').coins(160, 10, 9);
      b.set(166, 11, 'g');
      b.set(182, 11, 'G');
    },
  },
  {
    name: 'CLOUDTOP CLIMB', theme: 'sky', music: 'sky', time: 300, width: 200,
    extras: [['u', 36], ['t', 96], ['c', 128], ['u', 146], ['c', 182], ['h', 70]],
    build(b) {
      b.ground(0, 20).set(2, 11, '@');
      b.coins(6, 9, 3).row(10, 8, 'WPW');
      b.set(22, 10, 'm');
      b.ground(28, 40, 11).set(34, 7, 'z').set(38, 10, 'g');
      b.row(43, 9, '===').coins(43, 7, 3).row(48, 7, '===').coins(48, 5, 3).row(53, 9, '===').coins(53, 7, 3);
      b.ground(58, 75).set(60, 11, 'C').set(66, 11, 'h').row(68, 8, 'BSB').set(72, 6, 'z');
      b.set(79, 9, 'n').set(84, 9, 'm');
      b.ground(91, 110, 10).coins(93, 7, 6).set(96, 9, 'g').set(100, 9, 'g').set(105, 9, 'p');
      b.row(112, 9, '===').row(117, 8, '===').row(122, 9, '===').set(118, 5, 'z');
      b.ground(126, 150).row(132, 8, 'BWBOB').set(140, 11, 'p').set(145, 11, 'h');
      b.set(153, 10, 'm').set(160, 8, 'm').coins(156, 5, 4);
      b.ground(166, 199).set(170, 7, 'z').stairsUp(175, 4);
      b.set(190, 11, 'G');
    },
  },
  {
    name: 'STATIC FORTRESS', theme: 'castle', music: 'castle', time: 400, width: 190, boss: true, bossHp: 3,
    extras: [['b', 28], ['t', 66], ['c', 84], ['b', 112], ['t', 130], ['b', 152], ['g', 74]],
    build(b) {
      b.fill(0, 0, 189, 1, '#');
      b.ground(0, 20).set(2, 11, '@');
      b.fill(21, 13, 25, 13, 'L').set(23, 10, 'X');
      b.ground(26, 50).fill(32, 11, 33, 11, '^');
      b.row(36, 8, 'BPBWB');
      b.set(40, 11, 'p').set(45, 11, 'g').set(48, 6, 'z');
      b.fill(51, 13, 58, 13, 'L').fill(53, 10, 53, 13, 'X').fill(56, 9, 56, 13, 'X');
      b.ground(59, 95).set(62, 11, 'C');
      b.set(70, 11, 'h').set(75, 11, 'p').set(80, 11, 'p');
      b.row(84, 8, 'WSW').set(88, 11, 'g').set(90, 11, 'g');
      b.fill(96, 13, 110, 13, 'L').set(98, 10, 'm').set(105, 9, 'm');
      b.ground(111, 140).stairsUp(120, 3).fill(123, 9, 128, 11, 'X').stairsDown(129, 3);
      b.set(130, 6, 'z').set(135, 8, 'z').set(138, 11, 'g');
      b.fill(141, 13, 146, 13, 'L').row(142, 9, '===');
      b.ground(147, 189);
      b.fill(150, 10, 150, 11, 'X').set(152, 11, 'g').fill(156, 9, 156, 11, 'X').row(160, 8, 'WOW');
      b.set(184, 10, 'K');
    },
  },
  {
    name: 'SUNNY SHORELINE', theme: 'beach', music: 'beach', time: 300, width: 200,
    secret: { to: 9, x: 95, y: 2 },
    extras: [['u', 56], ['c', 98], ['t', 148], ['g', 176], ['h', 120], ['u', 150]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@');
      b.coins(6, 9, 4).row(12, 8, 'WPW').set(20, 11, 'g').set(26, 11, 'h');
      b.set(29, 11, 'J');
      b.ground(31, 44, 6).coins(33, 4, 5).set(40, 5, 'p');
      b.ground(45, 70).set(50, 11, 'g').set(53, 11, 'g').set(58, 7, 'z').row(56, 8, 'BWBSB');
      b.row(72, 9, '==');
      b.ground(75, 110).set(78, 11, 'C').set(85, 11, 'h').set(92, 11, 'J').coins(90, 3, 5);
      b.row(97, 7, '=====').set(100, 4, 'z').set(104, 11, 'p').set(107, 11, 'g');
      b.set(113, 10, 'm');
      b.ground(117, 131).stairsUp(122, 3).set(130, 11, 'J');
      b.row(134, 8, '==');
      b.ground(139, 199).set(145, 11, 'g').set(148, 11, 'g').set(155, 11, 'h').set(160, 11, 'p');
      b.row(164, 8, 'WOW').set(170, 6, 'z').stairsUp(176, 5);
      b.set(190, 11, 'G');
    },
  },
  {
    name: 'FROSTY PEAKS', theme: 'snow', music: 'snow', time: 300, width: 200, ice: true,
    yetiArena: [118, 133], yeti: [129, 9],
    secret: { to: 10, x: 160, y: 4, prep: (b) => b.row(156, 8, '==') },
    extras: [['u', 28], ['c', 68], ['t', 112], ['u', 148], ['h', 182], ['c', 130]],
    build(b) {
      b.ground(0, 25).set(2, 11, '@');
      b.coins(5, 9, 4).row(10, 8, 'BPB').set(16, 11, 'g').set(22, 11, 'p');
      b.ground(29, 50, 10).set(35, 9, 'g').set(40, 6, 'z').set(45, 9, 'g');
      b.ground(51, 60).set(55, 11, 'h');
      b.row(62, 9, '==');
      b.ground(65, 100).set(68, 11, 'C').row(72, 8, 'WSW').set(78, 11, 'p').set(82, 11, 'g').set(84, 11, 'g');
      b.stairsUp(88, 3).fill(91, 9, 95, 11, 'X').stairsDown(96, 3).set(92, 5, 'z');
      b.set(103, 10, 'n');
      b.ground(106, 140).set(112, 11, 'h').set(118, 11, 'p').set(124, 11, 'g').set(126, 11, 'g').row(130, 8, 'BWBOB');
      b.ground(145, 170, 11).set(150, 7, 'z').set(158, 10, 'p').set(165, 10, 'g').coins(152, 8, 4);
      b.ground(174, 199).stairsUp(178, 4);
      b.set(192, 11, 'G');
    },
  },
  {
    name: 'DEEP DARK MINE', theme: 'cave', music: 'cave', time: 320, width: 210,
    extras: [['b', 18], ['b', 44], ['t', 88], ['c', 102], ['b', 128], ['t', 168], ['c', 192], ['b', 150]],
    build(b) {
      b.fill(0, 0, 209, 1, '#');
      b.ground(0, 22).set(2, 11, '@').row(8, 8, 'BWB').set(14, 11, 'g').set(19, 11, 'p');
      b.fill(23, 13, 30, 13, '^').row(24, 10, '===').row(28, 9, '==');
      b.ground(31, 55).fill(36, 2, 50, 8, '#').coins(38, 10, 10).set(42, 11, 'g').set(47, 11, 'g');
      b.fill(56, 13, 75, 13, '^').set(58, 10, 'm').set(66, 9, 'n').set(71, 10, 'm');
      b.ground(76, 110).set(79, 11, 'C').set(84, 11, 'h').row(88, 7, 'BBPBB').set(95, 11, 'p').set(100, 11, 'p').set(104, 6, 'z');
      b.fill(111, 13, 118, 13, '^').fill(113, 10, 113, 13, 'X').fill(116, 9, 116, 13, 'X');
      b.ground(119, 160).fill(125, 2, 140, 8, '#').coins(127, 10, 12).set(130, 11, 'g').set(135, 11, 'g').set(138, 11, 'h');
      b.row(146, 8, 'WSW').set(150, 6, 'z').set(155, 11, 'p');
      b.ground(165, 209).set(170, 11, 'g').set(172, 11, 'g').set(178, 11, 'h').row(182, 8, 'BOB').stairsUp(188, 5);
      b.set(200, 11, 'G');
    },
  },
  {
    name: 'STATIC TOWER', theme: 'castle', music: 'castle', time: 400, width: 220, boss: true, bossHp: 5, final: true,
    extras: [['b', 28], ['t', 68], ['c', 110], ['b', 124], ['t', 158], ['c', 174], ['b', 90], ['g', 186]],
    build(b) {
      b.fill(0, 0, 219, 1, '#');
      b.ground(0, 18).set(2, 11, '@');
      b.fill(19, 13, 24, 13, 'L').set(21, 10, 'X');
      b.ground(25, 45).fill(30, 11, 31, 11, '^').row(34, 8, 'BPBWB').set(38, 11, 'g').set(42, 11, 'p');
      b.fill(46, 13, 60, 13, 'L').set(48, 10, 'm').set(54, 9, 'n').set(58, 10, 'm');
      b.ground(61, 95).set(64, 11, 'C').set(70, 6, 'z').set(76, 8, 'z').fill(80, 10, 80, 11, 'X').set(84, 11, 'h').set(88, 11, 'p').row(90, 8, 'WSW');
      b.fill(96, 13, 104, 13, 'L').row(98, 9, '===').row(102, 8, '==');
      b.ground(105, 140).stairsUp(110, 4).fill(114, 8, 120, 11, 'X').stairsDown(121, 4).set(117, 4, 'z');
      b.set(128, 11, 'g').set(130, 11, 'g').set(135, 11, 'p');
      b.fill(141, 13, 150, 13, 'L').set(143, 10, 'm').set(147, 9, 'm');
      b.ground(151, 219).fill(156, 10, 156, 11, 'X').set(160, 11, 'g').row(165, 8, 'WOWPW').set(172, 11, 'h');
      b.set(214, 10, 'K');
    },
  },
  // ---------------- bonus levels (unlocked by secret exits) ----------------
  {
    name: 'HAUNTED MANOR', theme: 'haunted', music: 'haunted', width: 180, dark: true, bonus: true,
    extras: [['b', 30], ['b', 100], ['t', 120], ['c', 150], ['e', 44], ['e', 128]],
    build(b) {
      b.fill(0, 0, 179, 1, '#');
      b.ground(0, 20).set(2, 11, '@').row(8, 8, 'BWB').set(14, 11, 'g').set(18, 6, 'e');
      b.row(21, 9, '===');
      b.ground(24, 45).coins(32, 9, 5).set(36, 5, 'e');
      b.fill(46, 13, 52, 13, '^').row(47, 10, '===').row(51, 9, '==');
      b.ground(53, 90).set(56, 11, 'C').fill(60, 2, 72, 7, '#').coins(61, 10, 10).set(66, 9, 'e').set(64, 11, 'g').set(70, 11, 'g');
      b.row(76, 8, 'BWBWB').set(80, 5, 'e').set(84, 11, 'p');
      b.row(92, 9, '===');
      b.ground(96, 140).stairsUp(100, 4).fill(104, 8, 108, 11, 'X').stairsDown(109, 4).set(106, 4, 'e').set(118, 6, 'e').set(122, 11, 'g').set(126, 11, 'h').row(130, 8, 'WOW');
      b.fill(141, 13, 144, 13, '^').row(142, 10, '==');
      b.ground(145, 179).set(150, 5, 'e').set(158, 7, 'e').stairsUp(164, 4);
      b.set(172, 11, 'G');
    },
  },
  {
    name: 'CORAL DEPTHS', theme: 'water', music: 'water', width: 180, water: true, bonus: true,
    extras: [['g', 60], ['p', 120]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').coins(8, 6, 4).set(14, 8, 'f').set(26, 5, 'f').set(20, 7, 'j');
      b.fill(31, 12, 40, 13, '^');
      b.ground(41, 70).fill(48, 5, 49, 11, 'B').coins(47, 2, 4).set(55, 6, 'j').set(60, 9, 'f').set(58, 11, 'C');
      b.fill(66, 0, 68, 7, 'X');
      b.ground(71, 110).fill(78, 12, 84, 12, '^').set(80, 6, 'f').set(90, 9, 'f').set(86, 4, 'j').row(96, 7, 'BWB');
      b.fill(104, 3, 105, 11, 'B').coins(103, 1, 4);
      b.ground(111, 179).set(118, 5, 'j').set(126, 8, 'j').set(122, 7, 'f').set(134, 4, 'f');
      b.fill(140, 0, 142, 8, 'X').fill(146, 6, 148, 11, 'B').row(152, 6, 'WSW').set(158, 8, 'f');
      b.set(172, 11, 'G');
    },
  },
  {
    name: 'SKY ARMADA', theme: 'airship', music: 'airship', width: 200, autoscroll: 0.55, bonus: true,
    boss: true, bossHp: 6, bossName: 'MOTHERSHIP',
    bossMsg: ['THE MOTHERSHIP IS DOWN!', '', "BARON STATIC'S FLEET", 'WILL NEVER SCRAMBLE', 'WALLY ISLAND AGAIN.', '', 'BONUS WORLD COMPLETE!'],
    extras: [['t', 14], ['c', 44], ['u', 60], ['t', 90], ['c', 120], ['u', 140], ['t', 160]],
    build(b) {
      b.ground(0, 24).set(4, 11, '@').row(8, 8, 'BWB');
      b.ground(29, 50, 10).fill(36, 7, 37, 9, 'X');
      b.set(52, 9, 'm');
      b.ground(55, 80).set(58, 11, 'C').fill(62, 9, 63, 11, 'X').fill(70, 6, 72, 7, 'X');
      b.row(82, 9, '==');
      b.ground(85, 110, 11).stairsUp(92, 3, 11).fill(95, 8, 99, 10, 'X').stairsDown(100, 3, 11);
      b.set(113, 9, 'm');
      b.ground(116, 150).row(122, 8, 'BOB').fill(130, 9, 131, 11, 'X');
      b.row(152, 10, '==');
      b.ground(154, 199).row(186, 8, '====').row(194, 8, '====').row(190, 5, '===');
      b.set(191, 3, 'k');
    },
  },
];

function buildLevel(i) {
  const def = LEVELS[i], b = new LevelBuilder(def.width);
  def.build(b);
  if (def.secret) { if (def.secret.prep) def.secret.prep(b); b.set(def.secret.x, def.secret.y, 'Z'); }
  if (def.yeti) b.set(def.yeti[0], def.yeti[1], 'y');
  const spawns = [];
  let start = { x: 2, y: 11 }, goal = null, checkpoint = null;
  // Cannonball ammo: a few crates on the ground through each level, plus one bonus block turned into an ammo block.
  for (const want of [24, 70, 115, 160]) {
    for (let d = 0; d < 20; d++) {
      const x = want + d;
      if (x >= b.w - 20) break;
      const free = (xx) => b.g[11][xx] === '.' && b.g[12][xx] === '#' && b.g[10][xx] === '.';
      if (free(x) && free(x - 1) && free(x + 1)) { b.g[11][x] = 'a'; break; }
    }
  }
  for (let x = 60; x < b.w; x++) { const y = b.g.findIndex((r) => r[x] === 'W'); if (y >= 0) { b.g[y][x] = 'A'; break; } }
  // Secrets: an invisible block (bump it from below for a 1-UP) and a cracked wall hiding coins
  for (let x = 88; x < b.w - 30; x++) {
    if ([x - 1, x, x + 1].every((xx) => b.g[12][xx] === '#') && [6, 7, 8, 9, 10, 11].every((y) => b.g[y][x] === '.')) { b.g[8][x] = 'I'; break; }
  }
  for (let x = 150; x < b.w - 24; x++) {
    if ([x - 1, x, x + 1, x + 2].every((xx) => b.g[12][xx] === '#') && [x, x + 1].every((xx) => [8, 9, 10, 11].every((y) => b.g[y][xx] === '.'))) { b.fill(x, 10, x + 1, 11, 'R'); break; }
  }
  // Special Orbs (+3 special attacks): two per level, floating a little above the ground
  for (const want of [48, 138]) {
    for (let d = 0; d < 24; d++) {
      const x = want + d;
      if (x >= b.w - 20) break;
      const free = (xx) => b.g[10][xx] === '.' && b.g[11][xx] === '.' && b.g[12][xx] === '#' && b.g[9][xx] === '.';
      if (free(x) && free(x - 1) && free(x + 1)) { b.g[10][x] = 's'; break; }
    }
  }
  // Extra enemies, placed on the nearest safe spot: ground walkers on solid ground,
  // bats under a ceiling, UFOs in open sky.
  const SOLIDS = '#BXUWPSOAJ';
  const ground = (x0) => {
    for (let x = x0; x < Math.min(b.w - 18, x0 + 14); x++) {
      for (let y = 3; y < 14; y++) {
        if (SOLIDS.includes(b.g[y][x]) && b.g[y - 1][x] === '.' && b.g[y - 2][x] === '.') return [x, y - 1];
      }
    }
    return null;
  };
  const ceiling = (x0) => {
    for (let x = x0; x < Math.min(b.w - 18, x0 + 14); x++) for (let y = 1; y < 8; y++) if (b.g[y][x] === '.' && b.g[y - 1][x] === '#') return [x, y];
    return null;
  };
  const sky = (x0) => { for (let x = x0; x < Math.min(b.w - 18, x0 + 14); x++) if (b.g[2][x] === '.' && b.g[1][x] === '.') return [x, 2]; return null; };
  for (const [c, x] of def.extras || []) {
    const spot = c === 'b' ? ceiling(x) : c === 'u' ? sky(x) : ground(x);
    if (spot) b.g[spot[1]][spot[0]] = c;
  }
  // New power-up blocks: Super Charge battery and Jet Boots
  const swap = (from, to) => {
    for (let x = from; x < b.w; x++) { const y = b.g.findIndex((r) => r[x] === 'W'); if (y >= 0) { b.g[y][x] = to; return; } }
    for (let x = from; x < b.w - 20; x += 3) { // no bonus block left: float a new one above solid ground
      const spot = ground(x);
      if (spot && spot[1] >= 5 && b.g[spot[1] - 3][spot[0]] === '.' && b.g[spot[1] - 4][spot[0]] === '.') { b.g[spot[1] - 3][spot[0]] = to; return; }
    }
  };
  swap(12, 'D'); swap(105, 'V'); swap(20, 'Q');
  // Five Wally Medals per level, tucked up high: on top of blocks, platforms and ledges,
  // one in each fifth of the level (floating above the ground if a fifth has no ledge).
  const firm = '#BXUW=PSOAVQDJ';
  const seg = (b.w - 32) / 5;
  for (let k = 0; k < 5; k++) {
    const x0 = 10 + Math.floor(k * seg), x1 = 10 + Math.floor((k + 1) * seg);
    let best = null;
    for (let x = x0; x < x1; x++) for (let y = 2; y <= 9; y++) {
      if (b.g[y][x] !== '.' || b.g[y - 1][x] !== '.' || !firm.includes(b.g[y + 1][x])) continue;
      if (!best || y < best[1]) best = [x, y];
    }
    if (!best) {
      for (let x = Math.floor((x0 + x1) / 2); x < x1 && !best; x++) {
        const spot = ground(x);
        if (spot && spot[1] >= 6 && b.g[spot[1] - 4][spot[0]] === '.') best = [spot[0], spot[1] - 4];
      }
    }
    if (best) b.g[best[1]][best[0]] = 'M';
  }
  const ENT = 'gpzhmnCGKabctuMfjeykZs';
  for (let y = 0; y < 14; y++) for (let x = 0; x < b.w; x++) {
    const c = b.g[y][x];
    if (c === '@') { start = { x, y }; b.g[y][x] = '.'; } else if (ENT.includes(c)) {
      spawns.push({ t: c, x, y }); b.g[y][x] = '.';
      if (c === 'G') goal = { x, y };
      if (c === 'C') checkpoint = { x, y };
    }
  }
  spawns.sort((a, b2) => a.x - b2.x);
  if (def.yetiArena) { // clear the yeti's arena of other enemies
    const [a0, a1] = def.yetiArena;
    for (let k = spawns.length - 1; k >= 0; k--) if (spawns[k].x >= a0 && spawns[k].x <= a1 && 'gpzhbctu'.includes(spawns[k].t)) spawns.splice(k, 1);
  }
  let medalId = 0;
  for (const sp of spawns) if (sp.t === 'M') sp.id = medalId++;
  return { def, w: b.w, h: 14, grid: b.g, spawns, start, goal, checkpoint };
}
