'use strict';
const VW = 256, VH = 224, TS = 16;
const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
let frame = 0;
// the game's update number, shown on the title screen: 1.0 is the first, and each new update adds 0.1 (1.1, 1.2, ...)
const GAME_VERSION = '1.5';
const SOLID = new Set(['#', 'B', 'W', 'P', 'S', 'O', 'A', 'V', 'Q', 'D', 'N', 'T', 'E', 'H', '[', ']', '{', 'F', '+', '}', '?', '`', 'U', 'X', '^', 'J', 'R', '<', '>', 'Y']);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const txt = (s, x, y, color = '#fff', o = {}) => Font.draw(ctx, s, x, y, Object.assign({ color, shadow: '#000', sd: 1 }, o));
const pad = (n, l) => String(Math.max(0, n | 0)).padStart(l, '0');

// =====================================================================
// Input: keyboard, gamepad and on-screen touch buttons
// =====================================================================
const P2_KEYS = { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', KeyF: 'jump', KeyG: 'run', KeyH: 'special', KeyT: 'jump', KeyR: 'run', KeyY: 'special' };
const coopActive = () => typeof game !== 'undefined' && !!game && !!game.coop && typeof Play !== 'undefined' && scene instanceof Play && !!scene.p2;
const coopOwns = (code) => coopActive() && code in P2_KEYS;
const Input = (() => {
  const names = ['left', 'right', 'up', 'down', 'jump', 'run', 'special', 'start', 'back'];
  const st = {}, prev = {}, kb = {}, hit = {}, touch = {}, gp = {};
  names.forEach((n) => { st[n] = prev[n] = kb[n] = hit[n] = touch[n] = gp[n] = 0; });
  const map = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', Space: 'jump', KeyK: 'jump', KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'run', KeyC: 'special', KeyL: 'special',
    Enter: 'start', KeyP: 'start', Escape: 'back', Backspace: 'back',
  };
  const gpMap = { jump: [0, 1], run: [2, 6, 7], special: [3, 4, 5], start: [9], back: [8] };
  const typed = [];
  addEventListener('keydown', (e) => { if (e.key && e.key.length === 1 && /[a-z0-9 .!-]/i.test(e.key)) typed.push(e.key.toUpperCase()); if (typed.length > 8) typed.shift(); const a = coopOwns(e.code) ? null : map[e.code]; if (a) { if (!e.repeat) hit[a] = 1; kb[a] = 1; e.preventDefault(); } Audio8.unlock(); });
  addEventListener('keyup', (e) => { if (e.key === 'Meta') names.forEach((n) => { kb[n] = 0; }); const a = map[e.code]; if (a) { kb[a] = 0; e.preventDefault(); } });
  addEventListener('blur', () => names.forEach((n) => { kb[n] = 0; touch[n] = 0; }));
  // On-screen buttons. Touches are re-read from scratch on every touch event (which
  // buttons have a finger on them right now), so a lost "finger lifted" event can
  // never leave a button stuck down, and a thumb can slide between D-pad buttons.
  const btns = [...document.querySelectorAll('[data-k]')];
  const press = (held) => btns.forEach((el) => {
    const k = el.dataset.k, v = held.has(k);
    if (v && !touch[k]) hit[k] = 1;
    touch[k] = v ? 1 : 0; el.classList.toggle('on', v);
  });
  const fromTouches = (list) => {
    const held = new Set();
    for (const t of list) {
      const el = document.elementFromPoint(t.clientX, t.clientY), btn = el && el.closest ? el.closest('[data-k]') : null;
      if (btn) held.add(btn.dataset.k);
    }
    press(held);
  };
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    document.addEventListener(type, (e) => {
      if (type === 'touchstart') Audio8.unlock();
      if (e.target && e.target.closest && e.target.closest('#pad')) e.preventDefault();
      fromTouches(e.touches);
    }, { passive: false });
  }
  // mouse (desktop testing of the touch buttons)
  let mouseBtn = null;
  btns.forEach((el) => el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; e.preventDefault(); mouseBtn = el.dataset.k; press(new Set([mouseBtn])); Audio8.unlock(); }));
  addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && mouseBtn) { mouseBtn = null; press(new Set()); } });
  addEventListener('contextmenu', (e) => { if (e.target && e.target.closest && e.target.closest('#pad')) e.preventDefault(); });
  // safety: let go of everything if the page loses focus or is hidden
  const releaseAll = () => { names.forEach((n) => { kb[n] = 0; }); press(new Set()); };
  addEventListener('pagehide', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  cv.addEventListener('pointerdown', () => Audio8.unlock());
  function pollPad() {
    names.forEach((n) => { gp[n] = 0; });
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let seen = 0;
    for (const p of pads) {
      if (!p) continue;
      if (seen++ > 0 && coopActive()) break; // the second pad drives player 2
      const b = (i) => (p.buttons[i] && p.buttons[i].pressed ? 1 : 0);
      for (const k of Object.keys(gpMap)) for (const i of gpMap[k]) gp[k] |= b(i);
      gp.up |= b(12) | (p.axes[1] < -0.5); gp.down |= b(13) | (p.axes[1] > 0.5);
      gp.left |= b(14) | (p.axes[0] < -0.5); gp.right |= b(15) | (p.axes[0] > 0.5);
    }
  }
  function poll() {
    pollPad();
    names.forEach((n) => { prev[n] = st[n]; st[n] = kb[n] || hit[n] || touch[n] || gp[n] ? 1 : 0; hit[n] = 0; });
  }
  return {
    map, gpMap, poll, down: (k) => !!st[k], pressed: (k) => !!(st[k] && !prev[k]),
    takeTyped: () => typed.splice(0), clearTyped: () => { typed.length = 0; },
    confirm: () => !!((st.start && !prev.start) || (st.jump && !prev.jump)),
  };
})();

// =====================================================================
// Save files (3 slots, like the classics)
// =====================================================================
const Save = (() => {
  const KEY = 'wallyman-world-save-v1';
  let slots = [null, null, null];
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d)) slots = [d[0] || null, d[1] || null, d[2] || null]; } catch (e) { /* ignore */ }
  slots.forEach((s) => { if (s) { s.cleared = Array.from({ length: 140 }, (_, i) => !!(s.cleared && s.cleared[i])); s.medals = Array.from({ length: 140 }, (_, i) => (s.medals && s.medals[i]) | 0); s.secrets = s.secrets || {}; s.stars = Array.from({ length: 140 }, (_, i) => (s.stars && s.stars[i]) | 0); s.bars = Array.from({ length: 140 }, (_, i) => (s.bars && s.bars[i]) | 0); s.costume = s.costume || 'classic'; s.players = s.players || 1; s.turn = s.turn || 0; } });
  return {
    slots,
    fresh: () => ({ players: 1, turn: 0, other: null, hero: 'wally', costume: 'classic', cleared: Array(140).fill(false), medals: Array(140).fill(0), stars: Array(140).fill(0), bars: Array(140).fill(0), secrets: {}, lives: 5, score: 0, coins: 0, node: 0, bonusAmmo: 0, startHearts: 0, startBoots: false }),
    persist() { try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch (e) { /* ignore */ } },
  };
})();
let game = null; // active save slot

// =====================================================================
// High scores: saved on this device, and shared through the play page's
// database when it is available (everyone sees scores from players allowed
// to save there; everyone else's stay on their own device).
// =====================================================================
const Scores = (() => {
  const KEY = 'wallyman-world-scores-v1', NAME_KEY = 'wallyman-world-lastname';
  let local = [], shared = [], world = [], db = null, online = false, worldOn = false, lastFetch = 0;
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d)) local = d; } catch (e) { /* ignore */ }
  const clean = (e) => ({
    id: String(e.id || ''), name: String(e.name || '').toUpperCase().replace(/[^A-Z0-9 .!-]/g, '').slice(0, 8).trim() || 'WALLY',
    score: Math.max(0, Math.min(9999999, Math.floor(Number(e.score) || 0))), level: Math.max(1, Math.min(8, Math.floor(Number(e.level) || 1))),
    ts: Number(e.ts) || 0, done: !!e.done,
  });
  (async () => {
    try {
      if (!window.claude || !window.claude.use) return;
      db = await window.claude.use('db');
      if (!db) return;
      db.collection('scores').orderBy('score', 'desc').limit(50).onSnapshot((snap) => {
        shared = snap.docs.map((d) => clean(Object.assign({ id: d.id }, d.data())));
        online = true;
      }, () => { online = false; });
    } catch (e) { db = null; }
  })();
  // ---- worldwide table through Firebase Firestore's REST API (no SDK needed) ----
  const cfg = window.WALLYMAN_ONLINE || {};
  const hasWorld = !!(cfg.projectId && cfg.apiKey && window.fetch);
  const base = hasWorld ? `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents` : '';
  const val = (f) => (!f ? undefined : 'stringValue' in f ? f.stringValue : 'integerValue' in f ? Number(f.integerValue) : 'doubleValue' in f ? f.doubleValue : 'booleanValue' in f ? f.booleanValue : undefined);
  async function refresh() {
    if (!hasWorld || Date.now() - lastFetch < 5000) return;
    lastFetch = Date.now();
    try {
      const res = await fetch(`${base}:runQuery?key=${encodeURIComponent(cfg.apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'scores' }], orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: 50 } }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      world = rows.filter((r) => r.document).map((r) => {
        const f = r.document.fields || {};
        return clean({ id: r.document.name.split('/').pop(), name: val(f.name), score: val(f.score), level: val(f.level), ts: val(f.ts), done: val(f.done) });
      });
      worldOn = true;
    } catch (e) { worldOn = false; }
  }
  async function postWorld(e) {
    if (!hasWorld) return;
    try {
      await fetch(`${base}/scores?documentId=${encodeURIComponent(e.id)}&key=${encodeURIComponent(cfg.apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { name: { stringValue: e.name }, score: { integerValue: String(e.score) }, level: { integerValue: String(e.level) }, ts: { integerValue: String(e.ts) }, done: { booleanValue: e.done } } }),
      });
    } catch (err) { /* offline: the score is still kept on this device */ }
    lastFetch = 0; refresh();
  }
  refresh();
  setInterval(refresh, 60000);
  function list() {
    const byId = new Map();
    for (const e of local.concat(shared, world)) { const c = clean(e); if (c.id && c.score > 0) byId.set(c.id, c); }
    return [...byId.values()].sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, 10);
  }
  function qualifies(score) { const l = list(); return score > 0 && (l.length < 10 || score > l[l.length - 1].score); }
  function add(name, score, level, done) {
    const e = clean({ id: 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name, score, level, ts: Date.now(), done });
    local.push(e); local.sort((a, b) => b.score - a.score); local = local.slice(0, 20);
    try { localStorage.setItem(KEY, JSON.stringify(local)); localStorage.setItem(NAME_KEY, e.name); } catch (err) { /* ignore */ }
    if (db) db.collection('scores').doc(e.id).set({ name: e.name, score: e.score, level: e.level, ts: e.ts, done: e.done }).catch(() => {});
    postWorld(e);
    return e.id;
  }
  function lastName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
  return { list, qualifies, add, lastName, refresh, isShared: () => online, isWorld: () => worldOn };
})();
function bestLevel() { return Math.max(1, Math.min(8, game.cleared.slice(0, 8).filter(Boolean).length + 1)); }
// After a run ends: name entry if the score made the table, then the table.
function finishRun(done, after) {
  const score = game.score, level = done ? 8 : bestLevel();
  game.score = 0; game.coins = 0; game.lives = 5; Save.persist();
  if (Scores.qualifies(score)) return NameEntryScene(score, level, done, after);
  return HighScoreScene(null, after);
}


// =====================================================================
// Settings (difficulty, CRT filter, screen shake) and achievements
// =====================================================================
const Settings = (() => {
  const KEY = 'wallyman-settings', s = { difficulty: 'normal', crt: false, shake: true };
  try { Object.assign(s, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* ignore */ }
  return { get: (k) => s[k], set: (k, v) => { s[k] = v; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } } };
})();
// Rumble: gamepad vibration, or a short buzz on phones when playing by touch
let touchUsed = false;
addEventListener('touchstart', () => { touchUsed = true; }, { passive: true });
function rumble(power, ms) {
  if (Settings.get('rumble') === false) return;
  try {
    for (const g of (navigator.getGamepads ? navigator.getGamepads() : [])) if (g && g.vibrationActuator) g.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: power, weakMagnitude: Math.min(1, power + 0.2) }).catch(() => {});
    if (touchUsed && navigator.vibrate) navigator.vibrate(Math.round(ms * 0.6));
  } catch (e) { /* ignore */ }
}
const DIFF = { easy: { name: 'EASY', hearts: 3, time: 1.5, speed: 0.8 }, normal: { name: 'NORMAL', hearts: 2, time: 1, speed: 1 }, hard: { name: 'HARD', hearts: 1, time: 0.75, speed: 1.3 } };
const ACH_LIST = [
  ['first', 'FIRST STEPS', "CLEAR WALLY'S BACKYARD"], ['boss', 'BOSS BUSTER', 'DEFEAT ANY BOSS'], ['flawless', 'UNTOUCHABLE', 'BEAT A BOSS WITHOUT A HIT'],
  ['yeti', 'YETI TAMER', 'DEFEAT THE ICE YETI'], ['savior', 'SIGNAL RESTORED', 'BEAT THE FINAL BOSS'], ['secret', 'SECRET AGENT', 'FIND A SECRET EXIT'],
  ['bonus', 'BONUS EXPLORER', 'CLEAR ALL 3 BONUS WORLDS'], ['medals5', 'MEDAL HUNTER', 'ALL 5 MEDALS IN A LEVEL'], ['medals25', 'COLLECTOR', 'FIND 25 MEDALS'],
  ['speed', 'SPEED DEMON', 'CLEAR WITH HALF THE TIME LEFT'], ['three', 'THREE STARS', 'GET 3 STARS ON A LEVEL'], ['hard', 'HARD AS NAILS', 'CLEAR A LEVEL ON HARD'],
  ['dino', 'DINO RIDER', 'RIDE DINO'], ['coins', 'COIN MAGNATE', 'COLLECT 100 COINS'], ['bats', 'BAT QUEEN', 'DEFEAT 25 ENEMIES WITH BATS'],
  ['shock', 'SHOCK JOCK', '3 ENEMIES WITH 1 SHOCKWAVE'], ['ufo', 'UFO HUNTER', 'SHOOT DOWN 5 UFOS'], ['ghost', 'GHOSTBUSTER', 'DEFEAT A GHOST'],
  ['secretblock', 'HIDDEN TREASURE', 'FIND AN INVISIBLE BLOCK'], ['cracker', 'WALL BREAKER', 'SMASH A CRACKED WALL'], ['two', "TWO'S COMPANY", 'PLAY A 2-PLAYER GAME'],
  ['fashion', 'FASHIONISTA', 'WEAR 3 DIFFERENT COSTUMES'], ['starisle', 'STAR LEGEND', 'BEAT THE MOTHERSHIP MK II'], ['fullsignal', 'FULL SIGNAL', 'ALL 3 SIGNAL BARS IN A LEVEL'], ['timelord', 'TIME LORD', 'SET A TIME ATTACK RECORD'], ['robohero', 'TIN MAN', 'COLLECT 20 SIGNAL BARS (ROBO-WALLY)'], ['bossrush', 'RUSH HOUR', 'CLEAR THE BOSS RUSH'], ['daily', 'DAILY DOSE', 'CLEAR A DAILY CHALLENGE'],
];
const Ach = (() => {
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  const got = load('wallyman-ach'), stats = load('wallyman-stats'), queue = [];
  let toastT = 0;
  const save = () => { try { localStorage.setItem('wallyman-ach', JSON.stringify(got)); localStorage.setItem('wallyman-stats', JSON.stringify(stats)); } catch (e) { /* ignore */ } };
  function unlock(id) { if (got[id] || !ACH_LIST.some((a) => a[0] === id)) return; got[id] = Date.now(); save(); queue.push(id); }
  const LIMITS = { medals: ['medals25', 25], coins: ['coins', 100], bats: ['bats', 25], ufos: ['ufo', 5], bars: ['robohero', 20] };
  function add(stat, n = 1) { stats[stat] = (stats[stat] || 0) + n; save(); const L = LIMITS[stat]; if (L && stats[stat] >= L[1]) unlock(L[0]); }
  function wore(id) { const w = new Set(stats.worn || []); w.add(id); stats.worn = [...w]; save(); if (w.size >= 3) unlock('fashion'); }
  function drawToast() {
    if (!toastT && queue.length) { toastT = 170; Audio8.sfx('secret'); }
    if (!toastT) return;
    toastT--;
    const a = ACH_LIST.find((x) => x[0] === queue[0]), y = toastT > 150 ? -30 + (170 - toastT) * 1.6 : toastT < 20 ? 2 - (20 - toastT) * 1.6 : 2;
    drawWindow(32, Math.round(y), 192, 28);
    txt('# TROPHY UNLOCKED! #', 128, Math.round(y) + 5, '#ffe040', { align: 'center' });
    txt(a[1], 128, Math.round(y) + 16, '#fff', { align: 'center' });
    if (!toastT) queue.shift();
  }
  return { unlock, add, wore, has: (id) => !!got[id], count: () => Object.keys(got).length, drawToast };
})();
// Sticker Book: one sticker per kind of enemy beaten and per kind of secret found
const STICKERS = [
  ['grumble', 'GRUMBLE', 'e'], ['prickle', 'PRICKLE', 'e'], ['buzzer', 'BUZZER', 'e'], ['hopper', 'HOPPER', 'e'], ['bat', 'FLITTER BAT', 'e'], ['charger', 'RHINO-BOT', 'e'],
  ['turret', 'STATIC TURRET', 'e'], ['ufo', 'UFO', 'e'], ['fish', 'FISH', 'e'], ['jelly', 'JELLYFISH', 'e'], ['ghost', 'GHOST', 'e'], ['iced', 'ICE BLOCK', 's'],
  ['boss', 'BARON STATIC', 'b'], ['yeti', 'ICE YETI', 'b'], ['crab', 'KING KRABBY', 'b'], ['mole', 'DRILL MOLE', 'b'], ['dragon', 'NIMBUS', 'b'], ['mother', 'MOTHERSHIP', 'b'],
  ['squad', 'ZAPPLING SQUAD', 'e'], ['beamling', 'BEAM-DOWN ALIEN', 'e'], ['secretblock', 'HIDDEN BLOCK', 's'], ['shroom', '1-UP MUSHROOM', 's'], ['cracker', 'CRACKED WALL', 's'], ['secretexit', 'SECRET EXIT', 's'], ['warp', 'WARP PIPE', 's'], ['fullsignal', 'FULL SIGNAL', 's'],
];
const Sticker = (() => {
  const KEY = 'wallyman-stickers';
  let got = {}; try { got = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { /* ignore */ }
  let flash = null, flashT = 0;
  function add(id) {
    if (!STICKERS.some((s) => s[0] === id)) return;
    if (!got[id]) { got[id] = 0; flash = id; flashT = 120; }
    got[id]++;
    try { localStorage.setItem(KEY, JSON.stringify(got)); } catch (e) { /* ignore */ }
  }
  function drawFlash() {
    if (!flashT) return; flashT--;
    const s = STICKERS.find((k) => k[0] === flash), y = 200 + (flashT > 105 ? (flashT - 105) * 2 : flashT < 15 ? (15 - flashT) * 2 : 0);
    ctx.fillStyle = 'rgba(16,24,72,0.85)'; ctx.fillRect(56, y, 144, 14); ctx.fillStyle = '#ffe040'; ctx.fillRect(56, y, 144, 1);
    txt('NEW STICKER: ' + s[1], 128, y + 4, '#ffe040', { align: 'center' });
  }
  return { add, has: (id) => !!got[id], count: (id) => got[id] || 0, total: () => STICKERS.filter((s) => got[s[0]]).length, drawFlash };
})();
function stickerArt(id, x, y, t) { // draws a sticker's picture centred at (x, y)
  const D = (img) => ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  const m = { grumble: () => D(Sprites.grumble[(t >> 4) & 1]), prickle: () => D(Sprites.prickle.r[0]), buzzer: () => D(Sprites.buzzer.r[(t >> 3) & 1] || Sprites.buzzer.r[0]), hopper: () => D(Sprites.hopper[0]), bat: () => D(Sprites.bat[0]), charger: () => D(Sprites.charger.r[0]),
    turret: () => D(Sprites.turret.r), fish: () => D(Sprites.fish.r[0]), jelly: () => D(Sprites.jelly[0]), ghost: () => D(Sprites.ghost.r[0]), shroom: () => D(Sprites.shroom), fullsignal: () => { for (let i = 0; i < 4; i++) { ctx.fillStyle = '#40e090'; ctx.fillRect(x - 6 + i * 3, y + 6 - (4 + i * 3), 2, 4 + i * 3); } },
    beamling: () => { ctx.drawImage(Sprites.beamling[(t >> 3) & 1], x - 8, y - 9); },
    squad: () => { ctx.drawImage(Sprites.zappling[0][(t >> 4) & 1], x - 12, y - 10, 24, 20); },
    ufo: () => Play.prototype.drawUfo.call(null, { state: 'hover', beamX: 0, x: 0 }, x - 14, y - 8), iced: () => { ctx.fillStyle = '#a0dcff'; ctx.fillRect(x - 8, y - 8, 16, 16); ctx.globalAlpha = 0.6; D(Sprites.grumble[0]); ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 6, 3, 2); },
    boss: () => { ctx.save(); ctx.translate(x, y); ctx.scale(0.62, 0.62); Play.prototype.drawBoss.call(null, { inv: 0, hp: 3, maxHp: 3 }, -14, -16); ctx.restore(); }, yeti: () => { ctx.save(); ctx.translate(x, y); ctx.scale(0.62, 0.62); Play.prototype.drawYeti.call({ p: { x: 0 } }, { inv: 0, state: 'walk', t, hp: 3, maxHp: 3 }, -14, -16); ctx.restore(); },
    mother: () => { ctx.save(); ctx.translate(x, y); ctx.scale(0.5, 0.5); Play.prototype.drawMother.call(null, { inv: 0, beamX: 0, x: 0, mode: null }, -28, -10); ctx.restore(); },
    secretblock: () => { ctx.strokeStyle = '#ffffff'; ctx.setLineDash([2, 2]); ctx.strokeRect(x - 7.5, y - 7.5, 15, 15); ctx.setLineDash([]); txt('?', x - 2, y - 3, '#ffe040'); },
    cracker: () => { ctx.fillStyle = '#8a8aa0'; ctx.fillRect(x - 8, y - 8, 16, 16); ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 4, y - 5, 1, 4); ctx.fillRect(x - 3, y - 2, 3, 1); ctx.fillRect(x, y - 1, 1, 5); ctx.fillRect(x + 3, y - 6, 1, 3); },
    secretexit: () => { ctx.fillStyle = '#5a1a8a'; ctx.fillRect(x - 6, y - 9, 12, 18); ctx.fillStyle = '#c070ff'; ctx.fillRect(x - 4, y - 7, 8, 16); ctx.fillStyle = '#ffe040'; ctx.fillRect(x + 1, y, 2, 2); },
    warp: () => { ctx.fillStyle = '#0a3a14'; ctx.fillRect(x - 8, y - 8, 16, 16); ctx.fillStyle = '#3ad85a'; ctx.fillRect(x - 7, y - 7, 14, 4); ctx.fillStyle = '#2eb84a'; ctx.fillRect(x - 5, y - 3, 10, 11); },
  };
  const yetiLike = { crab: 'drawCrab', mole: 'drawMole', dragon: 'drawDragon' };
  if (yetiLike[id]) { ctx.save(); ctx.translate(x, y - (id === 'mole' ? 9 : 0)); ctx.scale(0.6, 0.6); if (id === 'mole') ctx.translate(0, 18); try { Play.prototype[yetiLike[id]].call({ p: { x: 0 }, cam: { x: 0 } }, { inv: 0, state: id === 'mole' ? 'up' : 'idle', t, hp: 3, maxHp: 3, w: 24, h: 20, x: 0, y: 0, face: 1, act: 50, groundY: id === 'mole' ? 30 : -4, trail: [], dir: 1 }, -14, id === 'mole' ? 0 : -10, 0); } catch (e) { box(); } ctx.restore(); return; }
  function box() { ctx.fillStyle = '#406080'; ctx.fillRect(x - 6, y - 6, 12, 12); }
  (m[id] || box)();
}
function StickerScene() {
  let sel = 0, t = 0;
  const N = STICKERS.length, COLS = 6;
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('right')) { sel = (sel + 1) % N; Audio8.sfx('select'); }
      if (Input.pressed('left')) { sel = (sel + N - 1) % N; Audio8.sfx('select'); }
      if (Input.pressed('down')) { sel = (sel + COLS) % N; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + N - COLS) % N; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.confirm() || Input.pressed('run')) go(() => ExtrasScene());
    },
    draw() {
      ctx.fillStyle = '#f0e0b0'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0cc98'; for (let y = 0; y < VH; y += 12) ctx.fillRect(0, y, VW, 1);
      ctx.fillStyle = '#c03040'; ctx.fillRect(0, 0, 10, VH); ctx.fillStyle = '#801820'; ctx.fillRect(8, 0, 2, VH);
      txt('STICKER BOOK', 132, 6, '#c03040', { align: 'center', outline: '#fff' });
      txt(`${Sticker.total()}/${N}`, 246, 6, '#3a2010', { align: 'right' });
      STICKERS.forEach((s, i) => {
        const cx = 34 + (i % COLS) * 38, cy = 31 + Math.floor(i / COLS) * 30, on = Sticker.has(s[0]);
        ctx.fillStyle = i === sel ? '#ffe040' : '#c8b080'; ctx.fillRect(cx - 16, cy - 14, 32, 28);
        ctx.fillStyle = on ? '#ffffff' : '#d8c8a0'; ctx.fillRect(cx - 14, cy - 12, 28, 24);
        if (on) { ctx.save(); stickerArt(s[0], cx, cy, t); ctx.restore(); } else txt('?', cx - 2, cy - 3, '#a89870');
        if (on && s[2] === 'b') { ctx.fillStyle = '#ffd040'; ctx.fillRect(cx + 9, cy - 12, 5, 5); }
      });
      const s = STICKERS[sel], on = Sticker.has(s[0]);
      drawWindow(16, 182, 224, 34);
      txt(on ? s[1] : '???', 128, 188, '#ffe040', { align: 'center' });
      txt(on ? (s[2] === 's' ? `FOUND ${Sticker.count(s[0])} TIMES` : `BEATEN ${Sticker.count(s[0])} TIMES`) : s[2] === 's' ? 'A SECRET STILL TO FIND...' : 'NOT BEATEN YET', 128, 200, '#fff', { align: 'center' });
    },
  };
}
const CRT = (() => {
  const c = Sprites.canvas(VW, VH), x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 1; y < VH; y += 2) x.fillRect(0, y, VW, 1);
  const g = x.createRadialGradient(128, 112, 90, 128, 112, 175); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
  x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  return c;
})();

// ---------------- Extras: trophies, jukebox, gallery, options ----------------
function ExtrasScene() {
  const items = ['LEVEL MAKER', 'COURSE WORLD', 'TROPHY ROOM', 'STICKER BOOK', 'ART GALLERY', 'JUKEBOX', 'GALLERY', 'IMPORT SAVE', 'OPTIONS', 'BACK'];
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === 9)) { go(() => TitleScene()); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go([() => LevelMakerScene(null), () => CourseWorldScene(), TrophyScene, StickerScene, () => ArtScene(), JukeboxScene, GalleryScene, () => ImportSaveScene(), () => OptionsScene()][sel]); }
    },
    draw() {
      drawParallax('sky', t * 0.3);
      drawLogo(8);
      drawWindow(64, 84, 128, 128);
      txt('EXTRAS', 128, 89, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 99 + i * 11; txt(s, 88, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 76 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(`TROPHIES ${Ach.count()}/${ACH_LIST.length}`, 128, 215, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function TrophyScene() {
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('victory'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % ACH_LIST.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + ACH_LIST.length - 1) % ACH_LIST.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.confirm()) go(() => ExtrasScene());
    },
    draw() {
      ctx.fillStyle = '#3a2410'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#5a3a1a'; for (let y = 34; y < 190; y += 26) ctx.fillRect(0, y + 18, VW, 3);
      txt(`TROPHY ROOM  ${Ach.count()}/${ACH_LIST.length}`, 128, 8, '#ffe040', { align: 'center', outline: '#000' });
      const top = Math.max(0, Math.min(ACH_LIST.length - 12, sel - 5));
      for (let i = 0; i < 12; i++) {
        const k = top + i, a = ACH_LIST[k]; if (!a) break;
        const col = i % 2, row = i >> 1, x = 10 + col * 124, y = 24 + row * 26, has = Ach.has(a[0]), on = k === sel;
        ctx.fillStyle = on ? '#ffe040' : '#1a1020'; ctx.fillRect(x - 1, y - 1, 118, 22);
        ctx.fillStyle = has ? '#6a4a20' : '#2a1a10'; ctx.fillRect(x, y, 116, 20);
        ctx.fillStyle = has ? '#ffd040' : '#4a3a2a'; ctx.fillRect(x + 4, y + 4, 10, 8); ctx.fillRect(x + 7, y + 12, 4, 3); ctx.fillRect(x + 5, y + 15, 8, 2);
        txt(has ? a[1] : '???', x + 19, y + 7, has ? '#fff' : '#8a7a6a');
      }
      const a = ACH_LIST[sel];
      drawWindow(8, 186, 240, 32);
      txt(Ach.has(a[0]) ? a[1] : 'LOCKED', 128, 192, Ach.has(a[0]) ? '#ffe040' : '#ff8080', { align: 'center' });
      txt(a[2], 128, 204, '#fff', { align: 'center' });
    },
  };
}
const SONG_NAMES = { carnival: 'CARNIVAL ISLE', volcano: 'MOLTEN PEAK', factory: 'GEAR WORKS', candy: 'CANDY COVE', moon: 'MOON BASE', title: 'TITLE THEME', menu: 'FILE SELECT', map: 'WALLY ISLAND', grass: "WALLY'S BACKYARD", cave: 'CAVERN COMMUTE', sky: 'CLOUDTOP WALTZ', castle: 'STATIC FORTRESS', boss: 'BOSS BATTLE', beach: 'SUNNY SHORELINE', snow: 'FROSTY PEAKS', haunted: 'HAUNTED MANOR', water: 'CORAL DEPTHS', airship: 'SKY ARMADA', charge: 'SUPER CHARGE', clear: 'COURSE CLEAR', victory: 'THE ENDING', gameover: 'GAME OVER', die: 'OOPS!' };
function JukeboxScene() {
  const songs = Audio8.songs().filter((k) => SONG_NAMES[k]);
  let sel = 0, t = 0, playing = null;
  return {
    enter() { Audio8.stop(); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % songs.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + songs.length - 1) % songs.length; Audio8.sfx('select'); }
      if (Input.pressed('jump') || Input.pressed('start')) { playing = songs[sel]; Audio8.stop(); Audio8.play(playing); }
      if (Input.pressed('back') || Input.pressed('run')) go(() => ExtrasScene());
    },
    draw() {
      ctx.fillStyle = '#100820'; ctx.fillRect(0, 0, VW, VH);
      txt('JUKEBOX', 128, 8, '#ffe040', { align: 'center', outline: '#3a1060' });
      for (let i = 0; i < 24; i++) { const h = playing ? 4 + Math.abs(Math.sin(frame * 0.15 + i * 0.7) * Math.sin(frame * 0.05 + i)) * 26 : 2; ctx.fillStyle = i % 3 === 0 ? '#ff4aa8' : i % 3 === 1 ? '#5ff0ff' : '#ffe040'; ctx.fillRect(8 + i * 10, 52 - h, 7, h); }
      drawWindow(16, 58, 224, 138);
      const top = Math.max(0, Math.min(songs.length - 11, sel - 5));
      for (let i = 0; i < 11; i++) {
        const k = songs[top + i]; if (!k) break;
        const on = top + i === sel, y = 64 + i * 12;
        if (on) txt('>', 24 + ((t >> 3) & 1), y, '#ffe040');
        txt(`${pad(top + i + 1, 2)} ${SONG_NAMES[k]}`, 34, y, on ? '#ffe040' : k === playing ? '#5ff0ff' : '#fff');
      }
      txt(playing ? 'NOW PLAYING: ' + SONG_NAMES[playing] : 'A: PLAY   B: BACK', 128, 204, '#fff', { align: 'center' });
    },
  };
}
function GalleryScene() {
  const D = (img, s = 2) => (x, y) => ctx.drawImage(img, Math.round(x - (img.width * s) / 2), Math.round(y - img.height * s), img.width * s, img.height * s);
  const pages = [
    ['HEROES', [['WALLYMAN', (x, y, t) => Wally.draw(ctx, x, y, 'walk' + ((t >> 2) % 8), 1, { t, hero: 'wally', costume: 'classic', sx: 2, sy: 2 })], ['GOTHCHICK', (x, y, t) => Wally.draw(ctx, x, y, 'walk' + ((t >> 2) % 8), 1, { t, hero: 'goth', costume: 'classic', sx: 2, sy: 2 })], ['ROBO-WALLY', (x, y, t) => Wally.draw(ctx, x, y, 'walk' + ((t >> 2) % 8), 1, { t, hero: 'robo', costume: 'classic', sx: 2, sy: 2, black: !heroOpen('robo') })], ['FROST QUEEN', (x, y, t) => Wally.draw(ctx, x, y, 'walk' + ((t >> 2) % 8), 1, { t, hero: 'frost', costume: 'classic', sx: 2, sy: 2, black: !heroOpen('frost') })], ['DOUG THOMSON', (x, y, t) => Wally.draw(ctx, x, y, 'walk' + ((t >> 2) % 8), 1, { t, hero: 'doug', costume: 'classic', sx: 2, sy: 2 })], ['WALLY JR', (x, y, t) => Wally.draw(ctx, x, y, 'idle' + ((t >> 4) % 4), 1, { t, hero: 'wally', costume: 'junior', sx: 2, sy: 2 })], ['DINO', (x, y, t) => D(Sprites.dino.r[(t >> 3) % 3])(x, y)]]],
    ['DINOS', [['DINO', (x, y, t) => D(Sprites.dinos.teal.r[(t >> 3) % 3])(x, y)], ['FIRE DINO', (x, y, t) => D(Sprites.dinos.red.r[(t >> 3) % 3])(x, y)], ['SKY DINO', (x, y, t) => D(Sprites.dinos.blue.r[(t >> 3) % 3])(x, y)]]],
    ['ENEMIES', [['GRUMBLE', D(Sprites.grumble[0])], ['PRICKLE', D(Sprites.prickle.r[0])], ['BUZZER', D(Sprites.buzzer.r[0])], ['HOPPER', D(Sprites.hopper[0])], ['FLITTER BAT', D(Sprites.bat[0])], ['RHINO-BOT', D(Sprites.charger.r[0])]]],
    ['MORE ENEMIES', [['TURRET', D(Sprites.turret.r)], ['UFO', (x, y) => Play.prototype.drawUfo.call(null, { state: 'hover', beamX: 0, x: 0 }, x - 14, y - 16)], ['FISH', D(Sprites.fish.r[0])], ['JELLYFISH', D(Sprites.jelly[0])], ['GHOST', D(Sprites.ghost.r[0])]]],
    ['BOSSES', [['BARON STATIC', (x, y) => Play.prototype.drawBoss.call(null, { inv: 0, hp: 3, maxHp: 3 }, x - 16, y - 32)], ['ICE YETI', (x, y, t) => Play.prototype.drawYeti.call({ p: { x: 0 } }, { inv: 0, state: 'walk', t, hp: 3, maxHp: 3 }, x - 14, y - 32)], ['MOTHERSHIP', (x, y) => Play.prototype.drawMother.call(null, { inv: 0, beamX: 0, x: 0, mode: null }, x - 28, y - 20)], ['KING KRABBY', (x, y, t) => Play.prototype.drawCrab.call(null, { inv: 0, state: 'walk', t, hp: 3, maxHp: 3 }, x - 17, y - 22)], ['DRILL MOLE', (x, y) => Play.prototype.drawMole.call(null, { inv: 0, state: 'up', t: 0, groundY: y - 20, h: 20 }, x - 12, y - 20)], ['NIMBUS', (x, y, t) => Play.prototype.drawDragon.call(null, { inv: 0, hp: 4, maxHp: 4, t, trail: Array.from({ length: 40 }, (_, k) => [x - 14 - k * 1.5, y - 30 + Math.sin(t * 0.1 + k * 0.3) * 4]) }, x - 14, y - 30, 0)]]],
    ['ITEMS', [['ENERGY DRINK', D(Sprites.drink)], ['SIGNAL PHONE', D(Sprites.phone)], ['1-UP BADGE', D(Sprites.badge)], ['SUPER CHARGE', D(Sprites.battery)], ['JET BOOTS', D(Sprites.boots)], ['WALLY MEDAL', D(Sprites.medal)]]],
  ];
  let page = 0, t = 0;
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('right')) { page = (page + 1) % pages.length; Audio8.sfx('select'); }
      if (Input.pressed('left')) { page = (page + pages.length - 1) % pages.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.confirm()) go(() => ExtrasScene());
    },
    draw() {
      drawParallax('grass', t * 0.3);
      const [title, list] = pages[page];
      drawWindow(8, 4, 240, 20); txt(`< ${title} >  ${page + 1}/${pages.length}`, 128, 10, '#ffe040', { align: 'center' });
      list.forEach(([name, fn], i) => {
        const col = i % 3, row = (i / 3) | 0, cx = 46 + col * 82, by = 100 + row * 92;
        ctx.fillStyle = 'rgba(16,24,72,0.55)'; ctx.fillRect(cx - 38, by - 70, 76, 86);
        fn(cx, by, t);
        txt(name, cx, by + 4, '#fff', { align: 'center', outline: '#101848' });
      });
    },
  };
}
function OptionsScene() {
  const order = ['easy', 'normal', 'hard'];
  const rows = ['DIFFICULTY', 'MUSIC', 'SOUND FX', 'SOUND', 'CRT FILTER', 'SCREEN SHAKE', 'RUMBLE', 'PET', 'WEATHER', 'BACK'];
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % rows.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + rows.length - 1) % rows.length; Audio8.sfx('select'); }
      const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0), tog = d !== 0 || Input.pressed('jump');
      if (sel === 0 && d) { const i = order.indexOf(Settings.get('difficulty')); Settings.set('difficulty', order[(i + d + 3) % 3]); Audio8.sfx('coin'); }
      if ((sel === 1 || sel === 2) && d) { const k = sel === 1 ? 'music' : 'sfx'; Audio8.setVolume(k, Audio8.getVolume(k) + d * 0.2); Audio8.sfx('coin'); }
      if (sel === 3 && tog) { Audio8.setEnabled(!Audio8.isEnabled()); Audio8.sfx('coin'); }
      if (sel === 4 && tog) { Settings.set('crt', !Settings.get('crt')); Audio8.sfx('coin'); }
      if (sel === 5 && tog) { Settings.set('shake', !Settings.get('shake')); Audio8.sfx('coin'); }
      if (sel === 6 && tog) { Settings.set('rumble', Settings.get('rumble') === false); Audio8.sfx('coin'); if (Settings.get('rumble') !== false) rumble(0.7, 200); }
      if (sel === 7 && tog) { Settings.set('pet', Settings.get('pet') === false); Audio8.sfx('coin'); }
      if (sel === 8 && tog) { Settings.set('weather', Settings.get('weather') === false); Audio8.sfx('coin'); }
      if (Input.pressed('back') || (sel === 9 && (Input.pressed('jump') || Input.pressed('start')))) go(() => ExtrasScene());
    },
    draw() {
      drawParallax('sky', t * 0.3);
      drawWindow(20, 20, 216, 180);
      txt('OPTIONS', 128, 28, '#ffe040', { align: 'center' });
      const vals = [`< ${DIFF[Settings.get('difficulty')].name} >`, null, null, Audio8.isEnabled() ? 'ON' : 'OFF', Settings.get('crt') ? 'ON' : 'OFF', Settings.get('shake') ? 'ON' : 'OFF', Settings.get('rumble') !== false ? 'ON' : 'OFF', Settings.get('pet') !== false ? 'ON' : 'OFF', Settings.get('weather') !== false ? 'ON' : 'OFF', ''];
      rows.forEach((r, i) => {
        const y = 44 + i * 14, on = i === sel;
        if (on) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040');
        txt(r, 40, y, on ? '#ffe040' : '#fff');
        if (i === 1 || i === 2) { const v = Math.round(Audio8.getVolume(i === 1 ? 'music' : 'sfx') * 5); for (let k = 0; k < 5; k++) { ctx.fillStyle = k < v ? '#5ff0ff' : '#3a3a58'; ctx.fillRect(150 + k * 9, y + 6 - k, 7, 2 + k); } } else if (vals[i]) txt(vals[i], 156, y, '#5ff0ff');
      });
      const tips = ['EASY: 3 HEARTS, MORE TIME, SLOWER FOES', 'NORMAL: THE CLASSIC CHALLENGE', 'HARD: 1 HEART, LESS TIME, FAST FOES'];
      txt(tips[order.indexOf(Settings.get('difficulty'))], 128, 184, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- 2-player (taking turns) ----------------
const HEROES = {
  wally: { name: 'WALLYMAN', alt: 'WALLY JR', color: '#f2702a', lines: ['THE CAPED ALL-ROUNDER.', 'SPECIAL: SIGNAL SHOCKWAVE', 'KNOCKS OUT EVERYTHING NEAR!'] },
  doug: { name: 'DOUG THOMSON', alt: 'DOUG THOMSON', short: 'DOUG', color: '#ffd040', lines: ['FASTEST RUNNER. SLIDES DOWN', 'AND JUMPS OFF WALLS. SPECIAL:', 'PAUSE BUTTON FREEZES FOES!'] },
  goth: { name: 'GOTHCHICK', alt: 'GOTHCHICK', color: '#ff4aa8', lines: ['JUMPS HIGHER, GLIDES WHEN', 'YOU HOLD JUMP IN THE AIR.', 'SPECIAL: HOMING BAT SWARM!'] },
  robo: { name: 'ROBO-WALLY', alt: 'ROBO-WALLY', short: 'ROBO', color: '#c8d0e0', secret: true, hint: ['COLLECT 20', 'SIGNAL BARS'], ok: () => Ach.has('robohero'), lines: ['SECRET HERO! HOLD JUMP IN', 'THE AIR TO HOVER ON JETS.', 'SPECIAL: SIGNAL SHOCKWAVE'] },
  frost: { name: 'FROST QUEEN', alt: 'FROST QUEEN', short: 'FROST', color: '#80d0ff', secret: true, hint: ['BEAT THE', 'MOTHERSHIP MK II'], ok: () => Ach.has('starisle'), lines: ['SECRET HERO! JUMPS HIGH AND', 'GLIDES. SPECIAL: DEEP FREEZE', 'STOPS EVERY FOE COLD!'] },
};
const HERO_IDS = ['wally', 'goth', 'doug', 'robo', 'frost'];
const heroOpen = (id) => !HEROES[id].ok || HEROES[id].ok();
const heroOf = () => (game && game.hero) || 'wally';
function pname() {
  const h = HEROES[heroOf()];
  const twin = game && game.players === 2 && game.other && game.other.hero === heroOf();
  return twin && game.turn === 1 ? h.alt : h.name;
}
const lastHero = () => { try { return localStorage.getItem('wallyman-last-hero') || 'wally'; } catch (e) { return 'wally'; } };

// Character select: shown after picking a file (and again for player 2 in a 2-player game).
function HeroSelect(isNew, two, who = 0) {
  const ids = HERO_IDS, N = ids.length;
  let sel = Math.max(0, ids.indexOf(who === 0 ? game.hero || 'wally' : (game.other && game.other.hero) || 'wally')), t = 0, view = Math.max(0, Math.min(N - 3, sel - 1));
  const done = () => go(() => (isNew ? StoryScene(() => MapScene()) : MapScene()));
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('right')) { sel = (sel + 1) % N; Audio8.sfx('select'); }
      if (Input.pressed('left')) { sel = (sel + N - 1) % N; Audio8.sfx('select'); }
      view = Math.max(0, Math.min(N - 3, Math.min(sel, Math.max(view, sel - 2))));
      if (Input.pressed('back')) { go(() => TitleScene()); return; }
      if (t > 10 && Input.confirm() && !heroOpen(ids[sel])) { Audio8.sfx('bump'); return; }
      if (t > 10 && Input.confirm()) {
        const hero = ids[sel];
        Audio8.sfx(hero === 'goth' ? 'secret' : 'confirm');
        if (who === 0) {
          game.hero = hero;
          try { localStorage.setItem('wallyman-last-hero', hero); } catch (e) { /* ignore */ }
          if (game.turn === 0 && game.costume === 'junior') game.costume = 'classic';
        } else {
          game.other.hero = hero;
          game.other.costume = hero === game.hero ? 'junior' : 'classic'; // a twin wears the other colours
        }
        Save.persist();
        if (who === 0 && two) go(() => HeroSelect(isNew, two, 1)); else done();
      }
    },
    draw() {
      drawParallax('grass', t * 0.4);
      txt(two ? `PLAYER ${who + 1}: CHOOSE YOUR HERO` : 'CHOOSE YOUR HERO', 128, 8, '#ffe040', { align: 'center', outline: '#101848' });
      ids.slice(view, view + 3).forEach((id, j) => {
        const i = view + j, cx = 48 + j * 80, on = i === sel, x = cx - 36, y = 22, open = heroOpen(id);
        ctx.fillStyle = on ? ((t >> 3) & 1 ? '#ffe040' : '#ffa020') : '#101848'; ctx.fillRect(x - 3, y - 3, 78, 118);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 74, 114);
        const gr = ctx.createLinearGradient(0, y, 0, y + 112);
        const top = { goth: '#3a1848', doug: '#8ab8f0', robo: '#3a4458', frost: '#1a3a6a' }[id] || '#5cb0f8', bot = { goth: '#120818', doug: '#2a3a7a', robo: '#10141c', frost: '#c8ecff' }[id] || '#c8ecff';
        gr.addColorStop(0, top); gr.addColorStop(1, bot);
        ctx.fillStyle = gr; ctx.fillRect(x, y, 72, 112);
        const img = id === 'goth' ? Sprites.gothPortrait : id === 'doug' ? Sprites.dougPortrait : id === 'wally' ? Sprites.portrait : null;
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, Math.round(cx - img.naturalWidth / 2), y + 112 - img.naturalHeight - (id === 'goth' ? 6 : 2));
        else if (!img) { ctx.drawImage(Wally.frame('win' + ((t >> 4) & 1), (t >> 3) & 3, false, 1, open ? 'n' : 'k', 'classic', id), cx - 36, y + 12, 72, 96); if (!open) txt('?', cx, y + 40, '#fff', { scale: 3, align: 'center', outline: '#101848' }); }
        if (!on) { ctx.fillStyle = 'rgba(16,24,72,0.45)'; ctx.fillRect(x, y, 72, 112); }
        txt(open ? HEROES[id].name : '???', cx, y + 116, on ? HEROES[id].color : '#c8d0f0', { align: 'center', outline: '#101848' });
        Wally.draw(ctx, cx, 182, on ? 'walk' + ((t >> 2) % 8) : 'idle' + ((t >> 4) % 4), 1, { t, hero: id, costume: 'classic', black: !open });
        if (on) txt('>', x - 11 + ((t >> 3) & 1), y + 50, '#ffe040', { scale: 2, outline: '#101848' });
      });
      if (view > 0) txt('<', 4, 70, '#ffe040', { scale: 2, outline: '#101848' });
      if (view + 3 < N) txt('>', 244, 70, '#ffe040', { scale: 2, outline: '#101848' });
      drawWindow(16, 184, 224, 38);
      const H_ = HEROES[ids[sel]];
      (heroOpen(ids[sel]) ? H_.lines : ['SECRET HERO - TO UNLOCK:', ...H_.hint]).forEach((l, k) => txt(l, 128, 190 + k * 10, heroOpen(ids[sel]) ? '#fff' : '#ffb0b0', { align: 'center' }));
    },
  };
}
function swapPlayers(markOut) {
  const o = game.other;
  if (!o) return false;
  const cur = { lives: game.lives, score: game.score, coins: game.coins, costume: game.costume, hero: game.hero, out: !!markOut };
  game.lives = o.lives; game.score = o.score; game.coins = o.coins; game.costume = o.costume; game.hero = o.hero || 'wally';
  game.other = cur; game.turn = (game.turn || 0) ^ 1; Save.persist();
  return true;
}
// After a level ends, hand over to the other player if they are still in the game.
function nextTurn(then) {
  if (game.players === 2 && game.other && !game.other.out) { swapPlayers(false); return TurnScene(then); }
  return then();
}
function TurnScene(next) {
  let t = 0;
  return {
    enter() { Audio8.sfx('confirm'); },
    update() { t++; if (t > 110 || (t > 20 && Input.confirm())) go(next); },
    draw() {
      ctx.fillStyle = '#101848'; ctx.fillRect(0, 0, VW, VH);
      txt(pname() + "'S TURN!", 128, 70, '#ffe040', { scale: 2, align: 'center', outline: '#000' });
      drawWally(128, 150, 'win' + ((t >> 4) & 1), 1);
      txt('*' + pad(game.lives, 2) + '   ' + pad(game.score, 7), 128, 168, '#fff', { align: 'center' });
    },
  };
}
function afterGameOver() {
  if (game.players === 2 && game.other && !game.other.out) { swapPlayers(true); return TurnScene(() => MapScene()); }
  if (game.turn === 1) { game.costume = 'classic'; }
  game.players = 1; game.other = null; game.turn = 0; Save.persist();
  return TitleScene();
}

// ---------------- costumes ----------------
const COSTUME_LIST = [
  { id: 'classic', name: 'CLASSIC', hint: '', ok: () => true },
  { id: 'junior', name: 'JUNIOR', hint: '', ok: () => true },
  { id: 'gold', name: 'GOLDEN', hint: 'FIND 20 WALLY MEDALS', ok: () => game.medals.reduce((n, m) => n + [0, 1, 2, 3, 4].filter((i) => m & (1 << i)).length, 0) >= 20 },
  { id: 'ice', name: 'ICE', hint: 'CLEAR FROSTY PEAKS', ok: () => game.cleared[5] },
  { id: 'dino', name: 'DINO SUIT', hint: 'CLEAR CORAL DEPTHS', ok: () => game.cleared[9] },
  { id: 'shadow', name: 'SHADOW', hint: 'CLEAR HAUNTED MANOR', ok: () => game.cleared[8] },
  { id: 'fire', name: 'FIRE', hint: 'BEAT BARON STATIC', ok: () => game.cleared[7] },
];
function WardrobeScene() {
  let sel = Math.max(0, COSTUME_LIST.findIndex((c) => c.id === game.costume)), t = 0, msg = '', msgT = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (msgT > 0) msgT--;
      if (Input.pressed('right')) { sel = (sel + 1) % COSTUME_LIST.length; Audio8.sfx('select'); msgT = 0; }
      if (Input.pressed('left')) { sel = (sel + COSTUME_LIST.length - 1) % COSTUME_LIST.length; Audio8.sfx('select'); msgT = 0; }
      if (Input.pressed('back') || Input.pressed('start') || Input.pressed('run')) { go(() => ShopScene()); return; }
      if (Input.pressed('jump')) {
        const c = COSTUME_LIST[sel];
        if (c.ok()) { Ach.wore(c.id); game.costume = c.id; Save.persist(); Audio8.sfx('power'); msg = 'LOOKING GOOD!'; } else { Audio8.sfx('bump'); msg = 'LOCKED!'; }
        msgT = 90;
      }
    },
    draw() {
      ctx.fillStyle = '#d8a868'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#c89858'; for (let x = 0; x < VW; x += 16) ctx.fillRect(x, 0, 1, VH);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 128, VW, 4);
      drawWindow(8, 6, 120, 22); txt('WARDROBE', 68, 14, '#ffe040', { align: 'center' });
      const c = COSTUME_LIST[sel], open = c.ok();
      // big preview
      const f = Wally.frame('walk' + ((t >> 2) % 8), (t >> 3) & 3, false, 1, open ? 'n' : 'k', c.id, heroOf());
      ctx.drawImage(f, 128 - 36, 30, 72, 96);
      drawWindow(160, 40, 90, 50);
      txt(c.name, 205, 48, open ? '#ffe040' : '#8890b0', { align: 'center' });
      if (!open) { txt('LOCKED', 205, 62, '#ff8080', { align: 'center' }); } else if (game.costume === c.id) txt('WEARING', 205, 62, '#5ae060', { align: 'center' });
      else txt('A: WEAR', 205, 62, '#fff', { align: 'center' });
      if (msgT) txt(msg, 205, 76, '#5ff0ff', { align: 'center' });
      // all costumes
      COSTUME_LIST.forEach((k, i) => {
        const x = 12 + (i - Math.max(0, Math.min(COSTUME_LIST.length - 7, sel - 3))) * 34, y = 140, ok = k.ok(); if (x < 0 || x > 230) return;
        ctx.fillStyle = i === sel ? '#ffe040' : '#6a4020'; ctx.fillRect(x - 2, y - 2, 32, 40);
        ctx.fillStyle = '#f0d8a8'; ctx.fillRect(x, y, 28, 36);
        ctx.drawImage(Wally.frame('idle0', 0, false, 1, ok ? 'n' : 'k', k.id, heroOf()), x + 2, y + 2);
        if (game.costume === k.id) txt('#', x + 22, y + 26, '#e83850');
      });
      if (!open) txt('TO UNLOCK: ' + c.hint, 128, 186, '#fff', { align: 'center', outline: '#3a2010' });
      txt('< > CHOOSE   A: WEAR   B: BACK', 128, 204, '#3a2010', { align: 'center' });
    },
  };
}

// ---------------- time attack ----------------
const TA_KEY = 'wallyman-ta-best';
const taLoad = () => { try { return JSON.parse(localStorage.getItem(TA_KEY)) || {}; } catch (e) { return {}; } };
const taSave = (b) => { try { localStorage.setItem(TA_KEY, JSON.stringify(b)); } catch (e) { /* ignore */ } };
// Ghost of the best Time Attack run: [x, y, pose, face] every 2 frames
const GHOST_KEY = 'wallyman-world-ghosts-v1';
const ghostLoad = (li) => { try { const g = JSON.parse(localStorage.getItem(GHOST_KEY)) || {}; return Array.isArray(g[li]) ? g[li] : null; } catch (e) { return null; } };
const ghostSave = (li, rec) => { try { const g = JSON.parse(localStorage.getItem(GHOST_KEY)) || {}; g[li] = rec; localStorage.setItem(GHOST_KEY, JSON.stringify(g)); } catch (e) { /* ignore */ } };
const fmtTime = (f) => { const cs = Math.floor((f * 100) / 60); return `${Math.floor(cs / 6000)}:${pad(Math.floor(cs / 100) % 60, 2)}.${pad(cs % 100, 2)}`; };
function TimeAttackSelect(start) {
  const avail = (li) => Save.slots.some((s) => s && s.cleared && s.cleared[li]);
  let sel = start || 0, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { do sel = (sel + 1) % LEVELS.length; while (LEVELS[sel].reserved); Audio8.sfx('select'); }
      if (Input.pressed('up')) { do sel = (sel + LEVELS.length - 1) % LEVELS.length; while (LEVELS[sel].reserved); Audio8.sfx('select'); }
      if (Input.pressed('back')) { go(() => ChallengeScene(0)); return; }
      if (Input.confirm()) {
        if (!avail(sel)) { Audio8.sfx('bump'); return; }
        Audio8.sfx('confirm');
        const li = sel;
        game = Object.assign(Save.fresh(), { lives: 99, hero: lastHero() });
        go(() => new Play(li, false, { ta: true }));
      }
    },
    draw() {
      drawParallax('sky', t * 0.3);
      drawWindow(12, 8, 232, 184);
      txt('TIME ATTACK', 128, 16, '#ffe040', { align: 'center' });
      const best = taLoad();
      const ids = LEVELS.map((_, i) => i).filter((i) => !LEVELS[i].reserved), pos = ids.indexOf(sel), top = Math.max(0, Math.min(ids.length - 15, pos - 7));
      ids.forEach((i, k) => {
        const d = LEVELS[i];
        if (k < top || k >= top + 15) return;
        const y = 26 + (k - top) * 11, on = i === sel, ok = avail(i);
        if (on) txt('>', 20 + ((t >> 3) & 1), y, '#ffe040');
        txt(levelTag(i) + '. ' + (ok ? d.name : '???'), 30, y, on ? '#ffe040' : ok ? '#fff' : '#6870a0');
        txt(best[i] ? fmtTime(best[i]) : '-:--.--', 236, y, best[i] ? '#5ff0ff' : '#6870a0', { align: 'right' });
      });
      txt('BEAT A LEVEL IN ANY FILE TO UNLOCK IT', 128, 200, '#fff', { align: 'center', outline: '#101848' });
      txt('START: GO   ESC: BACK', 128, 212, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function TAResultScene(li, frames, rec, sp) {
  const best = taLoad(), old = best[li], record = !old || frames < old;
  if (record) { best[li] = frames; taSave(best); if (rec && rec.length) ghostSave(li, rec); saveSplits(li, sp, frames); if (old) Ach.unlock('timelord'); }
  let t = 0;
  return {
    enter() { Audio8.play(record ? 'victory' : 'clear'); },
    update() { t++; if (t > 40 && Input.confirm()) go(() => TimeAttackSelect(li)); if (t > 40 && Input.pressed('back')) go(() => TimeAttackSelect(li)); },
    draw() {
      drawParallax('sky', t * 0.3);
      drawWindow(28, 40, 200, 120);
      txt(LEVELS[li].name, 128, 52, '#ffe040', { align: 'center' });
      txt('YOUR TIME', 128, 74, '#fff', { align: 'center' });
      txt(fmtTime(frames), 128, 86, '#5ff0ff', { scale: 2, align: 'center', outline: '#101848' });
      txt('BEST  ' + fmtTime(record ? frames : old), 128, 112, '#fff', { align: 'center' });
      if (record && (t >> 4) % 2 === 0) txt('NEW RECORD!', 128, 130, '#ffe040', { scale: 2, align: 'center', outline: '#7a2a08' });
      if (t > 40) txt('PRESS START', 128, 176, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// =====================================================================
// Scene manager + fades
// =====================================================================
let scene = null, nextScene = null, fade = 1, fadeDir = -1;
function go(make) { if (fadeDir === 1) return; nextScene = make; fadeDir = 1; }

function drawWindow(x, y, w, h) {
  ctx.fillStyle = 'rgba(14,20,64,0.88)'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#e8e8f8';
  ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  ctx.fillStyle = '#7880b0';
  ctx.fillRect(x + 3, y + 2, w - 6, 1); ctx.fillRect(x + 3, y + h - 3, w - 6, 1);
  ctx.fillRect(x + 2, y + 3, 1, h - 6); ctx.fillRect(x + w - 3, y + 3, 1, h - 6);
}
function drawParallax(theme, camx, groundY) {
  const bg = Sprites.bg[theme];
  ctx.drawImage(bg.sky, 0, 0, VW, VH);
  for (const L of bg.layers) {
    const off = Math.floor(camx * L.f + (L.drift ? frame * L.drift : 0)) % L.c.width;
    ctx.drawImage(L.c, -off, groundY || 0);
    ctx.drawImage(L.c, L.c.width - off, groundY || 0);
  }
}
// draw WallyMan with his feet centred at (cx, feetY)
function drawSnow(camx) {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 46; i++) {
    const sp = 0.35 + (i % 3) * 0.2;
    const x = (((i * 53 + Math.sin(frame * 0.02 + i) * 6 - camx * (0.4 + (i % 3) * 0.2)) % VW) + VW) % VW;
    const y = (i * 37 + frame * sp) % VH;
    ctx.fillRect(Math.round(x), Math.round(y), i % 4 ? 1 : 2, i % 4 ? 1 : 2);
  }
}
function drawWally(cx, feetY, pose, face, o = {}) { Wally.draw(ctx, cx, feetY, pose, face, Object.assign({ t: frame }, o)); }

// ---------- title logo (built once) ----------
const Logo = (() => {
  const w = 172, h = 40, c = Sprites.canvas(w, h), x = c.getContext('2d');
  const cx = w / 2, cy = h / 2;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const d = ((xx - cx + 0.5) / (w / 2)) ** 2 + ((yy - cy + 0.5) / (h / 2)) ** 2;
    if (d <= 1) {
      x.fillStyle = d > 0.8 ? '#1f9a3a' : d > 0.7 ? '#0e5a1e' : (yy < h * 0.35 ? '#ff9050' : '#f2702a');
      x.fillRect(xx, yy, 1, 1);
    }
  }
  return c;
})();
function drawLogo(y) {
  ctx.drawImage(Logo, 128 - 86, y);
  const word = 'WALLYMAN', sc = 3, step = 18, x0 = 128 - (word.length * step - 3) / 2;
  for (let i = 0; i < word.length; i++) {
    const bob = Math.round(Math.sin(frame * 0.08 + i * 0.7) * 1.5);
    Font.draw(ctx, word[i], x0 + i * step - 1, y + 8 + bob, { scale: sc, color: ['#3ce060', '#3ce060', '#22b040', '#22b040', '#1f9a3a', '#168030', '#168030'], outline: '#0a2a10', ot: 1, shadow: '#7a2a08', sd: 1 });
  }
  const w2 = 'WORLD', sc2 = 4, step2 = 25, x1 = 128 - (w2.length * step2 - 4) / 2;
  const cols = [['#fff7a0', '#ffe040', '#ffd020', '#ffb020', '#ff9010', '#f07010', '#e05010'], ['#a0f0ff', '#60d8ff', '#40b8ff', '#3098f0', '#2878e0', '#2060c8', '#1848a8']];
  for (let i = 0; i < w2.length; i++) {
    const bob = Math.round(Math.sin(frame * 0.08 + i * 0.9 + 2) * 2);
    Font.draw(ctx, w2[i], x1 + i * step2 - 2, y + 42 + bob, { scale: sc2, color: cols[i % 2], outline: '#101848', ot: 2, shadow: '#000', sd: 2 });
  }
}

// =====================================================================
// Title screen + file select
// =====================================================================
function TitleScene() {
  let mode = 'press', sel = 0, eraseMode = false, t = 0, psel = 0, pick = null;
  const walkers = [{ x: -20, k: 'grumble', v: 0.4 }, { x: -120, k: 'prickle', v: 0.35 }];
  const hero = { x: -60, y: 192, vy: 0, anim: 0 };
  const items = () => [0, 1, 2].map((i) => {
    const s = Save.slots[i];
    if (!s) return `FILE ${'ABC'[i]}   NEW GAME`;
    const n = s.cleared.slice(0, 8).filter(Boolean).length;
    return `FILE ${'ABC'[i]}   #${n}/8  *${pad(s.lives, 2)}`;
  }).concat(['CHALLENGES', 'HIGH SCORES', 'EXTRAS', eraseMode ? 'CANCEL ERASE' : 'ERASE FILE']);
  return {
    isTitle: true,
    enter() { Audio8.play('title'); },
    update() {
      t++;
      walkers.forEach((w) => { w.x += w.v; if (w.x > 280) w.x = -40; });
      hero.x += 1.6; hero.anim += 0.35;
      if (hero.y >= 192 && walkers.some((w) => w.x + 8 - hero.x > 10 && w.x + 8 - hero.x < 30)) hero.vy = -4.6;
      hero.vy += 0.25; hero.y = Math.min(192, hero.y + hero.vy);
      if (hero.y >= 192) hero.vy = 0;
      if (hero.x > 300) hero.x = -40;
      if (mode === 'press') {
        if (Input.confirm()) { Audio8.unlock(); Audio8.play('menu'); Audio8.sfx('confirm'); mode = 'menu'; }
        return;
      }
      if (mode === 'players') {
        if (Input.pressed('down')) { psel = (psel + 1) % 3; Audio8.sfx('select'); }
        if (Input.pressed('up')) { psel = (psel + 2) % 3; Audio8.sfx('select'); }
        if (Input.pressed('back')) { mode = 'menu'; return; }
        if (Input.confirm()) {
          const { slot, isNew } = pick, two = psel >= 1, coop = psel === 2;
          if (isNew) Save.slots[slot] = Save.fresh();
          game = Save.slots[slot];
          if (two) Ach.unlock('two');
          if (two) { if (!game.other) game.other = { lives: 5, score: 0, coins: 0, costume: 'junior', out: false }; game.other.out = false; game.players = coop ? 1 : 2; game.coop = coop; if (coop && game.turn === 1) swapPlayers(false); } else { if (game.turn === 1 && game.other) swapPlayers(false); game.players = 1; game.coop = false; game.other = null; game.turn = 0; }
          Save.persist(); Audio8.sfx('confirm');
          go(() => HeroSelect(isNew, two));
        }
        return;
      }
      if (Input.pressed('down')) { sel = (sel + 1) % 7; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + 6) % 7; Audio8.sfx('select'); }
      if (Input.pressed('back')) { if (eraseMode) eraseMode = false; else { mode = 'press'; Audio8.play('title'); } }
      if (Input.confirm()) {
        if (sel < 3) {
          if (eraseMode) {
            Save.slots[sel] = null; Save.persist(); eraseMode = false; Audio8.sfx('brick');
          } else {
            pick = { slot: sel, isNew: !Save.slots[sel] }; psel = Save.slots[sel] && Save.slots[sel].coop ? 2 : Save.slots[sel] && Save.slots[sel].players === 2 ? 1 : 0;
            mode = 'players'; Audio8.sfx('confirm');
          }
        } else if (sel === 3) { Audio8.sfx('confirm'); go(() => ChallengeScene()); } else if (sel === 4) { Audio8.sfx('confirm'); go(() => HighScoreScene(null, () => TitleScene())); } else if (sel === 5) { Audio8.sfx('confirm'); go(() => ExtrasScene()); } else { eraseMode = !eraseMode; Audio8.sfx('select'); }
      }
    },
    draw() {
      drawParallax('grass', t * 0.6);
      const tiles = Sprites.tiles.grass, off = Math.floor(t * 0.6) % 16;
      for (let i = -1; i < 18; i++) { ctx.drawImage(tiles.top, i * 16 - off, 192); ctx.drawImage(tiles.fill, i * 16 - off, 208); }
      walkers.forEach((w) => {
        const f = (t >> 3) & 1;
        const img = w.k === 'grumble' ? Sprites.grumble[f] : Sprites.prickle.r[f];
        ctx.drawImage(img, Math.round(w.x), 176);
      });
      drawWally(hero.x, hero.y, hero.y < 192 ? (hero.vy < 0 ? 'jump' : 'fall') : 'run' + (Math.floor(hero.anim) % 8), 1);
      if (Sprites.portrait.complete && Sprites.portrait.naturalWidth) ctx.drawImage(Sprites.portrait, 200, 192 - Sprites.portrait.naturalHeight + 4);
      drawLogo(14);
      if (mode === 'press' && t % 900 > 560 && Scores.list().length) {
        drawScoreTable(14, 102, 176, 6, null);
      } else if (mode === 'press') {
        if ((t >> 5) % 2 === 0) txt('PRESS START', 92, 132, '#fff', { outline: '#101848' });
        txt('Z/SPACE: JUMP   X/SHIFT: RUN+FIRE', 12, 152, '#d8f0ff');
        txt('C: SPECIAL   ENTER: START/PAUSE', 12, 162, '#d8f0ff');
      } else if (mode === 'players') {
        drawWindow(16, 108, 172, 88);
        txt(`FILE ${'ABC'[pick.slot]}${pick.isNew ? ' - NEW GAME' : ''}`, 102, 116, '#a8b0d8', { align: 'center' });
        ['1 PLAYER GAME', '2P TAKE TURNS', '2P TOGETHER'].forEach((l, i) => { txt(l, 40, 130 + i * 13, i === psel ? '#ffe040' : '#fff'); if (i === psel) txt('>', 30 + ((t >> 3) & 1), 130 + i * 13, '#ffe040'); });
        drawWally(142, 188, 'idle' + ((t >> 4) % 4), 1, { costume: 'classic' });
        if (psel >= 1) drawWally(166, 188, 'idle' + ((t >> 4) % 4), -1, { costume: 'junior' });
        txt(psel === 2 ? 'P2: WASD + F G H' : psel === 1 ? 'SAME DEVICE, TURNS' : 'WALLYMAN', 30, 176, '#a8b0d8');
      } else {
        drawWindow(16, 108, 172, 88);
        items().forEach((s, i) => {
          const y = 114 + i * 11 + (i >= 3 ? 3 : 0);
          txt(s, 34, y, i === sel ? (eraseMode && i < 3 ? '#ff8080' : '#ffe040') : '#fff');
          if (i === sel) txt('>', 24 + ((t >> 3) & 1), y, '#ffe040');
        });
        if (eraseMode) txt('PICK A FILE TO ERASE', 30, 199, '#ff8080', { outline: '#000' });
      }
      txt('@2026 DOUGLAS THOMSON', 4, 214, '#fff');
      if (typeof drawTipJar === 'function') drawTipJar(t);
    },
  };
}

// =====================================================================
// Overworld map: Wally Island
// =====================================================================
const NODES = [
  { x: 26, y: 176, kind: 'home', name: "WALLY'S HOUSE" },
  { x: 58, y: 146, kind: 'level', li: 0 },
  { x: 98, y: 170, kind: 'level', li: 1 },
  { x: 132, y: 138, kind: 'level', li: 2 },
  { x: 98, y: 106, kind: 'castle', li: 3 },
  { x: 132, y: 72, kind: 'level', li: 4 },
  { x: 176, y: 90, kind: 'level', li: 5 },
  { x: 204, y: 134, kind: 'level', li: 6 },
  { x: 230, y: 74, kind: 'castle', li: 7 },
  { x: 24, y: 64, kind: 'bonus', li: 8, icon: 'haunted' },
  { x: 236, y: 180, kind: 'bonus', li: 9, icon: 'water' },
  { x: 182, y: 40, kind: 'bonus', li: 10, icon: 'airship' },
  { x: 246, y: 40, kind: 'portal', to: 1, name: 'ROCKET TO STAR ISLE' },
  { x: 66, y: 110, kind: 'door', li: 21, key: 0 },
  { x: 22, y: 146, kind: 'town', name: 'WALLY TOWN' },
]
// Paths between map stops; the last three are revealed by secret exits.
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [2, 9], [5, 10], [6, 11], [8, 12], [1, 13], [0, 14]];
const nodeOf = (li) => NODES.findIndex((n) => n.li === li);
const Island = (() => {
  const c = Sprites.canvas(VW, VH), x = c.getContext('2d'), r = Sprites.rng(42);
  const blobs = NODES.filter((n) => n.kind !== 'bonus' && n.kind !== 'portal' && n.kind !== 'door' && n.kind !== 'town').map((n) => [n.x, n.y + 4, 30]).concat([[74, 122, 28], [160, 112, 30], [200, 108, 26], [168, 152, 24], [60, 178, 24], [150, 172, 22], [118, 100, 24]]);
  const img = x.createImageData(VW, VH);
  for (let yy = 0; yy < VH; yy++) for (let xx = 0; xx < VW; xx++) {
    let f = 0;
    for (const [bx, by, br] of blobs) f += (br * br) / ((xx - bx) ** 2 + ((yy - by) * 1.25) ** 2 + 1);
    let col = null;
    const near = (n, r) => (xx - NODES[n].x) ** 2 + (yy - NODES[n].y) ** 2 < r * r;
    if (f > 1.9) {
      col = ((xx + yy) % 2 === 0 && f < 2.6) ? [74, 184, 78] : [90, 204, 88];
      if (near(6, 30)) col = (xx + yy) % 2 === 0 && f < 2.6 ? [200, 220, 248] : [244, 248, 255];
      if (near(5, 24)) col = (xx + yy) % 2 === 0 ? [240, 216, 140] : [248, 228, 160];
      if (near(4, 22) || near(8, 24)) col = (xx + yy) % 2 === 0 ? [96, 110, 96] : [112, 128, 108];
    } else if (f > 1.45) col = [240, 216, 140];
    else if (f > 1.25) col = [140, 200, 248];
    if (f > 6 && r() < 0.03) col = [60, 150, 60];
    if (col) { const i = (yy * VW + xx) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  for (const n of NODES) { // little islets for the bonus levels
    if (n.kind !== 'bonus') continue;
    for (let yy = -12; yy <= 12; yy++) for (let xx = -14; xx <= 14; xx++) {
      const d = (xx / 14) ** 2 + (yy / 10) ** 2;
      if (d > 1) continue;
      x.fillStyle = d > 0.8 ? '#8cc8f8' : d > 0.55 ? '#f0d88c' : n.icon === 'haunted' ? '#5a4a6a' : n.icon === 'water' ? '#f0d88c' : '#5acc58';
      x.fillRect(n.x + xx, n.y + 3 + yy, 1, 1);
    }
  }
  // little trees & rocks
  const tree = Sprites.fromRows(['..KKK..', '.KGGGK.', 'KGgGGGK', 'KGGGgGK', '.KGGGK.', '..KTK..', '..KTK..'], { K: '#14401a', G: '#30a040', g: '#68d870', T: '#8a5a2a' });
  [[18, 150], [74, 158], [118, 154], [150, 120], [70, 124], [186, 152], [214, 106], [44, 132], [160, 158]].forEach(([a, b]) => x.drawImage(tree, a, b));
  return c;
})();

// ---------------- Star Isle and Carnival Isle maps ----------------
const NODES2 = [
  { x: 28, y: 178, kind: 'portal', to: 0, name: 'ROCKET TO WALLY ISLAND' },
  { x: 70, y: 140, kind: 'level', li: 11 },
  { x: 120, y: 166, kind: 'level', li: 12 },
  { x: 168, y: 122, kind: 'level', li: 13 },
  { x: 218, y: 72, kind: 'castle', li: 14 },
  { x: 230, y: 150, kind: 'portal', to: 2, name: 'FERRY TO CARNIVAL ISLE' },
  { x: 92, y: 98, kind: 'door', li: 22, key: 1 },
];
const EDGES2 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6]];
const NODES3 = [
  { x: 26, y: 176, kind: 'portal', to: 1, name: 'FERRY TO STAR ISLE' },
  { x: 62, y: 146, kind: 'level', li: 15 },
  { x: 104, y: 172, kind: 'level', li: 16 },
  { x: 146, y: 146, kind: 'level', li: 17 },
  { x: 116, y: 104, kind: 'level', li: 18 },
  { x: 166, y: 74, kind: 'level', li: 19 },
  { x: 220, y: 108, kind: 'castle', li: 20, tent: true },
  { x: 54, y: 96, kind: 'door', li: 23, key: 2 },
  { x: 238, y: 160, kind: 'portal', to: 3, name: 'BOAT TO THE LOST LANDS' },
];
const EDGES3 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 7], [6, 8]];
const NODES4 = [
  { x: 24, y: 180, kind: 'portal', to: 2, name: 'BOAT TO CARNIVAL ISLE' },
  { x: 62, y: 152, kind: 'level', li: 24 },
  { x: 100, y: 118, kind: 'castle', li: 25 },
  { x: 142, y: 166, kind: 'level', li: 26 },
  { x: 184, y: 136, kind: 'castle', li: 27 },
  { x: 160, y: 96, kind: 'level', li: 28 },
  { x: 214, y: 76, kind: 'level', li: 29 },
  { x: 152, y: 44, kind: 'level', li: 30, gate: true },
  { x: 98, y: 40, kind: 'level', li: 31 },
  { x: 46, y: 60, kind: 'castle', li: 32 },
];
const EDGES4 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]];
const starTotal = () => (game.stars || []).reduce((n, m) => n + [0, 1, 2].filter((i) => (m | 0) & (1 << i)).length, 0);
const dimensionOpen = () => !!(game.keys && game.keys[0] && game.keys[1] && game.keys[2]) && starTotal() >= 25;
function makeIsland(nodes, extra, seed, paint) {
  const c = Sprites.canvas(VW, VH), x = c.getContext('2d'), r = Sprites.rng(seed);
  const blobs = nodes.map((n) => [n.x, n.y + 4, 30]).concat(extra);
  const img = x.createImageData(VW, VH);
  for (let yy = 0; yy < VH; yy++) for (let xx = 0; xx < VW; xx++) {
    let f = 0;
    for (const [bx, by, br] of blobs) f += (br * br) / ((xx - bx) ** 2 + ((yy - by) * 1.25) ** 2 + 1);
    const near = (n, rr) => (xx - nodes[n].x) ** 2 + (yy - nodes[n].y) ** 2 < rr * rr;
    const col = paint(f, near, (xx + yy) % 2 === 0, r);
    if (col) { const i = (yy * VW + xx) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  return c;
}
const Island2 = makeIsland(NODES2, [[96, 150, 28], [144, 146, 28], [196, 98, 26], [52, 160, 24], [80, 118, 20], [226, 118, 22]], 77, (f, near, ch, r) => {
  let col = null;
  if (f > 1.9) {
    col = ch ? [110, 170, 110] : [128, 190, 120];
    if (near(1, 32)) col = ch ? [90, 50, 44] : [120, 60, 50];
    if (near(2, 28)) col = ch ? [120, 126, 140] : [140, 146, 160];
    if (near(3, 30)) col = ch ? [255, 160, 210] : [255, 190, 225];
    if (near(4, 30)) col = ch ? [190, 190, 200] : [215, 215, 225];
    if (near(1, 10)) col = [255, 110, 30];
  } else if (f > 1.45) col = [220, 200, 160];
  else if (f > 1.25) col = [150, 140, 230];
  if (f > 6 && r() < 0.03) col = [70, 70, 90];
  return col;
});
const Island3 = makeIsland(NODES3, [[84, 160, 26], [126, 158, 26], [134, 124, 24], [192, 92, 26], [196, 124, 24], [80, 112, 22]], 91, (f, near, ch, r) => {
  let col = null;
  if (f > 1.9) {
    col = ch ? [150, 90, 180] : [170, 110, 200];
    if (near(6, 34)) col = ((Math.floor(f * 3)) % 2) ? [232, 56, 80] : [255, 255, 255];
    if (near(3, 26)) col = ch ? [100, 90, 120] : [120, 110, 140];
    if (near(5, 26)) col = ch ? [40, 40, 80] : [60, 60, 100];
  } else if (f > 1.45) col = [255, 210, 120];
  else if (f > 1.25) col = [250, 140, 190];
  if (f > 6 && r() < 0.04) col = [255, 230, 120];
  return col;
});
const Island4 = makeIsland(NODES4, [[84, 134, 28], [122, 144, 28], [168, 116, 26], [196, 100, 22], [124, 60, 26], [74, 50, 24], [190, 60, 20]], 133, (f, near, ch, r) => {
  let col = null;
  if (f > 1.9) {
    col = ch ? [60, 150, 70] : [76, 170, 84];
    if (near(3, 34) || near(4, 32)) col = ch ? [230, 190, 110] : [244, 210, 130];
    if (near(5, 18) || near(6, 18)) col = ch ? [110, 70, 60] : [130, 84, 70];
    if (near(7, 30) || near(8, 28) || near(9, 30)) col = ch ? [84, 40, 130] : [60, 110, 150];
  } else if (f > 1.45) col = [240, 210, 140];
  else if (f > 1.25) col = [90, 190, 170];
  if (f > 6 && r() < 0.05) col = [30, 100, 40];
  return col;
});
const WORLDS = [
  { nodes: () => NODES, edges: () => EDGES, isle: () => Island, name: 'WALLY ISLAND', sea: ['#2858c8', '#4c80e8'], key: 'node' },
  { nodes: () => NODES2, edges: () => EDGES2, isle: () => Island2, name: 'STAR ISLE', sea: ['#2a2060', '#4a40a0'], key: 'node2' },
  { nodes: () => NODES3, edges: () => EDGES3, isle: () => Island3, name: 'CARNIVAL ISLE', sea: ['#5a1a6a', '#8a3a9a'], key: 'node3' },
  { nodes: () => NODES4, edges: () => EDGES4, isle: () => Island4, name: 'LOST LANDS', sea: ['#1a5a4a', '#2a7a6a'], key: 'node4' },
];
function setNode(li) {
  for (let w = 0; w < WORLDS.length; w++) { const i = WORLDS[w].nodes().findIndex((n) => n.li === li); if (i >= 0) { game.world = w; game[WORLDS[w].key] = i; return; } }
}
const levelTag = (li) => (LEVELS[li] && LEVELS[li].tag ? LEVELS[li].tag : li >= 33 ? `T${li - 32}` : li >= 30 ? `X${li - 29}` : li >= 24 ? `L${li - 23}` : li >= 21 ? `R${li - 20}` : li >= 15 ? `C${li - 14}` : li >= 11 ? `S${li - 10}` : LEVELS[li] && LEVELS[li].bonus ? `B${li - 7}` : String(li + 1));
function drawRocket(x, y, t) {
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 4, y - 16, 8, 16); ctx.fillRect(x - 7, y - 6, 14, 6);
  ctx.fillStyle = '#f0f0f8'; ctx.fillRect(x - 3, y - 15, 6, 14); ctx.fillStyle = '#e83850'; ctx.fillRect(x - 2, y - 18, 4, 4); ctx.fillRect(x - 6, y - 5, 3, 4); ctx.fillRect(x + 3, y - 5, 3, 4);
  ctx.fillStyle = '#5ff0ff'; ctx.fillRect(x - 1, y - 11, 2, 2);
  ctx.fillStyle = (t >> 2) & 1 ? '#ffe040' : '#ff7020'; ctx.fillRect(x - 2, y, 4, 2 + ((t >> 2) & 1));
}
function drawFerry(x, y, t) {
  const bob = (t >> 4) & 1;
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 10, y - 4 + bob, 20, 6); ctx.fillStyle = '#c03040'; ctx.fillRect(x - 9, y - 3 + bob, 18, 4);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y - 10 + bob, 10, 6); ctx.fillStyle = '#5ff0ff'; ctx.fillRect(x - 3, y - 8 + bob, 2, 2); ctx.fillRect(x + 1, y - 8 + bob, 2, 2);
  ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 2, y - 15 + bob, 2, 5);
}
function MapScene() {
  const W = game.world || 0, WD = WORLDS[W], NODES_ = WD.nodes(), EDGES_ = WD.edges(), ISL_ = WD.isle();
  let node = Math.min(NODES_.length - 1, game[WD.key] || 0), pos = { x: NODES_[node].x, y: NODES_[node].y }, target = null, t = 0, lockT = 0;
  const unlocked = (n) => {
    if (n < 0 || n >= NODES_.length) return false;
    const nd = NODES_[n];
    if (nd.kind === 'door' || nd.kind === 'town') return true;
    if (nd.side) return !!game.cleared[nd.after];
    if (nd.kind === 'portal') return W === 0 ? !!game.cleared[7] : nd.to === 2 && W === 1 ? !!game.cleared[14] : nd.to === 3 ? !!game.cleared[20] : nd.to === 4 ? !!game.cleared[27] : nd.to === 5 ? !!game.cleared[44] : nd.to === 6 ? !!game.cleared[55] : nd.to === 7 ? !!game.cleared[62] : nd.to === 8 ? !!game.cleared[69] : nd.to === 9 ? !!game.cleared[78] : nd.to === 10 ? !!game.cleared[85] : nd.to === 11 ? !!game.cleared[91] : nd.to === 12 ? !!game.cleared[105] : nd.to === 13 ? !!game.cleared[111] : true;
    if (nd.gate && !dimensionOpen()) return false;
    if (W === 0) return nd.kind === 'bonus' ? !!(game.secrets[nd.li] || game.cleared[7]) : (n <= 1 || game.cleared[n - 2]);
    const prev = NODES_.slice(0, n).filter((k) => k.li !== undefined && k.kind !== 'door' && !k.side).pop();
    return !prev || !!game.cleared[prev.li];
  };
  function drawNode(n, i) {
    const cleared = n.li !== undefined && game.cleared[n.li];
    if (n.kind === 'home') {
      ctx.fillStyle = '#c03030'; for (let k = 0; k < 6; k++) ctx.fillRect(n.x - 7 + k, n.y - 12 + 5 - k, 14 - k * 2, 1);
      ctx.fillStyle = '#f8f0d8'; ctx.fillRect(n.x - 6, n.y - 6, 12, 8); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(n.x - 1, n.y - 3, 3, 5);
      ctx.fillStyle = '#5ff0ff'; ctx.fillRect(n.x - 5, n.y - 4, 3, 2);
    } else if (n.kind === 'npc') {
      if (typeof drawNpcNode === 'function') drawNpcNode(n, t);
    } else if (n.kind === 'town') {
      for (const [dx, h, c] of [[-9, 8, '#e0a040'], [-2, 11, '#d05050'], [5, 7, '#5080e0']]) { ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x + dx - 1, n.y - h - 1, 7, h + 2); ctx.fillStyle = c; ctx.fillRect(n.x + dx, n.y - h, 5, h); ctx.fillStyle = '#fff0a0'; ctx.fillRect(n.x + dx + 1, n.y - h + 2, 1, 1); ctx.fillRect(n.x + dx + 3, n.y - h + 2, 1, 1); }
    } else if (n.kind === 'door') {
      const has = game.keys && game.keys[n.key];
      ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 6, n.y - 12, 12, 15); ctx.fillStyle = cleared ? '#ffd040' : '#8a5a2a'; ctx.fillRect(n.x - 5, n.y - 11, 10, 13);
      ctx.fillStyle = '#5a3418'; ctx.fillRect(n.x - 5, n.y - 6, 10, 1); ctx.fillStyle = has ? ((t >> 3) & 1 ? '#fff8a0' : '#ffd040') : '#3a2a2a'; ctx.fillRect(n.x + 1, n.y - 5, 2, 3);
      if (!has) { ctx.fillStyle = '#a0a8c0'; ctx.fillRect(n.x - 3, n.y - 4, 6, 5); ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 1, n.y - 3, 2, 2); }
    } else if (n.kind === 'portal') {
      if (!unlocked(i)) { txt('?', n.x - 2, n.y - 4, (t >> 4) & 1 ? '#c8d8f0' : '#8090b0'); return; }
      if (W >= 2 || n.to >= 2) drawFerry(n.x, n.y + 2, t); else drawRocket(n.x, n.y + 2, t);
    } else if (n.kind === 'bonus') {
      if (!unlocked(i)) { txt('?', n.x - 2, n.y - 4, (t >> 4) & 1 ? '#c8d8f0' : '#8090b0'); return; }
      if (n.icon === 'haunted') {
        ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 7, n.y - 8, 14, 11); ctx.fillStyle = '#6a4a8a'; ctx.fillRect(n.x - 6, n.y - 7, 12, 9);
        ctx.fillStyle = '#2a1a3a'; for (let k = 0; k < 6; k++) ctx.fillRect(n.x - 6 + k, n.y - 13 + k, 12 - k * 2, 1);
        ctx.fillStyle = (t >> 3) & 1 ? '#ffd860' : '#a08030'; ctx.fillRect(n.x - 4, n.y - 4, 3, 3); ctx.fillRect(n.x + 1, n.y - 4, 3, 3);
      } else if (n.icon === 'water') {
        ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 7, n.y - 6, 14, 12); ctx.fillStyle = '#3a9ae8'; ctx.fillRect(n.x - 6, n.y - 5, 12, 10);
        ctx.fillStyle = '#ff9020'; ctx.fillRect(n.x - 3, n.y - 1, 6, 3); ctx.fillRect(n.x + 3, n.y - 2, 2, 5);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(n.x - 4, n.y - 4 - ((t >> 3) % 3), 2, 2);
      } else {
        ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 9, n.y - 14, 18, 10); ctx.fillStyle = '#b0b8d0'; ctx.fillRect(n.x - 8, n.y - 13, 16, 8);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 6, n.y - 3, 12, 5); ctx.fillStyle = '#a06030'; ctx.fillRect(n.x - 5, n.y - 2, 10, 3);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 4, n.y - 5, 1, 3); ctx.fillRect(n.x + 3, n.y - 5, 1, 3);
      }
      if (game.cleared[n.li]) txt('#', n.x + 6, n.y - 16, '#ffe040');
    } else if (n.kind === 'castle' && n.tent) {
      for (let y = 0; y < 16; y++) { const w = Math.round((y + 1) * 0.8); for (let i2 = -w; i2 <= w; i2++) { ctx.fillStyle = ((i2 + 20) >> 2) % 2 ? (cleared ? '#ffd040' : '#e83850') : '#ffffff'; ctx.fillRect(n.x + i2, n.y - 16 + y, 1, 1); } }
      ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 3, n.y - 6, 6, 6); ctx.fillStyle = (t >> 4) & 1 ? '#ffe040' : '#ff6020'; ctx.fillRect(n.x, n.y - 22, 1, 6); ctx.fillRect(n.x + 1, n.y - 22, 4, 3);
    } else if (n.kind === 'castle') {
      ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 11, n.y - 17, 22, 20);
      ctx.fillStyle = cleared ? '#a0a8c0' : '#6a6a80'; ctx.fillRect(n.x - 10, n.y - 10, 20, 12); ctx.fillRect(n.x - 10, n.y - 16, 5, 6); ctx.fillRect(n.x + 5, n.y - 16, 5, 6); ctx.fillRect(n.x - 3, n.y - 14, 6, 4);
      ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 2, n.y - 4, 4, 6);
      ctx.fillStyle = (t >> 4) & 1 ? '#ffe040' : '#ff6020'; ctx.fillRect(n.x, n.y - 22, 1, 6); ctx.fillRect(n.x - 1, n.y - 23, 3, 2);
    } else {
      ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 6, n.y - 3, 12, 7); ctx.fillRect(n.x - 5, n.y - 4, 10, 9);
      ctx.fillStyle = cleared ? '#ffd040' : '#e83850'; ctx.fillRect(n.x - 5, n.y - 2, 10, 5); ctx.fillRect(n.x - 4, n.y - 3, 8, 7);
      ctx.fillStyle = cleared ? '#fff8c0' : '#ff98a8'; ctx.fillRect(n.x - 3, n.y - 2, 4, 1);
      txt(levelTag(n.li), n.x - 2, n.y - 14, '#fff');
    }
  }
  return {
    isMap: true,
    enter() { Audio8.play('map'); },
    update() {
      t++; if (lockT > 0) lockT--;
      if (target !== null) {
        const tn = NODES_[target], dx = tn.x - pos.x, dy = tn.y - pos.y, d = Math.hypot(dx, dy);
        if (d < 1.5) { pos = { x: tn.x, y: tn.y }; node = target; target = null; game[WD.key] = node; Save.persist(); } else { pos.x += (dx / d) * 1.5; pos.y += (dy / d) * 1.5; }
        return;
      }
      const dirs = [['right', 1, 0], ['left', -1, 0], ['up', 0, -1], ['down', 0, 1]];
      for (const [k, dx0, dy0] of dirs) {
        if (!Input.pressed(k)) continue;
        let best = null, bd = 0.3;
        for (const [a, b2] of EDGES_) {
          const o = a === node ? b2 : b2 === node ? a : null;
          if (o === null || !unlocked(o) || !unlocked(a === node ? a : b2)) continue;
          const vx = NODES_[o].x - NODES_[node].x, vy = NODES_[o].y - NODES_[node].y, dot = (vx * dx0 + vy * dy0) / Math.hypot(vx, vy);
          if (dot > bd) { bd = dot; best = o; }
        }
        if (best !== null) { target = best; Audio8.sfx('map'); } else Audio8.sfx('bump');
        break;
      }
      const nd = NODES_[node];
      if (Input.confirm()) {
        if (nd.kind === 'door') {
          if (game.keys && game.keys[nd.key]) { Audio8.sfx('secret'); const li = nd.li; go(() => IntroScene(li, false)); } else { Audio8.sfx('bump'); lockT = 90; }
        } else if (nd.kind === 'town') { Audio8.sfx('confirm'); go(() => TownScene()); } else if (nd.kind === 'npc') { Audio8.sfx('confirm'); go(() => QuestNpcScene(nd)); } else if (nd.li !== undefined) { Audio8.sfx('confirm'); const li = nd.li; go(() => IntroScene(li, false)); } else if (nd.kind === 'home') { Audio8.sfx('confirm'); go(() => HouseScene()); } else if (nd.kind === 'portal') {
          const to = nd.to !== undefined ? nd.to : W === 0 ? 1 : 0, tw = WORLDS[to];
          Audio8.sfx('secret'); game.world = to; game[tw.key] = Math.max(0, tw.nodes().findIndex((k) => k.kind === 'portal' && k.to === W)); Save.persist();
          const comic = to === 1 && !game.seenComic1 ? 'star' : to === 2 && !game.seenComic2 ? 'carnival' : null;
          if (comic) { game[comic === 'star' ? 'seenComic1' : 'seenComic2'] = true; Save.persist(); go(() => ComicScene(comic, () => MapScene())); } else go(() => MapScene());
        }
      }
      if (Input.pressed('back')) go(() => TitleScene());
    },
    draw() {
      ctx.fillStyle = WD.sea[0]; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = WD.sea[1];
      for (let yy = 4; yy < VH; yy += 10) for (let xx = ((yy * 7) % 24) - 24; xx < VW; xx += 24) ctx.fillRect(xx + ((t >> 4) + (yy >> 1)) % 6, yy, 5, 1);
      ctx.drawImage(ISL_, 0, 0);
      for (const [ia, ib] of EDGES_) {
        if (!unlocked(ib) || !unlocked(ia)) continue;
        const a = NODES_[ia], b = NODES_[ib], d = Math.hypot(b.x - a.x, b.y - a.y), secret = NODES_[ib].kind === 'bonus', door = NODES_[ib].kind === 'door';
        for (let s = 0; s < d; s += 4) { ctx.fillStyle = door ? ((s >> 2) % 2 ? '#ffd040' : '#a07020') : secret ? ((s >> 2) + (t >> 3)) % 3 ? '#c070ff' : '#ffe8ff' : '#7a5a2a'; ctx.fillRect(Math.round(a.x + ((b.x - a.x) * s) / d) - 1, Math.round(a.y + ((b.y - a.y) * s) / d), 3, 2); }
      }
      NODES_.forEach(drawNode);
      NODES_.forEach((n) => { if (n.li === undefined || n.kind === 'door' || !unlocked(NODES_.indexOf(n))) return; for (let i = 0; i < 5; i++) { ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 8 + i * 3, n.y + 7, 3, 3); ctx.fillStyle = game.medals[n.li] & (1 << i) ? '#ffd040' : '#4a4a60'; ctx.fillRect(n.x - 7 + i * 3, n.y + 8, 1, 1); } });
      const walking = target !== null;
      const face = target !== null ? Math.sign(NODES_[target].x - pos.x) || 1 : 1;
      drawWally(pos.x, pos.y + 2, walking ? 'walk' + ((t >> 2) % 8) : 'idle' + ((t >> 4) % 4), face);
      drawWindow(4, 4, 248, 20);
      txt(game.players === 2 ? (HEROES[heroOf()].short || pname()) + "'S TURN" : WD.name + (game.plus ? ' +' + game.plus : ''), 10, 10, '#ffe040');
      ctx.drawImage(Sprites.heart, 112, 10); txt('*' + pad(game.lives, 2), 121, 10);
      ctx.drawImage(Sprites.coinIcon, 150, 10); txt('*' + pad(game.coins, 2), 157, 10);
      txt(pad(game.score, 7), 206, 10);
      drawWindow(4, 196, 248, 24);
      const n = NODES_[node];
      const label = n.kind === 'door' ? (game.keys && game.keys[n.key] ? `${levelTag(n.li)}. ${LEVELS[n.li].name}` : 'LOCKED DOOR') : n.li !== undefined ? `${levelTag(n.li)}. ${LEVELS[n.li].name}` : n.name;
      txt(label, 12, 205, '#fff');
      if (n.li !== undefined && n.kind !== 'door') { const mc = medalCount(n.li); ctx.drawImage(Sprites.miniMedal, 186, 206); txt(mc + '/5', 193, 205, mc === 5 ? '#ffe040' : '#fff'); const st = game.stars[n.li] | 0; for (let k = 0; k < 3; k++) txt('#', 222 + k * 8, 205, st & (1 << k) ? '#ffe040' : game.cleared[n.li] ? '#6a6a90' : '#30305a'); }
      if (lockT > 0) { drawWindow(48, 92, 160, 30); txt('LOCKED! FIND THE KEY', 128, 99, '#ff8080', { align: 'center' }); txt('HIDDEN IN A LEVEL...', 128, 110, '#fff', { align: 'center' }); }
      if (target === null && (t >> 5) % 2 === 0) txt(n.kind === 'door' ? 'START: OPEN' : n.li !== undefined ? 'PRESS START' : n.kind === 'portal' ? 'START: TRAVEL' : n.kind === 'town' ? 'START: ENTER' : n.kind === 'npc' ? 'START: TALK' : 'START: HOUSE', 160, 186, '#fff', { outline: '#101848' });
    },
  };
}

// =====================================================================
// Level intro, game over and ending
// =====================================================================
function IntroScene(li, fromCheckpoint) {
  let t = 0;
  return {
    enter() { Audio8.stop(); },
    update() { t++; if (t > 130 || (t > 20 && Input.confirm())) go(() => new Play(li, fromCheckpoint)); },
    draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
      txt(LEVELS[li].world ? LEVELS[li].world : LEVELS[li].bonus ? 'BONUS LEVEL' : li >= 33 ? 'WALLY TOWN RIDE' : li >= 30 ? `STATIC DIMENSION ${li - 29}` : li >= 24 ? `LOST LANDS ${li - 23}` : li >= 21 ? 'SECRET ROOM' : li >= 15 ? `CARNIVAL ${li - 14}` : li >= 11 ? `STAR ISLE ${li - 10}` : `LEVEL ${li + 1}`, 128, 60, LEVELS[li].bonus || li >= 21 ? '#c070ff' : '#ffe040', { scale: 2, align: 'center' });
      txt(LEVELS[li].name, 128, 88, '#fff', { align: 'center' });
      if (isNight()) txt('NIGHT TIME: GHOSTS ROAM, COINS X2', 128, 204, '#a0b0ff', { align: 'center' });
      drawWally(110, 142, 'idle' + ((t >> 4) % 4), 1);
      if (game.players === 2 || heroOf() !== 'wally') txt(pname(), 128, 104, HEROES[heroOf()].color, { align: 'center' });
      txt('*  ' + game.lives, 124, 126, '#fff');
      for (let i = 0; i < 5; i++) ctx.drawImage(game.medals[li] & (1 << i) ? Sprites.miniMedal : Sprites.miniMedalOff, 113 + i * 7, 160);
      for (let k = 0; k < 3; k++) txt('#', 118 + k * 8, 172, (game.stars[li] | 0) & (1 << k) ? '#ffe040' : '#4a4a6a');
      if (!LEVELS[li].bonus || true) txt(DIFF[Settings.get('difficulty')].name, 128, 190, Settings.get('difficulty') === 'hard' ? '#ff6060' : Settings.get('difficulty') === 'easy' ? '#5ae060' : '#a8b0d8', { align: 'center' });
    },
  };
}
function GameOverScene() {
  let t = 0;
  return {
    enter() { Audio8.play('gameover'); },
    update() { t++; if (t > 300 || (t > 60 && Input.confirm())) go(() => finishRun(false, afterGameOver)); },
    draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
      txt('GAME OVER', 128, 96, '#f04040', { scale: 3, align: 'center', outline: '#400' });
    },
  };
}
function EndingScene() {
  let t = 0;
  const lines = ['THE STATIC IS GONE!', '', 'BARON STATIC HAS BEEN', 'UNPLUGGED FOR GOOD AND', 'WALLY ISLAND HAS FULL', 'SIGNAL ONCE AGAIN.', '', 'THANKS FOR PLAYING', 'WALLYMAN WORLD!', '', 'STARRING WALLYMAN', 'CREATED BY DOUGLAS THOMSON'];
  return {
    enter() { Audio8.play('victory'); },
    update() { t++; if (t > 240 && Input.confirm()) go(() => finishRun(true, () => TitleScene())); },
    draw() {
      drawParallax('sky', t * 0.4);
      if (Sprites.portrait.complete && Sprites.portrait.naturalWidth) ctx.drawImage(Sprites.portrait, 196, 112 + Math.round(Math.sin(t * 0.05) * 3));
      drawWindow(8, 16, 180, 196);
      const shown = Math.min(lines.length, Math.floor(t / 30));
      for (let i = 0; i < shown; i++) txt(lines[i], 18, 28 + i * 14, i === 0 || i === 8 ? '#ffe040' : '#fff');
      if (t > 240 && (t >> 5) % 2 === 0) txt('PRESS START', 62, 196, '#5ff0ff');
    },
  };
}

function medalCount(li) { return [0, 1, 2, 3, 4].filter((i) => game.medals[li] & (1 << i)).length; }

// Opening story, shown when a new save file starts.
function StoryScene(next) {
  const pages = [
    { bg: 'grass', lines: ['WALLY ISLAND WAS A HAPPY', 'PLACE. EVERY PHONE HAD', 'FULL SIGNAL, AND WALLYMAN', 'AND HIS PAL DINO KEPT', 'THE PEACE.'] },
    { bg: 'castle', lines: ['THEN BARON STATIC ARRIVED', 'IN HIS FLYING SAUCER AND', 'SCRAMBLED EVERY SIGNAL', 'ON THE ISLAND!'] },
    { bg: 'sky', lines: ['NOW ONLY ONE HERO CAN', 'BRING THE SIGNAL BACK...', '', 'IT IS TIME FOR', 'WALLYMAN!'] },
  ];
  let page = 0, t = 0;
  return {
    enter() { Audio8.play('title'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(next); return; }
      if (t > 20 && Input.confirm()) {
        const total = pages[page].lines.join('').length;
        if (t * 1.2 < total) { t = 999; return; }
        Audio8.sfx('select');
        if (++page >= pages.length) go(next); else t = 0;
      }
    },
    draw() {
      const P = pages[Math.min(page, pages.length - 1)];
      drawParallax(P.bg, frame * 0.4);
      if (page === 0) {
        drawWally(104, 118, 'idle' + ((frame >> 4) % 4), 1);
        ctx.drawImage(Sprites.dino.l[0], 132, 96 + ((frame >> 4) & 1));
        ctx.fillStyle = '#5ff0ff'; for (let r = 0; r < 3; r++) if (((frame >> 4) % 3) >= r) ctx.fillRect(112 + r * 3, 88 - r * 3, 2, 4 + r * 2);
      } else if (page === 1) {
        Play.prototype.drawUfo.call(null, { state: 'hover', beamX: 0, x: 0 }, 70, 40 + Math.round(Math.sin(frame * 0.05) * 3));
        Play.prototype.drawBoss.call(null, { inv: 0, hp: 3, maxHp: 3 }, 150, 70);
        ctx.fillStyle = '#5ff0ff'; for (let i = 0; i < 12; i++) ctx.fillRect((i * 37 + frame * 3) % 256, 20 + (i * 23) % 90, 3, 1);
      } else if (Sprites.portrait.complete && Sprites.portrait.naturalWidth) {
        ctx.drawImage(Sprites.portrait, 128 - Sprites.portrait.naturalWidth / 2, 14 + Math.round(Math.sin(frame * 0.05) * 2));
      }
      drawWindow(16, 124, 224, 84);
      let left = Math.floor(t * 1.2);
      P.lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; txt(s, 28, 134 + i * 13, i === P.lines.length - 1 && page === 2 ? '#ffe040' : '#fff'); });
      if ((frame >> 5) % 2 === 0) txt(page < pages.length - 1 ? 'START: NEXT' : 'START: PLAY', 236, 212, '#5ff0ff', { align: 'right' });
      txt('ESC/SELECT: SKIP', 20, 212, '#a8b0d8');
    },
  };
}

// Dino's shop at Wally's House: spend coins on boosts for your next level.
const HAT_LIST = [
  { id: 'none', name: 'NO HAT', price: 0 }, { id: 'party', name: 'PARTY HAT', price: 30 }, { id: 'cowboy', name: 'COWBOY HAT', price: 40 },
  { id: 'tophat', name: 'TOP HAT', price: 50 }, { id: 'propeller', name: 'PROPELLER CAP', price: 60 }, { id: 'crown', name: 'GOLD CROWN', price: 80 }, { id: 'halo', name: 'HALO', price: 100 },
];
function HatScene() {
  if (!game.hats) game.hats = ['none'];
  let sel = Math.max(0, HAT_LIST.findIndex((h) => h.id === (game.hat || 'none'))), t = 0, msg = '', msgT = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (msgT > 0) msgT--;
      if (Input.pressed('right')) { sel = (sel + 1) % HAT_LIST.length; Audio8.sfx('select'); msgT = 0; }
      if (Input.pressed('left')) { sel = (sel + HAT_LIST.length - 1) % HAT_LIST.length; Audio8.sfx('select'); msgT = 0; }
      if (Input.pressed('back') || Input.pressed('start') || Input.pressed('run')) { go(() => ShopScene()); return; }
      if (Input.pressed('jump')) {
        const h = HAT_LIST[sel];
        if (game.hats.includes(h.id)) { game.hat = h.id; msg = h.id === 'none' ? 'HAT OFF!' : 'LOOKING SHARP!'; Audio8.sfx('power'); } else if (game.coins >= h.price) { game.coins -= h.price; game.hats.push(h.id); game.hat = h.id; msg = 'BOUGHT IT!'; Audio8.sfx('oneup'); } else { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); }
        Save.persist(); msgT = 90;
      }
    },
    draw() {
      ctx.fillStyle = '#c8a0d8'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#b890c8'; for (let x = 0; x < VW; x += 16) ctx.fillRect(x, 0, 1, VH);
      ctx.fillStyle = '#6a4a7a'; ctx.fillRect(0, 128, VW, 4);
      drawWindow(8, 6, 120, 22); txt('HAT STAND', 68, 14, '#ffe040', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 176, 14); txt('*' + pad(game.coins, 2), 183, 14, '#fff');
      const h = HAT_LIST[sel], own = game.hats.includes(h.id);
      Wally.draw(ctx, 128, 126, 'idle' + ((t >> 4) % 4), 1, { t, sx: 3, sy: 3, hat: h.id });
      drawWindow(166, 40, 84, 50);
      txt(h.name, 208, 48, '#ffe040', { align: 'center' });
      if (game.hat === h.id || (h.id === 'none' && !game.hat)) txt('WEARING', 208, 62, '#5ae060', { align: 'center' });
      else if (own) txt('A: WEAR', 208, 62, '#fff', { align: 'center' });
      else if (h.garden) txt('GROW IT IN', 208, 56, '#5ae060', { align: 'center' }), txt('THE GARDEN', 208, 66, '#5ae060', { align: 'center' }); else { ctx.drawImage(Sprites.coinIcon, 190, 62); txt(String(h.price), 197, 62, game.coins >= h.price ? '#fff' : '#ff6060'); }
      if (msgT) txt(msg.slice(0, 13), 208, 76, '#5ff0ff', { align: 'center' });
      HAT_LIST.forEach((k, i) => {
        const x = 10 + (i - Math.max(0, Math.min(HAT_LIST.length - 7, sel - 3))) * 34, y = 140; if (x < 0 || x > 230) return;
        ctx.fillStyle = i === sel ? '#ffe040' : '#6a4a7a'; ctx.fillRect(x - 2, y - 2, 32, 40);
        ctx.fillStyle = '#efe0f8'; ctx.fillRect(x, y, 28, 36);
        Wally.draw(ctx, x + 14, y + 33, 'idle0', 1, { t, hat: k.id, black: false });
        if (game.hat === k.id) txt('#', x + 22, y + 26, '#e83850');
      });
      txt('< > CHOOSE   A: BUY / WEAR   B: BACK', 128, 204, '#3a2048', { align: 'center' });
    },
  };
}

// ---------------- time attack ----------------
function ShopScene() {
  const items = [
    { name: 'EXTRA LIFE', price: 50, can: () => game.lives < 99, buy: () => { game.lives++; }, owned: () => false },
    { name: '+3 CANNONBALLS', price: 20, can: () => (game.bonusAmmo || 0) < 6, buy: () => { game.bonusAmmo = (game.bonusAmmo || 0) + 3; }, owned: () => (game.bonusAmmo || 0) >= 6 },
    { name: 'FULL HEARTS', price: 30, can: () => !game.startHearts, buy: () => { game.startHearts = 3; }, owned: () => !!game.startHearts },
    { name: 'JET BOOTS', price: 60, can: () => !game.startBoots, buy: () => { game.startBoots = true; }, owned: () => !!game.startBoots },
    { name: 'WARDROBE', price: 0, wardrobe: true },
    { name: 'HAT STAND', price: 0, hats: true },
    { name: 'BACK', price: 0 },
  ];
  let sel = 0, t = 0, say = "HI! WHAT'LL IT BE?", sayT = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (sayT > 0) sayT--;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.pressed('start')) { go(() => HouseScene()); return; }
      if (Input.pressed('jump')) {
        const it = items[sel];
        if (it.wardrobe) { go(() => WardrobeScene()); return; }
        if (it.hats) { go(() => HatScene()); return; }
        if (!it.buy) { go(() => HouseScene()); return; }
        if (!it.can()) { say = 'YOU ALREADY HAVE THAT!'; Audio8.sfx('bump'); } else if (game.coins < it.price) { say = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); } else {
          game.coins -= it.price; it.buy(); Save.persist(); say = 'THANKS! ROAR!'; Audio8.sfx('power');
        }
        sayT = 120;
      }
      if (sayT === 0) say = "HI! WHAT'LL IT BE?";
    },
    draw() {
      ctx.fillStyle = '#e8b878'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#d8a060'; for (let x = 0; x < VW; x += 16) ctx.fillRect(x, 0, 1, 120);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(176, 24, 56, 40); ctx.fillStyle = '#ffffff'; ctx.fillRect(176, 43, 56, 2); ctx.fillRect(203, 24, 2, 40);
      ctx.fillStyle = '#6a3a1a'; ctx.fillRect(174, 22, 60, 2); ctx.fillRect(174, 64, 60, 2);
      ctx.drawImage(Sprites.dino.l[0], 150, 82 + ((t >> 4) & 1));
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(110, 104, 146, 18); ctx.fillStyle = '#a87040'; ctx.fillRect(110, 104, 146, 3);
      ctx.drawImage(Sprites.ammo, 120, 89); ctx.drawImage(Sprites.boots, 216, 89); ctx.drawImage(Sprites.heart, 240, 96);
      drawWindow(8, 8, 156, 24); txt("DINO'S SHOP", 86, 16, '#ffe040', { align: 'center' });
      drawWindow(8, 40, 140, 22); txt(say.slice(0, 22), 14, 48, sayT ? '#5ff0ff' : '#fff');
      drawWindow(8, 124, 240, 96);
      items.forEach((it, i) => {
        const y = 129 + i * 11, on = i === sel;
        if (on) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040');
        txt(it.name, 26, y, on ? '#ffe040' : '#fff');
        if (it.buy) {
          if (it.owned()) txt('READY', 196, y, '#5ae060');
          else { ctx.drawImage(Sprites.coinIcon, 200, y); txt(pad(it.price, 2), 207, y, game.coins >= it.price ? '#fff' : '#ff6060'); }
        }
      });
      ctx.drawImage(Sprites.coinIcon, 172, 16); txt('*' + pad(game.coins, 2), 179, 16, '#fff');
      txt('BOOSTS LAST FOR YOUR NEXT LEVEL', 128, 212, '#a8b0d8', { align: 'center' });
    },
  };
}

function MessageScene(lines, next) {
  let t = 0;
  return {
    enter() { Audio8.play('map'); },
    update() { t++; if (t > 60 && Input.confirm()) go(next); },
    draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
      drawWindow(20, 30, 216, 150);
      const shown = Math.min(lines.length, Math.floor(t / 12));
      for (let i = 0; i < shown; i++) txt(lines[i], 128, 46 + i * 14, i === lines.length - 1 ? '#ffe040' : '#fff', { align: 'center' });
      if (t > 60 && (t >> 5) % 2 === 0) txt('PRESS START', 128, 190, '#5ff0ff', { align: 'center' });
    },
  };
}
function drawScoreTable(x, y, w, rows, highlight) {
  const list = Scores.list();
  drawWindow(x, y, w, 22 + rows * 11);
  txt(Scores.isWorld() ? 'WORLD HIGH SCORES' : 'HIGH SCORES', x + w / 2, y + 6, '#ffe040', { align: 'center' });
  for (let i = 0; i < rows; i++) {
    const e = list[i], yy = y + 18 + i * 11;
    const hl = e && e.id === highlight && (frame >> 3) % 2 === 0;
    const col = hl ? '#5ff0ff' : i === 0 ? '#ffe040' : '#fff';
    txt(String(i + 1).padStart(2, ' '), x + 8, yy, col);
    if (!e) { txt('--------', x + 26, yy, '#7880b0'); continue; }
    txt(e.name, x + 26, yy, col);
    txt(e.done ? '#' : 'L' + e.level, x + w - 64, yy, col);
    txt(pad(e.score, 7), x + w - 50, yy, col);
  }
}
function HighScoreScene(highlight, next) {
  let t = 0;
  return {
    enter() { Audio8.play('menu'); Scores.refresh(); },
    update() { t++; if (t > 20 && (Input.confirm() || Input.pressed('back'))) { Audio8.sfx('confirm'); go(next); } },
    draw() {
      drawParallax('grass', t * 0.4);
      drawScoreTable(20, 20, 216, 10, highlight);
      txt('# = BEAT THE GAME   L = LEVEL REACHED', 128, 160, '#fff', { align: 'center' });
      if ((t >> 5) % 2 === 0) txt('PRESS START', 128, 196, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
// Arcade-style name entry: pick letters with the D-pad, or just type.
function NameEntryScene(score, level, done, then) {
  const GRID = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ0123', '456789-.! '];
  let name = Scores.lastName().slice(0, 8), cx = 0, cy = 0, t = 0;
  const finish = () => {
    const n = name.trim() || 'WALLY';
    const id = Scores.add(n, score, level, done);
    Audio8.sfx('oneup');
    go(() => HighScoreScene(id, then));
  };
  return {
    enter() { Audio8.play('menu'); Input.clearTyped(); },
    update() {
      t++;
      const typedKeys = Input.takeTyped();
      if (Input.pressed('start')) { for (const ch of typedKeys) if (name.length < 8) name += ch; finish(); return; }
      if (typedKeys.length) { // typing on a keyboard: letter keys also map to game buttons, so skip the grid this frame
        for (const ch of typedKeys) if (name.length < 8) { name += ch; Audio8.sfx('letter'); }
        return;
      }
      if (Input.pressed('back')) { name = name.slice(0, -1); Audio8.sfx('select'); return; }
      if (Input.pressed('right')) { cx = (cx + 1) % 10; Audio8.sfx('select'); }
      if (Input.pressed('left')) { cx = (cx + 9) % 10; Audio8.sfx('select'); }
      if (Input.pressed('down')) { cy = (cy + 1) % 5; Audio8.sfx('select'); }
      if (Input.pressed('up')) { cy = (cy + 4) % 5; Audio8.sfx('select'); }
      if (Input.pressed('run')) { name = name.slice(0, -1); Audio8.sfx('select'); }
      if (Input.pressed('jump')) {
        if (cy === 4) { if (cx < 5) { name = name.slice(0, -1); Audio8.sfx('select'); } else finish(); } else if (name.length < 8) { name += GRID[cy][cx]; Audio8.sfx('letter'); } else Audio8.sfx('bump');
      }
    },
    draw() {
      drawParallax('sky', t * 0.3);
      txt(done ? 'YOU SAVED WALLY ISLAND!' : 'NEW HIGH SCORE!', 128, 12, '#ffe040', { align: 'center', outline: '#101848' });
      txt('SCORE ' + pad(score, 7), 128, 26, '#fff', { align: 'center', outline: '#101848' });
      drawWindow(48, 40, 160, 24);
      const shown = name + ((t >> 4) % 2 === 0 && name.length < 8 ? '_' : '');
      txt('NAME: ' + shown, 58, 49, '#5ff0ff');
      drawWindow(28, 70, 200, 110);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
        const ch = GRID[r][c], X = 44 + c * 17, Y = 82 + r * 18, on = r === cy && c === cx;
        if (on) { ctx.fillStyle = '#ffe040'; ctx.fillRect(X - 4, Y - 4, 13, 15); ctx.fillStyle = '#101848'; ctx.fillRect(X - 3, Y - 3, 11, 13); }
        txt(ch === ' ' ? '_' : ch, X, Y, on ? '#ffe040' : '#fff');
      }
      [['DEL', 0], ['END', 1]].forEach(([lbl, k]) => {
        const X = 62 + k * 86, Y = 158, on = cy === 4 && (k === 0 ? cx < 5 : cx >= 5);
        if (on) { ctx.fillStyle = '#ffe040'; ctx.fillRect(X - 5, Y - 4, 31, 15); ctx.fillStyle = '#101848'; ctx.fillRect(X - 4, Y - 3, 29, 13); }
        txt(lbl, X, Y, on ? '#ffe040' : '#fff');
      });
      txt('A: PICK  B: DELETE  START: DONE', 128, 190, '#fff', { align: 'center', outline: '#101848' });
      txt('OR JUST TYPE YOUR NAME', 128, 202, '#d8f0ff', { align: 'center', outline: '#101848' });
    },
  };
}

// =====================================================================
// The platforming!
// =====================================================================
// Tight timer, in real seconds: about 1.8x the time it takes to simply walk to the
// end of the level, plus extra for the boss arena.
function levelTime(def) {
  if (def.autoscroll) return Math.ceil(((def.width * TS - VW) / def.autoscroll / 60 + 15) / 5) * 5 + (def.boss ? 60 : 0);
  return Math.ceil(((def.width * TS) / 1.6 / 60) * 1.8 / 5) * 5 + (def.boss ? 45 : 0) + (def.yetiArena || def.miniArena ? 35 : 0) + (def.lowGrav ? 20 : 0) + (def.water ? 20 : 0) + (def.custom ? 30 : 0);
}

class Play {
  constructor(li, fromCheckpoint, opts = {}) {
    this.ta = !!opts.ta; this.rush = !!opts.rush; this.endless = !!opts.endless; this.daily = opts.daily || null; this.taT = 0; this.ghostRec = []; this.ghost = this.ta ? ghostLoad(li) : null; this.taReady = this.ta ? 80 : 0;
    this.li = li; this.lv = buildLevel(li); this.def = this.lv.def;
    this.T = Sprites.tiles[this.def.theme];
    this.ents = []; this.parts = []; this.pings = []; this.balls = []; this.bats = []; this.fires = []; this.platforms = []; this.bumps = [];
    this.state = 'play'; this.stateT = 0; this.paused = false; this.diff = this.ta || this.rush || this.daily || this.endless ? 'normal' : Settings.get('difficulty'); this.timeMul = DIFF[this.diff].time; this.time = Math.ceil((levelTime(this.def) * this.timeMul) / 5) * 5; this.timeTick = 0; this.tookHit = false; this.bossHit = false;
    this.cpHit = !!fromCheckpoint && !!this.lv.checkpoint; this.bossLock = false; this.camMin = 0; this.shake = 0;
    const s = this.cpHit ? this.lv.checkpoint : this.lv.start;
    this.p = { x: s.x * TS + 3, y: (s.y + 1) * TS - 22, w: 10, h: 22, vx: 0, vy: 0, face: 1, onGround: false, hearts: 2, power: 'none', inv: 0, anim: 0, jumpBuf: 0, coyote: 0, prevBottom: 0, platform: null, sx: 1, sy: 1, hurtT: 0, trail: [], ammo: 3, special: 3, spCool: 0, charge: 0, boots: false, dj: false, riding: false, chompT: 0, pound: 0, flutter: 0 };
    this.p.hearts = DIFF[this.diff].hearts;
    this.night = !this.ta && !this.rush && !this.daily && !this.endless && li < 90 && typeof isNight === 'function' && isNight();
    if (this.night) { // ghosts come out at night
      for (const f of [0.3, 0.55, 0.8]) this.lv.spawns.push({ t: 'e', x: Math.floor(this.lv.w * f), y: 6 });
      this.lv.spawns.sort((a, b2) => a.x - b2.x);
    }
    this.medalsGot = 0; this.barsGot = 0; this.pauseSel = 0; if (!game.bars) game.bars = Array(140).fill(0);
    if (game.bonusAmmo) { this.p.ammo = Math.min(9, 3 + game.bonusAmmo); game.bonusAmmo = 0; }
    if (game.startHearts) { this.p.hearts = 3; game.startHearts = 0; }
    if (game.startBoots) { this.p.boots = true; game.startBoots = false; }
    Save.persist();
    this.cam = { x: clamp(this.p.x - 100, 0, this.lv.w * TS - VW) };
    this.spawnIdx = 0;
    while (this.spawnIdx < this.lv.spawns.length && this.lv.spawns[this.spawnIdx].x * TS < this.p.x - 140) {
      const sp = this.lv.spawns[this.spawnIdx++];
      if (sp.t === 'C') this.spawn(sp);
    }
  }
  enter() { Audio8.play(this.def.music); }
  tile(tx, ty) { if (ty < 0 || ty >= 14) return '.'; if (tx < 0 || tx >= this.lv.w) return 'X'; return this.lv.grid[ty][tx]; }
  setTile(tx, ty, c) { if (ty >= 0 && ty < 14 && tx >= 0 && tx < this.lv.w) this.lv.grid[ty][tx] = c; }

  // ---------- physics ----------
  move(b, withPlatforms) {
    b.hitWall = 0;
    if (b.vx) {
      b.x += b.vx;
      const y0 = Math.floor(b.y / TS), y1 = Math.floor((b.y + b.h - 0.01) / TS);
      if (b.vx > 0) {
        const tx = Math.floor((b.x + b.w - 0.01) / TS);
        for (let ty = y0; ty <= y1; ty++) if (SOLID.has(this.tile(tx, ty))) { b.x = tx * TS - b.w; b.hitWall = 1; break; }
      } else {
        const tx = Math.floor(b.x / TS);
        for (let ty = y0; ty <= y1; ty++) if (SOLID.has(this.tile(tx, ty))) { b.x = (tx + 1) * TS; b.hitWall = -1; break; }
      }
    }
    const pb = b.y + b.h;
    b.y += b.vy; b.onGround = false; b.ceil = null; b.groundTile = null; b.platform = null;
    const x0 = Math.floor(b.x / TS), x1 = Math.floor((b.x + b.w - 0.01) / TS);
    if (b.vy >= 0) {
      const ty = Math.floor((b.y + b.h) / TS);
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tile(tx, ty);
        if (SOLID.has(c) || (c === '=' && pb <= ty * TS + 0.5)) { b.y = ty * TS - b.h; b.vy = 0; b.onGround = true; b.groundTile = c; break; }
      }
      if (withPlatforms) for (const p of this.platforms) {
        if (pb <= p.y + 0.5 && b.y + b.h >= p.y && b.x + b.w > p.x && b.x < p.x + p.w) { b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.platform = p; }
      }
    } else {
      const ty = Math.floor(b.y / TS);
      let best = null, bd = 1e9;
      for (let tx = x0; tx <= x1; tx++) if (SOLID.has(this.tile(tx, ty)) || (b === this.p && this.tile(tx, ty) === 'I')) { const d = Math.abs(tx * TS + 8 - (b.x + b.w / 2)); if (d < bd) { bd = d; best = tx; } }
      if (best !== null) { b.y = (ty + 1) * TS; b.vy = 0; b.ceil = { tx: best, ty }; }
    }
  }
  groundAhead(e) {
    const fx = e.vx > 0 ? e.x + e.w + 1 : e.x - 1, ty = Math.floor((e.y + e.h + 2) / TS), c = this.tile(Math.floor(fx / TS), ty);
    return SOLID.has(c) || c === '=';
  }

  // ---------- spawning ----------
  spawn(sp) {
    const x = sp.x * TS, y = sp.y * TS;
    const toward = this.p.x < x ? -1 : 1;
    const E = (o) => {
      const e = Object.assign({ t: 0, alive: true, vx: 0, vy: 0, enemy: false }, o);
      if (e.enemy && e.vx) e.vx *= DIFF[this.diff].speed * (this.speedMul || 1);
      if ((e.boss || e.yeti) && this.diff === 'hard') { e.hp++; e.maxHp++; }
      if ((e.boss || e.yeti) && this.diff === 'easy' && e.hp > 2) { e.hp--; e.maxHp--; }
      this.ents.push(e); return e;
    };
    switch (sp.t) {
      case 'g': E({ type: 'grumble', x: x + 1, y: y + 2, w: 14, h: 14, vx: 0.5 * toward, enemy: true, stomp: true }); break;
      case 'p': E({ type: 'prickle', x: x + 1, y: y + 2, w: 14, h: 14, vx: 0.4 * toward, enemy: true, stomp: false }); break;
      case 'z': E({ type: 'buzzer', x: x + 1, y: y + 2, w: 14, h: 12, vx: 0.6 * toward, ox: x, oy: y, enemy: true, stomp: true, fly: true }); break;
      case 'h': E({ type: 'hopper', x: x + 1, y: y + 2, w: 14, h: 14, wait: 60, enemy: true, stomp: true }); break;
      case 'm': case 'n': this.platforms.push({ x, y, w: 48, h: 8, ox: x, oy: y, axis: sp.t === 'm' ? 'x' : 'y', t: 0, dx: 0, dy: 0 }); break;
      case 'C': E({ type: 'checkpoint', x: x + 4, y: y - 16, w: 8, h: 32, on: this.cpHit }); break;
      case 'b': E({ type: 'bat', x: x + 1, y, w: 14, h: 10, oy: y, enemy: true, stomp: true, state: 'hang' }); break;
      case 'c': E({ type: 'charger', x: x + 1, y: y + 2, w: 14, h: 14, vx: 0.4 * toward, enemy: true, stomp: true, charge: 0 }); break;
      case 't': E({ type: 'turret', x: x + 1, y: y + 2, w: 14, h: 14, enemy: true, stomp: true, cool: 90, face: toward }); break;
      case 'u': E({ type: 'ufo', x, y: -24, w: 28, h: 12, enemy: true, stomp: true, state: 'enter', shots: 0, timer: 0, beamX: 0, beamEnd: 0 }); break;
      case 'M': E({ type: 'medal', item: true, x: x + 2, y: y + 1, w: 12, h: 14, rise: 0, id: sp.id, got: !!(game.medals[this.li] & (1 << sp.id)) }); break;
      case 'x': E({ type: 'sigbar', item: true, x: x + 2, y: y + 1, w: 12, h: 14, rise: 0, id: sp.id, got: !!((game.bars[this.li] | 0) & (1 << sp.id)) }); break;
      case 's': E({ type: 'orb', item: true, x: x + 2, y: y + 1, w: 12, h: 14, rise: 0, oy: y + 1 }); break;
      case 'a': E({ type: 'ammo', item: true, x: x + 2, y: y + 2, w: 12, h: 14, rise: 0 }); break;
      case 'f': E({ type: 'fish', x: x + 1, y: y + 3, w: 14, h: 10, vx: 0.8 * toward, oy: y + 3, ox: x, enemy: true, stomp: true }); break;
      case 'j': E({ type: 'jelly', x: x + 1, y, w: 14, h: 12, oy: y, enemy: true, stomp: false }); break;
      case 'e': E({ type: 'ghost', x: x + 1, y, w: 14, h: 12, enemy: true, stomp: true, oy: y, ghostOff: false }); break;
      case 'q': E({ type: 'crab', x: x - 8, y: y - 6, w: 34, h: 20, hp: 3, maxHp: 3, inv: 0, enemy: true, yeti: true, mini: 'KING KRABBY', state: 'walk', act: 80 }); break;
      case 'w': E({ type: 'mole', x, y: y - 4, w: 24, h: 20, hp: 3, maxHp: 3, inv: 0, enemy: true, yeti: true, mini: 'DRILL MOLE', state: 'idle', act: 60 }); break;
      case 'v': E({ type: 'dragon', x, y, w: 28, h: 16, hp: 4, maxHp: 4, inv: 0, enemy: true, yeti: true, mini: 'NIMBUS', state: 'idle', act: 120, trail: [] }); break;
      case 'y': E({ type: 'yeti', x, y: y - 14, w: 28, h: 30, hp: 3, maxHp: 3, inv: 0, enemy: true, yeti: true, state: 'walk', act: 90 }); break;
      case 'k': E({ type: 'boss', kind: 'mother', x: x - 24, y: 30, oy: 30, w: 56, h: 18, hp: this.def.bossHp || 6, maxHp: this.def.bossHp || 6, inv: 0, enemy: true, boss: true, act: 120, beamX: 0, beamEnd: 0 }); break;
      case 'Z': E({ type: 'secret', x, y: y - 8, w: 16, h: 24, to: this.def.secret.to }); break;
      case 'l': E({ type: 'blob', hazard: true, x: x + 3, y: y + 4, oy: y + 4, w: 10, h: 10, act: 40 + ((x * 7) % 60) }); break;
      case 'G': E({ type: 'goal', x: x + 2, y: y - 80, w: 12, h: 96 }); break;
      case 'K': E({ type: 'boss', x, y: y - 14, w: 28, h: 30, hp: this.def.bossHp || 3, maxHp: this.def.bossHp || 3, inv: 0, jumpT: 120, enemy: true, boss: true }); break;
    }
  }

  // ---------- events ----------
  addScore(n, x, y) { game.score += n; if (x !== undefined) this.parts.push({ k: 'text', s: String(n), x, y, vy: -0.6, life: 50 }); }
  addCoin() { Ach.add('coins'); game.coins += this.night ? 2 : 1; game.score += this.night ? 40 : 20; if (game.coins >= 100) { game.coins -= 100; game.lives++; Audio8.sfx('oneup'); } else Audio8.sfx('coin'); }
  hitBlock(tx, ty) {
    const c = this.tile(tx, ty);
    const bx = tx * TS, by = ty * TS;
    for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss && overlap(e, { x: bx, y: by - 6, w: 16, h: 6 })) this.flipKill(e);
    if (c === 'I') {
      this.setTile(tx, ty, 'U'); this.bumps.push({ tx, ty, t: 0 }); Audio8.sfx('secret'); Ach.unlock('secretblock'); Sticker.add('secretblock');
      this.ents.push({ type: 'shroom', item: true, alive: true, x: bx + 2, y: by, w: 12, h: 14, vx: 0, vy: 0, rise: 16, t: 0 });
      this.parts.push({ k: 'text', s: 'SECRET!', x: bx - 8, y: by - 16, vy: -0.5, life: 60 });
      return;
    }
    if ('WPSOAVQDNTEH'.includes(c)) {
      this.setTile(tx, ty, 'U'); this.bumps.push({ tx, ty, t: 0 });
      if (c === 'W') { this.addCoin(); this.parts.push({ k: 'coinpop', x: bx + 4, y: by - 14, vy: -4, life: 26 }); } else {
        Audio8.sfx('sprout');
        const type = { P: 'drink', S: 'phone', A: 'ammo', V: 'battery', Q: 'boots', O: 'badge', D: 'dino', N: 'magnet', T: 'shrink', E: 'shield', H: 'hook' }[c];
        if (type === 'dino') this.ents.push({ type, item: true, alive: true, x: bx, y: by, w: 16, h: 20, vx: 0, vy: 0, rise: 20, t: 0, cool: 0, state: 'wait', kind: this.def.dino || 'teal' });
        else this.ents.push({ type, item: true, alive: true, x: bx + 2, y: by, w: 12, h: 14, vx: 0, vy: 0, rise: 16, t: 0 });
      }
    } else if (c === 'B') {
      this.setTile(tx, ty, '.'); Audio8.sfx('brick'); this.addScore(50);
      for (const [dx, dy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: bx + dx, y: by + dy, vx, vy, g: 0.3, life: 70 });
    } else { Audio8.sfx('bump'); }
  }
  mount(e) {
    Ach.unlock('dino');
    const p = this, pl = this.p, bottom = pl.y + pl.h;
    e.alive = false;
    if (pl.tiny) { pl.tiny = 0; pl.w = 10; pl.h = 22; }
    pl.riding = true; pl.dinoKind = e.kind || 'teal'; pl.flyT = 0; pl.x += (pl.w - 12) / 2; pl.w = 12; pl.h = 32; pl.y = bottom - 32; pl.vy = Math.min(pl.vy, 0);
    Audio8.sfx('dino'); p.parts.push({ k: 'text', s: { red: 'FIRE DINO!', blue: 'SKY DINO!', ice: 'ICE DINO!' }[pl.dinoKind] || 'DINO!', x: pl.x - 16, y: pl.y - 10, vy: -0.5, life: 50 });
  }
  dismount(knocked) {
    const p = this.p, bottom = p.y + p.h, cx = p.x + p.w / 2;
    p.riding = false; p.w = 10; p.h = 22; p.x = cx - 5; p.y = bottom - 22;
    const flee = knocked ? (p.face > 0 ? -2.4 : 2.4) : 0;
    this.ents.push({ type: 'dino', item: true, alive: true, x: cx - 8, y: bottom - 20, w: 16, h: 20, vx: flee, vy: knocked ? -3 : 0, rise: 0, t: 0, cool: knocked ? 70 : 40, state: knocked ? 'flee' : 'wait', face: p.face, kind: p.dinoKind || 'teal' });
    if (knocked) { p.inv = 90; p.vy = -4; Audio8.sfx('dinocry'); } else { p.vy = -5.5; Audio8.sfx('jump'); }
  }
  chomp() {
    const p = this.p;
    p.chompT = 16; Audio8.sfx('chomp');
    const box = { x: p.face > 0 ? p.x + p.w - 2 : p.x - 28, y: p.y + 8, w: 30, h: p.h - 8 };
    for (const e of this.ents) {
      if (!e.enemy || !e.alive || e.dying || !overlap(box, e)) continue;
      if (e.boss) this.damageBoss(e); else this.flipKill(e);
    }
    for (let ty = Math.floor(box.y / TS); ty <= Math.floor((box.y + box.h - 1) / TS); ty++) {
      for (let tx = Math.floor(box.x / TS); tx <= Math.floor((box.x + box.w - 1) / TS); tx++) {
        if (this.tile(tx, ty) !== 'B' && this.tile(tx, ty) !== 'R') continue;
        if (this.tile(tx, ty) === 'R') this.crackReward(tx, ty);
        this.setTile(tx, ty, '.'); Audio8.sfx('brick'); this.addScore(50);
        for (const [ox, oy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: tx * TS + ox, y: ty * TS + oy, vx, vy, g: 0.3, life: 70 });
      }
    }
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.parts.push({ k: 'dust', x: x + (i - (n - 1) / 2) * 5, y: y - 2, vx: (i - (n - 1) / 2) * 0.35, vy: -0.25, life: 18 });
  }
  playerPose() {
    const p = this.p;
    if (p.hurtT > 0) return 'hurt';
    if (p.shockT > 12) return 'win0';
    if (p.fire > 2 && p.onGround) return 'throw';
    if (this.state === 'clear' && Math.abs(p.vx) < 0.2 && p.onGround) return 'win' + ((frame >> 4) & 1);
    if (this.state === 'bossdead' && p.onGround && Math.abs(p.vx) < 0.2) return 'win' + ((frame >> 4) & 1);
    if (!p.onGround) return p.vy < 0 ? 'jump' : 'fall';
    if (p.crouch || p.pound) return 'crouch';
    if (p.skid) return 'skid';
    if (Math.abs(p.vx) > 0.15) return (Math.abs(p.vx) > 2.2 ? 'run' : 'walk') + (Math.floor(p.anim) % 8);
    return 'idle' + ((frame >> 4) % 4);
  }
  crackReward(tx, ty) {
    Ach.unlock('cracker'); Sticker.add('cracker'); this.addCoin();
    this.parts.push({ k: 'coinpop', x: tx * TS + 4, y: ty * TS - 6, vy: -4, life: 26 });
  }
  flipKill(e) {
    if (e.ghostOff) return;
    if (e.yeti) { this.damageYeti(e); return; }
    e.dying = 'flip'; e.vy = -3.5; e.vx = this.p.x < e.x ? 0.8 : -0.8; Sticker.add(e.type);
    if (e.type === 'ufo') Ach.add('ufos');
    if (e.type === 'ghost') Ach.unlock('ghost');
    if (e.type === 'ufo') { Audio8.sfx('boom'); this.parts.push({ k: 'blast', x: e.x + 14, y: e.y + 6, life: 24 }); this.addScore(1000, e.x, e.y); } else { Audio8.sfx('kick'); this.addScore(200, e.x, e.y); }
  }
  stomp(e) {
    const p = this.p;
    p.vy = Input.down('jump') ? -6.2 : -3.8; p.y = e.y - p.h - 0.1;
    Audio8.sfx('stomp'); this.addScore(100, e.x, e.y - 8);
    this.parts.push({ k: 'star', x: e.x + 7, y: e.y + 4, life: 12 });
    if (e.type === 'grumble') { e.dying = 'squish'; e.dt = 30; Sticker.add('grumble'); } else this.flipKill(e);
  }
  hurt(spike) {
    const p = this.p;
    if (p.inv > 0 || p.charge > 0 || this.state !== 'play') return;
    this.tookHit = true; if (this.bossLock || this.arena) this.bossHit = true;
    if (p.riding) { this.dismount(true); return; }
    if (p.shield) { p.shield = false; p.inv = 90; Audio8.sfx('pop' in Audio8 ? 'pop' : 'bump'); rumble(0.4, 120); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; this.parts.push({ k: 'dust', x: p.x + p.w / 2 + Math.cos(a) * 12, y: p.y + p.h / 2 + Math.sin(a) * 12, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, life: 20 }); } this.parts.push({ k: 'text', s: 'POP!', x: p.x - 4, y: p.y - 12, vy: -0.5, life: 40 }); return; }
    if (p.tiny) this.setTiny(false);
    p.hearts--;
    if (p.hearts <= 0) { this.die(); return; }
    p.inv = 120; p.hurtT = 24; p.power = 'none'; p.boots = false; Audio8.sfx('hurt'); rumble(0.6, 180);
    if (spike) p.vy = -5;
  }
  warpOut() {
    const to = this.def.warp.to;
    if (this.ta || this.def.custom || this.rush || this.daily) { this.clear(); return; }
    for (let k = this.li; k < to; k++) game.cleared[k] = true;
    game.medals[this.li] |= this.medalsGot; game.bars[this.li] |= this.barsGot;
    setNode(to - 1); Save.persist(); this.state = 'done';
    go(() => MessageScene(['WARP PIPE!', '', 'WHOOSH... SKIPPING AHEAD', 'TO ' + LEVELS[to].name + '!'], () => IntroScene(to, false)));
  }
  die() {
    if (this._p2ctx) { this.p2Down(); return; }
    if (this.state === 'dying') return;
    this.state = 'dying'; this.stateT = 0; this.p.hearts = 0; rumble(1, 400);
    Audio8.play('die');
  }
  clear(secretTo) {
    if (this.state !== 'play') return;
    this.state = 'clear'; this.stateT = 0; Audio8.play('clear'); this.secretTo = secretTo; this.clearTime = this.time;
    this.awardStars();
    if (secretTo !== undefined) { Audio8.sfx('secret'); Sticker.add('secretexit'); }
    this.parts.push({ k: 'text', s: secretTo !== undefined ? 'SECRET EXIT!' : 'COURSE CLEAR!', x: this.p.x - 30, y: this.p.y - 30, vy: -0.2, life: 100 });
  }

  // Stars: finish with 40% of the time left, have all 5 medals, take no hits
  awardStars() {
    if (this.ta || this.def.custom) return;
    const full = levelTime(this.def) * this.timeMul, li = this.li;
    let bits = 0;
    if ((this.clearTime || 0) >= full * 0.4) bits |= 1;
    if (((game.medals[li] | this.medalsGot) & 31) === 31) bits |= 2;
    if (!this.tookHit) bits |= 4;
    this.runStars = bits; game.stars[li] |= bits;
    if (li === 0) Ach.unlock('first');
    if ((this.clearTime || 0) >= full * 0.5) Ach.unlock('speed');
    if (game.stars[li] === 7) Ach.unlock('three');
    if (this.diff === 'hard') Ach.unlock('hard');
    if (this.secretTo !== undefined) Ach.unlock('secret');
    const done = (i) => game.cleared[i] || i === li;
    if (done(8) && done(9) && done(10)) Ach.unlock('bonus');
  }
  drawStars() {
    const s = this.state, t = this.stateT;
    if (this.ta || !((s === 'clear' && t > 60) || (s === 'bossdead' && t > 130) || s === 'done') || this.runStars === undefined) return;
    drawWindow(40, 64, 176, 52);
    txt('STARS', 128, 70, '#ffe040', { align: 'center' });
    ['TIME', 'MEDALS', 'NO HIT'].forEach((l, k) => {
      const x = 74 + k * 54, on = this.runStars & (1 << k), pop = on && t < 140 + k * 15 ? 1 : 2;
      txt('#', x, 82, on ? '#ffe040' : '#4a4a6a', { scale: pop, align: 'center', outline: on ? '#7a4a08' : '#1a1020' });
      txt(l, x, 102, on ? '#fff' : '#7880b0', { align: 'center' });
    });
  }

  // ---------- update ----------
  update() {
    if (this.talk) { this.updateTalk(); return; }
    if (Input.pressed('start') && (this.state === 'play')) { this.paused = !this.paused; this.pauseSel = 0; Audio8.sfx('pause'); return; }
    if (this.paused) {
      if (Input.pressed('down')) { this.pauseSel = (this.pauseSel + 1) % 8; Audio8.sfx('select'); }
      if (Input.pressed('up')) { this.pauseSel = (this.pauseSel + 7) % 8; Audio8.sfx('select'); }
      if (Input.pressed('jump') && this.pauseSel === 3) { this.paused = false; this.photo = { x: 128, y: 112, sticker: 0, frame: 0, items: [] }; Audio8.sfx('confirm'); return; }
      if (this.pauseSel === 1 || this.pauseSel === 2) {
        const kind = this.pauseSel === 1 ? 'music' : 'sfx', d = (Input.pressed('right') ? 0.2 : 0) - (Input.pressed('left') ? 0.2 : 0);
        if (d) { Audio8.setVolume(kind, Audio8.getVolume(kind) + d); Audio8.sfx('coin'); }
      }
      if (Input.pressed('back') || (Input.pressed('jump') && this.pauseSel === 0)) { this.paused = false; Audio8.sfx('pause'); }
      if (Input.pressed('jump') && (this.pauseSel === 4 || this.pauseSel === 5)) { this.restartLevel(this.pauseSel === 5); return; }
      if (Input.pressed('jump') && this.pauseSel === 7) { this.paused = false; this.state = 'done'; Save.persist(); Audio8.sfx('confirm'); go(() => TitleScene()); return; }
      if (Input.pressed('jump') && this.pauseSel === 6) { this.paused = false; Save.persist(); const li = this.li; go(() => (this.endless ? EndlessIntro() : this.rush ? ChallengeScene(1) : this.daily ? DailyScene() : this.def.custom ? LevelMakerScene(Maker.state) : this.ta ? TimeAttackSelect(li) : nextTurn(() => MapScene()))); }
      return;
    }
    if (this.state === 'play') { if (this.rush) RUSH.frames++; else if (!this.ta && !this.daily && !this.def.custom) game.playTime = (game.playTime || 0) + 1; }
    if (this.rushT && --this.rushT === 0) { rushNext(this); return; }
    if (this.taReady > 0) { this.taReady--; if (this.taReady === 70 || this.taReady === 0) Audio8.sfx(this.taReady ? 'select' : 'confirm'); return; }
    if (this.ta && this.state === 'play') {
      if ((this.taT & 1) === 0 && this.ghostRec.length < 20000) { const p = this.p; this.ghostRec.push([Math.round(p.x), Math.round(p.y), p.riding ? 'ride' : this.playerPose(), p.skid ? -p.face : p.face]); }
      this.taT++;
    }
    this.stateT++;
    if (this.freezeT > 0 && this.state === 'play') this.freezeT--;
    if (this.shake > 0) this.shake--;
    if (this.state === 'dying') return this.updateDying();
    const p = this.p;

    // moving platforms carry the player
    for (const pl of this.platforms) {
      pl.t++;
      const nx = pl.axis === 'x' ? pl.ox + Math.sin(pl.t * 0.02) * 40 : pl.ox;
      const ny = pl.axis === 'y' ? pl.oy + Math.sin(pl.t * 0.025) * 40 : pl.oy;
      pl.dx = nx - pl.x; pl.dy = ny - pl.y; pl.x = nx; pl.y = ny;
      if (p.platform === pl) { p.x += pl.dx; p.y += pl.dy; }
    }

    if (this.state === 'play' || this.state === 'clear' || this.state === 'bossdead') this.updatePlayer();

    // spawn as the camera approaches
    while (this.spawnIdx < this.lv.spawns.length && this.lv.spawns[this.spawnIdx].x * TS < this.cam.x + VW + 24) this.spawn(this.lv.spawns[this.spawnIdx++]);

    for (const e of this.ents) if (e.alive) this.updateEnt(e);
    this.ents = this.ents.filter((e) => e.alive);
    this.updatePings();
    this.updateBalls();
    this.updateFires();
    this.updateBats();
    for (const q of this.parts) { q.life--; if (q.vx) q.x += q.vx; if (q.vy) q.y += q.vy; if (q.g) q.vy += q.g; if (q.k === 'coinpop') q.vy += 0.3; }
    this.parts = this.parts.filter((q) => q.life > 0);
    for (const b of this.bumps) b.t++;
    this.bumps = this.bumps.filter((b) => b.t < 10);

    // camera
    const camMax = this.camMax !== undefined && this.camMax !== null ? this.camMax : this.lv.w * TS - VW;
    if (this.def.autoscroll && !this.bossLock && (this.state === 'play' || this.state === 'clear')) {
      this.cam.x = Math.min(this.cam.x + this.def.autoscroll, camMax);
      if (p.x < this.cam.x) { // pushed along by the screen edge; squashed against a wall = lose a life
        p.x = this.cam.x; if (p.vx < 0) p.vx = 0;
        if (this.state === 'play' && this.solidOverlap(p)) this.die();
      }
      if (p.x + p.w > this.cam.x + VW) p.x = this.cam.x + VW - p.w;
    } else {
      const target = p.x + p.w / 2 - VW / 2 + p.face * 16;
      this.cam.x += (target - this.cam.x) * 0.1;
      this.cam.x = clamp(this.cam.x, this.camMin, camMax);
    }
    if (this.arena) { if (p.x < this.arena.min) { p.x = this.arena.min; if (p.vx < 0) p.vx = 0; } if (p.x + p.w > this.arena.max) { p.x = this.arena.max - p.w; if (p.vx > 0) p.vx = 0; } }

    // boss arena lock
    if (this.def.boss && !this.bossLock && p.x > (this.lv.w - 16) * TS + 24) {
      this.bossLock = true; this.camMin = (this.lv.w - 16) * TS; Audio8.play('boss');
      this.startTalk(this.def.talk || (this.def.final ? 'final' : this.li === 14 ? 'mk2' : this.def.bossName === 'MOTHERSHIP' ? 'mother' : 'baron'));
    }

    // timer
    if (!this.ta && !this.rush && !this.endless && this.state === 'play' && ++this.timeTick >= 60) {
      this.timeTick = 0; this.time--;
      if (this.time === 20) { this.parts.push({ k: 'text', s: 'HURRY UP!', x: this.cam.x + 100, y: 100, vy: 0, life: 120, fixed: true }); Audio8.sfx('pause'); }
      if (this.time <= 10 && this.time > 0) Audio8.sfx('tick');
      if (this.time <= 0) { this.time = 0; this.die(); }
    }
    if (this.state === 'clear') this.updateClear();
    if (this.state === 'bossdead') {
      if (this.stateT % 8 === 0 && this.stateT < 100) { Audio8.sfx('boom'); this.parts.push({ k: 'boom', x: this.bossX + Math.random() * 32, y: this.bossY + Math.random() * 32, life: 20 }); }
      if (this.stateT === 110) Audio8.play('clear');
      if (this.rush) { if (this.stateT === 140) rushNext(this); return; }
      if (this.def.custom) { if (this.stateT === 200) go(() => LevelMakerScene(Maker.state)); return; }
      if (this.stateT > 300 && this.ta) { this.state = 'done'; const li = this.li, f = this.taT; const rec = this.ghostRec; go(() => TAResultScene(li, f, rec)); } else if (this.stateT > 300) {
        game.cleared[this.li] = true; game.medals[this.li] |= this.medalsGot; game.bars[this.li] |= this.barsGot; setNode(this.li); Save.persist(); this.state = 'done';
        if (this.def.final) go(() => EndingScene());
        else if (this.def.bossMsg) go(() => MessageScene(this.def.bossMsg, () => nextTurn(() => MapScene())));
        else go(() => MessageScene(['BARON STATIC IS BEATEN...', 'BUT HE ESCAPED!', '', 'HE FLED NORTH ACROSS', 'WALLY ISLAND TO HIS', 'STATIC TOWER.', '', 'AFTER HIM, WALLYMAN!'], () => nextTurn(() => MapScene())));
      }
    }
  }
  setTiny(on) {
    const p = this.p, bottom = p.y + p.h, cx = p.x + p.w / 2;
    if (on) { p.tiny = 900; p.w = 8; p.h = 12; Audio8.sfx('shrink' in Audio8 ? 'shrink' : 'swoop'); } else {
      // only grow back when there is room overhead
      const tx0 = Math.floor((cx - 5) / TS), tx1 = Math.floor((cx + 4) / TS), ty = Math.floor((bottom - 22) / TS);
      for (let tx = tx0; tx <= tx1; tx++) if (SOLID.has(this.tile(tx, ty))) { p.tiny = 2; return; }
      p.tiny = 0; p.w = 10; p.h = 22; Audio8.sfx('sprout');
    }
    p.x = cx - p.w / 2; p.y = bottom - p.h;
  }
  updatePlayer() {
    const p = this.p, auto = this.state === 'clear';
    if (p.inv > 0) p.inv--;
    if (p.tiny > 0 && --p.tiny === 0) this.setTiny(false);
    if (p.magnet > 0) { // pull in coins and items
      p.magnet--;
      const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, tx0 = Math.floor((pcx - 64) / TS), ty0 = Math.floor((pcy - 64) / TS);
      for (let ty = ty0; ty <= ty0 + 8; ty++) for (let tx = tx0; tx <= tx0 + 8; tx++) if (this.tile(tx, ty) === 'o' && Math.hypot(tx * TS + 8 - pcx, ty * TS + 8 - pcy) < 64) { this.setTile(tx, ty, '.'); this.addCoin(); this.parts.push({ k: 'coinpop', x: tx * TS + 4, y: ty * TS, vy: -2, life: 14 }); }
      for (const e of this.ents) if (e.item && e.alive && e.rise <= 0 && ['ammo', 'medal', 'sigbar', 'orb', 'drink'].includes(e.type)) { const dx = pcx - (e.x + e.w / 2), dy = pcy - (e.y + e.h / 2), d = Math.hypot(dx, dy); if (d < 72 && d > 1) { e.x += (dx / d) * 2; e.y += (dy / d) * 2; } }
    }
    if (this.def.warp && this.state === 'play' && !p.warpT && p.onGround && !p.riding && Input.down('down') && this.tile(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h + 2) / TS)) === 'Y') {
      const tx = Math.floor((p.x + p.w / 2) / TS), left = this.tile(tx - 1, Math.floor((p.y + p.h + 2) / TS)) !== 'Y';
      p.warpT = 1; p.x = (left ? tx + 1 : tx) * TS - p.w / 2; p.vx = 0; Audio8.sfx('warp' in Audio8 ? 'warp' : 'swoop'); Sticker.add('warp'); rumble(0.3, 300);
    }
    if (p.warpT) {
      p.warpT++; p.y += 0.6; p.vx = 0; p.vy = 0;
      if (p.warpT === 60) this.warpOut();
      return;
    }
    const run = !auto && Input.down('run');
    const ice = this.def.ice && p.onGround;
    const water = !!this.def.water || '~░'.includes(this.tile(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h / 2) / TS))), frozen = p.frozen > 0;
    if (frozen) p.frozen--;
    const hid = heroOf(), goth = hid === 'goth' || hid === 'frost', doug = hid === 'doug', robo = hid === 'robo', wallUp = doug || !!(game.upgrades && game.upgrades.wall);
    const max = water ? (run ? 1.9 : 1.3) : run ? (goth ? 2.5 : doug ? 3.05 : 2.8) : goth ? 1.5 : 1.6, acc = (run ? 0.11 : 0.08) * (ice ? 0.45 : 1) * (water ? 0.7 : 1);
    let dir = auto ? (this.stateT > 30 ? 1 : 0) : frozen ? 0 : (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    if (!auto && !water && !frozen && !p.onGround && !p.pound && Input.pressed('down')) { p.pound = 12; p.vx = 0; p.boost = false; Audio8.sfx('swoop'); }
    if (p.pound) dir = 0;
    p.crouch = !auto && p.onGround && Input.down('down') && !dir;
    if (p.crouch) dir = 0;
    if (dir) {
      if (Math.sign(p.vx) === -dir && p.onGround) { p.vx += dir * (ice ? 0.06 : 0.2); p.skid = true; } else { p.vx += dir * acc; p.skid = false; }
      if (Math.abs(p.vx) > max) p.vx = approach(p.vx, dir * max, 0.12);
      p.face = dir;
    } else { p.vx = approach(p.vx, 0, p.onGround ? (ice ? 0.015 : 0.09) : 0.03); p.skid = false; }
    if (auto) p.vx = Math.min(p.vx, 1.2);

    if (!auto && !frozen && Input.pressed('jump')) p.jumpBuf = 6; else if (p.jumpBuf > 0) p.jumpBuf--;
    if (p.onGround) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
    if (p.riding && p.onGround && !auto && Input.down('down') && Input.pressed('jump')) { this.dismount(false); p.jumpBuf = 0; p.coyote = 0; }
    if (water) { // swimming: every press is a stroke
      if (p.jumpBuf === 6) { p.vy = -2.7; p.jumpBuf = 0; Audio8.sfx('swim'); this.parts.push({ k: 'bubble', x: p.x + p.w / 2, y: p.y + 4, vy: -0.6, life: 50 }); }
    } else if (wallUp && p.wallTouch && p.jumpBuf > 0 && !p.riding && !p.onGround) { // wall jump
      p.vy = -5.6; p.vx = -p.wallTouch * 2.6; p.face = -p.wallTouch; p.jumpBuf = 0; p.wallTouch = 0; Audio8.sfx('jump');
      this.dust(p.x + p.w / 2 - p.face * 6, p.y + p.h / 2, 2);
    } else if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -((p.riding ? 6.1 : goth ? 5.9 : doug ? 5.25 : 5.4) + Math.abs(p.vx) * 0.25) * (this.def.lowGrav ? 0.78 : 1); p.jumpBuf = 0; p.coyote = 0; Audio8.sfx('jump');
      p.sx = 0.8; p.sy = 1.2; this.dust(p.x + p.w / 2, p.y + p.h, 2);
    }
    if (p.onGround) p.dj = false;
    if (!auto && p.boots && !p.onGround && p.coyote === 0 && !p.dj && Input.pressed('jump')) {
      p.vy = -5.4; p.dj = true; p.jumpBuf = 0; Audio8.sfx('jump'); p.sx = 0.8; p.sy = 1.2;
      for (let i = 0; i < 4; i++) this.parts.push({ k: 'flame', x: p.x + p.w / 2 + (i - 1.5) * 3, y: p.y + p.h, vy: 1 + i * 0.2, life: 14 });
    }
    if (p.charge > 0) {
      p.charge--;
      if (frame % 5 === 0) this.parts.push({ k: 'spark', x: p.x - 4 + Math.random() * 14, y: p.y + Math.random() * 18, life: 10 });
      if (p.charge === 0 && this.state === 'play') Audio8.play(this.bossLock ? 'boss' : this.def.music);
    }
    if (p.vy >= 0) p.boost = false;
    const hold = (p.boost || (!auto && Input.down('jump'))) && p.vy < 0 && !p.flutter;
    p.windPush = (auto ? 0 : this.windNow() * (p.onGround ? 0.55 : 0.8)) + (p.onGround ? (p.groundTile === '>' ? 1.1 : p.groundTile === '<' ? -1.1 : 0) : 0); // gusts shove you along (without building up speed)
    const lowG = this.def.lowGrav ? 0.45 : 1;
    p.vy = water ? Math.min(1.4, p.vy + 0.09) : Math.min(this.def.lowGrav ? 3 : 5.5, p.vy + (hold ? 0.19 : 0.5) * lowG);
    // GothChick's glide: hold Jump while falling to drift down gently
    p.gliding = (goth || robo) && !water && !p.riding && !p.pound && !auto && !p.onGround && p.vy > 1.1 && Input.down('jump');
    // Doug: pushing into a wall in mid-air slides down it slowly
    { const sideX = dir > 0 ? p.x + p.w + 1 : p.x - 1; p.wallTouch = wallUp && dir && !p.onGround && !p.riding && !water && SOLID.has(this.tile(Math.floor(sideX / TS), Math.floor((p.y + p.h / 2) / TS))) ? dir : 0; }
    if (p.wallTouch && p.vy > 1.3) { p.vy = 1.3; if (frame % 6 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2 + p.wallTouch * 6, y: p.y + 6, vx: 0, vy: 0.4, life: 12 }); }
    if (p.gliding) { p.vy = 1.1; if (frame % 7 === 0) this.parts.push({ k: 'spark', x: p.x + p.w / 2 - p.face * 6, y: p.y + 6, life: 10 }); }
    if (water && frame % 50 === 0) this.parts.push({ k: 'bubble', x: p.x + p.w / 2 + p.face * 3, y: p.y + 4, vy: -0.5, life: 60 });
    if (p.onGround) p.flutter = 0;
    // Dino's flutter: hold jump while falling to hover for a moment
    p.fluttering = p.riding && p.dinoKind !== 'blue' && !p.pound && !auto && !p.onGround && Input.down('jump') && p.flutter < 50 && (p.flutter > 0 || p.vy > 0);
    if (p.onGround) p.flyT = 0;
    p.flying = p.riding && p.dinoKind === 'blue' && !p.pound && !auto && !p.onGround && Input.down('jump') && (p.flyT || 0) < 110 && p.vy > -1;
    if (p.flying) { p.flyT++; p.vy = Math.max(p.vy - 0.85, -2.3); if (p.flyT % 12 === 1) Audio8.sfx('flap'); }
    if (p.fluttering) { p.flutter++; p.vy = Math.min(p.vy, 0.5) - 0.35; if (p.flutter % 6 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2 - p.face * 8, y: p.y + p.h, vx: -p.face * 0.4, vy: 0.3, life: 14 }); }
    if (p.pound > 0) { p.pound--; p.vy = 0; p.vx = 0; if (p.pound === 0) p.pound = -1; } else if (p.pound === -1) { p.vy = 7; p.vx = 0; }

    // B: throw a rolling cannonball (or a Signal ping once the cannonballs run out)
    if (p.chompT > 0) p.chompT--;
    // SPECIAL attack (S button / C key): 3 uses, refilled by Special Orbs
    if (p.spCool > 0) p.spCool--;
    if (p.shockT > 0) p.shockT--;
    if (!auto && Input.pressed('special')) {
      if (p.special > 0 && !p.spCool) { p.special--; p.spCool = 30; if (hid === 'goth') this.batSwarm(); else if (doug || hid === 'frost') this.pauseFreeze(); else this.shockwave(); } else Audio8.sfx('tick');
    }
    if (p.riding) { if (!auto && Input.pressed('run') && p.chompT === 0) { if (p.dinoKind === 'red') this.dinoFire(); else if (p.dinoKind === 'ice') this.dinoFrost(); else this.chomp(); } } else if (!auto && Input.pressed('run') && !p.crouch) {
      if (p.ammo > 0 && this.balls.length < 2) {
        p.ammo--; p.fire = 10; Audio8.sfx('cannon');
        const lob = Input.down('up');
        this.balls.push({ x: p.x + p.w / 2 - 4 + (lob ? 0 : p.face * 8), y: p.y + (lob ? -6 : 6), w: 8, h: 8, vx: lob ? p.face * 0.35 + p.vx * 0.5 : p.face * 2.6 + p.vx * 0.4, vy: lob ? -9.6 : -1.6, fuse: 150, spin: 0 });
      } else if (p.power === 'signal' && this.pings.length < 2) {
        this.pings.push({ x: p.x + (p.face > 0 ? p.w : -8), y: p.y + 8, w: 8, h: 8, vx: p.face * 3.6, life: 55 });
        Audio8.sfx('ping'); p.fire = 8;
      } else if (p.ammo <= 0) Audio8.sfx('tick');
    }
    if (p.fire > 0) p.fire--;

    p.prevBottom = p.y + p.h;
    const wasGround = p.onGround, fallV = p.vy;
    p.vx += p.windPush || 0;
    this.move(p, true);
    p.vx -= p.windPush || 0;
    if (p.pound === -1 && p.onGround) {
      const ty = Math.floor((p.y + p.h) / TS), x0 = Math.floor(p.x / TS), x1 = Math.floor((p.x + p.w - 1) / TS);
      let broke = false;
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tile(tx, ty);
        if (c === 'R') this.crackReward(tx, ty);
        if (c === 'B' || c === 'R') { this.setTile(tx, ty, '.'); this.addScore(50); broke = true; for (const [ox, oy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: tx * TS + ox, y: ty * TS + oy, vx, vy, g: 0.3, life: 70 }); } else if ('WPSOAVQD'.includes(c)) this.hitBlock(tx, ty);
      }
      if (broke) { Audio8.sfx('brick'); p.onGround = false; } else {
        p.pound = 0; p.sx = 1.4; p.sy = 0.7; this.shake = 8; Audio8.sfx('bump'); Audio8.sfx('stomp'); this.dust(p.x + p.w / 2, p.y + p.h, 4);
        for (const e of this.ents) {
          if (!e.enemy || !e.alive || e.dying || e.boss || e.yeti || e.type === 'ufo') continue;
          if (Math.abs(e.y + e.h - (p.y + p.h)) < 6 && Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < 36) this.flipKill(e);
        }
      }
    } else if (p.onGround && !wasGround && fallV > 2) { p.sx = 1.25; p.sy = 0.8; this.dust(p.x + p.w / 2, p.y + p.h, 3); }
    if (p.onGround && p.skid && frame % 4 === 0) this.dust(p.x + p.w / 2 + p.face * 4, p.y + p.h, 1);
    if (p.onGround && Math.abs(p.vx) > 2.4 && frame % 9 === 0) this.dust(p.x + p.w / 2 - Math.sign(p.vx) * 5, p.y + p.h, 1);
    p.sx += (1 - p.sx) * 0.22; p.sy += (1 - p.sy) * 0.22;
    if (p.hurtT > 0) p.hurtT--;
    if (Math.abs(p.vx) > 2.5 && frame % 3 === 0 && !p.riding) { p.trail.unshift({ x: p.x, y: p.y, pose: this.playerPose(), face: p.face }); p.trail.length = Math.min(p.trail.length, 3); } else if (frame % 3 === 0) p.trail.pop();
    if (p.ceil) this.hitBlock(p.ceil.tx, p.ceil.ty);
    if (p.onGround && p.groundTile === 'J') {
      p.vy = Input.down('jump') ? -7.8 : -7.0; p.boost = true; p.onGround = false; p.sy = 1.3; p.sx = 0.75; Audio8.sfx('spring');
      this.bumps.push({ tx: Math.floor((p.x + p.w / 2) / TS), ty: Math.floor((p.y + p.h + 1) / TS), t: 0, spring: true });
    }
    if (p.x < this.camMin) { p.x = this.camMin; if (p.vx < 0) p.vx = 0; }
    if (water && p.y < 0) { p.y = 0; if (p.vy < 0) p.vy = 0; }
    if (this.bossLock && p.x + p.w > this.lv.w * TS) p.x = this.lv.w * TS - p.w;
    if (p.onGround && p.groundTile === '^') this.hurt(true);

    // tiles the player overlaps: coins & lava
    for (let ty = Math.floor(p.y / TS); ty <= Math.floor((p.y + p.h - 1) / TS); ty++) {
      for (let tx = Math.floor(p.x / TS); tx <= Math.floor((p.x + p.w - 1) / TS); tx++) {
        const c = this.tile(tx, ty);
        if (c === 'o') { this.setTile(tx, ty, '.'); this.addCoin(); this.parts.push({ k: 'spark', x: tx * TS + 4, y: ty * TS + 4, life: 10 }); } else if (c === 'L' && p.y + p.h > ty * TS + 5) this.die();
      }
    }
    if (p.y > VH + 24) this.die();
    if (p.onGround && Math.abs(p.vx) > 0.1) p.anim += Math.abs(p.vx) * 0.12;
    if (!p.onGround) p.anim = 0;
  }
  updateDying() {
    const p = this.p, t = this.stateT;
    if (t === 30) p.vy = -5.5;
    if (t > 30) { p.vy += 0.25; p.y += p.vy; }
    if (this.ta && t === 110) { const li = this.li; go(() => new Play(li, false, { ta: true })); return; }
    if (this.def.custom) { if (t === 110) go(() => LevelMakerScene(Maker.state)); return; }
    if (this.rush) { if (t === 110) go(() => RushResult(false)); return; }
    if (this.endless) { if (t === 110) { const d = Math.floor(this.cam.x / 16); go(() => EndlessResult(d)); } return; }
    if (this.daily) { if (t === 110) go(() => DailyResult(false, 0)); return; }
    if (t === 200 && !this.ta) {
      game.lives--; game.coins = 0; Save.persist();
      if (game.lives < 0) go(() => GameOverScene());
      else if (game.players === 2 && game.other && !game.other.out) go(() => nextTurn(() => MapScene()));
      else { const li = this.li, cp = this.cpHit; go(() => IntroScene(li, cp)); }
    }
  }
  updateClear() {
    const t = this.stateT;
    if (this.def.custom) { if (t === 150) go(() => LevelMakerScene(Maker.state)); return; }
    if (this.endless) { if (t === 90) { const d = Math.floor(this.cam.x / 16); go(() => EndlessResult(d)); } return; }
    if (this.daily) { if (t === 90) { const sc = game.score + Math.max(0, this.time) * 100; go(() => DailyResult(true, sc)); } return; }
    if (this.ta) { if (t === 1) this.split('end', this.taT); if (t === 90) { const li = this.li, f = this.taT; const rec = this.ghostRec, sp = this.splitRec; go(() => TAResultScene(li, f, rec, sp)); } return; }
    if (t > 120 && this.time > 0) {
      if (t % 3 === 0) { const d = Math.min(this.time, 1); this.time -= d; game.score += d * 100; }
      if (t % 4 === 0) Audio8.sfx('tick');
    }
    if (t === 420) {
      game.cleared[this.li] = true; game.medals[this.li] |= this.medalsGot; game.bars[this.li] |= this.barsGot; setNode(this.li);
      if (this.secretTo !== undefined) game.secrets[this.secretTo] = true;
      Save.persist();
      go(() => nextTurn(() => MapScene()));
    }
  }
  updatePings() {
    for (const g of this.pings) {
      g.x += g.vx; g.life--;
      if (SOLID.has(this.tile(Math.floor((g.x + 4) / TS), Math.floor((g.y + 4) / TS)))) g.life = 0;
      for (const e of this.ents) {
        if (!e.enemy || !e.alive || e.dying || !overlap(g, e)) continue;
        g.life = 0;
        if (e.boss) { Audio8.sfx('bump'); this.parts.push({ k: 'text', s: 'TINK', x: e.x, y: e.y - 6, vy: -0.5, life: 30 }); } else this.flipKill(e);
        break;
      }
    }
    this.pings = this.pings.filter((g) => g.life > 0 && g.x > this.cam.x - 16 && g.x < this.cam.x + VW + 16);
  }
  updateEnt(e) {
    e.t++;
    const p = this.p;
    if (e.x < this.cam.x - 200 || e.y > VH + 40) { if (e.enemy || e.item) e.alive = false; return; }
    if (e.x > this.cam.x + VW + 64 && !e.boss) return; // asleep until on screen
    if (e.dying === 'flip') { e.vy += 0.3; e.x += e.vx; e.y += e.vy; if (e.y > VH + 20) e.alive = false; return; }
    if (e.dying === 'squish') { if (--e.dt <= 0) e.alive = false; return; }
    if (e.iced) { this.updateIced(e); return; }
    if (this.freezeT > 0 && (e.enemy || e.hazard)) { // frozen by Doug: harmless, and anything can be stomped
      if (this.state === 'play' && e.enemy && overlap(p, e) && p.vy > 0 && p.prevBottom <= e.y + 10) {
        p.vy = Input.down('jump') ? -6.2 : -4;
        if (e.boss) this.damageBoss(e); else this.flipKill(e);
      }
      return;
    }

    switch (e.type) {
      case 'grumble': case 'prickle':
        e.vy = Math.min(5, e.vy + 0.3);
        if (e.type === 'prickle' && e.onGround && !this.groundAhead(e)) e.vx = -e.vx;
        this.move(e, true);
        if (e.hitWall) e.vx = -e.hitWall * Math.abs(e.vx);
        break;
      case 'buzzer':
        e.x += e.vx; e.y = e.oy + Math.sin(e.t * 0.06) * 18;
        if (Math.abs(e.x - e.ox) > 96) e.vx = -e.vx;
        break;
      case 'hopper':
        e.vy = Math.min(5, e.vy + 0.3);
        if (e.onGround) { e.vx = 0; if (--e.wait <= 0) { e.vy = -5.5; e.vx = p.x < e.x ? -1.1 : 1.1; e.wait = 70; } }
        this.move(e, true);
        if (e.hitWall) e.vx = -e.vx;
        break;
      case 'bat':
        if (e.state === 'hang') { if (Math.abs(p.x - e.x) < 72 && p.y > e.y) { e.state = 'swoop'; e.vx = p.x < e.x ? -1.4 : 1.4; e.vy = 2.6; Audio8.sfx('swoop'); } } else {
          e.x += e.vx; e.y += e.vy; e.vy = Math.max(-1.4, e.vy - 0.055);
          if (e.vy < 0 && e.y <= e.oy) { e.y = e.oy; e.vy = 0; }
        }
        break;
      case 'charger': {
        e.vy = Math.min(5, e.vy + 0.3);
        const dir = Math.sign(e.vx) || 1;
        if (e.charge > 0) { e.charge--; if (e.charge % 6 === 0 && e.onGround) this.dust(e.x + 7 - dir * 6, e.y + e.h, 1); if (e.charge === 0) e.vx = dir * 0.4; } else if (e.onGround && Math.abs(p.y - e.y) < 30 && Math.sign(p.x - e.x) === dir && Math.abs(p.x - e.x) < 130) { e.charge = 80; e.vx = dir * 2.4; Audio8.sfx('snort'); } else if (e.onGround && !this.groundAhead(e)) e.vx = -e.vx;
        this.move(e, true);
        if (e.hitWall) { e.vx = -e.hitWall * 0.4; if (e.charge) this.shake = 4; e.charge = 0; }
        break;
      }
      case 'turret':
        e.vy = Math.min(5, e.vy + 0.3); this.move(e, true); e.face = p.x < e.x ? -1 : 1;
        if (--e.cool <= 0) {
          e.cool = 130;
          if (Math.abs(p.x - e.x) < 220) { Audio8.sfx('zap'); this.ents.push({ type: 'bolt', hazard: true, alive: true, x: e.x + (e.face > 0 ? 14 : -6), y: e.y + 6, w: 6, h: 6, vx: e.face * 1.7, vy: 0, t: 0, life: 220 }); }
        }
        break;
      case 'ufo': this.updateUfo(e); return;
      case 'yeti': this.updateYeti(e); return;
      case 'crab': this.updateCrab(e); return;
      case 'mole': this.updateMole(e); return;
      case 'dragon': this.updateDragon(e); return;
      case 'zap':
        e.x += e.vx; e.y += e.vy; e.life--;
        if (e.life <= 0 || SOLID.has(this.tile(Math.floor((e.x + 3) / TS), Math.floor((e.y + 3) / TS)))) { e.alive = false; this.parts.push({ k: 'spark', x: e.x, y: e.y, life: 8 }); }
        break;
      case 'secret':
        if (this.state === 'play' && overlap(p, e)) this.clear(e.to);
        return;
      case 'fish':
        e.x += e.vx; e.y = e.oy + Math.sin(e.t * 0.05) * 6;
        if (Math.abs(e.x - e.ox) > 110 || SOLID.has(this.tile(Math.floor((e.x + (e.vx > 0 ? e.w + 1 : -1)) / TS), Math.floor((e.y + 5) / TS)))) e.vx = -e.vx;
        break;
      case 'jelly':
        e.y = e.oy + Math.sin(e.t * 0.03) * 22; e.x += clamp(p.x - e.x, -0.25, 0.25);
        break;
      case 'ghost': {
        const ph = e.t % 300;
        e.ghostOff = ph >= 215; e.fade = ph < 200 ? 1 : ph < 215 ? ((e.t >> 1) & 1 ? 0.6 : 0.2) : 0.12;
        const sp = e.ghostOff ? 0.2 : 0.45;
        e.x += clamp(p.x - e.x, -sp, sp); e.y += clamp(p.y - e.y, -sp * 0.6, sp * 0.6) + Math.sin(e.t * 0.08) * 0.3;
        break;
      }
      case 'blob':
        if (e.vy === 0 && --e.act <= 0) { e.vy = -7.2; Audio8.sfx('fireball'); }
        if (e.vy !== 0 || e.y < e.oy) { e.vy += 0.25; e.y += e.vy; if (e.y >= e.oy) { e.y = e.oy; e.vy = 0; e.act = 90; } }
        break;
      case 'snowball': case 'rock':
        e.vy += 0.15; e.x += e.vx; e.y += e.vy; e.life--;
        if (e.life <= 0 || SOLID.has(this.tile(Math.floor((e.x + 4) / TS), Math.floor((e.y + 6) / TS)))) { e.alive = false; for (let k = 0; k < 4; k++) this.parts.push({ k: 'dust', x: e.x + 4, y: e.y + 4, vx: (k - 1.5) * 0.6, vy: -0.8, life: 14 }); }
        break;
      case 'bomb':
        e.vy = Math.min(4, e.vy + 0.15); e.y += e.vy; e.life--;
        if (e.life <= 0 || SOLID.has(this.tile(Math.floor((e.x + 4) / TS), Math.floor((e.y + 8) / TS)))) { e.alive = false; this.parts.push({ k: 'blast', x: e.x + 4, y: e.y + 4, life: 16 }); Audio8.sfx('stomp'); }
        break;
      case 'bolt':
      case 'spark':
        e.x += e.vx; e.life--;
        if (e.life <= 0 || SOLID.has(this.tile(Math.floor((e.x + (e.vx > 0 ? e.w : 0)) / TS), Math.floor((e.y + 4) / TS)))) e.alive = false;
        break;
      case 'boss': this.updateBoss(e); return;
      case 'dino':
        if (e.rise > 0) { e.y -= 0.5; e.rise -= 0.5; if (e.rise <= 0) { e.state = 'hop'; e.vy = -3.5; e.vx = (p.x < e.x ? -1 : 1) * 1.3; Audio8.sfx('dino'); } return; }
        e.vy = Math.min(5, e.vy + 0.3);
        if (e.state === 'flee' && e.onGround && e.t % 40 === 0) e.vy = -3;
        if (e.state === 'hop') { if (!e.onGround) e.air = true; else if (e.air) { e.state = 'wait'; e.vx = 0; } }
        this.move(e, true);
        if (e.hitWall) e.vx = -e.vx;
        if (e.cool > 0) e.cool--;
        if (!p.riding && e.cool <= 0 && this.state === 'play' && overlap(p, e)) this.mount(e);
        return;
      case 'medal': case 'orb': case 'sigbar': break;
      case 'drink': case 'phone': case 'badge': case 'ammo': case 'battery': case 'boots': case 'magnet': case 'shrink': case 'shield': case 'shroom':
        if (e.rise > 0) { e.y -= 0.5; e.rise -= 0.5; if (e.rise <= 0) e.vx = { phone: 0, ammo: 0, badge: 1.2, battery: 1.3, boots: 0.8, magnet: 0, shield: 0.7, shroom: 1.1 }[e.type] ?? 1; break; }
        e.vy = Math.min(5, e.vy + 0.3);
        this.move(e, true);
        if (e.hitWall) e.vx = -e.hitWall * Math.abs(e.vx);
        if (e.type === 'battery' && e.onGround) e.vy = -3.6;
        break;
      case 'checkpoint':
        if (!e.on && p.x + p.w > e.x && this.state === 'play') { e.on = true; this.cpHit = true; if (this.ta) this.split('cp', this.taT); Audio8.sfx('check'); if (p.hearts < 2) p.hearts = 2; }
        return;
      case 'goal':
        if (overlap(p, e)) this.clear();
        return;
    }
    if (this.state !== 'play') return;
    if (e.item && e.type !== 'dino' && e.rise <= 0 && overlap(p, e)) {
      e.alive = false;
      if (e.type === 'drink') { if (p.hearts >= 3) this.addScore(1000, e.x, e.y); else { p.hearts++; this.parts.push({ k: 'text', s: '+$', x: e.x, y: e.y - 8, vy: -0.5, life: 50 }); } Audio8.sfx('power'); }
      if (e.type === 'phone') { p.power = 'signal'; Audio8.sfx('signal'); this.parts.push({ k: 'text', s: 'SIGNAL!', x: e.x - 12, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'medal') {
        this.medalsGot |= 1 << e.id; Audio8.sfx('check');
        const n = [0, 1, 2, 3, 4].filter((i) => (this.medalsGot | game.medals[this.li]) & (1 << i)).length;
        this.addScore(e.got ? 200 : 1000, e.x, e.y - 8);
        this.parts.push({ k: 'text', s: `MEDAL ${n}/5`, x: e.x - 18, y: e.y - 18, vy: -0.4, life: 70 });
        if (!e.got) Ach.add('medals');
        if (n === 5) Ach.unlock('medals5');
        if (n === 5 && !e.got) { game.lives++; Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: 'ALL MEDALS! 1UP', x: e.x - 40, y: e.y - 30, vy: -0.4, life: 90 }); }
      }
      if (e.type === 'battery') { p.charge = 600; Audio8.sfx('power'); Audio8.play('charge'); this.parts.push({ k: 'text', s: 'SUPER CHARGE!', x: e.x - 30, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'boots') { p.boots = true; Audio8.sfx('power'); this.parts.push({ k: 'text', s: 'JET BOOTS!', x: e.x - 20, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'sigbar') {
        this.barsGot |= 1 << e.id; Audio8.sfx('signal'); if (!e.got && !this.def.custom) Ach.add('bars');
        const all = this.barsGot | (game.bars[this.li] | 0), n = [0, 1, 2].filter((i) => all & (1 << i)).length;
        this.addScore(e.got ? 200 : 2000, e.x, e.y - 8);
        this.parts.push({ k: 'text', s: `SIGNAL ${n}/3`, x: e.x - 18, y: e.y - 18, vy: -0.4, life: 70 });
        if (n === 3 && !this.fullSig) {
          this.fullSig = true; Ach.unlock('fullsignal'); Sticker.add('fullsignal'); p.special = Math.min(9, p.special + 3);
          if (!e.got) { game.lives++; Audio8.sfx('oneup'); }
          this.parts.push({ k: 'text', s: 'FULL SIGNAL!', x: e.x - 30, y: e.y - 30, vy: -0.4, life: 90 });
        }
      }
      if (e.type === 'orb') { p.special = Math.min(9, p.special + 3); Audio8.sfx('power'); this.parts.push({ k: 'text', s: 'SPECIAL +3', x: e.x - 24, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'ammo') { p.ammo = Math.min(9, p.ammo + 3); Audio8.sfx('reload'); this.parts.push({ k: 'text', s: '+3', x: e.x, y: e.y - 8, vy: -0.5, life: 50 }); }
      if (e.type === 'magnet') { p.magnet = 900; Audio8.sfx('power'); this.parts.push({ k: 'text', s: 'COIN MAGNET!', x: e.x - 26, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'shield') { p.shield = true; Audio8.sfx('power'); this.parts.push({ k: 'text', s: 'BUBBLE SHIELD!', x: e.x - 30, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'shrink') { if (p.riding) this.addScore(1000, e.x, e.y); else { this.setTiny(true); this.parts.push({ k: 'text', s: 'TINY TIME!', x: e.x - 20, y: e.y - 8, vy: -0.5, life: 60 }); } }
      if (e.type === 'shroom') { game.lives++; Audio8.sfx('oneup'); Sticker.add('shroom'); this.parts.push({ k: 'text', s: '1UP!', x: e.x, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'badge') { game.lives++; Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: '1UP', x: e.x, y: e.y - 8, vy: -0.5, life: 60 }); }
    }
    if ((e.enemy || e.hazard) && !e.ghostOff && overlap(p, e)) {
      if (p.charge > 0 && e.enemy) this.flipKill(e);
      else if ((e.stomp || ((p.riding || p.pound === -1) && e.enemy)) && p.vy > 0 && p.prevBottom <= e.y + 7) { this.stomp(e); if (p.pound === -1) p.vy = 7; } else this.hurt();
    }
  }
  updateBoss(e) {
    if (e.kind === 'mother') return this.updateMother(e);
    const p = this.p;
    if (e.inv > 0) e.inv--;
    e.vy = Math.min(6, e.vy + 0.3);
    if (this.bossLock && this.state === 'play') {
      const hurtN = e.maxHp - e.hp, speed = 0.6 + hurtN * (e.maxHp > 3 ? 0.22 : 0.3) + (e.maxHp > 3 ? 0.2 : 0);
      if (e.onGround) {
        if (e.t % 50 === 0) e.vx = (p.x < e.x ? -1 : 1) * speed;
        if (--e.jumpT <= 0) { e.vy = -6 - Math.min(2, hurtN * 0.3); e.jumpT = Math.max(50, 110 - hurtN * 15); e.leapt = true; }
      }
    } else e.vx = 0;
    const was = e.onGround;
    this.move(e, false);
    if (e.hitWall) e.vx = -e.vx;
    if (e.onGround && !was && e.leapt) {
      e.leapt = false; this.shake = 12; Audio8.sfx('spark');
      for (const d of [-1, 1]) this.ents.push({ type: 'spark', hazard: true, alive: true, x: e.x + 10, y: e.y + e.h - 10, w: 8, h: 10, vx: d * (1.6 + (e.maxHp - e.hp) * 0.25), vy: 0, t: 0, life: 240 });
    }
    if (this.state !== 'play' || !overlap(p, e)) return;
    if (e.inv === 0 && p.vy > 0 && p.prevBottom <= e.y + 10) { p.vy = -6.5; this.damageBoss(e); } else if (e.inv === 0) this.hurt();
  }
  beamEnd(x, y0) {
    for (let ty = Math.max(0, Math.floor(y0 / TS)); ty < 14; ty++) if (SOLID.has(this.tile(Math.floor(x / TS), ty))) return ty * TS;
    return VH + 16;
  }
  updateUfo(e) {
    const p = this.p, hover = () => 26 + Math.sin(e.t * 0.05) * 4;
    if (e.state === 'enter') { e.y += 1; if (e.y >= 26) { e.state = 'hover'; e.timer = 100; } } else if (e.state === 'hover') {
      e.x += clamp(p.x + p.w / 2 - (e.x + e.w / 2), -1.1, 1.1); e.y = hover();
      if (--e.timer <= 0 && this.state === 'play') { e.state = 'charge'; e.timer = 45; e.beamX = e.x + e.w / 2; Audio8.sfx('lasercharge'); }
    } else if (e.state === 'charge') {
      e.y = hover(); e.beamX = e.x + e.w / 2; e.beamEnd = this.beamEnd(e.beamX, e.y + e.h);
      if (--e.timer <= 0) { e.state = 'fire'; e.timer = 28; Audio8.sfx('laser'); this.shake = 6; }
    } else if (e.state === 'fire') {
      e.beamEnd = this.beamEnd(e.beamX, e.y + e.h);
      if (e.timer % 3 === 0 && e.beamEnd < VH) this.parts.push({ k: 'spark', x: e.beamX - 4 + (Math.random() * 8 - 4), y: e.beamEnd - 6, life: 8 });
      if (--e.timer <= 0) { e.shots++; e.state = e.shots >= 5 ? 'leave' : 'hover'; e.timer = 150; } else if (this.state === 'play' && p.x + p.w > e.beamX - 6 && p.x < e.beamX + 6 && p.y < e.beamEnd && p.y + p.h > e.y + e.h) this.hurt();
    } else if (e.state === 'leave') { e.y -= 1.2; e.x += 1.6; if (e.y < -40) e.alive = false; }
    if (this.state === 'play' && overlap(p, e)) {
      if (p.charge > 0 || (p.vy > 0 && p.prevBottom <= e.y + 6)) { if (p.charge <= 0) { p.vy = Input.down('jump') ? -6.2 : -3.8; } this.flipKill(e); } else this.hurt();
    }
  }
  drawUfo(e, x, y) {
    const bx = Math.round(e.beamX - (e.x - x)), top = y + 12;
    if (e.state === 'charge' && (frame >> 1) & 1) { ctx.fillStyle = 'rgba(255,80,80,0.8)'; ctx.fillRect(bx, top, 1, e.beamEnd - top); ctx.fillRect(bx - 3, e.beamEnd - 2, 7, 2); }
    if (e.state === 'fire') {
      const w = 10 + ((frame >> 1) & 1) * 2;
      ctx.fillStyle = 'rgba(95,240,255,0.55)'; ctx.fillRect(bx - w / 2 - 2, top, w + 4, e.beamEnd - top);
      ctx.fillStyle = '#5ff0ff'; ctx.fillRect(bx - w / 2, top, w, e.beamEnd - top);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 2, top, 4, e.beamEnd - top);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 9, e.beamEnd - 3, 18, 3);
    }
    for (let yy = -7; yy <= 0; yy++) { const h = Math.round(Math.sqrt(49 - yy * yy)); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 14 - h - 1, y + 4 + yy, h * 2 + 2, 1); ctx.fillStyle = yy < -4 ? '#c8f8ff' : '#7ad8f0'; ctx.fillRect(x + 14 - h, y + 4 + yy, h * 2, 1); }
    ctx.fillStyle = '#5ae060'; ctx.fillRect(x + 11, y - 1, 6, 5); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 12, y + 1, 1, 1); ctx.fillRect(x + 15, y + 1, 1, 1);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 2, y + 4, 32, 7); ctx.fillRect(x + 2, y + 11, 24, 2);
    ctx.fillStyle = '#a8b0c8'; ctx.fillRect(x - 1, y + 5, 30, 3); ctx.fillStyle = '#6a7090'; ctx.fillRect(x - 1, y + 8, 30, 2); ctx.fillRect(x + 3, y + 10, 22, 2);
    ctx.fillStyle = '#e8ecf8'; ctx.fillRect(x + 1, y + 5, 26, 1);
    for (let i = 0; i < 5; i++) { const k = ((frame >> 3) + i) % 3; ctx.fillStyle = k === 0 ? '#ffe040' : k === 1 ? '#ff3040' : '#5ff0ff'; ctx.fillRect(x + 2 + i * 6, y + 8, 2, 2); }
    if (e.state === 'charge') { ctx.fillStyle = (frame >> 1) & 1 ? '#ff3040' : '#ffffff'; ctx.fillRect(x + 11, y + 11, 6, 2); }
  }
  solidOverlap(b) {
    for (let ty = Math.floor(b.y / TS); ty <= Math.floor((b.y + b.h - 1) / TS); ty++) for (let tx = Math.floor(b.x / TS); tx <= Math.floor((b.x + b.w - 1) / TS); tx++) if (SOLID.has(this.tile(tx, ty))) return true;
    return false;
  }
  // ---------- Ice Yeti (Frosty Peaks mid-boss) ----------
  // ---------- shared mini-boss arena ----------
  activateMini(e) {
    e.active = true; const [a0, a1] = this.def.yetiArena || this.def.miniArena;
    this.arena = { min: a0 * TS, max: (a1 + 1) * TS }; this.camMin = a0 * TS; this.camMax = (a1 + 1) * TS - VW;
    Audio8.play('boss'); Audio8.sfx('roar'); this.shake = 20; this.startTalk(e.type);
    this.parts.push({ k: 'text', s: (e.mini || 'ICE YETI') + '!', x: 128, y: 70, vy: 0, life: 100, fixed: true });
  }
  miniContact(e, top = 8) {
    const p = this.p;
    if (this.state !== 'play' || e.inv > 0 || e.dying || !overlap(p, e)) return;
    if (p.vy > 0 && p.prevBottom <= e.y + top) { p.vy = -6.5; this.damageYeti(e); } else this.hurt();
  }
  // ---------- King Krabby (Sunny Shoreline) ----------
  updateCrab(e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    e.vy = Math.min(6, e.vy + 0.3);
    if (!e.active) { this.move(e, false); if (Math.abs(p.x - e.x) < 150 && this.state === 'play') this.activateMini(e); return; }
    const toward = p.x < e.x ? -1 : 1, rage = e.maxHp - e.hp;
    e.act--;
    if (e.state === 'walk') {
      e.vx = toward * (0.7 + rage * 0.25);
      if (e.act <= 0) { e.cycle = (e.cycle || 0) + 1; if (e.cycle % 3 === 0) { e.state = 'leap'; e.vy = -6; e.vx = toward * 1.2; e.air = false; Audio8.sfx('roar'); } else { e.state = 'claw'; e.act = 30; e.vx = 0; e.dir = toward; } }
    } else if (e.state === 'claw') {
      e.vx = 0;
      if (e.act <= 0) { e.state = 'dash'; e.act = 45; e.vx = e.dir * (3 + rage * 0.4); Audio8.sfx('snort'); }
    } else if (e.state === 'dash') {
      if (e.act % 5 === 0) this.dust(e.x + e.w / 2 - e.dir * 12, e.y + e.h, 1);
      if (e.act <= 0) { e.state = 'walk'; e.act = 90 - rage * 15; }
    } else if (e.state === 'leap' && e.onGround && e.air) {
      this.shake = 14; Audio8.sfx('boom'); this.dust(e.x + e.w / 2, e.y + e.h, 4);
      for (const d of [-1, 1]) this.ents.push({ type: 'spark', hazard: true, alive: true, x: e.x + e.w / 2, y: e.y + e.h - 10, w: 8, h: 10, vx: d * 1.8, vy: 0, t: 0, life: 200 });
      e.state = 'walk'; e.act = 90 - rage * 15;
    }
    this.move(e, false);
    e.air = !e.onGround;
    if (e.hitWall) { if (e.state === 'dash') { e.state = 'walk'; e.act = 60; this.shake = 6; } e.vx = 0; }
    this.miniContact(e);
  }
  drawCrab(e, x, y) {
    if (e.inv > 0 && (frame >> 2) % 2) return;
    const up = e.state === 'claw' ? -8 : e.state === 'leap' ? -5 : 0, step = (e.t >> 2) & 1;
    ctx.fillStyle = '#1a1020'; for (let k = 0; k < 3; k++) { ctx.fillRect(x + 4 + k * 5, y + 15 + ((k + step) & 1), 2, 6); ctx.fillRect(x + 24 + k * 5, y + 15 + ((k + step + 1) & 1), 2, 6); }
    for (let yy = -8; yy <= 8; yy++) { const h = Math.round(Math.sqrt(64 - yy * yy) * 2.2); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 17 - h - 1, y + 10 + yy, h * 2 + 2, 1); ctx.fillStyle = yy < -3 ? '#ff7060' : '#e83828'; ctx.fillRect(x + 17 - h, y + 10 + yy, h * 2, 1); }
    ctx.fillStyle = '#a01810'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 9 + k * 5, y + 7, 2, 2);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 12, y - 3, 2, 7); ctx.fillRect(x + 20, y - 3, 2, 7);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 11, y - 6, 4, 4); ctx.fillRect(x + 19, y - 6, 4, 4);
    ctx.fillStyle = e.hp < e.maxHp ? '#ff2020' : '#1a1020'; ctx.fillRect(x + 12, y - 5, 2, 2); ctx.fillRect(x + 20, y - 5, 2, 2);
    for (const [cx2, d] of [[x - 4, -1], [x + 32, 1]]) { ctx.fillStyle = '#1a1020'; ctx.fillRect(cx2 - 2, y + 2 + up, 10, 9); ctx.fillStyle = '#ff6050'; ctx.fillRect(cx2 - 1, y + 3 + up, 8, 7); ctx.fillStyle = '#ffd0c0'; ctx.fillRect(cx2 + (d > 0 ? 4 : 0), y + 3 + up, 3, 2); ctx.fillStyle = '#1a1020'; ctx.fillRect(cx2 - 1, y + 6 + up, 8, 1); }
  }
  // ---------- Drill Mole (Deep Dark Mine) ----------
  updateMole(e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    if (!e.active) { e.vy = Math.min(6, e.vy + 0.3); this.move(e, false); if (e.onGround) e.groundY = e.y; if (Math.abs(p.x - e.x) < 150 && this.state === 'play' && e.groundY !== undefined) { this.activateMini(e); e.state = 'dig'; e.act = 20; } return; }
    const rage = e.maxHp - e.hp;
    e.act--; e.ghostOff = e.state === 'under';
    if (e.state === 'dig') { e.y = Math.min(e.groundY + 20, e.y + 1); if (e.act <= 0) { e.state = 'under'; e.act = 110 - rage * 15; } } else if (e.state === 'under') {
      e.y = e.groundY + 20; e.x += clamp(p.x + p.w / 2 - (e.x + e.w / 2), -1.3 - rage * 0.3, 1.3 + rage * 0.3);
      if (this.arena) e.x = clamp(e.x, this.arena.min, this.arena.max - e.w);
      if (e.t % 10 === 0) Audio8.sfx('dig');
      if (e.act <= 0 || (e.act < 70 && Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < 8)) { e.state = 'pop'; e.act = 18; this.shake = 8; Audio8.sfx('boom'); this.dust(e.x + 12, e.groundY + e.h, 4); }
    } else if (e.state === 'pop') {
      e.y = e.groundY + Math.round((e.act / 18) * 20);
      if (this.state === 'play' && overlap(p, e)) this.hurt();
      if (e.act <= 0) { e.y = e.groundY; e.state = 'up'; e.act = 100 - rage * 10; }
    } else if (e.state === 'up') {
      if (e.act === 70 || e.act === 40 || (rage > 1 && e.act === 15)) { const toward = p.x < e.x ? -1 : 1; Audio8.sfx('swoop'); this.ents.push({ type: 'rock', hazard: true, alive: true, x: e.x + 8, y: e.y, w: 8, h: 8, vx: toward * (1.2 + Math.random() * 1.6), vy: -4.6, t: 0, life: 300 }); }
      this.miniContact(e, 10);
      if (e.act <= 0) { e.state = 'dig'; e.act = 20; Audio8.sfx('dig'); }
    }
  }
  drawMole(e, x, y) {
    const gy = Math.round(e.groundY + e.h);
    if (e.state === 'under') {
      const wob = (e.t >> 2) & 1;
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, gy - 7 - wob, 26, 8); ctx.fillStyle = '#8a5a30'; ctx.fillRect(x, gy - 6 - wob, 24, 6); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 4, gy - 4, 3, 2); ctx.fillRect(x + 15, gy - 5, 4, 2);
      return;
    }
    if (e.inv > 0 && (frame >> 2) % 2) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 10, 0, 50, gy - 0); ctx.clip();
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 1, y + 4, 22, 18); ctx.fillStyle = '#7a5a8a'; ctx.fillRect(x + 2, y + 5, 20, 16); ctx.fillStyle = '#a080b0'; ctx.fillRect(x + 4, y + 7, 6, 3);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 4, y + 9, 16, 4); ctx.fillStyle = '#3a3a4a'; ctx.fillRect(x + 5, y + 10, 6, 2); ctx.fillRect(x + 13, y + 10, 6, 2);
    ctx.fillStyle = '#ff90a0'; ctx.fillRect(x + 10, y + 14, 4, 3);
    const spin = (frame >> 1) & 1;
    for (let k = 0; k < 8; k++) { ctx.fillStyle = (k + spin) % 2 ? '#c8ccd8' : '#7a7e90'; ctx.fillRect(x + 12 - (8 - k) / 2, y - 4 + k, 8 - k, 1); }
    ctx.fillStyle = '#e8d0b0'; ctx.fillRect(x - 2, y + 14, 4, 6); ctx.fillRect(x + 22, y + 14, 4, 6);
    ctx.restore();
  }
  // ---------- Nimbus the cloud dragon (Cloudtop Climb) ----------
  updateDragon(e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    if (!e.active) { e.y = e.oy || (e.oy = e.y); if (Math.abs(p.x - e.x) < 150 && this.state === 'play') { this.activateMini(e); e.act = 90; } return; }
    const rage = e.maxHp - e.hp, A = this.arena;
    e.act--;
    if (e.state === 'swoop') {
      const tx = e.tx, ty = e.ty;
      e.x += clamp(tx - e.x, -2.6 - rage * 0.3, 2.6 + rage * 0.3); e.y += e.climb ? -1.6 : 2.4;
      if (!e.climb && e.y >= ty) e.climb = true;
      if (e.climb && e.y <= 34) { e.state = 'idle'; e.act = 110 - rage * 15; }
    } else {
      e.x += clamp(A.min + 30 + ((Math.sin(e.t * 0.012) + 1) / 2) * (A.max - A.min - 60 - e.w) - e.x, -1.6, 1.6);
      e.y += clamp(34 + Math.sin(e.t * 0.05) * 8 - e.y, -1, 1);
      if (e.act === 50 || (rage > 1 && e.act === 25)) { Audio8.sfx('zap'); for (const d of [-1, 0, 1]) this.ents.push({ type: 'zap', hazard: true, alive: true, x: e.x + 12, y: e.y + 12, w: 6, h: 6, vx: d * 1.2, vy: 2.2, t: 0, life: 160 }); }
      if (e.act <= 0) { e.state = 'swoop'; e.climb = false; e.tx = p.x - 10; e.ty = Math.min(p.y - 4, 160); Audio8.sfx('roar'); }
    }
    e.trail.unshift([e.x, e.y]); if (e.trail.length > 40) e.trail.pop();
    this.miniContact(e, 8);
  }
  drawDragon(e, x, y, cx) {
    const blink = e.inv > 0 && (frame >> 2) % 2;
    for (let k = 6; k >= 1; k--) { const tp = e.trail[Math.min(e.trail.length - 1, k * 6)]; if (!tp) continue; const bx = Math.round(tp[0] - cx) + 6, by = Math.round(tp[1]) + 2, r = 9 - k; for (let yy = -r; yy <= r; yy++) { const h = Math.round(Math.sqrt(r * r - yy * yy)); ctx.fillStyle = yy > r / 3 ? '#b8b0e8' : '#f4f0ff'; ctx.fillRect(bx - h + 4, by + yy + 4, h * 2, 1); } }
    if (blink) return;
    const f = e.trail.length > 2 && e.trail[0][0] < e.trail[2][0] ? -1 : 1;
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y + 1, 30, 14); ctx.fillStyle = '#f4f0ff'; ctx.fillRect(x, y + 2, 28, 12); ctx.fillStyle = '#b8b0e8'; ctx.fillRect(x, y + 10, 28, 4);
    ctx.fillStyle = '#ffd860'; ctx.fillRect(x + (f > 0 ? 4 : 18), y - 4, 2, 6); ctx.fillRect(x + (f > 0 ? 9 : 23), y - 4, 2, 6);
    ctx.fillStyle = e.hp < e.maxHp ? '#ff3040' : '#7a4ae8'; ctx.fillRect(x + (f > 0 ? 18 : 6), y + 5, 4, 3);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + (f > 0 ? 24 : 1), y + 9, 3, 2);
    ctx.fillStyle = '#b8b0e8'; for (let k = 0; k < 8; k++) ctx.fillRect(x + (f > 0 ? 28 + k : -1 - k), y + 9 + Math.round(Math.sin(k * 0.8 + frame * 0.2) * 2), 1, 1);
  }
  updateYeti(e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    e.vy = Math.min(6, e.vy + 0.3);
    if (!e.active) {
      this.move(e, false);
      if (Math.abs(p.x - e.x) < 140 && this.state === 'play') {
        e.active = true; const [a0, a1] = this.def.yetiArena;
        this.arena = { min: a0 * TS, max: (a1 + 1) * TS }; this.camMin = a0 * TS; this.camMax = (a1 + 1) * TS - VW;
        Audio8.play('boss'); Audio8.sfx('roar'); this.shake = 20; this.startTalk('yeti');
        this.parts.push({ k: 'text', s: 'ICE YETI!', x: 128, y: 70, vy: 0, life: 100, fixed: true });
      }
      return;
    }
    const toward = p.x < e.x ? -1 : 1, rage = e.maxHp - e.hp;
    e.act--;
    if (e.state === 'walk') {
      e.vx = toward * (0.6 + rage * 0.25);
      if (e.act <= 0) {
        e.cycle = (e.cycle || 0) + 1;
        if (e.cycle % 3 === 0) { e.state = 'leap'; e.vy = -6.5; e.vx = toward * 1.5; e.air = false; Audio8.sfx('roar'); } else { e.state = 'throw'; e.act = 40; e.vx = 0; }
      }
    } else if (e.state === 'throw') {
      e.vx = 0;
      if (e.act === 20 || (rage > 0 && e.act === 8)) { Audio8.sfx('swoop'); this.ents.push({ type: 'snowball', hazard: true, alive: true, x: e.x + 10, y: e.y, w: 8, h: 8, vx: toward * (1.4 + Math.random() * 1.4), vy: -4.2, t: 0, life: 300 }); }
      if (e.act <= 0) { e.state = 'walk'; e.act = 100 - rage * 15; }
    } else if (e.state === 'leap' && e.onGround && e.air) {
      this.shake = 16; Audio8.sfx('boom'); this.dust(e.x + 14, e.y + e.h, 4);
      if (p.onGround && this.state === 'play' && p.charge <= 0) { p.frozen = 50; this.parts.push({ k: 'text', s: 'BRRR!', x: p.x - 6, y: p.y - 12, vy: -0.4, life: 40 }); }
      e.state = 'walk'; e.act = 100 - rage * 15;
    }
    this.move(e, false);
    e.air = !e.onGround;
    if (e.hitWall) e.vx = 0;
    if (this.state === 'play' && e.inv === 0 && overlap(p, e)) {
      if (p.vy > 0 && p.prevBottom <= e.y + 10) { p.vy = -6.5; this.damageYeti(e); } else this.hurt();
    }
  }
  damageYeti(e) {
    if (e.inv > 0 || e.dying || (e.type === 'mole' && e.state === 'under')) return;
    e.hp--; e.inv = 80; this.shake = 14; Audio8.sfx('bosshit'); this.addScore(1000, e.x, e.y - 8);
    if (e.hp <= 0) {
      e.dying = 'flip'; e.vy = -4; e.vx = this.p.x < e.x ? 1 : -1; Sticker.add(e.type); if (this.rush) this.rushT = 110;
      this.arena = null; this.camMin = 0; this.camMax = null; this.addScore(3000);
      this.ents.forEach((s2) => { if (['snowball', 'rock', 'zap', 'spark'].includes(s2.type)) s2.alive = false; });
      Audio8.play(this.def.music);
      this.parts.push({ k: 'text', s: (e.mini || 'YETI') + ' DEFEATED!', x: 128, y: 70, vy: 0, life: 120, fixed: true });
      if (e.type === 'yeti') Ach.unlock('yeti'); Ach.unlock('boss'); if (!this.bossHit) Ach.unlock('flawless');
    }
  }
  // ---------- weather: wind gusts, rain showers, thunderstorms ----------
  windNow() {
    if (this.def.weather !== 'wind') return 0;
    const cyc = frame % 600, dir = ((frame / 600) | 0) % 2 ? 1 : -1;
    return cyc < 300 ? 0 : dir * Math.min(1, (cyc - 300) / 40, (600 - cyc) / 40);
  }
  rainNow() {
    const w = this.def.weather;
    if (w === 'storm') return 1;
    if (w === 'rain') return clamp(Math.sin(frame * 0.0025) * 1.6 - 0.2, 0, 1);
    return 0;
  }
  drawWeather(cx) {
    const wind = this.windNow(), rain = this.rainNow();
    if (wind) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 18; i++) { const len = 10 + (i % 4) * 6, sp = 5 + (i % 3) * 2; const x = (((i * 71 + frame * sp * Math.sign(wind)) % (VW + 60)) + VW + 60) % (VW + 60) - 30, y = (i * 47) % 200 + 20; if (Math.abs(wind) > 0.3) ctx.fillRect(Math.round(x), y, Math.round(len * Math.abs(wind)), 1); }
      if (Math.abs(wind) > 0.5) txt(wind > 0 ? 'WIND >>>' : '<<< WIND', 128, 30, '#d8f0ff', { align: 'center', outline: '#3a5a8a' });
    }
    if (rain > 0) {
      ctx.fillStyle = `rgba(20,30,60,${0.18 * rain})`; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(190,215,255,0.65)';
      const n = Math.round(70 * rain);
      for (let i = 0; i < n; i++) { const x = (((i * 37 - cx * 0.2 - frame * 2) % VW) + VW) % VW, y = (i * 53 + frame * 7) % (VH + 10) - 10; ctx.fillRect(Math.round(x), Math.round(y), 1, 5); ctx.fillRect(Math.round(x) - 1, Math.round(y) + 4, 1, 2); }
    }
  }
  drawYeti(e, x, y) {
    if (e.inv > 0 && (frame >> 2) % 2) return;
    const step = e.state === 'walk' ? ((e.t >> 3) & 1) : 0, face = this.p.x < e.x ? -1 : 1;
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 1, y + 3, 28, 25); ctx.fillRect(x + 4, y, 22, 4);
    ctx.fillStyle = '#f0f4ff'; ctx.fillRect(x + 2, y + 4, 26, 23); ctx.fillRect(x + 5, y + 1, 20, 4);
    ctx.fillStyle = '#c8d8f0'; for (let k = 0; k < 6; k++) ctx.fillRect(x + 3 + k * 4, y + 24 - (k % 2) * 2, 2, 3);
    ctx.fillStyle = '#5a7ab8'; ctx.fillRect(x + 8 + face * 2, y + 5, 14, 10);
    ctx.fillStyle = e.hp < e.maxHp ? '#ff3040' : '#ffffff'; ctx.fillRect(x + 10 + face * 2, y + 7, 3, 3); ctx.fillRect(x + 17 + face * 2, y + 7, 3, 3);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 11 + face * 2, y + 8, 1, 1); ctx.fillRect(x + 18 + face * 2, y + 8, 1, 1); ctx.fillRect(x + 11 + face * 2, y + 12, 8, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 12 + face * 2, y + 12, 2, 2); ctx.fillRect(x + 16 + face * 2, y + 12, 2, 2);
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x + 3, y - 3, 3, 5); ctx.fillRect(x + 24, y - 3, 3, 5);
    const armUp = e.state === 'throw' ? -8 : e.state === 'leap' ? -10 : 0;
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 3, y + 10 + armUp, 7, 12); ctx.fillRect(x + 26, y + 10 + armUp, 7, 12);
    ctx.fillStyle = '#e0e8ff'; ctx.fillRect(x - 2, y + 11 + armUp, 5, 10); ctx.fillRect(x + 27, y + 11 + armUp, 5, 10);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 4 + step * 2, y + 27, 8, 5); ctx.fillRect(x + 18 - step * 2, y + 27, 8, 5);
    ctx.fillStyle = '#5a7ab8'; ctx.fillRect(x + 5 + step * 2, y + 28, 6, 3); ctx.fillRect(x + 19 - step * 2, y + 28, 6, 3);
    if (e.state === 'throw' && e.act > 20) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 12, y - 12, 7, 7); }
  }
  // ---------- UFO Mothership (Sky Armada boss) ----------
  updateMother(e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    if (!this.bossLock) { e.y = e.oy + Math.sin(e.t * 0.04) * 3; return; }
    e.t2 = (e.t2 || 0) + 1;
    const ax = this.camMin + 24, aw = VW - 48 - e.w;
    e.x = ax + ((Math.sin(e.t2 * 0.012) + 1) / 2) * aw; e.y = 26 + Math.sin(e.t2 * 0.05) * 5;
    e.act--;
    if (e.mode === 'charge') {
      e.beamX = e.x + e.w / 2; e.beamEnd = this.beamEnd(e.beamX, e.y + e.h);
      if (e.act <= 0) { e.mode = 'fire'; e.act = 34; Audio8.sfx('laser'); this.shake = 8; }
    } else if (e.mode === 'fire') {
      e.beamX = e.x + e.w / 2; e.beamEnd = this.beamEnd(e.beamX, e.y + e.h);
      if (this.state === 'play' && p.x + p.w > e.beamX - 10 && p.x < e.beamX + 10 && p.y < e.beamEnd) this.hurt();
      if (e.act <= 0) { e.mode = null; e.act = Math.max(60, 130 - (e.maxHp - e.hp) * 12); }
    } else if (e.act <= 0) {
      const r = (e.cycle = (e.cycle || 0) + 1) % 3;
      if (r === 0) { e.mode = 'charge'; e.act = 50; Audio8.sfx('lasercharge'); } else if (r === 1) {
        for (const ox of [8, 26, 44]) this.ents.push({ type: 'bomb', hazard: true, alive: true, x: e.x + ox, y: e.y + 14, w: 8, h: 8, vx: 0, vy: 0.5, t: 0, life: 300 });
        e.act = 100; Audio8.sfx('swoop');
      } else {
        if (!this.ents.some((u) => u.type === 'ufo' && !u.dying)) this.ents.push({ type: 'ufo', alive: true, t: 0, x: e.x + 14, y: e.y + 10, w: 28, h: 12, vx: 0, vy: 0, enemy: true, stomp: true, state: 'hover', shots: 2, timer: 80, beamX: 0, beamEnd: 0 });
        e.act = 100;
      }
    }
    if (this.state === 'play' && overlap(p, e)) {
      if (e.inv === 0 && p.vy > 0 && p.prevBottom <= e.y + 8) { p.vy = -6.5; this.damageBoss(e); } else if (e.inv === 0) this.hurt();
    }
  }
  drawMother(e, x, y) {
    const bx = Math.round(e.beamX - (e.x - x)), top = y + 16;
    if (e.mode === 'charge' && (frame >> 1) & 1) { ctx.fillStyle = 'rgba(255,80,80,0.8)'; ctx.fillRect(bx - 1, top, 2, e.beamEnd - top); }
    if (e.mode === 'fire') {
      ctx.fillStyle = 'rgba(255,90,200,0.5)'; ctx.fillRect(bx - 12, top, 24, e.beamEnd - top);
      ctx.fillStyle = '#ff70e0'; ctx.fillRect(bx - 9, top, 18, e.beamEnd - top); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 3, top, 6, e.beamEnd - top);
    }
    if (e.inv > 0 && (frame >> 2) % 2) return;
    for (let yy = -10; yy <= 0; yy++) { const h = Math.round(Math.sqrt(100 - yy * yy) * 1.3); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 28 - h - 1, y + 6 + yy, h * 2 + 2, 1); ctx.fillStyle = yy < -6 ? '#e0f8ff' : '#8ad8f0'; ctx.fillRect(x + 28 - h, y + 6 + yy, h * 2, 1); }
    ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x + 22, y - 2, 12, 8); ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x + 24, y, 8, 5);
    ctx.fillStyle = (frame >> 2) & 1 ? '#ff3040' : '#ff8030'; ctx.fillRect(x + 25, y + 1, 2, 2); ctx.fillRect(x + 29, y + 1, 2, 2);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 4, y + 5, 64, 11); ctx.fillRect(x + 4, y + 15, 48, 4);
    ctx.fillStyle = '#b8c0d8'; ctx.fillRect(x - 3, y + 6, 62, 4); ctx.fillStyle = '#7880a0'; ctx.fillRect(x - 3, y + 10, 62, 5); ctx.fillRect(x + 5, y + 15, 46, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y + 6, 58, 1);
    for (let i = 0; i < 9; i++) { const k = ((frame >> 3) + i) % 3; ctx.fillStyle = k === 0 ? '#ffe040' : k === 1 ? '#ff3040' : '#5ff0ff'; ctx.fillRect(x + 1 + i * 7, y + 11, 3, 2); }
    if (e.mode === 'charge') { ctx.fillStyle = (frame >> 1) & 1 ? '#ff3040' : '#ffffff'; ctx.fillRect(x + 22, y + 16, 12, 3); }
  }
  damageBoss(e) {
    if (e.inv > 0 || !e.alive || this.state !== 'play') return;
    e.hp--; e.inv = 90; this.shake = 16; Audio8.sfx('bosshit'); rumble(0.9, 260); this.addScore(1000, e.x, e.y - 8);
    if (e.hp <= 0) {
      e.alive = false; this.state = 'bossdead'; this.stateT = 0; this.bossX = e.x; this.bossY = e.y; Audio8.stop(); Sticker.add(e.kind === 'mother' ? 'mother' : 'boss');
      this.clearTime = this.time; Ach.unlock('boss'); if (this.li === 14) Ach.unlock('starisle'); if (!this.bossHit) Ach.unlock('flawless'); if (this.def.final) Ach.unlock('savior');
      this.awardStars();
      this.ents.forEach((s) => { if (s.type === 'spark') s.alive = false; });
      this.balls.length = 0;
      this.addScore(5000);
    }
  }
  // ---------- cannonballs ----------
  // GothChick's special: three homing bats
  // Doug's special: freeze every enemy for 5 seconds (stomp anything while frozen)
  pauseFreeze() {
    this.freezeT = 300; this.p.shockT = 24; Audio8.sfx('freeze');
    this.parts.push({ k: 'text', s: 'II PAUSED!', x: 128, y: 80, vy: 0, life: 70, fixed: true });
  }
  batSwarm() {
    const p = this.p;
    p.fire = 10; Audio8.sfx('bats');
    for (let i = 0; i < 3; i++) this.bats.push({ x: p.x + p.w / 2 - 3 + p.face * 6, y: p.y + 6, w: 6, h: 6, vx: p.face * 2.6, vy: (i - 1) * 0.9, life: 120, t: i * 3, slot: i });
  }
  // WallyMan's special: a Signal Shockwave from his phone
  shockwave() {
    const p = this.p, x = p.x + p.w / 2, y = p.y + p.h / 2, R = 96;
    let kills = 0;
    p.shockT = 30; this.shake = 12; Audio8.sfx('shock');
    this.parts.push({ k: 'shock', x, y, life: 30 });
    for (const e of this.ents) {
      if (!e.alive || e.dying || e.ghostOff) continue;
      const dx = e.x + e.w / 2 - x, dy = e.y + e.h / 2 - y;
      if (dx * dx + dy * dy > (R + e.w / 2) ** 2) continue;
      if (e.hazard) { e.alive = false; this.parts.push({ k: 'spark', x: e.x, y: e.y, life: 10 }); } else if (e.enemy) { if (e.boss) this.damageBoss(e); else { this.flipKill(e); kills++; } }
    }
    if (kills >= 3) Ach.unlock('shock');
    for (let ty = Math.floor((y - 40) / TS); ty <= Math.floor((y + 40) / TS); ty++) for (let tx = Math.floor((x - 40) / TS); tx <= Math.floor((x + 40) / TS); tx++) {
      const c = this.tile(tx, ty); if (c !== 'B' && c !== 'R') continue;
      if (c === 'R') this.crackReward(tx, ty);
      this.setTile(tx, ty, '.'); this.addScore(50);
      for (const [ox, oy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5]]) this.parts.push({ k: 'frag', x: tx * TS + ox, y: ty * TS + oy, vx, vy, g: 0.3, life: 70 });
    }
  }
  // Fire Dino: bouncing fireballs
  dinoFire() {
    const p = this.p;
    p.chompT = 18; Audio8.sfx('fireball');
    this.fires.push({ x: p.x + p.w / 2 - 4 + p.face * 12, y: p.y + 10, w: 8, h: 8, vx: p.face * 3.4, vy: 0.5, life: 110 });
  }
  dinoFrost() {
    const p = this.p;
    p.chompT = 18; Audio8.sfx('freeze');
    for (let k = 0; k < 3; k++) this.fires.push({ frost: true, x: p.x + p.w / 2 - 4 + p.face * 12, y: p.y + 8 + k * 3, w: 8, h: 8, vx: p.face * (2.6 + k * 0.4), vy: (k - 1) * 0.25, life: 26 + k * 3 });
  }
  iceUp(e) { // Ice Dino's frost turns an enemy into a block of ice you can stand on or kick
    if (e.iced || e.yeti || e.boss || e.type === 'ufo') return false;
    e.iced = 420; e.kick = 0; e.vx0 = e.vx; e.vx = 0; Audio8.sfx('freeze'); Sticker.add('iced');
    e.icePl = { x: e.x - 1, y: e.y - 2, w: e.w + 2, h: 8, ox: e.x - 1, oy: e.y - 2, axis: 'none', t: 0, dx: 0, dy: 0, ice: true };
    this.platforms.push(e.icePl); return true;
  }
  thaw(e, shatter) {
    e.iced = 0; this.platforms = this.platforms.filter((pl) => pl !== e.icePl); if (this.p.platform === e.icePl) this.p.platform = null; e.icePl = null;
    if (shatter) { e.alive = false; Audio8.sfx('brick'); this.addScore(200, e.x, e.y); for (const [dx, dy, vx, vy] of [[0, 0, -1.2, -4], [8, 0, 1.2, -4], [0, 8, -1, -3], [8, 8, 1, -3]]) this.parts.push({ k: 'frag', x: e.x + dx, y: e.y + dy, vx, vy, g: 0.3, life: 50, ice: true }); } else e.vx = e.vx0 || 0;
  }
  updateIced(e) {
    const p = this.p;
    if (e.kick) {
      e.vx = e.kick; e.vy = Math.min(5, (e.vy || 0) + 0.3); this.move(e, false);
      for (const o of this.ents) if (o !== e && o.enemy && o.alive && !o.dying && !o.iced && overlap(o, e)) { if (o.boss) this.damageBoss(o); else if (o.yeti) this.damageYeti(o); else this.flipKill(o); }
      if (e.hitWall || e.y > VH) { this.thaw(e, true); return; }
    } else if (--e.iced <= 0) { this.thaw(e, false); return; }
    else if (this.state === 'play' && overlap(p, e) && p.y + p.h > e.y + 4 && p.platform !== e.icePl) { e.kick = (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1) * 4; Audio8.sfx('kick'); }
    if (e.icePl) { e.icePl.ox = e.icePl.x = e.x - 1; e.icePl.oy = e.icePl.y = e.y - 2; }
  }
  updateFires() {
    for (const f of this.fires) {
      f.life--;
      if (f.frost) { f.x += f.vx; f.y += f.vy; f.hitWall = SOLID.has(this.tile(Math.floor((f.x + 4) / TS), Math.floor((f.y + 4) / TS))); } else { f.vy = Math.min(4, f.vy + 0.3); this.move(f, true); if (f.onGround) f.vy = -2.8; }
      if (f.hitWall) f.life = 0;
      for (const e of this.ents) {
        if (!e.enemy || !e.alive || e.dying || e.ghostOff || !overlap(f, e)) continue;
        if (f.frost && this.iceUp(e)) { f.life = 0; break; }
        if (f.frost && (e.iced || e.type === 'ufo')) continue;
        if (e.boss) this.damageBoss(e); else this.flipKill(e);
        f.life = 0; break;
      }
      if (f.life <= 0) this.parts.push({ k: 'spark', x: f.x, y: f.y, life: 10 });
    }
    this.fires = this.fires.filter((f) => f.life > 0 && f.y < VH + 20);
  }
  updateBats() {
    for (const bt of this.bats) {
      bt.life--; bt.t++;
      // home in on an enemy: each bat of a swarm picks a different one of the nearest targets
      const near = [];
      for (const e of this.ents) {
        if (!e.enemy || !e.alive || e.dying || e.ghostOff) continue;
        const dx = e.x + e.w / 2 - bt.x, dy = e.y + e.h / 2 - bt.y, d = Math.hypot(dx, dy);
        if (d < 170) near.push({ dx, dy, d: d || 1, e });
      }
      near.sort((a2, b2) => a2.d - b2.d);
      const best = near.length ? near[Math.min(bt.slot || 0, near.length - 1)] : null;
      if (best && bt.t > 6) { bt.vx += (best.dx / best.d) * 0.45; bt.vy += (best.dy / best.d) * 0.45; }
      bt.vy += Math.sin(bt.t * 0.5) * 0.08;
      const sp = Math.hypot(bt.vx, bt.vy), max = 3.2;
      if (sp > max) { bt.vx = (bt.vx / sp) * max; bt.vy = (bt.vy / sp) * max; }
      bt.x += bt.vx; bt.y += bt.vy;
      for (const e of this.ents) {
        if (!e.enemy || !e.alive || e.dying || e.ghostOff || !overlap(bt, e)) continue;
        if (e.boss) this.damageBoss(e); else { this.flipKill(e); Ach.add('bats'); }
        bt.life = 0; break;
      }
      if (bt.life <= 0) for (let k = 0; k < 3; k++) this.parts.push({ k: 'spark', x: bt.x - 2 + k * 2, y: bt.y - 2, life: 8 });
    }
    this.bats = this.bats.filter((bt) => bt.life > 0 && bt.x > this.cam.x - 40 && bt.x < this.cam.x + VW + 40 && bt.y > -40 && bt.y < VH + 20);
  }
  drawBat(bt, cx) {
    const x = Math.round(bt.x - cx), y = Math.round(bt.y), up = (bt.t >> 2) & 1, f = bt.vx < 0 ? -1 : 1;
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 1, y + 1, 5, 4);
    ctx.fillStyle = '#9a4ae8';
    if (up) { ctx.fillRect(x - 3, y - 1, 4, 2); ctx.fillRect(x + 6, y - 1, 4, 2); ctx.fillRect(x - 4, y - 3, 2, 2); ctx.fillRect(x + 9, y - 3, 2, 2); } else { ctx.fillRect(x - 3, y + 3, 4, 2); ctx.fillRect(x + 6, y + 3, 4, 2); ctx.fillRect(x - 4, y + 5, 2, 1); ctx.fillRect(x + 9, y + 5, 2, 1); }
    ctx.fillStyle = '#6a2ab8'; ctx.fillRect(x + 2, y + 2, 3, 2);
    ctx.fillStyle = '#ff4aa8'; ctx.fillRect(x + (f > 0 ? 4 : 2), y + 2, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x + 5, y, 1, 1);
  }
  updateBalls() {
    for (const bl of this.balls) {
      bl.fuse--; bl.spin += bl.vx * 0.25;
      bl.vy = Math.min(5, bl.vy + 0.3);
      const wasGround = bl.onGround;
      this.move(bl, true);
      if (bl.onGround && !wasGround && bl.vy === 0 && bl.bounced !== true) { bl.vy = -1.2; bl.bounced = true; }
      if (bl.hitWall || bl.ceil || bl.fuse <= 0) { this.explode(bl.x + 4, bl.y + 4); bl.dead = true; continue; }
      if (bl.y > VH + 16) { bl.dead = true; continue; }
      for (const e of this.ents) {
        if (!e.enemy || !e.alive || e.dying || !overlap(bl, e)) continue;
        this.explode(bl.x + 4, bl.y + 4); bl.dead = true; break;
      }
    }
    this.balls = this.balls.filter((bl) => !bl.dead);
  }
  explode(x, y) {
    const R = 30;
    Audio8.sfx('boom'); this.shake = Math.max(this.shake, 10); rumble(0.5, 140);
    this.parts.push({ k: 'blast', x, y, life: 24 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; this.parts.push({ k: 'dust', x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 8, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2 - 0.4, life: 18 }); }
    for (const e of this.ents) {
      if (!e.enemy || !e.alive || e.dying) continue;
      const dx = e.x + e.w / 2 - x, dy = e.y + e.h / 2 - y;
      if (dx * dx + dy * dy > (R + e.w / 2) ** 2) continue;
      if (e.boss) this.damageBoss(e); else this.flipKill(e);
    }
    for (let ty = Math.floor((y - R) / TS); ty <= Math.floor((y + R) / TS); ty++) {
      for (let tx = Math.floor((x - R) / TS); tx <= Math.floor((x + R) / TS); tx++) {
        if (this.tile(tx, ty) !== 'B' && this.tile(tx, ty) !== 'R') continue;
        if (this.tile(tx, ty) === 'R') this.crackReward(tx, ty);
        const dx = tx * TS + 8 - x, dy = ty * TS + 8 - y;
        if (dx * dx + dy * dy > R * R) continue;
        this.setTile(tx, ty, '.'); this.addScore(50);
        for (const [ox, oy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: tx * TS + ox, y: ty * TS + oy, vx, vy, g: 0.3, life: 70 });
      }
    }
  }
  drawBall(bl, cx) {
    const x = Math.round(bl.x - cx), y = Math.round(bl.y);
    const warn = bl.fuse < 45 && (bl.fuse >> 2) % 2 === 0;
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 2, y, 4, 8); ctx.fillRect(x, y + 2, 8, 4); ctx.fillRect(x + 1, y + 1, 6, 6);
    ctx.fillStyle = warn ? '#e83030' : '#3a3a4a'; ctx.fillRect(x + 2, y + 1, 4, 6); ctx.fillRect(x + 1, y + 2, 6, 4);
    // rolling highlight
    const a = bl.spin, hx = Math.round(x + 3.5 + Math.cos(a) * 1.8), hy = Math.round(y + 3.5 + Math.sin(a) * 1.8);
    ctx.fillStyle = warn ? '#ffb0a0' : '#a8a8c0'; ctx.fillRect(hx, hy, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 2, 1, 1);
    // fuse spark
    ctx.fillStyle = (frame >> 1) & 1 ? '#ffe040' : '#ff7020'; ctx.fillRect(x + 3 + Math.round(Math.cos(a + 1) * 3), y - 1 + Math.round(Math.sin(a + 1) * 1), 2, 2);
  }

  // ---------- drawing ----------
  draw() {
    const cx = Math.round(this.cam.x) + (this.shake && Settings.get('shake') ? ((this.shake & 2) ? 2 : -2) : 0);
    drawParallax(this.def.theme, cx);
    // items emerging from blocks are drawn behind the tiles
    for (const e of this.ents) if (e.item) this.drawEnt(e, cx);
    this.drawTiles(cx);
    for (const pl of this.platforms) this.drawPlatform(pl, cx);
    for (const e of this.ents) if (!e.item) { this.drawEnt(e, cx); if (e.iced) { const x = Math.round(e.x - cx) - 1, y = Math.round(e.y) - 2, w = e.w + 2, h = e.h + 3, warn = e.iced < 90 && !e.kick && (frame >> 2) & 1; ctx.fillStyle = warn ? 'rgba(255,255,255,0.55)' : 'rgba(150,215,255,0.6)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#e8f8ff'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 2, 4, 2); ctx.fillRect(x + 2, y + 4, 2, 2); } }
    if (this.freezeT > 0) {
      ctx.fillStyle = 'rgba(140,190,255,0.12)'; ctx.fillRect(0, 0, VW, VH);
      if (this.freezeT > 60 || (frame >> 2) & 1) for (const e of this.ents) if (e.enemy && !e.dying) { const x = Math.round(e.x + e.w / 2 - cx); ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 4, e.y - 10, 9, 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, e.y - 9, 2, 6); ctx.fillRect(x + 1, e.y - 9, 2, 6); }
    }
    if (this.ghost && this.ta) {
      const g = this.ghost[Math.min(this.ghost.length - 1, this.taT >> 1)];
      if (g) { ctx.save(); ctx.globalAlpha = 0.4; Wally.draw(ctx, g[0] + this.p.w / 2 - cx, g[1] + this.p.h, g[2], g[3], { t: frame, ghost: true }); ctx.restore(); if (this.taT < 120) txt('GHOST', Math.round(g[0] + this.p.w / 2 - cx), Math.round(g[1]) - 12, '#a0c8ff', { align: 'center', outline: '#101848' }); }
    }
    this.drawPlayer(cx);
    if (this.def.theme === 'snow') drawSnow(cx);
    this.drawWeather(cx);
    if (this.def.water) {
      ctx.fillStyle = 'rgba(40,120,220,0.13)'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(220,245,255,0.7)';
      for (let i = 0; i < 24; i++) { const bx = (((i * 61 - cx * 0.3 + Math.sin(frame * 0.03 + i) * 4) % VW) + VW) % VW, by = VH - ((i * 47 + frame * (0.4 + (i % 3) * 0.2)) % VH); ctx.fillRect(Math.round(bx), Math.round(by), 2, 2); }
    }
    if (this.def.dark || (this.def.darkCols && this.def.darkCols.has(Math.floor((this.p.x + this.p.w / 2) / TS)))) { // spooky: only a pool of light around WallyMan, with the odd lightning flash
      const lf = frame % 420, flash = lf < 5 || (lf > 10 && lf < 14);
      if (lf === 0 && !this.paused && this.lightning) this.lightning();
      if (!flash) {
        const px = this.p.x + this.p.w / 2 - cx, py = this.p.y + this.p.h / 2;
        const gr = ctx.createRadialGradient(px, py, 34, px, py, 118);
        gr.addColorStop(0, 'rgba(10,0,24,0)'); gr.addColorStop(1, 'rgba(10,0,24,0.8)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
      } else { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, VW, VH); }
    }
    for (const g of this.pings) this.drawPing(g, cx);
    for (const bl of this.balls) this.drawBall(bl, cx);
    for (const f of this.fires) { const x = Math.round(f.x - cx), y = Math.round(f.y);
      if (f.frost) { ctx.fillStyle = 'rgba(200,240,255,0.8)'; ctx.fillRect(x, y + 1, 8, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2 + ((frame >> 1) & 1) * 2, y + 2, 2, 2); continue; } ctx.fillStyle = '#a02010'; ctx.fillRect(x - 1, y - 1, 10, 10); ctx.fillStyle = (frame >> 1) & 1 ? '#ff7020' : '#ffa030'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = '#ffe060'; ctx.fillRect(x + 2, y + 2, 4, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y + 3, 2, 2); }
    for (const bt of this.bats) this.drawBat(bt, cx);
    for (const q of this.parts) this.drawPart(q, cx);
    this.drawNight(cx);
    this.drawHUD();
    this.drawStars();
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, VH);
      drawWindow(44, 44, 168, 146);
      txt('PAUSED', 128, 58, '#ffe040', { scale: 2, align: 'center' });
      const labels = ['CONTINUE', 'MUSIC', 'SOUND FX', 'PHOTO MODE', 'RESTART LEVEL', 'RESTART CHECKPOINT', 'EXIT TO MAP', 'EXIT TO MAIN MENU'];
      labels.forEach((l, i) => {
        const y = 74 + i * 12, on = i === this.pauseSel;
        txt(l, 70, y, on ? '#ffe040' : '#fff');
        if (on) txt('>', 60 + ((frame >> 3) & 1), y, '#ffe040');
        if (i === 1 || i === 2) {
          const v = Math.round(Audio8.getVolume(i === 1 ? 'music' : 'sfx') * 5);
          for (let k = 0; k < 5; k++) { ctx.fillStyle = k < v ? (on ? '#ffe040' : '#5ff0ff') : '#3a3a58'; ctx.fillRect(130 + k * 9, y + 6 - k, 7, 2 + k); }
        }
      });
      txt('A: SELECT   < >: VOLUME', 128, 174, '#a8b0d8', { align: 'center' });
    }
  }
  drawTiles(cx) {
    const T = this.T, t0 = Math.floor(cx / TS), lavaF = (frame >> 3) % 4, bonusF = (frame >> 3) % 4;
    for (let ty = 0; ty < 14; ty++) for (let tx = t0; tx <= t0 + 16; tx++) {
      const c = this.tile(tx, ty);
      if (c === '.' || tx < 0 || tx >= this.lv.w) continue;
      let img = null, dy = 0;
      const bump = this.bumps.find((b) => b.tx === tx && b.ty === ty);
      if (bump) dy = -Math.round(Math.sin((bump.t / 10) * Math.PI) * 6);
      switch (c) {
        case '#': img = this.tile(tx, ty - 1) === '#' ? T.fill : T.top; break;
        case 'B': img = T.brick; break;
        case 'W': case 'P': case 'S': case 'O': case 'A': case 'V': case 'Q': case 'D': case 'N': case 'T': case 'E': case 'H': case 'F': case '+': case '}': case '?': img = T.bonus[bonusF]; break;
        case '`': img = this.tile(tx, ty - 1) === '#' || this.tile(tx, ty - 1) === '`' ? T.fill : T.top; break;
        case '/': { const X = tx * TS - cx, Y = ty * TS; ctx.fillStyle = '#1a1020'; for (let k = 0; k < 16; k++) ctx.fillRect(X + k, Y + 16 - k - 1, 16 - k, 1); ctx.fillStyle = '#e0f0ff'; for (let k = 1; k < 15; k++) ctx.fillRect(X + k, Y + 16 - k, 15 - k, 1); ctx.fillStyle = '#ff4060'; ctx.fillRect(X + 2, Y + 13, 12, 1); continue; }
        case '%': { const X = tx * TS - cx, Y = ty * TS; ctx.fillStyle = '#1a1020'; ctx.fillRect(X + 7, Y, 2, 6); ctx.fillStyle = '#c0c8d8'; ctx.fillRect(X + 3, Y + 5, 10, 2); ctx.fillRect(X + 3, Y + 12, 10, 2); ctx.fillRect(X + 3, Y + 5, 2, 9); ctx.fillRect(X + 11, Y + 5, 2, 9); ctx.fillStyle = (frame >> 4) & 1 ? '#ffe040' : '#ffffff'; ctx.fillRect(X + 4, Y + 6, 1, 1); continue; }
        case '_': { const X = tx * TS - cx, Y = ty * TS; ctx.fillStyle = '#6a4a2a'; for (let k = 0; k < 16; k += 5) ctx.fillRect(X + k, Y + 13, 3, 3); ctx.fillStyle = '#b0b8c8'; ctx.fillRect(X, Y + 12, 16, 1); continue; }
        case '!': { if ((tx + ty + (frame >> 3)) % 4 === 0) { ctx.fillStyle = 'rgba(255,120,255,0.18)'; ctx.fillRect(tx * TS - cx, ty * TS, 16, 16); } if (ty === 2) { ctx.fillStyle = 'rgba(255,200,255,0.5)'; ctx.fillRect(tx * TS - cx, 32, 16, 1); } continue; }
        case '~': { const X = tx * TS - cx, Y = ty * TS; ctx.fillStyle = 'rgba(40,120,220,0.45)'; ctx.fillRect(X, Y, 16, 16); if (this.tile(tx, ty - 1) !== '~') { ctx.fillStyle = 'rgba(200,240,255,0.8)'; ctx.fillRect(X, Y + ((frame >> 4) + tx) % 2, 16, 1); } continue; }
        case '|': { const X = tx * TS - cx, Y = ty * TS; ctx.fillStyle = '#1e6a28'; ctx.fillRect(X + 6, Y, 4, 16); ctx.fillStyle = '#3aaa48'; ctx.fillRect(X + 7, Y, 2, 16); ctx.fillStyle = '#5ad060'; ctx.fillRect(X + (ty % 2 ? 9 : 3), Y + 4, 4, 3); continue; }
        case '$': { const X = tx * TS - cx, Y = ty * TS, top = this.tile(tx, ty - 1) !== '$'; ctx.fillStyle = '#d8a858'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#b88838'; for (let k = 0; k < 4; k++) ctx.fillRect(X + ((k * 5 + ty * 3 + (frame >> 4)) % 14), Y + 2 + k * 4, 2, 1); if (top) { ctx.fillStyle = '#f0c878'; ctx.fillRect(X, Y, 16, 2); ctx.fillStyle = '#c89040'; ctx.fillRect(X + ((frame >> 3) % 12), Y + 1, 3, 1); } continue; }
        case ':': { if ((tx + ty + (frame >> 3)) % 5 === 0) { const X = tx * TS - cx, Y = ty * TS; ctx.fillStyle = 'rgba(200,140,255,0.45)'; ctx.fillRect(X + 7, Y + 4, 2, 8); ctx.fillRect(X + 5, Y + 6, 6, 2); ctx.fillRect(X + 6, Y + 5, 4, 1); } continue; }
        case '[': case '(': case ']': case ')': { const X = tx * TS - cx, Y = ty * TS, red = c === '[' || c === '(', solid = c === '[' || c === ']', col = red ? '#e83850' : '#3a80e8', lt = red ? '#ff98a8' : '#98c8ff'; if (solid) { ctx.fillStyle = '#1a1020'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = col; ctx.fillRect(X + 1, Y + 1, 14, 14); ctx.fillStyle = lt; ctx.fillRect(X + 2, Y + 2, 12, 2); ctx.fillRect(X + 2, Y + 2, 2, 12); } else { ctx.fillStyle = col; for (let k = 0; k < 16; k += 4) { ctx.fillRect(X + k, Y, 2, 1); ctx.fillRect(X + k, Y + 15, 2, 1); ctx.fillRect(X, Y + k, 1, 2); ctx.fillRect(X + 15, Y + k, 1, 2); } } continue; }
        case '{': { const X = tx * TS - cx, Y = ty * TS, on = !this.switchOff; ctx.fillStyle = '#1a1020'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = on ? '#e83850' : '#3a80e8'; ctx.fillRect(X + 1, Y + 1, 14, 14); ctx.fillStyle = '#ffffff'; Font.draw(ctx, on ? 'ON' : 'OF', X + 8, Y + 5, { color: '#ffffff', align: 'center' }); continue; }
        case 'Y': { // warp pipe
          const X = tx * TS - cx, Y = ty * TS, left = this.tile(tx - 1, ty) !== 'Y', lip = this.tile(tx, ty - 1) !== 'Y';
          ctx.fillStyle = '#0a3a14'; ctx.fillRect(X, Y, 16, 16);
          ctx.fillStyle = '#2eb84a'; ctx.fillRect(left ? X + 3 : X, Y, left ? 13 : 13, 16);
          ctx.fillStyle = '#8af0a0'; if (left) ctx.fillRect(X + 5, Y, 3, 16); ctx.fillStyle = '#1a7a2e'; if (!left) ctx.fillRect(X + 9, Y, 3, 16);
          if (lip) { ctx.fillStyle = '#0a3a14'; ctx.fillRect(left ? X : X, Y, 16, 7); ctx.fillStyle = '#3ad85a'; ctx.fillRect(left ? X + 1 : X, Y + 1, 15, 5); ctx.fillStyle = '#a0ffb0'; if (left) ctx.fillRect(X + 3, Y + 2, 4, 3); }
          if (lip && left && this.def && this.def.warp) { const by = Y - 14 + ((frame >> 4) & 1); ctx.fillStyle = '#ffe040'; ctx.fillRect(X + 13, by, 6, 6); ctx.fillRect(X + 11, by + 6, 10, 2); ctx.fillRect(X + 13, by + 8, 6, 1); ctx.fillRect(X + 15, by + 9, 2, 1); }
          continue;
        }
        case 'U': img = T.used; break;
        case 'X': img = T.solid; break;
        case '=': img = T.oneway; break;
        case '^': img = T.spikes; break;
        case '<': case '>': {
          const X = tx * TS - cx, Y = ty * TS, d = c === '>' ? 1 : -1, off = ((((frame >> 1) * d) % 8) + 8) % 8;
          ctx.fillStyle = '#1a1020'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#5a6070'; ctx.fillRect(X, Y + 1, 16, 14); ctx.fillStyle = '#2a3040'; ctx.fillRect(X, Y + 4, 16, 8);
          ctx.fillStyle = '#ffd040'; for (let k = -1; k < 2; k++) for (let j = 0; j < 3; j++) { const ax = X + k * 8 + off + (d > 0 ? j : 2 - j); if (ax >= X && ax < X + 16) { ctx.fillRect(ax, Y + 5 + j, 1, 1); ctx.fillRect(ax, Y + 10 - j, 1, 1); } }
          ctx.fillStyle = '#b0b8c8'; ctx.fillRect(X, Y + 1, 16, 1); ctx.fillStyle = '#3a4050'; ctx.fillRect(X + 2, Y + 13, 3, 3); ctx.fillRect(X + 11, Y + 13, 3, 3);
          continue;
        }
        case 'J': img = T.spring[bump && bump.t < 6 ? 1 : 0]; dy = 0; break;
        case 'L': img = this.tile(tx, ty - 1) === 'L' ? T.lavaFill : T.lava[lavaF]; break;
        case 'o': {
          const w = [8, 6, 2, 6][(frame >> 3) % 4];
          ctx.drawImage(Sprites.coin, tx * TS - cx + 8 - w / 2, ty * TS + 1, w, 14); continue;
        }
      }
      if (c === 'R') img = T.solid;
      if (img) ctx.drawImage(img, tx * TS - cx, ty * TS + dy);
      if (c === 'R') { const X = tx * TS - cx, Y = ty * TS; ctx.fillStyle = '#1a1020'; ctx.fillRect(X + 4, Y + 3, 1, 4); ctx.fillRect(X + 5, Y + 6, 3, 1); ctx.fillRect(X + 8, Y + 7, 1, 5); ctx.fillRect(X + 11, Y + 2, 1, 3); ctx.fillRect(X + 10, Y + 10, 3, 1); }
      if (c === '#') {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        if (this.tile(tx - 1, ty) !== '#' && tx > 0) ctx.fillRect(tx * TS - cx, ty * TS, 2, 16);
        if (this.tile(tx + 1, ty) !== '#' && tx < this.lv.w - 1) ctx.fillRect(tx * TS - cx + 14, ty * TS, 2, 16);
      }
    }
  }
  drawPlatform(pl, cx) {
    const x = Math.round(pl.x - cx), y = Math.round(pl.y);
    for (let i = 0; i < 3; i++) ctx.drawImage(this.T.oneway, x + i * 16, y);
    ctx.fillStyle = this.def.theme === 'sky' ? '#f0a0b8' : '#e8c040';
    ctx.fillRect(x + 2, y + 1, 2, 2); ctx.fillRect(x + 44, y + 1, 2, 2);
  }
  drawPlayer(cx) {
    const p = this.p, fx = p.x + p.w / 2 - cx, fy = p.y + p.h;
    const signal = p.power === 'signal';
    if (this.state === 'dying') {
      const t = this.stateT;
      ctx.save(); ctx.translate(Math.round(fx), Math.round(fy - 11));
      if (t > 30) ctx.rotate(Math.floor((t - 30) / 6) * (Math.PI / 2) * p.face);
      Wally.draw(ctx, 0, 11, 'hurt', p.face, { t: frame });
      ctx.restore(); return;
    }
    // speed trail
    p.trail.forEach((g, i) => {
      ctx.save(); ctx.globalAlpha = 0.35 - i * 0.1;
      Wally.draw(ctx, g.x + p.w / 2 - cx, g.y + p.h, g.pose, g.face, { t: frame, signal, ghost: true });
      ctx.restore();
    });
    if (p.inv > 0 && p.hurtT <= 0 && (frame >> 2) % 2) return;
    if (p.riding) {
      const face = p.face, moving = p.onGround && Math.abs(p.vx) > 0.15;
      const di = p.fluttering ? 1 + ((frame >> 1) & 1) : !p.onGround ? 1 : moving ? 1 + (Math.floor(p.anim / 2) % 2) : 0;
      const lunge = p.chompT > 8 ? face * 3 : 0, bob = !p.onGround || moving || ((frame >> 4) & 1) === 0 ? 0 : 1;
      const dx = Math.round(fx - 12 + lunge), dy = Math.round(fy - 22);
      const dimg = Sprites.dinos[p.dinoKind || 'teal'][face > 0 ? 'r' : 'l'][di];
      ctx.drawImage(dimg, dx, dy);
      Wally.draw(ctx, dx + (face > 0 ? 9 : 15), dy + 20 + bob + (di === 2 ? 1 : 0), 'ride', face, {
        t: frame, signal, white: p.charge > 0 && (frame >> 2) % 2 === 0, glow: p.charge > 0 ? 0.7 : signal ? 0.25 + 0.2 * Math.sin(frame * 0.15) : 0,
      });
      // Dino's head and neck sit in front of the rider
      if (face > 0) ctx.drawImage(dimg, 13, 0, 11, 8, dx + 13, dy, 11, 8); else ctx.drawImage(dimg, 0, 0, 11, 8, dx, dy, 11, 8);
      this.drawShield(fx, fy - 16);
      if (p.chompT > 6) { // chomp swoosh
        ctx.fillStyle = '#ffffff';
        const sx0 = face > 0 ? dx + 24 : dx - 6;
        for (let k = 0; k < 6; k++) ctx.fillRect(sx0 + (face > 0 ? Math.round(Math.sin(k * 0.6) * 5) : -Math.round(Math.sin(k * 0.6) * 5)), dy + 2 + k * 3, 2, 2);
      }
      return;
    }
    const pose = this.playerPose();
    const face = p.skid ? -p.face : p.face;
    if (p.warpT) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, Math.round((p.y + p.h - p.warpT * 0.6) / TS) * TS); ctx.clip(); }
    const tz = p.tiny ? (p.tiny < 90 && (frame >> 2) & 1 ? 0.8 : 0.55) : 1;
    Wally.draw(ctx, fx, fy, pose, face, {
      t: frame, sx: (p.sx || 1) * tz, sy: (p.sy || 1) * tz, signal, white: p.hurtT > 18 || (p.charge > 0 && (frame >> 2) % 2 === 0),
      glow: p.frozen > 0 ? 0.9 : p.charge > 0 ? 0.7 : signal ? 0.25 + 0.2 * Math.sin(frame * 0.15) : 0,
    });
    if (p.warpT) ctx.restore();
    this.drawShield(fx, fy - p.h / 2);
  }
  drawShield(x, y) {
    const p = this.p; if (!p.shield) return;
    const r = (p.riding ? 20 : p.tiny ? 10 : 15) + Math.sin(frame * 0.15);
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#a0dcff'; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#5ff0ff'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x - r * 0.5), Math.round(y - r * 0.6), 3, 2); ctx.restore();
  }
  drawPing(g, cx) {
    const x = Math.round(g.x - cx), y = Math.round(g.y);
    ctx.fillStyle = (frame >> 1) & 1 ? '#5ff0ff' : '#ffffff';
    const d = Math.sign(g.vx);
    for (let k = 0; k < 3; k++) {
      const ox = x + 4 + d * k * 3, h = 2 + k * 2;
      ctx.fillRect(ox, y + 4 - h, 1, h * 2);
    }
  }
  drawEnt(e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y), f = (e.t >> 3) & 1;
    if (x < -48 || x > VW + 48) return;
    const flipY = e.dying === 'flip';
    const put = (img, dx, dy) => {
      if (flipY) { ctx.save(); ctx.translate(x + dx, y + dy + img.height); ctx.scale(1, -1); ctx.drawImage(img, 0, 0); ctx.restore(); } else ctx.drawImage(img, x + dx, y + dy);
    };
    switch (e.type) {
      case 'grumble':
        if (e.dying === 'squish') { ctx.drawImage(Sprites.grumble[0], x - 1, y + 8, 16, 8); break; }
        put(Sprites.grumble[f], -1, -2); break;
      case 'prickle': put(Sprites.prickle[e.vx > 0 ? 'r' : 'l'][f], -1, -2); break;
      case 'buzzer': put(Sprites.buzzer[e.vx > 0 ? 'r' : 'l'][(e.t >> 2) & 1], -1, -3); break;
      case 'hopper': put(Sprites.hopper[e.onGround ? 0 : 1], -1, -2); break;
      case 'drink': ctx.drawImage(Sprites.drink, x - 2, y - 1); break;
      case 'phone': {
        ctx.drawImage(Sprites.phone, x - 2, y - 1);
        if (!e.rise || e.rise <= 0) { ctx.fillStyle = '#5ff0ff'; const k = (e.t >> 3) % 3; ctx.fillRect(x + 11 + k * 2, y - 2 - k, 1, 3 + k); ctx.fillRect(x - 1 - k * 2, y - 2 - k, 1, 3 + k); }
        break;
      }
      case 'badge': ctx.drawImage(Sprites.badge, x - 2, y - 2); break;
      case 'magnet': ctx.drawImage(Sprites.magnet, x - 2, y - 2); break;
      case 'shrink': ctx.drawImage(Sprites.shrink, x - 2, y - 1 + Math.round(Math.sin(e.t * 0.1))); break;
      case 'shield': ctx.drawImage(Sprites.shield, x - 2, y - 2); break;
      case 'shroom': ctx.drawImage(Sprites.shroom, x - 2, y - 2); break;
      case 'ammo': ctx.drawImage(Sprites.ammo, x - 2, y - 2 + (e.rise > 0 ? 0 : Math.round(Math.sin(e.t * 0.1)))); break;
      case 'bat': put(Sprites.bat[e.state === 'hang' ? 1 : (e.t >> 3) & 1], -1, -3); break;
      case 'charger': put(Sprites.charger[e.vx > 0 ? 'r' : 'l'][(e.t >> (e.charge ? 2 : 3)) & 1], -1, -2); break;
      case 'turret': put(Sprites.turret[e.face > 0 ? 'r' : 'l'], -1, -2); if (e.cool < 25 && (frame >> 2) & 1) { ctx.fillStyle = '#ff3040'; ctx.fillRect(x + 6, y - 1, 3, 3); } break;
      case 'ufo': this.drawUfo(e, x, y); break;
      case 'bolt': ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y, 8, 6); ctx.fillRect(x, y - 1, 6, 8); ctx.fillStyle = (e.t >> 1) & 1 ? '#ffe040' : '#ff8030'; ctx.fillRect(x, y, 6, 6); ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y + 1, 2, 2); break;
      case 'dino': {
        const face = e.state === 'flee' ? Math.sign(e.vx) || 1 : (this.p.x < e.x ? -1 : 1);
        const di = e.state === 'flee' ? 1 + ((e.t >> 3) & 1) : 0;
        ctx.drawImage(Sprites.dinos[e.kind || 'teal'][face > 0 ? 'r' : 'l'][di], x - 4, y - 2 + (e.state === 'wait' && (e.t >> 4) & 1 ? 1 : 0));
        if (e.state === 'wait' && e.rise <= 0 && (e.t >> 5) % 2 === 0) txt('!', x + 6, y - 12, '#ffe040', { outline: '#1a1020' });
        break;
      }
      case 'sigbar': { const bob = Math.round(Math.sin(e.t * 0.1) * 1.5), on = e.got ? ['#5a6a80', '#7a8aa0'] : ['#20c070', '#80ffb0'];
        for (let i = 0; i < 4; i++) { const h = 4 + i * 3; ctx.fillStyle = '#10182a'; ctx.fillRect(x + i * 3 - 1, y + 13 - h + bob - 1, 4, h + 2); ctx.fillStyle = on[0]; ctx.fillRect(x + i * 3, y + 13 - h + bob, 2, h); ctx.fillStyle = on[1]; ctx.fillRect(x + i * 3, y + 13 - h + bob, 1, h); }
        if (!e.got && (frame >> 2) % 8 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 10, y + bob, 1, 3); ctx.fillRect(x + 9, y + 1 + bob, 3, 1); } break; }
      case 'medal': ctx.drawImage(e.got ? Sprites.medalGhost : Sprites.medal, x - 2, y - 1 + Math.round(Math.sin(e.t * 0.08) * 1.5)); if (!e.got && (frame >> 3) % 6 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y + 3, 1, 3); ctx.fillRect(x + 7, y + 4, 3, 1); } break;
      case 'fish': put(Sprites.fish[e.vx > 0 ? 'r' : 'l'][(e.t >> 3) & 1], -1, -3); break;
      case 'jelly': put(Sprites.jelly[(e.t >> 4) & 1], -1, -1); break;
      case 'ghost': ctx.save(); ctx.globalAlpha = e.dying ? 1 : e.fade ?? 1; put(Sprites.ghost[this.p.x < e.x ? 'l' : 'r'][(e.t >> 4) & 1], -1, -1); ctx.restore(); break;
      case 'crab': if (e.dying) { ctx.save(); ctx.translate(x + 17, y + 10); ctx.scale(1, -1); this.drawCrab(e, -17, -10); ctx.restore(); } else this.drawCrab(e, x, y); break;
      case 'mole': this.drawMole(e, x, y); break;
      case 'dragon': if (!e.dying) this.drawDragon(e, x, y, cx); else { ctx.fillStyle = '#f4f0ff'; ctx.fillRect(x, y, 28, 12); } break;
      case 'blob': if (e.y < e.oy - 2) { ctx.fillStyle = '#a02010'; ctx.fillRect(x - 1, y - 1, 12, 12); ctx.fillStyle = (e.t >> 2) & 1 ? '#ff7020' : '#ffa030'; ctx.fillRect(x, y, 10, 10); ctx.fillStyle = '#ffe060'; ctx.fillRect(x + 2, y + 1, 6, 3); ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 2, y + 5, 2, 2); ctx.fillRect(x + 6, y + 5, 2, 2); } break;
      case 'zap': ctx.fillStyle = (e.t >> 1) & 1 ? '#ffffff' : '#ffe040'; ctx.fillRect(x + 2, y, 2, 3); ctx.fillRect(x, y + 3, 4, 2); ctx.fillRect(x + 2, y + 5, 3, 2); ctx.fillRect(x + 1, y + 7, 2, 2); break;
      case 'rock': ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y, 10, 8); ctx.fillRect(x, y - 1, 8, 10); ctx.fillStyle = '#8a7a6a'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = '#b8a890'; ctx.fillRect(x + 1, y + 1, 3, 3); break;
      case 'yeti': if (e.dying) { ctx.save(); ctx.translate(x + 14, y + 15); ctx.scale(1, -1); this.drawYeti(e, -14, -15); ctx.restore(); } else this.drawYeti(e, x, y); break;
      case 'snowball': ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y, 10, 8); ctx.fillRect(x, y - 1, 8, 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = '#c8d8f0'; ctx.fillRect(x + 4, y + 4, 4, 4); break;
      case 'bomb': ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y + 1, 8, 7); ctx.fillRect(x + 1, y, 6, 9); ctx.fillStyle = '#4a4a5a'; ctx.fillRect(x + 1, y + 2, 6, 5); ctx.fillStyle = (frame >> 1) & 1 ? '#ffe040' : '#ff6020'; ctx.fillRect(x + 3, y - 2, 2, 2); break;
      case 'secret': {
        const glow = (frame >> 3) % 4;
        ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 18, 26);
        ctx.fillStyle = '#8a3ac8'; ctx.fillRect(x, y, 16, 24); ctx.fillStyle = '#c070ff'; ctx.fillRect(x + 2, y + 2, 12, 22);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 2, y + 2, 12, 2); ctx.fillRect(x + 10, y + 12, 2, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3 + glow * 6, y - 4 - (glow & 1) * 2, 1, 3); ctx.fillRect(x - 4 + glow * 6, y - 3 - (glow & 1) * 2, 3, 1);
        txt('?', x + 5, y + 6, '#ffffff');
        break;
      }
      case 'battery': ctx.drawImage(Sprites.battery, x - 2, y - 1); break;
      case 'boots': ctx.drawImage(Sprites.boots, x - 2, y - 1); break;
      case 'orb': { // Special Orb: glows in the hero's colour, shows their special
        const by = y + Math.round(Math.sin(e.t * 0.08) * 2), goth = heroOf() === 'goth', dg = heroOf() === 'doug', col = goth ? '#ff4aa8' : dg ? '#ffd040' : '#5ff0ff', dark = goth ? '#6a1a5a' : dg ? '#6a4a10' : '#1a5a7a';
        ctx.fillStyle = (frame >> 3) & 1 ? col : '#ffffff'; ctx.fillRect(x + 5, by - 3, 2, 2); ctx.fillRect(x - 2, by + 5, 2, 2); ctx.fillRect(x + 12, by + 9, 2, 2);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 1, by, 10, 12); ctx.fillRect(x, by + 1, 12, 10);
        ctx.fillStyle = dark; ctx.fillRect(x + 1, by + 1, 10, 10); ctx.fillStyle = col; ctx.fillRect(x + 2, by + 2, 8, 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, by + 3, 2, 2);
        if (dg) { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 4, by + 3, 2, 6); ctx.fillRect(x + 7, by + 3, 2, 6); } else if (goth) { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 4, by + 5, 4, 3); ctx.fillRect(x + 2, by + 4, 2, 2); ctx.fillRect(x + 8, by + 4, 2, 2); } else { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 5, by + 7, 2, 2); ctx.fillRect(x + 4, by + 4, 1, 3); ctx.fillRect(x + 7, by + 4, 1, 3); }
        break;
      }
      case 'spark': {
        ctx.fillStyle = (e.t >> 1) & 1 ? '#ffffff' : '#ffe040';
        ctx.fillRect(x + 3, y, 2, 3); ctx.fillRect(x + 1, y + 3, 4, 2); ctx.fillRect(x + 3, y + 5, 4, 2); ctx.fillRect(x + 2, y + 7, 2, 3);
        ctx.fillStyle = '#5ff0ff'; ctx.fillRect(x + (e.t % 8), y + 9, 1, 1);
        break;
      }
      case 'checkpoint': {
        ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 2, y, 3, 32); ctx.fillStyle = '#d8d8e8'; ctx.fillRect(x + 3, y, 1, 32);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 1, y - 2, 5, 3);
        const wave = (frame >> 3) & 1;
        ctx.fillStyle = e.on ? '#3ce060' : '#e83850';
        ctx.fillRect(x + 5, y + 2, 10, 7 + wave); ctx.fillRect(x + 15, y + 3 + wave, 2, 5);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y + 4, 4, 3);
        break;
      }
      case 'goal': this.drawTower(x - 2, y); break;
      case 'boss': this.drawBoss(e, x - 2, y - 2); break;
    }
  }
  drawTower(x, y) {
    // the Signal Tower: touch it to finish the level
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 1, y + 8, 14, 88);
    ctx.fillStyle = '#c8ccd8';
    ctx.fillRect(x + 2, y + 8, 2, 88); ctx.fillRect(x + 12, y + 8, 2, 88);
    for (let k = 0; k < 11; k++) {
      const yy = y + 10 + k * 8;
      for (let i = 0; i < 8; i++) { ctx.fillRect(x + 4 + i, yy + (k % 2 ? i : 7 - i), 1, 1); }
    }
    ctx.fillStyle = '#e83850'; ctx.fillRect(x + 1, y + 30, 14, 3); ctx.fillRect(x + 1, y + 62, 14, 3);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 7, y - 4, 2, 12);
    const on = (frame >> 4) & 1;
    ctx.fillStyle = on ? '#ff3040' : '#801020'; ctx.fillRect(x + 5, y - 8, 6, 5);
    if (on) { ctx.fillStyle = '#ffd0d0'; ctx.fillRect(x + 6, y - 7, 2, 2); }
    ctx.fillStyle = '#5ff0ff';
    const k = (frame >> 3) % 4;
    for (let r = 0; r <= k; r++) { ctx.fillRect(x + 13 + r * 4, y - 9 - r, 1, 6 + r * 2); ctx.fillRect(x + 2 - r * 4, y - 9 - r, 1, 6 + r * 2); }
  }
  drawBoss(e, x, y) {
    if (e.kind === 'mother') return this.drawMother(e, x + 2, y + 2);
    if (e.inv > 0 && (frame >> 2) % 2) return;
    // antenna
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 8, y - 6, 1, 7); ctx.fillRect(x + 23, y - 6, 1, 7);
    ctx.fillStyle = (frame >> 3) & 1 ? '#ff3040' : '#ffe040'; ctx.fillRect(x + 7, y - 8, 3, 3); ctx.fillRect(x + 22, y - 8, 3, 3);
    // TV head
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y, 32, 18);
    ctx.fillStyle = '#8a5a3a'; ctx.fillRect(x + 1, y + 1, 30, 16);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + 1, y + 15, 30, 2);
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x + 3, y + 3, 22, 12);
    for (let i = 0; i < 40; i++) { const v = (Math.random() * 200 + 40) | 0; ctx.fillStyle = `rgb(${v},${v},${v + 20})`; ctx.fillRect(x + 3 + ((Math.random() * 22) | 0), y + 3 + ((Math.random() * 12) | 0), 2, 1); }
    ctx.fillStyle = e.hp < e.maxHp ? '#ff3040' : '#ff8030';
    ctx.fillRect(x + 7, y + 6, 4, 3); ctx.fillRect(x + 17, y + 6, 4, 3);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 6, y + 5, 6, 1); ctx.fillRect(x + 16, y + 5, 6, 1); ctx.fillRect(x + 9, y + 11, 10, 2);
    ctx.fillStyle = '#c8ccd8'; ctx.fillRect(x + 27, y + 4, 2, 2); ctx.fillRect(x + 27, y + 9, 2, 2);
    // body
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 5, y + 18, 22, 8);
    ctx.fillStyle = '#6a6a80'; ctx.fillRect(x + 6, y + 18, 20, 7);
    ctx.fillStyle = '#ffe040'; ctx.fillRect(x + 15, y + 19, 2, 2); ctx.fillRect(x + 14, y + 21, 2, 2); ctx.fillRect(x + 16, y + 22, 2, 2);
    // treads
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 2, y + 25, 28, 7);
    ctx.fillStyle = '#4a4a5a'; ctx.fillRect(x + 3, y + 26, 26, 5);
    ctx.fillStyle = '#9a9ab0'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 5 + ((i * 7 + (frame >> 2)) % 24), y + 27, 3, 3);
  }
  drawPart(q, cx) {
    const x = Math.round(q.fixed ? q.x : q.x - cx), y = Math.round(q.y);
    switch (q.k) {
      case 'text': txt(q.s, q.fixed ? 128 : x, y, '#fff', q.fixed ? { align: 'center', scale: 2, outline: '#000' } : {}); break;
      case 'coinpop': { const w = [8, 6, 2, 6][(q.life >> 2) % 4]; ctx.drawImage(Sprites.coin, x + 4 - w / 2, y, w, 14); break; }
      case 'frag': ctx.drawImage(this.T.brick, 0, 0, 6, 6, x, y, 6, 6); break;
      case 'star': ctx.fillStyle = '#fff'; { const r = 12 - q.life; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => ctx.fillRect(x + a * r, y + b * r, 2, 2)); } break;
      case 'spark': ctx.fillStyle = q.life & 2 ? '#fff' : '#ffe040'; ctx.fillRect(x + 3, y, 2, 8); ctx.fillRect(x, y + 3, 8, 2); break;
      case 'bubble': { const bx = x + Math.round(Math.sin((q.life + q.x) * 0.2) * 2); ctx.fillStyle = '#d8f4ff'; ctx.fillRect(bx, y, 3, 1); ctx.fillRect(bx, y + 2, 3, 1); ctx.fillRect(bx - 1, y + 1, 1, 1); ctx.fillRect(bx + 3, y + 1, 1, 1); break; }
      case 'flame': ctx.fillStyle = q.life > 8 ? '#ffe040' : '#ff7020'; ctx.fillRect(x - 1, y, 3, 3); break;
      case 'shock': {
        const k = 30 - q.life, r = 10 + k * 3.2;
        if (k < 3) { ctx.fillStyle = 'rgba(200,250,255,0.35)'; ctx.fillRect(0, 0, VW, VH); }
        for (const [rr, col] of [[r, k < 15 ? '#ffffff' : '#5ff0ff'], [r * 0.7, '#5ff0ff'], [r * 0.45, 'rgba(95,240,255,0.6)']]) {
          ctx.fillStyle = col;
          for (let a = 0; a < 48; a++) { const t2 = (a / 48) * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(t2) * rr) - 1, Math.round(y + Math.sin(t2) * rr * 0.8) - 1, 2, 2); }
        }
        break;
      }
      case 'blast': {
        const k = 24 - q.life, r = Math.min(30, 6 + k * 3);
        const ring = (rad, col) => { ctx.fillStyle = col; for (let a = 0; a < 32; a++) { const t = (a / 32) * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(t) * rad) - 1, Math.round(y + Math.sin(t) * rad * 0.85) - 1, 3, 3); } };
        if (k < 8) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r / 2, y - r / 2, r, r); ctx.fillStyle = '#ffe040'; ctx.fillRect(x - r / 2 - 2, y - r / 4, r + 4, r / 2); }
        ring(r, k < 10 ? '#ffe040' : '#ff7020');
        if (r > 10) ring(r - 6, k < 12 ? '#ff7020' : '#a03010');
        break;
      }
      case 'dust': {
        const r = Math.round(2 + (18 - q.life) / 5);
        ctx.save(); ctx.globalAlpha = Math.min(1, q.life / 10) * 0.85;
        ctx.fillStyle = this.def.theme === 'cave' || this.def.theme === 'castle' ? '#c8c0d8' : '#ffffff';
        ctx.fillRect(x - r, y - r + 1, r * 2, r * 2 - 2); ctx.fillRect(x - r + 1, y - r, r * 2 - 2, r * 2);
        ctx.restore(); break;
      }
      case 'boom': { const r = 20 - q.life; ctx.fillStyle = q.life & 2 ? '#ffe040' : '#ff6020'; ctx.fillRect(x - r / 2, y - r / 2, r, r); ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, 4, 4); break; }
    }
  }
  drawHUD() {
    const p = this.p;
    txt(HEROES[heroOf()].short || pname(), 8, 6, pname() === 'WALLY JR' ? '#5ad070' : HEROES[heroOf()].color);
    txt('*' + pad(Math.max(0, game.lives), 2), 14, 15, '#fff');
    for (let i = 0; i < 3; i++) ctx.drawImage(i < p.hearts ? Sprites.heart : Sprites.heartEmpty, 65 + i * 9, 6);
    { let ix = 86; if (p.power === 'signal') { ctx.drawImage(Sprites.miniPhone, ix, 15); ix += 6; } if (p.boots) { ctx.drawImage(Sprites.miniBoots, ix, 16); ix += 7; } if (p.charge > 0 && (p.charge > 120 || (frame >> 2) & 1)) { ctx.drawImage(Sprites.miniBattery, ix, 15); ix += 6; }
      const mini = (cols) => { ctx.fillStyle = '#1a1020'; ctx.fillRect(ix, 15, 6, 6); ctx.fillStyle = cols[0]; ctx.fillRect(ix + 1, 16, 2, 4); ctx.fillStyle = cols[1]; ctx.fillRect(ix + 3, 16, 2, 4); ix += 7; };
      if (p.magnet > 0 && (p.magnet > 120 || (frame >> 2) & 1)) mini(['#e83030', '#2f62d0']);
      if (p.tiny > 0 && (p.tiny > 120 || (frame >> 2) & 1)) mini(['#d0a0ff', '#9a4ae8']);
      if (p.shield) mini(['#a0dcff', '#5ff0ff']); }
    { // special attacks left
      const gx = 94, col = heroOf() === 'goth' ? '#ff4aa8' : heroOf() === 'doug' ? '#ffd040' : heroOf() === 'frost' ? '#a0e0ff' : '#5ff0ff';
      ctx.fillStyle = '#1a1020'; ctx.fillRect(gx, 6, 7, 7); ctx.fillStyle = p.special ? col : '#4a4a60'; ctx.fillRect(gx + 1, 7, 5, 5); ctx.fillStyle = '#1a1020'; ctx.fillRect(gx + 3, 8, 1, 3);
      txt(String(p.special), gx + 8, 6, p.special ? '#fff' : '#ff6060');
    }
    ctx.drawImage(Sprites.ballIcon, 62, 15); txt('*' + p.ammo, 70, 15, p.ammo ? '#fff' : '#ff6060');
    if (this.endless) { txt('DIST', 112, 6, '#5ff0ff'); txt(Math.floor(this.cam.x / 16) + 'M', 112, 15, '#fff'); } else if (this.ta || this.rush) { txt('TIME', 112, 6, '#5ff0ff'); txt(fmtTime(this.rush ? RUSH.frames : this.taT), 104, 15, '#fff'); } else {
    txt('TIME', 112, 6, '#ffe040');
    txt(pad(this.time, 3), 117, 15, this.time <= 20 && (frame >> 4) & 1 ? '#ff6060' : '#fff'); }
    ctx.drawImage(Sprites.coinIcon, 176, 6); txt('*' + pad(game.coins, 2), 183, 6, '#fff');
    txt(pad(game.score, 7), 206, 15, '#fff');
    if (!this.ta && !this.rush && !this.endless && !this.def.custom) for (let i = 0; i < 3; i++) { const got = (this.barsGot | (game.bars[this.li] | 0)) & (1 << i); ctx.fillStyle = got ? '#40e090' : '#3a4458'; ctx.fillRect(179 + i * 3, 21 - 2 - i * 2, 2, 2 + i * 2); }
    if (!this.ta && !this.rush && !this.endless) for (let i = 0; i < 5; i++) ctx.drawImage((this.medalsGot | game.medals[this.li]) & (1 << i) ? Sprites.miniMedal : Sprites.miniMedalOff, 146 + i * 6, 16);
    if (this.taReady > 0) txt(this.taReady > 20 ? 'READY...' : 'GO!', 128, 96, this.taReady > 20 ? '#fff' : '#ffe040', { scale: 3, align: 'center', outline: '#101848' });
    const yeti = this.arena && this.ents.find((e) => e.yeti && !e.dying);
    if (yeti) { const nm = yeti.mini || 'ICE YETI', bx = 14 + Font.width(nm); txt(nm, 8, 26, '#a0d8ff'); for (let i = 0; i < yeti.maxHp; i++) { ctx.fillStyle = i < yeti.hp ? '#5ff0ff' : '#203040'; ctx.fillRect(bx + i * 8, 27, 6, 5); } }
    if (this.def.boss && this.bossLock) {
      const b = this.ents.find((e) => e.boss);
      if (b) { const bn = this.def.bossName || 'BARON STATIC', bx = Math.max(84, 14 + Font.width(bn)); txt(bn, 8, 26, '#ff8080'); for (let i = 0; i < b.maxHp; i++) { ctx.fillStyle = i < b.hp ? '#ff3040' : '#402028'; ctx.fillRect(bx + i * 8, 27, 6, 5); } }
    }
  }
}

// =====================================================================
// Main loop (fixed 60 Hz update)
// =====================================================================
function resize() {
  const touch = document.body.classList.contains('touch');
  const availH = innerHeight - (touch && innerHeight > innerWidth ? 300 : 0);
  let s = Math.min(innerWidth / VW, availH / VH);
  if (s >= 2) s = Math.floor(s);
  cv.style.width = Math.floor(VW * s) + 'px';
  cv.style.height = Math.floor(VH * s) + 'px';
}
if ('ontouchstart' in window || (window.matchMedia && matchMedia('(pointer: coarse)').matches)) document.body.classList.add('touch');
addEventListener('resize', resize);
resize();

scene = TitleScene();
scene.enter();
let last = performance.now(), acc = 0;
function loopStep(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) {
    acc -= 1000 / 60;
    Input.poll();
    if (fadeDir === 1) { fade += 1 / 14; if (fade >= 1) { fade = 1; scene = nextScene(); if (scene.enter) scene.enter(); fadeDir = -1; } } else if (fadeDir === -1) { fade -= 1 / 14; if (fade <= 0) { fade = 0; fadeDir = 0; } }
    if (fadeDir !== 1) scene.update();
    frame++;
  }
  Wally.current = (game && game.costume) || 'classic';
  Wally.hero = heroOf(); Wally.hat = (game && game.hat) || 'none';
  scene.draw();
  if (Settings.get('crt')) ctx.drawImage(CRT, 0, 0);
  Ach.drawToast(); Sticker.drawFlash();
  if (fade > 0) {
    // SNES-style "iris" fade: a shrinking/growing circle mask
    const r = (1 - fade) * 190;
    ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.arc(128, 112, Math.max(0, r), 0, Math.PI * 2, true); ctx.fill(); ctx.restore();
  }
  }
// crash guard: if anything goes wrong, show a friendly screen instead of freezing
function OopsScene(err) {
  let t = 0;
  return {
    enter() { Audio8.stop(); },
    update() { t++; if (t > 30 && (Input.confirm() || Input.pressed('back'))) { try { Save.persist(); } catch (e) { /* ignore */ } go(() => TitleScene()); } },
    draw() {
      ctx.fillStyle = '#101848'; ctx.fillRect(0, 0, VW, VH);
      txt('OOPS!', 128, 60, '#ffe040', { scale: 3, align: 'center' });
      ['SOMETHING WENT WRONG THERE.', 'YOUR SAVE FILES ARE SAFE.', '', 'PRESS START TO GO BACK', 'TO THE TITLE SCREEN.'].forEach((l, k) => txt(l, 128, 100 + k * 12, '#fff', { align: 'center' }));
      txt(String((err && err.message) || err || '').toUpperCase().replace(/[^A-Z0-9 .,:()'-]/g, '').slice(0, 40), 128, 196, '#7880b0', { align: 'center' });
    },
  };
}
let crashes = 0;
function loop(now) {
  try { loopStep(now); } catch (e) {
    console.error(e); crashes++;
    try { fade = 0; fadeDir = 0; scene = crashes > 20 ? { update() {}, draw() {} } : OopsScene(e); if (scene.enter) scene.enter(); } catch (e2) { /* ignore */ }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
