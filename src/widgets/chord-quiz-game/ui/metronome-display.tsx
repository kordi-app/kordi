"use client";

import { cn } from "@/shared/lib/utils";

interface MetronomeDisplayProps {
  beatsPerBar: number;
  currentBeat: number;
  isPlaying: boolean;
}

export function MetronomeDisplay({
  beatsPerBar,
  currentBeat,
  isPlaying,
}: MetronomeDisplayProps) {
  if (!isPlaying) return null;

  return (
    <div className="flex items-center gap-2.5">
      {Array.from({ length: beatsPerBar }, (_, i) => (
        <div
          key={i}
          className={cn(
            "size-2.5 rounded-full border border-black transition-all duration-100",
            i === currentBeat
              ? i === 0
                ? "scale-150 bg-black"
                : "scale-125 bg-black"
              : "bg-white",
          )}
        />
      ))}
    </div>
  );
}
