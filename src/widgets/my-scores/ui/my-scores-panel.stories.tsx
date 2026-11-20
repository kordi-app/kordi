import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ScoreRecord } from "@/entities/chord-quiz";
import { MyScoresPanel } from "./my-scores-panel";

const scores: ScoreRecord[] = [
  { id: 1, difficulty: "EASY", totalScore: 1684, correctCount: 10, totalCount: 10, createdAt: "2026-11-18T21:14:00+09:00" },
  { id: 2, difficulty: "EASY", totalScore: 1422, correctCount: 9, totalCount: 10, createdAt: "2026-11-15T19:02:00+09:00" },
  { id: 3, difficulty: "EASY", totalScore: 973, correctCount: 7, totalCount: 10, createdAt: "2026-11-10T08:40:00+09:00" },
  { id: 4, difficulty: "MEDIUM", totalScore: 1105, correctCount: 8, totalCount: 10, createdAt: "2026-11-19T22:31:00+09:00" },
  { id: 5, difficulty: "MEDIUM", totalScore: 640, correctCount: 5, totalCount: 10, createdAt: "2026-11-12T13:25:00+09:00" },
];

const meta = {
  title: "Widgets/MyScores/MyScoresPanel",
  component: MyScoresPanel,
  tags: ["autodocs"],
  args: { scores },
  decorators: [(Story) => <div className="max-w-md">{Story()}</div>],
} satisfies Meta<typeof MyScoresPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** EASY is selected first; HARD has no records yet. */
export const Default: Story = {};

export const NoScores: Story = { args: { scores: [] } };
