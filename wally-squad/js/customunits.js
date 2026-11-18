// Unit Designer: players invent their own infantry and vehicles. Designs are saved in this browser,
// turned into real unit types at start-up, and appear in the build menu like any other unit.
import * as THREE from 'three';
import { UNITS, WEAPONS } from './config.js';
import { makeCustomModel } from './models.js';
import { fogUniforms } from './materials.js';

WEAPONS.rocketPod = { warhead: 'rocket', damage: 55, range: 14, rof: 2.2, proj: 'rocket', air: true, ground: true, sound: 'rocket', twin: true };

export const INF_WEAPONS = {
  rifle: { label: 'Rifle', w: 'rifle', cost: 40 },
  gatling: { label: 'Gatling gun', w: 'gatling', cost: 260 },
  bazooka: { label: 'Bazooka', w: 'bazooka', cost: 180 },
  flamer: { label: 'Flamethrower', w: 'flamer', cost: 130 },
  sniper: { label: 'Sniper rifle', w: 'sniper', cost: 420 },
};
export const VEH_WEAPONS = {
  mg: { label: 'Machine gun', w: 'mg', cost: 100 },
  gatling: { label: 'Gatling cannon', w: 'gatling', cost: 260 },
  cannon: { label: 'Cannon', w: 'cannon', cost: 250 },
  twin: { label: 'Twin cannons', w: 'twin', cost: 600 },
  rocketPod: { label: 'Rocket pods (hits air)', w: 'rocketPod', cost: 320 },
  inferno: { label: 'Flamethrower', w: 'inferno', cost: 350 },
  arty: { label: 'Artillery', w: 'arty', cost: 420 },
};
export const HEADGEAR = { helmet: 'Helmet', cap: 'Cap', beret: 'Beret', bandana: 'Bandana', bobble: 'Bobble hat', hair: 'Ginger hair', none: 'Bald' };
export const CHASSIS = { tracks: 'Tracks', wheels: 'Wheels', hover: 'Hover' };
export const SIZES = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };
export const COLORS = ['team', '#2b64cc', '#e0461c', '#2fa34a', '#f2c200', '#7a3cc8', '#20a4a4', '#e86aa8', '#eeeeee', '#3a3a3a', '#8a6a3e', '#556b2f'];

const KEY = 'ws_custom_units';
export function loadDesigns() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveDesigns(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } }

export function newDesign(kind = 'infantry') {
  return kind === 'vehicle'
    ? { id: Math.random().toString(36).slice(2, 8), kind, name: 'My Tank', weapon: 'cannon', chassis: 'tracks', size: 'medium', armor: 3, speed: 3, color: 'team', accent: 'team' }
    : { id: Math.random().toString(36).slice(2, 8), kind, name: 'My Trooper', weapon: 'rifle', headgear: 'helmet', armor: 2, speed: 3, color: 'team', accent: 'team', glasses: false, backpack: true, cape: false, belly: false, capeColor: '#e0461c' };
}

// Turn a design into game stats
export function statsOf(d) {
  const a = Math.max(1, Math.min(5, d.armor | 0)), s = Math.max(1, Math.min(5, d.speed | 0));
  if (d.kind === 'vehicle') {
    const size = d.size || 'medium';
    const base = { light: { hp: 240, sp: 9.5, r: 1.0, tr: 3.4, cost: 250 }, medium: { hp: 520, sp: 6.2, r: 1.35, tr: 2.6, cost: 550 }, heavy: { hp: 950, sp: 4.2, r: 1.75, tr: 1.7, cost: 950 } }[size];
    let hp = base.hp * (0.7 + 0.15 * a), sp = base.sp * (0.75 + 0.12 * s);
    if (d.chassis === 'hover') { sp *= 1.15; hp *= 0.88; }
    if (d.chassis === 'wheels') { sp *= 1.08; hp *= 0.94; }
    const wpn = VEH_WEAPONS[d.weapon] || VEH_WEAPONS.cannon;
    const cost = Math.round((base.cost + wpn.cost + a * 90 + s * 60) / 10) * 10;
    return { hp: Math.round(hp), speed: +sp.toFixed(1), radius: base.r, turnRate: base.tr, armor: a >= 3 ? 'heavy' : 'light', weapon: wpn.w, cost, time: Math.max(5, Math.round(cost / 70)), sight: 14 };
  }
  const wpn = INF_WEAPONS[d.weapon] || INF_WEAPONS.rifle;
  const hp = 60 + 55 * a, sp = 2.4 + 0.5 * s;
  const cost = Math.round((60 + wpn.cost + a * 45 + s * 25) / 10) * 10;
  return { hp, speed: +sp.toFixed(1), radius: 0.48, armor: 'infantry', weapon: wpn.w, cost, time: Math.max(3, Math.round(cost / 70)), sight: wpn.w === 'sniper' ? 18 : 13 };
}

// Register designs as unit types (called at start-up, before icons and the build menu are made)
export function registerCustomUnits(list) {
  const out = [];
  for (const d of list || []) {
    const st = statsOf(d);
    const type = 'custom_' + d.id;
    UNITS[type] = {
      name: d.name || 'Custom unit', cost: st.cost, time: st.time, hp: st.hp, armor: st.armor, speed: st.speed, sight: st.sight,
      radius: st.radius, weapon: st.weapon, turnRate: st.turnRate, tab: d.kind === 'vehicle' ? 'vehicle' : 'infantry',
      req: d.kind === 'vehicle' ? ['factory'] : ['barracks'], custom: true, design: d,
      desc: `Your own design. ${d.kind === 'vehicle' ? `${SIZES[d.size]} ${CHASSIS[d.chassis].toLowerCase()} vehicle` : 'Infantry'} with ${(d.kind === 'vehicle' ? VEH_WEAPONS : INF_WEAPONS)[d.weapon].label.toLowerCase()}.`,
    };
    out.push(type);
  }
  return out;
}

// ------------------------------------------------------------------ designer screen
let preview = null;
function setupPreview(canvas) {
  if (preview) return preview;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x30281e, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.2); sun.position.set(5, 8, 6); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6fb0ff, 1.4); rim.position.set(-6, 3, -5); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a2733, roughness: 0.9 }));
  scene.add(floor);
  const cam = new THREE.PerspectiveCamera(32, 1.3, 0.1, 100);
  preview = { renderer, scene, cam, model: null, kind: null };
  const tick = () => {
    if (!canvas.isConnected || canvas.offsetParent === null) { requestAnimationFrame(tick); return; }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (preview.model) {
      preview.model.rotation.y += 0.012;
      const bar = preview.model.getObjectByName('barrels'); if (bar) bar.rotation.z += 0.3;
      const cape = preview.model.getObjectByName('cape'); if (cape) cape.rotation.x = 0.3 + Math.sin(performance.now() / 300) * 0.1;
    }
    const prev = fogUniforms.uFogOn.value; fogUniforms.uFogOn.value = 0;
    renderer.render(scene, cam);
    fogUniforms.uFogOn.value = prev;
    requestAnimationFrame(tick);
  };
  tick();
  return preview;
}
function showModel(d, faction) {
  const p = preview;
  if (p.model) p.scene.remove(p.model);
  p.model = makeCustomModel(d, faction, false);
  p.scene.add(p.model);
  const veh = d.kind === 'vehicle';
  const r = veh ? 3.6 * ({ light: 0.8, medium: 1, heavy: 1.28 }[d.size]) : 1.15;
  p.cam.position.set(r * 1.6, r * 1.05, r * 2.0); p.cam.lookAt(0, veh ? 0.7 : 0.9, 0);
}

export function buildDesigner(el, opts) {
  let list = loadDesigns();
  let cur = list[0] ? { ...list[0] } : newDesign();
  const faction = opts.faction || 'wally';
  el.innerHTML = `
    <div class="dsg">
      <div class="dsgLeft">
        <div class="label">Your designs</div>
        <div id="dsgList" class="dsgList"></div>
        <div class="row" style="justify-content:flex-start"><button class="btn" id="dsgNewInf">+ Infantry</button><button class="btn" id="dsgNewVeh">+ Vehicle</button></div>
        <canvas id="dsgPreview"></canvas>
        <div id="dsgStats" class="dsgStats"></div>
      </div>
      <div class="dsgRight" id="dsgForm"></div>
    </div>`;
  setupPreview(el.querySelector('#dsgPreview'));
  const $ = s => el.querySelector(s);

  const renderList = () => {
    $('#dsgList').innerHTML = list.length ? '' : '<span style="color:var(--dim)">No designs yet - make one!</span>';
    for (const d of list) {
      const b = document.createElement('button');
      b.className = 'btn' + (d.id === cur.id ? ' on' : '');
      b.textContent = (d.kind === 'vehicle' ? '🚙 ' : '🪖 ') + d.name;
      b.onclick = () => { cur = { ...d }; render(); };
      $('#dsgList').appendChild(b);
    }
  };
  const choice = (label, options, key, onPick) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="label small">${label}</div>`;
    const row = document.createElement('div'); row.className = 'chips';
    for (const [k, v] of Object.entries(options)) {
      const b = document.createElement('button'); b.className = 'btn chip' + (cur[key] === k ? ' on' : ''); b.textContent = v.label || v;
      b.onclick = () => { cur[key] = k; onPick?.(); render(); };
      row.appendChild(b);
    }
    wrap.appendChild(row); return wrap;
  };
  const colors = (label, key) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="label small">${label}</div>`;
    const row = document.createElement('div'); row.className = 'chips';
    for (const c of COLORS) {
      const b = document.createElement('button'); b.className = 'swatchBtn' + (cur[key] === c ? ' on' : '');
      b.style.background = c === 'team' ? 'linear-gradient(135deg,#3d8bff 50%,#ff4a3d 50%)' : c;
      b.title = c === 'team' ? 'Faction colour' : c;
      b.onclick = () => { cur[key] = c; render(); };
      row.appendChild(b);
    }
    wrap.appendChild(row); return wrap;
  };
  const slider = (label, key, lo, hi) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="label small">${label}: <b>${cur[key]}</b></div>`;
    const r = document.createElement('input'); r.type = 'range'; r.min = lo; r.max = hi; r.value = cur[key]; r.className = 'dsgRange';
    r.oninput = () => { cur[key] = +r.value; render(); };
    wrap.appendChild(r); return wrap;
  };
  const toggle = (label, key) => {
    const b = document.createElement('button'); b.className = 'btn chip' + (cur[key] ? ' on' : ''); b.textContent = (cur[key] ? '✔ ' : '') + label;
    b.onclick = () => { cur[key] = !cur[key]; render(); };
    return b;
  };

  function render() {
    renderList();
    const f = $('#dsgForm'); f.innerHTML = '';
    const nameRow = document.createElement('div');
    nameRow.innerHTML = `<div class="label small">Name</div>`;
    const inp = document.createElement('input'); inp.className = 'dsgName'; inp.maxLength = 22; inp.value = cur.name;
    inp.oninput = () => { cur.name = inp.value; };
    nameRow.appendChild(inp); f.appendChild(nameRow);
    if (cur.kind === 'vehicle') {
      f.appendChild(choice('Weapon', VEH_WEAPONS, 'weapon'));
      f.appendChild(choice('Chassis', CHASSIS, 'chassis'));
      f.appendChild(choice('Size', SIZES, 'size'));
    } else {
      f.appendChild(choice('Weapon', INF_WEAPONS, 'weapon'));
      f.appendChild(choice('Headgear', HEADGEAR, 'headgear'));
      const ex = document.createElement('div'); ex.innerHTML = '<div class="label small">Extras</div>';
      const row = document.createElement('div'); row.className = 'chips';
      row.append(toggle('Glasses', 'glasses'), toggle('Backpack', 'backpack'), toggle('Cape', 'cape'), toggle('Big belly', 'belly'));
      ex.appendChild(row); f.appendChild(ex);
      if (cur.cape) f.appendChild(colors('Cape colour', 'capeColor'));
    }
    f.appendChild(slider('Armour', 'armor', 1, 5));
    f.appendChild(slider('Speed', 'speed', 1, 5));
    f.appendChild(colors(cur.kind === 'vehicle' ? 'Paint' : 'Uniform', 'color'));
    f.appendChild(colors('Trim', 'accent'));
    const btns = document.createElement('div'); btns.className = 'row';
    const save = document.createElement('button'); save.className = 'btn big'; save.textContent = '💾 Save design';
    save.onclick = () => {
      cur.name = (cur.name || '').trim() || (cur.kind === 'vehicle' ? 'My Tank' : 'My Trooper');
      const i = list.findIndex(x => x.id === cur.id);
      if (i >= 0) list[i] = { ...cur }; else { if (list.length >= 10) { alert('You can keep up to 10 designs. Delete one first.'); return; } list.push({ ...cur }); }
      saveDesigns(list); renderList();
      save.textContent = '✔ Saved!'; setTimeout(() => { save.textContent = '💾 Save design'; }, 1200);
    };
    const del = document.createElement('button'); del.className = 'btn'; del.textContent = '🗑 Delete';
    del.onclick = () => { if (!list.some(x => x.id === cur.id) || !confirm(`Delete ${cur.name}?`)) return; list = list.filter(x => x.id !== cur.id); saveDesigns(list); cur = list[0] ? { ...list[0] } : newDesign(); render(); };
    btns.append(save, del); f.appendChild(btns);
    // stats + preview
    const st = statsOf(cur);
    const W = WEAPONS[st.weapon];
    const dps = Math.round(W.damage / W.rof * (W.twin ? 2 : 1));
    $('#dsgStats').innerHTML = `<span>Cost</span><b>$${st.cost}</b><span>Build time</span><b>${st.time}s</b><span>Health</span><b>${st.hp}</b><span>Speed</span><b>${st.speed}</b><span>Firepower</span><b>${dps}/s</b><span>Range</span><b>${W.range}</b><span>Built at</span><b>${cur.kind === 'vehicle' ? 'War Factory' : 'Barracks'}</b>`;
    showModel(cur, faction);
  }
  $('#dsgNewInf').onclick = () => { cur = newDesign('infantry'); render(); };
  $('#dsgNewVeh').onclick = () => { cur = newDesign('vehicle'); render(); };
  render();
}
void UNITS;
