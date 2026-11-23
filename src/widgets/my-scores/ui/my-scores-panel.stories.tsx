import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ScoreRecord } from "@/entities/chord-quiz";
import { MyScoresPanel } from "./my-scores-panel";

const scores: ScoreRecord[] = [
  { id: 1, difficulty: "EASY", totalScore: 1684, correctCount: 10, totalCount: 10, createdAt: "2026-11-18T12:14:00Z" },
  { id: 2, difficulty: "EASY", totalScore: 1422, correctCount: 9, totalCount: 10, createdAt: "2026-11-15T10:02:00Z" },
  { id: 3, difficulty: "EASY", totalScore: 973, correctCount: 7, totalCount: 10, createdAt: "2026-11-09T23:40:00Z" },
  { id: 4, difficulty: "MEDIUM", totalScore: 1105, correctCount: 8, totalCount: 10, createdAt: "2026-11-19T13:31:00Z" },
  { id: 5, difficulty: "MEDIUM", totalScore: 640, correctCount: 5, totalCount: 10, createdAt: "2026-11-12T04:25:00Z" },
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
