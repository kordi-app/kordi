"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";
import { buttonVariants } from "@/shared/ui/button-variants";

/** Fallback for a page that threw while rendering: say so, and offer a retry or the way home. */
export function RouteErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-headline-md text-foreground">{t("title")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("description")}</p>
      <div className="mt-4 flex gap-2">
        <Button onClick={retry}>{t("retry")}</Button>
        <Link href={ROUTES.HOME} className={buttonVariants({ variant: "outline" })}>
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
