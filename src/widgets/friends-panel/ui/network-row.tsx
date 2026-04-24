"use client";

import { useTranslations } from "next-intl";
import { MessageCircle, UserMinus } from "lucide-react";
import type { Friendship } from "@/entities/friendship";
import { useDeleteFriendship } from "@/features/friendship";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";

interface NetworkRowProps {
  friendship: Friendship;
  currentUserId: number;
}

export function NetworkRow({ friendship, currentUserId }: NetworkRowProps) {
  const t = useTranslations("friends");
  const { mutate, isPending } = useDeleteFriendship();

  const isSender = friendship.senderId === currentUserId;
  const otherNickname = isSender
    ? friendship.receiverNickname
    : friendship.senderNickname;
  const initial = otherNickname.charAt(0).toUpperCase();

  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b border-black px-6 py-4 transition-colors last:border-b-0 hover:bg-black/5">
      <div className="col-span-6 flex items-center gap-3">
        <Avatar className="size-9 ring-1 ring-black">
          <AvatarFallback className="bg-black text-xs font-bold text-white">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-black">
            {otherNickname}
          </p>
          <p className="truncate text-[11px] opacity-60">
            @{otherNickname.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="col-span-4 flex items-center gap-2">
        <span className="size-2 rounded-full bg-black" />
        <span className="text-sm text-black">{t("statusConnected")}</span>
      </div>

      <div className="col-span-2 flex justify-end gap-4">
        <button
          aria-label={t("message")}
          className="text-black opacity-60 transition-opacity hover:opacity-100"
        >
          <MessageCircle className="size-5" strokeWidth={1.75} />
        </button>
        <button
          aria-label={t("delete")}
          disabled={isPending}
          onClick={() => mutate(friendship.id)}
          className="text-black opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
        >
          <UserMinus className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
