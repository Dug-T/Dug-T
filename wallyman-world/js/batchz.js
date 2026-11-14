'use strict';
// Update 2.6: Level Maker themes and pieces from the newer islands, modern
// story comics and an animated modern title logo, a hold-or-tap run button,
// difficulty stars on the map, and a monthly reward calendar with its own
// costume. (The Music Studio, Comic Maker and language changes live in
// batchw.js, batchv2.js and batchh3.js.)
const U26 = (() => {
  const PP = Play.prototype;

  // ---------------- Level Maker: 4 themes, 7 pieces ----------------
  const NEW_THEMES = ['dream', 'kitchen', 'starlight', 'arcane'];
  for (const th of NEW_THEMES) if (!Maker.THEME_LIST.includes(th)) Maker.THEME_LIST.push(th);
  Maker.PALETTE.push(['ƒ', 'FRYING PAN (FLIPS YOU UP)'], ['ǒ', 'ROLLING PEAS'], ['ź', 'SLEEPY ENEMIES'], ['ƀ', 'BEE SUIT'], ['ɍ', 'ROCK SUIT'], ['ƃ', 'BALLOON SUIT'], ['ǿ', 'WEATHER ORB']);
  // courses saved with a new theme were turned away when the page loaded (the theme list was shorter then): take them back
  try {
    const d = JSON.parse(localStorage.getItem('wallyman-world-maker-v1') || 'null');
    if (Array.isArray(d)) d.forEach((sl, i) => { if (!Maker.slots[i] && sl && NEW_THEMES.includes(sl.theme) && Array.isArray(sl.rows) && sl.rows.length === Maker.H) Maker.slots[i] = { theme: sl.theme, boss: sl.boss || '', rows: sl.rows.map((r) => String(r).split('')) }; });
  } catch (e) { /* ignore */ }
  const SUIT_OF = { 'ƀ': 'suit:bee', 'ɍ': 'suit:rock', 'ƃ': 'suit:balloon', 'ǿ': 'orb' };
  { const _td = Maker.toDef;
    Maker.toDef = function (lv) {
      const d = _td.call(this, lv), pans = [];
      lv.rows.forEach((r, y) => r.forEach((c, x) => { if (c === 'ƒ') pans.push([x, y]); if (c === 'ǒ') d.peas = true; if (c === 'ź') d.sleepers = true; }));
      if (pans.length) d.pans = pans;
      const b0 = d.build;
      d.build = (b) => { b0(b); for (let y = 0; y < b.g.length; y++) for (let x = 0; x < b.w; x++) { const c = b.g[y][x]; if (c === 'ƒ') { for (let k = 0; k < 4 && x + k < b.w; k++) if (b.g[y][x + k] === '.' || b.g[y][x + k] === 'ƒ') b.g[y][x + k] = '='; } else if (c === 'ǒ' || c === 'ź') b.g[y][x] = '.'; } };
      return d;
    };
  }
  { const _sp = PP.spawn;
    PP.spawn = function (sp) {
      const kind = SUIT_OF[sp.t];
      if (kind) { this.ents.push({ type: 'suititem', kind, item: true, alive: true, x: sp.x * TS + 2, y: sp.y * TS + 1, w: 12, h: 14, vx: 0, vy: 0, rise: 0, t: 0 }); return; }
      return _sp.call(this, sp);
    };
  }
  { const _mi = makerIcon;
    makerIcon = function (c, X, Y, t = 0) { // eslint-disable-line no-func-assign
      const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, w, h); };
      if (c === 'ƒ') { R(0, 8, 16, 5, '#1a1020'); R(1, 9, 14, 3, '#3a3a4a'); R(2, 9, 10, 1, '#6a6a7a'); R(13, 10, 3, 2, '#8a5a2a'); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.ellipse(X + 7, Y + 7, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); R(6, 6, 2, 2, '#ffb020'); return; }
      if (c === 'ǒ') { for (const [dx, dy] of [[4, 10], [10, 11], [7, 5]]) { ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(X + dx, Y + dy, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#60c040'; ctx.beginPath(); ctx.arc(X + dx, Y + dy, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a8f080'; ctx.fillRect(X + dx - 2, Y + dy - 2, 2, 1); } return; }
      if (c === 'ź') { R(1, 1, 14, 14, '#1a1020'); R(2, 2, 12, 12, '#3a4aa8'); Font.draw(ctx, 'Z', X + 6, Y + 4, { color: '#c8d8ff', align: 'center' }); Font.draw(ctx, 'Z', X + 11, Y + 1, { color: '#ffffff', align: 'center' }); return; }
      if (SUIT_OF[c]) {
        const col = { 'ƀ': '#ffd030', 'ɍ': '#9a948c', 'ƃ': '#ff5a8a', 'ǿ': '#80c8ff' }[c];
        ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(X + 8, Y + 8, 7, 0, Math.PI * 2); ctx.fill();
        const g = ctx.createRadialGradient(X + 6, Y + 6, 1, X + 8, Y + 8, 7); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col); g.addColorStop(1, col); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X + 8, Y + 8, 6, 0, Math.PI * 2); ctx.fill();
        Font.draw(ctx, { 'ƀ': 'B', 'ɍ': 'R', 'ƃ': 'O', 'ǿ': '*' }[c], X + 8, Y + 5, { color: '#1a1020', align: 'center', shadow: null });
        return;
      }
      return _mi.call(this, c, X, Y, t);
    };
  }

  // ---------------- shared drawing helpers ----------------
  const rrect = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const modernOn = () => typeof Modern !== 'undefined' && Modern.on();
  const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

  // ---------------- modern story comics ----------------
  { const _C = ComicScene;
    ComicScene = function (kind, next) { // eslint-disable-line no-func-assign
      if (!modernOn() || !COMICS[kind]) return _C(kind, next);
      const pages = COMICS[kind]; let page = 0, t = 0, turn = 0;
      const panel = (p, x, y, w, h, ti) => {
        const k = ti / 18;
        ctx.save(); ctx.globalAlpha = ease(k);
        ctx.fillStyle = 'rgba(20,10,40,0.35)'; rrect(x + 3, y + 4, w, h, 7); ctx.fill();
        rrect(x, y, w, h, 7); ctx.save(); ctx.clip();
        const z = 1 + Math.min(1, t / 600) * 0.07; ctx.translate(x + w / 2, y + h / 2); ctx.scale(z, z); ctx.translate(-w / 2, -h / 2);
        ctx.save(); ctx.scale(w / VW, h / (VH * 0.75)); drawParallax(p.bg, t * 0.6); ctx.restore();
        const sh = ctx.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,30,0.25)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
        if (p.hero) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(w * 0.35, h - 4, 12, 3, 0, 0, Math.PI * 2); ctx.fill(); Wally.draw(ctx, w * 0.35, h - 4 + Math.sin(t * 0.06) * 1.2, p.hero, 1, { t, sx: 1.6, sy: 1.6 }); }
        if (p.rocket) { ctx.save(); ctx.translate(w * 0.72, h - 8 + Math.sin(t * 0.05) * 2); ctx.scale(2, 2); drawRocket(0, 0, t); ctx.restore(); }
        if (p.boss) { ctx.save(); ctx.translate(w * 0.62, h * 0.45 + Math.sin(t * 0.07) * 2); ctx.scale(1.6, 1.6); stickerArt(p.boss, 0, 0, t); ctx.restore(); }
        ctx.restore();
        ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; rrect(x, y, w, h, 7); ctx.stroke(); ctx.lineWidth = 1;
        const lines = wrapText(p.text, 36), bh = 6 + lines.length * 10, by = y + h + 4;
        const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#fffdf0'); g.addColorStop(1, '#f2e6c0'); ctx.fillStyle = 'rgba(20,10,40,0.25)'; rrect(x + 2, by + 2, w, bh, 5); ctx.fill(); ctx.fillStyle = g; rrect(x, by, w, bh, 5); ctx.fill();
        const shown = Math.floor(Math.max(0, ti - 18) * 1.5);
        let left = shown; lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length; txt(part, x + 6, by + 4 + i * 10, '#2a1a40', { shadow: null }); });
        ctx.restore();
      };
      return {
        enter() { Audio8.play(kind === 'carnival' ? 'carnival' : 'map'); },
        update() {
          t++; if (turn > 0) { turn--; return; }
          if (t > 20 && (Input.confirm() || Input.pressed('run'))) { Audio8.sfx('select'); if (page + 1 >= pages.length) { go(next); return; } page++; t = 0; turn = 16; }
        },
        draw() {
          const g = ctx.createLinearGradient(0, 0, VW, VH); g.addColorStop(0, '#2a1a5a'); g.addColorStop(1, '#5a2a6a'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
          ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 40; i++) { const x = (i * 53 + t * 0.2) % VW, y = (i * 37) % VH; ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
          const slide = turn > 0 ? ease(1 - turn / 16) : 1, dx = Math.round((1 - slide) * VW);
          ctx.save(); ctx.translate(dx, 0);
          const pg = pages[Math.min(page, pages.length - 1)];
          pg.forEach((p, i) => panel(p, 12, 8 + i * 104, 232, 68, t - i * 12));
          ctx.restore();
          const dots = pages.length; for (let i = 0; i < dots; i++) { ctx.fillStyle = i === page ? '#ffe040' : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(128 - (dots - 1) * 5 + i * 10, 216, i === page ? 3 : 2, 0, Math.PI * 2); ctx.fill(); }
          if (t > 20) { const pulse = 0.75 + Math.sin(t * 0.12) * 0.25; ctx.globalAlpha = pulse; ctx.fillStyle = '#ffe040'; rrect(196, 208, 54, 13, 6); ctx.fill(); ctx.globalAlpha = 1; txt(page < pages.length - 1 ? 'A: NEXT' : 'A: GO!', 223, 211, '#2a1a40', { align: 'center', shadow: null }); }
        },
      };
    };
  }

  // ---------------- modern animated title logo ----------------
  { const _L = drawLogo;
    drawLogo = function (y) { // eslint-disable-line no-func-assign
      if (!modernOn()) return _L(y);
      const pulse = 0.5 + Math.sin(frame * 0.05) * 0.5;
      const g = ctx.createRadialGradient(128, y + 46, 8, 128, y + 46, 120); g.addColorStop(0, `rgba(255,240,160,${0.22 + pulse * 0.12})`); g.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, y - 30), VW, 150);
      _L(y);
      // a shine that sweeps across the letters every few seconds
      const sweep = (frame % 240) / 240 * 2.4 - 0.4, word = 'WALLYMAN', step = 18, x0 = 128 - (word.length * step - 3) / 2, w2 = 'WORLD', step2 = 25, x1 = 128 - (w2.length * step2 - 4) / 2;
      const shine = (lx, k) => { const d = Math.abs(sweep - k); return d < 0.12 ? (1 - d / 0.12) * 0.75 : 0; };
      for (let i = 0; i < word.length; i++) { const a = shine(x0 + i * step, i / (word.length - 1)); if (a <= 0) continue; const bob = Math.round(Math.sin(frame * 0.08 + i * 0.7) * 1.5); ctx.globalAlpha = a; Font.draw(ctx, word[i], x0 + i * step - 1, y + 8 + bob, { scale: 3, color: '#ffffff', shadow: null }); }
      for (let i = 0; i < w2.length; i++) { const a = shine(x1 + i * step2, (i / (w2.length - 1)) * 0.9 + 0.1); if (a <= 0) continue; const bob = Math.round(Math.sin(frame * 0.08 + i * 0.9 + 2) * 2); ctx.globalAlpha = a; Font.draw(ctx, w2[i], x1 + i * step2 - 2, y + 42 + bob, { scale: 4, color: '#ffffff', shadow: null }); }
      ctx.globalAlpha = 1;
      // twinkling sparkles around the logo
      for (let i = 0; i < 7; i++) {
        const ph = (frame * 0.035 + i * 0.9) % (Math.PI * 2), s = Math.max(0, Math.sin(ph)); if (s < 0.05) continue;
        const sx = 40 + ((i * 67) % 176), sy = y + 4 + ((i * 29) % 70), r = 1 + s * 3;
        ctx.fillStyle = `rgba(255,255,230,${s})`; ctx.beginPath(); ctx.moveTo(sx, sy - r * 2); ctx.lineTo(sx + r * 0.5, sy - r * 0.5); ctx.lineTo(sx + r * 2, sy); ctx.lineTo(sx + r * 0.5, sy + r * 0.5); ctx.lineTo(sx, sy + r * 2); ctx.lineTo(sx - r * 0.5, sy + r * 0.5); ctx.lineTo(sx - r * 2, sy); ctx.lineTo(sx - r * 0.5, sy - r * 0.5); ctx.closePath(); ctx.fill();
      }
    };
  }

  // ---------------- run button: hold or tap to toggle ----------------
  const RUN = { on: false };
  const toggleRun = () => typeof Opt19 !== 'undefined' && Opt19.get('runtoggle', 'HOLD') === 'TOGGLE';
  { const _down = Input.down;
    Input.down = function (k) { if (k === 'run' && toggleRun() && typeof Play !== 'undefined' && scene instanceof Play && scene.state === 'play') return RUN.on; return _down.call(this, k); };
  }
  { const _u = PP.update;
    PP.update = function () {
      if (toggleRun() && this.state === 'play' && !this._p2ctx && Input.pressed('run')) { RUN.on = !RUN.on; if (Settings.get('captions') !== false) this.parts.push({ k: 'text', s: RUN.on ? 'RUN ON' : 'RUN OFF', x: this.p.x - 14, y: Math.min(this.p.y, 170) - 12, vy: -0.4, life: 40 }); }
      return _u.apply(this, arguments);
    };
  }
  { const _en = PP.enter; PP.enter = function () { RUN.on = false; return _en.apply(this, arguments); }; }
  { const _dp = PP.drawPlayer; PP.drawPlayer = function (cx) { const r = _dp.apply(this, arguments); if (toggleRun() && RUN.on && this.state === 'play') { ctx.fillStyle = 'rgba(16,24,72,0.7)'; ctx.fillRect(4, 30, 40, 11); txt('RUN >>', 7, 32, (frame >> 3) & 1 ? '#ffe040' : '#ffb020'); } return r; }; }

  // ---------------- difficulty stars on the map ----------------
  const DIFF_COL = ['#40e060', '#a8e040', '#ffe040', '#ff9030', '#ff4048'];
  const diffCache = {};
  function levelDiff(li) {
    if (diffCache[li]) return diffCache[li];
    const d = LEVELS[li]; if (!d) return 0;
    let r = d.diffStars | 0;
    if (!r) {
      let w = -1, k = 0, n = 1;
      for (let wi = 0; wi < WORLDS.length && w < 0; wi++) { const ns = WORLDS[wi].nodes().filter((x) => x.li !== undefined); const i = ns.findIndex((x) => x.li === li); if (i >= 0) { w = wi; k = i; n = ns.length; } }
      r = w < 0 ? 3 : 1 + Math.floor(Math.min(0.999, (w + k / Math.max(1, n)) / 13) * 5);
      if (d.boss) r++; if (d.bonus) r--; if (d.board || d.sub || d.shmup || d.surf || d.bmx || d.glider) r = Math.min(r, 3);
      r = clamp(r, 1, 5);
    }
    diffCache[li] = r; return r;
  }
  const drawStar = (x, y, col) => { ctx.fillStyle = '#101020'; ctx.fillRect(x + 1, y - 1, 3, 7); ctx.fillRect(x - 1, y + 1, 7, 3); ctx.fillStyle = col; ctx.fillRect(x + 2, y, 1, 5); ctx.fillRect(x, y + 2, 5, 1); ctx.fillRect(x + 1, y + 1, 3, 3); };
  function drawDiff(li, x, y) { const r = levelDiff(li); if (!r) return; for (let k = 0; k < 5; k++) drawStar(x + k * 7, y, k < r ? DIFF_COL[r - 1] : '#3a3a5a'); }
  { const _M = MapScene;
    MapScene = function (...a) { // eslint-disable-line no-func-assign
      const s = _M(...a);
      if (!s || !s.isMap || !s.draw) return s;
      const _d = s.draw;
      s.draw = function () {
        const r = _d.apply(this, arguments);
        try { const WD = WORLDS[game.world || 0], nd = WD.nodes()[game[WD.key] || 0]; if (nd && nd.li !== undefined && nd.kind !== 'door' && nd.kind !== 'town' && nd.kind !== 'npc' && nd.kind !== 'portal') drawDiff(nd.li, 12, 213); } catch (e) { /* ignore */ }
        return r;
      };
      return s;
    };
  }

  // ---------------- monthly reward calendar ----------------
  Wally.COSTUMES.sunrise = { blue: '#ff7a5a', blueD: '#c04a30', blueL: '#ffb090', blueLL: '#ffe4d4', org: '#30b8a8', orgD: '#1a7a70', orgL: '#80f0e0', lens: '#ffe040' };
  COSTUME_LIST.push({ id: 'sunrise', name: 'SUNRISE HERO', hint: 'STAMP 20 DAYS IN ONE MONTH', ok: () => !!(game && game.outfits && game.outfits.includes('sunrise')) });
  const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const GOALS = [[5, '20 COINS'], [10, '1-UP'], [15, '50 COINS'], [20, 'SUNRISE COSTUME']];
  const monthKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}`;
  function stampToday() { // returns the gifts this stamp earned
    if (!game) return [];
    const d = new Date(), mk = monthKey(d); game.cal = game.cal || {}; game.calGot = game.calGot || {};
    const days = game.cal[mk] = game.cal[mk] || []; if (!days.includes(d.getDate())) days.push(d.getDate());
    const got = game.calGot[mk] = game.calGot[mk] || [], out = [];
    for (const [n, what] of GOALS) {
      if (days.length < n || got.includes(n)) continue; got.push(n);
      if (n === 5) game.coins += 20; else if (n === 10) game.lives++; else if (n === 15) game.coins += 50;
      else { game.outfits = game.outfits || []; if (!game.outfits.includes('sunrise')) { game.outfits.push('sunrise'); out.push(what); try { Ach.unlock('calendar'); } catch (e) { /* ignore */ } continue; } game.lives += 3; out.push('3 LIVES'); continue; }
      out.push(what);
    }
    while (game.coins >= 100) { game.coins -= 100; game.lives++; }
    Save.persist(); return out;
  }
  function CalendarScene(next, fresh = false, gifts = []) {
    let t = 0; const now = new Date(), Y = now.getFullYear(), M = now.getMonth(), today = now.getDate(), first = new Date(Y, M, 1).getDay(), nd = new Date(Y, M + 1, 0).getDate();
    const days = () => ((game && game.cal && game.cal[monthKey(now)]) || []);
    return {
      _s: () => ({ days: days().slice(), gifts, fresh }),
      enter() { Audio8.play('menu'); if (fresh) Audio8.sfx('stomp'); },
      update() { t++; if (t > (fresh ? 50 : 15) && (Input.confirm() || Input.pressed('back') || Input.pressed('run'))) go(next); },
      draw() {
        drawParallax('sky', t * 0.3); drawWindow(8, 6, 240, 212);
        txt(`${MONTHS[M]} ${Y}`, 128, 12, '#ffe040', { align: 'center', scale: 2 });
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((l, i) => txt(l, 30 + i * 33, 34, i === 0 || i === 6 ? '#ff9a9a' : '#a8b0d8', { align: 'center' }));
        const D = days();
        for (let day = 1; day <= nd; day++) {
          const cell = first + day - 1, cx = 16 + (cell % 7) * 33, cy = 44 + Math.floor(cell / 7) * 22, has = D.includes(day), isT = day === today;
          ctx.fillStyle = isT ? 'rgba(255,224,64,0.25)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(cx, cy, 29, 19);
          if (isT) { ctx.strokeStyle = '#ffe040'; ctx.strokeRect(cx + 0.5, cy + 0.5, 28, 18); }
          txt(String(day), cx + 3, cy + 2, day > today ? '#5a6080' : '#fff', { shadow: null });
          if (has) {
            const k = fresh && isT ? clamp(1 - (t - 10) / 18, 0, 1) : 0; if (fresh && isT && t < 10) continue;
            const s = 1 + k * 1.5, sx = cx + 19, sy = cy + 11; ctx.save(); ctx.translate(sx, sy); ctx.scale(s, s); ctx.rotate(-0.25);
            ctx.fillStyle = '#e83850'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 2.6 : 6.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }
        // the month's goals
        const n = D.length, BY = 180; ctx.fillStyle = '#202840'; ctx.fillRect(20, BY, 216, 6); ctx.fillStyle = '#40e090'; ctx.fillRect(20, BY, Math.round(216 * Math.min(1, n / 20)), 6);
        GOALS.forEach(([g, what], i) => { const x = 20 + Math.round(216 * g / 20) - 1, done = n >= g; ctx.fillStyle = done ? '#ffe040' : '#5a6080'; ctx.fillRect(x - 3, BY - 3, 6, 12); txt(String(g), x, BY + 12, done ? '#ffe040' : '#a8b0d8', { align: 'center' }); if (i === 3) txt(what, 236, BY + 22, done ? '#ffe040' : '#a8b0d8', { align: 'right' }); });
        txt(`${n} DAY${n === 1 ? '' : 'S'} STAMPED`, 20, BY + 22, '#fff');
        if (gifts.length && t > 30) { drawWindow(40, 80, 176, 40); txt('MONTHLY GIFT!', 128, 88, '#ffe040', { align: 'center' }); txt(gifts.join(' + '), 128, 102, '#5ff0ff', { align: 'center' }); }
      },
    };
  }
  { const _L = LoginScene;
    LoginScene = function (next) { // eslint-disable-line no-func-assign
      const gifts = stampToday(); return _L(() => CalendarScene(next, true, gifts));
    };
  }
  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['calendar', 'EVERY DAY A HERO', 'STAMP 20 DAYS IN ONE MONTH']);

  UPDATES.unshift(['2.6', ['LEVEL MAKER: 4 NEW THEMES AND', '  PANS, PEAS, SUITS, ORB...', 'MUSIC STUDIO: 4 OR 8 BARS,', '  A 2ND MELODY, LIVE RECORDING', '  YOUR SONG ON THE MAP OR TITLE', 'COMIC MAKER: 3 OR 6 PANELS,', '  CAPTIONS AND STICKERS', 'MODERN STORY COMICS + LOGO', 'ITALIANO AND PORTUGUES', 'RUN BUTTON: HOLD OR TAP', 'DIFFICULTY STARS ON THE MAP', 'MONTHLY REWARD CALENDAR']]);
  return { levelDiff, stampToday, CalendarScene, RUN, SUIT_OF, NEW_THEMES };
})();
function CalendarScene(next, fresh, gifts) { return U26.CalendarScene(next, fresh, gifts); }
