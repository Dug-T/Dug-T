'use strict';
// =====================================================================
// Batch H (part 2): the Crystal Isle levels, puzzle rooms, Doug's
// story levels, the Survival Arena, the 5th island map, the bestiary,
// replays, best times + world leaderboards, the level radar, Hard
// Remix, the arena and story menus.
// =====================================================================
function hillUp(b, x, base, h) { for (let i = 0; i < h; i++) { b.set(x + i, base - 1 - i, SL_R); b.fill(x + i, base - i, x + i, 13, '#'); } return b; }
function hillDown(b, x, top, h) { for (let i = 0; i < h; i++) { b.set(x + i, top + i, SL_L); b.fill(x + i, top + i + 1, x + i, 13, '#'); } return b; }
const K_BASE = LEVELS.length; // 38
LEVELS.push(
  { // 38
    name: 'GLITTER GROTTO', theme: 'crystal', music: 'crystal', width: 200, time: 320, lantern: true, tag: 'K1', world: 'CRYSTAL ISLE 1',
    extras: [['b', 60], ['b', 118], ['g', 150]],
    build(b) {
      b.fill(0, 0, 199, 0, '#');
      b.ground(0, 28).set(2, 11, '@').set(6, 8, CRYS).coins(9, 9, 4).set(14, 11, 'ζ').row(18, 8, 'BWB').set(24, 11, 'g');
      b.ground(32, 49).set(36, 7, CRYS).set(40, 11, 'ζ').coins(42, 10, 3);
      b.fill(47, 3, 47, 9, 'X').ground(50, 66, 3).set(50, 7, CRYS).coins(53, 2, 4).set(60, 2, 'ζ');
      b.ground(67, 96).set(70, 11, 'C').set(75, 8, CRYS).row(80, 8, 'BWWB').set(84, 11, 'ζ').set(90, 11, 'p').set(98, 9, 'm');
      b.ground(105, 140).set(110, 11, 'ζ').set(114, 7, CRYS).coins(116, 9, 5).set(122, 11, 'g').set(126, 11, 'g');
      b.fill(131, 4, 131, 9, 'X').ground(134, 150, 4).set(134, 8, CRYS).coins(137, 3, 4).set(144, 3, 'ζ');
      b.ground(151, 199).set(158, 11, 'ζ').set(164, 8, CRYS).row(168, 8, 'WPW').set(176, 11, 'p').set(184, 8, CRYS).set(190, 11, 'G');
    },
  },
  { // 39
    name: 'WINDY CLIFFS', theme: 'sky', music: 'sky', width: 200, time: 300, gusts: true, tag: 'K2', world: 'CRYSTAL ISLE 2',
    extras: [['z', 70], ['u', 130]],
    build(b) {
      b.ground(0, 22).set(2, 11, '@').coins(8, 9, 4).set(16, 11, 'g');
      b.ground(26, 31).set(31, 12, FAN).ground(32, 48, 6).coins(36, 4, 4).set(44, 3, 'ψ');
      b.ground(52, 70, 8).set(58, 7, 'g').row(62, 4, 'BWB');
      b.ground(71, 96).set(74, 11, 'C').set(80, 11, 'g').set(86, 7, 'ψ');
      for (const fx of [100, 105, 110, 115]) b.fill(fx, 12, fx, 13, '#').set(fx, 11, FAN);
      b.ground(119, 150).set(124, 11, 'p').coins(128, 9, 5).set(134, 7, 'ψ').set(140, 11, 'g').set(147, 12, FAN);
      b.ground(148, 170, 6).coins(152, 4, 4).set(160, 5, 'g');
      b.ground(171, 199).set(178, 11, 'h').set(190, 11, 'G');
    },
  },
  { // 40
    name: 'SLIPPERY SLOPES', theme: 'snow', music: 'snow', width: 200, time: 300, tag: 'K3', world: 'CRYSTAL ISLE 3',
    extras: [['b', 50], ['h', 110]],
    build(b) {
      b.ground(0, 14).set(2, 11, '@').set(9, 11, 'g');
      hillUp(b, 15, 12, 4); b.ground(19, 26, 8).coins(20, 6, 5); hillDown(b, 27, 8, 4);
      b.ground(31, 40).set(34, 11, 'g').set(37, 11, 'g');
      hillUp(b, 41, 12, 3); b.ground(44, 48, 9); hillDown(b, 49, 9, 3);
      b.ground(52, 60).set(56, 11, 'p');
      b.ground(64, 76).set(66, 11, 'C');
      hillUp(b, 77, 12, 6); b.ground(83, 90, 6).row(85, 2, 'WBW'); hillDown(b, 91, 6, 6);
      b.ground(97, 120).set(100, 11, 'g').set(103, 11, 'p').coins(108, 10, 5);
      hillUp(b, 121, 12, 4); b.ground(125, 135, 8).set(130, 7, 'h'); hillDown(b, 136, 8, 4);
      b.ground(140, 160).set(146, 11, 'g').set(148, 11, 'g').set(150, 11, 'g');
      hillUp(b, 161, 12, 3); b.ground(164, 170, 9); hillDown(b, 171, 9, 3);
      b.ground(174, 199).set(190, 11, 'G');
    },
  },
  { // 41
    name: 'TOY FACTORY', theme: 'toy', music: 'toy', width: 200, time: 300, tag: 'K4', world: 'CRYSTAL ISLE 4',
    build(b) {
      b.ground(0, 20).set(2, 11, '@').set(10, 11, 'μ').coins(14, 9, 4);
      b.ground(21, 34).fill(21, 12, 34, 12, '>').set(26, 2, 'χ').set(31, 2, 'χ');
      b.ground(35, 50).set(40, 11, 'σ').row(43, 8, 'BWB').set(49, 12, 'J').fill(51, 5, 58, 5, '=').coins(52, 3, 5);
      b.ground(55, 70).set(59, 11, 'μ').set(63, 11, 'σ').set(67, 11, 'C');
      b.ground(71, 86).fill(71, 12, 86, 12, '<').set(75, 2, 'χ').set(80, 2, 'χ').set(84, 11, 'μ');
      b.ground(87, 94).set(94, 12, FAN).ground(95, 110, 6).coins(98, 4, 5).set(105, 5, 'σ');
      b.ground(111, 130).set(114, 11, 'μ').set(118, 11, 'μ').set(122, 2, 'χ').set(126, 2, 'χ');
      b.ground(135, 160).fill(138, 12, 150, 12, '>').set(144, 2, 'χ').set(154, 11, 'σ');
      b.ground(161, 199).set(166, 11, 'μ').set(172, 12, 'J').fill(174, 6, 180, 6, '=').coins(175, 4, 5).set(190, 11, 'G');
    },
  },
  { // 42
    name: 'MAGMA CHASE', theme: 'volcano', music: 'volcano', width: 200, time: 240, chase: { speed: 0.95, delay: 150 }, tag: 'K5', world: 'CRYSTAL ISLE 5',
    build(b) {
      b.ground(0, 24).set(3, 11, '@').coins(10, 10, 4);
      b.fill(25, 12, 27, 13, 'L'); b.ground(28, 46).fill(36, 10, 37, 11, 'X').set(42, 11, 'g');
      b.fill(47, 12, 49, 13, 'L'); b.ground(50, 70).row(55, 8, 'WBW').fill(62, 9, 63, 11, 'X').coins(64, 10, 3);
      b.fill(71, 12, 73, 13, 'L'); b.ground(74, 96).set(80, 11, 'g').fill(86, 10, 87, 11, 'X');
      b.ground(97, 120).set(100, 11, 'C').row(106, 8, 'BPB').fill(112, 10, 113, 11, 'X');
      b.fill(121, 12, 123, 13, 'L'); b.ground(124, 146).set(130, 11, 'g').fill(136, 9, 137, 11, 'X').coins(138, 9, 3);
      b.fill(147, 12, 149, 13, 'L'); b.ground(150, 170).fill(158, 10, 159, 11, 'X').set(164, 11, 'g');
      b.fill(171, 12, 172, 13, 'L'); b.ground(173, 199).set(190, 11, 'G');
    },
  },
  { // 43
    name: 'BEAT BOX ARENA', theme: 'neon', music: 'neon', width: 70, time: 300, boss: true, bossHp: 6, bossName: 'DJ DECIBEL', bossType: 'dj', talk: 'dj', tag: 'K6', world: 'CRYSTAL ISLE 6',
    bossMsg: ['DJ DECIBEL IS UNPLUGGED!', '', 'THE BEAT BOX FALLS SILENT...', 'BUT A ROAR ECHOES FROM THE', 'TOP OF CRYSTAL CROWN.', '', 'THE CRYSTAL DRAGON AWAITS!'],
    extras: [['z', 20]],
    build(b) {
      b.ground(0, 69).set(2, 11, '@').coins(8, 9, 4).set(14, 11, 'g').set(20, 11, 'σ').row(24, 8, 'WEW').set(34, 11, 'C').set(40, 11, 'μ');
      b.row(57, 8, '===').set(66, 11, '*');
    },
  },
  { // 44
    name: 'CRYSTAL CROWN', theme: 'crystal', music: 'crystal', width: 130, time: 300, boss: true, bossHp: 8, bossName: 'CRYSTAL DRAGON', bossType: 'cdragon', talk: 'cdragon', tag: 'K7', world: 'CRYSTAL ISLE 7',
    bossMsg: ['THE CRYSTAL DRAGON IS BEATEN!', '', 'ITS CRYSTALS GLOW WITH FULL', 'SIGNAL, AND CRYSTAL ISLE', 'SPARKLES ONCE MORE.', '', 'TRY THE PUZZLE ROOMS, THE', 'ARENA AND HARD REMIX NEXT!'],
    extras: [['b', 40]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').set(10, 11, 'ζ').set(16, 8, CRYS).coins(18, 9, 4);
      b.fill(26, 4, 26, 9, 'X').ground(29, 44, 4).set(29, 8, CRYS).coins(32, 3, 4);
      b.ground(45, 80).set(50, 11, 'ζ').set(56, 11, 'C').row(60, 8, 'BWB').set(66, 11, 'ζ').set(72, 8, CRYS);
      b.ground(84, 113).set(90, 11, 'g').set(96, 11, 'ζ').coins(100, 9, 4);
      b.ground(114, 129).row(116, 8, '===').row(125, 8, '===').set(121, 11, '*');
    },
  },
  { // 45
    name: 'PUSH PUZZLE', theme: 'crystal', music: 'crystal', width: 32, time: 300, noAuto: true, puzzle: {}, tag: 'P1', world: 'PUZZLE ROOM 1',
    signLines: ['PUSH THE CRATES ONTO', 'BOTH PLATES, THEN GROUND', 'POUND THE ORANGE PLATE!'],
    build(b) {
      b.ground(0, 31).set(2, 11, '@').set(4, 11, 'ς').set(8, 11, PLATE).set(14, 11, 'β').fill(18, 8, 21, 8, 'X').set(20, 7, 'β').set(24, 11, PLATE).set(26, 12, POUNDP);
      b.fill(28, 1, 28, 11, GATE).set(30, 11, 'G');
    },
  },
  { // 46
    name: 'LIGHT PUZZLE', theme: 'crystal', music: 'crystal', width: 32, time: 300, noAuto: true, dark2: true, puzzle: { beams: [[2, 7, 'r']] }, tag: 'P2', world: 'PUZZLE ROOM 2',
    signLines: ['BOUNCE THE LIGHT INTO THE', 'TARGET. PRESS UP WHILE', 'TOUCHING A MIRROR TO TURN IT.'],
    build(b) {
      b.ground(0, 31).set(4, 11, '@').set(6, 11, 'ς').set(2, 7, EMIT);
      b.set(10, 7, MIR_A).set(10, 10, MIR_A).set(20, 10, MIR_B).set(20, 5, MIR_B).set(27, 5, RECV);
      b.fill(8, 9, 11, 9, '=').fill(15, 9, 17, 9, '=').fill(19, 7, 22, 7, '=');
      b.fill(29, 1, 29, 11, GATE).set(30, 11, 'G');
    },
  },
  { // 47
    name: 'PRISM VAULT', theme: 'crystal', music: 'crystal', width: 40, time: 300, noAuto: true, puzzle: { beams: [[6, 3, 'd']] }, tag: 'P3', world: 'PUZZLE ROOM 3',
    signLines: ['LIGHT, CRATES AND A POUND', 'PLATE. USE EVERYTHING YOU', 'HAVE LEARNED!'],
    build(b) {
      b.ground(0, 39).set(2, 11, '@').set(3, 11, 'ς').set(6, 3, EMIT).set(6, 9, MIR_A).fill(4, 11, 8, 11, '=');
      b.fill(16, 10, 17, 11, 'X').fill(18, 10, 18, 11, 'X').set(18, 9, 'β').set(24, 11, PLATE).set(28, 12, POUNDP).set(34, 9, RECV);
      b.fill(36, 1, 36, 11, GATE).set(38, 11, 'G');
    },
  },
  { // 48
    name: "DOUG'S DASH", theme: 'grass', music: 'doug', width: 200, time: 300, rival: true, rivalSpeed: 2.2, story: 1, tag: 'D1', world: "DOUG'S STORY 1",
    build(b) {
      b.ground(0, 30).set(3, 11, '@').coins(10, 10, 6).set(20, 11, 'g');
      b.ground(33, 60).fill(44, 9, 45, 11, 'X').coins(46, 8, 3).set(52, 11, 'g');
      b.ground(61, 72).fill(70, 4, 70, 9, 'X').ground(73, 90, 4).coins(76, 3, 5);
      b.ground(91, 120).set(95, 11, 'C').row(100, 8, 'BWB').set(108, 11, 'p');
      b.ground(124, 160).fill(132, 10, 133, 11, 'X').set(140, 11, 'g').set(150, 11, 'h');
      b.ground(161, 199).set(170, 11, 'g').set(190, 11, 'G');
    },
  },
  { // 49
    name: "VOLT'S VAULT", theme: 'factory', music: 'toy', width: 200, time: 300, story: 2, tag: 'D2', world: "DOUG'S STORY 2",
    build(b) {
      b.ground(0, 20).set(3, 11, '@').set(12, 11, 'μ');
      b.ground(21, 40).fill(24, 12, 36, 12, '>').set(28, 2, 'χ').set(33, 2, 'χ');
      b.ground(41, 48).set(48, 12, FAN).ground(49, 60, 6).coins(51, 4, 5).set(56, 5, 'σ');
      b.ground(61, 90).set(65, 11, 'C').fill(70, 12, 84, 12, '<').set(74, 2, 'χ').set(79, 2, 'χ').set(87, 11, 'μ');
      b.ground(94, 130).set(100, 11, 'σ').row(106, 8, 'BWB').set(112, 12, 'J').fill(114, 5, 122, 5, '=').coins(115, 3, 6);
      b.ground(131, 136).fill(134, 4, 134, 9, 'X').ground(137, 160, 4).coins(140, 3, 4);
      b.ground(161, 199).set(170, 11, 'μ').set(176, 2, 'χ').set(190, 11, 'G');
    },
  },
  { // 50
    name: 'FINAL SPRINT', theme: 'neon', music: 'doug', width: 110, time: 300, story: 3, boss: true, bossHp: 4, bossName: 'VOLT', bossType: 'volt', talk: 'volt', tag: 'D3', world: "DOUG'S STORY 3",
    build(b) {
      b.ground(0, 40).set(3, 11, '@').coins(8, 10, 5).set(16, 11, 'g').fill(24, 9, 25, 11, 'X').set(32, 11, 'σ');
      b.ground(44, 93).set(50, 11, 'C').row(56, 8, 'WPW').set(64, 11, 'μ').set(72, 11, 'g');
      b.ground(94, 109).row(97, 8, '===').row(105, 8, '===').set(104, 11, '*');
    },
  },
);
window.ARENA_LEVEL = { name: 'SURVIVAL ARENA', theme: 'castle', music: 'arena', width: 16, time: 999, noAuto: true, noSign: true, build(b) { b.ground(0, 15).fill(0, 0, 0, 11, 'X').fill(15, 0, 15, 11, 'X').row(3, 8, '====').row(9, 8, '====').row(6, 5, '====').set(7, 11, '@'); } };

// ---------------- Crystal Isle on the world map ----------------
NODES4.push({ x: 232, y: 168, kind: 'portal', to: 4, name: 'BOAT TO CRYSTAL ISLE' }); EDGES4.push([4, 10]);
const NODES5 = [
  { x: 26, y: 176, kind: 'portal', to: 3, name: 'BOAT TO THE LOST LANDS' },
  { x: 64, y: 150, kind: 'level', li: 38 }, { x: 104, y: 172, kind: 'level', li: 39 }, { x: 146, y: 146, kind: 'level', li: 40 },
  { x: 192, y: 166, kind: 'level', li: 41 }, { x: 222, y: 124, kind: 'level', li: 42 }, { x: 178, y: 94, kind: 'level', li: 43 }, { x: 124, y: 62, kind: 'castle', li: 44 },
  { x: 40, y: 112, kind: 'bonus', icon: 'puzzle', li: 45, side: true, after: 38 }, { x: 110, y: 112, kind: 'bonus', icon: 'puzzle', li: 46, side: true, after: 40 }, { x: 232, y: 80, kind: 'bonus', icon: 'puzzle', li: 47, side: true, after: 42 },
];
const EDGES5 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [1, 8], [3, 9], [5, 10]];
const Island5 = makeIsland(NODES5, [[84, 160, 26], [126, 158, 26], [170, 150, 26], [206, 146, 24], [200, 108, 24], [150, 80, 26], [92, 86, 22], [60, 130, 20]], 151, (f, near, ch, r) => {
  let col = null;
  if (f > 1.9) {
    col = ch ? [70, 150, 150] : [86, 170, 168];
    if (near(7, 34) || near(1, 26)) col = ch ? [90, 70, 160] : [110, 90, 190];
    if (near(3, 26)) col = ch ? [220, 236, 250] : [240, 248, 255];
    if (near(4, 26)) col = ch ? [255, 110, 120] : [255, 210, 80];
    if (near(5, 22)) col = ch ? [110, 60, 50] : [130, 76, 60];
  } else if (f > 1.45) col = [210, 200, 240];
  else if (f > 1.25) col = [120, 200, 230];
  if (f > 5 && r() < 0.05) col = [200, 255, 255];
  return col;
});
WORLDS.push({ nodes: () => NODES5, edges: () => EDGES5, isle: () => Island5, name: 'CRYSTAL ISLE', sea: ['#1a3a6a', '#2a5a9a'], key: 'node5' });
{ // map extras: puzzle-room icons, and the best / world time for the level you are standing on
  const _Map = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _Map(...a), d = s.draw;
    if (!s.isMap) return s;
    s.draw = function () {
      d.call(this);
      const W = game.world || 0, WD = WORLDS[W], nodes = WD.nodes();
      for (const n of nodes) if (n.icon === 'puzzle' && game.cleared[n.after]) { hR(n.x - 7, n.y - 14, 14, 12, '#1a1020'); hR(n.x - 6, n.y - 13, 12, 10, '#7a50d0'); txt('?', n.x - 2, n.y - 11, (frame >> 4) & 1 ? '#ffe040' : '#ffffff'); }
      const n = nodes[Math.min(nodes.length - 1, game[WD.key] || 0)];
      if (!n || n.li === undefined || n.kind === 'door') return;
      const best = BestTimes.get(n.li), wt = Leaders.peek(n.li);
      if (!best && !wt) return;
      drawWindow(142, 26, 110, wt ? 24 : 15);
      if (best) txt('BEST ' + fmtTime(best.f), 148, 30, '#5ff0ff');
      if (wt && wt[0]) txt('WORLD ' + fmtTime(wt[0].f), 148, 40, '#ffe040');
    };
    return s;
  };
}

// ---------------- bestiary ----------------
const BEAST_INFO = {
  grumble: 'A GRUMPY LITTLE WALKER. STOMP IT FLAT!', prickle: 'COVERED IN SPIKES. NEVER STOMP IT - THROW A CANNONBALL.', buzzer: 'BUZZES UP AND DOWN THROUGH THE AIR.', hopper: 'BOINGS TOWARD YOU. TIME YOUR JUMP.',
  bat: 'HANGS FROM CEILINGS, THEN SWOOPS DOWN.', charger: 'A ROBOT RHINO. IT CHARGES WHEN IT SPOTS YOU.', turret: 'FIRES STATIC SHOTS. STOMP IT FROM ABOVE.', ufo: 'A FLYING SAUCER THAT BEAMS DOWN ZAPS.',
  fish: 'SWIMS TO AND FRO UNDER THE WAVES.', jelly: 'A STINGY JELLYFISH. HANDS OFF!', ghost: 'ONLY COMES OUT AT NIGHT. BOO!', squad: 'ALIENS MARCHING IN FORMATION.', beamling: 'A LITTLE ALIEN BEAMED DOWN FROM A UFO.',
  slime: 'SPLITS INTO SMALLER SLIMES WHEN SQUASHED.', mimic: 'PRETENDS TO BE A BONUS BLOCK. SNEAKY!', boomer: 'THROWS BOOMERANGS THAT COME BACK.', magdrone: 'PULLS YOU CLOSE WITH ITS MAGNET.', asteroid: 'A SPACE ROCK. DODGE IT!', cactus: 'A SPIKY DESERT PLANT.',
  toysoldier: 'MARCHES ALONG AND FIRES CORKS FROM ITS POP GUN.', windup: 'A SPEEDY CLOCKWORK MOUSE. ZOOM!', crystalbug: 'A GLOWING BUG. HANDY LIGHT IN THE DARK.', gustbird: 'RIDES THE WIND HIGH ABOVE THE CLIFFS.',
  boss: 'BARON STATIC: THE VILLAIN WHO SCRAMBLED THE SIGNAL.', yeti: 'A FROSTY GIANT WHO THROWS SNOWBALLS.', crab: 'KING KRABBY: SNAPPY CLAWS, SOFT SHELL TOP.', mole: 'DRILL MOLE: POPS UP FROM UNDER THE GROUND.', dragon: 'NIMBUS: A CLOUD DRAGON WHO BREATHES FOG.',
  mother: 'THE MOTHERSHIP: BIG BOSS OF THE UFOS.', ringmaster: 'THE RINGMASTER RUNS THE CRAZY BIG TOP.', golem: 'A STONE GOLEM GUARDING THE VINE TEMPLE.', sandworm: 'A HUGE WORM THAT BURROWS THROUGH SAND.',
  emperor: 'THE STATIC EMPEROR: RULER OF THE STATIC DIMENSION.', squid: 'THE GIANT SQUID OF THE DEEP SEA TRENCH.', cdragon: 'THE CRYSTAL DRAGON: QUEEN OF CRYSTAL CROWN.', dj: 'DJ DECIBEL: EVERY ATTACK LANDS ON THE BEAT!', volt: "VOLT: DOUG'S RIVAL. FAST, BUT GETS TIRED.",
};
const BEASTS = STICKERS.filter((s) => s[2] === 'e' || s[2] === 'b').map((s) => [s[0], s[1], s[2]]).concat([['toysoldier', 'TOY SOLDIER', 'e'], ['windup', 'WIND-UP MOUSE', 'e'], ['crystalbug', 'CRYSTAL BUG', 'e'], ['gustbird', 'GUST BIRD', 'e'], ['cdragon', 'CRYSTAL DRAGON', 'b'], ['dj', 'DJ DECIBEL', 'b'], ['volt', 'VOLT', 'b']]);
const lsJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } };
const lsS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full or blocked */ } };
const Bestiary = (() => {
  const KEY = 'wallyman-bestiary', got = lsJ(KEY, {});
  return {
    add(id) { if (!BEASTS.some((b) => b[0] === id)) return; got[id] = (got[id] | 0) + 1; lsS(KEY, got); if (Object.keys(got).length >= 25) Ach.unlock('bestiary'); },
    n: (id) => got[id] | 0, count: () => BEASTS.filter((b) => got[b[0]]).length,
  };
})();
{
  const _ck = Play.prototype.countKill;
  Play.prototype.countKill = function (e) { _ck.call(this, e); if (e && this.state === 'play') { Bestiary.add(e.type); if (this.mode && this.mode.kind === 'arena') this.arenaKills = (this.arenaKills || 0) + 1; } };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) { const a = e.alive; _db.call(this, e); if (a && !e.alive && !['cdragon', 'dj', 'volt'].includes(e.type)) Bestiary.add(e.kind === 'mother' ? 'mother' : e.type); };
  const _dy = Play.prototype.damageYeti;
  Play.prototype.damageYeti = function (e) { const a = e.alive && !e.dying; _dy.call(this, e); if (a && (!e.alive || e.dying)) Bestiary.add(e.type); };
}
function BestiaryScene() {
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % BEASTS.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + BEASTS.length - 1) % BEASTS.length; Audio8.sfx('select'); }
      if (Input.pressed('right')) { sel = Math.min(BEASTS.length - 1, sel + 10); Audio8.sfx('select'); }
      if (Input.pressed('left')) { sel = Math.max(0, sel - 10); Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.pressed('run') || Input.confirm()) go(() => ExtrasScene());
    },
    draw() {
      ctx.fillStyle = '#20301a'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#2a3e22'; for (let y = 0; y < VH; y += 8) ctx.fillRect(0, y, VW, 1);
      txt('BESTIARY', 128, 6, '#ffe040', { align: 'center', outline: '#101810' }); txt(`${Bestiary.count()}/${BEASTS.length}`, 248, 6, '#fff', { align: 'right' });
      drawWindow(4, 18, 104, 200);
      const top = clamp(sel - 8, 0, Math.max(0, BEASTS.length - 18));
      for (let i = 0; i < 18; i++) { const k = top + i, b = BEASTS[k]; if (!b) break; const seen = Bestiary.n(b[0]) > 0, y = 24 + i * 10.6; txt(seen ? b[1].slice(0, 12) : '???', 16, Math.round(y), k === sel ? '#ffe040' : seen ? '#fff' : '#7880b0'); if (k === sel) txt('>', 8, Math.round(y), '#ffe040'); }
      const b = BEASTS[sel], seen = Bestiary.n(b[0]) > 0;
      drawWindow(112, 18, 140, 200);
      ctx.fillStyle = '#c8e0b0'; ctx.fillRect(120, 28, 124, 76); ctx.fillStyle = '#a8c890'; ctx.fillRect(120, 92, 124, 12);
      ctx.save(); ctx.translate(182, 70); ctx.scale(2, 2); if (!seen) ctx.filter = 'brightness(0)'; stickerArt(b[0], 0, 0, t); ctx.restore(); ctx.filter = 'none';
      txt(seen ? b[1] : '??????', 182, 110, b[2] === 'b' ? '#ff8080' : '#ffe040', { align: 'center' });
      txt(b[2] === 'b' ? 'BOSS' : 'ENEMY', 182, 120, '#a8b0d8', { align: 'center' });
      (seen ? wrapText(BEAST_INFO[b[0]] || 'A MYSTERIOUS CREATURE.', 20) : ['BEAT ONE TO FILL', 'IN THIS PAGE.']).forEach((l, i) => txt(l, 182, 136 + i * 10, '#fff', { align: 'center' }));
      txt(`BEATEN: ${Bestiary.n(b[0])}`, 182, 200, '#5ff0ff', { align: 'center' });
    },
  };
}

// ---------------- replays and best times ----------------
const Replays = (() => {
  const KEY = 'wallyman-replays', MAX = 12;
  const all = () => lsJ(KEY, {});
  return {
    all, get: (li) => all()[li] || null,
    save(li, f, rec) {
      const d = all(), old = d[li]; if (old && old.f <= f) return false;
      d[li] = { f, rec, hero: heroOf(), when: Date.now() };
      const keys = Object.keys(d).sort((a, b) => d[b].when - d[a].when); for (const k of keys.slice(MAX)) delete d[k];
      lsS(KEY, d); if (!lsJ(KEY, null) || !lsJ(KEY, {})[li]) { delete d[keys[keys.length - 1]]; lsS(KEY, d); }
      return true;
    },
  };
})();
const Leaders = (() => { // world best times per level (needs the Firebase settings in online-config.js)
  const cfg = window.WALLYMAN_ONLINE || {}, on = !!(cfg.projectId && cfg.apiKey && window.fetch);
  const base = on ? `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/leaders` : '';
  const key = () => `key=${encodeURIComponent(cfg.apiKey)}`, cache = {}, asked = {};
  async function get(li) {
    if (!on) return null; if (cache[li] !== undefined) return cache[li];
    const res = await fetch(`${base}/L${li}?${key()}`); if (!res.ok) { cache[li] = []; return cache[li]; }
    const f = (await res.json()).fields || {}; let top = []; try { top = JSON.parse((f.top && f.top.stringValue) || '[]'); } catch (e) { top = []; }
    cache[li] = Array.isArray(top) ? top.filter((r) => r && typeof r.f === 'number' && typeof r.n === 'string').slice(0, 5) : []; return cache[li];
  }
  async function submit(li, f, n) {
    if (!on) return false;
    const cur = (await get(li).catch(() => [])) || [];
    if (cur.length >= 5 && cur[cur.length - 1].f <= f) return false;
    const top = cur.concat([{ n, f }]).sort((a, b) => a.f - b.f).slice(0, 5);
    const res = await fetch(`${base}/L${li}?${key()}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { li: { integerValue: String(li) }, top: { stringValue: JSON.stringify(top) } } }) });
    if (res.ok) cache[li] = top; return res.ok;
  }
  const peek = (li) => { if (!on) return null; if (cache[li] === undefined && !asked[li]) { asked[li] = true; get(li).catch(() => {}); } return cache[li] || null; };
  return { on, get, submit, peek };
})();
const BestTimes = (() => {
  const KEY = 'wallyman-times';
  return {
    get: (li) => lsJ(KEY, {})[li] || null,
    submit(li, f) {
      if (!f) return; const d = lsJ(KEY, {}), n = (localStorage.getItem('wallyman-world-lastname') || HEROES[heroOf()].short || 'PLAYER').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 10) || 'PLAYER';
      if (!d[li] || f < d[li].f) { d[li] = { f, n }; lsS(KEY, d); }
      Leaders.submit(li, f, n).catch(() => {});
    },
  };
})();
function ReplaysScene(start = 0) {
  const list = () => Object.keys(Replays.all()).map(Number).filter((li) => LEVELS[li]).sort((a, b) => a - b);
  let sel = start, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; const L = list();
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene()); return; }
      if (!L.length) return;
      sel = clamp(sel, 0, L.length - 1);
      if (Input.pressed('down')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
      if (Input.confirm()) {
        const li = L[sel], r = Replays.get(li), keep = sel; Audio8.sfx('confirm');
        game = challengeGame(); if (r.hero && HEROES[r.hero]) game.hero = r.hero;
        go(() => { const s = new Play(li, false); s.mode = { kind: 'replay', rec: r.rec, frames: r.f, sel: keep }; return s; });
      }
    },
    draw() {
      drawParallax('neon', t * 0.3); drawWindow(16, 12, 224, 200);
      txt('REPLAYS', 128, 18, '#ffe040', { align: 'center' });
      const L = list();
      if (!L.length) { ['FINISH A LEVEL AND YOUR', 'FASTEST RUN IS SAVED HERE', 'TO WATCH BACK ANY TIME!'].forEach((l, i) => txt(l, 128, 80 + i * 12, '#fff', { align: 'center' })); }
      const top = clamp(sel - 7, 0, Math.max(0, L.length - 15));
      for (let i = 0; i < 15; i++) { const li = L[top + i]; if (li === undefined) break; const r = Replays.get(li), y = 34 + i * 11, on = top + i === sel; txt(`${levelTag(li)}. ${LEVELS[li].name}`.slice(0, 24), 34, y, on ? '#ffe040' : '#fff'); txt(fmtTime(r.f), 232, y, '#5ff0ff', { align: 'right' }); if (on) txt('>', 24 + ((t >> 3) & 1), y, '#ffe040'); }
      txt('A: WATCH   B: BACK   (BEST 12 KEPT)', 128, 200, '#a8b0d8', { align: 'center' });
    },
  };
}
function LeaderScene() {
  const L = LEVELS.map((_, i) => i).filter((i) => !LEVELS[i].story && !LEVELS[i].bonus || i === 8 || i === 9 || i === 10);
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene()); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
      Leaders.peek(L[sel]);
    },
    draw() {
      drawParallax('castle', t * 0.3); drawWindow(4, 6, 248, 212);
      txt('LEADERBOARDS', 128, 12, '#ffe040', { align: 'center' });
      const top = clamp(sel - 8, 0, Math.max(0, L.length - 17));
      for (let i = 0; i < 17; i++) { const li = L[top + i]; if (li === undefined) break; const y = 26 + i * 10.5, on = top + i === sel, b = BestTimes.get(li); txt(`${levelTag(li)} ${LEVELS[li].name}`.slice(0, 13), 18, Math.round(y), on ? '#ffe040' : '#fff'); txt(b ? fmtTime(b.f) : '--:--.--', 150, Math.round(y), '#5ff0ff', { align: 'right' }); if (on) txt('>', 10, Math.round(y), '#ffe040'); }
      hR(158, 24, 1, 182, '#5a5a80');
      txt('WORLD TOP 5', 205, 26, '#ffe040', { align: 'center' });
      const li = L[sel], w = Leaders.peek(li);
      if (!Leaders.on) ['WORLD TIMES', 'NEED THE', 'FIREBASE', 'SETTINGS IN', 'ONLINE-CONFIG.JS'].forEach((l, i) => txt(l, 205, 44 + i * 11, '#a8b0d8', { align: 'center' }));
      else if (!w) txt('LOADING...', 205, 44, '#a8b0d8', { align: 'center' });
      else if (!w.length) txt('NO TIMES YET!', 205, 44, '#a8b0d8', { align: 'center' });
      else w.forEach((r, i) => { txt(`${i + 1} ${r.n}`.slice(0, 11), 164, 42 + i * 20, i === 0 ? '#ffe040' : '#fff'); txt(fmtTime(r.f), 246, 52 + i * 20, '#5ff0ff', { align: 'right' }); });
      txt('YOUR BEST TIMES ON THE LEFT', 128, 208, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- level radar (levels you have beaten before) ----------------
{
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _hud.call(this);
    if (this.mode || this.ta || this.rush || this.daily || this.endless || this.def.custom || this.li >= LEVELS.length || !game.cleared[this.li] || this.def.boss || this.lv.w < 40 || Settings.get('radar') === false) return;
    const W = this.lv.w * TS, x0 = 40, w = 176, y = 214, X = (px) => x0 + Math.round(clamp(px / W, 0, 1) * w);
    ctx.fillStyle = 'rgba(16,16,40,0.7)'; ctx.fillRect(x0 - 30, y - 3, w + 36, 9); txt('RADAR', x0 - 28, y - 2, '#a8b0d8');
    hR(x0, y + 1, w, 1, '#5a5a80');
    for (const sp of this.lv.spawns) {
      if (sp.t === 'M' && !((game.medals[this.li] | this.medalsGot) & (1 << sp.id))) hR(X(sp.x * TS) - 1, y - 1, 3, 4, '#ffd040');
      if (sp.t === 'x' && !(((game.bars[this.li] | 0) | this.barsGot) & (1 << sp.id))) hR(X(sp.x * TS) - 1, y - 1, 3, 4, '#40e090');
    }
    for (let ty = 0; ty < 14; ty++) for (let tx = 0; tx < this.lv.w; tx++) if (this.lv.grid[ty][tx] === '`') hR(X(tx * TS) - 1, y, 3, 3, '#c08040');
    if (this.lv.goal) { hR(X(this.lv.goal.x * TS), y - 3, 1, 7, '#fff'); hR(X(this.lv.goal.x * TS) + 1, y - 3, 3, 2, '#ff4060'); }
    hR(X(this.p.x) - 1, y - 2, 2, 6, '#ffffff');
  };
}

// ---------------- Hard Remix ----------------
const REMIX_LV = [0, 1, 2, 3, 4, 5, 6, 7];
const RemixSave = (li) => { const d = lsJ('wallyman-remix', {}); d[li] = true; lsS('wallyman-remix', d); };
const remixOpen = (li) => Save.slots.some((s) => s && s.cleared && s.cleared[li]) || !!lsJ('wallyman-remix-all', false);
function RemixScene(start = 0, msg = '') {
  let sel = start, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(6)); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % REMIX_LV.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + REMIX_LV.length - 1) % REMIX_LV.length; Audio8.sfx('select'); }
      if (Input.confirm()) {
        const li = REMIX_LV[sel], keep = sel;
        if (!remixOpen(li)) { Audio8.sfx('bump'); msg = 'BEAT THIS LEVEL FIRST!'; return; }
        Audio8.sfx('confirm'); game = challengeGame();
        go(() => { const s = new Play(li, false); s.mode = { kind: 'remix', sel: keep }; return s; });
      }
    },
    draw() {
      drawParallax('volcano', t * 0.4); drawWindow(24, 16, 208, 192);
      txt('HARD REMIX', 128, 22, '#ff6060', { align: 'center', scale: 2, outline: '#3a0010' });
      txt('MEANER FOES, LESS TIME, NEW LOOKS', 128, 42, '#fff', { align: 'center' });
      const done = lsJ('wallyman-remix', {});
      REMIX_LV.forEach((li, i) => { const y = 60 + i * 14, on = i === sel, open = remixOpen(li); txt(open ? `${levelTag(li)}. ${LEVELS[li].name}` : `${levelTag(li)}. ?????`, 46, y, on ? '#ffe040' : open ? '#fff' : '#7880b0'); if (done[li]) txt('#', 214, y, '#ffe040'); if (on) txt('>', 36 + ((t >> 3) & 1), y, '#ffe040'); });
      if (msg) txt(msg, 128, 182, '#5ff0ff', { align: 'center' });
      txt('A: PLAY   B: BACK', 128, 196, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- Survival Arena ----------------
function ArenaIntro() {
  let t = 0; const best = lsJ('wallyman-arena', { wave: 0, kills: 0 });
  return {
    enter() { Audio8.play('arena'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(5)); return; }
      if (t > 20 && Input.confirm()) { Audio8.sfx('confirm'); game = challengeGame(); go(() => { const s = new Play(94, false); s.mode = { kind: 'arena' }; return s; }); }
    },
    draw() {
      drawParallax('castle', t * 0.5); drawWindow(28, 40, 200, 140);
      txt('SURVIVAL ARENA', 128, 50, '#ff8080', { align: 'center', scale: 2, outline: '#3a0010' });
      ['ONE ROOM. ENDLESS WAVES.', 'EVERY WAVE BRINGS MORE FOES.', 'DRINKS DROP EVERY 3 WAVES.', '', 'HOW LONG CAN YOU LAST?'].forEach((l, i) => txt(l, 128, 76 + i * 12, '#fff', { align: 'center' }));
      txt(`BEST: WAVE ${best.wave}   ${best.kills} FOES`, 128, 146, '#ffe040', { align: 'center' });
      if ((t >> 4) & 1) txt('PRESS START', 128, 162, '#5ff0ff', { align: 'center' });
    },
  };
}
function ArenaResult(wave, kills) {
  let t = 0; const best = lsJ('wallyman-arena', { wave: 0, kills: 0 }), rec = wave > best.wave;
  if (rec) lsS('wallyman-arena', { wave, kills });
  return {
    enter() { Audio8.play(rec ? 'victory' : 'gameover'); },
    update() { t++; if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => ArenaIntro()); },
    draw() {
      drawParallax('castle', t * 0.2); drawWindow(40, 60, 176, 100);
      txt('ARENA OVER', 128, 70, '#ff8080', { align: 'center', scale: 2 });
      txt(`YOU REACHED WAVE ${wave}`, 128, 96, '#fff', { align: 'center' }); txt(`FOES BEATEN: ${kills}`, 128, 110, '#fff', { align: 'center' });
      if (rec) txt('NEW RECORD!', 128, 126, (t >> 3) & 1 ? '#ffe040' : '#ff8040', { align: 'center' });
      if (t > 60 && (t >> 4) & 1) txt('PRESS START', 128, 144, '#5ff0ff', { align: 'center' });
    },
  };
}

// ---------------- Doug Thomson's story ----------------
const STORY = [
  { li: 48, title: "CHAPTER 1: DOUG'S DASH", before: [['doug', "MEET DOUG THOMSON: THE FASTEST COURIER ON WALLY ISLAND."], ['doug', 'TODAY HE MUST DELIVER THE GOLDEN SIGNAL CHIP TO WALLY TOWER.'], ['volt', "NOT SO FAST! I'M VOLT, AND THAT CHIP IS MINE. RACE YOU FOR IT!"]],
    after: [['doug', 'DOUG BEATS VOLT TO THE FLAG... BUT THE CHIP IS GONE!'], ['volt', 'HA! I SWAPPED IT WHILE YOU WERE RUNNING. CATCH ME IN MY VAULT!']] },
  { li: 49, title: "CHAPTER 2: VOLT'S VAULT", before: [['doug', "VOLT'S VAULT IS FULL OF CRUSHERS, BELTS AND WIND-UP MICE."], ['doug', 'TIME TO SPRINT THROUGH AND GET THAT CHIP BACK!']],
    after: [['doug', 'THE VAULT IS EMPTY! A NOTE SAYS: "MEET ME IN NEON CITY."'], ['volt', 'ONE LAST RACE, DOUG. WINNER KEEPS THE CHIP!']] },
  { li: 50, title: 'CHAPTER 3: FINAL SPRINT', before: [['doug', 'THE FINAL SPRINT. VOLT IS WAITING AT THE END OF THE STREET.'], ['doug', 'HE IS FAST, BUT HE ALWAYS RUNS OUT OF PUFF. STOMP HIM THEN!']],
    after: [['volt', "OK, OK, YOU WIN! I'M SORRY... I JUST WANTED SOMEONE TO RACE."], ['doug', 'DOUG DELIVERS THE CHIP AND WALLY TOWER GETS FULL SIGNAL.'], ['doug', 'NOW DOUG AND VOLT RACE EVERY SUNDAY, JUST FOR FUN. THE END!']] },
];
const storyDone = () => lsJ('wallyman-story', 0) | 0;
function StoryPages(pages, next) {
  let i = 0, t = 0;
  return {
    enter() { Audio8.play('doug'); },
    update() { t++; if (t > 20 && (Input.confirm() || Input.pressed('run'))) { Audio8.sfx('select'); t = 0; if (++i >= pages.length) go(next); } if (Input.pressed('back')) go(next); },
    draw() {
      const [who, text] = pages[Math.min(i, pages.length - 1)];
      drawParallax(who === 'volt' ? 'neon' : 'grass', frame * 0.4);
      drawWindow(20, 30, 216, 96); ctx.fillStyle = who === 'volt' ? '#1a2a5a' : '#3a2a1a'; ctx.fillRect(28, 38, 72, 80);
      if (who === 'doug' && Sprites.dougPortrait.complete && Sprites.dougPortrait.naturalWidth) { const im = Sprites.dougPortrait, s = Math.min(70 / im.naturalWidth, 78 / im.naturalHeight); ctx.drawImage(im, 64 - (im.naturalWidth * s) / 2, 118 - im.naturalHeight * s, im.naturalWidth * s, im.naturalHeight * s); } else if (who === 'doug') drawWally(64, 112, 'idle' + ((frame >> 4) % 4), 1, { hero: 'doug' }); else { ctx.save(); ctx.translate(64, 70); ctx.scale(2.4, 2.4); drawVolt(0, 18, 1, frame, 'idle'); ctx.restore(); }
      txt(who === 'volt' ? 'VOLT' : 'DOUG THOMSON', 168, 40, who === 'volt' ? '#5aa0ff' : '#ffd040', { align: 'center' });
      wrapText(text, 18).forEach((l, k) => txt(l.slice(0, Math.floor(t * 1.5) - k * 18), 108, 56 + k * 11, '#fff'));
      txt(`${i + 1}/${pages.length}  A: NEXT`, 128, 134, '#a8b0d8', { align: 'center', outline: '#101848' });
    },
  };
}
function startStory(ch) { // returns the level scene (call it from inside go)
  game = challengeGame(); const prev = game.hero; game.hero = 'doug';
  const s = new Play(STORY[ch].li, false); s.mode = { kind: 'story', ch, hero: prev }; return s;
}
function StoryMenu(start = 0) {
  let sel = Math.min(start, 2), t = 0;
  return {
    enter() { Audio8.play('doug'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(7)); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % 3; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + 2) % 3; Audio8.sfx('select'); }
      if (Input.confirm()) { if (sel > storyDone()) { Audio8.sfx('bump'); return; } Audio8.sfx('confirm'); const ch = sel; go(() => StoryPages(STORY[ch].before, () => startStory(ch))); }
    },
    draw() {
      drawParallax('grass', t * 0.4); drawWindow(24, 24, 208, 176);
      txt("DOUG'S STORY", 128, 32, '#ffd040', { align: 'center', scale: 2, outline: '#3a2010' });
      if (Sprites.dougPortrait.complete && Sprites.dougPortrait.naturalWidth) { const im = Sprites.dougPortrait, s = 56 / im.naturalHeight; ctx.drawImage(im, 196 - (im.naturalWidth * s) / 2, 196 - 56, im.naturalWidth * s, 56); }
      STORY.forEach((c, i) => { const y = 66 + i * 22, on = i === sel, open = i <= storyDone(); txt(open ? c.title : `CHAPTER ${i + 1}: ?????`, 44, y, on ? '#ffe040' : open ? '#fff' : '#7880b0'); if (storyDone() > i) txt('#', 214, y, '#ffe040'); if (on) txt('>', 34 + ((t >> 3) & 1), y, '#ffe040'); });
      txt('PLAY AS DOUG THOMSON IN 3', 44, 140, '#a8b0d8'); txt('BRAND NEW LEVELS!', 44, 151, '#a8b0d8');
      txt('A: PLAY   B: BACK', 44, 180, '#fff');
    },
  };
}
function StoryWin(ch) {
  lsS('wallyman-story', Math.max(storyDone(), ch + 1));
  if (ch === 2) Ach.unlock('dougstory');
  return StoryPages(STORY[ch].after, () => (ch === 2 ? CreditsScene(() => StoryMenu(2)) : StoryMenu(ch + 1)));
}
