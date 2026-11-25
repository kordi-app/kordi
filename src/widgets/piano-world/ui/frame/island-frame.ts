import { islandHits } from "../../engine/island";
import type { Landing } from "../../engine/player";
import { stepSkyPads } from "../../engine/sky-island";
import type { FrameContext } from "./context";

/**
 * The island's secrets and toys, after you've moved: drums beat when you land
 * on them, and the sky island's star pads light under your feet. (The cat's
 * spot needs nothing here: it is an ordinary, undrawn portal — regions.ts.)
 */
export function stepIslandFrame(ctx: FrameContext, landing: Landing | null, skyClock: number) {
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
}
