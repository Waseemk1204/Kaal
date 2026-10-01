// Kaal has you. (STORY §7a)
//
// One unbroken shot, slow on purpose. The match falls and keeps burning on
// the floor. Its hands come over your shoulders. You're lifted, turned to
// face it, and the ticking stops. Then you watch your own hands get forty
// years older in a few seconds: spots, paper skin, splits, blood that dries
// to black, nails lifting, flesh shrinking to bone, a finger dropping into
// the dark. A finger presses into your chest. Black, from the bottom up.
// Grey morning.

import * as THREE from "three";
import { buildHand } from "../world/hands.js";
import { buildArm, VOID } from "../kaal/body.js";
import { Flame } from "../world/flame.js";
import { SPOTS } from "../../shared/house-map.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;

// Skin that ages on a dial. uAge 0 → 1:
//   0.00–0.30  spots, creases, the colour going out of it
//   0.30–0.55  it splits; wet red underneath, blood welling
//   0.45–0.65  the blood darkens and dries to black flakes
//   0.70–1.00  the flesh shrinks back to bone, yellow, then grey
export function agingSkin() {
  const uniforms = { uAge: { value: 0 } };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uAge;\nvarying vec3 vLocal;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLocal = position;
        float shrink = smoothstep(0.7, 1.0, uAge);
        transformed -= normal * shrink * 0.0045;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uAge;
        varying vec3 vLocal;
        float ah(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float an(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(ah(i), ah(i + vec3(1,0,0)), f.x), mix(ah(i + vec3(0,1,0)), ah(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(ah(i + vec3(0,0,1)), ah(i + vec3(1,0,1)), f.x), mix(ah(i + vec3(0,1,1)), ah(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float wetness;`,
      )
      .replace(
        "#include <map_fragment>",
        `{
          float a = uAge;
          vec3 p = vLocal * 140.0;
          vec3 young = vec3(0.30, 0.13, 0.06);
          vec3 old = vec3(0.17, 0.09, 0.055);
          vec3 col = mix(young, old, smoothstep(0.0, 0.3, a));
          // Liver spots.
          float spots = an(p * 0.7);
          col = mix(col, vec3(0.10, 0.05, 0.025), step(1.0 - 0.32 * smoothstep(0.05, 0.3, a), spots) * 0.85);
          // Creases.
          float crease = abs(sin(vLocal.y * 900.0 + an(p) * 7.0));
          col *= 1.0 - smoothstep(0.88, 1.0, crease) * 0.6 * smoothstep(0.1, 0.35, a);
          // Splits: ridges in the noise open up.
          float ridge = 1.0 - abs(an(p * 0.35 + 3.7) * 2.0 - 1.0);
          float open = smoothstep(0.3, 0.55, a);
          float split = step(1.0 - 0.07 * open, ridge);
          float bleed = step(1.0 - 0.16 * open, ridge) * (1.0 - split);
          // Blood runs down from the splits, in thin lines.
          float run = step(0.8, an(vec3(vLocal.x * 420.0, vLocal.y * 25.0 + a * 5.0, vLocal.z * 420.0))) * step(0.45, an(p * 0.2)) * open;
          vec3 fresh = vec3(0.42, 0.012, 0.01);
          vec3 dried = vec3(0.045, 0.008, 0.005);
          float dry = smoothstep(0.45, 0.65, a);
          vec3 blood = mix(fresh, dried, dry);
          col = mix(col, vec3(0.5, 0.05, 0.04), split);
          col = mix(col, blood, clamp(bleed + run, 0.0, 1.0));
          // Bone, coming through.
          float bone = smoothstep(0.7, 0.95, a);
          vec3 boneCol = mix(vec3(0.55, 0.47, 0.32), vec3(0.22, 0.21, 0.19), smoothstep(0.92, 1.0, a));
          col = mix(col, boneCol, bone * (0.6 + 0.4 * an(p * 0.3)));
          diffuseColor.rgb = col;
          wetness = clamp((split + bleed + run) * (1.0 - dry), 0.0, 1.0);
        }`,
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(0.62, 0.95, smoothstep(0.5, 0.8, uAge)), 0.15, wetness);");
  };
  return m;
}

// The shirt over your chest, with somewhere for the blood to spread from.
function chestMaterial() {
  const uniforms = { uBlood: { value: 0 } };
  const m = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1 });
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLoc;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvLoc = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uBlood;\nvarying vec3 vLoc;\nfloat ch(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}")
      .replace(
        "#include <map_fragment>",
        `{
          vec2 q = vLoc.xy - vec2(0.0, 0.18);
          float d = length(q * vec2(1.0, 0.8)) + (ch(floor(vLoc.xy * 60.0)) - 0.5) * 0.04;
          float stain = smoothstep(uBlood * 0.32, uBlood * 0.32 - 0.05, d);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.0, 0.0), stain * step(0.001, uBlood));
        }`,
      );
  };
  return m;
}

export class DeathScene {
  constructor(game, { short = false, onDone }) {
    const g = (this.g = game);
    this.onDone = onDone;
    this.t = 0;
    this.done = false;
    this.mute = false;
    this.cues = new Set();
    this.overlay = document.createElement("div");
    Object.assign(this.overlay.style, { position: "absolute", inset: "0", pointerEvents: "none", background: "transparent" });
    document.querySelector("#app").appendChild(this.overlay);

    const p = g.player;
    this.base = { x: p.x, y: p.eyeHeight(), z: p.z, yaw: p.yaw, pitch: p.pitch };
    g.cameraOverride = true;
    g.kaal.presence = false;
    g.kaal.view.manual = true;
    g.ui.setPrompt("");
    g.ui.clearSubs();
    this.saveLook();

    // The match drops from your fingers (one catches as it falls if none
    // was burning) and keeps burning on the floor.
    const handPos = new THREE.Vector3(-0.2, -0.22, -0.36).applyMatrix4(g.camera.matrixWorld);
    g.dropMatch("death");
    g.hands.leftTarget = 0;
    g.hands.rightTarget = 0;
    this.dropped = new THREE.Group();
    this.dropped.position.copy(handPos);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.05, 0.0035), new THREE.MeshStandardMaterial({ color: 0x2a1a12 }));
    stick.position.y = 0.025;
    this.dropped.add(stick);
    const tip = new THREE.Object3D();
    tip.position.y = 0.052;
    this.dropped.add(tip);
    g.scene.add(this.dropped);
    this.droppedFlame = new Flame({ kind: "match", radius: 1.9, burn: 60, pool: g.pool, parent: tip, shadow: true });
    this.dropVel = new THREE.Vector3(-Math.sin(p.yaw) * 0.4, 0.4, -Math.cos(p.yaw) * 0.4);
    this.dropSpin = new THREE.Vector3(3, 1, 5);
    g.extraLights = [];

    // Its arms, over your shoulders (attached to the camera).
    this.arms = [buildArm(-1), buildArm(1)];
    for (const a of this.arms) {
      a.armRoot.rotation.x = 0; // hang straight along -y from the shoulder
      g.camera.add(a.shoulder);
    }
    // Your hands, raised in front of you (they'll age).
    this.skin = agingSkin();
    this.handL = buildHand({ side: 1, curl: [0.15, 0.2, 0.25, 0.3], thumb: 0.1, material: this.skin });
    this.handR = buildHand({ side: -1, curl: [0.15, 0.2, 0.25, 0.3], thumb: 0.1, material: this.skin });
    this.nails = [];
    this.loose = []; // falling bits
    for (const h of [this.handL, this.handR]) {
      h.visible = false;
      g.camera.add(h);
      for (const segs of h.userData.fingers) {
        const last = segs[segs.length - 1];
        const nail = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.003), new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.35 }));
        nail.position.set(0, last.userData.len * 0.75, -0.007);
        last.add(nail);
        this.nails.push(nail);
      }
    }
    // The finger that will snap off.
    this.snapFinger = this.handR.children.find((c) => c.isGroup && c.position.y > 0.08 && c.position.x < 0) || null;
    // Your chest, for the end.
    this.chestMat = chestMaterial();
    this.chest = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.7, 20, 1, true), this.chestMat);
    this.chest.position.set(0, -0.62, -0.08);
    this.chest.visible = false;
    g.camera.add(this.chest);
    // The match's glow from the floor, warm on your hands.
    this.glow = g.pool.take(false);
    if (this.glow) this.glow.color.set(0xff8a3a);
    // Blood drops.
    this.drops = [];

    if (short) this.fastForward(11.5);
  }

  saveLook() {
    const g = this.g;
    this.saved = {
      hemi: g.moon.hemi.intensity,
      hemiColor: g.moon.hemi.color.clone(),
      moon: g.moon.moon.intensity,
      fog: g.scene.fog?.density,
      fogColor: g.scene.fog?.color.clone(),
    };
  }

  fastForward(to) {
    this.mute = true;
    while (this.t < to) this.update(1 / 30);
    this.mute = false;
  }

  cue(name, fn) {
    if (this.cues.has(name)) return;
    this.cues.add(name);
    if (!this.mute) fn();
  }

  // Aim one of its arms from a shoulder point to a target, in camera space.
  aim(arm, shoulder, target, bend = 0.3) {
    arm.shoulder.position.copy(shoulder);
    const dir = target.clone().sub(shoulder);
    const len = dir.length();
    dir.normalize();
    arm.shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    arm.shoulder.scale.setScalar(Math.max(0.3, len / 1.47));
    // Bend the elbow outward (away from your face), not toward or behind.
    arm.upper.rotation.set(0, 0, arm.side * bend * 0.5);
    arm.fore.rotation.set(0, 0, -arm.side * bend);
    arm.hand.rotation.x = 0.35;
  }

  curl(arm, amount) {
    for (const segs of arm.fingers) segs.forEach((s, k) => (s.rotation.x = amount * (0.5 + k * 0.25)));
  }

  update(dt) {
    if (this.done) return;
    if (this.hold) dt = 0; // (testing: freeze the frame)
    const g = this.g;
    const e = g.sounds.e;
    this.t += dt;
    const t = this.t;
    const cam = g.camera;
    const fx = g.post.fx;

    // ---------------------------------------------------- the match falls
    if (this.dropped.position.y > 0.01) {
      this.dropVel.y -= 9.8 * dt;
      this.dropped.position.addScaledVector(this.dropVel, dt);
      this.dropped.rotation.x += this.dropSpin.x * dt;
      this.dropped.rotation.z += this.dropSpin.z * dt;
      if (this.dropped.position.y <= 0.01) {
        this.dropped.position.y = 0.01;
        this.dropped.rotation.set(Math.PI / 2, Math.random() * 3, 0);
        this.cue("land", () => e.burst({ duration: 0.05, gain: 0.08, freq: 3000, q: 2 }));
      }
    }
    if (this.droppedFlame.lit) this.droppedFlame.update(dt, 1);

    // All sound goes but the ticking, very close.
    g.duckOverride = t < 19 ? 0 : 1;
    g.kaal.silenced = t > 8.5 && t < 19;
    if (t < 8.5) g.kaal.audio.setPosition(cam.position.x, cam.position.y + 0.3, cam.position.z + 0.2);
    this.cue("start", () => e.tone({ freq: 40, type: "sine", duration: 3, gain: 0.2, attack: 0.4 }));

    // -------------------------------------------------------- the camera
    let y = this.base.y;
    let yaw = this.base.yaw;
    let pitch = this.base.pitch;
    let roll = 0;
    // 0–1.5: watch it fall.
    pitch = lerp(this.base.pitch, -1.0, ease(ramp(t, 0, 1.2)));
    // 1.5–4: hands come over your shoulders; you look at them.
    pitch = lerp(pitch, -0.45, ease(ramp(t, 1.8, 3.6)));
    // 4–6.5: lifted.
    const lift = ease(ramp(t, 4, 6.5));
    y = lerp(this.base.y, 2.55, lift);
    pitch = lerp(pitch, -0.75, ease(ramp(t, 4.2, 5.5)) * (1 - ramp(t, 5.8, 6.8)));
    roll = Math.sin(t * 1.3) * 0.04 * lift;
    // 6.5–9: turned around to face it.
    const turn = ease(ramp(t, 6.5, 8.8));
    yaw = this.base.yaw + Math.PI * turn;
    pitch = lerp(pitch, 0.02, ease(ramp(t, 6.8, 8.8)));
    // 9–15.5: made to look at your own hands.
    pitch = lerp(pitch, -0.42, ease(ramp(t, 9.2, 10.4)));
    // 15.5–17.5: down at your chest, then tipping back.
    pitch = lerp(pitch, -1.0, ease(ramp(t, 15.4, 16.2)));
    pitch = lerp(pitch, 0.75, ease(ramp(t, 16.6, 17.6)));
    roll += ramp(t, 16.6, 17.6) * 0.25;
    if (t < 19) {
      cam.position.set(this.base.x, y, this.base.z);
      cam.rotation.set(pitch, yaw, roll, "YXZ");
    }

    // ------------------------------------------------- its arms on you
    const behind = 1 - ease(ramp(t, 6.5, 8.8));
    const reachIn = ease(ramp(t, 1.5, 3.4));
    for (const arm of this.arms) {
      const s = arm.side;
      const shoulder = new THREE.Vector3(s * 0.34, lerp(0.35, 0.85, behind), lerp(-0.75, 0.8, behind));
      const from = new THREE.Vector3(s * 0.3, 0.45, 0.5);
      const grip = new THREE.Vector3(s * 0.15, -0.2, -0.36);
      const target = from.clone().lerp(grip, reachIn);
      // The finger that goes in.
      if (s > 0 && t > 15.6) target.lerp(new THREE.Vector3(0.02, -0.42, -0.08), ease(ramp(t, 15.6, 16.4)));
      this.aim(arm, shoulder, target, 0.15);
      this.curl(arm, 0.15 + 0.75 * ease(ramp(t, 2.8, 4.0)));
      arm.shoulder.visible = t > 1.4 && t < 17.8;
    }
    this.cue("grip", () => g.kaal.audio.knuckles(cam.position.x, cam.position.y + 0.2, cam.position.z, 7));
    if (t > 4.2) this.cue("tear", () => {
      for (let i = 0; i < 5; i += 1) e.burst({ duration: 0.25, gain: 0.12, freq: 2500, q: 0.8, delay: i * 0.3 });
    });
    if (!this.mute) g.sounds.body(dt, { heart: t < 16.5 ? lerp(2.4, 0.7, ramp(t, 9, 16)) : 0, breath: t < 9 ? 1.6 : t < 14 ? 0.5 : 0 });

    // --------------------------------------------- facing it: the head
    const k = g.kaal;
    const s = k.brain.state;
    if (t > 6.4 && t < 17.8) {
      const fwdYaw = this.base.yaw + Math.PI; // the way you're turned to
      const fx2 = -Math.sin(fwdYaw);
      const fz2 = -Math.cos(fwdYaw);
      s.present = true;
      s.mode = "still";
      s.x = this.base.x + fx2 * 0.62;
      s.z = this.base.z + fz2 * 0.62;
      s.y = 0;
      s.yaw = fwdYaw + Math.PI; // facing you
      const r = k.view.r;
      for (const a of r.arms) a.shoulder.visible = false; // its arms are on you
      const lower = ease(ramp(t, 7.5, 9.5));
      r.spine[0].rotation.x = Math.PI + 0.04;
      r.spine[1].rotation.x = -0.05;
      r.spine[2].rotation.x = -0.05;
      r.neck.rotation.x = -0.25 - 0.3 * lower;
      r.headPivot.rotation.x = 0.15 + 0.25 * lower;
      for (const d of k.view.shoulderDeco) d.visible = false;
      r.headPivot.rotation.z = Math.sin(t * 0.5) * 0.25 * lower + 0.3 * lower;
      r.hips.position.y = r.hipY + 0.05;
      for (const leg of r.legs) {
        leg.thigh.rotation.x = 0.05;
        leg.shin.rotation.x = -0.1;
      }
    } else if (t >= 17.8 && s.present) {
      for (const a of k.view.r.arms) a.shoulder.visible = true;
      k.brain.remove({ force: true });
    }

    // ------------------------------------------------------ your hands
    const showHands = t > 9 && t < 17.0;
    const raise = ease(ramp(t, 9, 10.2));
    for (const [h, side] of [
      [this.handL, -1],
      [this.handR, 1],
    ]) {
      h.visible = showHands;
      const shake = Math.sin(t * 23 + side) * 0.004 * (1 + ramp(t, 9, 15) * 2);
      h.position.set(side * 0.085 + shake, lerp(-0.55, -0.19, raise), -0.27);
      h.rotation.set(-0.25, side * 0.3, side * -0.1, "XYZ");
      // Fingers curling in as the tendons dry.
      for (const segs of h.userData.fingers) segs.forEach((j, n) => (j.rotation.x = 0.15 + n * 0.1 + ramp(t, 12, 15) * 0.5));
    }
    if (this.glow) {
      this.glow.position.set(0, -0.55, -0.15).applyMatrix4(cam.matrixWorld);
      this.glow.intensity = showHands ? 0.35 * (1 - ramp(t, 15, 17)) : 0;
    }
    const age = ramp(t, 9.6, 15.2);
    this.skin.userData.uniforms.uAge.value = age;
    if (t > 10.8) this.cue("wet", () => {
      for (let i = 0; i < 14; i += 1) e.burst({ duration: 0.08 + Math.random() * 0.1, gain: 0.12, freq: 300 + Math.random() * 500, q: 2, delay: i * 0.12 + Math.random() * 0.1 });
    });
    if (t > 12.3) this.cue("dry", () => {
      for (let i = 0; i < 18; i += 1) e.burst({ duration: 0.03, gain: 0.1, freq: 3000 + Math.random() * 3000, q: 3, delay: i * 0.1 + Math.random() * 0.08 });
    });
    // Blood running off the hands.
    if (age > 0.3 && age < 0.6 && showHands && Math.random() < dt * 14) this.drip();
    // Nails lift and fall.
    if (age > 0.48) this.cue("nails", () => {});
    if (age > 0.48) for (const n of this.nails) if (n.parent && n.parent !== cam && Math.random() < dt * 2.5) this.loosen(n);
    // A finger snaps.
    if (t > 13.4 && this.snapFinger) {
      this.cue("snap", () => {
        e.burst({ duration: 0.03, gain: 0.6, freq: 2000, q: 1.5 });
        e.tone({ freq: 90, type: "sine", duration: 0.15, gain: 0.3 });
      });
      this.loosen(this.snapFinger);
      this.snapFinger = null;
    }
    this.updateLoose(dt);

    // ------------------------------------------------------ the chest
    this.chest.visible = t > 15 && t < 17.8;
    this.chestMat.userData.uniforms.uBlood.value = ease(ramp(t, 15.9, 17.2));
    if (t > 15.9) this.cue("press", () => {
      e.tone({ freq: 70, type: "sine", duration: 1.4, gain: 0.5, slideTo: 30 });
      e.burst({ duration: 0.8, gain: 0.2, freq: 400, q: 0.6, type: "lowpass" });
    });

    // ------------------------------------------------------ the picture
    if (t < 19) this.picture(t, fx);
    // Black, from the bottom up.
    const wipe = ease(ramp(t, 17.4, 18.9)) * 115;
    this.overlay.style.background = t < 19 ? `linear-gradient(to top, #000 ${wipe - 15}%, transparent ${wipe}%)` : "transparent";

    // ------------------------------------------------- grey morning
    if (t >= 19) this.morning(t);
    if (t >= 23.5 && !this.done) this.finish();
  }

  picture(t, fx) {
    fx.desat = 0.2 + 0.8 * ease(ramp(t, 14.6, 16.4));
    fx.haze = ease(ramp(t, 14.2, 17)) * 0.9;
    fx.blood = ease(ramp(t, 15.9, 17.4)) * 0.9;
    fx.grain = 0.1 + ramp(t, 9, 17) * 0.1;
    fx.vignette = 0.7 + ramp(t, 9, 17) * 0.3;
    fx.aberration = 0.002 + ramp(t, 12, 17) * 0.004;
    fx.warp = ramp(t, 13, 17) * 0.6;
  }

  drip() {
    const g = this.g;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 6, 4), new THREE.MeshBasicMaterial({ color: 0x5a0000 }));
    const h = Math.random() < 0.5 ? this.handL : this.handR;
    m.position.set(h.position.x + (Math.random() - 0.5) * 0.06, h.position.y + 0.02, h.position.z + (Math.random() - 0.5) * 0.02);
    m.scale.y = 2.2;
    g.camera.add(m);
    this.loose.push({ obj: m, vy: -0.05, life: 1.5 });
  }

  // Detach a part (nail, finger) into camera space and let it fall.
  loosen(obj) {
    const cam = this.g.camera;
    cam.attach(obj);
    this.loose.push({ obj, vy: 0.02, life: 2.5, spin: (Math.random() - 0.5) * 6 });
  }

  updateLoose(dt) {
    for (const l of this.loose) {
      l.vy -= 1.6 * dt;
      l.obj.position.y += l.vy * dt;
      if (l.spin) l.obj.rotation.z += l.spin * dt;
      l.life -= dt;
      if (l.life <= 0) l.obj.parent?.remove(l.obj);
    }
    this.loose = this.loose.filter((l) => l.life > 0);
  }

  morning(t) {
    const g = this.g;
    if (!this.cues.has("morning")) {
      this.cues.add("morning");
      for (const a of this.arms) g.camera.remove(a.shoulder);
      g.camera.remove(this.handL, this.handR, this.chest);
      for (const l of this.loose) l.obj.parent?.remove(l.obj);
      this.loose = [];
      if (this.droppedFlame.lit) this.droppedFlame.out();
      g.kaal.brain.remove({ force: true });
      for (const m of Object.values(g.world.family.members)) m.setState("gone");
      g.world.props.setPhoto({ dadi: false, papa: false, mummy: false, munna: false }, { torn: true });
      // Your chair, pulled out and empty.
      const chair = g.world.props.chairs.munna;
      this.chairWas = { z: chair.position.z, ry: chair.rotation.y };
      chair.position.z += 0.35;
      chair.rotation.y += 0.35;
      // Dawn: flat grey light through the holes.
      g.moon.hemi.color.set(0xa8a49a);
      g.moon.hemi.intensity = 16;
      g.moon.moon.intensity = 1.5;
      g.scene.fog.color.set(0x5a5a56);
      g.scene.fog.density = 0.03;
      const fx = g.post.fx;
      fx.haze = 0;
      fx.blood = 0;
      fx.warp = 0;
      fx.desat = 0.55;
      fx.vignette = 0.6;
      fx.grain = 0.09;
      fx.aberration = 0.0015;
      g.camera.position.set(2.75, 1.55, 0.05);
      g.camera.rotation.set(-0.12, Math.PI / 2 - 0.12, 0, "YXZ");
      if (!this.mute) this.dawnSounds();
    }
    g.post.fx.fade = 1 - ease(ramp(t, 19, 20.5));
  }

  dawnSounds() {
    const e = this.g.sounds.e;
    if (!e.ctx) return;
    // A diesel engine idling outside: the bulldozer.
    const ctx = e.ctx;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 38;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 9;
    const lg = ctx.createGain();
    lg.gain.value = 8;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 180;
    const gn = ctx.createGain();
    gn.gain.value = 0.0001;
    gn.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 2);
    o.connect(f);
    f.connect(gn);
    gn.connect(e.sfx);
    o.start();
    lfo.start();
    this.engine = { o, lfo, gn };
    // Crows.
    for (let i = 0; i < 5; i += 1) {
      const d = 0.8 + i * (0.6 + Math.random() * 0.8);
      e.burst({ duration: 0.22, gain: 0.08, freq: 1100, q: 5, delay: d, slideTo: 800 });
      e.tone({ freq: 700, type: "sawtooth", duration: 0.2, gain: 0.015, delay: d, slideTo: 520 });
    }
  }

  finish() {
    this.done = true;
    this.onDone();
  }

  // Put the house back the way it was before the morning.
  dispose() {
    const g = this.g;
    this.overlay.remove();
    for (const a of this.arms) g.camera.remove(a.shoulder);
    g.camera.remove(this.handL, this.handR, this.chest);
    for (const l of this.loose) l.obj.parent?.remove(l.obj);
    this.droppedFlame.dispose();
    g.pool.give(this.glow);
    this.glow = null;
    g.scene.remove(this.dropped);
    if (this.engine) {
      const e = g.sounds.e;
      this.engine.gn.gain.setTargetAtTime(0, e.ctx.currentTime, 0.2);
      setTimeout(() => {
        this.engine.o.stop();
        this.engine.lfo.stop();
      }, 800);
    }
    if (this.chairWas) {
      const chair = g.world.props.chairs.munna;
      chair.position.z = this.chairWas.z;
      chair.rotation.y = this.chairWas.ry;
    }
    g.moon.hemi.intensity = this.saved.hemi;
    g.moon.hemi.color.copy(this.saved.hemiColor);
    g.moon.moon.intensity = this.saved.moon;
    if (g.scene.fog) {
      g.scene.fog.density = this.saved.fog;
      g.scene.fog.color.copy(this.saved.fogColor);
    }
    g.duckOverride = undefined;
    g.kaal.silenced = false;
    g.kaal.presence = true;
    g.kaal.view.manual = false;
    for (const a of g.kaal.view.r.arms) a.shoulder.visible = true;
    for (const d of g.kaal.view.shoulderDeco) d.visible = true;
    g.post.fx.fade = 0;
    void VOID;
    void SPOTS;
  }
}
