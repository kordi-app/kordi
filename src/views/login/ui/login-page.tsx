"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { KordiLogo } from "@/shared/ui/illustrations/kordi-logo";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { GoogleLoginButton } from "@/features/auth";

export function LoginPage() {
  const t = useTranslations("login");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href={ROUTES.HOME}
          className="mb-10 flex items-center gap-2.5 text-foreground"
        >
          <KordiLogo size={28} />
          <span className="text-xl font-semibold -tracking-[0.02em]">Kordi</span>
        </Link>

        <h1 className="text-headline-lg text-foreground">{t("title")}</h1>
        <p className="mt-2 text-body-md text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-8">
          <GoogleLoginButton label={t("googleLogin")} />
        </div>

        <Link
          href={ROUTES.PIANO}
          className="group mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("tryWithoutLogin")}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </main>
  );
}
