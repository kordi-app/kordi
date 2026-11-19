import { useTranslations } from "next-intl";
import { PianoWorld } from "@/widgets/piano-world";

/** Home is the walkable keyboard, filling everything below the app header. */
export function HomePage() {
  const t = useTranslations("home.world");

  return (
    <main className="h-[calc(100svh-3.5rem)] min-h-[420px] w-full">
      <PianoWorld
        copy={{
          title: t("title"),
          hint: t("hint"),
          soundOff: t("soundOff"),
          soundLoading: t("soundLoading"),
          soundOn: t("soundOn"),
        }}
      />
    </main>
  );
}
