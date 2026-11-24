"use client";

import { useRef, type MutableRefObject, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { KordiMotion } from "./kordi-model";

/**
 * The baby moon-whale: a pet that swims round Kordi's shoulder. It reacts to
 * what Kordi does, read from the same motion the body animates with —
 * jumping makes it spout stars, sitting brings it into Kordi's arms, dancing
 * sends it round in circles, waving makes it flip. `glow` (0–1, the night)
 * lights its moon mark and belly.
 *
 * In Kordi's local space (faces +z), outside the body's squash and lean.
 */

const SHARED = {
  body: new THREE.SphereGeometry(1, 24, 16),
  fin: new THREE.SphereGeometry(1, 12, 8),
  eye: new THREE.SphereGeometry(1, 10, 8),
  moon: new THREE.TorusGeometry(0.075, 0.022, 8, 20, Math.PI * 1.25),
  spark: new THREE.OctahedronGeometry(0.05, 0),
};
const INK = new THREE.MeshStandardMaterial({ color: "#1d1b2e", roughness: 0.3 });

/** Behind the right shoulder, above the head (clear of any hat, from the side too) */
const HOME = new THREE.Vector3(-0.8, 1.85, -0.45);
const SPARKS = 7;

export function MoonWhale({
  motion,
  glow = 0,
}: {
  motion: MutableRefObject<KordiMotion>;
  /** 0–1, or a ref the scene updates every frame (night falls without re-rendering) */
  glow?: number | RefObject<number>;
}) {
  const root = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const finL = useRef<THREE.Mesh>(null);
  const finR = useRef<THREE.Mesh>(null);
  const skin = useRef<THREE.MeshStandardMaterial>(null);
  const belly = useRef<THREE.MeshStandardMaterial>(null);
  const moon = useRef<THREE.MeshBasicMaterial>(null);
  const sparks = useRef<(THREE.Mesh | null)[]>([]);
  const state = useRef({
    pos: HOME.clone(),
    want: new THREE.Vector3(),
    spoutAt: -Infinity,
    rising: false,
    flipAt: -Infinity,
    waving: false,
  });

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    const s = state.current;
    const m = motion.current;

    // where it wants to be: swimming a lazy loop by the shoulder, or reacting
    let swim = 3;
    switch (m.emote) {
      case "sit":
        // nestles into Kordi's arms, below the face
        s.want.set(0, 0.4 + Math.sin(t * 1.5) * 0.02, 0.62);
        swim = 1.2;
        break;
      case "dance":
        s.want.set(Math.cos(t * 3.2) * 1.05, 1.3 + Math.sin(t * 6.4) * 0.15, Math.sin(t * 3.2) * 1.05);
        swim = 7;
        break;
      case "clap":
        s.want.copy(HOME).setY(HOME.y + Math.abs(Math.sin(t * 9)) * 0.25);
        swim = 6;
        break;
      default:
        s.want.set(HOME.x + Math.sin(t * 0.7) * 0.18, HOME.y + Math.sin(t * 1.3) * 0.12, HOME.z + Math.cos(t * 0.7) * 0.15);
    }
    s.pos.lerp(s.want, 1 - Math.exp(-dt * (m.emote === "dance" ? 9 : 4)));

    // a jump (Kordi rising fast) spouts stars from its blowhole
    const rising = m.stretch > 0.55;
    if (rising && !s.rising) s.spoutAt = t;
    s.rising = rising;
    // a wave makes it do a little flip
    const waving = m.emote === "wave";
    if (waving && !s.waving) s.flipAt = t;
    s.waving = waving;

    if (root.current) {
      root.current.position.copy(s.pos);
      const flip = t - s.flipAt < 0.8 ? ((t - s.flipAt) / 0.8) * Math.PI * 2 : 0;
      // faces the way it swims round in the dance; otherwise alongside Kordi, rolling gently
      const heading = m.emote === "dance" ? -t * 3.2 : Math.sin(t * 0.7) * 0.4;
      root.current.rotation.set(Math.sin(t * 1.3) * 0.12 - flip, heading, Math.sin(t * 0.9) * 0.1);
    }
    if (tail.current) tail.current.rotation.x = Math.sin(t * swim) * 0.45;
    if (finL.current) finL.current.rotation.z = 0.5 + Math.sin(t * swim + 1) * 0.3;
    if (finR.current) finR.current.rotation.z = -0.5 - Math.sin(t * swim + 1) * 0.3;

    const dark = typeof glow === "number" ? glow : (glow.current ?? 0);
    const light = 0.15 + dark * 0.85;
    if (skin.current) skin.current.emissiveIntensity = 0.12 + dark * 0.35;
    if (belly.current) belly.current.emissiveIntensity = 0.15 + dark * 0.6;
    if (moon.current) moon.current.color.setRGB(1, 0.92, 0.6).multiplyScalar(0.6 + light);

    // the spout: a fountain of little stars that rises, spreads and fades
    const age = t - s.spoutAt;
    sparks.current.forEach((spark, i) => {
      if (!spark) return;
      spark.visible = age < 0.9;
      if (!spark.visible) return;
      const a = (i / SPARKS) * Math.PI * 2;
      const spread = age * 0.6;
      spark.position.set(Math.cos(a) * spread, 0.25 + age * 1.4 - age * age * 1.2, Math.sin(a) * spread);
      spark.scale.setScalar(Math.max(0.01, 1 - age / 0.9));
      spark.rotation.y = t * 6 + i;
    });
  });

  return (
    <group ref={root} position={HOME.toArray()}>
      <group scale={0.62}>
        {/* body: deep night blue, a pale belly underneath */}
        <mesh geometry={SHARED.body} scale={[0.32, 0.26, 0.44]} castShadow>
          <meshStandardMaterial ref={skin} color="#3c4fa8" emissive="#4a63d8" emissiveIntensity={0.12} roughness={0.35} />
        </mesh>
        <mesh geometry={SHARED.body} position={[0, -0.08, 0.04]} scale={[0.26, 0.17, 0.38]}>
          <meshStandardMaterial ref={belly} color="#e8eeff" emissive="#bcd0ff" emissiveIntensity={0.15} roughness={0.5} />
        </mesh>
        {/* eyes and a crescent moon on its brow */}
        {[-1, 1].map((side) => (
          <mesh key={side} geometry={SHARED.eye} material={INK} position={[side * 0.21, 0.04, 0.3]} scale={0.035} />
        ))}
        <mesh geometry={SHARED.moon} position={[0, 0.22, 0.1]} rotation={[-0.4, 0, 0.6]}>
          <meshBasicMaterial ref={moon} color="#ffe9a0" toneMapped={false} />
        </mesh>
        {/* side fins */}
        <mesh ref={finL} geometry={SHARED.fin} position={[0.3, -0.08, 0.05]} scale={[0.14, 0.03, 0.08]}>
          <meshStandardMaterial color="#33449a" roughness={0.4} />
        </mesh>
        <mesh ref={finR} geometry={SHARED.fin} position={[-0.3, -0.08, 0.05]} scale={[0.14, 0.03, 0.08]}>
          <meshStandardMaterial color="#33449a" roughness={0.4} />
        </mesh>
        {/* the tail: a narrowing stock and a two-lobed fluke that beats up and down */}
        <group ref={tail} position={[0, 0.02, -0.36]}>
          <mesh geometry={SHARED.body} position={[0, 0, -0.1]} scale={[0.12, 0.1, 0.2]}>
            <meshStandardMaterial color="#3c4fa8" roughness={0.35} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} geometry={SHARED.fin} position={[side * 0.12, 0.02, -0.3]} rotation={[0, side * 0.5, 0]} scale={[0.14, 0.025, 0.08]}>
              <meshStandardMaterial color="#33449a" roughness={0.4} />
            </mesh>
          ))}
        </group>
        {Array.from({ length: SPARKS }, (_, i) => (
          <mesh
            key={i}
            geometry={SHARED.spark}
            visible={false}
            ref={(mesh) => {
              sparks.current[i] = mesh;
            }}
          >
            <meshBasicMaterial color="#fff2b8" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
