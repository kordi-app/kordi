"use client";

import * as THREE from "three";

/** A small gold crown — the reward for topping the hidden course. */
export function CrownMesh() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.26, 0.26, 0.18, 20, 1, true]} />
        <meshStandardMaterial color="#f2c14e" metalness={0.6} roughness={0.25} side={THREE.DoubleSide} emissive="#a06a00" emissiveIntensity={0.25} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.24, 0.17, Math.sin(angle) * 0.24]}>
            <coneGeometry args={[0.06, 0.18, 6]} />
            <meshStandardMaterial color="#f2c14e" metalness={0.6} roughness={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

