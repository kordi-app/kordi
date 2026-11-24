"use client";

import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RemotePlayer } from "../net/protocol";
import { CASE_H, PRESS_DEPTH, keyAt, type KeyRange } from "../engine/layout";
import { DEFAULT_APPEARANCE, KordiModel, type Appearance, type KordiMotion } from "@/entities/character";
import { useLabelTexture } from "./label-texture";
import { EmoteBubble } from "./emote-bubble";
import type { EmoteId } from "../engine/interactables";

const SCALE = 1.6;
/** Name tags fade between these camera distances, so a crowd far off doesn't become a wall of labels */
const TAG_NEAR = 24;
const TAG_FAR = 40;
const TAG_MIN_OPACITY = 0.2;

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
  keys,
  glow = 0,
}: {
  id: string;
  name: string;
  remotes: RefObject<Map<string, RemotePlayer>>;
  /** on the jump course the floor is platforms, not keys */
  course: boolean;
  /** the region's stretch of keyboard */
  keys?: KeyRange;
  /** how dark it is here (a pet glows at night), kept current by the scene */
  glow?: number | RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const tag = useRef<THREE.SpriteMaterial>(null);
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0, emote: null, land: 0, stretch: 0, lean: 0, bank: 0 });
  const initial = remotes.current.get(id);
  const pos = useRef(new THREE.Vector3(initial?.x ?? 0, 0, initial?.z ?? 0));
  const heading = useRef(initial?.h ?? 0);
  const { texture, aspect } = useLabelTexture(name);
  // the emote bubble is React state, but only changes when the emote does
  const [emote, setEmote] = useState<EmoteId | null>(null);
  const emoteShown = useRef<EmoteId | null>(null);
  // their look, likewise: re-rendered only when it changes
  const [look, setLook] = useState<Appearance>(initial?.look ?? DEFAULT_APPEARANCE);
  const lookShown = useRef<Appearance | null | undefined>(initial?.look);

  useFrame(({ camera }, rawDelta) => {
    const target = remotes.current.get(id);
    if (!target || !group.current) return;
    const dt = Math.min(rawDelta, 0.05);
    const ease = 1 - Math.exp(-dt * 12);

    const beforeX = pos.current.x;
    const beforeZ = pos.current.z;
    pos.current.x = THREE.MathUtils.lerp(pos.current.x, target.x, ease);
    pos.current.z = THREE.MathUtils.lerp(pos.current.z, target.z, ease);
    // Use the reported height when the server relays it (jumps, the climb);
    // otherwise stand on whatever is underfoot
    let targetY = target.y;
    if (targetY === undefined) {
      const key = course ? null : keyAt(pos.current.x, pos.current.z, keys);
      targetY = key ? CASE_H + key.height - PRESS_DEPTH : 0;
    }
    const beforeY = pos.current.y;
    pos.current.y = THREE.MathUtils.lerp(pos.current.y, targetY, 1 - Math.exp(-dt * 18));

    const delta = ((target.h - heading.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    heading.current += delta * ease;

    const speed = Math.hypot(pos.current.x - beforeX, pos.current.z - beforeZ) / Math.max(dt, 1e-3);
    const m = motion.current;
    m.amount = THREE.MathUtils.lerp(m.amount, Math.min(speed / 3, 1), 1 - Math.exp(-dt * 10));
    m.phase += dt * 11 * m.amount;
    // rising fast reads as a jump (their pet spouts stars, like mine)
    m.stretch = THREE.MathUtils.clamp((pos.current.y - beforeY) / Math.max(dt, 1e-3) / 7.5, -0.4, 1);

    group.current.position.copy(pos.current);
    group.current.rotation.y = heading.current;
    if (tag.current) {
      const far = THREE.MathUtils.smoothstep(camera.position.distanceTo(pos.current), TAG_NEAR, TAG_FAR);
      tag.current.opacity = 1 - far * (1 - TAG_MIN_OPACITY);
    }
    m.emote = target.e ?? null;
    if (target.e !== emoteShown.current) {
      emoteShown.current = target.e ?? null;
      setEmote(emoteShown.current);
    }
    // every position update carries a fresh copy of the look: compare by value, then
    // remember this copy so the next frames short-circuit on reference
    if (target.look !== lookShown.current) {
      const changed = JSON.stringify(target.look) !== JSON.stringify(lookShown.current);
      lookShown.current = target.look;
      if (changed) setLook(target.look ?? DEFAULT_APPEARANCE);
    }
  });

  return (
    <group ref={group}>
      <KordiModel motion={motion} scale={SCALE} appearance={look} glow={glow} />
      {/* name tag floats above the head and always faces the camera */}
      <sprite position={[0, 2.55, 0]} scale={[0.42 * aspect, 0.42, 1]}>
        <spriteMaterial ref={tag} map={texture} transparent depthWrite={false} />
      </sprite>
      {/* keyed by emote so each new one pops in */}
      {emote ? <EmoteBubble key={emote} emote={emote} offsetY={3.15} /> : null}
    </group>
  );
}
