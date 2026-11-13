'use strict';
// =====================================================================
// Update 1.9 (part 1): more hand-drawn high-resolution art for MODERN
// mode: GothChick (and Ninja Nell and the Frost Queen, who share her
// build), Doug, Robo-Wally, Dracula and his bat form, Baron Static, the
// Ice Yeti, the Clockmaker, coins, every power-up and the HUD icons.
// =====================================================================
(() => {
  const { INK, shade, path, limb, blob, rrect, tintHD, eye, PAL0 } = HD.util;
  const dir = (a, L) => [Math.sin(a) * L, Math.cos(a) * L];
  const circ = (x, cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); };
  const glow = (x, cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
  const lg = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const outlineFill = (x, fill, lw = 1) => { x.strokeStyle = INK; x.lineWidth = lw; x.stroke(); x.fillStyle = fill; x.fill(); };

  // ---------------- GothChick ----------------
  function goth(x, P, capeF, signal, G) {
    const bob = P.bob, lean = P.lean, hipX = 12, hipY = 21 + bob, shX = hipX + lean, shY = 13 + bob, t = capeF * (Math.PI / 2), hx = shX + 0.5, hy = 8 + bob;
    { // back pigtail, flowing like a cape
      const [ang, amp] = P.cape; let cx = hx - 3.4, cy = hy - 0.5; const pts = [];
      for (let i = 0; i <= 8; i++) { const s = i / 8, a = ang * 0.85 + Math.sin(t + s * 3) * amp * 0.3 * s; pts.push([cx, cy, 1.8 + s * 1.9]); cx -= Math.sin(a) * 0.9; cy += Math.cos(a) * 0.9; }
      x.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) { x.strokeStyle = INK; x.lineWidth = pts[i][2] + 1; path(x, [pts[i - 1], pts[i]]); x.stroke(); }
      for (let i = 1; i < pts.length; i++) { x.strokeStyle = i % 3 === 1 ? G.hairV : G.hairP; x.lineWidth = pts[i][2]; path(x, [pts[i - 1], pts[i]]); x.stroke(); }
      x.strokeStyle = shade(G.hairP, 0.4); x.lineWidth = 0.6; path(x, pts.slice(1, 5).map(([X, Y]) => [X + 0.5, Y - 0.3])); x.stroke();
    }
    const leg = ([th, bend], back) => {
      const hip = [hipX + (back ? -1 : 1), hipY], k = dir(th, 4), f = dir(th - bend, 4), kn = [hip[0] + k[0], hip[1] + k[1]], ft = [kn[0] + f[0], kn[1] + f[1]], m = [kn[0] + f[0] * 0.62, kn[1] + f[1] * 0.62];
      limb(x, [hip, kn, m], 2.7, back ? G.skinD : G.skin);
      limb(x, [m, ft], 3, back ? G.bootD : G.boot);
      x.strokeStyle = back ? G.boot : G.bootL; x.lineWidth = 0.9; path(x, [[m[0] - 1.3, m[1]], [m[0] + 1.3, m[1]]]); x.stroke();
      const sole = Math.max(ft[1] + 1, 0); rrect(x, ft[0] - 1.5, sole - 1.6, 4.6, 2.6, 1); outlineFill(x, back ? G.bootD : G.boot, 0.9);
      x.fillStyle = '#000'; x.fillRect(ft[0] - 1.3, sole + 0.6, 4.2, 0.5);
    };
    const arm = ([ua, fa], back) => {
      const s = [shX + (back ? -2 : 2), shY + 1], e = dir(ua, 4), hh = dir(fa, 4), el = [s[0] + e[0], s[1] + e[1]], h = [el[0] + hh[0], el[1] + hh[1]];
      limb(x, [s, el, h], 2, back ? G.skinD : G.skin); blob(x, h[0], h[1], 1.15, 1.15, back ? G.skinD : G.skin, back ? null : G.skinL); return h;
    };
    leg(P.back, true); arm(P.armB, true);
    { // bodice with a keyhole, brooch and lacing
      const top = 12 + bob, bot = 21 + bob, o = lean;
      x.beginPath(); x.moveTo(9.6 + o, top); x.lineTo(13.6 + o, top); x.quadraticCurveTo(15 + o * 0.5, top + 4, 14.6, bot); x.lineTo(8.6, bot); x.quadraticCurveTo(8.8 + o * 0.5, top + 4, 9.6 + o, top); x.closePath();
      outlineFill(x, lg(x, 8, 0, 15, 0, [[0, G.dressD], [0.5, G.dress], [1, G.dressL]]));
      const k = (lean * 6) / 9; x.fillStyle = G.skin; x.beginPath(); x.ellipse(12.8 + k, 15 + bob, 0.9, 1.2, 0, 0, Math.PI * 2); x.fill();
      blob(x, 12.6 + k, 12.6 + bob, 0.7, 0.7, G.silver, '#ffffff', false);
      x.fillStyle = G.dressL; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(12.6 + k * 0.6, 17.3 + bob + i, 0.35, 0, Math.PI * 2); x.fill(); }
    }
    leg(P.front, false);
    { // A-line skirt, swaying with the stride
      const sway = (P.front[0] - P.back[0]) * 1.1, y0 = hipY - 2, y1 = hipY + 2.8, cx2 = hipX + sway * 0.7;
      x.beginPath(); x.moveTo(hipX - 3, y0); x.lineTo(hipX + 3, y0); x.quadraticCurveTo(cx2 + 4.6, y1 - 1, cx2 + 5.4, y1); x.lineTo(cx2 - 5.4, y1); x.quadraticCurveTo(cx2 - 4.6, y1 - 1, hipX - 3, y0); x.closePath();
      outlineFill(x, lg(x, hipX - 6, 0, hipX + 6, 0, [[0, G.dressD], [0.55, G.dress], [1, G.dressL]]));
      x.strokeStyle = G.dressL; x.lineWidth = 0.6; path(x, [[cx2 - 5, y1 - 0.4], [cx2 + 5, y1 - 0.4]]); x.stroke();
    }
    { // head: face, black hair with streaks, side pigtail and clip
      blob(x, hx, hy, 4.2, 4.1, G.skin, G.skinL);
      x.beginPath(); x.moveTo(hx + 3.8, hy - 1.2); x.quadraticCurveTo(hx + 3.6, hy - 4.8, hx - 0.4, hy - 4.6); x.quadraticCurveTo(hx - 4.8, hy - 4.2, hx - 4.6, hy + 0.6); x.lineTo(hx - 4.4, hy + 3.6); x.quadraticCurveTo(hx - 2.4, hy + 1, hx - 1.6, hy - 1.2); x.quadraticCurveTo(hx + 1, hy - 1.8, hx + 3.8, hy - 1.2); x.closePath();
      x.strokeStyle = INK; x.lineWidth = 0.7; x.stroke(); x.fillStyle = lg(x, hx - 4, hy - 5, hx + 4, hy, [[0, G.hair], [1, shade(G.hair, 0.25)]]); x.fill();
      x.strokeStyle = G.hairP; x.lineWidth = 0.9; x.lineCap = 'round'; x.beginPath(); x.moveTo(hx - 1.4, hy - 4); x.quadraticCurveTo(hx - 3.4, hy - 2.6, hx - 3.6, hy + 0.4); x.stroke();
      x.strokeStyle = G.hairV; x.beginPath(); x.moveTo(hx + 1.4, hy - 4); x.quadraticCurveTo(hx + 2.8, hy - 3.2, hx + 3.2, hy - 1.8); x.stroke();
      blob(x, hx - 3.6, hy + 2.6, 1.3, 2, G.hairP, shade(G.hairP, 0.35)); blob(x, hx - 3.6, hy + 4.6, 1, 0.8, G.hairV, null, false);
      blob(x, hx - 2.4, hy + 0.3, 0.55, 0.55, G.silver, '#ffffff', false);
      if (P.ouch) { x.strokeStyle = INK; x.lineWidth = 0.6; path(x, [[hx + 1.6, hy - 0.4], [hx + 3.2, hy + 0.6]]); x.stroke(); }
      else { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(hx + 2.4, hy + 0.1, 1, 0.75, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = G.eye; circ(x, hx + 2.7, hy + 0.15, 0.55); x.fill(); x.fillStyle = INK; circ(x, hx + 2.8, hy + 0.15, 0.25); x.fill(); }
      x.strokeStyle = INK; x.lineWidth = 0.45; path(x, [[hx + 1.3, hy - 0.7], [hx + 3.5, hy - 0.8], [hx + 3.9, hy - 1.2]]); x.stroke();
      x.fillStyle = P.ouch ? INK : G.lips; x.beginPath(); x.ellipse(hx + 2.9, hy + 2.5, 0.8, 0.45, 0, 0, Math.PI * 2); x.fill();
    }
    const hand = arm(P.armF, false);
    if (P.phone) { rrect(x, hand[0] - 0.2, hand[1] - 3.3, 2.2, 3.3, 0.5); outlineFill(x, '#2a3038', 0.6); x.fillStyle = signal ? '#5ff0ff' : '#4a6070'; x.fillRect(hand[0] + 0.2, hand[1] - 2.9, 1.4, 1.7); if (signal) glow(x, hand[0] + 0.9, hand[1] - 3.6, 3, 'rgba(95,240,255,0.55)'); }
    if (P.fist) blob(x, hand[0], hand[1], 1.5, 1.5, G.skin, G.skinL);
  }

  // ---------------- Doug ----------------
  function doug(x, P, capeF, signal, G) {
    const bob = P.bob, lean = P.lean, hipX = 12, hipY = 21 + bob, shX = hipX + lean, shY = 13 + bob, hx = shX + 0.5, hy = 8 + bob;
    const leg = ([th, bend], back) => {
      const hip = [hipX + (back ? -1 : 1), hipY], k = dir(th, 4), f = dir(th - bend, 4), kn = [hip[0] + k[0], hip[1] + k[1]], ft = [kn[0] + f[0], kn[1] + f[1]];
      limb(x, [hip, kn, ft], 3.1, back ? G.jeansD : G.jeans);
      x.strokeStyle = shade(back ? G.jeansD : G.jeans, 0.25); x.lineWidth = 0.5; path(x, [[hip[0] + 0.8, hip[1]], [kn[0] + 0.8, kn[1]]]); x.stroke();
      const sole = Math.max(ft[1] + 1, 0); rrect(x, ft[0] - 1.6, sole - 1.6, 4.8, 2.6, 1.1); outlineFill(x, back ? '#b8b8c8' : G.shoe, 0.9);
      x.fillStyle = G.sole; x.fillRect(ft[0] - 1.4, sole + 0.5, 4.4, 0.6); if (!back) { x.fillStyle = '#d03040'; x.fillRect(ft[0] + 0.6, sole - 1.2, 1.6, 0.6); }
    };
    const arm = ([ua, fa], back) => {
      const s = [shX + (back ? -2 : 2), shY + 1], e = dir(ua, 4), hh = dir(fa, 4), el = [s[0] + e[0], s[1] + e[1]], h = [el[0] + hh[0], el[1] + hh[1]], mid = [s[0] + e[0] * 0.6, s[1] + e[1] * 0.6];
      limb(x, [mid, el, h], 2, back ? G.skinD : G.skin);
      limb(x, [s, mid], 3, back ? G.teeD : G.teeL);
      blob(x, h[0], h[1], 1.15, 1.15, back ? G.skinD : G.skin, back ? null : G.skinL); return h;
    };
    leg(P.back, true); arm(P.armB, true);
    { // T-shirt with a print, jeans waistband
      const top = 12 + bob, o = lean;
      rrect(x, 8 + lean * 0.1, 19.6 + bob, 8, 2.4, 0.6); outlineFill(x, G.jeansD, 0.9);
      x.beginPath(); x.moveTo(9 + o, top); x.lineTo(15 + o, top); x.quadraticCurveTo(16 + o * 0.5, top + 4, 15.8, 20.2 + bob); x.lineTo(8.2, 20.2 + bob); x.quadraticCurveTo(8 + o * 0.5, top + 4, 9 + o, top); x.closePath();
      outlineFill(x, lg(x, 8, 0, 16, 0, [[0, G.teeD], [0.5, G.tee], [1, G.teeL]]));
      const k = (lean * 6) / 9; x.strokeStyle = G.skinD; x.lineWidth = 0.7; x.beginPath(); x.arc(12.6 + o * 0.9, top - 0.2, 1.6, 0.2, Math.PI - 0.2); x.stroke();
      x.fillStyle = G.print; x.beginPath(); x.moveTo(11 + k, 15 + bob); x.lineTo(14.6 + k, 15 + bob); x.lineTo(12.8 + k, 17.6 + bob); x.closePath(); x.fill();
      x.fillStyle = '#5a8ac0'; circ(x, 12.8 + k, 15.8 + bob, 0.6); x.fill();
    }
    leg(P.front, false);
    { // bald head with a shine, glasses, stubble
      blob(x, hx, hy, 4.2, 4.1, G.skin, G.skinL);
      x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.ellipse(hx - 1, hy - 2.6, 1.6, 0.8, -0.3, 0, Math.PI * 2); x.fill();
      x.globalAlpha = 0.45; x.fillStyle = G.stub; x.beginPath(); x.moveTo(hx - 1.4, hy + 1.4); x.quadraticCurveTo(hx + 1.6, hy + 4.8, hx + 4, hy + 1.6); x.quadraticCurveTo(hx + 1.6, hy + 2.6, hx - 1.4, hy + 1.4); x.fill(); x.globalAlpha = 1;
      blob(x, hx - 1.2, hy + 0.6, 0.7, 0.9, G.skinD, null, false);
      rrect(x, hx + 0.2, hy - 1.2, 3.8, 2.2, 0.5); x.fillStyle = G.lens; x.fill(); x.strokeStyle = G.frame; x.lineWidth = 0.7; x.stroke();
      x.strokeStyle = G.frame; x.lineWidth = 0.6; path(x, [[hx + 0.2, hy - 0.6], [hx - 1.8, hy - 0.4]]); x.stroke();
      x.fillStyle = P.ouch ? INK : '#3a5a9a'; circ(x, hx + 2.4, hy - 0.1, 0.55); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(hx + 0.6, hy - 0.9, 0.6, 0.5);
      x.strokeStyle = P.ouch ? INK : '#c87060'; x.lineWidth = 0.6; x.beginPath(); if (P.ouch) x.ellipse(hx + 2.6, hy + 2.6, 0.7, 0.55, 0, 0, Math.PI * 2); else { x.moveTo(hx + 1.6, hy + 2.4); x.quadraticCurveTo(hx + 2.6, hy + 3, hx + 3.5, hy + 2.3); } x.stroke();
    }
    const hand = arm(P.armF, false);
    if (P.phone) { rrect(x, hand[0] - 0.2, hand[1] - 3.3, 2.2, 3.3, 0.5); outlineFill(x, '#2a3038', 0.6); x.fillStyle = signal ? '#5ff0ff' : '#4a6070'; x.fillRect(hand[0] + 0.2, hand[1] - 2.9, 1.4, 1.7); if (signal) glow(x, hand[0] + 0.9, hand[1] - 3.6, 3, 'rgba(95,240,255,0.55)'); }
    if (P.fist) blob(x, hand[0], hand[1], 1.5, 1.5, G.skin, G.skinL);
  }

  const HEROES_HD = { goth: 'goth', frost: 'goth', ninja: 'goth', doug: 'doug', robo: 'wally' };
  function heroPainter(m) {
    return (x, w, h) => {
      if (m.face < 0) { x.translate(w, 0); x.scale(-1, 1); }
      const P = Wally.POSES[m.pose] || Wally.POSES.idle0, kind = HEROES_HD[m.hero];
      const cos = m.hero === 'robo' ? 'robo' : m.hero === 'frost' ? 'frost' : m.hero === 'ninja' ? 'ninja' : m.costume;
      if (kind === 'goth') goth(x, P, m.capeF, m.signal, Object.assign({}, Wally.GOTH, Wally.GOTH_COSTUMES[cos] || {}));
      else if (kind === 'doug') doug(x, P, m.capeF, m.signal, Object.assign({}, Wally.DOUG, Wally.DOUG_COSTUMES[cos] || {}));
      else HD.wally(x, P, m.capeF, m.signal, Object.assign({}, PAL0, Wally.COSTUMES[cos] || {}));
      if (m.variant !== 'n') tintHD(x, w, h, m.variant === 'w' ? '#ffffff' : m.variant === 'k' ? INK : '#5ff0ff');
    };
  }
  {
    const _d = Wally.draw;
    Wally.draw = function (c, cx, feetY, pose, face, o = {}) {
      const hero = o.hero || Wally.hero;
      if (Modern.on() && HEROES_HD[hero]) {
        const capeF = o.capeF !== undefined ? o.capeF : (Math.floor((o.t !== undefined ? o.t : 0) / 6) & 3), costume = o.costume || Wally.current, ps = Wally.POSES[pose] ? pose : 'idle0';
        const reg = (variant) => { const img = Wally.frame(ps, capeF, o.signal, face, variant, costume, hero); if (!Modern.painted(img)) Modern.paint(img, heroPainter({ pose: ps, capeF, signal: !!o.signal, face, variant, costume, hero })); };
        reg(o.white ? 'w' : o.ghost ? 'g' : o.black ? 'k' : 'n'); if (o.glow) reg('g');
      }
      return _d.call(this, c, cx, feetY, pose, face, o);
    };
  }

  // ---------------- coins, power-ups and HUD icons ----------------
  const P = (img, fn) => { if (img) Modern.paint(img, fn); };
  const goldCoin = (x, w, h) => {
    const cx = w / 2, cy = h / 2, rx = w / 2 - 0.5, ry = h / 2 - 0.5;
    x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fillStyle = '#7a4a10'; x.fill();
    x.beginPath(); x.ellipse(cx, cy, rx - 0.7, ry - 0.7, 0, 0, Math.PI * 2); x.fillStyle = lg(x, 0, 0, w, h, [[0, '#fff2a0'], [0.45, '#ffd040'], [1, '#c87a10']]); x.fill();
    x.beginPath(); x.ellipse(cx, cy, rx * 0.55, ry * 0.62, 0, 0, Math.PI * 2); x.strokeStyle = '#d89020'; x.lineWidth = 0.6; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.ellipse(cx - rx * 0.4, cy - ry * 0.35, rx * 0.18, ry * 0.3, 0, 0, Math.PI * 2); x.fill();
  };
  P(Sprites.coin, goldCoin); P(Sprites.coinIcon, goldCoin);
  P(Sprites.miniMedal, goldCoin);
  P(Sprites.miniMedalOff, (x, w, h) => { x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 0.4, h / 2 - 0.4, 0, 0, Math.PI * 2); x.fillStyle = '#4a4a60'; x.fill(); x.strokeStyle = INK; x.lineWidth = 0.6; x.stroke(); });
  const heartPath = (x, w, h) => { x.beginPath(); x.moveTo(w / 2, h - 0.6); x.bezierCurveTo(-0.6, h * 0.45, 0.4, -0.3, w / 2, h * 0.28); x.bezierCurveTo(w - 0.4, -0.3, w + 0.6, h * 0.45, w / 2, h - 0.6); x.closePath(); };
  P(Sprites.heart, (x, w, h) => { heartPath(x, w, h); x.fillStyle = lg(x, 0, 0, 0, h, [[0, '#ff7088'], [1, '#d01838']]); x.fill(); x.strokeStyle = INK; x.lineWidth = 0.7; x.stroke(); x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(w * 0.3, h * 0.3, 0.9, 0.6, -0.5, 0, Math.PI * 2); x.fill(); });
  P(Sprites.heartEmpty, (x, w, h) => { heartPath(x, w, h); x.fillStyle = 'rgba(40,30,60,0.55)'; x.fill(); x.strokeStyle = INK; x.lineWidth = 0.7; x.stroke(); });
  P(Sprites.ballIcon, (x, w, h) => blob(x, w / 2, h / 2, w / 2 - 0.6, h / 2 - 0.6, '#4a4a5a', '#c8c8e0'));
  P(Sprites.miniPhone, (x, w, h) => { rrect(x, 0.3, 0.3, w - 0.6, h - 0.6, 0.6); outlineFill(x, '#3a4450', 0.5); x.fillStyle = '#5ff0ff'; x.fillRect(0.9, 0.9, w - 1.8, h * 0.45); });
  P(Sprites.miniBattery, (x, w, h) => { rrect(x, 0.3, 0.8, w - 0.6, h - 1.1, 0.6); outlineFill(x, lg(x, 0, 0, w, 0, [[0, '#1f9a3a'], [0.5, '#3ce060'], [1, '#1f9a3a']]), 0.5); x.fillStyle = '#ffe040'; path(x, [[w * 0.6, 1.4], [w * 0.3, h * 0.6], [w * 0.55, h * 0.6], [w * 0.4, h - 0.8], [w * 0.75, h * 0.42], [w * 0.5, h * 0.42]]); x.fill(); });
  P(Sprites.miniBoots, (x, w, h) => { x.beginPath(); x.moveTo(1.2, 0.4); x.lineTo(3.2, 0.4); x.lineTo(3.2, h * 0.5); x.lineTo(w - 0.4, h * 0.65); x.lineTo(w - 0.4, h - 0.4); x.lineTo(0.4, h - 0.4); x.closePath(); outlineFill(x, '#f2702a', 0.5); });
  P(Sprites.drink, (x) => { // a can of energy drink
    rrect(x, 4.3, 1.4, 7.4, 13.2, 1.6); outlineFill(x, lg(x, 4, 0, 12, 0, [[0, '#a01818'], [0.35, '#ff5050'], [0.6, '#e03030'], [1, '#901010']]));
    x.fillStyle = lg(x, 4, 0, 12, 0, [[0, '#8a94a0'], [0.4, '#eef2f6'], [1, '#8a94a0']]); x.fillRect(4.6, 1.6, 6.8, 1.6); x.fillRect(4.6, 12.8, 6.8, 1.6);
    x.fillStyle = '#ffe040'; path(x, [[8.8, 4.2], [6.2, 8.6], [8, 8.6], [7, 11.8], [9.8, 7.4], [8, 7.4], [9.2, 4.2]]); x.fill(); x.strokeStyle = '#c08000'; x.lineWidth = 0.4; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(5.2, 3.6, 0.8, 8.6);
  });
  P(Sprites.phone, (x) => {
    rrect(x, 5.2, 2.4, 6.2, 12, 1.4); outlineFill(x, lg(x, 5, 0, 12, 0, [[0, '#2a3038'], [0.5, '#4a5664'], [1, '#2a3038']]));
    rrect(x, 6.1, 3.6, 4.4, 5.4, 0.6); x.fillStyle = lg(x, 0, 3, 0, 9, [[0, '#a8ffff'], [1, '#30c8e0']]); x.fill();
    x.fillStyle = '#c8d0d8'; for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { circ(x, 7.2 + c * 2.2, 10.4 + r * 1.9, 0.5); x.fill(); }
    x.strokeStyle = INK; x.lineWidth = 0.6; path(x, [[9.6, 2.4], [9.6, 0.8]]); x.stroke();
  });
  P(Sprites.badge, (x) => {
    x.beginPath(); x.ellipse(8, 7.6, 7.4, 4.8, 0, 0, Math.PI * 2); x.fillStyle = '#1f9a3a'; x.fill();
    x.beginPath(); x.ellipse(8, 7.6, 6.6, 4.1, 0, 0, Math.PI * 2); x.fillStyle = lg(x, 0, 3, 0, 12, [[0, '#ffb070'], [1, '#e05a18']]); x.fill();
    x.strokeStyle = '#0e6a26'; x.lineWidth = 1.1; x.lineJoin = 'round'; path(x, [[3.6, 5.4], [5.4, 9.6], [8, 6.6], [10.6, 9.6], [12.4, 5.4]]); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(5.4, 5, 1.6, 0.7, -0.3, 0, Math.PI * 2); x.fill();
  });
  P(Sprites.ammo, (x) => {
    rrect(x, 1.4, 9.4, 13.2, 5.2, 0.8); outlineFill(x, lg(x, 0, 9, 0, 15, [[0, '#d89050'], [1, '#8a5a2a']]));
    x.strokeStyle = '#6a3a18'; x.lineWidth = 0.5; for (const sx of [4.5, 8, 11.5]) { path(x, [[sx, 10], [sx, 14]]); x.stroke(); }
    for (const [bx, by] of [[5, 7.4], [11, 7.4], [8, 4.4]]) blob(x, bx, by, 2.3, 2.3, '#3a3a4a', '#c8c8e0');
  });
  P(Sprites.magnet, (x) => { // a horseshoe magnet: red and blue poles, silver tips
    const arm = (pts, w, col) => { x.lineCap = 'butt'; x.lineJoin = 'round'; x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); x.lineTo(pts[1][0], pts[1][1]); x.arc(8, 7.4, 4, Math.PI, Math.PI / 2, true); x.stroke(); };
    x.lineCap = 'butt'; x.strokeStyle = INK; x.lineWidth = 4.8; x.beginPath(); x.moveTo(4, 2); x.lineTo(4, 7.4); x.arc(8, 7.4, 4, Math.PI, 0, true); x.lineTo(12, 2); x.stroke();
    arm([[4, 2.4], [4, 7.4]], 3.4, '#e83030');
    x.strokeStyle = '#2f62d0'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(12, 2.4); x.lineTo(12, 7.4); x.arc(8, 7.4, 4, 0, Math.PI / 2, false); x.stroke();
    x.fillStyle = '#e8e8f0'; x.fillRect(2.3, 1.6, 3.4, 1.8); x.fillRect(10.3, 1.6, 3.4, 1.8);
    x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(3.2, 4); x.lineTo(3.2, 7.6); x.stroke();
    x.strokeStyle = '#ffe040'; x.lineWidth = 0.6; for (const [sx, sy] of [[1.6, 13.6], [14.4, 13.6]]) { x.beginPath(); x.moveTo(sx - 1, sy); x.lineTo(sx + 1, sy); x.moveTo(sx, sy - 1); x.lineTo(sx, sy + 1); x.stroke(); }
  });
  P(Sprites.shrink, (x) => { // a potion bottle
    rrect(x, 6.6, 1.2, 2.8, 2.6, 0.6); outlineFill(x, '#e8e8f0', 0.7);
    x.beginPath(); x.moveTo(6.8, 3.8); x.lineTo(9.2, 3.8); x.quadraticCurveTo(13, 6, 12.4, 9.4); x.quadraticCurveTo(12, 12.6, 8, 12.6); x.quadraticCurveTo(4, 12.6, 3.6, 9.4); x.quadraticCurveTo(3, 6, 6.8, 3.8); x.closePath();
    outlineFill(x, lg(x, 0, 4, 0, 13, [[0, '#e8c8ff'], [0.4, '#d0a0ff'], [1, '#7a2ad8']]));
    x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(5.8, 7.2, 0.7, 1.6, 0.3, 0, Math.PI * 2); x.fill(); circ(x, 9.6, 9.6, 0.5); x.fill();
  });
  P(Sprites.shield, (x) => {
    circ(x, 7.5, 7.5, 6.8); x.fillStyle = (() => { const g = x.createRadialGradient(5, 5, 0.5, 7.5, 7.5, 7); g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.35, 'rgba(160,220,255,0.35)'); g.addColorStop(1, 'rgba(90,170,240,0.7)'); return g; })(); x.fill();
    x.strokeStyle = '#2a6aa0'; x.lineWidth = 0.7; x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 0.7; x.beginPath(); x.arc(7.5, 7.5, 5, Math.PI * 1.05, Math.PI * 1.45); x.stroke();
  });
  P(Sprites.shroom, (x) => {
    rrect(x, 4, 8.8, 8.2, 5.6, 1.6); outlineFill(x, lg(x, 0, 9, 0, 15, [[0, '#fff4e0'], [1, '#e0c098']]));
    x.fillStyle = INK; x.fillRect(6.2, 10.4, 0.9, 1.6); x.fillRect(9.2, 10.4, 0.9, 1.6);
    x.beginPath(); x.moveTo(0.6, 9.6); x.quadraticCurveTo(0.4, 1, 8, 1); x.quadraticCurveTo(15.6, 1, 15.4, 9.6); x.closePath(); outlineFill(x, lg(x, 0, 1, 0, 10, [[0, '#6af080'], [1, '#1f9a3a']]));
    x.fillStyle = '#ffffff'; for (const [sx, sy, r] of [[8, 3.6, 2.1], [3.2, 6.8, 1.6], [12.8, 6.8, 1.6]]) { circ(x, sx, sy, r); x.fill(); }
  });
  P(Sprites.battery, (x) => {
    rrect(x, 6.4, 1.2, 3.2, 2, 0.4); outlineFill(x, '#c8c8d8', 0.6);
    rrect(x, 4.4, 3.2, 7.2, 11.4, 1.2); outlineFill(x, lg(x, 4, 0, 12, 0, [[0, '#1f9a3a'], [0.45, '#5af080'], [1, '#1f9a3a']]));
    x.fillStyle = '#4a4a5a'; x.fillRect(4.8, 12.6, 6.4, 1.6);
    x.fillStyle = '#ffe040'; path(x, [[9, 4.4], [6, 8.8], [7.9, 8.8], [6.9, 12], [10, 7.4], [8.1, 7.4]]); x.fill(); x.strokeStyle = '#c08000'; x.lineWidth = 0.4; x.stroke();
  });
  P(Sprites.boots, (x) => {
    x.beginPath(); x.moveTo(4.6, 2.4); x.lineTo(9.4, 2.4); x.lineTo(9.4, 9.2); x.quadraticCurveTo(12.6, 9.6, 12.6, 12.6); x.lineTo(2.2, 12.6); x.quadraticCurveTo(2.2, 10, 4.6, 9.2); x.closePath(); outlineFill(x, lg(x, 0, 2, 0, 13, [[0, '#ffa060'], [0.6, '#f2702a'], [1, '#b4461a']]));
    x.fillStyle = '#ffffff'; path(x, [[9.6, 5.6], [13.2, 3.6], [12.2, 6.6]]); x.fill();
    for (const fx of [4.4, 9]) { const g = x.createLinearGradient(0, 12.6, 0, 16); g.addColorStop(0, '#ffe040'); g.addColorStop(1, 'rgba(255,112,32,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(fx - 1.6, 12.6); x.lineTo(fx + 1.6, 12.6); x.lineTo(fx, 15.8); x.fill(); }
  });
  P(Sprites.medal, (x) => {
    x.fillStyle = '#e83850'; path(x, [[4.6, 0.6], [7.2, 0.6], [8.6, 5], [6.2, 5]]); x.fill(); x.fillStyle = '#2f62d0'; path(x, [[11.4, 0.6], [8.8, 0.6], [7.4, 5], [9.8, 5]]); x.fill();
    circ(x, 8, 9, 4.8); outlineFill(x, lg(x, 3, 4, 13, 14, [[0, '#fff2a0'], [0.5, '#ffd040'], [1, '#c87a10']]), 0.8);
    x.fillStyle = '#fff8c0'; path(x, [[8, 6], [8.9, 8.2], [11, 8.3], [9.4, 9.6], [10, 11.8], [8, 10.5], [6, 11.8], [6.6, 9.6], [5, 8.3], [7.1, 8.2]]); x.fill();
  });

  // ---------------- Dracula ----------------
  const _drac = drawDracula, _bat = drawDracBat;
  function batHD(x, y, t, face) {
    const f = (t >> 2) & 1, up = f ? -4 : 2;
    ctx.save(); ctx.translate(x + 8, y + 5);
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(d * 2.5, -1); ctx.quadraticCurveTo(d * 8, -3 + up, d * 13, -1 + up); ctx.quadraticCurveTo(d * 11, 1 + up * 0.4, d * 10, 3 + up * 0.3); ctx.quadraticCurveTo(d * 8, 1.4, d * 6, 3); ctx.quadraticCurveTo(d * 4.5, 1.4, d * 2.5, 2.6); ctx.closePath();
      ctx.fillStyle = '#2a1840'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = '#5a3a7a'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(d * 3, 0); ctx.lineTo(d * 10, 2 + up * 0.3); ctx.moveTo(d * 3, 0); ctx.lineTo(d * 6.5, 2.6); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, 0.6, 3.4, 3.6, 0, 0, Math.PI * 2); ctx.fillStyle = '#3a2050'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#3a2050'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 1, -2.4); ctx.lineTo(d * 2.6, -5.4); ctx.lineTo(d * 2.8, -1.8); ctx.fill(); }
    glow(ctx, -1.3, 0, 2, 'rgba(255,40,60,0.7)'); glow(ctx, 1.3, 0, 2, 'rgba(255,40,60,0.7)');
    ctx.fillStyle = '#ff2030'; circ(ctx, -1.3, 0, 0.6); ctx.fill(); circ(ctx, 1.3, 0, 0.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-0.9, 2, 0.5, 0.9); ctx.fillRect(0.4, 2, 0.5, 0.9);
    ctx.restore();
  }
  function draculaHD(x, y, e, t) {
    const st = e ? e.state : 'walk', face = e ? e.face || -1 : -1;
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    if (st === 'bat') { batHD(x, y + 6, t, face); return; }
    const close = st === 'cloak' ? Math.min(1, 1 - e.act / 40) : st === 'reform' ? Math.max(0, e.act / 30) : 0, fangs = st === 'fangs' || st === 'bite';
    ctx.save(); ctx.translate(x + 8, 0); ctx.scale(face, 1); ctx.translate(-x - 8, 0);
    const spread = 9 * (1 - close), sway = st === 'walk' ? Math.sin(t * 0.2) : 0, cx = x + 8;
    // cape: dark outside, blood-red lining, scalloped hem
    ctx.beginPath(); ctx.moveTo(cx - 5, y + 6); ctx.quadraticCurveTo(cx - 8 - spread, y + 10, cx - 9 - spread, y + 29 + sway);
    for (let k = 0; k < 4; k++) { const ax = cx - 9 - spread + ((k + 1) * (18 + spread * 2)) / 4, mx = ax - (18 + spread * 2) / 8; ctx.quadraticCurveTo(mx, y + 26.5, ax, y + 29 - (k === 3 ? sway : 0)); }
    ctx.quadraticCurveTo(cx + 8 + spread, y + 10, cx + 5, y + 6); ctx.closePath();
    ctx.fillStyle = lg(ctx, cx - 10 - spread, 0, cx + 10 + spread, 0, [[0, '#0e0818'], [0.5, '#241a34'], [1, '#0e0818']]); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
    if (spread > 1) for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * 5, y + 8); ctx.quadraticCurveTo(cx + d * (6 + spread), y + 12, cx + d * (8 + spread * 0.9), y + 27 + sway * d); ctx.lineTo(cx + d * 7, y + 27); ctx.quadraticCurveTo(cx + d * 6, y + 14, cx + d * 5, y + 8); ctx.fillStyle = lg(ctx, 0, y + 8, 0, y + 28, [[0, '#d02030'], [1, '#6a0a14']]); ctx.fill(); }
    // suit: black coat, white shirt, red cravat, gold clasp
    rrect(ctx, x + 1.5, y + 8, 13, 20, 2); ctx.fillStyle = lg(ctx, x, 0, x + 16, 0, [[0, '#120c1c'], [0.5, '#2c2240'], [1, '#120c1c']]); ctx.fill();
    if (close < 0.85) { ctx.beginPath(); ctx.moveTo(x + 5, y + 9); ctx.lineTo(x + 11, y + 9); ctx.lineTo(x + 8, y + 20); ctx.closePath(); ctx.fillStyle = '#f0f0f8'; ctx.fill(); ctx.fillStyle = '#a01020'; ctx.beginPath(); ctx.moveTo(x + 6.6, y + 10); ctx.lineTo(x + 9.4, y + 10); ctx.lineTo(x + 8, y + 16); ctx.closePath(); ctx.fill(); glow(ctx, x + 8, y + 19.5, 2.4, 'rgba(255,210,90,0.8)'); ctx.fillStyle = '#d0a040'; circ(ctx, x + 8, y + 19.5, 1.1); ctx.fill(); }
    ctx.fillStyle = INK; rrect(ctx, x + 3.5, y + 27.6, 3.6, 1.6, 0.6); ctx.fill(); rrect(ctx, x + 9, y + 27.6, 3.6, 1.6, 0.6); ctx.fill();
    // high collar
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * 4, y + 9); ctx.lineTo(cx + d * 7.6, y + 1); ctx.lineTo(cx + d * 6, y + 9.4); ctx.closePath(); ctx.fillStyle = '#a01020'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.stroke(); }
    // pale face with a widow's peak and glowing eyes
    ctx.beginPath(); ctx.moveTo(cx - 4.4, y + 1); ctx.quadraticCurveTo(cx - 4.6, y + 7.4, cx, y + 9); ctx.quadraticCurveTo(cx + 4.6, y + 7.4, cx + 4.4, y + 1); ctx.quadraticCurveTo(cx, y - 1.4, cx - 4.4, y + 1); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, y, 0, y + 9, [[0, '#f6f2fc'], [1, '#c8c0dc']]); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 4.6, y + 2.6); ctx.quadraticCurveTo(cx - 4.4, y - 1.6, cx, y - 1.4); ctx.quadraticCurveTo(cx + 4.4, y - 1.6, cx + 4.6, y + 2.6); ctx.quadraticCurveTo(cx + 2, y + 0.6, cx, y + 3); ctx.quadraticCurveTo(cx - 2, y + 0.6, cx - 4.6, y + 2.6); ctx.closePath(); ctx.fillStyle = '#16101e'; ctx.fill();
    ctx.fillStyle = 'rgba(160,140,200,0.6)'; ctx.beginPath(); ctx.ellipse(cx - 2, y - 0.2, 1.4, 0.4, -0.2, 0, Math.PI * 2); ctx.fill();
    for (const ex of [-2, 2]) { glow(ctx, cx + ex, y + 4, 2.6, 'rgba(255,40,60,0.55)'); ctx.fillStyle = '#ff2030'; ctx.beginPath(); ctx.ellipse(cx + ex, y + 4, 1, 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(cx + ex - 1.3, y + 2.9 + (ex < 0 ? -0.3 : 0.3)); ctx.lineTo(cx + ex + 1.3, y + 2.9 + (ex < 0 ? 0.3 : -0.3)); ctx.stroke(); }
    if (fangs) { ctx.fillStyle = '#5a0a10'; ctx.beginPath(); ctx.ellipse(cx, y + 6.8, 2.6, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; path(ctx, [[cx - 2, y + 6], [cx - 1.4, y + 8], [cx - 0.9, y + 6]]); ctx.fill(); path(ctx, [[cx + 2, y + 6], [cx + 1.4, y + 8], [cx + 0.9, y + 6]]); ctx.fill(); }
    else { ctx.strokeStyle = '#8a2030'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(cx - 1.8, y + 6.6); ctx.quadraticCurveTo(cx, y + 6, cx + 1.8, y + 6.6); ctx.stroke(); }
    ctx.restore();
    if (st === 'rest' && (t >> 4) & 1) txt('HUFF', x - 4, y - 14, '#c0c8e0', { outline: '#1a1020' });
  }
  drawDracula = function (x, y, e, t) { return Modern.on() ? draculaHD(x, y, e, t) : _drac(x, y, e, t); }; // eslint-disable-line no-func-assign
  drawDracBat = function (x, y, t, face) { return Modern.on() ? batHD(x, y, t, face) : _bat(x, y, t, face); }; // eslint-disable-line no-func-assign

  // ---------------- Baron Static ----------------
  const _boss = Play.prototype.drawBoss;
  Play.prototype.drawBoss = function (e, x, y) {
    if (!Modern.on() || e.kind === 'mother') return _boss.call(this, e, x, y);
    if (e.inv > 0 && (frame >> 2) % 2) return;
    const c = ctx;
    // antennae with blinking bulbs
    c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 10, y + 1); c.lineTo(x + 7, y - 6); c.moveTo(x + 22, y + 1); c.lineTo(x + 25, y - 6); c.stroke();
    const bulb = (frame >> 3) & 1 ? '#ff3040' : '#ffe040'; for (const bx of [7, 25]) { glow(c, x + bx, y - 7, 4, bulb === '#ff3040' ? 'rgba(255,48,64,0.6)' : 'rgba(255,224,64,0.6)'); blob(c, x + bx, y - 7, 1.6, 1.6, bulb, '#ffffff'); }
    // treads
    rrect(c, x + 1.5, y + 24.5, 29, 7.5, 3.6); c.fillStyle = '#3a3a4a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    for (let i = 0; i < 5; i++) { const wx = x + 5.5 + i * 5.3; blob(c, wx, y + 28.2, 2.1, 2.1, '#6a6a80', '#c8c8e0'); c.strokeStyle = INK; c.lineWidth = 0.4; const a = frame * 0.15; c.beginPath(); c.moveTo(wx + Math.cos(a) * 1.6, y + 28.2 + Math.sin(a) * 1.6); c.lineTo(wx - Math.cos(a) * 1.6, y + 28.2 - Math.sin(a) * 1.6); c.stroke(); }
    // body with a lightning emblem
    rrect(c, x + 5.5, y + 17.5, 21, 8, 1.6); c.fillStyle = lg(c, 0, y + 17, 0, y + 26, [[0, '#9a9ab0'], [1, '#4a4a60']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
    c.fillStyle = '#ffe040'; path(c, [[x + 17.4, y + 18.6], [x + 13.6, y + 22.2], [x + 15.8, y + 22.2], [x + 14.6, y + 25], [x + 18.4, y + 21], [x + 16.2, y + 21]]); c.fill();
    // the TV head: wood cabinet, static on the screen, glowing eyes
    rrect(c, x + 0.5, y + 0.5, 31, 17.5, 2.6); c.fillStyle = lg(c, 0, y, 0, y + 18, [[0, '#b07850'], [0.6, '#8a5a3a'], [1, '#5a3a20']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(60,30,10,0.35)'; c.lineWidth = 0.4; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + 2, y + 3 + k * 3.6); c.quadraticCurveTo(x + 16, y + 2 + k * 3.6, x + 30, y + 4 + k * 3.6); c.stroke(); }
    rrect(c, x + 3, y + 2.8, 22.4, 12.6, 3); c.save(); c.clip();
    c.fillStyle = '#2a2a3a'; c.fillRect(x + 3, y + 2.8, 23, 13);
    for (let i = 0; i < 70; i++) { const v = (Math.random() * 180 + 50) | 0; c.fillStyle = `rgba(${v},${v},${v + 20},0.8)`; c.fillRect(x + 3 + Math.random() * 22, y + 3 + Math.random() * 12, 0.8 + Math.random(), 0.5); }
    const eyeC = e.hp < e.maxHp ? '255,48,64' : '255,128,48'; for (const ex of [9, 19]) { glow(c, x + ex, y + 7.6, 5, `rgba(${eyeC},0.7)`); c.fillStyle = `rgb(${eyeC})`; c.beginPath(); c.ellipse(x + ex, y + 7.6, 2.2, 1.6, 0, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x + 6, y + 5); c.lineTo(x + 12, y + 6); c.moveTo(x + 22, y + 5); c.lineTo(x + 16, y + 6); c.stroke();
    c.fillStyle = INK; rrect(c, x + 9, y + 11, 10, 2, 0.8); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(x + 9, y + 5, 7, 2.4, -0.15, 0, Math.PI * 2); c.fill();
    c.restore(); rrect(c, x + 3, y + 2.8, 22.4, 12.6, 3); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
    for (const ky of [5, 10]) blob(c, x + 28.2, y + ky, 1.4, 1.4, '#c8ccd8', '#ffffff');
  };

  // ---------------- Ice Yeti ----------------
  const _yeti = Play.prototype.drawYeti;
  Play.prototype.drawYeti = function (e, x, y) {
    if (!Modern.on()) return _yeti.call(this, e, x, y);
    if (e.inv > 0 && (frame >> 2) % 2) return;
    const c = ctx, step = e.state === 'walk' ? ((e.t >> 3) & 1) : 0, face = this && this.p ? (this.p.x < e.x ? -1 : 1) : 1, armUp = e.state === 'throw' ? -8 : e.state === 'leap' ? -10 : 0;
    for (const [fx, d] of [[8 + step * 2, 0], [22 - step * 2, 0]]) { c.beginPath(); c.ellipse(x + fx, y + 30 + d, 4.6, 2.4, 0, 0, Math.PI * 2); c.fillStyle = '#5a7ab8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); }
    const fur = (cx, cy, rx, ry) => { c.beginPath(); for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2, r = 1 + (k % 2 ? 0.07 : 0); const px = cx + Math.cos(a) * rx * r, py = cy + Math.sin(a) * ry * r; if (k) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); };
    for (const d of [-1, 1]) { const ax = d < 0 ? x : x + 30; c.save(); c.translate(ax, y + 12 + armUp); c.rotate(d * (armUp ? -0.5 : 0.15)); fur(0, 6, 3.6, 7); c.fillStyle = lg(c, -4, 0, 4, 0, [[0, '#c8d8f0'], [1, '#ffffff']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); c.restore(); }
    fur(x + 15, y + 15, 14, 13.6); c.fillStyle = (() => { const g = c.createRadialGradient(x + 11, y + 9, 2, x + 15, y + 15, 16); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#e8f0ff'); g.addColorStop(1, '#a8c0e0'); return g; })(); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(140,170,210,0.7)'; c.lineWidth = 0.5; for (let k = 0; k < 7; k++) { const fx = x + 5 + k * 3.4; c.beginPath(); c.moveTo(fx, y + 21); c.quadraticCurveTo(fx + 1, y + 24, fx - 0.4, y + 26); c.stroke(); }
    for (const d of [-1, 1]) { const bx = x + 15 + d * 10.5; c.beginPath(); c.moveTo(bx + d * 1.6, y + 2); c.quadraticCurveTo(bx + d * 2, y - 4, bx + d * 0.6, y - 5); c.quadraticCurveTo(bx - d * 1, y - 1, bx - d * 1.6, y + 2); c.closePath(); c.fillStyle = lg(c, 0, y - 5, 0, y + 2, [[0, '#fff4d8'], [1, '#c8b890']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); }
    const fx = x + 15 + face * 2; rrect(c, fx - 7, y + 5, 14, 10.4, 4); c.fillStyle = lg(c, 0, y + 5, 0, y + 16, [[0, '#7a9ad8'], [1, '#4a6aa8']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
    for (const ex of [-3.4, 3.4]) eye(c, fx + ex, y + 8.6, 1.5, face * 0.3, 0);
    if (e.hp < e.maxHp) { c.fillStyle = 'rgba(255,48,64,0.55)'; circ(c, fx - 3.4, y + 8.6, 1.6); c.fill(); circ(c, fx + 3.4, y + 8.6, 1.6); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(fx - 5.4, y + 6.4); c.lineTo(fx - 1.6, y + 7.2); c.moveTo(fx + 5.4, y + 6.4); c.lineTo(fx + 1.6, y + 7.2); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.ellipse(fx, y + 12.6, 3.6, 1.4, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffffff'; path(c, [[fx - 2.4, y + 11.6], [fx - 1.6, y + 13.4], [fx - 0.9, y + 11.6]]); c.fill(); path(c, [[fx + 2.4, y + 11.6], [fx + 1.6, y + 13.4], [fx + 0.9, y + 11.6]]); c.fill();
    if (e.state === 'throw' && e.act > 20) { blob(c, x + 15.5, y - 8.5, 4, 4, '#e8f4ff', '#ffffff'); }
  };

  // ---------------- the Clockmaker ----------------
  if (typeof drawClockmaker === 'function') {
    const _cm = drawClockmaker;
    drawClockmaker = function (x, y, e, t) { // eslint-disable-line no-func-assign
      if (!Modern.on()) return _cm(x, y, e, t);
      if (e && e.inv > 0 && (frame >> 2) & 1) return;
      const c = ctx, wind = e && e.state === 'wind';
      for (const lx of [11, 21]) { limb(c, [[x + lx, y + 30], [x + lx, y + 38.6]], 3.6, '#5a3a18'); rrect(c, x + lx - 3, y + 37.6, 6, 2.4, 1); c.fillStyle = INK; c.fill(); }
      rrect(c, x + 2.5, y + 12.5, 27, 19, 3); c.fillStyle = lg(c, x, 0, x + 32, 0, [[0, '#6a4220'], [0.5, '#a06a34'], [1, '#6a4220']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#c08040'; c.fillRect(x + 4, y + 13.5, 24, 2.4);
      c.fillStyle = lg(c, x + 14, 0, x + 18, 0, [[0, '#a07020'], [0.5, '#ffe080'], [1, '#a07020']]); c.fillRect(x + 14.4, y + 16, 3.2, 14);
      for (let k = 0; k < 3; k++) blob(c, x + 16, y + 19 + k * 4, 0.8, 0.8, '#ffe080', '#ffffff', false);
      limb(c, [[x + 1, y + 15], [x - 1, y + 25]], 4, '#c08040');
      c.save(); c.translate(x + 33.5, y + 19.5); c.rotate(wind ? t * 0.3 : 0); c.fillStyle = lg(c, -2, 0, 2, 0, [[0, '#c09020'], [0.5, '#fff0a0'], [1, '#c09020']]);
      for (const d of [-1, 1]) { c.beginPath(); c.ellipse(0, d * 3.4, 1.8, 2.6, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke(); } c.restore();
      circ(c, x + 16, y + 6, 11); c.fillStyle = lg(c, x + 5, y - 5, x + 27, y + 17, [[0, '#ffe080'], [0.5, '#c09020'], [1, '#7a5a10']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
      circ(c, x + 16, y + 6, 9.2); c.fillStyle = (() => { const g = c.createRadialGradient(x + 13, y + 3, 1, x + 16, y + 6, 10); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#e8dcb8'); return g; })(); c.fill();
      c.strokeStyle = INK; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, r0 = k % 3 ? 7.4 : 6.6; c.lineWidth = k % 3 ? 0.4 : 0.8; c.beginPath(); c.moveTo(x + 16 + Math.cos(a) * r0, y + 6 + Math.sin(a) * r0); c.lineTo(x + 16 + Math.cos(a) * 8.4, y + 6 + Math.sin(a) * 8.4); c.stroke(); }
      const a1 = t * 0.05, a2 = t * 0.004; c.lineCap = 'round'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 16, y + 6); c.lineTo(x + 16 + Math.cos(a2) * 4.6, y + 6 + Math.sin(a2) * 4.6); c.stroke(); c.strokeStyle = '#a01020'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x + 16, y + 6); c.lineTo(x + 16 + Math.cos(a1) * 7, y + 6 + Math.sin(a1) * 7); c.stroke();
      blob(c, x + 16, y + 6, 1, 1, '#c09020', null, false);
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(x + 12, y + 1.6, 3.4, 1.4, -0.5, 0, Math.PI * 2); c.fill();
      rrect(c, x + 8, y - 5.6, 16, 2.4, 0.8); c.fillStyle = INK; c.fill(); rrect(c, x + 11, y - 11, 10, 6, 1); c.fillStyle = lg(c, x + 11, 0, x + 21, 0, [[0, '#2a1a3a'], [0.5, '#4a3a5a'], [1, '#2a1a3a']]); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); c.fillStyle = '#a01020'; c.fillRect(x + 11.4, y - 7.4, 9.2, 1.2);
      if (wind && (t >> 4) & 1) txt('WINDING!', x - 6, y - 22, '#ffe040', { outline: '#1a1020' });
    };
  }
})();
