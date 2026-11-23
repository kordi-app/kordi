"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EMOTE_SECONDS, type EmoteId } from "../../engine/interactables";

/** Your current emote; timed ones end on their own, sitting lasts until you move. */
export function useEmote() {
  const [emote, setEmote] = useState<EmoteId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const play = useCallback((next: EmoteId) => {
    clearTimeout(timer.current);
    setEmote(next);
    const seconds = EMOTE_SECONDS[next];
    if (Number.isFinite(seconds)) timer.current = setTimeout(() => setEmote(null), seconds * 1000);
  }, []);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    setEmote((current) => (current === null ? current : null));
  }, []);

  /** For the emote bar: pressing the active emote stops it. */
  const toggle = useCallback(
    (id: EmoteId) => (emote === id ? cancel() : play(id)),
    [emote, cancel, play],
  );

  return { emote, play, cancel, toggle };
}
