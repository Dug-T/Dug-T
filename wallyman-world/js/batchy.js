'use strict';
// Update 2.5 (part 1): three new mini-games against Dino in Dino's House
// (penalty shootout, tennis, checkers) and Hide & Seek in Wally Town.
const U25 = (() => {
  const dinoImg = (k = 0, left = false) => (left ? Sprites.dino.l : Sprites.dino.r)[k & 1];
  const ball = (x, y, r) => {
    ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = i * 1.2566 + 0.3; ctx.fillRect(Math.round(x + Math.cos(a) * r * 0.75) - 1, Math.round(y + Math.sin(a) * r * 0.75) - 1, 2, 2); }
  };

  // ---------------- penalty shootout ----------------
  function PenaltyScene() {
    const GL = 56, GR = 200, GT = 40, GB = 112;
    let stage = 'intro', t = 0, kick = 0, me = [], dino = [], phase = 'aimx', ax = 128, ay = 76, dx = 1, dy = 1, shot = null, keeper = { x: 128, dive: 0, lean: 0 }, msg = '', won = false, myDive = 0, dinoZone = 0, tell = 0;
    const shooterMe = () => kick % 2 === 0;
    const total = (a) => a.filter(Boolean).length;
    const decided = () => {
      const n = Math.max(5, Math.ceil(kick / 2)), mLeft = n - me.length, dLeft = n - dino.length;
      if (me.length >= 5 && dino.length >= 5 && me.length === dino.length) return total(me) !== total(dino);
      if (me.length < 5 || dino.length < 5) return total(me) + mLeft < total(dino) || total(dino) + dLeft < total(me);
      return false;
    };
    const next = () => {
      kick++; t = 0; shot = null; keeper = { x: 128, dive: 0, lean: 0 }; msg = '';
      if (decided()) { stage = 'end'; won = total(me) > total(dino); if (won) { payCoins(10); try { Ach.unlock('penalty'); } catch (e) { /* ignore */ } } Audio8.play(won ? 'victory' : 'gameover'); return; }
      phase = shooterMe() ? 'aimx' : 'runup'; ax = 128; ay = 76; myDive = 0; dinoZone = [-1, 0, 1][Math.floor(Math.random() * 3)]; tell = Math.random() < 0.7 ? dinoZone : [-1, 0, 1][Math.floor(Math.random() * 3)];
    };
    return {
      _s: () => ({ stage, phase, kick, me, dino, won, msg }),
      enter() { Audio8.play('carnival'); },
      update() {
        t++;
        if (Input.pressed('back')) { go(mgBack(16)); return; }
        if (stage === 'intro') { if (t > 20 && Input.confirm()) { stage = 'play'; kick = -1; next(); Audio8.sfx('confirm'); } return; }
        if (stage === 'end') { if (t > 60 && Input.confirm()) go(mgBack(16)); return; }
        if (phase === 'aimx') { ax += dx * 2.6; if (ax > 210 || ax < 46) dx = -dx; if (Input.confirm()) { phase = 'aimy'; Audio8.sfx('select'); } return; }
        if (phase === 'aimy') { ay += dy * 1.6; if (ay > 108 || ay < 34) dy = -dy; if (Input.confirm()) { phase = 'fly'; t = 0; shot = { x0: 128, y0: 196, x1: ax, y1: ay }; const z = [-1, 0, 1][Math.floor(Math.random() * 3)]; keeper.target = 128 + z * 46; Audio8.sfx('kick'); } return; }
        if (phase === 'runup') { if (Input.down('left')) myDive = -1; else if (Input.down('right')) myDive = 1; else myDive = 0; if (t >= 70) { phase = 'fly'; t = 0; const miss = Math.random() < 0.1; shot = { x0: 128, y0: 196, x1: 128 + dinoZone * (miss ? 86 : 48) + (Math.random() * 12 - 6), y1: 50 + Math.random() * 50 }; keeper.target = 128 + myDive * 46; Audio8.sfx('kick'); } return; }
        if (phase === 'fly') {
          const k = Math.min(1, t / 28); keeper.x += (keeper.target - keeper.x) * 0.22; keeper.lean = (keeper.target - 128) / 46;
          if (k >= 1) {
            const inGoal = shot.x1 > GL + 4 && shot.x1 < GR - 4 && shot.y1 > GT + 2 && shot.y1 < GB;
            const reach = Math.abs(shot.x1 - keeper.x) < (shot.y1 < 54 ? 16 : 26);
            const goal = inGoal && !reach;
            (shooterMe() ? me : dino).push(goal);
            msg = !inGoal ? 'MISSED!' : goal ? 'GOAL!' : 'SAVED!'; Audio8.sfx(goal ? (shooterMe() ? 'oneup' : 'hurt') : 'bump');
            phase = 'show'; t = 0;
          }
          return;
        }
        if (phase === 'show' && t > 70) next();
      },
      draw() {
        const g = ctx.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, '#3a6ad0'); g.addColorStop(1, '#8ab8f0'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 40);
        for (let i = 0; i < 64; i++) { ctx.fillStyle = ['#e04050', '#ffe040', '#5ff0ff', '#ffffff'][i % 4]; ctx.fillRect((i * 37) % VW, 6 + ((i * 13) % 26) + (((frame >> 3) + i) % 7 === 0 ? -1 : 0), 3, 3); }
        for (let y = 40; y < VH; y += 12) { ctx.fillStyle = ((y / 12) | 0) % 2 ? '#3aa848' : '#46b854'; ctx.fillRect(0, y, VW, 12); }
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; for (let x = GL; x <= GR; x += 8) ctx.fillRect(x, GT, 1, GB - GT); for (let y = GT; y <= GB; y += 8) ctx.fillRect(GL, y, GR - GL, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(GL - 3, GT - 3, 3, GB - GT + 3); ctx.fillRect(GR, GT - 3, 3, GB - GT + 3); ctx.fillRect(GL - 3, GT - 3, GR - GL + 6, 3); ctx.fillRect(20, GB, 216, 1); ctx.fillRect(126, 194, 4, 3);
        if (stage === 'intro') { drawWindow(36, 120, 184, 84); txt('PENALTY SHOOTOUT', 128, 128, '#ffe040', { align: 'center' }); ['5 KICKS EACH VS DINO.', 'SHOOT: A STOPS THE SIDE AIM,', 'THEN A AGAIN FOR THE HEIGHT.', 'SAVE: HOLD LEFT OR RIGHT TO', 'DIVE, OR NOTHING TO STAY.', 'PRESS A TO START'].forEach((l, i) => txt(l, 128, 142 + i * 10, i === 5 ? '#ffe040' : '#fff', { align: 'center' })); return; }
        const mine = shooterMe() && stage !== 'end';
        // the keeper
        ctx.save(); ctx.translate(Math.round(keeper.x), GB); ctx.rotate(keeper.lean * (phase === 'fly' || phase === 'show' ? 0.9 : 0));
        if (mine) { const im = dinoImg((frame >> 4) & 1); ctx.drawImage(im, -im.width * 0.75, -im.height * 1.5, im.width * 1.5, im.height * 1.5); }
        else Wally.draw(ctx, 0, 0, phase === 'fly' || phase === 'show' ? 'jump' : 'idle' + ((frame >> 4) % 4), 1, { t: frame, sx: 1.4, sy: 1.4 });
        ctx.restore();
        // the kicker
        if (mine) Wally.draw(ctx, 112, 216, phase === 'fly' && t < 10 ? 'kick' : 'idle0', 1, { t: frame });
        else { const run = phase === 'runup' ? Math.min(1, t / 70) : 1, im = dinoImg((t >> 3) & 1); ctx.drawImage(im, Math.round(84 + run * 20), 196 - im.height + 18); if (phase === 'runup' && t > 20 && t < 50) txt(tell < 0 ? '<' : tell > 0 ? '>' : '!', 112, 168, '#ffe040', { align: 'center', outline: '#101848' }); }
        // the ball
        if (shot) { const k = Math.min(1, t / 28), e = phase === 'show' ? 1 : k; ball(shot.x0 + (shot.x1 - shot.x0) * e, shot.y0 + (shot.y1 - shot.y0) * e - Math.sin(e * Math.PI) * 14, 6 - e * 2.5); } else ball(128, 196, 6);
        if (phase === 'aimx' || phase === 'aimy') { ctx.strokeStyle = '#ff3040'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, ay, 6, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; if (phase === 'aimx') { ctx.fillStyle = 'rgba(255,48,64,0.5)'; ctx.fillRect(ax - 1, GT, 2, GB - GT); } txt(phase === 'aimx' ? 'A: PICK THE SIDE' : 'A: PICK THE HEIGHT', 128, 150, '#fff', { align: 'center', outline: '#101848' }); }
        if (phase === 'runup') txt(myDive < 0 ? '< DIVING LEFT' : myDive > 0 ? 'DIVING RIGHT >' : 'HOLD LEFT/RIGHT TO DIVE', 128, 150, '#fff', { align: 'center', outline: '#101848' });
        if (msg) txt(msg, 128, 130, msg === 'GOAL!' ? '#ffe040' : '#ff8080', { align: 'center', scale: 2, outline: '#101848' });
        // scoreboard
        drawWindow(4, 170, 74, 44); txt('YOU', 10, 178, '#5ff0ff'); txt('DINO', 10, 196, '#ff8080');
        const dots = (a, y) => { for (let i = 0; i < Math.max(5, a.length); i++) { ctx.fillStyle = i >= a.length ? '#3a4a6a' : a[i] ? '#40e060' : '#e03040'; ctx.fillRect(38 + (i % 5) * 7, y + Math.floor(i / 5) * 6 - (a.length > 5 ? 2 : 0), 5, 5); } };
        dots(me, 186 - 8 + 0); dots(dino, 204 - 8);
        if (stage === 'end') { drawWindow(56, 120, 144, 46); txt(won ? 'YOU WIN!' : 'DINO WINS!', 128, 128, '#ffe040', { align: 'center', scale: 2 }); txt(`${total(me)} - ${total(dino)}${won ? '   +10 COINS' : ''}`, 128, 150, '#fff', { align: 'center' }); }
      },
    };
  }

  // ---------------- tennis vs Dino ----------------
  function TennisScene() {
    const L = 56, R = 200, T = 22, B = 204, NET = 113, G = 0.16;
    let stage = 'intro', t = 0, me = { x: 128, y: 196 }, op = { x: 128, y: 30 }, b = null, pts = [0, 0], games = [0, 0], server = 0, bounces = 0, side = 0, lastHit = 0, msg = '', msgT = 0, swing = 0, opSwing = 0, waitServe = true, won = false, rally = 0;
    const NAMES = ['LOVE', '15', '30', '40'];
    const call = () => { const [a, c] = pts; if (a >= 3 && c >= 3) return a === c ? 'DEUCE' : a > c ? 'ADVANTAGE YOU' : 'ADVANTAGE DINO'; return `${NAMES[a]} - ${NAMES[c]}`; };
    const hitTo = (from, who) => { // send the ball to the other half
      const toTop = who === 0, aimX = who === 0 ? (Input.down('left') ? L + 14 : Input.down('right') ? R - 14 : 128 + (Math.random() * 60 - 30)) : clamp(me.x + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40), L + 10, R - 10);
      const aimY = toTop ? T + 20 + Math.random() * 40 : B - 20 - Math.random() * 40, F = Math.max(34, 54 - rally * 1.2), z0 = Math.max(4, b ? b.z : 10);
      b = { x: from.x, y: from.y + (toTop ? -6 : 6), z: z0, vx: (aimX - from.x) / F, vy: (aimY - from.y) / F, vz: (0.5 * G * F * F - z0) / F }; bounces = 0; side = toTop ? 1 : 0; lastHit = who; rally++;
      Audio8.sfx('kick');
    };
    const point = (who) => {
      pts[who]++; rally = 0; b = null; waitServe = true; t = 0; Audio8.sfx(who === 0 ? 'oneup' : 'hurt');
      const [a, c] = pts; if ((a >= 4 || c >= 4) && Math.abs(a - c) >= 2) { games[a > c ? 0 : 1]++; pts = [0, 0]; server = 1 - server; msg = (a > c ? 'YOU' : 'DINO') + ' WIN THE GAME!'; }
      else msg = who === 0 ? 'YOUR POINT!' : "DINO'S POINT!";
      msgT = 80; me = { x: 128, y: 196 }; op = { x: 128, y: 30 };
      if (games[0] >= 3 || games[1] >= 3) { stage = 'end'; won = games[0] >= 3; if (won) { payCoins(10); try { Ach.unlock('tennis'); } catch (e) { /* ignore */ } } Audio8.play(won ? 'victory' : 'gameover'); }
    };
    return {
      _s: () => ({ stage, pts, games, rally, b, waitServe, server, me, won }),
      enter() { Audio8.play('carnival'); },
      update() {
        t++; if (msgT > 0) msgT--; if (swing > 0) swing--; if (opSwing > 0) opSwing--;
        if (Input.pressed('back')) { go(mgBack(17)); return; }
        if (stage === 'intro') { if (t > 20 && Input.confirm()) { stage = 'play'; t = 0; Audio8.sfx('confirm'); } return; }
        if (stage === 'end') { if (t > 60 && Input.confirm()) go(mgBack(17)); return; }
        const sp = Input.down('run') ? 2.4 : 1.9;
        me.x = clamp(me.x + ((Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0)) * sp, L - 16, R + 16);
        me.y = clamp(me.y + ((Input.down('down') ? 1 : 0) - (Input.down('up') ? 1 : 0)) * sp, NET + 24, B + 12);
        if (Input.pressed('jump')) swing = 14;
        if (waitServe) {
          if (msgT > 40) return;
          if (server === 0) { me.y = B; if (swing === 14) { waitServe = false; b = { x: me.x, y: me.y - 4, z: 18 }; hitTo(me, 0); } }
          else { op.y = T + 4; if (t > 60) { waitServe = false; b = { x: op.x, y: op.y + 4, z: 18 }; hitTo(op, 1); opSwing = 12; } }
          return;
        }
        // Dino runs to where the ball is going
        if (b) {
          const tx = side === 1 ? b.x + b.vx * 6 : 128, ty = side === 1 ? clamp(b.y - 4, T - 10, NET - 24) : 34, osp = 1.55 + Math.min(0.6, rally * 0.04);
          op.x += clamp(tx - op.x, -osp, osp); op.y += clamp(ty - op.y, -osp * 0.7, osp * 0.7);
        }
        if (!b) return;
        b.x += b.vx; b.y += b.vy; b.z += b.vz; b.vz -= G;
        if (b.z <= 0) {
          b.z = 0; b.vz = Math.abs(b.vz) * 0.62; bounces++; Audio8.sfx('bump');
          const inside = b.x >= L && b.x <= R && b.y >= T && b.y <= B, ownHalf = (b.y < NET ? 1 : 0);
          if (bounces === 1 && (!inside || ownHalf !== side)) { point(1 - lastHit); return; }
          if (bounces >= 2) { point(side === 1 ? 0 : 1); return; }
        }
        if (b.y < T - 30 || b.y > B + 30 || b.x < L - 40 || b.x > R + 40) { point(bounces ? (side === 1 ? 0 : 1) : 1 - lastHit); return; }
        // hitting
        if (side === 0 && swing > 0 && Math.abs(b.x - me.x) < 16 && Math.abs(b.y - (me.y - 6)) < 14 && b.z < 26) { hitTo(me, 0); swing = 0; }
        if (side === 1 && Math.abs(b.x - op.x) < 14 && Math.abs(b.y - (op.y + 6)) < 12 && b.z < 24 && (bounces === 1 || b.z > 8)) { if (Math.random() < Math.max(0.55, 0.96 - rally * 0.03)) { hitTo(op, 1); opSwing = 12; } else side = -1; }
      },
      draw() {
        ctx.fillStyle = '#2a7a4a'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#3a8ad0'; ctx.fillRect(L, T, R - L, B - T);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(L, T, R - L, 2); ctx.fillRect(L, B - 2, R - L, 2); ctx.fillRect(L, T, 2, B - T); ctx.fillRect(R - 2, T, 2, B - T); ctx.fillRect(127, T + 40, 2, B - T - 80); ctx.fillRect(L, T + 40, R - L, 1); ctx.fillRect(L, B - 40, R - L, 1);
        ctx.fillStyle = '#e8e8f0'; ctx.fillRect(L - 6, NET - 1, R - L + 12, 2); ctx.fillStyle = 'rgba(20,20,40,0.45)'; ctx.fillRect(L - 6, NET - 6, R - L + 12, 5); ctx.fillStyle = '#1a1020'; ctx.fillRect(L - 7, NET - 8, 2, 9); ctx.fillRect(R + 5, NET - 8, 2, 9);
        if (stage === 'intro') { drawWindow(32, 60, 192, 100); txt('TENNIS VS DINO', 128, 68, '#ffe040', { align: 'center', scale: 2 }); ['MOVE WITH THE ARROWS, B TO RUN', 'A SWINGS YOUR RACKET', 'HOLD LEFT/RIGHT AS YOU HIT', 'TO AIM FOR A CORNER', 'FIRST TO 3 GAMES WINS', '', 'PRESS A TO START'].forEach((l, i) => txt(l, 128, 88 + i * 10, i === 6 ? '#ffe040' : '#fff', { align: 'center' })); return; }
        const im = dinoImg((frame >> 4) & 1); ctx.drawImage(im, Math.round(op.x - im.width / 2), Math.round(op.y - im.height + 8)); if (opSwing) { ctx.fillStyle = '#c03040'; ctx.fillRect(Math.round(op.x + 8), Math.round(op.y - 4), 8, 3); }
        if (b) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(b.x, b.y - b.z, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e0f040'; ctx.beginPath(); ctx.arc(b.x, b.y - b.z, 2.2, 0, Math.PI * 2); ctx.fill(); }
        Wally.draw(ctx, me.x, me.y, swing > 8 ? 'throw' : Input.down('left') || Input.down('right') || Input.down('up') || Input.down('down') ? 'walk' + ((frame >> 2) % 8) : 'idle' + ((frame >> 4) % 4), 1, { t: frame });
        if (swing) { ctx.strokeStyle = '#ffe040'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(me.x, me.y - 10, 13, -Math.PI * 0.9, -Math.PI * 0.1); ctx.stroke(); ctx.lineWidth = 1; }
        drawWindow(204, 4, 50, 46); txt('GAMES', 229, 9, '#ffe040', { align: 'center' }); txt(`YOU ${games[0]}`, 210, 22, '#5ff0ff'); txt(`DINO ${games[1]}`, 210, 34, '#ff8080');
        txt(call(), 128, 4, '#fff', { align: 'center', outline: '#101848' });
        if (waitServe && stage === 'play' && msgT <= 40) txt(server === 0 ? 'YOUR SERVE: PRESS A' : 'DINO SERVES...', 128, 212, '#ffe040', { align: 'center', outline: '#101848' });
        if (msgT > 0) txt(msg, 128, 100, '#ffe040', { align: 'center', outline: '#101848' });
        if (stage === 'end') { drawWindow(56, 86, 144, 46); txt(won ? 'YOU WIN!' : 'DINO WINS!', 128, 94, '#ffe040', { align: 'center', scale: 2 }); txt(`GAMES ${games[0]} - ${games[1]}${won ? '  +10 COINS' : ''}`, 128, 116, '#fff', { align: 'center' }); }
      },
    };
  }

  // ---------------- checkers (draughts) vs Dino ----------------
  // 1 / 2 = your man / king (bottom, moving up); -1 / -2 = Dino's
  const CK = {
    start() { const b = []; for (let r = 0; r < 8; r++) { b.push([]); for (let c = 0; c < 8; c++) b[r].push((r + c) % 2 === 1 ? (r < 3 ? -1 : r > 4 ? 1 : 0) : 0); } return b; },
    moves(b, side) {
      const jumps = [], steps = [];
      const dirs = (p) => (Math.abs(p) === 2 ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : side === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
      const jumpFrom = (r, c, p, path, caps, start) => {
        let any = false;
        for (const [dr, dc] of dirs(p)) {
          const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
          if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
          const mid = b[mr][mc], land = lr === start[0] && lc === start[1] ? 0 : b[lr][lc];
          if (mid * side < 0 && land === 0 && !caps.some(([a, d]) => a === mr && d === mc)) {
            any = true; const np = path.concat([[lr, lc]]), nc = caps.concat([[mr, mc]]);
            const crowned = Math.abs(p) === 1 && (side === 1 ? lr === 0 : lr === 7);
            if (crowned) jumps.push({ path: np, caps: nc }); else if (!jumpFrom(lr, lc, p, np, nc, start)) jumps.push({ path: np, caps: nc });
          }
        }
        return any;
      };
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = b[r][c]; if (p * side <= 0) continue;
        jumpFrom(r, c, p, [[r, c]], [], [r, c]);
        for (const [dr, dc] of dirs(p)) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === 0) steps.push({ path: [[r, c], [nr, nc]], caps: [] }); }
      }
      return jumps.length ? jumps : steps;
    },
    apply(b, m) {
      const n = b.map((r) => r.slice()), [r0, c0] = m.path[0], [r1, c1] = m.path[m.path.length - 1]; let p = n[r0][c0];
      n[r0][c0] = 0; for (const [r, c] of m.caps) n[r][c] = 0;
      if (p === 1 && r1 === 0) p = 2; if (p === -1 && r1 === 7) p = -2; n[r1][c1] = p; return n;
    },
    score(b) { // from Dino's side
      let s = 0; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = b[r][c]; if (!p) continue; const v = Math.abs(p) === 2 ? 1.7 : 1 + (p < 0 ? r : 7 - r) * 0.04 + (c > 1 && c < 6 ? 0.03 : 0); s += p < 0 ? v : -v; } return s;
    },
    search(b, side, depth, a, z) {
      const ms = CK.moves(b, side);
      if (!ms.length) return side === -1 ? -100 - depth : 100 + depth;
      if (depth === 0) return CK.score(b);
      if (side === -1) { let best = -1e9; for (const m of ms) { best = Math.max(best, CK.search(CK.apply(b, m), 1, depth - 1, a, z)); a = Math.max(a, best); if (a >= z) break; } return best; }
      let best = 1e9; for (const m of ms) { best = Math.min(best, CK.search(CK.apply(b, m), -1, depth - 1, a, z)); z = Math.min(z, best); if (a >= z) break; } return best;
    },
    pick(b, level) {
      const ms = CK.moves(b, -1); if (!ms.length) return null;
      if (level === 0) return ms[Math.floor(Math.random() * ms.length)];
      const depth = level === 1 ? 2 : 5; let best = -1e9, list = [];
      for (const m of ms) { const v = CK.search(CK.apply(b, m), 1, depth - 1, -1e9, 1e9) + Math.random() * 0.01; if (v > best + 1e-6) { best = v; list = [m]; } else if (Math.abs(v - best) < 1e-6) list.push(m); }
      return list[0];
    },
  };
  function CheckersScene() {
    const LEVELS_ = ['EASY', 'NORMAL', 'HARD'], S = 22, X0 = 40, Y0 = 26;
    let stage = 'pick', lvl = 1, t = 0, b = CK.start(), turn = 1, cur = [5, 0], selp = null, last = null, wait = 0, won = false, msg = '';
    const mine = () => CK.moves(b, 1);
    const end = (w) => { stage = 'end'; won = w; t = 0; if (w) { payCoins([4, 8, 15][lvl]); if (lvl === 2) try { Ach.unlock('checkers'); } catch (e) { /* ignore */ } } Audio8.play(w ? 'victory' : 'gameover'); };
    return {
      _s: () => ({ stage, lvl, b, turn, cur, selp, won, msg }), _set: (o) => { if (o.b) b = o.b; if (o.cur) cur = o.cur; if (o.turn) turn = o.turn; },
      enter() { Audio8.play('menu'); },
      update() {
        t++;
        if (stage === 'pick') { if (Input.pressed('left')) { lvl = (lvl + 2) % 3; Audio8.sfx('select'); } if (Input.pressed('right')) { lvl = (lvl + 1) % 3; Audio8.sfx('select'); } if (Input.pressed('back')) { go(mgBack(18)); return; } if (t > 10 && Input.confirm()) { stage = 'play'; Audio8.sfx('confirm'); } return; }
        if (stage === 'end') { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(mgBack(18)); return; }
        if (Input.pressed('back') && !selp) { go(mgBack(18)); return; }
        if (turn === -1) {
          if (++wait < 36) return;
          const m = CK.pick(b, lvl); if (!m) { end(true); return; }
          b = CK.apply(b, m); last = m; turn = 1; wait = 0; Audio8.sfx(m.caps.length ? 'stomp' : 'select');
          if (!mine().length) end(false);
          return;
        }
        const mv = (dr, dc) => { cur = [clamp(cur[0] + dr, 0, 7), clamp(cur[1] + dc, 0, 7)]; Audio8.sfx('select'); };
        if (Input.pressed('up')) mv(-1, 0); if (Input.pressed('down')) mv(1, 0); if (Input.pressed('left')) mv(0, -1); if (Input.pressed('right')) mv(0, 1);
        if (Input.pressed('run') || (Input.pressed('back') && selp)) { selp = null; return; }
        if (Input.pressed('jump')) {
          const ms = mine();
          if (selp) {
            const m = ms.find((k) => k.path[0][0] === selp[0] && k.path[0][1] === selp[1] && k.path[k.path.length - 1][0] === cur[0] && k.path[k.path.length - 1][1] === cur[1]);
            if (m) { b = CK.apply(b, m); last = m; selp = null; turn = -1; wait = 0; msg = ''; Audio8.sfx(m.caps.length ? 'stomp' : 'confirm'); if (!CK.moves(b, -1).length) end(true); return; }
          }
          if (b[cur[0]][cur[1]] > 0) { if (ms.some((k) => k.path[0][0] === cur[0] && k.path[0][1] === cur[1])) { selp = cur.slice(); msg = ''; Audio8.sfx('select'); } else { msg = ms.length && ms[0].caps.length ? 'YOU MUST JUMP!' : 'THAT ONE CANNOT MOVE'; Audio8.sfx('bump'); } }
          else if (selp) { Audio8.sfx('bump'); }
        }
      },
      draw() {
        drawParallax('grass', t * 0.2);
        if (stage === 'pick') { drawWindow(20, 60, 216, 90); txt('CHECKERS VS DINO', 128, 68, '#ffe040', { align: 'center' }); txt(`< ${LEVELS_[lvl]} >`, 128, 90, '#fff', { align: 'center', scale: 2 }); ['MOVE DIAGONALLY. JUMP TO TAKE', 'DINO\'S PIECES. JUMPS ARE A MUST!', 'REACH THE TOP ROW TO BE A KING.', 'PRESS A TO START'].forEach((l, i) => txt(l, 128, 108 + i * 10, i === 3 ? '#ffe040' : '#a8b0d8', { align: 'center' })); return; }
        ctx.fillStyle = '#3a2010'; ctx.fillRect(X0 - 4, Y0 - 4, S * 8 + 8, S * 8 + 8);
        const ms = turn === 1 && stage === 'play' ? mine() : [], dests = selp ? ms.filter((k) => k.path[0][0] === selp[0] && k.path[0][1] === selp[1]).map((k) => k.path[k.path.length - 1]) : [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          const x = X0 + c * S, y = Y0 + r * S; ctx.fillStyle = (r + c) % 2 ? '#7a4a2a' : '#f0d8a8'; ctx.fillRect(x, y, S, S);
          if (last && last.path.some(([a, d]) => a === r && d === c)) { ctx.fillStyle = 'rgba(255,224,64,0.25)'; ctx.fillRect(x, y, S, S); }
          if (dests.some(([a, d]) => a === r && d === c)) { ctx.fillStyle = 'rgba(64,224,96,0.7)'; ctx.beginPath(); ctx.arc(x + S / 2, y + S / 2, 4, 0, Math.PI * 2); ctx.fill(); }
          const p = b[r][c]; if (!p) continue;
          const cx = x + S / 2, cy = y + S / 2, up = selp && selp[0] === r && selp[1] === c ? -2 : 0;
          ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(cx, cy + 1, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = p > 0 ? '#e03040' : '#30b0a0'; ctx.beginPath(); ctx.arc(cx, cy + up, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = p > 0 ? '#ff7080' : '#70e0c8'; ctx.beginPath(); ctx.arc(cx - 2, cy - 2 + up, 3.5, 0, Math.PI * 2); ctx.fill();
          if (Math.abs(p) === 2) { ctx.fillStyle = '#ffe040'; ctx.fillRect(cx - 5, cy - 2 + up, 10, 4); ctx.fillRect(cx - 5, cy - 5 + up, 2, 3); ctx.fillRect(cx - 1, cy - 6 + up, 2, 4); ctx.fillRect(cx + 3, cy - 5 + up, 2, 3); }
        }
        if (stage === 'play' && turn === 1) { const x = X0 + cur[1] * S, y = Y0 + cur[0] * S; ctx.strokeStyle = (frame >> 3) & 1 ? '#ffe040' : '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, S - 2, S - 2); ctx.lineWidth = 1; }
        const im = dinoImg((frame >> 4) & 1); ctx.drawImage(im, 222, 30); txt('DINO', 234, 22, '#fff', { align: 'center', outline: '#101848' }); txt(LEVELS_[lvl], 234, 60, '#a8f0ff', { align: 'center', outline: '#101848' });
        const count = (s) => b.flat().filter((p) => p * s > 0).length; txt(`${count(-1)}`, 20, 40, '#70e0c8', { align: 'center', scale: 2, outline: '#101848' }); txt(`${count(1)}`, 20, 170, '#ff7080', { align: 'center', scale: 2, outline: '#101848' });
        txt(stage === 'end' ? '' : turn === -1 ? 'DINO IS THINKING...' : msg || (selp ? 'A: MOVE HERE   B: CANCEL' : 'A: PICK A PIECE'), 128, 210, msg ? '#ff8080' : '#fff', { align: 'center', outline: '#101848' });
        if (stage === 'end') { drawWindow(56, 90, 144, 46); txt(won ? 'YOU WIN!' : 'DINO WINS!', 128, 98, '#ffe040', { align: 'center', scale: 2 }); if (won) txt(`+${[4, 8, 15][lvl]} COINS`, 128, 120, '#fff', { align: 'center' }); }
      },
    };
  }

  // ---------------- Dino's House: the mini-game list ----------------
  MiniGamesScene = function (start = 0) { // eslint-disable-line no-func-assign
    const items = ['SLOT MACHINE (5 COINS)', 'MEMORY MATCH (10 COINS)', 'FISHING (3 COINS A CAST)', 'KART RACE (FREE)', 'BEAT TAPPER (3 COINS)', 'SNOWBALL FIGHT (3 COINS)', 'WHACK-A-GRUMBLE (3 COINS)', 'MINI GOLF (3 COINS)', 'PINBALL (3 COINS)', "HOOT'S QUIZ (FREE)", 'GARDEN DEFENCE (3 COINS)', 'CARD BATTLE (FREE)', 'GRUMBLE BOWLING (3 COINS)', 'PARTY BOARD (FREE)', 'ARCADE CORNER (2 COINS)', 'AIR HOCKEY (FREE)', 'PENALTY SHOOTOUT (2 COINS)', 'TENNIS VS DINO (FREE)', 'CHECKERS VS DINO (FREE)', 'BACK'];
    const cost = [0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 3, 0, 3, 0, 2, 0, 2, 0, 0];
    const scenes = [() => SlotScene(), () => MemoryScene(), () => FishScene(), () => KartScene(), () => TapperPick(), () => SnowballScene(), () => WhackScene(), () => GolfScene(), () => PinballScene(), () => QuizScene(), () => DefenceScene(), () => CardBattleScene(), () => BowlingScene(), () => PartyBoardScene(), () => ArcadeScene(), () => HockeyScene(), () => PenaltyScene(), () => TennisScene(), () => CheckersScene()];
    let sel = Math.min(start, items.length - 1), t = 0, msg = ''; const SHOW = 12;
    return {
      enter() { Audio8.play('carnival'); },
      update() {
        t++;
        if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => HouseScene(2)); return; }
        if (Input.confirm()) { if (game.coins < cost[sel]) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); return; } game.coins -= cost[sel]; Audio8.sfx('confirm'); go(scenes[sel]); }
      },
      draw() {
        drawParallax('carnival', t * 0.4);
        drawWindow(20, 18, 216, 26 + SHOW * 13); txt('MINI-GAMES', 128, 24, '#ffe040', { align: 'center' });
        const top = clamp(sel - 6, 0, items.length - SHOW);
        for (let i = 0; i < SHOW; i++) { const k = top + i, y = 40 + i * 13; txt(items[k], 40, y, k === sel ? '#ffe040' : k >= 16 && k <= 18 ? '#a8f0ff' : '#fff'); if (k === sel) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); }
        if (top > 0) txt('^', 224, 38, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 224, 38 + (SHOW - 1) * 13, '#a8b0d8');
        ctx.drawImage(Sprites.coinIcon, 100, 207); txt('*' + pad(game.coins, 2), 107, 207, '#fff', { outline: '#101848' }); if (msg) txt(msg, 132, 207, '#ff8080', { outline: '#101848' });
      },
    };
  };

  // ---------------- Hide & Seek in Wally Town ----------------
  const SPOTS = [['bush', 40], ['barrel', 104], ['tree', 160], ['crate', 222], ['hay', 286], ['bin', 344], ['cart', 404], ['bush', 462], ['shed', 520], ['tree', 586], ['barrel', 640], ['fountain', 700]];
  const W_ = 760;
  function drawSpot(kind, x, wig) {
    const X = Math.round(x + wig), Y = 186;
    const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X + a, Y + b, w, h); };
    switch (kind) {
      case 'bush': for (const [a, b, r] of [[-10, -9, 9], [0, -14, 11], [10, -9, 9]]) { ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(X + a, Y + b, r + 1, 0, Math.PI * 2); ctx.fill(); } for (const [a, b, r] of [[-10, -9, 9], [0, -14, 11], [10, -9, 9]]) { ctx.fillStyle = '#2f9a3a'; ctx.beginPath(); ctx.arc(X + a, Y + b, r, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#58c860'; ctx.beginPath(); ctx.arc(X - 3, Y - 18, 4, 0, Math.PI * 2); ctx.fill(); break;
      case 'barrel': R(-10, -26, 20, 26, '#1a1020'); R(-9, -25, 18, 24, '#a0622a'); R(-9, -20, 18, 2, '#5a5a6a'); R(-9, -8, 18, 2, '#5a5a6a'); R(-5, -25, 2, 24, '#c0823a'); break;
      case 'tree': R(-4, -30, 8, 30, '#6a3a1a'); ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(X, Y - 44, 21, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a8a3a'; ctx.beginPath(); ctx.arc(X, Y - 44, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#48b050'; ctx.beginPath(); ctx.arc(X - 6, Y - 50, 7, 0, Math.PI * 2); ctx.fill(); break;
      case 'crate': R(-12, -24, 24, 24, '#1a1020'); R(-11, -23, 22, 22, '#c08a40'); R(-11, -13, 22, 2, '#8a5a20'); R(-1, -23, 2, 22, '#8a5a20'); break;
      case 'hay': ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.ellipse(X, Y - 11, 17, 12, 0, Math.PI, 0); ctx.lineTo(X + 17, Y); ctx.lineTo(X - 17, Y); ctx.fill(); ctx.fillStyle = '#e8c050'; ctx.beginPath(); ctx.ellipse(X, Y - 11, 16, 11, 0, Math.PI, 0); ctx.lineTo(X + 16, Y); ctx.lineTo(X - 16, Y); ctx.fill(); R(-12, -10, 24, 1, '#c09a30'); R(-8, -16, 16, 1, '#c09a30'); break;
      case 'bin': R(-9, -24, 18, 24, '#1a1020'); R(-8, -21, 16, 20, '#5a8a5a'); R(-10, -24, 20, 4, '#3a6a3a'); R(-3, -27, 6, 3, '#3a6a3a'); break;
      case 'cart': R(-16, -20, 32, 14, '#1a1020'); R(-15, -19, 30, 12, '#d04040'); R(-15, -30, 2, 11, '#6a3a1a'); R(13, -30, 2, 11, '#6a3a1a'); R(-17, -32, 34, 3, '#ffe040'); ctx.fillStyle = '#1a1020'; for (const a of [-9, 9]) { ctx.beginPath(); ctx.arc(X + a, Y - 4, 4, 0, Math.PI * 2); ctx.fill(); } break;
      case 'shed': R(-18, -32, 36, 32, '#1a1020'); R(-17, -31, 34, 31, '#8a6a4a'); R(-6, -20, 12, 20, '#5a3a1a'); for (let k = 0; k < 8; k++) R(-20 + k, -40 + k, 40 - k * 2, 1, '#a03030'); break;
      case 'fountain': R(-18, -10, 36, 10, '#1a1020'); R(-17, -9, 34, 9, '#a8b0c0'); R(-3, -26, 6, 16, '#a8b0c0'); R(-14, -8, 28, 3, '#5cb0f8'); ctx.fillStyle = 'rgba(140,200,255,0.8)'; for (let k = 0; k < 4; k++) { const a = ((frame + k * 8) % 32) / 32; ctx.fillRect(Math.round(X - 2 + (k - 1.5) * a * 8), Math.round(Y - 28 + a * a * 20), 2, 2); } break;
      default: break;
    }
  }
  function HideSeekScene() {
    const order = SPOTS.map((s, i) => i).sort(() => Math.random() - 0.5), friends = QUESTS.map((q, i) => ({ q, spot: order[i], found: false, pop: 0 }));
    const spots = SPOTS.map(([kind, x]) => ({ kind, x, checked: false, wig: 0 }));
    let px = 60, face = 1, t = 0, left = 90 * 60, stage = 'intro', search = 0, msg = '', msgT = 0, hintT = 120, got = 0, paid = 0;
    const finish = () => { stage = 'end'; t = 0; paid = got * 3 + (got === 5 ? 10 : 0); payCoins(paid); if (got === 5) { try { Ach.unlock('seeker'); } catch (e) { /* ignore */ } const used = 90 * 60 - left; if (!game.hideBest || used < game.hideBest) game.hideBest = used; Save.persist(); } Audio8.play(got === 5 ? 'victory' : 'gameover'); };
    return {
      _s: () => ({ stage, px, got, left, friends, spots, paid }), _set: (o) => { if (o.px !== undefined) px = o.px; if (o.left !== undefined) left = o.left; },
      enter() { Audio8.play('carnival'); },
      update() {
        t++; if (msgT > 0) msgT--;
        if (stage === 'intro') { if (t > 20 && Input.confirm()) { stage = 'play'; t = 0; Audio8.sfx('confirm'); } if (Input.pressed('back')) go(() => TownScene()); return; }
        if (stage === 'end') { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => TownScene()); return; }
        if (Input.pressed('back')) { go(() => TownScene()); return; }
        for (const s of spots) if (s.wig > 0) s.wig--; for (const f of friends) if (f.pop > 0) f.pop--;
        if (--left <= 0) { left = 0; finish(); return; }
        if (--hintT <= 0) { const hid = friends.filter((f) => !f.found); if (hid.length) { const f = hid[Math.floor(Math.random() * hid.length)]; spots[f.spot].wig = 24; if (Math.abs(spots[f.spot].x - px) < 160) Audio8.sfx('pop'); } hintT = 150 + Math.floor(Math.random() * 90); }
        if (search > 0) {
          if (--search === 0) {
            const i = spots.findIndex((s) => Math.abs(px - s.x) < 18), s = spots[i]; s.checked = true;
            const f = friends.find((k) => k.spot === i && !k.found);
            if (f) { f.found = true; f.pop = 40; got++; msg = `FOUND ${f.q.npc}!`; msgT = 90; Audio8.sfx('oneup'); if (got === 5) finish(); }
            else { msg = 'NOBODY HERE...'; msgT = 60; Audio8.sfx('bump'); }
          }
          return;
        }
        const d = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0); if (d) { px = clamp(px + d * (Input.down('run') ? 2.6 : 1.7), 10, W_ - 10); face = d; }
        if (Input.pressed('up') || Input.pressed('jump')) {
          const s = spots.find((k) => Math.abs(px - k.x) < 18);
          if (!s) return;
          if (s.checked) { msg = 'YOU CHECKED THERE ALREADY'; msgT = 60; Audio8.sfx('bump'); return; }
          search = 22; s.wig = 22; Audio8.sfx('dig');
        }
      },
      draw() {
        const cam = clamp(px - 128, 0, W_ - VW);
        drawParallax('grass', cam * 0.5 + t * 0.1);
        ctx.fillStyle = '#c8a878'; ctx.fillRect(0, 186, VW, 38); ctx.fillStyle = '#b09060'; for (let x = -(cam % 16); x < VW; x += 16) ctx.fillRect(x, 186, 1, 38); ctx.fillStyle = '#7a5a3a'; ctx.fillRect(0, 186, VW, 2);
        spots.forEach((s, i) => {
          const x = s.x - cam; if (x < -40 || x > VW + 40) return;
          const f = friends.find((k) => k.spot === i && k.found);
          if (f) Wally.draw(ctx, x + 20, 186, f.pop > 0 ? 'win' + ((frame >> 3) & 1) : 'idle' + ((frame >> 4) % 4), -1, { t: frame, hero: f.q.hero, costume: f.q.costume, hat: 'none' });
          drawSpot(s.kind, x, s.wig > 0 ? Math.sin(s.wig * 1.7) * 2 : 0);
          if (s.checked && !f) txt('X', x, 150, '#a8b0d8', { align: 'center', outline: '#101848' });
          if (stage === 'play' && Math.abs(px - s.x) < 18 && !s.checked && !search) txt('UP: LOOK', x, 140, '#ffe040', { align: 'center', outline: '#101848' });
        });
        drawWally(px - cam, 186, search ? 'crouch' : Input.down('left') || Input.down('right') ? 'walk' + ((t >> 2) % 8) : 'idle' + ((t >> 4) % 4), face);
        drawWindow(4, 4, 248, 20); txt('HIDE & SEEK', 10, 10, '#ffe040'); const s = Math.ceil(left / 60); txt(`TIME ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, 104, 10, s <= 10 ? '#ff8080' : '#fff');
        friends.forEach((f, i) => { const x = 184 + i * 13; if (f.found) Wally.draw(ctx, x, 22, 'idle0', 1, { t: 0, hero: f.q.hero, costume: f.q.costume, hat: 'none', sx: 0.5, sy: 0.5 }); else txt('?', x, 10, '#a8b0d8', { align: 'center' }); });
        if (msgT > 0) txt(msg, 128, 40, '#ffe040', { align: 'center', outline: '#101848' });
        if (stage === 'play' && t < 240) txt('WATCH FOR THINGS THAT WIGGLE!', 128, 212, '#fff', { align: 'center', outline: '#101848' });
        if (stage === 'intro') { drawWindow(28, 50, 200, 110); txt('HIDE & SEEK', 128, 58, '#ffe040', { align: 'center', scale: 2 }); ['5 FRIENDS ARE HIDING AROUND', 'WALLY TOWN. FIND THEM ALL IN', '90 SECONDS!', '', 'PRESS UP AT A BUSH, BARREL OR', 'TREE TO LOOK. HIDING SPOTS', 'WIGGLE WHEN SOMEONE GIGGLES.', '', 'PRESS A TO START'].forEach((l, i) => txt(l, 128, 76 + i * 9, i === 8 ? '#ffe040' : '#fff', { align: 'center' })); }
        if (stage === 'end') { drawWindow(40, 70, 176, 70); txt(got === 5 ? 'FOUND EVERYONE!' : 'TIME UP!', 128, 78, '#ffe040', { align: 'center', scale: got === 5 ? 1 : 2 }); txt(`FRIENDS FOUND ${got}/5`, 128, 100, '#fff', { align: 'center' }); txt(`+${paid} COINS`, 128, 112, '#5ff0ff', { align: 'center' }); if (game.hideBest) { const b = Math.round(game.hideBest / 60); txt(`BEST TIME ${Math.floor(b / 60)}:${String(b % 60).padStart(2, '0')}`, 128, 124, '#a8b0d8', { align: 'center' }); } }
      },
    };
  }

  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['penalty', 'SPOT KICK', 'WIN THE PENALTY SHOOTOUT'], ['tennis', 'GAME, SET, MATCH', 'BEAT DINO AT TENNIS'], ['checkers', 'CHECKMATE... NEARLY', 'BEAT DINO AT CHECKERS ON HARD'], ['seeker', 'READY OR NOT', 'FIND ALL 5 FRIENDS IN HIDE & SEEK']);
  return { PenaltyScene, TennisScene, CheckersScene, HideSeekScene, CK, SPOTS };
})();
function PenaltyScene() { return U25.PenaltyScene(); }
function TennisScene() { return U25.TennisScene(); }
function CheckersScene() { return U25.CheckersScene(); }
function HideSeekScene() { return U25.HideSeekScene(); }
