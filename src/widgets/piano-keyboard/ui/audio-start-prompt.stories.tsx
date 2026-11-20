import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AudioStartPrompt } from "./audio-start-prompt";

const meta = {
  title: "Widgets/PianoKeyboard/AudioStartPrompt",
  component: AudioStartPrompt,
  tags: ["autodocs"],
  args: {
    title: "소리 켜고 시작하기",
    description: "브라우저 정책상 한 번 눌러야 소리가 나요",
    onStart: fn(),
    variant: "page",
  },
} satisfies Meta<typeof AudioStartPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Page: Story = {};

/** Over already-rendered content; the parent must be `relative`. */
export const Overlay: Story = {
  args: { variant: "overlay" },
  decorators: [
    (Story) => (
      <div className="relative flex h-64 max-w-4xl items-end rounded-lg border border-border bg-card p-4">
        <span className="text-sm text-muted-foreground">(건반 영역)</span>
        {Story()}
      </div>
    ),
  ],
};
