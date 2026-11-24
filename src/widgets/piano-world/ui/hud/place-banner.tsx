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
 * name in large serif letters, fading in and out.
 */
export function PlaceBanner({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  const treasure = banner.tone === "treasure";
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-[38%] flex flex-col items-center gap-2 py-6 transition-opacity duration-1000 motion-reduce:transition-none",
        "bg-[linear-gradient(90deg,transparent,rgba(6,4,12,0.72)_25%,rgba(6,4,12,0.72)_75%,transparent)]",
        banner.visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className={cn(
          "px-4 text-center font-serif text-3xl tracking-[0.18em] md:text-4xl",
          treasure ? "text-[#ffd98a]" : "text-[#e9e3ff]",
        )}
      >
        {banner.title}
      </div>
      <div className={cn("h-px w-56 md:w-72", treasure ? "bg-[#ffd98a]/60" : "bg-[#e9e3ff]/40")} />
      <div className="px-4 text-center text-sm tracking-wide text-white/75">{banner.sub}</div>
    </div>
  );
}
