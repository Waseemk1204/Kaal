// Mummy, Papa and Dadi. None of them has a face: Kaal took the faces first.
// You know them by everything else: the drape of a saree, a plait with a red
// tassel, a shirt pocket with two pens, a shawl, the way each one sits.
//
// In 1987 (in the light) they are solid. Now (in the dark) a restored one is
// an outline of ash on the chair.

import * as THREE from "three";
import { eraMaterial } from "./era-material.js";
import { canvasTexture, rand } from "./textures.js";
import { buildHand } from "./hands.js";
import { SPOTS } from "../../shared/house-map.js";

// ------------------------------------------------------------- textures
function noiseDots(ctx, w, h, n, colors, size = 1.5, alpha = 0.3) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i += 1) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(rand() * w, rand() * h, size, size);
  }
  ctx.globalAlpha = 1;
}

// Soft vertical folds in cloth.
function folds(ctx, w, h, n, dark = "rgba(0,0,0,0.18)", light = "rgba(255,255,255,0.08)") {
  for (let i = 0; i < n; i += 1) {
    const x = rand() * w;
    const fw = 6 + rand() * 18;
    const g = ctx.createLinearGradient(x - fw, 0, x + fw, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.45, dark);
    g.addColorStop(0.6, light);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - fw, 0, fw * 2, h);
  }
}

const TEX = {};
function textures() {
  if (TEX.ready) return TEX;
  TEX.skin = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#a8714c";
    ctx.fillRect(0, 0, w, h);
    noiseDots(ctx, w, h, 1400, ["#9a6442", "#b47d58", "#8e5c3e"], 2, 0.35);
  });
  // Mummy's saree: maroon cotton, small gold butis, a wide zari border.
  TEX.saree = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#6e1418";
    ctx.fillRect(0, 0, w, h);
    noiseDots(ctx, w, h, 3000, ["#7e1c20", "#5a0f12"], 1.5, 0.4);
    ctx.fillStyle = "#c89a3a";
    for (let y = 14; y < h - 40; y += 26) for (let x = (y / 26) % 2 ? 6 : 19; x < w; x += 26) ctx.fillRect(x, y, 3, 3);
    // The border (at the bottom of the texture; UVs put it at hems).
    ctx.fillStyle = "#b8862e";
    ctx.fillRect(0, h - 30, w, 22);
    ctx.fillStyle = "#6e1418";
    for (let x = 0; x < w; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, h - 22);
      ctx.lineTo(x + 6, h - 14);
      ctx.lineTo(x + 12, h - 22);
      ctx.fill();
    }
    ctx.fillStyle = "#3a080a";
    ctx.fillRect(0, h - 8, w, 8);
    folds(ctx, w, h, 14);
  });
  TEX.blouse = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#5a0f14";
    ctx.fillRect(0, 0, w, h);
    noiseDots(ctx, w, h, 1500, ["#6a161a", "#480a0e"], 1.5, 0.4);
  });
  // Papa's shirt: off-white cotton, a faint weave and creases.
  TEX.shirt = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#e8e3d6";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(160,150,130,0.12)";
    for (let i = 0; i < w; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    folds(ctx, w, h, 12, "rgba(90,80,60,0.16)", "rgba(255,255,255,0.12)");
  });
  TEX.trousers = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#4e5054";
    ctx.fillRect(0, 0, w, h);
    noiseDots(ctx, w, h, 2500, ["#5a5c60", "#404246"], 1.5, 0.5);
    folds(ctx, w, h, 6);
  });
  // Dadi's white saree with a thin blue-grey border.
  TEX.white = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#e6e2d6";
    ctx.fillRect(0, 0, w, h);
    noiseDots(ctx, w, h, 2500, ["#d8d4c6", "#f0ece2"], 1.5, 0.5);
    ctx.fillStyle = "#5a6a7a";
    ctx.fillRect(0, h - 22, w, 5);
    ctx.fillRect(0, h - 12, w, 2);
    folds(ctx, w, h, 14, "rgba(100,90,70,0.16)", "rgba(255,255,255,0.1)");
  });
  // Her shawl: brown wool in a faint check.
  TEX.shawl = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#6e5a44";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(40,30,20,0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }
    noiseDots(ctx, w, h, 3000, ["#7e6a52", "#5a4834"], 2, 0.5);
  });
  // Hair: fine strands.
  const hair = (base, strand) =>
    canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = strand;
      for (let i = 0; i < 260; i += 1) {
        const x = rand() * w;
        ctx.globalAlpha = 0.2 + rand() * 0.4;
        ctx.lineWidth = 0.6 + rand();
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + (rand() - 0.5) * 8, h * 0.3, x + (rand() - 0.5) * 8, h * 0.7, x + (rand() - 0.5) * 6, h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
  TEX.hairBlack = hair("#141010", "#3a302a");
  TEX.hairWhite = hair("#d8d6d0", "#a8a6a0");
  TEX.ash = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#5e5a54";
    ctx.fillRect(0, 0, w, h);
    noiseDots(ctx, w, h, 4000, ["#7a766e", "#3e3a36", "#2a2826"], 2, 0.6);
  });
  TEX.ready = true;
  return TEX;
}

// ------------------------------------------------------------- materials
const ASH_MAT = {};
function ashMat() {
  if (!ASH_MAT.m) ASH_MAT.m = eraMaterial({ mode: "ab", map: textures().ash, roughness: 1 });
  return ASH_MAT.m;
}

function cloth(map, { color = 0xffffff, rough = 0.9, sheen = 0, force = false, side = THREE.FrontSide, metal = 0 } = {}) {
  return {
    tab: eraMaterial({ mode: force ? "both" : "tab", map, color, roughness: rough, metalness: metal, side, ab: { map, color } }),
    ash: ashMat(),
    sheen,
  };
}

// ---------------------------------------------------------------- shapes
// Add one piece in both looks: solid in 1987, ash now.
function part(group, geometry, mats, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, shadow = true } = {}) {
  const solid = new THREE.Mesh(geometry, mats.tab);
  const ash = new THREE.Mesh(geometry, mats.ash);
  for (const m of [solid, ash]) {
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = shadow;
    m.receiveShadow = true;
    group.add(m);
  }
  ash.userData.ash = true;
  solid.userData.solid = true;
  return solid;
}

// A body of revolution from (radius, height) pairs, flattened front to back.
function lathe(profile, segments = 20) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

// A tapered limb hanging down from its joint.
function taper(len, r1, r2, seg = 12) {
  const g = new THREE.CylinderGeometry(r1, r2, len, seg, 4);
  g.translate(0, -len / 2, 0);
  return g;
}

const sph = (r, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);

// A cloth strip along a curve (pallu, dupatta ends). `out` gives which way
// the cloth faces at each point.
function ribbon(points, width, out = new THREE.Vector3(0, 0, -1), segs = 24) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segs; i += 1) {
    const t = i / segs;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const across = new THREE.Vector3().crossVectors(tan, out).normalize();
    const w = typeof width === "function" ? width(t) : width;
    // A ripple across the cloth so it isn't flat card.
    const ripple = Math.sin(t * 18) * 0.006;
    pos.push(p.x - across.x * w / 2 + out.x * ripple, p.y - across.y * w / 2, p.z - across.z * w / 2 + out.z * ripple);
    pos.push(p.x + across.x * w / 2 - out.x * ripple, p.y + across.y * w / 2, p.z + across.z * w / 2 - out.z * ripple);
    uv.push(0, t, 1, t);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// The head: a smooth egg with a soft jaw and the back of a skull. Nothing on
// the face, ever.
function headGeometry(scale) {
  const g = new THREE.SphereGeometry(0.1, 28, 22);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    const t = (y + 0.1) / 0.2; // 0 chin … 1 crown
    // Narrower toward the chin, fuller at the back of the skull.
    const w = 0.66 + 0.34 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.55);
    x *= 0.8 * w;
    z *= 0.92 * w;
    if (z > 0) z *= 1.08; // the back of the head (+z is behind)
    y *= 1.12;
    // A soft jaw line and chin, no features.
    if (t < 0.35 && z < 0) z -= (0.35 - t) * 0.03;
    p.setXYZ(i, x * scale, y * scale, z * scale);
  }
  g.computeVertexNormals();
  return g;
}

// Hair that covers the crown and the back of the head down to the nape,
// with the hairline set back from the (blank) face.
function hairCap(scale, { back = 0.62, line = 0.42 } = {}) {
  const g = new THREE.SphereGeometry(0.107 * scale, 28, 18, 0, Math.PI * 2, 0, Math.PI * back);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    let z = p.getZ(i);
    // Pull the front edge up into a hairline.
    if (z < 0 && y < 0.107 * scale * line) {
      const k = (0.107 * scale * line - y) / (0.107 * scale);
      z *= 1 - k * 0.15;
      p.setY(i, y + k * 0.05 * scale * (-z / (0.107 * scale)));
    }
    p.setXYZ(i, x * 0.86, p.getY(i), z * 1.0);
  }
  g.computeVertexNormals();
  g.rotateX(0.55); // tip it back so it reaches the nape
  return g;
}

// --------------------------------------------------------------- people
const SPECS = {
  mummy: { scale: 0.97, stoop: 0.08, lean: 0.12 },
  papa: { scale: 1.04, stoop: 0.04, lean: -0.06 },
  dadi: { scale: 0.9, stoop: 0.3, lean: 0.18 },
};

export class Person {
  constructor(id, scene, { force = false } = {}) {
    this.id = id;
    const spec = SPECS[id];
    this.spec = spec;
    const T = textures();
    const root = new THREE.Group();
    root.name = id;
    this.root = root;
    scene.add(root);
    const s = spec.scale;

    const M = {
      skin: cloth(T.skin, { rough: 0.7, force }),
      saree: cloth(T.saree, { force, side: THREE.DoubleSide }),
      blouse: cloth(T.blouse, { force }),
      shirt: cloth(T.shirt, { force }),
      trousers: cloth(T.trousers, { force }),
      white: cloth(T.white, { force, side: THREE.DoubleSide }),
      shawl: cloth(T.shawl, { force, side: THREE.DoubleSide }),
      hairBlack: cloth(T.hairBlack, { rough: 0.55, force }),
      hairWhite: cloth(T.hairWhite, { rough: 0.6, force }),
      gold: cloth(null, { color: 0xc8962e, rough: 0.35, metal: 0.8, force }),
      steel: cloth(null, { color: 0xc8ccd0, rough: 0.3, metal: 0.85, force }),
      red: cloth(null, { color: 0xb0141a, rough: 0.2, force }),
      black: cloth(null, { color: 0x15110e, rough: 0.6, force }),
      sindoor: cloth(null, { color: 0xc81e14, rough: 0.8, force }),
      leather: cloth(null, { color: 0x3a2618, rough: 0.7, force }),
      pen: cloth(null, { color: 0x1e3a6a, rough: 0.3, force }),
    };
    this.M = M;
    const isMummy = id === "mummy";
    const isPapa = id === "papa";
    const isDadi = id === "dadi";
    const lower = isPapa ? M.trousers : isMummy ? M.saree : M.white;
    const top = isPapa ? M.shirt : isMummy ? M.blouse : M.white;

    // ------------------------------------------------ hips, legs, feet
    const hips = new THREE.Group();
    hips.position.y = 0.5;
    root.add(hips);
    part(hips, sph(0.16 * s), lower, 0, 0.02, 0.01, { sx: 1.08, sy: 0.62, sz: 0.95 });
    for (const side of [-1, 1]) {
      // Thigh forward along the seat, knee, shin down, foot on the floor.
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.095 * s, 0.0, -0.02);
      thigh.rotation.x = Math.PI / 2 - 0.06;
      thigh.rotation.z = side * 0.05;
      hips.add(thigh);
      part(thigh, taper(0.42 * s, 0.078 * s, 0.056 * s), lower);
      const knee = new THREE.Group();
      knee.position.y = -0.42 * s;
      thigh.add(knee);
      part(knee, sph(0.058 * s), lower);
      const shin = new THREE.Group();
      shin.rotation.x = -Math.PI / 2 + 0.12;
      knee.add(shin);
      part(shin, taper(0.42 * s, 0.05 * s, 0.038 * s), isPapa ? M.trousers : M.skin);
      // Chappal and foot.
      const foot = new THREE.Group();
      foot.position.y = -0.43 * s;
      foot.rotation.x = Math.PI / 2 - 0.1;
      shin.add(foot);
      part(foot, sph(0.045 * s), M.skin, 0, -0.06 * s, 0.0, { sx: 0.8, sy: 1.9, sz: 0.55 });
      part(foot, new THREE.BoxGeometry(0.09 * s, 0.24 * s, 0.015), M.leather, 0, -0.07 * s, 0.03 * s);
    }
    if (isMummy || isDadi) {
      // The saree: pleats falling from the waist over the knees to the floor.
      const pleats = new THREE.CylinderGeometry(0.17 * s, 0.26 * s, 0.5 * s, 56, 6, true, -Math.PI * 0.75, Math.PI * 1.5);
      const pp = pleats.attributes.position;
      for (let i = 0; i < pp.count; i += 1) {
        const x = pp.getX(i);
        const z = pp.getZ(i);
        const a = Math.atan2(x, z);
        const front = Math.max(0, -Math.cos(a)); // pleats only at the front
        const k = 1 + Math.sin(a * 30) * 0.05 * front;
        pp.setX(i, x * k);
        pp.setZ(i, z * k);
      }
      pleats.computeVertexNormals();
      part(hips, pleats, lower, 0, -0.27 * s, -0.36 * s, { rx: 0.08, ry: Math.PI });
      // Over the lap.
      part(hips, new THREE.BoxGeometry(0.34 * s, 0.07 * s, 0.4 * s), lower, 0, 0.03, -0.2 * s, { rx: 0.03 });
    }

    // ------------------------------------------------------------ torso
    const torso = new THREE.Group();
    torso.position.y = 0.04;
    torso.rotation.x = -spec.stoop;
    hips.add(torso);
    // Waist to shoulders.
    const body = lathe(
      [
        [0.0, 0],
        [0.13, 0.0],
        [0.125, 0.08],
        [0.135, 0.2],
        [0.15, 0.3],
        [0.155, 0.38],
        [0.13, 0.44],
        [0.06, 0.49],
        [0.0, 0.5],
      ].map(([r, y]) => [r * s, y * s]),
    );
    part(torso, body, top, 0, 0, 0, { sx: isPapa ? 1.12 : 1.02, sz: 0.68 });
    // Sloping shoulders.
    for (const side of [-1, 1]) part(torso, sph(0.052 * s), top, side * 0.145 * s, 0.415 * s, 0.0, { sx: 1.1, sy: 0.7, sz: 0.85 });
    if (isMummy) {
      // A strip of waist between blouse and saree, and the saree tucked at the hip.
      part(torso, lathe([[0.128, 0], [0.126, 0.05], [0.0, 0.05]].map(([r, y]) => [r * s, y * s])), M.skin, 0, 0.1 * s, 0, { sz: 0.66 });
      part(torso, lathe([[0.135, 0], [0.132, 0.09], [0.0, 0.09]].map(([r, y]) => [r * s, y * s])), M.saree, 0, 0.0, 0, { sz: 0.7 });
      // The pallu: from the left hip, across the chest, over the left
      // shoulder and down the back.
      part(
        torso,
        ribbon(
          [
            [0.11, 0.06, -0.1],
            [0.02, 0.22, -0.115],
            [-0.09, 0.36, -0.1],
            [-0.15, 0.46, -0.02],
            [-0.14, 0.4, 0.09],
            [-0.12, 0.18, 0.12],
            [-0.1, -0.05, 0.13],
          ].map(([x, y, z]) => [x * s, y * s, z * s]),
          (t) => (0.16 + t * 0.06) * s,
          new THREE.Vector3(0, 0, -1),
        ),
        M.saree,
      );
      // Mangalsutra: black beads with a little gold.
      for (let i = 0; i < 18; i += 1) {
        const a = -Math.PI * 0.85 + (i / 17) * Math.PI * 0.7;
        part(torso, sph(0.0055, 6, 4), M.black, Math.cos(a) * 0.075 * s, (0.44 + Math.sin(a) * 0.1) * s, -0.085 * s, { shadow: false });
      }
      part(torso, sph(0.01, 8, 6), M.gold, 0, 0.33 * s, -0.09 * s, { sy: 1.4, shadow: false });
    }
    if (isPapa) {
      // Collar, button placket, a pocket with two pens, a belt.
      for (const side of [-1, 1]) part(torso, new THREE.BoxGeometry(0.07, 0.006, 0.05), M.shirt, side * 0.04, 0.47 * s, -0.06, { rz: side * 0.5, rx: -0.6 });
      part(torso, new THREE.BoxGeometry(0.018, 0.4 * s, 0.004), M.shirt, 0, 0.24 * s, -0.103 * s);
      for (let i = 0; i < 4; i += 1) part(torso, sph(0.004, 6, 4), M.black, 0, (0.1 + i * 0.09) * s, -0.107 * s, { shadow: false });
      part(torso, new THREE.BoxGeometry(0.075, 0.08, 0.004), M.shirt, -0.07 * s, 0.33 * s, -0.104 * s);
      part(torso, new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), M.pen, -0.08 * s, 0.37 * s, -0.106 * s);
      part(torso, new THREE.CylinderGeometry(0.004, 0.004, 0.045, 6), M.steel, -0.065 * s, 0.368 * s, -0.106 * s);
      part(torso, lathe([[0.15, 0], [0.15, 0.03], [0.0, 0.03]].map(([r, y]) => [r * s, y * s])), M.leather, 0, 0.0, 0, { sx: 1.12, sz: 0.7 });
      part(torso, new THREE.BoxGeometry(0.035, 0.022, 0.008), M.steel, 0, 0.015 * s, -0.106 * s);
    }
    if (isDadi) {
      // Her shawl, round her shoulders and down her back.
      // Wrapped close round the neck, over the shoulders, falling to the lap.
      const wrap = lathe(
        [
          [0.055, 0.53],
          [0.085, 0.51],
          [0.16, 0.47],
          [0.205, 0.42],
          [0.215, 0.32],
          [0.205, 0.2],
          [0.2, 0.08],
          [0.19, 0.02],
        ].map(([r, y]) => [r * s, y * s]),
        32,
      );
      part(torso, wrap, M.shawl, 0, 0, 0.005, { sz: 0.78 });
      // The white pallu over her head and down her right side.
      part(
        torso,
        ribbon(
          [
            [0.05, 0.75, 0.02],
            [0.11, 0.66, 0.03],
            [0.17, 0.48, 0.02],
            [0.18, 0.25, -0.02],
            [0.15, 0.02, -0.06],
          ].map(([x, y, z]) => [x * s, y * s, z * s]),
          0.16 * s,
          new THREE.Vector3(1, 0, 0),
        ),
        M.white,
      );
    }

    // -------------------------------------------------------- neck, head
    const neck = new THREE.Group();
    neck.position.y = 0.48 * s;
    torso.add(neck);
    part(neck, taper(0.09, 0.04 * s, 0.047 * s), M.skin, 0, 0.09, 0, { rx: Math.PI });
    const head = new THREE.Group();
    head.position.y = 0.09;
    head.rotation.x = 0.1;
    neck.add(head);
    part(head, headGeometry(s), M.skin, 0, 0.1 * s, 0.004);

    if (isMummy) {
      // Centre parting with sindoor in it, hair pulled back into a long
      // plait with a red tassel at the end.
      part(head, hairCap(s), M.hairBlack, 0, 0.105 * s, 0.006);
      // The parting: a fine line down the middle, sindoor in it.
      part(head, new THREE.BoxGeometry(0.0035, 0.003, 0.05 * s), M.sindoor, 0, 0.207 * s, -0.036 * s, { rx: -0.35, shadow: false });
      const plait = new THREE.Group();
      plait.position.set(0, 0.08 * s, 0.095 * s);
      plait.rotation.x = 0.22;
      head.add(plait);
      for (let i = 0; i < 16; i += 1) {
        const r = 0.024 * s * (1 - i * 0.03);
        part(plait, sph(r, 10, 8), M.hairBlack, ((i % 2) - 0.5) * 0.012, -i * 0.032, 0, { sx: 1.1, sy: 1.25, rz: (i % 2 ? 1 : -1) * 0.4 });
      }
      part(plait, new THREE.CylinderGeometry(0.008, 0.016, 0.07, 8), M.red, 0, -0.55, 0);
    }
    if (isPapa) {
      // Short hair with a side parting, a little fuller on one side; reading
      // glasses pushed up on his head.
      part(head, hairCap(s, { back: 0.56 }), M.hairBlack, 0, 0.11 * s, 0.004);
      part(head, sph(0.06 * s), M.hairBlack, -0.025, 0.175 * s, -0.03, { sx: 1.15, sy: 0.45, sz: 1 });
      for (const side of [-1, 1]) part(head, new THREE.TorusGeometry(0.024, 0.003, 6, 16), M.black, side * 0.03, 0.2 * s, -0.045, { rx: -1.1 });
      part(head, new THREE.CylinderGeometry(0.002, 0.002, 0.018, 4), M.black, 0, 0.2 * s, -0.05, { rz: Math.PI / 2 });
    }
    if (isDadi) {
      // Thin white hair in a small bun, mostly under her pallu.
      part(head, hairCap(s), M.hairWhite, 0, 0.105 * s, 0.006);
      part(head, sph(0.04 * s), M.hairWhite, 0, 0.12 * s, 0.1 * s);
      // The pallu over her head.
      part(head, new THREE.SphereGeometry(0.105 * s, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M.white, 0, 0.115 * s, 0.03, { sx: 0.9, sz: 1.08, rx: -0.35 });
    }
    // Dadi's spectacles sit on the blank face once she's back.
    this.spectacles = new THREE.Group();
    if (isDadi) {
      for (const side of [-1, 1]) {
        part(this.spectacles, new THREE.TorusGeometry(0.021, 0.0028, 6, 18), M.gold, side * 0.03, 0, 0, { shadow: false });
        part(this.spectacles, new THREE.CylinderGeometry(0.0018, 0.0018, 0.09, 4), M.gold, side * 0.05, 0, 0.045, { rx: Math.PI / 2, shadow: false });
      }
      part(this.spectacles, new THREE.CylinderGeometry(0.002, 0.002, 0.016, 4), M.gold, 0, 0.004, 0, { rz: Math.PI / 2, shadow: false });
      this.spectacles.position.set(0, 0.11 * s, -0.082 * s);
      head.add(this.spectacles);
    }

    // ------------------------------------------------------------- arms
    const arms = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.17 * s, 0.42 * s, 0);
      torso.add(shoulder);
      const upper = new THREE.Group();
      shoulder.add(upper);
      upper.userData.len = 0.29 * s;
      // Sleeve: Papa's half-sleeve to above the elbow; Mummy's blouse sleeve
      // short; Dadi's covered by the shawl. Skin below.
      const sleeveLen = isPapa ? 0.2 : isMummy ? 0.12 : 0.27;
      part(upper, taper(sleeveLen * s, 0.044 * s, isPapa ? 0.042 * s : 0.038 * s), isDadi ? M.shawl : top);
      part(upper, taper(0.29 * s, 0.037 * s, 0.031 * s), M.skin);
      const fore = new THREE.Group();
      fore.position.y = -0.29 * s;
      upper.add(fore);
      fore.userData.len = 0.25 * s;
      part(fore, sph(0.037 * s), M.skin);
      part(fore, taper(0.25 * s, 0.036 * s, 0.026 * s), M.skin);
      // A real hand, fingers relaxed.
      const hand = buildHand({ side: -side, curl: [0.35, 0.45, 0.55, 0.6], thumb: 0.3, material: M.skin.tab, sleeve: M.skin.tab });
      const cuffs = [];
      hand.traverse((m) => {
        if (m.isMesh && m.geometry.type === "CylinderGeometry" && m.geometry.parameters.openEnded) cuffs.push(m); // no cuff
        else if (m.isMesh) m.userData.solid = true;
      });
      for (const c of cuffs) c.parent.remove(c);
      hand.scale.setScalar(0.95 * s);
      hand.position.y = -0.25 * s - 0.005;
      hand.rotation.set(0, side * Math.PI / 2, Math.PI);
      fore.add(hand);
      // In ash, the hand is just a shape.
      const ashHand = new THREE.Mesh(sph(0.04 * s), ashMat());
      ashHand.position.y = -0.29 * s;
      ashHand.scale.set(0.8, 1.5, 0.45);
      ashHand.userData.ash = true;
      fore.add(ashHand);
      if (isMummy) {
        for (let k = 0; k < 4; k += 1) part(fore, new THREE.TorusGeometry(0.031 * s, 0.0045, 6, 18), k === 0 || k === 3 ? M.gold : M.red, 0, -0.215 * s + k * 0.009, 0, { rx: Math.PI / 2 + 0.15, shadow: false });
      }
      if (isPapa && side < 0) {
        part(fore, new THREE.TorusGeometry(0.03 * s, 0.006, 6, 18), M.black, 0, -0.21 * s, 0, { rx: Math.PI / 2, shadow: false });
        part(fore, new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16), M.steel, 0, -0.21 * s, -0.03 * s, { rx: Math.PI / 2, shadow: false });
      }
      upper.rotation.set(0.45, 0, side * 0.1);
      fore.rotation.set(1.05, 0, 0);
      arms.push({ shoulder, upper, fore });
    }
    this.parts = { hips, torso, neck, head, arms };
    this.time = Math.random() * 10;
    this.anim = null; // a function (t, parts) for scripted gestures
    this.lean = spec.lean;
    this.setState("gone");
  }

  // Sit at their place at the table.
  seat() {
    const s = SPOTS.seat[this.id];
    this.root.position.set(s.x, 0, s.z * 1.05);
    this.root.rotation.y = s.z > 0 ? 0 : Math.PI; // facing the table (-z is their front)
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
    // Breathing, small shifts of weight, a head that isn't quite still.
    p.torso.rotation.z = Math.sin(t * 0.4) * 0.015 + this.lean * 0.1;
    p.torso.scale.set(1, 1 + Math.sin(t * 1.6) * 0.006, 1);
    p.neck.rotation.x = Math.sin(t * 0.3 + 1) * 0.04;
    p.head.rotation.z = Math.sin(t * 0.23 + 2) * 0.03 + this.lean * 0.25;
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
