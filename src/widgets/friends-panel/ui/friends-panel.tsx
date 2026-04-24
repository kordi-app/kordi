"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Inbox, Send } from "lucide-react";
import { friendshipQueries } from "@/entities/friendship";
import { ReceivedRequestItem, SentRequestItem } from "@/features/friendship";
import { RequestsCard } from "./requests-card";
import { NetworkTable } from "./network-table";

interface FriendsPanelProps {
  currentUserId: number;
}

export function FriendsPanel({ currentUserId }: FriendsPanelProps) {
  const t = useTranslations("friends");

  const friends = useQuery(friendshipQueries.friends());
  const received = useQuery(friendshipQueries.received());
  const sent = useQuery(friendshipQueries.sent());

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RequestsCard
          title={t("tabs.received")}
          count={received.data?.length ?? 0}
          isLoading={received.isLoading}
          items={received.data}
          emptyIcon={<Inbox className="size-6" strokeWidth={1.75} />}
          emptyLabel={t("empty.received")}
          renderItem={(f) => <ReceivedRequestItem key={f.id} friendship={f} />}
        />
        <RequestsCard
          title={t("tabs.sent")}
          count={sent.data?.length ?? 0}
          isLoading={sent.isLoading}
          items={sent.data}
          emptyIcon={<Send className="size-6" strokeWidth={1.75} />}
          emptyLabel={t("empty.sent")}
          renderItem={(f) => <SentRequestItem key={f.id} friendship={f} />}
        />
      </section>

      <NetworkTable
        title={t("sections.network")}
        currentUserId={currentUserId}
        isLoading={friends.isLoading}
        items={friends.data}
      />
    </div>
  );
}
