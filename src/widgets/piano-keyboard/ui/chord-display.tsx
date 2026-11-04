"use client";

import { useMemo } from "react";
import type { ActiveNote } from "@/entities/note";
import { detectChord, type KeySignature } from "@/shared/lib/music";

interface ChordDisplayProps {
  activeNotes: ActiveNote[];
  /** Pedal-sustained notes still ringing — included in detection (free-play mode) */
  ringingNotes?: number[];
  /** Spells detected chords in this key; null uses chart-default spellings */
  musicKey?: KeySignature | null;
}

export function ChordDisplay({ activeNotes, ringingNotes, musicKey = null }: ChordDisplayProps) {
  const chord = useMemo(
    () =>
      detectChord([
        ...activeNotes.map((n) => n.midi),
        ...(ringingNotes ?? []),
      ], musicKey),
    [activeNotes, ringingNotes, musicKey],
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
