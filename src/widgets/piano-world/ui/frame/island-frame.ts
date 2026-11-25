import { islandHits } from "../../engine/island";
import type { Landing } from "../../engine/player";
import { stepSkyPads } from "../../engine/sky-island";
import { STATUE, createStatueSit, resetStatue, stepStatue, type StatueSit } from "../../engine/statue";
import type { FrameContext } from "./context";

/** The statue's dream, in the colour of its mirror stone's light */
const DREAM_GLOW = "#ffe9a8";

export interface IslandFrame {
  /** sitting before the dreaming statue */
  statue: StatueSit;
}

export const createIslandFrame = (): IslandFrame => ({ statue: createStatueSit() });

/** A fresh arrival on the island: the statue is asleep, and no half-finished sit carries over */
export function enterIsland(state: IslandFrame) {
  resetStatue(state.statue);
}

/**
 * The island's secrets and toys, after you've moved: drums beat when you land
 * on them, the sky island's star pads light under your feet, and the dreaming
 * statue wakes for whoever sits out its dream on the mirror stone. (The cat's
 * spot needs nothing here: it is an ordinary, undrawn portal — regions.ts.)
 */
export function stepIslandFrame(
  ctx: FrameContext,
  state: IslandFrame,
  { landing, sitting, skyClock }: { landing: Landing | null; sitting: boolean; skyClock: number },
) {
  const { s, now, region, events, fx } = ctx;
  const grounded = !s.airborne;
  // drums: every landing is a beat
  const drum = landing?.solid?.bounce ? landing.solid : null;
  if (drum && landing) {
    if (drum.sound) events.onVoice(drum.sound.voice, drum.sound.midi, Math.min(1, 0.45 + landing.impact / 18));
    if (drum.tag) islandHits.set(drum.tag, now);
    fx?.notes(s.pos.x, s.pos.y, s.pos.z, region.theme.accent);
  }
  for (const event of stepSkyPads(s.pos.x, s.pos.y, s.pos.z, skyClock, grounded)) {
    if (event.kind === "pad") fx?.notes(s.pos.x, s.pos.y, s.pos.z, "#ffe9a8");
    else fx?.confetti(s.pos.x, s.pos.y, s.pos.z);
    events.onSky(event);
  }
  // the dreaming statue: sit as it sits, and it takes you into its dream
  const dream = stepStatue(state.statue, s.pos.x, s.pos.z, sitting, grounded, now);
  if (dream === "woke") {
    fx?.ripple(s.pos.x, s.pos.y, s.pos.z, DREAM_GLOW);
    fx?.notes(STATUE.x, 3, STATUE.z, DREAM_GLOW);
    events.onStatueWake();
  } else if (dream === "go") {
    events.onPortal("musicbox");
  }
}
