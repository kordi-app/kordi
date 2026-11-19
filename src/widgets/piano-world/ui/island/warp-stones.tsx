"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type WarpStone } from "../../model/island";

export function WarpStoneMesh({ stone, awake }: { stone: WarpStone; awake: boolean }) {
  const rune = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!rune.current) return;
    const material = rune.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = awake ? 1.1 + Math.sin(clock.getElapsedTime() * 2.2 + stone.x) * 0.35 : 0.08;
    rune.current.rotation.y = clock.getElapsedTime() * (awake ? 1.2 : 0.2);
  });
  return (
    <group position={[stone.x, 0, stone.z]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.1, 1.25, 0.3, 8]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.8, 1.9, 0.5]} />
        <meshStandardMaterial color="#8d8a9c" roughness={0.8} />
      </mesh>
      <mesh ref={rune} position={[0, 2.55, 0]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color={awake ? "#7fd8ff" : "#6a6878"} emissive="#7fd8ff" emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}
