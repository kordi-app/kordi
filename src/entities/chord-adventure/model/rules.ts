/**
 * Chord Adventure: an endless run. Each monster is beaten by playing the chord
 * it shows before time runs out; it gets harder as you go — shorter time, and
 * the chord pool shifts from easy to hard. No difficulty select.
 *
 * MIN_MS_PER_MONSTER must match the server's plausibility check
 * (adventure records: defeated × 2000 ≤ the run length the server measured).
 */

/** Time to answer the first monster, and the floor it shrinks to. */
export const ADVENTURE_START_TIME_MS = 15_000;
export const ADVENTURE_MIN_TIME_MS = 6_000;
/** Each monster beaten takes this much off the next one's time. */
export const ADVENTURE_TIME_STEP_MS = 600;
/** A wrong chord: the monster lunges in, taking this share of the time limit. */
export const ADVENTURE_MISS_PENALTY = 0.25;
/** Misses closer together than this count once (a hand still settling on the keys). */
export const ADVENTURE_MISS_COOLDOWN_MS = 700;
export const MIN_MS_PER_MONSTER = 2000;

/** Chord pools, the same three the quiz server serves. */
export type ChordDifficulty = "EASY" | "MEDIUM" | "HARD";

/** Animation beats (ms): walking in, defeating a monster and moving on, falling. */
export const ADVENTURE_INTRO_MS = 1200;
export const ADVENTURE_VICTORY_MS = 1900;
export const ADVENTURE_DEATH_MS = 1800;

/** Time limit for the nth monster (1-based). */
export function timeLimitFor(stage: number) {
  return Math.max(ADVENTURE_MIN_TIME_MS, ADVENTURE_START_TIME_MS - (stage - 1) * ADVENTURE_TIME_STEP_MS);
}

/** How likely each chord difficulty is at the nth monster. */
export function difficultyWeights(stage: number): Record<ChordDifficulty, number> {
  if (stage <= 4) return { EASY: 1, MEDIUM: 0, HARD: 0 };
  if (stage <= 9) return { EASY: 0.6, MEDIUM: 0.4, HARD: 0 };
  if (stage <= 14) return { EASY: 0.2, MEDIUM: 0.6, HARD: 0.2 };
  if (stage <= 19) return { EASY: 0, MEDIUM: 0.5, HARD: 0.5 };
  return { EASY: 0, MEDIUM: 0.2, HARD: 0.8 };
}

/** Pick a difficulty for the nth monster; `roll` is 0–1. */
export function pickDifficulty(stage: number, roll: number): ChordDifficulty {
  const weights = difficultyWeights(stage);
  let acc = 0;
  for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
    acc += weights[difficulty];
    if (roll < acc) return difficulty;
  }
  return "HARD";
}

/** Scenes cycle every five monsters. */
export const ADVENTURE_SCENES = ["meadow", "forest", "cave", "castle", "volcano"] as const;
export type AdventureScene = (typeof ADVENTURE_SCENES)[number];
export const STAGES_PER_SCENE = 5;

export function sceneFor(stage: number): AdventureScene {
  return ADVENTURE_SCENES[Math.floor((stage - 1) / STAGES_PER_SCENE) % ADVENTURE_SCENES.length];
}
