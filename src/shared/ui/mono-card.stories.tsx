import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MonoCard } from "./mono-card";

const meta = {
  title: "Shared/MonoCard",
  component: MonoCard,
  tags: ["autodocs"],
  args: {
    className: "max-w-sm p-6",
    children: (
      <>
        <p className="text-t5 font-semibold">최고 점수</p>
        <p className="mt-1 text-sm text-muted-foreground">어려움 · 18/20 정답</p>
      </>
    ),
  },
} satisfies Meta<typeof MonoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
