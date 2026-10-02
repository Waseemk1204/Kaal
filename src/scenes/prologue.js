// Sunday, 1987. 9:44 PM. (STORY §5, Prologue)
//
// You're nine, at the table, at a child's eye height. The fan turns, the TV
// mutters, Mummy serves, Papa grumbles at the news, and Dadi tells you what
// Kaal looks like (every line of it a rule of the game). The power starts to
// go. Mummy sends you for the matches. Each time the tube light stutters,
// something at the table has changed — if you turn around to look. Then
// black. Then a match, and the room as it was, empty. Then the dark, and
// the room as it is.

import * as THREE from "three";
import { SPOTS } from "../../shared/house-map.js";
import { PLAYER } from "../../shared/rules.js";
import { itemModel } from "../world/items.js";
import { lightAmount } from "../../shared/light.js";

const VOICE = { MUMMY: 230, PAPA: 120, DADI: 300 };

export class Prologue {
  constructor(game, onDone) {
    const g = (this.g = game);
    this.onDone = onDone;
    this.t = 0;
    this.phase = "dinner"; // dinner → fetch → dark → strike → after
    this.cues = new Set();
    this.flicker = 0;
    this.flickers = 0;
    this.lines = [];
    const w = g.world;

    // 1987, everywhere.
    g.eraForce = 1;
    g.cameraOverride = false;
    this.moonWas = { hemi: g.moon.hemi.intensity, moon: g.moon.moon.intensity, color: g.moon.hemi.color.clone(), fog: g.scene.fog.density };
    g.moon.moon.intensity = 0;
    g.moon.hemi.intensity = 2.2;
    g.moon.hemi.color.set(0xd8d0c0);
    g.scene.fog.density = 0.02;
    // The tube light and the TV's glow.
    this.tubeLight = g.pool.take(false);
    this.tubeLight.color.set(0xe8f0ff);
    this.tubeLight.position.set(-1.6, 2.0, -2.1);
    this.tvLight = g.pool.take(false);
    this.tvLight.color.set(0x9ab8d8);
    this.tvLight.position.set(2.25, 1.0, 1.6);
    w.fan = 1;
    w.tube = 1.6;

    // The family, at dinner.
    const fam = w.family.members;
    for (const m of Object.values(fam)) m.setState("solid");
    fam.dadi.hasSpectacles = true;
    fam.dadi.setState("solid");
    this.gestures();

    // You: nine years old, in your chair.
    const seat = SPOTS.seat.munna;
    g.player.place(seat.x, seat.z * 1.05, 0);
    g.player.eye = PLAYER.childEye;
    g.player.pitch = -0.2;
    g.inv.ab = 0;
    g.state = "play"; // you can look around; you can't get up yet
    g.player.frozen = false;
    this.seated = true;
    g.look.enable();
    g.ui.show();

    // Steam off the food.
    this.steam = this.makeSteam(g.scene);
    // The matchbox on the sideboard, and things left behind on the table.
    this.box = itemModel("abMatches");
    this.box.position.set(-0.35, 0.91, -2.15);
    g.scene.add(this.box);
    this.boxIt = g.addInteractable({
      pos: this.box.position.clone(),
      label: "Take the matches",
      enabled: false,
      use: () => this.takeBox(),
    });
    this.leftovers = [];
    this.sounds();
    this.script();
    // Seen it before? Hold Space to skip to the dark.
    this.canSkip = (() => {
      try {
        return localStorage.getItem("kaal.prologueSeen") === "1";
      } catch {
        return false;
      }
    })();
    if (this.canSkip) setTimeout(() => this.phase !== "dark" && g.ui.note("Hold Space to skip", 3), 1200);
    this.skipHeld = 0;
  }

  skip() {
    const g = this.g;
    g.ui.clearSubs();
    for (const l of this.lines) l.done = true;
    for (const m of Object.values(g.world.family.members)) m.setState("gone");
    this.seated = false;
    this.phase = "fetch";
    this.flickers = 5;
    this.hasBox = true;
    g.inv.ab = 8;
    g.player.place(SPOTS.start.x, SPOTS.start.z, SPOTS.start.yaw); // at the sideboard, facing the table
    g.player.eye = PLAYER.childEye;
    this.blackout();
  }

  // ---------------------------------------------------------- dialogue
  script() {
    const L = (at, who, text, time, id) => this.lines.push({ at, who, text, time, id });
    L(1.0, "MUMMY", "Eat properly, Munna. Not just the rice.", 2.8, "mummy-eat");
    L(4.0, "DADI", "Do you know what Kaal looks like, Munna?", 3.0, "dadi-know");
    L(7.2, "DADI", "So tall it bows at every door. And no face. Faces are the first thing it takes.", 4.6, "dadi-tall");
    L(12.0, "PAPA", "Amma, don't scare the boy.", 2.4, "papa-scare");
    L(14.6, "DADI", "It never runs. Why would it hurry? Everyone comes to it in the end.", 4.2, "dadi-runs");
    L(19.2, "DADI", "Only one thing stops it. As long as the lamp burns, Kaal waits.", 4.6, "dadi-lamp");
    L(24.6, "PAPA", "There goes the power again.", 2.4, "papa-power");
    L(27.2, "MUMMY", "Munna, get the matches. On the sideboard.", 3.0, "mummy-matches");
  }

  // Wordless murmur under a line: a voice-shaped sound, no words.
  babble(who, seconds) {
    const e = this.g.sounds.e;
    if (!e.ctx) return;
    const base = VOICE[who] ?? 200;
    const syll = Math.floor(seconds * 3.2);
    for (let i = 0; i < syll; i += 1) {
      const d = i * (seconds / syll) * 0.85 + Math.random() * 0.05;
      const f = base * (0.9 + Math.random() * 0.25);
      e.tone({ freq: f, type: "triangle", duration: 0.16, gain: 0.018, delay: d, out: e.tab, attack: 0.03 });
      e.burst({ duration: 0.14, gain: 0.012, freq: f * 4.5, q: 6, delay: d, out: e.tab, attack: 0.03 });
    }
  }

  gestures() {
    const fam = this.g.world.family.members;
    // Mummy serves: the right arm reaching across, now and then.
    fam.mummy.anim = (t, p) => {
      const k = Math.max(0, Math.sin(t * 0.7)) ** 3;
      p.arms[1].upper.rotation.x = 0.55 + k * 0.7;
      p.arms[1].fore.rotation.x = 0.9 - k * 0.6;
      p.torso.rotation.x = -0.05 - k * 0.15;
      if (k > 0.95 && !this.chimed) {
        this.chimed = true;
        const e = this.g.sounds.e;
        for (let i = 0; i < 3; i += 1) e.tone({ freq: 3000 + i * 400, type: "sine", duration: 0.5, gain: 0.02, delay: i * 0.04, out: e.tab });
      }
      if (k < 0.5) this.chimed = false;
    };
    // Papa: watching the TV over his shoulder, lifting his glass.
    fam.papa.anim = (t, p) => {
      p.head.rotation.y = -0.6 + Math.sin(t * 0.2) * 0.1;
      const k = Math.max(0, Math.sin(t * 0.33 + 2)) ** 6;
      p.arms[0].upper.rotation.x = 0.55 + k * 0.6;
      p.arms[0].fore.rotation.x = 0.9 + k * 0.9;
    };
    // Dadi: telling it, one hand lifting.
    fam.dadi.anim = (t, p) => {
      const talking = this.speaking === "DADI" ? 1 : 0;
      const k = talking * (0.5 + 0.5 * Math.sin(t * 2.1));
      p.arms[1].upper.rotation.x = 0.55 + k * 0.5;
      p.arms[1].fore.rotation.x = 0.9 + k * 0.8;
      p.head.rotation.x = Math.sin(t * 3) * 0.05 * talking;
      p.head.rotation.y = 0.15 * talking;
    };
  }

  makeSteam(scene) {
    const n = 60;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8d4cc, map: new THREE.CanvasTexture(c), size: 0.06, transparent: true, opacity: 0.12, depthWrite: false }));
    pts.frustumCulled = false;
    scene.add(pts);
    this.steamLife = new Float32Array(n).map(() => Math.random() * 2);
    return pts;
  }

  updateSteam(dt, visible) {
    const pts = this.steam;
    pts.visible = visible;
    if (!visible) return;
    const pos = pts.geometry.attributes.position.array;
    const plates = Object.values(SPOTS.plate);
    for (let i = 0; i < this.steamLife.length; i += 1) {
      this.steamLife[i] -= dt;
      if (this.steamLife[i] <= 0) {
        const p = plates[i % plates.length];
        pos[i * 3] = p.x - 0.06 + (Math.random() - 0.5) * 0.04;
        pos[i * 3 + 1] = 0.82;
        pos[i * 3 + 2] = p.z - 0.05 + (Math.random() - 0.5) * 0.04;
        this.steamLife[i] = 1.5 + Math.random();
      }
      pos[i * 3] += Math.sin(this.t * 2 + i) * 0.01 * dt;
      pos[i * 3 + 1] += 0.08 * dt;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  }

  // ------------------------------------------------------------- sound
  sounds() {
    const e = this.g.sounds.e;
    if (!e.ctx) return;
    // The wall clock, ticking (it will stop).
    this.clockTimer = setInterval(() => {
      if (this.clockStopped || !e.ctx) return;
      e.tone({ freq: 1800, type: "triangle", duration: 0.03, gain: 0.05, out: e.tab });
    }, 1000);
  }

  // --------------------------------------------------------- the flickers
  // The tube light dies for a moment; when it comes back, something's gone.
  doFlicker(change) {
    this.flicker = 0.45 + Math.random() * 0.25;
    this.pendingChange = change;
    this.flickers += 1;
    const e = this.g.sounds.e;
    e.burst({ duration: 0.08, gain: 0.06, freq: 120, q: 2, out: e.tab });
    e.tone({ freq: 100, type: "square", duration: 0.12, gain: 0.02, out: e.tab });
  }

  change(n) {
    const g = this.g;
    const fam = g.world.family.members;
    const plate = (id) => SPOTS.plate[id];
    const leave = (kind, id, dx = 0.12, dz = 0) => {
      const m = itemModel(kind);
      m.position.set(plate(id).x + dx, 0.79, plate(id).z + dz);
      g.scene.add(m);
      this.leftovers.push(m);
    };
    if (n === 1) {
      fam.dadi.setState("gone");
      leave("spectacles", "dadi", 0.0, 0.0);
    }
    if (n === 2) this.clockStopped = true;
    if (n === 3) {
      fam.papa.setState("gone");
      leave("watch", "papa", 0.14, 0.05);
      this.tvSnow = true;
      this.tvSnowSound = g.sounds.e.loop({ kind: "white", freq: 4000, q: 0.3, type: "highpass", gain: 0.02, out: g.sounds.e.tab });
    }
    if (n === 4) fam.mummy.setState("gone");
  }

  takeBox() {
    const g = this.g;
    g.scene.remove(this.box);
    this.boxIt.enabled = false;
    g.inv.ab = 8;
    g.ui.showMatches(8, 0, 0, 2);
    this.hasBox = true;
    this.boxAt = this.t;
  }

  // ------------------------------------------------------------- frame
  update(dt) {
    const g = this.g;
    if (g.state === "paused") return;
    this.t += dt;
    const t = this.t;
    const e = g.sounds.e;

    // Skip (only once you've seen it).
    if (this.canSkip && (this.phase === "dinner" || this.phase === "fetch")) {
      this.skipHeld = g.input.down(" ") ? this.skipHeld + dt : 0;
      g.ui.setHold(this.skipHeld / 0.8);
      if (this.skipHeld > 0.8) {
        g.ui.setHold(0);
        this.skip();
      }
    }

    // Lines.
    for (const l of this.lines) {
      if (!l.done && t >= l.at) {
        l.done = true;
        g.ui.say({ who: l.who, text: l.text, time: l.time });
        this.speaking = l.who;
        this.speakEnd = t + l.time;
        // A recorded line if there is one; otherwise a wordless murmur.
        if (!g.voice?.play(l.id, { muffled: false })) this.babble(l.who, l.time * 0.8);
      }
    }
    if (t > this.speakEnd) this.speaking = null;

    // Seated: you can look, not walk.
    if (this.seated) {
      const seat = SPOTS.seat.munna;
      g.player.x = seat.x;
      g.player.z = seat.z * 1.05;
    }

    // The power begins to go.
    if (t > 23 && this.phase === "dinner") {
      g.world.fan = 0.35;
      if (!this.cues.has("stutter") && t > 24) {
        this.cues.add("stutter");
        this.doFlicker(null);
      }
    }
    if (t > 30.5 && this.phase === "dinner") {
      // Get up: go and fetch the matches.
      this.phase = "fetch";
      this.seated = false;
      this.fetchAt = t;
      this.boxIt.enabled = true;
      g.ui.note("Get the matches from the sideboard.", 4);
    }
    if (this.phase === "fetch") {
      const s = t - this.fetchAt;
      if (s > 2.5 && this.flickers < 2) this.doFlicker(1);
      if (s > 5 && this.flickers < 3) this.doFlicker(2);
      if (s > 7.5 && this.flickers < 4) this.doFlicker(3);
      if ((this.hasBox && t - this.boxAt > 1.0) || s > 25) {
        if (this.flickers < 5) this.doFlicker(4);
      }
      if (this.flickers >= 5 && this.flicker <= 0 && !this.cues.has("black")) {
        this.cues.add("black");
        this.blackAt = t + 2;
      }
      if (this.blackAt && t > this.blackAt) this.blackout();
    }

    // Flicker: the room goes dark for a moment; the change happens in it.
    let tube = 1;
    if (this.flicker > 0) {
      this.flicker -= dt;
      // Reduce flashing: a soft dip instead of a strobe.
      const strobe = g.reduceFlashing ? 0.12 : Math.sin(this.flicker * 60) > 0.2 ? 0.25 : 0;
      tube = this.flicker > 0.12 ? strobe * (g.reduceFlashing ? 1 : 0.3) : 0.6;
      if (this.flicker <= 0.2 && this.pendingChange) {
        this.change(this.pendingChange);
        this.pendingChange = null;
      }
    } else if (this.phase === "fetch" || t > 23) {
      // An unhappy tube light, near the end.
      tube = g.reduceFlashing ? 0.72 : 0.75 + Math.sin(t * 37) * 0.08 + (Math.random() < 0.02 ? -0.5 : 0);
    }
    if (this.phase === "dinner" || this.phase === "fetch") {
      this.tubeLight.intensity = 7 * tube;
      g.world.tube = 1.6 * tube;
      g.moon.hemi.intensity = 2.2 * tube;
      const tvFlick = this.tvSnow ? 0.6 + Math.random() * 0.8 : 0.5 + Math.sin(t * 7) * 0.2 + Math.sin(t * 2.3) * 0.15;
      this.tvLight.intensity = 1.2 * tvFlick * tube;
    }

    // Steam, while it's still 1987 at the table.
    const lit = g.eraForce > 0.5 || lightAmount(g.warmLights(), { x: 0, y: 0.8, z: 0 }) > 0.5;
    this.updateSteam(dt, lit && this.phase !== "after");

    // After the blackout: strike, the empty table, then the dark.
    if (this.phase === "dark" && g.matchLit) {
      this.phase = "strike";
      this.strikeAt = t;
      // The first match: it burns a little longer, and 1987 blooms out of it
      // slowly, under a low swell.
      g.match.total = g.match.left = 11;
      const e2 = g.sounds.e;
      for (const [f, d] of [[55, 0], [82.4, 0.3], [110, 0.6], [164.8, 0.9]]) e2.tone({ freq: f, type: "sine", duration: 7, gain: 0.05, attack: 2.5, delay: d, out: e2.dry });
      try {
        localStorage.setItem("kaal.prologueSeen", "1");
      } catch {}
    }
    if (this.phase === "strike" && g.match) {
      const k = Math.min(1, (t - this.strikeAt) / 2.2);
      g.match.maxRadius = 0.4 + (2.6 - 0.4) * (k * k * (3 - 2 * k));
    }
    if (this.phase === "strike" && !g.matchLit && g.strikeT < 0) {
      this.phase = "after";
      this.afterAt = t;
    }
    if (this.phase === "strike" || this.phase === "after") g.player.eye = Math.min(PLAYER.eye, g.player.eye + dt * 0.05); // nobody remarks on it
    if (this.phase === "after") {
      const k = Math.min(1, (t - this.afterAt - 2.5) / 4);
      if (k > 0) {
        g.moon.hemi.intensity = this.moonWas.hemi * k;
        g.moon.moon.intensity = this.moonWas.moon * k;
      }
      g.player.eye = Math.min(PLAYER.eye, g.player.eye + dt * 0.12);
      if (t - this.afterAt > 3 && !this.cues.has("ticking")) {
        this.cues.add("ticking");
        g.kaal.tickBoost = 0.15; // far away, through the walls
      }
      if (k >= 1 && !this.cues.has("end")) {
        this.cues.add("end");
        this.finish();
      }
    }
    void e;
  }

  blackout() {
    const g = this.g;
    if (this.phase === "dark") return;
    this.phase = "dark";
    this.blackAt = null;
    g.world.fan = 0;
    g.world.tube = 0;
    this.tubeLight.intensity = 0;
    this.tvLight.intensity = 0;
    g.moon.hemi.intensity = 0;
    g.eraForce = 0; // only what a flame reaches is 1987 now
    this.clockStopped = true;
    if (this.tvSnowSound) this.tvSnowSound.stop();
    if (g.sounds.e.ctx) g.sounds.e.fade(g.sounds.e.tab.gain, 0, 0.1);
    g.duckOverride = 0; // silence, not even the fan
    if (!g.inv.ab) g.inv.ab = 8; // (if you never got to the box, you had it in your pocket)
    g.sureStrike = true; // the first one catches
    g.ui.note("Strike a match.", 6);
    g.moon.hemi.color.copy(this.moonWas.color);
    this.giveBackLights();
    this.onBlackout?.();
  }

  giveBackLights() {
    const g = this.g;
    g.pool.give(this.tubeLight);
    g.pool.give(this.tvLight);
    this.tubeLight = { intensity: 0 };
    this.tvLight = { intensity: 0 };
  }

  finish() {
    const g = this.g;
    clearInterval(this.clockTimer);
    g.duckOverride = undefined;
    g.moon.hemi.color.copy(this.moonWas.color);
    g.scene.fog.density = this.moonWas.fog;
    g.scene.remove(this.steam);
    for (const m of this.leftovers) g.scene.remove(m);
    g.removeInteractable(this.boxIt);
    for (const m of Object.values(g.world.family.members)) {
      m.anim = null;
      m.setState("gone");
    }
    g.world.family.members.dadi.hasSpectacles = false;
    this.onDone({ keepPlace: true });
  }

  dispose() {
    clearInterval(this.clockTimer);
  }
}
