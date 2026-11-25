// Game controllers (Bluetooth or USB): phone controllers like the Backbone, MG-X, Kishi and GameSir,
// plus Xbox / PlayStation pads. Most report the browser's "standard" layout; anything that doesn't
// (or is wired oddly) can be taught its buttons in the CONTROLLER screen, and that's remembered.

// Each action maps to a source: { b: buttonIndex } or { a: axisIndex, dir: +1/-1, rest } (an axis used as a trigger)
export const ACTIONS = [
  ['fire', 'FIRE / ACCELERATE (right trigger)'],
  ['aim', 'AIM / BRAKE (left trigger)'],
  ['jump', 'JUMP / HANDBRAKE (A)'],
  ['sprint', 'SPRINT / HORN (B)'],
  ['power', 'WALLY POWER (X)'],
  ['enter', 'GET IN / OUT (Y)'],
  ['weapon', 'NEXT WEAPON (right bumper)'],
  ['gps', 'GPS (left bumper)'],
  ['pause', 'PAUSE (Start / Menu)'],
  ['camera', 'CAMERA (right stick click)'],
  ['radio', 'RADIO (D-pad up)'],
];
const STD = {
  fire: { b: 7 }, aim: { b: 6 }, jump: { b: 0 }, sprint: { b: 1 }, power: { b: 2 }, enter: { b: 3 }, weapon: { b: 5 }, gps: { b: 4 },
  pause: { b: 9 }, camera: { b: 11 }, radio: { b: 12 }, back: { b: 8 }, l3: { b: 10 },
  up: { b: 12 }, down: { b: 13 }, left: { b: 14 }, right: { b: 15 },
  sticks: { mx: { a: 0 }, my: { a: 1 }, lx: { a: 2 }, ly: { a: 3 } },
};
const KEY = 'wta-pad';

export class Pad {
  constructor(store) {
    this.store = store; this.custom = null; this.prev = {}; this.name = ''; this.used = false;
    try { this.custom = store.get(KEY, null); } catch (e) { this.custom = null; }
    window.addEventListener('gamepadconnected', (e) => { this.name = e.gamepad.id; if (this.onConnect) this.onConnect(e.gamepad); });
    window.addEventListener('gamepaddisconnected', (e) => { if (this.onDisconnect) this.onDisconnect(e.gamepad); });
  }
  get() { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) return g; return null; }
  map(gp) {
    if (this.custom) return { ...STD, ...this.custom, sticks: { ...STD.sticks, ...(this.custom.sticks || {}) } };
    // a few controllers report no layout; most of them put the right stick on axes 2 and 5 and triggers on 3 and 4
    if (gp.mapping !== 'standard' && gp.axes.length >= 6) return { ...STD, fire: { a: 4, dir: 1, rest: -1 }, aim: { a: 3, dir: 1, rest: -1 }, sticks: { ...STD.sticks, lx: { a: 2 }, ly: { a: 5 } } };
    return STD;
  }
  // how hard a control is pressed, 0..1
  val(gp, src) {
    if (!src) return 0;
    if (src.b != null) { const b = gp.buttons[src.b]; return b ? (b.value || (b.pressed ? 1 : 0)) : 0; }
    if (src.a != null) {
      const v = gp.axes[src.a] || 0, rest = src.rest ?? 0, dir = src.dir || 1;
      return Math.max(0, Math.min(1, ((v - rest) * dir) / (rest === 0 ? 1 : 2)));
    }
    return 0;
  }
  axis(gp, src) { if (!src) return 0; const v = (gp.axes[src.a] || 0) * (src.inv ? -1 : 1); return Math.abs(v) < 0.14 ? 0 : (v - Math.sign(v) * 0.14) / 0.86; }
  // read everything once a frame: analogue values plus "just pressed" edges
  poll() {
    const gp = this.get();
    if (!gp) { this.state = null; return null; }
    this.name = gp.id;
    const M = this.map(gp), s = { gp, pressed: {} };
    for (const k of ['fire', 'aim', 'jump', 'sprint', 'power', 'enter', 'weapon', 'gps', 'pause', 'camera', 'radio', 'back', 'l3', 'up', 'down', 'left', 'right']) {
      s[k] = this.val(gp, M[k]);
      const on = s[k] > 0.5;
      s.pressed[k] = on && !this.prev[k];
      this.prev[k] = on;
    }
    s.mx = this.axis(gp, M.sticks.mx); s.my = -this.axis(gp, M.sticks.my);
    s.lx = this.axis(gp, M.sticks.lx); s.ly = this.axis(gp, M.sticks.ly);
    s.any = Object.values(s.pressed).some(Boolean) || Math.hypot(s.mx, s.my) > 0.5 || Math.hypot(s.lx, s.ly) > 0.5;
    if (s.any) this.used = true;
    this.state = s;
    return s;
  }
  // a buzz in your hands, where the controller and browser support it
  rumble(strong, weak = strong, ms = 120) {
    const gp = this.get(); if (!gp || !this.used) return;
    const a = gp.vibrationActuator;
    try { if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) }).catch(() => {}); } catch (e) { /* not supported */ }
  }
  save(custom) { this.custom = custom; try { this.store.set(KEY, custom); } catch (e) { /* storage blocked */ } }
  reset() { this.custom = null; try { this.store.set(KEY, null); } catch (e) { /* storage blocked */ } }
}

// The button-teaching wizard: shows one action at a time and records whatever you press for it
export function runSetup(pad, el, done) {
  const steps = [
    ...ACTIONS.map(([k, label]) => ({ k, label: `Press ${label}`, kind: 'btn' })),
    { k: 'mx', label: 'Push the LEFT STICK to the RIGHT', kind: 'axis' },
    { k: 'my', label: 'Push the LEFT STICK DOWN', kind: 'axis' },
    { k: 'lx', label: 'Push the RIGHT STICK to the RIGHT', kind: 'axis' },
    { k: 'ly', label: 'Push the RIGHT STICK DOWN', kind: 'axis' },
  ];
  const out = { sticks: {} };
  let i = 0, base = null, wait = 0.4, last = performance.now(), cancelled = false;
  pad.setupRunning = true;
  const used = new Set();
  const show = () => { const e = el.querySelector('#padStep'); e.textContent = i < steps.length ? `${i + 1} / ${steps.length}: ${steps[i].label}` : 'All done!'; e.scrollIntoView({ block: 'center' }); };
  show();
  const tick = () => {
    if (cancelled || !el.isConnected || el.classList.contains('hidden')) { pad.setupRunning = false; return; }
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    const gp = pad.get();
    if (!gp) { el.querySelector('#padStep').textContent = 'No controller found. Press any button on it to wake it up.'; requestAnimationFrame(tick); return; }
    if (i >= steps.length) { pad.setupRunning = false; pad.save(out); done(true); return; }
    const snap = { b: gp.buttons.map((b) => b.value || (b.pressed ? 1 : 0)), a: gp.axes.slice() };
    // wait for everything to be let go before listening for the next control
    if (!base) { if (snap.b.every((v) => v < 0.3) && snap.a.every((v) => Math.abs(v) < 0.4 || Math.abs(Math.abs(v) - 1) < 0.05)) { wait -= dt; if (wait <= 0) base = snap; } requestAnimationFrame(tick); return; }
    const st = steps[i];
    let got = null;
    if (st.kind === 'btn') {
      for (let b = 0; b < snap.b.length; b++) if (snap.b[b] > 0.6 && base.b[b] < 0.3 && !used.has('b' + b)) { got = { b }; used.add('b' + b); break; }
      if (!got) for (let a = 0; a < snap.a.length; a++) { const d = snap.a[a] - base.a[a]; if (Math.abs(d) > 0.8 && !used.has('a' + a)) { got = { a, dir: Math.sign(d), rest: base.a[a] }; used.add('a' + a); break; } }
      if (got) out[st.k] = got;
    } else {
      for (let a = 0; a < snap.a.length; a++) { const d = snap.a[a] - base.a[a]; if (Math.abs(d) > 0.6 && Math.abs(base.a[a]) < 0.3) { got = { a, inv: d < 0 }; break; } }
      if (got) {
        // "down" on a stick is positive in the browser, and the game wants up = +, so record it the right way round
        out.sticks[st.k] = { a: got.a, inv: st.k === 'my' || st.k === 'ly' ? got.inv : got.inv };
      }
    }
    if (got) { i++; base = null; wait = 0.35; show(); pad.rumble(0.3, 0.3, 80); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => { cancelled = true; pad.setupRunning = false; };
}
