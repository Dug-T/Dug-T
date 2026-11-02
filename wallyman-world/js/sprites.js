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

  S.portrait = new Image();
  S.portrait.src = 'assets/wallyman-portrait.png';

  S.canvas = canvas; S.fromRows = fromRows; S.flip = flip; S.rng = rng;
  return S;
})();
