// GOFFICHICK - the shared online leaderboard (Supabase).
//
// Fill in the two values from your Supabase project (Project Settings > API):
//   SUPABASE_URL      e.g. 'https://abcdefghijkl.supabase.co'
//   SUPABASE_ANON_KEY the "publishable" key (sb_publishable_...) or the older "anon public" key.
//                     Both are safe to put in a web page - the database's security rules decide
//                     what it may do: read scores and add new ones only.
// While either is empty the game simply keeps high scores on each device, as before.
'use strict';

const SUPABASE_URL = 'https://rlebmmqfmkpyvnxyhqeb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__YdLXvcL6uns_n2hu54bXw_0KZqA_ly';

const Leaderboard = (() => {
  const enabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  const base = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/scores';
  // New-style keys (sb_publishable_...) go only in the apikey header; older anon keys are JWTs
  // and are also sent as a Bearer token.
  const headers = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (!SUPABASE_ANON_KEY.startsWith('sb_')) headers.Authorization = 'Bearer ' + SUPABASE_ANON_KEY;
  let list = null, status = enabled ? 'idle' : 'off', lastFetch = 0;

  const withTimeout = (p, ms = 8000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  // Top 10 scores for everyone. Refreshes at most every 15 seconds.
  async function refresh(force = false) {
    if (!enabled) return null;
    if (!force && Date.now() - lastFetch < 15000 && list) return list;
    lastFetch = Date.now(); if (!list) status = 'loading';
    try {
      const r = await withTimeout(fetch(`${base}?select=name,score,difficulty,created_at&order=score.desc&limit=10`, { headers }));
      if (r.status === 404) { status = 'missing'; return null; } // the scores table hasn't been created yet
      if (!r.ok) throw new Error('HTTP ' + r.status);
      list = (await r.json()).map(e => ({ name: e.name, score: e.score, diff: e.difficulty, date: (e.created_at || '').slice(0, 10) }));
      status = 'ok';
    } catch (e) { if (status !== 'missing') status = list ? 'ok' : 'error'; }
    return list;
  }

  // Post a finished game's score. Resolves true when it was saved.
  async function submit(entry) {
    if (!enabled) return false;
    try {
      const r = await withTimeout(fetch(base, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ name: entry.name, score: Math.round(entry.score), difficulty: entry.diff }) }));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await refresh(true);
      return true;
    } catch (e) { return false; }
  }

  return { enabled, refresh, submit, get list() { return list; }, get status() { return status; } };
})();
