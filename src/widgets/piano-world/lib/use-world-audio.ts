"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  disposeSampler,
  disposeVoices,
  ensureAudioStarted,
  getCurrentInstrumentId,
  loadInstrument,
  playNoteOff,
  playNoteOn,
  playVoice,
  playWarpEffect,
  type InstrumentId,
  type VoiceId,
  type WarpEffect,
} from "@/shared/lib/audio";
import { useCallbackRef } from "@/shared/lib/react/use-callback-ref";
import { seventhChordOn } from "../model/harmony";
import { debugSeam } from "./debug-seam";
import type { RegionDef } from "../model/regions";

export type AudioState = "off" | "loading" | "on";

/** Cathedral: how long a note keeps ringing after you step off it. */
const ECHO_MS = 1400;
/**
 * A step is a strike, not a held key: released after this long even if you
 * keep standing there. The instruments are synths, and most sustain for as
 * long as a note is held, so standing still would drone.
 */
const STEP_RING_MS = 450;
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
  /** releases `held` once the step has rung for STEP_RING_MS */
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const echoTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const remoteHeld = useRef(new Map<string, number>());
  const remoteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
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
    clearTimeout(holdTimer.current);
    held.current.forEach(playNoteOff);
    held.current = [];
    remoteTimers.current.forEach(clearTimeout);
    remoteTimers.current.clear();
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

  /** Let go of the notes your step is sounding (in the cathedral they ring on). */
  const releaseHeld = useCallback(() => {
    clearTimeout(holdTimer.current);
    const echo = regionRef.current.feature === "echo";
    for (const previous of held.current) {
      if (echo) {
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
  }, [regionRef]);

  /** Your step changed key: how it sounds depends on the region's feature. */
  const handleStep = useCallback(
    (midi: number | null) => {
      setNote(midi);
      const feature = regionRef.current.feature;
      releaseHeld();
      if (midi === null) return;

      onStepRef.current(midi);
      debugSeam?.steps.push({ midi, t: performance.now() });
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
      holdTimer.current = setTimeout(releaseHeld, STEP_RING_MS);
    },
    [onStepRef, regionRef, releaseHeld],
  );

  const releaseRemote = useCallback((id: string) => {
    clearTimeout(remoteTimers.current.get(id));
    remoteTimers.current.delete(id);
    const previous = remoteHeld.current.get(id);
    if (previous !== undefined) playNoteOff(previous);
    remoteHeld.current.delete(id);
  }, []);

  /** Other people's footsteps, quieter than your own (also a strike, not a hold). */
  const handleRemoteStep = useCallback(
    (id: string, midi: number | null) => {
      releaseRemote(id);
      if (midi !== null && audioRef.current === "on") {
        playNoteOn(midi, REMOTE_VELOCITY);
        remoteHeld.current.set(id, midi);
        remoteTimers.current.set(id, setTimeout(() => releaseRemote(id), STEP_RING_MS));
      }
    },
    [releaseRemote],
  );

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
      disposeVoices();
      if (getCurrentInstrumentId() === before) return;
      if (before) void loadInstrument(before);
      else disposeSampler();
    };
  }, [silence]);

  /** read synchronously in event handlers */
  const isOn = useCallback(() => audioRef.current === "on", []);

  /** A struck/plucked island sound (bridge, drums, pipes, harp, bell) — rings out on its own. */
  const voice = useCallback((id: VoiceId, midi: number, velocity: number) => {
    debugSeam?.voices.push({ id, midi, t: performance.now() });
    if (audioRef.current === "on") playVoice(id, midi, velocity);
  }, []);

  /** Warp stone sounds (waking, leaving, arriving). */
  const warpEffect = useCallback((kind: WarpEffect) => {
    debugSeam?.voices.push({ id: `warp:${kind}`, midi: 0, t: performance.now() });
    if (audioRef.current === "on") playWarpEffect(kind);
  }, []);

  /** The note ball hit (or rolled onto) a key. */
  const handleBallNote = useCallback(
    (midi: number, velocity: number) => chime([midi], velocity, 0, 450),
    [chime],
  );

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
    handleBallNote,
    chime,
    voice,
    warpEffect,
  };
}
