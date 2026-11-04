// GOFFICHICK - a gothic retro first-person shooter
// Raycasting engine, enemies, combat, HUD and game flow.
'use strict';

(() => {
  // ------------------------------------------------------------------ constants
  // Height is fixed; the width follows the screen's shape (16:9 up to ~21:9) so a phone held
  // sideways is filled edge to edge. A wider screen shows more to the sides (wider field of
  // view) rather than stretching anything.
  const BASE_W = 480, MAX_W = 640, VIEW_H = 222, HUD_H = 48, H = VIEW_H + HUD_H;
  let W = BASE_W;
  const HOR = VIEW_H / 2;
  const FOV = 70 * Math.PI / 180, PROJ = (BASE_W / 2) / Math.tan(FOV / 2);
  let PLANE = (W / 2) / PROJ;
  const DOOR = 100;
  const TAU = Math.PI * 2;

  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  // The canvas is 3x the game's logical resolution: the 3D world is upscaled with chunky
  // pixels (classic look) while weapons, HUD and text are drawn smooth and detailed.
  const RES = 3;
  const viewC = document.createElement('canvas');
  const viewCtx = viewC.getContext('2d');
  let img, buf, zbuf, occD, occY, occN;
  const OCC = 8; // ledges per screen column that can hide sprites behind them
  // Facebook / Instagram / Messenger's built-in browser never rotates, so there the game draws
  // itself sideways inside the upright page: turning the phone shows it the right way up and
  // filling the screen. Touch input is mapped back into the game's own coordinates.
  // Every other browser rotates normally, so it is left alone.
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const inAppBrowser = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(navigator.userAgent);
  const stage = document.getElementById('stage');
  let sideways = false;
  const toLocal = (x, y) => sideways ? { x: y, y: window.innerWidth - x } : { x, y };
  function fitScreen() {
    const iw = window.innerWidth, ih = window.innerHeight;
    sideways = coarse && inAppBrowser && ih > iw * 1.05;
    if (sideways) Object.assign(stage.style, { inset: 'auto', top: '0px', left: iw + 'px', width: ih + 'px', height: iw + 'px', transform: 'rotate(90deg)', transformOrigin: '0 0' });
    else stage.removeAttribute('style');
    const vw = sideways ? ih : iw, vh = sideways ? iw : ih;
    const nw = clamp(Math.round(H * vw / vh / 2) * 2, BASE_W, MAX_W);
    if (nw !== W || !img) {
      W = nw; PLANE = (W / 2) / PROJ;
      canvas.width = W * RES; canvas.height = H * RES;
      viewC.width = W; viewC.height = VIEW_H;
      img = viewCtx.createImageData(W, VIEW_H); buf = new Uint32Array(img.data.buffer); zbuf = new Float32Array(W);
      occD = new Float32Array(W * OCC); occY = new Int16Array(W * OCC); occN = new Uint8Array(W);
      if (hudBg) buildHudBg();
    }
    const scale = Math.min(vw / W, vh / H);
    canvas.style.width = Math.floor(W * scale) + 'px'; canvas.style.height = Math.floor(H * scale) + 'px';
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const normAng = a => { a %= TAU; return a < 0 ? a + TAU : a; };

  // ------------------------------------------------------------------ enemy + projectile definitions
  // Add new enemy types here (and their art in sprites.js, and a map letter in levels.js).
  const ENEMY_DEFS = {
    zombie: { name: 'Latte Zombie', hp: 20, speed: 1.1, radius: 0.3, h: 0.78, attack: 'hitscan', dmg: [3, 12], pellets: 1, range: 14, cooldown: [1.4, 2.8], pain: 0.85, sight: 'groan', atkSound: 'memo' },
    manager: { name: 'Middle Manager', hp: 60, speed: 1.4, radius: 0.3, h: 0.84, attack: 'proj', proj: 'memo', melee: [6, 16], range: 16, cooldown: [1.2, 2.4], pain: 0.6, sight: 'groan', atkSound: 'memo' },
    wally: { name: 'Wally Man', hp: 90, speed: 1.6, radius: 0.28, h: 0.8, attack: 'proj', proj: 'notif', count: 3, spread: 0.13, range: 18, cooldown: [1.3, 2.4], pain: 0.4, sight: 'phoneRing', atkSound: 'phoneRing' },
    brute: { name: 'Gym Brute', hp: 150, speed: 2.7, radius: 0.4, h: 0.72, attack: 'melee', melee: [8, 24], range: 1.1, cooldown: [0.7, 1.0], pain: 0.5, sight: 'brute', atkSound: 'brute' },
    skull: { name: 'Influencer Skull', hp: 40, speed: 1.7, radius: 0.25, h: 0.36, z: 0.3, fly: true, attack: 'charge', melee: [3, 18], range: 10, cooldown: [1.5, 3], pain: 1, sight: 'skull', atkSound: 'skull' },
    orb: { name: 'Smiley Orb', hp: 300, speed: 1.0, radius: 0.45, h: 0.62, z: 0.25, fly: true, attack: 'proj', proj: 'sun', range: 18, cooldown: [1.5, 3], pain: 0.3, sight: 'giggle', atkSound: 'giggle' },
    boss: { name: 'WALLY PRIME', hp: 2500, speed: 1.5, radius: 0.6, h: 1.55, attack: 'boss', range: 30, cooldown: [0.7, 1.4], pain: 0.04, sight: 'bossRoar', atkSound: 'phoneRing', boss: true },
    barrel: { name: 'Pumpkin Spice Barrel', hp: 20, radius: 0.3, h: 0.5, ai: false },
  };

  const PROJECTILES = {
    skull: { speed: 11, dmg: [20, 60], splash: 1.7, splashDmg: 110, size: 0.22, fx: 'boom', fxSize: 1.0, sound: 'explode', trail: true },
    rocket: { speed: 14, dmg: [20, 60], splash: 1.9, splashDmg: 128, size: 0.2, fx: 'boom', fxSize: 1.15, sound: 'explode', trail: true },
    hex: { speed: 15, dmg: [8, 22], size: 0.14, fx: 'hexHit', fxSize: 0.35, sound: 'hexHit' },
    gloom: { speed: 9, dmg: [100, 220], splash: 2.2, splashDmg: 120, size: 0.55, fx: 'gloomHit', fxSize: 1.6, sound: 'bfgBoom', bfg: true },
    memo: { speed: 6.5, dmg: [5, 18], size: 0.2, fx: 'boom', fxSize: 0.35, sound: 'hexHit' },
    notif: { speed: 8, dmg: [4, 10], size: 0.16, fx: 'hexHit', fxSize: 0.3, sound: 'hexHit' },
    sun: { speed: 6.5, dmg: [10, 26], size: 0.25, fx: 'splash', fxSize: 0.45, sound: 'hexHit' },
    // flamethrower: short-lived, growing gouts of fire that set enemies alight
    flame: { speed: 7.5, dmg: [3, 7], size: 0.16, grow: 2.4, life: 0.5, fx: 'flameHit', fxSize: 0.35, sound: null, ignite: 2.2, quiet: true },
    phone: { speed: 9.5, dmg: [15, 30], splash: 1.4, splashDmg: 50, size: 0.26, fx: 'boom', fxSize: 0.9, sound: 'explode' },
  };

  const STEP = 0.36;            // tallest ledge you can walk straight up (stairs)
  const DIFFS = [
    { name: 'MILDLY GLOOMY', dmg: 0.5, ammo: 2, speed: 0.85, cool: 1.3, hp: 0.8 },
    { name: 'PROPERLY GOTH', dmg: 1, ammo: 1, speed: 1, cool: 1, hp: 1 },
    { name: 'ULTRA GOTH', dmg: 1.5, ammo: 0.75, speed: 1.2, cool: 0.7, hp: 1.25 },
  ];
  const KEYS = {
    red: { name: 'BAT KEY', color: '#ff2a4a', tex: 13 },
    blue: { name: 'SKULL KEY', color: '#3d8bff', tex: 14 },
    gold: { name: 'COFFIN KEY', color: '#ffcf3a', tex: 15 },
  };
  const LOCK_CHARS = { E: 'red', B: 'blue', Q: 'gold' };
  let diff = 1;

  // ------------------------------------------------------------------ state
  let S = null;            // sprite library
  let faces = null;        // HUD face canvases
  let titleImg = null;
  let state = 'loading';
  let levelIndex = 0;
  let L = null;            // current level runtime
  let player = null;
  let msg = '', msgT = 0;
  let automap = false;
  let shake = 0, lightBoost = 0, painFlash = 0, pickupFlash = 0;
  let time = 0, levelTime = 0, stateT = 0;
  let god = false;
  let cheatBuf = '';

  function newPlayer(keep) {
    const p = {
      x: 0, y: 0, a: 0, health: 100, armor: 0, armorType: 0,
      ammo: { bullets: 100, shells: 20, skulls: 8, rockets: 8, souls: 100, fuel: 120 },
      weapons: Object.fromEntries(WEAPONS.map(w => [w.key, true])), cur: 'shotgun', next: null,
      switchT: 0, cooldown: 0, firePhase: 0, fireT: 0, flashT: 0, windupT: 0,
      bobT: 0, move: 0, eyeZ: 0.5, refireT: 0, dead: false, faceLook: 0, faceT: 0, painT: 0, grinT: 0,
      kills: 0, items: 0, secrets: 0, slimeT: 0,
      fz: 0, vz: 0, keys: {}, pw: { veil: 0, shroud: 0, mask: 0 }, berserk: false, rageT: 0,
    };
    if (keep) {
      p.health = keep.health; p.armor = keep.armor; p.armorType = keep.armorType;
      p.ammo = { ...keep.ammo }; p.weapons = { ...keep.weapons }; p.cur = keep.cur;
    }
    return p;
  }
  const weaponByKey = k => WEAPONS.find(w => w.key === k);

  // ------------------------------------------------------------------ level loading
  function loadLevel(i, keep) {
    const def = LEVELS[i];
    const rows = def.map;
    const mw = Math.max(...rows.map(r => r.length)), mh = rows.length;
    const grid = new Int16Array(mw * mh);
    const block = new Uint8Array(mw * mh);
    const seen = new Uint8Array(mw * mh);
    const slime = new Uint8Array(mw * mh);
    const light = new Float32Array(mw * mh).fill(1);
    const fh = new Float32Array(mw * mh);                    // floor height of every tile
    for (const z of def.heights || []) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (x >= 0 && y >= 0 && x < mw && y < mh) fh[y * mw + x] = z.z;
    const liftTile = new Uint8Array(mw * mh);
    const lifts = (def.lifts || []).map(lf => {
      const tiles = [];
      for (let y = lf.y; y < lf.y + lf.h; y++) for (let x = lf.x; x < lf.x + lf.w; x++) { tiles.push(y * mw + x); fh[y * mw + x] = lf.high; liftTile[y * mw + x] = 1; }
      return { tiles, low: lf.low, high: lf.high, h: lf.high, state: 'up', t: 0, onT: 0 };
    });
    const lockAt = new Map();
    for (const z of def.lights || []) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (x >= 0 && y >= 0 && x < mw && y < mh) light[y * mw + x] = z.level;
    L = { def, mw, mh, grid, block, seen, slime, light, fh, lifts, liftTile, ceilH: def.ceilH || 1, stepTex: def.stepTex || 1, lightNow: new Float32Array(light), zones: (def.lights || []).map(z => ({ ...z, on: true })), totalSecrets: 0,
      slimeTex: Textures.flats.slime.data, doors: new Map(), enemies: [], items: [], decor: [], projs: [], fx: [],
      totalKills: 0, totalItems: 0, exitT: -1, flow: null, flowFrom: -1, fog: def.fog,
      floor: Textures.flats[def.floor].data, ceil: Textures.flats[def.ceil].data };
    player = newPlayer(keep);
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        let ch = rows[y][x] ?? '#';
        if (x === 0 || y === 0 || x === mw - 1 || y === mh - 1) { if (!(ch in WALL_CHARS)) ch = '#'; }
        const idx = y * mw + x;
        if (ch in WALL_CHARS) { grid[idx] = WALL_CHARS[ch]; continue; }
        if (ch === 'D') { grid[idx] = DOOR; continue; }
        if (ch in LOCK_CHARS) { grid[idx] = DOOR; lockAt.set(idx, LOCK_CHARS[ch]); continue; }
        if (ch === '$') { grid[idx] = DOOR; L.secretAt = L.secretAt || new Set(); L.secretAt.add(idx); L.totalSecrets++; continue; }
        if (ch === '~') { slime[idx] = 1; continue; }
        const cx = x + 0.5, cy = y + 0.5;
        if ('><^v'.includes(ch)) { player.x = cx; player.y = cy; player.a = { '>': 0, 'v': Math.PI / 2, '<': Math.PI, '^': -Math.PI / 2 }[ch]; }
        else if (ch in ENEMY_CHARS) { spawnEnemy(ENEMY_CHARS[ch], cx, cy); L.totalKills++; }
        else if (ch in ITEM_TYPES) { L.items.push({ x: cx, y: cy, def: ITEM_TYPES[ch], taken: false }); if (!ITEM_TYPES[ch].weapon) L.totalItems++; }
        else if (ch in DECOR_TYPES) {
          const d = DECOR_TYPES[ch];
          if (d.barrel) spawnEnemy('barrel', cx, cy);
          else { L.decor.push({ x: cx, y: cy, def: d }); if (d.block) block[idx] = 1; }
        }
      }
    }
    // doors: orientation from neighbouring walls
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      if (grid[y * mw + x] !== DOOR) continue;
      const solidNS = isWallTile(x, y - 1) && isWallTile(x, y + 1);
      const secret = !!(L.secretAt && L.secretAt.has(y * mw + x));
      // a secret door wears the texture of the wall next to it
      const near = solidNS ? grid[(y - 1) * mw + x] : grid[y * mw + x - 1];
      const lock = lockAt.get(y * mw + x) || null;
      L.doors.set(y * mw + x, { x, y, open: 0, state: 'closed', t: 0, vertical: solidNS, secret, lock, tex: secret ? (near > 0 && near !== DOOR ? near : 1) : lock ? KEYS[lock].tex : 5 });
    }
    player.fz = fh[Math.floor(player.y) * mw + Math.floor(player.x)];
    for (const e of L.enemies) e.fz = fh[Math.floor(e.y) * mw + Math.floor(e.x)];
    levelTime = 0; L.flowFrom = -1;
    Sfx.setSong(i + 1);
    msg = `${def.name}   - music: ${Sfx.songName()}`; msgT = 4;
  }

  function spawnEnemy(type, x, y) {
    const def = ENEMY_DEFS[type];
    L.enemies.push({ type, def, x, y, hp: def.ai === false ? def.hp : Math.round(def.hp * DIFFS[diff].hp), fz: 0, target: null, state: def.ai === false ? 'static' : 'idle', t: 0, atkT: rand(0.5, 1.5),
      frame: 0, animT: rand(0, 1), vx: 0, vy: 0, dead: false, fired: false, seeT: rand(0, 0.3), z: def.z || 0 });
  }

  const isWallTile = (x, y) => { if (x < 0 || y < 0 || x >= L.mw || y >= L.mh) return true; const t = L.grid[y * L.mw + x]; return t > 0 && t !== DOOR; };

  function floorAt(x, y) {
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= L.mw || my >= L.mh) return 0;
    return L.fh[my * L.mw + mx];
  }
  // solid for movement. fz = the mover's feet height: a ledge more than `step` above it blocks.
  function solidAt(x, y, ignoreBlock, fz, step = STEP) {
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= L.mw || my >= L.mh) return true;
    const idx = my * L.mw + mx, t = L.grid[idx];
    if (t === DOOR) return L.doors.get(idx).open < 0.9;
    if (t > 0) return true;
    if (fz !== undefined && L.fh[idx] - fz > step) return true;
    return !ignoreBlock && L.block[idx] === 1;
  }
  // solid for projectiles / line of sight (decorations don't block)
  function opaqueAt(x, y) {
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= L.mw || my >= L.mh) return true;
    const idx = my * L.mw + mx, t = L.grid[idx];
    if (t === DOOR) return L.doors.get(idx).open < 0.7;
    return t > 0;
  }
  function losClear(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 0.2);
    for (let i = 1; i < n; i++) if (opaqueAt(x0 + dx * i / n, y0 + dy * i / n)) return false;
    return true;
  }

  function collides(x, y, r, ignoreBlock, fz, step) {
    return solidAt(x - r, y - r, ignoreBlock, fz, step) || solidAt(x + r, y - r, ignoreBlock, fz, step) || solidAt(x - r, y + r, ignoreBlock, fz, step) || solidAt(x + r, y + r, ignoreBlock, fz, step);
  }
  function tryMove(e, dx, dy, r) {
    let moved = false;
    const step = e.def && e.def.fly ? 0.9 : STEP;
    if (!collides(e.x + dx, e.y, r, false, e.fz, step)) { e.x += dx; moved = true; }
    if (!collides(e.x, e.y + dy, r, false, e.fz, step)) { e.y += dy; moved = true; }
    return moved;
  }

  // ------------------------------------------------------------------ raycasting
  const hit = { dist: 0, tex: 0, u: 0, side: 0, mx: 0, my: 0 };
  function cast(px, py, rdx, rdy) {
    let mx = Math.floor(px), my = Math.floor(py);
    const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
    let stepX, stepY, sdx, sdy, side = 0;
    if (rdx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
    if (rdy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
    let prevDoor = false;
    for (let i = 0; i < 128; i++) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      if (mx < 0 || my < 0 || mx >= L.mw || my >= L.mh) { hit.dist = 64; hit.tex = 1; hit.u = 0; hit.side = side; return hit; }
      const idx = my * L.mw + mx, t = L.grid[idx];
      if (t === 0) { prevDoor = false; continue; }
      if (t === DOOR) {
        const d = L.doors.get(idx);
        if (d.vertical) {
          const tt = (mx + 0.5 - px) / rdx; const hy = py + tt * rdy;
          if (tt > 0 && Math.floor(hy) === my) { const u = hy - my; if (u >= d.open) { hit.dist = tt; hit.tex = d.tex; hit.u = u - d.open; hit.side = 0; hit.mx = mx; hit.my = my; return hit; } }
        } else {
          const tt = (my + 0.5 - py) / rdy; const hx = px + tt * rdx;
          if (tt > 0 && Math.floor(hx) === mx) { const u = hx - mx; if (u >= d.open) { hit.dist = tt; hit.tex = d.tex; hit.u = u - d.open; hit.side = 1; hit.mx = mx; hit.my = my; return hit; } }
        }
        prevDoor = !d.secret; continue;
      }
      const dist = side === 0 ? sdx - ddx : sdy - ddy;
      let u = side === 0 ? py + dist * rdy : px + dist * rdx; u -= Math.floor(u);
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = 1 - u;
      hit.dist = dist; hit.tex = prevDoor ? 10 : t; hit.u = u; hit.side = side; hit.mx = mx; hit.my = my;
      return hit;
    }
    hit.dist = 64; hit.tex = 1; return hit;
  }

  // ------------------------------------------------------------------ rendering
  function render3D() {
    const p = player, dirX = Math.cos(p.a), dirY = Math.sin(p.a);
    const plX = -dirY * PLANE, plY = dirX * PLANE;
    const eyeZ = p.eyeZ;
    const [fr, fg, fb] = L.fog;
    const boost = lightBoost;
    const walls = Textures.walls;
    const mw = L.mw;

    // --- ceiling: one height per level, drawn row by row above the horizon
    const r0x = dirX - plX, r0y = dirY - plY, r1x = dirX + plX, r1y = dirY + plY;
    const floorT = L.floor, ceilT = L.ceil, mh = L.mh, fhm = L.fh, grid = L.grid, ceilH = L.ceilH;
    const lightNow = L.lightNow, slimeMap = L.slime, slimeT = Textures.flats.slimeFrames[((time * 5) | 0) % 4].data, slimeShift = (time * 6) | 0;
    for (let y = 0; y < HOR; y++) {
      const rowDist = (ceilH - eyeZ) * PROJ / (HOR - y - 0.5);
      const s = clamp(1.3 - rowDist * 0.05 + boost, 0.25, 1) * 0.92;
      const stepX = rowDist * (r1x - r0x) / W, stepY = rowDist * (r1y - r0y) / W;
      let fx = p.x + rowDist * r0x, fy = p.y + rowDist * r0y, o = y * W;
      for (let x = 0; x < W; x++, o++) {
        const cx = fx | 0, cy = fy | 0;
        const ls = (cx >= 0 && cy >= 0 && cx < mw && cy < mh) ? lightNow[cy * mw + cx] : 1;
        const c = ceilT[((fy * 64) & 63) * 64 + ((fx * 64) & 63)];
        fx += stepX; fy += stepY;
        const q = s * ls, iq = 1 - q;
        buf[o] = 0xff000000 | (((c >> 16 & 255) * q + fb * iq) << 16) | (((c >> 8 & 255) * q + fg * iq) << 8) | ((c & 255) * q + fr * iq);
      }
    }
    // shade one pixel: texture colour c, brightness q (0..1), blended toward the level's fog
    const put = (o, c, q) => { const iq = 1 - q; buf[o] = 0xff000000 | (((c >> 16 & 255) * q + fb * iq) << 16) | (((c >> 8 & 255) * q + fg * iq) << 8) | ((c & 255) * q + fr * iq); };
    // floor of one tile between two distances along this column's ray; returns the new clip line
    function floorSpan(x, rdx, rdy, idx, h, dNear, dFar, clip) {
      const e = eyeZ - h; if (e <= 0.001) return clip;
      const yA = Math.max(Math.ceil(HOR + e * PROJ / dFar), Math.floor(HOR) + 1);
      const yB = Math.min(dNear < 0.02 ? VIEW_H : Math.ceil(HOR + e * PROJ / dNear), clip);
      const isSlime = slimeMap[idx], tex = isSlime ? slimeT : floorT, ls = isSlime ? Math.max(lightNow[idx], 0.9) : lightNow[idx];
      for (let y = yA, o = yA * W + x; y < yB; y++, o += W) {
        const rowDist = e * PROJ / (y + 0.5 - HOR);
        const wx = p.x + rdx * rowDist, wy = p.y + rdy * rowDist;
        put(o, tex[((wy * 64) & 63) * 64 + ((wx * 64 + (isSlime ? slimeShift : 0)) & 63)], clamp(1.3 - rowDist * 0.05 + boost, 0.25, 1) * ls);
      }
      return Math.min(clip, yA);
    }
    // a vertical surface (wall or the front of a raised floor) from height zLo to zHi at distance d
    function vSpan(x, d, zLo, zHi, texId, u, side, lightIdx, clip, glow) {
      const y0 = Math.max(0, Math.ceil(HOR - (zHi - eyeZ) * PROJ / d)), y1 = Math.min(clip, Math.ceil(HOR + (eyeZ - zLo) * PROJ / d));
      if (y0 >= y1) return Math.min(clip, Math.max(0, y0));
      const tex = (walls[texId] || walls[1]).data, tx = Math.min(63, (u * 64) | 0);
      let q = clamp(1.3 - d * 0.05 + boost, 0.25, 1) * (side ? 0.86 : 1) * (lightIdx >= 0 ? lightNow[lightIdx] : 1);
      if (glow) q = Math.max(q, 0.85);
      const vStep = d / PROJ * 64; let v = (zHi - eyeZ + (y0 + 0.5 - HOR) * d / PROJ) * 64 + (ceilH - zHi) * 64;
      for (let y = y0, o = y0 * W + x; y < y1; y++, o += W, v += vStep) put(o, tex[((v | 0) & 63) * 64 + tx], q);
      return Math.min(clip, y0);
    }
    const occlude = (x, d, y) => { const n = occN[x]; if (n < OCC) { occD[x * OCC + n] = d; occY[x * OCC + n] = y; occN[x] = n + 1; } };

    // --- floors, ledges and walls: walk each column's ray front to back, drawing as it goes
    const startX = Math.floor(p.x), startY = Math.floor(p.y);
    for (let x = 0; x < W; x++) {
      const cam = 2 * x / W - 1, rdx = dirX + plX * cam, rdy = dirY + plY * cam;
      let mx = startX, my = startY;
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      let stepX, stepY, sdx, sdy, side = 0;
      if (rdx < 0) { stepX = -1; sdx = (p.x - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - p.x) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (p.y - my) * ddy; } else { stepY = 1; sdy = (my + 1 - p.y) * ddy; }
      let curIdx = my * mw + mx, curH = fhm[curIdx] || 0, dNear = 0.01, clip = VIEW_H, wallD = 64, prevDoor = false;
      occN[x] = 0;
      for (let i = 0; i < 160 && clip > 0; i++) {
        let d;
        if (sdx < sdy) { d = sdx; sdx += ddx; mx += stepX; side = 0; } else { d = sdy; sdy += ddy; my += stepY; side = 1; }
        clip = floorSpan(x, rdx, rdy, curIdx, curH, dNear, d, clip);
        if (mx < 0 || my < 0 || mx >= mw || my >= mh) { wallD = d; break; }
        const idx = my * mw + mx, t = grid[idx];
        let u = side === 0 ? p.y + d * rdy : p.x + d * rdx; u -= Math.floor(u);
        if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = 1 - u;
        if (t === DOOR) {
          const dr = L.doors.get(idx);
          let tt, du = -1, dside = 0;
          if (dr.vertical) { tt = (mx + 0.5 - p.x) / rdx; const hy = p.y + tt * rdy; if (Math.floor(hy) === my) du = hy - my; dside = 0; }
          else { tt = (my + 0.5 - p.y) / rdy; const hx = p.x + tt * rdx; if (Math.floor(hx) === mx) du = hx - mx; dside = 1; }
          if (curH !== 0) occlude(x, d, clip);
          if (tt > d && du >= dr.open) { // the door panel itself
            clip = floorSpan(x, rdx, rdy, idx, 0, d, tt, clip);
            vSpan(x, tt, 0, ceilH, dr.tex, du - dr.open, dside, curIdx, clip); L.seen[idx] = 1; wallD = tt; break;
          }
          curIdx = idx; curH = 0; dNear = d; prevDoor = !dr.secret; continue;
        }
        if (t > 0) { // solid wall
          vSpan(x, d, curH, ceilH, prevDoor ? 10 : t, u, side, curIdx, clip, t === 7 || t === 11);
          L.seen[idx] = 1; wallD = d; break;
        }
        prevDoor = false;
        const nh = fhm[idx];
        if (nh > curH + 0.001) clip = vSpan(x, d, curH, nh, L.liftTile[idx] ? 10 : L.stepTex, u, side, idx, clip); // step / ledge front
        if (nh !== curH) occlude(x, d, clip);
        curIdx = idx; curH = nh; dNear = d;
      }
      zbuf[x] = wallD;
    }

    // --- sprites
    const list = [];
    const add = (x, y, spr, z, h, bright, wscale, minDepth = 0.15) => {
      const dx = x - p.x, dy = y - p.y;
      const depth = dx * dirX + dy * dirY;
      if (depth < minDepth) return;
      const li = (y | 0) * mw + (x | 0);
      list.push({ dx, dy, depth, spr, z, h, bright, wscale: wscale || 1, light: L.lightNow[li] ?? 1 });
    };
    for (const d of L.decor) add(d.x, d.y, S.decor[d.def.sprite], floorAt(d.x, d.y), d.def.h, d.def.bright);
    for (const it of L.items) if (!it.taken) {
      const spr = S.item[it.def.sprite];
      const bob = it.def.power || it.def.key ? 0.04 + Math.sin(time * 3 + it.x) * 0.03 : 0;
      add(it.x, it.y, spr, floorAt(it.x, it.y) + bob, spr.h / 72, it.def.sprite === 'soul' || it.def.sprite === 'souls' || !!it.def.power || !!it.def.key);
    }
    for (const e of L.enemies) {
      const spr = enemySprite(e);
      const h = e.dead && e.def.ai !== false ? e.def.h * (spr.h / (enemyBase(e).h)) : e.def.h;
      add(e.x, e.y, spr, (e.fz || 0) + (e.dead ? 0 : e.z), h, false);
    }
    for (const pr of L.projs) {
      const fr = pr.frames, size = pr.def.grow ? pr.def.size * (1 + pr.age * pr.def.grow) : pr.def.size;
      add(pr.x, pr.y, fr[((time * 12 + pr.x * 7) | 0) % fr.length], pr.z - size / 2, size, true, 1, 0.5);
    }
    for (const f of L.fx) add(f.x, f.y, f.frames[Math.min(f.frames.length - 1, (f.t / f.life * f.frames.length) | 0)], f.z - f.size / 2, f.size, true, 1, 0.6);
    list.sort((a, b) => b.depth - a.depth);

    for (const sp of list) {
      const spr = sp.spr; if (!spr) continue;
      const tX = (dirX * sp.dy - dirY * sp.dx) / PLANE;
      const depth = sp.depth;
      const sx = (W / 2) * (1 + tX / depth);
      const hPx = sp.h * PROJ / depth;
      const wPx = hPx * spr.w / spr.h * sp.wscale;
      const bottom = HOR + (eyeZ - sp.z) * PROJ / depth;
      const top = bottom - hPx;
      const x0 = Math.max(0, Math.ceil(sx - wPx / 2)), x1 = Math.min(W, Math.ceil(sx + wPx / 2));
      if (x0 >= x1) continue;
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(VIEW_H, Math.ceil(bottom));
      if (y0 >= y1) continue;
      let s = sp.bright ? 1 : clamp(1.3 - depth * 0.05 + boost, 0.3, 1) * sp.light;
      const is = 1 - s, ar = fr * is, ag = fg * is, ab = fb * is;
      const data = spr.data, sw = spr.w, sh = spr.h;
      const uStep = sw / wPx, vStep = sh / hPx;
      const left = sx - wPx / 2;
      for (let x = x0; x < x1; x++) {
        if (zbuf[x] < depth) continue;
        const u = ((x - left) * uStep) | 0;
        if (u < 0 || u >= sw) continue;
        let yEnd = y1; // a nearer ledge hides the lower part of the sprite
        for (let k = 0, n = occN[x]; k < n; k++) if (occD[x * OCC + k] < depth && occY[x * OCC + k] < yEnd) yEnd = occY[x * OCC + k];
        let v = (y0 - top) * vStep;
        let o = y0 * W + x;
        for (let y = y0; y < yEnd; y++, o += W, v += vStep) {
          const c = data[(v | 0) * sw + u];
          if (c === 0) continue;
          buf[o] = 0xff000000 | (((c >> 16 & 255) * s + ab) << 16) | (((c >> 8 & 255) * s + ag) << 8) | ((c & 255) * s + ar);
        }
      }
    }
  }

  function enemyBase(e) { return S.enemy[e.type] ? S.enemy[e.type].walk[0] : S.decor.barrel; }
  function enemySprite(e) {
    if (e.type === 'barrel') return e.dead ? null : S.decor.barrel;
    const set = S.enemy[e.type];
    if (e.dead) return set.die[Math.min(set.die.length - 1, e.frame)];
    if (e.state === 'pain') return set.pain[0];
    if (e.state === 'attack') return set.attack[e.fired ? set.attack.length - 1 : 0];
    if (e.state === 'idle') return set.idle ? set.idle[((e.animT * 2.5) | 0) % set.idle.length] : set.walk[0];
    return set.walk[((e.animT * (set.walkFps || 4)) | 0) % set.walk.length];
  }

  // ------------------------------------------------------------------ weapon + HUD drawing
  function drawWeapon() {
    const p = player;
    const w = weaponByKey(p.cur);
    if (!w || p.dead) return;
    const bobX = Math.cos(p.bobT) * 7 * p.move, bobY = Math.abs(Math.sin(p.bobT)) * 7 * p.move;
    const lower = p.switchT > 0 ? (p.next ? (0.25 - p.switchT) / 0.25 : p.switchT / 0.25) * 120 : 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, VIEW_H); ctx.clip();
    if (p.pw.veil > 0 && (p.pw.veil > 3 || Math.sin(time * 18) > 0)) ctx.globalAlpha = 0.35;
    // weapons are authored at 1x and drawn scaled up around the bottom-centre of the view
    ctx.translate(W / 2 + bobX, VIEW_H + 10 + bobY + lower); ctx.scale(0.8, 0.8);
    w.draw(ctx, 0, 0, p.firePhase, p.flashT > 0, time);
    ctx.restore();
  }

  function digits(n, x, y, size, color = '#e0115f', align = 'center') {
    ctx.font = `${size}px "Metal Mania", Impact, "Arial Black", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000'; ctx.fillText(n, x + 1, y + 1);
    ctx.fillStyle = color; ctx.fillText(n, x, y);
  }
  function label(t, x, y, color = '#c9a6c9', align = 'center', size = 7) {
    ctx.font = `bold ${size}px monospace`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  }

  let hudBg = null;
  function buildHudBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = HUD_H;
    const hx = (W - BASE_W) / 2;
    const g = c.getContext('2d');
    for (let x = 0; x < W; x += 64) g.drawImage(Textures.walls[2].canvas, 0, 0, 64, 48, x, 0, 64, 48);
    g.fillStyle = 'rgba(10,4,14,0.55)'; g.fillRect(0, 0, W, HUD_H);
    g.fillStyle = '#ff3fa8'; g.fillRect(0, 0, W, 1);
    g.fillStyle = '#000'; g.fillRect(0, 1, W, 1);
    const sections = [0, 70, 150, 214, 266, 346, BASE_W].map(v => v + hx);
    for (let i = 0; i < sections.length - 1; i++) {
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(sections[i] + 2, 4, sections[i + 1] - sections[i] - 4, HUD_H - 7);
      g.strokeStyle = '#5c2a5c'; g.strokeRect(sections[i] + 2.5, 4.5, sections[i + 1] - sections[i] - 5, HUD_H - 8);
    }
    hudBg = c;
  }

  function faceCanvas() {
    const p = player;
    if (p.dead) return faces.dead;
    const tier = p.health >= 80 ? 0 : p.health >= 60 ? 1 : p.health >= 40 ? 2 : p.health >= 20 ? 3 : 4;
    if (p.painT > 0) return faces.pain[tier];
    if (p.grinT > 0) return faces.grin;
    if (god) return faces.god;
    return faces.look[p.faceLook][tier];
  }

  function drawHUD() {
    const p = player, y0 = VIEW_H;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(hudBg, 0, y0); ctx.imageSmoothingEnabled = true;
    ctx.save(); ctx.translate((W - BASE_W) / 2, 0);
    const w = weaponByKey(p.cur);
    digits(w && w.ammo ? p.ammo[w.ammo] : '--', 36, y0 + 33, 24);
    label('AMMO', 36, y0 + 43);
    digits(Math.max(0, Math.ceil(p.health)) + '%', 110, y0 + 33, 24);
    label('HEALTH', 110, y0 + 43);
    // arms
    for (let i = 0; i < 7; i++) {
      const slot = i + 2, has = WEAPONS.some(wp => wp.slot === slot && p.weapons[wp.key]);
      const cur = w && w.slot === slot;
      label(String(slot), 161 + (i % 4) * 14, y0 + 17 + Math.floor(i / 4) * 14, cur ? '#ffffff' : has ? '#ff4fb8' : '#4a3a4a', 'center', 11);
    }
    label('ARMS', 182, y0 + 43);
    // face
    const f = faceCanvas();
    if (p.pw.veil > 0) ctx.globalAlpha = 0.45;
    ctx.drawImage(f, 0, 0, f.width, f.height, 217, y0 + 3, 46, HUD_H - 5);
    ctx.globalAlpha = 1;
    Object.keys(KEYS).forEach((k, i) => { // collected keys
      const ky = y0 + 9 + i * 12, kx = 337;
      if (!p.keys[k]) { ctx.strokeStyle = '#3a2a3a'; ctx.strokeRect(kx - 3.5, ky - 3.5, 7, 9); return; }
      ctx.fillStyle = KEYS[k].color; ctx.beginPath(); ctx.arc(kx, ky, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(kx - 0.8, ky, 1.6, 6); ctx.fillRect(kx, ky + 4, 2.2, 1.2);
    });
    digits(Math.ceil(p.armor) + '%', 306, y0 + 33, 24, p.armorType === 2 ? '#b04cff' : '#e0115f');
    label('ARMOR', 306, y0 + 43);
    // ammo table
    let yy = y0 + 10;
    for (const k of Object.keys(AMMO_TYPES)) {
      const isCur = w && w.ammo === k;
      label(AMMO_TYPES[k].name, 352, yy, isCur ? '#ffffff' : '#c9a6c9', 'left', 6.5);
      label(`${p.ammo[k]}/${AMMO_TYPES[k].max}`, 474, yy, '#ffcf3a', 'right', 6.5);
      yy += 7;
    }
    ctx.restore();
  }

  function drawMessages() {
    if (msgT > 0) {
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = '#000'; ctx.fillText(msg, 5, 13);
      ctx.fillStyle = '#ffd0ec'; ctx.fillText(msg, 4, 12);
    }
    if (L.bossRef && !L.bossRef.dead) {
      const b = L.bossRef, fr = b.hp / b.def.hp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 101, 28, 202, 10);
      ctx.fillStyle = '#ff5a1f'; ctx.fillRect(W / 2 - 100, 29, 200 * fr, 8);
      label('WALLY PRIME', W / 2, 26, '#ffcf3a', 'center', 8);
    }
    // power-up timers (top right)
    let px = W - 4;
    for (const [k, nm, col] of [['shroud', 'SHROUD', '#ffffff'], ['veil', 'VEIL', '#b04cff'], ['mask', 'MASK', '#39ff6a']]) {
      const t = player.pw[k]; if (t <= 0) continue;
      if (t < 3 && Math.sin(time * 18) < 0) { px -= 46; continue; }
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(px - 44, 4, 44, 12);
      label(`${nm} ${Math.ceil(t)}`, px - 22, 13, col, 'center', 8); px -= 46;
    }
    if (player.berserk) label('RAGE', W - 4, 26, '#ff2a4a', 'right', 8);
    // crosshair
    ctx.fillStyle = 'rgba(255,80,180,0.75)';
    ctx.fillRect(W / 2 - 1, HOR - 4, 2, 3); ctx.fillRect(W / 2 - 1, HOR + 2, 2, 3);
    ctx.fillRect(W / 2 - 5, HOR - 0.5, 3, 2); ctx.fillRect(W / 2 + 3, HOR - 0.5, 3, 2);
  }

  function drawAutomap() {
    ctx.fillStyle = 'rgba(8,0,12,0.88)'; ctx.fillRect(0, 0, W, VIEW_H);
    const sc = Math.min((W - 20) / L.mw, (VIEW_H - 20) / L.mh);
    const ox = (W - L.mw * sc) / 2, oy = (VIEW_H - L.mh * sc) / 2;
    for (let y = 0; y < L.mh; y++) for (let x = 0; x < L.mw; x++) {
      const idx = y * L.mw + x, t = L.grid[idx];
      if (!L.seen[idx] && !(god)) continue;
      if (t === DOOR && L.doors.get(idx).secret && L.doors.get(idx).open < 0.5) ctx.fillStyle = '#b0307a';
      else if (t === DOOR && L.doors.get(idx).lock) ctx.fillStyle = KEYS[L.doors.get(idx).lock].color;
      else if (t === DOOR) ctx.fillStyle = '#d8d0b0';
      else if (L.liftTile[idx]) ctx.fillStyle = '#7fb0ff';
      else if (L.slime[idx]) { ctx.fillStyle = '#2f6a12'; }
      else if (t === 6 || t === 11) ctx.fillStyle = '#39ff6a';
      else if (t > 0) ctx.fillStyle = '#b0307a';
      else continue;
      ctx.fillRect(ox + x * sc, oy + y * sc, sc - 0.5, sc - 0.5);
    }
    const px = ox + player.x * sc, py = oy + player.y * sc;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(px + Math.cos(player.a) * 6, py + Math.sin(player.a) * 6);
    ctx.lineTo(px + Math.cos(player.a + 2.5) * 4, py + Math.sin(player.a + 2.5) * 4);
    ctx.lineTo(px + Math.cos(player.a - 2.5) * 4, py + Math.sin(player.a - 2.5) * 4); ctx.closePath(); ctx.stroke();
    label('AUTOMAP - ' + L.def.name, W / 2, 12, '#ff9be0', 'center', 9);
  }

  // ------------------------------------------------------------------ faces (HUD portrait from the photo)
  function buildFaces(photos) {
    const mkC = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const blood = (g, n, seed) => {
      let s = seed; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      for (let i = 0; i < n; i++) {
        const x = r() * 64, y = r() * 40, len = 6 + r() * 20;
        g.fillStyle = i % 2 ? '#8a0010' : '#b0001e';
        g.fillRect(x, y, 2, len); g.beginPath(); g.arc(x + 1, y + len, 1.6, 0, 7); g.fill();
      }
    };
    const variant = (src, tier, opts = {}) => {
      const c = mkC(64, 66), g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      if (tier > 0) { g.fillStyle = `rgba(30,0,10,${tier * 0.1})`; g.fillRect(0, 0, 64, 66); blood(g, tier * 3, 11 + tier); }
      if (opts.pain) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,0,0,0.4)'; g.fillRect(0, 0, 64, 66); g.globalCompositeOperation = 'source-over'; }
      if (opts.grin) { // glowing pink eyes
        for (const ex of [26, 41]) { const gr = g.createRadialGradient(ex, 27, 0, ex, 27, 7); gr.addColorStop(0, 'rgba(255,120,220,0.95)'); gr.addColorStop(1, 'rgba(255,0,180,0)'); g.fillStyle = gr; g.fillRect(ex - 7, 20, 14, 14); }
      }
      if (opts.god) { g.strokeStyle = '#ffcf3a'; g.lineWidth = 3; g.strokeRect(1, 1, 62, 64); }
      if (opts.dead) {
        const d = g.getImageData(0, 0, 64, 66);
        for (let i = 0; i < d.data.length; i += 4) { const v = (d.data[i] * 0.3 + d.data[i + 1] * 0.5 + d.data[i + 2] * 0.2) * 0.6; d.data[i] = v + 30; d.data[i + 1] = d.data[i + 2] = v; }
        g.putImageData(d, 0, 0); blood(g, 18, 99);
      }
      return c;
    };
    const looks = [photos.face_c, photos.face_l, photos.face_r];
    faces = {
      look: looks.map(src => [0, 1, 2, 3, 4].map(t => variant(src, t))),
      pain: [0, 1, 2, 3, 4].map(t => variant(photos.face_c, t, { pain: true })),
      grin: variant(photos.face_c, 0, { grin: true }),
      god: variant(photos.face_c, 0, { grin: true, god: true }),
      dead: variant(photos.face_c, 4, { dead: true }),
    };
  }

  // ------------------------------------------------------------------ doors / use
  function useAction() {
    const p = player;
    for (let d = 0.3; d <= 1.6; d += 0.1) {
      const x = p.x + Math.cos(p.a) * d, y = p.y + Math.sin(p.a) * d;
      const mx = Math.floor(x), my = Math.floor(y);
      const idx = my * L.mw + mx, t = L.grid[idx];
      if (t === DOOR) {
        const d = L.doors.get(idx);
        if (d.secret) { if (d.state === 'closed') { d.state = 'opening'; Sfx.play.door(); player.secrets++; msg = 'A secret is revealed!'; msgT = 3; } return; }
        if (d.lock && !p.keys[d.lock]) { lockedMsg(d); return; }
        toggleDoor(d); return;
      }
      if (L.liftTile[idx]) { const lf = L.lifts.find(l => l.tiles.includes(idx)); if (lf && lf.state === 'up') { lf.state = 'lowering'; Sfx.play.door(); } return; }
      if (t === 6) { L.grid[idx] = 11; Sfx.play.switch(); Sfx.play.exit(); L.exitT = 1.0; msg = 'Level complete!'; msgT = 2; return; }
      if (t > 0) { Sfx.play.oof(); return; }
    }
  }
  function lockedMsg(d) {
    msg = `You need the ${KEYS[d.lock].name} to open this door.`; msgT = 2.5;
    Sfx.play.oof();
  }
  function toggleDoor(d, byEnemy) {
    if (d.lock && (byEnemy || !player.keys[d.lock])) return;
    if (d.state === 'closed' || d.state === 'closing') { d.state = 'opening'; Sfx.play.door(); }
    else if (d.state === 'open' && !byEnemy) { d.state = 'closing'; d.t = 0; Sfx.play.door(); }
  }
  function updateDoors(dt) {
    for (const d of L.doors.values()) {
      // doors open by themselves when Goffichick walks up to them
      const near = !player.dead && Math.hypot(player.x - (d.x + 0.5), player.y - (d.y + 0.5)) < 1.6;
      if (d.lock && !player.keys[d.lock]) { // locked: say which key it needs, once per visit
        if (near && !d.warned) { d.warned = true; lockedMsg(d); }
        if (!near && Math.hypot(player.x - (d.x + 0.5), player.y - (d.y + 0.5)) > 2.6) d.warned = false;
        continue;
      }
      if (!d.secret && (d.state === 'closed' || d.state === 'closing') && near) { if (d.state === 'closed') Sfx.play.door(); d.state = 'opening'; }
      if (d.secret && d.state === 'open') continue; // secrets stay open
      if (d.state === 'opening') { d.open += dt * 2.6; if (d.open >= 1) { d.open = 1; d.state = 'open'; d.t = 0; } }
      else if (d.state === 'open') {
        d.t += dt;
        if (d.t > 4) {
          const occupied = (Math.floor(player.x) === d.x && Math.floor(player.y) === d.y) ||
            L.enemies.some(e => !e.dead && Math.floor(e.x) === d.x && Math.floor(e.y) === d.y);
          if (!occupied) { d.state = 'closing'; Sfx.play.door(); } else d.t = 3;
        }
      } else if (d.state === 'closing') {
        const occupied = (Math.floor(player.x) === d.x && Math.floor(player.y) === d.y) ||
          L.enemies.some(e => !e.dead && Math.abs(e.x - (d.x + 0.5)) < 0.9 && Math.abs(e.y - (d.y + 0.5)) < 0.9);
        if (occupied) d.state = 'opening';
        else { d.open -= dt * 1.6; if (d.open <= 0) { d.open = 0; d.state = 'closed'; } }
      }
    }
  }

  // Lifts sit at the top until Goffichick comes near from below; they then sink, wait, and rise
  // again carrying whoever stands on them. Standing still on a raised lift brings it down too.
  function updateLifts(dt) {
    const p = player, here = Math.floor(p.y) * L.mw + Math.floor(p.x);
    for (const lf of L.lifts) {
      const on = lf.tiles.includes(here);
      const near = !p.dead && lf.tiles.some(i => Math.hypot(p.x - (i % L.mw + 0.5), p.y - (((i / L.mw) | 0) + 0.5)) < 2.1);
      // standing still on the raised lift sends it down - but not right after riding it up
      if (!on) lf.rode = false; else if (lf.state === 'raising' || lf.state === 'down' || lf.state === 'lowering') lf.rode = true;
      lf.onT = on && !lf.rode && p.move < 0.1 ? lf.onT + dt : 0;
      if (lf.state === 'up') {
        if ((near && !on && p.fz < lf.high - STEP) || lf.onT > 1.2) { lf.state = 'lowering'; Sfx.play.door(); }
      } else if (lf.state === 'lowering') {
        lf.h -= dt * 1.4; if (lf.h <= lf.low) { lf.h = lf.low; lf.state = 'down'; lf.t = 0; }
      } else if (lf.state === 'down') {
        lf.t += dt; if (lf.t > 2.5) { lf.state = 'raising'; Sfx.play.door(); }
      } else if (lf.state === 'raising') {
        lf.h += dt * 1.1; if (lf.h >= lf.high) { lf.h = lf.high; lf.state = 'up'; }
      }
      for (const i of lf.tiles) L.fh[i] = lf.h;
    }
  }

  // flickering light zones (broken fluorescent tubes, guttering crypt candles)
  function updateLights() {
    for (const z of L.zones) {
      if (!z.flicker) continue;
      const was = z.on;
      if (z.on ? Math.random() < 0.025 : Math.random() < 0.25) z.on = !z.on;
      if (was === z.on) continue;
      const v = z.on ? z.level : z.level * 0.65;
      for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (x >= 0 && y >= 0 && x < L.mw && y < L.mh) L.lightNow[y * L.mw + x] = v;
    }
  }

  // ------------------------------------------------------------------ combat
  function shootables() { return L.enemies.filter(e => !e.dead); }

  function spawnFx(kind, x, y, z, size, life = 0.35) { L.fx.push({ x, y, z, frames: S.fx[kind], size, t: 0, life }); }

  // Pixel-accurate hit test: does a ray passing `lateral` world units to the side of the
  // enemy's centre go through a solid column of the sprite exactly as it is drawn?
  function spriteHit(e, lateral, slack = 0) {
    const spr = enemySprite(e);
    if (!spr) return Math.abs(lateral) < e.def.radius;
    if (!spr.cols) { // which columns of this frame contain any solid pixels
      spr.cols = new Uint8Array(spr.w);
      for (let x = 0; x < spr.w; x++) for (let y = 0; y < spr.h; y++) if (spr.data[y * spr.w + x]) { spr.cols[x] = 1; break; }
    }
    const worldW = e.def.h * spr.w / spr.h;
    const pad = Math.ceil(slack / worldW * spr.w);
    const col = Math.floor((0.5 - lateral / worldW) * spr.w);
    for (let x = col - pad; x <= col + pad; x++) if (x >= 0 && x < spr.w && spr.cols[x]) return true;
    return false;
  }

  function hitscan(ox, oy, ang, dmg, range, fromEnemy) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const wh = cast(ox, oy, c, s);
    const wallDist = Math.min(wh.dist, range);
    let best = null, bestA = wallDist;
    for (const e of shootables()) {
      if (e === fromEnemy) continue;
      const vx = e.x - ox, vy = e.y - oy;
      const along = vx * c + vy * s;
      if (along <= 0 || along >= bestA) continue;
      const lateral = vy * c - vx * s; // + means the enemy is to the right of the shot
      if (Math.abs(lateral) < e.def.h * 1.2 && spriteHit(e, lateral)) { best = e; bestA = along; }
    }
    if (best) {
      damageEnemy(best, dmg, fromEnemy || 'player');
      spawnFx(best.type === 'barrel' ? 'puff' : 'blood', ox + c * (bestA - 0.3), oy + s * (bestA - 0.3), best.z + best.def.h * 0.6, 0.12, 0.3);
      return true;
    }
    if (wallDist < range) spawnFx('puff', ox + c * (wallDist - 0.05), oy + s * (wallDist - 0.05), player.eyeZ + rand(-0.08, 0.08), 0.1, 0.3);
    return false;
  }

  function fireProjectile(kind, x, y, z, ang, owner) {
    const def = PROJECTILES[kind];
    L.projs.push({ kind, def, x: x + Math.cos(ang) * 0.4, y: y + Math.sin(ang) * 0.4, z, vx: Math.cos(ang) * def.speed, vy: Math.sin(ang) * def.speed,
      owner, frames: S.proj[kind], life: def.life || 6, age: 0, fireA: player.a });
  }

  function explode(pr) {
    const d = pr.def;
    spawnFx(d.fx, pr.x, pr.y, pr.z, d.fxSize, d.bfg ? 0.6 : 0.4);
    const pd = Math.hypot(pr.x - player.x, pr.y - player.y);
    if (d.sound) Sfx.play[d.sound] && Sfx.play[d.sound](pd);
    if (d.splash) {
      splash(pr.x, pr.y, d.splash, d.splashDmg, pr.owner);
      if (pd < 4) shake = Math.max(shake, (4 - pd) * 2);
    }
    if (d.bfg) bfgSpray(pr.fireA);
  }

  function splash(x, y, radius, maxDmg, owner) {
    for (const e of shootables()) {
      if (e === owner) continue;
      const dd = Math.hypot(e.x - x, e.y - y) - e.def.radius;
      if (dd < radius && losClear(x, y, e.x, e.y)) damageEnemy(e, maxDmg * (1 - Math.max(0, dd) / radius), owner);
    }
    const pd = Math.hypot(player.x - x, player.y - y) - 0.25;
    if (pd < radius && losClear(x, y, player.x, player.y)) damagePlayer(maxDmg * (1 - Math.max(0, pd) / radius) * (owner === 'player' ? 0.5 : 1), x, y);
  }

  // The B.F.G. tears gloom-tracers through everything you're looking at.
  function bfgSpray(a) {
    for (const e of shootables()) {
      if (e.type === 'barrel') continue;
      const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
      let da = Math.abs(normAng(Math.atan2(dy, dx) - a)); if (da > Math.PI) da = TAU - da;
      if (d < 16 && da < Math.PI / 4 && losClear(player.x, player.y, e.x, e.y)) {
        let dmg = 0; for (let i = 0; i < 15; i++) dmg += irand(1, 8);
        damageEnemy(e, dmg * 3, 'player');
        spawnFx('gloomHit', e.x, e.y, e.z + e.def.h / 2, 0.7, 0.5);
      }
    }
  }

  function damageEnemy(e, dmg, src) {
    if (e.dead) return;
    e.hp -= dmg;
    if (e.type === 'barrel') {
      if (e.hp <= 0) {
        e.dead = true;
        setTimeout(() => { // a beat later, like the real thing
          spawnFx('boom', e.x, e.y, 0.3, 1.1, 0.45);
          Sfx.play.explode(Math.hypot(e.x - player.x, e.y - player.y));
          splash(e.x, e.y, 1.8, 120, src);
          const pd = Math.hypot(e.x - player.x, e.y - player.y); if (pd < 4) shake = Math.max(shake, (4 - pd) * 2);
        }, 120);
      }
      return;
    }
    const pd = Math.hypot(e.x - player.x, e.y - player.y);
    // infighting: a monster hurt by a different kind of monster turns on it
    if (src && typeof src === 'object' && src !== e && !src.dead && src.type !== e.type && src.type !== 'barrel') e.target = src;
    else if (src === 'player') e.target = null;
    if (e.state === 'idle') wake(e);
    if (e.hp <= 0) {
      e.dead = true; e.state = 'dead'; e.frame = 0; e.t = 0;
      Sfx.play[e.def.boss ? 'bossRoar' : 'enemyDie'](pd);
      player.kills++;
      if (e.def.boss) { L.bossDeadT = 3; msg = 'WALLY PRIME HAS BEEN UNSUBSCRIBED!'; msgT = 4; }
      return;
    }
    if (Math.random() < e.def.pain && e.state !== 'attack-charge') { e.state = 'pain'; e.t = 0.22; Sfx.play.enemyPain(pd); }
  }

  function damagePlayer(dmg, fromX, fromY) {
    const p = player;
    if (p.dead || god || state !== 'playing' || p.pw.shroud > 0) return;
    dmg = Math.round(dmg * DIFFS[diff].dmg);
    if (p.armor > 0) {
      const absorb = Math.min(p.armor, Math.floor(dmg * (p.armorType === 2 ? 0.5 : 0.333)));
      p.armor -= absorb; dmg -= absorb; if (p.armor <= 0) p.armorType = 0;
    }
    p.health -= dmg;
    painFlash = Math.min(1, painFlash + dmg / 30);
    p.painT = 0.35;
    if (fromX !== undefined) {
      let da = normAng(Math.atan2(fromY - p.y, fromX - p.x) - p.a); if (da > Math.PI) da -= TAU;
      p.faceLook = Math.abs(da) < 0.5 ? 0 : da < 0 ? 1 : 2; p.faceT = 1;
    }
    if (p.health <= 0) {
      p.health = 0; p.dead = true; Sfx.play.playerDie(); state = 'dead'; stateT = 0;
    } else Sfx.play.playerPain();
  }

  function wake(e) {
    if (e.state !== 'idle') return;
    e.state = 'chase'; e.atkT = rand(0.4, 1.2);
    const pd = Math.hypot(e.x - player.x, e.y - player.y);
    Sfx.play[e.def.sight] && Sfx.play[e.def.sight](pd);
    if (e.def.boss) { L.bossRef = e; }
  }

  // noise from the player's gun wakes nearby monsters
  function makeNoise() {
    for (const e of L.enemies) if (!e.dead && e.state === 'idle' && Math.hypot(e.x - player.x, e.y - player.y) < 10) wake(e);
  }

  // ------------------------------------------------------------------ AI
  // Breadth-first "flow field" from the player so monsters can chase around corners and through doors.
  function updateFlow() {
    const pt = Math.floor(player.y) * L.mw + Math.floor(player.x);
    if (pt === L.flowFrom) return;
    L.flowFrom = pt;
    const n = L.mw * L.mh;
    const dist = L.flow && L.flow.length === n ? L.flow : new Int16Array(n);
    dist.fill(-1);
    const q = new Int32Array(n); let h = 0, t = 0;
    q[t++] = pt; dist[pt] = 0;
    while (h < t) {
      const c = q[h++], cx = c % L.mw, cy = (c / L.mw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= L.mw || ny >= L.mh) continue;
        const ni = ny * L.mw + nx;
        if (dist[ni] !== -1) continue;
        const tile = L.grid[ni];
        if ((tile > 0 && tile !== DOOR) || L.block[ni]) continue;
        if (tile === DOOR) { const dr = L.doors.get(ni); if ((dr.secret || dr.lock) && dr.open < 0.9) continue; }
        if (Math.abs(L.fh[ni] - L.fh[c]) > STEP) continue;
        dist[ni] = dist[c] + 1; q[t++] = ni;
      }
    }
    L.flow = dist;
  }

  function enemyMoveDir(e) {
    const mx = Math.floor(e.x), my = Math.floor(e.y), here = L.flow ? L.flow[my * L.mw + mx] : -1;
    const pdx = player.x - e.x, pdy = player.y - e.y, pd = Math.hypot(pdx, pdy);
    if (here <= 1 || here === -1 && pd < 3) return [pdx / pd, pdy / pd];
    let best = null, bestD = here;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = mx + dx, ny = my + dy, ni = ny * L.mw + nx;
      const d = L.flow[ni];
      if (d < 0 || d >= bestD) continue;
      if (dx && dy && (L.flow[my * L.mw + nx] < 0 || L.flow[ny * L.mw + mx] < 0)) continue;
      best = [nx + 0.5 - e.x, ny + 0.5 - e.y]; bestD = d;
    }
    if (!best) return [pdx / pd, pdy / pd];
    const bl = Math.hypot(best[0], best[1]) || 1;
    return [best[0] / bl, best[1] / bl];
  }

  function enemyAttack(e) {
    const d = e.def, p = player, tg = e.target && !e.target.dead ? e.target : null;
    const tx = tg ? tg.x : p.x, ty = tg ? tg.y : p.y;
    const pd = Math.hypot(tx - e.x, ty - e.y), playerDist = Math.hypot(p.x - e.x, p.y - e.y);
    const veiled = !tg && p.pw.veil > 0;              // Shadow Veil: monsters can barely see her
    const ang = Math.atan2(ty - e.y, tx - e.x) + (veiled ? rand(-0.5, 0.5) : 0);
    const z = (e.fz || 0) + e.z + d.h * 0.6;
    const hurt = dmg => tg ? damageEnemy(tg, dmg, e) : damagePlayer(dmg, e.x, e.y);
    Sfx.play[d.atkSound] && Sfx.play[d.atkSound](playerDist);
    if (d.attack === 'hitscan') {
      // a monster standing in the line of fire takes the hit instead (and gets angry)
      const c = Math.cos(ang), s = Math.sin(ang);
      let blocker = null, best = pd;
      for (const o of shootables()) {
        if (o === e || o === tg || o.type === 'barrel') continue;
        const vx = o.x - e.x, vy = o.y - e.y, along = vx * c + vy * s;
        if (along > 0.3 && along < best && Math.abs(vy * c - vx * s) < o.def.radius) { blocker = o; best = along; }
      }
      const acc = clamp(1 - pd / 16, 0.15, 0.6) * (veiled ? 0.25 : 1);
      if (blocker) damageEnemy(blocker, irand(d.dmg[0], d.dmg[1]), e);
      else if (Math.random() < (tg ? 0.7 : acc) && losClear(e.x, e.y, tx, ty)) hurt(irand(d.dmg[0], d.dmg[1]));
      spawnFx('splash', e.x + Math.cos(ang) * 0.5, e.y + Math.sin(ang) * 0.5, z, 0.25, 0.25);
    } else if (d.attack === 'proj' || d.attack === 'melee') {
      if (d.melee && pd < d.radius + 0.95) { hurt(irand(d.melee[0], d.melee[1])); Sfx.play.punch(); return; }
      if (d.attack === 'melee') return;
      const n = d.count || 1;
      for (let i = 0; i < n; i++) fireProjectile(d.proj, e.x, e.y, z, ang + (i - (n - 1) / 2) * (d.spread || 0), e);
    } else if (d.attack === 'boss') {
      const enraged = e.hp < d.hp / 2, bz = (e.fz || 0) + 0.6;
      if (Math.random() < 0.5) {
        fireProjectile('phone', e.x, e.y, bz, ang, e);
        if (enraged) { fireProjectile('phone', e.x, e.y, bz, ang - 0.25, e); fireProjectile('phone', e.x, e.y, bz, ang + 0.25, e); }
      } else {
        const n = enraged ? 7 : 5;
        for (let i = 0; i < n; i++) fireProjectile('notif', e.x, e.y, bz, ang + (i - (n - 1) / 2) * 0.12, e);
      }
    }
  }

  function updateEnemies(dt) {
    updateFlow();
    const p = player;
    for (const e of L.enemies) {
      e.animT += dt;
      if (e.dead) {
        if (e.type !== 'barrel' && e.frame < S.enemy[e.type].die.length - 1) { e.t += dt; if (e.t > 0.12) { e.t = 0; e.frame++; } }
        continue;
      }
      if (e.burnT > 0) { // on fire: damage ticks and flickering flames
        e.burnT -= dt; e.burnTick = (e.burnTick || 0) - dt;
        if (e.burnTick <= 0) { e.burnTick = 0.3; Sfx.play.burn(Math.hypot(e.x - player.x, e.y - player.y)); damageEnemy(e, irand(2, 5), e.burnBy || 'player'); spawnFx('flameHit', e.x + rand(-0.15, 0.15), e.y + rand(-0.15, 0.15), e.z + e.def.h * rand(0.3, 0.8), 0.3, 0.3); }
        if (e.dead) continue;
      }
      if (e.state === 'static') continue;
      const d = e.def;
      if (e.target && e.target.dead) e.target = null;
      const tg = e.target;
      const pdx = (tg ? tg.x : p.x) - e.x, pdy = (tg ? tg.y : p.y) - e.y, pd = Math.hypot(pdx, pdy) || 0.001;
      const sk = DIFFS[diff];
      if (e.state === 'idle') {
        e.seeT -= dt;
        if (e.seeT <= 0) { e.seeT = 0.3; if (pd < (p.pw.veil > 0 ? 6 : 22) && losClear(e.x, e.y, p.x, p.y)) wake(e); }
        continue;
      }
      if (e.state === 'pain') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; continue; }
      if (e.state === 'attack') {
        e.t -= dt;
        if (!e.fired && e.t < 0.22) { e.fired = true; if (!p.dead) enemyAttack(e); }
        if (e.t <= 0) { e.state = 'chase'; e.atkT = rand(d.cooldown[0], d.cooldown[1]) * sk.cool * (d.boss && e.hp < d.hp / 2 ? 0.6 : 1); }
        continue;
      }
      if (e.state === 'attack-charge') { // influencer skull dive
        e.t -= dt;
        const steps = 3;
        for (let i = 0; i < steps; i++) {
          const nx = e.x + e.vx * dt / steps, ny = e.y + e.vy * dt / steps;
          const hx = tg ? tg.x : p.x, hy = tg ? tg.y : p.y;
          if (Math.hypot(hx - nx, hy - ny) < d.radius + (tg ? tg.def.radius : 0.3)) { const dm = irand(d.melee[0], d.melee[1]); if (tg) damageEnemy(tg, dm, e); else damagePlayer(dm, e.x, e.y); e.state = 'chase'; e.atkT = rand(1, 2); break; }
          if (collides(nx, ny, d.radius, true, e.fz, 0.9)) { e.state = 'chase'; e.atkT = rand(1, 2); break; }
          e.x = nx; e.y = ny;
        }
        if (e.t <= 0) { e.state = 'chase'; e.atkT = rand(d.cooldown[0], d.cooldown[1]) * sk.cool; }
        continue;
      }
      // chase
      e.atkT -= dt;
      if (e.atkT <= 0 && !p.dead) {
        const inMelee = d.attack === 'melee' ? pd < d.radius + 0.95 : true;
        if (inMelee && pd < d.range && losClear(e.x, e.y, e.x + pdx, e.y + pdy)) {
          if (d.attack === 'charge') {
            e.state = 'attack-charge'; e.t = 1.3; e.vx = pdx / pd * 7; e.vy = pdy / pd * 7;
            Sfx.play.skull(pd); continue;
          }
          e.state = 'attack'; e.t = 0.5; e.fired = false; continue;
        }
        e.atkT = 0.2;
      }
      // move
      const keepDist = d.attack === 'melee' || d.attack === 'charge' ? d.radius + 0.55 : 1.4;
      if (pd > keepDist) {
        const [mx, my] = tg ? [pdx / pd, pdy / pd] : enemyMoveDir(e);
        const sp = d.speed * sk.speed * dt;
        const nx = e.x + mx * sp, ny = e.y + my * sp;
        // open doors in the way
        const ti = Math.floor(ny) * L.mw + Math.floor(nx);
        if (L.grid[ti] === DOOR) { const dr = L.doors.get(ti); if (dr.open < 0.9 && !dr.secret) toggleDoor(dr, true); }
        if (!tryMove(e, mx * sp, my * sp, d.radius * 0.8)) e.atkT = Math.min(e.atkT, 0.1);
        e.fz = floorAt(e.x, e.y);
      }
    }
    // keep monsters from stacking
    const live = L.enemies.filter(e => !e.dead && e.type !== 'barrel');
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.def.radius + b.def.radius) * 0.9;
      if (d > 0.001 && d < min) {
        const push = (min - d) / 2, ux = dx / d * push, uy = dy / d * push;
        if (!collides(a.x - ux, a.y - uy, a.def.radius * 0.8)) { a.x -= ux; a.y -= uy; }
        if (!collides(b.x + ux, b.y + uy, b.def.radius * 0.8)) { b.x += ux; b.y += uy; }
      }
    }
  }

  function updateProjectiles(dt) {
    const p = player;
    for (const pr of L.projs) {
      pr.life -= dt; pr.age += dt;
      const steps = 4;
      for (let i = 0; i < steps && !pr.done; i++) {
        const nx = pr.x + pr.vx * dt / steps, ny = pr.y + pr.vy * dt / steps;
        if (opaqueAt(nx, ny) || pr.z < floorAt(nx, ny) - 0.02) { explode(pr); pr.done = true; break; }
        pr.x = nx; pr.y = ny;
        if (pr.owner !== 'player') {
          if (Math.hypot(p.x - pr.x, p.y - pr.y) < 0.3 + pr.def.size / 2) {
            damagePlayer(irand(pr.def.dmg[0], pr.def.dmg[1]), pr.x - pr.vx, pr.y - pr.vy); explode(pr); pr.done = true; break;
          }
        }
        for (const e of L.enemies) {
          if (e.dead || e === pr.owner) continue;
          if (pr.owner !== 'player' && e.type !== 'barrel' && pr.owner.type === e.type) continue; // same kind don't hurt each other
          if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.def.radius + pr.def.size / 2) {
            damageEnemy(e, irand(pr.def.dmg[0], pr.def.dmg[1]), pr.owner);
            if (pr.def.ignite && !e.dead) { e.burnT = Math.max(e.burnT || 0, pr.def.ignite); e.burnBy = pr.owner; }
            explode(pr); pr.done = true; break;
          }
        }
      }
      if (pr.def.trail && Math.random() < 0.6) spawnFx('puff', pr.x, pr.y, pr.z, 0.08, 0.3);
      if (pr.life <= 0) { if (pr.def.quiet && !pr.done) spawnFx('flameHit', pr.x, pr.y, pr.z, pr.def.size * (1 + pr.age * pr.def.grow), 0.25); pr.done = true; }
    }
    L.projs = L.projs.filter(pr => !pr.done);
    for (const f of L.fx) f.t += dt;
    L.fx = L.fx.filter(f => f.t < f.life);
  }

  // ------------------------------------------------------------------ player
  const keys = {};
  let mouseDX = 0, fireHeld = false;
  const touch = { mx: 0, my: 0, turn: 0, fire: false };

  function switchWeapon(key) {
    const p = player;
    if (!p.weapons[key] || p.cur === key || p.next) return;
    p.next = key; p.switchT = 0.25;
  }
  function weaponSlot(slot) {
    const p = player;
    const options = WEAPONS.filter(w => w.slot === slot && p.weapons[w.key]);
    if (!options.length) return;
    const curIdx = options.findIndex(w => w.key === p.cur);
    switchWeapon(options[(curIdx + 1) % options.length].key);
  }
  function cycleWeapon(dir) {
    const p = player;
    const owned = WEAPONS.filter(w => p.weapons[w.key]);
    let i = owned.findIndex(w => w.key === p.cur);
    for (let k = 0; k < owned.length; k++) {
      i = (i + dir + owned.length) % owned.length;
      const w = owned[i];
      if (!w.ammo || p.ammo[w.ammo] >= w.cost) { switchWeapon(w.key); return; }
    }
  }
  function bestWeapon() {
    const p = player;
    const order = ['gatling', 'machinegun', 'coffin', 'shotgun', 'hexcaster', 'flamethrower', 'pistol', 'rocketlauncher', 'launcher', 'bfg', 'knuckles'];
    for (const k of order) { const w = weaponByKey(k); if (w && p.weapons[k] && (!w.ammo || p.ammo[w.ammo] >= w.cost)) return k; }
    return 'knuckles';
  }

  function doFire(w) {
    const p = player;
    if (w.ammo) p.ammo[w.ammo] -= w.cost;
    Sfx.play[w.sound] && Sfx.play[w.sound]();
    if (w.after) setTimeout(() => Sfx.play[w.after](), 350);
    p.flashT = w.type === 'melee' ? 0 : 0.07;
    if (w.type !== 'melee') { lightBoost = 0.25; makeNoise(); }
    if (w.kick) shake = Math.max(shake, w.kick * 0.5);
    if (w.type === 'melee') {
      const c = Math.cos(p.a), s = Math.sin(p.a);
      let best = null, bestA = w.range;
      for (const e of shootables()) {
        const vx = e.x - p.x, vy = e.y - p.y, along = vx * c + vy * s;
        if (along <= 0 || along > bestA + e.def.radius) continue;
        if (spriteHit(e, vy * c - vx * s, 0.08)) { best = e; bestA = along; }
      }
      if (best) { damageEnemy(best, irand(w.damage[0], w.damage[1]) * (p.berserk ? 10 : 1), 'player'); if (p.berserk) shake = Math.max(shake, 2); Sfx.play.punch(); spawnFx('blood', best.x - c * 0.3, best.y - s * 0.3, best.z + best.def.h * 0.6, 0.12, 0.3); }
      else Sfx.play.swing();
    } else if (w.type === 'hitscan') {
      const accurate = w.pellets === 1 && p.refireT <= 0;
      for (let i = 0; i < w.pellets; i++) hitscan(p.x, p.y, p.a + (accurate ? 0 : rand(-w.spread, w.spread)), irand(w.damage[0], w.damage[1]), 40);
    } else if (w.type === 'projectile') {
      fireProjectile(w.projectile, p.x, p.y, p.eyeZ - 0.12, p.a + (w.projSpread ? rand(-w.projSpread, w.projSpread) : 0), 'player');
    }
    p.refireT = 0.5;
  }

  function updatePlayer(dt) {
    const p = player;
    if (p.dead) { p.eyeZ = Math.max(p.fz + 0.12, p.eyeZ - dt * 0.6); return; }
    // turning
    const turnSpeed = 2.8;
    if (keys.ArrowLeft) p.a -= turnSpeed * dt;
    if (keys.ArrowRight) p.a += turnSpeed * dt;
    p.a += mouseDX * 0.0028 + touch.turn; mouseDX = 0; touch.turn = 0;
    p.a = normAng(p.a);
    // movement
    let fwd = 0, str = 0;
    if (keys.KeyW || keys.ArrowUp) fwd += 1;
    if (keys.KeyS || keys.ArrowDown) fwd -= 1;
    if (keys.KeyD) str += 1;
    if (keys.KeyA) str -= 1;
    fwd += touch.my; str += touch.mx;
    const len = Math.hypot(fwd, str);
    if (len > 1) { fwd /= len; str /= len; }
    const speed = (keys.ShiftLeft || keys.ShiftRight ? 6.5 : 4.4) * dt;
    const c = Math.cos(p.a), s = Math.sin(p.a);
    const dx = (c * fwd - s * str) * speed, dy = (s * fwd + c * str) * speed;
    if (dx || dy) tryMove(p, dx, dy, 0.24);
    const moving = Math.min(1, Math.hypot(fwd, str));
    p.move += (moving - p.move) * Math.min(1, dt * 8);
    p.bobT += dt * 9 * p.move;
    // climb stairs smoothly, ride lifts, and drop off ledges with a little gravity
    const ground = floorAt(p.x, p.y);
    if (ground > p.fz) { p.fz = Math.min(ground, p.fz + dt * 2.8); p.vz = 0; }
    else if (ground < p.fz) { p.vz -= 9.8 * dt; p.fz = Math.max(ground, p.fz + p.vz * dt); if (p.fz <= ground) p.vz = 0; }
    p.eyeZ = p.fz + 0.5 + Math.sin(p.bobT * 2) * 0.012 * p.move;
    for (const k in p.pw) if (p.pw[k] > 0) { p.pw[k] -= dt; if (p.pw[k] <= 0) { p.pw[k] = 0; msg = { veil: 'The Shadow Veil fades.', shroud: 'The Night Shroud fades.', mask: 'The gas mask runs out.' }[k]; msgT = 2; } }
    p.rageT = Math.max(0, p.rageT - dt);

    // toxic slime burns
    if (L.slime[Math.floor(p.y) * L.mw + Math.floor(p.x)] && p.pw.mask <= 0 && p.fz < 0.05) {
      p.slimeT -= dt;
      if (p.slimeT <= 0) { p.slimeT = 1; damagePlayer(5); }
    } else p.slimeT = 0.4;

    // pickups
    for (const it of L.items) {
      if (it.taken || Math.hypot(it.x - p.x, it.y - p.y) > 0.55) continue;
      if (pickup(it.def)) { it.taken = true; if (!it.def.weapon) p.items++; pickupFlash = 0.35; }
    }

    // weapon switching
    if (p.switchT > 0) {
      p.switchT -= dt;
      if (p.switchT <= 0 && p.next) { p.cur = p.next; p.next = null; p.switchT = 0.25; }
      if (p.switchT < 0) p.switchT = 0;
    }
    const w = weaponByKey(p.cur);
    p.cooldown -= dt; p.flashT -= dt; p.refireT -= dt;
    if (p.windupT > 0) {
      p.windupT -= dt;
      if (p.windupT <= 0) doFire(w);
    }
    const trigger = fireHeld || keys.ControlLeft || keys.ControlRight || touch.fire || touch.fireTap;
    if (trigger && p.cooldown <= 0 && p.switchT <= 0 && p.windupT <= 0) {
      touch.fireTap = false;
      if (w.ammo && p.ammo[w.ammo] < w.cost) {
        Sfx.play.empty(); p.cooldown = 0.3;
        const b = bestWeapon(); if (b !== p.cur) switchWeapon(b);
      } else {
        p.cooldown = w.cooldown; p.fireT = 0;
        if (w.windup) { p.windupT = w.windup; Sfx.play[w.windupSound](); p.cooldown = w.cooldown + w.windup; }
        else doFire(w);
      }
    }
    // fire animation phase 0..1
    if (p.cooldown > 0) { const total = w.cooldown + (w.windup || 0); p.firePhase = clamp(1 - p.cooldown / total, 0.001, 1); if (p.firePhase >= 1) p.firePhase = 0; }
    else p.firePhase = 0;

    // HUD face: glance around while idle
    p.faceT -= dt; if (p.faceT <= 0) { p.faceT = rand(0.8, 2); p.faceLook = Math.random() < 0.6 ? 0 : irand(1, 2); }
    p.painT -= dt; p.grinT -= dt;
  }

  function pickup(def) { // eslint-disable-line no-param-reassign
    const p = player;
    let used = false;
    if (def.health) {
      const max = def.overheal ? 200 : 100;
      if (p.health < max) { p.health = Math.min(max, p.health + def.health); used = true; }
    }
    if (def.armor) {
      if (p.armor < def.armor) { p.armor = def.armor; p.armorType = def.armorType; used = true; }
    }
    if (def.key) { p.keys[def.key] = true; used = true; }
    if (def.power) { p.pw[def.power] = def.time; used = true; p.grinT = 1.5; }
    if (def.berserk) { p.berserk = true; p.rageT = 10; p.health = Math.max(p.health, 100); used = true; switchWeapon('knuckles'); }
    if (def.weapon) {
      const w = weaponByKey(def.weapon);
      if (!p.weapons[def.weapon]) { p.weapons[def.weapon] = true; switchWeapon(def.weapon); p.grinT = 1.5; Sfx.play.weaponUp(); msg = `You got the ${w.name}!`; msgT = 3; used = true; }
      else def = { ...def, msg: `Picked up ammo for the ${w.name}.`, weapon: null };
    }
    if (def.ammo) {
      for (const [k, v] of Object.entries(def.ammo)) {
        if (p.ammo[k] < AMMO_TYPES[k].max) { p.ammo[k] = Math.min(AMMO_TYPES[k].max, p.ammo[k] + Math.max(1, Math.round(v * DIFFS[diff].ammo))); used = true; }
      }
    }
    if (used) {
      if (!def.weapon) { (def.power || def.berserk || def.key ? Sfx.play.weaponUp : Sfx.play.pickup)(); msg = def.msg; msgT = 2.5; }
    }
    return used;
  }

  // ------------------------------------------------------------------ cheats
  const CHEATS = {
    gothmode: () => { god = !god; return god ? 'GOTH MODE: invulnerable to positivity.' : 'Goth mode off.'; },
    allblack: () => { for (const w of WEAPONS) player.weapons[w.key] = true; for (const k in AMMO_TYPES) player.ammo[k] = AMMO_TYPES[k].max; player.armor = 200; player.armorType = 2; return 'ALL BLACK EVERYTHING. Full arsenal.'; },
    nightfall: () => { completeLevel(); return 'Skipping level...'; },
  };
  function cheatKey(ch) {
    cheatBuf = (cheatBuf + ch).slice(-12);
    for (const [code, fn] of Object.entries(CHEATS)) if (cheatBuf.endsWith(code)) { msg = fn(); msgT = 3; cheatBuf = ''; }
  }

  // ------------------------------------------------------------------ game flow
  let carry = null, interStats = null;
  // Progress is saved on this device at the start of every level, so the title screen can offer
  // CONTINUE. (Browser storage can be unavailable, e.g. private windows - then it simply isn't offered.)
  const SAVE_KEY = 'goffichick-save-v1', DIFF_KEY = 'goffichick-difficulty';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  { const d = store.get(DIFF_KEY); if (d === 0 || d === 1 || d === 2) diff = d; }
  function saveProgress() { store.set(SAVE_KEY, { level: levelIndex, diff, carry }); }
  function savedGame() { const s = store.get(SAVE_KEY); return s && LEVELS[s.level] ? s : null; }
  function beginPlay() { state = 'playing'; Sfx.init(); Sfx.startMusic(); }
  function startGame() {
    levelIndex = 0; carry = null; god = false;
    loadLevel(0, null); saveProgress(); beginPlay();
  }
  function continueGame() {
    const sv = savedGame(); if (!sv) return startGame();
    levelIndex = sv.level; diff = sv.diff; carry = sv.carry; god = false;
    loadLevel(levelIndex, carry); beginPlay();
  }
  // title menu
  let menuSel = 0;
  function menuItems() {
    const items = [], sv = savedGame();
    if (sv) items.push({ id: 'continue', text: `CONTINUE  -  ${LEVELS[sv.level].name.split(':')[0]}, ${DIFFS[sv.diff].name}` });
    items.push({ id: 'new', text: 'NEW GAME' });
    items.push({ id: 'diff', text: `DIFFICULTY   <  ${DIFFS[diff].name}  >` });
    return items;
  }
  function menuActivate(item, dir = 1) {
    if (item.id === 'continue') continueGame();
    else if (item.id === 'new') startGame();
    else { diff = (diff + dir + DIFFS.length) % DIFFS.length; store.set(DIFF_KEY, diff); Sfx.init(); Sfx.play.switch(); }
    if (state === 'playing') lockPointer();
  }
  const MENU_Y = 108, MENU_DY = 13;
  // a click / tap on the title screen: pick the menu row under it, or the highlighted one
  function titleTap(gx, gy) {
    const items = menuItems();
    const row = Math.floor((gy - (MENU_Y - 9)) / MENU_DY);
    if (gx !== undefined && gx < 330 && row >= 0 && row < items.length) { menuSel = row; menuActivate(items[row], 1); }
    else menuActivate(items[Math.min(menuSel, items.length - 1)], 1);
  }
  function completeLevel() {
    if (state !== 'playing') return;
    interStats = { name: L.def.name, kills: L.totalKills ? Math.round(player.kills / L.totalKills * 100) : 100,
      items: L.totalItems ? Math.round(player.items / L.totalItems * 100) : 100,
      secrets: L.totalSecrets ? Math.round(player.secrets / L.totalSecrets * 100) : 100, time: levelTime };
    carry = { health: player.health, armor: player.armor, armorType: player.armorType, ammo: player.ammo, weapons: player.weapons, cur: player.cur };
    state = levelIndex >= LEVELS.length - 1 ? 'victory' : 'intermission'; stateT = 0;
    if (state === 'victory') store.del(SAVE_KEY);
    else { levelIndex++; saveProgress(); levelIndex--; } // a CONTINUE now starts the next level
  }
  function nextLevel() {
    levelIndex++;
    loadLevel(levelIndex, carry); state = 'playing';
  }
  function restartLevel() {
    loadLevel(levelIndex, carry ? { ...carry, health: 100 } : null); state = 'playing';
  }

  function update(dt) {
    time += dt; stateT += dt;
    if (msgT > 0) msgT -= dt;
    if (state === 'playing' || state === 'dead') {
      levelTime += dt;
      updatePlayer(dt);
      updateDoors(dt);
      updateLifts(dt);
      updateLights();
      updateEnemies(dt);
      updateProjectiles(dt);
      if (L.exitT > 0) { L.exitT -= dt; if (L.exitT <= 0) completeLevel(); }
      if (L.bossDeadT > 0) { L.bossDeadT -= dt; if (L.bossDeadT <= 0) completeLevel(); }
    }
    shake = Math.max(0, shake - dt * 12);
    lightBoost = Math.max(0, lightBoost - dt * 3);
    painFlash = Math.max(0, painFlash - dt * 1.5);
    pickupFlash = Math.max(0, pickupFlash - dt);
  }

  // ------------------------------------------------------------------ screens
  function drawTitle() {
    ctx.fillStyle = '#07030a'; ctx.fillRect(0, 0, W, H);
    if (titleImg) {
      const ih = H, iw = titleImg.width * ih / titleImg.height;
      ctx.drawImage(titleImg, W - iw + 10, 0, iw, ih);
      const gr = ctx.createLinearGradient(W - iw + 10, 0, W - iw + 90, 0);
      gr.addColorStop(0, '#07030a'); gr.addColorStop(1, 'rgba(7,3,10,0)');
      ctx.fillStyle = gr; ctx.fillRect(W - iw + 10, 0, 80, H);
    }
    const flick = 0.85 + Math.sin(time * 7) * 0.08 + (Math.random() < 0.03 ? -0.4 : 0);
    ctx.save(); ctx.globalAlpha = flick;
    ctx.font = '46px "Metal Mania", Impact, serif'; ctx.textAlign = 'left';
    ctx.fillStyle = '#000'; ctx.fillText('GOFFICHICK', 18, 70);
    ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 14; ctx.fillStyle = '#ff4fb8'; ctx.fillText('GOFFICHICK', 16, 67);
    ctx.restore();
    label('THE WORLD IS TOO CHEERFUL. FIX IT.', 18, 86, '#c9a6c9', 'left', 8);
    if (state === 'loading') { if (Math.sin(time * 5) > 0) label('SUMMONING...', 18, MENU_Y, '#ffffff', 'left', 10); }
    else {
      const items = menuItems(); menuSel = Math.min(menuSel, items.length - 1);
      items.forEach((it, i) => {
        const sel = i === menuSel, y = MENU_Y + i * MENU_DY;
        if (sel) { ctx.fillStyle = 'rgba(255,79,184,0.18)'; ctx.fillRect(12, y - 9, 300, 12); }
        label((sel ? '> ' : '  ') + it.text, 16, y, sel ? '#ffffff' : '#ff9be0', 'left', 9);
      });
    }
    const lines = ['WASD / ARROWS  move      MOUSE  look (click to lock)', 'CLICK / CTRL   fire      E / SPACE  switches, lifts, secrets',
      '1-8 / Q / WHEEL  weapons   SHIFT run   TAB map   M music'];
    lines.forEach((l, i) => label(l, 18, 163 + i * 11, '#b78ab7', 'left', 7));
    label('Keys open coloured doors. Stairs and lifts take you up.', 18, 205, '#8a6a8a', 'left', 7);
    label('ON A PHONE? Left stick moves, drag right side to look.', 18, 225, '#7a5a7a', 'left', 7);
  }

  function drawOverlayText(title, sub, lines) {
    ctx.fillStyle = 'rgba(5,0,10,0.82)'; ctx.fillRect(0, 0, W, H);
    ctx.font = '30px "Metal Mania", Impact, serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4fb8'; ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 10; ctx.fillText(title, W / 2, 60); ctx.shadowBlur = 0;
    label(sub, W / 2, 80, '#c9a6c9', 'center', 9);
    (lines || []).forEach((l, i) => label(l, W / 2, 112 + i * 16, '#ffffff', 'center', 11));
  }

  function draw() {
    ctx.setTransform(RES, 0, 0, RES, 0, 0); ctx.imageSmoothingEnabled = true;
    if (state === 'loading' || state === 'title') { drawTitle(); return; }
    if (state === 'intermission' || state === 'victory') {
      if (state === 'victory') {
        drawTitle();
        drawOverlayText('VICTORY', 'Wally Prime is unsubscribed. The world is safely gloomy again.', [
          `KILLS  ${interStats.kills}%`, `ITEMS  ${interStats.items}%`, `TIME   ${fmtTime(interStats.time)}`, `SKILL  ${DIFFS[diff].name}`, 'THANKS FOR PLAYING - CLICK TO PLAY AGAIN']);
      } else {
        drawOverlayText(interStats.name, 'FINISHED', [`KILLS  ${interStats.kills}%`, `ITEMS  ${interStats.items}%`, `SECRET ${interStats.secrets}%`, `TIME   ${fmtTime(interStats.time)}`, '', stateT > 1 ? 'CLICK OR PRESS ENTER' : '']);
      }
      return;
    }
    render3D();
    const sx = shake ? (Math.random() - 0.5) * shake * 2 : 0, sy = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    const pw = player.pw;
    if (pw.shroud > 0 && (pw.shroud > 3 || Math.sin(time * 18) > 0)) { // Night Shroud: inverted greyscale, like the classic invulnerability
      for (let i = 0, n = W * VIEW_H; i < n; i++) { const c = buf[i]; const v = 255 - (((c & 255) * 77 + (c >> 8 & 255) * 150 + (c >> 16 & 255) * 29) >> 8); buf[i] = 0xff000000 | (v << 16) | (v << 8) | v; }
    }
    viewCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(viewC, sx | 0, sy | 0); ctx.imageSmoothingEnabled = true;
    drawWeapon();
    if (painFlash > 0) { ctx.fillStyle = `rgba(255,0,0,${painFlash * 0.45})`; ctx.fillRect(0, 0, W, VIEW_H); }
    if (pickupFlash > 0) { ctx.fillStyle = `rgba(255,120,220,${pickupFlash * 0.4})`; ctx.fillRect(0, 0, W, VIEW_H); }
    if (pw.mask > 0 && (pw.mask > 3 || Math.sin(time * 18) > 0)) { ctx.fillStyle = 'rgba(40,255,90,0.12)'; ctx.fillRect(0, 0, W, VIEW_H); }
    if (player.rageT > 0) { ctx.fillStyle = `rgba(255,0,0,${Math.min(0.35, player.rageT * 0.04)})`; ctx.fillRect(0, 0, W, VIEW_H); }
    if (pw.veil > 0) { const g = ctx.createRadialGradient(W / 2, HOR, 40, W / 2, HOR, W * 0.6); g.addColorStop(0, 'rgba(60,0,90,0)'); g.addColorStop(1, 'rgba(60,0,90,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VIEW_H); }
    if (automap) drawAutomap();
    drawMessages();
    drawHUD();
    if (state === 'dead') {
      ctx.fillStyle = `rgba(80,0,0,${Math.min(0.6, stateT * 0.4)})`; ctx.fillRect(0, 0, W, VIEW_H);
      if (stateT > 1) {
        ctx.font = '34px "Metal Mania", Impact, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff2d4a'; ctx.fillText('YOU DIED', W / 2, 90);
        label('Too much positivity. Click to rise again.', W / 2, 110, '#ffd0ec', 'center', 9);
      }
    }
    if (paused) drawOverlayText('PAUSED', 'Click to resume', []);
    if (isTouch && !sideways && window.innerHeight > window.innerWidth) {
      ctx.fillStyle = 'rgba(10,0,16,0.75)'; ctx.fillRect(0, VIEW_H - 16, W, 16);
      label('Turn your phone sideways for full screen', W / 2, VIEW_H - 5, '#ff9be0', 'center', 8);
    }
  }
  const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  // ------------------------------------------------------------------ input
  let paused = false;
  // convert a click / tap position into the game's own 480-wide coordinates
  function gamePoint(cx, cy) {
    const l = toLocal(cx, cy);
    return { x: (l.x - canvas.offsetLeft) / canvas.offsetWidth * W, y: (l.y - canvas.offsetTop) / canvas.offsetHeight * H };
  }
  function primaryAction(ev) {
    Sfx.init();
    if (state === 'title') {
      if (ev && ev.clientX !== undefined) { const g = gamePoint(ev.clientX, ev.clientY); titleTap(g.x, g.y); }
      else titleTap();
      return true;
    }
    if (state === 'dead' && stateT > 1) { restartLevel(); return true; }
    if (state === 'intermission' && stateT > 1) { nextLevel(); return true; }
    if (state === 'victory' && stateT > 2) { state = 'title'; return true; }
    if (paused) { paused = false; lockPointer(); return true; }
    return false;
  }
  function lockPointer() { if (!isTouch && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } }
  const locked = () => document.pointerLockElement === canvas;

  window.addEventListener('keydown', e => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (state === 'title') {
      const items = menuItems();
      if (e.code === 'ArrowUp') menuSel = (menuSel + items.length - 1) % items.length;
      if (e.code === 'ArrowDown') menuSel = (menuSel + 1) % items.length;
      if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && items[menuSel].id === 'diff') menuActivate(items[menuSel], e.code === 'ArrowLeft' ? -1 : 1);
    }
    if (e.code === 'Enter') primaryAction();
    if (state !== 'playing') return;
    if (e.key.length === 1) cheatKey(e.key.toLowerCase());
    if (e.code === 'KeyE' || e.code === 'Space') useAction();
    if (e.code === 'Tab') automap = !automap;
    if (e.code === 'KeyM') { msg = Sfx.toggleMusic() ? 'Music on' : 'Music off'; msgT = 1.5; }
    if (e.code === 'KeyQ') cycleWeapon(1);
    if (e.code === 'Escape' || e.code === 'KeyP') paused = !paused;
    const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) weaponSlot(n);
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; fireHeld = false; });

  canvas.addEventListener('mousedown', e => {
    if (isTouch) return;
    if (primaryAction(e)) return;
    if (state === 'playing' && !locked()) lockPointer();
    if (e.button === 0) fireHeld = true;
  });
  window.addEventListener('mouseup', () => { fireHeld = false; });
  document.addEventListener('mousemove', e => { if (locked() && state === 'playing' && !paused) mouseDX += e.movementX; });
  // without pointer lock (e.g. inside an embedded frame) drag with the mouse to look
  let dragX = null;
  canvas.addEventListener('mousemove', e => { if (!locked() && (e.buttons & 1) && dragX !== null && state === 'playing') mouseDX += (e.clientX - dragX) * 1.5; dragX = e.clientX; });
  canvas.addEventListener('wheel', e => { if (state === 'playing') { cycleWeapon(e.deltaY > 0 ? 1 : -1); e.preventDefault(); } }, { passive: false });
  document.addEventListener('pointerlockchange', () => { if (!locked() && state === 'playing' && !isTouch) { /* stay running; click relocks */ } });

  // ---- touch controls
  let isTouch = false;
  // Real full screen (hides the browser bars) where the phone allows it - Android and most
  // tablets. Browsers only allow this from a tap, so every touch control asks for it.
  function tryFullscreen() {
    if (window.innerHeight > window.innerWidth) return; // only once the phone is sideways
    const el = document.documentElement, fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) return;
    try {
      const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen && el.webkitRequestFullscreen();
      if (r && r.catch) r.catch(() => {});
    } catch (e) {}
  }
  function setupTouch() {
    if (isTouch) return; isTouch = true;
    document.getElementById('touch').addEventListener('pointerdown', tryFullscreen, true);
    const ui = document.getElementById('touch'); ui.style.display = 'block';
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let stickId = null, sx0 = 0, sy0 = 0;
    stick.addEventListener('pointerdown', e => { stickId = e.pointerId; const r = stick.getBoundingClientRect(), c = toLocal(r.left + r.width / 2, r.top + r.height / 2); sx0 = c.x; sy0 = c.y; stick.setPointerCapture(e.pointerId); moveStick(e); e.preventDefault(); });
    const moveStick = e => {
      if (e.pointerId !== stickId) return;
      const r = stick.getBoundingClientRect().width / 2;
      const pt = toLocal(e.clientX, e.clientY);
      let dx = (pt.x - sx0) / r, dy = (pt.y - sy0) / r; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      touch.mx = dx; touch.my = -dy; knob.style.transform = `translate(${dx * r * 0.6}px, ${dy * r * 0.6}px)`;
    };
    stick.addEventListener('pointermove', moveStick);
    const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; touch.mx = touch.my = 0; knob.style.transform = ''; };
    stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
    const look = document.getElementById('look'); let lookId = null, lx = 0;
    look.addEventListener('pointerdown', e => { if (primaryAction(e)) return; lookId = e.pointerId; lx = toLocal(e.clientX, e.clientY).x; look.setPointerCapture(e.pointerId); });
    look.addEventListener('pointermove', e => { if (e.pointerId === lookId) { const x = toLocal(e.clientX, e.clientY).x; touch.turn += (x - lx) * 0.009; lx = x; } });
    const endLook = e => { if (e.pointerId === lookId) lookId = null; };
    look.addEventListener('pointerup', endLook); look.addEventListener('pointercancel', endLook);
    const btn = (id, down, up) => { const b = document.getElementById(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!primaryAction(e)) down(); }); if (up) { b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); } };
    btn('bFire', () => { touch.fire = true; touch.fireTap = true; }, () => { touch.fire = false; });
    btn('bUse', () => state === 'playing' && useAction());
    btn('bWpn', () => state === 'playing' && cycleWeapon(1));
    btn('bMap', () => { automap = !automap; });
  }
  window.addEventListener('touchstart', () => setupTouch(), { once: true, passive: true });
  // the very first tap lands on the canvas (before the touch overlay exists): let it start the game
  canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { setupTouch(); tryFullscreen(); primaryAction(e); } });
  // Claim every touch gesture for the game. Without this, in-app browsers such as Facebook's
  // read a sideways look-drag as "swipe to go back / close", and a downward drag as "pull to close".
  const blockGesture = e => { if (e.cancelable) e.preventDefault(); };
  for (const ev of ['touchstart', 'touchmove']) {
    document.addEventListener(ev, e => {
      // let the title / end screens still receive normal taps; block everything that drags
      if (ev === 'touchmove' || e.target.closest('#touch') || e.target === canvas) blockGesture(e);
    }, { passive: false });
  }
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) document.addEventListener(ev, blockGesture, { passive: false });

  // ------------------------------------------------------------------ boot
  function loadImages(map) {
    return Promise.all(Object.entries(map).map(([k, src]) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res([k, im]); im.onerror = rej; im.src = src;
    }))).then(Object.fromEntries);
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) update(dt); else time += dt;
    draw();
    requestAnimationFrame(frame);
  }
  fitScreen();
  for (const ev of ['resize', 'orientationchange']) window.addEventListener(ev, () => { fitScreen(); setTimeout(fitScreen, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitScreen);
  requestAnimationFrame(frame);

  const fontReady = document.fonts ? document.fonts.load('30px "Metal Mania"').catch(() => {}) : Promise.resolve();
  Promise.all([loadImages(PHOTO_DATA), fontReady]).then(([photos]) => {
    S = Sprites.build(photos);
    buildFaces(photos);
    buildHudBg();
    titleImg = photos.title;
    state = 'title';
    // expose a tiny debug hook for testing
    window.GOFFI = { get state() { return state; }, get player() { return player; }, get level() { return L; }, start: startGame, completeLevel, get diff() { return diff; }, set diff(v) { diff = v; }, continueGame, savedGame, setLevel: i => { levelIndex = i; loadLevel(i, null); state = 'playing'; } };
  });
})();
