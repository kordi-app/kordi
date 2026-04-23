"use client";

import { useTranslations } from "next-intl";
import { Piano } from "lucide-react";
import { GoogleLoginButton } from "@/features/auth";

export function LoginPage() {
  const t = useTranslations("login");

  return (
    <div
      className="flex min-h-screen bg-white px-4 text-black"
      style={{ width: "100%", alignItems: "center", justifyContent: "center" }}
    >
      <div style={{ width: "100%", maxWidth: "24rem" }}>
        <div className="rounded-lg border border-black bg-white p-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-lg border border-black bg-black text-white">
              <Piano className="size-8" strokeWidth={1.75} />
            </div>
          </div>
          <h1 className="font-heading mb-2 text-4xl font-black uppercase tracking-tighter">
            Kordi
          </h1>
          <p className="mb-8 text-sm leading-relaxed">{t("subtitle")}</p>
          <GoogleLoginButton label={t("googleLogin")} />
        </div>
        <p className="mt-6 text-center text-[11px] font-bold uppercase opacity-60">
          {t("tagline")}
        </p>
      </div>
    </div>
  );
}
