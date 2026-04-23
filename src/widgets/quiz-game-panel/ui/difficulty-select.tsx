"use client";

import { useTranslations } from "next-intl";
import type { QuizDifficulty } from "@/entities/quiz";

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
    <div className="flex flex-col items-center gap-6">
      <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight text-black">
        {t("selectDifficulty")}
      </h2>
      <div className="grid w-full max-w-sm gap-3">
        {DIFFICULTIES.map(({ value, key }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            disabled={isLoading}
            className="group flex items-center gap-4 rounded-lg border border-black bg-white p-5 transition-all hover:bg-black hover:text-white disabled:opacity-50"
          >
            <div className="flex size-10 items-center justify-center rounded-lg border border-black bg-black text-white transition-all group-hover:bg-white group-hover:text-black">
              <span className="font-heading text-lg font-black">
                {key.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-heading text-lg font-bold uppercase tracking-wider">
              {t(key)}
            </span>
          </button>
        ))}
      </div>
      {isLoading && <p className="text-sm opacity-60">{t("loading")}</p>}
    </div>
  );
}
