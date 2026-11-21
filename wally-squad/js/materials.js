// Shared materials. Every lit material is patched so the fog-of-war texture darkens it.
import * as THREE from 'three';
import { FACTIONS, WORLD } from './config.js';
import { G } from './state.js';
import { applySkin } from './skins.js';
import { panelTexture, metalTexture, concreteTexture, hazardTexture, windowTexture, treadTexture } from './textures.js';

export const fogUniforms = {
  uFogTex: { value: null },
  uWorld: { value: WORLD },
  uFogOn: { value: 1 },
};

export const allMaterials = [];
export function fogify(mat) {
  allMaterials.push(mat);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFogTex = fogUniforms.uFogTex;
    shader.uniforms.uWorld = fogUniforms.uWorld;
    shader.uniforms.uFogOn = fogUniforms.uFogOn;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFogW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 fogWP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fogWP = instanceMatrix * fogWP;
        #endif
        vFogW = (modelMatrix * fogWP).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFogW;\nuniform sampler2D uFogTex;\nuniform float uWorld;\nuniform float uFogOn;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (uFogOn > 0.5) {
          vec2 fuv = vFogW.xz / uWorld + 0.5;
          float fv = texture2D(uFogTex, fuv).r;
          gl_FragColor.rgb *= fv;
        }`);
  };
  mat.customProgramCacheKey = () => 'fog1';
  return mat;
}

function std(opts) { return fogify(new THREE.MeshStandardMaterial(opts)); }

const factionMats = {};
export function mats(faction) {
  if (factionMats[faction]) return factionMats[faction];
  const F = FACTIONS[faction];
  const panel = panelTexture();
  const m = {
    team: std({ color: F.color, map: panel, roughness: 0.55, metalness: 0.35 }),
    teamDark: std({ color: F.dark, map: panel, roughness: 0.6, metalness: 0.3 }),
    accent: std({ color: F.accent, map: panel, roughness: 0.45, metalness: 0.4 }),
    glow: std({ color: F.light, emissive: F.light, emissiveIntensity: 2.2, roughness: 0.3 }),
  };
  if (faction === G.player && G.skin) applySkin(m, G.skin); // your own army's armour pattern
  return (factionMats[faction] = m);
}

let common = null;
export function M() {
  if (common) return common;
  const metal = metalTexture();
  const tread = treadTexture();
  const win = windowTexture();
  common = {
    metal: std({ color: 0xe2e6ea, map: metal, roughness: 0.32, metalness: 0.85 }),
    gold: std({ color: 0xe0a92a, map: metal, roughness: 0.28, metalness: 0.95 }),
    darkMetal: std({ color: 0x80858c, map: metal, roughness: 0.48, metalness: 0.7 }),
    gun: std({ color: 0x5a5e64, map: metal, roughness: 0.38, metalness: 0.85 }),
    tread: std({ color: 0x9a9a9a, map: tread, roughness: 0.9, metalness: 0.2 }),
    rubber: std({ color: 0x161616, roughness: 0.95, metalness: 0.0 }),
    concrete: std({ color: 0xd0ccc2, map: concreteTexture(), roughness: 0.92, metalness: 0.0 }),
    concreteDark: std({ color: 0x77736c, map: concreteTexture(), roughness: 0.95, metalness: 0.0 }),
    hazard: std({ map: hazardTexture(), roughness: 0.7, metalness: 0.1 }),
    glass: std({ color: 0x223344, emissive: 0x4fb4ff, emissiveIntensity: 0.25, roughness: 0.05, metalness: 0.9 }),
    windows: std({ color: 0x222222, map: win, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.5 }),
    lampRed: std({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 4, roughness: 0.3 }),
    lampGreen: std({ color: 0x33ff66, emissive: 0x33ff66, emissiveIntensity: 3, roughness: 0.3 }),
    lampWhite: std({ color: 0xfff2d0, emissive: 0xfff2d0, emissiveIntensity: 4, roughness: 0.3 }),
    energy: std({ color: 0x66e0ff, emissive: 0x66e0ff, emissiveIntensity: 3.5, roughness: 0.2 }),
    plasma: std({ color: 0xd070ff, emissive: 0xc050ff, emissiveIntensity: 4, roughness: 0.2 }),
    skin: std({ color: 0xd9a77e, roughness: 0.75 }),
    medic: std({ color: 0xeef0f2, roughness: 0.7 }),
    cloth: std({ color: 0x4e5a3a, roughness: 0.9 }),
    black: std({ color: 0x0c0c0c, roughness: 0.8 }),
    wood: std({ color: 0x6b4a2e, roughness: 0.9 }),
    sand: std({ color: 0xb59e72, roughness: 1 }),
    burnt: std({ color: 0x141210, roughness: 1, metalness: 0.2 }),
    crystal: std({ color: 0x3dffa0, emissive: 0x1aff8a, emissiveIntensity: 0.75, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.92 }),
    crystalBlue: std({ color: 0x5ab8ff, emissive: 0x3a8cff, emissiveIntensity: 0.95, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.92 }),
  };
  return common;
}
