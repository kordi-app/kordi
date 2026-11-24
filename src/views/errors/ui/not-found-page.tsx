import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { buttonVariants } from "@/shared/ui/button";

export async function NotFoundPage() {
  const t = await getTranslations("errors");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-headline-md text-foreground">{t("notFoundTitle")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("notFoundDescription")}</p>
      <Link
        href={ROUTES.HOME}
        className={buttonVariants({ variant: "outline", className: "mt-4" })}
      >
        {t("home")}
      </Link>
    </main>
  );
}
