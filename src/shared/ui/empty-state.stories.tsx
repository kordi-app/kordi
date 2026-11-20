import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Trophy } from "lucide-react";
import { EmptyState, LoadingState } from "./empty-state";

const meta = {
  title: "Shared/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  args: { icon: <Trophy className="size-5" />, label: "아직 기록이 없어요", hint: "첫 번째 도전자가 되어보세요" },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutHint: Story = { args: { hint: undefined } };
export const Loading: Story = { render: () => <LoadingState label="불러오는 중..." /> };
