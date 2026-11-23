import * as Tone from "tone";
import { leaseTransport, type TransportLease } from "@/shared/lib/audio";

/**
 * A four-on-the-floor house groove, all synthesized: kick on every beat, a clap
 * on 2 and 4, off-beat hats, a bassline, and chord stabs you trigger yourself.
 * The progression is our own (Fmaj9 – Em7 – Am9 – Dm9, a bar each).
 *
 * The neon room's music. One groove at a time; start() is idempotent and
 * stop() frees everything. It borrows the shared clock through a transport
 * lease, so stopping clears only its own events.
 */
const BPM = 124;

/** A bar each; stab voicings sit mid-keyboard, bass roots low. */
const BARS = [
  { name: "FM9", stab: ["A3", "C4", "E4", "G4"], bass: "F1" }, // 3, 5, 7, 9
  { name: "Em7", stab: ["G3", "B3", "D4", "E4"], bass: "E1" },
  { name: "Am9", stab: ["C4", "E4", "G4", "B4"], bass: "A1" },
  { name: "Dm9", stab: ["F3", "A3", "C4", "E4"], bass: "D1" },
];

/** Levels, matched by ear-proxy (K-weighted RMS) to sit around the piano's loudness. */
const LEVELS = { kick: -10, clap: -20, hat: -30, bass: -18, stab: -16 };

interface Groove {
  nodes: Tone.ToneAudioNode[];
  lease: TransportLease;
  stab: Tone.PolySynth;
}

let groove: Groove | null = null;

const barNow = () => {
  const [bars] = String(Tone.getTransport().position).split(":");
  return BARS[Number(bars) % BARS.length];
};

/** Start the groove (once audio has been started by a gesture). */
export function startHouse() {
  if (Tone.getContext().state !== "running") return;
  if (groove?.lease.active) return;
  stopHouse(); // a groove that lost the clock: free its synths first
  const lease = leaseTransport();

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

  lease.repeat((time) => kick.triggerAttackRelease("C1", "8n", time), "4n", 0);
  lease.repeat((time) => clap.triggerAttackRelease("16n", time), "2n", "4n"); // beats 2 and 4
  lease.repeat((time) => hat.triggerAttackRelease("32n", time), "4n", "8n"); // off-beats
  // bass: the bar's root on the off-beats (the classic house push)
  lease.repeat((time) => bass.triggerAttackRelease(barNow().bass, "16n", time, 0.9), "4n", "8n");

  lease.set({ bpm: BPM, swing: 0 }); // straight sixteenths (the lounge swings)
  lease.start();
  groove = { nodes: [kick, clap, clapFilter, hat, hatFilter, bass, stab, stabVerb], lease, stab };
}

/** Stop the groove and free its synths. */
export function stopHouse() {
  if (!groove) return;
  groove.lease.release();
  groove.nodes.forEach((node) => node.dispose());
  groove = null;
}

/**
 * Fire a chord stab of the current bar, right as you step (waiting for the
 * grid felt like lag). Returns the chord's name, or null with no groove.
 */
export function houseStab(velocity = 0.8): string | null {
  if (!groove) return null;
  const bar = barNow();
  groove.stab.triggerAttackRelease(bar.stab, "16n", Tone.immediate(), velocity);
  return bar.name;
}

/** False once another player has taken the shared clock (the band is silent then). */
export const isHousePlaying = () => groove?.lease.active ?? false;
