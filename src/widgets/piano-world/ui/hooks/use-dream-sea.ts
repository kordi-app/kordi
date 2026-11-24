"use client";

import { useCallback, useState } from "react";

const PETS_KEY = "kordi.world.pets.v1";
const FOUND_KEY = "kordi.world.dream-found.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode etc. — kept for this visit only
  }
}

/**
 * What this browser remembers of the cat's dream sea: whether you've found
 * the way in (so a link straight to it works, and the spot shows you
 * pawprints), and — for guests, whose looks the server doesn't keep — the
 * moon-whale once it has followed you home.
 */
export function useDreamSea() {
  const [found, setFound] = useState(() => read<boolean>(FOUND_KEY, false) === true);
  const [guestWhale, setGuestWhale] = useState(() => read<string[]>(PETS_KEY, []).includes("moon-whale"));

  const markFound = useCallback(() => {
    setFound(true);
    write(FOUND_KEY, true);
  }, []);

  const adoptGuestWhale = useCallback(() => {
    setGuestWhale(true);
    write(PETS_KEY, ["moon-whale"]);
  }, []);

  return { found, markFound, guestWhale, adoptGuestWhale };
}

/** For the first render's region choice: a direct link to the dream sea only works once you've found it. */
export const dreamFoundBefore = () => read<boolean>(FOUND_KEY, false) === true;
