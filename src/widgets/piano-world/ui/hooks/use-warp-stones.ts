"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readStored, writeStored } from "@/shared/lib/storage";
import type { WarpStoneId } from "../../engine/island";
import { awakeStones, stillToSend, toSend, warpStonesIn } from "../../engine/warp-stones";
import { warpStoneQueries, wakeWarpStones } from "../../api/warp-stones";

const STORAGE_KEY = "world.warp-stones";
/** A member's stones as the account last gave them: what's awake when the account can't be asked */
const ACCOUNT_KEY = "world.warp-stones.account";

/** The stones this browser holds: a guest's, or a member's the server hasn't confirmed yet */
const readStoredStones = () => warpStonesIn(readStored<unknown>(STORAGE_KEY, []));

/**
 * Which warp stones you've woken. Waking is the exploring; once awake, any
 * stone takes you to any other awake one.
 *
 * A guest's stones live in this browser. A member's live with the account
 * (the server), so they follow them to any device; the browser's list then
 * only holds what the server hasn't confirmed yet. A wake goes there first
 * and is sent on, and whatever is left over (a guest's stones on signing in,
 * a wake whose request failed) is sent the next time the world opens.
 *
 * The browser also remembers what the account last answered, and goes by that
 * until it answers again (or if it can't: offline, the session run out), so a
 * member's stones don't fall asleep with the network. A guest's visit forgets
 * it: it belonged to whoever was signed in before.
 */
export function useWarpStones(signedIn: boolean) {
  const queryClient = useQueryClient();
  const { data: account } = useQuery({ ...warpStoneQueries.mine(), enabled: signedIn });
  // read once: the effects below rewrite it, and nothing else does while the world is open
  const [remembered] = useState(() => {
    const stored = signedIn ? readStored<unknown>(ACCOUNT_KEY, null) : null;
    return Array.isArray(stored) ? warpStonesIn(stored) : null;
  });
  /** the account's stones: its answer, or until it answers what it said last time (null: never heard) */
  const accountStones = account?.awake ?? remembered;
  const [local, setLocal] = useState<readonly WarpStoneId[]>(readStoredStones);

  const awake = useMemo(() => awakeStones(local, accountStones ?? undefined), [local, accountStones]);
  // read synchronously when a stone is reached, between renders
  const awakeRef = useRef(awake);
  // a member's stones aren't known until the account has answered, now or on an earlier visit:
  // until then a stone that looks asleep may be one they woke long ago
  const known = !signedIn || accountStones !== null;
  const knownRef = useRef(known);
  useEffect(() => {
    awakeRef.current = awake;
    knownRef.current = known;
  }, [awake, known]);

  // keep the account's answer for next time; a guest's visit forgets the last member's
  useEffect(() => {
    if (!signedIn) writeStored(ACCOUNT_KEY, null);
    else if (account) writeStored(ACCOUNT_KEY, warpStonesIn(account.awake));
  }, [signedIn, account]);

  /** Hand stones to the account; once it has them, the browser no longer needs to hold them */
  const send = useCallback(
    (stones: WarpStoneId[]) =>
      wakeWarpStones(stones)
        .then((saved) => {
          queryClient.setQueryData(warpStoneQueries.mine().queryKey, saved);
          writeStored(STORAGE_KEY, stillToSend(readStoredStones(), stones));
        })
        // left in the browser: sent again the next time the world opens
        .catch(() => {}),
    [queryClient],
  );

  // a member opening the world: anything the browser still holds goes to the account
  useEffect(() => {
    if (!signedIn) return;
    const pending = toSend(readStoredStones());
    if (pending.length > 0) void send(pending);
  }, [signedIn, send]);

  /**
   * Wake a stone; returns true if it was asleep until now. While a member's
   * stones aren't known yet it is still woken and sent on (the account takes a
   * stone it already has), but never reported as new: no cheering twice.
   */
  const wake = useCallback(
    (id: WarpStoneId) => {
      if (awakeRef.current.has(id)) return false;
      awakeRef.current = new Set(awakeRef.current).add(id);
      setLocal((current) => [...current, id]);
      writeStored(STORAGE_KEY, [...new Set([...readStoredStones(), id])]);
      if (signedIn) void send([id]);
      return knownRef.current;
    },
    [signedIn, send],
  );

  return { awake, wake };
}
