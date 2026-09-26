import { cookies } from "next/headers";
import { CircleUserRound } from "lucide-react";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { SidebarInset, SidebarProvider } from "@/shared/ui/sidebar";
import { AppSidebar } from "@/widgets/app-sidebar";

export default async function RoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    // Sidebar tokens come from globals.css — no inline override, or the
    // design system cannot reach the sidebar at all.
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset
        className="overflow-hidden bg-card text-foreground"
        style={{ height: "100svh" }}
      >
        <div className="flex flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border bg-card px-4 md:px-6">
            <Link
              href={ROUTES.ME}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
              aria-label="Profile"
            >
              <CircleUserRound className="size-5" />
            </Link>
          </header>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
