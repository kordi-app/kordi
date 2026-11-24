"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "kordi.world.sky-found.v1";

function readFound() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Whether you've lit the whole sky over the island (kept in this browser).
 * Once you have, its constellation stays up on every night after.
 */
export function useSkyFound() {
  const [found, setFound] = useState(readFound);

  const markFound = useCallback(() => {
    setFound(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // private mode etc. — it stays up for this visit only
    }
  }, []);

  return { found, markFound };
}
