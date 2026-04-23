"use client";

import { sendFriendRequest } from "../api/mutations";
import { useFriendshipMutation } from "./use-friendship-mutation";

export function useSendRequest() {
  return useFriendshipMutation({
    mutationFn: sendFriendRequest,
    invalidateKeys: [["friendship", "sent"]],
    successKey: "friends.toast.requestSent",
  });
}
