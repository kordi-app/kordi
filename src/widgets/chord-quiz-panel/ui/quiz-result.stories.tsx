import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import type { QuizAnswer, QuizChordItem, QuizGameState } from "@/entities/chord-quiz";
import { QuizResult } from "./quiz-result";

const CHORDS: [string, string, string][] = [
  ["C", "maj7", "C E G B"],
  ["A", "m7", "A C E G"],
  ["D", "m7", "D F A C"],
  ["G", "7", "G B D F"],
  ["F", "maj7", "F A C E"],
  ["E", "m", "E G B"],
  ["Bb", "", "Bb D F"],
  ["B", "m7b5", "B D F A"],
  ["E", "7", "E G# B D"],
  ["A", "m", "A C E"],
];

const questions: QuizChordItem[] = CHORDS.map(([chordKey, chordType, notes], i) => ({
  id: i + 1,
  chordKey,
  chordType,
  name: `${chordKey}${chordType}`,
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
