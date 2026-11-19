"use client";

import type { EmoteId } from "../model/interactables";
import { EMOTE_ICON } from "../model/interactables";
import { useLabelTexture } from "./label-texture";

/** The emoji for an emote, floating above a character (place it with a parent group). */
export function EmoteBubble({ emote, offsetY = 0 }: { emote: EmoteId; offsetY?: number }) {
  const { texture, aspect } = useLabelTexture(EMOTE_ICON[emote]);
  return (
    <sprite position={[0, offsetY, 0]} scale={[0.55 * aspect, 0.55, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
