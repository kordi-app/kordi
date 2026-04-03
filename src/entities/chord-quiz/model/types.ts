import type { ChordType, TimeSignature } from "@/shared/lib/music";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "custom";
export type GameMode = "practice" | "timeattack";

export interface QuizSettings {
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

export interface QuizChord {
  name: string;
  rootIndex: number;
  type: ChordType;
  pitchClasses: number[];
}

export type QuizStatus = "idle" | "countdown" | "playing" | "paused";
export type QuizResult = "correct" | "incorrect" | "timeout" | null;

export interface QuizState {
  status: QuizStatus;
  currentChord: QuizChord | null;
  nextChord: QuizChord | null;
  score: number;
  streak: number;
  bestStreak: number;
  totalAttempted: number;
  totalCorrect: number;
  lastResult: QuizResult;
}

export const DIFFICULTY_CHORD_TYPES: Record<Difficulty, ChordType[]> = {
  beginner: ["", "m"],
  intermediate: ["", "m", "7", "m7", "maj7", "sus2", "sus4"],
  advanced: ["", "m", "7", "m7", "maj7", "sus2", "sus4", "dim", "aug", "dim7", "m7b5", "aug7"],
  custom: [],
};
