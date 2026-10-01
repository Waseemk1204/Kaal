// Flames: the match in your hand, candle stubs, the family diya. Each one is
// a little glowing teardrop plus a pooled point light, and an entry in the
// list of warm lights that decides where 1987 shows through.
//
// Point lights are pooled at a fixed count so Three.js never recompiles
// shaders when a candle is lit or goes out.

import * as THREE from "three";

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,240,200,1)");
  g.addColorStop(0.18, "rgba(255,190,90,0.9)");
  g.addColorStop(0.45, "rgba(255,110,30,0.25)");
  g.addColorStop(1, "rgba(255,80,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

const flameGeo = new THREE.SphereGeometry(1, 12, 10);
flameGeo.translate(0, 0.9, 0);
flameGeo.scale(1, 1.9, 1);

export class LightPool {
  constructor(scene, count = 5) {
    this.free = [];
    this.lights = [];
    for (let i = 0; i < count; i += 1) {
      const l = new THREE.PointLight(0xffa04a, 0, 0, 2);
      l.position.set(0, -50, 0);
      if (i === 0) {
        // Only the first light (the flame in your hand) casts shadows.
        l.castShadow = true;
        l.shadow.mapSize.set(1024, 1024);
        l.shadow.camera.near = 0.05;
        l.shadow.camera.far = 12;
        l.shadow.bias = -0.002;
        l.shadow.radius = 3;
      }
      scene.add(l);
      this.lights.push(l);
      this.free.push(l);
    }
  }

  take(shadow = false) {
    const i = shadow ? this.free.findIndex((l) => l.castShadow) : this.free.findIndex((l) => !l.castShadow);
    const at = i >= 0 ? i : this.free.findIndex(() => true);
    if (at < 0) return null;
    return this.free.splice(at, 1)[0];
  }

  give(light) {
    if (!light) return;
    light.intensity = 0;
    light.position.set(0, -50, 0);
    this.free.push(light);
  }
}

// kind: match | candle | diya
const KINDS = {
  match: { size: 0.011, intensity: 3.4, color: 0xffa24c, glow: 0.09 },
  candle: { size: 0.014, intensity: 7, color: 0xffa858, glow: 0.12 },
  diya: { size: 0.02, intensity: 14, color: 0xffb060, glow: 0.2 },
};

export class Flame {
  constructor({ kind = "match", radius, burn, pool, parent, shadow = false }) {
    this.kind = kind;
    this.spec = KINDS[kind];
    this.maxRadius = radius;
    this.radius = radius;
    this.total = burn;
    this.left = burn;
    this.lit = true;
    this.age = 0;
    this.lean = new THREE.Vector2(); // toward Kaal
    this.seed = Math.random() * 100;
    this.pool = pool;
    this.light = pool.take(shadow);
    if (this.light) this.light.color.set(this.spec.color);

    this.object = new THREE.Group();
    this.core = new THREE.Mesh(
      flameGeo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, fog: false, depthWrite: false }),
    );
    // HDR-bright, so the flame burns white-gold through the tone mapping.
    this.core.material.color.setRGB(7, 3.6, 1.3);
    this.core.scale.setScalar(this.spec.size);
    this.object.add(this.core);
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }),
    );
    this.glow.material.color.setRGB(2.4, 1.3, 0.55);
    this.glow.scale.setScalar(this.spec.glow);
    this.glow.position.y = this.spec.size;
    this.object.add(this.glow);
    parent.add(this.object);
    this.world = new THREE.Vector3();
    // Where the light sits relative to the flame (world space). The match
    // pushes its light forward, off your fingers, so the hand isn't blown out.
    this.lightOffset = new THREE.Vector3();
  }

  // Fraction of fuel left.
  get fuel() {
    return Math.max(0, this.left / this.total);
  }

  update(dt, rate = 1) {
    if (!this.lit) return;
    this.age += dt;
    this.left -= dt * rate;
    const t = this.age + this.seed;
    const flicker = 0.82 + Math.sin(t * 23) * 0.06 + Math.sin(t * 37.3) * 0.05 + (Math.random() - 0.5) * 0.1;
    // A strike flares bright for a moment, then settles.
    const flare = this.kind === "match" ? 1 + Math.max(0, 1 - this.age / 0.35) * 1.6 : 1;
    // The last stretch of fuel: gutters and shrinks.
    const end = Math.min(1, this.left / (this.kind === "match" ? 1.6 : 4));
    const life = Math.max(0, end);
    this.radius = this.maxRadius * (0.55 + 0.45 * life) * (0.97 + flicker * 0.04);
    const s = this.spec.size * (0.6 + 0.4 * life) * flare * (0.9 + flicker * 0.15);
    this.core.scale.set(s * 0.8, s, s * 0.8);
    this.core.rotation.z = this.lean.x * 0.5 + Math.sin(t * 9) * 0.06;
    this.core.rotation.x = this.lean.y * 0.5;
    this.glow.scale.setScalar(this.spec.glow * (0.7 + 0.3 * life) * flare * flicker);
    this.object.getWorldPosition(this.world);
    if (this.light) {
      this.light.position.copy(this.world).add(this.lightOffset);
      this.light.position.y += this.spec.size * 1.5;
      this.light.intensity = this.spec.intensity * flicker * flare * (0.35 + 0.65 * life);
    }
    if (this.left <= 0) this.out();
  }

  // The era-light entry for this flame.
  eraLight() {
    if (!this.lit) return null;
    return { x: this.world.x, y: this.world.y, z: this.world.z, radius: this.radius };
  }

  out() {
    if (!this.lit) return;
    this.lit = false;
    this.pool.give(this.light);
    this.light = null;
    this.object.visible = false;
  }

  dispose() {
    this.out();
    this.object.parent?.remove(this.object);
  }
}
