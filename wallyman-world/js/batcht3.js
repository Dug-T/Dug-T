'use strict';
// =====================================================================
// Update 2.0 (part 3): comfort and sharing
//  - QUICK RESUME: if the page is hidden or closed during a level, the
//    game pauses and remembers where you were; next time, the title
//    screen offers to carry on from there
//  - QR codes: every share code (ghost races, Level Maker courses and
//    worlds, save codes) also shows as a QR code; scanning it opens the
//    game with the code ready to paste
//  - BIG TEXT, READ ALOUD, ONE HAND (touch) options
//  - SHOW ME THE WAY: after a few lost lives on the same level, press S
//    and a ghost of your hero plays through the tricky part for you
// =====================================================================
const QR = (() => { // a small QR code encoder: byte mode, error correction level L, versions 1-40
  const ECC = [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
  const BLOCKS = [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25];
  const rawModules = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const dataCap = (v) => Math.floor(rawModules(v) / 8) - ECC[v] * BLOCKS[v];
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 255; };
  const divisor = (deg) => { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; };
  const remainder = (data, div) => { const r = new Array(div.length).fill(0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); } return r; };
  const align = (v, size) => { if (v === 1) return []; const n = Math.floor(v / 7) + 2, step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, r = [6]; for (let p = size - 7; r.length < n; p -= step) r.splice(1, 0, p); return r; };
  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let v = 1; for (; v <= 40; v++) if (bytes.length + (v <= 9 ? 2 : 3) <= dataCap(v)) break;
    if (v > 40) return null;
    const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v <= 9 ? 8 : 16); bytes.forEach((b) => put(b, 8));
    const cap = dataCap(v) * 8; put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let pad = 0xec; data.length < dataCap(v); pad ^= 0xec ^ 0x11) data.push(pad);
    // split into blocks, add error correction, interleave
    const nb = BLOCKS[v], el = ECC[v], raw = Math.floor(rawModules(v) / 8), nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb), div = divisor(el), blocks = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += d.length; const e = remainder(d, div); if (i < nShort) d.push(0); blocks.push(d.concat(e)); }
    const cw = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) cw.push(b[i]); });
    // the grid
    const size = v * 4 + 17, M = Array.from({ length: size }, () => new Array(size).fill(false)), F = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < size && y < size) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); } }
    const ap = align(v, size), last = ap.length - 1;
    ap.forEach((ax, i) => ap.forEach((ay, j) => { if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
    const format = () => { const d = (1 << 3) | 0; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const b = ((d << 10) | r) ^ 0x5412, g = (i) => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i)); set(8, size - 8, true); };
    format();
    if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); const b = (v << 12) | r; for (let i = 0; i < 18; i++) { const bit = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, bit); set(c, a, bit); } }
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert; if (!F[y][x] && i < cw.length * 8) { M[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && (x + y) % 2 === 0) M[y][x] = !M[y][x]; // mask 0
    format();
    return { size, M, version: v };
  }
  function canvas(text, px = 4) {
    const q = encode(text); if (!q) return null;
    const c = document.createElement('canvas'), n = q.size + 8; c.width = c.height = n * px; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#000000';
    for (let y = 0; y < q.size; y++) for (let X = 0; X < q.size; X++) if (q.M[y][X]) x.fillRect((X + 4) * px, (y + 4) * px, px, px);
    return c;
  }
  return { encode, canvas };
})();

const U20 = (() => {
  const isPlay = () => typeof Play !== 'undefined' && scene instanceof Play;
  const opt = (k, d) => Opt19.get(k, d);

  // ---------------- QR codes on every share box ----------------
  const shareURL = (code) => { try { if (/^https?:/.test(location.protocol) && window.top === window) return location.origin + location.pathname + '#code=' + encodeURIComponent(code); } catch (e) { /* inside a frame */ } return code; };
  let incoming = null;
  try { const m = /[#&]code=([^&]+)/.exec(location.hash); if (m) { incoming = decodeURIComponent(m[1]); history.replaceState(null, '', location.pathname + location.search); } } catch (e) { /* ignore */ }
  const codeKind = (c) => { const tryD = (o, f) => { try { return o && o[f] && o[f](c); } catch (e) { return null; } };
    if (typeof GhostCode !== 'undefined' && tryD(GhostCode, 'decode')) return 'GHOST RACES'; if (typeof MakerWorld !== 'undefined' && tryD(MakerWorld, 'decode')) return 'MAKER WORLDS';
    if (typeof Maker !== 'undefined' && tryD(Maker, 'decode')) return 'LEVEL MAKER'; if (typeof SaveCode !== 'undefined' && tryD(SaveCode, 'decode')) return 'LOAD SAVE CODE'; return null; };
  const incomingKind = incoming ? codeKind(incoming) : null;
  {
    const _cb = codeBox;
    codeBox = function (title, text, onLoad, onClose) { // eslint-disable-line no-func-assign
      if (onLoad && !text && incoming) text = incoming;
      _cb(title, text, onLoad, onClose);
      const box = document.body.lastElementChild && document.body.lastElementChild.firstElementChild; if (!box) return;
      if (onLoad && text === incoming && incoming) { const n = document.createElement('div'); n.textContent = 'Code from a QR scan is ready - press LOAD.'; n.style.cssText = 'color:#5ae060;font-size:12px;margin:4px 0'; box.insertBefore(n, box.children[1]); }
      if (!onLoad && text) {
        const c = QR.canvas(shareURL(text), 3), wrap = document.createElement('div'); wrap.style.cssText = 'margin:8px auto 4px;text-align:center';
        if (c) { c.style.cssText = 'width:min(60vw,220px);height:auto;image-rendering:pixelated;border-radius:6px'; c.setAttribute('aria-label', 'QR code'); const l = document.createElement('div'); l.textContent = 'Or scan this with a phone camera'; l.style.cssText = 'font-size:12px;color:#c8d0ff;margin-top:4px'; wrap.append(c, l); }
        else { wrap.textContent = 'Too long for a QR code - copy the text instead.'; wrap.style.cssText += ';font-size:12px;color:#ffb0b0'; }
        box.insertBefore(wrap, box.children[2]);
      }
    };
  }

  // ---------------- QUICK RESUME ----------------
  const RKEY = 'wallyman-resume';
  const eligible = (pl) => pl && pl.def && !pl.ta && !pl.rush && !pl.endless && !pl.def.custom && !pl.def.reserved && !pl.p2 && !(game && game.coop) && pl.state === 'play' && Save.slots.indexOf(game) >= 0;
  function snapshot() {
    if (!isPlay() || !eligible(scene)) return;
    const pl = scene, p = pl.p, safe = pl._safe || [p.x, p.y];
    try { localStorage.setItem(RKEY, JSON.stringify({ slot: Save.slots.indexOf(game), li: pl.li, x: safe[0], y: safe[1], hearts: p.hearts, time: pl.time, cp: !!pl.cpHit, at: Date.now(), v: GAME_VERSION })); Save.persist(); } catch (e) { /* ignore */ }
    if (!pl.paused && pl.state === 'play') { pl.paused = true; pl.pauseSel = 0; }
  }
  const clearResume = () => { try { localStorage.removeItem(RKEY); } catch (e) { /* ignore */ } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) snapshot(); });
  addEventListener('pagehide', snapshot);
  let wasPlay = false;
  function track() { // remember safe ground; forget the resume point once a level ends normally
    const now = isPlay();
    if (now) { const p = scene.p; if (p && p.onGround && !p.riding && scene.state === 'play') scene._safe = [p.x, p.y]; if (scene.state === 'clear') clearResume(); }
    if (wasPlay && !now && !document.hidden) clearResume();
    wasPlay = now;
  }
  {
    const _T = TitleScene;
    TitleScene = function (...a) { // eslint-disable-line no-func-assign
      const s = _T(...a), u = s.update, d = s.draw; let r = null, ask = false, t = 0;
      try { r = JSON.parse(localStorage.getItem(RKEY) || 'null'); } catch (e) { r = null; }
      if (r && Save.slots[r.slot] && LEVELS[r.li] && Date.now() - r.at < 1000 * 60 * 60 * 24 * 7) ask = true; else if (r) clearResume();
      s.update = function () {
        if (!ask) return u.call(this);
        t++; if (t < 20) return;
        if (Input.confirm()) {
          ask = false; Audio8.sfx('confirm'); game = Save.slots[r.slot]; clearResume();
          go(() => { const pl = new Play(r.li, r.cp); const _e = pl.enter; pl.enter = function () { const res = _e.apply(this, arguments); const p = this.p; p.x = r.x; p.y = r.y; p.vx = p.vy = 0; p.inv = 120; if (r.hearts > 0) p.hearts = r.hearts; if (r.time > 0) this.time = r.time; this.cam.x = clamp(p.x - 100, this.camMin || 0, this.lv.w * TS - VW); this.parts.push({ k: 'text', s: 'WELCOME BACK!', x: p.x - 28, y: p.y - 24, vy: -0.3, life: 90 }); return res; }; return pl; });
          return;
        }
        if (Input.pressed('run') || Input.pressed('back')) { ask = false; clearResume(); Audio8.sfx('select'); }
      };
      s.draw = function () {
        d.call(this); if (!ask) return;
        ctx.fillStyle = 'rgba(10,10,30,0.6)'; ctx.fillRect(0, 0, VW, VH); drawWindow(28, 70, 200, 84);
        txt('CARRY ON?', 128, 80, '#5ff0ff', { align: 'center', scale: 2 });
        txt(LEVELS[r.li].name, 128, 104, '#ffe040', { align: 'center' }); txt(`FILE ${r.slot + 1}`, 128, 116, '#fff', { align: 'center' });
        txt('A: CARRY ON    B: NO THANKS', 128, 136, '#fff', { align: 'center' });
      };
      return s;
    };
  }

  // ---------------- BIG TEXT, READ ALOUD ----------------
  {
    const _fd = Font.draw; let said = '', frameTxt = [], winTxt = [], inWin = false, lastSpeak = 0;
    const voice = () => opt('speak', '0') === '1' && 'speechSynthesis' in window;
    Font.draw = function (c, str, x, y, o = {}) {
      if (c === ctx && voice() && str) { const s = String(str); if (o.color === '#ffe040' || /^> /.test(s)) frameTxt.push(s); if (inWin) winTxt.push(s); }
      if (c === ctx && opt('bigtext', '0') === '1' && Modern.on()) { // taller, bolder letters in the same width
        const w0 = Font.width ? Font.width(String(str)) * (o.scale || 1) : 0; if (!w0) return _fd.call(this, c, str, x, y, o);
        const k = 1.22; c.save(); const ax = o.align === 'center' ? x : o.align === 'right' ? x : x; c.translate(ax, y + 7 * (o.scale || 1)); c.scale(1 / k, 1); c.translate(-ax, -(y + 7 * (o.scale || 1)));
        const r = _fd.call(this, c, str, x, y - 1.4 * (o.scale || 1), Object.assign({}, o, { scale: (o.scale || 1) * k, bold: true }));
        c.restore(); return r;
      }
      return _fd.call(this, c, str, x, y, o);
    };
    const _dw = drawWindow; drawWindow = function (...a) { inWin = true; return _dw(...a); }; // eslint-disable-line no-func-assign
    var speakFrame = function () { // eslint-disable-line no-var
      if (!voice()) { frameTxt = []; winTxt = []; inWin = false; return; }
      const say = (isPlay() && !scene.paused ? winTxt.slice(0, 6) : frameTxt.slice(0, 3)).map((q) => q.replace(/[<>*#$@]/g, ' ').trim()).filter(Boolean).join('. ').replace(/\s+/g, ' ').trim();
      frameTxt = []; winTxt = []; inWin = false;
      if (say && say !== said && performance.now() - lastSpeak > 250) { said = say; lastSpeak = performance.now(); try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(say.toLowerCase()); u.rate = 1.05; speechSynthesis.speak(u); } catch (e) { /* ignore */ } }
      if (!say) said = '';
    };
  }

  // ---------------- ONE HAND (touch) ----------------
  { const _g = Settings.get; Settings.get = function (k) { if (k === 'autorun' && opt('onehand', 'OFF') !== 'OFF' && isPlay()) return true; return _g.apply(this, arguments); }; }
  const handView = () => { const h = opt('onehand', 'OFF'); document.body.classList.toggle('onehand-left', h === 'LEFT'); document.body.classList.toggle('onehand-right', h === 'RIGHT'); };

  // ---------------- SHOW ME THE WAY ----------------
  const deaths = {}, deathX = {};
  const guideOK = (pl) => pl.def && !pl.def.shmup && !pl.def.autoscroll && !pl.def.boss && !pl.def.tower && !pl.def.custom && !pl.ta && !pl.rush && !pl.endless && !pl.p2;
  {
    const PP = Play.prototype, _die = PP.die, _en = PP.enter, _up = PP.update, _dp = PP.drawPlayer, _cl = PP.clear;
    PP.die = function () {
      if (this._guide) { const p = this.p; p.vy = -7; p.y = Math.min(p.y, VH - 80); p.inv = 90; return; }
      if (this.state !== 'dying' && this.state === 'play' && this.li !== undefined) { deaths[this.li] = (deaths[this.li] || 0) + 1; deathX[this.li] = Math.max(deathX[this.li] || 0, this.p.x); }
      return _die.apply(this, arguments);
    };
    PP.clear = function () { if (this.li !== undefined) { deaths[this.li] = 0; deathX[this.li] = 0; } return _cl.apply(this, arguments); };
    PP.enter = function () { const r = _en.apply(this, arguments); if (guideOK(this) && (deaths[this.li] || 0) >= 3) this._guideOffer = 420; return r; };
    PP.update = function () {
      if (this._guideOffer > 0 && this.state === 'play') { this._guideOffer--; if (Input.pressed('special')) { this._guideOffer = 0; this._guide = { until: (deathX[this.li] || this.p.x) + 10 * TS, bestX: this.p.x, stuck: 0, jt: 0 }; Audio8.sfx('signal'); } }
      if (this._guide && this.state === 'play') {
        const g = this._guide, p = this.p, S = Input.synth; p.inv = Math.max(p.inv || 0, 30);
        S.right = 2; S.run = 2;
        const T = (px, py) => this.tile(Math.floor(px / TS), Math.floor(py / TS)), feet = p.y + p.h;
        const wall = SOLID.has(T(p.x + p.w + 6, feet - 4)) || SOLID.has(T(p.x + p.w + 6, feet - 14));
        let gap = true; for (let k = 0; k < 4; k++) { const c = T(p.x + p.w / 2 + 18, feet + 2 + k * TS); if (SOLID.has(c) || c === '=') gap = false; }
        const foe = this.ents.some((e) => e.enemy && e.alive && !e.dying && e.x > p.x && e.x - p.x < 34 && Math.abs(e.y - p.y) < 26);
        if (p.onGround && g.jt <= 0 && (wall || gap || foe)) g.jt = 18;
        if (g.jt > 0) { g.jt--; S.jump = 2; }
        if (p.vy > 0 && p.y + p.h > VH - 6) { p.vy = -8; p.y = Math.min(p.y, VH - 40); this.parts.push({ k: 'text', s: 'BOING', x: p.x - 8, y: p.y, vy: -0.4, life: 30 }); }
        if (p.x > g.bestX + 2) { g.bestX = p.x; g.stuck = 0; } else if (++g.stuck > 110) { p.y -= 36; p.vy = -3; g.stuck = 0; }
        if (p.x > g.until) { this._guide = null; p.inv = Math.max(p.inv || 0, 120); this.parts.push({ k: 'text', s: 'YOUR TURN!', x: p.x - 20, y: p.y - 20, vy: -0.4, life: 80 }); Audio8.sfx('check'); }
      }
      return _up.apply(this, arguments);
    };
    PP.drawPlayer = function (cx) {
      if (!this._guide) return _dp.call(this, cx);
      ctx.save(); ctx.globalAlpha = 0.55 + 0.15 * Math.sin(frame * 0.2); const r = _dp.call(this, cx); ctx.restore();
      const p = this.p; ctx.fillStyle = `rgba(160,240,255,${(0.5 + 0.3 * Math.sin(frame * 0.3)).toFixed(3)})`; for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(p.x - cx - 4 - k * 5 + Math.sin(frame * 0.3 + k) * 2), Math.round(p.y + 6 + k * 5), 2, 2);
      return r;
    };
    const _hud = PP.drawHUD;
    PP.drawHUD = function () {
      const r = _hud.apply(this, arguments);
      if (this._guideOffer > 0 && (this._guideOffer > 60 || (frame >> 3) & 1)) { drawWindow(40, 186, 176, 22); txt('STUCK? PRESS S: SHOW ME THE WAY', 128, 193, '#ffe040', { align: 'center' }); }
      if (this._guide) txt('WATCH THE WAY...', 128, 40, '#a0f0ff', { align: 'center', outline: '#101848' });
      return r;
    };
  }

  // ---------------- tablet: a bigger picture and roomier buttons ----------------
  const tablet = () => document.body.classList.contains('touch') && Math.min(innerWidth, innerHeight) >= 700;

  // ---------------- frame hook ----------------
  const _ls = loopStep;
  loopStep = function (now) { // eslint-disable-line no-func-assign
    _ls(now);
    try { track(); speakFrame(); handView(); document.body.classList.toggle('tablet', tablet()); } catch (e) { /* never stop the game */ }
  };
  // a title banner when a code arrives from a QR scan
  if (incoming) {
    const _T = TitleScene;
    TitleScene = function (...a) { // eslint-disable-line no-func-assign
      const s = _T(...a), d = s.draw; let t = 0;
      s.draw = function () { d.call(this); if (!incoming || ++t > 600) return; drawWindow(18, 2, 220, 22); txt(incomingKind ? `CODE RECEIVED! OPEN ${incomingKind}` : 'CODE RECEIVED! PASTE IT IN A LOAD BOX', 128, 9, '#5ae060', { align: 'center' }); };
      return s;
    };
  }
  return { QR, snapshot, deaths, deathX, incoming: () => incoming, incomingKind, tablet };
})();
UPDATES.unshift(['2.0', [
  'MODERN MODE:', ' ALL ENEMIES + BOSSES REDRAWN', ' PAINTED BACKGROUNDS + SKIES', ' SWAYING GRASS, LEAVES, FLAGS', ' LIGHT RIPPLES UNDERWATER', ' A PAINTED ISLAND MAP', ' REMASTERED SOUNDTRACK',
  'QUICK RESUME AFTER A PHONE LOCK', 'QR CODES FOR EVERY SHARE CODE', 'TABLETS: BIGGER BUTTONS',
  'BIG TEXT, READ ALOUD, ONE HAND', 'STUCK? S: SHOW ME THE WAY',
]]);
if (typeof scene !== 'undefined' && scene && scene.isTitle) { scene = TitleScene(); if (scene.enter) scene.enter(); }
