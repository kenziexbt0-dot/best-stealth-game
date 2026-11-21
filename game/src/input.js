// Night Parcel — keyboard and mouse input, kept in one small place.
//
// The game reads keys by their `code` (KeyW, ArrowUp, ShiftLeft, ...)
// so the layout does not depend on the player's keyboard language.

export function createInput(canvas) {
  const keys = new Set();
  let mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };

  function onKeyDown(event) {
    // Ignore repeats and browser shortcuts; the game handles the rest.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onBlur() {
    keys.clear();
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.clickX = event.clientX - rect.left;
    mouse.clickY = event.clientY - rect.top;
    mouse.clicked = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    // A movement vector from WASD or the arrow keys, normalised.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    get sneaking() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    // One-shot key checks: true once per physical press.
    pressed(code) {
      if (!keys.has(code)) return false;
      keys.delete(code);
      return true;
    },
    has(code) {
      return keys.has(code);
    },
    get mouse() {
      return mouse;
    },
    // Consume a mouse click (a pebble throw) if one happened.
    takeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
  };
}
