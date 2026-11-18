// Survival mode: hold out against endless, ever-stronger enemy waves. Score = enemy value destroyed
// + a bonus for every wave survived. Best scores are kept per map.
import { G, srand, srr, on } from './state.js';
import { UNITS, DIFFICULTY } from './config.js';
import { BASES } from './terrain.js';
import { Unit, alive } from './entities.js';

const S = { wave: 0, next: 75, score: 0, active: [], boss: false };
export const survival = S;

const POOL = {
  wally: [['rifle', 1], ['rocket', 1], ['flamer', 0.6], ['buggy', 1], ['tank', 1.2], ['arty', 0.5], ['titan', 0.5], ['wallyman', 0.4], ['gunship', 0.4]],
  grim: [['rifle', 1], ['rocket', 1], ['flamer', 0.8], ['buggy', 1], ['tank', 1.2], ['arty', 0.5], ['inferno', 0.6], ['stealth', 0.5], ['gunship', 0.4]],
};

export function initSurvival() {
  S.wave = 0; S.next = 75; S.score = 0; S.active = [];
  on('kill', (victim, killer) => {
    if (victim.kind === 'unit' && victim.faction === G.enemy && killer && killer.faction === G.player) S.score += Math.round((victim.def.cost || 100) / 10) * (victim.boss ? 5 : 1);
  });
}

function spawnWave() {
  S.wave++;
  const diff = DIFFICULTY[G.difficulty];
  const budget = (900 + S.wave * 650 + S.wave * S.wave * 40) * (0.7 + 0.3 * diff.aiBuild);
  const pool = POOL[G.enemy].filter(([t]) => S.wave >= ({ gunship: 6, titan: 5, inferno: 4, stealth: 5, arty: 3, wallyman: 4 }[t] || 1));
  const total = pool.reduce((a, [, w]) => a + w, 0);
  const home = BASES[G.enemy], tgt = BASES[G.player];
  let spent = 0, k = 0;
  const units = [];
  while (spent < budget && units.length < 40) {
    let r = srand() * total, type = pool[0][0];
    for (const [t, w] of pool) { if (r < w) { type = t; break; } r -= w; }
    const a = k * 2.399, rad = 2.2 * Math.sqrt(k + 1);
    const u = new Unit(type, G.enemy, home.x + Math.cos(a) * rad, home.z + Math.sin(a) * rad, Math.atan2(tgt.x - home.x, tgt.z - home.z));
    u.moveTo(tgt.x + srr(-8, 8), tgt.z + srr(-8, 8), { attackMove: true });
    units.push(u); spent += UNITS[type].cost; k++;
  }
  // boss every 5th wave: an elite heavy hitter with triple health
  S.boss = S.wave % 5 === 0;
  if (S.boss) {
    const bt = G.enemy === 'wally' ? 'titan' : 'inferno';
    const b = new Unit(bt, G.enemy, home.x, home.z, 0);
    b.maxHp = b.hp = b.maxHp * 3; b.rank = 2; b.kills = 6; b.boss = true;
    b.moveTo(tgt.x, tgt.z, { attackMove: true });
    units.push(b);
  }
  S.active = units;
  G.announce?.(S.boss ? `Wave ${S.wave}. Warning: boss incoming!` : `Wave ${S.wave} incoming`, G.player, 1);
  G.ui?.message(`Wave ${S.wave}: ${units.length} enemies${S.boss ? ' + BOSS' : ''}`, true);
  G.alertAt = { x: home.x, z: home.z, t: G.time };
}

export function updateSurvival(dt) {
  S.next -= dt;
  const left = S.active.filter(alive);
  if (S.wave > 0 && !left.length && S.next > 20) S.next = 20; // wave cleared: next one comes sooner
  if (S.wave > 0 && !left.length && !S.cleared) { S.cleared = true; S.score += 50 * S.wave; G.ui?.message(`Wave ${S.wave} cleared! +${50 * S.wave} points`); G.sfx?.play('ready'); }
  if (S.next <= 0) { S.cleared = false; spawnWave(); S.next = 70 + Math.min(40, S.wave * 3); }
  // keep stragglers pushing toward the player
  for (const u of left) if (!u.order && !u.target && !u.path) {
    let best = null, bd = 1e9;
    for (const b of G.buildings) if (!b.dead && b.faction === G.player) { const d = Math.hypot(b.x - u.x, b.z - u.z); if (d < bd) { bd = d; best = b; } }
    for (const o of G.units) if (!o.dead && o.faction === G.player) { const d = Math.hypot(o.x - u.x, o.z - u.z); if (d < bd * 0.7) { bd = d; best = o; } }
    if (best) u.moveTo(best.x + srr(-3, 3), best.z + srr(-3, 3), { attackMove: true });
  }
}

export function survivalPanel() {
  const left = S.active.filter(alive).length;
  return `<div class="label" style="margin:0 0 3px">Survival</div>
    <div class="ob">Wave <b style="color:var(--accent)">${S.wave}</b>${S.wave ? ` · ${left} enemies left` : ''}</div>
    <div class="ob">Next wave in <b style="color:var(--accent)">${Math.max(0, Math.ceil(S.next))}s</b></div>
    <div class="ob">Score <b style="color:var(--accent)">${S.score.toLocaleString()}</b></div>`;
}

export function saveBest(map) {
  const key = 'ws_survival_best';
  let best = {}; try { best = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* ignore */ }
  const prev = best[map] || { score: 0, wave: 0 };
  const isNew = S.score > prev.score;
  if (isNew) { best[map] = { score: S.score, wave: S.wave }; try { localStorage.setItem(key, JSON.stringify(best)); } catch { /* ignore */ } }
  return { prev, isNew };
}
export function bestScores() { try { return JSON.parse(localStorage.getItem('ws_survival_best') || '{}'); } catch { return {}; } }
