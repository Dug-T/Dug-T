'use strict';
// =====================================================================
// Update 1.3 (part 1): Haunted Hollow, Bug's-Eye Garden and Baron's
// Revenge (with a new ending), Iron Hero mode, the Mega Boss Rush, the
// newest pieces in the Level Maker, and the Weather Machine.
// Level numbers 93-99 belong to the special modes, so the new levels
// start at 100 (the reserved slots are placeholders nobody can visit).
// =====================================================================
ACH_LIST.push(['organist', 'ENCORE!', 'BEAT THE PHANTOM ORGANIST'], ['wasp', 'BUZZ OFF', 'BEAT QUEEN WASP'], ['legend', 'LEGEND OF WALLY', 'BEAT BARON STATIC\'S MEGA-MECH'],
  ['ironhero', 'MADE OF IRON', 'BEAT AN ISLAND IN IRON HERO MODE'], ['megarush', 'BOSS OF BOSSES', 'FINISH THE MEGA BOSS RUSH'], ['makerpro', 'MASTER BUILDER', 'PLAY A COURSE WITH THE NEWEST MAKER PIECES']);
Object.assign(BOSS_TALK, {
  organist: [['boss', 'WELCOME TO MY LITTLE CONCERT... YOU ARE THE FINAL NOTE!'], ['hero', 'SORRY, I ONLY PLAY HEAVY STOMPING.']],
  wasp: [['boss', 'BZZZ! A GIANT IN MY GARDEN? OH WAIT. YOU ARE TINY NOW. BZZ HA!'], ['hero', 'SMALL HERO, BIG STOMP!']],
  baronmech: [['boss', 'YOU BEAT EVERY ONE OF MY FRIENDS. NOW MEET ALL OF THEM AT ONCE!'], ['hero', 'BARON, YOU NEVER LEARN. LET\'S DO THIS!']],
});
Object.assign(BOSS_ART, { organist: 'organist', wasp: 'wasp', baronmech: 'baronmech' }); Object.assign(BOSS_NAMES, { organist: 'PHANTOM ORGANIST', wasp: 'QUEEN WASP', baronmech: 'BARON MEGA-MECH' });
BEASTS.push(['organist', 'PHANTOM ORGANIST', 'b'], ['wasp', 'QUEEN WASP', 'b'], ['baronmech', 'BARON MEGA-MECH', 'b'], ['furn', 'HAUNTED CHAIR', 'e'], ['ant', 'GARDEN ANT', 'e']);
Object.assign(BEAST_INFO, { organist: 'HIS MUSIC TURNS INTO NOTES THAT HURT. STOMP HIM WHEN HE RESTS AT THE BENCH.', wasp: 'DIVES AT YOU. WHEN HER STINGER STICKS IN THE GROUND, STOMP HER.', baronmech: 'BARON STATIC IN A MECH FULL OF BOSS ATTACKS. STOMP THE OPEN COCKPIT.', furn: 'LOOKS LIKE A CHAIR UNTIL YOU GET CLOSE.', ant: 'MARCHES OUT OF ANT HILLS. EASY TO STOMP, HARD TO STOP.' });
SOLID.add('Ѫ');

// ---------------- art ----------------
function drawFurn(kind, x, y, awake, t) {
  const b = awake ? Math.abs(Math.sin(t * 0.2)) * 2 : 0;
  if (kind === 'chair') { hR(x + 1, y + 2 - b, 3, 12, '#1a1020'); hR(x + 2, y + 3 - b, 1, 10, '#8a4a2a'); hR(x + 1, y + 9 - b, 13, 3, '#1a1020'); hR(x + 2, y + 10 - b, 11, 1, '#a05a30'); hR(x + 2, y + 12, 2, 4, '#5a2a10'); hR(x + 11, y + 12, 2, 4, '#5a2a10'); }
  else if (kind === 'clock') { hR(x + 1, y - b, 12, 26, '#1a1020'); hR(x + 2, y + 1 - b, 10, 24, '#6a3a1a'); ctx.fillStyle = '#f4ecd0'; ctx.beginPath(); ctx.arc(x + 7, y + 6 - b, 4, 0, Math.PI * 2); ctx.fill(); hR(x + 6, y + 14 - b, 2, 8, '#d0a040'); }
  else { hR(x, y - b, 16, 28, '#1a1020'); hR(x + 1, y + 1 - b, 14, 26, '#5a3a20'); hR(x + 7, y + 3 - b, 2, 22, '#1a1020'); hR(x + 5, y + 13 - b, 1, 2, '#d0a040'); hR(x + 10, y + 13 - b, 1, 2, '#d0a040'); }
  if (awake) { const ey = kind === 'chair' ? y + 3 : y + 8; hR(x + 4, ey - b, 2, 2, '#ff3040'); hR(x + 9, ey - b, 2, 2, '#ff3040'); }
}
function drawOrganist(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const rest = e && e.state === 'rest', fl = rest ? 0 : Math.sin(t * 0.08) * 3;
  ctx.fillStyle = 'rgba(200,220,255,0.75)'; ctx.beginPath(); ctx.moveTo(x + 4, y + 16 + fl); ctx.lineTo(x + 26, y + 16 + fl); ctx.lineTo(x + 30, y + 40); for (let k = 0; k < 4; k++) ctx.lineTo(x + 26 - k * 7, y + 36 + (k % 2) * 4); ctx.closePath(); ctx.fill();
  hR(x + 6, y + 16 + fl, 18, 12, '#2a1a4a'); hR(x + 13, y + 16 + fl, 4, 10, '#ffffff');
  ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x + 15, y + 9 + fl, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.arc(x + 15, y + 9 + fl, 7, 0, Math.PI * 2); ctx.fill();
  if (rest) { hR(x + 10, y + 8, 4, 1, '#1a1020'); hR(x + 17, y + 8, 4, 1, '#1a1020'); if ((t >> 4) & 1) txt('Z', x + 24, y - 6, '#a8b0d8', { outline: '#1a1020' }); } else { hR(x + 10, y + 7 + fl, 3, 3, '#5ff0ff'); hR(x + 18, y + 7 + fl, 3, 3, '#5ff0ff'); }
  hR(x + 11, y + 13 + fl, 8, 1, '#1a1020'); hR(x + 9, y - 2 + fl, 12, 3, '#1a1020'); hR(x + 11, y - 6 + fl, 8, 5, '#1a1020');
}
function drawWasp(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const stuck = e && e.state === 'stuck', w = (t >> 1) & 1;
  ctx.fillStyle = 'rgba(220,240,255,0.7)'; ctx.beginPath(); ctx.ellipse(x + 12, y + 2 - w * 2, 9, 5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 22, y + 2 - w * 2, 9, 5, 0.4, 0, Math.PI * 2); ctx.fill();
  hR(x + 4, y + 6, 28, 14, '#1a1020'); for (let k = 0; k < 4; k++) hR(x + 5 + k * 7, y + 7, 6, 12, k % 2 ? '#1a1020' : '#ffd020'); hR(x + 30, y + 10, 6, 4, '#1a1020');
  hR(x - 6, y + 4, 12, 12, '#1a1020'); hR(x - 5, y + 5, 10, 10, '#ffd020'); hR(x - 4, y + 7, 3, 3, stuck ? '#1a1020' : '#ff3040'); hR(x + 1, y + 7, 3, 3, stuck ? '#1a1020' : '#ff3040');
  hR(x - 3, y, 8, 3, '#1a1020'); hR(x - 2, y - 2, 2, 2, '#ffd040'); hR(x + 2, y - 3, 2, 3, '#ffd040');
  if (stuck && (t >> 4) & 1) txt('STUCK!', x - 4, y - 16, '#ffe040', { outline: '#1a1020' });
}
function drawBaronMech(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const open = e && e.state === 'hatch', l = e && Math.abs(e.vx || 0) > 0.2 ? (t >> 3) & 1 : 0;
  hR(x + 6 + l * 3, y + 44, 14, 16, '#1a1020'); hR(x + 36 - l * 3, y + 44, 14, 16, '#1a1020'); hR(x + 7 + l * 3, y + 45, 12, 14, '#5a3a8a'); hR(x + 37 - l * 3, y + 45, 12, 14, '#5a3a8a');
  hR(x, y + 16, 56, 30, '#1a1020'); hR(x + 1, y + 17, 54, 28, '#7a4ab0'); hR(x + 1, y + 17, 54, 4, '#a070e0'); hR(x + 8, y + 26, 12, 12, '#3a2a58'); hR(x + 36, y + 26, 12, 12, '#3a2a58'); drawGearShape(x + 14, y + 32, 5, t * 0.1, '#d0a040', '#1a1020'); drawGearShape(x + 42, y + 32, 5, -t * 0.1, '#d0a040', '#1a1020');
  hR(x - 8, y + 20, 10, 20, '#1a1020'); hR(x + 54, y + 20, 10, 20, '#1a1020'); hR(x - 7, y + 21, 8, 18, '#5a3a8a'); hR(x + 55, y + 21, 8, 18, '#5a3a8a'); hR(x - 6, y + 36, 6, 6, '#ff3040'); hR(x + 56, y + 36, 6, 6, '#ff3040');
  hR(x + 14, y, 28, 18, '#1a1020'); hR(x + 15, y + 1, 26, 16, open ? '#ffe040' : '#5ff0ff');
  // Baron Static in the cockpit
  hR(x + 22, y + 4, 12, 10, '#1a1020'); hR(x + 23, y + 5, 10, 8, '#e8c8a8'); hR(x + 23, y + 5, 10, 3, '#3a2a58'); hR(x + 24, y + 9, 3, 2, '#1a1020'); hR(x + 29, y + 9, 3, 2, '#1a1020'); hR(x + 25, y + 12, 6, 1, '#a02040');
  if (open) txt('!', x + 26, y - 14, '#ffe040', { outline: '#1a1020' }); else { hR(x + 27, y - 6, 2, 6, '#c0c8d8'); hR(x + 26, y - 8, 4, 3, (t >> 3) & 1 ? '#ff3040' : '#ffe040'); }
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    const sc = (f, s, dx, dy) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); f(dx, dy); ctx.restore(); };
    if (id === 'organist') return sc((dx, dy) => drawOrganist(dx, dy, null, t), 0.7, -15, -18);
    if (id === 'wasp') return sc((dx, dy) => drawWasp(dx, dy, null, t), 0.6, -14, -10);
    if (id === 'baronmech') return sc((dx, dy) => drawBaronMech(dx, dy, null, t), 0.4, -28, -30);
    if (id === 'furn') return drawFurn('chair', x - 7, y - 8, true, t);
    if (id === 'ant') { hR(x - 6, y - 2, 12, 5, '#1a1020'); hR(x - 5, y - 1, 3, 3, '#6a2a10'); hR(x - 1, y - 1, 3, 3, '#6a2a10'); hR(x + 3, y - 2, 3, 4, '#6a2a10'); return; }
    return _sa(id, x, y, t);
  };
}

// ---------------- the levels ----------------
while (LEVELS.length < 100) LEVELS.push({ name: 'RESERVED', reserved: true, story: true, secretRoom: true, noAuto: true, theme: 'grass', music: 'grass', width: 40, tag: '-', world: '-', build(b) { b.ground(0, 39).set(2, 11, '@').set(36, 11, 'G'); } });
LEVELS.push(
  { // 100
    name: 'CREAKY CORRIDOR', theme: 'haunted', music: 'haunted', width: 170, tag: 'HH1', world: 'HAUNTED HOLLOW 1',
    furn: [[30, 'chair'], [58, 'clock'], [92, 'chair'], [128, 'wardrobe'], [150, 'chair']], mirrors: [[44, 9, 46, 6, 52, 7]],
    build(b) {
      b.fill(0, 0, 169, 1, 'X').ground(0, 169).set(2, 11, '@').coins(8, 9, 4).set(20, 11, 'g');
      b.fill(46, 6, 52, 7, 'Ѫ').coins(47, 4, 5).set(70, 11, 'C').row(76, 8, 'BWB').set(104, 11, 'e').coins(110, 9, 5).set(140, 11, 'p').set(162, 11, 'G');
    },
  },
  { // 101
    name: 'PORTRAIT GALLERY', theme: 'haunted', music: 'haunted', width: 170, tag: 'HH2', world: 'HAUNTED HOLLOW 2',
    furn: [[24, 'chair'], [64, 'wardrobe'], [100, 'clock'], [136, 'chair']], mirrors: [[80, 9, 84, 9, 90, 11]],
    build(b) {
      b.fill(0, 0, 169, 1, 'X').ground(0, 169).set(2, 11, '@').coins(8, 9, 4).set(40, 6, 'e').fill(48, 8, 54, 8, 'X').coins(48, 6, 7);
      b.fill(84, 9, 90, 11, 'Ѫ').coins(85, 10, 6).set(96, 11, 'C').set(116, 6, 'e').gap(120, 122).set(146, 11, 'g').set(162, 11, 'G');
    },
  },
  { // 102
    name: 'MIDNIGHT LIBRARY', theme: 'haunted', music: 'haunted', width: 160, dark: true, tag: 'HH3', world: 'HAUNTED HOLLOW 3',
    furn: [[30, 'wardrobe'], [70, 'chair'], [110, 'wardrobe']],
    build(b) {
      b.fill(0, 0, 159, 1, 'X').ground(0, 159).set(2, 11, '@').coins(8, 9, 4);
      for (let x = 16; x < 150; x += 20) b.fill(x, 7, x + 4, 7, '=');
      b.set(50, 11, 'e').set(80, 11, 'C').set(90, 6, 'e').set(130, 11, 'g').set(152, 11, 'G');
    },
  },
  { // 103
    name: 'MIRROR MAZE', theme: 'haunted', music: 'haunted', width: 160, tag: 'HH4', world: 'HAUNTED HOLLOW 4',
    mirrors: [[20, 9, 30, 2, 31, 11], [60, 9, 70, 2, 71, 11], [100, 9, 110, 2, 111, 11]], furn: [[44, 'chair'], [86, 'clock'], [126, 'chair']],
    build(b) {
      b.fill(0, 0, 159, 1, 'X').ground(0, 159).set(2, 11, '@').coins(8, 9, 4);
      b.fill(30, 2, 31, 11, 'Ѫ').fill(70, 2, 71, 11, 'Ѫ').fill(110, 2, 111, 11, 'Ѫ');
      b.coins(40, 9, 4).set(54, 11, 'C').coins(80, 9, 4).set(94, 6, 'e').coins(120, 9, 4).set(140, 11, 'g').set(152, 11, 'G');
    },
  },
  { // 104
    name: 'BALLROOM OF BONES', theme: 'haunted', music: 'castle', width: 170, tag: 'HH5', world: 'HAUNTED HOLLOW 5',
    furn: [[30, 'chair'], [42, 'chair'], [76, 'clock'], [108, 'wardrobe'], [120, 'chair'], [150, 'chair']], pendulums: [[60, 8, 0], [94, 8, 50]],
    build(b) {
      b.fill(0, 0, 169, 1, 'X').ground(0, 169).set(2, 11, '@').coins(8, 9, 4).set(54, 6, 'e').set(70, 11, 'C').row(84, 8, 'WPW');
      b.gap(100, 102).set(132, 6, 'e').coins(136, 9, 5).set(162, 11, 'G');
    },
  },
  { // 105
    name: "THE PHANTOM'S ORGAN", theme: 'haunted', music: 'haunted', width: 80, boss: true, bossHp: 8, bossName: 'PHANTOM ORGANIST', bossType: 'organist', talk: 'organist', tag: 'HH6', world: 'HAUNTED HOLLOW 6',
    bossMsg: ['THE PHANTOM ORGANIST TAKES', 'A BOW AND FADES AWAY...', '', 'THE MANSION FALLS QUIET.', 'BUT IN THE GARDEN, SOMETHING', 'IS BUZZING VERY LOUDLY...'],
    build(b) { b.fill(0, 0, 79, 1, 'X').ground(0, 79).set(2, 11, '@').coins(8, 10, 4).set(18, 11, 'g').row(26, 8, 'WPW').set(36, 11, 'C').set(46, 6, 'e').set(74, 11, '*'); },
  },
  { // 106
    name: 'BLADE OF GRASS ALLEY', theme: 'grass', music: 'grass', width: 170, bug: true, tag: 'BG1', world: "BUG'S-EYE GARDEN 1",
    antHills: [[40, -1], [110, -1]], dews: [[22, 10], [70, 10], [96, 8], [140, 10]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').coins(8, 9, 4).ground(34, 80).fill(60, 9, 61, 11, 'X').coins(68, 6, 4).set(76, 11, 'C');
      b.ground(84, 130).fill(94, 9, 98, 9, '=').coins(94, 7, 5).ground(134, 169).coins(144, 5, 4).set(162, 11, 'G');
    },
  },
  { // 107
    name: 'LADYBIRD SKIES', theme: 'sky', music: 'sky', width: 180, bug: true, tag: 'BG2', world: "BUG'S-EYE GARDEN 2",
    ladybirds: [[24, 40, 9, 0.02], [60, 82, 8, 0.024], [100, 124, 9, 0.02], [140, 160, 8, 0.026]],
    build(b) {
      b.ground(0, 22).set(2, 11, '@').coins(8, 9, 4);
      b.ground(44, 58).set(50, 11, 'g').set(54, 11, 'C').ground(86, 98).coins(88, 9, 4).ground(128, 138).set(132, 11, 'p').ground(164, 179).set(172, 11, 'G');
    },
  },
  { // 108
    name: 'ANTHILL TUNNELS', theme: 'cave', music: 'cave', width: 170, bug: true, tag: 'BG3', world: "BUG'S-EYE GARDEN 3",
    antHills: [[30, 1], [76, -1], [120, -1], [150, -1]],
    build(b) {
      b.fill(0, 0, 169, 2, 'X').ground(0, 169).set(2, 11, '@').coins(8, 9, 4);
      b.fill(50, 3, 54, 8, 'X').fill(96, 6, 100, 11, 'X').fill(94, 9, 95, 9, '=').fill(138, 3, 140, 8, 'X').coins(60, 9, 5).set(84, 11, 'C').coins(108, 9, 5).set(162, 11, 'G');
    },
  },
  { // 109
    name: 'TOMATO TOWERS', theme: 'grass', music: 'grass', width: 170, bug: true, tag: 'BG4', world: "BUG'S-EYE GARDEN 4",
    dews: [[30, 10], [56, 10], [86, 10], [116, 10], [146, 10]], antHills: [[100, -1]],
    build(b) {
      b.ground(0, 169).set(2, 11, '@').coins(8, 9, 4);
      for (const x of [34, 60, 90, 120, 150]) { b.fill(x, 5, x + 1, 11, 'X'); b.fill(x - 2, 5, x + 3, 5, '='); b.coins(x - 1, 3, 4); }
      b.set(74, 11, 'C').set(104, 11, 'g').set(162, 11, 'G');
    },
  },
  { // 110
    name: 'PUDDLE CROSSING', theme: 'beach', music: 'beach', width: 180, bug: true, tag: 'BG5', world: "BUG'S-EYE GARDEN 5",
    ladybirds: [[40, 60, 9, 0.022], [100, 126, 8, 0.024]], antHills: [[80, -1], [150, -1]], dews: [[34, 10], [140, 10]],
    build(b) {
      b.ground(0, 38).set(2, 11, '@').coins(8, 9, 4).fill(39, 12, 61, 13, '~').ground(62, 98).set(70, 11, 'C').coins(84, 9, 5);
      b.fill(99, 12, 127, 13, '~').ground(128, 179).set(160, 11, 'p').set(172, 11, 'G');
    },
  },
  { // 111
    name: "QUEEN WASP'S NEST", theme: 'grass', music: 'grass', width: 80, bug: true, boss: true, bossHp: 8, bossName: 'QUEEN WASP', bossType: 'wasp', talk: 'wasp', tag: 'BG6', world: "BUG'S-EYE GARDEN 6",
    bossMsg: ['QUEEN WASP BUZZES OFF IN A', 'HUFF, AND YOU GROW BACK TO', 'YOUR NORMAL SIZE!', '', 'THEN A FAMILIAR CACKLE ECHOES', 'ACROSS THE SEA... BARON?!'],
    build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 10, 4).set(18, 11, 'g').row(26, 8, 'WPW').set(36, 11, 'C').set(74, 11, '*'); },
  },
  { // 112
    name: 'STATIC STORM', theme: 'snow', music: 'static', width: 180, storm: true, tag: 'BR1', world: "BARON'S REVENGE 1",
    rods: [[34, 9, 37, 46, 9, 0], [96, 9, 99, 110, 8, 120]], zones: [[64, 69, 2, 13, 0, -0.62]], guards: [[130, 150]],
    build(b) {
      b.ground(0, 36).set(2, 11, '@').coins(8, 9, 4).fill(34, 10, 34, 11, 'X').set(20, 11, 'g');
      b.ground(47, 63).set(54, 11, 'C').fill(70, 4, 82, 5, '#').coins(72, 2, 4).ground(83, 98).fill(96, 10, 96, 11, 'X');
      b.ground(111, 179).set(120, 11, 'C').set(160, 11, 'p').set(172, 11, 'G');
    },
  },
  { // 113
    name: 'GEARWORKS GAUNTLET', theme: 'factory', music: 'static', width: 180, tag: 'BR2', world: "BARON'S REVENGE 2",
    gears: [[40, 7, 3, 3, 0.014]], pendulums: [[80, 9, 0], [96, 9, 60]], rewinds: [[118, 11, 122, 138, 12, 300]],
    build(b) {
      b.fill(0, 0, 179, 0, 'X').ground(0, 32).set(2, 11, '@').coins(8, 9, 4).ground(49, 121).set(60, 11, 'C').set(108, 11, 'h').ground(139, 179).set(150, 11, 'C').set(172, 11, 'G');
    },
  },
  { // 114
    name: 'THE LAST HALL', theme: 'castle', music: 'castle', width: 170, tag: 'BR3', world: "BARON'S REVENGE 3",
    furn: [[30, 'chair'], [96, 'wardrobe']], mirrors: [[60, 9, 70, 2, 71, 11]], antHills: [[130, -1]], dews: [[110, 10]],
    build(b) {
      b.fill(0, 0, 169, 1, 'X').ground(0, 169).set(2, 11, '@').coins(8, 9, 4).fill(70, 2, 71, 11, 'Ѫ').set(50, 11, 'C').set(84, 11, 'g').row(114, 6, 'WPW').set(146, 11, 'C').set(162, 11, 'G');
    },
  },
  { // 115
    name: "BARON'S MEGA-MECH", theme: 'castle', music: 'castle', width: 80, boss: true, bossHp: 12, bossName: 'BARON MEGA-MECH', bossType: 'baronmech', talk: 'baronmech', revenge: true, tag: 'BR4', world: "BARON'S REVENGE 4",
    bossMsg: ['THE MEGA-MECH FALLS APART', 'GEAR BY GEAR!', '', 'BARON STATIC CRAWLS OUT,', 'DUSTS OFF HIS CAPE, AND...', 'SAYS SORRY. REALLY!'],
    build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 10, 4).set(18, 11, 'g').row(26, 8, 'WPW').set(36, 11, 'C').set(46, 11, 'h').set(74, 11, '*'); },
  },
);
const HAUNT_BASE = 100, BUG_BASE = 106, REVENGE_BASE = 112;
REMATCH.push(105, 111, 115);
DIARY.push([105, 'HAUNTED HOLLOW', ['DEAR DIARY, A CHAIR CHASED', 'ME. A CHAIR! I SAT ON IT', 'TO STOP IT. IT DID NOT', 'LIKE THAT. NOW I STAND', 'EVERYWHERE. JUST IN CASE.']],
  [111, "BUG'S-EYE GARDEN", ['DEAR DIARY, I WAS THE SIZE', 'OF A PEA. AN ANT CARRIED', 'MY HAT AWAY. I GOT IT', 'BACK. THE ANT GOT A MEDAL.', 'WE ARE FRIENDS NOW.']],
  [115, "BARON'S REVENGE", ['DEAR DIARY, BARON SAID', 'SORRY! I SAID SORRY FOR', 'STOMPING HIM 200 TIMES.', 'WE HAD TEA. HE BROUGHT', 'HIS OWN STATIC. OH WELL.']]);

// ---------------- the update loop ----------------
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initN) this.initN();
    if (!this.paused && !this.talk && !this.photo) for (const pl of this.platforms) { // ladybirds fly back and forth
      if (!pl.bug) continue; const g = pl.bug; if (!(this.timeStopT > 0)) g.a += g.spd;
      pl.ox = g.x0 + (g.x1 - g.x0) * (0.5 + 0.5 * Math.sin(g.a)) ; pl.oy = g.y + Math.sin(g.a * 2) * 6;
    }
    _upd.call(this);
    if (this.paused || this.talk || this.photo || this.state !== 'play') return;
    const p = this.p, hF = this.hF || 0;
    // mirrors: stand in front of one to see (and open) the secret wall it shows
    for (const m of this.def.mirrors || []) {
      const [mx, my, x0, y0, x1, y1] = m, at = overlap(p, { x: mx * TS, y: (my - 1) * TS, w: 16, h: 32 });
      if (at && !m.open) { m.open = 360; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.tile(x, y) === 'Ѫ') this.setTile(x, y, '.'); Audio8.sfx('secret'); this.parts.push({ k: 'text', s: 'THE MIRROR SHOWS A WAY!', x: mx * TS - 50, y: my * TS - 30, vy: -0.3, life: 80 }); }
      if (m.open > 0 && !(this.timeStopT > 0)) { m.open--; const inside = p.x + p.w > x0 * TS && p.x < (x1 + 1) * TS && p.y + p.h > y0 * TS && p.y < (y1 + 1) * TS; if (m.open === 0 && inside) m.open = 30; else if (m.open === 0) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.tile(x, y) === '.') this.setTile(x, y, 'Ѫ'); Audio8.sfx('bump'); } }
    }
    // ant hills send out marching ants
    for (const [ax, dir] of this.def.antHills || []) {
      if (Math.abs(ax * TS - p.x) > 300 || (hF + ax * 7) % 110 !== 0) continue;
      if (this.ents.filter((e) => e.type === 'ant' && e.alive && !e.dying).length >= 10) continue;
      const gy = groundRow(this, ax); if (gy > 0) this.ents.push({ type: 'ant', enemy: true, alive: true, t: 0, x: ax * TS + 3, y: gy * TS - 8, w: 10, h: 8, vx: dir * 0.7 });
    }
  };
  Play.prototype.initN = function () {
    this._initN = true;
    for (const m of this.def.mirrors || []) m.open = 0;
    for (const [x, kind] of this.def.furn || []) { const gy = groundRow(this, x); if (gy < 0) continue; const h = kind === 'chair' ? 16 : kind === 'clock' ? 26 : 28; this.ents.push({ type: 'furn', kind, enemy: true, alive: true, t: 0, x: x * TS, y: gy * TS - h, w: kind === 'wardrobe' ? 16 : 14, h, hp: kind === 'wardrobe' ? 2 : 1, awake: 0, vx: 0, vy: 0 }); }
    for (const [x, y] of this.def.dews || []) this.ents.push({ type: 'dew', alive: true, t: 0, x: x * TS + 2, y: y * TS + 4, w: 12, h: 12 });
    for (const [x0, x1, y, spd] of this.def.ladybirds || []) { const pl = { x: x0 * TS, y: y * TS, w: 40, h: 8, ox: x0 * TS, oy: y * TS, axis: 'bug', t: 0, bug: { x0: x0 * TS, x1: (x1 - 2) * TS, y: y * TS, a: -Math.PI / 2, spd } }; this.platforms.push(pl); }
    // the Weather Machine picks the weather for outdoor levels
    if (game && game.wxPick && game.wxPick !== 'random' && this.wx === undefined && WX_THEMES.includes(this.def.theme) && !this.def.weather && Settings.get('weather') !== false && !this.mode && !this.ta && !this.def.skate) forceWeather(this, game.wxPick);
    if (this.def.forceWx && this.wx === undefined) forceWeather(this, this.def.forceWx);
    if (game && game.iron) { game.lives = 0; }
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.type === 'furn') {
      if (this._p2ctx) { if (this.state === 'play' && e.awake && overlap(p, e) && !e.dying) this.hurt(); return; }
      e.t++;
      if (e.dying) { e.vy += 0.3; e.y += e.vy; if (e.y > VH + 30) e.alive = false; return; }
      if (!e.awake) { if (Math.abs(p.x - e.x) < 72 && Math.abs(p.y - e.y) < 60) { e.awake = 1; Audio8.sfx('roar'); this.parts.push({ k: 'text', s: 'IT MOVED!', x: e.x - 10, y: e.y - 14, vy: -0.4, life: 40 }); } return; }
      if (!(this.freezeT > 0)) { e.awake++; if (e.awake > 30) { const d = p.x < e.x ? -1 : 1; e.x += d * (e.kind === 'chair' ? 1.1 : 0.7); if (e.awake % 40 === 0) e.y -= 6; const gy = groundRow(this, Math.floor((e.x + e.w / 2) / TS)); if (gy > 0) e.y = Math.min(gy * TS - e.h, e.y + 1.5); } }
      if (this.state !== 'play' || !overlap(p, e)) return;
      if (p.vy > 0 && p.y + p.h - e.y < 10) { p.vy = -5.5; e.hp--; Audio8.sfx('stomp'); if (e.hp <= 0) { e.dying = true; e.vy = -3; this.addScore(300, e.x, e.y - 8); this.countKill && this.countKill(e); Bestiary.add('furn'); } else { e.awake = 1; } return; }
      if (!(this.freezeT > 0) && e.awake > 30) this.hurt();
      return;
    }
    if (e.type === 'ant') {
      if (this._p2ctx) { if (this.state === 'play' && overlap(p, e) && !e.dying) this.hurt(); return; }
      e.t++;
      if (e.dying) { e.vy = (e.vy || -3) + 0.3; e.y += e.vy; if (e.y > VH + 30) e.alive = false; return; }
      if (!(this.freezeT > 0)) { e.x += e.vx; const gy = groundRow(this, Math.floor((e.x + 5) / TS)); if (gy < 0) { e.y += 3; if (e.y > VH) e.alive = false; } else e.y = gy * TS - 8; if (SOLID.has(this.tile(Math.floor((e.x + (e.vx > 0 ? 11 : -1)) / TS), Math.floor((e.y + 4) / TS)))) e.vx = -e.vx; }
      if (e.x < this.cam.x - 60) e.alive = false;
      if (this.state !== 'play' || !overlap(p, e)) return;
      if (p.vy > 0 && p.y + p.h - e.y < 8) { p.vy = -4.5; e.dying = true; e.vy = -3; Audio8.sfx('stomp'); this.addScore(50, e.x, e.y - 8); this.countKill && this.countKill(e); Bestiary.add('ant'); return; }
      if (!(this.freezeT > 0)) this.hurt();
      return;
    }
    if (e.type === 'dew') {
      e.t++; if (this.state !== 'play' || !overlap(p, e)) return;
      if (p.vy > 0 && p.y + p.h - e.y < 10) { p.vy = -8; p.onGround = false; e.squash = 10; Audio8.sfx('spring'); Audio8.sfx('splash'); }
      return;
    }
    if (e.type === 'note') {
      if (this._p2ctx) { if (this.state === 'play' && overlap(p, e)) this.hurt(); return; }
      e.t++; if (!(this.freezeT > 0)) { e.x += e.vx; e.y = e.oy + Math.sin(e.t * 0.08) * e.amp; }
      if (e.x < this.camMin - 20 || e.t > 400) e.alive = false;
      if (this.state === 'play' && overlap(p, e) && !(this.freezeT > 0)) { this.hurt(); e.alive = false; }
      return;
    }
    if (e.type === 'organist') return this.updateOrganist(e);
    if (e.type === 'wasp') return this.updateWasp(e);
    if (e.type === 'baronmech') return this.updateBaronMech(e);
    return _ue.call(this, e);
  };
  const lockBoss = (pl, e) => !pl.bossLock || pl.talk || pl._p2ctx;
  Play.prototype.updateOrganist = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    if (lockBoss(this, e)) { if (this._p2ctx && this.state === 'play' && overlap(p, e) && e.state !== 'rest') this.hurt(); return; }
    e.t++; const rage = e.maxHp - e.hp, slow = this.freezeT > 0;
    if (!slow && --e.act <= 0) { e.state = { play: 'swell', swell: 'rest', rest: 'play' }[e.state]; e.act = { play: 220 - rage * 12, swell: 60, rest: 130 - rage * 6 }[e.state]; if (e.state === 'swell') Audio8.sfx('roar'); }
    if (e.state === 'play' && !slow) {
      e.ty = 60 + Math.sin(e.t * 0.03) * 30; e.x += (this.camMin + VW - 70 + Math.sin(e.t * 0.02) * 30 - e.x) * 0.03;
      if (e.t % Math.max(30, 60 - rage * 4) === 0) { const n = rage >= 4 ? 3 : rage >= 2 ? 2 : 1; for (let k = 0; k < n; k++) this.ents.push({ type: 'note', alive: true, t: k * 10, x: e.x, y: e.y + 10, oy: e.y + 10 + (k - (n - 1) / 2) * 26, w: 8, h: 10, vx: -(1.3 + rage * 0.1), amp: 12 + k * 4 }); Audio8.sfx(['ping', 'coin', 'select'][e.t % 3]); }
    } else if (e.state === 'swell') { e.ty = 70; if (e.act === 30) { this.shake = 12; for (const d of [-1, 1]) this.ents.push({ type: 'wave', alive: true, t: 0, x: e.x + 10 + d * 20, y: 12 * TS - 14, w: 12, h: 14, vx: d * 2.2, life: 160 }); } }
    else e.ty = 12 * TS - 42;
    e.y += (e.ty - e.y) * 0.08;
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'rest' && p.vy > 0 && p.y + p.h - e.y < 14) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'play'; e.act = 200; } return; }
    if (e.state !== 'rest' && !slow) this.hurt();
  };
  Play.prototype.updateWasp = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    if (lockBoss(this, e)) { if (this._p2ctx && this.state === 'play' && overlap(p, e) && e.state !== 'stuck') this.hurt(); return; }
    e.t++; const L = this.camMin + 16, R = this.camMin + VW - 40, rage = e.maxHp - e.hp, slow = this.freezeT > 0, floorY = 12 * TS - 24;
    if (slow) { if (this.state === 'play' && overlap(p, e) && e.state === 'stuck' && p.vy > 0) { p.vy = -6.5; this.damageBoss(e); } return; }
    if (--e.act <= 0) {
      e.state = { fly: 'aim', aim: 'dive', dive: 'stuck', stuck: 'fly' }[e.state] || 'fly';
      e.act = { fly: 200 - rage * 12, aim: 40, dive: 60, stuck: 110 - rage * 6 }[e.state];
      if (e.state === 'aim') Audio8.sfx('bats'); if (e.state === 'dive') Audio8.sfx('swoop');
      if (e.state === 'fly' && rage >= 3 && Math.random() < 0.5) this.spawn({ t: 'z', x: Math.floor((this.camMin + 40 + Math.random() * 160) / TS), y: 3 });
    }
    if (e.state === 'fly') { const a = e.t * 0.025; e.x = (L + R) / 2 + Math.sin(a) * (R - L) / 2; e.y = 50 + Math.sin(a * 2) * 24; }
    else if (e.state === 'aim') { e.x += clamp(p.x - 10 - e.x, -3, 3); e.y += (40 - e.y) * 0.1; }
    else if (e.state === 'dive') { e.y = Math.min(floorY, e.y + 6 + rage * 0.3); if (e.y >= floorY && e.act > 1) { e.act = 1; this.shake = 10; Audio8.sfx('bosshit'); } }
    else e.y = floorY;
    e.x = clamp(e.x, L, R);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'stuck' && p.vy > 0 && p.y + p.h - e.y < 12) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'fly'; e.act = 180; } return; }
    if (e.state !== 'stuck') this.hurt();
  };
  Play.prototype.updateBaronMech = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    if (lockBoss(this, e)) { if (this._p2ctx && this.state === 'play' && overlap(p, e) && e.state !== 'hatch') this.hurt(); return; }
    e.t++; const L = this.camMin + 12, R = this.camMin + VW - 70, rage = e.maxHp - e.hp, phase2 = e.hp <= e.maxHp / 2, slow = this.freezeT > 0;
    e.vy = Math.min(6, (e.vy || 0) + 0.35); e.y = Math.min(12 * TS - 60, e.y + e.vy); if (e.y >= 12 * TS - 60) { if (e.stomping) { e.stomping = false; this.shake = 16; Audio8.sfx('bosshit'); for (const d of [-1, 1]) this.ents.push({ type: 'wave', alive: true, t: 0, x: e.x + 28 + d * 30, y: 12 * TS - 14, w: 12, h: 14, vx: d * (2.2 + rage * 0.1), life: 160 }); } e.vy = 0; }
    if (!slow && --e.act <= 0) {
      const order = ['walk', 'rockets', 'gears', 'stomp', 'hatch'], next = order[(order.indexOf(e.state) + 1) % order.length];
      e.state = next; e.act = { walk: 90 - rage * 3, rockets: 90, gears: 70, stomp: 60, hatch: (phase2 ? 80 : 110) - rage * 2 }[next];
      if (next === 'rockets') { Audio8.sfx('lasercharge'); for (let k = 0; k < (phase2 ? 4 : 2); k++) this.ents.push({ type: 'bolt', alive: true, t: -k * 20, x: clamp(p.x + p.w / 2 - 4 + (k - 1) * 30, this.camMin + 8, this.camMin + VW - 16), y: 0, w: 8, h: 8 }); }
      if (next === 'gears') { Audio8.sfx('cannon'); for (let k = 0; k < (phase2 ? 3 : 2); k++) this.ents.push({ type: 'cgear', enemy: true, alive: true, t: 0, x: e.x + 20, y: e.y + 10, w: 14, h: 14, vx: (p.x < e.x ? -1 : 1) * (1.4 + k * 0.5), vy: -3 - k }); }
      if (next === 'stomp') { e.vy = -6.5; e.stomping = true; }
      if (next === 'hatch') Audio8.sfx('secret');
    }
    if (e.state === 'walk' && !slow) { e.vx = (p.x < e.x + 28 ? -1 : 1) * (0.6 + rage * 0.06); e.x += e.vx; } else e.vx = 0;
    e.x = clamp(e.x, L, R);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'hatch' && p.vy > 0 && p.y + p.h - e.y < 16) { p.vy = -7; this.damageBoss(e); if (e.alive) { e.state = 'walk'; e.act = 70; } return; }
    if (!slow) this.hurt();
  };
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    const bt = this.def.bossType;
    if (sp.t === '*' && ['organist', 'wasp', 'baronmech'].includes(bt)) {
      const hp = (this.def.bossHp || 8) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0) + (game.plus && !this.rush ? 2 * game.plus : 0), x = sp.x * TS;
      if (bt === 'organist') this.ents.push({ type: 'organist', boss: true, enemy: true, alive: true, t: 0, x: x - 30, y: 60, ty: 60, w: 30, h: 40, hp, maxHp: hp, inv: 0, state: 'play', act: 200 });
      else if (bt === 'wasp') this.ents.push({ type: 'wasp', boss: true, enemy: true, alive: true, t: 0, x: x - 60, y: 50, w: 34, h: 22, hp, maxHp: hp, inv: 0, state: 'fly', act: 180 });
      else this.ents.push({ type: 'baronmech', boss: true, enemy: true, alive: true, t: 0, x: x - 60, y: 12 * TS - 60, w: 56, h: 60, hp, maxHp: hp, inv: 0, state: 'walk', act: 90, vx: 0, vy: 0 });
      return;
    }
    return _sp.call(this, sp);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) {
    const a = e.alive, sa = Sticker.add, mine = ['organist', 'wasp', 'baronmech'].includes(e.type);
    if (mine) Sticker.add = () => {};
    try { _db.call(this, e); } finally { Sticker.add = sa; }
    if (a && !e.alive && mine) { Ach.unlock(e.type === 'baronmech' ? 'legend' : e.type); Bestiary.add(e.type); if (e.type === 'baronmech' && game && !this.mode) game.revengeDone = true; }
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.type === 'furn') { ctx.save(); if (e.dying) { ctx.translate(x + e.w / 2, y + e.h / 2); ctx.scale(1, -1); ctx.translate(-x - e.w / 2, -y - e.h / 2); } drawFurn(e.kind, x, y, e.awake > 0, frame + e.t); ctx.restore(); return; }
    if (e.type === 'ant') { ctx.save(); if (e.dying) { ctx.translate(x + 5, y + 4); ctx.scale(1, -1); ctx.translate(-x - 5, -y - 4); } const l = (frame >> 2) & 1; hR(x, y + 2, 10, 4, '#1a1020'); hR(x + 1, y + 2, 3, 3, '#7a2a10'); hR(x + 4, y + 3, 2, 2, '#7a2a10'); hR(x + 6, y + 1, 4, 4, '#7a2a10'); hR(x + (e.vx < 0 ? 0 : 8), y, 2, 2, '#1a1020'); hR(x + 1 + l, y + 6, 1, 2, '#1a1020'); hR(x + 5 - l, y + 6, 1, 2, '#1a1020'); hR(x + 8 + l, y + 6, 1, 2, '#1a1020'); ctx.restore(); return; }
    if (e.type === 'dew') { const s = e.squash > 0 ? (e.squash--, 0.7) : 1; ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.ellipse(x + 6, y + 7, 7, 6 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(150,220,255,0.9)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 7, 6, 5 * s, 0, 0, Math.PI * 2); ctx.fill(); hR(x + 3, y + 4, 2, 2, '#ffffff'); hR(x - 4, y + 12, 20, 3, '#3a9a30'); return; }
    if (e.type === 'note') { hR(x, y + 6, 6, 5, '#1a1020'); hR(x + 1, y + 7, 4, 3, '#c0a0ff'); hR(x + 5, y - 2, 2, 10, '#1a1020'); hR(x + 6, y - 2, 4, 2, '#1a1020'); return; }
    if (e.type === 'organist') { if (!e.dying) drawOrganist(x, y, e, frame); return; }
    if (e.type === 'wasp') { if (!e.dying) drawWasp(x, y, e, frame); return; }
    if (e.type === 'baronmech') { if (!e.dying) drawBaronMech(x, y, e, frame); return; }
    return _de.call(this, e, cx);
  };
  const _dp = Play.prototype.drawPlatform;
  Play.prototype.drawPlatform = function (pl, cx) {
    if (!pl.bug) return _dp.call(this, pl, cx);
    const x = Math.round(pl.x - cx), y = Math.round(pl.y), w = (frame >> 2) & 1;
    ctx.fillStyle = 'rgba(220,240,255,0.6)'; ctx.fillRect(x + 6, y - 6 - w * 2, 12, 5); ctx.fillRect(x + 22, y - 6 - w * 2, 12, 5);
    hR(x, y, 40, 10, '#1a1020'); hR(x + 1, y + 1, 38, 8, '#e02020'); hR(x + 19, y + 1, 2, 8, '#1a1020'); for (const [dx, dy] of [[6, 3], [12, 5], [26, 3], [32, 5]]) hR(x + dx, y + dy, 3, 3, '#1a1020'); hR(x + 36, y + 2, 6, 6, '#1a1020');
  };
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    if (this.def.bug) { // giant garden plants tower in the background
      for (let k = 0; k < 6; k++) { const X = ((k * 120 - cx * 0.5) % 720 + 720) % 720 - 60; hR(X + 20, 30, 8, 170, '#2a7a20'); hR(X + 21, 30, 2, 170, '#4aaa30'); ctx.fillStyle = k % 2 ? '#e03020' : '#ff8a20'; ctx.beginPath(); ctx.arc(X + 24, 40 + (k % 3) * 12, 26, 0, Math.PI * 2); ctx.fill(); hR(X + 14, 14 + (k % 3) * 12, 20, 6, '#3aa030'); }
    }
    _dt.call(this, cx);
    const t0 = Math.floor(cx / TS);
    for (let ty = 0; ty < 14; ty++) for (let tx = t0; tx <= t0 + 16; tx++) if (this.tile(tx, ty) === 'Ѫ') { const X = tx * TS - cx, Y = ty * TS; hR(X, Y, 16, 16, '#3a2a4a'); hR(X, Y, 16, 1, '#5a4a6a'); hR(X, Y + 8, 16, 1, '#2a1a3a'); hR(X + 7, Y, 1, 8, '#2a1a3a'); hR(X + 3, Y + 8, 1, 8, '#2a1a3a'); }
    for (const m of this.def.mirrors || []) {
      const [mx, my, x0, y0, x1, y1] = m, X = mx * TS - cx; if (X < -40 || X > VW + 40) continue;
      hR(X, (my - 1) * TS - 2, 16, 34, '#1a1020'); hR(X + 1, (my - 1) * TS - 1, 14, 32, '#d0a040'); hR(X + 3, (my - 1) * TS + 1, 10, 28, m.open ? '#c0f0ff' : '#8ab0d0'); hR(X + 4, (my - 1) * TS + 3, 2, 10, '#ffffff');
      if (m.open) { ctx.strokeStyle = (m.open >> 3) & 1 || m.open > 90 ? 'rgba(192,240,255,0.6)' : 'rgba(192,240,255,0.2)'; ctx.setLineDash([3, 2]); ctx.strokeRect(x0 * TS - cx + 0.5, y0 * TS + 0.5, (x1 - x0 + 1) * TS - 1, (y1 - y0 + 1) * TS - 1); ctx.setLineDash([]); }
    }
    for (const [ax] of this.def.antHills || []) { const X = ax * TS - cx, gy = groundRow(this, ax); if (X < -30 || X > VW + 30 || gy < 0) continue; ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.arc(X + 8, gy * TS, 14, Math.PI, 0); ctx.fill(); hR(X + 5, gy * TS - 6, 6, 6, '#1a1020'); }
    if (this.def.bossType === 'organist' && this.bossLock) { const X = this.camMin + VW - 60 - cx; for (let k = 0; k < 7; k++) { hR(X + k * 8, 60 + Math.abs(k - 3) * 10, 6, 132 - Math.abs(k - 3) * 10, '#1a1020'); hR(X + 1 + k * 8, 61 + Math.abs(k - 3) * 10, 4, 130 - Math.abs(k - 3) * 10, '#b0a080'); } hR(X - 6, 150, 64, 16, '#3a2010'); for (let k = 0; k < 10; k++) hR(X - 4 + k * 6, 152, 5, 6, k % 2 ? '#1a1020' : '#f8f4ec'); }
  };
}

// ---------------- the maps ----------------
NODES11.push({ x: 236, y: 196, kind: 'portal', to: 11, name: 'GHOST TRAIN TO HAUNTED HOLLOW' }); EDGES11.push([6, NODES11.length - 1]);
const mkMap = (nodes, edges, blobs, seed, paint, name, sea, key) => { const isl = makeIsland(nodes, blobs, seed, paint); WORLDS.push({ nodes: () => nodes, edges: () => edges, isle: () => isl, name, sea, key }); };
const NODES12 = [{ x: 24, y: 186, kind: 'portal', to: 10, name: 'GHOST TRAIN TO THE KINGDOM' }, { x: 60, y: 160, kind: 'level', li: 100 }, { x: 104, y: 176, kind: 'level', li: 101 }, { x: 150, y: 160, kind: 'level', li: 102 }, { x: 196, y: 146, kind: 'level', li: 103 }, { x: 196, y: 100, kind: 'level', li: 104 }, { x: 130, y: 84, kind: 'castle', li: 105 }, { x: 236, y: 196, kind: 'portal', to: 12, name: "SEED POD TO BUG'S-EYE GARDEN" }];
mkMap(NODES12, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]], [[90, 150, 26], [140, 140, 26], [170, 120, 24], [110, 110, 22]], 1212, (f, near, ch) => {
  if (f > 2.3) return near(6, 26) ? (ch ? [90, 70, 110] : [104, 82, 124]) : ch ? [60, 70, 60] : [70, 82, 70];
  if (f > 1.6) return ch ? [48, 56, 48] : [56, 66, 56]; if (f > 1.25) return ch ? [40, 40, 50] : [46, 46, 58]; return null;
}, 'HAUNTED HOLLOW', ['#100818', '#1a1028'], 'node12');
const NODES13 = [{ x: 24, y: 186, kind: 'portal', to: 11, name: 'SEED POD TO HAUNTED HOLLOW' }, { x: 60, y: 156, kind: 'level', li: 106 }, { x: 100, y: 176, kind: 'level', li: 107 }, { x: 146, y: 162, kind: 'level', li: 108 }, { x: 192, y: 150, kind: 'level', li: 109 }, { x: 204, y: 104, kind: 'level', li: 110 }, { x: 140, y: 86, kind: 'castle', li: 111 }, { x: 236, y: 196, kind: 'portal', to: 13, name: "AIRSHIP TO BARON'S REVENGE" }];
mkMap(NODES13, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]], [[90, 150, 26], [140, 140, 26], [170, 120, 24], [110, 110, 22]], 1313, (f, near, ch, r) => {
  if (f > 2.3) return near(6, 26) ? (ch ? [200, 160, 60] : [220, 180, 80]) : (r() < 0.05 ? [255, 90, 60] : ch ? [70, 170, 60] : [84, 186, 72]);
  if (f > 1.6) return ch ? [60, 150, 50] : [72, 164, 60]; if (f > 1.25) return ch ? [200, 180, 120] : [214, 196, 136]; return null;
}, "BUG'S-EYE GARDEN", ['#2a6aa8', '#3a7ab8'], 'node13');
const NODES14 = [{ x: 24, y: 186, kind: 'portal', to: 12, name: "AIRSHIP TO BUG'S-EYE GARDEN" }, { x: 70, y: 156, kind: 'level', li: 112 }, { x: 128, y: 170, kind: 'level', li: 113 }, { x: 186, y: 150, kind: 'level', li: 114 }, { x: 140, y: 92, kind: 'castle', li: 115 }];
mkMap(NODES14, [[0, 1], [1, 2], [2, 3], [3, 4]], [[100, 150, 30], [150, 130, 28], [130, 110, 24]], 1414, (f, near, ch) => {
  if (f > 2.3) return near(4, 30) ? (ch ? [120, 60, 160] : [140, 76, 180]) : ch ? [80, 70, 100] : [92, 82, 114];
  if (f > 1.6) return ch ? [60, 54, 80] : [70, 62, 92]; if (f > 1.25) return ch ? [40, 36, 56] : [48, 42, 66]; return null;
}, "BARON'S REVENGE", ['#1a0a2a', '#2a1440'], 'node14');

// ---------------- the new ending ----------------
function RevengeEnding() {
  let t = 0, page = 0; const ids = HERO_IDS.filter((h) => heroOpen(h) && h !== 'maker');
  const PAGES = [['AND SO, BARON STATIC SAID SORRY.', 'HE EVEN FIXED THE SIGNAL', 'TOWERS HE HAD BROKEN.'], ['EVERY ISLAND GOT ITS SIGNAL BACK,', 'AND EVERY BOSS GOT A NICE', 'LONG NAP.'], ['WALLYMAN AND FRIENDS THREW', 'THE BIGGEST PARTY THE ISLANDS', 'HAVE EVER SEEN.'], ['THE END... FOR NOW!', '', 'THANK YOU FOR PLAYING', 'WALLYMAN WORLD!']];
  return {
    enter() { Audio8.play('victory'); },
    update() { t++; if (t > 60 && Input.confirm()) { page++; t = 0; Audio8.sfx('map'); if (page >= PAGES.length) { game.revengeSeen = true; Save.persist(); go(() => MapScene()); } } },
    draw() {
      drawParallax(page === 3 ? 'candy' : 'sky', frame * 0.4);
      if (page >= 2) for (let k = 0; k < 12; k++) hR((k * 37 + frame * (1 + k % 3)) % VW, (k * 53 + frame * 2) % 120, 3, 3, ['#ff4040', '#ffe040', '#5ff0ff', '#5ae060'][k % 4]);
      ids.forEach((h, i) => Wally.draw(ctx, 128 + (i - (ids.length - 1) / 2) * 24, 200, page >= 2 ? 'win' + ((frame >> 4) & 1) : 'idle' + ((frame >> 4) % 4), 1, { t: frame, hero: h }));
      if (page >= 1) for (let i = 0; i < 5; i++) { ctx.save(); ctx.globalAlpha = 0.85; stickerArt(['boss', 'megabot', 'thunderhead', 'clockmaker', 'organist'][i], 30 + i * 49, 140, frame); ctx.restore(); }
      drawWindow(16, 16, 224, 70); PAGES[page].forEach((l, i) => txt(l, 128, 24 + i * 14, page === 3 && i === 0 ? '#ffe040' : '#fff', { align: 'center', scale: page === 3 && i === 0 ? 2 : 1 }));
      if (t > 60 && (t >> 4) & 1) txt('PRESS A', 128, 92, '#a8b0d8', { align: 'center', outline: '#101848' });
    },
  };
}
{
  const _M = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    if (game && game.revengeDone && !game.revengeSeen) return RevengeEnding();
    const s = _M(...a), d = s.draw;
    s.draw = function () { d.call(this); if (game && game.iron) { hR(4, 24, 74, 10, 'rgba(90,20,20,0.85)'); txt('IRON HERO', 8, 25, '#ff8080'); } };
    return s;
  };
}

// ---------------- Iron Hero: one life for the whole game ----------------
const IRON_KEY = 'wallyman-iron', IRON_BEST = 'wallyman-iron-best';
{
  const _ps = Save.persist;
  Save.persist = function () { if (game && game.iron) { try { localStorage.setItem(IRON_KEY, JSON.stringify(game)); } catch (e) { /* ignore */ } } return _ps.call(this); };
  const _G = GameOverScene;
  GameOverScene = function () { // eslint-disable-line no-func-assign
    if (!game || !game.iron) return _G();
    const islands = [7, 14, 20, 27, 44, 55, 62, 69, 78, 85, 91, 105, 111, 115].filter((li) => game.cleared[li]).length, score = game.score;
    const best = lsJ(IRON_BEST, []); best.push({ score, islands, at: Date.now() }); best.sort((a, b) => b.score - a.score); lsS(IRON_BEST, best.slice(0, 5));
    try { localStorage.removeItem(IRON_KEY); } catch (e) { /* ignore */ }
    let t = 0;
    return {
      enter() { Audio8.play('gameover'); },
      update() { t++; if (t > 90 && Input.confirm()) { game = null; go(() => IronScene()); } },
      draw() { ctx.fillStyle = '#100808'; ctx.fillRect(0, 0, VW, VH); txt('IRON HERO FALLS', 128, 60, '#ff6060', { align: 'center', scale: 2, outline: '#400' }); txt(`SCORE ${score}`, 128, 100, '#fff', { align: 'center' }); txt(`ISLANDS BEATEN ${islands}`, 128, 116, '#ffe040', { align: 'center' }); if (t > 90) txt('PRESS A', 128, 170, '#a8b0d8', { align: 'center' }); },
    };
  };
  const _cl = Play.prototype.clear;
  Play.prototype.clear = function (s) { const was = this.state; _cl.call(this, s); if (was === 'play' && this.state === 'clear' && game && game.iron && this.def.boss) Ach.unlock('ironhero'); if (was === 'play' && this.state === 'clear' && game && game.iron && game.lives > 0) { game.score += game.lives * 1000; game.lives = 0; } };
}
function IronScene() {
  let sel = 0, t = 0; const saved = lsJ(IRON_KEY, null), best = lsJ(IRON_BEST, []);
  const items = (saved ? ['CONTINUE RUN'] : []).concat(['NEW RUN', 'BACK']);
  return {
    enter() { Audio8.play('boss'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && items[sel] === 'BACK')) { go(() => ChallengeScene(16)); return; }
      if (!Input.confirm()) return;
      Audio8.sfx('confirm');
      if (items[sel] === 'CONTINUE RUN') { game = Object.assign(Save.fresh(), saved); game.iron = true; go(() => MapScene()); return; }
      game = Save.fresh(); game.iron = true; game.lives = 0; game.hero = lastHero(); game.login = { last: todayKey(), streak: 1 }; Save.persist(); go(() => MapScene());
    },
    draw() {
      drawParallax('castle', t * 0.3); drawWindow(24, 10, 208, 70); txt('IRON HERO', 128, 16, '#ff8080', { align: 'center', scale: 2 });
      txt('ONE LIFE FOR THE WHOLE GAME.', 128, 40, '#fff', { align: 'center' }); txt('EXTRA LIVES TURN INTO POINTS.', 128, 52, '#fff', { align: 'center' }); txt('FALL ONCE AND THE RUN IS OVER!', 128, 64, '#ffe040', { align: 'center' });
      drawWindow(24, 86, 208, 60); items.forEach((s, i) => { const y = 94 + i * 14; txt(s, 60, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 48 + ((t >> 3) & 1), y, '#ffe040'); });
      drawWindow(24, 150, 208, 66); txt('BEST RUNS', 128, 156, '#ffe040', { align: 'center' });
      if (!best.length) txt('NONE YET - BE BRAVE!', 128, 180, '#a8b0d8', { align: 'center' }); best.slice(0, 4).forEach((b, i) => { txt(`${i + 1}. ${b.score}`, 44, 170 + i * 11, '#fff'); txt(`${b.islands} ISLANDS`, 212, 170 + i * 11, '#a8b0d8', { align: 'right' }); });
    },
  };
}

// ---------------- the Mega Boss Rush: every boss, back to back ----------------
const MEGA_LIST = () => REMATCH.filter((li) => li !== 50);
function startMega(i, frames) { const li = MEGA_LIST()[i], s = new Play(li, false); s.mode = { kind: 'megarush', i, frames }; return s; }
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    const m = this.mode;
    if (m && m.kind === 'megarush' && !this._megaInit) { // start each fight at the arena door
      this._megaInit = true; const W = this.lv.w, p = this.p; p.x = (W - 17) * TS; p.y = 11 * TS + 16 - p.h; this.cam.x = Math.max(0, p.x - 120); this.spawnIdx = this.lv.spawns.findIndex((s) => s.x >= W - 30); if (this.spawnIdx < 0) this.spawnIdx = 0;
    }
    return _upd.call(this);
  };
  const _me = modeExit;
  modeExit = function (pl, won) { // eslint-disable-line no-func-assign
    const m = pl.mode; if (m.kind !== 'megarush') return _me(pl, won);
    const frames = m.frames + (pl.hF || 0), n = MEGA_LIST().length;
    if (won && m.i + 1 < n) return startMega(m.i + 1, frames);
    return MegaResult(won, frames, won ? n : m.i);
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () { _hud.call(this); const m = this.mode; if (m && m.kind === 'megarush') txt(`MEGA RUSH ${m.i + 1}/${MEGA_LIST().length}  ${fmtTime(m.frames + (this.hF || 0))}`, 128, 28, '#ff8080', { align: 'center', outline: '#101848' }); };
}
function MegaIntro() {
  let t = 0; const best = lsJ('wallyman-megarush', null), open = anySlot((s) => s.cleared[91]);
  return {
    enter() { Audio8.play('boss'); },
    update() { t++; if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(15)); return; } if (t > 20 && Input.confirm()) { if (!open) { Audio8.sfx('bump'); return; } game = challengeGame(); game.hero = lastHero(); Audio8.sfx('confirm'); go(() => startMega(0, 0)); } },
    draw() {
      drawParallax('castle', t * 0.4); drawWindow(20, 20, 216, 150); txt('MEGA BOSS RUSH', 128, 28, '#ff8080', { align: 'center', scale: 2 });
      txt(`ALL ${MEGA_LIST().length} BOSSES, BACK TO BACK.`, 128, 56, '#fff', { align: 'center' }); txt('ONE SLIP AND IT IS OVER!', 128, 70, '#ffe040', { align: 'center' });
      txt(best ? 'BEST TIME ' + fmtTime(best) : 'NO BEST TIME YET', 128, 96, best ? '#5ff0ff' : '#a8b0d8', { align: 'center' });
      txt(open ? 'PRESS START' : 'BEAT THE CLOCKMAKER TO ENTER', 128, 140, open ? '#fff' : '#ff8080', { align: 'center' });
    },
  };
}
function MegaResult(won, frames, reached) {
  let t = 0, rec = false; const best = lsJ('wallyman-megarush', null);
  if (won) { Ach.unlock('megarush'); if (!best || frames < best) { rec = true; lsS('wallyman-megarush', frames); } }
  return {
    enter() { Audio8.play(won ? 'victory' : 'gameover'); },
    update() { t++; if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => MegaIntro()); },
    draw() { drawParallax('castle', t * 0.2); drawWindow(40, 60, 176, 100); txt(won ? 'ALL BOSSES BEATEN!' : `BOSS ${reached + 1} WON THIS TIME`, 128, 70, won ? '#ffe040' : '#ff8080', { align: 'center' }); txt('TIME ' + fmtTime(frames), 128, 96, '#fff', { align: 'center' }); if (rec && (t >> 3) & 1) txt('NEW BEST TIME!', 128, 114, '#5ff0ff', { align: 'center' }); if (t > 60) txt('PRESS A', 128, 140, '#a8b0d8', { align: 'center' }); },
  };
}

// ---------------- Level Maker: the newest pieces ----------------
Maker.PALETTE.push(['Ψ', 'LIGHTNING ROD'], ['ϟ', 'POWER BLOCK (NEEDS A ROD)'], ['Ω', 'UPDRAFT'], ['«', 'WIND / CURRENT LEFT'], ['»', 'WIND / CURRENT RIGHT'], ['⚙', 'GEAR WHEEL'], ['Ѳ', 'PENDULUM (LENGTH = ROW)'], ['ⓡ', 'REWIND SWITCH'], ['Ж', 'REWIND BRIDGE'], ['Ӂ', 'GUARD'], ['Ҩ', 'GIANT CLAM'], ['ʘ', 'BUBBLE STREAM'], ['Ĵ', 'JETPACK'], ['Ŧ', 'TIME CLOCK'], ['ϻ', 'WEATHER STONE (ROW = WEATHER)']);
Object.assign(Maker.LIMITS, { '⚙': 6, 'Ѳ': 10, 'Ӂ': 10, 'ϻ': 1 });
const MAKER_WX = ['rain', 'thunder', 'snow', 'fog', 'hail', 'tornado', 'quake'];
{
  const _td = Maker.toDef;
  Maker.toDef = function (lv) {
    const d = _td(lv), at = []; lv.rows.forEach((r, y) => r.forEach((c, x) => { if ('ΨϟΩ«»⚙ѲⓡЖӁҨʘĴŦϻ'.includes(c)) at.push([c, x, y]); }));
    if (!at.length) return d;
    const of = (c) => at.filter((k) => k[0] === c), runs = (c) => { const out = []; for (const [, x, y] of of(c).sort((a, b) => a[2] - b[2] || a[1] - b[1])) { const r = out.find((k) => k.y === y && k.x1 === x - 1); if (r) r.x1 = x; else out.push({ y, x0: x, x1: x }); } return out; };
    const rods = of('Ψ'); d.rods = runs('ϟ').map((r, i) => { const rod = rods.slice().sort((a, b) => Math.abs(a[1] - r.x0) - Math.abs(b[1] - r.x0))[0]; return rod ? [rod[1], rod[2], r.x0, r.x1, r.y, i * 90] : null; }).filter(Boolean);
    d.zones = of('Ω').map(([, x, y]) => [x, x, y, y, 0, -0.62]).concat(of('«').map(([, x, y]) => [x, x, y, y, -0.06, 0]), of('»').map(([, x, y]) => [x, x, y, y, 0.06, 0]));
    d.gears = of('⚙').map(([, x, y]) => [x, y, 3, 3, 0.012]);
    d.pendulums = of('Ѳ').map(([, x, y], i) => [x, Math.max(3, y), i * 40]);
    const sw = of('ⓡ'); d.rewinds = runs('Ж').map((r) => { const s = sw.slice().sort((a, b) => Math.abs(a[1] - r.x0) - Math.abs(b[1] - r.x0))[0]; return s ? [s[1], s[2], r.x0, r.x1, r.y, 300] : null; }).filter(Boolean);
    d.guards = of('Ӂ').map(([, x]) => [Math.max(1, x - 5), x + 5]);
    d.clams = of('Ҩ').map(([, x], i) => [x, i * 60]);
    d.streams = of('ʘ').map(([, x, y]) => [x, y]); if (d.streams.length && d.water) { d.air = true; }
    d.items = of('Ĵ').map(([, x, y]) => ['jetpack', x, y]).concat(of('Ŧ').map(([, x, y]) => ['tclock', x, y]));
    const ws = of('ϻ')[0]; if (ws) d.forceWx = MAKER_WX[Math.min(MAKER_WX.length - 1, ws[2] % MAKER_WX.length)];
    d.newPieces = true;
    const b0 = d.build; d.build = (b) => { b0(b); for (const row of b.g) for (let x = 0; x < row.length; x++) if ('ΨϟΩ«»⚙ѲⓡЖӁҨʘĴŦϻ'.includes(row[x])) row[x] = '.'; };
    return d;
  };
  const _mi = makerIcon;
  makerIcon = function (c, x, y, t) { // eslint-disable-line no-func-assign
    const box = (bg, fg, s) => { hR(x + 1, y + 1, 14, 14, '#1a1020'); hR(x + 2, y + 2, 12, 12, bg); txt(s, x + 8, y + 5, fg, { align: 'center', shadow: null }); };
    switch (c) {
      case 'Ψ': hR(x + 7, y + 2, 2, 14, '#a0a8b8'); hR(x + 5, y, 6, 4, '#ffe040'); return;
      case 'ϟ': hR(x, y, 16, 6, '#1a1020'); hR(x, y + 1, 16, 4, '#5ff0ff'); return;
      case 'Ω': for (let k = 0; k < 3; k++) hR(x + 3 + k * 4, y + 2 + ((t + k * 5) >> 2) % 10, 1, 5, '#ffffff'); return;
      case '«': box('#3a5a8a', '#fff', '<'); return;
      case '»': box('#3a5a8a', '#fff', '>'); return;
      case '⚙': drawGearShape(x + 8, y + 8, 6, (t || 0) * 0.05, '#b08040', '#1a1020'); return;
      case 'Ѳ': hR(x + 7, y, 2, 10, '#5a3a18'); ctx.fillStyle = '#d0a040'; ctx.beginPath(); ctx.arc(x + 8, y + 11, 4, 0, Math.PI * 2); ctx.fill(); return;
      case 'ⓡ': ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2); ctx.fill(); txt('<', x + 5, y + 5, '#1a1020', { shadow: null }); return;
      case 'Ж': hR(x, y, 16, 16, 'rgba(208,160,64,0.5)'); hR(x, y, 16, 2, '#d0a040'); return;
      case 'Ӂ': drawGuardBody(x + 1, y - 6, 1, t || 0, false); return;
      case 'Ҩ': hR(x, y + 8, 16, 7, '#c080c0'); hR(x, y + 4, 16, 3, '#d090d0'); return;
      case 'ʘ': for (let k = 0; k < 3; k++) hR(x + 6, y + ((k * 6 + (t || 0)) % 14), 3, 3, '#e6faff'); return;
      case 'Ĵ': drawJetpackItem(x + 2, y + 1, t || 0); return;
      case 'Ŧ': drawClockItem(x + 2, y + 1, t || 0); return;
      case 'ϻ': box('#5a4a8a', '#ffe040', String((y / 16) % MAKER_WX.length + 1)); txt(MAKER_WX[(y / 16) % MAKER_WX.length].slice(0, 4).toUpperCase(), x + 8, y - 8, '#ffe040', { align: 'center', outline: '#1a1020' }); return;
      default: return _mi(c, x, y, t);
    }
  };
  const _upd = Play.prototype.update;
  Play.prototype.update = function () { if (this.def.newPieces && !this._mp) { this._mp = true; Ach.unlock('makerpro'); } return _upd.call(this); };
}

// ---------------- the Weather Machine ----------------
const WX_ALL = [['random', 'RANDOM (LIKE NATURE)'], ['clear', 'CLEAR SKIES'], ['rain', 'RAIN'], ['thunder', 'THUNDERSTORM'], ['snow', 'SNOW'], ['fog', 'FOG'], ['hail', 'HAIL'], ['tornado', 'TORNADOES'], ['quake', 'EARTHQUAKES']];
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () { const r = _upd.call(this); if (game && this.wx && this.wx.cur && !this.mode && (this.hF || 0) % 30 === 0) { game.wxSeen = game.wxSeen || {}; if (!game.wxSeen[this.wx.cur]) { game.wxSeen[this.wx.cur] = 1; } } return r; };
}
function WeatherMachineScene() {
  let sel = Math.max(0, WX_ALL.findIndex((k) => k[0] === (game.wxPick || 'random'))), t = 0, msg = '';
  const seen = (k) => k === 'random' || (game.wxSeen || {})[k];
  return {
    enter() { Audio8.play('factory'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => HouseScene(18)); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % WX_ALL.length; Audio8.sfx('select'); msg = ''; } if (Input.pressed('up')) { sel = (sel + WX_ALL.length - 1) % WX_ALL.length; Audio8.sfx('select'); msg = ''; }
      if (Input.confirm()) { const k = WX_ALL[sel][0]; if (!seen(k)) { msg = 'SEE THIS WEATHER IN A LEVEL FIRST!'; Audio8.sfx('bump'); return; } game.wxPick = k; Save.persist(); Audio8.sfx(k === 'thunder' ? 'thunder' : 'secret'); msg = 'THE MACHINE WHIRRS... DONE!'; }
    },
    draw() {
      drawParallax('factory', t * 0.2); drawWindow(8, 8, 240, 22); txt('WEATHER MACHINE', 128, 15, '#ffe040', { align: 'center' });
      hR(176, 40, 64, 90, '#1a1020'); hR(178, 42, 60, 86, '#5a6078'); hR(186, 50, 44, 30, '#1a1020'); hR(188, 52, 40, 26, '#3a8ac0'); drawGearShape(196, 100, 8, t * 0.05, '#d0a040', '#1a1020'); drawGearShape(220, 110, 6, -t * 0.07, '#d0a040', '#1a1020');
      const pick = game.wxPick || 'random'; txt(pick === 'random' ? '?' : pick.slice(0, 4).toUpperCase(), 208, 60, '#ffe040', { align: 'center' });
      drawWindow(8, 34, 162, 18 + WX_ALL.length * 14);
      WX_ALL.forEach(([k, n], i) => { const y = 42 + i * 14, ok = seen(k); txt((ok ? n : '???') + (pick === k ? ' (ON)' : ''), 22, y, i === sel ? '#ffe040' : pick === k ? '#5ae060' : ok ? '#fff' : '#7880b0'); if (i === sel) txt('>', 14 + ((t >> 3) & 1), y, '#ffe040'); });
      drawWindow(8, 184, 240, 32); txt(msg || 'SETS THE WEATHER FOR OUTDOOR LEVELS', 128, 196, msg ? '#5ff0ff' : '#a8b0d8', { align: 'center' });
    },
  };
}
