import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const monoButton = cva(
  // Weight caps at 600 and labels run sentence-case: the cream system carries
  // emphasis with color and space, not with bold uppercase.
  "inline-flex items-center justify-center whitespace-nowrap rounded font-semibold transition active:opacity-80 disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        /** Charcoal fill with the signature inset — the primary action. */
        solid: "btn-inset",
        /** Outlined — secondary. The interactive border, not the passive one. */
        outline:
          "border border-[rgba(42,37,33,0.4)] bg-transparent text-foreground hover:bg-accent",
        /** Pill (tab) active state. */
        "pill-active": "btn-inset rounded-full",
        /** Pill (tab) inactive state. */
        "pill-inactive":
          "rounded-full border border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
      },
      size: {
        sm: "px-3.5 py-1.5 text-sm",
        md: "px-5 py-2.5 text-sm",
        lg: "px-7 py-3.5 text-base",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface MonoButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof monoButton> {}

export const MonoButton = forwardRef<HTMLButtonElement, MonoButtonProps>(
  function MonoButton({ className, variant, size, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(monoButton({ variant, size }), className)}
        {...props}
      />
    );
  },
);

/**
 * Helper for tabs/toggles: renders a pill with active/inactive styling
 * driven by a boolean, avoiding the `variant={active ? ... : ...}` ternary.
 */
export function MonoPill({
  active,
  className,
  ...props
}: MonoButtonProps & { active?: boolean }) {
  return (
    <MonoButton
      variant={active ? "pill-active" : "pill-inactive"}
      size="sm"
      className={className}
      {...props}
    />
  );
}
