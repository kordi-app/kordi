"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

/** Underdamped: a pressed key overshoots a little and wobbles back, like a real key. */
const STIFFNESS = 420;
const DAMPING = 15;

/**
 * Animates each object's y offset toward `target(i)` with a spring. Returns a
 * ref-setter per index; pass `base(i)` for the resting height.
 */
export function useKeySprings(count: number, base: (i: number) => number, target: (i: number) => number) {
  const objects = useRef<(THREE.Object3D | null)[]>([]);
  const state = useRef(Array.from({ length: count }, () => ({ y: 0, v: 0 })));

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30); // keep the spring stable on slow frames
    for (let i = 0; i < count; i++) {
      const spring = state.current[i];
      const goal = target(i);
      if (Math.abs(spring.y - goal) < 1e-4 && Math.abs(spring.v) < 1e-4) continue; // at rest
      spring.v += (-STIFFNESS * (spring.y - goal) - DAMPING * spring.v) * dt;
      spring.y += spring.v * dt;
      const object = objects.current[i];
      if (object) object.position.y = base(i) + spring.y;
    }
  });

  return (i: number) => (object: THREE.Object3D | null) => {
    objects.current[i] = object;
  };
}
