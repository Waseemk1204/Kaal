# KAAL

> *As long as the lamp burns, Kaal waits.*

A first-person atmospheric horror game for the jam theme **Everything is Temporary**.

A Sunday dinner in 1987. The power goes out. When you strike a match, the house
comes back as it was, but only as far as the light reaches and only while it
burns. In the dark it is the same house forty years later, rotting and empty.
Something very tall walks through it, and it has never had to hurry.

Content note: contains gore, death and loss. Best with headphones, in the dark.

## Play

```bash
npm start
```

Then open http://localhost:5175. There are no dependencies and no build step:
plain ES modules, a vendored Three.js, and sound synthesised in WebAudio.

| Key | |
|---|---|
| WASD / mouse | walk, look |
| F or right click | strike a match |
| E | use, pick up (hold for longer tasks) |
| Q | set down a lit candle (strikes a match if you need one) |
| G | drop a burning match; it keeps burning on the floor |
| Tab or R | shake the matchbox to count what's left |
| Shift | run (it blows out a match) |
| Esc | pause |

## How it works

- **Two times, one house.** Every surface is drawn by an era material
  ([src/world/era-material.js](src/world/era-material.js)) with a 1987 look and a
  look for now. Inside the radius of a warm light it shows 1987, with a burning
  edge where the two meet. Things that only exist then (the kitchen floor over
  the tank, the food) or only now (roots, rubble, the clocks) appear and vanish
  with the light. Physics follows: the floor over the tank only holds you
  while it's lit.
- **Kaal** ([shared/kaal-brain.js](shared/kaal-brain.js),
  [src/kaal/](src/kaal/)) never runs, pauses mid-stride, folds itself through
  doorways and stops dead in warm light, where only its head keeps turning to
  follow you. Flames burn faster near it. You hear it as a drawer full of
  out-of-step watches. It never appears in view or close by except by walking
  there; the tests check that.
- **The story** ([src/director.js](src/director.js)): the prologue, three
  acts (Mummy's bangles, Dadi's spectacles, Papa's watch), the diya, two
  endings, checkpoints. Death and both endings are in [src/scenes/](src/scenes/).

Docs: [story bible](docs/STORY.md) · [game design](docs/DESIGN.md) · [build plan](docs/PLAN.md)

## Develop

```bash
npm test
```

```bash
npm run check
```

`npm test` runs the house map, light and Kaal-brain tests; `npm run check`
syntax-checks every file.

Shortcuts for testing (append to the URL):

| | |
|---|---|
| `?dev` | skip the title and prologue |
| `?dev&prologue=1` | run the prologue |
| `?dev&at=kitchen` / `?dev&at=dadi` | start in a room |
| `?dev&stage=2` | start at a Kaal stage (0–3) |
| `?dev&kaal=1` | Kaal following you from Dadi's room |
| `?dev&items=thali,watch` | start holding things |
| `?dev&die=1` | the death |
| `?dev&ending=1` | the last dinner |

## Deploy

It's a static site. On Vercel, import the GitHub repo (framework preset:
Other, no build command, output directory `.`), or from this folder:

```bash
vercel --prod
```
