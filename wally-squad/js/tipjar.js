// Ko-fi tip jar, like Goffichick's and Wallyman World's.
// On the title screen a pulsing TIP JAR button wanders around the top of the screen and cheekily dodges the
// mouse (or a tapping finger), cracking jokes. After your 3rd click it runs out of puff, sweats, says
// "Okay, okay... tip me!" and stays put - and the 4th click always opens Ko-fi. In the pause menu it sits still.

// Your Ko-fi page name (the part after ko-fi.com/). Leave it empty to hide the tip jar.
export const WALLY_KOFI = 'dugt574832';

const kofiName = () => String(WALLY_KOFI || '').trim().replace(/^https?:\/\/(www\.)?ko-fi\.com\//i, '').replace(/[^A-Za-z0-9_-]/g, '');
const SAYS = ['Nope!', 'Not today!', 'Too slow!', 'Catch me first!', 'Hehe!', 'Nice try!', 'Missed me!', 'Wheee!', 'Wally Squad, retreat!', 'Incoming... not!'];

export function initTipJar() {
  if (!kofiName()) return;
  const title = document.getElementById('title');
  if (title) wanderingJar(title);
  const pauseCard = document.querySelector('#pause .card');
  if (pauseCard) {
    const row = document.createElement('div'); row.className = 'row';
    const b = jarButton(); b.classList.add('still');
    b.onclick = e => { e.preventDefault(); openTipJar(); };
    row.appendChild(b); pauseCard.appendChild(row);
  }
}

function jarButton() {
  const b = document.createElement('button');
  b.className = 'tipjar';
  b.type = 'button';
  b.title = 'Enjoying Wally Squad? Buy me a coffee on Ko-fi';
  b.innerHTML = '<span class="tjCup">☕<i>♥</i></span><span class="tjTxt">TIP JAR</span><span class="tjShine"></span>';
  return b;
}

function wanderingJar(host) {
  const b = jarButton();
  const bubble = document.createElement('div'); bubble.className = 'tjSay';
  host.appendChild(b); host.appendChild(bubble);
  const j = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, retarget: 0, clicks: 0, tired: false, cool: 0, sayT: 0 };
  // keep to a band across the top of the title screen
  const area = () => { const w = host.clientWidth || innerWidth; return { x0: 12, x1: Math.max(140, w - 140), y0: 10, y1: 64 }; };
  const pick = (ax, ay) => {
    const a = area(); let best = null, bd = -1;
    for (let k = 0; k < 10; k++) { const x = a.x0 + Math.random() * (a.x1 - a.x0), y = a.y0 + Math.random() * (a.y1 - a.y0), d = ax === undefined ? Math.random() : Math.hypot(x - ax, y - ay); if (d > bd) { bd = d; best = [x, y]; } }
    j.tx = best[0]; j.ty = best[1];
  };
  const say = (t, s = 1.2) => { bubble.textContent = t; j.sayT = s; };
  const centre = () => ({ x: j.x + b.offsetWidth / 2, y: j.y + b.offsetHeight / 2 });
  const dodge = (fx, fy) => {
    if (j.tired) return false;
    if (j.cool > 0) return true;
    j.cool = 0.45; pick(fx, fy);
    const c = centre(), dx = c.x - fx, dy = c.y - fy, l = Math.hypot(dx, dy) || 1;
    j.vx += dx / l * 520; j.vy += dy / l * 320;
    say(SAYS[Math.floor(Math.random() * SAYS.length)]);
    return true;
  };
  const local = e => { const r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  // the mouse getting close makes it run (touch screens have no hover, so taps do the work there)
  host.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || j.tired) return; const p = local(e), c = centre(); if (Math.hypot(p.x - c.x, p.y - c.y) < 80) dodge(p.x, p.y); });
  b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (j.tired) { say('Thank you!', 2); openTipJar(); j.tired = false; j.clicks = 0; b.classList.remove('tired'); return; }
    j.clicks++;
    if (j.clicks >= 3) { j.tired = true; b.classList.add('tired'); say('Okay, okay... tip me!', 99); return; }
    const p = local(e); dodge(p.x, p.y);
  });
  for (const ev of ['pointerdown', 'touchstart', 'mousedown']) b.addEventListener(ev, e => e.stopPropagation());
  let last = performance.now(), init = false;
  const tick = now => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (host.style.display === 'none' || !host.offsetParent && getComputedStyle(host).display === 'none') return;
    const a = area();
    if (!init) { init = true; j.x = (a.x0 + a.x1) / 2; j.y = a.y0; pick(); }
    if (j.cool > 0) j.cool -= dt;
    if (j.sayT > 0) { j.sayT -= dt; }
    if (j.tired) { j.tx = j.x; j.ty = j.y; }
    else { j.retarget -= dt; if (j.retarget <= 0) { j.retarget = 1.8 + Math.random() * 2; pick(); } }
    j.vx += (j.tx - j.x) * 9 * dt; j.vy += (j.ty - j.y) * 9 * dt;
    const damp = Math.max(0, 1 - 4.5 * dt); j.vx *= damp; j.vy *= damp;
    j.x = Math.max(a.x0, Math.min(a.x1, j.x + j.vx * dt)); j.y = Math.max(a.y0, Math.min(a.y1, j.y + j.vy * dt));
    b.style.transform = `translate(${j.x.toFixed(1)}px, ${j.y.toFixed(1)}px)`;
    bubble.style.opacity = j.sayT > 0 ? String(Math.min(1, j.sayT * 3)) : '0';
    bubble.style.transform = `translate(${(j.x + b.offsetWidth / 2).toFixed(1)}px, ${(j.y + b.offsetHeight + 8).toFixed(1)}px) translateX(-50%)`;
  };
  requestAnimationFrame(tick);
}

// Clicks are real user gestures, so the browser lets us open a new tab straight away. Inside some apps'
// built-in browsers pop-ups are blocked: then show a link to tap instead.
export function openTipJar() {
  const url = 'https://ko-fi.com/' + kofiName();
  let w = null;
  try { w = window.open(url, '_blank'); } catch { /* blocked */ }
  if (w) { try { w.opener = null; } catch { /* ignore */ } return; }
  showTipLink(url);
}
function showTipLink(url) {
  let box = document.getElementById('tipBox');
  if (!box) {
    box = document.createElement('div'); box.id = 'tipBox';
    box.innerHTML = '<div style="margin-bottom:10px">Thank you! Tap below to open the tip jar:</div>' +
      '<a id="tipLink" target="_blank" rel="noopener noreferrer"></a><div id="tipUrl"></div>' +
      '<button class="btn" id="tipCopy">Copy link</button> <button class="btn" id="tipClose">Close</button>';
    (document.getElementById('app') || document.body).appendChild(box);
    for (const ev of ['pointerdown', 'mousedown', 'touchstart']) box.addEventListener(ev, e => e.stopPropagation());
    box.querySelector('#tipClose').onclick = () => { box.style.display = 'none'; };
    box.querySelector('#tipCopy').onclick = e => { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { e.target.textContent = 'Copied!'; }, () => { e.target.textContent = 'Copy failed'; }); };
  }
  const a = box.querySelector('#tipLink'); a.href = url; a.textContent = '☕ ko-fi.com/' + kofiName();
  box.querySelector('#tipUrl').textContent = url; box.querySelector('#tipCopy').textContent = 'Copy link';
  box.style.display = 'block';
}
