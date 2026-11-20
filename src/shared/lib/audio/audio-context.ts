import * as Tone from "tone";

let started = false;

export async function ensureAudioStarted(): Promise<void> {
  if (started) return;
  await Tone.start();
  // Default lookAhead (0.1s) adds ~100ms latency — unacceptable for live playing
  Tone.getContext().lookAhead = 0;
  // a safety net on the master output: many notes at once (chords, other players, effects)
  // are held just under full scale instead of clipping into a harsh crackle
  Tone.getDestination().chain(new Tone.Limiter(-1));
  started = true;
}

export function isAudioStarted(): boolean {
  return started;
}
