"use client";

import { Piano } from "lucide-react";
import { useTranslations } from "next-intl";
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
} from "@/shared/ui/sidebar";
import { NAV_GROUPS } from "../model/nav-config";

export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="[&>[data-sidebar=sidebar]]:bg-white [&_[data-slot=sidebar-container]]:border-r [&_[data-slot=sidebar-container]]:border-black"
    >
      <SidebarHeader className="h-14 shrink-0 justify-center border-b border-black px-4">
        <Link
          href="/"
          className="flex items-center gap-3 overflow-hidden text-black"
        >
          <Piano className="size-7 shrink-0" strokeWidth={2} />
          <span className="font-heading text-2xl font-black uppercase tracking-tighter group-data-[collapsible=icon]:hidden">
            {t("home.brand")}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-white pt-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-widest text-black/50">
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
                        className="h-10 gap-3 rounded-lg px-3 text-sm font-semibold tracking-wide whitespace-nowrap data-[active=true]:bg-black data-[active=true]:text-white"
                      >
                        <Icon className="size-5 shrink-0" strokeWidth={1.75} />
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
