/**
 * Keyboard / mouse / touch input with edge detection.
 * Games read `pressed()` for one-frame events and `down()` for held state.
 */

import { W as VIEW_W, H as VIEW_H } from './view.js';

const KEY_ALIASES = {
  Space: ' ',
  Escape: 'Esc',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();       // currently held (normalised names)
    this.justPressed = new Set(); // pressed during this frame
    this.justReleased = new Set();
    this.mouse = { x: 0, y: 0, down: false, justDown: false, justUp: false, clicked: false };
    this.anyKeyPressed = false;
    this._bind();
  }

  /** Convert a browser event key into a normalised name. */
  _norm(e) {
    const k = KEY_ALIASES[e.key] || e.key;
    if (k && k.length === 1) return k.toLowerCase();
    return k;
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      // Don't swallow devtools / reload shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = this._norm(e);
      if (k === ' ' || k === 'Up' || k === 'Down' || k === 'Left' || k === 'Right' || k === 'Tab') {
        e.preventDefault();
      }
      if (!this.keys.has(k)) {
        this.justPressed.add(k);
        this.anyKeyPressed = true;
      }
      this.keys.add(k);
    });

    window.addEventListener('keyup', (e) => {
      const k = this._norm(e);
      this.keys.delete(k);
      this.justReleased.add(k);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    // The game draws in *game units*, which are the logical viewport size
    // (see view.js) — not the canvas backing-store pixels and not raw
    // client pixels. Client coordinates are CSS pixels, so the conversion
    // is: subtract the canvas offset, then scale by logical/CSS.
    //
    // Getting this wrong is invisible on a 1x display and catastrophic on a
    // HiDPI one, where every click would land further right and lower than
    // it was aimed.
    const toGame = (clientX, clientY) => {
      const r = this.canvas.getBoundingClientRect();
      const sx = r.width > 0 ? VIEW_W / r.width : 1;
      const sy = r.height > 0 ? VIEW_H / r.height : 1;
      return {
        x: Math.floor((clientX - r.left) * sx),
        y: Math.floor((clientY - r.top) * sy),
      };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const p = toGame(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const p = toGame(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.down = true;
      this.mouse.justDown = true;
      this.mouse.clicked = true;
    });

    window.addEventListener('mouseup', () => {
      if (this.mouse.down) this.mouse.justUp = true;
      this.mouse.down = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch: treat as a mouse on the canvas.
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const p = toGame(t.clientX, t.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.down = true;
      this.mouse.justDown = true;
      this.mouse.clicked = true;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const p = toGame(t.clientX, t.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    }, { passive: false });

    const endTouch = (e) => {
      e.preventDefault();
      if (this.mouse.down) this.mouse.justUp = true;
      this.mouse.down = false;
    };
    this.canvas.addEventListener('touchend', endTouch, { passive: false });
    this.canvas.addEventListener('touchcancel', endTouch, { passive: false });
  }

  down(...keys) {
    for (const k of keys) if (this.keys.has(k)) return true;
    return false;
  }

  pressed(...keys) {
    for (const k of keys) if (this.justPressed.has(k)) return true;
    return false;
  }

  released(...keys) {
    for (const k of keys) if (this.justReleased.has(k)) return true;
    return false;
  }

  /** True if the primary action is being held (space / left mouse). */
  holding() {
    return this.down(' ') || this.mouse.down;
  }

  /** Any of a set of "confirm" inputs pressed this frame. */
  confirmPressed() {
    return this.pressed(' ') || this.mouse.clicked;
  }

  /** Clear one-frame flags. Call at the very end of the frame. */
  endFrame() {
    this.justPressed.clear();
    this.justReleased.clear();
    this.mouse.justDown = false;
    this.mouse.justUp = false;
    this.mouse.clicked = false;
    this.anyKeyPressed = false;
  }
}
