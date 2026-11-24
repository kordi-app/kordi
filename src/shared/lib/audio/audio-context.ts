import * as Tone from "tone";
import { audioReadiness } from "./readiness";

let started = false;
/** the one start in flight: callers racing in await it instead of starting again */
let starting: Promise<void> | null = null;

/**
 * Unlocks the AudioContext; call from a user gesture. Safe to call on every gesture:
 * once started it only resumes a context the browser suspended or interrupted (iOS does
 * both after the tab was in the background), and while a start is in flight it retries
 * the resume with this gesture (a touch `pointerdown` is not a user activation on iOS,
 * so the first attempt may never settle).
 */
export function ensureAudioStarted(): Promise<void> {
  if (started) {
    resumeIfNeeded();
    return Promise.resolve();
  }
  if (starting) {
    resumeIfNeeded();
    return starting;
  }
  audioReadiness.set("starting");
  starting = start().catch((error) => {
    starting = null; // let a later gesture try again
    audioReadiness.set("off");
    throw error;
  });
  return starting;
}

function resumeIfNeeded(): void {
  const context = Tone.getContext();
  if (context.state !== "running") void context.resume().catch(() => {});
}

/** Resolves once the context runs, whichever gesture's resume() got it there. */
function whenRunning(): Promise<void> {
  const context = Tone.getContext();
  if (context.state === "running") return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (context.state !== "running") return;
      context.off("statechange", check);
      resolve();
    };
    context.on("statechange", check);
  });
}

async function start(): Promise<void> {
  await Promise.race([Tone.start(), whenRunning()]);
  await whenRunning();
  // Default lookAhead (0.1s) adds ~100ms latency — unacceptable for live playing
  Tone.getContext().lookAhead = 0;
  // a safety net on the master output: many notes at once (chords, other players, effects)
  // are held just under full scale instead of clipping into a harsh crackle
  Tone.getDestination().chain(new Tone.Limiter(-1));
  started = true;
  if (audioReadiness.get() === "starting") audioReadiness.set("loading");
  watchForSuspension();
}

/** After a backgrounded tab, iOS leaves the context suspended/interrupted: wake it on the next gesture. */
function watchForSuspension(): void {
  if (typeof document === "undefined") return;
  for (const type of ["pointerup", "touchend", "click", "keydown"] as const) {
    document.addEventListener(type, resumeIfNeeded, { capture: true, passive: true });
  }
}

export function isAudioStarted(): boolean {
  return started;
}
