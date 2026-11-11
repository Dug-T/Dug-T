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
    name: "WALLY'S BACKYARD", theme: 'grass', music: 'grass', time: 300, width: 200, warp: { x: 118, to: 2 }, squad: { x: 5, rows: 2, cols: 5 },
    extras: [['u', 12], ['c', 58], ['t', 96], ['u', 108], ['g', 134], ['p', 166], ['h', 45], ['4', 150]],
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
    key: { x: 120, y: 3, n: 0 }, name: 'CAVERN COMMUTE', theme: 'cave', music: 'cave', time: 300, width: 190,
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
    squad: { x: 84, rows: 3, cols: 5 }, name: 'CLOUDTOP CLIMB', theme: 'sky', music: 'sky', time: 300, width: 200, dino: 'blue', weather: 'wind',
    mini: ['v', 138, 3], miniArena: [128, 143],
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
    name: 'STATIC FORTRESS', theme: 'castle', music: 'castle', time: 400, width: 190, boss: true, bossHp: 3, dino: 'red',
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
    name: 'SUNNY SHORELINE', theme: 'beach', music: 'beach', time: 300, width: 200, warp: { x: 60, to: 6 }, weather: 'rain',
    mini: ['q', 152, 10], miniArena: [142, 157],
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
    name: 'FROSTY PEAKS', theme: 'snow', music: 'snow', time: 300, width: 200, ice: true, dino: 'ice',
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
    name: 'DEEP DARK MINE', theme: 'cave', music: 'cave', time: 320, width: 210, dino: 'red',
    mini: ['w', 176, 10], miniArena: [166, 181],
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
    name: 'STATIC TOWER', theme: 'castle', music: 'castle', time: 400, width: 220, boss: true, bossHp: 5, final: true, dino: 'red',
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
    name: 'HAUNTED MANOR', theme: 'haunted', music: 'haunted', width: 180, dark: true, bonus: true, weather: 'storm',
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
    squad: { x: 110, rows: 3, cols: 6 }, name: 'SKY ARMADA', theme: 'airship', music: 'airship', width: 200, autoscroll: 0.55, bonus: true, dino: 'blue',
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
  // ---------------- Star Isle (reached by rocket after beating Baron Static) ----------------
  {
    name: 'MOLTEN PEAK', theme: 'volcano', music: 'volcano', width: 200, dino: 'red', squad: { x: 118, rows: 2, cols: 5 },
    powerups: [['E', 30], ['N', 70], ['T', 100], ['V', 150], ['P', 170]],
    extras: [['u', 14], ['c', 40], ['p', 50], ['t', 75], ['g', 84], ['u', 88], ['h', 110], ['b', 118], ['g', 130], ['p', 136], ['u', 145], ['t', 160], ['h', 166], ['c', 180]],
    build(b) {
      b.ground(0, 22).set(2, 11, '@').row(8, 8, 'BWB');
      b.fill(23, 13, 28, 13, 'L').set(25, 12, 'l');
      b.ground(29, 55).stairsUp(34, 3).fill(37, 9, 40, 11, 'X').stairsDown(41, 3);
      b.fill(56, 13, 64, 13, 'L').row(58, 9, '===').set(62, 12, 'l');
      b.ground(65, 95, 10).set(68, 9, 'C');
      b.fill(96, 13, 104, 13, 'L').set(98, 9, 'm').set(101, 12, 'l');
      b.ground(105, 140).row(112, 8, 'WSW').fill(120, 10, 121, 11, 'X');
      b.fill(141, 13, 150, 13, 'L').row(143, 9, '==').row(147, 8, '==').set(145, 12, 'l');
      b.ground(151, 199).stairsUp(170, 5);
      b.set(190, 11, 'G');
    },
  },
  {
    key: { x: 100, y: 3, n: 1 }, name: 'GEAR WORKS', theme: 'factory', music: 'factory', width: 200, squad: { x: 66, rows: 2, cols: 6 },
    powerups: [['N', 20], ['E', 60], ['Q', 95], ['T', 130], ['P', 160]],
    extras: [['u', 12], ['t', 30], ['g', 36], ['c', 60], ['h', 72], ['u', 80], ['p', 94], ['t', 100], ['z', 115], ['g', 140], ['t', 150], ['u', 158], ['c', 175], ['h', 185]],
    build(b) {
      b.ground(0, 40).set(2, 11, '@').row(12, 12, '>>>>>>>>>>').row(26, 8, 'BWB');
      b.ground(45, 80).row(50, 12, '<<<<<<<<<<<<').row(64, 8, '>>>>');
      b.set(42, 9, 'm');
      b.ground(85, 120).set(86, 11, 'C').row(90, 12, '>>>>>>>>>>>>>>>>').fill(108, 11, 109, 11, '^');
      b.set(123, 9, 'm');
      b.ground(127, 160).row(130, 8, 'BWB').row(135, 8, '<<<<').row(141, 6, '>>>>');
      b.row(162, 10, '==');
      b.ground(165, 199).row(168, 12, '<<<<<<').stairsUp(180, 4);
      b.set(190, 11, 'G');
    },
  },
  {
    name: 'CANDY COVE', theme: 'candy', music: 'candy', width: 200, squad: { x: 100, rows: 3, cols: 5 },
    powerups: [['N', 15], ['E', 55], ['T', 90], ['V', 130], ['O', 170]],
    extras: [['u', 16], ['g', 25], ['z', 40], ['p', 52], ['h', 65], ['u', 78], ['c', 88], ['p', 100], ['g', 120], ['u', 128], ['z', 140], ['h', 155], ['c', 170], ['g', 182]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').coins(6, 9, 4).set(20, 11, 'J').row(24, 7, '=====').coins(24, 5, 5);
      b.row(33, 9, '==');
      b.ground(37, 70).set(45, 11, 'J').fill(48, 6, 52, 7, 'B').row(62, 8, 'WPW');
      b.set(73, 10, 'm');
      b.ground(77, 110, 10).set(80, 9, 'C').set(95, 9, 'J').coins(93, 2, 6);
      b.row(113, 9, '==');
      b.ground(116, 160).set(125, 11, 'J').set(140, 11, 'J').row(145, 7, 'BWBOB');
      b.row(162, 10, '==');
      b.ground(165, 199).stairsUp(175, 4);
      b.set(190, 11, 'G');
    },
  },
  {
    squad: { x: 58, rows: 3, cols: 6 }, name: 'MOON BASE', theme: 'moon', music: 'moon', width: 200, lowGrav: true, boss: true, bossHp: 8, bossName: 'MOTHERSHIP MK II',
    bossMsg: ['THE MK II IS DOWN!', '', 'STAR ISLE IS SAFE AND', 'THE WHOLE GALAXY HAS', 'FULL SIGNAL AGAIN!', '', 'YOU ARE A LEGEND!'],
    powerups: [['E', 20], ['N', 60], ['P', 110], ['T', 130], ['Q', 150]],
    extras: [['u', 14], ['g', 30], ['u', 40], ['h', 50], ['c', 75], ['t', 80], ['u', 100], ['p', 110], ['u', 120], ['g', 128], ['c', 150], ['t', 160]],
    build(b) {
      b.ground(0, 25).set(2, 11, '@');
      b.ground(34, 60, 11).row(44, 6, 'BWB');
      b.ground(69, 95).set(72, 11, 'C').fill(80, 8, 82, 11, 'X');
      b.row(100, 8, '==');
      b.ground(105, 135, 10).row(115, 5, 'WSW');
      b.ground(144, 199).row(186, 8, '====').row(194, 8, '====').row(190, 5, '===');
      b.set(191, 3, 'k');
    },
  },
  // ================= Carnival Isle (world 3) =================
  {
    name: 'FUNFAIR MIDWAY', theme: 'carnival', music: 'carnival', width: 190,
    powerups: [['H', 60], ['E', 100], ['N', 150]],
    extras: [['g', 20], ['3', 58], ['u', 100], ['h', 150], ['3', 168], ['p', 112]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').row(10, 8, 'BWB');
      b.set(37, 7, '5');
      b.ground(45, 80).set(55, 11, '4').set(62, 11, '2').row(66, 8, 'WHW').set(73, 8, '1');
      b.set(84, 4, '%').set(91, 4, '%');
      b.ground(97, 125).set(100, 11, 'C').set(110, 11, '4').set(118, 11, '2');
      b.set(132, 7, '5');
      b.ground(140, 189).row(150, 8, 'B1B').set(160, 11, '4').stairsUp(170, 4);
      b.set(182, 11, 'G');
    },
  },
  {
    name: 'COASTER CHAOS', theme: 'carnival', music: 'carnival', width: 190,
    coasters: [[[17, 11], [26, 7], [36, 9], [46, 5], [56, 8], [64, 11]], [[99, 11], [108, 6], [118, 3], [128, 7], [140, 11]]],
    key: { x: 46, y: 2, n: 2 },
    powerups: [['H', 70], ['T', 150]],
    extras: [['c', 70], ['2', 82], ['u', 90], ['4', 150], ['3', 160], ['g', 170]],
    build(b) {
      b.ground(0, 18).set(2, 11, '@').set(17, 11, '6');
      b.ground(65, 100).set(80, 9, 'C').row(86, 8, 'WSW').set(99, 11, '6');
      b.ground(141, 189).row(152, 8, 'BWB').set(156, 4, '%').stairsUp(168, 3);
      b.set(182, 11, 'G');
    },
  },
  {
    name: 'MINECART MAYHEM', theme: 'cave', music: 'factory', width: 230, minecart: true,
    build(b) {
      b.fill(0, 0, 229, 1, '#').ground(0, 229).set(3, 11, '@');
      const feats = 'g.b.g..bc.g.bb.gc..b.g.gb.cg.b.bg.c.g.bb.g.gc..b';
      for (let k = 0; k < feats.length; k++) {
        const x = 18 + k * 4; if (x > 214) break;
        const f = feats[k];
        if (f === 'g') b.fill(x, 12, x + (k > 24 ? 2 : 1), 13, '.');
        if (f === 'b') b.fill(x, 9, x + 1, 10, 'X');
        if (f === 'c') b.coins(x, 8, 3);
      }
      for (let x = 0; x < 230; x++) if (b.g[12][x] === '#') b.set(x, 11, '_');
      b.set(222, 11, 'G');
    },
  },
  {
    name: 'MIRROR MAZE', theme: 'carnival', music: 'haunted', width: 170,
    powerups: [['E', 40], ['H', 110]],
    extras: [['4', 30], ['1', 60], ['2', 95], ['4', 130], ['3', 145]],
    build(b) {
      b.fill(0, 0, 169, 1, 'X').ground(0, 169).set(2, 11, '@');
      for (const [x, gapY] of [[20, 9], [38, 5], [56, 9], [74, 4], [92, 8], [110, 5], [128, 9], [146, 6]]) {
        b.fill(x, 2, x + 1, 11, 'X'); b.fill(x, gapY, x + 1, gapY + 2, '.');
        if (gapY < 8) { b.row(x - 6, gapY + 3, '====='); b.row(x - 10, gapY + 6, '===='); }
      }
      for (const [x0, x1] of [[24, 34], [78, 88], [132, 142]]) for (let x = x0; x <= x1; x++) for (let y = 2; y <= 11; y++) if (b.g[y][x] === '.') b.g[y][x] = '!';
      b.set(60, 9, 'C').row(100, 8, 'WOW');
      b.set(162, 11, 'G');
    },
  },
  {
    name: 'ASTEROID ALLEY', theme: 'moon', music: 'airship', width: 220, shmup: true, autoscroll: 0.9,
    build(b) {
      b.set(3, 7, '@');
      const rows = [3, 7, 10, 5, 9, 2, 11, 6, 4, 8];
      for (let k = 0; k < 46; k++) { const x = 20 + k * 4 + (k % 3); if (x > 206) break; b.set(x, rows[k % rows.length], '7'); }
      for (const x of [40, 80, 120, 160, 190]) b.set(x, 2, 'u');
      for (let k = 0; k < 12; k++) b.coins(28 + k * 15, 2 + (k * 5) % 10, 2);
      b.set(214, 11, 'G');
    },
  },
  {
    name: 'BIG TOP', theme: 'carnival', music: 'carnival', width: 170, boss: true, bossHp: 6, bossName: 'RINGMASTER', talk: 'ringmaster',
    bossMsg: ['THE RINGMASTER BOWS OUT!', '', 'THE CARNIVAL LIGHTS', 'TWINKLE WITH FULL SIGNAL', 'ACROSS ALL THREE ISLES.', '', 'WHAT A SHOW!'],
    powerups: [['H', 40], ['E', 90]],
    extras: [['4', 30], ['2', 60], ['3', 75], ['1', 95], ['4', 110], ['2', 125]],
    build(b) {
      b.ground(0, 40).set(2, 11, '@').set(20, 11, 'J');
      b.row(42, 7, '======').set(47, 4, '%');
      b.ground(52, 90).set(60, 9, 'C').row(70, 8, 'BWB').set(84, 11, 'J');
      b.row(92, 6, '=====').set(97, 3, '%').row(100, 8, '====');
      b.ground(106, 169).row(120, 8, 'B1B').set(164, 10, 'r');
    },
  },
  {
    name: 'SECRET ROOM 1', theme: 'castle', music: 'castle', width: 80, secretRoom: true,
    build(b) {
      b.fill(0, 0, 79, 1, '#').ground(0, 79).set(2, 11, '@');
      for (let x = 8; x < 66; x += 7) { b.coins(x, 5, 4); b.fill(x + 2, 11, x + 2, 11, '^'); }
      b.row(14, 7, 'OWOWO').row(40, 7, 'WOW').set(30, 9, 'm').set(52, 8, 'n');
      b.set(72, 11, 'G');
    },
  },
  {
    name: 'SECRET ROOM 2', theme: 'factory', music: 'factory', width: 80, secretRoom: true,
    build(b) {
      b.ground(0, 79).set(2, 11, '@').row(8, 11, '>>>>>>>>>>>>').row(26, 8, '<<<<<<<<').row(44, 11, '>>>>>>>>>>');
      for (let x = 6; x < 66; x += 5) b.coins(x, 4 + (x % 3), 3);
      b.row(20, 5, 'OWO').row(58, 6, 'OVO');
      b.set(72, 11, 'G');
    },
  },
  {
    name: 'SECRET ROOM 3', theme: 'carnival', music: 'carnival', width: 80, secretRoom: true,
    build(b) {
      b.ground(0, 12).set(2, 11, '@').set(18, 7, '5').ground(26, 40).set(32, 11, 'J').coins(28, 3, 10);
      b.set(46, 4, '%').set(54, 4, '%').ground(60, 79).row(62, 8, 'OWOWO');
      b.set(72, 11, 'G');
    },
  },
  // ================= Lost Lands (world 4) and the Static Dimension =================
  {
    name: 'VINE TEMPLE', theme: 'jungle', music: 'jungle', width: 200, ziplines: [[29, 4, 45, 8]],
    powerups: [['H', 50], ['E', 120]],
    extras: [['p', 12], ['g', 50], ['2', 70], ['h', 104], ['g', 132], ['3', 180]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').row(18, 3, 'XXXX').fill(19, 4, 19, 11, '|').coins(18, 1, 4).row(27, 4, 'XXX');
      b.ground(46, 80).fill(60, 6, 61, 11, 'X').set(62, 8, 'd').set(66, 9, 'C').row(70, 8, 'BWB').set(78, 11, '0');
      b.ground(97, 170).set(112, 11, '9').fill(160, 5, 161, 11, 'X').fill(158, 4, 158, 11, '|').row(150, 7, 'WOW');
      b.ground(171, 199).set(192, 11, 'G');
    },
  },
  {
    name: 'GOLEM SANCTUM', theme: 'jungle', music: 'jungle', width: 130, boss: true, bossHp: 6, bossName: 'STONE GOLEM', bossType: 'golem', talk: 'golem',
    bossMsg: ['THE STONE GOLEM CRUMBLES!', '', 'A SECRET PATH OPENS', 'TOWARD THE DESERT DUNES.'],
    extras: [['g', 20], ['2', 40], ['p', 60], ['3', 80]],
    build(b) {
      b.ground(0, 129).set(2, 11, '@').fill(20, 8, 22, 8, '[').set(24, 8, '{').fill(26, 8, 28, 8, ')').fill(30, 5, 32, 5, ')').coins(30, 3, 3);
      b.fill(40, 2, 40, 10, '|').row(39, 1, 'XXX').set(50, 9, 'C').row(58, 8, 'BWB').fill(70, 9, 71, 11, 'X').fill(75, 7, 76, 11, 'X').fill(80, 9, 81, 11, 'X');
      b.set(124, 10, '*');
    },
  },
  {
    name: 'DUNE DRIFT', theme: 'desert', music: 'desert', width: 200, weather: 'sandstorm', portals: [[60, 10, 104, 4]],
    powerups: [['V', 40], ['N', 90], ['E', 150]],
    extras: [['8', 24], ['2', 50], ['g', 80], ['8', 118], ['p', 130], ['8', 164], ['u', 100]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').row(12, 8, 'BWB');
      b.fill(31, 10, 40, 13, '$').ground(41, 70).set(60, 11, '.').row(48, 8, 'WSW');
      b.fill(71, 12, 84, 13, '$').fill(71, 10, 84, 11, '$').ground(85, 96).set(88, 9, 'C');
      b.row(100, 6, 'XXXXXXXX').coins(100, 4, 8);
      b.ground(110, 150).fill(130, 10, 136, 11, '$').fill(130, 12, 136, 13, '#');
      b.fill(151, 9, 162, 13, '$').ground(163, 199).stairsUp(176, 3).set(190, 11, 'G');
    },
  },
  {
    name: 'SANDWORM PIT', theme: 'desert', music: 'desert', width: 120, boss: true, bossHp: 6, bossName: 'SANDWORM', bossType: 'sandworm', talk: 'sandworm',
    bossMsg: ['THE SANDWORM BURROWS AWAY', 'FOR GOOD!', '', 'TWO TOWERS RISE OVER', 'THE HORIZON...'],
    extras: [['8', 20], ['g', 40], ['8', 62]],
    build(b) {
      b.ground(0, 119).set(2, 11, '@').fill(26, 10, 34, 11, '$').fill(26, 12, 34, 13, '#').row(44, 8, 'BWB').set(56, 9, 'C').fill(64, 9, 65, 11, 'X');
      b.set(112, 11, '*');
    },
  },
  { name: 'LAVA TOWER', theme: 'volcano', music: 'volcano', width: 16, noAuto: true, tower: { screens: 7, hazard: 'lava', seed: 7 }, build(b) { towerBuild(b, this, 0); } },
  { name: 'FLOOD TOWER', theme: 'water', music: 'water', width: 16, noAuto: true, tower: { screens: 7, hazard: 'water', seed: 13 }, build(b) { towerBuild(b, this, 0); } },
  {
    name: 'GLITCH FIELDS', theme: 'static', music: 'static', width: 200, glitch: true, portals: [[46, 10, 96, 3]],
    powerups: [['E', 30], ['H', 120]],
    extras: [['4', 20], ['3', 40], ['2', 70], ['8', 110], ['1', 130], ['u', 150], ['4', 170]],
    build(b) {
      b.ground(0, 40).set(2, 11, '@').fill(20, 3, 30, 10, ':').fill(20, 0, 30, 1, '#').coins(22, 3, 6);
      b.ground(41, 70).set(55, 8, '{').fill(58, 9, 62, 9, '[').fill(64, 6, 68, 6, ')').set(60, 11, 'C');
      b.row(94, 5, 'XXXXXX').ground(100, 140).fill(110, 2, 124, 10, ':').fill(110, 0, 124, 1, 'X').row(114, 2, 'WOW');
      b.ground(141, 199).set(150, 11, '0').fill(160, 6, 161, 11, 'X').set(190, 11, 'G');
    },
  },
  {
    name: 'NULL VOID', theme: 'static', music: 'static', width: 200, glitch: true, ziplines: [[36, 3, 60, 8], [118, 2, 140, 7]],
    powerups: [['V', 60], ['T', 150]],
    extras: [['3', 20], ['4', 45], ['2', 80], ['8', 100], ['1', 125], ['u', 140], ['3', 160]],
    build(b) {
      b.ground(0, 34).set(2, 11, '@').fill(26, 4, 34, 11, 'X').fill(24, 4, 24, 11, '|');
      b.ground(62, 110).set(66, 8, '{').fill(70, 8, 74, 8, ')').fill(77, 5, 81, 5, '[').set(90, 11, '0').set(80, 11, 'C');
      b.fill(111, 2, 116, 11, 'X').fill(110, 2, 110, 11, '|');
      b.ground(142, 199).fill(150, 2, 162, 10, ':').fill(150, 0, 162, 1, '#').row(152, 2, 'BOB').set(190, 11, 'G');
    },
  },
  {
    name: 'THE CORE', theme: 'static', music: 'static', width: 120, glitch: true, boss: true, bossHp: 12, bossName: 'STATIC EMPEROR', bossType: 'emperor', talk: 'emperor', final2: true,
    bossMsg: ['THE STATIC EMPEROR IS BEATEN!', '', 'EVERY ISLAND, EVERY WORLD', 'AND EVERY DIMENSION NOW', 'HAS FULL SIGNAL FOREVER.', '', 'YOU ARE THE TRUE HERO!'],
    extras: [['4', 30], ['3', 50], ['2', 70]],
    build(b) {
      b.ground(0, 119).set(2, 11, '@').set(40, 9, 'C').row(50, 8, 'WEW').row(104, 8, '===').row(112, 8, '===');
      b.set(110, 10, '*');
    },
  },
  // ================= Wally Town rides =================
  {
    name: 'POWDER PEAK', theme: 'snow', music: 'snow', width: 260, board: true, noAuto: true,
    build(b) {
      let x = 0, top = 6;
      b.ground(0, 14, top).set(3, top - 1, '@');
      x = 15;
      const plan = 'grgsrgrgsgrrgsg';
      for (let k = 0; k < plan.length && x < 236; k++) {
        const f = plan[k], len = 10 + (k % 3) * 3;
        b.ground(x, x + len, top).coins(x + 3, top - 3, 4);
        if (f === 'r') { b.set(x + len - 1, top - 1, '/'); x += len + 1; b.ground(x, x + 2, Math.min(12, top + 2)); x += 5; top = Math.min(12, top + 1); }
        else if (f === 's') { b.row(x + len + 1, top - 1, '=========='); x += len + 12; top = Math.min(12, top + 1); }
        else { x += len + 1; if (k % 2) top = Math.min(12, top + 1); b.set(x - 4, top - 1, 'g'); }
      }
      b.ground(x, 259, top).set(Math.min(252, x + 12), top - 1, 'G');
    },
  },
  {
    name: 'DEEP SEA DIVE', theme: 'water', music: 'water', width: 220, sub: true, autoscroll: 0.7, noAuto: true, boss: true, bossHp: 8, bossName: 'GIANT SQUID', bossType: 'squid', talk: 'squid',
    bossMsg: ['THE GIANT SQUID SWIMS AWAY', 'IN A CLOUD OF INK!', '', 'THE DEEP SEA IS SAFE AGAIN.'],
    mines: [[30, 6], [44, 3], [58, 9], [76, 5], [92, 10], [110, 4], [128, 8], [146, 6], [160, 3], [172, 9]],
    build(b) {
      b.fill(0, 0, 219, 0, '#').fill(0, 13, 219, 13, '#').set(3, 6, '@');
      const caves = [[24, 1, 4], [40, 9, 12], [62, 1, 5], [70, 10, 12], [96, 1, 3], [104, 8, 12], [134, 1, 5], [150, 10, 12], [180, 1, 3]];
      for (const [x, y0, y1] of caves) b.fill(x, y0, x + 4, y1, '#');
      for (const [x, y] of [[36, 6], [52, 3], [84, 8], [118, 6], [140, 9], [166, 5]]) b.set(x, y, 'f');
      for (let k = 0; k < 14; k++) b.coins(20 + k * 12, 3 + (k * 4) % 8, 2);
      b.set(214, 6, '*');
    },
  },
  {
    name: 'HAUNTED EXPRESS', theme: 'haunted', music: 'haunted', width: 230, train: true, autoscroll: 1.25, noAuto: true,
    build(b) {
      b.ground(0, 229, 12);
      b.fill(0, 9, 18, 11, 'X').set(3, 8, '@');
      let x = 21, k = 0;
      while (x < 214) {
        const len = 12 + (k % 3) * 4; b.fill(x, 9, x + len, 11, 'X');
        if (k % 3 === 1) b.fill(x + 3, 0, x + len - 3, 7, '#');
        if (k % 2 === 0) b.set(x + 5, 4, 'e'); else b.coins(x + 2, 6, 4);
        if (k % 4 === 3) b.set(x + 8, 3, 'b');
        x += len + 3; k++;
      }
      b.fill(214, 9, 229, 11, 'X').set(222, 8, 'G');
    },
  },
  {
    name: 'ROOFTOP RUN', theme: 'neon', music: 'neon', width: 200, noAuto: true,
    extras: [],
    build(b) {
      b.ground(0, 18, 9).set(3, 8, '@').row(8, 6, 'BWB');
      const roofs = [[22, 34, 10], [38, 52, 8], [58, 70, 11], [76, 92, 7], [98, 112, 9], [120, 136, 10], [142, 156, 8], [162, 176, 11]];
      roofs.forEach(([a, c, top], i) => { b.ground(a, c, top); if (i % 2) b.set(a + 5, top - 1, 'g'); else b.set(a + 6, top - 1, '2'); b.coins(a + 2, top - 3, 3); });
      b.set(54, 8, 'm').set(94, 6, 'n').set(115, 8, 'm').set(138, 6, 'n').set(158, 7, 'm');
      b.set(84, 3, 'z').set(128, 4, 'z').set(100, 8, 'C').set(146, 3, '3');
      b.ground(180, 199, 9).set(192, 8, 'G');
    },
  },
  {
    name: 'NEON HEIGHTS', theme: 'neon', music: 'neon', width: 200, noAuto: true,
    build(b) {
      b.ground(0, 16, 11).set(3, 10, '@');
      const roofs = [[20, 30, 9], [34, 44, 7], [50, 60, 10], [66, 78, 6], [84, 96, 9], [102, 112, 7], [118, 130, 10], [136, 148, 6], [154, 166, 8]];
      roofs.forEach(([a, c, top], i) => { b.ground(a, c, top); b.set(a + 4, top - 1, 'tg2'[i % 3]); b.coins(a + 3, top - 3, 3); if (i === 4) b.set(a + 6, top - 1, 'C'); });
      b.set(32, 9, 'n').set(46, 7, 'm').set(63, 8, 'n').set(81, 7, 'm').set(99, 8, 'n').set(115, 6, 'm').set(133, 8, 'n').set(151, 6, 'm');
      b.set(72, 2, 'u').set(108, 3, '3').set(142, 2, 'u').row(88, 5, 'WOW');
      b.ground(170, 199, 9).set(190, 8, 'G');
    },
  },
];

// Tower levels are a stack of one-screen rooms; you climb up through the top of each room.
function towerRows(def, k) {
  const T = def.tower, n = T.screens, r = (() => { let z = (T.seed * 9973 + k * 7919) >>> 0; return () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const g = Array.from({ length: 14 }, () => Array(16).fill('.'));
  for (let y = 0; y < 14; y++) { g[y][0] = 'X'; g[y][15] = 'X'; }
  const set = (x, y, c) => { if (x > 0 && x < 15 && y >= 0 && y < 14) g[y][x] = c; };
  if (k === 0) { for (let x = 1; x < 15; x++) { g[12][x] = '#'; g[13][x] = '#'; } set(3, 11, '@'); }
  else for (let x = 1; x < 15; x++) g[12][x] = '=';
  if (k === n - 1) { for (let x = 1; x < 15; x++) { g[5][x] = '#'; g[4][x] = '.'; } set(8, 4, 'G'); for (let x = 2; x < 13; x += 3) set(x, 2, 'o'); }
  const rows = k === n - 1 ? [9] : [9, 6, 3];
  rows.forEach((y, i) => { const left = (i + k) % 2 === 0, x0 = left ? 1 + Math.floor(r() * 3) : 7 + Math.floor(r() * 3), w = 5 + Math.floor(r() * 3); for (let x = x0; x < x0 + w; x++) set(x, y, '='); if (r() < 0.5) set(x0 + 1, y - 1, 'o'); if (r() < 0.35) set(x0 + 2, y - 3, 'o'); });
  if (k > 0 && k < n - 1) { if (r() < 0.6) set(4 + Math.floor(r() * 8), 1 + Math.floor(r() * 2), r() < 0.5 ? 'z' : 'b'); if (k % 3 === 2) set(12, 8, 'W'); if (k === 3) set(4, 2, 'E'); }
  return g.map((row) => row.join(''));
}
function towerBuild(b, def, k) { towerRows(def, k).forEach((row, y) => { for (let x = 0; x < 16; x++) b.g[y][x] = row[x]; }); }
// level numbers 93-99 are used by the special modes (rogue, arena, versus, tower, endless, rush, Level Maker)
function isRealLi(li) { return li >= 0 && li < LEVELS.length && !(LEVELS[li] && LEVELS[li].reserved); }
function buildLevel(i) {
  const def = i === 99 ? window.CUSTOM_LEVEL : i === 98 ? window.RUSH_LEVEL : i === 97 ? window.ENDLESS_LEVEL : i === 96 ? window.TOWER_SCREEN : i === 95 ? window.VERSUS_LEVEL : i === 94 ? window.ARENA_LEVEL : i === 93 ? window.ROGUE_LEVEL : LEVELS[i], b = new LevelBuilder(def.width);
  def.build(b);
  if (def.secret) { if (def.secret.prep) def.secret.prep(b); b.set(def.secret.x, def.secret.y, 'Z'); }
  if (def.yeti) b.set(def.yeti[0], def.yeti[1], 'y');
  if (def.mini) b.set(def.mini[1], def.mini[2], def.mini[0]);
  const spawns = [];
  let start = { x: 2, y: 11 }, goal = null, checkpoint = null;
  if (!def.custom && !def.noAuto) { // auto-placed goodies (not in Level Maker courses)
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
  const SOLIDS = '#BXUWPSOAJNTEYH[]{F+}?`';
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
  for (const [c, x] of def.powerups || []) swap(x, c);
  // batch D power-ups: Magnet, Shrink Ray (tiny hero) and Bubble Shield
  swap(30 + (i * 7) % 40, 'N'); swap(80 + (i * 11) % 30, 'E'); swap(130 + (i * 5) % 30, 'T');
  // Warp pipe: press Down on top to skip ahead
  if (def.warp) {
    for (let x = def.warp.x; x < b.w - 20; x++) {
      const s1 = ground(x);
      if (!s1 || s1[0] !== x) continue;
      const [px, py] = s1;
      if (py < 4 || [px, px + 1].some((xx) => b.g[py][xx] !== '.' || b.g[py - 1][xx] !== '.' || b.g[py - 2][xx] !== '.' || !SOLIDS.includes(b.g[py + 1][xx]))) continue;
      b.fill(px, py - 1, px + 1, py, 'Y'); def.warpAt = px; break;
    }
  }
  // Five Wally Medals per level, tucked up high: on top of blocks, platforms and ledges,
  // one in each fifth of the level (floating above the ground if a fifth has no ledge).
  const firm = '#BXUW=PSOAVQDJNTEYH[]{F+}?`';
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
  // Three Signal Bars per level, hidden in the highest reachable nook of each third
  if (!def.custom) {
    const seg3 = (b.w - 30) / 3;
    for (let k = 0; k < 3; k++) {
      const x0 = 8 + Math.floor(k * seg3 + seg3 * 0.15), x1 = 8 + Math.floor((k + 1) * seg3);
      let best = null;
      for (let x = x0; x < x1; x++) for (let y = 2; y <= 8; y++) {
        if (b.g[y][x] !== '.' || b.g[y - 1][x] !== '.' || !firm.includes(b.g[y + 1][x])) continue;
        if (!best || y < best[1] || (y === best[1] && Math.abs(x - (x0 + x1) / 2) < Math.abs(best[0] - (x0 + x1) / 2))) best = [x, y];
      }
      if (!best) for (let x = Math.floor((x0 + x1) / 2) + 3; x < x1 && !best; x++) { const spot = ground(x); if (spot && spot[1] >= 7 && b.g[spot[1] - 5][spot[0]] === '.' && b.g[spot[1] - 4][spot[0]] === '.') best = [spot[0], spot[1] - 5]; }
      if (best) b.g[best[1]][best[0]] = 'x';
    }
  }
  }
  if (def.squad) b.set(def.squad.x, 2, 'i');
  if (def.key) { // a hidden map key: the highest free nook near the given spot
    let kx = def.key.x, ky = def.key.y;
    if (b.g[ky][kx] !== '.') { let best = null; for (let x = kx - 12; x <= kx + 12; x++) for (let y = 2; y <= 9; y++) if (x > 0 && x < b.w && b.g[y][x] === '.' && b.g[y - 1][x] === '.' && firm.includes(b.g[y + 1][x]) && (!best || y < best[1])) best = [x, y]; if (best) [kx, ky] = best; }
    b.g[ky][kx] = '&';
  }
  const ENT = 'gpzhmnCGKabctuMfjeykZsqwvlxi1234567&r890d*';
  for (let y = 0; y < 14; y++) for (let x = 0; x < b.w; x++) {
    const c = b.g[y][x];
    if (c === '@') { start = { x, y }; b.g[y][x] = '.'; } else if (ENT.includes(c)) {
      spawns.push({ t: c, x, y }); b.g[y][x] = '.';
      if (c === 'G') goal = { x, y };
      if (c === 'C') checkpoint = { x, y };
    }
  }
  spawns.sort((a, b2) => a.x - b2.x);
  if (def.yetiArena || def.miniArena) { // clear a mini-boss arena of other enemies
    const [a0, a1] = def.yetiArena || def.miniArena;
    for (let k = spawns.length - 1; k >= 0; k--) if (spawns[k].x >= a0 && spawns[k].x <= a1 && 'gpzhbctu'.includes(spawns[k].t)) spawns.splice(k, 1);
  }
  let medalId = 0;
  for (const sp of spawns) if (sp.t === 'M') sp.id = medalId++;
  let barId = 0;
  for (const sp of spawns) if (sp.t === 'x') sp.id = barId++;
  return { def, w: b.w, h: 14, grid: b.g, spawns, start, goal, checkpoint };
}
