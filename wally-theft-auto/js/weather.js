// Weather: changes every few minutes between Scottish classics. Rain and snow are GPU particles
// that wrap around the camera, so they cost almost nothing on the CPU.
import * as THREE from 'three';

export const WEATHERS = {
  clear: { name: 'Braw', icon: '☀️', cloud: 0.12, rain: 0, snow: 0, fog: 1, light: 1, wet: 0, wind: 0.1, weight: 3 },
  overcast: { name: 'Dreich', icon: '☁️', cloud: 0.75, rain: 0, snow: 0, fog: 0.8, light: 0.72, wet: 0.15, wind: 0.3, weight: 3 },
  rain: { name: "Pishin' doon", icon: '🌧️', cloud: 0.9, rain: 0.6, snow: 0, fog: 0.62, light: 0.55, wet: 1, wind: 0.4, weight: 3 },
  storm: { name: "Blawin' a hoolie", icon: '⛈️', cloud: 1, rain: 1, snow: 0, fog: 0.5, light: 0.38, wet: 1, wind: 1, lightning: true, weight: 1.5 },
  haar: { name: 'The Haar (sea fog)', icon: '🌫️', cloud: 0.55, rain: 0, snow: 0, fog: 0.2, light: 0.75, wet: 0.3, wind: 0.05, weight: 1.5 },
  snow: { name: "Snawin'", icon: '🌨️', cloud: 0.85, rain: 0, snow: 1, fog: 0.55, light: 0.7, wet: 0.35, wind: 0.25, weight: 1 },
};
const KEYS = ['cloud', 'rain', 'snow', 'fog', 'light', 'wet', 'wind'];

const BOX = new THREE.Vector3(70, 40, 70);
const COMMON_VS = `
  uniform float uTime, uFall, uAmount, uLen;
  uniform vec3 uOrigin, uBox; uniform vec2 uWind;
  attribute float aEnd, aRand;
  varying float vAlpha;
  vec3 place(vec3 p) {
    p.y -= uFall * uTime * (0.8 + 0.4 * aRand);
    p.xz += uWind * uTime;
    vec3 lo = uOrigin - uBox * 0.5;
    return mod(p - lo, uBox) + lo;
  }`;

function buildRain(n) {
  const pos = new Float32Array(n * 6), end = new Float32Array(n * 2), rnd = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = Math.random() * BOX.x, y = Math.random() * BOX.y, z = Math.random() * BOX.z, r = Math.random();
    pos.set([x, y, z, x, y, z], i * 6); end.set([0, 1], i * 2); rnd.set([r, r], i * 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFall: { value: 22 }, uAmount: { value: 0 }, uLen: { value: 0.9 }, uOrigin: { value: new THREE.Vector3() }, uBox: { value: BOX }, uWind: { value: new THREE.Vector2() }, uCol: { value: new THREE.Color('#c8d4e0') } },
    vertexShader: COMMON_VS + `
      void main() {
        vec3 p = place(position);
        vec3 vel = normalize(vec3(uWind.x, -uFall, uWind.y));
        p -= vel * aEnd * uLen;
        vAlpha = step(aRand, uAmount) * (0.25 + 0.2 * aEnd);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: 'uniform vec3 uCol; varying float vAlpha; void main(){ if (vAlpha < 0.01) discard; gl_FragColor = vec4(uCol, vAlpha); }',
    transparent: true, depthWrite: false,
  });
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false; l.renderOrder = 5;
  return l;
}

function buildSnow(n) {
  const pos = new Float32Array(n * 3), end = new Float32Array(n), rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos.set([Math.random() * BOX.x, Math.random() * BOX.y, Math.random() * BOX.z], i * 3); rnd[i] = Math.random(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFall: { value: 1.6 }, uAmount: { value: 0 }, uLen: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uBox: { value: BOX }, uWind: { value: new THREE.Vector2() }, uScale: { value: 400 } },
    vertexShader: COMMON_VS + `
      uniform float uScale;
      void main() {
        vec3 p = place(position);
        p.x += sin(uTime * 1.3 + aRand * 40.0) * 0.6; p.z += cos(uTime * 1.1 + aRand * 30.0) * 0.6;
        vAlpha = step(aRand, uAmount);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_PointSize = (0.1 + aRand * 0.1) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: 'varying float vAlpha; void main(){ if (vAlpha < 0.01) discard; float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, (1.0 - d * 2.0) * 0.9); }',
    transparent: true, depthWrite: false,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 5;
  return p;
}

export class Weather {
  constructor(scene, hi) {
    this.rain = buildRain(hi ? 7000 : 3000);
    this.snow = buildSnow(hi ? 9000 : 4000);
    scene.add(this.rain, this.snow);
    this.id = 'clear'; this.v = { ...WEATHERS.clear };
    this.timer = 90 + Math.random() * 60; this.flash = 0; this.boltT = 6; this.t = 0;
  }
  set(id, instant) {
    if (!WEATHERS[id]) return;
    this.id = id;
    if (instant) for (const k of KEYS) this.v[k] = WEATHERS[id][k];
  }
  pick() {
    const opts = Object.entries(WEATHERS).filter(([k]) => k !== this.id);
    let total = opts.reduce((a, [, w]) => a + w.weight, 0), r = Math.random() * total;
    for (const [k, w] of opts) { r -= w.weight; if (r <= 0) return k; }
    return 'clear';
  }
  // returns the new weather's id when it changes, so the game can announce it
  update(dt, camPos, onThunder) {
    this.t += dt;
    let changed = null;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = 150 + Math.random() * 150; this.set(this.pick()); changed = this.id; }
    const W = WEATHERS[this.id], k = Math.min(1, dt / 12);
    for (const key of KEYS) this.v[key] += (W[key] - this.v[key]) * k;
    // lightning
    this.flash = Math.max(0, this.flash - dt * 5);
    if (W.lightning && this.v.rain > 0.7) {
      this.boltT -= dt;
      if (this.boltT <= 0) {
        this.boltT = 4 + Math.random() * 9; this.flash = 1;
        setTimeout(() => { this.flash = 0.8; }, 90); setTimeout(() => { this.flash = Math.max(this.flash, 0.5); }, 220);
        if (onThunder) setTimeout(onThunder, 400 + Math.random() * 1800);
      }
    }
    const wind = this.v.wind, ang = this.t * 0.03;
    for (const m of [this.rain.material, this.snow.material]) {
      m.uniforms.uTime.value = this.t; m.uniforms.uOrigin.value.copy(camPos);
      m.uniforms.uWind.value.set(Math.cos(ang) * wind * 7, Math.sin(ang) * wind * 7);
    }
    this.rain.material.uniforms.uAmount.value = this.v.rain;
    this.rain.material.uniforms.uFall.value = 18 + this.v.rain * 8;
    this.rain.visible = this.v.rain > 0.01;
    this.snow.material.uniforms.uAmount.value = this.v.snow;
    this.snow.visible = this.v.snow > 0.01;
    return changed;
  }
}
