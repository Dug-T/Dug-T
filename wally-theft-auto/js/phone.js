// Wally's phone (map, contacts, camera, property, stats), property you can buy for income,
// and photo mode. Opened with T, the 📱 button, or Back/View on a controller.
import * as THREE from 'three';
import { blockMin, blockMax } from './city.js';
import { CALLS } from './voice.js';

const $ = (id) => document.getElementById(id);
const pick = (a) => a[(Math.random() * a.length) | 0];
const money = (n) => '$' + Math.round(n).toLocaleString('en-GB');

const PROPERTIES = [
  { id: 'chippy', name: 'The Chippy', price: 4000, income: 40, at: [2, 1], blurb: 'Fish suppers. The backbone of Scotland.' },
  { id: 'pie', name: 'Pie Palace', price: 6000, income: 60, at: [4, 6], blurb: 'Scotch pies, steak pies, pies of mystery.' },
  { id: 'haggis', name: 'Haggis Hut', price: 8000, income: 85, at: [6, 4], blurb: 'Haggis, neeps and tatties. Wi\' a deep-fried option.' },
  { id: 'wash', name: 'Wally Wash', price: 10000, income: 110, at: 'garage', blurb: 'Fresh paint, nae polis, nae questions.' },
  { id: 'neep', name: 'Neep Market', price: 12000, income: 130, at: [1, 3], blurb: 'The finest turnips in the west.' },
];
// who Wally can phone, and what happens when he does
const CONTACTS = [
  { name: 'MAMMY WALLY', who: 'Mammy', icon: '👩‍🦰' },
  { name: 'GRANDA', who: 'Granda', icon: '👴' },
  { name: 'BIG DAVIE', who: 'Big Davie', icon: '🧔' },
  { name: 'UNCLE TAM', who: 'Uncle Tam', icon: '🧢' },
  { name: 'AUNTIE SENGA', who: 'Auntie Senga', icon: '👵' },
  { name: 'MR FUDGE', who: 'Mr Fudge', icon: '🍦' },
];

export function initPhone(game, scene, world) {
  const F = { owned: new Set(), till: 0, earned: 0 };
  const P = () => game.player;

  // ======================= property =======================
  const props = PROPERTIES.map((p) => {
    let x, z;
    if (p.at === 'garage') { const g = world.specials.garage; x = g.x + 7; z = g.z - 2; }
    else { const [bx, bz] = p.at; x = (blockMin(bx) + blockMax(bx)) / 2 + 6; z = blockMin(bz) + 1.6; }
    const sign = game.addSign('FOR SALE', '#1e6b3a', '#ffffff', x, z + 0.4);
    const m = game.marker(x, z - 1.2, 'pickup', 1.6); m.persistent = true;
    const blip = { x, z, col: '#2ecc71', shape: 'sq', prop: p.id };
    game.staticBlips.push(blip);
    return { ...p, x, z: z - 1.2, sign, m, blip };
  });
  let lastHour = -1, payT = 0;
  function refreshProps() {
    for (const p of props) {
      const own = F.owned.has(p.id);
      p.sign.visible = !own; p.m.obj.visible = !own;
      p.blip.col = own ? '#ffd23f' : '#2ecc71';
    }
  }
  function updateProperty(dt, inp) {
    const pl = P();
    // income every game hour, paid in a lump every few hours
    const hr = Math.floor(game.time / 60);
    if (lastHour >= 0 && hr !== lastHour && F.owned.size) {
      const hours = (hr - lastHour + 24) % 24; // a long kip counts every hour slept
      for (const p of props) if (F.owned.has(p.id)) F.till += p.income * hours;
      payT += hours;
      if (payT >= 3) { payT = 0; pl.money += F.till; F.earned += F.till; game.toast(`💷 Your businesses made ${money(F.till)}`); game.audio.cash(); F.till = 0; }
    }
    lastHour = hr;
    if (pl.car || pl.dead || game.inside) return;
    for (const p of props) {
      if (F.owned.has(p.id) || Math.hypot(pl.x - p.x, pl.z - p.z) > 1.8) continue;
      game.prompt(`${p.name}: ${money(p.price)} (${money(p.income)} an hour). ${game.isTouch ? 'Tap ENTER' : 'Press F'} to buy`);
      if (inp.enter) {
        inp.enter = false;
        if (pl.money < p.price) { game.toast(`Ye need ${money(p.price)} for ${p.name}. Ye've got ${money(pl.money)}.`); game.audio.fail(); continue; }
        pl.money -= p.price; F.owned.add(p.id); refreshProps(); game.audio.cash();
        game.bigText('PROPERTY BOUGHT!', `${p.name}: ${money(p.income)} an hour`, 3);
        game.quip([`I own ${p.name}! I'm a businessman! Mammy, I'm a businessman!`, 'A property magnate. In a onesie.', 'Wally Man Enterprises is open for business!'], 1, true);
        game.save();
      }
    }
  }

  // ======================= the phone =======================
  const el = $('phone'), screen = $('phoneScreen');
  let open = false, app = 'home';
  F.open = () => {
    if (open || !game.playing || game.paused || game.shopOpen || P().dead) return;
    open = true; game.phoneOpen = true; el.classList.remove('hidden'); show('home');
    game.audio.tone(1320, 0.05, 'sine', 0.08); game.audio.tone(1760, 0.08, 'sine', 0.06, 0, 0.06);
    if (document.pointerLockElement) document.exitPointerLock();
  };
  F.close = () => { if (!open) return; open = false; game.phoneOpen = false; el.classList.add('hidden'); game.relock && game.relock(); };
  F.isOpen = () => open;
  $('tphone').addEventListener('click', () => F.open());
  $('phoneClose').addEventListener('click', () => (app === 'home' ? F.close() : show('home')));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyT' && game.playing && !photo) { e.preventDefault(); open ? F.close() : F.open(); }
    if (e.code === 'Escape' && open) { e.preventDefault(); e.stopImmediatePropagation(); app === 'home' ? F.close() : show('home'); }
  }, true);
  const APPS = [['map', '🗺️', 'Map'], ['contacts', '📞', 'Contacts'], ['camera', '📸', 'Camera'], ['property', '🏠', 'Property'], ['stats', '📊', 'Stats'], ['close', '✖️', 'Close']];
  function show(a) {
    app = a;
    $('phoneTitle').textContent = a === 'home' ? `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')} · WallyFone` : APPS.find((x) => x[0] === a)[2];
    $('phoneClose').textContent = a === 'home' ? '✖ CLOSE' : '◀ BACK';
    if (a === 'home') {
      screen.innerHTML = `<div class="apps">${APPS.map(([id, ic, nm]) => `<button class="app" data-app="${id}"><span>${ic}</span>${nm}</button>`).join('')}</div>`;
      for (const b of screen.querySelectorAll('.app')) b.onclick = () => (b.dataset.app === 'close' ? F.close() : (b.dataset.app === 'camera' ? startPhoto() : show(b.dataset.app)));
    } else if (a === 'map') drawMap();
    else if (a === 'contacts') {
      screen.innerHTML = CONTACTS.map((c, i) => `<button class="contact" data-i="${i}"><span>${c.icon}</span><b>${c.who}</b><i>call</i></button>`).join('');
      for (const b of screen.querySelectorAll('.contact')) b.onclick = () => call(CONTACTS[+b.dataset.i]);
    } else if (a === 'property') {
      const per = props.filter((p) => F.owned.has(p.id)).reduce((s, p) => s + p.income, 0);
      screen.innerHTML = `<p class="pnote">Earning <b>${money(per)}</b> an hour · ${money(F.earned)} so far. Green squares on the map are for sale.</p>` +
        props.map((p) => `<div class="prop ${F.owned.has(p.id) ? 'own' : ''}"><b>${p.name}</b><i>${F.owned.has(p.id) ? 'OWNED' : money(p.price)}</i><small>${p.blurb} ${money(p.income)} an hour.</small>${F.owned.has(p.id) ? '' : `<button data-go="${p.id}">Set GPS</button>`}</div>`).join('');
      for (const b of screen.querySelectorAll('[data-go]')) b.onclick = () => { const p = props.find((q) => q.id === b.dataset.go); game.waypoint = { x: p.x, z: p.z, name: p.name }; game.toast(`🧭 GPS: ${p.name}`); F.close(); };
    } else if (a === 'stats') screen.innerHTML = `<div class="pstats">${game.statsHTML()}</div>`;
  }
  // ---- map app: the whole city, tap anywhere to set a waypoint ----
  function drawMap() {
    screen.innerHTML = '<canvas id="phoneMap" width="512" height="512"></canvas><p class="pnote">Tap the map to set a waypoint.</p>';
    const cv = $('phoneMap'), x = cv.getContext('2d'), M = game.map;
    x.drawImage(M.canvas, 0, 0, 512, 512);
    const k = 512 / (M.island * 2), toC = (wx, wz) => [(wx + M.island) * k, (wz + M.island) * k];
    const icon = (wx, wz, col, t) => { const [cx, cy] = toC(wx, wz); x.fillStyle = col; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 9, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, cx, cy + 0.5); };
    const S = world.specials;
    icon(S.home.x, S.home.z, '#27ae60', 'H'); icon(S.hospital.x, S.hospital.z, '#d63031', '+'); icon(S.police.x, S.police.z, '#2f6dff', 'P'); icon(S.garage.x, S.garage.z, '#e67e22', 'W');
    if (game.shopPos) icon(game.shopPos.x, game.shopPos.z, '#8e1b1b', 'A');
    for (const b of game.staticBlips) if (b.prop || b.token) icon(b.x, b.z, b.col, b.prop ? '£' : 'R');
    const nm = game.nextMissionPos && game.nextMissionPos(); if (nm) icon(nm.x, nm.z, '#e1a500', 'M');
    if (game.waypoint) icon(game.waypoint.x, game.waypoint.z, '#c86bff', '★');
    const pl = P(), [px, py] = toC(pl.car ? pl.car.x : pl.x, pl.car ? pl.car.z : pl.z);
    x.save(); x.translate(px, py); x.rotate(Math.PI - (pl.car ? pl.car.heading : pl.heading)); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -10); x.lineTo(7, 8); x.lineTo(-7, 8); x.closePath(); x.fill(); x.stroke(); x.restore();
    cv.onclick = (e) => {
      const r = cv.getBoundingClientRect(), wx = (e.clientX - r.left) / r.width * 512 / k - M.island, wz = (e.clientY - r.top) / r.height * 512 / k - M.island;
      game.waypoint = { x: wx, z: wz, name: 'Waypoint' }; game.toast('🧭 Waypoint set. Follow the purple line.'); F.close();
    };
  }
  // ---- contacts: a wee blether, plus a favour ----
  function call(c) {
    F.close();
    const mine = CALLS.filter((l) => l[0].startsWith(c.name + ':'));
    const lines = mine.length ? pick(mine) : [`${c.name}: Hello? Wallace? I cannae hear ye, I'm in a tunnel. I'm no' in a tunnel.`];
    game.subs(lines.slice());
    const pl = P();
    setTimeout(() => {
      if (c.who === 'Big Davie') { const nm = game.nextMissionPos && game.nextMissionPos(); if (nm) { game.waypoint = { ...nm, name: 'Next job' }; game.toast('🧭 Big Davie: "Next job\'s on yer GPS."'); } }
      else if (c.who === 'Mammy') { pl.health = Math.min(100, pl.health + 25); game.toast('❤ Mammy\'s nagging somehow made ye feel better. +25 health'); }
      else if (c.who === 'Uncle Tam') {
        if (pl.money >= 150) { pl.money -= 150; game.dropCrate && game.dropCrate(pl.x + 3, pl.z + 3); game.toast('📦 Uncle Tam dropped off an ammo crate. -$150. "Nae receipts."'); }
        else game.toast('Uncle Tam: "Nae money, nae crate, son."');
      } else if (c.who === 'Mr Fudge') { const v = game.cars.find((q) => q.type === 'icecream'); if (v) { game.waypoint = { x: v.x, z: v.z, name: 'Ice cream van' }; game.toast('🧭 Mr Fudge: "The van\'s on yer GPS. Bring it back full."'); } }
      else if (c.who === 'Granda') game.toast(pick(['Granda\'s tip: the Wally Wash loses the polis.', 'Granda\'s tip: rampages pay $1500. "In ma day we just had riots."', 'Granda\'s tip: buy property and it pays every hour.', 'Granda\'s tip: Golden Specs give $100 each and there\'s 20.']));
      else if (c.who === 'Auntie Senga') game.toast(pick(['Senga\'s gossip: Captain Clyde dyes his cape.', 'Senga\'s gossip: Nessie fancies the man fae the chippy.', 'Senga\'s gossip: the Tartan Avenger is really a dentist fae Dundee.']));
    }, 1800);
  }

  // ======================= photo mode =======================
  let photo = null;
  function startPhoto() {
    F.close();
    const pl = P(), c = game.camera;
    photo = { yaw: (pl.car ? pl.car.heading : pl.heading) + Math.PI, pitch: 0.25, dist: 4, x: pl.car ? pl.car.x : pl.x, y: (pl.car ? pl.car.y + 1 : pl.y + 1.2), z: pl.car ? pl.car.z : pl.z, fov: c.fov };
    game.paused = true; game.photo = true; document.body.classList.add('photo'); $('photoUI').classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    loop();
  }
  function stopPhoto() {
    if (!photo) return;
    game.camera.fov = photo.fov; game.camera.updateProjectionMatrix();
    photo = null; game.photo = false; game.paused = false; document.body.classList.remove('photo'); $('photoUI').classList.add('hidden');
    game.relock && game.relock();
  }
  function loop() {
    if (!photo) return;
    requestAnimationFrame(loop);
    const g = game.pad && game.pad.state;
    if (g) { photo.yaw -= g.lx * 0.04; photo.pitch = Math.max(-0.4, Math.min(1.3, photo.pitch + g.ly * 0.03)); photo.dist = Math.max(1.2, Math.min(25, photo.dist * (1 + (g.aim - g.fire) * 0.03))); if (g.pressed.jump) snap(); if (g.pressed.sprint || g.pressed.pause) stopPhoto(); }
    const c = game.camera, cp = Math.cos(photo.pitch);
    c.position.set(photo.x + Math.sin(photo.yaw) * cp * photo.dist, photo.y + Math.sin(photo.pitch) * photo.dist, photo.z + Math.cos(photo.yaw) * cp * photo.dist);
    c.lookAt(photo.x, photo.y, photo.z);
  }
  // drag to orbit, wheel / buttons to zoom
  let drag = null;
  const ui = $('photoUI');
  ui.addEventListener('pointerdown', (e) => { if (e.target.tagName !== 'BUTTON') drag = [e.clientX, e.clientY]; });
  window.addEventListener('pointermove', (e) => { if (!photo || !drag) return; photo.yaw -= (e.clientX - drag[0]) * 0.008; photo.pitch = Math.max(-0.4, Math.min(1.3, photo.pitch + (e.clientY - drag[1]) * 0.006)); drag = [e.clientX, e.clientY]; });
  window.addEventListener('pointerup', () => { drag = null; });
  ui.addEventListener('wheel', (e) => { if (photo) photo.dist = Math.max(1.2, Math.min(25, photo.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: true });
  $('photoIn').onclick = () => { if (photo) photo.dist = Math.max(1.2, photo.dist * 0.8); };
  $('photoOut').onclick = () => { if (photo) photo.dist = Math.min(25, photo.dist * 1.25); };
  $('photoExit').onclick = stopPhoto;
  $('photoSnap').onclick = () => snap();
  window.addEventListener('keydown', (e) => { if (!photo) return; if (e.code === 'Escape' || e.code === 'KeyT') { e.preventDefault(); e.stopImmediatePropagation(); stopPhoto(); } if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); snap(); } }, true);
  function snap() {
    game.renderNow();
    let url; try { url = game.renderer.domElement.toDataURL('image/jpeg', 0.92); } catch (e) { game.toast('Could not take the photo on this device.'); return; }
    const a = document.createElement('a'); a.href = url; a.download = `wally-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`; document.body.appendChild(a); a.click(); a.remove();
    const fl = $('photoFlash'); fl.style.opacity = 1; setTimeout(() => (fl.style.opacity = 0), 120);
    game.audio.noise(0.08, 3000, 0.4, 'highpass'); game.audio.tone(900, 0.05, 'square', 0.06, 0, 0.06);
    game.toast('📸 Photo saved to your downloads.');
  }

  F.update = (dt, inp) => updateProperty(dt, inp);
  F.save = () => ({ owned: [...F.owned], till: F.till, earned: F.earned });
  F.load = (s) => { F.owned = new Set((s && s.owned) || []); F.till = (s && s.till) || 0; F.earned = (s && s.earned) || 0; refreshProps(); };
  F.stats = () => `Property: ${F.owned.size} / ${PROPERTIES.length} · Earned ${money(F.earned)}`;
  return F;
}
