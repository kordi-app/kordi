import { buildTerrain, type Solid } from "./terrain";

/**
 * Inside the music box: what the island's dreaming statue (statue.ts) dreams
 * of. You arrive shrunk, on the velvet lining, between wooden walls. At the
 * back the pinned brass cylinder turns slowly; in front of it lies the steel
 * comb, each tooth wide enough to walk on and sounding its note underfoot. A
 * ballerina turns on her pedestal in the middle, and by the winding key in
 * the wall a portal leads back out.
 *
 * The box has forgotten its tune. The next tooth to step on glows: step the
 * opening phrase in order and it plays again, the ballerina dances, and light
 * pours in through the gap under the lid.
 *
 * Pure data + state; ui/music-box.tsx draws it.
 */

/** The velvet floor between the walls (floor y = 0) */
export const MUSICBOX_BOUNDS = { x: 12, zMin: -11.4, zMax: 10 };
/** The walls stand this high; above the back one is the gap under the lid */
export const MUSICBOX_WALL_TOP = 5.2;

/** Where you arrive (from the statue, or by a link), and the way out by the winding key */
export const MUSICBOX_ARRIVAL = { x: 0, z: 7.6 };
export const MUSICBOX_HOME = { x: 8, z: 5.4 };
/** The winding key, through the east wall beside the way out */
export const WINDING_KEY = { x: MUSICBOX_BOUNDS.x + 0.6, y: 2.3, z: 2.4 };

// ── the comb ─────────────────────────────────────────────────────────────────

export interface Tooth {
  /** centre x */
  x: number;
  /** the tip, towards the cylinder (every tip is in line) */
  tipZ: number;
  /** where it meets the comb's base: low notes are long, high ones short */
  rootZ: number;
  midi: number;
}

/** One octave of C major, up high where a music box sings (C6–C7) */
const TOOTH_NOTES = [84, 86, 88, 89, 91, 93, 95, 96];
export const TOOTH_WIDTH = 1.45;
const TOOTH_PITCH = 1.6;
const TIP_Z = -6.9;
/** A tooth's top: a gentle step up from the comb's base, which is a gentle step up from the velvet */
export const TOOTH_TOP = 0.5;
export const COMB_BASE = { top: 0.28, frontZ: -0.9 };

export const TEETH: readonly Tooth[] = TOOTH_NOTES.map((midi, i) => ({
  x: (i - (TOOTH_NOTES.length - 1) / 2) * TOOTH_PITCH,
  tipZ: TIP_Z,
  rootZ: TIP_Z + 5 - i * 0.22,
  midi,
}));

/** A tooth's solid carries this tag (the world rings `islandHits` with it; the renderer makes the tooth quiver) */
export const toothTag = (index: number) => `tooth:${index}`;

/** Every tooth's tag, made once (read every frame) */
export const TOOTH_TAGS: readonly string[] = TEETH.map((_, i) => toothTag(i));
const TOOTH_BY_TAG = new Map(TOOTH_TAGS.map((tag, i) => [tag, i]));

/** Which tooth a solid is (null: not a tooth) */
export function toothOf(solid: Solid | null | undefined): number | null {
  const tag = solid?.tag;
  return tag === undefined ? null : (TOOTH_BY_TAG.get(tag) ?? null);
}

// ── the cylinder, the ballerina ──────────────────────────────────────────────

/** The pinned cylinder: lying along x behind the comb, its pins all but brushing the teeth's tips */
export const CYLINDER = { z: -8.6, y: 1.75, r: 1.6, halfLength: 7.4 };

/** The ballerina's pedestal, in the middle of the floor */
export const BALLERINA = { x: 0, z: 3.4, r: 1.2, top: 0.8 };

// ── the tune ─────────────────────────────────────────────────────────────────

/**
 * The music box's tune — Twinkle Twinkle, up high — as teeth: [tooth, beats].
 * The cylinder's pins are set to it, and it is the tune the music box in the
 * cathedral plays when you leave a wish (audio/sequencer.ts MUSIC_BOX is made
 * from this).
 */
export const TUNE: readonly (readonly [tooth: number, beats: number])[] = [
  [0, 1], [0, 1], [4, 1], [4, 1], [5, 1], [5, 1], [4, 2],
  [3, 1], [3, 1], [2, 1], [2, 1], [1, 1], [1, 1], [0, 2],
];
const TUNE_BEATS = TUNE.reduce((sum, [, beats]) => sum + beats, 0);

/** The teeth to step, in order: the tune's opening phrase ("twinkle, twinkle, little star") */
export const MELODY: readonly number[] = TUNE.slice(0, 7).map(([tooth]) => tooth);

/** One pin per note of the tune: over its tooth, as far round the cylinder as the note is into the tune */
export const CYLINDER_PINS: readonly { x: number; angle: number }[] = (() => {
  let beat = 0;
  return TUNE.map(([tooth, beats]) => {
    const pin = { x: TEETH[tooth].x, angle: (beat / TUNE_BEATS) * Math.PI * 2 };
    beat += beats;
    return pin;
  });
})();

// ── solids ───────────────────────────────────────────────────────────────────

const UNCLIMBABLE = 60;

export const MUSICBOX_SOLIDS: readonly Solid[] = [
  ...TEETH.map(
    (tooth, i): Solid => ({
      foot: { shape: "box", x: tooth.x, z: (tooth.tipZ + tooth.rootZ) / 2, w: TOOTH_WIDTH, d: tooth.rootZ - tooth.tipZ },
      top: TOOTH_TOP,
      bottom: TOOTH_TOP - 0.2,
      sound: { voice: "crystal", midi: tooth.midi },
      tag: toothTag(i),
    }),
  ),
  // the comb's base, under each tooth's root: the step you take up from the velvet (silent)
  ...TEETH.map(
    (tooth): Solid => ({
      foot: { shape: "box", x: tooth.x, z: (tooth.rootZ - 0.4 + COMB_BASE.frontZ) / 2, w: TOOTH_PITCH, d: COMB_BASE.frontZ - (tooth.rootZ - 0.4) },
      top: COMB_BASE.top,
      bottom: 0,
    }),
  ),
  // the cylinder and its bearings: wall to wall, not to be walked under or climbed
  {
    foot: { shape: "box", x: 0, z: CYLINDER.z, w: MUSICBOX_BOUNDS.x * 2, d: CYLINDER.r * 2 + 0.1 },
    top: UNCLIMBABLE,
    bottom: -1,
  },
  { foot: { shape: "circle", x: BALLERINA.x, z: BALLERINA.z, r: BALLERINA.r }, top: UNCLIMBABLE, bottom: -1 },
];

export const MUSICBOX_TERRAIN = buildTerrain(MUSICBOX_SOLIDS);

// ── a visit ──────────────────────────────────────────────────────────────────

export const musicBoxRuntime = {
  /** how many of MELODY's teeth have been stepped, in order */
  progress: 0,
  /** when the tune was completed (the clock given to stepMusicBox; +∞: not yet, so "seconds since" is never positive) */
  doneAt: Infinity,
  /** the tooth under your feet last frame (null: none, or in the air) */
  under: null as number | null,
};

/** Coming in: the box has forgotten its tune again */
export function startMusicBox() {
  musicBoxRuntime.progress = 0;
  musicBoxRuntime.doneAt = Infinity;
  musicBoxRuntime.under = null;
}

/** The tooth to step next (null once the tune is whole) */
export const nextTooth = () => (musicBoxRuntime.doneAt < Infinity ? null : MELODY[musicBoxRuntime.progress]);

export type MusicBoxEvent =
  /** the right tooth: `progress` of MELODY's steps are done */
  | { kind: "step"; progress: number }
  /** the last one: the box remembers its tune */
  | { kind: "done" };

const NO_EVENTS: readonly MusicBoxEvent[] = [];

/**
 * One frame on the comb: `tooth` is the one under your feet (null: none, or
 * you're in the air). Coming onto a tooth — from the base, from another tooth,
 * or landing on it again after a hop — is a step. The step that matches the
 * next note of MELODY moves the tune on; **any other tooth just sounds and
 * changes nothing** (no reset), because walking along the comb to the next
 * note crosses the teeth between, and those must not undo what you've played.
 * A note that repeats needs a second step: hop on the spot, or step off and on.
 *
 * Once complete it stays complete for the visit (startMusicBox begins again).
 */
export function stepMusicBox(tooth: number | null, now: number): readonly MusicBoxEvent[] {
  const run = musicBoxRuntime;
  if (tooth === run.under) return NO_EVENTS;
  run.under = tooth;
  if (tooth === null || run.doneAt < Infinity || tooth !== MELODY[run.progress]) return NO_EVENTS;
  run.progress++;
  if (run.progress < MELODY.length) return [{ kind: "step", progress: run.progress }];
  run.doneAt = now;
  return [{ kind: "step", progress: run.progress }, { kind: "done" }];
}
