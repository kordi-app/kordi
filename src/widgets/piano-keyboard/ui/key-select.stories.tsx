import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ALL_KEYS } from "@/shared/lib/music";
import { KeySelect } from "./key-select";

const meta = {
  title: "Widgets/PianoKeyboard/KeySelect",
  component: KeySelect,
  tags: ["autodocs"],
  args: { value: null, onChange: fn(), label: "조성", autoLabel: "자동" },
} satisfies Meta<typeof KeySelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No key chosen — chords use chart-default spellings. */
export const Auto: Story = {};

export const KeySelected: Story = {
  args: { value: ALL_KEYS.find((k) => k.root === 2 && k.mode === "minor") ?? null },
};
