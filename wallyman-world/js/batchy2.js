'use strict';
// Update 2.5 (part 2): Tag (1 or 2 players), online co-op rooms, the
// problem-spot map, and the new Challenges menu entries.
const U25b = (() => {
  const PP = Play.prototype;

  // ---------------- Tag ----------------
  // Player 2 has its own keys here (T F G H to move, R to jump, or the number
  // pad), because W A S D also steer player 1 outside co-op levels.
  const P2K = { KeyT: 'up', KeyF: 'left', KeyG: 'down', KeyH: 'right', KeyR: 'jump', KeyY: 'run', Numpad8: 'up', Numpad4: 'left', Numpad5: 'down', Numpad2: 'down', Numpad6: 'right', Numpad0: 'jump', NumpadAdd: 'run' };
  const k2 = {}, k2hit = {};
  addEventListener('keydown', (e) => { const a = P2K[e.code]; if (a && scene && scene.isTag) { if (!e.repeat) k2hit[a] = 1; k2[a] = 1; e.preventDefault(); } });
  addEventListener('keyup', (e) => { const a = P2K[e.code]; if (a) k2[a] = 0; });
  const FLOOR = 200, PLAT = [[24, 160, 56], [176, 160, 56], [96, 128, 64], [20, 96, 48], [188, 96, 48], [100, 64, 56]];
  function TagScene() {
    let stage = 'pick', two = false, t = 0, it = 0, cool = 0, left = 60 * 60, itT = [0, 0], won = -1, paid = 0;
    const mk = (x, hero, costume) => ({ x, y: FLOOR, vx: 0, vy: 0, ground: true, face: 1, hero, costume, freeze: 0, drop: 0, ai: { dir: 1, n: 0, jumpCd: 0 } });
    let pl = [];
    const reset = () => { pl = [mk(60, game.hero, game.costume), two ? mk(196, p2Hero(), p2Costume()) : mk(196, 'goth', 'classic')]; it = Math.random() < 0.5 ? 0 : 1; pl[it].freeze = 60; cool = 60; left = 60 * 60; itT = [0, 0]; };
    const step = (q, L, Rt, jump, down, run, sp) => {
      if (q.freeze > 0) { q.freeze--; L = Rt = jump = false; }
      const want = (Rt ? 1 : 0) - (L ? 1 : 0), top = sp * (run ? 1.25 : 1);
      q.vx += (want * top - q.vx) * 0.25; if (want) q.face = want;
      if (jump && q.ground) { if (down && q.y < FLOOR) { q.drop = 10; q.ground = false; } else { q.vy = -6.2; q.ground = false; Audio8.sfx('jump'); } }
      q.vy = Math.min(6, q.vy + 0.32); const oy = q.y; q.x = clamp(q.x + q.vx, 14, 242); q.y += q.vy; q.ground = false; if (q.drop > 0) q.drop--;
      if (q.y >= FLOOR) { q.y = FLOOR; q.vy = 0; q.ground = true; }
      else if (q.vy >= 0 && !q.drop) for (const [px, py, w] of PLAT) if (q.x > px - 4 && q.x < px + w + 4 && oy <= py && q.y >= py) { q.y = py; q.vy = 0; q.ground = true; }
    };
    const cpu = (me, other, chase) => { // a simple chaser / runner
      const a = me.ai; if (a.jumpCd > 0) a.jumpCd--;
      let dir = 0, jump = false, down = false;
      if (chase) {
        dir = Math.abs(other.x - me.x) > 6 ? Math.sign(other.x - me.x) : 0;
        if (other.y < me.y - 20 && me.ground && a.jumpCd === 0) { jump = true; a.jumpCd = 30; }
        if (other.y > me.y + 20 && me.ground && me.y < FLOOR) { jump = down = true; }
      } else {
        if (--a.n <= 0) { a.dir = Math.sign(me.x - other.x) || 1; a.n = 40 + Math.floor(Math.random() * 40); }
        if ((me.x < 30 && a.dir < 0) || (me.x > 226 && a.dir > 0)) { a.dir = -a.dir; a.n = 50; if (me.ground) jump = true; }
        dir = a.dir; if (Math.abs(other.x - me.x) < 40 && Math.abs(other.y - me.y) < 24 && me.ground && a.jumpCd === 0) { jump = true; a.jumpCd = 40; }
        if (me.ground && Math.random() < 0.01) jump = true;
      }
      return [dir < 0, dir > 0, jump, down];
    };
    const end = () => { stage = 'end'; t = 0; won = itT[0] === itT[1] ? -1 : itT[0] < itT[1] ? 0 : 1; paid = 0; if (!two && won === 0) { paid = 8; payCoins(8); try { Ach.unlock('tagger'); } catch (e) { /* ignore */ } } Audio8.play(won === 0 || two ? 'victory' : 'gameover'); };
    return {
      isTag: true, _s: () => ({ stage, two, it, itT, left, pl, won }), _set: (o) => { if (o.left !== undefined) left = o.left; },
      enter() { Audio8.play('carnival'); },
      update() {
        t++;
        if (stage === 'pick') { if (Input.pressed('left') || Input.pressed('right')) { two = !two; Audio8.sfx('select'); } if (Input.pressed('back')) { go(() => ChallengeScene(20)); return; } if (t > 10 && Input.confirm()) { stage = 'play'; reset(); t = 0; Audio8.sfx('confirm'); } return; }
        if (stage === 'end') { if (t > 60 && Input.confirm()) { stage = 'pick'; t = 0; } else if (Input.pressed('back')) go(() => ChallengeScene(20)); return; }
        if (Input.pressed('back')) { go(() => ChallengeScene(20)); return; }
        Input2.poll();
        const [a, b] = pl;
        step(a, Input.down('left'), Input.down('right'), Input.pressed('jump'), Input.down('down'), Input.down('run'), 2.2);
        if (two) { const d = (k) => !!k2[k] || Input2.down(k), p = (k) => !!k2hit[k] || Input2.pressed(k); step(b, d('left'), d('right'), p('jump'), d('down'), d('run'), 2.2); }
        else { const [L, R, J, D] = cpu(b, a, it === 1); step(b, L, R, J, D, false, it === 1 ? 2.05 : 2.15); }
        for (const k in k2hit) k2hit[k] = 0;
        itT[it]++; if (cool > 0) cool--;
        if (!cool && Math.abs(a.x - b.x) < 12 && Math.abs(a.y - b.y) < 20) { it = 1 - it; cool = 75; pl[it].freeze = 45; Audio8.sfx('stomp'); rumble(0.4, 120); }
        if (--left <= 0) end();
      },
      draw() {
        drawParallax('grass', t * 0.3);
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, FLOOR, VW, VH - FLOOR); ctx.fillStyle = '#5ad84a'; ctx.fillRect(0, FLOOR, VW, 3);
        for (const [x, y, w] of PLAT) { ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, w + 2, 7); ctx.fillStyle = '#c08a40'; ctx.fillRect(x, y, w, 5); ctx.fillStyle = '#e0b060'; ctx.fillRect(x, y, w, 1); }
        if (stage === 'pick') { drawWindow(20, 60, 216, 84); txt('TAG!', 128, 68, '#ffe040', { align: 'center', scale: 2 }); txt(`< ${two ? '2 PLAYERS' : 'VS GOTHCHICK'} >`, 128, 92, '#fff', { align: 'center' }); txt('WHOEVER IS IT CHASES. TAG TO', 128, 108, '#a8b0d8', { align: 'center' }); txt('PASS IT ON. LEAST TIME AS IT WINS!', 128, 118, '#a8b0d8', { align: 'center' }); txt(two ? 'P2: T F G H MOVE, R JUMPS' : 'DOWN + A DROPS THROUGH', 128, 132, '#5ff0ff', { align: 'center' }); return; }
        pl.forEach((q, i) => {
          const pose = q.freeze > 0 ? 'hurt' : !q.ground ? (q.vy < 0 ? 'jump' : 'fall') : Math.abs(q.vx) > 0.4 ? 'walk' + ((frame >> 2) % 8) : 'idle' + ((frame >> 4) % 4);
          Wally.draw(ctx, q.x, q.y, pose, q.face, { t: frame, hero: q.hero, costume: q.costume, hat: 'none' });
          if (i === it) txt('IT!', q.x, q.y - 36 + ((frame >> 3) & 1), '#ff4050', { align: 'center', outline: '#101848' });
          txt(i === 0 ? 'P1' : two ? 'P2' : 'CPU', q.x, q.y + 4, '#fff', { align: 'center', outline: '#101848' });
        });
        const s = Math.ceil(left / 60); txt(`${s}`, 128, 6, s <= 10 ? '#ff8080' : '#fff', { align: 'center', scale: 2, outline: '#101848' });
        const sec = (n) => (n / 60).toFixed(1); txt(`P1 IT ${sec(itT[0])}S`, 6, 6, '#5ff0ff', { outline: '#101848' }); txt(`${two ? 'P2' : 'CPU'} IT ${sec(itT[1])}S`, 250, 6, '#ff8080', { align: 'right', outline: '#101848' });
        if (stage === 'end') { drawWindow(48, 70, 160, 64); txt(won < 0 ? 'A DRAW!' : won === 0 ? 'P1 WINS!' : two ? 'P2 WINS!' : 'GOTHCHICK WINS!', 128, 78, '#ffe040', { align: 'center', scale: won === 1 && !two ? 1 : 2 }); if (paid) txt(`+${paid} COINS`, 128, 100, '#5ff0ff', { align: 'center' }); txt('A: AGAIN   ESC: BACK', 128, 116, '#fff', { align: 'center' }); }
      },
    };
  }

  // ---------------- online co-op (Firebase Firestore rooms) ----------------
  // A room is two small documents, coop/<CODE>-A (the host) and coop/<CODE>-B
  // (the guest). Each player writes their own every 0.4 s and reads the other.
  const COOP = { on: false, code: '', me: 'A', li: 0, partner: null, seen: 0, busy: false, gotCp: false, gotGoal: false, lastSend: 0, err: '' };
  const Net = {
    cfg: () => window.WALLYMAN_ONLINE || {},
    on() { const c = Net.cfg(); return !!(c.projectId && c.apiKey && window.fetch); },
    url(id) { const c = Net.cfg(); return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(c.projectId)}/databases/(default)/documents/coop/${id}?key=${encodeURIComponent(c.apiKey)}`; },
    async put(id, li, s) { const r = await fetch(Net.url(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { li: { integerValue: String(li) }, s: { stringValue: s }, ts: { integerValue: String(Date.now()) } } }) }); if (!r.ok) throw new Error('HTTP ' + r.status); },
    async get(id) { const r = await fetch(Net.url(id)); if (r.status === 404) return null; if (!r.ok) throw new Error('HTTP ' + r.status); const f = (await r.json()).fields || {}; return { li: Number(f.li && f.li.integerValue), s: (f.s && f.s.stringValue) || '{}', ts: Number(f.ts && f.ts.integerValue) || 0 }; },
  };
  const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(5)); for (const n of r) s += A[n % A.length]; return s; };
  const other = () => (COOP.me === 'A' ? 'B' : 'A');
  const mineState = (pl) => { const p = pl.p; return JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y), p: pl.playerPose ? pl.playerPose() : 'idle0', f: p.face, cp: pl.cpHit ? 1 : 0, g: pl.state === 'clear' || COOP.gotGoal ? 1 : 0, h: game.hero, c: game.costume }); };
  const send = (pl) => Net.put(`${COOP.code}-${COOP.me}`, COOP.li, mineState(pl)).catch(() => { COOP.err = 'CONNECTION TROUBLE'; });
  function coopTick(pl) {
    const P = COOP.partner;
    if (P && P.dx !== undefined) { P.dx += (P.x - P.dx) * 0.25; P.dy += (P.y - P.dy) * 0.25; }
    if (COOP.busy || frame - COOP.lastSend < 24) return;
    COOP.busy = true; COOP.lastSend = frame;
    Promise.all([send(pl), Net.get(`${COOP.code}-${other()}`)]).then(([, d]) => {
      COOP.busy = false; if (!d) return;
      let s = {}; try { s = JSON.parse(d.s); } catch (e) { /* ignore */ }
      if (d.li !== COOP.li || typeof s.x !== 'number') return;
      COOP.err = ''; COOP.seen = d.ts;
      const old = COOP.partner; COOP.partner = Object.assign({}, s, { dx: old && old.dx !== undefined ? old.dx : s.x, dy: old && old.dy !== undefined ? old.dy : s.y, ts: d.ts });
    }, () => { COOP.busy = false; COOP.err = 'CONNECTION TROUBLE'; });
  }
  const partnerFresh = () => COOP.partner && Date.now() - COOP.partner.ts < 15000;
  const inCoop = (pl) => COOP.on && pl.li === COOP.li && !pl._p2ctx && pl.def === LEVELS[pl.li];
  { const _u = PP.update;
    PP.update = function () {
      const r = _u.apply(this, arguments);
      if (!inCoop(this)) return r;
      coopTick(this);
      const P = COOP.partner;
      if (P && partnerFresh()) {
        if (P.cp && !this.cpHit && this.state === 'play') { const e = this.ents.find((k) => k.type === 'checkpoint'); if (e) e.on = true; this.cpHit = true; Audio8.sfx('check'); COOP.banner = ['PARTNER GOT THE CHECKPOINT!', 150]; }
        if (P.g && this.state === 'play' && !COOP.gotGoal) { COOP.gotGoal = true; COOP.banner = ['PARTNER REACHED THE GOAL!', 150]; this.clear(); }
      }
      return r;
    };
  }
  { const _c = PP.clear; PP.clear = function (s) { const was = this.state; _c.call(this, s); if (was === 'play' && this.state === 'clear' && inCoop(this)) { COOP.gotGoal = true; send(this); try { Ach.unlock('coop'); } catch (e) { /* ignore */ } } }; }
  { const _d = PP.drawPlayer;
    PP.drawPlayer = function (cx) {
      if (inCoop(this) && COOP.partner && partnerFresh()) {
        const P = COOP.partner, x = P.dx + this.p.w / 2 - cx;
        ctx.save(); ctx.globalAlpha = 0.85; Wally.draw(ctx, x, P.dy + this.p.h, P.p || 'idle0', P.f || 1, { t: frame, hero: P.h || 'wally', costume: P.c || 'classic', hat: 'none' }); ctx.restore();
        txt('PARTNER', Math.round(x), Math.round(P.dy) - 12, '#5ff0ff', { align: 'center', outline: '#101848' });
      }
      const r = _d.apply(this, arguments);
      if (inCoop(this) && COOP.banner && COOP.banner[1] > 0) { COOP.banner[1]--; txt(COOP.banner[0], 128, 44, '#5ff0ff', { align: 'center', outline: '#101848' }); }
      if (inCoop(this)) txt(!COOP.partner ? 'WAITING FOR PARTNER...' : !partnerFresh() ? 'PARTNER OFFLINE' : COOP.err || 'CO-OP ' + COOP.code, 250, 32, COOP.err || !partnerFresh() ? '#ff8080' : '#a8f0ff', { align: 'right', outline: '#101848' });
      return r;
    };
  }
  const coopLevels = () => [0].concat(LEVELS.map((d, li) => [d, li]).filter(([d, li]) => li > 0 && d && !d.reserved && game && game.cleared[li]).map(([, li]) => li));
  const startCoop = (code, me, li) => { Object.assign(COOP, { banner: null, on: true, code, me, li, partner: null, seen: 0, busy: false, gotCp: false, gotGoal: false, lastSend: 0, err: '' }); go(() => IntroScene(li, false)); };
  function CoopScene(note) {
    let sel = 0, t = 0, step = 'menu', msg = note || (Net.on() ? '' : 'ONLINE CO-OP NEEDS THE FIREBASE SETTINGS'), busy = false, dom = false, lsel = 0, code = '', since = 0, poll = 0;
    const L = coopLevels();
    return {
      _s: () => ({ step, sel, code, msg, busy }),
      enter() { Audio8.play('menu'); },
      update() {
        t++; if (dom || busy) return;
        if (step === 'menu') {
          if (Input.pressed('down')) { sel = (sel + 1) % 3; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + 2) % 3; Audio8.sfx('select'); }
          if (Input.pressed('back') || (Input.confirm() && sel === 2)) { go(() => ChallengeScene(21)); return; }
          if (!Input.confirm()) return;
          if (!Net.on()) { Audio8.sfx('bump'); return; }
          if (sel === 0) { step = 'level'; Audio8.sfx('confirm'); }
          else { dom = true; textBox('TYPE THE ROOM CODE', 'e.g. ABC23', (v) => { dom = false; const c = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); if (c.length !== 5) { if (v) msg = 'A ROOM CODE HAS 5 LETTERS'; return; } busy = true; msg = 'JOINING...';
            Net.get(`${c}-A`).then((d) => { if (!d || Date.now() - d.ts > 10 * 60 * 1000) { busy = false; msg = 'NO GAME WITH THAT CODE'; Audio8.sfx('bump'); return; } return Net.put(`${c}-B`, d.li, '{}').then(() => { busy = false; Audio8.sfx('oneup'); startCoop(c, 'B', d.li); }); }).catch(() => { busy = false; msg = 'COULD NOT REACH THE SERVER'; }); }); }
          return;
        }
        if (step === 'level') {
          if (Input.pressed('down')) { lsel = (lsel + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('up')) { lsel = (lsel + L.length - 1) % L.length; Audio8.sfx('select'); }
          if (Input.pressed('back')) { step = 'menu'; return; }
          if (Input.confirm()) { code = newCode(); busy = true; msg = 'MAKING A ROOM...'; Net.put(`${code}-A`, L[lsel], '{}').then(() => { busy = false; step = 'wait'; since = Date.now(); msg = ''; Audio8.sfx('confirm'); }, () => { busy = false; msg = 'COULD NOT REACH THE SERVER'; }); }
          return;
        }
        if (step === 'wait') {
          if (Input.pressed('back')) { step = 'menu'; msg = 'ROOM CLOSED'; return; }
          if (Input.pressed('run') || Input.pressed('special')) { dom = true; codeBox('SEND THIS ROOM CODE TO YOUR FRIEND', code, null, () => { dom = false; }); return; }
          if (++poll % 60 === 0) { busy = true; Net.get(`${code}-B`).then((d) => { busy = false; if (d && d.ts >= since - 2000 && d.li === L[lsel]) { Audio8.sfx('oneup'); startCoop(code, 'A', L[lsel]); } }, () => { busy = false; }); }
        }
      },
      draw() {
        drawParallax('sky', t * 0.3); drawWindow(20, 20, 216, 184); txt('ONLINE CO-OP', 128, 28, '#ffe040', { align: 'center', scale: 2 });
        if (step === 'menu') {
          ['HOST A GAME', 'JOIN WITH A CODE', 'BACK'].forEach((s, i) => { const y = 62 + i * 16; txt(s, 70, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 58 + ((t >> 3) & 1), y, '#ffe040'); });
          ['PLAY A LEVEL WITH A FRIEND ON', 'ANOTHER DEVICE. YOU SEE EACH', 'OTHER RUN, SHARE CHECKPOINTS,', 'AND WHEN ONE OF YOU REACHES THE', 'GOAL, YOU BOTH CLEAR IT!'].forEach((l, i) => txt(l, 128, 124 + i * 10, '#a8b0d8', { align: 'center' }));
        } else if (step === 'level') {
          txt('PICK A LEVEL TO PLAY', 128, 50, '#fff', { align: 'center' });
          const SHOW = 11, top = clamp(lsel - 5, 0, Math.max(0, L.length - SHOW)); for (let i = 0; i < Math.min(SHOW, L.length); i++) { const k = top + i, y = 66 + i * 11; txt(`${levelTag(L[k])} ${LEVELS[L[k]].name}`.slice(0, 30), 40, y, k === lsel ? '#ffe040' : '#fff'); if (k === lsel) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); }
        } else {
          txt('YOUR ROOM CODE', 128, 60, '#fff', { align: 'center' }); txt(code, 128, 76, '#5ff0ff', { align: 'center', scale: 3 });
          txt(LEVELS[L[lsel]].name, 128, 110, '#ffe040', { align: 'center' });
          txt('WAITING FOR YOUR FRIEND' + '...'.slice(0, (t >> 4) % 4), 128, 130, '#fff', { align: 'center' });
          txt('ON THEIR DEVICE: CHALLENGES,', 128, 150, '#a8b0d8', { align: 'center' }); txt('ONLINE CO-OP, JOIN WITH A CODE', 128, 160, '#a8b0d8', { align: 'center' }); txt('B: SHARE THE CODE   ESC: STOP', 128, 180, '#a8b0d8', { align: 'center' });
        }
        if (msg) txt(msg, 128, 194, '#ff8080', { align: 'center' });
      },
    };
  }

  // ---------------- problem spots: where you keep losing lives ----------------
  { const _d = PP.die;
    PP.die = function () {
      if (!this._p2ctx && this.state === 'play' && game && this.def === LEVELS[this.li] && !this.def.reserved && !this.def.custom && !this.practice) {
        game.deaths = game.deaths || {}; const a = game.deaths[this.li] = game.deaths[this.li] || [];
        a.push([Math.round(this.p.x / TS), clamp(Math.round(this.p.y / TS), 0, 13)]); if (a.length > 40) a.shift();
      }
      return _d.apply(this, arguments);
    };
  }
  const PROB = { back: false, li: -1 };
  const spotsFor = (li) => { const m = {}; for (const [x, y] of (game.deaths && game.deaths[li]) || []) { const k = Math.floor(x / 8); (m[k] = m[k] || { k, n: 0, ys: [] }).n++; m[k].ys.push(y); } return Object.values(m).sort((a, b) => a.k - b.k); };
  function ProblemScene(li) {
    const lv = () => Object.keys(game.deaths || {}).map(Number).filter((k) => LEVELS[k] && game.deaths[k].length).sort((a, b) => game.deaths[b].length - game.deaths[a].length);
    let L = lv(), sel = Math.max(0, L.indexOf(li)), step = li >= 0 && L.includes(li) ? 1 : 0, t = 0, si = 0, grid = null, gw = 0;
    const open = () => { try { const b = buildLevel(L[sel]); grid = b.grid; gw = b.w; } catch (e) { grid = null; gw = LEVELS[L[sel]].width || 200; } const S = spotsFor(L[sel]); si = S.reduce((bi, s, i) => (s.n > S[bi].n ? i : bi), 0); };
    if (step === 1) open();
    return {
      _s: () => ({ step, L, sel, si, gw }),
      enter() { Audio8.play('menu'); },
      update() {
        t++;
        if (step === 0) {
          if (Input.pressed('back') || !L.length && Input.confirm()) { go(() => ChallengeScene(22)); return; }
          if (!L.length) return;
          if (Input.pressed('down')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
          if (Input.confirm()) { step = 1; open(); Audio8.sfx('confirm'); }
          return;
        }
        const S = spotsFor(L[sel]);
        if (Input.pressed('back') || Input.pressed('run')) { step = 0; return; }
        if (Input.pressed('right')) { si = (si + 1) % S.length; Audio8.sfx('select'); } if (Input.pressed('left')) { si = (si + S.length - 1) % S.length; Audio8.sfx('select'); }
        if (Input.pressed('special')) { delete game.deaths[L[sel]]; Save.persist(); L = lv(); sel = 0; step = 0; Audio8.sfx('stomp'); return; }
        if (Input.confirm() && S[si]) { const li2 = L[sel]; Object.assign(U22.PRACTICE, { on: true, li: li2, at: Math.max(0, (S[si].k * 8 - 6) / gw), speed: 1 }); PROB.back = true; PROB.li = li2; Audio8.sfx('confirm'); go(() => new Play(li2, false)); }
      },
      draw() {
        drawParallax('sky', t * 0.3); drawWindow(8, 14, 240, 196); txt('PROBLEM SPOTS', 128, 22, '#ffe040', { align: 'center', scale: 2 });
        if (!L.length) { ['NO PROBLEM SPOTS YET!', '', 'EVERY TIME YOU LOSE A LIFE, THE', 'SPOT IS MARKED HERE, SO YOU CAN', 'PRACTISE THE TRICKY BITS.'].forEach((l, i) => txt(l, 128, 80 + i * 11, i ? '#a8b0d8' : '#fff', { align: 'center' })); return; }
        if (step === 0) {
          txt('LEVELS WHERE YOU LOSE THE MOST LIVES', 128, 44, '#a8b0d8', { align: 'center' });
          const SHOW = 12, top = clamp(sel - 6, 0, Math.max(0, L.length - SHOW));
          for (let i = 0; i < Math.min(SHOW, L.length); i++) { const k = top + i, y = 60 + i * 11, li = L[k]; txt(`${levelTag(li)} ${LEVELS[li].name}`.slice(0, 28), 30, y, k === sel ? '#ffe040' : '#fff'); txt(`X${game.deaths[li].length}`, 238, y, '#ff8080', { align: 'right' }); if (k === sel) txt('>', 20 + ((t >> 3) & 1), y, '#ffe040'); }
          txt('A: SEE THE MAP', 128, 196, '#a8b0d8', { align: 'center' });
          return;
        }
        const li = L[sel], S = spotsFor(li), cur = S[si] || { k: 0, n: 0 }, T4 = 4, cols = 58, x0 = clamp(cur.k * 8 + 4 - cols / 2, 0, Math.max(0, gw - cols)), MX = 12, MY = 64;
        txt(LEVELS[li].name, 128, 44, '#fff', { align: 'center' });
        ctx.fillStyle = '#5cb0f8'; ctx.fillRect(MX, MY, cols * T4, 14 * T4);
        if (grid) for (let y = 0; y < 14; y++) for (let x = 0; x < cols; x++) { const c = grid[y] && grid[y][x0 + x]; if (!c || c === '.') continue; const col = SOLID.has(c) ? (y >= 12 ? '#7a5a3a' : '#c08a40') : c === '=' ? '#e0c070' : c === '~' ? '#3a6ad0' : c === 'o' ? '#ffd040' : ''; if (!col) continue; ctx.fillStyle = col; ctx.fillRect(MX + x * T4, MY + y * T4, T4, c === 'o' ? 2 : T4); }
        ctx.fillStyle = 'rgba(255,224,64,0.25)'; ctx.fillRect(MX + (cur.k * 8 - x0) * T4, MY, 8 * T4, 14 * T4);
        for (const [x, y] of game.deaths[li]) { if (x < x0 || x >= x0 + cols) continue; const X = MX + (x - x0) * T4 + 2, Y = MY + Math.min(13, y) * T4 + 2; ctx.fillStyle = '#1a1020'; ctx.fillRect(X - 3, Y - 3, 7, 7); ctx.fillStyle = '#ff3040'; for (let d = -2; d <= 2; d++) { ctx.fillRect(X + d, Y + d, 1, 1); ctx.fillRect(X + d, Y - d, 1, 1); } }
        // the whole level as a bar
        const BX = 16, BW = 224, BY = 132; ctx.fillStyle = '#202840'; ctx.fillRect(BX, BY, BW, 8); ctx.fillStyle = 'rgba(255,224,64,0.6)'; ctx.fillRect(BX + Math.floor(x0 / gw * BW), BY, Math.max(2, Math.round(cols / gw * BW)), 8);
        S.forEach((s, i) => { const x = BX + Math.floor((s.k * 8 + 4) / gw * BW); ctx.fillStyle = i === si ? '#ffffff' : '#ff3040'; ctx.fillRect(x - 1, BY - 2 - Math.min(8, s.n), 3, 2 + Math.min(8, s.n)); });
        txt(`SPOT ${si + 1}/${S.length}: LOST ${cur.n} ${cur.n === 1 ? 'LIFE' : 'LIVES'} HERE`, 128, 150, '#ffe040', { align: 'center' });
        txt('< > PICK A SPOT', 128, 166, '#fff', { align: 'center' }); txt('A: PRACTISE FROM HERE (NO LIVES LOST)', 128, 178, '#5ff0ff', { align: 'center' }); txt('S: CLEAR THIS LEVEL   B: BACK', 128, 190, '#a8b0d8', { align: 'center' });
      },
    };
  }

  // after a co-op level or a problem-spot practice, come back to the right menu
  { const _M = MapScene;
    MapScene = function (...a) { // eslint-disable-line no-func-assign
      if (PROB.back && U22.PRACTICE.on) { PROB.back = false; U22.PRACTICE.on = false; return ProblemScene(PROB.li); }
      PROB.back = false;
      if (COOP.on) { const done = COOP.gotGoal; COOP.on = false; return CoopScene(done ? 'LEVEL CLEARED TOGETHER! NICE TEAMWORK!' : 'CO-OP GAME OVER'); }
      return _M(...a);
    };
  }

  // ---------------- the Challenges menu ----------------
  ChallengeScene = function (start = 0) { // eslint-disable-line no-func-assign
    const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'ROGUELIKE TOWER', 'GOLDEN LEVELS', 'TUTORIAL', 'MIRROR MODE', 'PARTY MODE', 'SPEEDRUN', 'WEEKLY CHALLENGE', 'MEGA BOSS RUSH', 'IRON HERO', 'RANDOMIZER', 'EXPLORE CASTLE', 'PRACTICE', 'TAG', 'ONLINE CO-OP', 'PROBLEM SPOTS', 'BACK'];
    const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', 'RANDOM FLOORS, UPGRADES, ONE LIFE', 'HUNT 100 GOLD COINS PER LEVEL', 'LEARN ALL THE MOVES', 'EVERY LEVEL FLIPPED AROUND', 'UP TO 4 PLAYERS, 3 MINI-GAMES', 'ONE TIMER FOR THE WHOLE GAME', '3 LEVELS, 1 RULE, NEW EVERY WEEK', 'EVERY BOSS IN THE GAME IN A ROW', 'ONE LIFE FOR THE WHOLE GAME', '8 SHUFFLED LEVELS FROM A SEED', 'ONE BIG CASTLE, 4 RELICS', 'ANY BIT OF A LEVEL, SLOWED DOWN', 'CHASE OR BE CHASED! 1 OR 2 PLAYERS', 'PLAY A LEVEL WITH A FRIEND ONLINE', 'SEE WHERE YOU LOSE LIVES, PRACTISE', ''];
    const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone())), () => RogueIntro(), () => GoldScene(), () => startTutorial(false), () => MirrorScene(), () => PartyScene(), () => SpeedrunScene(), () => WeeklyScene(), () => MegaIntro(), () => IronScene(), () => U22.RandomizerScene(), () => U22.ExploreIntro(), () => U22.PracticeScene(), () => TagScene(), () => CoopScene(), () => ProblemScene(-1)];
    let sel = Math.min(start, items.length - 1), t = 0;
    return {
      enter() { Audio8.play('menu'); },
      update() {
        t++;
        if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
        if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => TitleScene()); return; }
        if (Input.confirm()) { Audio8.sfx('confirm'); go(go_[sel]); }
      },
      draw() {
        drawParallax('castle', t * 0.4); drawLogo(2); drawWindow(48, 72, 160, 136); txt('CHALLENGES', 128, 77, '#ffe040', { align: 'center' });
        const SHOW = 12, top = clamp(sel - 6, 0, items.length - SHOW);
        for (let i = 0; i < SHOW; i++) { const k = top + i, y = 88 + i * 10; txt(items[k], 74, y, k === sel ? '#ffe040' : k >= 20 && k <= 22 ? '#a8f0ff' : '#fff'); if (k === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); }
        if (top > 0) txt('^', 196, 86, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 196, 198, '#a8b0d8');
        txt(tips[sel], 128, 212, '#fff', { align: 'center', outline: '#101848' });
      },
    };
  };

  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['tagger', "TAG, YOU'RE IT!", 'BEAT GOTHCHICK AT TAG'], ['coop', 'BETTER TOGETHER', 'CLEAR A LEVEL IN ONLINE CO-OP']);
  UPDATES.unshift(['2.5', ['PENALTY SHOOTOUT VS DINO', 'TENNIS VS DINO', 'CHECKERS VS DINO: 3 LEVELS', 'HIDE & SEEK IN WALLY TOWN', 'ONLINE CO-OP WITH ROOM CODES', 'TAG: 1 OR 2 PLAYERS', 'PROBLEM SPOTS: PRACTISE WHERE', '  YOU LOSE LIVES', 'BOSS CREATOR SHARE CODES + QR']]);
  return { TagScene, CoopScene, ProblemScene, COOP, Net, PROB, spotsFor };
})();
function TagScene() { return U25b.TagScene(); }
function CoopScene(n) { return U25b.CoopScene(n); }
function ProblemScene(li = -1) { return U25b.ProblemScene(li); }
