import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Shared Suspense fallback for all (routes) pages.
 * Streams the sidebar/header shell while the nested page fetches.
 */
export default async function Loading() {
  const t = await getTranslations("a11y");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Loader2
        className="size-6 animate-spin text-foreground opacity-60"
        role="status"
        aria-label={t("loading")}
      />
    </main>
  );
}
