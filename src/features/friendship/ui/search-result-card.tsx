"use client";

import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import type { User } from "@/entities/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";

interface SearchResultCardProps {
  user: User;
  onSend: () => void;
  disabled?: boolean;
}

export function SearchResultCard({
  user,
  onSend,
  disabled,
}: SearchResultCardProps) {
  const t = useTranslations("friends");

  return (
    <div className="glass flex items-center gap-3 rounded-2xl px-3 py-3 ring-1 ring-primary/15 transition-all">
      <Avatar size="lg" className="ring-2 ring-primary/20">
        <AvatarImage
          src={user.profileImageUrl ?? undefined}
          alt={user.nickname}
        />
        <AvatarFallback className="bg-primary/10 text-primary">
          {user.nickname.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-[510] text-foreground">
          {user.nickname}
        </p>
        <p className="text-xs text-muted-foreground">{t("foundUser")}</p>
      </div>
      <Button size="sm" onClick={onSend} disabled={disabled}>
        <UserPlus className="size-3.5" strokeWidth={1.75} />
        {t("sendRequest")}
      </Button>
    </div>
  );
}
