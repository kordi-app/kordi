/** Small easing helpers for the stage's hand-drawn motion. */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeIn = (v: number) => v * v;
export const easeOut = (v: number) => 1 - (1 - v) * (1 - v);
export const easeInOut = (v: number) => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);

/** A wrong chord: the monster dashes in fast, then backs off slowly (ms). */
const LUNGE_STRIKE_MS = 110;
const LUNGE_RECOVER_MS = 420;
export const LUNGE_DISTANCE = 16;

/** 0 → 1 → 0 over the lunge after a miss: a quick strike, an eased retreat. */
export function lungeCurve(sinceMiss: number) {
  if (sinceMiss < 0 || sinceMiss > LUNGE_STRIKE_MS + LUNGE_RECOVER_MS) return 0;
  if (sinceMiss < LUNGE_STRIKE_MS) return easeOut(sinceMiss / LUNGE_STRIKE_MS);
  return 1 - easeInOut((sinceMiss - LUNGE_STRIKE_MS) / LUNGE_RECOVER_MS);
}

/** A short, damped side-to-side jolt after a miss (px; deterministic, not random jitter). */
export function missJolt(sinceMiss: number) {
  return sinceMiss < 260 ? Math.sin(sinceMiss / 26) * 3 * (1 - sinceMiss / 260) : 0;
}
