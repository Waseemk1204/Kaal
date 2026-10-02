// Keyboard and mouse. Adapted from Jugaad Escape's input.js: desktop only,
// with Kaal's controls (strike, hold-to-do, place a candle).

export class Input {
  constructor() {
    this.keys = new Set();
    this.mouse = new Set(); // 0 left, 2 right
    this.pressed = new Set(); // keys that went down since the last frame
    this.enabled = true;

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(key)) event.preventDefault();
      if (!event.repeat) this.pressed.add(key);
      this.keys.add(key);
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener("mousedown", (event) => {
      this.mouse.add(event.button);
      this.pressed.add(`mouse${event.button}`);
    });
    window.addEventListener("mouseup", (event) => this.mouse.delete(event.button));
    window.addEventListener("contextmenu", (event) => event.preventDefault());
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.mouse.clear();
    });
  }

  down(...keys) {
    return this.enabled && keys.some((k) => this.keys.has(k));
  }

  // True once per press. Call endFrame() after the frame has read input.
  hit(...keys) {
    return this.enabled && keys.some((k) => this.pressed.has(k));
  }

  endFrame() {
    this.pressed.clear();
  }

  move() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0;
    let y = 0;
    if (this.down("w", "arrowup")) y += 1;
    if (this.down("s", "arrowdown")) y -= 1;
    if (this.down("d", "arrowright")) x += 1;
    if (this.down("a", "arrowleft")) x -= 1;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  get running() {
    return this.down("shift");
  }

  get interacting() {
    return this.down("e");
  }

  get strike() {
    return this.hit("f", "mouse2");
  }
}

// Mouse look with pointer lock (from Jugaad Escape's Look, desktop only).
export class Look {
  constructor({ target, onLook, onLockChange }) {
    this.target = target;
    this.onLook = onLook;
    this.onLockChange = onLockChange || (() => {});
    this.sensitivity = 0.0022;
    this.enabled = false;

    // Some embeds (an iframe on a jam page) refuse pointer lock. Then you
    // look by dragging with a mouse button held down instead.
    this.lockRefused = false;
    this.dragging = false;
    target.addEventListener("mousedown", () => {
      if (!this.enabled) return;
      this.dragging = true;
      if (!this.locked && !this.lockRefused) this.lock();
    });
    window.addEventListener("mouseup", () => (this.dragging = false));
    document.addEventListener("mousemove", (event) => {
      if (!this.enabled) return;
      if (!this.locked && !(this.lockRefused && this.dragging)) return;
      this.onLook(event.movementX * this.sensitivity, event.movementY * this.sensitivity);
    });
    document.addEventListener("pointerlockchange", () => this.onLockChange(this.locked));
    document.addEventListener("pointerlockerror", () => (this.lockRefused = true));
  }

  get locked() {
    return document.pointerLockElement === this.target;
  }

  lock() {
    if (!this.target.requestPointerLock) {
      this.lockRefused = true;
      return;
    }
    Promise.resolve(this.target.requestPointerLock()).catch(() => (this.lockRefused = true));
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    if (this.locked) document.exitPointerLock?.();
  }
}
