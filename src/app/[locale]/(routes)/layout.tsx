import { cookies } from "next/headers";
import { CircleUserRound } from "lucide-react";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/ui/sidebar";
import { AppSidebar } from "@/widgets/app-sidebar";

export default async function RoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar": "#ffffff",
          "--sidebar-foreground": "#000000",
          "--sidebar-primary": "#000000",
          "--sidebar-primary-foreground": "#ffffff",
          "--sidebar-accent": "#f4f4f4",
          "--sidebar-accent-foreground": "#000000",
          "--sidebar-border": "#000000",
          "--sidebar-ring": "#000000",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="bg-white text-black">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black bg-white px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-black hover:bg-black hover:text-white" />
          </div>
          <Link
            href={ROUTES.ME}
            className="rounded-lg p-2 transition-colors hover:bg-black hover:text-white"
            aria-label="Profile"
          >
            <CircleUserRound className="size-5" strokeWidth={1.75} />
          </Link>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
