import { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  ADVENTURE_SCENES,
  ADVENTURE_VICTORY_MS,
  sceneFor,
  type AdventureClock,
  type AdventurePhase,
  type AdventureScene,
  type AdventureView,
} from "@/entities/chord-adventure";
import { AdventureStage } from "./adventure-stage";

interface HarnessProps {
  phase: AdventurePhase;
  scene: AdventureScene;
  stage: number;
  /** how much of the time limit has already gone (0–1) */
  progress?: number;
  limitMs?: number;
  loop?: boolean;
}

/**
 * Drives the stage like the game would: holds a phase, with a clock that
 * starts on mount (and loops, so the tension keeps replaying). Remounted per
 * args, so nothing needs syncing.
 */
function Harness(props: HarnessProps) {
  return <HarnessRun key={JSON.stringify(props)} {...props} />;
}

function HarnessRun({ phase, scene, stage, progress = 0, limitMs = 8000, loop = false }: HarnessProps) {
  const [view] = useState<AdventureView>(() => ({
    phase,
    stage,
    scene,
    chord: { id: 1, name: phase === "playing" ? "Am7" : "Cmaj7" },
    boss: null,
    defeated: stage - 1,
    score: (stage - 1) * 300,
    combo: stage - 1,
    lives: phase === "hurt" ? 2 : 3,
  }));
  const clock = useRef<AdventureClock>({
    phaseStartedAt: 0,
    limitMs,
    penaltyMs: 0,
    lastMissAt: -Infinity,
    lastAnswerUsed: 0.2,
    lastGain: 300,
    lastBossHitAt: -Infinity,
  });
  useEffect(() => {
    clock.current.phaseStartedAt = performance.now() - progress * limitMs;
    if (!loop) return;
    const period = phase === "victory" ? ADVENTURE_VICTORY_MS + 600 : limitMs;
    const interval = setInterval(() => {
      clock.current.phaseStartedAt = performance.now();
    }, period);
    return () => clearInterval(interval);
  }, [phase, progress, limitMs, loop]);
  return (
    <div className="max-w-3xl">
      <AdventureStage view={view} clock={clock} />
    </div>
  );
}

const meta = {
  title: "Widgets/ChordAdventure/AdventureStage",
  component: Harness,
  tags: ["autodocs"],
  args: { phase: "playing", scene: "meadow", stage: 3, progress: 0, loop: true },
  argTypes: {
    phase: { control: "select", options: ["ready", "intro", "playing", "victory", "dying", "over"] },
    scene: { control: "select", options: ADVENTURE_SCENES },
    progress: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The time running out, replayed: the monster creeps in and the light fails. */
export const Fight: Story = {};
/** Almost out of time. */
export const Danger: Story = { args: { progress: 0.85, loop: false, limitMs: 60_000 } };
/** Beating a monster, then walking on (into the next scene at a boundary). */
export const Victory: Story = { args: { phase: "victory", stage: 5, scene: sceneFor(5) } };
export const Dying: Story = { args: { phase: "dying", loop: false } };
export const GameOver: Story = { args: { phase: "over", stage: 12, scene: sceneFor(12), loop: false } };
export const Ready: Story = { args: { phase: "ready", loop: false } };
export const Forest: Story = { args: { scene: "forest", stage: 7 } };
export const Cave: Story = { args: { scene: "cave", stage: 12 } };
export const Castle: Story = { args: { scene: "castle", stage: 17 } };
export const Volcano: Story = { args: { scene: "volcano", stage: 22 } };
