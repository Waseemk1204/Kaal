// Kaal, assembled: the brain decides, the body moves, the ticking follows it
// through the house, and its nearness reaches you: the ambience drains away,
// flames lean and hurry, your hands shake, your heart gets loud.

import * as THREE from "three";
import { KaalBrain, inView } from "../../shared/kaal-brain.js";
import { KaalView } from "./motion.js";
import { Marks } from "./marks.js";
import { KaalSounds } from "../audio/kaal.js";
import { Dust } from "../fx/dust.js";
import { PRESENCE, STAGE } from "../../shared/rules.js";

export class Kaal {
  constructor(game) {
    this.game = game;
    this.brain = new KaalBrain();
    this.view = new KaalView(game.scene);
    this.marks = new Marks(game.scene);
    this.audio = new KaalSounds(game.audio);
    this.dust = new Dust(game.scene);
    this.duck = 1;
    this.near = 0; // 0 far … 1 on top of you
    this.dist = 99;
    this.tickLevel = 0;
    this.enabled = true;
    this.presence = true;
    this.onEvent = () => {};
  }

  get state() {
    return this.brain.state;
  }

  get present() {
    return this.brain.state.present;
  }

  playerView() {
    const p = this.game.player;
    const fov = THREE.MathUtils.degToRad(this.game.camera.fov) * this.game.camera.aspect;
    return { x: p.x, z: p.z, yaw: p.yaw, fov: Math.min(2.6, fov) };
  }

  seenBy() {
    return this.present && inView(this.playerView(), this.state);
  }

  setStage(stage) {
    this.brain.setStage(stage);
  }

  // Put it somewhere (respecting the Dread Contract unless forced).
  place(x, z, opts = {}) {
    return this.brain.place(x, z, { view: opts.force ? null : this.playerView(), ...opts });
  }

  update(dt) {
    const g = this.game;
    this.audio.init();
    const s = this.brain.state;
    const p = g.player;
    let events = [];
    // (It waits while you read: the page covers the screen.)
    if (this.enabled && g.state === "play" && !g.ui.reading) {
      events = this.brain.tick(dt, {
        player: { x: p.x, z: p.z, y: p.y, inTank: p.inTank },
        lights: g.warmLights(),
        view: this.playerView(),
      });
    }
    const held = s.mode === "held";
    this.view.update(dt, s, { held, dormant: s.mode === "dormant", playerDist: this.dist });

    // Head height, for sound.
    const hy = s.y + 2.6;
    for (const e of events) {
      if (e === "released") this.audio.knuckles(s.x, hy - 0.6, s.z, 4 + Math.floor(Math.random() * 4));
      if (e === "fold") this.audio.fold(s.x, hy - 0.4, s.z);
      if (e === "reach") this.audio.reach(s.x, hy - 0.8, s.z);
      if (e === "wake") this.audio.knuckles(s.x, hy - 0.6, s.z, 10);
      this.onEvent(e);
      g.director?.event(`kaal:${e}`);
    }

    // Marks on the walls where its fingertips drag.
    for (let i = 0; i < 2; i += 1) {
      if (this.view.touching[i] && !held && s.present) this.marks.drag(i, this.view.fingertips[i]);
      else this.marks.lift(i);
    }
    this.marks.update(dt);
    const touching = s.present && !held && (this.view.touching[0] || this.view.touching[1]);
    const tip = this.view.fingertips[this.view.touching[0] ? 0 : 1];
    this.audio.setScrape(tip.x, tip.y, tip.z, touching);

    // Presence.
    this.dist = s.present ? Math.hypot(s.x - p.x, s.z - p.z) : 99;
    const d = this.dist;
    const ramp = (from, to) => Math.min(1, Math.max(0, (from - d) / (from - to)));
    this.near = s.present ? ramp(PRESENCE.near, 0.8) : 0;
    this.duck = s.present ? 1 - ramp(PRESENCE.duckFrom, PRESENCE.close) : 1;
    const stageLevel = [0.18, 0.4, 0.75, 0.75, 1][g.stage] ?? 0.6;
    this.tickLevel = s.present ? stageLevel : this.tickBoost ?? 0.08 * (g.stage === STAGE.RUMOUR ? 1 : 0);
    // Creeping up on it in Dadi's room: the clocks fall silent, one by one.
    if (s.mode === "dormant") this.tickLevel *= Math.min(1, Math.max(0, (d - 2) / 3.5));
    this.audio.setPosition(s.present ? s.x : 0, s.present ? hy : 2, s.present ? s.z : -9);
    if (s.mode === "dormant" && d < 5.5 && !this.hushed) {
      this.hushed = true;
      g.sounds.e.tone({ freq: 41, type: "sine", duration: 6, gain: 0.12, attack: 2.5, out: g.sounds.e.dry });
    }
    this.audio.update(dt, this.tickLevel * (this.silenced ? 0 : 1));

    // Dust: a little always, thick near it.
    this.dust.update(dt, p, 0.12 + this.near * 0.88);

    // On you: tremble, heart, breath, grain. (Cutscenes take these over.)
    if (this.presence === false) {
      g.sounds.dread(0, 0);
      return;
    }
    g.sounds.dread([0, 0.4, 0.7, 1][g.stage] ?? 0, this.near);
    const close = ramp(PRESENCE.close, 0.8);
    g.hands.tremble = 0.15 + this.near * 0.9;
    g.sounds.body(dt, { heart: close > 0 ? 1.0 + close * 1.4 : 0, breath: this.near > 0.2 ? 0.25 + this.near * 0.5 : 0 });
    const fx = g.post.fx;
    fx.grain = 0.07 + this.near * 0.1;
    fx.desat = 0.15 + this.near * 0.35;
    fx.vignette = 0.55 + close * 0.45;
    fx.aberration = 0.0015 + this.near * 0.003;
  }
}
