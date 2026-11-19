import type { InstrumentId } from "@/shared/lib/audio";
import { SPAWN, WHITE_L } from "./layout";

/**
 * The piano world is a hub (the Grand Hall) with portals out to themed
 * regions, each of which has a single portal back. Every region shares the
 * same 88-key floor — what changes is the instrument it plays and the light
 * it is played in. Adding a region is a data change here (plus copy and,
 * optionally, decor), not a scene change.
 */

export const REGION_IDS = ["hall", "neon", "cathedral", "lounge"] as const;
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
  /** Tailwind-safe text colour for HUD chips drawn over this background */
  dark: boolean;
}

export interface PortalDef {
  to: RegionId;
  x: number;
  z: number;
  /** Ring colour */
  color: string;
}

export interface RegionDef {
  id: RegionId;
  instrument: InstrumentId;
  theme: RegionTheme;
  portals: PortalDef[];
}

/** Portals stand on the open floor in front of the keys. */
const PORTAL_Z = WHITE_L / 2 + 2.2;

const HALL_PORTALS: PortalDef[] = [
  { to: "neon", x: -18, z: PORTAL_Z, color: "#ff4fd8" },
  { to: "cathedral", x: 9, z: PORTAL_Z, color: "#c9a25a" },
  { to: "lounge", x: 20, z: PORTAL_Z, color: "#e58a3a" },
];

/** Every themed region has one way home, near where you arrive. */
const homePortal = (color: string): PortalDef[] => [
  { to: "hall", x: SPAWN.x + 5, z: PORTAL_Z, color },
];

export const REGIONS: Record<RegionId, RegionDef> = {
  hall: {
    id: "hall",
    instrument: "grand-piano",
    portals: HALL_PORTALS,
    theme: {
      background: "#fcfbf8",
      fog: [30, 60],
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
    },
  },
  neon: {
    id: "neon",
    instrument: "bright-synth",
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
    },
  },
  cathedral: {
    id: "cathedral",
    instrument: "organ",
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
    },
  },
  lounge: {
    id: "lounge",
    instrument: "electric-piano",
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
    },
  },
};

/** How close (in floor units) you must step to a portal to go through it. */
export const PORTAL_RADIUS = 0.95;

/** Where you appear in `to` after coming from `from`: just in front of the portal home, facing the keys. */
export function arrivalPoint(to: RegionId, from: RegionId | null): { x: number; z: number } {
  if (from === null) return { x: SPAWN.x, z: SPAWN.z };
  const portal = REGIONS[to].portals.find((p) => p.to === from) ?? REGIONS[to].portals[0];
  if (!portal) return { x: SPAWN.x, z: SPAWN.z };
  // Beside the portal (not behind it, where it would hide you from the
  // camera) and outside its radius, so you don't land straight back in
  return { x: portal.x + 2.4, z: portal.z - 0.6 };
}
