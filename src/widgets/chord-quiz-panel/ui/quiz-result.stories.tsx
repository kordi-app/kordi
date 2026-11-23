import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import type { QuizAnswer, QuizChordItem, QuizChordType, QuizGameState } from "@/entities/chord-quiz";
import { QuizResult } from "./quiz-result";

// [root, server ChordType, chord symbol suffix, notes] — the API sends the enum name, not the suffix
const CHORDS: [string, QuizChordType, string, string][] = [
  ["C", "MAJOR_SEVENTH", "maj7", "C E G B"],
  ["A", "MINOR_SEVENTH", "m7", "A C E G"],
  ["D", "MINOR_SEVENTH", "m7", "D F A C"],
  ["G", "SEVENTH", "7", "G B D F"],
  ["F", "MAJOR_SEVENTH", "maj7", "F A C E"],
  ["E", "MINOR", "m", "E G B"],
  ["Bb", "MAJOR", "", "Bb D F"],
  ["B", "MINOR_SEVENTH_FLAT5", "m7b5", "B D F A"],
  ["E", "SEVENTH", "7", "E G# B D"],
  ["A", "MINOR", "m", "A C E"],
];

const questions: QuizChordItem[] = CHORDS.map(([chordKey, chordType, suffix, notes], i) => ({
  id: i + 1,
  chordKey,
  chordType,
  name: `${chordKey}${suffix}`,
  notes,
  difficulty: "MEDIUM",
}));

function makeState(answers: QuizAnswer[]): QuizGameState {
  return { phase: "result", difficulty: "MEDIUM", questions, currentIndex: questions.length - 1, answers };
}

const goodAnswers: QuizAnswer[] = [
  { result: "correct", score: 182 },
  { result: "correct", score: 175 },
  { result: "correct", score: 168 },
  { result: "correct", score: 190 },
  { result: "incorrect", score: 0 },
  { result: "correct", score: 186 },
  { result: "correct", score: 151 },
  { result: "correct", score: 129 },
  { result: "correct", score: 164 },
  { result: "correct", score: 193 },
];

const poorAnswers: QuizAnswer[] = [
  { result: "correct", score: 98 },
  { result: "incorrect", score: 0 },
  { result: "timeout", score: 0 },
  { result: "correct", score: 64 },
  { result: "incorrect", score: 0 },
  { result: "timeout", score: 0 },
  { result: "incorrect", score: 0 },
  { result: "timeout", score: 0 },
  { result: "correct", score: 41 },
  { result: "incorrect", score: 0 },
];

const meta = {
  title: "Widgets/ChordQuizPanel/QuizResult",
  component: QuizResult,
  tags: ["autodocs"],
  args: {
    state: makeState(goodAnswers),
    isSaving: false,
    isSaved: true,
    onRetry: fn(),
    onBackToSelect: fn(),
  },
} satisfies Meta<typeof QuizResult>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GoodScore: Story = {};

export const PoorScore: Story = { args: { state: makeState(poorAnswers) } };

export const Saving: Story = { args: { isSaving: true, isSaved: false } };

/** Fewer answers than questions — the rest are shown as timeouts. */
export const Unfinished: Story = {
  args: { state: makeState(goodAnswers.slice(0, 6)), isSaved: false },
};
