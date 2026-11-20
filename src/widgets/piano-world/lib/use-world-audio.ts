"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  disposeSampler,
  disposeVoices,
  houseStab,
  isHousePlaying,
  startHouse,
  stopHouse,
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
import { CHORUS_KEYS, SONGBOOK, voiceChord, type Song } from "../model/standards";
import { debugSeam } from "./debug-seam";
import type { RegionDef } from "../model/regions";

export type AudioState = "off" | "loading" | "on";

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
/** The lounge: the comping chord sits under the melody */
const COMP_VELOCITY = 0.36;
/** a chord rings at most this long if you stop walking */
const COMP_RING_MS = 2200;
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
  /** the lounge's place in the songbook, and the chord sounding under the melody */
  const standards = useRef({ song: 0, event: 0, chorus: 0 });
  const comp = useRef<number[]>([]);
  const compTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [song, setSong] = useState<Song>(SONGBOOK[0]);
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
    clearTimeout(compTimer.current);
    comp.current.forEach(playNoteOff);
    comp.current = [];
    setNote(null);
  }, []);

  /**
   * The lounge: whatever key you step on, the next note of the tune plays, and
   * where the harmony changes its chord is voiced underneath. At the end of a
   * chorus the tune moves to a new key; after all keys, on to the next song.
   */
  const nextStandardsNotes = useCallback((): number[] => {
    const at = standards.current;
    const tune = SONGBOOK[at.song];
    const shift = CHORUS_KEYS[at.chorus];
    const event = tune.events[at.event];
    if (event.chord) {
      clearTimeout(compTimer.current);
      comp.current.forEach(playNoteOff);
      const sounding = voiceChord(event.chord, shift);
      comp.current = sounding;
      sounding.forEach((n) => playNoteOn(n, COMP_VELOCITY));
      compTimer.current = setTimeout(() => {
        sounding.forEach(playNoteOff);
        if (comp.current === sounding) comp.current = [];
      }, COMP_RING_MS);
    }
    // advance: next note, next chorus (new key), next song
    at.event += 1;
    if (at.event >= tune.events.length) {
      at.event = 0;
      at.chorus += 1;
      if (at.chorus >= CHORUS_KEYS.length) {
        at.chorus = 0;
        at.song = (at.song + 1) % SONGBOOK.length;
        setSong(SONGBOOK[at.song]);
      }
    }
    return [event.midi + shift];
  }, []);

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
      setNote(midi);
      const feature = regionRef.current.feature;
      releaseHeld();
      if (midi === null) return;

      onStepRef.current(midi);
      debugSeam?.steps.push({ midi, t: performance.now() });
      if (audioRef.current !== "on") return;

      // neon: steps are chord stabs in time with the house groove
      if (regionRef.current.music === "house" && isHousePlaying()) {
        houseStab(STEP_VELOCITY);
        debugSeam?.voices.push({ id: "house-stab", midi, t: performance.now() });
        return;
      }
      const notes = feature === "standards" ? nextStandardsNotes() : [midi];
      if (feature === "standards") debugSeam?.voices.push({ id: "lounge", midi: notes[0], t: performance.now() });
      notes.forEach((n, i) => {
        const ringing = echoTimers.current.get(n);
        if (ringing) {
          clearTimeout(ringing);
          echoTimers.current.delete(n);
          playNoteOff(n); // restrike cleanly
        }
        playNoteOn(n, i === 0 ? STEP_VELOCITY : COMP_VELOCITY);
      });
      held.current = notes;
      holdTimer.current = setTimeout(releaseHeld, STEP_RING_MS);
    },
    [onStepRef, regionRef, releaseHeld, nextStandardsNotes],
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
      if (regionRef.current.feature === "standards" || regionRef.current.music) return;
      if (midi !== null && audioRef.current === "on") {
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
      stopHouse();
      disposeVoices();
      if (getCurrentInstrumentId() === before) return;
      if (before) void loadInstrument(before);
      else disposeSampler();
    };
  }, [silence]);

  /** Start or stop the region's background music (call when the region or sound changes). */
  const syncMusic = useCallback((music: RegionDef["music"]) => {
    if (music === "house" && audioRef.current === "on") startHouse();
    else stopHouse();
  }, []);

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
    /** the lounge's current tune */
    song,
    syncMusic,
  };
}
