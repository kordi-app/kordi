/**
 * How much the world draws, picked once per visit from the device: phones and
 * low-core machines get half the grass and flowers, a smaller shadow map and a
 * lower pixel ratio, so the island stays smooth there.
 *
 * `?quality=high|low|minimal` overrides it. Minimal (no shadows, a quarter of
 * the pixels, sparse undergrowth) is for machines without a GPU — the e2e
 * playtests render on the CPU — and anyone whose device struggles.
 */
export interface Quality {
  tier: "high" | "low" | "minimal";
  /** draw shadows at all */
  shadows: boolean;
  /** shadow map resolution (square) */
  shadowMap: number;
  /** keep every n-th grass tuft / flower */
  undergrowthStride: number;
}

const HIGH: Quality = { tier: "high", shadows: true, shadowMap: 2048, undergrowthStride: 1 };
const LOW: Quality = { tier: "low", shadows: true, shadowMap: 1024, undergrowthStride: 2 };
const MINIMAL: Quality = { tier: "minimal", shadows: false, shadowMap: 256, undergrowthStride: 6 };

const TIERS = { high: HIGH, low: LOW, minimal: MINIMAL } as const;

function detect(): Quality {
  if (typeof window === "undefined") return HIGH;
  const asked = new URLSearchParams(window.location.search).get("quality");
  if (asked && asked in TIERS) return TIERS[asked as keyof typeof TIERS];
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return touch || cores <= 4 || memory <= 4 ? LOW : HIGH;
}

export const quality: Quality = detect();

/**
 * The pixel ratio can change while the world runs, without rebuilding the
 * scene, and it's what costs the most. Each tier has a ladder of pixel ratios,
 * cheapest first; the world starts at the top (what the tier always drew) and
 * steps down when frames run slow, back up when there's room again
 * (piano-world-scene.tsx, drei's PerformanceMonitor).
 */
export const LADDERS: Record<Quality["tier"], readonly number[]> = {
  high: [1, 1.25, 1.5, 1.75],
  low: [0.85, 1, 1.25],
  minimal: [0.5],
};

/** One step down the ladder (or stay at the bottom) */
export const stepDown = (step: number) => Math.max(0, step - 1);

/** One step up the ladder (or stay at the top) */
export const stepUp = (step: number, ladder: readonly number[]) => Math.min(ladder.length - 1, step + 1);

/**
 * After this many turns of direction (down then up, or up then down) the
 * ladder stops climbing: the device sits right on the edge, and bouncing
 * between two steps is worse than staying on the lower one.
 */
export const MAX_TURNS = 3;

export interface LadderState {
  step: number;
  last: "up" | "down" | null;
  turns: number;
  /** no more climbing (it can still step down if frames run slow) */
  settled: boolean;
}

export const startLadder = (ladder: readonly number[]): LadderState => ({
  step: ladder.length - 1,
  last: null,
  turns: 0,
  settled: false,
});

/** The ladder after frames ran slow ("down") or had room to spare ("up") */
export function adapt(state: LadderState, direction: "up" | "down", ladder: readonly number[]): LadderState {
  if (direction === "up" && state.settled) return state;
  const step = direction === "down" ? stepDown(state.step) : stepUp(state.step, ladder);
  // already at that end: nothing changes, not even the state. The monitor keeps reporting
  // room to spare at the top, and a fresh state each time would redraw the whole page
  if (step === state.step) return state;
  const turns = state.turns + (state.last !== null && state.last !== direction ? 1 : 0);
  const settled = state.settled || turns >= MAX_TURNS;
  // the turn that settles it doesn't climb: it stays on the lower step
  if (direction === "up" && settled) return { ...state, turns, settled, last: direction };
  return { step, last: direction, turns, settled };
}

/**
 * A tier's ladder on a screen of this density: never more pixels than the
 * screen has, so the steps above it fold into one at the screen's own ratio.
 * (Left in, they'd be steps that change nothing, and a slow device would
 * spend a decline on each before anything got cheaper.)
 */
export function ladderFor(ladder: readonly number[], screen: number): readonly number[] {
  const below = ladder.filter((dpr) => dpr < screen);
  return below.length === ladder.length ? ladder : [...below, screen];
}
