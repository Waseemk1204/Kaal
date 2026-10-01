// Everything in the house that isn't the house: props, the family, and the
// things you can pick up.

import { Props, surfaceAt } from "./props.js";
import { Family } from "./family.js";

export class World {
  constructor(game) {
    this.game = game;
    this.props = new Props(game.scene);
    this.family = new Family(game.scene);
    this.fan = 0;
    this.tube = 0;
  }

  surfaceAt(x, z) {
    return surfaceAt(x, z);
  }

  update(dt) {
    this.props.update(dt, { fan: this.fan, tube: this.tube });
    this.family.update(dt);
  }
}
