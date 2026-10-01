// How Kaal moves. Driven by the brain's state each frame.
//
// The walk is wrong on purpose: each joint holds near the end of its swing
// and then moves late, one after another — knee, then hip, then shoulder —
// like something remembering how bodies work. Paused, it stops mid-stride.
// Held in light, nothing moves but the head. At doorways it folds itself
// down and through. Within reach, the arms come up.

import * as THREE from "three";
import { buildKaal, Ash, FRINGE } from "./body.js";
import { wallBoxes, inBox } from "../../shared/house-map.js";

const WALLS = wallBoxes({ kaal: true });

// Sticky sine: lingers at the extremes, lurches through the middle.
function sticky(phase, k = 0.45) {
  const s = Math.sin(phase);
  return Math.sign(s) * Math.pow(Math.abs(s), k);
}

function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export class KaalView {
  constructor(scene) {
    this.root = buildKaal();
    this.root.visible = false;
    scene.add(this.root);
    this.r = this.root.userData;
    this.ash = new Ash(scene);
    this.time = 0;
    this.pose = {}; // smoothed joint values
    this.twitch = { next: 2, finger: null, t: 0 };
    this.fingertips = [new THREE.Vector3(), new THREE.Vector3()];
    this.touching = [false, false];
    this.ashSources = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this.tmp = new THREE.Vector3();
  }

  // Which side has a wall within arm's length? Returns {left, right} as
  // distances (or Infinity), measured from the shoulders.
  wallSides(s) {
    const out = [Infinity, Infinity];
    const rx = Math.cos(s.yaw); // its right is +x when yaw = 0
    const rz = -Math.sin(s.yaw);
    for (let i = 0; i < 2; i += 1) {
      const side = i === 0 ? -1 : 1;
      for (let d = 0.25; d <= 1.3; d += 0.1) {
        const x = s.x + rx * side * d;
        const z = s.z + rz * side * d;
        if (WALLS.some((b) => inBox(b, x, z))) {
          out[i] = d;
          break;
        }
      }
    }
    return out;
  }

  p(key, target, rate, dt) {
    const v = this.pose[key] ?? target;
    this.pose[key] = dt ? damp(v, target, rate, dt) : target;
    return this.pose[key];
  }

  update(dt, s, { held = false, dormant = false, playerDist = 99 } = {}) {
    const root = this.root;
    root.visible = s.present;
    if (!s.present) {
      this.ash.update(dt, this.ashSources, true, false);
      return;
    }
    this.time += held ? 0 : dt;
    FRINGE.uniforms.uTime.value = this.time;
    FRINGE.uniforms.uHeld.value = held ? 1 : 0;
    root.position.set(s.x, s.y, s.z);
    root.rotation.y = s.yaw;

    const r = this.r;
    // Held: freeze everything but the head.
    if (!held) this.poseBody(dt, s, { dormant, playerDist });
    // Head: brain's head yaw, around world up (the frame here is flipped).
    const headYaw = this.p("headYaw", s.head, held ? 30 : 4, dt);
    r.headPivot.rotation.y = -headYaw * 0.6;
    r.neck.rotation.y = -headYaw * 0.4;

    // Ash comes off the shoulders and head.
    r.arms[0].shoulder.getWorldPosition(this.ashSources[0]);
    r.arms[1].shoulder.getWorldPosition(this.ashSources[1]);
    r.head.getWorldPosition(this.ashSources[2]);
    this.ashSources[2].y += 0.15;
    this.ash.update(dt, this.ashSources, held, true);

    // Fingertips, for marks on the walls.
    for (let i = 0; i < 2; i += 1) {
      const f = r.arms[i].fingers[1];
      f[f.length - 1].getWorldPosition(this.fingertips[i]);
    }
  }

  poseBody(dt, s, { dormant, playerDist }) {
    const r = this.r;
    const t = this.time;
    const phase = (s.stride / 0.85) * Math.PI; // one step per 0.85 m
    const moving = s.speed > 0.01 ? 1 : 0;
    const walk = this.p("walk", moving, 3, dt);
    const fold = s.folding;
    const reach = s.reach;

    // --- legs: knee first, then hip
    for (const leg of r.legs) {
      const off = leg.side < 0 ? 0 : Math.PI;
      const hip = 0.38 * sticky(phase + off - 0.45) * walk + 0.95 * fold;
      const kneeLift = Math.max(0, Math.sin(phase + off + 0.6)) * 1.05 * walk;
      leg.thigh.rotation.x = this.p(`th${leg.side}`, hip, 9, dt);
      leg.thigh.rotation.z = leg.side * 0.04;
      leg.shin.rotation.x = this.p(`sh${leg.side}`, -(Math.pow(kneeLift, 0.6) * 0.9) - 1.45 * fold - 0.08, 9, dt);
      leg.foot.rotation.x = Math.PI / 2 - 0.15 + kneeLift * 0.4 + fold * 0.5;
    }
    r.hips.position.y = r.hipY - 0.035 * Math.abs(Math.sin(phase)) * walk - 0.62 * fold;

    // --- spine: always stooped, curling down at doorways
    const breathe = Math.sin(t * 0.7) * 0.01;
    r.spine[0].rotation.x = Math.PI - this.p("sp0", 0.16 + 0.55 * fold + reach * 0.15 + (dormant ? 0.15 : 0), 4, dt);
    r.spine[0].rotation.z = 0.05 * sticky(phase - 1.1) * walk;
    r.spine[1].rotation.x = -this.p("sp1", 0.12 + 0.45 * fold + breathe, 4, dt);
    r.spine[2].rotation.x = -this.p("sp2", 0.1 + 0.35 * fold - reach * 0.2 + breathe, 4, dt);
    r.neck.rotation.x = -this.p("neck", 0.5 + 0.2 * fold - reach * 0.45 + (dormant ? 0.35 : 0), 3, dt);
    // Head tipped forward, as if listening; it tilts when it stops.
    const tilt = (1 - walk) * Math.sin(t * 0.21) * 0.35;
    r.headPivot.rotation.x = -this.p("headX", 0.32 - reach * 0.5 + (dormant ? 0.45 : 0), 3, dt);
    r.headPivot.rotation.z = this.p("tilt", tilt + (dormant ? 0.2 : 0), 1.5, dt);

    // --- arms: dangling, dragging the wall, or rising to take you
    const walls = this.wallSides(s);
    for (let i = 0; i < 2; i += 1) {
      const arm = r.arms[i];
      const side = arm.side;
      arm.shoulder.position.x = side * 0.17 * (1 - 0.3 * fold);
      const swing = 0.14 * sticky(phase + (side < 0 ? Math.PI : 0) - 1.2) * walk;
      let forward = 0.08 + swing + 0.35 * fold;
      let out = 0.06;
      let elbow = 0.12 + 0.1 * walk;
      this.touching[i] = false;
      const wd = walls[i];
      if (wd < 1.2 && reach < 0.1 && !dormant) {
        // Fingertips along the plaster at shoulder-to-wall distance.
        out = Math.asin(Math.min(0.95, (wd - 0.12) / 1.45)) + 0.05;
        forward = 0.15 + swing * 0.5;
        elbow = 0.05;
        this.touching[i] = moving > 0;
      }
      if (reach > 0) {
        forward = forward * (1 - reach) + reach * 1.3;
        out = out * (1 - reach) + reach * 0.32;
        elbow = elbow * (1 - reach) + reach * 0.15;
      }
      arm.upper.rotation.x = this.p(`ua${i}`, forward, 6, dt);
      arm.upper.rotation.z = this.p(`uo${i}`, side * out, 6, dt);
      arm.fore.rotation.x = this.p(`fa${i}`, elbow, 6, dt);
      arm.hand.rotation.x = this.p(`ha${i}`, 0.1 - reach * 0.2, 6, dt);

      // Fingers: trailing, spread when reaching, one twitching now and then.
      for (let f = 0; f < arm.fingers.length; f += 1) {
        const segs = arm.fingers[f];
        const spread = reach * (f - 1.5) * 0.18;
        for (let k = 0; k < segs.length; k += 1) {
          let curl = 0.12 + k * 0.05 - (this.touching[i] ? 0.35 : 0);
          if (reach > 0.85) curl += (reach - 0.85) * 6 * (0.3 + k * 0.2);
          else curl -= reach * 0.15;
          const tw = this.twitch.finger;
          if (tw && tw[0] === i && tw[1] === f && k === tw[2]) curl += Math.sin(Math.min(1, this.twitch.t / 0.5) * Math.PI) * 0.9;
          segs[k].rotation.x = this.p(`f${i}${f}${k}`, curl, 7, dt);
          if (k === 0) segs[k].rotation.z = spread * side;
        }
      }
    }

    // A single finger joint, flexing on its own.
    this.twitch.t += dt;
    if (this.twitch.finger && this.twitch.t > 0.6) this.twitch.finger = null;
    this.twitch.next -= dt;
    if (this.twitch.next <= 0 && !moving) {
      this.twitch.next = 1.5 + Math.random() * 4;
      this.twitch.t = 0;
      this.twitch.finger = [Math.floor(Math.random() * 2), Math.floor(Math.random() * 4), Math.floor(Math.random() * 3)];
    }
    void playerDist;
  }
}
