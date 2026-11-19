"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHORD_CARD_COUNT, chordCard, type ChordCard } from "../model/chord-cards";
import type { PianoWorldCopy } from "../model/copy";
import type { InteractableId } from "../model/interactables";
import { FUR_ELISE, MUSIC_BOX, playSequence } from "../model/sequencer";

/** Overlay panels opened by interactables */
export type Panel = { kind: "chordCard"; card: ChordCard } | { kind: "wish" };

/** What the world shows in response to interactions (passed to the 3D scene) */
export interface InteractionScene {
  petting: boolean;
  party: boolean;
  musicBoxPlaying: boolean;
  jukeboxPlaying: boolean;
  /** bumped to fire hearts over the cat */
  hearts: number;
  /** bumped to send a lantern up from the music box */
  lantern: number;
}

interface AudioApi {
  startAudio: () => void;
  isOn: () => boolean;
  chime: (notes: number[], velocity: number, gapMs: number, holdMs: number) => void;
}

const SPEECH_MS = 3500;
const TIP_MS = 5000;
const PETTING_MS = 1600;
const PARTY_MS = 8000;
const PURR = [88, 91];

/**
 * Walk-up interactions: which interactable is in reach, what happens when you
 * use it, and the transient UI it produces (speech, panels, tunes, effects).
 */
export function useInteractions(copy: PianoWorldCopy, audio: AudioApi, onCelebrate: () => void) {
  const [nearby, setNearbyState] = useState<InteractableId | null>(null);
  const nearbyRef = useRef<InteractableId | null>(null);
  const [panel, setPanelState] = useState<Panel | null>(null);
  const panelRef = useRef<Panel | null>(null);
  const [speech, setSpeech] = useState<string | null>(null);
  const [scene, setScene] = useState<InteractionScene>({
    petting: false,
    party: false,
    musicBoxPlaying: false,
    jukeboxPlaying: false,
    hearts: 0,
    lantern: 0,
  });
  const stopTune = useRef<(() => void) | null>(null);
  const draws = useRef({ tip: 0, reaction: 0 });
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /** One named timer per purpose: restarting replaces the old one */
  const after = useCallback((name: string, ms: number, fn: () => void) => {
    clearTimeout(timers.current.get(name));
    timers.current.set(name, setTimeout(fn, ms));
  }, []);

  const patch = useCallback((partial: Partial<InteractionScene>) => {
    setScene((current) => ({ ...current, ...partial }));
  }, []);

  const setNearby = useCallback((id: InteractableId | null) => {
    nearbyRef.current = id;
    setNearbyState(id);
  }, []);

  const setPanel = useCallback((next: Panel | null) => {
    panelRef.current = next;
    setPanelState(next);
  }, []);

  const say = useCallback(
    (text: string, ms = SPEECH_MS) => {
      setSpeech(text);
      after("speech", ms, () => setSpeech(null));
    },
    [after],
  );

  const stopMusic = useCallback(() => {
    stopTune.current?.();
    stopTune.current = null;
    patch({ jukeboxPlaying: false, musicBoxPlaying: false });
  }, [patch]);

  const strum = useCallback((midi: number[]) => audio.chime(midi, 0.55, 90, 2200), [audio]);

  const interact = useCallback(
    (id: InteractableId) => {
      audio.startAudio();
      switch (id) {
        case "cat":
          setScene((s) => ({ ...s, petting: true, hearts: s.hearts + 1 }));
          say(copy.catReactions[draws.current.reaction++ % copy.catReactions.length]);
          audio.chime(PURR, 0.25, 140, 700);
          after("petting", PETTING_MS, () => patch({ petting: false }));
          break;
        case "chordCard": {
          // a fresh random card per press (event-time randomness)
          const card = chordCard(Math.floor(Math.random() * CHORD_CARD_COUNT));
          setPanel({ kind: "chordCard", card });
          strum(card.midi);
          break;
        }
        case "teacher":
          say(copy.teacherTips[draws.current.tip++ % copy.teacherTips.length], TIP_MS);
          break;
        case "musicBox":
          setPanel({ kind: "wish" });
          break;
        case "jukebox":
          if (stopTune.current) {
            stopMusic();
          } else {
            patch({ jukeboxPlaying: true });
            stopTune.current = playSequence(FUR_ELISE, 132, 0.55, () => {
              stopTune.current = null;
              patch({ jukeboxPlaying: false });
            });
            say(copy.jukeboxNowPlaying);
          }
          break;
        case "discoBall":
          patch({ party: true });
          onCelebrate();
          after("party", PARTY_MS, () => patch({ party: false }));
          break;
      }
    },
    [after, audio, copy, onCelebrate, patch, say, setPanel, stopMusic, strum],
  );

  /** The wish text is never sent or stored — it only ever lived in the panel's textarea. */
  const sendWish = useCallback(() => {
    setPanel(null);
    stopMusic();
    setScene((s) => ({ ...s, lantern: s.lantern + 1, musicBoxPlaying: true }));
    stopTune.current = playSequence(MUSIC_BOX, 150, 0.4, () => {
      stopTune.current = null;
      patch({ musicBoxPlaying: false });
    });
    say(copy.wishSent);
  }, [copy, patch, say, setPanel, stopMusic]);

  /** Leaving a region: close panels and stop tunes. */
  const reset = useCallback(() => {
    setPanel(null);
    stopMusic();
  }, [setPanel, stopMusic]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      stopTune.current?.();
    };
  }, []);

  return {
    nearby,
    nearbyRef,
    setNearby,
    panel,
    panelRef,
    setPanel,
    speech,
    scene,
    interact,
    strum,
    sendWish,
    reset,
  };
}
