import type { AdventureView } from "@/entities/chord-adventure";
import { GROUND_Y, H } from "./scenes";

/** A pixel of a burst monster (or a spark). */
export interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

/** A word floating up ("MISS", "PERFECT!"). */
export interface Pop {
  text: string;
  color: string;
  x: number;
  y: number;
  born: number;
}

/**
 * Everything the stage remembers between frames: the scrolling world, live
 * particles and words, one-shot markers, and animation phases.
 */
export interface StageFx {
  scroll: number;
  bits: Bit[];
  pops: Pop[];
  /** the stage whose monster already burst (so it bursts once) */
  burstFor: number;
  /** the miss already announced with "MISS" */
  missSeen: number;
  /** the boss hit (a chord short of its whole progression) already announced */
  bossHitSeen: number;
  /** the lost life already announced */
  hurtSeen: number;
  /** the penalty as shown: eases toward the real one, so a miss is a dash, not a teleport */
  shownPenalty: number;
  /**
   * Animation phases that speed up with danger, accumulated frame by frame.
   * (sin(time × rate) with a changing rate jumps by time × Δrate — with time
   * in seconds since the page opened, that made Kordi tremble.)
   */
  heroPhase: number;
  monsterHopPhase: number;
  monsterFramePhase: number;
  /** the white hit flash, 1 → 0 */
  flash: number;
}

export const createStageFx = (): StageFx => ({
  scroll: 0,
  bits: [],
  pops: [],
  burstFor: -1,
  missSeen: -Infinity,
  bossHitSeen: -Infinity,
  hurtSeen: -Infinity,
  shownPenalty: 0,
  heroPhase: 0,
  monsterHopPhase: 0,
  monsterFramePhase: 0,
  flash: 0,
});

/** What each scene's monster breaks into. */
const BURST_COLORS: Record<AdventureView["scene"], string[]> = {
  meadow: ["#ff7eb6", "#ffb3d4", "#ffe3f0", "#c94f86"],
  forest: ["#ff8a3d", "#fff3d6", "#f3dcc0", "#c45a1f"],
  cave: ["#a05ad6", "#7b3fb8", "#ffd75a", "#c58cf0"],
  castle: ["#9aa3b8", "#cdd4e4", "#4fc3ff", "#ffd75a"],
  volcano: ["#ff5a36", "#ffd23f", "#ff8f66", "#fff36b"],
};

/** Burst a beaten monster into pixels, with a white star of sparks at the impact. */
export function burst(into: Bit[], x: number, y: number, scene: AdventureView["scene"], boss: boolean) {
  const n = boss ? 70 : 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 30 + Math.random() * (boss ? 90 : 60);
    into.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 50, life: 0.8 + Math.random() * 0.8, color: BURST_COLORS[scene][i % 4] });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    into.push({ x, y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.25, color: "#ffffff" });
  }
}

/** Age and move the burst pixels (they fall and bounce on the ground); drops the dead ones. */
export function stepBits(fx: StageFx, dt: number) {
  fx.bits = fx.bits.filter((b) => (b.life -= dt) > 0 && b.y < H);
  for (const b of fx.bits) {
    b.vy += 180 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y > GROUND_Y) {
      b.y = GROUND_Y;
      b.vy *= -0.35;
      b.vx *= 0.7;
    }
  }
}
