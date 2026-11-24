"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/shared/lib/react/use-local-storage";
import { readStored } from "@/shared/lib/storage";

const FOUND_KEY = "world.dream-found";

/**
 * What this browser remembers of the cat's dream sea: whether you've found
 * the way in (so a link straight to it works, and the spot shows you
 * pawprints), and — for guests, whose looks the server doesn't keep — the
 * moon-whale once it has followed you home.
 */
export function useDreamSea() {
  const [found, setFound] = useLocalStorage(FOUND_KEY, false);
  const [guestWhale, setGuestWhale] = useLocalStorage("world.moon-whale", false);
  const markFound = useCallback(() => setFound(true), [setFound]);
  const adoptGuestWhale = useCallback(() => setGuestWhale(true), [setGuestWhale]);
  return { found, markFound, guestWhale, adoptGuestWhale };
}

/** For the first render's region choice: a direct link to the dream sea only works once you've found it. */
export const dreamFoundBefore = () => readStored<unknown>(FOUND_KEY, false) === true;
