// Where Kaal's fingertips drag along the plaster, the wall ages: four
// parallel streaks of blistered paint and damp that fade in and stay.

import * as THREE from "three";
import { wallBoxes } from "../../shared/house-map.js";

const BOXES = wallBoxes({ kaal: true });
const MAX = 900;

function streakTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext("2d");
  for (let i = 0; i < 4; i += 1) {
    const y = 12 + i * 12 + (Math.random() - 0.5) * 3;
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, "rgba(10,12,8,0)");
    g.addColorStop(0.2, "rgba(10,12,8,0.85)");
    g.addColorStop(0.8, "rgba(14,16,10,0.85)");
    g.addColorStop(1, "rgba(10,12,8,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(64, y, 64, 2.5 + Math.random() * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Blistered paint along the line.
    for (let k = 0; k < 12; k += 1) {
      ctx.fillStyle = "rgba(40,45,30,0.6)";
      ctx.beginPath();
      ctx.arc(10 + Math.random() * 108, y + (Math.random() - 0.5) * 6, 1 + Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Marks {
  constructor(scene) {
    this.material = new THREE.MeshStandardMaterial({ map: streakTexture(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.09), this.material, MAX);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.last = [null, null];
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.fading = []; // [index, age]
  }

  // Drag a fingertip: lay a mark every few centimetres.
  drag(i, tip) {
    const last = this.last[i];
    if (last && last.distanceTo(tip) < 0.09) return;
    this.last[i] = tip.clone();
    this.add(tip);
  }

  lift(i) {
    this.last[i] = null;
  }

  add(p) {
    if (this.mesh.count >= MAX) return;
    // Find the wall face this fingertip is on.
    let best = null;
    let bestD = 0.25;
    for (const b of BOXES) {
      const faces = [
        [Math.abs(p.x - b.x1), b.x1, 0, -1],
        [Math.abs(p.x - b.x2), b.x2, 0, 1],
        [Math.abs(p.z - b.z1), b.z1, 1, -1],
        [Math.abs(p.z - b.z2), b.z2, 1, 1],
      ];
      for (const [d, at, axis, sign] of faces) {
        const inside = axis === 0 ? p.z > b.z1 && p.z < b.z2 : p.x > b.x1 && p.x < b.x2;
        if (inside && d < bestD) {
          bestD = d;
          best = { at, axis, sign };
        }
      }
    }
    if (!best || p.y < 0.4 || p.y > 3.0) return;
    const pos = p.clone();
    if (best.axis === 0) pos.x = best.at + best.sign * 0.004;
    else pos.z = best.at + best.sign * 0.004;
    const yaw = best.axis === 0 ? (best.sign > 0 ? Math.PI / 2 : -Math.PI / 2) : best.sign > 0 ? 0 : Math.PI;
    this.e.set((Math.random() - 0.5) * 0.08, yaw, (Math.random() - 0.5) * 0.15);
    this.q.setFromEuler(this.e);
    const idx = this.mesh.count;
    this.m.compose(pos, this.q, new THREE.Vector3(0.001, 0.001, 1));
    this.mesh.setMatrixAt(idx, this.m);
    this.mesh.count += 1;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.fading.push({ idx, pos, q: this.q.clone(), age: 0 });
  }

  update(dt) {
    if (!this.fading.length) return;
    const s = new THREE.Vector3();
    for (const f of this.fading) {
      f.age += dt;
      const k = Math.min(1, f.age / 5);
      s.set(k, k, 1);
      this.m.compose(f.pos, f.q, s);
      this.mesh.setMatrixAt(f.idx, this.m);
    }
    this.fading = this.fading.filter((f) => f.age < 5);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    this.mesh.count = 0;
    this.fading.length = 0;
  }
}
