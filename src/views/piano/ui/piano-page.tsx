"use client";

import { useEffect, useRef } from "react";
import { usePianoInput, InstrumentSelector } from "@/features/piano-player";
import {
  AudioStartPrompt,
  ChordDisplay,
  MidiStatus,
  PianoKeyboard,
} from "@/widgets/piano-keyboard";
import { useTranslations } from "next-intl";

// Full 88-key range (A0–C8) so real digital pianos highlight every key
const KEYBOARD_START_MIDI = 21;
const KEYBOARD_END_MIDI = 108;

export function PianoPage() {
  const t = useTranslations("piano");

  const {
    activeNotes,
    ringingNotes,
    isAudioStarted,
    isLoaded,
    startAudio,
    keyboard,
    midi,
    mouse,
    sound,
  } = usePianoInput();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Start scrolled to the middle of the 88-key strip (around middle C)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [isAudioStarted]);

  if (!isAudioStarted) {
    return (
      <AudioStartPrompt
        title={t("clickToStart")}
        description={t("audioDescription")}
        onStart={startAudio}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10 md:py-14">
      <MidiStatus
        midiName={midi.selectedDevice?.name}
        fallback={t("noMidiDevice")}
        devices={midi.devices}
        selectedDeviceId={midi.selectedDeviceId}
        onSelectDevice={midi.selectDevice}
      />

      <div className="mb-4 w-full max-w-4xl">
        <InstrumentSelector />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <ChordDisplay activeNotes={activeNotes} ringingNotes={ringingNotes} />

        {!isLoaded && (
          <div className="mt-4 text-sm opacity-60">{t("loadingSamples")}</div>
        )}
      </div>

      <div className="mb-12 w-full max-w-6xl">
        <KeyboardStatusBar
          octave={keyboard.octave}
          velocity={keyboard.velocity}
          sustain={keyboard.sustain}
          isMuted={sound.isMuted}
          onToggleMute={sound.toggleMute}
        />

        <div ref={scrollRef} className="w-full overflow-x-auto pb-2">
          <div className="min-w-[1800px]">
            <PianoKeyboard
              startMidi={KEYBOARD_START_MIDI}
              endMidi={KEYBOARD_END_MIDI}
              activeNotes={activeNotes}
              ringingNotes={ringingNotes}
              onNoteOn={mouse.onNoteOn}
              onNoteOff={mouse.onNoteOff}
              showShortcuts
              octave={keyboard.octave}
              className="max-w-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs opacity-60">
        <p>{t("instructions")}</p>
      </div>
    </main>
  );
}

function KeyboardStatusBar({
  octave,
  velocity,
  sustain,
  isMuted,
  onToggleMute,
}: {
  octave: number;
  velocity: number;
  sustain: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-end gap-3 text-xs">
      <button
        type="button"
        onClick={onToggleMute}
        className={`cursor-pointer rounded border border-border px-2.5 py-1 font-semibold uppercase tracking-widest transition-colors ${
          isMuted ? "bg-card text-foreground opacity-60" : "bg-primary text-primary-foreground"
        }`}
      >
        Sound {isMuted ? "OFF" : "ON"}
      </button>
      <span className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold uppercase">
        Oct: <span className="font-semibold">{octave}</span>
        <span className="ml-1 opacity-40">[Z/X]</span>
      </span>
      <span className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold uppercase">
        Vel: <span className="font-semibold">{velocity}</span>
        <span className="ml-1 opacity-40">[C/V]</span>
      </span>
      <span
        className={`rounded-lg border border-border px-2.5 py-1 font-semibold uppercase transition-colors ${
          sustain ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
        }`}
      >
        Sustain {sustain ? "ON" : "OFF"}
        <span className="ml-1 opacity-40">[Tab]</span>
      </span>
    </div>
  );
}
