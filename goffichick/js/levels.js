// GOFFICHICK - level data
//
// Map legend
//  Walls:  #  gothic brick     %  rune stone      W  cheery wallpaper   O  cubicle panel
//          G  stained glass    C  crimson curtain M  pastel marble      Y  Wally poster
//          X  EXIT switch      D  door (opens automatically)
//          $  SECRET door: looks like a wall, press USE on it
//          E  BAT door (red)   B  SKULL door (blue)   Q  COFFIN door (gold) - need the matching key
//  Floors: ~  toxic green sludge (hurts!)
//  Player: > < ^ v  start position and facing
//  Enemies: z latte zombie   m middle manager   w WALLY MAN   b gym brute
//           i influencer skull   h smiley orb   K WALLY PRIME (boss)
//  Items:  + health vial   * black heart   o soul orb   a leather jacket   A spiked corset
//          c bullets   s shells   r skulls   u rockets   n fuel   e soul jar
//  Keys:   1 bat key (red)   2 skull key (blue)   @ coffin key (gold)
//  Power-ups: V shadow veil (monsters can barely see you)   N night shroud (invulnerable)
//             Z gas mask (toxic sludge is harmless)       U rage heart (berserk fists)
//  Heights (in each level's definition):
//    heights: [{ x, y, w, h, z }]        raise a rectangle of floor to height z (1 = a full wall)
//                                         - steps of up to 0.36 can be walked up, like stairs
//    lifts:   [{ x, y, w, h, low, high }] a lift that sinks when you come near, then rises
//    ceilH: 1.4                           ceiling height for the level (raise it when floors go up)
//  Weapons: 3 coffin shotgun  4 bone gatling  5 skull launcher  6 hexcaster  7 BFG
//           8 machine gun   9 shotgun   0 rocket launcher   F flamethrower
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
  'n': { sprite: 'fuel', ammo: { fuel: 60 }, msg: 'Picked up a can of fuel.' },
  '3': { sprite: 'w3', weapon: 'coffin', ammo: { shells: 8 } },
  '4': { sprite: 'w4', weapon: 'gatling', ammo: { bullets: 40 } },
  '5': { sprite: 'w5', weapon: 'launcher', ammo: { skulls: 5 } },
  '6': { sprite: 'w6', weapon: 'hexcaster', ammo: { souls: 80 } },
  '7': { sprite: 'w7', weapon: 'bfg', ammo: { souls: 80 } },
  '8': { sprite: 'w8', weapon: 'machinegun', ammo: { bullets: 40 } },
  '9': { sprite: 'w9', weapon: 'shotgun', ammo: { shells: 8 } },
  '0': { sprite: 'w0', weapon: 'rocketlauncher', ammo: { rockets: 4 } },
  'F': { sprite: 'wF', weapon: 'flamethrower', ammo: { fuel: 80 } },
  '1': { sprite: 'keyRed', key: 'red', msg: 'Picked up the BAT KEY.' },
  '2': { sprite: 'keyBlue', key: 'blue', msg: 'Picked up the SKULL KEY.' },
  '@': { sprite: 'keyGold', key: 'gold', msg: 'Picked up the COFFIN KEY.' },
  'V': { sprite: 'veil', power: 'veil', time: 30, msg: 'SHADOW VEIL! Monsters can barely see you.' },
  'N': { sprite: 'shroud', power: 'shroud', time: 30, msg: 'NIGHT SHROUD! Nothing can hurt you.' },
  'Z': { sprite: 'mask', power: 'mask', time: 60, msg: 'GAS MASK! Toxic sludge is harmless.' },
  'U': { sprite: 'rage', berserk: true, msg: 'RAGE HEART! Your fists hit ten times harder.' },
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
    floor: 'graveyard', ceil: 'stoneCeil', fog: [92, 90, 94], ceilH: 1.4, stepTex: 1,
    heights: [
      { x: 37, y: 3, w: 1, h: 15, z: 0.12 },   // chapel steps up to the altar
      { x: 38, y: 3, w: 1, h: 15, z: 0.24 },
      { x: 39, y: 3, w: 3, h: 15, z: 0.36 },
      { x: 22, y: 11, w: 1, h: 1, z: 0.3 },    // armour island in the sludge
      { x: 39, y: 27, w: 3, h: 2, z: 0.7 },    // balcony in the exit hall
    ],
    lifts: [{ x: 38, y: 27, w: 1, h: 2, low: 0, high: 0.7 }],
    // light zones: x, y, w, h, level (0..1), flicker
    lights: [
      { x: 1, y: 1, w: 12, h: 13, level: 0.7, flicker: true },   // the crypt
      { x: 13, y: 24, w: 5, h: 7, level: 0.75 },                  // secret stash
      { x: 6, y: 18, w: 8, h: 6, level: 0.81 },                    // zig-zag hall
      { x: 19, y: 19, w: 17, h: 14, level: 0.79 },                // south passage
      { x: 31, y: 26, w: 12, h: 7, level: 0.72, flicker: true },   // exit hall
    ],
    map: [
      '############################################',
      '##.z.#####.z.###############################',
      '##1..#####...####################GGG#GGG#GG#',
      '##...........###################G.........G#',
      '##..z.n...m..###################G....w....G#',
      '##...........#..................G.........G#',
      '##.%..%..%...#....R...m....R....G..T...T..G#',
      '##...........#..L............L..G.........G#',
      '##j....z.....D..................G.........G#',
      '##...........#...%.~~~~~~~~.s...G.........G#',
      '##.%..%..%...#....Z~~~~~~~~.....G.rT.y.Te.G#',
      '##...........#.z...~~~A~~~~...z.D.........G#',
      '##..k..*..s..#...9.~~~~~~~~.....G.........G#',
      '##...........#.....~~~~~~~~.%...G.........G#',
      '############....................G..T...T..G#',
      '############.+..L........F...L..G.........G#',
      '############......R...i....R....G....m...VG#',
      '############....................G.........G#',
      '######...z....###########E#######GGG#GGG#GG#',
      '######........###########..#################',
      '######..#################..#################',
      '######..#################..#################',
      '######..###########....y......z.....########',
      '######D############..............+..########',
      '##..........#######..#######################',
      '##..........#.c..##..#######################',
      '##..T....T..#....##..#######################',
      '##..........$.N8a##...........#.........U.##',
      '##..........#....##....y..n..c#...k.......##',
      '##..T....T..#.c..##......m....#.....w.....##',
      '##....^.....#########.~~~.....D...........X#',
      '##.c......+.#########......z..#........*..##',
      '#####################.........#...........##',
      '############################################',
    ],
  },
  {
    name: 'E1M2: CUBICLE HELL',
    floor: 'carpet', ceil: 'officeCeil', fog: [70, 70, 76], ceilH: 1.5, stepTex: 4,
    heights: [
      { x: 10, y: 14, w: 5, h: 2, z: 0.25 },   // the manager's raised office
      { x: 30, y: 9, w: 2, h: 3, z: 0.75 },    // storage mezzanine
    ],
    lifts: [{ x: 29, y: 9, w: 1, h: 3, low: 0, high: 0.75 }],
    lights: [
      { x: 24, y: 8, w: 9, h: 7, level: 0.72, flicker: true },
      { x: 1, y: 8, w: 6, h: 4, level: 0.77 },
      { x: 24, y: 16, w: 9, h: 4, level: 0.75, flicker: true },
    ],
    map: [
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'W>.....W.........q.....W.......2W',
      'W......W..OO..OO..OO...W..m..b..W',
      'W..c...D...z.......m...D......n.W',
      'W......W..OO..OO..OO...W..OOOO..W',
      'W..p...W...........w...W..OOOO..W',
      'WWWDWWWW..OO..OO..OO...W..r...4.W',
      'W......W....z..........WWWWDWWWWW',
      'W..+...WWWWWWWWDWWWWWWWW........W',
      'W......W...........y...W..i...0.W',
      'W..s...D..z...m....i...D...i....W',
      'W......W...........y...W...y....W',
      'WWWWDWWWWWWWWWWWWWDWWWWW........W',
      'W........OOOOOOO.......W...u.5..W',
      'W..w.....O..*V.O...mn..W........W',
      'W........O..a..O.......WWWWBWWWWW',
      'W..z.....OOODOOO..z....W........W',
      'W..........b...........W..w..wu.W',
      'WU.y.....m.........y...B.....e..W',
      'W....+.........q.......W..p..o..X',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    ],
  },
  {
    name: "E1M3: WALLY'S PENTHOUSE",
    floor: 'tiles', ceil: 'goldCeil', fog: [50, 30, 56], boss: true, ceilH: 1.6, stepTex: 9,
    heights: [{ x: 12, y: 18, w: 9, h: 5, z: 0.25 }],   // Wally Prime's stage
    lights: [
      { x: 0, y: 16, w: 33, h: 9, level: 0.81, flicker: true },
      { x: 1, y: 7, w: 7, h: 5, level: 0.75 },
    ],
    map: [
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'M>.....M...........M............M',
      'M......M..h.....h..M..w......w..M',
      'M..e...D...........D............M',
      'M......M...p...p...M..MMMMMMM...M',
      'M..6...M...........M..M..A@.M...M',
      'MMMDMMMMMMMMDMMMMMMMM.M..e..M...M',
      'M.......Y...........M.MMMDMMM...M',
      'M..wu...Y..i....i...M...........M',
      'MU......D...........D.....h...n.M',
      'M..z....Y..m....m...M...........M',
      'M..+....Y...........MMMMMMDMMMMMM',
      'MMDMMMMMMMMMMMDMMMMMM...........M',
      'M...N...u...........n.....b...V.M',
      'M..o....7......r.....s....e.....M',
      'MMMMMMMMMMMMMMMMQMMMMMMMMMMMMMMMM',
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
