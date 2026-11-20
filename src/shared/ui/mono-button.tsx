"use client";

import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "./button";

/**
 * A tab / toggle chip (difficulty, settings…): rounded-full, filled when
 * active. Built on {@link Button} so it shares its type, focus and motion.
 */
export function MonoPill({
  active,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "variant" | "size"> & { active?: boolean }) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      className={cn("rounded-full px-3.5", !active && "text-muted-foreground hover:text-foreground", className)}
      {...props}
    />
  );
}
