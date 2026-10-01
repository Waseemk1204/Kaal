// The small things you pick up. Each has a model for the world and one for
// your hand. Things from 1987 (bangles, spectacles, the fresh matchbox) age
// in your hand in the dark: `setAge(0..1)` drains the colour and cracks them.

import * as THREE from "three";
import { eraMaterial } from "./era-material.js";
import { canvasTexture } from "./textures.js";

function std(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, transparent: !!o.opacity, opacity: o.opacity ?? 1 });
}

function mesh(g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  return o;
}

let paperTex = null;
function paper() {
  if (paperTex) return paperTex;
  paperTex = canvasTexture(
    128,
    160,
    (ctx, w, h) => {
      ctx.fillStyle = "#cbbf9f";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(40,30,20,0.55)";
      ctx.lineWidth = 1.2;
      for (let y = 20; y < h - 14; y += 9) {
        ctx.beginPath();
        ctx.moveTo(12, y);
        let x = 12;
        while (x < w - 14) {
          x += 4 + Math.random() * 7;
          ctx.lineTo(x, y + (Math.random() - 0.5) * 2);
        }
        ctx.stroke();
      }
    },
    { repeat: false },
  );
  return paperTex;
}

const BUILDERS = {
  bangles() {
    const g = new THREE.Group();
    const m = std(0xb01818, { r: 0.15, m: 0.1 });
    for (let i = 0; i < 4; i += 1) g.add(mesh(new THREE.TorusGeometry(0.035, 0.0045, 8, 24), m, (i - 1.5) * 0.004, 0.004 + i * 0.006, 0, Math.PI / 2 + (i % 2) * 0.1, 0, i * 0.2));
    g.userData.mats = [m];
    return g;
  },
  spectacles() {
    const g = new THREE.Group();
    const m = std(0x8a6a2a, { r: 0.4, m: 0.7 });
    const lens = std(0xd8e4e8, { r: 0.05, opacity: 0.35 });
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 18), m, s * 0.028, 0.006, 0, Math.PI / 2));
      g.add(mesh(new THREE.CircleGeometry(0.021, 18), lens, s * 0.028, 0.006, 0, -Math.PI / 2));
      g.add(mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.1, 4), m, s * 0.05, 0.006, 0.05, Math.PI / 2));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.014, 4), m, 0, 0.008, 0, 0, 0, Math.PI / 2));
    g.userData.mats = [m, lens];
    return g;
  },
  tabMatches() {
    const g = new THREE.Group();
    const m = std(0xd8b830, { r: 0.7 });
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.016, 0.036), m, 0, 0.008, 0));
    g.add(mesh(new THREE.BoxGeometry(0.051, 0.017, 0.006), std(0x5a2a1a, { r: 1 }), 0, 0.008, 0.016));
    g.userData.mats = [m];
    return g;
  },
  abMatches() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.016, 0.036), std(0x6a5a3a, { r: 1 }), 0, 0.008, 0));
    return g;
  },
  candles() {
    const g = new THREE.Group();
    const m = std(0xe8dfc6, { r: 0.6 });
    for (let i = 0; i < 2; i += 1) g.add(mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.08, 10), m, i * 0.05 - 0.025, 0.04, 0, 0, 0, Math.PI / 2 - 0.1 + i * 0.2));
    return g;
  },
  candle() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.09, 10), std(0xe8dfc6, { r: 0.6 }), 0, 0.045, 0));
    return g;
  },
  thali() {
    // Dadi's pooja thali: a brass plate with a little oil bottle and her
    // box of cotton wicks.
    const g = new THREE.Group();
    const brass = std(0x7a6a3a, { r: 0.6, m: 0.6 });
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.012, 24), brass, 0, 0.006, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.09, 10), std(0x6a5a2a, { r: 0.2, opacity: 0.85 }), -0.05, 0.055, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), std(0x3a2a1a), -0.05, 0.11, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 14), std(0x9a9890, { m: 0.6, r: 0.4 }), 0.05, 0.027, 0.02));
    return g;
  },
  watch() {
    // Papa's HMT: steel case, white dial, black strap.
    const g = new THREE.Group();
    const steel = std(0xc8ccd0, { r: 0.25, m: 0.9 });
    g.add(mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.008, 22), steel, 0, 0.004, 0));
    const dial = canvasTexture(
      64,
      64,
      (ctx, w) => {
        ctx.fillStyle = "#f2efe6";
        ctx.fillRect(0, 0, w, w);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(32, 32);
        ctx.lineTo(32 + Math.cos(((9 + 47 / 60) / 12) * Math.PI * 2 - Math.PI / 2) * 13, 32 + Math.sin(((9 + 47 / 60) / 12) * Math.PI * 2 - Math.PI / 2) * 13);
        ctx.moveTo(32, 32);
        ctx.lineTo(32 + Math.cos((47 / 60) * Math.PI * 2 - Math.PI / 2) * 20, 32 + Math.sin((47 / 60) * Math.PI * 2 - Math.PI / 2) * 20);
        ctx.stroke();
      },
      { repeat: false },
    );
    g.add(mesh(new THREE.CircleGeometry(0.016, 22), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.3 }), 0, 0.0085, 0, -Math.PI / 2));
    const strap = std(0x1a1410, { r: 0.8 });
    g.add(mesh(new THREE.BoxGeometry(0.018, 0.004, 0.06), strap, 0, 0.002, 0.045));
    g.add(mesh(new THREE.BoxGeometry(0.018, 0.004, 0.06), strap, 0, 0.002, -0.045));
    return g;
  },
  page() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.PlaneGeometry(0.15, 0.2), new THREE.MeshStandardMaterial({ map: paper(), roughness: 1, side: THREE.DoubleSide }), 0, 0.002, 0, -Math.PI / 2));
    return g;
  },
};

export function itemModel(kind) {
  const g = BUILDERS[kind]();
  g.userData.kind = kind;
  g.userData.base = (g.userData.mats || []).map((m) => m.color.clone());
  return g;
}

// For things that should only exist in one time: wrap a model's materials
// with era materials (mode "tab" or "ab").
export function eraOnly(model, mode) {
  model.traverse((m) => {
    if (!m.isMesh) return;
    const src = m.material;
    m.material = eraMaterial({ mode, color: src.color, map: src.map, roughness: src.roughness, metalness: src.metalness });
  });
  return model;
}

// Ageing: colour drains toward grey-brown, a little darker. 0 fresh, 1 gone.
const OLD = new THREE.Color(0x4a443a);
export function setAge(model, age) {
  const mats = model.userData.mats || [];
  mats.forEach((m, i) => m.color.copy(model.userData.base[i]).lerp(OLD, Math.min(1, age * 0.9)));
  model.rotation.z = age > 0.85 ? (Math.random() - 0.5) * 0.08 : 0; // it shakes apart
}
