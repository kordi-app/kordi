import { queryOptions } from "@tanstack/react-query";
import {
  getFriends,
  getSentRequests,
  getReceivedRequests,
} from "./fetchers";

export const friendshipQueries = {
  friends: () =>
    queryOptions({
      queryKey: ["friendship", "friends"] as const,
      queryFn: getFriends,
      staleTime: 30 * 1000,
    }),
  sent: () =>
    queryOptions({
      queryKey: ["friendship", "sent"] as const,
      queryFn: getSentRequests,
      staleTime: 30 * 1000,
    }),
  received: () =>
    queryOptions({
      queryKey: ["friendship", "received"] as const,
      queryFn: getReceivedRequests,
      staleTime: 30 * 1000,
    }),
};
