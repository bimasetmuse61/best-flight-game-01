// Harbor Run — input: keyboard plus mouse steering.
// Arrow keys / WASD pitch and bank, Shift/Ctrl or W/S throttle,
// mouse steers toward the pointer, wheel trims throttle, Space brakes.

export function newInput() {
  return {
    keys: new Set(),
    mouseX: 0.5, // 0..1 across the canvas
    mouseY: 0.5,
    mouseActive: false,
    mouseSeenAt: 0,
    wheelDelta: 0,
    brake: false,
  };
}

const KEYMAP = {
  ArrowUp: 'pitchUp',
  KeyW: 'pitchUp',
  ArrowDown: 'pitchDown',
  KeyS: 'pitchDown',
  ArrowLeft: 'bankLeft',
  KeyA: 'bankLeft',
  ArrowRight: 'bankRight',
  KeyD: 'bankRight',
  ShiftLeft: 'throttleUp',
  ShiftRight: 'throttleUp',
  ControlLeft: 'throttleDown',
  ControlRight: 'throttleDown',
  Space: 'brake',
  KeyR: 'restart',
  KeyP: 'pause',
  Enter: 'start',
};

export function attachInput(input, canvas, onAction) {
  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (!name) return;
    e.preventDefault();
    if (!e.repeat) {
      input.keys.add(name);
      if (name === 'restart' || name === 'pause' || name === 'start') onAction(name);
    }
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) input.keys.delete(name);
  });
  window.addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - r.left) / r.width;
    input.mouseY = (e.clientY - r.top) / r.height;
    input.mouseActive = true;
    input.mouseSeenAt = performance.now();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    input.wheelDelta += e.deltaY > 0 ? -1 : 1;
  }, { passive: false });
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    input.keys.add('brake');
  });
  window.addEventListener('mouseup', () => input.keys.delete('brake'));
}

// Blend keyboard and mouse into one control vector for this frame.
export function readControls(input, dt) {
  const k = input.keys;
  let pitch = 0;
  let bank = 0;
  let throttle = 0;
  if (k.has('pitchUp')) pitch += 1;
  if (k.has('pitchDown')) pitch -= 1;
  if (k.has('bankLeft')) bank -= 1;
  if (k.has('bankRight')) bank += 1;
  if (k.has('throttleUp')) throttle += 1;
  if (k.has('throttleDown')) throttle -= 1;
  // Mouse: pointer above centre pulls the nose up, pointer right banks right.
  const mouseFresh = input.mouseActive && performance.now() - input.mouseSeenAt < 2500;
  if (mouseFresh && !k.has('pitchUp') && !k.has('pitchDown') && !k.has('bankLeft') && !k.has('bankRight')) {
    pitch += (0.5 - input.mouseY) * 1.6;
    bank += (input.mouseX - 0.5) * 1.6;
  }
  if (input.wheelDelta !== 0) {
    throttle += Math.sign(input.wheelDelta) * 0.5;
    input.wheelDelta = 0;
  }
  return {
    pitch: Math.max(-1, Math.min(1, pitch)),
    bank: Math.max(-1, Math.min(1, bank)),
    throttle: Math.max(-1, Math.min(1, throttle)),
    brake: k.has('brake'),
  };
}
