import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DEFAULT_DRILL_SETTINGS, type DrillSettings } from "@/entities/chord-practice";
import { DrillSettingsPanel } from "./drill-settings-panel";

/** Keeps the edited settings in local state so the controls respond in the canvas. */
function StatefulPanel(props: ComponentProps<typeof DrillSettingsPanel>) {
  const [settings, setSettings] = useState<DrillSettings>(props.settings);
  return (
    <DrillSettingsPanel
      {...props}
      settings={settings}
      onChange={(next) => {
        setSettings(next);
        props.onChange(next);
      }}
    />
  );
}

const meta = {
  title: "Widgets/ChordPracticeGame/DrillSettingsPanel",
  component: DrillSettingsPanel,
  tags: ["autodocs"],
  args: {
    ns: "chordPractice",
    settings: DEFAULT_DRILL_SETTINGS,
    isOpen: true,
    inline: true,
    onChange: fn(),
    onClose: fn(),
  },
  render: (args) => <StatefulPanel key={JSON.stringify(args.settings)} {...args} />,
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof DrillSettingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Practice mode hides tempo, bars and metronome options. */
export const PracticeInline: Story = {};

export const TimeAttackInline: Story = {
  args: {
    settings: {
      ...DEFAULT_DRILL_SETTINGS,
      gameMode: "timeattack",
      difficulty: "intermediate",
      bpm: 120,
      barsPerChord: 2,
      timeSignature: "3/4",
      keyFilter: "G Major",
    },
  },
};

/** Custom difficulty reveals the chord-type multi-select. */
export const CustomChordTypes: Story = {
  args: {
    settings: { ...DEFAULT_DRILL_SETTINGS, difficulty: "custom", customChordTypes: ["", "m", "maj7", "m7", "7"] },
  },
};

/** Slide-over drawer variant with a backdrop. */
export const Drawer: Story = {
  args: { inline: false },
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="h-screen">{Story()}</div>],
};

/** Renders nothing when closed. */
export const Closed: Story = { args: { isOpen: false } };
