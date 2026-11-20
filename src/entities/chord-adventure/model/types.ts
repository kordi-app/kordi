import type { AdventureScene } from "./rules";

export type AdventurePhase = "ready" | "loading" | "intro" | "playing" | "victory" | "dying" | "over";

/** What the game screen draws. Changes only at phase boundaries (React state). */
export interface AdventureView {
  phase: AdventurePhase;
  /** 1-based monster number */
  stage: number;
  scene: AdventureScene;
  /** the chord to play (its id, and its name for the validator and display) */
  chord: { id: number; name: string } | null;
  defeated: number;
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
}

export interface AdventureRankingEntry {
  rank: number;
  nickname: string;
  profileImageUrl: string | null;
  defeated: number;
}

/** POST /api/adventure/records response */
export interface AdventureRecordResult {
  defeated: number;
  bestDefeated: number;
  rank: number;
  saved: boolean;
}
