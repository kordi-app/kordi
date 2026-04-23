"use client";

import { useTranslations } from "next-intl";
import { KordiMascot } from "@/shared/ui/illustrations/kordi-mascot";
import { GoogleLoginButton } from "@/features/auth";

export function LoginPage() {
  const t = useTranslations("login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <KordiMascot size="lg" />
        </div>
        <h1 className="mb-1 text-3xl font-[590] tracking-tight text-foreground">Kordi</h1>
        <p className="mb-10 text-sm text-muted-foreground">{t("subtitle")}</p>
        <GoogleLoginButton label={t("googleLogin")} />
      </div>
    </div>
  );
}
