// Fine dust sifting down from the ceiling around you. There's always a
// little in the moonlight; near Kaal it falls thicker, as if the house is
// ageing faster where it stands.

import * as THREE from "three";

export class Dust {
  constructor(scene, count = 500) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      this.pos[i * 3 + 1] = -10;
      this.vel[i] = 0.05 + Math.random() * 0.12;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9a968c, size: 0.012, transparent: true, opacity: 0.55, depthWrite: false }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.density = 0.15;
  }

  // centre: where you are. density 0..1.
  update(dt, centre, density) {
    this.density += (density - this.density) * Math.min(1, dt * 1.5);
    const active = Math.floor(this.count * this.density);
    for (let i = 0; i < this.count; i += 1) {
      const k = i * 3;
      if (i >= active) {
        this.pos[k + 1] = -10;
        continue;
      }
      this.pos[k + 1] -= this.vel[i] * dt;
      this.pos[k] += Math.sin(this.pos[k + 1] * 3 + i) * 0.01 * dt;
      const dx = this.pos[k] - centre.x;
      const dz = this.pos[k + 2] - centre.z;
      if (this.pos[k + 1] < 0 || dx * dx + dz * dz > 6) {
        this.pos[k] = centre.x + (Math.random() - 0.5) * 4;
        this.pos[k + 1] = 1 + Math.random() * 2.1;
        this.pos[k + 2] = centre.z + (Math.random() - 0.5) * 4;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
