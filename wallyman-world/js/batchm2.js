'use strict';
// =====================================================================
// Update 1.2 (part 2): mini golf, pinball, Professor Hoot's quiz and
// Garden Defence; Dino's Kitchen, the crafting bench (and the parts
// you find in levels), pet evolution, the mailbox and Photo Safari;
// the updated menus.
// =====================================================================
ACH_LIST.push(['golfer', 'HOLE IN ONE', 'SINK A MINI GOLF HOLE IN ONE SHOT'], ['pinball', 'PINBALL WIZARD', 'SCORE 5000 AT PINBALL'], ['quizwhiz', 'SMARTY PANTS', 'GET 10 OUT OF 10 IN THE QUIZ'],
  ['defender', 'GREEN THUMB GUARD', 'WIN GARDEN DEFENCE'], ['chef', 'MASTER CHEF', 'COOK A SNACK IN THE KITCHEN'], ['crafter', 'HANDY HERO', 'CRAFT SOMETHING AT THE BENCH'],
  ['evolved', 'ALL GROWN UP', 'EVOLVE A PET TO ITS FINAL FORM'], ['pen pal', 'PEN PAL', 'READ 10 LETTERS'], ['safari', 'WILDLIFE PHOTOGRAPHER', 'FINISH A PHOTO SAFARI PAGE']);
OUTFITS.push(['clockwork', 'CLOCKWORK', -1]);
COSTUME_LIST.push({ id: 'clockwork', name: 'CLOCKWORK', hint: 'CRAFT IT AT THE BENCH', ok: () => !!(game && game.outfits && game.outfits.includes('clockwork')) });
const backTo = (n) => () => MiniGamesScene(n);

// ---------------- mini golf ----------------
const GOLF = [
  { par: 2, ball: [40, 116], hole: [216, 116] },
  { par: 3, ball: [40, 60], hole: [216, 60], walls: [[120, 24, 12, 124]] },
  { par: 3, ball: [40, 180], hole: [216, 50], bumpers: [[128, 116, 10], [96, 80, 8], [160, 150, 8]] },
  { par: 3, ball: [32, 186], hole: [214, 40], walls: [[16, 24, 150, 118]] },
  { par: 2, ball: [40, 116], hole: [216, 116], walls: [[120, 24, 12, 184]], pipes: [[96, 116, 150, 116]] },
  { par: 3, ball: [40, 116], hole: [216, 116], grumbles: [[110, 60, 0, 1, 90], [170, 150, 0, -1, 90]] },
  { par: 4, ball: [34, 192], hole: [222, 192], walls: [[70, 24, 12, 134], [130, 74, 12, 134], [190, 24, 12, 134]] },
  { par: 3, ball: [40, 116], hole: [190, 116], bumpers: [[190, 88, 8], [216, 102, 8], [216, 130, 8], [190, 144, 8], [168, 144, 7], [168, 88, 7]] },
  { par: 4, ball: [40, 190], hole: [222, 40], walls: [[100, 60, 12, 148]], pipes: [[70, 40, 150, 192]], bumpers: [[196, 110, 9]], grumbles: [[160, 150, 1, 0, 30]] },
];
function GolfScene() {
  let h = 0, strokes = 0, total = 0, t = 0, ang = 0, pow = 0, pdir = 1, charging = false, msg = '', msgT = 0, done = false, sunk = 0, holeInOne = false;
  const card = [];
  let b = null;
  const reset = () => { const H = GOLF[h]; b = { x: H.ball[0], y: H.ball[1], vx: 0, vy: 0 }; strokes = 0; ang = Math.atan2(H.hole[1] - H.ball[1], H.hole[0] - H.ball[0]); sunk = 0; };
  reset();
  const grumbleRects = (H) => (H.grumbles || []).map(([x, y, dx, dy, rng]) => { const o = Math.sin(t * 0.03) * rng; return [x + dx * o - 6, y + dy * o - 6, 12, 12]; });
  const walls = (H) => [[0, 0, VW, 24], [0, 208, VW, 16], [0, 0, 16, VH], [240, 0, 16, VH]].concat(H.walls || [], grumbleRects(H));
  const moving = () => Math.hypot(b.vx, b.vy) > 0.04;
  return {
    enter() { Audio8.play('grass'); },
    update() {
      t++; if (msgT) msgT--;
      if (done) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(backTo(7)); return; }
      if (Input.pressed('back')) { go(backTo(7)); return; }
      const H = GOLF[h];
      if (sunk) { if (--sunk === 0) { card.push(strokes); total += strokes; h++; if (h >= GOLF.length) { done = true; t = 0; const par = GOLF.reduce((a, k) => a + k.par, 0), coins = Math.max(3, 30 - Math.max(0, total - par) * 3); payCoins(coins); this.coins = coins; Audio8.play('victory'); } else reset(); } return; }
      if (!moving()) {
        b.vx = 0; b.vy = 0;
        if (Input.down('left')) ang -= 0.04; if (Input.down('right')) ang += 0.04;
        if (Input.down('jump') || Input.down('run')) { charging = true; pow += pdir * 0.02; if (pow >= 1) { pow = 1; pdir = -1; } if (pow <= 0) { pow = 0; pdir = 1; } }
        else if (charging) { charging = false; strokes++; const s = 0.6 + pow * 6.2; b.vx = Math.cos(ang) * s; b.vy = Math.sin(ang) * s; pow = 0; pdir = 1; Audio8.sfx('kick'); }
        if (strokes >= 8 && !moving()) { msg = 'TOO MANY SHOTS - NEXT HOLE'; msgT = 90; strokes = 9; sunk = 60; }
        return;
      }
      for (let k = 0; k < 4; k++) {
        b.x += b.vx / 4; b.y += b.vy / 4;
        for (const [wx, wy, ww, wh] of walls(H)) {
          const cx = clamp(b.x, wx, wx + ww), cy = clamp(b.y, wy, wy + wh), dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
          if (d < 3 && d > 0) { const nx = dx / d, ny = dy / d; b.x = cx + nx * 3; b.y = cy + ny * 3; const dot = b.vx * nx + b.vy * ny; if (dot < 0) { b.vx -= 1.8 * dot * nx; b.vy -= 1.8 * dot * ny; Audio8.sfx('bump'); } }
          else if (d === 0) { b.x -= b.vx / 4; b.y -= b.vy / 4; b.vx = -b.vx * 0.8; b.vy = -b.vy * 0.8; }
        }
        for (const [bx, by, r] of H.bumpers || []) { const dx = b.x - bx, dy = b.y - by, d = Math.hypot(dx, dy); if (d < r + 3 && d > 0) { const nx = dx / d, ny = dy / d; b.x = bx + nx * (r + 3); b.y = by + ny * (r + 3); const s = Math.max(2.2, Math.hypot(b.vx, b.vy)); b.vx = nx * s; b.vy = ny * s; Audio8.sfx('spring'); } }
        for (const [ax, ay, ex, ey] of H.pipes || []) if (Math.hypot(b.x - ax, b.y - ay) < 6) { b.x = ex + Math.sign(b.vx || 1) * 8; b.y = ey; Audio8.sfx('swoop'); }
      }
      b.vx *= 0.982; b.vy *= 0.982;
      const hd = Math.hypot(b.x - H.hole[0], b.y - H.hole[1]), sp = Math.hypot(b.vx, b.vy);
      if (hd < 5 && sp < 3.4) { sunk = 70; b.x = H.hole[0]; b.y = H.hole[1]; b.vx = b.vy = 0; Audio8.sfx('coin'); if (strokes === 1) { holeInOne = true; Ach.unlock('golfer'); msg = 'HOLE IN ONE!!'; } else msg = strokes <= H.par - 1 ? 'BIRDIE!' : strokes === H.par ? 'PAR!' : 'IN THE HOLE!'; msgT = 70; }
    },
    draw() {
      ctx.fillStyle = '#2a7a30'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#3a9a40'; ctx.fillRect(16, 24, 224, 184);
      ctx.fillStyle = '#44a84a'; for (let y = 24; y < 208; y += 16) ctx.fillRect(16, y, 224, 8);
      if (done) { drawWindow(40, 40, 176, 140); txt('ROUND OVER!', 128, 48, '#ffe040', { align: 'center', scale: 2 }); card.forEach((s, i) => { txt(`HOLE ${i + 1}`, 64, 74 + i * 10, '#fff'); txt(`${s > 8 ? 'X' : s}  (PAR ${GOLF[i].par})`, 196, 74 + i * 10, s <= GOLF[i].par ? '#5ae060' : '#fff', { align: 'right' }); }); txt(`TOTAL ${total}  +${this.coins} COINS`, 128, 170, '#5ff0ff', { align: 'center' }); return; }
      const H = GOLF[h];
      for (const [wx, wy, ww, wh] of (H.walls || [])) { hR(wx, wy, ww, wh, '#6a4020'); hR(wx, wy, ww, 2, '#9a6030'); }
      for (const r of grumbleRects(H)) ctx.drawImage(Sprites.grumble[(t >> 3) & 1], r[0] - 1, r[1] - 2);
      for (const [bx, by, r] of H.bumpers || []) { ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff5080'; ctx.beginPath(); ctx.arc(bx, by, r - 2, 0, Math.PI * 2); ctx.fill(); hR(bx - 2, by - r + 3, 3, 3, '#ffc0d0'); }
      for (const [ax, ay, ex, ey] of H.pipes || []) for (const [px, py] of [[ax, ay], [ex, ey]]) { hR(px - 7, py - 7, 14, 14, '#1a1020'); hR(px - 6, py - 6, 12, 12, '#30b040'); hR(px - 3, py - 3, 6, 6, '#0a3a10'); }
      ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(H.hole[0], H.hole[1], 5, 0, Math.PI * 2); ctx.fill(); hR(H.hole[0], H.hole[1] - 22, 1, 22, '#fff'); hR(H.hole[0] + 1, H.hole[1] - 22, 8, 5, '#ff3040');
      if (!moving() && !sunk) { for (let k = 1; k < 7; k++) hR(b.x + Math.cos(ang) * k * 6 - 1, b.y + Math.sin(ang) * k * 6 - 1, 2, 2, k % 2 ? '#fff' : '#ffe040'); }
      if (!sunk || sunk > 40) { hR(b.x - 3, b.y - 3, 6, 6, '#1a1020'); hR(b.x - 2, b.y - 2, 4, 4, '#ffffff'); }
      hR(0, 0, VW, 22, 'rgba(16,24,72,0.85)'); txt(`HOLE ${h + 1}/9  PAR ${H.par}  SHOTS ${Math.min(strokes, 8)}`, 8, 7, '#ffe040');
      hR(170, 6, 78, 10, '#1a1020'); hR(171, 7, Math.round(76 * pow), 8, pow > 0.8 ? '#ff5040' : '#5ae060'); txt('POWER', 190, 8, '#fff', { shadow: null });
      txt(msgT ? msg : '< > AIM   HOLD A: POWER', 128, 212, msgT ? '#ffe040' : '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------------- pinball ----------------
function PinballScene() {
  const segs = [[48, 8, 48, 168], [48, 168, 96, 198], [208, 8, 208, 224], [196, 64, 196, 168], [196, 168, 196, 224], [196, 168, 160, 198], [48, 34, 72, 10], [72, 10, 186, 10], [186, 10, 208, 32]];
  const bumpers = [[100, 66, 12, 'boss'], [156, 66, 12, 'megabot'], [128, 104, 12, 'thunderhead'], [82, 132, 9, 'serpent'], [174, 132, 9, 'clockmaker']];
  const L = { px: 96, py: 198, rest: 0.5, up: -0.45, a: 0.5, w: 0 }, R = { px: 160, py: 198, rest: Math.PI - 0.5, up: Math.PI + 0.45, a: Math.PI - 0.5, w: 0 };
  let ball = { x: 202, y: 200, vx: 0, vy: 0 }, balls = 3, score = 0, t = 0, charge = 0, inLane = true, lostT = 0, done = false, hit = [];
  const tip = (f) => [f.px + Math.cos(f.a) * 26, f.py + Math.sin(f.a) * 26];
  function collideSeg(ax, ay, bx, by, e, flip) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, u = clamp(((ball.x - ax) * dx + (ball.y - ay) * dy) / l2, 0, 1), cx = ax + dx * u, cy = ay + dy * u, ox = ball.x - cx, oy = ball.y - cy, d = Math.hypot(ox, oy);
    if (d >= 3.5 || d === 0) return false;
    const nx = ox / d, ny = oy / d; ball.x = cx + nx * 3.5; ball.y = cy + ny * 3.5;
    const dot = ball.vx * nx + ball.vy * ny; if (dot < 0) { ball.vx -= (1 + e) * dot * nx; ball.vy -= (1 + e) * dot * ny; }
    if (flip && Math.abs(flip.w) > 0.01) { const r = Math.hypot(cx - flip.px, cy - flip.py), kick = Math.abs(flip.w) * r * 0.9; ball.vx += nx * kick; ball.vy += ny * kick; }
    return true;
  }
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (done) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(backTo(8)); return; }
      if (Input.pressed('back')) { go(backTo(8)); return; }
      for (const [f, key, sgn] of [[L, 'left', 1], [R, 'right', -1]]) { const want = Input.down(key) || (key === 'right' && Input.down('jump') && !inLane) ? f.up : f.rest, old = f.a; f.a += clamp(want - f.a, -0.32, 0.32); f.w = f.a - old; if (Math.abs(f.w) > 0.2 && sgn) Audio8.sfx('select'); }
      if (lostT) { if (--lostT === 0) { if (balls <= 0) { done = true; t = 0; const coins = Math.floor(score / 500); payCoins(coins); this.coins = coins; if (score >= 5000) Ach.unlock('pinball'); Audio8.play('victory'); } else { ball = { x: 202, y: 200, vx: 0, vy: 0 }; inLane = true; } } return; }
      if (inLane) {
        if (Input.down('jump') || Input.down('run')) charge = Math.min(1, charge + 0.025);
        else if (charge > 0) { ball.vy = -(5 + charge * 4.5); charge = 0; inLane = false; Audio8.sfx('spring'); }
        if (inLane) return;
      }
      for (let k = 0; k < 5; k++) {
        ball.vy += 0.024; ball.x += ball.vx / 5; ball.y += ball.vy / 5;
        for (const s of segs) collideSeg(s[0], s[1], s[2], s[3], 0.45);
        for (const f of [L, R]) { const [tx, ty] = tip(f); collideSeg(f.px, f.py, tx, ty, 0.3, f); }
        for (const bm of bumpers) { const dx = ball.x - bm[0], dy = ball.y - bm[1], d = Math.hypot(dx, dy); if (d < bm[2] + 3.5 && d > 0) { const nx = dx / d, ny = dy / d; ball.x = bm[0] + nx * (bm[2] + 3.6); ball.y = bm[1] + ny * (bm[2] + 3.6); ball.vx = nx * 5; ball.vy = ny * 5; score += 100; hit.push([bm, 10]); Audio8.sfx('bosshit'); } }
      }
      const sp = Math.hypot(ball.vx, ball.vy); if (sp > 9) { ball.vx *= 9 / sp; ball.vy *= 9 / sp; }
      if (ball.x > 196 && ball.y > 60 && ball.vy > 0 && ball.y > 200) { ball.y = 200; ball.vy = 0; ball.vx = 0; ball.x = 202; inLane = true; }
      if (ball.y > 230) { balls--; lostT = 60; Audio8.sfx('hurt'); }
      hit = hit.filter((k) => --k[1] > 0);
    },
    draw() {
      ctx.fillStyle = '#100820'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#2a1a5a'; ctx.fillRect(48, 10, 160, 214);
      for (let y = 20; y < 220; y += 24) for (let x = 56; x < 196; x += 24) hR(x, y, 2, 2, '#4a3a8a');
      ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 2; for (const s of segs) { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
      for (const bm of bumpers) { const lit = hit.some((k) => k[0] === bm); ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(bm[0], bm[1], bm[2] + 1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = lit ? '#ffffff' : '#ff4a9a'; ctx.beginPath(); ctx.arc(bm[0], bm[1], bm[2], 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2a1030'; ctx.beginPath(); ctx.arc(bm[0], bm[1], bm[2] - 2, 0, Math.PI * 2); ctx.fill(); ctx.save(); ctx.beginPath(); ctx.arc(bm[0], bm[1], bm[2] - 2, 0, Math.PI * 2); ctx.clip(); ctx.translate(bm[0], bm[1]); ctx.scale(0.6, 0.6); stickerArt(bm[3], 0, 0, t); ctx.restore(); }
      ctx.lineWidth = 5; ctx.strokeStyle = '#1a1020'; for (const f of [L, R]) { const [tx, ty] = tip(f); ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke(); } ctx.lineWidth = 3; ctx.strokeStyle = '#ff6040'; for (const f of [L, R]) { const [tx, ty] = tip(f); ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke(); } ctx.lineWidth = 1;
      hR(198, 204 + charge * 12, 8, 20, '#c0c8d8'); if (!lostT && !done) { hR(Math.round(ball.x) - 3, Math.round(ball.y) - 3, 7, 7, '#1a1020'); hR(Math.round(ball.x) - 2, Math.round(ball.y) - 2, 5, 5, '#e8eef8'); hR(Math.round(ball.x) - 1, Math.round(ball.y) - 2, 2, 2, '#ffffff'); }
      txt('WALLY', 24, 30, '#ffe040', { align: 'center' }); txt('PINBALL', 24, 40, '#ffe040', { align: 'center' }); txt('SCORE', 24, 70, '#fff', { align: 'center' }); txt(String(score), 24, 80, '#5ff0ff', { align: 'center' }); txt('BALLS', 24, 110, '#fff', { align: 'center' }); txt(String(Math.max(0, balls)), 24, 120, '#ff8080', { align: 'center' });
      txt('< >', 232, 150, '#fff', { align: 'center' }); txt('FLIP', 232, 160, '#a8b0d8', { align: 'center' }); txt('HOLD', 232, 190, '#fff', { align: 'center' }); txt('A', 232, 200, '#a8b0d8', { align: 'center' });
      if (done) { drawWindow(56, 70, 144, 70); txt('GAME OVER', 128, 78, '#ffe040', { align: 'center', scale: 2 }); txt(`SCORE ${score}`, 128, 102, '#fff', { align: 'center' }); txt(`+${this.coins || 0} COINS`, 128, 116, '#5ff0ff', { align: 'center' }); }
      else if (inLane && !lostT) txt('HOLD A TO LAUNCH', 128, 214, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------------- Professor Hoot's quiz ----------------
const QUIZ = [
  ['HOW MANY COINS GIVE AN EXTRA LIFE?', '100', '50', '25', '1000'], ['WHO GUARDS ORBIT ONE?', 'MEGA-BOT', 'VOLT', 'THE CLOCKMAKER', 'NIMBUS'],
  ['WHO RULES STORM PEAKS?', 'KING THUNDERHEAD', 'BARON STATIC', 'CAPTAIN GLOOMBEARD', 'MEGA-BOT'], ['WHO RULES THE UNDERWATER KINGDOM?', 'SERPENTINA', 'KING KRABBY', 'DJ DECIBEL', 'THE T-REX'],
  ["WHAT IS GOTHCHICK'S PET?", 'A BAT', 'A CAT', 'A PENGUIN', 'A DRONE'], ["WHAT IS DOUG'S PET?", 'A CAT', 'A BAT', 'A PUP', 'A FOX'], ["WHAT IS FROST QUEEN'S PET?", 'A PENGUIN', 'A PARROT', 'A CAT', 'A BAT'],
  ['WHAT DOES GOTHCHICK DO WHEN YOU HOLD JUMP IN THE AIR?', 'GLIDES', 'HOVERS ON JETS', 'DASHES', 'SWIMS'], ["WHAT IS WALLYMAN'S SPECIAL?", 'SIGNAL SHOCKWAVE', 'BAT SWARM', 'DEEP FREEZE', 'SHADOW DASH'],
  ['WHAT DOES AN ENERGY DRINK GIVE YOU?', '+1 HEART', '+1 LIFE', 'A JETPACK', '10 COINS'], ['WHAT DO JET BOOTS LET YOU DO?', 'DOUBLE JUMP', 'SWIM FASTER', 'FLY FOREVER', 'CLIMB WALLS'],
  ['HOW DO YOU USE YOUR RESERVE ITEM?', 'HOLD UP + PRESS S', 'PRESS START', 'JUMP TWICE', 'CROUCH'], ['WHAT REFILLS YOUR AIR UNDERWATER?', 'BUBBLE STREAMS', 'CLAMS', 'CURRENTS', 'COINS'],
  ['WHO CAPTAINS PIRATE COVE?', 'CAPTAIN GLOOMBEARD', 'CAPTAIN WALLY', 'BARON STATIC', 'SERPENTINA'], ['WHICH OF THESE IS A REAL BOSS?', 'DJ DECIBEL', 'MC MICROPHONE', 'DJ DINO', 'LORD LOUD'],
  ['WHO MADE WALLYMAN WORLD?', 'CLAUDE AND DOUG', 'BARON STATIC', 'PROFESSOR HOOT', 'DINO'], ['WHAT HELPS YOU WHEN YOU LOSE 3 LIVES IN A LEVEL?', 'PROFESSOR HOOT', 'NINJA NELL', 'THE CLOCKMAKER', 'MEGA-BOT'],
  ['WHERE DO YOU STOMP THE CLOCKMAKER?', 'WHEN HE WINDS HIS KEY', 'ON HIS CLOCK FACE', 'IN THE AIR', 'NEVER'], ['WHAT DOES A LIGHTNING ROD DO IN STORM PEAKS?', 'POWERS A PLATFORM', 'HURTS ALL FOES', 'OPENS A DOOR', 'GIVES A LIFE'],
  ['HOW DOES NINJA NELL HIDE FROM SEARCHLIGHTS?', 'BY CROUCHING', 'BY JUMPING', 'BY RUNNING', 'SHE CANNOT'], ['WHAT IS THE ICE BEAST CALLED?', 'THE ICE YETI', 'THE SNOW GOLEM', 'FROSTY', 'THE ICE DRAGON'],
];
function QuizScene() {
  let s = Date.now() % 9973; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const pool = QUIZ.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const qs = pool.slice(0, 10).map((q) => { const opts = q.slice(1).map((a, i) => [a, i === 0]); for (let i = 3; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; } return { q: q[0], opts }; });
  let n = 0, sel = 0, right = 0, t = 0, answered = -1, ansT = 0, done = false;
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (done) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(backTo(9)); return; }
      if (Input.pressed('back')) { go(backTo(9)); return; }
      if (answered >= 0) { if (--ansT <= 0) { answered = -1; n++; sel = 0; if (n >= qs.length) { done = true; t = 0; payCoins(right * 2); if (right === 10) Ach.unlock('quizwhiz'); Audio8.play(right >= 6 ? 'victory' : 'gameover'); } } return; }
      if (Input.pressed('down')) { sel = (sel + 1) % 4; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + 3) % 4; Audio8.sfx('select'); }
      if (Input.confirm()) { answered = sel; ansT = 70; if (qs[n].opts[sel][1]) { right++; Audio8.sfx('coin'); } else Audio8.sfx('bump'); }
    },
    draw() {
      drawParallax('castle', t * 0.2);
      // Professor Hoot at his desk
      hR(16, 150, 70, 8, '#6a4020'); hR(22, 158, 6, 40, '#4a2a10'); hR(74, 158, 6, 40, '#4a2a10');
      ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(50, 128, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a6a40'; ctx.beginPath(); ctx.arc(50, 128, 15, 0, Math.PI * 2); ctx.fill();
      for (const ex of [43, 57]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, 124, 5, 0, Math.PI * 2); ctx.fill(); hR(ex - 1, 123 + ((t >> 5) & 1), 3, 3, '#1a1020'); }
      hR(48, 129, 4, 4, '#ffb020'); hR(36, 110, 6, 6, '#8a6a40'); hR(58, 110, 6, 6, '#8a6a40'); hR(40, 104, 20, 4, '#1a1020'); hR(46, 98, 8, 6, '#1a1020');
      if (done) { drawWindow(96, 50, 150, 100); txt('QUIZ OVER!', 171, 58, '#ffe040', { align: 'center', scale: 2 }); txt(`${right} OUT OF 10`, 171, 86, '#fff', { align: 'center' }); txt(`+${right * 2} COINS`, 171, 100, '#5ff0ff', { align: 'center' }); txt(right === 10 ? 'HOO HOO! A GENIUS!' : right >= 6 ? 'HOO! WELL DONE!' : 'HOO... STUDY HARDER!', 171, 120, '#a8b0d8', { align: 'center' }); return; }
      const Q = qs[n]; drawWindow(8, 8, 240, 52); txt(`QUESTION ${n + 1}/10   RIGHT ${right}`, 128, 13, '#ffe040', { align: 'center' });
      wrapText(Q.q, 38).forEach((l, i) => txt(l, 128, 28 + i * 10, '#fff', { align: 'center' }));
      drawWindow(96, 66, 152, 84);
      Q.opts.forEach(([a, ok], i) => { const y = 74 + i * 18; let c = i === sel ? '#ffe040' : '#fff'; if (answered >= 0) c = ok ? '#5ae060' : i === answered ? '#ff6060' : '#7880b0'; txt(a.length > 22 ? a.slice(0, 22) : a, 116, y, c); if (i === sel && answered < 0) txt('>', 106 + ((t >> 3) & 1), y, '#ffe040'); });
      if (answered >= 0) txt(Q.opts[answered][1] ? 'CORRECT! HOO HOO!' : 'NOT QUITE...', 171, 158, Q.opts[answered][1] ? '#5ae060' : '#ff8080', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------------- Garden Defence ----------------
function DefenceScene() {
  const LANES = [124, 154, 184];
  let lane = 1, t = 0, wave = 0, toSpawn = 0, spawnT = 60, foes = [], shots = [], cool = 0, garden = 3, kills = 0, done = false, won = false, msg = 'WAVE 1', msgT = 90;
  const startWave = () => { wave++; toSpawn = 5 + wave * 3; spawnT = 80; msg = 'WAVE ' + wave; msgT = 90; };
  startWave();
  return {
    enter() { Audio8.play('grass'); },
    update() {
      t++; if (msgT) msgT--;
      if (done) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(backTo(10)); return; }
      if (Input.pressed('back')) { go(backTo(10)); return; }
      if (Input.pressed('up')) { lane = Math.max(0, lane - 1); Audio8.sfx('select'); } if (Input.pressed('down')) { lane = Math.min(2, lane + 1); Audio8.sfx('select'); }
      if (cool > 0) cool--;
      if ((Input.pressed('jump') || Input.pressed('run')) && !cool) { shots.push({ x: 58, lane }); cool = 16; Audio8.sfx('cannon'); }
      if (toSpawn > 0 && --spawnT <= 0) { toSpawn--; spawnT = Math.max(24, 70 - wave * 8) + Math.floor(Math.random() * 30); const tough = wave >= 2 && Math.random() < 0.25 + wave * 0.05; foes.push({ x: 262, lane: Math.floor(Math.random() * 3), hp: tough ? 2 : 1, tough, sp: 0.35 + wave * 0.08 + Math.random() * 0.15 }); }
      for (const s of shots) s.x += 4;
      for (const f of foes) { f.x -= f.sp; for (const s of shots) if (!s.hit && s.lane === f.lane && Math.abs(s.x - f.x) < 10) { s.hit = true; f.hp--; Audio8.sfx(f.hp > 0 ? 'bump' : 'stomp'); if (f.hp <= 0) kills++; } if (f.x < 28 && f.hp > 0) { f.hp = 0; f.ate = true; garden--; Audio8.sfx('chomp'); rumble(0.4, 150); } }
      shots = shots.filter((s) => !s.hit && s.x < VW + 10); foes = foes.filter((f) => f.hp > 0);
      if (garden <= 0) { done = true; won = false; t = 0; const c = Math.floor(kills / 2); payCoins(c); this.coins = c; Audio8.play('gameover'); return; }
      if (!toSpawn && !foes.length) { if (wave >= 5) { done = true; won = true; t = 0; const c = Math.floor(kills / 2) + 15; payCoins(c); this.coins = c; Ach.unlock('defender'); Audio8.play('victory'); } else startWave(); }
    },
    draw() {
      drawParallax('grass', t * 0.2); hR(0, 104, VW, 120, '#5a9a3a'); for (const y of LANES) hR(0, y + 12, VW, 2, '#4a8a2a');
      hR(0, 104, 30, 120, '#7a4a20'); for (let i = 0; i < 6; i++) { const y = 112 + i * 18; hR(8, y, 2, 8, '#2a9a30'); hR(12, y - 2, 6, 6, i % 2 ? '#ff8a20' : '#ff3030'); }
      for (let i = 0; i < 3; i++) hR(4 + i * 10, 96, 8, 6, i < garden ? '#ff5060' : '#3a2030');
      drawWally(46, LANES[lane] + 12, cool > 8 ? 'throw' : 'idle' + ((t >> 4) % 4), 1);
      for (const s of shots) { hR(s.x - 3, LANES[s.lane] + 2, 6, 6, '#1a1020'); hR(s.x - 2, LANES[s.lane] + 3, 4, 4, '#5a5a6a'); }
      for (const f of foes) { const img = f.tough ? Sprites.prickle.r[(t >> 3) & 1] : Sprites.grumble[(t >> 3) & 1]; ctx.save(); ctx.translate(Math.round(f.x) + 7, 0); ctx.scale(-1, 1); ctx.drawImage(img, -7, LANES[f.lane] - 2); ctx.restore(); }
      drawWindow(4, 4, 248, 20); txt(`GARDEN DEFENCE   WAVE ${wave}/5   KO ${kills}`, 10, 10, '#ffe040');
      if (msgT && !done) txt(msg, 128, 60, '#fff', { align: 'center', scale: 2, outline: '#101848' });
      if (t < 200 && wave === 1) txt('UP/DOWN: LANE   A: THROW', 128, 84, '#fff', { align: 'center', outline: '#101848' });
      if (done) { drawWindow(48, 50, 160, 70); txt(won ? 'GARDEN SAVED!' : 'THEY ATE IT ALL!', 128, 58, won ? '#ffe040' : '#ff8080', { align: 'center', scale: 2 }); txt(`+${this.coins || 0} COINS`, 128, 90, '#5ff0ff', { align: 'center' }); }
    },
  };
}

// ---------------- Dino's Kitchen ----------------
const VEG = ['carrot', 'tomato', 'pumpkin'];
const RECIPES = [
  { id: 'cake', name: 'CARROT CAKE', need: { carrot: 2 }, tip: 'START THE NEXT LEVEL WITH +1 HEART', apply: (pl) => { pl.p.hearts = Math.min(3, pl.p.hearts + 1); } },
  { id: 'soup', name: 'TOMATO SOUP', need: { tomato: 2 }, tip: 'START THE NEXT LEVEL WITH A SHIELD', apply: (pl) => { pl.p.shield = true; } },
  { id: 'pie', name: 'PUMPKIN PIE', need: { pumpkin: 1, carrot: 1 }, tip: 'A COIN MAGNET FOR 30 SECONDS', apply: (pl) => { pl.p.magnet = 1800; } },
  { id: 'stew', name: 'VEGGIE STEW', need: { carrot: 1, tomato: 1, pumpkin: 1 }, tip: '+3 CANNONBALLS AND +3 SPECIALS', apply: (pl) => { pl.p.ammo += 3; pl.p.special += 3; } },
  { id: 'salsa', name: 'ROCKET SALSA', need: { tomato: 2, pumpkin: 1 }, tip: 'START THE NEXT LEVEL WITH A JETPACK', apply: (pl) => { pl.p.jet = 300; } },
];
const MARKET = [['carrot', 4], ['tomato', 5], ['pumpkin', 7]];
const has = (need) => Object.keys(need).every((k) => ((game.pantry || {})[k] | 0) >= need[k]);
function KitchenScene() {
  let sel = 0, t = 0, msg = '', msgT = 0; game.pantry = game.pantry || {};
  const rows = RECIPES.length + MARKET.length + 1;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (msgT) msgT--;
      if (Input.pressed('down')) { sel = (sel + 1) % rows; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + rows - 1) % rows; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.pressed('run') || (Input.confirm() && sel === rows - 1)) { Save.persist(); go(() => HouseScene(12)); return; }
      if (!Input.confirm()) return;
      if (sel < RECIPES.length) {
        const R = RECIPES[sel]; if (game.snack) { msg = 'EAT YOUR ' + RECIPES.find((k) => k.id === game.snack).name + ' FIRST!'; msgT = 120; Audio8.sfx('bump'); return; }
        if (!has(R.need)) { msg = 'NOT ENOUGH INGREDIENTS'; msgT = 120; Audio8.sfx('bump'); return; }
        for (const k of Object.keys(R.need)) game.pantry[k] -= R.need[k];
        game.snack = R.id; Ach.unlock('chef'); Audio8.sfx('oneup'); msg = R.name + ' READY FOR THE NEXT LEVEL!'; msgT = 150; Save.persist(); return;
      }
      const [v, price] = MARKET[sel - RECIPES.length]; if (game.coins < price) { msg = 'NOT ENOUGH COINS!'; msgT = 100; Audio8.sfx('bump'); return; }
      game.coins -= price; game.pantry[v] = (game.pantry[v] | 0) + 1; Audio8.sfx('coin'); msg = 'BOUGHT A ' + SEEDS[v].name + '!'; msgT = 80; Save.persist();
    },
    draw() {
      ctx.fillStyle = '#f0d8a8'; ctx.fillRect(0, 0, VW, VH); for (let x = 0; x < VW; x += 16) for (let y = 0; y < 80; y += 16) if (((x + y) >> 4) & 1) hR(x, y, 16, 16, '#e8c890');
      hR(170, 30, 70, 50, '#5a5a6a'); hR(174, 34, 62, 30, '#1a1020'); hR(178, 40, 12, 4, (t >> 3) & 1 ? '#ff6020' : '#ffa040'); hR(200, 40, 12, 4, (t >> 4) & 1 ? '#ff6020' : '#ffa040'); hR(192, 18, 26, 14, '#8a8a9a');
      ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 210, 92);
      drawWindow(8, 8, 150, 22); txt("DINO'S KITCHEN", 83, 15, '#ffe040', { align: 'center' });
      VEG.forEach((v, i) => { hR(10 + i * 50, 36, 8, 8, SEEDS[v].col); txt('*' + ((game.pantry[v] | 0)), 20 + i * 50, 36, '#3a2010', { shadow: null }); });
      ctx.drawImage(Sprites.coinIcon, 170, 84); txt('*' + pad(game.coins, 2), 177, 84, '#3a2010', { shadow: null });
      drawWindow(8, 50, 160, 22 + rows * 13);
      RECIPES.forEach((R, i) => { const y = 56 + i * 13, ok = has(R.need); txt(R.name, 24, y, i === sel ? '#ffe040' : ok ? '#fff' : '#7880b0'); });
      MARKET.forEach(([v, p], i) => { const y = 56 + (RECIPES.length + i) * 13; txt(`BUY ${SEEDS[v].name} (${p})`, 24, y, RECIPES.length + i === sel ? '#ffe040' : '#a8d8a8'); });
      txt('BACK', 24, 56 + (rows - 1) * 13, sel === rows - 1 ? '#ffe040' : '#fff'); txt('>', 14 + ((t >> 3) & 1), 56 + sel * 13, '#ffe040');
      drawWindow(8, 184, 240, 36);
      if (msgT) txt(msg, 128, 190, '#ffe040', { align: 'center' });
      else if (sel < RECIPES.length) { const R = RECIPES[sel]; txt(R.tip, 128, 190, '#fff', { align: 'center' }); txt('NEEDS ' + Object.keys(R.need).map((k) => R.need[k] + ' ' + SEEDS[k].name).join(' + '), 128, 202, '#a8b0d8', { align: 'center' }); }
      else txt(game.snack ? 'READY TO EAT: ' + RECIPES.find((k) => k.id === game.snack).name : 'GROW VEG IN THE GARDEN OR BUY IT HERE', 128, 196, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- crafting: parts found in levels, made into things at the bench ----------------
const PARTS = { gear: ['GEAR', '#d0a040'], spring: ['SPRING', '#c0c8d8'], cloth: ['CLOTH', '#e05090'], crystal: ['CRYSTAL', '#5ff0ff'] };
const CRAFTS = [
  { name: 'JETPACK', need: { gear: 2, spring: 1 }, tip: 'GOES IN YOUR RESERVE BOX (UP + S)', make: () => putReserve('jetpack') },
  { name: 'TIME CLOCK', need: { gear: 2, crystal: 1 }, tip: 'GOES IN YOUR RESERVE BOX (UP + S)', make: () => putReserve('tclock') },
  { name: 'BUBBLE SHIELD', need: { cloth: 1, crystal: 1 }, tip: 'GOES IN YOUR RESERVE BOX (UP + S)', make: () => putReserve('shield') },
  { name: 'CLOCKWORK OUTFIT', need: { gear: 3, cloth: 2, spring: 1 }, tip: 'A NEW OUTFIT FOR THE WARDROBE', make: () => { game.outfits = game.outfits || []; if (game.outfits.includes('clockwork')) return 'YOU ALREADY HAVE IT!'; game.outfits.push('clockwork'); return ''; } },
];
function putReserve(type) { if (game.reserve) return 'YOUR RESERVE BOX IS FULL!'; game.reserve = type; return ''; }
const hasParts = (need) => Object.keys(need).every((k) => ((game.parts || {})[k] | 0) >= need[k]);
function drawPart(kind, x, y) {
  const c = PARTS[kind][1];
  if (kind === 'gear') { drawGearShape(x + 6, y + 6, 5, frame * 0.05, c, '#1a1020'); return; }
  if (kind === 'spring') { for (let i = 0; i < 4; i++) { hR(x + 1, y + 1 + i * 3, 10, 2, '#1a1020'); hR(x + 2, y + 1 + i * 3, 8, 1, c); } return; }
  if (kind === 'cloth') { hR(x, y + 2, 12, 9, '#1a1020'); hR(x + 1, y + 3, 10, 7, c); hR(x + 3, y + 5, 2, 2, '#ffffff'); return; }
  hR(x + 4, y, 4, 12, '#1a1020'); hR(x + 2, y + 3, 8, 6, '#1a1020'); hR(x + 5, y + 1, 2, 10, c); hR(x + 3, y + 4, 6, 4, c); hR(x + 5, y + 2, 1, 2, '#ffffff');
}
function BenchScene() {
  let sel = 0, t = 0, msg = '', msgT = 0; game.parts = game.parts || {};
  return {
    enter() { Audio8.play('factory'); },
    update() {
      t++; if (msgT) msgT--; const rows = CRAFTS.length + 1;
      if (Input.pressed('down')) { sel = (sel + 1) % rows; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + rows - 1) % rows; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.pressed('run') || (Input.confirm() && sel === CRAFTS.length)) { go(() => HouseScene(13)); return; }
      if (!Input.confirm()) return;
      const C = CRAFTS[sel]; if (!hasParts(C.need)) { msg = 'NOT ENOUGH PARTS - FIND MORE IN LEVELS'; msgT = 120; Audio8.sfx('bump'); return; }
      const err = C.make(); if (err) { msg = err; msgT = 120; Audio8.sfx('bump'); return; }
      for (const k of Object.keys(C.need)) game.parts[k] -= C.need[k];
      Ach.unlock('crafter'); Audio8.sfx('secret'); msg = 'YOU MADE A ' + C.name + '!'; msgT = 150; Save.persist();
    },
    draw() {
      drawParallax('factory', t * 0.2); drawWindow(8, 8, 240, 22); txt('CRAFTING BENCH', 128, 15, '#ffe040', { align: 'center' });
      drawWindow(8, 34, 240, 30); Object.keys(PARTS).forEach((k, i) => drawPart(k, 18 + i * 58, 42));
      Object.keys(PARTS).forEach((k, i) => txt(`*${game.parts[k] | 0}`, 34 + i * 58, 44, '#fff'));
      drawWindow(8, 68, 240, 22 + (CRAFTS.length + 1) * 16);
      CRAFTS.forEach((C, i) => { const y = 76 + i * 16, ok = hasParts(C.need); txt(C.name, 24, y, i === sel ? '#ffe040' : ok ? '#fff' : '#7880b0'); let x = 150; for (const k of Object.keys(C.need)) { drawPart(k, x, y - 3); txt('' + C.need[k], x + 13, y, '#fff'); x += 26; } });
      txt('BACK', 24, 76 + CRAFTS.length * 16, sel === CRAFTS.length ? '#ffe040' : '#fff'); txt('>', 14 + ((t >> 3) & 1), 76 + sel * 16, '#ffe040');
      drawWindow(8, 184, 240, 36); txt(msgT ? msg : sel < CRAFTS.length ? CRAFTS[sel].tip : 'PARTS TURN UP IN MOST LEVELS', 128, 196, msgT ? '#ffe040' : '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- pet evolution ----------------
PET_TRICKS.push('ZAPS A NEARBY FOE EVERY 8 SECONDS');
const petStage = (k) => { const xp = ((game && game.petXP) || {})[k] | 0; return xp >= 30 ? 5 : petLevel(k); };
function drawPetLook(stage, x, y, t) { // the bits a pet grows as it levels up
  if (stage >= 2) { hR(x + 3, y + 7, 6, 2, '#1a1020'); hR(x + 4, y + 7, 4, 1, '#ff3040'); }
  if (stage >= 3) { hR(x + 4, y - 3, 4, 2, '#1a1020'); hR(x + 5, y - 3, 2, 1, '#5ff0ff'); }
  if (stage >= 4) { hR(x + 2, y - 5, 8, 3, '#1a1020'); hR(x + 3, y - 4, 6, 1, '#ffd040'); hR(x + 3, y - 6, 1, 2, '#ffd040'); hR(x + 6, y - 7, 1, 2, '#ffd040'); hR(x + 8, y - 6, 1, 2, '#ffd040'); }
  if (stage >= 5) { const a = t * 0.1; for (let i = 0; i < 3; i++) hR(x + 6 + Math.cos(a + i * 2.1) * 9, y + 4 + Math.sin(a + i * 2.1) * 6, 2, 2, i ? '#ffe040' : '#ffffff'); }
}
{
  const _dh = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _dh.call(this);
    const q = this.pet; if (!q || q.down || this.state === 'dying') return;
    const st = petStage(q.kind); if (st < 2) return;
    const pd = PETS[q.kind] || PETS.wally; drawPetLook(st, Math.round(q.x - Math.round(this.cam.x)), Math.round(q.y + (pd.fly ? 0 : -((frame >> 3) & 1))), frame);
    if (q.zapT > 0) { q.zapT--; ctx.strokeStyle = '#ffe040'; ctx.beginPath(); ctx.moveTo(q.x - this.cam.x + 6, q.y + 4); ctx.lineTo(q.zx - this.cam.x, q.zy); ctx.stroke(); }
  };
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    _upd.call(this);
    const q = this.pet; if (!q || q.down || this.paused || this.talk || this.state !== 'play') return;
    if (petStage(q.kind) === 5 && (this.hF || 0) % 480 === 240) {
      let best = null, bd = 110; for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss) { const d = Math.hypot(e.x - q.x, e.y - q.y); if (d < bd) { bd = d; best = e; } }
      if (best) { q.zapT = 12; q.zx = best.x + best.w / 2; q.zy = best.y + best.h / 2; this.flipKill(best); Audio8.sfx('zap'); }
    }
  };
  const _cl = Play.prototype.clear;
  Play.prototype.clear = function (s) { const was = this.state; _cl.call(this, s); if (was === 'play' && this.state === 'clear' && this.pet && petStage(this.pet.kind) === 5) Ach.unlock('evolved'); };
}
function PetScene() { // eslint-disable-line no-func-assign
  let t = 0;
  return {
    enter() { Audio8.play('map'); },
    update() { t++; if (Input.pressed('back') || Input.pressed('run') || Input.confirm()) go(() => HouseScene(4)); },
    draw() {
      ctx.fillStyle = '#f0e0b0'; ctx.fillRect(0, 0, VW, VH); drawWindow(8, 6, 240, 210); txt('PETS AND TRICKS', 128, 12, '#ffe040', { align: 'center' });
      const k = game.petKind || heroOf(), pd = PETS[k] || PETS.wally, st = petStage(k), xp = ((game.petXP || {})[k]) | 0, need = [0, 4, 10, 18, 30, 30][st];
      ctx.save(); ctx.translate(36, 36); ctx.scale(3, 3); ctx.drawImage(pd.img[0], 0, (t >> 4) & 1); drawPetLook(st, 0, (t >> 4) & 1, t); ctx.restore();
      txt(pd.name, 120, 32, '#fff'); txt(st >= 5 ? 'EVOLVED!' : `LEVEL ${st}`, 120, 44, '#ffe040'); hR(120, 56, 110, 6, '#1a1020'); hR(121, 57, Math.round(108 * (st >= 5 ? 1 : Math.min(1, xp / need))), 4, '#5ae060'); txt(st >= 5 ? 'FINAL FORM!' : `XP ${xp}/${need}`, 120, 66, '#a8b0d8');
      PET_TRICKS.forEach((s, i) => { const y = 80 + i * 20, on = st > i; txt((on ? '# ' : '- ') + (i === 4 ? 'EVOLVE (30 XP)' : `LEVEL ${i + 1}`), 20, y, on ? '#ffe040' : '#7880b0'); txt(s.length > 38 ? s.slice(0, 38) : s, 20, y + 9, on ? '#fff' : '#7880b0'); });
      txt('PETS EARN XP WHEN YOU CLEAR A LEVEL', 128, 186, '#a8b0d8', { align: 'center' }); txt('PET FRUIT FROM THE GARDEN GIVES +3', 128, 196, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- the mailbox: a letter for each day you play ----------------
const MAIL = [
  ['PROFESSOR HOOT', 'HOO HOO! WELCOME TO YOUR VERY OWN MAILBOX. I SHALL SEND YOU TIPS. TIP ONE: JUMPING IS GOOD. HERE ARE SOME COINS FOR THE ROAD.', 5],
  ['BARON STATIC', 'DEAR WALLYMAN. I AM NOT ANGRY. I AM JUST... STATIC. P.S. GIVE ME BACK MY SIGNAL. P.P.S. NO, REALLY.', 0],
  ['DINO', 'RAWR! (TRANSLATION: THANK YOU FOR THE PET FRUIT. PLEASE SEND MORE. ALSO, YOU HAVE MUD ON YOUR CAPE.)', 10],
  ['GOTHCHICK', 'I GLIDED OVER THE WHOLE OF CARNIVAL ISLE TODAY. YOU SHOULD TRY IT. OH WAIT, YOU CANNOT. HA!', 0],
  ['DOUG THOMSON', 'HEY WALLY! I FOUND A SHORTCUT IN WALLY\'S BACKYARD. OR I GOT LOST. ONE OF THOSE. COINS ATTACHED.', 10],
  ['CAPTAIN GLOOMBEARD', 'ARRR. I BE WRITIN\' TO SAY I WANT ME TREASURE BACK. ALSO ME HAT. ALSO ME DIGNITY. MOSTLY THE HAT.', 0],
  ['MEGA-BOT', 'BEEP. YOU. STOMPED. MY. HEAD. BEEP. WELL. PLAYED. BEEP. ENCLOSED: ONE EXTRA LIFE. BEEP.', 'life'],
  ['VOLT', 'I RAN AROUND THE WORLD TWICE BEFORE BREAKFAST. WHAT DID YOU DO? A NAP? THOUGHT SO.', 0],
  ['KING THUNDERHEAD', 'I HAVE STOPPED RAINING ON PEOPLE. MOSTLY. SORRY ABOUT YOUR SOCKS. THEY WERE NICE SOCKS.', 0],
  ['SERPENTINA', 'THE SSSOGGY CAKE WASSS ACTUALLY QUITE NICE. TELL NO ONE. ESSSPECIALLY THE CRABSSS.', 0],
  ['THE CLOCKMAKER', 'YOU ARE LATE. ALSO EARLY. TIME IS VERY CONFUSING NOW THAT ALL MY CLOCKS CHIME AT ONCE.', 20],
  ['PROFESSOR HOOT', 'TIP TWO: GROW CARROTS, COOK THEM IN THE KITCHEN, EAT THE CAKE. THAT IS SCIENCE. HOO HOO!', 'carrot'],
  ['NINJA NELL', 'YOU DID NOT SEE THIS LETTER ARRIVE. NOBODY EVER DOES. ...STILL HERE? BOO!', 0],
  ['CLAUDE AND DOUG', 'THANK YOU FOR PLAYING WALLYMAN WORLD! MORE ADVENTURES ARE ON THE WAY. KEEP BEING A HERO!', 30],
];
function deliverMail() {
  if (!game) return; const m = game.mail = game.mail || { day: 0, got: 0, read: [] };
  if (m.day !== todayKey() && m.got < MAIL.length) { m.got++; m.day = todayKey(); Save.persist(); }
}
const unreadMail = () => (game && game.mail ? game.mail.got - game.mail.read.length : 0);
function MailScene() {
  deliverMail(); const m = game.mail; let sel = Math.max(0, m.got - 1), t = 0, open = -1;
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (open >= 0) { if (Input.confirm() || Input.pressed('back') || Input.pressed('run')) { open = -1; Audio8.sfx('select'); } return; }
      if (Input.pressed('back') || Input.pressed('run')) { go(() => HouseScene(14)); return; }
      if (!m.got) return;
      if (Input.pressed('down')) { sel = (sel + 1) % m.got; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + m.got - 1) % m.got; Audio8.sfx('select'); }
      if (Input.confirm()) {
        open = sel; Audio8.sfx('map');
        if (!m.read.includes(sel)) {
          m.read.push(sel); const g = MAIL[sel][2];
          if (typeof g === 'number' && g) payCoins(g); else if (g === 'life') game.lives++; else if (g === 'carrot') { game.pantry = game.pantry || {}; game.pantry.carrot = (game.pantry.carrot | 0) + 2; }
          if (m.read.length >= 10) Ach.unlock('pen pal'); Save.persist();
        }
      }
    },
    draw() {
      ctx.fillStyle = '#c8e0f8'; ctx.fillRect(0, 0, VW, VH); hR(0, 170, VW, 54, '#5ab048');
      hR(196, 120, 6, 52, '#6a4020'); hR(180, 96, 38, 28, '#1a1020'); hR(182, 98, 34, 24, '#3060c0'); hR(214, 92, 2, 14, '#1a1020'); hR(216, 92, 8, 6, unreadMail() ? '#ff3040' : '#7880b0');
      drawWindow(8, 8, 164, 22); txt('MAILBOX', 90, 15, '#ffe040', { align: 'center' });
      if (!m.got) { txt('NO LETTERS YET!', 90, 80, '#1a1020', { align: 'center', shadow: null }); return; }
      drawWindow(8, 34, 164, 16 + Math.min(12, m.got) * 12);
      const top = clamp(sel - 6, 0, Math.max(0, m.got - 12));
      for (let i = 0; i < Math.min(12, m.got); i++) { const k = top + i, y = 40 + i * 12, rd = m.read.includes(k); txt((rd ? '  ' : '* ') + MAIL[k][0], 22, y, k === sel ? '#ffe040' : rd ? '#a8b0d8' : '#fff'); if (k === sel) txt('>', 14 + ((t >> 3) & 1), y, '#ffe040'); }
      txt('ONE NEW LETTER EACH DAY YOU PLAY', 128, 208, '#1a1020', { align: 'center', shadow: null });
      if (open >= 0) {
        hR(20, 20, 216, 184, '#1a1020'); hR(22, 22, 212, 180, '#f8f0dc'); txt('FROM: ' + MAIL[open][0], 30, 30, '#a02020', { shadow: null });
        wrapText(MAIL[open][1], 33).forEach((l, i) => txt(l, 30, 50 + i * 12, '#2a1a10', { shadow: null }));
        const g = MAIL[open][2]; if (g) txt(typeof g === 'number' ? `ENCLOSED: ${g} COINS` : g === 'life' ? 'ENCLOSED: 1 EXTRA LIFE' : 'ENCLOSED: 2 CARROTS', 128, 174, '#2a8a30', { align: 'center', shadow: null });
        txt('A: FOLD IT UP', 128, 190, '#8a6a4a', { align: 'center', shadow: null });
      }
    },
  };
}
{ // the post arrives when you open the map
  const _M = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    deliverMail();
    const s = _M(...a), d = s.draw; let t = 0;
    s.draw = function () { d.call(this); t++; if (game && unreadMail() > 0 && t < 400 && (t >> 5) & 1) txt('NEW LETTER! (DINO\'S HOUSE)', 128, 48, '#5ff0ff', { align: 'center', outline: '#101848' }); };
    return s;
  };
}

// ---------------- Photo Safari ----------------
const SAFARI = [
  ['WALLY ISLAND', [['grumble', 'GRUMBLE'], ['prickle', 'PRICKLE'], ['buzzer', 'BUZZER'], ['hopper', 'HOPPER'], ['charger', 'CHARGER'], ['bat', 'BAT']]],
  ['SEA AND SKY', [['fish', 'FISH'], ['jelly', 'JELLY'], ['ufo', 'UFO'], ['turret', 'TURRET'], ['ghost', 'GHOST'], ['crab', 'KING KRABBY']]],
  ['ODDBALLS', [['slime', 'SLIME'], ['mimic', 'MIMIC'], ['boomer', 'BOOMERANG BRO'], ['magdrone', 'MAGNET DRONE'], ['asteroid', 'ASTEROID'], ['guard', 'VAULT GUARD']]],
  ['BIG ONES', [['megabot', 'MEGA-BOT'], ['thunderhead', 'THUNDERHEAD'], ['serpent', 'SERPENTINA'], ['clockmaker', 'CLOCKMAKER'], ['yeti', 'ICE YETI'], ['dragon', 'NIMBUS']]],
];
function safariSnap(pl) {
  if (!game) return; const S = game.safari = game.safari || { seen: {}, paid: [] }, cx = pl.cam.x; const got = [];
  for (const e of pl.ents) if (e.alive && !e.dying && e.x + e.w > cx && e.x < cx + VW && SAFARI.some((pg) => pg[1].some((k) => k[0] === e.type)) && !S.seen[e.type]) { S.seen[e.type] = 1; got.push(e.type); }
  SAFARI.forEach((pg, i) => { if (!S.paid.includes(i) && pg[1].every((k) => S.seen[k[0]])) { S.paid.push(i); payCoins(25); Ach.unlock('safari'); got.push('PAGE'); } });
  if (got.length) { Audio8.sfx('check'); pl.safariMsg = { s: got.includes('PAGE') ? 'SAFARI PAGE DONE! +25 COINS' : 'NEW FOR YOUR PHOTO SAFARI!', t: 120 }; Save.persist(); }
}
{
  const _dr = Play.prototype.draw;
  Play.prototype.draw = function () {
    if (this.photo && this.photo.snap) safariSnap(this);
    _dr.call(this);
    if (this.safariMsg && this.safariMsg.t > 0) { this.safariMsg.t--; txt(this.safariMsg.s, 128, 100, '#5ff0ff', { align: 'center', outline: '#101848' }); }
  };
}
function SafariScene() {
  let pg = 0, t = 0; const S = game.safari = game.safari || { seen: {}, paid: [] };
  return {
    enter() { Audio8.play('map'); },
    update() { t++; if (Input.pressed('back') || Input.pressed('run') || Input.confirm()) { go(() => HouseScene(15)); return; } if (Input.pressed('right')) { pg = (pg + 1) % SAFARI.length; Audio8.sfx('map'); } if (Input.pressed('left')) { pg = (pg + SAFARI.length - 1) % SAFARI.length; Audio8.sfx('map'); } },
    draw() {
      ctx.fillStyle = '#3a5a2a'; ctx.fillRect(0, 0, VW, VH); drawWindow(8, 6, 240, 22); txt(`PHOTO SAFARI: ${SAFARI[pg][0]}`, 128, 13, '#ffe040', { align: 'center' });
      SAFARI[pg][1].forEach(([id, name], i) => {
        const x = 14 + (i % 3) * 80, y = 34 + Math.floor(i / 3) * 76, seen = S.seen[id];
        hR(x, y, 70, 68, '#1a1020'); hR(x + 2, y + 2, 66, 64, seen ? '#f8f4ec' : '#4a4a5a'); hR(x + 5, y + 5, 60, 44, seen ? '#8ad0f8' : '#2a2a3a');
        if (seen) { ctx.save(); ctx.beginPath(); ctx.rect(x + 5, y + 5, 60, 44); ctx.clip(); stickerArt(id, x + 35, y + 27, t); ctx.restore(); } else txt('?', x + 32, y + 22, '#7880b0');
        txt(seen ? (name.length > 10 ? name.slice(0, 10) : name) : '???', x + 35, y + 54, seen ? '#2a1a10' : '#a8b0d8', { align: 'center', shadow: null });
      });
      const n = SAFARI[pg][1].filter((k) => S.seen[k[0]]).length;
      txt(S.paid.includes(pg) ? 'PAGE COMPLETE!' : `${n}/6 - FINISH THE PAGE FOR 25 COINS`, 128, 192, S.paid.includes(pg) ? '#5ae060' : '#fff', { align: 'center', outline: '#101848' });
      txt('SNAP THEM IN PHOTO MODE   < > PAGE', 128, 206, '#a8b0d8', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------------- parts and snacks in levels ----------------
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initM2) {
      this._initM2 = true;
      const normal = !this.mode && !this.ta && !this.rush && !this.daily && !this.def.custom && !this.versus && game;
      if (normal && game.snack) { const R = RECIPES.find((k) => k.id === game.snack); game.snack = null; Save.persist(); if (R) { R.apply(this); this.parts.push({ k: 'text', s: 'YUM! ' + R.name, x: this.p.x - 20, y: this.p.y - 30, vy: -0.3, life: 120 }); } }
      if (normal && !this.def.boss && this.lv && this.lv.grid && Math.random() < 0.65) {
        const kinds = Object.keys(PARTS), kind = kinds[Math.floor(Math.random() * kinds.length)], g = this.lv.grid, W = this.lv.w, want = Math.floor(W * (0.35 + Math.random() * 0.35));
        for (let x = want; x < W - 10; x++) { let gy = -1; for (let y = 3; y < 14; y++) if (SOLID.has(g[y][x]) && g[y - 1][x] === '.' && g[y - 2][x] === '.') { gy = y; break; } if (gy > 0) { this.ents.push({ type: 'part', kind, item: true, alive: true, t: 0, x: x * TS + 2, y: (gy - 1) * TS + 2, oy: (gy - 1) * TS + 2, w: 12, h: 12, rise: 0 }); break; } }
      }
    }
    return _upd.call(this);
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    if (e.type !== 'part') return _ue.call(this, e);
    e.t++; e.y = e.oy + Math.sin(e.t * 0.08) * 2;
    if (this.state === 'play' && overlap(this.p, e)) { e.alive = false; game.parts = game.parts || {}; game.parts[e.kind] = (game.parts[e.kind] | 0) + 1; Audio8.sfx('check'); this.parts.push({ k: 'text', s: PARTS[e.kind][0] + ' +1 (CRAFTING)', x: e.x - 36, y: e.y - 16, vy: -0.4, life: 70 }); Save.persist(); }
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) { if (e.type === 'part') { drawPart(e.kind, Math.round(e.x - cx), Math.round(e.y)); return; } return _de.call(this, e, cx); };
}

// ---------------- menus ----------------
function HouseScene(start = 0) { // eslint-disable-line no-func-assign
  const items = () => ["DINO'S SHOP", 'UPGRADE TREE', 'MINI-GAMES', 'GARDEN', 'PETS', 'PET SHOP', 'COSTUME SHOP', 'FILE STATS', 'SAVE CODE', 'CLOUD SAVE', "WALLYMAN'S DIARY", 'STATUE GARDEN', 'KITCHEN', 'CRAFTING BENCH', 'MAILBOX' + (unreadMail() ? ' (NEW!)' : ''), 'PHOTO SAFARI'].concat(game.cleared[7] ? ['NEW GAME+'] : []).concat(['LEAVE']);
  let sel = start, t = 0, dom = false; const SHOW = 15;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return; const it = items(); sel = Math.min(sel, it.length - 1);
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && it[sel] === 'LEAVE')) { go(() => MapScene()); return; }
      if (Input.confirm() && it[sel] === 'SAVE CODE') { Save.persist(); dom = true; codeBox('YOUR SAVE CODE - KEEP IT SAFE!', SaveCode.encode(game), null, () => { dom = false; }); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); const k = it[sel].startsWith('MAILBOX') ? 'MAILBOX' : it[sel]; go({ "DINO'S SHOP": () => ShopScene(), 'UPGRADE TREE': () => UpgradeScene(), 'MINI-GAMES': () => MiniGamesScene(), GARDEN: () => GardenScene(), PETS: () => PetScene(), 'PET SHOP': () => PetShopScene(), 'COSTUME SHOP': () => CostumeShopScene(), 'FILE STATS': () => StatsScene(), 'CLOUD SAVE': () => CloudScene(), "WALLYMAN'S DIARY": () => DiaryScene(), 'STATUE GARDEN': () => StatueGardenScene(), KITCHEN: () => KitchenScene(), 'CRAFTING BENCH': () => BenchScene(), MAILBOX: () => MailScene(), 'PHOTO SAFARI': () => SafariScene(), 'NEW GAME+': () => PlusScene() }[k]); }
    },
    draw() {
      ctx.fillStyle = '#f0c890'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0b478'; for (let x = 0; x < VW; x += 20) ctx.fillRect(x, 0, 2, 140);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 140, VW, 84); ctx.fillStyle = '#a06a34'; for (let x = 0; x < VW; x += 32) ctx.fillRect(x, 140, 30, 84);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(170, 22, 60, 44); ctx.fillStyle = '#fff'; ctx.fillRect(170, 43, 60, 2); ctx.fillRect(199, 22, 2, 44); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(168, 20, 64, 2); ctx.fillRect(168, 66, 64, 2);
      ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 210, 176);
      const q = PETS[game.petKind || heroOf()] || PETS.wally; ctx.drawImage(q.img[0], 196, 188 + ((t >> 4) & 1)); drawPetLook(petStage(game.petKind || heroOf()), 196, 188 + ((t >> 4) & 1), t);
      drawWally(180, 200, 'idle' + ((t >> 4) % 4), 1);
      drawWindow(8, 8, 150, 22); txt("DINO'S HOUSE", 83, 15, '#ffe040', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 172, 76); txt('*' + pad(game.coins, 2), 179, 76, '#3a2010', { shadow: null });
      const it = items(), n = Math.min(SHOW, it.length), top = clamp(sel - 7, 0, Math.max(0, it.length - SHOW)); drawWindow(8, 34, 150, 12 + n * 12);
      for (let i = 0; i < n; i++) { const k = top + i, y = 40 + i * 12; txt(it[k], 26, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); }
      if (top > 0) txt('^', 148, 36, '#a8b0d8'); if (top + SHOW < it.length) txt('V', 148, 36 + n * 12, '#a8b0d8');
    },
  };
}
function MiniGamesScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['SLOT MACHINE (5 COINS)', 'MEMORY MATCH (10 COINS)', 'FISHING (3 COINS A CAST)', 'KART RACE (FREE)', 'BEAT TAPPER (3 COINS)', 'SNOWBALL FIGHT (3 COINS)', 'WHACK-A-GRUMBLE (3 COINS)', 'MINI GOLF (3 COINS)', 'PINBALL (3 COINS)', "HOOT'S QUIZ (FREE)", 'GARDEN DEFENCE (3 COINS)', 'BACK'];
  const cost = [0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 3];
  let sel = start, t = 0, msg = '';
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => HouseScene(2)); return; }
      if (Input.confirm()) { if (game.coins < cost[sel]) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); return; } game.coins -= cost[sel]; Audio8.sfx('confirm'); go([() => SlotScene(), () => MemoryScene(), () => FishScene(), () => KartScene(), () => TapperPick(), () => SnowballScene(), () => WhackScene(), () => GolfScene(), () => PinballScene(), () => QuizScene(), () => DefenceScene()][sel]); }
    },
    draw() {
      drawParallax('carnival', t * 0.4);
      drawWindow(20, 18, 216, 30 + items.length * 13); txt('MINI-GAMES', 128, 24, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 40 + i * 13; txt(s, 40, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); });
      ctx.drawImage(Sprites.coinIcon, 100, 207); txt('*' + pad(game.coins, 2), 107, 207, '#fff', { outline: '#101848' }); if (msg) txt(msg, 132, 207, '#ff8080', { outline: '#101848' });
    },
  };
}

// ---------------- What's New, the Help Book ----------------
UPDATES.unshift(['1.2', ['TORNADOES AND EARTHQUAKES', 'JETPACK AND TIME-STOP CLOCK', 'NEW ISLAND: CLOCKWORK KINGDOM', 'STEALTH LEVELS WITH SEARCHLIGHTS', 'NEW HERO: NINJA NELL', 'MINI GOLF AND PINBALL', "PROFESSOR HOOT'S QUIZ", 'GARDEN DEFENCE', "DINO'S KITCHEN (GROW VEG!)", 'CRAFTING BENCH AND PARTS', 'PETS EVOLVE AND CHANGE LOOK', 'A MAILBOX WITH DAILY LETTERS', 'PHOTO SAFARI']]);
HELP_CH.push(['UPDATE 1.2', [
  [['CLOCKWORK KINGDOM: RIDE THE', 'GEAR WHEELS. TOUCH A REWIND', 'SWITCH TO REBUILD A BRIDGE', 'FOR A FEW SECONDS.'], 'jump'],
  [['STEALTH: KEEP OUT OF THE', 'SEARCHLIGHTS OR THE ALARM', 'SENDS MORE FOES. NINJA NELL', 'HIDES WHEN SHE CROUCHES.'], 'run'],
  [['JETPACK: HOLD JUMP IN THE', 'AIR TO FLY. TIME CLOCK:', 'FREEZES FOES AND PLATFORMS', 'FOR 5 SECONDS.'], 'item'],
  [['PARTS TURN UP IN LEVELS.', 'CRAFT THEM AT THE BENCH.', 'GROW VEG AND COOK SNACKS', "IN DINO'S KITCHEN."], 'throw'],
]]);

// the first title screen was built before these files loaded: rebuild it so the newest extras apply
if (typeof scene !== 'undefined' && scene && scene.isTitle) { scene = TitleScene(); if (scene.enter) scene.enter(); }
