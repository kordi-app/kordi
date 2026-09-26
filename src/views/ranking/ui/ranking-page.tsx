import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { RankingBoard } from "@/widgets/ranking-board";
import { SectionHeader } from "@/shared/ui/section-header";

export function RankingPage() {
  const t = useTranslations("ranking");

  return (
    <main className="px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <Trophy className="size-6 text-foreground" aria-hidden />
          <SectionHeader as="h1" size="lg">
            {t("leaderboard")}
          </SectionHeader>
        </header>
        <RankingBoard />
      </div>
    </main>
  );
}
