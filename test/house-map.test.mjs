import { test } from "node:test";
import assert from "node:assert/strict";
import { collidePlayer, findPath, inPit, lineOfSight, roomAt, kaalCost, cellOf, SPOTS, doorwayAt, kaalFloor } from "../shared/house-map.js";

test("rooms are where the map says", () => {
  assert.equal(roomAt(0, 0), "dining");
  assert.equal(roomAt(5, 0), "kitchen");
  assert.equal(roomAt(-5, 0), "dadi");
  assert.equal(roomAt(0, -5), "courtyard");
});

test("walls stop the player, doorways don't", () => {
  // Walking east into the dining/kitchen wall away from the doorway.
  const blocked = collidePlayer({ x: 3.0, z: -1.5 }, 0.24);
  assert.ok(blocked.x < 2.9, "pushed back out of the wall");
  // Through the doorway at z = 0.
  const through = collidePlayer({ x: 3.0, z: 0 }, 0.24);
  assert.ok(Math.abs(through.x - 3.0) < 0.01);
});

test("the player can't leave by the back doors, Kaal can", () => {
  const p = collidePlayer({ x: -6.0, z: -2.6 }, 0.24);
  assert.ok(p.z > -2.5, "back doorway is solid to you");
  const c = cellOf(-6.0, -2.5);
  assert.notEqual(kaalCost(c.i, c.j), Infinity, "but open to Kaal");
});

test("Kaal can walk from the courtyard to the dining table", () => {
  const path = findPath(SPOTS.yardEntry, { x: 0, z: 1.2 });
  assert.ok(path && path.length > 10);
});

test("Kaal climbs through the kitchen tank", () => {
  const path = findPath({ x: 6.5, z: -1.0 }, { x: 3.3, z: 0 });
  assert.ok(path);
  assert.ok(kaalFloor(5, -0.2) < -1.5);
});

test("light doesn't pass through walls but does through doorways", () => {
  assert.equal(lineOfSight({ x: 0, z: -1 }, { x: 5, z: -1 }), false);
  assert.equal(lineOfSight({ x: 0, z: 0 }, { x: 5, z: 0 }), true);
});

test("pit and doorway queries", () => {
  assert.ok(inPit(5, 0));
  assert.ok(!inPit(3.4, 0));
  assert.ok(doorwayAt(3.0, 0));
  assert.ok(!doorwayAt(0, 0));
});
