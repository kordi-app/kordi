import { useTranslations } from "next-intl";
import { Shirt } from "lucide-react";
import { CharacterEditor } from "@/features/character-customize";
import { SectionHeader } from "@/shared/ui/section-header";

export function CharacterPage() {
  const t = useTranslations("character");
  return (
    <main className="px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <Shirt className="size-6 text-foreground" aria-hidden />
          <SectionHeader as="h1" size="lg">
            {t("title")}
          </SectionHeader>
        </header>
        <CharacterEditor />
      </div>
    </main>
  );
}
