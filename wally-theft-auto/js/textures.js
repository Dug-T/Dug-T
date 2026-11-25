// Procedural canvas textures: nothing is downloaded, everything is painted in code.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, repeat = true, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Seeded RNG so the city looks the same every visit
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function noise(ctx, w, h, amt, r) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// Road segment: asphalt with kerb edges and a dashed centre line. Runs along V.
export function roadTexture() {
  const r = rng(11);
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#3b3d42'; x.fillRect(0, 0, 256, 256);
  noise(x, 256, 256, 26, r);
  // tar patches
  for (let i = 0; i < 14; i++) {
    x.fillStyle = `rgba(20,20,24,${0.12 + r() * 0.15})`;
    x.beginPath(); x.ellipse(r() * 256, r() * 256, 6 + r() * 20, 4 + r() * 12, r() * 3, 0, 7); x.fill();
  }
  // edge lines (double yellow like UK kerbside no-parking)
  x.fillStyle = '#d9b43a';
  x.fillRect(14, 0, 3, 256); x.fillRect(19, 0, 3, 256);
  x.fillRect(256 - 17, 0, 3, 256); x.fillRect(256 - 22, 0, 3, 256);
  // dashed centre
  x.fillStyle = '#e8e8e0';
  for (let y = 0; y < 256; y += 64) x.fillRect(125, y + 8, 6, 36);
  return tex(c);
}

export function junctionTexture() {
  const r = rng(12);
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#3a3c41'; x.fillRect(0, 0, 256, 256);
  noise(x, 256, 256, 26, r);
  // zebra crossings on all four sides
  x.fillStyle = '#e6e6de';
  for (let i = 0; i < 8; i++) {
    const p = 34 + i * 25;
    x.fillRect(p, 4, 13, 30); x.fillRect(p, 222, 13, 30);
    x.fillRect(4, p, 30, 13); x.fillRect(222, p, 30, 13);
  }
  return tex(c, false);
}

export function sidewalkTexture() {
  const r = rng(13);
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#9d9a93'; x.fillRect(0, 0, 256, 256);
  noise(x, 256, 256, 18, r);
  x.strokeStyle = 'rgba(60,58,55,0.55)'; x.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke();
  }
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(40,40,40,${r() * 0.15})`; x.fillRect(r() * 256, r() * 256, 3 + r() * 8, 3 + r() * 8); }
  return tex(c);
}

export function grassTexture() {
  const r = rng(14);
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#4c7a32'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const g = 90 + r() * 70;
    x.fillStyle = `rgb(${g * 0.5 | 0},${g | 0},${g * 0.3 | 0})`;
    x.fillRect(r() * 256, r() * 256, 1, 2 + r() * 3);
  }
  return tex(c);
}

// Building facade. Returns { map, emissive }: a 4x4 grid of window bays, so one
// texture repeat = 4 bays (16m) by 4 storeys (14m). Lit windows are random per cell.
export function facadeTextures(style, seed) {
  const r = rng(seed);
  const C = 128, W = C * 4, H = C * 4;
  const [c, x] = canvas(W, H);
  const [e, ex] = canvas(W, H);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const walls = {
    brick: '#8a4a36', sandstone: '#c2a477', concrete: '#9a9a96', glass: '#2c3e50', tenement: '#6b4a3c', white: '#d8d4cc', teal: '#3d6e6e'
  };
  x.fillStyle = walls[style] || '#888'; x.fillRect(0, 0, W, H);
  noise(x, W, H, style === 'glass' ? 8 : 22, r);
  if (style === 'brick' || style === 'tenement') {
    x.strokeStyle = 'rgba(40,20,15,0.35)'; x.lineWidth = 1;
    for (let y = 0; y < H; y += 6) {
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
      for (let xx = (y / 6) % 2 ? 0 : 6; xx < W; xx += 12) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 6); x.stroke(); }
    }
  }
  if (style === 'sandstone') {
    x.strokeStyle = 'rgba(80,60,30,0.3)';
    for (let y = 0; y < H; y += 16) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  }
  const glass = style === 'glass';
  const warmCols = ['#ffd28a', '#ffe7b0', '#cfe6ff', '#ffc070', '#fff2d0'];
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const ox = cx * C, oy = cy * C;
    const wx = ox + (glass ? 6 : 26), wy = oy + (glass ? 10 : 26), ww = glass ? C - 12 : C - 52, wh = glass ? C - 30 : C - 50;
    if (!glass) {
      x.fillStyle = 'rgba(230,220,200,0.8)';
      x.fillRect(wx - 4, wy + wh, ww + 8, 6);
      x.fillRect(wx - 4, wy - 6, ww + 8, 5);
    }
    const g = x.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, glass ? '#7fa6c4' : '#6e8aa0'); g.addColorStop(1, glass ? '#1d3448' : '#1e2a36');
    x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
    // curtains / blinds variety
    if (!glass && r() < 0.5) { x.fillStyle = `hsla(${r() * 360},40%,55%,0.55)`; x.fillRect(wx, wy, ww * 0.25, wh); x.fillRect(wx + ww * 0.75, wy, ww * 0.25, wh); }
    x.fillStyle = 'rgba(255,255,255,0.16)';
    x.beginPath(); x.moveTo(wx + ww * 0.1, wy + wh); x.lineTo(wx + ww * 0.45, wy); x.lineTo(wx + ww * 0.6, wy); x.lineTo(wx + ww * 0.25, wy + wh); x.fill();
    x.strokeStyle = glass ? '#1a1f24' : '#f0ece2'; x.lineWidth = glass ? 3 : 4;
    x.strokeRect(wx, wy, ww, wh);
    x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.stroke();
    if (!glass) { x.beginPath(); x.moveTo(wx, wy + wh * 0.4); x.lineTo(wx + ww, wy + wh * 0.4); x.stroke(); }
    if (glass) { x.fillStyle = '#1b252e'; x.fillRect(ox, oy + C - 20, C, 20); }
    if (r() < 0.55) {
      ex.fillStyle = warmCols[(r() * warmCols.length) | 0];
      ex.globalAlpha = 0.6 + r() * 0.4;
      ex.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
      ex.globalAlpha = 1;
      ex.fillStyle = 'rgba(0,0,0,0.4)'; ex.fillRect(wx + ww / 2 - 2, wy, 4, wh);
    }
  }
  return { map: tex(c), emissive: tex(e) };
}

// Shopfront atlas: 8 rows of 128px, one shop per row. One row = 16m wide by 4.5m tall.
export const SHOP_NAMES = ['FISH SUPPERS', 'BOOKIES', 'TATTIE SCONES', 'CORNER SHOP', 'PIE PALACE', 'HAGGIS HUT', 'PAWN SHOP', 'CAPE & COWL'];
export function shopAtlas() {
  const r = rng(77);
  const [c, x] = canvas(512, 1024);
  const [e, ex] = canvas(512, 1024);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 1024);
  const cols = ['#1d6e4a', '#7a1f2b', '#b5651d', '#234e8c', '#5b2c6f', '#2d6a2d', '#6b5d1a', '#c0392b'];
  SHOP_NAMES.forEach((name, i) => {
    const oy = i * 128;
    x.fillStyle = '#2a2a2e'; x.fillRect(0, oy, 512, 128);
    x.fillStyle = cols[i]; x.fillRect(0, oy, 512, 34);
    x.fillStyle = '#fff'; x.font = 'bold 24px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(name, 256, oy + 18);
    ex.fillStyle = '#fff'; ex.font = 'bold 24px Georgia, serif'; ex.textAlign = 'center'; ex.textBaseline = 'middle';
    ex.fillText(name, 256, oy + 18);
    const g = x.createLinearGradient(0, oy + 40, 0, oy + 128);
    g.addColorStop(0, '#8fb3c9'); g.addColorStop(1, '#2b3c48');
    x.fillStyle = g; x.fillRect(16, oy + 42, 300, 80); x.fillRect(380, oy + 42, 116, 80);
    ex.fillStyle = 'rgba(255,220,150,0.7)'; ex.fillRect(16, oy + 42, 300, 80); ex.fillRect(380, oy + 42, 116, 80);
    x.fillStyle = '#6b3b22'; x.fillRect(330, oy + 42, 40, 86);
    for (let k = 0; k < 8; k++) { x.fillStyle = `hsl(${r() * 360},50%,${40 + r() * 30}%)`; x.fillRect(30 + k * 34, oy + 90 + r() * 10, 22, 30); }
    x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(16, oy + 42, 300, 8);
  });
  const t = tex(c); const te = tex(e);
  return { map: t, emissive: te };
}

export function roofTexture() {
  const r = rng(21);
  const [c, x] = canvas(128, 128);
  x.fillStyle = '#4a4a4c'; x.fillRect(0, 0, 128, 128);
  noise(x, 128, 128, 30, r);
  return tex(c);
}

// Wally Man chest emblem: orange oval, green rim, green lettering and a blue swoosh
export function emblemTexture() {
  const [c, x] = canvas(1024, 640);
  x.scale(2, 2);
  x.clearRect(0, 0, 512, 320);
  x.fillStyle = '#2f9a2f';
  x.beginPath(); x.ellipse(256, 160, 250, 150, 0, 0, 7); x.fill();
  x.fillStyle = '#ef5a1c';
  x.beginPath(); x.ellipse(256, 160, 232, 134, 0, 0, 7); x.fill();
  // shrink the lettering until the whole of "WALLY MAN" sits comfortably inside the oval
  let fs = 96;
  do { x.font = `bold ${fs}px Impact, "Arial Black", sans-serif`; fs -= 2; } while (x.measureText('WALLY MAN').width > 380 && fs > 30);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.save(); x.translate(256, 140); x.scale(1, 1.2);
  x.lineWidth = 8; x.strokeStyle = '#1d5e1d'; x.lineJoin = 'round'; x.strokeText('WALLY MAN', 0, 0);
  x.fillStyle = '#35a835'; x.fillText('WALLY MAN', 0, 0); x.restore();
  x.strokeStyle = '#1e5fb4'; x.lineWidth = 16; x.lineCap = 'round';
  x.beginPath(); x.moveTo(170, 240); x.quadraticCurveTo(300, 285, 380, 205); x.stroke();
  const t = tex(c, false);
  return t;
}

export function smokeTexture() {
  const [c, x] = canvas(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return tex(c, false);
}

export function waterTexture() {
  const r = rng(31);
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#2a5a78'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 300; i++) {
    x.strokeStyle = `rgba(200,230,255,${r() * 0.25})`; x.lineWidth = 1 + r() * 2;
    const px = r() * 256, py = r() * 256;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 8, py - 3, px + 16, py); x.stroke();
  }
  return tex(c);
}

// Car body detail: a number plate
export function plateTexture(text) {
  const [c, x] = canvas(128, 32);
  x.fillStyle = '#f2d23c'; x.fillRect(0, 0, 128, 32);
  x.strokeStyle = '#111'; x.lineWidth = 2; x.strokeRect(1, 1, 126, 30);
  x.fillStyle = '#111'; x.font = 'bold 20px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 64, 17);
  return tex(c, false);
}

export function signTexture(text, bg, fg) {
  const [c, x] = canvas(512, 128);
  x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
  x.fillStyle = fg; x.font = 'bold 64px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 256, 68);
  return tex(c, false);
}
