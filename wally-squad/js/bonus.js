// Bonus objectives: three random side goals in each single-player skirmish, each worth $1,000.
// (They're picked on this device only, so they're off in online battles.)
import { G, on, srand } from './state.js';

const POOL = [
  { id: 'inf', text: 'Defeat 15 enemy infantry', goal: 15 },
  { id: 'veh', text: 'Destroy 6 enemy vehicles', goal: 6 },
  { id: 'bld', text: 'Destroy 3 enemy buildings', goal: 3 },
  { id: 'crate', text: 'Collect 2 supply crates', goal: 2 },
  { id: 'army', text: 'Have 20 units at once', goal: 20 },
  { id: 'cash', text: 'Harvest $6,000 of crystal', goal: 6000 },
  { id: 'elite', text: 'Promote a unit to Elite', goal: 1 },
  { id: 'house', text: 'Move troops into a civilian house', goal: 1 },
  { id: 'power', text: 'Use 2 support powers', goal: 2 },
  { id: 'wm', text: 'Get 5 kills with Wally Man or Warlord Grak', goal: 5 },
];
export const bonus = { list: [], done: 0 };

export function initBonus(run, message) {
  if (run.mode !== 'skirmish') return;
  const pool = [...POOL], pick = []; // seeded, so replays (and both players online) get the same objectives
  while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(srand() * pool.length), 1)[0]);
  bonus.list = pick.map(p => ({ ...p, n: 0, done: false }));
  const add = (id, k = 1) => {
    for (const b of bonus.list) if (b.id === id && !b.done) {
      b.n = Math.min(b.goal, b.n + k);
      if (b.n >= b.goal) {
        b.done = true; bonus.done++;
        G.players[G.player].credits += 1000;
        message(`🎯 Bonus objective complete: ${b.text} (+$1,000)`);
        G.sfx?.play('promote');
        if (bonus.done === 3) G.emitBonus3?.();
      }
    }
    render();
  };
  const set = (id, v) => { for (const b of bonus.list) if (b.id === id && !b.done && v > b.n) add(id, v - b.n); };
  on('kill', (victim, killer) => {
    if (!killer || killer.faction !== G.player || victim.faction === G.player || victim.faction === 'neutral') return;
    if (victim.kind === 'unit') add(victim.isInf ? 'inf' : 'veh');
    else if (!victim.def.isMine && !victim.def.isWall) add('bld');
    if (killer.kind === 'unit' && (killer.type === 'wallyman' || killer.type === 'warlord')) add('wm');
  });
  on('crate', f => { if (f === G.player) add('crate'); });
  on('power', f => { if (f === G.player) add('power'); });
  on('house', (b, f) => { if (f === G.player) add('house'); });
  setInterval(() => {
    if (!G.started || G.over) return;
    set('army', G.units.filter(u => !u.dead && u.faction === G.player).length);
    set('cash', Math.floor(G.stats.harvested));
    if (G.units.some(u => !u.dead && u.faction === G.player && u.rank >= 2)) set('elite', 1);
  }, 1000);
  setTimeout(() => message(`🎯 Bonus objectives: ${bonus.list.map(b => b.text).join(' · ')} - each worth $1,000!`), 6000);
  render();
}
function render() {
  const el = document.getElementById('bonusList'); if (!el) return;
  el.innerHTML = bonus.list.length ? '<b>🎯 Bonus objectives</b>' + bonus.list.map(b => `<div style="opacity:${b.done ? 0.6 : 1}">${b.done ? '✅' : '⬜'} ${b.text}${b.goal > 1 && !b.done ? ` (${b.goal >= 1000 ? '$' + b.n.toLocaleString() : b.n}/${b.goal >= 1000 ? '$' + b.goal.toLocaleString() : b.goal})` : ''}</div>`).join('') : '';
}
