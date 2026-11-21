// Map Editor: design your own battlefield (bases, crystal, lakes, roads, mountains, forests, theme)
// with a live preview. Saved maps join the map lists for Skirmish, Survival and online battles.
import { MAPS, THEMES } from './maps.js';
import { previewMap } from './terrain.js';
import { elemPos } from './orient.js';

const KEY = 'ws_custom_maps';
export const loadMaps = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const saveMaps = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } };

const WEATHER_BY_THEME = {
  temperate: ['clear', 'clear', 'rain', 'fog', 'storm'], snow: ['snow', 'snow', 'clear', 'fog', 'blizzard'],
  desert: ['clear', 'clear', 'sandstorm', 'clear'], autumn: ['clear', 'clear', 'rain', 'fog', 'storm'], blossom: ['clear', 'clear', 'rain', 'fog'], highland: ['rain', 'rain', 'fog', 'clear', 'storm'], canyon: ['clear', 'clear', 'sandstorm', 'clear', 'fog'], night: ['clear', 'rain', 'fog', 'storm'],
};
const rnd = () => Math.round((Math.random() - 0.5) * 200);

export function newMapDesign() {
  return {
    id: Math.random().toString(36).slice(2, 8), name: 'My Battlefield', theme: 'temperate',
    seed: [rnd(), rnd(), rnd(), rnd()], ridge: 50, forest: 0.12,
    slots: [{ x: -84, z: 84 }, { x: 84, z: -84 }],
    roads: [[]],
    ore: [{ x: -62, z: 104, r: 11, rich: 0 }, { x: 62, z: -104, r: 11, rich: 0 }, { x: 0, z: 0, r: 9, rich: 1 }],
    lakes: [{ x: -40, z: -30, r: 16 }, { x: 40, z: 30, r: 16 }],
  };
}

// editor design -> map definition the game understands
export function toMapDef(d) {
  const lanes = (d.roads.length ? d.roads : [[]]).map(pts => [[d.slots[0].x, d.slots[0].z], ...pts.map(p => [p.x, p.z]), [d.slots[1].x, d.slots[1].z]]);
  return {
    name: d.name, desc: `Custom map · ${d.theme}`, custom: true, seed: d.seed, slots: d.slots, lanes,
    ore: d.ore.map(o => ({ ...o })), lakes: d.lakes.map(l => ({ ...l })), ridge: d.ridge, forest: d.forest,
    theme: d.theme, weather: WEATHER_BY_THEME[d.theme], night: d.theme === 'night' || undefined,
  };
}

// add saved custom maps to the game's map list
export function registerCustomMaps() {
  for (const d of loadMaps()) MAPS['custom_' + d.id] = toMapDef(d);
}

// ---------------------------------------------------------------- editor UI
export function buildMapEditor(el, onPlay) {
  let list = loadMaps();
  let d = list[0] ? JSON.parse(JSON.stringify(list[0])) : newMapDesign();
  let tool = 'move', size = 10, drag = null, previewImg = null, previewTimer = 0;
  el.innerHTML = `
    <div class="medit">
      <div class="meLeft"><canvas id="meCanvas" width="512" height="512"></canvas>
        <div class="meHint" id="meHint"></div></div>
      <div class="meRight">
        <div class="label small">Your maps</div><div class="chips" id="meList"></div>
        <div class="row" style="justify-content:flex-start"><button class="btn chip" id="meNew">+ New map</button><button class="btn chip" id="meDup">⧉ Copy built-in…</button></div>
        <div class="label small">Name</div><input class="dsgName" id="meName" maxlength="24">
        <div class="label small">Tool</div><div class="chips" id="meTools"></div>
        <div class="label small">New item size: <b id="meSizeV"></b></div><input type="range" class="dsgRange" id="meSize" min="5" max="24">
        <div class="label small">Theme</div><div class="chips" id="meTheme"></div>
        <div class="label small">Mountains: <b id="meRidgeV"></b></div><input type="range" class="dsgRange" id="meRidge" min="10" max="95">
        <div class="label small">Forests: <b id="meForestV"></b></div><input type="range" class="dsgRange" id="meForest" min="0" max="100">
        <div class="chips" style="margin-top:6px"><button class="btn chip" id="meSeed">🎲 New terrain</button><button class="btn chip" id="meMirror">⇋ Make fair (mirror)</button><button class="btn chip" id="meClear">🧹 Clear items</button></div>
        <div class="row"><button class="btn big" id="meSave">💾 Save</button><button class="btn" id="meDel">🗑 Delete</button></div>
        <div class="row"><button class="btn" id="mePlay">⚔ Play skirmish</button><button class="btn" id="mePlaySv">☠ Play survival</button></div>
      </div>
    </div>`;
  const $ = s => el.querySelector(s);
  const cv = $('#meCanvas'), ctx = cv.getContext('2d');
  const S = 512, k = S / 256;
  const toPx = (x, z) => [(x + 128) * k, (z + 128) * k];
  const toWorld = (px, py) => ({ x: Math.round(px / k - 128), z: Math.round(py / k - 128) });

  const TOOLS = { move: '✋ Move', ore: '💚 Crystal', rich: '💎 Blue crystal', lake: '🌊 Lake', road: '🛣 Road', erase: '🧽 Erase' };
  const HINTS = {
    move: 'Drag a base, crystal field, lake or road point to move it.',
    ore: 'Click to add a green crystal field.', rich: 'Click to add a blue crystal field (worth double).',
    lake: 'Click to add a lake.', road: 'Click to add bend points to the current road between the two bases. Roads are flattened into easy paths. Use "New road" to start another.',
    erase: 'Click a crystal field, lake or road point to remove it.',
  };

  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(() => { makePreview(); draw(); }, 120); }
  function makePreview() {
    const img = previewMap(toMapDef(d), THEMES[d.theme], 128);
    const c = document.createElement('canvas'); c.width = c.height = 128;
    c.getContext('2d').putImageData(new ImageData(img, 128, 128), 0, 0);
    previewImg = c;
  }
  function draw() {
    ctx.imageSmoothingEnabled = true;
    if (previewImg) ctx.drawImage(previewImg, 0, 0, S, S); else { ctx.fillStyle = '#223'; ctx.fillRect(0, 0, S, S); }
    // roads
    toMapDef(d).lanes.forEach((ln, ri) => {
      ctx.strokeStyle = ri === d.roads.length - 1 && tool === 'road' ? 'rgba(255,220,120,0.95)' : 'rgba(255,230,160,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ln.forEach(([x, z], i) => { const [px, py] = toPx(x, z); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.stroke(); ctx.setLineDash([]);
    });
    d.roads.forEach(r => r.forEach(p => { const [px, py] = toPx(p.x, p.z); ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); }));
    for (const o of d.ore) { const [px, py] = toPx(o.x, o.z); ctx.strokeStyle = o.rich ? '#6ab8ff' : '#4cff7a'; ctx.fillStyle = o.rich ? 'rgba(90,170,255,0.3)' : 'rgba(80,255,140,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, o.r * k, 0, 7); ctx.fill(); ctx.stroke(); }
    for (const l of d.lakes) { const [px, py] = toPx(l.x, l.z); ctx.strokeStyle = 'rgba(120,200,255,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(px, py, l.r * k, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    d.slots.forEach((s, i) => {
      const [px, py] = toPx(s.x, s.z);
      ctx.fillStyle = i ? '#ff4a3d' : '#3d8bff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.fillRect(px - 11, py - 11, 22, 22); ctx.strokeRect(px - 11, py - 11, 22, 22);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Rajdhani'; ctx.textAlign = 'center'; ctx.fillText(i ? 'P2' : 'P1', px, py + 5);
    });
  }
  const pick = (w) => {
    let best = null, bd = 1e9;
    const test = (obj, kind, i, j, r = 6) => { const dd = Math.hypot(obj.x - w.x, obj.z - w.z); if (dd < Math.max(r, 6) && dd < bd) { bd = dd; best = { obj, kind, i, j }; } };
    d.slots.forEach((s, i) => test(s, 'slot', i, 0, 8));
    d.roads.forEach((r, i) => r.forEach((p, j) => test(p, 'road', i, j, 5)));
    d.ore.forEach((o, i) => test(o, 'ore', i, 0, o.r));
    d.lakes.forEach((l, i) => test(l, 'lake', i, 0, l.r));
    return best;
  };
  const evPos = e => { const p = elemPos(cv, e); return toWorld(p.x / p.w * S, p.y / p.h * S); };
  const clampW = w => ({ x: Math.max(-118, Math.min(118, w.x)), z: Math.max(-118, Math.min(118, w.z)) });
  cv.onpointerdown = e => {
    e.preventDefault();
    const w = clampW(evPos(e));
    if (tool === 'move') { drag = pick(w); if (drag) cv.setPointerCapture(e.pointerId); return; }
    if (tool === 'ore' || tool === 'rich') d.ore.push({ x: w.x, z: w.z, r: size, rich: tool === 'rich' ? 1 : 0 });
    else if (tool === 'lake') d.lakes.push({ x: w.x, z: w.z, r: Math.round(size * 1.4) });
    else if (tool === 'road') { if (!d.roads.length) d.roads.push([]); d.roads[d.roads.length - 1].push(w); }
    else if (tool === 'erase') {
      const p = pick(w); if (!p || p.kind === 'slot') return;
      if (p.kind === 'ore') d.ore.splice(p.i, 1); else if (p.kind === 'lake') d.lakes.splice(p.i, 1); else d.roads[p.i].splice(p.j, 1);
    }
    schedulePreview(); draw();
  };
  cv.onpointermove = e => {
    if (!drag) return;
    const w = clampW(evPos(e));
    drag.obj.x = w.x; drag.obj.z = w.z;
    draw(); schedulePreview();
  };
  cv.onpointerup = () => { drag = null; };
  cv.style.touchAction = 'none';

  function renderControls() {
    $('#meName').value = d.name;
    $('#meList').innerHTML = list.length ? '' : '<span style="color:var(--dim);font-size:13px">No maps yet</span>';
    for (const m of list) { const b = document.createElement('button'); b.className = 'btn chip' + (m.id === d.id ? ' on' : ''); b.textContent = m.name; b.onclick = () => { d = JSON.parse(JSON.stringify(m)); full(); }; $('#meList').appendChild(b); }
    $('#meTools').innerHTML = '';
    for (const [t, label] of Object.entries(TOOLS)) { const b = document.createElement('button'); b.className = 'btn chip' + (tool === t ? ' on' : ''); b.textContent = label; b.onclick = () => { tool = t; renderControls(); draw(); }; $('#meTools').appendChild(b); }
    if (tool === 'road') { const b = document.createElement('button'); b.className = 'btn chip'; b.textContent = '+ New road'; b.onclick = () => { if (d.roads.length < 4) d.roads.push([]); renderControls(); }; $('#meTools').appendChild(b); }
    $('#meHint').textContent = HINTS[tool];
    $('#meTheme').innerHTML = '';
    for (const t of ['temperate', 'autumn', 'blossom', 'highland', 'canyon', 'snow', 'desert', 'night']) { const b = document.createElement('button'); b.className = 'btn chip' + (d.theme === t ? ' on' : ''); b.textContent = { temperate: '🌳 Green', autumn: '🍂 Autumn', blossom: '🌸 Blossom', highland: '🏴 Highland', canyon: '🏜 Canyon', snow: '❄ Snow', desert: '🏜 Desert', night: '🌙 Night' }[t]; b.onclick = () => { d.theme = t; renderControls(); schedulePreview(); }; $('#meTheme').appendChild(b); }
    $('#meSize').value = size; $('#meSizeV').textContent = size;
    $('#meRidge').value = d.ridge; $('#meRidgeV').textContent = d.ridge < 35 ? 'few' : d.ridge < 65 ? 'some' : 'lots';
    $('#meForest').value = Math.round((0.4 - d.forest) / 0.4 * 100); $('#meForestV').textContent = d.forest > 0.25 ? 'few' : d.forest > 0.08 ? 'some' : 'lots';
  }
  function full() { renderControls(); makePreview(); draw(); }

  $('#meName').oninput = e => { d.name = e.target.value; };
  $('#meSize').oninput = e => { size = +e.target.value; $('#meSizeV').textContent = size; };
  $('#meRidge').oninput = e => { d.ridge = +e.target.value; renderControls(); schedulePreview(); };
  $('#meForest').oninput = e => { d.forest = +(0.4 - e.target.value / 100 * 0.4).toFixed(3); renderControls(); schedulePreview(); };
  $('#meSeed').onclick = () => { d.seed = [rnd(), rnd(), rnd(), rnd()]; schedulePreview(); };
  $('#meClear').onclick = () => { d.ore = []; d.lakes = []; d.roads = [[]]; full(); };
  $('#meMirror').onclick = () => {
    // keep the left/top half (around P1) and mirror it through the centre for a fair map
    const p1 = d.slots[0];
    const mine = o => Math.hypot(o.x - p1.x, o.z - p1.z) <= Math.hypot(o.x - d.slots[1].x, o.z - d.slots[1].z);
    d.slots[1] = { x: -p1.x, z: -p1.z };
    const mir = o => ({ ...o, x: -o.x, z: -o.z });
    d.ore = d.ore.filter(mine); d.ore = [...d.ore, ...d.ore.filter(o => Math.hypot(o.x, o.z) > 4).map(mir)];
    d.lakes = d.lakes.filter(mine); d.lakes = [...d.lakes, ...d.lakes.filter(o => Math.hypot(o.x, o.z) > 4).map(mir)];
    d.roads = d.roads.map(r => { const half = r.filter(mine); return [...half, ...half.slice().reverse().map(mir)]; });
    full();
  };
  $('#meNew').onclick = () => { d = newMapDesign(); full(); };
  $('#meDup').onclick = () => {
    const ids = Object.keys(MAPS).filter(id => !MAPS[id].custom);
    const pickId = prompt(`Copy which map? (${ids.join(', ')})`, 'valley');
    const m = MAPS[pickId]; if (!m) return;
    d = { id: Math.random().toString(36).slice(2, 8), name: m.name + ' (copy)', theme: m.theme, seed: [...m.seed], ridge: m.ridge, forest: m.forest, slots: m.slots.map(s => ({ ...s })), roads: m.lanes.map(ln => ln.slice(1, -1).map(([x, z]) => ({ x, z }))), ore: m.ore.map(o => ({ rich: 0, ...o })), lakes: m.lakes.map(l => ({ ...l })) };
    full();
  };
  const save = () => {
    d.name = (d.name || '').trim() || 'My Battlefield';
    const i = list.findIndex(m => m.id === d.id);
    if (i >= 0) list[i] = JSON.parse(JSON.stringify(d)); else { if (list.length >= 12) { alert('You can keep up to 12 maps. Delete one first.'); return false; } list.push(JSON.parse(JSON.stringify(d))); }
    saveMaps(list); MAPS['custom_' + d.id] = toMapDef(d); renderControls();
    return true;
  };
  $('#meSave').onclick = () => { if (save()) { $('#meSave').textContent = '✔ Saved!'; setTimeout(() => { $('#meSave').textContent = '💾 Save'; }, 1200); } };
  $('#meDel').onclick = () => { if (!list.some(m => m.id === d.id) || !confirm(`Delete ${d.name}?`)) return; list = list.filter(m => m.id !== d.id); delete MAPS['custom_' + d.id]; saveMaps(list); d = list[0] ? JSON.parse(JSON.stringify(list[0])) : newMapDesign(); full(); };
  $('#mePlay').onclick = () => { if (save()) onPlay('skirmish', 'custom_' + d.id); };
  $('#mePlaySv').onclick = () => { if (save()) onPlay('survival', 'custom_' + d.id); };
  full();
}
