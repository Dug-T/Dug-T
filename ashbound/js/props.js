// The places on the island: camp, village, plane wreck, ranger station, bunker, raft beach and the things lying about.
import * as THREE from 'three';
import { POIS, heightAt, normalAt } from './island.js';
import { thatchTexture, metalTexture, concreteTexture, signTexture, sparkTexture, frondTexture, rng } from './textures.js';
let _frondTex = null; const frondTex = () => (_frondTex = _frondTex || frondTexture());
import { mat } from './survivor.js';

const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r1, r2, h, m, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const shadow = (g) => { g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g; };
const place = (g, x, z, y = null, yaw = 0) => { g.position.set(x, y == null ? heightAt(x, z) : y, z); g.rotation.y = yaw; return g; };

export function buildProps(scene, world, quality) {
  const hi = quality !== 'low';
  const P = { shelters: [], water: [], fires: [], anim: [], signs: [] };
  const thatch = new THREE.MeshStandardMaterial({ map: thatchTexture(), roughness: 1 });
  const woodM = mat('#7a5a34', 0.9), darkWood = mat('#4a3520', 0.9), metal = new THREE.MeshStandardMaterial({ map: metalTexture(), roughness: 0.5, metalness: 0.6 });
  const concrete = new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.95 }), steel = mat('#4a5058', 0.45, { metalness: 0.7 });

  // ---- the camp: a fire, a lean-to and a log to sit on ----
  {
    const c = POIS.camp, g = new THREE.Group();
    const stones = new THREE.Group(); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), mat('#6a6560', 0.9)); s.position.set(Math.cos(a) * 0.8, 0.12, Math.sin(a) * 0.8); stones.add(s); }
    g.add(stones);
    for (let i = 0; i < 3; i++) { const l = cyl(0.08, 0.1, 1.1, darkWood, 7); l.rotation.z = Math.PI / 2 + 0.5; l.rotation.y = i * 2.1; l.position.y = 0.2; g.add(l); }
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: '#ff9a30', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95 }));
    flame.scale.set(1.2, 1.8, 1); flame.position.y = 0.9; g.add(flame);
    const light = new THREE.PointLight('#ff8a30', 14, 22, 1.8); light.position.y = 1.5; g.add(light);
    P.fires.push({ flame, light, x: c.x, z: c.z, t: Infinity, camp: true });
    const log = cyl(0.25, 0.25, 2.4, woodM, 9); log.rotation.z = Math.PI / 2; log.position.set(0, 0.25, 2.2); g.add(log);
    // lean-to
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), thatch); roof.rotation.x = -Math.PI / 2 + 0.75; roof.rotation.y = 0; roof.position.set(-3.5, 1.6, 0); roof.material.side = THREE.DoubleSide; g.add(roof);
    for (const s of [-1, 1]) { const post = cyl(0.06, 0.06, 2.4, woodM, 6); post.position.set(-2.2, 1.2, s * 1.4); g.add(post); }
    const pack = box(0.6, 0.5, 0.4, mat('#8a2a2a', 0.9)); pack.position.set(-3.2, 0.25, -0.8); g.add(pack);
    scene.add(shadow(place(g, c.x, c.z, c.y)));
    P.shelters.push({ x: c.x - 3.5, z: c.z, r: 2.5 });
  }
  // ---- the village: huts, a jetty, a well and the radio hut ----
  {
    const v = POIS.village, r = rng(3);
    const hut = (w, d, h) => {
      const g = new THREE.Group();
      const walls = box(w, h, d, new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: 1 })); walls.position.y = h / 2; g.add(walls);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.85, h * 0.8, 4), thatch); roof.rotation.y = Math.PI / 4; roof.position.y = h + h * 0.4; g.add(roof);
      const door = box(0.9, 1.8, 0.1, darkWood); door.position.set(0, 0.9, d / 2 + 0.02); g.add(door);
      for (const s of [-1, 1]) { const win = box(0.7, 0.6, 0.1, mat('#1a2a3a', 0.3)); win.position.set(s * w * 0.3, 1.5, d / 2 + 0.02); g.add(win); }
      return g;
    };
    const spots = [[-10, -6, 0.3], [-2, -12, -0.4], [8, -8, 0.2], [12, 2, -1.2], [-8, 6, 1.0]];
    spots.forEach(([dx, dz, yaw], i) => {
      const g = hut(4 + r() * 1.5, 3.5 + r() * 1.5, 2.6);
      scene.add(shadow(place(g, v.x + dx, v.z + dz, v.y, yaw)));
      P.shelters.push({ x: v.x + dx, z: v.z + dz, r: 3 });
    });
    // the radio hut gets an aerial and a sign
    const aerial = cyl(0.03, 0.03, 4, steel, 6); place(aerial, v.x + 12 + 1.6, v.z + 2 - 1.5, v.y + 4.5); scene.add(aerial);
    P.signs.push(sign(scene, 'RADIO', v.x + 12, v.z + 2 + 2.4, v.y + 2.2, -1.2));
    // the well
    const well = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 1.0, 16, 1, true), concrete); ring.position.y = 0.5; ring.material.side = THREE.DoubleSide; well.add(ring);
    const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16), mat('#1f6f8f', 0.1, { metalness: 0.3 })); waterDisc.rotation.x = -Math.PI / 2; waterDisc.position.y = 0.6; well.add(waterDisc);
    for (const s of [-1, 1]) { const post = cyl(0.07, 0.07, 2.2, woodM, 6); post.position.set(s * 1.0, 1.1, 0); well.add(post); }
    const bar = cyl(0.05, 0.05, 2.3, woodM, 6); bar.rotation.z = Math.PI / 2; bar.position.y = 2.1; well.add(bar);
    const lid = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.8, 4), thatch); lid.rotation.y = Math.PI / 4; lid.position.y = 2.6; well.add(lid);
    const bucket = cyl(0.2, 0.15, 0.3, darkWood, 8); bucket.position.y = 1.5; well.add(bucket);
    scene.add(shadow(place(well, v.x + 2, v.z + 0, v.y)));
    P.water.push({ x: v.x + 2, z: v.z, r: 2.4, name: 'the well' });
    // a jetty out to sea and an upturned boat
    const jetty = new THREE.Group();
    for (let i = 0; i < 7; i++) { const plank = box(2.2, 0.12, 1.6, woodM); plank.position.set(0, 0, -i * 1.7); jetty.add(plank); for (const s of [-1, 1]) if (i % 2 === 0) { const post = cyl(0.1, 0.1, 2.5, darkWood, 6); post.position.set(s * 1.0, -1.0, -i * 1.7); jetty.add(post); } }
    scene.add(shadow(place(jetty, v.x + 22, v.z + 26, 1.4, Math.PI)));
    const boat = new THREE.Group(); const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3.2, 4, 10), mat('#c23b2a', 0.6)); hull.rotation.z = Math.PI / 2; hull.scale.set(1, 0.5, 1); hull.position.y = 0.3; boat.add(hull);
    scene.add(shadow(place(boat, v.x - 16, v.z + 14, null, 0.6)));
  }
  // ---- the plane wreck ----
  {
    const w = POIS.wreck, g = new THREE.Group();
    const fus = cyl(1.4, 1.5, 11, metal, 16); fus.rotation.z = Math.PI / 2; fus.position.set(0, 1.5, 0); g.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), metal); nose.position.set(5.6, 1.5, 0); nose.scale.set(1.4, 1, 1); g.add(nose);
    const wing = box(2.2, 0.25, 9, metal); wing.position.set(0.5, 1.3, -5); wing.rotation.x = 0.12; g.add(wing);
    const wing2 = box(2.2, 0.25, 5, metal); wing2.position.set(1.5, 0.6, 5); wing2.rotation.z = 0.5; wing2.rotation.x = -0.3; g.add(wing2);
    const tail = box(2.5, 3, 0.25, metal); tail.position.set(-5.5, 3, 0); g.add(tail);
    const tailfin = box(2, 0.2, 4, metal); tailfin.position.set(-5.5, 2.5, 0); g.add(tailfin);
    for (let i = 0; i < 6; i++) { const win = box(0.5, 0.5, 0.1, mat('#0d1a26', 0.2)); win.position.set(-3.5 + i * 1.4, 2.1, 1.42); g.add(win); const win2 = win.clone(); win2.position.z = -1.42; g.add(win2); }
    const prop = box(0.2, 3.2, 0.3, mat('#222', 0.5)); prop.position.set(7.0, 1.5, 0); prop.rotation.x = 0.7; g.add(prop);
    // scattered debris and a burnt patch
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(9, 20), new THREE.MeshBasicMaterial({ color: '#1a1512', transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })); scorch.rotation.x = -Math.PI / 2; scorch.position.set(-6, 0.08, 2); g.add(scorch);
    for (let i = 0; i < 7; i++) { const d = box(0.5 + Math.random(), 0.1, 0.4 + Math.random() * 0.6, metal); d.position.set(-14 + Math.random() * 10, 0.1, -4 + Math.random() * 8); d.rotation.y = Math.random() * 3; g.add(d); }
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#555', transparent: true, opacity: 0.0 })); g.add(smoke);
    scene.add(shadow(place(g, w.x, w.z, w.y, -0.5)));
    P.shelters.push({ x: w.x, z: w.z, r: 4 });
  }
  // ---- the ranger station, tower and helipad ----
  {
    const t = POIS.tower, g = new THREE.Group();
    // cabin
    const cab = box(6, 2.8, 5, new THREE.MeshStandardMaterial({ color: '#4a6b3a', roughness: 0.9 })); cab.position.y = 1.4; g.add(cab);
    const roof = box(7, 0.25, 6, darkWood); roof.position.y = 2.9; roof.rotation.z = 0.08; g.add(roof);
    const door = box(1, 2, 0.1, darkWood); door.position.set(0, 1, 2.55); g.add(door);
    for (const s of [-1, 1]) { const win = box(1.2, 0.9, 0.1, mat('#1a2a3a', 0.3)); win.position.set(s * 1.9, 1.6, 2.55); g.add(win); }
    const porch = box(7, 0.2, 2.5, woodM); porch.position.set(0, 0.1, 3.7); g.add(porch);
    // the radio set on a bench outside
    const bench = box(1.6, 0.1, 0.7, woodM); bench.position.set(2.4, 0.9, 3.8); g.add(bench);
    for (const s of [-1, 1]) { const leg = box(0.1, 0.9, 0.6, woodM); leg.position.set(2.4 + s * 0.7, 0.45, 3.8); g.add(leg); }
    const radio = box(0.7, 0.4, 0.4, mat('#3a3f45', 0.5, { metalness: 0.4 })); radio.position.set(2.4, 1.15, 3.8); g.add(radio);
    const dial = cyl(0.08, 0.08, 0.05, mat('#dddddd', 0.3), 10); dial.rotation.x = Math.PI / 2; dial.position.set(2.2, 1.2, 4.02); g.add(dial);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: '#330000', emissive: '#ff2020', emissiveIntensity: 0 })); lamp.position.set(2.6, 1.3, 4.02); g.add(lamp); P.radioLamp = lamp;
    // lookout tower
    const tw = new THREE.Group(); tw.position.set(-9, 0, -2);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = cyl(0.12, 0.16, 12, darkWood, 7); leg.position.set(sx * 1.6, 6, sz * 1.6); leg.rotation.z = -sx * 0.06; leg.rotation.x = sz * 0.06; tw.add(leg); }
    for (let y = 3; y < 12; y += 3) { for (const s of [-1, 1]) { const b1 = box(3.4, 0.12, 0.12, woodM); b1.position.set(0, y, s * 1.5); tw.add(b1); const b2 = box(0.12, 0.12, 3.4, woodM); b2.position.set(s * 1.5, y, 0); tw.add(b2); } }
    const deck = box(4.2, 0.2, 4.2, woodM); deck.position.y = 12; tw.add(deck);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1, 4.2), new THREE.MeshStandardMaterial({ color: '#5a4020', roughness: 0.9, wireframe: true })); rail.position.y = 12.6; tw.add(rail);
    const troof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 4), darkWood); troof.rotation.y = Math.PI / 4; troof.position.y = 14.6; tw.add(troof);
    // the mast lies snapped on the ground beside it
    const mast = cyl(0.05, 0.07, 6, steel, 8); mast.rotation.z = Math.PI / 2 - 0.2; mast.rotation.y = 0.5; mast.position.set(4, 0.4, 3); tw.add(mast);
    g.add(tw);
    scene.add(shadow(place(g, t.x, t.z, t.y, 0.2)));
    P.signs.push(sign(scene, 'RANGER STATION', t.x + Math.sin(0.2) * 4.5, t.z + Math.cos(0.2) * 4.5, t.y + 2.2, 0.2));
    P.shelters.push({ x: t.x, z: t.z, r: 4 });
    // helipad: a flat disc with an H
    const h = POIS.helipad, pad = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(9, 32), concrete); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.15; pad.add(disc);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(7.8, 8.6, 32), mat('#f2e14a', 0.8)); ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.17; pad.add(ringM);
    const hm = mat('#f2e14a', 0.8); const hb1 = box(0.8, 0.03, 5, hm); hb1.position.set(-1.5, 0.18, 0); const hb2 = hb1.clone(); hb2.position.x = 1.5; const hb3 = box(3, 0.03, 0.8, hm); hb3.position.y = 0.18; pad.add(hb1, hb2, hb3);
    const sock = cyl(0.03, 0.03, 4, steel, 6); sock.position.set(10, 2, 0); pad.add(sock); const flag = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 8, 1, true), mat('#ff6a1a', 0.8, { side: THREE.DoubleSide })); flag.rotation.z = Math.PI / 2; flag.position.set(10.9, 3.8, 0); pad.add(flag);
    scene.add(place(pad, h.x, h.z, h.y));
  }
  // ---- the bunker: a concrete mouth in the hillside with a steel door ----
  {
    const b = POIS.bunker, g = new THREE.Group();
    const face = box(10, 6, 2, concrete); face.position.set(0, 3, -3); g.add(face);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 10), new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 1 })); mound.position.set(0, -1, -8); mound.scale.set(1.2, 0.8, 1); g.add(mound);
    const frame = box(3.2, 3.6, 0.4, steel); frame.position.set(0, 1.8, -1.9); g.add(frame);
    const dark = box(2.6, 3.0, 0.2, mat('#050505', 1)); dark.position.set(0, 1.5, -1.95); g.add(dark);
    const door = new THREE.Group(); door.position.set(-1.3, 0, -1.6);
    const leaf = box(2.6, 3.0, 0.2, steel); leaf.position.set(1.3, 1.5, 0); door.add(leaf);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 20), mat('#8a1a1a', 0.5, { metalness: 0.5 })); wheel.position.set(1.3, 1.5, 0.15); door.add(wheel);
    door.rotation.y = -1.9; // open
    g.add(door); P.bunkerDoor = door;
    const inside = new THREE.PointLight('#ffb070', 0, 10, 1.6); inside.position.set(0, 2, -4); g.add(inside); P.bunkerLight = inside;
    const steps = box(4, 0.3, 3, concrete); steps.position.set(0, 0.15, 0.5); g.add(steps);
    scene.add(shadow(place(g, b.x, b.z, b.y, 0.4)));
    P.signs.push(sign(scene, 'SHELTER 1943', b.x - Math.sin(0.4) * 2 + 3.5, b.z - Math.cos(0.4) * 2, b.y + 4.5, 0.4, '#5a5a5a'));
    P.shelters.push({ x: b.x, z: b.z, r: 5, bunker: true });
    P.bunkerInside = { x: b.x - Math.sin(0.4) * 3, z: b.z - Math.cos(0.4) * 3 };
  }
  // ---- the raft beach: a ring in the sand, and the raft that grows there ----
  {
    const y = POIS.boatyard, g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.8, 32), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; g.add(ring); P.raftRing = ring;
    const raft = buildRaft(); raft.position.y = 0.3; g.add(raft); P.raft = raft;
    const post = cyl(0.08, 0.1, 2, darkWood, 6); post.position.set(4.5, 1, 0); g.add(post);
    scene.add(shadow(place(g, y.x, y.z, y.y, 0.3)));
    P.signs.push(sign(scene, 'RAFT', y.x + 4.5 * Math.cos(0.3), y.z - 4.5 * Math.sin(0.3), y.y + 2.1, 0.3));
    P.raftHome = { x: y.x, z: y.z, y: y.y + 0.3, yaw: 0.3 };
  }
  // ---- fresh water: a spring and a rock pool ----
  for (const key of ['spring', 'pool']) {
    const s = POIS[key], g = new THREE.Group();
    const water = new THREE.Mesh(new THREE.CircleGeometry(4.5, 24), new THREE.MeshStandardMaterial({ color: '#2a8fb8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.12; g.add(water);
    const rr = rng(key === 'spring' ? 61 : 62);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + rr() * 0.4; const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rr() * 0.6), mat('#6a6a62', 0.9)); rock.position.set(Math.cos(a) * 4.8, 0.2, Math.sin(a) * 4.8); g.add(rock); }
    if (key === 'spring') { const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3), mat('#cfe9f5', 0.1, { transparent: true, opacity: 0.7, side: THREE.DoubleSide })); fall.position.set(0, 1.5, -4.6); g.add(fall); const cliff = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2), mat('#5a5a52', 0.9)); cliff.position.set(0, 1, -7); g.add(cliff); }
    scene.add(shadow(place(g, s.x, s.z, s.y)));
    P.water.push({ x: s.x, z: s.z, r: 5.5, name: key === 'spring' ? 'the spring' : 'the rock pool' });
  }
  // ---- the helicopter, parked off-stage until it is called ----
  P.heli = buildHelicopter(); P.heli.visible = false; scene.add(P.heli);
  // ash settles on the buildings too
  if (world.ashify) for (const m of [thatch, woodM, darkWood, metal, concrete, steel]) world.ashify(m);
  return P;
}

// a fire pit you build yourself: a ring of stones, crossed logs and a flame
const firePitTex = sparkTexture();
export function buildFirePit() {
  const g = new THREE.Group(), stoneM = mat('#6a6560', 0.9), logM = mat('#4a3520', 0.9), charM = mat('#1a1410', 1);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), stoneM); st.position.set(Math.cos(a) * 0.65, 0.1, Math.sin(a) * 0.65); st.rotation.set(a, a * 2, 0); g.add(st); }
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), charM); ash.rotation.x = -Math.PI / 2; ash.position.y = 0.03; g.add(ash);
  for (let i = 0; i < 3; i++) { const l = cyl(0.07, 0.09, 0.95, logM, 7); l.rotation.z = Math.PI / 2 + 0.45; l.rotation.y = i * 2.1; l.position.y = 0.18; g.add(l); }
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: firePitTex, color: '#ff9a30', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95 }));
  flame.scale.set(1.0, 1.5, 1); flame.position.y = 0.75; g.add(flame);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, flame };
}

function sign(scene, text, x, z, y, yaw, bg) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ map: signTexture(text, bg), roughness: 0.8, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = yaw; scene.add(m); return m;
}

// the raft is built in three stages: a frame, then the deck, then the mast and sail
export function buildRaft() {
  const g = new THREE.Group(), wood = mat('#9a7a4a', 0.9), rope = mat('#6a5a3a', 0.9);
  const s1 = new THREE.Group(), s2 = new THREE.Group(), s3 = new THREE.Group();
  for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 4.2, 8), wood); l.rotation.z = Math.PI / 2; l.position.set(0, 0.2, -1.4 + i * 0.4); (i < 3 ? s1 : s2).add(l); }
  for (const z of [-1.5, 1.5]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), wood); c.position.set(0, 0.42, z); c.rotation.x = 0; c.rotation.y = 0; c.rotation.z = 0; c.rotation.x = Math.PI / 2; c.rotation.z = Math.PI / 2; s1.add(c); }
  for (const x of [-1.6, 1.6]) for (const z of [-1.5, 1.5]) { const k = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 12), rope); k.position.set(x, 0.25, z); k.rotation.y = Math.PI / 2; s2.add(k); }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.6, 8), wood); mast.position.set(0, 2.1, 0); s3.add(mast);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), wood); boom.rotation.z = Math.PI / 2; boom.position.set(0, 3.6, 0); s3.add(boom);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), mat('#e8732a', 0.9, { side: THREE.DoubleSide })); sail.position.set(0, 2.4, 0.02); s3.add(sail);
  const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 1.6), wood); paddle.position.set(1.0, 0.45, 0.5); paddle.rotation.y = 0.3; s3.add(paddle);
  g.add(s1, s2, s3); g.userData.stages = [s1, s2, s3];
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  setRaftStage(g, 0);
  return g;
}
export function setRaftStage(raft, n) { raft.userData.stages.forEach((s, i) => { s.visible = i < n; }); }

export function buildHelicopter() {
  const g = new THREE.Group(), body = mat('#d8402a', 0.5, { metalness: 0.3 }), glass = mat('#9ad0ff', 0.1, { metalness: 0.4, transparent: true, opacity: 0.6 }), dark = mat('#222', 0.5);
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 3, 6, 14), body); fus.rotation.z = Math.PI / 2; fus.position.y = 1.4; g.add(fus);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 10, 0, Math.PI), glass); cockpit.rotation.y = Math.PI / 2; cockpit.position.set(2.5, 1.5, 0); g.add(cockpit);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 5, 10), body); tail.rotation.z = Math.PI / 2; tail.position.set(-4.5, 1.7, 0); g.add(tail);
  const fin = box(0.15, 1.6, 0.8, body); fin.position.set(-6.8, 2.3, 0); g.add(fin);
  const mastM = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8), dark); mastM.position.y = 2.7; g.add(mastM);
  const rotor = new THREE.Group(); rotor.position.y = 3.05; for (let i = 0; i < 4; i++) { const b = box(10, 0.06, 0.4, dark); b.rotation.y = i * Math.PI / 2; rotor.add(b); } g.add(rotor); g.userData.rotor = rotor;
  const tr = new THREE.Group(); tr.position.set(-6.8, 2.3, 0.5); for (let i = 0; i < 2; i++) { const b = box(0.1, 1.6, 0.2, dark); b.rotation.x = i * Math.PI / 2; tr.add(b); } g.add(tr); g.userData.tailRotor = tr;
  for (const s of [-1, 1]) { const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4, 8), dark); skid.rotation.z = Math.PI / 2; skid.position.set(0.3, 0.15, s * 1.1); g.add(skid); for (const x of [-1, 1.5]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), dark); st.position.set(x, 0.7, s * 1.0); g.add(st); } }
  const light = new THREE.PointLight('#ffffff', 80, 60, 1.6); light.position.set(2, 0.5, 0); g.add(light);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// a lean-to you build yourself: a pole frame thatched with fronds
export function buildLeanTo() {
  const g = new THREE.Group(), woodM = mat('#7a5a34', 0.9);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), new THREE.MeshStandardMaterial({ map: thatchTexture(), roughness: 1, side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2 + 0.8; roof.position.set(0, 1.25, 0); g.add(roof);
  for (const s of [-1, 1]) { const post = cyl(0.06, 0.07, 2.2, woodM, 6); post.position.set(s * 1.4, 1.1, 0.75); post.rotation.x = 0.15; g.add(post); const brace = cyl(0.05, 0.05, 2.6, woodM, 6); brace.rotation.x = -0.8; brace.position.set(s * 1.45, 1.2, 0.05); g.add(brace); }
  const ridge = cyl(0.06, 0.06, 3.2, woodM, 6); ridge.rotation.z = Math.PI / 2; ridge.position.set(0, 2.15, 0.85); g.add(ridge);
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8), new THREE.MeshStandardMaterial({ map: thatchTexture(), roughness: 1, color: '#9a8a5a' })); bed.rotation.x = -Math.PI / 2; bed.rotation.z = Math.PI / 2; bed.position.set(0, 0.04, -0.1); g.add(bed);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// ---- things to pick up ----
const pickCache = {};
export function pickupMesh(id) {
  if (!pickCache[id]) {
    let m;
    switch (id) {
      case 'wood': m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.3, 8), mat('#9a7a4a', 0.95)); m.rotation.z = Math.PI / 2; m.position.y = 0.14; break;
      case 'stone': m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), mat('#4a4a46', 0.9)); m.position.y = 0.18; break;
      case 'coconut': m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat('#6b4a2a', 0.9)); m.position.y = 0.17; break;
      case 'banana': { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.25, 4, 8), mat('#f2d23a', 0.6)); b.rotation.z = 0.4 + i * 0.2; b.position.set(i * 0.07, 0.15, 0); g.add(b); } m = g; break; }
      case 'mango': m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mat('#f0a030', 0.5)); m.scale.set(1, 1.25, 0.9); m.position.y = 0.16; break;
      case 'vine': { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 14), mat('#3f6a2a', 0.9)); v.rotation.x = Math.PI / 2; v.position.y = 0.05 + i * 0.07; v.rotation.z = i; g.add(v); } m = g; break; }
      case 'cloth': m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.4), mat('#2a4a8a', 0.95)); m.position.y = 0.05; break;
      case 'tarp': m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.5), mat('#e8732a', 0.95)); m.position.y = 0.1; break;
      case 'battery': m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), mat('#1a1a1a', 0.5, { metalness: 0.4 })); m.position.y = 0.16; break;
      case 'antenna': m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 2.2, 8), mat('#8a9098', 0.4, { metalness: 0.7 })); m.rotation.z = Math.PI / 2 - 0.3; m.position.y = 0.3; break;
      case 'handset': m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.12), mat('#2a2a2a', 0.4)); m.position.y = 0.2; m.rotation.x = 0.5; break;
      case 'logger': { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.24), mat('#3a3f45', 0.5)); b.position.y = 0.08; g.add(b); const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshStandardMaterial({ color: '#0f0', emissive: '#3f3', emissiveIntensity: 2 })); led.position.set(0.1, 0.17, 0.08); g.add(led); const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 4), mat('#111', 0.5)); ant.position.set(-0.12, 0.28, -0.08); g.add(ant); m = g; break; }
      case 'pendant': { const g = new THREE.Group(); const cord = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 4, 20), mat('#3a2a1a', 0.9)); cord.rotation.x = Math.PI / 2; cord.position.y = 0.01; g.add(cord); const bone = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12, Math.PI * 1.6), mat('#efe6d0', 0.6)); bone.rotation.x = Math.PI / 2; bone.position.set(0.1, 0.02, 0); g.add(bone); m = g; break; }
      case 'logbook': m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.34), mat('#2f5a2a', 0.8)); m.position.y = 0.03; m.rotation.y = 0.4; break;
      case 'frond': { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.3), new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 })); f.rotation.x = -Math.PI / 2; f.rotation.z = 0.6; f.position.y = 0.04; m = f; break; }
      case 'page': { const g = new THREE.Group(); const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), new THREE.MeshStandardMaterial({ color: '#f3ead2', roughness: 0.9, emissive: '#fff4d0', emissiveIntensity: 0.35, side: THREE.DoubleSide })); pg.rotation.x = -Math.PI / 2 + 0.25; pg.rotation.z = 0.4; pg.position.y = 0.05; g.add(pg); const ink = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshBasicMaterial({ color: '#3a3a5a', transparent: true, opacity: 0.25 })); ink.rotation.copy(pg.rotation); ink.position.y = 0.055; g.add(ink); m = g; break; }
      case 'bandage': m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), mat('#f2f2f2', 0.9)); m.position.y = 0.07; break;
      default: m = new THREE.Mesh(new THREE.SphereGeometry(0.2), mat('#ff00ff'));
    }
    pickCache[id] = m;
  }
  const c = pickCache[id].clone();
  c.traverse((x) => { if (x.isMesh) x.castShadow = true; });
  return c;
}
