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
  // Split the ground into 4x4 tiles that share the vertex data, so tiles outside the view are skipped.
  const terrain = chunkTerrain(scene, geo, mat);

  // ---- water ----
  const wn = waterNormalTexture();
  const wmat = fogify(TH.lava
    // glowing lava: bright emissive so the bloom makes it shine, normal map for a crusty surface
    ? new THREE.MeshStandardMaterial({ color: 0x3a0e04, emissive: TH.water, emissiveIntensity: 1.6, roughness: 0.85, metalness: 0, normalMap: wn, normalScale: new THREE.Vector2(1.4, 1.4) })
    : new THREE.MeshStandardMaterial({ color: TH.water, roughness: TH.ice ? 0.35 : 0.08, metalness: TH.ice ? 0.2 : 0.6, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.86 }));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD, 1, 1).rotateX(-Math.PI / 2), wmat);
  water.position.y = WATER_LEVEL;
  water.receiveShadow = true;
  scene.add(water);
  G.three.water = water;

  T.treeHp = new Float32Array(GRID * GRID).fill(120);
  treeAt.clear();
  buildTrees(scene, treeSpots);
  buildRocks(scene);
  buildOre(scene);
  buildDoodads(scene);
  initFog();
  buildMinimapImage(col, geo);
  return terrain;
}

const TERRAIN_TILES = 4;
function chunkTerrain(scene, geo, mat) {
  const full = geo.index.array, per = RES / TERRAIN_TILES;
  const pos = geo.attributes.position;
  let first = null;
  for (let tz = 0; tz < TERRAIN_TILES; tz++) for (let tx = 0; tx < TERRAIN_TILES; tx++) {
    const idxs = new Uint32Array(per * per * 6);
    let k = 0;
    const box = new THREE.Box3(), v = new THREE.Vector3();
    for (let iy = tz * per; iy < (tz + 1) * per; iy++) for (let ix = tx * per; ix < (tx + 1) * per; ix++) {
      const q = (iy * RES + ix) * 6;
      for (let j = 0; j < 6; j++) { const vi = full[q + j]; idxs[k++] = vi; v.fromBufferAttribute(pos, vi); box.expandByPoint(v); }
    }
    const g = new THREE.BufferGeometry();
    for (const name in geo.attributes) g.setAttribute(name, geo.attributes[name]); // shared, uploaded once
    g.setIndex(new THREE.BufferAttribute(idxs, 1));
    g.boundingBox = box; g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.name = 'terrain';
    scene.add(m);
    if (!first) first = m;
  }
  return first;
}

// Instanced scenery (trees, rocks) is split into map tiles. One InstancedMesh covering the whole map
// is always drawn in full - in the main pass and again in the shadow pass - even when off-screen.
const SCENERY_TILE = 64;
function addTiled(scene, geo, mat, items, { tint = false, shadow = true } = {}) {
  const tiles = new Map();
  const p = new THREE.Vector3();
  for (const it of items) {
    it.refs = it.refs || [];
    p.setFromMatrixPosition(it.m);
    const key = Math.floor((p.x + HALF) / SCENERY_TILE) + ',' + Math.floor((p.z + HALF) / SCENERY_TILE);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(it);
  }
  for (const list of tiles.values()) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((t, i) => { im.setMatrixAt(i, t.m); if (tint && t.c) im.setColorAt(i, t.c); t.refs.push({ im, i }); });
    im.computeBoundingSphere();
    im.castShadow = shadow; im.receiveShadow = true;
    scene.add(im);
  }
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
  K.blossom = [[trunkG, trunkM], [leafG, std({ color: 0xffffff, roughness: 0.85, flatShading: true }), true]]; // tinted pink / white per tree
  K.autumn = [[trunkG, trunkM], [leafG, std({ color: 0xffffff, roughness: 0.9, flatShading: true }), true]]; // tinted red / orange / gold per tree
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
  // dead tree: bare charred trunk with a few crooked branches (volcanic maps)
  const dead = [new THREE.CylinderGeometry(0.12, 0.26, 3.6, 6).translate(0, 1.8, 0)];
  for (let i = 0; i < 4; i++) dead.push(new THREE.CylinderGeometry(0.04, 0.09, 1.3, 5).translate(0, 0.65, 0).rotateZ(0.8 + i * 0.15).rotateY(i * 1.7).translate(0, 1.8 + i * 0.45, 0));
  K.dead = [[mergeSimple(dead), std({ color: 0x2a221e, roughness: 1, flatShading: true }), true]];
  K.cactus = [[mergeSimple(cac), std({ color: 0x5f8a3a, roughness: 0.8, flatShading: true }), true]];
  return K;
}

// ---- destructible trees: big blasts knock them down. Hit points live in sim state (T.treeHp), so felling
// a tree (which also clears its cell for movement) happens identically on every machine online.
const treeAt = new Map();      // cell index -> instanced tree record (visual)
let treeKindsCache = null;
export function blastTrees(x, z, r, dmg) {
  if (!T.treeHp) return;
  const c0x = cellOf(x - r), c1x = cellOf(x + r), c0z = cellOf(z - r), c1z = cellOf(z + r);
  for (let cz = c0z; cz <= c1z; cz++) for (let cx = c0x; cx <= c1x; cx++) {
    if (!inGrid(cx, cz)) continue;
    const i = idx(cx, cz);
    if (!T.tree[i]) continue;
    const d = Math.hypot(cellCenter(cx) - x, cellCenter(cz) - z);
    if (d > r) continue;
    T.treeHp[i] -= dmg * (1 - d / (r + 0.5));
    if (T.treeHp[i] <= 0) fellTree(i, x, z);
  }
}
function fellTree(i, fromX, fromZ) {
  T.tree[i] = 0; T.blocked[i] = T.water[i] ? 1 : 0;
  const it = treeAt.get(i); if (!it) return;
  treeAt.delete(i);
  // hide the standing tree...
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const { im, i: k } of it.refs) { im.setMatrixAt(k, zero); im.instanceMatrix.needsUpdate = true; }
  if (!G.three) return;
  // ...and topple a charred copy away from the blast, leaving a burnt stump
  treeKindsCache = treeKindsCache || treeKinds();
  const burnt = M().burnt, g = new THREE.Group();
  for (const [geo] of treeKindsCache[it.kind] || []) g.add(new THREE.Mesh(geo, burnt));
  const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); it.m.decompose(pos, q, sc);
  g.position.copy(pos); g.quaternion.copy(q); g.scale.copy(sc);
  const pivot = new THREE.Group(); pivot.position.copy(pos); G.three.scene.add(pivot);
  g.position.set(0, 0, 0); pivot.add(g);
  const away = Math.atan2(pos.x - fromX, pos.z - fromZ);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.5, 7), burnt); stump.position.set(pos.x, pos.y + 0.2, pos.z); stump.castShadow = true; G.three.scene.add(stump);
  let t = 0;
  G.fx?.treeFall?.(pos.x, pos.y, pos.z);
  decayTrees.push({ update: dt => {
    t += dt;
    const k = Math.min(1, t / 1.1);
    pivot.rotation.set(Math.cos(away) * k * k * 1.45, 0, -Math.sin(away) * k * k * 1.45, 'YXZ');
    if (t > 5) pivot.position.y -= dt * 0.5;
    if (t > 8) { G.three.scene.remove(pivot); return false; }
    return true;
  } });
}
const decayTrees = [];
export function updateFallingTrees(dt) { for (let i = decayTrees.length - 1; i >= 0; i--) if (!decayTrees[i].update(dt)) decayTrees.splice(i, 1); }

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
    const item = { m: m.clone(), c: kind === 'autumn' ? new THREE.Color().setHSL(R() * 0.13, 0.75 + R() * 0.15, 0.36 + R() * 0.14) : kind === 'blossom' ? new THREE.Color().setHSL(0.9 + R() * 0.08, 0.55 + R() * 0.3, 0.72 + R() * 0.14) : new THREE.Color().setHSL(0.22 + R() * 0.08, 0.45 + R() * 0.2, 0.75 + R() * 0.35), kind, x, z };
    (groups[kind] = groups[kind] || []).push(item);
    treeAt.set(idx(cellOf(x0), cellOf(z0)), item);
  }
  for (const kind in groups) {
    const list = groups[kind];
    for (const [geo, mat, tint] of K[kind]) addTiled(scene, geo, mat, list, { tint: !!tint });
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

function rockGeometry(seed, detail = 2) {
  const g = new THREE.IcosahedronGeometry(1, detail);
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
  const geosLo = [rockGeometry(1, 1), rockGeometry(7, 1), rockGeometry(13, 1)]; // 80 instead of 180 triangles
  const per = Math.ceil(spots.length / 3);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  geos.forEach((g, gi) => {
    const list = spots.slice(gi * per, (gi + 1) * per);
    const big = [], mid = [], small = [];
    list.forEach(([x, z, sc]) => {
      x += (R() - 0.5); z += (R() - 0.5);
      p.set(x, heightAt(x, z) + sc * 0.1, z); e.set(R(), R() * 6, R() * 0.4); q.setFromEuler(e); s.set(sc, sc * (0.7 + R() * 0.5), sc);
      m.compose(p, q, s);
      c.setHSL(TH.rockTint[0], TH.rockTint[1] * (0.5 + R()), 0.33 + R() * 0.17);
      (sc > 1.2 ? big : sc > 0.55 ? mid : small).push({ m: m.clone(), c: c.clone() });
    });
    if (big.length) addTiled(scene, g, mat, big, { tint: true });
    if (mid.length) addTiled(scene, geosLo[gi], mat, mid, { tint: true });
    if (small.length) addTiled(scene, geosLo[gi], mat, small, { tint: true, shadow: false }); // pebbles: shadows too small to see
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
let oreMeshes = [];
function buildOre(scene) {
  // one InstancedMesh per map tile and colour, so crystal fields that are off-screen are skipped
  const geo = crystalGeometry();
  const tiles = new Map();
  const tileOf = (rich, x, z) => {
    const key = (rich ? 'b' : 'g') + Math.floor((x + HALF) / SCENERY_TILE) + ',' + Math.floor((z + HALF) / SCENERY_TILE);
    if (!tiles.has(key)) tiles.set(key, { rich, n: 0, list: [] });
    return tiles.get(key);
  };
  const R = mulberry32(3);
  for (let i = 0; i < T.ore.length; i++) {
    if (!(T.ore[i] > 0)) continue;
    const cx = i % GRID, cz = (i / GRID) | 0;
    const t = tileOf(T.oreRich[i], cellCenter(cx), cellCenter(cz));
    const list = [];
    for (let k = 0; k < ORE_PER_CELL; k++) {
      const x = cellCenter(cx) + (R() - 0.5) * 1.6, z = cellCenter(cz) + (R() - 0.5) * 1.6;
      const inst = { tile: t, k: t.n++, x, z, y: heightAt(x, z), rx: (R() - 0.5) * 0.7, ry: R() * 6, rz: (R() - 0.5) * 0.7, s: 0.7 + R() * 0.9 };
      list.push(inst);
    }
    oreInst[i] = list;
  }
  oreMeshes = [];
  for (const t of tiles.values()) {
    t.mesh = new THREE.InstancedMesh(geo, t.rich ? M().crystalBlue : M().crystal, t.n);
    t.mesh.castShadow = true;
    oreMeshes.push(t.mesh); scene.add(t.mesh);
  }
  for (const list of oreInst) if (list) for (const o of list) o.mesh = o.tile.mesh;
  oreMeshG = oreMeshes[0]; oreMeshB = oreMeshes[1] || oreMeshes[0];
  updateOre(true);
  for (const m of oreMeshes) m.computeBoundingSphere(); // crystals only ever shrink, so this stays valid
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
  for (const m of oreMeshes) m.instanceMatrix.needsUpdate = true;
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
let fogEaseAcc = 0;
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
  // ease the fog texture toward its target for soft transitions (30 times a second is plenty, and
  // each change re-uploads the texture to the GPU)
  fogEaseAcc += dt;
  if (fogEaseAcc < 1 / 30) return;
  const k = Math.min(1, fogEaseAcc * 6);
  fogEaseAcc = 0;
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
    if (T.water[ci]) { if (TH.lava) { r = 1.0; g = 0.4; b = 0.08; } else { r = 0.1; g = 0.25; b = 0.35; } }
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
  if (!w) return;
  w.material.normalMap.offset.set(t * 0.01, t * 0.006);
  if (TH && TH.lava) {
    // slow glowing pulse, and embers spitting out of the lava pools
    w.material.emissiveIntensity = 1.5 + 0.35 * Math.sin(t * 1.3) + 0.15 * Math.sin(t * 3.7);
    if (LAKES.length && Math.random() < 0.25) {
      const l = LAKES[(Math.random() * LAKES.length) | 0], a = Math.random() * 6.28, r = Math.random() * l.r * 0.7;
      const x = l.x + Math.cos(a) * r, z = l.z + Math.sin(a) * r;
      if (isVisibleAt(x, z)) G.fx?.ember?.(x, WATER_LEVEL + 0.2, z);
    }
  }
}

// ---- Map Editor preview: height + colour image of any map design (doesn't touch the live world) ----
export function previewMap(def, theme, size = 128) {
  const saved = { MAP, TH, SEED, LANES, LAKES, ORE_FIELDS, bases: { ...BASES } };
  setupMap(def, theme, ['wally', 'grim']);
  const img = new Uint8ClampedArray(size * size * 4);
  const hs = new Float32Array(size * size);
  const step = WORLD / size;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) hs[j * size + i] = rawHeight(i * step - HALF + step / 2, j * step - HALF + step / 2);
  const C = c => new THREE.Color(c);
  const grass = C(theme.grass1), grass2 = C(theme.grass2), rock = C(theme.rock), sand = C(theme.sand), water = C(theme.water), dirt = C(theme.dirt), c = new THREE.Color();
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const h = hs[j * size + i];
    const x = i * step - HALF, z = j * step - HALF;
    const hx = hs[j * size + Math.min(size - 1, i + 1)] - h, hz = hs[Math.min(size - 1, j + 1) * size + i] - h;
    const slope = Math.hypot(hx, hz) / step;
    c.copy(grass).lerp(grass2, clamp(fbm(x * 0.04, z * 0.04, 2) + 0.5, 0, 1));
    if (laneDist(x, z) < 6) c.lerp(dirt, 0.45);
    if (h < WATER_LEVEL + 0.5) c.lerp(sand, 0.7);
    if (slope > 0.45 || h > 4.2) c.lerp(rock, Math.min(1, 0.4 + slope));
    const f = fbm(x * 0.03 + 50 + SEED[0], z * 0.03 + 80 + SEED[1], 3);
    let nearBase = 1e9; for (const k in BASES) nearBase = Math.min(nearBase, Math.hypot(x - BASES[k].x, z - BASES[k].z));
    if (f > (MAP.forest ?? 0.12) && nearBase > 40 && laneDist(x, z) > 11 && h > WATER_LEVEL && h < 4.2 && slope < 0.45) c.multiplyScalar(0.62);
    if (h < WATER_LEVEL) c.copy(water);
    const shade = 0.85 + clamp(h / 25, -0.2, 0.35) + (hx - hz) * 0.06;
    const k = (j * size + i) * 4;
    img[k] = Math.min(255, Math.pow(c.r * shade, 1 / 2.2) * 255); img[k + 1] = Math.min(255, Math.pow(c.g * shade, 1 / 2.2) * 255); img[k + 2] = Math.min(255, Math.pow(c.b * shade, 1 / 2.2) * 255); img[k + 3] = 255;
  }
  // restore the live map
  MAP = saved.MAP; TH = saved.TH; SEED = saved.SEED; LANES = saved.LANES; LAKES = saved.LAKES; ORE_FIELDS = saved.ORE_FIELDS;
  for (const k in BASES) delete BASES[k];
  Object.assign(BASES, saved.bases);
  return img;
}
