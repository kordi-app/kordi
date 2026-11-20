import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MetronomeDisplay } from "./metronome-display";

const meta = {
  title: "Widgets/ChordPracticeGame/MetronomeDisplay",
  component: MetronomeDisplay,
  tags: ["autodocs"],
  args: { beatsPerBar: 4, currentBeat: 0, isPlaying: true },
  argTypes: {
    beatsPerBar: { control: { type: "number", min: 1, max: 12 } },
    currentBeat: { control: { type: "number", min: 0, max: 11 } },
  },
} satisfies Meta<typeof MetronomeDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 4/4, on the downbeat — the first dot is the largest. */
export const Downbeat: Story = {};

export const OffBeat: Story = { args: { currentBeat: 2 } };

export const ThreeFour: Story = { args: { beatsPerBar: 3, currentBeat: 1 } };

export const SixEight: Story = { args: { beatsPerBar: 6, currentBeat: 3 } };

/** Renders nothing while the drill is not playing. */
export const Stopped: Story = { args: { isPlaying: false } };
