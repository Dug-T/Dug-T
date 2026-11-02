'use strict';
const VW = 256, VH = 224, TS = 16;
const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
let frame = 0;
const SOLID = new Set(['#', 'B', 'W', 'P', 'S', 'O', 'U', 'X', '^']);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const txt = (s, x, y, color = '#fff', o = {}) => Font.draw(ctx, s, x, y, Object.assign({ color, shadow: '#000', sd: 1 }, o));
const pad = (n, l) => String(Math.max(0, n | 0)).padStart(l, '0');

// =====================================================================
// Input: keyboard, gamepad and on-screen touch buttons
// =====================================================================
const Input = (() => {
  const names = ['left', 'right', 'up', 'down', 'jump', 'run', 'start', 'back'];
  const st = {}, prev = {}, kb = {}, hit = {}, touch = {}, gp = {};
  names.forEach((n) => { st[n] = prev[n] = kb[n] = hit[n] = touch[n] = gp[n] = 0; });
  const map = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', Space: 'jump', KeyK: 'jump', KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'run',
    Enter: 'start', KeyP: 'start', Escape: 'back', Backspace: 'back',
  };
  addEventListener('keydown', (e) => { const a = map[e.code]; if (a) { if (!e.repeat) hit[a] = 1; kb[a] = 1; e.preventDefault(); } Audio8.unlock(); });
  addEventListener('keyup', (e) => { const a = map[e.code]; if (a) { kb[a] = 0; e.preventDefault(); } });
  addEventListener('blur', () => names.forEach((n) => { kb[n] = 0; }));
  document.querySelectorAll('[data-k]').forEach((el) => {
    const k = el.dataset.k, ids = new Set();
    const on = (e) => { e.preventDefault(); ids.add(e.pointerId); touch[k] = 1; hit[k] = 1; el.classList.add('on'); Audio8.unlock(); };
    const off = (e) => { ids.delete(e.pointerId); if (!ids.size) { touch[k] = 0; el.classList.remove('on'); } };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  });
  cv.addEventListener('pointerdown', () => Audio8.unlock());
  function pollPad() {
    names.forEach((n) => { gp[n] = 0; });
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = (i) => (p.buttons[i] && p.buttons[i].pressed ? 1 : 0);
      gp.jump |= b(0) | b(1); gp.run |= b(2) | b(3) | b(6) | b(7); gp.start |= b(9); gp.back |= b(8);
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
  return {
    slots,
    fresh: () => ({ cleared: [false, false, false, false], lives: 5, score: 0, coins: 0, node: 0 }),
    persist() { try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch (e) { /* ignore */ } },
  };
})();
let game = null; // active save slot

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
  let mode = 'press', sel = 0, eraseMode = false, t = 0;
  const walkers = [{ x: -20, k: 'grumble', v: 0.4 }, { x: -120, k: 'prickle', v: 0.35 }];
  const hero = { x: -60, y: 192, vy: 0, anim: 0 };
  const items = () => [0, 1, 2].map((i) => {
    const s = Save.slots[i];
    if (!s) return `FILE ${'ABC'[i]}   NEW GAME`;
    const n = s.cleared.filter(Boolean).length;
    return `FILE ${'ABC'[i]}   #${n}  *${pad(s.lives, 2)}`;
  }).concat([`SOUND: ${Audio8.isEnabled() ? 'ON' : 'OFF'}`, eraseMode ? 'CANCEL ERASE' : 'ERASE FILE']);
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
        if (Input.confirm()) { Audio8.unlock(); Audio8.play('title'); Audio8.sfx('confirm'); mode = 'menu'; }
        return;
      }
      if (Input.pressed('down')) { sel = (sel + 1) % 5; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + 4) % 5; Audio8.sfx('select'); }
      if (Input.pressed('back')) { if (eraseMode) eraseMode = false; else mode = 'press'; }
      if (Input.confirm()) {
        if (sel < 3) {
          if (eraseMode) {
            Save.slots[sel] = null; Save.persist(); eraseMode = false; Audio8.sfx('brick');
          } else {
            if (!Save.slots[sel]) Save.slots[sel] = Save.fresh();
            game = Save.slots[sel]; Save.persist();
            Audio8.sfx('confirm');
            go(() => MapScene());
          }
        } else if (sel === 3) { Audio8.setEnabled(!Audio8.isEnabled()); Audio8.sfx('confirm'); } else { eraseMode = !eraseMode; Audio8.sfx('select'); }
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
      if (mode === 'press') {
        if ((t >> 5) % 2 === 0) txt('PRESS START', 92, 132, '#fff', { outline: '#101848' });
        txt('Z/SPACE: JUMP   X/SHIFT: RUN', 12, 152, '#d8f0ff');
        txt('ENTER: START/PAUSE', 12, 162, '#d8f0ff');
      } else {
        drawWindow(16, 112, 172, 78);
        items().forEach((s, i) => {
          const y = 120 + i * 13 + (i >= 3 ? 3 : 0);
          txt(s, 34, y, i === sel ? (eraseMode && i < 3 ? '#ff8080' : '#ffe040') : '#fff');
          if (i === sel) txt('>', 24 + ((t >> 3) & 1), y, '#ffe040');
        });
        if (eraseMode) txt('PICK A FILE TO ERASE', 30, 196, '#ff8080', { outline: '#000' });
      }
      txt('@2026 DUG-T', 4, 214, '#fff');
    },
  };
}

// =====================================================================
// Overworld map: Wally Island
// =====================================================================
const NODES = [
  { x: 36, y: 150, kind: 'home', name: "WALLY'S HOUSE" },
  { x: 78, y: 112, kind: 'level', li: 0 },
  { x: 126, y: 146, kind: 'level', li: 1 },
  { x: 170, y: 104, kind: 'level', li: 2 },
  { x: 214, y: 70, kind: 'castle', li: 3 },
];
const Island = (() => {
  const c = Sprites.canvas(VW, VH), x = c.getContext('2d'), r = Sprites.rng(42);
  const blobs = NODES.map((n) => [n.x, n.y + 4, 34]).concat([[56, 132, 30], [102, 128, 30], [150, 126, 30], [192, 88, 30], [128, 170, 22], [190, 140, 24]]);
  const img = x.createImageData(VW, VH);
  for (let yy = 0; yy < VH; yy++) for (let xx = 0; xx < VW; xx++) {
    let f = 0;
    for (const [bx, by, br] of blobs) f += (br * br) / ((xx - bx) ** 2 + ((yy - by) * 1.25) ** 2 + 1);
    let col = null;
    if (f > 2.2) col = ((xx + yy) % 2 === 0 && f < 3.2) ? [74, 184, 78] : [90, 204, 88];
    else if (f > 1.6) col = [240, 216, 140];
    else if (f > 1.35) col = [140, 200, 248];
    if (f > 6 && r() < 0.03) col = [60, 150, 60];
    if (col) { const i = (yy * VW + xx) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  // little trees & rocks
  const tree = Sprites.fromRows(['..KKK..', '.KGGGK.', 'KGgGGGK', 'KGGGgGK', '.KGGGK.', '..KTK..', '..KTK..'], { K: '#14401a', G: '#30a040', g: '#68d870', T: '#8a5a2a' });
  [[20, 120], [60, 160], [100, 100], [148, 170], [196, 120], [232, 96], [120, 118], [92, 168], [176, 154], [44, 104]].forEach(([a, b]) => x.drawImage(tree, a, b));
  return c;
})();
function MapScene() {
  let node = game.node || 0, pos = { x: NODES[node].x, y: NODES[node].y }, target = null, t = 0;
  const unlocked = (n) => n >= 0 && n < NODES.length && (n <= 1 || game.cleared[n - 2]);
  function drawNode(n, i) {
    const cleared = n.li !== undefined && game.cleared[n.li];
    if (n.kind === 'home') {
      ctx.fillStyle = '#c03030'; for (let k = 0; k < 6; k++) ctx.fillRect(n.x - 7 + k, n.y - 12 + 5 - k, 14 - k * 2, 1);
      ctx.fillStyle = '#f8f0d8'; ctx.fillRect(n.x - 6, n.y - 6, 12, 8); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(n.x - 1, n.y - 3, 3, 5);
      ctx.fillStyle = '#5ff0ff'; ctx.fillRect(n.x - 5, n.y - 4, 3, 2);
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
      const fwd = Input.pressed('right') || Input.pressed('up'), back = Input.pressed('left') || Input.pressed('down');
      if (fwd && unlocked(node + 1)) { target = node + 1; Audio8.sfx('map'); } else if (back && node > 0) { target = node - 1; Audio8.sfx('map'); } else if (fwd) Audio8.sfx('bump');
      if (Input.confirm() && NODES[node].li !== undefined) { Audio8.sfx('confirm'); const li = NODES[node].li; go(() => IntroScene(li, false)); }
      if (Input.pressed('back')) go(() => TitleScene());
    },
    draw() {
      ctx.fillStyle = '#2858c8'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#4c80e8';
      for (let yy = 4; yy < VH; yy += 10) for (let xx = ((yy * 7) % 24) - 24; xx < VW; xx += 24) ctx.fillRect(xx + ((t >> 4) + (yy >> 1)) % 6, yy, 5, 1);
      ctx.drawImage(Island, 0, 0);
      for (let i = 0; i < NODES.length - 1; i++) {
        if (!unlocked(i + 1)) continue;
        const a = NODES[i], b = NODES[i + 1], d = Math.hypot(b.x - a.x, b.y - a.y);
        for (let s = 0; s < d; s += 4) { ctx.fillStyle = '#7a5a2a'; ctx.fillRect(Math.round(a.x + ((b.x - a.x) * s) / d) - 1, Math.round(a.y + ((b.y - a.y) * s) / d), 3, 2); }
      }
      NODES.forEach(drawNode);
      const walking = target !== null;
      const face = target !== null ? Math.sign(NODES[target].x - pos.x) || 1 : 1;
      const pose = walking ? 'walk' + ((t >> 2) % 8) : 'idle' + ((t >> 4) % 4);
      drawWally(pos.x, pos.y + 2, pose, face);
      drawWindow(4, 4, 248, 20);
      txt('WALLY ISLAND', 10, 10, '#ffe040');
      ctx.drawImage(Sprites.heart, 112, 10); txt('*' + pad(game.lives, 2), 121, 10);
      ctx.drawImage(Sprites.coinIcon, 150, 10); txt('*' + pad(game.coins, 2), 157, 10);
      txt(pad(game.score, 7), 206, 10);
      drawWindow(4, 196, 248, 24);
      const n = NODES[node];
      const label = n.li !== undefined ? `${n.li + 1}. ${LEVELS[n.li].name}` : n.name;
      txt(label, 12, 205, '#fff');
      if (n.li !== undefined && game.cleared[n.li]) txt('# CLEAR', 200, 205, '#ffe040');
      if (target === null && (t >> 5) % 2 === 0) txt(n.li !== undefined ? 'PRESS START' : '> ARROWS', 160, 186, '#fff', { outline: '#101848' });
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
      txt(`LEVEL ${li + 1}`, 128, 60, '#ffe040', { scale: 2, align: 'center' });
      txt(LEVELS[li].name, 128, 88, '#fff', { align: 'center' });
      drawWally(110, 142, 'idle' + ((t >> 4) % 4), 1);
      txt('*  ' + game.lives, 124, 126, '#fff');
    },
  };
}
function GameOverScene() {
  let t = 0;
  return {
    enter() { Audio8.play('gameover'); game.lives = 5; game.coins = 0; Save.persist(); },
    update() { t++; if (t > 300 || (t > 60 && Input.confirm())) go(() => TitleScene()); },
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
    update() { t++; if (t > 240 && Input.confirm()) go(() => TitleScene()); },
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

// =====================================================================
// The platforming!
// =====================================================================
class Play {
  constructor(li, fromCheckpoint) {
    this.li = li; this.lv = buildLevel(li); this.def = this.lv.def;
    this.T = Sprites.tiles[this.def.theme];
    this.ents = []; this.parts = []; this.pings = []; this.platforms = []; this.bumps = [];
    this.state = 'play'; this.stateT = 0; this.paused = false; this.time = this.def.time; this.timeTick = 0;
    this.cpHit = !!fromCheckpoint && !!this.lv.checkpoint; this.bossLock = false; this.camMin = 0; this.shake = 0;
    const s = this.cpHit ? this.lv.checkpoint : this.lv.start;
    this.p = { x: s.x * TS + 3, y: (s.y + 1) * TS - 22, w: 10, h: 22, vx: 0, vy: 0, face: 1, onGround: false, hearts: 2, power: 'none', inv: 0, anim: 0, jumpBuf: 0, coyote: 0, prevBottom: 0, platform: null, sx: 1, sy: 1, hurtT: 0, trail: [] };
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
      case 'G': E({ type: 'goal', x: x + 2, y: y - 80, w: 12, h: 96 }); break;
      case 'K': E({ type: 'boss', x, y: y - 14, w: 28, h: 30, hp: 3, inv: 0, jumpT: 120, enemy: true, boss: true }); break;
    }
  }

  // ---------- events ----------
  addScore(n, x, y) { game.score += n; if (x !== undefined) this.parts.push({ k: 'text', s: String(n), x, y, vy: -0.6, life: 50 }); }
  addCoin() { game.coins++; game.score += 20; if (game.coins >= 100) { game.coins -= 100; game.lives++; Audio8.sfx('oneup'); } else Audio8.sfx('coin'); }
  hitBlock(tx, ty) {
    const c = this.tile(tx, ty);
    const bx = tx * TS, by = ty * TS;
    for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss && overlap(e, { x: bx, y: by - 6, w: 16, h: 6 })) this.flipKill(e);
    if ('WPSO'.includes(c)) {
      this.setTile(tx, ty, 'U'); this.bumps.push({ tx, ty, t: 0 });
      if (c === 'W') { this.addCoin(); this.parts.push({ k: 'coinpop', x: bx + 4, y: by - 14, vy: -4, life: 26 }); } else {
        Audio8.sfx('sprout');
        const type = c === 'P' ? 'drink' : c === 'S' ? 'phone' : 'badge';
        this.ents.push({ type, item: true, alive: true, x: bx + 2, y: by, w: 12, h: 14, vx: 0, vy: 0, rise: 16, t: 0 });
      }
    } else if (c === 'B') {
      this.setTile(tx, ty, '.'); Audio8.sfx('brick'); this.addScore(50);
      for (const [dx, dy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1, -3.5], [8, 8, 1, -3.5]]) this.parts.push({ k: 'frag', x: bx + dx, y: by + dy, vx, vy, g: 0.3, life: 70 });
    } else { Audio8.sfx('bump'); }
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.parts.push({ k: 'dust', x: x + (i - (n - 1) / 2) * 5, y: y - 2, vx: (i - (n - 1) / 2) * 0.35, vy: -0.25, life: 18 });
  }
  playerPose() {
    const p = this.p;
    if (p.hurtT > 0) return 'hurt';
    if (this.state === 'clear' && Math.abs(p.vx) < 0.2 && p.onGround) return 'win' + ((frame >> 4) & 1);
    if (this.state === 'bossdead' && p.onGround && Math.abs(p.vx) < 0.2) return 'win' + ((frame >> 4) & 1);
    if (!p.onGround) return p.vy < 0 ? 'jump' : 'fall';
    if (p.crouch) return 'crouch';
    if (p.skid) return 'skid';
    if (Math.abs(p.vx) > 0.15) return (Math.abs(p.vx) > 2.2 ? 'run' : 'walk') + (Math.floor(p.anim) % 8);
    return 'idle' + ((frame >> 4) % 4);
  }
  flipKill(e) { e.dying = 'flip'; e.vy = -3.5; e.vx = this.p.x < e.x ? 0.8 : -0.8; Audio8.sfx('kick'); this.addScore(200, e.x, e.y); }
  stomp(e) {
    const p = this.p;
    p.vy = Input.down('jump') ? -6.2 : -3.8; p.y = e.y - p.h - 0.1;
    Audio8.sfx('stomp'); this.addScore(100, e.x, e.y - 8);
    this.parts.push({ k: 'star', x: e.x + 7, y: e.y + 4, life: 12 });
    if (e.type === 'grumble') { e.dying = 'squish'; e.dt = 30; } else this.flipKill(e);
  }
  hurt(spike) {
    const p = this.p;
    if (p.inv > 0 || this.state !== 'play') return;
    p.hearts--;
    if (p.hearts <= 0) { this.die(); return; }
    p.inv = 120; p.hurtT = 24; p.power = 'none'; Audio8.sfx('hurt');
    if (spike) p.vy = -5;
  }
  die() {
    if (this.state === 'dying') return;
    this.state = 'dying'; this.stateT = 0; this.p.hearts = 0;
    Audio8.play('die');
  }
  clear() {
    if (this.state !== 'play') return;
    this.state = 'clear'; this.stateT = 0; Audio8.play('clear');
    this.parts.push({ k: 'text', s: 'COURSE CLEAR!', x: this.p.x - 30, y: this.p.y - 30, vy: -0.2, life: 100 });
  }

  // ---------- update ----------
  update() {
    if (Input.pressed('start') && (this.state === 'play')) { this.paused = !this.paused; Audio8.sfx('pause'); }
    if (this.paused) {
      if (Input.pressed('run') || Input.pressed('back')) { this.paused = false; Save.persist(); go(() => MapScene()); }
      return;
    }
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
    for (const q of this.parts) { q.life--; if (q.vx) q.x += q.vx; if (q.vy) q.y += q.vy; if (q.g) q.vy += q.g; if (q.k === 'coinpop') q.vy += 0.3; }
    this.parts = this.parts.filter((q) => q.life > 0);
    for (const b of this.bumps) b.t++;
    this.bumps = this.bumps.filter((b) => b.t < 10);

    // camera
    const target = p.x + p.w / 2 - VW / 2 + p.face * 16;
    this.cam.x += (target - this.cam.x) * 0.1;
    this.cam.x = clamp(this.cam.x, this.camMin, this.lv.w * TS - VW);

    // boss arena lock
    if (this.def.boss && !this.bossLock && p.x > (this.lv.w - 16) * TS + 24) {
      this.bossLock = true; this.camMin = (this.lv.w - 16) * TS; Audio8.play('boss');
    }

    // timer
    if (this.state === 'play' && ++this.timeTick >= 40) {
      this.timeTick = 0; this.time--;
      if (this.time === 100) this.parts.push({ k: 'text', s: 'HURRY UP!', x: this.cam.x + 100, y: 100, vy: 0, life: 120, fixed: true });
      if (this.time <= 0) { this.time = 0; this.die(); }
    }
    if (this.state === 'clear') this.updateClear();
    if (this.state === 'bossdead') {
      if (this.stateT % 8 === 0 && this.stateT < 100) { Audio8.sfx('boom'); this.parts.push({ k: 'boom', x: this.bossX + Math.random() * 32, y: this.bossY + Math.random() * 32, life: 20 }); }
      if (this.stateT === 110) Audio8.play('clear');
      if (this.stateT > 300) { game.cleared[this.li] = true; game.node = 4; Save.persist(); go(() => EndingScene()); this.state = 'done'; }
    }
  }
  updatePlayer() {
    const p = this.p, auto = this.state === 'clear';
    if (p.inv > 0) p.inv--;
    const run = !auto && Input.down('run');
    const max = run ? 2.8 : 1.6, acc = run ? 0.11 : 0.08;
    let dir = auto ? (this.stateT > 30 ? 1 : 0) : (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    p.crouch = !auto && p.onGround && Input.down('down') && !dir;
    if (p.crouch) dir = 0;
    if (dir) {
      if (Math.sign(p.vx) === -dir && p.onGround) { p.vx += dir * 0.2; p.skid = true; } else { p.vx += dir * acc; p.skid = false; }
      if (Math.abs(p.vx) > max) p.vx = approach(p.vx, dir * max, 0.12);
      p.face = dir;
    } else { p.vx = approach(p.vx, 0, p.onGround ? 0.09 : 0.03); p.skid = false; }
    if (auto) p.vx = Math.min(p.vx, 1.2);

    if (!auto && Input.pressed('jump')) p.jumpBuf = 6; else if (p.jumpBuf > 0) p.jumpBuf--;
    if (p.onGround) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -(5.4 + Math.abs(p.vx) * 0.25); p.jumpBuf = 0; p.coyote = 0; Audio8.sfx('jump');
      p.sx = 0.8; p.sy = 1.2; this.dust(p.x + p.w / 2, p.y + p.h, 2);
    }
    const hold = !auto && Input.down('jump') && p.vy < 0;
    p.vy = Math.min(5.5, p.vy + (hold ? 0.19 : 0.5));

    if (!auto && p.power === 'signal' && Input.pressed('run') && this.pings.length < 2) {
      this.pings.push({ x: p.x + (p.face > 0 ? p.w : -8), y: p.y + 8, w: 8, h: 8, vx: p.face * 3.6, life: 55 });
      Audio8.sfx('ping'); p.fire = 8;
    }
    if (p.fire > 0) p.fire--;

    p.prevBottom = p.y + p.h;
    const wasGround = p.onGround, fallV = p.vy;
    this.move(p, true);
    if (p.onGround && !wasGround && fallV > 2) { p.sx = 1.25; p.sy = 0.8; this.dust(p.x + p.w / 2, p.y + p.h, 3); }
    if (p.onGround && p.skid && frame % 4 === 0) this.dust(p.x + p.w / 2 + p.face * 4, p.y + p.h, 1);
    if (p.onGround && Math.abs(p.vx) > 2.4 && frame % 9 === 0) this.dust(p.x + p.w / 2 - Math.sign(p.vx) * 5, p.y + p.h, 1);
    p.sx += (1 - p.sx) * 0.22; p.sy += (1 - p.sy) * 0.22;
    if (p.hurtT > 0) p.hurtT--;
    if (Math.abs(p.vx) > 2.5 && frame % 3 === 0) { p.trail.unshift({ x: p.x, y: p.y, pose: this.playerPose(), face: p.face }); p.trail.length = Math.min(p.trail.length, 3); } else if (frame % 3 === 0) p.trail.pop();
    if (p.ceil) this.hitBlock(p.ceil.tx, p.ceil.ty);
    if (p.x < this.camMin) { p.x = this.camMin; if (p.vx < 0) p.vx = 0; }
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
    if (t === 200) {
      game.lives--; Save.persist();
      if (game.lives < 0) go(() => GameOverScene()); else { const li = this.li, cp = this.cpHit; go(() => IntroScene(li, cp)); }
    }
  }
  updateClear() {
    const t = this.stateT;
    if (t > 120 && this.time > 0) {
      const d = Math.min(this.time, 3); this.time -= d; game.score += d * 50;
      if (t % 4 === 0) Audio8.sfx('tick');
    }
    if (t === 420) {
      game.cleared[this.li] = true; game.node = Math.max(game.node, this.li + 1); Save.persist();
      go(() => MapScene());
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
      case 'spark':
        e.x += e.vx; e.life--;
        if (e.life <= 0 || SOLID.has(this.tile(Math.floor((e.x + (e.vx > 0 ? e.w : 0)) / TS), Math.floor((e.y + 4) / TS)))) e.alive = false;
        break;
      case 'boss': this.updateBoss(e); return;
      case 'drink': case 'phone': case 'badge':
        if (e.rise > 0) { e.y -= 0.5; e.rise -= 0.5; if (e.rise <= 0) e.vx = e.type === 'phone' ? 0 : e.type === 'badge' ? 1.2 : 1; break; }
        e.vy = Math.min(5, e.vy + 0.3);
        this.move(e, true);
        if (e.hitWall) e.vx = -e.hitWall * Math.abs(e.vx);
        break;
      case 'checkpoint':
        if (!e.on && p.x + p.w > e.x && this.state === 'play') { e.on = true; this.cpHit = true; Audio8.sfx('check'); if (p.hearts < 2) p.hearts = 2; }
        return;
      case 'goal':
        if (overlap(p, e)) this.clear();
        return;
    }
    if (this.state !== 'play') return;
    if (e.item && e.rise <= 0 && overlap(p, e)) {
      e.alive = false;
      if (e.type === 'drink') { if (p.hearts >= 3) this.addScore(1000, e.x, e.y); else { p.hearts++; this.parts.push({ k: 'text', s: '+$', x: e.x, y: e.y - 8, vy: -0.5, life: 50 }); } Audio8.sfx('power'); }
      if (e.type === 'phone') { p.power = 'signal'; Audio8.sfx('signal'); this.parts.push({ k: 'text', s: 'SIGNAL!', x: e.x - 12, y: e.y - 8, vy: -0.5, life: 60 }); }
      if (e.type === 'badge') { game.lives++; Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: '1UP', x: e.x, y: e.y - 8, vy: -0.5, life: 60 }); }
    }
    if ((e.enemy || e.hazard) && overlap(p, e)) {
      if (e.stomp && p.vy > 0 && p.prevBottom <= e.y + 7) this.stomp(e); else this.hurt();
    }
  }
  updateBoss(e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    e.vy = Math.min(6, e.vy + 0.3);
    if (this.bossLock && this.state === 'play') {
      const speed = 0.6 + (3 - e.hp) * 0.3;
      if (e.onGround) {
        if (e.t % 50 === 0) e.vx = (p.x < e.x ? -1 : 1) * speed;
        if (--e.jumpT <= 0) { e.vy = -6 - (3 - e.hp) * 0.3; e.jumpT = 110 - (3 - e.hp) * 20; e.leapt = true; }
      }
    } else e.vx = 0;
    const was = e.onGround;
    this.move(e, false);
    if (e.hitWall) e.vx = -e.vx;
    if (e.onGround && !was && e.leapt) {
      e.leapt = false; this.shake = 12; Audio8.sfx('spark');
      for (const d of [-1, 1]) this.ents.push({ type: 'spark', hazard: true, alive: true, x: e.x + 10, y: e.y + e.h - 10, w: 8, h: 10, vx: d * (1.6 + (3 - e.hp) * 0.3), vy: 0, t: 0, life: 240 });
    }
    if (this.state !== 'play' || !overlap(p, e)) return;
    if (e.inv === 0 && p.vy > 0 && p.prevBottom <= e.y + 10) {
      e.hp--; e.inv = 90; p.vy = -6.5; this.shake = 16; Audio8.sfx('bosshit'); this.addScore(1000, e.x, e.y - 8);
      if (e.hp <= 0) {
        e.alive = false; this.state = 'bossdead'; this.stateT = 0; this.bossX = e.x; this.bossY = e.y; Audio8.stop();
        this.ents.forEach((s) => { if (s.type === 'spark') s.alive = false; });
        this.addScore(5000);
      }
    } else if (e.inv === 0) this.hurt();
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
    for (const g of this.pings) this.drawPing(g, cx);
    for (const q of this.parts) this.drawPart(q, cx);
    this.drawHUD();
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, VH);
      drawWindow(60, 84, 136, 52);
      txt('PAUSED', 128, 94, '#ffe040', { scale: 2, align: 'center' });
      txt('X: EXIT TO MAP', 128, 118, '#fff', { align: 'center' });
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
        case 'W': case 'P': case 'S': case 'O': img = T.bonus[bonusF]; break;
        case 'U': img = T.used; break;
        case 'X': img = T.solid; break;
        case '=': img = T.oneway; break;
        case '^': img = T.spikes; break;
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
    const pose = this.playerPose();
    const face = p.skid ? -p.face : p.face;
    Wally.draw(ctx, fx, fy, pose, face, {
      t: frame, sx: p.sx, sy: p.sy, signal, white: p.fire > 4 || p.hurtT > 18,
      glow: signal ? 0.25 + 0.2 * Math.sin(frame * 0.15) : 0,
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
    ctx.fillStyle = e.hp < 3 ? '#ff3040' : '#ff8030';
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
    txt('WALLYMAN', 8, 6, '#f2702a');
    txt('*' + pad(Math.max(0, game.lives), 2), 14, 15, '#fff');
    for (let i = 0; i < 3; i++) ctx.drawImage(i < p.hearts ? Sprites.heart : Sprites.heartEmpty, 62 + i * 9, 6);
    if (p.power === 'signal') { ctx.drawImage(Sprites.phone, 88, 2); }
    txt('TIME', 112, 6, '#ffe040');
    txt(pad(this.time, 3), 117, 15, this.time <= 100 && (frame >> 4) & 1 ? '#ff6060' : '#fff');
    ctx.drawImage(Sprites.coinIcon, 176, 6); txt('*' + pad(game.coins, 2), 183, 6, '#fff');
    txt(pad(game.score, 7), 206, 15, '#fff');
    if (this.def.boss && this.bossLock) {
      const b = this.ents.find((e) => e.boss);
      if (b) { txt('BARON STATIC', 8, 26, '#ff8080'); for (let i = 0; i < 3; i++) { ctx.fillStyle = i < b.hp ? '#ff3040' : '#402028'; ctx.fillRect(84 + i * 8, 27, 6, 5); } }
    }
  }
}

// =====================================================================
// Main loop (fixed 60 Hz update)
// =====================================================================
function resize() {
  const touch = document.body.classList.contains('touch');
  const availH = innerHeight - (touch && innerHeight > innerWidth ? 190 : 0);
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
  scene.draw();
  if (fade > 0) {
    // SNES-style "iris" fade: a shrinking/growing circle mask
    const r = (1 - fade) * 190;
    ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.arc(128, 112, Math.max(0, r), 0, Math.PI * 2, true); ctx.fill(); ctx.restore();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
