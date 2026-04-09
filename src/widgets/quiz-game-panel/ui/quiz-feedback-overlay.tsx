"use client";

import { useEffect, useState } from "react";
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
          "flex size-32 items-center justify-center rounded-full",
          "animate-[feedback-pop_0.3s_ease-out]",
          current === "correct" && "bg-success/20 text-success",
          current === "incorrect" && "animate-[feedback-shake_0.3s_ease-out] bg-destructive/20 text-destructive",
          current === "timeout" && "bg-warning/20 text-warning",
        )}
      >
        {current === "correct" && (
          <svg className="size-20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round">
            <circle cx="50" cy="50" r="40" opacity="0.3" />
            <path d="M30 52 L45 67 L72 35" />
          </svg>
        )}
        {current === "incorrect" && (
          <svg className="size-20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round">
            <circle cx="50" cy="50" r="40" opacity="0.3" />
            <path d="M35 35 L65 65" />
            <path d="M65 35 L35 65" />
          </svg>
        )}
        {current === "timeout" && (
          <svg className="size-20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
            <circle cx="50" cy="50" r="40" opacity="0.3" />
            <path d="M50 30 V52 L65 60" />
          </svg>
        )}
      </div>
    </div>
  );
}
