"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { NotebookPen } from "lucide-react";
import { reviewQueries } from "@/entities/chord-review";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { buttonVariants } from "@/shared/ui/button";

/** Entry to today's review, with how many chords are due (none shown while loading or on error). */
export function ReviewEntryLink() {
  const t = useTranslations("chordPractice");
  // one card is enough: the deck carries the total due count
  const { data } = useQuery(reviewQueries.deck(1));
  const due = data?.dueCount ?? 0;

  return (
    <Link
      href={ROUTES.CHORD_REVIEW}
      className={buttonVariants({ variant: due > 0 ? "default" : "outline", size: "sm" })}
    >
      <NotebookPen aria-hidden />
      {due > 0 ? t("reviewEntryDue", { count: due }) : t("reviewEntry")}
    </Link>
  );
}
