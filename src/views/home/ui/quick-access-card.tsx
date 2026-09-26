import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "@/shared/config/i18n/navigation";

interface QuickAccessCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
}

/**
 * Name, arrow, and a bare icon. No tinted tile behind the icon — the
 * icon-in-a-rounded-square is the most worn-out card idiom there is, and the
 * extra fill was the only thing on this screen competing with the CTA.
 */
export function QuickAccessCard({
  href,
  icon: Icon,
  title,
}: QuickAccessCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 transition-shadow hover:shadow-[rgba(0,0,0,0.1)_0_4px_12px]"
    >
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {title}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
