"use client";

import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import type { Friendship } from "@/entities/friendship";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
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
        <Avatar>
          <AvatarFallback>
            {friendship.receiverNickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      }
      title={friendship.receiverNickname}
      subtitle={
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" strokeWidth={2} />
          {t("pending")}
        </span>
      }
      actions={
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => mutate(friendship.id)}
          className="text-muted-foreground hover:text-foreground"
        >
          {t("cancelRequest")}
        </Button>
      }
    />
  );
}
