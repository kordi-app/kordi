import * as Tone from "tone";

// --- Types ---

export type InstrumentId =
  | "piano"
  | "electric-piano"
  | "synth-pad"
  | "organ"
  | "bright-synth";

export interface InstrumentInfo {
  id: InstrumentId;
  labelKey: string;
}

type InstrumentFactory = () => Tone.PolySynth;

// --- Registry ---

// Every instrument is synthesized in the browser: no recorded samples to download
// (or to credit), and loading is instant.

/**
 * Instruments are levelled to sound about as loud as the piano (measured offline with
 * a K-weighted RMS of a struck C-major chord): a sawtooth or an organ at 0 dB came out
 * ~10–15 dB louder and clipped.
 */
const ORGAN_DB = -15;

function withVolume<T extends { volume: { value: number } }>(instrument: T, db: number): T {
  instrument.volume.value = db;
  return instrument;
}

function makeSynth(options: Record<string, unknown>): Tone.PolySynth {
  const s = new Tone.PolySynth(Tone.Synth);
  s.set(options);
  s.maxPolyphony = 40; // two-hand chords with a long release need room
  return s.toDestination();
}

function makeFMSynth(options: Record<string, unknown>): Tone.PolySynth {
  const s = new Tone.PolySynth(Tone.FMSynth);
  s.set(options);
  s.maxPolyphony = 40; // two-hand chords with a long release need room
  return s.toDestination();
}

const INSTRUMENT_STRATEGIES: Record<InstrumentId, InstrumentFactory> = {
  // a struck, decaying tone with a bright attack that mellows: piano-like, no samples
  "piano": () => {
    const s = makeFMSynth({
      harmonicity: 2,
      modulationIndex: 2.4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.002, decay: 1.8, sustain: 0.08, release: 1.1 },
      modulation: { type: "triangle" },
      modulationEnvelope: { attack: 0.002, decay: 0.45, sustain: 0.04, release: 0.5 },
    });
    s.volume.value = -3;
    return s;
  },

  "electric-piano": () =>
    withVolume(
      makeFMSynth({
        harmonicity: 3,
        modulationIndex: 1.5,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.4, sustain: 0.3, release: 1.2 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
      }),
      -2,
    ),

  "synth-pad": () =>
    withVolume(
      makeSynth({
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 2 },
      }),
      -15.5,
    ),

  // through a hall reverb: notes bloom into the room and fade, instead of piling up
  "organ": () => {
    const s = new Tone.PolySynth(Tone.Synth);
    s.set({
      oscillator: { type: "sine4" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.5 },
    });
    s.maxPolyphony = 40; // two-hand chords with a long release need room
    const hall = new Tone.Reverb({ decay: 2.6, preDelay: 0.02, wet: 0.3 });
    s.chain(hall, Tone.getDestination());
    // the reverb lives and dies with the instrument
    const dispose = s.dispose.bind(s);
    s.dispose = () => {
      hall.dispose();
      return dispose();
    };
    return withVolume(s, ORGAN_DB);
  },

  // a sawtooth through a lowpass that opens on the attack and closes again: bright, not harsh
  "bright-synth": () => {
    const s = new Tone.PolySynth(Tone.MonoSynth);
    s.set({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.8 },
      filter: { type: "lowpass", Q: 1.5, rolloff: -24 },
      filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.35, release: 0.6, baseFrequency: 400, octaves: 3.2 },
    });
    s.maxPolyphony = 40; // two-hand chords with a long release need room
    return withVolume(s.toDestination(), -11);
  },
};

export const INSTRUMENTS: InstrumentInfo[] = [
  { id: "piano", labelKey: "piano" },
  { id: "electric-piano", labelKey: "electricPiano" },
  { id: "synth-pad", labelKey: "synthPad" },
  { id: "organ", labelKey: "organ" },
  { id: "bright-synth", labelKey: "brightSynth" },
];

// --- Singleton State ---

let current: Tone.PolySynth | null = null;
let currentId: InstrumentId | null = null;

// --- Public API ---

export async function loadInstrument(id: InstrumentId): Promise<void> {
  if (currentId === id && current) return;
  current?.dispose();
  current = INSTRUMENT_STRATEGIES[id]();
  currentId = id;
}

/** Make sure some instrument is ready (the piano, unless another was picked). */
export function loadDefaultInstrument(): Promise<void> {
  if (current) return Promise.resolve();
  return loadInstrument("piano");
}

export function playNoteOn(midi: number, velocity: number): void {
  if (!current) return;
  const note = Tone.Frequency(midi, "midi").toNote();
  current.triggerAttack(note, Tone.now(), velocity);
}

export function playNoteOff(midi: number): void {
  if (!current) return;
  const note = Tone.Frequency(midi, "midi").toNote();
  current.triggerRelease(note, Tone.now());
}

export function getCurrentInstrumentId(): InstrumentId | null {
  return currentId;
}

export function disposeSampler(): void {
  current?.dispose();
  current = null;
  currentId = null;
}
