"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import type { Friendship } from "@/entities/friendship";
import { SectionHeader } from "@/shared/ui/section-header";
import { EmptyState } from "@/shared/ui/empty-state";
import { NetworkRow } from "./network-row";

interface NetworkTableProps {
  title: string;
  currentUserId: number;
  items: Friendship[];
}

export function NetworkTable({
  title,
  currentUserId,
  items,
}: NetworkTableProps) {
  const t = useTranslations("friends");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <SectionHeader size="md">{title}</SectionHeader>
        <span className="text-[11px] font-bold uppercase tracking-widest tabular-nums opacity-70">
          {items.length} {t("musicians")}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-black bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-black bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
          <div className="col-span-6">{t("columns.musician")}</div>
          <div className="col-span-4">{t("columns.status")}</div>
          <div className="col-span-2 text-right">{t("columns.actions")}</div>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" strokeWidth={1.75} />}
            label={t("empty.friends")}
            hint={t("empty.friendsHint")}
          />
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
