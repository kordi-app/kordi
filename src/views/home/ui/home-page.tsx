import { useTranslations } from "next-intl";
import { Dumbbell, HelpCircle } from "lucide-react";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { MonoCard } from "@/shared/ui/mono-card";
import { MonoButton } from "@/shared/ui/mono-button";
import { SectionHeader } from "@/shared/ui/section-header";
import { ChordDiagramCmaj7 } from "./chord-diagram-cmaj7";
import { QuickAccessCard } from "./quick-access-card";

export function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="px-6 py-10 md:px-8 md:py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <section className="flex flex-col items-center gap-5 text-center">
          <SectionHeader as="h1" size="xl">
            {t("hero.title")}
          </SectionHeader>
          <Link href={ROUTES.CHORD_PRACTICE}>
            <MonoButton variant="solid" size="md">
              {t("hero.cta")}
            </MonoButton>
          </Link>
        </section>

        {/* The two entry cards share a row and match each other. The chord card
            sits in its own row — mixing it in stretched these two to its height
            and left their single line floating in the middle. */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <QuickAccessCard
            href={ROUTES.CHORD_PRACTICE}
            icon={Dumbbell}
            title={t("card.practice.title")}
          />
          <QuickAccessCard
            href={ROUTES.CHORD_QUIZ}
            icon={HelpCircle}
            title={t("card.quiz.title")}
          />
        </section>

        <MonoCard className="flex items-center gap-5 p-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("daily.title")}
            </h2>
            <div className="font-heading mt-1 text-2xl font-semibold -tracking-[0.02em]">
              Cmaj7
            </div>
          </div>
          <div className="h-14 w-40 shrink-0">
            <ChordDiagramCmaj7 />
          </div>
        </MonoCard>
      </div>
    </main>
  );
}
