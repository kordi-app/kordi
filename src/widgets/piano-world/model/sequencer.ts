import { playNoteOff, playNoteOn } from "@/shared/lib/audio";

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

/** Twinkle Twinkle up high, plucked like a music box (traditional, public domain). */
export const MUSIC_BOX: Step[] = [
  [84, 1], [84, 1], [91, 1], [91, 1], [93, 1], [93, 1], [91, 2],
  [89, 1], [89, 1], [88, 1], [88, 1], [86, 1], [86, 1], [84, 2],
];
