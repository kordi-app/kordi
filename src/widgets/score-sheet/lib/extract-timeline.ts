import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { ScoreGroup, ScoreNote, ScoreTimeline } from "@/entities/score";

/** OSMD numbers pitches from C0 = 0; MIDI puts C-1 there (middle C: 48 → 60). */
const HALF_TONE_TO_MIDI = 12;
const FALLBACK_BPM = 80;

/**
 * Walk the loaded sheet the way its cursor will, collecting what starts at
 * each step. Tie continuations are folded into their first note; grace notes
 * are left out (they have no beat of their own to be judged on).
 */
export function extractTimeline(osmd: OpenSheetMusicDisplay): ScoreTimeline {
  const sheet = osmd.Sheet;
  const it = sheet.MusicPartManager.getIterator();
  const groups: ScoreGroup[] = [];
  let endBeat = 0;

  while (!it.EndReached) {
    const beat = it.currentTimeStamp.RealValue * 4;
    const notes: ScoreNote[] = [];
    for (const entry of it.CurrentVoiceEntries) {
      if (entry.IsGrace) continue;
      for (const note of entry.Notes) {
        if (note.isRest() || !note.Pitch) continue;
        const tie = note.NoteTie;
        if (tie && tie.StartNote !== note) continue;
        const length = (tie ? tie.Duration.RealValue : note.Length.RealValue) * 4;
        notes.push({
          midi: note.halfTone + HALF_TONE_TO_MIDI,
          staff: note.ParentStaffEntry.ParentStaff.idInMusicSheet,
          beat,
          length,
        });
        endBeat = Math.max(endBeat, beat + length);
      }
    }
    groups.push({ beat, notes });
    it.moveToNext();
  }

  const bpm = sheet.DefaultStartTempoInBpm > 0 ? sheet.DefaultStartTempoInBpm : FALLBACK_BPM;
  return { groups, bpm, endBeat };
}
