'use strict';
// =====================================================================
// Update 2.9: the ENEMY MAKER (design enemies and use one in the Level
// Maker), Level Maker ROOMS (room walls split a course into rooms, doors
// link them), photo FILTERS and FRAMES, SOUND CUES, automatic CLOUD
// BACKUP, and the PROGRESS BOOK. (Music Studio song form and drum fills
// live in batchw.js.)
// =====================================================================
const U29 = (() => {
  const PP = Play.prototype;
  const editText = (title, cur, cb) => { if (typeof textBox === 'function') textBox(title, cur, (v) => cb(v)); else cb(window.prompt(title, cur)); };

  // ---------------- the Enemy Maker ----------------
  const OPT = { body: ['BLOB', 'BUG', 'BIRD', 'ROBOT'], color: ['#e83850', '#2f62d0', '#3cc048', '#9a4ae8', '#f2a020', '#30c8d0', '#e060c0', '#5a5a6a'], eyes: ['ANGRY', 'CUTE', 'ONE EYE', 'SHADES'], size: ['SMALL', 'BIG'], move: ['WALK', 'HOP', 'FLY', 'CHASE', 'SHOOT'], speed: ['SLOW', 'NORMAL', 'FAST'] };
  const COLN = ['RED', 'BLUE', 'GREEN', 'PURPLE', 'ORANGE', 'TEAL', 'PINK', 'GREY'];
  const KEY = 'wallyman-enemies', USE = 'wallyman-enemy-use';
  const blank = () => ({ name: 'MY ENEMY', body: 0, color: 2, eyes: 1, size: 0, move: 0, speed: 1, spiky: false });
  const all = () => { const a = lsJ(KEY, []); return [0, 1, 2].map((i) => (a[i] ? Object.assign(blank(), a[i]) : null)); };
  const used = () => { const a = all(), u = lsJ(USE, 0) | 0; return a[u] || a.find(Boolean) || blank(); };
  const shade = (h, k) => { const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))); return `rgb(${c.join(',')})`; };
  function drawMyEnemy(cfg, x, y, t, e) {
    if (e && e.dying) { ctx.save(); ctx.translate(x + e.w / 2, y + e.h / 2); ctx.rotate(Math.PI); ctx.translate(-(x + e.w / 2), -(y + e.h / 2)); }
    const S = cfg.size ? 20 : 14, k = S / 14, col = OPT.color[cfg.color], cx = x + S / 2, by = y + S, face = e ? (e.vx > 0 ? 1 : -1) : 1;
    ctx.lineWidth = 1; ctx.strokeStyle = '#1a1020'; const g = ctx.createLinearGradient(x, y, x, by); g.addColorStop(0, shade(col, 0.35)); g.addColorStop(1, shade(col, -0.25)); ctx.fillStyle = g;
    if (cfg.spiky) { ctx.fillStyle = '#f0f0f8'; for (let i = 0; i < 4; i++) { const sx = x + 1 + i * (S - 2) / 3; ctx.beginPath(); ctx.moveTo(sx - 2 * k, y + 3 * k); ctx.lineTo(sx, y - 3 * k); ctx.lineTo(sx + 2 * k, y + 3 * k); ctx.fill(); ctx.stroke(); } ctx.fillStyle = g; }
    ctx.beginPath();
    if (cfg.body === 0) { ctx.moveTo(x, by); ctx.quadraticCurveTo(x - 1, y + 1, cx, y + 1); ctx.quadraticCurveTo(x + S + 1, y + 1, x + S, by); ctx.closePath(); }
    else if (cfg.body === 1) { ctx.ellipse(cx, y + S * 0.6, S / 2, S * 0.38, 0, 0, Math.PI * 2); }
    else if (cfg.body === 2) { ctx.arc(cx, y + S * 0.55, S * 0.42, 0, Math.PI * 2); }
    else { const r = 3 * k; ctx.moveTo(x + r, y + 2); ctx.arcTo(x + S, y + 2, x + S, by - 3 * k, r); ctx.arcTo(x + S, by - 3 * k, x, by - 3 * k, r); ctx.arcTo(x, by - 3 * k, x, y + 2, r); ctx.arcTo(x, y + 2, x + S, y + 2, r); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    if (cfg.body === 1) { ctx.strokeStyle = '#1a1020'; for (let i = 0; i < 3; i++) { const lx = x + 3 * k + i * 4 * k, lg = Math.sin(t * 0.4 + i) * 1.5; ctx.beginPath(); ctx.moveTo(lx, by - 3 * k); ctx.lineTo(lx + lg, by); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(cx - 2, y + 4 * k); ctx.lineTo(cx - 4, y); ctx.moveTo(cx + 2, y + 4 * k); ctx.lineTo(cx + 4, y); ctx.stroke(); }
    if (cfg.body === 2) { const fl = Math.sin(t * 0.4) * 4 * k; ctx.fillStyle = shade(col, -0.15); for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * S * 0.3, y + S * 0.5); ctx.lineTo(cx + d * S * 0.75, y + S * 0.35 - fl); ctx.lineTo(cx + d * S * 0.4, y + S * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.moveTo(cx + face * S * 0.38, y + S * 0.55); ctx.lineTo(cx + face * S * 0.62, y + S * 0.6); ctx.lineTo(cx + face * S * 0.38, y + S * 0.68); ctx.fill(); }
    if (cfg.body === 3) { ctx.fillStyle = '#1a1020'; for (const wx of [x + 3 * k, x + S - 3 * k]) { ctx.beginPath(); ctx.arc(wx, by - 2 * k, 2.2 * k, 0, Math.PI * 2); ctx.fill(); } ctx.beginPath(); ctx.moveTo(cx, y + 2); ctx.lineTo(cx, y - 3 * k); ctx.stroke(); ctx.fillStyle = (t >> 3) & 1 ? '#ff3040' : '#ffe040'; ctx.beginPath(); ctx.arc(cx, y - 3.5 * k, 1.4 * k, 0, Math.PI * 2); ctx.fill(); }
    const ey = y + S * 0.45, eye = (ex, r) => { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(ex + r * 0.3 * face, ey + r * 0.1, r * 0.5, 0, Math.PI * 2); ctx.fill(); };
    if (cfg.eyes === 0) { eye(cx - 2.5 * k, 1.8 * k); eye(cx + 2.5 * k, 1.8 * k); ctx.beginPath(); ctx.moveTo(cx - 5 * k, ey - 3 * k); ctx.lineTo(cx - 1, ey - 1.8 * k); ctx.moveTo(cx + 5 * k, ey - 3 * k); ctx.lineTo(cx + 1, ey - 1.8 * k); ctx.stroke(); }
    else if (cfg.eyes === 1) { eye(cx - 2.6 * k, 2.3 * k); eye(cx + 2.6 * k, 2.3 * k); }
    else if (cfg.eyes === 2) eye(cx, 3 * k);
    else { ctx.fillStyle = '#1a1020'; ctx.fillRect(cx - 5 * k, ey - 1.5 * k, 10 * k, 3 * k); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(cx - 4 * k, ey - 1 * k, 2 * k, 1); }
    if (e && e.dying) ctx.restore();
  }
  const SP = [0.45, 0.8, 1.2];
  { const _sp = PP.spawn;
    PP.spawn = function (sp) {
      if (sp.t === '¥') { const cfg = Object.assign({}, (this.def.enemyTest && TEST.cfg) || this.myEnemyCfg || used()), S = cfg.size ? 20 : 14; this.ents.push({ type: 'myenemy', cfg, enemy: true, stomp: !cfg.spiky, alive: true, t: 0, x: sp.x * TS + (16 - S) / 2, y: (sp.y + 1) * TS - S, by: (sp.y + 1) * TS - S - 20, w: S, h: S, vx: -SP[cfg.speed] * (DIFF[this.diff] ? DIFF[this.diff].speed : 1), vy: 0, ox: sp.x * TS }); return; }
      return _sp.call(this, sp);
    };
  }
  const solidAt = (pl, px, py) => { const c = pl.tile(Math.floor(px / TS), Math.floor(py / TS)); return SOLID.has(c) || c === '='; };
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type !== 'myenemy' || e.dying) return _ue.call(this, e);
      e.t++; if (e.x > this.cam.x + VW + 64) return; if (e.x < this.cam.x - 200 || e.y > VH + 40) { e.alive = false; return; }
      const c = e.cfg, p = this.p, sp = SP[c.speed], freeze = this.freezeT > 0;
      if (!freeze) {
        if (c.move === 2) { e.x += e.vx; if (Math.abs(e.x - e.ox) > 64 || solidAt(this, e.vx > 0 ? e.x + e.w + 1 : e.x - 1, e.y + e.h / 2)) e.vx = -e.vx; e.y = e.by + Math.sin(e.t * 0.05) * 18; }
        else {
          if (c.move === 3 && Math.abs(p.x - e.x) < 170) e.vx = Math.sign(p.x - e.x || 1) * sp * 1.15;
          const ground = solidAt(this, e.x + e.w / 2, e.y + e.h + 1);
          if (c.move === 1 && ground && e.t % 50 === 0) e.vy = -4.6;
          e.vy = Math.min(5, e.vy + 0.3); const ny = e.y + e.vy;
          if (e.vy > 0 && solidAt(this, e.x + e.w / 2, ny + e.h)) { e.y = Math.floor((ny + e.h) / TS) * TS - e.h; e.vy = 0; } else e.y = ny;
          const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
          if (solidAt(this, ahead, e.y + e.h / 2) || (c.move !== 3 && ground && !solidAt(this, ahead, e.y + e.h + 4))) e.vx = -e.vx; else e.x += e.vx;
          if (c.move === 4 && e.t % 120 === 60 && Math.abs(p.x - e.x) < 200) { const a = Math.atan2(p.y + 8 - e.y, p.x - e.x); this.ents.push({ type: 'mbolt', alive: true, t: 0, x: e.x + e.w / 2, y: e.y + 4, w: 8, h: 8, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 }); Audio8.sfx('zap'); }
        }
      }
      if (this.state !== 'play' || !overlap(p, e)) return;
      if (!c.spiky && p.vy > 0 && p.y + p.h - e.y < 10) { p.vy = -5.6; this.flipKill(e); this.addScore(200, e.x, e.y); Audio8.sfx('stomp'); return; }
      if (freeze && !c.spiky) { this.flipKill(e); return; }
      if (!(p.inv > 0)) this.hurt(!!c.spiky);
    };
  }
  { const _de = PP.drawEnt; PP.drawEnt = function (e, cx) { if (e.type === 'myenemy') { drawMyEnemy(e.cfg, Math.round(e.x - cx), Math.round(e.y), frame, e); return; } return _de.call(this, e, cx); }; }
  const EnemyCode = {
    encode: (c) => 'WME1-' + btoa(JSON.stringify([c.name, c.body, c.color, c.eyes, c.size, c.move, c.speed, c.spiky ? 1 : 0])),
    decode(code) {
      try { const m = String(code || '').replace(/\s+/g, '').match(/^WME1-([A-Za-z0-9+/=]+)$/); if (!m) return null; const a = JSON.parse(atob(m[1])); if (!Array.isArray(a) || a.length !== 8) return null;
        const lim = [0, 4, 8, 4, 2, 5, 3, 2], keys = ['name', 'body', 'color', 'eyes', 'size', 'move', 'speed', 'spiky'], o = {};
        for (let i = 1; i < 8; i++) { if (!Number.isInteger(a[i]) || a[i] < 0 || a[i] >= lim[i]) return null; o[keys[i]] = a[i]; }
        o.spiky = !!o.spiky; o.name = String(a[0]).toUpperCase().replace(/[^A-Z0-9 !?'.-]/g, '').slice(0, 14) || 'MY ENEMY'; return o; } catch (e) { return null; }
    },
  };
  const TEST = { on: false };
  const TLI = LEVELS.length; // the enemy test field
  LEVELS.push({ name: 'ENEMY TEST FIELD', theme: 'grass', music: 'grass', width: 48, reserved: true, noAuto: true, enemyTest: true, tag: 'TEST', world: 'ENEMY MAKER',
    build(b) { b.ground(0, 47).fill(0, 0, 0, 11, 'X').fill(47, 0, 47, 11, 'X').set(3, 11, '@').set(18, 11, '¥').set(28, 11, '¥').set(38, 11, '¥').fill(20, 8, 24, 8, '=').set(44, 11, 'G'); } });
  { const _M = MapScene; MapScene = function (...a) { if (TEST.on) { TEST.on = false; return EnemyMakerScene(TEST.slot, 'TEST OVER - HOW WAS IT?'); } return _M(...a); }; } // eslint-disable-line no-func-assign
  { const _en = PP.enter; PP.enter = function () { if (this.def.enemyTest && TEST.cfg) this.myEnemyCfg = TEST.cfg; return _en.apply(this, arguments); }; }
  function EnemyMakerScene(slot0 = 0, note = '') {
    let slot = slot0, cfg = all()[slot] || blank(), sel = 0, t = 0, dom = false, msg = note;
    const ROWS = ['NAME', 'SLOT', 'BODY', 'COLOUR', 'EYES', 'SIZE', 'MOVES', 'SPEED', 'SPIKY', 'TEST IT', 'SAVE', 'USE IN MAKER', 'SHARE CODE', 'LOAD CODE', 'BACK'];
    const val = (r) => ({ NAME: cfg.name, SLOT: String(slot + 1), BODY: OPT.body[cfg.body], COLOUR: COLN[cfg.color], EYES: OPT.eyes[cfg.eyes], SIZE: OPT.size[cfg.size], MOVES: OPT.move[cfg.move], SPEED: OPT.speed[cfg.speed], SPIKY: cfg.spiky ? 'YES' : 'NO', 'USE IN MAKER': (lsJ(USE, 0) | 0) === slot ? 'IN USE' : '' }[r]);
    const step = (r, d) => { const cyc = (k, n) => { cfg[k] = (cfg[k] + d + n) % n; }; const f = { BODY: () => cyc('body', 4), COLOUR: () => cyc('color', 8), EYES: () => cyc('eyes', 4), SIZE: () => cyc('size', 2), MOVES: () => cyc('move', 5), SPEED: () => cyc('speed', 3), SPIKY: () => { cfg.spiky = !cfg.spiky; }, SLOT: () => { slot = (slot + d + 3) % 3; cfg = all()[slot] || blank(); msg = all()[slot] ? '' : 'AN EMPTY SLOT - MAKE SOMETHING!'; } }[r]; if (f) { f(); return true; } return false; };
    const save = () => { const a = lsJ(KEY, []); while (a.length < 3) a.push(null); a[slot] = cfg; lsS(KEY, a); };
    return {
      _s: () => ({ slot, cfg, sel, msg }),
      enter() { Audio8.play('menu'); },
      update() {
        t++; if (dom) return;
        if (Input.pressed('down')) { sel = (sel + 1) % ROWS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + ROWS.length - 1) % ROWS.length; Audio8.sfx('select'); }
        const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0), r = ROWS[sel]; if (d && step(r, d)) Audio8.sfx('select');
        if (Input.pressed('back') || (Input.confirm() && r === 'BACK')) { go(() => ExtrasList('ENEMY MAKER')); return; }
        if (!Input.confirm()) return;
        if (r === 'NAME') { dom = true; editText('NAME YOUR ENEMY', cfg.name, (v) => { dom = false; if (v) cfg.name = String(v).toUpperCase().replace(/[^A-Z0-9 !?'.-]/g, '').slice(0, 14) || cfg.name; }); }
        else if (r === 'SAVE') { save(); msg = `SAVED IN SLOT ${slot + 1}!`; Audio8.sfx('oneup'); try { Ach.unlock('enemymaker'); } catch (e) { /* ignore */ } }
        else if (r === 'USE IN MAKER') { save(); lsS(USE, slot); msg = 'PLACE IT WITH THE MY ENEMY PIECE'; Audio8.sfx('oneup'); }
        else if (r === 'TEST IT') { TEST.on = true; TEST.slot = slot; TEST.cfg = Object.assign({}, cfg); Audio8.sfx('confirm'); go(() => IntroScene(TLI, false)); }
        else if (r === 'SHARE CODE') { dom = true; codeBox(`ENEMY CODE: ${cfg.name}`, EnemyCode.encode(cfg), null, () => { dom = false; }); }
        else if (r === 'LOAD CODE') { dom = true; codeBox('PASTE AN ENEMY CODE (WME1-...)', '', (c) => { const n = EnemyCode.decode(c); if (!n) return false; cfg = n; msg = `LOADED ${n.name} - SAVE TO KEEP IT`; Audio8.sfx('oneup'); return true; }, () => { dom = false; }); }
        else if (step(r, 1)) Audio8.sfx('select');
      },
      draw() {
        drawParallax('grass', t * 0.3); txt('ENEMY MAKER', 128, 4, '#ffe040', { align: 'center', outline: '#101848' });
        drawWindow(4, 14, 140, 200); ROWS.forEach((r, i) => { const y = 21 + i * 12.6, on = i === sel; txt(r, 18, Math.round(y), on ? '#ffe040' : '#fff'); const v = val(r); if (v) txt(v.slice(0, 8), 138, Math.round(y), on ? '#ffe040' : '#a8f0ff', { align: 'right' }); if (on) txt('>', 8 + ((t >> 3) & 1), Math.round(y), '#ffe040'); });
        drawWindow(148, 14, 104, 120); ctx.fillStyle = '#5ab0f0'; ctx.fillRect(152, 18, 96, 112); ctx.fillStyle = '#4a8a30'; ctx.fillRect(152, 112, 96, 18); ctx.fillStyle = '#7ad050'; ctx.fillRect(152, 112, 96, 3);
        ctx.save(); ctx.translate(200, 112); ctx.scale(2.5, 2.5); const S = cfg.size ? 20 : 14, hop = cfg.move === 1 ? -Math.abs(Math.sin(t * 0.08)) * 6 : cfg.move === 2 ? -10 + Math.sin(t * 0.05) * 3 : 0; drawMyEnemy(cfg, -S / 2, -S + hop, t, null); ctx.restore();
        txt(cfg.name, 200, 138, '#ffe040', { align: 'center', outline: '#101848' });
        drawWindow(148, 150, 104, 64); const tips = { WALK: ['WALKS AND TURNS', 'AT WALLS AND EDGES'], HOP: ['HOPS ALONG'], FLY: ['FLIES TO AND FRO'], CHASE: ['CHASES YOU WHEN', 'YOU GET CLOSE'], SHOOT: ['WALKS AND SHOOTS', 'AT YOU'] }[OPT.move[cfg.move]];
        tips.concat([cfg.spiky ? 'SPIKY: NO STOMPING!' : 'STOMP IT TO WIN']).forEach((l, i) => txt(l, 200, 158 + i * 11, i === tips.length ? (cfg.spiky ? '#ff8080' : '#80ff80') : '#fff', { align: 'center' }));
        if (msg) txt(msg, 128, 216, '#40e090', { align: 'center', outline: '#101848' });
      },
    };
  }

  // ---------------- Level Maker: rooms and doors ----------------
  Maker.PALETTE.push(['¥', 'MY ENEMY (ENEMY MAKER)'], ['Ð', 'DOOR (GOES TO THE NEXT DOOR)'], ['¦', 'ROOM WALL (SPLITS ROOMS)']);
  { const _td = Maker.toDef;
    Maker.toDef = function (lv) {
      const d = _td.call(this, lv), walls = new Set(), doors = [];
      lv.rows.forEach((r, y) => r.forEach((c, x) => { if (c === '¦') walls.add(x); if (c === 'Ð') doors.push([x, y]); }));
      if (walls.size) d.roomWalls = [...walls].sort((a, b) => a - b);
      if (doors.length) d.doors = doors.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const b0 = d.build; d.build = (b) => { b0(b); for (const x of walls) for (let y = 0; y < 14; y++) b.g[y][x] = 'X'; for (const [x, y] of doors) b.g[y][x] = '.'; };
      return d;
    };
  }
  const roomOf = (walls, tx) => { let a = 0, b = Infinity; for (const w of walls) { if (w < tx) a = w + 1; else if (w > tx) { b = w - 1; break; } } return [a, b]; };
  { const _en = PP.enter;
    PP.enter = function () {
      const r = _en.apply(this, arguments);
      if (this.def.doors && !this._doors) { this._doors = true; this.def.doors.forEach(([x, y], i) => this.ents.push({ type: 'door', idx: i, alive: true, t: 0, x: x * TS, y: y * TS - 8, w: 16, h: 24 })); }
      return r;
    };
  }
  { const _u = PP.update;
    PP.update = function () {
      const r = _u.apply(this, arguments), W = this.def.roomWalls;
      if (W && this.cam) { const [a, b] = roomOf(W, Math.floor((this.p.x + this.p.w / 2) / TS)), lo = a * TS, hi = Math.min(this.lv.w, b + 1) * TS - VW; this.cam.x = hi < lo ? lo : clamp(this.cam.x, lo, hi); }
      if (this.doorFlash > 0) this.doorFlash--;
      return r;
    };
  }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type !== 'door') return _ue.call(this, e);
      e.t++; const p = this.p, on = this.state === 'play' && overlap(p, e); e.near = on;
      if (on && Input.pressed('up') && !(this.doorCool > 0)) {
        const D = this.def.doors, n = D.length, j = n < 2 ? e.idx : (e.idx % 2 === 0 ? (e.idx + 1 < n ? e.idx + 1 : 0) : e.idx - 1), [x, y] = D[j];
        p.x = x * TS + (TS - p.w) / 2; p.y = (y + 1) * TS - p.h; p.vx = 0; p.vy = 0; this.doorCool = 30; this.doorFlash = 14; Audio8.sfx('warp');
        const W = this.def.roomWalls; if (W) { const [a] = roomOf(W, x); this.cam.x = Math.max(a * TS, clamp(p.x - 100, 0, this.lv.w * TS - VW)); }
      }
      if (this.doorCool > 0 && e.idx === 0) this.doorCool--;
    };
  }
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) {
      if (e.type !== 'door') return _de.call(this, e, cx);
      const x = Math.round(e.x - cx), y = Math.round(e.y);
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y + 4, 18, 21); ctx.beginPath(); ctx.arc(x + 8, y + 5, 9, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x, y + 5, 16, 19); ctx.beginPath(); ctx.arc(x + 8, y + 5, 8, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#6a4018'; ctx.fillRect(x + 7, y - 2, 2, 26); ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 11, y + 13, 2, 2);
      if (e.near) txt('UP', x + 8, y - 14, '#ffe040', { align: 'center', outline: '#101848' });
    };
  }
  { const _hud = PP.drawHUD; PP.drawHUD = function () { const r = _hud.apply(this, arguments); if (this.doorFlash > 0) { ctx.fillStyle = `rgba(0,0,0,${(this.doorFlash / 14).toFixed(2)})`; ctx.fillRect(0, 0, VW, VH); } return r; }; }
  { const _mi = makerIcon;
    makerIcon = function (c, X, Y, t = 0) { // eslint-disable-line no-func-assign
      if (c === '¥') { const cfg = used(), S = cfg.size ? 20 : 14; ctx.save(); ctx.translate(X + 8, Y + 16); const k = 14 / S; ctx.scale(k, k); drawMyEnemy(cfg, -S / 2, -S, t, null); ctx.restore(); return; }
      if (c === 'Ð') { ctx.fillStyle = '#1a1020'; ctx.fillRect(X + 2, Y + 3, 12, 13); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(X + 3, Y + 4, 10, 12); ctx.fillStyle = '#ffd040'; ctx.fillRect(X + 10, Y + 10, 2, 2); return; }
      if (c === '¦') { ctx.fillStyle = '#2a2040'; ctx.fillRect(X, Y, 16, 16); ctx.fillStyle = '#ff60c0'; for (let k = 0; k < 4; k++) ctx.fillRect(X + 7, Y + k * 4, 2, 2); return; }
      return _mi.call(this, c, X, Y, t);
    };
  }

  // ---------------- photo filters and frames ----------------
  const FILTERS = ['NONE', 'RETRO', 'COMIC', 'SEPIA', 'B+W', 'NIGHT'];
  const FRAMES = ['NONE', 'POLAROID', 'STICKERS', 'GOLD', 'FILM'];
  function applyFilter(src, f) {
    const c = document.createElement('canvas'); c.width = VW; c.height = VH; const x = c.getContext('2d');
    if (f === 'RETRO') { const s = document.createElement('canvas'); s.width = VW / 2; s.height = VH / 2; s.getContext('2d').drawImage(src, 0, 0, VW / 2, VH / 2); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, VW, VH); } else x.drawImage(src, 0, 0, VW, VH);
    if (f === 'NONE') return c;
    const im = x.getImageData(0, 0, VW, VH), d = im.data, L = new Float32Array(VW * VH);
    for (let i = 0; i < d.length; i += 4) L[i >> 2] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2]; const l = L[i >> 2];
      if (f === 'RETRO') { r = Math.round(r / 85) * 85; g = Math.round(g / 85) * 85; b = Math.round(b / 85) * 85; }
      else if (f === 'SEPIA') { r = Math.min(255, l * 1.07 + 40); g = Math.min(255, l * 0.95 + 20); b = Math.min(255, l * 0.75); }
      else if (f === 'B+W') { r = g = b = l > 150 ? Math.min(255, l * 1.1) : l * 0.85; }
      else if (f === 'NIGHT') { r = r * 0.35; g = g * 0.5 + 10; b = Math.min(255, b * 0.8 + 50); const px = (i >> 2) % VW, py = (i >> 2) / VW | 0, v = 1 - Math.min(1, Math.hypot(px - VW / 2, py - VH / 2) / 190); r *= v; g *= v; b *= v; }
      else if (f === 'COMIC') { const q = (v) => (v < 70 ? 30 : v < 150 ? 130 : 240); r = q(r); g = q(g); b = q(b); const p = i >> 2, px = p % VW; if (px > 0 && px < VW - 1 && p > VW && p < L.length - VW) { const e = Math.abs(L[p - 1] - L[p + 1]) + Math.abs(L[p - VW] - L[p + VW]); if (e > 90) r = g = b = 20; } }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    x.putImageData(im, 0, 0); return c;
  }
  function framed(img, fr, when) { // the photo (256x224) inside a frame, on a 256x224 card
    const c = document.createElement('canvas'); c.width = VW; c.height = VH; const x = c.getContext('2d');
    const at = (bx, by, bw, bh) => x.drawImage(img, bx, by, bw, bh);
    if (fr === 'NONE') { at(0, 0, VW, VH); return c; }
    if (fr === 'POLAROID') { x.fillStyle = '#fbf8f0'; x.fillRect(0, 0, VW, VH); at(12, 10, 232, 172); x.fillStyle = '#3a3040'; x.font = 'bold 13px "Comic Sans MS", "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.fillText('WALLYMAN WORLD  ' + new Date(when || Date.now()).toLocaleDateString(), 128, 206); return c; }
    if (fr === 'FILM') { x.fillStyle = '#141018'; x.fillRect(0, 0, VW, VH); at(0, 24, VW, 176); x.fillStyle = '#f0e8d0'; for (let k = 0; k < 16; k++) { x.fillRect(6 + k * 16, 7, 9, 10); x.fillRect(6 + k * 16, 207, 9, 10); } return c; }
    if (fr === 'GOLD') { at(0, 0, VW, VH); const g = x.createLinearGradient(0, 0, VW, VH); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.5, '#c89020'); g.addColorStop(1, '#ffe080'); x.strokeStyle = g; x.lineWidth = 14; x.strokeRect(7, 7, VW - 14, VH - 14); x.strokeStyle = '#8a5a10'; x.lineWidth = 2; x.strokeRect(15, 15, VW - 30, VH - 30); x.fillStyle = '#ffe080'; for (const [cx, cy] of [[14, 14], [VW - 14, 14], [14, VH - 14], [VW - 14, VH - 14]]) { x.beginPath(); x.arc(cx, cy, 9, 0, Math.PI * 2); x.fill(); } return c; }
    at(0, 0, VW, VH); // STICKERS
    const star = (cx, cy, r, col) => { x.fillStyle = col; x.strokeStyle = '#1a1020'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); x.stroke(); };
    star(22, 22, 16, '#ffd030'); star(VW - 26, VH - 26, 18, '#5ff0ff'); star(VW - 20, 30, 10, '#ff70a0');
    x.fillStyle = '#ff4a7a'; x.beginPath(); const hx = 26, hy = VH - 30, s = 12; x.moveTo(hx, hy + s * 0.8); x.bezierCurveTo(hx - s * 1.3, hy - s * 0.1, hx - s * 0.6, hy - s * 1.1, hx, hy - s * 0.35); x.bezierCurveTo(hx + s * 0.6, hy - s * 1.1, hx + s * 1.3, hy - s * 0.1, hx, hy + s * 0.8); x.fill(); x.stroke();
    return c;
  }
  PhotoAlbumScene = function () { // eslint-disable-line no-func-assign
    let sel = 0, t = 0, img = null, shown = -1, msg = '', fi = 0, fr = 0, card = null, cardKey = '';
    const make = (L) => { const k = `${sel}|${fi}|${fr}|${L[sel].at}`; if (k === cardKey && card) return card; if (!img || !img.complete || !img.naturalWidth) return null; card = framed(applyFilter(img, FILTERS[fi]), FRAMES[fr], L[sel].at); cardKey = k; return card; };
    return {
      _s: () => ({ sel, fi, fr, msg, filter: FILTERS[fi], frame: FRAMES[fr] }),
      enter() { Audio8.play('map'); },
      update() {
        t++; const L = PhotoAlbum.list();
        if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('PHOTO ALBUM')); return; }
        if (!L.length) return;
        if (Input.pressed('right')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); msg = ''; } if (Input.pressed('left')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); msg = ''; }
        if (Input.pressed('down')) { fi = (fi + 1) % FILTERS.length; Audio8.sfx('select'); msg = 'FILTER: ' + FILTERS[fi]; } if (Input.pressed('up')) { fi = (fi + FILTERS.length - 1) % FILTERS.length; Audio8.sfx('select'); msg = 'FILTER: ' + FILTERS[fi]; }
        if (Input.pressed('start')) { fr = (fr + 1) % FRAMES.length; Audio8.sfx('select'); msg = 'FRAME: ' + FRAMES[fr]; }
        if (Input.pressed('jump')) { const c = make(L); if (!c) return; if (fi || fr) { PhotoAlbum.add(c); try { Ach.unlock('photofx'); } catch (e) { /* ignore */ } } const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'wallyman-photo-' + L[sel].at + '.png'; document.body.appendChild(a); a.click(); a.remove(); msg = fi || fr ? 'SAVED A COPY AND DOWNLOADED!' : 'DOWNLOADED!'; Audio8.sfx('check'); if (fi || fr) { sel = 0; shown = -1; fi = 0; fr = 0; } }
        if (Input.pressed('special')) { PhotoAlbum.remove(sel); sel = Math.max(0, sel - 1); shown = -1; msg = 'DELETED'; Audio8.sfx('brick'); }
      },
      draw() {
        ctx.fillStyle = '#1a1020'; ctx.fillRect(0, 0, VW, VH); const L = PhotoAlbum.list();
        txt('PHOTO ALBUM', 128, 4, '#ffe040', { align: 'center' });
        if (!L.length) { ['TAKE PHOTOS IN PHOTO MODE', '(PAUSE MENU) AND THEY ARE', 'KEPT HERE TOO!'].forEach((l, i) => txt(l, 128, 90 + i * 12, '#fff', { align: 'center' })); return; }
        sel = Math.min(sel, L.length - 1);
        if (shown !== sel || !img) { img = new Image(); img.src = L[sel].img; shown = sel; cardKey = ''; }
        hR(22, 14, 212, 180, '#f8f4ec'); const c = make(L); if (c) ctx.drawImage(c, 26, 18, 204, 172);
        txt(`${sel + 1}/${L.length}  FILTER ${FILTERS[fi]}  FRAME ${FRAMES[fr]}`, 128, 198, '#fff', { align: 'center' });
        txt(msg || '<> PHOTO  UP/DOWN FILTER  START FRAME', 128, 207, msg ? '#5ae060' : '#a8b0d8', { align: 'center' });
        txt('A: SAVE + DOWNLOAD   S: DELETE', 128, 216, '#a8b0d8', { align: 'center' });
      },
    };
  };

  // ---------------- sound cues ----------------
  const cuesOn = () => typeof Opt19 !== 'undefined' && Opt19.get('cues', '0') === '1';
  const CUE = { bpm: 120, lead: 1, rev: 0 };
  const beep = (m, l = 1) => { if (Audio8.studioTap) Audio8.studioTap(CUE, { c: 'L', m, l }); };
  { const _u = PP.update;
    PP.update = function () {
      const r = _u.apply(this, arguments);
      if (!cuesOn() || this.state !== 'play' || this._p2ctx || !this.p) return r;
      const p = this.p, f = p.face || 1, tx = Math.floor((p.x + p.w / 2) / TS), fy = Math.floor((p.y + p.h + 2) / TS), cd = this.cueCd = this.cueCd || { gap: 0, spike: 0, foe: 0 };
      for (const k in cd) if (cd[k] > 0) cd[k]--;
      if (p.onGround && !cd.gap) for (let d = 1; d <= 3; d++) { const x = tx + d * f; let floor = false; for (let y = fy; y < 14; y++) if (SOLID.has(this.tile(x, y)) || this.tile(x, y) === '=') { floor = true; break; } if (!floor) { beep(45 - d * 2, 2); cd.gap = 40; this.cueIcon = ['GAP', 30]; break; } }
      if (!cd.spike) for (let d = 1; d <= 3; d++) { const x = tx + d * f, a = this.tile(x, fy), b = this.tile(x, fy - 1); if (a === '^' || b === '^' || a === 'L') { beep(64, 1); setTimeout(() => beep(64, 1), 120); cd.spike = 45; this.cueIcon = ['SPIKES', 30]; break; } }
      if (!cd.foe) { const e = this.ents.find((k) => k.enemy && k.alive && !k.dying && (k.x - p.x) * f > 0 && Math.abs(k.x - p.x) < 80 && Math.abs(k.y - p.y) < 48); if (e) { beep(76, 1); cd.foe = 50; this.cueIcon = [e.boss ? 'BOSS' : 'FOE', 30]; } }
      return r;
    };
  }
  { const _hud = PP.drawHUD; PP.drawHUD = function () { const r = _hud.apply(this, arguments); if (cuesOn() && this.cueIcon && this.cueIcon[1] > 0) { this.cueIcon[1]--; txt('! ' + this.cueIcon[0], 6, 56, '#ffb040', { outline: '#101848' }); } return r; }; }

  // ---------------- automatic cloud backup ----------------
  const autoCloud = () => typeof Opt19 !== 'undefined' && Opt19.get('autocloud', '0') === '1' && typeof CloudSave !== 'undefined' && CloudSave.on;
  const CB = { last: 0, busy: false, msg: '', msgT: 0 };
  { const _c = PP.clear;
    PP.clear = function (s) {
      const was = this.state; const r = _c.call(this, s);
      if (was === 'play' && this.state === 'clear' && autoCloud() && !this.def.custom && !CB.busy && Date.now() - CB.last > (window.CLOUD_GAP !== undefined ? window.CLOUD_GAP : 120000)) {
        CB.busy = true; CB.last = Date.now(); Save.persist();
        CloudSave.upload(game).then((k) => { game.cloudKey = k; Save.persist(); CB.busy = false; CB.msg = 'CLOUD BACKUP SAVED'; CB.msgT = 150; }, () => { CB.busy = false; CB.msg = 'CLOUD BACKUP FAILED'; CB.msgT = 150; });
      }
      return r;
    };
  }
  { const _hud = PP.drawHUD; PP.drawHUD = function () { const r = _hud.apply(this, arguments); if (CB.msgT > 0) { CB.msgT--; txt(CB.msg, 250, 56, CB.msg.includes('FAIL') ? '#ff8080' : '#80ffa0', { align: 'right', outline: '#101848' }); } return r; }; }

  // ---------------- the Progress Book ----------------
  const PAGES = ['MEDALS', 'STARS', 'TREASURE', 'COSTUMES', 'TROPHIES'], TABS = ['MEDALS', 'STARS', 'MAPS', 'OUTFITS', 'TROPHY'];
  function pageRows(g, page) {
    const lv = (li) => LEVELS[li] && !LEVELS[li].reserved && !LEVELS[li].custom && !LEVELS[li].board;
    const tag = (li) => `${levelTag(li)} ${LEVELS[li].name}`;
    if (page === 'MEDALS') { const out = []; for (let li = 0; li < LEVELS.length; li++) if (lv(li) && g.cleared[li] && !LEVELS[li].boss) { const n = [0, 1, 2, 3, 4].filter((i) => (g.medals[li] || 0) & (1 << i)).length; if (n < 5) out.push([tag(li), `${n}/5`]); } return { rows: out, hint: 'MEDALS HIDE HIGH UP AND BEHIND WALLS' }; }
    if (page === 'STARS') { const N = ['TIME', 'MEDALS', 'NO HIT']; const out = []; for (let li = 0; li < LEVELS.length; li++) if (lv(li) && g.cleared[li]) { const s = (g.stars || [])[li] | 0; if ((s & 7) !== 7) out.push([tag(li), N.filter((_, k) => !(s & (1 << k))).join(' ')]); } return { rows: out, hint: 'STARS: BE QUICK, 5 MEDALS, NO HITS' }; }
    if (page === 'TREASURE') { if (typeof U27 === 'undefined') return { rows: [], hint: '' }; const S = U27.spots(), T = g.tmaps || { got: [0, 0, 0, 0, 0], dug: [] }, out = []; S.pieces.forEach((pc) => { if (!(T.got[pc.map] & (1 << pc.piece))) out.push([`${U27.MAPS[pc.map]} PIECE ${pc.piece + 1}`, levelTag(pc.li)]); }); U27.MAPS.forEach((m, i) => { if (T.got[i] === 7 && !(T.dug || [])[i]) out.push([`DIG UP ${m}`, levelTag(S.dig[i])]); }); return { rows: out, hint: 'TREASURE MAPS ARE IN EXTRAS' }; }
    if (page === 'COSTUMES') { const g0 = game; game = g; try { return { rows: COSTUME_LIST.filter((c) => !c.ok()).map((c) => [c.name, c.hint || '']), hint: 'WEAR COSTUMES IN THE WARDROBE' }; } finally { game = g0; } }
    return { rows: (typeof ACH_LIST !== 'undefined' ? ACH_LIST : []).filter((a) => !Ach.has(a[0])).map((a) => [a[1], a[2]]), hint: 'TROPHIES ARE SHARED BY ALL YOUR FILES' };
  }
  function ProgressScene() {
    let page = 0, top = 0, t = 0; const g = game || Save.slots.find(Boolean) || null;
    return {
      _s: () => ({ page: PAGES[page], rows: g ? pageRows(g, PAGES[page]).rows : null }),
      enter() { Audio8.play('menu'); },
      update() {
        t++; if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasList('PROGRESS BOOK')); return; }
        if (Input.pressed('right')) { page = (page + 1) % PAGES.length; top = 0; Audio8.sfx('select'); } if (Input.pressed('left')) { page = (page + PAGES.length - 1) % PAGES.length; top = 0; Audio8.sfx('select'); }
        if (!g) return; const n = pageRows(g, PAGES[page]).rows.length;
        if (Input.pressed('down')) top = Math.min(Math.max(0, n - 11), top + 1); if (Input.pressed('up')) top = Math.max(0, top - 1);
      },
      draw() {
        ctx.fillStyle = '#e8d8b0'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#d0bc90'; for (let y = 30; y < VH; y += 14) ctx.fillRect(10, y, 236, 1); ctx.fillStyle = '#c04040'; ctx.fillRect(22, 0, 1, VH);
        txt('PROGRESS BOOK', 128, 6, '#3a2010', { align: 'center', scale: 2, shadow: null });
        PAGES.forEach((p, i) => { const x = 8 + i * 49; ctx.fillStyle = i === page ? '#c04040' : '#a08860'; ctx.fillRect(x, 24, 47, 11); txt(TABS[i], x + 23, 26, '#fff8e0', { align: 'center', shadow: null }); });
        if (!g) { txt('LOAD A SAVE FILE FIRST', 128, 100, '#3a2010', { align: 'center', shadow: null }); return; }
        const { rows, hint } = pageRows(g, PAGES[page]);
        if (!rows.length) txt(PAGES[page] === 'TROPHIES' ? 'EVERY TROPHY WON!' : 'NOTHING LEFT TO FIND HERE!', 128, 100, '#2a7a3a', { align: 'center', shadow: null });
        rows.slice(top, top + 11).forEach(([a, b], i) => { const y = 44 + i * 14, B = String(b).slice(0, 26), room = Math.max(7, Math.floor((216 - B.length * 6) / 6)), A = String(a); txt(A.length > room ? A.slice(0, room - 1) + '.' : A, 28, y, '#3a2010', { shadow: null }); txt(B, 248, y, '#8a3a20', { align: 'right', shadow: null }); });
        if (rows.length > 11) txt(`${top + 1}-${Math.min(rows.length, top + 11)} OF ${rows.length}`, 128, 200, '#6a5030', { align: 'center', shadow: null });
        txt(hint, 128, 212, '#6a5030', { align: 'center', shadow: null });
      },
    };
  }

  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['enemymaker', 'MONSTER MAKER', 'SAVE AN ENEMY IN THE ENEMY MAKER'], ['photofx', 'PICTURE PERFECT', 'SAVE A PHOTO WITH A FILTER OR FRAME']);
  UPDATES.unshift(['2.9', ['ENEMY MAKER: DESIGN YOUR OWN', '  FOES AND USE THEM IN COURSES', 'LEVEL MAKER: DOORS AND ROOMS', 'MUSIC STUDIO: VERSE + CHORUS', '  AND DRUM FILLS', 'PHOTO FILTERS AND FRAMES', 'SOUND CUES (OPTIONS)', 'AUTO CLOUD BACKUP (OPTIONS)', 'PROGRESS BOOK (EXTRAS)']]);
  return { EnemyMakerScene, EnemyCode, drawMyEnemy, used, ProgressScene, pageRows, applyFilter, framed, FILTERS, FRAMES, CB, TLI, TEST };
})();
function EnemyMakerScene(slot, note) { return U29.EnemyMakerScene(slot, note); }
function ProgressScene() { return U29.ProgressScene(); }
