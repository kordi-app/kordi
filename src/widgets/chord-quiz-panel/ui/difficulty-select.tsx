"use client";

import { useTranslations } from "next-intl";
import type { QuizDifficulty } from "@/entities/chord-quiz";

interface DifficultySelectProps {
  onSelect: (difficulty: QuizDifficulty) => void;
  isLoading?: boolean;
}

const DIFFICULTIES: {
  value: QuizDifficulty;
  key: string;
}[] = [
  { value: "EASY", key: "easy" },
  { value: "MEDIUM", key: "medium" },
  { value: "HARD", key: "hard" },
];

export function DifficultySelect({
  onSelect,
  isLoading,
}: DifficultySelectProps) {
  const t = useTranslations("chordQuiz");

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h2 className="font-heading text-xl font-semibold uppercase tracking-tight text-foreground">
        {t("selectDifficulty")}
      </h2>
      <div className="grid w-full max-w-sm gap-3">
        {DIFFICULTIES.map(({ value, key }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            disabled={isLoading}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-all hover:bg-muted disabled:opacity-50"
          >
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-primary text-primary-foreground">
              <span className="font-heading text-lg font-semibold">
                {key.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-heading text-lg font-semibold -tracking-[0.01em]">
              {t(key)}
            </span>
          </button>
        ))}
      </div>
      {isLoading && <p className="text-sm opacity-60">{t("loading")}</p>}
    </div>
  );
}
