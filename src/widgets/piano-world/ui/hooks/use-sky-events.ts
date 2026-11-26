"use client";

import { useCallback } from "react";
import { PROGRESSION, openSky, skyNow, skyRuntime, syncSky, type SkyEvent } from "../../engine/sky-island";
import { useSkyFound } from "./use-sky-found";
import type { WorldFeedback } from "./world-feedback";

/**
 * The midnight bell and the sky island: the tower bell's strokes (mine and the
 * channel's), the star steps opening, and the sky island's star pads and
 * constellations. Whether you've lit the whole sky is remembered here too.
 */
export function useSkyEvents({ copy, audio, say, celebrate }: WorldFeedback) {
  const { voice, progression, towerBell } = audio;
  const { found, markFound } = useSkyFound();

  /** The bell sounded: one stroke by day; at midnight twelve, if it opened the sky. */
  const ring = useCallback(
    (opened: boolean) => {
      towerBell(opened ? 12 : 1);
    },
    [towerBell],
  );

  /** Someone in the channel rang the midnight bell (`rung`), or I joined while the stars were out. */
  const handleRemoteBell = useCallback(
    (leftMs: number, rung: boolean) => {
      if (!rung) {
        syncSky(skyNow(), leftMs / 1000);
        return;
      }
      ring(openSky(skyNow(), leftMs / 1000, true));
    },
    [ring],
  );

  /** Up on the sky island: a star pad, a constellation, or the whole sky. */
  const handleSky = useCallback(
    (event: SkyEvent) => {
      switch (event.kind) {
        case "pad":
          voice("crystal", event.midi, 0.7);
          break;
        case "constellation":
          // the last one's chord is the start of the orrery's progression instead
          if (!skyRuntime.done.every(Boolean)) progression([PROGRESSION[event.index]]);
          break;
        case "finished":
          progression(PROGRESSION);
          markFound();
          celebrate();
          say(copy.skyFound);
          break;
      }
    },
    [voice, progression, markFound, celebrate, say, copy],
  );

  return { skyFound: found, ring, handleRemoteBell, handleSky };
}
