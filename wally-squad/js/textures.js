// Procedurally painted textures (no image files needed).
import * as THREE from 'three';
import { mulberry32, fbm } from './state.js';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(ctx, w, h, n, r, alpha, seed) {
  const R = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const v = Math.floor(R() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * R()})`;
    ctx.fillRect(R() * w, R() * h, R() * r + 0.5, R() * r + 0.5);
  }
}

const cache = {};

// Painted armour plate with panel seams, rivets, grime and scratches
export function panelTexture() {
  if (cache.panel) return cache.panel;
  const S = 512; const [c, x] = canvas(S);
  x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, S, S);
  speckle(x, S, S, 9000, 2, 0.12, 3);
  const R = mulberry32(9);
  // panel seams
  x.strokeStyle = 'rgba(30,30,30,0.55)'; x.lineWidth = 2;
  const cells = [[0, 0, 256, 192], [256, 0, 256, 128], [256, 128, 256, 192], [0, 192, 160, 320], [160, 192, 352, 128], [160, 320, 192, 192], [352, 320, 160, 192]];
  for (const [a, b, w, h] of cells) {
    x.strokeRect(a + 2, b + 2, w - 4, h - 4);
    x.fillStyle = `rgba(255,255,255,${0.04 + R() * 0.05})`; x.fillRect(a + 4, b + 4, w - 8, h - 8);
    x.fillStyle = 'rgba(20,20,20,0.6)';
    for (let i = 8; i < w - 8; i += 22) { x.beginPath(); x.arc(a + i, b + 8, 1.8, 0, 7); x.arc(a + i, b + h - 8, 1.8, 0, 7); x.fill(); }
  }
  // grime streaks
  for (let i = 0; i < 70; i++) {
    const gx = R() * S, gy = R() * S, gl = 20 + R() * 90;
    const g = x.createLinearGradient(gx, gy, gx, gy + gl);
    g.addColorStop(0, 'rgba(40,35,30,0.22)'); g.addColorStop(1, 'rgba(40,35,30,0)');
    x.fillStyle = g; x.fillRect(gx, gy, 2 + R() * 4, gl);
  }
  // scratches
  x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 1;
  for (let i = 0; i < 60; i++) { const sx = R() * S, sy = R() * S; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (R() - 0.5) * 30, sy + (R() - 0.5) * 12); x.stroke(); }
  return (cache.panel = tex(c));
}

export function metalTexture() {
  if (cache.metal) return cache.metal;
  const S = 256; const [c, x] = canvas(S);
  x.fillStyle = '#d4d6d8'; x.fillRect(0, 0, S, S);
  const R = mulberry32(4);
  for (let i = 0; i < S; i++) { x.fillStyle = `rgba(255,255,255,${R() * 0.06})`; x.fillRect(0, i, S, 1); }
  speckle(x, S, S, 4000, 1.5, 0.2, 5);
  return (cache.metal = tex(c));
}

export function concreteTexture() {
  if (cache.concrete) return cache.concrete;
  const S = 512; const [c, x] = canvas(S);
  x.fillStyle = '#9a978f'; x.fillRect(0, 0, S, S);
  const img = x.getImageData(0, 0, S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const n = fbm(i / 40, j / 40, 4) * 40 + (Math.random() - 0.5) * 18;
    const k = (j * S + i) * 4;
    img.data[k] += n; img.data[k + 1] += n; img.data[k + 2] += n;
  }
  x.putImageData(img, 0, 0);
  x.strokeStyle = 'rgba(40,40,40,0.5)'; x.lineWidth = 2;
  for (let i = 0; i <= S; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); }
  const R = mulberry32(77);
  x.strokeStyle = 'rgba(30,30,30,0.35)'; x.lineWidth = 1;
  for (let i = 0; i < 25; i++) {
    let cx = R() * S, cy = R() * S; x.beginPath(); x.moveTo(cx, cy);
    for (let k = 0; k < 6; k++) { cx += (R() - 0.5) * 30; cy += (R() - 0.5) * 30; x.lineTo(cx, cy); }
    x.stroke();
  }
  // oil stains
  for (let i = 0; i < 12; i++) {
    const g = x.createRadialGradient(R() * S, R() * S, 0, 0, 0, 0);
    const ox = R() * S, oy = R() * S, rad = 10 + R() * 30;
    const gg = x.createRadialGradient(ox, oy, 0, ox, oy, rad);
    gg.addColorStop(0, 'rgba(20,18,15,0.35)'); gg.addColorStop(1, 'rgba(20,18,15,0)');
    x.fillStyle = gg; x.beginPath(); x.arc(ox, oy, rad, 0, 7); x.fill(); void g;
  }
  return (cache.concrete = tex(c));
}

export function hazardTexture() {
  if (cache.hazard) return cache.hazard;
  const S = 128; const [c, x] = canvas(S);
  x.fillStyle = '#f2c200'; x.fillRect(0, 0, S, S);
  x.fillStyle = '#151515';
  for (let i = -S; i < S * 2; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 0); x.lineTo(i + 16 - S, S); x.lineTo(i - S, S); x.fill(); }
  speckle(x, S, S, 800, 2, 0.25, 8);
  return (cache.hazard = tex(c));
}

export function windowTexture() {
  if (cache.window) return cache.window;
  const S = 128; const [c, x] = canvas(S);
  x.fillStyle = '#05080c'; x.fillRect(0, 0, S, S);
  const R = mulberry32(12);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const on = R() > 0.35;
    x.fillStyle = on ? `rgb(${200 + R() * 55},${190 + R() * 50},${120 + R() * 60})` : '#0b1118';
    x.fillRect(i * 32 + 4, j * 32 + 6, 24, 18);
  }
  return (cache.window = tex(c));
}

export function treadTexture() {
  if (cache.tread) return cache.tread;
  const S = 128; const [c, x] = canvas(S, 32);
  x.fillStyle = '#1d1d1d'; x.fillRect(0, 0, S, 32);
  for (let i = 0; i < S; i += 8) { x.fillStyle = '#3a3a3a'; x.fillRect(i, 0, 5, 32); x.fillStyle = '#111'; x.fillRect(i + 5, 0, 1, 32); }
  const t = tex(c); t.repeat.set(1, 1); return (cache.tread = t);
}

// Ground detail (tiling, grey-scale, multiplied with vertex colours)
export function groundDetailTexture() {
  if (cache.ground) return cache.ground;
  const S = 512; const [c, x] = canvas(S);
  const img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    // tileable by wrapping noise coordinates on a torus-ish trick: sum of periodic fbm
    const u = i / S, v = j / S;
    const n = fbmPeriodic(u, v, 8) * 0.55 + fbmPeriodic(u, v, 32) * 0.3 + (Math.random() - 0.5) * 0.18;
    const g = Math.max(0, Math.min(255, 200 + n * 110));
    const k = (j * S + i) * 4;
    img.data[k] = g; img.data[k + 1] = g; img.data[k + 2] = g; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // little pebbles / grass tufts
  const R = mulberry32(21);
  for (let i = 0; i < 1600; i++) {
    const v = 150 + R() * 100;
    x.fillStyle = `rgba(${v},${v},${v},0.35)`;
    x.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 3);
  }
  return (cache.ground = tex(c, 40));
}

export function groundNormalTexture() {
  if (cache.groundN) return cache.groundN;
  const S = 256; const [c, x] = canvas(S);
  const h = new Float32Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) h[j * S + i] = fbmPeriodic(i / S, j / S, 16) + fbmPeriodic(i / S, j / S, 48) * 0.5;
  const img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const l = h[j * S + ((i - 1 + S) % S)], r = h[j * S + ((i + 1) % S)];
    const d = h[((j - 1 + S) % S) * S + i], u = h[((j + 1) % S) * S + i];
    let nx = (l - r) * 6, ny = (d - u) * 6, nz = 1; const L = Math.hypot(nx, ny, nz);
    nx /= L; ny /= L; nz /= L;
    const k = (j * S + i) * 4;
    img.data[k] = (nx * 0.5 + 0.5) * 255; img.data[k + 1] = (ny * 0.5 + 0.5) * 255; img.data[k + 2] = (nz * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return (cache.groundN = tex(c, 40, false));
}

function fbmPeriodic(u, v, f) {
  // periodic noise via 4-corner blend
  const a = fbm(u * f, v * f, 3), b = fbm((u - 1) * f, v * f, 3);
  const c = fbm(u * f, (v - 1) * f, 3), d = fbm((u - 1) * f, (v - 1) * f, 3);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export function waterNormalTexture() {
  if (cache.waterN) return cache.waterN;
  const S = 256; const [c, x] = canvas(S);
  const img = x.createImageData(S, S);
  const h = new Float32Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) h[j * S + i] = fbmPeriodic(i / S, j / S, 6) + fbmPeriodic(i / S, j / S, 18) * 0.4;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const l = h[j * S + ((i - 1 + S) % S)], r = h[j * S + ((i + 1) % S)];
    const d = h[((j - 1 + S) % S) * S + i], u = h[((j + 1) % S) * S + i];
    let nx = (l - r) * 4, ny = (d - u) * 4, nz = 1; const L = Math.hypot(nx, ny, nz);
    const k = (j * S + i) * 4;
    img.data[k] = (nx / L * 0.5 + 0.5) * 255; img.data[k + 1] = (ny / L * 0.5 + 0.5) * 255; img.data[k + 2] = (nz / L * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return (cache.waterN = tex(c, 6, false));
}

// ---- particle sprites ----
export function softSprite() {
  if (cache.soft) return cache.soft;
  const S = 64; const [c, x] = canvas(S);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); return (cache.soft = t);
}

export function smokeSprite() {
  if (cache.smoke) return cache.smoke;
  const S = 128; const [c, x] = canvas(S);
  const img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (i - S / 2) / (S / 2), dy = (j - S / 2) / (S / 2);
    const d = Math.sqrt(dx * dx + dy * dy);
    const n = fbm(i / 18 + 3, j / 18 + 7, 4) * 0.9;
    let a = Math.max(0, 1 - d * (1.05 - n * 0.6)); a = a * a * (3 - 2 * a);
    const shade = 200 + n * 90;
    const k = (j * S + i) * 4;
    img.data[k] = shade; img.data[k + 1] = shade; img.data[k + 2] = shade; img.data[k + 3] = a * 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); return (cache.smoke = t);
}

export function ringSprite() {
  if (cache.ring) return cache.ring;
  const S = 128; const [c, x] = canvas(S);
  const g = x.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); return (cache.ring = t);
}

export function scorchTexture() {
  if (cache.scorch) return cache.scorch;
  const S = 128; const [c, x] = canvas(S);
  const img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (i - S / 2) / (S / 2), dy = (j - S / 2) / (S / 2);
    const d = Math.sqrt(dx * dx + dy * dy) + fbm(i / 10, j / 10, 3) * 0.5;
    const a = Math.max(0, Math.min(1, (1 - d) * 1.6));
    const k = (j * S + i) * 4;
    img.data[k] = 12; img.data[k + 1] = 10; img.data[k + 2] = 8; img.data[k + 3] = a * 230;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); return (cache.scorch = t);
}

export function selectRingTexture() {
  if (cache.sel) return cache.sel;
  const S = 128; const [c, x] = canvas(S);
  x.strokeStyle = 'rgba(255,255,255,1)'; x.lineWidth = 6;
  x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 10;
  for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 8, k * Math.PI / 2 - 0.3, k * Math.PI / 2 + 0.3); x.stroke(); }
  const t = new THREE.CanvasTexture(c); return (cache.sel = t);
}
