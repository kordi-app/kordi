"use client";

import { Piano } from "lucide-react";

interface AudioStartPromptProps {
  title: string;
  description: string;
  onStart: () => void;
}

export function AudioStartPrompt({
  title,
  description,
  onStart,
}: AudioStartPromptProps) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <button
        onClick={onStart}
        className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-12 py-10 transition-all hover:bg-muted"
      >
        <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-primary text-primary-foreground">
          <Piano className="size-8" />
        </div>
        <div className="text-center">
          <p className="font-heading text-lg font-semibold -tracking-[0.01em]">
            {title}
          </p>
          <p className="mt-1 text-sm opacity-70">{description}</p>
        </div>
      </button>
    </main>
  );
}
