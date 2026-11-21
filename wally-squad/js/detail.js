// Model detail: the graphics preset decides how many polygons round parts get. Higher presets give
// smoother wheels, barrels, domes and trees. Only visuals change; the simulation is identical on
// every setting, so online players with different presets stay in sync.
import * as THREE0 from 'three';

const LEVEL = { low: 0.75, medium: 1.25, high: 1.75, ultra: 2.5 };
function readPreset() {
  try { const g = JSON.parse(localStorage.getItem('ws_gfx') || '{}'); if (g.preset) return g.preset; } catch { /* ignore */ }
  return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}
let level = LEVEL[readPreset()] ?? 1.25;
export function detailLevel() { return level; }
// called when the player picks a preset ('custom' keeps the current level)
export function setDetailPreset(p) { if (LEVEL[p]) level = LEVEL[p]; }
// counts below 8 are deliberate shapes (pyramids, hexagons, crystals), so only round parts get more sides
const seg = (n, min = 8) => (n >= min ? Math.max(3, Math.round(n * level)) : n);
const segH = n => (n >= 6 ? Math.max(3, Math.round(n * level)) : n);

class CylinderGeometry extends THREE0.CylinderGeometry {
  constructor(rt = 1, rb = 1, h = 1, rs = 32, hs = 1, open = false, ts = 0, tl = Math.PI * 2) { super(rt, rb, h, seg(rs), hs, open, ts, tl); }
}
class ConeGeometry extends THREE0.ConeGeometry {
  constructor(r = 1, h = 1, rs = 32, hs = 1, open = false, ts = 0, tl = Math.PI * 2) { super(r, h, seg(rs), hs, open, ts, tl); }
}
class SphereGeometry extends THREE0.SphereGeometry {
  constructor(r = 1, ws = 32, hs = 16, ...rest) { super(r, seg(ws), segH(hs), ...rest); }
}
class TorusGeometry extends THREE0.TorusGeometry {
  constructor(r = 1, t = 0.4, rs = 12, ts = 48, arc = Math.PI * 2) { super(r, t, seg(rs, 6), seg(ts), arc); }
}
class CircleGeometry extends THREE0.CircleGeometry {
  constructor(r = 1, s = 32, ...rest) { super(r, seg(s), ...rest); }
}
class CapsuleGeometry extends THREE0.CapsuleGeometry {
  constructor(r = 1, l = 1, cs = 4, rs = 8) { super(r, l, Math.max(cs, Math.round(cs * level)), seg(rs)); }
}
class LatheGeometry extends THREE0.LatheGeometry {
  constructor(pts, s = 12, ...rest) { super(pts, seg(s), ...rest); }
}

// A drop-in for `import * as THREE` that builds round shapes with more (or fewer) sides
export const DTHREE = { ...THREE0, CylinderGeometry, ConeGeometry, SphereGeometry, TorusGeometry, CircleGeometry, CapsuleGeometry, LatheGeometry };
