"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";
import { usePianoInput, InstrumentSelector } from "@/features/piano-player";
import {
  AudioStartPrompt,
  ChordDisplay,
  KeySelect,
  MidiStatus,
  PianoKeyboard,
} from "@/widgets/piano-keyboard";
import type { KeySignature } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";

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
    <main className="flex flex-1 flex-col px-4 pb-10 pt-2 md:px-8">
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
        {isAudioStarted && !isLoaded ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("loadingSamples")}</p>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <KeyboardStatusBar
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-background px-1 font-sans text-t1 text-muted-foreground">
      {children}
    </kbd>
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
  const t = useTranslations("piano");
  const chip =
    "flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground";

  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
      <span className={chip}>
        {t("octave")} <span className="font-medium tabular-nums">{octave}</span>
        <Kbd>Z</Kbd>
        <Kbd>X</Kbd>
      </span>
      <span className={chip}>
        {t("velocity")} <span className="font-medium tabular-nums">{velocity}</span>
        <Kbd>C</Kbd>
        <Kbd>V</Kbd>
      </span>
      <span
        className={cn(
          chip,
          "transition-colors",
          sustain && "border-foreground/30 bg-foreground text-background",
        )}
      >
        {t("sustain")}
        <Kbd>Tab</Kbd>
      </span>
      <button
        type="button"
        onClick={onToggleMute}
        aria-pressed={isMuted}
        aria-label={isMuted ? t("soundOff") : t("soundOn")}
        title={isMuted ? t("soundOff") : t("soundOn")}
        className={cn(
          chip,
          "px-2 hover:bg-muted",
          isMuted && "text-muted-foreground",
        )}
      >
        {isMuted ? (
          <VolumeX className="size-4" />
        ) : (
          <Volume2 className="size-4" />
        )}
      </button>
    </div>
  );
}
