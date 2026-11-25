import { readStored, writeStored } from "@/shared/lib/storage";
import type { RegionId } from "../../engine/regions";

/**
 * The hidden places a direct link (?region=…) only opens once you've found the
 * way in yourself, and where this browser remembers that you have.
 */
export const SECRET_PLACES = {
  whale: "world.dream-found",
  cave: "world.cave-found",
  musicbox: "world.musicbox-found",
} as const satisfies Partial<Record<RegionId, string>>;

export type SecretPlace = keyof typeof SECRET_PLACES;

export const isSecretPlace = (region: string): region is SecretPlace => region in SECRET_PLACES;

/** You've been there before (so a link straight to it works) */
export const foundBefore = (place: SecretPlace) => readStored<unknown>(SECRET_PLACES[place], false) === true;

/** You found the way in: from now on a link can bring you back */
export const markFound = (place: SecretPlace) => writeStored(SECRET_PLACES[place], true);
