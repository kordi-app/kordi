import { useTranslations } from "next-intl";
import { GoogleLoginButton } from "@/features/auth";

export function LoginPage() {
  const t = useTranslations("login");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="glass w-full max-w-sm rounded-2xl p-8 text-center">
        <h1 className="neon-text mb-2 text-3xl font-bold">Kordi</h1>
        <p className="mb-8 text-sm text-muted-foreground">{t("subtitle")}</p>
        <GoogleLoginButton label={t("googleLogin")} />
      </div>
    </div>
  );
}
