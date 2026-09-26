"use client";

import { useMemo } from "react";
import type { ActiveNote } from "@/entities/note";
import { detectChord } from "@/shared/lib/music";

interface ChordDisplayProps {
  activeNotes: ActiveNote[];
  /** Pedal-sustained notes still ringing — included in detection (free-play mode) */
  ringingNotes?: number[];
}

export function ChordDisplay({ activeNotes, ringingNotes }: ChordDisplayProps) {
  const chord = useMemo(
    () =>
      detectChord([
        ...activeNotes.map((n) => n.midi),
        ...(ringingNotes ?? []),
      ]),
    [activeNotes, ringingNotes],
  );

  if (!chord) {
    return (
      <div className="flex h-20 items-center justify-center">
        <span className="text-lg opacity-40">-</span>
      </div>
    );
  }

  return (
    <div className="flex h-20 flex-col items-center justify-center">
      <span className="font-heading text-5xl font-semibold tabular-nums text-foreground">
        {chord.primary}
      </span>
      <span className="h-5 text-sm font-semibold tabular-nums opacity-50">
        {chord.secondary ?? ""}
      </span>
    </div>
  );
}
