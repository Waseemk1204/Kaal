// Moonlight falling through the holes in the roof and the dining-room jaali:
// soft volumes of cold light with dust turning in them. Where 1987 is lit
// back in, the ceiling is whole again and the shafts burn away with it.

import * as THREE from "three";
import { ERA, ERA_GLSL } from "./era-material.js";

const MATERIAL = new THREE.ShaderMaterial({
  uniforms: {
    uEraLights: ERA.lights,
    uEraForce: ERA.force,
    uEraTime: ERA.time,
    uEraSoft: ERA.soft,
    uStrength: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vEraPos;
    varying vec2 vEraUv;
    void main() {
      vUv = uv;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vEraPos = w.xyz;
      vEraUv = uv;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragmentShader: /* glsl */ `
    ${ERA_GLSL}
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      // Brightest at the opening, fading as it falls; soft at its sides.
      float along = vUv.y;
      float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
      float fall = pow(1.0 - along, 1.2) * 0.8 + 0.2;
      float motes = eraNoise(vEraPos * 9.0 + vec3(0.0, -uEraTime * 0.05, uEraTime * 0.03));
      float a = edge * fall * (0.7 + 0.6 * motes) * 0.045 * uStrength;
      a *= 1.0 - eraMask(vEraPos); // gone where it's 1987
      gl_FragColor = vec4(vec3(0.62, 0.72, 0.95) * a, 1.0);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
});

// A prism from an opening (4 corners, in order) along a direction.
function prism(corners, dir, length) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i < 4; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const a2 = a.clone().addScaledVector(dir, length);
    const b2 = b.clone().addScaledVector(dir, length);
    const k = pos.length / 3;
    for (const [p, u, v] of [
      [a, 0, 0],
      [b, 1, 0],
      [b2, 1, 1],
      [a2, 0, 1],
    ]) {
      pos.push(p.x, p.y, p.z);
      uv.push(u, v);
    }
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export class Shafts {
  constructor(scene, house, moonDir) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const dir = moonDir.clone().normalize(); // the way the light travels
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const roof = (h, y = 3.2) => [V(h.x1, y, h.z1), V(h.x2, y, h.z1), V(h.x2, y, h.z2), V(h.x1, y, h.z2)];
    for (const hole of [house.diningHole, house.dadiHole]) {
      // Long enough to reach the floor.
      this.group.add(new THREE.Mesh(prism(roof(hole), dir, 3.4 / -dir.y), MATERIAL));
    }
    // Through the dining jaali (south wall), slanting in across the floor.
    const j = [V(-2.5, 2.0, 2.45), V(-1.5, 2.0, 2.45), V(-1.5, 0.9, 2.45), V(-2.5, 0.9, 2.45)];
    this.group.add(new THREE.Mesh(prism(j, dir, 2.1 / -dir.y), MATERIAL));
    for (const m of this.group.children) {
      m.frustumCulled = false;
      m.renderOrder = 5;
    }
  }

  set strength(v) {
    MATERIAL.uniforms.uStrength.value = v;
  }
}
