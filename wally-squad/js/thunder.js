// Physically modelled thunder. A lightning bolt is a jagged channel a couple of kilometres long, and
// every metre of it gives off a sharp pressure shock (an "N-wave") at the same instant. The sound of
// the closest part reaches you first as a CRACK; the rest of the channel arrives over the next few
// seconds, each bit later, quieter and duller (the air soaks up high frequencies over distance) -
// which is the rolling rumble. Branches and the ground echo add the grumbles in between.
// Pure maths, no browser APIs: returns a Float32Array of samples.
export function thunderSamples(sr, dist, rnd = Math.random) {
  const H = 1500 + rnd() * 1500;                    // cloud height (m)
  const segs = [];                                  // [x, y, z, dx, dy, dz, strength]
  const walk = (x, y, z, steps, up, strength, spread) => {
    for (let i = 0; i < steps; i++) {
      const dx = (rnd() - 0.5) * spread, dz = (rnd() - 0.5) * spread, dy = up * (3 + rnd() * 6);
      segs.push([x + dx / 2, y + dy / 2, z + dz / 2, dx, dy, dz, strength]);
      x += dx; y += dy; z += dz;
      if (y > H || y < 0) break;
    }
  };
  walk(0, 0, 0, 2000, 1, 1, 9);                     // the main channel, ground up to the cloud
  for (let b = 0; b < 6; b++) {                     // branches forking off higher up
    const s = segs[Math.floor((0.25 + rnd() * 0.7) * Math.min(segs.length, 400))];
    if (s) walk(s[0], s[1], s[2], 60 + rnd() * 120, -0.6, 0.45, 14);
  }
  const L = [dist, 1.6, 0];                         // the listener
  let rmin = 1e9, rmax = 0;
  for (const s of segs) { s.r = Math.hypot(s[0] - L[0], s[1] - L[1], s[2] - L[2]); rmin = Math.min(rmin, s.r); rmax = Math.max(rmax, s.r); }
  const dur = Math.min(10, (rmax - rmin) / 343 + 1.8);
  const n = Math.ceil(dur * sr), out = new Float32Array(n);
  for (const s of segs) {
    const r = s.r, t = (r - rmin) / 343;
    // a shock is loudest broadside to the channel, and fades with distance
    const lx = (L[0] - s[0]) / r, ly = (L[1] - s[1]) / r, lz = (L[2] - s[2]) / r;
    const sl = Math.hypot(s[3], s[4], s[5]) || 1;
    const cos = Math.abs((lx * s[3] + ly * s[4] + lz * s[5]) / sl);
    const amp = s[6] * (0.25 + 0.75 * Math.sqrt(1 - cos * cos)) / Math.pow(1 + r / 90, 1.0);
    const T = 0.0005 + r * 0.0000026 + rnd() * 0.0005; // farther = longer shock = deeper sound
    const len = Math.max(4, Math.floor(T * sr));
    for (const [delay, k] of [[0, 1], [0.004 + rnd() * 0.012, 0.55]]) { // the direct shock and its echo off the ground
      const i0 = Math.floor((t + delay) * sr + rnd() * 2);
      for (let j = 0; j < len && i0 + j < n; j++) out[i0 + j] += amp * k * (1 - 2 * j / len);
    }
  }
  // the air muffles sound that has come further: a low-pass that gets darker as the roll goes on,
  // plus a separate deep layer for the chest-thumping boom
  const near = 1 / (1 + dist / 300);
  let lp = 0, lo = 0, deep = 0, deep2 = 0, peak = 1e-6;
  const k = f => 1 - Math.exp(-2 * Math.PI * f / sr);
  const aLo = k(500), aDeep = k(170);
  for (let i = 0; i < n; i++) {
    const t = i / sr, x = out[i];
    const a = k(260 + (1800 + 6500 * near) * Math.exp(-t * (1.3 - near * 0.6)));
    lp += a * (x - lp);                              // the body, darkening as it rolls away
    lo += aLo * (x - lo);
    const hp = x - lo;                               // the bright, tearing part of the crack
    deep += aDeep * (x - deep); deep2 += aDeep * (deep - deep2); // the boom (kept above 100 Hz or so, so phone speakers can play it)
    const crack = near * Math.exp(-t / 0.07);
    const roll = 0.3 + 0.7 * Math.exp(-t / (1.6 + 1.8 * (1 - near)));
    const v = (hp * crack * 3.0 + lp * 0.9 + deep2 * 1.3) * roll;
    out[i] = v; peak = Math.max(peak, Math.abs(v));
  }
  // fade out the tail and normalise
  const fade = Math.floor(sr * 1.2);
  // and squash the peaks a little (as the air - and your ears - do): the boom and rumble come up under the crack
  const drive = 1.5 + 3 * near, norm = Math.tanh(drive);
  for (let i = 0; i < n; i++) { let g = 1 / peak; if (i > n - fade) g *= (n - i) / fade; out[i] = 0.95 * Math.tanh(out[i] * g * drive) / norm; }
  return out;
}
