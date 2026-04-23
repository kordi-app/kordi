"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, Search, UserX, Loader2, UserSearch } from "lucide-react";
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

  useEffect(() => {
    if (!open) setNickname("");
  }, [open]);

  const isSelf = data && currentUserId != null && data.id === currentUserId;

  const handleSend = () => {
    if (!data || isSelf) return;
    mutate(data.id, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus className="size-3.5" strokeWidth={1.75} />
        {t("add")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" strokeWidth={1.75} />
            {t("add")}
          </DialogTitle>
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

        <div className="min-h-[92px]">
          {trimmed.length < 2 ? (
            <EmptyHint
              icon={<UserSearch className="size-5" strokeWidth={1.5} />}
              label={t("searchHint")}
            />
          ) : isFetching ? (
            <EmptyHint
              icon={<Loader2 className="size-5 animate-spin" strokeWidth={1.5} />}
              label={t("searching")}
            />
          ) : isError || !data ? (
            <EmptyHint
              icon={<UserX className="size-5" strokeWidth={1.5} />}
              label={t("noResult")}
            />
          ) : isSelf ? (
            <EmptyHint
              icon={<UserX className="size-5 text-destructive" strokeWidth={1.5} />}
              label={t("error.cannotAddSelf")}
              destructive
            />
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

function EmptyHint({
  icon,
  label,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <div className={destructive ? "text-destructive" : "text-muted-foreground"}>
        {icon}
      </div>
      <p
        className={
          destructive
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        {label}
      </p>
    </div>
  );
}
