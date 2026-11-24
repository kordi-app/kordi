import { cookies } from "next/headers";
import { KordiLogo } from "@/shared/ui/illustrations/kordi-logo";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/ui/sidebar";
import { AppSidebar } from "@/widgets/app-sidebar";
import { AUTH_COOKIES } from "@/shared/config/auth";

export default async function RoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  // a session cookie is enough to tell guests from members here (the proxy renews it)
  const isSignedIn =
    cookieStore.has(AUTH_COOKIES.ACCESS_TOKEN) || cookieStore.has(AUTH_COOKIES.REFRESH_TOKEN);

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
    >
      <AppSidebar isSignedIn={isSignedIn} />
      <SidebarInset className="h-svh overflow-hidden bg-card">
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* No header on desktop: the sidebar carries its own collapse toggle.
              On mobile the sidebar is an off-screen sheet, so a slim bar keeps
              the way to open it (and the logo). */}
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 bg-card/90 px-3 backdrop-blur md:hidden">
            <SidebarTrigger className="size-9 text-foreground/70 hover:text-foreground" />
            <Link
              href={ROUTES.HOME}
              className="flex items-center gap-2 text-foreground"
            >
              <KordiLogo size={22} />
              <span className="text-base font-semibold -tracking-[0.02em]">
                Kordi
              </span>
            </Link>
          </header>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
