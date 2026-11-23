"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePianoInput, InstrumentSelector } from "@/features/piano-player";
import {
  AudioStartPrompt,
  ChordDisplay,
  KeyboardBar,
  KeySelect,
  MidiStatus,
  PianoKeyboard,
} from "@/widgets/piano-keyboard";
import type { KeySignature } from "@/shared/lib/music";

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

  const [musicKey, setMusicKey] = useState<KeySignature | null>(null);
  return (
    <main className="flex flex-1 flex-col px-page-x pt-4 pb-page-y md:px-page-x-wide md:pt-5">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <InstrumentSelector />
        <div className="flex items-center gap-3">
          <KeySelect
            value={musicKey}
            onChange={setMusicKey}
            label={t("key")}
            autoLabel={t("autoKey")}
          />
          <MidiStatus
            inline
            midiName={midi.selectedDevice?.name}
            fallback={t("noMidiDevice")}
            devices={midi.devices}
            selectedDeviceId={midi.selectedDeviceId}
            onSelectDevice={midi.selectDevice}
          />
        </div>
      </div>

      <div className="flex min-h-48 flex-1 flex-col items-center justify-center">
        <ChordDisplay
          activeNotes={activeNotes}
          ringingNotes={ringingNotes}
          musicKey={musicKey}
          placeholder={t("playHint")}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <KeyboardBar
          loading={isAudioStarted && !isLoaded}
          octave={keyboard.octave}
          velocity={keyboard.velocity}
          sustain={keyboard.sustain}
          isMuted={sound.isMuted}
          onToggleMute={sound.toggleMute}
        />

        <div className="relative">
          {!isAudioStarted ? (
            <AudioStartPrompt
              variant="overlay"
              title={t("clickToStart")}
              description={t("audioDescription")}
              onStart={startAudio}
            />
          ) : null}
          {/* all 88 keys: the keyboard scrolls itself, starting around middle C */}
          <PianoKeyboard
            startMidi={KEYBOARD_START_MIDI}
            endMidi={KEYBOARD_END_MIDI}
            activeNotes={activeNotes}
            ringingNotes={ringingNotes}
            onNoteOn={mouse.onNoteOn}
            onNoteOff={mouse.onNoteOff}
            showShortcuts
            octave={keyboard.octave}
            className="pb-2"
          />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("instructions")}
        </p>
      </div>
    </main>
  );
}
