"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CASE_H, KEYS } from "../model/layout";

const BEAM_HEIGHT = 2.4;

/** Marks the next key to step on in the melody game: a light shaft and a bobbing arrow. */
export function TargetBeam({ midi, color }: { midi: number; color: string }) {
  const arrow = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const key = KEYS.find((k) => k.midi === midi);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (arrow.current) arrow.current.position.y = BEAM_HEIGHT + 0.35 + Math.sin(t * 4) * 0.15;
    if (beam.current) {
      (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.32 + Math.sin(t * 4) * 0.08;
    }
  });

  if (!key) return null;
  const top = CASE_H + key.height;

  return (
    <group position={[key.x, top, key.z]}>
      <mesh ref={beam} position={[0, BEAM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[key.width * 0.42, key.width * 0.42, BEAM_HEIGHT, 24, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[key.width * 0.9, Math.min(key.length, 2.4)]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh ref={arrow} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.28, 0.5, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}
