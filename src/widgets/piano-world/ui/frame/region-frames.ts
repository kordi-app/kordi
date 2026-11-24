import type * as THREE from "three";
import type { Landing } from "../../engine/player";
import type { RegionDef, RegionFeature } from "../../engine/regions";
import type { FrameContext } from "./context";
import { createCaveFrame, enterCave, stepCaveFrame } from "./cave-frame";
import { createCourseFrame, stepCourseAfter, stepCourseBefore } from "./course-frame";
import { enterDream, stepDreamFrame } from "./dream-frame";
import { createDriftFrame, stepDriftFrame } from "./drift-frame";
import { createIslandFrame, enterIsland, stepIslandFrame } from "./island-frame";

/** What a region's frame may need beyond the FrameContext, gathered once per frame by the world */
export interface FrameInputs {
  /** a landing this frame (drums, the end of a drift) */
  landing: Landing | null;
  /** steering this frame */
  steering: boolean;
  /** sitting (the sit emote) */
  sitting: boolean;
  /** the island's sky clock (the star steps and pads run on it) */
  skyClock: number;
  /** I carry the cosmic crown's light */
  cosmicCrown: boolean;
  /** the cave's necklace is already mine */
  hasNecklace: boolean;
  scene: THREE.Scene;
  hemi: THREE.HemisphereLight | null;
}

/**
 * One region's (or one of its features') per-frame rules. The world calls
 * every frame of its region in order: `enter` on arrival (and on a warp within
 * the region), `before` ahead of any movement, `after` once you've moved.
 */
export interface RegionFrame {
  enter?(now: number): void;
  before?(ctx: FrameContext): void;
  after?(ctx: FrameContext, inputs: FrameInputs): void;
}

/** What frames share with the renderers (the cave's light, read by its scene) */
export interface FrameShared {
  caveLight: { current: number };
}

/** The island: the drift down from the sky, and the island's secrets and toys */
function islandFrames(): RegionFrame[] {
  const drift = createDriftFrame();
  const island = createIslandFrame();
  return [
    { after: (ctx, { landing, steering }) => stepDriftFrame(ctx, drift, landing, steering) },
    {
      enter: () => enterIsland(island),
      after: (ctx, { landing, sitting, skyClock }) => stepIslandFrame(ctx, island, { landing, sitting, skyClock }),
    },
  ];
}

/** Each feature's frames (features without rules of their own have none) */
const FEATURE_FRAMES: Partial<Record<RegionFeature, (region: RegionDef, shared: FrameShared) => RegionFrame[]>> = {
  course: (region) => {
    const course = region.course;
    if (!course) return [];
    const state = createCourseFrame();
    return [{ before: (ctx) => stepCourseBefore(ctx, course, state), after: (ctx) => stepCourseAfter(ctx, course) }];
  },
  dream: () => [{ enter: enterDream, after: stepDreamFrame }],
  cave: (_, { caveLight }) => {
    const state = createCaveFrame();
    return [
      {
        enter: (now) => enterCave(state, caveLight, now),
        after: (ctx, { cosmicCrown, hasNecklace, scene, hemi }) =>
          stepCaveFrame(ctx, state, caveLight, { cosmicCrown, hasNecklace }, { scene, hemi }),
      },
    ];
  },
};

/** The frames a region runs, fresh for each stay in it. Adding a region's rules is a line in FEATURE_FRAMES. */
export function framesFor(region: RegionDef, shared: FrameShared): RegionFrame[] {
  return [...(region.island ? islandFrames() : []), ...(FEATURE_FRAMES[region.feature]?.(region, shared) ?? [])];
}
