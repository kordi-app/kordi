import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RankingDifficulty, RankingEntry } from "@/entities/ranking";
import { RankingBoard } from "./ranking-board";

const NICKNAMES = ["코드마스터", "쇼팽덕후", "건반요정", "재즈하는고양이", "밤의피아니스트", "하농중독", "도레미파솔", "블루노트"];

function makeRankings(topScore: number, count: number): RankingEntry[] {
  return NICKNAMES.slice(0, count).map((nickname, i) => ({
    nickname,
    profileImageUrl: null,
    totalScore: topScore - i * 117,
    correctCount: Math.max(10 - i, 4),
    totalCount: 10,
  }));
}

const seed = (byDifficulty: Record<RankingDifficulty, RankingEntry[]>) =>
  (Object.keys(byDifficulty) as RankingDifficulty[]).map((d) => [["ranking", d], byDifficulty[d]]);

const meta = {
  title: "Widgets/RankingBoard",
  component: RankingBoard,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="max-w-xl">{Story()}</div>],
} satisfies Meta<typeof RankingBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Switch difficulty with the pills; HARD has only a few entries. */
export const Default: Story = {
  parameters: {
    queries: seed({ EASY: makeRankings(1920, 8), MEDIUM: makeRankings(1650, 6), HARD: makeRankings(1210, 2) }),
  },
};

export const Empty: Story = {
  parameters: { queries: seed({ EASY: [], MEDIUM: [], HARD: [] }) },
};
