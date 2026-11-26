"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readStored, writeStored } from "@/shared/lib/storage";
import type { WarpStoneId } from "../../engine/island";
import { awakeStones, stillToSend, toSend, warpStonesIn } from "../../engine/warp-stones";
import { warpStoneQueries, wakeWarpStones } from "../../api/warp-stones";

const STORAGE_KEY = "world.warp-stones";

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
 */
export function useWarpStones(signedIn: boolean) {
  const queryClient = useQueryClient();
  const { data: account } = useQuery({ ...warpStoneQueries.mine(), enabled: signedIn });
  const [local, setLocal] = useState<readonly WarpStoneId[]>(readStoredStones);

  const awake = useMemo(() => awakeStones(local, account?.awake), [local, account]);
  // read synchronously when a stone is reached, between renders
  const awakeRef = useRef(awake);
  useEffect(() => {
    awakeRef.current = awake;
  }, [awake]);

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

  /** Wake a stone; returns true if it was asleep until now. */
  const wake = useCallback(
    (id: WarpStoneId) => {
      if (awakeRef.current.has(id)) return false;
      awakeRef.current = new Set(awakeRef.current).add(id);
      setLocal((current) => [...current, id]);
      writeStored(STORAGE_KEY, [...new Set([...readStoredStones(), id])]);
      if (signedIn) void send([id]);
      return true;
    },
    [signedIn, send],
  );

  return { awake, wake };
}
