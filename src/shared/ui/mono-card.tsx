import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * Default container of the cream system: the warm hairline border does the
 * containment, not a shadow. Sits a shade above the page cream so structure
 * still reads on card-dense screens. Extend via className.
 */
export function MonoCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card", className)}
      {...props}
    />
  );
}
