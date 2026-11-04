// GOFFICHICK - billboard sprites: enemies, projectiles, effects, decorations, pickups
// All art is drawn procedurally with canvas, except Wally Man who comes from a photo.
'use strict';

const Sprites = (() => {
  const S = {};

  // Create a sprite from a draw function. Alpha is made binary so the raycaster can
  // test transparency with a single compare.
  function mk(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    fn(g, w, h);
    return fromCanvas(c);
  }
  function fromCanvas(c) {
    const g = c.getContext('2d');
    const id = g.getImageData(0, 0, c.width, c.height);
    const data = new Uint32Array(id.data.buffer.slice(0));
    for (let i = 0; i < data.length; i++) if ((data[i] >>> 24) < 110) data[i] = 0; else data[i] |= 0xff000000;
    return { w: c.width, h: c.height, data, canvas: c };
  }

  // ---------- drawing helpers ----------
  const P = (g, color, pts) => { g.fillStyle = color; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  const E = (g, color, x, y, rx, ry, rot = 0) => { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
  const R = (g, color, x, y, w, h) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
  const glow = (g, x, y, r, inner, outer = 'rgba(0,0,0,0)') => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  const flame = (g, x, y, s, c1 = '#ffcf3a', c2 = '#ff5a1f') => {
    P(g, c2, [x - s, y, x, y - s * 3, x + s, y]); P(g, c1, [x - s * 0.5, y, x, y - s * 1.8, x + s * 0.5, y]);
  };

  // ---------- generic derived frames ----------
  function canvasOf(sprite) { return sprite.canvas; }
  function tinted(src, color, alpha) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  // blood only over the (squashed) body area, so nothing floats in mid-air
  function splatter(g, w, h, n, seed, top) {
    let s = seed; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) E(g, i % 3 ? '#8a0010' : '#c3002a', w * 0.15 + r() * w * 0.7, top + r() * (h - top - 2), 1 + r() * 3, 1 + r() * 2);
  }
  // Death sequence: squash the pain frame down, add blood, finish with a flat corpse.
  function deathFrames(base) {
    const out = [];
    const w = base.width, h = base.height;
    [[0.85, 6], [0.5, 14], [0.22, 22]].forEach(([sq, blood], i) => {
      const c = document.createElement('canvas'); c.width = w + 16; c.height = h;
      const g = c.getContext('2d');
      if (i === 2) { E(g, '#5a0008', c.width / 2, h - 3, c.width / 2 - 2, 3); }
      const t = tinted(base, '#400000', 0.25 + i * 0.2);
      const sw = w * (1 + i * 0.12);
      g.drawImage(t, (c.width - sw) / 2, h - h * sq, sw, h * sq);
      g.globalCompositeOperation = 'source-atop'; splatter(g, c.width, h, blood, 7 + i, h - h * sq); g.globalCompositeOperation = 'source-over';
      out.push(fromCanvas(c));
    });
    return out;
  }
  function enemySet(walk0, walk1, attack) {
    const w0 = typeof walk0 === 'function' ? walk0() : walk0;
    const set = { walk: [w0, walk1], attack: [attack] };
    const painC = tinted(w0.canvas, '#ff0000', 0.45);
    set.pain = [fromCanvas(painC)];
    set.die = deathFrames(w0.canvas);
    return set;
  }

  // ===================== ENEMIES =====================

  // --- LATTE ZOMBIE: shambling basic in a beige cardigan, flings scalding pumpkin-spice latte (hitscan)
  function zombie(pose) {
    return mk(64, 80, g => {
      const step = pose === 1 ? 1 : 0, atk = pose === 2;
      // legs
      R(g, '#1e2a48', 22 + (step ? -2 : 2), 54, 8, 24); R(g, '#1e2a48', 34 + (step ? 2 : -2), 54, 8, 24);
      R(g, '#e8e2d5', 20 + (step ? -2 : 2), 76, 11, 4); R(g, '#e8e2d5', 33 + (step ? 2 : -2), 76, 11, 4);
      // torso: white tee under open beige cardigan
      P(g, '#d9c39a', [16, 26, 48, 26, 50, 58, 14, 58]);
      R(g, '#f1efe8', 26, 26, 12, 30);
      R(g, '#c2aa7d', 16, 54, 34, 4);
      // limp left arm
      P(g, '#d9c39a', [14, 28, 20, 28, 18, 52, 12, 50]); E(g, '#9fb08a', 15, 53, 3, 3);
      // right arm: holding latte
      if (atk) {
        P(g, '#d9c39a', [44, 28, 52, 28, 60, 34, 56, 38]); E(g, '#9fb08a', 58, 35, 3, 3);
        R(g, '#ffffff', 54, 22, 8, 11); R(g, '#8b5a2b', 54, 26, 8, 4); R(g, '#e8e8e8', 53, 20, 10, 3);
        for (let i = 0; i < 8; i++) E(g, i % 2 ? '#b07438' : '#d79a55', 50 - i * 5, 18 - i * 1.5 + (i % 3), 3, 2);
      } else {
        P(g, '#d9c39a', [44, 28, 50, 28, 54, 44, 48, 46]); E(g, '#9fb08a', 51, 46, 3, 3);
        R(g, '#ffffff', 48, 40, 8, 11); R(g, '#8b5a2b', 48, 44, 8, 4); R(g, '#e8e8e8', 47, 38, 10, 3);
      }
      // head
      E(g, '#9fb08a', 32, 17, 9, 10);
      E(g, '#6b4a2b', 32, 9, 10, 5); E(g, '#6b4a2b', 32, 3, 5, 4); // messy bun
      R(g, '#ffffff', 27, 15, 4, 3); R(g, '#ffffff', 34, 15, 4, 3);
      R(g, '#000', 29, 16, 1, 1); R(g, '#000', 35, 16, 1, 1);
      E(g, '#3a1010', 32, 23, 3, atk ? 3 : 2);
      E(g, '#7f8f6c', 26, 22, 2, 1);
    });
  }

  // --- MIDDLE MANAGER: horned demon in a cheap suit, hurls flaming memos
  function manager(pose) {
    return mk(64, 84, g => {
      const step = pose === 1, atk = pose === 2;
      R(g, '#3a3d44', 22 + (step ? -2 : 2), 56, 9, 24); R(g, '#3a3d44', 34 + (step ? 2 : -2), 56, 9, 24);
      R(g, '#111', 20 + (step ? -2 : 2), 79, 12, 5); R(g, '#111', 33 + (step ? 2 : -2), 79, 12, 5);
      P(g, '#4a4e57', [14, 28, 50, 28, 48, 60, 16, 60]);
      P(g, '#e6e6e6', [27, 28, 37, 28, 32, 44]);
      P(g, '#c4161c', [31, 30, 33, 30, 35, 50, 32, 54, 29, 50]);
      // arms
      P(g, '#4a4e57', [10, 30, 17, 30, 15, 54, 8, 52]); P(g, '#c23b22', [7, 52, 15, 52, 13, 58, 4, 58]);
      if (atk) {
        P(g, '#4a4e57', [47, 30, 54, 30, 58, 10, 52, 8]);
        P(g, '#c23b22', [50, 4, 60, 4, 58, 10, 52, 10]);
        R(g, '#fffbe6', 46, -2 + 4, 14, 10); R(g, '#888', 48, 6, 10, 1); R(g, '#888', 48, 9, 8, 1);
        flame(g, 53, 4, 4);
      } else {
        P(g, '#4a4e57', [47, 30, 54, 30, 56, 54, 49, 54]); P(g, '#c23b22', [49, 54, 57, 54, 60, 60, 50, 60]);
        R(g, '#fffbe6', 52, 44, 10, 13); R(g, '#888', 54, 47, 6, 1); R(g, '#888', 54, 50, 6, 1);
      }
      // head
      E(g, '#c23b22', 32, 17, 10, 11);
      P(g, '#e8d9b0', [22, 10, 18, 0, 26, 7]); P(g, '#e8d9b0', [42, 10, 46, 0, 38, 7]);
      P(g, '#2b1a10', [23, 9, 42, 6, 41, 10, 24, 11]); // comb-over
      R(g, '#ffe600', 26, 15, 4, 3); R(g, '#ffe600', 34, 15, 4, 3);
      R(g, '#2b0000', 27, 22, 10, atk ? 5 : 2);
      R(g, '#fff', 28, 22, 1, 2); R(g, '#fff', 35, 22, 1, 2);
    });
  }

  // --- GYM BRUTE: pink slab of muscle, sweatband, enormous jaws. Charges and bites.
  function brute(pose) {
    return mk(84, 74, g => {
      const step = pose === 1, atk = pose === 2;
      // legs
      R(g, '#d96a92', 22 + (step ? -3 : 3), 52, 14, 18); R(g, '#d96a92', 48 + (step ? 3 : -3), 52, 14, 18);
      R(g, '#222', 20 + (step ? -3 : 3), 68, 18, 6); R(g, '#222', 46 + (step ? 3 : -3), 68, 18, 6);
      R(g, '#111', 20, 46, 44, 10); // shorts
      // body
      E(g, '#f27ba5', 42, 34, 28, 20);
      E(g, '#e0608c', 30, 34, 8, 10); E(g, '#e0608c', 54, 34, 8, 10);
      R(g, '#1d1d1d', 31, 18, 22, 22); R(g, '#f27ba5', 35, 18, 14, 4); // tank top
      // arms
      E(g, '#f27ba5', 10, 36, 9, 16); E(g, '#f27ba5', 74, 36, 9, 16);
      E(g, '#e0608c', 8, 52, 7, 6); E(g, '#e0608c', 76, 52, 7, 6);
      // head + jaws
      E(g, '#f27ba5', 42, 14, 12, 10);
      R(g, '#ffffff', 30, 7, 24, 4); R(g, '#00b0ff', 30, 8, 24, 2);
      R(g, '#000', 36, 12, 3, 3); R(g, '#000', 46, 12, 3, 3);
      const jaw = atk ? 14 : 5;
      R(g, '#5a0018', 33, 18, 18, jaw);
      for (let x = 33; x < 51; x += 3) { P(g, '#fff', [x, 18, x + 3, 18, x + 1.5, 22]); P(g, '#fff', [x, 18 + jaw, x + 3, 18 + jaw, x + 1.5, 14 + jaw]); }
    });
  }

  // --- INFLUENCER SKULL: flaming skull haloed by its own ring light. Dive-bombs you.
  function skull(pose) {
    return mk(56, 56, g => {
      const atk = pose === 2;
      g.strokeStyle = '#fff7fb'; g.lineWidth = 4; g.shadowColor = '#fff'; g.shadowBlur = 6;
      g.beginPath(); g.arc(28, 26, 22, 0, Math.PI * 2); g.stroke(); g.shadowBlur = 0;
      for (let i = 0; i < 5; i++) flame(g, 14 + i * 7, 52 - (i % 2) * 3 - (pose === 1 ? 2 : 0), 4, '#ffb3e1', '#ff2d95');
      E(g, '#f2eee6', 28, 26, 13, 13); R(g, '#f2eee6', 21, 34, 14, 9);
      E(g, atk ? '#ff1744' : '#000', 23, 25, 4, 4); E(g, atk ? '#ff1744' : '#000', 33, 25, 4, 4);
      P(g, '#000', [28, 29, 26, 33, 30, 33]);
      R(g, '#000', 22, atk ? 37 : 39, 12, atk ? 5 : 2);
      for (let x = 23; x < 34; x += 3) R(g, '#f2eee6', x, atk ? 37 : 39, 1, atk ? 5 : 2);
      // selfie stick
      R(g, '#888', 44, 30, 2, 18); R(g, '#222', 41, 26, 8, 5);
    });
  }

  // --- SMILEY ORB: the relentless positivity. One eye. Many teeth. Spits sunshine.
  function orb(pose) {
    return mk(84, 84, g => {
      const atk = pose === 2, bob = pose === 1 ? 1 : 0;
      glow(g, 42, 42 + bob, 42, 'rgba(255,220,60,0.0)');
      E(g, '#ffd21f', 42, 42 + bob, 34, 34);
      E(g, '#ffe066', 32, 30 + bob, 14, 10);
      E(g, '#ff7eb3', 18, 50 + bob, 6, 4); E(g, '#ff7eb3', 66, 50 + bob, 6, 4);
      E(g, '#fff', 42, 26 + bob, 11, 9); E(g, atk ? '#ff1744' : '#3a2a00', 42, 27 + bob, 5, 6); R(g, '#fff', 44, 24 + bob, 2, 2);
      // grin
      g.fillStyle = atk ? '#ff2d95' : '#5a1020';
      g.beginPath(); g.ellipse(42, 50 + bob, 24, atk ? 18 : 12, 0, 0, Math.PI); g.fill();
      if (atk) glow(g, 42, 58 + bob, 12, '#fff6a8', 'rgba(255,45,149,0)');
      for (let x = 20; x < 64; x += 5) {
        P(g, '#fff', [x, 50 + bob, x + 5, 50 + bob, x + 2.5, 56 + bob]);
        const ly = 50 + bob + (atk ? 17 : 11) * Math.sqrt(Math.max(0, 1 - ((x + 2.5 - 42) / 24) ** 2));
        P(g, '#fff', [x, ly, x + 5, ly, x + 2.5, ly - 5]);
      }
    });
  }

  // --- WALLY MAN: from the photo. Fires a spread of "reply-all" notifications from his phone.
  // The photo is a single pose, so the animation is made by warping parts of it:
  // legs swing (stride), the cape ripples, the body bobs and sways, and he leans into attacks.
  function wallyFrames(img, boss) {
    const H = boss ? 240 : 160, W = Math.round(img.width * H / img.height), M = Math.round(W * 0.12), CW = W + M * 2;
    const canvas = (w = CW) => { const c = document.createElement('canvas'); c.width = w; c.height = H; return c; };
    const HIP = 0.46;                      // belt line, as a fraction of height
    const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

    // Re-sample a canvas through a displacement function (nearest pixel; keeps the crisp sprite look)
    function warp(src, fn) {
      const out = canvas(src.width), sg = src.getContext('2d'), og = out.getContext('2d');
      const sd = sg.getImageData(0, 0, src.width, src.height), od = og.createImageData(src.width, src.height);
      const s32 = new Uint32Array(sd.data.buffer), o32 = new Uint32Array(od.data.buffer), w = src.width, h = src.height;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const [dx, dy] = fn((x - M) / W, y / H);
        const sx = Math.round(x - dx * W), sy = Math.round(y - dy * H);
        if (sx >= 0 && sy >= 0 && sx < w && sy < h) o32[y * w + x] = s32[sy * w + sx];
      }
      og.putImageData(od, 0, 0); return out;
    }
    // Draw the photo with a lean (radians, pivoting on his feet), a vertical bob, and a squash
    function pose(lean = 0, bob = 0, squash = 1) {
      const c = canvas(), g = c.getContext('2d');
      g.translate(CW / 2, H); g.rotate(lean); g.translate(-CW / 2, -H);
      const h = H * 0.96 * squash;
      g.drawImage(img, M, H - h - bob * H, W, h);
      return c;
    }
    // stride + cape flutter for a given phase of the walk cycle
    const walkWarp = (ph, stride, flap) => (u, v) => {
      let dx = 0, dy = 0;
      if (v > HIP) dx += Math.sin(ph) * stride * (v - HIP) / (1 - HIP);           // legs swing
      const cape = smooth(0.42, 0.12, u) * smooth(0.22, 0.36, v) * smooth(0.66, 0.56, v); // cape region (left, mid-height)
      if (cape > 0) { dx += Math.sin(ph * 2 + v * 14) * flap * cape; dy += Math.cos(ph * 2 + u * 11) * flap * 0.5 * cape; }
      return [dx, dy];
    };
    const bossify = (c) => {
      if (!boss) return c;
      const g = c.getContext('2d');
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,190,0,0.18)'; g.fillRect(0, 0, c.width, H);
      g.globalCompositeOperation = 'source-over';
      return c;
    };
    const eyes = (c, lean = 0) => { // glowing red eyes behind the goggles (boss only)
      if (!boss) return c;
      const g = c.getContext('2d'); g.save(); g.translate(CW / 2, H); g.rotate(lean); g.translate(-CW / 2, -H);
      const ex = M + W * 0.585, ey = H * 0.04 + H * 0.96 * 0.075;
      E(g, '#ff1a1a', ex - W * 0.03, ey, W * 0.018, H * 0.008); E(g, '#ff1a1a', ex + W * 0.045, ey, W * 0.018, H * 0.008);
      g.restore(); return c;
    };
    const phoneGlow = (c, lean, r, a) => {
      const g = c.getContext('2d'); g.save(); g.translate(CW / 2, H); g.rotate(lean); g.translate(-CW / 2, -H);
      const px = M + W * 0.73, py = H * 0.04 + H * 0.96 * 0.33;
      glow(g, px, py, W * r, `rgba(160,220,255,${a})`, 'rgba(40,120,255,0)');
      E(g, '#ffffff', px, py, W * r * 0.22, W * r * 0.22);
      g.restore(); return c;
    };

    // walk cycle: 6 frames
    const walk = [];
    for (let k = 0; k < 6; k++) {
      const ph = k / 6 * Math.PI * 2;
      const lean = Math.sin(ph) * 0.03, bob = Math.abs(Math.sin(ph)) * 0.025;
      walk.push(fromCanvas(eyes(bossify(warp(pose(lean, bob), walkWarp(ph, 0.09, 0.035))), lean)));
    }
    // idle: breathing, cape stirring
    const idle = [0, 1, 2, 3].map(k => {
      const ph = k / 4 * Math.PI * 2;
      return fromCanvas(eyes(bossify(warp(pose(0, 0, 1 - 0.012 * (1 - Math.cos(ph)) / 2), walkWarp(ph, 0, 0.015)))));
    });
    // attack: lean back and the phone lights up, then lunge forward with the blast
    const wind = phoneGlow(eyes(bossify(warp(pose(0.05, 0), walkWarp(0.5, 0.02, 0.02))), 0.05), 0.05, 0.16, 0.7);
    const fire = phoneGlow(eyes(bossify(warp(pose(-0.06, 0.01), walkWarp(2.5, -0.04, 0.04))), -0.06), -0.06, 0.3, 0.95);
    // pain: knocked back, flash of red
    const painC = tinted(warp(pose(0.09, 0.015), walkWarp(1, -0.03, 0.04)), '#ff0000', 0.45);
    // death: topples backwards onto the floor
    const die = [];
    const DW = Math.round(H * 2.1);
    [[0.25, 0.25], [0.6, 0.4], [1.0, 0.55], [1.35, 0.7], [1.57, 0.8]].forEach(([ang, red], i) => {
      const c = document.createElement('canvas'); c.width = DW; c.height = H;
      const g = c.getContext('2d');
      if (i >= 3) E(g, '#5a0008', DW / 2 - H * 0.45, H - 3, H * 0.5, 4);
      const body = tinted(warp(pose(0, 0), walkWarp(i, 0.04, 0.05)), '#400000', red * 0.6);
      g.save(); g.translate(DW / 2, H); g.rotate(-ang); g.drawImage(body, -CW / 2, -H); g.restore();
      g.globalCompositeOperation = 'source-atop'; splatter(g, DW, H, 6 + i * 6, 31 + i, H * 0.2); g.globalCompositeOperation = 'source-over';
      die.push(fromCanvas(c));
    });
    return { walk, walkFps: 9, idle, attack: [fromCanvas(wind), fromCanvas(fire)], pain: [fromCanvas(painC)], die };
  }

  // ===================== PROJECTILES & EFFECTS =====================
  const ball = (r, inner, outer) => mk(r * 2, r * 2, g => { glow(g, r, r, r, inner, outer); E(g, '#fff', r, r, r * 0.3, r * 0.3); });

  function build(photos) {
    S.enemy = {
      zombie: enemySet(zombie(0), zombie(1), zombie(2)),
      manager: enemySet(manager(0), manager(1), manager(2)),
      brute: enemySet(brute(0), brute(1), brute(2)),
      skull: enemySet(skull(0), skull(1), skull(2)),
      orb: enemySet(orb(0), orb(1), orb(2)),
      wally: wallyFrames(photos.wallyman, false),
      boss: wallyFrames(photos.wallyman, true),
    };

    S.proj = {
      skull: [mk(20, 20, g => { flame(g, 4, 12, 4); E(g, '#f2eee6', 12, 10, 7, 7); R(g, '#000', 8, 8, 3, 3); R(g, '#000', 13, 8, 3, 3); R(g, '#000', 9, 14, 6, 1); })],
      hex: [ball(8, 'rgba(255,170,255,1)', 'rgba(140,40,255,0)'), ball(8, 'rgba(255,120,240,1)', 'rgba(120,20,220,0)')],
      gloom: [mk(48, 48, g => { glow(g, 24, 24, 24, 'rgba(255,60,180,1)', 'rgba(60,0,80,0)'); E(g, '#14001c', 24, 24, 12, 12); E(g, '#ff4fb8', 24, 24, 4, 4); }),
              mk(48, 48, g => { glow(g, 24, 24, 22, 'rgba(200,40,255,1)', 'rgba(60,0,80,0)'); E(g, '#14001c', 24, 24, 13, 13); E(g, '#ff9be0', 24, 24, 3, 3); })],
      memo: [mk(18, 18, g => { flame(g, 9, 6, 5); R(g, '#fffbe6', 3, 6, 12, 10); R(g, '#888', 5, 9, 8, 1); R(g, '#888', 5, 12, 7, 1); })],
      notif: [mk(16, 16, g => { glow(g, 8, 8, 8, 'rgba(120,200,255,0.9)', 'rgba(0,80,255,0)'); R(g, '#1d6fff', 3, 4, 10, 8); E(g, '#ff2a2a', 12, 4, 3, 3); }),
              mk(16, 16, g => { glow(g, 8, 8, 7, 'rgba(180,230,255,0.9)', 'rgba(0,80,255,0)'); R(g, '#3d8bff', 3, 4, 10, 8); E(g, '#ff2a2a', 12, 4, 3, 3); })],
      sun: [ball(10, 'rgba(255,250,170,1)', 'rgba(255,45,149,0)'), ball(10, 'rgba(255,230,120,1)', 'rgba(255,90,40,0)')],
      rocket: [mk(24, 24, g => { glow(g, 12, 12, 12, 'rgba(255,200,80,0.9)', 'rgba(255,60,0,0)'); E(g, '#2a2a30', 12, 12, 6, 6); E(g, '#ff3fa8', 12, 12, 4, 4); E(g, '#fff6c0', 12, 12, 2, 2); }),
               mk(24, 24, g => { glow(g, 12, 12, 11, 'rgba(255,230,120,0.9)', 'rgba(255,90,0,0)'); E(g, '#2a2a30', 12, 12, 6, 6); E(g, '#ff3fa8', 12, 12, 4, 4); })],
      flame: [0, 1, 2].map(k => mk(32, 32, g => {
        glow(g, 16, 17, 16, 'rgba(255,170,40,0.95)', 'rgba(255,40,0,0)');
        for (let i = 0; i < 5; i++) { const a = k * 1.3 + i * 1.26; flame(g, 16 + Math.cos(a) * 6, 22 + Math.sin(a) * 3, 4 + (i % 2) * 2, '#fff2a0', '#ff6a10'); }
        E(g, '#fffbe0', 16, 18, 4, 4);
      })),
      phone: [mk(22, 22, g => { glow(g, 11, 11, 11, 'rgba(255,200,60,0.9)', 'rgba(255,60,0,0)'); R(g, '#111', 7, 3, 8, 16); R(g, '#7fd0ff', 8, 5, 6, 11); })],
    };

    const boom = (r, c1, c2) => mk(r * 2, r * 2, g => { glow(g, r, r, r, c1, c2); });
    S.fx = {
      puff: [mk(8, 8, g => E(g, '#bbb', 4, 4, 3, 3)), mk(8, 8, g => E(g, '#888', 4, 3, 2, 2))],
      blood: [mk(8, 8, g => { E(g, '#c3002a', 4, 4, 3, 3); }), mk(8, 8, g => { E(g, '#8a0010', 3, 5, 2, 2); E(g, '#8a0010', 6, 2, 1, 1); })],
      boom: [boom(16, 'rgba(255,255,200,1)', 'rgba(255,120,0,0.4)'), boom(24, 'rgba(255,200,80,1)', 'rgba(200,40,0,0.3)'), boom(28, 'rgba(255,120,40,0.9)', 'rgba(60,0,0,0)')],
      hexHit: [boom(10, 'rgba(255,200,255,1)', 'rgba(160,40,255,0.3)'), boom(12, 'rgba(220,120,255,0.9)', 'rgba(100,0,200,0)')],
      gloomHit: [boom(32, 'rgba(255,120,220,1)', 'rgba(80,0,120,0.5)'), boom(40, 'rgba(180,40,255,0.9)', 'rgba(20,0,40,0)')],
      flameHit: [boom(10, 'rgba(255,230,140,1)', 'rgba(255,90,0,0.3)'), mk(20, 20, g => { flame(g, 7, 18, 4); flame(g, 13, 18, 5); flame(g, 10, 17, 3, '#fff2a0', '#ff8a20'); }), boom(8, 'rgba(255,120,30,0.7)', 'rgba(80,20,0,0)')],
      splash: [boom(8, 'rgba(230,170,100,1)', 'rgba(140,80,30,0.3)'), boom(10, 'rgba(200,130,70,0.8)', 'rgba(100,60,20,0)')],
    };

    // ===================== DECORATIONS =====================
    S.decor = {
      candelabra: mk(32, 64, g => {
        R(g, '#111', 15, 20, 3, 40); P(g, '#111', [8, 64, 24, 64, 18, 56, 14, 56]);
        R(g, '#111', 4, 20, 25, 3); R(g, '#111', 4, 12, 3, 10); R(g, '#111', 26, 12, 3, 10);
        for (const x of [5, 15, 27]) { R(g, '#eee', x - 1, x === 15 ? 6 : 8, 4, 8); flame(g, x + 1, x === 15 ? 6 : 8, 2); }
      }),
      tombstone: mk(32, 36, g => {
        P(g, '#6b6870', [4, 36, 4, 12, 16, 2, 28, 12, 28, 36]); E(g, '#6b6870', 16, 13, 12, 11);
        R(g, '#4a474f', 9, 16, 14, 2); R(g, '#4a474f', 11, 22, 10, 2); R(g, '#4a474f', 11, 27, 10, 2);
        g.fillStyle = '#2e2c33'; g.font = 'bold 8px serif'; g.textAlign = 'center'; g.fillText('RIP', 16, 14);
        R(g, '#2d4a2b', 0, 33, 32, 3);
      }),
      torch: mk(24, 72, g => {
        R(g, '#3a3440', 6, 24, 12, 48); R(g, '#4a4352', 4, 20, 16, 6); R(g, '#4a4352', 4, 66, 16, 6);
        glow(g, 12, 12, 12, 'rgba(255,90,220,0.9)', 'rgba(120,0,200,0)'); flame(g, 12, 20, 5, '#ffc6f2', '#c03cff');
      }),
      plant: mk(28, 44, g => {
        P(g, '#b5562b', [6, 30, 22, 30, 20, 44, 8, 44]);
        for (let i = 0; i < 9; i++) E(g, i % 2 ? '#2f8f3f' : '#3dab4f', 14 + Math.cos(i) * 8, 16 + Math.sin(i * 2) * 8, 4, 8, i);
      }),
      cooler: mk(24, 56, g => {
        R(g, '#e9e9ef', 4, 24, 16, 32); E(g, '#7fc8ff', 12, 13, 9, 12); R(g, '#a8dcff', 6, 6, 4, 12);
        R(g, '#1d6fff', 8, 30, 3, 3); R(g, '#ff2a2a', 13, 30, 3, 3);
      }),
      barrel: mk(28, 40, g => {
        R(g, '#e8731a', 3, 4, 22, 36); R(g, '#b5530c', 3, 12, 22, 2); R(g, '#b5530c', 3, 30, 22, 2);
        E(g, '#c45f12', 14, 4, 11, 3); E(g, '#3d1d05', 14, 4, 8, 2);
        P(g, '#7a3a0a', [14, 16, 9, 21, 14, 27, 19, 21]); R(g, '#7a3a0a', 13.5, 26, 1, 3); // leaf
        R(g, '#fff4d6', 6, 33, 16, 4);
      }),
      barrelBoom: null,
      skulls: mk(32, 18, g => { for (const [x, y] of [[8, 12], [20, 12], [14, 6], [26, 13]]) { E(g, '#e6e0d2', x, y, 5, 5); R(g, '#000', x - 3, y - 1, 2, 2); R(g, '#000', x + 1, y - 1, 2, 2); } }),
      bloodpool: mk(32, 8, g => { E(g, '#6a000c', 16, 4, 15, 4); E(g, '#9a0018', 12, 4, 6, 2); }),
    };

    // ===================== PICKUPS =====================
    S.item = {
      vial: mk(14, 20, g => { R(g, '#8b5a2b', 5, 0, 4, 3); E(g, '#d0e8ff', 7, 12, 6, 7); E(g, '#e0003a', 7, 13, 5, 5); R(g, '#fff', 4, 9, 2, 2); }),
      heart: mk(24, 22, g => {
        g.fillStyle = '#16020a'; g.beginPath(); g.moveTo(12, 21); g.bezierCurveTo(-6, 8, 4, -4, 12, 6); g.bezierCurveTo(20, -4, 30, 8, 12, 21); g.fill();
        g.strokeStyle = '#ff2d95'; g.lineWidth = 1.5; g.stroke(); R(g, '#ff4fb8', 6, 6, 2, 2);
      }),
      soul: mk(24, 24, g => { glow(g, 12, 12, 12, 'rgba(255,140,230,1)', 'rgba(120,0,255,0)'); E(g, '#fff', 12, 12, 4, 4); }),
      jacket: mk(30, 26, g => {
        P(g, '#1a1a1a', [4, 4, 26, 4, 28, 26, 2, 26]); P(g, '#2a2a2a', [10, 4, 15, 14, 20, 4]);
        R(g, '#c0c0c0', 14, 12, 1, 14); for (let y = 8; y < 24; y += 5) R(g, '#c0c0c0', 6, y, 2, 2);
        R(g, '#ff4fb8', 20, 16, 4, 4);
      }),
      corset: mk(26, 28, g => {
        P(g, '#2b0a1e', [3, 2, 23, 2, 20, 14, 23, 27, 3, 27, 6, 14]);
        for (let y = 5; y < 26; y += 4) { R(g, '#ff4fb8', 9, y, 8, 1); }
        for (const [x, y] of [[3, 2], [23, 2], [3, 27], [23, 27], [6, 14], [20, 14]]) P(g, '#d0d0d0', [x - 2, y, x, y - 4, x + 2, y]);
      }),
      bullets: mk(20, 14, g => { R(g, '#3a2f3f', 1, 5, 18, 9); for (let x = 3; x < 18; x += 4) { R(g, '#d4af37', x, 1, 3, 5); R(g, '#9a7a20', x, 0, 3, 1); } }),
      shells: mk(22, 14, g => { R(g, '#5a0018', 1, 4, 20, 10); for (let x = 3; x < 20; x += 4) { R(g, '#ff2a4a', x, 0, 3, 7); R(g, '#d4af37', x, 5, 3, 2); } }),
      skullsAmmo: mk(22, 16, g => { for (const x of [6, 16]) { E(g, '#f2eee6', x, 9, 5, 6); R(g, '#000', x - 3, 7, 2, 2); R(g, '#000', x + 1, 7, 2, 2); } }),
      rockets: mk(24, 18, g => { for (const x of [5, 12, 19]) { R(g, '#3a3d46', x - 2, 5, 5, 13); P(g, '#ff3fa8', [x - 2, 5, x + 0.5, 0, x + 3, 5]); R(g, '#ffcf3a', x - 2, 14, 5, 2); } }),
      fuel: mk(18, 24, g => { R(g, '#b5170f', 2, 5, 14, 19); R(g, '#d8261c', 4, 5, 4, 19); R(g, '#333', 6, 0, 6, 5); R(g, '#ffcf3a', 4, 12, 10, 5); E(g, '#ff6a10', 9, 14.5, 2, 2); }),
      souls: mk(16, 22, g => { R(g, '#555', 4, 0, 8, 3); E(g, 'rgba(200,220,255,0.9)', 8, 13, 7, 9); glow(g, 8, 13, 6, 'rgba(255,120,230,1)', 'rgba(255,0,200,0)'); }),
      // weapon pickups (side view silhouettes)
      w3: mk(40, 14, g => { R(g, '#222', 2, 4, 26, 3); R(g, '#222', 2, 7, 26, 2); P(g, '#4a2a18', [26, 3, 38, 1, 39, 13, 30, 12, 26, 9]); R(g, '#c0c0c0', 32, 6, 3, 3); }),
      w4: mk(40, 18, g => { for (let i = 0; i < 3; i++) R(g, '#e6e0d2', 2, 4 + i * 3, 22, 2); R(g, '#333', 20, 2, 12, 12); E(g, '#e6e0d2', 4, 8, 4, 5); R(g, '#222', 30, 10, 8, 6); }),
      w5: mk(40, 18, g => { R(g, '#3a3440', 4, 3, 30, 10); E(g, '#f2eee6', 6, 8, 6, 6); R(g, '#000', 3, 6, 2, 2); R(g, '#000', 7, 6, 2, 2); R(g, '#222', 22, 12, 6, 6); }),
      w6: mk(40, 18, g => { R(g, '#2a2a30', 8, 6, 28, 7); glow(g, 8, 9, 8, 'rgba(255,140,255,1)', 'rgba(140,0,255,0)'); R(g, '#d4af37', 14, 4, 2, 11); R(g, '#d4af37', 24, 4, 2, 11); }),
      w8: mk(44, 20, g => { R(g, '#1c1c22', 2, 6, 30, 6); R(g, '#26262e', 14, 4, 16, 10); P(g, '#2a2430', [18, 12, 24, 12, 22, 20, 15, 19]); R(g, '#141418', 30, 6, 12, 5); R(g, '#ff3fa8', 20, 3, 2, 2); }),
      w9: mk(44, 14, g => { R(g, '#18181d', 2, 4, 30, 3); R(g, '#22222a', 4, 7, 22, 2); R(g, '#121014', 8, 6, 10, 6); P(g, '#121014', [30, 3, 42, 2, 42, 12, 32, 10]); R(g, '#cfcfd8', 10, 8, 1, 1); R(g, '#cfcfd8', 14, 8, 1, 1); }),
      w0: mk(48, 22, g => { R(g, '#23252b', 2, 5, 40, 12); E(g, '#ff3fa8', 3, 11, 3, 5); for (let i = 0; i < 4; i++) R(g, i % 2 ? '#111' : '#ffcf3a', 18 + i * 4, 5, 4, 12); R(g, '#18181c', 26, 15, 6, 7); }),
      wF: mk(46, 18, g => { R(g, '#2a2c30', 2, 7, 34, 5); for (let i = 0; i < 6; i++) R(g, '#111', 6 + i * 5, 7, 2, 5); R(g, '#b5170f', 22, 10, 16, 8); E(g, '#ff8a20', 3, 9.5, 3, 3); }),
      w7: mk(48, 26, g => { R(g, '#1a1a1e', 4, 4, 40, 18); glow(g, 14, 13, 10, 'rgba(255,60,180,1)', 'rgba(80,0,120,0)'); E(g, '#14001c', 14, 13, 5, 5); R(g, '#ff4fb8', 30, 8, 10, 2); R(g, '#ff4fb8', 30, 14, 10, 2); }),
    };
    return S;
  }

  return { build, get all() { return S; } };
})();
