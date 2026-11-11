'use strict';
// =====================================================================
// Level Maker: build your own course, play-test it, keep 3 on this device
// =====================================================================
const Maker = (() => {
  const KEY = 'wallyman-world-maker-v1', W = 120, H = 14;
  const THEME_LIST = ['grass', 'cave', 'sky', 'beach', 'snow', 'haunted', 'water', 'airship', 'castle', 'volcano', 'factory', 'candy', 'moon'];
  const PALETTE = [
    ['#', 'GROUND'], ['B', 'BRICK'], ['W', 'COIN BLOCK'], ['P', 'DRINK BLOCK'], ['S', 'PHONE BLOCK'], ['O', '1-UP BLOCK'],
    ['A', 'AMMO BLOCK'], ['V', 'CHARGE BLOCK'], ['Q', 'BOOTS BLOCK'], ['D', 'DINO BLOCK'], ['X', 'HARD BLOCK'], ['R', 'CRACKED WALL'],
    ['I', 'HIDDEN BLOCK'], ['=', 'PLATFORM'], ['^', 'SPIKES'], ['L', 'LAVA'], ['J', 'SPRING'], ['<', 'BELT LEFT'], ['>', 'BELT RIGHT'],
    ['o', 'COIN'], ['g', 'GRUMBLE'], ['p', 'PRICKLE'], ['z', 'BUZZER'], ['h', 'HOPPER'], ['b', 'FLITTER BAT'], ['c', 'RHINO-BOT'],
    ['t', 'TURRET'], ['u', 'UFO'], ['e', 'GHOST'], ['l', 'LAVA BLOB'], ['m', 'LIFT SIDEWAYS'], ['n', 'LIFT UP-DOWN'], ['a', 'AMMO CRATE'],
    ['s', 'SPECIAL ORB'], ['M', 'MEDAL'], ['x', 'SIGNAL BAR'], ['C', 'CHECKPOINT'], ['@', 'START'], ['G', 'GOAL'],
    ['N', 'MAGNET BLOCK'], ['T', 'SHRINK BLOCK'], ['E', 'SHIELD BLOCK'], ['Y', 'PIPE'], ['~', 'WATER ZONE'], [';', 'DARK ZONE'], ['f', 'FISH'], ['j', 'JELLYFISH'], ['i', 'ALIEN SQUAD'],
  ];
  const BOSSES = [['', 'NONE'], ['K', 'BARON STATIC'], ['k', 'MOTHERSHIP'], ['y', 'ICE YETI'], ['q', 'KING KRABBY'], ['w', 'DRILL MOLE'], ['v', 'NIMBUS']];
  const LIMITS = { M: 5, x: 3, C: 3, u: 6, i: 3 };
  const blank = (theme = 'grass', w = W) => {
    const rows = Array.from({ length: H }, (_, y) => (y >= 12 ? '#'.repeat(w) : '.'.repeat(w)).split(''));
    rows[11][2] = '@'; rows[11][w - 6] = 'G';
    return { theme, rows };
  };
  let slots = [null, null, null];
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d)) slots = [0, 1, 2].map((i) => d[i] || null); } catch (e) { /* ignore */ }
  const validRows = (r) => Array.isArray(r) && r.length === H && r.every((row) => typeof row === 'string' && (row.length === W || row.length === W * 2) && row.length === r[0].length);
  slots = slots.map((s) => (s && validRows(s.rows) && THEME_LIST.includes(s.theme) ? { theme: s.theme, boss: s.boss || '', rows: s.rows.map((r) => r.split('')) } : null));
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(slots.map((s) => (s ? { theme: s.theme, boss: s.boss || '', rows: s.rows.map((r) => r.join('')) } : null)))); } catch (e) { /* ignore */ } };
  // Share codes: theme + boss + run-length encoded grid, wrapped in base64
  const CHARS = '.#BWPSOAVQDXRI=^LJ<>o' + 'gpzhbctuelmnasMxC@G' + 'NTEY~;fji' + '◢◣φβπΠΓ╱╲εωχσμζψκ¤ξ';
  // newer tiles are stored as plain ASCII inside share codes
  const ENC = { '◢': '1', '◣': '2', 'φ': '3', 'β': '4', 'π': '5', 'Π': '6', 'Γ': '7', '╱': '8', '╲': '9', 'ε': '0', 'ω': '!', 'χ': '?', 'σ': '$', 'μ': '%', 'ζ': '&', 'ψ': '*', 'κ': '+', '¤': ',', 'ξ': '-' }, DEC = {};
  for (const k of Object.keys(ENC)) DEC[ENC[k]] = k;
  function encode(lv) {
    const flat = lv.rows.map((r) => r.join('')).join('').replace(/[^\x00-\x7f]/g, (c) => ENC[c] || '.');
    let out = '';
    for (let i = 0; i < flat.length;) { let j = i; while (j < flat.length && flat[j] === flat[i] && j - i < 1295) j++; const n = j - i; out += n > 2 ? flat[i] + '|' + n.toString(36) + '|' : flat[i].repeat(n); i = j; }
    const body = String.fromCharCode(65 + THEME_LIST.indexOf(lv.theme)) + String.fromCharCode(65 + Math.max(0, BOSSES.findIndex((b) => b[0] === (lv.boss || '')))) + out;
    return (lv.rows[0].length > W ? 'WMW2-' : 'WMW1-') + btoa(body).replace(/=+$/, '');
  }
  function decode(code) {
    try {
      const m0 = String(code).replace(/\s+/g, '').match(/^WMW([12])-([A-Za-z0-9+/]+)=*$/); if (!m0) return null; const WW = m0[1] === '2' ? W * 2 : W, m = [m0[0], m0[2]];
      const body = atob(m[1] + '==='.slice((m[1].length + 3) % 4)), theme = THEME_LIST[body.charCodeAt(0) - 65], boss = BOSSES[body.charCodeAt(1) - 65];
      if (!theme || !boss) return null;
      let flat = '';
      for (let i = 2; i < body.length;) { const c = body[i]; if (body[i + 1] === '|') { const e = body.indexOf('|', i + 2); flat += c.repeat(parseInt(body.slice(i + 2, e), 36)); i = e + 1; } else { flat += c; i++; } if (flat.length > WW * H) return null; }
      flat = flat.replace(/[0-9!?$%&*+,-]/g, (c) => DEC[c] || c);
      if (flat.length !== WW * H || [...flat].some((c) => !CHARS.includes(c))) return null;
      return { theme, boss: boss[0], rows: Array.from({ length: H }, (_, y) => flat.slice(y * WW, (y + 1) * WW).split('')) };
    } catch (e) { return null; }
  }
  // Turn an edited grid into a playable level definition (buildLevel(99) reads it)
  const toDef = (lv) => {
    const darkCols = new Set(); lv.rows.forEach((r) => r.forEach((c, x) => { if (c === ';') darkCols.add(x); }));
    const d = baseDef(lv); d.darkCols = darkCols;
    const bc = lv.boss || '';
    if (bc === 'K' || bc === 'k') Object.assign(d, { boss: true, bossHp: bc === 'K' ? 3 : 5, bossName: bc === 'k' ? 'MOTHERSHIP' : undefined });
    const LW = lv.rows[0].length;
    if (bc === 'y') d.yetiArena = [LW - 17, LW - 2]; else if (bc && bc !== 'K' && bc !== 'k') Object.assign(d, { miniArena: [LW - 17, LW - 2] });
    const build = d.build; d.build = (b) => { build(b); if (bc) { const bx = bc === 'K' ? LW - 5 : bc === 'k' ? LW - 8 : LW - 9, by = bc === 'v' || bc === 'k' ? 3 : 10; b.g[by][bx] = bc; } };
    return d;
  };
  const baseDef = (lv) => ({
    name: 'MY LEVEL', theme: lv.theme, music: lv.theme, width: lv.rows[0].length, custom: true,
    water: lv.theme === 'water', lowGrav: lv.theme === 'moon', dino: lv.theme === 'sky' || lv.theme === 'airship' ? 'blue' : lv.theme === 'volcano' ? 'red' : 'teal',
    build(b) { for (let y = 0; y < H; y++) for (let x = 0; x < lv.rows[y].length; x++) b.g[y][x] = lv.rows[y][x]; },
  });
  return { W, H, THEME_LIST, PALETTE, BOSSES, LIMITS, blank, slots, persist, toDef, encode, decode, clip: null, state: null };
})();

// A small page overlay for copying / pasting share codes (text needs a real text box)
function codeBox(title, text, onLoad, onClose) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,40,0.82);display:flex;align-items:center;justify-content:center;z-index:50;font-family:monospace';
  const box = document.createElement('div');
  box.style.cssText = 'background:#101848;border:3px solid #ffe040;border-radius:8px;padding:14px;width:min(92vw,420px);color:#fff;text-align:center';
  const h = document.createElement('div'); h.textContent = title; h.style.cssText = 'color:#ffe040;font-weight:bold;margin-bottom:8px';
  const ta = document.createElement('textarea'); ta.value = text || ''; ta.rows = 6; ta.placeholder = 'Paste a level code here'; ta.style.cssText = 'width:100%;box-sizing:border-box;font-size:12px;background:#0a0e30;color:#5ff0ff;border:1px solid #5a6aa0;border-radius:4px;padding:6px';
  const msg = document.createElement('div'); msg.style.cssText = 'min-height:18px;margin:6px 0;color:#5ae060;font-size:13px';
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;justify-content:center';
  const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'font:bold 14px monospace;padding:8px 14px;border-radius:6px;border:2px solid #fff;background:#2f62d0;color:#fff'; b.onclick = fn; row.appendChild(b); return b; };
  const close = () => { wrap.remove(); onClose(); };
  if (onLoad) btn('LOAD', () => { if (onLoad(ta.value)) close(); else { msg.style.color = '#ff6060'; msg.textContent = 'That code did not work.'; } });
  else btn('COPY', () => { ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ } if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => { msg.textContent = 'Copied! Send it to a friend.'; }, () => { if (!ok) msg.textContent = 'Select the text and copy it.'; }); else msg.textContent = ok ? 'Copied!' : 'Select the text and copy it.'; });
  btn('CLOSE', close);
  box.append(h, ta, msg, row); wrap.appendChild(box); document.body.appendChild(wrap);
  ['keydown', 'keyup'].forEach((ev) => wrap.addEventListener(ev, (e) => e.stopPropagation()));
  if (!onLoad) setTimeout(() => ta.select(), 50); else setTimeout(() => ta.focus(), 50);
}

function makerIcon(c, X, Y, t = 0) {
  const bottom = (img) => ctx.drawImage(img, Math.round(X + (16 - img.width) / 2), Math.round(Y + 16 - img.height));
  const box = (col, label) => { ctx.fillStyle = '#1a1020'; ctx.fillRect(X + 1, Y + 1, 14, 14); ctx.fillStyle = col; ctx.fillRect(X + 2, Y + 2, 12, 12); Font.draw(ctx, label, X + 8, Y + 5, { color: '#fff', align: 'center', shadow: '#000', sd: 1 }); };
  switch (c) {
    case 'g': return bottom(Sprites.grumble[(t >> 4) & 1]);
    case 'p': return bottom(Sprites.prickle.r[0]);
    case 'z': return bottom(Sprites.buzzer.r[0]);
    case 'h': return bottom(Sprites.hopper[0]);
    case 'b': return bottom(Sprites.bat[0]);
    case 'c': return bottom(Sprites.charger.r[0]);
    case 't': return bottom(Sprites.turret.r);
    case 'e': return bottom(Sprites.ghost.r[0]);
    case 'a': return bottom(Sprites.ammo);
    case 'M': return bottom(Sprites.medal);
    case 'u': ctx.fillStyle = '#1a1020'; ctx.fillRect(X, Y + 7, 16, 5); ctx.fillStyle = '#b0b8c8'; ctx.fillRect(X + 1, Y + 8, 14, 3); ctx.fillStyle = '#80e0ff'; ctx.fillRect(X + 5, Y + 4, 6, 4); return;
    case 'l': ctx.fillStyle = '#a02010'; ctx.fillRect(X + 3, Y + 5, 10, 10); ctx.fillStyle = '#ff8020'; ctx.fillRect(X + 4, Y + 6, 8, 8); ctx.fillStyle = '#ffe060'; ctx.fillRect(X + 5, Y + 7, 5, 2); return;
    case 'm': case 'n': ctx.fillStyle = '#1a1020'; ctx.fillRect(X, Y, 48, 8); ctx.fillStyle = '#c08040'; ctx.fillRect(X + 1, Y + 1, 46, 6); Font.draw(ctx, c === 'm' ? '< >' : 'UP', X + 24, Y, { color: '#fff', align: 'center' }); return;
    case 's': ctx.fillStyle = '#1a1020'; ctx.fillRect(X + 3, Y + 3, 10, 10); ctx.fillStyle = '#b060ff'; ctx.fillRect(X + 4, Y + 4, 8, 8); ctx.fillStyle = '#f0d0ff'; ctx.fillRect(X + 5, Y + 5, 3, 3); return;
    case 'x': for (let i = 0; i < 4; i++) { const h = 4 + i * 3; ctx.fillStyle = '#10182a'; ctx.fillRect(X + 2 + i * 3, Y + 15 - h, 3, h + 1); ctx.fillStyle = '#40e090'; ctx.fillRect(X + 2 + i * 3, Y + 15 - h, 2, h); } return;
    case 'C': ctx.fillStyle = '#e0e0e0'; ctx.fillRect(X + 7, Y, 2, 16); ctx.fillStyle = '#ff4060'; ctx.fillRect(X + 9, Y + 1, 6, 5); return;
    case '@': Wally.draw(ctx, X + 8, Y + 16, 'idle0', 1, { t }); return;
    case 'G': ctx.fillStyle = '#1a1020'; ctx.fillRect(X + 4, Y - 16, 8, 32); ctx.fillStyle = '#ffd040'; ctx.fillRect(X + 5, Y - 15, 6, 30); Font.draw(ctx, 'G', X + 8, Y - 6, { color: '#a02010', align: 'center' }); return;
    case 'f': return bottom(Sprites.fish.r[0]);
    case 'i': return ctx.drawImage(Sprites.zappling[0][(t >> 4) & 1], X + 2, Y + 3);
    case 'j': return bottom(Sprites.jelly[0]);
    case ';': ctx.fillStyle = 'rgba(10,8,30,0.6)'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#ffe8a0'; ctx.fillRect(X + 9, Y + 4, 3, 7); ctx.fillRect(X + 7, Y + 3, 2, 2); ctx.fillRect(X + 7, Y + 11, 2, 2); return;
    case 'I': ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.setLineDash([2, 2]); ctx.strokeRect(X + 0.5, Y + 0.5, 15, 15); ctx.setLineDash([]); return;
    default: box('#406080', c);
  }
}

function LevelMakerScene(resume) {
  const P = Maker.PALETTE, H = Maker.H; let W = Maker.W;
  let mode = resume ? 'edit' : 'slots', slot = resume ? resume.slot : 0, t = 0, msg = '', msgT = 0, menuSel = 0, held = {};
  let lv = resume ? Maker.slots[slot] : null, cur = resume ? resume.cur : { x: 2, y: 10, pal: 0 }, camX = resume ? resume.camX : 0;
  const MENU = ['PLAY TEST', 'SAVE', 'THEME', 'BOSS', 'LENGTH', 'TEST FROM HERE', 'UNDO', 'REDO', 'TOOL', 'COPY AREA', 'SHARE CODE', 'LOAD CODE', 'UPLOAD ONLINE', 'CLEAR ALL', 'SAVE AND EXIT'];
  let selA = null;
  const TILESET = '#BWPSOAVQDXR=^LJ<>oNTEY~';
  const say = (s) => { msg = s; msgT = 120; };
  const repeat = (k) => { if (Input.pressed(k)) { held[k] = 0; return true; } if (Input.down(k)) { held[k] = (held[k] || 0) + 1; return held[k] > 14 && held[k] % 4 === 0; } held[k] = 0; return false; };
  const count = (c) => lv.rows.reduce((n, r) => n + r.filter((v) => v === c).length, 0);
  const paste = () => {
    const cb = Maker.clip; if (!cb) return;
    cb.forEach((row, dy) => row.forEach((c, dx) => { const x = cur.x + dx, y = cur.y + dy; if (x < W && y < H && c !== '@' && c !== 'G') lv.rows[y][x] = c; }));
    Audio8.sfx('check');
  };
  const place = () => {
    if (cur.pal === P.length) { paste(); return; }
    const c = P[cur.pal][0], here = lv.rows[cur.y][cur.x];
    if (here === c) return;
    if (Maker.LIMITS[c] && count(c) >= Maker.LIMITS[c]) { say(`ONLY ${Maker.LIMITS[c]} ${P[cur.pal][1]}S ALLOWED`); return; }
    if (c === '@' || c === 'G') for (const r of lv.rows) for (let x = 0; x < W; x++) if (r[x] === c) r[x] = '.';
    if (c === 'G' && cur.y < 5) { say('GOAL NEEDS ROOM ABOVE'); return; }
    lv.rows[cur.y][cur.x] = c; Audio8.sfx('select');
  };
  const setLength = (w) => { // grow a course to double length, or trim it back
    const old = lv.rows[0].length; if (w === old) return;
    if (w > old) lv.rows.forEach((r, y) => { for (let x = old; x < w; x++) r.push(y >= 12 ? '#' : '.'); });
    else { lv.rows.forEach((r) => { r.length = w; }); if (!lv.rows.some((r) => r.includes('G'))) lv.rows[11][w - 6] = 'G'; if (!lv.rows.some((r) => r.includes('@'))) lv.rows[11][2] = '@'; cur.x = Math.min(cur.x, w - 1); camX = Math.min(camX, w * 16 - 256); }
    W = w; say(w > old ? 'COURSE IS NOW DOUBLE LENGTH!' : 'COURSE IS NORMAL LENGTH'); Audio8.sfx('check');
  };
  // editing history and tools: undo / redo, flood fill and straight lines
  let undo = [], redoS = [], tool = 'PAINT', lineA = null;
  const snap = () => { undo.push(lv.rows.map((r) => r.slice())); if (undo.length > 60) undo.shift(); redoS = []; };
  const doUndo = () => { if (!undo.length) { say('NOTHING TO UNDO'); return; } redoS.push(lv.rows.map((r) => r.slice())); lv.rows = undo.pop(); W = lv.rows[0].length; say('UNDONE'); Audio8.sfx('select'); };
  const doRedo = () => { if (!redoS.length) { say('NOTHING TO REDO'); return; } undo.push(lv.rows.map((r) => r.slice())); lv.rows = redoS.pop(); W = lv.rows[0].length; say('REDONE'); Audio8.sfx('select'); };
  const palChar = () => (cur.pal < P.length ? P[cur.pal][0] : null);
  const flood = () => {
    const c = palChar(); if (!c || c === '@' || c === 'G' || Maker.LIMITS[c]) { say('FILL WORKS WITH TILES ONLY'); return; }
    const from = lv.rows[cur.y][cur.x]; if (from === c) return; snap();
    const st = [[cur.x, cur.y]]; let n = 0;
    while (st.length && n < 3000) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= W || y >= H || lv.rows[y][x] !== from) continue; lv.rows[y][x] = c; n++; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    say(`FILLED ${n} TILES`); Audio8.sfx('check');
  };
  const line = () => {
    const c = palChar(); if (!c || c === '@' || c === 'G') { say('LINES WORK WITH TILES AND ITEMS'); return; }
    if (!lineA) { lineA = { x: cur.x, y: cur.y }; say('A: PICK WHERE THE LINE ENDS'); return; }
    snap(); let x0 = lineA.x, y0 = lineA.y; const x1 = cur.x, y1 = cur.y, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (let k = 0; k < 600; k++) { if (!Maker.LIMITS[c] || count(c) < Maker.LIMITS[c]) lv.rows[y0][x0] = c; if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    lineA = null; say('LINE DRAWN!'); Audio8.sfx('check');
  };
  const testHere = () => {
    if (count('G') === 0 && lv.boss !== 'K' && lv.boss !== 'k') { say('PLACE A GOAL FIRST!'); Audio8.sfx('bump'); return; }
    save(); const copy = { theme: lv.theme, boss: lv.boss, rows: lv.rows.map((r) => r.map((c) => (c === '@' ? '.' : c))) };
    let y = cur.y; while (y > 1 && copy.rows[y][cur.x] !== '.') y--; copy.rows[y][cur.x] = '@';
    if (!game) game = Save.fresh();
    window.CUSTOM_LEVEL = Maker.toDef(copy); Maker.state = { slot, cur: Object.assign({}, cur), camX };
    Audio8.sfx('confirm'); go(() => new Play(99, false));
  };
  window.makerKeys = (k) => { if (mode !== 'edit') return; if (k === 'KeyU') doUndo(); if (k === 'KeyY') doRedo(); };
  const erase = () => { if (lv.rows[cur.y][cur.x] !== '.') { lv.rows[cur.y][cur.x] = '.'; Audio8.sfx('stomp'); } };
  const save = () => { Maker.slots[slot] = lv; Maker.persist(); };
  const playTest = () => {
    if (count('G') === 0 && lv.boss !== 'K' && lv.boss !== 'k') { say('PLACE A GOAL FIRST!'); Audio8.sfx('bump'); return; }
    save();
    if (!game) game = Save.fresh();
    window.CUSTOM_LEVEL = Maker.toDef(lv);
    Maker.state = { slot, cur: Object.assign({}, cur), camX };
    Audio8.sfx('confirm'); go(() => new Play(99, false));
  };
  const fake = () => ({ T: Sprites.tiles[lv.theme], lv: { w: W }, bumps: [], def: {}, tile(tx, ty) { if (ty < 0 || ty >= H) return '.'; if (tx < 0 || tx >= W) return 'X'; const c = lv.rows[ty][tx]; return TILESET.includes(c) ? c : '.'; } });
  return {
    isMaker: true,
    enter() { Audio8.play(resume ? (lv ? lv.theme : 'menu') : 'menu'); },
    update() {
      t++; if (msgT > 0) msgT--; if (lv) W = lv.rows[0].length;
      if (mode === 'slots') {
        if (Input.pressed('down')) { slot = (slot + 1) % 3; Audio8.sfx('select'); }
        if (Input.pressed('up')) { slot = (slot + 2) % 3; Audio8.sfx('select'); }
        if (Input.pressed('back')) { go(() => ExtrasScene()); return; }
        if (Input.confirm()) { Audio8.sfx('confirm'); lv = Maker.slots[slot] || Maker.blank(); cur = { x: 2, y: 10, pal: 0 }; camX = 0; mode = 'edit'; Audio8.play(lv.theme); }
        return;
      }
      if (mode === 'menu') {
        if (Input.pressed('down')) { menuSel = (menuSel + 1) % MENU.length; Audio8.sfx('select'); }
        if (Input.pressed('up')) { menuSel = (menuSel + MENU.length - 1) % MENU.length; Audio8.sfx('select'); }
        const lr = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
        if (menuSel === 2 && lr) { const L = Maker.THEME_LIST, i = L.indexOf(lv.theme); lv.theme = L[(i + lr + L.length) % L.length]; Audio8.play(lv.theme); Audio8.sfx('select'); }
        if (MENU[menuSel] === 'TOOL' && lr) { tool = { PAINT: 'FILL', FILL: 'LINE', LINE: 'PAINT' }[tool]; lineA = null; }
        if (menuSel === 4 && lr) setLength(lv.rows[0].length > Maker.W ? Maker.W : Maker.W * 2);
        if (menuSel === 3 && lr) { const B = Maker.BOSSES, i = Math.max(0, B.findIndex((b) => b[0] === (lv.boss || ''))); lv.boss = B[(i + lr + B.length) % B.length][0]; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.pressed('start') && ![0, MENU.length - 1].includes(menuSel))) { mode = 'edit'; return; }
        if (Input.pressed('jump') || Input.pressed('start')) {
          const S = MENU[menuSel];
          if (S === 'PLAY TEST') { mode = 'edit'; playTest(); } else if (S === 'SAVE') { save(); say('SAVED!'); Audio8.sfx('check'); mode = 'edit'; } else if (S === 'THEME') {
            const L = Maker.THEME_LIST; lv.theme = L[(L.indexOf(lv.theme) + 1) % L.length]; Audio8.play(lv.theme);
          } else if (S === 'UNDO') { doUndo(); } else if (S === 'REDO') { doRedo(); } else if (S === 'TEST FROM HERE') { mode = 'edit'; testHere(); }
          else if (S === 'TOOL') { tool = { PAINT: 'FILL', FILL: 'LINE', LINE: 'PAINT' }[tool]; lineA = null; say('TOOL: ' + tool); }
          else if (S === 'LENGTH') { snap(); setLength(lv.rows[0].length > Maker.W ? Maker.W : Maker.W * 2); }
          else if (S === 'BOSS') { const B = Maker.BOSSES, i = Math.max(0, B.findIndex((b) => b[0] === (lv.boss || ''))); lv.boss = B[(i + 1) % B.length][0]; Audio8.sfx('select'); }
          else if (S === 'COPY AREA') { mode = 'sel'; selA = null; say('A: PICK ONE CORNER'); }
          else if (S === 'SHARE CODE') { mode = 'dom'; codeBox('LEVEL CODE - SHARE IT!', Maker.encode(lv), null, () => { mode = 'edit'; }); }
          else if (S === 'LOAD CODE') { mode = 'dom'; codeBox('PASTE A LEVEL CODE', '', (code) => { const d = Maker.decode(code); if (!d) return false; lv = d; Audio8.play(lv.theme); say('LEVEL LOADED!'); return true; }, () => { mode = 'edit'; }); }
          else if (S === 'UPLOAD ONLINE') {
            if (!OnlineCourses.on) { say('NEEDS FIREBASE SETUP'); mode = 'edit'; Audio8.sfx('bump'); } else if (count('G') === 0 && lv.boss !== 'K' && lv.boss !== 'k') { say('PLACE A GOAL FIRST!'); mode = 'edit'; } else {
              mode = 'dom'; save();
              textBox('NAME YOUR COURSE', 'MY COOL COURSE', (name) => { mode = 'edit'; if (!name) return; say('UPLOADING...'); OnlineCourses.upload(Maker.encode(lv), name, localStorage.getItem('wallyman-world-lastname') || HEROES[heroOf()].short || 'PLAYER').then(() => { say('UPLOADED! SEE COURSE WORLD'); Audio8.sfx('oneup'); }, () => { say('UPLOAD FAILED'); Audio8.sfx('bump'); }); });
            }
          }
          else if (S === 'CLEAR ALL') { const th = lv.theme; lv = Maker.blank(th); say('ALL CLEAR!'); mode = 'edit'; } else { save(); go(() => ExtrasScene()); }
        }
        return;
      }
      if (mode === 'dom') return;
      if (mode === 'sel') {
        if (Input.pressed('back') || Input.pressed('start')) { mode = 'edit'; return; }
        if (repeat('left') && cur.x > 0) cur.x--; if (repeat('right') && cur.x < W - 1) cur.x++; if (repeat('up') && cur.y > 0) cur.y--; if (repeat('down') && cur.y < H - 1) cur.y++;
        if (Input.pressed('jump')) {
          if (!selA) { selA = { x: cur.x, y: cur.y }; say('A: PICK THE OTHER CORNER'); } else {
            const x0 = Math.min(selA.x, cur.x), x1 = Math.max(selA.x, cur.x), y0 = Math.min(selA.y, cur.y), y1 = Math.max(selA.y, cur.y);
            Maker.clip = lv.rows.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1));
            cur.pal = P.length; mode = 'edit'; selA = null; say('COPIED! A PASTES IT'); Audio8.sfx('check');
          }
        }
        const want = cur.x * 16 - 120; camX += Math.round((Math.max(0, Math.min(W * 16 - 256, want)) - camX) * 0.25);
        return;
      }
      // editing
      if (Input.pressed('start')) { mode = 'menu'; menuSel = 0; Audio8.sfx('pause'); return; }
      if (Input.pressed('back')) { save(); go(() => ExtrasScene()); return; }
      let moved = false;
      if (repeat('left') && cur.x > 0) { cur.x--; moved = true; }
      if (repeat('right') && cur.x < W - 1) { cur.x++; moved = true; }
      if (repeat('up') && cur.y > 0) { cur.y--; moved = true; }
      if (repeat('down') && cur.y < H - 1) { cur.y++; moved = true; }
      if (Input.pressed('special')) { const n = P.length + (Maker.clip ? 1 : 0); cur.pal = (cur.pal + (Input.down('run') ? n - 1 : 1)) % n; Audio8.sfx('select'); }
      if (Input.pressed('jump') && tool === 'FILL') { flood(); } else if (Input.pressed('jump') && tool === 'LINE') { line(); } else {
        if (Input.pressed('jump') || Input.pressed('run')) snap();
        if (Input.pressed('jump') || (moved && Input.down('jump'))) place();
        if (Input.pressed('run') || (moved && Input.down('run'))) erase();
      }
      const want = cur.x * 16 - 120; camX += Math.round((Math.max(0, Math.min(W * 16 - 256, want)) - camX) * 0.25);
    },
    draw() {
      if (lv) W = lv.rows[0].length;
      if (mode === 'slots') {
        drawParallax('candy', t * 0.3);
        drawWindow(40, 30, 176, 150);
        txt('LEVEL MAKER', 128, 38, '#ffe040', { align: 'center' });
        for (let i = 0; i < 3; i++) {
          const s = Maker.slots[i], y = 62 + i * 30;
          txt(`LEVEL ${i + 1}`, 72, y, i === slot ? '#ffe040' : '#fff');
          txt(s ? s.theme.toUpperCase() : 'EMPTY', 72, y + 10, s ? '#80e0ff' : '#808098');
          if (i === slot) txt('>', 60 + ((t >> 3) & 1), y, '#ffe040');
        }
        txt('A: PLACE  B: ERASE  S: NEXT ITEM', 128, 190, '#fff', { align: 'center', outline: '#101848' });
        txt('START: MENU  B+S: PREV ITEM', 128, 202, '#fff', { align: 'center', outline: '#101848' });
        return;
      }
      const cx = Math.round(camX);
      drawParallax(lv.theme, cx);
      // faint grid
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let x = -(cx % 16); x < 256; x += 16) ctx.fillRect(x, 0, 1, 224);
      for (let y = 0; y < 224; y += 16) ctx.fillRect(0, y, 256, 1);
      Play.prototype.drawTiles.call(fake(), cx);
      const t0 = Math.floor(cx / 16);
      for (let ty = 0; ty < H; ty++) for (let tx = Math.max(0, t0 - 3); tx <= Math.min(W - 1, t0 + 16); tx++) {
        const c = lv.rows[ty][tx];
        if ('.' === c || TILESET.includes(c)) continue;
        makerIcon(c, tx * 16 - cx, ty * 16, t);
      }
      for (let ty = 0; ty < H; ty++) for (let tx = t0; tx <= t0 + 16 && tx < W; tx++) if (lv.rows[ty][tx] === 'I') makerIcon('I', tx * 16 - cx, ty * 16);
      // level end marker
      ctx.fillStyle = 'rgba(255,60,60,0.5)'; ctx.fillRect(W * 16 - cx, 0, 2, 224);
      // cursor with a ghost of the selected item
      const X = cur.x * 16 - cx, Y = cur.y * 16, pasting = cur.pal === P.length, c = pasting ? '' : P[cur.pal][0];
      ctx.save(); ctx.globalAlpha = 0.55;
      if (pasting && Maker.clip) { ctx.fillStyle = 'rgba(95,240,255,0.35)'; ctx.fillRect(X, Y, Maker.clip[0].length * 16, Maker.clip.length * 16); }
      else if (TILESET.includes(c)) Play.prototype.drawTiles.call(Object.assign(fake(), { tile: (tx, ty) => (tx === cur.x && ty === cur.y ? c : '.') }), cx); else makerIcon(c, X, Y, t);
      ctx.restore();
      if (mode === 'sel' && selA) { const x0 = Math.min(selA.x, cur.x), y0 = Math.min(selA.y, cur.y); ctx.strokeStyle = '#5ff0ff'; ctx.setLineDash([3, 2]); ctx.strokeRect(x0 * 16 - cx + 0.5, y0 * 16 + 0.5, (Math.abs(selA.x - cur.x) + 1) * 16 - 1, (Math.abs(selA.y - cur.y) + 1) * 16 - 1); ctx.setLineDash([]); }
      if (lv.boss) { const bx = (lv.boss === 'K' ? W - 5 : lv.boss === 'k' ? W - 8 : W - 9) * 16 - cx, by = (lv.boss === 'v' || lv.boss === 'k' ? 3 : 10) * 16; ctx.save(); stickerArt({ K: 'boss', k: 'mother', y: 'yeti', q: 'crab', w: 'mole', v: 'dragon' }[lv.boss], bx + 8, by + 4, t); ctx.restore(); ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.fillRect((W - 17) * 16 - cx, 0, 2, 224); }
      ctx.strokeStyle = (t >> 3) & 1 ? '#ffffff' : '#ffe040'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y + 0.5, 15, 15);
      // top bar
      ctx.fillStyle = 'rgba(16,24,72,0.82)'; ctx.fillRect(0, 0, 256, 13);
      txt(mode === 'sel' ? 'SELECT AREA' : cur.pal === P.length ? 'PASTE' : P[cur.pal][1], 4, 3, '#ffe040');
      txt(`${cur.x + 1}/${W}`, 252, 3, '#fff', { align: 'right' });
      if (tool !== 'PAINT') txt('TOOL: ' + tool, 252, 13, '#ffe040', { align: 'right', outline: '#101848' });
      if (lineA) { const lx = lineA.x * 16 - Math.round(camX), ly = lineA.y * 16; ctx.strokeStyle = (frame >> 3) & 1 ? '#ffe040' : '#ffffff'; ctx.strokeRect(lx + 0.5, ly + 0.5, 15, 15); }
      txt(lv.theme.toUpperCase(), 170, 3, '#80e0ff', { align: 'right' });
      if (msgT > 0) { drawWindow(40, 96, 176, 24); txt(msg, 128, 104, '#fff', { align: 'center' }); }
      if (mode === 'menu') {
        drawWindow(44, 18, 168, 196);
        txt('MAKER MENU', 128, 37, '#ffe040', { align: 'center' });
        MENU.forEach((s, i) => {
          const y = 38 + i * 11, label = MENU[i] === 'TOOL' ? `TOOL: ${tool}` : i === 4 ? `LENGTH: ${lv.rows[0].length > Maker.W ? 'LONG' : 'NORMAL'}` : i === 2 ? `THEME: ${lv.theme.toUpperCase()}` : i === 3 ? `BOSS: ${Maker.BOSSES.find((b) => b[0] === (lv.boss || ''))[1]}` : s;
          txt(label, 64, y, i === menuSel ? '#ffe040' : '#fff');
          if (i === menuSel) txt('>', 54 + ((t >> 3) & 1), y, '#ffe040');
        });
      }
    },
  };
}
