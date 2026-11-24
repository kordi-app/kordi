import { sitOnSpot } from "../../engine/cat-walk";
import { islandHits } from "../../engine/island";
import type { Landing } from "../../engine/player";
import { stepSkyPads } from "../../engine/sky-island";
import type { FrameContext } from "./context";

export interface IslandFrame {
  /** sitting on the cat's secret spot (since when, scene clock) */
  secretSit: { since: number | null };
}

export const createIslandFrame = (): IslandFrame => ({ secretSit: { since: null } });

/** A fresh arrival on the island: no half-finished sit carries over */
export function enterIsland(state: IslandFrame) {
  state.secretSit.since = null;
}

/**
 * The island's secrets and toys, after you've moved: drums beat when you land
 * on them, sitting where the cat sits takes you to its dream sea, and the
 * sky island's star pads light under your feet.
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
  // the cat's secret: sit where it sits, and you're through
  if (sitOnSpot(state.secretSit, s.pos.x, s.pos.z, sitting, grounded, now)) {
    state.secretSit.since = null;
    fx?.ripple(s.pos.x, s.pos.y, s.pos.z, "#9fb8ff");
    events.onPortal("whale");
  }
  for (const event of stepSkyPads(s.pos.x, s.pos.y, s.pos.z, skyClock, grounded)) {
    if (event.kind === "pad") fx?.notes(s.pos.x, s.pos.y, s.pos.z, "#ffe9a8");
    else fx?.confetti(s.pos.x, s.pos.y, s.pos.z);
    events.onSky(event);
  }
}
