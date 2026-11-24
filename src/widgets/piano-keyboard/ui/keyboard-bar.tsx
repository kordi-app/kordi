"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface KeyboardBarProps {
  /** still fetching the piano samples */
  loading: boolean;
  octave: number;
  /** shown only where dynamics matter (free play, score practice) */
  velocity?: number;
  /** shown only where the pedal matters (free play, score practice) */
  sustain?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

const CHIP = "flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground";

/**
 * The strip right above every keyboard: whether the sound is ready (left),
 * and the computer-keyboard controls (right). Every mode has the octave and
 * mute (MIDI players mute the app to avoid hearing each note twice); velocity
 * and sustain only where playing is musical rather than a chord check.
 */
export function KeyboardBar({ loading, octave, velocity, sustain, isMuted, onToggleMute }: KeyboardBarProps) {
  const t = useTranslations("piano");
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <p aria-live="polite" className={cn("mr-auto text-xs text-muted-foreground transition-opacity", !loading && "opacity-0")}>
        {loading ? t("loadingSamples") : null}
      </p>
      <span className={CHIP}>
        {t("octave")} <span className="font-medium tabular-nums">{octave}</span>
        <Kbd>Z</Kbd>
        <Kbd>X</Kbd>
      </span>
      {velocity !== undefined ? (
        <span className={CHIP}>
          {t("velocity")} <span className="font-medium tabular-nums">{velocity}</span>
          <Kbd>C</Kbd>
          <Kbd>V</Kbd>
        </span>
      ) : null}
      {sustain !== undefined ? (
        <span className={cn(CHIP, "transition-colors", sustain && "border-foreground/30 bg-foreground text-background")}>
          {t("sustain")}
          <Kbd>Space</Kbd>
        </span>
      ) : null}
      <button
        type="button"
        onClick={onToggleMute}
        aria-pressed={isMuted}
        aria-label={isMuted ? t("soundOff") : t("soundOn")}
        title={isMuted ? t("soundOff") : t("soundOn")}
        className={cn(CHIP, "px-2 hover:bg-muted", isMuted && "text-muted-foreground")}
      >
        {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-background px-1 font-sans text-t1 text-muted-foreground">
      {children}
    </kbd>
  );
}
