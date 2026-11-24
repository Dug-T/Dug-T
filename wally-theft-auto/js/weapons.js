// Weapons Wally can find lying about Wallypool
import * as THREE from 'three';
import { buildBlaster } from './humans.js';

export const WEAPONS = {
  fists: { name: 'Fists', icon: '👊', melee: true },
  club: { name: "Granda's Golf Club", icon: '🏌', melee: true, range: 2.3, dmg: 45, cool: 0.55 },
  blaster: { name: 'Wally Blaster', icon: '🔫', ranged: true, rate: 0.22, dmg: 45, pellets: 1, spread: 0, range: 90, pickup: 30 },
  scatter: { name: 'Scatter Blaster', icon: '💥', ranged: true, rate: 0.85, dmg: 24, pellets: 7, spread: 0.075, range: 35, pickup: 12 },
  neep: { name: 'Neep Grenades', icon: '💣', thrown: true, rate: 0.9, pickup: 4 },
};
export const WEAPON_ORDER = ['fists', 'club', 'blaster', 'scatter', 'neep'];

const M = {};
const mat = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(o));

export function buildClub() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.95, 10), mat('steel', { color: '#c9ced6', metalness: 1, roughness: 0.25 }));
  shaft.position.y = 0.42; g.add(shaft);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.24, 12), mat('gripblk', { color: '#1d1d1d', roughness: 0.8 }));
  grip.position.y = 0.04; g.add(grip);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 4, 12), mat('steel', {}));
  head.rotation.z = Math.PI / 2; head.position.set(0.04, 0.9, 0); head.scale.set(1, 1, 0.55); g.add(head);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

export function buildScatter() {
  const g = buildBlaster();
  g.scale.set(1.35, 1.35, 1.6);
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.09, 14), mat('pump', { color: '#e8641c', roughness: 0.5 }));
  pump.rotation.x = Math.PI / 2; pump.position.set(0, 0.012, 0.17); g.add(pump);
  const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 12), mat('grey2', { color: '#555b63', metalness: 0.8, roughness: 0.3 }));
  barrel2.rotation.x = Math.PI / 2; barrel2.position.set(0, 0.012, 0.21); g.add(barrel2);
  return g;
}

// A neep (a Scottish turnip): purple top, cream bottom, with a wee fuse
export function buildNeep(r = 0.07) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r, 20, 14);
  const pos = geo.attributes.position, col = [];
  const top = new THREE.Color('#7b3b8f'), bot = new THREE.Color('#efe2bd'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / r; c.copy(bot).lerp(top, THREE.MathUtils.smoothstep(y, -0.1, 0.5)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const body = new THREE.Mesh(geo, mat('neep', { vertexColors: true, roughness: 0.6 }));
  body.scale.set(1, 0.9, 1); g.add(body);
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, r * 0.8, 6), mat('fuse', { color: '#3a2a1a' }));
  fuse.position.y = r * 1.1; g.add(fuse);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(r * 0.18, 8, 6), mat('spark', { color: '#ffcf40', emissive: '#ff9a20', emissiveIntensity: 3 }));
  spark.position.y = r * 1.5; g.add(spark);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

export function buildWeaponModel(id) {
  if (id === 'club') return buildClub();
  if (id === 'scatter') return buildScatter();
  if (id === 'neep') return buildNeep();
  return buildBlaster();
}
