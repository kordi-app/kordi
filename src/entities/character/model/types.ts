export type BodyColor = "cream" | "sky" | "pink" | "mint" | "lemon" | "lilac" | "cocoa";
export type HatId = "crown" | "star-crown" | "ribbon" | "beret" | "headphones" | "flower";
export type FaceId = "default" | "smile" | "sparkle" | "sleepy";
export type AccessoryId = "scarf" | "bowtie" | "glasses";

/** How Kordi looks. Mirrors the server's AppearanceDto. */
export interface Appearance {
  body: BodyColor;
  hat: HatId | null;
  face: FaceId;
  accessory: AccessoryId | null;
}

/** GET /api/characters/me */
export interface MyCharacter {
  appearance: Appearance;
  /** reward items unlocked by finishing jump courses */
  unlocked: HatId[];
}

/** Gestures Kordi can perform (the world's emote ids). */
export type KordiEmote = "wave" | "clap" | "dance" | "sit";
