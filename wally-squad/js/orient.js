// Landscape only. Browsers can't stop a phone rotating the page, so when a touch device is held
// upright the whole game (#app) is drawn turned 90 degrees: it always stays horizontal relative to
// the phone, exactly as if the screen were locked sideways. These helpers convert touch/mouse
// positions into the turned layout.

export const isRot = () => document.body.classList.contains('rot');
const coarse = matchMedia('(pointer: coarse)');

// Position of a pointer/touch inside an element, in the element's own (un-rotated) pixels.
export function elemPos(el, e) {
  const r = el.getBoundingClientRect();
  if (!isRot()) return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  // turned 90 degrees clockwise: element x runs down the screen, element y runs right-to-left
  return { x: e.clientY - r.top, y: r.right - e.clientX, w: r.height, h: r.width };
}
// Position in #app coordinates (for things placed with position: fixed inside the app)
export function appPos(e) {
  return isRot() ? { x: e.clientY, y: window.innerWidth - e.clientX } : { x: e.clientX, y: e.clientY };
}
// Size of the app area as the game sees it
export function appSize() {
  return isRot() ? { w: window.innerHeight, h: window.innerWidth } : { w: window.innerWidth, h: window.innerHeight };
}

let rulesCopied = false;
// The compact layout for phones is written as "@media (max-height: 520px) and (orientation: landscape)".
// When we turn the game ourselves the browser still reports portrait, so copy those rules under body.rot.
function copyLandscapeRules() {
  if (rulesCopied) return;
  rulesCopied = true;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const extra = [];
    for (const r of rules) {
      if (!(r instanceof CSSMediaRule) || !/orientation:\s*landscape/.test(r.conditionText || r.media.mediaText)) continue;
      for (const inner of r.cssRules) {
        if (!(inner instanceof CSSStyleRule)) continue;
        const sel = inner.selectorText.split(',').map(s => {
          s = s.trim();
          if (s.startsWith(':root')) return 'body.rot' + s.slice(5);
          if (s.startsWith('body')) return 'body.rot' + s.slice(4);
          return 'body.rot ' + s;
        }).join(', ');
        extra.push(`${sel} { ${inner.style.cssText} }`);
      }
    }
    for (const t of extra) { try { sheet.insertRule(t, sheet.cssRules.length); } catch { /* skip */ } }
  }
}

// the real visible size, for CSS (--vw / --vh): 100vh/100dvh are wrong in some in-app browsers
let lastW = 0, lastH = 0;
function updateViewportVars() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w === lastW && h === lastH) return;
  lastW = w; lastH = h;
  const s = document.documentElement.style;
  s.setProperty('--vw', w + 'px'); s.setProperty('--vh', h + 'px');
}
updateViewportVars();
window.addEventListener('resize', updateViewportVars);
window.visualViewport?.addEventListener('resize', updateViewportVars);

export function updateOrientation() {
  updateViewportVars();
  const rot = coarse.matches && window.innerHeight > window.innerWidth;
  if (rot) copyLandscapeRules();
  if (rot !== isRot()) document.body.classList.toggle('rot', rot);
  return rot;
}

// ---- finger scrolling for the turned (upright phone) layout
// When #app is turned 90 degrees the browser no longer scrolls menus under a swipe, and in-app browsers
// (Facebook, Instagram...) treat the unused swipe as "close the page". So while turned we scroll the
// nearest scrollable box ourselves, in the game's own up/down direction, with a little momentum, and keep
// the swipe from reaching the surrounding app.
const SCROLLERS = '.screen, .card, #grid, .vgrid, .medalGrid, #objectives, .cardList';
function scrollBoxFor(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (!e.matches || !e.matches(SCROLLERS)) continue;
    const oy = getComputedStyle(e).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight + 1) return e;
  }
  return null;
}
let drag = null, coast = null;
document.addEventListener('touchstart', e => {
  if (coast) { cancelAnimationFrame(coast); coast = null; }
  if (!isRot() || e.touches.length !== 1) { drag = null; return; }
  const box = scrollBoxFor(e.target);
  if (!box) { drag = null; return; }
  const p = appPos(e.touches[0]);
  drag = { box, y: p.y, x: p.x, moved: false, v: 0, t: performance.now() };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!drag) return;
  const p = appPos(e.touches[0]);
  const dy = drag.y - p.y;
  if (!drag.moved && Math.abs(dy) < 6 && Math.abs(p.x - drag.x) < 6) return;
  drag.moved = true;
  e.preventDefault(); // ours, not the page's or the app's
  const now = performance.now(), dt = Math.max(1, now - drag.t);
  drag.box.scrollTop += dy;
  drag.v = drag.v * 0.6 + (dy / dt) * 0.4; // px per ms
  drag.y = p.y; drag.t = now;
}, { passive: false });
document.addEventListener('touchend', () => {
  if (!drag || !drag.moved) { drag = null; return; }
  const box = drag.box; let v = drag.v * 16; drag = null;
  const step = () => { if (Math.abs(v) < 0.4) { coast = null; return; } box.scrollTop += v; v *= 0.93; coast = requestAnimationFrame(step); };
  coast = requestAnimationFrame(step);
}, { passive: true });
