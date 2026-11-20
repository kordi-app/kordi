import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DEFAULT_APPEARANCE } from "@/entities/character";
import { CharacterPreview } from "./character-preview";

const meta = {
  title: "Features/CharacterCustomize/CharacterPreview",
  component: CharacterPreview,
  tags: ["autodocs"],
  args: { appearance: DEFAULT_APPEARANCE },
  decorators: [(Story) => <div className="max-w-[360px]"><Story /></div>],
} satisfies Meta<typeof CharacterPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag sideways to spin. */
export const Default: Story = {};

export const Dressed: Story = {
  args: { appearance: { body: "sky", hat: "headphones", face: "smile", accessory: "scarf" } },
};

export const CrownWinner: Story = {
  args: { appearance: { body: "lemon", hat: "crown", face: "sparkle", accessory: "bowtie" } },
};
