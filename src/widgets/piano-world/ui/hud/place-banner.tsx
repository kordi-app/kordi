"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";

/** A big line across the middle of the screen: a place you've come to, or something you've found. */
export interface Banner {
  title: string;
  sub: string;
  /** a place (pale) or a treasure (gold) */
  tone: "place" | "treasure";
  visible: boolean;
}

/** How long a banner stays up before it fades */
const BANNER_MS = 3800;

/** One banner at a time: showing a new one replaces the last. */
export function usePlaceBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback((title: string, sub: string, tone: Banner["tone"]) => {
    clearTimeout(timer.current);
    setBanner({ title, sub, tone, visible: true });
    timer.current = setTimeout(() => setBanner((b) => (b ? { ...b, visible: false } : b)), BANNER_MS);
  }, []);
  return { banner, show };
}

/**
 * The banner itself: a dark band through the middle of the screen with the
 * name in large serif letters, fading in and out. The band is what makes it
 * readable anywhere: the letters are pale, and the island by day is paler.
 */
export function PlaceBanner({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  const treasure = banner.tone === "treasure";
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-[36%] transition-opacity duration-1000 motion-reduce:transition-none",
        banner.visible ? "opacity-100" : "opacity-0",
      )}
    >
      {/* keyed by what it says: a banner that replaces another makes its own entrance */}
      <div key={`${banner.title}\n${banner.sub}`} className="relative flex flex-col items-center gap-3 px-6 py-7 md:py-8">
        {/* the band, on its own layer so its soft edges don't fade the letters with it */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(6,4,12,0.74)_22%,rgba(6,4,12,0.74)_78%,transparent)] [mask-image:linear-gradient(180deg,transparent,black_18%,black_82%,transparent)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
        />
        {/* The padding on the left is the tracking's width: letter-spacing trails the last
            letter too, which would set a widely spaced title off-centre. */}
        <div
          className={cn(
            "relative text-balance break-keep pl-[0.2em] text-center font-serif text-[1.75rem] leading-tight tracking-[0.2em] md:text-4xl",
            "[text-shadow:0_0_28px_color-mix(in_srgb,currentColor_40%,transparent)]",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:blur-in-4 motion-safe:duration-1000 motion-safe:ease-out",
            treasure ? "text-palette-yellow-300" : "text-palette-purple-100",
          )}
        >
          {banner.title}
        </div>
        {/* a rule that opens from its middle, with a small diamond where it starts */}
        <div
          aria-hidden
          className={cn(
            "relative flex items-center gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:delay-200 motion-safe:duration-700 motion-safe:ease-out motion-safe:fill-mode-both",
            treasure ? "text-palette-yellow-300/80" : "text-palette-purple-100/60",
          )}
        >
          <span className="h-px w-20 bg-linear-to-r from-transparent to-current md:w-28" />
          <span className="size-1.5 rotate-45 bg-current" />
          <span className="h-px w-20 bg-linear-to-l from-transparent to-current md:w-28" />
        </div>
        <div className="relative text-balance break-keep text-center text-sm leading-relaxed tracking-[0.04em] text-white/85 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:delay-500 motion-safe:duration-700 motion-safe:fill-mode-both">
          {banner.sub}
        </div>
      </div>
    </div>
  );
}
