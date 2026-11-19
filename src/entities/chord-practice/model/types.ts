import type { ChordType, TimeSignature } from "@/shared/lib/music";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "custom";
export type GameMode = "practice" | "timeattack";

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
}

export interface DrillChord {
  name: string;
  rootIndex: number;
  type: ChordType;
  pitchClasses: number[];
}

export type DrillStatus = "idle" | "countdown" | "playing" | "paused";
export type DrillResult = "correct" | "incorrect" | "timeout" | null;

export interface DrillState {
  status: DrillStatus;
  currentChord: DrillChord | null;
  nextChord: DrillChord | null;
  score: number;
  streak: number;
  bestStreak: number;
  totalAttempted: number;
  totalCorrect: number;
  lastResult: DrillResult;
}

export const DIFFICULTY_CHORD_TYPES: Record<Difficulty, ChordType[]> = {
  beginner: ["", "m"],
  intermediate: ["", "m", "7", "m7", "maj7", "sus2", "sus4"],
  advanced: ["", "m", "7", "m7", "maj7", "sus2", "sus4", "dim", "aug", "dim7", "m7b5", "7#5"],
  custom: [],
};
