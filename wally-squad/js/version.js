// Version number and update notes. Bump VERSION and add a new entry at the top of CHANGELOG for every
// update: players see a "What's New" screen the first time they load a new version.
export const VERSION = '1.28';

export const CHANGELOG = [
  { v: '1.28', date: '2026-11-19', title: 'Giants & Thunder', items: [
    '🤖 Wally Mech (Wally Squad): a towering two-legged battle walker with twin shoulder cannons.',
    '👹 Cave Troll (Grimlocks): a huge club-swinging brute that heals its own wounds.',
    '⛈ Thunderstorms now throw real lightning strikes that can hit your troops.',
    '🌋 The volcano on Magma Rift erupts, raining lava bombs.',
    '🎖 New medal: Giant Slayer.',
  ] },
  { v: '1.27', date: '2026-11-19', title: 'Bounty Hunters', items: [
    '💰 Bounty Convoys: an armoured cash truck crosses the map every few minutes. Destroy it before it escapes for $1,500!',
    '🛬 Reinforcements support power: two tanks parachute onto the battlefield.',
    '🐟 Fish leap out of the lakes and 🦋 butterflies flutter over the grass.',
    '📜 Update numbers and this What\'s New screen.',
    '🎖 New medal: Highway Robbery.',
  ] },
  { v: '1.26', date: '2026-11-19', title: 'King of the Hill', items: [
    '👑 King of the Hill skirmish option: hold the glowing ring for 3 minutes to win.',
    '🐉 Wyvern Rider (Grimlocks): a fire-breathing flying beast.',
    '⚡ Tesla Truck (Wally Squad): mobile chain lightning.',
    '✨ Fireflies after dark.',
  ] },
  { v: '1.25', date: '2026-11-19', title: 'Autumn Hollow', items: [
    '🍂 New map: Autumn Hollow, with red and gold woods and drifting leaves.',
    '💣 Grenadier (Wally Squad) and 🧨 Goblin Boomer (Grimlocks).',
    '🐑 Sheep, cows and penguins graze on the maps.',
  ] },
  { v: '1.24', date: '2026-11-19', title: 'Towers & Houses', items: [
    '⚡ Tesla Coil and 🔥 Flame Tower faction defences.',
    '🏠 Civilian houses your infantry can move into and hold.',
  ] },
  { v: '1.23', date: '2026-11-19', title: 'Pause menu fix', items: ['The pause menu is no longer hidden behind the build menu.'] },
  { v: '1.22', date: '2026-11-19', title: 'Things That Go Boom', items: [
    '🌲 Forests can be blown down by big explosions.',
    '🛢 Explosive fuel barrels, tread tracks, shell casings and a cinematic filter.',
  ] },
  { v: '1.21', date: '2026-11-19', title: 'Good Boys', items: [
    '🐕 Attack Dogs, veteran nicknames, birds and rainbows.',
    '"Loading Wally Squad" screen, Wally Man photo and copyright on the main menu.',
  ] },
  { v: '1.20', date: '2026-11-19', title: 'Find the enemy', items: ['🎯 Find enemy base button.'] },
  { v: '1.19', date: '2026-11-19', title: 'Soundtrack', items: ['🎵 12-tune soundtrack and 12 more Wally Man introductions.'] },
  { v: '1.18', date: '2026-11-19', title: 'Watch & Win', items: ['📺 Watch AI Battle, 🗿 Victory Monument, ✈ Strike Jet and the Emerald Isles map.'] },
  { v: '1.17', date: '2026-11-19', title: 'Menu fit', items: ['The main menu shows every option without scrolling.'] },
  { v: '1.16', date: '2026-11-19', title: 'Smooth scrolling', items: ['Menus scroll with a finger, including in Facebook\'s in-app browser.'] },
  { v: '1.15', date: '2026-11-18', title: 'Tip jar', items: ['☕ Ko-fi tip jar.'] },
  { v: '1.14', date: '2026-11-18', title: 'Legion Rising', items: ['👹 Grimlock campaign, enemy taunts, victory fireworks and cheat codes.'] },
  { v: '1.13', date: '2026-11-18', title: 'Scorcher voices', items: ['12 Wally Man introductions for the Scorcher.'] },
  { v: '1.12', date: '2026-11-18', title: 'Colours', items: ['🎨 Army colours, repeat production, Grimlock Shaman and meteor showers.'] },
  { v: '1.11', date: '2026-11-18', title: 'Shuffle', items: ['🎵 Six-tune shuffled soundtrack.'] },
  { v: '1.10', date: '2026-11-18', title: 'Sandbox', items: ['🧪 Sandbox mode, Sky Hauler, battle log, finale camera and a brighter night.'] },
  { v: '1.9', date: '2026-11-18', title: 'Warlord', items: ['👹 Warlord Grak, Skimmer Hovercraft, EMP Strike, Heroic rank and Natural Disasters.', 'Units fight back when fired upon.'] },
  { v: '1.8', date: '2026-11-18', title: 'Magma Rift', items: ['🌋 Magma Rift map, Battle Bunker, mutators, Daily Challenge, Boot Camp, APC and more.', 'Performance pass for phones.'] },
  { v: '1.7', date: '2026-11-18', title: 'FPS counter', items: ['Visible FPS counter.'] },
  { v: '1.6', date: '2026-11-18', title: 'Map Editor', items: ['🗺 Map Editor, research upgrades, unit stances and photo mode.'] },
  { v: '1.5', date: '2026-11-18', title: 'Survival', items: ['☠ Survival mode, support powers and medals.'] },
  { v: '1.4', date: '2026-11-18', title: 'Graphics', items: ['Graphics settings, supply crates, tech buildings, waypoints and the Unit Designer.'] },
  { v: '1.3', date: '2026-11-18', title: 'Wally Man', items: ['🦸 Wally Man, the caped Gatling-gun hero.'] },
  { v: '1.2', date: '2026-11-18', title: 'Phones', items: ['Better landscape play on phones.'] },
  { v: '1.1', date: '2026-11-18', title: 'Sidebar', items: ['Build sidebar fits on phones.'] },
  { v: '1.0', date: '2026-11-18', title: 'Launch', items: ['Wally Squad launches: campaign, online play, superweapons, maps, weather and voices.'] },
];

const KEY = 'ws_seen_version';
export function isNewVersion() { try { return localStorage.getItem(KEY) !== VERSION; } catch { return false; } }
export function markSeen() { try { localStorage.setItem(KEY, VERSION); } catch { /* ignore */ } }

// fill the What's New panel: the newest update in full, older ones underneath
export function buildNews(el) {
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const [latest, ...older] = CHANGELOG;
  let h = `<div class="newsHead"><span class="newsVer">v${latest.v}</span> <b>${esc(latest.title)}</b> <span class="newsDate">${latest.date}</span></div><ul class="newsList">${latest.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
  h += '<div class="label">Earlier updates</div><div class="newsOld">';
  for (const c of older) h += `<div class="newsRow"><span class="newsVer">v${c.v}</span> <b>${esc(c.title)}</b> <span class="newsDate">${c.date}</span><div class="newsSub">${c.items.map(esc).join(' ')}</div></div>`;
  el.innerHTML = h + '</div>';
}
