import { ROSETTE, cathedralRuntime, dwellAmen, resetAmen } from "../../engine/cathedral";
import { groundAt } from "../../engine/physics";
import type { FrameContext } from "./context";

/**
 * The cathedral's rose opens to C major, rolled upward note by note like a harp
 * rather than struck at once, over two soft low bells
 */
const ROSE_ARPEGGIO = [72, 76, 79, 84, 88, 91, 96];
const ROSE_ROLL = 0.11;
const ROSE_BELLS = [48, 60];

/** Coming into the cathedral: a fresh phrase each visit, the windows dark. (The decor reads the same runtime.) */
export const enterCathedral = () => resetAmen();

/**
 * In the cathedral, after you've moved: a note of the rose's phrase counts
 * once you've stood on it a beat (engine/cathedral.ts). A pane lights with a
 * chime; the last opens the rose.
 */
export function stepCathedralFrame(ctx: FrameContext) {
  const { s, now, region, events, fx } = ctx;
  const midi = s.airborne ? null : groundAt(region, s.pos.x, s.pos.z, s.pos.y).midi;
  const amen = dwellAmen(cathedralRuntime, midi, now);
  if (amen?.kind === "pane") {
    // a pane lights with a clear chime two octaves up, a quiet bell under it
    events.onVoice("crystal", amen.midi + 24, 0.4);
    events.onVoice("bell", amen.midi + 12, 0.18, 0.03);
  }
  if (amen?.kind === "bloom") {
    ROSE_ARPEGGIO.forEach((note, i) => events.onVoice("crystal", note, 0.45 - i * 0.03, i * ROSE_ROLL));
    ROSE_BELLS.forEach((note, i) => events.onVoice("bell", note, 0.3, 0.05 + i * 0.4));
    fx?.lantern(ROSETTE.x, 0, ROSETTE.z);
  }
}
