"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { EmoteId } from "../model/interactables";
import { EMOTE_ICON } from "../model/interactables";
import { useLabelTexture } from "./label-texture";

const SIZE = 0.55;
/** seconds for the pop-in */
const POP = 0.32;

/**
 * The emoji for an emote, floating above a character (place it with a parent
 * group). It pops in with a little overshoot, then bobs gently while shown.
 * Remount it (key by emote) to replay the pop.
 */
export function EmoteBubble({ emote, offsetY = 0 }: { emote: EmoteId; offsetY?: number }) {
  const { texture, aspect } = useLabelTexture(EMOTE_ICON[emote]);
  const sprite = useRef<THREE.Sprite>(null);
  /** seconds since this bubble appeared */
  const age = useRef(0);

  useFrame((_, rawDelta) => {
    const s = sprite.current;
    if (!s) return;
    age.current += Math.min(rawDelta, 0.05);
    const a = age.current;
    // back-out ease: rises past full size, then settles
    const k = Math.min(1, a / POP);
    const pop = k < 1 ? 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2 : 1;
    const bob = Math.sin(a * 3) * 0.05;
    s.position.y = offsetY + bob + (1 - k) * -0.2;
    s.scale.set(SIZE * aspect * pop, SIZE * pop, 1);
  });

  return (
    <sprite ref={sprite} position={[0, offsetY, 0]} scale={[0, 0, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
