"use client";

import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import type { Friendship } from "@/entities/friendship";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { useCancelRequest } from "../lib/use-cancel-request";
import { FriendRow } from "./friend-row";

interface SentRequestItemProps {
  friendship: Friendship;
}

export function SentRequestItem({ friendship }: SentRequestItemProps) {
  const t = useTranslations("friends");
  const { mutate, isPending } = useCancelRequest();

  return (
    <FriendRow
      dim
      avatar={
        <Avatar className="ring-1 ring-ring">
          <AvatarFallback className="bg-card text-foreground border border-border">
            {friendship.receiverNickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      }
      title={friendship.receiverNickname}
      subtitle={
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {t("pending")}
        </span>
      }
      actions={
        <button
          disabled={isPending}
          onClick={() => mutate(friendship.id)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          {t("cancelRequest")}
        </button>
      }
    />
  );
}
