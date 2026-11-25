"use client";

import { useCallback } from "react";
import { readStored, writeStored } from "@/shared/lib/storage";

const FOUND_KEY = "world.musicbox-found";

/**
 * What this browser remembers of the inside of the music box: that the
 * dreaming statue has taken you there once, so a link straight to it works
 * (see musicBoxFoundBefore).
 */
export function useMusicBox() {
  const markFound = useCallback(() => writeStored(FOUND_KEY, true), []);
  return { markFound };
}

/** For the first render's region choice: a direct link into the music box only works once you've been. */
export const musicBoxFoundBefore = () => readStored<unknown>(FOUND_KEY, false) === true;
