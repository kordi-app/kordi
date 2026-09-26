"use client";

import { useTranslations } from "next-intl";
import { KordiLogo } from "@/shared/ui/illustrations/kordi-logo";
import { GoogleLoginButton } from "@/features/auth";
import { MonoCard } from "@/shared/ui/mono-card";

export function LoginPage() {
  const t = useTranslations("login");

  return (
    <div className="flex flex-1 items-center justify-center bg-card px-4 text-foreground">
      <div style={{ width: "100%", maxWidth: "24rem" }}>
        <MonoCard className="p-10 text-center">
          <div className="mb-6 flex justify-center">
            <KordiLogo size={64} />
          </div>
          <h1 className="font-heading mb-2 text-3xl font-semibold -tracking-[0.03em]">
            Kordi
          </h1>
          <p className="mb-8 text-sm leading-relaxed">{t("subtitle")}</p>
          <GoogleLoginButton label={t("googleLogin")} />
        </MonoCard>
        <p className="mt-6 text-center text-[11px] font-semibold uppercase opacity-60">
          {t("tagline")}
        </p>
      </div>
    </div>
  );
}
