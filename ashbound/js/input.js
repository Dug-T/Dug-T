// Keyboard and mouse, touch sticks and buttons, and game controllers, all boiled down to one set of actions.
const KEYS = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump', KeyE: 'interact', KeyF: 'interact', Enter: 'interact',
  KeyC: 'craft', KeyM: 'map', Tab: 'map', KeyI: 'inventory', Escape: 'pause', KeyP: 'pause', KeyV: 'camera', KeyQ: 'drop',
  Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4', Digit5: 'slot5', Digit6: 'slot6', Digit7: 'slot7', Digit8: 'slot8',
};
const PAD = { jump: 0, sprint: 1, craft: 2, interact: 3, map: 4, inventory: 5, pause: 9, camera: 11, up: 12, down: 13, left: 14, right: 15 };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set(); this.justPressed = new Set(); this.consumed = new Set();
    this.look = { x: 0, y: 0 }; this.touch = { mx: 0, my: 0, lx: 0, ly: 0 };
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.padUsed = false; this.padName = ''; this.prevPad = {}; this.pad = null; this.locked = false;
    this.onAny = null; this.enabled = true;
    window.addEventListener('keydown', (e) => {
      const a = KEYS[e.code]; if (!a) return;
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      if (!this.held.has(a)) this.justPressed.add(a);
      this.held.add(a); this.usingPad(false); if (this.onAny) this.onAny();
    });
    window.addEventListener('keyup', (e) => { const a = KEYS[e.code]; if (a) this.held.delete(a); });
    window.addEventListener('blur', () => { this.held.clear(); });
    // mouse look through pointer lock on desktop
    document.addEventListener('mousemove', (e) => { if (this.locked) { this.look.x += e.movementX; this.look.y += e.movementY; } });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (!this.isTouch && !this.locked) { canvas.requestPointerLock && canvas.requestPointerLock(); }
      if (e.button === 0) { this.justPressed.add('interact'); this.held.add('interact'); }
    });
    canvas.addEventListener('mouseup', (e) => { if (e.button === 0) this.held.delete('interact'); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('gamepadconnected', (e) => { this.padName = e.gamepad.id; });
    document.addEventListener('touchstart', () => this.usingPad(false), { passive: true, capture: true });
    if (this.isTouch) document.body.classList.add('touch');
  }
  usingPad(on) { if (on === this.padUsed) return; this.padUsed = on; document.body.classList.toggle('pad', on); }
  bindTouch($) {
    const bindStick = (stickId, knobId, setFn, endFn) => {
      const stick = $(stickId), knob = $(knobId); let id = null;
      const set = (t) => {
        const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
        setFn(dx, dy); knob.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
      };
      stick.addEventListener('touchstart', (e) => { e.preventDefault(); id = e.changedTouches[0].identifier; set(e.changedTouches[0]); if (this.onAny) this.onAny(); }, { passive: false });
      stick.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === id) set(t); }, { passive: false });
      const end = (e) => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; endFn(); knob.style.transform = ''; } };
      stick.addEventListener('touchend', end); stick.addEventListener('touchcancel', end);
    };
    bindStick('stick', 'knob', (x, y) => { this.touch.mx = x; this.touch.my = -y; }, () => { this.touch.mx = this.touch.my = 0; });
    bindStick('lstick', 'lknob', (x, y) => { this.touch.lx = x; this.touch.ly = y; }, () => { this.touch.lx = this.touch.ly = 0; });
    for (const b of document.querySelectorAll('#touch button[data-k]')) {
      const k = b.dataset.k;
      b.addEventListener('touchstart', (e) => { e.preventDefault(); this.held.add(k); this.justPressed.add(k); b.classList.add('on'); if (this.onAny) this.onAny(); }, { passive: false });
      const up = (e) => { e.preventDefault(); this.held.delete(k); b.classList.remove('on'); };
      b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
    }
    // drag anywhere on the right half of the screen (not on a control) to look around
    let lookId = null, lx = 0, ly = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) if (lookId === null && t.clientX > innerWidth * 0.4) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) { this.look.x += (t.clientX - lx) * 2.2; this.look.y += (t.clientY - ly) * 2.2; lx = t.clientX; ly = t.clientY; }
    }, { passive: true });
    const endLook = (e) => { for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null; };
    this.canvas.addEventListener('touchend', endLook); this.canvas.addEventListener('touchcancel', endLook);
  }
  // poll the controller once a frame
  pollPad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null; for (const g of list) if (g && g.connected) { gp = g; break; }
    this.pad = null;
    if (!gp) return;
    const dz = (v) => Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85;
    const s = { mx: dz(gp.axes[0] || 0), my: -dz(gp.axes[1] || 0), lx: dz(gp.axes[2] || 0), ly: dz(gp.axes[3] || 0) };
    let any = Math.hypot(s.mx, s.my) > 0.3 || Math.hypot(s.lx, s.ly) > 0.3;
    for (const [a, i] of Object.entries(PAD)) {
      const b = gp.buttons[i], on = !!(b && (b.pressed || b.value > 0.5));
      if (on && !this.prevPad[a]) { this.justPressed.add(a); any = true; }
      if (on) this.held.add('pad:' + a); else this.held.delete('pad:' + a);
      this.prevPad[a] = on;
    }
    // triggers also interact / sprint
    const rt = gp.buttons[7], lt = gp.buttons[6];
    if (rt && rt.value > 0.5) { if (!this.prevPad.rt) this.justPressed.add('interact'); this.held.add('pad:interact'); } this.prevPad.rt = !!(rt && rt.value > 0.5);
    if (lt && lt.value > 0.5) this.held.add('pad:sprint'); else if (!this.prevPad.sprint) this.held.delete('pad:sprint');
    if (any) { this.usingPad(true); this.padName = gp.id; if (this.onAny) this.onAny(); }
    this.pad = s;
  }
  down(a) { return this.held.has(a) || this.held.has('pad:' + a); }
  pressed(a) { if (this.justPressed.has(a) && !this.consumed.has(a)) { this.consumed.add(a); return true; } return false; }
  // movement vector from keys, touch stick or pad, -1..1
  move() {
    let x = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0), y = (this.down('up') ? 1 : 0) - (this.down('down') ? 1 : 0);
    if (!x && !y) { x = this.touch.mx; y = this.touch.my; }
    if (!x && !y && this.pad) { x = this.pad.mx; y = this.pad.my; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y, l: Math.min(1, l) };
  }
  // camera turn this frame (radians-ish)
  lookDelta(dt) {
    let x = this.look.x * 0.0022, y = this.look.y * 0.0022;
    this.look.x = this.look.y = 0;
    const sx = this.touch.lx || (this.pad ? this.pad.lx : 0), sy = this.touch.ly || (this.pad ? this.pad.ly : 0);
    const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 1.6);
    x += curve(sx) * 3.0 * dt; y += curve(sy) * 2.2 * dt;
    return { x, y };
  }
  endFrame() { this.justPressed.clear(); this.consumed.clear(); }
}
