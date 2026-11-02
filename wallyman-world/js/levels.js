'use strict';
// Level layouts. Tiles:  # ground  B brick  W bonus(coin)  P bonus(energy drink)  S bonus(signal phone)
// O bonus(1-up badge)  X solid block  = one-way platform  ^ spikes  L lava  o coin
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
    name: 'STATIC FORTRESS', theme: 'castle', music: 'castle', time: 400, width: 190, boss: true,
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
];

function buildLevel(i) {
  const def = LEVELS[i], b = new LevelBuilder(def.width);
  def.build(b);
  const spawns = [];
  let start = { x: 2, y: 11 }, goal = null, checkpoint = null;
  const ENT = 'gpzhmnCGK';
  for (let y = 0; y < 14; y++) for (let x = 0; x < b.w; x++) {
    const c = b.g[y][x];
    if (c === '@') { start = { x, y }; b.g[y][x] = '.'; } else if (ENT.includes(c)) {
      spawns.push({ t: c, x, y }); b.g[y][x] = '.';
      if (c === 'G') goal = { x, y };
      if (c === 'C') checkpoint = { x, y };
    }
  }
  spawns.sort((a, b2) => a.x - b2.x);
  return { def, w: b.w, h: 14, grid: b.g, spawns, start, goal, checkpoint };
}
