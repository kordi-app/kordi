"use client";

import { memo } from "react";
import { cn } from "@/shared/lib/utils";

interface PianoKeyProps {
  midi: number;
  isBlack: boolean;
  isActive: boolean;
  /** Released but still ringing under the sustain pedal — lighter highlight */
  isRinging?: boolean;
  /** A tone of the chord being hinted (a different colour from a pressed key) */
  isHinted?: boolean;
  keyboardShortcut?: string;
  noteName: string;
}

/**
 * One key, drawn only: pointer input is handled by the keyboard around it, which
 * hit-tests `data-midi` under the pointer — so a drag glides across keys (a
 * glissando) instead of being captured by the key it started on.
 */
export const PianoKey = memo(function PianoKey({
  midi,
  isBlack,
  isActive,
  isRinging = false,
  isHinted = false,
  keyboardShortcut,
  noteName,
}: PianoKeyProps) {
  if (isBlack) {
    return (
      <button
        role="button"
        aria-label={noteName}
        data-midi={midi}
        data-active={isActive || undefined}
        data-ringing={isRinging || undefined}
        data-hint={isHinted || undefined}
        className={cn(
          "flex flex-col items-center justify-end",
          "h-[60%] w-full rounded-b-md",
          "bg-[oklch(0.22_0.01_75)] dark:bg-[oklch(0.13_0.01_75)]",
          "border border-[oklch(0_0_0/10%)] dark:border-[oklch(1_0_0/6%)]",
          "transition-all duration-75",
          "hover:bg-[oklch(0.26_0.01_75)] dark:hover:bg-[oklch(0.17_0.01_75)]",
          "data-[ringing]:bg-[oklch(0.29_0.04_150)] dark:data-[ringing]:bg-[oklch(0.22_0.03_150)]",
          "data-[hint]:bg-[oklch(0.55_0.12_70)] dark:data-[hint]:bg-[oklch(0.5_0.11_70)]",
          "data-[active]:bg-[oklch(0.35_0.08_150)] dark:data-[active]:bg-[oklch(0.3_0.06_150)]",
          "data-[active]:shadow-[0_0_12px_var(--neon-glow)]",
          "touch-none select-none cursor-pointer"
        )}
      >
        {isHinted ? <HintDot /> : null}
        {keyboardShortcut && (
          <span className="mb-1 text-t1 font-mono text-[oklch(0.4_0.02_75)]">
            {keyboardShortcut}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      role="button"
      aria-label={noteName}
      data-midi={midi}
      data-active={isActive || undefined}
      data-ringing={isRinging || undefined}
      data-hint={isHinted || undefined}
      className={cn(
        "relative flex flex-col items-center justify-end",
        "h-full flex-1 rounded-b-lg",
        "bg-[oklch(0.97_0.012_85)] dark:bg-[oklch(0.92_0.005_75)]",
        "border border-[oklch(0_0_0/8%)] dark:border-[oklch(0.8_0.01_75)]",
        "transition-all duration-75",
        "hover:bg-[oklch(0.94_0.014_85)] dark:hover:bg-[oklch(0.88_0.01_75)]",
        "data-[ringing]:bg-[oklch(0.93_0.025_150)] dark:data-[ringing]:bg-[oklch(0.87_0.02_150)]",
        "data-[hint]:bg-[oklch(0.88_0.09_80)] dark:data-[hint]:bg-[oklch(0.82_0.09_80)]",
        "data-[active]:bg-[oklch(0.88_0.05_150)] dark:data-[active]:bg-[oklch(0.82_0.04_150)]",
        "data-[active]:shadow-[0_0_16px_var(--neon-glow)]",
        "touch-none select-none cursor-pointer"
      )}
    >
      {isHinted ? <HintDot /> : null}
      {keyboardShortcut && (
        <span className="mb-2 text-t1 font-mono text-[oklch(0.5_0.02_75)]">
          {keyboardShortcut}
        </span>
      )}
    </button>
  );
});

/** Marks a hinted key that isn't pressed yet: "this one". */
function HintDot() {
  return <span aria-hidden className="mb-1.5 size-2 rounded-full bg-[oklch(0.6_0.15_55)]" />;
}
