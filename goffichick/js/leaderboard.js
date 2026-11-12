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

  // ---- the weekly challenge speed-run board (table "times")
  const tbase = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/times';
  const weekly = { week: null, list: null, status: enabled ? 'idle' : 'off', at: 0 };
  // Fastest 10 runs of one week. Refreshes at most every 15 seconds.
  async function refreshWeekly(week, force = false) {
    if (!enabled) return null;
    if (weekly.week !== week) { weekly.week = week; weekly.list = null; weekly.at = 0; }
    if (!force && Date.now() - weekly.at < 15000 && weekly.list) return weekly.list;
    weekly.at = Date.now(); if (!weekly.list) weekly.status = 'loading';
    try {
      const r = await withTimeout(fetch(`${tbase}?select=name,time_ms,created_at&week=eq.${week | 0}&order=time_ms.asc&limit=10`, { headers }));
      if (r.status === 404) { weekly.status = 'missing'; return null; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      weekly.list = (await r.json()).map(e => ({ name: e.name, ms: e.time_ms, date: (e.created_at || '').slice(0, 10) }));
      weekly.status = 'ok';
    } catch (e) { if (weekly.status !== 'missing') weekly.status = weekly.list ? 'ok' : 'error'; }
    return weekly.list;
  }
  async function submitTime(entry) {
    if (!enabled) return false;
    try {
      const r = await withTimeout(fetch(tbase, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ week: entry.week | 0, name: entry.name, time_ms: Math.round(entry.ms) }) }));
      if (r.status === 404) { weekly.status = 'missing'; return false; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await refreshWeekly(entry.week, true);
      return true;
    } catch (e) { return false; }
  }

  return { enabled, refresh, submit, refreshWeekly, submitTime, weekly, get list() { return list; }, get status() { return status; } };
})();
