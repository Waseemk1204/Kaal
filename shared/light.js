// Warm light is 1987. These are the rules for where "then" reaches, what it
// holds still, and how fast it burns. A light is { x, y, z, radius }.

import { lineOfSight } from "./house-map.js";
import { KAAL_BURN, STAGE } from "./rules.js";

// How far inside the light a point is: 1 deep inside, 0 outside. The edge
// is `soft` metres wide, matching the reveal shader's burning rim.
export function lightAmount(lights, p, soft = 0.3) {
  let best = 0;
  for (const l of lights) {
    if (!(l.radius > 0)) continue;
    const d = Math.hypot(p.x - l.x, (p.y ?? l.y) - l.y, p.z - l.z);
    const t = Math.min(1, Math.max(0, (l.radius - d) / soft));
    if (t > best) best = t;
  }
  return best;
}

// Solid 1987 floor under a point? Uses a slightly smaller circle than the
// visible one so the floor never vanishes while it still looks lit.
export function floorIsLit(lights, x, z, margin = 0.15) {
  for (const l of lights) {
    if (!(l.radius > 0)) continue;
    const r = l.radius - margin;
    const d = Math.hypot(x - l.x, l.y, z - l.z);
    if (d < r) return true;
  }
  return false;
}

// Kaal is held when any part of its body (a vertical line from its feet to
// the top of its head) is inside a light that can see it.
export function kaalHeld(lights, kaal) {
  for (const l of lights) {
    if (!(l.radius > 0)) continue;
    const y = Math.max(kaal.y, Math.min(kaal.y + kaal.height, l.y));
    const d = Math.hypot(kaal.x - l.x, y - l.y, kaal.z - l.z);
    // The body has some width: count it held a little before its centre line.
    if (d < l.radius + 0.25 && lineOfSight(l, kaal)) return true;
  }
  return false;
}

// Flames burn faster near Kaal: 1× far away, up to 3× right beside it.
export function burnRate(light, kaal, stage) {
  if (!kaal || !kaal.present) return 1;
  const range = stage >= STAGE.COMING ? KAAL_BURN.rangeComing : KAAL_BURN.range;
  const d = Math.hypot(light.x - kaal.x, light.z - kaal.z);
  if (d >= range) return 1;
  return 1 + KAAL_BURN.max * (1 - d / range);
}
