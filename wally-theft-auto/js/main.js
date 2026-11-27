// Wally Theft Auto: game bootstrap, loop, camera, police, pickups, HUD and missions.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildCity, N, P, HALF, ROAD, LANE, ISLAND, KERB, roadC, blockMin, blockMax } from './city.js';
import { Car, TrafficAI, PoliceAI, randomType, DIRS, validDir, disposeObject, SHARED, mergeStatic } from './vehicles.js';
import { PedManager, Ped } from './peds.js';
import { Player } from './player.js';
import { Audio } from './audio.js';
import { MISSIONS, missionStartPoint } from './missions.js';
import { smokeTexture, rng, signTexture } from './textures.js';
import { VERSION, CHANGES } from './version.js';
import { WEAPONS, WEAPON_ORDER, usesAmmo, buildNeep, buildWeaponModel, buildProjectile, SHARED_WEAPON } from './weapons.js';
import { SHARED_HUMAN } from './humans.js';
const KEEP = { has: (x) => SHARED.has(x) || SHARED_WEAPON.has(x) || SHARED_HUMAN.has(x) || x === ringMat || PICKUP_SHARED.has(x) };
const dropObject = (o) => { scene.remove(o); disposeObject(o, KEEP); };
import { Weather, WEATHERS } from './weather.js';
import { buildUFO } from './ufo.js';
import { buildNessie } from './nessie.js';
import { Pad, runSetup } from './gamepad.js';
import { buildFlat, FLAT } from './flat.js';
import { initContent } from './content.js';
import { Voice, QUIPS, DJ, WEAPON_QUIPS, CHATS, CALLS } from './voice.js';
import { DJ_LINES } from './radio.js';
import { OUTFITS } from './player.js';

const $ = (id) => document.getElementById(id);
// per-frame HUD writes only touch the page when the value actually changes
const domCache = new Map();
const setText = (id, v) => { const k = id + ':t'; if (domCache.get(k) !== v) { domCache.set(k, v); $(id).textContent = v; } };
const setStyle = (el, key, prop, v) => { if (domCache.get(key) !== v) { domCache.set(key, v); el.style[prop] = v; } };
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

// ---------------- settings & save ----------------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
let quality = store.get('wta-gfx', 'high'); // v1.3: everyone starts on High (old 'wta-quality' choice is reset once)

// ---------------- renderer ----------------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = (matchMedia('(pointer: coarse)').matches ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap); // soft shadows cost a lot on phones
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2600);
scene.fog = new THREE.Fog('#c9d6e3', 120, 520);

// sky dome
const skyU = {
  top: { value: new THREE.Color('#3a6fc0') }, horizon: { value: new THREE.Color('#cfe0f0') }, bottom: { value: new THREE.Color('#2a4a60') },
  sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#fff2cc') }, night: { value: 0 }, time: { value: 0 }, cover: { value: 0.12 }, flash: { value: 0 }, rainbow: { value: 0 },
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top, horizon, bottom, sunCol, sunDir; uniform float night, time, cover, flash, rainbow; varying vec3 vP;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 5; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
    void main(){ vec3 d = normalize(vP); float h = d.y;
      vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, pow(-h, 0.4));
      float s = max(dot(d, normalize(sunDir)), 0.0);
      c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.35 * (1.0 - night));
      vec3 md = normalize(-sunDir); float m = max(dot(d, md), 0.0); c += vec3(0.85,0.9,1.0) * pow(m, 1400.0) * 3.0 * night;
      if (h > 0.0) { // drifting clouds, lit by the sun
        vec2 cp = d.xz / (d.y + 0.12) * 1.6 + vec2(time * 0.012, time * 0.004);
        float cl = smoothstep(0.52 - cover * 0.42, 0.78 - cover * 0.3, fbm(cp)) * smoothstep(0.0, 0.18, h);
        vec3 cc = mix(vec3(1.0, 0.98, 0.95), sunCol * 0.9 + 0.1, 0.35) * (1.0 - night * 0.85) + vec3(0.04, 0.05, 0.08) * night;
        c = mix(c, cc * (0.75 + 0.25 * fbm(cp * 2.0 + 3.0)) * (1.0 - cover * 0.5), cl * 0.92);
      }
      if (h > 0.0 && night > 0.0) { vec2 g = floor(d.xz / (d.y + 0.3) * 260.0); float st = step(0.9965, h21(g)); c += vec3(st) * night * smoothstep(0.0, 0.3, h); }
      // a rainbow, 42 degrees round from the point opposite the sun, after the rain clears
      if (rainbow > 0.01 && h > 0.0) {
        float ang = degrees(acos(clamp(dot(d, -normalize(sunDir)), -1.0, 1.0)));
        float t = (ang - 39.5) / 4.0;
        if (t > 0.0 && t < 1.0) {
          vec3 rb = clamp(abs(mod(t * 0.8 * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          c += rb * sin(t * 3.14159) * 0.38 * rainbow * smoothstep(0.0, 0.12, h) * (1.0 - night);
        }
      }
      // shooting stars: every few seconds one streaks across the night sky
      if (night > 0.3 && h > 0.05) {
        float slot = floor(time / 6.0), ph = fract(time / 6.0) * 6.0;
        if (ph < 0.9) {
          vec2 p = d.xz / (d.y + 0.3);
          vec2 a = (vec2(h21(vec2(slot, 1.3)), h21(vec2(slot, 7.1))) - 0.5) * 2.4;
          vec2 dir = normalize(vec2(h21(vec2(slot, 3.7)) - 0.5, h21(vec2(slot, 9.2)) - 0.5));
          vec2 head = a + dir * ph * 0.9, tail = head - dir * 0.35;
          vec2 pa = p - tail, ba = head - tail; float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          float dd = length(pa - ba * k);
          c += vec3(0.9, 0.95, 1.0) * smoothstep(0.012, 0.0, dd) * k * (1.0 - ph / 0.9) * night * 1.6;
        }
      }
      c += vec3(0.75, 0.8, 1.0) * flash;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sky.renderOrder = -1;
scene.add(sky);

const hemi = new THREE.HemisphereLight('#cfe3ff', '#5b5348', 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
sun.castShadow = true;
sun.shadow.camera.left = -75; sun.shadow.camera.right = 75; sun.shadow.camera.top = 75; sun.shadow.camera.bottom = -75;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 600;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const headlight = new THREE.SpotLight('#fff3d6', 0, 70, 0.55, 0.5, 1.2);
scene.add(headlight, headlight.target);
const flashLight = new THREE.PointLight('#ffaa55', 0, 40, 1.6);
scene.add(flashLight);

let composer = null, bloom = null, gradePass = null, basePR = 1, resScale = 1;
function applyQuality() {
  const hi = quality === 'high';
  basePR = Math.min(window.devicePixelRatio || 1, hi ? (isTouch ? 1.6 : 2) : 1.1);
  renderer.setPixelRatio(basePR * resScale);
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  if (hi && !composer) {
    // render into a multisampled target: the composer otherwise loses the canvas's anti-aliasing
    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 ? (isTouch ? 2 : 4) : 0 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.5, 0.88);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // gentle colour grade: a touch more contrast and colour, darker corners
    // colour grade + speed blur + chromatic fringe + film grain
    gradePass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uBlur: { value: 0 }, uTime: { value: 0 }, uFringe: { value: 0.0015 }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uSunVis: { value: 0 }, uSunCol: { value: new THREE.Color('#ffe2a8') }, uAspect: { value: 1.7 }, uHurt: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uBlur, uTime, uFringe, uSunVis, uAspect, uHurt; uniform vec2 uSun; uniform vec3 uSunCol; varying vec2 vUv;
        float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
        void main(){
          vec2 q = vUv - 0.5; float r2 = dot(q, q);
          // chromatic fringe grows toward the edges (and with speed)
          vec2 off = q * (uFringe + uBlur * 0.01) * (0.5 + r2 * 4.0);
          vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
          // radial speed blur: streaks out from the centre when you go fast
          if (uBlur > 0.01) {
            vec3 acc = c; float w = 1.0;
            for (int i = 1; i <= 6; i++) { float k = float(i) / 6.0 * uBlur * 0.06 * smoothstep(0.02, 0.25, r2); acc += texture2D(tDiffuse, vUv - q * k).rgb; w += 1.0; }
            c = acc / w;
          }
          // sun shafts: march toward the sun gathering bright sky, so light streams past the buildings
          if (uSunVis > 0.01) {
            vec2 dir = (uSun - vUv) / 14.0; vec2 p = vUv; float illum = 0.0, decay = 1.0;
            for (int i = 0; i < 14; i++) { p += dir; vec3 sp = texture2D(tDiffuse, clamp(p, 0.001, 0.999)).rgb; illum += max(0.0, dot(sp, vec3(0.3333)) - 0.8) * decay; decay *= 0.92; }
            c += uSunCol * illum * 0.45 * uSunVis;
            // lens flare: only when the sun itself is in view (not behind a building)
            float seen = smoothstep(0.72, 0.93, dot(texture2D(tDiffuse, clamp(uSun, 0.001, 0.999)).rgb, vec3(0.3333)));
            vec2 a = vec2(uAspect, 1.0), d = (vUv - uSun) * a; float dl = length(d);
            float fl = exp(-dl * 10.0) * 0.5 + exp(-dl * 3.0) * 0.1;
            fl += exp(-abs(d.y) * 160.0) * exp(-abs(d.x) * 3.0) * 0.25; // a horizontal streak
            vec2 axis = vec2(0.5) - uSun;
            float g1 = smoothstep(0.06, 0.03, length((vUv - (uSun + axis * 0.7)) * a));
            float g2 = smoothstep(0.035, 0.015, length((vUv - (uSun + axis * 1.25)) * a));
            float g3 = smoothstep(0.1, 0.07, length((vUv - (uSun + axis * 1.7)) * a)) - smoothstep(0.07, 0.04, length((vUv - (uSun + axis * 1.7)) * a));
            c += (uSunCol * fl + vec3(0.5, 0.8, 1.0) * g1 * 0.05 + vec3(1.0, 0.6, 0.3) * g2 * 0.07 + vec3(0.6, 1.0, 0.7) * g3 * 0.05) * seen * uSunVis;
          }
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(l), c, 1.12);
          c = (c - 0.5) * 1.06 + 0.5;
          c *= 1.0 - r2 * 0.55;
          // badly hurt: the colour drains and the edges throb red with your heartbeat
          if (uHurt > 0.01) { float lum = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(c, vec3(lum), uHurt * 0.6); c = mix(c, vec3(0.55, 0.02, 0.02), smoothstep(0.08, 0.32, r2) * uHurt * (0.45 + 0.35 * sin(uTime * 7.0))); }
          c += (rnd(vUv * 731.0) - 0.5) * 0.028; // fine film grain
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
    });
    composer.addPass(gradePass);
  }
  game.hiFx = hi;
  for (const id of ['gfx', 'gfx2']) $(id).textContent = 'GRAPHICS: ' + quality.toUpperCase();
  for (const id of ['vox', 'vox2']) if ($(id)) $(id).textContent = 'VOICES: ' + (voice.on ? 'ON' : 'OFF');
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
window.addEventListener('resize', resize);

// ---------------- world ----------------
const world = buildCity(scene, quality);
const weather = new Weather(scene, quality === 'high');
const flat = buildFlat(scene, world, world.addCollider);
const audio = new Audio();
const voice = new Voice();
voice.on = store.get('wta-vox', true);
const player = new Player(scene);
const peds = new PedManager(scene, world);
const cars = [];

// particles
const smokeTex = smokeTexture();
// Particles: every puff of smoke, spark and flame lives in one of two GPU point clouds (normal and
// additive), so hundreds of particles cost two draw calls instead of hundreds.
const PMAX = 600;
function makeCloud(additive) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(PMAX * 3), col = new Float32Array(PMAX * 3), size = new Float32Array(PMAX), alpha = new Float32Array(PMAX);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: smokeTex }, uScale: { value: 400 } }]),
    vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vCol; varying float vA;
      #include <fog_pars_vertex>
      void main(){ vCol = color; vA = alpha; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = alpha > 0.0 ? size * uScale / max(0.1, -mvPosition.z) : 0.0; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`.replace('void main(){', 'uniform float uScale; void main(){'),
    fragmentShader: `uniform sampler2D map; varying vec3 vCol; varying float vA;
      #include <fog_pars_fragment>
      void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vCol, t.a * vA);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 2; scene.add(pts);
  return { pts, geo, pos, col, size, alpha, items: new Array(PMAX).fill(null), next: 0, live: 0 };
}
const clouds = [makeCloud(false), makeCloud(true)];
const colorCache = new Map();
const colorOf = (c) => { let v = colorCache.get(c); if (!v) { v = new THREE.Color(c); colorCache.set(c, v); } return v; };
function puff(x, y, z, o = {}) {
  const cl = clouds[o.add ? 1 : 0];
  // find a free slot (ring search); if everything's busy, reuse the oldest
  let i = cl.next, tries = 0;
  while (cl.items[i] && tries < PMAX) { i = (i + 1) % PMAX; tries++; }
  cl.next = (i + 1) % PMAX;
  const p = cl.items[i] || (cl.items[i] = {});
  p.alive = true; p.t = 0; p.life = o.life || 1.5;
  p.x = x; p.y = y; p.z = z;
  p.vx = o.vx ?? (Math.random() - 0.5) * 0.8; p.vy = o.vy ?? 1.5; p.vz = o.vz ?? (Math.random() - 0.5) * 0.8;
  p.size0 = o.size || 1; p.grow = o.grow ?? 2; p.op = o.opacity ?? 0.7;
  const c = colorOf(o.color || '#888'); cl.col[i * 3] = c.r; cl.col[i * 3 + 1] = c.g; cl.col[i * 3 + 2] = c.b;
  cl.dirtyCol = true;
}
function updateParticles(dt) {
  const scale = renderer.domElement.height * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 0.5;
  for (const cl of clouds) {
    cl.pts.material.uniforms.uScale.value = scale;
    let live = 0;
    for (let i = 0; i < PMAX; i++) {
      const p = cl.items[i];
      if (!p || !p.alive) { if (cl.alpha[i] !== 0) cl.alpha[i] = 0; continue; }
      p.t += dt;
      if (p.t >= p.life) { p.alive = false; cl.items[i] = null; cl.alpha[i] = 0; continue; }
      const k = p.t / p.life;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      cl.pos[i * 3] = p.x; cl.pos[i * 3 + 1] = p.y; cl.pos[i * 3 + 2] = p.z;
      cl.size[i] = p.size0 * (1 + k * p.grow) * 2.2; // sprites were scaled by world size; points are diameters
      cl.alpha[i] = p.op * (1 - k);
      live++;
    }
    cl.live = live;
    cl.pts.visible = live > 0;
    if (live || cl.wasLive) {
      cl.geo.attributes.position.needsUpdate = true; cl.geo.attributes.size.needsUpdate = true; cl.geo.attributes.alpha.needsUpdate = true;
      if (cl.dirtyCol) { cl.geo.attributes.color.needsUpdate = true; cl.dirtyCol = false; }
    }
    cl.wasLive = live > 0;
  }
}
// skid marks: a ring buffer of dark rubber strips on the road, plus tyre smoke
const SKIDS = 900;
const skidMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.55).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#0a0a0a', transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), SKIDS);
skidMesh.count = 0; skidMesh.frustumCulled = false; skidMesh.renderOrder = 1; scene.add(skidMesh);
let skidI = 0;
const skidDummy = new THREE.Object3D();
function skidAt(x, z, heading, car) {
  if (car.speed > 7 && Math.random() < 0.55) puff(x, 0.25, z, { color: '#d9d9d6', life: 1.1 + Math.random() * 0.6, size: 0.5, grow: 3.2, vx: (Math.random() - 0.5) * 1.2, vy: 0.5, vz: (Math.random() - 0.5) * 1.2, opacity: 0.32 });
  const key = car.id + (x > car.x ? 'a' : 'b'), last = skidLast.get(key);
  if (last && Math.hypot(last[0] - x, last[1] - z) < 0.45) return; // lay a strip every half metre
  skidLast.set(key, [x, z]);
  skidDummy.position.set(x, world.groundHeight(x, z, 0.5) + 0.015, z); skidDummy.rotation.set(0, heading, 0); skidDummy.updateMatrix();
  skidMesh.setMatrixAt(skidI, skidDummy.matrix); skidI = (skidI + 1) % SKIDS; skidMesh.count = Math.max(skidMesh.count, skidI === 0 ? SKIDS : skidI);
  skidMesh.instanceMatrix.needsUpdate = true;
  if (Math.random() < 0.35 && Math.hypot(x - player.x, z - player.z) < 80) puff(x, 0.3, z, { color: '#d8d8d8', life: 1.2, size: 0.6, grow: 3, vy: 0.6, opacity: 0.35 });
}
const skidLast = new Map();

// tracers
const tracers = [];
function tracer(a, b, col = '#7fe8ff', life = 0.09) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 1 }));
  scene.add(l); tracers.push({ l, t: life, life });
}

// ---------------- game state ----------------
const cam = { yaw: Math.PI, pitch: -0.18, dist: 4.6, far: false, lastLook: 0, shake: 0 };
const game = {
  world, player, peds, cars, audio, cam, night: 0, time: 10 * 60, // minutes since midnight
  stats: { kills: 0, cars: 0, flights: 0, specs: 0, busted: 0, wasted: 0 },
  wanted: null, alarm: null, alarmT: 0, mission: null, missionIdx: 0, markers: [], blips: [], specs: [], pickups: [],
  playing: false, paused: false,
};

game.onSkid = skidAt;

// ----- wanted level -----
game.wanted = {
  heat: 0, level: 0, unseen: 0, seen: false,
  add(h) { const was = this.level; this.heat = Math.min(30, this.heat + h); this.recalc(); this.unseen = 0; if (was === 0 && this.level > 0) game.quip('wanted', 0.7); else if (was < 4 && this.level >= 4) game.quip('wantedHigh', 1); },
  recalc() { const t = [1, 3, 6, 10, 15]; let l = 0; for (const x of t) if (this.heat >= x) l++; this.level = l; },
  clear() { this.heat = 0; this.level = 0; },
  update(dt) {
    if (this.level === 0) return;
    // seen by any cop?
    const px = player.x, pz = player.z;
    this.seen = false;
    for (const c of cars) if (c.type === 'police' && c.ai && !c.dead && Math.hypot(c.x - px, c.z - pz) < 55 && !world.blocked(c.x, c.z, px, pz, 1.2)) { this.seen = true; break; }
    if (!this.seen) for (const p of peds.list) if (p.cop && p.state !== 'dead' && Math.hypot(p.x - px, p.z - pz) < 40) { this.seen = true; break; }
    if (this.seen) this.unseen = 0; else this.unseen += dt;
    if (this.unseen > 9) { this.heat = Math.max(0, this.heat - dt * 1.2); this.recalc(); if (this.level === 0 && !player.dead) game.quip('lostCops', 0.9, true); }
  },
};

// ---------------- helpers used by other modules ----------------
game.toast = (txt) => { const t = $('toast'); t.textContent = txt; t.style.opacity = 1; clearTimeout(game._toastT); game._toastT = setTimeout(() => (t.style.opacity = 0), 3800); };
game.bigText = (h, p = '', dur = 2.5, bad = false) => {
  const b = $('big'); b.querySelector('h1').textContent = h; b.querySelector('h1').className = bad ? 'bad' : ''; b.querySelector('p').textContent = p;
  b.style.opacity = 1; clearTimeout(game._bigT); game._bigT = setTimeout(() => (b.style.opacity = 0), dur * 1000);
};
const fmtObj = (s) => s.replace(/~([yrbw])~/g, (m, c) => c === 'w' ? '</span><span>' : `</span><span class="${c}">`);
game.objective = (txt) => { if (game._obj === txt) return; game._obj = txt; $('objective').innerHTML = txt ? '<span>' + fmtObj(txt) + '</span>' : ''; };
game.timer = (t) => { const e = $('timer'); if (t == null) { e.classList.add('hidden'); return; } e.classList.remove('hidden'); const s = Math.max(0, Math.ceil(t)); e.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; e.style.color = s < 10 ? '#ff5a5a' : '#fff'; };
let subsQ = [], subsT = 0;
game.subs = (lines) => { subsQ = lines.slice(); subsT = 0; };
const bubbles = [];
game.say = (ped, text) => {
  if (bubbles.length > 3) return;
  const el = document.createElement('div'); el.className = 'bubble'; el.textContent = text; $('bubbles').appendChild(el);
  bubbles.push({ el, ped, t: 3.2 });
  if (ped && Math.hypot(ped.x - player.x, ped.z - player.z) < 22 && !game.inside) voice.say(text, ped.cop ? 'COP' : { female: ped.female, pitch: ped.vpitch || 1, rate: 1.05 + Math.random() * 0.15 });
};
game.addSign = (text, bg, fg, x, z, ry = Math.PI) => {
  const tex = signTexture(text, bg, fg);
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
  board.position.y = 3.2; g.add(board);
  for (const sx of [-2.2, 2.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 10), new THREE.MeshStandardMaterial({ color: '#3b3f44', metalness: 0.6, roughness: 0.4 })); p.position.set(sx, 1.6 + KERB, 0); p.castShadow = true; g.add(p); }
  g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); return g;
};
game.removeCar = (c) => removeCar(c);
// the Wee Trike goes over on its side
const TIP_LINES = ["Ach! Three wheels was always one short!", "Whit a plonker... I mean, whit a corner!", "This is why the shop had it on special offer!", "I'm fine! The motor's fine! Neither of us is fine!", "Nobody saw that. Nessie, ye didnae see that."];
game.onTip = (car) => {
  const d = Math.hypot(car.x - player.x, car.z - player.z);
  if (d < 50) { audio.crash(8 * (1 - d / 50)); audio.tone(260, 0.25, 'triangle', 0.15, -120); }
  if (car === player.car) { cam.shake = Math.max(cam.shake, 0.3); game.quip(TIP_LINES, 1, true); }
};
// lamp posts: a metallic clang and sparks when one gets snapped, a crash when it lands
world.onLampKnock = (x, z, sp) => {
  const d = Math.hypot(x - player.x, z - player.z);
  if (d < 70) { audio.tone(620, 0.5, 'triangle', 0.25 * (1 - d / 70), -300); audio.tone(1240, 0.35, 'sine', 0.12 * (1 - d / 70)); }
  for (let k = 0; k < 10; k++) puff(x, 0.6, z, { color: '#ffd27a', add: true, life: 0.35, size: 0.12, grow: 0.5, vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 6, opacity: 1 });
  if (sp > 6) game.wanted.add(0.2);
};
world.onLampLand = (x, z) => { const d = Math.hypot(x - player.x, z - player.z); if (d < 70) audio.crash(4 * (1 - d / 70)); cam.shake = Math.max(cam.shake, d < 20 ? 0.15 : 0); };
// drivers lean on the horn and shout out the window
const ROAD_RAGE = {
  blocked: ['Get oot the road, ya numpty!', 'Shift, Wally!', 'Are ye blind? MOVE!', 'Some of us have jobs, cape boy!', 'It\'s a ROAD, no a catwalk!', 'Gonnae no stand there?', 'Green means GO, Wally!', 'I\'m late for ma work and you\'re standing there in yer jammies!', 'Is that a superhero or a traffic cone?', 'Beep beep, ya walloper!', 'I\'ve got frozen peas in the boot here!'],
  crash: ['Ma motor! Ma no-claims!', 'Whit are ye playin\' at?!', 'Learn tae drive, ya bampot!', 'That\'s comin\' oot yer pocket!', 'Did ye get yer licence aff a cereal box?', 'I\'ve still got eleven payments left on that!', 'Ma wife\'s gonnae kill me! Then you!', 'That\'s a hire car, ya eejit!', 'Ye drive like ma granny! And she\'s deid!', 'Ma dashcam got all that, pal!'],
};
let quipCool = 0, idleQuipT = 40 + Math.random() * 30;
// ---- extra chatter: speeding, day and night, folk blethering, phone calls ----
let carPatterT = 50, fastT = 0, chatT = 20 + Math.random() * 20, callT = 150 + Math.random() * 90, lastHour = -1, chatQ = [];
function updateChatter(dt) {
  if (game.intro || player.dead || game.inside) return;
  const c = player.car;
  // flat out in a motor
  if (c && Math.abs(c.vf || c.speed) > 30) { fastT += dt; if (fastT > 4) { fastT = -25; game.quip('fast', 0.6); } } else fastT = Math.min(fastT, 0) + dt * 0.2;
  // a bit of patter at the wheel
  if (c && !game.mission) { carPatterT -= dt; if (carPatterT <= 0) { carPatterT = 70 + Math.random() * 60; game.quip('driving', 0.8); } }
  // the sun comes up, the street lamps come on
  const hr = Math.floor(game.time / 60);
  if (lastHour >= 0 && hr !== lastHour) { if (hr === 21) game.quip('night', 0.8); if (hr === 7) game.quip('morning', 0.8); }
  lastHour = hr;
  // two folk on the pavement having a blether as Wally walks by
  if (chatQ.length) { chatQ[0].t -= dt; if (chatQ[0].t <= 0) { const q = chatQ.shift(); if (q.p.state !== 'dead' && q.p.state !== 'flee') game.say(q.p, q.line); } }
  else if (!c && !game.mission && (chatT -= dt) <= 0) {
    chatT = 30 + Math.random() * 30;
    const near = peds.list.filter((p) => !p.cop && !p.thug && p.state === 'walk' && Math.hypot(p.x - player.x, p.z - player.z) < 16);
    for (const a of near) {
      const b = near.find((q) => q !== a && Math.hypot(q.x - a.x, q.z - a.z) < 7);
      if (!b) continue;
      const lines = CHATS[(Math.random() * CHATS.length) | 0];
      lines.forEach((line, i) => chatQ.push({ p: i % 2 ? b : a, line, t: i ? 3.2 : 0 }));
      break;
    }
  }
  // the phone rings: somebody wants a word
  if (!game.mission && !game.cuffs && !subsQ.length && game.wanted.level === 0 && (callT -= dt) <= 0) {
    callT = 200 + Math.random() * 160;
    const call = CALLS[(Math.random() * CALLS.length) | 0];
    [0, 0.45].forEach((w) => { audio.tone(1300, 0.35, 'square', 0.06, 0, w); audio.tone(1500, 0.35, 'square', 0.05, 0, w); });
    game.toast('📱 Wally\'s phone is ringing...');
    setTimeout(() => { if (!game.mission) game.subs(call); }, 1400);
  }
}
game.quip = (cat, chance = 1, prio = false) => {
  const list = Array.isArray(cat) ? cat : QUIPS[cat]; if (!list || Math.random() > chance) return;
  if (!prio && (performance.now() < quipCool || subsQ.length)) return;
  quipCool = performance.now() + 6000;
  const line = list[(Math.random() * list.length) | 0];
  $('subs').textContent = 'WALLY MAN: ' + line; subsT = Math.max(3, line.length * 0.07);
  voice.say(line, 'WALLY', prio);
};
// someone's been run over: thud, yelp, a cry (if they're not out cold) and a horrified witness
const RUN_OVER = ['Ma bunions!', 'Aaaargh!', 'Ma good leg!', 'Watch where yer goin\'!', 'Ooyah!', 'Ya bampot!', 'Ma messages!', 'Nae again!', 'I\'ve only just been discharged!', 'Ma hip!', 'Ma pie! Ye\'ve squashed ma pie!', 'I saw ma life flash before ma eyes! It was boring!', 'That\'s a hundred quid ye owe me!', 'Ah\'m fine! Ah\'m fine! Ah\'m no\' fine!'];
const WITNESS = ['He\'s run that wifie ower!', 'Did ye see that?!', 'Somebody phone an ambulance!', 'Wally! Ya maniac!', 'That\'s no\' very superhero!', 'I\'m writing tae the council aboot this!', 'Ten points! Naw, wait, that\'s terrible!', 'That\'s the third one the day!'];
let witnessCool = 0;
function runOverSounds(p, sp, car) {
  const d = Math.hypot(p.x - player.x, p.z - player.z), near = Math.max(0, 1 - d / 70);
  if (near <= 0) return;
  audio.thud(sp, near);
  const pitch = p.cop ? 0.75 : (p.female ? 1.35 : 0.95) * (0.9 + Math.random() * 0.2);
  audio.yelp(pitch, near);
  if (d < 30 && p.health > 0) game.say(p, RUN_OVER[(Math.random() * RUN_OVER.length) | 0]);
  p.thudLand = true; // they'll bump when they hit the ground
  if (car === player.car) game.quip('runover', 0.2);
  if (car === player.car && performance.now() > witnessCool) {
    const w = peds.list.find((q) => q !== p && q.state !== 'dead' && !q.cop && Math.hypot(q.x - p.x, q.z - p.z) < 18);
    if (w) { witnessCool = performance.now() + 9000; setTimeout(() => game.say(w, WITNESS[(Math.random() * WITNESS.length) | 0]), 700); }
  }
}
game.onPedLand = (p, hard) => { const d = Math.hypot(p.x - player.x, p.z - player.z); if (d < 50) audio.bump((hard ? 1 : 0.6) * (1 - d / 50)); };
game.sayCar = (car, text) => {
  if (bubbles.length > 4 || bubbles.some((b) => b.ped === car)) return;
  const el = document.createElement('div'); el.className = 'bubble'; el.textContent = text; $('bubbles').appendChild(el);
  bubbles.push({ el, ped: car, t: 3, off: -0.4 });
  if (Math.hypot(car.x - player.x, car.z - player.z) < 28) voice.say(text, 'DRIVER');
};
game.onHonk = (car, why) => {
  const d = Math.hypot(car.x - player.x, car.z - player.z);
  audio.hornAt(Math.max(0, 1 - d / 60), car.type === 'van' || car.type === 'icecream' ? 0.8 : (car.type === 'sports' ? 1.2 : 1));
  if (d < 35) game.sayCar(car, ROAD_RAGE[why][(Math.random() * ROAD_RAGE[why].length) | 0]);
};
// after a bump, sometimes the driver climbs out to argue (and leaves their car up for grabs)
function roadRage(car) {
  if (car.driver !== 'ai' || car.angryT > 0) return;
  car.angryT = 6; game.onHonk(car, 'crash');
  if (Math.random() < 0.45) setTimeout(() => {
    if (car.dead || car.driver !== 'ai') return;
    car.ai = null; car.driver = null; car.parked = true; car.input = { throttle: 0, steer: 0, hand: true };
    car.doorOpen = 1; setTimeout(() => { car.doorOpen = 0; }, 900);
    const [dx, dz] = car.doorPos();
    const p = game.spawnPed(dx, dz, {}); p.state = 'argue'; p.argueT = 14;
  }, 900);
}
game.spawnCar = (type, x, z, heading, o = {}) => { const c = new Car(scene, type, o.paint, x, z, heading); cars.push(c); return c; };
game.spawnPed = (x, z, o = {}) => { const p = new Ped(scene, x, z, o); peds.list.push(p); return p; };

// markers
const markerTex = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
  x.fillStyle = g; x.fillRect(0, 0, 4, 64); const t = new THREE.CanvasTexture(c); return t;
})();
const MCOL = { mission: '#ffd23f', dest: '#ffd23f', check: '#ff4fb8', ghost: '#ff4fb8', pickup: '#5fe36a' };
game.marker = (x, z, type = 'dest', r = 3, y = null) => {
  const g = new THREE.Group();
  const col = MCOL[type] || '#fff';
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 2.2, 40, 1, true), new THREE.MeshBasicMaterial({ color: col, map: markerTex, transparent: true, opacity: type === 'ghost' ? 0.2 : 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  cyl.position.y = 1.1; g.add(cyl);
  if (type !== 'ghost') {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 4), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 }));
    arrow.rotation.x = Math.PI; arrow.position.y = 5; g.add(arrow); g.userData.arrow = arrow;
  }
  const gy = y != null ? y : world.groundHeight(x, z, 0.5);
  g.position.set(x, gy, z);
  scene.add(g);
  const m = { x, z, y: gy, r, type, obj: g };
  game.markers.push(m);
  return m;
};
game.inMarker = (m, x, z) => m && Math.hypot(m.x - x, m.z - z) < m.r;
game.removeMarker = (m) => { if (!m) return; scene.remove(m.obj); game.markers = game.markers.filter((q) => q !== m); };
const keepMarker = (m) => m.type === 'mission' || m.persistent;
game.clearMarkers = () => { for (const m of game.markers) if (!keepMarker(m)) scene.remove(m.obj); game.markers = game.markers.filter(keepMarker); };
game.blip = (obj, kind, only) => { if (only && game.blips.some((b) => b.obj === obj)) return; game.blips.push({ obj, kind }); };
game.clearBlips = () => { game.blips = []; };

// ---------------- traffic ----------------
const maxTraffic = () => (quality === 'high' ? 22 : 13);
function spawnTraffic(type) {
  const px = player.x, pz = player.z;
  for (let tries = 0; tries < 10; tries++) {
    const i = Math.floor(Math.random() * (N + 1)), j = Math.floor(Math.random() * (N + 1));
    const [nx, nz] = [roadC(i), roadC(j)];
    const d = Math.hypot(nx - px, nz - pz);
    if (d < 95 || d > 175) continue;
    const dirs = DIRS.filter((q) => validDir(i, j, q));
    const dd = dirs[(Math.random() * dirs.length) | 0];
    const ai = type === 'police' ? null : null;
    const t = type || randomType();
    const tmpAI = new TrafficAI({ x: 0, z: 0 }, i, j, dd);
    const [sx, sz] = tmpAI.path[0];
    if (cars.some((c) => Math.hypot(c.x - sx, c.z - sz) < 8)) continue;
    const car = game.spawnCar(t, sx, sz, Math.atan2(dd[0], dd[1]));
    car.ai = t === 'police' ? new PoliceAI(car, i, j, dd) : new TrafficAI(car, i, j, dd);
    car.driver = t === 'police' ? 'cop' : 'ai';
    car.vx = dd[0] * 8; car.vz = dd[1] * 8;
    return car;
  }
  return null;
}
function spawnParked() {
  const px = player.x, pz = player.z;
  for (let tries = 0; tries < 8; tries++) {
    const bx = Math.floor(Math.random() * N), bz = Math.floor(Math.random() * N);
    const b = world.blocks[bx * N + bz];
    const side = (Math.random() * 4) | 0;
    const t = 0.2 + Math.random() * 0.6;
    let x, z, h;
    const off = 1.4;
    if (side === 0) { x = b.x0 + (b.x1 - b.x0) * t; z = b.z0 - off - 0.2; h = -Math.PI / 2; }       // north kerb, traffic heading -X on the left
    else if (side === 1) { x = b.x0 + (b.x1 - b.x0) * t; z = b.z1 + off + 0.2; h = Math.PI / 2; }
    else if (side === 2) { x = b.x0 - off - 0.2; z = b.z0 + (b.z1 - b.z0) * t; h = 0; }
    else { x = b.x1 + off + 0.2; z = b.z0 + (b.z1 - b.z0) * t; h = Math.PI; }
    const d = Math.hypot(x - px, z - pz);
    if (d < 45 || d > 150) continue;
    if (cars.some((c) => Math.hypot(c.x - x, c.z - z) < 7)) continue;
    const r = Math.random();
    const type = r < 0.15 ? 'sports' : (r < 0.3 ? 'van' : (r < 0.6 ? 'hatch' : 'saloon'));
    const c = game.spawnCar(type, x, z, h); c.parked = true; return c;
  }
}
function spawnPolice() {
  const c = spawnTraffic('police');
  if (c) c.sirenOn = true;
  return c;
}
function removeCar(c) { c.remove(); const i = cars.indexOf(c); if (i >= 0) cars.splice(i, 1); }

// ---------------- collectibles & pickups ----------------
function buildSpecsMesh() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 1, roughness: 0.2, emissive: '#aa7700', emissiveIntensity: 0.5 });
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 24), gold); r.position.x = s * 0.28; g.add(r); }
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), gold); g.add(br);
  return g;
}
const PICK = {
  crate: { col: '#c9a23a', icon: '📦' }, health: { col: '#ff4040', icon: '❤' }, armour: { col: '#4aa3ff', icon: '🛡' }, cash: { col: '#5fe36a', icon: '$' }, ammo: { col: '#58e0ff', icon: '⚡' },
};
const ringMat = new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb300', emissiveIntensity: 1.4, roughness: 0.3 });
const pickupModels = {}, PICKUP_SHARED = new Set();
// collapse a nested weapon model into one level of meshes, then merge them per material
function flattenModel(src) {
  const g = new THREE.Group(); g.userData = src.userData; src.updateMatrixWorld(true);
  src.traverse((m) => { if (m.isMesh) { const c = new THREE.Mesh(m.geometry, m.material); c.applyMatrix4(m.matrixWorld); g.add(c); } });
  g.position.copy(src.position); g.rotation.copy(src.rotation); g.scale.copy(src.scale);
  mergeStatic(g, { has: () => true });
  return g;
}
function makePickupMesh(kind, weapon) {
  const g = new THREE.Group();
  if (kind === 'weapon') {
    if (!pickupModels[weapon]) {
      const t = flattenModel(buildWeaponModel(weapon));
      t.traverse((o) => { if (o.isMesh) { o.castShadow = false; PICKUP_SHARED.add(o.geometry); const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const mm of ms) { PICKUP_SHARED.add(mm); if (mm.map) PICKUP_SHARED.add(mm.map); } } });
      pickupModels[weapon] = t;
    }
    const w = pickupModels[weapon].clone();
    if (weapon === 'club') { w.scale.setScalar(1.1); w.rotation.z = 1.1; w.position.set(-0.35, -0.35, 0); }
    else if (weapon === 'neep') w.scale.setScalar(3.2);
    else { w.scale.multiplyScalar(3.2); w.position.z = -0.3; }
    g.add(w);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 40), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.75; g.add(ring); g.userData.ring = ring;
    return g;
  }
  const m = new THREE.MeshStandardMaterial({ color: PICK[kind].col, emissive: PICK[kind].col, emissiveIntensity: 0.6, roughness: 0.3 });
  let mesh;
  if (kind === 'health') { mesh = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.22), m), b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), m); mesh.add(a, b); }
  else if (kind === 'armour') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.1, 6), m), mesh.rotation.x = Math.PI / 2;
  else if (kind === 'cash') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.32), m);
  else if (kind === 'crate') {
    mesh = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: '#8a6a32', roughness: 0.8 }), band = new THREE.MeshStandardMaterial({ color: '#3a3f2a', roughness: 0.6, metalness: 0.4 });
    mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.45), wood));
    for (const dx of [-0.25, 0.25]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.47, 0.47), band); b.position.x = dx; mesh.add(b); }
    const lbl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.47), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb300', emissiveIntensity: 0.5 })); mesh.add(lbl);
  }
  else mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14), m);
  g.add(mesh);
  return g;
}
function addPickup(kind, x, z, o = {}) {
  const g = makePickupMesh(kind, o.weapon); const y = (o.y ?? world.groundHeight(x, z, 1)) + 0.9;
  g.position.set(x, y, z); scene.add(g);
  const p = { kind, weapon: o.weapon, x, y, z, obj: g, amount: o.amount, respawn: o.respawn, home: [x, z], t: Math.random() * 6, gone: 0 };
  game.pickups.push(p); return p;
}

function setupCollectibles(save) {
  const r = rng(424242);
  const spots = world.specSpots.slice();
  // shuffle deterministic
  for (let i = spots.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const chosen = spots.slice(0, 20);
  chosen.forEach((s, i) => {
    if (save.specs && save.specs.includes(i)) return;
    const m = flattenModel(buildSpecsMesh()); const y = (s[2] != null ? s[2] : KERB) + 1.1;
    m.position.set(s[0], y, s[1]); scene.add(m);
    game.specs.push({ id: i, x: s[0], y, z: s[1], obj: m });
  });
  // pickups: parks and around town
  world.pickupsSpots.forEach(([x, z], i) => addPickup(['health', 'armour', 'cash', 'ammo'][i % 4], x + 6, z + 6, { respawn: 60 }));
  const h = world.specials.home, hos = world.specials.hospital, pol = world.specials.police;
  addPickup('health', h.x + 6, h.z, { respawn: 45 });
  addPickup('armour', pol.x - 10, pol.z, { respawn: 90 });
  addPickup('health', hos.x - 6, hos.z, { respawn: 30 });
  addPickup('ammo', h.x - 8, h.z, { respawn: 45 });
  alleyPool = [];
  scatterWeapons(260);
  scatterCrates(90);
}
// ammo crates: top up every gun you own
function scatterCrates(n) {
  for (let k = 0; k < n; k++) { const s = takeAlleySpot() || paveSpot(); if (!s) break; addPickup('crate', s[0], s[1], { respawn: 75 }); }
}
// weapons dropped at random spots on the pavements, different every time you play
function scatterWeapons(n) {
  const kinds = WEAPON_ORDER.filter((w) => w !== 'fists').concat(['blaster', 'revolver', 'smg', 'scatter']);
  for (let k = 0; k < n; k++) {
    const s = takeAlleySpot() || paveSpot(); if (!s) break;
    addPickup('weapon', s[0], s[1], { weapon: kinds[(Math.random() * kinds.length) | 0], respawn: 90 });
  }
}
// once the alleys are full, extras go on quiet bits of pavement
function paveSpot() {
  for (let tries = 0; tries < 30; tries++) {
    const b = world.blocks[(Math.random() * world.blocks.length) | 0], L = world.paveLoop(b), t = 0.15 + Math.random() * 0.7, side = (Math.random() * 4) | 0;
    const x = side < 2 ? L.x0 + (L.x1 - L.x0) * t : (side === 2 ? L.x0 : L.x1), z = side >= 2 ? L.z0 + (L.z1 - L.z0) * t : (side === 0 ? L.z0 : L.z1);
    if (!game.pickups.some((p) => Math.hypot(p.x - x, p.z - z) < 7)) return [x, z];
  }
  return null;
}
// pickups hide up the alleyways between buildings: a random alley each, never two together
let alleyPool = [];
function takeAlleySpot() {
  if (!alleyPool.length) {
    alleyPool = world.alleySpots.slice();
    for (let i = alleyPool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [alleyPool[i], alleyPool[j]] = [alleyPool[j], alleyPool[i]]; }
  }
  while (alleyPool.length) {
    const [x, z, along] = alleyPool.pop();
    // nudge along the alley so they're not always dead centre
    const off = (Math.random() - 0.5) * 6;
    const px = along === 'x' ? x + off : x, pz = along === 'z' ? z + off : z;
    if (world.collide(px, pz, 0.5, 0).hit) continue;
    if (game.pickups.some((p) => Math.hypot(p.x - px, p.z - pz) < 6)) continue;
    return [px, pz];
  }
  return null;
}

// ---------------- combat ----------------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - cc;
  if (disc < 0) return -1; const t = -b - Math.sqrt(disc); return t;
}
// fire a ranged weapon (W from weapons.js): one ray per pellet with a little spread
game.playerShoot = (W = WEAPONS.blaster) => {
  audio.fire(W.id);
  if (W.pellets > 1 || W.kick) cam.shake = Math.max(cam.shake, W.kick || 0.12);
  pad.rumble(W.pellets > 1 ? 0.7 : (W.kick ? 0.45 : 0.15), 0.3, W.pellets > 1 ? 140 : 60);
  const origin = camera.position.clone();
  const aim = new THREE.Vector3(); camera.getWorldDirection(aim);
  const minT = origin.distanceTo(tmpV.set(player.x, player.y + 1.4, player.z)) + 0.5;
  const model = player.models[player.weapon] || player.blaster;
  const muzzle = model.localToWorld((model.userData.muzzle || player.blaster.userData.muzzle).clone());
  puff(muzzle.x, muzzle.y, muzzle.z, { color: W.pellets > 1 ? '#ffd27a' : '#9ff', add: true, life: 0.12, size: W.pellets > 1 ? 0.7 : 0.4, grow: 1, vy: 0, opacity: 1 });
  if (!W.soak && !W.beam) puff(muzzle.x, muzzle.y + 0.05, muzzle.z, { color: '#b8b8b8', life: 0.9, size: W.pellets > 1 ? 0.35 : 0.18, grow: 2.5, vx: (Math.random() - 0.5) * 0.4, vy: 0.6, vz: (Math.random() - 0.5) * 0.4, opacity: 0.35 });
  if (CASINGS[W.id]) ejectCasing(muzzle, CASINGS[W.id]);
  flashLight.position.copy(muzzle); flashLight.color.set(W.tracer || '#ffcc88'); flashLight.intensity = Math.max(flashLight.intensity, W.pellets > 1 ? 60 : 30);
  game.raiseAlarm(player.x, player.z, 1.5);
  for (let k = 0; k < W.pellets; k++) {
    const dir = aim.clone();
    if (W.spread) { dir.x += (Math.random() - 0.5) * W.spread * 2; dir.y += (Math.random() - 0.5) * W.spread * 2; dir.z += (Math.random() - 0.5) * W.spread * 2; dir.normalize(); }
    let best = W.range, hit = null;
    for (let t = minT; t < best; t += 0.8) {
      const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
      if (y < 0) { best = t; hit = { kind: 'ground' }; break; }
      let blocked = false;
      for (const b of world.nearby(x, z, 0.1)) if (!b.circle && y < b.h && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) { blocked = true; break; }
      if (blocked) { best = t; hit = { kind: 'wall' }; break; }
    }
    for (const p of peds.list) {
      if (p.state === 'dead') continue;
      const t = raySphere(origin, dir, tmpV2.set(p.x, p.y + 1.05, p.z), 0.5);
      if (t > minT && t < best) { best = t; hit = { kind: 'ped', p }; }
    }
    for (const c of cars) {
      if (c === player.car) continue;
      for (const [cx, cz] of c.circles()) {
        const t = raySphere(origin, dir, tmpV2.set(cx, c.y + 0.8, cz), c.radius);
        if (t > minT && t < best) { best = t; hit = { kind: 'car', c }; }
      }
    }
    const end = origin.clone().addScaledVector(dir, best);
    tracer(muzzle, end, W.tracer || '#7fe8ff', W.beam ? 0.16 : 0.09);
    if (W.soak) for (let k = 0; k < 3; k++) { const t = 0.3 + Math.random() * 0.7; puff(muzzle.x + (end.x - muzzle.x) * t, muzzle.y + (end.y - muzzle.y) * t, muzzle.z + (end.z - muzzle.z) * t, { color: '#9fd8ff', life: 0.35, size: 0.15, grow: 1, vy: -1, opacity: 0.8 }); }
    if (!hit) continue;
    if (hit.kind === 'ped') {
      const p = hit.p;
      if (W.soak) { // soaked: knocked flat and fleeing, but not hurt much
        if (Math.random() < 0.18 && p.state !== 'tumble') { p.vx = dir.x * 4; p.vz = dir.z * 4; p.vy = 2; p.state = 'tumble'; p.knock = true; }
        p.hurt(W.dmg, game, player.x, player.z, 'soak');
        if (Math.random() < 0.05) game.say(p, ['Ma good jacket!', 'I\'m drookit!', 'Ya wee scunner!'][(Math.random() * 3) | 0]);
        continue;
      }
      if (W.stun) { // zapped: drops to the ground twitching
        if (p.state !== 'tumble') { p.vx = dir.x * 2; p.vz = dir.z * 2; p.vy = 1.5; p.state = 'tumble'; }
        p.hurt(W.dmg, game, player.x, player.z, 'punch');
        for (let k = 0; k < 6; k++) puff(p.x, p.y + 0.6 + Math.random(), p.z, { color: '#9fe0ff', add: true, life: 0.25, size: 0.15, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 4, opacity: 1 });
        if (Math.random() < 0.6) game.say(p, ['Aaaabbbbbbbb!', 'Ma fillings!', 'Ah can taste purple!', 'Bzzzt!'][(Math.random() * 4) | 0]);
        if (p.cop) game.wanted.add(1); else if (!p.thug) game.wanted.add(0.2);
        continue;
      }
      p.hurt(W.dmg, game, player.x, player.z, 'shot');
      puff(end.x, end.y, end.z, { color: '#ff3030', life: 0.4, size: 0.4, opacity: 0.9 });
      if (p.cop) game.wanted.add(1.5 / W.pellets * 1.5); else if (!p.thug) game.wanted.add(0.4 / Math.sqrt(W.pellets));
    } else if (hit.kind === 'car') {
      if (W.soak) { if (hit.c.health <= 0 && hit.c.burnT > 0) { hit.c.burnT = Math.max(0.001, hit.c.burnT - 0.3); } continue; } // hose down a fire
      hit.c.damage(W.dmg * 2, game, 'shot');
      puff(end.x, end.y, end.z, { color: '#ffd080', add: true, life: 0.2, size: 0.5, opacity: 1 });
      if (hit.c.ai instanceof TrafficAI) hit.c.ai.panic = 6;
      if (hit.c.type === 'police') game.wanted.add(1 / W.pellets * 1.5);
    } else impactFx(end, dir, hit.kind);
  }
};
// spent cases fly out of the gun, bounce on the pavement and lie there a few seconds
const CASINGS = { smg: 'brass', rifle: 'brass', gatling: 'brass', sniper: 'brass', scatter: 'shell', double: 'shell' };
const CASES = 48, caseMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.045, 6), new THREE.MeshStandardMaterial({ color: '#d4a63a', metalness: 0.9, roughness: 0.3 }), CASES);
caseMesh.count = 0; caseMesh.frustumCulled = false; caseMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CASES * 3).fill(1), 3); scene.add(caseMesh);
const cases = [], caseDummy = new THREE.Object3D(), shellCol = new THREE.Color('#c0392b'), brassCol = new THREE.Color('#ffffff');
let caseI = 0;
function ejectCasing(from, kind) {
  const rx = Math.cos(player.heading), rz = -Math.sin(player.heading); // out to Wally's right
  const c = cases[caseI] || (cases[caseI] = {});
  Object.assign(c, { x: from.x, y: from.y, z: from.z, vx: rx * (2 + Math.random() * 1.5) + player.vx, vy: 2 + Math.random() * 1.5, vz: rz * (2 + Math.random() * 1.5) + player.vz, t: 0, rx: Math.random() * 6, ry: Math.random() * 6, spin: 12 + Math.random() * 10, bounced: 0, scale: kind === 'shell' ? 1.8 : 1 });
  caseMesh.setColorAt(caseI, kind === 'shell' ? shellCol : brassCol); caseMesh.instanceColor.needsUpdate = true;
  caseI = (caseI + 1) % CASES; caseMesh.count = Math.max(caseMesh.count, caseI === 0 ? CASES : caseI);
}
function updateCasings(dt) {
  if (!caseMesh.count) return;
  for (let i = 0; i < caseMesh.count; i++) {
    const c = cases[i]; if (!c) continue;
    c.t += dt;
    if (c.t < 6) {
      c.vy -= 14 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rx += c.spin * dt; c.ry += c.spin * 0.6 * dt;
      const g = world.groundHeight(c.x, c.z, c.y + 0.3) + 0.012;
      if (c.y < g) {
        c.y = g; if (Math.abs(c.vy) > 1 && c.bounced < 3) { c.vy = -c.vy * 0.35; c.bounced++; if (c.bounced === 1 && Math.random() < 0.5) audio.casing(0, 0.04); } else c.vy = 0;
        c.vx *= 0.5; c.vz *= 0.5; c.spin *= 0.5; if (c.vy === 0) c.rx = Math.PI / 2;
      }
    }
    caseDummy.position.set(c.x, c.t < 6 ? c.y : -50, c.z); caseDummy.rotation.set(c.rx, c.ry, 0); caseDummy.scale.setScalar(c.scale); caseDummy.updateMatrix();
    caseMesh.setMatrixAt(i, caseDummy.matrix);
  }
  caseMesh.instanceMatrix.needsUpdate = true;
}
// scorch marks left by explosions
const SCORCH = 30, scorchTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.6, 'rgba(10,8,6,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
const scorchMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), SCORCH);
scorchMesh.count = 0; scorchMesh.frustumCulled = false; scene.add(scorchMesh);
let scorchI = 0;
// the shockwave: a bright ring racing outward along the ground
const waveMat = new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const wave = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), waveMat); wave.visible = false; scene.add(wave);
let waveT = -1;
function blastFx(x, y, z) {
  const g = world.groundHeight(x, z, y + 1);
  const m = new THREE.Object3D(); m.position.set(x, g + 0.02, z); m.rotation.y = Math.random() * 6; m.scale.setScalar(5 + Math.random() * 2); m.updateMatrix();
  scorchMesh.setMatrixAt(scorchI, m.matrix); scorchI = (scorchI + 1) % SCORCH; scorchMesh.count = Math.max(scorchMesh.count, scorchI === 0 ? SCORCH : scorchI); scorchMesh.instanceMatrix.needsUpdate = true;
  wave.position.set(x, g + 0.15, z); waveT = 0; wave.visible = true;
}
function updateWave(dt) {
  if (waveT < 0) return;
  waveT += dt; const k = waveT / 0.55;
  if (k >= 1) { waveT = -1; wave.visible = false; return; }
  wave.scale.setScalar(1 + k * 14); waveMat.opacity = (1 - k) * 0.7;
}
// bullet holes: a pool of small dark marks stuck to walls and the road, oldest reused first
const HOLES = 240, holeMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.06, 10), new THREE.MeshBasicMaterial({ color: '#1b1714', transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false }), HOLES);
holeMesh.count = 0; holeMesh.frustumCulled = false; scene.add(holeMesh);
let holeI = 0; const holeDummy = new THREE.Object3D();
function impactFx(p, dir, kind) {
  let nx = 0, ny = 1, nz = 0;
  if (kind === 'wall') {
    // which face of the building did it hit? the nearest one to the point
    for (const b of world.nearby(p.x, p.z, 0.5)) {
      if (b.circle || p.x < b.x0 - 0.5 || p.x > b.x1 + 0.5 || p.z < b.z0 - 0.5 || p.z > b.z1 + 0.5) continue;
      const f = [[p.x - b.x0, -1, 0], [b.x1 - p.x, 1, 0], [p.z - b.z0, 0, -1], [b.z1 - p.z, 0, 1]].sort((a, c) => Math.abs(a[0]) - Math.abs(c[0]))[0];
      nx = f[1]; nz = f[2]; ny = 0;
      if (nx) p.x = nx < 0 ? b.x0 - 0.01 : b.x1 + 0.01; else p.z = nz < 0 ? b.z0 - 0.01 : b.z1 + 0.01;
      break;
    }
  } else p.y = world.groundHeight(p.x, p.z, p.y + 0.5) + 0.01;
  holeDummy.position.set(p.x, p.y, p.z);
  holeDummy.lookAt(p.x + nx, p.y + ny, p.z + nz);
  holeDummy.scale.setScalar(0.8 + Math.random() * 0.6); holeDummy.updateMatrix();
  holeMesh.setMatrixAt(holeI, holeDummy.matrix); holeI = (holeI + 1) % HOLES; holeMesh.count = Math.max(holeMesh.count, holeI === 0 ? HOLES : holeI);
  holeMesh.instanceMatrix.needsUpdate = true;
  // a spray of sparks and a puff of dust off the surface
  for (let k = 0; k < 5; k++) puff(p.x, p.y, p.z, { color: Math.random() < 0.5 ? '#ffd27a' : '#fff1c0', add: true, life: 0.18 + Math.random() * 0.12, size: 0.07, grow: 0.2, vx: nx * 3 + (Math.random() - 0.5) * 5 - dir.x * 1.5, vy: ny * 3 + Math.random() * 3, vz: nz * 3 + (Math.random() - 0.5) * 5 - dir.z * 1.5, opacity: 1 });
  puff(p.x + nx * 0.1, p.y + ny * 0.1, p.z + nz * 0.1, { color: kind === 'wall' ? '#b9a993' : '#8d8a84', life: 0.7, size: 0.35, grow: 2.2, vx: nx * 0.8, vy: 0.5, vz: nz * 0.8, opacity: 0.55 });
}
// Tattie Gun potatoes and Haggis Launcher rockets
const shots = [];
game.fireProjectile = (W) => {
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const model = player.models[player.weapon];
  const from = model.localToWorld(model.userData.muzzle ? model.userData.muzzle.clone() : new THREE.Vector3());
  const m = buildProjectile(W.proj); m.position.copy(from); scene.add(m);
  const sp = { haggis: 38, bolt: 70, caber: 30 }[W.proj] || 32;
  shots.push({ kind: W.proj, W, m, x: from.x, y: from.y, z: from.z, vx: dir.x * sp, vy: dir.y * sp + (W.proj === 'tattie' ? 2 : 0), vz: dir.z * sp, t: 0 });
  audio.fire(W.id);
  if (W.proj === 'caber') cam.shake = Math.max(cam.shake, 0.2);
  game.raiseAlarm(player.x, player.z, 2);
};
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.t += dt; s.vy -= ({ tattie: 14, bolt: 1.5, caber: 9 }[s.kind] ?? 3) * dt;
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, nz = s.z + s.vz * dt;
    let hit = s.t > 4 || ny < world.groundHeight(nx, nz, ny + 0.5) + 0.05;
    for (const b of world.nearby(nx, nz, 0.3)) if (!b.dead && !b.circle && ny < b.h && nx > b.x0 && nx < b.x1 && nz > b.z0 && nz < b.z1) hit = true;
    let victim = null;
    for (const p of peds.list) if (p.state !== 'dead' && Math.hypot(p.x - nx, p.z - nz) < 0.6 && ny > p.y && ny < p.y + 2) { victim = p; hit = true; break; }
    let car = null;
    if (!victim) for (const c of cars) if (c !== player.car && !c.dead && Math.hypot(c.x - nx, c.z - nz) < c.T.len / 2 && ny < c.y + c.T.hgt) { car = c; hit = true; break; }
    s.x = nx; s.y = ny; s.z = nz; s.m.position.set(nx, ny, nz);
    s.m.lookAt(nx + s.vx, ny + s.vy, nz + s.vz);
    if ((s.kind === 'haggis' || s.kind === 'caber') && Math.random() < dt * 40) puff(nx, ny, nz, { color: '#aaa', life: 0.8, size: 0.4, vy: 0.3, opacity: 0.6 });
    if (!hit) continue;
    dropObject(s.m); shots.splice(i, 1);
    if (s.kind === 'haggis' || s.kind === 'caber') { game.onExplosion(nx, ny, nz, null); game.wanted.add(1); continue; }
    if (s.kind === 'bolt') { // a crossbow bolt: a hard thunk and a big hit
      audio.hit('shinty');
      if (victim) { victim.vx = s.vx * 0.12; victim.vz = s.vz * 0.12; victim.vy = 2; victim.state = 'tumble'; victim.hurt(s.W.dmg, game, player.x, player.z, 'shot'); if (victim.cop) game.wanted.add(1.5); else if (!victim.thug) game.wanted.add(0.4); }
      if (car) { car.damage(s.W.dmg * 2, game, 'shot'); if (car.ai) car.ai.panic = 4; }
      puff(nx, ny, nz, { color: '#c9b08a', life: 0.4, size: 0.3, opacity: 0.9 });
      continue;
    }
    // a potato to the face
    audio.punch();
    puff(nx, ny, nz, { color: '#c9a36a', life: 0.4, size: 0.4, opacity: 0.9 });
    if (victim) { victim.vx = s.vx * 0.35; victim.vz = s.vz * 0.35; victim.vy = 3; victim.state = 'tumble'; victim.hurt(s.W.dmg, game, player.x, player.z, 'car'); if (victim.cop) game.wanted.add(1); else if (!victim.thug) game.wanted.add(0.3); }
    if (car) { car.damage(s.W.dmg * 2, game, 'shot'); if (car.ai) car.ai.panic = 4; }
  }
}
// Dragon's Breath: a short cone of fire
game.playerFlame = (W) => {
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const model = player.models[player.weapon] || player.models.flame;
  const from = model.localToWorld(model.userData.muzzle.clone());
  const big = !!W.big;
  for (let k = 0; k < (big ? 5 : 3); k++) {
    const sp = (big ? 14 : 9) + Math.random() * 4;
    puff(from.x, from.y, from.z, { color: Math.random() < 0.5 ? '#ff7a1a' : '#ffcf40', add: true, life: big ? 0.7 : 0.55, size: big ? 0.5 : 0.35, grow: big ? 5 : 4, vx: dir.x * sp + (Math.random() - 0.5) * 2, vy: dir.y * sp + 0.8, vz: dir.z * sp + (Math.random() - 0.5) * 2, opacity: 0.9 });
  }
  if (big && Math.random() < 0.4) puff(from.x + dir.x * 8, from.y + 1.5, from.z + dir.z * 8, { color: '#2a2a2a', life: 1.6, size: 1, grow: 2.5, vy: 1.5, opacity: 0.5 });
  if (big) { flashLight.position.copy(from); flashLight.color.set('#ff8a30'); flashLight.intensity = Math.max(flashLight.intensity, 40); }
  audio.flame(1, big);
  game.raiseAlarm(player.x, player.z, 1);
  const fx = dir.x, fz = dir.z, fl = Math.hypot(fx, fz) || 1;
  for (const p of peds.list) {
    if (p.state === 'dead') continue;
    const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz);
    if (d < W.range && d > 0.2 && (dx * fx + dz * fz) / (d * fl) > 0.85) {
      p.hurt(W.dmg, game, player.x, player.z, 'fire');
      if (Math.random() < 0.3) puff(p.x, p.y + 1, p.z, { color: '#ff7a1a', add: true, life: 0.5, size: 0.4, vy: 2 });
      if (p.cop) game.wanted.add(0.15); else if (!p.thug) game.wanted.add(0.05);
    }
  }
  for (const c of cars) {
    if (c === player.car || c.dead) continue;
    const dx = c.x - player.x, dz = c.z - player.z, d = Math.hypot(dx, dz);
    if (d < W.range + 1.5 && (dx * fx + dz * fz) / (d * fl) > 0.8) { c.damage(W.dmg * 3, game); if (c.ai) c.ai.panic = 4; }
  }
};

// lob a neep grenade: it bounces, fizzes, then goes off
const neeps = [];
game.throwNeep = () => {
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const hand = player.h.arms[1].grip.localToWorld(new THREE.Vector3());
  const m = buildNeep(0.11); m.position.copy(hand); scene.add(m);
  const sp = 15;
  neeps.push({ m, x: hand.x, y: hand.y, z: hand.z, vx: dir.x * sp + player.vx, vy: dir.y * sp + 5, vz: dir.z * sp + player.vz, t: 2.2 });
  audio.fire('throw');
};
function updateNeeps(dt) {
  for (let i = neeps.length - 1; i >= 0; i--) {
    const n = neeps[i];
    n.t -= dt; n.vy -= 18 * dt;
    n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt;
    const c = world.collide(n.x, n.z, 0.12, n.y);
    if (c.hit) { n.x = c.x; n.z = c.z; const vn = n.vx * c.nx + n.vz * c.nz; n.vx -= 1.6 * vn * c.nx; n.vz -= 1.6 * vn * c.nz; }
    const g = world.groundHeight(n.x, n.z, n.y + 0.3) + 0.11;
    if (n.y < g) { n.y = g; n.vy = Math.abs(n.vy) * 0.4; n.vx *= 0.6; n.vz *= 0.6; }
    n.m.position.set(n.x, n.y, n.z); n.m.rotation.x += dt * 8; n.m.rotation.z += dt * 5;
    if (Math.random() < dt * 20) puff(n.x, n.y + 0.15, n.z, { color: '#ffcf40', add: true, life: 0.25, size: 0.2, vy: 0.5, opacity: 1 });
    if (n.t <= 0) {
      dropObject(n.m); neeps.splice(i, 1);
      game.onExplosion(n.x, n.y, n.z, null);
      game.wanted.add(1);
    }
  }
}
game.playerPunch = (weapon = 'fists') => {
  const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  const sup = player.superPunch > 0;
  const W = WEAPONS[weapon] || WEAPONS.fists;
  const club = weapon !== 'fists', reach = sup ? 2.6 : (W.range || 1.6);
  let any = false;
  if (W.blast) { // Battle Bagpipes: a deafening skirl that bowls over everyone nearby
    audio.pipes();
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; puff(player.x + Math.cos(a) * 1.2, player.y + 1.2, player.z + Math.sin(a) * 1.2, { color: '#e8d6ff', add: true, life: 0.6, size: 0.6, vx: Math.cos(a) * 6, vy: 0.5, vz: Math.sin(a) * 6, opacity: 0.7 }); }
    for (const p of peds.list) {
      if (p.state === 'dead') continue;
      const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz);
      if (d > W.blast || d < 0.01) continue;
      p.vx = dx / d * 9; p.vz = dz / d * 9; p.vy = 4; p.state = 'tumble';
      p.hurt(W.dmg, game, player.x, player.z, 'car');
      if (p.cop) game.wanted.add(1);
    }
    cam.shake = Math.max(cam.shake, 0.25);
    return;
  }
  audio.swing(club ? 1 : 0.6);
  for (const p of peds.list) {
    if (p.state === 'dead') continue;
    const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz);
    if (d < reach && (dx * fx + dz * fz) / (d || 1) > 0.3) {
      any = true;
      if (sup) { p.vx = fx * 18; p.vz = fz * 18; p.vy = 9; p.state = 'tumble'; p.hurt(30, game, player.x, player.z, 'car'); }
      else p.hurt(club ? W.dmg : 22, game, player.x, player.z, 'punch');
      if (p.cop) game.wanted.add(2); else if (!p.thug) game.wanted.add(0.5);
    }
  }
  for (const c of cars) {
    if (c.dead) continue;
    for (const [cx, cz] of c.circles()) {
      const dx = cx - player.x, dz = cz - player.z, d = Math.hypot(dx, dz);
      if (d < c.radius + (sup ? 1.6 : (club ? 1.4 : 0.9)) && (dx * fx + dz * fz) / (d || 1) > 0.2) {
        any = true;
        if (sup) { c.vx += fx * 28; c.vz += fz * 28; c.damage(650, game); game.bigText('KA-WALLOP!', '', 1); cam.shake = 0.6; }
        else c.damage(club ? W.dmg * 1.3 : 15, game);
        if (c.ai) c.ai.panic = 5;
        break;
      }
    }
  }
  if (any && W.clang) { audio.tone(1400, 0.4, 'triangle', 0.25, -200); audio.tone(2100, 0.3, 'sine', 0.1); }
  else if (any && club) audio.hit(weapon);
  if (any) { if (!club) audio.punch(); if (sup) { player.superPunch = 0; audio.boom(); } game.quip('punch', 0.12); }
};
game.npcShoot = (ped, tx, tz) => {
  { const dd = Math.hypot(ped.x - player.x, ped.z - player.z); if (dd < 90) audio.fire('npc', 0.9 * (1 - dd / 90) + 0.1); }
  const d = Math.hypot(tx - ped.x, tz - ped.z);
  const moving = player.car ? player.car.speed > 8 : player.speed > 3;
  const chance = 0.62 - d * 0.013 - (moving ? 0.2 : 0);
  const from = new THREE.Vector3(ped.x, ped.y + 1.4, ped.z);
  const to = new THREE.Vector3(tx + (Math.random() - 0.5) * 2, (player.car ? player.car.y : player.y) + 1 + (Math.random() - 0.5), tz + (Math.random() - 0.5) * 2);
  tracer(from, to, '#ffcf60');
  if (Math.random() < chance) {
    if (player.car) player.car.damage(35, game, 'shot');
    else game.hurtPlayer(ped.thug ? 6 : 8, 'shot');
  }
};
game.raiseAlarm = (x, z, t = 4) => { game.alarm = [x, z]; game.alarmT = t; };
game.onPedKilled = (p, kind) => {
  game.stats.kills++;
  if (Math.random() < 0.7) addPickup('cash', p.x, p.z, { amount: 10 + ((Math.random() * 40) | 0) });
  if (p.thug) return;
  game.wanted.add(p.cop ? 4 : 1.2);
};
game.onCarImpact = (car, v) => {
  if (v > 7 && Math.hypot(car.x - player.x, car.z - player.z) < 60) {
    const [fx, fz] = car.forward(), fr = car.T.len / 2;
    for (let k = 0; k < Math.min(14, v); k++) puff(car.x + fx * fr, car.y + 0.5, car.z + fz * fr, { color: Math.random() < 0.6 ? '#ffb347' : '#fff0b0', add: true, life: 0.25 + Math.random() * 0.25, size: 0.08, grow: 0.1, vx: (Math.random() - 0.5) * 8 - car.vx * 0.2, vy: 1 + Math.random() * 4, vz: (Math.random() - 0.5) * 8 - car.vz * 0.2, opacity: 1 });
  }
  const d = Math.hypot(car.x - player.x, car.z - player.z);
  if (d < 40) audio.crash(v * (1 - d / 40));
  if (car === player.car) { cam.shake = Math.min(0.5, v * 0.03); pad.rumble(Math.min(1, v * 0.05), Math.min(1, v * 0.04), 180); if (v > 14) game.quip('crash', 0.35); }
};
game.onExplosion = (x, y, z, src) => {
  blastFx(x, y, z);
  const d = Math.hypot(x - player.x, z - player.z);
  if (d < 120) audio.boom();
  flashLight.position.set(x, y + 1, z); flashLight.color.set('#ffaa55'); flashLight.intensity = 400;
  for (let i = 0; i < 26; i++) puff(x, y, z, { color: i < 12 ? '#ffb030' : '#ff6010', add: true, life: 0.6 + Math.random() * 0.5, size: 2 + Math.random() * 2, vx: (Math.random() - 0.5) * 10, vy: Math.random() * 8, vz: (Math.random() - 0.5) * 10, opacity: 1, grow: 1.5 });
  for (let i = 0; i < 16; i++) puff(x, y + 1, z, { color: '#2a2a2a', life: 2.5 + Math.random() * 2, size: 2.5, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 4, opacity: 0.8, grow: 3 });
  if (d < 60) { cam.shake = Math.max(cam.shake, 0.8 * (1 - d / 60)); pad.rumble(1 - d / 60, 0.8 * (1 - d / 60), 450); }
  if (src && src === player.car) { game.hurtPlayer(999, 'boom'); } // only if it's Wally's own motor going up
  else if (!player.car && d < 8) game.hurtPlayer((8 - d) * 12, 'boom');
  for (const p of peds.list) { const pd = Math.hypot(p.x - x, p.z - z); if (pd < 8 && p.state !== 'dead') { p.vx = (p.x - x) / pd * 10; p.vz = (p.z - z) / pd * 10; p.vy = 7; p.state = 'tumble'; p.hurt(200, game, x, z, 'car'); } }
  for (const c of cars) { if (c === src || c.dead) continue; const cd = Math.hypot(c.x - x, c.z - z); if (cd < 9) { c.damage((9 - cd) * 140, game); c.vx += (c.x - x) / cd * 6; c.vz += (c.z - z) / cd * 6; } }
  if (src && src.type === 'police') game.wanted.add(4);
};
game.hurtPlayer = (amt, cause, silent) => {
  if (player.dead) return;
  if (player.armour > 0 && cause !== 'drown' && cause !== 'boom') { const a = Math.min(player.armour, amt); player.armour -= a; amt -= a; }
  player.health -= amt;
  if (amt > 4) pad.rumble(Math.min(1, amt / 40), 0.4, 150);
  if (!silent) { $('damage').style.opacity = 0.7; setTimeout(() => ($('damage').style.opacity = 0), 160); }
  if (player.health <= 0) die(cause);
  else if (cause === 'fall') game.quip('fall', 0.7);
  else if (player.health < 30 && !game._lowSaid) { game._lowSaid = true; game.quip('lowHealth', 1, true); }
  else if (amt > 12) game.quip('hurt', 0.35);
};
const DEATHS = { fall: 'Gravity: 1, Wally: 0', drown: 'Wally Man can\'t swim. Never could.', boom: 'Well done.', shot: 'Turns out the cape isn\'t bulletproof.', car: 'Look both ways, hero.', faceplant: 'Death by pavement.' };
function die(cause) {
  player.dead = true; player.health = 0;
  voice.say(DEATHS[cause] || 'Wally Man is down.', 'NARRATOR', true);
  if (game.jack) endJack(false);
  if (player.car) exitCar(true);
  game.stats.wasted++;
  audio.fail();
  game.bigText('HOPELESS!', DEATHS[cause] || 'Wally Man is down.', 4, true);
  failMission();
  setTimeout(() => respawn('hospital'), 4200);
}
// ---- arrests: a cop has to get hold of Wally, and he can wriggle free by running ----
const arrest = { p: 0, last: 0, cop: null, pull: 0 };
game.arrestTick = (cop, dt) => {
  if (game.cuffs || player.dead || game.wanted.level === 0) return;
  const still = player.speed < 1.6 && !player.car;
  arrest.p = Math.min(1, arrest.p + dt / 1.7 * (still ? 1 : 0.3));
  arrest.last = performance.now(); arrest.cop = cop;
  if (arrest.p >= 1) startCuffs(cop);
};
game.pullOutTick = (cop, dt) => {
  if (game.cuffs || player.dead || game.wanted.level === 0 || !player.car) return;
  arrest.pull += dt; arrest.last = performance.now(); arrest.p = Math.min(0.5, arrest.pull / 3);
  if (arrest.pull > 1.4) { // yank the door open and haul him out
    arrest.pull = 0;
    const c = player.car; c.doorOpen = 1; setTimeout(() => { c.doorOpen = 0; }, 900);
    game.say(cop, 'Oot the car, Wally!'); audio.door();
    exitCar(true); player.vx = 0; player.vz = 0; player.faceplantT = 0.6;
  }
};
function startCuffs(cop) {
  game.cuffs = { t: 0, cop };
  cop.state = 'cuffing';
  const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  cop.x = player.x - fx * 0.75; cop.z = player.z - fz * 0.75; cop.heading = player.heading;
  player.jackPose = { speed: 0, cuffed: true };
  game.say(cop, ["You're nicked, cape boy.", 'Anything ye say will be taken doon and laughed at.', 'Mind yer heid getting in the van.'][(Math.random() * 3) | 0]);
  audio.tone(1800, 0.06, 'square', 0.12); audio.tone(1500, 0.06, 'square', 0.12, 0, 0.12); // click click
}
function updateArrest(dt) {
  if (game.cuffs) {
    game.cuffs.t += dt;
    if (game.cuffs.t > 1.8) { const cop = game.cuffs.cop; game.cuffs = null; player.jackPose = null; if (cop) cop.state = 'chase'; game.bust(true); }
  } else if (performance.now() - arrest.last > 250) { arrest.p = Math.max(0, arrest.p - dt * 0.9); arrest.pull = 0; }
  const bar = $('arrest');
  bar.classList.toggle('hidden', !(arrest.p > 0.02 || game.cuffs));
  bar.firstElementChild.style.width = (game.cuffs ? 100 : arrest.p * 100) + '%';
}
game.bust = () => {
  if (player.dead || game.busting) return;
  game.busting = true; game.stats.busted++;
  if (game.jack) endJack(false);
  audio.fail();
  if (player.car) exitCar(true);
  game.bigText('NICKED!', 'You have the right to remain hopeless.', 4, true);
  voice.say("You're nicked, cape boy. You have the right to remain hopeless.", 'COP', true);
  player.loseWeapons();
  failMission();
  player.dead = true;
  setTimeout(() => { respawn('police'); game.busting = false; }, 4200);
};
function respawn(where) {
  const s = world.specials[where] || world.specials.hospital;
  player.dead = false; player.health = 100; player.armour = 0;
  player.money = Math.max(0, player.money - 100);
  player.place(s.x, s.z - 0.2, Math.PI);
  player.h.root.rotation.set(0, Math.PI, 0);
  game.wanted.clear(); game.cuffs = null; arrest.p = 0; player.jackPose = null;
  for (const p of peds.list.slice()) if (p.cop) { p.remove(); peds.list.splice(peds.list.indexOf(p), 1); }
  for (const c of cars.slice()) if (c.type === 'police' && c.ai) removeCar(c);
  cam.yaw = Math.PI; game._lowSaid = false;
  defaultWeapon(true); // the polis took everything else, but he keeps a spare rifle in his pants
  setTimeout(() => game.quip(where === 'police' ? 'busted' : 'wasted', 1, true), 1500);
  save();
}

// ---------------- people vs cars ----------------
// Treat each car as a solid box: push a person (circle of radius rad at height y) out of it.
// If they're up on the roof, the roof becomes their floor. Returns { x, z, floor, car }.
game.carCollide = (x, z, rad, y, ignore) => {
  let floor = -Infinity, hitCar = null;
  for (const c of cars) {
    if (c === ignore || c === player.car) continue;
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz > 49) continue;
    const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
    const along = dx * fx + dz * fz, across = dx * fz - dz * fx; // car-local coords
    const hl = c.T.len / 2, hw = c.T.wid / 2, top = c.y + c.T.hgt + (c.dead ? -0.3 : 0.05);
    if (Math.abs(along) > hl + rad || Math.abs(across) > hw + rad) continue;
    if (y >= top - 0.35) { // standing on the roof or bonnet
      if (Math.abs(along) < hl && Math.abs(across) < hw) floor = Math.max(floor, top);
      continue;
    }
    // push out along the side with the least overlap
    const pa = hl + rad - Math.abs(along), pc = hw + rad - Math.abs(across);
    let na = along, nc = across;
    if (pa < pc) na = Math.sign(along || 1) * (hl + rad); else nc = Math.sign(across || 1) * (hw + rad);
    x = c.x + fx * na + fz * nc; z = c.z + fz * na - fx * nc;
    hitCar = c;
  }
  return { x, z, floor, car: hitCar };
};

// ---------------- cars: enter / exit ----------------
// ----- carjacking: walk to the door, open it, haul the driver out, thump them, jump in -----
const JACK_LINES = ['Ma motor!', 'Wally, ya thief!', 'I only just washed that!', 'Ye cannae just TAKE it!', 'Ma heid! Ma CAR!', 'I\'m telling yer maw!', 'Ma shopping\'s in the boot!', 'At least let me get ma sunglasses!', 'I\'m on ma way tae a wedding!', 'Mind the fluffy dice, they\'re vintage!', 'That\'s ma mother-in-law\'s motor! Actually, keep it.', 'Help! I\'m being carjacked by a onesie!'];
function enterCar() {
  if (player.car || player.dead || game.jack) return;
  let best = null, bd = 3.8;
  for (const c of cars) { if (c.dead) continue; const d = Math.hypot(c.x - player.x, c.z - player.z) - c.T.len * 0.3; if (d < bd) { bd = d; best = c; } }
  if (!best) return;
  const c = best;
  if (c.health <= 0) { game.toast('That one\'s on fire, Wally.'); return; }
  const occupied = c.driver === 'ai' || c.driver === 'cop';
  if (occupied && c.speed > 9) { game.toast('Too fast to grab! Wait till it slows down.'); return; }
  game.jack = { car: c, t: 0, sx: player.x, sz: player.z, occupied, cop: c.driver === 'cop', ped: null, punched: false };
  if (occupied) { c.ai = null; c.driver = 'jacked'; }
  audio.init();
}
function jackFrame(c) {
  const fx = Math.sin(c.heading), fz = Math.cos(c.heading), rx = -fz, rz = fx; // forward and the car's right (driver's side)
  const hz = c.door ? c.door.position.z : c.T.len * 0.12, dl = c.T.len * 0.27, hw = c.T.wid / 2;
  const at = (along, out) => [c.x + fx * along + rx * out, c.z + fz * along + rz * out];
  return { stand: at(hz - 1.05, hw + 0.75), seat: at(hz - dl * 0.5, hw - 0.45), dump: at(hz - dl * 0.45, hw + 1.45) };
}
function updateJack(dt) {
  const j = game.jack; if (!j) return;
  const c = j.car;
  if (c.dead || c.health <= 0 || player.dead) { endJack(false); return; }
  j.t += dt;
  // keep the car stopped while this happens
  c.input = { throttle: c.vf > 0.3 ? -1 : 0, steer: 0, hand: true };
  const F = jackFrame(c);
  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
  const face = (x, z) => { player.heading = Math.atan2(x - player.x, z - player.z); };
  const T = j.t;
  if (T < 0.35) { // walk up to the door
    const k = T / 0.35; player.x = lerp(j.sx, F.stand[0], k); player.z = lerp(j.sz, F.stand[1], k);
    face(F.seat[0], F.seat[1]); player.jackPose = { speed: 3 };
    return;
  }
  player.x = F.stand[0]; player.z = F.stand[1]; player.y = world.groundHeight(player.x, player.z, 1);
  if (!j.opened) { j.opened = true; c.doorOpen = 1; audio.door(); }
  if (!j.occupied) {
    face(F.seat[0], F.seat[1]); player.jackPose = { speed: 0, reach: Math.min(1, (T - 0.35) * 4) };
    if (T > 0.7) endJack(true);
    return;
  }
  if (T < 0.6) { face(F.seat[0], F.seat[1]); player.jackPose = { speed: 0, reach: (T - 0.35) / 0.25 }; return; }
  if (!j.ped) {
    const p = game.spawnPed(F.seat[0], F.seat[1], { cop: j.cop });
    c.driverOut = true;
    p.state = 'held'; p.y = c.y - 0.2; p.sit = true; p.heading = c.heading; p.mission = true; j.ped = p;
    game.say(p, j.cop ? 'Get yer hands aff me!' : JACK_LINES[(Math.random() * JACK_LINES.length) | 0]);
    if (j.cop) game.wanted.add(3); else if (nearCop(40)) game.wanted.add(2); else if (Math.random() < 0.3) game.wanted.add(1);
  }
  const p = j.ped;
  if (T < 1.2) { // haul them out
    const k = (T - 0.6) / 0.6, e = k * k * (3 - 2 * k);
    p.x = lerp(F.seat[0], F.dump[0], e); p.z = lerp(F.seat[1], F.dump[1], e);
    p.y = lerp(c.y - 0.2, world.groundHeight(p.x, p.z, 1), Math.min(1, e * 1.6));
    p.sit = e < 0.3;
    p.heading = p.sit ? c.heading : Math.atan2(player.x - p.x, player.z - p.z); p.tilt = Math.sin(e * Math.PI) * -0.5;
    face(p.x, p.z); player.jackPose = { speed: 0, reach: 1, pull: Math.sin(e * Math.PI) };
    return;
  }
  if (T < 1.6) { // and a punch for good measure
    face(p.x, p.z);
    if (!j.punched) { j.punched = true; player.h.punchT = 0.3; player.h.punchSide = 1; }
    player.jackPose = { speed: 0 };
    if (T > 1.33 && p.state === 'held') {
      p.state = 'idle'; p.tilt = 0; p.mission = false;
      p.hurt(18, game, player.x, player.z, 'punch');
      audio.punch(); cam.shake = Math.max(cam.shake, 0.15);
      setTimeout(() => game.quip('jack', 0.6), 500);
      if (j.cop) p.aggro = true; else { p.fleeFrom = [player.x, player.z]; p.fleeT = 9; p.state = p.state === 'tumble' ? 'tumble' : 'flee'; }
    }
    return;
  }
  // climb in
  const k = (T - 1.6) / 0.3;
  player.x = lerp(F.stand[0], F.seat[0], k); player.z = lerp(F.stand[1], F.seat[1], k);
  face(c.x + Math.sin(c.heading) * 5, c.z + Math.cos(c.heading) * 5);
  player.jackPose = { speed: 2 };
  if (T > 1.9) endJack(true);
}
function endJack(ok) {
  const j = game.jack; if (!j) return;
  game.jack = null; player.jackPose = null; j.car.driverOut = false;
  if (j.ped && j.ped.state === 'held') { j.ped.state = 'flee'; j.ped.fleeT = 6; j.ped.tilt = 0; j.ped.mission = false; }
  const c = j.car;
  setTimeout(() => { c.doorOpen = 0; }, ok ? 250 : 0);
  if (!ok) { if (c.driver === 'jacked') c.driver = null; return; }
  if (!j.occupied && c.type === 'police') game.wanted.add(nearCop(60) ? 3 : 1);
  c.driver = 'player'; c.ai = null; c.parked = false; c.sirenOn = false;
  player.car = c; game.stats.cars++;
  if (c.type === 'wedge' && !game._saidWedge) { game._saidWedge = true; game.quip(["It's like driving a fridge! A very fast, very angry fridge!"], 1, true); }
  else if (c.type === 'trike' && !game._saidTrike) { game._saidTrike = true; game.quip(["Three wheels! Lovely jubbly! Mind the corners, Wally."], 1, true); }
  else game.quip('car', 0.3);
  audio.door();
  const vn = $('vehName'); vn.textContent = c.name; vn.style.opacity = 1; setTimeout(() => (vn.style.opacity = 0), 2500);
  showRadio();
}
function exitCar(force) {
  const c = player.car; if (!c) return;
  if (!force && c.speed > 9) { // bail out!
    player.vx = c.vx * 0.5; player.vz = c.vz * 0.5;
    game.hurtPlayer(8, 'car');
  } else { player.vx = 0; player.vz = 0; }
  let [x, z] = c.doorPos();
  const col = world.collide(x, z, 0.4, 0); x = col.x; z = col.z;
  player.place(x, z, c.heading);
  c.driver = null; c.input = { throttle: 0, steer: 0, brake: false, hand: false };
  player.car = null;
  c.doorOpen = 1; setTimeout(() => { c.doorOpen = 0; }, 700);
  audio.door();
}
function nearCop(r) {
  for (const c of cars) if (c.type === 'police' && c.driver === 'cop' && Math.hypot(c.x - player.x, c.z - player.z) < r) return true;
  for (const p of peds.list) if (p.cop && p.state !== 'dead' && Math.hypot(p.x - player.x, p.z - player.z) < r) return true;
  return false;
}
// the DJ chats between songs, and the new song's name pops up
const pickDJ = (st) => { const L = Math.random() < 0.75 ? DJ_LINES[st] : DJ.slice(3); return L[(Math.random() * L.length) | 0]; };
audio.onTrack = (st) => { if (!player.car || !game.playing) return; showRadio(); if (Math.random() < 0.5) voice.say(pickDJ(st), 'DJ'); };
function showRadio() {
  if (!player.car) return;
  const r = $('radio'), song = audio.song();
  r.textContent = '📻 ' + audio.stations[audio.station] + (song ? ` · ${song.title} – ${song.artist}` : '');
  r.style.opacity = 1; clearTimeout(game._radT); game._radT = setTimeout(() => (r.style.opacity = 0), 3200);
}

// ---------------- input ----------------
const keys = new Set(); const pressed = new Set();
let mouse = { l: false, r: false, lp: false };
window.addEventListener('keydown', (e) => {
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  if (e.code === 'Escape' && game.shopOpen) { game.closeShop(); return; }
  if ((e.code === 'Escape' || e.code === 'KeyP') && game.playing && !game.shopOpen && performance.now() - (game._plT || 0) > 400) togglePause();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
canvas.addEventListener('mousedown', (e) => {
  audio.init();
  if (game.intro) game._tapSkip = true;
  if (game.playing && !game.paused && document.pointerLockElement !== canvas && !isTouch) { canvas.requestPointerLock?.(); return; }
  if (e.button === 0) { mouse.l = true; mouse.lp = true; } if (e.button === 2) mouse.r = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
$('radarWrap').addEventListener('click', () => { if (game.playing && !game.paused) cycleGps(); });
window.addEventListener('wheel', (e) => { if (game.playing && !game.paused && !player.car && Math.abs(e.deltaY) > 4) { pressed.add('Tab'); } }, { passive: true });
document.addEventListener('touchstart', () => { if (game.intro) game._tapSkip = true; }, { passive: true });
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || game.paused) return;
  cam.yaw -= e.movementX * 0.0026; cam.pitch -= e.movementY * 0.0022;
  cam.pitch = Math.max(-1.2, Math.min(0.7, cam.pitch)); cam.lastLook = performance.now();
});
document.addEventListener('pointerlockchange', () => {
  game._plT = performance.now();
  if (document.pointerLockElement !== canvas && game.playing && !game.paused && !game.shopOpen && !isTouch) togglePause(true);
});

// ---------------- game controller ----------------
const pad = new Pad(store);
game.pad = pad;
// while you're on a controller the on-screen buttons get out the way; touch the screen and they come back
function usingPad(on) {
  if (on === document.body.classList.contains('pad')) return;
  document.body.classList.toggle('pad', on);
}
document.addEventListener('touchstart', () => usingPad(false), { passive: true, capture: true });
pad.onConnect = (gp) => { game.toast(`🎮 Controller connected: ${gp.id.replace(/\s*\(.*\)\s*/g, ' ').trim() || 'gamepad'}`); usingPad(true); padScreenInfo(); };
pad.onDisconnect = () => { game.toast('🎮 Controller disconnected'); usingPad(false); padScreenInfo(); };
// Android's back gesture (and some controllers' B button) would leave the page: keep it in the game instead
// (only while playing: from the title screen, back still leaves as normal)
const guardBack = () => { if (!history.state || history.state.wta !== 1) history.pushState({ wta: 1 }, ''); };
window.addEventListener('popstate', () => { if (!game.playing) return; guardBack(); if (!game.paused && !game.shopOpen && !document.body.classList.contains('pad')) togglePause(true); });
// menus: D-pad or left stick to move, A to choose, B to go back
let menuFocus = null, menuRepeat = 0;
function activeScreen() {
  for (const id of ['padscreen', 'help', 'shop', 'crash', 'pause']) { const e = $(id); if (e && !e.classList.contains('hidden')) return e; }
  if (!game.playing) return $('title');
  return null;
}
function padMenus(dt) {
  const g = pad.state; if (!g) return;
  if (pad.setupRunning) return; // the button wizard is listening: don't let presses click menu buttons
  const scr = activeScreen(); if (!scr) { if (menuFocus) menuFocus.classList.remove('padfocus'); menuFocus = null; return; }
  if (g.any) usingPad(true);
  const items = [...scr.querySelectorAll('button')].filter((b) => b.offsetParent !== null && !b.disabled);
  if (!items.length) return;
  if (!menuFocus || !items.includes(menuFocus)) { if (menuFocus) menuFocus.classList.remove('padfocus'); menuFocus = items[0]; menuFocus.classList.add('padfocus'); }
  menuRepeat -= dt;
  const v = g.my > 0.6 || g.up > 0.5 ? -1 : (g.my < -0.6 || g.down > 0.5 ? 1 : 0);
  if (v && menuRepeat <= 0) {
    menuRepeat = 0.22;
    const i = (items.indexOf(menuFocus) + v + items.length) % items.length;
    menuFocus.classList.remove('padfocus'); menuFocus = items[i]; menuFocus.classList.add('padfocus');
    menuFocus.scrollIntoView({ block: 'nearest' }); audio.tone(900, 0.04, 'square', 0.05);
  } else if (!v) menuRepeat = 0;
  if (g.pressed.jump) { audio.tone(1300, 0.05, 'square', 0.06); const f = menuFocus; g.pressed = {}; g.any = false; f.click(); }
  else if (g.pressed.sprint || g.pressed.pause) {
    if (scr.id === 'padscreen') $('padBack').click();
    else if (scr.id === 'help') $('helpBack').click();
    else if (scr.id === 'shop') game.closeShop();
    else if (scr.id === 'pause') togglePause(false);
  }
}
// the CONTROLLER screen: shows what's connected, the button layout, and lets you teach it your buttons
let stopSetup = null;
function padScreenInfo() {
  const e = $('padName'); if (!e) return;
  const gp = pad.get();
  e.textContent = gp ? `Connected: ${gp.id}` : 'No controller found yet. Switch it on and press any button on it.';
  $('padMode').textContent = gp ? (pad.custom ? 'Using your own button setup.' : (gp.mapping === 'standard' ? 'Standard layout recognised: should work straight away.' : "This controller doesn't say what its buttons are. If they're muddled, use SET UP BUTTONS.")) : '';
}
function openPadScreen() { $('padscreen').classList.remove('hidden'); $('padStep').textContent = ''; padScreenInfo(); }
$('padBack').onclick = () => { if (stopSetup) { stopSetup(); stopSetup = null; } $('padscreen').classList.add('hidden'); };
$('padSetup').onclick = () => {
  if (stopSetup) stopSetup();
  stopSetup = runSetup(pad, $('padscreen'), () => { stopSetup = null; game.toast('🎮 Buttons saved!'); padScreenInfo(); });
};
$('padReset').onclick = () => { pad.reset(); $('padStep').textContent = 'Back to the standard layout.'; padScreenInfo(); };
for (const id of ['padOpen', 'padOpen2']) if ($(id)) $(id).onclick = openPadScreen;

// touch controls
const touch = { mx: 0, my: 0, btn: new Set(), pressed: new Set(), stickId: null, lookId: null, lx: 0, ly: 0, lookX: 0, lookY: 0 };
if (isTouch) {
  const stick = $('stick'), knob = $('knob');
  const setStick = (t) => {
    const r = stick.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    touch.mx = dx; touch.my = -dy; knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
  };
  stick.addEventListener('touchstart', (e) => { e.preventDefault(); audio.init(); touch.stickId = e.changedTouches[0].identifier; setStick(e.changedTouches[0]); }, { passive: false });
  stick.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === touch.stickId) setStick(t); }, { passive: false });
  const endStick = (e) => { for (const t of e.changedTouches) if (t.identifier === touch.stickId) { touch.stickId = null; touch.mx = touch.my = 0; knob.style.transform = ''; } };
  stick.addEventListener('touchend', endStick); stick.addEventListener('touchcancel', endStick);
  // camera joystick: push it and the view keeps turning, faster the further you push
  const lstick = $('lstick'), lknob = $('lknob');
  const setLook = (t) => {
    const r = lstick.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    touch.lookX = dx; touch.lookY = dy; lknob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
  };
  lstick.addEventListener('touchstart', (e) => { e.preventDefault(); audio.init(); touch.lookId = e.changedTouches[0].identifier; setLook(e.changedTouches[0]); }, { passive: false });
  lstick.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === touch.lookId) setLook(t); }, { passive: false });
  const endLook = (e) => { for (const t of e.changedTouches) if (t.identifier === touch.lookId) { touch.lookId = null; touch.lookX = touch.lookY = 0; lknob.style.transform = ''; } };
  lstick.addEventListener('touchend', endLook); lstick.addEventListener('touchcancel', endLook);
  for (const b of document.querySelectorAll('#tbtns button, #tfire')) {
    const k = b.dataset.k;
    // AIM and FIRE can also be held and dragged to nudge the aim
    const drag = k === 'aim' || k === 'fire';
    let id = null, lx = 0, ly = 0;
    b.addEventListener('touchstart', (e) => {
      e.preventDefault(); audio.init(); touch.btn.add(k); touch.pressed.add(k); b.classList.add('on');
      const t = e.changedTouches[0]; id = t.identifier; lx = t.clientX; ly = t.clientY;
    }, { passive: false });
    if (drag) b.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === id) {
        const sens = player.aiming ? 0.0045 : 0.006;
        cam.yaw -= (t.clientX - lx) * sens; cam.pitch -= (t.clientY - ly) * sens * 0.85;
        cam.pitch = Math.max(-1.2, Math.min(0.7, cam.pitch));
        lx = t.clientX; ly = t.clientY; cam.lastLook = performance.now(); touch.dragT = performance.now();
      }
    }, { passive: false });
    const up = (e) => { e.preventDefault(); touch.btn.delete(k); b.classList.remove('on'); id = null; };
    b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
  }
  $('tpause').addEventListener('click', () => togglePause());
}

// turn the camera from the touch camera joystick: a gentle curve so small pushes give fine control
const padLook = { x: 0, y: 0 };
function lookStick(dt) {
  const x = touch.lookX || padLook.x, y = touch.lookY || padLook.y;
  if (!x && !y) return;
  const curve = (v) => Math.sign(v) * Math.max(0, Math.abs(v) - 0.08) ** 1.6;
  const slow = player.aiming ? (WEAPONS[player.weapon].zoom ? 0.3 : 0.55) : 1;
  cam.yaw -= curve(x) * 3.2 * slow * dt;
  cam.pitch = Math.max(-1.2, Math.min(0.7, cam.pitch - curve(y) * 1.9 * slow * dt));
  cam.lastLook = performance.now(); touch.dragT = performance.now();
}
function readInput() {
  const k = (c) => keys.has(c), p = (c) => pressed.has(c);
  const inp = {
    mx: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0),
    my: (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0),
    sprint: k('ShiftLeft') || k('ShiftRight'),
    jump: k('Space'), jumpPressed: p('Space'),
    fire: mouse.l, firePressed: mouse.lp, aim: mouse.r,
    enter: p('KeyF') || p('Enter'), power: p('KeyQ'), weapon: p('Tab') || p('Digit1') || p('Digit2'),
    crouch: k('ControlLeft') || k('KeyC') && player.flyT > 0, horn: k('KeyH'), radio: p('KeyR'), gps: p('KeyG'), camera: p('KeyC') && !(player.flyT > 0), mute: p('KeyM'),
  };
  if (isTouch) {
    inp.mx += touch.mx; inp.my += touch.my;
    const b = (x) => touch.btn.has(x), tp = (x) => touch.pressed.has(x);
    if (Math.hypot(touch.mx, touch.my) > 0.95 && !player.car) inp.sprint = true;
    inp.sprint ||= b('sprint'); inp.jump ||= b('jump'); inp.jumpPressed ||= tp('jump');
    inp.fire ||= b('fire'); inp.firePressed ||= tp('fire'); inp.aim ||= b('aim'); inp.aimPressed = tp('aim');
    inp.gps ||= tp('gps');
    inp.enter ||= tp('enter'); inp.power ||= tp('power'); inp.weapon ||= tp('weapon'); inp.horn ||= b('horn');
    if (tp('horn') && player.car) inp.radio = true;
    inp.hand = b('hand');
    if (player.car) { if (b('sprint')) inp.my = Math.max(inp.my, 1); if (b('jump')) inp.my = Math.min(inp.my, -1); }
  }
  // game controller
  const g = pad.state;
  if (g && game.playing && !game.paused && !game.shopOpen) {
    const P = g.pressed;
    inp.mx += g.mx; inp.my += g.my;
    padLook.x = g.lx; padLook.y = g.ly;
    if (player.car) {
      // triggers are the pedals; A is the handbrake, B the horn
      if (g.fire > 0.08) inp.my = Math.max(inp.my, g.fire);
      if (g.aim > 0.08) inp.my = Math.min(inp.my, -g.aim);
      inp.hand ||= g.jump > 0.5; inp.horn ||= g.sprint > 0.5;
    } else {
      inp.fire ||= g.fire > 0.3; inp.firePressed ||= g.fire > 0.3 && !game._gpRt; inp.aim ||= g.aim > 0.3; inp.aimPressed ||= g.aim > 0.3 && !game._gpLt;
      inp.jump ||= g.jump > 0.5; inp.jumpPressed ||= P.jump;
      inp.sprint ||= g.sprint > 0.5 || g.l3 > 0.5;
      inp.crouch ||= g.down > 0.5 && player.flyT > 0;
    }
    game._gpRt = g.fire > 0.3; game._gpLt = g.aim > 0.3;
    inp.enter ||= P.enter; inp.power ||= P.power; inp.weapon ||= P.weapon || P.right;
    inp.gps ||= P.gps || P.left; inp.camera ||= P.camera; inp.radio ||= P.radio;
    if (P.down && player.car) inp.horn = true;
    if (P.pause || P.back) togglePause();
    if (g.any) usingPad(true);
  } else { padLook.x = padLook.y = 0; }
  inp.mx = Math.max(-1, Math.min(1, inp.mx)); inp.my = Math.max(-1, Math.min(1, inp.my));
  inp.powerPressed = inp.power;
  inp.anyKey = pressed.size > 0 || mouse.lp || touch.pressed.size > 0 || !!game._tapSkip || !!(pad.state && pad.state.any); game._tapSkip = false;
  pressed.clear(); mouse.lp = false; touch.pressed.clear();
  return inp;
}

// ---------------- touch lock-on ----------------
// On phones, holding AIM gently swings the aim onto the nearest threat in front of you.
// Dragging your thumb always wins; the lock comes back half a second after you stop.
let lockTarget = null;
function updateLockOn(dt) {
  lockTarget = null;
  if (!isTouch || !player.aiming || player.car || player.dead) return;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  let best = null, bs = Infinity;
  for (const p of peds.list) {
    if (p.state === 'dead' || p.state === 'held') continue;
    const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz);
    if (d < 1.5 || d > 38) continue;
    const cos = (dx * fx + dz * fz) / d;
    if (cos < 0.82) continue; // within about 35 degrees of where you're facing
    if (world.blocked(player.x, player.z, p.x, p.z, 1.3)) continue;
    const threat = p.thug || p.cop || p.aggro ? 0.5 : 1;
    const score = (d * 0.04 + (1 - cos) * 6) * threat;
    if (score < bs) { bs = score; best = p; }
  }
  if (!best) return;
  lockTarget = best;
  if (performance.now() - (touch.dragT || 0) < 600) return;
  const dx = best.x - player.x, dz = best.z - player.z, dy = (best.y + 1.1) - (player.y + 1.5);
  const wantYaw = Math.atan2(dx, dz), wantPitch = Math.atan2(dy, Math.hypot(dx, dz)) - 0.05;
  let dyaw = wantYaw - cam.yaw; while (dyaw > Math.PI) dyaw -= Math.PI * 2; while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  const k = Math.min(1, dt * 7);
  cam.yaw += dyaw * k; cam.pitch += (wantPitch - cam.pitch) * k;
}

// ---------------- camera ----------------
function updateCamera(dt, inp) {
  const c = player.car;
  let tx, ty, tz, dist;
  const now = performance.now();
  if (c) {
    tx = c.x; ty = c.y + 1.7; tz = c.z;
    dist = (cam.far ? 11 : 7.2) + Math.min(5, c.speed * 0.08);
    if (now - cam.lastLook > 1400) {
      let want = c.heading + (c.vf < -2 ? Math.PI : 0);
      let da = want - cam.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      cam.yaw += da * Math.min(1, dt * (1.5 + c.speed * 0.08));
      cam.pitch += (-0.2 - cam.pitch) * Math.min(1, dt * 2);
    }
    camera.fov += ((62 + Math.min(18, c.speed * 0.35)) - camera.fov) * Math.min(1, dt * 3);
  } else {
    tx = player.x; ty = player.y + 1.55; tz = player.z;
    dist = player.aiming ? (WEAPONS[player.weapon].zoom ? 1.6 : 2.6) : (cam.far ? 7.5 : 4.4);
    if (player.flyT > 0) dist = 7;
    const zoom = player.aiming && WEAPONS[player.weapon].zoom;
    camera.fov += ((zoom || (player.aiming ? 50 : 62)) - camera.fov) * Math.min(1, dt * 8);
  }
  camera.updateProjectionMatrix();
  cam.dist += (dist - cam.dist) * Math.min(1, dt * 5);
  const fx = Math.sin(cam.yaw) * Math.cos(cam.pitch), fy = Math.sin(cam.pitch), fz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  const side = player.aiming && !c ? 0.75 : 0;
  const rx = -Math.cos(cam.yaw), rz = Math.sin(cam.yaw);
  const ox = tx + rx * side, oz = tz + rz * side;
  // pull the camera in front of walls
  let d = cam.dist;
  for (let t = 0.5; t <= cam.dist; t += 0.35) {
    const x = ox - fx * t, y = ty - fy * t, z = oz - fz * t;
    let hit = y < 0.3;
    if (!hit) for (const b of world.nearby(x, z, 0.3)) if (!b.circle && y < b.h + 0.3 && x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3) { hit = true; break; }
    if (hit) { d = Math.max(0.6, t - 0.4); break; }
  }
  camera.position.set(ox - fx * d, Math.max(0.4, ty - fy * d), oz - fz * d);
  if (game.inside) { const B = flat.bounds; camera.position.x = Math.min(B.x1 - 0.25, Math.max(B.x0 + 0.25, camera.position.x)); camera.position.z = Math.min(B.z1 - 0.25, Math.max(B.z0 + 0.25, camera.position.z)); camera.position.y = Math.min(B.h - 0.3, camera.position.y); }
  if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt * 1.5); camera.position.x += (Math.random() - 0.5) * cam.shake; camera.position.y += (Math.random() - 0.5) * cam.shake; }
  camera.lookAt(ox + fx * 10, ty + fy * 10, oz + fz * 10);
}

// ---------------- day / night ----------------
const C = (h) => new THREE.Color(h);
const PAL = {
  day: { top: C('#2f6fd0'), hor: C('#cfe2f2'), fog: C('#c4d4e2'), sun: C('#fff1d6'), hemi: 1.5, sunI: 2.8 },
  dusk: { top: C('#2a3a78'), hor: C('#ff9a5a'), fog: C('#c78a6e'), sun: C('#ffb070'), hemi: 0.9, sunI: 1.6 },
  night: { top: C('#03060f'), hor: C('#1a2440'), fog: C('#141a2c'), sun: C('#8aa0ff'), hemi: 0.4, sunI: 0.35 },
};
const lerpC = (a, b, t) => a.clone().lerp(b, t);
function updateSky(dt) {
  game.time = (game.time + dt * 1.0) % 1440; // 1 real second = 1 game minute
  const dayT = game.time / 1440;
  const ang = dayT * Math.PI * 2 - Math.PI / 2; // 6:00 = sunrise
  const sd = new THREE.Vector3(Math.cos(ang) * 0.7, Math.sin(ang), 0.45).normalize();
  const elev = sd.y;
  const night = THREE.MathUtils.smoothstep(-elev, -0.02, 0.22);
  const dusk = 1 - THREE.MathUtils.smoothstep(Math.abs(elev), 0.0, 0.35);
  game.night = night;
  let pal = {};
  for (const k of ['top', 'hor', 'fog', 'sun']) pal[k] = lerpC(lerpC(PAL.day[k], PAL.dusk[k], dusk), PAL.night[k], night);
  // weather greys the sky, thickens the fog and dims the sun
  const wv = weather.v;
  const grey = lerpC(C('#8d959e'), C('#16191e'), night);
  pal.top.lerp(grey, wv.cloud * 0.72); pal.hor.lerp(grey, wv.cloud * 0.45);
  pal.fog.lerp(lerpC(grey, lerpC(C('#c9ced3'), C('#2a2e34'), night), 1 - wv.fog), Math.max(wv.cloud * 0.6, 1 - wv.fog));
  skyU.cover.value = wv.cloud; skyU.flash.value = weather.flash * 0.6;
  const fd = Math.pow(wv.fog, 1.5);
  scene.fog.near = 8 + 112 * fd; scene.fog.far = 45 + 475 * fd;
  // in thick fog the sky disappears into it too
  const fogSky = (1 - wv.fog) * 0.85; pal.top.lerp(pal.fog, fogSky); pal.hor.lerp(pal.fog, Math.min(1, fogSky * 1.15));
  skyU.top.value.copy(pal.top); skyU.horizon.value.copy(pal.hor); skyU.bottom.value.copy(pal.fog).multiplyScalar(0.6);
  skyU.sunDir.value.copy(sd); skyU.sunCol.value.copy(pal.sun); skyU.night.value = night; skyU.time.value = performance.now() / 1000;
  scene.fog.color.copy(pal.fog);
  hemi.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(PAL.day.hemi, PAL.dusk.hemi, dusk), PAL.night.hemi, night);
  hemi.color.copy(pal.top).lerp(C('#ffffff'), 0.5);
  hemi.intensity = hemi.intensity * (0.72 + 0.28 * wv.light) + weather.flash * 4;
  // the moon takes over the directional light at night
  const lightDir = elev > -0.05 ? sd : sd.clone().negate();
  sun.color.copy(pal.sun);
  sun.intensity = elev > -0.05 ? THREE.MathUtils.lerp(0.4, PAL.day.sunI, THREE.MathUtils.smoothstep(elev, -0.05, 0.3)) * (1 - dusk * 0.3) : 0.5;
  sun.intensity *= wv.light;
  const focus = player.car ? player.car : player;
  // snap the shadow camera to texels to stop shimmering
  const step = 150 / sun.shadow.mapSize.x;
  const fxp = Math.round(focus.x / step) * step, fzp = Math.round(focus.z / step) * step;
  sun.target.position.set(fxp, 0, fzp);
  sun.position.set(fxp + lightDir.x * 250, lightDir.y * 250, fzp + lightDir.z * 250);
  if (bloom) bloom.strength = 0.25 + night * 0.55;
  sky.position.copy(camera.position);
  renderer.toneMappingExposure = 1.0 + night * 0.25;
  if (Math.abs(night - envNight) > 0.12 || Math.abs(wv.cloud - envCloud) > 0.2 || !scene.environment) { envCloud = wv.cloud; refreshEnv(night); }
  // clock
  const hh = Math.floor(game.time / 60), mm = Math.floor(game.time % 60);
  setText('clock', `${WEATHERS[weather.id].icon} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
}

// reflections: bake the current sky into a PMREM environment map
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), sky.material);
envScene.add(envSky);
const envGround = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: '#4a4c50' }));
envGround.rotation.x = -Math.PI / 2; envGround.position.y = -2; envScene.add(envGround);
let envNight = -1, envRT = null, envCloud = 0;
function refreshEnv(night) {
  envNight = night;
  envGround.material.color.setScalar(0.25 * (1 - night) + 0.02);
  const rt = pmrem.fromScene(envScene, 0.02, 0.1, 500);
  if (envRT) envRT.dispose();
  envRT = rt; scene.environment = rt.texture;
}

// ---------------- raindrops on the lens ----------------
const lens = $('lens'), lctx = lens.getContext('2d');
const drops = [];
function updateLens(dt, rain) {
  if (quality !== 'high') { if (drops.length) { drops.length = 0; lctx.clearRect(0, 0, lens.width, lens.height); } return; }
  const W = Math.round(window.innerWidth / 2), H = Math.round(window.innerHeight / 2);
  if (lens.width !== W || lens.height !== H) { lens.width = W; lens.height = H; }
  if (!drops.length && rain <= 0.2) return;
  if (rain > 0.2 && cam.pitch > -0.6 && Math.random() < dt * rain * 14) drops.push({ x: Math.random() * W, y: Math.random() * H * 0.8, r: 3 + Math.random() * 7, life: 2 + Math.random() * 3, vy: 0 });
  lctx.clearRect(0, 0, W, H);
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.life -= dt; if (d.r > 6) { d.vy += dt * 20; d.y += d.vy * dt; }
    if (d.life <= 0 || d.y > H + 10) { drops.splice(i, 1); continue; }
    const a = Math.min(1, d.life);
    const g = lctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.1, d.x, d.y, d.r);
    g.addColorStop(0, `rgba(255,255,255,${0.35 * a})`); g.addColorStop(0.6, `rgba(200,220,240,${0.12 * a})`); g.addColorStop(1, `rgba(40,60,80,${0.25 * a})`);
    lctx.fillStyle = g; lctx.beginPath(); lctx.ellipse(d.x, d.y, d.r * 0.85, d.r, 0, 0, 7); lctx.fill();
    if (d.vy > 0) { lctx.fillStyle = `rgba(220,235,250,${0.12 * a})`; lctx.fillRect(d.x - d.r * 0.25, d.y - d.vy * 0.6, d.r * 0.5, d.vy * 0.6); }
  }
}

// ---------------- weather ----------------
let lastWet = -1, lastWeatherId = 'clear', rainbowT = 0;
game.showRainbow = (t = 150) => { rainbowT = t; };
function updateWeather(dt) {
  const changed = weather.update(dt, camera.position, () => audio.thunder((game.inside ? 0.25 : 0.5) + Math.random() * 0.2));
  if (game.inside) { weather.rain.visible = false; weather.snow.visible = false; }
  if (changed) { if ((lastWeatherId === 'rain' || lastWeatherId === 'storm') && changed !== 'rain' && changed !== 'storm') rainbowT = 150; lastWeatherId = changed; }
  rainbowT = Math.max(0, rainbowT - dt);
  skyU.rainbow.value += ((rainbowT > 0 && changed !== 'rain' ? Math.min(1, rainbowT / 20) : 0) - skyU.rainbow.value) * Math.min(1, dt * 0.5);
  if (changed && game.playing) { game.toast(`${WEATHERS[changed].icon} Weather: ${WEATHERS[changed].name}`); if (!game.inside) game.quip({ rain: 'rain', storm: 'rain', snow: 'snow', clear: 'sun', haar: 'fog' }[changed], 0.7); }
  const wv = weather.v;
  const wet = Math.min(1, wv.wet);
  const key = wet + wv.snow * 10;
  if (Math.abs(key - lastWet) > 0.01) { lastWet = key; world.setWet(wet, wv.snow); }
  game.grip = 1 - wet * 0.16 - wv.snow * 0.3;
  game.weatherDark = wv.light < 0.62;
  updateLens(dt, game.inside || player.car ? 0 : wv.rain); // slidier in the wet, worse in the snow
  audio.setRain(game.inside ? wv.rain * 0.25 : wv.rain, !!player.car);
  // raindrops splashing on the ground around Wally
  if (wv.rain > 0.15 && quality === 'high' && !game.inside) {
    const n = Math.floor(wv.rain * dt * 70 + Math.random());
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, d = 2 + Math.random() * 16;
      const x = camera.position.x + Math.cos(a) * d, z = camera.position.z + Math.sin(a) * d;
      const y = world.groundHeight(x, z, 0.5);
      if (y > -1) puff(x, y + 0.05, z, { color: '#dfe8f0', life: 0.25, size: 0.12, grow: 2.5, vy: 0.3, vx: 0, vz: 0, opacity: 0.5 });
    }
  }
}
game.setWeather = (id) => weather.set(id, true);

// ---------------- radar ----------------
const RAD = $('radar'), rctx = RAD.getContext('2d');
const mapK = 1.2, mapSize = Math.ceil(ISLAND * 2 * mapK);
const mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = mapSize;
(() => {
  const m = mapCanvas.getContext('2d');
  m.fillStyle = '#5f6b75'; m.fillRect(0, 0, mapSize, mapSize);
  const X = (x) => (x + ISLAND) * mapK;
  for (const b of world.blocks) {
    m.fillStyle = b.kind === 'park' ? '#4f8a3a' : (b.kind === 'plaza' ? '#b8aa88' : (b.kind === 'docks' ? '#6f6250' : '#8b8f94'));
    m.fillRect(X(b.x0), X(b.z0), (b.x1 - b.x0) * mapK, (b.z1 - b.z0) * mapK);
  }
  m.fillStyle = '#3d434a';
  for (const b of world.buildings) if (!b.circle && b.h > 2 && (b.x1 - b.x0) > 3) m.fillRect(X(b.x0), X(b.z0), (b.x1 - b.x0) * mapK, (b.z1 - b.z0) * mapK);
  m.strokeStyle = '#1f2f3f'; m.lineWidth = 3; m.strokeRect(1, 1, mapSize - 2, mapSize - 2);
})();
const BLIPC = { enemy: '#ff3b30', target: '#4aa3ff', cop: '#2f6dff', mission: '#ffd23f', dest: '#ffd23f', check: '#ff4fb8', ghost: '#ff4fb880', home: '#5fe36a', garage: '#ff9a3c' };
// Manhattan route over the road grid: to the nearest junction, along one road, then the other
function gpsRoute(px, pz, tx, tz) {
  const [ai, aj] = world.nearestNode(px, pz), [bi, bj] = world.nearestNode(tx, tz);
  const pts = [[px, pz]];
  if (ai !== bi || aj !== bj) {
    pts.push([roadC(ai), roadC(aj)]);
    if (Math.abs(tx - px) > Math.abs(tz - pz)) pts.push([roadC(bi), roadC(aj)]); else pts.push([roadC(ai), roadC(bj)]);
    pts.push([roadC(bi), roadC(bj)]);
  }
  pts.push([tx, tz]);
  return pts;
}
game.setGps = (x, z) => { game.gps = x == null ? null : { x, z }; };
// places you can set the GPS to (G key, GPS button, or tap the radar)
let userGps = -1;
function gpsPlaces() {
  const S = world.specials, list = [
    { name: 'Home', x: S.home.x, z: S.home.z - 2 },
    { name: "Granda's Armoury", x: game.shopPos.x, z: game.shopPos.z },
  ];
  if (missionMarker && !game.mission) list.push({ name: 'Next mission', x: missionMarker.x, z: missionMarker.z });
  list.push({ name: 'Wally Wash', x: S.garage.x, z: S.garage.z - 6 }, { name: 'Infirmary', x: S.hospital.x, z: S.hospital.z }, { name: 'Polis Station', x: S.police.x, z: S.police.z });
  return list;
}
function cycleGps() {
  if (game.inside) { game.toast('Nae signal in here.'); return; }
  const list = gpsPlaces();
  userGps = userGps + 1 >= list.length ? -1 : userGps + 1;
  game.toast(userGps < 0 ? '🧭 GPS: off' : `🧭 GPS: ${list[userGps].name}`);
  audio.tone(880, 0.08, 'sine', 0.08); audio.tone(1320, 0.1, 'sine', 0.06, 0, 0.08);
}
function userGpsTarget() {
  if (userGps < 0) return null;
  const list = gpsPlaces(), p = list[Math.min(userGps, list.length - 1)];
  const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
  if (Math.hypot(p.x - px, p.z - pz) < 12) { userGps = -1; game.toast(`🧭 You have arrived at ${p.name}. Probably.`); return null; }
  return p;
}
function drawRadar() {
  const W = RAD.width, c = W / 2, s = 1.1 * (W / 190) / 1.15;
  const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -fz, rz = fx;
  rctx.setTransform(1, 0, 0, 1, 0, 0);
  rctx.fillStyle = '#2d5f86'; rctx.fillRect(0, 0, W, W);
  const k = mapK;
  rctx.setTransform(s * rx / k, -s * fx / k, s * rz / k, -s * fz / k,
    c + s * rx * (-ISLAND - px) + s * rz * (-ISLAND - pz), c - s * fx * (-ISLAND - px) - s * fz * (-ISLAND - pz));
  rctx.drawImage(mapCanvas, 0, 0);
  rctx.setTransform(1, 0, 0, 1, 0, 0);
  const toR = (x, z) => { const dx = x - px, dz = z - pz; return [c + s * (dx * rx + dz * rz), c - s * (dx * fx + dz * fz)]; };
  const dot = (x, z, col, r = 7, clamp = true, shape) => {
    let [sx, sy] = toR(x, z);
    const dx = sx - c, dy = sy - c, l = Math.hypot(dx, dy), lim = c - 12;
    if (l > lim) { if (!clamp) return; sx = c + dx / l * lim; sy = c + dy / l * lim; }
    rctx.fillStyle = col; rctx.strokeStyle = '#000'; rctx.lineWidth = 3;
    rctx.beginPath();
    if (shape === 'sq') rctx.rect(sx - r, sy - r, r * 2, r * 2); else rctx.arc(sx, sy, r, 0, 7);
    rctx.fill(); rctx.stroke();
  };
  // specials
  // GPS route along the roads to the current target
  const tgt = game.gps || (game.mission && !game.inside && game.autoRoute) || (game.inside ? null : userGpsTarget());
  if (tgt) {
    const pts = gpsRoute(px, pz, tgt.x, tgt.z).map(([x, z]) => toR(x, z));
    rctx.save(); rctx.beginPath(); rctx.arc(c, c, c - 2, 0, 7); rctx.clip();
    rctx.lineJoin = 'round'; rctx.lineCap = 'round';
    for (const [w, col] of [[13, '#000'], [8, '#c86bff']]) {
      rctx.strokeStyle = col; rctx.lineWidth = w; rctx.beginPath();
      pts.forEach(([x, y], i) => (i ? rctx.lineTo(x, y) : rctx.moveTo(x, y))); rctx.stroke();
    }
    rctx.restore();
    const dist = Math.round(Math.hypot(tgt.x - px, tgt.z - pz));
    const label = (game.gps || (game.mission && game.autoRoute)) ? 'GPS' : (tgt.name.length > 12 ? tgt.name.split(' ').pop() : tgt.name);
    rctx.font = 'bold 26px Oswald, sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
    rctx.strokeStyle = '#000'; rctx.lineWidth = 6; rctx.fillStyle = '#e7c6ff';
    rctx.strokeText(`${label} ${dist}m`, c, W - 44); rctx.fillText(`${label} ${dist}m`, c, W - 44);
  }
  // labelled icons for the important places; the key ones stick to the rim when off the map
  const icon = (x, z, col, letter, clamp, pulse, ox = 0, oy = 0) => {
    let [sx, sy] = toR(x, z); sx += ox; sy += oy;
    const dx = sx - c, dy = sy - c, l = Math.hypot(dx, dy), lim = c - 16;
    if (l > lim) { if (!clamp) return; sx = c + dx / l * lim; sy = c + dy / l * lim; }
    const r = 13 + (pulse ? Math.sin(performance.now() / 180) * 2 : 0);
    rctx.fillStyle = col; rctx.strokeStyle = '#000'; rctx.lineWidth = 3;
    rctx.beginPath(); rctx.arc(sx, sy, r, 0, 7); rctx.fill(); rctx.stroke();
    rctx.fillStyle = '#fff'; rctx.font = 'bold 17px Oswald, sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
    rctx.lineWidth = 3; rctx.strokeText(letter, sx, sy + 1); rctx.fillText(letter, sx, sy + 1);
  };
  const S = world.specials;
  icon(S.hospital.x, S.hospital.z, '#d63031', '+', false);
  icon(S.police.x, S.police.z, '#2f6dff', 'P', false);
  icon(S.garage.x, S.garage.z - 6, '#e67e22', 'W', true);
  if (game.shopPos) icon(game.shopPos.x, game.shopPos.z, '#8e1b1b', 'A', true);
  const mOn = missionMarker && !game.mission, together = mOn && Math.hypot(missionMarker.x - S.home.x, missionMarker.z - S.home.z) < 20;
  icon(S.home.x, S.home.z, '#27ae60', 'H', true, false, together ? -13 : 0);
  if (mOn) icon(missionMarker.x, missionMarker.z, '#e1a500', 'M', true, true, together ? 13 : 0);
  for (const car of cars) if (car.type === 'police' && car.driver === 'cop') dot(car.x, car.z, (Math.floor(performance.now() / 200) % 2) ? '#ff2f2f' : '#2f6dff', 6, false);
  for (const p of peds.list) if (p.cop && p.state !== 'dead' && game.wanted.level) dot(p.x, p.z, '#2f6dff', 4, false);
  for (const b of game.staticBlips || []) {
    if (b.shape === 'tri') { let [sx, sy] = toR(b.x, b.z); if (Math.hypot(sx - c, sy - c) > c - 12) continue; rctx.fillStyle = b.col; rctx.strokeStyle = '#000'; rctx.lineWidth = 3; rctx.beginPath(); rctx.moveTo(sx, sy - 8); rctx.lineTo(sx + 7, sy + 6); rctx.lineTo(sx - 7, sy + 6); rctx.closePath(); rctx.fill(); rctx.stroke(); }
    else dot(b.x, b.z, b.col, 7, false, 'sq');
  }
  for (const p of game.pickups) if ((p.kind === 'weapon' || p.kind === 'crate') && !(p.gone > 0) && Math.abs(p.x - px) < 90 && Math.abs(p.z - pz) < 90) dot(p.x, p.z, p.kind === 'crate' ? '#c9a23a' : '#ffd23f', 4, false, 'sq');
  for (const m of game.markers) if (m.type !== 'mission' && !m.persistent) dot(m.x, m.z, BLIPC[m.type] || '#fff', m.type === 'ghost' ? 6 : 9);
  for (const b of game.blips) { const o = b.obj; if (o.dead || o.state === 'dead') continue; dot(o.x, o.z, BLIPC[b.kind] || '#fff', 7); }
  // north
  const [nx, ny] = toR(px, pz - 1000); const nd = Math.hypot(nx - c, ny - c);
  const nX = c + (nx - c) / nd * (c - 16), nY = c + (ny - c) / nd * (c - 16);
  rctx.fillStyle = '#fff'; rctx.font = 'bold 22px Oswald, sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
  rctx.strokeStyle = '#000'; rctx.lineWidth = 4; rctx.strokeText('N', nX, nY); rctx.fillText('N', nX, nY);
  // player arrow
  const hd = player.car ? player.car.heading : player.heading;
  const hx = Math.sin(hd), hz = Math.cos(hd);
  const ax = hx * rx + hz * rz, ay = -(hx * fx + hz * fz);
  const ang = Math.atan2(ay, ax);
  rctx.save(); rctx.translate(c, c); rctx.rotate(ang);
  rctx.fillStyle = '#fff'; rctx.strokeStyle = '#000'; rctx.lineWidth = 3;
  rctx.beginPath(); rctx.moveTo(14, 0); rctx.lineTo(-9, -9); rctx.lineTo(-4, 0); rctx.lineTo(-9, 9); rctx.closePath(); rctx.fill(); rctx.stroke();
  rctx.restore();
}

// ---------------- zones ----------------
function zoneName(x, z) {
  if (game.inside) return "Wally's Flat";
  if (Math.abs(x) > HALF + 4 || Math.abs(z) > HALF + 4) return 'The Prom';
  const bx = Math.floor((x + HALF) / P), bz = Math.floor((z + HALF) / P);
  const b = world.blocks[Math.max(0, Math.min(N - 1, bx)) * N + Math.max(0, Math.min(N - 1, bz))];
  if (b.kind === 'docks') return 'Clydeside Docks';
  if (b.kind === 'park') return 'Neep Park';
  if (b.kind === 'plaza') return 'Hero Square';
  if (Math.hypot(x, z) < HALF * 0.45) return 'Downtown Wallypool';
  if (x < 0 && z < 0) return 'Haggis Heights';
  if (x >= 0 && z < 0) return 'Tannadice';
  if (x < 0) return 'Bawheid Brae';
  return 'Shortbread Shore';
}
let lastZone = '';

// ---------------- missions ----------------
let missionMarker = null;
function placeMissionMarker() {
  if (missionMarker) { scene.remove(missionMarker.obj); game.markers = game.markers.filter((m) => m !== missionMarker); missionMarker = null; }
  if (game.mission || game.missionIdx >= MISSIONS.length) return;
  const [x, z] = missionStartPoint(world);
  missionMarker = game.marker(x, z - 1.5, 'mission', 1.6);
}
function startMission() {
  const m = MISSIONS[game.missionIdx];
  game.mission = m;
  placeMissionMarker();
  game.bigText(m.title.toUpperCase(), `Mission ${game.missionIdx + 1} of ${MISSIONS.length}`, 2.8);
  game.subs(m.intro);
  m.start(game);
}
function failMission() {
  if (!game.mission) return;
  game.mission.end(game);
  game.mission = null; game.autoRoute = null; game.objective(''); game.setGps(null);
  setTimeout(() => { if (!player.dead) game.bigText('MISSION FAILED!', 'Hopeless.', 2.5, true); }, 4400);
  placeMissionMarker();
}
// missions that don't steer the GPS themselves get a route to their nearest marker or target
function autoGps() {
  const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
  let best = null, bd = 1e9;
  for (const m of game.markers) {
    if (m.type === 'mission' || m.type === 'ghost' || m.type === 'pickup' || m.persistent || !m.obj.visible) continue;
    const d = Math.hypot(m.x - px, m.z - pz); if (d < bd) { bd = d; best = m; }
  }
  if (!best) for (const b of game.blips) {
    const o = b.obj; if (o.dead || o.state === 'dead' || o.health <= 0) continue;
    const d = Math.hypot(o.x - px, o.z - pz); if (d < bd) { bd = d; best = o; }
  }
  return best ? { x: best.x, z: best.z } : null;
}
function updateMission(dt) {
  if (game.mission) {
    game.autoRoute = null;
    const r = game.mission.update(dt, game);
    if (game.mission && !game.gps) game.autoRoute = autoGps();
    if (r === 'pass') {
      const m = game.mission; m.end(game); game.mission = null; game.objective(''); game.setGps(null);
      player.money += m.reward; game.missionIdx++; audio.pass(); game.quip('pass', 1, true);
      game.bigText('MISSION PASSED!', `+$${m.reward}`, 3.5);
      if (game.missionIdx >= MISSIONS.length) setTimeout(() => game.bigText('WALLYPOOL IS SAFE', '(ish). Thanks for playing! Keep exploring.', 5), 4000);
      placeMissionMarker(); save();
    } else if (r === 'fail') {
      audio.fail(); failMission(); game.quip('fail', 1, true);
    }
  } else if (missionMarker && !player.dead) {
    const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
    if (game.inMarker(missionMarker, px, pz)) startMission();
  }
}

// ---------------- save ----------------
function save(bed) {
  store.set('wta-save', { v: 2, slept: !!(bed || (store.get('wta-save', {}) || {}).slept), money: player.money, missionIdx: game.missionIdx, specs: game.collected || [], weapons: Object.keys(player.owned), ammoOf: player.ammoOf, stats: game.stats, time: game.time, outfit: player.outfit, extra: content.save() });
}
// Wally never leaves the house without his Highland Rifle
function defaultWeapon(equip) {
  player.owned.rifle = true;
  player.ammoOf.rifle = Math.max(player.ammoOf.rifle || 0, 90);
  if (equip) player.weapon = 'rifle';
}
function load(fresh) {
  const s = fresh ? {} : store.get('wta-save', {});
  player.money = s.money || 0; game.missionIdx = s.missionIdx || 0;
  if (!s.v) game.missionIdx = 0; // mission 1 is new (Pamazon), so older saves start the story again
  game.collected = s.specs || [];
  player.loseWeapons();
  for (const w of s.weapons || []) player.owned[w] = true;
  Object.assign(player.ammoOf, s.ammoOf || {});
  if (s.hasBlaster) { player.owned.blaster = true; player.ammoOf.blaster += s.ammo || 0; } // saves from v1.1 and earlier
  defaultWeapon(true);
  if (s.stats) Object.assign(game.stats, s.stats);
  player.setOutfit(s.outfit || 0, game);
  content.load(s.extra);
  game.stats.specs = game.collected.length;
  if (s.time) game.time = s.time;
  return s;
}

// ---------------- main update ----------------
function updatePickups(dt) {
  const px = player.x, py = player.y, pz = player.z;
  for (const p of game.pickups) {
    if (p.gone > 0) { p.gone -= dt; if (p.gone <= 0) p.obj.visible = true; continue; }
    const pd = Math.abs(p.x - px) + Math.abs(p.z - pz);
    const far = (p.kind === 'weapon' || p.kind === 'crate') ? 60 : 100;
    p.obj.visible = pd < far;
    if (pd > far) continue;
    p.t += dt; p.obj.rotation.y = p.t * 2; p.obj.position.y = p.y + Math.sin(p.t * 3) * 0.15;
    if (p.obj.userData.ring) p.obj.userData.ring.position.y = -0.75 - Math.sin(p.t * 3) * 0.15;
    if (player.car || player.dead) continue;
    if (Math.abs(p.x - px) < 1.3 && Math.abs(p.z - pz) < 1.3 && Math.abs(p.y - 0.9 - py) < 1.6) {
      if (p.kind === 'health') { if (player.health >= 100) continue; player.health = 100; game.toast('Fizzy ginger juice. Health restored.'); }
      if (p.kind === 'armour') { if (player.armour >= 100) continue; player.armour = 100; game.toast('Body armour. Fits over the onesie.'); }
      if (p.kind === 'cash') { const a = p.amount || 250; player.money += a; audio.cash(); game.quip('cash', 0.12); }
      if (p.kind === 'ammo') { player.giveWeapon('blaster', 30); game.toast('Blaster cells +30'); }
      if (p.kind === 'crate') {
        const got = WEAPON_ORDER.filter((w) => player.owned[w] && usesAmmo(w));
        if (!got.length) { game.toast('An ammo crate! Shame ye\'ve nae guns to put it in.'); continue; }
        for (const w of got) player.ammoOf[w] += Math.ceil((WEAPONS[w].pickup || 10) * 0.6);
        game.toast(`📦 Ammo crate: topped up ${got.length} weapon${got.length > 1 ? 's' : ''}.`);
      }
      if (p.kind === 'weapon') {
        const W = WEAPONS[p.weapon], had = player.owned[p.weapon];
        player.giveWeapon(p.weapon, W.pickup || 0);
        if (!had) { if (WEAPON_QUIPS[p.weapon]) game.quip([WEAPON_QUIPS[p.weapon]], 1, true); else game.quip('pickup', 0.35); }
        game.toast(had ? `${W.icon} ${W.name}${W.pickup ? ` +${W.pickup}` : ''}` : `${W.icon} Picked up the ${W.name}!${W.pickup ? ` (${W.pickup})` : ''} Tab to switch weapons.`);
      }
      audio.pickup();
      if (p.respawn) { p.gone = p.respawn; p.obj.visible = false; }
      else { dropObject(p.obj); p.dead = true; }
    }
  }
  game.pickups = game.pickups.filter((p) => !p.dead);
  for (const s of game.specs) {
    s.obj.rotation.y += dt * 2; s.obj.position.y = s.y + Math.sin(performance.now() / 300 + s.id) * 0.15;
    if (!s.got && Math.hypot(s.x - px, s.z - pz) < 1.4 && Math.abs(s.y - 1.1 - py) < 2 && !player.car) {
      s.got = true; scene.remove(s.obj); game.collected.push(s.id); game.stats.specs = game.collected.length;
      player.money += 100; audio.pass();
      game.bigText('GOLDEN SPECS!', `${game.collected.length} of 20 found`, 2.2); game.quip('specs', 0.8, true);
      if (game.collected.length === 20) { player.money += 10000; game.toast('All 20 Golden Specs! +$10,000. Wally can finally see properly.'); }
      save();
    }
  }
  game.specs = game.specs.filter((s) => !s.got);
}

function updateTraffic(dt) {
  const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
  const civ = cars.filter((c) => c.driver === 'ai').length;
  const parked = cars.filter((c) => c.parked && !c.driver).length;
  if (civ < maxTraffic() && Math.random() < dt * 4) spawnTraffic();
  if (parked < 9 && Math.random() < dt * 2) spawnParked();
  // police response
  const cops = cars.filter((c) => c.type === 'police' && c.driver === 'cop' && c.ai instanceof PoliceAI).length;
  const wantCops = [0, 1, 2, 3, 4, 6][game.wanted.level];
  if (cops < wantCops && Math.random() < dt * 0.6) spawnPolice();
  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i];
    const d = Math.hypot(c.x - px, c.z - pz);
    if (c !== player.car && !c.mission && (d > 210 || (c.dead && c.deadT > 40 && d > 50))) { removeCar(c); continue; }
    if (c.ai && c.driver !== 'player') {
      if (c.ai instanceof PoliceAI && game.wanted.level === 0) {
        // stand down
        const [i2, j2] = world.nearestNode(c.x, c.z); const dirs = DIRS.filter((q) => validDir(i2, j2, q));
        c.ai = new TrafficAI(c, i2, j2, dirs[0]); c.sirenOn = false;
      }
      if (c.health > 0) c.ai.drive(dt, cars, game);
      else { c.input.throttle = 0; c.input.steer = 0; }
      // cops jump out when Wally is on foot nearby
      if (c.ai instanceof PoliceAI && !c.copsOut && d < 16 && c.speed < 4 && (!player.car || player.car.speed < 5)) {
        c.copsOut = true; c.ai = null; c.driver = null; c.sirenOn = true; c.input = { throttle: 0, steer: 0, hand: true };
        c.doorOpen = 1; setTimeout(() => { c.doorOpen = 0; }, 1200);
        // one out of each side
        const [dx, dz] = c.doorPos(), fx = Math.sin(c.heading), fz = Math.cos(c.heading);
        const sides = [[dx, dz], [2 * c.x - dx + fx * 0.6, 2 * c.z - dz + fz * 0.6]];
        sides.forEach(([sx, sz], k) => { const p = game.spawnPed(sx, sz, { cop: true }); p.state = 'chase'; p.aggro = false; if (k === 0) game.say(p, 'Polis! Hands where I can see them!'); });
        audio.door();
      }
    }
    if (c === player.car) {
      const inp = game._inp;
      c.input.throttle = inp.my; c.input.steer = inp.mx; c.input.hand = inp.jump || inp.hand;
      if (inp.horn) { if (!c._hornOn) audio.horn(); c._hornOn = true; game.raiseAlarm(c.x, c.z, 1); } else c._hornOn = false;
    }
    if (c.angryT > 0) c.angryT -= dt;
    if (d < 230) c.update(dt, world, game);
    c.group.visible = d < 260;
    // smoke & flames
    if (c.health < 350 && !c.dead && Math.random() < dt * (c.health <= 0 ? 30 : 8)) {
      const [fx, fz] = c.forward();
      puff(c.x + fx * c.T.len * 0.38, c.y + 1, c.z + fz * c.T.len * 0.38, c.health <= 0 ? { color: Math.random() < 0.5 ? '#ff7a1a' : '#ffb347', add: true, life: 0.6, size: 0.8, vy: 3 } : { color: '#555', life: 1.6, size: 0.6, vy: 2 });
    }
    if (c.dead && Math.random() < dt * 6) puff(c.x, c.y + 1.2, c.z, { color: '#222', life: 3, size: 1, vy: 2.5, grow: 3 });
  }
  if (player.car && player.car.health <= 0 && !player.car.dead && Math.random() < dt * 2) game.toast('Get out, Wally! It\'s gonnae blow!');
  // player car vs other cars
  if (player.car) {
    const a = player.car;
    for (const b of cars) {
      if (b === a || Math.abs(b.x - a.x) > 8 || Math.abs(b.z - a.z) > 8) continue;
      let hit = null;
      for (const [ax, az] of a.circles()) for (const [bx, bz] of b.circles()) {
        const dx = ax - bx, dz = az - bz, dd = Math.hypot(dx, dz), m = a.radius + b.radius;
        if (dd < m && dd > 1e-3 && (!hit || m - dd > hit.pen)) hit = { nx: dx / dd, nz: dz / dd, pen: m - dd };
      }
      if (!hit) continue;
      const ma = a.T.mass, mb = b.T.mass * (b.dead ? 1.5 : 1), tot = ma + mb;
      a.x += hit.nx * hit.pen * mb / tot; a.z += hit.nz * hit.pen * mb / tot;
      b.x -= hit.nx * hit.pen * ma / tot; b.z -= hit.nz * hit.pen * ma / tot;
      const rv = (a.vx - b.vx) * hit.nx + (a.vz - b.vz) * hit.nz;
      if (rv < 0) {
        const j = -(1.3) * rv / (1 / ma + 1 / mb);
        a.vx += j * hit.nx / ma; a.vz += j * hit.nz / ma; b.vx -= j * hit.nx / mb; b.vz -= j * hit.nz / mb;
        const imp = -rv;
        if (imp > 2) { audio.crash(imp); cam.shake = Math.min(0.5, imp * 0.03); a.damage(imp * imp * 0.8, game); b.damage(imp * imp * 1.0, game); if (b.driver === 'ai' && imp > 2.5) roadRage(b); else if (b.ai) b.ai.panic = 6; if (b.type === 'police' && imp > 4) game.wanted.add(1.5); }
      }
    }
  }
  // cars vs people
  for (const c of cars) {
    const sp = c.speed; if (sp < 3.5) continue;
    for (const p of peds.list) {
      if (p.state === 'dead' || p.state === 'tumble' || Math.abs(p.x - c.x) > 4 || Math.abs(p.z - c.z) > 4) continue;
      for (const [cx, cz] of c.circles()) if (Math.hypot(p.x - cx, p.z - cz) < c.radius + 0.35) {
        p.vx = c.vx * 0.9 + (p.x - cx) * 2; p.vz = c.vz * 0.9 + (p.z - cz) * 2; p.vy = 3 + sp * 0.25;
        const wasDead = p.health <= 0; p.state = 'tumble';
        if (!wasDead) p.hurt(sp * 7, c === player.car ? game : { onPedKilled() {}, say() {} }, c.x, c.z, 'car');
        runOverSounds(p, sp, c);
        if (c === player.car && p.cop) game.wanted.add(2);
        break;
      }
    }
    if (c !== player.car && !player.car && !player.dead) {
      for (const [cx, cz] of c.circles()) if (Math.hypot(player.x - cx, player.z - cz) < c.radius + 0.4 && player.y < 1.5) {
        game.hurtPlayer(sp * 2.2, 'car'); player.vx = c.vx * 0.8; player.vz = c.vz * 0.8; player.vy = 4; player.onGround = false; audio.punch();
        if (c.driver === 'ai' && Math.random() < 0.6) game.onHonk(c, 'blocked');
        if (c.ai) c.ai.panic = 2; break;
      }
    }
  }
}

function updateBubbles(dt) {
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt;
    if (b.t <= 0 || b.ped.state === 'dead') { b.el.remove(); bubbles.splice(i, 1); continue; }
    tmpV.set(b.ped.x, (b.ped.y || 0) + 2.2 + (b.off || 0), b.ped.z).project(camera);
    const vis = !b.ped.dead && tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1 && Math.hypot(b.ped.x - camera.position.x, b.ped.z - camera.position.z) < 40;
    b.el.style.display = vis ? 'block' : 'none';
    b.el.style.left = ((tmpV.x + 1) / 2 * w) + 'px'; b.el.style.top = ((1 - tmpV.y) / 2 * h) + 'px';
  }
}

function updateHUD(dt) {
  setStyle($('hp').firstChild, 'hpw', 'width', Math.round(Math.max(0, player.health)) + '%');
  setStyle($('ar').firstChild, 'arw', 'width', Math.round(Math.max(0, player.armour)) + '%');
  setStyle($('ar'), 'ard', 'display', player.armour > 0 ? '' : 'none');
  setText('money', '$' + String(Math.floor(player.money)).padStart(8, '0'));
  const st = $('stars').children;
  if (domCache.get('stars') !== game.wanted.level) { domCache.set('stars', game.wanted.level); for (let i = 0; i < 5; i++) st[i].className = i < game.wanted.level ? 'on' : ''; }
  $('stars').classList.toggle('blink', game.wanted.level > 0 && !game.wanted.seen);
  setText('weaponIcon', WEAPONS[player.weapon].icon);
  setText('ammo', WEAPONS[player.weapon].melee ? '' : String(player.ammo));
  $('cross').classList.toggle('on', player.aiming && !player.car);
  $('cross').classList.toggle('lock', !!lockTarget);
  const pw = $('power'), pv = Math.round(100 - player.powerCool / 6 * 100) + '%';
  if (domCache.get('pw') !== pv) { domCache.set('pw', pv); pw.style.setProperty('--p', pv); }
  setStyle(pw, 'pwo', 'opacity', player.car ? '0.35' : '1');
  // subtitles
  if (subsQ.length) {
    subsT -= dt;
    if (subsT <= 0) { const line = subsQ.shift(); $('subs').textContent = line; subsT = Math.max(3.6, line.length * 0.075); voice.sayLine(line); }
  } else if (subsT > 0) { subsT -= dt; if (subsT <= 0) $('subs').textContent = ''; }
  // zone
  const z = zoneName(player.x, player.z);
  if (z !== lastZone) {
    lastZone = z; const e = $('zone'); e.innerHTML = z; e.style.opacity = 1; clearTimeout(game._zT); game._zT = setTimeout(() => (e.style.opacity = 0), 2600);
  }
  drawRadar();
}

// Wally Wash: lose the polis and fix the motor
let washCool = 0;
function updateGarage(dt) {
  washCool -= dt;
  const g = world.specials.garage; const c = player.car;
  if (!c || washCool > 0) return;
  if (Math.hypot(c.x - g.x, c.z - (g.z - 6)) < 4.5 && c.speed < 3) {
    if (game.wanted.level === 0 && c.health >= 1000) return;
    washCool = 8;
    if (player.money < 100) { game.toast('Wally Wash: "A hundred quid, pal. Nae freebies, even for heroes."'); return; }
    player.money -= 100; game.wanted.clear(); c.health = 1000; c.burnT = 0;
    c.paintM.color.setHSL(Math.random(), 0.65, 0.45);
    for (const car of cars) if (car.type === 'police' && car.ai instanceof PoliceAI) car.sirenOn = false;
    audio.cash(); game.bigText('WALLY WASH', 'Fresh paint, nae polis. -$100', 2.2);
  }
}

// ---------------- Wally's Flat: go inside, sleep to save ----------------
game.inside = false;
let doorUntil = 0; // real-time cooldown after using a door or the bed
const coolDoor = (sec) => { doorUntil = performance.now() + sec * 1000; };
function fade(cb, hold = 0.35) {
  const f = $('fade'); f.style.opacity = 1;
  setTimeout(() => { cb(); setTimeout(() => { f.style.opacity = 0; }, hold * 1000); }, 380);
}
function enterFlat() {
  setTimeout(() => { if (game.inside) game.quip('home', 0.5); }, 1600);
  if (game.wanted.level > 0) { game.toast('Ye cannae go hame wi\'the polis on yer tail!'); coolDoor(3); return; }
  if (game.mission) { game.toast('Nae time for a cuppa - finish the job first!'); coolDoor(3); return; }
  coolDoor(1.5); audio.door();
  fade(() => {
    game.inside = true; document.body.classList.add('inside');
    player.place(flat.exit[0], flat.exit[1], Math.PI); player.y = 0; cam.yaw = Math.PI; cam.pitch = -0.2;
    $('zone').innerHTML = "Wally's Flat"; $('zone').style.opacity = 1; setTimeout(() => ($('zone').style.opacity = 0), 2200);
  });
}
function exitFlat() {
  coolDoor(1.5); audio.door();
  fade(() => {
    game.inside = false; document.body.classList.remove('inside');
    player.place(flat.outside[0], flat.outside[1], Math.PI); cam.yaw = Math.PI; cam.pitch = -0.18;
  });
}
function sleepAndSave() {
  coolDoor(4); game.sleeping = true;
  const f = $('fade'); f.style.transition = 'opacity 1s'; f.style.opacity = 1; f.textContent = 'Z z z . . .';
  setTimeout(() => {
    game.time = 8 * 60; player.health = 100;
    save(true);
    f.textContent = '';
    setTimeout(() => { f.style.opacity = 0; game.sleeping = false; setTimeout(() => (f.style.transition = ''), 1000); }, 400);
    audio.pass();
    game.bigText('GAME SAVED', 'Wally had a lovely kip. It\'s 08:00.', 3);
  }, 1500);
}
function updateFlat(dt, inp) {
  flat.update(dt, performance.now() / 1000, game.inside, game.night);
  if (player.car || player.dead || game.intro || game.jack || performance.now() < doorUntil || game.sleeping) { $('prompt').classList.add('hidden'); return; }
  const near = (p, r) => Math.hypot(player.x - p[0], player.z - p[1]) < r;
  let prompt = '';
  if (!game.inside) { if (near(flat.door, 0.9)) enterFlat(); }
  else {
    if (near(flat.exitMarker, 0.8)) exitFlat();
    else if (near(flat.bedMarker, 1.0)) { prompt = isTouch ? 'Tap ENTER to sleep and SAVE' : 'Press F to sleep and SAVE'; if (inp.enter) { inp.enter = false; sleepAndSave(); } }
    else if (near(flat.wardMarker, 1.0)) {
      const next = OUTFITS[(player.outfit + 1) % OUTFITS.length];
      prompt = `${OUTFITS[player.outfit].name} · ${isTouch ? 'tap ENTER' : 'press F'} for ${next.name}`;
      if (inp.enter) { inp.enter = false; const o = player.setOutfit(player.outfit + 1, game); audio.door(); game.toast(`👔 Wally changes into: ${o.name}`); if (player.car) player.car._who = null; }
    }
  }
  $('prompt').textContent = prompt; $('prompt').classList.toggle('hidden', !prompt);
}

// ---------------- intro: a UFO drops Wally off outside his flat ----------------
let ufo = null;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
// exhaust puffs from Wally's motor, and litter blowing about the streets
const litter = [];
let litterMat = null, litterGeo = null, litterInst = null;
game.onLand = (pl, v) => {
  if (v < 7 || game.inside) return;
  const n = Math.min(16, 6 + v * 0.6);
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; puff(pl.x + Math.cos(a) * 0.3, pl.y + 0.1, pl.z + Math.sin(a) * 0.3, { color: '#c9bfae', life: 0.8, size: 0.35, grow: 2.2, vx: Math.cos(a) * (2 + v * 0.15), vy: 0.4, vz: Math.sin(a) * (2 + v * 0.15), opacity: 0.45 }); }
  if (v > 14) cam.shake = Math.max(cam.shake, 0.2);
};
let dustT = 0;
const wallyBlob = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.renderOrder = 1; scene.add(m); return m;
})();
function updateAmbientFx(dt) {
  const c = player.car;
  // the soft shadow under Wally shrinks and fades as he rises off the ground
  { const g = world.groundHeight(player.x, player.z, player.y + 0.5), up = Math.max(0, player.y - g);
    wallyBlob.visible = !c && !player.dead && !game.inside && up < 12; wallyBlob.position.set(player.x, g + 0.02, player.z);
    wallyBlob.scale.setScalar(1 / (1 + up * 0.25)); wallyBlob.material.opacity = 1 / (1 + up * 0.4); }
  updateCasings(dt); updateWave(dt);
  // dust kicked up when Wally sprints
  if (!c && player.onGround && player.speed > 6 && !game.inside && (dustT -= dt) <= 0) {
    dustT = 0.12;
    puff(player.x - Math.sin(player.heading) * 0.3, player.y + 0.08, player.z - Math.cos(player.heading) * 0.3, { color: weather.v.wet > 0.5 ? '#b8c4cc' : '#cbbfa8', life: 0.6, size: 0.18, grow: 2, vx: (Math.random() - 0.5) * 0.6, vy: 0.4, vz: (Math.random() - 0.5) * 0.6, opacity: 0.3 });
  }
  // damaged motors steam, then pour black smoke, before they catch fire
  for (const car of cars) {
    if (car.dead || car.health > 450 || car.burnT > 0) continue;
    if (Math.abs(car.x - player.x) + Math.abs(car.z - player.z) > 80) continue;
    if (Math.random() < dt * (car.health < 200 ? 14 : 7)) {
      const [fx, fz] = car.forward(), fr = car.T.len / 2 - 0.6;
      puff(car.x + fx * fr, car.y + 1.0, car.z + fz * fr, { color: car.health < 200 ? '#2b2b2b' : '#e6e6e6', life: 1.4, size: 0.35, grow: 3, vx: (Math.random() - 0.5) * 0.5 - car.vx * 0.3, vy: 1.4, vz: (Math.random() - 0.5) * 0.5 - car.vz * 0.3, opacity: car.health < 200 ? 0.55 : 0.3 });
    }
  }
  // raindrops splashing on the ground round about
  if (!game.inside && weather.v.rain > 0.15) {
    const n = dt * weather.v.rain * (quality === 'high' ? 45 : 18);
    const m = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    for (let k = 0; k < m; k++) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 14, x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
      puff(x, world.groundHeight(x, z, 1) + 0.03, z, { color: '#d8e6f2', add: true, life: 0.22, size: 0.1, grow: 2.5, vx: 0, vy: 0.3, vz: 0, opacity: 0.6 });
    }
  }
  if (c && !c.dead && c.type !== 'wedge' && c.input.throttle > 0.2 && Math.random() < dt * (6 + c.input.throttle * 10)) {
    const [fx, fz] = c.forward(), lx = fz, lz = -fx, ex = c.T.wid / 2 - 0.4;
    puff(c.x - fx * (c.T.len / 2 + 0.1) + lx * ex, c.y + 0.3, c.z - fz * (c.T.len / 2 + 0.1) + lz * ex, { color: game.night > 0.5 ? '#6d6d70' : '#9a9a9c', life: 0.9, size: 0.18, grow: 2.5, vx: -fx * 1.5 + (Math.random() - 0.5), vy: 0.6, vz: -fz * 1.5 + (Math.random() - 0.5), opacity: 0.35 });
  }
  // a dozen bits of paper tumbling along in the wind near Wally
  if (quality !== 'high' || game.inside) { if (litterInst) litterInst.visible = false; return; }
  if (litterInst) litterInst.visible = true;
  if (!litter.length) {
    litterGeo = new THREE.PlaneGeometry(0.28, 0.2);
    litterMat = new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.9, side: THREE.DoubleSide });
    litterInst = new THREE.InstancedMesh(litterGeo, litterMat, 12); litterInst.castShadow = true; litterInst.frustumCulled = false; scene.add(litterInst);
    for (let i = 0; i < 12; i++) litter.push({ m: new THREE.Object3D(), x: 1e9, z: 0, y: 0, vy: 0, spin: Math.random() * 6 });
    const hide = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < 12; i++) litterInst.setMatrixAt(i, hide);
  }
  const wind = ((weather.v && weather.v.wind) ?? 0.5) + 0.6, wa = performance.now() / 9000;
  const wx = Math.cos(wa) * wind * 2.2, wz = Math.sin(wa * 0.7) * wind * 2.2;
  for (const l of litter) {
    if (Math.hypot(l.x - player.x, l.z - player.z) > 35) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 20;
      l.x = player.x + Math.cos(a) * r; l.z = player.z + Math.sin(a) * r; l.y = 0.05;
      if (world.collide(l.x, l.z, 0.3, 0).hit) { l.x = 1e9; continue; }
    }
    const g = world.groundHeight(l.x, l.z, l.y + 0.5) + 0.03;
    // gusts lift it, gravity brings it down, and it skitters along
    if (l.y <= g + 0.01 && Math.random() < dt * 0.8) l.vy = 1 + Math.random() * 2.5 * wind;
    l.vy -= 6 * dt; l.y = Math.max(g, l.y + l.vy * dt); if (l.y === g) l.vy = 0;
    const airborne = l.y > g + 0.02 ? 1 : 0.25;
    const nx = l.x + (wx + Math.sin(l.spin * 3) * 0.6) * dt * airborne, nz = l.z + (wz + Math.cos(l.spin * 2) * 0.6) * dt * airborne;
    if (!world.collide(nx, nz, 0.2, 0).hit) { l.x = nx; l.z = nz; }
    l.spin += dt * (airborne > 0.5 ? 6 : 1);
    l.m.position.set(l.x, l.y, l.z);
    l.m.rotation.set(airborne > 0.5 ? l.spin : -Math.PI / 2, l.spin * 0.5, airborne > 0.5 ? l.spin * 0.7 : 0);
    l.m.updateMatrix(); litterInst.setMatrixAt(litter.indexOf(l), l.m.matrix);
  }
  litterInst.instanceMatrix.needsUpdate = true;
}
function updateNessie(dt) {
  if (!game.inside) nessie.update(dt, player);
  nessie.group.visible = !game.inside;
  if (game.intro || game.inside || player.dead) return;
  const d = Math.hypot(player.x - nessie.x, player.z - nessie.z);
  const speak = (line, prio) => {
    game.say(nessie, line); nessie.talkT = 1.6; nessie.sayCool = 25 + Math.random() * 15;
    if (d < 30) voice.say(line, 'NESSIE', prio);
  };
  if (!nessie.greeted) {
    nessie.greetT -= dt;
    if (nessie.greetT <= 0) {
      nessie.greeted = true; speak('Och aye the noo!', true);
      setTimeout(() => game.quip(["Is that... Nessie?! Mammy'll never believe this."], 1, true), 2600);
    }
  } else if (nessie.caughtUp && nessie.sayCool < 20) speak(NESSIE_CATCHUP[(Math.random() * NESSIE_CATCHUP.length) | 0], false);
  else if (d < 12 && nessie.sayCool <= 0) speak(Math.random() < 0.5 ? NESSIE_LINES[(Math.random() * NESSIE_LINES.length) | 0] : NESSIE_FOLLOW[(Math.random() * NESSIE_FOLLOW.length) | 0], false);
  // every few minutes, a proper blether between the two of them
  nessie.banterT = (nessie.banterT ?? 70) - dt;
  if (nessie.banterT <= 0 && d < 15 && !game.mission && !subsQ.length && !game.cuffs) {
    nessie.banterT = 110 + Math.random() * 90; nessie.sayCool = 30;
    game.subs(NESSIE_BANTER[(Math.random() * NESSIE_BANTER.length) | 0]);
  }
}
function startIntro() {
  if (!ufo) ufo = buildUFO();
  scene.add(ufo.group);
  const h = world.specials.home;
  const land = [player.x, player.z];
  game.intro = { t: 0, land, hoverY: 17, from: [land[0] - 140, 70, land[1] + 90], skipReady: 0.6, said: false };
  document.body.classList.add('cine');
  audio.ufoHum(true);
  game.subs([]); $('subs').textContent = '';
}
function endIntro() {
  const I = game.intro; if (!I) return;
  game.intro = null; player.jackPose = null; player.introHidden = false;
  player.place(I.land[0], I.land[1], 0); player.y = world.groundHeight(I.land[0], I.land[1], 1);
  scene.remove(ufo.group); ufo.beamOn = 0;
  audio.ufoHum(false);
  document.body.classList.remove('cine');
  cam.yaw = 0; cam.pitch = -0.18; cam.dist = 4.4;
  if (game.missionIdx === 0) game.subs(["WALLY MAN: ...that's the last time I take a lift aff strangers.", "WALLY MAN: Mammy's waiting at the flat. Walk into the yellow marker.", "WALLY MAN: (Q to use my powers. If they work.)"]);
  else game.subs(["WALLY MAN: ...that's the last time I take a lift aff strangers."]);
}
function updateIntro(dt, inp) {
  const I = game.intro;
  I.t += dt; I.skipReady -= dt;
  if (I.skipReady <= 0 && inp.any) { endIntro(); return; }
  const T = I.t, [lx, lz] = I.land, gy = world.groundHeight(lx, lz, 1);
  const hover = [lx, I.hoverY, lz];
  let ux, uy, uz;
  if (T < 3) { // swoop in from over the sea
    const k = ease(T / 3);
    ux = I.from[0] + (hover[0] - I.from[0]) * k; uy = I.from[1] + (hover[1] - I.from[1]) * k + Math.sin(k * Math.PI) * 8; uz = I.from[2] + (hover[2] - I.from[2]) * k;
    ufo.group.rotation.z = (1 - k) * 0.35;
  } else if (T < 6.8) { [ux, uy, uz] = hover; uy += Math.sin(T * 2) * 0.3; ufo.group.rotation.z = Math.sin(T * 1.3) * 0.05; }
  else { // zoom off into the sky
    const k = (T - 6.8) / 1.4;
    ux = hover[0] + k * k * 220; uy = hover[1] + k * k * 160; uz = hover[2] - k * k * 60; ufo.group.rotation.z = -0.4 * Math.min(1, k * 3);
    if (!I.zoomed) { I.zoomed = true; audio.ufoHum(false); audio.tone(300, 1.2, 'sawtooth', 0.12, 2400); audio.tone(150, 1.2, 'triangle', 0.1, 1200); }
  }
  ufo.group.position.set(ux, uy, uz);
  ufo.beamOn = T < 3.1 ? 0 : (T < 6.2 ? Math.min(1, (T - 3.1) * 3) : Math.max(0, 1 - (T - 6.2) * 3));
  ufo.update(dt, uy - gy);
  // Wally floats down the beam, turning slowly, arms flailing
  if (T < 3.4) { player.x = lx; player.z = lz; player.y = uy - 2.6; player.introHidden = T < 3.1; player.jackPose = { mode: 'fly', flail: true, capeLift: 0.6 }; }
  else if (T < 6.0) {
    player.introHidden = false;
    const k = ease((T - 3.4) / 2.6);
    player.x = lx; player.z = lz; player.y = (hover[1] - 2.6) + (gy - (hover[1] - 2.6)) * k;
    player.heading += dt * 2.2 * (1 - k * 0.7);
    player.jackPose = k < 0.9 ? { mode: 'fly', flail: true, capeLift: 0.4 + Math.sin(T * 6) * 0.2 } : { speed: 0 };
  } else {
    player.y = gy; player.jackPose = { speed: 0 };
    let da = Math.atan2(ux - lx, uz - lz) - player.heading; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    player.heading += da * Math.min(1, dt * 4); // watches them go
    if (!I.said) { I.said = true; $('subs').textContent = 'WALLY MAN: Cheers for the lift, lads!'; voice.say('Cheers for the lift, lads!', 'WALLY', true); }
  }
  // cinematic camera down the street, looking up at the action
  const camPos = new THREE.Vector3(lx + 26, gy + 6.5, lz + 5);
  const wally = new THREE.Vector3(lx, player.y + 1.2, lz);
  const look = T < 2.6 ? new THREE.Vector3(ux, uy, uz)
    : (T < 6.2 ? new THREE.Vector3(lx, (uy + player.y) / 2, lz)
      : wally.clone().add(new THREE.Vector3(0, 0.6 + Math.min(1, (T - 6.2)) * 1.2, 0)));
  if (!I.look) I.look = look.clone(); else I.look.lerp(look, Math.min(1, dt * 3));
  camera.position.copy(camPos); camera.fov = 50; camera.updateProjectionMatrix(); camera.lookAt(I.look);
  if (T > 8.2) endIntro();
}

game.puff = puff;
game.relock = () => { if (!isTouch && game.playing && !game.paused) canvas.requestPointerLock?.(); };
const content = initContent(game, scene, world);

let last = performance.now();
let acc = 0;
function frame(now) {
  if (game.contextLost) return; // graphics are gone: stop drawing until the player reloads
  requestAnimationFrame(frame);
  let dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  pad.poll(); padMenus(dt);
  if (!$('padscreen').classList.contains('hidden')) $('padLive').textContent = pad.live();
  if (!game.playing || game.paused || game.shopOpen || !$('padscreen').classList.contains('hidden')) { if (!game.playing) titleCam(dt); if (game.shopOpen && pressed.has('Escape')) { pressed.clear(); game.closeShop(); } render(); return; }
  // slow motion while Wally's car is flying off a stunt ramp
  const wantScale = player.car && player.car.air ? 0.4 : 1;
  game.timeScale += (wantScale - game.timeScale) * Math.min(1, dt * 6);
  dt *= game.timeScale;
  const inp = readInput(); game._inp = inp;
  lookStick(dt);
  if (game.intro) { // during the intro, controls only skip it
    inp.any = inp.enter || inp.power || inp.weapon || inp.jumpPressed || inp.firePressed || inp.anyKey;
    for (const k of ['enter', 'power', 'weapon', 'camera', 'radio', 'jumpPressed', 'firePressed', 'fire', 'aim', 'powerPressed']) inp[k] = false;
    inp.mx = inp.my = 0;
  }
  if (inp.mute) { audio.on = !audio.on; if (audio.master) audio.master.gain.value = audio.on ? 0.7 : 0; game.toast(audio.on ? 'Sound on' : 'Sound off'); }
  if (inp.camera) cam.far = !cam.far;
  if (inp.gps) cycleGps();
  if (inp.radio && player.car) { audio.nextStation(); showRadio(); if (audio.station < DJ_LINES.length && Math.random() < 0.6) voice.say(pickDJ(audio.station), 'DJ', true); }
  if (game.cuffs) { inp.enter = false; inp.mx = inp.my = 0; }
  updateFlat(dt, inp);
  if (inp.enter && !game.jack && !game.inside) { if (player.car) exitCar(); else enterCar(); }
  if (inp.aimPressed && !player.car && WEAPONS[player.weapon].melee) game.toast(player.hasWeapons ? 'You can only aim with a gun or neeps. Tap WEAPON to switch.' : 'Nothing to aim yet! Find a gun lying about town (gold rings on the radar... well, on the pavement).');
  if (inp.weapon && !player.car) { player.cycleWeapon(); if (!player.hasWeapons) game.toast('No weapons yet. Just fists of mild fury.'); else game.toast(`${WEAPONS[player.weapon].icon} ${WEAPONS[player.weapon].name}`); }
  if (inp.power && player.car) { player.usePower(game); inp.powerPressed = false; }
  updateJack(dt);
  updateArrest(dt);
  player.update(dt, inp, game);
  updateLockOn(dt);
  game.wanted.update(dt);
  if (game.alarmT > 0) { game.alarmT -= dt; if (game.alarmT <= 0) game.alarm = null; }
  updateTraffic(dt);
  peds.update(dt, game);
  updatePickups(dt);
  updateGarage(dt);
  updateMission(dt);
  for (const m of game.markers) { if (m.obj.userData.arrow) { m.obj.userData.arrow.position.y = 5 + Math.sin(now / 250) * 0.4; m.obj.userData.arrow.rotation.y += dt * 2; } }
  updateNeeps(dt);
  updateShots(dt);
  updateParticles(dt);
  for (let i = tracers.length - 1; i >= 0; i--) { const t = tracers[i]; t.t -= dt; t.l.material.opacity = t.t / (t.life || 0.09); if (t.t <= 0) { scene.remove(t.l); t.l.geometry.dispose(); tracers.splice(i, 1); } }
  if (flashLight.intensity > 0) flashLight.intensity = Math.max(0, flashLight.intensity - dt * 900);
  // big statue's cape flutters gently
  if (world.statue) { /* bronze doesn't flutter, Wally insists it does */ }
  // headlights at night
  if (player.car && game.night > 0.2) {
    const c = player.car, [fx, fz] = c.forward();
    headlight.intensity = 60 * game.night; headlight.position.set(c.x + fx * 2, c.y + 0.8, c.z + fz * 2);
    headlight.target.position.set(c.x + fx * 20, 0, c.z + fz * 20);
  } else headlight.intensity = 0;
  world.update(dt, now / 1000, game.night);
  if (Math.random() < dt) world.restoreLamps(player.x, player.z);
  if (game.intro) updateIntro(dt, inp); else updateCamera(dt, inp);
  updateWeather(dt);
  content.update(dt, game._inp);
  if (!player.car && !game.mission && !game.intro && !player.dead) { idleQuipT -= dt; if (idleQuipT <= 0) { idleQuipT = 45 + Math.random() * 40; game.quip('idle', 1); } }
  updateChatter(dt);
  if (nessie) updateNessie(dt);
  updateAmbientFx(dt);
  updateSky(dt);
  // audio
  const c = player.car;
  const siren = cars.reduce((m, q) => (q.sirenOn && !q.dead ? Math.max(m, 1 - Math.hypot(q.x - player.x, q.z - player.z) / 90) : m), 0);
  // engine noise from the nearest other cars, panned left/right relative to the camera
  if (audio.ctx) {
    const cx = camera.position.x, cz = camera.position.z, ry = Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw));
    const rxv = -Math.cos(ry), rzv = Math.sin(ry);
    const near = [];
    for (const q of cars) {
      if (q === c || q.dead || !(q.driver === 'ai' || q.driver === 'cop' || q.speed > 1)) continue;
      const dx = q.x - player.x, dz = q.z - player.z, dist = Math.hypot(dx, dz);
      if (dist > 55) continue;
      const pd = Math.hypot(q.x - cx, q.z - cz) || 1;
      near.push({ dist, pan: ((q.x - cx) * rxv + (q.z - cz) * rzv) / pd, speed: q.speed, throttle: q.input.throttle, type: q.type });
    }
    near.sort((a, b) => a.dist - b.dist);
    audio.traffic(near, !!c);
  }
  audio.update({ inCar: !!c, speed: c ? c.vf : player.speed, throttle: c ? c.input.throttle : 0, slip: c ? c.vr || 0 : 0, carType: c ? c.type : '', siren, flying: player.flyT > 0 && !player.flail });
  updateBubbles(dt);
  updateHUD(dt);
  render();
}
const sunScr = new THREE.Vector3(); game.skyU = skyU;
// frames-per-second counter (toggle in the pause menu), averaged over half a second
let fpsOn = store.get('wta-fps', true), fpsN = 0, fpsT = 0, fpsLast = performance.now();
let frameEMA = 16, resCool = 0;
function adaptRes(ms) {
  frameEMA += (Math.min(ms, 100) - frameEMA) * 0.05;
  resCool -= ms;
  if (resCool > 0 || !game.playing || game.paused) return;
  const STEPS = [1, 0.85, 0.72, 0.62, 0.55];
  let i = STEPS.indexOf(resScale);
  if (frameEMA > 24 && i < STEPS.length - 1) i++;        // under ~42 fps: drop a step
  else if (frameEMA < 15 && i > 0) i--;                   // well over 60 fps: bring the sharpness back
  else return;
  resScale = STEPS[i]; resCool = 2500;
  renderer.setPixelRatio(basePR * resScale);
  if (composer) composer.setPixelRatio(renderer.getPixelRatio());
  resize();
}
function updateFps() {
  const now = performance.now(); adaptRes(now - fpsLast); fpsN++; fpsT += now - fpsLast; fpsLast = now;
  if (fpsT < 500) return;
  const fps = Math.round(fpsN * 1000 / fpsT), ms = (fpsT / fpsN).toFixed(1); fpsN = 0; fpsT = 0;
  const e = $('fps'); e.style.display = fpsOn ? 'block' : 'none'; if (!fpsOn) return;
  e.textContent = `${fps} FPS · ${ms} ms` + (resScale < 1 ? ` · res ${Math.round(resScale * 100)}%` : '');
  e.style.color = fps >= 50 ? '#7dff8a' : (fps >= 30 ? '#ffe066' : '#ff6b6b');
}
const toggleFps = () => { fpsOn = !fpsOn; store.set('wta-fps', fpsOn); $('fpsBtn').textContent = 'FPS COUNTER: ' + (fpsOn ? 'ON' : 'OFF'); $('fps').style.display = fpsOn ? 'block' : 'none'; };
$('fpsBtn').onclick = toggleFps; $('fpsBtn').textContent = 'FPS COUNTER: ' + (fpsOn ? 'ON' : 'OFF');
function updatePost() {
  if (!gradePass) return;
  const c = player.car;
  const sp = c ? c.speed : (player.flyT > 0 && !player.flail ? 22 : 0);
  const target = Math.min(1, Math.max(0, (sp - 16) / 26));
  const u = gradePass.uniforms;
  u.uBlur.value += (target - u.uBlur.value) * 0.08;
  // where the sun is on screen, and how much it should shine (not at night, in cloud, fog or indoors)
  const sd = skyU.sunDir.value;
  sunScr.copy(camera.position).addScaledVector(sd, 2000).project(camera);
  const inFront = sunScr.z < 1 && sunScr.z > -1, onScreen = Math.max(Math.abs(sunScr.x), Math.abs(sunScr.y));
  const vis = inFront ? Math.max(0, Math.min(1, (1.35 - onScreen) / 0.35)) : 0;
  const want = vis * Math.max(0, Math.min(1, sd.y * 4)) * (1 - game.night) * (1 - Math.min(1, skyU.cover.value * 1.4)) * (game.inside ? 0 : 1);
  u.uSunVis.value += (want - u.uSunVis.value) * 0.1;
  u.uSun.value.set(sunScr.x * 0.5 + 0.5, sunScr.y * 0.5 + 0.5);
  u.uAspect.value = camera.aspect;
  u.uSunCol.value.copy(skyU.sunCol.value).lerp(new THREE.Color('#ffffff'), 0.2);
  u.uTime.value = (performance.now() / 1000) % 100;
  const hurtWant = player.dead || !game.playing ? 0 : Math.max(0, Math.min(1, (35 - player.health) / 25));
  u.uHurt.value += (hurtWant - u.uHurt.value) * 0.06;
}
function render() {
  updateFps(); updatePost(); if (composer && quality === 'high') composer.render(); else renderer.render(scene, camera); }

// slow orbit behind the title screen
let titleT = 0;
function titleCam(dt) {
  titleT += dt * 0.05;
  const s = world.specials.plaza;
  camera.position.set(s.x + Math.cos(titleT) * 38, 16, s.z + Math.sin(titleT) * 38);
  camera.lookAt(s.x, 12, s.z);
  sky.position.copy(camera.position);
  updateSky(0);
  world.update(dt, performance.now() / 1000, game.night);
}

// ---------------- menus ----------------
function togglePause(force) {
  if (!game.playing) return;
  game.paused = force === true ? true : !game.paused;
  $('pause').classList.toggle('hidden', !game.paused);
  if (game.paused) {
    voice.stop();
    if (document.pointerLockElement) document.exitPointerLock();
    const s = game.stats;
    $('statsBox').innerHTML = `<div class="stat">Missions: ${game.missionIdx} / ${MISSIONS.length}</div><div class="stat">Golden Specs: ${s.specs} / 20</div><div class="stat">Motors borrowed: ${s.cars} · Successful flights: ${s.flights}</div><div class="stat">Times hopeless: ${s.wasted} · Times nicked: ${s.busted}</div><div class="stat">${content.stats()}</div>`;
    if (audio.ctx) audio.ctx.suspend();
  } else {
    if (!isTouch) canvas.requestPointerLock?.();
    if (audio.ctx) audio.ctx.resume();
    last = performance.now();
  }
}
let started = false, nessie = null;
const NESSIE_FOLLOW = ['Wait for me, Wally!', 'Where are we going? Is it the chippy?', 'Ma flippers are killing me.', 'Is this a date, Wally?', 'Slow doon! I\'m a monster, no\' a motorbike!', 'Ooh, Wallypool! It\'s like the loch but wi\' mair shopping trolleys.', 'Can we get a pokey hat?', 'I\'ve no\' been this far fae the water since nineteen thirty four.', 'Are we there yet?', 'Mind the traffic, Wally. Some of us are an endangered species.'];
const NESSIE_CATCHUP = ['Wait for me! Ma wee flippers!', 'Did ye think ye could lose me? I hid in a loch for fifteen hundred years!', 'Found ye! I followed the smell of chips.', 'Ye left me behind! I had to get the bus!'];
// Wally and Nessie have a wee blether as they wander about
const NESSIE_BANTER = [
  ['NESSIE: Wally, why do they call ye Wally Man?', 'WALLY MAN: Because I\'m a man. Called Wally.', 'NESSIE: Oh. I thought it was a warning.'],
  ['NESSIE: I\'ve been hiding in that loch for centuries, ye know.', 'WALLY MAN: Whit were ye hiding fae?', 'NESSIE: Tourists. And the council tax.'],
  ['WALLY MAN: Nessie, can ye no\' swim instead of wriggling?', 'NESSIE: On a pavement? Are ye daft?', 'WALLY MAN: Fair point.'],
  ['NESSIE: Is that yer superhero costume or did ye lose a bet?', 'WALLY MAN: It\'s hand-made!', 'NESSIE: Aye. Ye can tell.'],
  ['WALLY MAN: Everybody\'s staring at us.', 'NESSIE: It\'s you, Wally. Nobody looks twice at a monster in Wallypool.'],
  ['NESSIE: Fancy a deep-fried Mars bar after this?', 'WALLY MAN: Nessie, ye\'ve had six the day.', 'NESSIE: I\'m eating for one. A very big one.'],
  ['NESSIE: Ma cousin\'s in Loch Lomond. She\'s a right snob.', 'WALLY MAN: How?', 'NESSIE: She says she\'s on the bonnie banks. I\'m on the dreich ones.'],
  ['WALLY MAN: Nessie, how come naebody\'s ever got a good photo of ye?', 'NESSIE: Because I always blink. And I\'m a monster.'],
  ['NESSIE: Wally, can I be yer sidekick?', 'WALLY MAN: Whit would yer superhero name be?', 'NESSIE: The Wriggler. Fear me.'],
  ['NESSIE: Is it always this cold in Wallypool?', 'WALLY MAN: Naw. Sometimes it\'s colder.', 'NESSIE: I miss ma loch. At least the loch had central heating. Well. No\' really.'],
  ['WALLY MAN: Whit do monsters eat, Nessie?', 'NESSIE: Fish, mostly. And the odd tourist\'s sandwich.', 'WALLY MAN: That\'s just a seagull wi\' a long neck.'],
  ['NESSIE: Mammy Wally gave me a scone this morning.', 'WALLY MAN: She\'s never given ME a scone!', 'NESSIE: Ye\'re no\' as cute as me, Wally.'],
];
const NESSIE_LINES = ['Och aye the noo!', 'Och aye the noo! Fancy a deep-fried Mars bar?', 'Och aye the noo! Seen ma loch anywhere?', 'Och aye the noo! Nae photos, I\'m shy.', 'Och aye the noo, Wally!'];
function startGame(fresh) {
  audio.init();
  if (!started || fresh) {
    const s = load(fresh);
    if (started) { for (const sp of game.specs) dropObject(sp.obj); for (const p of game.pickups) dropObject(p.obj); game.specs = []; game.pickups = []; failMission(); }
    setupCollectibles(s);
    const h = world.specials.home;
    player.place(h.x + 3, h.z - 7, 0); cam.yaw = 0; player.dead = false; player.health = 100;
    if (player.car) exitCar(true);
    game.wanted.clear();
    placeMissionMarker();
    content.placeVans();
    // a motor waiting at the kerb outside the flat
    if (!cars.some((c) => Math.hypot(c.x - h.x, c.z - h.z) < 12)) { const c = game.spawnCar('hatch', h.x - 7, h.z - 3.4, -Math.PI / 2); c.parked = true; }
    // a Steel Wedge and a Wee Trike parked up the street for Wally to try
    if (!cars.some((c) => c.type === 'wedge' && Math.hypot(c.x - h.x, c.z - h.z) < 30)) { const c = game.spawnCar('wedge', h.x - 16, h.z - 3.4, -Math.PI / 2); c.parked = true; }
    if (!cars.some((c) => c.type === 'trike' && Math.hypot(c.x - h.x, c.z - h.z) < 30)) { const c = game.spawnCar('trike', h.x + 12, h.z - 3.4, -Math.PI / 2); c.parked = true; }
    // the Loch Ness Monster, on her holidays outside Wally's flat
    if (!nessie) { nessie = buildNessie(scene, world, h); game.nessie = nessie; }
    nessie.greeted = false; nessie.greetT = s.slept && !fresh ? 4 : 6.5;
    started = true;
    if (s.slept && !fresh) { // you saved in bed last time: wake up in the flat
      game.inside = true; document.body.classList.add('inside');
      player.place(flat.spawn[0], flat.spawn[1], Math.PI); player.y = 0; cam.yaw = Math.PI;
      game.subs(["WALLY MAN: *yawn* Right. Another day of heroics.", "WALLY MAN: (The pink ring by the door takes me outside.)"]);
    } else { game.inside = false; document.body.classList.remove('inside'); startIntro(); }
  }
  game.playing = true; game.paused = false; guardBack();
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); $('pause').classList.add('hidden');
  if (!isTouch) canvas.requestPointerLock?.();
  last = performance.now();
}
// landscape only: on phones, go full screen and lock the screen sideways where the browser allows it,
// and pause if the phone is turned upright (the "turn yer phone sideways" screen covers the game)
function lockLandscape() {
  if (!isTouch) return;
  try {
    const el = document.documentElement, fs = el.requestFullscreen || el.webkitRequestFullscreen;
    const lock = () => { try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { /* not supported */ } };
    if (fs && !document.fullscreenElement && !document.webkitFullscreenElement) {
      const p = fs.call(el, { navigationUI: 'hide' }); if (p && p.then) p.then(lock, lock); else lock();
    } else lock();
  } catch (e) { /* not supported */ }
}
const portrait = matchMedia('(orientation: portrait)');
const onTurn = () => { if (isTouch && portrait.matches && game.playing && !game.paused) togglePause(true); };
portrait.addEventListener ? portrait.addEventListener('change', onTurn) : portrait.addListener(onTurn);
for (const id of ['play', 'newgame']) $(id).addEventListener('click', lockLandscape);
$('play').onclick = () => startGame(false);
$('newgame').onclick = () => { if (!store.get('wta-save', null) || confirm('Start a new game? Your progress will be wiped.')) { store.set('wta-save', {}); startGame(true); } };
$('howto').onclick = () => { $('help').classList.remove('hidden'); };
$('pauseHelp').onclick = () => { $('help').classList.remove('hidden'); };
$('helpBack').onclick = () => $('help').classList.add('hidden');
$('resume').onclick = () => togglePause(false);
$('quit').onclick = () => { save(); game.playing = false; game.paused = false; $('pause').classList.add('hidden'); $('hud').classList.add('hidden'); $('title').classList.remove('hidden'); if (audio.ctx) audio.ctx.resume(); };
const toggleGfx = () => { quality = quality === 'high' ? 'low' : 'high'; store.set('wta-gfx', quality); applyQuality(); };
$('gfx').onclick = toggleGfx; $('gfx2').onclick = toggleGfx;
const toggleVox = () => { voice.on = !voice.on; store.set('wta-vox', voice.on); if (!voice.on) voice.stop(); else voice.say('Aye, I can talk now.', 'WALLY', true); applyQuality(); };
$('vox').onclick = toggleVox; $('vox2').onclick = toggleVox;
setInterval(() => { if (game.playing && !game.paused) save(); }, 30000);

applyQuality();
// safety net: if the phone's graphics memory gives out, save and offer a reload instead of freezing
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); game.contextLost = true;
  try { if (game.playing) save(); } catch (_) { /* nothing more we can do */ }
  $('crash').classList.remove('hidden');
});
window.addEventListener('error', () => { try { if (game.playing && !player.dead) save(); } catch (_) { /* ignore */ } });
// version badge and what's new
$('verTitle').textContent = 'v' + VERSION; $('verPause').textContent = 'v' + VERSION;
$('news').innerHTML = `<b>What's new in v${VERSION}:</b><ul>${CHANGES[0][1].map((c) => `<li>${c}</li>`).join('')}</ul>`;
// a few cars about town before the player arrives
for (let i = 0; i < 6; i++) { player.x = world.specials.plaza.x; player.z = world.specials.plaza.z; spawnParked(); }
$('loading').classList.add('hidden');
requestAnimationFrame(frame);
window.__game = game; game.voice = voice; game.flat = flat; game.content = content; game.camera = camera; game.scene = scene; game.renderer = renderer; // handy for debugging in the console
