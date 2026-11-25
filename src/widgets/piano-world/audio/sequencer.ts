import { playNoteOff, playNoteOn } from "@/shared/lib/audio";
import { TEETH, TUNE } from "../engine/music-box";

/** [midi, beats] — midi null is a rest */
export type Step = [midi: number | null, beats: number];

/**
 * Plays a monophonic line through the shared instrument. Returns a stop
 * function that cancels pending notes and releases the one sounding.
 */
export function playSequence(steps: Step[], bpm: number, velocity = 0.6, onEnd?: () => void) {
  const beatMs = 60_000 / bpm;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let sounding: number | null = null;
  let at = 0;

  for (const [midi, beats] of steps) {
    const start = at;
    timers.push(
      setTimeout(() => {
        if (sounding !== null) playNoteOff(sounding);
        sounding = midi;
        if (midi !== null) playNoteOn(midi, velocity);
      }, start),
    );
    at += beats * beatMs;
  }
  timers.push(
    setTimeout(() => {
      if (sounding !== null) playNoteOff(sounding);
      sounding = null;
      onEnd?.();
    }, at),
  );

  return () => {
    timers.forEach(clearTimeout);
    if (sounding !== null) playNoteOff(sounding);
    sounding = null;
  };
}

/**
 * Twinkle Twinkle up high, plucked like a music box (traditional, public
 * domain). The tune is written once, as the teeth of the comb inside the box
 * (engine/music-box.ts TUNE): what the box plays out here is what its cylinder
 * is pinned to in there.
 */
export const MUSIC_BOX: Step[] = TUNE.map(([tooth, beats]) => [TEETH[tooth].midi, beats]);
