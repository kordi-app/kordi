"use client";

import { User } from "lucide-react";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
}

export function AppHeader({ title = "Kordi", showBack = false }: AppHeaderProps) {
  return (
    <div className="flex w-full max-w-4xl items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {showBack && (
          <Link
            href={ROUTES.HOME}
            className="glass glass-hover rounded-lg p-1.5 text-muted-foreground transition-all duration-200 hover:text-foreground"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
        )}
        <h1 className="neon-text text-xl font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={ROUTES.ME}
          className="glass glass-hover rounded-lg p-1.5 text-muted-foreground transition-all duration-200 hover:text-foreground"
        >
          <User className="size-4" strokeWidth={1.5} />
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
