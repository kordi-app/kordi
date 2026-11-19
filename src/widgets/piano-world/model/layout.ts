/**
 * Geometry of the walkable keyboard, in world units (1 = one white key wide).
 * Pure data + hit testing, so the scene and the audio wiring agree on which
 * key is under Kordi without either owning the other.
 */

/** A full 88-key piano: A0 (21) to C8 (108). */
export const START_MIDI = 21;
export const END_MIDI = 108;

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
const isBlack = (midi: number) => BLACK_PITCH_CLASSES.has(midi % 12);

export const WHITE_COUNT = Array.from(
  { length: END_MIDI - START_MIDI + 1 },
  (_, i) => START_MIDI + i,
).filter((midi) => !isBlack(midi)).length; // 52

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
  let whiteIndex = -1;
  let lastWhiteX = 0;
  for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
    if (!isBlack(midi)) {
      whiteIndex++;
      lastWhiteX = (whiteIndex - (WHITE_COUNT - 1) / 2) * WHITE_W;
      keys.push({ midi, black: false, x: lastWhiteX, z: 0, width: WHITE_W - WHITE_GAP, length: WHITE_L, height: WHITE_H });
    } else {
      keys.push({
        midi,
        black: true,
        // Between the white key to its left and the next one
        x: lastWhiteX + WHITE_W / 2,
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

/** Where newcomers appear: in front of middle C. */
export const SPAWN = { x: KEYS.find((k) => k.midi === 60)!.x, z: WHITE_L / 2 + 1.1 };

/** Walkable area: the keyboard plus a margin of floor around it. */
export const BOUNDS = {
  // must stay inside the server's position check (WorldLobby: |x| ≤ 110, |z| ≤ 85)
  x: (WHITE_COUNT * WHITE_W) / 2 + 34,
  zMin: -WHITE_L / 2 - 20,
  // a wide plaza in front of the keys for portals and props
  zMax: WHITE_L / 2 + 22,
};
