"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { KordiModel, type KordiMotion } from "./kordi-model";
import { CASE_H, KEYS, SPAWN, keyAt } from "../model/layout";
import type { InteractableDef } from "../model/interactables";

const INK = "#221d19";

/** An easel holding a face-down chord card. */
export function ChordCardStand({ item }: { item: InteractableDef }) {
  const card = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (card.current) card.current.rotation.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.12;
  });
  return (
    <group position={[item.x, 0, item.z]}>
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]} rotation={[0.15, 0, x > 0 ? -0.08 : 0.08]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.45, 8]} />
          <meshStandardMaterial color="#8a5a2b" />
        </mesh>
      ))}
      <mesh ref={card} position={[0, 1.25, 0.08]} castShadow>
        <boxGeometry args={[0.85, 1.1, 0.05]} />
        <meshStandardMaterial color="#2f2b27" />
      </mesh>
      <mesh position={[0, 1.25, 0.115]}>
        <planeGeometry args={[0.6, 0.8]} />
        <meshStandardMaterial color="#d4a64a" emissive="#d4a64a" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** A Kordi in round glasses with a music stand — dispenses chord tips. */
export function Teacher({ item }: { item: InteractableDef }) {
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0, emote: null });
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    // a gentle idle sway so the NPC reads as alive
    motion.current.phase += dt * 2;
    motion.current.amount = 0.15;
    if (group.current) group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.25;
  });
  return (
    <group position={[item.x, 0, item.z]}>
      <group ref={group}>
        <KordiModel motion={motion} scale={1.6} />
        {/* glasses */}
        {[-0.17 * 1.6, 0.17 * 1.6].map((x) => (
          <mesh key={x} position={[x, 0.98 * 1.6, 0.44 * 1.6]}>
            <torusGeometry args={[0.13, 0.018, 8, 24]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        ))}
        <mesh position={[0, 0.98 * 1.6, 0.445 * 1.6]}>
          <boxGeometry args={[0.16, 0.02, 0.02]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
      {/* music stand */}
      <group position={[0.9, 0, 0.5]}>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.1, 8]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0, 1.15, 0]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.6, 0.4, 0.03]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      </group>
    </group>
  );
}

/** A small music box with a turning drum. */
export function MusicBox({ item, playing }: { item: InteractableDef; playing: boolean }) {
  const drum = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (drum.current && playing) drum.current.rotation.x += dt * 3;
  });
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.9, 6]} />
        <meshStandardMaterial color="#e9e2d2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.7, 0.3, 0.5]} />
        <meshStandardMaterial color="#8a5a2b" />
      </mesh>
      <mesh position={[0, 1.33, -0.22]} rotation={[-0.9, 0, 0]}>
        <boxGeometry args={[0.7, 0.04, 0.5]} />
        <meshStandardMaterial color="#6d4521" />
      </mesh>
      <mesh ref={drum} position={[0, 1.24, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 12]} />
        <meshStandardMaterial color="#f0c96a" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** A glowing jukebox. */
export function Jukebox({ item, playing }: { item: InteractableDef; playing: boolean }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current) {
      glow.current.emissiveIntensity = playing ? 1.2 + Math.sin(clock.getElapsedTime() * 6) * 0.5 : 0.5;
    }
  });
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.1, 1.8, 0.7]} />
        <meshStandardMaterial color="#5a2d1c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.7, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#5a2d1c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.25, 0.36]}>
        <planeGeometry args={[0.8, 0.6]} />
        <meshStandardMaterial ref={glow} color="#ffcf9a" emissive="#ff9a4a" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** A mirror ball hanging over the floor; party mode makes it spin fast. */
export function DiscoBall({ item, party }: { item: InteractableDef; party: boolean }) {
  const ball = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ball.current) ball.current.rotation.y += dt * (party ? 6 : 0.6);
  });
  return (
    <group position={[item.x, 0, item.z]}>
      <mesh position={[0, 5.3, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.6, 4]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh ref={ball} position={[0, 4.3, 0]} castShadow>
        <icosahedronGeometry args={[0.55, 2]} />
        {/* no environment map to reflect, so full metalness would render black: keep it bright */}
        <meshStandardMaterial
          color="#e8e6f0"
          metalness={0.35}
          roughness={0.2}
          flatShading
          emissive={party ? "#ff4fd8" : "#6b5cff"}
          emissiveIntensity={party ? 0.7 : 0.25}
        />
      </mesh>
      {/* floor button you stand next to */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 0.12, 24]} />
        <meshStandardMaterial color="#ff4fd8" emissive="#ff4fd8" emissiveIntensity={party ? 1.5 : 0.6} />
      </mesh>
    </group>
  );
}

const CAT_FUR = "#c8a27a";
const CAT_DARK = "#7a5a3c";

/**
 * A little cat that wanders the keys near the spawn point, playing them as it
 * walks. Reports its live position every frame so the scene can offer "pet
 * the cat" when you're close. Freezes while being petted.
 */
export function PianoCat({
  petting,
  onKey,
  onPosition,
}: {
  petting: boolean;
  onKey: (midi: number | null) => void;
  onPosition: (position: THREE.Vector3) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  const state = useRef({
    position: new THREE.Vector3(SPAWN.x, 0, 1.2),
    target: new THREE.Vector3(SPAWN.x, 0, 1.2),
    wait: 1,
    heading: 0,
    key: null as number | null,
  });
  const range = useMemo(() => {
    const near = KEYS.filter((k) => !k.black && Math.abs(k.x - SPAWN.x) < 8);
    return { min: near[0].x, max: near[near.length - 1].x };
  }, []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = state.current;
    const p = s.position;
    if (tail.current) tail.current.rotation.z = 0.6 + Math.sin(clock.getElapsedTime() * (petting ? 9 : 3)) * 0.35;

    if (!petting) {
      const toTarget = new THREE.Vector3().subVectors(s.target, p).setY(0);
      const distance = toTarget.length();
      if (distance < 0.1) {
        s.wait -= dt;
        if (s.wait <= 0) {
          // pick a new spot on the keys (frame-time randomness, not render)
          s.target.set(range.min + Math.random() * (range.max - range.min), 0, 0.4 + Math.random() * 1.8);
          s.wait = 1 + Math.random() * 2.5;
        }
      } else {
        toTarget.normalize();
        p.addScaledVector(toTarget, Math.min(1.3 * dt, distance));
        s.heading = Math.atan2(toTarget.x, toTarget.z);
      }
    }

    const key = keyAt(p.x, p.z);
    const midi = key?.midi ?? null;
    if (midi !== s.key) {
      s.key = midi;
      onKey(midi);
    }
    p.y = key ? CASE_H + key.height : 0;
    onPosition(p);

    if (group.current) {
      group.current.position.copy(p);
      group.current.rotation.y = s.heading;
    }
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.32, 0]} scale={[0.32, 0.26, 0.5]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={CAT_FUR} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.58, 0.42]} castShadow>
        <sphereGeometry args={[0.24, 20, 14]} />
        <meshStandardMaterial color={CAT_FUR} roughness={0.8} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.82, 0.42]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]}>
          <coneGeometry args={[0.08, 0.16, 4]} />
          <meshStandardMaterial color={CAT_DARK} />
        </mesh>
      ))}
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.64]} scale={[1, 1, 0.4]}>
          <sphereGeometry args={[0.03, 10, 8]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}
      <mesh ref={tail} position={[0, 0.42, -0.45]} rotation={[0.6, 0, 0.6]}>
        <cylinderGeometry args={[0.04, 0.03, 0.55, 8]} />
        <meshStandardMaterial color={CAT_DARK} />
      </mesh>
    </group>
  );
}
