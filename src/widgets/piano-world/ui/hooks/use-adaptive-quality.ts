"use client";

import { useCallback, useEffect, useState } from "react";
import { debugSeam } from "../../lib/debug-seam";
import { LADDERS, adapt, pixelRatio, quality, startLadder } from "../quality";

const LADDER = LADDERS[quality.tier];

/**
 * The pixel ratio the world draws at right now: a step on the tier's ladder
 * (quality.ts). It starts at the top, which is what the tier has always drawn;
 * drei's PerformanceMonitor reports frames running slow (decline) or with room
 * to spare (incline), and `adapt` moves the step, settling lower if it keeps
 * turning back and forth.
 */
export function useAdaptiveQuality() {
  const [ladder, setLadder] = useState(() => startLadder(LADDER));
  // the scene only renders in the browser (piano-world.tsx loads it with ssr: false)
  const [screen, setScreen] = useState(() => window.devicePixelRatio || 1);

  // the density changes if the window moves to another screen
  useEffect(() => {
    const read = () => setScreen(window.devicePixelRatio || 1);
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const dpr = pixelRatio(LADDER[ladder.step], screen);

  useEffect(() => {
    if (debugSeam) debugSeam.quality = { step: ladder.step, dpr };
  }, [ladder.step, dpr]);

  const decline = useCallback(() => setLadder((s) => adapt(s, "down", LADDER)), []);
  const incline = useCallback(() => setLadder((s) => adapt(s, "up", LADDER)), []);

  return { dpr, decline, incline };
}
