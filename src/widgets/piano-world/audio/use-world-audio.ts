"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  audioReadiness,
  disposeSampler,
  disposeVoices,
  ensureAudioStarted,
  getCurrentInstrumentId,
  isAudioStarted,
  loadInstrument,
  playNoteOff,
  playNoteOn,
  playVoice,
  playWarpEffect,
  playDragonEffect,
  playTowerBell,
  playChordProgression,
  type InstrumentId,
  type VoiceId,
  type WarpEffect,
  type DragonEffect,
} from "@/shared/lib/audio";
import { houseStab, isHousePlaying, startHouse, stopHouse } from "./house-groove";
import { useCallbackRef } from "@/shared/lib/react/use-callback-ref";
import { createValueStore, type ValueStore } from "@/shared/lib/react/value-store";
import { midiToNoteName } from "@/shared/lib/music";
import { isLoungeBandPlaying, playLoungeStep, startLoungeBand, stopLoungeBand } from "./lounge-band";
import { debugSeam } from "../lib/debug-seam";
import type { RegionDef } from "../engine/regions";

export type AudioState = "off" | "loading" | "on";

/**
 * Whether sounds play now: from the first gesture on, also while the region's instrument
 * loads (the previous instrument, or a plain synth, stands in meanwhile).
 */
function playable(state: AudioState): boolean {
  return state !== "off" && isAudioStarted();
}

/** Cathedral: how long a note keeps ringing after you step off it. */
const ECHO_MS = 900;
/**
 * At most this many notes ring on after you've left them: walking across the
 * keys otherwise stacked 7–8 neighbouring organ notes at full volume (mud).
 * The space itself is the organ's reverb; this is just the held tail.
 */
const MAX_ECHO_TAILS = 2;
/**
 * A step is a strike, not a held key: released after this long even if you
 * keep standing there. The instruments are synths, and most sustain for as
 * long as a note is held, so standing still would drone.
 */
const STEP_RING_MS = 450;
const STEP_VELOCITY = 0.75;
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
  /**
   * What the top-right display shows: the key's name, or the chord a band region played.
   * A store, not state: it changes on every footstep, and only the display reads it.
   */
  const [noteStore] = useState<ValueStore<string | null>>(() => createValueStore<string | null>(null));
  const setNote = noteStore.set;
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
        // a failed load still plays (the previous instrument, or the fallback synth) once the
        // context runs; the shared readiness says "failed" and the next gesture retries
        .catch(() => setState(isAudioStarted() ? "on" : "off"));
    },
    [regionRef, setState],
  );

  /**
   * Browsers only allow audio after a user gesture — call from one (every one: it also
   * resumes a context iOS suspended, and retries a start or load that got stuck).
   */
  const startAudio = useCallback(() => {
    void ensureAudioStarted().catch(() => {});
    if (audioRef.current === "off") {
      switchInstrument(regionRef.current.instrument);
    } else if (audioReadiness.get() === "failed") {
      instrumentChain.current = Promise.resolve(); // don't queue behind the load that hung
      switchInstrument(regionRef.current.instrument);
    }
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
  }, [setNote]);


  /** Let go of the notes your step is sounding (in the cathedral they ring on). */
  const releaseHeld = useCallback(() => {
    clearTimeout(holdTimer.current);
    const echo = regionRef.current.feature === "echo";
    for (const previous of held.current) {
      if (echo) {
        clearTimeout(echoTimers.current.get(previous));
        echoTimers.current.delete(previous);
        // make room: the oldest tail stops now (Map keeps insertion order)
        while (echoTimers.current.size >= MAX_ECHO_TAILS) {
          const [oldest, timer] = echoTimers.current.entries().next().value!;
          clearTimeout(timer);
          playNoteOff(oldest);
          echoTimers.current.delete(oldest);
        }
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
      setNote(midi === null ? null : midiToNoteName(midi));
      releaseHeld();
      if (midi === null) return;

      onStepRef.current(midi);
      debugSeam?.steps.push({ midi, t: performance.now() });
      if (!playable(audioRef.current)) return;

      // neon: steps are chord stabs in time with the house groove
      if (regionRef.current.music === "house" && isHousePlaying()) {
        setNote(houseStab(STEP_VELOCITY));
        debugSeam?.voices.push({ id: "house-stab", midi, t: performance.now() });
        return;
      }
      // the lounge: steps play your line on the vibraphone, over the trio
      if (regionRef.current.music === "jazz" && isLoungeBandPlaying()) {
        const played = playLoungeStep(STEP_VELOCITY);
        if (played) {
          setNote(played.chord.replace("^7", "M7"));
          debugSeam?.voices.push({ id: "lounge", midi: played.midi, t: performance.now() });
        }
        return;
      }
      // the key itself (in the cathedral it may still be ringing: restrike it cleanly)
      const ringing = echoTimers.current.get(midi);
      if (ringing) {
        clearTimeout(ringing);
        echoTimers.current.delete(midi);
        playNoteOff(midi);
      }
      playNoteOn(midi, STEP_VELOCITY);
      held.current = [midi];
      holdTimer.current = setTimeout(releaseHeld, STEP_RING_MS);
    },
    [onStepRef, regionRef, releaseHeld, setNote],
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
      // in the lounge everyone plays their own tune, and in the house the stabs follow the
      // groove: other players' raw keys would only clash with it
      if (regionRef.current.music) return;
      if (midi !== null && playable(audioRef.current)) {
        playNoteOn(midi, REMOTE_VELOCITY);
        remoteHeld.current.set(id, midi);
        remoteTimers.current.set(id, setTimeout(() => releaseRemote(id), STEP_RING_MS));
      }
    },
    [releaseRemote, regionRef],
  );

  /** The cat's footsteps, very soft (the scene only reports them when it's near). */
  const handleCatStep = useCallback((midi: number | null) => {
    if (catHeld.current !== null) playNoteOff(catHeld.current);
    catHeld.current = null;
    if (midi !== null && playable(audioRef.current)) {
      playNoteOn(midi, CAT_VELOCITY);
      catHeld.current = midi;
    }
  }, []);

  /** Notes started `gapMs` apart, all released after `holdMs`. */
  const chime = useCallback((notes: number[], velocity: number, gapMs: number, holdMs: number) => {
    if (!playable(audioRef.current)) return;
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
      stopHouse();
      stopLoungeBand();
      disposeVoices();
      if (getCurrentInstrumentId() === before) return;
      if (before) void loadInstrument(before);
      else disposeSampler();
    };
  }, [silence]);

  /** Start or stop the region's background music (call when the region or sound changes). */
  const syncMusic = useCallback((music: RegionDef["music"]) => {
    const on = audioRef.current === "on"; // the bands wait for the real instrument
    // one band at a time (they share the transport): stop the other first
    if (music !== "house") stopHouse();
    if (music !== "jazz") stopLoungeBand();
    if (on && music === "house") startHouse();
    if (on && music === "jazz") startLoungeBand();
  }, []);

  /** read synchronously in event handlers */
  const isOn = useCallback(() => playable(audioRef.current), []);

  /** A struck/plucked island sound (bridge, drums, pipes, harp, bell) — rings out on its own. */
  const voice = useCallback((id: VoiceId, midi: number, velocity: number, delay = 0) => {
    debugSeam?.voices.push({ id, midi, t: performance.now() });
    if (playable(audioRef.current)) playVoice(id, midi, velocity, delay);
  }, []);

  /** Warp stone sounds (waking, leaving, arriving). */
  const warpEffect = useCallback((kind: WarpEffect) => {
    debugSeam?.voices.push({ id: `warp:${kind}`, midi: 0, t: performance.now() });
    if (playable(audioRef.current)) playWarpEffect(kind);
  }, []);

  /** The storm temple's dragon: its roar before an attack, and the flames when they catch you. */
  const dragonEffect = useCallback((kind: DragonEffect) => {
    debugSeam?.voices.push({ id: `dragon:${kind}`, midi: 0, t: performance.now() });
    if (playable(audioRef.current)) playDragonEffect(kind);
  }, []);

  /** The bell tower's bell: one stroke, or midnight's twelve. */
  const towerBell = useCallback((strokes: number) => {
    debugSeam?.voices.push({ id: `tower-bell:${strokes}`, midi: 0, t: performance.now() });
    if (playable(audioRef.current)) playTowerBell(strokes);
  }, []);

  /** Chords in turn (the sky island's orrery). */
  const progression = useCallback((chords: readonly (readonly number[])[]) => {
    debugSeam?.voices.push({ id: "progression", midi: 0, t: performance.now() });
    if (playable(audioRef.current)) playChordProgression(chords);
  }, []);

  /** The note ball hit (or rolled onto) a key. */
  const handleBallNote = useCallback(
    (midi: number, velocity: number) => chime([midi], velocity, 0, 450),
    [chime],
  );

  return {
    audio,
    isOn,
    noteStore,
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
    dragonEffect,
    towerBell,
    progression,
    syncMusic,
  };
}
