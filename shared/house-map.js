// The house: three rooms in a row behind a barred front door, and the
// courtyard behind them that only Kaal walks in. Pure data plus the geometry
// questions the game and Kaal's brain ask of it (collision, floor height,
// line of sight, a walking grid). No Three.js here, so it runs under node.
//
// Axes: x runs west → east, z runs north → south, y is up. Metres.
//
//               COURTYARD (z -7 … -2.5)
//   ┌───────────────┬─────────────────┬───────────────┐ z = -2.5
//   │  DADI'S ROOM  │   DINING ROOM   │    KITCHEN    │
//   │               ═                 ═               │  doorways at z -0.5 … 0.5
//   └───────────────┤                 ├───────────────┘ z = 1.5
//                   └──── front door ─┘                 z = 2.5
//   x = -7.5      -3.0              3.0             7.0

import { PIT } from "./rules.js";

export const CEILING = 3.2;
export const DOOR_H = 2.1;
export const WALL_T = 0.2;

export const ROOMS = {
  dadi: { x1: -7.5, x2: -3.0, z1: -2.5, z2: 1.5, name: "Dadi's room" },
  dining: { x1: -3.0, x2: 3.0, z1: -2.5, z2: 2.5, name: "Dining room" },
  kitchen: { x1: 3.0, x2: 7.0, z1: -2.5, z2: 1.5, name: "Kitchen" },
  courtyard: { x1: -7.5, x2: 7.0, z1: -7.0, z2: -2.5, name: "Courtyard", outside: true },
};

// Walls as lines with openings. `along` is the axis the wall runs along;
// `at` is its fixed coordinate on the other axis.
//   kind: "door" (walkable), "back" (Kaal only: rubble in Ab, a shut door in
//   Tab), "front" (barred), "window" (a jaali; solid below `bottom`).
export const WALLS = [
  // North side of the house (facing the courtyard).
  { id: "dadi-n", along: "x", at: -2.5, from: -7.5, to: -3.0, openings: [{ from: -6.5, to: -5.5, bottom: 0, top: DOOR_H, kind: "back", id: "dadi-back" }] },
  { id: "dining-n", along: "x", at: -2.5, from: -3.0, to: 3.0, openings: [{ from: -2.2, to: -1.4, bottom: 2.3, top: 2.8, kind: "window", id: "dining-vent" }] },
  {
    id: "kitchen-n", along: "x", at: -2.5, from: 3.0, to: 7.0,
    openings: [
      { from: 3.7, to: 5.0, bottom: 1.0, top: 2.0, kind: "window", id: "kitchen-jaali" },
      { from: 5.95, to: 6.75, bottom: 0, top: DOOR_H, kind: "back", id: "kitchen-back" },
    ],
  },
  // Outer east/west.
  { id: "dadi-w", along: "z", at: -7.5, from: -2.5, to: 1.5, openings: [] },
  { id: "kitchen-e", along: "z", at: 7.0, from: -2.5, to: 1.5, openings: [] },
  // Inner walls with the two doorways.
  { id: "dadi-dining", along: "z", at: -3.0, from: -2.5, to: 2.5, openings: [{ from: -0.5, to: 0.5, bottom: 0, top: DOOR_H, kind: "door", id: "door-dadi" }] },
  { id: "dining-kitchen", along: "z", at: 3.0, from: -2.5, to: 2.5, openings: [{ from: -0.5, to: 0.5, bottom: 0, top: DOOR_H, kind: "door", id: "door-kitchen" }] },
  // South side.
  { id: "dadi-s", along: "x", at: 1.5, from: -7.5, to: -3.0, openings: [] },
  { id: "kitchen-s", along: "x", at: 1.5, from: 3.0, to: 7.0, openings: [] },
  {
    id: "dining-s", along: "x", at: 2.5, from: -3.0, to: 3.0,
    openings: [
      { from: -0.6, to: 0.6, bottom: 0, top: DOOR_H + 0.1, kind: "front", id: "front-door" },
      { from: -2.5, to: -1.5, bottom: 0.9, top: 2.0, kind: "window", id: "dining-jaali" },
    ],
  },
  // Courtyard boundary (a compound wall, open sky).
  { id: "yard-n", along: "x", at: -7.0, from: -7.5, to: 7.0, openings: [], height: 2.6, outside: true },
  { id: "yard-w", along: "z", at: -7.5, from: -7.0, to: -2.5, openings: [], height: 2.6, outside: true },
  { id: "yard-e", along: "z", at: 7.0, from: -7.0, to: -2.5, openings: [], height: 2.6, outside: true },
];

// The kitchen floor that has fallen into the old water tank. Solid only in
// 1987, which is to say only while it is lit.
export const PIT_AREA = { x1: 3.8, x2: 6.1, z1: -1.9, z2: 1.5, depth: PIT.depth };
export const LADDER = { x: 3.95, z: 1.15 };

// Things that block walking. h is height (for drawing and for Kaal, who
// steps over anything below knee height).
export const FURNITURE = [
  { id: "table", x1: -0.95, x2: 0.95, z1: -0.5, z2: 0.5, h: 0.76, room: "dining" },
  // Chairs (Kaal steps over them; you don't).
  { id: "chair-munna", x1: -0.67, x2: -0.23, z1: 0.8, z2: 1.2, h: 0.46, room: "dining" },
  { id: "chair-mummy", x1: 0.23, x2: 0.67, z1: 0.8, z2: 1.2, h: 0.46, room: "dining" },
  { id: "chair-papa", x1: 0.23, x2: 0.67, z1: -1.2, z2: -0.8, h: 0.46, room: "dining" },
  { id: "chair-dadi", x1: -0.67, x2: -0.23, z1: -1.2, z2: -0.8, h: 0.46, room: "dining" },
  { id: "sideboard", x1: -0.85, x2: 0.85, z1: -2.4, z2: -1.95, h: 0.9, room: "dining" },
  { id: "tv", x1: 1.85, x2: 2.75, z1: 1.85, z2: 2.4, h: 0.75, room: "dining" },
  { id: "rubble-dining", x1: 1.3, x2: 2.6, z1: 0.9, z2: 1.85, h: 0.5, room: "dining", era: "ab" },
  // Kitchen counters along the north wall: west of the pit and east of it.
  { id: "counter-w", x1: 3.1, x2: 3.8, z1: -2.4, z2: -1.9, h: 0.9, room: "kitchen" },
  { id: "counter-e", x1: 6.1, x2: 6.9, z1: -2.4, z2: -1.9, h: 0.9, room: "kitchen" },
  { id: "shelf-e", x1: 6.65, x2: 6.9, z1: -0.2, z2: 1.0, h: 1.0, room: "kitchen" },
  // Dadi's room: the peepal trunk and its roots split the room into lanes.
  { id: "peepal", x1: -5.85, x2: -4.95, z1: -0.75, z2: 0.15, h: CEILING, room: "dadi", era: "ab" },
  { id: "roots-w", x1: -6.6, x2: -5.85, z1: -0.55, z2: -0.05, h: 0.9, room: "dadi", era: "ab" },
  { id: "roots-e", x1: -4.95, x2: -4.1, z1: -0.5, z2: 0.0, h: 0.9, room: "dadi", era: "ab" },
  { id: "charpai", x1: -6.9, x2: -5.0, z1: 0.7, z2: 1.4, h: 0.45, room: "dadi" },
  { id: "pooja", x1: -7.4, x2: -7.05, z1: -1.0, z2: -0.2, h: 1.1, room: "dadi" },
  { id: "trunk", x1: -3.9, x2: -3.2, z1: 0.85, z2: 1.4, h: 0.5, room: "dadi" },
];

// Named places the game refers to.
export const SPOTS = {
  start: { x: 0, z: -1.45, yaw: Math.PI }, // at the sideboard, facing the table
  seat: { munna: { x: -0.45, z: 0.95 }, mummy: { x: 0.45, z: 0.95 }, papa: { x: 0.45, z: -0.95 }, dadi: { x: -0.45, z: -0.95 } },
  plate: { munna: { x: -0.45, z: 0.25 }, mummy: { x: 0.45, z: 0.25 }, papa: { x: 0.45, z: -0.25 }, dadi: { x: -0.45, z: -0.25 } },
  diya: { x: 0, z: 0 },
  photo: { x: -0.2, y: 1.75, z: -2.38 },
  wallClock: { x: 1.4, y: 2.2, z: -2.38 },
  tvTop: { x: 2.3, y: 1.18, z: 2.1 },
  fallenTv: { x: 1.9, z: 1.4 },
  bangles: { x: 6.78, y: 1.02, z: 0.45 },
  tabMatches: { x: 6.45, y: 0.92, z: -2.15 },
  kitchenCandle: { x: 3.4, y: 0.92, z: -2.15 },
  page1: { x: 6.3, y: 0.92, z: -2.0 },
  spectacles: { x: -7.2, y: 1.14, z: -0.75 },
  thali: { x: -7.2, y: 1.12, z: -0.4 },
  dadiTrunk: { x: -3.55, y: 0.5, z: 1.12 },
  page2: { x: -6.2, y: 1.6, z: -2.38 },
  page3: { x: 1.75, y: 0.02, z: 1.25 },
  sideboardDrawer: { x: 0.45, y: 0.6, z: -1.95 },
  kaalCorner: { x: -7.05, z: -2.05, yaw: Math.atan2(-1, -1) }, // facing the NW corner
  sighting: [
    { x: 4.6, z: -5.6 },
    { x: 4.5, z: -4.4 },
  ],
  yardEntry: { x: 0, z: -5.5 },
};

// ------------------------------------------------------------------ queries

// Solid boxes for walls (thickness WALL_T). With kaal=true, "back" openings
// are passable; without it they are solid.
export function wallBoxes({ kaal = false } = {}) {
  const boxes = [];
  const half = WALL_T / 2;
  for (const wall of WALLS) {
    const spans = [];
    let cursor = wall.from;
    const open = wall.openings
      .filter((o) => o.kind === "door" || (kaal && o.kind === "back"))
      .sort((a, b) => a.from - b.from);
    for (const o of open) {
      if (o.from > cursor) spans.push([cursor, o.from]);
      cursor = o.to;
    }
    if (cursor < wall.to) spans.push([cursor, wall.to]);
    for (const [a, b] of spans) {
      // Only the wall's own ends overlap the corners; doorway edges stay true.
      const a2 = a === wall.from ? a - half : a;
      const b2 = b === wall.to ? b + half : b;
      if (wall.along === "x") boxes.push({ x1: a2, x2: b2, z1: wall.at - half, z2: wall.at + half, wall: wall.id });
      else boxes.push({ x1: wall.at - half, x2: wall.at + half, z1: a2, z2: b2, wall: wall.id });
    }
  }
  return boxes;
}

const PLAYER_WALLS = wallBoxes();
const KAAL_WALLS = wallBoxes({ kaal: true });

export function inBox(b, x, z, pad = 0) {
  return x > b.x1 - pad && x < b.x2 + pad && z > b.z1 - pad && z < b.z2 + pad;
}

export function inPit(x, z, pad = 0) {
  return inBox(PIT_AREA, x, z, pad);
}

export function roomAt(x, z) {
  for (const [id, r] of Object.entries(ROOMS)) if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return id;
  return null;
}

// Push a circle out of a box. Mutates pos.
function pushOut(pos, r, b) {
  const cx = Math.max(b.x1, Math.min(pos.x, b.x2));
  const cz = Math.max(b.z1, Math.min(pos.z, b.z2));
  let dx = pos.x - cx;
  let dz = pos.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    pos.x = cx + (dx / d) * r;
    pos.z = cz + (dz / d) * r;
  } else {
    // Centre inside the box: leave by the nearest side.
    const opts = [
      [pos.x - b.x1, -1, 0],
      [b.x2 - pos.x, 1, 0],
      [pos.z - b.z1, 0, -1],
      [b.z2 - pos.z, 0, 1],
    ].sort((p, q) => p[0] - q[0]);
    const [dist, sx, sz] = opts[0];
    pos.x += sx * (dist + r);
    pos.z += sz * (dist + r);
  }
  return true;
}

// Resolve the player against walls and furniture. `abFurniture` decides
// whether the rot (rubble, roots) blocks; it always does in the dark, and
// it's simplest to say it always does.
// In the pit, the tank's walls hold you in.
export function collidePlayer(pos, radius, { inTank = false } = {}) {
  if (inTank) {
    pos.x = Math.max(PIT_AREA.x1 + radius, Math.min(PIT_AREA.x2 - radius, pos.x));
    pos.z = Math.max(PIT_AREA.z1 + radius, Math.min(PIT_AREA.z2 - radius, pos.z));
    return pos;
  }
  for (let i = 0; i < 2; i += 1) {
    for (const b of PLAYER_WALLS) pushOut(pos, radius, b);
    for (const f of FURNITURE) pushOut(pos, radius, f);
  }
  // Never outside the house.
  pos.x = Math.max(-7.5 + radius, Math.min(7.0 - radius, pos.x));
  pos.z = Math.max(-2.5 + radius, Math.min(2.5 - radius, pos.z));
  return pos;
}

// 2D segment against box (slab test).
function segmentHitsBox(ax, az, bx, bz, b) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const [p, d, lo, hi] of [
    [ax, dx, b.x1, b.x2],
    [az, dz, b.z1, b.z2],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      let ta = (lo - p) / d;
      let tb = (hi - p) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) return false;
    }
  }
  return true;
}

// Can light (or a look) travel between two points without a wall in the
// way? Windows and the back doorways let light through.
export function lineOfSight(a, b) {
  for (const box of KAAL_WALLS) if (segmentHitsBox(a.x, a.z, b.x, b.z, box)) return false;
  return true;
}

// Is this point under the edge of a doorway (where Kaal has to fold)?
export function doorwayAt(x, z, pad = 0.35) {
  for (const wall of WALLS) {
    for (const o of wall.openings) {
      if (o.kind !== "door" && o.kind !== "back") continue;
      const along = wall.along === "x" ? x : z;
      const across = wall.along === "x" ? z : x;
      if (along > o.from && along < o.to && Math.abs(across - wall.at) < pad) return o;
    }
  }
  return null;
}

// ------------------------------------------------------------- Kaal's grid

export const GRID = { cell: 0.25, x0: -7.5, z0: -7.0, w: 58, h: 38 }; // to x 7.0, z 2.5

export function cellOf(x, z) {
  return { i: Math.floor((x - GRID.x0) / GRID.cell), j: Math.floor((z - GRID.z0) / GRID.cell) };
}

export function cellCentre(i, j) {
  return { x: GRID.x0 + (i + 0.5) * GRID.cell, z: GRID.z0 + (j + 0.5) * GRID.cell };
}

// Walking cost per cell for Kaal (Infinity = blocked). It keeps a body's
// width from walls and tall furniture, steps over anything low, and climbs
// down through the kitchen tank, slowly.
function buildKaalGrid() {
  const cost = new Float32Array(GRID.w * GRID.h);
  const r = 0.22; // it's thin
  for (let j = 0; j < GRID.h; j += 1) {
    for (let i = 0; i < GRID.w; i += 1) {
      const { x, z } = cellCentre(i, j);
      let c = 1;
      if (x < -7.5 + r || x > 7.0 - r || z < -7.0 + r || z > 2.5 - r) c = Infinity;
      for (const b of KAAL_WALLS) if (inBox(b, x, z, r)) c = Infinity;
      for (const f of FURNITURE) if (f.h > 0.55 && inBox(f, x, z, r)) c = Infinity;
      if (c !== Infinity && inPit(x, z)) c = 3;
      cost[j * GRID.w + i] = c;
    }
  }
  return cost;
}

export const KAAL_GRID = buildKaalGrid();

export function kaalCost(i, j) {
  if (i < 0 || j < 0 || i >= GRID.w || j >= GRID.h) return Infinity;
  return KAAL_GRID[j * GRID.w + i];
}

// A* over the grid, 8-connected, no corner cutting. Returns world points
// from start to goal (exclusive of start), or null.
export function findPath(from, to) {
  const s = cellOf(from.x, from.z);
  let g = cellOf(to.x, to.z);
  if (kaalCost(g.i, g.j) === Infinity) g = nearestOpen(g);
  if (!g) return null;
  if (kaalCost(s.i, s.j) === Infinity) {
    const n = nearestOpen(s);
    if (!n) return null;
    s.i = n.i;
    s.j = n.j;
  }
  const W = GRID.w;
  const key = (i, j) => j * W + i;
  const gScore = new Map([[key(s.i, s.j), 0]]);
  const came = new Map();
  const open = [{ i: s.i, j: s.j, f: 0 }];
  const closed = new Set();
  const h = (i, j) => Math.hypot(i - g.i, j - g.j);
  while (open.length) {
    let best = 0;
    for (let k = 1; k < open.length; k += 1) if (open[k].f < open[best].f) best = k;
    const cur = open.splice(best, 1)[0];
    const ck = key(cur.i, cur.j);
    if (closed.has(ck)) continue;
    if (cur.i === g.i && cur.j === g.j) {
      const out = [];
      let k = ck;
      while (came.has(k)) {
        out.push(cellCentre(k % W, Math.floor(k / W)));
        k = came.get(k);
      }
      return out.reverse();
    }
    closed.add(ck);
    for (let dj = -1; dj <= 1; dj += 1) {
      for (let di = -1; di <= 1; di += 1) {
        if (!di && !dj) continue;
        const ni = cur.i + di;
        const nj = cur.j + dj;
        const c = kaalCost(ni, nj);
        if (c === Infinity) continue;
        if (di && dj && (kaalCost(cur.i + di, cur.j) === Infinity || kaalCost(cur.i, cur.j + dj) === Infinity)) continue;
        const nk = key(ni, nj);
        if (closed.has(nk)) continue;
        const tentative = gScore.get(ck) + c * (di && dj ? Math.SQRT2 : 1);
        if (tentative < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, tentative);
          came.set(nk, ck);
          open.push({ i: ni, j: nj, f: tentative + h(ni, nj) });
        }
      }
    }
  }
  return null;
}

function nearestOpen({ i, j }) {
  for (let r = 1; r < 8; r += 1) {
    for (let dj = -r; dj <= r; dj += 1) {
      for (let di = -r; di <= r; di += 1) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (kaalCost(i + di, j + dj) !== Infinity) return { i: i + di, j: j + dj };
      }
    }
  }
  return null;
}

// Floor height under a point for Kaal (it climbs into the tank).
export function kaalFloor(x, z) {
  if (!inPit(x, z)) return 0;
  // Ease down over the first 0.4 m from the edge so it reads as climbing.
  const edge = Math.min(x - PIT_AREA.x1, PIT_AREA.x2 - x, z - PIT_AREA.z1, PIT_AREA.z2 - z);
  return -PIT_AREA.depth * Math.min(1, edge / 0.4);
}
