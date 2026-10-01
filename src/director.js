// The story: what happens when. (M2 stub: drops you in the dining room;
// ?dev&kaal=1 sets Kaal following you from Dadi's room.)

import { SPOTS } from "../shared/house-map.js";
import { STAGE } from "../shared/rules.js";

export class Director {
  constructor(game) {
    this.game = game;
    this.dev = null;
  }

  begin() {
    const g = this.game;
    g.player.place(SPOTS.start.x, SPOTS.start.z, SPOTS.start.yaw);
    g.inv.candles = 3;
    g.start();
    if (this.dev?.kaal) {
      g.stage = STAGE.FOLLOWING;
      g.kaal.setStage(STAGE.FOLLOWING);
      g.kaal.place(-6.5, -1.5, { force: true, mode: "walk", yaw: -Math.PI / 2 });
    }
  }

  event(name) {
    if (name === "kaal:catch") {
      const g = this.game;
      g.ui.fade(true);
      setTimeout(() => {
        g.kaal.brain.remove({ force: true });
        this.begin();
        g.ui.fade(false);
      }, 1500);
    }
  }

  update() {}

  restartCheckpoint() {
    this.begin();
  }
}
