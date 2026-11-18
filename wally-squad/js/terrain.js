// Terrain: heightfield, water, forests, rocks, crystal fields and the fog of war.
import * as THREE from 'three';
import { CELL, GRID, WORLD, HALF, WATER_LEVEL, ORE_MAX } from './config.js';
import { G, fbm, noise2, mulberry32, clamp, lerp, srand } from './state.js';
import { fogify, fogUniforms, M } from './materials.js';
import { groundDetailTexture, groundNormalTexture, waterNormalTexture } from './textures.js';

const RES = 256;              // terrain vertices per side - 1
const VS = WORLD / RES;       // vertex spacing
const H = new Float32Array((RES + 1) * (RES + 1));

export const T = {
  blocked: new Uint8Array(GRID * GRID),   // terrain obstacle (water / cliff / tree / rock)
  water: new Uint8Array(GRID * GRID),
  tree: new Uint8Array(GRID * GRID),
  bld: new Int32Array(GRID * GRID),       // building id occupying cell
  gate: new Uint8Array(GRID * GRID),      // gate owner (faction index) - passable for that faction
  ore: new Float32Array(GRID * GRID),
  oreRich: new Uint8Array(GRID * GRID),
  oreDirty: false,
  explored: new Uint8Array(GRID * GRID),
  visible: new Uint8Array(GRID * GRID),   // player's current vision
  enemyVisible: new Uint8Array(GRID * GRID),
  fogData: new Uint8Array(GRID * GRID * 4),
  minimapImage: null,
};

// Filled in from the chosen map by setupMap()
export const BASES = {};
let LANES = [], ORE_FIELDS = [], LAKES = [];
let MAP = null, TH = null, SEED = [10, -4, 31, 17];
export function setupMap(map, theme, slotFactions) {
  MAP = map; TH = theme; SEED = map.seed;
  LANES = map.lanes; LAKES = map.lakes; ORE_FIELDS = map.ore.map(o => ({ rich: 0, ...o }));
  for (const k in BASES) delete BASES[k];
  slotFactions.forEach((f, i) => { BASES[f] = map.slots[i]; });
}
export const currentMap = () => MAP;
export const currentTheme = () => TH;

export const cellOf = v => clamp(Math.floor((v + HALF) / CELL), 0, GRID - 1);
export const cellCenter = i => i * CELL - HALF + CELL / 2;
export const idx = (cx, cz) => cz * GRID + cx;
export const inGrid = (cx, cz) => cx >= 0 && cz >= 0 && cx < GRID && cz < GRID;

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function laneDist(x, z) {
  let d = 1e9;
  for (const L of LANES) for (let i = 0; i < L.length - 1; i++) d = Math.min(d, distToSeg(x, z, L[i][0], L[i][1], L[i + 1][0], L[i + 1][1]));
  return d;
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function rawHeight(x, z) {
  let h = fbm(x * 0.011 + SEED[0], z * 0.011 + SEED[1], 5) * 7;
  const ridge = 1 - Math.abs(fbm(x * 0.016 + SEED[2], z * 0.016 + SEED[3], 4) * 2);
  h += Math.pow(Math.max(0, ridge - 0.38), 2) * (MAP.ridge || 48);
  // lakes
  for (const L of LAKES) {
    const d = Math.hypot(x - L.x, z - L.z) / L.r;
    if (d < 1.4) h = lerp(-5 + fbm(x * 0.05, z * 0.05) * 2, h, smooth(0.55, 1.4, d));
  }
  // flatten bases, ore fields and lanes
  let flat = 0;
  for (const k in BASES) flat = Math.max(flat, 1 - smooth(30, 44, Math.hypot(x - BASES[k].x, z - BASES[k].z)));
  for (const o of ORE_FIELDS) flat = Math.max(flat, 1 - smooth(o.r + 4, o.r + 12, Math.hypot(x - o.x, z - o.z)));
  flat = Math.max(flat, 1 - smooth(7, 14, laneDist(x, z)));
  const gentle = 0.4 + fbm(x * 0.03, z * 0.03, 3) * 1.2;
  h = lerp(h, gentle, flat);
  // mountains around the rim
  const edge = Math.min(HALF - Math.abs(x), HALF - Math.abs(z));
  h += Math.pow(1 - smooth(0, 16, edge), 2) * (18 + fbm(x * 0.05, z * 0.05) * 10);
  return h;
}

export function heightAt(x, z) {
  const fx = clamp((x + HALF) / VS, 0, RES - 0.001), fz = clamp((z + HALF) / VS, 0, RES - 0.001);
  const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const a = H[iz * (RES + 1) + ix], b = H[iz * (RES + 1) + ix + 1];
  const c = H[(iz + 1) * (RES + 1) + ix], d = H[(iz + 1) * (RES + 1) + ix + 1];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}
const _n = new THREE.Vector3();
export function normalAt(x, z, out = _n) {
  const e = 1.0;
  out.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
  return out;
}
export const groundY = (x, z) => Math.max(heightAt(x, z), WATER_LEVEL);

export function isWalkable(cx, cz) {
  if (!inGrid(cx, cz)) return false;
  const i = idx(cx, cz);
  return !T.blocked[i] && !T.bld[i];
}

export function buildTerrain(scene) {
  // ---- heights ----
  for (let j = 0; j <= RES; j++) for (let i = 0; i <= RES; i++) H[j * (RES + 1) + i] = rawHeight(i * VS - HALF, j * VS - HALF);

  // ---- cell flags ----
  for (let cz = 0; cz < GRID; cz++) for (let cx = 0; cx < GRID; cx++) {
    const x = cellCenter(cx), z = cellCenter(cz);
    let lo = 1e9, hi = -1e9;
    for (const [ox, oz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9], [0, 0]]) { const h = heightAt(x + ox, z + oz); lo = Math.min(lo, h); hi = Math.max(hi, h); }
    const i = idx(cx, cz);
    if (lo < WATER_LEVEL + 0.15) { T.blocked[i] = 1; T.water[i] = 1; }
    else if (hi > 4.2 || hi - lo > 1.6) T.blocked[i] = 1;
  }

  // ---- ore ----
  const R = mulberry32(42);
  for (const o of ORE_FIELDS) {
    for (let cz = cellOf(o.z - o.r); cz <= cellOf(o.z + o.r); cz++) for (let cx = cellOf(o.x - o.r); cx <= cellOf(o.x + o.r); cx++) {
      const d = Math.hypot(cellCenter(cx) - o.x, cellCenter(cz) - o.z) / o.r;
      const i = idx(cx, cz);
      if (d < 1 && !T.blocked[i] && R() > d * 0.6) { T.ore[i] = ORE_MAX * (0.5 + 0.5 * (1 - d)); T.oreRich[i] = o.rich; }
    }
  }

  // ---- trees (forest clusters outside lanes and bases) ----
  const treeSpots = [];
  for (let cz = 2; cz < GRID - 2; cz++) for (let cx = 2; cx < GRID - 2; cx++) {
    const i = idx(cx, cz); if (T.blocked[i] || T.ore[i]) continue;
    const x = cellCenter(cx), z = cellCenter(cz);
    const f = fbm(x * 0.03 + 50 + SEED[0], z * 0.03 + 80 + SEED[1], 3);
    let nearBase = 1e9; for (const k in BASES) nearBase = Math.min(nearBase, Math.hypot(x - BASES[k].x, z - BASES[k].z));
    if (nearBase < 40 || laneDist(x, z) < 11) continue;
    let nearOre = false;
    for (const o of ORE_FIELDS) if (Math.hypot(x - o.x, z - o.z) < o.r + 6) nearOre = true;
    if (nearOre) continue;
    if (f > (MAP.forest ?? 0.12) && R() < 0.75) { T.tree[i] = 1; T.blocked[i] = 1; treeSpots.push([x, z]); }
  }

  // ---- terrain mesh ----
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, RES, RES);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cA = new THREE.Color(), cB = new THREE.Color();
  const C = c => new THREE.Color(c);
  const grass1 = C(TH.grass1), grass2 = C(TH.grass2), dirt = C(TH.dirt), rock = C(TH.rock), sand = C(TH.sand), mud = C(TH.mud), base = C(TH.base);
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k);
    const h = heightAt(x, z);
    pos.setY(k, h);
    const n = normalAt(x, z);
    const slope = 1 - n.y;
    const v = fbm(x * 0.04, z * 0.04, 3) + fbm(x * 0.15, z * 0.15, 2) * 0.4;
    cA.copy(grass1).lerp(grass2, clamp(v * 1.5 + 0.5, 0, 1));
    const dirtAmt = smooth(0.15, 0.45, fbm(x * 0.025 + 9, z * 0.025 + 3, 4));
    cA.lerp(dirt, dirtAmt * 0.55);
    const ld = laneDist(x, z);
    cA.lerp(dirt, (1 - smooth(3, 9, ld)) * 0.45);
    for (const kk in BASES) cA.lerp(base, (1 - smooth(10, 26, Math.hypot(x - BASES[kk].x, z - BASES[kk].z))) * 0.4);
    if (h < WATER_LEVEL + 0.6) cA.lerp(sand, smooth(WATER_LEVEL + 0.6, WATER_LEVEL - 0.2, h));
    if (h < WATER_LEVEL - 0.6) cA.lerp(mud, 0.7);
    cA.lerp(rock, smooth(0.08, 0.3, slope));
    cA.lerp(rock, smooth(4, 8, h) * 0.8);
    // crystal-stained ground near ore
    const ci = idx(cellOf(x), cellOf(z));
    if (T.ore[ci]) { cB.set(T.oreRich[ci] ? 0x3c5f7a : TH.oreTint); cA.lerp(cB, 0.45); }
    if (T.tree[ci]) cA.multiplyScalar(0.7);
    const ao = 0.85 + 0.15 * clamp(1 - slope * 2, 0, 1);
    col[k * 3] = cA.r * ao; col[k * 3 + 1] = cA.g * ao; col[k * 3 + 2] = cA.b * ao;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = fogify(new THREE.MeshStandardMaterial({
    vertexColors: true, map: groundDetailTexture(), normalMap: groundNormalTexture(), normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.95, metalness: 0.0,
  }));
  const terrain = new THREE.Mesh(geo, mat);
  terrain.receiveShadow = true;
  terrain.name = 'terrain';
  scene.add(terrain);

  // ---- water ----
  const wn = waterNormalTexture();
  const wmat = fogify(new THREE.MeshStandardMaterial({ color: TH.water, roughness: TH.ice ? 0.35 : 0.08, metalness: TH.ice ? 0.2 : 0.6, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.86 }));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD, 1, 1).rotateX(-Math.PI / 2), wmat);
  water.position.y = WATER_LEVEL;
  water.receiveShadow = true;
  scene.add(water);
  G.three.water = water;

  buildTrees(scene, treeSpots);
  buildRocks(scene);
  buildOre(scene);
  buildDoodads(scene);
  initFog();
  buildMinimapImage(col, geo);
  return terrain;
}

function treeKinds() {
  const std = (o) => fogify(new THREE.MeshStandardMaterial(o));
  const trunkM = std({ color: 0x4b3423, roughness: 1 });
  const K = {};
  const pineParts = [];
  for (let k = 0; k < 3; k++) pineParts.push(new THREE.ConeGeometry(1.5 - k * 0.38, 2.0, 8).translate(0, 2.0 + k * 1.15, 0));
  const trunkG = new THREE.CylinderGeometry(0.16, 0.26, 2.2, 6).translate(0, 1.1, 0);
  K.pine = [[trunkG, trunkM], [mergeSimple(pineParts), std({ color: 0x2c4a22, roughness: 0.9, flatShading: true }), true]];
  const leafG = new THREE.IcosahedronGeometry(1.4, 1);
  const lp = leafG.attributes.position;
  for (let i = 0; i < lp.count; i++) { const s = 1 + noise2(lp.getX(i) * 2, lp.getZ(i) * 2 + lp.getY(i)) * 0.35; lp.setXYZ(i, lp.getX(i) * s, lp.getY(i) * s * 0.85 + 3.0, lp.getZ(i) * s); }
  leafG.computeVertexNormals();
  K.leaf = [[trunkG, trunkM], [leafG, std({ color: 0x4a6b26, roughness: 0.9, flatShading: true }), true]];
  // snowy pine: dark needles with white snow caps
  const capParts = [];
  for (let k = 0; k < 3; k++) capParts.push(new THREE.ConeGeometry(1.15 - k * 0.3, 0.9, 8).translate(0, 2.55 + k * 1.15, 0));
  K.snowpine = [[trunkG, trunkM], [mergeSimple(pineParts), std({ color: 0x23392a, roughness: 0.9, flatShading: true })], [mergeSimple(capParts), std({ color: 0xf2f6fa, roughness: 0.7, flatShading: true })]];
  // palm: curved segmented trunk + drooping fronds
  const segs = [];
  for (let i = 0; i < 6; i++) segs.push(new THREE.CylinderGeometry(0.17 - i * 0.012, 0.2 - i * 0.012, 0.75, 7).translate(i * i * 0.025, 0.37 + i * 0.7, 0));
  const fronds = [];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.ConeGeometry(0.35, 2.6, 4, 1).scale(1, 1, 0.15).rotateZ(Math.PI / 2 + 0.5).translate(1.2, -0.3, 0).rotateY(i / 7 * Math.PI * 2);
    fronds.push(f.translate(0.9, 4.3, 0));
  }
  K.palm = [[mergeSimple(segs), std({ color: 0x7a5a38, roughness: 1, flatShading: true })], [mergeSimple(fronds), std({ color: 0x3f7a2a, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }), true]];
  // cactus
  const cac = [new THREE.CylinderGeometry(0.32, 0.36, 2.6, 9).translate(0, 1.3, 0), new THREE.SphereGeometry(0.32, 9, 6).translate(0, 2.6, 0),
    new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8).rotateZ(Math.PI / 2).translate(0.5, 1.2, 0), new THREE.CylinderGeometry(0.2, 0.2, 1.0, 8).translate(0.82, 1.65, 0), new THREE.SphereGeometry(0.2, 8, 6).translate(0.82, 2.15, 0),
    new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8).rotateZ(Math.PI / 2).translate(-0.45, 1.6, 0), new THREE.CylinderGeometry(0.18, 0.18, 0.7, 8).translate(-0.72, 1.95, 0), new THREE.SphereGeometry(0.18, 8, 6).translate(-0.72, 2.3, 0)];
  K.cactus = [[mergeSimple(cac), std({ color: 0x5f8a3a, roughness: 0.8, flatShading: true }), true]];
  return K;
}

function buildTrees(scene, spots) {
  const R = mulberry32(5);
  const K = treeKinds();
  const weights = Object.entries(TH.trees);
  const groups = {};
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  for (const [x0, z0] of spots) {
    let r = R(), kind = weights[0][0];
    for (const [k, w] of weights) { if (r < w) { kind = k; break; } r -= w; }
    const x = x0 + (R() - 0.5) * 1.2, z = z0 + (R() - 0.5) * 1.2;
    const sc = 0.8 + R() * 0.6;
    p.set(x, heightAt(x, z) - 0.1, z); e.set((R() - 0.5) * 0.1, R() * 6.28, (R() - 0.5) * 0.1); q.setFromEuler(e); s.set(sc, sc * (0.9 + R() * 0.3), sc);
    m.compose(p, q, s);
    (groups[kind] = groups[kind] || []).push({ m: m.clone(), c: new THREE.Color().setHSL(0.22 + R() * 0.08, 0.45 + R() * 0.2, 0.75 + R() * 0.35) });
  }
  for (const kind in groups) {
    const list = groups[kind];
    for (const [geo, mat, tint] of K[kind]) {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((t, i) => { im.setMatrixAt(i, t.m); if (tint) im.setColorAt(i, t.c); });
      im.castShadow = true; im.receiveShadow = true; scene.add(im);
    }
  }
}

function mergeSimple(geos) {
  // merge indexed geometries with identical attributes
  let vc = 0, ic = 0;
  for (const g of geos) { vc += g.attributes.position.count; ic += g.index.count; }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), index = new Uint32Array(ic);
  let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2);
    for (let i = 0; i < g.index.count; i++) index[io + i] = g.index.array[i] + vo;
    vo += g.attributes.position.count; io += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}

function rockGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const s = 1 + noise2(x * 1.7 + seed, z * 1.7 + y * 1.3) * 0.55 + noise2(x * 4 + seed, y * 4) * 0.15;
    p.setXYZ(i, x * s, y * s * 0.7, z * s);
  }
  g.computeVertexNormals();
  return g;
}

function buildRocks(scene) {
  const R = mulberry32(8);
  const spots = [];
  for (let cz = 0; cz < GRID; cz++) for (let cx = 0; cx < GRID; cx++) {
    const i = idx(cx, cz);
    if (T.blocked[i] && !T.water[i] && !T.tree[i] && R() < 0.07) spots.push([cellCenter(cx), cellCenter(cz), 0.6 + R() * 1.0]);
    else if (!T.blocked[i] && !T.ore[i] && R() < 0.006) spots.push([cellCenter(cx), cellCenter(cz), 0.3 + R() * 0.3]); // small pebbles
  }
  const mat = fogify(new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 0.95, flatShading: true }));
  const geos = [rockGeometry(1), rockGeometry(7), rockGeometry(13)];
  const per = Math.ceil(spots.length / 3);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  geos.forEach((g, gi) => {
    const list = spots.slice(gi * per, (gi + 1) * per);
    const im = new THREE.InstancedMesh(g, mat, Math.max(1, list.length));
    list.forEach(([x, z, sc], k) => {
      x += (R() - 0.5); z += (R() - 0.5);
      p.set(x, heightAt(x, z) + sc * 0.1, z); e.set(R(), R() * 6, R() * 0.4); q.setFromEuler(e); s.set(sc, sc * (0.7 + R() * 0.5), sc);
      m.compose(p, q, s); im.setMatrixAt(k, m);
      c.setHSL(TH.rockTint[0], TH.rockTint[1] * (0.5 + R()), 0.33 + R() * 0.17); im.setColorAt(k, c);
    });
    im.count = list.length; im.castShadow = true; im.receiveShadow = true; scene.add(im);
  });
}

// ---- crystal fields ----
const ORE_PER_CELL = 4;
let oreMeshG, oreMeshB, oreInst = [];
function crystalGeometry() {
  const g = new THREE.CylinderGeometry(0.0, 0.32, 1, 6, 1).translate(0, 0.5, 0);
  const b = new THREE.CylinderGeometry(0.32, 0.22, 0.4, 6, 1).translate(0, -0.2, 0);
  return mergeSimple([g, b]);
}
function buildOre(scene) {
  const geo = crystalGeometry();
  let n = 0;
  for (let i = 0; i < T.ore.length; i++) if (T.ore[i] > 0) n++;
  oreMeshG = new THREE.InstancedMesh(geo, M().crystal, n * ORE_PER_CELL);
  oreMeshB = new THREE.InstancedMesh(geo, M().crystalBlue, n * ORE_PER_CELL);
  oreMeshG.castShadow = oreMeshB.castShadow = true;
  const R = mulberry32(3);
  let kg = 0, kb = 0;
  for (let i = 0; i < T.ore.length; i++) {
    if (!(T.ore[i] > 0)) continue;
    const cx = i % GRID, cz = (i / GRID) | 0;
    const list = [];
    for (let k = 0; k < ORE_PER_CELL; k++) {
      const x = cellCenter(cx) + (R() - 0.5) * 1.6, z = cellCenter(cz) + (R() - 0.5) * 1.6;
      const inst = { mesh: T.oreRich[i] ? oreMeshB : oreMeshG, k: T.oreRich[i] ? kb++ : kg++, x, z, y: heightAt(x, z), rx: (R() - 0.5) * 0.7, ry: R() * 6, rz: (R() - 0.5) * 0.7, s: 0.7 + R() * 0.9 };
      list.push(inst);
    }
    oreInst[i] = list;
  }
  oreMeshG.count = kg; oreMeshB.count = kb;
  scene.add(oreMeshG, oreMeshB);
  updateOre(true);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function updateOre(force) {
  if (!force && !T.oreDirty) return;
  T.oreDirty = false;
  for (let i = 0; i < T.ore.length; i++) {
    const list = oreInst[i]; if (!list) continue;
    const a = T.ore[i] / ORE_MAX;
    list.forEach((o, k) => {
      const sc = a <= 0.02 ? 0.0001 : o.s * Math.min(1, a * 1.3 + 0.15) * (1 - k * 0.12);
      _p.set(o.x, o.y - 0.1, o.z); _e.set(o.rx, o.ry, o.rz); _q.setFromEuler(_e); _s.set(sc, sc * 1.6, sc);
      _m.compose(_p, _q, _s); o.mesh.setMatrixAt(o.k, _m);
    });
  }
  oreMeshG.instanceMatrix.needsUpdate = true; oreMeshB.instanceMatrix.needsUpdate = true;
}
// Slowly regrow crystal next to existing crystal
let regrowT = 0;
export function regrowOre(dt) {
  regrowT += dt; if (regrowT < 2) return; regrowT = 0;
  for (let n = 0; n < 40; n++) {
    const i = (srand() * T.ore.length) | 0;
    if (oreInst[i] && T.ore[i] < ORE_MAX) { T.ore[i] = Math.min(ORE_MAX, T.ore[i] + 25); T.oreDirty = true; }
  }
}

// little props: crates, barrels, sandbags near lanes for detail
function buildDoodads(scene) {
  const R = mulberry32(99);
  const crate = new THREE.BoxGeometry(0.9, 0.9, 0.9).translate(0, 0.45, 0);
  const barrel = new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12).translate(0, 0.5, 0);
  const crateM = fogify(new THREE.MeshStandardMaterial({ color: 0x8a6a3e, roughness: 0.9, map: M().metal.map }));
  const barrelM = fogify(new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 0.5, metalness: 0.6 }));
  const N = 70;
  const ic = new THREE.InstancedMesh(crate, crateM, N), ib = new THREE.InstancedMesh(barrel, barrelM, N);
  let a = 0, b = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
  for (let t = 0; t < 600 && (a < N || b < N); t++) {
    const x = (R() - 0.5) * (WORLD - 40), z = (R() - 0.5) * (WORLD - 40);
    const cx = cellOf(x), cz = cellOf(z), i = idx(cx, cz);
    if (T.blocked[i] || T.ore[i] || laneDist(x, z) > 16 || laneDist(x, z) < 8) continue;
    let near = false; for (const k in BASES) if (Math.hypot(x - BASES[k].x, z - BASES[k].z) < 40) near = true;
    if (near) continue;
    const cnt = 2 + (R() * 3 | 0);
    for (let k = 0; k < cnt; k++) {
      const px = x + (R() - 0.5) * 1.6, pz = z + (R() - 0.5) * 1.6;
      p.set(px, heightAt(px, pz), pz); e.set(0, R() * 6, 0); q.setFromEuler(e); m.compose(p, q, s);
      if (R() < 0.5 && a < N) ic.setMatrixAt(a++, m); else if (b < N) ib.setMatrixAt(b++, m);
    }
    T.blocked[i] = 1;
  }
  ic.count = a; ib.count = b;
  for (const im of [ic, ib]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
}

// ---- fog of war ----
let fogTex, fogTarget, fogRaw;
function initFog() {
  fogTarget = new Float32Array(GRID * GRID); fogRaw = new Float32Array(GRID * GRID);
  fogTex = new THREE.DataTexture(T.fogData, GRID, GRID, THREE.RGBAFormat);
  fogTex.magFilter = THREE.LinearFilter; fogTex.minFilter = THREE.LinearFilter;
  fogTex.needsUpdate = true;
  fogUniforms.uFogTex.value = fogTex;
  for (let i = 0; i < GRID * GRID; i++) T.fogData[i * 4 + 3] = 255;
}
export function revealCircle(x, z, r) { const tmp = new Uint8Array(GRID * GRID); stamp(tmp, x, z, r); for (let i = 0; i < tmp.length; i++) if (tmp[i]) T.explored[i] = 1; }
export function revealAll(on) { fogUniforms.uFogOn.value = on ? 0 : 1; }

function stamp(arr, x, z, r) {
  const cx = cellOf(x), cz = cellOf(z), cr = Math.ceil(r / CELL);
  const r2 = (r / CELL) * (r / CELL);
  for (let j = -cr; j <= cr; j++) for (let i = -cr; i <= cr; i++) {
    if (i * i + j * j > r2) continue;
    const X = cx + i, Z = cz + j;
    if (X < 0 || Z < 0 || X >= GRID || Z >= GRID) continue;
    arr[Z * GRID + X] = 1;
  }
}
let fogTimer = 0;
export function updateVision(dt) {
  fogTimer -= dt;
  if (fogTimer <= 0) {
    fogTimer = 0.2;
    T.visible.fill(0); T.enemyVisible.fill(0);
    for (const u of G.units) if (!u.dead) stamp(u.faction === G.player ? T.visible : T.enemyVisible, u.x, u.z, u.def.sight * G.sightMult);
    for (const b of G.buildings) if (!b.dead && b.faction !== 'neutral') stamp(b.faction === G.player ? T.visible : T.enemyVisible, b.x, b.z, b.def.sight + Math.max(b.def.w, b.def.h));
    if (G.visionPings) {
      G.visionPings = G.visionPings.filter(p => p.until > G.time);
      for (const p of G.visionPings) stamp(p.f === G.player ? T.visible : T.enemyVisible, p.x, p.z, p.r);
    }
    for (let i = 0; i < GRID * GRID; i++) {
      if (T.visible[i]) T.explored[i] = 1;
      fogRaw[i] = T.visible[i] ? 255 : T.explored[i] ? 125 : 0;
    }
    // soften the edges with a small blur
    for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) {
      let s = 0, n = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const X = x + i, Z = z + j;
        if (X < 0 || Z < 0 || X >= GRID || Z >= GRID) continue;
        const w = i === 0 && j === 0 ? 4 : (i === 0 || j === 0) ? 2 : 1;
        s += fogRaw[Z * GRID + X] * w; n += w;
      }
      fogTarget[z * GRID + x] = s / n;
    }
  }
  // ease the fog texture toward its target for soft transitions
  const k = Math.min(1, dt * 6);
  let changed = false;
  for (let i = 0; i < GRID * GRID; i++) {
    const cur = T.fogData[i * 4];
    const tg = fogTarget[i];
    if (cur !== tg) {
      let n = cur + (tg - cur) * k; n = Math.abs(tg - n) < 2 ? tg : n;
      T.fogData[i * 4] = n; changed = true;
    }
  }
  if (changed) fogTex.needsUpdate = true;
}
export const isVisibleAt = (x, z) => fogUniforms.uFogOn.value < 0.5 || T.visible[idx(cellOf(x), cellOf(z))] === 1;
export const isExploredAt = (x, z) => fogUniforms.uFogOn.value < 0.5 || T.explored[idx(cellOf(x), cellOf(z))] === 1;

// ---- minimap backdrop ----
function buildMinimapImage(col, geo) {
  const S = GRID * 2;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  const img = x.createImageData(S, S);
  const pos = geo.attributes.position;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const wx = (i + 0.5) / S * WORLD - HALF, wz = (j + 0.5) / S * WORLD - HALF;
    const vi = Math.round((wz + HALF) / VS) * (RES + 1) + Math.round((wx + HALF) / VS);
    let r = col[vi * 3], g = col[vi * 3 + 1], b = col[vi * 3 + 2];
    const ci = idx(cellOf(wx), cellOf(wz));
    if (T.water[ci]) { r = 0.1; g = 0.25; b = 0.35; }
    if (T.tree[ci]) { r *= 0.6; g *= 0.75; b *= 0.6; }
    const h = pos.getY(vi); const sh = 0.8 + clamp(h / 20, 0, 0.5);
    const k = (j * S + i) * 4;
    img.data[k] = Math.min(255, Math.pow(r * sh, 1 / 2.2) * 255); img.data[k + 1] = Math.min(255, Math.pow(g * sh, 1 / 2.2) * 255); img.data[k + 2] = Math.min(255, Math.pow(b * sh, 1 / 2.2) * 255); img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  T.minimapImage = c;
}

export function animateWater(t) {
  const w = G.three.water;
  if (w) { w.material.normalMap.offset.set(t * 0.01, t * 0.006); }
}
