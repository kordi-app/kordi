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

/** What notes are played through: a sampler and a polysynth answer triggerAttack/Release alike. */
type Instrument = Tone.PolySynth | Tone.Sampler;

/** Builds an instrument; a sampled one resolves once its samples are decoded. */
type InstrumentFactory = () => Instrument | Promise<Instrument>;

// --- Registry ---

// The piano plays recorded samples: the Knight upright piano from the Versilian Community
// Sample Library (https://github.com/sgossner/VCSL), released under CC0 1.0 (public
// domain: no attribution required, commercial use allowed). One velocity layer, sampled
// every 2–4 semitones from A0 to C8, served from public/audio/piano/ (see the README
// there). Every other instrument is synthesized in the browser and loads instantly.

/**
 * Instruments are levelled to sound about as loud as the piano (measured offline with
 * a K-weighted RMS of a struck C-major chord): a sawtooth or an organ at 0 dB came out
 * ~10–15 dB louder and clipped.
 */
const ORGAN_DB = -15;
/** the sampled piano at the level the synths were matched to (offline, C-major chord at velocity 0.7) */
const PIANO_DB = -5;

/** Sampled notes → files in public/audio/piano/ (a sharp is spelled "s" in file names). */
const PIANO_SAMPLES: Record<string, string> = {
  A0: "A0.m4a", B0: "B0.m4a", "D#1": "Ds1.m4a", F1: "F1.m4a",
  A1: "A1.m4a", B1: "B1.m4a", "D#2": "Ds2.m4a", F2: "F2.m4a",
  A2: "A2.m4a", B2: "B2.m4a", "D#3": "Ds3.m4a", F3: "F3.m4a",
  A3: "A3.m4a", B3: "B3.m4a", "D#4": "Ds4.m4a", F4: "F4.m4a",
  A4: "A4.m4a", B4: "B4.m4a", "D#5": "Ds5.m4a", F5: "F5.m4a",
  A5: "A5.m4a", B5: "B5.m4a", "D#6": "Ds6.m4a", F6: "F6.m4a",
  A6: "A6.m4a", B6: "B6.m4a", "D#7": "Ds7.m4a", F7: "F7.m4a",
  A7: "A7.m4a", C8: "C8.m4a",
};

/** Resolves once every sample is decoded (a Sampler throws if played before that). */
function makePianoSampler(): Promise<Tone.Sampler> {
  return new Promise((resolve, reject) => {
    const s: Tone.Sampler = new Tone.Sampler({
      urls: PIANO_SAMPLES,
      baseUrl: "/audio/piano/",
      release: 1,
      volume: PIANO_DB,
      onload: () => resolve(s),
      onerror: (error) => {
        s.dispose();
        reject(error);
      },
    }).toDestination();
  });
}

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
  piano: makePianoSampler,

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

let current: Instrument | null = null;
let currentId: InstrumentId | null = null;
/** the load in flight; a newer request (or disposeSampler) supersedes it */
let pending: { id: InstrumentId; promise: Promise<void> } | null = null;

// --- Public API ---

/**
 * Swaps in the instrument once it can play: until then the previous one (or silence, on
 * the first load) keeps answering notes, so nothing triggers a sampler whose buffers are
 * still loading. If the load fails, the previous instrument stays and the promise rejects.
 */
export function loadInstrument(id: InstrumentId): Promise<void> {
  if (pending?.id === id) return pending.promise;
  if (currentId === id && current) {
    pending = null; // back to what is already playing: drop any other load in flight
    return Promise.resolve();
  }
  const request = { id, promise: Promise.resolve() };
  request.promise = new Promise<Instrument>((resolve) => resolve(INSTRUMENT_STRATEGIES[id]()))
    .then((instrument) => {
      if (pending !== request) {
        instrument.dispose(); // superseded while loading
        return;
      }
      current?.dispose();
      current = instrument;
      currentId = id;
    })
    .finally(() => {
      if (pending === request) pending = null;
    });
  pending = request;
  return request.promise;
}

/** Make sure some instrument is ready (the piano, unless another was picked). */
export function loadDefaultInstrument(): Promise<void> {
  if (current) return Promise.resolve();
  if (pending) return pending.promise;
  return loadInstrument("piano");
}

export function playNoteOn(midi: number, velocity: number): void {
  if (!current) return;
  const note = Tone.Frequency(midi, "midi").toNote();
  current.triggerAttack(note, Tone.now(), velocity);
}

/** Schedule a whole note (attack + release) at an audio-clock time, e.g. score playback. */
export function playNoteAt(midi: number, velocity: number, time: number, duration: number): void {
  if (!current) return;
  const note = Tone.Frequency(midi, "midi").toNote();
  current.triggerAttackRelease(note, duration, time, velocity);
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
  pending = null;
  current?.dispose();
  current = null;
  currentId = null;
}
