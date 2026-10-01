// Kaal's body. No face, no mouth, no eyes: a smooth egg of a head on a neck
// slightly too long, a torso too narrow, arms that hang past its knees and
// fingers a hand-span long with one joint too many. Pure black that gives
// nothing back to the light, burning faintly at its edges, shedding ash.
//
// Built from tapered segments in a joint hierarchy so motion.js can pose it.
// Every limb hangs along -y from its joint.

import * as THREE from "three";
import { KAAL } from "../../shared/rules.js";

// Black that doesn't take light or fog: a hole in the picture.
export const VOID = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });

// The fringe: an inverted shell a little proud of the skin that darkens
// whatever is behind its edges, softly, like smoke that eats light. It
// drifts upward; when Kaal is held, it stops.
export const FRINGE = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uHeld: { value: 0 }, uStrength: { value: 1 } },
  vertexShader: /* glsl */ `
    varying vec3 vN;
    varying vec3 vV;
    varying vec3 vW;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime, uHeld, uStrength;
    varying vec3 vN;
    varying vec3 vV;
    varying vec3 vW;
    float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    float n3(vec3 p) {
      vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    void main() {
      float edge = 1.0 - abs(dot(normalize(vN), normalize(vV)));
      edge = pow(edge, 3.0);
      // Time stops when it's held: the embers freeze where they are.
      float t = uTime * (1.0 - uHeld);
      float n = n3(vW * 14.0 + vec3(0.0, -t * 1.6, 0.0)) * n3(vW * 31.0 - vec3(0.0, t * 2.3, 0.0));
      float smoke = edge * (0.45 + 0.55 * smoothstep(0.05, 0.5, n));
      gl_FragColor = vec4(0.0, 0.0, 0.0, smoke * 0.9 * uStrength);
    }
  `,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
  fog: false,
});

// A tapered segment hanging along -y from its joint, with its own fringe.
function segment(len, r1, r2, { radial = 10 } = {}) {
  const joint = new THREE.Group();
  const geo = new THREE.CylinderGeometry(r1, r2, len, radial, 3);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, VOID);
  mesh.castShadow = true;
  joint.add(mesh);
  const shell = new THREE.Mesh(geo, FRINGE);
  shell.scale.set(1.35, 1.02, 1.35);
  joint.add(shell);
  // A knob at the joint, so bends read as knuckles and knees.
  const knob = new THREE.Mesh(new THREE.SphereGeometry(r1 * 1.08, 10, 8), VOID);
  knob.castShadow = true;
  joint.add(knob);
  joint.userData.len = len;
  return joint;
}

function child(parent, seg) {
  seg.position.y = -parent.userData.len;
  parent.add(seg);
  return seg;
}

export function buildKaal() {
  const root = new THREE.Group();
  root.name = "kaal";
  const H = KAAL.height;
  const hipY = H * 0.52; // ~1.45 m

  const hips = new THREE.Group();
  hips.position.y = hipY;
  root.add(hips);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), VOID);
  pelvis.scale.set(1.3, 0.8, 0.8);
  hips.add(pelvis);

  // Spine: three segments going up (built hanging, then flipped).
  const spine = [];
  let parent = hips;
  const spineLens = [0.3, 0.3, 0.32];
  const spineR = [
    [0.075, 0.07],
    [0.07, 0.085],
    [0.085, 0.1],
  ];
  for (let i = 0; i < 3; i += 1) {
    const s = segment(spineLens[i], spineR[i][1], spineR[i][0]);
    // The first segment flips to point up; the rest follow it. In this
    // flipped frame -y is up and +z is its front.
    if (i === 0) s.rotation.x = Math.PI;
    else s.position.y = -spineLens[i - 1];
    parent.add(s);
    spine.push(s);
    parent = s;
  }
  const chest = spine[2];
  // A narrow ribcage, ribs pressing through the silhouette.
  const ribs = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), VOID);
  ribs.scale.set(1.05, 1.35, 0.6);
  ribs.position.y = -0.18;
  ribs.castShadow = true;
  chest.add(ribs);
  for (let i = 0; i < 5; i += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.135 - i * 0.008, 0.008, 4, 18, Math.PI * 1.1), VOID);
    rib.rotation.set(Math.PI / 2, 0, -Math.PI * 0.05);
    rib.position.set(0, -0.06 - i * 0.055, 0.0);
    rib.scale.set(1.1, 0.62, 1);
    chest.add(rib);
  }
  // Shoulder blades and spine knobs on the back (+z is its back).
  for (const side of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), VOID);
    blade.scale.set(1, 1.4, 0.35);
    blade.position.set(side * 0.07, -0.12, -0.085);
    blade.rotation.z = side * 0.3;
    chest.add(blade);
  }
  for (const s of spine) {
    for (let k = 0; k < 3; k += 1) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), VOID);
      knob.position.set(0, -s.userData.len * (k / 3 + 0.15), -0.07);
      s.add(knob);
    }
  }

  // Neck and the head: a smooth egg, slightly too small, tipped forward.
  const neck = segment(0.3, 0.032, 0.038, { radial: 8 });
  neck.position.y = -chest.userData.len;
  chest.add(neck);
  const headPivot = new THREE.Group();
  headPivot.position.y = -neck.userData.len;
  neck.add(headPivot);
  const headGeo = new THREE.SphereGeometry(0.1, 20, 16);
  // Egg: narrower at the chin, longer at the back of the skull.
  const pos = headGeo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const t = (y + 0.1) / 0.2; // 0 chin … 1 crown
    const narrow = 0.72 + 0.28 * Math.sin(t * Math.PI * 0.85);
    y = y * 1.45;
    z = z * 1.1 + (t - 0.5) * 0.03;
    pos.setXYZ(i, x * narrow, y, z * narrow);
  }
  headGeo.computeVertexNormals();
  headGeo.rotateX(Math.PI); // chin toward local +y, which is down here
  headGeo.translate(0, -0.13, 0); // pivot at the base of the skull
  const head = new THREE.Mesh(headGeo, VOID);
  head.castShadow = true;
  headPivot.add(head);
  const headShell = new THREE.Mesh(headGeo, FRINGE);
  headShell.scale.setScalar(1.18);
  headPivot.add(headShell);

  // Arms: far too long. Fingers: four segments each (one too many).
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.17, -chest.userData.len + 0.05, 0.01);
    chest.add(shoulder);
    // The chest segment is flipped (pointing up), so undo that for arms.
    const armRoot = new THREE.Group();
    armRoot.rotation.x = Math.PI; // back to hanging, +z behind
    shoulder.add(armRoot);
    const upper = segment(0.64, 0.04, 0.03);
    armRoot.add(upper);
    const fore = child(upper, segment(0.66, 0.032, 0.022));
    const hand = child(fore, segment(0.12, 0.024, 0.03, { radial: 8 }));
    hand.children[0].scale.set(1, 1, 0.45);
    const fingers = [];
    for (let f = 0; f < 5; f += 1) {
      const thumb = f === 4;
      const base = new THREE.Group();
      base.position.set(thumb ? side * -0.03 : (f - 1.5) * 0.014 * -side, -0.11, thumb ? 0.01 : 0);
      if (thumb) base.position.y = -0.05;
      hand.add(base);
      let p = base;
      const segs = [];
      const n = thumb ? 3 : 4;
      const L = thumb ? 0.045 : 0.06 + (f === 1 || f === 2 ? 0.012 : 0);
      for (let k = 0; k < n; k += 1) {
        const seg = segment(L * (1 - k * 0.1), 0.0085 - k * 0.0012, 0.007 - k * 0.0012, { radial: 6 });
        if (k > 0) seg.position.y = -p.userData.len;
        p.add(seg);
        segs.push(seg);
        p = seg;
      }
      fingers.push(segs);
    }
    arms.push({ side, shoulder, armRoot, upper, fore, hand, fingers });
  }

  // Legs.
  const legs = [];
  for (const side of [-1, 1]) {
    const thigh = segment(0.74, 0.055, 0.035);
    thigh.position.set(side * 0.09, 0, 0);
    hips.add(thigh);
    const shin = child(thigh, segment(0.72, 0.038, 0.022));
    const foot = child(shin, segment(0.26, 0.022, 0.012, { radial: 6 }));
    foot.rotation.x = Math.PI / 2 - 0.15; // long, pointed, forward
    legs.push({ side, thigh, shin, foot });
  }

  root.userData = { hips, spine, chest, neck, headPivot, head, arms, legs, hipY };
  return root;
}

// Ash: grey flakes and the odd ember lifting off its shoulders and head.
export class Ash {
  constructor(scene, count = 110) {
    this.count = count;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.col = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) this.life[i] = -Math.random() * 3;
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.014, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true, fog: false }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.tmp = new THREE.Vector3();
  }

  // sources: world positions to shed from. held: freeze everything.
  update(dt, sources, held, visible = true) {
    this.points.visible = visible;
    if (held || !visible) return;
    for (let i = 0; i < this.count; i += 1) {
      const k = i * 3;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const s = sources[Math.floor(Math.random() * sources.length)];
        this.pos[k] = s.x + (Math.random() - 0.5) * 0.25;
        this.pos[k + 1] = s.y + (Math.random() - 0.5) * 0.25;
        this.pos[k + 2] = s.z + (Math.random() - 0.5) * 0.25;
        this.vel[k] = (Math.random() - 0.5) * 0.05;
        this.vel[k + 1] = 0.08 + Math.random() * 0.15;
        this.vel[k + 2] = (Math.random() - 0.5) * 0.05;
        this.life[i] = 1.5 + Math.random() * 2.5;
        const ember = Math.random() < 0.04;
        const g = 0.012 + Math.random() * 0.025; // near-black flakes
        this.col[k] = ember ? 0.9 : g;
        this.col[k + 1] = ember ? 0.18 : g;
        this.col[k + 2] = ember ? 0.06 : g * 0.95;
      }
      this.vel[k] += Math.sin(this.life[i] * 3 + i) * 0.02 * dt;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      // Embers die first.
      if (this.col[k] > 1) {
        this.col[k] *= 1 - dt * 0.8;
        this.col[k + 1] *= 1 - dt * 0.8;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
