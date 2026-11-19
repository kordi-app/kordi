/**
 * How much the world draws, picked once per visit from the device: phones and
 * low-core machines get half the grass and flowers, a smaller shadow map and a
 * lower pixel ratio, so the island stays smooth there.
 */
export interface Quality {
  tier: "high" | "low";
  /** shadow map resolution (square) */
  shadowMap: number;
  /** canvas device-pixel-ratio range */
  dpr: [number, number];
  /** keep every n-th grass tuft / flower */
  undergrowthStride: number;
}

const HIGH: Quality = { tier: "high", shadowMap: 2048, dpr: [1, 1.75], undergrowthStride: 1 };
const LOW: Quality = { tier: "low", shadowMap: 1024, dpr: [1, 1.25], undergrowthStride: 2 };

function detect(): Quality {
  if (typeof window === "undefined") return HIGH;
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return touch || cores <= 4 || memory <= 4 ? LOW : HIGH;
}

export const quality: Quality = detect();
