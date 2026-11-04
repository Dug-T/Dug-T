// GOFFICHICK - level data
//
// Map legend
//  Walls:  #  gothic brick     %  rune stone      W  cheery wallpaper   O  cubicle panel
//          G  stained glass    C  crimson curtain M  pastel marble      Y  Wally poster
//          X  EXIT switch      D  door (opens automatically)
//          $  SECRET door: looks like a wall, press USE on it
//  Floors: ~  toxic glitter-slime (hurts!)
//  Player: > < ^ v  start position and facing
//  Enemies: z latte zombie   m middle manager   w WALLY MAN   b gym brute
//           i influencer skull   h smiley orb   K WALLY PRIME (boss)
//  Items:  + health vial   * black heart   o soul orb   a leather jacket   A spiked corset
//          c bullets   s shells   r skulls   u rockets   e soul jar
//  Weapons: 3 coffin shotgun  4 bone gatling  5 skull launcher  6 hexcaster  7 BFG
//           8 machine gun   9 shotgun   0 rocket launcher
//  Decor:  T candelabra  R tombstone  L torch pillar  p office plant  q water cooler
//          y pumpkin-spice barrel (explodes!)  k skull pile  j blood pool
'use strict';

const WALL_CHARS = { '#': 1, '%': 2, 'W': 3, 'O': 4, 'G': 7, 'C': 8, 'M': 9, 'Y': 12, 'X': 6 };

const ENEMY_CHARS = { z: 'zombie', m: 'manager', w: 'wally', b: 'brute', i: 'skull', h: 'orb', K: 'boss' };

const ITEM_TYPES = {
  '+': { sprite: 'vial', health: 10, msg: 'Picked up a vial of blood.' },
  '*': { sprite: 'heart', health: 25, msg: 'Picked up a black heart.' },
  'o': { sprite: 'soul', health: 100, overheal: true, msg: 'SOUL ORB! Darkness flows through you.' },
  'a': { sprite: 'jacket', armor: 100, armorType: 1, msg: 'Picked up a leather jacket.' },
  'A': { sprite: 'corset', armor: 200, armorType: 2, msg: 'Picked up the SPIKED CORSET!' },
  'c': { sprite: 'bullets', ammo: { bullets: 20 }, msg: 'Picked up a box of bullets.' },
  's': { sprite: 'shells', ammo: { shells: 8 }, msg: 'Picked up some shells.' },
  'r': { sprite: 'skullsAmmo', ammo: { skulls: 4 }, msg: 'Picked up some flaming skulls.' },
  'e': { sprite: 'souls', ammo: { souls: 60 }, msg: 'Picked up a jar of souls.' },
  'u': { sprite: 'rockets', ammo: { rockets: 4 }, msg: 'Picked up some rockets.' },
  '3': { sprite: 'w3', weapon: 'coffin', ammo: { shells: 8 } },
  '4': { sprite: 'w4', weapon: 'gatling', ammo: { bullets: 40 } },
  '5': { sprite: 'w5', weapon: 'launcher', ammo: { skulls: 5 } },
  '6': { sprite: 'w6', weapon: 'hexcaster', ammo: { souls: 80 } },
  '7': { sprite: 'w7', weapon: 'bfg', ammo: { souls: 80 } },
  '8': { sprite: 'w8', weapon: 'machinegun', ammo: { bullets: 40 } },
  '9': { sprite: 'w9', weapon: 'shotgun', ammo: { shells: 8 } },
  '0': { sprite: 'w0', weapon: 'rocketlauncher', ammo: { rockets: 4 } },
};

const DECOR_TYPES = {
  T: { sprite: 'candelabra', h: 0.75, block: true },
  R: { sprite: 'tombstone', h: 0.42, block: true },
  L: { sprite: 'torch', h: 0.95, block: true, bright: true },
  p: { sprite: 'plant', h: 0.55, block: true },
  q: { sprite: 'cooler', h: 0.65, block: true },
  y: { sprite: 'barrel', h: 0.5, block: true, barrel: true },
  k: { sprite: 'skulls', h: 0.2, block: false },
  j: { sprite: 'bloodpool', h: 0.07, block: false },
};

const LEVELS = [
  {
    name: 'E1M1: THE CEMETERY GATES',
    floor: 'graveyard', ceil: 'stoneCeil', fog: [10, 6, 16],
    // light zones: x, y, w, h, level (0..1), flicker
    lights: [
      { x: 1, y: 1, w: 12, h: 13, level: 0.45, flicker: true },   // the crypt
      { x: 13, y: 24, w: 5, h: 7, level: 0.55 },                  // secret stash
      { x: 6, y: 18, w: 8, h: 6, level: 0.7 },                    // zig-zag hall
      { x: 19, y: 19, w: 17, h: 14, level: 0.65 },                // south passage
      { x: 31, y: 26, w: 12, h: 7, level: 0.5, flicker: true },   // exit hall
    ],
    map: [
      '############################################',
      '##.z.#####.z.###############################',
      '##...#####...####################GGG#GGG#GG#',
      '##...........###################G.........G#',
      '##..z.....m..###################G....w....G#',
      '##...........#..................G.........G#',
      '##.%..%..%...#....R...m....R....G..T...T..G#',
      '##...........#..L............L..G.........G#',
      '##j....z.....D..................G.........G#',
      '##...........#...%.~~~~~~~~.s...G.........G#',
      '##.%..%..%...#.....~~~~~~~~.....G.rT.y.Te.G#',
      '##...........#.z...~~~A~~~~...z.D.........G#',
      '##..k..*..s..#...9.~~~~~~~~.....G.........G#',
      '##...........#.....~~~~~~~~.%...G.........G#',
      '############....................G..T...T..G#',
      '############.+..L............L..G.........G#',
      '############......R...i....R....G....m....G#',
      '############....................G.........G#',
      '######...z....###########D#######GGG#GGG#GG#',
      '######........###########..#################',
      '######..#################..#################',
      '######..#################..#################',
      '######..###########....y......z.....########',
      '######D############..............+..########',
      '##..........#######..#######################',
      '##..........#.c..##..#######################',
      '##..T....T..#....##..#######################',
      '##..........$..8a##...........#...........##',
      '##..........#....##....y.....c#...k...T...##',
      '##..T....T..#.c..##......m....#.....w.....##',
      '##....^.....#########.~~~.....D...........X#',
      '##.c......+.#########......z..#........*..##',
      '#####################.........#...........##',
      '############################################',
    ],
  },
  {
    name: 'E1M2: CUBICLE HELL',
    floor: 'carpet', ceil: 'officeCeil', fog: [40, 40, 44],
    lights: [
      { x: 24, y: 8, w: 9, h: 7, level: 0.5, flicker: true },
      { x: 1, y: 8, w: 6, h: 4, level: 0.6 },
      { x: 24, y: 16, w: 9, h: 4, level: 0.55, flicker: true },
    ],
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'W>.....W.........q.....W........W',
      'W......W..OO..OO..OO...W..m..b..W',
      'W..c...D...z.......m...D........W',
      'W......W..OO..OO..OO...W..OOOO..W',
      'W..p...W...........w...W..OOOO..W',
      'WWWDWWWW..OO..OO..OO...W..r...4.W',
      'W......W....z..........WWWWDWWWWW',
      'W..+...WWWWWWWWDWWWWWWWW........W',
      'W......W...........y...W..i..i0.W',
      'W..s...D..z...m....i...D........W',
      'W......W...........y...W...y....W',
      'WWWWDWWWWWWWWWWWWWDWWWWW........W',
      'W........OOOOOOO.......W...u.5..W',
      'W..w.....O..*..O...m...W........W',
      'W........O..a..O.......WWWWDWWWWW',
      'W..z.....OOODOOO..z....W........W',
      'W..........b...........W..w..wu.W',
      'W..y.....m.........y...D.....e..W',
      'W....+.........q.......W..p..o..X',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    ],
  },
  {
    name: "E1M3: WALLY'S PENTHOUSE",
    floor: 'tiles', ceil: 'goldCeil', fog: [24, 10, 30], boss: true,
    lights: [
      { x: 0, y: 16, w: 33, h: 9, level: 0.7, flicker: true },
      { x: 1, y: 7, w: 7, h: 5, level: 0.55 },
    ],
    map: [
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'M>.....M...........M............M',
      'M......M..h.....h..M..w......w..M',
      'M..e...D...........D............M',
      'M......M...p...p...M..MMMMMMM...M',
      'M..6...M...........M..M..A..M...M',
      'MMMDMMMMMMMMDMMMMMMMM.M..e..M...M',
      'M.......Y...........M.MMMDMMM...M',
      'M..wu...Y..i....i...M...........M',
      'M.......D...........D.....h.....M',
      'M..z....Y..m....m...M...........M',
      'M..+....Y...........MMMMMMDMMMMMM',
      'MMDMMMMMMMMMMMDMMMMMM...........M',
      'M.......u.................b.....M',
      'M..o....7......r.....s....e.....M',
      'MMMMMMMMMMMMMMMMDMMMMMMMMMMMMMMMM',
      'CCCCCC.....................CCCCCC',
      'C...........y.......y...........C',
      'C...L......................L....C',
      'C...............................C',
      'C....y.........K.........y......C',
      'C...............................C',
      'C...L......................L....C',
      'C...........y.......y...........C',
      'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    ],
  },
];
