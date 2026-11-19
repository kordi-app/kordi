"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DRUMS } from "../../model/island";
import { sinceHit } from "./shared";

/** The skin sits just above the shell's cap so the two never z-fight */
const SKIN_LIFT = 0.015;

export function DrumValley() {
  const skins = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    DRUMS.forEach((drum, i) => {
      const skin = skins.current[i];
      if (!skin) return;
      const t = sinceHit(`drum:${i}`, now);
      const thump = t < 0.5 ? Math.exp(-t * 10) : 0;
      skin.scale.set(1 + thump * 0.05, 1, 1 + thump * 0.05);
      skin.position.y = drum.top + SKIN_LIFT - thump * 0.08;
      (skin.material as THREE.MeshStandardMaterial).emissiveIntensity = thump * 0.5;
    });
  });
  return (
    <group>
      {DRUMS.map((drum, i) => (
        <group key={i} position={[drum.x, 0, drum.z]}>
          <mesh position={[0, drum.top / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[drum.r, drum.r * 1.04, drum.top, 36]} />
            <meshStandardMaterial color={drum.color} roughness={0.5} />
          </mesh>
          {/* gold rims */}
          {[drum.top - 0.04, 0.06].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[drum.r * 1.02, 0.05, 8, 40]} />
              <meshStandardMaterial color="#e3b341" metalness={0.25} roughness={0.35} />
            </mesh>
          ))}
          <mesh
            ref={(el) => {
              skins.current[i] = el;
            }}
            position={[0, drum.top + SKIN_LIFT, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <circleGeometry args={[drum.r * 0.98, 36]} />
            <meshStandardMaterial color="#f7f0e0" emissive="#fff4d6" emissiveIntensity={0} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
