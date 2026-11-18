// Commander profile: career stats and a rank that grows with experience (XP) earned in every game.
// Stored in the browser, so it belongs to this device.
const KEY = 'ws_profile';
export const RANKS = [
  { name: 'Private', xp: 0, icon: '▫' },
  { name: 'Corporal', xp: 500, icon: '›' },
  { name: 'Sergeant', xp: 1500, icon: '»' },
  { name: 'Lieutenant', xp: 3500, icon: '★' },
  { name: 'Captain', xp: 7000, icon: '★★' },
  { name: 'Major', xp: 12000, icon: '✪' },
  { name: 'Colonel', xp: 20000, icon: '✪✪' },
  { name: 'General', xp: 32000, icon: '✸' },
  { name: 'Field Marshal', xp: 50000, icon: '♛' },
];

export function loadProfile() {
  try { return { games: 0, wins: 0, kills: 0, lost: 0, built: 0, xp: 0, time: 0, bestStreak: 0, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { games: 0, wins: 0, kills: 0, lost: 0, built: 0, xp: 0, time: 0, bestStreak: 0 }; }
}
export function rankOf(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const r = RANKS[i], next = RANKS[i + 1] || null;
  return { ...r, index: i, next, progress: next ? (xp - r.xp) / (next.xp - r.xp) : 1 };
}

// XP for one finished game: taking part, winning, kills, structures, with a difficulty multiplier
export function awardGame({ win, kills, lost, built, time, difficulty, mode, streak }) {
  const p = loadProfile();
  const before = rankOf(p.xp);
  const diffMult = { easy: 0.75, normal: 1, hard: 1.5 }[difficulty] || 1;
  const modeMult = mode === 'mp' ? 1.5 : mode === 'tutorial' ? 0.5 : 1;
  const xp = Math.round((100 + (win ? 250 : 0) + kills * 6 + built * 10 + Math.min(300, time / 4)) * diffMult * modeMult);
  p.games++; if (win) p.wins++;
  p.kills += kills; p.lost += lost; p.built += built; p.time += time; p.xp += xp;
  p.bestStreak = Math.max(p.bestStreak, streak || 0);
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full or blocked */ }
  const after = rankOf(p.xp);
  return { xp, total: p.xp, rank: after, promoted: after.index > before.index ? after : null };
}

// small card for the main menu
export function profileCard() {
  const p = loadProfile(), r = rankOf(p.xp);
  const pct = Math.round(r.progress * 100);
  const h = Math.floor(p.time / 3600), m = Math.floor(p.time % 3600 / 60);
  return `<div class="profRank"><span class="profIcon">${r.icon}</span> <b>${r.name}</b> · ${p.xp.toLocaleString()} XP</div>
    <div class="profBar"><div style="width:${pct}%"></div></div>
    <div class="profSub">${r.next ? `${(r.next.xp - p.xp).toLocaleString()} XP to ${r.next.name}` : 'Highest rank reached!'} · ${p.games} games · ${p.wins} wins · ${p.kills.toLocaleString()} kills${p.time ? ` · ${h ? h + 'h ' : ''}${m}m played` : ''}</div>`;
}
