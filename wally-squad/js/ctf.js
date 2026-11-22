// Capture the Flag (skirmish and online option): each side has a flag beside its base. Walk a ground
// unit onto the enemy flag to grab it, then bring it home to your own flag while yours is safe at
// home. First to 3 captures wins. If the carrier falls, the flag drops; touch your own dropped flag
// to send it home (it also goes home by itself after 30 seconds). Rules run in the simulation
// (online-safe); poles, flags and the score bar are only visuals.
import { DTHREE as THREE } from './detail.js';
import { G, srand } from './state.js';
import { FACTIONS } from './config.js';
import { BASES, groundY, cellOf, cellCenter } from './terrain.js';
import { nearestFree } from './pathfind.js';
import { unitsNear, alive } from './entities.js';

export const CTF_WIN = 3;
export const ctf = { on: false, flags: {}, score: { wally: 0, grim: 0 } };
const buf = [];
let bar = null, hudT = 0, aiT = 0, isAI = () => false;
const other = f => f === 'wally' ? 'grim' : 'wally';
const canCarry = u => alive(u) && !u.boarded && !u.air && !u.def.naval && !u.burrowed && u.faction !== 'neutral' && u.kind === 'unit' && u.type !== 'harvester';

export function initCTF(scene, aiCheck) {
  ctf.on = !!(G.cfg.ctf && ['skirmish', 'mp', 'watch'].includes(G.cfg.mode));
  ctf.score = { wally: 0, grim: 0 }; ctf.flags = {};
  isAI = aiCheck || (() => false);
  if (!ctf.on) return;
  for (const f of ['wally', 'grim']) {
    const b = BASES[f], e = BASES[other(f)];
    if (!b || !e) { ctf.on = false; return; }
    // the flag stands in front of the base, toward the enemy
    const l = Math.hypot(e.x - b.x, e.z - b.z) || 1;
    let x = b.x + (e.x - b.x) / l * 16, z = b.z + (e.z - b.z) / l * 16;
    const c = nearestFree(cellOf(x), cellOf(z), 10); if (c) { x = cellCenter(c.x); z = cellCenter(c.z); }
    ctf.flags[f] = { f, home: { x, z }, x, z, carrier: null, dropped: false, dropT: 0 };
  }
  if (!scene) return;
  for (const f of ['wally', 'grim']) makeVisual(scene, ctf.flags[f]);
  bar = document.createElement('div'); bar.id = 'ctfBar';
  bar.style.cssText = 'position:absolute;left:12px;top:52px;z-index:6;pointer-events:none;font:700 12px/1.2 system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000;background:rgba(10,14,20,.6);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:4px 10px;white-space:nowrap';
  (document.getElementById('view') || document.body).appendChild(bar);
  drawBar();
}

function makeVisual(scene, fl) {
  const col = FACTIONS[fl.f].color;
  const metal = new THREE.MeshStandardMaterial({ color: 0xb0b6bc, metalness: 0.8, roughness: 0.3 });
  // the stand at home: a stone base with a ring of team lights
  const stand = new THREE.Group();
  stand.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0x6a6460, roughness: 0.9 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.5) }));
  ring.position.y = 0.1; stand.add(ring);
  stand.position.set(fl.home.x, groundY(fl.home.x, fl.home.z), fl.home.z); scene.add(stand);
  // the flag itself (moves with whoever carries it)
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 8), metal); pole.position.y = 2.5; g.add(pole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.9, roughness: 0.3 })); knob.position.y = 5.05; g.add(knob);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.15, 10, 4).translate(0.95, 0, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.25 }));
  cloth.position.y = 4.3; g.add(cloth);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  fl.mesh = g; fl.cloth = cloth; fl.base = cloth.geometry.attributes.position.array.slice();
}

function drop(fl, x, z) { fl.carrier = null; fl.x = x; fl.z = z; fl.dropped = true; fl.dropT = 30; }
function goHome(fl) { fl.carrier = null; fl.x = fl.home.x; fl.z = fl.home.z; fl.dropped = false; }
const atHome = fl => !fl.carrier && !fl.dropped;
const say = (txt, warn) => { G.announce?.(txt, G.player, 2); G.ui?.message(txt, warn); };

export function updateCTF(dt) {
  if (!ctf.on || G.over) return;
  for (const f of ['wally', 'grim']) {
    const fl = ctf.flags[f], enemy = other(f);
    if (fl.carrier) {
      const c = fl.carrier;
      if (!canCarry(c)) { drop(fl, c.x, c.z); say(f === G.player ? 'Our flag has been dropped - get it back!' : 'The enemy flag has been dropped!'); continue; }
      fl.x = c.x; fl.z = c.z;
      // the carrier scores by bringing it to their own flag, while their flag is safe at home
      const own = ctf.flags[enemy];
      if (atHome(own) && Math.hypot(c.x - own.home.x, c.z - own.home.z) < 4) {
        ctf.score[enemy]++; goHome(fl);
        say(enemy === G.player ? `FLAG CAPTURED! ${ctf.score[enemy]} of ${CTF_WIN}` : `The enemy captured our flag! (${ctf.score[enemy]} of ${CTF_WIN})`, enemy !== G.player);
        if (enemy === G.player) G.sfx?.play('cheer');
        G.emitFlag?.(enemy);
      }
      continue;
    }
    if (fl.dropped) {
      fl.dropT -= dt;
      if (fl.dropT <= 0) { goHome(fl); say(f === G.player ? 'Our flag has returned home.' : 'The enemy flag has returned home.'); continue; }
    }
    // someone touches the flag
    for (const u of unitsNear(fl.x, fl.z, 2.6, buf)) {
      if (!canCarry(u)) continue;
      if (u.faction === enemy) { fl.carrier = u; fl.dropped = false; say(enemy === G.player ? `${u.nick || u.def.name} has the enemy flag! Bring it home!` : 'The enemy has taken our flag!', enemy !== G.player); if (f === G.player) G.alertAt = { x: fl.x, z: fl.z, t: G.time }; break; }
      if (u.faction === f && fl.dropped) { goHome(fl); say(f === G.player ? 'Our flag is back home!' : 'The enemy recovered their flag.'); break; }
    }
  }
  runAI(dt);
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; drawBar(); }
}

// computer players: send raiders for the enemy flag, carry it home, and hunt down anyone holding theirs
function runAI(dt) {
  aiT -= dt; if (aiT > 0) return; aiT = 3;
  for (const f of ['wally', 'grim']) {
    if (!isAI(f)) continue;
    const mine = ctf.flags[f], theirs = ctf.flags[other(f)];
    if (theirs.carrier && theirs.carrier.faction === f) theirs.carrier.moveTo(mine.home.x, mine.home.z);
    if (mine.carrier) {
      const c = mine.carrier;
      G.units.filter(u => u.faction === f && !u.dead && u.weapon && !u.boarded && Math.hypot(u.x - c.x, u.z - c.z) < 60).slice(0, 8).forEach(u => u.attack(c));
    } else if (mine.dropped) {
      const near = G.units.filter(u => canCarry(u) && u.faction === f).sort((a, b) => Math.hypot(a.x - mine.x, a.z - mine.z) - Math.hypot(b.x - mine.x, b.z - mine.z))[0];
      if (near) near.moveTo(mine.x, mine.z);
    }
    if (!theirs.carrier && srand() < 0.5) { // a small raiding party of fast units goes for the flag
      const raiders = G.units.filter(u => canCarry(u) && u.faction === f && u.weapon && !u.vip && (!u.order || u.order.type !== 'attack') && ['buggy', 'dog', 'hover', 'rifle', 'tank', 'blink', 'stealth', 'flamer'].includes(u.type));
      raiders.sort((a, b) => Math.hypot(a.x - theirs.x, a.z - theirs.z) - Math.hypot(b.x - theirs.x, b.z - theirs.z));
      raiders.slice(0, 4).forEach(u => u.moveTo(theirs.x, theirs.z, { attackMove: true }));
    }
  }
}

// visuals: flags follow their carriers and flutter in the wind
export function animateCTF() {
  if (!ctf.on) return;
  for (const f of ['wally', 'grim']) {
    const fl = ctf.flags[f]; if (!fl.mesh) continue;
    const y = groundY(fl.x, fl.z) + (fl.carrier ? 1.2 : fl.dropped ? -1.4 : 0.25);
    fl.mesh.position.set(fl.x, y, fl.z);
    fl.mesh.visible = !fl.carrier || fl.carrier.mesh?.visible !== false;
    const p = fl.cloth.geometry.attributes.position, a = p.array, t = G.time;
    for (let i = 0; i < a.length; i += 3) { const x = fl.base[i]; a[i + 2] = Math.sin(x * 2.4 - t * 6) * 0.18 * (x / 1.9); }
    p.needsUpdate = true;
  }
}

const fmtScore = f => `<span style="color:${FACTIONS[f].css}">${f === 'wally' ? '★' : '👹'} ${ctf.score[f]}/${CTF_WIN}</span>`;
function drawBar() {
  if (!bar) return;
  const me = G.player, them = other(me), mf = ctf.flags[me], tf = ctf.flags[them];
  const st = fl => fl.carrier ? '<span style="color:#ffd27a">TAKEN</span>' : fl.dropped ? `<span style="color:#ffb070">DROPPED ${Math.ceil(fl.dropT)}s</span>` : '<span style="opacity:.75">home</span>';
  bar.innerHTML = `🚩 CAPTURE THE FLAG ${fmtScore(me)} ${fmtScore(them)} · our flag: ${st(mf)} · theirs: ${st(tf)}`;
}
export const ctfWinner = () => ctf.on ? (['wally', 'grim'].find(f => ctf.score[f] >= CTF_WIN) || null) : null;
