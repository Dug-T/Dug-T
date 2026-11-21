// King of the Hill (skirmish option): a glowing ring in the middle of the map. Whoever has troops on the
// hill with no enemies contesting it scores time; the first side to hold it for 3 minutes in total wins.
// Scoring runs in the simulation (online-safe); the ring, flag and score bar are only visuals.
import { DTHREE as THREE } from './detail.js';
import { G } from './state.js';
import { FACTIONS } from './config.js';
import { currentMap, groundY } from './terrain.js';
import { unitsNear } from './entities.js';

export const HILL_R = 12, HILL_WIN = 180;
export const hill = { on: false, x: 0, z: 0, hold: { wally: 0, grim: 0 }, owner: null, said: {} };
const buf = [];
let bulbs = null, flag = null, bar = null, hudT = 0;

export function initHill(scene) {
  hill.on = !!(G.cfg.koth && G.cfg.mode === 'skirmish');
  hill.hold = { wally: 0, grim: 0 }; hill.owner = null; hill.said = {};
  if (!hill.on) return;
  // the hill sits half-way along the middle lane
  const map = currentMap(), lane = map && map.lanes[0];
  if (lane) {
    let len = 0; const segs = [];
    for (let k = 0; k < lane.length - 1; k++) { const l = Math.hypot(lane[k + 1][0] - lane[k][0], lane[k + 1][1] - lane[k][1]); segs.push(l); len += l; }
    let want = len / 2, k = 0;
    while (k < segs.length - 1 && want > segs[k]) { want -= segs[k]; k++; }
    const t = want / segs[k];
    hill.x = lane[k][0] + (lane[k + 1][0] - lane[k][0]) * t; hill.z = lane[k][1] + (lane[k + 1][1] - lane[k][1]) * t;
  }
  if (!scene) return;
  // a ring of glowing beacons that follows the ground, and a big flag in the middle
  const N = 40;
  bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  const m = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, x = hill.x + Math.cos(a) * HILL_R, z = hill.z + Math.sin(a) * HILL_R; m.makeTranslation(x, groundY(x, z) + 0.35, z); bulbs.setMatrixAt(i, m); }
  scene.add(bulbs);
  const g = new THREE.Group(), gy = groundY(hill.x, hill.z);
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.35 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x6a6460, roughness: 0.9 })));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 8), metal); pole.position.y = 3.5; g.add(pole);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.09, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.9, roughness: 0.3, emissive: 0x6a4a00 }));
  crown.rotation.x = Math.PI / 2; crown.position.y = 7.1; g.add(crown);
  flag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 1.8).translate(0, 0, 0.9), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8, side: THREE.DoubleSide }));
  flag.position.set(0, 6.3, 0.05); g.add(flag);
  g.position.set(hill.x, gy, hill.z); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  setColour(null);
  // score bar
  bar = document.createElement('div'); bar.id = 'hillBar';
  bar.style.cssText = 'position:absolute;left:12px;top:52px;z-index:6;pointer-events:none;font:700 12px/1.2 system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000;background:rgba(10,14,20,.6);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:4px 10px;display:flex;gap:10px;align-items:center;white-space:nowrap';
  (document.getElementById('view') || document.body).appendChild(bar);
  drawBar();
}

function setColour(f) {
  const c = new THREE.Color(f ? FACTIONS[f].color : 0xffffff);
  if (bulbs) { bulbs.material.color.copy(c).multiplyScalar(f ? 3 : 1.6); }
  if (flag) flag.material.color.set(f ? FACTIONS[f].color : 0xdddddd);
}
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function drawBar() {
  if (!bar) return;
  const seg = f => { const k = Math.min(1, hill.hold[f] / HILL_WIN); return `<span style="color:${FACTIONS[f].css}">${f === 'wally' ? '★' : '👹'} ${fmt(Math.max(0, HILL_WIN - hill.hold[f]))}</span><span style="display:inline-block;width:70px;height:6px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden"><span style="display:block;height:100%;width:${(k * 100).toFixed(1)}%;background:${FACTIONS[f].css}"></span></span>`; };
  const who = hill.owner ? `<span style="color:${FACTIONS[hill.owner].css}">${hill.owner === G.player ? 'YOU HOLD IT' : 'ENEMY HOLDS IT'}</span>` : hill.contested ? '<span style="color:#ffd27a">CONTESTED</span>' : '<span style="opacity:.7">nobody</span>';
  bar.innerHTML = `👑 HILL ${who} ${seg(G.player)} ${seg(G.player === 'wally' ? 'grim' : 'wally')}`;
}

export function updateHill(dt) {
  if (!hill.on || G.over) return;
  let w = 0, g = 0;
  for (const u of unitsNear(hill.x, hill.z, HILL_R, buf)) {
    if (u.dead || u.boarded || u.air || !u.weapon && !u.def.heals) continue;
    if (Math.hypot(u.x - hill.x, u.z - hill.z) > HILL_R) continue;
    if (u.faction === 'wally') w++; else if (u.faction === 'grim') g++;
  }
  const f = w && !g ? 'wally' : g && !w ? 'grim' : null;
  hill.contested = !!(w && g);
  if (f !== hill.owner) {
    hill.owner = f; setColour(f);
    if (f) G.announce?.(f === G.player ? 'We have taken the hill!' : 'The enemy has taken the hill!', G.player, 3);
  }
  if (f) {
    const before = hill.hold[f]; hill.hold[f] += dt;
    for (const left of [60, 30, 10]) if (HILL_WIN - before > left && HILL_WIN - hill.hold[f] <= left && !hill.said[f + left]) {
      hill.said[f + left] = 1;
      G.announce?.(f === G.player ? `${left} seconds until we win the hill!` : `Warning: enemy wins the hill in ${left} seconds!`, G.player, 4);
    }
  }
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; drawBar(); }
  if (flag) flag.rotation.y = Math.sin(G.time * 1.5) * 0.35;
}
export const hillWinner = () => hill.on ? (['wally', 'grim'].find(f => hill.hold[f] >= HILL_WIN) || null) : null;
