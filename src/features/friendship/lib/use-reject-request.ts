"use client";

import { rejectFriendRequest } from "../api/mutations";
import { useFriendshipMutation } from "./use-friendship-mutation";

export function useRejectRequest() {
  return useFriendshipMutation({
    mutationFn: rejectFriendRequest,
    invalidateKeys: [["friendship", "received"]],
    successKey: "friends.toast.rejected",
  });
}
