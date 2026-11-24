import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { MyCharacter } from "@/entities/character";
import { CharacterEditor } from "./character-editor";

const ME = ["character", "me"] as const;

const withCrown: MyCharacter = {
  appearance: { body: "mint", hat: "crown", face: "smile", accessory: null, pet: null },
  unlocked: ["crown"],
};

const meta = {
  title: "Features/CharacterCustomize/CharacterEditor",
  component: CharacterEditor,
  tags: ["autodocs"],
  parameters: { queries: [[ME, withCrown]] },
} satisfies Meta<typeof CharacterEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The cloud-course crown is owned; the star crown is still locked. */
export const CrownUnlocked: Story = {};

export const Fresh: Story = {
  parameters: {
    queries: [[ME, { appearance: { body: "cream", hat: null, face: "default", accessory: null, pet: null }, unlocked: [] }]],
  },
};

export const AllRewards: Story = {
  parameters: {
    queries: [[ME, { appearance: { body: "lilac", hat: "star-crown", face: "sparkle", accessory: "glasses", pet: null }, unlocked: ["crown", "star-crown"] }]],
  },
};

/** Nothing seeded: skeletons while the request is in flight, then the error message once it fails. */
export const Unseeded: Story = { parameters: { queries: [] } };
