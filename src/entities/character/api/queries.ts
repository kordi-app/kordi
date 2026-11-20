import { queryOptions } from "@tanstack/react-query";
import { getMyCharacter } from "./get-my-character";

export const characterQueries = {
  me: () =>
    queryOptions({
      queryKey: ["character", "me"],
      queryFn: getMyCharacter,
      staleTime: 60 * 1000,
    }),
};
