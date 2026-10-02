// The last dinner. (STORY §7b)
//
// The diya is lit and the room is 1987. You sit in your chair. Across the
// table, three people without faces eat dinner. Papa's watch moves on to
// 9:48. Mummy puts a roti on your plate, and when you reach for it you see
// your hand clearly for the first time: seventy years old. In the doorway,
// folded under the frame, Kaal waits. The oil goes down.
//
// Blow out the diya (letting go): it takes you at the table, and they stay
// with you while it does. Morning; the house comes down; the photograph has
// all four of you in it.
//
// Or wait (clinging): the light shrinks, and they go first, one by one, while
// you watch. Then the flame. Then Kaal. The photograph has three.

import * as THREE from "three";
import { SPOTS } from "../../shared/house-map.js";
import { buildHand, oldSkinMaterial } from "../world/hands.js";
import { buildArm } from "../kaal/body.js";
import { agingSkin } from "./death.js";
import { drawPhoto } from "../world/props.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;

export class Ending {
  constructor(game, director) {
    const g = (this.g = game);
    this.d = director;
    this.t = 0;
    this.phase = "dinner"; // dinner → choice → taking → morning → card
    this.cues = new Set();
    this.choice = null;
    g.cameraOverride = true;
    g.kaal.presence = false;
    g.dropMatch("ending");
    g.hands.leftTarget = 0;
    g.hands.rightTarget = 0;
    g.ui.setPrompt("");
    g.ui.clearSubs();

    const cam = g.camera;
    this.from = { pos: cam.position.clone(), yaw: g.player.yaw, pitch: g.player.pitch };
    const seat = SPOTS.seat.munna;
    this.seat = new THREE.Vector3(seat.x, 1.22, seat.z * 1.05);

    // Kaal in the Dadi's-room doorway, folded under the frame, held.
    const k = g.kaal;
    if (!k.seenBy() || !k.present) k.place(-2.85, -0.05, { force: true, yaw: -Math.PI / 2, mode: "held" });
    const s = k.brain.state;
    s.mode = "still"; // settles into the fold, then the light holds it
    s.speed = 0;
    s.folding = 1;
    s.head = 0.6;
    k.silenced = true; // only Papa's watch ticks now

    // A roti for you, and the hand that reaches for it.
    this.roti = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.006, 20), new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 0.9 }));
    this.roti.visible = false;
    g.scene.add(this.roti);
    // (Built as a left hand and turned over, it reads as your right, palm down.)
    this.reach = buildHand({ side: 1, curl: [0.25, 0.3, 0.35, 0.4], thumb: 0.2, material: oldSkinMaterial() });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0105, 0.0025, 6, 16), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.9, roughness: 0.4 }));
    ring.rotation.x = Math.PI / 2;
    const ringFinger = this.reach.userData.fingers[2][0];
    ring.position.y = 0.01;
    ringFinger.add(ring);
    this.reach.visible = false;
    g.camera.add(this.reach);

    const fam = g.world.family.members;
    fam.papa.anim = (t, p) => {
      // Checking his watch.
      const k2 = this.t > 8 && this.t < 12 ? ease(ramp(this.t, 8, 8.8)) * (1 - ease(ramp(this.t, 11, 12))) : 0;
      p.arms[0].upper.rotation.x = 0.55 + k2 * 0.6;
      p.arms[0].fore.rotation.x = 0.9 + k2 * 1.2;
      p.head.rotation.x = k2 * 0.4;
    };
    fam.mummy.anim = (t, p) => {
      // Serving you a roti.
      const k2 = this.t > 13 && this.t < 16 ? ease(ramp(this.t, 13, 14)) * (1 - ease(ramp(this.t, 15, 16))) : 0;
      p.arms[0].upper.rotation.x = 0.55 + k2 * 0.6;
      p.arms[0].upper.rotation.z = -0.12 - k2 * 0.6;
      p.torso.rotation.y = -k2 * 0.4;
      // And later, still eating, unbothered.
      if (this.phase === "taking") p.arms[1].fore.rotation.x = 0.9 + Math.max(0, Math.sin(t * 0.9)) * 0.4;
    };
    fam.dadi.anim = (t, p) => {
      const talking = this.t > 18 && this.t < 21 ? 1 : 0;
      p.head.rotation.x = Math.sin(t * 3) * 0.05 * talking;
      p.head.rotation.y = -0.2 * talking;
    };
    this.lines = [
      { at: 4, who: "MUMMY", text: "What took you so long? The food's gone cold.", time: 3.6, id: "mummy-late" },
      { at: 8.4, who: "PAPA", text: "Quarter to ten.", time: 2.6, id: "papa-quarter" },
      { at: 11.2, text: "<em>The second hand moves. 9:48.</em>", time: 2.8 },
      { at: 15.6, text: "<em>Your hand. Spotted, thin-skinned, a wedding ring worn thin. Seventy years old.</em>", time: 2.6 },
      { at: 18.4, who: "DADI", text: "Look how grown you are, Munna.", time: 3.6, id: "dadi-grown" },
      { at: 22.5, text: "<em>In the doorway, Kaal waits.</em>", time: 3.4 },
    ];
  }

  update(dt) {
    const g = this.g;
    if (g.state === "paused") return;
    this.t += dt;
    const t = this.t;
    const cam = g.camera;
    const e = g.sounds.e;

    if (t > 0.8) g.kaal.brain.state.mode = "held";
    for (const l of this.lines) {
      if (!l.done && t >= l.at) {
        l.done = true;
        g.ui.say({ who: l.who, text: l.text, time: l.time });
        if (l.id) g.voice?.play(l.id);
      }
    }

    // Papa's watch, ticking: time moving again.
    if (t > 11 && Math.floor(t) !== Math.floor(t - dt) && this.phase !== "morning") e.tone({ freq: 2400, type: "triangle", duration: 0.025, gain: 0.05, out: e.tab });

    // ------------------------------------------------- sit down, look
    if (this.phase === "dinner" || this.phase === "choice") {
      const k = ease(ramp(t, 0, 3));
      cam.position.lerpVectors(this.from.pos, this.seat, k);
      let yaw = lerp(this.from.yaw, 0, k);
      let pitch = lerp(this.from.pitch, -0.28, k);
      // Your hand, reaching for the roti (look down at it).
      pitch = lerp(pitch, -0.5, ease(ramp(t, 14.5, 15.5)) * (1 - ease(ramp(t, 20.5, 21.5))));
      // A look at the doorway.
      yaw = lerp(yaw, 0.95, ease(ramp(t, 22, 24)) * (1 - ease(ramp(t, 26.5, 28.5))));
      cam.rotation.set(pitch, yaw, 0, "YXZ");
      // The diya swells to fill the room.
      if (g.diya) g.diya.maxRadius = lerp(1.5, 7.5, ease(ramp(t, 0, 2.5)));
    }
    if (t > 14 && !this.roti.visible) {
      const p = SPOTS.plate.munna;
      this.roti.position.set(p.x - 0.02, 0.8, p.z + 0.02);
      this.roti.visible = true;
      e.burst({ duration: 0.1, gain: 0.04, freq: 800, q: 1 });
    }
    // Your hand: old, spotted, a wedding ring worn thin. It trembles.
    if (t > 14.8 && t < 21.5) {
      const k = ease(ramp(t, 14.8, 16.2)) * (1 - ease(ramp(t, 20.6, 21.5)));
      // In front of your eyes: the back of the hand, palm down, reaching.
      this.reach.visible = k > 0.02;
      this.reach.position.set(lerp(0.2, 0.04, k) + Math.sin(t * 19) * 0.003, lerp(-0.42, -0.15, k) + Math.cos(t * 23) * 0.002, lerp(-0.22, -0.3, k));
      this.reach.scale.setScalar(1.25);
      this.reach.rotation.set(-Math.PI / 2 + 0.35, Math.PI, 0.1, "XYZ");
    } else this.reach.visible = false;

    // ----------------------------------------------------- the choice
    if (t > 26 && this.phase === "dinner") {
      this.phase = "choice";
      this.choiceAt = t;
      g.diya.left = Math.min(g.diya.left, 45);
      g.diyaRate = 1;
    }
    this.ownsPrompt = this.phase === "choice";
    if (this.phase === "choice") {
      g.ui.setPrompt("Blow out the diya — or wait", "E");
      if (g.input.hit("e")) this.decide("accept");
      // Clinging: as the oil goes, so do they.
      const fuel = g.diya?.fuel ?? 0;
      const fam = g.world.family.members;
      if (fuel < 0.6) this.dissolve(fam.papa, "papa");
      if (fuel < 0.45) this.dissolve(fam.dadi, "dadi");
      if (fuel < 0.3) this.dissolve(fam.mummy, "mummy");
      if (!g.diya?.lit) this.decide("cling");
    }

    if (this.phase === "taking") this.taking(dt);
    if (this.phase === "morning") this.morning(dt);
    this.updateAsh(dt);
  }

  dissolve(person, id) {
    if (this.cues.has(`gone-${id}`)) return;
    this.cues.add(`gone-${id}`);
    const g = this.g;
    // To ash, from the edges in.
    const p = new THREE.Vector3();
    person.parts.head.getWorldPosition(p);
    this.ashBurst(p);
    person.setState("gone");
    const e = g.sounds.e;
    e.burst({ duration: 1.6, gain: 0.08, freq: 1200, q: 0.5, attack: 0.3 });
    if (id === "mummy") {
      g.ui.say({ text: "<em>She reaches for you. Her hand crumbles before it gets there.</em>", time: 4 });
      for (let i = 0; i < 4; i += 1) e.tone({ freq: 2800 + i * 340, type: "sine", duration: 0.9, gain: 0.03, delay: i * 0.05 });
    }
  }

  ashBurst(at) {
    const g = this.g;
    if (!this.ash) {
      const n = 400;
      const geo = new THREE.BufferGeometry();
      this.ashPos = new Float32Array(n * 3).fill(-50);
      this.ashVel = new Float32Array(n * 3);
      geo.setAttribute("position", new THREE.BufferAttribute(this.ashPos, 3));
      this.ash = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x6a6660, size: 0.018, transparent: true, opacity: 0.8 }));
      this.ash.frustumCulled = false;
      g.scene.add(this.ash);
      this.ashNext = 0;
    }
    for (let i = 0; i < 130; i += 1) {
      const k = (this.ashNext++ % 400) * 3;
      this.ashPos[k] = at.x + (Math.random() - 0.5) * 0.5;
      this.ashPos[k + 1] = at.y - Math.random() * 0.9;
      this.ashPos[k + 2] = at.z + (Math.random() - 0.5) * 0.4;
      this.ashVel[k] = (Math.random() - 0.5) * 0.1;
      this.ashVel[k + 1] = -0.2 - Math.random() * 0.4;
      this.ashVel[k + 2] = (Math.random() - 0.5) * 0.1;
    }
  }

  updateAsh(dt) {
    if (!this.ash) return;
    for (let k = 0; k < this.ashPos.length; k += 3) {
      if (this.ashPos[k + 1] < -10) continue;
      this.ashPos[k] += this.ashVel[k] * dt;
      this.ashPos[k + 1] = Math.max(0.01, this.ashPos[k + 1] + this.ashVel[k + 1] * dt);
      this.ashPos[k + 2] += this.ashVel[k + 2] * dt;
    }
    this.ash.geometry.attributes.position.needsUpdate = true;
  }

  decide(choice) {
    if (this.choice) return;
    const g = this.g;
    this.choice = choice;
    g.log?.log("ending", { choice });
    g.log?.log("act", { name: `end-${choice}` });
    this.phase = "taking";
    this.takeAt = this.t;
    g.ui.setPrompt("");
    const e = g.sounds.e;
    if (choice === "accept") {
      // A breath, and the flame goes. An ember stays a while, enough to see them by.
      e.burst({ duration: 0.6, gain: 0.15, freq: 600, q: 0.5, type: "lowpass", attack: 0.05 });
      this.ember = { x: 0, y: 1.0, z: 0, radius: 2.0 };
      if (g.diya) {
        g.diya.dispose();
        g.diya = null;
      }
      g.extraLights = [this.ember];
      this.emberLight = g.pool.take(false);
      this.emberLight.color.set(0xff5a1a);
      this.emberLight.position.set(0, 1.0, 0);
    } else {
      g.extraLights = [];
    }
    // Its hands, from behind you, over your shoulders. Gently, this time.
    this.arms = [buildArm(-1), buildArm(1)];
    for (const a of this.arms) {
      a.armRoot.rotation.x = 0;
      g.camera.add(a.shoulder);
    }
    // Your hands on the tablecloth, beside your plate.
    this.skin = agingSkin();
    this.hands = [buildHand({ side: 1, curl: [0.1, 0.12, 0.14, 0.16], thumb: 0.1, material: this.skin }), buildHand({ side: -1, curl: [0.1, 0.12, 0.14, 0.16], thumb: 0.1, material: this.skin })];
    const p = SPOTS.plate.munna;
    this.hands.forEach((h, i) => {
      h.position.set(p.x + (i ? 0.2 : -0.2), 0.8, p.z + 0.32);
      h.rotation.set(-Math.PI / 2, 0, i ? 0.25 : -0.25, "YXZ");
      g.scene.add(h);
    });
    this.roti.visible = false;
  }

  taking(dt) {
    const g = this.g;
    const t = this.t - this.takeAt;
    const cam = g.camera;
    const e = g.sounds.e;
    // Looking down at your hands on the table.
    cam.position.copy(this.seat);
    cam.rotation.set(lerp(-0.28, -0.85, ease(ramp(t, 0.5, 2.5))) + ramp(t, 9.5, 11) * 0.9, 0, ramp(t, 9.5, 11) * 0.2, "YXZ");
    // The ember dies slowly.
    if (this.ember) {
      this.ember.radius = lerp(2.0, 1.4, ramp(t, 0, 10));
      this.emberLight.intensity = 1.6 * (1 - ramp(t, 8, 11)) * (0.85 + Math.random() * 0.15);
    }
    for (const arm of this.arms) {
      const s = arm.side;
      const shoulder = new THREE.Vector3(s * 0.34, 0.85, 0.8);
      const target = new THREE.Vector3(s * 0.3, 0.45, 0.5).lerp(new THREE.Vector3(s * 0.15, -0.22, -0.34), ease(ramp(t, 1.0, 3.6)));
      arm.shoulder.position.copy(shoulder);
      const dir = target.clone().sub(shoulder);
      const len = dir.length();
      arm.shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
      arm.shoulder.scale.setScalar(Math.max(0.3, len / 1.47));
      arm.hand.rotation.x = 0.35;
      for (const segs of arm.fingers) segs.forEach((sg, k) => (sg.rotation.x = (0.1 + 0.6 * ease(ramp(t, 3, 4.5))) * (0.5 + k * 0.25)));
    }
    if (t > 1.5) this.cue("grip", () => g.kaal.audio.knuckles(cam.position.x, cam.position.y + 0.2, cam.position.z, 5));
    const age = ramp(t, 3.5, 9.5);
    this.skin.userData.uniforms.uAge.value = age;
    if (age > 0.25) this.cue("wet", () => {
      for (let i = 0; i < 10; i += 1) e.burst({ duration: 0.1, gain: 0.1, freq: 300 + Math.random() * 400, q: 2, delay: i * 0.14 });
    });
    if (age > 0.55) this.cue("dry", () => {
      for (let i = 0; i < 14; i += 1) e.burst({ duration: 0.03, gain: 0.08, freq: 3000 + Math.random() * 3000, q: 3, delay: i * 0.1 });
    });
    g.sounds.body(dt, { heart: t < 9 ? lerp(1.6, 0.6, ramp(t, 2, 9)) : 0, breath: t < 7 ? 0.4 : 0 });
    const fx = g.post.fx;
    fx.desat = 0.2 + 0.7 * ease(ramp(t, 6.5, 10));
    fx.haze = ease(ramp(t, 7, 10.5)) * 0.8;
    fx.vignette = 0.6 + ramp(t, 3, 10) * 0.4;
    fx.fade = ease(ramp(t, 10, 12));
    if (t > 12.5) this.toMorning();
  }

  cue(name, fn) {
    if (this.cues.has(name)) return;
    this.cues.add(name);
    fn();
  }

  toMorning() {
    const g = this.g;
    this.phase = "morning";
    this.mornAt = this.t;
    for (const a of this.arms) g.camera.remove(a.shoulder);
    for (const h of this.hands) g.scene.remove(h);
    g.extraLights = [];
    if (this.emberLight) g.pool.give(this.emberLight);
    g.kaal.brain.remove({ force: true });
    for (const m of Object.values(g.world.family.members)) m.setState("gone");
    const fx = g.post.fx;
    fx.haze = 0;
    fx.desat = 0.5;
    fx.vignette = 0.55;
    g.moon.hemi.color.set(0xa8a49a);
    g.moon.hemi.intensity = 16;
    g.moon.moon.intensity = 1.5;
    g.scene.fog.color.set(0x6a6a66);
    g.scene.fog.density = 0.03;
    g.camera.position.set(2.75, 1.55, 0.05);
    g.camera.rotation.set(-0.08, Math.PI / 2 - 0.12, 0, "YXZ");
    this.dust = [];
    this.engine();
  }

  engine() {
    const e = this.g.sounds.e;
    if (!e.ctx) return;
    const ctx = e.ctx;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 42;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 200;
    const gn = ctx.createGain();
    gn.gain.value = 0.0001;
    gn.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 3);
    o.connect(f);
    f.connect(gn);
    gn.connect(e.sfx);
    o.start();
    this.eng = { o, gn };
  }

  // The bulldozer: the house comes down around the table.
  morning(dt) {
    const g = this.g;
    const t = this.t - this.mornAt;
    const e = g.sounds.e;
    g.post.fx.fade = 1 - ease(ramp(t, 0, 2)) + ease(ramp(t, 9, 11));
    if (t > 4) {
      g.camera.position.x = 2.75 + (Math.random() - 0.5) * 0.03 * ramp(t, 4, 6);
      g.camera.position.y = 1.55 + (Math.random() - 0.5) * 0.03 * ramp(t, 4, 6);
      if (Math.random() < dt * 2.5) {
        e.burst({ duration: 0.8, gain: 0.25, freq: 200, q: 0.5, type: "lowpass" });
        e.burst({ duration: 0.3, gain: 0.12, freq: 1800, q: 1, delay: 0.1 });
        // Plaster falling.
        const chunk = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.12), new THREE.MeshStandardMaterial({ color: 0x8a867c }));
        chunk.position.set(-2 + Math.random() * 4, 3.1, -2 + Math.random() * 4);
        g.scene.add(chunk);
        this.dust.push({ m: chunk, vy: 0 });
      }
    }
    for (const d of this.dust) {
      d.vy -= 9.8 * dt;
      d.m.position.y = Math.max(0.03, d.m.position.y + d.vy * dt);
      d.m.rotation.x += dt * 3;
    }
    if (t > 11 && !this.carded) this.card();
  }

  card() {
    const g = this.g;
    this.carded = true;
    this.d.constructor.forget(); // it's over
    if (this.eng) this.eng.gn.gain.setTargetAtTime(0, g.sounds.e.ctx.currentTime, 0.8);
    // The photograph from the rubble.
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 360;
    const accept = this.choice === "accept";
    drawPhoto(c.getContext("2d"), c.width, c.height, accept ? { dadi: true, papa: true, mummy: true, munna: true } : { dadi: true, papa: true, mummy: true, munna: false }, { torn: !accept });
    g.ui.hide();
    g.ui.showCard(
      accept ? "EVERYTHING LASTS ONLY A WHILE." : "KAAL EATS EVERYONE.",
      accept ? "That's what made it precious." : "You held on. They went first.",
      [
        { label: "Begin again", onClick: () => location.reload() },
      ],
      { image: c.toDataURL() },
    );
    g.look.disable();
  }
}
