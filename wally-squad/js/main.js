// Wally Squad — entry point: renderer, lighting, post-processing, game setup and main loop.
import * as THREE from 'three';
import { EffectComposer } from '../lib/postprocessing/EffectComposer.js';
import { RenderPass } from '../lib/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../lib/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../lib/postprocessing/ShaderPass.js';
import { OutputPass } from '../lib/postprocessing/OutputPass.js';
import { G, rr, runTimers } from './state.js';
import { DIFFICULTY, UNITS, WORLD } from './config.js';
import { buildTerrain, BASES, cellOf, updateVision, updateOre, regrowOre, animateWater, revealAll, revealCircle } from './terrain.js';
import { initFX, updateFX, setParticleScale } from './particles.js';
import { Building, Unit, rebuildHash, updateProjectiles, updateDecay, cleanupDead } from './entities.js';
import { initPlayer, updatePower, updateProduction } from './production.js';
import { AI } from './ai.js';
import * as UI from './ui.js';
import * as Audio from './audio.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const loadBar = $('loadBar');
const step = async (p) => { loadBar.style.width = (p * 100) + '%'; await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };

let renderer, scene, camera, composer, bloom, sun;
let ai = null;
let winT = 0;
let fpsAcc = 0, fpsN = 0, quality = 1;

async function boot() {
  await step(0.05);
  // ---------- renderer ----------
  renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  const horizon = new THREE.Color(0xa9c4d8);
  scene.background = horizon;
  scene.fog = new THREE.Fog(horizon, 160, 420);
  camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);

  // ---------- sky + environment reflections ----------
  const skyGeo = new THREE.SphereGeometry(600, 32, 16);
  const skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
  const top = new THREE.Color(0x3d78b8), mid = horizon, bot = new THREE.Color(0x5a5446), c = new THREE.Color();
  for (let i = 0; i < skyGeo.attributes.position.count; i++) {
    const y = skyGeo.attributes.position.getY(i) / 600;
    if (y > 0) c.copy(mid).lerp(top, Math.pow(y, 0.6)); else c.copy(mid).lerp(bot, Math.min(1, -y * 4));
    skyCol.set([c.r, c.g, c.b], i * 3);
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);
  G.three = { renderer, scene, camera, sun: null, sky };
  const envScene = new THREE.Scene();
  envScene.add(sky.clone());
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(12, 10, 8) }));
  sunBall.position.set(300, 380, 180); envScene.add(sunBall);
  const pmrem = new THREE.PMREMGenerator(renderer);
  G.three.envMap = pmrem.fromScene(envScene, 0.02, 1, 1000).texture;
  scene.environment = G.three.envMap;

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x4a3f2c, 0.75));
  sun = new THREE.DirectionalLight(0xfff0d6, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  const sc = sun.shadow.camera; sc.near = 10; sc.far = 260; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70;
  scene.add(sun); scene.add(sun.target);
  G.three.sun = sun;

  // ---------- post processing ----------
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = 1.0 - dot(d, d) * uVig * 2.2;
      c.rgb = mix(vec3(dot(c.rgb, vec3(0.299,0.587,0.114))), c.rgb, 1.08); gl_FragColor = vec4(c.rgb * v, c.a); }`,
  }));
  composer.addPass(new OutputPass());
  G.onResize = (w, h) => {
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    setParticleScale(h * renderer.getPixelRatio());
  };
  await step(0.15);

  // ---------- world ----------
  buildTerrain(scene);
  await step(0.55);
  initFX(scene);
  G.sfx = Audio.sfx;
  G.announce = Audio.announce;
  if (params.has('reveal')) { G.revealed = true; revealAll(true); }

  // ---------- players ----------
  G.difficulty = localStorage.getItem('ws_diff') || 'normal';
  if (!DIFFICULTY[G.difficulty]) G.difficulty = 'normal';
  initPlayer(G.player, false);
  initPlayer(G.enemy, true);
  setupBase(G.player, BASES.wally, -1);
  setupBase(G.enemy, BASES.grim, 1);
  revealCircle(BASES.wally.x + 8, BASES.wally.z - 8, 42);
  updatePower();
  await step(0.7);

  UI.initUI();
  UI.renderIcons(renderer);
  UI.buildGrid();
  await step(0.95);
  UI.centerOn(BASES.wally.x + 6, BASES.wally.z - 4);
  G.camera.dist = G.camera.targetDist = 62;
  G.camera.yaw = 0;
  UI.resize();

  $('loading').style.display = 'none';
  setupMenus();
  requestAnimationFrame(loop);
}

function setupBase(faction, pos, dir) {
  const cx = cellOf(pos.x) - 2, cz = cellOf(pos.z) - 2;
  new Building('conyard', faction, cx, cz, true);
  // starting force: rolls out toward the middle of the map
  const fx = -dir, fz = dir; // direction toward map centre
  const start = [['tank', 6, 0], ['tank', 8, -3], ['buggy', 4, 6], ['rifle', 10, 3], ['rifle', 11, 4], ['rifle', 12, 2], ['rocket', 11, 6], ['rocket', 12, 5]];
  for (const [t, a, b] of start) {
    const x = pos.x + fx * a + b * 0.7 * -fz, z = pos.z + fz * a + b * 0.7 * fx;
    const u = new Unit(t, faction, x + fx * 6, z + fz * 6, Math.atan2(fx, fz));
    u.turretYaw = u.heading;
  }
}

function setupMenus() {
  const title = $('title');
  const row = $('diffRow');
  for (const k in DIFFICULTY) {
    const b = document.createElement('button');
    b.className = 'btn' + (k === G.difficulty ? ' on' : ''); b.textContent = DIFFICULTY[k].label;
    b.onclick = () => { G.difficulty = k; localStorage.setItem('ws_diff', k); [...row.children].forEach(x => x.classList.toggle('on', x === b)); Audio.initAudio(); Audio.play('click'); };
    row.appendChild(b);
  }
  $('bStart').onclick = start;
  $('bHow').onclick = () => { $('help').style.display = 'flex'; };
  $('bHelp').onclick = () => { $('help').style.display = 'flex'; };
  $('bHelpClose').onclick = () => { $('help').style.display = 'none'; };
  $('bPause').onclick = () => togglePause();
  $('bResume').onclick = () => togglePause(false);
  $('bRestart').onclick = () => { sessionStorage.setItem('ws_auto', '1'); location.reload(); };
  $('bAgain').onclick = () => { sessionStorage.setItem('ws_auto', '1'); location.reload(); };
  $('bWatch').onclick = () => { $('end').style.display = 'none'; G.paused = false; };
  $('bMusic').onclick = () => { Audio.initAudio(); const on = Audio.toggleMusic(); $('bMusic').classList.toggle('on', !on); $('bMusic').textContent = on ? '♪ Music' : '♪ Off'; };
  const speeds = [1, 1.5, 2, 0.5];
  $('bSpeed').onclick = () => { G.speed = speeds[(speeds.indexOf(G.speed) + 1) % speeds.length]; $('bSpeed').textContent = `Game speed: ${G.speed}x`; };
  G.togglePause = togglePause;
  if (sessionStorage.getItem('ws_auto') || params.has('auto')) { sessionStorage.removeItem('ws_auto'); start(); }
  else { title.style.display = 'flex'; revealAll(true); } // show the whole valley behind the title menu
}

function start() {
  Audio.initAudio();
  $('title').style.display = 'none';
  revealAll(!!G.revealed);
  G.started = true; G.paused = false;
  UI.centerOn(BASES.wally.x + 6, BASES.wally.z - 4);
  G.camera.targetDist = 62; G.camera.yaw = 0;
  ai = new AI(G.enemy);
  Audio.announce('Welcome, commander. Establish your base.');
  setTimeout(() => UI.message('Build a Power Plant, then a Crystal Refinery to start earning credits.'), 2500);
}

function togglePause(force) {
  if (!G.started || G.over) return;
  G.paused = force !== undefined ? force : !G.paused;
  $('pause').style.display = G.paused ? 'flex' : 'none';
}

function checkEnd(dt) {
  winT -= dt; if (winT > 0 || G.over) return; winT = 1;
  const has = f => G.buildings.some(b => !b.dead && b.faction === f) || G.units.some(u => !u.dead && u.faction === f && u.type !== 'harvester');
  const pAlive = has(G.player), eAlive = has(G.enemy);
  if (!pAlive || !eAlive) {
    G.over = true;
    const win = pAlive;
    Audio.announce(win ? 'Mission accomplished' : 'Mission failed');
    setTimeout(() => {
      $('endTitle').textContent = win ? 'VICTORY' : 'DEFEAT';
      $('endTitle').style.color = win ? 'var(--accent)' : 'var(--red)';
      $('endSub').textContent = win ? 'The Grimlock Legion has been crushed. Crystal Valley is ours!' : 'Our base has fallen. Regroup, commander.';
      const t = Math.floor(G.time);
      $('endStats').innerHTML = `<span>Mission time</span><span>${Math.floor(t / 60)}m ${t % 60}s</span><span>Difficulty</span><span>${DIFFICULTY[G.difficulty].label}</span><span>Enemies destroyed</span><span>${G.stats.killed}</span><span>Units lost</span><span>${G.stats.lost}</span><span>Structures built</span><span>${G.stats.built}</span><span>Credits harvested</span><span>${Math.round(G.stats.harvested)}</span>`;
      $('end').style.display = 'flex';
    }, 2500);
  }
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  // adaptive quality: drop resolution if the frame rate is poor
  fpsAcc += real; fpsN++;
  if (fpsAcc > 3) {
    const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    if (fps < 32 && quality > 0.6) { quality -= 0.2; applyQuality(); }
    else if (fps > 55 && quality < 1) { quality = Math.min(1, quality + 0.2); applyQuality(); }
  }
  const dt = G.started && !G.paused ? real * G.speed : 0;
  G.dt = dt;
  if (!G.started) {
    // title screen: slow cinematic orbit over the valley
    G.camera.yaw += real * 0.05;
    G.camera.x = BASES.wally.x * 0.5 + Math.sin(now / 9000) * 20; G.camera.z = BASES.wally.z * 0.5;
    G.camera.targetDist = 85;
  }
  if (dt > 0) simStep(dt);
  updateOre();
  updateVision(Math.max(dt, real * 0.5));
  updateFX(dt);
  UI.updateCamera(real);
  UI.updateHover(real);
  UI.updateMarkers(real);
  if (G.started) { UI.updateSidebar(real); UI.updateMinimap(real); }
  animateWater(now / 1000);
  composer.render();
  UI.drawOverlay();
}

function simStep(dt) {
  G.time += dt;
  runTimers();
  updatePower();
  updateProduction(dt);
  ai?.update(dt);
  if (G.extraAI) for (const a of G.extraAI) a.update(dt);
  rebuildHash();
  for (const b of G.buildings) b.update(dt);
  for (const u of G.units) u.update(dt);
  updateProjectiles(dt);
  updateDecay(dt);
  cleanupDead();
  regrowOre(dt);
  checkEnd(dt);
}
// debug / testing hook: fast-forward the simulation without rendering
window.WS = {
  G,
  fastForward(seconds, dt = 0.05) { for (let t = 0; t < seconds; t += dt) { simStep(dt); updateFX(dt); if (Math.floor(t / 0.2) !== Math.floor((t + dt) / 0.2)) updateVision(0.2); } updateOre(); },
  get ai() { return ai; },
};

function applyQuality() {
  const pr = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
  renderer.setPixelRatio(pr);
  UI.resize();
}

boot().catch(err => {
  console.error(err);
  $('loading').innerHTML = `<div style="color:#ff6a5a;max-width:600px;text-align:center">Failed to start: ${err.message}<br><small>Your browser needs WebGL 2 support.</small></div>`;
});
void UNITS; void WORLD; void rr;
