"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";


const STYLE = {
  gold: { color: "#f2c14e", emissive: "#a06a00", glow: 0.25, tip: "#f2c14e" },
  // the cosmic crown: a band of night sky, rimmed in gold, that gives off its own starlight
  star: { color: "#1b1f4a", emissive: "#5a3cff", glow: 0.9, tip: "#ffe48a" },
  flame: { color: "#3a2a24", emissive: "#ff5a1f", glow: 0.35, tip: "#ffb347" },
} as const;

/** A small crown — the reward for topping a jump course. */
/**
 * gold = the cloud course's reward; star = the night course's cosmic crown (a band of
 * night sky, gold rims, star points, a nebula gem and little stars circling it);
 * flame = the storm temple's (dark iron, burning tips)
 */
export function CrownMesh({ kind = "gold" }: { kind?: keyof typeof STYLE }) {
  const style = STYLE[kind];
  return (
    <group>
      {kind === "star" ? <CosmicTrim /> : null}
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
          <mesh key={i} position={[x, 0.21, z]} rotation={[0, -angle + Math.PI / 2, 0]} scale={0.085} geometry={STAR_GEOMETRY}>
            <meshStandardMaterial color={style.tip} emissive={style.tip} emissiveIntensity={1.3} toneMapped={false} />
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

const COSMIC = {
  rim: new THREE.TorusGeometry(0.262, 0.014, 8, 40),
  gem: new THREE.OctahedronGeometry(0.055, 0),
  mote: new THREE.SphereGeometry(0.018, 8, 6),
  goldMat: new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.8, roughness: 0.25, emissive: "#8a5a00", emissiveIntensity: 0.5 }),
  gemMat: new THREE.MeshStandardMaterial({ color: "#c9b8ff", emissive: "#8f6bff", emissiveIntensity: 1.6, toneMapped: false }),
  moteMat: new THREE.MeshBasicMaterial({ color: "#fff4c2", toneMapped: false }),
};
/** little stars circling the crown, each on its own tilted ring */
const MOTES = [0, 1, 2, 3, 4, 5].map((i) => ({ phase: (i / 6) * Math.PI * 2, tilt: 0.35 + (i % 3) * 0.2, radius: 0.36 + (i % 2) * 0.06 }));

/** The cosmic crown's extras: gold rims, a nebula gem at the front, and stars circling it. */
function CosmicTrim() {
  const orbit = useRef<THREE.Group>(null);
  const gem = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    orbit.current?.children.forEach((child, i) => {
      const { phase, tilt, radius } = MOTES[i];
      const a = t * 0.9 + phase;
      child.position.set(Math.cos(a) * radius, 0.08 + Math.sin(a) * Math.sin(tilt) * 0.12, Math.sin(a) * radius);
      child.scale.setScalar(0.8 + 0.4 * Math.sin(t * 3 + phase));
    });
    if (gem.current) gem.current.rotation.y = t * 0.8;
  });
  return (
    <>
      <mesh position={[0, -0.09, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={COSMIC.rim} material={COSMIC.goldMat} />
      <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={COSMIC.rim} material={COSMIC.goldMat} />
      <mesh ref={gem} position={[0, 0, 0.27]} scale={[0.9, 1.2, 0.9]} geometry={COSMIC.gem} material={COSMIC.gemMat} />
      <group ref={orbit}>
        {MOTES.map((m) => (
          <mesh key={m.phase} geometry={COSMIC.mote} material={COSMIC.moteMat} />
        ))}
      </group>
    </>
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
