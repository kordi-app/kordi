import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const sectionHeader = cva(
  "font-heading font-extrabold uppercase text-black -tracking-[0.02em]",
  {
    variants: {
      size: {
        xs: "text-sm font-bold uppercase tracking-widest text-[11px]",
        sm: "text-lg font-bold",
        md: "text-xl",
        lg: "text-[28px] leading-[1.15]",
        xl: "text-[32px] md:text-[40px] leading-[1.1]",
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
