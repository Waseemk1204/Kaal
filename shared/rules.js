// Every number the game is tuned by, in one place. Metres and seconds.
// DESIGN.md explains what each one is for; change them here, not inline.

export const PLAYER = {
  eye: 1.65, // adult eye height (the prologue uses CHILD_EYE)
  childEye: 1.1,
  radius: 0.24,
  walk: 1.5,
  matchWalk: 0.9, // cupping a lit match
  run: 3.0,
  reach: 2.0, // how far away you can interact with things
};

export const MATCH = {
  radius: 2.2,
  burn: 8,
  strikeTime: 0.6,
  abFailChance: 0.2, // old damp sticks
};

export const CANDLE = { radius: 3.0, burn: 40 };
export const DIYA = { radius: 7.5, burn: 90 };

// Flames near Kaal burn faster: up to 1 + KAAL_BURN.max at zero distance.
export const KAAL_BURN = { range: 6, rangeComing: 8, max: 2 };

// Seconds of freshness for things from 1987, while carried in the dark.
export const FRESHNESS = {
  bangles: 25,
  spectacles: 30,
  tabMatches: 30,
};

export const KAAL = {
  height: 2.8,
  speed: [0, 0, 0.75, 0.75, 0.95], // by stage (0 rumour … 3 coming; index 4 unused alias)
  reach: 1.4,
  reachTime: 0.6, // arms rising before the catch
  foldSpeed: 0.4, // fraction of speed while folding through a doorway
  pitSpeed: 0.45, // climbing down into and out of the kitchen tank
  pauseEvery: [4, 9],
  pauseFor: [1, 3],
  headTurn: (20 * Math.PI) / 180, // rad/s while held
  dormantWake: 3, // Dadi's-room rule: wakes if you come this close in the dark
  minSpawnDistance: 6,
};

export const STAGE = { RUMOUR: 0, WAITING: 1, FOLLOWING: 2, COMING: 3 };

export const PRESENCE = {
  duckFrom: 10,
  near: 6,
  close: 3,
};

// Matches and candles found around the house (DESIGN §5).
export const SUPPLY = {
  startMatches: 8,
  kitchenTabMatches: 10,
  dadiMatches: 6,
  dadiCandles: 2,
  kitchenCandles: 1,
  sideboardMatches: 4,
  sideboardCandles: 1,
  deathBonusMatches: 2,
};

export const HOLD = {
  wind: 3,
  pour: 2,
  wick: 0.4,
  light: 1.5,
  climb: 4,
};

export const PIT = { depth: 2.0 };
