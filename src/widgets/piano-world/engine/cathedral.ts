import { BOUNDS, KEYS, SPAWN, WHITE_L } from "./layout";

/**
 * The cathedral: tall windows (out of sight, above) pour coloured light onto
 * the floor behind the keyboard, and each pool brightens while a note rings
 * beneath it. Behind them lies the rose window's light, a rosette on the
 * floor with four panes marked C · E · G · C. Rest on those notes in turn and
 * the panes light one by one; the last opens the whole rose.
 *
 * Notes count only when you stand on them a beat (DWELL): walking along the
 * keys plays every note in between, and those shouldn't break (or complete)
 * the phrase.
 */

/** Pitch classes of the phrase: C, E, G and C again */
export const AMEN = [0, 4, 7, 0] as const;

/** Seconds on a key before it counts as played */
export const DWELL = 0.35;

/** Columns stand on this line (engine/decor.ts); the windows sit between them */
const COLUMN_Z = -WHITE_L / 2 - 3;
const COLUMN_STEP = 6;
const FIRST_COLUMN = -BOUNDS.x + 4;
const WINDOW_COUNT = Math.floor((BOUNDS.x - 4 - FIRST_COLUMN) / COLUMN_STEP);

/** A pool of window light on the floor, behind the colonnade */
export interface LightPool {
  x: number;
  z: number;
  /** pane colour, 0–1 hue */
  hue: number;
}

export const POOL_SIZE = { width: 3.4, length: 4 };
const POOL_Z = COLUMN_Z - 3.5;

export const LIGHT_POOLS: readonly LightPool[] = Array.from({ length: WINDOW_COUNT }, (_, i) => ({
  x: FIRST_COLUMN + COLUMN_STEP / 2 + i * COLUMN_STEP,
  z: POOL_Z,
  // the windows run through the colours of a rainbow and back
  hue: (i * 0.137 + 0.58) % 1,
}));

/** The rose window's light, centred behind middle C */
export const ROSETTE = { x: SPAWN.x, z: POOL_Z - 5.5, radius: 3.4 };

/** Which pool lights for a key: the one nearest it along the keyboard */
export function poolFor(x: number): number {
  const i = Math.round((x - LIGHT_POOLS[0].x) / COLUMN_STEP);
  return Math.min(Math.max(i, 0), LIGHT_POOLS.length - 1);
}

/** How bright each pool is right now, 0–1: written by the pools' frame, read by their shafts */
export const poolGlow = new Float32Array(LIGHT_POOLS.length);

/** Pool index per MIDI note (only keys that exist) */
export const POOL_OF_MIDI: ReadonlyMap<number, number> = new Map(KEYS.map((key) => [key.midi, poolFor(key.x)]));

export interface AmenState {
  /** panes lit so far, 0–3 */
  progress: number;
  /** clock time the progress last changed (for easing a pane in or out) */
  changedAt: number;
  /** clock time the rose last opened */
  bloomAt: number;
  /** the key underfoot, when it was reached, and whether it has been counted yet */
  under: number | null;
  since: number;
  counted: boolean;
}

export const createAmen = (): AmenState => ({
  progress: 0,
  changedAt: -Infinity,
  bloomAt: -Infinity,
  under: null,
  since: 0,
  counted: false,
});

/** Shared by the frame that walks Kordi and the decor that draws the rose */
export const cathedralRuntime: AmenState = createAmen();

export function resetAmen(state: AmenState = cathedralRuntime) {
  Object.assign(state, createAmen());
  poolGlow.fill(0);
}

export type AmenEvent = { kind: "pane"; midi: number } | { kind: "bloom" } | { kind: "miss" };

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/** Play one note of the phrase: the right one lights a pane, a wrong one starts over. */
export function playAmen(state: AmenState, midi: number, now: number): AmenEvent {
  const before = state.progress;
  const pc = pitchClass(midi);
  if (pc === AMEN[state.progress]) {
    state.progress += 1;
  } else {
    // a C is always a fresh start
    state.progress = pc === AMEN[0] ? 1 : 0;
  }
  if (state.progress === AMEN.length) {
    state.progress = 0;
    state.bloomAt = now;
    state.changedAt = now;
    return { kind: "bloom" };
  }
  if (state.progress !== before) state.changedAt = now;
  return state.progress > before ? { kind: "pane", midi } : { kind: "miss" };
}

/**
 * Called every frame with the key underfoot (null in the air). Returns an
 * event the moment a key has been stood on for DWELL, otherwise null.
 */
export function dwellAmen(state: AmenState, midi: number | null, now: number): AmenEvent | null {
  if (midi !== state.under) {
    state.under = midi;
    state.since = now;
    state.counted = false;
    return null;
  }
  if (midi === null || state.counted || now - state.since < DWELL) return null;
  state.counted = true;
  return playAmen(state, midi, now);
}
