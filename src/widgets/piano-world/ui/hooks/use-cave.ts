"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/shared/lib/react/use-local-storage";
import { readStored, writeStored } from "@/shared/lib/storage";

const FOUND_KEY = "world.cave-found";

/**
 * What this browser remembers of the cave of sleeping stars: that you've
 * found the way in (so a link straight to it works: see caveFoundBefore), and
 * — for guests, whose looks the server doesn't keep — the gold necklace once
 * you've taken it.
 */
export function useCave() {
  const [guestNecklace, setGuestNecklace] = useLocalStorage("world.necklace", false);
  const markFound = useCallback(() => writeStored(FOUND_KEY, true), []);
  const takeGuestNecklace = useCallback(() => setGuestNecklace(true), [setGuestNecklace]);
  return { markFound, guestNecklace, takeGuestNecklace };
}

/** For the first render's region choice: a direct link to the cave only works once you've found it. */
export const caveFoundBefore = () => readStored<unknown>(FOUND_KEY, false) === true;
