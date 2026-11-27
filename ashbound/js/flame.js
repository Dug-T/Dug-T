// Fire: an animated flame drawn on billboards that always face the camera but stay upright. Scrolling noise bends
// the body and licks tongues off it; the colour runs from a white-yellow core through orange to deep red at the tips.
// Two layers per flame, each with its own seed, give it some depth. Shared by campfires, fire pits, the torch and
// the forest fires the eruption starts.
import * as THREE from 'three';
import { noiseTexture } from './textures.js';

export const FLAME_U = { uTime: { value: 0 }, tNoise: { value: null } };
let mat = null;
function material() {
  if (mat) return mat;
  FLAME_U.tNoise.value = noiseTexture();
  mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uHeat: { value: 1 } }]),
    // premultiplied "over": the flame both glows and partly hides what's behind it, so it stays orange against a
    // bright sky instead of washing out to white as pure additive light would
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    side: THREE.DoubleSide, fog: true,
    vertexShader: `varying vec2 vUv; varying float vSeed; varying float vFogDepth2;
      void main(){
        vUv = uv;
        vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vSeed = fract(sin(dot(c.xz, vec2(12.9898, 78.233))) * 43758.5453) * 20.0;
        float sx = length(modelMatrix[0].xyz), sy = length(modelMatrix[1].xyz);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        right = normalize(vec3(right.x, 0.0, right.z) + vec3(1e-5, 0.0, 0.0));
        vec3 wp = c + right * position.x * sx + vec3(0.0, position.y * sy, 0.0);
        vec4 mv = viewMatrix * vec4(wp, 1.0); vFogDepth2 = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D tNoise; uniform float uTime, uHeat, fogNear, fogFar; varying vec2 vUv; varying float vSeed; varying float vFogDepth2;
      float nz(vec2 p){ return texture2D(tNoise, p).r; }
      void main(){
        float y = vUv.y, t = uTime + vSeed;
        // turbulence: the noise is stretched to full contrast so it tears the flame apart, not just ripples it
        float d1 = nz(vec2(vUv.x * 0.8 + vSeed * 0.05, y * 0.6 - t * 0.7)) - 0.5;
        float d2 = nz(vec2(vUv.x * 1.9 - vSeed * 0.03, y * 1.5 - t * 1.6)) - 0.5;
        float x = vUv.x - 0.5 + (d1 * 0.9 + d2 * 0.45) * y * 0.8;
        // a teardrop: rounded at the base, drawn up to a point
        float w = 0.42 * pow(max(0.0, 1.0 - y), 0.65) * smoothstep(-0.12, 0.16, y) + 0.008;
        float body = 1.0 - smoothstep(w * 0.15, w, abs(x));
        float tA = nz(vec2(vUv.x * 2.6 + vSeed * 0.07, y * 2.1 - t * 2.3));
        float tB = nz(vec2(vUv.x * 5.2 - vSeed * 0.11, y * 4.4 - t * 3.6));
        float turb = clamp(((tA * 0.62 + tB * 0.38) - 0.5) * 3.2 + 0.5, 0.0, 1.0);
        float f = body * mix(1.0, turb, smoothstep(0.08, 0.75, y)) * (1.0 - pow(y, 2.0) * 0.6);
        f = smoothstep(0.12, 0.62, f) * smoothstep(0.0, 0.05, y);
        // hottest low in the middle, cooling towards the edges and the tips
        float temp = f * (1.05 - y * 0.75);
        vec3 col = mix(vec3(0.5, 0.06, 0.0), vec3(1.0, 0.35, 0.03), smoothstep(0.0, 0.3, temp));
        col = mix(col, vec3(1.0, 0.68, 0.18), smoothstep(0.3, 0.6, temp));
        col = mix(col, vec3(1.0, 0.9, 0.65), smoothstep(0.62, 0.9, temp));
        // a hint of blue where the fire meets the fuel
        col = mix(col, vec3(0.3, 0.45, 1.0), smoothstep(0.1, 0.0, y) * smoothstep(0.2, 0.6, f) * 0.4);
        float a = smoothstep(0.0, 0.35, f);
        float fog = smoothstep(fogNear, fogFar, vFogDepth2);
        gl_FragColor = vec4(col * a * uHeat * 0.82 * (1.0 - fog), a * 0.7 * uHeat * (1.0 - fog));
      }`,
  });
  mat.uniforms.uTime = FLAME_U.uTime; mat.uniforms.tNoise = FLAME_U.tNoise;
  return mat;
}

// A flame whose origin is at its base. Scale it to size: x is the width, y the height.
let innerMat = null;
export function makeFlame() {
  const m = material();
  if (!innerMat) { innerMat = m.clone(); innerMat.uniforms.uTime = FLAME_U.uTime; innerMat.uniforms.tNoise = FLAME_U.tNoise; innerMat.uniforms.uHeat.value = 0.45; }
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, 1, 1, 1); geo.translate(0, 0.5, 0);
  const outer = new THREE.Mesh(geo, m); outer.renderOrder = 7; g.add(outer);
  // a second, narrower layer just in front: a hotter core with its own flicker
  const inner = new THREE.Mesh(geo, innerMat); inner.renderOrder = 7; inner.scale.set(0.62, 0.78, 1); inner.position.set(0.013, 0, 0.011); g.add(inner);
  return g;
}
