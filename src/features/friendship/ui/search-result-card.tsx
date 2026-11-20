"use client";

import { useTranslations } from "next-intl";
import type { PublicUser } from "@/entities/user";
import { Button } from "@/shared/ui/button";
import { FriendAvatar } from "./friend-avatar";
import { FriendRow } from "./friend-row";

interface SearchResultCardProps {
  user: PublicUser;
  onSend: () => void;
  disabled?: boolean;
}

export function SearchResultCard({ user, onSend, disabled }: SearchResultCardProps) {
  const t = useTranslations("friends");
  return (
    <FriendRow
      name={user.nickname}
      avatar={<FriendAvatar name={user.nickname} />}
      actions={
        <Button size="sm" onClick={onSend} disabled={disabled}>
          {t("sendRequest")}
        </Button>
      }
    />
  );
}
