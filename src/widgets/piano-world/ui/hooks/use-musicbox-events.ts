"use client";

import { useCallback, useEffect, useRef } from "react";
import { TEETH, TUNE, type MusicBoxEvent } from "../../engine/music-box";
import { useMusicBox } from "./use-music-box";
import type { WorldFeedback } from "./world-feedback";
import type { Banner } from "../hud/place-banner";

/** The whole tune, once the box remembers it: this long a beat (a music box's unhurried tick) */
const TUNE_BEAT_MS = 330;
/** ...starting once the last tooth you stepped has rung */
const TUNE_LEAD_MS = 700;

/**
 * The dreaming statue and what it dreams of: its chime as it wakes, the
 * banner as you arrive inside the music box, and the box playing its tune
 * whole again once you've stepped the opening phrase on the comb.
 */
export function useMusicBoxEvents(
  { copy, audio, say, celebrate }: WorldFeedback,
  { showBanner }: { showBanner: (title: string, sub: string, tone: Banner["tone"]) => void },
) {
  const { voice, warpEffect } = audio;
  const { markFound } = useMusicBox();
  /** the tune's notes still to come (cancelled by any trip, so it can't ring on somewhere else) */
  const tuneTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopTune = useCallback(() => {
    tuneTimers.current.forEach(clearTimeout);
    tuneTimers.current = [];
  }, []);
  useEffect(() => stopTune, [stopTune]);

  /** The statue opened its eyes: a soft rising chime, and the warp's hum as the dream takes you. */
  const wake = useCallback(() => {
    voice("crystal", 79, 0.5);
    setTimeout(() => voice("crystal", 84, 0.5), 160);
    setTimeout(() => voice("crystal", 91, 0.45), 320);
    warpEffect("depart");
    say(copy.statueWakes);
  }, [voice, warpEffect, say, copy]);

  /** Inside: a link can bring you back from now on. */
  const enter = useCallback(() => {
    markFound();
    warpEffect("arrive");
    showBanner(copy.regions.musicbox, copy.musicBoxArrive, "place");
  }, [markFound, warpEffect, showBanner, copy]);

  /** Any trip anywhere: the tune stops with it. */
  const leave = stopTune;

  const handleMusicBox = useCallback(
    (event: MusicBoxEvent) => {
      // each right step already rings its tooth (the world plays it); only the end needs more
      if (event.kind !== "done") return;
      celebrate();
      say(copy.musicBoxDone);
      stopTune();
      let beat = 0;
      for (const [tooth, beats] of TUNE) {
        const midi = TEETH[tooth].midi;
        // an octave below sings along, the way a music box's bass teeth do
        tuneTimers.current.push(
          setTimeout(() => {
            voice("crystal", midi, 0.7);
            voice("crystal", midi - 12, 0.3);
          }, TUNE_LEAD_MS + beat * TUNE_BEAT_MS),
        );
        beat += beats;
      }
    },
    [celebrate, say, copy, stopTune, voice],
  );

  return { wake, enter, leave, handleMusicBox };
}
