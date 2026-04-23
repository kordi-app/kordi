"use client";

import { useTranslations } from "next-intl";
import type { QuizGameState } from "@/entities/quiz";

interface QuizResultProps {
  state: QuizGameState;
  isSaving: boolean;
  isSaved: boolean;
  onRetry: () => void;
  onBackToSelect: () => void;
}

export function QuizResult({
  state,
  isSaving,
  isSaved,
  onRetry,
  onBackToSelect,
}: QuizResultProps) {
  const t = useTranslations("chordQuiz");
  const correctCount = state.answers.filter((a) => a === "correct").length;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 p-6">
      <h2 className="font-heading text-2xl font-extrabold uppercase -tracking-[0.02em] text-black">
        {t("result")}
      </h2>

      {/* Total score */}
      <div className="rounded-lg border border-black bg-black px-10 py-6 text-center text-white">
        <div className="font-heading text-5xl font-black tabular-nums">
          {state.totalScore}
        </div>
        <div className="mt-1 text-xs font-bold uppercase tracking-widest opacity-70">
          / 1000 {t("maxScore")}
        </div>
      </div>

      {/* Stats */}
      <div className="flex w-full gap-4">
        <div className="flex-1 rounded-lg border border-black bg-white px-4 py-3 text-center">
          <div className="font-heading text-2xl font-black tabular-nums">
            {correctCount}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest opacity-70">
            {t("correct")}
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-black bg-white px-4 py-3 text-center">
          <div className="font-heading text-2xl font-black tabular-nums">
            {state.questions.length - correctCount}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest opacity-70">
            {t("incorrect")}
          </div>
        </div>
      </div>

      {/* Per-question results */}
      <div className="w-full overflow-hidden rounded-lg border border-black">
        {state.questions.map((q, i) => (
          <div
            key={q.id}
            className="flex items-center justify-between border-b border-black px-4 py-2 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums opacity-60">{i + 1}</span>
              <span className="font-bold text-black">{q.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                {t(state.answers[i] ?? "timeout")}
              </span>
              <span className="font-heading font-bold tabular-nums text-black">
                {state.scores[i] ?? 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Save status */}
      {isSaving && <p className="text-sm opacity-60">{t("saving")}</p>}
      {isSaved && (
        <p className="text-xs font-bold uppercase tracking-widest text-black">
          {t("saved")}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="rounded-lg border border-black bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white hover:text-black"
        >
          {t("retry")}
        </button>
        <button
          onClick={onBackToSelect}
          className="rounded-lg border border-black bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-all hover:bg-black hover:text-white"
        >
          {t("backToSelect")}
        </button>
      </div>
    </div>
  );
}
