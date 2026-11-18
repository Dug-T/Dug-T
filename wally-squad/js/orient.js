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

export function updateOrientation() {
  const rot = coarse.matches && window.innerHeight > window.innerWidth;
  if (rot) copyLandscapeRules();
  if (rot !== isRot()) document.body.classList.toggle('rot', rot);
  return rot;
}
