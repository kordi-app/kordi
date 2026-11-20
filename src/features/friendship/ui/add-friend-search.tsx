"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useSearchUser } from "../lib/use-search-user";
import { useSendRequest } from "../lib/use-send-request";
import { SearchResultCard } from "./search-result-card";

interface AddFriendSearchProps {
  currentUserId?: number;
  /** close the search (after a request is sent, or on ✕ / Escape) */
  onClose: () => void;
}

/**
 * Find someone by nickname and send a request — inline on the friends page,
 * so the page (and the sidebar) stay put instead of being covered by a modal.
 */
export function AddFriendSearch({ currentUserId, onClose }: AddFriendSearchProps) {
  const t = useTranslations("friends");
  const [nickname, setNickname] = useState("");
  const trimmed = nickname.trim();
  const { data, isFetching, isError, settled } = useSearchUser(nickname);
  const { mutate, isPending } = useSendRequest();
  const isSelf = data && currentUserId != null && data.id === currentUserId;

  const handleSend = () => {
    if (!data || isSelf) return;
    mutate(data.id, { onSuccess: onClose });
  };

  return (
    <section aria-label={t("add")} className="rounded-card border border-stroke-neutral-subtle bg-bg-layer-default p-component">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-neutral-subtle" />
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            autoFocus
            className="h-10 pl-9"
          />
        </div>
        <Button variant="ghost" size="icon" aria-label={t("closeSearch")} onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="mt-1 min-h-12 px-1">
        {trimmed.length < 2 ? (
          <Hint label={t("searchHint")} />
        ) : isFetching || !settled ? (
          <Hint label={t("searching")} />
        ) : isError || !data ? (
          <Hint label={t("noResult")} />
        ) : isSelf ? (
          <Hint label={t("error.cannotAddSelf")} critical />
        ) : (
          <SearchResultCard user={data} onSend={handleSend} disabled={isPending} />
        )}
      </div>
    </section>
  );
}

function Hint({ label, critical }: { label: string; critical?: boolean }) {
  return <p className={critical ? "py-3 text-t3 text-fg-critical" : "py-3 text-t3 text-fg-neutral-muted"}>{label}</p>;
}
