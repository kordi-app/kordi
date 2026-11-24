"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SECRET_SPOT } from "../../engine/cat-walk";

/** Where the pawprints lie round the spot: four, circling in to where the cat sits */
const PAWS: readonly [number, number, number][] = [
  [-1.1, 0.6, 0.4],
  [-0.6, -0.5, 1.1],
  [0.5, -0.7, 2.0],
  [0.9, 0.3, 2.9],
];

/**
 * Faint glowing pawprints on the cat's secret spot — only for someone who has
 * already found the way in, so they can find it again without the cat.
 */
export function CatSpot({ found }: { found: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((paw, i) => {
      ((paw as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.2 * Math.sin(t * 1.2 - i * 0.8);
    });
  });
  if (!found) return null;
  return (
    <group ref={group} position={[SECRET_SPOT.x, 0.03, SECRET_SPOT.z]}>
      {PAWS.map(([x, z, turn], i) => (
        <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, turn]}>
          <circleGeometry args={[0.16, 16]} />
          <meshBasicMaterial color="#9fb8ff" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
