import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DifficultySelect } from "./difficulty-select";

const meta = {
  title: "Widgets/ChordQuizPanel/DifficultySelect",
  component: DifficultySelect,
  tags: ["autodocs"],
  args: { onSelect: fn(), isLoading: false },
} satisfies Meta<typeof DifficultySelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Buttons disabled while the quiz chords are being fetched. */
export const Loading: Story = { args: { isLoading: true } };
