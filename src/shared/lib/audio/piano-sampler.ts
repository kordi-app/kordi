import * as Tone from "tone";

// --- Types ---

export type InstrumentId =
  | "grand-piano"
  | "electric-piano"
  | "synth-pad"
  | "organ"
  | "bright-synth";

export interface InstrumentInfo {
  id: InstrumentId;
  labelKey: string;
}

type InstrumentFactory = () => Tone.Sampler | Tone.PolySynth;

// --- Registry ---

const SAMPLE_BASE_URL = "https://tonejs.github.io/audio/salamander/";

const SALAMANDER_URLS: Record<string, string> = {
  A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
  A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
  A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
  A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
  A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
  A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
  A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
  A7: "A7.mp3", C8: "C8.mp3",
};

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
  "grand-piano": () =>
    new Tone.Sampler({
      urls: SALAMANDER_URLS,
      baseUrl: SAMPLE_BASE_URL,
      release: 1,
    }).toDestination(),

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
  { id: "grand-piano", labelKey: "grandPiano" },
  { id: "electric-piano", labelKey: "electricPiano" },
  { id: "synth-pad", labelKey: "synthPad" },
  { id: "organ", labelKey: "organ" },
  { id: "bright-synth", labelKey: "brightSynth" },
];

// --- Singleton State ---

let current: Tone.Sampler | Tone.PolySynth | null = null;
let currentId: InstrumentId | null = null;

// --- Public API ---

/** Give up on the piano samples after this long (slow or blocked network). */
const SAMPLE_TIMEOUT_MS = 20_000;

export async function loadInstrument(id: InstrumentId): Promise<void> {
  if (currentId === id && current) return;

  current?.dispose();
  current = null;
  currentId = null;

  if (id === "grand-piano") {
    // Sampler loads its samples asynchronously. A failed or hung download
    // must reject, or callers waiting on it (and their UI) stay stuck forever.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        s.dispose();
        reject(new Error("Piano samples timed out"));
      }, SAMPLE_TIMEOUT_MS);
      const s = new Tone.Sampler({
        urls: SALAMANDER_URLS,
        baseUrl: SAMPLE_BASE_URL,
        release: 1,
        onload: () => {
          clearTimeout(timeout);
          current = s;
          currentId = id;
          resolve();
        },
        onerror: (error) => {
          clearTimeout(timeout);
          s.dispose();
          reject(error);
        },
      }).toDestination();
    });
  } else {
    current = INSTRUMENT_STRATEGIES[id]();
    currentId = id;
  }
}

export function getSampler(): Promise<void> {
  if (current) return Promise.resolve();
  return loadInstrument("grand-piano");
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
