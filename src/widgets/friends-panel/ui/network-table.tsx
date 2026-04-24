"use client";

import { useTranslations } from "next-intl";
import { Loader2, Users } from "lucide-react";
import type { Friendship } from "@/entities/friendship";
import { NetworkRow } from "./network-row";

interface NetworkTableProps {
  title: string;
  currentUserId: number;
  isLoading: boolean;
  items: Friendship[] | undefined;
}

export function NetworkTable({
  title,
  currentUserId,
  isLoading,
  items,
}: NetworkTableProps) {
  const t = useTranslations("friends");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl font-extrabold uppercase -tracking-[0.01em] text-black">
          {title}
        </h2>
        <span className="text-[11px] font-bold uppercase tracking-widest tabular-nums opacity-70">
          {items?.length ?? 0} {t("musicians")}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-black bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-black bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-widest">
          <div className="col-span-6">{t("columns.musician")}</div>
          <div className="col-span-4">{t("columns.status")}</div>
          <div className="col-span-2 text-right">{t("columns.actions")}</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm opacity-60">
            <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
          </div>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg border border-black bg-white">
              <Users className="size-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-black">
              {t("empty.friends")}
            </p>
            <p className="text-xs opacity-60">{t("empty.friendsHint")}</p>
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
