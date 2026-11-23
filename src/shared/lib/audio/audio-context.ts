import * as Tone from "tone";

let started = false;
/** the one start in flight: callers racing in await it instead of starting again */
let starting: Promise<void> | null = null;

export function ensureAudioStarted(): Promise<void> {
  if (started) return Promise.resolve();
  starting ??= start().catch((error) => {
    starting = null; // let a later gesture try again
    throw error;
  });
  return starting;
}

async function start(): Promise<void> {
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
