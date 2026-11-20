import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Countdown } from "./countdown";

const meta = {
  title: "Shared/Countdown",
  component: Countdown,
  tags: ["autodocs"],
  args: { from: 3, onComplete: fn() },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Countdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FromThree: Story = {};
export const FromFive: Story = { args: { from: 5 } };
