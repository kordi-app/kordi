"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary, Suspense } from "@suspensive/react";
import { useTranslations } from "next-intl";
import { Inbox, Send } from "lucide-react";
import { friendshipQueries } from "@/entities/friendship";
import { ReceivedRequestItem, SentRequestItem } from "@/features/friendship";
import { LoadingState } from "@/shared/ui/empty-state";
import { RequestsCard } from "./requests-card";
import { NetworkTable } from "./network-table";

interface FriendsPanelProps {
  currentUserId: number;
}

export function FriendsPanel({ currentUserId }: FriendsPanelProps) {
  return (
    <ErrorBoundary
      fallback={() => (
        <p className="py-12 text-center text-sm opacity-60">Error loading</p>
      )}
    >
      <Suspense fallback={<LoadingState />}>
        <FriendsPanelContent currentUserId={currentUserId} />
      </Suspense>
    </ErrorBoundary>
  );
}

function FriendsPanelContent({ currentUserId }: FriendsPanelProps) {
  const t = useTranslations("friends");

  const { data: friends } = useSuspenseQuery(friendshipQueries.friends());
  const { data: received } = useSuspenseQuery(friendshipQueries.received());
  const { data: sent } = useSuspenseQuery(friendshipQueries.sent());

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RequestsCard
          title={t("tabs.received")}
          items={received}
          emptyIcon={<Inbox className="size-6" strokeWidth={1.75} />}
          emptyLabel={t("empty.received")}
          renderItem={(f) => <ReceivedRequestItem key={f.id} friendship={f} />}
        />
        <RequestsCard
          title={t("tabs.sent")}
          items={sent}
          emptyIcon={<Send className="size-6" strokeWidth={1.75} />}
          emptyLabel={t("empty.sent")}
          renderItem={(f) => <SentRequestItem key={f.id} friendship={f} />}
        />
      </section>

      <NetworkTable
        title={t("sections.network")}
        currentUserId={currentUserId}
        items={friends}
      />
    </div>
  );
}
