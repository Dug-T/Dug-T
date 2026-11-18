// Command layer: every player order goes through issue(). In single player it runs at once;
// in multiplayer it is sent to the lockstep scheduler so both machines run it on the same tick.
import { G } from './state.js';
import { byId, alive, capacityOf, ejectPassengers, Unit } from './entities.js';
import { UNITS } from './config.js';
import { enqueue, dequeue, placeBuilding, placeInstant } from './production.js';
import { formationSlots } from './pathfind.js';
import { T, cellOf, idx, cellCenter } from './terrain.js';
import { fireSuperweapon } from './superweapons.js';
import { usePower } from './powers.js';

export function issue(c) {
  c.f = c.f || G.player;
  if (G.net) { if (G.net.active) G.net.queue(c); return; } // online: nothing runs until the match starts
  execute(c);
}

const mine = (c, id) => { const e = byId.get(id); return alive(e) && e.faction === c.f ? e : null; };
const myUnits = c => (c.ids || []).map(id => mine(c, id)).filter(e => e && e.kind === 'unit');

export function execute(c) {
  const P = G.players[c.f];
  if (!P) return;
  switch (c.t) {
    case 'move': {
      let units = myUnits(c);
      if (c.q) {
        // Shift-queued waypoint: busy units remember it, idle ones go straight there
        const busy = units.filter(u => u.path || u.order);
        for (const u of busy) { u.waypoints = u.waypoints || []; if (u.waypoints.length < 12) u.waypoints.push({ x: c.x + (u.x - u.x), z: c.z, am: !!c.am }); }
        units = units.filter(u => !busy.includes(u));
        if (!units.length) break;
      }
      const ground = units.filter(u => !u.air), air = units.filter(u => u.air);
      const slots = formationSlots(c.x, c.z, ground.length, ground.some(u => !u.isInf) ? 2 : 1);
      ground.sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z) || a.id - b.id);
      ground.forEach((u, i) => u.moveTo(slots[i].x, slots[i].z, { attackMove: !!c.am }));
      air.forEach((u, i) => { const a = i / Math.max(1, air.length) * Math.PI * 2, r = air.length > 1 ? 3 : 0; u.moveTo(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, { attackMove: !!c.am }); });
      break;
    }
    case 'atk': { const t = byId.get(c.tid); if (alive(t)) for (const u of myUnits(c)) if (u !== t) u.attack(t); break; }
    case 'patrol': {
      const units = myUnits(c).filter(u => u.weapon || u.def.heals || u.def.repairs);
      const slots = formationSlots(c.x, c.z, units.length, units.some(u => !u.isInf) ? 2 : 1);
      units.forEach((u, i) => { const s = u.air ? { x: c.x, z: c.z } : slots[i]; u.moveTo(s.x, s.z, { attackMove: true, patrol: { ax: u.x, az: u.z, bx: s.x, bz: s.z } }); });
      break;
    }
    case 'stop': for (const u of myUnits(c)) { u.stop(); u.waypoints = null; } break;
    case 'ability': for (const u of myUnits(c)) u.frenzy(); break;
    case 'board': { const apc = mine(c, c.tid); if (apc && capacityOf(apc)) { const room = capacityOf(apc) - (apc.passengers || []).length; myUnits(c).filter(u => u.isInf && !u.boarded).slice(0, room).forEach(u => u.board(apc)); } break; }
    case 'unload': for (const e of (c.ids || []).map(id => mine(c, id))) if (e && capacityOf(e) && e.passengers && e.passengers.length) ejectPassengers(e); break;
    case 'stance': for (const u of myUnits(c)) { u.stance = c.s === 'aggressive' ? null : c.s; if (c.s === 'holdfire') u.target = null; } break;
    case 'harv': for (const u of myUnits(c)) if (u.type === 'harvester') { u.oreCell = c.cell; u.hState = 'toOre'; u.requestPath(cellCenter(c.cell % 128), cellCenter((c.cell / 128) | 0)); } break;
    case 'seek': for (const u of myUnits(c)) if (u.type === 'harvester') { u.hState = 'seek'; u.path = null; u.hT = 0; } break;
    case 'dock': { const r = mine(c, c.rid); if (r) for (const u of myUnits(c)) if (u.type === 'harvester') { u.refinery = r; u.hState = 'return'; u.path = null; } break; }
    case 'q': enqueue(c.f, c.type); break;
    case 'dq': dequeue(c.f, c.type); break;
    case 'hold': { for (const q of Object.values(P.queues)) if (q.items[0] === c.type) q.hold = !!c.on; break; }
    case 'place': placeBuilding(c.f, c.type, c.cx, c.cz); break;
    case 'inst': placeInstant(c.f, c.type, c.cells); break;
    case 'sell': { const b = mine(c, c.id); if (b && b.kind === 'building') b.sell(); break; }
    case 'rep': { const b = mine(c, c.id); if (b && b.kind === 'building') b.repairing = c.on; break; }
    case 'rally': { const b = mine(c, c.id); if (b) b.rally = { x: c.x, z: c.z }; break; }
    case 'prim': { const b = mine(c, c.id); if (b) { for (const o of G.buildings) if (o.type === b.type && o.faction === c.f) o.primary = false; b.primary = true; } break; }
    case 'super': fireSuperweapon(c.f, c.x, c.z); break;
    case 'power': usePower(c.f, c.type, c.x, c.z); break;
    case 'surrender': G.surrendered = c.f; break;
    case 'repeat': { const q = P.queues[c.q]; if (q && ['infantry', 'vehicle', 'air'].includes(c.q)) q.repeat = !!c.on; break; }
    case 'spawn': if (G.cfg.mode === 'sandbox' && UNITS[c.type]) for (let i = 0; i < (c.n || 1); i++) { const a = i * 2.4, r = i ? 1.6 + i * 0.5 : 0; new Unit(c.type, c.side, c.x + Math.cos(a) * r, c.z + Math.sin(a) * r, Math.PI); } break;
  }
}

// helpers used by the UI
export function oreCellAt(x, z) { const i = idx(cellOf(x), cellOf(z)); return T.ore[i] > 0 ? i : -1; }
