"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { useCallbackRef } from "@/shared/lib/react/use-callback-ref";
import { TIME_SIGNATURE_CONFIGS } from "@/shared/lib/music/time-signature";
import type { TimeSignature } from "@/entities/chord-practice";

interface UseMetronomeOptions {
  bpm: number;
  timeSignature: TimeSignature;
  audioEnabled: boolean;
  onBeat?: (beat: number, isDownbeat: boolean) => void;
  onBarComplete?: (barCount: number) => void;
}

export function useMetronome({
  bpm,
  timeSignature,
  audioEnabled,
  onBeat,
  onBarComplete,
}: UseMetronomeOptions) {
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<Tone.Synth | null>(null);
  const eventIdRef = useRef<number | null>(null);
  const barCountRef = useRef(0);
  const onBeatRef = useCallbackRef(onBeat);
  const onBarCompleteRef = useCallbackRef(onBarComplete);

  const start = useCallback(() => {
    const config = TIME_SIGNATURE_CONFIGS[timeSignature];
    const transport = Tone.getTransport();

    transport.bpm.value = bpm * config.bpmMultiplier;
    transport.cancel();

    if (audioEnabled && !synthRef.current) {
      synthRef.current = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
        volume: -10,
      }).toDestination();
    }

    let beatIndex = 0;
    barCountRef.current = 0;

    eventIdRef.current = transport.scheduleRepeat(
      (time) => {
        const beatInBar = beatIndex % config.beatsPerBar;
        const isDownbeat = beatInBar === 0;

        if (audioEnabled && synthRef.current) {
          synthRef.current.triggerAttackRelease(
            isDownbeat ? "C6" : "C5",
            "32n",
            time
          );
        }

        Tone.getDraw().schedule(() => {
          setCurrentBeat(beatInBar);
          onBeatRef.current?.(beatInBar, isDownbeat);

          if (beatIndex > 0 && isDownbeat) {
            barCountRef.current++;
            onBarCompleteRef.current?.(barCountRef.current);
          }
        }, time);

        beatIndex++;
      },
      config.subdivision
    );

    transport.start();
    setIsPlaying(true);
  }, [bpm, timeSignature, audioEnabled, onBeatRef, onBarCompleteRef]);

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    if (synthRef.current) {
      synthRef.current.dispose();
      synthRef.current = null;
    }
    eventIdRef.current = null;
    barCountRef.current = 0;
    setCurrentBeat(-1);
    setIsPlaying(false);
  }, []);

  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    return () => {
      stopRef.current();
    };
  }, []);

  const beatsPerBar = TIME_SIGNATURE_CONFIGS[timeSignature].beatsPerBar;

  return { currentBeat, isPlaying, beatsPerBar, start, stop };
}
