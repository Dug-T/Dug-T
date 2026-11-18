// Particle effects: fireballs, smoke, sparks, debris, shockwaves, light flashes, scorch marks.
import * as THREE from 'three';
import { G, rr, clamp } from './state.js';
import { softSprite, smokeSprite, ringSprite, scorchTexture } from './textures.js';
import { fogUniforms, M } from './materials.js';
import { heightAt, groundY, normalAt, isVisibleAt } from './terrain.js';
import { WATER_LEVEL } from './config.js';

const VERT = `
attribute float size; attribute vec4 pcolor; attribute float rot;
varying vec4 vColor; varying float vRot; varying vec3 vW;
uniform float uScale;
void main(){
  vColor = pcolor; vRot = rot; vW = position;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_PointSize = size * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform sampler2D map; uniform sampler2D uFogTex; uniform float uWorld; uniform float uFogOn; uniform float uAdd;
varying vec4 vColor; varying float vRot; varying vec3 vW;
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  p = vec2(c*p.x - s*p.y, s*p.x + c*p.y) + 0.5;
  vec4 t = texture2D(map, p);
  float fv = 1.0;
  if (uFogOn > 0.5) fv = texture2D(uFogTex, vW.xz / uWorld + 0.5).r;
  fv = smoothstep(0.35, 1.0, fv);
  vec4 col = vColor * t;
  if (uAdd > 0.5) { col.rgb *= col.a * fv; }
  else { col.a *= fv; }
  if (col.a < 0.003 && uAdd < 0.5) discard;
  gl_FragColor = col;
}`;

class PSys {
  constructor(scene, max, map, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max); this.rot = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 4); this.c1 = new Float32Array(max * 4);
    this.drag = new Float32Array(max); this.grav = new Float32Array(max); this.spin = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('pcolor', this.aCol); g.setAttribute('size', this.aSize); g.setAttribute('rot', this.aRot);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, uScale: { value: 600 }, uFogTex: fogUniforms.uFogTex, uWorld: fogUniforms.uWorld, uFogOn: fogUniforms.uFogOn, uAdd: { value: additive ? 1 : 0 } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
    scene.add(this.points);
  }
  // o: x,y,z,vx,vy,vz,life,s0,s1,c0:[r,g,b,a],c1,drag,grav,spin
  spawn(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, drag = 0, grav = 0, spin = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = 0; this.maxLife[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    for (let k = 0; k < 4; k++) { this.c0[i * 4 + k] = c0[k]; this.c1[i * 4 + k] = c1[k]; }
    this.drag[i] = drag; this.grav[i] = grav; this.spin[i] = spin; this.rot[i] = Math.random() * 6.28;
    this.size[i] = s0;
    for (let k = 0; k < 4; k++) this.col[i * 4 + k] = c0[k];
  }
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    const cp = (a, n) => { for (let k = 0; k < n; k++) a[i * n + k] = a[j * n + k]; };
    cp(this.pos, 3); cp(this.vel, 3); cp(this.col, 4); cp(this.c0, 4); cp(this.c1, 4);
    for (const a of [this.size, this.rot, this.life, this.maxLife, this.s0, this.s1, this.drag, this.grav, this.spin]) a[i] = a[j];
  }
  update(dt) {
    for (let i = this.n - 1; i >= 0; i--) {
      this.life[i] += dt;
      const t = this.life[i] / this.maxLife[i];
      if (t >= 1) { this.kill(i); continue; }
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.grav[i] > 0) {
        const gy = groundY(this.pos[i * 3], this.pos[i * 3 + 2]);
        if (this.pos[i * 3 + 1] < gy) { this.pos[i * 3 + 1] = gy; this.vel[i * 3 + 1] *= -0.35; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; }
      }
      this.rot[i] += this.spin[i] * dt;
      // size: quick ease-out growth
      const ts = 1 - (1 - t) * (1 - t);
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * ts;
      for (let k = 0; k < 4; k++) this.col[i * 4 + k] = this.c0[i * 4 + k] + (this.c1[i * 4 + k] - this.c0[i * 4 + k]) * t;
    }
    this.points.geometry.setDrawRange(0, this.n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aRot.needsUpdate = true;
  }
}

let add, smoke, scene;
const lights = [];
const rings = [];
const scorches = [];
const debris = [];
const emitters = [];
const beams = [];
let debrisMesh, debrisMesh2;
const DEBRIS_MAX = 400;

export function initFX(sc) {
  scene = sc;
  add = new PSys(scene, 9000, softSprite(), true);
  smoke = new PSys(scene, 7000, smokeSprite(), false);
  for (let i = 0; i < 6; i++) {
    const l = new THREE.PointLight(0xffaa55, 0, 30, 2);
    scene.add(l); lights.push({ l, t: 0, dur: 1, peak: 0 });
  }
  const ringMat = new THREE.MeshBasicMaterial({ map: ringSprite(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffd0a0 });
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ringMat.clone());
    m.visible = false; m.renderOrder = 4; scene.add(m); rings.push({ m, t: 0, dur: 1, r: 1 });
  }
  const sMat = new THREE.MeshBasicMaterial({ map: scorchTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), sMat.clone());
    m.visible = false; m.renderOrder = 1; scene.add(m); scorches.push({ m, t: 999 });
  }
  // debris chunks
  const dg = new THREE.DodecahedronGeometry(0.3, 0);
  const dg2 = new THREE.BoxGeometry(0.5, 0.12, 0.35);
  debrisMesh = new THREE.InstancedMesh(dg, M().burnt, DEBRIS_MAX);
  debrisMesh2 = new THREE.InstancedMesh(dg2, M().darkMetal, DEBRIS_MAX);
  for (const dm of [debrisMesh, debrisMesh2]) { dm.castShadow = true; dm.count = 0; dm.frustumCulled = false; scene.add(dm); }
  // beam pool
  const bMat = new THREE.MeshBasicMaterial({ color: 0xe0a0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 8; i++) {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 6, 1, true).rotateX(Math.PI / 2), bMat.clone());
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1, 8, 1, true).rotateX(Math.PI / 2), bMat.clone());
    core.visible = glow.visible = false; scene.add(core, glow); beams.push({ core, glow, t: 1, dur: 0.4 });
  }
}

const C = {
  white: [2.2, 1.9, 1.5, 0.9], fireHot: [1.9, 1.05, 0.35, 0.85], fire: [1.35, 0.5, 0.1, 0.75], fireEnd: [0.35, 0.06, 0.01, 0],
  spark: [3.0, 2.0, 0.8, 1], sparkEnd: [1.0, 0.25, 0.04, 0],
  smokeDark: [0.08, 0.075, 0.07, 0.85], smokeGrey: [0.28, 0.27, 0.26, 0.6], smokeEnd: [0.35, 0.34, 0.33, 0],
  dust: [0.55, 0.47, 0.36, 0.55], dustEnd: [0.6, 0.53, 0.42, 0],
  plasma: [2.5, 1.2, 4, 1], plasmaEnd: [0.5, 0.1, 1, 0],
  muzzle: [2.6, 1.9, 0.8, 1], muzzleEnd: [1.0, 0.3, 0.05, 0],
  water: [0.8, 0.9, 1.0, 0.8], waterEnd: [0.8, 0.9, 1.0, 0],
};

function flash(x, y, z, intensity, dur, color = 0xffaa55, dist = 30) {
  let best = lights[0];
  for (const L of lights) if (L.l.intensity < best.l.intensity) best = L;
  best.l.position.set(x, y + 1.5, z); best.l.color.setHex(color); best.l.distance = dist;
  best.t = 0; best.dur = dur; best.peak = intensity; best.l.intensity = intensity;
}
function ring(x, y, z, r, dur, color = 0xffd0a0) {
  const R = rings.find(o => !o.m.visible) || rings[0];
  R.m.visible = true; R.m.position.set(x, y + 0.3, z); R.t = 0; R.dur = dur; R.r = r; R.m.material.color.setHex(color);
}
export function scorch(x, z, r) {
  let S = scorches[0];
  for (const s of scorches) if (s.t > S.t) S = s;
  S.m.visible = true; S.t = 0;
  const n = normalAt(x, z);
  S.m.position.set(x, heightAt(x, z) + 0.05, z);
  S.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  S.m.rotateY(Math.random() * 6.28);
  S.m.scale.set(r, 1, r);
  S.m.material.opacity = 0.9;
}

export function shake(x, z, amount) {
  const d = Math.hypot(G.camera.x - x, G.camera.z - z);
  G.camera.shake = Math.min(1.6, G.camera.shake + amount * clamp(1 - d / 90, 0, 1));
}

// ---------------- public effects ----------------

export function explosion(x, y, z, size = 1, opts = {}) {
  if (!isVisibleAt(x, z) && !opts.force) return;
  const s = size;
  const water = groundY(x, z) <= WATER_LEVEL + 0.05 && y < WATER_LEVEL + 1;
  flash(x, y, z, 160 * s, 0.25 + 0.15 * s, 0xffa050, 16 + 12 * s);
  // core flash
  for (let i = 0; i < 2 + s; i++) add.spawn(x + rr(-0.3, 0.3) * s, y + 0.4 * s, z + rr(-0.3, 0.3) * s, 0, 0, 0, 0.16 + 0.05 * s, 2.0 * s, 6 * s, C.white, [1.2, 0.5, 0.1, 0]);
  // fireball
  const nf = Math.round(11 * s + 5);
  for (let i = 0; i < nf; i++) {
    const a = Math.random() * 6.28, el = rr(0.1, 1.4), sp = rr(1.5, 5.5) * Math.sqrt(s);
    add.spawn(x, y + 0.3, z, Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp * 1.1 + 1.0, Math.sin(a) * Math.cos(el) * sp,
      rr(0.45, 0.95) * (0.8 + s * 0.25), rr(1.2, 2.2) * s, rr(2.6, 4.6) * s, i % 3 === 0 ? C.fireHot : C.fire, C.fireEnd, 2.4, -1.5, rr(-1, 1));
  }
  // rolling smoke column
  const ns = Math.round(12 * s + 5);
  for (let i = 0; i < ns; i++) {
    const a = Math.random() * 6.28, sp = rr(0.6, 2.6) * Math.sqrt(s);
    smoke.spawn(x + rr(-0.6, 0.6) * s, y + rr(0, 1) * s, z + rr(-0.6, 0.6) * s, Math.cos(a) * sp, rr(1.2, 3.5) * Math.sqrt(s), Math.sin(a) * sp,
      rr(2.2, 4.2) * (0.7 + s * 0.3), rr(1.6, 2.6) * s, rr(5, 9) * s, i % 2 ? C.smokeDark : C.smokeGrey, C.smokeEnd, 0.9, -0.25, rr(-0.6, 0.6));
  }
  // sparks / embers
  const nsp = Math.round(24 * s + 8);
  for (let i = 0; i < nsp; i++) {
    const a = Math.random() * 6.28, el = rr(0.2, 1.4), sp = rr(6, 16) * Math.sqrt(s);
    add.spawn(x, y + 0.5, z, Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp, Math.sin(a) * Math.cos(el) * sp,
      rr(0.5, 1.4), rr(0.25, 0.45), 0.05, C.spark, C.sparkEnd, 1.2, 14, 0);
  }
  // ground dust ring
  if (opts.ground !== false) {
    for (let i = 0; i < 10 + s * 8; i++) {
      const a = (i / (10 + s * 8)) * 6.28 + rr(-0.2, 0.2), sp = rr(4, 8) * Math.sqrt(s);
      (water ? add : smoke).spawn(x, groundY(x, z) + 0.3, z, Math.cos(a) * sp, rr(0.2, 0.8), Math.sin(a) * sp, rr(0.8, 1.5), 1.2 * s, 4.5 * s, water ? C.water : C.dust, water ? C.waterEnd : C.dustEnd, 2.8, 0, rr(-1, 1));
    }
    ring(x, groundY(x, z), z, 7 * s, 0.45 + 0.1 * s);
    if (!water && s >= 0.6) scorch(x, z, 2.2 * s + rr(0, 1));
  }
  if (water) {
    for (let i = 0; i < 25 * s; i++) add.spawn(x + rr(-0.5, 0.5), WATER_LEVEL, z + rr(-0.5, 0.5), rr(-2, 2), rr(6, 13) * Math.sqrt(s), rr(-2, 2), rr(0.8, 1.4), 0.6 * s, 1.4 * s, C.water, C.waterEnd, 0.4, 14, 0);
  }
  if (opts.debris !== false && s >= 0.7) {
    const nd = Math.round(5 * s + 2);
    for (let i = 0; i < nd; i++) spawnDebris(x, y + 0.6, z, s, opts.burning !== false && Math.random() < 0.5);
  }
  shake(x, z, 0.25 * s);
  if (opts.sound !== false && G.sfx) G.sfx.explosion(x, z, s);
}

export function smallHit(x, y, z, kind = 'bullet') {
  if (!isVisibleAt(x, z)) return;
  if (kind === 'bullet') {
    for (let i = 0; i < 4; i++) add.spawn(x, y, z, rr(-3, 3), rr(1, 5), rr(-3, 3), rr(0.15, 0.35), 0.25, 0.05, C.spark, C.sparkEnd, 2, 10);
    smoke.spawn(x, y, z, rr(-0.3, 0.3), 0.6, rr(-0.3, 0.3), 0.7, 0.4, 1.4, C.dust, C.dustEnd, 1.5);
  } else if (kind === 'plasma') {
    flash(x, y, z, 30, 0.35, 0xc070ff, 20);
    for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28, sp = rr(3, 10); add.spawn(x, y + 0.5, z, Math.cos(a) * sp, rr(2, 8), Math.sin(a) * sp, rr(0.3, 0.8), rr(0.4, 0.9), 0.1, C.plasma, C.plasmaEnd, 2, 8); }
    for (let i = 0; i < 6; i++) add.spawn(x, y + 0.5, z, rr(-1, 1), rr(0, 2), rr(-1, 1), 0.5, 2, 6, C.plasma, C.plasmaEnd, 3);
    ring(x, y, z, 6, 0.4, 0xc080ff);
    scorch(x, z, 2.5);
  } else if (kind === 'sniper') {
    for (let i = 0; i < 8; i++) add.spawn(x, y, z, rr(-2, 2), rr(1, 4), rr(-2, 2), 0.3, 0.3, 0.05, C.spark, C.sparkEnd, 2, 10);
  }
}

export function muzzle(x, y, z, dx, dz, size = 1, color) {
  if (!isVisibleAt(x, z)) return;
  const c = color || C.muzzle;
  add.spawn(x, y, z, dx * 2, 0, dz * 2, 0.07, 1.6 * size, 2.6 * size, c, C.muzzleEnd, 0, 0);
  for (let i = 0; i < 3; i++) add.spawn(x, y, z, dx * rr(6, 14) + rr(-1, 1), rr(-0.5, 1), dz * rr(6, 14) + rr(-1, 1), 0.08, 0.8 * size, 0.2, c, C.muzzleEnd, 3, 0);
  if (size >= 1) {
    for (let i = 0; i < 3 * size; i++) smoke.spawn(x + dx * 0.5, y, z + dz * 0.5, dx * rr(1, 3) + rr(-0.4, 0.4), rr(0.2, 0.9), dz * rr(1, 3) + rr(-0.4, 0.4), rr(0.8, 1.6), 0.5 * size, 2.2 * size, C.smokeGrey, C.smokeEnd, 1.8, -0.2, rr(-1, 1));
    if (size >= 1.4) flash(x, y, z, 12 * size, 0.08, 0xffc070, 12);
  }
}

export function trail(x, y, z, big = false) {
  smoke.spawn(x, y, z, rr(-0.2, 0.2), rr(0.1, 0.4), rr(-0.2, 0.2), big ? 1.8 : 1.1, big ? 0.6 : 0.35, big ? 2.4 : 1.4, [0.75, 0.73, 0.7, 0.55], C.smokeEnd, 1.2, -0.1, rr(-1, 1));
  add.spawn(x, y, z, 0, 0, 0, 0.08, big ? 0.9 : 0.6, 0.2, C.fireHot, C.fireEnd);
}
export function shellTrail(x, y, z) {
  add.spawn(x, y, z, 0, 0, 0, 0.12, 0.45, 0.1, [3, 2, 1, 0.8], C.fireEnd);
}
export function flame(x, y, z, dx, dy, dz) {
  for (let i = 0; i < 3; i++) {
    const sp = rr(9, 13);
    add.spawn(x, y, z, dx * sp + rr(-0.8, 0.8), dy * sp + rr(-0.3, 0.8), dz * sp + rr(-0.8, 0.8), rr(0.45, 0.65), 0.3, rr(2.2, 3.2), C.fireHot, C.fireEnd, 1.6, -1.5, rr(-3, 3));
  }
  if (Math.random() < 0.4) smoke.spawn(x + dx * 5, y + 0.8, z + dz * 5, dx * 2, 1.5, dz * 2, 1.4, 1, 3.5, C.smokeDark, C.smokeEnd, 0.8, -0.3, rr(-1, 1));
}
export function dust(x, z, amount = 1) {
  if (!isVisibleAt(x, z)) return;
  const y = groundY(x, z);
  smoke.spawn(x + rr(-0.5, 0.5), y + 0.2, z + rr(-0.5, 0.5), rr(-0.4, 0.4), rr(0.3, 0.8), rr(-0.4, 0.4), rr(0.9, 1.6), 0.6 * amount, 2.2 * amount, C.dust, C.dustEnd, 1.2, -0.05, rr(-1, 1));
}
export function fireSmoke(x, y, z, intensity = 1) {
  if (!isVisibleAt(x, z)) return;
  if (Math.random() < 0.7) add.spawn(x + rr(-0.3, 0.3), y, z + rr(-0.3, 0.3), rr(-0.3, 0.3), rr(1.2, 2.4), rr(-0.3, 0.3), rr(0.4, 0.7), 0.8 * intensity, 1.8 * intensity, C.fire, C.fireEnd, 1, -1.5, rr(-2, 2));
  smoke.spawn(x + rr(-0.3, 0.3), y + 0.6, z + rr(-0.3, 0.3), rr(-0.3, 0.3) + 0.3, rr(1.2, 2.2), rr(-0.3, 0.3), rr(2.5, 4), 1.0 * intensity, 4.5 * intensity, C.smokeDark, C.smokeEnd, 0.5, -0.2, rr(-0.6, 0.6));
}
export function blackSmoke(x, y, z, intensity = 1) {
  if (!isVisibleAt(x, z)) return;
  smoke.spawn(x + rr(-0.3, 0.3), y, z + rr(-0.3, 0.3), 0.3 + rr(-0.2, 0.2), rr(0.8, 1.6), rr(-0.2, 0.2), rr(2, 3.2), 0.7 * intensity, 3.2 * intensity, C.smokeGrey, C.smokeEnd, 0.4, -0.15, rr(-0.6, 0.6));
}
export function steam(x, y, z) {
  smoke.spawn(x, y, z, rr(-0.2, 0.2), rr(1.5, 2.5), rr(-0.2, 0.2), 2.2, 0.6, 3, [0.9, 0.9, 0.92, 0.35], [0.9, 0.9, 0.92, 0], 0.6, -0.1, rr(-1, 1));
}
export function sparkBurst(x, y, z, n = 10, color) {
  for (let i = 0; i < n; i++) add.spawn(x, y, z, rr(-4, 4), rr(2, 7), rr(-4, 4), rr(0.3, 0.7), 0.3, 0.05, color || C.spark, C.sparkEnd, 1, 12);
}
export function buildSparks(x, y, z) {
  if (!isVisibleAt(x, z)) return;
  add.spawn(x, y, z, rr(-3, 3), rr(2, 6), rr(-3, 3), rr(0.3, 0.6), 0.35, 0.05, [2.5, 3, 4, 1], [0.3, 0.6, 1.5, 0], 1, 12);
}
export function teleportSwirl(x, y, z) {
  for (let i = 0; i < 30; i++) { const a = i / 30 * 6.28; add.spawn(x + Math.cos(a) * 1.5, y, z + Math.sin(a) * 1.5, -Math.cos(a), rr(2, 5), -Math.sin(a), 0.7, 0.6, 0.1, [1, 2.5, 4, 1], [0.2, 0.5, 1.5, 0], 1, 0); }
}

export function beam(x0, y0, z0, x1, y1, z1) {
  const B = beams.find(b => b.t >= b.dur) || beams[0];
  const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  for (const m of [B.core, B.glow]) {
    m.visible = true; m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.lookAt(x1, y1, z1); m.scale.set(1, 1, len);
  }
  B.t = 0; B.dur = 0.45;
  for (let i = 0; i < 24; i++) { const t = Math.random(); add.spawn(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, rr(-1, 1), rr(-1, 1), rr(-1, 1), rr(0.2, 0.5), rr(0.5, 1.0), 0.1, C.plasma, C.plasmaEnd, 2); }
  flash(x0, y0, z0, 20, 0.25, 0xc070ff, 16);
}

// Persistent emitters attached to burning things. fn() returns {x,y,z,intensity} or null to stop.
export function addEmitter(fn, rate = 12, kind = 'fire') { const e = { fn, rate, acc: 0, kind }; emitters.push(e); return e; }

function spawnDebris(x, y, z, s, burning) {
  if (debris.length >= DEBRIS_MAX * 2) return;
  const a = Math.random() * 6.28, sp = rr(4, 11) * Math.sqrt(s);
  debris.push({
    x, y, z, vx: Math.cos(a) * sp * 0.6, vy: rr(6, 14) * Math.sqrt(s), vz: Math.sin(a) * sp * 0.6,
    rx: rr(0, 6), ry: rr(0, 6), rz: 0, sx: rr(-8, 8), sy: rr(-8, 8), sc: rr(0.6, 1.4) * Math.min(1.8, 0.6 + s * 0.4),
    life: 0, max: rr(3, 6), burning, rest: false, type: Math.random() < 0.5 ? 0 : 1,
  });
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

export function updateFX(dt) {
  add.update(dt); smoke.update(dt);
  for (const L of lights) {
    if (L.l.intensity <= 0) continue;
    L.t += dt; const k = 1 - L.t / L.dur;
    L.l.intensity = k <= 0 ? 0 : L.peak * k * k;
  }
  for (const R of rings) {
    if (!R.m.visible) continue;
    R.t += dt; const k = R.t / R.dur;
    if (k >= 1) { R.m.visible = false; continue; }
    const sc = R.r * (0.2 + 0.8 * Math.sqrt(k));
    R.m.scale.set(sc, 1, sc); R.m.material.opacity = (1 - k) * 0.9;
  }
  for (const S of scorches) {
    if (!S.m.visible) continue;
    S.t += dt;
    if (S.t > 40) { S.m.material.opacity = Math.max(0, 0.9 - (S.t - 40) / 10); if (S.t > 50) S.m.visible = false; }
  }
  for (const B of beams) {
    if (B.t >= B.dur) continue;
    B.t += dt; const k = 1 - B.t / B.dur;
    B.core.material.opacity = k; B.glow.material.opacity = k * 0.5;
    B.glow.scale.x = B.glow.scale.y = 1 + (1 - k) * 1.5;
    if (B.t >= B.dur) B.core.visible = B.glow.visible = false;
  }
  // debris physics
  let n0 = 0, n1 = 0;
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.life += dt;
    if (d.life > d.max) { debris.splice(i, 1); continue; }
    if (!d.rest) {
      d.vy -= 22 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      d.rx += d.sx * dt; d.ry += d.sy * dt;
      const gy = groundY(d.x, d.z);
      if (d.y < gy + 0.1) {
        d.y = gy + 0.1;
        if (Math.abs(d.vy) < 2.5) { d.rest = true; } else {
          d.vy *= -0.35; d.vx *= 0.5; d.vz *= 0.5; d.sx *= 0.5; d.sy *= 0.5;
          if (Math.random() < 0.6) smoke.spawn(d.x, gy + 0.2, d.z, 0, 0.6, 0, 0.9, 0.4, 1.6, C.dust, C.dustEnd, 1.5);
        }
      }
      if (d.burning && Math.random() < 0.7) {
        add.spawn(d.x, d.y, d.z, 0, 0.3, 0, 0.25, 0.7, 0.2, C.fire, C.fireEnd);
        smoke.spawn(d.x, d.y, d.z, 0, 0.4, 0, 0.9, 0.3, 1.2, C.smokeDark, C.smokeEnd, 1);
      }
    } else if (d.burning && Math.random() < 0.2) {
      add.spawn(d.x, d.y + 0.1, d.z, 0, 1, 0, 0.4, 0.5, 0.1, C.fire, C.fireEnd, 0, -1);
    }
    const fade = d.life > d.max - 0.8 ? (d.max - d.life) / 0.8 : 1;
    _p.set(d.x, d.y - (1 - fade) * 0.3, d.z); _e.set(d.rx, d.ry, d.rz); _q.setFromEuler(_e);
    const sc = d.sc * Math.max(0.01, fade); _s.set(sc, sc, sc);
    _m.compose(_p, _q, _s);
    if (d.type === 0 && n0 < DEBRIS_MAX) debrisMesh.setMatrixAt(n0++, _m);
    else if (n1 < DEBRIS_MAX) debrisMesh2.setMatrixAt(n1++, _m);
  }
  debrisMesh.count = n0; debrisMesh2.count = n1;
  debrisMesh.instanceMatrix.needsUpdate = true; debrisMesh2.instanceMatrix.needsUpdate = true;
  // persistent emitters
  for (let i = emitters.length - 1; i >= 0; i--) {
    const e = emitters[i];
    const p = e.fn();
    if (!p) { emitters.splice(i, 1); continue; }
    e.acc += dt * e.rate * (p.intensity ?? 1);
    while (e.acc >= 1) {
      e.acc -= 1;
      if (e.kind === 'fire') fireSmoke(p.x, p.y, p.z, p.size || 1);
      else if (e.kind === 'smoke') blackSmoke(p.x, p.y, p.z, p.size || 1);
      else if (e.kind === 'dust') dust(p.x, p.z, p.size || 1);
      else if (e.kind === 'steam') { if (isVisibleAt(p.x, p.z)) smoke.spawn(p.x, p.y, p.z, rr(-0.2, 0.2), rr(1.5, 2.5), rr(-0.2, 0.2), 2.2, 0.6, 3, [0.9, 0.9, 0.92, 0.35], [0.9, 0.9, 0.92, 0], 0.6, -0.1, rr(-1, 1)); }
    }
  }
}

export function setParticleScale(h) {
  const s = h / (2 * Math.tan((G.three.camera.fov * Math.PI / 180) / 2));
  add.mat.uniforms.uScale.value = s; smoke.mat.uniforms.uScale.value = s;
}

export function fxStats() { return { add: add.n, smoke: smoke.n, debris: debris.length }; }
