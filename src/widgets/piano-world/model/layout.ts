/**
 * Geometry of the walkable keyboard, in world units (1 = one white key wide).
 * Pure data + hit testing, so the scene and the audio wiring agree on which
 * key is under Kordi without either owning the other.
 */

/** C3 — the floor spans two octaves plus the top C (C3–C5). */
export const START_MIDI = 48;
export const WHITE_COUNT = 15;

export const WHITE_W = 1;
export const WHITE_GAP = 0.06;
export const WHITE_L = 5;
export const WHITE_H = 0.3;

export const BLACK_W = 0.58;
export const BLACK_L = 3.1;
export const BLACK_H = 0.55;

/** Height of the keyboard case the keys sit on. */
export const CASE_H = 0.15;
/** How far a key sinks while stood on. */
export const PRESS_DEPTH = 0.08;

const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
/** White-key degrees (C D _ F G A _) that have a black key to their right. */
const HAS_BLACK_AFTER = new Set([0, 1, 3, 4, 5]);

export interface KeyDef {
  midi: number;
  black: boolean;
  /** Centre of the key's top face footprint. */
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
}

function buildKeys(): KeyDef[] {
  const keys: KeyDef[] = [];
  for (let i = 0; i < WHITE_COUNT; i++) {
    const degree = i % 7;
    const midi = START_MIDI + Math.floor(i / 7) * 12 + WHITE_STEPS[degree];
    const x = (i - (WHITE_COUNT - 1) / 2) * WHITE_W;
    keys.push({ midi, black: false, x, z: 0, width: WHITE_W - WHITE_GAP, length: WHITE_L, height: WHITE_H });

    if (HAS_BLACK_AFTER.has(degree) && i < WHITE_COUNT - 1) {
      keys.push({
        midi: midi + 1,
        black: true,
        x: x + WHITE_W / 2,
        // Black keys sit toward the back (−z), flush with the white keys' back edge
        z: -(WHITE_L - BLACK_L) / 2,
        width: BLACK_W,
        length: BLACK_L,
        height: BLACK_H,
      });
    }
  }
  return keys;
}

export const KEYS: readonly KeyDef[] = buildKeys();

const BLACK_KEYS = KEYS.filter((k) => k.black);
const WHITE_KEYS = KEYS.filter((k) => !k.black);

/** The key under a floor position, or null when off the keyboard. Black keys win where they overlap. */
export function keyAt(x: number, z: number): KeyDef | null {
  for (const key of BLACK_KEYS) {
    if (Math.abs(x - key.x) <= key.width / 2 && Math.abs(z - key.z) <= key.length / 2) {
      return key;
    }
  }
  if (Math.abs(z) > WHITE_L / 2) return null;
  const index = Math.round(x / WHITE_W + (WHITE_COUNT - 1) / 2);
  const key = WHITE_KEYS[index];
  return key && Math.abs(x - key.x) <= WHITE_W / 2 ? key : null;
}

/** Walkable area: the keyboard plus a margin of floor around it. */
export const BOUNDS = {
  x: (WHITE_COUNT * WHITE_W) / 2 + 1.5,
  zMin: -WHITE_L / 2 - 1.5,
  zMax: WHITE_L / 2 + 3,
};
