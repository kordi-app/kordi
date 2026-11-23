"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PIPES, hash } from "../../engine/island";
import { mergeParts, paint, sinceHit, useBuilt } from "./shared";

const PIPE_COLOR = new THREE.Color("#c9b98f");
const PIPE_GLOW = new THREE.Color("#fff1c4");
const GLOW_SECONDS = 2;
/** The mouth: where an organ pipe speaks, low on its front */
const MOUTH_Y = 0.9;

/**
 * Each pipe's resting colour: the same brass-and-tin alloy, a shade warmer or
 * paler from pipe to pipe, so the forest doesn't read as copies.
 */
const BASE_COLORS = PIPES.map((_, i) => {
  const c = PIPE_COLOR.clone();
  c.offsetHSL((hash(i, 41) - 0.5) * 0.025, (hash(i, 42) - 0.5) * 0.08, (hash(i, 43) - 0.5) * 0.07);
  return c;
});

/**
 * The mouth, built at unit pipe radius on the pipe's +z face: a dark slot
 * under a flattened, pointed upper lip (the "languid"), as one geometry.
 */
function mouthGeometry() {
  const slot = paint(new THREE.BoxGeometry(0.5, 0.28, 0.08).translate(0, 0, 0.98), "#2a241c");
  // the lip: a shallow triangle pressed flat against the pipe above the slot
  const lip = new THREE.CylinderGeometry(0.34, 0.34, 0.05, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI).scale(1, 0.75, 1).translate(0, 0.32, 0.985);
  paint(lip, "#e2d3a8");
  return mergeParts([slot, lip]);
}

/** A rolled lip at the top and a moulded collar at the foot (unit radius, flat). */
const ringGeometry = () => new THREE.TorusGeometry(1, 0.08, 6, 20).rotateX(Math.PI / 2);

export function PipeForest() {
  const mouth = useBuilt(mouthGeometry);
  const ring = useBuilt(ringGeometry);
  const pipes = useRef<THREE.InstancedMesh>(null);
  const mouths = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), color: new THREE.Color() }), []);

  useLayoutEffect(() => {
    const { matrix } = scratch;
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    PIPES.forEach((pipe, i) => {
      pipes.current?.setMatrixAt(i, matrix.compose(p.set(pipe.x, pipe.height / 2, pipe.z), q.identity(), s.set(pipe.r, pipe.height, pipe.r)));
      pipes.current?.setColorAt(i, BASE_COLORS[i]);
      // the mouth faces roughly toward the path, with a little scatter
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (hash(i, 44) - 0.5) * 1.2);
      mouths.current?.setMatrixAt(i, matrix.compose(p.set(pipe.x, MOUTH_Y, pipe.z), q, s.set(pipe.r, Math.max(0.8, pipe.r * 1.6), pipe.r)));
      q.identity();
      rings.current?.setMatrixAt(i * 2, matrix.compose(p.set(pipe.x, pipe.height - 0.04, pipe.z), q, s.set(pipe.r * 1.02, 0.7, pipe.r * 1.02)));
      rings.current?.setMatrixAt(i * 2 + 1, matrix.compose(p.set(pipe.x, 0.12, pipe.z), q, s.set(pipe.r * 1.08, 1.6, pipe.r * 1.08)));
    });
    for (const mesh of [pipes.current, mouths.current, rings.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
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
      scratch.color.copy(BASE_COLORS[i]).lerp(PIPE_GLOW, lit ? Math.exp(-t * 1.8) : 0);
      mesh.setColorAt(i, scratch.color);
      changed = true;
    });
    if (changed && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={pipes} args={[undefined, undefined, PIPES.length]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 20]} />
        <meshStandardMaterial metalness={0.35} roughness={0.32} />
      </instancedMesh>
      <instancedMesh ref={mouths} args={[mouth, undefined, PIPES.length]}>
        <meshStandardMaterial vertexColors metalness={0.35} roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={rings} args={[ring, undefined, PIPES.length * 2]} castShadow>
        <meshStandardMaterial color="#b89a5c" metalness={0.5} roughness={0.35} />
      </instancedMesh>
    </group>
  );
}
