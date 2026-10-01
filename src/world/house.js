// Builds the house from shared/house-map.js: walls with their doorways and
// jaalis, red-oxide floors, the kitchen tank under its 1987 floor, ceilings
// with the holes the years have made, and the courtyard. Both times at once;
// era-material.js decides which one you see.

import * as THREE from "three";
import { WALLS, ROOMS, CEILING, WALL_T, PIT_AREA, LADDER, DOOR_H } from "../../shared/house-map.js";
import { eraMaterial } from "./era-material.js";
import { TEX, buildTextures, worldUV, rand } from "./textures.js";

export const MAT = {};

function materials() {
  if (MAT.ready) return MAT;
  buildTextures();
  MAT.wall = eraMaterial({ map: TEX.wallTab, roughness: 0.92, ab: { map: TEX.wallAb, roughness: 1 } });
  MAT.floor = eraMaterial({ map: TEX.floorTab, roughness: 0.35, ab: { map: TEX.floorAb, roughness: 0.95 } });
  MAT.ceil = eraMaterial({ map: TEX.ceilTab, roughness: 0.95, ab: { map: TEX.ceilAb } });
  MAT.wood = eraMaterial({ map: TEX.woodTab, roughness: 0.5, ab: { map: TEX.woodAb, roughness: 0.95 } });
  MAT.woodTab = eraMaterial({ mode: "tab", map: TEX.woodTab, roughness: 0.5 });
  MAT.steel = eraMaterial({ map: TEX.steelTab, metalness: 0.85, roughness: 0.25, ab: { map: TEX.rust, roughness: 0.9 } });
  MAT.jaali = eraMaterial({ color: 0x3d5a3a, metalness: 0.3, roughness: 0.6, ab: { map: TEX.rust, roughness: 0.9 } });
  MAT.brick = eraMaterial({ map: TEX.brickWet, roughness: 0.9, ab: { map: TEX.brickWet } });
  MAT.tankFloor = eraMaterial({ color: 0x0d0f0b, roughness: 0.2, ab: { color: 0x0b0d0a, roughness: 0.15 } });
  MAT.floorTabOnly = eraMaterial({ mode: "tab", map: TEX.floorTab, roughness: 0.35 });
  MAT.ceilTabOnly = eraMaterial({ mode: "tab", map: TEX.ceilTab, roughness: 0.95 });
  MAT.yard = eraMaterial({ map: TEX.yardTab, roughness: 0.95, ab: { map: TEX.yardAb } });
  MAT.rubble = eraMaterial({ mode: "ab", color: 0x4a4740, roughness: 1 });
  MAT.rubbleBrick = eraMaterial({ mode: "ab", color: 0x4a2c22, roughness: 1 });
  MAT.rustAb = eraMaterial({ mode: "ab", map: TEX.rust, roughness: 0.9 });
  MAT.paperAb = eraMaterial({ mode: "ab", color: 0xb8ae94, roughness: 1 });
  MAT.ready = true;
  return MAT;
}

// A box in world space with metre-scaled UVs.
function box(group, mat, x1, y1, z1, x2, y2, z2, { su = 2, sv = 3.2, shadow = true, receive = true } = {}) {
  const geo = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
  geo.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  worldUV(geo, su, sv);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = shadow;
  mesh.receiveShadow = receive;
  group.add(mesh);
  return mesh;
}

export class House {
  constructor(scene) {
    materials();
    this.group = new THREE.Group();
    this.group.name = "house";
    scene.add(this.group);
    this.buildFloors();
    this.buildWalls();
    this.buildCeilings();
    this.buildTank();
    this.buildCourtyard();
    this.buildDoors();
    this.buildSky(scene);
  }

  buildFloors() {
    const g = this.group;
    for (const [id, r] of Object.entries(ROOMS)) {
      if (id === "courtyard") continue;
      if (id === "kitchen") {
        // Around the tank.
        box(g, MAT.floor, r.x1, -0.1, r.z1, PIT_AREA.x1, 0, r.z2, { su: 1.2, sv: 1.2, shadow: false });
        box(g, MAT.floor, PIT_AREA.x2, -0.1, r.z1, r.x2, 0, r.z2, { su: 1.2, sv: 1.2, shadow: false });
        box(g, MAT.floor, PIT_AREA.x1, -0.1, r.z1, PIT_AREA.x2, 0, PIT_AREA.z1, { su: 1.2, sv: 1.2, shadow: false });
        // The 1987 floor over the tank: only there while it's lit.
        box(g, MAT.floorTabOnly, PIT_AREA.x1, -0.1, PIT_AREA.z1, PIT_AREA.x2, 0, PIT_AREA.z2, { su: 1.2, sv: 1.2, shadow: false });
        // Broken edge: jagged slabs hanging into the tank.
        for (let i = 0; i < 14; i += 1) {
          const along = rand();
          const side = i % 3;
          const s = 0.15 + rand() * 0.25;
          const x = side === 0 ? PIT_AREA.x1 + 0.05 : side === 1 ? PIT_AREA.x2 - 0.05 : PIT_AREA.x1 + along * (PIT_AREA.x2 - PIT_AREA.x1);
          const z = side === 2 ? PIT_AREA.z1 + 0.05 : PIT_AREA.z1 + along * (PIT_AREA.z2 - PIT_AREA.z1);
          const m = box(g, MAT.rubble, x - s / 2, -0.12 - s * 0.6, z - s / 2, x + s / 2, -0.02, z + s / 2, { shadow: false });
          m.rotation.set((rand() - 0.5) * 0.6, rand() * 3, (rand() - 0.5) * 0.6);
          m.geometry.center();
          m.position.set(x, -0.08 - s * 0.3, z);
        }
        continue;
      }
      box(g, MAT.floor, r.x1, -0.1, r.z1, r.x2, 0, r.z2, { su: 1.2, sv: 1.2, shadow: false });
    }
  }

  buildWalls() {
    const g = this.group;
    const t = WALL_T / 2;
    for (const wall of WALLS) {
      const H = wall.height ?? CEILING;
      const piece = (a, b, y1, y2) => {
        if (b - a < 0.001 || y2 - y1 < 0.001) return;
        if (wall.along === "x") box(g, MAT.wall, a - (a === wall.from ? t : 0), y1, wall.at - t, b + (b === wall.to ? t : 0), y2, wall.at + t);
        else box(g, MAT.wall, wall.at - t, y1, a, wall.at + t, y2, b);
      };
      const openings = [...wall.openings].sort((a, b) => a.from - b.from);
      let cursor = wall.from;
      for (const o of openings) {
        piece(cursor, o.from, 0, H);
        piece(o.from, o.to, o.top, H); // lintel
        if (o.bottom > 0) piece(o.from, o.to, 0, o.bottom); // sill
        if (o.kind === "window") this.jaali(wall, o);
        cursor = o.to;
      }
      piece(cursor, wall.to, 0, H);
    }
  }

  // An iron lattice in a window opening.
  jaali(wall, o) {
    const w = o.to - o.from;
    const h = o.top - o.bottom;
    const bars = new THREE.Group();
    const bar = new THREE.BoxGeometry(1, 1, 1);
    const n = Math.max(3, Math.round(w / 0.12));
    const m = Math.max(3, Math.round(h / 0.12));
    for (let i = 1; i < n; i += 1) {
      const mesh = new THREE.Mesh(bar, MAT.jaali);
      mesh.scale.set(0.018, h, 0.018);
      mesh.position.set(-w / 2 + (i * w) / n, 0, 0);
      bars.add(mesh);
    }
    for (let j = 1; j < m; j += 1) {
      const mesh = new THREE.Mesh(bar, MAT.jaali);
      mesh.scale.set(w, 0.018, 0.018);
      mesh.position.set(0, -h / 2 + (j * h) / m, 0);
      bars.add(mesh);
    }
    const mid = (o.from + o.to) / 2;
    const y = (o.bottom + o.top) / 2;
    if (wall.along === "x") bars.position.set(mid, y, wall.at);
    else {
      bars.position.set(wall.at, y, mid);
      bars.rotation.y = Math.PI / 2;
    }
    bars.traverse((c) => (c.castShadow = true));
    this.group.add(bars);
  }

  buildCeilings() {
    const g = this.group;
    const slab = (x1, z1, x2, z2, mat = MAT.ceil) => box(g, mat, x1, CEILING, z1, x2, CEILING + 0.25, z2, { su: 2, sv: 2 });
    // Ceiling with a hole cut out, plus a 1987 patch that fills it.
    const holed = (r, hole) => {
      slab(r.x1, r.z1, hole.x1, r.z2);
      slab(hole.x2, r.z1, r.x2, r.z2);
      slab(hole.x1, r.z1, hole.x2, hole.z1);
      slab(hole.x1, hole.z2, hole.x2, r.z2);
      const patch = slab(hole.x1, hole.z1, hole.x2, hole.z2, MAT.ceilTabOnly);
      patch.castShadow = false;
    };
    this.diningHole = { x1: -0.7, x2: 0.9, z1: -1.0, z2: 0.3 };
    this.dadiHole = { x1: -6.2, x2: -4.6, z1: -1.2, z2: 0.6 };
    holed(ROOMS.dining, this.diningHole);
    holed(ROOMS.dadi, this.dadiHole);
    slab(ROOMS.kitchen.x1, ROOMS.kitchen.z1, ROOMS.kitchen.x2, ROOMS.kitchen.z2);
    // Fallen ceiling under the dining hole (the plates are under some of it).
    const h = this.diningHole;
    for (let i = 0; i < 9; i += 1) {
      const s = 0.12 + rand() * 0.3;
      const x = h.x1 + rand() * (h.x2 - h.x1) + 0.9;
      const z = h.z1 + rand() * (h.z2 - h.z1) + 0.9;
      const m = box(g, MAT.rubble, -s / 2, -s / 4, -s / 2, s / 2, s / 4, s / 2, { shadow: false });
      m.position.set(Math.min(2.6, x), s / 4, Math.min(1.8, z));
      m.rotation.set(rand(), rand() * 3, rand());
    }
  }

  buildTank() {
    const g = this.group;
    const p = PIT_AREA;
    const d = -p.depth;
    box(g, MAT.brick, p.x1 - 0.1, d, p.z1, p.x1, 0, p.z2, { su: 1, sv: 1 });
    box(g, MAT.brick, p.x2, d, p.z1, p.x2 + 0.1, 0, p.z2, { su: 1, sv: 1 });
    box(g, MAT.brick, p.x1, d, p.z1 - 0.1, p.x2, 0, p.z1, { su: 1, sv: 1 });
    box(g, MAT.brick, p.x1, d, p.z2, p.x2, 0, p.z2 + 0.1, { su: 1, sv: 1 });
    box(g, MAT.tankFloor, p.x1, d - 0.1, p.z1, p.x2, d, p.z2, { su: 1, sv: 1, shadow: false });
    // The broken iron ladder up the west side.
    const ladder = new THREE.Group();
    const rail = new THREE.BoxGeometry(0.03, p.depth + 0.2, 0.03);
    for (const dz of [-0.2, 0.2]) {
      const m = new THREE.Mesh(rail, MAT.rustAb);
      m.position.set(0, -p.depth / 2 + 0.05, dz);
      ladder.add(m);
    }
    for (let i = 0; i < 6; i += 1) {
      if (i === 3) continue; // a missing rung
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), MAT.rustAb);
      m.rotation.x = Math.PI / 2;
      m.position.set(0, -p.depth + 0.3 + i * 0.32, 0);
      ladder.add(m);
    }
    ladder.position.set(LADDER.x, 0, LADDER.z);
    ladder.rotation.z = 0.08;
    g.add(ladder);
  }

  buildCourtyard() {
    const g = this.group;
    const r = ROOMS.courtyard;
    box(g, MAT.yard, r.x1, -0.1, r.z1, r.x2, 0, r.z2 - 0.1, { su: 2, sv: 2, shadow: false });
  }

  buildDoors() {
    const g = this.group;
    for (const wall of WALLS) {
      for (const o of wall.openings) {
        const w = o.to - o.from;
        const mid = (o.from + o.to) / 2;
        if (o.kind === "back") {
          // 1987: a shut wooden door. Now: the doorway full of rubble, waist high.
          const door = box(g, MAT.woodTab, -w / 2, 0, -0.03, w / 2, DOOR_H, 0.03, { shadow: false });
          door.position.set(mid, 0, wall.at);
          for (let i = 0; i < 16; i += 1) {
            const s = 0.15 + rand() * 0.35;
            const m = box(g, i % 3 ? MAT.rubble : MAT.rubbleBrick, -s / 2, -s / 3, -s / 2, s / 2, s / 3, s / 2, { shadow: false });
            m.position.set(mid + (rand() - 0.5) * w, (s / 3) * (1 + rand() * 2) * (1 - Math.abs(rand() - 0.5)), wall.at + (rand() - 0.5) * 1.2);
            m.rotation.set(rand(), rand() * 3, rand());
          }
        }
        if (o.kind === "front") {
          const leaf = (side) => {
            const m = box(g, MAT.wood, 0, 0, -0.04, w / 2 - 0.01, o.top, 0.04, { su: 1, sv: 1 });
            m.position.set(side < 0 ? o.from : mid + 0.005, 0, wall.at);
            return m;
          };
          leaf(-1);
          leaf(1);
          // The iron bar across both leaves.
          const bar = box(g, MAT.steel, o.from - 0.15, 1.05, -0.03, o.to + 0.15, 1.13, 0.03);
          bar.position.z = wall.at - 0.08;
          this.frontDoor = { x: mid, z: wall.at };
        }
      }
    }
  }

  buildSky(scene) {
    scene.background = new THREE.Color(0x05070c);
    // Stars on a big dome, just enough to read as sky through the holes.
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const a = rand() * Math.PI * 2;
      const e = 0.25 + rand() * 1.2;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * 80;
      pos[i * 3 + 1] = Math.sin(e) * 80;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 80;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8a96b0, size: 0.18, fog: false }));
    scene.add(stars);
    // The moon.
    const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0xc9d4ea, fog: false }));
    moon.position.set(22, 52, -40);
    moon.lookAt(0, 0, 0);
    scene.add(moon);
  }
}

// Moonlight and the dim blue fill of the dark.
export function moonlight(scene) {
  scene.fog = new THREE.FogExp2(0x070a10, 0.05);
  const hemi = new THREE.HemisphereLight(0x5a6e96, 0x1a1712, 12);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9fb6e0, 4.5);
  moon.position.set(5, 14, -9);
  moon.target.position.set(0, 0, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const c = moon.shadow.camera;
  c.left = -11;
  c.right = 11;
  c.top = 11;
  c.bottom = -11;
  c.near = 1;
  c.far = 40;
  moon.shadow.bias = -0.0008;
  moon.shadow.normalBias = 0.02;
  scene.add(moon, moon.target);
  return { hemi, moon };
}
