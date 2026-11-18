// Graphics settings: resolution (including supersampling), shadow quality, bloom, FPS counter and
// automatic quality. Saved in the browser and applied live.
import * as THREE from 'three';
import { appSize } from './orient.js';

export const PRESETS = {
  low:    { label: 'Low',    maxDpr: 1,   scale: 0.85, shadows: 'off',  bloom: false, samples: 0 },
  medium: { label: 'Medium', maxDpr: 1.5, scale: 1,    shadows: 'med',  bloom: true,  samples: 2 },
  high:   { label: 'High',   maxDpr: 2,   scale: 1,    shadows: 'high', bloom: true,  samples: 4 },
  ultra:  { label: 'Ultra',  maxDpr: 3,   scale: 1.25, shadows: 'ultra', bloom: true, samples: 8 },
};
const SHADOW = { off: 0, med: 1024, high: 2048, ultra: 4096 };

const touch = matchMedia('(pointer: coarse)').matches;
const defaults = () => ({ preset: touch ? 'medium' : 'high', ...PRESETS[touch ? 'medium' : 'high'], auto: true, fps: false });
export const gfx = (() => {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem('ws_gfx') || '{}') }; } catch { return defaults(); }
})();
const save = () => { try { localStorage.setItem('ws_gfx', JSON.stringify(gfx)); } catch { /* ignore */ } };

let ctx = null;          // { renderer, sun, bloom, composer, resize }
export let autoFactor = 1; // lowered automatically when the frame rate drops

export function pixelRatio() {
  return Math.min(window.devicePixelRatio || 1, gfx.maxDpr) * gfx.scale * autoFactor;
}

export function initGraphics(c) {
  ctx = c;
  c.renderer.shadowMap.enabled = gfx.shadows !== 'off';
  apply();
}

export function apply() {
  if (!ctx) return;
  const { renderer, sun, bloom, composer } = ctx;
  renderer.setPixelRatio(pixelRatio());
  const size = SHADOW[gfx.shadows] || 0;
  const on = size > 0;
  if (renderer.shadowMap.enabled !== on) { renderer.shadowMap.enabled = on; renderer.shadowMap.needsUpdate = true; recompileAll(); }
  sun.castShadow = on;
  if (on && sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  if (bloom) bloom.enabled = gfx.bloom;
  if (composer && composer.renderTarget1) {
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== gfx.samples) { rt.samples = gfx.samples; rt.dispose(); }
  }
  ctx.resize?.();
  const f = document.getElementById('fps'); if (f) f.style.display = gfx.fps ? 'block' : 'none';
}

function recompileAll() {
  ctx.scene?.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
}

// called once a second by the game loop with the measured frame rate
export function autoTune(fps) {
  const el = document.getElementById('fps');
  if (el && gfx.fps) el.textContent = `${Math.round(fps)} FPS · ${Math.round(ctx.renderer.domElement.width)}×${Math.round(ctx.renderer.domElement.height)}`;
  if (!gfx.auto) { if (autoFactor !== 1) { autoFactor = 1; apply(); } return; }
  if (fps < 30 && autoFactor > 0.55) { autoFactor = Math.max(0.55, autoFactor - 0.15); apply(); }
  else if (fps > 56 && autoFactor < 1) { autoFactor = Math.min(1, autoFactor + 0.1); apply(); }
}

export function maxAnisotropy() { return ctx ? ctx.renderer.capabilities.getMaxAnisotropy() : 8; }

// ------------------------------------------------------------------ settings panel
export function buildGraphicsPanel(el) {
  const render = () => {
    el.innerHTML = '';
    const presetRow = document.createElement('div'); presetRow.className = 'row';
    for (const [k, p] of Object.entries(PRESETS)) {
      const b = document.createElement('button'); b.className = 'btn' + (gfx.preset === k ? ' on' : ''); b.textContent = p.label;
      b.onclick = () => { Object.assign(gfx, PRESETS[k], { preset: k }); save(); apply(); render(); };
      presetRow.appendChild(b);
    }
    el.append(label('Quality preset'), presetRow);
    // resolution slider
    const res = document.createElement('div'); res.className = 'gfxRow';
    const r = document.createElement('input'); r.type = 'range'; r.min = 50; r.max = 150; r.step = 5; r.value = Math.round(gfx.scale * 100); r.className = 'dsgRange';
    const v = document.createElement('b');
    const upd = () => { const pr = pixelRatio(); const A = appSize(); v.textContent = `${r.value}%  (${Math.round(A.w * pr)}×${Math.round(A.h * pr)})`; };
    r.oninput = () => { gfx.scale = r.value / 100; gfx.preset = 'custom'; save(); apply(); upd(); };
    upd(); res.append(r, v);
    el.append(label('Resolution scale (over 100% = supersampling, sharpest image)'), res);
    // shadows
    const sh = document.createElement('div'); sh.className = 'row';
    for (const [k, t] of Object.entries({ off: 'Off', med: 'Medium', high: 'High', ultra: 'Ultra (4096)' })) {
      const b = document.createElement('button'); b.className = 'btn' + (gfx.shadows === k ? ' on' : ''); b.textContent = t;
      b.onclick = () => { gfx.shadows = k; gfx.preset = 'custom'; save(); apply(); render(); };
      sh.appendChild(b);
    }
    el.append(label('Shadows'), sh);
    // toggles
    const tg = document.createElement('div'); tg.className = 'row';
    const toggle = (txt, key) => { const b = document.createElement('button'); b.className = 'btn' + (gfx[key] ? ' on' : ''); b.textContent = (gfx[key] ? '✔ ' : '') + txt; b.onclick = () => { gfx[key] = !gfx[key]; save(); apply(); render(); }; tg.appendChild(b); };
    toggle('Bloom glow', 'bloom'); toggle('Anti-aliasing', 'aa'); toggle('Auto-adjust for smooth play', 'auto'); toggle('Show FPS', 'fps');
    el.append(label('Options'), tg);
    const note = document.createElement('p'); note.style.cssText = 'text-align:center;color:var(--dim);font-size:13px';
    note.textContent = 'Tip: if the game stutters, choose a lower preset or turn on auto-adjust. Ultra looks best on a powerful computer.';
    el.appendChild(note);
  };
  render();
}
const label = t => { const d = document.createElement('div'); d.className = 'label'; d.textContent = t; return d; };

// anti-aliasing toggle maps onto MSAA samples
Object.defineProperty(gfx, 'aa', {
  get() { return this.samples > 0; },
  set(v) { this.samples = v ? (this.preset === 'ultra' ? 8 : 4) : 0; },
  enumerable: false, configurable: true,
});
void THREE;
