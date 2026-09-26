"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  NOTE_KEY_OFFSETS,
  CONTROL_KEYS,
  DEFAULT_OCTAVE,
  MIN_OCTAVE,
  MAX_OCTAVE,
  VELOCITY_STEP,
  DEFAULT_VELOCITY,
  offsetToMidi,
} from "@/shared/lib/music";

interface UseKeyboardInputOptions {
  onNoteOn: (midi: number, velocity: number) => void;
  onNoteOff: (midi: number) => void;
  onSustainChange?: (on: boolean) => void;
  enabled?: boolean;
}

export function useKeyboardInput({
  onNoteOn,
  onNoteOff,
  onSustainChange,
  enabled = true,
}: UseKeyboardInputOptions) {
  const [octave, setOctave] = useState(DEFAULT_OCTAVE);
  const [velocity, setVelocity] = useState(DEFAULT_VELOCITY);
  const [sustain, setSustain] = useState(false);

  const pressedKeys = useRef(new Map<string, number>());

  // Effect Events read the latest octave/velocity/sustain without making the
  // key listeners re-subscribe on every change.
  const pressNote = useEffectEvent((code: string, offset: number) => {
    const midi = offsetToMidi(offset, octave);
    pressedKeys.current.set(code, midi);
    onNoteOn(midi, velocity / 127);
  });
  const releaseNote = useEffectEvent((midi: number) => onNoteOff(midi));
  const toggleSustain = useEffectEvent(() => {
    const next = !sustain;
    setSustain(next);
    onSustainChange?.(next);
  });

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const { code } = e;

      if (code === CONTROL_KEYS.OCTAVE_DOWN) {
        e.preventDefault();
        setOctave((prev) => Math.max(MIN_OCTAVE, prev - 1));
        return;
      }
      if (code === CONTROL_KEYS.OCTAVE_UP) {
        e.preventDefault();
        setOctave((prev) => Math.min(MAX_OCTAVE, prev + 1));
        return;
      }
      if (code === CONTROL_KEYS.VELOCITY_DOWN) {
        e.preventDefault();
        setVelocity((prev) => Math.max(1, prev - VELOCITY_STEP));
        return;
      }
      if (code === CONTROL_KEYS.VELOCITY_UP) {
        e.preventDefault();
        setVelocity((prev) => Math.min(127, prev + VELOCITY_STEP));
        return;
      }
      if (code === CONTROL_KEYS.SUSTAIN) {
        e.preventDefault();
        toggleSustain();
        return;
      }

      const offset = NOTE_KEY_OFFSETS[code];
      if (offset === undefined) return;
      if (pressedKeys.current.has(code)) return;

      e.preventDefault();
      pressNote(code, offset);
    }

    function handleKeyUp(e: KeyboardEvent) {
      const { code } = e;
      const midi = pressedKeys.current.get(code);
      if (midi === undefined) return;

      e.preventDefault();
      pressedKeys.current.delete(code);
      releaseNote(midi);
    }

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled]);

  return { octave, velocity, sustain };
}
