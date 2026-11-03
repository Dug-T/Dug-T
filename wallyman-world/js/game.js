'use strict';
const VW = 256, VH = 224, TS = 16;
const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
let frame = 0;
const SOLID = new Set(['#', 'B', 'W', 'P', 'S', 'O', 'A', 'V', 'Q', 'D', 'U', 'X', '^', 'J']);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const txt = (s, x, y, color = '#fff', o = {}) => Font.draw(ctx, s, x, y, Object.assign({ color, shadow: '#000', sd: 1 }, o));
const pad = (n, l) => String(Math.max(0, n | 0)).padStart(l, '0');

// =====================================================================
// Input: keyboard, gamepad and on-screen touch buttons
// =====================================================================
const Input = (() => {
  const names = ['left', 'right', 'up', 'down', 'jump', 'run', 'special', 'start', 'back'];
  const st = {}, prev = {}, kb = {}, hit = {}, touch = {}, gp = {};
  names.forEach((n) => { st[n] = prev[n] = kb[n] = hit[n] = touch[n] = gp[n] = 0; });
  const map = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', Space: 'jump', KeyK: 'jump', KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'run', KeyC: 'special', KeyL: 'special',
    Enter: 'start', KeyP: 'start', Escape: 'back', Backspace: 'back',
  };
  const typed = [];
  addEventListener('keydown', (e) => { if (e.key && e.key.length === 1 && /[a-z0-9 .!-]/i.test(e.key)) typed.push(e.key.toUpperCase()); if (typed.length > 8) typed.shift(); const a = map[e.code]; if (a) { if (!e.repeat) hit[a] = 1; kb[a] = 1; e.preventDefault(); } Audio8.unlock(); });
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
    for (const p of pads) {
      if (!p) continue;
      const b = (i) => (p.buttons[i] && p.buttons[i].pressed ? 1 : 0);
      gp.jump |= b(0) | b(1); gp.run |= b(2) | b(6) | b(7); gp.special |= b(3) | b(4) | b(5); gp.start |= b(9); gp.back |= b(8);
      gp.up |= b(12) | (p.axes[1] < -0.5); gp.down |= b(13) | (p.axes[1] > 0.5);
      gp.left |= b(14) | (p.axes[0] < -0.5); gp.right |= b(15) | (p.axes[0] > 0.5);
    }
  }
  function poll() {
    pollPad();
    names.forEach((n) => { prev[n] = st[n]; st[n] = kb[n] || hit[n] || touch[n] || gp[n] ? 1 : 0; hit[n] = 0; });
  }
  return {
    poll, down: (k) => !!st[k], pressed: (k) => !!(st[k] && !prev[k]),
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
  slots.forEach((s) => { if (s) { s.cleared = Array.from({ length: 11 }, (_, i) => !!(s.cleared && s.cleared[i])); s.medals = Array.from({ length: 11 }, (_, i) => (s.medals && s.medals[i]) | 0); s.secrets = s.secrets || {}; s.costume = s.costume || 'classic'; s.players = s.players || 1; s.turn = s.turn || 0; } });
  return {
    slots,
    fresh: () => ({ players: 1, turn: 0, other: null, hero: 'wally', costume: 'classic', cleared: Array(11).fill(false), medals: Array(11).fill(0), secrets: {}, lives: 5, score: 0, coins: 0, node: 0, bonusAmmo: 0, startHearts: 0, startBoots: false }),
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

// ---------------- 2-player (taking turns) ----------------
const HEROES = {
  wally: { name: 'WALLYMAN', alt: 'WALLY JR', color: '#f2702a', lines: ['THE CAPED ALL-ROUNDER.', 'SPECIAL: SIGNAL SHOCKWAVE', 'KNOCKS OUT EVERYTHING NEAR!'] },
  goth: { name: 'GOTHCHICK', alt: 'GOTHCHICK', color: '#ff4aa8', lines: ['JUMPS HIGHER, GLIDES WHEN', 'YOU HOLD JUMP IN THE AIR.', 'SPECIAL: HOMING BAT SWARM!'] },
};
const heroOf = () => (game && game.hero) || 'wally';
function pname() {
  const h = HEROES[heroOf()];
  const twin = game && game.players === 2 && game.other && game.other.hero === heroOf();
  return twin && game.turn === 1 ? h.alt : h.name;
}
const lastHero = () => { try { return localStorage.getItem('wallyman-last-hero') || 'wally'; } catch (e) { return 'wally'; } };

// Character select: shown after picking a file (and again for player 2 in a 2-player game).
function HeroSelect(isNew, two, who = 0) {
  const ids = ['wally', 'goth'];
  let sel = Math.max(0, ids.indexOf(who === 0 ? game.hero || 'wally' : (game.other && game.other.hero) || 'wally')), t = 0;
  const done = () => go(() => (isNew ? StoryScene(() => MapScene()) : MapScene()));
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('left') || Input.pressed('right')) { sel ^= 1; Audio8.sfx('select'); }
      if (Input.pressed('back')) { go(() => TitleScene()); return; }
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
      ids.forEach((id, i) => {
        const cx = i ? 172 : 84, on = i === sel, x = cx - 40, y = 22;
        ctx.fillStyle = on ? ((t >> 3) & 1 ? '#ffe040' : '#ffa020') : '#101848'; ctx.fillRect(x - 3, y - 3, 86, 118);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 82, 114);
        const gr = ctx.createLinearGradient(0, y, 0, y + 112);
        gr.addColorStop(0, id === 'goth' ? '#3a1848' : '#5cb0f8'); gr.addColorStop(1, id === 'goth' ? '#120818' : '#c8ecff');
        ctx.fillStyle = gr; ctx.fillRect(x, y, 80, 112);
        const img = id === 'goth' ? Sprites.gothPortrait : Sprites.portrait;
        if (img.complete && img.naturalWidth) ctx.drawImage(img, Math.round(cx - img.naturalWidth / 2), y + 112 - img.naturalHeight - (id === 'goth' ? 6 : 2));
        if (!on) { ctx.fillStyle = 'rgba(16,24,72,0.45)'; ctx.fillRect(x, y, 80, 112); }
        txt(HEROES[id].name, cx, y + 116, on ? HEROES[id].color : '#c8d0f0', { align: 'center', outline: '#101848' });
        Wally.draw(ctx, cx, 182, on ? 'walk' + ((t >> 2) % 8) : 'idle' + ((t >> 4) % 4), 1, { t, hero: id, costume: 'classic' });
        if (on) txt('>', x - 12 + ((t >> 3) & 1), y + 50, '#ffe040', { scale: 2, outline: '#101848' });
      });
      drawWindow(16, 184, 224, 38);
      HEROES[ids[sel]].lines.forEach((l, k) => txt(l, 128, 190 + k * 10, '#fff', { align: 'center' }));
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
      if (Input.pressed('back') || Input.pressed('start') || Input.pressed('run')) { go(() => MapScene()); return; }
      if (Input.pressed('jump')) {
        const c = COSTUME_LIST[sel];
        if (c.ok()) { game.costume = c.id; Save.persist(); Audio8.sfx('power'); msg = 'LOOKING GOOD!'; } else { Audio8.sfx('bump'); msg = 'LOCKED!'; }
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
        const x = 12 + i * 34, y = 140, ok = k.ok();
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
const fmtTime = (f) => { const cs = Math.floor((f * 100) / 60); return `${Math.floor(cs / 6000)}:${pad(Math.floor(cs / 100) % 60, 2)}.${pad(cs % 100, 2)}`; };
function TimeAttackSelect(start) {
  const avail = (li) => Save.slots.some((s) => s && s.cleared && s.cleared[li]);
  let sel = start || 0, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % LEVELS.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + LEVELS.length - 1) % LEVELS.length; Audio8.sfx('select'); }
      if (Input.pressed('back')) { go(() => TitleScene()); return; }
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
      LEVELS.forEach((d, i) => {
        const y = 32 + i * 14, on = i === sel, ok = avail(i);
        if (on) txt('>', 20 + ((t >> 3) & 1), y, '#ffe040');
        txt((d.bonus ? 'B' + (i - 7) : String(i + 1)) + '. ' + (ok ? d.name : '???'), 30, y, on ? '#ffe040' : ok ? '#fff' : '#6870a0');
        txt(best[i] ? fmtTime(best[i]) : '-:--.--', 236, y, best[i] ? '#5ff0ff' : '#6870a0', { align: 'right' });
      });
      txt('BEAT A LEVEL IN ANY FILE TO UNLOCK IT', 128, 200, '#fff', { align: 'center', outline: '#101848' });
      txt('START: GO   ESC: BACK', 128, 212, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function TAResultScene(li, frames) {
  const best = taLoad(), old = best[li], record = !old || frames < old;
  if (record) { best[li] = frames; taSave(best); }
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
  }).concat(['TIME ATTACK', 'HIGH SCORES', `SOUND: ${Audio8.isEnabled() ? 'ON' : 'OFF'}`, eraseMode ? 'CANCEL ERASE' : 'ERASE FILE']);
  return {
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
        if (Input.pressed('down') || Input.pressed('up')) { psel ^= 1; Audio8.sfx('select'); }
        if (Input.pressed('back')) { mode = 'menu'; return; }
        if (Input.confirm()) {
          const { slot, isNew } = pick, two = psel === 1;
          if (isNew) Save.slots[slot] = Save.fresh();
          game = Save.slots[slot];
          if (two) { if (!game.other) game.other = { lives: 5, score: 0, coins: 0, costume: 'junior', out: false }; game.other.out = false; game.players = 2; } else { if (game.turn === 1 && game.other) swapPlayers(false); game.players = 1; game.other = null; game.turn = 0; }
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
            pick = { slot: sel, isNew: !Save.slots[sel] }; psel = Save.slots[sel] && Save.slots[sel].players === 2 ? 1 : 0;
            mode = 'players'; Audio8.sfx('confirm');
          }
        } else if (sel === 3) { Audio8.sfx('confirm'); go(() => TimeAttackSelect()); } else if (sel === 4) { Audio8.sfx('confirm'); go(() => HighScoreScene(null, () => TitleScene())); } else if (sel === 5) { Audio8.setEnabled(!Audio8.isEnabled()); Audio8.sfx('confirm'); } else { eraseMode = !eraseMode; Audio8.sfx('select'); }
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
        ['1 PLAYER GAME', '2 PLAYER GAME'].forEach((l, i) => { txt(l, 40, 134 + i * 16, i === psel ? '#ffe040' : '#fff'); if (i === psel) txt('>', 30 + ((t >> 3) & 1), 134 + i * 16, '#ffe040'); });
        drawWally(142, 188, 'idle' + ((t >> 4) % 4), 1, { costume: 'classic' });
        if (psel === 1) drawWally(166, 188, 'idle' + ((t >> 4) % 4), -1, { costume: 'junior' });
        txt(psel === 1 ? 'TAKE TURNS' : 'WALLYMAN', 40, 172, '#a8b0d8');
      } else {
        drawWindow(16, 108, 172, 88);
        items().forEach((s, i) => {
          const y = 114 + i * 11 + (i >= 3 ? 3 : 0);
          txt(s, 34, y, i === sel ? (eraseMode && i < 3 ? '#ff8080' : '#ffe040') : '#fff');
          if (i === sel) txt('>', 24 + ((t >> 3) & 1), y, '#ffe040');
        });
        if (eraseMode) txt('PICK A FILE TO ERASE', 30, 199, '#ff8080', { outline: '#000' });
      }
      txt('@2026 DUG-T', 4, 214, '#fff');
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
]
// Paths between map stops; the last three are revealed by secret exits.
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [2, 9], [5, 10], [6, 11]];
const nodeOf = (li) => NODES.findIndex((n) => n.li === li);
const Island = (() => {
  const c = Sprites.canvas(VW, VH), x = c.getContext('2d'), r = Sprites.rng(42);
  const blobs = NODES.filter((n) => n.kind !== 'bonus').map((n) => [n.x, n.y + 4, 30]).concat([[74, 122, 28], [160, 112, 30], [200, 108, 26], [168, 152, 24], [60, 178, 24], [150, 172, 22], [118, 100, 24]]);
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
function MapScene() {
  let node = game.node || 0, pos = { x: NODES[node].x, y: NODES[node].y }, target = null, t = 0;
  const unlocked = (n) => n >= 0 && n < NODES.length && (NODES[n].kind === 'bonus' ? !!(game.secrets[NODES[n].li] || game.cleared[7]) : (n <= 1 || game.cleared[n - 2]));
  function drawNode(n, i) {
    const cleared = n.li !== undefined && game.cleared[n.li];
    if (n.kind === 'home') {
      ctx.fillStyle = '#c03030'; for (let k = 0; k < 6; k++) ctx.fillRect(n.x - 7 + k, n.y - 12 + 5 - k, 14 - k * 2, 1);
      ctx.fillStyle = '#f8f0d8'; ctx.fillRect(n.x - 6, n.y - 6, 12, 8); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(n.x - 1, n.y - 3, 3, 5);
      ctx.fillStyle = '#5ff0ff'; ctx.fillRect(n.x - 5, n.y - 4, 3, 2);
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
    } else if (n.kind === 'castle') {
      ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 11, n.y - 17, 22, 20);
      ctx.fillStyle = cleared ? '#a0a8c0' : '#6a6a80'; ctx.fillRect(n.x - 10, n.y - 10, 20, 12); ctx.fillRect(n.x - 10, n.y - 16, 5, 6); ctx.fillRect(n.x + 5, n.y - 16, 5, 6); ctx.fillRect(n.x - 3, n.y - 14, 6, 4);
      ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 2, n.y - 4, 4, 6);
      ctx.fillStyle = (t >> 4) & 1 ? '#ffe040' : '#ff6020'; ctx.fillRect(n.x, n.y - 22, 1, 6); ctx.fillRect(n.x - 1, n.y - 23, 3, 2);
    } else {
      ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 6, n.y - 3, 12, 7); ctx.fillRect(n.x - 5, n.y - 4, 10, 9);
      ctx.fillStyle = cleared ? '#ffd040' : '#e83850'; ctx.fillRect(n.x - 5, n.y - 2, 10, 5); ctx.fillRect(n.x - 4, n.y - 3, 8, 7);
      ctx.fillStyle = cleared ? '#fff8c0' : '#ff98a8'; ctx.fillRect(n.x - 3, n.y - 2, 4, 1);
      txt(String(n.li + 1), n.x - 2, n.y - 14, '#fff');
    }
  }
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (target !== null) {
        const tn = NODES[target], dx = tn.x - pos.x, dy = tn.y - pos.y, d = Math.hypot(dx, dy);
        if (d < 1.5) { pos = { x: tn.x, y: tn.y }; node = target; target = null; game.node = node; Save.persist(); } else { pos.x += (dx / d) * 1.5; pos.y += (dy / d) * 1.5; }
        return;
      }
      // walk along a path in the pressed direction (any open path from this stop)
      const dirs = [['right', 1, 0], ['left', -1, 0], ['up', 0, -1], ['down', 0, 1]];
      for (const [k, dx0, dy0] of dirs) {
        if (!Input.pressed(k)) continue;
        let best = null, bd = 0.3;
        for (const [a, b2] of EDGES) {
          const o = a === node ? b2 : b2 === node ? a : null;
          if (o === null || !unlocked(o) || !unlocked(a === node ? a : b2)) continue;
          const vx = NODES[o].x - NODES[node].x, vy = NODES[o].y - NODES[node].y, dot = (vx * dx0 + vy * dy0) / Math.hypot(vx, vy);
          if (dot > bd) { bd = dot; best = o; }
        }
        if (best !== null) { target = best; Audio8.sfx('map'); } else Audio8.sfx('bump');
        break;
      }
      if (Input.confirm() && NODES[node].li !== undefined) { Audio8.sfx('confirm'); const li = NODES[node].li; go(() => IntroScene(li, false)); } else if (Input.confirm() && NODES[node].kind === 'home') { Audio8.sfx('confirm'); go(() => ShopScene()); }
      if (Input.pressed('back')) go(() => TitleScene());
    },
    draw() {
      ctx.fillStyle = '#2858c8'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#4c80e8';
      for (let yy = 4; yy < VH; yy += 10) for (let xx = ((yy * 7) % 24) - 24; xx < VW; xx += 24) ctx.fillRect(xx + ((t >> 4) + (yy >> 1)) % 6, yy, 5, 1);
      ctx.drawImage(Island, 0, 0);
      for (const [ia, ib] of EDGES) {
        if (!unlocked(ib) || !unlocked(ia)) continue;
        const a = NODES[ia], b = NODES[ib], d = Math.hypot(b.x - a.x, b.y - a.y), secret = NODES[ib].kind === 'bonus';
        for (let s = 0; s < d; s += 4) { ctx.fillStyle = secret ? ((s >> 2) + (t >> 3)) % 3 ? '#c070ff' : '#ffe8ff' : '#7a5a2a'; ctx.fillRect(Math.round(a.x + ((b.x - a.x) * s) / d) - 1, Math.round(a.y + ((b.y - a.y) * s) / d), 3, 2); }
      }
      NODES.forEach(drawNode);
      NODES.forEach((n) => { if (n.li === undefined || !unlocked(NODES.indexOf(n))) return; for (let i = 0; i < 5; i++) { ctx.fillStyle = '#1a1020'; ctx.fillRect(n.x - 8 + i * 3, n.y + 7, 3, 3); ctx.fillStyle = game.medals[n.li] & (1 << i) ? '#ffd040' : '#4a4a60'; ctx.fillRect(n.x - 7 + i * 3, n.y + 8, 2, 1); } });
      const walking = target !== null;
      const face = target !== null ? Math.sign(NODES[target].x - pos.x) || 1 : 1;
      const pose = walking ? 'walk' + ((t >> 2) % 8) : 'idle' + ((t >> 4) % 4);
      drawWally(pos.x, pos.y + 2, pose, face);
      drawWindow(4, 4, 248, 20);
      txt(game.players === 2 ? pname() + "'S TURN" : 'WALLY ISLAND', 10, 10, '#ffe040');
      ctx.drawImage(Sprites.heart, 112, 10); txt('*' + pad(game.lives, 2), 121, 10);
      ctx.drawImage(Sprites.coinIcon, 150, 10); txt('*' + pad(game.coins, 2), 157, 10);
      txt(pad(game.score, 7), 206, 10);
      drawWindow(4, 196, 248, 24);
      const n = NODES[node];
      const label = n.li !== undefined ? (n.kind === 'bonus' ? `B${n.li - 7}. ${LEVELS[n.li].name}` : `${n.li + 1}. ${LEVELS[n.li].name}`) : n.name;
      txt(label, 12, 205, '#fff');
      if (n.li !== undefined) { const mc = medalCount(n.li); ctx.drawImage(Sprites.miniMedal, 186, 206); txt(mc + '/5', 193, 205, mc === 5 ? '#ffe040' : '#fff'); if (game.cleared[n.li]) txt('#', 236, 205, '#ffe040'); }
      if (target === null && (t >> 5) % 2 === 0) txt(n.li !== undefined ? 'PRESS START' : 'START: SHOP', 160, 186, '#fff', { outline: '#101848' });
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
      txt(LEVELS[li].bonus ? 'BONUS LEVEL' : `LEVEL ${li + 1}`, 128, 60, LEVELS[li].bonus ? '#c070ff' : '#ffe040', { scale: 2, align: 'center' });
      txt(LEVELS[li].name, 128, 88, '#fff', { align: 'center' });
      drawWally(110, 142, 'idle' + ((t >> 4) % 4), 1);
      if (game.players === 2 || heroOf() !== 'wally') txt(pname(), 128, 104, HEROES[heroOf()].color, { align: 'center' });
      txt('*  ' + game.lives, 124, 126, '#fff');
      for (let i = 0; i < 5; i++) ctx.drawImage(game.medals[li] & (1 << i) ? Sprites.miniMedal : Sprites.miniMedalOff, 113 + i * 7, 160);
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
  const lines = ['THE STATIC IS GONE!', '', 'BARON STATIC HAS BEEN', 'UNPLUGGED FOR GOOD AND', 'WALLY ISLAND HAS FULL', 'SIGNAL ONCE AGAIN.', '', 'THANKS FOR PLAYING', 'WALLYMAN WORLD!', '', 'STARRING WALLYMAN', 'CREATED BY DUG-T'];
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
function ShopScene() {
  const items = [
    { name: 'EXTRA LIFE', price: 50, can: () => game.lives < 99, buy: () => { game.lives++; }, owned: () => false },
    { name: '+3 CANNONBALLS', price: 20, can: () => (game.bonusAmmo || 0) < 6, buy: () => { game.bonusAmmo = (game.bonusAmmo || 0) + 3; }, owned: () => (game.bonusAmmo || 0) >= 6 },
    { name: 'FULL HEARTS', price: 30, can: () => !game.startHearts, buy: () => { game.startHearts = 3; }, owned: () => !!game.startHearts },
    { name: 'JET BOOTS', price: 60, can: () => !game.startBoots, buy: () => { game.startBoots = true; }, owned: () => !!game.startBoots },
    { name: 'WARDROBE', price: 0, wardrobe: true },
    { name: 'LEAVE SHOP', price: 0 },
  ];
  let sel = 0, t = 0, say = "HI! WHAT'LL IT BE?", sayT = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (sayT > 0) sayT--;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.pressed('start')) { go(() => MapScene()); return; }
      if (Input.pressed('jump')) {
        const it = items[sel];
        if (it.wardrobe) { go(() => WardrobeScene()); return; }
        if (!it.buy) { go(() => MapScene()); return; }
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
      drawWindow(8, 126, 240, 92);
      items.forEach((it, i) => {
        const y = 133 + i * 12, on = i === sel;
        if (on) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040');
        txt(it.name, 26, y, on ? '#ffe040' : '#fff');
        if (it.buy) {
          if (it.owned()) txt('READY', 196, y, '#5ae060');
          else { ctx.drawImage(Sprites.coinIcon, 200, y); txt(pad(it.price, 2), 207, y, game.coins >= it.price ? '#fff' : '#ff6060'); }
        }
      });
      ctx.drawImage(Sprites.coinIcon, 172, 16); txt('*' + pad(game.coins, 2), 179, 16, '#fff');
      txt('BOOSTS LAST FOR YOUR NEXT LEVEL', 128, 210, '#a8b0d8', { align: 'center' });
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
  return Math.ceil(((def.width * TS) / 1.6 / 60) * 1.8 / 5) * 5 + (def.boss ? 45 : 0) + (def.yetiArena ? 35 : 0) + (def.water ? 20 : 0);
}

class Play {
  constructor(li, fromCheckpoint, opts = {}) {
    this.ta = !!opts.ta; this.taT = 0; this.taReady = this.ta ? 80 : 0;
    this.li = li; this.lv = buildLevel(li); this.def = this.lv.def;
    this.T = Sprites.tiles[this.def.theme];
    this.ents = []; this.parts = []; this.pings = []; this.balls = []; this.bats = []; this.platforms = []; this.bumps = [];
    this.state = 'play'; this.stateT = 0; this.paused = false; this.time = levelTime(this.def); this.timeTick = 0;
    this.cpHit = !!fromCheckpoint && !!this.lv.checkpoint; this.bossLock = false; this.camMin = 0; this.shake = 0;
    const s = this.cpHit ? this.lv.checkpoint : this.lv.start;
    this.p = { x: s.x * TS + 3, y: (s.y + 1) * TS - 22, w: 10, h: 22, vx: 0, vy: 0, face: 1, onGround: false, hearts: 2, power: 'none', inv: 0, anim: 0, jumpBuf: 0, coyote: 0, prevBottom: 0, platform: null, sx: 1, sy: 1, hurtT: 0, trail: [], ammo: 3, special: 3, spCool: 0, charge: 0, boots: false, dj: false, riding: false, chompT: 0, pound: 0, flutter: 0 };
    this.medalsGot = 0; this.pauseSel = 0;
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
      for (let tx = x0; tx <= x1; tx++) if (SOLID.has(this.tile(tx, ty))) { const d = Math.abs(tx * TS + 8 - (b.x + b.w / 2)); if (d < bd) { bd = d; best = tx; } }
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
    const E = (o) => { const e = Object.assign({ t: 0, alive: true, vx: 0, vy: 0, enemy: false }, o); this.ents.push(e); return e; };
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
      case 's': E({ type: 'orb', item: true, x: x + 2, y: y + 1, w: 12, h: 14, rise: 0, oy: y + 1 }); break;
      case 'a': E({ type: 'ammo', item: true, x: x + 2, y: y + 2, w: 12, h: 14, rise: 0 }); break;
      case 'f': E({ type: 'fish', x: x + 1, y: y + 3, w: 14, h: 10, vx: 0.8 * toward, oy: y + 3, ox: x, enemy: true, stomp: true }); break;
      case 'j': E({ type: 'jelly', x: x + 1, y, w: 14, h: 12, oy: y, enemy: true, stomp: false }); break;
      case 'e': E({ type: 'ghost', x: x + 1, y, w: 14, h: 12, enemy: true, stomp: true, oy: y, ghostOff: false }); break;
      case 'y': E({ type: 'yeti', x, y: y - 14, w: 28, h: 30, hp: 3, maxHp: 3, inv: 0, enemy: true, yeti: true, state: 'walk', act: 90 }); break;
      case 'k': E({ type: 'boss', kind: 'mother', x: x - 24, y: 30, oy: 30, w: 56, h: 18, hp: this.def.bossHp || 6, maxHp: this.def.bossHp || 6, inv: 0, enemy: true, boss: true, act: 120, beamX: 0, beamEnd: 0 }); break;
      case 'Z': E({ type: 'secret', x, y: y - 8, w: 16, h: 24, to: this.def.secret.to }); break;
      case 'G': E({ type: 'goal', x: x + 2, y: y - 80, w: 12, h: 96 }); break;
      case 'K': E({ type: 'boss', x, y: y - 14, w: 28, h: 30, hp: this.def.bossHp || 3, maxHp: this.def.bossHp || 3, inv: 0, jumpT: 120, enemy: true, boss: true }); break;
    }
  }

  // ---------- events ----------
  addScore(n, x, y) { game.score += n; if (x !== undefined) this.parts.push({ k: 'text', s: String(n), x, y, vy: -0.6, life: 50 }); }
  addCoin() { game.coins++; game.score += 20; if (game.coins >= 100) { game.coins -= 100; game.lives++; Audio8.sfx('oneup'); } else Audio8.sfx('coin'); }
  hitBlock(tx, ty) {
    const c = this.tile(tx, ty);
    const bx = tx * TS, by = ty * TS;
    for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss && overlap(e, { x: bx, y: by - 6, w: 16, h: 6 })) this.flipKill(e);
    if ('WPSOAVQD'.includes(c)) {
      this.setTile(tx, ty, 'U'); this.bumps.push({ tx, ty, t: 0 });
      if (c === 'W') { this.addCoin(); this.parts.push({ k: 'coinpop', x: bx + 4, y: by - 14, vy: -4, life: 26 }); } else {
        Audio8.sfx('sprout');
        const type = { P: 'drink', S: 'phone', A: 'ammo', V: 'battery', Q: 'boots', O: 'badge', D: 'dino' }[c];
        if (type === 'dino') this.ents.push({ type, item: true, alive: true, x: bx, y: by, w: 16, h: 20, vx: 0, vy: 0, rise: 20, t: 0, cool: 0, state: 'wait' });
        else this.ents.push({ type, item: true, alive: true, x: bx + 2, y: by, w: 12, h: 14, vx: 0, vy: 0, rise: 16, t: 0 });
      }
    } else if (c === 'B') {
      this.setTile(tx, ty, '.'); Audio8.sfx('brick'); this.addScore(50);
      for (const [dx, dy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: bx + dx, y: by + dy, vx, vy, g: 0.3, life: 70 });
    } else { Audio8.sfx('bump'); }
  }
  mount(e) {
    const p = this, pl = this.p, bottom = pl.y + pl.h;
    e.alive = false;
    pl.riding = true; pl.x += (pl.w - 12) / 2; pl.w = 12; pl.h = 32; pl.y = bottom - 32; pl.vy = Math.min(pl.vy, 0);
    Audio8.sfx('dino'); p.parts.push({ k: 'text', s: 'DINO!', x: pl.x - 8, y: pl.y - 10, vy: -0.5, life: 50 });
  }
  dismount(knocked) {
    const p = this.p, bottom = p.y + p.h, cx = p.x + p.w / 2;
    p.riding = false; p.w = 10; p.h = 22; p.x = cx - 5; p.y = bottom - 22;
    const flee = knocked ? (p.face > 0 ? -2.4 : 2.4) : 0;
    this.ents.push({ type: 'dino', item: true, alive: true, x: cx - 8, y: bottom - 20, w: 16, h: 20, vx: flee, vy: knocked ? -3 : 0, rise: 0, t: 0, cool: knocked ? 70 : 40, state: knocked ? 'flee' : 'wait', face: p.face });
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
        if (this.tile(tx, ty) !== 'B') continue;
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
  flipKill(e) {
    if (e.ghostOff) return;
    if (e.yeti) { this.damageYeti(e); return; }
    e.dying = 'flip'; e.vy = -3.5; e.vx = this.p.x < e.x ? 0.8 : -0.8;
    if (e.type === 'ufo') { Audio8.sfx('boom'); this.parts.push({ k: 'blast', x: e.x + 14, y: e.y + 6, life: 24 }); this.addScore(1000, e.x, e.y); } else { Audio8.sfx('kick'); this.addScore(200, e.x, e.y); }
  }
  stomp(e) {
    const p = this.p;
    p.vy = Input.down('jump') ? -6.2 : -3.8; p.y = e.y - p.h - 0.1;
    Audio8.sfx('stomp'); this.addScore(100, e.x, e.y - 8);
    this.parts.push({ k: 'star', x: e.x + 7, y: e.y + 4, life: 12 });
    if (e.type === 'grumble') { e.dying = 'squish'; e.dt = 30; } else this.flipKill(e);
  }
  hurt(spike) {
    const p = this.p;
    if (p.inv > 0 || p.charge > 0 || this.state !== 'play') return;
    if (p.riding) { this.dismount(true); return; }
    p.hearts--;
    if (p.hearts <= 0) { this.die(); return; }
    p.inv = 120; p.hurtT = 24; p.power = 'none'; p.boots = false; Audio8.sfx('hurt');
    if (spike) p.vy = -5;
  }
  die() {
    if (this.state === 'dying') return;
    this.state = 'dying'; this.stateT = 0; this.p.hearts = 0;
    Audio8.play('die');
  }
  clear(secretTo) {
    if (this.state !== 'play') return;
    this.state = 'clear'; this.stateT = 0; Audio8.play('clear'); this.secretTo = secretTo;
    if (secretTo !== undefined) Audio8.sfx('secret');
    this.parts.push({ k: 'text', s: secretTo !== undefined ? 'SECRET EXIT!' : 'COURSE CLEAR!', x: this.p.x - 30, y: this.p.y - 30, vy: -0.2, life: 100 });
  }

  // ---------- update ----------
  update() {
    if (Input.pressed('start') && (this.state === 'play')) { this.paused = !this.paused; this.pauseSel = 0; Audio8.sfx('pause'); return; }
    if (this.paused) {
      if (Input.pressed('down')) { this.pauseSel = (this.pauseSel + 1) % 4; Audio8.sfx('select'); }
      if (Input.pressed('up')) { this.pauseSel = (this.pauseSel + 3) % 4; Audio8.sfx('select'); }
      if (this.pauseSel === 1 || this.pauseSel === 2) {
        const kind = this.pauseSel === 1 ? 'music' : 'sfx', d = (Input.pressed('right') ? 0.2 : 0) - (Input.pressed('left') ? 0.2 : 0);
        if (d) { Audio8.setVolume(kind, Audio8.getVolume(kind) + d); Audio8.sfx('coin'); }
      }
      if (Input.pressed('back') || (Input.pressed('jump') && this.pauseSel === 0)) { this.paused = false; Audio8.sfx('pause'); }
      if (Input.pressed('jump') && this.pauseSel === 3) { this.paused = false; Save.persist(); const li = this.li; go(() => (this.ta ? TimeAttackSelect(li) : nextTurn(() => MapScene()))); }
      return;
    }
    if (this.taReady > 0) { this.taReady--; if (this.taReady === 70 || this.taReady === 0) Audio8.sfx(this.taReady ? 'select' : 'confirm'); return; }
    if (this.ta && this.state === 'play') this.taT++;
    this.stateT++;
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
    }

    // timer
    if (!this.ta && this.state === 'play' && ++this.timeTick >= 60) {
      this.timeTick = 0; this.time--;
      if (this.time === 20) { this.parts.push({ k: 'text', s: 'HURRY UP!', x: this.cam.x + 100, y: 100, vy: 0, life: 120, fixed: true }); Audio8.sfx('pause'); }
      if (this.time <= 10 && this.time > 0) Audio8.sfx('tick');
      if (this.time <= 0) { this.time = 0; this.die(); }
    }
    if (this.state === 'clear') this.updateClear();
    if (this.state === 'bossdead') {
      if (this.stateT % 8 === 0 && this.stateT < 100) { Audio8.sfx('boom'); this.parts.push({ k: 'boom', x: this.bossX + Math.random() * 32, y: this.bossY + Math.random() * 32, life: 20 }); }
      if (this.stateT === 110) Audio8.play('clear');
      if (this.stateT > 300 && this.ta) { this.state = 'done'; const li = this.li, f = this.taT; go(() => TAResultScene(li, f)); } else if (this.stateT > 300) {
        game.cleared[this.li] = true; game.medals[this.li] |= this.medalsGot; game.node = nodeOf(this.li); Save.persist(); this.state = 'done';
        if (this.def.final) go(() => EndingScene());
        else if (this.def.bossMsg) go(() => MessageScene(this.def.bossMsg, () => nextTurn(() => MapScene())));
        else go(() => MessageScene(['BARON STATIC IS BEATEN...', 'BUT HE ESCAPED!', '', 'HE FLED NORTH ACROSS', 'WALLY ISLAND TO HIS', 'STATIC TOWER.', '', 'AFTER HIM, WALLYMAN!'], () => nextTurn(() => MapScene())));
      }
    }
  }
  updatePlayer() {
    const p = this.p, auto = this.state === 'clear';
    if (p.inv > 0) p.inv--;
    const run = !auto && Input.down('run');
    const ice = this.def.ice && p.onGround;
    const water = !!this.def.water, frozen = p.frozen > 0;
    if (frozen) p.frozen--;
    const goth = heroOf() === 'goth';
    const max = water ? (run ? 1.9 : 1.3) : run ? (goth ? 2.5 : 2.8) : goth ? 1.5 : 1.6, acc = (run ? 0.11 : 0.08) * (ice ? 0.45 : 1) * (water ? 0.7 : 1);
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
    } else if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -((p.riding ? 6.1 : goth ? 5.9 : 5.4) + Math.abs(p.vx) * 0.25); p.jumpBuf = 0; p.coyote = 0; Audio8.sfx('jump');
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
    p.vy = water ? Math.min(1.4, p.vy + 0.09) : Math.min(5.5, p.vy + (hold ? 0.19 : 0.5));
    // GothChick's glide: hold Jump while falling to drift down gently
    p.gliding = goth && !water && !p.riding && !p.pound && !auto && !p.onGround && p.vy > 1.1 && Input.down('jump');
    if (p.gliding) { p.vy = 1.1; if (frame % 7 === 0) this.parts.push({ k: 'spark', x: p.x + p.w / 2 - p.face * 6, y: p.y + 6, life: 10 }); }
    if (water && frame % 50 === 0) this.parts.push({ k: 'bubble', x: p.x + p.w / 2 + p.face * 3, y: p.y + 4, vy: -0.5, life: 60 });
    if (p.onGround) p.flutter = 0;
    // Dino's flutter: hold jump while falling to hover for a moment
    p.fluttering = p.riding && !p.pound && !auto && !p.onGround && Input.down('jump') && p.flutter < 50 && (p.flutter > 0 || p.vy > 0);
    if (p.fluttering) { p.flutter++; p.vy = Math.min(p.vy, 0.5) - 0.35; if (p.flutter % 6 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2 - p.face * 8, y: p.y + p.h, vx: -p.face * 0.4, vy: 0.3, life: 14 }); }
    if (p.pound > 0) { p.pound--; p.vy = 0; p.vx = 0; if (p.pound === 0) p.pound = -1; } else if (p.pound === -1) { p.vy = 7; p.vx = 0; }

    // B: throw a rolling cannonball (or a Signal ping once the cannonballs run out)
    if (p.chompT > 0) p.chompT--;
    // SPECIAL attack (S button / C key): 3 uses, refilled by Special Orbs
    if (p.spCool > 0) p.spCool--;
    if (p.shockT > 0) p.shockT--;
    if (!auto && Input.pressed('special')) {
      if (p.special > 0 && !p.spCool) { p.special--; p.spCool = 30; if (goth) this.batSwarm(); else this.shockwave(); } else Audio8.sfx('tick');
    }
    if (p.riding) { if (!auto && Input.pressed('run') && p.chompT === 0) this.chomp(); } else if (!auto && Input.pressed('run') && !p.crouch) {
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
    this.move(p, true);
    if (p.pound === -1 && p.onGround) {
      const ty = Math.floor((p.y + p.h) / TS), x0 = Math.floor(p.x / TS), x1 = Math.floor((p.x + p.w - 1) / TS);
      let broke = false;
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tile(tx, ty);
        if (c === 'B') { this.setTile(tx, ty, '.'); this.addScore(50); broke = true; for (const [ox, oy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: tx * TS + ox, y: ty * TS + oy, vx, vy, g: 0.3, life: 70 }); } else if ('WPSOAVQD'.includes(c)) this.hitBlock(tx, ty);
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
    if (t === 200 && !this.ta) {
      game.lives--; Save.persist();
      if (game.lives < 0) go(() => GameOverScene());
      else if (game.players === 2 && game.other && !game.other.out) go(() => nextTurn(() => MapScene()));
      else { const li = this.li, cp = this.cpHit; go(() => IntroScene(li, cp)); }
    }
  }
  updateClear() {
    const t = this.stateT;
    if (this.ta) { if (t === 90) { const li = this.li, f = this.taT; go(() => TAResultScene(li, f)); } return; }
    if (t > 120 && this.time > 0) {
      if (t % 3 === 0) { const d = Math.min(this.time, 1); this.time -= d; game.score += d * 100; }
      if (t % 4 === 0) Audio8.sfx('tick');
    }
    if (t === 420) {
      game.cleared[this.li] = true; game.medals[this.li] |= this.medalsGot; game.node = nodeOf(this.li);
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
      case 'snowball':
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
      case 'medal': case 'orb': break;
      case 'drink': case 'phone': case 'badge': case 'ammo': case 'battery': case 'boots':
        if (e.rise > 0) { e.y -= 0.5; e.rise -= 0.5; if (e.rise <= 0) e.vx = { phone: 0, ammo: 0, badge: 1.2, battery: 1.3, boots: 0.8 }[e.type] ?? 1; break; }
        e.vy = Math.min(5, e.vy + 0.3);
        this.move(e, true);
        if (e.hitWall) e.vx = -e.hitWall * Math.abs(e.vx);
        if (e.type === 'battery' && e.onGround) e.vy = -3.6;
        break;
      case 'checkpoint':
        if (!e.on && p.x + p.w > e.x && this.state === 'play') { e.on = true; this.cpHit = true; Audio8.sfx('check'); if (p.hearts < 2) p.hearts = 2; }
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
        if (n === 5 && !e.got) { game.lives++; Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: 'ALL MEDALS! 1UP', x: e.x - 40, y: e.y - 30, vy: -0.4, life: 90 }); }
      }
      if (e.type === 'battery') { p.charge = 600; Audio8.sfx('power'); Audio8.play('charge'); this.parts.push({ k: 'text', s: 'SUPER CHARGE!', x: e.x - 30, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'boots') { p.boots = true; Audio8.sfx('power'); this.parts.push({ k: 'text', s: 'JET BOOTS!', x: e.x - 20, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'orb') { p.special = Math.min(9, p.special + 3); Audio8.sfx('power'); this.parts.push({ k: 'text', s: 'SPECIAL +3', x: e.x - 24, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'ammo') { p.ammo = Math.min(9, p.ammo + 3); Audio8.sfx('reload'); this.parts.push({ k: 'text', s: '+3', x: e.x, y: e.y - 8, vy: -0.5, life: 50 }); }
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
  updateYeti(e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    e.vy = Math.min(6, e.vy + 0.3);
    if (!e.active) {
      this.move(e, false);
      if (Math.abs(p.x - e.x) < 140 && this.state === 'play') {
        e.active = true; const [a0, a1] = this.def.yetiArena;
        this.arena = { min: a0 * TS, max: (a1 + 1) * TS }; this.camMin = a0 * TS; this.camMax = (a1 + 1) * TS - VW;
        Audio8.play('boss'); Audio8.sfx('roar'); this.shake = 20;
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
    if (e.inv > 0 || e.dying) return;
    e.hp--; e.inv = 80; this.shake = 14; Audio8.sfx('bosshit'); this.addScore(1000, e.x, e.y - 8);
    if (e.hp <= 0) {
      e.dying = 'flip'; e.vy = -4; e.vx = this.p.x < e.x ? 1 : -1;
      this.arena = null; this.camMin = 0; this.camMax = null; this.addScore(3000);
      this.ents.forEach((s2) => { if (s2.type === 'snowball') s2.alive = false; });
      Audio8.play(this.def.music);
      this.parts.push({ k: 'text', s: 'YETI DEFEATED!', x: 128, y: 70, vy: 0, life: 120, fixed: true });
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
    e.hp--; e.inv = 90; this.shake = 16; Audio8.sfx('bosshit'); this.addScore(1000, e.x, e.y - 8);
    if (e.hp <= 0) {
      e.alive = false; this.state = 'bossdead'; this.stateT = 0; this.bossX = e.x; this.bossY = e.y; Audio8.stop();
      this.ents.forEach((s) => { if (s.type === 'spark') s.alive = false; });
      this.balls.length = 0;
      this.addScore(5000);
    }
  }
  // ---------- cannonballs ----------
  // GothChick's special: three homing bats
  batSwarm() {
    const p = this.p;
    p.fire = 10; Audio8.sfx('bats');
    for (let i = 0; i < 3; i++) this.bats.push({ x: p.x + p.w / 2 - 3 + p.face * 6, y: p.y + 6, w: 6, h: 6, vx: p.face * 2.6, vy: (i - 1) * 0.9, life: 120, t: i * 3, slot: i });
  }
  // WallyMan's special: a Signal Shockwave from his phone
  shockwave() {
    const p = this.p, x = p.x + p.w / 2, y = p.y + p.h / 2, R = 96;
    p.shockT = 30; this.shake = 12; Audio8.sfx('shock');
    this.parts.push({ k: 'shock', x, y, life: 30 });
    for (const e of this.ents) {
      if (!e.alive || e.dying || e.ghostOff) continue;
      const dx = e.x + e.w / 2 - x, dy = e.y + e.h / 2 - y;
      if (dx * dx + dy * dy > (R + e.w / 2) ** 2) continue;
      if (e.hazard) { e.alive = false; this.parts.push({ k: 'spark', x: e.x, y: e.y, life: 10 }); } else if (e.enemy) { if (e.boss) this.damageBoss(e); else this.flipKill(e); }
    }
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
        if (e.boss) this.damageBoss(e); else this.flipKill(e);
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
    Audio8.sfx('boom'); this.shake = Math.max(this.shake, 10);
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
        if (this.tile(tx, ty) !== 'B') continue;
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
    const cx = Math.round(this.cam.x) + (this.shake ? ((this.shake & 2) ? 2 : -2) : 0);
    drawParallax(this.def.theme, cx);
    // items emerging from blocks are drawn behind the tiles
    for (const e of this.ents) if (e.item) this.drawEnt(e, cx);
    this.drawTiles(cx);
    for (const pl of this.platforms) this.drawPlatform(pl, cx);
    for (const e of this.ents) if (!e.item) this.drawEnt(e, cx);
    this.drawPlayer(cx);
    if (this.def.theme === 'snow') drawSnow(cx);
    if (this.def.water) {
      ctx.fillStyle = 'rgba(40,120,220,0.13)'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(220,245,255,0.7)';
      for (let i = 0; i < 24; i++) { const bx = (((i * 61 - cx * 0.3 + Math.sin(frame * 0.03 + i) * 4) % VW) + VW) % VW, by = VH - ((i * 47 + frame * (0.4 + (i % 3) * 0.2)) % VH); ctx.fillRect(Math.round(bx), Math.round(by), 2, 2); }
    }
    if (this.def.dark) { // spooky: only a pool of light around WallyMan, with the odd lightning flash
      const lf = frame % 420, flash = lf < 5 || (lf > 10 && lf < 14);
      if (lf === 0) Audio8.sfx('boom');
      if (!flash) {
        const px = this.p.x + this.p.w / 2 - cx, py = this.p.y + this.p.h / 2;
        const gr = ctx.createRadialGradient(px, py, 34, px, py, 118);
        gr.addColorStop(0, 'rgba(10,0,24,0)'); gr.addColorStop(1, 'rgba(10,0,24,0.8)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
      } else { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 0, VW, VH); }
    }
    for (const g of this.pings) this.drawPing(g, cx);
    for (const bl of this.balls) this.drawBall(bl, cx);
    for (const bt of this.bats) this.drawBat(bt, cx);
    for (const q of this.parts) this.drawPart(q, cx);
    this.drawHUD();
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, VH);
      drawWindow(48, 56, 160, 112);
      txt('PAUSED', 128, 64, '#ffe040', { scale: 2, align: 'center' });
      const labels = ['CONTINUE', 'MUSIC', 'SOUND FX', 'EXIT TO MAP'];
      labels.forEach((l, i) => {
        const y = 88 + i * 15, on = i === this.pauseSel;
        txt(l, 70, y, on ? '#ffe040' : '#fff');
        if (on) txt('>', 60 + ((frame >> 3) & 1), y, '#ffe040');
        if (i === 1 || i === 2) {
          const v = Math.round(Audio8.getVolume(i === 1 ? 'music' : 'sfx') * 5);
          for (let k = 0; k < 5; k++) { ctx.fillStyle = k < v ? (on ? '#ffe040' : '#5ff0ff') : '#3a3a58'; ctx.fillRect(130 + k * 9, y + 6 - k, 7, 2 + k); }
        }
      });
      txt('A: SELECT   < >: VOLUME', 128, 152, '#a8b0d8', { align: 'center' });
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
        case 'W': case 'P': case 'S': case 'O': case 'A': case 'V': case 'Q': case 'D': img = T.bonus[bonusF]; break;
        case 'U': img = T.used; break;
        case 'X': img = T.solid; break;
        case '=': img = T.oneway; break;
        case '^': img = T.spikes; break;
        case 'J': img = T.spring[bump && bump.t < 6 ? 1 : 0]; dy = 0; break;
        case 'L': img = this.tile(tx, ty - 1) === 'L' ? T.lavaFill : T.lava[lavaF]; break;
        case 'o': {
          const w = [8, 6, 2, 6][(frame >> 3) % 4];
          ctx.drawImage(Sprites.coin, tx * TS - cx + 8 - w / 2, ty * TS + 1, w, 14); continue;
        }
      }
      if (img) ctx.drawImage(img, tx * TS - cx, ty * TS + dy);
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
      const dimg = Sprites.dino[face > 0 ? 'r' : 'l'][di];
      ctx.drawImage(dimg, dx, dy);
      Wally.draw(ctx, dx + (face > 0 ? 9 : 15), dy + 20 + bob + (di === 2 ? 1 : 0), 'ride', face, {
        t: frame, signal, white: p.charge > 0 && (frame >> 2) % 2 === 0, glow: p.charge > 0 ? 0.7 : signal ? 0.25 + 0.2 * Math.sin(frame * 0.15) : 0,
      });
      // Dino's head and neck sit in front of the rider
      if (face > 0) ctx.drawImage(dimg, 13, 0, 11, 8, dx + 13, dy, 11, 8); else ctx.drawImage(dimg, 0, 0, 11, 8, dx, dy, 11, 8);
      if (p.chompT > 6) { // chomp swoosh
        ctx.fillStyle = '#ffffff';
        const sx0 = face > 0 ? dx + 24 : dx - 6;
        for (let k = 0; k < 6; k++) ctx.fillRect(sx0 + (face > 0 ? Math.round(Math.sin(k * 0.6) * 5) : -Math.round(Math.sin(k * 0.6) * 5)), dy + 2 + k * 3, 2, 2);
      }
      return;
    }
    const pose = this.playerPose();
    const face = p.skid ? -p.face : p.face;
    Wally.draw(ctx, fx, fy, pose, face, {
      t: frame, sx: p.sx, sy: p.sy, signal, white: p.hurtT > 18 || (p.charge > 0 && (frame >> 2) % 2 === 0),
      glow: p.frozen > 0 ? 0.9 : p.charge > 0 ? 0.7 : signal ? 0.25 + 0.2 * Math.sin(frame * 0.15) : 0,
    });
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
      case 'ammo': ctx.drawImage(Sprites.ammo, x - 2, y - 2 + (e.rise > 0 ? 0 : Math.round(Math.sin(e.t * 0.1)))); break;
      case 'bat': put(Sprites.bat[e.state === 'hang' ? 1 : (e.t >> 3) & 1], -1, -3); break;
      case 'charger': put(Sprites.charger[e.vx > 0 ? 'r' : 'l'][(e.t >> (e.charge ? 2 : 3)) & 1], -1, -2); break;
      case 'turret': put(Sprites.turret[e.face > 0 ? 'r' : 'l'], -1, -2); if (e.cool < 25 && (frame >> 2) & 1) { ctx.fillStyle = '#ff3040'; ctx.fillRect(x + 6, y - 1, 3, 3); } break;
      case 'ufo': this.drawUfo(e, x, y); break;
      case 'bolt': ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y, 8, 6); ctx.fillRect(x, y - 1, 6, 8); ctx.fillStyle = (e.t >> 1) & 1 ? '#ffe040' : '#ff8030'; ctx.fillRect(x, y, 6, 6); ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y + 1, 2, 2); break;
      case 'dino': {
        const face = e.state === 'flee' ? Math.sign(e.vx) || 1 : (this.p.x < e.x ? -1 : 1);
        const di = e.state === 'flee' ? 1 + ((e.t >> 3) & 1) : 0;
        ctx.drawImage(Sprites.dino[face > 0 ? 'r' : 'l'][di], x - 4, y - 2 + (e.state === 'wait' && (e.t >> 4) & 1 ? 1 : 0));
        if (e.state === 'wait' && e.rise <= 0 && (e.t >> 5) % 2 === 0) txt('!', x + 6, y - 12, '#ffe040', { outline: '#1a1020' });
        break;
      }
      case 'medal': ctx.drawImage(e.got ? Sprites.medalGhost : Sprites.medal, x - 2, y - 1 + Math.round(Math.sin(e.t * 0.08) * 1.5)); if (!e.got && (frame >> 3) % 6 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y + 3, 1, 3); ctx.fillRect(x + 7, y + 4, 3, 1); } break;
      case 'fish': put(Sprites.fish[e.vx > 0 ? 'r' : 'l'][(e.t >> 3) & 1], -1, -3); break;
      case 'jelly': put(Sprites.jelly[(e.t >> 4) & 1], -1, -1); break;
      case 'ghost': ctx.save(); ctx.globalAlpha = e.dying ? 1 : e.fade ?? 1; put(Sprites.ghost[this.p.x < e.x ? 'l' : 'r'][(e.t >> 4) & 1], -1, -1); ctx.restore(); break;
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
        const by = y + Math.round(Math.sin(e.t * 0.08) * 2), goth = heroOf() === 'goth', col = goth ? '#ff4aa8' : '#5ff0ff', dark = goth ? '#6a1a5a' : '#1a5a7a';
        ctx.fillStyle = (frame >> 3) & 1 ? col : '#ffffff'; ctx.fillRect(x + 5, by - 3, 2, 2); ctx.fillRect(x - 2, by + 5, 2, 2); ctx.fillRect(x + 12, by + 9, 2, 2);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 1, by, 10, 12); ctx.fillRect(x, by + 1, 12, 10);
        ctx.fillStyle = dark; ctx.fillRect(x + 1, by + 1, 10, 10); ctx.fillStyle = col; ctx.fillRect(x + 2, by + 2, 8, 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, by + 3, 2, 2);
        if (goth) { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 4, by + 5, 4, 3); ctx.fillRect(x + 2, by + 4, 2, 2); ctx.fillRect(x + 8, by + 4, 2, 2); } else { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 5, by + 7, 2, 2); ctx.fillRect(x + 4, by + 4, 1, 3); ctx.fillRect(x + 7, by + 4, 1, 3); }
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
    txt(pname(), 8, 6, pname() === 'WALLY JR' ? '#5ad070' : HEROES[heroOf()].color);
    txt('*' + pad(Math.max(0, game.lives), 2), 14, 15, '#fff');
    for (let i = 0; i < 3; i++) ctx.drawImage(i < p.hearts ? Sprites.heart : Sprites.heartEmpty, 65 + i * 9, 6);
    { let ix = 86; if (p.power === 'signal') { ctx.drawImage(Sprites.miniPhone, ix, 15); ix += 6; } if (p.boots) { ctx.drawImage(Sprites.miniBoots, ix, 16); ix += 7; } if (p.charge > 0 && (p.charge > 120 || (frame >> 2) & 1)) ctx.drawImage(Sprites.miniBattery, ix, 15); }
    { // special attacks left
      const gx = 94, col = heroOf() === 'goth' ? '#ff4aa8' : '#5ff0ff';
      ctx.fillStyle = '#1a1020'; ctx.fillRect(gx, 6, 7, 7); ctx.fillStyle = p.special ? col : '#4a4a60'; ctx.fillRect(gx + 1, 7, 5, 5); ctx.fillStyle = '#1a1020'; ctx.fillRect(gx + 3, 8, 1, 3);
      txt(String(p.special), gx + 8, 6, p.special ? '#fff' : '#ff6060');
    }
    ctx.drawImage(Sprites.ballIcon, 62, 15); txt('*' + p.ammo, 70, 15, p.ammo ? '#fff' : '#ff6060');
    if (this.ta) { txt('TIME', 112, 6, '#5ff0ff'); txt(fmtTime(this.taT), 104, 15, '#fff'); } else {
    txt('TIME', 112, 6, '#ffe040');
    txt(pad(this.time, 3), 117, 15, this.time <= 20 && (frame >> 4) & 1 ? '#ff6060' : '#fff'); }
    ctx.drawImage(Sprites.coinIcon, 176, 6); txt('*' + pad(game.coins, 2), 183, 6, '#fff');
    txt(pad(game.score, 7), 206, 15, '#fff');
    if (!this.ta) for (let i = 0; i < 5; i++) ctx.drawImage((this.medalsGot | game.medals[this.li]) & (1 << i) ? Sprites.miniMedal : Sprites.miniMedalOff, 146 + i * 6, 16);
    if (this.taReady > 0) txt(this.taReady > 20 ? 'READY...' : 'GO!', 128, 96, this.taReady > 20 ? '#fff' : '#ffe040', { scale: 3, align: 'center', outline: '#101848' });
    const yeti = this.arena && this.ents.find((e) => e.yeti && !e.dying);
    if (yeti) { txt('ICE YETI', 8, 26, '#a0d8ff'); for (let i = 0; i < yeti.maxHp; i++) { ctx.fillStyle = i < yeti.hp ? '#5ff0ff' : '#203040'; ctx.fillRect(60 + i * 8, 27, 6, 5); } }
    if (this.def.boss && this.bossLock) {
      const b = this.ents.find((e) => e.boss);
      if (b) { txt(this.def.bossName || 'BARON STATIC', 8, 26, '#ff8080'); for (let i = 0; i < b.maxHp; i++) { ctx.fillStyle = i < b.hp ? '#ff3040' : '#402028'; ctx.fillRect(84 + i * 8, 27, 6, 5); } }
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
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) {
    acc -= 1000 / 60;
    Input.poll();
    if (fadeDir === 1) { fade += 1 / 14; if (fade >= 1) { fade = 1; scene = nextScene(); if (scene.enter) scene.enter(); fadeDir = -1; } } else if (fadeDir === -1) { fade -= 1 / 14; if (fade <= 0) { fade = 0; fadeDir = 0; } }
    if (fadeDir !== 1) scene.update();
    frame++;
  }
  Wally.current = (game && game.costume) || 'classic';
  Wally.hero = heroOf();
  scene.draw();
  if (fade > 0) {
    // SNES-style "iris" fade: a shrinking/growing circle mask
    const r = (1 - fade) * 190;
    ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.arc(128, 112, Math.max(0, r), 0, Math.PI * 2, true); ctx.fill(); ctx.restore();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
