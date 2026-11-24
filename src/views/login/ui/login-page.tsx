"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { GoogleLoginButton } from "@/features/auth";
import { safeNextPath } from "@/shared/lib/safe-next-path";

const ERROR_MESSAGES = {
  login_failed: "errorLoginFailed",
  session_expired: "errorSessionExpired",
} as const;

export function LoginPage({ next, error }: { next?: string | null; error?: string | null }) {
  const t = useTranslations("login");
  const returnTo = safeNextPath(next);
  const errorKey = error
    ? (ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES] ?? "errorGeneric")
    : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-headline-lg text-foreground">{t("title")}</h1>
        <p className="mt-2 text-body-md text-muted-foreground">{t("subtitle")}</p>

        {errorKey ? (
          <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t(errorKey)}
          </p>
        ) : null}

        <div className="mt-8">
          <GoogleLoginButton label={t("googleLogin")} next={returnTo} />
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
