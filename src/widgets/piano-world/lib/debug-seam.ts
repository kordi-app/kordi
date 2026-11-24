/**
 * A read-only window into the world for automated playtests (Playwright etc.),
 * available in development builds only: `window.__kordi`. Scripts read where
 * Kordi is and which sounds fired instead of guessing from pixels.
 * In production this is null and every write is skipped.
 */
export interface KordiDebugSeam {
  region: string;
  pos: { x: number; y: number; z: number };
  airborne: boolean;
  /** island voices struck (bridge, drums, pipes, harp, crystals, bell) */
  voices: { id: string; midi: number; t: number }[];
  /** keys stepped on */
  steps: { midi: number; t: number }[];
  /** a script may set: treat it as night for the midnight bell (`__kordi.night = true`) */
  night?: boolean;
  /** a script may set: put Kordi here on the next frame, then it's cleared (`__kordi.teleport = { x, y, z }`) */
  teleport?: { x: number; y: number; z: number } | null;
}

declare global {
  interface Window {
    __kordi?: KordiDebugSeam;
  }
}

export const debugSeam: KordiDebugSeam | null =
  process.env.NODE_ENV === "development" && typeof window !== "undefined"
    ? (window.__kordi ??= { region: "", pos: { x: 0, y: 0, z: 0 }, airborne: false, voices: [], steps: [] })
    : null;
