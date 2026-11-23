import type { AccessoryId, Appearance, BodyColor, FaceId, HatId } from "./types";

/**
 * Everything Kordi can wear. Mirrors the server's CharacterCatalog — add an
 * item in both places.
 */

export const BODY_COLORS: Record<BodyColor, string> = {
  cream: "#f4efe6",
  sky: "#cfe6fb",
  pink: "#fbd3df",
  mint: "#cdeee0",
  lemon: "#fbefb4",
  lilac: "#e0d6fb",
  cocoa: "#d9b99b",
};

export const BODY_IDS = Object.keys(BODY_COLORS) as BodyColor[];
export const HAT_IDS: HatId[] = ["crown", "star-crown", "flame-crown", "ribbon", "beret", "headphones", "flower"];
export const FACE_IDS: FaceId[] = ["default", "smile", "sparkle", "sleepy"];
export const ACCESSORY_IDS: AccessoryId[] = ["scarf", "bowtie", "glasses"];

/** Hats you earn by finishing a jump course (the world region it's in). */
export const REWARD_HATS: Partial<Record<HatId, "clouds" | "night" | "ruins">> = {
  crown: "clouds",
  "star-crown": "night",
  "flame-crown": "ruins",
};

export const isRewardHat = (hat: HatId) => hat in REWARD_HATS;

export const DEFAULT_APPEARANCE: Appearance = {
  body: "cream",
  hat: null,
  face: "default",
  accessory: null,
};
