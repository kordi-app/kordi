import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MidiStatus } from "./midi-status";

const meta = {
  title: "Widgets/PianoKeyboard/MidiStatus",
  component: MidiStatus,
  tags: ["autodocs"],
  args: { midiName: undefined, fallback: "MIDI 장치 없음", inline: false },
} satisfies Meta<typeof MidiStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disconnected: Story = {};

export const Connected: Story = { args: { midiName: "Roland FP-30X" } };

/** More than one device — the pill turns into a device selector. */
export const MultipleDevices: Story = {
  args: {
    midiName: "Roland FP-30X",
    devices: [
      { id: "fp30x", name: "Roland FP-30X" },
      { id: "keystep", name: "Arturia KeyStep 37" },
      { id: "mpk", name: "AKAI MPK mini" },
    ],
    selectedDeviceId: "fp30x",
    onSelectDevice: fn(),
  },
};

/** Just the pill, without the right-aligned row wrapper. */
export const Inline: Story = { args: { midiName: "Yamaha P-125", inline: true } };
