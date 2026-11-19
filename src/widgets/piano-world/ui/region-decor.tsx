"use client";

import type { RegionId } from "../model/regions";
import { BOUNDS, WHITE_L } from "../model/layout";

const BACK_Z = -WHITE_L / 2 - 3;

/** Light set dressing per region — cheap geometry, few lights. */
export function RegionDecor({ region }: { region: RegionId }) {
  switch (region) {
    case "neon":
      return <NeonDecor />;
    case "cathedral":
      return <CathedralDecor />;
    case "lounge":
      return <LoungeDecor />;
    default:
      return null;
  }
}

/** Glowing rails framing the keyboard. */
function NeonDecor() {
  const length = BOUNDS.x * 2;
  return (
    <group>
      {[
        { z: -WHITE_L / 2 - 0.7, color: "#ff4fd8" },
        { z: WHITE_L / 2 + 0.5, color: "#4fd8ff" },
      ].map(({ z, color }) => (
        <mesh key={z} position={[0, 0.04, z]}>
          <boxGeometry args={[length, 0.06, 0.08]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} />
        </mesh>
      ))}
    </group>
  );
}

/** A colonnade behind the keys. */
function CathedralDecor() {
  const columns: number[] = [];
  for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 6) columns.push(x);
  return (
    <group>
      {columns.map((x) => (
        <group key={x} position={[x, 0, BACK_Z]}>
          <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.45, 0.5, 6.4, 20]} />
            <meshStandardMaterial color="#e9e2d2" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[1.3, 0.3, 1.3]} />
            <meshStandardMaterial color="#d6cdb9" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A few warm floor lamps — the only real lights besides sun and sky. */
function LoungeDecor() {
  const lamps = [-16, -4, 8, 20];
  return (
    <group>
      {lamps.map((x) => (
        <group key={x} position={[x, 0, BACK_Z + 0.8]}>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2.8, 8]} />
            <meshStandardMaterial color="#1a1310" />
          </mesh>
          <mesh position={[0, 2.9, 0]}>
            <coneGeometry args={[0.45, 0.5, 24, 1, true]} />
            <meshStandardMaterial color="#ffcf9a" emissive="#ff9a4a" emissiveIntensity={1.2} side={2} />
          </mesh>
          <pointLight position={[0, 2.6, 0.4]} color="#ffb070" intensity={18} distance={9} decay={2} />
        </group>
      ))}
    </group>
  );
}
