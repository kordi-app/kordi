import { queryOptions } from "@tanstack/react-query";
import { bffClient, type ApiSchema } from "@/shared/api";

type WarpStonesResponse = ApiSchema<"WarpStonesResponse">;

/** The warp stones a member has woken, kept with the account (the plaza's included) */
export const warpStoneQueries = {
  mine: () =>
    queryOptions({
      queryKey: ["world", "warp-stones"],
      queryFn: () => bffClient.get("world/warp-stones").json<WarpStonesResponse>(),
      // only this player wakes their stones, and every wake writes the answer back into the cache
      staleTime: 5 * 60 * 1000,
    }),
};

/** Add stones to the account (already-awake ones are fine): the full list comes back */
export function wakeWarpStones(stones: string[]): Promise<WarpStonesResponse> {
  return bffClient
    .put("world/warp-stones", { json: { stones } satisfies ApiSchema<"WarpStonesRequest"> })
    .json<WarpStonesResponse>();
}
