"use client";

import { useTranslations } from "next-intl";
import type { Friendship } from "@/entities/friendship";
import { Button } from "@/shared/ui/button";
import { useCancelRequest } from "../lib/use-cancel-request";
import { FriendAvatar } from "./friend-avatar";
import { FriendRow } from "./friend-row";

export function SentRequestItem({ friendship }: { friendship: Friendship }) {
  const t = useTranslations("friends");
  const { mutate, isPending } = useCancelRequest();
  const name = friendship.receiverNickname;

  return (
    <FriendRow
      name={name}
      avatar={<FriendAvatar name={name} muted />}
      note={t("waitingReply")}
      actions={
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => mutate(friendship.id)}>
          {t("cancelRequest")}
        </Button>
      }
    />
  );
}
