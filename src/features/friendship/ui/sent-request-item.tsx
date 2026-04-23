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
        <Avatar className="ring-1 ring-black">
          <AvatarFallback className="bg-white text-black border border-black">
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
        <button
          disabled={isPending}
          onClick={() => mutate(friendship.id)}
          className="rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-bold uppercase text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
        >
          {t("cancelRequest")}
        </button>
      }
    />
  );
}
