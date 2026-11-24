// Wallypool: a grid city on an island. Builds merged geometry, colliders and the road graph.
import * as THREE from 'three';
import * as T from './textures.js';
import { buildHuman, animateHuman } from './humans.js';
import { mergeGeometries } from '../lib/utils/BufferGeometryUtils.js';

export const N = 8;            // blocks per side
export const ROAD = 14;        // road width
export const BLOCK = 64;       // block size including pavement
export const P = ROAD + BLOCK; // pitch between road centres
export const HALF = N * P / 2;
export const KERB = 0.2;
export const PAVE = 3.5;       // pavement width
export const LANE = 3.4;       // lane centre offset from road centre
export const ISLAND = HALF + ROAD / 2 + 16;

export const roadC = (i) => -HALF + i * P;              // centre line of road i
export const blockMin = (i) => roadC(i) + ROAD / 2;     // pavement edge of block i
export const blockMax = (i) => roadC(i + 1) - ROAD / 2;

// Building lists for collision. Each: {x0,z0,x1,z1,h}
const GRID = 20;

class GeoBuilder {
  constructor() { this.p = []; this.n = []; this.uv = []; }
  quad(a, b, c, d, n, u0, v0, u1, v1) {
    // a b c d counter-clockwise seen from the normal side: a=bottom-left b=bottom-right c=top-right d=top-left
    const P = this.p, N = this.n, U = this.uv;
    P.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) N.push(...n);
    U.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
  }
  // vertical walls of an axis-aligned box, UVs in world units scaled by su, sv
  walls(x0, z0, x1, z1, y0, y1, su, sv, vOff = 0, uOff = 0) {
    const v0 = vOff, v1 = vOff + (y1 - y0) / sv;
    const w = (x1 - x0) / su, d = (z1 - z0) / su;
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], uOff, v0, uOff + w, v1);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], uOff, v0, uOff + w, v1);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], uOff, v0, uOff + d, v1);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], uOff, v0, uOff + d, v1);
  }
  top(x0, z0, x1, z1, y, su = 8) {
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], x0 / su, z1 / su, x1 / su, z0 / su);
  }
  box(x0, y0, z0, x1, y1, z1, su = 4) { this.walls(x0, z0, x1, z1, y0, y1, su, su); this.top(x0, z0, x1, z1, y1, su); }
  mesh(material, shadow = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  }
}

export function buildCity(scene, quality) {
  const r = T.rng(1977);
  const world = {
    buildings: [], circles: [], grid: new Map(), specials: {}, blocks: [], lampHeads: [], nightMats: [], antennaLights: [],
    pickupsSpots: [], specSpots: [], statue: null,
  };
  const addCollider = (b) => {
    world.buildings.push(b);
    const gx0 = Math.floor(b.x0 / GRID), gx1 = Math.floor(b.x1 / GRID), gz0 = Math.floor(b.z0 / GRID), gz1 = Math.floor(b.z1 / GRID);
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const k = gx * 1000 + gz;
      if (!world.grid.has(k)) world.grid.set(k, []);
      world.grid.get(k).push(b);
    }
  };
  const addCircle = (x, z, rad, h = 3) => addCollider({ x0: x - rad, z0: z - rad, x1: x + rad, z1: z + rad, h, circle: rad, cx: x, cz: z });

  // ---------- materials ----------
  const roadTex = T.roadTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, bumpMap: roadTex, bumpScale: 1.2, roughness: 0.92 });
  const juncMat = new THREE.MeshStandardMaterial({ map: T.junctionTexture(), roughness: 0.92 });
  const paveTex = T.sidewalkTexture();
  const paveMat = new THREE.MeshStandardMaterial({ map: paveTex, bumpMap: paveTex, bumpScale: 2, roughness: 0.95 });
  const grassMat = new THREE.MeshStandardMaterial({ map: T.grassTexture(), roughness: 1 });
  const roofMat = new THREE.MeshStandardMaterial({ map: T.roofTexture(), roughness: 0.95 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#8b8a86', roughness: 0.8, side: THREE.DoubleSide });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#3b3f44', roughness: 0.5, metalness: 0.6 });
  const styles = ['brick', 'sandstone', 'concrete', 'glass', 'tenement', 'white', 'teal'];
  const facade = {};
  styles.forEach((s, i) => {
    const t = T.facadeTextures(s, 100 + i);
    facade[s] = new THREE.MeshStandardMaterial({
      map: t.map, emissiveMap: t.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0,
      roughness: s === 'glass' ? 0.15 : 0.85, metalness: s === 'glass' ? 0.55 : 0,
      bumpMap: t.map, bumpScale: s === 'glass' ? 0.4 : 2.5, // brick courses and window frames catch the light
    });
    world.nightMats.push(facade[s]);
  });
  const shops = T.shopAtlas();
  const shopMat = new THREE.MeshStandardMaterial({ map: shops.map, emissiveMap: shops.emissive, emissive: '#c8b090', emissiveIntensity: 0, roughness: 0.6 });
  world.nightMats.push(shopMat);
  const gb = {}; for (const s of styles) gb[s] = new GeoBuilder();
  const gAO = new GeoBuilder(), gAwn = [new GeoBuilder(), new GeoBuilder(), new GeoBuilder()];
  // soft contact shadow strip on the ground: wall edge a-b, fading out to the outer edge
  const aoStrip = (ax, az, bx, bz, ox, oz, y) => {
    const A = [ax, y, az], B = [bx, y, bz], C = [bx + ox, y, bz + oz], D = [ax + ox, y, az + oz];
    const ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]);
    if (ny >= 0) gAO.quad(A, B, C, D, [0, 1, 0], 0, 0, 1, 1); else gAO.quad(B, A, D, C, [0, 1, 0], 0, 0, 1, 1);
  };
  const aoBox = (x0, z0, x1, z1, w, y) => {
    aoStrip(x0, z0, x1, z0, 0, -w, y); aoStrip(x1, z1, x0, z1, 0, w, y);
    aoStrip(x0, z1, x0, z0, -w, 0, y); aoStrip(x1, z0, x1, z1, w, 0, y);
  };
  const gShop = new GeoBuilder(), gRoof = new GeoBuilder(), gTrim = new GeoBuilder(), gPave = new GeoBuilder(), gGrass = new GeoBuilder(), gMetal = new GeoBuilder();
  const gRoad = new GeoBuilder(), gJunc = new GeoBuilder();

  // ---------- ground & roads ----------
  const topQuad = (g, x0, z0, x1, z1, y, u0, v0, u1, v1, rot) => {
    // top face (normal +y), vertices CCW from above (+y): (x0,z1) (x1,z1) (x1,z0) (x0,z0)
    if (!rot) g.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], u0, v0, u1, v1);
    else { // UV rotated 90deg so texture's V runs along X
      g.p.push(x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0);
      for (let k = 0; k < 6; k++) g.n.push(0, 1, 0);
      g.uv.push(u1, v0, u1, v1, u0, v1, u1, v0, u0, v1, u0, v0);
    }
  };
  for (let i = 0; i <= N; i++) {
    const c = roadC(i);
    for (let j = 0; j < N; j++) {
      const a = roadC(j) + ROAD / 2, b = roadC(j + 1) - ROAD / 2, len = (b - a) / ROAD;
      topQuad(gRoad, c - ROAD / 2, a, c + ROAD / 2, b, 0, 0, 0, 1, len, false);   // N-S road
      topQuad(gRoad, a, c - ROAD / 2, b, c + ROAD / 2, 0, 0, 0, 1, len, true);    // E-W road
    }
    for (let j = 0; j <= N; j++) topQuad(gJunc, c - ROAD / 2, roadC(j) - ROAD / 2, c + ROAD / 2, roadC(j) + ROAD / 2, 0, 0, 0, 1, 1);
  }
  scene.add(gRoad.mesh(roadMat, false));
  scene.add(gJunc.mesh(juncMat, false));
  // outer promenade ring
  const E = HALF + ROAD / 2;
  for (const [x0, z0, x1, z1] of [[-ISLAND, -ISLAND, ISLAND, -E], [-ISLAND, E, ISLAND, ISLAND], [-ISLAND, -E, -E, E], [E, -E, ISLAND, E]]) {
    topQuad(gPave, x0, z0, x1, z1, KERB, x0 / 6, z0 / 6, x1 / 6, z1 / 6);
  }
  // sea wall railing as colliders
  const rail = 0.6;
  addCollider({ x0: -ISLAND - 2, z0: -ISLAND - 2, x1: ISLAND + 2, z1: -ISLAND + rail, h: 1.1 });
  addCollider({ x0: -ISLAND - 2, z0: ISLAND - rail, x1: ISLAND + 2, z1: ISLAND + 2, h: 1.1 });
  addCollider({ x0: -ISLAND - 2, z0: -ISLAND, x1: -ISLAND + rail, z1: ISLAND, h: 1.1 });
  addCollider({ x0: ISLAND - rail, z0: -ISLAND, x1: ISLAND + 2, z1: ISLAND, h: 1.1 });
  // sea wall face
  gTrim.walls(-ISLAND, -ISLAND, ISLAND, ISLAND, -4, KERB, 6, 6);
  // railing posts & bar
  for (let k = -ISLAND; k <= ISLAND; k += 4) {
    for (const [x, z] of [[k, -ISLAND + 0.3], [k, ISLAND - 0.3], [-ISLAND + 0.3, k], [ISLAND - 0.3, k]]) gMetal.box(x - 0.06, KERB, z - 0.06, x + 0.06, 1.1, z + 0.06);
  }
  gMetal.box(-ISLAND, 1.0, -ISLAND + 0.22, ISLAND, 1.1, -ISLAND + 0.38);
  gMetal.box(-ISLAND, 1.0, ISLAND - 0.38, ISLAND, 1.1, ISLAND - 0.22);
  gMetal.box(-ISLAND + 0.22, 1.0, -ISLAND, -ISLAND + 0.38, 1.1, ISLAND);
  gMetal.box(ISLAND - 0.38, 1.0, -ISLAND, ISLAND - 0.22, 1.1, ISLAND);

  // ---------- districts ----------
  const special = {
    '3,3': 'plaza', '1,5': 'park', '5,1': 'park', '6,6': 'park', '2,2': 'home', '5,3': 'hospital',
    '2,5': 'police', '6,3': 'garage', '0,0': 'park',
  };
  for (let bx = 0; bx < N; bx++) special[bx + ',7'] = special[bx + ',7'] || 'docks';
  const lamps = [], trees = [], benches = [], phoneBoxes = [], bins = [];

  for (let bx = 0; bx < N; bx++) for (let bz = 0; bz < N; bz++) {
    const x0 = blockMin(bx), x1 = blockMax(bx), z0 = blockMin(bz), z1 = blockMax(bz);
    const kind = special[bx + ',' + bz] || 'city';
    const block = { bx, bz, x0, z0, x1, z1, kind };
    world.blocks.push(block);
    // kerb + pavement slab
    gTrim.walls(x0, z0, x1, z1, 0, KERB, 1, 1);
    aoBox(x0, z0, x1, z1, 0.7, 0.012);
    const ix0 = x0 + PAVE, ix1 = x1 - PAVE, iz0 = z0 + PAVE, iz1 = z1 - PAVE;
    if (kind === 'park' || kind === 'plaza') {
      // pavement ring + green
      topQuad(gPave, x0, z0, x1, iz0, KERB, x0 / 4, z0 / 4, x1 / 4, iz0 / 4);
      topQuad(gPave, x0, iz1, x1, z1, KERB, x0 / 4, iz1 / 4, x1 / 4, z1 / 4);
      topQuad(gPave, x0, iz0, ix0, iz1, KERB, x0 / 4, iz0 / 4, ix0 / 4, iz1 / 4);
      topQuad(gPave, ix1, iz0, x1, iz1, KERB, ix1 / 4, iz0 / 4, x1 / 4, iz1 / 4);
      if (kind === 'park') {
        topQuad(gGrass, ix0, iz0, ix1, iz1, KERB, ix0 / 8, iz0 / 8, ix1 / 8, iz1 / 8);
        // cross paths
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        topQuad(gPave, mx - 1.5, iz0, mx + 1.5, iz1, KERB + 0.01, 0, 0, 1, 10);
        topQuad(gPave, ix0, mz - 1.5, ix1, mz + 1.5, KERB + 0.01, 0, 0, 10, 1);
        for (let k = 0; k < 22; k++) {
          const tx = ix0 + 3 + r() * (ix1 - ix0 - 6), tz = iz0 + 3 + r() * (iz1 - iz0 - 6);
          if (Math.abs(tx - mx) < 3.5 || Math.abs(tz - mz) < 3.5) continue;
          trees.push([tx, tz, 0.8 + r() * 0.6]);
        }
        benches.push([mx + 3, mz + 8, 0], [mx - 3, mz - 8, Math.PI], [mx + 8, mz - 3, Math.PI / 2]);
        world.pickupsSpots.push([mx, mz]);
        world.specSpots.push([ix0 + 4, iz0 + 4]);
      } else {
        topQuad(gPave, ix0, iz0, ix1, iz1, KERB, ix0 / 3, iz0 / 3, ix1 / 3, iz1 / 3);
        world.specials.plaza = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
        for (const [dx, dz] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) trees.push([(x0 + x1) / 2 + dx, (z0 + z1) / 2 + dz, 1]);
      }
    } else {
      topQuad(gPave, x0, z0, x1, z1, KERB, x0 / 4, z0 / 4, x1 / 4, z1 / 4);
    }
    // street lamps along pavements
    for (const t of [0.2, 0.5, 0.8]) {
      lamps.push([x0 + 0.8, z0 + (z1 - z0) * t, -Math.PI / 2]);
      lamps.push([x1 - 0.8, z0 + (z1 - z0) * t, Math.PI / 2]);
      lamps.push([x0 + (x1 - x0) * t, z0 + 0.8, Math.PI]);
      lamps.push([x0 + (x1 - x0) * t, z1 - 0.8, 0]);
    }
    if (r() < 0.35) phoneBoxes.push([x0 + 2.2, z0 + 10 + r() * 30, Math.PI / 2]);
    if (r() < 0.6) bins.push([x1 - 1.5, z0 + 5 + r() * 50]);

    if (kind === 'park' || kind === 'plaza') continue;

    // ----- buildings -----
    const distC = Math.hypot((x0 + x1) / 2, (z0 + z1) / 2) / HALF; // 0 centre .. 1.4 corner
    const lots = [];
    const W = ix1 - ix0, D = iz1 - iz0;
    if (kind === 'docks') {
      lots.push([ix0, iz0, ix0 + W * 0.55, iz1 - 14], [ix0 + W * 0.6, iz0, ix1, iz0 + D * 0.5]);
    } else if (['home', 'hospital', 'police', 'garage'].includes(kind)) {
      lots.push([ix0, iz0, ix1, iz0 + D * 0.55], [ix0, iz0 + D * 0.62, ix0 + W * 0.45, iz1], [ix0 + W * 0.52, iz0 + D * 0.62, ix1, iz1]);
    } else {
      const sx = r() < 0.5 ? 2 : (r() < 0.5 ? 1 : 3), sz = r() < 0.5 ? 2 : (r() < 0.6 ? 1 : 3);
      const gap = 2.5;
      for (let a = 0; a < sx; a++) for (let b = 0; b < sz; b++) {
        lots.push([ix0 + a * W / sx + (a ? gap / 2 : 0), iz0 + b * D / sz + (b ? gap / 2 : 0), ix0 + (a + 1) * W / sx - (a < sx - 1 ? gap / 2 : 0), iz0 + (b + 1) * D / sz - (b < sz - 1 ? gap / 2 : 0)]);
      }
    }
    lots.forEach((L, li) => {
      let [lx0, lz0, lx1, lz1] = L;
      let style, floors;
      if (kind === 'docks') { style = 'concrete'; floors = 2; }
      else if (kind === 'hospital') { style = li === 0 ? 'white' : 'sandstone'; floors = li === 0 ? 6 : 3; }
      else if (kind === 'police') { style = li === 0 ? 'concrete' : 'brick'; floors = li === 0 ? 4 : 3; }
      else if (kind === 'garage') { style = 'brick'; floors = li === 0 ? 1 : 3; }
      else if (kind === 'home') { style = 'tenement'; floors = 4; }
      else if (distC < 0.45) { style = r() < 0.6 ? 'glass' : (r() < 0.5 ? 'teal' : 'concrete'); floors = 8 + (r() * 18 | 0); }
      else if (distC < 0.8) { style = ['sandstone', 'brick', 'concrete', 'teal', 'white'][r() * 5 | 0]; floors = 4 + (r() * 7 | 0); }
      else { style = ['tenement', 'sandstone', 'brick'][r() * 3 | 0]; floors = 3 + (r() * 3 | 0); }
      const shop = kind !== 'docks' && kind !== 'garage' && style !== 'glass' && r() < 0.75;
      const gH = 4.5, h = gH + floors * 3.5;
      const g = gb[style];
      if (kind === 'docks') {
        // warehouse: corrugated, tall single volume
        const wh = 9 + r() * 4;
        gMetal.walls(lx0, lz0, lx1, lz1, KERB, wh, 2, 2);
        // pitched-ish roof
        gRoof.top(lx0, lz0, lx1, lz1, wh, 8);
        addCollider({ x0: lx0, z0: lz0, x1: lx1, z1: lz1, h: wh });
        aoBox(lx0, lz0, lx1, lz1, 2.2, KERB + 0.015);
        return;
      }
      if (shop) {
        const row = (r() * 8) | 0;
        // map one 16m wide strip per row; v from row band
        const v0 = 1 - (row + 1) / 8, v1 = 1 - row / 8;
        const addShopWall = (a, b, c, d, n, len) => gShop.quad(a, b, c, d, n, 0, v0, Math.max(1, Math.round(len / 16)), v1);
        const y0 = KERB, y1 = gH;
        addShopWall([lx0, y0, lz1], [lx1, y0, lz1], [lx1, y1, lz1], [lx0, y1, lz1], [0, 0, 1], lx1 - lx0);
        addShopWall([lx1, y0, lz0], [lx0, y0, lz0], [lx0, y1, lz0], [lx1, y1, lz0], [0, 0, -1], lx1 - lx0);
        addShopWall([lx1, y0, lz1], [lx1, y0, lz0], [lx1, y1, lz0], [lx1, y1, lz1], [1, 0, 0], lz1 - lz0);
        addShopWall([lx0, y0, lz0], [lx0, y0, lz1], [lx0, y1, lz1], [lx0, y1, lz0], [-1, 0, 0], lz1 - lz0);
        // awning/cornice ledge
        gTrim.box(lx0 - 0.4, gH, lz0 - 0.4, lx1 + 0.4, gH + 0.35, lz1 + 0.4);
        // striped canvas awnings over the shop windows
        if (r() < 0.65) {
          const A = gAwn[(r() * 3) | 0], hi = gH - 1.15, lo = gH - 1.75, out = 1.25, m = 0.6;
          const faces = [[lx0 + m, lz0, lx1 - m, lz0, 0, -1], [lx1 - m, lz1, lx0 + m, lz1, 0, 1], [lx1, lz0 + m, lx1, lz1 - m, 1, 0], [lx0, lz1 - m, lx0, lz0 + m, -1, 0]];
          for (const [ax, az, bx, bz, nx, nz] of faces) {
            const len = Math.hypot(bx - ax, bz - az);
            A.quad([ax + nx * out, lo, az + nz * out], [bx + nx * out, lo, bz + nz * out], [bx, hi, bz], [ax, hi, az], [nx * 0.45, 0.9, nz * 0.45], 0, 0, len, 1);
            A.quad([ax + nx * out, lo - 0.28, az + nz * out], [bx + nx * out, lo - 0.28, bz + nz * out], [bx + nx * out, lo, bz + nz * out], [ax + nx * out, lo, az + nz * out], [nx, 0, nz], 0, 0, len, 0.3);
          }
        }
        g.walls(lx0, lz0, lx1, lz1, gH + 0.35, h, 16, 14, 0.06);
      } else {
        g.walls(lx0, lz0, lx1, lz1, KERB, h, 16, 14, 0);
      }
      // roof + parapet
      gRoof.top(lx0, lz0, lx1, lz1, h, 8);
      const pp = 0.35;
      gTrim.walls(lx0, lz0, lx1, lz1, h, h + 0.9, 4, 4);
      gTrim.walls(lx0 + pp, lz0 + pp, lx1 - pp, lz1 - pp, h, h + 0.9, 4, 4); // inner face (normals out but fine)
      gTrim.top(lx0, lz0, lx1, lx0 + pp > lx1 ? lz1 : lz0 + pp, h + 0.9);
      gTrim.top(lx0, lz1 - pp, lx1, lz1, h + 0.9);
      gTrim.top(lx0, lz0, lx0 + pp, lz1, h + 0.9);
      gTrim.top(lx1 - pp, lz0, lx1, lz1, h + 0.9);
      // floor bands on tall concrete/sandstone
      if (style === 'sandstone' || style === 'white') for (let f = 1; f < floors; f += 2) gTrim.box(lx0 - 0.15, gH + 0.35 + f * 3.5, lz0 - 0.15, lx1 + 0.15, gH + 0.55 + f * 3.5, lz1 + 0.15);
      // rooftop clutter
      const nAC = 1 + (r() * 3 | 0);
      for (let k = 0; k < nAC; k++) {
        const ax = lx0 + 2 + r() * (lx1 - lx0 - 5), az = lz0 + 2 + r() * (lz1 - lz0 - 5);
        gMetal.box(ax, h, az, ax + 1.6, h + 1.1, az + 1.2);
      }
      if (floors >= 6 && r() < 0.5) {
        const tx = lx0 + (lx1 - lx0) * 0.7, tz = lz0 + (lz1 - lz0) * 0.3;
        // water tank on stilts
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) gMetal.box(tx + dx - 0.1, h, tz + dz - 0.1, tx + dx + 0.1, h + 2, tz + dz + 0.1);
        world._tanks = world._tanks || []; world._tanks.push([tx, h + 2, tz]);
      }
      if (floors >= 14) {
        const ax = (lx0 + lx1) / 2, az = (lz0 + lz1) / 2;
        gMetal.box(ax - 0.15, h, az - 0.15, ax + 0.15, h + 12, az + 0.15);
        world.antennaLights.push(new THREE.Vector3(ax, h + 12.3, az));
      }
      if (floors <= 5 && r() < 0.5) world.specSpots.push([(lx0 + lx1) / 2, (lz0 + lz1) / 2, h]);
      addCollider({ x0: lx0, z0: lz0, x1: lx1, z1: lz1, h: h + 0.9, roof: h });
      aoBox(lx0, lz0, lx1, lz1, 1.8, KERB + 0.015);
      if (li === 0 && ['home', 'hospital', 'police', 'garage'].includes(kind)) block.main = { x0: lx0, z0: lz0, x1: lx1, z1: lz1, h };
    });
    if (kind === 'docks') {
      // shipping containers & a crane
      const cc = ['#b03a2e', '#1f618d', '#239b56', '#d68910', '#6c3483'];
      world._containers = world._containers || [];
      for (let k = 0; k < 5; k++) {
        const cx = ix0 + W * 0.62 + (k % 2) * 7, cz = iz0 + D * 0.58 + (k / 2 | 0) * 3.2, stack = 1 + (r() * 2 | 0);
        for (let s = 0; s < stack; s++) world._containers.push([cx, KERB + s * 2.6, cz, cc[(r() * 5) | 0]]);
        addCollider({ x0: cx - 3, z0: cz - 1.25, x1: cx + 3, z1: cz + 1.25, h: KERB + stack * 2.6, roof: KERB + stack * 2.6 });
      }
    }
  }

  // special building signs / markers
  const signs = { home: ["WALLY'S FLAT", '#2c3e50', '#ffd84a'], hospital: ['INFIRMARY', '#ffffff', '#c0392b'], police: ['POLIS', '#1f3a93', '#ffffff'], garage: ['WALLY WASH', '#e67e22', '#ffffff'] };
  for (const b of world.blocks) {
    if (!b.main) continue;
    const s = signs[b.kind];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshStandardMaterial({ map: T.signTexture(s[0], s[1], s[2]), emissive: '#ffffff', emissiveMap: T.signTexture(s[0], s[1], s[2]), emissiveIntensity: 0.4 }));
    // face the road on the -z side (north) of the block
    m.position.set((b.main.x0 + b.main.x1) / 2, 6.2, b.main.z0 - 0.45); m.rotation.y = Math.PI;
    scene.add(m);
    world.specials[b.kind] = { x: (b.main.x0 + b.main.x1) / 2, z: b.z0 + 1.8, block: b };
  }
  // the garage door: a driveable bay opening onto the north pavement
  const gar = world.specials.garage;
  if (gar) {
    const door = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.6, metalness: 0.4 }));
    door.position.set(gar.x, 2.2, gar.block.main.z0 - 0.42); door.rotation.y = Math.PI; scene.add(door);
  }

  // ---------- build merged meshes ----------
  for (const s of styles) if (gb[s].p.length) scene.add(gb[s].mesh(facade[s]));
  scene.add(gShop.mesh(shopMat));
  scene.add(gRoof.mesh(roofMat));
  scene.add(gTrim.mesh(trimMat));
  scene.add(gMetal.mesh(darkMetal));
  scene.add(gPave.mesh(paveMat, false));
  scene.add(gGrass.mesh(grassMat, false));
  {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, '#777'); gr.addColorStop(1, '#000');
    x.fillStyle = gr; x.fillRect(0, 0, 4, 64);
    const aoMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.5, alphaMap: new THREE.CanvasTexture(c), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const ao = gAO.mesh(aoMat, false); ao.receiveShadow = false; ao.renderOrder = 1; scene.add(ao);
    ['#b3122e', '#1d6e4a', '#1f4f91'].forEach((col, i) => {
      if (!gAwn[i].p.length) return;
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 16; const cx = cv.getContext('2d');
      cx.fillStyle = '#f2eee4'; cx.fillRect(0, 0, 64, 16); cx.fillStyle = col; cx.fillRect(0, 0, 32, 16);
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
      scene.add(gAwn[i].mesh(new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide })));
    });
  }

  // ---------- instanced street furniture ----------
  const dummy = new THREE.Object3D();
  // lamps
  {
    const pole = new THREE.CylinderGeometry(0.08, 0.12, 6.5, 10); pole.translate(0, 3.25 + KERB, 0);
    const arm = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8); arm.rotateZ(Math.PI / 2); arm.translate(0.8, 6.5 + KERB, 0); arm.rotateY(0); // will be oriented by instance
    const head = new THREE.CapsuleGeometry(0.18, 0.5, 4, 12); head.rotateZ(Math.PI / 2); head.translate(1.55, 6.4 + KERB, 0);
    const poleM = new THREE.InstancedMesh(pole, darkMetal, lamps.length);
    const armM = new THREE.InstancedMesh(arm, darkMetal, lamps.length);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffcf7a', emissiveIntensity: 0.1 });
    world.lampMat = lampMat;
    const headM = new THREE.InstancedMesh(head, lampMat, lamps.length);
    lamps.forEach(([x, z, ry], i) => {
      dummy.position.set(x, 0, z); dummy.rotation.set(0, ry + Math.PI / 2, 0); dummy.updateMatrix();
      poleM.setMatrixAt(i, dummy.matrix); armM.setMatrixAt(i, dummy.matrix); headM.setMatrixAt(i, dummy.matrix);
      addCircle(x, z, 0.2, 6);
      const hp = new THREE.Vector3(1.55, 6.4, 0).applyEuler(dummy.rotation).add(dummy.position); world.lampHeads.push(hp);
    });
    poleM.castShadow = true; armM.castShadow = true;
    scene.add(poleM, armM, headM);
  }
  // trees: trunk + three-lobed canopy
  {
    const trunk = new THREE.CylinderGeometry(0.18, 0.28, 3.2, 10); trunk.translate(0, 1.6 + KERB, 0);
    const rr = T.rng(5);
    const lobes = [[0, 4.6, 0, 1.55], [0.95, 4.0, 0.3, 1.2], [-0.8, 4.1, 0.55, 1.15], [0.1, 4.0, -0.95, 1.2], [-0.3, 5.5, -0.2, 1.05]].map(([lx, ly, lz, lr]) => {
      const g = new THREE.IcosahedronGeometry(lr, 3);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 0.88 + rr() * 0.22; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      g.computeVertexNormals(); g.translate(lx, ly + KERB, lz);
      return g;
    });
    const leaves = mergeGeometries(lobes);
    const tM = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: '#5a3d22', roughness: 1 }), trees.length);
    const lM = new THREE.InstancedMesh(leaves, new THREE.MeshStandardMaterial({ color: '#4a8a32', roughness: 0.85, flatShading: true }), trees.length);
    trees.forEach(([x, z, s], i) => {
      dummy.position.set(x, 0, z); dummy.rotation.set(0, s * 10, 0); dummy.scale.setScalar(s); dummy.updateMatrix();
      tM.setMatrixAt(i, dummy.matrix); lM.setMatrixAt(i, dummy.matrix);
      lM.setColorAt(i, new THREE.Color().setHSL(0.25 + rr() * 0.08, 0.5, 0.28 + rr() * 0.12));
      addCircle(x, z, 0.35 * s, 5 * s);
    });
    dummy.scale.setScalar(1);
    tM.castShadow = lM.castShadow = true;
    scene.add(tM, lM);
  }
  // red phone boxes
  {
    const g = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: '#c0161c', roughness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: '#cde6ff', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.5 });
    const body = new THREE.BoxGeometry(1.0, 2.5, 1.0); body.translate(0, 1.25 + KERB, 0);
    const top = new THREE.CylinderGeometry(0.62, 0.62, 0.2, 4, 1, false, Math.PI / 4); top.translate(0, 2.6 + KERB, 0);
    const pane = new THREE.BoxGeometry(1.04, 1.6, 0.7); pane.translate(0, 1.4 + KERB, 0);
    const bM = new THREE.InstancedMesh(body, red, phoneBoxes.length), tM = new THREE.InstancedMesh(top, red, phoneBoxes.length), pM = new THREE.InstancedMesh(pane, glass, phoneBoxes.length);
    phoneBoxes.forEach(([x, z, ry], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, ry, 0); dummy.updateMatrix(); bM.setMatrixAt(i, dummy.matrix); tM.setMatrixAt(i, dummy.matrix); pM.setMatrixAt(i, dummy.matrix); addCircle(x, z, 0.6, 2.8); });
    bM.castShadow = true; scene.add(bM, tM, pM); g;
  }
  // benches & bins
  {
    const seat = new THREE.BoxGeometry(2, 0.1, 0.5); seat.translate(0, 0.5 + KERB, 0);
    const back = new THREE.BoxGeometry(2, 0.5, 0.08); back.translate(0, 0.8 + KERB, -0.22);
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5230', roughness: 0.8 });
    const sM = new THREE.InstancedMesh(seat, wood, benches.length), bkM = new THREE.InstancedMesh(back, wood, benches.length);
    benches.forEach(([x, z, ry], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, ry, 0); dummy.updateMatrix(); sM.setMatrixAt(i, dummy.matrix); bkM.setMatrixAt(i, dummy.matrix); });
    scene.add(sM, bkM);
    const bin = new THREE.CylinderGeometry(0.3, 0.26, 0.9, 14); bin.translate(0, 0.45 + KERB, 0);
    const binM = new THREE.InstancedMesh(bin, new THREE.MeshStandardMaterial({ color: '#2d4a2d', roughness: 0.6 }), bins.length);
    bins.forEach(([x, z], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); binM.setMatrixAt(i, dummy.matrix); addCircle(x, z, 0.3, 1); });
    binM.castShadow = true; scene.add(binM);
  }
  // manhole covers in the roads, drain grates at the kerbs
  {
    const holes = [], drains = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) {
      const c = roadC(i), a = roadC(j) + ROAD / 2, len = P - ROAD;
      holes.push([c + (r() - 0.5) * 4, a + len * (0.2 + r() * 0.6)], [a + len * (0.2 + r() * 0.6), c + (r() - 0.5) * 4]);
      drains.push([c - ROAD / 2 + 0.35, a + len * r(), 0], [c + ROAD / 2 - 0.35, a + len * r(), 0], [a + len * r(), c - ROAD / 2 + 0.35, 1], [a + len * r(), c + ROAD / 2 - 0.35, 1]);
    }
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    x.fillStyle = '#2b2c2e'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill();
    x.strokeStyle = '#4a4b4e'; x.lineWidth = 3; for (let k = 10; k < 60; k += 8) { x.beginPath(); x.moveTo(k, 6); x.lineTo(k, 58); x.stroke(); }
    x.strokeStyle = '#555'; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 29, 0, 7); x.stroke();
    const ht = new THREE.CanvasTexture(cv); ht.colorSpace = THREE.SRGBColorSpace;
    const hg = new THREE.CircleGeometry(0.45, 24); hg.rotateX(-Math.PI / 2); hg.translate(0, 0.015, 0);
    const hm = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ map: ht, bumpMap: ht, bumpScale: 2, metalness: 0.6, roughness: 0.5, transparent: true, alphaTest: 0.5 }), holes.length);
    holes.forEach(([hx, hz], k) => { dummy.position.set(hx, 0, hz); dummy.rotation.set(0, r() * 6, 0); dummy.updateMatrix(); hm.setMatrixAt(k, dummy.matrix); });
    hm.receiveShadow = true; scene.add(hm);
    const dg = new THREE.PlaneGeometry(0.9, 0.4); dg.rotateX(-Math.PI / 2); dg.translate(0, 0.014, 0);
    const dc = document.createElement('canvas'); dc.width = 64; dc.height = 32; const dx = dc.getContext('2d');
    dx.fillStyle = '#1a1a1a'; dx.fillRect(0, 0, 64, 32); dx.fillStyle = '#56585c'; for (let k = 2; k < 64; k += 7) dx.fillRect(k, 2, 3, 28);
    const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
    const dm = new THREE.InstancedMesh(dg, new THREE.MeshStandardMaterial({ map: dt, metalness: 0.5, roughness: 0.6 }), drains.length);
    drains.forEach(([gx, gz, rot], k) => { dummy.position.set(gx, 0, gz); dummy.rotation.set(0, rot ? 0 : Math.PI / 2, 0); dummy.updateMatrix(); dm.setMatrixAt(k, dummy.matrix); });
    dm.receiveShadow = true; scene.add(dm);
  }
  // water tanks
  if (world._tanks) {
    const tg = new THREE.CylinderGeometry(1.4, 1.4, 2.6, 20); tg.translate(0, 1.3, 0);
    const tm = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: '#6b4f35', roughness: 0.9 }), world._tanks.length);
    world._tanks.forEach(([x, y, z], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); tm.setMatrixAt(i, dummy.matrix); });
    tm.castShadow = true; scene.add(tm);
  }
  // shipping containers
  if (world._containers) {
    const cg = new THREE.BoxGeometry(6, 2.6, 2.5); cg.translate(0, 1.3, 0);
    // corrugation via a stripy texture
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const cx = cv.getContext('2d');
    for (let i = 0; i < 64; i += 4) { cx.fillStyle = i % 8 ? '#ddd' : '#aaa'; cx.fillRect(i, 0, 4, 8); }
    const ct = new THREE.CanvasTexture(cv); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(4, 1);
    const cm = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ map: ct, roughness: 0.6, metalness: 0.3 }), world._containers.length);
    world._containers.forEach(([x, y, z, col], i) => { dummy.position.set(x, y, z); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); cm.setColorAt(i, new THREE.Color(col)); });
    cm.castShadow = true; scene.add(cm);
    // dock crane
    const cr = new GeoBuilder();
    const bx = blockMin(4) + 10, bz = blockMax(7) - 6;
    for (const [dx, dz] of [[0, 0], [6, 0], [0, 5], [6, 5]]) cr.box(bx + dx, KERB, bz + dz - 8, bx + dx + 0.6, 22, bz + dz - 7.4, 2);
    cr.box(bx - 4, 22, bz - 8, bx + 10.6, 23.2, bz - 1.8, 2);
    cr.box(bx + 2, 22, bz - 8, bx + 3.2, 23.2, bz + 22, 2);
    scene.add(cr.mesh(new THREE.MeshStandardMaterial({ color: '#e0a526', roughness: 0.5, metalness: 0.4 })));
  }

  // ---------- the sea ----------
  const wt = T.waterTexture(); wt.repeat.set(60, 60);
  const wn = (() => {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const img = x.createImageData(S, S);
    const hgt = (u, v) => Math.sin(u * 6.283 * 3 + Math.sin(v * 6.283 * 2) * 1.5) * 0.5 + Math.sin(v * 6.283 * 5 + u * 6.283 * 2) * 0.35 + Math.sin((u + v) * 6.283 * 7) * 0.15;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = i / S, v = j / S, e = 1 / S;
      const dx = (hgt(u + e, v) - hgt(u - e, v)) * 3, dy = (hgt(u, v + e) - hgt(u, v - e)) * 3;
      const l = Math.hypot(dx, dy, 1), k = (j * S + i) * 4;
      img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(160, 160); return t;
  })();
  world.seaNormal = wn;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1), new THREE.MeshStandardMaterial({ map: wt, normalMap: wn, normalScale: new THREE.Vector2(0.5, 0.5), color: '#3d7fa6', roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.95 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -1.6; scene.add(sea);
  world.sea = sea; world.seaTex = wt;
  // distant hills across the water
  {
    const hills = new THREE.Group();
    const hm = new THREE.MeshStandardMaterial({ color: '#56704a', roughness: 1, flatShading: true });
    const rr = T.rng(9);
    for (let k = 0; k < 26; k++) {
      const a = (k / 26) * Math.PI * 2, d = 1100 + rr() * 300;
      const hg = new THREE.ConeGeometry(120 + rr() * 160, 60 + rr() * 140, 7, 2);
      const m = new THREE.Mesh(hg, hm); m.position.set(Math.cos(a) * d, -2 + 20, Math.sin(a) * d); m.scale.y = 0.7; hills.add(m);
    }
    scene.add(hills);
  }

  // ---------- Wally Man statue in the plaza ----------
  if (world.specials.plaza) {
    const { x, z } = world.specials.plaza;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 3, 40), new THREE.MeshStandardMaterial({ color: '#cfc8b8', roughness: 0.7 }));
    ped.position.set(x, KERB + 1.5, z); ped.castShadow = ped.receiveShadow = true; scene.add(ped);
    const step = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.6, 40), ped.material); step.position.set(x, KERB + 0.3, z); step.receiveShadow = true; scene.add(step);
    const hero = buildHuman({ wally: true });
    animateHuman(hero, 0.016, { speed: 0, capeLift: 0.9 });
    const bronze = new THREE.MeshStandardMaterial({ color: '#b08d57', roughness: 0.35, metalness: 0.85 });
    hero.root.traverse((m) => { if (m.isMesh) { m.material = bronze; m.castShadow = true; } });
    hero.root.scale.setScalar(4.2); hero.root.position.set(x, KERB + 3, z); hero.root.rotation.y = Math.PI * 0.85;
    hero.root.updateMatrixWorld(true);
    scene.add(hero.root);
    world.statue = hero;
    addCollider({ x0: x - 4.6, z0: z - 4.6, x1: x + 4.6, z1: z + 4.6, h: KERB + 3, roof: KERB + 3, circle: 4.6, cx: x, cz: z });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshStandardMaterial({ map: T.signTexture('OUR HERO (ALLEGEDLY)', '#3b2f1f', '#e8c77a') }));
    plaque.position.set(x, KERB + 1.6, z - 3.55); plaque.rotation.y = Math.PI; plaque.rotation.x = -0.12; scene.add(plaque);
    // fountain jets ring
    world.specSpots.push([x + 10, z + 10]);
  }

  // antenna beacons
  if (world.antennaLights.length) {
    const g = new THREE.SphereGeometry(0.35, 10, 8);
    const m = new THREE.MeshBasicMaterial({ color: '#ff2020' });
    world.beacons = new THREE.InstancedMesh(g, m, world.antennaLights.length);
    world.antennaLights.forEach((p, i) => { dummy.position.copy(p); dummy.updateMatrix(); world.beacons.setMatrixAt(i, dummy.matrix); });
    scene.add(world.beacons);
  }

  // ---------- queries ----------
  world.nearby = (x, z, rad) => {
    const out = new Set();
    const gx0 = Math.floor((x - rad) / GRID), gx1 = Math.floor((x + rad) / GRID), gz0 = Math.floor((z - rad) / GRID), gz1 = Math.floor((z + rad) / GRID);
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const l = world.grid.get(gx * 1000 + gz); if (l) for (const b of l) out.add(b);
    }
    return out;
  };
  // push a circle (x,z,rad) at height y out of colliders. Returns {x,z,hit,nx,nz}
  world.collide = (x, z, rad, y = 0) => {
    let hit = false, nx = 0, nz = 0;
    for (const b of world.nearby(x, z, rad + 1)) {
      if (y >= (b.roof != null ? b.roof : b.h) - 0.25) continue;
      if (b.circle && b.cx !== undefined && !b.roof) {
        const dx = x - b.cx, dz = z - b.cz, d = Math.hypot(dx, dz), m = b.circle + rad;
        if (d < m && d > 1e-4) { x = b.cx + dx / d * m; z = b.cz + dz / d * m; hit = true; nx = dx / d; nz = dz / d; }
        continue;
      }
      if (b.circle && b.cx !== undefined) {
        const dx = x - b.cx, dz = z - b.cz, d = Math.hypot(dx, dz), m = b.circle + rad;
        if (d < m && d > 1e-4) { x = b.cx + dx / d * m; z = b.cz + dz / d * m; hit = true; nx = dx / d; nz = dz / d; }
        continue;
      }
      const qx = Math.max(b.x0, Math.min(x, b.x1)), qz = Math.max(b.z0, Math.min(z, b.z1));
      const dx = x - qx, dz = z - qz, d2 = dx * dx + dz * dz;
      if (d2 < rad * rad) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2); x = qx + dx / d * rad; z = qz + dz / d * rad; nx = dx / d; nz = dz / d;
        } else {
          // centre inside the box: push out along the shortest axis
          const l = x - b.x0, rr2 = b.x1 - x, t = z - b.z0, bb = b.z1 - z, m = Math.min(l, rr2, t, bb);
          if (m === l) { x = b.x0 - rad; nx = -1; nz = 0; } else if (m === rr2) { x = b.x1 + rad; nx = 1; nz = 0; } else if (m === t) { z = b.z0 - rad; nx = 0; nz = -1; } else { z = b.z1 + rad; nx = 0; nz = 1; }
        }
        hit = true;
      }
    }
    return { x, z, hit, nx, nz };
  };
  world.groundHeight = (x, z, y = 1e9) => {
    let g = 0;
    // kerb/pavement
    if (Math.abs(x) > HALF + ROAD / 2 || Math.abs(z) > HALF + ROAD / 2) g = KERB;
    else {
      const fx = ((x + HALF) % P + P) % P, fz = ((z + HALF) % P + P) % P;
      if (fx > ROAD / 2 && fx < P - ROAD / 2 && fz > ROAD / 2 && fz < P - ROAD / 2) g = KERB;
    }
    if (Math.abs(x) > ISLAND || Math.abs(z) > ISLAND) g = -50;
    for (const b of world.nearby(x, z, 0.5)) {
      const top = b.roof != null ? b.roof : null;
      if (top == null || y < top - 0.6) continue;
      if (b.circle && b.cx !== undefined) { if (Math.hypot(x - b.cx, z - b.cz) < b.circle) g = Math.max(g, top); }
      else if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) g = Math.max(g, top);
    }
    return g;
  };
  // line of sight between two points at height ~1.5 (sampled)
  world.blocked = (ax, az, bx, bz, y = 1.5) => {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 2);
    for (let i = 1; i < n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      for (const b of world.nearby(x, z, 0.1)) if (!b.circle && b.h > y && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true;
    }
    return false;
  };
  // is this point on the road surface?
  world.onRoad = (x, z) => {
    if (Math.abs(x) > HALF + ROAD / 2 || Math.abs(z) > HALF + ROAD / 2) return false;
    const fx = ((x + HALF) % P + P) % P, fz = ((z + HALF) % P + P) % P;
    return fx < ROAD / 2 || fx > P - ROAD / 2 || fz < ROAD / 2 || fz > P - ROAD / 2;
  };
  world.nearestNode = (x, z) => {
    const i = Math.max(0, Math.min(N, Math.round((x + HALF) / P))), j = Math.max(0, Math.min(N, Math.round((z + HALF) / P)));
    return [i, j];
  };
  // pavement loop point for pedestrians: block perimeter at 1.6m from the kerb
  world.paveLoop = (block) => {
    const o = 1.6;
    return { x0: block.x0 + o, z0: block.z0 + o, x1: block.x1 - o, z1: block.z1 - o };
  };

  world.update = (dt, t, night) => {
    wt.offset.x = t * 0.004; wt.offset.y = t * 0.002;
    wn.offset.x = -t * 0.01; wn.offset.y = t * 0.006;
    for (const m of world.nightMats) m.emissiveIntensity = night * 1.2;
    if (world.lampMat) world.lampMat.emissiveIntensity = 0.1 + night * 3.5;
    if (world.beacons) world.beacons.visible = (Math.floor(t * 1.2) % 2) === 0;
  };
  return world;
}
