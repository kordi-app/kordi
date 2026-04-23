"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { rankingQueries, type RankingDifficulty } from "@/entities/ranking";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib/utils";

const DIFFICULTIES: RankingDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export function RankingBoard() {
  const t = useTranslations("ranking");
  const [difficulty, setDifficulty] = useState<RankingDifficulty>("EASY");

  const { data: rankings, isLoading } = useQuery(rankingQueries.list(difficulty));

  return (
    <div className="w-full">
      {/* Difficulty Tabs */}
      <div className="mb-6 flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={cn(
              "rounded-lg border border-black px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
              difficulty === d
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-black/5",
            )}
          >
            {t(d.toLowerCase())}
          </button>
        ))}
      </div>

      {/* Ranking List */}
      <div className="overflow-hidden rounded-lg border border-black bg-white">
        {isLoading && (
          <p className="py-12 text-center text-sm opacity-60">{t("loading")}</p>
        )}

        {rankings && rankings.length === 0 && (
          <p className="py-12 text-center text-sm opacity-60">{t("empty")}</p>
        )}

        {rankings?.map((entry, i) => {
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
              {/* Rank */}
              <div className="flex w-8 shrink-0 items-center justify-center">
                {isTopThree ? (
                  <Trophy className="size-5 text-black" strokeWidth={1.75} />
                ) : (
                  <span className="font-heading text-sm font-black tabular-nums text-black">
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar size="sm" className="ring-1 ring-black">
                <AvatarImage
                  src={entry.profileImageUrl ?? undefined}
                  alt={entry.nickname}
                />
                <AvatarFallback className="bg-black text-xs font-bold text-white">
                  {entry.nickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name */}
              <span
                className={cn(
                  "flex-1 text-sm",
                  isTopThree ? "font-bold text-black" : "text-black opacity-80",
                )}
              >
                {entry.nickname}
              </span>

              {/* Accuracy */}
              <span className="text-xs tabular-nums opacity-60">
                {accuracy}%
              </span>

              {/* Score */}
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
    </div>
  );
}
