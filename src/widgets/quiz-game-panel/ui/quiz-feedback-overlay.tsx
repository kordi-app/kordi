"use client";

import { useEffect, useState } from "react";
import { KordiMascot } from "@/shared/ui/illustrations/kordi-mascot";
import { cn } from "@/shared/lib/utils";

type FeedbackType = "correct" | "incorrect" | "timeout" | null;

interface QuizFeedbackOverlayProps {
  feedback: FeedbackType;
}

export function QuizFeedbackOverlay({ feedback }: QuizFeedbackOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<FeedbackType>(null);

  useEffect(() => {
    if (feedback) {
      setCurrent(feedback);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), feedback === "correct" ? 300 : 500);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [feedback]);

  if (!visible || !current) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2",
          "animate-[feedback-pop_0.3s_ease-out]",
          current === "incorrect" && "animate-[feedback-shake_0.3s_ease-out]",
        )}
      >
        <KordiMascot
          mood={current === "correct" ? "correct" : "wrong"}
          size="lg"
          className="drop-shadow-lg"
        />
      </div>
    </div>
  );
}
