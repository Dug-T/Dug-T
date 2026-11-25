// The mountain: its plume, tremors, ashfall, lava bombs, lava flows and the final pyroclastic surge.
import * as THREE from 'three';
import { VOLCANO, heightAt, W } from './island.js';
import { puffTexture, sparkTexture, lavaTexture, glowTexture, makeNoise } from './textures.js';
import { stageAt } from './survival.js';

// a pool of billboard particles with per-point size, alpha and shade
export class Puffs {
  constructor(scene, count, map, colA, colB, blending = THREE.NormalBlending, depthWrite = false, fogMul = 1) {
    this.n = count; this.pos = new Float32Array(count * 3); this.size = new Float32Array(count); this.alpha = new Float32Array(count); this.shade = new Float32Array(count);
    this.vel = new Float32Array(count * 3); this.life = new Float32Array(count); this.max = new Float32Array(count); this.grow = new Float32Array(count); this.fade = new Float32Array(count);
    this.head = 0; this.alive = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aShade', new THREE.BufferAttribute(this.shade, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3000);
    this.u = { tMap: { value: map }, uColA: { value: new THREE.Color(colA) }, uColB: { value: new THREE.Color(colB) }, uScale: { value: 800 }, uLight: { value: 1 }, uFogMul: { value: fogMul } };
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, this.u]), transparent: true, depthWrite, blending, fog: true,
      vertexShader: `attribute float aSize, aAlpha, aShade; varying float vA, vS; uniform float uScale;
        #include <fog_pars_vertex>
        void main(){ vA = aAlpha; vS = aShade; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(1.0, -mvPosition.z); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D tMap; uniform vec3 uColA, uColB; uniform float uLight, uFogMul; varying float vA, vS;
        #include <fog_pars_fragment>
        void main(){ vec4 t = texture2D(tMap, gl_PointCoord); vec3 c = mix(uColA, uColB, vS) * uLight; gl_FragColor = vec4(c, t.a * vA); if (gl_FragColor.a < 0.01) discard;
        #ifdef USE_FOG
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth); gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor * uFogMul);
        #endif
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    // UniformsUtils.merge clones, so keep hold of the live uniforms
    this.u = mat.uniforms;
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, size, life, shade = 0.5, alpha = 0.6, grow = 1, fade = 1) {
    const i = this.head; this.head = (this.head + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.size[i] = size; this.alpha[i] = alpha; this.shade[i] = shade; this.life[i] = life; this.max[i] = life; this.grow[i] = grow; this.fade[i] = alpha * fade;
  }
  update(dt, drag = 0.2, gravity = 0, wind = 0) {
    const p = this.pos, v = this.vel;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const k = 1 - Math.min(1, dt * drag);
      v[i * 3] = v[i * 3] * k + wind * dt; v[i * 3 + 1] = v[i * 3 + 1] * k - gravity * dt; v[i * 3 + 2] *= k;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      this.size[i] += this.grow[i] * dt;
      const t = this.life[i] / this.max[i];
      this.alpha[i] = this.fade[i] * Math.min(1, (1 - t) * 6) * Math.min(1, t * 2.5);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true; g.attributes.aShade.needsUpdate = true;
  }
}

export class Volcano {
  constructor(scene, world, quality, hooks = {}) {
    this.scene = scene; this.world = world; this.hi = quality === 'high'; this.hooks = hooks;
    this.progress = 0; this.stage = stageAt(0); this.shake = 0; this.rumbleLevel = 0; this.tremorT = 20; this.tremorEnv = 0; this.bombT = 8; this.ash = 0; this.flowFront = 0; this.surgeR = 0;
    this.t = 0; this.wind = 1.2;
    const puff = puffTexture(), spark = sparkTexture();
    // the column and the surge only half-fade into the haze, so they stay readable against an ash sky
    this.plume = new Puffs(scene, this.hi ? 1400 : 700, puff, '#e8e4df', '#2a2524', THREE.NormalBlending, false, 0.35);
    this.ashFall = new Puffs(scene, this.hi ? 1400 : 700, puff, '#8d8884', '#3a3634');
    this.burst = new Puffs(scene, 400, puff, '#ffb060', '#2a2220');
    this.embers = new Puffs(scene, this.hi ? 600 : 300, spark, '#ffe6a0', '#ff5a00', THREE.AdditiveBlending, false, 0.3);
    this.surge = new Puffs(scene, this.hi ? 700 : 350, puff, '#6a6360', '#1c1818', THREE.NormalBlending, false, 0.3);
    // the crater: a lava lake and its glow
    const lavaTex = lavaTexture();
    this.lavaU = { tLava: { value: lavaTex }, uFront: { value: 1e6 }, uTime: { value: 0 } };
    this.lavaMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, this.lavaU]), fog: true,
      vertexShader: `attribute float aDist; varying float vDist; varying vec2 vUv;
        #include <fog_pars_vertex>
        void main(){ vDist = aDist; vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D tLava; uniform float uFront, uTime; varying float vDist; varying vec2 vUv;
        #include <fog_pars_fragment>
        void main(){
          if (vDist > uFront) discard;
          vec3 t = texture2D(tLava, vec2(vUv.x, vUv.y - uTime * 0.025)).rgb;
          float crack = t.r;
          float front = smoothstep(uFront - 30.0, uFront, vDist);
          float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          float pulse = 0.06 * sin(uTime * 2.2 + vDist * 0.12) + 0.04 * sin(uTime * 3.7 - vUv.x * 9.0);
          float heat = clamp(crack * (0.62 + 0.38 * edge) + front * 0.6 + 0.14 + pulse, 0.0, 1.0);
          vec3 col = mix(vec3(0.09, 0.04, 0.03), vec3(1.0, 0.32, 0.05) * 1.8, heat) + vec3(1.0, 0.62, 0.22) * pow(heat, 3.0) * 1.7;
          gl_FragColor = vec4(col * 1.5, 1.0);
          #include <fog_fragment>
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.lavaU = this.lavaMat.uniforms;
    const craterY = heightAt(VOLCANO.x, VOLCANO.z) + 0.5;
    const lake = new THREE.Mesh(new THREE.CircleGeometry(24, 32), this.lavaMat);
    lake.geometry.setAttribute('aDist', new THREE.BufferAttribute(new Float32Array(lake.geometry.attributes.position.count), 1));
    lake.rotation.x = -Math.PI / 2; lake.position.set(VOLCANO.x, craterY, VOLCANO.z); scene.add(lake);
    this.lake = lake; this.craterY = craterY;
    this.glow = new THREE.PointLight('#ff5a1a', 0, 260, 1.6); this.glow.position.set(VOLCANO.x, craterY + 20, VOLCANO.z); scene.add(this.glow);
    // the lava flows, hidden until the eruption
    this.flows = world.paths.map((pts, k) => this.buildFlow(pts, k));
    this.flowLights = []; for (let i = 0; i < 3; i++) { const l = new THREE.PointLight('#ff6a20', 0, 110, 1.7); scene.add(l); this.flowLights.push(l); }
    this.bombLight = new THREE.PointLight('#ff7a30', 0, 140, 1.6); scene.add(this.bombLight);
    this.glow = Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 1, 0)); this.flash = 0; this.lightT = 6; this.nearFront = 1e9;
    // a soft glow hanging over the crater, growing with the eruption
    this.craterGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff6a20', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    this.craterGlow.position.set(VOLCANO.x, this.craterY + 18, VOLCANO.z); scene.add(this.craterGlow);
    // bombs
    this.bombs = [];
    const bg = new THREE.IcosahedronGeometry(1, 1);
    { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + Math.random() * 0.4; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } bg.computeVertexNormals(); }
    this.hotM = new THREE.MeshStandardMaterial({ color: '#2a1a14', emissive: '#ff5a10', emissiveIntensity: 2.4, roughness: 1 });
    this.rockM = new THREE.MeshStandardMaterial({ color: '#3a3330', emissive: '#6a2a10', emissiveIntensity: 0.35, roughness: 1 });
    for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(bg, this.hotM); m.visible = false; m.castShadow = true; scene.add(m); this.bombs.push({ m, on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1, hot: true }); }
    this.burstT = 2;
    this.flashes = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight('#ffa040', 0, 70, 1.5); scene.add(l); this.flashes.push(l); }
    this.fires = []; // {sprite, light?, x, z, t}
    this.fireTex = spark;
    this.scorchG = new THREE.CircleGeometry(1, 14); this.scorchM = new THREE.MeshBasicMaterial({ color: '#0b0908', transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.scorches = [];
    this.noise = makeNoise(77);
  }
  buildFlow(pts, k) {
    const n = pts.length, across = 5, Nn = makeNoise(pts[0].x | 0);
    const pos = new Float32Array(n * across * 3), uv = new Float32Array(n * across * 2), dist = new Float32Array(n * across);
    const idxs = [];
    let d = 0;
    const widths = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const px = -tz, pz = tx;
      if (i > 0) d += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
      const w = (3.5 + 5.5 * Math.min(1, i / 40)) * (0.75 + 0.5 * Nn.n2(i * 0.2, 0)) * (1 + 0.6 * Math.max(0, 1 - Math.max(0, heightAt(p.x, p.z)) / 6)); // fans out on the beach
      widths.push(w);
      for (let k = 0; k < across; k++) {
        const u = k / (across - 1), off = (u - 0.5) * w;
        const x = p.x + px * off, z = p.z + pz * off;
        const bulge = Math.sin(u * Math.PI) * 0.9;
        const j = i * across + k;
        pos[j * 3] = x; pos[j * 3 + 1] = heightAt(x, z) + 0.35 + bulge; pos[j * 3 + 2] = z;
        uv[j * 2] = u; uv[j * 2 + 1] = d / 12; dist[j] = d;
      }
      if (i > 0) for (let k = 0; k < across - 1; k++) {
        const a0 = (i - 1) * across + k, a1 = a0 + 1, b0 = i * across + k, b1 = b0 + 1;
        idxs.push(a0, a1, b0, a1, b1, b0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aDist', new THREE.BufferAttribute(dist, 1));
    g.setIndex(idxs); g.computeVertexNormals();
    const mat = this.lavaMat.clone(); mat.uniforms.uFront.value = -1;
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.visible = false; this.scene.add(m);
    return { pts, mesh: m, mat, length: d, widths, front: -1, burnIdx: 0, start: (k % 4) * 9 + (k * 7) % 11, speed: 2.4 + ((k * 13) % 7) * 0.25 };
  }
  // called each frame. ctx: { dt, progress, duration (s total), playerPos, camera, sunHeight }
  update(ctx) {
    const { dt, progress: p, playerPos, camera } = ctx;
    this.t += dt; this.progress = p;
    const stage = stageAt(p);
    if (stage !== this.stage) { this.stage = stage; if (this.hooks.onStage) this.hooks.onStage(stage); }
    const stageIdx = ['calm', 'unrest', 'ashfall', 'eruption', 'surge'].indexOf(stage.id);
    const sc = Math.min(1.6, Math.max(0.4, camera.aspect ? innerHeight / 700 : 1)); // point size scale per screen
    for (const s of [this.plume, this.ashFall, this.burst, this.embers, this.surge]) { s.u.uScale.value = innerHeight * 1.1; s.u.uLight.value = 0.35 + 0.65 * ctx.sunHeight; }
    this.embers.u.uLight.value = 1; // embers make their own light
    // ---- plume ----
    const rate = [5, 16, 40, 110, 130][stageIdx] * (this.hi ? 1 : 0.55);
    const dark = [0.05, 0.35, 0.7, 0.92, 1][stageIdx];
    const big = stageIdx >= 3 ? 1 : 0;
    this.plumeAcc = (this.plumeAcc || 0) + rate * dt;
    while (this.plumeAcc >= 1) {
      this.plumeAcc--;
      const a = Math.random() * Math.PI * 2, rr = Math.random() * (12 + big * 8);
      const up = 14 + stageIdx * 7 + Math.random() * 8 + big * 18;
      this.plume.emit(VOLCANO.x + Math.cos(a) * rr, this.craterY + 4, VOLCANO.z + Math.sin(a) * rr, (Math.random() - 0.5) * (3 + big * 6), up, (Math.random() - 0.5) * (3 + big * 6),
        18 + Math.random() * 16 + big * 14, 22 + Math.random() * 16 + stageIdx * 6, dark * (0.6 + Math.random() * 0.4), 0.55 + big * 0.2, 6 + stageIdx * 2.5 + big * 4, 1);
    }
    // the column billows: every few seconds a great dark bulge is thrown up out of the crater
    if (stageIdx >= 3) {
      this.burstT -= dt;
      if (this.burstT <= 0) {
        this.burstT = 2.5 + Math.random() * 4;
        for (let i = 0; i < (this.hi ? 60 : 30); i++) {
          const a = Math.random() * Math.PI * 2, rr = Math.random() * 10, sp = 10 + Math.random() * 16;
          this.plume.emit(VOLCANO.x + Math.cos(a) * rr, this.craterY + 6, VOLCANO.z + Math.sin(a) * rr, Math.cos(a) * sp * 0.5, 40 + Math.random() * 35, Math.sin(a) * sp * 0.5,
            30 + Math.random() * 30, 45 + Math.random() * 20, 0.85 + Math.random() * 0.15, 0.85, 12, 1);
          if (i % 3 === 0) this.embers.emit(VOLCANO.x, this.craterY + 3, VOLCANO.z, Math.cos(a) * sp, 45 + Math.random() * 40, Math.sin(a) * sp, 1.5 + Math.random() * 1.5, 3 + Math.random() * 3, Math.random(), 1, 0, 1);
        }
        this.shake = Math.max(this.shake, 0.3); if (this.hooks.onBurst) this.hooks.onBurst();
      }
    }
    this.plume.update(dt, 0.12, -0.6, this.wind * (1 + stageIdx * 0.3));
    // ---- embers (eruption) ----
    if (stageIdx >= 3) {
      for (let i = 0; i < (this.hi ? 6 : 3); i++) {
        const a = Math.random() * Math.PI * 2, sp = 25 + Math.random() * 45;
        this.embers.emit(VOLCANO.x, this.craterY + 3, VOLCANO.z, Math.cos(a) * sp * 0.4, sp, Math.sin(a) * sp * 0.4, 1.2 + Math.random() * 1.5, 2.5 + Math.random() * 3, Math.random(), 1, 0, 1);
      }
    }
    this.embers.update(dt, 0.1, 12, 0);
    // ---- tremors and rumble ----
    const baseRumble = [0.03, 0.18, 0.35, 0.75, 1][stageIdx];
    this.tremorT -= dt;
    if (this.tremorT <= 0 && stageIdx >= 1) {
      const gap = [0, [28, 55], [14, 30], [7, 15], [4, 8]][stageIdx];
      this.tremorT = gap[0] + Math.random() * (gap[1] - gap[0]);
      this.tremorEnv = [0, 0.45, 0.65, 1, 1][stageIdx]; this.tremorLife = 2.6;
      if (this.hooks.onTremor) this.hooks.onTremor(this.tremorEnv);
    }
    if (this.tremorLife > 0) { this.tremorLife -= dt; } else this.tremorEnv *= Math.max(0, 1 - dt * 2);
    const trem = this.tremorLife > 0 ? this.tremorEnv * Math.sin(Math.min(1, this.tremorLife / 2.6) * Math.PI) : 0;
    const distP = Math.hypot(playerPos.x - VOLCANO.x, playerPos.z - VOLCANO.z);
    const near = 1 - Math.min(1, Math.max(0, (distP - 60) / 380));
    this.shake = trem * (0.35 + 0.65 * near) + (stageIdx >= 3 ? 0.04 * near : 0);
    this.rumbleLevel = Math.min(1, baseRumble * (0.5 + 0.5 * near) + trem * 0.5);
    // ---- ash in the air ----
    const ashTarget = [0, 0.05, 0.25 + 0.45 * Math.min(1, (p - 0.48) / 0.2), 0.8, 1][stageIdx] || 0;
    this.ash += (ashTarget - this.ash) * Math.min(1, dt * 0.15);
    if (this.ash > 0.02) {
      const n = (this.hi ? 160 : 70) * this.ash * dt;
      this.ashAcc = (this.ashAcc || 0) + n;
      while (this.ashAcc >= 1) {
        this.ashAcc--;
        const x = camera.position.x + (Math.random() - 0.5) * 70, z = camera.position.z + (Math.random() - 0.5) * 70;
        this.ashFall.emit(x, camera.position.y + 10 + Math.random() * 25, z, (Math.random() - 0.5) * 1.5 + this.wind * 0.5, -1.2 - Math.random() * 1.5, (Math.random() - 0.5) * 1.5,
          0.25 + Math.random() * 0.5, 12, Math.random(), 0.75, 0, 1);
      }
    }
    this.ashFall.update(dt, 0.05, 0, 0.1);
    // ---- lightning in the column ----
    this.flash *= Math.max(0, 1 - dt * 6);
    if (stageIdx >= 3) { this.lightT -= dt; if (this.lightT <= 0) { this.lightT = 3 + Math.random() * 9; this.flash = 1; if (this.hooks.onLightning) this.hooks.onLightning(distP); } }
    this.glow[0].set(VOLCANO.x, VOLCANO.z, 70, [0, 0.15, 0.35, 0.9, 1][stageIdx]);
    { const g = [0, 0.1, 0.25, 0.7, 0.85][stageIdx] * (0.8 + 0.2 * Math.sin(this.t * 5.3) * Math.sin(this.t * 2.1)); this.craterGlow.material.opacity += (g - this.craterGlow.material.opacity) * Math.min(1, dt * 2); const sc = 70 + stageIdx * 40; this.craterGlow.scale.set(sc, sc * 0.8, 1); }
    if (p < 0.72) for (let i = 1; i < 8; i++) this.glow[i].w = 0;
    // ---- the crater glow ----
    const glowT = [0, 0.6, 1.2, 4.5, 5][stageIdx] * (0.9 + 0.1 * Math.sin(this.t * 7));
    this.glow.intensity += (glowT * 400 - this.glow.intensity) * Math.min(1, dt);
    this.lavaU.uTime.value = this.t;
    // ---- lava bombs ----
    if (stageIdx >= 3) {
      this.bombT -= dt;
      if (this.bombT <= 0) {
        this.bombT = stageIdx === 4 ? 0.5 + Math.random() * 0.8 : 0.9 + Math.random() * 1.6;
        this.launchBomb(playerPos, Math.random() < 0.4);
      }
    }
    this.updateBombs(dt, playerPos);
    this.burst.update(dt, 0.9, 6, 0);
    // ---- lava flows ----
    if (p >= 0.72) {
      // lava creeps at a few metres a second, each flow setting off a little after the last
      const erupS = (p - 0.72) * (ctx.duration || 1440);
      for (const f of this.flows) {
        f.front = Math.min(f.length + 10, (erupS - f.start) * f.speed);
        f.mesh.visible = f.front > 0;
        if (f.front <= 0) continue;
        f.mat.uniforms.uFront.value = f.front; f.mat.uniforms.uTime.value = this.t;
        this.burnAlongFlow(f);
      }
      // lights ride the three nearest lava fronts, and the ground glows around every front
      const fronts = [];
      for (const f of this.flows) { const fp = this.frontPoint(f); if (!fp) continue; fronts.push({ fp, d: Math.hypot(fp.x - playerPos.x, fp.z - playerPos.z) }); }
      fronts.sort((a, b) => a.d - b.d);
      this.nearFront = fronts.length ? fronts[0].d : 1e9;
      this.flowLights.forEach((l, i) => { const f = fronts[i]; if (f) { l.position.set(f.fp.x, f.fp.y + 6, f.fp.z); l.intensity = 900 * (0.85 + 0.15 * Math.sin(this.t * 9 + i)); } else l.intensity = 0; });
      for (let i = 1; i < 8; i++) { const f = fronts[i - 1]; if (f) this.glow[i].set(f.fp.x, f.fp.z, 16, 0.9); else this.glow[i].w = 0; }
      // steam where lava pours into the sea
      for (const f of this.flows) { const fp = this.frontPoint(f); if (fp && fp.y < 1.5 && f.front < f.length + 9) { for (let i = 0; i < (this.hi ? 3 : 1); i++) this.plume.emit(fp.x + (Math.random() - 0.5) * 8, 0.5, fp.z + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 2, 4 + Math.random() * 4, (Math.random() - 0.5) * 2, 6 + Math.random() * 6, 7 + Math.random() * 4, 0.02, 0.6, 5, 1); } }
      // smoke and sparks off the fronts
      for (const f of this.flows) { const fp = this.frontPoint(f); if (fp && Math.random() < 0.6) { this.plume.emit(fp.x, fp.y + 1, fp.z, 0, 3, 0, 5, 8, 0.6, 0.45, 2); if (Math.random() < 0.5) this.embers.emit(fp.x, fp.y + 1, fp.z, (Math.random() - 0.5) * 6, 4 + Math.random() * 5, (Math.random() - 0.5) * 6, 0.8, 1.5, Math.random(), 1); } }
    }
    // ---- the surge ----
    if (stageIdx >= 4) {
      const st = (p - 0.94) / 0.06; // 0..1
      this.surgeR = st * 620;
      for (let i = 0; i < (this.hi ? 14 : 7); i++) {
        const a = Math.random() * Math.PI * 2, rr = this.surgeR * (0.75 + Math.random() * 0.3);
        const x = VOLCANO.x + Math.cos(a) * rr, z = VOLCANO.z + Math.sin(a) * rr, y = Math.max(0, heightAt(x, z)) + 6 + Math.random() * 40;
        this.surge.emit(x, y, z, Math.cos(a) * 22, 3 + Math.random() * 6, Math.sin(a) * 22, 30 + Math.random() * 30, 9, Math.random() * 0.6, 0.85, 10);
      }
    }
    this.surge.update(dt, 0.25, -1.5, 0);
    // fires burn down
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i]; f.t -= dt;
      const k = Math.min(1, f.t / 10);
      f.s.scale.set((2.5 + Math.sin(this.t * 13 + f.x) * 0.6) * k, (4 + Math.sin(this.t * 17 + f.z) * 1.2) * k, 1);
      f.s.position.y = f.y + f.s.scale.y * 0.4;
      if (Math.random() < 0.25 * k) this.plume.emit(f.x, f.y + 2, f.z, 0, 2.5, 0, 3, 6, 0.75, 0.35, 1.5);
      if (f.t <= 0) { this.scene.remove(f.s); this.fires.splice(i, 1); }
    }
    for (const l of this.flashes) l.intensity *= Math.max(0, 1 - dt * 6);
    return { stageIdx, ash: this.ash, shake: this.shake, rumble: this.rumbleLevel, plume: [0.08, 0.3, 0.6, 0.9, 1][stageIdx], surgeR: this.surgeR, flash: this.flash, nearFront: this.nearFront };
  }
  frontPoint(f) {
    if (f.front <= 0) return null;
    let d = 0;
    for (let i = 1; i < f.pts.length; i++) { d += Math.hypot(f.pts[i].x - f.pts[i - 1].x, f.pts[i].z - f.pts[i - 1].z); if (d >= f.front) return f.pts[i]; }
    return f.pts[f.pts.length - 1];
  }
  // palms in the path of a flow catch fire and go
  burnAlongFlow(f) {
    const fp = this.frontPoint(f); if (!fp) return;
    for (const o of this.world.obstaclesNear(fp.x, fp.z)) {
      if (o.alive && o.v != null && Math.hypot(o.x - fp.x, o.z - fp.z) < 9) { this.world.fellTree(o); if (this.fires.length < 40) this.fire(o.x, heightAt(o.x, o.z), o.z, 25); }
    }
  }
  // how much lava heat is at a point: 1 inside a flow, fading to 0 within a couple of metres of its edge
  heatAt(x, z) {
    if (this.progress < 0.72) return 0;
    let best = 0;
    for (const f of this.flows) {
      if (f.front <= 0) continue;
      let d = 0;
      for (let i = 0; i < f.pts.length && d <= f.front; i++) {
        if (i > 0) d += Math.hypot(f.pts[i].x - f.pts[i - 1].x, f.pts[i].z - f.pts[i - 1].z);
        const p = f.pts[i], w = f.widths[i] * 0.5, dd = Math.hypot(x - p.x, z - p.z);
        if (dd < w + 2.5) best = Math.max(best, Math.min(1, (w + 2.5 - dd) / 2.5));
      }
    }
    // the crater itself
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < 26) best = 1;
    return best;
  }
  launchBomb(target, rock = false) {
    const b = this.bombs.find((q) => !q.on); if (!b) return;
    b.on = true; b.m.visible = true; b.hot = !rock; b.m.material = rock ? this.rockM : this.hotM; b.s = (rock ? 0.5 : 0.7) + Math.random() * (rock ? 1.0 : 1.6); b.m.scale.setScalar(b.s);
    b.x = VOLCANO.x; b.y = this.craterY + 5; b.z = VOLCANO.z;
    const up = 70 + Math.random() * 45;
    // sometimes one is thrown toward the player, which is the point
    const d = Math.hypot(target.x - VOLCANO.x, target.z - VOLCANO.z);
    if (Math.random() < 0.4 && d < 480) {
      const tf = up / 9.81 * 2; // flight time
      const err = 25 + Math.random() * 35, a = Math.random() * Math.PI * 2;
      b.vx = (target.x + Math.cos(a) * err - VOLCANO.x) / tf; b.vz = (target.z + Math.sin(a) * err - VOLCANO.z) / tf;
    } else { const a = Math.random() * Math.PI * 2, sp = 8 + Math.random() * 38; b.vx = Math.cos(a) * sp; b.vz = Math.sin(a) * sp; }
    b.vy = up; b.whistled = false;
    if (this.hooks.onLaunch) this.hooks.onLaunch(b);
  }
  updateBombs(dt, playerPos) {
    let near = null, nd = 220;
    for (const b of this.bombs) {
      if (!b.on) continue;
      if (b.hot) { const d = Math.hypot(b.x - playerPos.x, b.z - playerPos.z); if (d < nd) { nd = d; near = b; } }
      b.vy -= 9.81 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.m.position.set(b.x, b.y, b.z); b.m.rotation.x += dt * 3; b.m.rotation.z += dt * 2;
      if (Math.random() < 0.7) this.plume.emit(b.x, b.y, b.z, 0, 0.5, 0, 2.5 * b.s, 2.2, b.hot ? 0.55 : 0.8, 0.4, 2.5);
      if (b.hot && Math.random() < 0.5) this.embers.emit(b.x, b.y, b.z, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0.9, 0.8, Math.random(), 1);
      if (b.vy < 0 && !b.whistled && Math.hypot(b.x - playerPos.x, b.z - playerPos.z) < 160) { b.whistled = true; if (this.hooks.onWhistle) this.hooks.onWhistle(); }
      const g = heightAt(b.x, b.z);
      if (b.y <= Math.max(g, 0) + b.s * 0.5) {
        b.on = false; b.m.visible = false;
        if (g < 0) { for (let i = 0; i < 25; i++) this.burst.emit(b.x, 0.5, b.z, (Math.random() - 0.5) * 10, 4 + Math.random() * 9, (Math.random() - 0.5) * 10, 2 + Math.random() * 3, 1.5 + Math.random(), 0.0, 0.8, 4); this.burst.u.uColA.value.set('#ffb060'); if (this.hooks.onExplode) this.hooks.onExplode(b.x, 0, b.z, 0, true); continue; }
        if (b.hot) this.explode(b.x, g, b.z, 7 + b.s * 3.5); else this.thud(b.x, g, b.z, 3 + b.s * 2.5);
      }
    }
    if (near) { this.bombLight.position.set(near.x, near.y, near.z); this.bombLight.intensity = 700 * near.s; } else this.bombLight.intensity *= Math.max(0, 1 - dt * 8);
  }
  explode(x, y, z, radius) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 16;
      this.burst.emit(x, y + 1, z, Math.cos(a) * sp, 8 + Math.random() * 14, Math.sin(a) * sp, 2.5 + Math.random() * 4, 1.8 + Math.random() * 1.5, Math.random() * 0.4, 0.9, 8);
    }
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = 10 + Math.random() * 25; this.embers.emit(x, y + 1, z, Math.cos(a) * sp, 10 + Math.random() * 20, Math.sin(a) * sp, 0.8 + Math.random(), 1.5 + Math.random() * 1.5, Math.random(), 1); }
    for (let i = 0; i < 12; i++) this.plume.emit(x, y + 2, z, (Math.random() - 0.5) * 6, 5 + Math.random() * 6, (Math.random() - 0.5) * 6, 6, 9, 0.7, 0.5, 4);
    const l = this.flashes.reduce((a, b) => (a.intensity < b.intensity ? a : b)); l.position.set(x, y + 4, z); l.intensity = 2500;
    const sc = new THREE.Mesh(this.scorchG, this.scorchM); sc.rotation.x = -Math.PI / 2; sc.position.set(x, y + 0.15, z); sc.scale.setScalar(radius * 0.9); this.scene.add(sc); this.scorches.push(sc);
    if (this.scorches.length > 60) this.scene.remove(this.scorches.shift());
    if (this.fires.length < 40) this.fire(x, y, z, 45);
    for (const o of this.world.obstaclesNear(x, z)) if (o.alive && o.v != null && Math.hypot(o.x - x, o.z - z) < radius) { this.world.fellTree(o); if (this.fires.length < 40 && Math.random() < 0.5) this.fire(o.x, heightAt(o.x, o.z), o.z, 30); }
    if (this.hooks.onExplode) this.hooks.onExplode(x, y, z, radius, false);
  }
  // a cold rock lands: dust, a crater mark and anyone underneath it is crushed
  thud(x, y, z, radius) {
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8; this.burst.emit(x, y + 0.5, z, Math.cos(a) * sp, 2 + Math.random() * 5, Math.sin(a) * sp, 2 + Math.random() * 3, 1.5 + Math.random(), 0.9, 0.6, 5); }
    const sc = new THREE.Mesh(this.scorchG, this.scorchM); sc.rotation.x = -Math.PI / 2; sc.position.set(x, y + 0.15, z); sc.scale.setScalar(radius * 0.6); this.scene.add(sc); this.scorches.push(sc);
    if (this.scorches.length > 60) this.scene.remove(this.scorches.shift());
    for (const o of this.world.obstaclesNear(x, z)) if (o.alive && o.v != null && Math.hypot(o.x - x, o.z - z) < radius * 0.6) this.world.fellTree(o);
    if (this.hooks.onExplode) this.hooks.onExplode(x, y, z, radius, false, true);
  }
  fire(x, y, z, life) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fireTex, color: '#ff8a20', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(x, y + 1.5, z); this.scene.add(s);
    this.fires.push({ s, x, y, z, t: life });
  }
}
