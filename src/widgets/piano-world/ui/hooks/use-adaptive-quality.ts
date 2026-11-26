"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { debugSeam } from "../../lib/debug-seam";
import { LADDERS, adapt, ladderFor, quality, startLadder } from "../quality";

const TIER_LADDER = LADDERS[quality.tier];

/** The screen's density (the scene only renders in the browser: piano-world.tsx loads it with ssr: false) */
const screenDensity = () => window.devicePixelRatio || 1;

/**
 * The pixel ratio the world draws at right now: a step on the tier's ladder
 * (quality.ts), as far as this screen goes. It starts at the top, which is
 * what the tier has always drawn; drei's PerformanceMonitor reports frames
 * running slow (decline) or with room to spare (incline), and `adapt` moves
 * the step, settling lower if it keeps turning back and forth.
 */
export function useAdaptiveQuality() {
  const [screen, setScreen] = useState(screenDensity);
  const ladder = useMemo(() => ladderFor(TIER_LADDER, screen), [screen]);
  const [state, setState] = useState(() => ({ ladder, at: startLadder(ladder) }));

  // the density changes if the window moves to another screen
  useEffect(() => {
    const read = () => setScreen(screenDensity());
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  // a new screen is a new ladder: start again from its top
  let at = state.at;
  if (state.ladder !== ladder) {
    at = startLadder(ladder);
    setState({ ladder, at });
  }

  const dpr = ladder[at.step];

  useEffect(() => {
    if (debugSeam) debugSeam.quality = { step: at.step, dpr };
  }, [at.step, dpr]);

  const move = useCallback(
    (direction: "up" | "down") =>
      setState((s) => {
        const next = adapt(s.at, direction, s.ladder);
        return next === s.at ? s : { ladder: s.ladder, at: next };
      }),
    [],
  );
  const decline = useCallback(() => move("down"), [move]);
  const incline = useCallback(() => move("up"), [move]);

  return { dpr, decline, incline };
}
