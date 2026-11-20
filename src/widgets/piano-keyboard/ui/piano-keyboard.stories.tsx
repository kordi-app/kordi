import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import type { ActiveNote } from "@/entities/note";
import { PianoKeyboard } from "./piano-keyboard";

const notes = (midis: number[], source: ActiveNote["source"] = "keyboard"): ActiveNote[] =>
  midis.map((midi) => ({ midi, velocity: 96, source }));

const meta = {
  title: "Widgets/PianoKeyboard/PianoKeyboard",
  component: PianoKeyboard,
  tags: ["autodocs"],
  args: {
    activeNotes: [],
    onNoteOn: fn(),
    onNoteOff: fn(),
    showShortcuts: true,
    octave: 3,
  },
} satisfies Meta<typeof PianoKeyboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

/** C major triad (C4 E4 G4) held down. */
export const CMajorTriad: Story = { args: { activeNotes: notes([60, 64, 67]) } };

/** Black keys active too: F#m7 played from a MIDI device. */
export const BlackKeys: Story = { args: { activeNotes: notes([54, 57, 61, 64], "midi") } };

/** Sustain pedal: the released bass note keeps a lighter "ringing" highlight. */
export const WithRinging: Story = {
  args: { activeNotes: notes([64, 67, 71]), ringingNotes: [48, 55] },
};

export const NoShortcuts: Story = {
  args: { showShortcuts: false, activeNotes: notes([62, 65, 69, 72]) },
};

/** A single octave, as on narrow screens. */
export const OneOctave: Story = {
  args: { startMidi: 60, endMidi: 72, activeNotes: notes([60, 63, 67]) },
};
