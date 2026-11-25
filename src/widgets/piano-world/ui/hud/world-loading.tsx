import { Loader2Icon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { HUD_CHIP } from "./surface";

/**
 * Over the world while the GPU is still building it: a light veil of cream,
 * thin enough that the scene shows through as it comes in, with one chip
 * saying what's happening. It never takes the pointer, so nothing waits on it.
 *
 * Shown at once on the first load; on a later trip it only appears if the
 * new place is slow to draw (a short delay), so places already seen don't
 * flash it.
 */
export function WorldLoading({ drawing, label }: { drawing: boolean; label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!drawing}
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[2px] transition-opacity duration-500 motion-reduce:transition-none",
        drawing ? "opacity-100 delay-300" : "opacity-0",
      )}
    >
      <span className={cn(HUD_CHIP, "flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground")}>
        <Loader2Icon aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
        {label}
      </span>
    </div>
  );
}
