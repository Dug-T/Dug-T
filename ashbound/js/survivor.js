// Survivor characters (the player and the castaways): one skinned mesh each, with weight-blended joints,
// posed in code. Clothing extras (hats, glasses, the backpack) ride on the bones as separate meshes.
import * as THREE from 'three';
import { mergeGeometries } from '../lib/utils/BufferGeometryUtils.js';

const matCache = new Map();
export function mat(color, rough = 0.7, extra = {}) {
  const key = color + '|' + rough + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }));
  return matCache.get(key);
}
const SEG = 24; // radial segments: smooth limbs
const capsule = (r, len, m, seg = SEG) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), m);
const sphere = (r, m, w = 28, h = 18) => new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m);
const acc = (m) => { m.userData.acc = true; return m; }; // an accessory: kept as its own mesh on a bone

export const LOOKS = {
  player: { skin: '#d9a57c', hair: '#2c1a0f', shirt: '#2d8c7a', pants: '#5a4a3a', hat: 'cap', hatCol: '#c9473a', pack: true },
  amara: { skin: '#5c3a24', hair: '#1a1a1a', shirt: '#e8b04a', pants: '#3a3f4a', hat: 'none', female: true, glasses: true },
  kai: { skin: '#b7784f', hair: '#1a120c', shirt: '#2f6fd1', pants: '#d8d2c0', hat: 'none', shorts: true },
  tomas: { skin: '#e8c2a0', hair: '#7a4a24', shirt: '#f2f2ee', pants: '#1f2a44', hat: 'none', hurt: true },
  lena: { skin: '#f1c7a5', hair: '#b5782f', shirt: '#4a6b3a', pants: '#4a4a3a', hat: 'ranger', hatCol: '#6b5a3a', female: true },
  pete: { skin: '#c68863', hair: '#9a9a9a', shirt: '#8a3a2a', pants: '#3a3a3a', hat: 'bandana', hatCol: '#1f3a93', beard: true },
};

// A hand: palm, four jointed fingers and a thumb, merged into one geometry. Origin at the wrist, fingers down (-Y).
const handCache = new Map();
function handGeometry(side) {
  if (handCache.has(side)) return handCache.get(side);
  const parts = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const add = (g, pos, rot, scale = [1, 1, 1]) => { e.set(...rot); q.setFromEuler(e); m.compose(v.set(...pos), q, sc.set(...scale)); g.applyMatrix4(m); parts.push(g); };
  const inward = -side;
  add(new THREE.CapsuleGeometry(0.028, 0.045, 4, 12), [0, -0.045, 0.002], [0, 0, 0], [0.7, 1, 1.4]);
  add(new THREE.CapsuleGeometry(0.013, 0.055, 3, 10), [0.003 * inward, -0.08, 0.002], [Math.PI / 2, 0, 0]);
  const fz = [0.025, 0.008, -0.009, -0.025], fl = [0.026, 0.03, 0.028, 0.021];
  fz.forEach((z, i) => {
    const r = i === 3 ? 0.008 : 0.0092, c1 = 0.3 + i * 0.05, c2 = 0.6 + i * 0.08, l1 = fl[i];
    add(new THREE.CapsuleGeometry(r, l1, 3, 10), [0.002 * inward + Math.sin(c1) * l1 / 2 * inward, -0.088 - Math.cos(c1) * l1 / 2, z], [0, 0, c1 * inward]);
    const jx = 0.002 * inward + Math.sin(c1) * l1 * inward, jy = -0.088 - Math.cos(c1) * l1, l2 = l1 * 0.85, a = c1 + c2;
    add(new THREE.CapsuleGeometry(r * 0.92, l2, 3, 10), [jx + Math.sin(a) * l2 / 2 * inward, jy - Math.cos(a) * l2 / 2, z], [0, 0, a * inward]);
  });
  add(new THREE.CapsuleGeometry(0.012, 0.028, 3, 10), [0.011 * inward, -0.044, 0.034], [-0.75, 0, 0.35 * inward]);
  add(new THREE.CapsuleGeometry(0.0105, 0.022, 3, 10), [0.019 * inward, -0.07, 0.051], [-0.35, 0, 0.55 * inward]);
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  handCache.set(side, g);
  return g;
}

export function buildSurvivor(o = {}) {
  const skin = mat(o.skin || '#d9a57c', 0.62), hairM = mat(o.hair || '#2c1a0f', 0.9);
  const shirt = mat(o.shirt || '#2d8c7a', 0.82), pants = mat(o.pants || '#5a4a3a', 0.86), shoe = mat('#2a2420', 0.6), sole = mat('#d8d2c4', 0.8);
  const female = !!o.female;
  const root = new THREE.Group(); root.rotation.order = 'YXZ'; // yaw first, then the lean into a slope
  const hips = new THREE.Bone(); hips.position.y = 0.92; root.add(hips);
  const pelvis = sphere(0.205, pants); pelvis.scale.set(female ? 1.3 : 1.22, 0.74, 0.92); hips.add(pelvis);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.022, 10, 36), mat('#3a2a1a', 0.7)); belt.rotation.x = Math.PI / 2; belt.position.y = 0.1; belt.scale.set(1.08, 0.9, 1); hips.add(belt);
  const spine = new THREE.Bone(); spine.position.y = 0.07; hips.add(spine);
  // torso: waist, ribcage and chest, with a shirt hem and collar
  const waist = capsule(0.215, 0.2, shirt); waist.position.y = 0.17; waist.scale.set(female ? 0.9 : 1.0, 1, 0.72); spine.add(waist);
  const chest = capsule(0.25, 0.26, shirt); chest.position.y = 0.36; chest.scale.set(female ? 0.98 : 1.1, 1, 0.76); spine.add(chest);
  if (female) { for (const s of [-1, 1]) { const b = sphere(0.085, shirt, 20, 14); b.position.set(s * 0.1, 0.4, 0.14); b.scale.set(1, 0.9, 0.8); spine.add(b); } }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.022, 10, 28), shirt); collar.rotation.x = Math.PI / 2; collar.position.y = 0.6; collar.scale.set(1.15, 1, 1); spine.add(collar);
  for (const s of [-1, 1]) { const yoke = capsule(0.095, 0.16, shirt); yoke.rotation.z = s * (Math.PI / 2 - 0.3); yoke.position.set(s * 0.17, 0.53, 0); yoke.scale.set(1, 1, 0.8); spine.add(yoke); }
  if (o.pack) {
    const pk = acc(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.2), mat('#6b4a2a', 0.9))); pk.position.set(0, 0.3, -0.26); spine.add(pk);
    const roll = acc(capsule(0.07, 0.3, mat('#9a7a4a', 0.9), 14)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.54, -0.3); spine.add(roll);
    for (const s of [-1, 1]) { const strap = acc(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.03), mat('#4a3420', 0.9))); strap.position.set(s * 0.12, 0.42, 0.17); strap.rotation.x = -0.2; spine.add(strap); }
  }
  // neck and head
  const neck = new THREE.Bone(); neck.position.y = 0.6; spine.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.075, 0.13, SEG), skin); neckM.position.y = 0.035; neck.add(neckM);
  const head = new THREE.Bone(); head.position.y = 0.1; neck.add(head);
  const hr = 0.12;
  const skull = sphere(hr, skin, 36, 24); skull.scale.set(0.94, 1.12, 1.0); skull.position.y = 0.1; head.add(skull);
  const jaw = sphere(hr * 0.74, skin, 28, 16); jaw.position.set(0, 0.035, 0.025); jaw.scale.set(1.05, 0.72, 1); head.add(jaw);
  const cheeks = sphere(hr * 0.9, skin, 28, 16); cheeks.position.set(0, 0.07, 0.015); cheeks.scale.set(1.0, 0.7, 0.95); head.add(cheeks);
  const nose = sphere(0.02, skin, 14, 10); nose.position.set(0, 0.078, hr * 1.0); nose.scale.set(0.85, 1.15, 1.25); head.add(nose);
  const bridge = capsule(0.011, 0.035, skin, 10); bridge.position.set(0, 0.1, hr * 0.98); bridge.rotation.x = 0.35; head.add(bridge);
  const white = mat('#f4f0ea', 0.3), iris = mat(o.eyes || '#3a2a1a', 0.2);
  for (const s of [-1, 1]) {
    const ear = sphere(0.027, skin, 14, 10); ear.position.set(s * hr * 0.95, 0.1, 0); ear.scale.set(0.45, 1, 0.8); head.add(ear);
    const eb = sphere(0.021, white, 14, 10); eb.position.set(s * 0.042, 0.113, hr * 0.86); eb.scale.set(1, 0.8, 0.7); head.add(eb);
    const ir = sphere(0.0105, iris, 12, 8); ir.position.set(s * 0.042, 0.113, hr * 0.86 + 0.013); ir.scale.set(1, 1, 0.45); head.add(ir);
    const pu = sphere(0.005, mat('#0b0b0b', 0.1), 8, 6); pu.position.set(s * 0.042, 0.113, hr * 0.86 + 0.0175); pu.scale.set(1, 1, 0.4); head.add(pu);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.023, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), skin); lid.position.set(s * 0.042, 0.115, hr * 0.86); lid.scale.set(1, 0.8, 0.75); head.add(lid);
    const brow = capsule(0.006, 0.036, hairM, 8); brow.rotation.z = Math.PI / 2 + s * 0.15; brow.position.set(s * 0.045, 0.148, hr * 0.95); head.add(brow);
  }
  const lip = capsule(0.0065, 0.03, mat('#8a4a44', 0.5), 8); lip.rotation.z = Math.PI / 2; lip.position.set(0, 0.04, hr * 0.92); lip.scale.set(1, 1, 0.6); head.add(lip);
  if (o.beard) { const b = sphere(hr * 0.82, hairM, 24, 14); b.position.set(0, 0.015, 0.03); b.scale.set(1.05, 0.9, 1); head.add(b); }
  if (o.glasses) { for (const s of [-1, 1]) { const rim = acc(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 20), mat('#222', 0.3))); rim.position.set(s * 0.045, 0.113, hr * 1.08); head.add(rim); const arm = acc(new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, hr * 1.0), mat('#222', 0.3))); arm.position.set(s * hr * 0.97, 0.115, hr * 0.56); head.add(arm); } const br = acc(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.005), mat('#222', 0.3))); br.position.set(0, 0.115, hr * 1.08); head.add(br); }
  // hair and hats
  const theta = (female ? 0.6 : 0.46) * Math.PI;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.06, 32, 16, 0, Math.PI * 2, 0, theta), hairM); hair.scale.set(0.97, 1.12, 1.04); hair.position.y = 0.1; hair.rotation.x = -0.25; head.add(hair);
  if (female) { const tail = capsule(0.045, 0.2, hairM, 14); tail.position.set(0, -0.01, -0.12); tail.rotation.x = 0.3; head.add(tail); const band = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 16), mat('#c9473a', 0.6)); band.position.set(0, 0.09, -0.11); band.rotation.x = 0.3; head.add(band); }
  if (o.hat === 'cap') {
    const hc = mat(o.hatCol || '#c9473a', 0.7);
    const cap = acc(new THREE.Mesh(new THREE.SphereGeometry(hr * 1.1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), hc)); cap.scale.set(0.98, 0.9, 1.02); cap.position.y = 0.115; head.add(cap);
    const peak = acc(new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.15, hr * 1.15, 0.012, 24, 1, false, -Math.PI / 2, Math.PI), hc)); peak.position.set(0, 0.14, 0.03); head.add(peak);
    const button = acc(sphere(0.012, hc, 8, 6)); button.position.y = 0.235; head.add(button);
  } else if (o.hat === 'ranger') {
    const hc = mat(o.hatCol || '#6b5a3a', 0.8);
    const brim = acc(new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.8, hr * 1.8, 0.012, 28), hc)); brim.position.y = 0.17; head.add(brim);
    const crown = acc(new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.9, hr * 1.05, 0.11, 24), hc)); crown.position.y = 0.225; head.add(crown);
    const hband = acc(new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.06, hr * 1.06, 0.025, 24, 1, true), mat('#2a1a0a', 0.7))); hband.position.y = 0.185; head.add(hband);
  } else if (o.hat === 'bandana') {
    const band = acc(new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.07, hr * 1.06, 0.06, 28, 1, true), mat(o.hatCol || '#1f3a93', 0.7, { side: THREE.DoubleSide }))); band.position.y = 0.15; head.add(band);
    const top = acc(new THREE.Mesh(new THREE.SphereGeometry(hr * 1.07, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.3), mat(o.hatCol || '#1f3a93', 0.7))); top.position.y = 0.12; head.add(top);
    const knot = acc(capsule(0.012, 0.06, mat(o.hatCol || '#1f3a93', 0.7), 8)); knot.position.set(0.03, 0.12, -hr * 1.05); knot.rotation.set(0.6, 0, 0.8); head.add(knot);
  }
  // arms: shoulder ball, upper arm, elbow, forearm tapering to the wrist, and a proper hand
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Bone(); sh.position.set(s * 0.3, 0.52, 0); spine.add(sh);
    const ball = sphere(0.088, shirt, 24, 16); ball.scale.set(1.05, 0.95, 0.95); sh.add(ball);
    const sleeve = capsule(0.08, 0.06, shirt); sleeve.position.y = -0.07; sh.add(sleeve);
    const up = capsule(0.066, 0.18, skin); up.position.y = -0.18; up.scale.set(1, 1, 0.95); sh.add(up);
    const el = new THREE.Bone(); el.position.y = -0.31; sh.add(el);
    const elbow = sphere(0.058, skin, 20, 14); el.add(elbow);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.062, 0.24, SEG), skin); fore.position.y = -0.14; el.add(fore);
    const wrist = sphere(0.04, skin, 16, 10); wrist.position.y = -0.265; wrist.scale.set(1, 0.8, 0.8); el.add(wrist);
    const hand = new THREE.Mesh(handGeometry(s), skin); hand.position.y = -0.27; hand.scale.setScalar(1.15); el.add(hand);
    const grip = new THREE.Group(); grip.position.set(0, -0.36, 0.03); el.add(grip);
    arms.push({ sh, el, grip, side: s });
  }
  // legs: thigh, knee cap, calf tapering to the ankle, shoe with a sole
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Bone(); hip.position.set(s * 0.125, -0.03, 0); hips.add(hip);
    const thigh = capsule(0.1, 0.26, pants); thigh.position.y = -0.2; thigh.scale.set(1, 1, 1.02); hip.add(thigh);
    if (o.shorts) { const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.05, SEG), pants); cuff.position.y = -0.34; hip.add(cuff); }
    const knee = new THREE.Bone(); knee.position.y = -0.42; hip.add(knee);
    const kneecap = sphere(0.075, o.shorts ? skin : pants, 20, 14); kneecap.scale.set(1, 0.9, 1); knee.add(kneecap);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.078, 0.3, SEG), o.shorts ? skin : pants); calf.position.y = -0.17; knee.add(calf);
    const ankle = sphere(0.048, o.shorts ? skin : pants, 16, 10); ankle.position.y = -0.33; knee.add(ankle);
    const foot = capsule(0.055, 0.12, shoe, 16); foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.42, 0.055); foot.scale.set(1.15, 1, 0.75); knee.add(foot);
    const heel = sphere(0.05, shoe, 14, 10); heel.position.set(0, -0.415, -0.02); heel.scale.set(1.05, 0.9, 0.9); knee.add(heel);
    const soleM = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.26), sole); soleM.position.set(0, -0.455, 0.04); knee.add(soleM);
    legs.push({ hip, knee, side: s });
  }
  if (o.hurt) { const bandage = acc(new THREE.Mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.14, 20), mat('#eee', 0.9))); bandage.position.y = -0.22; legs[0].hip.add(bandage); }

  const body = skinBody(root, { hips, spine, neck, head, arms, legs });
  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  if (o.scale) root.scale.setScalar(o.scale);
  return { root, hips, spine, neck, head, arms, legs, body, t: Math.random() * 10, phase: Math.random() * 6, chopT: 0, waveT: 0, lookT: 0, lookY: 0, shift: 0 };
}

// Merge every body part into one SkinnedMesh. Each vertex is weighted to its own bone, blending with the
// parent bone (and the child bone) over a short distance either side of each joint, so shoulders, elbows,
// hips, knees and the neck bend as one continuous body instead of separate tubes.
function skinBody(root, R) {
  const { hips, spine, neck, head, arms, legs } = R;
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const info = new Map();
  info.set(hips, { axis: UP, len: 0, parent: null, child: null });
  info.set(spine, { axis: UP, len: 0.6, parent: hips, pb: 0.12, child: null });
  info.set(neck, { axis: UP, len: 0.1, parent: spine, pb: 0.05, child: head, cb: 0.05 });
  info.set(head, { axis: UP, len: 0, parent: null, child: null });
  for (const a of arms) { info.set(a.sh, { axis: DOWN, len: 0.31, parent: spine, pb: 0.1, child: a.el, cb: 0.07 }); info.set(a.el, { axis: DOWN, len: 0.4, parent: a.sh, pb: 0.07, child: null }); }
  for (const l of legs) { info.set(l.hip, { axis: DOWN, len: 0.42, parent: hips, pb: 0.1, child: l.knee, cb: 0.08 }); info.set(l.knee, { axis: DOWN, len: 0.5, parent: l.hip, pb: 0.08, child: null }); }
  const bones = [...info.keys()], index = new Map(bones.map((b, i) => [b, i]));
  root.updateMatrixWorld(true);
  const origin = new Map(bones.map((b) => [b, b.getWorldPosition(new THREE.Vector3())]));
  const parts = [];
  root.traverse((m) => { if (m.isMesh && !m.userData.acc && m.parent && info.has(m.parent) && m.material.side !== THREE.DoubleSide) parts.push(m); });
  const byMat = new Map(), v = new THREE.Vector3(), d = new THREE.Vector3();
  for (const m of parts) {
    const bone = m.parent, I = info.get(bone);
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(m.matrixWorld);
    const n = g.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), o = origin.get(bone);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(g.attributes.position, i);
      const along = d.subVectors(v, o).dot(I.axis);
      let wp = 0, wc = 0;
      if (I.parent) wp = THREE.MathUtils.clamp(0.5 - along / (2 * I.pb), 0, 1);
      if (I.child) wc = THREE.MathUtils.clamp(0.5 + (along - I.len) / (2 * I.cb), 0, 1);
      if (wp + wc > 1) { const k = 1 / (wp + wc); wp *= k; wc *= k; }
      si[i * 4] = index.get(bone); sw[i * 4] = 1 - wp - wc;
      si[i * 4 + 1] = I.parent ? index.get(I.parent) : 0; sw[i * 4 + 1] = wp;
      si[i * 4 + 2] = I.child ? index.get(I.child) : 0; sw[i * 4 + 2] = wc;
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(g);
    m.parent.remove(m);
  }
  const mats = [...byMat.keys()];
  const geo = mergeGeometries(mats.map((k) => mergeGeometries(byMat.get(k))), true);
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 0.7;
  const mesh = new THREE.SkinnedMesh(geo, mats);
  root.add(mesh); root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true;
  return mesh;
}

// a hand axe for chopping palms
export function buildAxe() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.55, 10), mat('#7a5a34', 0.9)); handle.position.y = 0.2; g.add(handle);
  const headM = mat('#6f7378', 0.4, { metalness: 0.6 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.2), headM); blade.position.set(0, 0.45, 0.07); g.add(blade);
  const lash = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), mat('#3f6a2a', 0.9)); lash.position.y = 0.4; lash.rotation.x = Math.PI / 2; g.add(lash);
  g.rotation.x = Math.PI / 2;
  return g;
}

const lerp = (a, b, t) => a + (b - a) * t;
const S = Math.sin, C = Math.cos;

// pose the rig. st: { speed, mode, air, carry, talk, hurt }
export function animateSurvivor(h, dt, st) {
  h.t += dt;
  const speed = st.speed || 0, [la, ra] = h.arms, [ll, rl] = h.legs, t = h.t;
  let hipY = 0.92, lean = 0;
  for (const a of h.arms) { a.sh.rotation.set(0, 0, a.side * 0.1); a.el.rotation.set(0, 0, 0); }
  for (const l of h.legs) { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
  h.spine.rotation.set(0, 0, 0); h.neck.rotation.set(0, 0, 0); h.head.rotation.set(0, 0, 0); h.hips.rotation.set(0, 0, 0); h.hips.position.x = 0; h.hips.position.z = 0;
  if (st.mode === 'dead') {
    for (const a of h.arms) { a.sh.rotation.z = a.side * 1.3; a.el.rotation.x = -0.3; }
    for (const l of h.legs) { l.hip.rotation.z = l.side * 0.2; l.knee.rotation.x = 0.2; }
    h.hips.rotation.x = -Math.PI / 2; hipY = 0.25; h.head.rotation.y = 0.6;
  } else if (st.mode === 'swim') {
    // front crawl: prone, rolling with each stroke, arms pulling under and recovering over the top, legs fluttering
    const p = h.phase += dt * (3.6 + speed * 1.4);
    const roll = S(p) * 0.3;
    h.hips.rotation.set(Math.PI / 2 - 0.22 + S(p * 2) * 0.03, roll, 0);
    hipY = 0.35 + S(p * 2) * 0.03;
    for (const a of h.arms) {
      const ph = p + (a.side > 0 ? 0 : Math.PI);
      const rec = Math.max(0, S(ph)); // recovery half: elbow high, out of the water
      a.sh.rotation.x = -Math.PI / 2 - C(ph) * (Math.PI / 2 + 0.2);
      a.sh.rotation.z = a.side * (0.15 + rec * 0.85);
      a.sh.rotation.y = a.side * rec * 0.4;
      a.el.rotation.x = -rec * 1.5 - Math.max(0, -S(ph)) * 0.45; // bent on recovery, a slight bend on the pull
    }
    const k = p * 2.6;
    ll.hip.rotation.x = S(k) * 0.32 - 0.05; rl.hip.rotation.x = -S(k) * 0.32 - 0.05;
    ll.knee.rotation.x = Math.max(0, -S(k - 0.8)) * 0.6 + 0.08; rl.knee.rotation.x = Math.max(0, S(k - 0.8)) * 0.6 + 0.08;
    h.spine.rotation.x = -0.1 + S(p * 2) * 0.04; h.spine.rotation.y = -roll * 0.5;
    // head down, turning to breathe on the roll
    h.neck.rotation.x = -0.75; h.head.rotation.x = -0.25; h.head.rotation.y = Math.max(0, S(p + 0.6)) * 0.9;
  } else if (st.mode === 'drive') {
    // behind the wheel: legs out to the pedals, both hands on the wheel, turning it with the steering
    hipY = 0.5; const steer = st.steer || 0;
    for (const l of h.legs) { l.hip.rotation.x = -1.25; l.hip.rotation.z = l.side * 0.1; l.knee.rotation.x = 1.0; }
    for (const a of h.arms) { a.sh.rotation.x = -1.1 - a.side * steer * 0.35; a.sh.rotation.z = a.side * 0.18; a.el.rotation.x = -0.55 + Math.abs(steer) * 0.2; }
    h.spine.rotation.x = 0.1 + S(t * 1.6) * 0.012; h.spine.rotation.z = -steer * 0.1; h.head.rotation.y = -steer * 0.3 + S(t * 0.5) * 0.08;
  } else if (st.mode === 'sit') {
    hipY = 0.5; for (const l of h.legs) { l.hip.rotation.x = -1.5; l.hip.rotation.z = l.side * 0.12; l.knee.rotation.x = 1.6; }
    for (const a of h.arms) { a.sh.rotation.x = -0.6 + S(t * 1.1 + a.side) * 0.03; a.sh.rotation.z = a.side * 0.2; a.el.rotation.x = -1.05; }
    h.spine.rotation.x = 0.14 + S(t * 1.6) * 0.012; h.head.rotation.x = -0.05 + S(t * 0.8) * 0.04; h.head.rotation.y = S(t * 0.37) * 0.3;
    if (st.talk) { ra.sh.rotation.x = -0.9 + S(t * 5) * 0.25; ra.el.rotation.x = -1.3; h.head.rotation.x = S(t * 3) * 0.06; }
  } else if (st.mode === 'lie') {
    hipY = 0.3; h.hips.rotation.x = -Math.PI / 2 + 0.3; h.spine.rotation.x = -0.5;
    ll.hip.rotation.x = -0.6; ll.knee.rotation.x = 1.1; for (const a of h.arms) { a.sh.rotation.x = 0.3; a.sh.rotation.z = a.side * 0.4; a.el.rotation.x = -0.2; }
    h.head.rotation.x = -0.2; h.spine.rotation.x += S(t * 2.2) * 0.02; // laboured breathing
    if (st.talk) { ra.sh.rotation.x = -0.6; ra.el.rotation.x = -1.4 + S(t * 4) * 0.2; }
  } else if (st.air) {
    for (const a of h.arms) { a.sh.rotation.x = -0.7; a.sh.rotation.z = a.side * 0.8; a.el.rotation.x = -0.6; }
    ll.hip.rotation.x = -0.7; ll.knee.rotation.x = 1.1; rl.hip.rotation.x = 0.15; rl.knee.rotation.x = 0.5;
    h.spine.rotation.x = 0.1;
  } else if (speed > 0.15) {
    const run = Math.min(1, Math.max(0, (speed - 2.4) / 3.0));
    const amp = 0.5 + run * 0.48;
    // the phase advances so that each step covers the stride the legs are actually making (leg ~0.9 m)
    const stride = 2 * S(amp) * 0.9 * (1 + run * 0.25);
    const p = h.phase += dt * Math.PI * speed / stride;
    const s = S(p), c = C(p);
    // legs: hips swing, knees bend most as the leg swings through, heel lifts behind
    ll.hip.rotation.x = s * amp; rl.hip.rotation.x = -s * amp;
    ll.knee.rotation.x = 0.1 + Math.max(0, S(p - 1.1)) * (0.75 + run * 1.1) + Math.max(0, -s) * 0.15 * run;
    rl.knee.rotation.x = 0.1 + Math.max(0, S(p + Math.PI - 1.1)) * (0.75 + run * 1.1) + Math.max(0, s) * 0.15 * run;
    ll.hip.rotation.z = 0.04; rl.hip.rotation.z = -0.04;
    // arms: opposite swing, elbows bend more as the arm comes forward, and tuck in when running
    la.sh.rotation.x = -s * amp * (0.7 + run * 0.3); ra.sh.rotation.x = s * amp * (0.7 + run * 0.3);
    la.el.rotation.x = -(0.3 + run * 1.1) - Math.max(0, -s) * 0.45; ra.el.rotation.x = -(0.3 + run * 1.1) - Math.max(0, s) * 0.45;
    la.sh.rotation.z = -0.12 - run * 0.08; ra.sh.rotation.z = 0.12 + run * 0.08;
    // pelvis and shoulders counter-rotate, the body bobs twice a stride and sways side to side
    h.hips.rotation.y = s * (0.08 + run * 0.07); h.hips.rotation.z = -s * 0.05; h.hips.position.x = s * 0.012;
    h.spine.rotation.y = -s * (0.11 + run * 0.08); h.spine.rotation.z = s * 0.03;
    hipY = 0.92 - run * 0.06 + Math.abs(c) * (0.028 + run * 0.045) + (run > 0.5 ? Math.abs(s) * 0.02 : 0);
    lean = 0.06 + run * 0.24;
    h.head.rotation.y = s * 0.04; h.head.rotation.x = -lean * 0.6 + Math.abs(c) * 0.03; // eyes stay level
    if (st.hurt) { // a limp: the left leg stays stiff and the body dips onto it
      ll.knee.rotation.x *= 0.35; h.hips.rotation.z += Math.max(0, s) * 0.12; hipY -= Math.max(0, s) * 0.04; lean += 0.12; la.sh.rotation.x -= 0.25;
    }
  } else {
    // idle: breathing, a slow shift of weight from foot to foot, and a look around now and then
    const br = S(t * 1.7);
    h.shift = lerp(h.shift, S(t * 0.45), dt * 2);
    h.spine.rotation.x = br * 0.015; h.spine.rotation.z = h.shift * 0.02;
    h.hips.rotation.z = -h.shift * 0.04; h.hips.position.x = h.shift * 0.025; hipY = 0.92 - Math.abs(h.shift) * 0.006;
    ll.hip.rotation.z = 0.05 + h.shift * 0.03; rl.hip.rotation.z = -0.05 + h.shift * 0.03;
    ll.knee.rotation.x = 0.06 + Math.max(0, -h.shift) * 0.1; rl.knee.rotation.x = 0.06 + Math.max(0, h.shift) * 0.1;
    for (const a of h.arms) { a.sh.rotation.x = br * 0.02; a.sh.rotation.z = a.side * (0.14 + br * 0.01); a.el.rotation.x = -0.18; }
    h.lookT -= dt; if (h.lookT <= 0) { h.lookT = 2 + Math.random() * 4; h.lookY = (Math.random() - 0.5) * 1.2; }
    h.head.rotation.y = lerp(h.head.rotation.y, h.lookY, Math.min(1, dt * 3)) + S(t * 0.9) * 0.02; h.head.rotation.x = S(t * 0.7) * 0.03;
    if (st.talk) { ra.sh.rotation.x = -0.7 + S(t * 5) * 0.25; ra.sh.rotation.z = 0.35; ra.el.rotation.x = -1.3 + S(t * 7) * 0.15; la.el.rotation.x = -0.6; h.head.rotation.x = S(t * 3) * 0.06; h.head.rotation.y *= 0.3; }
    if (st.hurt) { h.spine.rotation.x += 0.2; ra.sh.rotation.x = -0.4; ra.el.rotation.x = -1.2; ra.sh.rotation.z = 0.3; }
  }
  if (st.carry && st.mode !== 'swim') { for (const a of h.arms) { a.sh.rotation.x = -1.0; a.el.rotation.x = -0.9; a.sh.rotation.z = a.side * 0.15; } }
  // chopping overlay: a big two-handed swing with a wind-up, a strike and a recoil
  if (h.chopT > 0) {
    h.chopT -= dt;
    const k = 1 - Math.max(0, h.chopT) / 0.7;
    const swing = k < 0.4 ? -2.5 * S((k / 0.4) * Math.PI / 2) : -2.5 + 3.0 * S(((k - 0.4) / 0.6) * Math.PI / 2);
    ra.sh.rotation.x = swing; ra.sh.rotation.z = -0.15; ra.el.rotation.x = -0.4 + (k < 0.4 ? -0.6 * (k / 0.4) : -0.6 + 0.6 * ((k - 0.4) / 0.6));
    la.sh.rotation.x = swing * 0.9; la.sh.rotation.z = 0.35; la.el.rotation.x = -0.5;
    h.spine.rotation.x += k < 0.4 ? -0.22 * (k / 0.4) : -0.22 + 0.55 * ((k - 0.4) / 0.6);
    h.spine.rotation.y += k < 0.4 ? 0.2 * (k / 0.4) : 0.2 - 0.35 * ((k - 0.4) / 0.6);
  }
  // carrying a torch: forearm raised in front, the flame held up and out
  if (st.torch && (st.mode === 'move' || !st.mode)) { la.sh.rotation.x = -0.45 + (speed > 0.15 ? S(h.phase) * 0.12 : S(t * 1.3) * 0.03); la.sh.rotation.z = la.side * 0.18; la.el.rotation.x = -1.25; la.el.rotation.z = 0; }
  if (h.waveT > 0) { h.waveT -= dt; ra.sh.rotation.x = -2.9; ra.sh.rotation.z = -0.4 + S(t * 9) * 0.35; ra.el.rotation.x = -0.4; }
  h.spine.rotation.x += lean;
  h.hips.position.y = hipY;
  // stand on the slope rather than hover over it: tilt a little with the ground (st.tilt = [pitch, roll])
  const tp = st.tilt && st.mode !== 'swim' ? st.tilt[0] : 0, tr = st.tilt && st.mode !== 'swim' ? st.tilt[1] : 0;
  h.root.rotation.x = lerp(h.root.rotation.x, tp, Math.min(1, dt * 6)); h.root.rotation.z = lerp(h.root.rotation.z, tr, Math.min(1, dt * 6));
}

// how much a character standing at (x, z) and facing yaw should tilt with the ground
export function groundTilt(normal, yaw, k = 0.55) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
  const nf = normal.x * fx + normal.z * fz, nr = normal.x * rx + normal.z * rz;
  const clamp = (v) => Math.max(-0.32, Math.min(0.32, v));
  return [clamp(Math.asin(Math.max(-1, Math.min(1, nf))) * k), clamp(-Math.asin(Math.max(-1, Math.min(1, nr))) * k)];
}
