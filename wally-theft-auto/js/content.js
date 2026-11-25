// Extra things to do around Wallypool: ice cream and taxi side jobs, Granda's Armoury,
// stunt ramps and the seagulls.
import * as THREE from 'three';
import { N, P, HALF, ROAD, LANE, KERB, roadC, blockMin, blockMax } from './city.js';
import { addLivery } from './vehicles.js';
import { WEAPONS } from './weapons.js';

const $ = (id) => document.getElementById(id);
const pick = (a) => a[(Math.random() * a.length) | 0];

export function initContent(game, scene, world) {
  const C = { stunts: new Set(), iceSold: 0, fares: 0 };
  game.staticBlips = game.staticBlips || [];

  // ================= stunt ramps =================
  const rampMat = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d');
    for (let i = -32; i < 160; i += 32) { x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 0); x.lineTo(i + 32, 32); x.lineTo(i + 16, 32); x.fill(); }
    x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#151515'; x.fillRect(0, 0, 128, 32);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return [new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })];
  })();
  // [axis, road index, segment index, direction]: each ramp sits in the left-hand lane of a straight road
  const RAMPS = [['x', 2, 4, 1], ['z', 4, 5, 1], ['x', 5, 1, -1], ['z', 7, 2, -1], ['x', 6, 6, 1], ['z', 1, 1, 1]];
  game.ramps = RAMPS.map(([axis, ri, si, dir], idx) => {
    const c = roadC(ri), a = roadC(si) + ROAD / 2, b = roadC(si + 1) - ROAD / 2;
    const L = 7, H = 1.7, W = 4.2;
    let x, z, dx, dz;
    if (axis === 'x') { dx = dir; dz = 0; z = c - LANE * dir; x = dir > 0 ? a + 16 : b - 16; }
    else { dx = 0; dz = dir; x = c + LANE * dir; z = dir > 0 ? a + 16 : b - 16; }
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(L, H); shape.lineTo(L, 0); shape.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
    g.translate(0, 0, -W / 2); g.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(g, rampMat); m.position.set(x, 0, z); m.rotation.y = Math.atan2(dx, dz);
    m.castShadow = m.receiveShadow = true; scene.add(m);
    game.staticBlips.push({ x: x + dx * L / 2, z: z + dz * L / 2, col: '#ff9a3c', shape: 'tri' });
    return { idx, x, z, dx, dz, l: L, h: H, w: W };
  });
  game.timeScale = 1;
  game.onStunt = (phase, car, thump) => {
    if (car !== game.player.car) return;
    if (phase === 'launch') { game.audio.tone(300, 0.5, 'sawtooth', 0.1, 600); return; }
    const air = car.airT || 0, dist = car.launch ? Math.hypot(car.x - car.launch[0], car.z - car.launch[1]) : 0;
    let cash = Math.round(40 + air * 160 + dist * 4);
    const insane = air > 1.5 || dist > 35;
    let line = `${dist.toFixed(0)}m, ${air.toFixed(1)}s in the air`;
    if (car.lastRamp && !C.stunts.has(car.lastRamp.idx)) { C.stunts.add(car.lastRamp.idx); cash += 250; line += ` · Unique jump ${C.stunts.size}/${game.ramps.length}`; if (C.stunts.size === game.ramps.length) { cash += 5000; line += ' · ALL JUMPS! +$5000'; } }
    game.player.money += cash; game.audio.pass();
    game.bigText(insane ? 'INSANE STUNT BONUS!' : 'STUNT BONUS', `+$${cash} · ${line}`, 2.6);
    game.quip && game.quip('stunt', insane ? 1 : 0.5, true);
    game.stats.stunts = (game.stats.stunts || 0) + 1;
  };

  // ================= Granda's Armoury =================
  const shopBlock = world.blocks[1 * N + 2];
  const shopX = (shopBlock.x0 + shopBlock.x1) / 2, shopZ = shopBlock.z0 + 2.2;
  game.addSign("GRANDA'S ARMOURY", '#4a1010', '#ffd23f', shopX, shopBlock.z0 + 3.2);
  const shopMk = game.marker(shopX, shopZ, 'pickup', 1.1); shopMk.persistent = true;
  game.shopPos = { x: shopX, z: shopZ };
  const STOCK = [
    ['blaster', 150], ['scatter', 300], ['laser', 500], ['gatling', 900], ['sniper', 700], ['soaker', 100], ['tattie', 200],
    ['haggis', 1200], ['flame', 800], ['neep', 250], ['claymore', 250], ['pan', 60], ['bagpipes', 400], ['club', 80],
    ['revolver', 350], ['smg', 600], ['rifle', 1000], ['double', 450], ['nailgun', 250], ['taser', 200], ['crossbow', 550], ['shinty', 90], ['caber', 1500], ['flamer', 1400],
  ];
  function renderShop() {
    const pl = game.player;
    const rows = STOCK.map(([id, price]) => {
      const W = WEAPONS[id], have = pl.owned[id], amt = W.pickup ? ` +${W.pickup}` : '';
      return `<button class="shopItem" data-id="${id}" data-price="${price}" ${pl.money < price ? 'disabled' : ''}><span>${W.icon}</span><b>${W.name}</b><i>${have ? (W.pickup ? 'ammo' + amt : 'owned') : 'buy' + amt}</i><em>$${price}</em></button>`;
    });
    rows.push(`<button class="shopItem" data-id="armour" data-price="200" ${pl.money < 200 ? 'disabled' : ''}><span>🛡</span><b>Body Armour</b><i>full</i><em>$200</em></button>`);
    rows.push(`<button class="shopItem" data-id="health" data-price="80" ${pl.money < 80 ? 'disabled' : ''}><span>❤</span><b>Fizzy Ginger Juice</b><i>full health</i><em>$80</em></button>`);
    $('shopList').innerHTML = rows.join('');
    $('shopMoney').textContent = '$' + Math.floor(pl.money);
    for (const b of document.querySelectorAll('.shopItem')) b.onclick = () => buy(b.dataset.id, +b.dataset.price);
  }
  function buy(id, price) {
    const pl = game.player; if (pl.money < price) return;
    if (id === 'armour') { if (pl.armour >= 100) return; pl.armour = 100; }
    else if (id === 'health') { if (pl.health >= 100) return; pl.health = 100; }
    else { const W = WEAPONS[id]; if (pl.owned[id] && !W.pickup) return; pl.giveWeapon(id, W.pickup || 0); pl.weapon = id; }
    pl.money -= price; game.audio.cash(); renderShop();
  }
  function openShop() {
    game.shopOpen = true; $('shop').classList.remove('hidden'); renderShop();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  game.closeShop = () => { game.shopOpen = false; $('shop').classList.add('hidden'); C.shopCool = performance.now() + 2500; game.relock && game.relock(); };
  $('shopClose').onclick = () => game.closeShop();

  // ================= ice cream van =================
  let iceCool = 0, chimeT = 0;
  game.onIceCream = (p) => {
    const price = 10 + ((Math.random() * 25) | 0);
    game.player.money += price; game.audio.cash(); C.iceSold++;
    game.say(p, pick(['A 99 wi\' a flake please!', 'Raspberry sauce, mind!', 'Two scoops, Wally!', 'Is that a real superhero?', 'Ma wean wants a slider.']));
    game.toast(`🍦 Sold an ice cream: +$${price} (${C.iceSold} today)`);
  };
  function updateIceCream(dt) {
    const c = game.player.car;
    if (!c || c.type !== 'icecream' || c.speed > 0.6 || game.inside) { iceCool = 0; return; }
    iceCool += dt;
    if (iceCool < 1) return;
    chimeT -= dt;
    if (chimeT <= 0) {
      chimeT = 5;
      game.audio.chimes();
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      const hatch = [c.x - fz * (c.T.wid / 2 + 1.1), c.z + fx * (c.T.wid / 2 + 1.1)]; // serving hatch on the van's right
      let n = 0;
      for (const p of game.peds.list) {
        if (n >= 3 || p.state !== 'walk' || p.cop || p.thug || p.mission) continue;
        if (Math.hypot(p.x - c.x, p.z - c.z) > 30) continue;
        p.state = 'icecream'; p.iceAt = [hatch[0] + (Math.random() - 0.5) * 1.5, hatch[1] + (Math.random() - 0.5) * 1.5]; p.iceT = 18; n++;
      }
      if (n) game.toast('🎵 Greensleeves... Customers are on their way!');
    }
  }

  // ================= Wally Cabs (taxi job) =================
  const cab = { on: false, stage: 'seek', fare: null, dest: null, t: 0, arrow: null };
  const arrowMesh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 4), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb300', emissiveIntensity: 1 }));
  arrowMesh.rotation.x = Math.PI; arrowMesh.visible = false; scene.add(arrowMesh);
  function endCab(msg) {
    if (!cab.on) return;
    cab.on = false; arrowMesh.visible = false;
    if (cab.fare) { cab.fare.mission = false; cab.fare = null; }
    game.removeMarker(cab.dest); cab.dest = null;
    if (!game.mission) { game.setGps(null); game.timer(null); game.objective(''); } // don't trample a mission that just started
    if (msg) game.toast(msg);
  }
  function randomDest(px, pz) {
    for (let k = 0; k < 40; k++) {
      const b = world.blocks[(Math.random() * world.blocks.length) | 0];
      const x = (b.x0 + b.x1) / 2 + (Math.random() - 0.5) * 30, z = Math.random() < 0.5 ? b.z0 - 2 : b.z1 + 2;
      const d = Math.hypot(x - px, z - pz);
      if (d > 140 && d < 380) return [x, z, d];
    }
    return [0, -1, 200];
  }
  function updateCab(dt) {
    const pl = game.player, c = pl.car;
    if (!c || c.type !== 'taxi' || game.mission || pl.dead) { endCab(cab.on ? 'Wally Cabs: off duty.' : null); return; }
    if (!cab.on) { cab.on = true; cab.stage = 'seek'; game.toast('🚕 Wally Cabs! Find fares (yellow arrows) and get them where they\'re going.'); }
    if (cab.stage === 'seek') {
      if (!cab.fare || cab.fare.state === 'dead' || !game.peds.list.includes(cab.fare)) {
        cab.fare = game.peds.spawnNear(c.x, c.z, { min: 45, max: 130 });
        if (cab.fare) { cab.fare.mission = true; cab.fare.walkSpeed = 0.6; }
        return;
      }
      const f = cab.fare;
      arrowMesh.visible = true; arrowMesh.position.set(f.x, f.y + 2.8 + Math.sin(performance.now() / 200) * 0.15, f.z); arrowMesh.rotation.y += dt * 3;
      game.setGps(f.x, f.z);
      game.objective(`Wally Cabs: pick up the ~y~fare~w~. (${C.fares} fares done)`);
      if (Math.hypot(f.x - c.x, f.z - c.z) < 6 && c.speed < 2) {
        game.say(f, pick(['Take me tae the shops, pal.', 'Follow that car! ...Naw, only kiddin\'.', 'Are you... Wally Man?', 'Nae funny business.']));
        f.remove(); game.peds.list.splice(game.peds.list.indexOf(f), 1); cab.fare = null; arrowMesh.visible = false;
        const [x, z, d] = randomDest(c.x, c.z);
        cab.dest = game.marker(x, z, 'dest', 4.5); cab.dist = d; cab.t = d / 8.5 + 14; cab.stage = 'ride';
        game.setGps(x, z); game.audio.door();
      }
    } else {
      cab.t -= dt; game.timer(cab.t);
      game.objective('Wally Cabs: get the fare to the ~y~drop-off~w~!');
      if (cab.t <= 0) { game.removeMarker(cab.dest); cab.dest = null; game.timer(null); cab.stage = 'seek'; game.toast('The fare got fed up and jumped oot. No tip.'); return; }
      if (game.inMarker(cab.dest, c.x, c.z) && c.speed < 3) {
        const pay = Math.round(25 + cab.dist * 0.15 + cab.t * 2);
        pl.money += pay; C.fares++; game.audio.cash();
        let msg = `🚕 Fare paid: $${pay}`;
        if (C.fares % 5 === 0) { pl.money += 300; msg += ` · ${C.fares} fares! Bonus $300`; }
        game.toast(msg); game.removeMarker(cab.dest); cab.dest = null; game.timer(null); cab.stage = 'seek';
      }
    }
  }

  // ================= seagulls =================
  const gulls = [];
  const gullM = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.8 }), tipM = new THREE.MeshStandardMaterial({ color: '#555a60', roughness: 0.8 });
  const centres = [[0, HALF - 20], [world.specials.plaza.x, world.specials.plaza.z], [-HALF + 40, 0], [HALF - 40, -HALF + 60]];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.35, 4, 8), gullM); body.rotation.x = Math.PI / 2; g.add(body);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), new THREE.MeshStandardMaterial({ color: '#f2b11a' })); beak.rotation.x = Math.PI / 2; beak.position.z = 0.32; g.add(beak);
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.x = s * 0.08; g.add(w);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.22), gullM); inner.position.x = s * 0.28; w.add(inner);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.16), tipM); tip.position.x = s * 0.72; w.add(tip);
      wings.push(w);
    }
    const [cx, cz] = centres[i % centres.length];
    gulls.push({ g, wings, cx: cx + (Math.random() - 0.5) * 30, cz: cz + (Math.random() - 0.5) * 30, r: 15 + Math.random() * 30, h: 22 + Math.random() * 18, a: Math.random() * 6.28, sp: (0.25 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1), scare: 0, t: Math.random() * 10 });
    scene.add(g);
  }
  function updateGulls(dt) {
    const px = game.player.x, pz = game.player.z;
    for (const b of gulls) {
      b.t += dt;
      if (game.alarm && Math.hypot(game.alarm[0] - b.cx, game.alarm[1] - b.cz) < 60) b.scare = 4;
      b.scare = Math.max(0, b.scare - dt);
      const sp = b.sp * (1 + b.scare * 0.8);
      b.a += sp * dt;
      const h = b.h + b.scare * 6 + Math.sin(b.t * 0.7) * 2;
      b.g.position.set(b.cx + Math.cos(b.a) * b.r, h, b.cz + Math.sin(b.a) * b.r);
      b.g.rotation.y = -b.a + (sp > 0 ? 0 : Math.PI);
      b.g.rotation.z = sp > 0 ? 0.25 : -0.25;
      const flap = Math.sin(b.t * (b.scare > 0 ? 18 : 7)) * (b.scare > 0 ? 0.8 : 0.35);
      b.wings[0].rotation.z = flap; b.wings[1].rotation.z = -flap;
      b.g.visible = !game.inside && Math.abs(b.g.position.x - px) < 220 && Math.abs(b.g.position.z - pz) < 220;
      if (b.g.visible && Math.random() < dt * 0.04 && Math.hypot(b.g.position.x - px, b.g.position.z - pz) < 40) game.audio.gull();
    }
  }

  // ================= per-frame =================
  C.shopCool = 0;
  C.update = (dt, inp) => {
    updateIceCream(dt);
    updateCab(dt);
    updateGulls(dt);
    // walk into the shop's ring to browse
    const pl = game.player;
    if (!pl.car && !pl.dead && !game.inside && !game.shopOpen && performance.now() > C.shopCool && Math.hypot(pl.x - shopX, pl.z - shopZ) < 1.1) openShop();
  };
  C.endJobs = () => endCab();
  C.save = () => ({ stunts: [...C.stunts], iceSold: C.iceSold, fares: C.fares });
  C.load = (s) => { C.stunts = new Set((s && s.stunts) || []); C.iceSold = (s && s.iceSold) || 0; C.fares = (s && s.fares) || 0; };
  C.stats = () => `Stunt jumps: ${C.stunts.size} / ${game.ramps.length} · Taxi fares: ${C.fares} · Ice creams sold: ${C.iceSold}`;
  // an ice cream van parked near Hero Square, ready to go
  C.placeVans = () => {
    const s = world.specials.plaza;
    if (!game.cars.some((c) => c.type === 'icecream' && Math.hypot(c.x - s.x, c.z - s.z) < 60)) {
      const b = world.blocks.find((q) => q.kind === 'plaza');
      const v = game.spawnCar('icecream', b.x0 + 12, b.z0 - 1.6, -Math.PI / 2); v.parked = true; v.name = 'Mr Fudge';
      addLivery(v, 'MR FUDGE', 'Ices & 99s', '#c2185b');
    }
    const h = world.specials.home;
    if (!game.cars.some((c) => c.type === 'taxi' && Math.hypot(c.x - h.x, c.z - h.z) < 40)) {
      const t = game.spawnCar('taxi', h.x + 16, h.z - 3.4, -Math.PI / 2); t.parked = true;
    }
  };
  return C;
}
