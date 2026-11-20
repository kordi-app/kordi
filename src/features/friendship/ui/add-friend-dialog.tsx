"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useSearchUser } from "../lib/use-search-user";
import { useSendRequest } from "../lib/use-send-request";
import { SearchResultCard } from "./search-result-card";

interface AddFriendDialogProps {
  currentUserId?: number;
}

export function AddFriendDialog({ currentUserId }: AddFriendDialogProps) {
  const t = useTranslations("friends");
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");

  const trimmed = nickname.trim();
  const { data, isFetching, isError } = useSearchUser(nickname);
  const { mutate, isPending } = useSendRequest();

  const isSelf = data && currentUserId != null && data.id === currentUserId;

  const handleSend = () => {
    if (!data || isSelf) return;
    mutate(data.id, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setNickname("");
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus className="size-3.5" />
        {t("add")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
          <DialogDescription>{t("addDescription")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("searchPlaceholder")}
            autoFocus
            className="h-10 pl-9 text-sm"
          />
        </div>

        <div className="min-h-16">
          {trimmed.length < 2 ? (
            <Hint label={t("searchHint")} />
          ) : isFetching ? (
            <Hint label={t("searching")} />
          ) : isError || !data ? (
            <Hint label={t("noResult")} />
          ) : isSelf ? (
            <Hint label={t("error.cannotAddSelf")} destructive />
          ) : (
            <SearchResultCard
              user={data}
              onSend={handleSend}
              disabled={isPending}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Hint({ label, destructive }: { label: string; destructive?: boolean }) {
  return <p className={destructive ? "py-3 text-[13px] text-destructive" : "py-3 text-[13px] text-muted-foreground"}>{label}</p>;
}
