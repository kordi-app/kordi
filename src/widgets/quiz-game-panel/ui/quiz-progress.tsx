"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";

interface QuizProgressProps {
  currentIndex: number;
  totalCount: number;
  timeLeft: number;
  totalScore: number;
}

export function QuizProgress({
  currentIndex,
  totalCount,
  timeLeft,
  totalScore,
}: QuizProgressProps) {
  const t = useTranslations("chordQuiz");
  const seconds = Math.ceil(timeLeft / 1000);
  const progress = (timeLeft / 10000) * 100;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-3">
      {/* Question number + Time + Score */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest opacity-70 tabular-nums">
          {t("question")} {currentIndex + 1}/{totalCount}
        </span>
        <span
          className={cn(
            "font-heading text-5xl font-black tabular-nums leading-none text-black",
            seconds <= 2 && "animate-pulse",
          )}
        >
          {seconds}
        </span>

        <span className="text-xs font-bold uppercase tracking-widest text-black tabular-nums">
          {t("totalScore")}: {totalScore}
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-2 w-full overflow-hidden rounded-full border border-black bg-white">
        <div
          className="h-full bg-black transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
