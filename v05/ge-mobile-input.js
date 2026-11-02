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
  let started = null;
  let selectionAfterPress = null;
  let origin = null;
  let moved = false;
  const raf = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : (fn) => Promise.resolve().then(fn);

  async function frame() { await new Promise(resolve => raf(resolve)); await new Promise(resolve => raf(resolve)); }
  function engine() {
    const system = window.System;
    if (!system || typeof system.get !== 'function') return null;
    const uiModule = system.get('chunks:///_virtual/UI.ts');
    const mouseModule = system.get('chunks:///_virtual/Mouse.ts');
    const ui = uiModule && uiModule.UIInGame && uiModule.UIInGame.component;
    if (!ui || !ui.gameStarted || ui.paused) return null;
    const cell = mouseModule && mouseModule.Mouse && mouseModule.Mouse.mouseInLnC;
    return { ui, cell, index: ui.index, count: cell && typeof cell.getAllPlants === 'function' ? cell.getAllPlants().length : null };
  }
  async function inspectAction(before) {
    await frame();
    const after = engine();
    if (before && after && before.ui === after.ui && before.index === -2 &&
        before.cell && before.cell === after.cell && before.count !== null && after.count < before.count) {
      after.ui.tryChangingIndex(-1);
      console.info('[GE Touch] confirmed plant removal; shovel state exited');
    }
    return after;
  }
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
      if (token === generation) await fn();
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
      origin = p; moved = false;
      // The lawn computes the hovered cell during its update loop.
      schedule(() => mouse('mousemove', p, false));
      schedule(async () => {
        started = engine(); mouse('mousedown', p, true); held = true;
        selectionAfterPress = await inspectAction(started);
      }, true);
      return;
    }
    if (primary === null) return;
    const p = pointFrom(event, primary);
    if (!p) return;
    if (type === 'touchmove') {
      if (!secondary) { moved = moved || Math.hypot(p.x-origin.x,p.y-origin.y)>12; schedule(() => mouse('mousemove', p, true)); }
      return;
    }
    if (type === 'touchend' || type === 'touchcancel') {
      // Even a very fast tap must see: hover -> frame -> press -> move -> frame -> release.
      // Never emulate a right mouse button for the original in-game shovel.
      schedule(() => mouse('mousemove', p, true));
      const wasMoved = moved, cancelled = type === 'touchcancel', wasSecondary = secondary;
      schedule(async () => {
        mouse('mouseup', p, false); held = false;
        const current = engine();
        if (!cancelled && !wasSecondary && wasMoved && started && selectionAfterPress && current &&
            current.ui === started.ui && started.index !== selectionAfterPress.index &&
            selectionAfterPress.index >= 0 && selectionAfterPress.index <= 8 && current.index === selectionAfterPress.index && current.cell) {
          // A real Cocos card selection is armed. Placement is a separate lawn press.
          await frame(); const before = engine();
          mouse('mousedown', p, true); await inspectAction(before);
          mouse('mouseup', p, false);
        }
        started = null; selectionAfterPress = null;
      }, true);
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
