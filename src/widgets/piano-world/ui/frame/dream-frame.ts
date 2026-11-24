import { startDream, stepDream } from "../../engine/dream-sea";
import type { FrameContext } from "./context";

/** Coming into the dream sea: a fresh visit (no notes found yet). */
export const enterDream = () => startDream();

/** The dream sea, after you've moved: a lost note found, or the whale come to sing. */
export function stepDreamFrame(ctx: FrameContext) {
  const { s, now, events, fx } = ctx;
  for (const event of stepDream(s.pos.x, s.pos.y, s.pos.z, now)) {
    fx?.confetti(s.pos.x, s.pos.y, s.pos.z);
    events.onDream(event);
  }
}
