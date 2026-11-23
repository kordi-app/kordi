"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";

interface QuizProgressProps {
  currentIndex: number;
  totalCount: number;
  timeLeft: number;
  /** the question's full time (from the quiz session) */
  timePerQuestionMs: number;
  totalScore: number;
}

export function QuizProgress({
  currentIndex,
  totalCount,
  timeLeft,
  timePerQuestionMs,
  totalScore,
}: QuizProgressProps) {
  const t = useTranslations("chordQuiz");
  const seconds = Math.ceil(timeLeft / 1000);
  const progress = timePerQuestionMs > 0 ? (timeLeft / timePerQuestionMs) * 100 : 0;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-3">
      {/* Question number + Time + Score */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest opacity-70 tabular-nums">
          {t("question")} {currentIndex + 1}/{totalCount}
        </span>
        <span
          className={cn(
            "font-heading text-4xl font-semibold tabular-nums leading-none text-foreground",
            seconds <= 2 && "animate-pulse",
          )}
        >
          {seconds}
        </span>

        <span className="text-xs font-semibold uppercase tracking-widest text-foreground tabular-nums">
          {t("totalScore")}: {totalScore}
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-card">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
