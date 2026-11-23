"use client";

import { useEffect, useMemo, useRef } from "react";
import { PianoKey } from "@/shared/ui/piano-key";
import { cn } from "@/shared/lib/utils";
import {
  isBlackKey,
  midiToNoteName,
  buildKeyboardLabelMap,
} from "@/shared/lib/music";
import type { ActiveNote } from "@/entities/note";

interface PianoKeyboardProps {
  startMidi?: number;
  endMidi?: number;
  activeNotes: ActiveNote[];
  /** Pedal-sustained notes shown with a lighter highlight */
  ringingNotes?: number[];
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  showShortcuts?: boolean;
  octave?: number;
  className?: string;
}

/** Below this, keys get too thin to hit by touch: the keyboard scrolls sideways instead. */
const MIN_WHITE_KEY_PX = 30;

// Black key offsets relative to the white key on the left (percentage of white key width)
const BLACK_KEY_OFFSETS: Record<number, number> = {
  1: 0.6, // C#
  3: 0.8, // D#
  6: 0.6, // F#
  8: 0.7, // G#
  10: 0.8, // A#
};

export function PianoKeyboard({
  startMidi = 48,
  endMidi = 84,
  activeNotes,
  ringingNotes,
  onNoteOn,
  onNoteOff,
  showShortcuts = true,
  octave = 3,
  className,
}: PianoKeyboardProps) {
  const keyboardLabelMap = useMemo(
    () => buildKeyboardLabelMap(octave),
    [octave],
  );

  const activeMidiSet = useMemo(
    () => new Set(activeNotes.map((n) => n.midi)),
    [activeNotes],
  );

  const ringingMidiSet = useMemo(
    () => new Set(ringingNotes ?? []),
    [ringingNotes],
  );

  const { whiteKeys, blackKeys, whiteKeyCount } = useMemo(() => {
    const whites: { midi: number; index: number }[] = [];
    const blacks: { midi: number; whiteIndex: number }[] = [];

    let wIndex = 0;
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (isBlackKey(midi)) {
        blacks.push({ midi, whiteIndex: wIndex - 1 });
      } else {
        whites.push({ midi, index: wIndex });
        wIndex++;
      }
    }

    return { whiteKeys: whites, blackKeys: blacks, whiteKeyCount: wIndex };
  }, [startMidi, endMidi]);

  // too narrow for every key: start centred (around middle C)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [whiteKeyCount]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "w-full max-w-4xl overflow-x-auto overscroll-x-contain",
        className,
      )}
    >
      <div style={{ minWidth: whiteKeyCount * MIN_WHITE_KEY_PX }}>
        {/* keys don't pan (a touch plays them), so touch screens get this strip to swipe the keyboard along */}
        <div
          aria-hidden
          className="relative hidden h-6 touch-pan-x select-none pointer-coarse:block"
        >
          {whiteKeys
            .filter(({ midi }) => midi % 12 === 0)
            .map(({ midi, index }) => (
              <span
                key={midi}
                className="absolute bottom-1 text-t1 text-fg-neutral-subtle"
                style={{ left: `${(index / whiteKeyCount) * 100}%` }}
              >
                {midiToNoteName(midi)}
              </span>
            ))}
        </div>
        <div
          role="group"
          aria-label="Piano keyboard"
          className="relative flex h-48 w-full select-none sm:h-56 md:h-64"
        >
          {/* White keys */}
          {whiteKeys.map(({ midi }) => (
            <PianoKey
              key={midi}
              midi={midi}
              isBlack={false}
              isActive={activeMidiSet.has(midi)}
              isRinging={!activeMidiSet.has(midi) && ringingMidiSet.has(midi)}
              noteName={midiToNoteName(midi)}
              keyboardShortcut={
                showShortcuts ? keyboardLabelMap.get(midi) : undefined
              }
              onNoteOn={onNoteOn}
              onNoteOff={onNoteOff}
            />
          ))}

          {/* Black keys (positioned absolutely) */}
          {blackKeys.map(({ midi, whiteIndex }) => {
            const keyInOctave = midi % 12;
            const offset = BLACK_KEY_OFFSETS[keyInOctave] ?? 0.65;
            const leftPercent = ((whiteIndex + offset) / whiteKeyCount) * 100;

            return (
              <div
                key={midi}
                className="absolute top-0 h-full"
                style={{
                  left: `${leftPercent}%`,
                  width: `${(0.6 / whiteKeyCount) * 100}%`,
                }}
              >
                <PianoKey
                  midi={midi}
                  isBlack={true}
                  isActive={activeMidiSet.has(midi)}
                  isRinging={
                    !activeMidiSet.has(midi) && ringingMidiSet.has(midi)
                  }
                  noteName={midiToNoteName(midi)}
                  keyboardShortcut={
                    showShortcuts ? keyboardLabelMap.get(midi) : undefined
                  }
                  onNoteOn={onNoteOn}
                  onNoteOff={onNoteOff}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
