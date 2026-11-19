// Interface: camera, mouse/keyboard/touch input, sidebar, minimap, selection panel, health bars, icons.
import * as THREE from 'three';
import { G, clamp, lerp } from './state.js';
import { BUILDINGS, UNITS, UPGRADES, TABS, CELL, HALF, WORLD, GRID, FACTIONS, QUEUE_OF, HARVEST_CAPACITY } from './config.js';
import { T, heightAt, cellOf, cellCenter, idx, isVisibleAt, isExploredAt, BASES } from './terrain.js';
import { Unit, Building, alive, byId } from './entities.js';
import { hasReqs, canPlace, defOf, isBuildingType, powerFactor, lineCells } from './production.js';
import { issue, oreCellAt } from './cmd.js';
import * as Voices from './voices.js';
import { superState } from './superweapons.js';
import { weatherLabel, clockString } from './weather.js';
import { powerStates, POWERS } from './powers.js';
import { makeUnitModel, makeBuildingModel, makeGhost } from './models.js';
import { formationSlots } from './pathfind.js';
import { fogUniforms } from './materials.js';
import * as Audio from './audio.js';
import { elemPos, appPos, appSize } from './orient.js';

const $ = id => document.getElementById(id);
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const _v = new THREE.Vector3(), _box = new THREE.Box3();
let view, overlay, octx, W = 1, H = 1;
let curTab = 'build';
let icons = {};
let ghost = null, ghostType = null, footprint = null;
const keys = {};
let drag = null; // {x0,y0,x1,y1,active}
let attackMoveArmed = false;
let lastClick = { t: 0, id: 0 };
let lastGroupKey = { k: 0, t: 0 };
const msgs = [];
let hoverEnt = null;

export function initUI() {
  view = $('view'); overlay = $('overlay'); octx = overlay.getContext('2d');
  { const sp = $('selPanel');
    sp.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') infoHover = true; });
    sp.addEventListener('pointerleave', () => { infoHover = false; infoSince = performance.now(); });
    sp.addEventListener('pointerdown', () => { infoSince = performance.now(); }); }
  G.ui = { message, refreshSelection: refreshSelPanel, setMode: m => setMode(m) };
  buildTabs();
  bindInput();
  bindButtons();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => { for (const t of [50, 250, 600, 1200]) setTimeout(resize, t); });
  window.visualViewport?.addEventListener('resize', resize);
}

// Some phones report the old size during rotation, so also check every frame and resize if it changed.
export function checkSize() {
  if (Math.abs(view.clientWidth - W) > 1 || Math.abs(view.clientHeight - H) > 1) resize();
}

export function resize() {
  W = Math.max(1, view.clientWidth); H = Math.max(1, view.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = W * dpr; overlay.height = H * dpr; octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  G.onResize?.(W, H);
}

// ------------------------------------------------------------ icons (rendered from the real 3D models)
export function renderIcons(renderer) {
  const size = 256;
  const rt = new THREE.WebGLRenderTarget(size, Math.round(size * 0.8), { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1820);
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x30281e, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.2); sun.position.set(5, 8, 6); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6fb0ff, 1.5); rim.position.set(-6, 3, -5); scene.add(rim);
  if (G.three.envMap) scene.environment = G.three.envMap;
  const cam = new THREE.PerspectiveCamera(30, 1.25, 0.1, 200);
  const prevFog = fogUniforms.uFogOn.value; fogUniforms.uFogOn.value = 0;
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = Math.round(size * 0.8);
  const c2 = canvas.getContext('2d');
  const pixels = new Uint8Array(size * Math.round(size * 0.8) * 4);
  const prevTone = renderer.toneMapping;
  const doOne = (key, obj, radius, yoff) => {
    scene.add(obj);
    obj.rotation.y = -0.6;
    const d = radius * 3.3;
    cam.position.set(d * 0.75, d * 0.55 + yoff, d * 0.95); cam.lookAt(0, yoff * 0.8, 0);
    renderer.setRenderTarget(rt); renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, size, rt.height, pixels);
    const img = c2.createImageData(size, rt.height);
    for (let y = 0; y < rt.height; y++) img.data.set(pixels.subarray((rt.height - 1 - y) * size * 4, (rt.height - y) * size * 4), y * size * 4);
    c2.putImageData(img, 0, 0);
    // vignette & label strip
    const g = c2.createRadialGradient(size / 2, rt.height / 2, size * 0.25, size / 2, rt.height / 2, size * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c2.fillStyle = g; c2.fillRect(0, 0, size, rt.height);
    icons[key] = canvas.toDataURL();
    scene.remove(obj);
  };
  for (const t in UNITS) {
    const m = makeUnitModel(t, G.player);
    const r = UNITS[t].armor === 'infantry' ? 0.9 : UNITS[t].air ? 2.6 : t === 'titan' ? 2.6 : 2.0;
    doOne(t, m, r, UNITS[t].armor === 'infantry' ? 0.85 : 0.8);
  }
  for (const t in BUILDINGS) {
    const m = makeBuildingModel(t, G.player);
    const r = Math.max(BUILDINGS[t].w, BUILDINGS[t].h) * CELL * 0.62 + 0.8;
    doOne(t, m, r, 1.5);
  }
  renderer.setRenderTarget(null);
  renderer.toneMapping = prevTone;
  fogUniforms.uFogOn.value = prevFog;
  rt.dispose();
}

// ------------------------------------------------------------ messages
export function message(text, warn = false) {
  const el = document.createElement('div');
  el.className = 'msg' + (warn || /attack|lost|insufficient|low power|incoming/i.test(text) ? ' warn' : '');
  el.textContent = text;
  $('msgs').prepend(el);
  msgs.push(el);
  setTimeout(() => { el.style.opacity = 0; }, 3500);
  setTimeout(() => el.remove(), 4200);
  while ($('msgs').children.length > 5) $('msgs').lastChild.remove();
}

// ------------------------------------------------------------ sidebar
function buildTabs() {
  const tabs = $('tabs'); tabs.innerHTML = '';
  for (const t of TABS) {
    const el = document.createElement('div');
    el.className = 'tab' + (t.id === curTab ? ' active' : ''); el.textContent = t.label; el.dataset.tab = t.id;
    el.onclick = () => { curTab = t.id; Audio.play('click'); buildGrid(); [...tabs.children].forEach(c => c.classList.toggle('active', c.dataset.tab === curTab)); };
    tabs.appendChild(el);
  }
}
let gridItems = [];
function buildQueueOpts() {
  const box = $('qOpts'); if (!box) return;
  const qn = QUEUE_OF[curTab];
  if (!['infantry', 'vehicle', 'air'].includes(qn) || !G.players[G.player]) { box.style.display = 'none'; return; }
  const q = G.players[G.player].queues[qn];
  box.style.display = 'block';
  box.innerHTML = '';
  const b = document.createElement('button'); b.className = 'btn' + (q.repeat ? ' on' : '');
  b.textContent = q.repeat ? '🔁 Repeat: ON' : '🔁 Repeat: off';
  b.title = 'Keep building the same units: each finished unit is queued again';
  b.onclick = () => { issue({ t: 'repeat', q: qn, on: !q.repeat }); Audio.play('click'); setTimeout(buildQueueOpts, 60); };
  box.appendChild(b);
}
export function buildGrid() {
  buildQueueOpts();
  const grid = $('grid'); grid.innerHTML = ''; gridItems = [];
  const list = [...Object.entries(BUILDINGS), ...Object.entries(UNITS), ...Object.entries(UPGRADES)].filter(([, d]) => d.tab === curTab && (!d.fac || d.fac === G.player));
  for (const [type, d] of list) {
    const el = document.createElement('div'); el.className = 'item';
    if (!icons[type] && d.icon) icons[type] = emojiIcon(d.icon);
    el.innerHTML = `<img src="${icons[type] || ''}" alt=""><canvas class="clock" width="100" height="80"></canvas><div class="cost">$${d.cost}</div>${d.key ? `<div class="key">${d.key}</div>` : ''}<div class="count"></div><div class="state"></div><div class="nm">${d.name}</div>`;
    el.onclick = e => { e.preventDefault(); clickItem(type); };
    el.oncontextmenu = e => { e.preventDefault(); rightClickItem(type); };
    el.onmouseenter = e => showTip(type, e); el.onmousemove = e => moveTip(e); el.onmouseleave = hideTip;
    grid.appendChild(el);
    gridItems.push({ type, el, clock: el.querySelector('.clock'), count: el.querySelector('.count'), state: el.querySelector('.state') });
  }
}
function emojiIcon(e) {
  const c = document.createElement('canvas'); c.width = 160; c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(80, 60, 10, 80, 64, 90); g.addColorStop(0, '#2a3f52'); g.addColorStop(1, '#0b131a');
  x.fillStyle = g; x.fillRect(0, 0, 160, 128);
  x.font = '64px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 80, 62);
  return c.toDataURL();
}
function clickItem(type) {
  const P = G.players[G.player];
  const d = defOf(type);
  if (d.instant) {
    if (!hasReqs(G.player, type)) { Audio.play('error'); message(`Requires: ${reqText(type)}`, true); return; }
    if (P.credits < d.cost) { Audio.play('error'); Audio.announce('Insufficient funds'); return; }
    startPlacing(type); return;
  }
  const q = P.queues[QUEUE_OF[d.tab]];
  if (isBuildingType(type) && q.ready && q.items[0] === type) { startPlacing(type); return; }
  if (q.items[0] === type && q.hold) { issue({ t: 'hold', type, on: false }); Audio.play('click'); return; }
  if (!hasReqs(G.player, type)) { Audio.play('error'); message(d.fac && d.fac !== G.player ? `${d.name} is not available to your faction` : d.limit && (P.owned[type] || 0) >= d.limit ? `Only ${d.limit} ${d.name} allowed` : `Requires: ${reqText(type)}`, true); return; }
  if (isBuildingType(type) && q.items.length) { Audio.play('error'); message('Already building a structure', true); return; }
  if (!isBuildingType(type) && q.items.length >= 12) { Audio.play('error'); message('Queue full', true); return; }
  issue({ t: 'q', type });
  Audio.play('click'); if (isBuildingType(type)) Audio.announce('Building'); else Audio.announce('Training', G.player, 1.5);
}
function rightClickItem(type) {
  const P = G.players[G.player];
  const d = defOf(type);
  if (d.instant) return;
  const q = P.queues[QUEUE_OF[d.tab]];
  if (q.items[0] === type && !q.hold && q.items.filter(i => i === type).length === 1 && q.progress > 0 && !q.ready) { issue({ t: 'hold', type, on: true }); Audio.announce('On hold'); return; }
  if (q.items.includes(type)) { issue({ t: 'dq', type }); Audio.play('click'); Audio.announce('Cancelled'); if (G.placing === type) cancelPlacing(); }
}
function reqText(type) {
  const d = defOf(type);
  const P = G.players[G.player];
  const names = d.req.filter(r => !(P.owned[r] > 0)).map(r => BUILDINGS[r].name);
  return names.join(', ') || 'a producer';
}
function showTip(type, e) {
  const d = defOf(type); const tip = $('tooltip');
  const pw = d.power ? `<br>Power: ${d.power > 0 ? '+' : ''}${d.power}` : '';
  const ok = hasReqs(G.player, type);
  tip.innerHTML = `<b>${d.name}</b> — $${d.cost}<br>${d.desc}${pw}${d.hp ? `<br>Armour: ${d.hp}` : ''}${ok ? '' : `<br><span class="req">Requires: ${reqText(type)}</span>`}<br><span style="color:var(--dim)">Left-click build · Right-click hold/cancel</span>`;
  tip.style.display = 'block'; moveTip(e);
}
function moveTip(e) { const tip = $('tooltip'), p = appPos(e), A = appSize(); tip.style.left = Math.max(4, Math.min(A.w - 250, p.x - 250)) + 'px'; tip.style.top = Math.min(A.h - 120, p.y + 10) + 'px'; }
function hideTip() { $('tooltip').style.display = 'none'; }

let sideT = 0;
const setText = (el, t) => { t = String(t); if (el.textContent !== t) el.textContent = t; };
const setStyle = (el, k, v) => { if (el.style[k] !== v) el.style[k] = v; };
export function updateSidebar(dt) {
  sideT -= dt; if (sideT > 0) return; sideT = 0.1;
  { const n = idleUnits().length, b = $('bIdle'); setStyle(b, 'display', n ? '' : 'none'); setText(b, `💤 ${n}`); }
  const P = G.players[G.player];
  setText($('credits'), '$ ' + Math.floor(P.credits).toLocaleString());
  const maxP = Math.max(P.powerProd, P.powerUse, 100) * 1.15;
  setStyle($('powerFill'), 'width', (P.powerProd / maxP * 100).toFixed(1) + '%');
  setStyle($('powerUse'), 'left', (P.powerUse / maxP * 100).toFixed(1) + '%');
  setText($('powerTxt'), `${Math.round(P.powerUse)}/${Math.round(P.powerProd)}`);
  const low = P.powerUse > P.powerProd;
  $('powerRow').classList.toggle('low', low);
  if (low && !G.lowPowerWarned) { Audio.announce('Low power'); G.lowPowerWarned = true; }
  if (!low) G.lowPowerWarned = false;
  for (const it of gridItems) {
    const d = defOf(it.type);
    const q = P.queues[QUEUE_OF[d.tab]];
    const ok = hasReqs(G.player, it.type) || q.items.includes(it.type);
    it.el.classList.toggle('locked', !ok);
    const n = q.items.filter(i => i === it.type).length;
    setText(it.count, !isBuildingType(it.type) && n > 1 ? n : '');
    const active = q.items[0] === it.type;
    const ready = active && q.ready;
    it.el.classList.toggle('ready', ready);
    setText(it.state, ready ? 'READY' : active && q.hold ? 'ON HOLD' : (UPGRADES[it.type] && P.upgrades[it.type]) ? 'DONE' : '');
    const dim = !active && n === 0 && isBuildingType(it.type) && q.items.length > 0;
    const clockKey = active && !ready ? 'p' + Math.round(q.progress / d.time * 200) : dim ? 'dim' : '';
    if (it.clockKey === clockKey) continue;
    it.clockKey = clockKey;
    const c = it.clock.getContext('2d');
    c.clearRect(0, 0, 100, 80);
    if (active && !ready) {
      const k = q.progress / d.time;
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.beginPath(); c.moveTo(50, 40); c.arc(50, 40, 80, -Math.PI / 2 + k * Math.PI * 2, Math.PI * 1.5); c.closePath(); c.fill();
      c.fillStyle = '#ffc23a'; c.fillRect(0, 77, 100 * k, 3);
    } else if (dim) {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, 100, 80);
    }
  }
  // tab "ready" dots
  for (const el of $('tabs').children) {
    const qn = QUEUE_OF[el.dataset.tab];
    el.classList.toggle('ready', qn === 'build' && P.queues.build.ready && defOf(P.queues.build.items[0]).tab === el.dataset.tab);
  }
  // superweapons
  const ss = superState(G.player), es = superState(G.enemy);
  $('superRow').style.display = ss || es ? 'grid' : 'none';
  if (ss) {
    const left = Math.max(0, ss.max - ss.charge);
    $('superName').textContent = ss.ready ? `${ss.name}: READY` : `${ss.name}: ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    $('superFill').style.width = (ss.charge / ss.max * 100) + '%';
    $('bSuper').disabled = !ss.ready; $('bSuper').classList.toggle('ready', ss.ready); $('bSuper').style.display = '';
  } else { $('superName').textContent = ''; $('superFill').style.width = '0'; $('bSuper').style.display = 'none'; }
  if (es) { const left = Math.max(0, es.max - es.charge); $('enemySuper').textContent = es.ready ? `⚠ Enemy ${es.name} ARMED` : `⚠ Enemy ${es.name}: ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`; }
  else $('enemySuper').textContent = '';
  setText($('wx'), `${weatherLabel()} · ${clockString()}`);
  // support power buttons
  const ps = powerStates(G.player), pb = $('powerBtns');
  const psig = ps.map(p => p.type).join();
  if (pb.dataset.sig !== psig) {
    pb.dataset.sig = psig; pb.innerHTML = '';
    for (const p of ps) {
      const b = document.createElement('button'); b.className = 'pwr'; b.dataset.type = p.type; b.title = `${p.name}: ${p.desc}`;
      b.innerHTML = `${p.icon} <span></span><div class="fill"></div>`;
      b.onclick = () => { const s = powerStates(G.player).find(x => x.type === p.type); if (s && s.ready) { setMode('power:' + p.type); Audio.announce(`${p.name}: select target`); } else Audio.play('error'); };
      pb.appendChild(b);
    }
  }
  for (const b of pb.children) {
    const s = ps.find(p => p.type === b.dataset.type); if (!s) continue;
    b.classList.toggle('ready', s.ready);
    setText(b.querySelector('span'), s.ready ? s.name.split(' ')[0].toUpperCase() : `${Math.ceil(POWERS[s.type].charge - s.charge)}s`);
    setStyle(b.querySelector('.fill'), 'width', (s.charge / POWERS[s.type].charge * 100).toFixed(1) + '%');
  }
  // clock
  const s = Math.floor(G.time); $('clock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  refreshSelPanel();
}

// ------------------------------------------------------------ placement
function startPlacing(type) {
  cancelPlacing();
  G.placing = type; ghostType = type;
  ghost = makeGhost(type, G.player);
  G.three.scene.add(ghost);
  const d = BUILDINGS[type];
  footprint = new THREE.Mesh(new THREE.PlaneGeometry(d.w * CELL, d.h * CELL, d.w, d.h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.35, wireframe: false, depthWrite: false }));
  footprint.renderOrder = 6;
  const wire = new THREE.Mesh(footprint.geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4 }));
  footprint.add(wire);
  G.three.scene.add(footprint);
  Audio.play('click');
}
export function cancelPlacing() {
  wallStart = null;
  if (ghost) G.three.scene.remove(ghost);
  if (footprint) G.three.scene.remove(footprint);
  ghost = null; footprint = null; G.placing = null; ghostType = null;
}
function placementCell(gx, gz) {
  const d = BUILDINGS[G.placing];
  return { cx: cellOf(gx - (d.w - 1) * CELL / 2), cz: cellOf(gz - (d.h - 1) * CELL / 2) };
}
function updateGhost() {
  if (!ghost || !G.mouse.ground) { if (ghost) ghost.visible = false; return; }
  const d = BUILDINGS[G.placing];
  const { cx, cz } = placementCell(G.mouse.ground.x, G.mouse.ground.z);
  const x = cellCenter(cx) - CELL / 2 + d.w * CELL / 2, z = cellCenter(cz) - CELL / 2 + d.h * CELL / 2;
  let hy = -1e9;
  for (let j = 0; j <= d.h; j++) for (let i = 0; i <= d.w; i++) hy = Math.max(hy, heightAt(cellCenter(cx) - CELL / 2 + i * CELL, cellCenter(cz) - CELL / 2 + j * CELL));
  ghost.visible = true; ghost.position.set(x, hy, z);
  footprint.position.set(x, hy + 0.2, z);
  const ok = canPlace(G.player, G.placing, cx, cz);
  const col = ok ? 0x44ff66 : 0xff3b2f;
  ghost.userData.ghostMat.color.setHex(col); footprint.material.color.setHex(col);
  ghost.userData.ghostMat.opacity = 0.3 + Math.sin(performance.now() / 150) * 0.08;
}

// ------------------------------------------------------------ camera
export function updateCamera(dt) {
  const C = G.camera;
  const sp = (40 + C.dist * 0.9) * dt;
  let mx = 0, mz = 0;
  if (keys.ArrowUp) mz -= 1; if (keys.ArrowDown) mz += 1;
  if (keys.ArrowRight) mx += 1; if (keys.ArrowLeft) mx -= 1;
  // edge scroll
  if (G.mouse.inside && G.mouse.moved && !drag?.active && !isTouch && G.started && document.hasFocus()) {
    const e = 10;
    if (G.mouse.x < e) mx -= 1; if (G.mouse.x > W - e) mx += 1;
    if (G.mouse.y < e) mz -= 1; if (G.mouse.y > H - e) mz += 1;
  }
  if (keys.KeyQ) C.yaw += dt * 1.5;
  if (keys.KeyE) C.yaw -= dt * 1.5;
  if (mx || mz) {
    const c = Math.cos(C.yaw), s = Math.sin(C.yaw);
    C.x += (mx * c + mz * s) * sp; C.z += (-mx * s + mz * c) * sp;
  }
  C.dist = lerp(C.dist, C.targetDist ?? C.dist, Math.min(1, dt * 8));
  C.x = clamp(C.x, -HALF + 10, HALF - 10); C.z = clamp(C.z, -HALF + 10, HALF - 10);
  const cam = G.three.camera;
  const pitch = clamp(lerp(0.62, 1.02, clamp((C.dist - 22) / 100, 0, 1)) + (G.photo ? C.tilt || 0 : 0), 0.12, 1.45);
  C.ty = lerp(C.ty ?? 0, Math.max(0, heightAt(C.x, C.z)), Math.min(1, dt * 3));
  const sh = C.shake; C.shake = Math.max(0, C.shake - dt * 2.5);
  const jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh, jz = (Math.random() - 0.5) * sh;
  cam.position.set(C.x + Math.sin(C.yaw) * Math.cos(pitch) * C.dist + jx, C.ty + Math.sin(pitch) * C.dist + jy, C.z + Math.cos(C.yaw) * Math.cos(pitch) * C.dist + jz);
  cam.lookAt(C.x + jx * 0.5, C.ty, C.z + jz * 0.5);
  // keep the shadow camera centred on what we look at
  const sun = G.three.sun;
  const sa = sun.userData.angle ?? 1.2;
  const sx = Math.cos(sa), sy = Math.max(0.45, Math.abs(Math.sin(sa)));
  sun.target.position.set(C.x, 0, C.z); sun.position.set(C.x + sx * 90 * (Math.sin(sa) < 0 ? -1 : 1), sy * 110, C.z + 35);
  const ext = clamp(C.dist * 0.9, 40, 110);
  if (sun.shadow.camera.right !== ext) { const sc = sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.updateProjectionMatrix(); }
}
export function centerOn(x, z) { G.camera.x = x; G.camera.z = z; }

// ray march against the height field
export function screenToGround(sx, sy) {
  const cam = G.three.camera;
  ndc.set(sx / W * 2 - 1, -(sy / H) * 2 + 1);
  raycaster.setFromCamera(ndc, cam);
  const o = raycaster.ray.origin, d = raycaster.ray.direction;
  let t = 0, prev = 0;
  for (let i = 0; i < 600; i++) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (y < Math.max(heightAt(x, z), -1.2)) {
      let a = prev, b = t;
      for (let k = 0; k < 12; k++) { const m = (a + b) / 2; const yy = o.y + d.y * m, xx = o.x + d.x * m, zz = o.z + d.z * m; if (yy < Math.max(heightAt(xx, zz), -1.2)) b = m; else a = m; }
      return { x: o.x + d.x * b, z: o.z + d.z * b };
    }
    prev = t; t += 0.8;
    if (t > 600) break;
  }
  return null;
}
function project(x, y, z) {
  _v.set(x, y, z).project(G.three.camera);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, behind: _v.z > 1 };
}
// pick the nearest entity under a screen point (ray vs bounding boxes)
function pickAt(sx, sy) {
  ndc.set(sx / W * 2 - 1, -(sy / H) * 2 + 1);
  raycaster.setFromCamera(ndc, G.three.camera);
  const ray = raycaster.ray;
  let best = null, bd = 1e9;
  const test = (e, minX, minY, minZ, maxX, maxY, maxZ) => {
    _box.min.set(minX, minY, minZ); _box.max.set(maxX, maxY, maxZ);
    const p = ray.intersectBox(_box, _v);
    if (p) { const d = p.distanceTo(ray.origin); if (d < bd) { bd = d; best = e; } }
  };
  for (const u of G.units) {
    if (u.dead || u.boarded || (u.faction !== G.player && !u.mesh.visible)) continue;
    const r = Math.max(0.75, u.def.radius * 1.1), h = u.isInf ? 2 : u.air ? 1.6 : 2.2;
    const y0 = u.air ? u.y - 1 : u.y;
    test(u, u.x - r, y0, u.z - r, u.x + r, y0 + h, u.z + r);
  }
  for (const b of G.buildings) {
    if (b.dead || (b.faction !== G.player && !b.mesh.visible)) continue;
    const hw = b.def.w * CELL / 2, hd = b.def.h * CELL / 2;
    const h = b.def.w === 1 ? 4 : 3.5;
    test(b, b.x - hw, b.baseY - 1, b.z - hd, b.x + hw, b.baseY + h, b.z + hd);
  }
  return best;
}

// ------------------------------------------------------------ selection & orders
function select(list, add = false) {
  if (!add) for (const s of G.selection) s.setSelected(false);
  const set = new Set(add ? G.selection : []);
  for (const e of list) set.add(e);
  G.selection = [...set].filter(e => alive(e));
  for (const s of G.selection) s.setSelected(true);
  if (G.selection.length && G.selection[0].faction === G.player && G.selection[0].kind === 'unit') {
    Voices.say(G.selection[0].type, 'select');
  }
  refreshSelPanel(true);
}
const myUnits = () => G.selection.filter(e => e.kind === 'unit' && e.faction === G.player);

function commandAt(sx, sy, attackMove = false, queue = false) {
  const units = myUnits();
  const target = pickAt(sx, sy);
  const g = screenToGround(sx, sy);
  const ids = units.map(u => u.id);
  // building selected: set rally point
  if (!units.length) {
    const b = G.selection.find(e => e.kind === 'building' && e.faction === G.player);
    if (b && g && ['barracks', 'factory', 'helipad', 'conyard'].includes(b.type)) {
      issue({ t: 'rally', id: b.id, x: g.x, z: g.z }); Audio.play('click'); message('Rally point set'); flashMarker(g.x, g.z, 0xffc23a);
    }
    return;
  }
  if (target && target.faction !== G.player && !attackMove) {
    issue({ t: 'atk', ids, tid: target.id });
    flashMarker(target.x, target.z, 0xff4433);
    Voices.say(units[0].type, 'attack');
    return;
  }
  if (target && target.faction === G.player && (target.def.transport || target.def.garrison) && (target.kind === 'unit' || target.buildAnim >= 1)) {
    const inf = units.filter(u => u.isInf && u !== target);
    if (inf.length) { issue({ t: 'board', ids: inf.map(u => u.id), tid: target.id }); flashMarker(target.x, target.z, 0x55ff77); Audio.play('ack'); return; }
  }
  if (target && target.faction === G.player && target.kind === 'building') {
    const eng = units.filter(u => u.type === 'engineer' && target.hp < target.maxHp);
    const harv = units.filter(u => u.type === 'harvester' && target.type === 'refinery');
    if (eng.length) issue({ t: 'atk', ids: eng.map(u => u.id), tid: target.id });
    if (harv.length) issue({ t: 'dock', ids: harv.map(u => u.id), rid: target.id });
    if (eng.length || harv.length) { Audio.play('ack'); return; }
  }
  if (!g) return;
  const cell = oreCellAt(g.x, g.z);
  const harvs = units.filter(u => u.type === 'harvester');
  if (harvs.length && cell >= 0) issue({ t: 'harv', ids: harvs.map(u => u.id), cell });
  const movers = units.filter(u => !(u.type === 'harvester' && cell >= 0));
  if (movers.length) issue({ t: 'move', ids: movers.map(u => u.id), x: g.x, z: g.z, am: attackMove ? 1 : 0, q: queue ? 1 : 0 });
  flashMarker(g.x, g.z, attackMove ? 0xff9a33 : 0x55ff77);
  Voices.say(units[0].type, attackMove ? 'attack' : 'move');
}

const markers = [];
function flashMarker(x, z, color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(x, heightAt(x, z) + 0.3, z); m.renderOrder = 7;
  G.three.scene.add(m); markers.push({ m, t: 0 });
}
// ---- find the enemy base: jump to enemy buildings you have seen, or (if none yet) point at where the
// enemy is with a pulsing red beacon. The fog stays: it shows where to go, not what is there.
let findIdx = 0;
const beacons = [];
export function findEnemyBase() {
  if (!G.started || !G.players[G.enemy]) return;
  const enemy = G.buildings.filter(b => !b.dead && b.faction === G.enemy && !b.def.isMine && !b.def.isWall);
  if (!enemy.length) { message(G.cfg.mode === 'survival' ? 'No enemy base in Survival - they come in waves!' : 'No enemy buildings left!'); return; }
  const home = G.buildings.find(b => !b.dead && b.faction === G.player && b.type === 'conyard') || G.buildings.find(b => !b.dead && b.faction === G.player) || { x: 0, z: 0 };
  const dist = b => Math.hypot(b.x - home.x, b.z - home.z);
  const seen = enemy.filter(b => G.revealed || isExploredAt(b.x, b.z))
    .sort((a, b) => (b.type === 'conyard') - (a.type === 'conyard') || dist(a) - dist(b));
  if (seen.length) {
    const b = seen[findIdx++ % seen.length];
    centerOn(b.x, b.z); flashMarker(b.x, b.z, 0xff4a3d);
    message(`🎯 Enemy ${b.def.name}${seen.length > 1 ? ` (${(findIdx - 1) % seen.length + 1} of ${seen.length} found)` : ''}`);
  } else {
    // not discovered yet: aim at the nearest enemy structure, slightly fuzzed so it is a hint, not a map hack
    const b = enemy.slice().sort((a, c) => (c.type === 'conyard') - (a.type === 'conyard') || dist(a) - dist(c))[0];
    const x = b.x + (Math.random() - 0.5) * 12, z = b.z + (Math.random() - 0.5) * 12;
    centerOn(x, z); G.camera.targetDist = Math.max(G.camera.targetDist || 60, 70);
    placeBeacon(x, z);
    message('🎯 Intel: the enemy base is around the red beacon. Send units to uncover it!');
  }
  G.alertAt = { x: G.camera.x, z: G.camera.z, t: G.time }; // minimap ping
  Audio.play('beep');
}
function placeBeacon(x, z) {
  const g = new THREE.Group();
  const y = heightAt(x, z);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.4, 0.3), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  col.position.y = 20; g.add(col);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.5, 0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = 0.4; g.add(ring);
  g.position.set(x, y, z); g.renderOrder = 8;
  G.three.scene.add(g); beacons.push({ g, ring, col, t: 0 });
}
export function updateMarkers(dt) {
  for (let i = beacons.length - 1; i >= 0; i--) {
    const b = beacons[i]; b.t += dt;
    const k = 1 + 0.15 * Math.sin(b.t * 6); b.ring.scale.set(k, 1, k);
    const fade = Math.min(1, (12 - b.t) / 2); b.ring.material.opacity = fade; b.col.material.opacity = 0.3 * fade;
    if (b.t > 12) { G.three.scene.remove(b.g); beacons.splice(i, 1); }
  }
  for (let i = markers.length - 1; i >= 0; i--) {
    const k = markers[i]; k.t += dt;
    const s = 1 + k.t * 3; k.m.scale.set(s, 1, s); k.m.material.opacity = 1 - k.t / 0.6;
    if (k.t > 0.6) { G.three.scene.remove(k.m); k.m.geometry.dispose(); markers.splice(i, 1); }
  }
}

function boxSelect(x0, y0, x1, y1, add) {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1), minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  let list = G.units.filter(u => !u.dead && !u.boarded && u.faction === G.player && (() => { const p = project(u.x, u.y + 0.8, u.z); return !p.behind && p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY; })());
  const combat = list.filter(u => u.type !== 'harvester');
  if (combat.length) list = combat; // prefer combat units over harvesters
  select(list, add);
}

function selectSameType(e) {
  const list = G.units.filter(u => !u.dead && u.faction === G.player && u.type === e.type && (() => { const p = project(u.x, u.y, u.z); return !p.behind && p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H; })());
  select(list);
}

// ------------------------------------------------------------ input
const isTouch = matchMedia('(pointer: coarse)').matches;
let touchBoxMode = false;
function bindInput() {
  const gl = $('gl');
  if (isTouch) document.body.classList.add('touch');
  gl.addEventListener('contextmenu', e => e.preventDefault());
  gl.addEventListener('pointerenter', () => { G.mouse.inside = true; });
  gl.addEventListener('pointerleave', () => { G.mouse.inside = false; });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) G.mouse.inside = false; });

  let rmb = null;
  gl.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    Audio.initAudio();
    const { x, y } = elemPos(view, e);
    if (e.button === 0) {
      if (G.placing) {
        if (BUILDINGS[G.placing].isWall && G.mouse.ground) { wallStart = placementCell(G.mouse.ground.x, G.mouse.ground.z); return; }
        tryPlace(); return;
      }
      if (G.mode) { modeClick(x, y); return; }
      if (attackMoveArmed) { const pat = attackMoveArmed === 'patrol'; attackMoveArmed = false; if (pat) patrolAt(x, y); else commandAt(x, y, true); setCursor(); return; }
      drag = { x0: x, y0: y, x1: x, y1: y, active: false };
    } else if (e.button === 2) {
      rmb = { x, y, cx: G.camera.x, cz: G.camera.z, moved: false };
    } else if (e.button === 1) {
      rmb = { x, y, cx: G.camera.x, cz: G.camera.z, moved: true, rotate: true, yaw: G.camera.yaw };
    }
  });
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const { x, y } = elemPos(view, e);
    if (G.mouse.x !== x || G.mouse.y !== y) G.mouse.moved = true;
    G.mouse.x = x; G.mouse.y = y;
    if (drag) { drag.x1 = x; drag.y1 = y; if (Math.hypot(x - drag.x0, y - drag.y0) > 6) drag.active = true; }
    if (rmb) {
      const dx = x - rmb.x, dy = y - rmb.y;
      if (Math.hypot(dx, dy) > 6) rmb.moved = true;
      if (rmb.moved) {
        if (rmb.rotate) G.camera.yaw = rmb.yaw - dx * 0.006;
        else {
          // right-drag pans the map
          const k = G.camera.dist / H * 1.4, c = Math.cos(G.camera.yaw), s = Math.sin(G.camera.yaw);
          G.camera.x = rmb.cx - (dx * c + dy * s) * k; G.camera.z = rmb.cz - (-dx * s + dy * c) * k;
        }
      }
    }
  });
  window.addEventListener('pointerup', e => {
    if (e.pointerType === 'touch') return;
    const { x, y } = elemPos(view, e);
    if (e.button === 0 && G.placing && wallStart) { tryPlace(); return; }
    if (e.button === 0 && drag) {
      if (drag.active) boxSelect(drag.x0, drag.y0, drag.x1, drag.y1, e.shiftKey);
      else leftClick(x, y, e.shiftKey, e.ctrlKey);
      drag = null;
    } else if ((e.button === 2 || e.button === 1) && rmb) {
      if (!rmb.moved && e.button === 2) {
        if (G.placing) cancelPlacing();
        else if (G.mode) setMode(null);
        else if (attackMoveArmed) { attackMoveArmed = false; setCursor(); }
        else commandAt(x, y, false, e.shiftKey);
      }
      rmb = null;
    }
  });
  gl.addEventListener('wheel', e => {
    e.preventDefault();
    const C = G.camera;
    if (G.photo && e.shiftKey) { C.tilt = clamp((C.tilt || 0) + (e.deltaY > 0 ? 0.04 : -0.04), -0.5, 0.45); return; }
    C.targetDist = clamp((C.targetDist ?? C.dist) * (e.deltaY > 0 ? 1.12 : 0.89), G.photo ? 5 : 18, 130);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    keys[e.code] = true; keys.ctrl = e.ctrlKey || e.metaKey;
    Audio.initAudio();
    const k = e.code;
    if (k === 'F9') { e.preventDefault(); G.togglePhoto?.(); return; }
    if (G.photo && (k === 'KeyZ' || k === 'KeyC')) { G.camera.tilt = clamp((G.camera.tilt || 0) + (k === 'KeyZ' ? -0.05 : 0.05), -0.5, 0.45); return; }
    if (k === 'Escape' && G.photo) { G.togglePhoto?.(); return; }
    if (k === 'Escape') { if (G.placing) cancelPlacing(); else if (G.mode) setMode(null); else if (attackMoveArmed) { attackMoveArmed = false; setCursor(); } else if (G.started && !G.over) G.togglePause?.(); return; }
    if (!G.started || G.paused) { if (k === 'KeyP') G.togglePause?.(); return; }
    if (/^Digit[0-9]$/.test(k)) {
      const n = +k.slice(5);
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); G.groups[n] = myUnits().slice(); message(`Group ${n} set`); }
      else {
        const g = (G.groups[n] || []).filter(alive);
        if (g.length) {
          select(g);
          const now = performance.now();
          if (lastGroupKey.k === n && now - lastGroupKey.t < 400) centerOn(g[0].x, g[0].z);
          lastGroupKey = { k: n, t: now };
        }
      }
      return;
    }
    if (k === 'KeyA' && !e.ctrlKey) { if (myUnits().length) { attackMoveArmed = true; setCursor(); } return; }
    if (k === 'KeyA' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); selectArmy(); return; }
    if (k === 'KeyS' && !e.ctrlKey) { if (myUnits().length) issue({ t: 'stop', ids: myUnits().map(u => u.id) }); Audio.play('ack'); return; }
    if (k === 'KeyG') { const w = myUnits().filter(u => u.type === 'wallyman' || u.type === 'warlord'); if (w.length) { issue({ t: 'ability', ids: w.map(u => u.id) }); Voices.say(w[0].type, 'attack', true); } return; }
    if (k === 'KeyU') { const a = G.selection.filter(e => alive(e) && e.faction === G.player && (e.def.transport || e.def.garrison) && (e.passengers || []).length); if (a.length) { issue({ t: 'unload', ids: a.map(u => u.id) }); Audio.play('ack'); } return; }
    if (k === 'Period') { selectNextIdle(); return; }
    if (k === 'KeyN') { findEnemyBase(); return; }
    if (k === 'KeyP') { if (myUnits().length) { attackMoveArmed = 'patrol'; setCursor(); } return; }
    if (k === 'KeyH') { const b = G.buildings.find(b => b.faction === G.player && b.type === 'conyard') || G.buildings.find(b => b.faction === G.player); if (b) centerOn(b.x, b.z); return; }
    if (k === 'Space') { e.preventDefault(); if (G.alertAt) centerOn(G.alertAt.x, G.alertAt.z); return; }
    if (k === 'KeyR') { setMode(G.mode === 'repair' ? null : 'repair'); return; }
    if (k === 'KeyX') { setMode(G.mode === 'sell' ? null : 'sell'); return; }
    if (k === 'KeyP') { G.togglePause?.(); return; }
    if (k === 'F1') { e.preventDefault(); $('help').style.display = 'flex'; return; }
    if (k === 'Delete' && G.selection.length === 1 && G.selection[0].kind === 'building' && G.selection[0].faction === G.player) { issue({ t: 'sell', id: G.selection[0].id }); return; }
    // build hotkeys (Shift + letter)
    if (e.shiftKey) {
      for (const t in BUILDINGS) if (BUILDINGS[t].key && 'Key' + BUILDINGS[t].key === k) { clickItem(t); return; }
    }
    if (k === 'KeyF' && G.selection.length) { const e0 = G.selection[0]; centerOn(e0.x, e0.z); }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; keys.ctrl = e.ctrlKey || e.metaKey; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // minimap
  const mm = $('minimap');
  let mmDown = false;
  const mmPos = e => { const p = elemPos(mm, e); return { x: p.x / p.w * WORLD - HALF, z: p.y / p.h * WORLD - HALF }; };
  mm.addEventListener('contextmenu', e => e.preventDefault());
  mm.addEventListener('pointerdown', e => {
    e.preventDefault(); Audio.initAudio();
    const p = mmPos(e);
    if (e.button === 2 && myUnits().length) {
      issue({ t: 'move', ids: myUnits().map(u => u.id), x: p.x, z: p.z }); Audio.play('ack'); return;
    }
    mmDown = true; centerOn(p.x, p.z);
  });
  window.addEventListener('pointermove', e => { if (mmDown) { const p = mmPos(e); centerOn(p.x, p.z); } });
  window.addEventListener('pointerup', () => { mmDown = false; });

  bindTouch(gl);
}

function selectArmy() { select(G.units.filter(u => !u.dead && u.faction === G.player && u.weapon && u.type !== 'harvester')); }

function leftClick(x, y, shift, ctrl) {
  const e = pickAt(x, y);
  if (e) {
    const now = performance.now();
    if (e.kind === 'unit' && e.faction === G.player && lastClick.id === e.id && now - lastClick.t < 350) { selectSameType(e); lastClick = { t: 0, id: 0 }; return; }
    lastClick = { t: now, id: e.id };
    if (shift && e.faction === G.player && e.kind === 'unit') {
      if (e.selected) { e.setSelected(false); G.selection = G.selection.filter(s => s !== e); refreshSelPanel(true); }
      else select([e], true);
    } else if (ctrl && myUnits().length && e.faction === G.player) {
      issue({ t: 'atk', ids: myUnits().filter(u => u !== e).map(u => u.id), tid: e.id }); // force fire
    } else select([e]);
  } else if (!shift) {
    // left click on ground with own units selected: move (modern convenience)
    if (myUnits().length && localStorage.getItem('ws_leftmove') === '1') commandAt(x, y);
    else select([]);
  }
}

function tryPlace() {
  if (!G.mouse.ground) return;
  const d = BUILDINGS[G.placing];
  const { cx, cz } = placementCell(G.mouse.ground.x, G.mouse.ground.z);
  if (d.instant) {
    const cells = d.isWall && wallStart ? lineCells(wallStart, { cx, cz }) : [[cx, cz]];
    wallStart = null;
    const ok = cells.filter(([a, b]) => canPlace(G.player, G.placing, a, b));
    if (!ok.length) { Audio.play('error'); message('Cannot build there', true); return; }
    issue({ t: 'inst', type: G.placing, cells: ok });
    Audio.play('build');
    const keepGoing = (keys.ShiftLeft || keys.ShiftRight) && G.players[G.player].credits >= d.cost * (ok.length + 1);
    if (!keepGoing) cancelPlacing();
    return;
  }
  if (!canPlace(G.player, G.placing, cx, cz)) { Audio.play('error'); message('Cannot build there', true); return; }
  issue({ t: 'place', type: G.placing, cx, cz });
  cancelPlacing(); Audio.play('build');
}
let wallStart = null;

function modeClick(x, y) {
  if (G.mode && G.mode.startsWith('power:')) {
    const g = screenToGround(x, y);
    if (!g) return;
    issue({ t: 'power', type: G.mode.slice(6), x: g.x, z: g.z });
    setMode(null);
    return;
  }
  if (G.mode === 'spawn') { const g = screenToGround(x, y); if (g && G.sandboxSpawn) { G.sandboxSpawn(g.x, g.z); Audio.play('ack'); flashMarker(g.x, g.z, 0x7dff9a); } return; }
  if (G.mode === 'super') {
    const g = screenToGround(x, y);
    if (!g) return;
    issue({ t: 'super', x: g.x, z: g.z });
    setMode(null);
    return;
  }
  const e = pickAt(x, y);
  if (!e || e.kind !== 'building' || e.faction !== G.player) { Audio.play('error'); return; }
  if (G.mode === 'sell') { issue({ t: 'sell', id: e.id }); message(`${e.def.name} sold`); if (!keys.ShiftLeft) setMode(null); }
  else if (G.mode === 'repair') { issue({ t: 'rep', id: e.id, on: !e.repairing }); Audio.play('click'); message(!e.repairing ? 'Repairing' : 'Repair stopped'); }
}
function setMode(m) {
  G.mode = m;
  $('bSell').classList.toggle('on', m === 'sell'); $('bRepair').classList.toggle('on', m === 'repair');
  if (m === 'super') Audio.announce('Select target');
  setCursor();
}
function setCursor() {
  const gl = $('gl');
  gl.style.cursor = G.mode === 'sell' ? 'copy' : G.mode === 'repair' ? 'cell' : G.mode === 'spawn' || G.mode === 'super' || (G.mode && G.mode.startsWith('power:')) || attackMoveArmed ? 'crosshair' : 'default';
}
let hoverT = 0;
let barSig = '';
function updateModeBar() {
  const what = G.placing ? `Placing ${BUILDINGS[G.placing].name}` + (BUILDINGS[G.placing].isWall ? ' · drag for a line' : '') + ' · tap a green spot'
    : G.mode === 'sell' ? 'Sell mode · tap your building' : G.mode === 'repair' ? 'Repair mode · tap your building'
    : G.mode === 'spawn' ? `Sandbox · tap the map to spawn ${G.sandbox.n > 1 ? G.sandbox.n + ' × ' : ''}${UNITS[G.sandbox.type].name} (${G.sandbox.side === 'wally' ? 'Wally Squad' : 'Grimlocks'})`
    : G.mode === 'super' ? 'Superweapon · tap the target' : G.mode && G.mode.startsWith('power:') ? 'Support power · tap the target'
    : attackMoveArmed === 'patrol' ? 'Patrol · tap the far end of the route' : attackMoveArmed ? 'Attack-move · tap the destination' : '';
  if (what === barSig) return;
  barSig = what;
  const bar = $('modeBar');
  bar.style.display = what ? 'flex' : 'none';
  $('modeText').textContent = what;
}
export function cancelAllModes() {
  if (G.placing) cancelPlacing();
  if (G.mode) setMode(null);
  if (attackMoveArmed) { attackMoveArmed = false; $('tAM').classList.remove('on'); setCursor(); }
}
export function updateHover(dt) {
  updateModeBar();
  hoverT -= dt;
  G.mouse.ground = G.mouse.inside || isTouch ? screenToGround(G.mouse.x, G.mouse.y) : null;
  updateGhost();
  if (hoverT > 0) return; hoverT = 0.08;
  if (!G.mouse.inside || G.placing || G.mode || attackMoveArmed) { hoverEnt = null; return; }
  hoverEnt = pickAt(G.mouse.x, G.mouse.y);
  const gl = $('gl');
  const mine = myUnits().length > 0;
  if (hoverEnt && hoverEnt.faction !== G.player && mine) gl.style.cursor = 'crosshair';
  else if (hoverEnt) gl.style.cursor = 'pointer';
  else gl.style.cursor = mine ? 'move' : 'default';
}

// ------------------------------------------------------------ touch
function bindTouch(gl) {
  const pts = new Map();
  let start = null, pinch = null, longT = null;
  gl.addEventListener('touchstart', e => {
    e.preventDefault(); Audio.initAudio();
    for (const t of e.changedTouches) { const p = elemPos(view, t); pts.set(t.identifier, { x: p.x, y: p.y }); }
    if (pts.size === 1) {
      const p = [...pts.values()][0];
      start = { ...p, cx: G.camera.x, cz: G.camera.z, moved: false, t: performance.now(), box: touchBoxMode };
      G.mouse.x = p.x; G.mouse.y = p.y;
      if (touchBoxMode) drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, active: true };
      if (G.placing && BUILDINGS[G.placing].isWall) { const g = screenToGround(p.x, p.y); if (g) wallStart = placementCell(g.x, g.z); }
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: G.camera.dist, cx: G.camera.x, cz: G.camera.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      start = null; drag = null;
    }
    clearTimeout(longT);
  }, { passive: false });
  gl.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) { const p = elemPos(view, t); pts.set(t.identifier, { x: p.x, y: p.y }); }
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      G.camera.targetDist = clamp(pinch.dist * pinch.d / d, 18, 130); G.camera.dist = G.camera.targetDist;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const k = G.camera.dist / H * 1.4, c = Math.cos(G.camera.yaw), s = Math.sin(G.camera.yaw);
      const dx = mx - pinch.mx, dy = my - pinch.my;
      G.camera.x = pinch.cx - (dx * c + dy * s) * k; G.camera.z = pinch.cz - (-dx * s + dy * c) * k;
    } else if (start) {
      const p = [...pts.values()][0];
      G.mouse.x = p.x; G.mouse.y = p.y;
      if (Math.hypot(p.x - start.x, p.y - start.y) > 10) start.moved = true;
      if (start.box && drag) { drag.x1 = p.x; drag.y1 = p.y; }
      else if (start.moved && !G.placing) {
        const k = G.camera.dist / H * 1.4, c = Math.cos(G.camera.yaw), s = Math.sin(G.camera.yaw);
        const dx = p.x - start.x, dy = p.y - start.y;
        G.camera.x = start.cx - (dx * c + dy * s) * k; G.camera.z = start.cz - (-dx * s + dy * c) * k;
      }
    }
  }, { passive: false });
  const end = e => {
    e.preventDefault();
    for (const t of e.changedTouches) pts.delete(t.identifier);
    if (pts.size < 2) pinch = null;
    if (start && pts.size === 0) {
      const { x, y } = start;
      if (start.box && drag) { boxSelect(drag.x0, drag.y0, drag.x1, drag.y1, false); drag = null; touchBoxMode = false; $('tBox').classList.remove('on'); }
      else if (!start.moved) touchTap(x, y);
      else if (G.placing) { G.mouse.ground = screenToGround(G.mouse.x, G.mouse.y); if (wallStart) tryPlace(); }
      start = null;
    }
  };
  gl.addEventListener('touchend', end, { passive: false });
  gl.addEventListener('touchcancel', end, { passive: false });
}
function touchTap(x, y) {
  G.mouse.x = x; G.mouse.y = y;
  G.mouse.ground = screenToGround(x, y);
  if (G.placing) { updateGhost(); tryPlace(); return; }
  if (G.mode) { modeClick(x, y); return; }
  if (attackMoveArmed) { const pat = attackMoveArmed === 'patrol'; attackMoveArmed = false; $('tAM').classList.remove('on'); if (pat) patrolAt(x, y); else commandAt(x, y, true); return; }
  const e = pickAt(x, y);
  const mine = myUnits();
  if (e && e.faction === G.player) {
    if (e.kind === 'building' && mine.some(u => u.type === 'engineer' || u.type === 'harvester')) { commandAt(x, y); return; }
    leftClick(x, y, false, false); return;
  }
  if (mine.length) { commandAt(x, y); return; }
  const b = G.selection.find(s => s.kind === 'building' && s.faction === G.player);
  if (b && !e && ['barracks', 'factory', 'helipad'].includes(b.type)) { commandAt(x, y); return; }
  select(e ? [e] : []);
}

function bindButtons() {
  $('modeCancel').onclick = () => { cancelAllModes(); Audio.play('click'); };
  $('sideToggle').onclick = () => {
    document.body.classList.toggle('sideHidden');
    $('sideToggle').textContent = document.body.classList.contains('sideHidden') ? '◀ BUILD' : '▶';
    requestAnimationFrame(resize);
  };
  $('bSell').onclick = () => setMode(G.mode === 'sell' ? null : 'sell');
  $('bRepair').onclick = () => setMode(G.mode === 'repair' ? null : 'repair');
  $('bHome').onclick = () => { const b = G.buildings.find(b => b.faction === G.player && b.type === 'conyard') || G.buildings.find(b => b.faction === G.player); if (b) centerOn(b.x, b.z); };
  $('tAll').onclick = selectArmy;
  $('tStop').onclick = () => issue({ t: 'stop', ids: myUnits().map(u => u.id) });
  $('tFind').onclick = () => findEnemyBase();
  $('bFind').onclick = () => findEnemyBase();
  $('tAM').onclick = () => { attackMoveArmed = !attackMoveArmed; $('tAM').classList.toggle('on', attackMoveArmed); };
  $('tBox').onclick = () => { touchBoxMode = !touchBoxMode; $('tBox').classList.toggle('on', touchBoxMode); };
}

// ------------------------------------------------------------ selection panel
let selSig = '';
// Building info closes by itself after 10 seconds (touching the panel restarts the countdown).
const INFO_TIME = 10000;
let infoKey = '', infoSince = 0, infoHover = false;
function refreshSelPanel(force) {
  const panel = $('selPanel');
  const sel = G.selection.filter(alive);
  if (!sel.length) { panel.style.display = 'none'; panel.style.opacity = ''; selSig = ''; infoKey = ''; return; }
  const key = sel.map(s => s.id).join(',');
  if (key !== infoKey || force) { infoKey = key; infoSince = performance.now(); }
  if (sel.every(s => s.kind === 'building') && !infoHover) {
    const age = performance.now() - infoSince;
    if (age > INFO_TIME) {
      for (const s of G.selection) s.setSelected(false);
      G.selection = [];
      panel.style.display = 'none'; panel.style.opacity = ''; selSig = ''; infoKey = '';
      return;
    }
    panel.style.opacity = age > INFO_TIME - 1000 ? String(Math.max(0, (INFO_TIME - age) / 1000)) : ''; // fade out over the last second
  } else panel.style.opacity = '';
  panel.style.display = 'block';
  const sig = sel.map(s => s.id).join(',') + '|' + sel.map(s => Math.ceil(s.frenzyCD || 0) + ':' + (s.passengers ? s.passengers.length : 0)).join(',') + (force ? Math.random() : '');
  const first = sel[0];
  if (sel.length === 1) {
    const e = first; const d = e.def;
    $('selTitle').innerHTML = `${e.hero ? d.name + ' (Hero)' : d.name}${e.rank ? ' ' + '★'.repeat(e.rank) : ''} <span style="font-size:13px;color:${FACTIONS[e.faction].css}">${FACTIONS[e.faction].name}</span>`;
    let sub = `HP ${Math.ceil(e.hp)}/${e.maxHp}`;
    if (e.kind === 'unit') {
      if (e.kills) sub += ` · Kills ${e.kills}`;
      if (e.type === 'harvester') sub += ` · Load ${Math.round(e.load)}/${HARVEST_CAPACITY} · ${({ seek: 'Searching', toOre: 'To crystal', mine: 'Harvesting', return: 'Returning', toDock: 'Docking', unload: 'Unloading', manual: 'Moving' })[e.hState] || ''}`;
    } else {
      if (d.power) sub += ` · Power ${d.power > 0 ? '+' : ''}${d.power}`;
      if (e.repairing) sub += ' · Repairing';
      if (d.weapon && WEAPONSneedsPower(d) && !e.powered) sub += ' · OFFLINE (low power)';
    }
    $('selSub').textContent = sub;
    const f = e.hp / e.maxHp;
    $('selHp').style.width = (f * 100) + '%'; $('selHp').style.background = f > 0.6 ? '#4cff7a' : f > 0.3 ? '#ffc23a' : '#ff4a3d';
  } else {
    $('selTitle').textContent = `${sel.length} units selected`;
    $('selSub').textContent = 'Click an icon to select only that type';
    const hp = sel.reduce((a, s) => a + s.hp / s.maxHp, 0) / sel.length;
    $('selHp').style.width = (hp * 100) + '%'; $('selHp').style.background = '#4cff7a';
  }
  if (sig === selSig) return;
  selSig = sig.replace(/0\.\d+$/, '');
  const icn = $('selIcons'); icn.innerHTML = '';
  if (sel.length > 1) {
    const counts = {};
    for (const s of sel) counts[s.type] = (counts[s.type] || 0) + 1;
    for (const t in counts) {
      const el = document.createElement('div'); el.className = 'sicon';
      el.innerHTML = `<img src="${icons[t] || ''}"><span>${counts[t]}</span>`;
      el.onclick = () => select(sel.filter(s => s.type === t));
      icn.appendChild(el);
    }
  }
  const cmds = $('selCmds'); cmds.innerHTML = '';
  const addBtn = (label, fn, title) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.title = title || ''; b.onclick = fn; cmds.appendChild(b); };
  if (first.faction === G.player) {
    if (first.kind === 'unit') {
      addBtn('■ Stop (S)', () => issue({ t: 'stop', ids: myUnits().map(u => u.id) }));
      if (myUnits().some(u => u.weapon)) addBtn('⚔ Attack-move (A)', () => { attackMoveArmed = true; setCursor(); });
      if (myUnits().some(u => u.weapon)) addBtn('↔ Patrol (P)', () => { attackMoveArmed = 'patrol'; setCursor(); }, 'Walk back and forth between here and a point you pick, attacking any enemy on the way.');
      const wl = myUnits().filter(u => u.type === 'warlord');
      if (wl.length) { const cd = Math.max(...wl.map(u => u.frenzyCD || 0)); addBtn(cd > 0 ? `📣 War Cry (${Math.ceil(cd)}s)` : '📣 War Cry (G)', () => { issue({ t: 'ability', ids: wl.map(u => u.id) }); Voices.say('warlord', 'attack', true); selSig = ''; }, 'Every Grimlock fighter within 13 m fires much faster for 6 seconds. 55 second cooldown.'); }
      const wm = myUnits().filter(u => u.type === 'wallyman');
      if (wm.length) {
        const cd = Math.max(...wm.map(u => u.frenzyCD || 0));
        addBtn(cd > 0 ? `⚡ Frenzy (${Math.ceil(cd)}s)` : '⚡ Gatling Frenzy (G)', () => { issue({ t: 'ability', ids: wm.map(u => u.id) }); Voices.say('wallyman', 'attack', true); selSig = ''; }, '8 seconds of super-fast fire and +35% speed. 45 second cooldown.');
      }
      const apcs = myUnits().filter(u => u.def.transport);
      if (apcs.length) {
        const n = apcs.reduce((a, u) => a + (u.passengers || []).length, 0), cap = apcs.reduce((a, u) => a + u.def.transport, 0);
        addBtn(`⏏ Unload (${n}/${cap}) (U)`, () => { issue({ t: 'unload', ids: apcs.map(u => u.id) }); Audio.play('ack'); setTimeout(() => refreshSelPanel(true), 150); }, 'Drop off the infantry inside. To load: select infantry and right-click (or tap) the APC.');
      }
      if (first.type === 'harvester') addBtn('⛏ Harvest', () => issue({ t: 'seek', ids: myUnits().map(u => u.id) }));
      addBtn('⌖ Focus (F)', () => centerOn(first.x, first.z));
      if (myUnits().some(u => u.weapon)) {
        const cur = myUnits().every(u => (u.stance || 'aggressive') === (first.stance || 'aggressive')) ? (first.stance || 'aggressive') : '';
        const row = document.createElement('div'); row.className = 'stanceRow';
        for (const [s, label, tip] of [['aggressive', '⚔ Aggressive', 'Chase and attack enemies in sight'], ['hold', '🛡 Hold position', 'Only shoot what is in range, never move'], ['holdfire', '✋ Hold fire', 'Never shoot unless ordered (good for sneaking)']]) {
          const b = document.createElement('button'); b.className = 'btn' + (cur === s ? ' on' : ''); b.textContent = label; b.title = tip;
          b.onclick = () => { issue({ t: 'stance', ids: myUnits().map(u => u.id), s }); Audio.play('click'); setTimeout(() => refreshSelPanel(true), 120); };
          row.appendChild(b);
        }
        cmds.appendChild(row);
      }
    } else {
      addBtn(first.repairing ? '🔧 Stop repair' : '🔧 Repair', () => { issue({ t: 'rep', id: first.id, on: !first.repairing }); selSig = ''; setTimeout(() => refreshSelPanel(true), 300); });
      addBtn('$ Sell', () => issue({ t: 'sell', id: first.id }));
      if (first.def.garrison) {
        const n = (first.passengers || []).length;
        if (n) addBtn(`⏏ Evacuate (${n}/${first.def.garrison}) (U)`, () => { issue({ t: 'unload', ids: [first.id] }); Audio.play('ack'); setTimeout(() => refreshSelPanel(true), 150); }, 'Send the garrison back outside.');
        const s = document.createElement('div'); s.className = 'sub'; s.style.width = '100%'; s.textContent = `Garrison ${n}/${first.def.garrison}: select infantry and right-click (or tap) the bunker to send them in.`; cmds.appendChild(s);
      }
      if (['barracks', 'factory', 'helipad'].includes(first.type)) {
        addBtn(first.primary ? '★ Primary' : '☆ Set primary', () => { issue({ t: 'prim', id: first.id }); selSig = ''; refreshSelPanel(true); });
        const s = document.createElement('div'); s.className = 'sub'; s.style.width = '100%'; s.textContent = 'Right-click the map to set a rally point'; cmds.appendChild(s);
      }
    }
  }
}
function WEAPONSneedsPower(d) { return d.weapon === 'plasma'; }

// ------------------------------------------------------------ minimap
let mmT = 0, fogCanvas = null, fogCtx = null, fogImg = null;
export function updateMinimap(dt) {
  mmT -= dt; if (mmT > 0) return; mmT = 0.25;
  const mm = $('minimap'), c = mm.getContext('2d');
  const S = mm.width;
  const P = G.players[G.player];
  const radar = (P.owned.radar > 0 && P.powerProd >= P.powerUse) || G.revealed;
  $('radarOff').textContent = radar ? '' : (P.owned.radar > 0 ? 'RADAR OFFLINE — LOW POWER' : 'Build a Comms Center for radar');
  c.imageSmoothingEnabled = true;
  c.drawImage(T.minimapImage, 0, 0, S, S);
  // fog
  if (!fogCanvas) { fogCanvas = document.createElement('canvas'); fogCanvas.width = fogCanvas.height = GRID; fogCtx = fogCanvas.getContext('2d'); fogImg = fogCtx.createImageData(GRID, GRID); }
  if (!G.revealed) {
    for (let i = 0; i < GRID * GRID; i++) { fogImg.data[i * 4 + 3] = T.explored[i] ? (T.visible[i] ? 0 : (radar ? 110 : 160)) : 255; }
    fogCtx.putImageData(fogImg, 0, 0);
    c.drawImage(fogCanvas, 0, 0, S, S);
  }
  if (!radar) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, S, S); }
  const k = S / WORLD;
  // ore
  c.fillStyle = 'rgba(80,255,150,0.75)';
  for (let i = 0; i < GRID * GRID; i += 1) if (T.ore[i] > 40 && (T.explored[i] || G.revealed)) { c.fillStyle = T.oreRich[i] ? 'rgba(90,170,255,0.8)' : 'rgba(80,255,150,0.65)'; c.fillRect((i % GRID) * CELL * k, ((i / GRID) | 0) * CELL * k, CELL * k, CELL * k); }
  for (const b of G.buildings) {
    if (b.dead) continue;
    if (b.def.isMine && b.faction !== G.player) continue;
    if (b.faction !== G.player && !isExploredAt(b.x, b.z)) continue;
    c.fillStyle = FACTIONS[b.faction].css;
    c.fillRect((b.x - b.def.w * CELL / 2 + HALF) * k, (b.z - b.def.h * CELL / 2 + HALF) * k, b.def.w * CELL * k, b.def.h * CELL * k);
  }
  if (radar) for (const u of G.units) {
    if (u.dead) continue;
    if (u.faction !== G.player && !isVisibleAt(u.x, u.z)) continue;
    c.fillStyle = u.faction === G.player ? (u.selected ? '#ffffff' : '#7fc0ff') : '#ff6a5a';
    const s = u.isInf ? 2 : 3;
    c.fillRect((u.x + HALF) * k - s / 2, (u.z + HALF) * k - s / 2, s, s);
  }
  // camera view
  const pts = [[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => screenToGround(x, y) || approxGround(x, y));
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.2; c.beginPath();
  pts.forEach((p, i) => { const X = (p.x + HALF) * k, Y = (p.z + HALF) * k; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
  c.closePath(); c.stroke();
  if (G.alertAt && G.time - G.alertAt.t < 3) {
    const r = 6 + (G.time - G.alertAt.t) * 10;
    c.strokeStyle = `rgba(255,60,40,${1 - (G.time - G.alertAt.t) / 3})`; c.lineWidth = 2;
    c.beginPath(); c.arc((G.alertAt.x + HALF) * k, (G.alertAt.z + HALF) * k, r, 0, 7); c.stroke();
  }
}
function approxGround(sx, sy) {
  ndc.set(sx / W * 2 - 1, -(sy / H) * 2 + 1);
  raycaster.setFromCamera(ndc, G.three.camera);
  const o = raycaster.ray.origin, d = raycaster.ray.direction;
  const t = d.y < -0.01 ? (0 - o.y) / d.y : 300;
  return { x: clamp(o.x + d.x * t, -HALF, HALF), z: clamp(o.z + d.z * t, -HALF, HALF) };
}

// ------------------------------------------------------------ overlay: health bars, drag box
export function drawOverlay() {
  octx.clearRect(0, 0, W, H);
  const now = G.time;
  const bar = (e, x, y, w) => {
    const f = clamp(e.hp / e.maxHp, 0, 1);
    octx.fillStyle = 'rgba(0,0,0,0.7)'; octx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    octx.fillStyle = f > 0.6 ? '#4cff7a' : f > 0.3 ? '#ffc23a' : '#ff4a3d';
    octx.fillRect(x - w / 2, y, w * f, 4);
    // segments
    octx.fillStyle = 'rgba(0,0,0,0.5)';
    for (let i = 1; i < 5; i++) octx.fillRect(x - w / 2 + w * i / 5, y, 1, 4);
  };
  for (const u of G.units) {
    if (u.dead || !u.mesh.visible) continue;
    const show = u.selected || u === hoverEnt || (u.lastHit && now - u.lastHit < 2.5);
    if (!show && !u.rank) continue;
    const top = u.y + (u.isInf ? 2.1 : u.air ? 1.8 : u.type === 'titan' ? 3.2 : 2.6);
    const p = project(u.x, top, u.z);
    if (p.behind || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
    const w = u.isInf ? 22 : clamp(u.def.radius * 26, 26, 52);
    if (show) bar(u, p.x, p.y, w);
    if (u.def.transport && (u.passengers || []).length) { for (let i = 0; i < u.def.transport; i++) { octx.fillStyle = i < u.passengers.length ? '#7dff9a' : 'rgba(0,0,0,0.5)'; octx.fillRect(p.x - 14 + i * 6, p.y - 8, 4, 4); } }
    if (u.stance && u.selected) { octx.font = '11px sans-serif'; octx.textAlign = 'center'; octx.fillText(u.stance === 'hold' ? '🛡' : '✋', p.x + w / 2 + 8, p.y + 6); }
    if (u.rank) { octx.fillStyle = '#ffd34a'; octx.font = 'bold 11px Rajdhani'; octx.textAlign = 'center'; octx.fillText('★'.repeat(u.rank), p.x, p.y - 3); }
    if (show && u.type === 'harvester') {
      octx.fillStyle = 'rgba(0,0,0,0.7)'; octx.fillRect(p.x - w / 2 - 1, p.y + 5, w + 2, 4);
      octx.fillStyle = '#5affb0'; octx.fillRect(p.x - w / 2, p.y + 6, w * u.load / HARVEST_CAPACITY, 2);
    }
    if (u.selected && u.faction === G.player) {
      for (const n in G.groups) if (G.groups[n].includes(u)) { octx.fillStyle = '#fff'; octx.font = 'bold 11px Rajdhani'; octx.textAlign = 'left'; octx.fillText(n, p.x + w / 2 + 3, p.y + 5); break; }
    }
  }
  for (const b of G.buildings) {
    if (b.dead || !b.mesh.visible) continue;
    const show = b.selected || b === hoverEnt || (b.lastHit && now - b.lastHit < 3) || b.repairing;
    const P = G.players[b.faction];
    const off = b.faction === G.player && P.powerUse > P.powerProd && b.type === 'plasma';
    const gar = b.def.garrison && b.faction === G.player ? (b.passengers || []).length : 0;
    if (!show && !off && !b.primary && !gar && !(b.def.wonder && b.buildAnim >= 1)) continue;
    const p = project(b.x, b.baseY + (b.def.wonder ? 8.4 : b.def.w === 1 ? 5.5 : 4.8), b.z);
    if (p.behind) continue;
    const w = clamp(b.def.w * 18, 30, 72);
    if (show) bar(b, p.x, p.y, w);
    octx.textAlign = 'center'; octx.font = 'bold 12px Rajdhani';
    if (b.repairing) { octx.fillStyle = '#7fd0ff'; octx.fillText('🔧 REPAIRING', p.x, p.y - 4); }
    if (off) { octx.fillStyle = Math.sin(now * 8) > 0 ? '#ff4a3d' : '#ffc23a'; octx.fillText('⚡ NO POWER', p.x, p.y - 4); }
    if (b.primary && b.faction === G.player) { octx.fillStyle = '#ffc23a'; octx.fillText('PRIMARY', p.x, p.y + 16); }
    if (b.def.wonder && b.buildAnim >= 1) { const left = Math.max(0, 300 - (b.wonderT || 0)); octx.font = 'bold 15px Rajdhani'; octx.fillStyle = b.faction === G.player ? '#ffd34a' : '#ff6a5a'; octx.fillText(`🗿 ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, p.x, p.y - 8); }
    if (b.def.garrison && b.faction === G.player) for (let i = 0; i < b.def.garrison; i++) { octx.fillStyle = i < gar ? '#7dff9a' : 'rgba(0,0,0,0.5)'; octx.fillRect(p.x - 12 + i * 6, p.y - 9, 4, 4); }
    if (b.selected && b.rally && b.faction === G.player) {
      const r = project(b.rally.x, heightAt(b.rally.x, b.rally.z) + 0.2, b.rally.z);
      const s = project(b.x, b.baseY + 0.5, b.z);
      octx.strokeStyle = 'rgba(255,194,58,0.8)'; octx.setLineDash([6, 4]); octx.lineWidth = 1.5;
      octx.beginPath(); octx.moveTo(s.x, s.y); octx.lineTo(r.x, r.y); octx.stroke(); octx.setLineDash([]);
      octx.fillStyle = '#ffc23a'; octx.beginPath(); octx.arc(r.x, r.y, 4, 0, 7); octx.fill();
    }
  }
  // order lines for selected units
  for (const u of G.selection) {
    if (u.kind !== 'unit' || u.faction !== G.player || u.dead || !u.path || u.pi >= u.path.length) continue;
    const g = u.path[u.path.length - 1];
    const a = project(u.x, u.y + 0.3, u.z), b = project(g.x, heightAt(g.x, g.z) + 0.3, g.z);
    if (a.behind || b.behind) continue;
    octx.strokeStyle = u.order?.type === 'attackMove' ? 'rgba(255,150,50,0.35)' : 'rgba(80,255,120,0.3)';
    octx.lineWidth = 1; octx.beginPath(); octx.moveTo(a.x, a.y); octx.lineTo(b.x, b.y); octx.stroke();
  }
  for (const u of G.selection) {
    if (u.kind !== 'unit' || u.dead || !u.waypoints || !u.waypoints.length) continue;
    let prev = u.path && u.path.length ? u.path[u.path.length - 1] : { x: u.x, z: u.z };
    octx.strokeStyle = 'rgba(120,255,160,0.55)'; octx.setLineDash([4, 4]); octx.lineWidth = 1.2;
    for (const w of u.waypoints) {
      const a = project(prev.x, heightAt(prev.x, prev.z) + 0.3, prev.z), b = project(w.x, heightAt(w.x, w.z) + 0.3, w.z);
      if (!a.behind && !b.behind) { octx.beginPath(); octx.moveTo(a.x, a.y); octx.lineTo(b.x, b.y); octx.stroke(); octx.fillStyle = '#7dff9a'; octx.fillRect(b.x - 2, b.y - 2, 4, 4); }
      prev = w;
    }
    octx.setLineDash([]);
  }
  if (drag && drag.active) {
    octx.strokeStyle = '#7dff9a'; octx.lineWidth = 1.5; octx.fillStyle = 'rgba(80,255,120,0.08)';
    const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1), w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
    octx.fillRect(x, y, w, h); octx.strokeRect(x, y, w, h);
  }
  if (G.placing && wallStart && G.mouse.ground) {
    const n = lineCells(wallStart, placementCell(G.mouse.ground.x, G.mouse.ground.z)).length;
    octx.fillStyle = '#fff'; octx.font = 'bold 13px Rajdhani'; octx.textAlign = 'left';
    octx.fillText(n + ' x wall  $' + n * BUILDINGS.wall.cost, G.mouse.x + 14, G.mouse.y + 4);
  }
  if (G.mode && G.mode.startsWith('power:') && G.mouse.inside) {
    octx.fillStyle = '#7dff9a'; octx.font = 'bold 14px Rajdhani'; octx.textAlign = 'left';
    octx.fillText(POWERS[G.mode.slice(6)].name.toUpperCase() + ': CLICK TARGET', G.mouse.x + 16, G.mouse.y + 4);
  }
  if (G.mode === 'super' && G.mouse.inside) {
    octx.fillStyle = '#ff5a3a'; octx.font = 'bold 14px Rajdhani'; octx.textAlign = 'left';
    octx.fillText('SELECT TARGET', G.mouse.x + 16, G.mouse.y + 4);
  }
  if (attackMoveArmed && G.mouse.inside) {
    octx.fillStyle = '#ff9a33'; octx.font = 'bold 13px Rajdhani'; octx.textAlign = 'left';
    octx.fillText('ATTACK-MOVE', G.mouse.x + 14, G.mouse.y + 4);
  }
}
export { icons };

// big "Triple kill!" style banner in the middle of the screen
let streakTimer = 0;
export function streakBanner(text) {
  const el = document.getElementById('streak'); if (!el) return;
  el.textContent = text; el.classList.add('show');
  clearTimeout(streakTimer); streakTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// ---- idle units: fighting units that have nothing to do
export function idleUnits() {
  return G.units.filter(u => !u.dead && !u.boarded && u.faction === G.player && (u.weapon || u.def.repairs || u.def.heals || u.def.detector) && !u.order && !u.target && !u.path && !(u.dropH > 0));
}
let idleIdx = 0;
export function selectNextIdle() {
  const list = idleUnits();
  if (!list.length) { message('No idle units'); return; }
  const u = list[idleIdx++ % list.length];
  select([u]); centerOn(u.x, u.z); Audio.play('click');
}

function patrolAt(sx, sy) {
  const g = screenToGround(sx, sy); if (!g) return;
  const ids = myUnits().map(u => u.id); if (!ids.length) return;
  issue({ t: 'patrol', ids, x: g.x, z: g.z });
  flashMarker(g.x, g.z, 0x7fd0ff); Audio.play('ack');
  Voices.say(myUnits()[0].type, 'move');
}

export function setModePublic(m) { setMode(m); }
