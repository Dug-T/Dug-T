// Lockstep multiplayer. Both players run the exact same simulation; only commands are exchanged.
// Time is split into 200 ms turns of 6 fixed ticks. Commands issued now run DELAY turns later on both
// machines, so the network has time to deliver them. A checksum is swapped regularly to detect desyncs.
import { G } from './state.js';
import { createNet } from './net.js';
import { execute } from './cmd.js';

export const TICK = 1 / 30, TICKS_PER_TURN = 6, DELAY = 3;

export class Lockstep {
  constructor(cfg, onStart) {
    this.cfg = cfg; this.role = cfg.mp.role; this.room = cfg.mp.room;
    this.me = G.player; this.them = G.enemy;
    this.net = createNet();
    this.active = false; this.started = false;
    this.turn = 0; this.tick = 0; this.acc = 0;
    this.pending = [];                   // our commands waiting to be sent
    this.inbox = { [this.me]: new Map(), [this.them]: new Map() };
    this.sent = new Map();               // our sent turns (for resends)
    this.waitT = 0; this.lastNeed = 0;
    this.hashes = new Map();             // turn -> our checksum
    this.onStart = onStart;
    for (let n = 0; n < DELAY; n++) { this.inbox[this.me].set(n, []); this.inbox[this.them].set(n, []); }
    this.overlay = document.createElement('div');
    this.overlay.id = 'mpOverlay';
    document.body.appendChild(this.overlay);
  }

  show(html) { this.overlay.innerHTML = html; this.overlay.style.display = html ? 'flex' : 'none'; }

  connect() {
    this.show(`<div class="card"><h2>ONLINE BATTLE</h2><p style="text-align:center">Connecting…</p></div>`);
    this.net.connect(this.room, (ev, p) => this.onMsg(ev, p), (st, reason) => {
      if (st === 'ok') this.handshake();
      else if (st === 'error' || st === 'closed') this.show(`<div class="card"><h2>CONNECTION PROBLEM</h2><p style="text-align:center">${reason || 'Lost connection.'}</p><div class="row"><button class="btn big" onclick="location.href=location.pathname">Main menu</button></div></div>`);
    });
  }

  handshake() {
    if (this.role === 'host') {
      this.show(`<div class="card"><h2>WAITING FOR OPPONENT</h2><p style="text-align:center">Give your friend this room code:</p><div class="roomcode">${this.room}</div><p style="text-align:center;color:var(--dim)">They choose <b>Online battle → Join</b> and type it in.</p><div class="row"><button class="btn" onclick="location.href=location.pathname">Cancel</button></div></div>`);
    } else {
      this.show(`<div class="card"><h2>JOINING ${this.room}</h2><p style="text-align:center">Waiting for the host…</p></div>`);
      const ping = () => { if (!this.started) { this.net.send('ready', {}); setTimeout(ping, 1000); } };
      ping();
    }
  }

  onMsg(ev, p) {
    if (ev === 'hello' && this.role === 'host' && !this.started) {
      // a guest on the menu wants the match settings
      this.net.send('cfg', { cfg: this.publicCfg() });
    } else if (ev === 'ready' && this.role === 'host') {
      if (!this.started) { this.net.send('go', {}); this.begin(); } else this.net.send('go', {});
    } else if (ev === 'go' && this.role === 'guest' && !this.started) {
      this.begin();
    } else if (ev === 'turn') {
      this.inbox[this.them].set(p.n, p.c || []);
      if (p.hn !== undefined) this.checkHash(p.hn, p.h);
    } else if (ev === 'need') {
      for (let n = p.n; n < p.n + 4; n++) if (this.sent.has(n)) this.net.send('turn', this.sent.get(n));
    } else if (ev === 'bye') {
      this.show(`<div class="card"><h2>OPPONENT LEFT</h2><p style="text-align:center">Your opponent has left the battle.</p><div class="row"><button class="btn big" onclick="location.href=location.pathname">Main menu</button></div></div>`);
      G.over = true;
    } else if (ev === 'chat') {
      G.ui?.message(`Opponent: ${String(p.text).slice(0, 80)}`);
    }
  }

  publicCfg() { const c = { ...this.cfg }; c.mp = { room: this.room, role: 'guest', seed: this.cfg.mp.seed, hostFaction: this.cfg.faction }; c.faction = this.cfg.faction === 'wally' ? 'grim' : 'wally'; return c; }

  begin() {
    this.started = true; this.active = true;
    this.show('');
    this.onStart?.();
    window.addEventListener('beforeunload', () => this.net.send('bye', {}));
  }

  queue(c) { this.pending.push(c); }

  // Called every frame with real elapsed time; runs as many fixed ticks as the network allows.
  update(real, simStep) {
    if (!this.active || G.over) return;
    this.acc = Math.min(this.acc + real, 0.5);
    while (this.acc >= TICK) {
      if (this.tick === 0) {
        const mine = this.inbox[this.me].get(this.turn), theirs = this.inbox[this.them].get(this.turn);
        if (!mine || !theirs) {
          this.waitT += TICK; this.acc -= TICK;
          if (this.waitT > 1 && performance.now() - this.lastNeed > 800) { this.lastNeed = performance.now(); this.net.send('need', { n: this.turn }); }
          this.setWaiting(this.waitT > 1.2);
          if (this.waitT > 25) this.onMsg('bye', {});
          return;
        }
        this.setWaiting(false); this.waitT = 0;
        // host commands first, then guest: identical order on both machines
        const hostF = this.role === 'host' ? this.me : this.them;
        const order = hostF === this.me ? [mine, theirs] : [theirs, mine];
        for (const list of order) for (const c of list) execute(c);
        this.inbox[this.me].delete(this.turn); this.inbox[this.them].delete(this.turn);
        // send our commands for a future turn
        const n = this.turn + DELAY;
        const msg = { n, c: this.pending.splice(0) };
        if (this.turn % 10 === 0) { const h = checksum(); this.hashes.set(this.turn, h); msg.hn = this.turn; msg.h = h; }
        this.inbox[this.me].set(n, msg.c);
        this.sent.set(n, msg); this.sent.delete(n - 40);
        this.net.send('turn', msg);
      }
      simStep(TICK);
      this.acc -= TICK;
      this.tick++;
      if (this.tick >= TICKS_PER_TURN) { this.tick = 0; this.turn++; }
    }
  }

  setWaiting(on) {
    if (on === this.waiting) return;
    this.waiting = on;
    this.show(on ? `<div class="card" style="width:auto"><h2 style="margin:0">Waiting for opponent…</h2></div>` : '');
  }

  checkHash(n, h) {
    const mine = this.hashes.get(n);
    if (mine !== undefined && mine !== h && !this.desynced) {
      this.desynced = true;
      G.ui?.message('Warning: the game is out of sync with your opponent (different browsers can cause this).', true);
    }
    this.hashes.delete(n - 100);
  }

  surrender() { G.surrendered = this.me; this.queue({ t: 'surrender', f: this.me }); }
  chat(text) { this.net.send('chat', { text }); }
}

function checksum() {
  let h = 0;
  for (const u of G.units) if (!u.dead) h = (h * 31 + u.id * 7 + Math.round(u.x * 10) * 3 + Math.round(u.z * 10) + Math.round(u.hp)) | 0;
  for (const b of G.buildings) if (!b.dead) h = (h * 31 + b.id + Math.round(b.hp)) | 0;
  for (const f in G.players) h = (h * 31 + Math.round(G.players[f].credits)) | 0;
  return h;
}

// Guest on the main menu: ask the host for the match settings, then reload into the game.
export function joinRoom(room, onStatus) {
  const net = createNet();
  let done = false;
  net.connect(room, (ev, p) => {
    if (ev === 'cfg' && !done) {
      done = true;
      net.close();
      sessionStorage.setItem('ws_cfg', JSON.stringify(p.cfg));
      location.reload();
    }
  }, (st, reason) => {
    if (st === 'ok') {
      onStatus('Connected. Asking the host for the match settings…');
      const ping = () => { if (!done) { net.send('hello', {}); setTimeout(ping, 1200); } };
      ping();
      setTimeout(() => { if (!done) onStatus('No host found with that room code yet. Keep waiting, or check the code.'); }, 8000);
    } else if (st === 'error' || st === 'closed') onStatus('Connection problem: ' + (reason || 'unknown'));
  });
  return net;
}
