"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import type { AnswerFeedback } from "@/shared/lib/music";


interface ChordPromptProps {
  ns: string;
  chordName: string | null;
  nextChordName?: string | null;
  showNext?: boolean;
  feedbackState: AnswerFeedback;
  /** a line over the chord, e.g. the key and the chord's numeral in a progression */
  caption?: string | null;
  /**
   * the chord's tones, spelled, shown under it as a hint (needs a `hint` message in `ns`).
   * null keeps the line's space while no hint is showing; leave it out where there are no hints.
   */
  hintNotes?: readonly string[] | null;
}

export function ChordPrompt({
  ns,
  chordName,
  nextChordName = null,
  showNext = false,
  feedbackState,
  caption = null,
  hintNotes,
}: ChordPromptProps) {
  const t = useTranslations(ns);
  const isInvert = feedbackState === "correct";

  return (
    <div className="flex flex-col items-center gap-3">
      {caption ? (
        <div className="text-xs font-semibold uppercase tracking-widest opacity-60">{caption}</div>
      ) : null}
      <div
        className={cn(
          "flex h-28 min-w-48 items-center justify-center rounded-lg border border-border px-8 transition-all duration-200",
          isInvert ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
          feedbackState === "incorrect" && "ring-2 ring-ring ring-offset-2",
          feedbackState === "timeout" && "opacity-60",
        )}
      >
        <span className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
          {chordName ?? "-"}
        </span>
      </div>

      {hintNotes !== undefined ? (
        <div aria-live="polite" className="min-h-5 text-sm text-foreground">
          {hintNotes && hintNotes.length > 0 ? (
            <span>
              <span className="text-xs font-semibold uppercase tracking-widest opacity-60">{t("hint")}</span>{" "}
              <span className="font-semibold tracking-wide">{hintNotes.join(" · ")}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {showNext && nextChordName && (
        <div className="text-xs font-semibold uppercase tracking-widest opacity-60">
          {t("upNext")}:{" "}
          <span className="font-semibold text-foreground">{nextChordName}</span>
        </div>
      )}
    </div>
  );
}
