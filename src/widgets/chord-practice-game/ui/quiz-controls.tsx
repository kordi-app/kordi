"use client";

import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import type { QuizStatus } from "@/entities/chord-practice";

interface QuizControlsProps {
  ns: string;
  status: QuizStatus;
  bpm: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onSettingsOpen: () => void;
}

const PRIMARY =
  "rounded-lg border border-border bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:opacity-90";
const GHOST =
  "rounded-lg border border-border bg-card px-5 py-2 text-xs font-semibold uppercase tracking-widest text-foreground transition-all hover:bg-muted";

export function QuizControls({
  ns,
  status,
  onStart,
  onStop,
  onPause,
  onResume,
  onSettingsOpen,
}: QuizControlsProps) {
  const t = useTranslations(ns);

  return (
    <div className="flex items-center gap-3">
      {status === "idle" && (
        <button onClick={onStart} className={PRIMARY}>
          {t("start")}
        </button>
      )}
      {status === "playing" && (
        <>
          <button onClick={onPause} className={GHOST}>
            {t("pause")}
          </button>
          <button onClick={onStop} className={GHOST}>
            {t("stop")}
          </button>
        </>
      )}
      {status === "paused" && (
        <>
          <button onClick={onResume} className={PRIMARY}>
            {t("resume")}
          </button>
          <button onClick={onStop} className={GHOST}>
            {t("stop")}
          </button>
        </>
      )}

      {status === "idle" && (
        <button
          onClick={onSettingsOpen}
          className="rounded-lg border border-border bg-card p-2 text-foreground transition-all hover:bg-muted"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </button>
      )}
    </div>
  );
}
