"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
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

  const t = useTranslations("a11y");
  const pointerInput = useKeyGlide(onNoteOn, onNoteOff);

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
          aria-label={t("pianoKeyboard")}
          className="relative flex w-full touch-none select-none"
          {...pointerInput}
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
              noteName={midiToNoteName(midi)}
              keyboardShortcut={
                showShortcuts ? keyboardLabelMap.get(midi) : undefined
              }
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
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The key under a point on screen (black keys sit on top, so they win). */
function keyAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-midi]");
  const midi = el ? Number(el.dataset.midi) : NaN;
  return Number.isNaN(midi) ? null : midi;
}

/**
 * Pointer input for the whole keyboard: each pointer (mouse, pen, every finger) holds
 * the key under it, and dragging hands the note over from key to key — a glissando.
 * The keyboard captures the pointer and hit-tests the keys itself, since a key that
 * captured it would keep the note to itself.
 */
function useKeyGlide(onNoteOn: (midi: number) => void, onNoteOff: (midi: number) => void) {
  const held = useRef(new Map<number, number | null>());

  const moveTo = useCallback(
    (pointerId: number, midi: number | null) => {
      const previous = held.current.get(pointerId) ?? null;
      if (previous === midi) return;
      held.current.set(pointerId, midi);
      // another finger may still be holding the key this one left
      const stillHeld = (m: number) => [...held.current.values()].includes(m);
      if (previous !== null && !stillHeld(previous)) onNoteOff(previous);
      if (midi !== null && [...held.current.values()].filter((m) => m === midi).length === 1) onNoteOn(midi);
    },
    [onNoteOn, onNoteOff],
  );

  const release = useCallback(
    (e: React.PointerEvent) => {
      if (!held.current.has(e.pointerId)) return;
      moveTo(e.pointerId, null);
      held.current.delete(e.pointerId);
    },
    [moveTo],
  );

  // leaving the page mid-press: let every note go
  useEffect(() => {
    const pointers = held.current;
    return () => {
      for (const midi of new Set(pointers.values())) if (midi !== null) onNoteOff(midi);
      pointers.clear();
    };
  }, [onNoteOff]);

  return {
    onPointerDown: useCallback(
      (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        const midi = keyAt(e.clientX, e.clientY);
        if (midi === null) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.pointerId, midi);
      },
      [moveTo],
    ),
    onPointerMove: useCallback(
      (e: React.PointerEvent) => {
        if (held.current.has(e.pointerId)) moveTo(e.pointerId, keyAt(e.clientX, e.clientY));
      },
      [moveTo],
    ),
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
  };
}
