// Online transport: Supabase Realtime "broadcast" channels (same project as Goffichick's online play).
// Players in the same room pass small JSON messages through Supabase's websocket server.
const SUPABASE_URL = 'https://rlebmmqfmkpyvnxyhqeb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__YdLXvcL6uns_n2hu54bXw_0KZqA_ly';

// Same-device loopback (two browser tabs) for testing: add ?loopnet to the URL.
function createLoopNet() {
  const id = Math.random().toString(36).slice(2, 8);
  let ch = null, status = 'off';
  return {
    id,
    connect(room, msgCb, statusCb) {
      ch = new BroadcastChannel('wallysquad-' + room.toLowerCase());
      ch.onmessage = e => { const m = e.data; if (m._from !== id) msgCb(m.event, m.payload); };
      status = 'ok'; setTimeout(() => statusCb('ok'), 50);
    },
    send(event, payload) { if (!ch) return false; ch.postMessage({ event, payload, _from: id }); return true; },
    close() { ch?.close(); ch = null; status = 'off'; },
    get status() { return status; }, get reason() { return ''; },
  };
}

export function createNet() {
  if (new URLSearchParams(location.search).has('loopnet') || localStorage.getItem('ws_loopnet')) return createLoopNet();
  const id = Math.random().toString(36).slice(2, 8);
  let ws = null, topic = null, ref = 0, joinRef = null, hb = null, status = 'off', reason = '', onMsg = null, onStatus = null;
  const url = () => SUPABASE_URL.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(SUPABASE_ANON_KEY) + '&vsn=1.0.0';
  const raw = m => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
  const setStatus = s => { if (status !== s) { status = s; onStatus?.(s, reason); } };

  function connect(room, msgCb, statusCb) {
    close();
    onMsg = msgCb; onStatus = statusCb; topic = 'realtime:wallysquad-' + room.toLowerCase();
    setStatus('connecting'); reason = '';
    let opened = false;
    try { ws = new WebSocket(url()); } catch (e) { reason = e.message; setStatus('error'); return; }
    const sock = ws;
    ws.onopen = () => {
      opened = true; joinRef = String(++ref);
      raw({ topic, event: 'phx_join', payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, postgres_changes: [], private: false } }, ref: joinRef, join_ref: joinRef });
      hb = setInterval(() => raw({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }), 25000);
    };
    ws.onmessage = ev => {
      if (sock !== ws) return;
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (!m || m.topic !== topic) return;
      if (m.event === 'phx_reply' && m.ref === joinRef) {
        const ok = m.payload && m.payload.status === 'ok';
        if (!ok) reason = 'The server refused the room.';
        setStatus(ok ? 'ok' : 'error'); return;
      }
      if (m.event === 'phx_error' || m.event === 'phx_close') { reason = 'The server closed the room.'; setStatus('error'); return; }
      if (m.event === 'broadcast' && m.payload && m.payload.payload) {
        const p = m.payload.payload;
        if (p._from !== id) onMsg?.(m.payload.event, p);
      }
    };
    ws.onerror = () => { if (sock === ws) { if (!reason) reason = opened ? 'The connection dropped.' : "Can't reach the game server."; setStatus('error'); } };
    ws.onclose = () => { if (sock === ws && status !== 'off') { if (!reason) reason = 'Connection closed.'; setStatus('closed'); } };
  }
  function send(event, payload) {
    if (status !== 'ok') return false;
    raw({ topic, event: 'broadcast', payload: { type: 'broadcast', event, payload: { ...payload, _from: id } }, ref: String(++ref), join_ref: joinRef });
    return true;
  }
  function close() {
    if (hb) clearInterval(hb); hb = null;
    const s = ws; ws = null;
    if (s) { try { if (s.readyState === 1) s.send(JSON.stringify({ topic, event: 'phx_leave', payload: {}, ref: String(++ref), join_ref: joinRef })); s.close(); } catch { /* ignore */ } }
    status = 'off';
  }
  return { id, connect, send, close, get status() { return status; }, get reason() { return reason; } };
}

export function randomRoomCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = ''; for (let i = 0; i < 5; i++) s += L[Math.floor(Math.random() * L.length)];
  return s;
}
