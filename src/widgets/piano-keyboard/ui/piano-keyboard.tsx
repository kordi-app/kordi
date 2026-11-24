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
  /** Tones of a chord being hinted — their own colour, under a pressed key's */
  hintNotes?: number[];
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  showShortcuts?: boolean;
  octave?: number;
  className?: string;
}

/**
 * Every keyboard in the app has keys of this one size (the height is shared
 * too), so the instrument feels the same in every mode. A mode picks its
 * range; a range wider than the screen scrolls sideways, a narrower one sits
 * centred. 32px: five octaves fit a laptop screen, and it's still a fair touch target.
 */
const WHITE_KEY_PX = 32;
/** A real white key is about 6.5× as long as it is wide (23.5 × 150 mm). */
const KEY_LENGTH_RATIO = 6.5;

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
  hintNotes,
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

  const hintMidiSet = useMemo(() => new Set(hintNotes ?? []), [hintNotes]);

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

  // wider than the screen: start centred (around middle C)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [whiteKeyCount]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "w-full overflow-x-auto overscroll-x-contain",
        className,
      )}
    >
      <div className="mx-auto" style={{ width: whiteKeyCount * WHITE_KEY_PX }}>
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
          className="relative flex w-full select-none"
          style={{ height: WHITE_KEY_PX * KEY_LENGTH_RATIO }}
        >
          {/* White keys */}
          {whiteKeys.map(({ midi }) => (
            <PianoKey
              key={midi}
              midi={midi}
              isBlack={false}
              isActive={activeMidiSet.has(midi)}
              isRinging={!activeMidiSet.has(midi) && ringingMidiSet.has(midi)}
              isHinted={!activeMidiSet.has(midi) && hintMidiSet.has(midi)}
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
                  isHinted={!activeMidiSet.has(midi) && hintMidiSet.has(midi)}
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
