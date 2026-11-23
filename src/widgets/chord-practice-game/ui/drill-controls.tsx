"use client";

import { useTranslations } from "next-intl";
import type { DrillStatus } from "@/entities/chord-practice";

interface DrillControlsProps {
  ns: string;
  status: DrillStatus;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

const PRIMARY =
  "rounded-lg border border-border bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:opacity-90";
const GHOST =
  "rounded-lg border border-border bg-card px-5 py-2 text-xs font-semibold uppercase tracking-widest text-foreground transition-all hover:bg-muted";

export function DrillControls({
  ns,
  status,
  onStart,
  onStop,
  onPause,
  onResume,
}: DrillControlsProps) {
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
    </div>
  );
}
