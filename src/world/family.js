// Mummy, Papa and Dadi. None of them has a face: Kaal took the faces first.
// Each head is a smooth oval with hair; you know them by their silhouettes,
// their clothes, their hair, the things they carry and the way they sit.
//
// In 1987 (in the light) they are solid. Now (in the dark) a restored one is
// an outline of ash on the chair.

import * as THREE from "three";
import { eraMaterial } from "./era-material.js";
import { SPOTS } from "../../shared/house-map.js";

const SKIN = 0x9a6a4a;
const ASH = 0x5e5a54;

function mats(color, { force = false } = {}) {
  return {
    tab: eraMaterial({ mode: force ? "both" : "tab", color, roughness: 0.85, ab: { color } }),
    ash: eraMaterial({ mode: "ab", color: ASH, roughness: 1 }),
  };
}

function part(group, geometry, colorMats, x, y, z, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const solid = new THREE.Mesh(geometry, colorMats.tab);
  const ash = new THREE.Mesh(geometry, colorMats.ash);
  for (const m of [solid, ash]) {
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  ash.userData.ash = true;
  solid.userData.solid = true;
  return solid;
}

const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 10);
const sph = (r) => new THREE.SphereGeometry(r, 18, 14);

// A limb: a joint group with a capsule hanging down from it.
function limb(parent, m, len, r, x, y, z) {
  const j = new THREE.Group();
  j.position.set(x, y, z);
  parent.add(j);
  part(j, cap(r, len), m, 0, -len / 2, 0);
  j.userData.len = len;
  return j;
}

const SPECS = {
  mummy: { shirt: 0x7a1e22, lower: 0x6a161a, hair: 0x15100c, scale: 1, saree: true, plait: true, bangles: true },
  papa: { shirt: 0xeeeae0, lower: 0x55575a, hair: 0x15100c, scale: 1.06, glassesUp: true, watch: true },
  dadi: { shirt: 0xeceae2, lower: 0xe2ded2, hair: 0xe6e6e2, scale: 0.88, saree: true, bun: true, shawl: 0x8a7a64, stoop: 0.25 },
};

export class Person {
  constructor(id, scene, { force = false } = {}) {
    this.id = id;
    const spec = SPECS[id];
    this.spec = spec;
    const root = new THREE.Group();
    root.name = id;
    this.root = root;
    scene.add(root);
    const s = spec.scale;
    const M = {
      skin: mats(SKIN, { force }),
      shirt: mats(spec.shirt, { force }),
      lower: mats(spec.lower, { force }),
      hair: mats(spec.hair, { force }),
      steel: mats(0xc8ccd0, { force }),
      red: mats(0xb0141a, { force }),
      gold: mats(0xc8962e, { force }),
      shawl: mats(spec.shawl ?? spec.shirt, { force }),
    };
    this.M = M;

    // Seated: hips on the chair, thighs forward, shins down.
    const hips = new THREE.Group();
    hips.position.y = 0.5;
    root.add(hips);
    part(hips, sph(0.17 * s), M.lower, 0, 0, 0, { sx: 1.05, sy: 0.6, sz: 1 });
    for (const side of [-1, 1]) {
      part(hips, cap(0.075 * s, 0.34 * s), M.lower, side * 0.09 * s, 0, -0.2 * s, { rx: Math.PI / 2 });
      part(hips, cap(0.06 * s, 0.38 * s), M.lower, side * 0.09 * s, -0.25, -0.4 * s);
    }
    if (spec.saree) {
      // The saree falls from the waist over the knees to the floor.
      part(hips, new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 0.5, 18, 1), M.lower, 0, -0.25, -0.25 * s, { sz: 1.2 });
    }
    // Torso.
    const torso = new THREE.Group();
    torso.position.y = 0.05;
    torso.rotation.x = -(spec.stoop ?? 0.05);
    hips.add(torso);
    part(torso, cap(0.14 * s, 0.26 * s), M.shirt, 0, 0.24 * s, 0, { sx: 1.15, sz: 0.8 });
    if (spec.saree) {
      // The pallu over the shoulder.
      part(torso, new THREE.BoxGeometry(0.1 * s, 0.55 * s, 0.32 * s), M.lower, -0.1 * s, 0.25 * s, 0.0, { rz: 0.35, rx: 0.1 });
    }
    if (spec.shawl) part(torso, sph(0.21 * s), M.shawl, 0, 0.36 * s, 0.02, { sx: 1.1, sy: 0.75, sz: 0.85 });
    // Neck and head: a smooth oval. Nothing on it.
    const neck = new THREE.Group();
    neck.position.y = 0.48 * s;
    torso.add(neck);
    part(neck, cap(0.045 * s, 0.06), M.skin, 0, 0.04, 0);
    const head = new THREE.Group();
    head.position.y = 0.1;
    neck.add(head);
    part(head, sph(0.1 * s), M.skin, 0, 0.1 * s, 0, { sx: 0.82, sy: 1.08, sz: 0.92 });
    // Hair.
    part(head, sph(0.104 * s), M.hair, 0, 0.13 * s, 0.012, { sx: 0.86, sy: 0.85, sz: 0.95 });
    if (spec.plait) {
      let y = 0.08;
      for (let i = 0; i < 9; i += 1) {
        part(head, sph(0.032 * s * (1 - i * 0.05)), M.hair, 0, y * s, 0.1 * s + i * 0.004, {});
        y -= 0.06;
      }
    }
    if (spec.bun) part(head, sph(0.05 * s), M.hair, 0, 0.17 * s, 0.08 * s);
    if (spec.glassesUp) {
      // Papa's reading glasses, pushed up on his head.
      for (const side of [-1, 1]) part(head, new THREE.TorusGeometry(0.026, 0.004, 6, 16), M.gold, side * 0.035, 0.215 * s, -0.04, { rx: -1.2 });
    }
    // Dadi's spectacles sit on the blank face once she's back.
    this.spectacles = new THREE.Group();
    if (id === "dadi") {
      for (const side of [-1, 1]) part(this.spectacles, new THREE.TorusGeometry(0.024, 0.0035, 6, 16), M.gold, side * 0.032, 0, 0);
      part(this.spectacles, new THREE.CylinderGeometry(0.003, 0.003, 0.02, 4), M.gold, 0, 0.005, 0, { rz: Math.PI / 2 });
      this.spectacles.position.set(0, 0.11 * s, -0.088 * s);
      head.add(this.spectacles);
    }

    // Arms: forearms resting on the table edge, hands near the plate.
    const arms = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.17 * s, 0.42 * s, 0);
      torso.add(shoulder);
      const upper = limb(shoulder, side < 0 && spec.saree ? M.lower : M.shirt, 0.26 * s, 0.045 * s, 0, 0, 0);
      const fore = limb(upper, M.skin, 0.24 * s, 0.037 * s, 0, -upper.userData.len, 0);
      part(fore, sph(0.042 * s), M.skin, 0, -fore.userData.len - 0.03, 0, { sx: 0.8, sy: 1.1, sz: 0.5 });
      if (spec.bangles) for (let k = 0; k < 4; k += 1) part(fore, new THREE.TorusGeometry(0.042 * s, 0.006, 6, 18), M.red, 0, -fore.userData.len + 0.02 + k * 0.012, 0, { rx: Math.PI / 2 });
      if (spec.watch && side < 0) part(fore, new THREE.TorusGeometry(0.04 * s, 0.009, 6, 18), M.steel, 0, -fore.userData.len + 0.03, 0, { rx: Math.PI / 2 });
      upper.rotation.set(0.55, 0, side * 0.12);
      fore.rotation.set(0.9, 0, 0);
      arms.push({ shoulder, upper, fore });
    }
    this.parts = { hips, torso, neck, head, arms };
    this.time = Math.random() * 10;
    this.anim = null; // a function (t, parts) for scripted gestures
    this.setState("gone");
  }

  // Sit at their place at the table.
  seat() {
    const s = SPOTS.seat[this.id];
    this.root.position.set(s.x, 0, s.z * 1.05);
    this.root.rotation.y = s.z > 0 ? Math.PI : 0;
    this.root.rotation.y += Math.PI; // they face the table (-z local is their front)
  }

  // gone: nowhere. present: solid in the light, ash in the dark.
  // solid: solid always (the prologue). ashOnly: just ash.
  setState(state) {
    this.state = state;
    this.root.visible = state !== "gone";
    this.root.traverse((m) => {
      if (!m.isMesh) return;
      if (m.userData.ash) m.visible = state === "present" || state === "ashOnly";
      if (m.userData.solid) m.visible = state === "present" || state === "solid";
    });
    if (this.id === "dadi") this.spectacles.visible = state !== "gone" && this.hasSpectacles;
  }

  update(dt) {
    if (!this.root.visible) return;
    this.time += dt;
    const t = this.time;
    const p = this.parts;
    // Breathing, small shifts of weight.
    p.torso.rotation.z = Math.sin(t * 0.4) * 0.015;
    p.neck.rotation.x = Math.sin(t * 0.3 + 1) * 0.04;
    if (this.anim) this.anim(t, p, dt);
  }
}

export class Family {
  constructor(scene) {
    this.members = {
      mummy: new Person("mummy", scene),
      papa: new Person("papa", scene),
      dadi: new Person("dadi", scene),
    };
    for (const m of Object.values(this.members)) m.seat();
  }

  update(dt) {
    for (const m of Object.values(this.members)) m.update(dt);
  }
}
