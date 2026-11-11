'use strict';
// =====================================================================
// Update 1.6: play sideways. In landscape the picture fills the screen
// height and the touch buttons move into the side margins. In portrait a
// tip suggests turning the phone, with a FULL SCREEN button that hides the
// browser bars and locks landscape where the phone allows it.
// =====================================================================
{
  const hint = document.getElementById('turnHint'), fsBtn = document.getElementById('fsBtn'), x = document.getElementById('hintX');
  const root = document.documentElement, req = root.requestFullscreen || root.webkitRequestFullscreen;
  let dismissed = false; try { dismissed = localStorage.getItem('wallyman-turn-hint') === 'off'; } catch (e) { /* ignore */ }
  if (dismissed) document.body.classList.add('nohint');
  if (fsBtn && !req) fsBtn.style.display = 'none'; // iPhones don't let web pages go full screen
  if (fsBtn) fsBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try { await req.call(root); } catch (err) { /* not allowed here */ }
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (err) { /* not allowed here */ }
    setTimeout(resize, 300);
  });
  if (x) x.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.add('nohint'); try { localStorage.setItem('wallyman-turn-hint', 'off'); } catch (err) { /* ignore */ } });
  const fsChange = () => { document.body.classList.toggle('fs', !!(document.fullscreenElement || document.webkitFullscreenElement)); setTimeout(resize, 200); };
  document.addEventListener('fullscreenchange', fsChange); document.addEventListener('webkitfullscreenchange', fsChange);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => setTimeout(resize, 200));
  addEventListener('orientationchange', () => setTimeout(resize, 300));
  if (hint) hint.addEventListener('pointerdown', (e) => e.stopPropagation());
  resize();
}
UPDATES.unshift(['1.6', ['PLAY SIDEWAYS FOR A BIGGER SCREEN', 'TOUCH BUTTONS MOVE TO THE SIDES', 'FULL SCREEN BUTTON (WHERE THE', 'PHONE ALLOWS IT)', 'TOUCH LAYOUT SAVED PER ROTATION']]);
