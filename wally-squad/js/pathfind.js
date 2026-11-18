// Grid A* pathfinding with a binary heap, plus helpers for finding free cells.
import { GRID } from './config.js';
import { T, idx, inGrid, cellCenter, cellOf, isWalkable } from './terrain.js';

const N = GRID * GRID;
const gScore = new Float32Array(N);
const fScore = new Float32Array(N);
const came = new Int32Array(N);
const stamp = new Int32Array(N);
const closed = new Int32Array(N);
let gen = 1;

class Heap {
  constructor() { this.a = []; }
  push(i) { const a = this.a; a.push(i); let k = a.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (fScore[a[p]] <= fScore[a[k]]) break; [a[p], a[k]] = [a[k], a[p]]; k = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < a.length && fScore[a[l]] < fScore[a[m]]) m = l; if (r < a.length && fScore[a[r]] < fScore[a[m]]) m = r; if (m === k) break; [a[m], a[k]] = [a[k], a[m]]; k = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];

// Returns array of world-space waypoints [{x,z}], or null.
// ignoreId: building id treated as walkable (e.g. the one we are docking into)
export function findPath(sx, sz, tx, tz, opts = {}) {
  const maxIter = opts.maxIter || 9000;
  let s = { x: cellOf(sx), z: cellOf(sz) };
  let t = { x: cellOf(tx), z: cellOf(tz) };
  const walk = (cx, cz) => {
    if (!inGrid(cx, cz)) return false;
    const i = idx(cx, cz);
    if (T.blocked[i] && !(opts.hover && T.water[i] && !T.tree[i])) return false;
    if (T.bld[i] && T.bld[i] !== opts.ignoreId && !(opts.gate && T.gate[i] === opts.gate)) return false;
    return true;
  };
  if (!walk(s.x, s.z)) { const f = nearestFree(s.x, s.z, 4, walk); if (f) s = f; }
  if (!walk(t.x, t.z)) { const f = nearestFree(t.x, t.z, 10, walk); if (!f) return null; t = f; }
  gen++;
  const start = idx(s.x, s.z), goal = idx(t.x, t.z);
  const h = (cx, cz) => { const dx = Math.abs(cx - t.x), dz = Math.abs(cz - t.z); return (dx + dz) + (1.4142 - 2) * Math.min(dx, dz); };
  const heap = new Heap();
  stamp[start] = gen; gScore[start] = 0; fScore[start] = h(s.x, s.z); came[start] = -1;
  heap.push(start);
  let best = start, bestH = fScore[start], iter = 0;
  while (heap.size) {
    const cur = heap.pop();
    if (closed[cur] === gen) continue;
    closed[cur] = gen;
    if (cur === goal) { best = cur; break; }
    const cx = cur % GRID, cz = (cur / GRID) | 0;
    const hh = h(cx, cz);
    if (hh < bestH) { bestH = hh; best = cur; }
    if (++iter > maxIter) break;
    for (const [dx, dz, c] of DIRS) {
      const nx = cx + dx, nz = cz + dz;
      if (!walk(nx, nz)) continue;
      if (dx && dz && (!walk(cx + dx, cz) || !walk(cx, cz + dz))) continue; // no corner cutting
      const ni = nz * GRID + nx;
      if (closed[ni] === gen) continue;
      const g = gScore[cur] + c;
      if (stamp[ni] !== gen || g < gScore[ni]) {
        stamp[ni] = gen; gScore[ni] = g; fScore[ni] = g + h(nx, nz) * 1.05; came[ni] = cur;
        heap.push(ni);
      }
    }
  }
  // reconstruct
  const cells = [];
  for (let c = best; c !== -1; c = came[c]) { cells.push(c); if (c === start) break; }
  cells.reverse();
  const pts = smoothPath(cells, walk);
  if (best === goal) pts[pts.length - 1] = { x: tx, z: tz, exact: true };
  return pts;
}

// line-of-sight smoothing (string pulling) on the grid
function smoothPath(cells, walk) {
  const pts = cells.map(c => ({ x: cellCenter(c % GRID), z: cellCenter((c / GRID) | 0), c }));
  if (pts.length <= 2) return pts.slice(1).length ? pts.slice(1) : pts;
  const out = [];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !lineClear(pts[a].c, pts[b].c, walk)) b--;
    out.push(pts[b]); a = b;
  }
  return out;
}
function lineClear(a, b, walk) {
  let x0 = a % GRID, z0 = (a / GRID) | 0; const x1 = b % GRID, z1 = (b / GRID) | 0;
  const dx = Math.abs(x1 - x0), dz = Math.abs(z1 - z0), sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
  let err = dx - dz;
  for (;;) {
    if (!walk(x0, z0)) return false;
    if (x0 === x1 && z0 === z1) return true;
    const e2 = 2 * err;
    if (e2 > -dz && e2 < dx) { // diagonal step: check both sides to keep clearance
      if (!walk(x0 + sx, z0) || !walk(x0, z0 + sz)) return false;
    }
    if (e2 > -dz) { err -= dz; x0 += sx; }
    if (e2 < dx) { err += dx; z0 += sz; }
  }
}

export function nearestFree(cx, cz, maxR = 8, walk = isWalkable, taken) {
  for (let r = 0; r <= maxR; r++) {
    let best = null, bd = 1e9;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
      const x = cx + i, z = cz + j;
      if (!walk(x, z)) continue;
      if (taken && taken.has(idx(x, z))) continue;
      const d = i * i + j * j;
      if (d < bd) { bd = d; best = { x, z }; }
    }
    if (best) return best;
  }
  return null;
}

// Formation slots for group moves: spread units over free cells around the target
export function formationSlots(tx, tz, n, spacing = 1) {
  const taken = new Set();
  const out = [];
  const cx = cellOf(tx), cz = cellOf(tz);
  for (let k = 0; k < n; k++) {
    const f = nearestFree(cx, cz, 12, isWalkable, taken);
    if (!f) { out.push({ x: tx, z: tz }); continue; }
    taken.add(idx(f.x, f.z));
    if (spacing > 1) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) taken.add(idx(f.x + a, f.z + b));
    out.push({ x: cellCenter(f.x), z: cellCenter(f.z) });
  }
  return out;
}
