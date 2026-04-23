"use client";

import { useTranslations } from "next-intl";
import { Piano } from "lucide-react";
import { usePianoInput } from "@/features/piano-player";
import { PianoKeyboard, ChordDisplay } from "@/widgets/piano-keyboard";
import { InstrumentSelector } from "@/shared/ui/instrument-selector";

export function PianoPage() {
  const t = useTranslations("piano");

  const { activeNotes, isAudioStarted, isLoaded, startAudio, keyboard, midi, mouse } =
    usePianoInput();

  if (!isAudioStarted) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <button
          onClick={startAudio}
          className="group flex flex-col items-center gap-4 rounded-lg border border-black bg-white px-12 py-10 transition-all hover:bg-black hover:text-white"
        >
          <div className="flex size-16 items-center justify-center rounded-lg border border-black bg-black text-white transition-all group-hover:bg-white group-hover:text-black">
            <Piano className="size-8" strokeWidth={1.75} />
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-bold uppercase tracking-wider">
              {t("clickToStart")}
            </p>
            <p className="mt-1 text-sm opacity-70">{t("audioDescription")}</p>
          </div>
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center overflow-y-auto p-6">
      {/* MIDI Status */}
      <div className="mb-4 flex w-full max-w-4xl justify-end">
        {midi.selectedDevice ? (
          <span className="flex items-center gap-1.5 rounded-full border border-black bg-black px-3 py-1 text-xs font-bold uppercase text-white">
            <span className="size-1.5 rounded-full bg-white" />
            {midi.selectedDevice.name}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-black bg-white px-3 py-1 text-xs font-bold uppercase text-black">
            <span className="size-1.5 rounded-full bg-black opacity-40" />
            {t("noMidiDevice")}
          </span>
        )}
      </div>

      {/* Instrument Selector */}
      <div className="mb-4 w-full max-w-4xl">
        <InstrumentSelector />
      </div>

      {/* Chord Display */}
      <ChordDisplay activeNotes={activeNotes} />

      {/* Loading */}
      {!isLoaded && (
        <div className="mb-4 text-sm opacity-60">{t("loadingSamples")}</div>
      )}

      {/* Controls */}
      <div className="mb-4 flex items-center gap-3 text-xs">
        <span className="rounded-lg border border-black bg-white px-2.5 py-1 font-bold uppercase">
          Oct: <span className="font-black">{keyboard.octave}</span>
          <span className="ml-1 opacity-40">[Z/X]</span>
        </span>
        <span className="rounded-lg border border-black bg-white px-2.5 py-1 font-bold uppercase">
          Vel: <span className="font-black">{keyboard.velocity}</span>
          <span className="ml-1 opacity-40">[C/V]</span>
        </span>
        <span
          className={`rounded-lg border border-black px-2.5 py-1 font-bold uppercase ${
            keyboard.sustain ? "bg-black text-white" : "bg-white text-black"
          }`}
        >
          Sustain {keyboard.sustain ? "ON" : "OFF"}
          <span className="ml-1 opacity-40">[Tab]</span>
        </span>
      </div>

      {/* Piano Keyboard */}
      <div className="w-full max-w-4xl">
        <PianoKeyboard
          activeNotes={activeNotes}
          onNoteOn={mouse.onNoteOn}
          onNoteOff={mouse.onNoteOff}
          showShortcuts={true}
          octave={keyboard.octave}
        />
      </div>

      {/* Instructions */}
      <div className="mt-8 text-center text-xs opacity-60">
        <p>{t("instructions")}</p>
      </div>
    </main>
  );
}
