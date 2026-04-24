import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Default container of the mono design system:
 * 1px black border, white bg, rounded-lg. Extend via className.
 */
export function MonoCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-black bg-white", className)}
      {...props}
    />
  );
}
