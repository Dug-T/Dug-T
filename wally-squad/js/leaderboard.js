// World leaderboard: Survival scores and Daily Challenge times shared by everyone, stored in a
// Supabase table (see leaderboard.sql). If the table hasn't been created yet the game says so and
// carries on - nothing else depends on it.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './net.js';
import { VERSION } from './version.js';

const TABLE = 'wallysquad_scores';
const headers = () => ({ apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' });
export let boardStatus = 'unknown'; // 'ok' | 'missing' | 'offline'

export function playerName() { try { return localStorage.getItem('ws_name') || ''; } catch { return ''; } }
export function setPlayerName(n) { const c = cleanName(n); try { localStorage.setItem('ws_name', c); } catch { /* ignore */ } return c; }
export function cleanName(n) { return String(n || '').replace(/[^\p{L}\p{N} _.\-!']/gu, '').trim().slice(0, 16) || 'Commander'; }

const missing = (status, body) => status === 404 || /PGRST205|42P01|does not exist|Could not find the table/i.test(body || '');

// boards: 'survival:<map>' (higher score is better) and 'daily:<date>' (fewer seconds is better)
export const lowerIsBetter = board => board.startsWith('daily:');

export async function submitScore(board, score, detail = '') {
  if (!navigator.onLine) { boardStatus = 'offline'; return false; }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({ board: board.slice(0, 40), name: cleanName(playerName()), score: Math.max(0, Math.min(1e8, Math.round(score))), detail: String(detail).slice(0, 40), version: VERSION }) });
    if (r.ok) { boardStatus = 'ok'; return true; }
    boardStatus = missing(r.status, await r.text()) ? 'missing' : 'offline';
  } catch { boardStatus = 'offline'; }
  return false;
}

// the top players on a board (each name once, with their best score)
export async function fetchTop(board, n = 10) {
  try {
    const asc = lowerIsBetter(board);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=name,score,detail,created_at&board=eq.${encodeURIComponent(board)}&order=score.${asc ? 'asc' : 'desc'}&limit=100`, { headers: headers() });
    const txt = await r.text();
    if (!r.ok) { boardStatus = missing(r.status, txt) ? 'missing' : 'offline'; return null; }
    boardStatus = 'ok';
    const seen = new Set(), out = [];
    for (const row of JSON.parse(txt)) { const k = row.name.toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push(row); if (out.length >= n) break; }
    return out;
  } catch { boardStatus = 'offline'; return null; }
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export function boardHTML(board, rows, highlight) {
  if (!rows) return `<div class="lbNote">${boardStatus === 'missing' ? '🌍 The world leaderboard isn\'t switched on yet - the game\'s owner needs to create the scores table (see leaderboard.sql).' : '🌍 Couldn\'t reach the world leaderboard (are you offline?).'}</div>`;
  if (!rows.length) return '<div class="lbNote">No scores yet - be the first!</div>';
  const me = (highlight || '').toLowerCase();
  return `<table class="lb">${rows.map((r, i) => `<tr class="${r.name.toLowerCase() === me ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(r.name)}</td><td>${lowerIsBetter(board) ? fmtTime(r.score) : r.score.toLocaleString()}</td><td class="sub">${esc(r.detail || '')}</td></tr>`).join('')}</table>`;
}

// Name box + submit + table, used on the end screen
export function endBoard(el, board, score, detail, title) {
  el.innerHTML = `<div class="label">🌍 World leaderboard · ${esc(title)}</div><div class="row" style="gap:6px;align-items:center"><input id="lbName" maxlength="16" placeholder="Your name" value="${esc(playerName())}" style="max-width:150px"><button class="btn" id="lbSend">Post my score</button></div><div id="lbTable"><div class="lbNote">Loading…</div></div>`;
  const show = async () => { el.querySelector('#lbTable').innerHTML = boardHTML(board, await fetchTop(board), playerName()); };
  el.querySelector('#lbSend').onclick = async e => {
    const b = e.currentTarget; const name = setPlayerName(el.querySelector('#lbName').value);
    el.querySelector('#lbName').value = name; b.disabled = true; b.textContent = 'Posting…';
    const ok = await submitScore(board, score, detail);
    b.textContent = ok ? '✔ Posted' : boardStatus === 'missing' ? 'Not set up yet' : 'Failed - try again'; if (!ok && boardStatus !== 'missing') b.disabled = false;
    show();
  };
  show();
}
