"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PortalDef } from "../model/regions";
import { useLabelTexture } from "./label-texture";

const RING_RADIUS = 1.05;

/** A standing ring of light with the destination's name above it. */
export function Portal({ portal, label }: { portal: PortalDef; label: string }) {
  const swirl = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const sign = useLabelTexture(label);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (swirl.current) {
      swirl.current.rotation.z = t * 0.8;
      const pulse = 1 + Math.sin(t * 2.4) * 0.04;
      swirl.current.scale.set(pulse, pulse, 1);
    }
    if (ring.current) {
      (ring.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.4 + Math.sin(t * 2.4) * 0.4;
    }
  });

  return (
    <group position={[portal.x, 0, portal.z]}>
      {/* lean back toward the high camera so the ring reads as a doorway, not a flat ellipse */}
      <group rotation={[-0.35, 0, 0]} position={[0, 0, 0]}>
      <mesh ref={ring} position={[0, RING_RADIUS + 0.08, 0]} castShadow>
        <torusGeometry args={[RING_RADIUS, 0.09, 16, 64]} />
        <meshStandardMaterial
          color={portal.color}
          emissive={portal.color}
          emissiveIntensity={1.4}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={swirl} position={[0, RING_RADIUS + 0.08, -0.01]}>
        <circleGeometry args={[RING_RADIUS - 0.05, 48]} />
        <meshBasicMaterial color={portal.color} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      </group>
      {/* glow pool on the floor so the portal reads from a distance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.2, 48]} />
        <meshBasicMaterial color={portal.color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <sprite position={[0, RING_RADIUS * 2 + 0.6, 0]} scale={[0.42 * sign.aspect, 0.42, 1]}>
        <spriteMaterial map={sign.texture} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}
