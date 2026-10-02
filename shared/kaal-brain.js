// What Kaal does. Pure logic: no Three.js, so the rules can be tested.
//
// It never runs. It never appears where you can see it appear. It walks
// toward you at the speed of its stage, pausing mid-stride for long seconds,
// and stops dead in warm light, where only its head keeps turning to follow
// you. In the dark, within reach, its arms come up; if they finish rising
// before a flame catches it, it has you.
//
// Modes:
//   absent   not in the house
//   still    standing (stage 0–1, or nowhere to go)
//   dormant  Dadi's-room corner, facing the wall, until woken
//   walk     following a path (to you, or to a scripted spot)
//   pause    stopped mid-stride
//   reach    arms rising (dark, within reach)
//   held     in warm light: everything stops but the head
//   caught   it has you

import { KAAL, STAGE } from "./rules.js";
import { findPath, kaalFloor, lineOfSight, doorwayAt, inPit } from "./house-map.js";
import { kaalHeld } from "./light.js";

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can the player see this point? view: { x, z, yaw, fov } (fov: full
// horizontal angle in radians). Walls block.
export function inView(view, p, margin = 0.25) {
  const dx = p.x - view.x;
  const dz = p.z - view.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.6) return true;
  // Facing at yaw looks along (-sin yaw, -cos yaw).
  const ang = Math.atan2(-dx, -dz);
  if (Math.abs(angleDiff(ang, view.yaw)) > (view.fov ?? 1.6) / 2 + margin) return false;
  return lineOfSight(view, p);
}

export class KaalBrain {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.stage = STAGE.RUMOUR;
    this.s = {
      present: false,
      x: 0,
      z: -6,
      y: 0,
      yaw: 0,
      head: 0, // head yaw relative to body
      height: KAAL.height,
      mode: "absent",
      resume: "still",
      folding: 0, // 0..1, how folded it is (doorways)
      reach: 0, // 0..1, arms up
      stride: 0, // gait phase (frozen when held/paused)
      speed: 0,
      awake: false,
    };
    this.path = null;
    this.target = null; // scripted walk target
    this.repath = 0;
    this.pauseIn = this.rand(...KAAL.pauseEvery);
    this.pauseLeft = 0;
    this.heldTime = 0;
  }

  rand(a, b) {
    return a + this.random() * (b - a);
  }

  get state() {
    return this.s;
  }

  setStage(stage) {
    this.stage = stage;
  }

  // Put Kaal somewhere, but only where the player can't see it happen and
  // not close by. Returns false (and does nothing) if that would break the
  // Dread Contract. `force` is for cutscenes that own the camera.
  place(x, z, { yaw = 0, mode = "still", view = null, force = false } = {}) {
    if (!force && view) {
      const d = Math.hypot(x - view.x, z - view.z);
      if (d < KAAL.minSpawnDistance) return false;
      if (inView(view, { x, z })) return false;
      if (this.s.present && inView(view, this.s)) return false; // it would vanish in front of you
    }
    Object.assign(this.s, { present: true, x, z, y: kaalFloor(x, z), yaw, head: 0, mode, reach: 0, folding: 0 });
    this.path = null;
    this.target = null;
    return true;
  }

  remove({ view = null, force = false } = {}) {
    if (!force && view && this.s.present && inView(view, this.s)) return false;
    this.s.present = false;
    this.s.mode = "absent";
    return true;
  }

  // Scripted walk to a spot (then stand still).
  walkTo(x, z) {
    this.target = { x, z };
    this.path = null;
    this.repath = 0;
    if (this.s.mode !== "held") this.s.mode = "walk";
    else this.s.resume = "walk";
  }

  wake() {
    if (this.s.awake) return;
    this.s.awake = true;
    if (this.s.mode === "dormant") this.s.mode = "walk";
    else if (this.s.mode === "held") this.s.resume = "walk";
  }

  get following() {
    return this.s.awake || this.stage >= STAGE.FOLLOWING;
  }

  speed() {
    const stage = Math.max(this.stage, this.s.awake ? STAGE.FOLLOWING : 0);
    return KAAL.speed[stage] || 0.75;
  }

  // One step of thought. ctx: { player: {x, z, y, inTank}, lights, view }
  // Returns a list of events: "held", "released", "pause", "resume",
  // "reach", "lower", "catch", "wake", "fold", "arrive".
  tick(dt, ctx) {
    const s = this.s;
    const ev = [];
    if (!s.present || s.mode === "caught") return ev;
    const { player, lights } = ctx;

    // Warm light holds it: everything stops but the head.
    const held = kaalHeld(lights, s);
    if (held && s.mode !== "held") {
      s.resume = s.mode;
      s.mode = "held";
      this.heldTime = 0;
      ev.push("held");
    } else if (!held && s.mode === "held") {
      s.mode = s.resume === "held" ? "still" : s.resume;
      ev.push("released");
    }

    const toPlayer = Math.atan2(-(player.x - s.x), -(player.z - s.z));
    const dist = Math.hypot(player.x - s.x, player.z - s.z);

    if (s.mode === "held") {
      this.heldTime += dt;
      // Only the head moves, slowly, to follow you.
      const want = Math.max(-1.6, Math.min(1.6, angleDiff(toPlayer, s.yaw)));
      const d = angleDiff(want, s.head);
      s.head += Math.sign(d) * Math.min(Math.abs(d), KAAL.headTurn * dt);
      s.speed = 0;
      return ev;
    }

    // Dormant in the corner: wakes when you come close in the dark.
    if (s.mode === "dormant") {
      // Still facing the wall, but the head begins to turn toward you.
      if (dist < 5) {
        const want = Math.max(-1.4, Math.min(1.4, angleDiff(toPlayer, s.yaw)));
        const d = angleDiff(want, s.head);
        s.head += Math.sign(d) * Math.min(Math.abs(d), KAAL.headTurn * 0.6 * dt);
      }
      if (dist < KAAL.dormantWake && !player.inTank) {
        s.awake = true;
        s.mode = "walk";
        ev.push("wake");
      } else return ev;
    }

    // The reach: in the dark and close, its arms come up.
    if (this.following && !this.target && (s.mode === "walk" || s.mode === "pause" || s.mode === "reach" || s.mode === "still")) {
      // Close, at the same level, and not through a wall.
      const close = dist < KAAL.reach && Math.abs((player.y ?? 0) - s.y) < 1.6 && lineOfSight(s, player);
      if (close && s.mode !== "reach") {
        s.mode = "reach";
        ev.push("reach");
      }
      if (s.mode === "reach") {
        s.yaw += angleDiff(toPlayer, s.yaw) * Math.min(1, dt * 3);
        s.head *= 1 - Math.min(1, dt * 4);
        if (close) {
          s.reach = Math.min(1, s.reach + dt / KAAL.reachTime);
          if (s.reach >= 1) {
            s.mode = "caught";
            ev.push("catch");
          }
        } else {
          s.reach = Math.max(0, s.reach - dt / KAAL.reachTime);
          if (s.reach <= 0) {
            s.mode = "walk";
            ev.push("lower");
          }
        }
        s.speed = 0;
        return ev;
      }
    }
    s.reach = Math.max(0, s.reach - dt / KAAL.reachTime);

    // Where is it going?
    let goal = null;
    if (this.target) goal = this.target;
    else if (this.following) goal = player;

    if (!goal || s.mode === "still") {
      if (goal && s.mode === "still") s.mode = "walk";
      else {
        s.speed = 0;
        // Standing, it listens: the head drifts.
        s.head += (Math.sin(performanceTime(this) * 0.3) * 0.25 - s.head) * dt * 0.5;
        return ev;
      }
    }

    // The pause: mid-stride, for long seconds.
    if (s.mode === "pause") {
      this.pauseLeft -= dt;
      s.speed = 0;
      if (this.pauseLeft <= 0) {
        s.mode = "walk";
        this.pauseIn = this.rand(...KAAL.pauseEvery);
        ev.push("resume");
      }
      return ev;
    }
    this.pauseIn -= dt;
    if (this.pauseIn <= 0 && !doorwayAt(s.x, s.z)) {
      s.mode = "pause";
      this.pauseLeft = this.rand(...KAAL.pauseFor);
      ev.push("pause");
      return ev;
    }

    // Path toward the goal.
    this.repath -= dt;
    if (!this.path || this.repath <= 0) {
      this.path = findPath(s, goal);
      this.repath = this.target ? 2 : 0.6;
    }
    if (!this.path || !this.path.length) {
      if (this.target && Math.hypot(this.target.x - s.x, this.target.z - s.z) < 0.4) {
        this.target = null;
        s.mode = "still";
        ev.push("arrive");
      }
      s.speed = 0;
      return ev;
    }

    // Slower when folding through a doorway or climbing in the tank.
    const door = doorwayAt(s.x, s.z, 0.6);
    const wantFold = door ? 1 : 0;
    if (wantFold && s.folding < 0.05) ev.push("fold");
    s.folding += (wantFold - s.folding) * Math.min(1, dt * 1.6);
    let speed = this.speed();
    speed *= 1 - (1 - KAAL.foldSpeed) * s.folding;
    if (inPit(s.x, s.z)) speed *= KAAL.pitSpeed;
    s.speed = speed;

    let step = speed * dt;
    while (step > 0 && this.path.length) {
      const next = this.path[0];
      const dx = next.x - s.x;
      const dz = next.z - s.z;
      const d = Math.hypot(dx, dz);
      if (d <= step) {
        s.x = next.x;
        s.z = next.z;
        step -= d;
        this.path.shift();
      } else {
        s.x += (dx / d) * step;
        s.z += (dz / d) * step;
        const want = Math.atan2(-dx, -dz);
        s.yaw += angleDiff(want, s.yaw) * Math.min(1, dt * 2.2);
        step = 0;
      }
    }
    s.y += (kaalFloor(s.x, s.z) - s.y) * Math.min(1, dt * 3);
    s.stride += speed * dt;
    // Looking ahead, or at you.
    const look = Math.max(-1.2, Math.min(1.2, angleDiff(toPlayer, s.yaw)));
    s.head += (look * (dist < 6 ? 0.8 : 0.2) - s.head) * Math.min(1, dt * 0.8);

    if (this.target && !this.path.length) {
      this.target = null;
      this.path = null;
      s.mode = "still";
      ev.push("arrive");
    }
    return ev;
  }
}

// A slow clock for idle drift, without needing a global time.
function performanceTime(brain) {
  brain._t = (brain._t || 0) + 1 / 60;
  return brain._t;
}
