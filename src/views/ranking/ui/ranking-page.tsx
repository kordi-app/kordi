import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { RankingBoard } from "@/widgets/ranking-board";

export function RankingPage() {
  const t = useTranslations("ranking");

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <Trophy className="size-6 text-black" strokeWidth={1.75} />
          <h1 className="font-heading text-[28px] font-extrabold uppercase -tracking-[0.02em] text-black">
            {t("leaderboard")}
          </h1>
        </header>
        <RankingBoard />
      </div>
    </main>
  );
}
