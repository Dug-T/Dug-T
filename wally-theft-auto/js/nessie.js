// Nessie: the Loch Ness Monster, on holiday outside Wally's flat. She can't swim on a pavement,
// so she wriggles along it like a big green caterpillar, humps rolling down her back.
import * as THREE from 'three';

const SEG = 22;          // body segments, nose to tail
const SPACING = 0.3;     // metres between segments
const NECK = 9;          // neck segments

function tartan() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#d0142c'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(20,60,30,0.7)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 8, 64); x.fillRect(0, i, 64, 8); }
  x.fillStyle = 'rgba(255,220,60,0.9)'; for (let i = 6; i < 64; i += 16) { x.fillRect(i, 0, 2, 64); x.fillRect(0, i, 64, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

export function buildNessie(scene, world, home) {
  const skin = new THREE.MeshStandardMaterial({ color: '#3f9a52', roughness: 0.45, metalness: 0.05 });
  const belly = new THREE.MeshStandardMaterial({ color: '#a8d67a', roughness: 0.6 });
  const spot = new THREE.MeshStandardMaterial({ color: '#2c7340', roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.3 });
  const group = new THREE.Group(); scene.add(group);
  const ball = new THREE.SphereGeometry(1, 20, 14);

  // body: a chain of overlapping balls, fat at the front, thin at the tail
  const body = [];
  for (let i = 0; i < SEG; i++) {
    const u = i / (SEG - 1), r = 0.5 * (1 - u) ** 0.7 + 0.08;
    const m = new THREE.Mesh(ball, skin); m.scale.setScalar(r); m.castShadow = true; group.add(m);
    // a paler belly underneath and darker spots along the back
    const b = new THREE.Mesh(ball, belly); b.scale.set(0.9, 0.5, 0.9); b.position.y = -0.45; m.add(b);
    if (i % 3 === 1 && i < SEG - 3) { const s = new THREE.Mesh(ball, spot); s.scale.setScalar(0.22); s.position.set(0, 0.85, 0); m.add(s); }
    body.push({ m, r });
  }
  // four flippers that paddle as she wriggles
  const flippers = [];
  for (const [seg, side] of [[2, 1], [2, -1], [9, 1], [9, -1]]) {
    const f = new THREE.Mesh(ball, skin); f.scale.set(0.42, 0.07, 0.2); f.castShadow = true; group.add(f);
    flippers.push({ f, seg, side });
  }
  // neck and head
  const neck = [];
  for (let j = 0; j < NECK; j++) { const m = new THREE.Mesh(ball, skin); m.scale.setScalar(0.3 - j * 0.008); m.castShadow = true; group.add(m); neck.push(m); }
  const head = new THREE.Group(); group.add(head);
  const skull = new THREE.Mesh(ball, skin); skull.scale.set(0.32, 0.28, 0.46); skull.castShadow = true; head.add(skull);
  const snout = new THREE.Mesh(ball, belly); snout.scale.set(0.26, 0.16, 0.2); snout.position.set(0, -0.08, 0.3); head.add(snout);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(ball, white); eye.scale.setScalar(0.11); eye.position.set(sx * 0.17, 0.13, 0.12); head.add(eye);
    const pupil = new THREE.Mesh(ball, black); pupil.scale.setScalar(0.055); pupil.position.set(sx * 0.2, 0.15, 0.2); head.add(pupil);
    const nostril = new THREE.Mesh(ball, black); nostril.scale.setScalar(0.025); nostril.position.set(sx * 0.07, 0.0, 0.47); head.add(nostril);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 6, 16, Math.PI), black);
  smile.rotation.set(0, 0, Math.PI); smile.position.set(0, -0.1, 0.38); smile.rotation.x = -0.5; head.add(smile);
  // a tartan bunnet wi' a red toorie on top, as worn by all the best monsters
  const tex = tartan();
  const bunnet = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.12, 24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  bunnet.position.set(0, 0.3, -0.02); bunnet.rotation.z = 0.25; bunnet.castShadow = true; head.add(bunnet);
  const toorie = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ color: '#d11a1a', roughness: 0.9 })); toorie.scale.setScalar(0.09); toorie.position.set(0.05, 0.4, -0.02); head.add(toorie);

  // she potters up and down the pavement outside the flat
  const zLine = home.z - 0.6;
  const N = {
    group, x: home.x + 8, z: zLine, y: 0, heading: -Math.PI / 2, t: 0, speed: 0, target: null, pause: 1.5,
    female: true, vpitch: 0.7, state: 'walk', dead: false, sayCool: 6,
    headPos: new THREE.Vector3(),
  };
  const fwd = new THREE.Vector3(), side = new THREE.Vector3(), tmp = new THREE.Vector3();
  // (she used to wander; now she follows Wally, see update)
  const pickTarget = () => {
    for (let k = 0; k < 8; k++) {
      const x = home.x + (Math.random() - 0.5) * 30, z = zLine + (Math.random() - 0.5) * 0.8;
      if (!world.collide(x, z, 0.6, 0.5).hit && Math.abs(x - N.x) > 4) return [x, z];
    }
    return [home.x + (N.x < home.x ? 10 : -10), zLine];
  };
  N.update = (dt, player) => {
    N.t += dt;
    // follow Wally about like a big green puppy: closer is slower, further is faster
    N.caughtUp = false;
    if (player) {
      const c = player.car, px = c ? c.x : player.x, pz = c ? c.z : player.z, pf = c ? c.heading : player.heading;
      const dx = px - N.x, dz = pz - N.z, d = Math.hypot(dx, dz);
      const keep = c ? 7 : 3.6;
      // left miles behind (Wally drove off, flew away or got sent to the Infirmary): pop up just behind him
      if (d > 70 || (N.stuck > 1.6 && d > 10)) {
        for (let k = 0; k < 12; k++) {
          const a = pf + Math.PI + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45, r = 7 + (k % 3) * 2;
          const x = px + Math.sin(a) * r, z = pz + Math.cos(a) * r;
          if (!world.collide(x, z, 0.7, 0.5).hit) { N.x = x; N.z = z; N.heading = Math.atan2(px - x, pz - z); N.stuck = 0; N.caughtUp = true; break; }
        }
      } else if (d > keep) {
        const want = Math.atan2(dx, dz); let dh = want - N.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        N.heading += Math.max(-3 * dt, Math.min(3 * dt, dh));
        const top = Math.min(14, 1.6 + (d - keep) * 1.1);
        N.speed += Math.max(-6 * dt, Math.min(4 * dt, top - N.speed));
        // slide along walls rather than getting stuck on them
        const mx = Math.sin(N.heading) * N.speed * dt, mz = Math.cos(N.heading) * N.speed * dt;
        const free = (x, z) => !world.collide(x, z, 0.6, 0.5).hit;
        if (free(N.x + mx, N.z + mz)) { N.x += mx; N.z += mz; N.stuck = 0; }
        else if (free(N.x + mx, N.z)) { N.x += mx; N.stuck = 0; }
        else if (free(N.x, N.z + mz)) { N.z += mz; N.stuck = 0; }
        else N.stuck = (N.stuck || 0) + dt;
      } else {
        N.speed = Math.max(0, N.speed - dt * 5);
        // turn to face him while she waits
        const want = Math.atan2(dx, dz); let dh = want - N.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        N.heading += Math.max(-1.5 * dt, Math.min(1.5 * dt, dh));
      }
      N.dist = d;
    }
    // Wally walks into her: she nudges him gently aside
    if (player && !player.car) {
      const px = player.x - N.x, pz = player.z - N.z, pd = Math.hypot(px, pz);
      if (pd < 0.9 && pd > 0.01) { player.x = N.x + px / pd * 0.9; player.z = N.z + pz / pd * 0.9; }
    }
    // the wriggle itself: waves run down her back faster when she's on the move
    const wig = 1.5 + Math.min(N.speed, 5) * 3.2;
    N.phase = (N.phase || 0) + dt * wig;
    fwd.set(Math.sin(N.heading), 0, Math.cos(N.heading)); side.set(fwd.z, 0, -fwd.x);
    const gy = world.groundHeight(N.x, N.z, 1); N.y = gy;
    for (let i = 0; i < SEG; i++) {
      const s = i * SPACING, u = i / (SEG - 1);
      const lat = Math.sin(s * 1.6 - N.phase) * (0.12 + u * 0.45);
      const hump = Math.max(0, Math.sin(s * 1.15 - N.phase * 0.9)) * 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.15));
      const b = body[i];
      tmp.copy(fwd).multiplyScalar(-s).addScaledVector(side, lat);
      b.m.position.set(N.x + tmp.x, gy + b.r * 0.9 + hump, N.z + tmp.z);
    }
    for (const fl of flippers) {
      const b = body[fl.seg].m.position, paddle = Math.sin(N.phase * 1.3 + fl.seg) * 0.5;
      fl.f.position.set(b.x + side.x * fl.side * 0.48, gy + 0.08, b.z + side.z * fl.side * 0.48);
      fl.f.rotation.set(0, N.heading + fl.side * (0.5 + paddle), fl.side * 0.2);
    }
    // neck sways and bobs; she turns to look at Wally when he's near
    const base = body[0].m.position;
    let look = 0;
    if (player && !player.car) { const ax = Math.atan2(player.x - N.x, player.z - N.z) - N.heading; look = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(ax), Math.cos(ax)))) * (Math.hypot(player.x - N.x, player.z - N.z) < 15 ? 1 : 0); }
    N.look = (N.look || 0) + (look - (N.look || 0)) * Math.min(1, dt * 3);
    const nf = tmp.set(Math.sin(N.heading + N.look * 0.6), 0, Math.cos(N.heading + N.look * 0.6)).clone();
    const nside = new THREE.Vector3(nf.z, 0, -nf.x);
    const bob = Math.sin(N.t * 2.2) * 0.12 + (N.talkT > 0 ? Math.sin(N.t * 18) * 0.05 : 0);
    for (let j = 0; j < NECK; j++) {
      const u = j / (NECK - 1), sway = Math.sin(N.phase * 0.7 + u * 2) * 0.12 * u;
      neck[j].position.set(base.x + nf.x * (0.15 + u * 0.75) + nside.x * sway, base.y + 0.2 + Math.sin(u * Math.PI / 2) * 1.9 + bob * u, base.z + nf.z * (0.15 + u * 0.75) + nside.z * sway);
    }
    const top = neck[NECK - 1].position;
    head.position.set(top.x + nf.x * 0.2, top.y + 0.12, top.z + nf.z * 0.2);
    head.rotation.set(-0.1 + Math.sin(N.t * 1.7) * 0.06, N.heading + N.look, Math.sin(N.phase * 0.5) * 0.08);
    N.headPos.copy(head.position);
    if (N.talkT > 0) N.talkT -= dt;
    // speech bubbles are drawn 2.2m above .y, so keep .y just under her head
    N.y = head.position.y - 1.6;
    N.sayCool -= dt;
  };
  return N;
}
