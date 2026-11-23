import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QuizProgress } from "./quiz-progress";

// the server's defaults (QuizRules): 10 questions, 20 s each
const TIME_PER_QUESTION_MS = 20_000;

const meta = {
  title: "Widgets/ChordQuizPanel/QuizProgress",
  component: QuizProgress,
  tags: ["autodocs"],
  args: {
    currentIndex: 0,
    totalCount: 10,
    timeLeft: TIME_PER_QUESTION_MS,
    timePerQuestionMs: TIME_PER_QUESTION_MS,
    totalScore: 0,
  },
  argTypes: {
    timeLeft: { control: { type: "range", min: 0, max: TIME_PER_QUESTION_MS, step: 100 } },
  },
} satisfies Meta<typeof QuizProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

/** First question, full timer. */
export const Start: Story = {};

export const Midway: Story = { args: { currentIndex: 4, timeLeft: 11_300, totalScore: 642 } };

/** Two seconds or less — the counter pulses. */
export const AlmostOut: Story = { args: { currentIndex: 8, timeLeft: 1_400, totalScore: 1205 } };
