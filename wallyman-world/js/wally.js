'use strict';
// WallyMan is drawn from a small pixel "rig" (head, torso, two-joint arms and legs,
// and a cape that ripples) so he can have smooth, many-frame animation.
// Every frame is rendered once, outlined automatically, and cached.
const Wally = (() => {
  const W = 24, H = 32, BASE = 31; // canvas size, feet baseline
  const PAL0 = {
    ink: '#1a1020',
    blue: '#2f62d0', blueD: '#1d3f94', blueL: '#5a8af0', blueLL: '#86aaff',
    org: '#f2702a', orgD: '#b4461a', orgL: '#ffa060',
    skin: '#f2b48a', skinD: '#c97c58', skinL: '#ffd8b8',
    lens: '#d8f0ff', glint: '#ffffff', green: '#1f9a3a', greenD: '#0e5a1e',
    phone: '#2a3038', screen: '#4a6070', screenOn: '#5ff0ff', sole: '#5a2a10',
  };
  // Costumes recolour the suit (blue*) and the boots, belt and cape (org*).
  const COSTUMES = {
    classic: {},
    junior: { blue: '#2ea84a', blueD: '#1a7030', blueL: '#5ad070', blueLL: '#90f0a0', org: '#f8d030', orgD: '#c09018', orgL: '#fff080' },
    gold: { blue: '#d8a820', blueD: '#a07810', blueL: '#ffd860', blueLL: '#fff0a0', org: '#e83850', orgD: '#a01830', orgL: '#ff8090' },
    ice: { blue: '#90c8f8', blueD: '#5888c0', blueL: '#d0ecff', blueLL: '#ffffff', org: '#f0f8ff', orgD: '#a8c0e0', orgL: '#ffffff', lens: '#5ff0ff' },
    dino: { blue: '#2ec4b6', blueD: '#1a8a80', blueL: '#6ae8d8', blueLL: '#a0fff0', org: '#ff8c42', orgD: '#c0602a', orgL: '#ffb880' },
    shadow: { blue: '#3a2a5a', blueD: '#20142e', blueL: '#5a4a8a', blueLL: '#8a7ab8', org: '#8a3ac8', orgD: '#5a1a8a', orgL: '#c070ff', lens: '#ff3040' },
    fire: { blue: '#e83030', blueD: '#a01818', blueL: '#ff7060', blueLL: '#ffb0a0', org: '#ffd040', orgD: '#c09010', orgL: '#fff0a0' },
    // secret hero: Robo-Wally (steel body, red cape, glowing red visor)
    robo: { blue: '#9aa4b8', blueD: '#626c80', blueL: '#c8d0e0', blueLL: '#eef2ff', org: '#e83030', orgD: '#a01818', orgL: '#ff7060', skin: '#b8c0d0', skinD: '#7a8498', skinL: '#e8eef8', lens: '#ff3040', sole: '#30343c' },
  };
  let C = PAL0;

  // ---------- poses ----------
  // angles are radians from straight down; positive points toward the facing direction.
  // legs: [thigh, kneeBend]; arms: [upperArm, forearm]; lean: px the upper body tips forward.
  function walkPose(k, n, run) {
    const ph = (k / n) * Math.PI * 2;
    const A = run ? 0.95 : 0.55, B = run ? 1.5 : 0.8;
    const leg = (ps) => [A * Math.sin(ps), 0.08 + B * Math.max(0, Math.cos(ps))];
    const sw = run ? 1.0 : 0.55;
    return {
      bob: Math.abs(Math.cos(ph)) < 0.5 ? 1 : 0, lean: run ? 2 : 0,
      front: leg(ph), back: leg(ph + Math.PI),
      armF: run ? [-sw * Math.sin(ph) + 0.2, -sw * Math.sin(ph) + 1.7] : [-sw * Math.sin(ph) + 0.1, -sw * Math.sin(ph) + 1.4],
      armB: run ? [sw * Math.sin(ph) + 0.2, sw * Math.sin(ph) + 1.7] : [sw * Math.sin(ph), sw * Math.sin(ph) + 0.4],
      cape: run ? [1.35, 1.4, 12] : [0.7, 0.9, 10], phone: true,
    };
  }
  const POSES = {};
  for (let k = 0; k < 4; k++) {
    POSES['idle' + k] = {
      bob: k >= 2 ? 1 : 0, lean: 0, front: [0.12, 0.08], back: [-0.12, 0.05],
      armF: [0.1, 1.9 - (k >= 2 ? 0.1 : 0)], armB: [-0.95, 0.95], cape: [0.3, 0.6, 8], phone: true,
    };
  }
  for (let k = 0; k < 8; k++) { POSES['walk' + k] = walkPose(k, 8, false); POSES['run' + k] = walkPose(k, 8, true); }
  Object.assign(POSES, {
    jump: { bob: 0, lean: 1, front: [1.0, 1.7], back: [-0.35, 0.7], armF: [2.35, 2.6], armB: [-0.7, -0.3], cape: [0.25, 1.0, 10], fist: true },
    fall: { bob: 0, lean: 0, front: [0.45, 0.35], back: [-0.45, 0.6], armF: [1.9, 2.3], armB: [-2.1, -2.6], cape: [2.5, 1.4, 10], phone: true },
    skid: { bob: 1, lean: -2, front: [0.85, 0.0], back: [-0.2, 0.9], armF: [-1.1, -1.6], armB: [1.3, 1.9], cape: [1.0, 1.2, 10] },
    crouch: { bob: 4, lean: 1, front: [1.25, 2.3], back: [0.95, 2.1], armF: [0.6, 1.5], armB: [-0.2, 0.5], cape: [0.25, 0.5, 9], phone: true },
    hurt: { bob: 0, lean: -2, front: [0.6, 0.25], back: [-0.5, 0.6], armF: [1.9, 2.5], armB: [-2.4, -3.0], cape: [1.7, 1.6, 10], ouch: true },
    throw: { bob: 0, lean: 1, front: [0.35, 0.15], back: [-0.35, 0.3], armF: [1.65, 1.6], armB: [-0.8, -0.3], cape: [0.8, 1.0, 10], fist: true },
    ride: { bob: 0, lean: 1, front: [1.45, 1.25], back: [1.15, 1.45], armF: [1.0, 1.55], armB: [0.7, 1.4], cape: [1.0, 1.2, 10] },
    win0: { bob: 0, lean: 0, front: [0.3, 0.1], back: [-0.3, 0.1], armF: [2.1, 2.45], armB: [-0.95, 0.95], cape: [0.8, 1.2, 10], fist: true },
    win1: { bob: 1, lean: 0, front: [0.3, 0.1], back: [-0.3, 0.1], armF: [1.9, 2.7], armB: [-0.95, 0.95], cape: [0.9, 1.2, 10], fist: true },
  });

  // ---------- pixel drawing helpers ----------
  function rig(pose, capeF, signal, costume) {
    C = Object.assign({}, PAL0, COSTUMES[costume] || {});
    const c = Sprites.canvas(W, H), x = c.getContext('2d');
    const px = (X, Y, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), w, h); };
    const blob = (X, Y, w, col) => { const o = Math.floor(w / 2); px(X - o, Y - o, col, w, w); };
    const line = (x0, y0, x1, y1, w, col) => {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) blob(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w, col);
    };
    const dir = (a, L) => [Math.sin(a) * L, Math.cos(a) * L];
    const P = pose, bob = P.bob, lean = P.lean;
    const hipX = 12, hipY = 21 + bob;
    const shX = hipX + lean, shY = 13 + bob;
    const t = capeF * (Math.PI / 2);

    // cape (behind everything)
    {
      const [ang, amp, len] = P.cape;
      let cx = shX - 3, cy = shY;
      const pts = [];
      for (let i = 0; i <= len; i++) {
        const s = i / len, a = ang + Math.sin(t + s * 3.2) * amp * 0.35 * s;
        pts.push([cx, cy, 1.5 + s * 2.2]);
        cx -= Math.sin(a); cy += Math.cos(a);
      }
      pts.forEach(([X, Y, w]) => blob(X, Y + 1, Math.round(w), C.orgD));
      pts.forEach(([X, Y, w]) => blob(X, Y, Math.max(1, Math.round(w) - 1), C.org));
      pts.slice(0, Math.ceil(len / 2)).forEach(([X, Y]) => px(X, Y - 1, C.orgL));
    }
    // limbs
    const leg = ([th, bend], back) => {
      const [kx, ky] = dir(th, 4), [fx, fy] = dir(th - bend, 4);
      const k = [hipX + (back ? -1 : 1) + kx, hipY + ky], f = [k[0] + fx, k[1] + fy];
      line(hipX + (back ? -1 : 1), hipY, k[0], k[1], 3, back ? C.blueD : C.blue);
      line(k[0], k[1], f[0], f[1], 3, back ? C.orgD : C.org);
      px(k[0] - 1, k[1] - 1, back ? C.org : C.orgL, 3, 1); // boot cuff
      const sole = Math.max(f[1] + 1, 0);
      px(f[0] - 1, sole - 1, back ? C.orgD : C.org, 4, 2);
      px(f[0] - 1, sole + 1, C.sole, 4, 1);
    };
    const arm = ([ua, fa], back) => {
      const sx = shX + (back ? -2 : 2), sy = shY + 1;
      const [ex, ey] = dir(ua, 4), [hx, hy] = dir(fa, 4);
      const e = [sx + ex, sy + ey], h = [e[0] + hx, e[1] + hy];
      line(sx, sy, e[0], e[1], 2, back ? C.blueD : C.blueL);
      const c0 = [e[0] + hx * 0.5, e[1] + hy * 0.5];
      line(e[0], e[1], c0[0], c0[1], 2, back ? C.blueD : C.blueL);
      line(c0[0], c0[1], h[0] - hx * 0.15, h[1] - hy * 0.15, 2, back ? C.orgD : C.org); // glove cuff
      blob(h[0], h[1], 2, back ? C.skinD : C.skin);
      return h;
    };
    leg(P.back, true);
    arm(P.armB, true);
    // torso (sheared by lean)
    for (let y = 12; y <= 21; y++) {
      const off = Math.round((lean * (21 - y)) / 9), yy = y + bob;
      const l = (y === 12 ? 9 : 8) + off, r = (y === 12 ? 14 : 15) + off;
      px(l, yy, C.blueD, 2); px(l + 2, yy, C.blue, r - l - 2); px(r, yy, C.blueL);
      if (y === 19 || y === 20) { px(l, yy, y === 19 ? C.org : C.orgD, r - l + 1); }
    }
    {
      const o = Math.round((lean * 6) / 9), ey = 14 + bob;
      px(12 + o, ey, C.org, 3); px(11 + o, ey + 1, C.org, 5); px(12 + o, ey + 2, C.org, 3);
      px(12 + o, ey + 1, C.green); px(14 + o, ey + 1, C.green); px(13 + o, ey + 1, C.greenD);
      px(13 + o, ey, C.orgL);
    }
    leg(P.front, false);
    // head
    {
      const hx = shX + 0.5, hy = 8 + bob;
      const R = [2, 3, 4, 4, 4, 4, 3, 2];
      for (let i = 0; i < 8; i++) px(hx - R[i], hy - 4 + i, i >= 6 ? C.skinD : C.skin, R[i] * 2);
      px(hx - 2, hy - 4, C.skinL, 2); px(hx - 3, hy - 3, C.skinL, 1);
      // goggle strap + band
      px(hx - 4, hy - 1, C.blueD, 8, 2);
      px(hx + 1, hy - 1, C.lens, 3, 2); px(hx + 1, hy - 1, C.glint);
      if (P.ouch) { px(hx + 1, hy - 1, C.ink); px(hx + 3, hy, C.ink); }
      px(hx + 4, hy - 1, C.blueD, 1, 2);
      const sa = P.cape[0] * 0.8 + Math.sin(t) * 0.3;
      for (let i = 1; i <= 4; i++) px(hx - 4 - Math.sin(sa) * i, hy - 1 + Math.cos(sa) * i * 0.6 + (i > 2 ? Math.sin(t + i) * 0.6 : 0), C.blueD, 1, i < 3 ? 2 : 1);
      px(hx - 1, hy + 1, C.skinD); // ear
      px(hx + 2, hy + 2, P.ouch ? C.ink : C.skinD, 2, 1); // mouth
    }
    const hand = arm(P.armF, false);
    if (P.phone) {
      px(hand[0] - 1 + 1, hand[1] - 3, C.phone, 2, 3);
      px(hand[0] + 0, hand[1] - 3, signal ? C.screenOn : C.screen);
      if (signal) px(hand[0] + 1, hand[1] - 4, C.screenOn);
    }
    if (P.fist) blob(hand[0], hand[1], 3, C.skin);
    return c;
  }
  // ================= GothChick: second playable hero =================
  // Pink and purple pigtails with black bangs, black halter dress with a keyhole and a
  // silver brooch, bare arms, dark stockings and boots. Uses the same poses as WallyMan;
  // her back pigtail swings with the cape physics.
  const GOTH = {
    skin: '#f6d8cc', skinD: '#d4a89c', skinL: '#fff0ea', hair: '#1a1424', hairP: '#ff4aa8', hairV: '#9a4ae8',
    dress: '#1c1426', dressL: '#3a2c48', dressD: '#0c0810',
    boot: '#16121c', bootD: '#0a080e', bootL: '#5a4e6a', silver: '#d8dce8', lips: '#e02848', eye: '#3a6aa0',
  };
  const GOTH_COSTUMES = {
    classic: {},
    junior: { hairP: '#4ab0ff', hairV: '#2a60d0' },
    gold: { hairP: '#ffd040', hairV: '#e09020', dress: '#3a2a10', dressL: '#7a5a20', bootL: '#c8a030' },
    ice: { hairP: '#ffffff', hairV: '#a0d8ff', dress: '#7aa8d8', dressL: '#d0ecff', dressD: '#4a70a0', eye: '#5ff0ff' },
    dino: { hairP: '#2ec4b6', hairV: '#ff8c42', dress: '#1a4a44', dressL: '#2e8a80' },
    shadow: { hairP: '#8a3ac8', hairV: '#5a1a8a', eye: '#ff3040', lips: '#8a1a5a' },
    fire: { hairP: '#ff3020', hairV: '#ffa020', dress: '#6a0c10', dressL: '#a02028', bootL: '#ff7020' },
    // secret hero: Frost Queen
    frost: { hair: '#e8f4ff', hairP: '#a8e0ff', hairV: '#5aa0f0', dress: '#2a5a9a', dressL: '#5a90d0', dressD: '#183a68', skin: '#eef4ff', skinD: '#b8c8e8', skinL: '#ffffff', boot: '#c8e0ff', bootD: '#7aa0d0', bootL: '#ffffff', lips: '#4a80e0', eye: '#5ff0ff', silver: '#5ff0ff' },
  };
  function rigGoth(P, capeF, signal, costume) {
    const G = Object.assign({}, GOTH, GOTH_COSTUMES[costume] || {});
    const c = Sprites.canvas(W, H), x = c.getContext('2d');
    const px = (X, Y, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), w, h); };
    const blob = (X, Y, w, col) => { const o = Math.floor(w / 2); px(X - o, Y - o, col, w, w); };
    const line = (x0, y0, x1, y1, w, col) => {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) blob(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w, col);
    };
    const dir = (a, L) => [Math.sin(a) * L, Math.cos(a) * L];
    const bob = P.bob, lean = P.lean, hipX = 12, hipY = 21 + bob, shX = hipX + lean, shY = 13 + bob, t = capeF * (Math.PI / 2);
    const hx = shX + 0.5, hy = 8 + bob;
    // back pigtail (flows like a cape)
    {
      const [ang, amp] = P.cape;
      let cx = hx - 3, cy = hy - 1;
      for (let i = 0; i <= 8; i++) {
        const s = i / 8, a = ang * 0.85 + Math.sin(t + s * 3) * amp * 0.3 * s;
        blob(cx, cy + 1, Math.round(2 + s * 1.6), G.hairV);
        blob(cx, cy, Math.max(1, Math.round(1.5 + s * 1.4)), i % 3 === 1 ? G.hairV : G.hairP);
        cx -= Math.sin(a) * 0.9; cy += Math.cos(a) * 0.9;
      }
    }
    const leg = ([th, bend], back) => {
      const [kx, ky] = dir(th, 4), [fx, fy] = dir(th - bend, 4);
      const k = [hipX + (back ? -1 : 1) + kx, hipY + ky], f = [k[0] + fx, k[1] + fy];
      // bare legs: skin from the hem down past the knee, then black boots
      line(hipX + (back ? -1 : 1), hipY, k[0], k[1], 3, back ? G.skinD : G.skin);
      const m = [k[0] + fx * 0.62, k[1] + fy * 0.62];
      line(k[0], k[1], m[0], m[1], 3, back ? G.skinD : G.skin);
      if (!back) px(k[0], k[1], G.skinL);
      line(m[0], m[1], f[0], f[1], 3, back ? G.bootD : G.boot);
      px(m[0] - 1, m[1], back ? G.boot : G.bootL, 3, 1); // boot cuff
      const sole = Math.max(f[1] + 1, 0);
      px(f[0] - 1, sole - 1, back ? G.bootD : G.boot, 4, 2);
      px(f[0] - 1, sole + 1, '#000000', 4, 1);
    };
    const arm = ([ua, fa], back) => {
      const sx = shX + (back ? -2 : 2), sy = shY + 1;
      const [ex, ey] = dir(ua, 4), [hx2, hy2] = dir(fa, 4);
      const e = [sx + ex, sy + ey], h = [e[0] + hx2, e[1] + hy2];
      line(sx, sy, e[0], e[1], 2, back ? G.skinD : G.skin);
      line(e[0], e[1], h[0], h[1], 2, back ? G.skinD : G.skin);
      blob(h[0], h[1], 2, back ? G.skinD : G.skinL);
      return h;
    };
    leg(P.back, true);
    arm(P.armB, true);
    // bodice
    for (let y = 12; y <= 20; y++) {
      const off = Math.round((lean * (21 - y)) / 9), yy = y + bob;
      const l = (y <= 13 ? 10 : 9) + off, r = (y <= 13 ? 13 : 14) + off;
      px(l, yy, G.dressD); px(l + 1, yy, G.dress, r - l - 1); px(r, yy, G.dressL);
    }
    {
      const o = Math.round((lean * 6) / 9);
      px(12 + o, 14 + bob, G.skin, 2, 2); px(12 + o, 16 + bob, G.skin, 1, 1); // keyhole
      px(11 + o, 11 + bob, G.dress, 3, 1); px(12 + o, 12 + bob, G.silver); // halter + brooch
      for (let k = 0; k < 3; k++) px(12 + o, 17 + bob + k * 1, G.dressL); // lacing
    }
    leg(P.front, false);
    // A-line skirt to the knee, swaying with the stride
    {
      const sway = Math.round((P.front[0] - P.back[0]) * 1.1);
      for (let k = 0; k < 5; k++) {
        const yy = hipY - 2 + k, half = 3 + Math.floor(k * 0.6), cx2 = hipX + Math.round((sway * k) / 6);
        px(cx2 - half, yy, G.dressD); px(cx2 - half + 1, yy, G.dress, half * 2 - 1); px(cx2 + half, yy, G.dressL);
        if (k === 4) px(cx2 - half, yy, G.dressL, half * 2 + 1, 1);
      }
    }
    // head
    {
      const R = [2, 3, 4, 4, 4, 4, 3, 2];
      for (let i = 0; i < 8; i++) px(hx - R[i], hy - 4 + i, i >= 6 ? G.skinD : G.skin, R[i] * 2);
      px(hx - 2, hy - 5, G.hair, 5); px(hx - 3, hy - 4, G.hair, 7); px(hx - 4, hy - 3, G.hair, 8); px(hx - 4, hy - 2, G.hair, 5);
      px(hx - 4, hy - 1, G.hair, 3, 5); // hair over the back of the head
      px(hx + 1, hy - 2, G.hair, 3, 1); // bangs
      px(hx - 1, hy - 4, G.hairP, 2, 1); px(hx - 3, hy - 3, G.hairP, 1, 2); px(hx + 2, hy - 3, G.hairV); // streaks
      px(hx + 2, hy - 1, P.ouch ? '#1a1020' : G.eye); px(hx + 3, hy - 1, '#1a1020'); // eye + lashes
      px(hx + 3, hy + 2, P.ouch ? '#1a1020' : G.lips);
      px(hx - 3, hy + 1, G.hairP, 2, 3); px(hx - 3, hy + 4, G.hairV, 2, 1); px(hx - 2, hy, G.silver); // side pigtail + clip by the ear
    }
    const hand = arm(P.armF, false);
    if (P.phone) { px(hand[0], hand[1] - 3, '#2a3038', 2, 3); px(hand[0], hand[1] - 3, signal ? '#5ff0ff' : '#4a6070'); if (signal) px(hand[0] + 1, hand[1] - 4, '#5ff0ff'); }
    if (P.fist) blob(hand[0], hand[1], 3, G.skin);
    return c;
  }
  // ================= Doug Thomson: third playable hero =================
  // Bald head, blue rectangular glasses, light stubble, black graphic tee, jeans and trainers.
  const DOUG = {
    skin: '#f0c0a0', skinD: '#c89070', skinL: '#ffe0cc', stub: '#b89078', frame: '#1c2a78', lens: '#c8e0ff',
    tee: '#18161e', teeL: '#34303e', teeD: '#0a080e', print: '#c8ccd8', jeans: '#2c4a80', jeansD: '#1c3058', shoe: '#e8e8f0', sole: '#6a6a7a',
  };
  const DOUG_COSTUMES = {
    classic: {}, junior: { tee: '#2ea84a', teeL: '#5ad070', teeD: '#1a7030' }, gold: { tee: '#d8a820', teeL: '#ffd860', teeD: '#a07810', frame: '#7a4a10' },
    ice: { tee: '#90c8f8', teeL: '#d0ecff', teeD: '#5888c0', jeans: '#e0e8f8', jeansD: '#a8b8d8' }, dino: { tee: '#2ec4b6', teeL: '#6ae8d8', teeD: '#1a8a80', frame: '#ff8c42' },
    shadow: { tee: '#3a2a5a', teeL: '#5a4a8a', teeD: '#20142e', frame: '#8a1a3a', lens: '#ff8090' }, fire: { tee: '#e83030', teeL: '#ff7060', teeD: '#a01818', jeans: '#3a1a1a', jeansD: '#200c0c' },
  };
  function rigDoug(P, capeF, signal, costume) {
    const G = Object.assign({}, DOUG, DOUG_COSTUMES[costume] || {});
    const c = Sprites.canvas(W, H), x = c.getContext('2d');
    const px = (X, Y, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), w, h); };
    const blob = (X, Y, w, col) => { const o = Math.floor(w / 2); px(X - o, Y - o, col, w, w); };
    const line = (x0, y0, x1, y1, w, col) => {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) blob(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w, col);
    };
    const dir = (a, L) => [Math.sin(a) * L, Math.cos(a) * L];
    const bob = P.bob, lean = P.lean, hipX = 12, hipY = 21 + bob, shX = hipX + lean, shY = 13 + bob;
    const hx = shX + 0.5, hy = 8 + bob;
    const leg = ([th, bend], back) => {
      const [kx, ky] = dir(th, 4), [fx, fy] = dir(th - bend, 4);
      const k = [hipX + (back ? -1 : 1) + kx, hipY + ky], f = [k[0] + fx, k[1] + fy];
      line(hipX + (back ? -1 : 1), hipY, k[0], k[1], 3, back ? G.jeansD : G.jeans);
      line(k[0], k[1], f[0], f[1], 3, back ? G.jeansD : G.jeans);
      const sole = Math.max(f[1] + 1, 0);
      px(f[0] - 1, sole - 1, back ? '#b8b8c8' : G.shoe, 4, 2);
      px(f[0] - 1, sole + 1, G.sole, 4, 1);
      if (!back) px(f[0] + 1, sole - 1, '#d03040');
    };
    const arm = ([ua, fa], back) => {
      const sx = shX + (back ? -2 : 2), sy = shY + 1;
      const [ex, ey] = dir(ua, 4), [hx2, hy2] = dir(fa, 4);
      const e = [sx + ex, sy + ey], h = [e[0] + hx2, e[1] + hy2];
      const mid = [sx + ex * 0.6, sy + ey * 0.6];
      line(sx, sy, mid[0], mid[1], 3, back ? G.teeD : G.teeL); // short sleeve
      line(mid[0], mid[1], e[0], e[1], 2, back ? G.skinD : G.skin);
      line(e[0], e[1], h[0], h[1], 2, back ? G.skinD : G.skin);
      blob(h[0], h[1], 2, back ? G.skinD : G.skinL);
      return h;
    };
    leg(P.back, true);
    arm(P.armB, true);
    for (let y = 12; y <= 21; y++) {
      const off = Math.round((lean * (21 - y)) / 9), yy = y + bob;
      const l = (y === 12 ? 9 : 8) + off, r = (y === 12 ? 14 : 15) + off;
      if (y >= 20) { px(l, yy, G.jeansD, r - l + 1); continue; }
      px(l, yy, G.teeD); px(l + 1, yy, G.tee, r - l - 1); px(r, yy, G.teeL);
    }
    { const o = Math.round((lean * 6) / 9); px(11 + o, 15 + bob, G.print, 3, 1); px(12 + o, 16 + bob, G.print, 3, 1); px(11 + o, 17 + bob, '#5a8ac0', 2, 1); px(14 + o, 14 + bob, G.print); px(11 + o, 12 + bob, G.skinD, 3, 1); }
    leg(P.front, false);
    {
      const R = [2, 3, 4, 4, 4, 4, 3, 2];
      for (let i = 0; i < 8; i++) px(hx - R[i], hy - 4 + i, i >= 6 ? G.skinD : G.skin, R[i] * 2);
      px(hx - 2, hy - 4, G.skinL, 3); px(hx - 3, hy - 3, G.skinL, 2); px(hx - 4, hy - 1, G.skinD, 1, 3); // shine + back of head
      px(hx - 1, hy, G.skinD); // ear
      px(hx, hy - 1, G.frame, 4, 1); px(hx + 1, hy, G.lens, 2, 1); px(hx, hy, G.frame); px(hx + 3, hy, G.frame); px(hx + 1, hy + 1, G.frame, 2, 1); px(hx - 1, hy - 1, G.frame); // glasses
      px(hx + 2, hy, P.ouch ? '#1a1020' : '#3a5a9a'); // eye behind the lens
      px(hx - 1, hy + 2, G.stub, 2, 1); px(hx + 1, hy + 3, G.stub, 3, 1); px(hx + 2, hy + 2, P.ouch ? '#1a1020' : '#c87060', 2, 1); // stubble + mouth
    }
    const hand = arm(P.armF, false);
    if (P.phone) { px(hand[0], hand[1] - 3, '#2a3038', 2, 3); px(hand[0], hand[1] - 3, signal ? '#5ff0ff' : '#4a6070'); if (signal) px(hand[0] + 1, hand[1] - 4, '#5ff0ff'); }
    if (P.fist) blob(hand[0], hand[1], 3, G.skin);
    return c;
  }
  function outline(src, col) {
    const x = src.getContext('2d'), img = x.getImageData(0, 0, W, H), d = img.data;
    const a = (X, Y) => (X >= 0 && Y >= 0 && X < W && Y < H ? d[(Y * W + X) * 4 + 3] : 0);
    const out = [];
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      if (a(X, Y)) continue;
      if (a(X - 1, Y) || a(X + 1, Y) || a(X, Y - 1) || a(X, Y + 1)) out.push([X, Y]);
    }
    x.fillStyle = col; out.forEach(([X, Y]) => x.fillRect(X, Y, 1, 1));
    return src;
  }
  function tint(src, col) {
    const c = Sprites.canvas(W, H), x = c.getContext('2d');
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, W, H); return c;
  }
  const cache = new Map();
  // variant: 'n' normal, 'w' white flash, 'g' glow silhouette
  function frame(pose, capeF, signal, face, variant = 'n', costume = 'classic', hero = 'wally') {
    if (!POSES[pose]) pose = 'idle0';
    const key = `${pose}|${capeF}|${signal ? 1 : 0}|${face > 0 ? 1 : 0}|${variant}|${costume}|${hero}`;
    let c = cache.get(key);
    if (c) return c;
    if (variant === 'n') {
      const cos = hero === 'robo' ? 'robo' : hero === 'frost' ? 'frost' : costume;
      if (face > 0) c = outline(api.extraHero && (hero === 'dino' || hero === 'baron') ? api.extraHero(hero, pose, capeF) : hero === 'goth' || hero === 'frost' ? rigGoth(POSES[pose], capeF, signal, cos) : hero === 'doug' ? rigDoug(POSES[pose], capeF, signal, cos) : rig(POSES[pose], capeF, signal, cos), PAL0.ink);
      else c = Sprites.flip(frame(pose, capeF, signal, 1, 'n', costume, hero));
    } else c = tint(frame(pose, capeF, signal, face, 'n', costume, hero), variant === 'w' ? '#ffffff' : variant === 'k' ? '#1a1020' : '#5ff0ff');
    cache.set(key, c);
    return c;
  }
  // ---------- hats and accessories (drawn on top of any hero) ----------
  const headCache = new WeakMap();
  function headOf(img) { // top of the head and its centre, found once per frame image
    let h = headCache.get(img);
    if (h) return h;
    const d = img.getContext('2d').getImageData(0, 0, W, H).data;
    let top = 0;
    for (let y = 0; y < H && !top; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 0) { top = y; break; }
    let sx = 0, n = 0;
    for (let y = top; y < top + 3; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 0) { sx += x; n++; }
    h = { top, cx: n ? sx / n : W / 2 }; headCache.set(img, h); return h;
  }
  const HATS = {
    party: { w: 7, h: 9, draw(x, p) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); };
      r(3, 0, 1, 1, '#ffe040'); for (let i = 1; i < 9; i++) r(3 - (i >> 1), i, 1 + (i >> 1) * 2, 1, i % 3 === 0 ? '#ffe040' : i % 3 === 1 ? '#ff4aa8' : '#5ff0ff'); } },
    crown: { w: 9, h: 6, draw(x, p) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); };
      r(0, 1, 1, 5, '#a07010'); r(4, 0, 1, 6, '#a07010'); r(8, 1, 1, 5, '#a07010'); r(0, 3, 9, 3, '#ffd040'); r(1, 2, 1, 1, '#ffd040'); r(4, 1, 1, 1, '#ffd040'); r(7, 2, 1, 1, '#ffd040'); r(2, 4, 1, 1, '#e83050'); r(4, 4, 1, 1, '#40a0ff'); r(6, 4, 1, 1, '#e83050'); r(0, 5, 9, 1, '#c09010'); } },
    tophat: { w: 11, h: 8, draw(x, p) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); };
      r(2, 0, 7, 6, '#1a1020'); r(3, 0, 1, 5, '#3a3048'); r(2, 4, 7, 1, '#c02030'); r(0, 6, 11, 2, '#1a1020'); } },
    cowboy: { w: 13, h: 6, draw(x, p) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); };
      r(3, 0, 7, 4, '#8a5a2a'); r(5, 0, 3, 1, '#6a3a1a'); r(3, 3, 7, 1, '#3a2010'); r(0, 4, 13, 1, '#a06a30'); r(0, 3, 1, 1, '#a06a30'); r(12, 3, 1, 1, '#a06a30'); r(1, 5, 11, 1, '#6a3a1a'); } },
    propeller: { w: 11, h: 7, draw(x, p, t) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); };
      const k = (t >> 2) % 3, bl = [5, 3, 1][k]; r(5 - bl, 0, bl * 2 + 1, 1, '#e83050'); r(5, 1, 1, 2, '#808898'); r(2, 3, 7, 3, '#e83050'); r(2, 3, 2, 3, '#ffe040'); r(7, 3, 2, 3, '#40a0ff'); r(1, 6, 10, 1, '#1a1020'); } },
    halo: { w: 11, h: 4, float: 3, draw(x, p, t) { const r = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(p.x + X * p.s, p.y + Y * p.s, w * p.s, h * p.s); };
      const c = (t >> 3) & 1 ? '#fff8a0' : '#ffe040'; r(2, 0, 7, 1, c); r(0, 1, 2, 2, c); r(9, 1, 2, 2, c); r(2, 3, 7, 1, c); r(2, 1, 7, 2, 'rgba(255,240,140,0.25)'); } },
  };
  function drawHat(ctx, img, X, Y, sx, sy, hat, t) {
    const H_ = HATS[hat]; if (!H_) return;
    const hd = headOf(img), s = Math.max(1, Math.round(sx));
    const px = Math.round(X + hd.cx * sx - (H_.w * s) / 2), py = Math.round(Y + hd.top * sy - H_.h * s + 3 * s - (H_.float || 0) * s);
    H_.draw(ctx, { x: px, y: py, s }, t || 0);
  }
  // draw with feet centred at (cx, feetY); sx/sy for squash & stretch
  function draw(ctx, cx, feetY, pose, face, o = {}) {
    const capeF = o.capeF !== undefined ? o.capeF : (Math.floor((o.t !== undefined ? o.t : 0) / 6) & 3);
    const sx = o.sx || 1, sy = o.sy || 1;
    const w = Math.round(W * sx), h = Math.round(H * sy);
    const X = Math.round(cx - w / 2), Y = Math.round(feetY - h + (BASE + 1 - H) * sy);
    if (o.glow) {
      const g = frame(pose, capeF, o.signal, face, 'g', o.costume || api.current, o.hero || api.hero);
      ctx.save(); ctx.globalAlpha = o.glow;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(g, X + dx, Y + dy, w, h);
      ctx.restore();
    }
    const img = frame(pose, capeF, o.signal, face, o.white ? 'w' : o.ghost ? 'g' : o.black ? 'k' : 'n', o.costume || api.current, o.hero || api.hero);
    ctx.drawImage(img, X, Y, w, h);
    const hat = o.hat !== undefined ? o.hat : api.hat;
    if (hat && hat !== 'none' && !o.ghost && !o.black) drawHat(ctx, img, X, Y, w / W, h / H, hat, o.t);
  }
  const api = { draw, frame, drawHat, POSES, W, H, COSTUMES, HATS, current: 'classic', hero: 'wally', hat: 'none' };
  return api;
})();
