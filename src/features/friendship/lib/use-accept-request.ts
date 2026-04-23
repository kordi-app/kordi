"use client";

import { acceptFriendRequest } from "../api/mutations";
import { useFriendshipMutation } from "./use-friendship-mutation";

export function useAcceptRequest() {
  return useFriendshipMutation({
    mutationFn: acceptFriendRequest,
    invalidateKeys: [
      ["friendship", "received"],
      ["friendship", "friends"],
    ],
    successKey: "friends.toast.accepted",
  });
}
