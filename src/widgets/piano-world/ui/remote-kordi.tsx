"use client";

import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RemotePlayer } from "../model/use-world-presence";
import { CASE_H, PRESS_DEPTH, keyAt } from "../model/layout";
import { KordiModel, type KordiMotion } from "./kordi-model";
import { useLabelTexture } from "./label-texture";
import { EmoteBubble } from "./emote-bubble";
import type { EmoteId } from "../model/interactables";

const SCALE = 1.6;

/**
 * Another visitor's Kordi. Network updates arrive ~10×/s; the model eases
 * toward the latest one every frame so motion stays smooth, and the walk
 * cycle is driven by how fast it is actually moving.
 */
export function RemoteKordi({
  id,
  name,
  remotes,
  course,
}: {
  id: string;
  name: string;
  remotes: RefObject<Map<string, RemotePlayer>>;
  /** on the jump course the floor is platforms, not keys */
  course: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0, emote: null });
  const initial = remotes.current.get(id);
  const pos = useRef(new THREE.Vector3(initial?.x ?? 0, 0, initial?.z ?? 0));
  const heading = useRef(initial?.h ?? 0);
  const { texture, aspect } = useLabelTexture(name);
  // the emote bubble is React state, but only changes when the emote does
  const [emote, setEmote] = useState<EmoteId | null>(null);
  const emoteShown = useRef<EmoteId | null>(null);

  useFrame((_, rawDelta) => {
    const target = remotes.current.get(id);
    if (!target || !group.current) return;
    const dt = Math.min(rawDelta, 0.05);
    const ease = 1 - Math.exp(-dt * 12);

    const before = pos.current.clone();
    pos.current.x = THREE.MathUtils.lerp(pos.current.x, target.x, ease);
    pos.current.z = THREE.MathUtils.lerp(pos.current.z, target.z, ease);
    // Use the reported height when the server relays it (jumps, the climb);
    // otherwise stand on whatever is underfoot
    let targetY = target.y;
    if (targetY === undefined) {
      const key = course ? null : keyAt(pos.current.x, pos.current.z);
      targetY = key ? CASE_H + key.height - PRESS_DEPTH : 0;
    }
    pos.current.y = THREE.MathUtils.lerp(pos.current.y, targetY, 1 - Math.exp(-dt * 18));

    const delta = ((target.h - heading.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    heading.current += delta * ease;

    const speed = Math.hypot(pos.current.x - before.x, pos.current.z - before.z) / Math.max(dt, 1e-3);
    const m = motion.current;
    m.amount = THREE.MathUtils.lerp(m.amount, Math.min(speed / 3, 1), 1 - Math.exp(-dt * 10));
    m.phase += dt * 11 * m.amount;

    group.current.position.copy(pos.current);
    group.current.rotation.y = heading.current;
    m.emote = target.e ?? null;
    if (target.e !== emoteShown.current) {
      emoteShown.current = target.e ?? null;
      setEmote(emoteShown.current);
    }
  });

  return (
    <group ref={group}>
      <KordiModel motion={motion} scale={SCALE} />
      {/* name tag floats above the head and always faces the camera */}
      <sprite position={[0, 2.55, 0]} scale={[0.42 * aspect, 0.42, 1]}>
        <spriteMaterial map={texture} transparent depthWrite={false} />
      </sprite>
      {emote ? <EmoteBubble emote={emote} offsetY={3.15} /> : null}
    </group>
  );
}
