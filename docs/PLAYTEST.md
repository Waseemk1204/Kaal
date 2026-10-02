# Running a playtest

Three people who have never seen Kaal is the goal. Twenty minutes each.

## Before

- Use a Windows laptop if you can (that's what judges will use), Chrome or Edge.
- Open the game (local: `npm start` then http://localhost:5175, or the
  Vercel link). Headphones on, lights down.
- Don't explain anything. Not the controls, not the story, not "strike a match".

## During

- Sit behind them and **say nothing**. If they're truly stuck for 2 minutes,
  you may say one sentence, and write down that you did.
- Note on paper, with the time:
  - every time they **stop, wander, or say "what do I do?"**
  - every **death** and what they were trying to do
  - anything they **laugh at, jump at, or say out loud**
  - anything that **looks broken**

## After

1. Ask three questions only:
   - "What was the scariest moment?"
   - "Where were you confused?"
   - "What was the game about?" (checks the theme landed)
2. Press **F9** in the game, click **Copy all sessions**, and paste the JSON
   into a message. It holds each session's act times, deaths (stage and room),
   matches struck and wasted, falls, crumbled items, hints shown and time per
   room. Nothing leaves the browser on its own.
3. Send the notes and the JSON back, and I'll tune `shared/rules.js` and fix
   the top three confusions.

## What good looks like

| | Target |
|---|---|
| Whole game | 10–15 minutes |
| Prologue to first match | under 1:30 |
| Deaths | 1–3 for a first-timer: enough to feel it, not enough to quit |
| Hints shown | 0–2 |
| Quits | none |
