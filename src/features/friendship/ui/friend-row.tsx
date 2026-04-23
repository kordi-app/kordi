"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface FriendRowProps {
  avatar: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  accent?: boolean;
  dim?: boolean;
}

export function FriendRow({
  avatar,
  title,
  subtitle,
  actions,
  dim,
}: FriendRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-outline-variant px-1 py-4 last:border-b-0",
        dim && "opacity-70",
      )}
    >
      <div className="shrink-0">{avatar}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
