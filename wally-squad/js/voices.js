// Unit voices: record your own lines (and your friends') for every unit with the microphone.
// Clips are stored in this browser (IndexedDB) and can be exported / imported as a voice pack file.
// Units without a recording fall back to the computer's text-to-speech with a per-unit voice.
import { UNITS } from './config.js';

export const EVENTS = { select: 'Selected', move: 'Move order', attack: 'Attack order' };
const DEFAULT_LINES = {
  wallyman: { select: ['Wally Man is here!', 'Never fear, Wally Man is near!', 'Cape on, glasses on!'], move: ['Up, up and away!', 'To the rescue!'], attack: ['Spin it up!', 'Taste the Gatling!', 'Wally Man, open fire!'] },
  rifle: { select: ['Rifleman reporting.', 'Ready for action!'], move: ['Moving out.', 'On my way.'], attack: ['Opening fire!', 'Engaging!'] },
  rocket: { select: ['Rockets loaded.', 'Anti-armour ready.'], move: ['Relocating.'], attack: ['Rocket away!', 'Tank spotted!'] },
  flamer: { select: ['Got a light?', 'Scorcher here.'], move: ['Moving.'], attack: ['Burn it down!', 'Toasty!'] },
  engineer: { select: ['Engineer.', 'Tools ready.'], move: ['On my way.'], attack: ['I can fix that.', 'Taking it over.'] },
  medic: { select: ['Medic here.', 'Who needs patching up?'], move: ['Coming through.'], attack: ['I am a medic!'] },
  wally: { select: ['Wally here!', 'Where to, boss?', 'Glasses on, ready.'], move: ['Wally on the move!', 'Find me if you can.'], attack: ['Lining up the shot.', 'Time for a surprise!'] },
  buggy: { select: ['Buggy ready.', 'Let us roll.'], move: ['Full throttle!'], attack: ['Light them up!'] },
  tank: { select: ['Tank commander.', 'Armour ready.'], move: ['Rolling out.', 'Moving.'], attack: ['Firing main gun!', 'Target acquired.'] },
  harvester: { select: ['Harvester.', 'Ready to mine.'], move: ['Heading there.'], attack: ['I am just a harvester!'] },
  arty: { select: ['Artillery standing by.'], move: ['Repositioning.'], attack: ['Fire for effect!', 'Shells out!'] },
  titan: { select: ['Titan online.', 'Heavy armour here.'], move: ['Advancing.'], attack: ['Crush them!', 'Twin cannons, fire!'] },
  gunship: { select: ['Hornet in the air.', 'Gunship ready.'], move: ['Flying there.'], attack: ['Rockets hot!', 'Strafing run!'] },
  stealth: { select: ['Shade, cloaked.', 'Unseen.'], move: ['Slipping through.'], attack: ['Decloaking.', 'Surprise.'] },
  inferno: { select: ['Inferno ready.', 'Fuel tanks full.'], move: ['Rolling.'], attack: ['Burn them all!'] },
};
const VOICE_STYLE = {
  wally: { pitch: 1.4, rate: 1.15 }, wallyman: { pitch: 0.9, rate: 1.05 }, medic: { pitch: 1.3, rate: 1.05 }, engineer: { pitch: 1.2, rate: 1.1 },
  titan: { pitch: 0.5, rate: 0.85 }, tank: { pitch: 0.7, rate: 0.95 }, harvester: { pitch: 0.8, rate: 0.9 },
  stealth: { pitch: 0.6, rate: 0.8 }, inferno: { pitch: 0.55, rate: 0.9 }, gunship: { pitch: 1.0, rate: 1.2 },
};

let db = null;
const clips = new Map();        // key -> [Blob]
const urls = new Map();         // Blob -> objectURL
let lastSay = 0;
export const settings = { voices: true, tts: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ws_voice_settings') || '{}')); } catch { /* ignore */ }
export function saveSettings() { try { localStorage.setItem('ws_voice_settings', JSON.stringify(settings)); } catch { /* ignore */ } }

function openDB() {
  return new Promise((res) => {
    try {
      const r = indexedDB.open('wallysquad-voices', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('clips');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
export async function initVoices() {
  db = await openDB();
  if (!db) return;
  await new Promise(res => {
    const tx = db.transaction('clips', 'readonly');
    const st = tx.objectStore('clips');
    const req = st.openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return res();
      clips.set(c.key, c.value); c.continue();
    };
    req.onerror = () => res();
  });
}
function persist(key) {
  if (!db) return;
  const tx = db.transaction('clips', 'readwrite');
  const list = clips.get(key);
  if (list && list.length) tx.objectStore('clips').put(list, key); else tx.objectStore('clips').delete(key);
}
const keyOf = (type, ev) => `${type}:${ev}`;
export const takes = (type, ev) => (clips.get(keyOf(type, ev)) || []).length;
export function addTake(type, ev, blob) { const k = keyOf(type, ev); const l = clips.get(k) || []; l.push(blob); if (l.length > 3) l.shift(); clips.set(k, l); persist(k); }
export function clearTakes(type, ev) { clips.delete(keyOf(type, ev)); persist(keyOf(type, ev)); }

function playBlob(b) {
  if (!urls.has(b)) urls.set(b, URL.createObjectURL(b));
  const a = new Audio(urls.get(b)); a.volume = 0.9; a.play().catch(() => {});
}
export function playTake(type, ev) {
  const l = clips.get(keyOf(type, ev));
  if (l && l.length) { playBlob(l[Math.floor(Math.random() * l.length)]); return true; }
  return false;
}

// Called by the game when the player selects or commands a unit
export function say(type, ev, force = false) {
  if (!settings.voices) return;
  const now = performance.now();
  if (!force && now - lastSay < 1100) return;
  lastSay = now;
  if (playTake(type, ev)) return;
  if (!settings.tts || !('speechSynthesis' in window)) return;
  if (speechSynthesis.speaking && !force) return;
  const lines = DEFAULT_LINES[type]?.[ev] || DEFAULT_LINES[UNITS[type]?.tab === 'vehicle' ? 'tank' : 'rifle'][ev];
  if (!lines) return;
  const u = new SpeechSynthesisUtterance(lines[Math.floor(Math.random() * lines.length)]);
  const st = VOICE_STYLE[type] || { pitch: 1, rate: 1.05 };
  u.pitch = st.pitch; u.rate = st.rate; u.volume = 0.85;
  const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  if (vs.length) u.voice = vs[(type.length * 7) % vs.length];
  speechSynthesis.speak(u);
}

// ---------------- recording ----------------
let rec = null;
export async function startRecording(onStop) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const chunks = [];
  const mr = new MediaRecorder(stream);
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); onStop(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); rec = null; };
  mr.start();
  rec = { mr, timer: setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 4000) };
  return rec;
}
export function stopRecording() { if (rec) { clearTimeout(rec.timer); if (rec.mr.state === 'recording') rec.mr.stop(); } }
export const isRecording = () => !!rec;

// ---------------- voice packs ----------------
const blobToB64 = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
export async function exportPack(name = 'my-voices') {
  const out = { format: 'wallysquad-voices', version: 1, name, clips: {} };
  for (const [k, list] of clips) out.clips[k] = await Promise.all(list.map(blobToB64));
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.wallyvoices.json`; a.click();
}
export async function importPack(file, merge = true) {
  const data = JSON.parse(await file.text());
  if (data.format !== 'wallysquad-voices') throw new Error('Not a Wally Squad voice pack');
  let n = 0;
  for (const k in data.clips) {
    const [type, ev] = k.split(':');
    if (!UNITS[type] || !EVENTS[ev]) continue;
    if (!merge) clips.delete(k);
    for (const d of data.clips[k]) { const b = await (await fetch(d)).blob(); addTake(type, ev, b); n++; }
  }
  return n;
}

// ---------------- studio UI ----------------
export function buildStudio(container, icons) {
  container.innerHTML = '';
  const tbl = document.createElement('div'); tbl.className = 'vgrid';
  tbl.innerHTML = '<div class="vh">Unit</div>' + Object.values(EVENTS).map(e => `<div class="vh">${e}</div>`).join('');
  for (const type in UNITS) {
    const name = document.createElement('div'); name.className = 'vname';
    name.innerHTML = `${icons[type] ? `<img src="${icons[type]}">` : ''}<span>${UNITS[type].name}</span>`;
    tbl.appendChild(name);
    for (const ev in EVENTS) {
      const cell = document.createElement('div'); cell.className = 'vcell';
      const count = document.createElement('span'); count.className = 'vcount';
      const recB = document.createElement('button'); recB.className = 'btn vbtn'; recB.textContent = '● Rec'; recB.title = 'Record (up to 4 seconds). Click again to stop.';
      const playB = document.createElement('button'); playB.className = 'btn vbtn'; playB.textContent = '▶'; playB.title = 'Play';
      const delB = document.createElement('button'); delB.className = 'btn vbtn'; delB.textContent = '✖'; delB.title = 'Delete recordings';
      const refresh = () => { const n = takes(type, ev); count.textContent = n ? `${n} take${n > 1 ? 's' : ''}` : 'TTS'; count.classList.toggle('has', n > 0); };
      recB.onclick = async () => {
        if (isRecording()) { stopRecording(); return; }
        try {
          recB.classList.add('on'); recB.textContent = '■ Stop';
          await startRecording(blob => { addTake(type, ev, blob); recB.classList.remove('on'); recB.textContent = '● Rec'; refresh(); });
        } catch (e) { recB.classList.remove('on'); recB.textContent = '● Rec'; alert('Could not use the microphone: ' + e.message); }
      };
      playB.onclick = () => { if (!playTake(type, ev)) say(type, ev, true); };
      delB.onclick = () => { clearTakes(type, ev); refresh(); };
      refresh();
      cell.append(recB, playB, delB, count);
      tbl.appendChild(cell);
    }
  }
  container.appendChild(tbl);
}
