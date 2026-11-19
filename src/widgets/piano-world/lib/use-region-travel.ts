"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Arrival } from "../model/physics";
import { REGIONS, arrivalPoint, isRegionId, type RegionDef, type RegionId } from "../model/regions";

const FADE_MS = 260;

/**
 * Which region you're in, and the portal hop between regions: fade out, swap
 * (with the caller's cleanup run while the screen is covered), fade in.
 * The region lives in ?region= so a place can be linked to directly.
 */
export function useRegionTravel() {
  const [regionId, setRegionId] = useState<RegionId>(() => {
    const param = new URLSearchParams(window.location.search).get("region");
    return isRegionId(param) ? param : "hall";
  });
  const region = REGIONS[regionId];
  /** For callbacks that must see the region without re-subscribing */
  const regionRef = useRef<RegionDef>(region);
  const [arrival, setArrival] = useState<Arrival>(() => arrivalPoint(regionId, null));
  const [fading, setFading] = useState(false);
  const transitioning = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const travel = useCallback((to: RegionId, onSwap: (next: RegionDef) => void) => {
    if (transitioning.current) return;
    transitioning.current = true;
    const from = regionRef.current.id;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFading(true);
    timer.current = setTimeout(
      () => {
        const next = REGIONS[to];
        regionRef.current = next;
        onSwap(next);
        setRegionId(to);
        setArrival(arrivalPoint(to, from));
        const url = new URL(window.location.href);
        if (to === "hall") url.searchParams.delete("region");
        else url.searchParams.set("region", to);
        window.history.replaceState(window.history.state, "", url);
        setFading(false);
        transitioning.current = false;
      },
      reduceMotion ? 0 : FADE_MS,
    );
  }, []);

  /** Jump to another spot in the same region (warp stones): the same fade, no region change. */
  const warp = useCallback((to: { x: number; z: number }) => {
    if (transitioning.current) return;
    transitioning.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFading(true);
    timer.current = setTimeout(
      () => {
        setArrival({ x: to.x, z: to.z }); // a fresh object: the scene places you on it
        setFading(false);
        transitioning.current = false;
      },
      reduceMotion ? 0 : FADE_MS,
    );
  }, []);

  return { region, regionRef, arrival, fading, travel, warp };
}
