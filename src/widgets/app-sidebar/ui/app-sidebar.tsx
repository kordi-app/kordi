"use client";

import { PanelLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { KordiLogo } from "@/shared/ui/illustrations/kordi-logo";
import { Link, usePathname } from "@/shared/config/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui/sidebar";
import { NAV_GROUPS } from "../model/nav-config";

function MenuToggle() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Toggle Sidebar"
      className="relative z-10 flex h-10 w-full shrink-0 cursor-pointer items-center justify-end px-3 text-foreground transition-colors hover:bg-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&>*]:pointer-events-none"
    >
      <PanelLeftIcon
        className="size-4"
        style={{ pointerEvents: "none" }}
      />
    </button>
  );
}

export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0! [&>[data-sidebar=sidebar]]:bg-card"
    >
      <SidebarHeader className="h-14 shrink-0 justify-center border-b border-border px-4 group-data-[collapsible=icon]:px-0">
        <Link
          href="/"
          className="flex items-center gap-3 overflow-hidden text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
        >
          <KordiLogo size={26} />
          <span className="font-heading text-xl font-semibold -tracking-[0.02em] group-data-[collapsible=icon]:hidden">
            {t("home.brand")}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="border-r border-border bg-card">
        <MenuToggle />
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t(group.labelKey)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, icon: Icon, labelKey }) => {
                  const active = pathname === href;
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={t(labelKey)}
                        render={<Link href={href} />}
                        className="h-10 gap-3 rounded px-3 text-sm font-normal whitespace-nowrap text-muted-foreground hover:text-foreground data-[active=true]:bg-accent data-[active=true]:font-semibold data-[active=true]:text-foreground"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="whitespace-nowrap group-data-[collapsible=icon]:hidden">
                          {t(labelKey)}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
