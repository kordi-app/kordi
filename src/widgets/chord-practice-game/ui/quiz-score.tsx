"use client";

import { useTranslations } from "next-intl";
import type { QuizState } from "@/entities/chord-practice";

interface QuizScoreProps {
  state: QuizState;
}

export function QuizScore({ state }: QuizScoreProps) {
  const t = useTranslations("chordPractice");
  const accuracy =
    state.totalAttempted > 0
      ? Math.round((state.totalCorrect / state.totalAttempted) * 100)
      : 0;

  return (
    <div className="flex items-center gap-6 rounded-lg border border-border bg-card px-6 py-3">
      <Stat value={state.score} label={t("score")} accent />
      <Stat value={state.streak} label={t("streak")} />
      <Stat value={state.bestStreak} label={t("best")} />
      <Stat value={`${accuracy}%`} label={t("accuracy")} />
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-16 text-center">
      <div
        className={`font-heading text-2xl font-semibold tabular-nums ${accent ? "text-foreground" : "text-foreground opacity-70"}`}
      >
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-widest opacity-60">
        {label}
      </div>
    </div>
  );
}
