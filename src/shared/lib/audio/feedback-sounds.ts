import * as Tone from "tone";

let correctSynth: Tone.Synth | null = null;
let incorrectSynth: Tone.Synth | null = null;

function getCorrectSynth(): Tone.Synth {
  if (!correctSynth) {
    correctSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -10,
    }).toDestination();
  }
  return correctSynth;
}

function getIncorrectSynth(): Tone.Synth {
  if (!incorrectSynth) {
    incorrectSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
      volume: -15,
    }).toDestination();
  }
  return incorrectSynth;
}

export function playCorrectSound(): void {
  const synth = getCorrectSynth();
  const now = Tone.now();
  synth.triggerAttackRelease("C5", "16n", now);
  synth.triggerAttackRelease("E5", "16n", now + 0.1);
}

export function playIncorrectSound(): void {
  const synth = getIncorrectSynth();
  synth.triggerAttackRelease("A2", "8n", Tone.now());
}

export function playTimeoutSound(): void {
  const synth = getIncorrectSynth();
  const now = Tone.now();
  synth.triggerAttackRelease("C4", "16n", now);
  synth.triggerAttackRelease("C3", "16n", now + 0.15);
}
