// The dinner, 1987. (stub)
export class Prologue {
  constructor(game, onDone) {
    this.done = onDone;
    setTimeout(onDone, 10);
  }
  update() {}
}
