import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MonoPill } from "./mono-button";

const meta = {
  title: "Shared/MonoPill",
  component: MonoPill,
  tags: ["autodocs"],
  args: { children: "쉬움", active: false },
} satisfies Meta<typeof MonoPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inactive: Story = {};
export const Active: Story = { args: { active: true } };

function TabGroupDemo() {
  const levels = ["쉬움", "보통", "어려움"];
  const [active, setActive] = useState(levels[0]);
  return (
    <div className="flex gap-2">
      {levels.map((level) => (
        <MonoPill key={level} active={active === level} onClick={() => setActive(level)}>
          {level}
        </MonoPill>
      ))}
    </div>
  );
}

/** As a tab group: one active at a time. */
export const TabGroup: Story = { render: () => <TabGroupDemo /> };
