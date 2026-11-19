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
  /** Shown while nothing is pressed. */
  placeholder?: string;
}

export function ChordDisplay({
  activeNotes,
  ringingNotes,
  musicKey = null,
  placeholder,
}: ChordDisplayProps) {
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
        <span className="text-body-md text-muted-foreground">
          {placeholder ?? "–"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-20 flex-col items-center justify-center">
      <span className="text-6xl font-semibold -tracking-[0.03em] tabular-nums text-foreground">
        {chord.primary}
      </span>
      <span className="mt-1 h-5 text-sm tabular-nums text-muted-foreground">
        {chord.secondary ?? ""}
      </span>
    </div>
  );
}
