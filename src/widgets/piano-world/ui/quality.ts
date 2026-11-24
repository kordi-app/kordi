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
  /** canvas device-pixel-ratio range */
  dpr: [number, number];
  /** keep every n-th grass tuft / flower */
  undergrowthStride: number;
}

const HIGH: Quality = { tier: "high", shadows: true, shadowMap: 2048, dpr: [1, 1.75], undergrowthStride: 1 };
const LOW: Quality = { tier: "low", shadows: true, shadowMap: 1024, dpr: [1, 1.25], undergrowthStride: 2 };
const MINIMAL: Quality = { tier: "minimal", shadows: false, shadowMap: 256, dpr: [0.5, 0.5], undergrowthStride: 6 };

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
