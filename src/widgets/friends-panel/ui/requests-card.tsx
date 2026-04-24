"use client";

import type { ReactNode } from "react";
import type { Friendship } from "@/entities/friendship";
import { MonoCard } from "@/shared/ui/mono-card";
import { SectionHeader } from "@/shared/ui/section-header";
import { EmptyState } from "@/shared/ui/empty-state";

interface RequestsCardProps {
  title: string;
  items: Friendship[];
  emptyIcon: ReactNode;
  emptyLabel: string;
  renderItem: (f: Friendship) => ReactNode;
}

export function RequestsCard({
  title,
  items,
  emptyIcon,
  emptyLabel,
  renderItem,
}: RequestsCardProps) {
  return (
    <MonoCard className="p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <SectionHeader size="sm">{title}</SectionHeader>
        <span className="text-[11px] font-bold uppercase tracking-widest tabular-nums opacity-70">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={emptyIcon} label={emptyLabel} />
      ) : (
        <ul className="border-t border-black">
          {items.map((f) => (
            <li key={f.id}>{renderItem(f)}</li>
          ))}
        </ul>
      )}
    </MonoCard>
  );
}
