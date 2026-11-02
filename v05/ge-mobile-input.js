/* GE Android v0.5 – input bridge; experimental, not a replacement for game logic.
 * Based on the public Android browser adapter idea used by HosisoraLing/pvzge-gpnext.
 * Keep Cocos' real touch events for UI (including the game's ORIGINAL shovel).
 * Add only the desktop-mouse stream some lawn controls require.
 * No overlay button, no fake right click, no seed-card geometry heuristics.
 */
(() => {
  'use strict';
  if (window.__GE_NATIVE_TOUCH_V05__) return;
  window.__GE_NATIVE_TOUCH_V05__ = true;

  let canvas = null;
  let primary = null;
  let secondary = false;
  let held = false;
  let generation = 0;
  let chain = Promise.resolve();
  const raf = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : (fn) => Promise.resolve().then(fn);

  function frame() { return new Promise(resolve => raf(resolve)); }
  function snapshot(touch) {
    return { x: touch.clientX, y: touch.clientY,
      screenX: touch.screenX, screenY: touch.screenY };
  }
  function mouse(type, point, down) {
    if (!canvas || !point) return;
    canvas.dispatchEvent(new MouseEvent(type, {
      view: window, bubbles: true, cancelable: true,
      clientX: point.x, clientY: point.y,
      screenX: point.screenX, screenY: point.screenY,
      button: 0, buttons: down ? 1 : 0
    }));
  }
  function schedule(fn, waitForFrame = false) {
    const token = generation;
    chain = chain.then(async () => {
      if (token !== generation) return;
      if (waitForFrame) await frame();
      if (token === generation) fn();
    }).catch(err => console.warn('[GE Touch] input dispatch error', err));
  }
  function reset() {
    generation++;
    chain = Promise.resolve();
    primary = null;
    secondary = false;
    held = false;
  }
  function pointFrom(event, id) {
    for (const t of Array.from(event.changedTouches || [])) {
      if (t.identifier === id) return snapshot(t);
    }
    return null;
  }
  function touch(event) {
    // Suppress browser gestures, but DO NOT stop Cocos' native touch listeners.
    // stopImmediatePropagation() previously broke UI, including the shovel icon.
    if (event.cancelable) event.preventDefault();
    const type = event.type;
    if (type === 'touchstart') {
      if (event.touches.length !== 1 || primary !== null) {
        // Multitouch is not a right-click. Cocos continues receiving touch events.
        secondary = true;
        return;
      }
      const t = event.changedTouches[0];
      primary = t.identifier;
      secondary = false;
      const p = snapshot(t);
      // The lawn computes the hovered cell during its update loop.
      schedule(() => mouse('mousemove', p, false));
      schedule(() => { mouse('mousedown', p, true); held = true; }, true);
      return;
    }
    if (primary === null) return;
    const p = pointFrom(event, primary);
    if (!p) return;
    if (type === 'touchmove') {
      if (!secondary) schedule(() => mouse('mousemove', p, true));
      return;
    }
    if (type === 'touchend' || type === 'touchcancel') {
      // Even a very fast tap must see: hover -> frame -> press -> move -> frame -> release.
      // Never emulate a right mouse button for the original in-game shovel.
      schedule(() => mouse('mousemove', p, true));
      schedule(() => { mouse('mouseup', p, false); held = false; }, true);
      primary = null;
      secondary = false;
    }
  }
  function install(target) {
    if (!target || canvas === target) return;
    if (canvas) {
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(type =>
        canvas.removeEventListener(type, touch, true));
    }
    reset();
    canvas = target;
    canvas.style.touchAction = 'none';
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(type =>
      canvas.addEventListener(type, touch, { capture: true, passive: false }));
    // Avoid a second mouse click synthesized by Android WebView after a real touch.
    ['mousedown', 'mousemove', 'mouseup'].forEach(type => {
      canvas.addEventListener(type, event => {
        if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      }, true);
    });
    console.info('[GE Touch] v0.5 native touch + ordered mouse bridge installed');
  }
  function lookup() {
    const target = document.getElementById('GameCanvas');
    if (target) install(target);
  }
  lookup();
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(lookup);
    observer.observe(document.documentElement || document, { childList: true, subtree: true });
  }
})();
