import { queryOptions } from "@tanstack/react-query";
import { getAdventureRankings } from "./get-adventure-rankings";

export const adventureQueries = {
  rankings: () =>
    queryOptions({
      queryKey: ["adventure", "rankings"],
      queryFn: getAdventureRankings,
      staleTime: 30 * 1000,
    }),
};
