"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RewardId } from "@/entities/character";
import type { CaveEvent } from "../../engine/cave";
import type { CaveReplyMessage } from "../../net/protocol";
import { useCave } from "./use-cave";
import type { WorldFeedback } from "./world-feedback";
import type { Banner } from "../hud/place-banner";

/** No answer this long after a claim (an older server, a lost message): ask again */
const CLAIM_TIMEOUT_MS = 3_000;
/** The server said "not yet" (it heard my position a step behind, or my connection is new): ask again after */
const CLAIM_RETRY_MS = 700;

/**
 * The cave of sleeping stars: its banner as you come through the wall, the
 * star rests' chimes, the thud of a fall, and the gold necklace — kept in this
 * browser for guests; for members, claimed from the server, which answers
 * (CaveReplyMessage): yes, not yet (ask again), or no (and why).
 *
 * @param cosmicCrown I carry the crown's light (it decides the welcome line)
 * @param rewards what a member has unlocked (the necklace among them, once the server has granted it)
 */
export function useCaveEvents(
  { copy, audio, say, celebrate }: WorldFeedback,
  {
    isGuest,
    inCave,
    online,
    cosmicCrown,
    rewards,
    sendCave,
    showBanner,
  }: {
    isGuest: boolean;
    inCave: boolean;
    /** connected to the server (a claim waits for it) */
    online: boolean;
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
  /** a member took the necklace and the server hasn't said yes or no yet */
  const [pending, setPending] = useState(false);
  /** bumped to ask the server again */
  const [attempt, setAttempt] = useState(0);
  /** for enter(), which shouldn't re-subscribe to my look */
  const crowned = useRef(cosmicCrown);
  useEffect(() => {
    crowned.current = cosmicCrown;
  }, [cosmicCrown]);

  /** Through the wall: a link can bring you back from now on. */
  const enter = useCallback(() => {
    setPending(false); // a claim left unanswered on an earlier visit: the altar offers it again
    markFound();
    warpEffect("arrive");
    showBanner(copy.regions.cave, crowned.current ? copy.caveLit : copy.caveDark, "place");
  }, [markFound, warpEffect, showBanner, copy]);

  /** It's mine: a slow golden arpeggio as it settles on me, and its banner. */
  const celebrateNecklace = useCallback(() => {
    progression([[62, 66, 69, 74]]);
    celebrate();
    showBanner(
      copy.necklaceTitle,
      isGuest ? `${copy.necklaceFound} · ${copy.necklaceGuestNote}` : copy.necklaceFound,
      "treasure",
    );
  }, [progression, celebrate, showBanner, copy, isGuest]);

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
          // guests keep it here and now; members get it when the server says yes (handleReply)
          if (isGuest) {
            takeGuestNecklace();
            celebrateNecklace();
          } else {
            voice("crystal", 86, 0.5);
            setPending(true);
          }
      }
    },
    [voice, say, copy, isGuest, takeGuestNecklace, celebrateNecklace],
  );


  // A member's claim: ask, and ask again if there's no answer (an older server, a lost message).
  // A reconnect asks again too. Coming back into the cave starts afresh (see enter).
  useEffect(() => {
    if (!pending || !inCave || !online || hasNecklace) return;
    sendCave();
    const timeout = setTimeout(() => setAttempt((n) => n + 1), CLAIM_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [pending, inCave, online, hasNecklace, attempt, sendCave]);

  /** The server's answer: yes, not yet (ask again shortly), or no (and why). */
  const handleReply = useCallback(
    (reply: CaveReplyMessage) => {
      if (!pending) return;
      if (reply.ok) {
        setPending(false);
        celebrateNecklace();
      } else if (reply.retry) {
        setTimeout(() => setAttempt((n) => n + 1), CLAIM_RETRY_MS);
      } else {
        setPending(false);
        say(copy.necklaceRefused);
      }
    },
    [pending, celebrateNecklace, say, copy],
  );

  return { guestNecklace, hasNecklace, enter, handleCave, handleReply };
}
