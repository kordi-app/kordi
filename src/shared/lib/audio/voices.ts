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

/**
 * A church bell is several tones at once, each dying away at its own rate:
 * the hum an octave below (the long "uwoong"), the strike note, a minor third
 * above it (what makes a bell sound like a bell, a little sad), a fifth, the
 * octave and a couple of bright upper partials that go first. Pairs a hair
 * apart beat against each other, the slow swell of a big bell. Plus a short
 * metallic clank for the clapper, all through a wide, distant room.
 */
const BELL_PARTIALS: readonly { ratio: number; level: number; ring: number }[] = [
  { ratio: 0.5, level: 0.5, ring: 9 },
  { ratio: 0.503, level: 0.35, ring: 9 },
  { ratio: 1, level: 0.42, ring: 6.5 },
  { ratio: 1.19, level: 0.3, ring: 5 },
  { ratio: 1.5, level: 0.14, ring: 3.5 },
  { ratio: 2, level: 0.26, ring: 3.5 },
  { ratio: 2.005, level: 0.16, ring: 3.5 },
  { ratio: 2.66, level: 0.1, ring: 1.8 },
  { ratio: 3.2, level: 0.07, ring: 1.2 },
];

interface TowerBell {
  room: Tone.Freeverb;
  partials: Tone.PolySynth[];
  clank: Tone.NoiseSynth;
}

let towerBell: TowerBell | null = null;

function towerBellVoice(): TowerBell {
  if (towerBell) return towerBell;
  const room = new Tone.Freeverb({ roomSize: 0.86, dampening: 2600, wet: 0.38 }).toDestination();
  // one synth per decay length: a PolySynth's voices share their envelope
  const partials = [...new Set(BELL_PARTIALS.map((p) => p.ring))].map((ring) => {
    const s = new Tone.PolySynth(Tone.Synth);
    s.maxPolyphony = 32; // twelve strokes ringing over each other
    s.set({ oscillator: { type: "sine" }, envelope: { attack: 0.004, decay: 0.05, sustain: 1, release: ring, releaseCurve: "exponential" } });
    s.volume.value = -9;
    s.connect(room);
    return s;
  });
  const clank = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.07, sustain: 0 } });
  const bright = new Tone.Filter({ type: "bandpass", frequency: 3200, Q: 2.5 });
  clank.volume.value = -22;
  clank.chain(bright, room);
  towerBell = { room, partials, clank };
  return towerBell;
}

/** One stroke of the tower bell on `midi` (its strike note), `delay` seconds from now. */
function strikeTowerBell(midi: number, velocity: number, delay: number) {
  const bell = towerBellVoice();
  const at = Tone.now() + delay;
  const rings = [...new Set(BELL_PARTIALS.map((p) => p.ring))];
  const base = Tone.Frequency(midi, "midi").toFrequency();
  for (const p of BELL_PARTIALS) {
    bell.partials[rings.indexOf(p.ring)].triggerAttackRelease(base * p.ratio, 0.06, at, p.level * velocity);
  }
  bell.clank.triggerAttackRelease(0.05, at, velocity);
}

/** The tower bell's strike note: a low D, big and heavy */
const TOWER_BELL_NOTE = 50;

/**
 * The tower bell: one stroke by day; at midnight `strokes` of them, close
 * enough that each still hangs in the air when the next comes, the last one
 * deeper and fuller.
 */
export function playTowerBell(strokes = 1, gap = 0.45): void {
  if (!running()) return;
  for (let i = 0; i < strokes; i++) {
    const last = strokes > 1 && i === strokes - 1;
    strikeTowerBell(last ? TOWER_BELL_NOTE - 5 : TOWER_BELL_NOTE, last ? 1 : 0.75 + 0.1 * Math.sin(i * 2.3), i * gap);
  }
}

/** Chords played in turn on the crystal voice, `beat` seconds apart (the sky island's orrery). */
export function playChordProgression(chords: readonly (readonly number[])[], beat = 0.9): void {
  if (!running()) return;
  chords.forEach((chord, i) => {
    chord.forEach((midi, j) => playVoice("crystal", midi, j === 0 ? 0.6 : 0.45, i * beat + j * 0.04));
  });
}

/** Free every voice (e.g. when leaving the page that used them). */
export function disposeVoices(): void {
  voices.forEach((voice) => voice.dispose());
  voices.clear();
  if (towerBell) {
    towerBell.partials.forEach((s) => s.dispose());
    towerBell.clank.dispose();
    towerBell.room.dispose();
    towerBell = null;
  }
}
