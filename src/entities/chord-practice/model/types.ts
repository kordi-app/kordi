import type {
  AnswerFeedback,
  ChordType,
  ProgressionId,
  ProgressionKey,
  TimeSignature,
} from "@/shared/lib/music";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert" | "custom";
export type GameMode = "practice" | "timeattack";
/** Where the chords come from: shuffled from a pool, or a progression in order. */
export type ChordSource = "random" | "progression";

export interface DrillSettings {
  gameMode: GameMode;
  difficulty: Difficulty;
  customChordTypes: ChordType[];
  keyFilter: string | null;
  bpm: number;
  barsPerChord: number;
  timeSignature: TimeSignature;
  metronomeAudioEnabled: boolean;
  metronomeVisualEnabled: boolean;
  showNextChord: boolean;
  chordSource: ChordSource;
  progression: ProgressionId;
  /** the progression's major key, or every key in turn */
  progressionKey: ProgressionKey;
  /** timed mode: the metronome keeps going, but a chord waits until it is played */
  waitForMe: boolean;
  /** after a wrong chord or a long wait, show the chord's tones */
  showHints: boolean;
}

export interface DrillChord {
  name: string;
  rootIndex: number;
  type: ChordType;
  pitchClasses: number[];
  /** in a progression: the chord's numeral ("ii7") and key ("Bb Major") */
  numeral?: string;
  keyName?: string;
}

export type DrillStatus = "idle" | "countdown" | "playing" | "paused";
export type DrillResult = AnswerFeedback;

export interface DrillState {
  status: DrillStatus;
  currentChord: DrillChord | null;
  nextChord: DrillChord | null;
  score: number;
  streak: number;
  bestStreak: number;
  totalAttempted: number;
  totalCorrect: number;
  /** wrong chords played; separate from totalAttempted, which also keys the current question */
  wrongTries: number;
  lastResult: DrillResult;
}

/** Everything up to the diminished and altered sevenths, plus the 9th chords. */
const ADVANCED: ChordType[] = ["", "m", "7", "m7", "maj7", "sus2", "sus4", "dim", "aug", "dim7", "m7b5", "7#5", "maj9", "9", "m9"];

export const DIFFICULTY_CHORD_TYPES: Record<Difficulty, ChordType[]> = {
  beginner: ["", "m"],
  intermediate: ["", "m", "7", "m7", "maj7", "sus2", "sus4"],
  advanced: ADVANCED,
  // tensions on top: 11ths and 13ths
  expert: [...ADVANCED, "m11", "11", "13", "maj13", "m13"],
  custom: [],
};
