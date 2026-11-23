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
      s.volume.value = 2; // levelled with the piano (it was ~13 dB quieter)
      return s.toDestination();
    },
    hold: 0.3,
  },
  drum: {
    make: () => {
      const s = new Tone.PolySynth(Tone.MembraneSynth);
      s.set({ pitchDecay: 0.05, octaves: 5, envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.2 } });
      s.volume.value = -8; // levelled with the piano (it was ~4 dB louder, near clipping)
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

const running = () => Tone.getContext().state === "running";

function voiceFor(id: VoiceId) {
  let voice = voices.get(id);
  if (!voice) {
    voice = SPECS[id].make();
    voices.set(id, voice);
  }
  return voice;
}

/** Strike one note on a voice (optionally `delay` seconds from now). Silent until audio has started. */
export function playVoice(id: VoiceId, midi: number, velocity = 0.7, delay = 0): void {
  if (!running()) return;
  voiceFor(id).triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), SPECS[id].hold, Tone.now() + delay, velocity);
}

/** A filtered-noise rush rising (or falling) over `seconds`: the sound of being whisked away. */
function whoosh(from: number, to: number, seconds: number, level: number) {
  const now = Tone.now();
  const noise = new Tone.Noise("pink");
  const filter = new Tone.Filter({ type: "bandpass", frequency: from, Q: 1.2 });
  const gain = new Tone.Gain(0);
  noise.chain(filter, gain, Tone.getDestination());
  filter.frequency.setValueAtTime(from, now);
  filter.frequency.exponentialRampToValueAtTime(to, now + seconds);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level, now + seconds * 0.45);
  gain.gain.linearRampToValueAtTime(0, now + seconds);
  noise.start(now).stop(now + seconds + 0.05);
  setTimeout(() => [noise, filter, gain].forEach((node) => node.dispose()), (seconds + 0.5) * 1000);
}

export type WarpEffect = "wake" | "depart" | "arrive";

/**
 * Warp stone sounds: waking one (a bright rising chime over a bell), leaving
 * (a rush of air with a fast climb) and arriving (sparkles settling down).
 */
export function playWarpEffect(kind: WarpEffect): void {
  if (!running()) return;
  switch (kind) {
    case "wake":
      [72, 76, 79, 84, 88, 91].forEach((n, i) => playVoice("crystal", n, 0.55, i * 0.07));
      playVoice("bell", 60, 0.5);
      playVoice("bell", 67, 0.35, 0.05);
      break;
    case "depart":
      whoosh(300, 5000, 0.55, 0.35);
      [60, 67, 72, 79, 84, 91].forEach((n, i) => playVoice("crystal", n, 0.45, i * 0.045));
      break;
    case "arrive":
      whoosh(4000, 500, 0.4, 0.22);
      [96, 91, 88, 84, 79].forEach((n, i) => playVoice("crystal", n, 0.4, 0.05 + i * 0.06));
      playVoice("bell", 72, 0.3, 0.1);
      break;
  }
}

export type DragonEffect = "roar" | "burn";

/**
 * A dragon in a storm: the roar is a low, swelling growl of air with a drum
 * thud under it; the burn is a bright rush of flame.
 */
export function playDragonEffect(kind: DragonEffect): void {
  if (!running()) return;
  if (kind === "roar") {
    whoosh(90, 420, 1.3, 0.55);
    whoosh(200, 900, 0.9, 0.25);
    playVoice("drum", 36, 0.9);
  } else {
    whoosh(700, 3200, 0.6, 0.5);
    whoosh(2500, 600, 0.9, 0.3);
  }
}

/** Free every voice (e.g. when leaving the page that used them). */
export function disposeVoices(): void {
  voices.forEach((voice) => voice.dispose());
  voices.clear();
}
