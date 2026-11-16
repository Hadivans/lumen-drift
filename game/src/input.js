// LUMEN DRIFT — keyboard + pointer input. The ship follows the pointer, and
// WASD / arrow keys fly it too; both feed one target velocity. Also tracks
// "pressed" edge events (start, restart, pause, mute) so the game loop reads
// clean one-shot actions instead of raw DOM events.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointer = { x: null, y: null, down: false, active: false };
    this._pressed = new Set();
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this._pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onPointerMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
      this.pointer.active = true;
    };
    this._onPointerDown = (e) => {
      this._onPointerMove(e);
      this.pointer.down = true;
      this._pressed.add('pointer');
    };
    this._onPointerUp = () => {
      this.pointer.down = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.pointer.down = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('blur', this._onBlur);
  }

  /** True once for each fresh press; consumed when read. */
  pressed(name) {
    if (this._pressed.has(name)) {
      this._pressed.delete(name);
      return true;
    }
    return false;
  }

  /** Drain the press queue at the end of a frame. */
  endFrame() {
    this._pressed.clear();
  }

  /** -1..1 movement axes from WASD / arrows. */
  axes() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('w') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('s') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  anyKey() {
    return this.keys.size > 0;
  }
}
