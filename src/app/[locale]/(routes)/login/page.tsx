import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginPage } from "@/views/login";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: `${t("login")} | Kordi` };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const { next, error } = await searchParams;
  return (
    <LoginPage
      next={typeof next === "string" ? next : null}
      error={typeof error === "string" ? error : null}
    />
  );
}
