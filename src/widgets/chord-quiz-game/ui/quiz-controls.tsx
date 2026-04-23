"use client";

import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import type { QuizStatus } from "@/entities/chord-quiz";

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
  "rounded-lg border border-black bg-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white hover:text-black";
const GHOST =
  "rounded-lg border border-black bg-white px-5 py-2 text-xs font-bold uppercase tracking-widest text-black transition-all hover:bg-black hover:text-white";

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
          className="rounded-lg border border-black bg-white p-2 text-black transition-all hover:bg-black hover:text-white"
          aria-label="Settings"
        >
          <Settings className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
