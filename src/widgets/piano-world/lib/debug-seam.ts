/**
 * A read-only window into the world for automated playtests (Playwright etc.),
 * available in development builds (and e2e builds, below): `window.__kordi`. Scripts read where
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

/**
 * On in development, and in a build made for the e2e playtests
 * (NEXT_PUBLIC_DEBUG_SEAM=1 at build time, see playwright.config.ts). Never in
 * a production deploy: nothing sets the flag there.
 */
const SEAM_ON = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SEAM === "1";

export const debugSeam: KordiDebugSeam | null =
  SEAM_ON && typeof window !== "undefined"
    ? (window.__kordi ??= { region: "", pos: { x: 0, y: 0, z: 0 }, airborne: false, voices: [], steps: [] })
    : null;
