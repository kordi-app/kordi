"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import type { Friendship } from "@/entities/friendship";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
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
        <Avatar className="ring-1 ring-primary/30">
          <AvatarFallback className="bg-primary/10 text-primary">
            {friendship.senderNickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      }
      title={friendship.senderNickname}
      subtitle={t("wantsToBeFriend")}
      actions={
        <>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => reject.mutate(friendship.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" strokeWidth={2} />
            {t("reject")}
          </Button>
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => accept.mutate(friendship.id)}
          >
            <Check className="size-3.5" strokeWidth={2.25} />
            {t("accept")}
          </Button>
        </>
      }
    />
  );
}
