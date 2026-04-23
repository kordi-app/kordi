"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import type { ScoreRecord, QuizDifficulty } from "@/entities/quiz";

const DIFFICULTIES: QuizDifficulty[] = ["EASY", "MEDIUM", "HARD"];

interface MyScoresPanelProps {
  scores: ScoreRecord[];
}

export function MyScoresPanel({ scores }: MyScoresPanelProps) {
  const t = useTranslations("me");
  const [selected, setSelected] = useState<QuizDifficulty>("EASY");

  const filtered = scores
    .filter((s) => s.difficulty === selected)
    .toSorted((a, b) => b.totalScore - a.totalScore);

  const best = filtered[0] ?? null;

  return (
    <div className="rounded-lg border border-black bg-white px-6 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="size-5 text-black" strokeWidth={1.75} />
        <h2 className="font-heading text-lg font-bold uppercase text-black">
          {t("quizScores")}
        </h2>
      </div>

      {/* Difficulty Tabs */}
      <div className="mb-6 flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setSelected(d)}
            className={`rounded-lg border border-black px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              selected === d
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-black/5"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Best Score */}
      {best && (
        <div className="mb-6 rounded-lg border border-black bg-black px-4 py-4 text-white">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest opacity-70">
            {t("bestScore")}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-black tabular-nums">
              {best.totalScore}
            </span>
            <span className="text-sm opacity-70">
              {best.correctCount}/{best.totalCount}
            </span>
          </div>
        </div>
      )}

      {/* Score List */}
      {filtered.length === 0 ? (
        <p className="text-sm opacity-60">{t("noScores")}</p>
      ) : (
        <div className="flex flex-col">
          {filtered.map((score) => (
            <div
              key={score.id}
              className="flex items-center justify-between border-b border-black py-3 last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold tabular-nums text-black">
                  {score.totalScore}
                </span>
                <span className="text-xs opacity-60 tabular-nums">
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
    </div>
  );
}
