export type Action = 'skill' | 'pause';

const BLOCK_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
const SKILL_KEYS = new Set(['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyL']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);

export class Input {
  keys = new Set<string>();
  pointer = { active: false, x: 0, y: 0, id: -1 };
  private pressed = new Set<Action>();

  private onDown = (e: KeyboardEvent) => {
    if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(e.code);
    if (SKILL_KEYS.has(e.code)) this.pressed.add('skill');
    if (PAUSE_KEYS.has(e.code)) this.pressed.add('pause');
  };
  private onUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => {
    this.keys.clear();
    this.pointer.active = false;
  };

  constructor() {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }

  dispose() {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }

  down(...codes: string[]) {
    return codes.some((c) => this.keys.has(c));
  }

  press(a: Action) {
    this.pressed.add(a);
  }

  consume(a: Action) {
    const had = this.pressed.has(a);
    this.pressed.delete(a);
    return had;
  }

  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.pointer.active = false;
  }

  axis() {
    let x = 0;
    let y = 0;
    if (this.down('ArrowLeft', 'KeyA')) x -= 1;
    if (this.down('ArrowRight', 'KeyD')) x += 1;
    if (this.down('ArrowUp', 'KeyW')) y -= 1;
    if (this.down('ArrowDown', 'KeyS')) y += 1;
    if (x && y) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  firing() {
    return this.down('Space', 'KeyJ') || this.pointer.active;
  }
}
