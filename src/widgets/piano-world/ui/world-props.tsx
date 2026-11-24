"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { KordiModel, type KordiMotion } from "@/entities/character";
import { CASE_H, KEYS, SPAWN, keyAt } from "../engine/layout";
import type { InteractableDef } from "../engine/interactables";
import { CAT_HOME, CAT_WALK_SPEED, catPlan } from "../engine/cat-walk";

const INK = "#221d19";

const WOOD = "#8a5a2b";
const WOOD_DARK = "#6d4521";
const BRASS = "#e0b85a";

/** An easel (two front legs and a back prop) holding a face-down chord card on a ledge. */
export function ChordCardStand({ item }: { item: InteractableDef }) {
  const card = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!card.current) return;
    card.current.rotation.y = Math.sin(t * 1.5) * 0.12;
    card.current.position.y = 1.25 + Math.sin(t * 2.2) * 0.015; // a faint float, inviting a tap
  });
  return (
    <group position={[item.x, 0, item.z]}>
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]} rotation={[0.15, 0, x > 0 ? -0.08 : 0.08]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 1.45, 8]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
      ))}
      {/* back prop and the ledge the card rests on */}
      <mesh position={[0, 0.66, -0.3]} rotation={[-0.32, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.4, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.68, 0.1]} castShadow>
        <boxGeometry args={[0.95, 0.05, 0.12]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
      <group ref={card} position={[0, 1.25, 0.08]}>
        <mesh castShadow>
          <boxGeometry args={[0.85, 1.1, 0.05]} />
          <meshStandardMaterial color="#2f2b27" roughness={0.5} />
        </mesh>
        {/* gold back pattern: a framed panel with a diamond at its heart */}
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[0.66, 0.88]} />
          <meshStandardMaterial color="#d4a64a" emissive="#d4a64a" emissiveIntensity={0.4} metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.029]}>
          <planeGeometry args={[0.56, 0.78]} />
          <meshStandardMaterial color="#3a332c" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.031]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.24, 0.24]} />
          <meshStandardMaterial color="#d4a64a" emissive="#d4a64a" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/** A Kordi in round glasses with a music stand — dispenses chord tips. */
export function Teacher({ item }: { item: InteractableDef }) {
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0, emote: null, land: 0, stretch: 0, lean: 0, bank: 0 });
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
      {/* music stand: tripod feet, a post, and a desk with a sheet of music on it */}
      <group position={[0.9, 0, 0.5]}>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a) => (
          <mesh key={a} position={[Math.sin(a) * 0.14, 0.1, Math.cos(a) * 0.14]} rotation={[-Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9]}>
            <cylinderGeometry args={[0.015, 0.015, 0.34, 6]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        ))}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.022, 0.028, 1.1, 8]} />
          <meshStandardMaterial color={INK} metalness={0.3} roughness={0.5} />
        </mesh>
        <group position={[0, 1.15, 0]} rotation={[-0.4, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.6, 0.4, 0.03]} />
            <meshStandardMaterial color={INK} metalness={0.3} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.21, 0.03]}>
            <boxGeometry args={[0.6, 0.03, 0.06]} />
            <meshStandardMaterial color={INK} metalness={0.3} roughness={0.5} />
          </mesh>
          <mesh position={[0.02, 0.01, 0.017]} rotation={[0, 0, -0.04]}>
            <planeGeometry args={[0.44, 0.34]} />
            <meshStandardMaterial color="#f6f0e2" roughness={0.9} />
          </mesh>
          {[-0.1, -0.03, 0.04, 0.11].map((y) => (
            <mesh key={y} position={[0.02, y, 0.019]} rotation={[0, 0, -0.04]}>
              <planeGeometry args={[0.38, 0.008]} />
              <meshBasicMaterial color="#8a8178" />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** A small music box with a turning drum and a crank that turns with it. */
export function MusicBox({ item, playing }: { item: InteractableDef; playing: boolean }) {
  const drum = useRef<THREE.Mesh>(null);
  const crank = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!playing) return;
    if (drum.current) drum.current.rotation.x += dt * 3;
    if (crank.current) crank.current.rotation.x += dt * 3;
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
      {/* brass trims: a collar where pedestal meets box, and a band round the box */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.38, 0.36, 0.05, 6]} />
        <meshStandardMaterial color={BRASS} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <boxGeometry args={[0.72, 0.03, 0.52]} />
        <meshStandardMaterial color={BRASS} metalness={0.5} roughness={0.35} />
      </mesh>
      {/* the crank on the side */}
      <group ref={crank} position={[0.37, 1.05, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.08, 6]} />
          <meshStandardMaterial color={BRASS} metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.04, 0.07, 0]}>
          <boxGeometry args={[0.02, 0.16, 0.03]} />
          <meshStandardMaterial color={BRASS} metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.08, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.08, 8]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      </group>
    </group>
  );
}

/** A glowing jukebox with a chrome arch, bubble tubes up its sides and a speaker grille. */
export function Jukebox({ item, playing }: { item: InteractableDef; playing: boolean }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const tubes = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (glow.current) {
      glow.current.emissiveIntensity = playing ? 1.2 + Math.sin(t * 6) * 0.5 : 0.5;
    }
    // the side tubes drift through warm colours while it plays
    for (const tube of tubes.current) {
      if (!tube) continue;
      tube.emissive.setHSL(playing ? 0.02 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 0.12 : 0.06, 0.9, 0.55);
      tube.emissiveIntensity = playing ? 1.1 + Math.sin(t * 4) * 0.3 : 0.45;
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
      {/* chrome arch following the rounded top */}
      <mesh position={[0, 1.8, 0.36]}>
        <torusGeometry args={[0.55, 0.035, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#e8e4dc" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* glowing bubble tubes up both sides of the face */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={x} position={[x, 0.95, 0.36]}>
          <cylinderGeometry args={[0.045, 0.045, 1.7, 10]} />
          <meshStandardMaterial
            ref={(el) => {
              tubes.current[i] = el;
            }}
            color="#ffb070"
            emissive="#ff8a3a"
            emissiveIntensity={0.45}
          />
        </mesh>
      ))}
      {/* speaker grille slats and a row of selector buttons */}
      {[0.32, 0.44, 0.56].map((y) => (
        <mesh key={y} position={[0, y, 0.355]}>
          <boxGeometry args={[0.72, 0.04, 0.02]} />
          <meshStandardMaterial color="#d8c8a8" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      {[-0.24, -0.08, 0.08, 0.24].map((x) => (
        <mesh key={x} position={[x, 0.85, 0.37]}>
          <boxGeometry args={[0.1, 0.06, 0.04]} />
          <meshStandardMaterial color="#f4ead8" roughness={0.4} />
        </mesh>
      ))}
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
      {/* the cap it hangs from */}
      <mesh position={[0, 4.88, 0]}>
        <cylinderGeometry args={[0.07, 0.12, 0.1, 12]} />
        <meshStandardMaterial color="#b8b4c4" metalness={0.6} roughness={0.3} />
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
      {/* floor button you stand next to, in a dark bezel */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.56, 0.6, 0.06, 24]} />
        <meshStandardMaterial color="#2a2238" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 0.12, 24]} />
        <meshStandardMaterial color="#ff4fd8" emissive="#ff4fd8" emissiveIntensity={party ? 1.5 : 0.6} />
      </mesh>
    </group>
  );
}

const CAT_FUR = "#c8a27a";
const CAT_DARK = "#7a5a3c";
const CAT_CREAM = "#f1e2cc";
const CAT_PINK = "#e89a9a";
/** where each leg sits under the body: [x, z] */
const CAT_LEGS = [
  [-0.14, 0.26],
  [0.14, 0.26],
  [-0.14, -0.26],
  [0.14, -0.26],
] as const;

/**
 * A little cat that wanders the keys near the spawn point, playing them as it
 * walks. Reports its live position every frame so the scene can offer "pet
 * the cat" when you're close. Freezes while being petted. Every so often it
 * goes for a walk out to its secret spot in the meadow (cat-walk.ts), sits
 * there gazing up at the sky for a while (`onSignal` as it sits down), then
 * trots back.
 */
export function PianoCat({
  petting,
  onKey,
  onPosition,
  onSignal,
}: {
  petting: boolean;
  onKey: (midi: number | null) => void;
  onPosition: (position: THREE.Vector3) => void;
  onSignal?: (position: THREE.Vector3) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const tailTip = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const state = useRef({
    /** walk-cycle phase and how much it's walking (0–1, eased) */
    stride: 0,
    walking: 0,
    position: new THREE.Vector3(SPAWN.x, 0, 1.2),
    target: new THREE.Vector3(SPAWN.x, 0, 1.2),
    /** scratch for the step towards the target (no per-frame allocation) */
    toTarget: new THREE.Vector3(),
    wait: 1,
    heading: 0,
    key: null as number | null,
    /** out on (or coming back from) its walk to the secret spot */
    outing: false,
    sitting: false,
  });
  const range = useMemo(() => {
    const near = KEYS.filter((k) => !k.black && Math.abs(k.x - SPAWN.x) < 8);
    return { min: near[0].x, max: near[near.length - 1].x };
  }, []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = state.current;
    const p = s.position;
    const t = clock.getElapsedTime();
    if (tail.current) tail.current.rotation.z = Math.sin(t * (petting ? 9 : 3)) * 0.35;
    // the tip lags the base, so the tail curls rather than swinging stiffly
    if (tailTip.current) tailTip.current.rotation.z = Math.sin(t * (petting ? 9 : 3) - 0.9) * 0.5;
    let moving = false;

    // the walk to the secret spot runs on the wall clock (everyone sees the same walk)
    const plan = catPlan(Date.now());
    if (plan.kind === "out") {
      s.outing = true;
      s.target.set(plan.x, 0, plan.z);
    } else if (s.outing) {
      s.target.set(CAT_HOME.x, 0, CAT_HOME.z);
    }
    const sitting = plan.kind === "out" && plan.sitting && p.distanceTo(s.target) < 0.15;
    if (sitting && !s.sitting) onSignal?.(p);
    s.sitting = sitting;

    if (!petting && !sitting) {
      const toTarget = s.toTarget.subVectors(s.target, p).setY(0);
      const distance = toTarget.length();
      if (s.outing && plan.kind === "home" && distance < 0.1) s.outing = false;
      if (distance < 0.1 && !s.outing) {
        s.wait -= dt;
        if (s.wait <= 0) {
          // pick a new spot on the keys (frame-time randomness, not render)
          s.target.set(range.min + Math.random() * (range.max - range.min), 0, 0.4 + Math.random() * 1.8);
          s.wait = 1 + Math.random() * 2.5;
        }
      } else {
        toTarget.normalize();
        p.addScaledVector(toTarget, Math.min((s.outing ? CAT_WALK_SPEED * 1.2 : 1.3) * dt, distance));
        s.heading = Math.atan2(toTarget.x, toTarget.z);
        moving = true;
      }
    }

    // trot: diagonal legs swing together; idle: slow breathing; petted: head tilts up into it
    s.walking += ((moving ? 1 : 0) - s.walking) * Math.min(1, dt * 8);
    s.stride += dt * 12 * s.walking;
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(s.stride + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55 * s.walking;
    });
    if (body.current) {
      const breathe = 1 + Math.sin(t * 2.4) * 0.025 * (1 - s.walking);
      body.current.scale.set(0.32 * breathe, 0.26 * breathe, 0.5);
      body.current.position.y = (sitting ? 0.34 : 0.4) + Math.abs(Math.sin(s.stride)) * 0.03 * s.walking;
      // sitting: rump down, chest up
      body.current.rotation.x = sitting ? -0.45 : 0;
    }
    if (head.current) {
      // on its spot it gazes up at the sky, ears twitching now and then
      head.current.rotation.x = petting ? -0.25 : sitting ? -0.6 + Math.sin(t * 0.8) * 0.05 : Math.sin(s.stride * 2) * 0.05 * s.walking;
      head.current.rotation.z = petting ? Math.sin(t * 3) * 0.12 : sitting && Math.sin(t * 0.37) > 0.97 ? 0.08 : 0;
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
      <mesh ref={body} position={[0, 0.4, 0]} scale={[0.32, 0.26, 0.5]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={CAT_FUR} roughness={0.8} />
      </mesh>
      {/* a darker saddle stripe down the back */}
      <mesh position={[0, 0.56, -0.04]} scale={[0.16, 0.1, 0.36]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color={CAT_DARK} roughness={0.85} />
      </mesh>
      {/* legs, pivoting at the hip so they swing */}
      {CAT_LEGS.map(([x, z], i) => (
        <group
          key={i}
          ref={(el) => {
            legs.current[i] = el;
          }}
          position={[x, 0.28, z]}
        >
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.05, 0.045, 0.28, 8]} />
            <meshStandardMaterial color={CAT_FUR} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.27, 0.02]} scale={[1, 0.6, 1.3]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color={CAT_CREAM} roughness={0.85} />
          </mesh>
        </group>
      ))}
      <group ref={head} position={[0, 0.66, 0.42]}>
        <mesh castShadow>
          <sphereGeometry args={[0.24, 20, 14]} />
          <meshStandardMaterial color={CAT_FUR} roughness={0.8} />
        </mesh>
        {/* muzzle and nose */}
        <mesh position={[0, -0.06, 0.17]} scale={[1.2, 0.8, 0.8]}>
          <sphereGeometry args={[0.09, 14, 10]} />
          <meshStandardMaterial color={CAT_CREAM} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.02, 0.24]} scale={[1.3, 0.8, 0.8]}>
          <sphereGeometry args={[0.022, 8, 6]} />
          <meshStandardMaterial color={CAT_PINK} />
        </mesh>
        {[-0.12, 0.12].map((x) => (
          <group key={x} position={[x, 0.24, 0]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]}>
            <mesh>
              <coneGeometry args={[0.08, 0.16, 4]} />
              <meshStandardMaterial color={CAT_DARK} />
            </mesh>
            <mesh position={[0, -0.01, 0.03]} scale={[0.55, 0.7, 0.4]}>
              <coneGeometry args={[0.08, 0.16, 4]} />
              <meshStandardMaterial color={CAT_PINK} />
            </mesh>
          </group>
        ))}
        {[-0.08, 0.08].map((x) => (
          <group key={x} position={[x, 0.04, 0.21]}>
            <mesh scale={[1, 1.15, 0.4]}>
              <sphereGeometry args={[0.032, 10, 8]} />
              <meshStandardMaterial color={INK} roughness={0.3} />
            </mesh>
            {/* a catchlight so the eyes read as alive */}
            <mesh position={[0.01, 0.012, 0.012]}>
              <sphereGeometry args={[0.009, 6, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>
      {/* two-part tail: base sways, the tip follows a beat behind */}
      <group ref={tail} position={[0, 0.48, -0.45]}>
        <group rotation={[-0.9, 0, 0]}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.04, 0.035, 0.32, 8]} />
            <meshStandardMaterial color={CAT_DARK} />
          </mesh>
          <group ref={tailTip} position={[0, 0.31, 0]} rotation={[0.7, 0, 0]}>
            <mesh position={[0, 0.13, 0]}>
              <cylinderGeometry args={[0.035, 0.025, 0.26, 8]} />
              <meshStandardMaterial color={CAT_DARK} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
