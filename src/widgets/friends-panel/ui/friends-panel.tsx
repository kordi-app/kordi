"use client";

import { useState, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary, Suspense } from "@suspensive/react";
import { useTranslations } from "next-intl";
import { friendshipQueries, type Friendship } from "@/entities/friendship";
import { UserPlus } from "lucide-react";
import { AddFriendSearch, FriendItem, ReceivedRequestItem, SentRequestItem } from "@/features/friendship";
import { Button } from "@/shared/ui/button";
import { LoadingState } from "@/shared/ui/empty-state";

interface FriendsPanelProps {
  currentUserId: number;
}

/** Show the filter only once the list is long enough to need it. */
const FILTER_FROM = 8;

/**
 * The friends page body: title, adding a friend (inline — the page and the
 * sidebar stay in place), requests and the list.
 */
export function FriendsPanel({ currentUserId }: FriendsPanelProps) {
  const t = useTranslations("friends");
  const [adding, setAdding] = useState(false);
  return (
    <>
      <header className="mb-8 flex min-h-9 items-center justify-between gap-4">
        <h1 className="text-t9 font-bold text-fg-neutral">{t("title")}</h1>
        {adding ? null : (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus />
            {t("add")}
          </Button>
        )}
      </header>
      {adding ? (
        <div className="mb-section">
          <AddFriendSearch currentUserId={currentUserId} onClose={() => setAdding(false)} />
        </div>
      ) : null}
      <ErrorBoundary fallback={() => <p className="py-12 text-t4 text-fg-neutral-muted">{t("loadFailed")}</p>}>
        <Suspense fallback={<LoadingState />}>
          <FriendsPanelContent currentUserId={currentUserId} onAdd={() => setAdding(true)} adding={adding} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

function Section({ title, count, aside, children }: { title: string; count: number; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-t5 font-semibold text-foreground">
          {title}
          <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{count}</span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function FriendsPanelContent({
  currentUserId,
  onAdd,
  adding,
}: FriendsPanelProps & { onAdd: () => void; adding: boolean }) {
  const t = useTranslations("friends");
  const { data: friends } = useSuspenseQuery(friendshipQueries.friends());
  const { data: received } = useSuspenseQuery(friendshipQueries.received());
  const { data: sent } = useSuspenseQuery(friendshipQueries.sent());
  const [filter, setFilter] = useState("");

  const otherName = (f: Friendship) => (f.senderId === currentUserId ? f.receiverNickname : f.senderNickname);
  const query = filter.trim().toLowerCase();
  const shown = query ? friends.filter((f) => otherName(f).toLowerCase().includes(query)) : friends;

  return (
    <div className="flex flex-col gap-10">
      {received.length > 0 ? (
        <Section title={t("tabs.received")} count={received.length}>
          <div className="rounded-xl bg-muted/50 px-4 py-1.5">
            {received.map((f) => (
              <ReceivedRequestItem key={f.id} friendship={f} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        title={t("tabs.friends")}
        count={friends.length}
        aside={
          friends.length >= FILTER_FROM ? (
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("filterPlaceholder")}
              aria-label={t("filterPlaceholder")}
              className="h-8 w-40 rounded-lg border border-border bg-card px-3 text-t3 text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground/30"
            />
          ) : null
        }
      >
        {friends.length === 0 ? (
          <div className="py-10">
            <p className="text-t5 text-foreground">{t("empty.friends")}</p>
            <p className="mt-1 text-t3 text-muted-foreground">{t("empty.friendsHint")}</p>
            {adding ? null : (
              <Button size="sm" variant="outline" className="mt-4" onClick={onAdd}>
                <UserPlus />
                {t("add")}
              </Button>
            )}
          </div>
        ) : shown.length === 0 ? (
          <p className="py-8 text-t3 text-muted-foreground">{t("noMatch")}</p>
        ) : (
          <div className="divide-y divide-border/60">
            {shown.map((f) => (
              <FriendItem key={f.id} friendshipId={f.id} name={otherName(f)} />
            ))}
          </div>
        )}
      </Section>

      {sent.length > 0 ? (
        <Section title={t("tabs.sent")} count={sent.length}>
          <div className="divide-y divide-border/60">
            {sent.map((f) => (
              <SentRequestItem key={f.id} friendship={f} />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
