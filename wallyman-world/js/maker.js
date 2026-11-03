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
  ];
  const LIMITS = { M: 5, x: 3, C: 3, u: 6 };
  const blank = (theme = 'grass') => {
    const rows = Array.from({ length: H }, (_, y) => (y >= 12 ? '#'.repeat(W) : '.'.repeat(W)).split(''));
    rows[11][2] = '@'; rows[11][W - 6] = 'G';
    return { theme, rows };
  };
  let slots = [null, null, null];
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d)) slots = [0, 1, 2].map((i) => d[i] || null); } catch (e) { /* ignore */ }
  const validRows = (r) => Array.isArray(r) && r.length === H && r.every((row) => typeof row === 'string' && row.length === W);
  slots = slots.map((s) => (s && validRows(s.rows) && THEME_LIST.includes(s.theme) ? { theme: s.theme, rows: s.rows.map((r) => r.split('')) } : null));
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(slots.map((s) => (s ? { theme: s.theme, rows: s.rows.map((r) => r.join('')) } : null)))); } catch (e) { /* ignore */ } };
  // Turn an edited grid into a playable level definition (buildLevel(99) reads it)
  const toDef = (lv) => ({
    name: 'MY LEVEL', theme: lv.theme, music: lv.theme, width: W, custom: true,
    water: lv.theme === 'water', lowGrav: lv.theme === 'moon', dino: lv.theme === 'sky' || lv.theme === 'airship' ? 'blue' : lv.theme === 'volcano' ? 'red' : 'teal',
    build(b) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.g[y][x] = lv.rows[y][x]; },
  });
  return { W, H, THEME_LIST, PALETTE, LIMITS, blank, slots, persist, toDef, state: null };
})();

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
    case 'I': ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.setLineDash([2, 2]); ctx.strokeRect(X + 0.5, Y + 0.5, 15, 15); ctx.setLineDash([]); return;
    default: box('#406080', c);
  }
}

function LevelMakerScene(resume) {
  const P = Maker.PALETTE, W = Maker.W, H = Maker.H;
  let mode = resume ? 'edit' : 'slots', slot = resume ? resume.slot : 0, t = 0, msg = '', msgT = 0, menuSel = 0, held = {};
  let lv = resume ? Maker.slots[slot] : null, cur = resume ? resume.cur : { x: 2, y: 10, pal: 0 }, camX = resume ? resume.camX : 0;
  const MENU = ['PLAY TEST', 'SAVE', 'THEME', 'CLEAR ALL', 'SAVE AND EXIT'];
  const say = (s) => { msg = s; msgT = 120; };
  const repeat = (k) => { if (Input.pressed(k)) { held[k] = 0; return true; } if (Input.down(k)) { held[k] = (held[k] || 0) + 1; return held[k] > 14 && held[k] % 4 === 0; } held[k] = 0; return false; };
  const count = (c) => lv.rows.reduce((n, r) => n + r.filter((v) => v === c).length, 0);
  const place = () => {
    const c = P[cur.pal][0], here = lv.rows[cur.y][cur.x];
    if (here === c) return;
    if (Maker.LIMITS[c] && count(c) >= Maker.LIMITS[c]) { say(`ONLY ${Maker.LIMITS[c]} ${P[cur.pal][1]}S ALLOWED`); return; }
    if (c === '@' || c === 'G') for (const r of lv.rows) for (let x = 0; x < W; x++) if (r[x] === c) r[x] = '.';
    if (c === 'G' && cur.y < 5) { say('GOAL NEEDS ROOM ABOVE'); return; }
    lv.rows[cur.y][cur.x] = c; Audio8.sfx('select');
  };
  const erase = () => { if (lv.rows[cur.y][cur.x] !== '.') { lv.rows[cur.y][cur.x] = '.'; Audio8.sfx('stomp'); } };
  const save = () => { Maker.slots[slot] = lv; Maker.persist(); };
  const playTest = () => {
    if (count('G') === 0) { say('PLACE A GOAL FIRST!'); Audio8.sfx('bump'); return; }
    save();
    if (!game) game = Save.fresh();
    window.CUSTOM_LEVEL = Maker.toDef(lv);
    Maker.state = { slot, cur: Object.assign({}, cur), camX };
    Audio8.sfx('confirm'); go(() => new Play(99, false));
  };
  const fake = () => ({ T: Sprites.tiles[lv.theme], lv: { w: W }, bumps: [], tile(tx, ty) { if (ty < 0 || ty >= H) return '.'; if (tx < 0 || tx >= W) return 'X'; const c = lv.rows[ty][tx]; return '#BWPSOAVQDXR=^LJ<>o'.includes(c) ? c : '.'; } });
  return {
    enter() { Audio8.play(resume ? (lv ? lv.theme : 'menu') : 'menu'); },
    update() {
      t++; if (msgT > 0) msgT--;
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
        if (menuSel === 2 && (Input.pressed('left') || Input.pressed('right'))) {
          const L = Maker.THEME_LIST, i = L.indexOf(lv.theme); lv.theme = L[(i + (Input.pressed('right') ? 1 : L.length - 1)) % L.length]; Audio8.play(lv.theme); Audio8.sfx('select');
        }
        if (Input.pressed('back') || Input.pressed('start') && menuSel !== 0 && menuSel !== 4) { mode = 'edit'; return; }
        if (Input.pressed('jump') || Input.pressed('start')) {
          if (menuSel === 0) { mode = 'edit'; playTest(); } else if (menuSel === 1) { save(); say('SAVED!'); Audio8.sfx('check'); mode = 'edit'; } else if (menuSel === 2) {
            const L = Maker.THEME_LIST; lv.theme = L[(L.indexOf(lv.theme) + 1) % L.length]; Audio8.play(lv.theme);
          } else if (menuSel === 3) { const th = lv.theme; lv = Maker.blank(th); say('ALL CLEAR!'); mode = 'edit'; } else { save(); go(() => ExtrasScene()); }
        }
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
      if (Input.pressed('special')) { cur.pal = (cur.pal + (Input.down('run') ? P.length - 1 : 1)) % P.length; Audio8.sfx('select'); }
      if (Input.pressed('jump') || (moved && Input.down('jump'))) place();
      if (Input.pressed('run') || (moved && Input.down('run'))) erase();
      const want = cur.x * 16 - 120; camX += Math.round((Math.max(0, Math.min(W * 16 - 256, want)) - camX) * 0.25);
    },
    draw() {
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
        if ('.#BWPSOAVQDXR=^LJ<>o'.includes(c)) continue;
        makerIcon(c, tx * 16 - cx, ty * 16, t);
      }
      for (let ty = 0; ty < H; ty++) for (let tx = t0; tx <= t0 + 16 && tx < W; tx++) if (lv.rows[ty][tx] === 'I') makerIcon('I', tx * 16 - cx, ty * 16);
      // level end marker
      ctx.fillStyle = 'rgba(255,60,60,0.5)'; ctx.fillRect(W * 16 - cx, 0, 2, 224);
      // cursor with a ghost of the selected item
      const X = cur.x * 16 - cx, Y = cur.y * 16, c = P[cur.pal][0];
      ctx.save(); ctx.globalAlpha = 0.55;
      if ('#BWPSOAVQDXR=^LJ<>o'.includes(c)) Play.prototype.drawTiles.call(Object.assign(fake(), { tile: (tx, ty) => (tx === cur.x && ty === cur.y ? c : '.') }), cx); else makerIcon(c, X, Y, t);
      ctx.restore();
      ctx.strokeStyle = (t >> 3) & 1 ? '#ffffff' : '#ffe040'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y + 0.5, 15, 15);
      // top bar
      ctx.fillStyle = 'rgba(16,24,72,0.82)'; ctx.fillRect(0, 0, 256, 13);
      txt(P[cur.pal][1], 4, 3, '#ffe040');
      txt(`${cur.x + 1}/${W}`, 252, 3, '#fff', { align: 'right' });
      txt(lv.theme.toUpperCase(), 170, 3, '#80e0ff', { align: 'right' });
      if (msgT > 0) { drawWindow(40, 96, 176, 24); txt(msg, 128, 104, '#fff', { align: 'center' }); }
      if (mode === 'menu') {
        drawWindow(64, 56, 128, 96);
        txt('MAKER MENU', 128, 64, '#ffe040', { align: 'center' });
        MENU.forEach((s, i) => {
          const y = 82 + i * 12, label = i === 2 ? `THEME: ${lv.theme.toUpperCase()}` : s;
          txt(label, 84, y, i === menuSel ? '#ffe040' : '#fff');
          if (i === menuSel) txt('>', 74 + ((t >> 3) & 1), y, '#ffe040');
        });
      }
    },
  };
}
