// Day-night cycle and weather. The *state* (time of day, weather type, sight and speed modifiers) is
// driven by game time and the seeded RNG so it stays in sync online; the visuals are local only.
import * as THREE from 'three';
import { G, srand, srr, clamp, lerp } from './state.js';
import { allMaterials } from './materials.js';
import { softSprite } from './textures.js';
import { groundY } from './terrain.js';

export const WEATHER = {
  clear:     { label: '☀ Clear', sight: 1, speed: 1, fog: 1, dark: 0 },
  rain:      { label: '🌧 Rain', sight: 0.9, speed: 0.92, fog: 0.7, dark: 0.25, rain: 1 },
  storm:     { label: '⛈ Storm', sight: 0.8, speed: 0.88, fog: 0.55, dark: 0.45, rain: 1.8, lightning: true },
  fog:       { label: '🌫 Fog', sight: 0.7, speed: 1, fog: 0.22, dark: 0.15 },
  snow:      { label: '🌨 Snow', sight: 0.9, speed: 0.92, fog: 0.6, dark: 0.15, snow: 1 },
  blizzard:  { label: '❄ Blizzard', sight: 0.65, speed: 0.8, fog: 0.3, dark: 0.3, snow: 2.5 },
  sandstorm: { label: '🌪 Sandstorm', sight: 0.6, speed: 0.9, fog: 0.25, dark: 0.2, sand: 1, tint: 0xc9965a },
  ashfall:   { label: '🌋 Ashfall', sight: 0.75, speed: 1, fog: 0.35, dark: 0.3, sand: 0.7, tint: 0x5a4038 },
};

let theme, map, sky, stars, rain, snow, sand, bolt;
const W = { type: 'clear', prev: 'clear', k: 1, next: 120 };
const DAY_LENGTH = 720; // seconds of game time for a full day

export function initWeather(scene, mapDef, th) {
  map = mapDef; theme = th;
  G.weather = W;
  W.type = W.prev = (G.cfg.weather && WEATHER[G.cfg.weather]) ? G.cfg.weather : 'clear';
  W.k = 1; W.next = 90 + srand() * 60;
  sky = G.three.sky;
  // stars
  const n = 900, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 560;
    const y = Math.abs(u) * 0.9 + 0.1, s = Math.sqrt(1 - y * y);
    p.set([Math.cos(a) * s * r, y * r, Math.sin(a) * s * r], i * 3);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  // rain: falling line streaks in a box that follows the camera
  const RN = 5000;
  const rp = new Float32Array(RN * 6);
  for (let i = 0; i < RN; i++) { const x = (Math.random() - 0.5) * 140, y = Math.random() * 60, z = (Math.random() - 0.5) * 140; rp.set([x, y, z, x + 0.15, y + 1.4, z], i * 6); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3).setUsage(THREE.DynamicDrawUsage));
  rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaac4dd, transparent: true, opacity: 0, depthWrite: false }));
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  // snow and sand: drifting points
  const mkPts = (N, color, size) => {
    const pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) pp.set([(Math.random() - 0.5) * 140, Math.random() * 50, (Math.random() - 0.5) * 140], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pp, 3).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: softSprite(), transparent: true, opacity: 0, depthWrite: false }));
    m.frustumCulled = false; m.visible = false; scene.add(m); return m;
  };
  snow = mkPts(4000, 0xffffff, 0.45);
  sand = mkPts(4000, th.lava ? 0x9a8c86 : 0xd8a868, 0.7); // grey ash on volcanic maps
  bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: new THREE.Color(4, 4, 6), transparent: true, opacity: 0 }));
  bolt.frustumCulled = false; scene.add(bolt);
}

// time of day 0..1 (0.5 = noon); deterministic from game time
export function timeOfDay() {
  if (map?.night) return 0.02;
  if (!G.cfg.daynight) return 0.42;
  return (0.3 + G.time / DAY_LENGTH) % 1;
}
export function clockString() {
  const t = timeOfDay() * 24, h = Math.floor(t), m = Math.floor((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---- simulation side (deterministic) ----
export function updateWeatherSim(dt) {
  if (!map) return;
  W.next -= dt;
  if (W.k < 1) W.k = Math.min(1, W.k + dt / 12);
  if (W.next <= 0 && !G.cfg.weather) {
    const list = map.weather || ['clear'];
    const t = list[Math.floor(srand() * list.length)];
    if (t !== W.type) {
      W.prev = W.type; W.type = t; W.k = 0;
      G.announce?.(`Weather report: ${WEATHER[t].label.slice(2)}`, G.player, 1);
    }
    W.next = srr(100, 200);
  }
  const tod = timeOfDay();
  const day = clamp(Math.sin((tod - 0.25) * Math.PI * 2) * 2 + 0.55, 0, 1);
  G.nightLevel = 1 - day;
  const a = WEATHER[W.prev], b = WEATHER[W.type];
  const ws = lerp(a.sight, b.sight, W.k), sp = lerp(a.speed, b.speed, W.k);
  G.sightMult = ws * (1 - 0.22 * G.nightLevel);
  G.speedMult = sp;
}

// ---- visuals (local) ----
const cTop = new THREE.Color(), cHor = new THREE.Color(), cBot = new THREE.Color(), tmp = new THREE.Color(), tmp2 = new THREE.Color();
const NIGHT_TOP = new THREE.Color(0x0a1430), NIGHT_HOR = new THREE.Color(0x22304e), NIGHT_BOT = new THREE.Color(0x10141c);
const NIGHT_AMB = new THREE.Color(0x6a7cae); // soft moonlit blue for the ambient light at night (brighter than the sky colour)
const DUSK = new THREE.Color(0xff9a5a);
let skyT = 0, flashT = 0, nextBolt = 5, lastEnvK = -1;

export function updateWeatherFX(dt, real) {
  if (!map) return;
  const T3 = G.three;
  const tod = timeOfDay();
  const elev = Math.sin((tod - 0.25) * Math.PI * 2);
  const day = clamp(elev * 2 + 0.55, 0, 1);
  const dusk = clamp(1 - Math.abs(elev) * 3.2, 0, 1) * (elev > -0.2 ? 1 : 0);
  const wa = WEATHER[W.prev], wb = WEATHER[W.type];
  const dark = lerp(wa.dark, wb.dark, W.k);
  const fogK = lerp(wa.fog, wb.fog, W.k);
  const tint = wb.tint !== undefined && W.k > 0 ? tmp2.set(wb.tint) : null;

  // sun / moon
  const sunMul = day * (1 - dark * 0.7);
  const sun = T3.sun;
  if (day > 0.02) {
    sun.color.set(theme.sun).lerp(DUSK, dusk * 0.6);
    sun.intensity = theme.sunI * sunMul + 0.15;
  } else { sun.color.set(0x9fb6ff); sun.intensity = 1.0 * (1 - dark * 0.5); } // moonlight
  sun.userData.angle = (tod - 0.25) * Math.PI * 2;
  T3.hemi.intensity = theme.hemiI * (0.45 + 0.55 * day) * (1 - dark * 0.4);
  T3.hemi.color.set(theme.hemiSky).lerp(NIGHT_AMB, 1 - day);

  // flash of lightning
  if (wb.lightning && W.k > 0.5) {
    nextBolt -= real;
    if (nextBolt <= 0) {
      nextBolt = 3 + Math.random() * 9; flashT = 0.35;
      const x = G.camera.x + (Math.random() - 0.5) * 80, z = G.camera.z + (Math.random() - 0.5) * 80, y = groundY(x, z);
      const pos = bolt.geometry.attributes.position;
      for (let i = 0; i < 12; i++) pos.setXYZ(i, x + (Math.random() - 0.5) * (i ? 6 : 0) * (1 - i / 12), y + 90 * (1 - i / 11), z + (Math.random() - 0.5) * (i ? 6 : 0) * (1 - i / 12));
      pos.needsUpdate = true;
      setTimeout(() => G.sfx?.explosion(G.camera.x + (Math.random() - 0.5) * 30, G.camera.z, 2.5), 300 + Math.random() * 1200);
    }
  }
  if (flashT > 0) { flashT -= real; const f = Math.max(0, flashT / 0.35); T3.hemi.intensity += 3 * f; bolt.material.opacity = f; } else bolt.material.opacity = 0;

  // sky colours (vertex colours updated a few times a second)
  skyT -= real;
  if (skyT <= 0) {
    skyT = 0.25;
    cTop.set(theme.skyTop).lerp(NIGHT_TOP, 1 - day); cHor.set(theme.horizon).lerp(DUSK, dusk * 0.5).lerp(NIGHT_HOR, 1 - day); cBot.set(theme.skyBottom).lerp(NIGHT_BOT, 1 - day);
    const grey = tmp.set(0x6a7078).multiplyScalar(0.4 + 0.6 * day);
    cTop.lerp(grey, dark); cHor.lerp(grey, dark * 0.8);
    if (tint) { cHor.lerp(tint.clone().multiplyScalar(0.3 + 0.7 * day), W.k * 0.8); cTop.lerp(tint.clone().multiplyScalar(0.3 + 0.6 * day), W.k * 0.6); }
    const pos = sky.geometry.attributes.position, col = sky.geometry.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 600;
      if (y > 0) tmp.copy(cHor).lerp(cTop, Math.pow(y, 0.6)); else tmp.copy(cHor).lerp(cBot, Math.min(1, -y * 4));
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
    T3.scene.background.copy(cHor);
    T3.scene.fog.color.copy(cHor);
    stars.material.opacity = clamp((1 - day) * (1 - dark * 1.5), 0, 1);
    // reflections dim at night
    const envK = Math.round((0.3 + 0.7 * day * (1 - dark * 0.5)) * 20) / 20;
    if (envK !== lastEnvK) { lastEnvK = envK; for (const m of allMaterials) m.envMapIntensity = envK; }
    if (T3.terrain) T3.terrain.material.roughness = 0.95 - 0.35 * clamp((wa.rain || 0) * (1 - W.k) + (wb.rain || 0) * W.k, 0, 1);
    if (T3.bloom) T3.bloom.strength = 0.7 + 0.35 * (1 - day);
    T3.renderer.toneMappingExposure = 1.05 + 0.4 * (1 - day);
  }
  const near = 160 * fogK, far = 420 * Math.max(0.35, fogK);
  T3.scene.fog.near = lerp(T3.scene.fog.near, near, Math.min(1, real * 2));
  T3.scene.fog.far = lerp(T3.scene.fog.far, far, Math.min(1, real * 2));

  // precipitation follows the camera
  const cx = G.camera.x, cz = G.camera.z, cy = G.camera.ty || 0;
  const rainK = lerp(wa.rain || 0, wb.rain || 0, W.k);
  rain.visible = rainK > 0.02;
  if (rain.visible) {
    rain.material.opacity = Math.min(0.55, 0.3 * rainK) * (0.6 + 0.4 * day);
    const p = rain.geometry.attributes.position.array, N = p.length / 6;
    const fall = 55 * real, active = Math.floor(N * Math.min(1, rainK / 1.8));
    rain.geometry.setDrawRange(0, active * 2);
    for (let i = 0; i < active; i++) {
      const k = i * 6;
      p[k + 1] -= fall; p[k + 4] -= fall; p[k] -= fall * 0.1; p[k + 3] -= fall * 0.1;
      if (p[k + 1] < cy - 5) { const x = cx + (Math.random() - 0.5) * 140, z = cz + (Math.random() - 0.5) * 140, y = cy + 40 + Math.random() * 20; p[k] = x; p[k + 1] = y; p[k + 2] = z; p[k + 3] = x + 0.15; p[k + 4] = y + 1.4; p[k + 5] = z; }
    }
    rain.geometry.attributes.position.needsUpdate = true;
  }
  drift(snow, lerp(wa.snow || 0, wb.snow || 0, W.k), 5, 1.2, 0.85, real, cx, cy, cz);
  drift(sand, lerp(wa.sand || 0, wb.sand || 0, W.k), 1.5, 18, 0.6, real, cx, cy, cz);
}

function drift(pts, k, fallSpeed, wind, maxOp, real, cx, cy, cz) {
  pts.visible = k > 0.02;
  if (!pts.visible) return;
  pts.material.opacity = Math.min(maxOp, k * 0.6);
  const p = pts.geometry.attributes.position.array, N = p.length / 3;
  const active = Math.floor(N * Math.min(1, k / 2.5));
  pts.geometry.setDrawRange(0, active);
  const t = performance.now() / 1000;
  for (let i = 0; i < active; i++) {
    const j = i * 3;
    p[j + 1] -= fallSpeed * real * (0.6 + (i % 7) * 0.08);
    p[j] += (wind + Math.sin(t + i) * 1.2) * real; p[j + 2] += Math.cos(t * 0.7 + i) * real;
    if (p[j + 1] < cy - 3 || Math.abs(p[j] - cx) > 75 || Math.abs(p[j + 2] - cz) > 75) {
      p[j] = cx + (Math.random() - 0.5) * 140; p[j + 1] = cy + Math.random() * 45; p[j + 2] = cz + (Math.random() - 0.5) * 140;
    }
  }
  pts.geometry.attributes.position.needsUpdate = true;
}

export function weatherLabel() { return WEATHER[W.type]?.label || ''; }
