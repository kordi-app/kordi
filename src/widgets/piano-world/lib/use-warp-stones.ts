"use client";

import { useCallback, useRef, useState } from "react";
import { WARP_STONES, type WarpStoneId } from "../model/island";

const STORAGE_KEY = "kordi.world.warp-stones.v1";
/** The plaza's stone is awake from the start, so there's always somewhere to warp back to. */
const ALWAYS_AWAKE: WarpStoneId[] = ["plaza"];

function readAwake(): Set<WarpStoneId> {
  const awake = new Set<WarpStoneId>(ALWAYS_AWAKE);
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (Array.isArray(raw)) {
      for (const id of raw) if (WARP_STONES.some((s) => s.id === id)) awake.add(id as WarpStoneId);
    }
  } catch {
    // unreadable or unavailable storage: start with just the plaza
  }
  return awake;
}

/**
 * Which warp stones you've woken (kept in this browser). Waking is the
 * exploring; once awake, any stone takes you to any other awake one.
 */
export function useWarpStones() {
  const [awake, setAwake] = useState<ReadonlySet<WarpStoneId>>(readAwake);
  const awakeRef = useRef(awake);

  /** Wake a stone; returns true if it was asleep until now. */
  const wake = useCallback((id: WarpStoneId) => {
    if (awakeRef.current.has(id)) return false;
    const next = new Set(awakeRef.current).add(id);
    awakeRef.current = next;
    setAwake(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // private mode etc. — it stays awake for this visit only
    }
    return true;
  }, []);

  return { awake, wake };
}
