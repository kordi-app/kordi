"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, MessageCircle, UserMinus, Inbox, Send, Users } from "lucide-react";
import { friendshipQueries, type Friendship } from "@/entities/friendship";
import {
  ReceivedRequestItem,
  SentRequestItem,
} from "@/features/friendship";
import { useDeleteFriendship } from "@/features/friendship/lib/use-delete-friendship";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";

interface FriendsPanelProps {
  currentUserId: number;
}

export function FriendsPanel({ currentUserId }: FriendsPanelProps) {
  const t = useTranslations("friends");

  const friends = useQuery(friendshipQueries.friends());
  const received = useQuery(friendshipQueries.received());
  const sent = useQuery(friendshipQueries.sent());

  return (
    <div className="flex flex-col gap-10">
      {/* Pending + Sent grid */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RequestsCard
          title={t("tabs.received")}
          count={received.data?.length ?? 0}
          isLoading={received.isLoading}
          items={received.data}
          emptyIcon={<Inbox className="size-6" strokeWidth={1.5} />}
          emptyLabel={t("empty.received")}
          renderItem={(f) => <ReceivedRequestItem key={f.id} friendship={f} />}
        />
        <RequestsCard
          title={t("tabs.sent")}
          count={sent.data?.length ?? 0}
          isLoading={sent.isLoading}
          items={sent.data}
          emptyIcon={<Send className="size-6" strokeWidth={1.5} />}
          emptyLabel={t("empty.sent")}
          renderItem={(f) => <SentRequestItem key={f.id} friendship={f} />}
        />
      </section>

      {/* My Network data table */}
      <NetworkTable
        title={t("sections.network")}
        currentUserId={currentUserId}
        isLoading={friends.isLoading}
        items={friends.data}
      />
    </div>
  );
}

function RequestsCard({
  title,
  count,
  isLoading,
  items,
  emptyIcon,
  emptyLabel,
  renderItem,
}: {
  title: string;
  count: number;
  isLoading: boolean;
  items: Friendship[] | undefined;
  emptyIcon: React.ReactNode;
  emptyLabel: string;
  renderItem: (f: Friendship) => React.ReactNode;
}) {
  return (
    <div className="card-flat p-lg">
      <div className="mb-md flex items-baseline justify-between">
        <h2 className="text-headline-md text-foreground">{title}</h2>
        <span className="label-caps tabular-nums">{count}</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {emptyIcon}
          </div>
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="border-t border-outline-variant">
          {items.map((f) => (
            <li key={f.id}>{renderItem(f)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NetworkTable({
  title,
  currentUserId,
  isLoading,
  items,
}: {
  title: string;
  currentUserId: number;
  isLoading: boolean;
  items: Friendship[] | undefined;
}) {
  const t = useTranslations("friends");

  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-baseline justify-between">
        <h2 className="text-headline-lg text-foreground">{title}</h2>
        <span className="label-caps tabular-nums">
          {items?.length ?? 0} {t("musicians")}
        </span>
      </div>

      <div className="card-flat overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-sm border-b border-outline-variant bg-muted px-lg py-sm label-caps">
          <div className="col-span-6">{t("columns.musician")}</div>
          <div className="col-span-4">{t("columns.status")}</div>
          <div className="col-span-2 text-right">{t("columns.actions")}</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
          </div>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-6" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {t("empty.friends")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("empty.friendsHint")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((f) => (
              <NetworkRow
                key={f.id}
                friendship={f}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function NetworkRow({
  friendship,
  currentUserId,
}: {
  friendship: Friendship;
  currentUserId: number;
}) {
  const t = useTranslations("friends");
  const { mutate, isPending } = useDeleteFriendship();

  const isSender = friendship.senderId === currentUserId;
  const otherNickname = isSender
    ? friendship.receiverNickname
    : friendship.senderNickname;
  const initial = otherNickname.charAt(0).toUpperCase();

  return (
    <div className="grid grid-cols-12 items-center gap-sm border-b border-outline-variant px-lg py-md transition-colors last:border-b-0 hover:bg-muted">
      <div className="col-span-6 flex items-center gap-3">
        <Avatar className="size-9 ring-1 ring-outline-variant">
          <AvatarFallback className="bg-muted text-xs font-bold text-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {otherNickname}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            @{otherNickname.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="col-span-4 flex items-center gap-2">
        <span className="size-2 rounded-full bg-success" />
        <span className="text-sm text-foreground">{t("statusConnected")}</span>
      </div>

      <div className="col-span-2 flex justify-end gap-4">
        <button
          aria-label={t("message")}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageCircle className="size-5" strokeWidth={1.75} />
        </button>
        <button
          aria-label={t("delete")}
          disabled={isPending}
          onClick={() => mutate(friendship.id)}
          className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
        >
          <UserMinus className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
