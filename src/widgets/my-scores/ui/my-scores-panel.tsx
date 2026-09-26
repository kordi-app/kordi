"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import type { ScoreRecord, QuizDifficulty } from "@/entities/chord-quiz";
import { MonoCard } from "@/shared/ui/mono-card";
import { MonoPill } from "@/shared/ui/mono-button";
import { SectionHeader } from "@/shared/ui/section-header";

const DIFFICULTIES: QuizDifficulty[] = ["EASY", "MEDIUM", "HARD"];

interface MyScoresPanelProps {
  scores: ScoreRecord[];
}

export function MyScoresPanel({ scores }: MyScoresPanelProps) {
  const t = useTranslations("me");
  const [selected, setSelected] = useState<QuizDifficulty>("EASY");

  const filtered = useMemo(
    () =>
      scores
        .filter((s) => s.difficulty === selected)
        .toSorted((a, b) => b.totalScore - a.totalScore),
    [scores, selected],
  );

  const best = filtered[0] ?? null;

  return (
    <MonoCard className="px-6 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="size-5 text-foreground" aria-hidden />
        <SectionHeader as="h2" size="sm">
          {t("quizScores")}
        </SectionHeader>
      </div>

      <div className="mb-6 flex gap-2">
        {DIFFICULTIES.map((d) => (
          <MonoPill
            key={d}
            active={selected === d}
            onClick={() => setSelected(d)}
          >
            {d}
          </MonoPill>
        ))}
      </div>

      {best && (
        <div className="mb-6 rounded-lg border border-border bg-primary px-4 py-4 text-primary-foreground">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest opacity-70">
            {t("bestScore")}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-semibold tabular-nums">
              {best.totalScore}
            </span>
            <span className="text-sm opacity-70">
              {best.correctCount}/{best.totalCount}
            </span>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm opacity-60">{t("noScores")}</p>
      ) : (
        <div className="flex flex-col">
          {filtered.map((score) => (
            <div
              key={score.id}
              className="flex items-center justify-between border-b border-border py-3 last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {score.totalScore}
                </span>
                <span className="text-xs tabular-nums opacity-60">
                  {score.correctCount}/{score.totalCount}
                </span>
              </div>
              <span className="text-xs opacity-60">
                {new Date(score.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </MonoCard>
  );
}
