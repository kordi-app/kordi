"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PIPES } from "../../model/island";
import { sinceHit } from "./shared";

const PIPE_COLOR = new THREE.Color("#c9b98f");
const PIPE_GLOW = new THREE.Color("#fff1c4");
const GLOW_SECONDS = 2;

export function PipeForest() {
  const pipes = useRef<THREE.InstancedMesh>(null);
  const lips = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), color: new THREE.Color() }), []);

  useLayoutEffect(() => {
    const { matrix } = scratch;
    const q = new THREE.Quaternion();
    PIPES.forEach((pipe, i) => {
      matrix.compose(new THREE.Vector3(pipe.x, pipe.height / 2, pipe.z), q, new THREE.Vector3(pipe.r, pipe.height, pipe.r));
      pipes.current?.setMatrixAt(i, matrix);
      pipes.current?.setColorAt(i, PIPE_COLOR);
      // a darker band near the bottom: the pipe's mouth
      matrix.compose(new THREE.Vector3(pipe.x, 0.9, pipe.z), q, new THREE.Vector3(pipe.r * 1.04, 0.35, pipe.r * 1.04));
      lips.current?.setMatrixAt(i, matrix);
    });
    if (pipes.current) {
      pipes.current.instanceMatrix.needsUpdate = true;
      if (pipes.current.instanceColor) pipes.current.instanceColor.needsUpdate = true;
    }
    if (lips.current) lips.current.instanceMatrix.needsUpdate = true;
  }, [scratch]);

  /** pipes still glowing from a hum (only these are recoloured each frame) */
  const glowing = useRef(new Set<number>());
  useFrame(({ clock }) => {
    const mesh = pipes.current;
    if (!mesh) return;
    const now = clock.getElapsedTime();
    let changed = false;
    PIPES.forEach((_, i) => {
      const t = sinceHit(`pipe:${i}`, now);
      const lit = t < GLOW_SECONDS;
      if (!lit && !glowing.current.has(i)) return; // resting and already painted
      if (lit) glowing.current.add(i);
      else glowing.current.delete(i);
      scratch.color.copy(PIPE_COLOR).lerp(PIPE_GLOW, lit ? Math.exp(-t * 1.8) : 0);
      mesh.setColorAt(i, scratch.color);
      changed = true;
    });
    if (changed && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={pipes} args={[undefined, undefined, PIPES.length]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshStandardMaterial metalness={0.2} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={lips} args={[undefined, undefined, PIPES.length]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshStandardMaterial color="#3a3226" metalness={0.3} roughness={0.6} />
      </instancedMesh>
    </group>
  );
}
