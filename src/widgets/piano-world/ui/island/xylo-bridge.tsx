"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BRIDGE_DEPTH, XYLO_BARS, XYLO_BAR_WIDTH } from "../../model/island";
import { WOOD, sinceHit } from "./shared";

export function XyloBridge() {
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    XYLO_BARS.forEach((bar, i) => {
      const mesh = bars.current[i];
      if (!mesh) return;
      const t = sinceHit(`xylo:${i}`, now);
      // struck: dips and rings back up
      const dip = t < 0.6 ? Math.sin(t * 30) * Math.exp(-t * 7) * 0.05 + Math.exp(-t * 9) * -0.05 : 0;
      mesh.position.y = bar.top - 0.07 + dip;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = t < 1 ? 0.6 * Math.exp(-t * 3) : 0;
    });
  });
  return (
    <group>
      {XYLO_BARS.map((bar, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              bars.current[i] = el;
            }}
            position={[bar.x, bar.top - 0.07, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[XYLO_BAR_WIDTH, 0.14, BRIDGE_DEPTH]} />
            <meshStandardMaterial color={bar.color} emissive={bar.color} emissiveIntensity={0} roughness={0.35} />
          </mesh>
          {/* the two rails each bar rests on */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[bar.x, (bar.top - 0.14) / 2, side * (BRIDGE_DEPTH / 2 - 0.35)]}>
              <boxGeometry args={[XYLO_BAR_WIDTH + 0.12, Math.max(0.05, bar.top - 0.14), 0.18]} />
              <meshStandardMaterial color={WOOD} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      {/* handrail posts at the ends */}
      {[XYLO_BARS[0].x - 0.6, XYLO_BARS[XYLO_BARS.length - 1].x + 0.6].flatMap((x) =>
        [-1, 1].map((side) => (
          <mesh key={`${x}-${side}`} position={[x, 0.6, side * (BRIDGE_DEPTH / 2 + 0.1)]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.2, 10]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  );
}
