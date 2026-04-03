export {
  NOTE_NAMES,
  OCTAVE_SIZE,
  MIDI_MIN,
  MIDI_MAX,
  type NoteName,
  type NoteWithOctave,
} from "./constants";

export {
  midiToNoteName,
  noteNameToMidi,
  midiToOctave,
  isBlackKey,
  getKeyIndex,
} from "./note-utils";

export { detectChord } from "./chord-detection";

export {
  CHORD_TEMPLATES,
  NOTE_LABELS,
  type ChordType,
} from "./chord-templates";

export {
  ALL_KEYS,
  getDiatonicChords,
  rootNameToIndex,
  indexToRootName,
  type KeySignature,
  type DiatonicChord,
} from "./music-theory";

export {
  generateChordPool,
  pickNextChord,
  type GeneratedChord,
} from "./chord-generator";

export { validateChord } from "./chord-validator";

export { toPitchClasses, pitchClassesEqual } from "./pitch-class";

export {
  TIME_SIGNATURE_CONFIGS,
  type TimeSignature,
  type TimeSignatureConfig,
} from "./time-signature";

export {
  NOTE_KEY_OFFSETS,
  CONTROL_KEYS,
  DEFAULT_OCTAVE,
  MIN_OCTAVE,
  MAX_OCTAVE,
  VELOCITY_STEP,
  DEFAULT_VELOCITY,
  offsetToMidi,
  buildKeyboardLabelMap,
} from "./keyboard-map";
