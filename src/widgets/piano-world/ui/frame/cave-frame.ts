import type * as THREE from "three";
import { startCave, stepCave } from "../../engine/cave";
import { groundAt } from "../../engine/physics";
import { placePlayer } from "../../engine/player";
import { lightCave } from "../cave";
import type { FrameContext } from "./context";

/** The cave's light follows the cosmic crown: this fast to come up (and to fade if you take it off) */
const CAVE_LIGHT_RATE = 0.9;
const REST_GLOW = "#ffcf7a";

export interface CaveFrame {
  /** when I came in (scene clock), for the necklace's wait */
  since: number;
}

export const createCaveFrame = (): CaveFrame => ({ since: 0 });

/** Coming into the cave: a fresh visit, and dark until the crown's light fills it */
export function enterCave(state: CaveFrame, light: { current: number }, now: number) {
  startCave();
  state.since = now;
  light.current = 0;
}

/**
 * The cave, after you've moved: star rests wake, the abyss gives you back at
 * the last one, the altar hands over the necklace; and the place's light
 * follows the cosmic crown (`light` is shared with the cave's renderer).
 */
export function stepCaveFrame(
  ctx: FrameContext,
  state: CaveFrame,
  light: { current: number },
  { cosmicCrown, hasNecklace }: { cosmicCrown: boolean; hasNecklace: boolean },
  { scene, hemi }: { scene: THREE.Scene; hemi: THREE.HemisphereLight | null },
) {
  const { s, now, dt, region, events, fx } = ctx;
  const step = { grounded: !s.airborne, crowned: cosmicCrown, hasNecklace, stayed: now - state.since };
  for (const event of stepCave(s.pos.x, s.pos.y, s.pos.z, step)) {
    if (event.kind === "fell") {
      // the abyss gives you back at the last star rest you woke
      placePlayer(s, event.to.x, groundAt(region, event.to.x, event.to.z, 0).height, event.to.z);
      fx?.ripple(s.pos.x, s.pos.y, s.pos.z, REST_GLOW);
    } else if (event.kind === "rest") {
      fx?.ripple(s.pos.x, s.pos.y, s.pos.z, REST_GLOW);
      fx?.notes(s.pos.x, s.pos.y, s.pos.z, REST_GLOW);
    } else {
      fx?.confetti(s.pos.x, s.pos.y, s.pos.z);
    }
    events.onCave(event);
  }
  const want = cosmicCrown ? 1 : 0;
  light.current += Math.min(Math.max(want - light.current, -dt * CAVE_LIGHT_RATE), dt * CAVE_LIGHT_RATE);
  lightCave(scene, hemi, region.theme, light.current);
}
