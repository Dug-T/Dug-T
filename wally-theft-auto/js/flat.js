// Wally's Flat: a furnished one-room interior built far off the map. Walk in through the
// front door outside, sleep in the bed to save the game.
import * as THREE from 'three';
import { KERB } from './city.js';

export const FLAT = { x: 2600, z: 2600, w: 11, d: 8, h: 3.2 };

function cv(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const std = (o) => new THREE.MeshStandardMaterial(o);

// a glowing ring you walk into, with a bobbing arrow above it
function ringMarker(col) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: col }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.04; g.add(disc);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 4), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 }));
  arrow.rotation.x = Math.PI; arrow.position.y = 1.7; g.add(arrow); g.userData.arrow = arrow;
  return g;
}

export function buildFlat(scene, world, addCollider) {
  const { x: X, z: Z, w: W, d: D, h: H } = FLAT;
  const x0 = X - W / 2, x1 = X + W / 2, z0 = Z - D / 2, z1 = Z + D / 2;
  const room = new THREE.Group(); scene.add(room);

  // ---- surfaces ----
  const floorTex = cv(512, 512, (x, w, h) => {
    for (let i = 0; i < 8; i++) {
      x.fillStyle = `hsl(28, ${38 + (i % 3) * 6}%, ${30 + ((i * 37) % 9)}%)`; x.fillRect(0, i * 64, w, 64);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, i * 64, w, 2);
      const off = (i * 173) % 512; x.fillRect(off, i * 64, 2, 64);
      for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(60,30,10,${Math.random() * 0.15})`; x.fillRect(Math.random() * w, i * 64 + Math.random() * 64, 30 + Math.random() * 60, 1); }
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / 4, D / 4);
  const wallTex = cv(256, 256, (x, w, h) => {
    x.fillStyle = '#d9cbb0'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 32) { x.fillStyle = 'rgba(30,70,40,0.18)'; x.fillRect(i, 0, 10, h); x.fillStyle = 'rgba(150,40,40,0.12)'; x.fillRect(i + 16, 0, 3, h); }
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(W / 2.5, 1);
  const floorM = std({ map: floorTex, bumpMap: floorTex, bumpScale: 1.5, roughness: 0.55 });
  const wallM = std({ map: wallTex, roughness: 0.9 });
  const ceilM = std({ color: '#f2ede2', roughness: 1 });
  const skirtM = std({ color: '#f4f1ea', roughness: 0.6 });
  const plane = (w, h, m) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  const floor = plane(W, D, floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(X, 0.001, Z); floor.receiveShadow = true; room.add(floor);
  const ceil = plane(W, D, ceilM); ceil.rotation.x = Math.PI / 2; ceil.position.set(X, H, Z); room.add(ceil);
  const walls = [
    [W, X, Z - D / 2, 0], [W, X, Z + D / 2, Math.PI], [D, X - W / 2, Z, Math.PI / 2], [D, X + W / 2, Z, -Math.PI / 2],
  ];
  for (const [len, wx, wz, ry] of walls) {
    const m = plane(len, H, wallM); m.position.set(wx, H / 2, wz); m.rotation.y = ry; m.receiveShadow = true; room.add(m);
    const sk = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.03), skirtM); sk.position.set(wx, 0.07, wz); sk.rotation.y = ry; room.add(sk);
    const cor = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.06), skirtM); cor.position.set(wx, H - 0.05, wz); cor.rotation.y = ry; room.add(cor);
  }
  // the room is a solid box: walls, plus an invisible floor so the ground is here
  addCollider({ x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z0, h: 6 });
  addCollider({ x0: x0 - 1, z0: z1, x1: x1 + 1, z1: z1 + 1, h: 6 });
  addCollider({ x0: x0 - 1, z0: z0, x1: x0, z1: z1, h: 6 });
  addCollider({ x0: x1, z0: z0, x1: x1 + 1, z1: z1, h: 6 });
  addCollider({ x0, z0, x1, z1, h: 0, roof: 0 });
  const solid = (bx0, bz0, bx1, bz1, h) => addCollider({ x0: bx0, z0: bz0, x1: bx1, z1: bz1, h });

  // ---- window with a view of Wallypool ----
  const viewTex = cv(512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6f9fd8'); g.addColorStop(1, '#e8eef4'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const bw = 20 + Math.random() * 40, bh = 40 + Math.random() * 150, bx = i * 20 + Math.random() * 10; x.fillStyle = `hsl(210, 10%, ${35 + Math.random() * 25}%)`; x.fillRect(bx, h - bh, bw, bh); x.fillStyle = 'rgba(255,240,180,0.5)'; for (let k = 0; k < 8; k++) x.fillRect(bx + 4 + (k % 3) * 10, h - bh + 8 + ((k / 3) | 0) * 18, 5, 8); }
  });
  const viewM = new THREE.MeshBasicMaterial({ map: viewTex });
  const frameM = std({ color: '#f6f3ec', roughness: 0.5 });
  for (const wx of [X - 2.6, X + 0.4]) {
    const v = plane(1.8, 1.3, viewM); v.position.set(wx, 1.75, z0 + 0.012); room.add(v);
    for (const [fw, fh, fx, fy] of [[1.9, 0.08, 0, 0.69], [1.9, 0.08, 0, -0.69], [0.08, 1.4, -0.92, 0], [0.08, 1.4, 0.92, 0], [0.05, 1.3, 0, 0]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.08), frameM); f.position.set(wx + fx, 1.75 + fy, z0 + 0.04); room.add(f);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.25), frameM); sill.position.set(wx, 1.07, z0 + 0.12); room.add(sill);
  }
  // curtains in Wally blue
  const curtM = std({ color: '#2a5cb8', roughness: 0.95, side: THREE.DoubleSide });
  for (const cx of [X - 3.75, X - 1.45, X - 0.75, X + 1.55]) {
    const g = new THREE.PlaneGeometry(0.5, 2.1, 8, 1); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 18) * 0.04);
    g.computeVertexNormals();
    const c = new THREE.Mesh(g, curtM); c.position.set(cx, 1.95, z0 + 0.1); room.add(c);
  }

  // ---- the bed (save point) in the north-east corner ----
  const bedX = x1 - 1.3, bedZ = z0 + 1.6;
  const woodM = std({ color: '#6b4426', roughness: 0.6 });
  const bed = new THREE.Group(); bed.position.set(bedX, 0, bedZ); room.add(bed);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 2.3), woodM); frame.position.y = 0.2; bed.add(frame);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.12), woodM); head.position.set(0, 0.55, -1.15); bed.add(head);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 2.15), std({ color: '#f4f1ea', roughness: 0.9 })); mattress.position.y = 0.47; bed.add(mattress);
  const duvetTex = cv(256, 256, (x, w, h) => {
    x.fillStyle = '#1f5fc4'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ef5a1c'; x.beginPath(); x.ellipse(w / 2, h / 2, 80, 50, 0, 0, 7); x.fill();
    x.fillStyle = '#2a8a2a'; x.font = 'bold 54px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('W', w / 2, h / 2 + 2);
  });
  const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.12, 1.5), std({ map: duvetTex, roughness: 0.95 })); duvet.position.set(0, 0.6, 0.32); bed.add(duvet);
  for (const px of [-0.42, 0.42]) { const pil = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.4, 4, 12), std({ color: '#ffffff', roughness: 0.9 })); pil.rotation.z = Math.PI / 2; pil.scale.set(1, 1, 0.55); pil.position.set(px, 0.63, -0.82); bed.add(pil); }
  bed.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  solid(bedX - 0.85, bedZ - 1.2, bedX + 0.85, bedZ + 1.15, 0.7);
  // bedside table and lamp
  const nt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.45), woodM); nt.position.set(bedX - 1.2, 0.28, z0 + 0.45); room.add(nt);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.22, 16, 1, true), std({ color: '#f7e2a8', emissive: '#ffcf7a', emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  lampShade.position.set(bedX - 1.2, 0.85, z0 + 0.45); room.add(lampShade);
  solid(bedX - 1.45, z0, bedX - 0.95, z0 + 0.7, 0.6);

  // ---- living area: sofa, TV, rug, coffee table ----
  const sofaM = std({ color: '#7a2b2b', roughness: 0.85 });
  const sofa = new THREE.Group(); sofa.position.set(X - 1.6, 0, z1 - 1.3); room.add(sofa);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.9), sofaM); seat.position.y = 0.3; sofa.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.22), sofaM); back.position.set(0, 0.72, 0.36); sofa.add(back);
  for (const sx of [-1.25, 1.25]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.9), sofaM); arm.position.set(sx, 0.4, 0); sofa.add(arm); }
  for (const cx of [-0.6, 0.6]) { const cu = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 10), std({ color: '#d8b04a', roughness: 0.9 })); cu.rotation.z = Math.PI / 2; cu.scale.set(1, 1, 0.6); cu.position.set(cx, 0.65, 0.18); sofa.add(cu); }
  sofa.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  solid(X - 2.95, z1 - 1.8, X - 0.25, z1 - 0.8, 0.8);
  const rugTex = cv(256, 256, (x, w, h) => {
    x.fillStyle = '#1d5a2e'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(20,40,120,0.6)'; for (let i = 0; i < w; i += 32) { x.fillRect(i, 0, 14, h); x.fillRect(0, i, w, 14); }
    x.fillStyle = 'rgba(220,40,40,0.7)'; for (let i = 6; i < w; i += 32) { x.fillRect(i, 0, 3, h); x.fillRect(0, i, w, 3); }
  });
  const rug = plane(3.2, 2.2, std({ map: rugTex, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(X - 1.6, 0.006, Z + 0.4); rug.receiveShadow = true; room.add(rug);
  const ctable = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.6), woodM); ctable.position.set(X - 1.6, 0.42, Z + 0.5); room.add(ctable);
  for (const [lx, lz] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), woodM); leg.position.set(X - 1.6 + lx, 0.2, Z + 0.5 + lz); room.add(leg); }
  // a fish supper on the coffee table
  const chips = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.25), std({ color: '#f1e6c8', roughness: 1 })); chips.position.set(X - 1.4, 0.48, Z + 0.45); room.add(chips);
  solid(X - 2.15, Z + 0.2, X - 1.05, Z + 0.8, 0.5);
  // telly with WALLY NEWS on it
  const tvCanvas = document.createElement('canvas'); tvCanvas.width = 256; tvCanvas.height = 144;
  const tvTex = new THREE.CanvasTexture(tvCanvas); tvTex.colorSpace = THREE.SRGBColorSpace;
  const tvStand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.45), woodM); tvStand.position.set(X - 1.6, 0.25, Z - 1.2); room.add(tvStand);
  const tvBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.8, 0.08), std({ color: '#111', roughness: 0.4 })); tvBody.position.set(X - 1.6, 0.95, Z - 1.2); room.add(tvBody);
  const tvScreen = plane(1.25, 0.7, new THREE.MeshBasicMaterial({ map: tvTex })); tvScreen.position.set(X - 1.6, 0.95, Z - 1.155); room.add(tvScreen);
  solid(X - 2.4, Z - 1.45, X - 0.8, Z - 0.95, 1.4);
  // ---- kitchenette against the west wall ----
  const unitM = std({ color: '#e8e3d6', roughness: 0.6 }), topM = std({ color: '#3a3a3e', roughness: 0.3, metalness: 0.2 });
  const units = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 3.2), unitM); units.position.set(x0 + 0.33, 0.45, Z - 0.6); room.add(units);
  const worktop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 3.25), topM); worktop.position.set(x0 + 0.35, 0.93, Z - 0.6); room.add(worktop);
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.24, 16), std({ color: '#c0392b', roughness: 0.3, metalness: 0.3 })); kettle.position.set(x0 + 0.35, 1.07, Z - 1.4); room.add(kettle);
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), std({ color: '#f4f4f4', roughness: 0.4 })); fridge.position.set(x0 + 0.36, 0.9, Z + 1.4); room.add(fridge);
  solid(x0, Z - 2.25, x0 + 0.72, Z + 1.8, 1.8);
  // ---- bookshelf and a framed poster of the man himself ----
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 0.35), woodM); shelf.position.set(X + 1.6, 0.95, z0 + 0.2); room.add(shelf);
  for (let r = 0; r < 4; r++) for (let b = 0; b < 7; b++) {
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.3 + Math.random() * 0.06, 0.24), std({ color: `hsl(${Math.random() * 360}, 45%, 40%)`, roughness: 0.8 }));
    bk.position.set(X + 1.6 - 0.45 + b * 0.15, 0.3 + r * 0.45, z0 + 0.24); room.add(bk);
  }
  solid(X + 1.0, z0, X + 2.2, z0 + 0.4, 2);
  const posterTex = new THREE.TextureLoader().load('img/wallyman.jpg'); posterTex.colorSpace = THREE.SRGBColorSpace;
  const poster = plane(1.1, 1.65, std({ map: posterTex, roughness: 0.4 })); poster.position.set(x1 - 0.035, 1.7, Z + 1.6); poster.rotation.y = -Math.PI / 2; room.add(poster);
  const pf = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.75, 1.2), std({ color: '#b8923c', metalness: 0.7, roughness: 0.3 })); pf.position.set(x1 - 0.012, 1.7, Z + 1.6); room.add(pf);
  // coat hook with spare capes by the door
  for (let k = 0; k < 3; k++) {
    const capeG = new THREE.PlaneGeometry(0.35, 0.9, 4, 6); const p = capeG.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 12 + k) * 0.03 + 0.04);
    capeG.computeVertexNormals();
    const cp = new THREE.Mesh(capeG, std({ color: '#e14a1e', roughness: 0.8, side: THREE.DoubleSide })); cp.position.set(X + 2.4 + k * 0.4, 1.55, z1 - 0.06); cp.rotation.y = Math.PI; room.add(cp);
  }
  // ceiling light
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), std({ color: '#fff6d8', emissive: '#ffd89a', emissiveIntensity: 2.5 })); bulb.position.set(X, H - 0.35, Z); room.add(bulb);
  const flex = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), std({ color: '#222' })); flex.position.set(X, H - 0.15, Z); room.add(flex);
  const light = new THREE.PointLight('#ffe2b0', 0, 16, 1.4); light.position.set(X, H - 0.6, Z); scene.add(light);
  // front door (exit) on the south wall
  const doorX = X + 3.2;
  const doorM = std({ color: '#1f3a6b', roughness: 0.5 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.06), doorM); door.position.set(doorX, 1.05, z1 - 0.02); room.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), std({ color: '#d4af37', metalness: 1, roughness: 0.2 })); knob.position.set(doorX - 0.38, 1.0, z1 - 0.07); room.add(knob);
  room.traverse((m) => { if (m.isMesh && !m.castShadow) m.receiveShadow = true; });

  const exitMk = ringMarker('#ff4fb8'); exitMk.position.set(doorX, 0, z1 - 0.9); room.add(exitMk);
  const bedMk = ringMarker('#5fe36a'); bedMk.position.set(bedX - 1.25, 0, bedZ + 0.6); room.add(bedMk);

  // ---- the front door outside, on Wally's building ----
  const h = world.specials.home, main = h.block.main;
  const outX = h.x + 6, outZ = main.z0;
  const od = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.08), doorM); od.position.set(outX, KERB + 1.15, outZ - 0.03); scene.add(od);
  const odFrame = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.5, 0.06), std({ color: '#f2eee4', roughness: 0.6 })); odFrame.position.set(outX, KERB + 1.25, outZ - 0.01); scene.add(odFrame);
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: cv(128, 64, (x) => { x.fillStyle = '#d4af37'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#111'; x.font = 'bold 40px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('2/1', 64, 34); }) }));
  num.position.set(outX, KERB + 1.9, outZ - 0.08); num.rotation.y = Math.PI; scene.add(num);
  const inMk = ringMarker('#ff4fb8'); inMk.position.set(outX, KERB, outZ - 1.1); scene.add(inMk);

  let tvT = 0;
  const NEWS = ['LOCAL MAN "FLIES"', 'CAPE CRUSADER NICKS VAN', 'NEEP SHORTAGE: WHY?', 'POLIS BAFFLED AGAIN', 'WEATHER: DREICH'];
  const flat = {
    bounds: { x0, z0, x1, z1, h: H },
    spawn: [bedX - 1.6, bedZ + 2.1], exit: [doorX, z1 - 2.1], outside: [outX, outZ - 2.6],
    door: [outX, outZ - 1.1], exitMarker: [doorX, z1 - 0.9], bedMarker: [bedX - 1.25, bedZ + 0.6],
    light,
    contains: (x, z) => x > x0 - 0.5 && x < x1 + 0.5 && z > z0 - 0.5 && z < z1 + 0.5,
    update(dt, t, inside, night) {
      light.intensity = inside ? 18 : 0;
      viewM.color.setScalar(1 - night * 0.75);
      for (const mk of [exitMk, bedMk, inMk]) { mk.userData.arrow.position.y = 1.7 + Math.sin(t * 3) * 0.12; mk.userData.arrow.rotation.y += dt * 2; }
      if (!inside) return;
      tvT -= dt;
      if (tvT <= 0) {
        tvT = 2.5;
        const x = tvCanvas.getContext('2d');
        x.fillStyle = `hsl(${210 + Math.random() * 20}, 60%, 25%)`; x.fillRect(0, 0, 256, 144);
        x.fillStyle = '#c0392b'; x.fillRect(0, 100, 256, 44);
        x.fillStyle = '#fff'; x.font = 'bold 18px Arial'; x.fillText('WALLY NEWS', 10, 26);
        x.font = 'bold 15px Arial'; x.fillText(NEWS[(Math.random() * NEWS.length) | 0], 10, 128);
        x.fillStyle = '#f0c09a'; x.beginPath(); x.arc(190, 60, 24, 0, 7); x.fill();
        x.fillStyle = '#1f5fc4'; x.fillRect(166, 54, 48, 9);
        tvTex.needsUpdate = true;
      }
    },
  };
  return flat;
}
