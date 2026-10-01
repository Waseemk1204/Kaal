// The game loop: input → you → flames → 1987 → Kaal → sound → picture.
//
// Owns the scene, the camera, your hands and your matches. Story beats,
// Kaal, the family and the rooms' puzzles plug in through `this.world`,
// `this.kaal` and `this.director` (set up in main.js).

import * as THREE from "three";
import { House, moonlight } from "./world/house.js";
import { setEraLights } from "./world/era-material.js";
import { Flame, LightPool } from "./world/flame.js";
import { Hands } from "./world/hands.js";
import { Player } from "./player.js";
import { Post } from "./fx/post.js";
import { MATCH, CANDLE, PLAYER, SUPPLY, STAGE, HOLD } from "../shared/rules.js";
import { lightAmount, burnRate } from "../shared/light.js";

export class Game {
  constructor({ renderer, canvas, audio, sounds, input, look, ui }) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.audio = audio;
    this.sounds = sounds;
    this.input = input;
    this.look = look;
    this.ui = ui;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.02, 120);
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.post = new Post(renderer);
    this.house = new House(this.scene);
    this.moon = moonlight(this.scene);
    this.pool = new LightPool(this.scene, 5);
    this.hands = new Hands(this.camera);
    this.player = new Player();
    this.player.onStep = (mode) => this.sounds.step(mode, this.player.inTank);
    this.player.onFall = () => this.sounds.fall();
    this.player.onLand = () => {
      this.sounds.land();
      this.shake = 0.6;
    };

    this.time = 0;
    this.shake = 0;
    this.match = null; // the Flame in your hand
    this.strikeT = -1; // seconds into a strike, -1 when not striking
    this.placed = []; // candles set down
    this.diya = null;
    this.inv = { ab: SUPPLY.startMatches, tab: 0, tabFresh: 0, candles: 0, items: new Map() };
    this.stage = STAGE.RUMOUR;
    this.kaal = null; // set by main.js
    this.world = null; // props, items, family (set by main.js)
    this.director = null; // story beats and scenes (set by main.js)
    this.interactables = [];
    this.focus = null;
    this.holdT = 0;
    this.state = "idle"; // idle | play | scene | paused
    this.brightness = 1;

    this.onResize();
    window.addEventListener("resize", () => this.onResize());
    this.look.onLook = (dx, dy) => {
      if (this.state === "play") this.player.look(dx, dy);
    };
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, ratio);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------- lights

  // All warm lights burning right now, as {x, y, z, radius}.
  warmLights() {
    const out = [];
    if (this.match?.lit) out.push(this.match.eraLight());
    for (const c of this.placed) if (c.lit) out.push(c.eraLight());
    if (this.diya?.lit) out.push(this.diya.eraLight());
    if (this.extraLights) out.push(...this.extraLights);
    return out;
  }

  get matchLit() {
    return !!this.match?.lit;
  }

  // ------------------------------------------------------------ matches

  tryStrike() {
    if (this.matchLit || this.strikeT >= 0 || this.noStrike) return;
    if (this.player.inTank && this.player.falling) return;
    const tab = this.inv.tab > 0 && this.inv.tabFresh > 0;
    if (!tab && this.inv.ab <= 0) {
      this.ui.showMatches(0, 0, this.inv.candles);
      this.sounds.e.burst({ duration: 0.15, gain: 0.1, freq: 700, q: 1 }); // an empty rattle
      return;
    }
    this.strikeT = 0;
    this.strikeTab = tab;
    this.hands.leftTarget = 1;
    this.hands.strikeT = 0;
    this.hands.setBurn(0);
  }

  updateStrike(dt) {
    if (this.strikeT < 0) return;
    const before = this.strikeT;
    this.strikeT += dt;
    if (before < 0.3 && this.strikeT >= 0.3) {
      const fail = !this.strikeTab && !this.sureStrike && Math.random() < MATCH.abFailChance;
      this.sureStrike = false;
      this.sounds.strike(!fail);
      if (fail) {
        this.strikeT = -1;
        this.hands.strikeT = -1;
        this.ui.note("The old match won't catch.", 1.6);
        return;
      }
      if (this.strikeTab) this.inv.tab -= 1;
      else this.inv.ab -= 1;
      this.match = new Flame({ kind: "match", radius: MATCH.radius, burn: MATCH.burn, pool: this.pool, parent: this.hands.flameAnchor, shadow: true });
      this.sounds.burningStart();
      this.ui.showMatches(this.inv.ab, this.inv.tab, this.inv.candles);
      this.director?.event("strike");
    }
    if (this.strikeT >= MATCH.strikeTime) {
      this.strikeT = -1;
      this.hands.strikeT = -1;
    }
  }

  dropMatch(reason = "burnt") {
    if (!this.match) return;
    const wasLit = this.match.lit;
    this.match.dispose();
    this.match = null;
    this.sounds.burningStop();
    if (wasLit || reason === "burnt") this.sounds.snuff();
    this.hands.leftTarget = 0;
    this.director?.event("matchOut", reason);
  }

  // Set a candle down in front of you and light it (from your match, or
  // with a new one).
  placeCandle() {
    if (this.inv.candles <= 0) {
      this.ui.note("No candles.", 1.5);
      return;
    }
    if (!this.matchLit) {
      this.ui.note("You need a flame to light it.", 1.8);
      return;
    }
    if (this.player.inTank) return;
    const p = this.player;
    const x = p.x - Math.sin(p.yaw) * 0.55;
    const z = p.z - Math.cos(p.yaw) * 0.55;
    const surface = this.world?.surfaceAt?.(x, z) ?? 0;
    this.inv.candles -= 1;
    const holder = new THREE.Group();
    holder.position.set(x, surface, z);
    this.scene.add(holder);
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0xe8dfc6, roughness: 0.6 }));
    stub.position.y = 0.045;
    stub.castShadow = true;
    holder.add(stub);
    const wick = new THREE.Object3D();
    wick.position.y = 0.095;
    holder.add(wick);
    const flame = new Flame({ kind: "candle", radius: CANDLE.radius, burn: CANDLE.burn, pool: this.pool, parent: wick });
    flame.holder = holder;
    flame.stub = stub;
    this.placed.push(flame);
    this.sounds.e.burst({ duration: 0.3, gain: 0.12, freq: 600, q: 0.6, type: "lowpass" });
    this.ui.showMatches(this.inv.ab, this.inv.tab, this.inv.candles);
    this.director?.event("candle", flame);
  }

  updateFlames(dt) {
    const k = this.kaal?.state;
    const rate = (f) => burnRate(f.world, k, this.stage);
    if (this.match) {
      if (this.match.lit) {
        const yaw = this.player.yaw;
        this.match.lightOffset.set(-Math.sin(yaw) * 0.22 + Math.cos(yaw) * 0.05, 0.06, -Math.cos(yaw) * 0.22 - Math.sin(yaw) * 0.05);
        this.match.update(dt, rate(this.match));
        this.hands.setBurn(1 - this.match.fuel);
        if (Math.random() < dt * 6) this.sounds.crackle();
        if (k?.present) {
          // The flame leans toward Kaal.
          const dx = k.x - this.match.world.x;
          const dz = k.z - this.match.world.z;
          const d = Math.hypot(dx, dz) || 1;
          const pull = Math.max(0, 1 - d / 6);
          // Into camera space, roughly.
          const yaw = this.player.yaw;
          const lx = (dx / d) * Math.cos(yaw) - (dz / d) * Math.sin(yaw);
          this.match.lean.set(-lx * pull, pull * 0.3);
        }
      }
      if (!this.match.lit) this.dropMatch("burnt");
    }
    for (const c of this.placed) {
      if (!c.lit) continue;
      c.update(dt, rate(c));
      c.stub.scale.y = Math.max(0.15, c.fuel);
      c.object.parent.position.y = 0.095 * Math.max(0.15, c.fuel);
      if (!c.lit) {
        this.sounds.snuff();
        this.director?.event("candleOut", c);
      }
    }
    if (this.diya?.lit) this.diya.update(dt, this.diyaRate ?? 1);
  }

  // ------------------------------------------------------------- frame

  start() {
    this.state = "play";
    this.look.enable();
    this.ui.show();
  }

  update(dt) {
    this.time += dt;
    const input = this.input;
    const playing = this.state === "play" && !this.ui.reading;

    if (playing) {
      if (input.strike) this.tryStrike();
      if (input.hit("q")) this.placeCandle();
      const running = input.running && !this.player.inTank;
      if (running && this.matchLit) {
        this.ui.note("Running, the match goes out.", 1.5);
        this.dropMatch("run");
      }
      const mode = running ? "run" : this.matchLit || this.strikeT >= 0 ? "match" : "walk";
      this.player.update(dt, input.move(), mode, this.warmLights(), { climbHeld: input.interacting });
    }
    this.updateStrike(dt);
    this.updateFlames(dt);
    this.world?.update?.(dt);
    this.kaal?.update?.(dt);
    this.director?.update?.(dt);
    if (playing) this.updateInteraction(dt);
    else if (!this.director?.scene?.ownsPrompt) {
      this.ui.setPrompt("");
      this.ui.setHold(0);
    }

    // The camera follows the body.
    const p = this.player;
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const sh = this.shake * 0.03;
    if (!this.cameraOverride) {
      this.camera.position.set(p.x + (Math.random() - 0.5) * sh, p.eyeHeight() + (Math.random() - 0.5) * sh, p.z);
      this.camera.rotation.set(p.pitch, p.yaw, 0);
    }
    this.hands.update(dt);

    const lights = this.warmLights();
    setEraLights(lights, this.time, this.eraForce ?? 0);
    const camPos = this.camera.position;
    const inLight = lightAmount(lights, { x: camPos.x, y: camPos.y, z: camPos.z });
    this.sounds.update(dt, { light: Math.max(inLight, this.eraForce ?? 0), duck: this.duckOverride ?? this.kaal?.duck ?? 1 });
    const fwd = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) };
    this.audio.listen(camPos.x, camPos.y, camPos.z, fwd.x, fwd.z);
    this.ui.update(dt);
    this.input.endFrame();
  }

  render() {
    this.post.fx.exposure = this.brightness * (this.exposureMul ?? 1);
    this.post.render(this.scene, this.camera, this.time);
  }

  // ------------------------------------------------------- interaction

  // Things you can use: { pos: Vector3, label(), hold, can(), use(), tabOnly, range }
  addInteractable(it) {
    this.interactables.push(it);
    return it;
  }

  removeInteractable(it) {
    const i = this.interactables.indexOf(it);
    if (i >= 0) this.interactables.splice(i, 1);
  }

  updateInteraction(dt) {
    const p = this.player;
    if (p.inTank) {
      const near = p.nearLadder();
      this.ui.setPrompt(near ? "Climb the ladder" : "", "Hold E");
      this.ui.setHold(near ? p.climb / HOLD.climb : 0);
      if (near && this.input.interacting && Math.random() < dt * 3) this.sounds.climb();
      return;
    }
    const cam = this.camera;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const lights = this.warmLights();
    let best = null;
    let bestScore = -Infinity;
    for (const it of this.interactables) {
      if (it.enabled === false || (it.can && !it.can())) continue;
      const to = it.pos.clone().sub(cam.position);
      const d = to.length();
      if (d > (it.range ?? PLAYER.reach)) continue;
      to.normalize();
      const dot = to.dot(dir);
      // Wider when close: things at arm's length are easy to reach for.
      const need = (it.wide ?? 0.9) - 0.12 * Math.max(0, 1 - d / 1.2);
      if (dot < need) continue;
      if (it.tabOnly && lightAmount(lights, it.pos) < 0.5) continue;
      if (it.abOnly && lightAmount(lights, it.pos) > 0.5) continue;
      const score = dot * 2 - d * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = it;
      }
    }
    if (best !== this.focus) {
      this.focus = best;
      this.holdT = 0;
    }
    if (!best) {
      this.ui.setPrompt("");
      this.ui.setHold(0);
      return;
    }
    const label = typeof best.label === "function" ? best.label() : best.label;
    this.ui.setPrompt(label, best.hold ? "Hold E" : "E");
    if (best.hold) {
      if (this.input.interacting && (!best.holdCan || best.holdCan())) {
        this.holdT += dt;
        best.holding?.(this.holdT, dt);
        if (this.holdT >= best.hold) {
          this.holdT = 0;
          this.ui.setHold(0);
          best.use();
          return;
        }
      } else this.holdT = Math.max(0, this.holdT - dt * 3);
      this.ui.setHold(this.holdT / best.hold);
    } else {
      this.ui.setHold(0);
      if (this.input.hit("e")) best.use();
    }
  }
}
