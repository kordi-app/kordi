"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary, Suspense } from "@suspensive/react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { rankingQueries, type RankingDifficulty } from "@/entities/ranking";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar";
import { MonoPill } from "@/shared/ui/mono-button";
import { LoadingState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/utils";

const DIFFICULTIES: RankingDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export function RankingBoard() {
  const t = useTranslations("ranking");
  const [difficulty, setDifficulty] = useState<RankingDifficulty>("EASY");

  return (
    <div className="w-full">
      <div className="mb-6 flex gap-2">
        {DIFFICULTIES.map((d) => (
          <MonoPill
            key={d}
            active={difficulty === d}
            onClick={() => setDifficulty(d)}
          >
            {t(d.toLowerCase())}
          </MonoPill>
        ))}
      </div>

      <ErrorBoundary
        fallback={() => (
          <div className="py-12 text-center text-sm opacity-60">
            {t("empty")}
          </div>
        )}
      >
        <Suspense fallback={<LoadingState label={t("loading")} />}>
          <RankingList difficulty={difficulty} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function RankingList({ difficulty }: { difficulty: RankingDifficulty }) {
  const t = useTranslations("ranking");
  const { data: rankings } = useSuspenseQuery(rankingQueries.list(difficulty));

  if (rankings.length === 0) {
    return <p className="py-12 text-center text-sm opacity-60">{t("empty")}</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-black bg-white">
      {rankings.map((entry, i) => {
        const accuracy =
          entry.totalCount > 0
            ? Math.round((entry.correctCount / entry.totalCount) * 100)
            : 0;
        const isTopThree = i < 3;

        return (
          <div
            key={`${entry.nickname}-${i}`}
            className="flex items-center gap-4 border-b border-black px-4 py-3 last:border-b-0"
          >
            <div className="flex w-8 shrink-0 items-center justify-center">
              {isTopThree ? (
                <Trophy className="size-5 text-black" strokeWidth={1.75} />
              ) : (
                <span className="font-heading text-sm font-black tabular-nums text-black">
                  {i + 1}
                </span>
              )}
            </div>

            <Avatar size="sm" className="ring-1 ring-black">
              <AvatarImage
                src={entry.profileImageUrl ?? undefined}
                alt={entry.nickname}
              />
              <AvatarFallback className="bg-black text-xs font-bold text-white">
                {entry.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <span
              className={cn(
                "flex-1 text-sm",
                isTopThree ? "font-bold text-black" : "text-black opacity-80",
              )}
            >
              {entry.nickname}
            </span>

            <span className="text-xs tabular-nums opacity-60">{accuracy}%</span>

            <span
              className={cn(
                "w-16 text-right font-heading text-sm tabular-nums",
                i === 0 ? "font-black" : "font-bold",
              )}
            >
              {entry.totalScore}
            </span>
          </div>
        );
      })}
    </div>
  );
}
