"use client";

import { cn } from "@/shared/lib/utils";
import type { QuizChord, QuizResult } from "@/entities/chord-quiz";

interface ChordPromptProps {
  currentChord: QuizChord | null;
  nextChord: QuizChord | null;
  showNext: boolean;
  feedbackState: QuizResult;
}

export function ChordPrompt({
  currentChord,
  nextChord,
  showNext,
  feedbackState,
}: ChordPromptProps) {
  const isInvert = feedbackState === "correct";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          "flex h-28 w-48 items-center justify-center rounded-lg border border-black transition-all duration-200",
          isInvert ? "bg-black text-white" : "bg-white text-black",
          feedbackState === "incorrect" && "ring-2 ring-black ring-offset-2",
          feedbackState === "timeout" && "opacity-60",
        )}
      >
        <span className="font-heading text-5xl font-black tracking-tight tabular-nums">
          {currentChord?.name ?? "-"}
        </span>
      </div>

      {showNext && nextChord && (
        <div className="text-xs font-bold uppercase tracking-widest opacity-60">
          Up next:{" "}
          <span className="font-black text-black">{nextChord.name}</span>
        </div>
      )}
    </div>
  );
}
