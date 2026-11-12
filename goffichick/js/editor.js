// GOFFICHICK - the level editor and level share codes.
//
// Draw a map with a finger or the mouse, test-play it, keep up to three levels on the device and
// share one with a link: the whole map travels inside the link (after #lvl=), so no server is needed.
'use strict';

// ---------------------------------------------------------------- share codes
// A level packs into a short URL-safe string:
//   "1|theme|name|width|" + run-length-encoded rows (a run of 4+ of the same tile becomes
//   ` + tile + two base-36 digits), then UTF-8, then base64url.
const LevelCode = (() => {
  const VERSION = '1', ESC = '`';
  const b64u = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
  function encode(lvl) {
    const body = lvl.rows.join('');
    let rle = '';
    for (let i = 0; i < body.length;) {
      let j = i; while (j < body.length && body[j] === body[i] && j - i < 1295) j++;
      const n = j - i;
      rle += n >= 4 ? ESC + body[i] + n.toString(36).padStart(2, '0') : body[i].repeat(n);
      i = j;
    }
    const name = (lvl.name || 'MY LEVEL').replace(/\|/g, ' ');
    return b64u(new TextEncoder().encode([VERSION, lvl.theme, name, lvl.rows[0].length, rle].join('|')));
  }
  // returns { name, theme, rows } or null when the code is damaged
  function decode(code, valid) {
    try {
      const txt = new TextDecoder().decode(unb64u(code));
      const parts = txt.split('|');
      if (parts[0] !== VERSION || parts.length !== 5) return null;
      const [, theme, name, wStr, rle] = parts, w = +wStr;
      if (!(w >= 8 && w <= 64)) return null;
      const chars = [...rle], out = [];
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ESC) { const ch = chars[i + 1], n = parseInt(chars[i + 2] + chars[i + 3], 36); if (!ch || !(n > 0)) return null; for (let k = 0; k < n; k++) out.push(ch); i += 3; }
        else out.push(chars[i]);
        if (out.length > 64 * 64) return null;
      }
      if (out.length % w || out.length / w < 8) return null;
      const rows = [];
      for (let y = 0; y < out.length / w; y++) rows.push(out.slice(y * w, y * w + w).map(c => valid(c) ? c : '.').join(''));
      return { name: name.slice(0, 24).toUpperCase() || 'MY LEVEL', theme, rows };
    } catch (e) { return null; }
  }
  return { encode, decode };
})();

// ---------------------------------------------------------------- level themes
const LEVEL_THEMES = {
  crypt: { name: 'CRYPT', floor: 'graveyard', ceil: 'stoneCeil', fog: [92, 90, 94], ceilH: 1.4, song: 1, ambience: 'wind', stepTex: 1 },
  office: { name: 'OFFICE', floor: 'carpet', ceil: 'officeCeil', fog: [70, 70, 76], ceilH: 1.5, song: 2, ambience: 'hum', stepTex: 4 },
  penthouse: { name: 'PENTHOUSE', floor: 'tiles', ceil: 'goldCeil', fog: [50, 30, 56], ceilH: 1.6, song: 3, ambience: 'hum', stepTex: 9 },
  gym: { name: 'GYM', floor: 'rubber', ceil: 'officeCeil', fog: [60, 56, 64], ceilH: 1.8, song: 5, ambience: 'hum', stepTex: 18 },
  park: { name: 'PARK', sky: true, floor: 'grass', ceil: 'sky', fog: [150, 190, 225], ceilH: 2.6, song: 6, ambience: 'birds', stepTex: 19 },
  wedding: { name: 'WEDDING', floor: 'parquet', ceil: 'goldCeil', fog: [120, 100, 110], ceilH: 1.6, song: 7, ambience: 'crowd', stepTex: 20 },
  camp: { name: 'RAINY CAMP', sky: true, weather: 'rain', floor: 'grass', ceil: 'sky', fog: [110, 120, 140], ceilH: 2.6, song: 8, ambience: 'rain', stepTex: 21 },
  studio: { name: 'TV STUDIO', floor: 'studio', ceil: 'rig', fog: [20, 18, 30], ceilH: 2.0, song: 9, ambience: 'crowd', stepTex: 22 },
};
const THEME_IDS = Object.keys(LEVEL_THEMES);

// turn an editor level into a level definition the game can load
function customLevelDef(lvl) {
  const th = LEVEL_THEMES[lvl.theme] || LEVEL_THEMES.crypt;
  return { ...th, name: lvl.name, map: lvl.rows.slice(), par: 180, custom: true };
}
// every tile the game understands
function validTile(c) {
  return c === '.' || c === 'D' || c === '$' || c === '~' || '><^v'.includes(c) || c in WALL_CHARS || c in ENEMY_CHARS || c in ITEM_TYPES || c in DECOR_TYPES || 'EBQ'.includes(c);
}
// what a level needs before it can be played
function checkLevel(lvl) {
  const all = lvl.rows.join('');
  const starts = [...all].filter(c => '><^v'.includes(c)).length;
  if (!starts) return { ok: false, msg: 'Put Goffichick somewhere first (DOOR tab > START).' };
  if (!all.includes('X')) return { ok: true, warn: 'No EXIT switch yet - the level can only be left by quitting.' };
  return { ok: true };
}

// ---------------------------------------------------------------- the editor
// api: { ctx, W(), H, label(t,x,y,color,align,size), sprites(), textures, sfx, onTest(lvl), onExit(), share(lvl) }
function makeEditor(api) {
  const STORE = 'goffichick-levels';
  const PALETTE = {
    WALL: ['#', '%', 'W', 'O', 'G', 'C', 'M', 'Y', 'H', 'P', 'S', 'I', '|', ':', ';', '_'],
    DOOR: ['>', 'X', 'D', '$', 'E', 'B', 'Q', '~', '1', '2', '@'],
    MON: ['z', 'm', 'w', 'b', 'i', 'h', 'g', 'l', 'x', 'f', 'd', '?', '€', 'K', 'J', '§', 'y'],
    ITEM: ['+', '*', 'o', 'a', 'A', 'c', 's', 'r', 'u', 'n', 'e', 't', 'V', 'N', 'Z', 'U', '3', '4', '5', '6', '7', '8', '9', '0', 'F', '!', '='],
    DECO: ['T', 'R', 'L', 'p', 'q', 'k', 'j'],
  };
  const NAMES = {
    '#': 'Gothic brick', '%': 'Rune stone', W: 'Cheery wallpaper', O: 'Cubicle panel', G: 'Stained glass', C: 'Crimson curtain', M: 'Pastel marble', Y: 'Wally poster',
    H: 'Hedge', P: 'Shop window', S: 'Gym wall', I: 'Fairground stripes', '|': 'Wedding wall', ':': 'Holiday chalet', ';': 'Studio wall', _: 'ON AIR sign',
    '>': "START (tap again to turn her)", X: 'EXIT switch', D: 'Door', $: 'Secret door', E: 'Bat door (red key)', B: 'Skull door (blue key)', Q: 'Coffin door (gold key)', '~': 'Toxic sludge',
    1: 'Bat key (red)', 2: 'Skull key (blue)', '@': 'Coffin key (gold)',
    z: 'Latte zombie', m: 'Middle manager', w: 'WALLY MAN', b: 'Gym brute', i: 'Influencer skull', h: 'Smiley orb', g: 'Yoga instructor', l: 'Life coach', x: 'Bubbly orb', f: 'WALLY MAN FIT', d: 'WALLY MAN DELUXE',
    '?': 'Bridezilla', '€': 'Redcoat entertainer', K: 'BOSS: Wally Prime', J: 'BOSS: Mega Smiley', '§': 'BOSS: Wally Live!', y: 'Exploding barrel',
    '+': 'Vial of blood', '*': 'Black heart', o: 'Soul orb', a: 'Leather jacket', A: 'Spiked corset', c: 'Bullets', s: 'Shells', r: 'Flaming skulls', u: 'Rockets', n: 'Fuel', e: 'Jar of souls', t: 'Bat bolts',
    V: 'Shadow veil', N: 'Night shroud', Z: 'Gas mask', U: 'Rage heart', 3: 'Coffin shotgun', 4: 'Bone gatling', 5: 'Skull launcher', 6: 'Hexcaster', 7: 'BFG', 8: 'Machine gun', 9: 'Shotgun', 0: 'Rocket launcher',
    F: 'Flamethrower', '!': 'Bat-bow', '=': 'Doom Scroll', T: 'Candelabra', R: 'Tombstone', L: 'Torch', p: 'Plant', q: 'Water cooler', k: 'Skulls', j: 'Pool of blood',
  };
  const TABS = Object.keys(PALETTE);
  let levels, slot = 0, lvl, tab = 'WALL', brush = '#', tool = 'paint';
  let zoom = 9, camX = 0, camY = 0, undo = [], strokeOn = false, panFrom = null, note = '', noteT = 0, lastCell = -1, lastPt = null;

  function blank(w = 32, h = 32) {
    const rows = [];
    for (let y = 0; y < h; y++) rows.push(y === 0 || y === h - 1 ? '#'.repeat(w) : '#' + '.'.repeat(w - 2) + '#');
    const mid = rows[h >> 1].split(''); mid[3] = '>'; rows[h >> 1] = mid.join('');
    const ex = rows[h >> 1].split(''); ex[w - 1] = 'X'; rows[h >> 1] = ex.join('');
    return { name: 'MY LEVEL', theme: 'crypt', rows };
  }
  function load() {
    try { levels = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { levels = []; }
    for (let i = 0; i < 3; i++) if (!levels[i] || !Array.isArray(levels[i].rows)) levels[i] = { ...blank(), name: `MY LEVEL ${i + 1}` };
    lvl = levels[slot];
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(levels)); } catch (e) {} }
  const mw = () => lvl.rows[0].length, mh = () => lvl.rows.length;
  const tileAt = (x, y) => lvl.rows[y][x];
  function setTile(x, y, c) { const r = [...lvl.rows[y]]; r[x] = c; lvl.rows[y] = r.join(''); }
  function flash(t) { note = t; noteT = 3.5; }

  // ---- layout (game coordinates)
  const PW = 124;
  const mapArea = () => ({ x: 0, y: 16, w: api.W() - PW, h: api.H - 16 });
  const panelX = () => api.W() - PW + 4;
  const tabRect = i => ({ x: panelX() + i * 23.6, y: 2, w: 22.6, h: 13 });
  const SW = 22;
  const swatchRect = i => ({ x: panelX() + (i % 5) * (SW + 1), y: 18 + Math.floor(i / 5) * (SW + 1), w: SW, h: SW });
  const BUTTONS = [
    ['paint', 'PAINT'], ['erase', 'ERASE'], ['pan', 'MOVE'],
    ['zout', 'ZOOM -'], ['zin', 'ZOOM +'], ['undo', 'UNDO'],
    ['size', 'SIZE'], ['theme', 'THEME'], ['new', 'CLEAR'],
    ['test', 'PLAY'], ['share', 'SHARE'], ['exit', 'EXIT'],
  ];
  const btnRect = i => ({ x: panelX() + (i % 3) * 39.5, y: 186 + Math.floor(i / 3) * 21, w: 38, h: 19 });
  const nameRect = () => ({ x: 2, y: 1, w: 120, h: 14 }), slotRect = () => ({ x: 125, y: 1, w: 70, h: 14 });
  const inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  function centre() { const a = mapArea(); zoom = Math.max(5, Math.min(26, Math.min(a.w / mw(), a.h / mh()) - 0.2)); camX = mw() / 2 - a.w / zoom / 2; camY = mh() / 2 - a.h / zoom / 2; }
  function setZoom(z) { const a = mapArea(), cx = camX + a.w / zoom / 2, cy = camY + a.h / zoom / 2; zoom = Math.max(5, Math.min(26, z)); camX = cx - a.w / zoom / 2; camY = cy - a.h / zoom / 2; }

  // ---- swatch / tile pictures
  function spriteFor(c) {
    const S = api.sprites();
    if (c in ENEMY_CHARS) { const e = S.enemy[ENEMY_CHARS[c]]; return e && e.walk[0].canvas; }
    if (c in ITEM_TYPES) { const it = S.item[ITEM_TYPES[c].sprite]; return it && it.canvas; }
    if (c in DECOR_TYPES) { const d = S.decor[DECOR_TYPES[c].sprite]; return d && d.canvas; }
    return null;
  }
  const DOOR_TINT = { E: '#e0203a', B: '#2a6cff', Q: '#ffc21a' };
  function drawTile(c, x, y, s, inMap) {
    const g = api.ctx, T = api.textures;
    if (c in WALL_CHARS) { g.drawImage(T.walls[WALL_CHARS[c]].canvas, x, y, s, s); return; }
    if (c === 'D' || c === '$' || c in DOOR_TINT) {
      g.drawImage(T.walls[c === '$' ? 1 : 5].canvas, x, y, s, s);
      if (DOOR_TINT[c]) { g.fillStyle = DOOR_TINT[c]; g.globalAlpha = 0.55; g.fillRect(x, y, s, s); g.globalAlpha = 1; }
      if (c === '$') { g.strokeStyle = '#ff4fb8'; g.lineWidth = Math.max(1, s / 10); g.setLineDash([s / 5, s / 6]); g.strokeRect(x + 1, y + 1, s - 2, s - 2); g.setLineDash([]); }
      else { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + s * 0.45, y, s * 0.1, s); }
      return;
    }
    g.fillStyle = inMap ? '#2a2230' : '#1a1020'; g.fillRect(x, y, s, s);
    if (c === '~') { g.drawImage(T.flats.slime.canvas, x, y, s, s); return; }
    if ('><^v'.includes(c)) {
      const a = { '>': 0, v: Math.PI / 2, '<': Math.PI, '^': -Math.PI / 2 }[c], cx = x + s / 2, cy = y + s / 2, r = s * 0.42;
      g.fillStyle = '#ff2d95'; g.beginPath();
      g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.lineTo(cx + Math.cos(a + 2.5) * r, cy + Math.sin(a + 2.5) * r);
      g.lineTo(cx + Math.cos(a - 2.5) * r, cy + Math.sin(a - 2.5) * r);
      g.closePath(); g.fill(); return;
    }
    const sp = spriteFor(c);
    if (sp) {
      const k = Math.min(s / sp.width, s / sp.height) * 0.95, w = sp.width * k, h = sp.height * k;
      g.drawImage(sp, x + (s - w) / 2, y + s - h, w, h);
      if (c in ENEMY_CHARS && inMap && s < 12) { g.fillStyle = 'rgba(255,40,60,0.35)'; g.fillRect(x, y, s, s); }
    }
  }

  // ---- drawing
  function draw(dt) {
    const g = api.ctx, W = api.W(), H = api.H, a = mapArea();
    if (noteT > 0) noteT -= dt;
    g.fillStyle = '#07030a'; g.fillRect(0, 0, W, H);
    // the map
    g.save(); g.beginPath(); g.rect(a.x, a.y, a.w, a.h); g.clip();
    g.imageSmoothingEnabled = false;
    const x0 = Math.max(0, Math.floor(camX)), y0 = Math.max(0, Math.floor(camY));
    const x1 = Math.min(mw(), Math.ceil(camX + a.w / zoom)), y1 = Math.min(mh(), Math.ceil(camY + a.h / zoom));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) drawTile(tileAt(x, y), a.x + (x - camX) * zoom, a.y + (y - camY) * zoom, zoom + 0.3, true);
    if (zoom >= 9) {
      g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 0.5; g.beginPath();
      for (let x = x0; x <= x1; x++) { const sx = a.x + (x - camX) * zoom; g.moveTo(sx, a.y + (y0 - camY) * zoom); g.lineTo(sx, a.y + (y1 - camY) * zoom); }
      for (let y = y0; y <= y1; y++) { const sy = a.y + (y - camY) * zoom; g.moveTo(a.x + (x0 - camX) * zoom, sy); g.lineTo(a.x + (x1 - camX) * zoom, sy); }
      g.stroke();
    }
    g.imageSmoothingEnabled = true;
    g.restore();
    g.strokeStyle = '#ff4fb8'; g.lineWidth = 1; g.strokeRect(a.x + 0.5, a.y + 0.5, a.w - 1, a.h - 1);
    // top bar
    const nr = nameRect(), sr = slotRect();
    g.fillStyle = 'rgba(255,79,184,0.18)'; g.fillRect(nr.x, nr.y, nr.w, nr.h); g.fillRect(sr.x, sr.y, sr.w, sr.h);
    api.label(lvl.name, nr.x + 4, nr.y + 10, '#ffffff', 'left', 7.5);
    api.label(`SLOT ${slot + 1} OF 3  >`, sr.x + 4, sr.y + 10, '#ff9be0', 'left', 7);
    api.label(`${LEVEL_THEMES[lvl.theme] ? LEVEL_THEMES[lvl.theme].name : ''}  ${mw()}x${mh()}`, a.w - 4, 11, '#8a6a8a', 'right', 6.5);
    // palette tabs and swatches
    TABS.forEach((t, i) => {
      const r = tabRect(i);
      g.fillStyle = t === tab ? '#ff2d95' : 'rgba(255,79,184,0.18)'; g.fillRect(r.x, r.y, r.w, r.h);
      api.label(t, r.x + r.w / 2, r.y + 9.5, '#ffffff', 'center', 6);
    });
    PALETTE[tab].forEach((c, i) => {
      const r = swatchRect(i);
      drawTile(c, r.x, r.y, r.w, false);
      if (c === brush || (c === '>' && '><^v'.includes(brush))) { g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1); }
    });
    api.label(tool === 'erase' ? 'ERASER' : tool === 'pan' ? 'MOVE THE MAP' : (NAMES[brush] || NAMES['>']), panelX() + 58, 180, '#ffcf3a', 'center', 6.5);
    BUTTONS.forEach(([id, text], i) => {
      const r = btnRect(i), on = id === tool;
      g.fillStyle = id === 'test' ? '#ff2d95' : on ? 'rgba(255,207,58,0.45)' : 'rgba(255,79,184,0.18)'; g.fillRect(r.x, r.y, r.w, r.h);
      api.label(text, r.x + r.w / 2, r.y + 12.5, '#ffffff', 'center', 6.5);
    });
    if (noteT > 0) {
      g.font = 'bold 8px monospace'; const tw = g.measureText(note).width;
      g.fillStyle = 'rgba(10,0,16,0.85)'; g.fillRect(a.w / 2 - tw / 2 - 6, H - 22, tw + 12, 16);
      api.label(note, a.w / 2, H - 11, '#ffcf3a', 'center', 8);
    }
  }

  // ---- input
  function cellAt(x, y) { const a = mapArea(); return { cx: Math.floor(camX + (x - a.x) / zoom), cy: Math.floor(camY + (y - a.y) / zoom) }; }
  function paintAt(x, y) {
    const { cx, cy } = cellAt(x, y);
    if (cx < 0 || cy < 0 || cx >= mw() || cy >= mh()) return;
    const key = cy * 1000 + cx; if (key === lastCell) return; lastCell = key;
    const edge = cx === 0 || cy === 0 || cx === mw() - 1 || cy === mh() - 1, cur = tileAt(cx, cy);
    let c = tool === 'erase' ? (edge ? '#' : '.') : brush;
    if (edge && !(c in WALL_CHARS)) { flash('The outside edge must be wall.'); return; }
    if ('><^v'.includes(c)) {
      if ('><^v'.includes(cur)) c = { '>': 'v', v: '<', '<': '^', '^': '>' }[cur]; // turn her
      else for (let y = 0; y < mh(); y++) for (let x = 0; x < mw(); x++) if ('><^v'.includes(tileAt(x, y))) setTile(x, y, '.');
      lastCell = -2; // a start can be turned with every tap
    }
    if (cur === c) return;
    setTile(cx, cy, c);
  }
  function pushUndo() { undo.push(lvl.rows.slice()); if (undo.length > 40) undo.shift(); }
  function resize() {
    const sizes = [24, 32, 40, 48], n = sizes[(sizes.indexOf(mw()) + 1) % sizes.length] || 32;
    pushUndo();
    const rows = [];
    for (let y = 0; y < n; y++) {
      let r = '';
      for (let x = 0; x < n; x++) {
        const edge = x === 0 || y === 0 || x === n - 1 || y === n - 1;
        let c = y < mh() && x < mw() ? tileAt(x, y) : '.';
        if (edge && !(c in WALL_CHARS)) c = '#';
        else if (!edge && (x === mw() - 1 || y === mh() - 1) && c === '#') c = '.'; // the old outer wall
        r += c;
      }
      rows.push(r);
    }
    lvl.rows = rows; centre(); save();
    flash(`Map size ${n} x ${n}` + (checkLevel(lvl).ok ? '' : ' - put Goffichick back in!'));
  }
  function button(id) {
    api.sfx.switch && api.sfx.switch();
    if (id === 'paint' || id === 'erase' || id === 'pan') tool = id;
    else if (id === 'zin') setZoom(zoom + 3);
    else if (id === 'zout') setZoom(zoom - 3);
    else if (id === 'undo') { if (undo.length) { lvl.rows = undo.pop(); save(); flash('Undone.'); } else flash('Nothing to undo.'); }
    else if (id === 'size') resize();
    else if (id === 'theme') { lvl.theme = THEME_IDS[(THEME_IDS.indexOf(lvl.theme) + 1) % THEME_IDS.length]; save(); flash(`Theme: ${LEVEL_THEMES[lvl.theme].name} (walls, floor, sky and music)`); }
    else if (id === 'new') { if (window.confirm('Clear this map and start again?')) { pushUndo(); const b = blank(mw(), mh()); lvl.rows = b.rows; save(); centre(); flash('A fresh map. UNDO brings the old one back.'); } }
    else if (id === 'test') { const c = checkLevel(lvl); if (!c.ok) { flash(c.msg); return; } save(); api.onTest(lvl, c.warn); }
    else if (id === 'share') { const c = checkLevel(lvl); if (!c.ok) { flash(c.msg); return; } save(); api.share(lvl).then(m => flash(m)); }
    else if (id === 'exit') { save(); api.onExit(); }
  }
  function down(x, y) {
    const a = mapArea();
    if (inR(nameRect(), x, y)) {
      const n = window.prompt('Name your level', lvl.name);
      if (n !== null) { lvl.name = n.replace(/[|`]/g, '').trim().toUpperCase().slice(0, 24) || lvl.name; save(); }
      return;
    }
    if (inR(slotRect(), x, y)) { save(); slot = (slot + 1) % 3; lvl = levels[slot]; undo = []; centre(); flash(`Slot ${slot + 1}: ${lvl.name}`); return; }
    for (let i = 0; i < TABS.length; i++) if (inR(tabRect(i), x, y)) { tab = TABS[i]; return; }
    const pal = PALETTE[tab];
    for (let i = 0; i < pal.length; i++) if (inR(swatchRect(i), x, y)) { brush = pal[i]; if (tool !== 'paint') tool = 'paint'; return; }
    for (let i = 0; i < BUTTONS.length; i++) if (inR(btnRect(i), x, y)) { button(BUTTONS[i][0]); return; }
    if (inR(a, x, y)) {
      if (tool === 'pan') { panFrom = { x, y, cx: camX, cy: camY }; return; }
      pushUndo(); strokeOn = true; lastCell = -1; lastPt = { x, y }; paintAt(x, y);
    }
  }
  function move(x, y) {
    if (panFrom) { camX = panFrom.cx - (x - panFrom.x) / zoom; camY = panFrom.cy - (y - panFrom.y) / zoom; return; }
    if (!strokeOn) return;
    // fill in every cell along the drag, however fast the finger moves
    const dx = x - lastPt.x, dy = y - lastPt.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (zoom * 0.4)));
    for (let i = 1; i <= n; i++) paintAt(lastPt.x + dx * i / n, lastPt.y + dy * i / n);
    lastPt = { x, y };
  }
  function up() {
    if (strokeOn) { strokeOn = false; if (undo.length && undo[undo.length - 1].join() === lvl.rows.join()) undo.pop(); save(); }
    panFrom = null;
  }
  function wheel(dy) { setZoom(zoom + (dy > 0 ? -2 : 2)); }
  function key(code) {
    const step = 3;
    if (code === 'ArrowLeft') camX -= step; else if (code === 'ArrowRight') camX += step;
    else if (code === 'ArrowUp') camY -= step; else if (code === 'ArrowDown') camY += step;
    else if (code === 'Equal' || code === 'NumpadAdd') setZoom(zoom + 2);
    else if (code === 'Minus' || code === 'NumpadSubtract') setZoom(zoom - 2);
    else if (code === 'KeyZ') button('undo');
    else if (code === 'Escape') button('exit');
  }
  function open() { load(); centre(); flash('Pick a tile on the right, then draw on the map.'); }

  return { open, draw, down, move, up, wheel, key, flash, get level() { return lvl; } };
}
