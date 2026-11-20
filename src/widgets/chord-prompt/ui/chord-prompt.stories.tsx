import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChordPrompt } from "./chord-prompt";

const meta = {
  title: "Widgets/ChordPrompt/ChordPrompt",
  component: ChordPrompt,
  tags: ["autodocs"],
  args: {
    ns: "chordPractice",
    chordName: "Cmaj7",
    nextChordName: "Am7",
    showNext: true,
    feedbackState: null,
  },
  argTypes: {
    feedbackState: { control: "inline-radio", options: [null, "correct", "incorrect", "timeout"] },
    ns: { control: "inline-radio", options: ["chordPractice", "chordQuiz"] },
  },
} satisfies Meta<typeof ChordPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutNext: Story = { args: { showNext: false } };

export const Correct: Story = { args: { feedbackState: "correct" } };

export const Incorrect: Story = { args: { feedbackState: "incorrect" } };

export const Timeout: Story = { args: { feedbackState: "timeout" } };

/** No chord yet — shows a dash. */
export const Empty: Story = { args: { chordName: null, nextChordName: null } };
