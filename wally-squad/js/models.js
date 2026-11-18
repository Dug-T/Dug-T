// Procedural, detailed 3D models for every building and unit.
// Each model is assembled from many primitives, then merged per material so it renders cheaply.
import * as THREE from 'three';
import { mergeGeometries } from '../lib/utils/BufferGeometryUtils.js';
import { mats, M } from './materials.js';
import { CELL } from './config.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

class Builder {
  constructor() { this.parts = new Map(); }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _s.set(sx, sy, sz); _p.set(x, y, z);
    _m.compose(_p, _q, _s); g.applyMatrix4(_m);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }
  box(mat, w, h, d, x, y, z, rx, ry, rz) { return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz); }
  cyl(mat, rt, rb, h, seg, x, y, z, rx, ry, rz) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg || 12), mat, x, y, z, rx, ry, rz); }
  sph(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) { return this.add(new THREE.SphereGeometry(r, 14, 10), mat, x, y, z, 0, 0, 0, sx, sy, sz); }
  build(shadow = true) {
    const grp = new THREE.Group();
    for (const [mat, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      grp.add(mesh);
    }
    return grp;
  }
}

// Cache geometry groups per (type, faction); clones share geometry.
const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cloneTree(cache.get(key));
}
function cloneTree(obj) {
  const c = obj.clone(true); // meshes share geometry + material
  c.userData = { ...obj.userData };
  return c;
}

// ------------------------------------------------------------------ helpers
function wheel(b, mat, x, y, z, r, w) {
  b.add(new THREE.CylinderGeometry(r, r, w, 16), M().rubber, x, y, z, 0, 0, Math.PI / 2);
  b.add(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.04, 10), mat, x, y, z, 0, 0, Math.PI / 2);
  b.add(new THREE.CylinderGeometry(r * 0.18, r * 0.18, w + 0.1, 8), M().gun, x, y, z, 0, 0, Math.PI / 2);
}
function trackUnit(b, side, len, h, w, y, faction) {
  const m = M();
  const x = side * 1;
  b.box(m.tread, w, h, len, x, y, 0);
  b.add(new THREE.CylinderGeometry(h / 2, h / 2, w, 14), m.tread, x, y, len / 2, 0, 0, Math.PI / 2);
  b.add(new THREE.CylinderGeometry(h / 2, h / 2, w, 14), m.tread, x, y, -len / 2, 0, 0, Math.PI / 2);
  // road wheels showing on outer face
  const n = 5;
  for (let i = 0; i < n; i++) {
    const z = -len / 2 + 0.25 + (i / (n - 1)) * (len - 0.5);
    b.add(new THREE.CylinderGeometry(h * 0.36, h * 0.36, 0.08, 12), m.darkMetal, x + side * (w / 2 + 0.02), y - h * 0.05, z, 0, 0, Math.PI / 2);
    b.add(new THREE.CylinderGeometry(h * 0.12, h * 0.12, 0.1, 8), m.metal, x + side * (w / 2 + 0.05), y - h * 0.05, z, 0, 0, Math.PI / 2);
  }
  // side skirt
  b.box(mats(faction).teamDark, 0.06, h * 0.45, len * 0.92, x + side * (w / 2 + 0.07), y + h * 0.28, 0);
}

// ------------------------------------------------------------------ infantry
export function makeInfantry(type, faction) {
  return cached(`inf-${type}-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const S = type === 'wally' ? 1.15 : 1.0;
    // body (torso + head + gear)
    const b = new Builder();
    const uniform = type === 'engineer' ? m.hazard : t.team;
    b.box(uniform, 0.46, 0.55, 0.28, 0, 1.0, 0);               // torso
    b.box(t.teamDark, 0.5, 0.18, 0.32, 0, 0.78, 0);           // belt / hips
    b.box(m.cloth, 0.36, 0.3, 0.12, 0, 1.05, -0.2);           // backpack
    b.box(m.darkMetal, 0.08, 0.12, 0.08, 0.12, 0.8, 0.17);    // pouch
    b.box(m.darkMetal, 0.08, 0.12, 0.08, -0.12, 0.8, 0.17);
    b.sph(m.skin, 0.15, 0, 1.43, 0.0);                        // head
    if (type === 'wally') {
      // red & white bobble hat, round glasses and stripy jumper - our hero!
      b.cyl(M().lampRed, 0.17, 0.17, 0.1, 14, 0, 1.53, 0);
      b.cyl(m.metal, 0.165, 0.165, 0.06, 14, 0, 1.6, 0);
      b.cyl(M().lampRed, 0.0, 0.16, 0.22, 14, 0, 1.72, 0);
      b.sph(m.metal, 0.07, 0, 1.86, 0);
      b.add(new THREE.TorusGeometry(0.05, 0.012, 6, 14), m.black, 0.065, 1.45, 0.14);
      b.add(new THREE.TorusGeometry(0.05, 0.012, 6, 14), m.black, -0.065, 1.45, 0.14);
      for (let i = 0; i < 4; i++) b.box(M().lampRed, 0.47, 0.06, 0.29, 0, 0.82 + i * 0.13, 0);
    } else if (type === 'engineer') {
      b.add(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.hazard, 0, 1.5, 0);
      b.cyl(m.hazard, 0.24, 0.24, 0.03, 16, 0, 1.5, 0);
      b.box(m.metal, 0.3, 0.2, 0.12, 0, 0.95, -0.24); // toolbox
    } else {
      b.add(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), t.teamDark, 0, 1.47, 0); // helmet
      b.cyl(t.teamDark, 0.2, 0.21, 0.04, 14, 0, 1.47, 0);
      b.box(m.glass, 0.22, 0.06, 0.04, 0, 1.45, 0.15);       // goggles
    }
    if (type === 'flamer') { b.cyl(m.lampRed, 0.08, 0.08, 0.5, 10, 0.1, 1.05, -0.28); b.cyl(m.lampRed, 0.08, 0.08, 0.5, 10, -0.1, 1.05, -0.28); }
    // arms holding weapon
    b.box(uniform, 0.12, 0.42, 0.12, 0.29, 1.05, 0.1, -0.7, 0, 0.1);
    b.box(uniform, 0.12, 0.42, 0.12, -0.29, 1.05, 0.1, -0.9, 0, -0.1);
    b.sph(m.skin, 0.06, 0.24, 0.92, 0.32); b.sph(m.skin, 0.06, -0.2, 0.98, 0.35);
    // weapon
    if (type === 'rocket') {
      b.cyl(t.teamDark, 0.09, 0.09, 1.1, 12, 0.18, 1.3, 0.05, Math.PI / 2, 0, 0);
      b.cyl(m.darkMetal, 0.11, 0.09, 0.15, 12, 0.18, 1.3, 0.6, Math.PI / 2, 0, 0);
      b.box(m.gun, 0.05, 0.15, 0.08, 0.18, 1.18, 0.15);
    } else if (type === 'flamer') {
      b.cyl(m.gun, 0.05, 0.06, 0.7, 10, 0.05, 0.98, 0.45, Math.PI / 2, 0, 0);
      b.cyl(m.darkMetal, 0.07, 0.07, 0.1, 10, 0.05, 0.98, 0.8, Math.PI / 2, 0, 0);
    } else if (type === 'engineer') {
      b.box(m.metal, 0.06, 0.06, 0.4, 0.05, 0.98, 0.42);
    } else {
      const L = type === 'wally' ? 1.0 : 0.7;
      b.box(m.gun, 0.07, 0.12, L, 0.05, 1.0, 0.3 + L / 2 - 0.2);
      b.box(m.gun, 0.05, 0.16, 0.08, 0.05, 0.9, 0.3);
      if (type === 'wally') { b.cyl(m.gun, 0.05, 0.05, 0.3, 8, 0.05, 1.12, 0.4, Math.PI / 2, 0, 0); }
    }
    const body = b.build(); body.name = 'body';
    // legs (animated)
    const legs = [];
    for (const side of [-1, 1]) {
      const lb = new Builder();
      lb.box(t.teamDark, 0.16, 0.5, 0.18, 0, -0.25, 0);
      lb.box(m.black, 0.18, 0.12, 0.26, 0, -0.52, 0.04);
      const leg = lb.build(); leg.position.set(side * 0.12, 0.72, 0); leg.name = 'leg';
      legs.push(leg); root.add(leg);
    }
    root.add(body);
    root.scale.setScalar(S);
    root.userData.muzzle = new THREE.Vector3(0.05, 1.05, 1.0);
    return root;
  });
}

// ------------------------------------------------------------------ vehicles
export function makeTank(faction) {
  return cached(`tank-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const hull = new Builder();
    trackUnit(hull, -1, 3.4, 0.7, 0.62, 0.38, faction);
    trackUnit(hull, 1, 3.4, 0.7, 0.62, 0.38, faction);
    hull.box(t.team, 1.5, 0.45, 3.2, 0, 0.8, 0);
    hull.add(new THREE.BoxGeometry(1.5, 0.45, 0.7), t.team, 0, 0.72, 1.75, -0.6, 0, 0); // sloped glacis
    hull.add(new THREE.BoxGeometry(1.5, 0.35, 0.5), t.teamDark, 0, 0.75, -1.72, 0.5, 0, 0);
    hull.box(t.team, 2.15, 0.08, 3.3, 0, 1.06, 0);              // track guards
    hull.box(m.darkMetal, 0.8, 0.12, 0.8, 0, 1.08, -1.1);       // engine grille
    for (let i = 0; i < 5; i++) hull.box(m.black, 0.7, 0.03, 0.05, 0, 1.15, -1.4 + i * 0.15);
    hull.cyl(m.darkMetal, 0.08, 0.08, 0.35, 8, 0.75, 1.1, -1.55); // exhaust
    hull.cyl(m.darkMetal, 0.08, 0.08, 0.35, 8, -0.75, 1.1, -1.55);
    hull.box(m.lampWhite, 0.18, 0.1, 0.05, 0.55, 0.92, 1.68); hull.box(m.lampWhite, 0.18, 0.1, 0.05, -0.55, 0.92, 1.68);
    hull.box(m.metal, 0.15, 0.15, 0.6, 0.85, 1.15, 0.6); // toolbox
    hull.box(m.wood, 0.12, 0.08, 1.0, -0.88, 1.12, 0.2);  // log
    root.add(hull.build());
    const turret = new Builder();
    turret.add(new THREE.CylinderGeometry(0.75, 0.95, 0.5, 8), t.team, 0, 0, 0, 0, Math.PI / 8, 0);
    turret.box(t.team, 1.3, 0.42, 1.1, 0, 0.0, -0.45);
    turret.box(t.teamDark, 1.2, 0.08, 1.5, 0, 0.27, -0.2);
    turret.cyl(m.darkMetal, 0.25, 0.25, 0.18, 14, 0.35, 0.36, -0.2); // hatch
    turret.cyl(m.gun, 0.03, 0.03, 0.6, 6, -0.4, 0.55, -0.4);           // antenna
    turret.box(m.gun, 0.08, 0.08, 0.5, -0.4, 0.38, 0.15);                // coax mg
    turret.box(t.accent, 0.3, 0.2, 0.02, 0.66, 0.0, 0.1, 0, Math.PI / 2, 0); // faction plate
    turret.box(m.darkMetal, 0.35, 0.35, 0.4, 0, 0, 0.75);               // mantlet
    turret.cyl(m.gun, 0.11, 0.13, 2.4, 12, 0, 0.02, 1.95, Math.PI / 2, 0, 0);
    turret.cyl(m.gun, 0.17, 0.17, 0.4, 12, 0, 0.02, 2.0, Math.PI / 2, 0, 0); // fume extractor
    turret.cyl(m.gun, 0.15, 0.15, 0.25, 12, 0, 0.02, 3.1, Math.PI / 2, 0, 0); // muzzle brake
    const tur = turret.build(); tur.position.set(0, 1.35, -0.1); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0, 0.02, 3.3);
    return root;
  });
}

export function makeTitan(faction) {
  return cached(`titan-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const hull = new Builder();
    for (const s of [-1, 1]) {
      // double tracks each side
      for (const off of [0.55, 1.25]) {
        hull.box(m.tread, 0.62, 0.85, 4.1, s * off, 0.45, 0);
        hull.add(new THREE.CylinderGeometry(0.42, 0.42, 0.62, 14), m.tread, s * off, 0.45, 2.05, 0, 0, Math.PI / 2);
        hull.add(new THREE.CylinderGeometry(0.42, 0.42, 0.62, 14), m.tread, s * off, 0.45, -2.05, 0, 0, Math.PI / 2);
      }
      hull.box(t.teamDark, 0.12, 0.55, 4.0, s * 1.6, 0.65, 0);
      for (let i = 0; i < 6; i++) hull.box(m.darkMetal, 0.04, 0.4, 0.35, s * 1.67, 0.6, -1.7 + i * 0.68);
    }
    hull.box(t.team, 2.3, 0.6, 3.8, 0, 1.05, 0);
    hull.add(new THREE.BoxGeometry(2.3, 0.55, 0.9), t.team, 0, 0.95, 2.2, -0.55, 0, 0);
    hull.box(t.team, 3.4, 0.1, 4.0, 0, 1.38, 0);
    hull.box(m.darkMetal, 1.4, 0.15, 1.0, 0, 1.45, -1.4);
    for (let i = 0; i < 6; i++) hull.box(m.black, 1.3, 0.04, 0.05, 0, 1.53, -1.8 + i * 0.16);
    hull.box(m.lampWhite, 0.2, 0.12, 0.05, 0.85, 1.15, 2.6); hull.box(m.lampWhite, 0.2, 0.12, 0.05, -0.85, 1.15, 2.6);
    hull.cyl(m.darkMetal, 0.12, 0.12, 0.6, 8, 1.0, 1.6, -1.8); hull.cyl(m.darkMetal, 0.12, 0.12, 0.6, 8, -1.0, 1.6, -1.8);
    root.add(hull.build());
    const tb = new Builder();
    tb.add(new THREE.CylinderGeometry(1.1, 1.3, 0.7, 8), t.team, 0, 0, 0, 0, Math.PI / 8, 0);
    tb.box(t.team, 2.0, 0.6, 1.6, 0, 0, -0.6);
    tb.box(t.teamDark, 1.8, 0.1, 2.1, 0, 0.36, -0.3);
    tb.box(m.darkMetal, 1.0, 0.5, 0.5, 0, 0, 1.0);
    for (const s of [-0.28, 0.28]) {
      tb.cyl(m.gun, 0.13, 0.15, 2.9, 12, s, 0.05, 2.4, Math.PI / 2, 0, 0);
      tb.cyl(m.gun, 0.19, 0.19, 0.3, 12, s, 0.05, 3.75, Math.PI / 2, 0, 0);
    }
    // missile pods
    for (const s of [-1, 1]) {
      tb.box(t.teamDark, 0.45, 0.5, 1.0, s * 1.2, 0.25, -0.3);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) tb.cyl(m.lampRed, 0.07, 0.07, 0.05, 8, s * 1.2 + (c - 0.5) * 0.2, 0.15 + r * 0.22, 0.21, Math.PI / 2, 0, 0);
    }
    tb.cyl(m.gun, 0.03, 0.03, 0.9, 6, -0.7, 0.8, -1.0);
    tb.cyl(m.darkMetal, 0.28, 0.28, 0.2, 14, 0.4, 0.45, -0.5);
    const tur = tb.build(); tur.position.set(0, 1.8, -0.2); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0.28, 0.05, 3.9);
    root.userData.muzzle2 = new THREE.Vector3(-0.28, 0.05, 3.9);
    return root;
  });
}

export function makeBuggy(faction) {
  return cached(`buggy-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.box(m.darkMetal, 1.0, 0.18, 2.6, 0, 0.55, 0);   // chassis
    b.box(t.team, 1.3, 0.35, 1.1, 0, 0.8, 0.7);         // hood
    b.add(new THREE.BoxGeometry(1.3, 0.25, 0.5), t.team, 0, 0.75, 1.35, -0.4, 0, 0);
    b.box(t.team, 1.3, 0.3, 0.9, 0, 0.78, -0.85);       // rear bed
    b.box(m.black, 1.1, 0.25, 0.7, 0, 0.75, -0.1);      // seats area
    // roll cage
    for (const s of [-1, 1]) {
      b.cyl(m.gun, 0.04, 0.04, 0.9, 6, s * 0.55, 1.25, 0.15, 0.25, 0, 0);
      b.cyl(m.gun, 0.04, 0.04, 0.9, 6, s * 0.55, 1.25, -0.5, -0.25, 0, 0);
    }
    b.cyl(m.gun, 0.04, 0.04, 1.15, 6, 0, 1.66, 0.05, 0, 0, Math.PI / 2);
    b.cyl(m.gun, 0.04, 0.04, 1.15, 6, 0, 1.66, -0.4, 0, 0, Math.PI / 2);
    b.box(m.glass, 1.0, 0.35, 0.04, 0, 1.12, 0.4, -0.3, 0, 0); // windscreen
    b.box(m.lampWhite, 0.15, 0.1, 0.05, 0.45, 0.85, 1.6); b.box(m.lampWhite, 0.15, 0.1, 0.05, -0.45, 0.85, 1.6);
    b.box(m.lampWhite, 0.8, 0.08, 0.06, 0, 1.75, 0.08); // light bar
    b.box(m.metal, 1.4, 0.12, 0.12, 0, 0.6, 1.65);       // bull bar
    b.cyl(m.rubber, 0.36, 0.36, 0.25, 14, 0, 1.0, -1.35, Math.PI / 2, 0, 0); // spare tire
    b.sph(m.skin, 0.13, 0.25, 1.22, -0.05); b.sph(t.teamDark, 0.15, 0.25, 1.28, -0.05, 1, 0.6, 1);
    for (const [x, z] of [[0.75, 0.95], [-0.75, 0.95], [0.75, -0.9], [-0.75, -0.9]]) wheel(b, m.metal, x, 0.45, z, 0.45, 0.32);
    root.add(b.build());
    const g = new Builder();
    g.cyl(m.darkMetal, 0.12, 0.15, 0.3, 10, 0, 0, 0);
    g.box(m.gun, 0.2, 0.2, 0.55, 0, 0.18, 0.15);
    g.cyl(m.gun, 0.05, 0.05, 0.8, 8, 0, 0.2, 0.75, Math.PI / 2, 0, 0);
    g.box(m.darkMetal, 0.5, 0.35, 0.04, 0, 0.3, 0.02); // gun shield
    const tur = g.build(); tur.position.set(0, 1.25, -0.75); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0, 0.2, 1.15);
    return root;
  });
}

export function makeHarvester(faction) {
  return cached(`harv-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    trackUnit(b, -1, 3.8, 0.8, 0.7, 0.42, faction);
    trackUnit(b, 1, 3.8, 0.8, 0.7, 0.42, faction);
    b.box(m.darkMetal, 1.6, 0.4, 3.6, 0, 0.85, 0);
    b.box(t.team, 2.3, 1.1, 2.2, 0, 1.55, -0.6);          // hopper
    b.box(t.teamDark, 2.1, 0.1, 2.0, 0, 2.12, -0.6);
    b.box(m.hazard, 2.32, 0.2, 2.22, 0, 1.0, -0.6);
    for (let i = 0; i < 4; i++) b.box(m.darkMetal, 0.08, 1.0, 0.08, 1.16, 1.55, -1.6 + i * 0.66);
    b.box(t.team, 1.3, 1.0, 1.0, -0.4, 1.6, 1.2);        // cab
    b.box(m.glass, 1.0, 0.45, 0.04, -0.4, 1.85, 1.71);
    b.box(m.glass, 0.04, 0.4, 0.7, -1.06, 1.85, 1.2);
    b.box(m.lampWhite, 0.18, 0.12, 0.05, -0.75, 1.3, 1.71); b.box(m.lampWhite, 0.18, 0.12, 0.05, -0.05, 1.3, 1.71);
    b.cyl(m.lampRed, 0.08, 0.08, 0.12, 10, -0.4, 2.15, 1.2); // beacon
    b.cyl(m.darkMetal, 0.12, 0.12, 0.9, 8, 0.7, 2.0, 1.1);   // exhaust stack
    // front harvesting drum
    b.box(m.darkMetal, 2.2, 0.25, 0.5, 0, 0.55, 2.1);
    b.add(new THREE.CylinderGeometry(0.35, 0.35, 2.0, 14), m.metal, 0, 0.45, 2.35, 0, 0, Math.PI / 2);
    for (let i = 0; i < 8; i++) b.box(m.hazard, 0.08, 0.1, 0.8, -0.9 + i * 0.26, 0.45, 2.35, i * 0.8, 0, 0);
    root.add(b.build());
    // crystal load (visible when carrying)
    const load = new Builder();
    for (let i = 0; i < 9; i++) load.add(new THREE.ConeGeometry(0.22, 0.7, 6), M().crystal, -0.7 + (i % 3) * 0.7, 2.1 + (i % 2) * 0.1, -1.2 + Math.floor(i / 3) * 0.6, (i * 0.7) % 0.5, i, 0.2);
    const lg = load.build(false); lg.name = 'load'; lg.visible = false;
    root.add(lg);
    return root;
  });
}

export function makeArtillery(faction) {
  return cached(`arty-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    trackUnit(b, -1, 3.0, 0.6, 0.55, 0.35, faction);
    trackUnit(b, 1, 3.0, 0.6, 0.55, 0.35, faction);
    b.box(t.team, 1.5, 0.45, 3.0, 0, 0.75, 0);
    b.box(t.teamDark, 2.0, 0.08, 3.1, 0, 1.0, 0);
    b.box(t.team, 1.3, 0.6, 0.9, 0, 1.3, 1.0);   // cab
    b.box(m.glass, 1.1, 0.25, 0.04, 0, 1.45, 1.46);
    b.box(m.darkMetal, 0.3, 0.6, 0.3, 0.75, 0.6, -1.5); b.box(m.darkMetal, 0.3, 0.6, 0.3, -0.75, 0.6, -1.5); // stabilisers
    b.box(m.hazard, 1.6, 0.1, 0.1, 0, 0.95, -1.55);
    root.add(b.build());
    const g = new Builder();
    g.box(t.team, 1.2, 0.6, 1.3, 0, 0, 0);
    g.box(m.darkMetal, 0.55, 0.5, 0.6, 0, 0.1, 0.6);
    g.cyl(m.gun, 0.14, 0.18, 3.4, 12, 0, 0.15, 2.4, Math.PI / 2, 0, 0);
    g.cyl(m.gun, 0.22, 0.22, 0.45, 12, 0, 0.15, 4.0, Math.PI / 2, 0, 0);
    g.box(m.darkMetal, 0.15, 0.15, 1.2, 0.3, -0.05, 1.2); // recoil cylinders
    g.box(m.darkMetal, 0.15, 0.15, 1.2, -0.3, -0.05, 1.2);
    const tur = g.build(); tur.position.set(0, 1.3, -0.6); tur.name = 'turret';
    const pitch = new THREE.Group(); pitch.name = 'turretRoot'; pitch.position.copy(tur.position); tur.position.set(0, 0, 0);
    tur.rotation.x = -0.45; pitch.add(tur); pitch.userData.barrel = tur;
    pitch.name = 'turret';
    tur.name = 'barrel';
    root.add(pitch);
    root.userData.muzzle = new THREE.Vector3(0, 0.15, 4.2);
    return root;
  });
}

export function makeGunship(faction) {
  return cached(`heli-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.sph(t.team, 0.8, 0, 0, 0.3, 1, 0.9, 1.9);                 // fuselage
    b.sph(m.glass, 0.55, 0, 0.25, 1.5, 0.9, 0.8, 1.0);          // canopy
    b.cyl(t.team, 0.2, 0.35, 3.2, 10, 0, 0.15, -2.2, Math.PI / 2, 0, 0); // tail boom
    b.box(t.teamDark, 0.08, 0.9, 0.6, 0, 0.55, -3.7);           // tail fin
    b.box(t.teamDark, 1.3, 0.06, 0.4, 0, 0.2, -3.4);            // stabiliser
    b.box(t.teamDark, 2.6, 0.1, 0.5, 0, -0.15, 0.2);            // stub wings
    for (const s of [-1, 1]) {
      b.cyl(m.darkMetal, 0.17, 0.17, 1.0, 10, s * 1.15, -0.32, 0.25, Math.PI / 2, 0, 0); // rocket pods
      b.cyl(m.lampRed, 0.13, 0.13, 0.05, 10, s * 1.15, -0.32, 0.77, Math.PI / 2, 0, 0);
      b.box(m.gun, 0.05, 0.4, 0.05, s * 0.5, -0.7, 0.6); b.box(m.gun, 0.05, 0.4, 0.05, s * 0.5, -0.7, -0.4);
      b.box(m.gun, 0.06, 0.06, 1.6, s * 0.5, -0.9, 0.1); // skids
      b.box(m.lampGreen, 0.06, 0.06, 0.06, s * 1.3, -0.1, 0.2);
    }
    b.cyl(m.darkMetal, 0.15, 0.25, 0.4, 10, 0, 0.82, 0.2);      // rotor mast
    b.box(t.team, 0.9, 0.35, 1.3, 0, 0.6, 0.0);                 // engine housing
    b.cyl(m.gun, 0.05, 0.05, 0.8, 8, 0, -0.55, 1.7, Math.PI / 2, 0, 0); // chin gun
    const body = b.build();
    root.add(body);
    const rb = new Builder();
    for (let i = 0; i < 4; i++) rb.box(m.black, 0.25, 0.03, 4.4, 0, 0, 0, 0, (i * Math.PI) / 4 * 2 / 2 + i * Math.PI / 4, 0);
    rb.cyl(m.darkMetal, 0.18, 0.18, 0.15, 10, 0, 0, 0);
    const rotor = rb.build(false); rotor.position.set(0, 1.08, 0.2); rotor.name = 'rotor';
    root.add(rotor);
    const tr = new Builder();
    tr.box(m.black, 0.04, 1.1, 0.12, 0, 0, 0); tr.box(m.black, 0.04, 0.12, 1.1, 0, 0, 0);
    const trot = tr.build(false); trot.position.set(0.12, 0.55, -3.7); trot.name = 'tailrotor';
    root.add(trot);
    // rotor blur disk
    const disk = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.18, depthWrite: false }));
    disk.position.set(0, 1.1, 0.2); root.add(disk);
    root.userData.muzzle = new THREE.Vector3(1.15, -0.32, 0.8);
    root.userData.muzzle2 = new THREE.Vector3(-1.15, -0.32, 0.8);
    return root;
  });
}

export function makeUnitModel(type, faction) {
  switch (type) {
    case 'tank': return makeTank(faction);
    case 'titan': return makeTitan(faction);
    case 'buggy': return makeBuggy(faction);
    case 'harvester': return makeHarvester(faction);
    case 'arty': return makeArtillery(faction);
    case 'gunship': return makeGunship(faction);
    default: return makeInfantry(type, faction);
  }
}

// ------------------------------------------------------------------ buildings
function foundation(b, w, d, h = 0.4) {
  const m = M();
  b.box(m.concrete, w, h, d, 0, h / 2 - 0.15, 0);
  b.box(m.concreteDark, w + 0.3, 0.2, d + 0.3, 0, -0.05, 0);
}
function pipes(b, x, y, z, len, axis = 'x', n = 2) {
  const m = M();
  for (let i = 0; i < n; i++) {
    if (axis === 'x') b.add(new THREE.CylinderGeometry(0.12, 0.12, len, 8), m.metal, x, y + i * 0.3, z, 0, 0, Math.PI / 2);
    else b.add(new THREE.CylinderGeometry(0.12, 0.12, len, 8), m.metal, x, y + i * 0.3, z, Math.PI / 2, 0, 0);
  }
}
function lamps(b, pts, mat) { for (const [x, y, z] of pts) b.add(new THREE.SphereGeometry(0.1, 8, 6), mat, x, y, z); }

export function makeBuildingModel(type, faction) {
  return cached(`bld-${type}-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    const W = { conyard: 4, power: 3, refinery: 4, barracks: 3, factory: 4, radar: 3, tech: 3, helipad: 3, turret: 1, sam: 2, plasma: 1 };
    const D = { conyard: 4, power: 3, refinery: 3, barracks: 3, factory: 4, radar: 3, tech: 3, helipad: 3, turret: 1, sam: 2, plasma: 1 };
    const w = W[type] * CELL - 0.3, d = D[type] * CELL - 0.3;
    const parts = {};
    switch (type) {
      case 'conyard': {
        foundation(b, w, d);
        b.box(t.team, 5.2, 2.6, 4.6, -0.6, 1.55, -0.5);
        b.box(t.teamDark, 5.4, 0.25, 4.8, -0.6, 2.9, -0.5);
        b.box(m.windows, 5.22, 0.6, 0.02, -0.6, 2.0, 1.82);
        b.box(m.concreteDark, 2.2, 3.6, 2.2, 2.3, 1.9, -2.0);
        b.box(t.accent, 2.25, 0.3, 2.25, 2.3, 3.3, -2.0);
        b.box(m.windows, 0.02, 0.5, 2.0, 3.41, 2.6, -2.0);
        b.box(m.hazard, 3.0, 0.08, 0.6, -1.5, 0.3, 3.0);
        b.box(m.darkMetal, 2.8, 2.2, 0.2, -1.5, 1.3, 1.95);   // big door
        for (let i = 0; i < 6; i++) b.box(m.metal, 2.8, 0.05, 0.05, -1.5, 0.4 + i * 0.35, 2.06);
        pipes(b, 1.5, 0.6, 2.8, 2.5, 'x', 2);
        b.cyl(m.metal, 0.6, 0.6, 1.4, 14, -2.8, 3.6, -1.5); // tank
        b.sph(m.metal, 0.6, -2.8, 4.3, -1.5, 1, 0.5, 1);
        b.cyl(m.gun, 0.05, 0.05, 2.5, 6, 2.8, 4.9, -2.6);
        lamps(b, [[2.8, 6.15, -2.6], [-3.2, 3.05, 1.7], [2.0, 3.05, 1.7]], m.lampRed);
        // construction crane (animated)
        const cb = new Builder();
        cb.cyl(m.hazard, 0.25, 0.3, 4.6, 8, 0, 2.3, 0);
        cb.box(m.hazard, 0.35, 0.35, 5.5, 0, 4.7, 1.5);
        cb.box(m.darkMetal, 0.6, 0.6, 0.8, 0, 4.7, -1.3);
        cb.cyl(m.gun, 0.02, 0.02, 2.4, 4, 0, 3.4, 3.9);
        cb.box(m.darkMetal, 0.3, 0.3, 0.3, 0, 2.2, 3.9);
        cb.box(m.glass, 0.5, 0.4, 0.5, 0.35, 4.5, -0.1);
        const crane = cb.build(); crane.position.set(2.3, 3.4, -2.0); crane.name = 'crane';
        parts.crane = crane;
        break;
      }
      case 'power': {
        foundation(b, w, d);
        b.box(t.teamDark, 4.0, 1.4, 2.0, 0, 0.9, 1.5);
        b.box(m.windows, 3.6, 0.35, 0.02, 0, 1.2, 2.51);
        for (const [x, z] of [[-1.4, -1.0], [1.4, -1.0]]) {
          b.cyl(m.concrete, 1.0, 1.3, 3.8, 18, x, 2.0, z);
          b.cyl(t.team, 1.02, 1.02, 0.4, 18, x, 3.0, z);
          b.cyl(m.concreteDark, 0.9, 1.0, 0.3, 18, x, 4.0, z);
        }
        b.box(m.hazard, 4.6, 0.2, 0.2, 0, 0.3, 2.65);
        // transformer & energy coils
        for (let i = 0; i < 3; i++) { b.cyl(m.darkMetal, 0.25, 0.25, 0.9, 10, -1.2 + i * 1.2, 2.0, 1.5); b.add(new THREE.TorusGeometry(0.28, 0.06, 6, 14), m.metal, -1.2 + i * 1.2, 2.2, 1.5, Math.PI / 2, 0, 0); b.add(new THREE.TorusGeometry(0.28, 0.06, 6, 14), m.metal, -1.2 + i * 1.2, 1.9, 1.5, Math.PI / 2, 0, 0); }
        b.add(new THREE.SphereGeometry(0.22, 10, 8), m.energy, -1.2, 2.55, 1.5); b.add(new THREE.SphereGeometry(0.22, 10, 8), m.energy, 0, 2.55, 1.5); b.add(new THREE.SphereGeometry(0.22, 10, 8), m.energy, 1.2, 2.55, 1.5);
        pipes(b, 0, 1.0, -1.0, 2.0, 'x', 2);
        lamps(b, [[-1.4, 4.2, -1.0], [1.4, 4.2, -1.0]], m.lampRed);
        parts.steam = [new THREE.Vector3(-1.4, 4.2, -1.0), new THREE.Vector3(1.4, 4.2, -1.0)];
        break;
      }
      case 'refinery': {
        foundation(b, w, d);
        b.box(t.team, 4.0, 2.4, 2.8, -1.8, 1.4, -0.9);
        b.box(t.teamDark, 4.2, 0.25, 3.0, -1.8, 2.7, -0.9);
        b.box(m.windows, 0.02, 0.5, 2.4, 0.21, 2.0, -0.9);
        for (let i = 0; i < 3; i++) { b.cyl(m.metal, 0.7, 0.7, 3.0, 16, 1.2 + i * 1.5 - 1.5, 1.7, -1.6 + 0 * i); }
        b.cyl(m.metal, 0.7, 0.7, 3.0, 16, 2.7, 1.7, -1.6);
        for (const x of [-0.3, 1.2, 2.7]) { b.sph(m.metal, 0.7, x, 3.2, -1.6, 1, 0.45, 1); b.add(new THREE.TorusGeometry(0.72, 0.06, 6, 18), t.accent, x, 2.4, -1.6, Math.PI / 2, 0, 0); }
        // dock pad
        b.box(m.concreteDark, 3.4, 0.25, 2.8, 1.8, 0.2, 1.3);
        b.box(m.hazard, 3.4, 0.05, 0.25, 1.8, 0.35, 2.6); b.box(m.hazard, 3.4, 0.05, 0.25, 1.8, 0.35, 0.0);
        b.box(m.darkMetal, 0.4, 1.5, 0.4, 0.2, 1.0, 1.3); b.box(m.darkMetal, 1.8, 0.3, 0.4, 1.0, 1.75, 1.3); // unload arm
        b.add(new THREE.ConeGeometry(0.5, 0.8, 8), m.darkMetal, 1.8, 1.4, 1.3, Math.PI, 0, 0);
        pipes(b, -0.3, 1.1, 0.7, 3.8, 'x', 2);
        b.cyl(m.darkMetal, 0.2, 0.25, 4.4, 10, -3.2, 2.2, -2.0);
        b.add(new THREE.SphereGeometry(0.6, 12, 8), M().crystal, -1.8, 3.2, -0.9);
        lamps(b, [[-3.2, 4.5, -2.0]], m.lampRed);
        parts.steam = [new THREE.Vector3(-3.2, 4.5, -2.0)];
        break;
      }
      case 'barracks': {
        foundation(b, w, d);
        b.box(t.team, 4.4, 1.9, 3.2, 0, 1.15, -0.6);
        // quonset roof
        b.add(new THREE.CylinderGeometry(1.6, 1.6, 4.5, 16, 1, false, 0, Math.PI), t.teamDark, 0, 2.1, -0.6, 0, 0, Math.PI / 2);
        b.box(m.darkMetal, 1.4, 1.5, 0.2, 0, 0.95, 1.05);
        b.box(m.windows, 0.9, 0.35, 0.02, -1.5, 1.6, 1.01); b.box(m.windows, 0.9, 0.35, 0.02, 1.5, 1.6, 1.01);
        // sandbags
        for (let i = 0; i < 9; i++) b.add(new THREE.CapsuleGeometry(0.18, 0.4, 4, 8), m.sand, -2.0 + i * 0.5, 0.35, 2.1, 0, 0, Math.PI / 2);
        for (let i = 0; i < 8; i++) b.add(new THREE.CapsuleGeometry(0.18, 0.4, 4, 8), m.sand, -1.75 + i * 0.5, 0.65, 2.1, 0, 0, Math.PI / 2);
        b.cyl(m.gun, 0.04, 0.04, 3.4, 6, 2.0, 2.0, 1.8);
        b.box(t.accent, 0.9, 0.55, 0.02, 2.47, 3.3, 1.8); // flag
        b.box(m.wood, 0.8, 0.5, 0.6, -2.0, 0.55, 1.4);
        lamps(b, [[0, 1.85, 1.2]], m.lampWhite);
        parts.flag = true;
        break;
      }
      case 'factory': {
        foundation(b, w, d);
        b.box(t.team, 7.2, 3.4, 5.0, 0, 1.9, -1.2);
        b.add(new THREE.BoxGeometry(7.3, 0.25, 2.8), t.teamDark, 0, 4.0, -2.2, 0.35, 0, 0);
        b.add(new THREE.BoxGeometry(7.3, 0.25, 2.8), t.teamDark, 0, 4.0, -0.0, -0.35, 0, 0);
        for (let i = 0; i < 3; i++) b.box(m.glass, 0.9, 0.05, 2.0, -2.4 + i * 2.4, 4.25, -2.2, 0.35, 0, 0);
        b.box(m.darkMetal, 3.6, 2.8, 0.3, 0, 1.55, 1.35); // bay door frame
        b.box(m.black, 3.2, 2.5, 0.1, 0, 1.4, 1.48);
        b.box(m.hazard, 3.8, 0.3, 0.32, 0, 3.05, 1.36);
        b.box(m.hazard, 0.25, 2.8, 0.32, 1.95, 1.55, 1.36); b.box(m.hazard, 0.25, 2.8, 0.32, -1.95, 1.55, 1.36);
        b.box(m.concreteDark, 3.6, 0.15, 2.4, 0, 0.15, 2.6); // ramp
        b.box(m.windows, 1.6, 0.5, 0.02, -2.8, 2.6, 1.31); b.box(m.windows, 1.6, 0.5, 0.02, 2.8, 2.6, 1.31);
        b.cyl(m.darkMetal, 0.3, 0.35, 2.5, 10, 3.0, 4.5, -3.0); b.cyl(m.darkMetal, 0.3, 0.35, 2.5, 10, 2.2, 4.5, -3.0);
        pipes(b, -3.65, 0.8, -1.2, 4.6, 'z', 3);
        lamps(b, [[1.95, 3.3, 1.5], [-1.95, 3.3, 1.5]], m.lampWhite);
        // animated door
        const db = new Builder();
        db.box(m.metal, 3.15, 2.45, 0.08, 0, 0, 0);
        for (let i = 0; i < 8; i++) db.box(m.darkMetal, 3.15, 0.04, 0.1, 0, -1.1 + i * 0.3, 0.02);
        const door = db.build(); door.position.set(0, 1.4, 1.5); door.name = 'door';
        parts.door = door;
        parts.steam = [new THREE.Vector3(3.0, 5.8, -3.0), new THREE.Vector3(2.2, 5.8, -3.0)];
        break;
      }
      case 'radar': {
        foundation(b, w, d);
        b.box(t.team, 3.6, 1.8, 3.6, 0, 1.1, 0);
        b.box(t.teamDark, 3.8, 0.2, 3.8, 0, 2.05, 0);
        b.box(m.windows, 3.62, 0.4, 0.02, 0, 1.4, 1.81);
        b.cyl(m.darkMetal, 0.5, 0.7, 1.2, 12, 0, 2.7, 0);
        for (let i = 0; i < 4; i++) b.cyl(m.gun, 0.03, 0.03, 1.6, 4, 1.5 * (i % 2 ? 1 : -1), 2.9, 1.5 * (i < 2 ? 1 : -1));
        lamps(b, [[1.5, 3.7, 1.5], [-1.5, 3.7, 1.5], [1.5, 3.7, -1.5], [-1.5, 3.7, -1.5]], m.lampRed);
        const db = new Builder();
        db.add(new THREE.SphereGeometry(1.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3.2), m.metal, 0, -1.0, 0, 0, 0, 0, 1, 1, 1);
        db.cyl(m.gun, 0.05, 0.05, 1.2, 6, 0, 0.0, 0.5, Math.PI / 3, 0, 0);
        db.sph(m.lampWhite, 0.1, 0, 0.4, 1.0);
        db.box(m.darkMetal, 0.3, 0.6, 0.3, 0, -0.5, 0);
        const dish = db.build(); dish.position.set(0, 3.8, 0); dish.rotation.x = 0.6;
        const dishRoot = new THREE.Group(); dishRoot.position.set(0, 0, 0); dishRoot.name = 'dish'; dishRoot.add(dish);
        parts.dish = dishRoot;
        break;
      }
      case 'tech': {
        foundation(b, w, d);
        b.cyl(t.team, 2.3, 2.6, 2.4, 8, 0, 1.4, 0, 0, Math.PI / 8, 0);
        b.cyl(t.teamDark, 2.0, 2.3, 0.3, 8, 0, 2.75, 0, 0, Math.PI / 8, 0);
        b.add(new THREE.SphereGeometry(1.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.glass, 0, 2.85, 0);
        b.box(m.windows, 1.5, 0.4, 0.02, 0, 1.6, 2.42);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.cyl(m.metal, 0.15, 0.15, 3.6, 8, Math.cos(a) * 2.2, 1.8, Math.sin(a) * 2.2); b.add(new THREE.SphereGeometry(0.22, 10, 8), m.energy, Math.cos(a) * 2.2, 3.7, Math.sin(a) * 2.2); }
        const cb = new Builder();
        cb.add(new THREE.TorusKnotGeometry(0.55, 0.12, 64, 8), m.energy, 0, 0, 0);
        const core = cb.build(false); core.position.set(0, 3.4, 0); core.name = 'core';
        parts.core = core;
        break;
      }
      case 'helipad': {
        foundation(b, w, d, 0.3);
        b.cyl(m.concreteDark, 2.6, 2.6, 0.12, 24, 0, 0.22, 0);
        b.add(new THREE.TorusGeometry(2.2, 0.08, 6, 32), m.hazard, 0, 0.3, 0, Math.PI / 2, 0, 0);
        b.box(m.lampWhite, 0.25, 0.04, 1.8, -0.55, 0.3, 0); b.box(m.lampWhite, 0.25, 0.04, 1.8, 0.55, 0.3, 0); b.box(m.lampWhite, 1.1, 0.04, 0.25, 0, 0.3, 0);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.sph(i % 2 ? m.lampGreen : m.lampRed, 0.09, Math.cos(a) * 2.6, 0.35, Math.sin(a) * 2.6); }
        b.box(t.team, 1.1, 1.6, 1.1, 2.3, 0.9, -2.3); b.box(m.windows, 1.12, 0.35, 0.02, 2.3, 1.3, -1.74);
        b.cyl(m.gun, 0.03, 0.03, 1.6, 4, 2.3, 2.5, -2.3);
        b.box(m.lampRed, 0.5, 0.3, 0.02, 2.55, 3.1, -2.3); // windsock
        break;
      }
      case 'turret': {
        b.cyl(m.concreteDark, 0.95, 1.05, 0.5, 10, 0, 0.1, 0);
        b.cyl(m.concrete, 0.8, 0.95, 0.9, 10, 0, 0.7, 0);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.add(new THREE.CapsuleGeometry(0.14, 0.3, 4, 6), m.sand, Math.cos(a) * 1.0, 0.25, Math.sin(a) * 1.0, 0, -a, Math.PI / 2); }
        const tb = new Builder();
        tb.sph(t.team, 0.62, 0, 0, 0, 1, 0.7, 1.1);
        tb.box(t.teamDark, 0.9, 0.2, 1.0, 0, -0.15, 0);
        tb.box(m.darkMetal, 0.35, 0.35, 0.3, 0, 0.0, 0.6);
        tb.cyl(m.gun, 0.08, 0.1, 1.6, 10, 0, 0.0, 1.4, Math.PI / 2, 0, 0);
        tb.cyl(m.gun, 0.12, 0.12, 0.2, 10, 0, 0.0, 2.15, Math.PI / 2, 0, 0);
        tb.box(m.glass, 0.25, 0.1, 0.05, 0.25, 0.3, 0.45);
        const tur = tb.build(); tur.position.set(0, 1.45, 0); tur.name = 'turret';
        parts.turret = tur; parts.muzzle = new THREE.Vector3(0, 0, 2.25);
        break;
      }
      case 'sam': {
        foundation(b, w, d, 0.3);
        b.box(m.concreteDark, 2.8, 0.6, 2.8, 0, 0.45, 0);
        b.box(m.hazard, 2.85, 0.1, 2.85, 0, 0.8, 0);
        b.cyl(m.darkMetal, 0.5, 0.6, 0.6, 12, 0, 1.0, 0);
        const tb = new Builder();
        tb.box(t.team, 0.8, 0.5, 0.8, 0, 0, 0);
        for (const s of [-1, 1]) {
          tb.box(t.teamDark, 0.6, 0.7, 1.8, s * 0.75, 0.35, 0.2, -0.5, 0, 0);
          for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) tb.cyl(m.lampRed, 0.1, 0.1, 0.05, 8, s * 0.75 + (c - 0.5) * 0.25, 0.65 + r * 0.25 - 0.1 + 0.35, 1.05, Math.PI / 2 - 0.5, 0, 0);
        }
        tb.box(m.darkMetal, 0.2, 0.6, 0.2, 0, 0.5, -0.3);
        tb.add(new THREE.CircleGeometry(0.35, 12), m.metal, 0, 0.9, -0.3, -0.4, 0, 0);
        const tur = tb.build(); tur.position.set(0, 1.5, 0); tur.name = 'turret';
        parts.turret = tur; parts.muzzle = new THREE.Vector3(0.75, 0.8, 1.1); parts.muzzle2 = new THREE.Vector3(-0.75, 0.8, 1.1);
        break;
      }
      case 'plasma': {
        b.cyl(m.concreteDark, 0.95, 1.05, 0.4, 8, 0, 0.1, 0);
        b.cyl(t.teamDark, 0.55, 0.85, 3.6, 8, 0, 2.1, 0);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; b.box(t.team, 0.25, 3.8, 0.35, Math.cos(a) * 0.75, 2.0, Math.sin(a) * 0.75, 0, -a, Math.cos(a) * 0.12); }
        for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(0.62 - i * 0.04, 0.06, 6, 16), m.plasma, 0, 1.0 + i * 0.85, 0, Math.PI / 2, 0, 0);
        b.cyl(m.darkMetal, 0.25, 0.55, 0.6, 8, 0, 4.1, 0);
        const cb = new Builder();
        cb.add(new THREE.IcosahedronGeometry(0.42, 1), m.plasma, 0, 0, 0);
        const core = cb.build(false); core.position.set(0, 4.7, 0); core.name = 'core';
        parts.core = core; parts.muzzle = new THREE.Vector3(0, 4.7, 0);
        break;
      }
    }
    root.add(b.build());
    for (const k of ['crane', 'door', 'dish', 'core', 'turret']) if (parts[k]) root.add(parts[k]);
    root.userData.parts = { steam: parts.steam, muzzle: parts.muzzle, muzzle2: parts.muzzle2, flag: parts.flag };
    return root;
  });
}

// Ghost (placement preview) — translucent version of a building
export function makeGhost(type, faction) {
  const g = makeBuildingModel(type, faction);
  const mat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.35, depthWrite: false });
  g.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  g.userData.ghostMat = mat;
  return g;
}

// Rubble left behind by destroyed buildings
export function makeRubble(w, d) {
  const b = new Builder();
  const m = M();
  const n = Math.round(w * d * 1.2) + 4;
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * w * 0.9, z = (Math.random() - 0.5) * d * 0.9;
    const s = 0.3 + Math.random() * 0.9;
    b.add(new THREE.BoxGeometry(s, s * 0.5, s * 0.8), Math.random() < 0.5 ? m.burnt : m.concreteDark, x, s * 0.2, z, Math.random(), Math.random() * 3, Math.random());
  }
  for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.06, 0.06, 1.5 + Math.random() * 1.5, 4), m.darkMetal, (Math.random() - 0.5) * w * 0.7, 0.6, (Math.random() - 0.5) * d * 0.7, Math.random() - 0.5, 0, Math.random() - 0.5);
  return b.build();
}

// Burnt-out wreck for destroyed vehicles: clone model with charred material
export function charModel(obj) {
  obj.traverse(o => { if (o.isMesh) { o.material = M().burnt; } });
}
