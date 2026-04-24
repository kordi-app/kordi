"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { Friendship } from "@/entities/friendship";

interface RequestsCardProps {
  title: string;
  count: number;
  isLoading: boolean;
  items: Friendship[] | undefined;
  emptyIcon: ReactNode;
  emptyLabel: string;
  renderItem: (f: Friendship) => ReactNode;
}

export function RequestsCard({
  title,
  count,
  isLoading,
  items,
  emptyIcon,
  emptyLabel,
  renderItem,
}: RequestsCardProps) {
  return (
    <div className="rounded-lg border border-black bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-bold uppercase text-black">
          {title}
        </h2>
        <span className="text-[11px] font-bold uppercase tracking-widest tabular-nums opacity-70">
          {count}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm opacity-60">
          <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg border border-black bg-white">
            {emptyIcon}
          </div>
          <p className="text-sm opacity-60">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="border-t border-black">
          {items.map((f) => (
            <li key={f.id}>{renderItem(f)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
