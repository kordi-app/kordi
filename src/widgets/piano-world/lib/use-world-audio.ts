"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  disposeSampler,
  ensureAudioStarted,
  getCurrentInstrumentId,
  loadInstrument,
  playNoteOff,
  playNoteOn,
  type InstrumentId,
} from "@/shared/lib/audio";
import { useCallbackRef } from "@/shared/lib/react/use-callback-ref";
import { seventhChordOn } from "../model/harmony";
import type { RegionDef } from "../model/regions";

export type AudioState = "off" | "loading" | "on";

/** Cathedral: how long a note keeps ringing after you step off it. */
const ECHO_MS = 1400;
const STEP_VELOCITY = 0.75;
const CHORD_TONE_VELOCITY = 0.42;
const REMOTE_VELOCITY = 0.35;
const CAT_VELOCITY = 0.18;

/**
 * Everything the world plays through the app's single shared instrument:
 * your steps (shaped by the region's feature), other players' steps, the
 * cat, and one-off chimes. Also guards the shared engine — instrument loads
 * are serialized, and whatever instrument was loaded before is restored on
 * unmount so other pages don't inherit, say, the cathedral organ.
 *
 * @param onStep called with each new note you step on (melody game)
 */
export function useWorldAudio(regionRef: RefObject<RegionDef>, onStep: (midi: number) => void) {
  const [audio, setAudio] = useState<AudioState>("off");
  const audioRef = useRef<AudioState>("off");
  const [note, setNote] = useState<number | null>(null);
  const onStepRef = useCallbackRef(onStep);

  /** Notes I'm holding (several in the lounge, where a step is a chord) */
  const held = useRef<number[]>([]);
  const echoTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const remoteHeld = useRef(new Map<string, number>());
  const catHeld = useRef<number | null>(null);
  const chimeTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const instrumentChain = useRef<Promise<void>>(Promise.resolve());

  const setState = useCallback((state: AudioState) => {
    audioRef.current = state;
    setAudio(state);
  }, []);

  /**
   * Loads are chained so a quick portal hop can't race two loads, and the
   * last requested instrument always wins.
   */
  const switchInstrument = useCallback(
    (id: InstrumentId) => {
      setState("loading");
      instrumentChain.current = instrumentChain.current
        .then(() => ensureAudioStarted())
        .then(() => loadInstrument(id))
        .then(() => {
          if (regionRef.current.instrument === id) setState("on"); // else superseded
        })
        .catch(() => setState("off"));
    },
    [regionRef, setState],
  );

  /** Browsers only allow audio after a user gesture — call from one. */
  const startAudio = useCallback(() => {
    if (audioRef.current === "off") switchInstrument(regionRef.current.instrument);
  }, [regionRef, switchInstrument]);

  /** Stop everything that's sounding and clear the note display. */
  const silence = useCallback(() => {
    held.current.forEach(playNoteOff);
    held.current = [];
    echoTimers.current.forEach((timer, midi) => {
      clearTimeout(timer);
      playNoteOff(midi);
    });
    echoTimers.current.clear();
    remoteHeld.current.forEach(playNoteOff);
    remoteHeld.current.clear();
    if (catHeld.current !== null) playNoteOff(catHeld.current);
    catHeld.current = null;
    setNote(null);
  }, []);

  /** Your step changed key: how it sounds depends on the region's feature. */
  const handleStep = useCallback(
    (midi: number | null) => {
      setNote(midi);
      const feature = regionRef.current.feature;

      for (const previous of held.current) {
        if (feature === "echo") {
          clearTimeout(echoTimers.current.get(previous));
          echoTimers.current.set(
            previous,
            setTimeout(() => {
              playNoteOff(previous);
              echoTimers.current.delete(previous);
            }, ECHO_MS),
          );
        } else {
          playNoteOff(previous);
        }
      }
      held.current = [];
      if (midi === null) return;

      onStepRef.current(midi);
      if (audioRef.current !== "on") return;

      const notes = feature === "chords" ? seventhChordOn(midi) : [midi];
      notes.forEach((n, i) => {
        const ringing = echoTimers.current.get(n);
        if (ringing) {
          clearTimeout(ringing);
          echoTimers.current.delete(n);
          playNoteOff(n); // restrike cleanly
        }
        playNoteOn(n, i === 0 ? STEP_VELOCITY : CHORD_TONE_VELOCITY);
      });
      held.current = notes;
    },
    [onStepRef, regionRef],
  );

  /** Other people's footsteps, quieter than your own. */
  const handleRemoteStep = useCallback((id: string, midi: number | null) => {
    const previous = remoteHeld.current.get(id);
    if (previous !== undefined) playNoteOff(previous);
    remoteHeld.current.delete(id);
    if (midi !== null && audioRef.current === "on") {
      playNoteOn(midi, REMOTE_VELOCITY);
      remoteHeld.current.set(id, midi);
    }
  }, []);

  /** The cat's footsteps, very soft (the scene only reports them when it's near). */
  const handleCatStep = useCallback((midi: number | null) => {
    if (catHeld.current !== null) playNoteOff(catHeld.current);
    catHeld.current = null;
    if (midi !== null && audioRef.current === "on") {
      playNoteOn(midi, CAT_VELOCITY);
      catHeld.current = midi;
    }
  }, []);

  /** Notes started `gapMs` apart, all released after `holdMs`. */
  const chime = useCallback((notes: number[], velocity: number, gapMs: number, holdMs: number) => {
    if (audioRef.current !== "on") return;
    const later = (fn: () => void, ms: number) => {
      const timer = setTimeout(() => {
        chimeTimers.current.delete(timer);
        fn();
      }, ms);
      chimeTimers.current.add(timer);
    };
    notes.forEach((n, i) => later(() => playNoteOn(n, velocity), i * gapMs));
    later(() => notes.forEach(playNoteOff), holdMs);
  }, []);

  // Leave the shared engine as we found it, and silence everything on unmount
  useEffect(() => {
    const before = getCurrentInstrumentId();
    const pending = chimeTimers.current;
    return () => {
      pending.forEach(clearTimeout);
      silence();
      if (getCurrentInstrumentId() === before) return;
      if (before) void loadInstrument(before);
      else disposeSampler();
    };
  }, [silence]);

  /** read synchronously in event handlers */
  const isOn = useCallback(() => audioRef.current === "on", []);

  return {
    audio,
    isOn,
    note,
    startAudio,
    switchInstrument,
    silence,
    handleStep,
    handleRemoteStep,
    handleCatStep,
    chime,
  };
}
