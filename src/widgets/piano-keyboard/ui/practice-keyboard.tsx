"use client";

import type { usePianoInput } from "@/features/piano-player";
import type { AnswerFeedback } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";
import { KeyboardBar } from "./keyboard-bar";
import { PianoKeyboard } from "./piano-keyboard";

type PianoInput = ReturnType<typeof usePianoInput>;

interface PracticeKeyboardProps {
  /** everything from usePianoInput(): notes, sound state, keyboard and mouse controls */
  input: PianoInput;
  /** chord modes ring the keyboard on a right/wrong answer */
  feedback?: AnswerFeedback;
  /** show velocity and the sustain pedal in the bar (where playing is musical) */
  showDynamics?: boolean;
  startMidi?: number;
  endMidi?: number;
  /** notes to show as "should be ringing" (score practice) */
  ringingNotes?: number[];
  /** a chord's tones shown as a hint (chord practice, after a miss or a long wait) */
  hintNotes?: number[];
}

/**
 * The bottom of every practice mode: the sound/controls strip and the keyboard
 * under it, sharing one width (the keyboard's, or the page's if it scrolls).
 */
export function PracticeKeyboard({
  input,
  feedback = null,
  showDynamics = false,
  startMidi,
  endMidi,
  ringingNotes,
  hintNotes,
}: PracticeKeyboardProps) {
  const { activeNotes, isAudioStarted, isLoaded, keyboard, mouse, sound } = input;

  return (
    <div className="mx-auto w-fit max-w-full">
      <KeyboardBar
        loading={isAudioStarted && !isLoaded}
        octave={keyboard.octave}
        velocity={showDynamics ? keyboard.velocity : undefined}
        sustain={showDynamics ? keyboard.sustain : undefined}
        isMuted={sound.isMuted}
        onToggleMute={sound.toggleMute}
      />
      <div
        className={cn(
          "w-full rounded-lg transition-all duration-200",
          feedback === "correct" && "ring-2 ring-ring",
          feedback === "incorrect" && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
      >
        <PianoKeyboard
          startMidi={startMidi}
          endMidi={endMidi}
          activeNotes={activeNotes}
          ringingNotes={ringingNotes}
          hintNotes={hintNotes}
          onNoteOn={mouse.onNoteOn}
          onNoteOff={mouse.onNoteOff}
          showShortcuts
          octave={keyboard.octave}
        />
      </div>
    </div>
  );
}
