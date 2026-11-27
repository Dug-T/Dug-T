// The Isle of Neep (a ferry ride east of Wallypool) with the Highland Games, plus night-time events
// in the city: a ceilidh in Hero Square and fireworks over the bay.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ISLAND } from './city.js';
import { buildHuman, animateHuman, randomPedLook } from './humans.js';

const pick = (a) => a[(Math.random() * a.length) | 0];
// the island's footprint
const IX0 = ISLAND + 95, IX1 = ISLAND + 245, IZ0 = -80, IZ1 = 80;
const inIsle = (x, z) => x > IX0 && x < IX1 && z > IZ0 && z < IZ1;

export function initIsland(game, scene, world) {
  const I = { record: { caber: 0, hammer: 0 }, visits: 0 };
  const A = () => game.audio, P = () => game.player;

  // ======================= the island itself =======================
  const groundH = (x, z) => 0.35 + Math.max(0, Math.sin((x - IX0) / (IX1 - IX0) * Math.PI) * Math.sin((z - IZ0) / (IZ1 - IZ0) * Math.PI)) * 1.2 - 0.0;
  {
    // grassy land with a gentle hump, sandy edges, cliffs down into the sea
    const g = new THREE.PlaneGeometry(IX1 - IX0, IZ1 - IZ0, 40, 40); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, cols = [];
    const grass = new THREE.Color('#5e8f3e'), sand = new THREE.Color('#d8c48c'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (IX0 + IX1) / 2, z = p.getZ(i);
      p.setY(i, groundH(x, z) - 0.02);
      const edge = Math.min(x - IX0, IX1 - x, z - IZ0, IZ1 - z);
      c.copy(sand).lerp(grass, Math.min(1, Math.max(0, (edge - 4) / 8))); c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.04);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    const land = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    land.position.set((IX0 + IX1) / 2, 0, 0); land.receiveShadow = true; scene.add(land);
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(IX1 - IX0, 3, IZ1 - IZ0), new THREE.MeshStandardMaterial({ color: '#7c6f5c', roughness: 1 }));
    cliff.position.set((IX0 + IX1) / 2, -1.2, 0); scene.add(cliff);
    // wee whitewashed cottages wi' slate roofs, a ruined castle, standing stones, trees and the distillery
    const white = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.9 }), slate = new THREE.MeshStandardMaterial({ color: '#3d4148', roughness: 0.7 });
    const stone = new THREE.MeshStandardMaterial({ color: '#8d8a83', roughness: 1, flatShading: true });
    const geoms = { white: [], slate: [], stone: [], wood: [], leaf: [] };
    const put = (key, geo, x, y, z, ry = 0) => { geo.rotateY(ry); geo.translate(x, y, z); geoms[key].push(geo.index ? geo.toNonIndexed() : geo); };
    const cottage = (x, z, ry) => {
      const y = groundH(x, z);
      put('white', new THREE.BoxGeometry(8, 3.2, 5), x, y + 1.6, z, ry);
      const roof = new THREE.CylinderGeometry(0.01, 3.4, 8.4, 3, 1); roof.rotateZ(Math.PI / 2); roof.rotateX(Math.PI / 6); roof.scale(1, 0.75, 1);
      put('slate', roof, x, y + 3.9, z, ry);
      put('stone', new THREE.BoxGeometry(0.8, 2, 0.8), x + Math.cos(ry) * 3.6, y + 4.4, z - Math.sin(ry) * 3.6, ry);
      world.addCollider({ x0: x - 4.3, z0: z - 4.3, x1: x + 4.3, z1: z + 4.3, h: 3.2 });
    };
    [[IX0 + 30, -40, 0.2], [IX0 + 45, -52, 0.1], [IX0 + 60, 48, -0.3], [IX0 + 95, 55, 0.4], [IX1 - 30, -50, -0.2], [IX1 - 40, 40, 0.3]].forEach(([x, z, r]) => cottage(x, z, r));
    // the castle ruin on the hill
    const cx = IX1 - 55, cz = 0, cy = groundH(cx, cz);
    for (const [dx, dz] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { put('stone', new THREE.CylinderGeometry(2.2, 2.6, 9 + Math.random() * 4, 8), cx + dx, cy + 5, cz + dz); world.addCollider({ x0: cx + dx - 2.4, z0: cz + dz - 2.4, x1: cx + dx + 2.4, z1: cz + dz + 2.4, h: 9 }); }
    for (const [x0, z0, x1, z1] of [[-8, -8.5, 8, -7.5], [-8.5, -8, -7.5, 8], [7.5, -8, 8.5, 4]]) { put('stone', new THREE.BoxGeometry(x1 - x0, 4, z1 - z0), cx + (x0 + x1) / 2, cy + 2, cz + (z0 + z1) / 2); world.addCollider({ x0: cx + x0, z0: cz + z0, x1: cx + x1, z1: cz + z1, h: 4 }); }
    // standing stones
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, x = IX0 + 70 + Math.cos(a) * 9, z = -22 + Math.sin(a) * 9; put('stone', new THREE.BoxGeometry(1.2, 3 + Math.random() * 1.5, 0.6), x, groundH(x, z) + 1.6, z, a); }
    // trees
    for (let k = 0; k < 40; k++) {
      const x = IX0 + 12 + Math.random() * (IX1 - IX0 - 24), z = IZ0 + 12 + Math.random() * (IZ1 - IZ0 - 24);
      if (Math.abs(z) < 14 && x < IX0 + 120) continue; // keep the games field and path clear
      const y = groundH(x, z);
      put('wood', new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6), x, y + 1.2, z);
      put('leaf', new THREE.ConeGeometry(1.8 + Math.random(), 4.5 + Math.random() * 2, 7), x, y + 4.2, z);
    }
    // the distillery
    const dx = IX0 + 110, dz = -50, dy = groundH(dx, dz);
    put('white', new THREE.BoxGeometry(16, 6, 9), dx, dy + 3, dz); put('slate', new THREE.BoxGeometry(16.5, 0.6, 9.5), dx, dy + 6.2, dz);
    put('stone', new THREE.BoxGeometry(3, 4, 3), dx + 5, dy + 8, dz); world.addCollider({ x0: dx - 8, z0: dz - 4.5, x1: dx + 8, z1: dz + 4.5, h: 6, roof: dy + 6.4 });
    game.addSign('ISLE OF NEEP DISTILLERY', '#3b2a1a', '#e8c25a', dx, dz + 4.8, 0);
    const mats = { white, slate, stone, wood: new THREE.MeshStandardMaterial({ color: '#5a3c22', roughness: 1 }), leaf: new THREE.MeshStandardMaterial({ color: '#3f6b33', roughness: 1, flatShading: true }) };
    for (const k in geoms) if (geoms[k].length) { const m = new THREE.Mesh(mergeGeometries(geoms[k]), mats[k]); m.castShadow = true; m.receiveShadow = true; scene.add(m); }
    // the edges: low rocks so you don't wander into the sea
    for (const [x0, z0, x1, z1] of [[IX0, IZ0 - 1, IX1, IZ0 + 0.5], [IX0, IZ1 - 0.5, IX1, IZ1 + 1], [IX1 - 0.5, IZ0, IX1 + 1, IZ1], [IX0 - 1, IZ0, IX0 + 0.5, -5], [IX0 - 1, 5, IX0 + 0.5, IZ1]]) world.addCollider({ x0, z0, x1, z1, h: 1.2 });
  }
  // the island has its own ground: the city's says "sea" out here
  const cityGround = world.groundHeight;
  world.groundHeight = (x, z, y) => (inIsle(x, z) ? Math.max(groundH(x, z), cityGround(x, z, y)) : cityGround(x, z, y));

  // ======================= the ferry =======================
  const ferry = (() => {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 26), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6 })); hull.position.y = 0.2; g.add(hull);
    const band = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.6, 26.1), new THREE.MeshStandardMaterial({ color: '#c0392b' })); band.position.y = -0.9; g.add(band);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 14), new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.5 })); deck.position.set(0, 3.6, -1); g.add(deck);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(7, 1.6, 4), new THREE.MeshStandardMaterial({ color: '#f4f4f2' })); bridge.position.set(0, 6.4, 3); g.add(bridge);
    const win = new THREE.Mesh(new THREE.BoxGeometry(7.05, 0.6, 4.05), new THREE.MeshStandardMaterial({ color: '#1b2833', roughness: 0.1, metalness: 0.5 })); win.position.set(0, 6.5, 3); g.add(win);
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 3.5, 14), new THREE.MeshStandardMaterial({ color: '#c0392b' })); funnel.position.set(0, 7.2, -4); g.add(funnel);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.8, 14), new THREE.MeshStandardMaterial({ color: '#111' })); top.position.set(0, 9, -4); g.add(top);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    scene.add(g); return g;
  })();
  const pierCity = { x: ISLAND - 2.5, z: 0 }, pierIsle = { x: IX0 + 3, z: 0 };
  const dockA = ISLAND + 15, dockB = IX0 - 15;
  // wooden piers at both ends
  for (const [x0, x1] of [[ISLAND, dockA - 4], [dockB + 4, IX0]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.5, 5), new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.9 })); p.position.set((x0 + x1) / 2, 0.1, 0); p.receiveShadow = true; scene.add(p);
  }
  game.addSign('🚢 FERRY TO THE ISLE OF NEEP', '#c0392b', '#ffffff', pierCity.x - 3, 6, -Math.PI / 2);
  const ferryMarkCity = game.marker(pierCity.x - 1.5, 0, 'pickup', 1.8); ferryMarkCity.persistent = true;
  const ferryMarkIsle = game.marker(pierIsle.x + 2, 0, 'pickup', 1.8); ferryMarkIsle.persistent = true;
  game.staticBlips.push({ x: pierCity.x, z: 0, col: '#ffffff', shape: 'tri' });
  // the ferry shuttles across on its own; when you take it there's a short crossing
  let fT = 0, crossing = null, ferryCool = 0;
  function updateFerry(dt) {
    fT += dt;
    if (!crossing) {
      const k = (Math.sin(fT / 30) + 1) / 2;
      ferry.position.set(dockA + (dockB - dockA) * k, 0, -18 + Math.sin(fT / 30) * 2);
      ferry.rotation.y = Math.PI / 2;
    }
    ferry.rotation.z = Math.sin(fT * 0.8) * 0.02; ferry.position.y = Math.sin(fT * 1.1) * 0.15;
    ferryCool -= dt;
    const pl = P(); if (pl.car || pl.dead || crossing || ferryCool > 0 || game.mission && !game.mission.allowFerry) return;
    const there = inIsle(pl.x, pl.z) || pl.x > ISLAND;
    const mk = there ? ferryMarkIsle : ferryMarkCity;
    if (Math.hypot(pl.x - mk.x, pl.z - mk.z) < 1.8) {
      game.prompt(`Ferry to ${there ? 'Wallypool' : 'the Isle of Neep'} ($20). ${game.isTouch ? 'Tap ENTER' : 'Press F'} to board`);
      if (game._inp && game._inp.enter) { game._inp.enter = false; takeFerry(!there); }
    }
  }
  function takeFerry(toIsle) {
    const pl = P();
    if (pl.money < 20) { game.toast('The ferry\'s $20. Ye\'ve no\' got it. Swim? Naw.'); return; }
    pl.money -= 20; crossing = true; ferryCool = 4;
    A().tone(110, 1.4, 'sawtooth', 0.12); A().tone(146, 1.4, 'sawtooth', 0.08); // the ship's horn
    const f = document.getElementById('fade'); f.style.transition = 'opacity .6s'; f.style.opacity = 1;
    game.subs([toIsle ? pick(['WALLY MAN: All aboard the Neep Express! Mind the gap. And the sea.', 'WALLY MAN: A wee sail to the island. I\'ve brought sandwiches.']) : 'WALLY MAN: Back to the big city. Bye, sheep!']);
    setTimeout(() => {
      const to = toIsle ? pierIsle : pierCity;
      pl.place(to.x + (toIsle ? 6 : -4), to.z, toIsle ? Math.PI / 2 : -Math.PI / 2);
      game.cam.yaw = toIsle ? Math.PI / 2 : -Math.PI / 2;
      ferry.position.set(toIsle ? dockB : dockA, 0, 0); fT = toIsle ? Math.PI / 2 * 30 : -Math.PI / 2 * 30;
      f.style.opacity = 0; crossing = null;
      if (toIsle) { I.visits++; game.bigText('ISLE OF NEEP', pick(['Population: 34 people, 2000 sheep', 'Twinned wi\' nowhere', 'Mind the midgies']), 3); }
    }, 1600);
  }

  // ======================= sheep =======================
  const sheep = [];
  {
    const wool = new THREE.MeshStandardMaterial({ color: '#efece4', roughness: 1 }), face = new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.8 });
    const body = new THREE.SphereGeometry(0.7, 10, 8), head = new THREE.SphereGeometry(0.28, 8, 6), leg = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 5);
    for (let k = 0; k < 14; k++) {
      const g = new THREE.Group(); const b = new THREE.Mesh(body, wool); b.scale.set(1, 0.8, 1.3); b.position.y = 0.75; g.add(b);
      const h = new THREE.Mesh(head, face); h.position.set(0, 0.95, 0.9); h.scale.set(0.9, 1, 1.2); g.add(h);
      for (const [lx, lz] of [[-0.3, 0.5], [0.3, 0.5], [-0.3, -0.5], [0.3, -0.5]]) { const l = new THREE.Mesh(leg, face); l.position.set(lx, 0.25, lz); g.add(l); }
      g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      const s = { g, x: IX0 + 20 + Math.random() * 100, z: (Math.random() - 0.5) * 120, h: Math.random() * 6, t: Math.random() * 5, baaT: Math.random() * 20 };
      scene.add(g); sheep.push(s);
    }
  }
  function updateSheep(dt) {
    const pl = P(), near = inIsle(pl.x, pl.z);
    for (const s of sheep) {
      s.g.visible = near || Math.abs(pl.x - s.x) < 250;
      if (!near) continue;
      s.t -= dt;
      const d = Math.hypot(pl.x - s.x, pl.z - s.z);
      let sp = 0;
      if (d < 6) { s.h = Math.atan2(s.x - pl.x, s.z - pl.z); sp = 3.5; } // scatter from Wally
      else if (s.t < 0) { s.t = 3 + Math.random() * 6; s.h += (Math.random() - 0.5) * 2; s.walking = Math.random() < 0.5; }
      else if (s.walking) sp = 0.7;
      const nx = s.x + Math.sin(s.h) * sp * dt, nz = s.z + Math.cos(s.h) * sp * dt;
      if (inIsle(nx, nz) && nx > IX0 + 6 && nx < IX1 - 6 && Math.abs(nz) < IZ1 - 6 && !world.collide(nx, nz, 0.8, 0).hit) { s.x = nx; s.z = nz; } else s.h += Math.PI * 0.7;
      s.g.position.set(s.x, groundH(s.x, s.z) + (sp > 1 ? Math.abs(Math.sin(performance.now() / 90)) * 0.15 : 0), s.z); s.g.rotation.y = s.h;
      s.baaT -= dt; if (s.baaT < 0 && d < 25) { s.baaT = 8 + Math.random() * 20; A().tone(320 + Math.random() * 60, 0.5, 'sawtooth', 0.05 * (1 - d / 25), -40); A().tone(330, 0.45, 'square', 0.02, 30, 0.05); }
    }
  }

  // ======================= Highland Games =======================
  const field = { x: IX0 + 60, z: 0 };
  const gamesMark = game.marker(field.x, field.z, 'pickup', 2.2); gamesMark.persistent = true;
  game.addSign('HIGHLAND GAMES', '#1f4fa0', '#ffd23f', field.x, field.z + 6, Math.PI);
  // a wee grandstand of crowd folk who cheer
  const crowd = [];
  for (let k = 0; k < 10; k++) { const h = buildHuman(randomPedLook(Math.random)); const x = field.x - 10 + k * 2.2, z = field.z + 12; h.root.position.set(x, groundH(x, z), z); h.root.rotation.y = Math.PI; scene.add(h.root); crowd.push(h); }
  let G = null; // the current event
  const ui = document.getElementById('games');
  function startGames(ev) {
    const pl = P();
    G = { ev, stage: 'power', power: 0, dir: 1, angle: 0, adir: 1, t: 0, obj: null };
    game.paused = false; game.gamesOn = true; ui.classList.remove('hidden');
    document.getElementById('gamesTitle').textContent = ev === 'caber' ? 'TOSSING THE CABER' : 'THROWING THE HAMMER';
    document.getElementById('gamesHelp').textContent = `${game.isTouch ? 'Tap FIRE' : 'Click / FIRE'} to set the power, then again to set the ${ev === 'caber' ? 'angle (straight up is best)' : 'release'}. Record: ${I.record[ev].toFixed(1)} m`;
    game.toast(ev === 'caber' ? 'Caber toss! A big log, a wee man, what could go wrong.' : 'Hammer throw! Spin, spin, LET GO!');
    pl.vx = pl.vz = 0;
  }
  function launch() {
    const pl = P(), ev = G.ev;
    const mesh = ev === 'caber' ? new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5.5, 10), new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.95 }))
      : new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.7, roughness: 0.4 }));
    mesh.castShadow = true; scene.add(mesh);
    const fx = Math.sin(pl.heading), fz = Math.cos(pl.heading);
    // caber: angle score near the middle is best; hammer: release timing
    const quality = ev === 'caber' ? 1 - Math.abs(G.angle - 0.5) * 2 : 1 - Math.abs(G.angle - 0.78) * 1.6;
    const speed = 6 + G.power * 15 * (0.4 + 0.6 * Math.max(0, quality));
    G.obj = { mesh, x: pl.x + fx, y: pl.y + 1.6, z: pl.z + fz, vx: fx * speed * 0.72, vy: speed * 0.69, vz: fz * speed * 0.72, spin: 0, sx: pl.x, sz: pl.z, flip: quality };
    G.stage = 'flying'; A().fire('throw'); pl.h.punchT = 0.4;
  }
  function updateGames(dt) {
    const pl = P();
    gamesMark.obj.visible = !G;
    if (!G) {
      if (pl.car || pl.dead || !inIsle(pl.x, pl.z) || Math.hypot(pl.x - field.x, pl.z - field.z) > 2.2) return;
      game.prompt(`Highland Games: ${game.isTouch ? 'tap ENTER' : 'press F'} for the caber toss, or JUMP for the hammer`);
      if (game._inp.enter) { game._inp.enter = false; startGames('caber'); }
      else if (game._inp.jumpPressed) startGames('hammer');
      return;
    }
    const inp = game._inp, press = inp.firePressed || inp.enter || inp.jumpPressed;
    inp.fire = false; inp.firePressed = false; inp.enter = false; inp.jump = false; inp.jumpPressed = false; inp.mx = inp.my = 0;
    const bar = document.getElementById('gamesBar'), mark = document.getElementById('gamesMark');
    if (G.stage === 'power') {
      G.power += G.dir * dt * 1.6; if (G.power > 1) { G.power = 1; G.dir = -1; } if (G.power < 0) { G.power = 0; G.dir = 1; }
      bar.style.width = (G.power * 100) + '%'; mark.style.display = 'none';
      if (G.ev === 'hammer') { pl.heading += dt * (4 + G.power * 8); }
      if (press) { G.stage = 'angle'; A().tone(700, 0.06, 'square', 0.08); }
    } else if (G.stage === 'angle') {
      G.angle += G.adir * dt * 1.3; if (G.angle > 1) { G.angle = 1; G.adir = -1; } if (G.angle < 0) { G.angle = 0; G.adir = 1; }
      mark.style.display = 'block'; mark.style.left = (G.angle * 100) + '%';
      if (G.ev === 'hammer') pl.heading += dt * (4 + G.power * 8);
      if (press) launch();
    } else if (G.stage === 'flying') {
      const o = G.obj; o.vy -= 12 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      if (G.ev === 'caber') o.mesh.rotation.set(Math.min(Math.PI, (o.flip > 0.6 ? 1 : 0.55) * (o.y > 0 ? (1 - o.vy / 12) * 1.6 : Math.PI)), pl.heading, 0); else o.mesh.rotation.x += dt * 10;
      o.mesh.position.set(o.x, o.y, o.z);
      const g = world.groundHeight(o.x, o.z, o.y + 1) + 0.2;
      if (o.y < g) {
        o.y = g; o.mesh.position.y = g;
        let dist = Math.hypot(o.x - o.sx, o.z - o.sz);
        if (G.ev === 'caber' && o.flip < 0.6) { dist *= 0.5; game.toast('It didnae turn over! Half marks. The judges are tutting.'); }
        const rec = dist > I.record[G.ev];
        game.bigText(`${dist.toFixed(1)} m`, rec ? 'NEW RECORD! +$500' : `Record: ${I.record[G.ev].toFixed(1)} m`, 2.6, !rec);
        if (rec) { I.record[G.ev] = dist; pl.money += 500; A().pass(); game.quip(['Get in! Highland legend!', 'Did ye see that, Nessie?!', 'The judges are greetin\'!'], 1, true); }
        else { A().fail(); game.quip(['Ach, the wind caught it.', 'Ma kilt\'s too tight, that\'s the problem.', 'I\'ve pulled something. Ma pride, mostly.'], 1, true); }
        for (const h of crowd) h.punchT = 0.4;
        G.stage = 'done'; G.t = 2.5;
        if (game.onGamesResult) game.onGamesResult(G.ev, dist);
      }
    } else if (G.stage === 'done') {
      G.t -= dt;
      if (G.t <= 0) { scene.remove(G.obj.mesh); G.obj.mesh.geometry.dispose(); G = null; game.gamesOn = false; ui.classList.add('hidden'); game.save(); }
    }
  }
  function updateCrowd(dt) {
    const pl = P(); if (Math.abs(pl.x - field.x) > 120) return;
    for (const h of crowd) animateHuman(h, dt, { speed: 0, mode: 'move', punch: h.punchT > 0 });
  }

  // ======================= night: a ceilidh in Hero Square and fireworks over the bay =======================
  const dancers = [];
  let fwT = 3, chatT = 0;
  function updateCeilidh(dt) {
    const pl = P(), S = world.specials.plaza, hr = game.time / 60;
    const on = hr >= 19.5 && hr < 24 && !game.inside && Math.hypot(pl.x - S.x, pl.z - S.z) < 140; // by the clock, so it doesnae flicker at dusk
    if (on && !dancers.length) {
      for (let k = 0; k < 12; k++) { const h = buildHuman(randomPedLook(Math.random)); scene.add(h.root); dancers.push({ h, k }); }
    }
    if (!on && dancers.length) { for (const d of dancers) scene.remove(d.h.root); dancers.length = 0; A().ambient = 0; return; }
    if (!on) return;
    // two rings going opposite ways, partners spinning as they pass: Strip the Willow, more or less
    const t = performance.now() / 1000;
    for (const d of dancers) {
      const outer = d.k % 2, a = d.k / 12 * Math.PI * 2 + (outer ? 1 : -1) * t * 0.6, r = outer ? 9 : 6.5;
      const x = S.x + Math.cos(a) * r, z = S.z - 2 + Math.sin(a) * r;
      d.h.root.position.set(x, world.groundHeight(x, z, 2), z);
      d.h.root.rotation.y = a + (outer ? Math.PI : 0) + Math.sin(t * 4 + d.k) * 0.8;
      animateHuman(d.h, dt, { speed: 2.2 + Math.sin(t * 3 + d.k), mode: 'move' });
    }
    // the band plays ceilidh music, louder the closer you are
    const dd = Math.hypot(pl.x - S.x, pl.z - S.z);
    A().ambient = pl.car ? 0 : Math.max(0, 1 - dd / 70); A().ambientStation = 3;
    chatT -= dt;
    if (chatT <= 0 && dd < 25) { chatT = 20 + Math.random() * 20; game.toast(pick(['🎻 Ceilidh in Hero Square! Strip the Willow, anybody?', '🎻 The band are on their third Gay Gordons. Nobody knows the steps.', '🎻 Somebody\'s granny is out-dancing the lot of them.'])); }
  }
  function burst(x, y, z) {
    const cols = [['#ff4d6d', '#ffd1dc'], ['#4dabff', '#d6ecff'], ['#ffd23f', '#fff4c2'], ['#7dff8a', '#e1ffe4'], ['#c77dff', '#f0dcff']][(Math.random() * 5) | 0];
    const n = 46;
    for (let k = 0; k < n; k++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), sp = 9 + Math.random() * 4;
      game.puff(x, y, z, { color: k % 3 ? cols[0] : cols[1], add: true, life: 1.3 + Math.random() * 0.6, size: 0.45, grow: -0.5, vx: Math.cos(th) * s * sp, vy: u * sp, vz: Math.sin(th) * s * sp, opacity: 1 });
    }
    const d = Math.hypot(x - P().x, z - P().z);
    setTimeout(() => { A().boom(); }, Math.min(2500, d * 3)); // sound arrives after the flash
  }
  function updateFireworks(dt) {
    const hr = game.time / 60, now = new Date();
    const hogmanay = (now.getMonth() === 11 && now.getDate() === 31) || (now.getMonth() === 0 && now.getDate() === 1);
    const on = !game.inside && ((hr >= 22 || hr < 0.5) || (hogmanay && game.night > 0.5));
    if (!on) return;
    fwT -= dt;
    if (fwT <= 0) {
      fwT = hogmanay ? 0.5 + Math.random() * 0.8 : 2.5 + Math.random() * 4;
      // launched from a barge in the bay
      const x = ISLAND + 60 + (Math.random() - 0.5) * 60, z = (Math.random() - 0.5) * 140;
      const y = 60 + Math.random() * 40;
      for (let k = 0; k < 10; k++) game.puff(x, k * (y / 10), z, { color: '#ffcf80', add: true, life: 0.25 + k * 0.05, size: 0.25, grow: 0, vy: 0, opacity: 0.9 });
      setTimeout(() => burst(x, y, z), 400);
    }
  }

  I.update = (dt) => {
    updateFerry(dt); updateSheep(dt); updateGames(dt); updateCrowd(dt); updateCeilidh(dt); updateFireworks(dt);
  };
  I.inIsle = inIsle;
  I.test = { firework: () => burst(ISLAND + 60, 70, 0) };
  I.field = field; I.pierCity = pierCity;
  I.save = () => ({ record: I.record, visits: I.visits });
  I.load = (s) => { I.record = { caber: 0, hammer: 0, ...((s && s.record) || {}) }; I.visits = (s && s.visits) || 0; };
  I.stats = () => `Isle of Neep visits: ${I.visits} · Caber record ${I.record.caber.toFixed(1)} m · Hammer record ${I.record.hammer.toFixed(1)} m`;
  return I;
}
