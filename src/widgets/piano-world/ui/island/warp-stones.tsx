"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type WarpStone } from "../../model/island";
import { mergeParts, useBuilt } from "./shared";

const AWAKE = new THREE.Color("#7fd8ff");
const ASLEEP = new THREE.Color("#6a6878");
/** The monolith is a slightly flattened square spire: this deep for its width */
const DEPTH_SCALE = 0.62;
const lathe = (points: number[][], segments: number) =>
  new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
    Math.PI / segments, // a flat face to the front
  );

/** A low octagonal plinth with a bevelled step (no taller than the old slab). */
const plinthGeometry = () =>
  lathe(
    [
      [1.27, 0],
      [1.25, 0.12],
      [1.19, 0.17],
      [1.02, 0.18],
      [0.99, 0.27],
      [0.93, 0.3],
      [0, 0.3],
    ],
    8,
  );

/** The standing stone: tapered, chamfered at the shoulders, a low pyramid cap. */
const monolithGeometry = () =>
  lathe(
    [
      [0.58, 0.25],
      [0.47, 1.86],
      [0.42, 1.95],
      [0.4, 2.0],
      [0, 2.22],
    ],
    4,
  ).scale(1, 1, DEPTH_SCALE);

/**
 * Everything that glows with the stone, as one geometry: a ♪ carved into the
 * front face and a ring inlaid in the plinth's top step.
 */
function glyphGeometry() {
  const head = new THREE.Shape().absellipse(-0.07, 0, 0.12, 0.085, 0, Math.PI * 2, false, -0.35);
  const stem = new THREE.Shape();
  stem.moveTo(0.035, 0);
  stem.lineTo(0.075, 0);
  stem.lineTo(0.075, 0.52);
  stem.lineTo(0.035, 0.52);
  stem.closePath();
  const flag = new THREE.Shape();
  flag.moveTo(0.075, 0.52);
  flag.quadraticCurveTo(0.2, 0.42, 0.22, 0.26);
  flag.quadraticCurveTo(0.18, 0.38, 0.075, 0.42);
  flag.closePath();
  // the front face leans back a hair as the stone tapers
  const faceZ = 0.58 * Math.SQRT1_2 * DEPTH_SCALE;
  const lean = Math.atan2((0.58 - 0.47) * Math.SQRT1_2 * DEPTH_SCALE, 1.61);
  const note = new THREE.ShapeGeometry([head, stem, flag], 6)
    .translate(0, -0.2, 0)
    .rotateX(-lean)
    .translate(0, 1.25, faceZ - Math.tan(lean) * 1.0 + 0.012);
  const inlay = new THREE.RingGeometry(0.72, 0.8, 32).rotateX(-Math.PI / 2).translate(0, 0.302, 0);
  return mergeParts([note, inlay]);
}

export function WarpStoneMesh({ stone, awake }: { stone: WarpStone; awake: boolean }) {
  const plinth = useBuilt(plinthGeometry);
  const monolith = useBuilt(monolithGeometry);
  const glyph = useBuilt(glyphGeometry);
  /** one glowing material for the rune, the carved note and the inlay */
  const glow = useBuilt(() => new THREE.MeshStandardMaterial({ color: ASLEEP, emissive: AWAKE, emissiveIntensity: 0.08, roughness: 0.3 }));
  useEffect(() => {
    glow.color.copy(awake ? AWAKE : ASLEEP);
  }, [glow, awake]);
  const rune = useRef<THREE.Mesh>(null);
  const wake = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!rune.current) return;
    const now = clock.getElapsedTime();
    // ease in and out of waking rather than snapping
    wake.current += ((awake ? 1 : 0) - wake.current) * (1 - Math.exp(-delta * 4));
    const w = wake.current;
    const material = rune.current.material as THREE.MeshStandardMaterial; // the shared glow
    material.emissiveIntensity = 0.08 + w * (1.02 + Math.sin(now * 2.2 + stone.x) * 0.35);
    rune.current.rotation.y = now * (0.2 + w);
    // a slow hover, livelier when awake
    rune.current.position.y = 2.7 + Math.sin(now * 1.3 + stone.z) * (0.03 + w * 0.07);
  });

  return (
    <group position={[stone.x, 0, stone.z]}>
      <mesh geometry={plinth} receiveShadow>
        <meshStandardMaterial color="#cfc6b6" roughness={0.92} flatShading />
      </mesh>
      <mesh geometry={monolith} castShadow receiveShadow>
        <meshStandardMaterial color="#8d8a9c" roughness={0.82} flatShading />
      </mesh>
      <mesh geometry={glyph} material={glow} />
      <mesh ref={rune} position={[0, 2.7, 0]} scale={[1, 1.35, 1]} material={glow}>
        <octahedronGeometry args={[0.3, 0]} />
      </mesh>
    </group>
  );
}
