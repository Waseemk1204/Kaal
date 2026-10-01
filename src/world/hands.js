// Your hands, in first person. The left one holds the match; the right one
// carries whatever you've picked up.
//
// They are drawn with the era material like everything else, which means a
// hand in match light is a young man's hand and the same hand in moonlight is
// an old man's: spotted, veined, creased. Nobody remarks on it.

import * as THREE from "three";
import { eraMaterial } from "./era-material.js";
import { canvasTexture, rand } from "./textures.js";

function skinYoung(ctx, w, h) {
  ctx.fillStyle = "#b67c56";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(150,95,62,0.25)" : "rgba(200,140,100,0.2)";
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
}

function skinOld(ctx, w, h) {
  ctx.fillStyle = "#8a6550";
  ctx.fillRect(0, 0, w, h);
  // Creases.
  ctx.strokeStyle = "rgba(60,38,28,0.55)";
  for (let i = 0; i < 70; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.lineWidth = 0.6 + rand();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 6, y + (rand() - 0.5) * 4, x + 12, y + (rand() - 0.5) * 4, x + 18 + rand() * 10, y + (rand() - 0.5) * 6);
    ctx.stroke();
  }
  // Veins.
  ctx.strokeStyle = "rgba(70,80,110,0.45)";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 5; i += 1) {
    let x = rand() * w;
    let y = h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y > 0) {
      x += (rand() - 0.5) * 14;
      y -= 10 + rand() * 10;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Liver spots.
  for (let i = 0; i < 30; i += 1) {
    ctx.fillStyle = `rgba(${70 + rand() * 30},${40 + rand() * 20},25,${0.4 + rand() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, 2 + rand() * 6, 2 + rand() * 5, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

let SKIN = null;
export function skinMaterial() {
  if (SKIN) return SKIN;
  const young = canvasTexture(128, 128, skinYoung);
  const old = canvasTexture(128, 128, skinOld);
  SKIN = eraMaterial({ map: young, roughness: 0.65, ab: { map: old, roughness: 0.8 } });
  return SKIN;
}

const SLEEVE = eraMaterial({ color: 0x8a8378, roughness: 1, ab: { color: 0x4a4740, roughness: 1 } });

// A hand: palm, four fingers and a thumb. Fingers run along +y, the palm
// faces +z, and `curl` bends each finger toward the palm (radians per joint).
// side: 1 = left hand, -1 = right hand (mirrors the thumb).
export function buildHand({ side = 1, curl = [0.5, 1.1, 1.2, 1.25], thumb = 0.4 } = {}) {
  const hand = new THREE.Group();
  const skin = skinMaterial();
  const palmGeo = new THREE.CapsuleGeometry(0.034, 0.035, 4, 12);
  palmGeo.scale(1.05, 1, 0.42);
  const palm = new THREE.Mesh(palmGeo, skin);
  palm.position.y = 0.045;
  hand.add(palm);
  const knuckles = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.05, 3, 8), skin);
  knuckles.rotation.z = Math.PI / 2;
  knuckles.position.set(0, 0.085, -0.002);
  hand.add(knuckles);
  hand.userData.fingers = [];
  const lengths = [0.078, 0.086, 0.082, 0.064];
  for (let i = 0; i < 4; i += 1) {
    const base = new THREE.Group();
    // Index finger on the thumb side.
    base.position.set((1.5 - i) * 0.0185 * side, 0.088, 0);
    let parent = base;
    const segs = [];
    for (let s = 0; s < 3; s += 1) {
      const len = (lengths[i] / 3) * (s === 0 ? 1.15 : s === 1 ? 0.95 : 0.85);
      const joint = new THREE.Group();
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0088 - s * 0.0009, len * 0.75, 3, 8), skin);
      seg.position.y = len / 2;
      joint.add(seg);
      if (s > 0) joint.position.y = parent.userData.len;
      joint.userData.len = len;
      joint.rotation.x = curl[i] * (s === 0 ? 0.8 : 1);
      parent.add(joint);
      parent = joint;
      segs.push(joint);
    }
    hand.add(base);
    hand.userData.fingers.push(segs);
  }
  // Thumb: from the side of the palm, angled across toward the fingertips.
  const tBase = new THREE.Group();
  tBase.position.set(0.032 * side, 0.025, 0.012);
  tBase.rotation.set(0.5, 0, -0.75 * side);
  const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.03, 3, 8), skin);
  t1.position.y = 0.022;
  tBase.add(t1);
  const tJoint = new THREE.Group();
  tJoint.position.y = 0.042;
  tJoint.rotation.set(thumb, 0, 0.45 * side);
  const t2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.022, 3, 8), skin);
  t2.position.y = 0.015;
  tJoint.add(t2);
  tBase.add(tJoint);
  hand.add(tBase);
  hand.userData.thumbTip = tJoint;
  // Wrist, forearm and the sleeve going down out of view.
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.2, 3, 10), skin);
  arm.scale.z = 0.75;
  arm.position.set(0, -0.09, 0);
  hand.add(arm);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.32, 14, 1, true), SLEEVE);
  sleeve.position.set(0, -0.3, 0);
  hand.add(sleeve);
  hand.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = false;
      c.receiveShadow = true;
    }
  });
  return hand;
}

const STICK = new THREE.MeshStandardMaterial({ color: 0xcfb07a, roughness: 0.8 });
const CHAR = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 });
const HEAD = new THREE.MeshStandardMaterial({ color: 0x6a1a14, roughness: 0.7 });


export class Hands {
  constructor(camera) {
    this.camera = camera;
    // Left hand: palm turned in toward the middle of the view, fingers
    // leaning forward, index and thumb pinching the match upright.
    this.left = new THREE.Group();
    this.leftHand = buildHand({ side: 1, curl: [0.75, 1.25, 1.35, 1.4], thumb: 0.35 });
    this.leftHand.rotation.order = "XYZ";
    this.leftHand.rotation.set(-0.75, Math.PI / 2, 0.15);
    this.left.add(this.leftHand);
    this.match = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.052, 0.0035), STICK);
    stick.position.y = 0.026;
    this.char = new THREE.Mesh(new THREE.BoxGeometry(0.0039, 1, 0.0039), CHAR);
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.0036, 8, 6), HEAD);
    this.head.scale.y = 1.4;
    this.head.position.y = 0.052;
    this.match.add(stick, this.char, this.head);
    // Held at the pinch, in camera space (kept upright whatever the hand does).
    this.match.position.set(0.045, 0.06, -0.035);
    this.left.add(this.match);
    this.flameAnchor = new THREE.Object3D();
    this.flameAnchor.position.y = 0.056;
    this.match.add(this.flameAnchor);
    camera.add(this.left);

    // Right hand: carrying, palm up.
    this.right = new THREE.Group();
    this.rightHand = buildHand({ side: -1, curl: [0.35, 0.4, 0.45, 0.5], thumb: 0.2 });
    this.rightHand.rotation.order = "XYZ";
    this.rightHand.rotation.set(-1.1, -0.2, 0.25);
    this.right.add(this.rightHand);
    this.holdAnchor = new THREE.Object3D();
    this.holdAnchor.position.set(-0.01, 0.07, 0.03);
    this.right.add(this.holdAnchor);
    camera.add(this.right);

    this.leftUp = 0; // 0 down, 1 raised
    this.rightUp = 0;
    this.leftTarget = 0;
    this.rightTarget = 0;
    this.strikeT = -1;
    this.burnt = 0;
    this.time = 0;
    this.tremble = 0.15; // old hands shake a little; more near Kaal
    this.layout();
  }

  layout() {
    const t = this.time;
    const shake = this.tremble * 0.004;
    const sx = Math.sin(t * 17.3) * shake + Math.sin(t * 29.1) * shake * 0.6;
    const sy = Math.cos(t * 13.7) * shake;
    const lu = easeOut(this.leftUp);
    let flick = 0;
    if (this.strikeT >= 0 && this.strikeT < 0.35) flick = Math.sin((this.strikeT / 0.35) * Math.PI);
    this.left.position.set(-0.13 + flick * 0.05 + sx, -0.36 + lu * 0.17 + sy, -0.34);
    this.left.rotation.set(0, 0, flick * -0.35);
    const ru = easeOut(this.rightUp);
    this.right.position.set(0.16 - sx, -0.38 + ru * 0.17 + sy, -0.36);
    this.left.visible = this.leftUp > 0.01;
    this.right.visible = this.rightUp > 0.01;
  }

  // 0 = fresh stick, 1 = burnt down to the fingers.
  setBurn(f) {
    this.burnt = f;
    const charLen = 0.004 + f * 0.042;
    this.char.scale.y = charLen;
    this.char.position.y = 0.052 - charLen / 2 + 0.001;
    this.head.visible = f < 0.05;
    this.char.visible = f >= 0.02;
    this.flameAnchor.position.y = 0.056 - f * 0.03;
  }

  update(dt) {
    this.time += dt;
    const k = 1 - Math.exp(-dt * 9);
    this.leftUp += (this.leftTarget - this.leftUp) * k;
    this.rightUp += (this.rightTarget - this.rightUp) * k;
    if (this.strikeT >= 0) this.strikeT += dt;
    this.layout();
  }
}

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}
