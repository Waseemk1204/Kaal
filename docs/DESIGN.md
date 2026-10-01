# KAAL — Game Design

Companion to [STORY.md](STORY.md). This document is the rules; the story is
the reason for them.

- **Platform:** desktop browser (Chrome/Edge/Firefox/Safari), mouse and keyboard, headphones recommended.
  Phones are out of scope for the jam.
- **Length:** 15–25 minutes for a first clear.
- **Scope:** 3 rooms, 1 monster, 3 anchors, 2 endings.

---

## 1. Pillars

1. **Light is the present, and it never lasts.** Every second of safety is
   paid for and burning down.
2. **Dread, never startle.** You always know roughly where Kaal is. The fear is
   in watching it get closer, not in it appearing.
3. **Everything you touch is temporary.** Matches, candles, food, glass, the
   floor under your feet, your family, you.
4. **No faces.** Nobody in the game has a face. Not the family, not Kaal, not
   you in the ending.

## 2. The Dread Contract (hard rules — no jump scares)

These are enforced in code (see PLAN.md, `KaalBrain` spawn checks) and are
not to be broken for "one good scare".

1. Kaal **never appears inside the player's view**. It enters only through
   doorways or from where it was already visible.
2. Kaal **never appears within 6 m** of the player except by walking there.
3. **No sudden loud sounds.** Nothing in the mix rises faster than ~0.5 s,
   except the match strike (which the player causes).
4. **No screen-filling stingers**, no flashing images, no fake-outs.
5. Kaal's position is always **audible**: ticking, panned in 3D.
6. Kaal **never runs**, ever, including in cutscenes.
7. Silence means near. The house ambience ducks when Kaal is close; the player
   learns to fear quiet.

## 3. Two times, one house

| | **Ab** (now) | **Tab** (then) |
|---|---|---|
| When | Default. Darkness. | Inside the radius of any warm light (match, candle, diya). |
| Look | Moonlight: cold blue, low, fog, rot, roots, rust. | Warm amber: 1987, clean, lived-in. |
| Geometry | Collapsed floors, rubble in doorways, fallen TV. | Floors whole, doorways clear, things where they were. |
| Kaal | Moves. | **Frozen.** Only its head turns, to follow you. Its ash hangs still. |
| Things from Tab | Age and break (see §6). | Stay fresh. |

**The reveal edge.** Where the light's radius meets the dark, *Tab* doesn't
just cut off — it burns away, like paper catching, with a thin ember line
along the boundary. The edge flickers with the flame.

**Physics follows time.** A cell of floor that only exists in *Tab* is solid
only while it's inside a warm light. If the light dies while you're standing
on it, you fall.

## 4. Controls

| Action | Key |
|---|---|
| Move / look | WASD / mouse (pointer lock) |
| Run | Hold Shift — blows out a lit match |
| **Strike a match** | F or right mouse button |
| Interact / pick up | E (tap) |
| Hold-to-do (wind, pour, light) | E (hold) |
| Place a candle | Q (lights it with your burning match, or strikes one) |
| Inventory slots | 1–3 |
| Read a page | E on the page, any key to close |
| Pause | Esc |

**Hands.** Your left hand holds the match; your right holds whatever you carry.
A lit match forces a slow, cupped walk (you're shielding it).

## 5. Light sources

| Source | Radius | Burn time | Notes |
|---|---|---|---|
| **Match** | 2.2 m | 8 s | Carried. Strike takes 0.6 s. *Ab* matches (old, damp) fail to light 20% of the time — costs the time, not the stick. *Tab* matches never fail. |
| **Candle stub** | 3.0 m | 40 s | Placed on the floor or a surface. Can't be picked up again once lit. |
| **Family diya** | whole dining room | ~90 s of oil | The finale light. Built from oil + wick + flame. |

**Kaal speeds up burning.** Within 6 m of Kaal, every flame burns faster:
`rate = 1 + 2 × (1 − d / 6)` → up to **3×** right next to it. The flame also
leans toward it, like a draft. You can read how close it is from your match.

**Matches are your lifetime.** The matchbox count is shown only for two
seconds after each strike (a small row of sticks, bottom left). There is no
other HUD.

| Where | Matches | Candles |
|---|---|---|
| Start (sideboard, dining) | 6 (*Ab* box) | — |
| Kitchen stove shelf | 10 (*Tab* box — decays in the dark) | 1 |
| Dadi's room trunk | 6 (*Ab* box) | 2 |
| Dining sideboard drawer (unlocked in Act III) | 4 (*Ab* box) | 1 |

Numbers are a first guess; tune in playtest (see PLAN.md M7).

## 6. Things from *Tab* decay in *Ab*

Items picked up in the light belong to 1987. Carried into the dark, they age:

- Each *Tab* item has **freshness** (0–100%). It **doesn't drop while you're in
  warm light**, and falls steadily in the dark (3× faster near Kaal).
- Visual: colour drains, cracks spread, it dulls; at 0% it crumbles out of
  your hand with a dry crackle.
- A crumbled item **reappears where you found it** (in *Tab* only). Lost time,
  no softlock.

| *Tab* item | Freshness in the dark | At 0% |
|---|---|---|
| Mummy's bangles | 25 s | crack and shatter |
| Dadi's spectacles | 30 s | lenses cloud, frame snaps |
| Kitchen matchbox | 30 s | goes soft and damp; remaining sticks are lost |
| Papa's watch | doesn't decay | — (it's the one thing time can't spoil: it *is* time) |

Players discover the trick themselves: **keep a match lit and nothing you carry
ages.** Chaining matches is safe but expensive.

## 7. The rooms

Ceiling 3.2 m. Doorways 2.1 m. Grid of 0.5 m cells for collisions and Kaal's paths.

```
                 COURTYARD  (Kaal only; seen through jaalis)
        ┌───────────────┬───────────────────┬───────────────┐
        │  DADI'S ROOM  │    DINING ROOM    │    KITCHEN    │
        │   4.5 × 4 m   │     6 × 5 m       │    4 × 4 m    │
        │  peepal tree, │  table, 4 chairs, │  pit (Ab) /   │
        │  clocks,      │  TV, photo, diya, │  floor (Tab), │
        │  pooja shelf  │  sideboard        │  shelf, stove │
        │            ═══╡                   ╞═══            │
        └───────────────┴─────────┬─────────┴───────────────┘
                              front door (barred)
```
Kaal can also enter Dadi's room and the kitchen from the courtyard (back
door, window) — routes the player can see but not use.

### 7.1 Dining room — hub, prologue, finale (Act III)
- **Teaches:** strike a match → *Tab* blooms → it dies → *Ab* returns.
- **Holds:** the four places at the table (where anchors go), the family
  photo (shows who's back), the diya, the barred front door, the fallen TV.
- **Act III puzzle:**
  1. In *Tab* light, take **Papa's watch** off the TV top.
  2. **Wind it** (hold E, 3 s). → *Kaal stage 3* (see §8).
  3. Lay it at Papa's plate → **Papa returns.** Diary page 3 found where the
     watch was.
  4. At the diya: **pour oil** (hold E, 2 s) → **set the wick** (tap E) →
     **light it** (hold E with a lit match, 1.5 s). Each hold-step needs light.
  5. Smart play: drop a candle in the Dadi's-room doorway first to stall
     Kaal; it burns down fast that close.

### 7.2 Kitchen — Act I (Mummy)
- **Teaches:** *Tab*-only geometry, *Tab* items decaying, matches as a budget.
- **The pit:** in *Ab*, the middle of the floor has caved into the underground
  water tank (2 m deep). In *Tab* it's floor. The shelf with **Mummy's
  bangles** is on the far side.
- **Crossing:** strike a match, walk across (~5 s at cupped pace on an 8 s
  match). Get greedy or fumble a strike and you fall.
- **Falling:** you land in the tank, in the dark, with a broken iron ladder.
  ~15 s to climb out. Before stage 1 that's all it costs; Kaal isn't hunting
  yet. (In stage 2+ it can come to the edge — see §8.)
- **Also here:** the *Tab* matchbox on the stove shelf (across the pit, so you
  have to use it before it goes damp), one candle, diary page 1.
- **First sighting** through the jaali (STORY §5). Scripted, stage 0, harmless.
- **Restore Mummy:** bangles to her plate. → *Kaal stage 1.*

### 7.3 Dadi's room — Act II (Dadi)
- **Teaches:** Kaal freezes in light; candles as tools; you can walk *past* it.
- **Layout:** the peepal trunk splits the room; roots make two narrow lanes.
  Clocks on every root. Kaal stands in the far corner, facing the wall, bowed.
  The pooja shelf is beside it — within its reach.
- **Dormant rule (this room only, stage 1):** Kaal doesn't move until you come
  within 3 m of it in the dark, or until you take something off the shelf.
- **The walk-past:** place candles to freeze it, take **Dadi's spectacles** (*Tab*,
  on the Gita) and the **pooja thali** (oil + wicks, an *Ab* item — safe to
  carry). Its head turns to follow you the whole way. Candles near it burn
  down at up to 3×.
- **Also here:** an *Ab* matchbox (in the trunk), two candles, diary page 2.
- **Restore Dadi:** spectacles to her plate → *Kaal stage 2.*

## 8. Kaal — behaviour

### 8.1 Stages (escalation)
| Stage | Starts when | Kaal does |
|---|---|---|
| **0 — Rumour** | Game start | Not in the house. Ticking far away. Scripted courtyard sighting. Fresh scrape marks on walls appear between visits. |
| **1 — Waiting** | Mummy restored | Rests in Dadi's room corner (dormant rule). Ticking now inside. Ambient crickets stop for good. |
| **2 — Following** | Dadi restored (or it wakes in Dadi's room) | Walks toward you whenever it isn't frozen, at **0.75 m/s**. Always knows where you are. |
| **3 — Coming** | Papa's watch wound | Walks at **0.95 m/s**. Its burn-speed aura reaches 8 m instead of 6. Every clock in the house ticks with it. |

Player speeds for reference: walk 1.5 m/s, **with a lit match 0.9 m/s**, run 3 m/s
(no match). Kaal is slower than you, always — you lose because light runs out,
not because it's faster.

### 8.2 States
- **Still** — standing; may tilt its head as if listening. Used in stage 0–1 and
  for pauses.
- **Walking** — follows a path on the grid toward the player. Every 4–9 s it
  stops mid-stride for 1–3 s (*the pause*), then continues from the exact pose.
- **Folding** — passing through a doorway: slows to 40%, compresses
  shoulders, head leads.
- **Held** — inside the radius of any warm light (with line of sight to the
  flame). All motion and ash frozen. Head keeps tracking the player at 20°/s.
  When released: a run of knuckle cracks, then it continues.
- **Reaching** — in the dark and within **1.4 m** of you: both arms rise over
  0.6 s. If you light a match during the reach, it's held mid-reach (horrible,
  and survivable). If not → the death sequence (STORY §7a).

### 8.3 What it can't do
- Run, lunge, teleport, appear out of sight, or open the barred front door.
- See you "less" because you hide. **There is no hiding.** Crouching under the
  table does nothing; it is time, and it knows where you are. The only answer
  is light.

### 8.4 Presence effects (how the player feels the distance)
| Distance | Effect |
|---|---|
| any | Ticking from its position (3D panned), louder as it nears. |
| < 10 m | Ambience starts to duck (crickets, wind, creaks). |
| < 6 m | Flames burn faster and lean toward it. Fine dust sifts from the ceiling. Film grain thickens. |
| < 3 m | Ambience gone entirely. Your heartbeat, low. Your old hands tremble (subtle camera shake). Edges of vision darken. |
| < 1.4 m (dark) | It reaches. |

### 8.5 The marks it leaves
Where its fingertips drag along walls (at 1.8–2.4 m height), the plaster ages:
four parallel streaks of blistered paint and damp that **stay**. Doorframe
tops get gouged where it folds through. The player can read its routes.

## 9. Progress, checkpoints, failure

- **Anchors:** placing an anchor at its owner's plate restores that person.
  The family photo above the sideboard updates (their figure fills back in).
- **Checkpoints:** game start, after each restoration, and the start of the
  diya step. On death: back to the checkpoint with the match/candle count
  you had there (plus 2 bonus matches, so a spiral of deaths doesn't
  softlock you).
- **Death:** only from Kaal's reach. Running out of matches isn't a death by
  itself — it just means the next time it reaches you, nothing can stop it.

## 10. Look

- **Two palettes.** *Ab*: blue-grey moonlight `#1b2433`-ish, black shadows,
  desaturated rot green and rust. *Tab*: amber `#ffb35c`, steel, maroon,
  turmeric, whitewash.
- **Light does the work.** One shadow-casting point light (the active
  flame), so the match throws Kaal's long shadow up the wall.
- **Post:** film grain, vignette, slight chromatic aberration at the edges,
  desaturation that deepens near Kaal and during the death.
- **Characters:** stylised, low-detail bodies made from primitives (like
  Jugaad Escape's actors), recognised by silhouette, colour and props. Heads
  are smooth ovals with hair — **no eyes, nose, mouth, eyebrows, moustache or
  ears drawn**. Spectacles on Dadi's blank face are fine — they're an object.
- **Kaal** is pure black, unlit, so it reads as a hole in the frame. Ash particles on
  its shoulders. Never fully lit from the front; the camera never lingers on
  it in bright light except while it's held.
- **Gore** exists only in the death sequence and the true ending, and is
  always *aging*: skin to paper to split to bone; blood that dries to black
  in a second.

## 11. Sound

All synthesised in WebAudio, as Jugaad Escape does, so the game ships as text
files. (Recorded voice lines are a stretch goal; subtitles carry the dialogue.)

- **Ab bed:** wind through the broken roof, distant dogs, crickets, beams
  settling, a dripping tap.
- **Tab bed (inside light):** muffled — the fan, the TV murmur, a pressure
  cooker sighing far off, steel on steel. It fades in and out with the light.
- **Kaal:** the ticking cluster (20–30 detuned clicks with random drift),
  knuckle cracks, plaster scrape, the ambience duck. No footsteps.
- **You:** match strike / flare / hiss / snuff, your breath (faster near Kaal),
  heartbeat (<3 m), cloth, footsteps on boards, roots and rubble.
- **Gore:** layered filtered-noise crackles (wet then dry), a bone snap,
  heartbeat slowing to stop.

## 12. Screens

- **Title:** KAAL. *As long as the lamp burns.* A slow match flame on black.
  "Start", "Settings". Content note: *contains gore, death and loss.*
- **Brightness check** before the first play: "Turn it down until the diya is
  barely visible."
- **Settings:** mouse sensitivity, volume, brightness, subtitles size.
- **Pause:** resume / restart checkpoint / title.
- **Death card** and **ending card**: see STORY §7.
