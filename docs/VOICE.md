# Recording the voices

Eleven short lines. Recording them is the biggest single lift to how Kaal
sounds; until you do, each line plays as a quiet wordless murmur under its
subtitle.

## How

1. Record each line as its own file, named by its **id** below, as `.mp3`.
2. Put the files in `assets/voice/`.
3. List the ids you recorded in `assets/voice/manifest.json`:
   ```json
   { "lines": ["mummy-eat", "dadi-know", "dadi-tall"] }
   ```
4. Run `npm run package` again before uploading.

Any line you skip falls back to the murmur, so you can record some and not others.

## Tips

- **Quiet room, phone close to your mouth**, a blanket or cupboard of clothes
  around you to kill the echo. A phone's voice-memo app is good enough.
- **Ordinary, not spooky.** It's a family at dinner. The horror is that it's
  ordinary. Dadi is warm, a little dramatic, enjoying scaring the boy. Papa is
  half-listening to the news. Mummy is busy.
- **Short and natural.** Don't perform. Leave half a second of silence at each
  end, and trim the rest.
- Export as MP3 (mono is fine), normalised to about −3 dB.

## Lines

### The prologue (1987, the dinner)

| id | Who | Line | Direction |
|---|---|---|---|
| `mummy-eat` | MUMMY | Eat properly, Munna. Not just the rice. | Busy, fond, a little tired. |
| `dadi-know` | DADI | Do you know what Kaal looks like, Munna? | Leaning in. Enjoying it. |
| `dadi-tall` | DADI | So tall it bows at every door. And no face. Faces are the first thing it takes. | Slow. The last sentence quieter. |
| `papa-scare` | PAPA | Amma, don't scare the boy. | Not looking up from the TV. |
| `dadi-runs` | DADI | It never runs. Why would it hurry? Everyone comes to it in the end. | Matter-of-fact. Not spooky. |
| `dadi-lamp` | DADI | Only one thing stops it. As long as the lamp burns, Kaal waits. | Gentle. This is the rule of the game. |
| `papa-power` | PAPA | There goes the power again. | Sigh. Every evening. |
| `mummy-matches` | MUMMY | Munna, get the matches. On the sideboard. | Calm, practical. |

### The last dinner (the ending)

| id | Who | Line | Direction |
|---|---|---|---|
| `mummy-late` | MUMMY | What took you so long? The food's gone cold. | Warm. Forty years haven't happened, for her. |
| `papa-quarter` | PAPA | Quarter to ten. | Glancing at his watch. |
| `dadi-grown` | DADI | Look how grown you are, Munna. | Soft. She knows. |
