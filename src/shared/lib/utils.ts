import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge, taught our design tokens (app/globals.css). Without this it
 * reads e.g. `text-t3` (a font-size step) as a text *colour* and drops a
 * `text-primary-foreground` next to it — keep this list in step with the tokens.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12", "t13"],
      radius: ["r1", "r2", "r3", "r4", "r5", "r6", "control", "card", "container"],
      spacing: [
        "page-x",
        "page-x-wide",
        "page-y",
        "page-y-wide",
        "section",
        "component",
        "between-chips",
        "between-text",
      ],
      shadow: ["button", "raised"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
