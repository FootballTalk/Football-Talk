// Pull down at the top of a mobile page to refresh. Does not intercept scrolling elsewhere.
(() => {
  if (document.getElementById('ft-pull-refresh')) return;
  const threshold = 85;
  let start = null, distance = 0, active = false, refreshing = false;
  const indicator = document.createElement('div');
  indicator.id = 'ft-pull-refresh';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  indicator.hidden = true;
  const css = document.createElement('style');
  css.textContent = '#ft-pull-refresh{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:2147483647;max-width:calc(100vw - 24px);padding:12px 20px;border:2px solid #111;border-radius:999px;background:#f7c600;color:#111;font:800 14px Inter,Arial,sans-serif;box-shadow:0 5px 20px #0004;pointer-events:none;text-align:center}';
  document.head.appendChild(css);
  document.body.appendChild(indicator);
  function reset() { start = null; distance = 0; active = false; if (!refreshing) indicator.hidden = true; }
  function blocked(target) {
    if (!(target instanceof Element)) return true;
    if (target.closest('input,textarea,select,button,a,video,audio,[contenteditable="true"],[role="dialog"],.fta-panel')) return true;
    // A nested scroller owns its gesture, including horizontal tab strips.
    for (let el = target; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      if ((/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) ||
          (/(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1)) return true;
    }
    return false;
  }
  document.addEventListener('touchstart', event => {
    reset();
    if (refreshing || event.touches.length !== 1 || window.scrollY > 0 || blocked(event.target)) return;
    start = {x:event.touches[0].clientX, y:event.touches[0].clientY};
  }, {passive:true});
  document.addEventListener('touchmove', event => {
    if (!start || refreshing) return;
    if (event.touches.length !== 1 || window.scrollY > 0) { reset(); return; }
    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;
    if (dy < 0 || Math.abs(dx) > Math.max(15, dy)) { reset(); return; }
    if (dy < 15) return;
    // Leave native refresh in charge when the browser cannot cancel its gesture.
    if (!event.cancelable) { reset(); return; }
    event.preventDefault();
    distance = dy;
    active = true;
    const text = distance >= threshold ? 'Release to refresh' : '↓ Pull down to refresh';
    if (indicator.textContent !== text) indicator.textContent = text;
    indicator.hidden = false;
  }, {passive:false});
  document.addEventListener('touchend', () => {
    if (active && distance >= threshold && window.scrollY <= 0) {
      refreshing = true;
      indicator.textContent = 'Refreshing…';
      requestAnimationFrame(() => requestAnimationFrame(() => window.location.reload()));
    } else reset();
  }, {passive:true});
  document.addEventListener('touchcancel', reset, {passive:true});
})();
