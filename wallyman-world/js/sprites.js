'use strict';
// All game graphics are generated here as pixel art at load time.
const Sprites = (() => {
  const S = {};
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function fromRows(rows, pal) {
    const h = rows.length, w = rows[0].length, c = canvas(w, h), x = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) console.warn('sprite row width mismatch', y, rows[y]);
      for (let i = 0; i < w; i++) {
        const col = pal[rows[y][i]];
        if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
      }
    }
    return c;
  }
  function flip(src) {
    const c = canvas(src.width, src.height), x = c.getContext('2d');
    x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c;
  }
  function silhouette(src, color) {
    const c = canvas(src.width, src.height), x = c.getContext('2d');
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c;
  }
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ---------------- enemies ----------------
  const grumbleRows = [
    '................', '......KKKK......', '....KKMMMMKK....', '...KMMMMMMMMK...', '..KMMMMMMMMMMK..', '..KMKKMMMMKKMK..',
    '.KMMMWKMMKWMMMK.', '.KMMMWEMMEWMMMK.', '.KMMMMMMMMMMMMK.', '.KMMMKKKKKKMMMK.', '.KMMKMMMMMMKMMK.', '..KMMMMMMMMMMK..',
    '..KmmmmmmmmmmK..',
  ];
  const GPAL = { K: '#1a1020', M: '#9a5ab8', m: '#6a3488', W: '#ffffff', E: '#1a1020', f: '#f2a040' };
  S.grumble = [
    fromRows(grumbleRows.concat(['...KmmKKKKmmK...', '..KffK....KffK..', '..KKKK....KKKK..']), GPAL),
    fromRows(grumbleRows.concat(['...KmmmmmmmmK...', '...KffK..KffK...', '...KKKK..KKKK...']), GPAL),
  ];
  const prickleTop = [
    '................', '..K...K...K.....', '.KPK.KPK.KPK....', 'KPPPKPPPKPPPK...', 'KPpPPPpPPPpPPK..', '.KPPPPPPPPPPPFK.',
    'KPPpPPPPpPPPFFK.', 'KPPPPPPPPPPFEFFK', '.KPPPPPPPPPFFFFN', 'KPPpPPPPPPFFFFK.', '.KPPPPPPPPFFFK..', '..KPPPPPPPPPK...',
  ];
  const PPAL = { K: '#1a1020', P: '#4a5a9a', p: '#8a9ad8', F: '#f0c890', E: '#1a1020', N: '#e04060' };
  const pr = [
    fromRows(prickleTop.concat(['...KKFFKKFFK....', '....KFK..KFK....', '....KKK..KKK....', '................']), PPAL),
    fromRows(prickleTop.concat(['...KKKFFKKFFK...', '...KFK....KFK...', '...KKK....KKK...', '................']), PPAL),
  ];
  S.prickle = { r: pr, l: pr.map(flip) };
  const BZPAL = { K: '#1a1020', Y: '#f8d030', W: '#e8f8ff', w: '#a8d8f0', E: '#ffffff' };
  const bzBody = ['...KKKKKK.KKK...', '..KYKYKYYKKYYK..', '.KYYKYKYYKYEEYK.', 'KYYYKYKYYKYYEYK.', '.KYYKYKYYKYYYK..', '..KKKKKKKKKKK...', '................', '................', '................', '................', '................'];
  const bz = [
    fromRows(['................', '....WWW..WWW....', '...WwwwW.WwwW...', '....WWW..WWW....', '......K..K......'].concat(bzBody), BZPAL),
    fromRows(['................', '................', '...WWWW.WWWW....', '....WwW..WwW....', '......K..K......'].concat(bzBody), BZPAL),
  ];
  S.buzzer = { r: bz, l: bz.map(flip) };
  const HPAL = { K: '#1a1020', G: '#3cc048', g: '#1f8030', W: '#ffffff', E: '#1a1020', R: '#e05070', Y: '#e8e070' };
  const hopTop = [
    '................', '................', '................', '....KK....KK....', '...KWWK..KWWK...', '...KWEK..KWEK...',
    '..KGGGGKKGGGGK..', '.KGGGGGGGGGGGGK.', '.KGGRRRRRRRRGGK.', '.KGGGRRRRRRGGGK.', 'KGGGYYYYYYYYGGGK', 'KgGGYYYYYYYYGGgK',
    'KggGGYYYYYYGGggK', '.KggggggggggggK.',
  ];
  S.hopper = [
    fromRows(hopTop.concat(['KggKKgK..KgKKggK', 'KKKK.KK..KK.KKKK']), HPAL),
    fromRows(hopTop.concat(['.KgK........KgK.', 'KggK........KggK']), HPAL),
  ];

  // ---------------- items ----------------
  S.drink = fromRows([
    '................', '.....KKKKKK.....', '....KSSSSSSK....', '....KKKKKKKK....', '....KRRRRRRK....', '....KRYYYRRK....',
    '....KRRYYRRK....', '....KRYYYYRK....', '....KRRYYRRK....', '....KRYYRRRK....', '....KRRRRRwK....', '....KRRRRRwK....',
    '....KKKKKKKK....', '....KSSSSSSK....', '.....KKKKKK.....', '................',
  ], { K: '#1a1020', S: '#c8d0d8', R: '#e03030', Y: '#ffe040', w: '#ff9090' });
  S.phone = fromRows([
    '................', '.........K......', '......KKKKK.....', '.....KPPPPPK....', '.....KsssssK....', '.....KsssssK....',
    '.....KsssssK....', '.....KPPPPPK....', '.....KPwPwPK....', '.....KPPPPPK....', '.....KPwPwPK....', '.....KPPPPPK....',
    '.....KPwPwPK....', '.....KPPPPPK....', '......KKKKK.....', '................',
  ], { K: '#1a1020', P: '#3a4450', s: '#5ff0ff', w: '#c8d0d8' });
  S.badge = fromRows([
    '................', '................', '....KKKKKKKK....', '..KKOOOOOOOOKK..', '.KOOOOOOOOOOOOK.', 'KOOgOOOgOOOOgOOK',
    'KOOgOOOgOOOOgOOK', 'KOOgOOgOgOOgOOOK', 'KOOOgOgOgOOgOOOK', 'KOOOOgOOOgOOOOOK', '.KOOOOOOOOOOOOK.', '..KKOOOOOOOOKK..',
    '....KKKKKKKK....', '................', '................', '................',
  ], { K: '#1f9a3a', O: '#f2702a', g: '#0e6a26' });
  S.ammo = fromRows([
    '................', '................', '......KKKK......', '.....KbbbwK.....', '.....KbbbbK.....', '...KKKKbbKKKK...',
    '..KbbbwKKbbbwK..', '..KbbbbKKbbbbK..', '..KbbbbKKbbbbK..', '.KKKKKKKKKKKKKK.', '.KTTTTTTTTTTTTK.', '.KtTTtTTtTTtTTK.',
    '.KTTTTTTTTTTTTK.', '.KttttttttttttK.', '.KKKKKKKKKKKKKK.', '................',
  ], { K: '#1a1020', b: '#3a3a4a', w: '#c8c8e0', T: '#c08040', t: '#8a5a2a' });
  S.ballIcon = fromRows(['.KKK.', 'KbwbK', 'KbbbK', 'KbbbK', '.KKK.'], { K: '#1a1020', b: '#4a4a5a', w: '#c8c8e0' });
  // ---- new enemies ----
  const BATPAL = { K: '#1a1020', M: '#7a3aa8', W: '#ffffff', E: '#ff3040', f: '#ffffff' };
  S.bat = [
    fromRows(['................', 'K..............K', 'KK............KK', 'KMK...KKKK...KMK', 'KMMK.KMMMMK.KMMK', '.KMMKMWMMWMKMMK.', '.KMMMMEMMEMMMMK.', '..KMMMMMMMMMMK..',
      '...KKMfMMfMKK...', '.....KMMMMK.....', '......KKKK......', '................', '................', '................', '................', '................'], BATPAL),
    fromRows(['................', '................', '................', '......KKKK......', '.....KMMMMK.....', '..KKKMWMMWMKKK..', '.KMMMMEMMEMMMMK.', 'KMMMMMMMMMMMMMMK',
      'KMMKKMfMMfMKKMMK', 'KMK..KMMMMK..KMK', 'KK....KKKK....KK', 'K..............K', '................', '................', '................', '................'], BATPAL),
  ];
  const CHPAL = { K: '#1a1020', G: '#8a90a8', g: '#c0c8e0', R: '#ff3040', w: '#f0f0f0', d: '#4a4a5a' };
  const chTop = ['................', '................', '................', '..........KK....', '.........KwK....', '...KKKKKKKwK....', '..KGGGGGGGGKK...', '.KGgGGGGGGGGRK..',
    '.KGGGGGGGGGGGGK.', '.KGgGGgGGGGGKKK.', '.KGGGGGGGGGGGK..', '..KGGGGGGGGGK...'];
  const ch = [
    fromRows(chTop.concat(['..KKdKKKKdKKK...', '..KddK..KddK....', '..KKKK..KKKK....', '................']), CHPAL),
    fromRows(chTop.concat(['..KKKdKKKKdKK...', '...KddK..KddK...', '...KKKK..KKKK...', '................']), CHPAL),
  ];
  S.charger = { r: ch, l: ch.map(flip) };
  const tu = fromRows(['................', '.......K........', '......KYK.......', '.......K........', '.......K........', '....KKKKKKK.....', '...KGGGGGGGK....', '...KGRRGRRGK....',
    '...KGRRGRRGKKKK.', '...KGGGGGGGKggK.', '...KGGGGGGGKKKK.', '..KKKKKKKKKKK...', '..KdddddddddK...', '.KdddddddddddK..', '.KKKKKKKKKKKKK..', '................'],
  { K: '#1a1020', G: '#5a6a8a', R: '#ff3040', Y: '#ffe040', g: '#8a9ab8', d: '#3a3a4a' });
  S.turret = { r: tu, l: flip(tu) };
  // ---- Dino: WallyMan's rideable dinosaur friend (teal, yellow belly, orange spikes, red saddle) ----
  const DPAL = { K: '#1a1020', T: '#2ec4b6', t: '#1a8a80', k: '#0e5a54', W: '#ffffff', E: '#1a1020', O: '#ff8c42', S: '#e83850', s: '#ff8090', Y: '#ffe08a', w: '#f8f0d8' };
  const dinoTop = [
    '...............KKKKKK...',
    '..............KTTTTTTK..',
    '.............KTTTTTWWTK.',
    '.............KTTTTTWEKTK',
    '............KTTTTTTTTTTK',
    '............KTTTTkkkkkK.',
    '............KtTTTTTTTK..',
    '....O.O.O..KtTTTTTTK....',
    '...KOKOKOKKSsSSTTTK.....',
    '..KTTTTTTTSSSSSTTTK.....',
    '.KTTTTTTTTTSSSTTYYK.....',
    'KTTTTTTTTTTTTTTYYYKTK...',
    'KTTKTTTTTTTTTTYYYYK.....',
    '.KKtTTTTTTTTTTYYYYK.....',
    '...KtTTTTTTTTTYYYK......',
    '....KttTTTTTTTTTK.......',
  ];
  const dinoLegs = [
    ['....KTTTK...KTTTK.......', '....KTTTK...KTTTK.......', '....KtTTK...KTTTK.......', '...KTTTTK..KTTTTK.......', '...KwwwwK..KwwwwK.......', '...KKKKKK..KKKKKK.......'],
    ['...KTTTK.....KTTTK......', '..KtTTK.......KTTTK.....', '.KtTTK.........KTTTK....', 'KTTTTK.........KTTTTK...', 'KwwwwK.........KwwwwK...', 'KKKKKK.........KKKKKK...'],
    ['......KTTTKTTTK.........', '......KtTTKTTTK.........', '.....KtTTTKTTTK.........', '.....KTTTTKTTTTK........', '.....KwwwwKwwwwK........', '.....KKKKKKKKKKK........'],
  ];
  const dino = dinoLegs.map((l) => fromRows(dinoTop.concat(l), DPAL));
  S.dino = { r: dino, l: dino.map(flip) };
  const dinoOf = (pal) => { const fr = dinoLegs.map((l) => fromRows(dinoTop.concat(l), Object.assign({}, DPAL, pal))); return { r: fr, l: fr.map(flip) }; };
  S.dinos = {
    teal: S.dino,
    ice: dinoOf({ T: '#bfe8ff', t: '#7ab8e8', k: '#2a5a8a', Y: '#ffffff', O: '#e0f8ff', S: '#5ff0ff', s: '#c0ffff' }),
    red: dinoOf({ T: '#e84838', t: '#a02818', k: '#5a1008', Y: '#ffd060', O: '#ffe040', S: '#3a2a3a', s: '#6a5a6a' }),
    blue: dinoOf({ T: '#5a9af0', t: '#2a5ab8', k: '#1a3a7a', Y: '#e0f0ff', O: '#ffffff', S: '#ffd040', s: '#fff0a0' }),
  };
  // ---- batch D items: magnet, shrink ray, bubble shield, 1-UP mushroom ----
  S.magnet = fromRows(['................', '................', '...KKKK..KKKK...', '..KRRRK..KBBBK..', '..KRRRK..KBBBK..', '..KRRK....KBBK..', '..KRRK....KBBK..', '..KRRK....KBBK..', '..KRRRKKKKBBBK..', '...KRRRRBBBBK...', '....KKRRBBKK....', '......KKKK......', '..w...........w.', '.w.w........w.w.', '..w...........w.', '................'], { K: '#1a1020', R: '#e83030', B: '#2f62d0', w: '#ffe040' });
  S.shrink = fromRows(['................', '.......KK.......', '......KwwK......', '......KKKK......', '.....KppppK.....', '....KppwpppK....', '...KpppppwppK...', '...KppPPPPppK...', '...KpPPPPPPpK...', '...KpPPwPPPpK...', '...KpPPPPPPpK...', '....KpPPPPpK....', '.....KKKKKK.....', '................', '................', '................'], { K: '#1a1020', p: '#d0a0ff', P: '#9a4ae8', w: '#ffffff' });
  S.shield = fromRows(['................', '.....KKKKKK.....', '...KKccccccKK...', '..KccwwccccccK..', '.KccwcccccccccK.', '.KcwccccccccccK.', 'KccwccccccccccK.', 'KcccccccccccccK.', 'KcccccccccccccK.', 'KcccccccccccbcK.', '.KccccccccccbK..', '.KcccccccccbcK..', '..KccccccbbcK...', '...KKccccccKK...', '.....KKKKKK.....', '................'], { K: '#2a6aa0', c: 'rgba(160,220,255,0.55)', w: '#ffffff', b: '#5ff0ff' });
  S.shroom = fromRows(['................', '.....KKKKKK.....', '...KKGGwwGGKK...', '..KGGwwwwGGGGK..', '.KGGGwwwwGGwwGK.', '.KwwGGGGGGwwwwK.', 'KwwwwGGGGGGwwGGK', 'KwwwGGwwGGGGGGGK', 'KGGGGwwwwGGGwwGK', '.KKKKKKKKKKKKKK.', '...KssKssKssK...', '...KsKsssKKsK...', '...KsssssssssK..', '...KsssssssssK..', '....KKKKKKKKK...', '................'], { K: '#1a1020', G: '#2eb84a', w: '#ffffff', s: '#f8e0c0' });
  // ---- Wally Medals (5 hidden in every level) ----
  const MPAL = { K: '#7a4a10', R: '#e83850', B: '#2f62d0', Y: '#ffd040', y: '#f0a020', w: '#fff8c0' };
  S.medal = fromRows(['.....KK..KK.....', '....KRRK.KBBK...', '....KRRKKKBBK...', '.....KRRKBBK....', '......KKKKK.....', '.....KYYYYYK....', '....KYyyyyyYK...', '...KYyYwYwYyYK..',
    '...KYyYwYwYyYK..', '...KYyYwwwYyYK..', '...KYyyYwYyyYK..', '....KYyyyyyYK...', '.....KYYYYYK....', '......KKKKK.....', '................', '................'], MPAL);
  S.medalGhost = (() => { const c = canvas(16, 16), x = c.getContext('2d'); x.globalAlpha = 0.4; x.drawImage(S.medal, 0, 0); return c; })();
  S.miniMedal = fromRows(['.KKK.', 'KYwYK', 'KYYYK', 'KYYYK', '.KKK.'], { K: '#7a4a10', Y: '#ffd040', w: '#fff8c0' });
  S.miniMedalOff = fromRows(['.KKK.', 'KgggK', 'KgggK', 'KgggK', '.KKK.'], { K: '#1a1020', g: '#4a4a60' });
  // ---- new power-ups ----
  S.battery = fromRows(['................', '......KKKK......', '......KwwK......', '....KKKKKKKK....', '....KGGGGGGK....', '....KGGYGGgK....', '....KGYYGGgK....', '....KYYYYYgK....',
    '....KGGYYGgK....', '....KGYYGGgK....', '....KGYGGGgK....', '....KGGGGGgK....', '....KKKKKKKK....', '....KddddddK....', '....KKKKKKKK....', '................'],
  { K: '#1a1020', G: '#3ce060', g: '#1f9a3a', Y: '#ffe040', w: '#c8c8d8', d: '#4a4a5a' });
  S.boots = fromRows(['................', '................', '.....KKKK.......', '....KOOOOK......', '....KOOOOK.KK...', '....KOOOOKKWWK..', '....KoOOOKWWK...', '....KOOOOKKK....',
    '....KOOOOK......', '...KOOOOOOKK....', '..KOOOOOOOOOK...', '..KoooooooooK...', '..KKKKKKKKKKK...', '...yYy..yYy.....', '....y....y......', '................'],
  { K: '#1a1020', O: '#f2702a', o: '#b4461a', W: '#ffffff', Y: '#ffe040', y: '#ff7020' });
  S.miniPhone = fromRows(['KKK', 'KsK', 'KsK', 'KPK', 'KPK', 'KKK'], { K: '#1a1020', s: '#5ff0ff', P: '#3a4450' });
  S.miniBoots = fromRows(['.KK..', '.KOK.', '.KOK.', 'KOOOK', 'KKKKK'], { K: '#1a1020', O: '#f2702a' });
  S.miniBattery = fromRows(['.KK.', 'KGGK', 'KYGK', 'KGYK', 'KGGK', 'KKKK'], { K: '#1a1020', G: '#3ce060', Y: '#ffe040' });
  S.coin = fromRows([
    '..KKKK..', '.KYYYYK.', 'KYYwwYYK', 'KYwYYoYK', 'KYwYYoYK', 'KYwYYoYK', 'KYwYYoYK', 'KYwYYoYK', 'KYwYYoYK', 'KYwYYoYK',
    'KYwYYoYK', 'KYYooYYK', '.KYYYYK.', '..KKKK..',
  ], { K: '#7a4a10', Y: '#ffd040', w: '#fff8c0', o: '#d89020' });
  S.heart = fromRows(['.KK.KK.', 'KRRKRwK', 'KRRRRRK', 'KRRRRRK', '.KRRRK.', '..KRK..', '...K...'], { K: '#1a1020', R: '#f03050', w: '#ffc0c8' });
  S.heartEmpty = fromRows(['.KK.KK.', 'K..K..K', 'K.....K', 'K.....K', '.K...K.', '..K.K..', '...K...'], { K: '#1a1020' });
  S.coinIcon = fromRows(['.KKK.', 'KYwYK', 'KYwYK', 'KYwYK', 'KYwYK', 'KYYYK', '.KKK.'], { K: '#7a4a10', Y: '#ffd040', w: '#fff8c0' });

  // ---------------- tiles ----------------
  const THEMES = {
    grass: { top: ['#5ad84a', '#2f9a32', '#a8f088'], dirt: ['#c8844a', '#a0602e', '#e0a46a'], brick: ['#d06a30', '#8a3a18', '#f0a070'], solid: ['#b0a090', '#6a5a50', '#e0d8c8'], plank: ['#c08040', '#7a4a20', '#e8b070'] },
    cave: { top: ['#9a8ac8', '#5a4a88', '#c8b8f0'], dirt: ['#4a3a6a', '#2e2448', '#6a5a8a'], brick: ['#6a7ab8', '#3a4278', '#a0b0e8'], solid: ['#7a7a9a', '#44445a', '#b0b0c8'], plank: ['#8a6a50', '#4a3428', '#b08a68'] },
    sky: { top: ['#ffffff', '#c8d8f0', '#ffffff'], dirt: ['#f0f4ff', '#c8d4f0', '#ffffff'], brick: ['#f0a0b8', '#b05878', '#ffd0e0'], solid: ['#c8c8e0', '#8888a8', '#f0f0ff'], plank: ['#ffffff', '#b8c8e8', '#ffffff'] },
    beach: { top: ['#f8e0a0', '#d8b060', '#fff4d0'], dirt: ['#e8c078', '#c89850', '#f8dca0'], brick: ['#e08850', '#a05028', '#ffb880'], solid: ['#d8c8a8', '#988060', '#f8f0d8'], plank: ['#b07848', '#704828', '#d8a070'] },
    snow: { top: ['#ffffff', '#a8c8e8', '#ffffff'], dirt: ['#88b0d8', '#6890c0', '#b8d8f8'], brick: ['#a8c8f0', '#5878b0', '#e0f0ff'], solid: ['#c0d8f0', '#7898c0', '#ffffff'], plank: ['#8a6a50', '#4a3428', '#b08a68'] },
    haunted: { top: ['#7a6a8a', '#3a2a4a', '#a89ac0'], dirt: ['#3a2a48', '#24182e', '#4a3a5a'], brick: ['#5a3a5a', '#2a1a2a', '#8a6a8a'], solid: ['#6a6a7a', '#3a3a48', '#9a9aaa'], plank: ['#5a4030', '#2a1a10', '#8a6a50'] },
    water: { top: ['#f0d890', '#c0a050', '#fff0c0'], dirt: ['#d8b870', '#b09050', '#e8d090'], brick: ['#f07080', '#a03848', '#ffb0b8'], solid: ['#80a0b8', '#4a6a80', '#b0d0e0'], plank: ['#a07850', '#604028', '#c8a070'] },
    airship: { top: ['#c08848', '#6a4020', '#e8b878'], dirt: ['#8a5a30', '#5a3418', '#a87040'], brick: ['#a06030', '#5a3010', '#d09050'], solid: ['#8890a8', '#4a5068', '#c0c8e0'], plank: ['#c08848', '#6a4020', '#e8b878'] },
    volcano: { top: ['#6a5050', '#2a1c1c', '#a07a6a'], dirt: ['#3a2828', '#1a1010', '#503838'], brick: ['#7a3a2a', '#3a1810', '#a85a40'], solid: ['#5a5050', '#2a2424', '#8a8080'], plank: ['#6a4030', '#3a2018', '#9a6048'] },
    factory: { top: ['#9aa0b0', '#5a6070', '#d0d4e0'], dirt: ['#5a6070', '#3a4050', '#7a8090'], brick: ['#c08030', '#6a4010', '#f0b050'], solid: ['#7a8090', '#3a4050', '#b0b8c8'], plank: ['#e0b030', '#6a5010', '#fff070'] },
    candy: { top: ['#ff90c8', '#d04890', '#ffd8ec'], dirt: ['#b06838', '#7a4018', '#d89058'], brick: ['#ff6080', '#c02850', '#ffb0c0'], solid: ['#80d8ff', '#3a90c8', '#d0f0ff'], plank: ['#ffffff', '#ff70a0', '#ffffff'] },
    moon: { top: ['#d0d0d8', '#80808e', '#f4f4fa'], dirt: ['#9a9aa8', '#6a6a78', '#b8b8c4'], brick: ['#7a7a90', '#4a4a5a', '#a8a8c0'], solid: ['#a0a8c0', '#5a6078', '#d0d8f0'], plank: ['#8890a8', '#4a5068', '#c0c8e0'] },
    jungle: { top: ['#4ac040', '#1e7a28', '#9af07a'], dirt: ['#7a5a3a', '#4a3420', '#9a7a50'], brick: ['#8a8a6a', '#4a4a38', '#b8b890'], solid: ['#7a8a6a', '#3a4a30', '#a8b890'], plank: ['#9a6a3a', '#5a3a1a', '#c09050'] },
    desert: { top: ['#f0c870', '#c09040', '#fff0b0'], dirt: ['#d8a058', '#a87030', '#f0c080'], brick: ['#c87848', '#884020', '#f0a070'], solid: ['#c8a878', '#8a6a40', '#f0d8a8'], plank: ['#a07040', '#604020', '#c89050'] },
    static: { top: ['#a040ff', '#40108a', '#e0a0ff'], dirt: ['#2a1a4a', '#140a28', '#4a2a7a'], brick: ['#30d0c0', '#106a70', '#a0fff0'], solid: ['#5a5a7a', '#2a2a40', '#a0a0c8'], plank: ['#ff40a0', '#8a1050', '#ffa0d0'] },
    carnival: { top: ['#e83850', '#8a1830', '#ffb0b8'], dirt: ['#5a2a6a', '#3a1648', '#7a4a8a'], brick: ['#ffd040', '#b08010', '#fff0a0'], solid: ['#40a0e8', '#1a5a98', '#a0d8ff'], plank: ['#ffffff', '#e83850', '#ffffff'] },
    castle: { top: ['#8a8a9a', '#4a4a5a', '#b8b8c8'], dirt: ['#5a5a6a', '#3a3a48', '#7a7a8a'], brick: ['#8a4a5a', '#4a2030', '#b87a8a'], solid: ['#7a7a8a', '#3a3a4a', '#aaaabb'], plank: ['#6a4a30', '#3a2818', '#9a7050'] },
  };
  function tileSet(theme) {
    const P = THEMES[theme], T = {}, r = rng(theme.length * 977);
    const mk = (fn) => { const c = canvas(16, 16), x = c.getContext('2d'); fn(x); return c; };
    const px = (x, X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
    const fillDirt = (x) => {
      x.fillStyle = P.dirt[0]; x.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 14; i++) { const X = (r() * 15) | 0, Y = (r() * 15) | 0; px(x, X, Y, P.dirt[1]); px(x, X + 1, Y, P.dirt[2]); }
    };
    T.fill = mk(fillDirt);
    T.top = mk((x) => {
      fillDirt(x);
      if (theme === 'sky') {
        x.fillStyle = P.top[0]; x.fillRect(0, 0, 16, 6);
        for (let i = 0; i < 16; i++) { const h = 2 + Math.round(Math.sin(i * 0.8) * 1.5); px(x, i, 6 + (h % 2), P.top[1]); }
        x.fillStyle = P.top[1]; x.fillRect(0, 0, 16, 1);
      } else {
        x.fillStyle = P.top[0]; x.fillRect(0, 0, 16, 5);
        for (let i = 0; i < 16; i++) { const d = 5 + ((i * 7 + 3) % 4 === 0 ? 2 : (i % 3 === 0 ? 1 : 0)); x.fillStyle = P.top[0]; x.fillRect(i, 0, 1, d); px(x, i, d, P.top[1]); }
        x.fillStyle = P.top[2]; x.fillRect(0, 0, 16, 1);
        for (let i = 1; i < 16; i += 4) px(x, i, 2, P.top[2]);
        x.fillStyle = P.top[1]; x.fillRect(0, 1, 16, 0);
      }
    });
    const brick = (x, c) => {
      x.fillStyle = c[0]; x.fillRect(0, 0, 16, 16);
      x.fillStyle = c[1];
      x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1);
      x.fillRect(7, 0, 1, 7); x.fillRect(15, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(11, 8, 1, 7);
      x.fillStyle = c[2];
      x.fillRect(0, 0, 7, 1); x.fillRect(8, 0, 7, 1); x.fillRect(0, 8, 3, 1); x.fillRect(4, 8, 7, 1); x.fillRect(12, 8, 4, 1);
    };
    T.brick = mk((x) => brick(x, P.brick));
    T.solid = mk((x) => {
      x.fillStyle = P.solid[0]; x.fillRect(0, 0, 16, 16);
      x.fillStyle = P.solid[2]; x.fillRect(0, 0, 16, 2); x.fillRect(0, 0, 2, 16);
      x.fillStyle = P.solid[1]; x.fillRect(0, 14, 16, 2); x.fillRect(14, 0, 2, 16);
      x.fillStyle = P.solid[1]; x.fillRect(5, 5, 6, 6); x.fillStyle = P.solid[0]; x.fillRect(6, 6, 4, 4);
    });
    const rivets = (x, col) => { x.fillStyle = col; [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([a, b]) => x.fillRect(a, b, 2, 2)); };
    const W = ['10001', '10001', '10101', '10101', '01010'];
    T.bonus = [0, 1, 2, 1].map((f) => mk((x) => {
      const base = ['#f8c030', '#ffd860', '#fff090'][f];
      x.fillStyle = '#5a3008'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = base; x.fillRect(1, 1, 14, 14);
      x.fillStyle = '#fff8d0'; x.fillRect(1, 1, 14, 1); x.fillRect(1, 1, 1, 14);
      x.fillStyle = '#c07818'; x.fillRect(1, 14, 14, 1); x.fillRect(14, 1, 1, 14);
      rivets(x, '#8a5010');
      for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) if (W[yy][xx] === '1') {
        x.fillStyle = '#1f9a3a'; x.fillRect(5 + xx, 5 + yy, 1, 1); x.fillStyle = '#0e5a1e'; x.fillRect(6 + xx, 6 + yy, 1, 1);
      }
    }));
    T.used = mk((x) => {
      x.fillStyle = '#3a2008'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#a06830'; x.fillRect(1, 1, 14, 14);
      x.fillStyle = '#c08850'; x.fillRect(1, 1, 14, 1);
      x.fillStyle = '#7a4a20'; x.fillRect(1, 14, 14, 1);
      rivets(x, '#5a3010');
    });
    T.oneway = mk((x) => {
      if (theme === 'sky') {
        x.fillStyle = '#ffffff';
        for (let i = 0; i < 16; i++) { const h = 4 + Math.round(Math.sin(i * 0.9) * 1.2); x.fillRect(i, 0, 1, h); }
        x.fillStyle = '#c8d8f0'; for (let i = 0; i < 16; i += 2) x.fillRect(i, 4 + Math.round(Math.sin(i * 0.9) * 1.2), 2, 1);
      } else {
        x.fillStyle = P.plank[1]; x.fillRect(0, 0, 16, 6);
        x.fillStyle = P.plank[0]; x.fillRect(0, 1, 16, 4);
        x.fillStyle = P.plank[2]; x.fillRect(0, 1, 16, 1);
        x.fillStyle = P.plank[1]; x.fillRect(5, 1, 1, 4); x.fillRect(12, 1, 1, 4);
        x.fillRect(3, 6, 2, 3); x.fillRect(11, 6, 2, 3);
      }
    });
    T.spikes = mk((x) => {
      for (let s = 0; s < 2; s++) {
        const ox = s * 8;
        for (let y = 0; y < 10; y++) {
          const half = Math.floor(y * 0.4);
          x.fillStyle = '#d8dce8'; x.fillRect(ox + 4 - half, 6 + y, half + 1, 1);
          x.fillStyle = '#7a7e90'; x.fillRect(ox + 4, 6 + y, half, 1);
        }
        x.fillStyle = '#ffffff'; x.fillRect(ox + 4, 6, 1, 1);
      }
      x.fillStyle = '#4a4e60'; x.fillRect(0, 15, 16, 1);
    });
    T.lava = [0, 1, 2, 3].map((f) => mk((x) => {
      x.fillStyle = '#e83010'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#ff7020';
      for (let i = 0; i < 16; i++) { const h = 3 + Math.round(Math.sin((i + f * 4) * 0.4) * 2); x.fillRect(i, 0, 1, h); }
      x.fillStyle = '#ffd040';
      for (let i = 0; i < 16; i++) { const h = Math.round(Math.sin((i + f * 4) * 0.4) * 2); if (h > 0) x.fillRect(i, 0, 1, h); }
      x.fillStyle = '#b81808'; for (let i = 0; i < 6; i++) x.fillRect((i * 5 + f * 3) % 16, 8 + (i * 3) % 7, 2, 1);
    }));
    T.lavaFill = mk((x) => { x.fillStyle = '#e83010'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#b81808'; for (let i = 0; i < 6; i++) x.fillRect((i * 7) % 16, (i * 5) % 16, 3, 1); });
    T.spring = [0, 1].map((f) => mk((x) => {
      const top = f ? 10 : 4;
      x.fillStyle = '#1a1020'; x.fillRect(1, 13, 14, 3); x.fillRect(2, top - 1, 12, 4);
      x.fillStyle = '#8890a8'; x.fillRect(2, 14, 12, 1);
      for (let y = top + 3; y < 13; y++) { x.fillStyle = (y - top) % 3 === 0 ? '#e8ecf8' : '#6870a0'; x.fillRect(4 + ((y - top) % 3 === 1 ? 1 : 0), y, 8, 1); }
      x.fillStyle = '#f03050'; x.fillRect(3, top, 10, 2); x.fillStyle = '#ffa0b0'; x.fillRect(3, top, 10, 1);
    }));
    return T;
  }
  S.tiles = {};
  for (const t of Object.keys(THEMES)) S.tiles[t] = tileSet(t);

  // ---------------- parallax backgrounds ----------------
  function layer(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d'), w, h); return c; }
  function gradient(top, bottom) {
    return layer(1, 224, (x) => { const g = x.createLinearGradient(0, 0, 0, 224); g.addColorStop(0, top); g.addColorStop(1, bottom); x.fillStyle = g; x.fillRect(0, 0, 1, 224); });
  }
  function hillsLayer(w, base, amp, freqs, cols, stripes, seed) {
    return layer(w, 224, (x) => {
      const r = rng(seed);
      const ph = freqs.map(() => r() * 6.28);
      for (let i = 0; i < w; i++) {
        let h = base;
        freqs.forEach((f, k) => { h += Math.sin((i / w) * Math.PI * 2 * f + ph[k]) * amp[k]; });
        h = Math.round(h);
        x.fillStyle = cols[0]; x.fillRect(i, h, 1, 224 - h);
        x.fillStyle = cols[2]; x.fillRect(i, h, 1, 2);
        if (stripes && (i % 10 < 2)) { x.fillStyle = cols[1]; x.fillRect(i, h + 6, 1, 224 - h); }
      }
    });
  }
  function cloud(x, cx, cy, s, col, shade) {
    const blobs = [[0, 0, 10], [12, -5, 12], [26, 0, 10], [8, 4, 9], [20, 4, 9]];
    for (const [dx, dy, rr] of blobs) {
      const R = rr * s;
      for (let yy = -R; yy <= R; yy++) {
        const half = Math.round(Math.sqrt(R * R - yy * yy));
        x.fillStyle = yy > R * 0.4 ? shade : col;
        x.fillRect(Math.round(cx + dx * s - half), Math.round(cy + dy * s + yy), half * 2, 1);
      }
    }
  }
  S.bg = {
    grass: {
      sky: gradient('#5cb0f8', '#c8ecff'),
      layers: [
        { c: layer(512, 224, (x) => { cloud(x, 40, 40, 1, '#ffffff', '#d8ecff'); cloud(x, 230, 62, 0.8, '#ffffff', '#d8ecff'); cloud(x, 380, 30, 1.1, '#ffffff', '#d8ecff'); }), f: 0.1, drift: 0.1 },
        { c: hillsLayer(512, 120, [18, 10], [2, 5], ['#7ad0a0', '#68bc8e', '#a8f0c8'], true, 3), f: 0.25 },
        { c: hillsLayer(512, 160, [10, 6], [3, 7], ['#3aa860', '#2e9050', '#6ad890'], false, 9), f: 0.5 },
      ],
    },
    cave: {
      sky: gradient('#120a24', '#2a1a40'),
      layers: [
        { c: layer(512, 224, (x) => { const r = rng(5); for (let i = 0; i < 512; i += 2) { const h = 30 + Math.sin(i * 0.03) * 16 + r() * 8; x.fillStyle = '#2a1e48'; x.fillRect(i, 0, 2, h); const b = 150 + Math.sin(i * 0.02 + 1) * 20 + r() * 6; x.fillRect(i, b, 2, 224 - b); } for (let i = 0; i < 30; i++) { x.fillStyle = ['#7af0ff', '#f078ff', '#ffffff'][i % 3]; x.fillRect((r() * 512) | 0, (40 + r() * 100) | 0, 1, 1); } }), f: 0.2 },
        { c: layer(512, 224, (x) => { const r = rng(8); for (let k = 0; k < 7; k++) { const cx = (k * 75 + r() * 30) | 0, w = 10 + ((r() * 14) | 0); x.fillStyle = '#3a2a60'; x.fillRect(cx, 0, w, 224); x.fillStyle = '#4a3a78'; x.fillRect(cx, 0, 2, 224); } }), f: 0.45 },
      ],
    },
    sky: {
      sky: gradient('#ff8a70', '#ffe0a0'),
      layers: [
        { c: layer(512, 224, (x) => { x.fillStyle = '#fff4c0'; for (let yy = -14; yy <= 14; yy++) { const h = Math.round(Math.sqrt(196 - yy * yy)); x.fillRect(400 - h, 70 + yy, h * 2, 1); } }), f: 0.02 },
        { c: layer(512, 224, (x) => { cloud(x, 20, 150, 1.6, '#ffc0c8', '#f0a0b0'); cloud(x, 200, 170, 2, '#ffc0c8', '#f0a0b0'); cloud(x, 380, 140, 1.4, '#ffc0c8', '#f0a0b0'); }), f: 0.15, drift: 0.05 },
        { c: layer(512, 224, (x) => { cloud(x, 60, 200, 2, '#ffffff', '#ffe0e8'); cloud(x, 300, 210, 2.4, '#ffffff', '#ffe0e8'); cloud(x, 180, 60, 0.9, '#ffffff', '#ffe0e8'); }), f: 0.35 },
      ],
    },
    beach: {
      sky: gradient('#40b0f8', '#c0f4ff'),
      layers: [
        { c: layer(512, 224, (x) => { x.fillStyle = '#fff8c0'; for (let yy = -16; yy <= 16; yy++) { const h = Math.round(Math.sqrt(256 - yy * yy)); x.fillRect(90 - h, 48 + yy, h * 2, 1); } cloud(x, 260, 40, 0.9, '#ffffff', '#d8f0ff'); cloud(x, 420, 70, 0.7, '#ffffff', '#d8f0ff'); }), f: 0.05, drift: 0.05 },
        { c: layer(512, 224, (x) => {
          x.fillStyle = '#2a88d8'; x.fillRect(0, 136, 512, 88);
          x.fillStyle = '#5ab0f0'; for (let yy = 140; yy < 224; yy += 6) for (let xx = (yy * 13) % 20; xx < 512; xx += 20) x.fillRect(xx, yy, 6, 1);
          x.fillStyle = '#3a9050'; for (let i = 0; i < 60; i++) { const h = Math.round(Math.sin((i / 60) * Math.PI) * 18); x.fillRect(300 + i, 136 - h, 1, h); }
        }), f: 0.15 },
        { c: layer(512, 224, (x) => {
          const palm = (px, ph) => {
            for (let i = 0; i < ph; i++) { x.fillStyle = i % 4 < 2 ? '#8a5a2a' : '#6a4020'; x.fillRect(px + Math.round(Math.sin(i / ph * 1.6) * 8), 224 - i, 4, 1); }
            const tx = px + Math.round(Math.sin(1.6) * 8) + 2, ty = 224 - ph;
            for (const [dx, dy] of [[-1, 0.2], [1, 0.2], [-0.7, -0.5], [0.7, -0.5], [-1, 0.7], [1, 0.7]]) for (let k = 0; k < 18; k++) { x.fillStyle = '#1f8a3a'; x.fillRect(Math.round(tx + dx * k), Math.round(ty + dy * k + k * k * 0.03), 3, 2); }
          };
          palm(40, 80); palm(200, 64); palm(330, 90); palm(460, 70);
        }), f: 0.5 },
      ],
    },
    snow: {
      sky: gradient('#7aa8e0', '#e8f4ff'),
      layers: [
        { c: layer(512, 224, (x) => { const r = rng(17); for (let i = 0; i < 512; i++) { const h = Math.round(100 + Math.sin(i * 0.021) * 30 + Math.sin(i * 0.057 + 2) * 12); x.fillStyle = '#7890c8'; x.fillRect(i, h, 1, 224 - h); x.fillStyle = '#ffffff'; x.fillRect(i, h, 1, 6 + ((r() * 3) | 0)); } }), f: 0.15 },
        { c: layer(512, 224, (x) => { for (let k = 0; k < 14; k++) { const cx = k * 37 + (k % 3) * 9, base = 190 + (k % 2) * 10, ht = 40 + (k % 4) * 8; for (let y = 0; y < ht; y++) { const w = Math.round((y / ht) * 12) + 1; x.fillStyle = (y % 8 < 2) ? '#ffffff' : '#2a6a5a'; x.fillRect(cx - w, base - ht + y, w * 2, 1); } x.fillStyle = '#4a3020'; x.fillRect(cx - 2, base, 4, 34); } }), f: 0.45 },
      ],
    },
    castle: {
      sky: gradient('#1a0610', '#3a0a14'),
      layers: [
        { c: layer(512, 224, (x) => {
          x.fillStyle = '#2a0e1c'; x.fillRect(0, 0, 512, 224);
          for (let yy = 0; yy < 224; yy += 8) for (let xx = (yy / 8) % 2 ? 0 : 8; xx < 512; xx += 16) { x.fillStyle = '#34122a'; x.fillRect(xx, yy, 15, 7); }
          for (let k = 0; k < 4; k++) {
            const cx = 40 + k * 128;
            x.fillStyle = '#100408'; x.fillRect(cx, 70, 24, 50); for (let yy = -12; yy <= 0; yy++) { const h = Math.round(Math.sqrt(144 - yy * yy)); x.fillRect(cx + 12 - h, 70 + yy, h * 2, 1); }
            x.fillStyle = '#ff6020'; x.fillRect(cx + 4, 100, 16, 20); x.fillStyle = '#ffa040'; x.fillRect(cx + 6, 108, 12, 12);
          }
        }), f: 0.3 },
        { c: layer(512, 224, (x) => { for (let k = 0; k < 6; k++) { const cx = k * 90 + 20; x.fillStyle = '#1e0814'; x.fillRect(cx, 0, 20, 224); x.fillStyle = '#3a1428'; x.fillRect(cx, 0, 3, 224); x.fillStyle = '#ff9030'; x.fillRect(cx + 7, 60, 6, 8); x.fillStyle = '#ffe060'; x.fillRect(cx + 9, 56, 2, 6); } }), f: 0.55 },
      ],
    },
  };

  // ---- extra parallax layers for every world ----
  const disc = (x, cx, cy, r, col) => { for (let yy = -r; yy <= r; yy++) { const h = Math.round(Math.sqrt(r * r - yy * yy)); x.fillStyle = col; x.fillRect(Math.round(cx - h), Math.round(cy + yy), h * 2, 1); } };
  const peaks = (x, base, amp, period, col, cap, seed) => {
    const r = rng(seed);
    const pk = []; for (let i = -period; i < 512 + period; i += period * (0.6 + r() * 0.8)) pk.push([i, base - amp * (0.5 + r() * 0.5)]);
    for (let i = 0; i < 512; i++) {
      let h = 224;
      for (const [px0, py] of pk) h = Math.min(h, py + Math.abs(i - px0) * 1.1);
      h = Math.round(h); x.fillStyle = col; x.fillRect(i, h, 1, 224 - h);
      if (cap) { x.fillStyle = cap; x.fillRect(i, h, 1, Math.max(0, Math.min(10, base - h - 8))); }
    }
  };
  const extra = {
    grass: [
      { c: layer(512, 224, (x) => peaks(x, 120, 60, 90, '#9ac0e8', '#f0f8ff', 4)), f: 0.06 },
      { c: layer(512, 224, (x) => { const r = rng(21); for (let i = 0; i < 26; i++) { const cx = i * 20 + r() * 10, rr = 8 + r() * 8; disc(x, cx, 194, rr, '#1f7a3a'); disc(x, cx - 2, 192, rr - 3, '#2f9a48'); x.fillStyle = '#5ac868'; x.fillRect(Math.round(cx - rr / 2), Math.round(194 - rr + 2), 3, 1); } }), f: 0.7 },
    ],
    cave: [
      { c: layer(512, 224, (x) => { const r = rng(31); for (let i = 0; i < 22; i++) { const cx = (r() * 512) | 0, cy = 50 + ((r() * 110) | 0), h = 4 + ((r() * 6) | 0), col = ['#5ff0ff', '#f078ff', '#80ff98'][i % 3]; for (let k = 0; k < h; k++) { const w = k < h / 2 ? k : h - k; x.fillStyle = col; x.fillRect(cx - w, cy + k, w * 2 + 1, 1); } x.fillStyle = '#ffffff'; x.fillRect(cx, cy + 1, 1, 1); } }), f: 0.1 },
      { c: layer(512, 224, (x) => { const r = rng(33); for (let i = 0; i < 18; i++) { const cx = i * 29 + ((r() * 12) | 0), len = 40 + ((r() * 40) | 0), w = 4 + ((r() * 5) | 0); for (let k = 0; k < len; k++) { const ww = Math.max(0, Math.round(w * (1 - k / len))); x.fillStyle = k % 9 < 1 ? '#3a2a58' : '#160c2a'; x.fillRect(cx - ww, k, ww * 2 + 1, 1); } x.fillStyle = '#7af0ff'; x.fillRect(cx, len + 2 + (i % 3) * 3, 1, 2); } }), f: 0.7 },
    ],
    sky: [
      { c: layer(512, 224, (x) => { x.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 9; i++) x.fillRect((i * 61) % 512, 20 + i * 9, 50 + (i % 4) * 20, 1); }), f: 0.06, drift: 0.15 },
      { c: layer(512, 224, (x) => { [[80, 110, 26], [260, 90, 20], [420, 128, 30]].forEach(([cx, cy, w]) => { for (let k = 0; k < w; k++) { const ww = Math.round(w * (1 - k / w) * 0.9); x.fillStyle = k < 3 ? '#4ac060' : k % 5 ? '#a07858' : '#80583a'; x.fillRect(cx - ww, cy + k, ww * 2, 1); } x.fillStyle = '#2f9a48'; x.fillRect(cx - w + 4, cy - 6, 3, 6); disc(x, cx - w + 5, cy - 9, 5, '#2f9a48'); }); }), f: 0.25 },
    ],
    castle: [
      { c: layer(512, 224, (x) => { for (let k = 0; k < 4; k++) { const cx = 70 + k * 128; x.fillStyle = '#1a0610'; x.fillRect(cx - 1, 32, 22, 4); for (let yy = 36; yy < 96; yy++) { const sw = yy > 86 ? Math.abs(91 - yy) : 0; x.fillStyle = '#a01828'; x.fillRect(cx + sw / 2, yy, 20 - sw, 1); } x.fillStyle = '#ffe040'; x.fillRect(cx + 9, 46, 4, 6); x.fillRect(cx + 7, 52, 4, 4); x.fillRect(cx + 9, 56, 4, 6); x.fillStyle = '#e04050'; x.fillRect(cx + 1, 36, 2, 50); } }), f: 0.42 },
      { c: layer(512, 224, (x) => { for (let k = 0; k < 6; k++) { const cx = 40 + k * 86, len = 60 + (k % 3) * 30; for (let yy = 32; yy < 32 + len; yy += 4) { x.fillStyle = '#5a5a6a'; x.fillRect(cx, yy, 2, 3); x.fillStyle = '#8a8a9a'; x.fillRect(cx, yy, 1, 1); } x.fillStyle = '#3a3a4a'; x.fillRect(cx - 3, 32 + len, 8, 6); } }), f: 0.72 },
    ],
    beach: [
      { c: layer(512, 224, (x) => { [[60, 0], [250, 1], [400, 0]].forEach(([bx, big]) => { const s2 = big ? 1.4 : 1; x.fillStyle = '#ffffff'; for (let k = 0; k < 12 * s2; k++) x.fillRect(Math.round(bx + 2), Math.round(134 - k), Math.round((12 * s2 - k) * 0.6), 1); x.fillStyle = '#8a4a2a'; x.fillRect(bx - 6, 134, 18 * s2, 3); x.fillStyle = '#1a1020'; x.fillRect(bx + 1, 120 - 4 * s2, 1, 16 * s2); }); }), f: 0.16 },
      { c: layer(512, 224, (x) => { const r = rng(41); for (let i = 0; i < 9; i++) { const cx = i * 60 + r() * 20, rr = 22 + r() * 12; for (let yy = -rr; yy <= 0; yy++) { const h = Math.round(Math.sqrt(rr * rr - yy * yy) * 1.4); x.fillStyle = yy > -4 ? '#d8b060' : '#f0d088'; x.fillRect(Math.round(cx - h), 200 + yy, h * 2, 1); } x.fillStyle = '#4a9a40'; for (let g = 0; g < 4; g++) x.fillRect(Math.round(cx - 6 + g * 4), Math.round(200 - rr - 3), 1, 4); } }), f: 0.72 },
    ],
    snow: [
      { c: layer(512, 224, (x) => peaks(x, 110, 70, 110, '#c0cce8', '#ffffff', 7)), f: 0.05 },
      { c: layer(512, 224, (x) => { const r = rng(51); for (let i = 0; i < 12; i++) { const cx = i * 44 + r() * 20, rr = 12 + r() * 10; for (let yy = -rr; yy <= 0; yy++) { const h = Math.round(Math.sqrt(rr * rr - yy * yy) * 1.6); x.fillStyle = yy > -3 ? '#b8d0f0' : '#ffffff'; x.fillRect(Math.round(cx - h), 198 + yy, h * 2, 1); } } }), f: 0.75 },
    ],
  };
  for (const k of Object.keys(extra)) { S.bg[k].layers.push(...extra[k]); S.bg[k].layers.sort((a, b) => a.f - b.f); }

  // ---- bonus worlds: haunted manor, coral depths, sky armada ----
  S.bg.haunted = {
    sky: gradient('#0a0618', '#2a1838'),
    layers: [
      { c: layer(512, 224, (x) => { disc(x, 380, 50, 22, '#f0e8c8'); disc(x, 372, 44, 5, '#d8d0b0'); disc(x, 388, 58, 4, '#d8d0b0'); x.fillStyle = '#1a1020'; for (const [bx, by] of [[330, 40], [350, 60], [420, 30]]) { x.fillRect(bx, by, 6, 2); x.fillRect(bx - 2, by - 1, 2, 2); x.fillRect(bx + 6, by - 1, 2, 2); } }), f: 0.03 },
      { c: layer(512, 224, (x) => { x.fillStyle = '#1c1028'; x.fillRect(150, 90, 120, 134); x.fillRect(170, 60, 20, 40); x.fillRect(230, 50, 24, 50); for (let k = 0; k < 12; k++) { const w = 30 - k * 2.5; x.fillRect(Math.round(180 - w / 2), 48 + k, Math.round(w), 1); x.fillRect(Math.round(242 - w / 2), 38 + k, Math.round(w), 1); } x.fillStyle = '#ffd860'; [[170, 110], [200, 110], [230, 110], [185, 140], [245, 140]].forEach(([wx, wy], i) => { if (i !== 2) x.fillRect(wx, wy, 6, 8); }); }), f: 0.15 },
      { c: layer(512, 224, (x) => { const tree = (tx, h) => { x.fillStyle = '#140a1c'; x.fillRect(tx, 224 - h, 6, h); for (const [dx, dy, len, dir] of [[3, h * 0.6, 20, -1], [3, h * 0.75, 18, 1], [3, h * 0.9, 12, -1]]) for (let k = 0; k < len; k++) x.fillRect(Math.round(tx + dx + dir * k), Math.round(224 - dy - k * 0.6), 2, 2); }; tree(40, 120); tree(200, 100); tree(330, 130); tree(460, 110); }), f: 0.4 },
      { c: layer(512, 224, (x) => { for (let k = 0; k < 10; k++) { const gx = k * 52 + 10; x.fillStyle = '#4a4058'; x.fillRect(gx, 180, 12, 18); x.fillRect(gx + 2, 176, 8, 4); x.fillStyle = '#2a2238'; x.fillRect(gx + 4, 184, 4, 1); x.fillRect(gx + 5, 182, 2, 6); } x.fillStyle = '#1a1424'; for (let i = 0; i < 512; i += 6) x.fillRect(i, 170, 2, 30); x.fillRect(0, 174, 512, 2); }), f: 0.7 },
    ],
  };
  S.bg.water = {
    sky: gradient('#2a8ad8', '#0a2a60'),
    layers: [
      { c: layer(512, 224, (x) => { x.fillStyle = 'rgba(200,240,255,0.10)'; for (let k = 0; k < 8; k++) for (let y = 0; y < 224; y++) x.fillRect(k * 64 + Math.round(y * 0.35), y, 14, 1); }), f: 0.05, drift: 0.08 },
      { c: layer(512, 224, (x) => { for (let k = 0; k < 4; k++) { const cx = 60 + k * 128; x.fillStyle = '#1a4a80'; x.fillRect(cx - 30, 110, 16, 114); x.fillRect(cx + 14, 110, 16, 114); for (let a = 0; a <= 20; a++) { const t = (a / 20) * Math.PI; x.fillRect(Math.round(cx - 22 * Math.cos(t)) - 8, Math.round(110 - 30 * Math.sin(t)), 16, 8); } } }), f: 0.2 },
      { c: layer(512, 224, (x) => { for (let k = 0; k < 18; k++) { const cx = k * 29 + (k % 3) * 7, h = 40 + (k % 4) * 15; for (let y = 0; y < h; y++) { x.fillStyle = y % 6 < 3 ? '#1f8a5a' : '#2aa86a'; x.fillRect(Math.round(cx + Math.sin(y * 0.2 + k) * 3), 224 - y, 3, 1); } } }), f: 0.5 },
      { c: layer(512, 224, (x) => { const r = rng(61); for (let k = 0; k < 10; k++) { const cx = k * 50 + r() * 20, col = ['#ff7090', '#ffa040', '#c070ff'][k % 3]; for (let b = 0; b < 5; b++) { x.fillStyle = col; const bx = cx + (b - 2) * 5, bh = 8 + ((r() * 14) | 0); x.fillRect(Math.round(bx), 214 - bh, 3, bh); disc(x, bx + 1, 214 - bh, 2, col); } } }), f: 0.75 },
    ],
  };
  S.bg.airship = {
    sky: gradient('#ff9a60', '#5a3a8a'),
    layers: [
      { c: layer(512, 224, (x) => { disc(x, 100, 150, 26, '#ffd890'); cloud(x, 300, 60, 1, '#ffc0a0', '#e8a090'); cloud(x, 450, 100, 0.8, '#ffc0a0', '#e8a090'); }), f: 0.05, drift: 0.1 },
      { c: layer(512, 224, (x) => { const ship = (sx, sy, s2) => { x.fillStyle = '#3a2a5a'; for (let yy = -8; yy <= 8; yy++) { const h = Math.round(Math.sqrt(64 - yy * yy) * 3 * s2); x.fillRect(sx - h, sy + yy * s2, h * 2, Math.ceil(s2)); } x.fillRect(sx - 14 * s2, sy + 10 * s2, 28 * s2, 6 * s2); x.fillRect(sx - 1, sy + 8 * s2, 2, 3 * s2); }; ship(80, 80, 1); ship(300, 60, 0.7); ship(440, 110, 1.2); }), f: 0.2 },
      { c: layer(512, 224, (x) => { cloud(x, 40, 190, 2, '#ffd0c0', '#e0a8b0'); cloud(x, 260, 200, 2.4, '#ffd0c0', '#e0a8b0'); cloud(x, 420, 185, 1.8, '#ffd0c0', '#e0a8b0'); }), f: 0.5 },
    ],
  };
  // ---- bonus-world enemies ----
  const FPAL = { K: '#1a1020', O: '#ff9020', o: '#c05010', W: '#ffffff', E: '#1a1020' };
  const fishMid = ['KOOKOOoOOOOWKK..', 'KOOOOOOoOOOOOOK.', 'KOOKOOoOOOOOKK..'];
  const fi = [
    fromRows(['................', '................', '................', '.......KKKK.....', '.K...KKOOOOKK...', 'KOK.KOOOOOOWEK..'].concat(fishMid, ['KOK.KOOOOOOOK...', '.K...KKOOOOKK...', '.......KKKK.....', '................', '................', '................', '................']), FPAL),
    fromRows(['................', '................', '................', '.......KKKK.....', '.....KKOOOOKK...', '.KK.KOOOOOOWEK..'].concat(fishMid, ['.KK.KOOOOOOOK...', '.....KKOOOOKK...', '.......KKKK.....', '................', '................', '................', '................']), FPAL),
  ];
  S.fish = { r: fi, l: fi.map(flip) };
  const JPAL = { K: '#5a1a7a', P: '#e080ff', p: '#ffc8ff', E: '#1a1020' };
  const jTop = ['................', '.....KKKKKK.....', '....KKPPPPKK....', '...KPPpPPPPPK...', '..KPPpPPPPPPPK..', '..KPPPPPPPPPPK..', '..KPPEPPPPEPPK..', '..KKKKKKKKKKKK..'];
  S.jelly = [
    fromRows(jTop.concat(['...K.K.K.K.K....', '...K.K.K.K.K....', '..K.K.K.K.K.....', '..K.K.K.K.K.....', '...K.K.K.K.K....', '................', '................', '................']), JPAL),
    fromRows(jTop.concat(['...K.K.K.K.K....', '....K.K.K.K.K...', '....K.K.K.K.K...', '...K.K.K.K.K....', '...K.K.K.K.K....', '................', '................', '................']), JPAL),
  ];
  const GPAL2 = { K: '#6a5a9a', W: '#e8e8ff', E: '#2a1a4a', O: '#2a1a4a' };
  const gTop = ['................', '.....KKKKKK.....', '....KWWWWWWK....', '...KWWWWWWWWK...', '..KWWEEWWEEWWK..', '..KWWEEWWEEWWK..', '..KWWWWWWWWWWK..', '..KWWWWOOWWWWK..', '..KWWWWOOWWWWK..', '..KWWWWWWWWWWK..', '..KWWWWWWWWWWK..'];
  const gh = [
    fromRows(gTop.concat(['..KWKWWKWWKWWK..', '..KK.KK.KK.KKK..', '................', '................', '................']), GPAL2),
    fromRows(gTop.concat(['..KWWKWWKWWKWK..', '..KK.KK.KK.KK...', '................', '................', '................']), GPAL2),
  ];
  S.ghost = { r: gh, l: gh.map(flip) };

  // ================= six more parallax layers for every world =================
  const flock = (x, cx, cy, n, col, r) => { for (let i = 0; i < n; i++) { const bx = Math.round(cx + r() * 50 - 25), by = Math.round(cy + r() * 18); x.fillStyle = col; x.fillRect(bx, by, 2, 1); x.fillRect(bx + 2, by - 1, 1, 1); x.fillRect(bx - 1, by - 1, 1, 1); } };
  const motes = (x, n, cols, y0, y1, size, seed, tall = 1) => { const r = rng(seed); for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect((r() * 512) | 0, (y0 + r() * (y1 - y0)) | 0, size, size * tall); } };
  const fogBand = (x, y, h, col) => { x.fillStyle = col; for (let i = 0; i < 512; i++) x.fillRect(i, Math.round(y + Math.sin(i * 0.03) * 3 + Math.sin(i * 0.011 + 1) * 4), 1, h); };
  const pine = (x, cx, base, ht, col, snow) => { for (let y = 0; y < ht; y++) { const w = Math.round((y / ht) * ht * 0.35) + 1; x.fillStyle = snow && y % 7 < 2 ? snow : col; x.fillRect(cx - w, base - ht + y, w * 2, 1); } };
  const treeline = (x, base, col, seed, h0, h1) => { const r = rng(seed); for (let cx = 0; cx < 520; cx += 6 + ((r() * 6) | 0)) pine(x, cx, base, h0 + ((r() * (h1 - h0)) | 0), col); x.fillStyle = col; x.fillRect(0, base, 512, 224 - base); };
  const tri = (x, cx, base, w, h, col) => { for (let y = 0; y < h; y++) { const ww = Math.round((w * (y + 1)) / h / 2); x.fillStyle = col; x.fillRect(cx - ww, base - h + y, ww * 2 + 1, 1); } };
  const more = {
    grass: [
      { c: layer(512, 224, (x) => { const r = rng(71); flock(x, 80, 40, 5, '#3a5a7a', r); flock(x, 300, 60, 4, '#3a5a7a', r); flock(x, 450, 28, 6, '#3a5a7a', r); }), f: 0.04, drift: 0.25 },
      { c: layer(512, 224, (x) => treeline(x, 150, '#6aa8a0', 72, 10, 22)), f: 0.13 },
      { c: layer(512, 224, (x) => { for (const wx of [60, 260, 420]) { for (let y = 0; y < 30; y++) { const w = 3 + Math.round(y / 6); x.fillStyle = '#e8e0d0'; x.fillRect(wx - w, 104 + y, w * 2, 1); } x.fillStyle = '#7a6a5a'; x.fillRect(wx - 3, 112, 6, 6); for (let k = -14; k <= 14; k++) { x.fillRect(wx + k, 104, 1, 2); x.fillRect(wx, 104 + k, 2, 1); } x.fillStyle = '#5a4a3a'; x.fillRect(wx - 1, 103, 3, 3); } }), f: 0.18 },
      { c: layer(512, 224, (x) => fogBand(x, 150, 6, 'rgba(255,255,255,0.35)')), f: 0.32 },
      { c: layer(512, 224, (x) => motes(x, 140, ['#ff6080', '#ffd040', '#ffffff', '#c070ff'], 184, 198, 2, 73)), f: 0.6 },
      { c: layer(512, 224, (x) => motes(x, 18, ['#fff8a0', '#ffffff'], 60, 170, 1, 74)), f: 0.85, drift: 0.3 },
    ],
    cave: [
      { c: layer(512, 224, (x) => { const r = rng(81); for (let i = 0; i < 9; i++) disc(x, r() * 512, 40 + r() * 140, 22 + r() * 26, 'rgba(150,80,220,0.12)'); }), f: 0.05 },
      { c: layer(512, 224, (x) => { const r = rng(82); for (let i = 0; i < 16; i++) tri(x, (i * 33 + r() * 20) | 0, 224, 14 + ((r() * 12) | 0), 30 + ((r() * 50) | 0), '#24183c'); }), f: 0.15 },
      { c: layer(512, 224, (x) => { const r = rng(83); for (let i = 0; i < 7; i++) { const cx = (i * 75 + r() * 30) | 0; for (let k = 0; k < 3; k++) { const mx = cx + k * 7, h = 6 + k * 3, col = k % 2 ? '#ff70e0' : '#5ff0ff'; x.fillStyle = '#c8b8e0'; x.fillRect(mx, 200 - h, 2, h); disc(x, mx + 1, 200 - h, 3 + (k & 1), col); x.fillStyle = '#ffffff'; x.fillRect(mx, 198 - h, 1, 1); } } }), f: 0.3 },
      { c: layer(512, 224, (x) => { for (let k = 0; k < 5; k++) { const bx = 40 + k * 120; x.fillStyle = '#4a3020'; x.fillRect(bx, 40, 6, 184); x.fillRect(bx + 40, 40, 6, 184); x.fillRect(bx - 4, 40, 54, 6); x.fillStyle = '#6a4a30'; x.fillRect(bx, 40, 2, 184); x.fillStyle = '#ffd860'; x.fillRect(bx + 20, 48, 6, 7); x.fillStyle = '#1a1020'; x.fillRect(bx + 22, 46, 2, 2); } }), f: 0.55 },
      { c: layer(512, 224, (x) => motes(x, 30, ['#7af0ff'], 40, 200, 1, 85, 3)), f: 0.65 },
      { c: layer(512, 224, (x) => motes(x, 40, ['#c8b8f0', '#8a7ab8'], 30, 210, 1, 86)), f: 0.85 },
    ],
    sky: [
      { c: layer(512, 224, (x) => motes(x, 60, ['rgba(255,255,255,0.7)'], 0, 70, 1, 91)), f: 0.01 },
      { c: layer(512, 224, (x) => { const bx = 150, by = 70; for (let yy = -10; yy <= 10; yy++) { const h = Math.round(Math.sqrt(100 - yy * yy)); for (let xx = -h; xx < h; xx++) { x.fillStyle = ((xx + 20) >> 2) % 2 ? '#ff6070' : '#ffe080'; x.fillRect(bx + xx, by + yy, 1, 1); } } x.fillStyle = '#6a3a2a'; x.fillRect(bx - 3, by + 14, 6, 4); x.fillStyle = '#3a2a2a'; x.fillRect(bx - 4, by + 9, 1, 6); x.fillRect(bx + 3, by + 9, 1, 6); }), f: 0.07, drift: 0.05 },
      { c: layer(512, 224, (x) => { for (let i = 0; i < 8; i++) cloud(x, i * 64 + 10, 110 + (i % 3) * 6, 0.5, '#ffd0c0', '#f0b0a8'); }), f: 0.1 },
      { c: layer(512, 224, (x) => { const r = rng(94); flock(x, 120, 70, 5, '#a05060', r); flock(x, 390, 50, 6, '#a05060', r); }), f: 0.22, drift: 0.3 },
      { c: layer(512, 224, (x) => { for (const [cx, cy, w] of [[100, 130, 16], [360, 110, 20]]) { for (let k = 0; k < w; k++) { const ww = Math.round(w * (1 - k / w) * 0.8); x.fillStyle = k < 2 ? '#5ac860' : '#9a7050'; x.fillRect(cx - ww, cy + k, ww * 2, 1); } x.fillStyle = 'rgba(220,240,255,0.8)'; x.fillRect(cx + 4, cy + 2, 2, 60); x.fillRect(cx + 7, cy + 2, 1, 50); } }), f: 0.42 },
      { c: layer(512, 224, (x) => { fogBand(x, 120, 3, 'rgba(255,230,230,0.3)'); fogBand(x, 196, 4, 'rgba(255,255,255,0.45)'); }), f: 0.62 },
    ],
    castle: [
      { c: layer(512, 224, (x) => { for (let k = 0; k < 8; k++) { const ax = 20 + k * 64; x.fillStyle = '#100408'; x.fillRect(ax, 44, 14, 22); for (let yy = -7; yy <= 0; yy++) { const h = Math.round(Math.sqrt(49 - yy * yy)); x.fillRect(ax + 7 - h, 44 + yy, h * 2, 1); } x.fillStyle = '#3a1428'; x.fillRect(ax + 4, 38, 1, 28); x.fillRect(ax + 9, 38, 1, 28); x.fillRect(ax, 54, 14, 1); } }), f: 0.33 },
      { c: layer(512, 224, (x) => motes(x, 90, ['#4a1a34', '#3a1028'], 0, 224, 3, 102)), f: 0.38 },
      { c: layer(512, 224, (x) => { for (let k = 0; k < 4; k++) { const sx = 60 + k * 128; x.fillStyle = '#2a1a2a'; x.fillRect(sx - 8, 196, 16, 28); x.fillRect(sx - 5, 160, 10, 36); x.fillRect(sx - 4, 150, 8, 10); x.fillRect(sx - 8, 166, 16, 10); x.fillRect(sx + 9, 140, 2, 56); tri(x, sx + 10, 142, 4, 6, '#2a1a2a'); x.fillStyle = '#ff5030'; x.fillRect(sx - 2, 154, 4, 1); } }), f: 0.48 },
      { c: layer(512, 224, (x) => { x.fillStyle = 'rgba(200,200,220,0.35)'; for (let k = 0; k < 3; k++) { const wx = k * 170; for (let a = 0; a < 5; a++) { const ang = (a / 4) * (Math.PI / 2); for (let r2 = 0; r2 < 34; r2++) x.fillRect(Math.round(wx + Math.cos(ang) * r2), Math.round(32 + Math.sin(ang) * r2), 1, 1); } for (const rr of [10, 20, 30]) for (let a = 0; a < 20; a++) { const ang = (a / 19) * (Math.PI / 2); x.fillRect(Math.round(wx + Math.cos(ang) * rr), Math.round(32 + Math.sin(ang) * rr), 1, 1); } } }), f: 0.6 },
      { c: layer(512, 224, (x) => { x.fillStyle = '#3a1a24'; x.fillRect(0, 200, 512, 6); for (let k = 0; k < 24; k++) { const cx = k * 21 + 6; x.fillStyle = '#f0e8d0'; x.fillRect(cx, 192, 3, 8); x.fillStyle = '#ffb030'; x.fillRect(cx, 189, 3, 3); x.fillStyle = '#ffffff'; x.fillRect(cx + 1, 190, 1, 1); } }), f: 0.65 },
      { c: layer(512, 224, (x) => motes(x, 40, ['#ff9030', '#ffd060'], 40, 210, 1, 106)), f: 0.82 },
    ],
    beach: [
      { c: layer(512, 224, (x) => { const r = rng(111); flock(x, 140, 40, 4, '#ffffff', r); flock(x, 380, 60, 5, '#e0e8f0', r); }), f: 0.06, drift: 0.3 },
      { c: layer(512, 224, (x) => { const lx = 200; x.fillStyle = '#5a8a50'; x.fillRect(lx - 14, 132, 28, 4); for (let y = 0; y < 30; y++) { const w = 4 - Math.floor(y / 12); x.fillStyle = (y >> 2) % 2 ? '#e83030' : '#ffffff'; x.fillRect(lx - w, 102 + y, w * 2, 1); } x.fillStyle = '#1a1020'; x.fillRect(lx - 3, 98, 6, 4); x.fillStyle = '#ffe060'; x.fillRect(lx - 2, 99, 4, 2); x.fillStyle = 'rgba(255,240,150,0.35)'; for (let k = 0; k < 30; k++) x.fillRect(lx + 3 + k, 99 - Math.round(k * 0.15), 1, 2 + Math.round(k * 0.2)); }), f: 0.17 },
      { c: layer(512, 224, (x) => { fogBand(x, 150, 1, 'rgba(255,255,255,0.6)'); fogBand(x, 168, 1, 'rgba(255,255,255,0.45)'); fogBand(x, 186, 1, 'rgba(255,255,255,0.35)'); }), f: 0.22 },
      { c: layer(512, 224, (x) => { const kx = 120, ky = 50; for (let y = -8; y <= 8; y++) { const w = 6 - Math.abs(y) * 0.7; x.fillStyle = y < 0 ? '#ff4060' : '#ffd040'; x.fillRect(Math.round(kx - w), ky + y, Math.round(w * 2), 1); } x.fillStyle = '#ffffff'; for (let k = 0; k < 24; k++) x.fillRect(kx - 1 + Math.round(Math.sin(k * 0.5) * 3), ky + 9 + k, 1, 1); }), f: 0.3, drift: 0.15 },
      { c: layer(512, 224, (x) => { for (const [ux, c1, c2] of [[80, '#ff4060', '#ffffff'], [260, '#40a0ff', '#ffe040'], [430, '#40c060', '#ffffff']]) { x.fillStyle = '#8a6a4a'; x.fillRect(ux, 172, 2, 22); for (let yy = -9; yy <= 0; yy++) { const h = Math.round(Math.sqrt(81 - yy * yy) * 1.4); for (let xx = -h; xx < h; xx++) { x.fillStyle = ((xx + 20) >> 2) % 2 ? c1 : c2; x.fillRect(ux + 1 + xx, 172 + yy, 1, 1); } } } }), f: 0.6 },
      { c: layer(512, 224, (x) => { const r = rng(116); for (let i = 0; i < 12; i++) { const sx = (r() * 500) | 0, sy = 204 + ((r() * 10) | 0); if (i % 2) { x.fillStyle = '#ff8060'; x.fillRect(sx, sy, 5, 1); x.fillRect(sx + 2, sy - 2, 1, 5); x.fillRect(sx + 1, sy + 1, 1, 1); x.fillRect(sx + 3, sy + 1, 1, 1); } else { x.fillStyle = '#fff0d0'; x.fillRect(sx, sy, 4, 3); x.fillStyle = '#d8b090'; x.fillRect(sx + 1, sy + 1, 2, 1); } } }), f: 0.82 },
    ],
    snow: [
      { c: layer(512, 224, (x) => { for (let i = 0; i < 512; i++) { const y = Math.round(30 + Math.sin(i * 0.02) * 10 + Math.sin(i * 0.05) * 4); for (let k = 0; k < 22; k++) { x.fillStyle = `rgba(${k < 8 ? '120,255,170' : '190,120,255'},${0.32 * (1 - k / 22)})`; x.fillRect(i, y + k, 1, 1); } } }), f: 0.02 },
      { c: layer(512, 224, (x) => treeline(x, 160, '#5a7898', 121, 10, 20)), f: 0.25 },
      { c: layer(512, 224, (x) => { const cx = 300; x.fillStyle = '#6a4028'; x.fillRect(cx - 14, 176, 28, 16); x.fillStyle = '#ffffff'; for (let k = 0; k < 10; k++) x.fillRect(cx - 17 + k, 176 - k, 34 - k * 2, 1); x.fillStyle = '#ffd860'; x.fillRect(cx - 8, 181, 5, 5); x.fillRect(cx + 4, 181, 5, 5); x.fillStyle = '#5a3a2a'; x.fillRect(cx + 7, 164, 4, 8); for (let k = 0; k < 4; k++) disc(x, cx + 10 + k * 4, 158 - k * 6, 2 + k, 'rgba(220,225,240,0.7)'); }), f: 0.35 },
      { c: layer(512, 224, (x) => motes(x, 40, ['#ffffff', '#a0e0ff'], 80, 200, 1, 124)), f: 0.5 },
      { c: layer(512, 224, (x) => { for (let yy = -5; yy <= 5; yy++) { const h = Math.round(Math.sqrt(25 - yy * yy) * 18); x.fillStyle = yy < 0 ? '#d8ecff' : '#b8d8f4'; x.fillRect(180 - h, 200 + yy, h * 2, 1); } x.fillStyle = '#ffffff'; x.fillRect(120, 197, 20, 1); x.fillRect(200, 199, 30, 1); }), f: 0.6 },
      { c: layer(512, 224, (x) => motes(x, 22, ['#ffffff'], 0, 224, 2, 126)), f: 0.9 },
    ],
    haunted: [
      { c: layer(512, 224, (x) => motes(x, 70, ['#ffffff', '#c8c0ff'], 0, 120, 1, 131)), f: 0.01 },
      { c: layer(512, 224, (x) => { const r = rng(132); flock(x, 100, 60, 7, '#000000', r); flock(x, 420, 40, 5, '#000000', r); }), f: 0.05, drift: 0.3 },
      { c: layer(512, 224, (x) => { for (const cx of [60, 300]) { x.fillStyle = '#140a20'; x.fillRect(cx - 18, 130, 36, 94); x.fillRect(cx - 5, 96, 10, 34); tri(x, cx, 96, 12, 26, '#140a20'); x.fillRect(cx - 1, 62, 2, 10); x.fillRect(cx - 4, 65, 8, 2); x.fillStyle = '#ffd860'; x.fillRect(cx - 2, 108, 4, 6); } }), f: 0.1 },
      { c: layer(512, 224, (x) => { fogBand(x, 172, 10, 'rgba(160,140,200,0.18)'); fogBand(x, 190, 8, 'rgba(160,140,200,0.14)'); }), f: 0.25 },
      { c: layer(512, 224, (x) => { for (let k = 0; k < 4; k++) { const jx = 50 + k * 140; disc(x, jx, 196, 7, '#e86a10'); x.fillStyle = '#4a8a30'; x.fillRect(jx - 1, 187, 2, 3); x.fillStyle = '#ffe040'; x.fillRect(jx - 4, 193, 2, 2); x.fillRect(jx + 2, 193, 2, 2); x.fillRect(jx - 3, 198, 6, 1); } }), f: 0.55 },
      { c: layer(512, 224, (x) => motes(x, 25, ['#80ffb0', '#c0ffd8'], 60, 200, 2, 136)), f: 0.85 },
    ],
    water: [
      { c: layer(512, 224, (x) => { const wx = 200, wy = 70; for (let yy = -9; yy <= 9; yy++) { const h = Math.round(Math.sqrt(81 - yy * yy) * 3.4); x.fillStyle = '#0e3a70'; x.fillRect(wx - h, wy + yy, h * 2, 1); } for (let k = 0; k < 10; k++) { x.fillRect(wx - 30 - k, wy - k, 3, 2); x.fillRect(wx - 30 - k, wy + k - 2, 3, 2); } x.fillStyle = '#5a8ac0'; x.fillRect(wx + 18, wy - 2, 2, 2); }), f: 0.08, drift: 0.06 },
      { c: layer(512, 224, (x) => { const r = rng(142); for (const [cx, cy] of [[100, 120], [360, 90]]) for (let i = 0; i < 26; i++) { x.fillStyle = '#2a6ab0'; x.fillRect(Math.round(cx + r() * 40 - 20), Math.round(cy + r() * 20 - 10), 3, 1); } }), f: 0.15, drift: 0.2 },
      { c: layer(512, 224, (x) => { for (let k = 0; k < 22; k++) { const cx = k * 24 + 6, h = 90 + (k % 4) * 25; for (let y = 0; y < h; y++) { x.fillStyle = '#0e4a50'; x.fillRect(Math.round(cx + Math.sin(y * 0.08 + k) * 4), 224 - y, 3, 1); } } }), f: 0.3 },
      { c: layer(512, 224, (x) => { const sx = 320; for (let k = 0; k < 18; k++) { x.fillStyle = '#123a5a'; x.fillRect(sx - 40 + k, 196 - Math.round(k * 0.4), 80 - k * 2, 1); } x.fillRect(sx - 40, 196, 80, 28); x.fillRect(sx - 2, 130, 3, 66); x.fillRect(sx - 20, 140, 40, 2); x.fillStyle = '#1e5070'; x.fillRect(sx - 30, 200, 6, 6); x.fillRect(sx - 10, 200, 6, 6); }), f: 0.35 },
      { c: layer(512, 224, (x) => { for (const bx of [40, 170, 300, 440]) for (let k = 0; k < 14; k++) { x.fillStyle = 'rgba(216,244,255,0.5)'; const yy = 200 - k * 13, xx = bx + Math.round(Math.sin(k) * 3); x.fillRect(xx, yy, 3, 1); x.fillRect(xx, yy + 2, 3, 1); x.fillRect(xx - 1, yy + 1, 1, 1); x.fillRect(xx + 3, yy + 1, 1, 1); } }), f: 0.6 },
      { c: layer(512, 224, (x) => { const r = rng(146); for (let i = 0; i < 8; i++) { const jx = (r() * 500) | 0, jy = 60 + ((r() * 90) | 0); disc(x, jx, jy, 4, 'rgba(224,128,255,0.35)'); x.fillStyle = 'rgba(224,128,255,0.3)'; for (let t = 0; t < 4; t++) x.fillRect(jx - 3 + t * 2, jy + 3, 1, 6); } }), f: 0.42 },
    ],
    airship: [
      { c: layer(512, 224, (x) => { x.fillStyle = 'rgba(255,240,180,0.12)'; for (let k = 0; k < 7; k++) for (let i = 0; i < 160; i++) { const a = -1.2 + k * 0.25; x.fillRect(Math.round(100 + Math.cos(a) * i), Math.round(150 + Math.sin(a) * i), 6, 1); } }), f: 0.04 },
      { c: layer(512, 224, (x) => peaks(x, 205, 45, 100, '#4a2a6a', null, 151)), f: 0.08 },
      { c: layer(512, 224, (x) => { const r = rng(152); for (let i = 0; i < 10; i++) { const fx = (r() * 500) | 0, fy = 40 + ((r() * 60) | 0); x.fillStyle = '#5a3a7a'; x.fillRect(fx, fy, 10, 3); x.fillRect(fx + 1, fy - 1, 8, 1); x.fillRect(fx + 3, fy + 3, 4, 2); } }), f: 0.12, drift: 0.1 },
      { c: layer(512, 224, (x) => { const zx = 300, zy = 90; for (let yy = -9; yy <= 9; yy++) { const h = Math.round(Math.sqrt(81 - yy * yy) * 3.2); x.fillStyle = yy < -4 ? '#b0a0c8' : '#8a7aa8'; x.fillRect(zx - h, zy + yy, h * 2, 1); } x.fillStyle = '#6a5a88'; x.fillRect(zx - 34, zy - 10, 6, 20); x.fillStyle = '#5a3a2a'; x.fillRect(zx - 8, zy + 10, 16, 5); x.fillStyle = '#ffd860'; for (let k = 0; k < 3; k++) x.fillRect(zx - 6 + k * 5, zy + 11, 2, 2); }), f: 0.3 },
      { c: layer(512, 224, (x) => { for (let i = 0; i < 6; i++) cloud(x, i * 90 + 20, 145 + (i % 2) * 10, 0.9, '#ffb8c0', '#e898b0'); }), f: 0.4 },
      { c: layer(512, 224, (x) => { for (let i = 0; i < 512; i++) { const y = Math.round(14 + Math.abs(Math.sin((i / 128) * Math.PI)) * 14); x.fillStyle = '#3a2a2a'; x.fillRect(i, y, 1, 1); if (i % 16 === 0) { const c = ['#ff4060', '#ffd040', '#40a0ff', '#40c060'][(i / 16) % 4]; for (let k = 0; k < 6; k++) { x.fillStyle = c; x.fillRect(i - 3 + Math.floor(k / 2), y + 1 + k, 6 - k, 1); } } } }), f: 0.7 },
    ],
  };
  for (const k of Object.keys(more)) { S.bg[k].layers.push(...more[k]); S.bg[k].layers.sort((a, b) => a.f - b.f); }

  // ---- Star Isle worlds: volcano, factory, candy, moon ----
  S.bg.volcano = { sky: gradient('#2a0808', '#b03810'), layers: [
    { c: layer(512, 224, (x) => { for (let i = 0; i < 512; i++) { const d = Math.abs(i - 300), h = Math.max(0, 150 - d * 0.9); if (h > 0) { x.fillStyle = '#3a1410'; x.fillRect(i, 210 - h, 1, h + 14); } } x.fillStyle = '#ff7020'; x.fillRect(288, 60, 24, 4); x.fillStyle = 'rgba(255,140,40,0.35)'; for (let k = 0; k < 40; k++) x.fillRect(296 + Math.round(Math.sin(k * 0.7) * 6), 64 + k * 3, 3, 3); }), f: 0.04 },
    { c: layer(512, 224, (x) => { for (let k = 0; k < 12; k++) disc(x, 300 + Math.sin(k) * 10 + k * 4, 50 - k * 4, 8 + k, 'rgba(60,40,40,0.35)'); }), f: 0.06, drift: 0.04 },
    { c: layer(512, 224, (x) => peaks(x, 150, 60, 80, '#2a1010', null, 161)), f: 0.15 },
    { c: layer(512, 224, (x) => { for (let k = 0; k < 6; k++) { const lx = k * 90 + 20; x.fillStyle = '#ff5010'; for (let y = 160; y < 224; y++) x.fillRect(lx + Math.round(Math.sin(y * 0.1 + k) * 4), y, 4, 1); x.fillStyle = 'rgba(255,160,40,0.25)'; x.fillRect(lx - 6, 160, 16, 64); } }), f: 0.25 },
    { c: layer(512, 224, (x) => { const r = rng(165); for (let k = 0; k < 14; k++) tri(x, (k * 37 + r() * 20) | 0, 224, 18 + ((r() * 14) | 0), 20 + ((r() * 40) | 0), '#1a0c0c'); }), f: 0.5 },
    { c: layer(512, 224, (x) => motes(x, 50, ['#ff9030', '#ffd060', '#ff5020'], 20, 220, 1, 166)), f: 0.8, drift: 0.15 },
  ] };
  S.bg.factory = { sky: gradient('#3a3a4a', '#8a7060'), layers: [
    { c: layer(512, 224, (x) => { for (const sx of [60, 180, 330, 450]) { x.fillStyle = '#2a2a34'; x.fillRect(sx, 60, 16, 164); x.fillStyle = '#c03030'; x.fillRect(sx, 66, 16, 4); x.fillRect(sx, 80, 16, 4); for (let k = 0; k < 8; k++) disc(x, sx + 8 + k * 6, 54 - k * 5, 5 + k, 'rgba(120,120,130,0.4)'); } }), f: 0.06, drift: 0.03 },
    { c: layer(512, 224, (x) => { const gear = (gx, gy, r) => { for (let a = 0; a < 16; a++) { const t2 = (a / 16) * Math.PI * 2; x.fillStyle = '#4a4a58'; x.fillRect(Math.round(gx + Math.cos(t2) * (r + 3)) - 3, Math.round(gy + Math.sin(t2) * (r + 3)) - 3, 6, 6); } disc(x, gx, gy, r, '#4a4a58'); disc(x, gx, gy, r * 0.35, '#3a3a44'); }; gear(90, 120, 30); gear(140, 80, 18); gear(300, 140, 40); gear(440, 90, 24); }), f: 0.2 },
    { c: layer(512, 224, (x) => { for (const [py, h] of [[100, 8], [150, 6]]) { x.fillStyle = '#6a6070'; x.fillRect(0, py, 512, h); x.fillStyle = '#8a8090'; x.fillRect(0, py, 512, 1); for (let k = 0; k < 512; k += 40) { x.fillStyle = '#3a3440'; x.fillRect(k, py - 1, 4, h + 2); } } }), f: 0.35 },
    { c: layer(512, 224, (x) => { x.fillStyle = '#2a2a30'; for (let k = 0; k < 512; k += 64) { x.fillRect(k, 40, 4, 184); x.fillRect(k + 30, 40, 4, 184); for (let y = 40; y < 224; y += 30) for (let j = 0; j < 30; j++) { x.fillRect(k + j, y + j, 2, 1); x.fillRect(k + 30 - j, y + j, 2, 1); } } }), f: 0.55 },
    { c: layer(512, 224, (x) => { for (let k = 0; k < 8; k++) { const lx = k * 64 + 20; x.fillStyle = '#1a1a20'; x.fillRect(lx, 30, 2, 20); x.fillStyle = '#ffe080'; x.fillRect(lx - 4, 50, 10, 4); x.fillStyle = 'rgba(255,230,140,0.12)'; for (let y = 0; y < 60; y++) x.fillRect(lx - 4 - y / 3, 54 + y, 10 + (y * 2) / 3, 1); } }), f: 0.7 },
    { c: layer(512, 224, (x) => motes(x, 30, ['#ffe060', '#ffffff'], 40, 210, 1, 176)), f: 0.85 },
  ] };
  S.bg.candy = { sky: gradient('#ffc0e4', '#c0ecff'), layers: [
    { c: layer(512, 224, (x) => { for (let i = 0; i < 6; i++) cloud(x, i * 90 + 20, 40 + (i % 2) * 20, 1, '#ffffff', '#ffd8f0'); }), f: 0.05, drift: 0.08 },
    { c: layer(512, 224, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(120 + Math.abs(((i % 128) - 64)) * 0.9); x.fillStyle = ((i + h) >> 3) % 2 ? '#ffb0d8' : '#ffffff'; x.fillRect(i, h, 1, 224 - h); } }), f: 0.15 },
    { c: layer(512, 224, (x) => { for (let k = 0; k < 7; k++) { const lx = k * 75 + 20; x.fillStyle = '#ffffff'; x.fillRect(lx, 130, 3, 70); for (let a = 0; a < 3; a++) disc(x, lx + 1, 124, 14 - a * 4, ['#ff4080', '#ffd040', '#40c0ff'][(a + k) % 3]); } }), f: 0.35 },
    { c: layer(512, 224, (x) => { for (let k = 0; k < 12; k++) { const gx = k * 44 + 10; for (let yy = -12; yy <= 0; yy++) { const h = Math.round(Math.sqrt(144 - yy * yy)); x.fillStyle = ['#40d080', '#ff6080', '#ffb030', '#a060ff'][k % 4]; x.fillRect(gx - h, 200 + yy, h * 2, 1); } x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(gx - 5, 191, 3, 2); } }), f: 0.5 },
    { c: layer(512, 224, (x) => motes(x, 70, ['#ff4080', '#40c0ff', '#ffd040', '#40d080'], 0, 224, 2, 186)), f: 0.8 },
  ] };
  S.bg.moon = { sky: gradient('#000010', '#141838'), layers: [
    { c: layer(512, 224, (x) => motes(x, 120, ['#ffffff', '#c8d0ff', '#fff0c0'], 0, 200, 1, 191)), f: 0.01 },
    { c: layer(512, 224, (x) => { disc(x, 380, 60, 26, '#2a6ad8'); for (const [ax, ay, r] of [[372, 52, 9], [392, 66, 7], [370, 72, 5]]) disc(x, ax, ay, r, '#3cb050'); disc(x, 386, 46, 5, '#ffffff'); }), f: 0.02 },
    { c: layer(512, 224, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(150 + Math.sin(i * 0.02) * 10 + Math.sin(i * 0.07) * 4); x.fillStyle = '#4a4a5a'; x.fillRect(i, h, 1, 224 - h); } for (let k = 0; k < 8; k++) { const cx2 = k * 64 + 20; for (let yy = -3; yy <= 3; yy++) { const h = Math.round(Math.sqrt(9 - yy * yy) * 4); x.fillStyle = '#3a3a48'; x.fillRect(cx2 - h, 168 + yy, h * 2, 1); } } }), f: 0.12 },
    { c: layer(512, 224, (x) => { for (const dx of [80, 300]) { for (let yy = -16; yy <= 0; yy++) { const h = Math.round(Math.sqrt(256 - yy * yy) * 1.4); x.fillStyle = yy < -12 ? '#d0e0ff' : '#90a8d0'; x.fillRect(dx - h, 180 + yy, h * 2, 1); } x.fillStyle = '#5ff0ff'; x.fillRect(dx - 8, 172, 4, 3); x.fillRect(dx + 4, 172, 4, 3); x.fillStyle = '#6a7090'; x.fillRect(dx - 24, 180, 48, 6); } }), f: 0.3 },
    { c: layer(512, 224, (x) => { for (const ax of [40, 230, 420]) { x.fillStyle = '#5a6078'; x.fillRect(ax, 120, 2, 80); for (let k = 0; k < 6; k++) x.fillRect(ax - 4 + k, 130 + k * 10, 10 - k * 2, 1); x.fillStyle = '#ff3040'; x.fillRect(ax - 1, 116, 4, 4); } }), f: 0.5 },
    { c: layer(512, 224, (x) => motes(x, 30, ['#a0a0b8'], 150, 220, 1, 196)), f: 0.8 },
  ] };

  // ---- even more parallax: extra depth for every world ----
  const L = (f, fn, drift) => (drift ? { c: layer(512, 224, fn), f, drift } : { c: layer(512, 224, fn), f });
  const birds = (x, n, col, y0, y1, seed) => { const r = rng(seed); for (let i = 0; i < n; i++) { const bx = (r() * 500) | 0, by = (y0 + r() * (y1 - y0)) | 0; x.fillStyle = col; x.fillRect(bx, by, 2, 1); x.fillRect(bx + 2, by + 1, 1, 1); x.fillRect(bx + 3, by, 2, 1); } };
  const rays = (x, cols, seed) => { const r = rng(seed); for (let k = 0; k < 6; k++) { const sx = (r() * 512) | 0, w = 10 + ((r() * 18) | 0); x.fillStyle = cols; for (let y = 0; y < 224; y++) x.fillRect(sx + Math.round(y * 0.35), y, w, 1); } };
  const pines = (x, base, n, h0, col, seed) => { const r = rng(seed); for (let k = 0; k < n; k++) { const px = (k * (512 / n) + r() * 12) | 0, h = h0 + ((r() * h0 * 0.6) | 0); tri(x, px, base, h * 0.55, h, col); x.fillRect(px - 1, base, 3, 4); } };
  const wisps = (x, n, col, y0, y1, seed) => { const r = rng(seed); x.fillStyle = col; for (let i = 0; i < n; i++) { const wx = (r() * 512) | 0, wy = (y0 + r() * (y1 - y0)) | 0, w = 20 + ((r() * 40) | 0); x.fillRect(wx, wy, w, 1); x.fillRect(wx + 6, wy + 1, w - 12, 1); } };
  const more2 = {
    grass: [
      L(0.04, (x) => peaks(x, 150, 70, 110, '#a8cce8', '#ffffff', 301)),
      L(0.12, (x) => birds(x, 14, '#3a4a6a', 20, 90, 302), 0.25),
      L(0.62, (x) => { for (let i = 0; i < 512; i += 14) { x.fillStyle = '#8a5a2a'; x.fillRect(i, 182, 3, 26); x.fillStyle = '#b07a40'; x.fillRect(i, 182, 1, 26); } x.fillStyle = '#9a6a34'; x.fillRect(0, 188, 512, 2); x.fillRect(0, 198, 512, 2); }),
      L(0.92, (x) => { const r = rng(303); for (let i = 0; i < 40; i++) { const fx = (r() * 512) | 0, fy = 214 + ((r() * 8) | 0); x.fillStyle = '#2e8a40'; x.fillRect(fx + 1, fy, 1, 5); x.fillStyle = ['#ff5a8a', '#ffe040', '#ffffff', '#a070ff'][i % 4]; x.fillRect(fx, fy - 2, 3, 2); } }),
    ],
    cave: [
      L(0.18, (x) => { const r = rng(311); for (let i = 0; i < 9; i++) { const mx = (r() * 500) | 0, my = 170 + ((r() * 30) | 0); x.fillStyle = '#3a2a4a'; x.fillRect(mx + 3, my, 2, 10); disc(x, mx + 4, my, 5, i % 2 ? 'rgba(120,255,200,0.55)' : 'rgba(200,120,255,0.55)'); } }),
      L(0.34, (x) => { const r = rng(312); x.fillStyle = 'rgba(120,200,255,0.35)'; for (let k = 0; k < 8; k++) { let vx = (r() * 512) | 0, vy = (r() * 200) | 0; for (let s = 0; s < 30; s++) { vx += ((r() * 3) | 0) - 1; vy += 1; x.fillRect(vx, vy, 1, 1); } } }),
      L(0.55, (x) => { const r = rng(313); x.fillStyle = 'rgba(160,210,255,0.6)'; for (let i = 0; i < 30; i++) x.fillRect((r() * 512) | 0, (r() * 200) | 0, 1, 3); }),
      L(0.92, (x) => { const r = rng(314); for (let k = 0; k < 9; k++) tri(x, (k * 60 + r() * 30) | 0, 224, 8, 16 + ((r() * 14) | 0), '#120c18'); }),
    ],
    sky: [
      L(0.03, (x) => { for (let b = 0; b < 6; b++) { x.fillStyle = ['rgba(255,80,80,0.18)', 'rgba(255,170,60,0.18)', 'rgba(255,240,80,0.18)', 'rgba(80,220,120,0.18)', 'rgba(80,150,255,0.18)', 'rgba(170,90,255,0.18)'][b]; for (let i = 0; i < 300; i++) { const a = Math.PI * (i / 300), R = 130 - b * 4; x.fillRect(Math.round(250 + Math.cos(a) * R * 1.4), Math.round(200 - Math.sin(a) * R), 2, 3); } } }),
      L(0.07, (x) => { for (const [ix, iy] of [[60, 120], [260, 90], [420, 130]]) { disc(x, ix, iy, 16, 'rgba(110,150,200,0.5)'); tri(x, ix, iy + 34, 14, 24, 'rgba(110,150,200,0.5)'); } }),
      L(0.16, (x) => { for (const [bx, by, c] of [[90, 60, '#ff6060'], [330, 40, '#ffd040'], [470, 80, '#60c0ff']]) { disc(x, bx, by, 9, c); x.fillStyle = '#ffffff'; x.fillRect(bx - 3, by - 6, 2, 4); x.fillStyle = '#6a4020'; x.fillRect(bx - 3, by + 13, 6, 4); x.fillStyle = '#3a3a3a'; x.fillRect(bx - 5, by + 7, 1, 6); x.fillRect(bx + 4, by + 7, 1, 6); } }, 0.05),
      L(0.95, (x) => wisps(x, 14, 'rgba(255,255,255,0.35)', 150, 222, 321)),
    ],
    beach: [
      L(0.04, (x) => { for (const [ix, w] of [[80, 50], [330, 70]]) { for (let i = -w; i <= w; i++) { const h = Math.round(Math.sqrt(w * w - i * i) * 0.25); x.fillStyle = '#5a8aa0'; x.fillRect(ix + i, 150 - h, 1, h); } } }),
      L(0.12, (x) => { const lx = 440; x.fillStyle = '#ffffff'; x.fillRect(lx, 110, 10, 44); x.fillStyle = '#e83030'; for (let y = 116; y < 154; y += 12) x.fillRect(lx, y, 10, 5); x.fillStyle = '#3a3a3a'; x.fillRect(lx - 2, 104, 14, 6); x.fillStyle = '#ffe060'; x.fillRect(lx + 2, 105, 6, 4); x.fillStyle = 'rgba(255,240,150,0.25)'; for (let k = 0; k < 40; k++) x.fillRect(lx - 40 - k, 104 + Math.round(k * 0.15), 40, 1); }),
      L(0.22, (x) => birds(x, 10, '#ffffff', 30, 100, 331), 0.3),
      L(0.92, (x) => { const r = rng(332); for (let i = 0; i < 18; i++) { const sx = (r() * 512) | 0, sy = 216 + ((r() * 6) | 0); x.fillStyle = i % 3 ? '#f8d8c0' : '#ffb0a0'; x.fillRect(sx, sy, 4, 2); x.fillRect(sx + 1, sy - 1, 2, 1); x.fillStyle = '#5aa040'; if (i % 2) { x.fillRect(sx + 8, sy - 6, 1, 7); x.fillRect(sx + 10, sy - 4, 1, 5); } } }),
    ],
    snow: [
      L(0.02, (x) => { for (let b = 0; b < 3; b++) for (let i = 0; i < 512; i++) { const y = Math.round(30 + b * 12 + Math.sin(i * 0.02 + b) * 10); x.fillStyle = ['rgba(90,255,170,0.18)', 'rgba(120,200,255,0.15)', 'rgba(200,120,255,0.12)'][b]; x.fillRect(i, y, 1, 14); } }),
      L(0.3, (x) => pines(x, 196, 26, 30, '#3a6a7a', 341)),
      L(0.6, (x) => { const r = rng(342); for (let i = 0; i < 24; i++) { const sx = (r() * 512) | 0, sy = (r() * 190) | 0; x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(sx, sy - 2, 1, 5); x.fillRect(sx - 2, sy, 5, 1); } }),
      L(0.95, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(216 + Math.sin(i * 0.05) * 3 + Math.sin(i * 0.013) * 3); x.fillStyle = '#f4faff'; x.fillRect(i, h, 1, 224 - h); } }),
    ],
    castle: [
      L(0.06, (x) => { for (const tx of [40, 150, 300, 420]) { x.fillStyle = 'rgba(40,24,48,0.7)'; x.fillRect(tx, 90, 26, 134); for (let k = 0; k < 4; k++) x.fillRect(tx - 2 + k * 8, 84, 5, 6); tri(x, tx + 13, 84, 16, 22, 'rgba(40,24,48,0.7)'); x.fillStyle = 'rgba(255,200,80,0.6)'; x.fillRect(tx + 11, 110, 4, 6); } }),
      L(0.45, (x) => { for (let k = 0; k < 6; k++) { const tx = k * 90 + 30; x.fillStyle = '#3a2a2a'; x.fillRect(tx, 120, 4, 10); disc(x, tx + 2, 116, 6, 'rgba(255,140,40,0.3)'); x.fillStyle = '#ffb040'; x.fillRect(tx + 1, 112, 2, 5); x.fillStyle = '#ffe080'; x.fillRect(tx + 1, 114, 2, 2); } }),
      L(0.7, (x) => motes(x, 40, ['#ff8030', '#ffc060'], 40, 220, 1, 351), 0.2),
      L(1.05, (x) => { for (const px of [100, 360]) { x.fillStyle = 'rgba(16,8,20,0.4)'; x.fillRect(px, 0, 18, 224); x.fillStyle = 'rgba(60,40,70,0.3)'; x.fillRect(px + 2, 0, 2, 224); x.fillStyle = 'rgba(16,8,20,0.4)'; x.fillRect(px - 4, 0, 26, 8); x.fillRect(px - 4, 214, 26, 10); } }),
    ],
    haunted: [
      L(0.02, (x) => { disc(x, 400, 50, 22, '#f4f0d0'); disc(x, 394, 44, 4, '#d8d4b0'); disc(x, 406, 58, 3, '#d8d4b0'); birds(x, 6, '#1a1020', 30, 70, 361); }),
      L(0.3, (x) => { const r = rng(362); for (let k = 0; k < 6; k++) { const tx = (k * 85 + r() * 30) | 0; x.fillStyle = '#1a1424'; x.fillRect(tx, 130, 4, 80); for (let b = 0; b < 4; b++) { const by = 135 + b * 12, d = b % 2 ? 1 : -1; for (let s = 0; s < 14 - b * 2; s++) x.fillRect(tx + 2 + d * s, by - Math.round(s * 0.6), 2, 1); } } }),
      L(0.55, (x) => { const r = rng(363); for (let k = 0; k < 10; k++) { const gx = (r() * 500) | 0, h = 10 + ((r() * 6) | 0); x.fillStyle = '#5a5a6a'; x.fillRect(gx, 212 - h, 8, h); disc(x, gx + 4, 212 - h, 4, '#5a5a6a'); x.fillStyle = '#3a3a48'; x.fillRect(gx + 3, 214 - h, 2, 4); x.fillRect(gx + 2, 215 - h, 4, 1); } }),
      L(0.85, (x) => wisps(x, 22, 'rgba(200,210,255,0.22)', 160, 222, 364), 0.15),
    ],
    water: [
      L(0.05, (x) => rays(x, 'rgba(200,240,255,0.06)', 371)),
      L(0.2, (x) => { const r = rng(372); for (let s = 0; s < 3; s++) { const cx = 100 + s * 150, cy = 60 + s * 25; for (let i = 0; i < 12; i++) { const fx = cx + ((r() * 40) | 0), fy = cy + ((r() * 20) | 0); x.fillStyle = 'rgba(30,60,110,0.6)'; x.fillRect(fx, fy, 5, 2); x.fillRect(fx + 5, fy - 1, 1, 4); } } }, 0.12),
      L(0.7, (x) => { const r = rng(373); for (let i = 0; i < 26; i++) { const bx = (r() * 512) | 0, by = (r() * 210) | 0, s = 1 + ((r() * 2) | 0); x.fillStyle = 'rgba(220,250,255,0.5)'; x.fillRect(bx, by, s + 1, s + 1); x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(bx, by, 1, 1); } }, -0.1),
      L(0.92, (x) => { for (let k = 0; k < 7; k++) { const kx = k * 76 + 20; for (let y = 0; y < 40; y++) { x.fillStyle = '#1a6a40'; x.fillRect(kx + Math.round(Math.sin(y * 0.25 + k) * 3), 224 - y, 3, 1); } } }),
    ],
    airship: [
      L(0.1, (x) => { for (const [ax, ay] of [[120, 50], [400, 80]]) { for (let yy = -5; yy <= 5; yy++) { const h = Math.round(Math.sqrt(25 - yy * yy) * 3.6); x.fillStyle = 'rgba(80,60,110,0.6)'; x.fillRect(ax - h, ay + yy, h * 2, 1); } x.fillStyle = 'rgba(60,40,80,0.6)'; x.fillRect(ax - 6, ay + 6, 12, 4); } }, 0.08),
      L(0.25, (x) => { for (let i = 0; i < 10; i++) cloud(x, i * 55, 190 + (i % 3) * 6, 0.8, 'rgba(255,200,210,0.7)', 'rgba(230,160,190,0.7)'); }),
      L(0.5, (x) => birds(x, 12, '#3a2a4a', 40, 140, 381), 0.35),
      L(1.0, (x) => { for (let i = 0; i < 4; i++) cloud(x, i * 140 + 30, 214, 0.9, 'rgba(255,255,255,0.75)', 'rgba(240,220,240,0.75)'); }),
    ],
    volcano: [
      L(0.02, (x) => { for (let b = 0; b < 4; b++) { x.fillStyle = `rgba(40,10,10,${0.25 - b * 0.04})`; for (let i = 0; i < 512; i++) x.fillRect(i, Math.round(20 + b * 22 + Math.sin(i * 0.015 + b) * 6), 1, 8); } }, 0.05),
      L(0.05, (x) => { for (let i = 0; i < 512; i++) { const d = Math.abs(i - 120), h = Math.max(0, 110 - d * 1.2); if (h) { x.fillStyle = '#4a1c14'; x.fillRect(i, 190 - h, 1, h + 34); } } for (let k = 0; k < 20; k++) disc(x, 120 + Math.sin(k * 1.7) * 8, 78 - k * 3, 2 + (k % 3), k % 2 ? '#ff7020' : '#ffd060'); }),
      L(0.2, (x) => { for (let i = 0; i < 512; i++) { x.fillStyle = '#2a0e0a'; x.fillRect(i, 176, 1, 48); } x.fillStyle = '#ff6a10'; for (let i = 0; i < 512; i++) x.fillRect(i, Math.round(186 + Math.sin(i * 0.03) * 4), 1, 3); x.fillStyle = '#ffd060'; for (let i = 0; i < 512; i += 3) x.fillRect(i, Math.round(187 + Math.sin(i * 0.03) * 4), 1, 1); }),
      L(0.3, (x) => { const r = rng(391); for (let k = 0; k < 14; k++) { const cx = (k * 37 + r() * 10) | 0, h = 30 + ((r() * 40) | 0); x.fillStyle = '#24100e'; x.fillRect(cx, 224 - h, 9, h); x.fillStyle = '#3a1c18'; x.fillRect(cx, 224 - h, 2, h); x.fillRect(cx, 224 - h, 9, 1); } }),
      L(0.38, (x) => { for (const sx of [80, 330]) for (let k = 0; k < 14; k++) disc(x, sx + Math.sin(k * 0.8) * 10, 160 - k * 9, 6 + k, `rgba(70,50,50,${0.3 - k * 0.015})`); }, 0.06),
      L(0.66, (x) => { const r = rng(392); for (let k = 0; k < 8; k++) { const ox = (r() * 500) | 0; x.fillStyle = '#16080c'; for (let y = 0; y < 14; y++) x.fillRect(ox + Math.round(y * 0.4), 210 - y, 18 - y, 1); x.fillStyle = '#6a3aa0'; x.fillRect(ox + 4, 205, 2, 2); } }),
      L(0.95, (x) => motes(x, 40, ['#a09090', '#706060'], 0, 224, 1, 393), 0.3),
    ],
    factory: [
      L(0.04, (x) => { const r = rng(401); for (let i = 0; i < 512;) { const w = 14 + ((r() * 24) | 0), h = 40 + ((r() * 70) | 0); x.fillStyle = '#4a4a5a'; x.fillRect(i, 200 - h, w, h + 24); x.fillStyle = 'rgba(255,230,140,0.5)'; for (let wy = 204 - h; wy < 196; wy += 7) for (let wx = i + 2; wx < i + w - 2; wx += 5) if (r() < 0.4) x.fillRect(wx, wy, 2, 3); i += w + 2; } }),
      L(0.08, (x) => wisps(x, 20, 'rgba(90,80,70,0.35)', 10, 90, 402), 0.06),
      L(0.18, (x) => { for (const cx of [100, 380]) { x.fillStyle = '#c09020'; x.fillRect(cx, 60, 4, 150); for (let y = 60; y < 210; y += 8) x.fillRect(cx - 2, y, 8, 1); x.fillRect(cx - 60, 60, 90, 4); for (let k = 0; k < 90; k += 6) x.fillRect(cx - 60 + k, 56, 1, 4); x.fillStyle = '#3a3a3a'; x.fillRect(cx - 50, 64, 1, 40); x.fillStyle = '#5a5a6a'; x.fillRect(cx - 55, 104, 12, 8); } }),
      L(0.3, (x) => { x.fillStyle = '#5a6a5a'; for (const py of [70, 130]) { x.fillRect(0, py, 512, 5); x.fillStyle = '#7a8a7a'; x.fillRect(0, py, 512, 1); x.fillStyle = '#5a6a5a'; for (let k = 20; k < 512; k += 96) { x.fillRect(k, py, 5, 224 - py); x.fillRect(k - 2, py - 2, 9, 9); } } }),
      L(0.45, (x) => { for (let k = 0; k < 8; k++) { const lx = k * 64 + 40; x.fillStyle = '#2a2a2a'; x.fillRect(lx, 94, 6, 6); disc(x, lx + 3, 92, 3, k % 2 ? '#ff4040' : '#ffb020'); disc(x, lx + 3, 92, 7, k % 2 ? 'rgba(255,60,60,0.2)' : 'rgba(255,180,40,0.2)'); } }),
      L(0.6, (x) => { x.fillStyle = 'rgba(40,40,50,0.7)'; x.fillRect(0, 170, 512, 4); for (let k = 0; k < 512; k += 40) { x.fillStyle = 'rgba(110,80,50,0.6)'; x.fillRect(k + 8, 160, 14, 10); x.fillStyle = 'rgba(70,50,30,0.6)'; x.fillRect(k + 8, 164, 14, 1); x.fillRect(k + 14, 160, 1, 10); } }, 0.3),
      L(1.0, (x) => { for (const cx of [60, 260, 440]) { for (let y = 0; y < 40 + (cx % 3) * 10; y += 4) { x.fillStyle = '#20202a'; x.fillRect(cx, y, 3, 3); x.fillStyle = '#4a4a58'; x.fillRect(cx + 1, y + 3, 1, 1); } x.fillStyle = '#20202a'; x.fillRect(cx - 2, 40 + (cx % 3) * 10, 7, 4); } }),
    ],
    candy: [
      L(0.04, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(150 + Math.sin(i * 0.025) * 14 + Math.sin(i * 0.06) * 6); x.fillStyle = '#ffd8f0'; x.fillRect(i, h, 1, 224 - h); x.fillStyle = '#ffffff'; x.fillRect(i, h, 1, 2); } }),
      L(0.12, (x) => { for (const [gx, c] of [[60, '#ff6080'], [200, '#60d0ff'], [340, '#a0e060'], [460, '#ffd040']]) { for (let yy = -40; yy <= 0; yy++) { const h = Math.round(Math.sqrt(1600 - yy * yy) * 0.9); x.fillStyle = c; x.fillRect(gx - h, 190 + yy, h * 2, 1); } x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(gx - 14, 160, 6, 3); } }),
      L(0.2, (x) => { x.fillStyle = '#6a3a20'; for (let i = 0; i < 512; i++) x.fillRect(i, Math.round(196 + Math.sin(i * 0.04) * 3), 1, 28); x.fillStyle = '#8a5a30'; for (let i = 0; i < 512; i += 2) x.fillRect(i, Math.round(197 + Math.sin(i * 0.04 + 1) * 3), 1, 1); }),
      L(0.35, (x) => { for (let k = 0; k < 6; k++) { const cx = k * 86 + 30; for (let y = 0; y < 70; y++) { x.fillStyle = ((y + 2) >> 2) % 2 ? '#e83040' : '#ffffff'; x.fillRect(cx, 140 + y, 4, 1); } for (let a = 0; a < 12; a++) { x.fillStyle = (a >> 1) % 2 ? '#e83040' : '#ffffff'; x.fillRect(cx + 4 + Math.round(Math.sin(a / 11 * Math.PI) * 8), 140 - Math.round(Math.cos(a / 11 * Math.PI) * 6) - 6, 3, 3); } } }),
      L(0.5, (x) => { for (const [dx, dy] of [[90, 70], [310, 50], [450, 90]]) { disc(x, dx, dy, 10, '#e8a050'); disc(x, dx, dy, 8, '#ff70b0'); disc(x, dx, dy, 3, 'rgba(0,0,0,0)'); x.clearRect(dx - 2, dy - 2, 4, 4); x.fillStyle = '#ffffff'; x.fillRect(dx - 5, dy - 4, 2, 1); x.fillStyle = '#40c0ff'; x.fillRect(dx + 3, dy - 3, 2, 1); x.fillStyle = '#ffe040'; x.fillRect(dx - 2, dy + 5, 2, 1); } }, 0.04),
      L(0.65, (x) => { for (let k = 0; k < 5; k++) { const cx = k * 110 + 50; tri(x, cx, 224, 8, 22, '#d89a50'); for (let y = 0; y < 22; y += 4) { x.fillStyle = '#b07a38'; x.fillRect(cx - 6, 202 + y, 12, 1); } disc(x, cx, 198, 9, ['#ffd0e0', '#d0f0ff', '#fff0b0', '#d8ffd0', '#e8d0ff'][k]); x.fillStyle = '#e83040'; x.fillRect(cx - 1, 186, 3, 3); } }),
      L(0.95, (x) => motes(x, 60, ['#ff4080', '#40c0ff', '#ffd040', '#40d080', '#ffffff'], 0, 224, 1, 411, 3)),
    ],
    moon: [
      L(0.005, (x) => { const r = rng(421); for (let i = 0; i < 70; i++) disc(x, 120 + r() * 260, 40 + r() * 80, 4 + r() * 10, i % 2 ? 'rgba(120,60,200,0.05)' : 'rgba(60,120,220,0.05)'); }),
      L(0.02, (x) => { disc(x, 90, 50, 14, '#d08a50'); x.fillStyle = 'rgba(240,210,170,0.8)'; for (let i = -26; i <= 26; i++) x.fillRect(90 + i, 50 + Math.round(i * 0.2), 1, 1); disc(x, 470, 110, 6, '#c0c8d8'); }),
      L(0.03, (x) => { const r = rng(422); for (let k = 0; k < 4; k++) { const sx = (r() * 480) | 0, sy = (r() * 90) | 0; for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(255,255,255,${(18 - i) / 18})`; x.fillRect(sx + i, sy + Math.round(i * 0.4), 1, 1); } } }, 0.4),
      L(0.12, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(165 + Math.sin(i * 0.012) * 8); x.fillStyle = '#2a2a3a'; x.fillRect(i, h, 1, 224 - h); } for (const cx of [60, 210, 380]) for (let yy = -3; yy <= 3; yy++) { const h = Math.round(Math.sqrt(9 - yy * yy) * 5); x.fillStyle = '#1e1e2c'; x.fillRect(cx - h, 175 + yy, h * 2, 1); } }),
      L(0.3, (x) => { const dx = 340; x.fillStyle = '#7a8098'; x.fillRect(dx, 150, 3, 40); for (let yy = -10; yy <= 2; yy++) { const h = Math.round(Math.sqrt(Math.max(0, 100 - yy * yy))); x.fillStyle = '#b0b8d0'; x.fillRect(dx + 1 - h, 140 + yy, h * 2, 1); } x.fillStyle = '#ff4040'; x.fillRect(dx, 128, 3, 3); }),
      L(0.45, (x) => { for (const mx of [120, 420]) { x.fillStyle = '#c8d0e8'; x.fillRect(mx, 176, 40, 18); x.fillStyle = '#9098b0'; x.fillRect(mx, 190, 40, 4); x.fillStyle = '#5ff0ff'; for (let k = 0; k < 4; k++) x.fillRect(mx + 4 + k * 9, 181, 5, 4); x.fillStyle = '#9098b0'; x.fillRect(mx + 40, 182, 20, 4); } }),
      L(0.9, (x) => { const r = rng(423); for (let k = 0; k < 10; k++) { const rx = (r() * 500) | 0, w = 6 + ((r() * 10) | 0); for (let y = 0; y < w / 2; y++) { x.fillStyle = y === 0 ? '#c8c8d8' : '#8a8a9c'; x.fillRect(rx + y, 222 - Math.round(w / 2) + y, w - y * 2, 1); } } }),
    ],
  };
  for (const k of Object.keys(more2)) { S.bg[k].layers.push(...more2[k]); S.bg[k].layers.sort((a, b) => a.f - b.f); }


  // ---- Lost Lands: jungle, desert, and the Static Dimension ----
  S.bg.jungle = { sky: gradient('#3a8a6a', '#c8f0a0'), layers: [
    L(0.02, (x) => { disc(x, 400, 50, 18, '#fff4c0'); }),
    L(0.05, (x) => peaks(x, 150, 70, 90, '#3a6a5a', null, 601)),
    L(0.12, (x) => { for (let k = 0; k < 3; k++) { const tx = 80 + k * 170; x.fillStyle = '#4a6a4a'; x.fillRect(tx, 110, 50, 114); for (let s = 0; s < 4; s++) x.fillRect(tx + 5 + s * 3, 102 - s * 8, 40 - s * 6, 8); x.fillStyle = '#2a4a3a'; x.fillRect(tx + 20, 150, 10, 16); } }),
    L(0.2, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(140 + Math.sin(i * 0.03) * 12 + Math.sin(i * 0.11) * 5); x.fillStyle = '#2a7a3a'; x.fillRect(i, h, 1, 224 - h); } }),
    L(0.3, (x) => { const r = rng(602); for (let k = 0; k < 14; k++) { const tx = (k * 37 + r() * 10) | 0; x.fillStyle = '#5a3a20'; x.fillRect(tx, 120, 4, 104); for (let a = 0; a < 5; a++) { const ang = -2.6 + a * 0.55; for (let s = 0; s < 18; s++) { x.fillStyle = '#2e9a3a'; x.fillRect(Math.round(tx + 2 + Math.cos(ang) * s), Math.round(118 + Math.sin(ang) * s * 0.7 + s * s * 0.03), 3, 2); } } } }),
    L(0.42, (x) => { x.fillStyle = '#1e6a2a'; for (let k = 0; k < 40; k++) { const vx = k * 13 + 4; for (let y = 0; y < 30 + (k * 17) % 50; y++) x.fillRect(vx + Math.round(Math.sin(y * 0.15 + k) * 2), y, 1, 1); } }),
    L(0.55, (x) => motes(x, 40, ['#ffff80', '#c0ff80'], 60, 200, 1, 603), 0.05),
    L(0.65, (x) => { const r = rng(604); for (let k = 0; k < 16; k++) { const fx = (r() * 500) | 0; for (let s = 0; s < 6; s++) { x.fillStyle = s % 2 ? '#3aaa4a' : '#2a8a3a'; x.fillRect(fx + s * 2, 200 - s * 3, 10 - s, 3); x.fillRect(fx - s * 2, 200 - s * 3, 10 - s, 3); } } }),
    L(0.9, (x) => { const r = rng(605); for (let k = 0; k < 12; k++) { const lx = (r() * 500) | 0; x.fillStyle = '#145a1e'; for (let s = 0; s < 14; s++) x.fillRect(lx + s, 224 - Math.round(Math.sin((s / 14) * Math.PI) * 20), 1, 20); } }),
  ] };
  S.bg.desert = { sky: gradient('#f0a050', '#ffe8b0'), layers: [
    L(0.02, (x) => { disc(x, 380, 60, 26, '#fff0a0'); disc(x, 380, 60, 34, 'rgba(255,240,160,0.25)'); }),
    L(0.06, (x) => { for (const [px, w] of [[90, 60], [300, 90]]) for (let y = 0; y < w; y++) { x.fillStyle = y % 6 < 1 ? '#c8905a' : '#e0a868'; x.fillRect(px - Math.round(w - y), 160 - y, Math.round((w - y) * 2), 1); } }),
    L(0.15, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(165 + Math.sin(i * 0.02) * 10 + Math.sin(i * 0.05 + 1) * 5); x.fillStyle = '#e8b870'; x.fillRect(i, h, 1, 224 - h); x.fillStyle = '#f8d090'; x.fillRect(i, h, 1, 2); } }),
    L(0.28, (x) => { const r = rng(611); for (let k = 0; k < 8; k++) { const cx = (r() * 480) | 0, h = 30 + ((r() * 20) | 0); x.fillStyle = '#3a8a3a'; x.fillRect(cx, 196 - h, 6, h); x.fillRect(cx - 6, 196 - h + 10, 6, 4); x.fillRect(cx - 6, 196 - h + 2, 3, 10); x.fillRect(cx + 6, 196 - h + 16, 6, 4); x.fillRect(cx + 9, 196 - h + 6, 3, 12); } }),
    L(0.4, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(186 + Math.sin(i * 0.035 + 2) * 8); x.fillStyle = '#d89a50'; x.fillRect(i, h, 1, 224 - h); } }),
    L(0.55, (x) => { const r = rng(612); for (let k = 0; k < 5; k++) { const sx = (r() * 480) | 0; x.fillStyle = '#e8e0d0'; x.fillRect(sx, 206, 10, 3); x.fillRect(sx + 2, 203, 2, 3); x.fillRect(sx + 7, 204, 4, 2); } }),
    L(0.75, (x) => motes(x, 50, ['#f8e0a0', '#e0b070'], 100, 224, 1, 613), 0.5),
  ] };
  S.bg.static = { sky: gradient('#10001a', '#3a0a5a'), layers: [
    L(0.01, (x) => motes(x, 90, ['#ff40ff', '#40ffff', '#ffffff'], 0, 224, 1, 621)),
    L(0.04, (x) => { for (let k = 0; k < 18; k++) { x.fillStyle = k % 2 ? 'rgba(255,60,200,0.15)' : 'rgba(60,255,240,0.15)'; x.fillRect(0, 10 + k * 12, 512, 3); } }),
    L(0.1, (x) => { const r = rng(622); for (let k = 0; k < 24; k++) { const bx = (r() * 500) | 0, by = (r() * 180) | 0, w = 8 + ((r() * 30) | 0); x.fillStyle = ['#ff40c0', '#40e0ff', '#a040ff', '#ffffff'][k % 4]; x.globalAlpha = 0.35; x.fillRect(bx, by, w, 4 + ((r() * 8) | 0)); x.globalAlpha = 1; } }),
    L(0.2, (x) => { for (let i = 0; i < 512; i += 2) { const h = 120 + ((i * 7919) % 60); x.fillStyle = '#1a0a3a'; x.fillRect(i, h, 2, 224 - h); if (i % 16 === 0) { x.fillStyle = '#40ffe0'; x.fillRect(i, h - 2, 2, 2); } } }),
    L(0.35, (x) => { for (let k = 0; k < 6; k++) { const tx = k * 90 + 20; x.fillStyle = '#2a1a4a'; x.fillRect(tx, 100, 30, 124); x.fillStyle = '#100820'; x.fillRect(tx + 3, 104, 24, 18); x.fillStyle = k % 2 ? '#ff40c0' : '#40ffe0'; for (let y = 0; y < 18; y += 3) x.fillRect(tx + 4, 105 + y, 22, 1); } }),
    L(0.6, (x) => motes(x, 40, ['#ff60ff', '#60ffff'], 0, 224, 2, 623), 0.4),
  ] };
  // ---- Carnival Isle ----
  S.bg.carnival = { sky: gradient('#1a0a3a', '#d05a8a'), layers: [
    L(0.01, (x) => motes(x, 70, ['#ffffff', '#ffe0a0'], 0, 120, 1, 501)),
    L(0.02, (x) => { disc(x, 420, 46, 16, '#fff0c0'); disc(x, 426, 42, 14, 'rgba(26,10,58,0.0)'); }),
    L(0.04, (x) => { for (let k = 0; k < 4; k++) { const fx = 60 + k * 120, fy = 30 + (k % 2) * 20; for (let a = 0; a < 16; a++) { const t2 = (a / 16) * Math.PI * 2; for (let rr = 2; rr < 12; rr += 2) { x.fillStyle = ['#ff60a0', '#ffe040', '#60d0ff', '#a0ff60'][k]; x.fillRect(Math.round(fx + Math.cos(t2) * rr), Math.round(fy + Math.sin(t2) * rr), 1, 1); } } } }),
    L(0.08, (x) => { for (let i = 0; i < 512; i++) { const h = Math.round(160 + Math.sin(i * 0.018) * 10); x.fillStyle = '#3a1a5a'; x.fillRect(i, h, 1, 224 - h); } }),
    L(0.14, (x) => { const cx = 330, cy = 110, R = 52; x.strokeStyle = '#5a2a7a'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke(); for (let a = 0; a < 12; a++) { const t2 = (a / 12) * Math.PI * 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(t2) * R, cy + Math.sin(t2) * R); x.stroke(); x.fillStyle = a % 2 ? '#ffd040' : '#ff6080'; x.fillRect(Math.round(cx + Math.cos(t2) * R) - 3, Math.round(cy + Math.sin(t2) * R), 7, 5); } x.fillStyle = '#5a2a7a'; for (let k = 0; k < 60; k++) { x.fillRect(cx - 2 - k * 0.4, cy + k, 2, 1); x.fillRect(cx + k * 0.4, cy + k, 2, 1); } }),
    L(0.22, (x) => { for (const [tx, w, c1] of [[80, 70, '#e83850'], [230, 50, '#40a0e8'], [420, 80, '#ffd040']]) { for (let y = 0; y < 40; y++) { const ww = Math.round((w * (y + 1)) / 40); for (let i = -ww; i <= ww; i++) { x.fillStyle = ((i + 200) >> 3) % 2 ? c1 : '#ffffff'; x.fillRect(tx + i, 140 + y, 1, 1); } } for (let y = 180; y < 224; y++) for (let i = -w; i <= w; i++) { x.fillStyle = ((i + 200) >> 3) % 2 ? c1 : '#ffffff'; x.fillRect(tx + i, y, 1, 1); } x.fillStyle = '#ffe040'; x.fillRect(tx - 1, 128, 3, 12); x.fillStyle = '#ff4060'; x.fillRect(tx + 2, 128, 8, 5); } }),
    L(0.3, (x) => { for (let k = 0; k < 9; k++) { const bx = k * 58 + 14, by = 50 + ((k * 37) % 70); disc(x, bx, by, 6, ['#ff4060', '#ffd040', '#40c0ff', '#a060ff', '#40e080'][k % 5]); x.fillStyle = '#ffffff'; x.fillRect(bx - 2, by - 3, 2, 2); x.fillStyle = '#e0e0e0'; for (let y = 0; y < 20; y++) x.fillRect(bx + Math.round(Math.sin(y * 0.4) * 1.5), by + 6 + y, 1, 1); } }, 0.03),
    L(0.42, (x) => { for (let i = 0; i < 512; i++) { const y = Math.round(40 + Math.abs(Math.sin((i / 128) * Math.PI)) * 22); x.fillStyle = '#2a1a3a'; x.fillRect(i, y, 1, 1); if (i % 12 === 0) { x.fillStyle = ['#ff4060', '#ffe040', '#40c0ff', '#40e080'][(i / 12) % 4]; x.fillRect(i - 1, y + 1, 3, 3); } } }),
    L(0.55, (x) => { const cx = 140; x.fillStyle = '#e83850'; for (let y = 0; y < 18; y++) { const w = Math.round(18 + y * 1.2); x.fillRect(cx - w, 150 + y, w * 2, 1); } x.fillStyle = '#ffd040'; x.fillRect(cx - 40, 168, 80, 4); for (let k = 0; k < 6; k++) { x.fillStyle = '#d0d0e0'; x.fillRect(cx - 30 + k * 12, 172, 2, 30); x.fillStyle = ['#ffffff', '#ffb0d0', '#b0e0ff'][k % 3]; x.fillRect(cx - 34 + k * 12, 186 + (k % 2) * 4, 10, 6); } x.fillStyle = '#5a2a6a'; x.fillRect(cx - 42, 202, 84, 4); }),
    L(0.7, (x) => motes(x, 50, ['#ff60c0', '#ffe040', '#60e0ff', '#ffffff'], 0, 210, 1, 502, 2), 0.1),
    L(0.85, (x) => { for (const px of [60, 300, 460]) { x.fillStyle = '#3a1a3a'; x.fillRect(px, 150, 3, 70); disc(x, px + 1, 146, 5, 'rgba(255,230,120,0.35)'); disc(x, px + 1, 146, 2, '#fff0a0'); } }),
    L(0.97, (x) => { for (let i = 0; i < 512; i += 16) { x.fillStyle = (i / 16) % 2 ? '#ff4060' : '#ffd040'; for (let y = 0; y < 8; y++) x.fillRect(i + y, y, 16 - y * 2, 1); } x.fillStyle = '#2a1a2a'; x.fillRect(0, 0, 512, 1); }),
  ] };

  S.portrait = new Image();
  S.portrait.src = 'assets/wallyman-portrait.png';
  S.gothPortrait = new Image();
  S.gothPortrait.src = 'assets/gothchick-portrait.png';
  S.dougPortrait = new Image();
  S.dougPortrait.src = 'assets/doug-portrait.png';

  S.canvas = canvas; S.fromRows = fromRows; S.flip = flip; S.rng = rng;
  return S;
})();
