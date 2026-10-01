// The things in the house, both as they were and as they are.
//
// Every prop is built from primitives with era materials: "both" surfaces
// change in the light, "tab" pieces only exist in 1987 (food, the upright TV,
// the calendar), "ab" pieces only exist now (rot, roots, rust, clocks).

import * as THREE from "three";
import { eraMaterial } from "./era-material.js";
import { MAT } from "./house.js";
import { TEX, canvasTexture, rand } from "./textures.js";
import { SPOTS, FURNITURE } from "../../shared/house-map.js";

// ------------------------------------------------------------- materials
const both = (tab, ab, o = {}) => eraMaterial({ color: tab, roughness: o.r ?? 0.7, metalness: o.m ?? 0, ab: { color: ab, roughness: o.ar ?? 0.95 }, ...(o.map ? { map: o.map } : {}) });
const tabOnly = (c, o = {}) => eraMaterial({ mode: "tab", color: c, roughness: o.r ?? 0.7, metalness: o.m ?? 0, ...(o.map ? { map: o.map } : {}), ...(o.emissive ? { emissive: o.emissive, emissiveIntensity: o.ei ?? 1 } : {}) });
const abOnly = (c, o = {}) => eraMaterial({ mode: "ab", color: c, roughness: o.r ?? 0.95, metalness: o.m ?? 0, ...(o.map ? { map: o.map } : {}) });

let P = null;
function palette() {
  if (P) return P;
  P = {
    brass: both(0xc8962e, 0x4e4a2a, { r: 0.35, m: 0.8, ar: 0.9 }),
    stone: both(0x5b5f5a, 0x3a3c38, { r: 0.4 }),
    cloth: both(0xd9cfb4, 0x4b463c),
    sheet: both(0xe8e0cc, 0x3f3c33),
    rope: both(0xb89a68, 0x3b3426),
    tinTrunk: both(0x2d5a7a, 0x3a3a34, { r: 0.5, m: 0.5 }),
    tvBody: tabOnly(0x5a3a1e, { r: 0.4 }),
    tvScreen: tabOnly(0x1a2228, { r: 0.15, emissive: 0x0b1416, ei: 1 }),
    plastic: both(0xe6dccb, 0x5a564c),
    rajma: tabOnly(0x5a1a10, { r: 0.4 }),
    rice: tabOnly(0xf0ead8, { r: 0.8 }),
    roti: tabOnly(0xc89a5a, { r: 0.9 }),
    dal: tabOnly(0xd8a030, { r: 0.4 }),
    dust: abOnly(0x5a5650),
    mould: abOnly(0x3a4a2a),
    bark: abOnly(0x8a7c6c, { map: barkTexture() }),
    clockFace: abOnly(0xffffff, { map: clockTexture(9, 47, "#e8dcc0"), r: 0.8 }),
    tulsi: tabOnly(0x2f6a2a),
    terracotta: tabOnly(0xa0522d),
    weeds: abOnly(0x24301c),
    paper: both(0xe2d6b8, 0x8a8068),
    redCloth: tabOnly(0x8a1e1e),
    wire: both(0x2a2a2a, 0x2a2420, { r: 0.6, m: 0.4 }),
    bulbTube: tabOnly(0xf4f4ee, { emissive: 0x000000 }),
    glass: tabOnly(0xbad0d8, { r: 0.1, m: 0.2 }),
  };
  return P;
}

function barkTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#3a322a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i += 1) {
      ctx.strokeStyle = `rgba(${15 + rand() * 25},${12 + rand() * 18},${10 + rand() * 12},0.8)`;
      ctx.lineWidth = 1 + rand() * 3;
      ctx.beginPath();
      const x = rand() * w;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (rand() - 0.5) * 30, h * 0.3, x + (rand() - 0.5) * 30, h * 0.7, x + (rand() - 0.5) * 20, h);
      ctx.stroke();
    }
  });
}

export function clockTexture(hour, minute, face = "#efe6cc") {
  return canvasTexture(
    256,
    256,
    (ctx, w) => {
      const c = w / 2;
      ctx.fillStyle = "#1a1612";
      ctx.fillRect(0, 0, w, w);
      ctx.fillStyle = face;
      ctx.beginPath();
      ctx.arc(c, c, c * 0.92, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a2018";
      ctx.font = "bold 26px Georgia";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 1; i <= 12; i += 1) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.fillText(String(i), c + Math.cos(a) * c * 0.72, c + Math.sin(a) * c * 0.72);
      }
      const hand = (angle, len, width) => {
        ctx.strokeStyle = "#151010";
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(c + Math.cos(angle) * len, c + Math.sin(angle) * len);
        ctx.stroke();
      };
      hand(((hour % 12) + minute / 60) / 12 * Math.PI * 2 - Math.PI / 2, c * 0.45, 8);
      hand((minute / 60) * Math.PI * 2 - Math.PI / 2, c * 0.68, 5);
      // Grime.
      for (let i = 0; i < 20; i += 1) {
        ctx.fillStyle = `rgba(60,50,30,${rand() * 0.25})`;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * w, 5 + rand() * 25, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    { repeat: false },
  );
}

// ---------------------------------------------------------------- helpers
const geoCache = {};
function geo(kind, ...args) {
  const key = kind + args.join(",");
  if (!geoCache[key]) {
    const G = { box: THREE.BoxGeometry, cyl: THREE.CylinderGeometry, sph: THREE.SphereGeometry, torus: THREE.TorusGeometry, cone: THREE.ConeGeometry }[kind];
    geoCache[key] = new G(...args);
  }
  return geoCache[key];
}

function add(parent, g, m, x, y, z, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shadow = true } = {}) {
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const box = (p, m, x, y, z, w, h, d, o) => add(p, geo("box", 1, 1, 1), m, x, y, z, { sx: w, sy: h, sz: d, ...o });

// A canvas photo of the family: four people, no faces. `present` says who's
// drawn solid; the rest are pale ghosts on the paper. `torn` tears you out.
export function drawPhoto(ctx, w, h, present, { torn = false } = {}) {
  ctx.fillStyle = "#cbbfa0";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, "rgba(255,240,210,0.2)");
  g.addColorStop(1, "rgba(60,40,20,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const people = [
    { id: "dadi", x: 0.2, hw: 0.075, top: 0.36, color: "#efe9da", hair: "#e8e8e8", seated: true },
    { id: "papa", x: 0.42, hw: 0.08, top: 0.18, color: "#f2f0ea", hair: "#1a1410" },
    { id: "mummy", x: 0.64, hw: 0.08, top: 0.22, color: "#7a1e22", hair: "#1a1410" },
    { id: "munna", x: 0.84, hw: 0.055, top: 0.46, color: "#4a6a8a", hair: "#1a1410" },
  ];
  for (const p of people) {
    const on = present[p.id];
    ctx.globalAlpha = on ? 1 : 0.12;
    const cx = p.x * w;
    const top = p.top * h;
    const head = p.hw * w * 0.5;
    // Body.
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(cx - p.hw * w, h);
    ctx.lineTo(cx - p.hw * w * 0.8, top + head * 2.6);
    ctx.quadraticCurveTo(cx, top + head * 2.1, cx + p.hw * w * 0.8, top + head * 2.6);
    ctx.lineTo(cx + p.hw * w, h);
    ctx.fill();
    // Head: a smooth oval, nothing on it.
    ctx.fillStyle = "#a07a5a";
    ctx.beginPath();
    ctx.ellipse(cx, top + head, head * 0.85, head * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.ellipse(cx, top + head * 0.55, head * 0.9, head * 0.65, 0, Math.PI, 0);
    ctx.fill();
    if (p.id === "dadi") {
      ctx.fillStyle = "#e8e8e8";
      ctx.beginPath();
      ctx.arc(cx, top + head * 0.1, head * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (torn) {
    // Where you stood, the paper has rotted through.
    ctx.fillStyle = "#1a140e";
    ctx.beginPath();
    let a = 0;
    ctx.moveTo(w * 0.84 + Math.cos(0) * w * 0.09, h * 0.62);
    while (a < Math.PI * 2) {
      const r = w * (0.07 + rand() * 0.04);
      ctx.lineTo(w * 0.84 + Math.cos(a) * r, h * 0.62 + Math.sin(a) * r * 1.6);
      a += 0.4;
    }
    ctx.fill();
  }
  // Foxing and a crease.
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(110,80,40,${rand() * 0.2})`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, 1 + rand() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(w * 0.55, 0);
  ctx.lineTo(w * 0.5, h);
  ctx.stroke();
}

// ------------------------------------------------------------------ props
export class Props {
  constructor(scene) {
    palette();
    this.group = new THREE.Group();
    this.group.name = "props";
    scene.add(this.group);
    this.anim = []; // things that move (the fan in 1987)
    this.dining();
    this.kitchen();
    this.dadi();
    this.courtyard();
    this.cobwebs();
  }

  // Webs in the corners, on the fan, on the backs of chairs. Only now.
  cobwebs() {
    const tex = canvasTexture(
      256,
      256,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(220,220,215,0.55)";
        ctx.lineWidth = 1;
        // Spokes from the corner.
        const spokes = 9;
        for (let i = 0; i <= spokes; i += 1) {
          const a = (i / spokes) * (Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * w * (0.85 + rand() * 0.15), Math.sin(a) * h * (0.85 + rand() * 0.15));
          ctx.stroke();
        }
        // Sagging threads between them.
        for (let r = 20; r < w; r += 14 + rand() * 10) {
          ctx.globalAlpha = 0.35 + rand() * 0.4;
          ctx.beginPath();
          for (let i = 0; i <= spokes; i += 1) {
            const a = (i / spokes) * (Math.PI / 2);
            const rr = r * (0.95 + rand() * 0.1);
            const x = Math.cos(a) * rr;
            const y = Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.quadraticCurveTo(Math.cos(a - 0.08) * rr * 0.93, Math.sin(a - 0.08) * rr * 0.93, x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
      { repeat: false },
    );
    const web = eraMaterial({ mode: "ab", map: tex, transparent: true, alphaTest: 0.08, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
    const corner = (x, y, z, ry, size = 0.7, rx = 0) => {
      const m = add(this.group, new THREE.PlaneGeometry(size, size).translate(size / 2, -size / 2, 0), web, x, y, z, { ry, rx, shadow: false });
      m.renderOrder = 4;
    };
    // Ceiling corners: a web across each, tilted.
    const corners = [
      [-2.95, 3.15, -2.45, Math.PI / 4], [2.95, 3.15, -2.45, -Math.PI / 4], [-2.95, 3.15, 2.45, (Math.PI * 3) / 4], [2.95, 3.15, 2.45, (-Math.PI * 3) / 4],
      [3.05, 3.15, -2.45, Math.PI / 4], [6.95, 3.15, -2.45, -Math.PI / 4], [6.95, 3.15, 1.45, (-Math.PI * 3) / 4],
      [-7.45, 3.15, 1.45, (Math.PI * 3) / 4], [-3.05, 3.15, 1.45, (-Math.PI * 3) / 4], [-3.05, 3.15, -2.45, -Math.PI / 4],
    ];
    for (const [x, y, z, ry] of corners) corner(x, y, z, ry, 0.6 + rand() * 0.5, -0.5);
    // Doorway tops.
    corner(2.92, 2.1, -0.5, -Math.PI / 2, 0.45);
    corner(-2.92, 2.1, 0.5, Math.PI / 2, 0.45);
    // On the fan and the chair backs.
    corner(0.1, 2.85, 0.6, 0.3, 0.5, Math.PI / 2);
    corner(0.45, 1.05, -1.25, Math.PI, 0.35);
    corner(-0.45, 1.05, 1.25, 0, 0.35);
  }

  // --------------------------------------------------------------- dining
  dining() {
    const g = this.group;
    const wood = MAT.wood;
    // Table.
    box(g, wood, 0, 0.74, 0, 1.9, 0.05, 1.0);
    for (const [x, z] of [[-0.88, -0.44], [0.88, -0.44], [-0.88, 0.44], [0.88, 0.44]]) box(g, wood, x, 0.36, z, 0.06, 0.72, 0.06);
    // A cloth runner in 1987, a stained rag now.
    box(g, P.cloth, 0, 0.768, 0, 1.6, 0.004, 0.5, { shadow: false });

    // Chairs: Munna and Mummy on the south side, Papa and Dadi on the north.
    this.chairs = {};
    for (const [id, seat] of Object.entries(SPOTS.seat)) {
      const facing = seat.z > 0 ? 0 : Math.PI; // backrest away from the table
      const c = new THREE.Group();
      c.position.set(seat.x, 0, seat.z * 1.05);
      c.rotation.y = facing;
      box(c, wood, 0, 0.46, 0, 0.44, 0.04, 0.42);
      for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) box(c, wood, x, 0.23, z, 0.04, 0.46, 0.04);
      box(c, wood, 0, 0.78, 0.2, 0.44, 0.6, 0.035);
      for (const x of [-0.12, 0, 0.12]) box(c, wood, x, 0.65, 0.2, 0.03, 0.36, 0.03);
      // Dadi's chair has fallen over, now.
      if (id === "dadi") {
        c.userData.fallen = true;
        c.traverse((m) => m.isMesh && (m.material = MAT.woodTab));
        const fallen = c.clone();
        fallen.traverse((m) => m.isMesh && (m.material = eraMaterial({ mode: "ab", map: TEX.woodAb, roughness: 0.95 })));
        fallen.position.set(seat.x - 0.4, 0.22, seat.z * 1.05 - 0.45);
        fallen.rotation.set(-Math.PI / 2, 0.4, 0);
        g.add(fallen);
      }
      g.add(c);
      this.chairs[id] = c;
    }

    // Plates: steel thalis, food in 1987, dust and mould now.
    this.plates = {};
    for (const [id, p] of Object.entries(SPOTS.plate)) {
      const plate = new THREE.Group();
      plate.position.set(p.x, 0.772, p.z);
      add(plate, geo("cyl", 0.15, 0.13, 0.018, 28), MAT.steel, 0, 0.009, 0);
      // Katoris (small bowls) with rajma and dal.
      for (const [dx, dz, food] of [[-0.06, -0.05, P.rajma], [0.05, -0.07, P.dal]]) {
        add(plate, geo("cyl", 0.04, 0.03, 0.03, 16), MAT.steel, dx, 0.033, dz);
        add(plate, geo("cyl", 0.036, 0.036, 0.004, 16), food, dx, 0.046, dz, { shadow: false });
      }
      add(plate, geo("sph", 0.055, 12, 8), P.rice, 0.02, 0.02, 0.05, { sy: 0.4, shadow: false });
      add(plate, geo("cyl", 0.07, 0.07, 0.006, 20), P.roti, -0.06, 0.024, 0.06, { rz: 0.05, shadow: false });
      add(plate, geo("cyl", 0.12, 0.12, 0.003, 20), P.dust, 0, 0.02, 0, { shadow: false });
      add(plate, geo("sph", 0.03, 8, 6), P.mould, -0.05, 0.03, -0.04, { sy: 0.4, shadow: false });
      // A steel glass.
      add(plate, geo("cyl", 0.032, 0.026, 0.1, 14), MAT.steel, 0.17, 0.05, -0.08);
      g.add(plate);
      this.plates[id] = plate;
    }

    // The family diya at the centre of the table: a brass lamp on a stand.
    const diya = new THREE.Group();
    diya.position.set(SPOTS.diya.x, 0.772, SPOTS.diya.z);
    add(diya, geo("cyl", 0.05, 0.07, 0.02, 20), P.brass, 0, 0.01, 0);
    add(diya, geo("cyl", 0.012, 0.018, 0.14, 10), P.brass, 0, 0.09, 0);
    const bowl = new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(0.06, 0.005), new THREE.Vector2(0.075, 0.03), new THREE.Vector2(0.07, 0.035)], 24);
    add(diya, bowl, P.brass, 0, 0.16, 0);
    // Its spout, pointing at Munna's chair.
    add(diya, geo("cone", 0.015, 0.05, 8), P.brass, 0, 0.185, 0.07, { rx: Math.PI / 2 + 0.3 });
    this.diya = diya;
    this.diyaWick = new THREE.Object3D();
    this.diyaWick.position.set(0, 0.215, 0.085);
    diya.add(this.diyaWick);
    // Its oil and wick appear as you pour and set them.
    this.diyaOil = add(diya, geo("cyl", 0.064, 0.064, 0.004, 20), tabOnly(0xc89a30, { r: 0.1 }), 0, 0.188, 0, { shadow: false });
    this.diyaOil.material = eraMaterial({ color: 0xb08a2a, roughness: 0.1, metalness: 0.2 });
    this.diyaOil.visible = false;
    this.diyaWickMesh = add(diya, geo("cyl", 0.004, 0.005, 0.06, 6), P.cloth, 0, 0.2, 0.06, { rx: 1.0, shadow: false });
    this.diyaWickMesh.visible = false;
    g.add(diya);

    // Sideboard, photo, clock.
    const sb = FURNITURE.find((f) => f.id === "sideboard");
    box(g, wood, (sb.x1 + sb.x2) / 2, sb.h / 2, (sb.z1 + sb.z2) / 2, sb.x2 - sb.x1, sb.h, sb.z2 - sb.z1);
    for (const x of [-0.42, 0.42]) box(g, P.brass, x, 0.62, sb.z2 + 0.005, 0.08, 0.015, 0.01);
    this.drawer = box(g, wood, 0.42, 0.62, sb.z2 + 0.004, 0.72, 0.16, 0.01);
    // The family photo above it.
    this.photoCanvas = document.createElement("canvas");
    this.photoCanvas.width = 512;
    this.photoCanvas.height = 360;
    this.photoTex = new THREE.CanvasTexture(this.photoCanvas);
    this.photoTex.colorSpace = THREE.SRGBColorSpace;
    this.setPhoto({ dadi: false, papa: false, mummy: false, munna: true });
    const ph = SPOTS.photo;
    box(g, wood, ph.x, ph.y, ph.z, 0.66, 0.5, 0.03);
    add(g, new THREE.PlaneGeometry(0.58, 0.41), eraMaterial({ map: this.photoTex, roughness: 0.6, ab: { map: this.photoTex, color: 0x9a9080 } }), ph.x, ph.y, ph.z + 0.017, { shadow: false });
    // The wall clock, stopped at 9:47.
    const wc = SPOTS.wallClock;
    box(g, wood, wc.x, wc.y, wc.z, 0.34, 0.34, 0.06);
    add(g, new THREE.CircleGeometry(0.14, 32), eraMaterial({ map: clockTexture(9, 47), roughness: 0.4, ab: { map: clockTexture(9, 47, "#8a8270") } }), wc.x, wc.y, wc.z + 0.032, { shadow: false });
    // Ticking pendulum box below it.
    box(g, wood, wc.x, wc.y - 0.3, wc.z, 0.16, 0.24, 0.05);

    // The TV: on its stand in 1987, face-down under roots and rubble now.
    const tv = FURNITURE.find((f) => f.id === "tv");
    const tvx = (tv.x1 + tv.x2) / 2;
    const tvz = (tv.z1 + tv.z2) / 2;
    box(g, wood, tvx, 0.36, tvz, 0.86, 0.72, 0.48); // the stand
    const set = new THREE.Group();
    set.position.set(tvx, 0.72, tvz);
    box(set, P.tvBody, 0, 0.23, 0, 0.62, 0.46, 0.44);
    box(set, P.tvScreen, -0.06, 0.24, -0.222, 0.42, 0.34, 0.01, { shadow: false });
    for (let i = 0; i < 3; i += 1) add(set, geo("cyl", 0.018, 0.018, 0.02, 10), P.plastic, 0.22, 0.34 - i * 0.07, -0.225, { rx: Math.PI / 2 });
    // Rabbit-ear antenna.
    for (const s of [-1, 1]) add(set, geo("cyl", 0.004, 0.004, 0.5, 4), P.wire, s * 0.1, 0.65, 0, { rz: s * 0.5 });
    g.add(set);
    const fallen = new THREE.Group();
    fallen.position.set(SPOTS.fallenTv.x, 0.2, SPOTS.fallenTv.z);
    fallen.rotation.set(Math.PI / 2 - 0.15, 0.6, 0);
    box(fallen, abOnly(0x2e261c), 0, 0, 0, 0.62, 0.46, 0.44);
    g.add(fallen);
    this.roots(g, [
      [[-2.9, 0.02, 0.3], [-1.5, 0.05, 0.9], [0.4, 0.04, 1.6], [1.6, 0.25, 1.4], [2.3, 0.05, 1.9]],
      [[-2.9, 0.4, -0.4], [-2.2, 0.03, -1.4], [-1.0, 0.02, -1.9]],
      [[1.2, 0.03, 2.2], [1.8, 0.35, 1.5], [2.4, 0.1, 1.0], [2.9, 0.6, 0.9]],
    ]);

    // The ceiling fan: turning in 1987, a bent, rusted thing now.
    const fan = new THREE.Group();
    fan.position.set(0.1, 2.85, 0.6);
    add(fan, geo("cyl", 0.012, 0.012, 0.35, 6), P.wire, 0, 0.17, 0);
    add(fan, geo("cyl", 0.09, 0.09, 0.08, 16), P.plastic, 0, 0, 0);
    this.fanBlades = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const blade = box(this.fanBlades, P.plastic, 0, 0, 0, 0.11, 0.008, 0.62, { shadow: false });
      blade.geometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
      blade.scale.set(0.11, 0.008, 0.62);
      blade.rotation.set(0.08, (i / 3) * Math.PI * 2, i === 1 ? 0.35 : 0);
    }
    fan.add(this.fanBlades);
    g.add(fan);
    this.fanSpeed = 0;

    // A tube light on the north wall.
    box(g, P.wire, -1.6, 2.12, -2.38, 1.22, 0.05, 0.05);
    this.tube = add(g, geo("cyl", 0.016, 0.016, 1.15, 10), eraMaterial({ mode: "tab", color: 0xf4f4ee, emissive: 0xdde8ff, emissiveIntensity: 0 }), -1.6, 2.09, -2.33, { rz: Math.PI / 2, shadow: false });

    // The demolition notice nailed inside the front door.
    const notice = canvasTexture(
      256,
      340,
      (ctx, w, h) => {
        ctx.fillStyle = "#d8d0b8";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#7a1010";
        ctx.font = "bold 26px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("NOTICE", w / 2, 44);
        ctx.fillStyle = "#1a1612";
        ctx.font = "15px Georgia";
        const lines = ["This structure has been", "declared DANGEROUS", "and unfit for habitation.", "", "It will be DEMOLISHED", "at 6:00 AM tomorrow.", "", "Occupants must vacate.", "", "— Municipal Corporation"];
        lines.forEach((l, i) => ctx.fillText(l, w / 2, 90 + i * 22));
        ctx.strokeStyle = "#7a1010";
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        for (let i = 0; i < 30; i += 1) {
          ctx.fillStyle = `rgba(90,70,30,${rand() * 0.25})`;
          ctx.beginPath();
          ctx.arc(rand() * w, rand() * h, 2 + rand() * 14, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      { repeat: false },
    );
    add(g, new THREE.PlaneGeometry(0.34, 0.45), abOnly(0xffffff, { map: notice }), 0.25, 1.55, 2.44, { ry: Math.PI, shadow: false });
  }

  // Twisting peepal roots along a list of control points.
  roots(parent, paths, radius = 0.05) {
    for (const pts of paths) {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const tube = new THREE.TubeGeometry(curve, 24, radius * (0.6 + rand() * 0.8), 7, false);
      add(parent, tube, P.bark, 0, 0, 0);
    }
  }

  // -------------------------------------------------------------- kitchen
  kitchen() {
    const g = this.group;
    for (const id of ["counter-w", "counter-e"]) {
      const f = FURNITURE.find((x) => x.id === id);
      box(g, MAT.brick, (f.x1 + f.x2) / 2, 0.42, (f.z1 + f.z2) / 2, f.x2 - f.x1, 0.84, f.z2 - f.z1);
      box(g, P.stone, (f.x1 + f.x2) / 2, 0.87, (f.z1 + f.z2) / 2 + 0.02, f.x2 - f.x1 + 0.04, 0.05, f.z2 - f.z1 + 0.06);
    }
    // Stove and pressure cooker on the far counter.
    add(g, geo("cyl", 0.16, 0.18, 0.08, 16), MAT.steel, 6.5, 0.94, -2.15);
    add(g, geo("cyl", 0.11, 0.11, 0.18, 18), MAT.steel, 6.5, 1.07, -2.15);
    add(g, geo("cyl", 0.02, 0.02, 0.05, 8), P.wire, 6.5, 1.19, -2.15);
    box(g, P.wire, 6.5 + 0.17, 1.12, -2.15, 0.16, 0.025, 0.03);
    // Steel utensils on a wall shelf above the near counter, in 1987.
    box(g, MAT.steel, 3.45, 1.55, -2.32, 0.6, 0.025, 0.2);
    for (let i = 0; i < 5; i += 1) add(g, geo("cyl", 0.05 + rand() * 0.03, 0.045, 0.08 + rand() * 0.06, 14), MAT.steel, 3.22 + i * 0.12, 1.62, -2.3);
    // The east shelf where Mummy left her bangles.
    const sh = FURNITURE.find((x) => x.id === "shelf-e");
    box(g, MAT.wood, (sh.x1 + sh.x2) / 2, 0.98, (sh.z1 + sh.z2) / 2, sh.x2 - sh.x1, 0.04, sh.z2 - sh.z1);
    for (const z of [sh.z1 + 0.03, sh.z2 - 0.03]) box(g, MAT.wood, (sh.x1 + sh.x2) / 2, 0.49, z, 0.04, 0.98, 0.04);
    box(g, MAT.wood, (sh.x1 + sh.x2) / 2, 0.5, (sh.z1 + sh.z2) / 2, sh.x2 - sh.x1, 0.03, sh.z2 - sh.z1);
    // Jars on it.
    for (let i = 0; i < 3; i += 1) add(g, geo("cyl", 0.045, 0.045, 0.14, 12), P.glass, 6.78, 1.07, -0.05 + i * 0.12);
    // An atta board with dough, in 1987.
    add(g, geo("cyl", 0.16, 0.16, 0.02, 24), tabOnly(0x9a7a4a), 3.45, 0.9, -2.15);
    add(g, geo("sph", 0.05, 12, 8), tabOnly(0xe8dcc0), 3.45, 0.93, -2.15, { sy: 0.6 });
    // Rubble and rot now.
    for (let i = 0; i < 6; i += 1) box(g, MAT.rubble, 3.2 + rand() * 0.5, 0.06, -1.6 + rand() * 2.8, 0.15, 0.1, 0.12, { ry: rand() * 3 });
  }

  // ---------------------------------------------------------- Dadi's room
  dadi() {
    const g = this.group;
    // The charpai: rope bed.
    const cp = FURNITURE.find((x) => x.id === "charpai");
    const cx = (cp.x1 + cp.x2) / 2;
    const cz = (cp.z1 + cp.z2) / 2;
    for (const [x, z] of [[cp.x1 + 0.04, cp.z1 + 0.04], [cp.x2 - 0.04, cp.z1 + 0.04], [cp.x1 + 0.04, cp.z2 - 0.04], [cp.x2 - 0.04, cp.z2 - 0.04]]) box(g, MAT.wood, x, 0.2, z, 0.06, 0.4, 0.06);
    box(g, MAT.wood, cx, 0.4, cp.z1 + 0.03, cp.x2 - cp.x1, 0.05, 0.05);
    box(g, MAT.wood, cx, 0.4, cp.z2 - 0.03, cp.x2 - cp.x1, 0.05, 0.05);
    box(g, P.rope, cx, 0.41, cz, cp.x2 - cp.x1 - 0.08, 0.015, cp.z2 - cp.z1 - 0.08);
    box(g, tabOnly(0xe8e0cc), cx, 0.425, cz, cp.x2 - cp.x1 - 0.1, 0.02, cp.z2 - cp.z1 - 0.1); // her sheet
    add(g, geo("sph", 0.12, 12, 8), tabOnly(0xf0ead8), cp.x1 + 0.25, 0.46, cz, { sx: 1.4, sy: 0.4 }); // pillow
    // The tin trunk.
    const tr = FURNITURE.find((x) => x.id === "trunk");
    box(g, P.tinTrunk, (tr.x1 + tr.x2) / 2, 0.24, (tr.z1 + tr.z2) / 2, tr.x2 - tr.x1, 0.48, tr.z2 - tr.z1);
    box(g, P.brass, (tr.x1 + tr.x2) / 2, 0.38, tr.z1 - 0.005, 0.06, 0.06, 0.01);
    // The pooja shelf, with the Gita.
    const pj = FURNITURE.find((x) => x.id === "pooja");
    box(g, MAT.wood, (pj.x1 + pj.x2) / 2, 1.08, (pj.z1 + pj.z2) / 2, pj.x2 - pj.x1, 0.04, pj.z2 - pj.z1);
    box(g, MAT.wood, (pj.x1 + pj.x2) / 2, 0.54, (pj.z1 + pj.z2) / 2, pj.x2 - pj.x1 - 0.04, 1.06, pj.z2 - pj.z1 - 0.06);
    box(g, both(0x7a1a14, 0x3a2a22), -7.2, 1.115, -0.78, 0.2, 0.03, 0.15); // the Gita
    // A picture of the gods above it (no faces; just gold and colour).
    const shrine = canvasTexture(
      128,
      160,
      (ctx, w, h) => {
        ctx.fillStyle = "#6a1a14";
        ctx.fillRect(0, 0, w, h);
        const gr = ctx.createRadialGradient(w / 2, h * 0.45, 4, w / 2, h * 0.45, w * 0.5);
        gr.addColorStop(0, "#f0c040");
        gr.addColorStop(1, "#8a3a14");
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.45, w * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#d4a030";
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);
      },
      { repeat: false },
    );
    add(g, new THREE.PlaneGeometry(0.3, 0.38), both(0xffffff, 0x4a4438, { map: shrine }), -7.38, 1.55, -0.6, { ry: Math.PI / 2, shadow: false });
    // A 1987 calendar on the south wall.
    const cal = canvasTexture(
      200,
      280,
      (ctx, w, h) => {
        ctx.fillStyle = "#f2ecdc";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#b02020";
        ctx.fillRect(0, 0, w, 110);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 30px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("1987", w / 2, 70);
        ctx.fillStyle = "#222";
        ctx.font = "bold 18px Georgia";
        ctx.fillText("OCTOBER", w / 2, 140);
        ctx.font = "13px Georgia";
        for (let d = 1; d <= 31; d += 1) {
          const i = d + 3;
          ctx.fillStyle = d === 11 ? "#b02020" : "#333";
          ctx.fillText(String(d), 18 + (i % 7) * 27, 170 + Math.floor(i / 7) * 22);
        }
      },
      { repeat: false },
    );
    add(g, new THREE.PlaneGeometry(0.3, 0.42), tabOnly(0xffffff, { map: cal }), -3.7, 1.6, 1.38, { ry: Math.PI, shadow: false });

    // Now: the peepal tree, up through the floor and out of the roof.
    const trunkPts = [
      [-5.4, -0.2, -0.3],
      [-5.45, 0.8, -0.25],
      [-5.3, 1.8, -0.4],
      [-5.45, 2.8, -0.3],
      [-5.35, 4.2, -0.35],
    ];
    const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunkPts.map((p) => new THREE.Vector3(...p))), 30, 0.4, 12, false);
    add(g, trunk, P.bark, 0, 0, 0);
    this.roots(g, [
      [[-5.4, 0.3, -0.3], [-6.2, 0.15, -0.3], [-6.8, 0.05, -0.1], [-7.4, 0.3, 0.2]],
      [[-5.2, 0.3, -0.2], [-4.6, 0.15, -0.25], [-4.0, 0.05, -0.3], [-3.2, 0.1, 0.2]],
      [[-5.6, 0.5, -0.6], [-6.4, 1.2, -1.6], [-7.2, 2.2, -2.3], [-7.4, 3.0, -2.4]],
      [[-5.2, 1.0, -0.6], [-4.5, 1.8, -1.6], [-4.0, 2.6, -2.35], [-3.4, 3.1, -2.4]],
      [[-5.5, 2.0, -0.2], [-6.2, 2.6, 0.6], [-6.9, 3.1, 1.3]],
      [[-5.1, 1.5, -0.1], [-4.3, 2.2, 0.8], [-3.5, 2.9, 1.4]],
      [[-5.3, 0.2, 0.0], [-5.6, 0.05, 0.9], [-6.2, 0.1, 1.4]],
    ], 0.07);
    // The clocks: every clock in the house, hung on roots and nails, all
    // stopped at different times. (Their ticking is Kaal's.)
    const faces = [];
    for (let i = 0; i < 6; i += 1) faces.push(abOnly(0x5e5a52, { map: clockTexture(Math.floor(rand() * 12), Math.floor(rand() * 60), rand() < 0.5 ? "#d8ccb0" : "#bfb49a"), r: 0.7 }));
    const spots = [
      [-7.38, 1.9, -1.5, Math.PI / 2], [-7.38, 2.4, -0.9, Math.PI / 2], [-7.38, 1.6, 0.4, Math.PI / 2], [-7.38, 2.2, 1.0, Math.PI / 2],
      [-6.8, 2.6, -2.38, 0], [-6.2, 2.0, -2.38, 0], [-4.8, 2.3, -2.38, 0], [-4.2, 1.7, -2.38, 0], [-3.6, 2.5, -2.38, 0],
      [-6.5, 2.3, 1.38, Math.PI], [-5.6, 1.9, 1.38, Math.PI], [-4.6, 2.5, 1.38, Math.PI],
      [-3.12, 2.2, -1.6, -Math.PI / 2], [-3.12, 1.8, 1.0, -Math.PI / 2],
    ];
    spots.forEach(([x, y, z, ry], i) => {
      const r = 0.08 + rand() * 0.12;
      const clock = new THREE.Group();
      clock.position.set(x, y, z);
      clock.rotation.y = ry;
      clock.rotation.z = (rand() - 0.5) * 0.4;
      add(clock, geo("cyl", r * 1.1, r * 1.1, 0.04, 24), abOnly(rand() < 0.5 ? 0x2a1e14 : 0x4a4a42, { m: 0.3 }), 0, 0, 0.02, { rx: Math.PI / 2 });
      add(clock, new THREE.CircleGeometry(r, 24), faces[i % faces.length], 0, 0, 0.042, { shadow: false });
      g.add(clock);
    });
    // Clocks hanging from the tree on strings, and wristwatches on nails.
    for (let i = 0; i < 9; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = 0.55 + rand() * 0.3;
      const y = 1.4 + rand() * 1.4;
      const x = -5.4 + Math.cos(a) * r;
      const z = -0.3 + Math.sin(a) * r;
      const len = 0.2 + rand() * 0.5;
      add(g, geo("cyl", 0.003, 0.003, len, 3), P.rope, x, y + len / 2 + 0.08, z, { shadow: false });
      const cs = 0.06 + rand() * 0.05;
      const c = new THREE.Group();
      c.position.set(x, y, z);
      c.rotation.y = -a + Math.PI / 2;
      add(c, geo("cyl", cs * 1.15, cs * 1.15, 0.03, 18), abOnly(0x3a3228, { m: 0.4 }), 0, 0, 0, { rx: Math.PI / 2 });
      add(c, new THREE.CircleGeometry(cs, 18), faces[(i + 2) % faces.length], 0, 0, 0.016, { shadow: false });
      add(c, new THREE.CircleGeometry(cs, 18), faces[(i + 3) % faces.length], 0, 0, -0.016, { ry: Math.PI, shadow: false });
      g.add(c);
    }
  }

  // ------------------------------------------------------------ courtyard
  courtyard() {
    const g = this.group;
    // 1987: a tulsi in its pot, a washing line.
    add(g, geo("cyl", 0.22, 0.17, 0.5, 12), P.terracotta, 2.0, 0.25, -4.8);
    for (let i = 0; i < 7; i += 1) add(g, geo("sph", 0.12, 8, 6), P.tulsi, 2.0 + (rand() - 0.5) * 0.25, 0.6 + rand() * 0.25, -4.8 + (rand() - 0.5) * 0.25, { sy: 1.4 });
    add(g, geo("cyl", 0.005, 0.005, 9, 4), tabOnly(0xdddddd), 0, 2.1, -5.8, { rz: Math.PI / 2, shadow: false });
    for (let i = 0; i < 4; i += 1) box(g, i % 2 ? P.redCloth : tabOnly(0xe8e0cc), -2.5 + i * 1.2, 1.75, -5.8, 0.7, 0.7, 0.01);
    // Now: weeds, a rusted bucket.
    for (let i = 0; i < 40; i += 1) add(g, geo("cone", 0.05 + rand() * 0.08, 0.3 + rand() * 0.6, 5), P.weeds, -7 + rand() * 13.5, 0.2, -6.8 + rand() * 4, { shadow: false });
    add(g, geo("cyl", 0.16, 0.13, 0.3, 12), MAT.rustAb, 1.4, 0.15, -3.6, { rz: Math.PI / 2 });
  }

  setPhoto(present, opts) {
    drawPhoto(this.photoCanvas.getContext("2d"), this.photoCanvas.width, this.photoCanvas.height, present, opts);
    this.photoTex.needsUpdate = true;
  }

  update(dt, { fan = 0, tube = 0 } = {}) {
    this.fanSpeed += (fan - this.fanSpeed) * Math.min(1, dt * 0.6);
    this.fanBlades.rotation.y += this.fanSpeed * dt * 9;
    this.tube.material.emissiveIntensity = tube;
  }
}

// Height of the surface under a point (for setting a candle down).
export function surfaceAt(x, z) {
  for (const f of FURNITURE) {
    if (f.era === "ab" || f.h > 1.2) continue;
    if (x > f.x1 && x < f.x2 && z > f.z1 && z < f.z2) return f.h + (f.id === "table" ? 0.02 : 0);
  }
  return 0;
}
