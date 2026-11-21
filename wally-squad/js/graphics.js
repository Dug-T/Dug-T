// Graphics settings: resolution (including supersampling), shadow quality, bloom, FPS counter and
// automatic quality. Saved in the browser and applied live.
import * as THREE from 'three';
import { appSize } from './orient.js';
import { setDetailPreset } from './detail.js';

export const PRESETS = {
  low:    { label: 'Low',    maxDpr: 1,   scale: 0.85, shadows: 'off',  bloom: false, samples: 0, cinematic: false },
  medium: { label: 'Medium', maxDpr: 1.5, scale: 1,    shadows: 'med',  bloom: true,  samples: 2, cinematic: false },
  high:   { label: 'High',   maxDpr: 2,   scale: 1,    shadows: 'high', bloom: true,  samples: 4, cinematic: true },
  ultra:  { label: 'Ultra',  maxDpr: 3,   scale: 1.25, shadows: 'ultra', bloom: true, samples: 8, cinematic: true },
};
const SHADOW = { off: 0, med: 1024, high: 2048, ultra: 4096 };

const touch = matchMedia('(pointer: coarse)').matches;
export const isTouch = touch;
const defaults = () => ({ preset: touch ? 'medium' : 'high', ...PRESETS[touch ? 'medium' : 'high'], auto: true, fps: true });
export const gfx = (() => {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem('ws_gfx') || '{}') }; } catch { return defaults(); }
})();
const save = () => { try { localStorage.setItem('ws_gfx', JSON.stringify(gfx)); } catch { /* ignore */ } };

let ctx = null;          // { renderer, sun, bloom, composer, resize }
export let autoFactor = 1; // lowered automatically when the frame rate drops
// Extra steps once the resolution is already as low as auto-adjust will take it:
// 1 = bloom off, 2 = also no anti-aliasing and shadows redrawn less often.
export let perfStep = 0;
// how many frames between shadow map redraws (shadows of slow-moving units don't need 60 updates a second)
export function shadowInterval() { return perfStep >= 2 ? 3 : touch || autoFactor < 0.8 ? 2 : 1; }

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
  if (bloom) bloom.enabled = gfx.bloom && perfStep < 1;
  if (composer && composer.renderTarget1) {
    const samples = perfStep >= 2 ? 0 : gfx.samples;
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== samples) { rt.samples = samples; rt.dispose(); }
  }
  ctx.resize?.();
  const f = document.getElementById('fps'); if (f) { f.style.display = gfx.fps ? 'block' : 'none'; if (!f.textContent) f.textContent = '-- FPS'; }
}

function recompileAll() {
  ctx.scene?.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
}

// called once a second by the game loop with the measured frame rate
export function autoTune(fps) {
  const el = document.getElementById('fps');
  if (el && gfx.fps) {
    const f = Math.round(fps);
    el.textContent = `${f} FPS`;
    el.title = `${f} frames per second, rendering at ${ctx.renderer.domElement.width}×${ctx.renderer.domElement.height}`;
    el.className = f >= 50 ? '' : f >= 30 ? 'mid' : 'low';
  }
  if (!gfx.auto) { if (autoFactor !== 1 || perfStep) { autoFactor = 1; perfStep = 0; apply(); } return; }
  // Aim for 45+: first lower the resolution, then drop the costly effects. Recover in reverse order.
  // (Phones are capped at 60 FPS, so "fast enough to go back up" is 57+.)
  if (fps < 40 && autoFactor > 0.6) { autoFactor = Math.max(0.6, autoFactor - 0.12); apply(); }
  else if (fps < 36 && perfStep < 2) { perfStep++; apply(); }
  else if (fps > 57 && perfStep > 0) { perfStep--; apply(); }
  else if (fps > 57 && autoFactor < 1) { autoFactor = Math.min(1, autoFactor + 0.08); apply(); }
}

export function maxAnisotropy() { return ctx ? ctx.renderer.capabilities.getMaxAnisotropy() : 8; }

// ------------------------------------------------------------------ settings panel
export function buildGraphicsPanel(el) {
  const render = () => {
    el.innerHTML = '';
    const presetRow = document.createElement('div'); presetRow.className = 'row';
    for (const [k, p] of Object.entries(PRESETS)) {
      const b = document.createElement('button'); b.className = 'btn' + (gfx.preset === k ? ' on' : ''); b.textContent = p.label;
      b.onclick = () => { Object.assign(gfx, PRESETS[k], { preset: k }); save(); apply(); render(); setDetailPreset(k); import('./models.js').then(m => m.clearModelCache()); };
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
    toggle('Bloom glow', 'bloom'); toggle('🎬 Cinematic filter', 'cinematic'); toggle('Anti-aliasing', 'aa'); toggle('Auto-adjust for smooth play', 'auto'); toggle('Show FPS', 'fps');
    el.append(label('Options'), tg);
    const note = document.createElement('p'); note.style.cssText = 'text-align:center;color:var(--dim);font-size:13px';
    note.textContent = 'Tip: if the game stutters, choose a lower preset or turn on auto-adjust. Higher presets also give units, buildings and trees more polygons (new models use it straight away; the scenery updates next battle). Ultra looks best on a powerful phone or computer.';
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
