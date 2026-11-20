import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ActiveNote } from "@/entities/note";
import { ALL_KEYS } from "@/shared/lib/music";
import { ChordDisplay } from "./chord-display";

const notes = (midis: number[]): ActiveNote[] => midis.map((midi) => ({ midi, velocity: 96, source: "midi" }));

const F_MAJOR = ALL_KEYS.find((k) => k.root === 5 && k.mode === "major") ?? null;

const meta = {
  title: "Widgets/PianoKeyboard/ChordDisplay",
  component: ChordDisplay,
  tags: ["autodocs"],
  args: { activeNotes: [], placeholder: "건반을 눌러보세요. 코드 이름이 여기에 나와요." },
} satisfies Meta<typeof ChordDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing pressed — shows the placeholder. */
export const Empty: Story = {};

export const CMajor7: Story = { args: { activeNotes: notes([60, 64, 67, 71]) } };

/** Inverted chord (E in the bass) — shows a secondary reading. */
export const Inversion: Story = { args: { activeNotes: notes([52, 60, 67]) } };

/** Pedal-held notes count toward detection. */
export const WithRinging: Story = { args: { activeNotes: notes([65, 69]), ringingNotes: [62] } };

/** Spelled in F major, so A# is written as Bb. */
export const SpelledInKey: Story = { args: { activeNotes: notes([58, 62, 65]), musicKey: F_MAJOR } };
