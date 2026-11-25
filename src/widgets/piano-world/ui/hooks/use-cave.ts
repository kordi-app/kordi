"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/shared/lib/react/use-local-storage";
import { markFound as markPlaceFound } from "./secret-places";

/**
 * What this browser remembers of the cave of sleeping stars: that you've
 * found the way in (so a link straight to it works: see secret-places.ts), and
 * — for guests, whose looks the server doesn't keep — the gold necklace once
 * you've taken it.
 */
export function useCave() {
  const [guestNecklace, setGuestNecklace] = useLocalStorage("world.necklace", false);
  const markFound = useCallback(() => markPlaceFound("cave"), []);
  const takeGuestNecklace = useCallback(() => setGuestNecklace(true), [setGuestNecklace]);
  return { markFound, guestNecklace, takeGuestNecklace };
}
