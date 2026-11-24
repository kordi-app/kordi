"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  getCorrectCount,
  getTotalScore,
  type QuizAnswerResult,
  type QuizGameState,
  type QuizResult as ServerQuizResult,
} from "@/entities/chord-quiz";
import { MonoCard } from "@/shared/ui/mono-card";
import { Button } from "@/shared/ui/button";
import { SectionHeader } from "@/shared/ui/section-header";
import { cn } from "@/shared/lib/utils";
import { QuizReviewRow } from "./quiz-review-row";

interface QuizResultProps {
  state: QuizGameState;
  /**
   * The server's verdict. When present it is what is shown — total, per-question
   * results — even where the local instant feedback disagreed. Until then the
   * local numbers are shown, dimmed, as provisional.
   */
  result?: ServerQuizResult;
  isSaving: boolean;
  saveFailed?: boolean;
  onRetrySave?: () => void;
  onRetry: () => void;
  onBackToSelect: () => void;
  /** the keyboard is muted: reviewing a miss shows it but doesn't play it */
  muted?: boolean;
}

export function QuizResult({
  state,
  result,
  isSaving,
  saveFailed = false,
  onRetrySave,
  onRetry,
  onBackToSelect,
  muted = false,
}: QuizResultProps) {
  const t = useTranslations("chordQuiz");
  /** the missed question opened for review */
  const [reviewing, setReviewing] = useState<number | null>(null);
  const judged = result !== undefined;
  const totalScore = result?.totalScore ?? getTotalScore(state.answers);
  const correctCount = result?.correctCount ?? getCorrectCount(state.answers);
  const incorrectCount = state.questions.length - correctCount;
  const rowResult = (i: number): { label: QuizAnswerResult; score: number } => {
    const local = state.answers[i];
    const server = result?.results[i];
    if (!server) return { label: local?.result ?? "timeout", score: local?.score ?? 0 };
    if (server.correct) return { label: "correct", score: server.score };
    return { label: local?.result === "timeout" ? "timeout" : "incorrect", score: 0 };
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 p-6">
      <SectionHeader as="h2" size="md">
        {t("result")}
      </SectionHeader>

      <div
        className={cn(
          "rounded-lg border border-border bg-primary px-10 py-6 text-center text-primary-foreground",
          !judged && "opacity-60",
        )}
      >
        <div className="font-heading text-4xl font-semibold tabular-nums">
          {totalScore}
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-widest opacity-70">
          / {state.maxTotalScore} {t("maxScore")}
        </div>
      </div>

      {judged ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-foreground tabular-nums">
          {result.improved ? t("newBest") : t("best", { best: result.best })} ·{" "}
          {t("rank", { rank: result.rank })}
        </p>
      ) : (
        <p className="text-xs opacity-60">{t("provisional")}</p>
      )}

      <div className="flex w-full gap-4">
        <StatBlock value={correctCount} label={t("correct")} />
        <StatBlock value={incorrectCount} label={t("incorrect")} />
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-border">
        {state.questions.map((q, i) => {
          const row = rowResult(i);
          return (
            <QuizReviewRow
              key={q.id}
              index={i}
              chordName={q.name}
              label={row.label}
              score={row.score}
              judged={judged}
              playedNotes={state.answers[i]?.notes ?? []}
              expanded={reviewing === i}
              onToggle={() => setReviewing((open) => (open === i ? null : i))}
              muted={muted}
            />
          );
        })}
      </div>
      {incorrectCount > 0 ? <p className="-mt-3 text-xs opacity-60">{t("reviewTip")}</p> : null}

      {isSaving && <p className="text-sm opacity-60">{t("saving")}</p>}
      {judged && (
        <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
          {t("saved")}
        </p>
      )}
      {saveFailed && (
        <div role="alert" className="flex items-center gap-3 text-sm">
          <span className="text-destructive">{t("saveError")}</span>
          {onRetrySave && (
            <Button size="sm" variant="outline" onClick={onRetrySave}>
              {t("retrySave")}
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button size="lg" onClick={onRetry}>
          {t("retry")}
        </Button>
        <Button variant="outline" size="lg" onClick={onBackToSelect}>
          {t("backToSelect")}
        </Button>
      </div>
    </div>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <MonoCard className="flex-1 px-4 py-3 text-center">
      <div className="font-heading text-2xl font-semibold tabular-nums">
        {value}
      </div>
      <div className="text-t1 font-semibold uppercase tracking-widest opacity-70">
        {label}
      </div>
    </MonoCard>
  );
}
