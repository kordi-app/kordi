"use client";

import { forwardRef, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CrownMesh } from "./crown-mesh";
import type { EmoteId } from "../model/interactables";

export interface KordiMotion {
  /** Walk-cycle phase; advances while moving. */
  phase: number;
  /** 0 when standing, 1 at full walking speed. */
  amount: number;
  /** Emote being performed, if any */
  emote: EmoteId | null;
  /** 0–1: fresh hard landing → squash (decays in the scene) */
  land: number;
  /** -0.4–1: vertical speed while airborne → stretch when rising */
  stretch: number;
}

const CREAM = "#f4efe6";
const KEY_WHITE = "#fbf8f2";
const INK = "#221d19";
const CHEEK = "#f2aaa2";
const FOOT = "#b48c5c";
/** Front-to-back squash of the body capsule; face parts are placed on this surface. */
const BODY_DEPTH = 0.9;

/**
 * Kordi built from primitives to match the 2D mascot: a soft bean body,
 * dot eyes with highlights, pink cheeks, a small smile, stubby arms, brown
 * feet — and the three-white/two-black keyboard on the belly.
 * Faces +z; the parent group handles position and heading.
 */
export const KordiModel = forwardRef<
  THREE.Group,
  { motion: MutableRefObject<KordiMotion>; scale?: number; crown?: boolean }
>(function KordiModel({ motion, scale = 1, crown = false }, ref) {
  const leftFoot = useRef<THREE.Mesh>(null);
  const rightFoot = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  const squash = useRef<THREE.Group>(null);
  const emoteClock = useRef<{ emote: EmoteId | null; time: number }>({ emote: null, time: 0 });

  useFrame((_, dt) => {
    const m = motion.current;
    const { phase, amount } = m;
    const swing = Math.sin(phase) * amount;
    // emote clock is local: restart whenever the emote changes
    const clock = emoteClock.current;
    if (clock.emote !== m.emote) {
      clock.emote = m.emote;
      clock.time = 0;
    }
    clock.time += dt;
    const t = clock.time;

    // walk cycle (the baseline every emote layers on top of)
    let leftArmX = -swing * 0.5;
    let rightArmX = swing * 0.5;
    let leftArmZ = 0.5;
    let rightArmZ = -0.5;
    let bodyY = Math.abs(Math.sin(phase)) * 0.07 * amount;
    let bodyRotY = 0;
    const bodyRotZ = Math.sin(phase) * 0.05 * amount;
    let feetForward = 0;

    switch (m.emote) {
      case "wave":
        rightArmZ = -2.4 + Math.sin(t * 12) * 0.35; // arm up, waving
        break;
      case "clap": {
        const clap = Math.abs(Math.sin(t * 9));
        leftArmZ = 1.2 - clap * 0.6;
        rightArmZ = -1.2 + clap * 0.6;
        leftArmX = rightArmX = -0.9;
        break;
      }
      case "dance":
        bodyRotY = Math.sin(t * 4) * 0.6;
        bodyY = Math.abs(Math.sin(t * 8)) * 0.14;
        leftArmZ = 1.6 + Math.sin(t * 8) * 0.5;
        rightArmZ = -1.6 + Math.sin(t * 8 + Math.PI) * 0.5;
        break;
      case "sit":
        bodyY = -0.18;
        feetForward = 0.22;
        break;
    }

    if (leftFoot.current) leftFoot.current.position.z = 0.04 + swing * 0.12 + feetForward;
    if (rightFoot.current) rightFoot.current.position.z = 0.04 - swing * 0.12 + feetForward;
    if (leftArm.current) leftArm.current.rotation.set(leftArmX, 0, leftArmZ);
    if (rightArm.current) rightArm.current.rotation.set(rightArmX, 0, rightArmZ);
    if (body.current) {
      body.current.position.y = bodyY;
      body.current.rotation.set(0, bodyRotY, bodyRotZ);
    }
    // squash on landing, stretch on the way up — volume roughly preserved
    if (squash.current) {
      const flat = m.land * 0.28 - Math.max(m.stretch, 0) * 0.09;
      squash.current.scale.set(1 + flat * 0.6, 1 - flat, 1 + flat * 0.6);
    }
  });

  return (
    <group ref={ref} scale={scale}>
      <group ref={squash}>
      {/* feet stay on the ground while the body bobs */}
      <mesh ref={leftFoot} position={[-0.2, 0.06, 0.04]} scale={[0.15, 0.08, 0.2]} castShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={FOOT} roughness={0.6} />
      </mesh>
      <mesh ref={rightFoot} position={[0.2, 0.06, 0.04]} scale={[0.15, 0.08, 0.2]} castShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={FOOT} roughness={0.6} />
      </mesh>

      <group ref={body}>
        {/* body: a capsule squashed front-to-back reads as the mascot's bean */}
        <mesh position={[0, 0.72, 0]} scale={[1, 1, BODY_DEPTH]} castShadow>
          <capsuleGeometry args={[0.5, 0.42, 12, 32]} />
          <meshStandardMaterial color={CREAM} roughness={0.42} />
        </mesh>

        {/* arms */}
        <mesh ref={leftArm} position={[-0.53, 0.62, 0.02]} rotation={[0, 0, 0.5]} scale={[0.12, 0.2, 0.12]} castShadow>
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial color={CREAM} roughness={0.42} />
        </mesh>
        <mesh ref={rightArm} position={[0.53, 0.62, 0.02]} rotation={[0, 0, -0.5]} scale={[0.12, 0.2, 0.12]} castShadow>
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial color={CREAM} roughness={0.42} />
        </mesh>

        {/* face — eyes are flattened discs set into the curve of the head,
            so they read as painted on (like the mascot) rather than as
            marbles sticking out in profile */}
        {[-0.17, 0.17].map((x) => (
          <group key={x} position={[x, 0.98, 0.405]}>
            <mesh scale={[1, 1, 0.35]}>
              <sphereGeometry args={[0.068, 24, 16]} />
              <meshStandardMaterial color={INK} roughness={0.25} />
            </mesh>
            {/* highlight mirrored per eye (upper-outer), so the pair reads symmetric */}
            <mesh position={[Math.sign(x) * 0.02, 0.024, 0.02]} scale={[1, 1, 0.4]}>
              <sphereGeometry args={[0.019, 12, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        {[-0.31, 0.31].map((x) => (
          <mesh key={x} position={[x, 0.88, 0.345]} rotation={[0, x > 0 ? 0.6 : -0.6, 0]} scale={[0.075, 0.05, 0.02]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color={CHEEK} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.93, 0.445]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.055, 0.011, 8, 24, Math.PI]} />
          <meshStandardMaterial color={INK} roughness={0.4} />
        </mesh>

        {crown ? (
          <group position={[0, 1.33, 0]} rotation={[0, 0, 0.12]} scale={0.95}>
            <CrownMesh />
          </group>
        ) : null}

        {/* belly keyboard: three white keys with two black keys on top */}
        <group position={[0, 0.5, 0.43]}>
          {[-0.17, 0, 0.17].map((x) => (
            <mesh key={x} position={[x, 0, 0]} castShadow>
              <boxGeometry args={[0.16, 0.34, 0.06]} />
              <meshStandardMaterial color={KEY_WHITE} roughness={0.35} />
            </mesh>
          ))}
          {[-0.085, 0.085].map((x) => (
            <mesh key={x} position={[x, 0.07, 0.04]}>
              <boxGeometry args={[0.08, 0.2, 0.05]} />
              <meshStandardMaterial color={INK} roughness={0.3} />
            </mesh>
          ))}
        </group>
      </group>
      </group>
    </group>
  );
});
