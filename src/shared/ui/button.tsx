"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

/**
 * The one button of the cream system. Every size shares one corner (8px, the
 * input radius) and steps up evenly in height; emphasis comes from fill, not
 * from weight or caps. Focus is a warm ink ring, disabled simply fades.
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-transparent",
    "font-medium tracking-[-0.01em] whitespace-nowrap select-none outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-150",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        /** The main action: charcoal with a soft inset edge */
        default:
          "bg-primary text-primary-foreground shadow-button hover:bg-primary-hover",
        /** A quieter filled action */
        secondary: "bg-secondary text-foreground hover:bg-secondary-hover aria-expanded:bg-secondary-hover",
        /** Secondary action on a surface */
        outline:
          "border-control-border bg-card text-foreground hover:border-control-border-hover hover:bg-accent aria-expanded:bg-accent",
        /** Inline / low-emphasis action */
        ghost: "text-foreground/80 hover:bg-accent hover:text-foreground aria-expanded:bg-accent",
        /** Irreversible action (usually the confirm step) */
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
        link: "h-auto px-0 text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground",
      },
      size: {
        xs: "h-7 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-9 px-4 text-sm",
        lg: "h-11 px-5 text-[15px]",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        icon: "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
