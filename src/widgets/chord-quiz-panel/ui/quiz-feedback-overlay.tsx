"use client";

import { KordiMascot } from "@/shared/ui/illustrations/kordi-mascot";
import { cn } from "@/shared/lib/utils";

type FeedbackType = "correct" | "incorrect" | "timeout" | null;

interface QuizFeedbackOverlayProps {
  feedback: FeedbackType;
}

// useQuizFeedback already clears feedback on its own timer (300ms for a correct
// answer, 500ms otherwise), so this stays a pure render of the current value.
export function QuizFeedbackOverlay({ feedback }: QuizFeedbackOverlayProps) {
  if (!feedback) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2",
          "animate-[feedback-pop_0.3s_ease-out]",
          feedback === "incorrect" && "animate-[feedback-shake_0.3s_ease-out]",
        )}
      >
        <KordiMascot
          mood={feedback === "correct" ? "correct" : "wrong"}
          size="lg"
          className="drop-shadow-lg"
        />
      </div>
    </div>
  );
}
