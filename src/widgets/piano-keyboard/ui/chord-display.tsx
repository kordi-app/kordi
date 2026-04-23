"use client";

import type { ActiveNote } from "@/entities/note";
import { detectChord } from "@/shared/lib/music";

interface ChordDisplayProps {
  activeNotes: ActiveNote[];
}

export function ChordDisplay({ activeNotes }: ChordDisplayProps) {
  const chord = detectChord(activeNotes.map((n) => n.midi));

  if (!chord) {
    return (
      <div className="flex h-16 items-center justify-center">
        <span className="text-lg opacity-40">-</span>
      </div>
    );
  }

  return (
    <div className="flex h-16 items-center justify-center">
      <span className="font-heading text-3xl font-black tabular-nums text-black">
        {chord}
      </span>
    </div>
  );
}
