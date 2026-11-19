import * as Tone from "tone";

/**
 * Small one-shot instruments that play alongside the shared piano/synth
 * (piano-sampler.ts) without replacing it: struck and plucked sounds that
 * each ring out on their own. Created lazily on first use, after the audio
 * context has been started by a user gesture.
 */
export type VoiceId = "xylophone" | "drum" | "bell" | "pipe" | "harp" | "crystal";

/** What we need from any PolySynth, whatever its voice type */
type Voice = Pick<Tone.PolySynth, "triggerAttackRelease" | "dispose">;

interface VoiceSpec {
  make: () => Voice;
  /** how long each note is held before release, seconds */
  hold: number;
}

const SPECS: Record<VoiceId, VoiceSpec> = {
  xylophone: {
    make: () => {
      const s = new Tone.PolySynth(Tone.FMSynth);
      s.set({
        harmonicity: 3.5,
        modulationIndex: 2,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.3 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.1 },
      });
      s.volume.value = -6;
      return s.toDestination();
    },
    hold: 0.3,
  },
  drum: {
    make: () => {
      const s = new Tone.PolySynth(Tone.MembraneSynth);
      s.set({ pitchDecay: 0.05, octaves: 5, envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.2 } });
      s.volume.value = -2;
      return s.toDestination();
    },
    hold: 0.2,
  },
  bell: {
    make: () => {
      const s = new Tone.PolySynth(Tone.FMSynth);
      s.set({
        harmonicity: 3.01,
        modulationIndex: 9,
        oscillator: { type: "sine" },
        envelope: { attack: 0.002, decay: 3.5, sustain: 0, release: 3 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.002, decay: 2.5, sustain: 0, release: 2 },
      });
      s.volume.value = -8;
      return s.toDestination();
    },
    hold: 2,
  },
  pipe: {
    make: () => {
      const s = new Tone.PolySynth(Tone.Synth);
      s.set({ oscillator: { type: "sine4" }, envelope: { attack: 0.25, decay: 0.3, sustain: 0.55, release: 1.4 } });
      s.volume.value = -14;
      return s.toDestination();
    },
    hold: 0.9,
  },
  harp: {
    make: () => {
      const s = new Tone.PolySynth(Tone.Synth);
      s.set({ oscillator: { type: "triangle" }, envelope: { attack: 0.002, decay: 1.4, sustain: 0, release: 1 } });
      s.volume.value = -8;
      return s.toDestination();
    },
    hold: 0.6,
  },
  crystal: {
    make: () => {
      const s = new Tone.PolySynth(Tone.Synth);
      s.set({ oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 1.8, sustain: 0, release: 1.5 } });
      s.volume.value = -10;
      return s.toDestination();
    },
    hold: 0.5,
  },
};

const voices = new Map<VoiceId, Voice>();

/** Strike one note on a voice. Silently does nothing until audio has been started. */
export function playVoice(id: VoiceId, midi: number, velocity = 0.7): void {
  if (Tone.getContext().state !== "running") return;
  let voice = voices.get(id);
  if (!voice) {
    voice = SPECS[id].make();
    voices.set(id, voice);
  }
  voice.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), SPECS[id].hold, Tone.now(), velocity);
}

/** Free every voice (e.g. when leaving the page that used them). */
export function disposeVoices(): void {
  voices.forEach((voice) => voice.dispose());
  voices.clear();
}
