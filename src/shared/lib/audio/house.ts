import * as Tone from "tone";

/**
 * A four-on-the-floor house groove, all synthesized: kick on every beat, a clap
 * on 2 and 4, off-beat hats, a bassline, and chord stabs you trigger yourself.
 * The progression is our own (Fmaj9 – Em7 – Am9 – Dm9, a bar each).
 *
 * One groove at a time; start() is idempotent and stop() frees everything.
 */
const BPM = 124;

/** A bar each; stab voicings sit mid-keyboard, bass roots low. */
const BARS = [
  { stab: ["A3", "C4", "E4", "G4"], bass: "F1" }, // Fmaj9 (3, 5, 7, 9)
  { stab: ["G3", "B3", "D4", "E4"], bass: "E1" }, // Em7
  { stab: ["C4", "E4", "G4", "B4"], bass: "A1" }, // Am9
  { stab: ["F3", "A3", "C4", "E4"], bass: "D1" }, // Dm9
];

/** Levels, matched by ear-proxy (K-weighted RMS) to sit around the piano's loudness. */
const LEVELS = { kick: -10, clap: -20, hat: -30, bass: -18, stab: -16 };

interface Groove {
  nodes: Tone.ToneAudioNode[];
  loops: Tone.Loop[];
  stab: Tone.PolySynth;
}

let groove: Groove | null = null;

const barNow = () => {
  const [bars] = String(Tone.getTransport().position).split(":");
  return BARS[Number(bars) % BARS.length];
};

/** Start the groove (once audio has been started by a gesture). */
export function startHouse() {
  if (groove || Tone.getContext().state !== "running") return;
  const transport = Tone.getTransport();

  const kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).toDestination();
  kick.volume.value = LEVELS.kick;

  const clapFilter = new Tone.Filter({ type: "bandpass", frequency: 1600, Q: 0.8 }).toDestination();
  const clap = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.16, sustain: 0 } }).connect(clapFilter);
  clap.volume.value = LEVELS.clap;

  const hatFilter = new Tone.Filter({ type: "highpass", frequency: 7000 }).toDestination();
  const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.06, sustain: 0 } }).connect(hatFilter);
  hat.volume.value = LEVELS.hat;

  const bass = new Tone.MonoSynth({
    oscillator: { type: "square" },
    filter: { type: "lowpass", Q: 2 },
    filterEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.2, baseFrequency: 120, octaves: 2.5 },
    envelope: { attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.1 },
  }).toDestination();
  bass.volume.value = LEVELS.bass;

  const stab = new Tone.PolySynth(Tone.MonoSynth);
  stab.set({
    oscillator: { type: "sawtooth" },
    filter: { type: "lowpass", Q: 3, rolloff: -24 },
    filterEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.2, baseFrequency: 500, octaves: 3 },
    envelope: { attack: 0.002, decay: 0.2, sustain: 0.2, release: 0.15 },
  });
  const stabVerb = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.25, wet: 0.2 }).toDestination();
  stab.connect(stabVerb);
  stab.volume.value = LEVELS.stab;

  const loops = [
    new Tone.Loop((time) => kick.triggerAttackRelease("C1", "8n", time), "4n"),
    new Tone.Loop((time) => clap.triggerAttackRelease("16n", time), "2n"),
    new Tone.Loop((time) => hat.triggerAttackRelease("32n", time), "4n"),
    // bass: the bar's root on the off-beats (the classic house push)
    new Tone.Loop((time) => bass.triggerAttackRelease(barNow().bass, "16n", time, 0.9), "4n"),
  ];
  loops[0].start(0);
  loops[1].start("4n"); // beats 2 and 4
  loops[2].start("8n"); // off-beats
  loops[3].start("8n");

  transport.bpm.value = BPM;
  transport.swing = 0; // straight sixteenths (the lounge swings)
  transport.start("+0.05");
  groove = { nodes: [kick, clap, clapFilter, hat, hatFilter, bass, stab, stabVerb], loops, stab };
}

/** Stop the groove and free its synths. */
export function stopHouse() {
  if (!groove) return;
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.position = 0;
  groove.loops.forEach((loop) => loop.dispose());
  groove.nodes.forEach((node) => node.dispose());
  groove = null;
}

/** Fire a chord stab of the current bar, on the next 16th note so it lands in time. */
export function houseStab(velocity = 0.8) {
  if (!groove) return;
  const transport = Tone.getTransport();
  const at = transport.nextSubdivision("16n");
  const chord = barNow().stab;
  groove.stab.triggerAttackRelease(chord, "16n", at, velocity);
}

export const isHousePlaying = () => groove !== null;
