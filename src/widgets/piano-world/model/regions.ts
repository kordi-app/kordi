import type { InstrumentId } from "@/shared/lib/audio";
import { SPAWN, WHITE_L } from "./layout";
import { COURSES, goalSpots, type CourseDef } from "./course";
import { CAVE_PORTAL, ISLAND_BOUNDS } from "./island";

/**
 * The piano world is a hub (the Grand Hall) with portals out to themed
 * regions, each of which has a single portal back. Every region shares the
 * same 88-key floor — what changes is the instrument it plays and the light
 * it is played in. Adding a region is a data change here (plus copy and,
 * optionally, decor), not a scene change.
 */

export const REGION_IDS = ["hall", "neon", "cathedral", "lounge", "clouds", "night"] as const;
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
}

/**
 * What makes a region play differently, not just look different:
 * - melody: follow a glowing path through a song
 * - springs: black keys bounce you into the air; the floor pulses
 * - echo: steps ripple and the organ rings on after you leave a key
 * - jazz: a trio plays ii–V–I; whatever key you step on, your line joins on vibraphone
 * - course: a jump climb (no keyboard floor; see course.ts)
 */
export type RegionFeature = "melody" | "springs" | "echo" | "jazz" | "course";

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
  /** The open island around the keyboard (the hall): terrain, zones, day and night */
  island?: boolean;
  /** Background music that plays while you're here (steps then join in) */
  music?: "house" | "jazz";
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
];

const DEFAULT_CAMERA: RegionDef["camera"] = [0, 12, 14];

/** Every themed region has one way home, near where you arrive. */
const homePortal = (color: string): PortalDef[] => [
  { to: "hall", x: SPAWN.x + 5, z: PORTAL_Z, color },
];

const CLOUDS = COURSES.clouds;
const NIGHT = COURSES.night;
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
      { to: "hall", x: CLOUDS.start.x - 3, z: CLOUDS.start.z, color: "#8f7cff" },
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
      { to: "clouds", x: NIGHT.start.x - 3, z: NIGHT.start.z, color: "#8f7cff" },
      goalPortal(NIGHT, "hall", "#ffd36a"),
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
};

/** How close (in floor units) you must step to a portal to go through it. */
export const PORTAL_RADIUS = 0.95;

/** Where you appear in `to` after coming from `from`: just in front of the portal home, facing the keys. */
export function arrivalPoint(to: RegionId, from: RegionId | null): { x: number; z: number } {
  const course = REGIONS[to].course;
  if (course) return { ...course.start };
  if (from === null) return { x: SPAWN.x, z: SPAWN.z };
  // Prefer a floor-level portal back to where you came from
  const portal =
    REGIONS[to].portals.find((p) => p.to === from && !p.y) ?? REGIONS[to].portals[0];
  if (!portal) return { x: SPAWN.x, z: SPAWN.z };
  if (portal.arrive) return { ...portal.arrive };
  // Beside the portal (not behind it, where it would hide you from the
  // camera) and outside its radius, so you don't land straight back in
  return { x: portal.x + 2.4, z: portal.z - 0.6 };
}
