// GOFFICHICK - online play over Supabase Realtime "broadcast" channels.
//
// Uses the same project as the leaderboard (SUPABASE_URL / SUPABASE_ANON_KEY in leaderboard.js).
// Broadcast needs no database tables: players in the same room just pass small messages to each
// other through Supabase's Realtime server (Phoenix websocket protocol).
'use strict';

const Net = (() => {
  const enabled = !!(typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY);
  const id = Math.random().toString(36).slice(2, 8);
  let ws = null, topic = null, ref = 0, joinRef = null, hb = null, status = 'off', reason = '', opened = false, onMsg = null, onStatus = null, sent = 0, sentAt = 0;

  const url = () => SUPABASE_URL.replace(/^http/, 'ws').replace(/\/+$/, '') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(SUPABASE_ANON_KEY) + '&vsn=1.0.0';
  const raw = m => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
  function setStatus(s) { if (status === s) return; status = s; if (onStatus) onStatus(s); }

  // join room `room` (letters only). msgCb(event, payload) gets every message from other players.
  function connect(room, msgCb, statusCb) {
    close();
    onMsg = msgCb; onStatus = statusCb; topic = 'realtime:goffichick-' + room.toLowerCase();
    if (!enabled) { setStatus('error'); return; }
    setStatus('connecting'); reason = ''; opened = false;
    try { ws = new WebSocket(url()); } catch (e) { setStatus('error'); return; }
    const sock = ws;
    ws.onopen = () => {
      opened = true;
      joinRef = String(++ref);
      raw({ topic, event: 'phx_join', payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, postgres_changes: [], private: false } }, ref: joinRef, join_ref: joinRef });
      hb = setInterval(() => raw({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }), 25000);
    };
    ws.onmessage = ev => {
      if (sock !== ws) return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || m.topic !== topic) return;
      if (m.event === 'phx_reply' && m.ref === joinRef) {
        const ok = m.payload && m.payload.status === 'ok';
        if (!ok) { const r = m.payload && m.payload.response; reason = 'The server refused the room: ' + String((r && (r.reason || r.message)) || JSON.stringify(r || {})).slice(0, 80); }
        setStatus(ok ? 'ok' : 'error'); return;
      }
      if (m.event === 'phx_error' || m.event === 'phx_close') { reason = 'The server closed the room.'; setStatus('error'); return; }
      if (m.event === 'system' && m.payload && m.payload.status === 'error') { reason = 'Server: ' + String(m.payload.message || '').slice(0, 80); setStatus('error'); return; }
      if (m.event === 'broadcast' && m.payload && m.payload.payload) {
        const p = m.payload.payload;
        if (p._from !== id && onMsg) onMsg(m.payload.event, p);
      }
    };
    ws.onerror = () => { if (sock === ws) { if (!reason) reason = opened ? 'The connection dropped.' : "Can't reach the Supabase server - is the project paused, or the URL wrong?"; setStatus('error'); } };
    ws.onclose = ev => { if (sock === ws && status !== 'off') { if (!reason) reason = opened ? `Connection closed (code ${ev.code}${ev.reason ? ': ' + ev.reason : ''}).` : "Can't reach the Supabase server - is the project paused, or the URL wrong?"; setStatus(status === 'ok' ? 'closed' : 'error'); } };
  }
  // send a message to everyone else in the room. Kept to ~12 a second so a free project's limits hold.
  function send(event, payload) {
    if (status !== 'ok') return false;
    const now = Date.now(); if (now - sentAt > 1000) { sentAt = now; sent = 0; }
    if (++sent > 12 && event === 'st') return false; // drop position updates first when busy
    raw({ topic, event: 'broadcast', payload: { type: 'broadcast', event, payload: { ...payload, _from: id } }, ref: String(++ref), join_ref: joinRef });
    return true;
  }
  function close() {
    if (hb) clearInterval(hb); hb = null;
    const s = ws; ws = null;
    if (s) { try { if (s.readyState === 1) s.send(JSON.stringify({ topic, event: 'phx_leave', payload: {}, ref: String(++ref), join_ref: joinRef })); s.close(); } catch (e) {} }
    status = 'off';
  }
  return { enabled, id, connect, send, close, get status() { return status; }, get reason() { return reason; } };
})();
