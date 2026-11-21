// Achievements (medals): unlocked by events during play, saved in this browser, shown as toasts and on
// the Medals screen.
import { G, on } from './state.js';
import { survival } from './survival.js';

export const MEDALS = {
  first_blood:  { icon: '🩸', name: 'First Blood', desc: 'Destroy your first enemy unit.' },
  elite:        { icon: '⭐', name: 'Battle Hardened', desc: 'Promote a unit to Elite rank (two stars).' },
  rampage:      { icon: '🦸', name: 'Wally Man Rampage', desc: 'A single Wally Man destroys 10 enemies.' },
  builder:      { icon: '🏗', name: 'Master Builder', desc: 'Build 20 structures in one game.' },
  tycoon:       { icon: '💎', name: 'Crystal Tycoon', desc: 'Harvest 20,000 credits in one game.' },
  crates:       { icon: '📦', name: 'Crate Hunter', desc: 'Collect 5 supply crates in one game.' },
  capture:      { icon: '🔧', name: 'Hostile Takeover', desc: 'Capture a building with an Engineer.' },
  superweapon:  { icon: '☢', name: 'Doomsday', desc: 'Fire a superweapon.' },
  powers:       { icon: '📡', name: 'Full Support', desc: 'Use all three support powers in one game.' },
  designer:     { icon: '🛠', name: 'Inventor', desc: 'Field one of your own Unit Designer creations.' },
  mission:      { icon: '🎖', name: 'Mission Accomplished', desc: 'Complete a campaign mission.' },
  campaign:     { icon: '🏆', name: 'War Hero', desc: 'Defeat the Grimlock Warlord and finish the campaign.' },
  commander:    { icon: '👑', name: 'Commander', desc: 'Win a skirmish on Commander difficulty.' },
  blitz:        { icon: '⚡', name: 'Blitzkrieg', desc: 'Win a skirmish in under 15 minutes.' },
  untouchable:  { icon: '🛡', name: 'Untouchable', desc: 'Win a skirmish without losing a single structure.' },
  survive10:    { icon: '☠', name: 'Survivor', desc: 'Reach wave 10 in Survival.' },
  survive20:    { icon: '💀', name: 'Unbreakable', desc: 'Reach wave 20 in Survival.' },
  online:       { icon: '🌐', name: 'Online Champion', desc: 'Win an online battle.' },
  bootcamp:     { icon: '🎓', name: 'Graduate', desc: 'Finish Boot Camp.' },
  streak:       { icon: '🔥', name: 'Unstoppable', desc: 'Get a kill streak of 8.' },
  garrison:     { icon: '🏰', name: 'Fortified', desc: 'Fill a Battle Bunker with 4 troops.' },
  grak:         { icon: '👹', name: 'Grak Smash', desc: 'Warlord Grak destroys 10 enemies.' },
  magma:        { icon: '🌋', name: 'Trial by Fire', desc: 'Win a battle on Magma Rift.' },
  mutant:       { icon: '🎲', name: 'Mad Science', desc: 'Win a skirmish with 2 or more mutators.' },
  daily:        { icon: '📅', name: 'Daily Duty', desc: 'Win a Daily Challenge.' },
  heroic:       { icon: '🌟', name: 'Heroic', desc: 'Promote a unit to Heroic rank (10 kills).' },
  grimcamp:     { icon: '👹', name: 'Legion Triumphant', desc: 'Finish the Grimlock campaign as Warlord Grak.' },
  squatter:     { icon: '🏠', name: 'Home Sweet Home', desc: 'Move troops into a civilian house.' },
  shock:        { icon: '🌩', name: 'Shocking!', desc: 'One Tesla Coil bolt strikes three enemies.' },
  autumn:       { icon: '🍂', name: 'Fall Guy', desc: 'Win a battle on Autumn Hollow.' },
  koth:         { icon: '👑', name: 'King of the Hill', desc: 'Win a King of the Hill skirmish.' },
  bounty:       { icon: '💰', name: 'Highway Robbery', desc: 'Destroy a bounty convoy.' },
  giant:        { icon: '🗡', name: 'Giant Slayer', desc: 'Destroy an enemy Wally Mech or Cave Troll.' },
  spy:          { icon: '🕵', name: 'Double Agent', desc: 'Sneak a Spy into an enemy building.' },
  blossom:      { icon: '🌸', name: 'Petal Power', desc: 'Win a battle on Blossom Gardens.' },
  highland:     { icon: '🏴', name: 'Braveheart', desc: 'Win a battle on Highland Glen.' },
  hunt:         { icon: '🎯', name: 'Headhunter', desc: 'Win a Hero Hunt skirmish.' },
  bloodmoon:    { icon: '🌕', name: 'Blood Moon Survivor', desc: 'Make it through a Blood Moon night.' },
  haggis:       { icon: '🐾', name: 'Haggis Hunter', desc: 'Catch a wild haggis.' },
  partyhat:     { icon: '🎉', name: 'Party Animal', desc: 'Win a skirmish with the Party Hats mutator.' },
  dragon:       { icon: '🐉', name: 'Dragonslayer', desc: 'Slay an Ancient Dragon.' },
  bonus3:       { icon: '🎯', name: 'Overachiever', desc: 'Complete all three bonus objectives in one skirmish.' },
  monster:      { icon: '🍦', name: 'You Monster', desc: 'Blow up the ice cream van.' },
  canyon:       { icon: '🏜', name: 'Canyon Conqueror', desc: 'Win a battle on Red Canyon.' },
  epilogue:     { icon: '🗡', name: 'Into the Fire', desc: 'Defeat Warlord Grak in the final campaign mission.' },
};

const KEY = 'ws_medals';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
let got = load();
const session = { crates: 0, powers: new Set(), structuresLost: 0 };

export function unlock(id) {
  if (got[id] || !MEDALS[id] || G.cheated || G.spectating) return;
  got[id] = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(got)); } catch { /* ignore */ }
  toast(MEDALS[id]);
}

function toast(m) {
  const el = document.createElement('div');
  el.className = 'medalToast';
  el.innerHTML = `<div class="mi">${m.icon}</div><div><div class="mt">MEDAL UNLOCKED</div><div class="mn">${m.name}</div><div class="md">${m.desc}</div></div>`;
  (document.getElementById('app') || document.body).appendChild(el);
  G.sfx?.play('promote');
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.classList.remove('show'), 4200);
  setTimeout(() => el.remove(), 4800);
}

export function initAchievements(run) {
  on('kill', (victim, killer) => {
    if (victim.faction === G.player && victim.kind === 'building' && !victim.def.isMine && !victim.def.isWall) session.structuresLost++;
    if (!killer || killer.faction !== G.player || victim.faction === G.player) return;
    unlock('first_blood');
    if (victim.kind === 'unit' && (victim.type === 'mech' || victim.type === 'troll')) unlock('giant');
    if (killer.kind === 'unit') {
      if (killer.rank >= 2) unlock('elite');
      if (killer.type === 'wallyman' && killer.kills >= 10) unlock('rampage');
      if (killer.type === 'warlord' && killer.kills >= 10) unlock('grak');
    }
  });
  on('house', (b, f) => { if (f === G.player) unlock('squatter'); });
  on('chain3', f => { if (f === G.player) unlock('shock'); });
  on('bounty', (f, type) => { if (f === G.player) unlock(type === 'haggis' ? 'haggis' : type === 'dragon' ? 'dragon' : 'bounty'); });
  on('infiltrate', f => { if (f === G.player) unlock('spy'); });
  on('bloodmoon', () => { if (G.buildings.some(b => !b.dead && b.faction === G.player)) unlock('bloodmoon'); });
  on('bonus3', () => unlock('bonus3'));
  on('monster', () => unlock('monster'));
  on('heroic', u => { if (u.faction === G.player) unlock('heroic'); });
  on('crate', f => { if (f === G.player && ++session.crates >= 5) unlock('crates'); });
  on('capture', (b, f) => { if (f === G.player) unlock('capture'); });
  on('super', f => { if (f === G.player) unlock('superweapon'); });
  on('power', (f, type) => { if (f === G.player) { session.powers.add(type); if (session.powers.size >= 3) unlock('powers'); } });
  on('end', win => {
    if (!win) return;
    if (run.mode === 'campaign') { unlock('mission'); if (run.camp === 'grim') { if (run.mission === 2) unlock('grimcamp'); } else { if (run.mission === 4) unlock('campaign'); if (run.mission === 5) unlock('epilogue'); } }
    if (run.mode === 'tutorial') unlock('bootcamp');
    if (run.map === 'magma') unlock('magma');
    if (run.map === 'autumn') unlock('autumn');
    if (run.map === 'blossom') unlock('blossom');
    if (run.map === 'highland') unlock('highland');
    if (run.map === 'canyon') unlock('canyon');
    if (run.koth && run.mode === 'skirmish') unlock('koth');
    if (run.hunt && run.mode === 'skirmish') unlock('hunt');
    if (run.daily) unlock('daily');
    if (run.mode === 'skirmish' && run.mut && run.mut.length >= 2) unlock('mutant');
    if (run.mode === 'skirmish' && run.mut && run.mut.includes('party')) unlock('partyhat');
    if (run.mode === 'skirmish') {
      if (run.difficulty === 'hard') unlock('commander');
      if (G.time < 15 * 60) unlock('blitz');
      if (session.structuresLost === 0) unlock('untouchable');
    }
    if (run.mode === 'mp') unlock('online');
  });
}

let t = 0;
export function checkAchievements(dt) {
  t -= dt; if (t > 0) return; t = 1;
  if (G.stats.built >= 20) unlock('builder');
  if ((G.bestStreak || 0) >= 8) unlock('streak');
  if (G.buildings.some(b => !b.dead && b.faction === G.player && b.type === 'bunker' && (b.passengers || []).length >= b.def.garrison)) unlock('garrison');
  if (G.stats.harvested >= 20000) unlock('tycoon');
  if (G.units.some(u => !u.dead && u.faction === G.player && u.def.custom)) unlock('designer');
  if (G.units.some(u => !u.dead && u.faction === G.player && u.rank >= 2 && !u.hero)) unlock('elite');
  if (G.cfg.mode === 'survival') { if (survival.wave >= 10) unlock('survive10'); if (survival.wave >= 20) unlock('survive20'); }
}

export function buildMedals(el) {
  got = load();
  const n = Object.keys(MEDALS).filter(k => got[k]).length;
  el.innerHTML = `<p style="text-align:center">${n} of ${Object.keys(MEDALS).length} medals earned</p><div class="medalGrid">` +
    Object.entries(MEDALS).map(([k, m]) => `<div class="medal ${got[k] ? 'on' : ''}"><div class="mi">${got[k] ? m.icon : '🔒'}</div><div><div class="mn">${m.name}</div><div class="md">${m.desc}</div>${got[k] ? `<div class="mdate">${new Date(got[k]).toLocaleDateString()}</div>` : ''}</div></div>`).join('') + '</div>';
}
