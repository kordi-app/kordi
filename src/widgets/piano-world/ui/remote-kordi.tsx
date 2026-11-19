"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RemotePlayer } from "../model/use-world-presence";
import { CASE_H, PRESS_DEPTH, keyAt } from "../model/layout";
import { KordiModel, type KordiMotion } from "./kordi-model";

const SCALE = 1.6;

/** Canvas-texture sprite with the player's name, so no font loader is needed. */
function useNameTexture(name: string) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "600 44px Pretendard Variable, Pretendard, system-ui, sans-serif";
    ctx.font = font;
    const width = Math.ceil(ctx.measureText(name).width) + 48;
    canvas.width = width;
    canvas.height = 76;
    ctx.font = font;
    ctx.fillStyle = "rgba(252, 251, 248, 0.92)";
    ctx.beginPath();
    ctx.roundRect(0, 0, width, 76, 38);
    ctx.fill();
    ctx.fillStyle = "#2a2521";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, width / 2, 40);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, aspect: width / 76 };
  }, [name]);
}

/**
 * Another visitor's Kordi. Network updates arrive ~10×/s; the model eases
 * toward the latest one every frame so motion stays smooth, and the walk
 * cycle is driven by how fast it is actually moving.
 */
export function RemoteKordi({
  id,
  name,
  remotes,
}: {
  id: string;
  name: string;
  remotes: RefObject<Map<string, RemotePlayer>>;
}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0 });
  const initial = remotes.current.get(id);
  const pos = useRef(new THREE.Vector3(initial?.x ?? 0, 0, initial?.z ?? 0));
  const heading = useRef(initial?.h ?? 0);
  const { texture, aspect } = useNameTexture(name);

  useFrame((_, rawDelta) => {
    const target = remotes.current.get(id);
    if (!target || !group.current) return;
    const dt = Math.min(rawDelta, 0.05);
    const ease = 1 - Math.exp(-dt * 12);

    const before = pos.current.clone();
    pos.current.x = THREE.MathUtils.lerp(pos.current.x, target.x, ease);
    pos.current.z = THREE.MathUtils.lerp(pos.current.z, target.z, ease);
    const key = keyAt(pos.current.x, pos.current.z);
    const surface = key ? CASE_H + key.height - PRESS_DEPTH : 0;
    pos.current.y = THREE.MathUtils.lerp(pos.current.y, surface, 1 - Math.exp(-dt * 18));

    const delta = ((target.h - heading.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    heading.current += delta * ease;

    const speed = Math.hypot(pos.current.x - before.x, pos.current.z - before.z) / Math.max(dt, 1e-3);
    const m = motion.current;
    m.amount = THREE.MathUtils.lerp(m.amount, Math.min(speed / 3, 1), 1 - Math.exp(-dt * 10));
    m.phase += dt * 11 * m.amount;

    group.current.position.copy(pos.current);
    group.current.rotation.y = heading.current;
  });

  return (
    <group ref={group}>
      <KordiModel motion={motion} scale={SCALE} />
      {/* name tag floats above the head and always faces the camera */}
      <sprite position={[0, 2.55, 0]} scale={[0.42 * aspect, 0.42, 1]}>
        <spriteMaterial map={texture} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}
