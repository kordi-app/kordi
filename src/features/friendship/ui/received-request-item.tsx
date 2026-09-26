"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import type { Friendship } from "@/entities/friendship";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { useAcceptRequest } from "../lib/use-accept-request";
import { useRejectRequest } from "../lib/use-reject-request";
import { FriendRow } from "./friend-row";

interface ReceivedRequestItemProps {
  friendship: Friendship;
}

export function ReceivedRequestItem({ friendship }: ReceivedRequestItemProps) {
  const t = useTranslations("friends");
  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const disabled = accept.isPending || reject.isPending;

  return (
    <FriendRow
      accent
      avatar={
        <Avatar className="ring-1 ring-ring">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {friendship.senderNickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      }
      title={friendship.senderNickname}
      subtitle={t("wantsToBeFriend")}
      actions={
        <>
          <button
            disabled={disabled}
            onClick={() => reject.mutate(friendship.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <X className="size-3.5" />
            {t("reject")}
          </button>
          <button
            disabled={disabled}
            onClick={() => accept.mutate(friendship.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            <Check className="size-3.5" />
            {t("accept")}
          </button>
        </>
      }
    />
  );
}
