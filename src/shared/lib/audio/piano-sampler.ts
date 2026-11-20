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

function makeSynth(options: Record<string, unknown>): Tone.PolySynth {
  const s = new Tone.PolySynth(Tone.Synth);
  s.set(options);
  s.maxPolyphony = 16;
  return s.toDestination();
}

function makeFMSynth(options: Record<string, unknown>): Tone.PolySynth {
  const s = new Tone.PolySynth(Tone.FMSynth);
  s.set(options);
  s.maxPolyphony = 16;
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
    makeFMSynth({
      harmonicity: 3,
      modulationIndex: 1.5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.3, release: 1.2 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
    }),

  "synth-pad": () =>
    makeSynth({
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 2 },
    }),

  "organ": () =>
    makeSynth({
      oscillator: { type: "sine4" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.3 },
    }),

  "bright-synth": () =>
    makeSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.8 },
    }),
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
