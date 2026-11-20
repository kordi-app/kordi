"use client";

import { Volume2 } from "lucide-react";

interface AudioStartPromptProps {
  title: string;
  description: string;
  onStart: () => void;
  /**
   * `page` replaces the whole view. `overlay` sits on top of an already
   * rendered keyboard (parent must be `relative`), so the visitor sees the
   * instrument before the browser's audio gesture is collected.
   */
  variant?: "page" | "overlay";
}

export function AudioStartPrompt({
  title,
  description,
  onStart,
  variant = "page",
}: AudioStartPromptProps) {
  const button = (
    <button
      type="button"
      onClick={onStart}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-6 py-4 text-left shadow-raised transition-colors hover:bg-muted"
    >
      <span className="btn-inset flex size-10 shrink-0 items-center justify-center rounded-full">
        <Volume2 className="size-[18px]" />
      </span>
      <span>
        <span className="block text-t5 font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );

  if (variant === "overlay") {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/35">
        {button}
      </div>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">{button}</main>
  );
}
