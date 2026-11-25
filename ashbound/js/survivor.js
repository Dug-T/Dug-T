// Jointed survivor characters (the player and the other castaways), built from capsules and posed in code.
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, rough = 0.7, extra = {}) {
  const key = color + '|' + rough + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }));
  return matCache.get(key);
}
const capsule = (r, len, m, seg = 14) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, seg), m);
const sphere = (r, m, w = 18, h = 12) => new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m);

export const LOOKS = {
  player: { skin: '#d9a57c', hair: '#2c1a0f', shirt: '#2d8c7a', pants: '#5a4a3a', hat: 'cap', hatCol: '#c9473a', pack: true },
  amara: { skin: '#5c3a24', hair: '#1a1a1a', shirt: '#e8b04a', pants: '#3a3f4a', hat: 'none', female: true, glasses: true },
  kai: { skin: '#b7784f', hair: '#1a120c', shirt: '#2f6fd1', pants: '#d8d2c0', hat: 'none', shorts: true },
  tomas: { skin: '#e8c2a0', hair: '#7a4a24', shirt: '#f2f2ee', pants: '#1f2a44', hat: 'none', hurt: true },
  lena: { skin: '#f1c7a5', hair: '#b5782f', shirt: '#4a6b3a', pants: '#4a4a3a', hat: 'ranger', hatCol: '#6b5a3a', female: true },
  pete: { skin: '#c68863', hair: '#9a9a9a', shirt: '#8a3a2a', pants: '#3a3a3a', hat: 'bandana', hatCol: '#1f3a93', beard: true },
};

export function buildSurvivor(o = {}) {
  const skin = mat(o.skin || '#d9a57c', 0.6), hairM = mat(o.hair || '#2c1a0f', 0.9);
  const shirt = mat(o.shirt || '#2d8c7a', 0.8), pants = mat(o.pants || '#5a4a3a', 0.85), shoe = mat('#2a2420', 0.6);
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.92; root.add(hips);
  const pelvis = sphere(0.21, pants); pelvis.scale.set(1.25, 0.72, 0.9); hips.add(pelvis);
  const spine = new THREE.Group(); spine.position.y = 0.07; hips.add(spine);
  const torso = capsule(0.25, 0.34, shirt, 16); torso.position.y = 0.3; torso.scale.set(o.female ? 0.95 : 1.06, 1, 0.74); spine.add(torso);
  for (const s of [-1, 1]) { const y = capsule(0.09, 0.17, shirt, 10); y.rotation.z = s * (Math.PI / 2 - 0.3); y.position.set(s * 0.17, 0.52, 0); y.scale.set(1, 1, 0.8); spine.add(y); }
  if (o.pack) { const pk = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.2), mat('#6b4a2a', 0.9)); pk.position.set(0, 0.3, -0.26); spine.add(pk); const roll = capsule(0.07, 0.3, mat('#9a7a4a', 0.9), 10); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.54, -0.3); spine.add(roll); }
  // neck and head
  const neck = new THREE.Group(); neck.position.y = 0.6; spine.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.12, 12), skin); neckM.position.y = 0.03; neck.add(neckM);
  const head = new THREE.Group(); head.position.y = 0.1; neck.add(head);
  const hr = 0.12;
  const skull = sphere(hr, skin, 22, 16); skull.scale.set(0.95, 1.12, 1.0); skull.position.y = 0.1; head.add(skull);
  const jaw = sphere(hr * 0.75, skin); jaw.position.set(0, 0.035, 0.025); jaw.scale.set(1.05, 0.75, 1); head.add(jaw);
  const nose = sphere(0.022, skin, 10, 8); nose.position.set(0, 0.08, hr * 1.0); nose.scale.set(0.9, 1.1, 1.2); head.add(nose);
  for (const s of [-1, 1]) {
    const ear = sphere(0.027, skin, 10, 8); ear.position.set(s * hr * 0.95, 0.1, 0); ear.scale.set(0.5, 1, 0.8); head.add(ear);
    const eye = sphere(0.013, mat('#111', 0.3), 8, 6); eye.position.set(s * 0.042, 0.115, hr * 0.92); head.add(eye);
    const brow = capsule(0.006, 0.035, hairM, 6); brow.rotation.z = Math.PI / 2 + s * 0.15; brow.position.set(s * 0.045, 0.15, hr * 0.96); head.add(brow);
  }
  const lip = capsule(0.006, 0.028, mat('#8a4a44', 0.5), 6); lip.rotation.z = Math.PI / 2; lip.position.set(0, 0.04, hr * 0.92); lip.scale.set(1, 1, 0.6); head.add(lip);
  if (o.beard) { const b = sphere(hr * 0.8, hairM); b.position.set(0, 0.02, 0.03); b.scale.set(1.05, 0.9, 1); head.add(b); }
  if (o.glasses) { for (const s of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 16), mat('#222', 0.3)); rim.position.set(s * 0.045, 0.115, hr * 1.1); head.add(rim); } }
  // hair and hats
  const theta = (o.female ? 0.6 : 0.45) * Math.PI;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.06, 18, 10, 0, Math.PI * 2, 0, theta), hairM); hair.scale.set(0.97, 1.12, 1.04); hair.position.y = 0.1; hair.rotation.x = -0.25; head.add(hair);
  if (o.female) { const tail = capsule(0.05, 0.18, hairM, 10); tail.position.set(0, 0.0, -0.12); tail.rotation.x = 0.3; head.add(tail); }
  if (o.hat === 'cap') {
    const hc = mat(o.hatCol || '#c9473a', 0.7);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), hc); cap.scale.set(0.98, 0.9, 1.02); cap.position.y = 0.115; head.add(cap);
    const peak = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.15, hr * 1.15, 0.012, 18, 1, false, -Math.PI / 2, Math.PI), hc); peak.position.set(0, 0.14, 0.03); head.add(peak);
  } else if (o.hat === 'ranger') {
    const hc = mat(o.hatCol || '#6b5a3a', 0.8);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.8, hr * 1.8, 0.012, 20), hc); brim.position.y = 0.17; head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.9, hr * 1.05, 0.11, 16), hc); crown.position.y = 0.225; head.add(crown);
  } else if (o.hat === 'bandana') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.07, hr * 1.06, 0.06, 20, 1, true), mat(o.hatCol || '#1f3a93', 0.7, { side: THREE.DoubleSide })); band.position.y = 0.15; head.add(band);
    const top = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.07, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.3), mat(o.hatCol || '#1f3a93', 0.7)); top.position.y = 0.12; head.add(top);
  }
  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.31, 0.52, 0); spine.add(sh);
    const ball = sphere(0.085, shirt, 12, 10); sh.add(ball);
    const up = capsule(0.07, 0.19, o.shortSleeves === false ? shirt : skin, 12); up.position.y = -0.17; sh.add(up);
    const sleeve = capsule(0.078, 0.07, shirt, 12); sleeve.position.y = -0.06; sh.add(sleeve);
    const el = new THREE.Group(); el.position.y = -0.31; sh.add(el);
    const fore = capsule(0.06, 0.2, skin, 12); fore.position.y = -0.15; el.add(fore);
    const hand = sphere(0.055, skin, 12, 10); hand.scale.set(0.8, 1.1, 0.6); hand.position.y = -0.3; el.add(hand);
    const grip = new THREE.Group(); grip.position.set(0, -0.32, 0.03); el.add(grip);
    arms.push({ sh, el, grip, side: s });
  }
  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.13, -0.03, 0); hips.add(hip);
    const thigh = capsule(0.1, 0.27, pants, 12); thigh.position.y = -0.2; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
    const shin = capsule(0.08, 0.26, o.shorts ? skin : pants, 12); shin.position.y = -0.18; knee.add(shin);
    const foot = capsule(0.058, 0.13, shoe, 10); foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.43, 0.05); foot.scale.set(1.1, 1, 0.8); knee.add(foot);
    legs.push({ hip, knee, side: s });
  }
  if (o.hurt) { const bandage = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.14, 12), mat('#eee', 0.9)); bandage.position.y = -0.22; legs[0].hip.add(bandage); }
  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  if (o.scale) root.scale.setScalar(o.scale);
  return { root, hips, spine, neck, head, arms, legs, t: Math.random() * 10, phase: Math.random() * 6, chopT: 0, waveT: 0 };
}

// a hand axe for chopping palms
export function buildAxe() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.55, 8), mat('#7a5a34', 0.9)); handle.position.y = 0.2; g.add(handle);
  const headM = mat('#6f7378', 0.4, { metalness: 0.6 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.2), headM); blade.position.set(0, 0.45, 0.07); g.add(blade);
  const lash = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), mat('#3f6a2a', 0.9)); lash.position.y = 0.4; lash.rotation.x = Math.PI / 2; g.add(lash);
  g.rotation.x = Math.PI / 2;
  return g;
}

// pose the rig. st: { speed, mode, air, chop, carry, sit, wave, swim, dead, talk, hurt }
export function animateSurvivor(h, dt, st) {
  h.t += dt;
  const speed = st.speed || 0, [la, ra] = h.arms, [ll, rl] = h.legs;
  let hipY = 0.92, lean = 0;
  for (const a of h.arms) { a.sh.rotation.set(0, 0, a.side * 0.1); a.el.rotation.set(0, 0, 0); }
  for (const l of h.legs) { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
  h.spine.rotation.set(0, 0, 0); h.head.rotation.set(0, 0, 0); h.hips.rotation.set(0, 0, 0);
  if (st.mode === 'dead') {
    for (const a of h.arms) { a.sh.rotation.z = a.side * 1.3; }
    for (const l of h.legs) { l.hip.rotation.z = l.side * 0.2; }
    h.hips.rotation.x = -Math.PI / 2; hipY = 0.25;
  } else if (st.mode === 'swim') {
    h.hips.rotation.x = Math.PI / 2 - 0.25; hipY = 0.35;
    const p = h.t * (4 + speed);
    la.sh.rotation.x = -Math.PI + Math.sin(p) * 1.6; ra.sh.rotation.x = -Math.PI + Math.sin(p + Math.PI) * 1.6;
    la.sh.rotation.z = -0.3; ra.sh.rotation.z = 0.3; la.el.rotation.x = -0.4; ra.el.rotation.x = -0.4;
    ll.hip.rotation.x = Math.sin(p * 2) * 0.35; rl.hip.rotation.x = -Math.sin(p * 2) * 0.35;
    h.head.rotation.x = -0.9;
  } else if (st.mode === 'sit') {
    hipY = 0.5; for (const l of h.legs) { l.hip.rotation.x = -1.5; l.knee.rotation.x = 1.6; }
    for (const a of h.arms) { a.sh.rotation.x = -0.5; a.el.rotation.x = -1.0; }
    h.spine.rotation.x = 0.12; h.head.rotation.x = Math.sin(h.t * 0.8) * 0.05;
  } else if (st.mode === 'lie') {
    hipY = 0.3; h.hips.rotation.x = -Math.PI / 2 + 0.3; h.spine.rotation.x = -0.5;
    ll.hip.rotation.x = -0.6; ll.knee.rotation.x = 1.1; for (const a of h.arms) { a.sh.rotation.x = 0.3; a.sh.rotation.z = a.side * 0.4; }
  } else if (st.air) {
    for (const a of h.arms) { a.sh.rotation.x = -0.5; a.sh.rotation.z = a.side * 0.6; a.el.rotation.x = -0.5; }
    ll.hip.rotation.x = -0.5; ll.knee.rotation.x = 0.9; rl.hip.rotation.x = 0.2; rl.knee.rotation.x = 0.4;
  } else if (speed > 0.15) {
    const run = Math.min(1, Math.max(0, (speed - 2.6) / 3.2));
    h.phase += dt * (3.4 + speed * 1.5);
    const s = Math.sin(h.phase), c = Math.cos(h.phase), amp = 0.45 + run * 0.45;
    ll.hip.rotation.x = s * amp; rl.hip.rotation.x = -s * amp;
    ll.knee.rotation.x = Math.max(0, -c) * (0.5 + run) + 0.05; rl.knee.rotation.x = Math.max(0, c) * (0.5 + run) + 0.05;
    la.sh.rotation.x = -s * amp * 0.8; ra.sh.rotation.x = s * amp * 0.8;
    la.el.rotation.x = -0.3 - run * 0.9; ra.el.rotation.x = -0.3 - run * 0.9;
    hipY = 0.92 - run * 0.05 + Math.abs(c) * (0.03 + run * 0.04);
    lean = 0.05 + run * 0.2 + (st.hurt ? 0.15 : 0);
    h.spine.rotation.y = s * 0.07 * (1 + run);
  } else {
    const b = Math.sin(h.t * 1.7);
    h.spine.rotation.x = b * 0.015 + (st.hurt ? 0.18 : 0);
    h.head.rotation.y = Math.sin(h.t * 0.35) * 0.3;
    if (st.talk) { ra.sh.rotation.x = -0.6 + Math.sin(h.t * 5) * 0.2; ra.el.rotation.x = -1.2; h.head.rotation.x = Math.sin(h.t * 3) * 0.06; }
  }
  if (st.carry && st.mode !== 'swim') { for (const a of h.arms) { a.sh.rotation.x = -1.0; a.el.rotation.x = -0.9; a.sh.rotation.z = a.side * 0.15; } }
  // chopping overlay: a big two-handed swing
  if (h.chopT > 0) {
    h.chopT -= dt;
    const k = 1 - Math.max(0, h.chopT) / 0.7, swing = k < 0.4 ? -2.4 * (k / 0.4) : -2.4 + 2.9 * ((k - 0.4) / 0.6);
    ra.sh.rotation.x = swing; ra.sh.rotation.z = -0.15; ra.el.rotation.x = -0.4;
    la.sh.rotation.x = swing * 0.9; la.sh.rotation.z = 0.35; la.el.rotation.x = -0.5;
    h.spine.rotation.x += k < 0.4 ? -0.2 * (k / 0.4) : -0.2 + 0.5 * ((k - 0.4) / 0.6);
  }
  if (h.waveT > 0) { h.waveT -= dt; ra.sh.rotation.x = -2.9; ra.sh.rotation.z = -0.4 + Math.sin(h.t * 9) * 0.35; ra.el.rotation.x = -0.4; }
  h.spine.rotation.x += lean;
  h.hips.position.y = hipY;
}
