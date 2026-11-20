"use client";

import { useTranslations } from "next-intl";
import type { Friendship } from "@/entities/friendship";
import { Button } from "@/shared/ui/button";
import { useAcceptRequest } from "../lib/use-accept-request";
import { useRejectRequest } from "../lib/use-reject-request";
import { FriendAvatar } from "./friend-avatar";
import { FriendRow } from "./friend-row";

export function ReceivedRequestItem({ friendship }: { friendship: Friendship }) {
  const t = useTranslations("friends");
  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const disabled = accept.isPending || reject.isPending;
  const name = friendship.senderNickname;

  return (
    <FriendRow
      name={name}
      avatar={<FriendAvatar name={name} />}
      note={t("wantsToBeFriend")}
      actions={
        <>
          <Button size="sm" variant="ghost" disabled={disabled} onClick={() => reject.mutate(friendship.id)}>
            {t("reject")}
          </Button>
          <Button size="sm" disabled={disabled} onClick={() => accept.mutate(friendship.id)}>
            {t("accept")}
          </Button>
        </>
      }
    />
  );
}
