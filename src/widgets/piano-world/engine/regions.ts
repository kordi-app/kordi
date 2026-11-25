import type { InstrumentId } from "@/shared/lib/audio";
import { BOUNDS, SPAWN, WHITE_L, keySpan, type KeyRange } from "./layout";
import { COURSES, goalSpots, type CourseDef } from "./course";
import { CAVE_PORTAL, ISLAND_BOUNDS } from "./island";
import { SECRET_SPOT } from "./cat-walk";
import { DREAM_ARRIVAL, DREAM_BOUNDS, DREAM_HOME } from "./dream-sea";
import { ABYSS_FLOOR, CAVE_ARRIVAL, CAVE_BOUNDS, CAVE_EXIT, ILLUSORY_ARRIVAL, ILLUSORY_WALL } from "./cave";
import { MUSICBOX_ARRIVAL, MUSICBOX_BOUNDS, MUSICBOX_HOME } from "./music-box";
import { STATUE, STATUE_ARRIVAL } from "./statue";
import type { TerrainId } from "./terrains";

/**
 * The piano world is a hub (the Grand Hall) with portals out to themed
 * regions, each of which has a single portal back. Every region shares the
 * same 88-key floor — what changes is the instrument it plays and the light
 * it is played in. Adding a region is a data change here (plus copy and,
 * optionally, decor), not a scene change.
 */

export const REGION_IDS = ["hall", "neon", "cathedral", "lounge", "clouds", "night", "ruins", "whale", "cave", "musicbox"] as const;
export type RegionId = (typeof REGION_IDS)[number];

export function isRegionId(value: unknown): value is RegionId {
  return typeof value === "string" && (REGION_IDS as readonly string[]).includes(value);
}

export interface RegionTheme {
  background: string;
  fog: [near: number, far: number];
  floor: string;
  keyboardCase: string;
  white: string;
  whitePressed: string;
  black: string;
  blackPressed: string;
  /** Glow on a pressed key (emissive); null for none */
  pressedGlow: string | null;
  sky: string;
  ground: string;
  ambient: number;
  sun: number;
  sunColor: string;
  /** Dark backdrop: effects glow additively here */
  dark: boolean;
  /** Colour for step effects and the melody guide */
  accent: string;
  /** How brightly a pet glows here, 0–1 (default: 0.6 in the dark, else 0; the island follows its clock) */
  petGlow?: number;
}

export interface PortalDef {
  to: RegionId;
  x: number;
  z: number;
  /** Ground height the portal stands on (0 = floor) */
  y?: number;
  color: string;
  /** Small and faint — a secret to stumble on, not a signposted exit */
  hidden?: boolean;
  /** Where you appear coming back through it (default: beside it) */
  arrive?: { x: number; z: number };
  /**
   * Walked through like any portal, but never drawn: the cave's illusory wall
   * (cave.ts; only the cosmic crown's light gives it away) and the cat's spot
   * in the meadow (cat-walk.ts; only the cat shows you where).
   */
  invisible?: boolean;
  /**
   * Only the far end of a trip: never drawn and never walked through. The way
   * in is something else (the dreaming statue takes you when you sit before
   * it: statue.ts); this entry is here so coming back has a place to arrive
   * (`arrive`, see arrivalPoint).
   */
  arriveOnly?: boolean;
}

/** A portal you go through by walking into it (drawn or not): everything but an arrive-only one */
export const isWalkThrough = (portal: PortalDef) => !portal.arriveOnly;
/** A portal that is drawn as a gate */
export const isDrawn = (portal: PortalDef) => !portal.arriveOnly && !portal.invisible;

/**
 * What makes a region play differently, not just look different:
 * - melody: follow a glowing path through a song
 * - springs: black keys bounce you into the air; the floor pulses
 * - echo: steps ripple and the organ rings on after you leave a key
 * - jazz: a trio plays ii–V–I; whatever key you step on, your line joins on vibraphone
 * - course: a jump climb (no keyboard floor; see course.ts)
 * - dream: the cat's dream sea — no keys, a sea of stars and a whale's lost song (dream-sea.ts)
 * - cave: the cave of sleeping stars — pitch dark unless you wear the cosmic crown (cave.ts)
 * - musicbox: inside the music box — a steel comb to walk on and a tune to step back together (music-box.ts)
 */
export type RegionFeature = "melody" | "springs" | "echo" | "jazz" | "course" | "dream" | "cave" | "musicbox";

export interface RegionDef {
  id: RegionId;
  instrument: InstrumentId;
  feature: RegionFeature;
  /** Camera offset from the player; the course wants a lower, side-on view */
  camera: [x: number, y: number, z: number];
  theme: RegionTheme;
  portals: PortalDef[];
  /** The jump course, for course regions */
  course?: CourseDef;
  /** The open island around the keyboard (the hall): zones, ambience, day and night */
  island?: boolean;
  /** Solid ground beyond the keys, by name (engine/terrains.ts) */
  terrain?: TerrainId;
  /**
   * What's underfoot where the terrain isn't: absent, the keyboard; a number,
   * no keyboard at all, just that height (the dream's sea of stars at 0, the
   * cave's abyss far below)
   */
  floor?: number;
  /** Where a direct link puts you (default: the keyboard's spawn) */
  entry?: { x: number; z: number };
  /** Background music that plays while you're here (steps then join in) */
  music?: "house" | "jazz";
  /**
   * Only this stretch of keys is built, where the note you step on doesn't
   * matter (the band picks the harmony); default the full 88
   */
  keys?: KeyRange;
  /** Walkable area, when larger than the keyboard floor's */
  bounds?: { x: number; zMin: number; zMax: number };
}

/** Portals stand well out on the open floor, clear of the keyboard. */
const PORTAL_Z = WHITE_L / 2 + 5.5;

const HALL_PORTALS: PortalDef[] = [
  { to: "neon", x: -22, z: PORTAL_Z, color: "#ff4fd8" },
  { to: "cathedral", x: 13, z: PORTAL_Z, color: "#c9a25a" },
  { to: "lounge", x: 28, z: PORTAL_Z, color: "#e58a3a" },
  // the secret: at the back of the cave behind the harp waterfall
  {
    to: "clouds",
    x: CAVE_PORTAL.x,
    z: CAVE_PORTAL.z,
    color: "#b9a8ff",
    hidden: true,
    arrive: { x: CAVE_PORTAL.x, z: CAVE_PORTAL.z + 3 },
  },
  // the cat's secret: nothing to see, but step on the spot and you're through (cat-walk.ts).
  // You come back out a couple of steps beside it, clear of its radius, so you don't fall straight back in
  { to: "whale", ...SECRET_SPOT, color: "#9fb8ff", invisible: true, arrive: { x: SECRET_SPOT.x + 1.8, z: SECRET_SPOT.z + 1.2 } },
  // the illusory wall: a stretch of cliff you can walk into, if you know where (cave.ts)
  { to: "cave", x: ILLUSORY_WALL.x, z: ILLUSORY_WALL.z, color: "#c9b8ff", invisible: true, arrive: ILLUSORY_ARRIVAL },
  // the dreaming statue: no portal at all — you sit before it and it takes you (statue.ts).
  // This is only where you come back out: in front of its mirror stone
  { to: "musicbox", ...STATUE, color: "#ffd9a0", arriveOnly: true, arrive: STATUE_ARRIVAL },
];

/** Three octaves round middle C (C3–C6): plenty of floor to dance on with a band. */
const BAND_KEYS: KeyRange = [48, 84];
/** ...and a dance floor round them, not the whole 88-key hall. */
const BAND_BOUNDS = (() => {
  const { left, right } = keySpan(BAND_KEYS);
  return { ...BOUNDS, x: Math.max(-left, right) + 10 };
})();

const DEFAULT_CAMERA: RegionDef["camera"] = [0, 12, 14];

/** Every themed region has one way home, near where you arrive. */
const homePortal = (color: string): PortalDef[] => [
  { to: "hall", x: SPAWN.x + 5, z: PORTAL_Z, color },
];

const CLOUDS = COURSES.clouds;
const NIGHT = COURSES.night;
const RUINS = COURSES.ruins;
/**
 * A course's way back down: out in the front-left corner of the start area.
 * Beside the start it sat half a step from the first platform, so a jump
 * onto it could brush the portal and send you home.
 */
const backPortal = (course: CourseDef) => ({ x: course.start.x - 4.5, z: course.start.z + 0.6 });
/** The one way off a course's summit: a portal at its back, behind the treasure. */
const goalPortal = (course: CourseDef, to: RegionId, color: string): PortalDef => ({
  to,
  ...goalSpots(course).portal,
  color,
});

export const REGIONS: Record<RegionId, RegionDef> = {
  hall: {
    id: "hall",
    instrument: "piano",
    feature: "melody",
    camera: DEFAULT_CAMERA,
    portals: HALL_PORTALS,
    island: true,
    terrain: "island",
    bounds: ISLAND_BOUNDS,
    theme: {
      // the day/night cycle recolours sky, fog and light on the island
      background: "#fcfbf8",
      fog: [45, 130],
      floor: "#f7f3ec",
      keyboardCase: "#2f2b27",
      white: "#fbf8f2",
      whitePressed: "#e8dcc6",
      black: "#24201c",
      blackPressed: "#5b5048",
      pressedGlow: null,
      sky: "#ffffff",
      ground: "#e8dfd0",
      ambient: 1.9,
      sun: 2.2,
      sunColor: "#ffffff",
      dark: false,
      accent: "#d4a64a",
    },
  },
  neon: {
    id: "neon",
    instrument: "bright-synth",
    feature: "springs",
    music: "house",
    keys: BAND_KEYS,
    bounds: BAND_BOUNDS,
    camera: DEFAULT_CAMERA,
    portals: homePortal("#f4efe6"),
    theme: {
      background: "#120f1a",
      fog: [22, 50],
      floor: "#191526",
      keyboardCase: "#08070c",
      white: "#4a4462",
      whitePressed: "#5c3f7a",
      black: "#15121e",
      blackPressed: "#3a2654",
      pressedGlow: "#ff4fd8",
      sky: "#8d80ff",
      ground: "#2a2240",
      ambient: 1.7,
      sun: 1.3,
      sunColor: "#b8a8ff",
      dark: true,
      accent: "#ff4fd8",
    },
  },
  cathedral: {
    id: "cathedral",
    instrument: "organ",
    feature: "echo",
    camera: DEFAULT_CAMERA,
    portals: homePortal("#2f2b27"),
    theme: {
      background: "#e7e1d5",
      fog: [20, 48],
      floor: "#d8d0c0",
      keyboardCase: "#4a3a2a",
      white: "#f3ecdc",
      whitePressed: "#e2cf9e",
      black: "#2c241c",
      blackPressed: "#6b5634",
      pressedGlow: "#f0c96a",
      sky: "#fff5df",
      ground: "#bfb39d",
      ambient: 1.5,
      sun: 1.8,
      sunColor: "#ffe8b8",
      dark: false,
      accent: "#f0c96a",
    },
  },
  lounge: {
    id: "lounge",
    instrument: "electric-piano",
    feature: "jazz",
    music: "jazz",
    keys: BAND_KEYS,
    bounds: BAND_BOUNDS,
    camera: DEFAULT_CAMERA,
    portals: homePortal("#f4efe6"),
    theme: {
      background: "#241b16",
      fog: [18, 44],
      floor: "#33261e",
      keyboardCase: "#140f0c",
      white: "#efe3cf",
      whitePressed: "#e2b98a",
      black: "#1d1612",
      blackPressed: "#5a3d28",
      pressedGlow: "#ff9a4a",
      sky: "#ffc48a",
      ground: "#241b16",
      ambient: 0.8,
      sun: 1.1,
      sunColor: "#ffb070",
      dark: true,
      accent: "#ff9a4a",
    },
  },
  clouds: {
    id: "clouds",
    instrument: "synth-pad",
    feature: "course",
    camera: [0, 4.5, 12],
    portals: [
      { to: "hall", ...backPortal(CLOUDS), color: "#8f7cff" },
      // at the top, the only way on is into the night (home is back down at the start)
      goalPortal(CLOUDS, "night", "#5b6cff"),
    ],
    course: CLOUDS,
    theme: {
      background: "#cfe4fb",
      fog: [26, 60],
      floor: "#f4f8ff",
      keyboardCase: "#2f2b27",
      white: "#fbf8f2",
      whitePressed: "#e8dcc6",
      black: "#24201c",
      blackPressed: "#5b5048",
      pressedGlow: "#b9a8ff",
      sky: "#ffffff",
      ground: "#cfe4fb",
      ambient: 1.9,
      sun: 1.8,
      sunColor: "#fff6e6",
      dark: false,
      accent: "#8f7cff",
    },
  },
  night: {
    id: "night",
    instrument: "synth-pad",
    feature: "course",
    camera: [0, 4.5, 12],
    portals: [
      { to: "clouds", ...backPortal(NIGHT), color: "#8f7cff" },
      // past the night, the storm temple
      goalPortal(NIGHT, "ruins", "#ff7a3a"),
    ],
    course: NIGHT,
    theme: {
      background: "#070a1a",
      fog: [24, 60],
      floor: "#0d1230",
      keyboardCase: "#05060f",
      white: "#e9ecff",
      whitePressed: "#c8cff8",
      black: "#1a1d33",
      blackPressed: "#3a4170",
      pressedGlow: "#ffe9a8",
      sky: "#3a4a8a",
      ground: "#070a1a",
      ambient: 0.7,
      sun: 0.45,
      sunColor: "#9fb0ff",
      dark: true,
      accent: "#ffe08a",
    },
  },
  // the third climb: a ruined temple adrift in an endless storm at dusk, with a dragon
  ruins: {
    id: "ruins",
    instrument: "organ",
    feature: "course",
    camera: [0, 4.5, 12],
    portals: [
      { to: "night", ...backPortal(RUINS), color: "#ffb36a" },
      goalPortal(RUINS, "hall", "#ffd36a"),
    ],
    course: RUINS,
    theme: {
      // the haze is the sky's ember horizon, so the floor fades into it with no edge
      background: "#c9622f",
      fog: [28, 95],
      floor: "#2b1f1c",
      keyboardCase: "#2a201c",
      white: "#d9cdb8",
      whitePressed: "#f0c48a",
      black: "#3a302b",
      blackPressed: "#6b4a34",
      pressedGlow: "#ffb35a",
      sky: "#ffb46a",
      ground: "#2b1f1c",
      ambient: 1.0,
      sun: 1.5,
      sunColor: "#ffbf7a",
      dark: true,
      accent: "#ffb35a",
    },
  },
  // the cat's dream: a night sea of stars, reached only by stepping where the cat sits
  whale: {
    id: "whale",
    instrument: "synth-pad",
    feature: "dream",
    // no keys: a sea of stars at y = 0, and whatever floats on it
    terrain: "dream",
    floor: 0,
    entry: DREAM_ARRIVAL,
    camera: DEFAULT_CAMERA,
    bounds: DREAM_BOUNDS,
    portals: [{ to: "hall", ...DREAM_HOME, color: "#9fb8ff", arrive: DREAM_ARRIVAL }],
    theme: {
      background: "#0b0d26",
      fog: [30, 95],
      floor: "#141a46",
      keyboardCase: "#0b0d26",
      white: "#2a3170",
      whitePressed: "#4250a8",
      black: "#0f1236",
      blackPressed: "#2a3170",
      pressedGlow: "#9fb8ff",
      sky: "#8fa6ff",
      ground: "#1a1f52",
      ambient: 1.1,
      sun: 0.9,
      sunColor: "#c8d4ff",
      dark: true,
      accent: "#ffe9a8",
      petGlow: 1,
    },
  },
  cave: {
    id: "cave",
    instrument: "synth-pad",
    feature: "cave",
    // rock floor where there is one; over the abyss, nothing for a long way down
    terrain: "cave",
    floor: ABYSS_FLOOR,
    entry: CAVE_ARRIVAL,
    // closer and lower than outside: rock all round, and the dark
    camera: [0, 9, 10.5],
    bounds: CAVE_BOUNDS,
    portals: [{ to: "hall", ...CAVE_EXIT, color: "#c9b8ff", hidden: true, arrive: CAVE_ARRIVAL }],
    theme: {
      background: "#040308",
      fog: [3, 15],
      floor: "#15121c",
      keyboardCase: "#040308",
      white: "#2a2534",
      whitePressed: "#3d3550",
      black: "#0d0b12",
      blackPressed: "#2a2534",
      pressedGlow: "#c9b8ff",
      sky: "#4a4466",
      ground: "#0b0910",
      ambient: 0.12,
      sun: 0.08,
      sunColor: "#9d94c4",
      dark: true,
      accent: "#ffd27a",
      petGlow: 1,
    },
  },
  // what the dreaming statue dreams of: the inside of a music box, lined with velvet and lit like a candle
  musicbox: {
    id: "musicbox",
    instrument: "synth-pad",
    feature: "musicbox",
    // no keys: velvet at y = 0, and the comb to walk on
    terrain: "musicbox",
    floor: 0,
    entry: MUSICBOX_ARRIVAL,
    // a little closer than outside: you are small in here, and the walls are near
    camera: [0, 10.5, 12.5],
    bounds: MUSICBOX_BOUNDS,
    portals: [{ to: "hall", ...MUSICBOX_HOME, color: "#ffd9a0", arrive: MUSICBOX_ARRIVAL }],
    theme: {
      background: "#1d0f0a",
      fog: [26, 70],
      floor: "#7a1f2e",
      keyboardCase: "#3a2114",
      white: "#d8dde6",
      whitePressed: "#ffe9b0",
      black: "#3a2114",
      blackPressed: "#6b4a2a",
      pressedGlow: "#ffd98a",
      sky: "#ffd9a8",
      ground: "#5a2a1c",
      ambient: 1.25,
      sun: 1.5,
      sunColor: "#ffd2a0",
      dark: true,
      accent: "#ffd98a",
      petGlow: 0.5,
    },
  },
};

/** How close (in floor units) you must step to a portal to go through it. */
export const PORTAL_RADIUS = 0.95;

/** Where you appear in `to` after coming from `from`: just in front of the portal home, facing the keys. */
export function arrivalPoint(to: RegionId, from: RegionId | null): { x: number; z: number } {
  const course = REGIONS[to].course;
  if (course) return { ...course.start };
  // a direct link: the keyboard's spawn, or (no keyboard there) the dream sea's landing spot
  if (from === null) {
    const entry = REGIONS[to].entry;
    return entry ? { ...entry } : { x: SPAWN.x, z: SPAWN.z };
  }
  // Prefer a floor-level portal back to where you came from
  const portal =
    REGIONS[to].portals.find((p) => p.to === from && !p.y) ?? REGIONS[to].portals[0];
  if (!portal) return { x: SPAWN.x, z: SPAWN.z };
  if (portal.arrive) return { ...portal.arrive };
  // Beside the portal (not behind it, where it would hide you from the
  // camera) and outside its radius, so you don't land straight back in
  return { x: portal.x + 2.4, z: portal.z - 0.6 };
}
