"use client";

import { deleteFriendship } from "../api/mutations";
import { useFriendshipMutation } from "./use-friendship-mutation";

export function useDeleteFriendship() {
  return useFriendshipMutation({
    mutationFn: deleteFriendship,
    invalidateKeys: [["friendship", "friends"]],
    successKey: "friends.toast.deleted",
  });
}
