import type { useWorldAudio } from "../../audio/use-world-audio";
import type { PianoWorldCopy } from "../copy";

/**
 * What a region's event handlers use to answer the player: sounds, a line in
 * the speech bubble, confetti, the copy. Built once in the scene and handed
 * to each region's hook (use-sky-events, use-dream-events, use-cave-events).
 */
export interface WorldFeedback {
  copy: PianoWorldCopy;
  audio: Pick<ReturnType<typeof useWorldAudio>, "voice" | "progression" | "towerBell" | "warpEffect">;
  /** a line in the speech bubble */
  say: (text: string) => void;
  /** confetti over Kordi */
  celebrate: () => void;
}
