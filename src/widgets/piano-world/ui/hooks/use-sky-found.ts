"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/shared/lib/react/use-local-storage";

/**
 * Whether you've lit the whole sky over the island (kept in this browser).
 * Once you have, its constellation stays up on every night after.
 */
export function useSkyFound() {
  const [found, setFound] = useLocalStorage("world.sky-found", false);
  const markFound = useCallback(() => setFound(true), [setFound]);
  return { found, markFound };
}
