// Jointed, smooth high-poly humans. buildHuman({wally:true}) makes Wally Man himself.
import * as THREE from 'three';
import { emblemTexture } from './textures.js';
import { mergeGeometries } from '../lib/utils/BufferGeometryUtils.js';

// A proper hand (palm, four jointed fingers and a thumb) merged into one mesh.
// Origin at the wrist, fingers pointing down (-Y), thumb forward (+Z), palm facing the body.
const handCache = new Map();
function handGeometry(side, hi) {
  const key = side + (hi ? 'h' : 'l');
  if (handCache.has(key)) return handCache.get(key);
  const parts = [];
  const seg = hi ? 12 : 7;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const add = (g, pos, rot, scale = [1, 1, 1]) => {
    e.set(rot[0], rot[1], rot[2]); q.setFromEuler(e); m.compose(v.set(...pos), q, sc.set(...scale));
    g.applyMatrix4(m); parts.push(g);
  };
  const inward = -side; // palm and finger curl face the body's midline
  // palm: a squashed capsule, wider front-to-back than it is thick
  add(new THREE.CapsuleGeometry(0.03, 0.045, 4, seg), [0, -0.045, 0.003], [0, 0, 0], [0.72, 1, 1.45]);
  // knuckle ridge
  add(new THREE.CapsuleGeometry(0.014, 0.06, 3, seg), [0.004 * inward, -0.082, 0.003], [Math.PI / 2, 0, 0], [1, 1, 1]);
  // fingers: two segments each, index finger at the front by the thumb
  const fz = [0.027, 0.009, -0.009, -0.026], fl = [0.028, 0.031, 0.029, 0.022];
  fz.forEach((z, i) => {
    const r = i === 3 ? 0.0085 : 0.0098;
    const c1 = 0.25 + i * 0.05, c2 = 0.55 + i * 0.08; // a relaxed, slightly curled hand
    const base = [0.002 * inward, -0.09, z];
    const l1 = fl[i];
    // proximal segment
    const p1 = [base[0] + Math.sin(c1) * l1 / 2 * inward, base[1] - Math.cos(c1) * l1 / 2, z];
    add(new THREE.CapsuleGeometry(r, l1, 3, seg), p1, [0, 0, c1 * inward]);
    // distal segment, bent further toward the palm
    const j = [base[0] + Math.sin(c1) * l1 * inward, base[1] - Math.cos(c1) * l1, z];
    const l2 = l1 * 0.85, a = c1 + c2;
    add(new THREE.CapsuleGeometry(r * 0.92, l2, 3, seg), [j[0] + Math.sin(a) * l2 / 2 * inward, j[1] - Math.cos(a) * l2 / 2, z], [0, 0, a * inward]);
  });
  // thumb: from the inner front of the palm, angled forward and down
  add(new THREE.CapsuleGeometry(0.0125, 0.03, 3, seg), [0.012 * inward, -0.045, 0.036], [-0.75, 0, 0.35 * inward]);
  add(new THREE.CapsuleGeometry(0.011, 0.024, 3, seg), [0.02 * inward, -0.072, 0.054], [-0.35, 0, 0.55 * inward]);
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  handCache.set(key, g);
  return g;
}

const matCache = new Map();
function mat(color, rough = 0.6, metal = 0, extra = {}) {
  const key = color + '|' + rough + '|' + metal + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
  return matCache.get(key);
}

let emblemTex = null;

function capsule(r, len, m, seg) {
  const g = new THREE.CapsuleGeometry(r, len, seg ? 4 : 6, seg || 20);
  return new THREE.Mesh(g, m);
}
function sphere(r, m, w = 24, h = 16) { return new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m); }

// Bend a plane around a vertical cylinder so decals hug the torso
function wrapPlane(geo, R) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), a = x / R;
    p.setX(i, Math.sin(a) * R);
    p.setZ(i, Math.cos(a) * R - R);
  }
  geo.computeVertexNormals();
  return geo;
}

const SKINS = ['#f1c7a5', '#e0ac85', '#c68863', '#8d5a3b', '#5c3a24', '#f5d3b8'];
const HAIRS = ['#2b1a10', '#5a3a1c', '#b5782f', '#d9b56a', '#1a1a1a', '#8a8a8a', '#a4401c'];
const SHIRTS = ['#c0392b', '#2471a3', '#27ae60', '#f1c40f', '#8e44ad', '#ecf0f1', '#34495e', '#e67e22', '#16a085', '#d35400', '#7f8c8d', '#1abc9c'];
const PANTS = ['#2c3e50', '#1b2631', '#5d4037', '#424949', '#283593', '#3e2723', '#616161'];

export function randomPedLook(r) {
  const pick = (a) => a[(r() * a.length) | 0];
  return {
    skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), pants: pick(PANTS),
    shoes: pick(['#1a1a1a', '#3b2a1a', '#eeeeee', '#7a1d1d']),
    hairStyle: (r() * 4) | 0, scale: 0.92 + r() * 0.14, female: r() < 0.45, belly: r() < 0.3,
  };
}

export function buildHuman(o = {}) {
  const wally = !!o.wally;
  const cop = !!o.cop;
  const detail = wally ? 1 : 0;
  const seg = wally ? 24 : 12;
  const suit = mat(wally ? '#1f5fc4' : (cop ? '#1c2a4a' : o.shirt || '#888'), wally ? 0.45 : 0.8, 0);
  const legsM = mat(wally ? '#1f5fc4' : (cop ? '#1c2a4a' : o.pants || '#333'), wally ? 0.45 : 0.85);
  const red = mat('#e0471c', 0.5);
  const skin = mat(wally ? '#f0c09a' : o.skin || '#e0ac85', 0.55);
  const hairM = mat(wally ? '#c8763a' : o.hair || '#333', 0.9);
  const shoeM = wally ? red : mat(cop ? '#111' : o.shoes || '#222', 0.5);

  const root = new THREE.Group();
  const hips = new THREE.Bone(); hips.position.y = 0.95; root.add(hips);
  const pelvis = sphere(0.24, legsM, seg, 12); pelvis.scale.set(1.28, 0.75, 0.95); hips.add(pelvis);

  const spine = new THREE.Bone(); spine.position.y = 0.08; hips.add(spine);
  const torso = capsule(0.29, 0.36, suit, seg); torso.position.y = 0.32; torso.scale.set(1.08, 1, 0.78);
  if (o.female && !wally && !cop) torso.scale.set(0.96, 1, 0.74);
  spine.add(torso);
  if (wally || o.belly) {
    const belly = sphere(0.26, suit, seg, 14); belly.position.set(0, 0.12, 0.03); belly.scale.set(1.0, 0.85, 0.85); spine.add(belly);
  }
  if (wally) {
    if (!emblemTex) emblemTex = emblemTexture();
    const eg = wrapPlane(new THREE.PlaneGeometry(0.5, 0.31, 24, 6), 0.26);
    const em = new THREE.Mesh(eg, new THREE.MeshStandardMaterial({ map: emblemTex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
    em.position.set(0, 0.36, 0.245); em.rotation.x = -0.05; em.userData.acc = true; spine.add(em);
    // belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.312, 0.31, 0.09, 40, 1, true), red);
    belt.scale.set(1.0, 1, 0.86); belt.position.y = -0.04; spine.add(belt);
  }
  if (cop) {
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.3, 0.42, 24, 1, true), mat('#d8e03a', 0.6));
    vest.scale.set(1.08, 1, 0.82); vest.position.y = 0.3; spine.add(vest);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 20, 1, true), mat('#111', 0.4));
    belt.scale.set(1, 1, 0.86); belt.position.y = -0.04; spine.add(belt);
  }

  // shoulder yoke: a smooth slope from the neck out into each shoulder, so the arms grow out of the body
  for (const sd of [-1, 1]) {
    const y = capsule(0.105, 0.2, suit, seg); y.rotation.z = sd * (Math.PI / 2 - 0.32); y.position.set(sd * 0.2, 0.555, -0.01); y.scale.set(1, 1, 0.82); spine.add(y);
  }
  // neck + head
  const neck = new THREE.Bone(); neck.position.y = 0.66; spine.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.12, seg), skin); neckM.position.y = 0.03; neck.add(neckM);
  if (wally) { // collar of the suit
    const col = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 10, 28), suit); col.rotation.x = Math.PI / 2; col.position.y = -0.01; neck.add(col);
  }
  const head = new THREE.Bone(); head.position.y = 0.1; neck.add(head);
  const hr = wally ? 0.138 : 0.125;
  const skull = sphere(hr, skin, seg + 8, seg); skull.scale.set(0.95, 1.12, 1.02); skull.position.y = 0.1; head.add(skull);
  // jaw/chin
  const jaw = sphere(hr * 0.78, skin, seg, 12); jaw.position.set(0, 0.035, 0.03); jaw.scale.set(1.05, 0.75, 1); head.add(jaw);
  const nose = sphere(wally ? 0.03 : 0.024, skin, 14, 10); nose.position.set(0, 0.078, hr * 1.02); nose.scale.set(0.9, 1.15, 1.25); head.add(nose);
  for (const s of [-1, 1]) {
    const ear = sphere(0.03, skin, 12, 8); ear.position.set(s * hr * 0.95, 0.1, 0); ear.scale.set(0.5, 1, 0.8); head.add(ear);
  }
  // hair
  const hairStyle = wally ? 0 : (o.hairStyle | 0);
  if (!cop) {
    if (wally) {
      // thinning ginger crop, receding at the front
      const hg = new THREE.SphereGeometry(hr * 1.03, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
      const h = new THREE.Mesh(hg, hairM); h.scale.set(0.95, 1.12, 1.02); h.position.set(0, 0.1, -0.012); h.rotation.x = -0.35; head.add(h);
    } else {
      const theta = [0.45, 0.55, 0.62, 0.3][hairStyle] * Math.PI;
      const hg = new THREE.SphereGeometry(hr * 1.06, 18, 10, 0, Math.PI * 2, 0, theta);
      const h = new THREE.Mesh(hg, hairM); h.scale.set(0.97, 1.12, 1.05); h.position.y = 0.1; h.rotation.x = -0.25; head.add(h);
      if (o.female && hairStyle !== 3) {
        const tail = capsule(0.06, 0.2, hairM, 10); tail.position.set(0, 0.0, -0.12); tail.rotation.x = 0.3; head.add(tail);
      }
    }
  } else {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.05, hr * 1.08, 0.08, 20), mat('#151c30', 0.5));
    cap.position.y = 0.2; head.add(cap);
    const peak = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.1, hr * 1.1, 0.012, 20, 1, false, -Math.PI / 2, Math.PI), mat('#0a0a0a', 0.3));
    peak.position.set(0, 0.165, 0.03); head.add(peak);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.06, hr * 1.06, 0.03, 20, 1, true), mat('#eeeeee', 0.5));
    band.position.y = 0.175; head.add(band);
  }
  let tails = null;
  if (wally) {
    // ginger moustache
    const mo = capsule(0.014, 0.05, hairM, 10); mo.rotation.z = Math.PI / 2; mo.position.set(0, 0.052, hr * 0.97); head.add(mo);
    // blue mask band round the eyes
    const blue = mat('#1f5fc4', 0.55, 0, { side: THREE.DoubleSide });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.02, hr * 1.01, 0.075, 40, 1, true), blue);
    band.scale.set(0.95, 1, 1.04); band.position.y = 0.115; band.userData.acc = true; head.add(band);
    const knot = sphere(0.035, blue, 14, 10); knot.position.set(0, 0.115, -hr * 1.05); knot.userData.acc = true; head.add(knot);
    // flapping ties: two strips whose verts we animate
    tails = [];
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(0.045, 0.3, 1, 8); g.translate(0, -0.15, 0);
      const m = new THREE.Mesh(g, blue); m.userData.acc = true;
      m.position.set(s * 0.02, 0.115, -hr * 1.1);
      m.userData.base = Float32Array.from(g.attributes.position.array); m.userData.side = s;
      head.add(m); tails.push(m);
    }
    // thick black specs
    const frame = mat('#0c0c0c', 0.3, 0.2);
    const lensM = new THREE.MeshStandardMaterial({ color: '#cfe3ff', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.3 });
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 10, 28), frame);
      rim.scale.set(1.15, 0.9, 1); rim.position.set(s * 0.054, 0.115, hr * 1.18); rim.userData.acc = true; head.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.036, 24), lensM);
      lens.scale.set(1.15, 0.9, 1); lens.position.set(s * 0.054, 0.115, hr * 1.18 + 0.002); lens.userData.acc = true; head.add(lens);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, hr * 1.1), frame);
      arm.position.set(s * hr * 0.99, 0.118, hr * 0.58); arm.userData.acc = true; head.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.008), frame); bridge.position.set(0, 0.12, hr * 1.19); bridge.userData.acc = true; head.add(bridge);
    // eyes peeking out through the mask's eye holes, behind the specs
    const white = mat('#f7f4ee', 0.25), iris = mat('#3b6a8c', 0.2), pupil = mat('#0b0b0b', 0.1);
    for (const sd of [-1, 1]) {
      const eb = sphere(0.027, white, 18, 12); eb.position.set(sd * 0.054, 0.114, hr * 0.94); eb.scale.set(1, 0.82, 1); head.add(eb);
      const ir = sphere(0.012, iris, 12, 8); ir.position.set(sd * 0.052, 0.113, hr * 0.94 + 0.022); ir.scale.set(1, 1, 0.45); head.add(ir);
      const pu = sphere(0.0062, pupil, 8, 6); pu.position.set(sd * 0.052, 0.113, hr * 0.94 + 0.0265); pu.scale.set(1, 1, 0.4); head.add(pu);
      // ginger eyebrows above the mask, raised in permanent mild surprise
      const br = capsule(0.0075, 0.042, hairM, 8); br.rotation.z = Math.PI / 2 + sd * 0.18; br.position.set(sd * 0.054, 0.163, hr * 0.98); head.add(br);
    }
    // mouth under the moustache
    const lip = capsule(0.0062, 0.028, mat('#9a4a40', 0.45), 10); lip.rotation.z = Math.PI / 2; lip.position.set(0, 0.032, hr * 0.985); lip.scale.set(1, 0.85, 0.6); head.add(lip);
  } else {
    // simple eyes
    const eyeM = mat('#111', 0.3);
    for (const s of [-1, 1]) { const e = sphere(0.013, eyeM, 8, 6); e.position.set(s * 0.045, 0.115, hr * 0.92); head.add(e); }
    const lip = capsule(0.007, 0.03, mat('#8a4a44', 0.5), 6); lip.rotation.z = Math.PI / 2; lip.position.set(0, 0.04, hr * 0.92); lip.scale.set(1, 1, 0.6); head.add(lip);
  }

  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Bone(); sh.position.set(s * 0.37, 0.56, 0); spine.add(sh);
    const ball = sphere(0.098, suit, seg, 12); ball.scale.set(1.05, 0.95, 0.95); ball.position.set(-s * 0.012, 0.005, 0); sh.add(ball);
    const up = capsule(0.082, 0.2, suit, seg); up.position.y = -0.16; sh.add(up);
    const el = new THREE.Bone(); el.position.y = -0.32; sh.add(el);
    const foreM = wally ? red : (cop ? suit : skin);
    const fore = capsule(wally ? 0.084 : 0.07, 0.18, foreM, seg); fore.position.y = -0.13; el.add(fore);
    if (!wally && !cop && o.shortSleeves !== false) { /* bare forearm */ }
    const hand = new THREE.Mesh(handGeometry(s, wally), skin); hand.position.y = -0.27; hand.scale.setScalar(wally ? 1.3 : 1.1); el.add(hand);
    if (wally) { // the red gauntlet flares at the wrist
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.07, 0.07, seg), red); cuff.position.y = -0.235; el.add(cuff);
    }
    const grip = new THREE.Group(); grip.position.set(0, -0.37, 0.03); el.add(grip);
    arms.push({ sh, el, grip, side: s });
  }
  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Bone(); hip.position.set(s * 0.15, -0.04, 0); hips.add(hip);
    const thigh = capsule(0.11, 0.28, legsM, seg); thigh.position.y = -0.2; hip.add(thigh);
    const knee = new THREE.Bone(); knee.position.y = -0.43; hip.add(knee);
    const shin = capsule(0.088, 0.26, legsM, seg); shin.position.y = -0.18; knee.add(shin);
    if (wally) {
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.098, 0.3, seg), red); boot.position.y = -0.31; knee.add(boot);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, seg), red); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.16; knee.add(cuff);
    }
    const foot = capsule(0.062, 0.14, shoeM, 12); foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.44, 0.05); foot.scale.set(1.1, 1, 0.8); knee.add(foot);
    legs.push({ hip, knee, side: s });
  }

  // the cape
  let cape = null;
  if (wally) {
    const g = new THREE.PlaneGeometry(0.72, 1.15, 10, 16); g.translate(0, -0.575, 0);
    cape = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#e14a1e', roughness: 0.75, side: THREE.DoubleSide }));
    cape.position.set(0, 0.6, 0); cape.userData.acc = true; // vertices are posed in spine space so they can be kept clear of the body
    cape.userData.base = Float32Array.from(g.attributes.position.array);
    spine.add(cape);
    // shoulder clasp line
    const clasp = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.4, 4, 12), mat('#e14a1e', 0.7));
    clasp.rotation.z = Math.PI / 2; clasp.position.set(0, 0.6, -0.245); clasp.userData.acc = true; spine.add(clasp);
  }

  const body = skinBody(root, { hips, spine, neck, head, arms, legs });
  body.receiveShadow = detail > 0;
  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; if (m !== body) m.receiveShadow = detail > 0; } });
  if (o.scale) root.scale.setScalar(o.scale);

  const h = {
    root, hips, spine, neck, head, arms, legs, cape, tails, wally, body,
    phase: Math.random() * 6, t: 0, punchT: 0, punchSide: 1, weapon: null,
  };
  return h;
}

// ---- one skinned mesh with weight maps ----
// Every body part (torso, limbs, hands, head, face) is merged into a single SkinnedMesh on a
// bone skeleton. Each vertex is weighted to its own bone, blending 50/50 with the neighbouring
// bone right at a joint and fading out over a short distance, so shoulders, elbows, hips,
// knees and the neck bend as one continuous body. Clothing (cape, mask, specs, emblem) stays separate.
function skinBody(root, R) {
  const { hips, spine, neck, head, arms, legs } = R;
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  // per bone: axis, length to its child joint, parent to blend with (over pb metres), child to blend with (over cb)
  const info = new Map();
  info.set(hips, { axis: UP, len: 0, parent: null, child: null });
  info.set(spine, { axis: UP, len: 0.66, parent: hips, pb: 0.12, child: null });
  info.set(neck, { axis: UP, len: 0.1, parent: spine, pb: 0.04, child: head, cb: 0.05 });
  info.set(head, { axis: UP, len: 0, parent: null, child: null });
  for (const a of arms) {
    info.set(a.sh, { axis: DOWN, len: 0.32, parent: spine, pb: 0.1, child: a.el, cb: 0.075 });
    info.set(a.el, { axis: DOWN, len: 0.4, parent: a.sh, pb: 0.075, child: null });
  }
  for (const l of legs) {
    info.set(l.hip, { axis: DOWN, len: 0.43, parent: hips, pb: 0.1, child: l.knee, cb: 0.085 });
    info.set(l.knee, { axis: DOWN, len: 0.5, parent: l.hip, pb: 0.085, child: null });
  }
  const bones = [...info.keys()];
  const index = new Map(bones.map((b, i) => [b, i]));
  root.updateMatrixWorld(true);
  const origin = new Map(bones.map((b) => [b, b.getWorldPosition(new THREE.Vector3())]));
  const parts = [];
  root.traverse((m) => {
    if (!m.isMesh || m.userData.acc || !m.parent || !info.has(m.parent)) return;
    if (m.material.transparent || m.material.side === THREE.DoubleSide) return;
    parts.push(m);
  });
  const byMat = new Map();
  const v = new THREE.Vector3(), d = new THREE.Vector3();
  for (const m of parts) {
    const bone = m.parent, I = info.get(bone);
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(m.matrixWorld);
    const n = g.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const o = origin.get(bone);
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
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 0.6; // room for posed limbs
  const mesh = new THREE.SkinnedMesh(geo, mats);
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true;
  return mesh;
}

// Pose the rig. st: { speed, mode, air, punch, aim, capeLift }
export function animateHuman(h, dt, st) {
  h.t += dt;
  const speed = st.speed || 0;
  const mode = st.mode || 'move';
  const [la, ra] = h.arms;
  const [ll, rl] = h.legs;
  let hipY = 0.95, lean = 0;
  const reset = () => {
    for (const a of h.arms) { a.sh.rotation.set(0, 0, a.side * 0.08); a.el.rotation.set(0, 0, 0); }
    for (const l of h.legs) { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
    h.spine.rotation.set(0, 0, 0); h.head.rotation.set(0, 0, 0); h.hips.rotation.set(0, 0, 0);
  };
  reset();
  if (mode === 'drive') {
    for (const l of h.legs) { l.hip.rotation.x = -1.4; l.knee.rotation.x = 1.3; }
    for (const a of h.arms) { a.sh.rotation.x = -1.1; a.sh.rotation.z = a.side * 0.2; a.el.rotation.x = -0.5; }
    hipY = 0.55;
    h.head.rotation.y = (st.steer || 0) * 0.3;
  } else if (mode === 'dead') {
    for (const a of h.arms) { a.sh.rotation.z = a.side * 1.2; a.el.rotation.x = -0.3; }
    for (const l of h.legs) { l.hip.rotation.z = l.side * 0.15; }
  } else if (mode === 'tumble') {
    for (const a of h.arms) { a.sh.rotation.z = a.side * (1.5 + Math.sin(h.t * 20) * 0.6); a.sh.rotation.x = Math.sin(h.t * 17 + a.side) * 1.2; }
    for (const l of h.legs) { l.hip.rotation.x = Math.sin(h.t * 15 + l.side) * 0.9; l.knee.rotation.x = 0.8; }
  } else if (mode === 'fly') {
    // Superman pose (well, an attempt at one)
    h.spine.rotation.x = 0.15;
    ra.sh.rotation.x = -3.0; ra.sh.rotation.z = -0.1;
    la.sh.rotation.x = st.flail ? -3 + Math.sin(h.t * 25) * 1.2 : 0.3; la.sh.rotation.z = st.flail ? 0.9 : 0.25;
    for (const l of h.legs) { l.hip.rotation.x = 0.2 + (st.flail ? Math.sin(h.t * 22 + l.side * 2) * 0.7 : 0); l.knee.rotation.x = 0.3; }
  } else if (st.air) {
    for (const a of h.arms) { a.sh.rotation.x = -0.6; a.sh.rotation.z = a.side * 0.7; a.el.rotation.x = -0.6; }
    ll.hip.rotation.x = -0.6; ll.knee.rotation.x = 0.9; rl.hip.rotation.x = 0.2; rl.knee.rotation.x = 0.4;
  } else if (speed > 0.15) {
    const run = Math.min(1, Math.max(0, (speed - 2.5) / 3.5));
    h.phase += dt * (3.2 + speed * 1.45);
    const s = Math.sin(h.phase), c = Math.cos(h.phase);
    const amp = 0.45 + run * 0.45;
    ll.hip.rotation.x = s * amp; rl.hip.rotation.x = -s * amp;
    ll.knee.rotation.x = Math.max(0, -c) * (0.5 + run * 1.0) + 0.05; rl.knee.rotation.x = Math.max(0, c) * (0.5 + run * 1.0) + 0.05;
    la.sh.rotation.x = -s * amp * 0.85; ra.sh.rotation.x = s * amp * 0.85;
    la.el.rotation.x = -0.25 - run * 0.9; ra.el.rotation.x = -0.25 - run * 0.9;
    hipY = 0.95 - run * 0.05 + Math.abs(c) * (0.03 + run * 0.04);
    lean = 0.05 + run * 0.22;
    h.spine.rotation.y = s * 0.08 * (1 + run);
  } else {
    // idle: breathing, Wally does his heroic hand-on-hip
    const b = Math.sin(h.t * 1.8);
    h.spine.rotation.x = b * 0.015;
    if (h.wally) { la.sh.rotation.z = -0.75; la.el.rotation.x = -1.0; la.el.rotation.z = 0.9; h.head.rotation.y = Math.sin(h.t * 0.4) * 0.35; }
  }
  h.spine.rotation.x += lean;

  // punch overlay
  if (h.punchT > 0) {
    h.punchT -= dt;
    const k = Math.sin((1 - Math.max(0, h.punchT) / 0.3) * Math.PI);
    const a = h.punchSide > 0 ? ra : la;
    a.sh.rotation.x = -1.5 * k; a.el.rotation.x = -0.2 * (1 - k); a.sh.rotation.z = a.side * 0.1;
    h.spine.rotation.y += -h.punchSide * 0.35 * k;
  }
  // aiming overlay (gun arm out)
  // grabbing someone by the collar and hauling them out of a car
  if (st.reach) {
    const k = st.reach;
    for (const a of h.arms) { a.sh.rotation.x = -1.35 * k; a.sh.rotation.z = a.side * 0.12; a.el.rotation.x = -0.5 * k; }
    h.spine.rotation.x = 0.12 - (st.pull || 0) * 0.35;
    ll.hip.rotation.x = -0.35 * (st.pull || 0); ll.knee.rotation.x = 0.3 * (st.pull || 0);
  }
  if (st.aim && mode !== 'drive' && mode !== 'dead' && mode !== 'tumble') {
    ra.sh.rotation.x = -1.5 + (st.aimPitch || 0); ra.sh.rotation.z = -0.05; ra.el.rotation.x = 0;
  }
  h.hips.position.y = hipY;

  // cape physics-ish: lifts with speed, waves with time
  if (h.cape) {
    const g = h.cape.geometry, p = g.attributes.position, base = h.cape.userData.base;
    const lift = Math.min(1.25, (st.capeLift != null ? st.capeLift : speed / 7));
    const flap = 0.04 + lift * 0.08;
    for (let i = 0; i < p.count; i++) {
      const bx = base[i * 3], by = base[i * 3 + 1];
      const t = -by / 1.15; // 0 top .. 1 bottom
      const widen = 0.83 + t * 0.45;
      const ang = lift * 1.25 * t;
      const len = -by;
      let z = -0.27 - Math.sin(ang) * len - t * 0.08;
      const y = -Math.cos(ang) * len;
      z += Math.sin(h.t * (5 + lift * 9) - t * 5 + bx * 4) * flap * t;
      const x = bx * widen + Math.sin(h.t * 3 + t * 3) * 0.03 * t;
      z += (x * x) * 0.9 * (1 - t * 0.6); // wraps round the shoulders
      // never pass through the suit: stay behind the back/bum (an ellipse ~0.31 wide, 0.23 deep)
      // and behind the arms out at the sides
      const ex = Math.min(1, Math.abs(x) / 0.31);
      const zmax = Math.min(-0.16, -0.04 - 0.235 * Math.sqrt(1 - ex * ex));
      p.setXYZ(i, x, y, Math.min(z, zmax));
    }
    p.needsUpdate = true; g.computeVertexNormals();
  }
  if (h.tails) {
    const lift = Math.min(1, speed / 6);
    for (const m of h.tails) {
      const p = m.geometry.attributes.position, base = m.userData.base;
      for (let i = 0; i < p.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1], t = -by / 0.3;
        const ang = 1.05 + lift * 0.45; // the ties stream out behind his head
        const z = -Math.sin(ang) * -by + Math.sin(h.t * 9 + t * 6 + m.userData.side) * 0.03 * t;
        const y = -Math.cos(ang) * -by;
        p.setXYZ(i, bx + m.userData.side * t * 0.07, y, z);
      }
      p.needsUpdate = true;
    }
  }
}

// Wally's gadget pistol, the "Wally Blaster"
export function buildBlaster() {
  const g = new THREE.Group();
  const black = mat('#141414', 0.35, 0.6), grey = mat('#555b63', 0.3, 0.8), glow = mat('#58e0ff', 0.2, 0, { emissive: '#2ab8ff', emissiveIntensity: 2 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.2), black); body.position.set(0, 0.02, 0.07); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 16), grey); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.035, 0.2); g.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.045), black); grip.position.set(0, -0.03, 0.0); grip.rotation.x = -0.25; g.add(grip);
  const cell = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.06), glow); cell.position.set(0, 0.058, 0.07); g.add(cell);
  g.userData.muzzle = new THREE.Vector3(0, 0.035, 0.27);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}
