"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CASE_H, KEYS } from "../model/layout";

const BEAM_HEIGHT = 2.4;
/** seconds between the rings that pulse out from the key */
const PULSE_PERIOD = 0.9;

/**
 * Marks the next key to step on in the melody game: a light shaft with a
 * brighter core, a spinning arrow that bobs over it, and rings pulsing out
 * across the key top.
 */
export function TargetBeam({ midi, color }: { midi: number; color: string }) {
  const arrow = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const key = KEYS.find((k) => k.midi === midi);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breathe = Math.sin(t * 4);
    if (arrow.current) {
      arrow.current.position.y = BEAM_HEIGHT + 0.35 + breathe * 0.15;
      arrow.current.rotation.y = t * 1.8;
    }
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.22 + breathe * 0.06;
    if (core.current) (core.current.material as THREE.MeshBasicMaterial).opacity = 0.32 + breathe * 0.1;
    if (ring.current) {
      const phase = (t / PULSE_PERIOD) % 1;
      const size = 0.3 + phase * 0.9;
      ring.current.scale.set(size, size, 1);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.7;
    }
  });

  if (!key) return null;
  const top = CASE_H + key.height;
  const radius = key.width * 0.42;

  return (
    <group position={[key.x, top, key.z]}>
      {/* the soft outer shaft, and a narrower, brighter core inside it */}
      <mesh ref={beam} position={[0, BEAM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 1.08, BEAM_HEIGHT, 24, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={core} position={[0, BEAM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[radius * 0.45, radius * 0.6, BEAM_HEIGHT, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.32} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[key.width * 0.9, Math.min(key.length, 2.4)]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[key.width * 0.4, key.width * 0.48, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* a chunky arrow: a short stem on a point, turning slowly */}
      <group ref={arrow}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.28, 0.42, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.3, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}
