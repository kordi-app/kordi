"use client";

import { useLayoutEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carryPetSwim, createPetSwim, stepPetSwim, type PetMood } from "../model/pet-swim";
import type { KordiMotion } from "./kordi-model";

/**
 * The baby moon-whale: a pet that swims after Kordi. It reacts to what Kordi
 * does, read from the same motion the body animates with — jumping makes it
 * hop and spout stars, sitting brings it into Kordi's arms, dancing sends it
 * round in circles, waving makes it flip. `glow` (0–1, the night) lights its
 * moon mark and belly.
 *
 * It is mounted inside Kordi's model (so every Kordi with a pet gets one, and
 * callers place nothing), but it does not live in Kordi's space: where it is
 * and which way it faces are kept in the world (model/pet-swim.ts), so it
 * trails behind with a lag of its own and Kordi turning on the spot doesn't
 * swing it round. Its group ignores its parent's transform to draw there.
 */

const SHARED = {
  body: new THREE.SphereGeometry(1, 24, 16),
  fin: new THREE.SphereGeometry(1, 12, 8),
  eye: new THREE.SphereGeometry(1, 10, 8),
  moon: new THREE.TorusGeometry(0.075, 0.022, 8, 20, Math.PI * 1.25),
  spark: new THREE.OctahedronGeometry(0.05, 0),
};
const INK = new THREE.MeshStandardMaterial({ color: "#1d1b2e", roughness: 0.3 });

const SPARKS = 7;

/** Its mood, from what Kordi is doing */
const MOODS: Partial<Record<NonNullable<KordiMotion["emote"]>, PetMood>> = { sit: "sit", dance: "dance", clap: "clap" };
/** How fast the tail beats in each mood (it beats faster the faster it swims, too) */
const TAIL_BEAT: Record<PetMood, number> = { follow: 3, sit: 1.2, dance: 7, clap: 6 };

const AT = new THREE.Vector3();
const SIZE = new THREE.Vector3();

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
    swim: createPetSwim(),
    seeded: false,
    /** tail-beat phase (accumulated: its rate changes with speed) */
    stroke: 0,
    spoutAt: -Infinity,
    rising: false,
    flipAt: -Infinity,
    waving: false,
  });

  // The group draws where the swim says, in the world, whatever its parent
  // (Kordi's model) is doing. Done by taking over how its world matrix is
  // made, rather than by undoing the parent's transform in a frame callback:
  // those run before the scene has placed Kordi for this frame, so the pet
  // would be un-rotated by last frame's heading and wobble as Kordi turns.
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    const place = () => {
      const swim = state.current.swim;
      const owner = group.parent?.matrixWorld.elements;
      const scale = owner ? Math.hypot(owner[0], owner[1], owner[2]) : 1;
      // Kordi just went through a portal or warped: it comes along instead of swimming across the map
      if (owner) carryPetSwim(swim, owner[12], owner[13], owner[14], scale);
      group.matrixWorld.compose(AT.set(swim.x, swim.y, swim.z), group.quaternion, SIZE.setScalar(scale));
    };
    group.rotation.order = "YXZ"; // heading first, then nose up or down
    group.matrixAutoUpdate = false;
    group.updateMatrixWorld = () => {
      place();
      for (const child of group.children) child.updateMatrixWorld(true);
    };
    group.updateWorldMatrix = (updateParents, updateChildren) => {
      if (updateParents) group.parent?.updateWorldMatrix(true, false);
      place();
      if (updateChildren) for (const child of group.children) child.updateWorldMatrix(false, true);
    };
  }, []);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    const s = state.current;
    const m = motion.current;
    const group = root.current;
    const parent = group?.parent;
    if (!group || !parent) return;
    if (!s.seeded) {
      // each whale bobs to its own beat (frame-time randomness, not render)
      s.seeded = true;
      s.swim.seed = Math.random() * 100;
      // nothing has been drawn yet: have Kordi's pose to start from
      parent.updateWorldMatrix(true, false);
    }

    // a jump (Kordi rising fast) makes it hop, and spout stars from its blowhole
    const rising = m.stretch > 0.55;
    const jumped = rising && !s.rising;
    if (jumped) s.spoutAt = t;
    s.rising = rising;

    // where Kordi is in the world (as last drawn: a frame's lag the spring hides) and where that sends the whale
    const owner = parent.matrixWorld.elements;
    const scale = Math.hypot(owner[0], owner[1], owner[2]);
    const mood = (m.emote ? MOODS[m.emote] : undefined) ?? "follow";
    stepPetSwim(
      s.swim,
      { x: owner[12], y: owner[13], z: owner[14], heading: Math.atan2(owner[8], owner[10]), scale },
      mood,
      t,
      dt,
      jumped,
    );
    // a wave makes it do a little flip
    const waving = m.emote === "wave";
    if (waving && !s.waving) s.flipAt = t;
    s.waving = waving;

    const flip = t - s.flipAt < 0.8 ? ((t - s.flipAt) / 0.8) * Math.PI * 2 : 0;
    // nose up as it climbs and down as it sinks, rolling gently
    const climb = THREE.MathUtils.clamp(s.swim.vy / (scale * 4), -0.5, 0.5);
    group.rotation.set(Math.sin(t * 1.3) * 0.12 - climb - flip, s.swim.yaw, Math.sin(t * 0.9) * 0.1);

    s.stroke += dt * (TAIL_BEAT[mood] + Math.min(s.swim.speed, 4) * 1.5);
    if (tail.current) tail.current.rotation.x = Math.sin(s.stroke) * 0.45;
    if (finL.current) finL.current.rotation.z = 0.5 + Math.sin(s.stroke + 1) * 0.3;
    if (finR.current) finR.current.rotation.z = -0.5 - Math.sin(s.stroke + 1) * 0.3;

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
    <group ref={root}>
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
