// Army skins: armour patterns for your own side, unlocked by Commander rank. They're painted over
// your army colour, so friend and foe stay easy to tell apart. Visual only (never affects the battle).
import * as THREE from 'three';
import { loadProfile, rankOf, RANKS } from './profile.js';
import { mulberry32 } from './state.js';

export const SKINS = {
  standard: { name: 'Standard', rank: 0, icon: '▫', desc: 'Factory-fresh armour plating.' },
  camo:     { name: 'Woodland Camo', rank: 1, icon: '🌿', desc: 'Blotchy camouflage. Very sneaky. Probably.' },
  tiger:    { name: 'Tiger Stripes', rank: 2, icon: '🐯', desc: 'Bold stripes for bold commanders.' },
  tartan:   { name: 'Tartan', rank: 3, icon: '🏴', desc: 'Pure dead brilliant. Wally Man approves.' },
  digital:  { name: 'Digital Camo', rank: 4, icon: '▦', desc: 'Pixel camouflage from the future.' },
  chrome:   { name: 'Chrome', rank: 5, icon: '🪞', desc: 'Polished till you can see your face in it.' },
  goldtrim: { name: 'Gold Trim', rank: 6, icon: '🥇', desc: 'Gilded trim and fittings fit for a Colonel.' },
  carbon:   { name: 'Carbon Fibre', rank: 7, icon: '⬛', desc: 'Woven carbon panels. Light, strong, expensive.' },
  legend:   { name: 'Legend', rank: 8, icon: '👑', desc: 'Chrome, gold and glowing trim. Only for Field Marshals.' },
};

export const rankIndex = () => rankOf(loadProfile().xp).index;
export const skinUnlocked = k => !!SKINS[k] && rankIndex() >= SKINS[k].rank;
export const skinRankName = k => RANKS[SKINS[k].rank].name;
export function getSkin() {
  let k = 'standard'; try { k = localStorage.getItem('ws_skin') || 'standard'; } catch { /* ignore */ }
  return skinUnlocked(k) ? k : 'standard';
}
export function setSkin(k) { try { if (k === 'standard') localStorage.removeItem('ws_skin'); else localStorage.setItem('ws_skin', k); } catch { /* ignore */ } }

// ---- pattern textures (light greys, multiplied with the army colour)
const cache = {};
function paint(key, fn, repeat = 1) {
  if (cache[key]) return cache[key];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); fn(x, S, mulberry32(key.length * 97 + 11));
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (cache[key] = t);
}
const grey = v => `rgb(${v},${v},${v})`;
function blobs(x, S, R, n, rMin, rMax, cols) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = cols[i % cols.length];
    const cx = R() * S, cy = R() * S, r = rMin + R() * (rMax - rMin);
    for (const [dx, dy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { // wrap around so it tiles
      x.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = r * (0.6 + R() * 0.6); x.lineTo(cx + dx + Math.cos(a) * rr * 1.4, cy + dy + Math.sin(a) * rr); }
      x.closePath(); x.fill();
    }
  }
}
export function skinTexture(k) {
  if (k === 'camo') return paint('camo', (x, S, R) => { x.fillStyle = grey(235); x.fillRect(0, 0, S, S); blobs(x, S, R, 26, 14, 34, [grey(150), grey(95), grey(200)]); }, 2);
  if (k === 'tiger') return paint('tiger', (x, S, R) => {
    x.fillStyle = grey(240); x.fillRect(0, 0, S, S); x.fillStyle = grey(70);
    for (let i = 0; i < 9; i++) { const y = i * S / 9 + R() * 8; x.beginPath(); x.moveTo(0, y); for (let s = 0; s <= 8; s++) x.lineTo(s * S / 8, y + Math.sin(s * 1.3 + i) * 10 + (s % 2 ? 7 : -3)); for (let s = 8; s >= 0; s--) x.lineTo(s * S / 8, y + Math.sin(s * 1.3 + i) * 10 + 9 + R() * 6); x.closePath(); x.fill(); }
  }, 2);
  if (k === 'tartan') return paint('tartan', (x, S) => {
    x.fillStyle = grey(215); x.fillRect(0, 0, S, S);
    const bands = [[0, 46, 'rgba(20,20,40,0.55)'], [70, 14, 'rgba(30,90,40,0.45)'], [120, 40, 'rgba(20,20,40,0.5)'], [180, 6, 'rgba(255,240,120,0.65)'], [200, 22, 'rgba(160,20,20,0.45)']];
    for (const [p, w, c] of bands) { x.fillStyle = c; x.fillRect(p, 0, w, S); x.fillRect(0, p, S, w); }
    x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1; for (let i = -S; i < S; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke(); }
  }, 2);
  if (k === 'digital') return paint('digital', (x, S, R) => {
    const P = 8, cols = [grey(235), grey(175), grey(120), grey(205)];
    for (let j = 0; j < S / P; j++) for (let i = 0; i < S / P; i++) { const v = Math.sin(i * 0.45 + R() * 0.8) + Math.cos(j * 0.5 + i * 0.1 + R() * 0.8); x.fillStyle = cols[(Math.floor(v * 1.6 + 4) + (R() < 0.15 ? 1 : 0)) % 4]; x.fillRect(i * P, j * P, P, P); }
  }, 2);
  if (k === 'carbon' || k === 'legend') return paint('carbon', (x, S) => {
    const P = 16;
    for (let j = 0; j < S / P; j++) for (let i = 0; i < S / P; i++) {
      const g = x.createLinearGradient(i * P, j * P, (i + ((i + j) % 2)) * P, (j + ((i + j + 1) % 2)) * P);
      g.addColorStop(0, grey(110)); g.addColorStop(0.5, grey(200)); g.addColorStop(1, grey(110));
      x.fillStyle = g; x.fillRect(i * P, j * P, P, P);
    }
  }, 3);
  return null;
}

// Change the faction materials in place for the chosen skin
export function applySkin(m, k) {
  if (!k || k === 'standard') return m;
  const tx = skinTexture(k);
  if (tx) { m.team.map = tx; m.teamDark.map = tx; m.team.needsUpdate = m.teamDark.needsUpdate = true; }
  if (k === 'chrome' || k === 'legend') { m.team.metalness = 1; m.team.roughness = 0.12; m.teamDark.metalness = 0.95; m.teamDark.roughness = 0.18; }
  if (k === 'carbon') { m.team.metalness = 0.5; m.team.roughness = 0.35; }
  if (k === 'goldtrim' || k === 'legend') { m.accent.color.set(0xe8b030); m.accent.metalness = 0.95; m.accent.roughness = 0.22; }
  if (k === 'legend') { m.accent.emissive = new THREE.Color(0x8a5a00); m.accent.emissiveIntensity = 0.6; m.glow.emissiveIntensity = 3.2; }
  return m;
}
