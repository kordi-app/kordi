import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DrillControls } from "./drill-controls";

const meta = {
  title: "Widgets/ChordPracticeGame/DrillControls",
  component: DrillControls,
  tags: ["autodocs"],
  args: {
    ns: "chordPractice",
    status: "idle",
    onStart: fn(),
    onStop: fn(),
    onPause: fn(),
    onResume: fn(),
  },
  argTypes: {
    status: { control: "inline-radio", options: ["idle", "countdown", "playing", "paused"] },
  },
} satisfies Meta<typeof DrillControls>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Start button plus the settings gear. */
export const Idle: Story = {};

export const Playing: Story = { args: { status: "playing" } };

export const Paused: Story = { args: { status: "paused" } };

/** No controls are shown during the countdown. */
export const Countdown: Story = { args: { status: "countdown" } };
