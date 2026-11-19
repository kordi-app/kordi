"use client";

import { CircleUser } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { KordiLogo } from "@/shared/ui/illustrations/kordi-logo";
import { Link, usePathname } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

/**
 * Cream-on-cream navigation: the sidebar sits one step darker than the page
 * (`--sidebar`), and the active item lifts back up to the card surface — so the
 * selection reads as "this sheet is on top" rather than as a grey highlight.
 */
export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="[&>[data-sidebar=sidebar]]:bg-card">
      <SidebarHeader className="h-14 shrink-0 justify-center px-4 group-data-[collapsible=icon]:px-0">
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2.5 text-foreground group-data-[collapsible=icon]:justify-center"
        >
          <KordiLogo size={24} />
          <span className="text-[17px] font-semibold -tracking-[0.02em] group-data-[collapsible=icon]:hidden">
            Kordi
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 pt-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.labelKey} className="py-1.5">
            <SidebarGroupLabel className="h-7 px-3 text-xs font-medium text-muted-foreground">
              {t(group.labelKey)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    label={t(item.labelKey)}
                    active={pathname === item.href}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <NavLink
            href={ROUTES.ME}
            icon={CircleUser}
            label={t("sidebar.nav.profile")}
            active={pathname === ROUTES.ME}
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={label}
        render={<Link href={href} />}
        // The mobile sheet stays open after client-side navigation otherwise
        onClick={() => isMobile && setOpenMobile(false)}
        className="h-9 gap-3 rounded-md px-3 text-sm text-foreground/70 transition-colors hover:bg-muted hover:text-foreground data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-foreground"
      >
        <Icon className="size-[18px] shrink-0" />
        <span className="truncate">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
