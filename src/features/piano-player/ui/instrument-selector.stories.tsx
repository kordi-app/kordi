import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InstrumentSelector } from "./instrument-selector";

const meta = {
  title: "Features/PianoPlayer/InstrumentSelector",
  component: InstrumentSelector,
  tags: ["autodocs"],
} satisfies Meta<typeof InstrumentSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Picking an instrument downloads its samples, so the buttons dim while loading. */
export const Default: Story = {};

export const Narrow: Story = {
  decorators: [(Story) => <div className="w-48"><Story /></div>],
};
