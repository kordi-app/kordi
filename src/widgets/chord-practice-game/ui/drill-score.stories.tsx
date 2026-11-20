import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { DrillState } from "@/entities/chord-practice";
import { DrillScore } from "./drill-score";

const baseState: DrillState = {
  status: "playing",
  currentChord: null,
  nextChord: null,
  score: 0,
  streak: 0,
  bestStreak: 0,
  totalAttempted: 0,
  totalCorrect: 0,
  lastResult: null,
};

const meta = {
  title: "Widgets/ChordPracticeGame/DrillScore",
  component: DrillScore,
  tags: ["autodocs"],
  args: { state: baseState },
} satisfies Meta<typeof DrillScore>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing attempted yet — accuracy shows 0%. */
export const Fresh: Story = {};

export const HotStreak: Story = {
  args: {
    state: { ...baseState, score: 2350, streak: 18, bestStreak: 18, totalAttempted: 20, totalCorrect: 19, lastResult: "correct" },
  },
};

export const StreakBroken: Story = {
  args: {
    state: { ...baseState, score: 1420, streak: 0, bestStreak: 12, totalAttempted: 25, totalCorrect: 17, lastResult: "incorrect" },
  },
};

export const Struggling: Story = {
  args: {
    state: { ...baseState, score: 180, streak: 1, bestStreak: 2, totalAttempted: 14, totalCorrect: 4, lastResult: "timeout" },
  },
};
