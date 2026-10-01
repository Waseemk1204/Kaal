// Canvas-drawn textures for both times of the house. Helpers adapted from
// Jugaad Escape's bank.js. Everything is drawn once at load.

import * as THREE from "three";

let seed = 1987;
export function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

export function canvasTexture(w, h, draw, { repeat = true, srgb = true } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function speckle(ctx, w, h, count, colors, size = 1, alpha = 1) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = colors[i % colors.length];
    const s = size * (0.5 + rand());
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

function blotches(ctx, w, h, count, color, rMin, rMax, alpha) {
  for (let i = 0; i < count; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rMin + rand() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha * (0.4 + rand() * 0.6);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

function cracks(ctx, w, h, count, color, width = 1.2) {
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i += 1) {
    let x = rand() * w;
    let y = rand() * h;
    let a = rand() * Math.PI * 2;
    ctx.lineWidth = width * (0.5 + rand());
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 6 + Math.floor(rand() * 14);
    for (let s = 0; s < steps; s += 1) {
      a += (rand() - 0.5) * 1.1;
      x += Math.cos(a) * (6 + rand() * 14);
      y += Math.sin(a) * (6 + rand() * 14);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Walls: the texture covers 2 m across and the full 3.2 m height, so the
// dado band sits at the right height everywhere (v = 0 is the floor).
const WALL_W = 512;
const WALL_H = 820;
const DADO = 1.0 / 3.2;

function tabWall(ctx, w, h) {
  // Pale green distemper above, glossy darker green oil paint below.
  ctx.fillStyle = "#aac7b4";
  ctx.fillRect(0, 0, w, h);
  blotches(ctx, w, h, 40, "#9dbca8", 30, 90, 0.35);
  speckle(ctx, w, h, 4000, ["#d8e2cf", "#b9c8ae"], 1.5, 0.35);
  const dadoTop = h * (1 - DADO);
  ctx.fillStyle = "#4f6b4a";
  ctx.fillRect(0, dadoTop, w, h - dadoTop);
  speckle(ctx, w, h - dadoTop, 800, ["#5a7754", "#45603f"], 2, 0.3);
  ctx.fillStyle = "#2f4630";
  ctx.fillRect(0, dadoTop - 3, w, 5);
  // A little wear along the skirting.
  blotches(ctx, w, 20, 10, "#3c3a2e", 10, 30, 0.2);
}

function abWall(ctx, w, h) {
  ctx.fillStyle = "#6b6e64";
  ctx.fillRect(0, 0, w, h);
  // Exposed brick where the plaster has fallen: ragged patches.
  for (let i = 0; i < 5; i += 1) {
    const bx = rand() * w;
    const by = rand() * h;
    const R = 40 + rand() * 70;
    ctx.save();
    ctx.beginPath();
    const ph = rand() * 6;
    for (let k = 0; k <= 32; k += 1) {
      const a = (k / 32) * Math.PI * 2;
      const r = R * (0.72 + 0.2 * Math.sin(a * 3 + ph) + 0.08 * Math.sin(a * 7 + ph * 2) + rand() * 0.06);
      const px = bx + Math.cos(a) * r * 1.3;
      const py = by + Math.sin(a) * r * 0.8;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#4a3028";
    ctx.fillRect(bx - R * 2, by - R * 2, R * 4, R * 4);
    ctx.strokeStyle = "#2a1e1a";
    ctx.lineWidth = 2;
    for (let y = by - R * 2; y < by + R * 2; y += 14) {
      ctx.beginPath();
      ctx.moveTo(bx - R * 2, y);
      ctx.lineTo(bx + R * 2, y);
      ctx.stroke();
      const off = (Math.floor(y / 14) % 2) * 18;
      for (let x = bx - R * 2 + off; x < bx + R * 2; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 14);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // Damp: dark blooms and long water streaks from the ceiling.
  blotches(ctx, w, h, 30, "#262a1f", 30, 140, 0.55);
  blotches(ctx, w, h * 0.25, 10, "#2a2e22", 40, 120, 0.35);
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 26; i += 1) {
    const x = rand() * w;
    const len = h * (0.2 + rand() * 0.7);
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, "#1a1c14");
    g.addColorStop(1, "rgba(26,28,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 2 + rand() * 6, len);
  }
  ctx.globalAlpha = 1;
  // The old dado line, ghostly.
  const dadoTop = h * (1 - DADO);
  ctx.fillStyle = "rgba(40,52,38,0.55)";
  ctx.fillRect(0, dadoTop, w, h - dadoTop);
  cracks(ctx, w, h, 22, "rgba(20,20,16,0.8)");
  speckle(ctx, w, h, 6000, ["#7a7b70", "#4d4f46", "#30322b"], 2, 0.4);
  blotches(ctx, w, h, 12, "#3f4a2a", 10, 40, 0.5); // mould
}

export const TEX = {};

export function buildTextures() {
  if (TEX.ready) return TEX;
  TEX.wallTab = canvasTexture(WALL_W, WALL_H, tabWall);
  TEX.wallAb = canvasTexture(WALL_W, WALL_H, abWall);

  // Red oxide floor, polished, with the 2 ft grid lines laid into it.
  TEX.floorTab = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#7a2a22";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 50, "#8d362b", 20, 80, 0.4);
    blotches(ctx, w, h, 30, "#5f1f19", 20, 80, 0.3);
    speckle(ctx, w, h, 3000, ["#8a3a30", "#6a241d"], 1.5, 0.4);
    ctx.strokeStyle = "#3f1611";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 2);
      ctx.lineTo(w, (i * h) / 2);
      ctx.moveTo((i * w) / 2, 0);
      ctx.lineTo((i * w) / 2, h);
      ctx.stroke();
    }
  });
  TEX.floorAb = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#3a3330";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 40, "#4a2420", 20, 70, 0.4); // the red, nearly gone
    blotches(ctx, w, h, 50, "#29271f", 30, 110, 0.6);
    speckle(ctx, w, h, 9000, ["#5c5550", "#211e1b", "#4a4038"], 2.5, 0.5);
    cracks(ctx, w, h, 30, "rgba(10,9,8,0.9)", 1.6);
    // Dead leaves blown in.
    for (let i = 0; i < 40; i += 1) {
      ctx.fillStyle = ["#4a3a20", "#3b2c18", "#5b4626"][i % 3];
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 4 + rand() * 6, 2 + rand() * 3, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(20,10,8,0.6)";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w / 2, h / 2);
    ctx.strokeRect(w / 2, h / 2, w / 2, h / 2);
  });

  TEX.ceilTab = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#e4e2d6";
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 1500, ["#d4d1c4", "#efeee6"], 1.5, 0.5);
  });
  TEX.ceilAb = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#4b4a44";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 25, "#1f1f19", 20, 80, 0.7);
    cracks(ctx, w, h, 12, "rgba(10,10,8,0.9)");
    speckle(ctx, w, h, 3000, ["#5a5850", "#2a2924"], 2, 0.5);
  });

  TEX.woodTab = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#5a3418";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = `rgba(${30 + rand() * 30},${15 + rand() * 15},5,${0.25 + rand() * 0.25})`;
      ctx.fillRect(0, y + Math.sin(y * 0.15) * 2, w, 1 + rand() * 2);
    }
    blotches(ctx, w, h, 8, "#7a4a24", 10, 40, 0.3);
  });
  TEX.woodAb = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#4a4640";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = `rgba(${20 + rand() * 20},${20 + rand() * 20},${18 + rand() * 15},${0.3 + rand() * 0.3})`;
      ctx.fillRect(0, y + Math.sin(y * 0.15) * 2, w, 1 + rand() * 2);
    }
    cracks(ctx, w, h, 10, "rgba(8,8,6,0.9)");
    blotches(ctx, w, h, 10, "#22261a", 10, 40, 0.6);
  });

  TEX.steelTab = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#e8ecef");
    g.addColorStop(0.6, "#b9c0c6");
    g.addColorStop(1, "#d6dce0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  TEX.rust = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#5a3a26";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 30, "#7a3e1c", 5, 25, 0.7);
    blotches(ctx, w, h, 20, "#2b1d14", 5, 25, 0.7);
    speckle(ctx, w, h, 1500, ["#8a4a24", "#3a2414"], 1.5, 0.6);
  });

  TEX.brickWet = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#2c1d18";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#140d0b";
    ctx.lineWidth = 3;
    for (let y = 0; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      const off = (y / 22) % 2 ? 0 : 28;
      for (let x = off; x < w; x += 56) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 22);
        ctx.stroke();
      }
    }
    blotches(ctx, w, h, 20, "#0c1209", 10, 50, 0.7);
  });

  TEX.yardTab = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#8c8478";
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 4000, ["#9a9286", "#7a7366"], 2, 0.5);
    ctx.strokeStyle = "#6d665b";
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 6);
      ctx.lineTo(w, (i * h) / 6);
      ctx.stroke();
    }
  });
  TEX.yardAb = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#2c2e25";
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 40, "#1a2614", 10, 40, 0.8);
    speckle(ctx, w, h, 6000, ["#3c4630", "#1b2016", "#4a4a3a"], 3, 0.6);
  });

  TEX.ready = true;
  return TEX;
}

// Box/plane UVs in metres: each face is projected along its normal, so a
// texture repeats at the same physical size everywhere. su/sv: metres per
// texture repeat along the face's horizontal / vertical.
export function worldUV(geometry, su = 2, sv = 3.2, { yOffset = 0 } = {}) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, x / su, z / sv);
    else if (nx >= nz) uv.setXY(i, z / su, (y + yOffset) / sv);
    else uv.setXY(i, x / su, (y + yOffset) / sv);
  }
  uv.needsUpdate = true;
  return geometry;
}
