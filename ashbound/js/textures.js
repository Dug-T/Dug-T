// Procedural canvas textures: nothing is downloaded, everything is painted in code.
import * as THREE from 'three';

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function tex(c, repeat = true, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Seeded RNG so the island is the same every visit (and every player sees the same one later on)
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// value noise on a grid, for terrain and textures
export function makeNoise(seed) {
  const r = rng(seed), P = new Uint8Array(512), G = new Float32Array(512);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) { P[i + 256] = P[i]; G[i + 256] = G[i]; }
  const h = (x, y) => G[P[(P[x & 255] + y) & 255]];
  const fade = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = fade(x - xi), fy = fade(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
  };
  const fbm = (x, y, oct = 5, lac = 2.05, gain = 0.5) => {
    let s = 0, a = 0.5, norm = 0;
    for (let k = 0; k < oct; k++) { s += a * n2(x, y); norm += a; x *= lac; y *= lac; a *= gain; }
    return s / norm;
  };
  const ridge = (x, y, oct = 4) => {
    let s = 0, a = 0.5, norm = 0;
    for (let k = 0; k < oct; k++) { s += a * (1 - Math.abs(n2(x, y) * 2 - 1)); norm += a; x *= 2.1; y *= 2.1; a *= 0.5; }
    return s / norm;
  };
  return { n2, fbm, ridge };
}

function grain(ctx, w, h, amt, r) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}

function fill(ctx, w, h, col) { ctx.fillStyle = col; ctx.fillRect(0, 0, w, h); }

export function sandTexture() {
  const r = rng(21), [c, x] = canvas(256, 256);
  fill(x, 256, 256, '#e9d7ad');
  for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,245,220,0.35)' : 'rgba(170,140,90,0.25)'; x.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  // ripples left by the tide
  x.strokeStyle = 'rgba(190,165,115,0.25)'; x.lineWidth = 2;
  for (let i = 0; i < 20; i++) { x.beginPath(); const y = r() * 256; x.moveTo(0, y); for (let px = 0; px <= 256; px += 16) x.lineTo(px, y + Math.sin(px * 0.05 + i) * 6); x.stroke(); }
  grain(x, 256, 256, 18, r);
  return tex(c);
}

export function grassTexture() {
  const r = rng(22), [c, x] = canvas(256, 256);
  fill(x, 256, 256, '#3f7a2c');
  for (let i = 0; i < 1800; i++) {
    x.strokeStyle = `rgba(${40 + r() * 60 | 0},${110 + r() * 80 | 0},${30 + r() * 40 | 0},0.6)`; x.lineWidth = 1 + r();
    const px = r() * 256, py = r() * 256; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py - 4 - r() * 8); x.stroke();
  }
  for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(25,55,18,${0.05 + r() * 0.1})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 10 + r() * 24, 8 + r() * 16, r() * 3, 0, 7); x.fill(); }
  grain(x, 256, 256, 14, r);
  return tex(c);
}

export function rockTexture() {
  const r = rng(23), [c, x] = canvas(256, 256);
  fill(x, 256, 256, '#5a5752');
  for (let i = 0; i < 140; i++) { const l = 30 + r() * 70, w = r() * 8; x.fillStyle = `rgba(${l + w | 0},${l + w * 0.6 | 0},${l | 0},${0.25 + r() * 0.4})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 4 + r() * 22, 3 + r() * 12, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(15,15,15,0.5)'; x.lineWidth = 1.5;
  for (let i = 0; i < 30; i++) { x.beginPath(); let px = r() * 256, py = r() * 256; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 40; py += (r() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); }
  grain(x, 256, 256, 30, r);
  return tex(c);
}

export function ashTexture() {
  const r = rng(24), [c, x] = canvas(256, 256);
  fill(x, 256, 256, '#3a3634');
  for (let i = 0; i < 300; i++) { const l = 50 + r() * 40; x.fillStyle = `rgba(${l + 8 | 0},${l + 2 | 0},${l | 0},0.4)`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 2 + r() * 9, 2 + r() * 6, r() * 3, 0, 7); x.fill(); }
  for (let i = 0; i < 24; i++) { x.fillStyle = `rgba(120,40,10,${0.08 + r() * 0.12})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 3 + r() * 10, 2 + r() * 5, r() * 3, 0, 7); x.fill(); }
  grain(x, 256, 256, 24, r);
  return tex(c);
}

export function barkTexture() {
  const r = rng(25), [c, x] = canvas(128, 256);
  fill(x, 128, 256, '#8a6a46');
  for (let y = 0; y < 256; y += 10 + r() * 8) { x.fillStyle = `rgba(${40 + r() * 30 | 0},${28 + r() * 20 | 0},${15 + r() * 10 | 0},${0.35 + r() * 0.3})`; x.fillRect(0, y, 128, 3 + r() * 4); }
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(200,170,120,${r() * 0.2})`; x.fillRect(r() * 128, r() * 256, 3, 1.5); }
  grain(x, 128, 256, 22, r);
  return tex(c);
}

// a single palm frond with a transparent background: a central rib with leaflets on each side
export function frondTexture() {
  const r = rng(26), [c, x] = canvas(128, 512);
  x.clearRect(0, 0, 128, 512);
  // the frond runs from the base at the bottom (y = 512) to the tip at the top
  for (let y = 500; y > 14; y -= 4) {
    const t = 1 - y / 512; // 0 base .. 1 tip
    const len = 6 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 54 * (1 - t * 0.35);
    const g = `rgb(${30 + r() * 35 | 0},${105 + r() * 70 | 0},${30 + r() * 30 | 0})`;
    x.strokeStyle = g; x.lineWidth = 2.6 - t * 1.2;
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(64, y); x.quadraticCurveTo(64 + s * len * 0.5, y - len * 0.45, 64 + s * len, y - len * 0.9); x.stroke(); }
  }
  x.strokeStyle = '#8a7a3e'; x.lineWidth = 4; x.beginPath(); x.moveTo(64, 512); x.lineTo(64, 6); x.stroke();
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// a leafy bush / fern clump with a transparent background
export function bushTexture() {
  const r = rng(27), [c, x] = canvas(256, 256);
  x.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const px = 40 + r() * 176, py = 80 + r() * 160, s = 10 + r() * 22;
    x.fillStyle = `rgba(${30 + r() * 50 | 0},${90 + r() * 90 | 0},${30 + r() * 40 | 0},0.95)`;
    x.beginPath(); x.ellipse(px, py, s, s * 0.55, r() * 3.14, 0, 7); x.fill();
  }
  for (let i = 0; i < 20; i++) { x.strokeStyle = `rgba(${60 + r() * 60 | 0},${150 + r() * 60 | 0},50,0.9)`; x.lineWidth = 3; x.beginPath(); x.moveTo(128, 240); x.quadraticCurveTo(128 + (r() - 0.5) * 120, 150 + r() * 40, 60 + r() * 136, 40 + r() * 80); x.stroke(); }
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function flowerTexture() {
  const r = rng(28), [c, x] = canvas(128, 128);
  x.clearRect(0, 0, 128, 128);
  x.fillStyle = '#2f7a2a'; for (let i = 0; i < 10; i++) { x.beginPath(); x.ellipse(64 + (r() - 0.5) * 70, 70 + (r() - 0.5) * 60, 16, 8, r() * 3, 0, 7); x.fill(); }
  const cols = ['#ff3b5c', '#ff7a2a', '#ff5fa0', '#ffd23f'];
  for (let i = 0; i < 5; i++) {
    const px = 30 + r() * 68, py = 30 + r() * 68, col = cols[(r() * cols.length) | 0];
    for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; x.fillStyle = col; x.beginPath(); x.ellipse(px + Math.cos(a) * 8, py + Math.sin(a) * 8, 7, 4.5, a, 0, 7); x.fill(); }
    x.fillStyle = '#ffe680'; x.beginPath(); x.arc(px, py, 2.5, 0, 7); x.fill();
  }
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// soft round puff for smoke, ash, spray and glow
export function puffTexture() {
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// a hard-edged spark / ember
export function sparkTexture() {
  const [c, x] = canvas(32, 32);
  const g = x.createRadialGradient(16, 16, 1, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,220,120,0.9)'); g.addColorStop(1, 'rgba(255,120,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// crust and glowing cracks for the lava flows (tiles)
export function lavaTexture() {
  const N = makeNoise(31), [c, x] = canvas(256, 256);
  const img = x.createImageData(256, 256), d = img.data;
  for (let y = 0; y < 256; y++) for (let px = 0; px < 256; px++) {
    const u = px / 256, v = y / 256;
    // tileable: blend 4 shifted samples
    const n = (N.ridge(u * 6, v * 6, 4) + N.ridge((u + 1) * 6, v * 6, 4) + N.ridge(u * 6, (v + 1) * 6, 4) + N.ridge((u + 1) * 6, (v + 1) * 6, 4)) / 4;
    const crack = Math.pow(Math.max(0, n - 0.45) / 0.55, 1.5);
    const i = (y * 256 + px) * 4;
    d[i] = 30 + crack * 225; d[i + 1] = 20 + crack * 150; d[i + 2] = 18 + crack * 30; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return tex(c);
}

// tileable grey noise, used as a detail map and by the water for foam
export function noiseTexture() {
  const N = makeNoise(32), [c, x] = canvas(256, 256);
  const img = x.createImageData(256, 256), d = img.data;
  for (let y = 0; y < 256; y++) for (let px = 0; px < 256; px++) {
    const u = px / 256, v = y / 256;
    const n = (N.fbm(u * 5, v * 5, 4) + N.fbm((u + 1) * 5, v * 5, 4) + N.fbm(u * 5, (v + 1) * 5, 4) + N.fbm((u + 1) * 5, (v + 1) * 5, 4)) / 4;
    const i = (y * 256 + px) * 4; const g = n * 255; d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return tex(c, true, false);
}

export function thatchTexture() {
  const r = rng(33), [c, x] = canvas(128, 128);
  fill(x, 128, 128, '#b8964f');
  for (let i = 0; i < 400; i++) { x.strokeStyle = `rgba(${90 + r() * 80 | 0},${60 + r() * 60 | 0},${20 + r() * 30 | 0},0.7)`; x.lineWidth = 1 + r() * 1.5; x.beginPath(); const px = r() * 128, py = r() * 128; x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py + 10 + r() * 14); x.stroke(); }
  return tex(c);
}

export function metalTexture() {
  const r = rng(34), [c, x] = canvas(128, 128);
  fill(x, 128, 128, '#c9cdd1');
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(120,70,30,${0.1 + r() * 0.35})`; x.beginPath(); x.ellipse(r() * 128, r() * 128, 4 + r() * 18, 3 + r() * 9, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(60,60,60,0.5)'; x.lineWidth = 1; for (let i = 0; i < 6; i++) { const y = r() * 128; x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); }
  grain(x, 128, 128, 16, r);
  return tex(c);
}

export function concreteTexture() {
  const r = rng(35), [c, x] = canvas(128, 128);
  fill(x, 128, 128, '#8d8c86');
  for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(40,60,30,${r() * 0.3})`; x.beginPath(); x.ellipse(r() * 128, r() * 128, 3 + r() * 14, 2 + r() * 8, r() * 3, 0, 7); x.fill(); }
  grain(x, 128, 128, 26, r);
  return tex(c);
}

// the title / signage font rendered to a texture, for the ranger station sign etc
export function signTexture(text, bg = '#3b2a1a', fg = '#f4e7c3') {
  const [c, x] = canvas(256, 64);
  fill(x, 256, 64, bg);
  x.fillStyle = fg; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 34);
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
