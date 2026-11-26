// The island: a seeded heightfield with a volcano, splat-shaded terrain, the sea, the sky and the jungle.
import * as THREE from 'three';
import { makeNoise, rng, sandTexture, grassTexture, rockTexture, ashTexture, barkTexture, frondTexture, bushTexture, flowerTexture, noiseTexture, tuftTexture } from './textures.js';

export const W = 800;            // the world is W x W metres, centred on 0,0
export const N = 256;            // heightfield cells per side
export const CELL = W / N;
export const SEA = 0;            // sea level
export const VOLCANO = { x: 0, z: -110, peak: 0 }; // the summit height is filled in once the terrain is built

// Places on the island. The terrain is flattened around each so buildings sit level.
// y is the ground height wanted there (the raft beach sits just above the tide line).
export const POIS = {
  camp: { x: 42, z: 72, r: 18, y: null, name: 'Survivors\' Camp', icon: '⛺' }, // right at the foot of the mountain; y is read off the terrain
  village: { x: 30, z: 236, r: 34, y: 5.0, name: 'Fishing Village', icon: '🛖' },
  wreck: { x: 158, z: -62, r: 26, y: 26, name: 'Plane Wreck', icon: '✈' },
  tower: { x: 226, z: 34, r: 26, y: 46, name: 'Ranger Station', icon: '📡' },
  helipad: { x: 252, z: 64, r: 16, y: 44, name: 'Helipad', icon: 'H' },
  bunker: { x: -176, z: 150, r: 22, y: 9, name: 'Old Bunker', icon: '🚪' },
  boatyard: { x: 214, z: 150, r: 20, y: 2.2, name: 'Raft Beach', icon: '⛵' },
  spring: { x: -58, z: 58, r: 12, y: 24, name: 'Jungle Spring', icon: '💧' },
  pool: { x: 96, z: 8, r: 12, y: 30, name: 'Rock Pool', icon: '💧' },
  cave: { x: -120, z: -10, r: 10, y: 44, name: 'Vine Hollow', icon: '🌿' },
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

let H = null; // Float32Array (N+1)*(N+1)
const idx = (i, j) => j * (N + 1) + i;

// bilinear height at any world x,z (sea floor far out)
export function heightAt(x, z) {
  const fx = (x + W / 2) / CELL, fz = (z + W / 2) / CELL;
  if (fx < 0 || fz < 0 || fx >= N || fz >= N) return -40;
  const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j;
  const a = H[idx(i, j)], b = H[idx(i + 1, j)], c = H[idx(i, j + 1)], d = H[idx(i + 1, j + 1)];
  return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * tz;
}
export function normalAt(x, z, out = new THREE.Vector3()) {
  const e = 1.2;
  const dx = heightAt(x + e, z) - heightAt(x - e, z), dz = heightAt(x, z + e) - heightAt(x, z - e);
  return out.set(-dx, 2 * e, -dz).normalize();
}
export function slopeAt(x, z) { return 1 - normalAt(x, z).y; }
export function distToVolcano(x, z) { return Math.hypot(x - VOLCANO.x, z - VOLCANO.z); }

// ---------------- the heightfield ----------------
function generateHeights() {
  const Nz = makeNoise(7), Nc = makeNoise(9);
  H = new Float32Array((N + 1) * (N + 1));
  const peaks = [
    { x: -236, z: -70, h: 92, r: 120, sx: 1.0, sz: 1.6 },   // the western cliffs from the painting
    { x: 212, z: -156, h: 64, r: 95, sx: 1.3, sz: 1.0 },    // a north-eastern headland
    { x: -60, z: 190, h: 38, r: 80, sx: 1.4, sz: 1.0 },     // low hills behind the village
  ];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = -W / 2 + i * CELL, z = -W / 2 + j * CELL;
    // coastline: a wobbly radius around the centre, longer east-west, with bays
    const a = Math.atan2(z * 1.15, x * 0.92);
    const R = 300 * (0.74 + 0.36 * Nc.fbm(Math.cos(a) * 1.4 + 7, Math.sin(a) * 1.4 + 7, 3));
    const d = Math.hypot(x * 0.92, z * 1.15);
    const mask = smooth(R + 70, R - 55, d);
    const hills = Nz.fbm(x * 0.0042 + 3, z * 0.0042 + 3, 5);
    const ridges = Nz.ridge(x * 0.0075 + 9, z * 0.0075 + 9, 3);
    let h = mask * (5 + hills * 48 + ridges * 22 * mask) - (1 - mask) * 46;
    // the volcano: a broad cone with ridged flanks and a crater
    const dv = Math.hypot(x - VOLCANO.x, z - VOLCANO.z), av = Math.atan2(z - VOLCANO.z, x - VOLCANO.x);
    const flank = Math.max(0, 1 - dv / 250);
    let cone = 178 * Math.pow(flank, 1.55) * (0.88 + 0.12 * Nz.ridge(Math.cos(av) * 2 + 20, Math.sin(av) * 2 + 20, 3));
    cone += 10 * Math.pow(flank, 0.6) * Nz.fbm(x * 0.02, z * 0.02, 3);
    if (dv < 30) cone -= 42 * Math.pow(1 - dv / 30, 1.3);
    h += cone * (0.35 + 0.65 * mask);
    for (const p of peaks) {
      const dp = Math.hypot((x - p.x) * p.sx, (z - p.z) * p.sz), f = Math.max(0, 1 - dp / p.r);
      h += p.h * Math.pow(f, 1.4) * (0.75 + 0.5 * Nz.ridge(x * 0.012 + 1, z * 0.012 + 1, 3)) * mask;
    }
    // wider beaches: squash everything near the waterline
    h = h < 6 ? h * 0.55 : h - 2.7;
    H[idx(i, j)] = h;
  }
  // flatten around each place (a place with no height set sits at whatever the ground is there)
  for (const p of Object.values(POIS)) {
    if (p.y == null) { const ci = Math.round((p.x + W / 2) / CELL), cj = Math.round((p.z + W / 2) / CELL); p.y = H[idx(ci, cj)]; }
    const i0 = Math.max(0, ((p.x - p.r * 1.3 + W / 2) / CELL) | 0), i1 = Math.min(N, ((p.x + p.r * 1.3 + W / 2) / CELL) | 0);
    const j0 = Math.max(0, ((p.z - p.r * 1.3 + W / 2) / CELL) | 0), j1 = Math.min(N, ((p.z + p.r * 1.3 + W / 2) / CELL) | 0);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -W / 2 + i * CELL, z = -W / 2 + j * CELL, d = Math.hypot(x - p.x, z - p.z);
      const w = smooth(p.r * 1.3, p.r * 0.4, d);
      H[idx(i, j)] = H[idx(i, j)] * (1 - w) + p.y * w;
    }
  }
  let peak = -1e9; for (let k = 0; k < H.length; k++) if (H[k] > peak) peak = H[k];
  VOLCANO.peak = peak;
}

// lava flows: walk downhill from the crater rim
function lavaPaths() {
  const paths = [];
  const Nz = makeNoise(13);
  for (let k = 0; k < 12; k++) {
    const deg = k * 30 + 8 + Nz.n2(k * 3.1, 2) * 14;
    const a = deg * Math.PI / 180;
    let x = VOLCANO.x + Math.cos(a) * 30, z = VOLCANO.z + Math.sin(a) * 30;
    const pts = [];
    let dirx = Math.cos(a), dirz = Math.sin(a), flat = 0;
    for (let s = 0; s < 260; s++) {
      const y = heightAt(x, z);
      pts.push(new THREE.Vector3(x, y, z));
      if (y < 0.6) break;
      const e = 3;
      let gx = heightAt(x + e, z) - heightAt(x - e, z), gz = heightAt(x, z + e) - heightAt(x, z - e);
      const gl = Math.hypot(gx, gz);
      // on flat ground a flow spreads out and stops rather than wandering about
      if (gl < 0.25) { if (++flat > 30) break; } else flat = 0;
      if (gl > 0.05) { gx /= gl; gz /= gl; dirx = dirx * 0.45 - gx * 0.55; dirz = dirz * 0.45 - gz * 0.55; }
      // steer around the camp, village, wreck and so on, so the places you need stay reachable (just)
      for (const p of Object.values(POIS)) { const ddx = x - p.x, ddz = z - p.z, dd = Math.hypot(ddx, ddz), keep = p.r + 14; if (dd < keep + 30) { const k = (1 - Math.max(0, dd - keep) / 30) * 0.9; dirx += ddx / (dd || 1) * k; dirz += ddz / (dd || 1) * k; } }
      const wob = (Nz.n2(s * 0.15, deg) - 0.5) * 0.6;
      const c = Math.cos(wob), sn = Math.sin(wob);
      const nx = dirx * c - dirz * sn, nz = dirx * sn + dirz * c;
      const l = Math.hypot(nx, nz) || 1; dirx = nx / l; dirz = nz / l;
      x += dirx * 4; z += dirz * 4;
      if (Math.abs(x) > W / 2 - 10 || Math.abs(z) > W / 2 - 10) break;
    }
    if (pts.length > 6) paths.push(pts);
  }
  return paths;
}

// ---------------- building the scene ----------------
export function buildIsland(scene, quality) {
  const hi = quality === 'high';
  generateHeights();
  const world = { paths: lavaPaths(), trees: [], rocks: [], grid: new Map(), mats: {}, uniforms: {} };

  // ---- terrain mesh ----
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((N + 1) * (N + 1) * 3), uv = new Float32Array((N + 1) * (N + 1) * 2);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const k = idx(i, j); pos[k * 3] = -W / 2 + i * CELL; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = -W / 2 + j * CELL; uv[k * 2] = i / N; uv[k * 2 + 1] = j / N;
  }
  const ind = new Uint32Array(N * N * 6); let q = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
    ind[q++] = a; ind[q++] = c; ind[q++] = b; ind[q++] = b; ind[q++] = c; ind[q++] = d;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(ind, 1));
  geo.computeVertexNormals();
  const tex = { sand: sandTexture(), grass: grassTexture(), rock: rockTexture(), ash: ashTexture(), noise: noiseTexture() };
  const U = world.uniforms;
  U.uAsh = { value: 0 }; U.uTime = { value: 0 }; U.uWind = { value: 0.4 }; U.uCloud = { value: 0.35 }; U.uFlash = { value: 0 }; U.uNight = { value: 0 }; U.uWet = { value: 0 }; U.uRain = { value: 0 };
  U.uGlow = { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 1, 0)) }; // lava glow spots: x, z, radius, strength
  const bumpTex = tex.noise.clone(); bumpTex.repeat.set(140, 140); bumpTex.needsUpdate = true;
  const ground = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0, bumpMap: bumpTex, bumpScale: hi ? 0.9 : 0.5 });
  ground.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tSand: { value: tex.sand }, tGrass: { value: tex.grass }, tRock: { value: tex.rock }, tAsh: { value: tex.ash }, tNoise: { value: tex.noise }, uAsh: U.uAsh, uTime: U.uTime, uCloud: U.uCloud, uGlow: U.uGlow, uNight: U.uNight, uWet: U.uWet });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNormal;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNormal = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNormal; uniform sampler2D tSand, tGrass, tRock, tAsh, tNoise; uniform float uAsh, uTime, uCloud, uNight, uWet; uniform vec4 uGlow[8]; vec3 lavaGlow = vec3(0.0);')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float hgt = vWPos.y; float slope = 1.0 - vWNormal.y;
        float n = texture2D(tNoise, vWPos.xz * 0.011).r;
        float n2 = texture2D(tNoise, vWPos.xz * 0.0023 + 0.3).r;
        float sandW = 1.0 - smoothstep(2.2 + n * 2.5, 5.0 + n * 2.5, hgt);
        float rockW = smoothstep(0.26, 0.46, slope + (n - 0.5) * 0.18);
        float ashW = smoothstep(92.0 + n2 * 40.0, 128.0 + n2 * 40.0, hgt);
        vec3 sand = texture2D(tSand, vWPos.xz * 0.11).rgb;
        vec3 grass = texture2D(tGrass, vWPos.xz * 0.19).rgb * mix(vec3(0.62, 0.74, 0.52), vec3(1.0, 0.98, 0.82), n2);
        vec3 rock = texture2D(tRock, vWPos.xz * 0.14).rgb * (0.8 + 0.4 * n);
        vec3 ash = texture2D(tAsh, vWPos.xz * 0.09).rgb;
        vec3 col = mix(grass, sand, sandW); col = mix(col, rock, rockW); col = mix(col, ash, ashW);
        col = mix(col, col * vec3(1.15, 1.0, 0.62), smoothstep(45.0, 95.0, hgt) * (1.0 - rockW) * (1.0 - ashW) * n2);
        col *= mix(0.68, 1.0, smoothstep(-0.6, 1.3, hgt));
        col *= mix(1.0, 0.68 + 0.12 * sandW, uWet * smoothstep(0.2, 1.0, hgt)); // rain darkens the ground
        col = mix(col, vec3(0.4, 0.38, 0.36) * (0.7 + 0.6 * n), uAsh * smoothstep(0.4, 3.0, hgt) * 0.9);
        // sunlight dancing on the shallow seabed
        if (hgt < 0.2) { float ca = texture2D(tNoise, vWPos.xz * 0.07 + uTime * 0.025).r * texture2D(tNoise, vWPos.xz * 0.1 - uTime * 0.02 + 0.5).r; col += vec3(0.5, 0.6, 0.55) * pow(ca, 2.2) * 4.0 * smoothstep(-14.0, -1.0, hgt) * (1.0 - uAsh) * (1.0 - uNight); }
        // cloud shadows drifting over the island
        float cs = texture2D(tNoise, vWPos.xz * 0.0014 + vec2(uTime * 0.0035, uTime * 0.0012)).r;
        col *= mix(1.0, 0.62, smoothstep(0.52, 0.72, cs) * (0.5 + uCloud) * (1.0 - uAsh * 0.7));
        // the ground lit orange around the lava
        for (int gi = 0; gi < 8; gi++) { float gd = distance(vWPos.xz, uGlow[gi].xy); lavaGlow += vec3(1.0, 0.38, 0.08) * uGlow[gi].w * smoothstep(uGlow[gi].z, 0.0, gd) * (0.85 + 0.15 * sin(uTime * 3.0 + gd * 0.5)); }
        diffuseColor.rgb *= col;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, uWet * (1.0 - rockW * 0.3) * smoothstep(0.2, 1.0, hgt));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += lavaGlow * diffuseColor.rgb * 2.5 + lavaGlow * 0.25;');
  };
  const terrain = new THREE.Mesh(geo, ground);
  terrain.receiveShadow = true; terrain.castShadow = false;
  scene.add(terrain);
  world.terrain = terrain;

  // ---- height texture for the sea (depth tint and shoreline foam) ----
  const hd = new Uint8Array((N + 1) * (N + 1) * 4);
  for (let k = 0; k < H.length; k++) { const v = Math.max(0, Math.min(255, ((H[k] + 60) / 200) * 255)) | 0; hd[k * 4] = v; hd[k * 4 + 1] = v; hd[k * 4 + 2] = v; hd[k * 4 + 3] = 255; }
  const hTex = new THREE.DataTexture(hd, N + 1, N + 1, THREE.RGBAFormat); hTex.minFilter = hTex.magFilter = THREE.LinearFilter; hTex.needsUpdate = true;
  world.heightTex = hTex;

  // ---- the sea ----
  U.uSun = { value: new THREE.Vector3(0.3, 0.8, 0.5) }; U.uSunCol = { value: new THREE.Color('#fff2d0') }; U.uSky = { value: new THREE.Color('#8fc4ec') };
  const seaMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: U.uTime, tHeight: { value: hTex }, tNoise: { value: tex.noise }, uW: { value: W }, uSun: U.uSun, uSunCol: U.uSunCol, uSky: U.uSky,
      deepCol: { value: new THREE.Color('#083a6b') }, shallowCol: { value: new THREE.Color('#2fc6c0') }, uAsh: U.uAsh, uGlow: U.uGlow, uRain: U.uRain,
    }]),
    transparent: true, fog: true, depthWrite: true,
    vertexShader: `uniform float time; varying vec3 vW; varying vec3 vN;
      #include <fog_pars_vertex>
      void main(){
        vec3 p = position; vec2 q = (modelMatrix * vec4(p, 1.0)).xz;
        float h = 0.0, dx = 0.0, dz = 0.0;
        #define WAVE(amp, len, spd, DX, DZ) { vec2 d = normalize(vec2(DX, DZ)); float k = 6.2831 / len; float ph = dot(d, q) * k + time * spd; h += amp * sin(ph); float c = cos(ph) * amp * k; dx += c * d.x; dz += c * d.y; }
        WAVE(0.22, 26.0, 1.1, 1.0, 0.35) WAVE(0.14, 11.0, 1.7, -0.4, 1.0) WAVE(0.07, 5.0, 2.6, 0.7, -0.6) WAVE(0.04, 2.3, 3.4, -0.9, -0.3)
        p.z += h; // the plane is rotated flat, so its local z is up
        vN = normalize(vec3(-dx, 1.0, -dz));
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float time, uW, uAsh, uRain; uniform sampler2D tHeight, tNoise; uniform vec3 uSun, uSunCol, uSky, deepCol, shallowCol; uniform vec4 uGlow[8];
      varying vec3 vW; varying vec3 vN;
      #include <fog_pars_fragment>
      void main(){
        float th = texture2D(tHeight, vW.xz / uW + 0.5).r * 200.0 - 60.0;
        float depth = clamp(-th, 0.0, 40.0);
        float n = texture2D(tNoise, vW.xz * 0.045 + vec2(time * 0.013, -time * 0.009)).r;
        float n3 = texture2D(tNoise, vW.xz * 0.012 - time * 0.004).r;
        vec3 col = mix(shallowCol, deepCol, smoothstep(0.0, 16.0, depth + (n3 - 0.5) * 6.0));
        col = mix(col, vec3(0.35, 0.37, 0.4), uAsh * 0.6);
        // breakers along the shore and foam patches
        float band = depth + n * 1.6 - 0.9 + 0.45 * sin(time * 1.4 - depth * 1.6 + n * 5.0);
        float foam = smoothstep(2.4, 0.2, band) * (0.55 + 0.45 * n);
        foam += smoothstep(0.72, 0.9, n) * 0.35 * (1.0 - smoothstep(0.0, 14.0, depth));
        foam = clamp(foam, 0.0, 1.0);
        vec3 V = normalize(cameraPosition - vW); vec3 Nn = normalize(vN);
        // fine ripples on top of the waves, for the glints
        vec2 rp = texture2D(tNoise, vW.xz * 0.33 + vec2(time * 0.06, time * 0.04)).rg - texture2D(tNoise, vW.xz * 0.27 - vec2(time * 0.05, -time * 0.03)).rg;
        vec3 Nr = normalize(Nn + vec3(rp.x, 0.0, rp.y) * 0.45);
        float fres = pow(1.0 - max(dot(Nn, V), 0.0), 3.0);
        col = mix(col, uSky, fres * 0.75);
        vec3 Hh = normalize(V + normalize(uSun)); float sp = max(dot(Nr, Hh), 0.0), sp2 = max(dot(Nn, Hh), 0.0);
        col += uSunCol * (pow(sp, 420.0) * 4.0 + pow(sp2, 20.0) * 0.12) * (1.0 - uAsh * 0.8);
        // the lava's glow on the water
        for (int gi = 0; gi < 8; gi++) { float gd = distance(vW.xz, uGlow[gi].xy); col += vec3(1.0, 0.4, 0.1) * uGlow[gi].w * smoothstep(uGlow[gi].z * 2.2, 0.0, gd) * (0.5 + 0.3 * sin(time * 2.5 + gd * 0.4)); }
        col = mix(col, vec3(0.96, 0.98, 1.0), foam);
        // raindrops pocking the surface
        if (uRain > 0.01) { float rr = texture2D(tNoise, vW.xz * 1.3 + vec2(time * 1.7, -time * 1.3)).r; col += vec3(0.6) * smoothstep(0.8, 0.84, rr) * uRain * 0.5; col = mix(col, col * 0.8 + vec3(0.06, 0.07, 0.08), uRain * 0.5); }
        float alpha = mix(0.6, 0.94, smoothstep(0.0, 7.0, depth)); alpha = max(alpha, foam);
        gl_FragColor = vec4(col, alpha);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600, hi ? 180 : 110, hi ? 180 : 110), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = SEA; sea.renderOrder = 2;
  scene.add(sea);
  world.sea = sea;

  // ---- the sky ----
  U.uSkyTop = { value: new THREE.Color('#2a72d6') }; U.uHorizon = { value: new THREE.Color('#cfe4f5') }; U.uPlume = { value: 0 }; U.uDusk = { value: 0 };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1900, 32, 16), new THREE.ShaderMaterial({
    uniforms: { top: U.uSkyTop, horizon: U.uHorizon, sunDir: U.uSun, sunCol: U.uSunCol, time: U.uTime, cover: U.uCloud, ash: U.uAsh, dusk: U.uDusk, plume: U.uPlume, flash: U.uFlash, night: U.uNight, volc: { value: new THREE.Vector3(VOLCANO.x, 0, VOLCANO.z) } },
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, horizon, sunDir, sunCol, volc; uniform float time, cover, ash, dusk, plume, flash, night; varying vec3 vP;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 5; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vP); float h = d.y;
        vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.5)) : mix(horizon, horizon * 0.6, pow(-h, 0.5));
        vec3 sd = normalize(sunDir); float s = max(dot(d, sd), 0.0);
        c += sunCol * (pow(s, 1200.0) * 8.0 + pow(s, 10.0) * 0.4) * smoothstep(-0.12, 0.04, sd.y);
        // dusk: warm band along the horizon on the sun's side
        c = mix(c, vec3(1.0, 0.45, 0.2), dusk * pow(1.0 - abs(h), 6.0) * (0.4 + 0.6 * max(dot(normalize(d.xz), normalize(sd.xz)), 0.0)));
        if (h > 0.0) {
          vec2 cp = d.xz / (d.y + 0.15) * 1.4 + vec2(time * 0.01, time * 0.003);
          float cl = smoothstep(0.55 - cover * 0.4, 0.8 - cover * 0.28, fbm(cp)) * smoothstep(0.0, 0.15, h);
          vec3 cc = mix(vec3(1.0, 0.98, 0.96), sunCol, 0.3) * (0.8 + 0.2 * fbm(cp * 2.0 + 3.0));
          cc = mix(cc, vec3(0.35, 0.33, 0.33), ash); cc *= 1.0 - night * 0.88;
          c = mix(c, cc, cl * 0.9);
        }
        // the eruption column towering over the mountain, dark and spreading
        float pl = 0.0;
        if (plume > 0.01) {
          vec3 vd = normalize(vec3(volc.x, 0.0, volc.z)); float side = dot(normalize(d.xz), normalize(vd.xz));
          float width = 0.12 + plume * 0.8 + h * plume * 1.2;
          float col = smoothstep(1.0 - width, 1.0, side) * smoothstep(-0.02, 0.1, h) * smoothstep(0.95 + plume * 0.3, 0.3, h);
          pl = col * (0.55 + 0.45 * fbm(d.xz * 8.0 / (h + 0.3) + time * 0.05)) * min(1.0, plume * 1.5);
        }
        // ash in the air greys everything out, and the column stands dark against it
        c = mix(c, vec3(0.38, 0.36, 0.35) * (0.8 + 0.2 * h), ash * 0.9);
        c = mix(c, c * 0.18, night * ash); // an ash-choked night is close to black
        vec3 plumeCol = mix(vec3(0.45, 0.42, 0.4), vec3(0.1, 0.085, 0.08), plume) * (1.0 - night * 0.75) + vec3(0.7, 0.22, 0.0) * pow(max(0.0, 0.25 - h), 1.0) * plume * (2.5 + night * 2.0);
        c = mix(c, plumeCol, pl);
        // the first stars as the light goes
        float starK = max(night, (dusk - 0.55) / 0.45 * 0.5);
        if (h > 0.02 && starK > 0.0) { vec2 g = floor(d.xz / (d.y + 0.3) * 240.0); float st = step(0.9955, h21(g)) * (0.5 + 0.5 * h21(g + 7.0)); float tw = 0.75 + 0.25 * sin(time * 3.0 + h21(g) * 40.0); c += vec3(st * tw) * starK * smoothstep(0.02, 0.3, h) * (1.0 - ash) * (1.0 - pl); }
        // the moon, opposite the sun, with a soft halo
        { vec3 md = normalize(-sunDir); float mm = max(dot(d, md), 0.0); c += vec3(0.85, 0.9, 1.0) * (smoothstep(0.99965, 0.9998, mm) * 1.6 + pow(mm, 90.0) * 0.12) * night * (1.0 - ash * 0.9) * (1.0 - pl); }
        // lightning in the column lights the whole cloud
        c += vec3(0.8, 0.85, 1.0) * flash * (0.25 + 0.75 * pl);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -1;
  scene.add(sky);
  world.sky = sky;

  // ---- vegetation ----
  const r = rng(101);
  const Nv = makeNoise(5);
  const bark = new THREE.MeshStandardMaterial({ map: barkTexture(), roughness: 0.9 });
  const frondM = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, color: '#dfe9c9' });
  const bushM = new THREE.MeshStandardMaterial({ map: bushTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const flowerM = new THREE.MeshStandardMaterial({ map: flowerTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const rockM = new THREE.MeshStandardMaterial({ map: tex.rock, roughness: 0.9, color: '#9a9690' });
  // wind sway for leaves, driven by uTime and uWind
  // chain shader hooks so a material can both sway and grey over with ash
  const hook = (mat, fn) => { const prev = mat.onBeforeCompile; mat.onBeforeCompile = (sh) => { if (prev) prev(sh); fn(sh); }; };
  // wind: the whole plant bends more the higher up it is (exp shapes the curve), leaves flutter on top of that
  const sway = (mat, height, exp = 1, flutter = 1) => hook(mat, (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float seed = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
        #else
        float seed = 0.0;
        #endif
        float k = pow(smoothstep(0.0, 1.0, position.y / ${height.toFixed(1)}), ${exp.toFixed(1)}) * uWind;
        float gust = sin(uTime * 1.6 + seed) + 0.5 * sin(uTime * 0.37 + seed * 0.3);
        transformed.x += gust * 0.35 * k + sin(uTime * 4.1 + seed * 2.0) * 0.08 * k * ${flutter.toFixed(1)};
        transformed.z += cos(uTime * 1.3 + seed * 1.7) * 0.3 * k;`);
  });
  // ash settles on everything: colours drain toward grey as it thickens
  const ashify = (mat) => hook(mat, (sh) => {
    sh.uniforms.uAsh = U.uAsh;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uAsh;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * vec3(0.78, 0.75, 0.72) + 0.12, uAsh * 0.8);');
  });
  sway(bark, 9, 1.6, 0); sway(frondM, 9, 1.6, 1); sway(bushM, 1.5, 1, 1); sway(flowerM, 1.0, 1, 1);
  for (const m of [bark, frondM, bushM, flowerM, rockM]) ashify(m);
  world.ashify = ashify;
  world.mats = { bark, frondM, bushM, flowerM, rockM };

  // palm variants: a leaning trunk and a crown of drooping fronds
  const variants = [];
  for (let v = 0; v < 3; v++) {
    const Hh = 7.5 + v * 2.2, lx = (r() - 0.5) * 3.5, lz = (r() - 0.5) * 3.5;
    const trunk = new THREE.CylinderGeometry(0.17, 0.32, Hh, 9, 12);
    const p = trunk.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + Hh / 2) / Hh; p.setX(i, p.getX(i) + lx * t * t); p.setZ(i, p.getZ(i) + lz * t * t); p.setY(i, p.getY(i) + Hh / 2); }
    // rings of old frond bases up the trunk
    trunk.computeVertexNormals();
    const fronds = [];
    const nF = 10;
    for (let f = 0; f < nF; f++) {
      const g = new THREE.PlaneGeometry(1.15, 3.9, 1, 7);
      const q = g.attributes.position;
      for (let i = 0; i < q.count; i++) {
        const s = (q.getY(i) + 1.95) / 3.9; // 0 at base, 1 at tip
        q.setZ(i, -s * s * 2.1); // droop
        q.setY(i, s * 3.9);
      }
      g.rotateX(-Math.PI / 2 + 0.55 - (f % 2) * 0.35); // tilt outward and up
      g.rotateY(f / nF * Math.PI * 2 + (r() - 0.5) * 0.3);
      g.translate(lx, Hh - 0.1, lz);
      fronds.push(g);
    }
    const crown = mergeGeos(fronds);
    variants.push({ trunk, crown, h: Hh, lx, lz });
  }
  const counts = { palm: hi ? 1100 : 650, bush: hi ? 2600 : 1300, flower: hi ? 600 : 300, rock: hi ? 420 : 240, tuft: hi ? 6000 : 2500 };
  const tuftM = new THREE.MeshStandardMaterial({ map: tuftTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }); sway(tuftM, 0.8, 1, 1); ashify(tuftM);
  const palmLists = variants.map(() => []);
  const bushes = [], flowers = [], rocks = [], tufts = [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  const nearPoi = (x, z, pad) => Object.values(POIS).some((p) => Math.hypot(x - p.x, z - p.z) < p.r + pad);
  let tries = 0;
  while (palmLists.reduce((a, l) => a + l.length, 0) < counts.palm && tries++ < 60000) {
    const x = (r() - 0.5) * W * 0.85, z = (r() - 0.5) * W * 0.85, h = heightAt(x, z);
    if (h < 1.6 || h > 52 || slopeAt(x, z) > 0.42 || nearPoi(x, z, 4)) continue;
    const dens = Nv.fbm(x * 0.01, z * 0.01, 3);
    const beach = h < 7 ? 1 : 0;
    if (r() > dens * 0.8 + beach * 0.5) continue;
    if (distToVolcano(x, z) < 95) continue;
    const v = (r() * variants.length) | 0, sc = 0.8 + r() * 0.45;
    palmLists[v].push({ x, z, y: h, yaw: r() * Math.PI * 2, s: sc });
    world.trees.push({ x: x, z: z, r: 0.42 * sc, v, i: palmLists[v].length - 1, s: sc, alive: true, h: variants[v].h * sc });
  }
  tries = 0;
  while (bushes.length < counts.bush && tries++ < 80000) {
    const x = (r() - 0.5) * W * 0.85, z = (r() - 0.5) * W * 0.85, h = heightAt(x, z);
    if (h < 2.2 || h > 75 || slopeAt(x, z) > 0.5 || nearPoi(x, z, 1) || distToVolcano(x, z) < 110) continue;
    if (r() > Nv.fbm(x * 0.014 + 4, z * 0.014 + 4, 3) * 1.1) continue;
    bushes.push({ x, z, y: h - 0.1, yaw: r() * Math.PI * 2, s: 0.7 + r() * 0.8 });
  }
  tries = 0;
  while (flowers.length < counts.flower && tries++ < 40000) {
    const x = (r() - 0.5) * W * 0.85, z = (r() - 0.5) * W * 0.85, h = heightAt(x, z);
    if (h < 1.4 || h > 14 || slopeAt(x, z) > 0.4 || nearPoi(x, z, 1)) continue;
    flowers.push({ x, z, y: h - 0.05, yaw: r() * Math.PI * 2, s: 0.6 + r() * 0.6 });
  }
  tries = 0;
  while (rocks.length < counts.rock && tries++ < 40000) {
    const x = (r() - 0.5) * W * 0.9, z = (r() - 0.5) * W * 0.9, h = heightAt(x, z);
    if (h < -2 || nearPoi(x, z, 2)) continue;
    const sl = slopeAt(x, z);
    if (!(sl > 0.3 || h > 60 || h < 1.5 || r() < 0.12)) continue;
    const s = 0.6 + r() * 2.4;
    rocks.push({ x, z, y: h - s * 0.3, yaw: r() * Math.PI * 2, s, sy: 0.5 + r() * 0.6 });
    if (s > 1.1) world.rocks.push({ x, z, r: s * 0.8 });
  }
  tries = 0;
  while (tufts.length < counts.tuft && tries++ < 90000) {
    const x = (r() - 0.5) * W * 0.85, z = (r() - 0.5) * W * 0.85, h = heightAt(x, z);
    if (h < 2.6 || h > 70 || slopeAt(x, z) > 0.45 || distToVolcano(x, z) < 100) continue;
    tufts.push({ x, z, y: h - 0.03, yaw: r() * Math.PI * 2, s: 0.5 + r() * 0.7 });
  }
  const place = (list, mesh, extraY = 0) => {
    list.forEach((o, i) => {
      E.set(0, o.yaw, 0); Q.setFromEuler(E); S.set(o.s, o.sy ? o.s * o.sy : o.s, o.s); P.set(o.x, o.y + extraY, o.z);
      M.compose(P, Q, S); mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false;
    scene.add(mesh);
  };
  world.palmTrunks = []; world.palmCrowns = [];
  variants.forEach((v, k) => {
    const list = palmLists[k];
    const t = new THREE.InstancedMesh(v.trunk, bark, Math.max(1, list.length)); t.castShadow = hi; t.receiveShadow = false;
    const c = new THREE.InstancedMesh(v.crown, frondM, Math.max(1, list.length)); c.castShadow = hi;
    place(list, t); place(list, c);
    world.palmTrunks.push(t); world.palmCrowns.push(c);
  });
  const bushG = mergeGeos([0, 1, 2].map((k) => { const g = new THREE.PlaneGeometry(2.4, 2.0); g.translate(0, 1.0, 0); g.rotateY(k * Math.PI / 3); return g; }));
  const bushMesh = new THREE.InstancedMesh(bushG, bushM, Math.max(1, bushes.length)); place(bushes, bushMesh);
  const flowerG = mergeGeos([0, 1].map((k) => { const g = new THREE.PlaneGeometry(1.3, 1.1); g.translate(0, 0.55, 0); g.rotateY(k * Math.PI / 2); return g; }));
  const flowerMesh = new THREE.InstancedMesh(flowerG, flowerM, Math.max(1, flowers.length)); place(flowers, flowerMesh);
  const tuftG = mergeGeos([0, 1].map((k) => { const g = new THREE.PlaneGeometry(0.9, 0.6); g.translate(0, 0.3, 0); g.rotateY(k * Math.PI / 2 + 0.4); return g; }));
  const tuftMesh = new THREE.InstancedMesh(tuftG, tuftM, Math.max(1, tufts.length)); place(tufts, tuftMesh);
  const rockG = new THREE.IcosahedronGeometry(1, 2);
  { const p = rockG.attributes.position, rr = rng(55); for (let i = 0; i < p.count; i++) { const k = 0.8 + rr() * 0.4; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } rockG.computeVertexNormals(); }
  const rockMesh = new THREE.InstancedMesh(rockG, rockM, Math.max(1, rocks.length)); rockMesh.castShadow = hi; rockMesh.receiveShadow = true; place(rocks, rockMesh);
  world.rockMesh = rockMesh;

  // obstacle grid for collisions (trees and big rocks)
  const key = (x, z) => ((x / 16) | 0) + ':' + ((z / 16) | 0);
  const addObs = (o) => { const k = key(o.x, o.z); if (!world.grid.has(k)) world.grid.set(k, []); world.grid.get(k).push(o); };
  world.trees.forEach(addObs); world.rocks.forEach(addObs);
  world.obstaclesNear = (x, z) => {
    const out = [];
    const cx = (x / 16) | 0, cz = (z / 16) | 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = world.grid.get((cx + i) + ':' + (cz + j)); if (l) for (const o of l) out.push(o); }
    return out;
  };
  // fell a palm: shrink its instance away and drop its collision
  world.fellTree = (t) => {
    t.alive = false; t.r = 0;
    const mesh = world.palmTrunks[t.v], crown = world.palmCrowns[t.v];
    M.makeScale(0.0001, 0.0001, 0.0001); mesh.setMatrixAt(t.i, M); crown.setMatrixAt(t.i, M);
    mesh.instanceMatrix.needsUpdate = true; crown.instanceMatrix.needsUpdate = true;
  };
  world.variants = variants;
  world.H = H;

  // a painted map of the island for the map screen
  world.mapCanvas = paintMap();
  return world;
}

function mergeGeos(list) {
  // simple non-indexed merge (position, normal, uv)
  const parts = list.map((g) => g.index ? g.toNonIndexed() : g);
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

function paintMap() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), img = x.createImageData(256, 256), d = img.data;
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
    const h = H[idx(i, j)], sl = 1 - normalAt(-W / 2 + i * CELL, -W / 2 + j * CELL).y;
    let r, g, b;
    if (h < -6) { r = 10; g = 50; b = 110; } else if (h < 0.3) { r = 40; g = 150; b = 170; } else if (h < 4) { r = 230; g = 212; b = 170; } else if (h > 110) { r = 70; g = 62; b = 60; } else if (sl > 0.35) { r = 110; g = 100; b = 90; } else { const t = Math.min(1, h / 90); r = 50 + t * 90; g = 125 + t * 40; b = 45; }
    const shade = 0.85 + 0.15 * (normalAt(-W / 2 + i * CELL, -W / 2 + j * CELL).x + 1);
    const k = (j * 256 + i) * 4; d[k] = r * shade; d[k + 1] = g * shade; d[k + 2] = b * shade; d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}
