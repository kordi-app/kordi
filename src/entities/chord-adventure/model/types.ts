import type { ApiSchema } from "@/shared/api";
import type { AdventureScene } from "./rules";

export type AdventurePhase = "ready" | "loading" | "intro" | "playing" | "victory" | "hurt" | "dying" | "over";

/** What the game screen draws. Changes only at phase boundaries (React state). */
export interface AdventureView {
  phase: AdventurePhase;
  /** 1-based monster number */
  stage: number;
  scene: AdventureScene;
  /** the chord to play (its id, and its name for the validator and display) */
  chord: { id: number; name: string } | null;
  /** a boss's whole progression, and how many of its chords are already played (null for a plain monster) */
  boss: { chords: { id: number; name: string }[]; index: number } | null;
  defeated: number;
  score: number;
  /** monsters beaten in a row without a wrong chord or a lost life */
  combo: number;
  lives: number;
}

/**
 * Live timing for the renderer, read every frame (a ref — no re-renders):
 * when the current phase began, the fight's time limit and penalty so far,
 * and the last miss (for the monster's lunge).
 */
export interface AdventureClock {
  phaseStartedAt: number;
  limitMs: number;
  penaltyMs: number;
  lastMissAt: number;
  /** share of the time limit used when the last monster was beaten (0–1): PERFECT / GREAT / GOOD */
  lastAnswerUsed: number;
  /** points the last monster was worth */
  lastGain: number;
  /** when a boss last took a chord short of the whole progression (for its flinch) */
  lastBossHitAt: number;
}

export type AdventureRankingEntry = ApiSchema<"AdventureRankingResponse">;

/** POST /api/adventure/records response */
export type AdventureRecordResult = ApiSchema<"AdventureResult">;
