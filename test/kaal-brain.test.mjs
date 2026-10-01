import { test } from "node:test";
import assert from "node:assert/strict";
import { KaalBrain, inView } from "../shared/kaal-brain.js";
import { KAAL, STAGE } from "../shared/rules.js";
import { burnRate, floorIsLit, kaalHeld } from "../shared/light.js";

function seeded(seed = 7) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function run(brain, ctx, seconds, dt = 1 / 30, onEvents = () => {}) {
  const all = [];
  for (let t = 0; t < seconds; t += dt) {
    const ev = brain.tick(dt, typeof ctx === "function" ? ctx() : ctx);
    all.push(...ev);
    onEvents(ev);
  }
  return all;
}

const dark = (player) => ({ player, lights: [] });

test("it never moves faster than its stage speed", () => {
  const b = new KaalBrain({ random: seeded() });
  b.setStage(STAGE.COMING);
  b.place(0, -5.5, { force: true });
  let last = { x: b.s.x, z: b.s.z };
  const dt = 1 / 30;
  for (let i = 0; i < 600; i += 1) {
    b.tick(dt, dark({ x: -5, z: 1, y: 0 }));
    const step = Math.hypot(b.s.x - last.x, b.s.z - last.z);
    assert.ok(step <= KAAL.speed[STAGE.COMING] * dt + 1e-6, `step ${step}`);
    last = { x: b.s.x, z: b.s.z };
  }
});

test("held in warm light: it doesn't move at all", () => {
  const b = new KaalBrain({ random: seeded() });
  b.setStage(STAGE.FOLLOWING);
  b.place(-1, -1, { force: true, mode: "walk" });
  const light = { x: 0, y: 1.2, z: 0, radius: 2.2 };
  const before = { x: b.s.x, z: b.s.z };
  const ev = run(b, { player: { x: 1, z: 1, y: 0 }, lights: [light] }, 3);
  assert.ok(ev.includes("held"));
  assert.equal(b.s.mode, "held");
  assert.equal(b.s.x, before.x);
  assert.equal(b.s.z, before.z);
});

test("held, its head still turns to follow you, slowly", () => {
  const b = new KaalBrain({ random: seeded() });
  b.setStage(STAGE.FOLLOWING);
  b.place(0, -1, { force: true, yaw: 0 });
  const light = { x: 0, y: 1.2, z: 0, radius: 3 };
  run(b, { player: { x: 2, z: -1, y: 0 }, lights: [light] }, 1);
  assert.ok(Math.abs(b.s.head) > 0.1);
  assert.ok(Math.abs(b.s.head) <= KAAL.headTurn * 1.05 + 1e-6);
});

test("walls block the light that would hold it", () => {
  const b = new KaalBrain();
  b.place(0, -1, { force: true });
  const kitchenMatch = { x: 3.5, y: 1.3, z: -1, radius: 2.2 }; // other side of the wall
  assert.equal(kaalHeld([kitchenMatch], b.s), false);
});

test("in the dark and close, it reaches, then catches", () => {
  const b = new KaalBrain({ random: seeded() });
  b.setStage(STAGE.FOLLOWING);
  b.place(0, -1, { force: true, mode: "walk" });
  const ev = run(b, dark({ x: 0, z: 0.1, y: 0 }), KAAL.reachTime + 0.3);
  assert.ok(ev.includes("reach"));
  assert.ok(ev.includes("catch"));
  assert.equal(b.s.mode, "caught");
});

test("a match struck mid-reach holds it, arms half up", () => {
  const b = new KaalBrain({ random: seeded() });
  b.setStage(STAGE.FOLLOWING);
  b.place(0, -1, { force: true, mode: "walk" });
  const player = { x: 0, z: 0.1, y: 0 };
  run(b, dark(player), KAAL.reachTime * 0.5);
  assert.equal(b.s.mode, "reach");
  const raised = b.s.reach;
  const ev = run(b, { player, lights: [{ x: 0, y: 1.3, z: 0, radius: 2.2 }] }, 2);
  assert.ok(ev.includes("held"));
  assert.ok(!ev.includes("catch"));
  assert.equal(b.s.reach, raised);
});

test("it can't be placed where you can see it, or close to you", () => {
  const b = new KaalBrain();
  const view = { x: 0, z: 1, yaw: 0, fov: 1.6 }; // looking north, toward the sideboard
  assert.equal(b.place(0, -2, { view }), false, "too close and in view");
  assert.equal(b.place(-5, -1, { view }), false, "too close");
  assert.equal(b.place(0, -5.5, { view }), true, "behind a wall, far: fine");
  // And it can't vanish in front of you either.
  const facing = { x: 0, z: -1.5, yaw: 0, fov: 1.6 };
  b.place(0, -5.5, { force: true });
  assert.equal(inView({ x: 0, z: 2, yaw: 0, fov: 1.6 }, { x: 0, z: -2 }), true);
  assert.equal(b.remove({ view: facing }), true, "the courtyard is behind a wall");
});

test("dormant in the corner until you come close in the dark", () => {
  const b = new KaalBrain({ random: seeded() });
  b.setStage(STAGE.WAITING);
  b.place(-7.05, -2.05, { force: true, mode: "dormant" });
  let ev = run(b, dark({ x: -3.5, z: 0, y: 0 }), 3);
  assert.equal(b.s.mode, "dormant");
  ev = run(b, dark({ x: -6.0, z: -0.6, y: 0 }), 0.2);
  assert.ok(ev.includes("wake"));
  assert.ok(b.following);
});

test("it pauses mid-stride, and never runs", () => {
  const b = new KaalBrain({ random: seeded(3) });
  b.setStage(STAGE.FOLLOWING);
  b.place(-6, -1.5, { force: true, mode: "walk" });
  const ev = run(b, dark({ x: 5.5, z: 1.0, y: 0 }), 30);
  assert.ok(ev.includes("pause"));
  assert.ok(ev.includes("resume"));
});

test("flames burn faster near it", () => {
  const k = { present: true, x: 0, z: 0 };
  assert.equal(burnRate({ x: 10, z: 0 }, k, STAGE.FOLLOWING), 1);
  assert.ok(burnRate({ x: 0.5, z: 0 }, k, STAGE.FOLLOWING) > 2.5);
  assert.ok(burnRate({ x: 7, z: 0 }, k, STAGE.COMING) > 1);
});

test("the 1987 floor is solid only under the light", () => {
  const match = { x: 5, y: 1.3, z: 0, radius: 2.2 };
  assert.ok(floorIsLit([match], 5, 0));
  assert.ok(!floorIsLit([match], 3.0, 0));
  assert.ok(!floorIsLit([], 5, 0));
});
