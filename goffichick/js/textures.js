// GOFFICHICK - procedural wall / floor textures (64x64), generated at load time
'use strict';

const TEX_SIZE = 64;

const Textures = (() => {
  let seed = 1337;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function make(drawFn) {
    const c = document.createElement('canvas'); c.width = c.height = TEX_SIZE;
    const g = c.getContext('2d');
    drawFn(g);
    const d = g.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
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

  // 1: gothic brick
  T[1] = make(g => bricks(g, '#3a2f3f', '#141016', ['#3b3040', '#33293a', '#43364a', '#2d2533']));

  // 2: purple stone with glowing pink runes
  T[2] = make(g => {
    bricks(g, '#2b2238', '#0f0b14', ['#2e2440', '#271f36', '#352a4a'], 32, 16);
    g.strokeStyle = '#ff4fb8'; g.lineWidth = 1.5; g.shadowColor = '#ff4fb8'; g.shadowBlur = 4;
    // crescent moon + star rune
    g.beginPath(); g.arc(32, 32, 9, 0.6, Math.PI * 2 - 0.6); g.stroke();
    g.beginPath(); g.arc(36, 32, 7, 0.9, Math.PI * 2 - 0.9); g.stroke();
    g.beginPath(); g.moveTo(14, 12); g.lineTo(18, 20); g.lineTo(10, 15); g.lineTo(18, 15); g.lineTo(12, 20); g.closePath(); g.stroke();
    g.shadowBlur = 0;
  });

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

  // 5: iron door with bat emblem
  T[5] = make(g => {
    g.fillStyle = '#2a2a30'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 16) { g.fillStyle = '#34343c'; g.fillRect(2, y + 2, 60, 12); }
    g.fillStyle = '#151518'; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 2);
    g.fillStyle = '#6b6b78'; for (let y = 4; y < 64; y += 16) for (const x of [4, 58]) g.fillRect(x, y, 2, 2);
    // bat
    g.fillStyle = '#c2185b';
    g.beginPath(); g.moveTo(32, 26); g.lineTo(20, 22); g.lineTo(23, 28); g.lineTo(17, 29); g.lineTo(25, 36); g.lineTo(32, 33);
    g.lineTo(39, 36); g.lineTo(47, 29); g.lineTo(41, 28); g.lineTo(44, 22); g.closePath(); g.fill();
    g.fillRect(30, 24, 4, 4); g.fillRect(29, 22, 1, 3); g.fillRect(34, 22, 1, 3);
    speckle(g, 200, ['rgba(140,60,30,0.35)', 'rgba(0,0,0,0.3)']);
  });

  // 6: exit switch (off) / 11: (on)
  const switchTex = on => make(g => {
    bricks(g, '#3a2f3f', '#141016', ['#3b3040', '#33293a', '#43364a']);
    g.fillStyle = '#222'; g.fillRect(18, 14, 28, 36);
    g.fillStyle = '#555'; g.fillRect(20, 16, 24, 32);
    g.fillStyle = on ? '#39ff6a' : '#ff2a2a'; g.fillRect(26, on ? 18 : 34, 12, 12);
    g.fillStyle = '#000'; g.font = 'bold 7px monospace'; g.fillText('EXIT', 24, 46 - (on ? 0 : 30) + (on ? 0 : 0));
  });
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

  // 10: door frame (jamb)
  T[10] = make(g => {
    g.fillStyle = '#26232a'; g.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 8) { g.fillStyle = x % 16 ? '#2e2a33' : '#1f1c23'; g.fillRect(x, 0, 8, 64); }
    g.fillStyle = '#d4af37'; for (let y = 4; y < 64; y += 12) g.fillRect(29, y, 6, 2);
  });

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
  F.graveyard = make(g => { // dark cobble
    g.fillStyle = '#1b1a1e'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = ['#29272e', '#232127', '#2f2c33'][(rnd() * 3) | 0];
      g.beginPath(); g.ellipse(rnd() * 64, rnd() * 64, 4 + rnd() * 5, 3 + rnd() * 4, rnd() * 3, 0, Math.PI * 2); g.fill();
    }
    speckle(g, 150, ['#3c2a3c', '#111']);
  });
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
  F.stoneCeil = make(g => {
    g.fillStyle = '#141218'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#1e1b24'; for (let i = 0; i < 64; i += 32) { g.fillRect(i + 1, 1, 30, 30); g.fillRect(i + 1, 33, 30, 30); }
    speckle(g, 200, ['#0c0b0e', '#26222c']);
  });
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
  F.slime = make(g => {
    g.fillStyle = '#b0128a'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 26; i++) { g.fillStyle = ['#d81b9a', '#8a0f70', '#ff4fd0'][(rnd() * 3) | 0]; g.beginPath(); g.ellipse(rnd() * 64, rnd() * 64, 3 + rnd() * 8, 2 + rnd() * 5, rnd() * 3, 0, 7); g.fill(); }
    speckle(g, 90, ['#ffffff', '#ffd0f4'], 1);
  });

  // lift the darkest gothic surfaces so the levels read clearly
  function brighten(tex, f) {
    const d = tex.data;
    for (let i = 0; i < d.length; i++) {
      const c = d[i];
      const r = Math.min(255, (c & 255) * f + 6) | 0, g2 = Math.min(255, (c >> 8 & 255) * f + 6) | 0, b = Math.min(255, (c >> 16 & 255) * f + 8) | 0;
      d[i] = (c & 0xff000000) | (b << 16) | (g2 << 8) | r;
    }
  }
  for (const k of [1, 2, 5, 6, 10, 11]) brighten(T[k], 1.45);
  brighten(F.graveyard, 1.6); brighten(F.stoneCeil, 1.7); brighten(F.checker, 1.3);

  return { walls: T, flats: F };
})();
