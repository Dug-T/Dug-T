// ASHBOUND: game bootstrap, the loop, the player, interactions, objectives, endings, HUD and saving.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildIsland, heightAt, normalAt, POIS, VOLCANO, SEA, W, distToVolcano } from './island.js';
import { buildProps, pickupMesh, setRaftStage, buildFirePit } from './props.js';
import { buildSurvivor, animateSurvivor, buildAxe, LOOKS, groundTilt } from './survivor.js';
import { Volcano, Puffs } from './volcano.js';
import { Jeep, Boat } from './vehicle.js';
import { Dog } from './dog.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { NpcManager, resolveObstacles } from './npcs.js';
import { ITEMS, RECIPES, ESCAPES, STAGES, DIFFICULTY, FOOD, stageAt, newStats, tickStats, Inventory } from './survival.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Voice } from './voice.js';
import { rng, puffTexture, glowTexture } from './textures.js';
import { VERSION, CHANGES } from './version.js';

const $ = (id) => document.getElementById(id);
const domCache = new Map();
const setText = (id, v) => { const k = id + ':t'; if (domCache.get(k) !== v) { domCache.set(k, v); $(id).textContent = v; } };
const setHTML = (id, v) => { const k = id + ':h'; if (domCache.get(k) !== v) { domCache.set(k, v); $(id).innerHTML = v; } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};
let quality = store.get('ash-gfx', 'high');
let soundOn = store.get('ash-snd', true);
let difficulty = store.get('ash-diff', 'standard');
let showFps = store.get('ash-fps', true);
let voicesOn = store.get('ash-voice', true);
const SAVE_KEY = 'ashbound-save';

// ---------------- renderer, scene, camera ----------------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#cfe4f5', 160, 1150);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2400);
const hemi = new THREE.HemisphereLight('#bfe0ff', '#4a5a3a', 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d6', 2.8); sun.castShadow = true;
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55; sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55; sun.shadow.camera.near = 1; sun.shadow.camera.far = 500;
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
const audio = new Audio();
const voice = new Voice(voicesOn);
const input = new Input(canvas);
input.onAny = () => audio.init();
input.bindTouch($);

let composer = null, bloom = null, gradePass = null;
function applyQuality() {
  const hi = quality === 'high';
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, hi ? 2 : 1.25));
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  if (hi && !composer) {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: 4, type: THREE.HalfFloatType });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.55, 0.88);
    composer.addPass(bloom);
    // a film grade: a soft vignette, a warm tint, grain, and the colour draining out as the ash thickens
    gradePass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAsh: { value: 0 }, uHurt: { value: 0 }, uHeat: { value: 0 }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uShaft: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uAberr: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uAsh, uHurt, uHeat, uShaft, uAberr; uniform vec2 uSun; uniform vec3 uTint; varying vec2 vUv;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec2 uv = vUv;
          // heat shimmer near the lava
          if (uHeat > 0.002) { float w = sin(uv.y * 70.0 + uTime * 7.0) * cos(uv.x * 50.0 - uTime * 5.0) + 0.5 * sin(uv.y * 160.0 - uTime * 11.0); uv += vec2(w, w * 0.6) * 0.0045 * uHeat * (1.2 - uv.y); }
          vec4 c = texture2D(tDiffuse, uv);
          // the colours split at the edges when you are hurt, cooking or being shaken
          if (uAberr > 0.002) { vec2 off = (uv - 0.5) * uAberr * 0.014; c.r = texture2D(tDiffuse, uv + off).r; c.b = texture2D(tDiffuse, uv - off).b; }
          // shafts of light: bright sky sampled along the line to the sun
          if (uShaft > 0.002) { vec2 dd = (uSun - uv) / 28.0; vec2 pp = uv; vec3 acc = vec3(0.0); float wgt = 1.0; for (int i = 0; i < 28; i++) { pp += dd; vec3 sm = texture2D(tDiffuse, pp).rgb; acc += max(sm - 1.1, 0.0) * wgt; wgt *= 0.95; } c.rgb += acc * 0.045 * uShaft; }
          vec2 d = vUv - 0.5; float vig = 1.0 - smoothstep(0.35, 1.05, dot(d, d) * 2.2);
          c.rgb *= mix(0.55, 1.0, vig);
          c.rgb = mix(c.rgb, c.rgb * vec3(1.05, 1.0, 0.93), 0.5) * uTint;
          float g = dot(c.rgb, vec3(0.3, 0.59, 0.11));
          c.rgb = mix(c.rgb, vec3(g), uAsh * 0.4 + uHurt * 0.5);
          c.rgb += (h21(vUv * 1000.0 + fract(uTime) * 100.0) - 0.5) * (0.03 + uAsh * 0.03);
          gl_FragColor = c;
        }`,
    });
    composer.addPass(gradePass);
    composer.addPass(new OutputPass());
  }
  for (const id of ['gfx', 'gfx2']) $(id).textContent = 'GRAPHICS: ' + quality.toUpperCase();
  resize();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
addEventListener('resize', resize);

// ---------------- the world ----------------
const world = buildIsland(scene, quality);
const props = buildProps(scene, world, quality);
const U = world.uniforms;
const game = {
  running: false, paused: false, started: false, over: false, t: 0, duration: DIFFICULTY[difficulty].minutes * 60, progress: 0, stage: STAGES[0],
  flags: { talkedAmara: false, raft: { wood: 0, rope: 0, tarp: 0 }, bunker: { water: 0, food: 0, mask: 0 }, radioFixed: false, heliT: -1, heliState: 'away', sealed: false, launched: false, pastReef: false },
  ending: null, intro: 0, saved: 0, deaths: 0, bombsNear: 0, startedAt: 0, lastSave: 0, fpsAcc: 0, fpsN: 0,
};
const volcano = new Volcano(scene, world, quality, {
  onStage: (st) => { if (game.started && st.id !== 'calm') { banner(st.name.toUpperCase(), st.desc); audio.stageSting(); } },
  onTremor: (v) => audio.tremor(v),
  onWhistle: () => audio.whistle(),
  onLaunch: () => {},
  onExplode: (x, y, z, r, sea, cold) => {
    const d = Math.hypot(x - player.x, z - player.z);
    if (cold) audio.noise(0.5, 300, Math.max(0.05, 0.8 - d / 200), 'lowpass'); else audio.explosion(d);
    if (sea) return;
    npcs.scare(x, z, r);
    if (!player.inBunker) npcs.blast(x, z, cold ? r : r * 1.1);
    if (dog && !dog.hidden && Math.hypot(x - dog.x, z - dog.z) < (cold ? r : r * 1.1)) killDog('rock');
    { const db = Math.hypot(x - boat.x, z - boat.z); if (db < r * 1.6) boat.damage((cold ? 90 : 70) * (1 - db / (r * 1.6)), { onDestroyed: () => { toast('The skiff is wrecked!', 3); } }); }
    { const dj = Math.hypot(x - jeep.x, z - jeep.z); if (dj < r * 1.6) jeep.damage((cold ? 90 : 70) * (1 - dj / (r * 1.6)), { onDestroyed: () => { toast('The jeep is wrecked!', 3); } }); }
    if (d < r * 1.5 && !player.inBunker) { const dmg = (cold ? 110 : 75) * (1 - d / (r * 1.5)); hurt(dmg, cold ? 'crushed by a falling rock' : 'blown apart by a lava bomb'); cam.kick = Math.min(1, cam.kick + 0.6); }
    else if (d < 60) cam.kick = Math.min(1, cam.kick + 0.25);
  },
  onLightning: (d) => audio.thunder(d),
  onBurst: () => { if (distToVolcano(player.x, player.z) < 500) audio.noise(2.5, 160, 0.5 * (1 - distToVolcano(player.x, player.z) / 500), 'lowpass', 1, 0, 60); },
});
// small particle systems of our own: dust kicked up by feet, spray off the swimmer
const fx = { sparks: new Puffs(scene, 140, glowTexture(), '#ffd080', '#ff6a10', THREE.AdditiveBlending), dust: new Puffs(scene, 160, puffTexture(), '#e6d8b4', '#6a6058'), spray: new Puffs(scene, 160, puffTexture(), '#ffffff', '#cfe8f0'), fireflies: new Puffs(scene, 120, glowTexture(), '#e8ff8a', '#8aff6a', THREE.AdditiveBlending), leaves: new Puffs(scene, 160, puffTexture(), '#7aa83a', '#c9a24a'), stepT: 0 };
// the sun itself: a glare sprite far out along the light, hidden by the mountain when it stands in front
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff4dc', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true }));
sunSprite.scale.set(260, 260, 1); scene.add(sunSprite);
// seagulls wheeling over the coast until the mountain frightens them off
const gulls = [];
{
  const gm = new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.35, 4, 8), gm); body.rotation.x = Math.PI / 2; g.add(body);
    const wings = [];
    for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), gm); w.geometry.translate(sd * 0.45, 0, 0); w.rotation.x = -Math.PI / 2; g.add(w); wings.push(w); }
    const cx = [POIS.village.x + 30, POIS.boatyard.x - 10, POIS.camp.x + 20][i % 3], cz = [POIS.village.z + 30, POIS.boatyard.z + 20, POIS.camp.z + 40][i % 3];
    gulls.push({ g, wings, cx, cz, r: 18 + Math.random() * 30, h: 14 + Math.random() * 16, a: Math.random() * 6.3, sp: 0.25 + Math.random() * 0.2, dir: Math.random() < 0.5 ? 1 : -1, flap: Math.random() * 6, gone: 0 });
    scene.add(g);
  }
}
function updateGulls(dt, stageIdx) {
  for (const b of gulls) {
    if (stageIdx >= 1) b.gone = Math.min(1, b.gone + dt * 0.08);
    b.a += dt * b.sp * b.dir; b.flap += dt * (6 + b.gone * 4);
    const x = b.cx + Math.cos(b.a) * (b.r + b.gone * 900), z = b.cz + Math.sin(b.a) * (b.r + b.gone * 900), y = Math.max(heightAt(x, z), 0) + b.h + Math.sin(b.a * 3) * 2 + b.gone * 60;
    b.g.visible = b.gone < 0.99;
    b.g.position.set(x, y, z); b.g.rotation.y = -b.a - (b.dir > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.PI; b.g.rotation.z = b.dir * 0.25;
    const f = Math.sin(b.flap) * 0.55; b.wings[0].rotation.y = f; b.wings[1].rotation.y = -f;
  }
}
// the survey team's jeep, parked beside the camp
const jeep = new Jeep(scene, POIS.camp.x + 13, POIS.camp.z - 7, 0.9);
// Kai's skiff, hauled up in the shallows beside the village jetty
const boat = new Boat(scene, POIS.village.x + 24.6, POIS.village.z + 31, 0); // moored alongside the jetty, bow out to sea
const sunNdc = new THREE.Vector3();
// ---------------- day and night ----------------
// The island clock runs from 08:00 on day 3 to 19:00 on day 4 across the whole game, so one night falls
// during the ashfall and the final surge comes at sunset. The eruption timeline itself is unchanged.
const dayNight = { hour: 8, day: 3, night: 0, dayK: 1, dusk: 0 };
const lightDir = new THREE.Vector3(0, 1, 0);
const isDark = () => dayNight.night > 0.45 || volcano.ash > 0.45;
// campfires you build: a small pool of lights shared between them, so adding a fire never stalls the renderer
const fireLights = []; for (let i = 0; i < 3; i++) { const l = new THREE.PointLight('#ff8a30', 0, 20, 1.8); l.userData.used = false; scene.add(l); fireLights.push(l); }
function claimFireLight(f) { if (f.light) return; const l = fireLights.find((q) => !q.userData.used); if (l) { l.userData.used = true; l.position.set(f.x, heightAt(f.x, f.z) + 1.4, f.z); f.light = l; } }
function addFire(x, z, t) {
  const pit = buildFirePit(); pit.group.position.set(x, heightAt(x, z), z); scene.add(pit.group);
  const f = { group: pit.group, flame: pit.flame, light: null, x, z, t, built: true }; props.fires.push(f); if (t > 0) claimFireLight(f); return f;
}
function buildFireHere() {
  if (player.swimming || player.inJeep || player.inBoat || player.onRaft || player.inBunker) { toast('You can\'t build a fire here'); return false; }
  const x = player.x + Math.sin(player.yaw) * 1.6, z = player.z + Math.cos(player.yaw) * 1.6;
  if (heightAt(x, z) < 0.4) { toast('You need dry ground for a fire'); return false; }
  if (1 - normalAt(x, z).y > 0.35) { toast('Too steep for a fire here'); return false; }
  addFire(x, z, 180); return true;
}
function litFireNear(x, z, r) { for (const f of props.fires) if (f.t > 0 && Math.hypot(f.x - x, f.z - z) < r) return f; return null; }
// the torch: a cloth-wrapped stick in the free hand, with a light that follows it
const torchModel = (() => {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.55, 8), new THREE.MeshStandardMaterial({ color: '#6a4a2a', roughness: 0.9 })); stick.rotation.x = Math.PI / 2; stick.position.z = 0.18; g.add(stick);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.12, 8), new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 1, emissive: '#ff4a10', emissiveIntensity: 0.6 })); wrap.rotation.x = Math.PI / 2; wrap.position.z = 0.45; g.add(wrap);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffa040', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); flame.scale.set(0.45, 0.6, 1); flame.position.z = 0.6; g.add(flame);
  g.userData.flame = flame; g.visible = false; return g;
})();
const torchLight = new THREE.PointLight('#ffa040', 0, 18, 1.6); scene.add(torchLight);
const _tp = new THREE.Vector3();
function enterBoat() {
  player.inBoat = true; boat.driver = player; boat.seat(player.rig, 0);
  const near = npcs.followers().filter((n) => !n.riding && Math.hypot(n.x - boat.x, n.z - boat.z) < 16).slice(0, 3);
  near.forEach((n, i) => { n.riding = true; boat.riders.push(n); boat.seat(n.rig, i + 1); });
  if (near.length) toast(`${near.map((n) => n.def.name.split(' ').pop()).join(', ')} climb${near.length > 1 ? '' : 's'} aboard`);
  cam.distSel = 1; cam.dist = DISTS[1]; audio.ui(); voice.say('She floats. Hold on.', 'You', false);
}
function exitBoat() {
  const spot = boat.exitSpot();
  boat.unseat(player.rig, scene); player.inBoat = false; boat.driver = null;
  player.x = spot.x; player.z = spot.z; player.y = Math.max(heightAt(spot.x, spot.z), SEA - 0.5); player.vy = 0; player.speed = 0; player.rig.root.rotation.set(0, player.yaw, 0);
  boat.riders.forEach((n, i) => { boat.unseat(n.rig, scene); n.riding = false; n.x = spot.x + Math.cos(i * 2.1) * 1.4; n.z = spot.z + Math.sin(i * 2.1) * 1.4; n.y = heightAt(n.x, n.z); });
  boat.riders = [];
  cam.distSel = 0; cam.dist = DISTS[0]; audio.ui();
}
function boatTick(dt) {
  const mv = input.move();
  boat.update({ dt, move: mv, brake: input.down('jump'), world, fx: fx.spray,
    onHit: (v) => { audio.crash(Math.min(1, v / 10)); cam.kick = Math.min(1, cam.kick + 0.25); if (boat.aground) toast('Aground! Back off the shallows.', 1.5); } });
  animateSurvivor(player.rig, dt, { mode: 'drive', steer: boat.steer });
  const s = player.stats;
  tickStats(s, dt, { sprinting: false, swimming: false, ash: volcano.ash, sheltered: false, mask: player.inv.count('mask') > 0, hard: difficulty === 'hardcore', moving: false, hot: false });
  if (s.health <= 0) die(s.air <= 0 ? 'choked by the ash' : s.thirst <= 0 ? 'lost to thirst' : 'lost to hunger');
  if (boat.dead) { exitBoat(); toast('The skiff goes down under you', 3); }
  const sea = heightAt(boat.x, boat.z);
  if (sea < -24 && Math.hypot(boat.x - POIS.village.x, boat.z - POIS.village.z) > 120 && !game.flags.pastReef) { game.flags.pastReef = true; for (const n of boat.riders) { n.saved = true; n.state = 'saved'; game.saved++; } win('boat'); }
}
function enterJeep() {
  if (jeep.dead) { toast('The jeep is a burnt-out wreck'); return; }
  player.inJeep = true; jeep.driver = player; jeep.seat(player.rig, 0);
  const near = npcs.followers().filter((n) => !n.riding && Math.hypot(n.x - jeep.x, n.z - jeep.z) < 16).slice(0, 3);
  near.forEach((n, i) => { n.riding = true; jeep.riders.push(n); jeep.seat(n.rig, i + 1); });
  if (near.length) toast(`${near.map((n) => n.def.name.split(' ').pop()).join(', ')} climb${near.length > 1 ? '' : 's'} in the back`);
  cam.distSel = 1; cam.dist = DISTS[1]; audio.ui();
}
function exitJeep() {
  const spot = jeep.exitSpot();
  jeep.unseat(player.rig, scene); player.inJeep = false; jeep.driver = null;
  player.x = spot.x; player.z = spot.z; player.y = heightAt(spot.x, spot.z); player.vy = 0; player.speed = 0; player.rig.root.rotation.set(0, player.yaw, 0);
  jeep.riders.forEach((n, i) => { jeep.unseat(n.rig, scene); n.riding = false; n.x = spot.x + Math.cos(i * 2.1) * 1.6; n.z = spot.z + Math.sin(i * 2.1) * 1.6; n.y = heightAt(n.x, n.z); });
  jeep.riders = [];
  cam.distSel = 0; cam.dist = DISTS[0]; audio.ui();
}
function driveTick(dt) {
  const mv = input.move();
  jeep.update({ dt, move: mv, brake: input.down('jump') || input.down('sprint'), world, heatAt: (x, z) => volcano.heatAt(x, z), dark: dayNight.night > 0.35 || volcano.ash > 0.3, fx: fx.dust,
    onHit: (v) => { audio.crash(Math.min(1, v / 15)); cam.kick = Math.min(1, cam.kick + 0.3); if (v > 11) hurt((v - 11) * 3, 'killed in a crash'); },
    onFlood: () => { audio.flood(); toast('The engine floods. Deep water and jeeps don\'t mix.', 3); voice.say('The engine\'s flooded. Out, out!', 'You', true); },
    onDestroyed: () => { toast('The jeep is wrecked!', 3); audio.explosion(0); } });
  animateSurvivor(player.rig, dt, { mode: 'drive', steer: jeep.steer });
  const s = player.stats, nearLava = volcano.heatAt(player.x, player.z);
  tickStats(s, dt, { sprinting: false, swimming: false, ash: volcano.ash, sheltered: false, mask: player.inv.count('mask') > 0, hard: difficulty === 'hardcore', moving: false, hot: nearLava > 0 || distToVolcano(player.x, player.z) < 140 });
  if (s.health <= 0) die(s.air <= 0 ? 'choked by the ash' : s.thirst <= 0 ? 'lost to thirst' : 'lost to hunger');
  if (nearLava > 0.3) hurt(nearLava * 25 * dt, 'taken by the lava');
  if (jeep.dead || jeep.flooded) { exitJeep(); if (jeep.dead) hurt(25, 'burned with the jeep'); }
}
let dog = null;
const npcs = new NpcManager(scene, world, {
  onHeal: (n) => { toast(n.def.name + ' can walk again'); audio.success(); },
  onWant: (n) => { toast(`${n.def.name} will come with you now`, 3); audio.success(); },
  onStep: (n) => { const d = Math.hypot(n.x - player.x, n.z - player.z); if (d < 14) audio.step(surfaceAt(n.x, n.z), 0.35 * (1 - d / 14)); },
  onDeath: (n, how) => { toast(n.def.name + (how === 'rock' ? ' was hit by a falling rock' : ' didn\'t make it'), 4); audio.fail(); voice.say(n.def.name + (how === 'rock' ? ' was hit by a falling rock.' : ' didn\'t make it.'), 'Narrator', false); },
});

// what is underfoot, for footsteps
function surfaceAt(x, z) { const h = heightAt(x, z); if (h < 0.15) return 'water'; if (volcano.ash > 0.35) return 'ash'; if (h > 92 || 1 - normalAt(x, z).y > 0.32) return 'rock'; if (h < 4.5) return 'sand'; return 'grass'; }
// sleeping until dawn: a full night's rest, but the mountain keeps going while you sleep
let restTap = 0, restHeld = 0;
function trySleep(sheltered) {
  if (game.sleeping || game.over) return;
  const hrs = 8 + game.progress * 35;
  if (dayNight.night < 0.5) { toast('You can only sleep at night'); return; }
  const target = 30; // 06:00 on day 4
  if (target - hrs < 1) { toast('Dawn is nearly here. No point sleeping now.'); return; }
  if (volcano.ash > 0.3 && !sheltered && !player.inv.count('mask')) { toast('Too much ash in the air to sleep out here without a mask', 3); return; }
  game.sleeping = true; $('fade').style.opacity = '1'; voice.stop();
  setTimeout(() => {
    const slept = target - hrs, secs = slept / 35 * game.duration, st = player.stats;
    game.t = (target - 8) / 35 * game.duration;
    st.stamina = 100; st.health = Math.min(100, st.health + 8 * slept); st.hunger = Math.max(8, st.hunger - 3.5 * slept); st.thirst = Math.max(8, st.thirst - 5 * slept); if (sheltered) st.air = 100;
    for (const f of props.fires) if (f.built) f.t = 0;
    if (game.flags.heliState === 'coming') game.flags.heliT = Math.max(0.5, game.flags.heliT - secs);
    setTimeout(() => { $('fade').style.opacity = '0'; game.sleeping = false; banner('DAWN', `You slept ${Math.round(slept)} hours. The mountain did not.`, 5); }, 900);
  }, 900);
}

// ---------------- the player ----------------
const player = {
  rig: buildSurvivor(LOOKS.player), x: POIS.camp.x - 2, y: POIS.camp.y, z: POIS.camp.z + 3, vy: 0, yaw: Math.PI, speed: 0, vx: 0, vz: 0,
  stats: newStats(), inv: new Inventory(), onGround: true, swimming: false, dead: false, chop: 0, chopTree: null, chopHits: 0, inBunker: false, onRaft: false, inHeli: false, mode: 'move', hurtFlash: 0, lastDmg: '',
};
scene.add(player.rig.root);
player.rig.arms[0].grip.add(torchModel);
const axeModel = buildAxe(); axeModel.visible = false; player.rig.arms[1].grip.add(axeModel);
const cam = { yaw: Math.PI + 0.4, pitch: 0.28, dist: 4.6, distSel: 0, kick: 0, shake: 0 };
const DISTS = [4.6, 7.5, 2.8];

dog = new Dog(scene);
function killDog(how) { if (dog.dead || dog.saved) return; dog.dead = true; toast(how === 'rock' ? 'Biscuit was hit by a falling rock' : 'Biscuit didn\'t make it', 3); audio.fail(); }

// ---------------- pickups ----------------
const pickups = [];
function spawnPickup(id, x, z, y = null) {
  const m = pickupMesh(id);
  const gy = y == null ? heightAt(x, z) : y;
  m.position.set(x, gy, z); m.rotation.y = Math.random() * 6; m.visible = false;
  scene.add(m);
  pickups.push({ id, m, x, y: gy, z, taken: false, idx: pickups.length });
}
function scatterPickups() {
  const r = rng(2024);
  const nearPoi = (x, z, pad = 0, except) => Object.entries(POIS).some(([k, p]) => k !== except && Math.hypot(x - p.x, z - p.z) < p.r + pad);
  // coconuts under palms
  const trees = world.trees.slice().sort(() => r() - 0.5);
  for (let i = 0; i < 150 && i < trees.length; i++) { const t = trees[i]; const a = r() * 6.3, d = 1 + r() * 1.6; spawnPickup('coconut', t.x + Math.cos(a) * d, t.z + Math.sin(a) * d); }
  const scatter = (id, n, test) => { let tries = 0; let made = 0; while (made < n && tries++ < 30000) { const x = (r() - 0.5) * W * 0.88, z = (r() - 0.5) * W * 0.88, h = heightAt(x, z); if (!test(x, z, h)) continue; spawnPickup(id, x, z); made++; } };
  scatter('wood', 95, (x, z, h) => h > 0.9 && h < 3.8 && !nearPoi(x, z, 0, 'boatyard'));
  scatter('stone', 75, (x, z, h) => h > 3 && (h > 35 || (1 - normalAt(x, z).y) > 0.28) && !nearPoi(x, z) && distToVolcano(x, z) > 60);
  scatter('vine', 80, (x, z, h) => h > 7 && h < 65 && !nearPoi(x, z) && distToVolcano(x, z) > 110 && r() < 0.7);
  scatter('banana', 45, (x, z, h) => h > 5 && h < 45 && !nearPoi(x, z) && distToVolcano(x, z) > 120);
  scatter('mango', 45, (x, z, h) => h > 5 && h < 50 && !nearPoi(x, z) && distToVolcano(x, z) > 120);
  // the special finds
  const w = POIS.wreck;
  for (let i = 0; i < 5; i++) spawnPickup('cloth', w.x - 6 + i * 2.5 + (r() - 0.5) * 3, w.z + 4 + (r() - 0.5) * 6);
  spawnPickup('tarp', w.x - 3, w.z - 5); spawnPickup('battery', w.x + 7.5, w.z - 3.5); spawnPickup('bandage', w.x - 9, w.z + 1); spawnPickup('bandage', w.x + 2, w.z + 5);
  spawnPickup('handset', POIS.village.x + 12 + 1.2, POIS.village.z + 2 + 3.2);
  const t = POIS.tower; spawnPickup('antenna', t.x - 5.5, t.z + 2.5);
  spawnPickup('bandage', POIS.camp.x + 3, POIS.camp.z - 2); spawnPickup('bandage', t.x + 3, t.z + 6);
  spawnPickup('cloth', POIS.village.x - 9, POIS.village.z - 5); spawnPickup('cloth', POIS.camp.x - 3.2, POIS.camp.z - 0.8);
  // things the survivors won't leave without
  spawnPickup('logger', 224.8, 38.1); spawnPickup('pendant', POIS.boatyard.x - 10, POIS.boatyard.z + 8); spawnPickup('logbook', -174.2, 150.3);
  for (let i = 0; i < 8; i++) spawnPickup('wood', POIS.boatyard.x + (r() - 0.5) * 30, POIS.boatyard.z + (r() - 0.5) * 22);
  for (let i = 0; i < 4; i++) spawnPickup('coconut', POIS.camp.x + (r() - 0.5) * 14, POIS.camp.z + (r() - 0.5) * 14);
}
scatterPickups();
let cullT = 0;
function cullPickups() {
  for (const p of pickups) { if (p.taken) continue; const d = Math.hypot(p.x - player.x, p.z - player.z); p.m.visible = d < 110; }
}

// ---------------- HUD helpers ----------------
let toastT = 0, bannerT = 0, subsT = 0;
function toast(msg, secs = 2.5) { $('toast').textContent = msg; $('toast').classList.add('on'); toastT = secs; }
function banner(h, p, secs = 4) { $('banner').querySelector('h1').textContent = h; $('banner').querySelector('p').textContent = p || ''; $('banner').classList.add('on'); bannerT = secs; if (p) voice.say(h.toLowerCase() === 'ashbound' ? p : h + '. ' + p, 'Narrator', true); }
function say(name, text, secs = 7) { $('subs').innerHTML = `<b>${name}:</b> ${text}`; $('subs').classList.add('on'); subsT = secs; if (voice.on && voice.ok) voice.say(text, name, true); else audio.talk(); }
function show(id, on = true) { $(id).classList.toggle('hidden', !on); }

// ---------------- objectives and escapes ----------------
function needsText(needs, have) {
  return Object.entries(needs).map(([k, n]) => { const h = have(k); const name = k === 'food' ? 'food' : ITEMS[k].name.toLowerCase(); return `<span class="${h >= n ? 'ok' : 'no'}">${name} ${Math.min(h, n)}/${n}</span>`; }).join(', ');
}
function raftDone() { const f = game.flags.raft, n = ESCAPES.raft.needs; return f.wood >= n.wood && f.rope >= n.rope && f.tarp >= n.tarp; }
function bunkerDone() { const f = game.flags.bunker, n = ESCAPES.bunker.needs; return f.water >= n.water && f.food >= n.food && f.mask >= n.mask; }
function radioReady() { return player.inv.has(ESCAPES.radio.needs); }
function objectiveText() {
  if (!game.flags.talkedAmara) return 'Talk to Dr Osei by the campfire (walk up and press USE).';
  const R = game.flags.raft, B = game.flags.bunker, n = ESCAPES;
  const raft = game.flags.launched ? '⛵ Paddle past the reef!' : raftDone() ? '⛵ Raft ready. Launch it at Raft Beach.' : `⛵ Raft: ${R.wood}/${n.raft.needs.wood} logs · ${R.rope}/${n.raft.needs.rope} rope · ${R.tarp}/${n.raft.needs.tarp} tarp (carrying ${player.inv.count('wood')}🪵 ${player.inv.count('rope')}🪢 ${player.inv.count('tarp')}⛵)`;
  const radio = game.flags.heliState === 'landed' ? '🚁 Helicopter on the pad. Board it!' : game.flags.radioFixed ? `🚁 Helicopter inbound: ${Math.ceil(game.flags.heliT)}s` : `📡 Radio: ${['battery', 'antenna', 'handset'].map((k) => (player.inv.count(k) ? ITEMS[k].icon : '▫')).join(' ')} → repair at the Ranger Station`;
  const bunker = game.flags.sealed ? '🚪 Sealed in. Wait it out.' : bunkerDone() ? '🚪 Bunker stocked. Seal the door.' : `🚪 Bunker: ${B.water}/${n.bunker.needs.water} water · ${B.food}/${n.bunker.needs.food} food · ${B.mask}/${n.bunker.needs.mask} mask`;
  const skiff = boat.dead ? '🚤 Skiff wrecked' : boat.repaired ? '🚤 Skiff ready at the village jetty. Make for open water.' : `🚤 Skiff: ${['battery', 'wood', 'rope'].map((k) => `${Math.min(player.inv.count(k), ESCAPES.boat.needs[k])}/${ESCAPES.boat.needs[k]} ${ITEMS[k].icon}`).join(' · ')} → repair at the village jetty`;
  return [raft, skiff, radio, bunker].join('\n');
}

// ---------------- interactions ----------------
function nearestInteractable() {
  const px = player.x, pz = player.z;
  const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
  const infront = (x, z, slack) => { const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz); return d < 0.8 || (dx * fx + dz * fz) / (d || 1) > -slack; };
  const npcPrompt = (n) => ({ kind: 'npc', n, label: n.hurt ? `Help <b>${n.def.name}</b>` : n.talkT > 0 ? (n.state === 'follow' ? `<b>${n.def.name}</b>: wait here` : `<b>${n.def.name}</b>: come with me`) : `Talk to <b>${n.def.name}</b>` });
  // the dog, and any survivor you're facing, come before everything else around them
  if (!dog.follow && !dog.dead && Math.hypot(dog.x - px, dog.z - pz) < 4) return { kind: 'dog', label: 'Call <b>Biscuit</b>' };
  { const n = npcs.nearest(px, pz, 3.0); if (n) { const dx = n.x - px, dz = n.z - pz, d = Math.hypot(dx, dz) || 1; if ((dx * fx + dz * fz) / d > 0.45) return npcPrompt(n); } }
  // then pickups
  let best = null, bd = 2.4;
  for (const p of pickups) { if (p.taken || !p.m.visible) continue; const d = Math.hypot(p.x - px, p.z - pz); if (d < bd && infront(p.x, p.z, 0.5)) { bd = d; best = { kind: 'pickup', p, label: `Pick up <b>${ITEMS[p.id].name}</b>` }; } }
  if (best) return best;
  for (const f of props.fires) {
    if (Math.hypot(f.x - px, f.z - pz) > 2.6) continue;
    const canSleep = dayNight.night > 0.5 && 8 + game.progress * 35 < 29;
    if (f.t > 0) return { kind: 'rest', fire: f, canSleep, label: canSleep ? 'Hold USE: <b>rest</b> · Tap: <b>sleep till dawn</b>' : 'Hold USE: <b>rest by the fire</b>', hold: true };
    return { kind: 'relight', fire: f, can: player.inv.count('wood') > 0, label: player.inv.count('wood') ? '<b>Relight the fire</b> (1 log)' : 'The fire is out. A log would relight it' };
  }
  if (dayNight.night > 0.5) for (const sh of props.shelters) if (!sh.bunker && Math.hypot(sh.x - px, sh.z - pz) < sh.r) return { kind: 'sleep', label: '<b>Sleep until dawn</b> under cover' };
  for (const w of props.water) if (Math.hypot(w.x - px, w.z - pz) < w.r) return { kind: 'water', w, label: `Drink and fill canteen at <b>${w.name}</b>` };
  const by = POIS.boatyard;
  if (Math.hypot(by.x - px, by.z - pz) < 5.5 && !game.flags.launched) {
    if (raftDone()) return { kind: 'launch', label: '<b>Launch the raft</b>' + (npcs.followers().length ? ` with ${npcs.followers().length} survivor${npcs.followers().length > 1 ? 's' : ''}` : '') };
    const can = ['wood', 'rope', 'tarp'].some((k) => player.inv.count(k) > 0 && game.flags.raft[k] < ESCAPES.raft.needs[k]);
    return { kind: 'raft', label: can ? 'Add materials to the <b>raft</b>' : `Raft needs: ${needsText(ESCAPES.raft.needs, (k) => game.flags.raft[k])}`, can };
  }
  const t = POIS.tower, rx = t.x + Math.sin(0.2) * 3.8 + Math.cos(0.2) * 2.4, rz = t.z + Math.cos(0.2) * 3.8 - Math.sin(0.2) * 2.4;
  if (Math.hypot(rx - px, rz - pz) < 3.5 && !game.flags.radioFixed) return { kind: 'radio', label: radioReady() ? '<b>Repair the radio</b> and call for help' : `Radio needs: ${needsText(ESCAPES.radio.needs, (k) => player.inv.count(k))}`, can: radioReady() };
  if (game.flags.heliState === 'landed' && Math.hypot(props.heli.position.x - px, props.heli.position.z - pz) < 9) return { kind: 'heli', label: '<b>Board the helicopter</b>' + (npcs.followers().length ? ` with ${npcs.followers().length} survivor${npcs.followers().length > 1 ? 's' : ''}` : '') };
  const b = POIS.bunker;
  if (Math.hypot(b.x - px, b.z - pz) < 5 && !game.flags.sealed) {
    if (bunkerDone()) return { kind: 'seal', label: '<b>Seal the bunker door</b>' + (npcs.followers().length ? ` with ${npcs.followers().length} survivor${npcs.followers().length > 1 ? 's' : ''}` : '') };
    const can = (player.inv.count('water') > 0 && game.flags.bunker.water < 4) || (player.inv.foodCount() > 0 && game.flags.bunker.food < 4) || (player.inv.count('mask') > 0 && game.flags.bunker.mask < 1);
    return { kind: 'bunker', label: can ? 'Stock the <b>bunker</b>' : `Bunker needs: ${needsText(ESCAPES.bunker.needs, (k) => game.flags.bunker[k])}`, can };
  }
  if (Math.hypot(boat.x - px, boat.z - pz) < 4.5) {
    if (boat.dead) return { kind: 'none', label: 'The skiff is wrecked' };
    if (!boat.repaired) return { kind: 'repairBoat', label: player.inv.has(ESCAPES.boat.needs) ? '<b>Repair the skiff</b>' : `Skiff needs: ${needsText(ESCAPES.boat.needs, (k) => player.inv.count(k))}`, can: player.inv.has(ESCAPES.boat.needs) };
    const f = npcs.followers().filter((q) => !q.riding).length;
    return { kind: 'boat', label: '<b>Board the skiff</b>' + (f ? ` with ${Math.min(3, f)} survivor${f > 1 ? 's' : ''}` : '') };
  }
  if (Math.hypot(jeep.x - px, jeep.z - pz) < 3.8) { const f = npcs.followers().filter((q) => !q.riding).length; return jeep.dead ? { kind: 'none', label: 'The jeep is a burnt-out wreck' } : { kind: 'jeep', label: '<b>Get in the jeep</b>' + (f ? ` with ${Math.min(3, f)} survivor${f > 1 ? 's' : ''}` : '') }; }
  const n = npcs.nearest(px, pz, 3.0);
  if (n && infront(n.x, n.z, 0.2)) return { kind: 'npc', n, label: n.hurt ? `Help <b>${n.def.name}</b>` : n.talkT > 0 ? (n.state === 'follow' ? `<b>${n.def.name}</b>: wait here` : `<b>${n.def.name}</b>: come with me`) : `Talk to <b>${n.def.name}</b>` };
  // chop a palm
  if (player.inv.count('axe')) {
    let bt = null, btd = 2.3;
    for (const o of world.obstaclesNear(px, pz)) { if (!o.alive || o.v == null) continue; const d = Math.hypot(o.x - px, o.z - pz); if (d < btd && infront(o.x, o.z, 0.3)) { btd = d; bt = o; } }
    if (bt) return { kind: 'chop', tree: bt, label: 'Hold USE: <b>chop the palm</b> for logs', hold: true };
  }
  return null;
}
function doInteract(it) {
  if (!it) return;
  if (it.kind === 'pickup') { it.p.taken = true; scene.remove(it.p.m); player.inv.add(it.p.id); audio.pickup(); toast(`+1 ${ITEMS[it.p.id].name}`, 1.2); if (it.p.id === 'axe') { /* n/a */ } }
  else if (it.kind === 'npc') { const r = npcs.interact(it.n, { inventory: player.inv, stageId: game.stage.id, radioFixed: game.flags.radioFixed }); say(r.name, r.text); if (it.n.def.id === 'amara') game.flags.talkedAmara = true; }
  else if (it.kind === 'water') { voice.say('Fresh water. That\'s better.', 'You', false); player.stats.thirst = 100; const add = Math.max(0, 4 - player.inv.count('water')); if (add) player.inv.add('water', add); audio.drink(); toast(add ? `You drink your fill and refill the canteen (+${add} water)` : 'You drink your fill'); }
  else if (it.kind === 'raft') {
    if (!it.can) { toast('You have nothing the raft needs right now'); return; }
    for (const k of ['wood', 'rope', 'tarp']) { const give = Math.min(player.inv.count(k), ESCAPES.raft.needs[k] - game.flags.raft[k]); if (give > 0) { player.inv.add(k, -give); game.flags.raft[k] += give; } }
    audio.craft(); updateRaftVisual(); toast(raftDone() ? 'The raft is finished!' : 'Materials added to the raft'); if (raftDone()) voice.say('The raft is finished. Time to go.', 'You', false);
  } else if (it.kind === 'launch') launchRaft();
  else if (it.kind === 'radio') {
    if (!it.can) { toast('You still need parts for the radio'); return; }
    player.inv.take(ESCAPES.radio.needs); game.flags.radioFixed = true; game.flags.heliT = Math.min(difficulty === 'hardcore' ? 90 : 120, game.duration * 0.25); game.flags.heliState = 'coming';
    props.radioLamp.material.emissiveIntensity = 3; audio.radioStatic();
    const lena = npcs.byId('lena'); say(lena.def.name, lena.def.lines.fixed[0], 9); banner('MAYDAY SENT', 'Helicopter inbound. Get everyone to the helipad.');
  } else if (it.kind === 'heli') boardHeli();
  else if (it.kind === 'bunker') {
    if (!it.can) { toast('You have nothing the bunker needs right now'); return; }
    const B = game.flags.bunker;
    const gw = Math.min(player.inv.count('water'), 4 - B.water); if (gw > 0) { player.inv.add('water', -gw); B.water += gw; }
    const gf = Math.min(player.inv.foodCount(), 4 - B.food); if (gf > 0) { player.inv.take({ food: gf }); B.food += gf; }
    if (B.mask < 1 && player.inv.count('mask')) { player.inv.add('mask', -1); B.mask = 1; }
    audio.craft(); toast(bunkerDone() ? 'The bunker is stocked. Seal the door when you are ready.' : 'Supplies stacked inside the bunker');
  } else if (it.kind === 'seal') sealBunker();
  else if (it.kind === 'jeep') enterJeep();
  else if (it.kind === 'boat') enterBoat();
  else if (it.kind === 'sleep') trySleep(true);
  else if (it.kind === 'dog') { dog.follow = 'player'; audio.bark(0); toast('Biscuit trots after you, tail going', 3); const pete = npcs.byId('pete'); if (pete.wantKnown && !pete.dead) voice.say('Found you. Come on, Pete\'s waiting.', 'You', false); }
  else if (it.kind === 'relight') { if (!it.can) { toast('You need a log to relight it'); return; } player.inv.add('wood', -1); it.fire.t = 180; claimFireLight(it.fire); audio.craft(); toast('The fire catches again'); }
  else if (it.kind === 'repairBoat') {
    if (!it.can) { toast('You still need parts for the skiff'); return; }
    player.inv.take(ESCAPES.boat.needs); boat.repair(); audio.craft(); banner('SKIFF REPAIRED', 'The Moana floats again. Board her and make for open water.');
    const kai = npcs.byId('kai'); if (!kai.dead) say(kai.def.name, 'She\'s seaworthy! Head straight out past the reef, and keep clear of the shallows or you\'ll ground her.', 8);
  }
}
function updateRaftVisual() {
  const R = game.flags.raft, n = ESCAPES.raft.needs;
  const stage = raftDone() ? 3 : R.wood >= n.wood ? 2 : R.wood >= 3 ? 1 : 0;
  setRaftStage(props.raft, stage);
}
function launchRaft() {
  // push off toward open water: the direction in which the seabed drops fastest
  let bestA = 0, bestH = 1e9;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) { const h = heightAt(POIS.boatyard.x + Math.cos(a) * 40, POIS.boatyard.z + Math.sin(a) * 40); if (h < bestH) { bestH = h; bestA = a; } }
  const raft = props.raft; raft.parent.remove(raft); scene.add(raft);
  raft.position.set(POIS.boatyard.x + Math.cos(bestA) * 16, SEA + 0.2, POIS.boatyard.z + Math.sin(bestA) * 16); raft.rotation.set(0, 0, 0);
  raft.userData.dir = bestA; raft.userData.vx = 0; raft.userData.vz = 0;
  game.flags.launched = true; player.onRaft = true; player.x = raft.position.x; player.z = raft.position.z;
  for (const n of npcs.followers()) { if (Math.hypot(n.x - player.x, n.z - player.z) < 25) { n.saved = true; n.state = 'saved'; game.saved++; } }
  props.raftRing.visible = false;
  audio.splash(); banner('CAST OFF', 'Paddle out past the reef, away from the mountain.');
  cam.distSel = 1; cam.dist = DISTS[1];
}
function boardHeli() {
  player.inHeli = true; game.flags.heliState = 'leaving'; game.flags.heliT = 0;
  for (const n of npcs.followers()) { if (Math.hypot(n.x - player.x, n.z - player.z) < 25) { n.saved = true; n.state = 'saved'; game.saved++; } }
  player.rig.root.visible = false;
  banner('LIFT OFF', 'Hold on.');
}
function sealBunker() {
  game.flags.sealed = true; player.inBunker = true;
  for (const n of npcs.followers()) { if (Math.hypot(n.x - player.x, n.z - player.z) < 25) { n.saved = true; n.state = 'saved'; game.saved++; } }
  const pete = npcs.byId('pete'); if (!pete.dead && !pete.saved && Math.hypot(pete.x - player.x, pete.z - player.z) < 25) { pete.saved = true; game.saved++; }
  if (!dog.dead && (dog.follow === 'player' || (dog.follow === 'pete' && pete.saved)) && Math.hypot(dog.x - player.x, dog.z - player.z) < 30) dog.saved = true;
  player.x = props.bunkerInside.x; player.z = props.bunkerInside.z;
  props.bunkerDoor.rotation.y = 0; props.bunkerLight.intensity = 18;
  audio.doorSlam(); banner('SEALED IN', 'Two metres of rock between you and the mountain. Now you wait.');
}

// ---------------- crafting ----------------
function craft(rec) {
  if (!player.inv.has(rec.needs)) return;
  if (rec.build) { if (!buildFireHere()) return; player.inv.take(rec.needs); audio.craft(); closeMenu(); toast('You build a campfire. Hold USE beside it to rest.', 3); voice.say('That\'ll keep the dark off.', 'You', false); return; }
  player.inv.take(rec.needs); for (const [k, n] of Object.entries(rec.gives)) player.inv.add(k, n);
  audio.craft(); toast(`Crafted ${rec.name}`); renderCraft();
}
function renderCraft() {
  const inv = player.inv.list();
  setHTML('invList', inv.length ? inv.map((id) => `<span class="it">${ITEMS[id].icon} ${ITEMS[id].name} × ${player.inv.count(id)}</span>`).join('') : '<span class="it">Your pockets are empty</span>');
  $('craftList').innerHTML = '';
  for (const rec of RECIPES) {
    if (rec.once && rec.gives && player.inv.count(Object.keys(rec.gives)[0])) continue;
    const out = rec.gives ? ITEMS[Object.keys(rec.gives)[0]] : { icon: rec.icon, desc: rec.desc };
    const row = document.createElement('div'); row.className = 'rec';
    row.innerHTML = `<div><div class="n">${out.icon} ${rec.name}</div><div class="need">${needsText(rec.needs, (k) => player.inv.count(k))} · ${out.desc}</div></div>`;
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = rec.build ? 'BUILD' : 'CRAFT'; b.disabled = !player.inv.has(rec.needs); b.onclick = () => craft(rec); row.appendChild(b); $('craftList').appendChild(row);
  }
  $('survList').innerHTML = '';
  for (const n of npcs.list) {
    const w = n.def.want;
    const st = n.dead ? '<span class="no">lost</span>' : n.saved ? '<span class="ok">safe</span>' : n.hurt ? 'hurt: needs a bandage' : n.state === 'follow' ? '<span class="ok">with you</span>'
      : w && !n.wantMet ? (n.wantKnown ? `won't leave without ${w.item === 'dog' ? 'Biscuit, his dog' : ITEMS[w.item].name.toLowerCase()} (${w.where})${w.item !== 'dog' && player.inv.count(w.item) ? ' <span class="ok">you have it</span>' : ''}` : 'talk to them') : 'ready to come with you';
    const row = document.createElement('div'); row.className = 'rec'; row.innerHTML = `<div><div class="n">${n.def.name} <span style="font-weight:400;opacity:.7">${n.def.role}</span></div><div class="need">${st}</div></div>`; $('survList').appendChild(row);
  }
  { const row = document.createElement('div'); row.className = 'rec'; row.innerHTML = `<div><div class="n">🐕 Biscuit <span style="font-weight:400;opacity:.7">Pete's dog</span></div><div class="need">${dog.dead ? '<span class="no">lost</span>' : dog.saved ? '<span class="ok">safe</span>' : dog.follow === 'pete' ? '<span class="ok">back with Pete</span>' : dog.follow === 'player' ? '<span class="ok">following you</span>' : 'lost somewhere on the island'}</div></div>`; $('survList').appendChild(row); }
  $('escList').innerHTML = '';
  const rows = [
    ['⛵ Raft (Raft Beach)', needsText(ESCAPES.raft.needs, (k) => game.flags.raft[k]) + ' deposited'],
    ['🚤 Kai\'s skiff (village jetty)', boat.repaired ? '<span class="ok">repaired</span>' : needsText(ESCAPES.boat.needs, (k) => player.inv.count(k)) + ' in your pack (the battery is also what the radio needs)'],
    ['📡 Radio (Ranger Station)', game.flags.radioFixed ? '<span class="ok">repaired, helicopter called</span>' : needsText(ESCAPES.radio.needs, (k) => player.inv.count(k)) + ' in your pack'],
    ['🚪 Bunker (south-west coast)', needsText(ESCAPES.bunker.needs, (k) => game.flags.bunker[k]) + ' stocked'],
  ];
  for (const [n, t] of rows) { const row = document.createElement('div'); row.className = 'rec'; row.innerHTML = `<div><div class="n">${n}</div><div class="need">${t}</div></div>`; $('escList').appendChild(row); }
}
function useSlot(i) {
  const list = player.inv.list(); const id = list[i]; if (!id) return;
  const it = ITEMS[id]; if (!it.use) { toast(it.desc, 2); return; }
  const s = player.stats;
  if (it.use.health && s.health > 98) { toast('You are not hurt'); return; }
  for (const [k, v] of Object.entries(it.use)) s[k] = clamp(s[k] + v, 0, 100);
  player.inv.add(id, -1);
  if (id === 'water') audio.drink(); else if (id === 'bandage') audio.craft(); else audio.eat();
  toast(id === 'water' ? 'You drink from the canteen' : id === 'bandage' ? 'You bandage your wounds' : `You eat the ${it.name.toLowerCase()}`, 1.5);
}
$('inv').addEventListener('click', (e) => { const s = e.target.closest('.slot'); if (s) useSlot(+s.dataset.i); });
function renderInv() {
  const list = player.inv.list();
  const html = list.slice(0, 8).map((id, i) => `<div class="slot ${ITEMS[id].tool ? 'tool' : 'use'}" data-i="${i}" title="${ITEMS[id].name}: ${ITEMS[id].desc}"><small>${i + 1}</small>${ITEMS[id].icon}<b>${player.inv.count(id)}</b></div>`).join('');
  setHTML('inv', html);
}

// ---------------- damage, death and endings ----------------
function hurt(amount, cause) { if (player.dead || game.over) return; player.stats.health -= amount; player.hurtFlash = 1; player.lastDmg = cause; audio.hurt(); if (player.stats.health <= 0) die(cause); }
function die(cause) {
  if (game.over) return; player.dead = true; game.over = true; game.ending = 'dead';
  audio.fail(); store.del(SAVE_KEY);
  setTimeout(() => endScreen('YOU DIDN\'T MAKE IT', `You were ${cause}. The mountain keeps its island.`), 2200);
}
function win(kind) {
  if (game.over) return;
  if (!dog.dead && (dog.follow === 'player' || (dog.follow === 'pete' && npcs.byId('pete').saved))) dog.saved = true; game.over = true; game.ending = kind; audio.success(); store.del(SAVE_KEY);
  const texts = {
    raft: ['OPEN WATER', 'The reef falls behind you and the island becomes a smudge under a black sky. By nightfall the mountain is a red glow on the horizon, and you are still alive.'],
    rescue: ['AIRLIFTED', 'The helicopter banks away as the summit lets go. Below you the beaches go dark under the surge. Someone hands you a blanket. It is over.'],
    boat: ['OPEN THROTTLE', 'The Moana climbs the swell past the reef and the island drops astern. Behind you the summit lets go and the sea boils where the flows meet it. Kai was right about the current.'],
    bunker: ['YOU HELD', 'The roar goes on for an hour. Dust sifts from the ceiling. Then silence. When you finally crank the door, the island is grey from shore to summit, and you are standing on it.'],
  };
  setTimeout(() => endScreen(texts[kind][0], texts[kind][1]), kind === 'bunker' ? 1500 : 4500);
}
function endScreen(title, text) {
  show('hud', false); show('end');
  $('endTitle').textContent = title; $('endText').textContent = text; voice.say(title + '. ' + text, 'Narrator', true);
  const left = Math.max(0, game.duration - game.t), m = Math.floor(left / 60), s = Math.floor(left % 60);
  const alive = npcs.list.filter((n) => !n.dead).length;
  $('endStats').innerHTML = `<span>Outcome</span><b>${game.ending === 'dead' ? 'Lost' : game.ending === 'raft' ? 'Escaped by raft' : game.ending === 'boat' ? 'Escaped in the skiff' : game.ending === 'rescue' ? 'Rescued by helicopter' : 'Survived in the bunker'}</b>
    <span>Survivors brought with you</span><b>${game.saved} of ${npcs.list.length}</b><span>Survivors still alive</span><b>${alive}</b><span>Biscuit the dog</span><b>${dog.saved ? 'safe' : dog.dead ? 'lost' : 'left behind'}</b>
    <span>Time to spare</span><b>${game.ending === 'dead' || game.ending === 'bunker' ? '—' : `${m}:${String(s).padStart(2, '0')}`}</b><span>Pace</span><b>${DIFFICULTY[difficulty].name}</b>`;
  game.running = false; if (document.pointerLockElement) document.exitPointerLock();
}

// ---------------- save & load ----------------
function save() {
  if (game.over || !game.started) return;
  const data = {
    v: 1, t: game.t, difficulty, player: { x: player.inJeep ? jeep.exitSpot().x : player.inBoat ? boat.exitSpot().x : player.x, y: player.y, z: player.inJeep ? jeep.exitSpot().z : player.inBoat ? boat.exitSpot().z : player.z, yaw: player.yaw, stats: player.stats, inv: player.inv.items, onRaft: player.onRaft, inBunker: player.inBunker },
    flags: game.flags, saved: game.saved, taken: pickups.filter((p) => p.taken).map((p) => p.idx), felled: world.trees.map((t, i) => (t.alive ? -1 : i)).filter((i) => i >= 0),
    npcs: npcs.list.map((n) => ({ id: n.def.id, x: n.x, z: n.z, state: n.state, hurt: n.hurt, dead: n.dead, saved: n.saved, healedSaid: n.healedSaid, fixedSaid: !!n.fixedSaid, wantMet: !!n.wantMet, wantKnown: !!n.wantKnown })),
    dog: { x: dog.x, z: dog.z, follow: dog.follow, dead: dog.dead, saved: dog.saved },
    fires: props.fires.filter((f) => f.built).map((f) => ({ x: f.x, z: f.z, t: Math.max(0, f.t) })),
    raft: props.raft.parent === scene ? { x: props.raft.position.x, z: props.raft.position.z } : null, cam: { yaw: cam.yaw, pitch: cam.pitch },
    jeep: { x: jeep.x, z: jeep.z, yaw: jeep.yaw, hp: jeep.hp, dead: jeep.dead },
    boat: { x: boat.x, z: boat.z, yaw: boat.yaw, hp: boat.hp, dead: boat.dead, repaired: boat.repaired },
  };
  store.set(SAVE_KEY, data); game.lastSave = game.t;
}
function load(data) {
  game.t = data.t; difficulty = data.difficulty || difficulty; game.duration = DIFFICULTY[difficulty].minutes * 60;
  Object.assign(player, { x: data.player.x, y: data.player.y, z: data.player.z, yaw: data.player.yaw, onRaft: data.player.onRaft, inBunker: data.player.inBunker });
  player.stats = data.player.stats; player.inv = new Inventory(data.player.inv);
  game.flags = data.flags; game.saved = data.saved || 0;
  for (const i of data.taken) { const p = pickups[i]; if (p && !p.taken) { p.taken = true; scene.remove(p.m); } }
  for (const i of data.felled) if (world.trees[i] && world.trees[i].alive) world.fellTree(world.trees[i]);
  for (const s of data.npcs) { const n = npcs.byId(s.id); if (!n) continue; Object.assign(n, { x: s.x, z: s.z, state: s.state, hurt: s.hurt, dead: s.dead, saved: s.saved, healedSaid: s.healedSaid, fixedSaid: s.fixedSaid, wantMet: !!s.wantMet, wantKnown: !!s.wantKnown }); n.tx = n.x; n.tz = n.z; }
  if (data.dog) { Object.assign(dog, { x: data.dog.x, z: data.dog.z, follow: data.dog.follow, dead: data.dog.dead, saved: data.dog.saved }); }
  if (data.raft) { props.raft.parent.remove(props.raft); scene.add(props.raft); props.raft.position.set(data.raft.x, SEA + 0.2, data.raft.z); props.raft.rotation.set(0, 0, 0); props.raft.userData.dir = 0; props.raft.userData.vx = 0; props.raft.userData.vz = 0; props.raftRing.visible = false; }
  updateRaftVisual();
  if (game.flags.radioFixed) props.radioLamp.material.emissiveIntensity = 3;
  if (game.flags.sealed) { props.bunkerDoor.rotation.y = 0; props.bunkerLight.intensity = 18; }
  if (data.cam) { cam.yaw = data.cam.yaw; cam.pitch = data.cam.pitch; }
  if (data.fires) for (const f of data.fires) addFire(f.x, f.z, f.t);
  if (data.boat) { boat.x = data.boat.x; boat.z = data.boat.z; boat.yaw = data.boat.yaw; boat.hp = data.boat.hp; if (data.boat.repaired) boat.repair(); if (data.boat.dead) boat.damage(1000); boat.group.position.set(boat.x, SEA, boat.z); boat.group.rotation.y = boat.yaw; }
  if (data.jeep) { jeep.x = data.jeep.x; jeep.z = data.jeep.z; jeep.yaw = data.jeep.yaw; jeep.y = heightAt(jeep.x, jeep.z); jeep.hp = data.jeep.hp; if (data.jeep.dead) jeep.damage(1000); jeep.group.position.set(jeep.x, jeep.y, jeep.z); jeep.group.rotation.y = jeep.yaw; }
  if (player.onRaft) { cam.distSel = 1; cam.dist = DISTS[1]; }
}

// ---------------- the helicopter ----------------
function updateHeli(dt) {
  const F = game.flags, h = props.heli, pad = POIS.helipad;
  if (F.heliState === 'away') return;
  h.visible = true;
  h.userData.rotor.rotation.y += dt * 28; h.userData.tailRotor.rotation.x += dt * 40;
  const padY = pad.y + 0.3;
  if (F.heliState === 'coming') {
    F.heliT -= dt;
    const t = clamp(1 - F.heliT / 45, 0, 1); // the last 45 seconds are the approach
    const sx = pad.x + 700, sz = pad.z + 300, sy = 160;
    if (F.heliT > 45) { h.position.set(sx, sy, sz); h.rotation.y = Math.atan2(pad.x - sx, pad.z - sz); }
    else {
      const k = smooth(0, 1, t);
      h.position.set(lerp(sx, pad.x, k), lerp(sy, padY, Math.pow(k, 1.6)), lerp(sz, pad.z, k));
      h.rotation.y = Math.atan2(pad.x - sx, pad.z - sz) + Math.PI; h.rotation.z = Math.sin(k * Math.PI) * 0.15;
      if (t >= 1) { F.heliState = 'landed'; F.heliT = 0; banner('HELICOPTER DOWN', 'It\'s on the pad. Get everyone aboard!'); }
    }
    audio.vol.heli = clamp(1 - Math.hypot(h.position.x - player.x, h.position.z - player.z) / 500, 0, 1);
  } else if (F.heliState === 'landed') {
    F.heliT += dt;
    h.position.y = padY; h.rotation.z = 0;
    audio.vol.heli = clamp(1 - Math.hypot(h.position.x - player.x, h.position.z - player.z) / 300, 0, 1) * 0.8;
    // the surge reaching the pad sends it away without you
    if (volcano.surgeR > 0 && distToVolcano(pad.x, pad.z) < volcano.surgeR + 80) { F.heliState = 'gone'; toast('The helicopter lifts off without you!', 5); }
  } else if (F.heliState === 'leaving' || F.heliState === 'gone') {
    F.heliT += dt;
    const k = F.heliT;
    h.position.y = padY + k * k * 2.5; h.position.x += dt * k * 9; h.position.z += dt * k * 3; h.rotation.z = -0.12;
    if (F.heliState === 'leaving') { camera.position.set(h.position.x - 14, h.position.y + 5, h.position.z + 10); audio.vol.heli = 1; if (k > 3.5 && !game.over) win('rescue'); }
    else audio.vol.heli = clamp(1 - k / 20, 0, 1);
  }
}

// ---------------- the raft ----------------
function updateRaft(dt, mv) {
  const raft = props.raft, ud = raft.userData;
  const camF = { x: Math.sin(cam.yaw), z: Math.cos(cam.yaw) }, camR = { x: -Math.cos(cam.yaw), z: Math.sin(cam.yaw) };
  const ax = (camF.x * mv.y + camR.x * mv.x), az = (camF.z * mv.y + camR.z * mv.x);
  const push = player.stats.stamina > 5 ? 4.0 : 1.5;
  ud.vx += ax * push * dt; ud.vz += az * push * dt;
  ud.vx *= 1 - dt * 0.6; ud.vz *= 1 - dt * 0.6;
  // the current carries you away from the island
  const cx = raft.position.x, cz = raft.position.z, dc = Math.hypot(cx, cz) || 1;
  ud.vx += (cx / dc) * 0.3 * dt; ud.vz += (cz / dc) * 0.3 * dt;
  let nx = cx + ud.vx * dt, nz = cz + ud.vz * dt;
  if (heightAt(nx, nz) > SEA - 0.8) { ud.vx *= -0.3; ud.vz *= -0.3; nx = cx; nz = cz; }
  raft.position.set(nx, SEA + 0.15 + Math.sin(game.t * 1.4) * 0.12, nz);
  raft.rotation.z = Math.sin(game.t * 1.1) * 0.04; raft.rotation.x = Math.cos(game.t * 1.5) * 0.04;
  if (mv.l > 0.1) { const ty = Math.atan2(ax, az); let d = ty - raft.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; raft.rotation.y += d * Math.min(1, dt * 1.5); }
  player.x = nx; player.z = nz; player.y = raft.position.y + 0.35; player.yaw = raft.rotation.y;
  player.rig.root.position.set(player.x, player.y, player.z); player.rig.root.rotation.y = player.yaw;
  animateSurvivor(player.rig, dt, { speed: mv.l > 0.1 ? 1 : 0, carry: mv.l > 0.1 });
  if (mv.l > 0.1) player.stats.stamina = Math.max(0, player.stats.stamina - dt * 3);
  const sea = heightAt(nx, nz);
  if (sea < -24 && Math.hypot(nx - POIS.boatyard.x, nz - POIS.boatyard.z) > 120 && !game.flags.pastReef) { game.flags.pastReef = true; win('raft'); }
  if (!game.flags.pastReef && sea < -12 && !ud.said) { ud.said = true; toast('Deep water. Keep going, the reef is ahead.', 3); }
}

// ---------------- the player on foot ----------------
const tmpN = new THREE.Vector3();
function updatePlayer(dt) {
  const s = player.stats, mv = input.move();
  if (player.inHeli) return;
  if (player.inJeep) { driveTick(dt); return; }
  if (player.inBoat) { boatTick(dt); return; }
  if (player.onRaft) { updateRaft(dt, mv); return; }
  if (player.inBunker) {
    // inside: nothing to do but wait (and eat)
    player.y = heightAt(player.x, player.z); player.rig.root.position.set(player.x, player.y, player.z);
    animateSurvivor(player.rig, dt, { mode: 'sit' });
    return;
  }
  const camF = { x: Math.sin(cam.yaw), z: Math.cos(cam.yaw) }, camR = { x: -Math.cos(cam.yaw), z: Math.sin(cam.yaw) };
  let dx = camF.x * mv.y + camR.x * mv.x, dz = camF.z * mv.y + camR.z * mv.x;
  const ground = heightAt(player.x, player.z);
  const depth = SEA - ground;
  player.swimming = depth > 1.15;
  const resting = !!(currentInteract && currentInteract.kind === 'rest' && input.down('interact') && mv.l < 0.15);
  const sprint = input.down('sprint') && s.stamina > 2 && mv.l > 0.2 && !player.swimming;
  const tired = s.stamina <= 0.5;
  let maxSpeed = player.swimming ? 1.9 : sprint ? 6.0 : 2.7;
  if (tired) maxSpeed *= 0.55; if (s.health < 25) maxSpeed *= 0.8;
  const slope = normalAt(player.x, player.z, tmpN);
  // steep ground slows you going up and stops you on cliffs
  const uphill = (dx * -slope.x + dz * -slope.z);
  if (!player.swimming && slope.y < 0.62 && uphill > 0.2) maxSpeed *= 0.15;
  const want = mv.l * maxSpeed;
  player.speed += (want - player.speed) * Math.min(1, dt * (want > player.speed ? 8 : 10));
  if (mv.l > 0.05) { const ty = Math.atan2(dx, dz); let d = ty - player.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; player.yaw += d * Math.min(1, dt * 12); }
  let nx = player.x + Math.sin(player.yaw) * player.speed * dt, nz = player.z + Math.cos(player.yaw) * player.speed * dt;
  // sliding off steep slopes
  if (!player.swimming && slope.y < 0.5 && player.onGround) { nx += slope.x * 6 * dt * (1 - slope.y); nz += slope.z * 6 * dt * (1 - slope.y); }
  const res = resolveObstacles(nx, nz, 0.4, world); nx = res.x; nz = res.z;
  // nothing past the edge of the world, and the current is too strong far out
  const dc = Math.hypot(nx, nz);
  if (dc > 440) { nx *= 440 / dc; nz *= 440 / dc; if (Math.random() < dt) toast('The current is too strong to swim further. You need a raft.', 3); }
  // the bunker mound and the plane are solid-ish: keep out of the wreck's fuselage
  player.x = nx; player.z = nz;
  const g2 = heightAt(player.x, player.z);
  // jumping and gravity
  if (player.swimming) { player.y = SEA - 0.5 + Math.sin(game.t * 2) * 0.05; player.vy = 0; player.onGround = true; }
  else {
    if (player.onGround && input.pressed('jump') && s.stamina > 5) { player.vy = 5.2; player.onGround = false; s.stamina -= 5; audio.jump(); }
    player.vy -= 14 * dt; player.y += player.vy * dt;
    if (player.y <= g2) { if (!player.onGround && player.vy < -2.5) audio.land(surfaceAt(player.x, player.z), clamp(-player.vy / 9, 0.3, 1)); if (!player.onGround && player.vy < -11) hurt((-player.vy - 11) * 8, 'killed by a fall'); player.y = g2; player.vy = 0; player.onGround = true; }
  }
  if (player.swimming && !player.wasSwimming) audio.splash(); player.wasSwimming = player.swimming;
  // chopping (hold USE at a palm with an axe)
  const it = currentInteract;
  if (it && it.kind === 'chop' && input.down('interact')) {
    if (player.chopTree !== it.tree) { player.chopTree = it.tree; player.chop = 0; player.chopHits = 0; }
    player.chop += dt;
    if (player.rig.chopT <= 0) player.rig.chopT = 0.7;
    if (player.chop >= 0.7) {
      player.chop = 0; player.chopHits++; audio.chop(); s.stamina = Math.max(0, s.stamina - 4);
      if (player.chopHits >= 3) { world.fellTree(it.tree); for (let i = 0; i < 3; i++) spawnPickup('wood', it.tree.x + Math.cos(i * 2.1) * 1.5, it.tree.z + Math.sin(i * 2.1) * 1.5); pickups.slice(-3).forEach((p) => { p.m.visible = true; }); toast('The palm comes down: 3 logs'); player.chopTree = null; }
    }
    axeModel.visible = true;
  } else { player.chop = 0; player.chopTree = null; axeModel.visible = player.rig.chopT > 0; }
  // the body
  const nearLava = volcano.heatAt(player.x, player.z);
  const sheltered = player.inBunker || props.shelters.some((z) => Math.hypot(z.x - player.x, z.z - player.z) < z.r);
  const dmg = tickStats(s, dt, { sprinting: sprint, swimming: player.swimming, ash: volcano.ash, sheltered, mask: player.inv.count('mask') > 0, hard: difficulty === 'hardcore', moving: mv.l > 0.2, hot: nearLava > 0 || distToVolcano(player.x, player.z) < 140 });
  if (dmg > 0 && s.health <= 0) die(s.air <= 0 ? 'choked by the ash' : s.thirst <= 0 ? 'lost to thirst' : s.hunger <= 0 ? 'lost to hunger' : 'drowned');
  if (nearLava > 0) { hurt(nearLava * nearLava * 70 * dt, 'taken by the lava'); if (nearLava >= 0.999) die('taken by the lava'); }
  // a fire warms you and resting beside one restores you; the night air saps you a little without one
  if (litFireNear(player.x, player.z, 4.5)) {
    s.stamina = Math.min(100, s.stamina + dt * (resting ? 35 : 8));
    if (s.hunger > 25 && s.thirst > 25) s.health = Math.min(100, s.health + dt * (resting ? 4 : 0.8));
    if (!player.warmSaid) { player.warmSaid = true; toast('You warm yourself by the fire', 1.8); }
  } else { player.warmSaid = false; if (dayNight.night > 0.5 && !player.swimming) s.stamina = Math.max(0, s.stamina - dt * 1.5 * dayNight.night); }
  // the rig
  player.rig.root.position.set(player.x, player.y, player.z); player.rig.root.rotation.y = player.yaw;
  const ph0 = player.rig.phase;
  animateSurvivor(player.rig, dt, { speed: resting ? 0 : player.speed, mode: player.swimming ? 'swim' : resting ? 'sit' : 'move', torch: torchModel.visible, air: !player.onGround, hurt: s.health < 30, tilt: player.onGround && !player.swimming ? groundTilt(slope, player.yaw) : [0, 0] });
  if (Math.floor(player.rig.phase / Math.PI) !== Math.floor(ph0 / Math.PI)) {
    if (player.swimming) audio.stroke(player.speed > 0.3 ? 0.8 : 0.35);
    else if (player.onGround && player.speed > 0.4) audio.step(surfaceAt(player.x, player.z), player.speed > 4 ? 1 : 0.7);
  }
  // dust off your heels on sand and ash, spray when you swim
  fx.stepT -= dt * Math.max(0.3, player.speed);
  if (fx.stepT <= 0 && player.onGround && !player.swimming && player.speed > 1.5) {
    fx.stepT = 1.1;
    const sandy = g2 < 6 || volcano.ash > 0.3 || g2 > 90;
    if (sandy) fx.dust.emit(player.x - Math.sin(player.yaw) * 0.3, player.y + 0.15, player.z - Math.cos(player.yaw) * 0.3, (Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6, 0.5, 0.9, g2 > 90 || volcano.ash > 0.3 ? 0.8 : 0.1, 0.45, 1.2);
  }
  if (player.swimming && player.speed > 0.4 && Math.random() < dt * 14) fx.spray.emit(player.x + (Math.random() - 0.5) * 1.2, SEA + 0.05, player.z + (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.5, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5, 0.35, 0.7, 0.1, 0.8, 1.0);
}

// ---------------- camera ----------------
const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
function updateCamera(dt) {
  if (player.inHeli) { camera.lookAt(props.heli.position); return; }
  const look = input.lookDelta(dt);
  cam.yaw -= look.x; cam.pitch = clamp(cam.pitch + look.y, -0.45, 1.1);
  const veh = player.inJeep ? jeep : player.inBoat ? boat : null;
  if (veh && Math.abs(look.x) < 0.0005 && Math.abs(veh.speed) > 1.5) { let d = veh.yaw + (veh.speed < 0 ? Math.PI : 0) - cam.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; cam.yaw += d * Math.min(1, dt * 1.6); }
  if (input.pressed('camera')) { cam.distSel = (cam.distSel + 1) % DISTS.length; cam.dist = DISTS[cam.distSel]; }
  let dist = (player.inJeep || player.inBoat) ? Math.max(cam.dist, 8.5) : cam.dist;
  if (game.intro > 0) { const k = smooth(0, 1, 1 - game.intro / 7); dist = lerp(90, cam.dist, k); cam.pitch = lerp(0.9, 0.28, k); cam.yaw = lerp(Math.PI + 1.8, Math.PI + 0.4, k); }
  const head = { x: player.x, y: player.y + (player.inJeep ? 1.9 : player.inBoat ? 1.6 : player.swimming ? 0.9 : 1.55), z: player.z };
  camTarget.set(head.x, head.y, head.z);
  const cx = head.x - Math.sin(cam.yaw) * Math.cos(cam.pitch) * dist, cz = head.z - Math.cos(cam.yaw) * Math.cos(cam.pitch) * dist, cy = head.y + Math.sin(cam.pitch) * dist;
  // keep the camera out of the ground and above the sea
  let fx = cx, fy = cy, fz = cz;
  for (let k = 1; k <= 8; k++) { const t = k / 8, x = lerp(head.x, cx, t), z = lerp(head.z, cz, t), y = lerp(head.y, cy, t), g = heightAt(x, z) + 0.6; if (y < g || y < SEA + 0.4) { const tt = Math.max(0.12, (k - 1) / 8); fx = lerp(head.x, cx, tt); fy = Math.max(lerp(head.y, cy, tt), heightAt(fx, lerp(head.z, cz, tt)) + 0.6, SEA + 0.4); fz = lerp(head.z, cz, tt); break; } }
  // shake: tremors, blasts
  cam.kick *= Math.max(0, 1 - dt * 3);
  const sh = (volcano.shake * 0.35 + cam.kick * 0.6) * (player.inBunker ? 0.4 : 1);
  const t = performance.now() * 0.001;
  fx += Math.sin(t * 37) * sh * 0.3; fy += Math.sin(t * 41 + 1) * sh * 0.25; fz += Math.cos(t * 33) * sh * 0.3;
  const k = game.intro > 0 ? 1 : Math.min(1, dt * 10);
  camPos.lerp(new THREE.Vector3(fx, fy, fz), k);
  camera.position.copy(camPos);
  camera.lookAt(camTarget.x + Math.sin(t * 29) * sh * 0.2, camTarget.y + Math.cos(t * 31) * sh * 0.2, camTarget.z);
  // the sun's shadows follow you
  sun.target.position.set(player.x, player.y, player.z);
  sun.position.copy(sun.target.position).addScaledVector(lightDir, 180);
}

// ---------------- sky, light and weather by progress ----------------
const skyA = new THREE.Color(), skyB = new THREE.Color(), tmpC = new THREE.Color();
function updateAtmosphere(dt, vfx) {
  const p = game.progress, ash = vfx.ash;
  // the island clock and the sun's path: rising in the east (-x), over the south, setting in the west (+x)
  const hrs = 8 + p * 35, hour = hrs % 24, th = (hour - 6) / 12 * Math.PI;
  U.uSun.value.set(-Math.cos(th), Math.sin(th), -0.35 * Math.sin(th)).normalize();
  const sy = U.uSun.value.y, dayK = smooth(-0.14, 0.12, sy), night = 1 - dayK, dusk = 1 - smooth(0.0, 0.32, Math.abs(sy + 0.02));
  Object.assign(dayNight, { hour, day: 3 + Math.floor(hrs / 24), night, dayK, dusk });
  U.uDusk.value = dusk; U.uNight.value = night; U.uAsh.value = ash; U.uPlume.value = vfx.plume; U.uTime.value = game.t; U.uWind.value = (0.3 + vfx.stageIdx * 0.3) * (0.7 + 0.5 * Math.max(0, Math.sin(game.t * 0.21) * Math.sin(game.t * 0.07 + 1.3) + 0.3 * Math.sin(game.t * 0.9))) + volcano.shake * 0.5; U.uCloud.value = 0.3 + 0.2 * dusk;
  U.uSunCol.value.set('#fff2d0').lerp(tmpC.set('#ff9a50'), dusk).lerp(tmpC.set('#6a5a50'), ash * 0.8);
  U.uSkyTop.value.set('#2a72d6').lerp(tmpC.set('#3b4a7a'), dusk).lerp(tmpC.set('#050915'), night);
  U.uHorizon.value.set('#cfe4f5').lerp(tmpC.set('#ffb080'), dusk * (0.4 + 0.6 * dayK)).lerp(tmpC.set('#101a30'), night * 0.92);
  U.uSky.value.copy(U.uHorizon.value).lerp(tmpC.set('#4a4542').multiplyScalar(0.25 + 0.75 * dayK), ash);
  // one shadow-casting light: the sun by day, the moon by night, swapped at the horizon where both are faint
  if (sy > -0.02) { lightDir.copy(U.uSun.value); sun.color.copy(U.uSunCol.value); sun.intensity = 2.8 * (1 - ash * 0.8) * smooth(-0.02, 0.25, sy) * (0.55 + 0.45 * Math.max(0, sy)); }
  else { lightDir.copy(U.uSun.value).negate(); sun.color.set('#9fb4ff'); sun.intensity = 0.5 * smooth(0.02, 0.3, -sy) * (1 - ash * 0.9); }
  // ash scatters what light there is, so by day the world goes flat and grey rather than black
  hemi.intensity = lerp(0.2, 0.9 * (1 - ash * 0.2) * (0.7 + 0.3 * Math.max(0, sy)) + ash * 0.35, dayK) + ash * 0.06 * night;
  hemi.color.set('#bfe0ff').lerp(tmpC.set('#8a827a'), ash).lerp(tmpC.set('#4a5a8a'), night * (1 - ash));
  renderer.toneMappingExposure = 1.05 + 0.4 * night;
  scene.fog.color.copy(U.uHorizon.value).lerp(tmpC.set('#6a625c').multiplyScalar(0.3 + 0.7 * dayK), ash * 0.9);
  const inSurge = volcano.surgeR > 0 && distToVolcano(player.x, player.z) < volcano.surgeR + 40 && !player.inBunker;
  scene.fog.near = lerp(160, 14, ash) * (inSurge ? 0.2 : 1); scene.fog.far = lerp(1150, 210, ash) * (inSurge ? 0.25 : 1);
  if (player.inBunker) { scene.fog.near = 2; scene.fog.far = 16; scene.fog.color.set('#2a2320'); }
  // crater glow colours the underside of the ash cloud at dusk
  if (bloom) bloom.strength = 0.3 + 0.25 * dusk + 0.2 * (vfx.stageIdx >= 3 ? 1 : 0) + 0.15 * night;
  U.uFlash.value = vfx.flash || 0; hemi.intensity += (vfx.flash || 0) * 1.8;
  for (let i = 0; i < 8; i++) U.uGlow.value[i].copy(volcano.glow[i]);
  if (gradePass) {
    gradePass.uniforms.uTime.value = game.t; gradePass.uniforms.uAsh.value = ash; gradePass.uniforms.uHurt.value = player.stats.health < 30 ? (1 - player.stats.health / 30) * 0.6 : 0;
    const tints = [[1, 1, 1], [1, 0.99, 0.97], [0.96, 0.94, 0.93], [1.06, 0.93, 0.87], [1.1, 0.9, 0.84]][vfx.stageIdx];
    const tv = gradePass.uniforms.uTint.value; tv.x += (tints[0] - tv.x) * dt * 0.5; tv.y += (tints[1] - tv.y) * dt * 0.5; tv.z += (tints[2] - tv.z) * dt * 0.5;
    gradePass.uniforms.uAberr.value = clamp(gradePass.uniforms.uHurt.value * 1.2 + gradePass.uniforms.uHeat.value * 0.8 + volcano.shake * 1.5 + cam.kick, 0, 1.5);
    const nf = vfx.nearFront == null ? 1e9 : vfx.nearFront;
    gradePass.uniforms.uHeat.value = player.inBunker ? 0 : clamp(volcano.heatAt(player.x, player.z) * 1.2 + Math.max(0, 1 - nf / 45) + (vfx.stageIdx >= 3 ? Math.max(0, 1 - distToVolcano(player.x, player.z) / 150) * 0.7 : 0), 0, 1);
    sunNdc.copy(camera.position).addScaledVector(U.uSun.value, 200).project(camera);
    const onScreen = sunNdc.z < 1 && Math.abs(sunNdc.x) < 1.6 && Math.abs(sunNdc.y) < 1.6;
    gradePass.uniforms.uSun.value.set(sunNdc.x * 0.5 + 0.5, sunNdc.y * 0.5 + 0.5);
    gradePass.uniforms.uShaft.value = onScreen && !player.inBunker ? dayK * (1 - ash * 0.9) * clamp(1.6 - Math.max(Math.abs(sunNdc.x), Math.abs(sunNdc.y)), 0, 1) : 0;
    gradePass.uniforms.uAberr.value = clamp(gradePass.uniforms.uHurt.value * 1.2 + gradePass.uniforms.uHeat.value * 0.8 + volcano.shake * 1.5 + cam.kick, 0, 1.5);
  }
  sunSprite.position.copy(camera.position).addScaledVector(U.uSun.value, 1500);
  sunSprite.material.color.copy(U.uSunCol.value); sunSprite.material.opacity = (1 - ash * 0.85) * (player.inBunker ? 0 : 1) * smooth(-0.04, 0.06, sy);
  updateGulls(dt, vfx.stageIdx);
  // fireflies drift through the jungle at dusk; leaves come loose in the gusts
  const gh = heightAt(player.x, player.z), inJungle = gh > 2.5 && gh < 60 && !player.inBunker;
  const ffk = Math.max(dusk * dayK, night);
  if (inJungle && ffk > 0.35 && ash < 0.5 && Math.random() < dt * 10 * ffk) { const a = Math.random() * 6.3, r = 4 + Math.random() * 18, x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r; fx.fireflies.emit(x, heightAt(x, z) + 0.6 + Math.random() * 1.8, z, (Math.random() - 0.5) * 0.5, (Math.random() - 0.3) * 0.3, (Math.random() - 0.5) * 0.5, 0.16, 1.5 + Math.random() * 2.5, Math.random(), 1, 0, 1); }
  if (inJungle && U.uWind.value > 0.55 && Math.random() < dt * (U.uWind.value - 0.5) * 24) { const a = Math.random() * 6.3, r = 3 + Math.random() * 16, x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r; fx.leaves.emit(x, heightAt(x, z) + 5 + Math.random() * 6, z, 1.5 + Math.random() * 2, -0.4, (Math.random() - 0.5) * 1.5, 0.22 + Math.random() * 0.15, 4 + Math.random() * 3, Math.random(), 1, 0, 1); }
  fx.sparks.update(dt, 0.6, -0.6, 0.4);
  fx.dust.update(dt, 1.5, -0.3, 0.2); fx.spray.update(dt, 0.5, 5, 0); fx.fireflies.update(dt, 0.4, -0.05, 0.1); fx.leaves.update(dt, 0.3, 0.9, 1.2 * U.uWind.value);
  for (const sys of [fx.dust, fx.spray, fx.fireflies, fx.leaves, fx.sparks]) { sys.u.uScale.value = innerHeight * 1.1; sys.u.uLight.value = sys === fx.fireflies || sys === fx.sparks ? 1.6 : 0.4 + 0.6 * Math.max(0.1, U.uSun.value.y); }
  // campfire flicker
  for (const f of props.fires) {
    if (f.built && f.t > 0) { f.t -= dt; if (f.t <= 0) { toast('Your campfire has burnt out', 2); } }
    const lit = f.t > 0, fuel = f.camp ? 1 : clamp(f.t / 25, 0.3, 1);
    const k = (0.85 + Math.sin(game.t * 13 + f.x) * 0.1 + Math.sin(game.t * 29 + f.z) * 0.05) * fuel;
    f.flame.visible = lit;
    if (lit) { f.flame.scale.set((f.camp ? 1.1 : 1.0) * k, (f.camp ? 1.7 : 1.5) * k + Math.sin(game.t * 17 + f.x) * 0.2, 1); if (Math.random() < dt * 4 * fuel) fx.sparks.emit(f.x + (Math.random() - 0.5) * 0.4, heightAt(f.x, f.z) + 0.9, f.z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.5, 1.2 + Math.random() * 1.4, (Math.random() - 0.5) * 0.5, 0.12, 1 + Math.random(), Math.random(), 1, 0, 1); }
    if (f.light) { f.light.intensity = lit ? 14 * k : 0; if (!lit && f.built) { f.light.userData.used = false; f.light = null; } }
  }
  // the torch lights itself in the dark
  const torchOn = player.inv.count('torch') > 0 && isDark() && !player.inJeep && !player.inBoat && !player.inBunker && !player.inHeli && !player.onRaft && !player.swimming && !player.dead;
  torchModel.visible = torchOn;
  if (torchOn) { torchModel.userData.flame.getWorldPosition(_tp); torchLight.position.copy(_tp); const tk = 0.85 + Math.sin(game.t * 19) * 0.08 + Math.sin(game.t * 31) * 0.07; torchLight.intensity = 16 * tk; torchModel.userData.flame.scale.set(0.42 * tk, 0.6 * tk, 1); } else torchLight.intensity = 0;
  // sound levels
  const seaD = Math.max(0, heightAt(player.x, player.z));
  audio.update(dt, {
    waves: player.inBunker ? 0 : clamp(1 - seaD / 25, 0.08, 1) * (player.swimming || player.onRaft ? 1 : 0.8),
    wind: player.inBunker ? 0.1 : 0.25 + vfx.stageIdx * 0.18 + (player.y > 60 ? 0.3 : 0),
    rumble: player.inBunker ? vfx.rumble * 1.2 : vfx.rumble, heli: audio.vol.heli, crickets: player.inBunker ? 0 : night * (vfx.stageIdx < 3 ? 1 : 0.25) * (seaD > 1.5 ? 1 : 0.4), fire: clamp((() => { const f = litFireNear(player.x, player.z, 9); return f ? 0.45 * (1 - Math.hypot(f.x - player.x, f.z - player.z) / 9) : 0; })() + volcano.heatAt(player.x, player.z) * 1.5 + (vfx.stageIdx >= 3 ? 0.15 * (1 - clamp((distToVolcano(player.x, player.z) - 100) / 200, 0, 1)) : 0), 0, 1),
    birds: player.inBunker ? 0 : dayK * [0.9, 0.25, 0.03, 0, 0][vfx.stageIdx] * clamp(1 - seaD / 90, 0.3, 1) * (player.y > 2 ? 1 : 0.5), hurt: player.stats.health < 30 ? 1 - player.stats.health / 30 : 0, engine: player.inJeep ? jeep.rpm : player.inBoat ? boat.rpm * 0.8 : 0,
  });
  audio.vol.heli = 0;
}

// ---------------- HUD ----------------
const compassEl = $('compass');
function updateHUD(dt) {
  const s = player.stats;
  for (const k of ['health', 'stamina', 'hunger', 'thirst', 'air']) {
    const el = $(k).firstElementChild; const v = Math.round(s[k]) + '%'; if (domCache.get('bar' + k) !== v) { domCache.set('bar' + k, v); el.style.width = v; }
    const low = s[k] < 20; const st = $(k).parentElement; if (st.classList.contains('low') !== low) st.classList.toggle('low', low);
  }
  const left = Math.max(0, game.duration - game.t), m = Math.floor(left / 60), sec = Math.floor(left % 60);
  setText('clock', (game.progress >= 0.94 ? 'SURGE ' : 'SURGE IN ') + `${m}:${String(sec).padStart(2, '0')}`);
  $('clock').classList.toggle('urgent', left < 180);
  setText('stage', game.stage.name);
  const sb = $('stageBar').firstElementChild, sw = (game.progress * 100).toFixed(1) + '%'; if (domCache.get('sb') !== sw) { domCache.set('sb', sw); sb.style.width = sw; }
  const fol = npcs.followers(); const pup = dog.follow && !dog.dead && !dog.saved ? ' 🐕' : ''; setHTML('companions', fol.length || pup ? `👥 ${fol.map((n) => n.def.name.split(' ').pop()).join(', ')}${pup}` : '');
  setText('objective', objectiveText());
  setText('tod', `${dayNight.night > 0.5 ? '🌙' : dayNight.dusk > 0.5 ? '🌅' : '☀️'} Day ${dayNight.day} · ${String(Math.floor(dayNight.hour)).padStart(2, '0')}:${String(Math.floor((dayNight.hour % 1) * 60)).padStart(2, '0')}`);
  setHTML('speed', player.inJeep ? `${Math.round(Math.abs(jeep.speed) * 3.6)}<small>km/h</small>` : player.inBoat ? `${Math.round(Math.abs(boat.speed) * 1.94)}<small>knots</small>` : '');
  // compass
  const items = [];
  for (const [k, p] of Object.entries(POIS)) { if (k === 'cave') continue; items.push({ x: p.x, z: p.z, icon: p.icon, name: p.name }); }
  items.push({ x: VOLCANO.x, z: VOLCANO.z, icon: '🌋', name: 'Volcano' });
  if (game.flags.heliState === 'landed' || game.flags.heliState === 'coming') items.push({ x: props.heli.position.x, z: props.heli.position.z, icon: '🚁', name: 'Helicopter' });
  for (const n of npcs.list) if (!n.dead && !n.saved && n.state !== 'follow') items.push({ x: n.x, z: n.z, icon: '🧍', name: n.def.name.split(' ').pop() });
  for (const w of wantedMarkers()) items.push(w);
  let html = '';
  const width = compassEl.clientWidth || 400, fov = 1.9;
  const cardinal = [['N', 0], ['W', Math.PI / 2], ['S', Math.PI], ['E', -Math.PI / 2]];
  for (const [c, a] of cardinal) { let d = a - cam.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; if (Math.abs(d) < fov / 2) html += `<div class="m c" style="left:${(0.5 - d / fov) * width}px">${c}</div>`; }
  for (const it of items) {
    let d = Math.atan2(it.x - player.x, it.z - player.z) - cam.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) < fov / 2) { const dist = Math.hypot(it.x - player.x, it.z - player.z); html += `<div class="m" style="left:${(0.5 - d / fov) * width}px">${it.icon}<small>${dist < 1000 ? Math.round(dist) + 'm' : ''}</small></div>`; }
  }
  setHTML('compass', html);
  // overlays
  player.hurtFlash = Math.max(0, player.hurtFlash - dt * 2);
  const red = clamp(player.hurtFlash * 0.7 + (s.health < 30 ? (1 - s.health / 30) * (0.35 + 0.15 * Math.sin(game.t * 6)) : 0), 0, 1);
  const dmgCss = `inset 0 0 160px 40px rgba(220,20,20,${red.toFixed(2)})`; if (domCache.get('dmg') !== dmgCss) { domCache.set('dmg', dmgCss); $('damage').style.boxShadow = dmgCss; }
  const sheltered = player.inBunker || props.shelters.some((z) => Math.hypot(z.x - player.x, z.z - player.z) < z.r);
  const ashO = (sheltered ? 0.15 : 1) * volcano.ash * (player.inv.count('mask') ? 0.55 : 1) * (1 - s.air / 100 * 0.5);
  const ao = ashO.toFixed(2); if (domCache.get('ash') !== ao) { domCache.set('ash', ao); $('ashfx').style.opacity = ao; }
  const heat = volcano.heatAt(player.x, player.z) * 0.9 + (volcano.surgeR > 0 && distToVolcano(player.x, player.z) < volcano.surgeR + 60 && !player.inBunker ? 0.5 : 0);
  const ho = clamp(heat, 0, 1).toFixed(2); if (domCache.get('heat') !== ho) { domCache.set('heat', ho); $('heat').style.opacity = ho; }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('on'); }
  if (subsT > 0) { subsT -= dt; if (subsT <= 0) $('subs').classList.remove('on'); }
  renderInv();
  // interaction prompt
  const it = currentInteract;
  if (player.inJeep) { show('prompt'); setHTML('prompt', Math.abs(jeep.speed) < 4 ? (input.isTouch ? '' : '<b>E</b> ') + 'Get out of the jeep' : 'Slow down to get out'); }
  else if (player.inBoat) { show('prompt'); setHTML('prompt', Math.abs(boat.speed) < 3 ? (input.isTouch ? '' : '<b>E</b> ') + 'Climb out of the skiff' : 'Slow down to climb out'); }
  else if (it && !player.onRaft && !player.inBunker && !player.inHeli) {
    show('prompt');
    let html2 = (input.isTouch ? '' : '<b>E</b> ') + it.label;
    if (it.kind === 'chop' && player.chopTree) html2 += `<span class="hold"><i style="width:${((player.chopHits + player.chop / 0.7) / 3 * 100).toFixed(0)}%"></i></span>`;
    setHTML('prompt', html2);
  } else show('prompt', false);
}

// markers for the things survivors have asked for
function wantedMarkers() {
  const out = [];
  for (const n of npcs.list) {
    const w = n.def.want; if (!w || n.wantMet || !n.wantKnown || n.dead || n.saved) continue;
    if (w.item === 'dog') { if (!dog.follow && !dog.dead) out.push({ x: dog.x, z: dog.z, icon: '🐕', name: 'Biscuit' }); continue; }
    if (player.inv.count(w.item)) continue;
    const p = pickups.find((q) => q.id === w.item && !q.taken); if (p) out.push({ x: p.x, z: p.z, icon: ITEMS[w.item].icon, name: ITEMS[w.item].name });
  }
  return out;
}
// ---------------- the map screen ----------------
function drawMap() {
  const c = $('mapCanvas'), x = c.getContext('2d'), S = c.width, k = S / W;
  x.save(); x.translate(S, S); x.scale(-1, -1); x.drawImage(world.mapCanvas, 0, 0, S, S); x.restore();
  const px = (v) => (W / 2 - v) * k;
  // lava flows so far
  if (game.progress >= 0.72) { x.strokeStyle = '#ff5a10'; x.lineWidth = 6; x.lineCap = 'round'; for (const f of volcano.flows) { if (f.front <= 0) continue; x.beginPath(); let d = 0; for (let i = 0; i < f.pts.length && d <= f.front; i++) { if (i) d += Math.hypot(f.pts[i].x - f.pts[i - 1].x, f.pts[i].z - f.pts[i - 1].z); const p = f.pts[i]; if (i === 0) x.moveTo(px(p.x), px(p.z)); else x.lineTo(px(p.x), px(p.z)); } x.stroke(); } }
  if (volcano.surgeR > 0) { x.fillStyle = 'rgba(60,50,45,0.6)'; x.beginPath(); x.arc(px(VOLCANO.x), px(VOLCANO.z), volcano.surgeR * k, 0, 7); x.fill(); }
  x.font = '22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('🌋', px(VOLCANO.x), px(VOLCANO.z));
  x.font = '18px sans-serif';
  for (const [key, p] of Object.entries(POIS)) { if (key === 'cave') continue; x.fillText(p.icon, px(p.x), px(p.z)); x.font = 'bold 11px Barlow, sans-serif'; x.fillStyle = '#fff'; x.shadowColor = '#000'; x.shadowBlur = 4; x.fillText(p.name, px(p.x), px(p.z) + 16); x.shadowBlur = 0; x.font = '18px sans-serif'; }
  x.font = '16px sans-serif'; x.textAlign = 'center'; for (const w of wantedMarkers()) x.fillText(w.icon, px(w.x), px(w.z));
  for (const n of npcs.list) { if (n.dead || n.saved) continue; x.fillStyle = n.state === 'follow' ? '#38c9c0' : '#ffd23f'; x.beginPath(); x.arc(px(n.x), px(n.z), 5, 0, 7); x.fill(); }
  if (game.flags.heliState === 'landed' || game.flags.heliState === 'coming') x.fillText('🚁', px(props.heli.position.x), px(props.heli.position.z));
  // you
  x.save(); x.translate(px(player.x), px(player.z)); x.rotate(-cam.yaw); x.fillStyle = '#ff3b3b'; x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -12); x.lineTo(8, 9); x.lineTo(0, 5); x.lineTo(-8, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
  x.fillStyle = '#fff'; x.font = 'bold 14px Barlow, sans-serif'; x.textAlign = 'left'; x.shadowColor = '#000'; x.shadowBlur = 4;
  x.fillText(`${game.stage.name} · ${Math.floor(Math.max(0, game.duration - game.t) / 60)} min to the surge`, 12, 18);
  x.fillText('Yellow: survivors · Cyan: with you · Red arrow: you', 12, S - 14);
}

// ---------------- menus ----------------
let menu = null; // 'title' | 'pause' | 'help' | 'craft' | 'map' | 'end'
function openMenu(id) {
  if (menu && menu !== 'title') show(menu, false);
  menu = id; show(id); game.paused = id !== null;
  if (document.pointerLockElement) document.exitPointerLock();
  if (id === 'craft') renderCraft(); if (id === 'map') drawMap();
  input.enabled = id === null;
}
function closeMenu() { if (menu) show(menu, false); menu = null; game.paused = false; input.enabled = true; }
let helpFrom = 'title';
$('howto').onclick = () => { helpFrom = 'title'; show('help'); };
$('pauseHelp').onclick = () => { helpFrom = 'pause'; show('pause', false); show('help'); };
$('helpBack').onclick = () => { show('help', false); if (helpFrom === 'pause') show('pause'); };
$('resume').onclick = () => { audio.init(); closeMenu(); };
$('craftClose').onclick = () => closeMenu();
$('mapClose').onclick = () => closeMenu();
const toggleGfx = () => { quality = quality === 'high' ? 'low' : 'high'; store.set('ash-gfx', quality); toast('Graphics change fully after a reload', 3); applyQuality(); };
$('gfx').onclick = toggleGfx; $('gfx2').onclick = toggleGfx;
const toggleSnd = () => { soundOn = !soundOn; store.set('ash-snd', soundOn); audio.init(); audio.setOn(soundOn); for (const id of ['snd', 'snd2']) $(id).textContent = 'SOUND: ' + (soundOn ? 'ON' : 'OFF'); };
$('snd').onclick = toggleSnd; $('snd2').onclick = toggleSnd;
const toggleVox = () => { voicesOn = !voicesOn; store.set('ash-voice', voicesOn); voice.setOn(voicesOn); for (const id of ['vox', 'vox2']) $(id).textContent = 'VOICES: ' + (voicesOn ? 'ON' : 'OFF'); if (voicesOn) voice.say('Voices on. Everything spoken also appears as text.', 'Narrator', true); };
$('vox').onclick = toggleVox; $('vox2').onclick = toggleVox;
for (const id of ['vox', 'vox2']) $(id).textContent = 'VOICES: ' + (voicesOn ? 'ON' : 'OFF');
if (!voice.ok) for (const id of ['vox', 'vox2']) { $(id).textContent = 'VOICES: N/A'; $(id).disabled = true; }
for (const id of ['snd', 'snd2']) $(id).textContent = 'SOUND: ' + (soundOn ? 'ON' : 'OFF');
const diffs = Object.keys(DIFFICULTY);
$('diff').onclick = () => { difficulty = diffs[(diffs.indexOf(difficulty) + 1) % diffs.length]; store.set('ash-diff', difficulty); $('diff').textContent = 'PACE: ' + DIFFICULTY[difficulty].name.toUpperCase(); toast(DIFFICULTY[difficulty].desc, 3); };
$('diff').textContent = 'PACE: ' + DIFFICULTY[difficulty].name.toUpperCase();
$('fpsBtn').onclick = () => { showFps = !showFps; store.set('ash-fps', showFps); $('fps').style.display = showFps ? 'block' : 'none'; $('fpsBtn').textContent = 'FPS COUNTER: ' + (showFps ? 'ON' : 'OFF'); };
$('fpsBtn').textContent = 'FPS COUNTER: ' + (showFps ? 'ON' : 'OFF'); $('fps').style.display = showFps ? 'block' : 'none';
$('quit').onclick = () => { voice.stop(); save(); location.reload(); };
$('endAgain').onclick = () => { store.del(SAVE_KEY); location.reload(); };
$('endTitleBtn').onclick = () => { location.reload(); };
$('verTitle').textContent = 'v' + VERSION; $('verPause').textContent = 'v' + VERSION;
$('news').innerHTML = CHANGES.slice(0, 1).map(([v, l]) => `<b>What's new in ${v}</b><ul>${l.map((s) => `<li>${s}</li>`).join('')}</ul>`).join('');
const saved = store.get(SAVE_KEY, null);
if (saved && saved.v === 1) { show('continue'); $('play').textContent = '▶ NEW GAME'; }
$('play').onclick = () => { store.del(SAVE_KEY); startGame(null); };
$('continue').onclick = () => startGame(saved);
function startGame(data) {
  audio.init(); audio.setOn(soundOn);
  show('title', false); menu = null; input.enabled = true;
  game.duration = DIFFICULTY[difficulty].minutes * 60;
  if (data) { try { load(data); } catch (e) { console.error(e); } }
  else { game.intro = 7; banner('ASHBOUND', 'Day three on the island. The ferry left without you. The mountain has started to smoke.', 7); }
  game.started = true; game.running = true;
  show('hud'); updateRaftVisual();
  if (!input.isTouch) setTimeout(() => toast('Click the game to look around with the mouse', 4), data ? 500 : 7500);
}
function togglePause() { if (!game.started || game.over) return; if (menu === 'pause') closeMenu(); else if (!menu) { openMenu('pause'); $('statsBox').innerHTML = `${game.stage.name}: ${game.stage.desc}<br>Survivors with you: ${npcs.followers().length} · Saved so far: ${game.saved}`; save(); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) { voice.stop(); if (game.started && !game.over && !menu) togglePause(); } else voice.resume(); });
addEventListener('beforeunload', () => save());

// ---------------- main loop ----------------
let last = performance.now(), currentInteract = null, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  input.pollPad();
  if (input.pressed('pause')) { if (menu === 'pause' || !menu) togglePause(); else closeMenu(); }
  if (game.started && !game.over) {
    if (!menu) {
      if (input.pressed('craft')) openMenu('craft');
      else if (input.pressed('map')) openMenu('map');
      else if (input.pressed('inventory')) openMenu('craft');
    } else if (menu === 'craft' && (input.pressed('craft') || input.pressed('inventory'))) closeMenu();
    else if (menu === 'map' && input.pressed('map')) closeMenu();
    for (let i = 1; i <= 8; i++) if (!menu && input.pressed('slot' + i)) useSlot(i - 1);
  }
  if (game.started && !game.paused) {
    game.t += dt; game.progress = clamp(game.t / game.duration, 0, 1); game.stage = stageAt(game.progress);
    if (game.intro > 0) game.intro -= dt;
    currentInteract = (player.onRaft || player.inBunker || player.inHeli || player.inJeep || player.inBoat || game.intro > 0 || game.sleeping) ? null : nearestInteractable();
    // at a fire, a quick tap sleeps till dawn and a hold rests
    // (measured in game time, so a slow frame can't turn a tap into a hold)
    if (currentInteract && currentInteract.kind === 'rest') {
      if (input.pressed('interact')) { restTap = 1; restHeld = 0; }
      if (restTap) { if (input.down('interact')) restHeld += dt; else { if (restHeld < 0.3 && currentInteract.canSleep) trySleep(false); restTap = 0; } }
    } else restTap = 0;
    if (player.inJeep && input.pressed('interact') && !game.over && Math.abs(jeep.speed) < 4) exitJeep();
    else if (player.inBoat && input.pressed('interact') && !game.over && Math.abs(boat.speed) < 3) exitBoat();
    else if (currentInteract && !currentInteract.hold && currentInteract.kind !== 'none' && input.pressed('interact') && !game.over) doInteract(currentInteract);
    if (!game.sleeping) updatePlayer(dt);
    if (!player.inJeep) jeep.update({ dt, move: { x: 0, y: 0 }, brake: false, world, heatAt: (x, z) => volcano.heatAt(x, z), dark: false, fx: fx.dust });
    if (!player.inBoat) boat.update({ dt, move: { x: 0, y: 0 }, brake: false, world, fx: null });
    const vfx = volcano.update({ dt, progress: game.progress, duration: game.duration, playerPos: player, camera, sunHeight: Math.max(0.1, U.uSun.value.y) });
    npcs.update(dt, { player, heatAt: (x, z) => volcano.heatAt(x, z), surgeR: volcano.surgeR, volcano: VOLCANO, hiddenInBunker: player.inBunker, followIndex: (n) => npcs.followers().indexOf(n) });
    updateHeli(dt);
    // Biscuit: lost, following you, or back with Pete
    {
      const pete = npcs.byId('pete');
      const tgt = dog.follow === 'player' ? { x: player.x, z: player.z, riding: !!(player.inJeep || player.inBoat || player.onRaft || player.inHeli || player.inBunker) } : dog.follow === 'pete' ? { x: pete.x, z: pete.z, riding: !!(pete.riding || pete.saved) } : null;
      dog.update({ dt, world, heatAt: (x, z) => volcano.heatAt(x, z), onBark: (d) => audio.bark(d) }, tgt, player);
      if (dog.follow === 'pete' && pete.saved && !dog.dead) dog.saved = true;
      if (dog.follow === 'player' && !pete.dead && !pete.saved && !pete.wantMet && Math.hypot(dog.x - pete.x, dog.z - pete.z) < 5) { pete.wantMet = true; pete.wantKnown = true; dog.follow = 'pete'; pete.state = 'follow'; say(pete.def.name, pete.def.want.thanks, 7); audio.success(); }
      if (!dog.dead && !dog.saved && !dog.hidden && (volcano.heatAt(dog.x, dog.z) > 0.6 || (volcano.surgeR > 0 && distToVolcano(dog.x, dog.z) < volcano.surgeR))) killDog();
    }
    updateAtmosphere(dt, vfx);
    // the end of the world
    if (!game.over) {
      if (volcano.surgeR > 0 && !player.inBunker && !player.inHeli && distToVolcano(player.x, player.z) < volcano.surgeR) {
        if ((player.onRaft || player.inBoat) && heightAt(player.x, player.z) < -16) { /* far enough out: the surge dies over the water */ } else die('swallowed by the pyroclastic surge');
      }
      if (game.progress >= 1) { if (player.inBunker) win('bunker'); else if (player.onRaft) win('raft'); else if (player.inBoat) win('boat'); else die('swallowed by the pyroclastic surge'); }
    }
    cullT -= dt; if (cullT <= 0) { cullT = 0.5; cullPickups(); }
    if (game.t - game.lastSave > 25 && !game.over) save();
    updateHUD(dt);
  } else if (!game.started) {
    // the title screen: a slow drift over the island
    game.t += dt; U.uTime.value = game.t;
    const a = game.t * 0.04; camera.position.set(Math.cos(a) * 420, 120 + Math.sin(game.t * 0.1) * 10, 200 + Math.sin(a) * 300); camera.lookAt(VOLCANO.x, 60, VOLCANO.z);
    volcano.update({ dt, progress: 0.3, duration: 1440, playerPos: { x: 0, z: 300 }, camera, sunHeight: 0.8 });
    updateAtmosphere(dt, { ash: 0, plume: 0.3, stageIdx: 1, rumble: 0 });
  }
  if (game.started && !player.inHeli) updateCamera(dt);
  else if (game.started) camera.lookAt(props.heli.position);
  input.endFrame();
  if (showFps) { fpsT += dt; game.fpsN++; if (fpsT >= 0.5) { $('fps').textContent = Math.round(game.fpsN / fpsT) + ' FPS'; fpsT = 0; game.fpsN = 0; } }
  try { if (composer && quality === 'high') composer.render(); else renderer.render(scene, camera); }
  catch (e) { console.error(e); save(); show('crash'); throw e; }
}
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); save(); show('crash'); });
window.ASH = { dog: () => dog, trySleep, surfaceAt, game, player, volcano, npcs, props, world, cam, save, load, die, win, jeep, enterJeep, exitJeep, voice, boat, enterBoat, exitBoat, dayNight, addFire };
applyQuality();
$('loading').classList.add('hidden');
requestAnimationFrame(frame);
