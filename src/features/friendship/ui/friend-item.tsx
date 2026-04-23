"use client";

import { useTranslations } from "next-intl";
import { MoreVertical, UserMinus } from "lucide-react";
import type { Friendship } from "@/entities/friendship";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useDeleteFriendship } from "../lib/use-delete-friendship";
import { FriendRow } from "./friend-row";

interface FriendItemProps {
  friendship: Friendship;
  currentUserId: number;
}

export function FriendItem({ friendship, currentUserId }: FriendItemProps) {
  const t = useTranslations("friends");
  const { mutate, isPending } = useDeleteFriendship();

  const isSender = friendship.senderId === currentUserId;
  const otherNickname = isSender
    ? friendship.receiverNickname
    : friendship.senderNickname;

  return (
    <FriendRow
      avatar={
        <Avatar className="ring-1 ring-primary/15">
          <AvatarFallback>
            {otherNickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      }
      title={otherNickname}
      subtitle={t("friendSince")}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            <MoreVertical className="size-4" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onClick={() => mutate(friendship.id)}
            >
              <UserMinus className="size-4" />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
