import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import type {
  QuizAnswer,
  QuizAnswerResult,
  QuizChordItem,
  QuizChordType,
  QuizGameState,
  QuizResult as ServerQuizResult,
} from "@/entities/chord-quiz";
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
  return {
    phase: "result",
    difficulty: "MEDIUM",
    sessionId: "story",
    timePerQuestionMs: 20_000,
    maxTotalScore: 2_000,
    questions,
    currentIndex: questions.length - 1,
    answers,
  };
}

/** A local answer; notes and time don't matter for display. */
const a = (result: QuizAnswerResult, score: number): QuizAnswer => ({
  result,
  score,
  notes: [],
  elapsedMs: result === "timeout" ? 20_000 : 20_000 - score * 100,
});

/** The server agreeing with the local judgement. */
function judged(answers: QuizAnswer[], rank: number, improved: boolean): ServerQuizResult {
  const totalScore = answers.reduce((sum, x) => sum + x.score, 0);
  return {
    totalScore,
    correctCount: answers.filter((x) => x.result === "correct").length,
    totalCount: answers.length,
    results: answers.map((x) => ({ correct: x.result === "correct", score: x.score })),
    best: improved ? totalScore : 1_700,
    rank,
    improved,
  };
}

const goodAnswers: QuizAnswer[] = [
  a("correct", 182),
  a("correct", 175),
  a("correct", 168),
  a("correct", 190),
  a("incorrect", 0),
  a("correct", 186),
  a("correct", 151),
  a("correct", 129),
  a("correct", 164),
  a("correct", 193),
];

const poorAnswers: QuizAnswer[] = [
  a("correct", 98),
  a("incorrect", 0),
  a("timeout", 0),
  a("correct", 64),
  a("incorrect", 0),
  a("timeout", 0),
  a("incorrect", 0),
  a("timeout", 0),
  a("correct", 41),
  a("incorrect", 0),
];

const meta = {
  title: "Widgets/ChordQuizPanel/QuizResult",
  component: QuizResult,
  tags: ["autodocs"],
  args: {
    state: makeState(goodAnswers),
    result: judged(goodAnswers, 3, true),
    isSaving: false,
    onRetry: fn(),
    onBackToSelect: fn(),
  },
} satisfies Meta<typeof QuizResult>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GoodScore: Story = {};

export const PoorScore: Story = {
  args: { state: makeState(poorAnswers), result: judged(poorAnswers, 41, false) },
};

/** Waiting for the server: the local numbers, dimmed. */
export const Saving: Story = { args: { result: undefined, isSaving: true } };

/** The server did not accept one of the local "correct" answers (e.g. too fast) — the server wins. */
export const ServerDisagrees: Story = {
  args: {
    result: {
      ...judged(goodAnswers, 5, false),
      totalScore: judged(goodAnswers, 5, false).totalScore - 182,
      correctCount: 8,
      results: judged(goodAnswers, 5, false).results.map((r, i) =>
        i === 0 ? { correct: false, score: 0 } : r,
      ),
    },
  },
};

export const SaveFailed: Story = { args: { result: undefined, saveFailed: true, onRetrySave: fn() } };

/** Fewer answers than questions — the rest are shown as timeouts. */
export const Unfinished: Story = {
  args: { state: makeState(goodAnswers.slice(0, 6)), result: undefined },
};
