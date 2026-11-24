"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RewardId } from "@/entities/character";
import type { CaveEvent } from "../../engine/cave";
import { useCave } from "./use-cave";
import type { WorldFeedback } from "./world-feedback";
import type { Banner } from "../hud/place-banner";

/**
 * The cave of sleeping stars: its banner as you come through the wall, the
 * star rests' chimes, the thud of a fall, and the gold necklace — kept in this
 * browser for guests; for members, told to the server until it's in my unlocks.
 *
 * @param cosmicCrown I carry the crown's light (it decides the welcome line)
 * @param rewards what a member has unlocked (the necklace among them, once the server has granted it)
 */
export function useCaveEvents(
  { copy, audio, say, celebrate }: WorldFeedback,
  {
    isGuest,
    inCave,
    cosmicCrown,
    rewards,
    sendCave,
    showBanner,
  }: {
    isGuest: boolean;
    inCave: boolean;
    cosmicCrown: boolean;
    rewards: readonly RewardId[];
    sendCave: () => boolean;
    showBanner: (title: string, sub: string, tone: Banner["tone"]) => void;
  },
) {
  const { voice, progression, warpEffect } = audio;
  const { markFound, guestNecklace, takeGuestNecklace } = useCave();
  /** the necklace is mine: kept in this browser for guests, unlocked on the server for members */
  const hasNecklace = isGuest ? guestNecklace : rewards.includes("gold-necklace");
  /** a member took the necklace and the server hasn't answered yet */
  const [pending, setPending] = useState(false);
  /** for enter(), which shouldn't re-subscribe to my look */
  const crowned = useRef(cosmicCrown);
  useEffect(() => {
    crowned.current = cosmicCrown;
  }, [cosmicCrown]);

  /** Through the wall: a link can bring you back from now on. */
  const enter = useCallback(() => {
    markFound();
    warpEffect("arrive");
    showBanner(copy.regions.cave, crowned.current ? copy.caveLit : copy.caveDark, "place");
  }, [markFound, warpEffect, showBanner, copy]);

  const handleCave = useCallback(
    (event: CaveEvent) => {
      switch (event.kind) {
        case "rest":
          voice("crystal", 76, 0.6);
          setTimeout(() => voice("crystal", 83, 0.5), 180);
          say(copy.caveRest);
          return;
        case "fell":
          voice("bell", 38, 0.35);
          return;
        case "necklace":
          // a slow golden arpeggio as it settles on you
          progression([[62, 66, 69, 74]]);
          celebrate();
          showBanner(
            copy.necklaceTitle,
            isGuest ? `${copy.necklaceFound} · ${copy.necklaceGuestNote}` : copy.necklaceFound,
            "treasure",
          );
          // the world only hands it over once the server will believe it; members tell it now
          if (isGuest) takeGuestNecklace();
          else setPending(true);
      }
    },
    [voice, say, copy, progression, celebrate, showBanner, isGuest, takeGuestNecklace],
  );

  // A member's take: tell the server, and keep telling it while still in the cave until the
  // necklace shows up in my unlocks. The server checks where it last heard I was, which can lag
  // a step behind (positions go out 10×/s), so it may say no at first; a dropped connection or a
  // fresh socket it doesn't trust yet too. Leave and come back, and the altar offers it again.
  useEffect(() => {
    if (!pending || !inCave || hasNecklace) return;
    sendCave();
    const retry = setInterval(sendCave, 1_000);
    return () => clearInterval(retry);
  }, [pending, inCave, hasNecklace, sendCave]);

  return { guestNecklace, hasNecklace, enter, handleCave };
}
