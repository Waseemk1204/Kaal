// The story: what happens when.
//
//   prologue → act I (Mummy, the kitchen) → act II (Dadi, her room)
//   → act III (Papa, the dining room) → the diya → the last dinner
//
// Owns the things you pick up, the places you lay them, the stages of Kaal,
// the hints, checkpoints, the death and the ending. See docs/STORY.md.

import * as THREE from "three";
import { SPOTS, roomAt } from "../shared/house-map.js";
import { STAGE, SUPPLY, FRESHNESS, HOLD, DIYA, KAAL } from "../shared/rules.js";
import { lightAmount } from "../shared/light.js";
import { itemModel, eraOnly, setAge } from "./world/items.js";
import { Flame } from "./world/flame.js";
import { Prologue } from "./scenes/prologue.js";
import { DeathScene } from "./scenes/death.js";
import { Ending } from "./scenes/ending.js";

const PAGES = {
  1: "Mummy's bangles. I always heard her before I saw her.\n\nAt the end, in the hospital, she kept asking for them and I couldn't find them.\n\nI still look.",
  2: "Dadi said Kaal takes the faces first.\n\nI laughed at her.\n\nI have every photo of her that was ever taken, and I cannot remember her face.",
  3: "They are tearing the house down in the morning. The man from the Corporation said I could take whatever I wanted.\n\nI didn't want anything. I wanted to sit at that table one more time.\n\nThe power's been cut for years. I brought matches.",
};

const NAMES = { bangles: "Mummy's bangles", spectacles: "Dadi's spectacles", thali: "Dadi's pooja thali", watch: "Papa's watch" };

export class Director {
  constructor(game) {
    this.g = game;
    this.dev = null;
    this.pickups = [];
    this.flags = {};
    this.restored = { mummy: false, dadi: false, papa: false };
    this.diyaState = { oil: false, wick: false };
    this.checkpoint = null;
    this.pendingKaal = null;
    this.scene = null; // the running cutscene, if any
    this.held = null; // item shown in your right hand
    this.heldModel = null;
    this.deaths = 0;
    this.built = false;
  }

  // ------------------------------------------------------------- setup
  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g;
    const S = SPOTS;
    const P = (x, y, z) => new THREE.Vector3(x, y, z);

    // Things to pick up. era: tab (only in the light) / ab (only in the dark)
    // / any. `when` gates them on the story.
    const defs = [
      { id: "drawer", label: "Open the sideboard drawer", pos: P(S.sideboardDrawer.x, S.sideboardDrawer.y, S.sideboardDrawer.z), era: "any", wide: 0.85,
        use: () => this.supply(SUPPLY.sideboardMatches, SUPPLY.sideboardCandles, "The drawer sticks, then gives. Matches, and a candle stub.") },
      { id: "kitchenCandle", kind: "candle", label: "Take the candle stub", pos: P(S.kitchenCandle.x, S.kitchenCandle.y, S.kitchenCandle.z), era: "ab",
        use: () => this.supply(0, SUPPLY.kitchenCandles, "A candle stub.") },
      { id: "tabMatches", kind: "tabMatches", label: "Take the matchbox", pos: P(S.tabMatches.x, S.tabMatches.y, S.tabMatches.z), era: "tab",
        use: () => {
          g.inv.tab = SUPPLY.kitchenTabMatches;
          g.inv.tabFresh = FRESHNESS.tabMatches;
          g.ui.showMatches(g.inv.ab, g.inv.tab, g.inv.candles);
          g.ui.note("A new box. It won't stay new in the dark.", 3);
        } },
      { id: "bangles", kind: "bangles", label: "Take Mummy's bangles", pos: P(S.bangles.x, S.bangles.y, S.bangles.z), era: "tab",
        use: () => this.take("bangles", FRESHNESS.bangles) },
      { id: "page1", kind: "page", label: "Read the page", pos: P(S.page1.x, S.page1.y, S.page1.z), era: "ab", keep: true,
        use: () => this.read(1) },
      { id: "trunk", label: "Open Dadi's tin trunk", pos: P(S.dadiTrunk.x, S.dadiTrunk.y, S.dadiTrunk.z), era: "any",
        use: () => this.supply(SUPPLY.dadiMatches, SUPPLY.dadiCandles, "Her trunk. Under her shawls: matches, two candles.") },
      { id: "spectacles", kind: "spectacles", label: "Take Dadi's spectacles", pos: P(S.spectacles.x, S.spectacles.y, S.spectacles.z), era: "tab",
        when: () => g.stage >= STAGE.WAITING,
        use: () => {
          this.take("spectacles", FRESHNESS.spectacles);
          g.kaal.brain.wake();
        } },
      { id: "thali", kind: "thali", label: "Take Dadi's pooja thali", pos: P(S.thali.x, S.thali.y, S.thali.z), era: "ab",
        use: () => {
          this.take("thali", null);
          g.ui.note("Lamp oil, and her cotton wicks.", 2.5);
          if (g.stage >= STAGE.WAITING) g.kaal.brain.wake();
        } },
      { id: "page2", kind: "page", label: "Read the page", pos: P(S.page2.x, S.page2.y, S.page2.z), era: "ab", keep: true,
        use: () => this.read(2) },
      { id: "watch", kind: "watch", label: "Take Papa's watch", pos: P(S.tvTop.x, S.tvTop.y, S.tvTop.z), era: "tab",
        when: () => g.stage >= STAGE.FOLLOWING,
        use: () => this.take("watch", null) },
      { id: "page3", kind: "page", label: "Read the page", pos: P(S.page3.x, S.page3.y, S.page3.z), era: "ab", keep: true,
        when: () => this.picked("watch"),
        use: () => this.read(3) },
    ];

    for (const d of defs) {
      const p = { ...d, picked: false };
      if (d.kind) {
        const model = itemModel(d.kind);
        if (d.era !== "any") eraOnly(model, d.era);
        model.position.copy(d.pos);
        if (d.id === "page2") {
          model.rotation.set(Math.PI / 2, 0, 0.1); // nailed to the wall
          model.position.z += 0.01;
        }
        if (d.id === "spectacles") model.rotation.y = 0.4;
        g.scene.add(model);
        p.model = model;
      }
      p.it = g.addInteractable({
        pos: d.pos,
        label: d.label,
        wide: d.wide ?? 0.9,
        tabOnly: d.era === "tab",
        abOnly: d.era === "ab",
        can: () => !p.picked && !this.scene && (!d.when || d.when()) && g.state === "play",
        use: () => {
          if (!d.keep) {
            p.picked = true;
            if (p.model) p.model.visible = false;
          }
          g.sounds.e.burst({ duration: 0.12, gain: 0.08, freq: 1600, q: 1 });
          d.use();
        },
      });
      this.pickups.push(p);
    }

    // The places at the table.
    const plate = (id) => P(S.plate[id].x, 0.8, S.plate[id].z);
    g.addInteractable({
      pos: plate("mummy"),
      label: "Lay the bangles at Mummy's place",
      can: () => this.has("bangles") && !this.restored.mummy,
      use: () => this.restore("mummy", "bangles"),
    });
    g.addInteractable({
      pos: plate("dadi"),
      label: "Lay the spectacles at Dadi's place",
      can: () => this.has("spectacles") && !this.restored.dadi,
      use: () => this.restore("dadi", "spectacles"),
    });
    g.addInteractable({
      pos: plate("papa"),
      label: "Wind Papa's watch",
      hold: HOLD.wind,
      can: () => this.has("watch") && !this.restored.papa,
      holding: (t) => {
        if (Math.random() < 0.25) g.sounds.e.burst({ duration: 0.02, gain: 0.08, freq: 4000, q: 4 });
        void t;
      },
      use: () => this.restore("papa", "watch"),
    });
    // The diya: oil, wick, flame.
    const diyaPos = P(S.diya.x, 0.95, S.diya.z);
    const lit = () => lightAmount(g.warmLights(), diyaPos) > 0.5;
    g.addInteractable({
      pos: diyaPos,
      label: () => (!lit() ? "Too dark to pour. You need light." : "Pour oil into the diya"),
      hold: HOLD.pour,
      holdCan: lit,
      can: () => this.has("thali") && !this.diyaState.oil,
      use: () => {
        this.diyaState.oil = true;
        w().props.diyaOil.visible = true;
        g.sounds.e.burst({ duration: 0.6, gain: 0.05, freq: 500, q: 1 });
      },
    });
    g.addInteractable({
      pos: diyaPos,
      label: () => (!lit() ? "Too dark. You need light." : "Set Dadi's wick in it"),
      hold: HOLD.wick,
      holdCan: lit,
      can: () => this.diyaState.oil && !this.diyaState.wick,
      use: () => {
        this.diyaState.wick = true;
        w().props.diyaWickMesh.visible = true;
        this.drop("thali");
      },
    });
    g.addInteractable({
      pos: diyaPos,
      label: () => (this.restored.mummy && this.restored.dadi && this.restored.papa ? (g.matchLit ? "Light the diya" : "Strike a match first") : "Not yet. Their places are still empty."),
      hold: HOLD.light,
      holdCan: () => g.matchLit && this.restored.mummy && this.restored.dadi && this.restored.papa,
      can: () => this.diyaState.wick && !g.diya,
      use: () => this.lightDiya(),
    });
    // The photo: who is missing.
    g.addInteractable({
      pos: P(S.photo.x, S.photo.y, S.photo.z),
      label: "Look at the photograph",
      range: 2.4,
      use: () => {
        const gone = ["mummy", "papa", "dadi"].filter((k) => !this.restored[k]);
        if (!gone.length) g.ui.note("All of us.", 3);
        else g.ui.note(gone.length === 3 ? "Mummy. Papa. Dadi. I can't see their faces." : `${gone.map((k) => k[0].toUpperCase() + k.slice(1)).join(" and ")}, still missing.`, 3.5);
      },
    });

    function w() {
      return g.world;
    }
  }

  // ----------------------------------------------------------- helpers
  picked(id) {
    return this.pickups.find((p) => p.id === id)?.picked;
  }

  has(id) {
    return this.g.inv.items.has(id);
  }

  supply(matches, candles, text) {
    const g = this.g;
    g.inv.ab += matches;
    g.inv.candles += candles;
    g.ui.showMatches(g.inv.ab, g.inv.tab, g.inv.candles, 3);
    if (text) g.ui.note(text, 3);
  }

  take(id, fresh) {
    const g = this.g;
    g.inv.items.set(id, { fresh, total: fresh });
    this.hold(id);
    g.ui.note(NAMES[id], 2);
  }

  hold(id) {
    const g = this.g;
    if (this.heldModel) g.hands.holdAnchor.remove(this.heldModel);
    this.held = id;
    this.heldModel = id ? itemModel(id) : null;
    if (this.heldModel) {
      this.heldModel.scale.setScalar(id === "thali" ? 0.75 : 1.2);
      g.hands.holdAnchor.add(this.heldModel);
    }
    g.hands.rightTarget = id ? 1 : 0;
  }

  drop(id) {
    const g = this.g;
    g.inv.items.delete(id);
    if (this.held === id) {
      const next = [...g.inv.items.keys()].pop();
      this.hold(next ?? null);
    }
  }

  // Something from 1987 has gone to pieces in your hand.
  crumble(id) {
    const g = this.g;
    this.drop(id);
    const p = this.pickups.find((q) => q.id === id);
    if (p) {
      p.picked = false;
      if (p.model) p.model.visible = true;
    }
    const lines = {
      bangles: "The glass cracks, and cracks again, and is gone.",
      spectacles: "The lenses cloud over. The frame snaps.",
    };
    g.ui.note(lines[id] ?? "It falls apart.", 3.5);
    g.sounds.e.burst({ duration: 0.3, gain: 0.25, freq: 3500, q: 2 });
    g.sounds.e.burst({ duration: 0.15, gain: 0.2, freq: 6000, q: 3, delay: 0.08 });
  }

  read(n) {
    this.g.ui.page(PAGES[n]);
    this.flags[`page${n}`] = true;
  }

  memory(text, time) {
    this.g.ui.say({ text: `<em>${text}</em>`, time });
  }

  // ---------------------------------------------------------------- flow
  begin() {
    const g = this.g;
    this.build();
    this.reset();
    if (this.dev && !this.dev.prologue) {
      this.startPlay();
      if (this.dev.at === "kitchen") g.player.place(3.4, 0, -Math.PI / 2);
      if (this.dev.at === "dadi") g.player.place(-3.4, 0, Math.PI / 2);
      if (this.dev.stage) this.setStage(Number(this.dev.stage), { quiet: true });
      if (this.dev.kaal) {
        this.setStage(STAGE.FOLLOWING, { quiet: true });
        g.kaal.place(-6.5, -1.5, { force: true, mode: "walk", yaw: -Math.PI / 2 });
      }
      if (this.dev.items) for (const id of this.dev.items.split(",")) this.take(id, null);
      if (this.dev.ending) {
        for (const k of ["mummy", "dadi", "papa"]) this.restore(k, null, { quiet: true });
        this.diyaState = { oil: true, wick: true };
        this.lightDiya();
      }
      if (this.dev.die) setTimeout(() => this.die(), 500);
      return;
    }
    g.state = "scene";
    g.noStrike = true;
    g.kaal.tickBoost = 0;
    this.scene = new Prologue(g, (opts) => {
      this.scene = null;
      this.startPlay(opts);
    });
    this.scene.onBlackout = () => (g.noStrike = false);
  }

  // Back to the start of everything (no checkpoint).
  reset() {
    const g = this.g;
    this.flags = {};
    this.restored = { mummy: false, dadi: false, papa: false };
    this.diyaState = { oil: false, wick: false };
    for (const p of this.pickups) {
      p.picked = false;
      if (p.model) p.model.visible = true;
    }
    g.inv = { ab: SUPPLY.startMatches, tab: 0, tabFresh: 0, candles: 0, items: new Map() };
    this.hold(null);
    for (const k of ["mummy", "papa", "dadi"]) g.world.family.members[k].setState("gone");
    g.world.props.setPhoto({ dadi: false, papa: false, mummy: false, munna: true });
    g.world.props.diyaOil.visible = false;
    g.world.props.diyaWickMesh.visible = false;
    this.clearLights();
    g.kaal.brain.remove({ force: true });
    g.kaal.marks.clear();
    g.stage = STAGE.RUMOUR;
    g.kaal.setStage(STAGE.RUMOUR);
    g.sounds.crickets = true;
  }

  clearLights() {
    const g = this.g;
    g.dropMatch("reset");
    for (const c of g.placed) {
      c.dispose();
      c.holder?.parent?.remove(c.holder);
    }
    g.placed.length = 0;
    if (g.diya) {
      g.diya.dispose();
      g.diya = null;
    }
  }

  startPlay({ keepPlace = false } = {}) {
    const g = this.g;
    if (!keepPlace) g.player.place(SPOTS.start.x, SPOTS.start.z, SPOTS.start.yaw);
    g.player.eye = 1.65;
    g.noStrike = false;
    g.kaal.tickBoost = undefined;
    g.eraForce = 0;
    g.cameraOverride = false;
    g.start();
    this.save("start");
    if (!this.dev) {
      setTimeout(() => this.memory("As long as the lamp burns, Kaal waits.", 4), 1500);
      setTimeout(() => g.ui.note("Their places at the table are empty.", 4), 6500);
    }
  }

  // ----------------------------------------------------------- the family
  restore(id, item, { quiet = false } = {}) {
    const g = this.g;
    if (item) this.drop(item);
    this.restored[id] = true;
    const m = g.world.family.members[id];
    if (id === "dadi") m.hasSpectacles = true;
    m.setState("present");
    g.world.props.setPhoto({ ...this.restored, munna: true });
    if (quiet) return;
    const e = g.sounds.e;
    if (id === "mummy") {
      // Her bangles, once.
      for (let i = 0; i < 4; i += 1) e.tone({ freq: 2800 + i * 340, type: "sine", duration: 0.9, gain: 0.05, delay: i * 0.05 });
      g.ui.note("Mummy.", 3);
      this.setStage(STAGE.WAITING);
    } else if (id === "dadi") {
      e.tone({ freq: 196, type: "sine", duration: 2.5, gain: 0.05 });
      g.ui.note("Dadi.", 3);
      this.setStage(STAGE.FOLLOWING);
    } else if (id === "papa") {
      g.ui.note("Papa.", 3);
      this.setStage(STAGE.COMING);
    }
    this.save(id);
  }

  setStage(stage, { quiet = false } = {}) {
    const g = this.g;
    g.stage = stage;
    g.kaal.setStage(stage);
    if (stage >= STAGE.WAITING) g.sounds.crickets = false;
    const corner = SPOTS.kaalCorner;
    if (stage === STAGE.WAITING) {
      // It leaves the courtyard and waits in Dadi's corner, facing the wall.
      this.flags.sighting = "over";
      this.pendingKaal = { x: corner.x, z: corner.z, yaw: corner.yaw, mode: "dormant" };
      if (!quiet) setTimeout(() => this.memory("The crickets have stopped.", 3), 2500);
    }
    if (stage === STAGE.FOLLOWING) {
      g.kaal.brain.wake();
      if (!g.kaal.present) this.pendingKaal = { x: corner.x, z: corner.z, yaw: corner.yaw, mode: "walk" };
      if (!quiet) setTimeout(() => this.memory("Papa took his watch off for dinner. Always on top of the TV.", 5), 3500);
    }
    if (stage === STAGE.COMING) {
      g.kaal.brain.wake();
      if (!quiet) {
        g.sounds.e.tone({ freq: 60, type: "sine", duration: 3, gain: 0.15, attack: 1 });
        setTimeout(() => g.ui.note("Light the diya.", 4), 1500);
      }
    }
  }

  // ------------------------------------------------------------- the diya
  lightDiya() {
    const g = this.g;
    g.diya = new Flame({ kind: "diya", radius: DIYA.radius, burn: DIYA.burn, pool: g.pool, parent: g.world.props.diyaWick });
    g.diyaRate = 0.0001; // it waits for the ending to let it burn
    g.sounds.e.burst({ duration: 1.2, gain: 0.3, freq: 500, q: 0.5, type: "lowpass", attack: 0.1 });
    this.g.state = "scene";
    this.scene = new Ending(g, this);
  }

  // ------------------------------------------------------------ the death
  die() {
    const g = this.g;
    if (this.scene) return;
    this.deaths += 1;
    g.state = "scene";
    this.scene = new DeathScene(g, {
      short: this.deaths > 1,
      onDone: () => {
        this.lastScene = this.scene;
        this.scene = null;
        g.ui.showCard("KAAL EATS EVERYONE.", "In the morning, they found the house empty.", [
          { label: "Try again", onClick: () => this.restartCheckpoint() },
          { label: "Title", ghost: true, onClick: () => location.reload() },
        ]);
        g.look.disable();
      },
    });
  }

  // ---------------------------------------------------------- checkpoints
  save(name) {
    const g = this.g;
    this.checkpoint = {
      name,
      stage: g.stage,
      restored: { ...this.restored },
      picked: this.pickups.filter((p) => p.picked).map((p) => p.id),
      inv: { ab: g.inv.ab, tab: g.inv.tab, tabFresh: g.inv.tabFresh, candles: g.inv.candles, items: [...g.inv.items.entries()].map(([k, v]) => [k, { ...v }]) },
      diya: { ...this.diyaState },
      flags: { ...this.flags },
      awake: g.kaal.brain.s.awake,
    };
  }

  restartCheckpoint() {
    const g = this.g;
    const c = this.checkpoint;
    g.ui.hideCard();
    g.ui.clearSubs();
    for (const sc of [this.scene, this.lastScene]) sc?.dispose?.();
    this.scene = null;
    this.lastScene = null;
    if (!c) {
      this.begin();
      return;
    }
    this.reset();
    for (const p of this.pickups) {
      p.picked = c.picked.includes(p.id);
      if (p.model) p.model.visible = !p.picked;
    }
    for (const k of ["mummy", "dadi", "papa"]) if (c.restored[k]) this.restore(k, null, { quiet: true });
    g.inv.ab = c.inv.ab + SUPPLY.deathBonusMatches;
    g.inv.tab = c.inv.tab;
    g.inv.tabFresh = c.inv.tabFresh;
    g.inv.candles = c.inv.candles;
    for (const [k, v] of c.inv.items) {
      g.inv.items.set(k, { ...v });
      this.hold(k);
    }
    this.diyaState = { ...c.diya };
    g.world.props.diyaOil.visible = c.diya.oil;
    g.world.props.diyaWickMesh.visible = c.diya.wick;
    this.flags = { ...c.flags };
    this.setStage(c.stage, { quiet: true });
    // Where Kaal waits after a death: wherever it was meant to be, far away.
    const corner = SPOTS.kaalCorner;
    g.kaal.brain.remove({ force: true });
    this.pendingKaal = null;
    if (c.stage === STAGE.WAITING && !c.awake) g.kaal.place(corner.x, corner.z, { force: true, yaw: corner.yaw, mode: "dormant" });
    else if (c.stage >= STAGE.WAITING) {
      g.kaal.place(corner.x, corner.z, { force: true, yaw: corner.yaw, mode: "walk" });
      if (c.awake) g.kaal.brain.wake();
    }
    g.player.place(SPOTS.start.x, SPOTS.start.z, SPOTS.start.yaw);
    g.cameraOverride = false;
    g.eraForce = 0;
    g.post.fx.haze = 0;
    g.post.fx.blood = 0;
    g.post.fx.fade = 0;
    g.post.fx.warp = 0;
    g.ui.show();
    g.start();
    g.look.lock();
    g.ui.showMatches(g.inv.ab, g.inv.tab, g.inv.candles, 3);
  }

  // ------------------------------------------------------------- events
  event(name) {
    const g = this.g;
    if (name === "kaal:catch") this.die();
    if (name === "strike" && !this.flags.firstStrike) {
      this.flags.firstStrike = true;
    }
  }

  // ------------------------------------------------------------- frame
  update(dt) {
    const g = this.g;
    if (this.scene) {
      this.scene.update(dt);
      // A death you've already seen can be skipped.
      if (this.scene instanceof DeathScene && this.deaths > 1 && this.scene.t > 13.5 && g.input.pressed.size) this.scene.finish();
      return;
    }
    if (g.state !== "play") return;
    const p = g.player;
    const room = roomAt(p.x, p.z);

    // Kaal goes where the story wants it, but only unseen and far away.
    if (this.pendingKaal) {
      const k = this.pendingKaal;
      if (k.remove) {
        if (g.kaal.brain.remove({ view: g.kaal.playerView() })) this.pendingKaal = null;
      } else if (g.kaal.place(k.x, k.z, { yaw: k.yaw, mode: k.mode })) {
        this.pendingKaal = null;
        if (k.mode === "walk" || g.stage >= STAGE.FOLLOWING) g.kaal.brain.wake();
      }
    }

    // Act I: the kitchen, the first sighting.
    if (room === "kitchen" && !this.flags.kitchen) {
      this.flags.kitchen = true;
      this.memory("Mummy took her bangles off to knead the dough. She always left them on the far shelf.", 6);
    }
    if (g.stage === STAGE.RUMOUR && !this.flags.sighting && p.x > 2.0 && p.x < 3.2) {
      // Placed in the courtyard while you're still in the doorway.
      if (g.kaal.place(SPOTS.sighting[0].x, SPOTS.sighting[0].z, { yaw: 0, mode: "still", force: !g.kaal.seenBy() })) this.flags.sighting = "standing";
    }
    if (this.flags.sighting === "standing" || this.flags.sighting === "closer") {
      if (g.kaal.seenBy()) {
        this.flags.seenOnce = true;
        this.seenT = (this.seenT || 0) + dt;
      } else if (this.flags.seenOnce && this.flags.sighting === "standing") {
        this.unseenT = (this.unseenT || 0) + dt;
        // Look away, and it's a step closer to the window.
        if (this.unseenT > 2.5 && g.kaal.place(SPOTS.sighting[1].x, SPOTS.sighting[1].z, { yaw: 0, mode: "still", force: true })) this.flags.sighting = "closer";
      }
    }

    // Act II: Dadi's room.
    if (room === "dadi" && g.stage >= STAGE.WAITING && !this.flags.dadiRoom) {
      this.flags.dadiRoom = true;
      this.memory("Dadi kept her spectacles folded in her Gita.", 5);
    }

    // Things from 1987 age in your hand in the dark.
    const hand = new THREE.Vector3();
    g.hands.holdAnchor.getWorldPosition(hand);
    const lights = g.warmLights();
    const inLight = lightAmount(lights, g.camera.position) > 0.5;
    const nearKaal = g.kaal.present && g.kaal.dist < 6;
    const rate = inLight ? 0 : nearKaal ? 3 : 1;
    for (const [id, it] of g.inv.items) {
      if (it.fresh == null) continue;
      it.fresh -= dt * rate;
      if (this.held === id && this.heldModel) setAge(this.heldModel, 1 - Math.max(0, it.fresh) / it.total);
      if (it.fresh <= 0) this.crumble(id);
    }
    if (g.inv.tab > 0) {
      g.inv.tabFresh -= dt * rate;
      if (g.inv.tabFresh <= 0) {
        g.inv.tab = 0;
        g.ui.note("The matches from 1987 have gone soft and damp.", 3);
      }
    }
    void KAAL;
  }
}
