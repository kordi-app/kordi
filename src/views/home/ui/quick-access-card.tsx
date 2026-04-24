import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "@/shared/config/i18n/navigation";

interface QuickAccessCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  cta: string;
}

export function QuickAccessCard({
  href,
  icon: Icon,
  title,
  desc,
  cta,
}: QuickAccessCardProps) {
  return (
    <Link href={href} className="block h-full">
      <div className="group flex h-full cursor-pointer flex-col justify-between rounded-lg border border-black p-6 transition-all hover:shadow-[inset_0_0_0_1px_#000]">
        <div className="mb-10 space-y-2">
          <div className="flex size-12 items-center justify-center rounded-lg border border-black bg-black text-white transition-all group-hover:bg-white group-hover:text-black">
            <Icon className="size-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-2xl font-bold uppercase leading-tight">
            {title}
          </h2>
          <p className="text-base opacity-80">{desc}</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
          {cta}
          <ArrowRight className="size-4" strokeWidth={2} />
        </div>
      </div>
    </Link>
  );
}
