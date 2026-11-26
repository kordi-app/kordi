"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { midiToNoteName } from "@/shared/lib/music";
import { LOST_NOTES, SERVER_MIN_STAY_SECONDS, WHALE_SONG, dreamRuntime, type DreamEvent } from "../../engine/dream-sea";
import { useDreamSea } from "./use-dream-sea";
import type { WorldFeedback } from "./world-feedback";

/**
 * The cat's dream sea: the lost notes you find, the whale coming down to sing,
 * telling the server (members get the baby whale from it) and the whale
 * carrying you home afterwards.
 *
 * @param sendWhale tells the server the whale sang for me
 * @param carryHome takes you back to the island (the scene's portal hop)
 */
export function useDreamEvents(
  { copy, audio, say, celebrate }: WorldFeedback,
  { isGuest, sendWhale, carryHome }: { isGuest: boolean; sendWhale: () => void; carryHome: () => void },
) {
  const { voice, progression, warpEffect } = audio;
  const { found, markFound, guestWhale, adoptGuestWhale } = useDreamSea();
  /** notes found on this visit (for the card) */
  const [notes, setNotes] = useState(0);
  const [sang, setSang] = useState(false);
  /** when I reached the sea (its socket opens with the region) */
  const arrivedAt = useRef(0);
  /** telling the server the whale sang, held back until it will believe it */
  const whaleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** the whale carrying you home (cancelled by any trip, so it can't fire on a later visit) */
  const homeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(whaleTimer.current);
      clearTimeout(homeTimer.current);
    },
    [],
  );

  /** Any trip anywhere: the whale's pending errands are off. */
  const leave = useCallback(() => {
    clearTimeout(whaleTimer.current);
    clearTimeout(homeTimer.current);
  }, []);

  /** Coming into the sea: you found the cat's way in, so a link (or the pawprints) can bring you back. */
  const enter = useCallback(() => {
    markFound();
    setNotes(0);
    setSang(false);
    arrivedAt.current = performance.now();
    warpEffect("arrive");
  }, [markFound, warpEffect]);

  const handleDream = useCallback(
    (event: DreamEvent) => {
      if (event.kind === "note") {
        voice("crystal", event.midi, 0.85);
        const count = dreamRuntime.found.filter(Boolean).length;
        setNotes(count);
        say(count >= LOST_NOTES.length ? copy.dreamReady : copy.dreamNote.replace("{note}", midiToNoteName(event.midi)));
        return;
      }
      setSang(true);
      // the whale sings its song whole again, low and slow
      progression(WHALE_SONG.map((midi) => [midi - 24, midi]));
      celebrate();
      if (isGuest) adoptGuestWhale();
      say(copy.whaleSings);
      // members: the server only believes it after a minute here (plus a margin for lag)
      const wait = Math.max(0, SERVER_MIN_STAY_SECONDS * 1000 + 1500 - (performance.now() - arrivedAt.current));
      clearTimeout(whaleTimer.current);
      whaleTimer.current = setTimeout(sendWhale, wait);
      // then it carries you home (never before the server has heard)
      clearTimeout(homeTimer.current);
      homeTimer.current = setTimeout(() => {
        warpEffect("depart");
        carryHome();
      }, Math.max(11_000, wait + 1500));
    },
    [voice, say, copy, progression, celebrate, sendWhale, isGuest, adoptGuestWhale, warpEffect, carryHome],
  );

  return { dreamFound: found, guestWhale, notes, sang, enter, leave, handleDream };
}
