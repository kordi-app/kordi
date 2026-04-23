import {
  Piano,
  Dumbbell,
  HelpCircle,
  User,
  Users,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/shared/config/routes";

export interface NavItem {
  href: (typeof ROUTES)[keyof typeof ROUTES];
  icon: LucideIcon;
  labelKey: string;
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "sidebar.groups.practice",
    items: [
      { href: ROUTES.PIANO, icon: Piano, labelKey: "sidebar.nav.piano" },
      {
        href: ROUTES.CHORD_PRACTICE,
        icon: Dumbbell,
        labelKey: "sidebar.nav.practice",
      },
      {
        href: ROUTES.CHORD_QUIZ,
        icon: HelpCircle,
        labelKey: "sidebar.nav.quiz",
      },
    ],
  },
  {
    labelKey: "sidebar.groups.community",
    items: [
      { href: ROUTES.RANKING, icon: Trophy, labelKey: "sidebar.nav.ranking" },
      { href: ROUTES.FRIENDS, icon: Users, labelKey: "sidebar.nav.friends" },
    ],
  },
  {
    labelKey: "sidebar.groups.account",
    items: [
      { href: ROUTES.ME, icon: User, labelKey: "sidebar.nav.profile" },
    ],
  },
];
