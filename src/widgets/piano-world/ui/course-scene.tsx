"use client";

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CASE_THICKNESS, COURSE, GOAL_INDEX, PLATFORM_THICKNESS, type Platform } from "../model/course";
import { CrownMesh } from "./crown-mesh";
import { useKeySprings } from "../lib/use-key-springs";

const COLORS: Record<Platform["kind"], string> = {
  white: "#fbf8f2",
  black: "#24201c",
  rest: "#f1e7d2",
  goal: "#e3b341",
};

/** Deterministic noise so clouds stay put between renders. */
function hash(i: number, salt: number) {
  const x = Math.sin(i * 57.3 + salt * 19.1) * 43758.5453;
  return x - Math.floor(x);
}

/** A soft cloud: a cluster of squashed spheres. */
function Cloud({ x, y, z, scale }: { x: number; y: number; z: number; scale: number }) {
  return (
    <group position={[x, y, z]} scale={scale}>
      {[
        [0, 0, 0, 1],
        [0.9, -0.15, 0.1, 0.75],
        [-0.9, -0.2, -0.1, 0.7],
        [0.35, 0.35, -0.2, 0.65],
      ].map(([cx, cy, cz, r], i) => (
        <mesh key={i} position={[cx, cy, cz]} scale={[r, r * 0.62, r]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** The goal's treasure: a chest with a crown hovering over it. */
function Treasure({ x, y, z }: { x: number; y: number; z: number }) {
  const crown = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!crown.current) return;
    const t = clock.getElapsedTime();
    crown.current.rotation.y = t * 1.2;
    crown.current.position.y = 1.35 + Math.sin(t * 2) * 0.12;
  });
  return (
    <group position={[x + 0.9, y, z - 0.5]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.6]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.94, 0.08, 0.64]} />
        <meshStandardMaterial color="#e3b341" metalness={0.4} roughness={0.3} />
      </mesh>
      <group ref={crown}>
        <CrownMesh />
      </group>
    </group>
  );
}

/** The hidden jump course: cloud sea below, floating keys going up. */
export const CourseScene = memo(function CourseScene({ pressed }: { pressed: ReadonlySet<number> }) {
  const clouds = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: (hash(i, 1) - 0.5) * 50,
        y: 2 + hash(i, 2) * 26,
        z: -8 - hash(i, 3) * 14,
        scale: 1.2 + hash(i, 4) * 2.2,
      })),
    [],
  );
  const goal = COURSE[GOAL_INDEX];
  const springRef = useKeySprings(
    COURSE.length,
    (i) => COURSE[i].y - PLATFORM_THICKNESS / 2,
    (i) => (pressed.has(COURSE[i].midi) ? -0.06 : 0),
  );

  return (
    <group>
      {/* the cloud sea you fall back into */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 80]} />
        <meshStandardMaterial color="#dbe7f6" roughness={1} />
      </mesh>
      {clouds.map((c, i) => (
        <Cloud key={i} {...c} />
      ))}

      {COURSE.map((p, i) => {
        const isPressed = pressed.has(p.midi);
        return (
          <group key={i}>
            {/* dark case under every step, so it reads against the white sky like a piano key */}
            <mesh position={[p.x, p.y - PLATFORM_THICKNESS - CASE_THICKNESS / 2, p.z]} castShadow receiveShadow>
              <boxGeometry args={[p.width + 0.16, CASE_THICKNESS, p.depth + 0.16]} />
              <meshStandardMaterial color={p.kind === "goal" ? "#7a5418" : "#2f2b27"} roughness={0.5} />
            </mesh>
            <mesh ref={springRef(i)} position={[p.x, p.y - PLATFORM_THICKNESS / 2, p.z]} castShadow receiveShadow>
              <boxGeometry args={[p.width, PLATFORM_THICKNESS, p.depth]} />
              <meshStandardMaterial
                color={COLORS[p.kind]}
                emissive={isPressed ? "#b9a8ff" : p.kind === "goal" ? "#a06a00" : "#000000"}
                emissiveIntensity={isPressed ? 0.6 : p.kind === "goal" ? 0.3 : 0}
                roughness={0.45}
                metalness={p.kind === "goal" ? 0.3 : 0}
              />
            </mesh>
          </group>
        );
      })}
      <Treasure x={goal.x} y={goal.y} z={goal.z} />
    </group>
  );
});
