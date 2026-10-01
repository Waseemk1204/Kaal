// Kaal has you. (stub)
export class DeathScene {
  constructor(game, { onDone }) {
    game.ui.fade(true);
    setTimeout(() => {
      game.ui.fade(false);
      onDone();
    }, 1500);
  }
  update() {}
}
