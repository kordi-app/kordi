// Logic Pro Musical Typing layout
// Middle row (A-;) = white keys, Top row (W,E,T,Y,U,O,P) = black keys
// R and I are intentionally skipped (no black key between E-F and B-C)

// Relative semitone offsets from the base note (C)
export const NOTE_KEY_OFFSETS: Record<string, number> = {
  // White keys (middle row)
  KeyA: 0, // C
  KeyS: 2, // D
  KeyD: 4, // E
  KeyF: 5, // F
  KeyG: 7, // G
  KeyH: 9, // A
  KeyJ: 11, // B
  KeyK: 12, // C'
  KeyL: 14, // D'
  Semicolon: 16, // E'

  // Black keys (top row)
  KeyW: 1, // C#
  KeyE: 3, // D#
  // R skipped (no black key between E-F)
  KeyT: 6, // F#
  KeyY: 8, // G#
  KeyU: 10, // A#
  // I skipped (no black key between B-C)
  KeyO: 13, // C#'
  KeyP: 15, // D#'
};

// Control keys
export const CONTROL_KEYS = {
  OCTAVE_DOWN: "KeyZ",
  OCTAVE_UP: "KeyX",
  VELOCITY_DOWN: "KeyC",
  VELOCITY_UP: "KeyV",
  // not Tab: Tab moves keyboard focus, and taking it would trap keyboard users
  SUSTAIN: "Space",
} as const;

export const DEFAULT_OCTAVE = 3; // C3 = MIDI 48
export const MIN_OCTAVE = 0;
export const MAX_OCTAVE = 7;
export const VELOCITY_STEP = 20; // out of 127
export const DEFAULT_VELOCITY = 80; // out of 127

// Convert octave + offset to MIDI note number
export function offsetToMidi(offset: number, octave: number): number {
  return (octave + 1) * 12 + offset;
}

// Build display label map for current octave
export function buildKeyboardLabelMap(
  octave: number
): Map<number, string> {
  const map = new Map<number, string>();
  for (const [code, offset] of Object.entries(NOTE_KEY_OFFSETS)) {
    const midi = offsetToMidi(offset, octave);
    const label = code
      .replace("Key", "")
      .replace("Semicolon", ";")
      .toLowerCase();
    map.set(midi, label);
  }
  return map;
}
