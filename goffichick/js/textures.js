// GOFFICHICK - procedural wall / floor textures (64x64), generated at load time
'use strict';

const TEX_SIZE = 64;

const Textures = (() => {
  let seed = 1337;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function make(drawFn, noise = 0) {
    const c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
    const g = c.getContext('2d');
    drawFn(g);
    const d = g.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    if (noise) { // per-pixel grain makes flat colours read as stone / metal
      for (let i = 0; i < d.data.length; i += 4) {
        const n = (rnd() - 0.5) * noise;
        d.data[i] = Math.max(0, Math.min(255, d.data[i] + n)); d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + n)); d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + n));
      }
      g.putImageData(d, 0, 0);
    }
    return { canvas: c, data: new Uint32Array(d.data.buffer.slice(0)) };
  }

  function speckle(g, n, colors, size = 1) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[(rnd() * colors.length) | 0];
      g.fillRect((rnd() * TEX_SIZE) | 0, (rnd() * TEX_SIZE) | 0, size, size);
    }
  }

  function bricks(g, base, mortar, shades, bw = 16, bh = 8) {
    g.fillStyle = mortar; g.fillRect(0, 0, 64, 64);
    for (let row = 0; row < 64 / bh; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = -1; col < 64 / bw + 1; col++) {
        g.fillStyle = shades[(rnd() * shades.length) | 0];
        g.fillRect(col * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
      }
    }
    speckle(g, 260, ['rgba(0,0,0,0.35)', 'rgba(255,255,255,0.08)']);
  }

  const T = {};

  // Large bevelled grey stone blocks (classic 90s shooter castle wall)
  function stoneBlocks(g, base = 132, spread = 18, mortar = '#4b4b4f', rowH = 16, warm = 0) {
    g.fillStyle = mortar; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += rowH) {
      let x = -((rnd() * 16) | 0);
      while (x < 64) {
        const w = 16 + ((rnd() * 3) | 0) * 8;
        const v = base + (rnd() - 0.5) * spread;
        const col = (o) => `rgb(${(v + o + warm) | 0},${(v + o) | 0},${(v + o - warm * 0.5) | 0})`;
        g.fillStyle = col(0); g.fillRect(x + 1, y + 1, w - 2, rowH - 2);
        g.fillStyle = col(28); g.fillRect(x + 1, y + 1, w - 2, 1); g.fillRect(x + 1, y + 1, 1, rowH - 2);
        g.fillStyle = col(-30); g.fillRect(x + 1, y + rowH - 2, w - 2, 1); g.fillRect(x + w - 2, y + 1, 1, rowH - 2);
        if (rnd() < 0.35) { // crack / chip
          g.strokeStyle = col(-40); g.lineWidth = 1; g.beginPath();
          let cx = x + 3 + rnd() * (w - 6), cy = y + 2; g.moveTo(cx, cy);
          for (let k = 0; k < 4; k++) { cx += (rnd() - 0.5) * 6; cy += rowH / 5; g.lineTo(cx, cy); }
          g.stroke();
        }
        x += w;
      }
    }
  }
  function steelPanel(g, base = 120) {
    g.fillStyle = `rgb(${base},${base},${base + 6})`; g.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 16) {
      const gr = g.createLinearGradient(x, 0, x + 16, 0);
      gr.addColorStop(0, `rgb(${base + 30},${base + 30},${base + 36})`); gr.addColorStop(0.5, `rgb(${base},${base},${base + 6})`); gr.addColorStop(1, `rgb(${base - 40},${base - 40},${base - 34})`);
      g.fillStyle = gr; g.fillRect(x, 0, 16, 64);
    }
  }
  const rivets = (g, pts) => { for (const [x, y] of pts) { g.fillStyle = '#dcdce2'; g.fillRect(x, y, 1, 1); g.fillStyle = '#3a3a40'; g.fillRect(x + 1, y + 1, 1, 1); } };

  // 1: grey castle stone
  T[1] = make(g => stoneBlocks(g, 138, 22, '#55555a', 16, 4), 16);

  // 2: grey stone with a carved crescent-moon rune (Goffichick's mark)
  T[2] = make(g => {
    stoneBlocks(g, 122, 16, '#4a4a50', 32, 2);
    g.lineWidth = 2; g.strokeStyle = '#5c5864';
    g.beginPath(); g.arc(32, 32, 10, 0.6, Math.PI * 2 - 0.6); g.stroke();
    g.strokeStyle = '#d9a3c9'; g.lineWidth = 1;
    g.beginPath(); g.arc(32, 32, 10, 0.6, Math.PI * 2 - 0.6); g.stroke();
  }, 14);

  // 3: horribly cheery wallpaper (the enemy's realm) - beige with yellow smiles
  T[3] = make(g => {
    g.fillStyle = '#e9dcb8'; g.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 8) { g.fillStyle = x % 16 ? '#e2d3ab' : '#efe4c6'; g.fillRect(x, 0, 4, 64); }
    for (const [x, y] of [[16, 16], [48, 48], [48, 14], [16, 46]]) {
      g.fillStyle = '#f7c623'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4a3a10'; g.fillRect(x - 3, y - 2, 1, 2); g.fillRect(x + 2, y - 2, 1, 2);
      g.strokeStyle = '#4a3a10'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 3.5, 0.3, Math.PI - 0.3); g.stroke();
    }
    g.fillStyle = '#b9a77f'; g.fillRect(0, 56, 64, 8); g.fillStyle = '#a08f69'; g.fillRect(0, 56, 64, 1);
    speckle(g, 120, ['rgba(120,90,40,0.15)']);
  });

  // 4: office panel (grey-blue fabric cubicle wall)
  T[4] = make(g => {
    g.fillStyle = '#7c8794'; g.fillRect(0, 0, 64, 64);
    speckle(g, 900, ['#86919e', '#717c89', '#7f8a97']);
    g.fillStyle = '#9aa3ad'; g.fillRect(0, 0, 64, 3); g.fillRect(0, 0, 2, 64); g.fillRect(31, 0, 2, 64);
    g.fillStyle = '#4d5560'; g.fillRect(0, 61, 64, 3); g.fillRect(62, 0, 2, 64); g.fillRect(33, 0, 1, 64);
    // motivational poster (blank cheerful sunset)
    g.fillStyle = '#ffffff'; g.fillRect(8, 14, 18, 22);
    const gr = g.createLinearGradient(0, 16, 0, 30); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(1, '#ffe08a');
    g.fillStyle = gr; g.fillRect(10, 16, 14, 14);
    g.fillStyle = '#f7c623'; g.beginPath(); g.arc(17, 27, 4, Math.PI, 0); g.fill();
    g.fillStyle = '#333'; g.fillRect(11, 32, 12, 1);
  });

  // 5: big steel door with a hazard band and an embossed bat
  T[5] = make(g => {
    steelPanel(g, 128);
    g.fillStyle = '#2c2c30'; for (let y = 0; y < 64; y += 21) g.fillRect(0, y, 64, 2);
    for (let x = 0; x < 64; x += 8) { g.fillStyle = (x / 8) % 2 ? '#1c1c1c' : '#d8b02a'; g.beginPath(); g.moveTo(x, 44); g.lineTo(x + 8, 44); g.lineTo(x + 4, 50); g.lineTo(x - 4, 50); g.fill(); }
    g.fillStyle = '#5a5a62';
    g.beginPath(); g.moveTo(32, 22); g.lineTo(18, 16); g.lineTo(21, 23); g.lineTo(14, 24); g.lineTo(23, 32); g.lineTo(32, 29);
    g.lineTo(41, 32); g.lineTo(50, 24); g.lineTo(43, 23); g.lineTo(46, 16); g.closePath(); g.fill();
    g.fillStyle = '#a6a6ae'; g.fillRect(18, 16, 28, 1);
    rivets(g, [[3, 4], [59, 4], [3, 25], [59, 25], [3, 56], [59, 56], [31, 4], [31, 56]]);
  }, 10);

  // 13-15: locked doors - steel with a coloured band and the key's emblem (bat / skull / coffin)
  const lockedDoor = (col, dark, emblem) => make(g => {
    steelPanel(g, 118);
    g.fillStyle = '#2c2c30'; for (let y = 0; y < 64; y += 21) g.fillRect(0, y, 64, 2);
    g.fillStyle = col; g.fillRect(0, 6, 64, 5); g.fillRect(0, 53, 64, 5);
    g.fillStyle = dark; g.beginPath(); g.arc(32, 32, 13, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(32, 32, 11, 0, 7); g.fill();
    g.fillStyle = dark; emblem(g);
    rivets(g, [[3, 16], [59, 16], [3, 46], [59, 46]]);
  }, 8);
  T[13] = lockedDoor('#e0283c', '#3a0008', g => { g.beginPath(); g.moveTo(32, 30); g.lineTo(23, 26); g.lineTo(25, 31); g.lineTo(21, 32); g.lineTo(27, 37); g.lineTo(32, 35); g.lineTo(37, 37); g.lineTo(43, 32); g.lineTo(39, 31); g.lineTo(41, 26); g.closePath(); g.fill(); });
  T[14] = lockedDoor('#3d8bff', '#061a3a', g => { g.beginPath(); g.arc(32, 30, 6.5, 0, 7); g.fill(); g.fillRect(28, 33, 8, 6); g.fillStyle = '#3d8bff'; g.fillRect(28.5, 28, 3, 3); g.fillRect(32.5, 28, 3, 3); });
  T[15] = lockedDoor('#ffcf3a', '#3a2a00', g => { g.beginPath(); g.moveTo(29, 22); g.lineTo(35, 22); g.lineTo(38, 28); g.lineTo(35, 42); g.lineTo(29, 42); g.lineTo(26, 28); g.closePath(); g.fill(); });

  // ---- Episode 2 walls ----
  // 16: hedge (Sunshine Park)
  T[16] = make(g => {
    g.fillStyle = '#2f6a1e'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 160; i++) { g.fillStyle = ['#3d8a26', '#24561a', '#4fa032', '#1d4a14'][(rnd() * 4) | 0]; g.beginPath(); g.ellipse(rnd() * 64, rnd() * 64, 2 + rnd() * 3, 1.5 + rnd() * 2, rnd() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 5; i++) { g.fillStyle = ['#ffd21f', '#ff7eb3', '#ffffff'][i % 3]; g.beginPath(); g.arc(rnd() * 64, rnd() * 64, 1.5, 0, 7); g.fill(); }
  }, 14);
  // 17: shop window (Shopping Maul) - glass, a SALE banner and a mannequin
  T[17] = make(g => {
    g.fillStyle = '#d8d0c4'; g.fillRect(0, 0, 64, 64);
    const gl = g.createLinearGradient(0, 8, 64, 56); gl.addColorStop(0, '#9fd8f0'); gl.addColorStop(0.5, '#d8f2ff'); gl.addColorStop(1, '#7ab8d8');
    g.fillStyle = gl; g.fillRect(4, 10, 56, 46);
    g.fillStyle = '#e8e0d4'; E2(g, 32, 34, 5, 6); g.fillRect(28, 38, 8, 16); g.fillStyle = '#ff7eb3'; g.fillRect(27, 40, 10, 9); // mannequin
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(8, 54); g.lineTo(22, 12); g.lineTo(27, 12); g.lineTo(13, 54); g.fill();
    g.fillStyle = '#ff2d95'; g.fillRect(0, 0, 64, 9); g.fillStyle = '#fff'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText('SALE! 50%', 32, 7.5);
    g.fillStyle = '#8a8274'; g.fillRect(0, 56, 64, 8); g.fillRect(0, 9, 4, 47); g.fillRect(60, 9, 4, 47);
  }, 6);
  function E2(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }
  // 18: gym wall - padded panels and a mirror strip (Gains Gym)
  T[18] = make(g => {
    g.fillStyle = '#2a2a30'; g.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#3a3a44'); gr.addColorStop(0.5, '#52525e'); gr.addColorStop(1, '#2c2c34'); g.fillStyle = gr; g.fillRect(x + 1, 30, 14, 34); }
    const mr = g.createLinearGradient(0, 2, 64, 28); mr.addColorStop(0, '#b8c4d0'); mr.addColorStop(0.5, '#e8f0f8'); mr.addColorStop(1, '#a0acb8');
    g.fillStyle = mr; g.fillRect(0, 2, 64, 26);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(10, 28); g.lineTo(20, 2); g.lineTo(24, 2); g.lineTo(14, 28); g.fill();
    g.fillStyle = '#ff2a2a'; g.fillRect(0, 28, 64, 2);
  }, 8);
  // 19: fairground candy stripes with light bulbs (Sunshine Park)
  T[19] = make(g => {
    for (let x = -64; x < 64; x += 16) { g.fillStyle = '#e8283c'; g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 8, 64); g.lineTo(x + 72, 0); g.lineTo(x + 64, 0); g.fill(); g.fillStyle = '#fff4e0'; g.beginPath(); g.moveTo(x + 8, 64); g.lineTo(x + 16, 64); g.lineTo(x + 80, 0); g.lineTo(x + 72, 0); g.fill(); }
    g.fillStyle = '#d4af37'; g.fillRect(0, 0, 64, 6); g.fillRect(0, 58, 64, 6);
    for (let x = 4; x < 64; x += 8) { g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(x, 3, 2, 0, 7); g.fill(); g.beginPath(); g.arc(x, 61, 2, 0, 7); g.fill(); }
  }, 4);

  // 6: exit switch (off) / 11: (on) - steel panel set into grey stone
  const switchTex = on => make(g => {
    stoneBlocks(g, 138, 22, '#55555a', 16, 4);
    g.fillStyle = '#3a3a40'; g.fillRect(16, 12, 32, 40);
    steelPanelRect(g, 18, 14, 28, 36);
    g.fillStyle = '#222'; g.fillRect(26, 20, 12, 22);
    g.fillStyle = on ? '#39ff6a' : '#ff2a2a'; g.fillRect(27, on ? 21 : 31, 10, 10);
    g.fillStyle = '#111'; g.font = 'bold 7px monospace'; g.fillText('EXIT', 24, 49);
  }, 6);
  function steelPanelRect(g, x, y, w, h) {
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#c4c4cc'); gr.addColorStop(1, '#6c6c74');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  T[6] = switchTex(false); T[11] = switchTex(true);

  // 7: stained glass (purple / pink)
  T[7] = make(g => {
    g.fillStyle = '#1a1420'; g.fillRect(0, 0, 64, 64);
    const cols = ['#6a1b9a', '#ad1457', '#4a148c', '#d81b60', '#311b92', '#ff4fb8'];
    for (let y = 6; y < 58; y += 8) for (let x = 10; x < 54; x += 8) {
      g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect(x, y, 7, 7);
    }
    g.fillStyle = '#1a1420'; g.beginPath(); g.moveTo(8, 4); g.lineTo(32, 0); g.lineTo(56, 4); g.lineTo(56, 0); g.lineTo(8, 0); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(9, 5, 46, 54);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(31, 5, 2, 54); g.fillRect(9, 30, 46, 2);
  });

  // 8: crimson curtain
  T[8] = make(g => {
    for (let x = 0; x < 64; x++) {
      const v = 0.55 + 0.45 * Math.sin(x / 64 * Math.PI * 6);
      g.fillStyle = `rgb(${(110 * v + 30) | 0},${(8 * v) | 0},${(20 * v + 10) | 0})`; g.fillRect(x, 0, 1, 64);
    }
    g.fillStyle = '#d4af37'; g.fillRect(0, 0, 64, 3);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 60, 64, 4);
  });

  // 9: pastel marble (penthouse)
  T[9] = make(g => {
    g.fillStyle = '#f3e7ef'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(200,150,180,0.6)'; g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      g.beginPath(); let x = rnd() * 64, y = 0; g.moveTo(x, y);
      while (y < 64) { x += (rnd() - 0.5) * 10; y += 4 + rnd() * 6; g.lineTo(x, y); }
      g.stroke();
    }
    g.fillStyle = '#d4af37'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 62, 64, 2);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(31, 0, 2, 64);
  });

  // 10: door track / jamb - dark steel with bolts
  T[10] = make(g => {
    steelPanel(g, 96);
    g.fillStyle = '#2a2a2e'; g.fillRect(28, 0, 8, 64);
    rivets(g, [[30, 6], [30, 22], [30, 38], [30, 54], [4, 10], [58, 10], [4, 50], [58, 50]]);
  }, 10);

  // 12: wally poster wall (the cult of wally)
  T[12] = make(g => {
    g.fillStyle = '#1d4fb8'; g.fillRect(0, 0, 64, 64);
    speckle(g, 400, ['#2156c4', '#1846a8']);
    g.fillStyle = '#ff5a1f'; g.beginPath(); g.ellipse(32, 30, 24, 15, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1f7a3a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#1f7a3a'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('WALLY', 32, 29);
    g.beginPath(); g.arc(32, 22, 16, 0.55 * Math.PI, 0.45 * Math.PI, true); g.stroke();
    g.fillStyle = '#ff5a1f'; g.fillRect(0, 56, 64, 8);
  });

  // ---- flats (floor / ceiling) ----
  const F = {};
  F.graveyard = make(g => { // grey flagstone floor
    g.fillStyle = '#5c5a58'; g.fillRect(0, 0, 64, 64);
    for (const [x, y, w, h] of [[0, 0, 32, 32], [32, 0, 32, 20], [32, 20, 32, 44], [0, 32, 20, 32], [20, 32, 12, 32]]) {
      const v = 112 + (rnd() - 0.5) * 22;
      g.fillStyle = `rgb(${v + 4 | 0},${v | 0},${v - 4 | 0})`; g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = `rgba(255,255,255,0.12)`; g.fillRect(x + 1, y + 1, w - 2, 1);
      g.fillStyle = `rgba(0,0,0,0.25)`; g.fillRect(x + 1, y + h - 2, w - 2, 1);
    }
  }, 18);
  F.checker = make(g => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      g.fillStyle = (x + y) % 2 ? '#1a1a1a' : '#5b1a3a'; g.fillRect(x * 32, y * 32, 32, 32);
    }
    speckle(g, 300, ['rgba(0,0,0,0.3)', 'rgba(255,255,255,0.05)']);
  });
  F.carpet = make(g => {
    g.fillStyle = '#6f7480'; g.fillRect(0, 0, 64, 64);
    speckle(g, 1400, ['#666b77', '#787d89', '#5f6470']);
    g.fillStyle = 'rgba(80,60,30,0.25)'; g.beginPath(); g.ellipse(40, 20, 8, 5, 0.4, 0, 7); g.fill(); // coffee stain
  });
  F.tiles = make(g => {
    g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#b5ad9c'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); }
    speckle(g, 300, ['rgba(0,0,0,0.06)']);
  });
  F.stoneCeil = make(g => { // grey concrete ceiling with a recessed light
    g.fillStyle = '#7e7e82'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#626266'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64);
    g.fillStyle = '#4a4a4e'; g.fillRect(20, 20, 24, 24);
    g.fillStyle = '#f2efe2'; g.fillRect(22, 22, 20, 20);
    g.fillStyle = '#d8d4c4'; g.fillRect(22, 31, 20, 2); g.fillRect(31, 22, 2, 20);
  }, 12);
  F.officeCeil = make(g => {
    g.fillStyle = '#c9c9c4'; g.fillRect(0, 0, 64, 64);
    speckle(g, 500, ['#bdbdb7', '#d4d4cf']);
    g.fillStyle = '#8d8d88'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64);
    g.fillStyle = '#fffbe8'; g.fillRect(16, 24, 32, 16); // fluorescent panel
  });
  F.goldCeil = make(g => {
    g.fillStyle = '#2a1a2e'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#d4af37'; g.lineWidth = 2; g.strokeRect(4, 4, 56, 56); g.strokeRect(16, 16, 32, 32);
    g.fillStyle = '#ffd86b'; g.beginPath(); g.arc(32, 32, 5, 0, 7); g.fill();
  });

  // toxic glitter-slime (animated by scrolling in the renderer)
  F.rubber = make(g => { // gym floor
    g.fillStyle = '#2c2c30'; g.fillRect(0, 0, 64, 64);
    speckle(g, 700, ['#3a3a40', '#222226', '#ff4fb8', '#3d8bff', '#ffcf3a'], 1);
    g.fillStyle = '#1a1a1e'; g.fillRect(0, 0, 64, 1); g.fillRect(0, 0, 1, 64);
  }, 6);
  F.grass = make(g => {
    g.fillStyle = '#4a9a2e'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 500; i++) { g.fillStyle = ['#5ab43a', '#3d8226', '#6cc248', '#357020'][(rnd() * 4) | 0]; g.fillRect(rnd() * 64, rnd() * 64, 1, 2 + rnd() * 2); }
    for (let i = 0; i < 6; i++) { g.fillStyle = ['#ffffff', '#ffd21f'][i % 2]; g.beginPath(); g.arc(rnd() * 64, rnd() * 64, 1, 0, 7); g.fill(); }
  }, 10);
  F.sky = make(g => {
    g.fillStyle = '#7ec8ff'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 4; i++) { const x = rnd() * 64, y = rnd() * 64; g.fillStyle = 'rgba(255,255,255,0.85)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + k * 4 - 8, y + Math.sin(k) * 2, 6, 4, 0, 0, 7); g.fill(); } }
  }, 4);
  // toxic green sludge, 4 animation frames: swirling ripples and bubbles that swell and pop
  const blobs = Array.from({ length: 22 }, () => ({ x: rnd() * 64, y: rnd() * 64, rx: 3 + rnd() * 9, ry: 2 + rnd() * 5, r: rnd() * 3, c: (rnd() * 3) | 0 }));
  const bubbles = Array.from({ length: 9 }, () => ({ x: 4 + rnd() * 56, y: 4 + rnd() * 56, t: rnd() * 4 | 0, s: 1.5 + rnd() * 2 }));
  F.slimeFrames = [0, 1, 2, 3].map(f => make(g => {
    g.fillStyle = '#2f8a12'; g.fillRect(0, 0, 64, 64);
    for (const b of blobs) {
      g.fillStyle = ['#47b51c', '#1f6a0c', '#6fd62a'][b.c];
      g.beginPath(); g.ellipse((b.x + f * 2) % 64, b.y + Math.sin(f * 1.57 + b.x) * 1.5, b.rx, b.ry, b.r + f * 0.15, 0, 7); g.fill();
    }
    for (const b of bubbles) { // a bubble grows over three frames and pops on the fourth
      const age = (f + b.t) % 4;
      if (age === 3) { g.fillStyle = '#c8ff8a'; for (let k = 0; k < 4; k++) g.fillRect(b.x + Math.cos(k * 1.57) * (b.s + 2), b.y + Math.sin(k * 1.57) * (b.s + 2), 1, 1); continue; }
      const r = b.s * (0.6 + age * 0.4);
      g.fillStyle = '#7ee636'; g.beginPath(); g.arc(b.x, b.y, r, 0, 7); g.fill();
      g.fillStyle = '#d6ff9e'; g.fillRect(b.x - r * 0.4, b.y - r * 0.5, 1.2, 1.2);
    }
    speckle(g, 70, ['#b6ff6a', '#e4ffbf'], 1);
  }, 10));
  F.slime = F.slimeFrames[0];

  return { walls: T, flats: F };
})();
