// You: an old man in a dead house, walking slowly. Movement, collision, the
// kitchen floor that's only there in the light, and the tank under it.

import { PLAYER, PIT, HOLD } from "../shared/rules.js";
import { collidePlayer, inPit, LADDER, roomAt } from "../shared/house-map.js";
import { floorIsLit } from "../shared/light.js";

export class Player {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.y = 0; // feet
    this.vy = 0;
    this.yaw = Math.PI;
    this.pitch = 0;
    this.eye = PLAYER.eye;
    this.inTank = false;
    this.falling = false;
    this.climb = 0; // seconds of climbing held
    this.climbing = false;
    this.bob = 0;
    this.speed = 0;
    this.frozen = false; // cutscenes take the body
    this.onFall = () => {};
    this.onLand = () => {};
    this.onStep = () => {};
  }

  place(x, z, yaw = this.yaw) {
    this.x = x;
    this.z = z;
    this.y = 0;
    this.vy = 0;
    this.yaw = yaw;
    this.pitch = 0;
    this.inTank = false;
    this.falling = false;
    this.climbing = false;
  }

  look(dx, dy) {
    if (this.frozen) return;
    this.yaw -= dx;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - dy));
  }

  get room() {
    return roomAt(this.x, this.z);
  }

  nearLadder() {
    return this.inTank && !this.falling && Math.hypot(this.x - LADDER.x, this.z - LADDER.z) < 0.7;
  }

  // move: {x, y} from input; mode: "walk" | "match" | "run"
  update(dt, move, mode, lights, { climbHeld = false } = {}) {
    if (this.frozen) return;

    if (this.falling) {
      this.vy -= 9.8 * dt;
      this.y += this.vy * dt;
      if (this.y <= -PIT.depth) {
        this.y = -PIT.depth;
        this.vy = 0;
        this.falling = false;
        this.onLand();
      }
      return;
    }

    if (this.climbing) {
      this.climb += dt;
      const t = Math.min(1, this.climb / 0.9);
      this.y = -PIT.depth + PIT.depth * t;
      if (t >= 1) {
        this.climbing = false;
        this.inTank = false;
        this.y = 0;
        this.x = 3.4;
        this.z = LADDER.z;
      }
      return;
    }

    if (this.inTank && this.nearLadder()) {
      if (climbHeld) {
        this.climb += dt;
        if (this.climb >= HOLD.climb) {
          this.climbing = true;
          this.climb = 0;
        }
      } else this.climb = Math.max(0, this.climb - dt * 2);
    }

    const speed = mode === "run" ? PLAYER.run : mode === "match" ? PLAYER.matchWalk : PLAYER.walk;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // Forward is -z when yaw = 0.
    const fx = -sin;
    const fz = -cos;
    const rx = cos;
    const rz = -sin;
    const vx = (fx * move.y + rx * move.x) * speed;
    const vz = (fz * move.y + rz * move.x) * speed;
    const pos = { x: this.x + vx * dt, z: this.z + vz * dt };
    collidePlayer(pos, PLAYER.radius, { inTank: this.inTank });
    const moved = Math.hypot(pos.x - this.x, pos.z - this.z);
    this.x = pos.x;
    this.z = pos.z;
    this.speed = moved / Math.max(dt, 1e-4);
    if (moved > 0.0001) {
      const before = Math.floor(this.bob / Math.PI);
      this.bob += moved * (mode === "run" ? 4.2 : 5.2);
      if (Math.floor(this.bob / Math.PI) !== before) this.onStep(mode);
    }

    // The 1987 floor over the tank holds only while it's lit.
    if (!this.inTank && inPit(this.x, this.z, -0.05) && !floorIsLit(lights, this.x, this.z)) {
      this.inTank = true;
      this.falling = true;
      this.vy = 0;
      this.onFall();
    }
  }

  eyeHeight() {
    const bobAmt = this.speed > 0.2 ? 0.018 : 0;
    return this.y + this.eye + Math.sin(this.bob * 2) * bobAmt;
  }
}
