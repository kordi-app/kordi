"use client";

import { Component, type ReactNode } from "react";
import { FileMusic, KeyboardMusic, Piano } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";

/**
 * Keeps a world that can't run (no WebGL, a lost GPU context, a chunk that failed to
 * load) from taking the whole home page down: a plain 2D card with the practice pages.
 */
export class WorldErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    return this.state.failed ? <WorldFallback /> : this.props.children;
  }
}

const LINKS = [
  { href: ROUTES.PIANO, icon: Piano, labelKey: "piano" },
  { href: ROUTES.CHORD_PRACTICE, icon: KeyboardMusic, labelKey: "practice" },
  { href: ROUTES.SCORE, icon: FileMusic, labelKey: "score" },
] as const;

function WorldFallback() {
  const t = useTranslations();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/40 px-6 text-center">
      <h2 className="text-headline-md text-foreground">{t("errors.worldTitle")}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t("errors.worldDescription")}</p>
      <nav className="mt-4 flex flex-wrap justify-center gap-2">
        {LINKS.map(({ href, icon: Icon, labelKey }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Icon className="size-4" />
            {t(`sidebar.nav.${labelKey}`)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
