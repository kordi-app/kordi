"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Arrival } from "../../engine/physics";
import { REGIONS, arrivalPoint, isRegionId, type RegionDef, type RegionId } from "../../engine/regions";
import { readCourseBest } from "./course-record";

const FADE_MS = 260;

/**
 * Which region you're in, and the portal hop between regions: fade out, swap
 * (with the caller's cleanup run while the screen is covered), fade in.
 * The region lives in ?region= so a place can be linked to directly — except
 * the later courses, each reached from the top of the one before: a link to
 * the night before you've cleared the clouds (or to the storm temple before
 * the night) starts you at the first course you haven't cleared.
 */
function initialRegion(): RegionId {
  const param = new URLSearchParams(window.location.search).get("region");
  if (!isRegionId(param)) return "hall";
  // each later course opens once the one before it is cleared: fall back to the first that isn't
  if (param === "ruins" && readCourseBest("night") === null) return readCourseBest("clouds") === null ? "clouds" : "night";
  if (param === "night" && readCourseBest("clouds") === null) return "clouds";
  return param;
}

export function useRegionTravel() {
  const [regionId, setRegionId] = useState<RegionId>(initialRegion);
  const region = REGIONS[regionId];
  /** For callbacks that must see the region without re-subscribing */
  const regionRef = useRef<RegionDef>(region);
  const [arrival, setArrival] = useState<Arrival>(() => arrivalPoint(regionId, null));
  const [fading, setFading] = useState(false);
  const transitioning = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // a link we didn't follow (the night before the clouds are cleared): show where you really are
  useEffect(() => {
    const url = new URL(window.location.href);
    const linked = url.searchParams.get("region");
    if (linked === null || linked === regionRef.current.id || !isRegionId(linked)) return;
    url.searchParams.set("region", regionRef.current.id);
    window.history.replaceState(window.history.state, "", url);
  }, []);

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
  const warp = useCallback((to: { x: number; z: number }, onArrive?: () => void) => {
    if (transitioning.current) return;
    transitioning.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFading(true);
    timer.current = setTimeout(
      () => {
        setArrival({ x: to.x, z: to.z }); // a fresh object: the scene places you on it
        setFading(false);
        onArrive?.();
        transitioning.current = false;
      },
      reduceMotion ? 0 : FADE_MS,
    );
  }, []);

  return { region, regionRef, arrival, fading, travel, warp };
}
