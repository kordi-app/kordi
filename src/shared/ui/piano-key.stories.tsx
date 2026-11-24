import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PianoKey } from "./piano-key";

const meta = {
  title: "Shared/PianoKey",
  component: PianoKey,
  tags: ["autodocs"],
  args: { midi: 60, isBlack: false, isActive: false, noteName: "C4", keyboardShortcut: "a" },
  decorators: [(Story) => <div className="relative flex h-48"><Story /></div>],
} satisfies Meta<typeof PianoKey>;

export default meta;
type Story = StoryObj<typeof meta>;

export const White: Story = {};
export const WhiteActive: Story = { args: { isActive: true } };
export const Ringing: Story = { args: { isRinging: true } };
export const Black: Story = { args: { midi: 61, isBlack: true, noteName: "C#4", keyboardShortcut: "w" } };
