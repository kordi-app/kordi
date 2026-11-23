/** One playable note of a score, in quarter-note beats from the start. */
export interface ScoreNote {
  midi: number;
  /** 0 = upper staff (right hand), 1 = lower staff (left hand) */
  staff: number;
  /** onset, in quarter notes from the start */
  beat: number;
  /** sounding length in quarter notes (tied notes summed) */
  length: number;
}

/**
 * One cursor stop of the sheet: everything that starts at the same moment.
 * Groups map 1:1 to the sheet cursor's steps (a step with only rests or tie
 * continuations has no notes), so group i is where the cursor is after i steps.
 */
export interface ScoreGroup {
  beat: number;
  notes: ScoreNote[];
}

export interface ScoreTimeline {
  groups: ScoreGroup[];
  /** the written tempo, quarter notes per minute */
  bpm: number;
  /** where the music ends (last note off), in quarter notes */
  endBeat: number;
}

export type ScoreSource =
  | { kind: "builtin"; url: string }
  /** a file the player added; it lives only in this browser */
  | { kind: "local"; id: string };

export interface ScoreEntry {
  id: string;
  title: string;
  composer?: string;
  source: ScoreSource;
}
