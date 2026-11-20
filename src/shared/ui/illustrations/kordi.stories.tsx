import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KordiLogo } from "./kordi-logo";
import { KordiMascot } from "./kordi-mascot";

const meta = {
  title: "Shared/Illustrations/KordiMascot",
  component: KordiMascot,
  tags: ["autodocs"],
  args: { size: "md", mood: "idle", interactive: false },
  argTypes: {
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
    mood: { control: "inline-radio", options: ["idle", "correct", "wrong"] },
  },
} satisfies Meta<typeof KordiMascot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Correct: Story = { args: { mood: "correct" } };
export const Wrong: Story = { args: { mood: "wrong" } };
export const Interactive: Story = { args: { interactive: true, size: "lg" } };
export const Logo: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <KordiLogo size={20} />
      <KordiLogo />
      <KordiLogo size={48} />
    </div>
  ),
};
