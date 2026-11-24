import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type MetaKey = Parameters<Awaited<ReturnType<typeof getTranslations<"meta">>>>[0];

/**
 * `generateMetadata` for a page, in the visitor's language: "{title} | Kordi" and an
 * optional description, both from the `meta` messages.
 */
export function localizedMetadata(titleKey: MetaKey, descriptionKey?: MetaKey) {
  return async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "meta" });
    return {
      title: `${t(titleKey)} | Kordi`,
      ...(descriptionKey ? { description: t(descriptionKey) } : {}),
    };
  };
}
