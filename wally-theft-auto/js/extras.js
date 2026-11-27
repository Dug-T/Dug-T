// More to do in Wallypool: rampages, rival superheroes, the polis helicopter and roadblocks.
import * as THREE from 'three';
import { N, roadC, blockMin, blockMax, ROAD } from './city.js';
import { buildHuman, animateHuman } from './humans.js';

const pick = (a) => a[(Math.random() * a.length) | 0];

// ---------------- rampages ----------------
const RAMPAGES = [
  { id: 'club', weapon: 'club', ammo: 0, need: 10, time: 60, title: 'GOLF CLUB RAMPAGE', blurb: 'Clatter 10 folk wi\' Granda\'s golf club' },
  { id: 'soaker', weapon: 'soaker', ammo: 300, need: 15, time: 45, title: 'SOAKER RAMPAGE', blurb: 'Drook 15 folk wi\' the Super Soaker' },
  { id: 'tattie', weapon: 'tattie', ammo: 40, need: 12, time: 60, title: 'TATTIE RAMPAGE', blurb: 'Bonk 12 folk wi\' flying tatties' },
  { id: 'shinty', weapon: 'shinty', ammo: 0, need: 10, time: 60, title: 'SHINTY RAMPAGE', blurb: 'Thwack 10 folk wi\' a shinty stick' },
  { id: 'neep', weapon: 'neep', ammo: 12, need: 10, time: 45, title: 'NEEP RAMPAGE', blurb: 'Bowl over 10 folk wi\' neep grenades' },
  { id: 'pipes', weapon: 'bagpipes', ammo: 0, need: 15, time: 45, title: 'BAGPIPE RAMPAGE', blurb: 'Deafen 15 folk wi\' the battle bagpipes' },
];
// ---------------- rivals ----------------
const RIVALS = [
  { name: 'CAPTAIN CLYDE', suit: '#14a3a3', red: '#f2c200', cape: '#f2c200',
    hello: ['CAPTAIN CLYDE: Well well. If it isnae Wally Man. Still flying like a shopping trolley?', 'CAPTAIN CLYDE: Race ye tae the {place}. Loser buys the chips.'],
    win: 'CAPTAIN CLYDE: Too slow, Wally! Ma granny flies faster, and she\'s a pigeon fancier.', lose: 'CAPTAIN CLYDE: Ach! Beginner\'s luck! The wind was against me! And the rain! And ma cape!' },
  { name: 'TARTAN AVENGER', suit: '#1f6b3a', red: '#c0392b', cape: '#a51d2d',
    hello: ['TARTAN AVENGER: Wally Man! I am the Tartan Avenger. Ye might have heard of me.', 'WALLY MAN: Naw.', 'TARTAN AVENGER: ...Race ye tae the {place}!'],
    win: 'TARTAN AVENGER: Victory for the tartan! Away and practise, Wally!', lose: 'TARTAN AVENGER: I let ye win. Because I am kind. And also slow.' },
];

export function initExtras(game, scene, world) {
  const E = { done: new Set(), rivalWins: 0, rivalLosses: 0, helisDowned: 0 };
  const A = () => game.audio, P = () => game.player;
  game.extraTargets = [];

  // ======================= rampages =======================
  const tokMat = new THREE.MeshStandardMaterial({ color: '#d1142c', emissive: '#ff2a2a', emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.3 });
  const tokGeo = new THREE.OctahedronGeometry(0.45, 0);
  const ringGeo = new THREE.TorusGeometry(0.75, 0.05, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23f' });
  const tokens = [];
  // one token in each of six spread-out blocks, on the pavement corner
  [[1, 1], [6, 1], [1, 6], [6, 6], [3, 4], [5, 2]].forEach(([bx, bz], i) => {
    const R = RAMPAGES[i];
    const x = blockMin(bx) + 3, z = blockMin(bz) + 3;
    const g = new THREE.Group(); const t = new THREE.Mesh(tokGeo, tokMat); t.position.y = 1.2; t.castShadow = true; g.add(t);
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.1; g.add(ring);
    g.position.set(x, world.groundHeight(x, z, 1), z); scene.add(g);
    tokens.push({ R, x, z, g, t, cool: 0 });
    game.staticBlips.push({ x, z, col: '#d1142c', shape: 'sq', token: R.id });
  });
  let rampage = null;
  game.onPedHit = (p) => {
    if (rampage && !rampage.hit.has(p)) {
      rampage.hit.add(p);
      A().tone(1200, 0.06, 'square', 0.08);
      if (rampage.hit.size >= rampage.R.need) finishRampage(true);
    }
  };
  function startRampage(tok) {
    const R = tok.R, pl = P();
    pl.giveWeapon(R.weapon, R.ammo); pl.weapon = R.weapon;
    rampage = { R, tok, t: R.time, hit: new Set() };
    game.rampage = true;
    game.bigText(R.title, `${R.blurb} in ${R.time} seconds!`, 2.6);
    A().pass();
    tok.g.visible = false;
  }
  function finishRampage(ok) {
    const { R, tok } = rampage;
    rampage = null; game.rampage = false; game.timer(null); game.objective('');
    if (ok) {
      E.done.add(R.id); P().money += 1500; A().pass();
      game.bigText('RAMPAGE COMPLETE!', '+$1500', 3);
      game.quip(["Absolute carnage! Mammy's gonnae see this on the news.", 'Rampage done! I need a wee lie doon.', 'That was cathartic. And probably illegal.'], 1, true);
      scene.remove(tok.g); game.staticBlips = game.staticBlips.filter((b) => b.token !== R.id);
      if (E.done.size === RAMPAGES.length) { P().money += 5000; game.toast('All six rampages! +$5000. Wallypool will never be the same.'); }
    } else {
      game.bigText('RAMPAGE FAILED', 'Hopeless.', 2.4, true); A().fail();
      tok.cool = 20; tok.g.visible = true;
    }
  }
  function updateRampages(dt) {
    const pl = P(), t = performance.now() / 1000;
    for (const tok of tokens) {
      if (E.done.has(tok.R.id)) { tok.g.visible = false; continue; }
      tok.t.rotation.y = t * 2; tok.t.position.y = 1.2 + Math.sin(t * 3) * 0.12;
      tok.cool -= dt;
      if (rampage || tok.cool > 0 || pl.car || pl.dead || game.mission || game.inside) continue;
      if (Math.hypot(pl.x - tok.x, pl.z - tok.z) < 1.3) startRampage(tok);
    }
    if (rampage) {
      rampage.t -= dt; game.timer(rampage.t);
      game.objective(`${rampage.R.title}: ~r~${rampage.hit.size} / ${rampage.R.need}~w~`);
      if (rampage.t <= 0 || pl.dead) finishRampage(false);
    }
  }

  // ======================= rival superheroes =======================
  let rival = null, rivalCool = 200 + Math.random() * 120;
  function buildRival(R) {
    const h = buildHuman({ wally: true });
    h.root.traverse((m) => {
      if (!m.isMesh) return;
      for (const mt of Array.isArray(m.material) ? m.material : [m.material]) {
        if (!mt.color) continue;
        const hx = mt.color.getHexString();
        if (mt.map && m.userData.acc && m.geometry.type === 'PlaneGeometry' && !m.userData.base) m.visible = false; // no WALLY MAN badge on a rival
        if (hx === '1f5fc4') { mt.color.set(R.suit); } else if (hx === 'e0471c') mt.color.set(R.red); else if (hx === 'e14a1e') mt.color.set(R.cape);
      }
    });
    return h;
  }
  function placeName(x, z) {
    const S = world.specials, opts = [['Hero Square statue', S.plaza, -14], ['Polis station', S.police, -5], ['Infirmary', S.hospital, -5], ['Wally Wash', S.garage, -6]];
    const far = opts.filter(([, s]) => s && Math.hypot(s.x - x, s.z - z) > 140);
    return pick(far.length ? far : opts);
  }
  function startRival() {
    const pl = P(), R = RIVALS[(E.rivalWins + E.rivalLosses) % RIVALS.length];
    const [name, s, dz] = placeName(pl.x, pl.z);
    const h = buildRival(R); scene.add(h.root);
    rival = { R, h, x: pl.x + 6, z: pl.z + 6, y: 40, state: 'land', t: 0, target: { x: s.x, z: s.z + dz, name } };
    rival.m = game.marker(rival.target.x, rival.target.z, 'check', 5);
    game.setGps(rival.target.x, rival.target.z);
    game.subs(R.hello.map((l) => l.replace('{place}', name)));
    game.toast(`Race ${R.name} to the ${name}! First one there wins $750.`);
  }
  function endRival(wallyWon) {
    const R = rival.R;
    game.removeMarker(rival.m); game.setGps(null);
    if (wallyWon) { E.rivalLosses++; P().money += 750; A().pass(); game.bigText('YA DANCER!', `Beat ${R.name}. +$750`, 2.6); game.subs([R.lose]); }
    else { E.rivalWins++; A().fail(); game.bigText('BEATEN!', `${R.name} got there first`, 2.4, true); game.subs([R.win, "WALLY MAN: He cheated. I'm sure he cheated. Somehow."]); }
    rival.state = 'leave'; rival.t = 0;
  }
  function updateRival(dt) {
    const pl = P();
    if (!rival) {
      rivalCool -= dt;
      if (rivalCool <= 0 && !game.mission && !game.inside && game.wanted.level === 0 && !rampage && !pl.dead && !game.cuffs) { rivalCool = 280 + Math.random() * 160; startRival(); }
      return;
    }
    const r = rival; r.t += dt;
    if (r.state === 'land') { // drops out the sky next to Wally, then gives him a head start
      r.y = Math.max(world.groundHeight(r.x, r.z, 1), r.y - dt * 18);
      if (r.t > 6) { r.state = 'race'; r.t = 0; game.toast('GO!'); A().checkpoint(); }
    } else if (r.state === 'race') {
      const dx = r.target.x - r.x, dz = r.target.z - r.z, d = Math.hypot(dx, dz);
      const sp = 9.5 + Math.min(4, r.t * 0.05); // he gets a wee bit faster the longer it goes on
      if (d > 1) { r.x += dx / d * sp * dt; r.z += dz / d * sp * dt; }
      r.y += ((d < 12 ? world.groundHeight(r.x, r.z, 1) : 9) - r.y) * Math.min(1, dt * 2);
      r.h.root.rotation.y = Math.atan2(dx, dz);
      const px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
      if (game.inMarker(r.m, px, pz)) endRival(true);
      else if (d < 3) endRival(false);
      else if (game.mission || pl.dead) { game.removeMarker(r.m); game.setGps(null); r.state = 'leave'; r.t = 0; }
    } else if (r.state === 'leave') {
      r.y += dt * 14;
      if (r.t > 4) { scene.remove(r.h.root); rival = null; return; }
    }
    r.h.root.position.set(r.x, r.y, r.z);
    animateHuman(r.h, dt, { speed: 0, mode: r.state === 'land' && r.y <= world.groundHeight(r.x, r.z, 1) + 0.05 ? 'move' : 'fly', capeLift: r.state === 'race' ? 1.2 : 0.4 });
  }

  // ======================= polis helicopter =======================
  let heli = null, heliCool = 0, chopT = 0;
  // the searchlight lives in the scene from the start (switched off): adding a light mid-game would make
  // every material recompile its shader, which shows up as a stutter
  const heliSpot = new THREE.SpotLight('#fff6dd', 0, 80, 0.2, 0.5, 1.4);
  scene.add(heliSpot, heliSpot.target);
  function buildHeli() {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.4, metalness: 0.3 });
    const blue = new THREE.MeshStandardMaterial({ color: '#1a3fa8', roughness: 0.4 });
    const yellow = new THREE.MeshStandardMaterial({ color: '#f2e21a', roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1b1d21', roughness: 0.5, metalness: 0.5 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#1f2c38', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.75 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 2.2, 6, 16), white); body.rotation.x = Math.PI / 2; body.scale.set(1, 1, 0.85); g.add(body);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.5, 16, 1, true), blue); stripe.rotation.x = Math.PI / 2; stripe.scale.set(1, 1, 0.85); stripe.position.z = -0.3; g.add(stripe);
    const check = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.18, 16, 1, true), yellow); check.rotation.x = Math.PI / 2; check.scale.set(1, 1, 0.85); check.position.z = 0.15; g.add(check);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass); nose.rotation.x = Math.PI / 2; nose.position.z = 1.5; nose.scale.set(1, 1, 0.9); g.add(nose);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 4.2, 10), white); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.3, -3.6); g.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.7), blue); fin.position.set(0, 0.8, -5.5); g.add(fin);
    const tail = new THREE.Group(); tail.position.set(0.2, 0.9, -5.6); g.add(tail);
    for (const a of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.3, 0.12), dark); b.rotation.x = a; tail.add(b); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), dark); mast.position.set(0, 1.25, 0.2); g.add(mast);
    const rotor = new THREE.Group(); rotor.position.set(0, 1.55, 0.2); g.add(rotor);
    for (const a of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 0.28), dark); b.rotation.y = a; rotor.add(b); }
    for (const sx of [-1, 1]) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8), dark); sk.rotation.x = Math.PI / 2; sk.position.set(sx * 0.9, -1.35, 0.2); g.add(sk); for (const sz of [-0.8, 1.1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), dark); st.position.set(sx * 0.8, -1.05, sz); st.rotation.z = sx * 0.3; g.add(st); } }
    // the searchlight: a real spotlight, plus a visible cone of light at night
    const spot = heliSpot;
    const coneMat = new THREE.MeshBasicMaterial({ color: '#fff6dd', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 30, 20, 1, true).translate(0, -15, 0), coneMat); cone.position.set(0, -1.2, 1.4); g.add(cone);
    g.traverse((m) => { if (m.isMesh && m !== cone) m.castShadow = true; });
    scene.add(g);
    return { g, rotor, tail, spot, cone, coneMat };
  }
  function spawnHeli() {
    const pl = P(), a = Math.random() * Math.PI * 2;
    const m = buildHeli();
    heli = { ...m, x: pl.x + Math.cos(a) * 160, z: pl.z + Math.sin(a) * 160, y: 45, vx: 0, vz: 0, hp: 450, fireT: 4, dead: false, fall: 0, heading: 0 };
    heli.target = { get x() { return heli.x; }, get z() { return heli.z; }, get y() { return heli.y; }, r: 2.6, hit: (dmg) => damageHeli(dmg) };
    game.extraTargets.push(heli.target);
    game.toast('🚁 The polis helicopter is up!');
    game.quip(["A helicopter?! For me? I'm flattered.", 'Oh great, now the polis have a helicopter. And I cannae even afford a bike.'], 1, true);
  }
  function damageHeli(dmg) {
    if (!heli || heli.dead) return;
    heli.hp -= dmg; game.puff(heli.x, heli.y, heli.z, { color: '#ffd080', add: true, life: 0.2, size: 0.6, opacity: 1 });
    if (heli.hp <= 0) {
      heli.dead = true; heli.vy = 0; E.helisDowned++;
      game.onExplosion(heli.x, heli.y, heli.z, null);
      game.wanted.add(4);
      game.bigText('HELICOPTER DOWN!', 'That\'ll be on the news.', 2.4);
    }
  }
  function removeHeli() {
    heliSpot.intensity = 0;
    scene.remove(heli.g);
    heli.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material && !m.isLight) m.material.dispose(); });
    game.extraTargets = game.extraTargets.filter((t) => t !== heli.target);
    heli = null;
  }
  function updateHeli(dt) {
    const pl = P(), lvl = game.wanted.level;
    heliCool -= dt;
    if (!heli) { if (lvl >= 4 && heliCool <= 0 && !game.inside && !pl.dead) spawnHeli(); return; }
    const h = heli, px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
    h.rotor.rotation.y += dt * (h.dead ? 14 : 28); h.tail.rotation.x += dt * 40;
    if (h.dead) { // spins and falls, then a second bang on the ground
      h.vy = (h.vy || 0) - 14 * dt; h.y += h.vy * dt; h.g.rotation.y += dt * 4;
      if (Math.random() < dt * 30) game.puff(h.x, h.y, h.z, { color: '#222', life: 1.5, size: 1.2, grow: 2, vy: 1, opacity: 0.6 });
      if (h.y <= world.groundHeight(h.x, h.z, h.y + 2) + 0.8) { game.onExplosion(h.x, h.y, h.z, null); heliCool = 90; removeHeli(); }
      else h.g.position.set(h.x, h.y, h.z);
      return;
    }
    const leaving = lvl < 4 || pl.dead || game.inside;
    // hover above and a little behind Wally, tilting into the turn
    const tx = leaving ? h.x + (h.x - px) : px + Math.sin(performance.now() / 4000) * 18, tz = leaving ? h.z + (h.z - pz) : pz + Math.cos(performance.now() / 4000) * 18;
    const ty = leaving ? 70 : 24;
    const dx = tx - h.x, dz = tz - h.z;
    h.vx += (dx * 0.5 - h.vx) * Math.min(1, dt * 0.8); h.vz += (dz * 0.5 - h.vz) * Math.min(1, dt * 0.8);
    const sp = Math.hypot(h.vx, h.vz), max = 22; if (sp > max) { h.vx *= max / sp; h.vz *= max / sp; }
    h.x += h.vx * dt; h.z += h.vz * dt; h.y += (ty - h.y) * Math.min(1, dt * 0.6);
    h.heading = Math.atan2(px - h.x, pz - h.z);
    h.g.position.set(h.x, h.y, h.z);
    h.g.rotation.set(Math.min(0.3, sp * 0.012), h.heading, 0);
    // searchlight on Wally (and a visible beam at night)
    h.spot.intensity = game.night > 0.25 ? 260 : 0;
    h.spot.position.set(h.x, h.y - 1.2, h.z); h.spot.target.position.set(px, 0.5, pz);
    h.cone.visible = game.night > 0.25;
    if (h.cone.visible) { h.cone.lookAt(px, 0, pz); h.cone.rotateX(-Math.PI / 2); h.coneMat.opacity = 0.07 * Math.min(1, (game.night - 0.25) * 3); }
    // rotor chop, louder close by
    const dd = Math.hypot(h.x - pl.x, h.z - pl.z);
    chopT -= dt; if (chopT <= 0 && dd < 160) { chopT = 0.085; A().noise(0.06, 260, 0.28 * (1 - dd / 160)); }
    // a marksman leans out and takes potshots
    h.fireT -= dt;
    if (!leaving && h.fireT <= 0 && dd < 60) { h.fireT = 2.4 + Math.random() * 1.6; game.npcShoot({ x: h.x, y: h.y - 2.6, z: h.z, cop: true }, px, pz); }
    if (leaving && dd > 220) { heliCool = 30; removeHeli(); }
  }

  // ======================= roadblocks =======================
  let blocks = [], blockCool = 0;
  function spawnRoadblock() {
    const pl = P(), c = pl.car; if (!c) return;
    const [fx, fz] = c.forward(), alongX = Math.abs(fx) > Math.abs(fz);
    // the road Wally is on, about 80 m ahead
    const ahead = 80, sgn = Math.sign(alongX ? fx : fz) || 1;
    let roadIdx = 0, best = 1e9;
    for (let i = 0; i <= N; i++) { const d = Math.abs(roadC(i) - (alongX ? c.z : c.x)); if (d < best) { best = d; roadIdx = i; } }
    if (best > ROAD / 2) return; // not on a straight road just now
    const lineC = roadC(roadIdx), along = (alongX ? c.x : c.z) + sgn * ahead;
    const made = { cars: [], peds: [] };
    for (const off of [-3.4, 3.4]) {
      const x = alongX ? along : lineC + off, z = alongX ? lineC + off : along;
      if (world.collide(x, z, 1.5, 0).hit) continue;
      const pc = game.spawnCar('police', x, z, alongX ? 0 : Math.PI / 2); pc.parked = true; pc.sirenOn = true; pc.roadblock = true;
      made.cars.push(pc);
      const cop = game.spawnPed(x + (alongX ? -sgn * 3 : 2), z + (alongX ? 2 : -sgn * 3), { cop: true }); cop.aggro = true; made.peds.push(cop);
    }
    if (made.cars.length) { blocks.push(made); game.toast('🚧 Roadblock ahead!'); }
  }
  function updateRoadblocks(dt) {
    const pl = P();
    blockCool -= dt;
    if (game.wanted.level >= 3 && pl.car && blockCool <= 0 && blocks.length < 2) { blockCool = 35; spawnRoadblock(); }
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i], far = b.cars.every((c) => c.dead || Math.hypot(c.x - pl.x, c.z - pl.z) > 160);
      if (game.wanted.level === 0 || far) {
        for (const c of b.cars) if (!c.dead && pl.car !== c) game.removeCar(c);
        blocks.splice(i, 1);
      }
    }
  }

  E.update = (dt) => {
    updateRampages(dt); updateRival(dt); updateHeli(dt); updateRoadblocks(dt);
  };
  E.save = () => ({ rampages: [...E.done], rivalWins: E.rivalWins, rivalLosses: E.rivalLosses, helis: E.helisDowned });
  E.load = (s) => { E.done = new Set((s && s.rampages) || []); E.rivalWins = (s && s.rivalWins) || 0; E.rivalLosses = (s && s.rivalLosses) || 0; E.helisDowned = (s && s.helis) || 0; for (const t of tokens) { t.g.visible = !E.done.has(t.R.id); if (E.done.has(t.R.id)) game.staticBlips = game.staticBlips.filter((b) => b.token !== t.R.id); } };
  // for testing from the console: game.extras.test.rival() / .heli()
  E.test = { rival: () => { if (!rival) startRival(); }, heli: () => { if (!heli) spawnHeli(); const pl = P(); heli.x = pl.x + 6; heli.z = pl.z - 22; heli.y = 20; } };
  E.stats = () => `Rampages: ${E.done.size} / ${RAMPAGES.length} · Races won: ${E.rivalLosses} · Helicopters downed: ${E.helisDowned}`;
  return E;
}
