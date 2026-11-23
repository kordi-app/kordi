"use client";

import * as THREE from "three";


const STYLE = {
  gold: { color: "#f2c14e", emissive: "#a06a00", glow: 0.25, tip: "#f2c14e" },
  star: { color: "#dfe6ff", emissive: "#6f86ff", glow: 0.55, tip: "#ffe48a" },
  flame: { color: "#3a2a24", emissive: "#ff5a1f", glow: 0.35, tip: "#ffb347" },
} as const;

/** A small crown — the reward for topping a jump course. */
/** gold = the cloud course's reward; star = the night course's; flame = the storm temple's (dark iron, burning tips) */
export function CrownMesh({ kind = "gold" }: { kind?: keyof typeof STYLE }) {
  const style = STYLE[kind];
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.26, 0.26, 0.18, 20, 1, true]} />
        <meshStandardMaterial
          color={style.color}
          metalness={0.6}
          roughness={0.25}
          side={THREE.DoubleSide}
          emissive={style.emissive}
          emissiveIntensity={style.glow}
        />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 0.24;
        const z = Math.sin(angle) * 0.24;
        return kind === "star" ? (
          // little stars instead of spikes, glowing like the night they came from
          <mesh key={i} position={[x, 0.2, z]} rotation={[0, -angle + Math.PI / 2, 0]} scale={0.075} geometry={STAR_GEOMETRY}>
            
            <meshStandardMaterial color={style.tip} emissive={style.tip} emissiveIntensity={0.8} toneMapped={false} />
          </mesh>
        ) : kind === "flame" ? (
          // tongues of fire instead of spikes, still burning from the dragon's breath
          <mesh key={i} position={[x, 0.2, z]} scale={[1, 1.3, 1]}>
            <coneGeometry args={[0.055, 0.2, 8]} />
            <meshStandardMaterial color={style.tip} emissive="#ff6a1f" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        ) : (
          <mesh key={i} position={[x, 0.17, z]}>
            <coneGeometry args={[0.06, 0.18, 6]} />
            <meshStandardMaterial color={style.tip} metalness={0.6} roughness={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Five-pointed star, unit outer radius, centred. */
const STAR_SHAPE = (() => {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.45;
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
})();

/** One star shared by every star crown (built once, never per render). */
const STAR_GEOMETRY = new THREE.ExtrudeGeometry(STAR_SHAPE, { depth: 0.6, bevelEnabled: false });
