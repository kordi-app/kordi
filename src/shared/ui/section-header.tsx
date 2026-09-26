import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

// Uppercase belongs to the small label role only — it is not a heading style.
// Display sizes get their weight from tight tracking, not from shouting.
const sectionHeader = cva(
  "font-heading font-semibold text-foreground -tracking-[0.02em]",
  {
    variants: {
      size: {
        xs: "text-[11px] uppercase tracking-widest",
        sm: "text-base",
        md: "text-lg",
        lg: "text-[22px] leading-[1.2]",
        xl: "text-[26px] md:text-[32px] leading-[1.15] -tracking-[0.025em]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

interface SectionHeaderProps
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof sectionHeader> {
  as?: "h1" | "h2" | "h3";
}

export function SectionHeader({
  as: Tag = "h2",
  size,
  className,
  ...props
}: SectionHeaderProps) {
  return <Tag className={cn(sectionHeader({ size }), className)} {...props} />;
}
