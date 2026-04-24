import { useTranslations } from "next-intl";
import { Dumbbell, HelpCircle, ArrowRight } from "lucide-react";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { PianoKeysIllustration } from "./piano-keys-illustration";
import { ChordDiagramCmaj7 } from "./chord-diagram-cmaj7";
import { QuickAccessCard } from "./quick-access-card";

export function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Hero */}
        <section className="grid grid-cols-1 items-center gap-8 rounded-lg border border-black bg-white p-8 md:grid-cols-2 md:gap-10 md:p-10">
          <div className="min-w-0 space-y-5">
            <h1 className="font-heading text-[26px] font-extrabold uppercase leading-[1.15] -tracking-[0.02em] md:text-[32px]">
              {t("hero.title")}
            </h1>
            <p className="text-base leading-relaxed md:text-lg">
              {t("hero.subtitle")}
            </p>
            <Link href={ROUTES.CHORD_PRACTICE} className="inline-block">
              <button className="rounded-lg border border-black bg-black px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white hover:text-black">
                {t("hero.cta")}
              </button>
            </Link>
          </div>
          <div className="flex min-w-0 justify-center md:justify-end">
            <div className="flex h-56 w-full max-w-md items-center justify-center overflow-hidden rounded-lg border border-black bg-white md:h-64">
              <PianoKeysIllustration />
            </div>
          </div>
        </section>

        {/* 12-col split */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-8">
            <QuickAccessCard
              href={ROUTES.CHORD_PRACTICE}
              icon={Dumbbell}
              title={t("card.practice.title")}
              desc={t("card.practice.desc")}
              cta={t("card.practice.cta")}
            />
            <QuickAccessCard
              href={ROUTES.CHORD_QUIZ}
              icon={HelpCircle}
              title={t("card.quiz.title")}
              desc={t("card.quiz.desc")}
              cta={t("card.quiz.cta")}
            />
          </div>

          <aside className="flex flex-col gap-6 md:col-span-4">
            <div className="rounded-lg border border-black p-4">
              <h3 className="mb-2 border-b border-black pb-1 text-xs font-bold uppercase tracking-widest">
                {t("daily.title")}
              </h3>
              <div className="space-y-2 py-3 text-center">
                <div className="font-heading text-[32px] font-black leading-tight">
                  Cmaj7
                </div>
                <p className="text-sm">{t("daily.subtitle")}</p>
                <div className="mt-2 flex h-24 items-center justify-center overflow-hidden rounded-lg border border-black bg-white">
                  <ChordDiagramCmaj7 />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-black p-4">
              <h3 className="mb-2 border-b border-black pb-1 text-xs font-bold uppercase tracking-widest">
                {t("activity.title")}
              </h3>
              <ul className="space-y-1">
                <li className="flex items-center justify-between border-b border-black py-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="size-4" strokeWidth={1.75} />
                    <span className="text-sm">{t("activity.item1")}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">85%</span>
                </li>
                <li className="flex items-center justify-between border-b border-black py-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="size-4" strokeWidth={1.75} />
                    <span className="text-sm">{t("activity.item2")}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">1,200</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
