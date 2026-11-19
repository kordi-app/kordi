import type { RegionId } from "./regions";
import { SPAWN, WHITE_L } from "./layout";

/**
 * Things you can walk up to and use with E (or the on-screen button).
 * The cat wanders, so its position comes from the scene each frame;
 * everything else stands still.
 */
export type InteractableId = "cat" | "chordCard" | "teacher" | "musicBox" | "jukebox" | "discoBall";

export interface InteractableDef {
  id: InteractableId;
  region: RegionId;
  x: number;
  z: number;
  /** how close you need to be for the prompt to appear */
  radius: number;
}

const FRONT = WHITE_L / 2 + 2.6;

export const INTERACTABLES: readonly InteractableDef[] = [
  { id: "cat", region: "hall", x: SPAWN.x, z: 1.2, radius: 1.6 },
  { id: "chordCard", region: "hall", x: SPAWN.x - 6, z: FRONT, radius: 1.5 },
  { id: "teacher", region: "hall", x: SPAWN.x + 6.5, z: FRONT, radius: 1.7 },
  { id: "musicBox", region: "cathedral", x: SPAWN.x - 5, z: FRONT, radius: 1.5 },
  { id: "jukebox", region: "lounge", x: SPAWN.x - 6, z: FRONT, radius: 1.6 },
  { id: "discoBall", region: "neon", x: SPAWN.x - 4, z: FRONT, radius: 1.8 },
];

export const interactablesIn = (region: RegionId) =>
  INTERACTABLES.filter((item) => item.region === region);

/** Emotes: number keys 1–4 or the emote bar. Must match the server's allow-list. */
export const EMOTES = ["wave", "clap", "dance", "sit"] as const;
export type EmoteId = (typeof EMOTES)[number];
export const EMOTE_SECONDS: Record<EmoteId, number> = { wave: 2.2, clap: 2.2, dance: 4, sit: Infinity };
export const EMOTE_ICON: Record<EmoteId, string> = { wave: "👋", clap: "👏", dance: "🎵", sit: "💤" };
