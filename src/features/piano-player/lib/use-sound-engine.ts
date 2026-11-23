"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveNote } from "@/entities/note";
import {
  ensureAudioStarted,
  loadDefaultInstrument,
  playNoteOn,
  playNoteOff,
} from "@/shared/lib/audio";

interface UseSoundEngineOptions {
  noteOn: (midi: number, velocity: number, source: ActiveNote["source"]) => void;
  noteOff: (midi: number) => void;
}

export function useSoundEngine({ noteOn, noteOff }: UseSoundEngineOptions) {
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const startingRef = useRef(false);
  const sustainRef = useRef(false);
  // Notes released while the sustain pedal is down — kept ringing until pedal-up
  const sustainedNotes = useRef(new Set<number>());
  // State mirror of sustainedNotes so the UI can show/detect what's still ringing
  const [ringingNotes, setRingingNotes] = useState<number[]>([]);
  // Visual-only mode: keep note tracking but skip app audio (e.g. DP has its own speakers)
  const [isMuted, setIsMuted] = useState(false);
  const mutedRef = useRef(false);
  // Notes this engine started and hasn't stopped yet, so leaving the page can silence them
  const playingNotes = useRef(new Set<number>());

  // The synth is a module singleton that outlives this page: on unmount stop
  // everything we started, including notes held by the sustain pedal
  // (key-up cleanups only hand those to the pedal, they never stop them).
  useEffect(() => {
    const playing = playingNotes.current;
    const sustained = sustainedNotes.current;
    return () => {
      sustainRef.current = false;
      for (const midi of new Set([...playing, ...sustained])) playNoteOff(midi);
      playing.clear();
      sustained.clear();
    };
  }, []);

  const startAudio = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      await ensureAudioStarted();
      setIsAudioStarted(true);
      await loadDefaultInstrument();
      setIsLoaded(true);
    } catch {
      // audio could not start: let the next gesture try again
      startingRef.current = false;
    }
  }, []);

  const handleNoteOn = useCallback(
    (midi: number, velocity: number, source: ActiveNote["source"]) => {
      // Re-pressing a sustained note: it's held again, no longer pedal-owned
      if (sustainedNotes.current.delete(midi)) {
        setRingingNotes([...sustainedNotes.current]);
      }
      if (!mutedRef.current) {
        playNoteOn(midi, velocity);
        playingNotes.current.add(midi);
      }
      noteOn(midi, velocity, source);
    },
    [noteOn]
  );

  const handleNoteOff = useCallback(
    (midi: number, _source: ActiveNote["source"]) => {
      noteOff(midi);
      if (sustainRef.current) {
        sustainedNotes.current.add(midi);
        setRingingNotes([...sustainedNotes.current]);
        return;
      }
      playNoteOff(midi);
      playingNotes.current.delete(midi);
    },
    [noteOff]
  );

  const setSustain = useCallback((on: boolean) => {
    sustainRef.current = on;
    if (!on) {
      for (const midi of sustainedNotes.current) {
        playNoteOff(midi);
        playingNotes.current.delete(midi);
      }
      sustainedNotes.current.clear();
      setRingingNotes([]);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      return next;
    });
  }, []);

  return {
    isAudioStarted,
    isLoaded,
    startAudio,
    handleNoteOn,
    handleNoteOff,
    setSustain,
    ringingNotes,
    isMuted,
    toggleMute,
  };
}
