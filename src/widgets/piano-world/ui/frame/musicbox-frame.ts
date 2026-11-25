import { startMusicBox, stepMusicBox, toothOf } from "../../engine/music-box";
import { groundAt } from "../../engine/physics";
import { TERRAINS } from "../../engine/terrains";
import type { FrameContext } from "./context";

/** Coming into the music box: it has forgotten its tune again. (The page's own arrival is use-musicbox-events' enter.) */
export const resetMusicBoxFrame = () => startMusicBox();

/**
 * Inside the music box, after you've moved: which tooth of the comb is under
 * your feet, and whether that step carries the tune on. (The tooth's own note
 * is the world's doing — any terrain solid with a `sound` plays when you step
 * onto it; this only keeps count.)
 */
export function stepMusicBoxFrame(ctx: FrameContext) {
  const { s, now, region, events, fx } = ctx;
  const solid = s.airborne ? null : groundAt(region, s.pos.x, s.pos.z, s.pos.y).solid;
  const tooth = solid === null ? null : toothOf(TERRAINS.musicbox.solids[solid]);
  for (const event of stepMusicBox(tooth, now)) {
    // the tune's end celebrates on the page's side (confetti there), so only steps ripple here
    if (event.kind === "step") fx?.ripple(s.pos.x, s.pos.y, s.pos.z, region.theme.accent);
    events.onMusicBox(event);
  }
}
