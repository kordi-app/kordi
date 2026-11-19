import { useTranslations } from "next-intl";
import {
  ArrowRight,
  KeyboardMusic,
  Piano,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/shared/config/i18n/navigation";
import { PianoWorld } from "@/widgets/piano-world";
import { ROUTES } from "@/shared/config/routes";
import { getDailyChord } from "../model/daily-chord";
import { ChordKeyboard } from "./chord-keyboard";

const MODES: {
  href: string;
  icon: LucideIcon;
  key: "freePlay" | "practice" | "quiz";
}[] = [
  { href: ROUTES.PIANO, icon: Piano, key: "freePlay" },
  { href: ROUTES.CHORD_PRACTICE, icon: KeyboardMusic, key: "practice" },
  { href: ROUTES.CHORD_QUIZ, icon: Timer, key: "quiz" },
];

export function HomePage() {
  const t = useTranslations("home");
  const daily = getDailyChord();

  return (
    <main className="px-4 pb-16 pt-2 md:px-8">
      {/* Kordi on a walkable keyboard — the page's front door is something to play with */}
      <section className="mx-auto h-[min(68svh,640px)] min-h-[420px] max-w-6xl overflow-hidden rounded-2xl border border-border">
        <PianoWorld
          copy={{
            title: t("world.title"),
            hint: t("world.hint"),
            soundOff: t("world.soundOff"),
            soundLoading: t("world.soundLoading"),
            soundOn: t("world.soundOn"),
          }}
        />
      </section>

      <div className="mx-auto mt-12 max-w-3xl">
        <p className="text-body-lg text-muted-foreground">{t("hero.description")}</p>

        {/* The daily chord is the one thing on this page that changes — so it
            gets the space, and shows the actual keys instead of a name alone. */}
        <section className="mt-8 rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("daily.title")}</p>
              <p className="mt-1 text-5xl font-semibold -tracking-[0.03em] text-foreground">
                {daily.name}
              </p>
              <p className="mt-2 text-body-md text-muted-foreground">
                {t(`daily.quality.${daily.qualityKey}`)}
                <span className="mx-2 opacity-40">·</span>
                <span className="text-foreground">
                  {daily.tones.map((tone) => tone.label).join(" – ")}
                </span>
              </p>
              <Link
                href={ROUTES.PIANO}
                className="btn-inset mt-6 inline-flex h-9 items-center gap-1.5 px-4 text-sm font-medium"
              >
                {t("daily.cta")}
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="w-full max-w-[320px] shrink-0 md:w-[300px]">
              <ChordKeyboard
                positions={daily.tones.map((tone) => tone.position)}
                label={`${daily.name}: ${daily.tones.map((tone) => tone.label).join(", ")}`}
              />
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("modes.title")}
          </h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {MODES.map(({ href, icon: Icon, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted"
                >
                  <Icon className="size-5 shrink-0 text-foreground/70" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-foreground">
                      {t(`modes.${key}.title`)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t(`modes.${key}.description`)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
