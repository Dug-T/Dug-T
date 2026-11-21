// Wally Squad — entry point: renderer, lighting, post-processing, game modes, menus and the main loop.
import * as THREE from 'three';
import { EffectComposer } from '../lib/postprocessing/EffectComposer.js';
import { RenderPass } from '../lib/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../lib/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../lib/postprocessing/ShaderPass.js';
import { OutputPass } from '../lib/postprocessing/OutputPass.js';
import { G, runTimers, seedSim, emit, on } from './state.js';
import { DIFFICULTY, FACTIONS, MUTATORS, hasMut, UNITS, TEAM_COLORS, applyTeamColor } from './config.js';
import { MAPS, THEMES, getMap } from './maps.js';
import { updateFallingTrees } from './terrain.js';
import { buildTerrain, setupMap, BASES, cellOf, updateVision, updateOre, regrowOre, animateWater, revealAll, revealCircle } from './terrain.js';
import { initFX, updateFX, setParticleScale } from './particles.js';
import { Building, Unit, rebuildHash, updateProjectiles, updateDecay, cleanupDead } from './entities.js';
import { initPlayer, updatePower, updateProduction } from './production.js';
import { AI } from './ai.js';
import * as UI from './ui.js';
import * as Audio from './audio.js';
import * as Voices from './voices.js';
import { initWeather, updateWeatherSim, updateWeatherFX } from './weather.js';
import { updateSuper } from './superweapons.js';
import { MISSIONS, GRIM_MISSIONS, TUTORIAL, makeContext, campaignProgress, unlockNext, campaignList } from './missions.js';
import { Lockstep, joinRoom } from './mp.js';
import { randomRoomCode } from './net.js';
import { issue } from './cmd.js';
import { registerCustomUnits, loadDesigns, buildDesigner } from './customunits.js';
import { gfx, initGraphics, pixelRatio, autoTune, buildGraphicsPanel, maxAnisotropy, isTouch, shadowInterval } from './graphics.js';
import { allMaterials } from './materials.js';
import { updateConvoy, updateHaggis, updateDragon, updateIceCream } from './features.js';
import { updateCrates, animateCrates, placeTechBuildings, placeBarrels, placeHouses, recordHistory, drawHistory } from './features.js';
import { updatePowers } from './powers.js';
import { updateHazards } from './hazards.js';
import { initHill, updateHill, hillWinner, hill } from './koth.js';
import { initAmbient, updateAmbient } from './ambient.js';
import { initAchievements, checkAchievements, buildMedals } from './achievements.js';
import { registerCustomMaps, buildMapEditor } from './mapeditor.js';
import { updateOrientation } from './orient.js';
import { awardGame, profileCard } from './profile.js';
import { initTipJar } from './tipjar.js';
import { initBonus } from './bonus.js';
import { VERSION, isNewVersion, markSeen, buildNews, checkForUpdate, registerUpdater, updateNow } from './version.js';
updateOrientation();
import { initSurvival, updateSurvival, survivalPanel, saveBest, bestScores, survival } from './survival.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const loadBar = $('loadBar');
const step = async (p) => { loadBar.style.width = (p * 100) + '%'; await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };

let renderer, scene, camera, composer, bloom, sun, hemi;
let ais = [];
let winT = 0, missionT = 0;
let fpsAcc = 0, fpsN = 0;
let mission = null, mctx = null, lockstep = null;

// ---------------------------------------------------------------- configuration for this run
// A game is started by storing a config in sessionStorage and reloading; no config = main menu.
const stored = sessionStorage.getItem('ws_cfg');
let cfg = stored ? JSON.parse(stored) : null;
const menuMode = !cfg;
{ const lv = document.getElementById('loadVer'); if (lv) lv.textContent = `Version ${VERSION}`; }
if (params.has('auto') && !cfg) cfg = { mode: 'skirmish', map: params.get('map') || 'valley', faction: params.get('faction') || 'wally', difficulty: localStorage.getItem('ws_diff') || 'normal', daynight: params.has('daynight'), weather: params.get('weather') || null, koth: params.has('koth'), hunt: params.has('hunt') };
if (cfg && cfg.mode !== 'mp') sessionStorage.removeItem('ws_cfg');
if (cfg && cfg.mode === 'mp') sessionStorage.removeItem('ws_cfg');
if (cfg) sessionStorage.setItem('ws_last', JSON.stringify(cfg));
const run = cfg || { mode: 'title', map: 'valley', faction: 'wally', difficulty: 'normal', daynight: false };
if (run.mode === 'campaign' || run.mode === 'tutorial') {
  const CAMP = campaignList(run.camp);
  mission = run.mode === 'tutorial' ? TUTORIAL : CAMP[run.mission] || CAMP[0];
  run.map = mission.map; run.faction = mission.faction || 'wally'; run.difficulty = mission.difficulty; run.daynight = false;
}
G.cfg = run;
G.player = run.faction === 'grim' ? 'grim' : 'wally';
G.enemy = G.player === 'wally' ? 'grim' : 'wally';
// your army colour (not in online games, where both players must agree on colours)
{ let col = run.color; try { col = col || localStorage.getItem('ws_color'); } catch { /* ignore */ } if (col && run.mode !== 'mp' && run.mode !== 'title') applyTeamColor(G.player, col); }
G.difficulty = DIFFICULTY[run.difficulty] ? run.difficulty : 'normal';

async function boot() {
  await step(0.05);
  // custom maps: your own saved maps, or the host's map in an online game
  registerCustomMaps();
  if (run.customMap) MAPS[run.map] = run.customMap;
  const map = getMap(run.map);
  const theme = THEMES[map.theme];
  // ---------- renderer ----------
  renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = isTouch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap; // soft shadows cost ~4x the texture reads
  renderer.shadowMap.autoUpdate = false; // redrawn every frame or two by the game loop (see shadowInterval)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  const horizon = new THREE.Color(theme.horizon);
  scene.background = horizon.clone();
  scene.fog = new THREE.Fog(horizon.clone(), 160, 420);
  camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);

  // ---------- sky + environment reflections ----------
  const skyGeo = new THREE.SphereGeometry(600, 32, 16);
  const skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
  const top = new THREE.Color(theme.skyTop), bot = new THREE.Color(theme.skyBottom), c = new THREE.Color();
  for (let i = 0; i < skyGeo.attributes.position.count; i++) {
    const y = skyGeo.attributes.position.getY(i) / 600;
    if (y > 0) c.copy(horizon).lerp(top, Math.pow(y, 0.6)); else c.copy(horizon).lerp(bot, Math.min(1, -y * 4));
    skyCol.set([c.r, c.g, c.b], i * 3);
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);
  G.three = { renderer, scene, camera, sun: null, sky };
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(skyGeo.clone(), sky.material));
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(12, 10, 8) }));
  sunBall.position.set(300, 380, 180); envScene.add(sunBall);
  const pmrem = new THREE.PMREMGenerator(renderer);
  G.three.envMap = pmrem.fromScene(envScene, 0.02, 1, 1000).texture;
  scene.environment = G.three.envMap;

  // ---------- lights ----------
  hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiI);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(theme.sun, theme.sunI);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); // replaced by the graphics settings below
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  const sc = sun.shadow.camera; sc.near = 10; sc.far = 300; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70;
  scene.add(sun); scene.add(sun.target);
  G.three.sun = sun; G.three.hemi = hemi;

  // ---------- post processing ----------
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: gfx.samples });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.55, 0.92);
  composer.addPass(bloom);
  G.three.bloom = bloom;
  // vignette + optional cinematic grade (film grain, a touch of chromatic aberration at the edges, richer colour)
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uCine: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uCine, uTime; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - 0.5;
        vec4 c = texture2D(tDiffuse, vUv);
        if (uCine > 0.5) {
          vec2 off = d * dot(d, d) * 0.012;
          c.r = texture2D(tDiffuse, vUv + off).r; c.b = texture2D(tDiffuse, vUv - off).b;
          c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), 0.18);            // gentle S-curve contrast
          c.rgb *= vec3(1.03, 1.0, 0.96);                                         // warm highlights
          c.rgb += (hash(vUv * 811.0 + fract(uTime) * 97.0) - 0.5) * 0.035;        // film grain
        }
        float v = 1.0 - dot(d, d) * (uVig + uCine * 0.12) * 2.2;
        c.rgb = mix(vec3(dot(c.rgb, vec3(0.299,0.587,0.114))), c.rgb, 1.08 + uCine * 0.07);
        gl_FragColor = vec4(c.rgb * v, c.a); }`,
  });
  composer.addPass(grade);
  G.three.grade = grade;
  composer.addPass(new OutputPass());
  G.onResize = (w, h) => {
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    // on phones the glow is computed at quarter resolution - it is a blur anyway
    if (isTouch) { const pr = renderer.getPixelRatio(); bloom.setSize(Math.round(w * pr / 2), Math.round(h * pr / 2)); }
    camera.aspect = w / h; camera.updateProjectionMatrix();
    setParticleScale(h * renderer.getPixelRatio());
  };
  await step(0.15);

  // ---------- world ----------
  const hostFaction = run.mode === 'mp' ? run.mp.hostFaction || (run.mp.role === 'host' ? G.player : G.enemy) : G.player;
  const slotOrder = [hostFaction, hostFaction === 'wally' ? 'grim' : 'wally'];
  setupMap(map, theme, slotOrder);
  seedSim(run.mp ? run.mp.seed : (Math.random() * 1e9) | 0);
  G.three.terrain = buildTerrain(scene);
  await step(0.55);
  initFX(scene);
  initWeather(scene, map, theme);
  initAmbient(scene, theme);
  G.sfx = Audio.sfx;
  initAchievements(run);
  G.announce = Audio.announce;
  Voices.initVoices();
  if (params.has('reveal')) { G.revealed = true; revealAll(true); }

  // ---------- player-designed units (online games use the host's designs so both sides match) ----------
  const customTypes = registerCustomUnits(run.mode === 'mp' ? (run.customUnits || []) : loadDesigns());

  // ---------- players and starting forces ----------
  initPlayer(G.player, false);
  if (run.credits) G.players[G.player].credits = run.credits;
  initPlayer(G.enemy, run.mode !== 'mp');
  initPlayer('neutral', false); G.players.neutral.credits = 0;
  if (run.credits) G.players[G.enemy].credits = run.credits;
  if (mission) {
    G.allowed = mission.allowed ? [...mission.allowed, ...customTypes] : null;
    mctx = makeContext(mission, {
      changed: renderObjectives,
      end: (win, text) => endGame(win, text),
      ai: opts => { ais = [new AI(G.enemy, opts)]; },
    });
    mission.setup(mctx);
  } else {
    for (const f of slotOrder) if (run.mode !== 'survival' || f === G.player) setupBase(f, BASES[f]);
    if (run.mode === 'survival') { initSurvival(); G.players[G.player].credits = 6000; }
  }
  placeTechBuildings();
  placeBarrels();
  placeHouses();
  initHill(scene);
  revealCircle(BASES[G.player].x, BASES[G.player].z, 42);
  updatePower();
  await step(0.7);

  UI.initUI();
  initGraphics({ renderer, sun, bloom, composer, scene, resize: () => UI.resize() });
  // sharpest possible texture filtering at glancing angles
  const aniso = maxAnisotropy();
  for (const m of allMaterials) for (const k of ['map', 'normalMap', 'emissiveMap']) if (m[k]) { m[k].anisotropy = aniso; m[k].needsUpdate = true; }
  UI.renderIcons(renderer);
  UI.buildGrid();
  await step(0.95);
  // face the camera toward the enemy
  const pb = BASES[G.player], eb = BASES[G.enemy];
  const yaw = Math.round(Math.atan2(-(eb.x - pb.x), -(eb.z - pb.z)) / (Math.PI / 2)) * (Math.PI / 2);
  G.camera.yaw = yaw;
  UI.centerOn(pb.x - Math.sin(yaw) * 4, pb.z - Math.cos(yaw) * 4);
  G.camera.dist = G.camera.targetDist = 62;
  UI.resize();

  $('loading').style.display = 'none';
  setupMenus();
  requestAnimationFrame(loop);
}

function setupBase(faction, pos) {
  new Building('conyard', faction, cellOf(pos.x) - 2, cellOf(pos.z) - 2, true);
  // Hero Hunt: each side's champion starts beside the Construction Yard - lose him and you lose the battle
  if (run.hunt && ['skirmish', 'mp', 'watch'].includes(run.mode)) {
    const l0 = Math.hypot(pos.x, pos.z) || 1;
    const hx = pos.x + (-pos.x / l0) * 6 + (pos.z / l0) * 6, hz = pos.z + (-pos.z / l0) * 6 - (pos.x / l0) * 6;
    const v = new Unit(faction === 'wally' ? 'wallyman' : 'warlord', faction, hx, hz, 0);
    v.vip = true; v.maxHp *= 2; v.hp = v.maxHp; v.addCrown?.();
  }
  if (run.army === false) return;
  // starting force rolls out toward the middle of the map
  const l = Math.hypot(pos.x, pos.z) || 1;
  const fx = -pos.x / l, fz = -pos.z / l;
  let start = [['tank', 6, 0], ['tank', 8, -3], ['buggy', 4, 6], ['rifle', 10, 3], ['rifle', 11, 4], ['rifle', 12, 2], ['rocket', 11, 6], ['rocket', 12, 5]];
  if (hasMut(run, 'infantry')) start = start.map(([t, a, b]) => [t === 'tank' ? 'rocket' : t === 'buggy' ? 'apc' : t, a, b]);
  for (const [t, a, b] of start) {
    const x = pos.x + fx * (a + 8) - fz * b, z = pos.z + fz * (a + 8) + fx * b;
    const u = new Unit(t, faction, x, z, Math.atan2(fx, fz));
    u.turretYaw = u.heading;
  }
}

// ---------------------------------------------------------------- menus
const panels = ['menuNews', 'menuMain', 'menuCampaign', 'menuSkirmish', 'menuOnline', 'menuVoices', 'menuDesigner', 'menuGraphics', 'menuSurvival', 'menuMedals', 'menuEditor', 'menuSandbox', 'menuWatch'];
function showPanel(id) {
  for (const p of panels) $(p).style.display = p === id ? 'block' : 'none';
  document.body.classList.toggle('newsOpen', id === 'menuNews'); // keep the roaming tip jar off the What's New screen
  if (id === 'menuVoices') Voices.buildStudio($('studio'), UI.icons);
  if (id === 'menuDesigner') buildDesigner($('designer'), { faction: 'wally' });
  if (id === 'menuGraphics') buildGraphicsPanel($('gfxPanel'));
  if (id === 'menuMedals') buildMedals($('medals'));
  if (id === 'menuNews') buildNews($('news'));
  if (id === 'menuEditor') buildMapEditor($('editor'), (mode, map) => startWith({ mode, map, faction: 'wally', difficulty: localStorage.getItem('ws_diff') || 'normal', daynight: true, weather: null }));
}
// ---------------------------------------------------------------- daily challenge
// Same map, faction and two mutators for everyone on a given day; beat it as fast as you can.
function dailyChallenge() {
  const d = new Date(), date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let h = 2166136261; for (const ch of date) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = (h + 0x6D2B79F5) >>> 0; return h / 4294967296; };
  const maps = ['valley', 'frost', 'dunes', 'midnight', 'magma', 'isles', 'autumn', 'blossom', 'highland', 'canyon'].filter(m => MAPS[m]);
  const muts = Object.keys(MUTATORS);
  const a = muts.splice(Math.floor(rnd() * muts.length), 1)[0], b = muts[Math.floor(rnd() * muts.length)];
  return { mode: 'skirmish', daily: date, map: maps[Math.floor(rnd() * maps.length)], faction: rnd() < 0.5 ? 'wally' : 'grim', difficulty: 'hard', daynight: true, weather: null, mut: [a, b] };
}
function dailyRecord() { try { return JSON.parse(localStorage.getItem('ws_daily') || 'null'); } catch { return null; } }
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------- battle log (kill feed)
const feedName = e => e.nick ? `${e.nick} (${e.def.name})` : e.def.name;
// ---------------------------------------------------------------- enemy commander taunts
const TAUNTS = {
  grim: { who: 'Warlord Grak', voice: 'warlord',
    start: ['Your crystals belong to the Legion!', 'Grak will crush your little squad!', 'Run home, Wally!'],
    lostBuilding: ['Grak will make you pay for that!', 'You dare touch my base?', 'Grrr! Rebuild it! REBUILD IT!'],
    tookBuilding: ['Ha! Your base crumbles like ice!', 'One less tower for Wally!', 'Burn, burn, BURN!'],
    hero: ['Your hero is no match for Grak!', 'Who is next?'],
    losing: ['This is not over, Wally!', 'Retreat! Er... I mean, regroup!'] },
  wally: { who: 'Commander Wally', voice: 'wally',
    start: ['Wally Squad, hold the line!', 'Nice try, Grimlocks. Not today!', 'Where is Wally? Right here!'],
    lostBuilding: ['Hey! We were using that!', 'Oi! That cost good crystal!', 'Squad, get them!'],
    tookBuilding: ['Another one bites the dust!', 'Your base is looking a bit thin, Grak!', 'Boom! Wally Squad strikes again!'],
    hero: ['Grak is down! Ha!', 'Who needs a Warlord anyway?'],
    losing: ['Fall back! Fall back!', 'We will be back, Grimlocks!'] },
};
let tauntT = -999;
function taunt(kind, force) {
  if (run.mode === 'mp' || run.mode === 'sandbox' || run.mode === 'watch' || (mission && mission.tutorial) || G.over) return;
  if (!force && G.time - tauntT < 35) return;
  const T = TAUNTS[G.enemy]; const list = T[kind]; if (!list) return;
  tauntT = G.time;
  const line = list[Math.floor(Math.random() * list.length)];
  UI.message(`💬 ${T.who}: "${line}"`, true);
  Voices.sayLine(line, T.voice);
}
function setupTaunts() {
  setTimeout(() => taunt('start', true), 9000);
  on('kill', (victim, killer) => {
    if (victim.kind === 'building' && !victim.def.isWall && !victim.def.isMine && victim.faction !== 'neutral') {
      if (victim.faction === G.enemy && killer && killer.faction === G.player) taunt(G.buildings.filter(b => !b.dead && b.faction === G.enemy && !b.def.isWall && !b.def.isMine).length <= 3 ? 'losing' : 'lostBuilding');
      else if (victim.faction === G.player) taunt('tookBuilding');
    }
    if (victim.kind === 'unit' && victim.def && (victim.type === 'wallyman' || victim.type === 'warlord') && victim.faction === G.player) taunt('hero', true);
  });
}

function setupFeed() {
  const el = $('feed');
  on('kill', (victim, killer) => {
    if (victim.kind === 'building' && victim.faction !== 'neutral' && !victim.def.isWall && !victim.def.isMine) G.lastFallen = { x: victim.x, y: victim.baseY || 0, z: victim.z };
    if (victim.faction !== G.player && (!killer || killer.faction !== G.player)) return; // only fights involving you
    if (victim.kind === 'building' && (victim.def.isWall || victim.def.isMine)) return;
    const c = f => f === 'wally' ? 'w' : 'g';
    const icon = victim.kind === 'building' ? '🏚' : victim.faction === G.player ? '☠' : '🎯';
    const text = killer && killer.def ? `${icon} <b class="${c(killer.faction)}">${feedName(killer)}</b> destroyed <b class="${c(victim.faction)}">${feedName(victim)}</b>`
      : `${icon} <b class="${c(victim.faction)}">${feedName(victim)}</b> was destroyed`;
    const last = el.lastElementChild;
    if (last && last.dataset.t === text) { last.dataset.n = +last.dataset.n + 1; last.innerHTML = `${text} <span class="n">×${last.dataset.n}</span>`; clearTimeout(last._t); last._t = setTimeout(() => fadeOut(last), 7000); return; }
    const d = document.createElement('div'); d.className = 'fl'; d.dataset.t = text; d.dataset.n = 1; d.innerHTML = text;
    el.appendChild(d);
    while (el.children.length > 5) el.firstElementChild.remove();
    d._t = setTimeout(() => fadeOut(d), 7000);
  });
  on('heroic', u => { if (u.faction === G.player) feedLine(`🌟 <b class="${u.faction === 'wally' ? 'w' : 'g'}">${feedName(u)}</b> is now Heroic`); });
  function fadeOut(d) { d.style.opacity = '0'; setTimeout(() => d.remove(), 650); }
  function feedLine(html) { const d = document.createElement('div'); d.className = 'fl'; d.innerHTML = html; el.appendChild(d); while (el.children.length > 5) el.firstElementChild.remove(); setTimeout(() => fadeOut(d), 7000); }
}

// ---------------------------------------------------------------- sandbox toolbar
function setupSandbox() {
  const bar = $('sandboxBar'); bar.style.display = 'flex';
  G.revealed = false;
  const st = { side: G.enemy, type: 'tank', n: 1, ai: false };
  G.sandbox = st;
  const btn = (label, fn, title) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.title = title || ''; b.onclick = () => { fn(b); Audio.play('click'); }; bar.appendChild(b); return b; };
  const sideB = btn('', b => { st.side = st.side === 'wally' ? 'grim' : 'wally'; showSide(); }, 'Which side spawned units join');
  const showSide = () => { sideB.textContent = st.side === 'wally' ? '🔵 Wally Squad' : '🔴 Grimlocks'; };
  showSide();
  const sel = document.createElement('select');
  for (const [k, d] of Object.entries(UNITS_ALL())) { const o = document.createElement('option'); o.value = k; o.textContent = d.name; if (k === st.type) o.selected = true; sel.appendChild(o); }
  sel.onchange = () => { st.type = sel.value; };
  bar.appendChild(sel);
  const spawnB = btn('✚ Spawn', () => { UI.setModePublic(G.mode === 'spawn' ? null : 'spawn'); spawnB.classList.toggle('on', G.mode === 'spawn'); }, 'Then tap the map to drop units there');
  const nB = btn('×1', b => { st.n = st.n === 1 ? 5 : 1; b.textContent = '×' + st.n; }, 'How many to spawn per tap');
  btn('🤖 Enemy AI: off', b => { st.ai = !st.ai; ais = st.ai ? [new AI(G.enemy)] : []; b.textContent = `🤖 Enemy AI: ${st.ai ? 'on' : 'off'}`; b.classList.toggle('on', st.ai); });
  btn('👁 Reveal', b => { G.revealed = !G.revealed; revealAll(G.revealed); b.classList.toggle('on', G.revealed); });
  btn('🧹 Clear units', () => { for (const u of G.units) if (!u.dead && u.type !== 'harvester') { u.hp = 0; u.die(null); } });
  setInterval(() => spawnB.classList.toggle('on', G.mode === 'spawn'), 400);
  G.sandboxSpawn = (x, z) => issue({ t: 'spawn', type: st.type, side: st.side, x, z, n: st.n });
  void nB;
}
const UNITS_ALL = () => UNITS;

function startWith(c) { sessionStorage.setItem('ws_cfg', JSON.stringify(c)); location.href = location.pathname + (params.has('loopnet') ? '?loopnet' : ''); }

function optionCards(el, items, sel, onPick) {
  el.innerHTML = '';
  for (const it of items) {
    const d = document.createElement('div');
    d.className = 'opt' + (it.id === sel ? ' on' : '') + (it.locked ? ' locked' : '');
    d.innerHTML = (it.swatch ? `<div class="swatch" style="background:${it.swatch}"></div>` : '') + `<b>${it.title}</b><span>${it.desc || ''}</span>`;
    if (!it.locked) d.onclick = () => { [...el.children].forEach(c => c.classList.remove('on')); d.classList.add('on'); Audio.initAudio(); Audio.play('click'); onPick(it.id); };
    el.appendChild(d);
  }
}
const MAP_SWATCH = { canyon: 'linear-gradient(135deg,#8a3a20,#d8905a 50%,#2a7a8a)', highland: 'linear-gradient(135deg,#55703a,#7a6488 50%,#1e3a48)', blossom: 'linear-gradient(135deg,#ffb6d2,#f6e6ee 45%,#6a9a3e)', autumn: 'linear-gradient(135deg,#c0501e,#d9a02a 50%,#7a7a32)', isles: 'linear-gradient(135deg,#4f8f2e,#e6d49a 55%,#18a6ae)', magma: 'linear-gradient(135deg,#2a2624,#5e3f2d 55%,#ff5a14)', valley: 'linear-gradient(135deg,#4f7a2a,#76913a 50%,#1d4b63)', frost: 'linear-gradient(135deg,#f4f7fa,#a7b0b8 60%,#6f9fb8)', dunes: 'linear-gradient(135deg,#e8d29c,#b48a58 60%,#2a7d86)', midnight: 'linear-gradient(135deg,#0a1124,#1d2b4a 60%,#ffd27a)' };
const THEME_SWATCH = { canyon: MAP_SWATCH.canyon, highland: MAP_SWATCH.highland, blossom: MAP_SWATCH.blossom, autumn: MAP_SWATCH.autumn, temperate: MAP_SWATCH.valley, snow: MAP_SWATCH.frost, desert: MAP_SWATCH.dunes, night: MAP_SWATCH.midnight };
const mapItems = () => Object.entries(MAPS).map(([id, m]) => ({ id, title: (m.custom ? '🗺 ' : '') + m.name, desc: m.desc, swatch: MAP_SWATCH[id] || THEME_SWATCH[m.theme] }));
const facItems = [{ id: 'wally', title: 'Wally Squad', desc: 'Titan tanks, medics, Wally the hero, Sky Lance' }, { id: 'grim', title: 'Grimlock Legion', desc: 'Stealth tanks, Inferno tanks, Doom Missile' }];

function setupMenus() {
  for (const b of document.querySelectorAll('[data-panel]')) b.onclick = () => { Audio.initAudio(); Audio.play('click'); showPanel(b.dataset.panel); };
  // skirmish
  const sk = { mode: 'skirmish', map: 'valley', faction: 'wally', difficulty: localStorage.getItem('ws_diff') || 'normal', daynight: true, weather: null };
  optionCards($('mapList'), mapItems(), sk.map, id => { sk.map = id; });
  optionCards($('facRow'), facItems, sk.faction, id => { sk.faction = id; });
  $('facRow').className = 'cardList';
  const row = $('diffRow');
  for (const k in DIFFICULTY) {
    const b = document.createElement('button');
    b.className = 'btn' + (k === sk.difficulty ? ' on' : ''); b.textContent = DIFFICULTY[k].label;
    b.onclick = () => { sk.difficulty = k; localStorage.setItem('ws_diff', k); [...row.children].forEach(x => x.classList.toggle('on', x === b)); Audio.initAudio(); Audio.play('click'); };
    row.appendChild(b);
  }
  const opt = $('optRow');
  const toggle = (label, get, set) => { const b = document.createElement('button'); b.className = 'btn' + (get() ? ' on' : ''); b.textContent = label; b.onclick = () => { set(!get()); b.classList.toggle('on', get()); }; opt.appendChild(b); };
  toggle('Day–night cycle', () => sk.daynight, v => { sk.daynight = v; });
  toggle('Dynamic weather', () => !sk.weather, v => { sk.weather = v ? null : 'clear'; });
  toggle('Superweapons', () => sk.supers !== false, v => { sk.supers = v; });
  toggle('Support powers', () => sk.powers !== false, v => { sk.powers = v; });
  toggle('Supply crates', () => sk.crates !== false, v => { sk.crates = v; });
  toggle('Tech buildings', () => sk.tech !== false, v => { sk.tech = v; });
  toggle('Fog of war', () => sk.fog !== false, v => { sk.fog = v; });
  toggle('Starting armies', () => sk.army !== false, v => { sk.army = v; });
  toggle('🗿 Victory Monuments', () => sk.wonders !== false, v => { sk.wonders = v; });
  toggle('👑 King of the Hill', () => !!sk.koth, v => { sk.koth = v; });
  toggle('🎯 Hero Hunt', () => !!sk.hunt, v => { sk.hunt = v; });
  toggle('💰 Bounty convoys', () => sk.convoys !== false, v => { sk.convoys = v; });
  toggle('🐉 Dragon attacks', () => sk.dragons !== false, v => { sk.dragons = v; });
  // starting money cycles through a few amounts
  const money = [2500, 4000, 7500, 15000];
  const mb = document.createElement('button'); mb.className = 'btn on';
  const showMoney = () => { mb.textContent = `💰 Start: $${(sk.credits || 4000).toLocaleString()}`; };
  mb.onclick = () => { sk.credits = money[(money.indexOf(sk.credits || 4000) + 1) % money.length]; showMoney(); Audio.play('click'); };
  showMoney(); opt.appendChild(mb);
  const mrow = $('mutRow');
  sk.mut = [];
  for (const [k, m] of Object.entries(MUTATORS)) {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = `${m.icon} ${m.name}`; b.title = m.desc;
    b.onclick = () => { const i = sk.mut.indexOf(k); if (i >= 0) sk.mut.splice(i, 1); else sk.mut.push(k); b.classList.toggle('on', i < 0); Audio.play('click'); };
    mrow.appendChild(b);
  }
  // army colour swatches (shared by skirmish, survival and sandbox; remembered)
  let savedCol = 'default'; try { savedCol = localStorage.getItem('ws_color') || 'default'; } catch { /* ignore */ }
  for (const row of document.querySelectorAll('.colRow')) {
    const mk = (key, css, name) => { const b = document.createElement('button'); b.className = 'swatch' + (savedCol === key ? ' on' : ''); b.style.background = css; b.title = name; b.dataset.k = key;
      b.onclick = () => { savedCol = key; try { if (key === 'default') localStorage.removeItem('ws_color'); else localStorage.setItem('ws_color', key); } catch { /* ignore */ } for (const s of document.querySelectorAll('.colRow .swatch')) s.classList.toggle('on', s.dataset.k === key); Audio.play('click'); };
      row.appendChild(b); };
    mk('default', 'linear-gradient(135deg,#3d8bff 50%,#ff4a3d 50%)', 'Faction colour (blue Wally Squad, red Grimlocks)');
    for (const [k, c] of Object.entries(TEAM_COLORS)) mk(k, c.css, c.name);
  }
  $('bStart').onclick = () => startWith(sk);
  $('profile').innerHTML = profileCard();
  // version number, and the What's New screen the first time a new version loads
  for (const el of document.querySelectorAll('.verNum')) el.textContent = VERSION;
  $('verLink').onclick = e => { e.preventDefault(); Audio.play('click'); showPanel('menuNews'); };
  $('bNewsOk').onclick = () => { markSeen(); Audio.initAudio(); Audio.play('click'); showPanel('menuMain'); };
  // always fetch the newest game files, and offer an update if the server has a newer version than this one
  registerUpdater();
  if (run.mode === 'title') checkForUpdate().then(v => {
    if (!v) return;
    const bar = document.createElement('button'); bar.id = 'updateBar'; bar.className = 'btn big';
    bar.innerHTML = `🆕 Version ${v} is available - tap to update`;
    bar.onclick = () => { bar.textContent = 'Updating…'; updateNow(); };
    $('menuMain').insertBefore(bar, $('menuMain').firstChild);
  });
  initTipJar();
  // daily challenge
  const dc = dailyChallenge(), rec = dailyRecord();
  $('bDaily').innerHTML = `📅 DAILY CHALLENGE<small>${MAPS[dc.map].name} · ${FACTIONS[dc.faction].short || FACTIONS[dc.faction].name} · ${dc.mut.map(k => MUTATORS[k].icon + ' ' + MUTATORS[k].name).join(' · ')}${rec && rec.date === dc.daily ? ` · ✔ Best ${fmtTime(rec.best)}` : ''}</small>`;
  $('bDaily').onclick = () => startWith(dc);
  // survival
  const sv = { mode: 'survival', map: 'valley', faction: 'wally', difficulty: 'normal', daynight: true, weather: null };
  const best = bestScores();
  optionCards($('mapListSv'), mapItems().map(m => ({ ...m, desc: best[m.id] ? `Best: ${best[m.id].score.toLocaleString()} pts · wave ${best[m.id].wave}` : 'No record yet' })), sv.map, id => { sv.map = id; });
  optionCards($('facRowSv'), facItems, sv.faction, id => { sv.faction = id; });
  $('facRowSv').className = 'cardList';
  const rowSv = $('diffRowSv');
  for (const k in DIFFICULTY) {
    const b = document.createElement('button'); b.className = 'btn' + (k === sv.difficulty ? ' on' : ''); b.textContent = DIFFICULTY[k].label;
    b.onclick = () => { sv.difficulty = k; [...rowSv.children].forEach(x => x.classList.toggle('on', x === b)); };
    rowSv.appendChild(b);
  }
  $('bStartSv').onclick = () => startWith(sv);
  // sandbox
  const sb = { mode: 'sandbox', map: 'valley', faction: 'wally', difficulty: 'normal', daynight: true, weather: null };
  optionCards($('mapListSb'), mapItems(), sb.map, id => { sb.map = id; });
  $('bStartSb').onclick = () => startWith(sb);
  // watch an AI battle
  const wt = { mode: 'watch', map: 'valley', faction: 'wally', difficulty: 'normal', daynight: true, weather: null };
  optionCards($('mapListW'), mapItems(), wt.map, id => { wt.map = id; });
  for (const k in DIFFICULTY) { const b = document.createElement('button'); b.className = 'btn' + (k === wt.difficulty ? ' on' : ''); b.textContent = DIFFICULTY[k].label; b.onclick = () => { wt.difficulty = k; [...$('diffRowW').children].forEach(x => x.classList.toggle('on', x === b)); }; $('diffRowW').appendChild(b); }
  $('bStartW').onclick = () => startWith(wt);
  // campaign
  const prog = campaignProgress();
  const progG = campaignProgress('grim');
  optionCards($('missionListGrim'), GRIM_MISSIONS.map((m, i) => ({ id: i, title: `${i + 1}. ${m.title}`, desc: i <= progG ? `${MAPS[m.map].name} · ${DIFFICULTY[m.difficulty].label}` : 'Locked - complete the previous mission', locked: i > progG, swatch: MAP_SWATCH[m.map] })), -1, i => startWith({ mode: 'campaign', camp: 'grim', mission: i }));
  optionCards($('missionList'), MISSIONS.map((m, i) => ({ id: i, title: `${i + 1}. ${m.title}`, desc: i <= prog ? `${MAPS[m.map].name} · ${DIFFICULTY[m.difficulty].label}` : 'Locked - complete the previous mission', locked: i > prog, swatch: MAP_SWATCH[m.map] })), -1, i => startWith({ mode: 'campaign', mission: i }));
  // online
  const mp = { map: 'valley', faction: 'wally' };
  optionCards($('mapListMp'), mapItems(), mp.map, id => { mp.map = id; });
  optionCards($('facRowMp'), facItems, mp.faction, id => { mp.faction = id; });
  $('facRowMp').className = 'cardList small';
  $('bHost').onclick = () => startWith({ mode: 'mp', map: mp.map, faction: mp.faction, difficulty: 'normal', daynight: true, weather: null, mp: { role: 'host', room: randomRoomCode(), seed: (Math.random() * 1e9) | 0, hostFaction: mp.faction }, customUnits: loadDesigns(), customMap: MAPS[mp.map].custom ? MAPS[mp.map] : undefined });
  let joinNet = null;
  $('bJoin').onclick = () => {
    const code = $('roomInput').value.trim().toUpperCase();
    if (code.length < 4) { $('joinStatus').textContent = 'Enter the 5-letter room code.'; return; }
    joinNet?.close();
    $('joinStatus').textContent = 'Connecting…';
    joinNet = joinRoom(code, t => { $('joinStatus').textContent = t; });
  };
  // voices
  $('vOn').checked = Voices.settings.voices; $('vTts').checked = Voices.settings.tts;
  $('vOn').onchange = () => { Voices.settings.voices = $('vOn').checked; Voices.saveSettings(); };
  $('vTts').onchange = () => { Voices.settings.tts = $('vTts').checked; Voices.saveSettings(); };
  $('vLyrics').checked = Voices.settings.lyrics !== false;
  $('vLyrics').onchange = () => { Voices.settings.lyrics = $('vLyrics').checked; Voices.saveSettings(); };
  $('bExport').onclick = () => Voices.exportPack(prompt('Name your voice pack:', 'my-squad-voices') || 'my-squad-voices');
  $('importFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const n = await Voices.importPack(f); alert(`Imported ${n} voice clips.`); Voices.buildStudio($('studio'), UI.icons); } catch (err) { alert('Import failed: ' + err.message); }
  };
  // in-game buttons
  $('bHow').onclick = () => { $('help').style.display = 'flex'; };
  $('bHelp').onclick = () => { $('help').style.display = 'flex'; };
  $('bHelpClose').onclick = () => { $('help').style.display = 'none'; };
  $('bPause').onclick = () => togglePause();
  $('bResume').onclick = () => togglePause(false);
  $('bGfx').onclick = () => { buildGraphicsPanel($('gfxPanel2')); $('gfxScreen').style.display = 'flex'; };
  $('bGfxClose').onclick = () => { $('gfxScreen').style.display = 'none'; };
  const again = () => { const last = sessionStorage.getItem('ws_last'); if (last && JSON.parse(last).mode !== 'mp') startWith(JSON.parse(last)); else location.href = location.pathname; };
  $('bRestart').onclick = again;
  $('bAgain').onclick = again;
  $('bNext').onclick = () => startWith({ mode: 'campaign', camp: run.camp, mission: mission && mission.tutorial ? 0 : Math.min(campaignList(run.camp).length - 1, run.mission + 1) });
  $('bTutorial').onclick = () => startWith({ mode: 'tutorial' });
  $('bWatch').onclick = () => { $('end').style.display = 'none'; G.paused = false; };
  // ---- photo mode: hide the interface, slow time, free camera, save pictures ----
  let photoPrevSpeed = 1;
  G.togglePhoto = () => {
    if (!G.started) return;
    G.photo = !G.photo;
    document.body.classList.toggle('photo', G.photo);
    if (G.photo) {
      togglePause(false); photoPrevSpeed = G.speed;
      if (!lockstep) G.speed = 0.25;
      G.camera.tilt = 0;
      $('photoSpeed').textContent = lockstep ? 'Time: live (online)' : 'Time: 25%';
    } else { if (!lockstep) G.speed = photoPrevSpeed; G.camera.tilt = 0; G.camera.targetDist = Math.max(18, G.camera.targetDist); }
    UI.resize();
  };
  $('bPhoto').onclick = () => G.togglePhoto();
  $('bPhotoExit').onclick = () => G.togglePhoto();
  const speeds2 = [0.25, 0.1, 0, 0.5, 1];
  $('photoSpeed').onclick = () => { if (lockstep) return; G.speed = speeds2[(speeds2.indexOf(G.speed) + 1) % speeds2.length]; $('photoSpeed').textContent = G.speed === 0 ? 'Time: frozen' : `Time: ${G.speed * 100}%`; G.paused = false; };
  $('bPhotoSave').onclick = () => {
    composer.render();
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = `wally-squad-${Date.now()}.png`; a.click();
    const fl = $('photoFlash'); fl.style.opacity = 1; setTimeout(() => { fl.style.opacity = 0; }, 120);
    Audio.play('click');
  };
  $('bSurrender').onclick = () => { if (lockstep) lockstep.surrender(); else G.surrendered = G.player; togglePause(false); };
  const goFull = async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement) await (el.requestFullscreen?.({ navigationUI: 'hide' }) || el.webkitRequestFullscreen?.());
      await screen.orientation?.lock?.('landscape');
    } catch { /* not supported (e.g. iPhone Safari): the rotate screen still asks for landscape */ }
    setTimeout(() => UI.resize(), 300);
  };
  $('bFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else goFull(); };
  $('bFullRotate').onclick = goFull;
  // phones: go fullscreen + landscape on the first tap (starting a game reloads the page, which leaves fullscreen)
  if (matchMedia('(pointer: coarse)').matches && localStorage.getItem('ws_nofull') !== '1') {
    const once = () => { window.removeEventListener('pointerup', once, true); if (!document.fullscreenElement) goFull(); };
    window.addEventListener('pointerup', once, true);
  }
  Audio.setLyricHandler((line, track, kind) => { if (G.started && !G.over && Audio.isMusicOn?.()) Voices.singLine(line, track, kind); });
  Audio.onTrackChange(name => { $('bMusic').title = `Now playing: ${name} - click to turn the music off`; if (G.started && !G.over) UI.message(`♪ Now playing: ${name}`); });
  // cheat codes (single player only; a cheating game earns no XP or medals)
  const CHEATS = {
    WALLYCASH: () => { G.players[G.player].credits += 10000; return '+$10,000'; },
    SHOWMETHEMAP: () => { G.revealed = true; revealAll(true); return 'Map revealed'; },
    INSTABUILD: () => { G.players[G.player].buildMult = 10; return 'Super-fast building'; },
    BIGBOOM: () => { const P = G.players[G.player]; if (!P.super) return 'Build a superweapon first'; P.super.charge = 1e9; return 'Superweapon charged'; },
    POWERUP: () => { const P = G.players[G.player]; for (const k in (P.powers || {})) P.powers[k].charge = 1e9; return 'Support powers ready'; },
    GODMODE: () => { G.god = !G.god; return G.god ? 'Your forces are invincible' : 'God mode off'; },
    HEROES: () => { const b = G.buildings.find(x => !x.dead && x.faction === G.player); if (!b) return 'No base'; new Unit(G.player === 'wally' ? 'wallyman' : 'warlord', G.player, b.x + 8, b.z + 8, 0); new Unit('titan', G.player, b.x + 11, b.z + 8, 0); return 'Heroes have arrived'; },
  };
  const tryCheat = () => {
    const code = $('cheatIn').value.trim().toUpperCase().replace(/\s+/g, ''); $('cheatIn').value = '';
    if (!code) return;
    if (lockstep || run.mode === 'mp') { UI.message('Cheats are off in online battles'); return; }
    const fn = CHEATS[code];
    if (!fn) { Audio.play('error'); UI.message('Unknown cheat code'); return; }
    G.cheated = true; Audio.play('promote'); UI.message(`🕹 Cheat: ${fn()}`, true);
  };
  $('bCheat').onclick = tryCheat;
  $('cheatIn').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') tryCheat(); };
  $('bNextTune').onclick = () => { Audio.initAudio(); const n = Audio.nextTrack(); if (!G.started) UI.message?.(`♪ ${n}`); };
  $('bMusic').onclick = () => { Audio.initAudio(); const on = Audio.toggleMusic(); $('bMusic').classList.toggle('on', !on); $('bMusic').textContent = on ? '♪ Music' : '♪ Off'; };
  $('bIdle').onclick = () => UI.selectNextIdle();
  const speeds = [1, 1.5, 2, 0.5];
  $('bSpeed').onclick = () => { if (lockstep) return; G.speed = speeds[(speeds.indexOf(G.speed) + 1) % speeds.length]; $('bSpeed').textContent = `Game speed: ${G.speed}x`; };
  $('bSuper').onclick = () => { G.ui.setMode?.('super'); };
  G.togglePause = togglePause;

  if (run.mode === 'title') { $('title').style.display = 'flex'; showPanel(isNewVersion() ? 'menuNews' : 'menuMain'); revealAll(true); G.cfg.daynight = false; }
  else if (run.mode === 'campaign' || run.mode === 'tutorial') showBriefing();
  else if (run.mode === 'mp') {
    $('bSpeed').style.display = 'none';
    lockstep = new Lockstep(run, start);
    G.net = lockstep;
    lockstep.connect();
  } else start();
}

function showBriefing() {
  $('briefNum').textContent = mission.tutorial ? 'TRAINING · ' + MAPS[mission.map].name.toUpperCase() : `${run.camp === 'grim' ? 'GRIMLOCK CAMPAIGN · ' : ''}MISSION ${run.mission + 1} OF ${campaignList(run.camp).length} · ${MAPS[mission.map].name.toUpperCase()}`;
  $('briefTitle').textContent = mission.title.toUpperCase();
  $('briefText').innerHTML = mission.story.map(p => `<p>${p}</p>`).join('');
  $('briefObj').innerHTML = mission.objectives.map(o => `<li>${o.text}</li>`).join('');
  $('briefing').style.display = 'flex';
  $('bBegin').onclick = () => { $('briefing').style.display = 'none'; start(); };
}

function renderObjectives() {
  if (run.mode === 'survival') { const el = $('objectives'); el.style.display = 'block'; el.innerHTML = survivalPanel(); return; }
  if (!mission) return;
  const el = $('objectives'); el.style.display = 'block';
  let seenOpen = false;
  el.innerHTML = `<div class="label" style="margin:0 0 3px">${mission.tutorial ? 'Boot Camp' : 'Objectives'}</div>` + mission.objectives.map(o => {
    const st = mctx.status[o.id];
    if (mission.tutorial && st === 'open') { if (seenOpen) return ''; seenOpen = true; const h = mission.hint(mctx); return `<div class="ob">▶ <b>${o.text}</b>${o.progress ? ` <b style="color:var(--accent)">${o.progress()}</b>` : ''}</div>${h ? `<div class="obHint">${h}</div>` : ''}`; }
    let extra = '';
    if (o.timer && st === 'open') { const left = Math.max(0, o.timer - G.time); extra = ` <b style="color:var(--accent)">${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</b>`; }
    if (o.progress && st === 'open') extra = ` <b style="color:var(--accent)">${o.progress()}</b>`;
    return `<div class="ob ${st}">${st === 'done' ? '✔' : st === 'failed' ? '✖' : '○'} ${o.text}${extra}</div>`;
  }).join('');
}

function start() {
  document.body.classList.add('ingame');
  Audio.initAudio();
  $('title').style.display = 'none';
  if (run.fog === false) G.revealed = true;
  revealAll(!!G.revealed);
  G.started = true; G.paused = false;
  if (run.mode === 'skirmish') ais = [new AI(G.enemy)];
  if (run.mode === 'sandbox') setupSandbox();
  if (run.mode === 'watch') {
    // both sides are computer players; you just watch
    ais = [new AI(G.enemy)]; G.extraAI = [new AI(G.player)];
    G.spectating = true; G.revealed = true; revealAll(true);
    document.body.classList.add('spectate'); UI.checkSize?.();
    const ob = $('objectives'); ob.style.display = 'block';
    ob.innerHTML = `<div class="label" style="margin:0 0 3px">📺 Watching</div><div class="ob"><b style="color:${FACTIONS.wally.css}">Wally Squad AI</b> vs <b style="color:${FACTIONS.grim.css}">Grimlock AI</b></div><div class="obHint">Scroll and zoom to follow the action. Speed it up from the pause menu.</div>`;
  }
  setupFeed();
  setupTaunts();
  if (run.mode === 'survival') { renderObjectives(); UI.message('Survival: build defences fast - the first wave arrives in 75 seconds!'); }
  if (mission) renderObjectives();
  const fname = FACTIONS[G.player].name;
  Audio.announce(mission ? `Mission start: ${mission.title}` : run.mode === 'mp' ? 'Battle control online' : `Welcome, commander of the ${fname}.`);
  if (!mission) setTimeout(() => UI.message('Build a Power Plant, then a Crystal Refinery to start earning credits.'), 2500);
  if (run.daily) setTimeout(() => UI.message(`Daily Challenge ${run.daily}: win as fast as you can!`, true), 1200);
  if (run.mut && run.mut.length) setTimeout(() => UI.message(`Mutators: ${run.mut.map(k => MUTATORS[k].icon + ' ' + MUTATORS[k].name).join(', ')}`), 4000);
  // kill streaks: kills by your forces close together get a shout-out
  const streak = { n: 0, t: -99 };
  const SHOUT = { 2: 'Double kill!', 3: 'Triple kill!', 5: 'Rampage!', 8: 'Unstoppable!', 12: 'Wally Squad is on fire!', 20: 'Legendary!' };
  initBonus(run, t => UI.message(t));
  G.emitBonus3 = () => emit('bonus3');
  // voices: Wally Man's quips, and last words from your fallen units
  on('kill', (victim, killer) => {
    if (victim.kind === 'unit' && victim.faction === G.player && victim.type !== 'wallyman') Voices.lastWords(victim);
    if (victim.type === 'icecream') { UI.message(killer && killer.faction === G.player ? '🍦 You blew up the ice cream van?! You monster!' : '🍦 Someone blew up the ice cream van! Monsters!'); if (killer && killer.faction === G.player) emit('monster'); }
    if (killer && killer.kind === 'unit' && killer.type === 'wallyman' && killer.faction === G.player && victim.faction !== G.player && Math.random() < 0.35) Voices.say('wallyman', victim.type === 'haggis' ? 'haggis' : 'kill');
  });
  const hurtSaid = new Set();
  setInterval(() => {
    if (!G.started || G.over) return;
    for (const u of G.units) if (u.type === 'wallyman' && u.faction === G.player && !u.dead) {
      if (u.hp < u.maxHp * 0.35 && !hurtSaid.has(u.id)) { hurtSaid.add(u.id); Voices.say('wallyman', 'hurt', true); }
      else if (u.hp > u.maxHp * 0.7) hurtSaid.delete(u.id);
    }
  }, 1000);
  on('kill', (victim, killer) => {
    if (!killer || killer.faction !== G.player || victim.faction === G.player || victim.faction === 'neutral') return;
    streak.n = G.time - streak.t < 4 ? streak.n + 1 : 1; streak.t = G.time;
    G.bestStreak = Math.max(G.bestStreak || 0, streak.n);
    const s = SHOUT[streak.n];
    if (s) { Audio.announce(s, G.player, 1); UI.streakBanner?.(s); }
  });
}

function togglePause(force) {
  if (!G.started || G.over) return;
  const want = force !== undefined ? force : $('pause').style.display !== 'flex';
  $('pause').style.display = want ? 'flex' : 'none';
  if (!lockstep) G.paused = want; // online games keep running while the menu is open
}

function endGame(win, text, winner) {
  if (G.over) return;
  G.over = true;
  if (run.mode === 'watch') G.watchWinner = winner;
  emit('end', win);
  Audio.announce(win ? 'Mission accomplished' : 'Mission failed');
  Audio.sting(win);
  if (win && run.mode !== 'watch') setTimeout(() => Audio.play('cheer'), 600);
  if (G.player === 'wally' && run.mode !== 'watch') setTimeout(() => Voices.say('wallyman', win ? 'win' : 'lose', true), 1500);
  // victory: fireworks over your base and cheering troops
  if (win) {
    G.won = run.mode !== 'watch';
    const home = G.buildings.find(b => !b.dead && b.faction === G.player && b.type === 'conyard') || G.buildings.find(b => !b.dead && b.faction === G.player);
    const at = G.lastFallen && !G.surrendered ? G.lastFallen : home && { x: home.x, y: home.baseY || 0, z: home.z }; // where the finale camera is looking
    if (at) for (let i = 0; i < 16; i++) setTimeout(() => G.fx?.firework?.(at.x + (Math.random() - 0.5) * 34, at.y || 0, at.z + (Math.random() - 0.5) * 34), 1600 + i * 360);
  }
  // finale: slow motion on the last building to fall
  if (G.lastFallen && !G.surrendered) {
    UI.centerOn(G.lastFallen.x, G.lastFallen.z); G.camera.targetDist = 34;
    if (!lockstep) G.speed = 0.3;
    if (G.lastFallen.y !== undefined) G.fx?.finale?.(G.lastFallen.x, G.lastFallen.y, G.lastFallen.z);
  }
  if (mission && win && !mission.tutorial) unlockNext(run.mission, run.camp);
  const award = run.mode === 'title' || run.mode === 'watch' || G.cheated ? null : awardGame({ win, kills: G.stats.killed, lost: G.stats.lost, built: G.stats.built, time: G.time, difficulty: G.difficulty, mode: mission && mission.tutorial ? 'tutorial' : run.mode, streak: G.bestStreak });
  if (award && award.promoted) setTimeout(() => { Audio.announce(`Promoted to ${award.promoted.name}`); }, 3200);
  let dailyNote = '';
  if (run.daily && win) { const r = dailyRecord(); const best = r && r.date === run.daily ? r.best : Infinity; dailyNote = G.time < best ? `New best: ${fmtTime(G.time)}!` : `${fmtTime(G.time)} (best ${fmtTime(best)})`; if (G.time < best) { try { localStorage.setItem('ws_daily', JSON.stringify({ date: run.daily, best: G.time })); } catch { /* ignore */ } } }
  setTimeout(() => {
    $('endTitle').textContent = run.mode === 'watch' ? `${G.watchWinner === 'grim' ? 'GRIMLOCKS' : 'WALLY SQUAD'} WIN` : win ? 'VICTORY' : 'DEFEAT';
    $('endTitle').style.color = win ? 'var(--accent)' : 'var(--red)';
    $('endSub').textContent = text || (win ? (mission ? `${mission.title}: mission complete.` : `The ${FACTIONS[G.enemy].name} has been crushed!`) : 'Our forces have fallen. Regroup, commander.');
    const t = Math.floor(G.time);
    $('endStats').innerHTML = `<span>Mission time</span><span>${Math.floor(t / 60)}m ${t % 60}s</span>${run.mode === 'mp' ? '' : `<span>Difficulty</span><span>${DIFFICULTY[G.difficulty].label}</span>`}<span>Enemies destroyed</span><span>${G.stats.killed}</span><span>Units lost</span><span>${G.stats.lost}</span><span>Structures built</span><span>${G.stats.built}</span><span>Credits harvested</span><span>${Math.round(G.stats.harvested)}</span>${G.mvp ? `<span>MVP</span><span>🏅 ${G.mvp.name} · ${G.mvp.kills} kills</span>` : ''}${G.bestStreak > 1 ? `<span>Best kill streak</span><span>${G.bestStreak}</span>` : ''}${run.daily && win ? `<span>Daily Challenge</span><span>${dailyNote}</span>` : ''}${award ? `<span>Experience</span><span>+${award.xp} XP · ${award.rank.icon} ${award.rank.name}${award.promoted ? ' · <b style="color:var(--accent)">PROMOTED!</b>' : ''}</span>` : ''}`;
    recordHistory(99); drawHistory($('endGraph'));
    $('bNext').style.display = mission && win && (mission.tutorial || run.mission < campaignList(run.camp).length - 1) ? '' : 'none';
    $('bAgain').style.display = run.mode === 'mp' ? 'none' : '';
    $('end').style.display = 'flex';
  }, G.lastFallen && !G.surrendered ? 4200 : 2500); // give the finale time to play
}

// A side is beaten when it has no buildings left (walls, gates and mines don't count)
const hasStructures = f => G.buildings.some(b => !b.dead && b.faction === f && !b.def.isMine && !b.def.isWall && !b.def.isGate && !b.def.explosive && !b.def.civil);

function checkEnd(dt) {
  winT -= dt; if (winT > 0 || G.over) return; winT = 1;
  if (run.mode === 'sandbox') { const P = G.players[G.player]; P.credits = 999999; P.buildMult = 5; return; } // sandbox never ends
  if (run.mode === 'watch') {
    const w = hasStructures('wally'), g = hasStructures('grim');
    if (!w || !g) endGame(true, `The ${FACTIONS[w ? 'wally' : 'grim'].name} AI wins the battle!`, w ? 'wally' : 'grim');
    return;
  }
  if (run.hunt && ['skirmish', 'mp', 'watch'].includes(run.mode)) {
    const dead = ['wally', 'grim'].find(f => !G.units.some(u => u.vip && u.faction === f && !u.dead));
    if (dead) { const win = dead === 'wally' ? 'grim' : 'wally'; endGame(run.mode === 'watch' ? true : win === G.player, `${dead === 'wally' ? 'Wally Man' : 'Warlord Grak'} has fallen! The ${FACTIONS[win].name} wins the Hero Hunt!`, win); return; }
  }
  const kh = hillWinner();
  if (kh) { endGame(run.mode === 'watch' ? true : kh === G.player, `${FACTIONS[kh].name} held the hill for 3 minutes!`, kh); return; }
  if (G.surrendered) { endGame(G.surrendered !== G.player, G.surrendered === G.player ? 'You surrendered.' : 'The enemy has surrendered!'); return; }
  // a Victory Monument that has stood for 5 minutes wins the game
  const won = G.buildings.find(b => !b.dead && b.def.wonder && (b.wonderT || 0) >= 300);
  if (won) { endGame(run.mode === 'watch' ? true : won.faction === G.player, `${FACTIONS[won.faction].name}'s Victory Monument stood for 5 minutes!`, won.faction); return; }
  const pAlive = hasStructures(G.player);
  if (mission) { if (!pAlive) mctx.fail('All our buildings have been destroyed. Mission failed.'); return; }
  if (run.mode === 'survival') {
    if (!pAlive) {
      const { prev, isNew } = saveBest(run.map);
      endGame(false, `All your buildings were destroyed after ${Math.max(0, survival.wave - 1)} waves. Score ${survival.score.toLocaleString()}${isNew ? ' - NEW BEST!' : ` (best ${prev.score.toLocaleString()})`}`);
    }
    return;
  }
  const eAlive = hasStructures(G.enemy);
  if (!pAlive) endGame(false, 'All your buildings have been destroyed.');
  else if (!eAlive) endGame(true, `Every ${FACTIONS[G.enemy].name} building has been destroyed!`);
}

function simStep(dt) {
  G.time += dt;
  runTimers();
  updateWeatherSim(dt);
  updatePower();
  updateProduction(dt);
  updateSuper(dt);
  updatePowers(dt);
  checkAchievements(dt);
  for (const a of ais) a.update(dt);
  if (G.extraAI) for (const a of G.extraAI) a.update(dt);
  rebuildHash();
  for (const b of G.buildings) b.update(dt);
  for (const u of G.units) u.update(dt);
  updateProjectiles(dt);
  updateDecay(dt);
  cleanupDead();
  regrowOre(dt);
  updateCrates(dt);
  updateConvoy(dt);
  updateHaggis(dt);
  updateDragon(dt);
  updateIceCream(dt);
  updateHazards(dt);
  updateHill(dt);
  recordHistory(dt);
  if (run.mode === 'survival' && !G.over) { updateSurvival(dt); missionT -= dt; if (missionT <= 0) { missionT = 0.5; renderObjectives(); } }
  if (mission && !G.over) { missionT -= dt; if (missionT <= 0) { missionT = 0.5; if (mctx.heroCheck()) mission.tick(mctx); renderObjectives(); } }
  checkEnd(dt);
}

let last = performance.now(), musicLabelT = 0, shadowFrame = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  G.combatHeat = (G.combatHeat || 0) * Math.exp(-real / 5);
  Audio.setIntensity(G.over || !G.started ? 0.15 : Math.min(1, (G.combatHeat || 0) / 10));
  if ((musicLabelT -= real) < 0) { musicLabelT = 1; const b = $('bMusic'); if (b && !b.classList.contains('on')) { const l = Audio.musicLevel(); b.textContent = l > 0.62 ? '♪ War' : l < 0.28 ? '♪ Calm' : '♪ Battle'; } }
  // adaptive quality: drop resolution if the frame rate is poor
  fpsAcc += (now - (loop.lastNow || now)) / 1000; loop.lastNow = now; fpsN++;
  if (fpsAcc > 1.5) { autoTune(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  let dt = 0;
  if (lockstep && lockstep.active) {
    const t0 = G.time;
    lockstep.update(real, simStep);
    dt = G.time - t0;
  } else {
    dt = G.started && !G.paused ? real * G.speed : 0;
    if (dt > 0) simStep(dt);
  }
  G.dt = dt;
  if (!G.started) {
    // title screen: slow cinematic orbit over the valley
    G.camera.yaw += real * 0.05;
    const b = BASES[G.player];
    G.camera.x = b.x * 0.5 + Math.sin(now / 9000) * 20; G.camera.z = b.z * 0.5;
    G.camera.targetDist = 85;
    updateWeatherSim(0);
  }
  updateOre();
  updateVision(Math.max(dt, real * 0.5));
  updateFX(dt);
  updateWeatherFX(dt, real);
  updateFallingTrees(real);
  updateAmbient(real);
  updateOrientation();
  UI.checkSize();
  UI.updateCamera(real);
  UI.updateHover(real);
  UI.updateMarkers(real);
  if (G.started) { UI.updateSidebar(real); UI.updateMinimap(real); }
  animateWater(now / 1000);
  animateCrates(now / 1000);
  if (++shadowFrame >= shadowInterval()) { shadowFrame = 0; renderer.shadowMap.needsUpdate = true; }
  if (G.three.grade) { G.three.grade.uniforms.uCine.value = gfx.cinematic ? 1 : 0; G.three.grade.uniforms.uTime.value = now / 1000; }
  composer.render();
  UI.drawOverlay();
}

// Online games must keep ticking when the tab is in the background (rAF stops there).
let lastBg = performance.now();
setInterval(() => {
  const now = performance.now();
  if (document.hidden && lockstep && lockstep.active) lockstep.update(Math.min(0.5, (now - lastBg) / 1000), simStep);
  lastBg = now;
}, 100);

// debug / testing hook: fast-forward the simulation without rendering
window.WS = {
  G,
  fastForward(seconds, dt = 0.05) { for (let t = 0; t < seconds; t += dt) { simStep(dt); updateFX(dt); if (Math.floor(t / 0.2) !== Math.floor((t + dt) / 0.2)) updateVision(0.2); } updateOre(); },
  get ai() { return ais[0]; },
  AI, issue,
};


boot().catch(err => {
  console.error(err);
  $('loading').innerHTML = `<div style="color:#ff6a5a;max-width:600px;text-align:center">Failed to start: ${err.message}<br><small>Your browser needs WebGL 2 (3D graphics) support.<br><br>Things to try: update your phone and its browser, open the link in Chrome or Safari rather than inside an app (Facebook, Messenger, Instagram...), turn off battery saver, or <a href="#" onclick="location.reload();return false" style="color:#7fd4ff">tap here to reload</a>.</small></div>`;
});
void menuMode;
