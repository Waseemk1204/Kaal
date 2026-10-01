# KAAL — Build Plan

Companion to [STORY.md](STORY.md) and [DESIGN.md](DESIGN.md).

## 0. Ground rules

- **Kaal lives in `~/Desktop/Kaal`, its own folder and its own git repo.**
  Jugaad Escape (`~/Desktop/BYOG`) is never modified. Anything reused is
  **copied** in and adapted here; nothing imports across folders.
- Same stack as Jugaad Escape, because it already works and ships:
  plain ES modules, vendored Three.js, a tiny Node static server, no build
  step, no npm dependencies, procedural models, canvas textures and WebAudio
  sound — the whole game is text files.
- Pure game logic (Kaal's brain, light/decay rules, the house grid,
  progression) lives in `shared/` with no Three.js or DOM, so it runs under
  `node --test`.

## 1. Folder layout

```
Kaal/
  index.html              title, HUD-less overlays, subtitles, importmap
  server.mjs              static server (copied from BYOG, port 5175)
  package.json            start / test / check scripts
  README.md
  assets/vendor/three.module.min.js   (copied from BYOG)
  docs/                   STORY.md, DESIGN.md, PLAN.md
  shared/                 pure logic, unit-tested
    house-map.js          3-room grid: walls, doorways, Ab/Tab-only cells, spots
    rules.js              all tunable numbers (burn times, radii, speeds, decay)
    light.js              which points are lit (radius + line of sight), burn rates
    kaal-brain.js         stages, states, pathing, pauses, held/reach, spawn rules
    progress.js           anchors, checkpoints, inventory, item freshness
  src/
    main.js               boot, renderer, title, pause, settings
    game.js               the loop: input → rules → brain → world → audio → render
    input.js, look.js     copied from BYOG src/input.js and adapted
    world/
      house.js            builds the 3 rooms (both eras) from house-map
      era-material.js     the Tab/Ab reveal shader (§3)
      props.js            table, chairs, TV, clocks, peepal, pit, shelves…
      family.js           faceless Mummy, Papa, Dadi (+ ash outlines)
      items.js            matches, candles, bangles, spectacles, watch, thali, diya
      hands.js            first-person hands (young/old) + the aging shader
    kaal/
      body.js             the rig: tapered limbs, long fingers, egg head
      motion.js           gait, pause, fold-through-door, head tracking, reach
      ash.js              ash particles (freeze when held)
      marks.js            finger-drag decay decals on walls
    scenes/
      prologue.js         the dinner and the flickers (interactive)
      sighting.js         courtyard sighting, Dadi's-room reveal
      death.js            the fail death (STORY §7a)
      ending.js           the last dinner + both outcomes
    fx/post.js            grain, vignette, aberration, desaturate, cataract haze
    audio/
      engine.js           context, limiter, buses, ducking (adapted from BYOG audio.js)
      house.js            Ab and Tab ambience beds
      kaal.js             ticking cluster, cracks, scrape, silence
      player.js           match, breath, heartbeat, steps, gore layers
    ui.js                 subtitles, match count, prompts, page reader, cards
  test/
    light.test.mjs  kaal-brain.test.mjs  progress.test.mjs  house-map.test.mjs
```

## 2. What we copy from Jugaad Escape (and nothing else)

| From `BYOG/` | Into `kaal/` | Change |
|---|---|---|
| `server.mjs` | `server.mjs` | Port 5175, log line, add `.ogg`/`.wav` types. |
| `assets/vendor/three.module.min.js` | same path | none |
| `src/input.js` (`Input`, `Look`) | `src/input.js`, `src/look.js` | Drop touch/joystick, crouch; add F/Q/hold-E, right-click strike, hold-to-run. |
| `src/audio.js` (context + limiter setup) | `src/audio/engine.js` | Keep unlock/limiter/master; add buses (ambience, kaal, player, ui) and a ducking gain. |
| `index.html` skeleton, importmap, fullscreen pattern | `index.html` | New content entirely. |
| Canvas-texture helpers in `src/three/bank.js` | `src/world/textures.js` | Copy the small helpers only. |
| The `Actor` idea in `src/cutscenes.js` | `src/world/family.js` | Rebuild bodies faceless; reuse the scripted-timeline pattern for scenes. |

## 3. The hard technical pieces

### 3.1 The era-reveal shader (`era-material.js`) — *the* core tech
- Patch `MeshStandardMaterial` with `onBeforeCompile`. Each surface gets two
  looks: `tabColor/tabMap` and `abColor/abMap` (+ roughness, a rot/decay mix).
- Uniforms: up to **4 warm lights** `(position, radius, flicker)`. In the
  fragment shader, `t = max over lights of smoothstep(radius, radius − edge, dist)`,
  with world-space noise on the edge so it burns like paper, plus a thin
  ember-orange rim where `t ≈ 0.5`.
- **Era-only objects** (the kitchen floor, the 1987 courtyard, rubble) use the
  same mask with `discard` (Tab-only: keep when lit; Ab-only: keep when dark).
- Lighting: in *Ab*, moonlight (directional, blue, dim) + fog; in *Tab*,
  the flame's point light. One shadow-casting point light total (the
  active flame); candles/diya don't cast shadows.

### 3.2 Collisions that follow time
- `house-map.js` marks cells as `ab-only` / `tab-only` / `always`.
- `light.js` answers `isLit(point)` (inside a warm radius + line of sight on
  the grid). Each frame, `tab-only` cells are solid floor only if lit; if the
  player stands on an unlit pit cell → fall into the tank.

### 3.3 Kaal's body and motion
- **Rig:** a hand-built hierarchy (pelvis → spine ×3 → neck → head; shoulder
  → upper arm → forearm → hand → 5 fingers × 4 joints; hip → thigh → shin →
  foot). Tapered cylinders/capsules, `MeshBasicMaterial` pure black (unlit, no
  fog — a true hole in the image).
- **Gait (procedural):** a slow two-beat walk with exaggerated knee lift and
  joints that move **sequentially**, not together. A pause timer freezes
  mid-pose. Fingers trail along the nearest wall when within 0.6 m.
- **Fold:** on approaching a doorway cell, blend into a stoop pose (spine
  curls, shoulders narrow, head leads), hold, unfold on the other side.
- **Held:** stop all timers and ash; keep only the head look-at.
- **Ash:** a `Points` cloud emitted from shoulder/head bones, drifting up,
  `time` uniform frozen while held.
- **Marks:** decal quads on walls where fingertips pass; they fade in over
  5 s and persist.

### 3.4 Kaal's brain (`shared/kaal-brain.js`, unit-tested)
- Inputs per tick: player position, set of warm lights, stage, map. Outputs:
  target pose state, position, heading, events (`released`, `reach`, `kill`).
- A* over the 0.5 m grid (walls, doorways, the courtyard routes only Kaal can
  use).
- **Dread Contract checks** (DESIGN §2) as code + tests: Kaal's position may
  only change by walking at its stage speed; any repositioning (stage
  changes, checkpoint reloads) only to spots outside the player's view
  frustum and ≥ 6 m away.
- Tests: frozen in light; never exceeds speed; reach only in dark ≤ 1.4 m;
  held mid-reach when a match is struck; dormant rule in Dadi's room; stage
  speeds.

### 3.5 The death sequence (`scenes/death.js`)
- Takes over the camera and builds the shot from STORY §7a on a timeline.
- **Hands:** first-person hand meshes with an **aging shader** driven by
  `age 0→1`: skin tone ramp → liver-spot noise → wrinkle normals → split mask
  (noise threshold reveals red under-layer, then dark dried flakes) → bone
  (yellow-white) as the skin layer is shrunk along normals. Nails are
  separate meshes that detach and fall. One finger is a separate piece that
  snaps off.
- **Kaal's hands** over the shoulders: the rig's arms, parented to the camera
  for the shot.
- **Chest:** a red bloom texture on the shirt plus a screen-space vignette
  tinted red-black.
- **Post:** desaturate 0→1, cataract haze (milky radial blur from the edges),
  final black wipe from the bottom.
- **Morning shot:** reuse the dining room in a third look ("grey dawn"); the
  rotted spot in the photo.
- **Repeat deaths:** jump to t = 12 s; skippable after 2 s.

### 3.6 Post-processing (`fx/post.js`)
No EffectComposer is vendored, so write one small pass: render the scene to a
render target, then a fullscreen triangle shader for grain, vignette,
aberration, desaturation and haze. Uniforms driven by Kaal's distance and the
death timeline.

## 4. Milestones

Each one ends **playable in the browser**. Order is chosen so the riskiest
thing — *is this actually scary?* — gets answered early.

### M0 — Skeleton (½ day)
- Folder, `git init`, copied server, vendored Three.js, `index.html`, a black
  box room, first-person walk + mouse look, `npm test` running an empty suite.
- ✅ Done when: `npm start` → walk around a grey room.

### M1 — Two times (1–1½ days) ⚠️ core risk
- `house-map.js` with the 3 rooms greyboxed; `era-material.js`; match strike
  with burn time and flicker; the burning reveal edge; *Tab*-only floor + the
  pit + falling; *Ab* moonlight and fog.
- ✅ Done when: striking a match in the kitchen makes 1987 bloom out of the
  rot, and you can cross the pit only while it burns. **Show this to
  someone.** If it doesn't feel magical, fix it before moving on.

### M2 — Kaal (2 days) ⚠️ core risk
- Rig, gait, pauses, fold, head-tracking, ash; brain with stages 2–3; held
  in light; reach; ticking audio + ambience duck + heartbeat; presence effects
  (faster burns, flame lean, grain). Temporary death = fade to black.
- ✅ Done when: in a greybox, a playtester with headphones is genuinely tense
  watching it come down a corridor while their match burns down. **This is the
  game.** Spend extra time here before adding content.

### M3 — The game, start to finish (2 days)
- Items + inventory + freshness decay; candles; anchors and restoring family
  (faceless figures + ash outlines); the photo; Dadi's dormant rule; the
  watch/winding; the diya steps; checkpoints; diary pages; match counts per
  DESIGN §5.
- ✅ Done when: the whole game can be played and won in greybox, with
  placeholder text instead of cutscenes.

### M4 — The death (1½ days)
- Hands + aging shader, Kaal's hands over the shoulders, the lift and turn,
  the chest, post-FX, gore audio, the morning shot, the card, retry/skip.
- ✅ Done when: the full 20 s sequence plays from any catch and feels
  unbearable in the right way.

### M5 — Prologue and endings (1½ days)
- The dinner (child eye height, dialogue + subtitles, the fan/TV/tube light,
  the interactive matchbox walk, the five flickers, first strike). The
  courtyard sighting. The last dinner + hand reveal + both outcomes.
- ✅ Done when: a new player understands the rules from Dadi's story alone.

### M6 — Art and sound pass (2 days)
- Real props and canvas textures for both eras (whitewash, steel, maroon,
  roots, rust, the wall of clocks, peepal), the family's silhouettes,
  lighting balance, all ambience beds, Kaal's full sound palette, music
  drone.
- ✅ Done when: screenshots look like a game, not a greybox.

### M7 — Polish and ship (1 day)
- Title, brightness check, settings, pause, content note; tuning pass on
  every number in `rules.js` from 3+ blind playtests; performance (60 fps on
  a mid laptop); deploy (Vercel, like Jugaad Escape, as a separate project).
- ✅ Done when: three people who've never seen it finish it (or die
  properly) without help.

**Total ≈ 11–12 working days.** If the jam is shorter, cut in this order:
the *wait/clinging* ending branch → diary pages → Kaal's wall marks →
Dadi's dormant rule (Kaal just starts following at stage 1) → the courtyard
sighting. Never cut: the reveal shader, Kaal's freeze-in-light, the death.

## 5. Risks

| Risk | Why it matters | Plan |
|---|---|---|
| Kaal looks silly instead of scary | Procedural rig, no face — could read as a stick figure. | Silhouette first: pure black, never well lit, mostly seen at distance or held. Test M2 early with real people; iterate on proportions and *timing* (the pauses and one-joint-at-a-time motion are most of the fear). |
| Too dark to play / too bright to be scary | Monitors vary wildly. | Brightness check screen; moonlight always gives silhouettes; the reveal edge is bright. |
| The gore looks cheap | Procedural hands. | It's mostly shader + timing + sound. Keep the camera close, the light low (match on floor), and the colour draining — suggestion does half the work. |
| Shader cost | Every material blended against 4 lights + noise. | Cap lights at 4, one shadow caster, batch static geometry as BYOG's `Batch` does. |
| Players don't get the twist | The twist is the payoff. | Three layers: young/old hands, the eye-height change, diary page 3 right before the ending, then the hand reveal in full light. |
| Softlock | Lost items, no matches. | Items respawn; checkpoints restore matches with a +2 bonus. |

## 6. Decisions

- **No deadline: full scope.** Nothing is cut.
- **Both endings are deaths**, as written in STORY §7.
- **English only.** All dialogue is English subtitles; no recorded voice.
- **Deploy** to Vercel as its own project.
