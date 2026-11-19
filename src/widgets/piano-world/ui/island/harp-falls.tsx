"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAVE, CLIFF, CRYSTALS, HARP, HARP_STRINGS, hash } from "../../model/island";
import { ROCK, GOLD, sinceHit } from "./shared";
import { Water } from "./water";

const POOL = { x: (CAVE.x0 + CAVE.x1) / 2, z: CLIFF.front + 1.6, r: 3.2 };
const POOL_SHORE: [number, number, number, number] = [POOL.x, POOL.z, POOL.r, CLIFF.front];

/** Falling water: blue-white sheets with bright streaks, thinner at the edges. */
function makeFallTexture(seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const sheet = ctx.createLinearGradient(0, 0, 128, 0);
  sheet.addColorStop(0, "rgba(150,205,235,0.15)");
  sheet.addColorStop(0.15, "rgba(170,220,245,0.75)");
  sheet.addColorStop(0.5, "rgba(190,230,250,0.85)");
  sheet.addColorStop(0.85, "rgba(170,220,245,0.75)");
  sheet.addColorStop(1, "rgba(150,205,235,0.15)");
  ctx.fillStyle = sheet;
  ctx.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 160; i++) {
    const x = 6 + hash(i, seed) * 116;
    const y = hash(i, seed + 1) * 512;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + hash(i, seed + 2) * 0.6})`;
    ctx.fillRect(x, y, 1 + hash(i, seed + 3) * 3, 30 + hash(i, seed + 4) * 120);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const HARP_FIRST = HARP_STRINGS[0].x;
const HARP_LAST = HARP_STRINGS[HARP_STRINGS.length - 1].x;
/** Long bass strings at one end, short treble at the other: a harp's curve */
const harpLength = (i: number) => HARP.height - 0.6 - (i / (HARP_STRINGS.length - 1)) * (HARP.height * 0.55);

export function HarpFalls() {
  const texture = useMemo(() => makeFallTexture(7), []);
  const spray = useMemo(() => makeFallTexture(17), []);
  useEffect(
    () => () => {
      texture.dispose();
      spray.dispose();
    },
    [texture, spray],
  );
  const sprayMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const mist = useRef<THREE.Group>(null);
  const poolGeometry = useMemo(() => new THREE.CircleGeometry(POOL.r, 48).rotateX(-Math.PI / 2), []);
  useEffect(() => () => poolGeometry.dispose(), [poolGeometry]);
  const strings = useRef<(THREE.Mesh | null)[]>([]);
  const crystals = useRef<(THREE.Mesh | null)[]>([]);
  const fall = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (fall.current?.map) fall.current.map.offset.y += delta * 1.5; // water falling
    if (sprayMaterial.current?.map) sprayMaterial.current.map.offset.y += delta * 2.3; // a faster sheet in front
    mist.current?.children.forEach((puff, i) => {
      const t = (clock.getElapsedTime() * 0.45 + i / 7) % 1;
      puff.position.y = 0.3 + t * 2.2;
      puff.scale.setScalar(1.2 + t * 1.8);
      ((puff as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - t);
    });
    const now = clock.getElapsedTime();
    HARP_STRINGS.forEach((string, i) => {
      const mesh = strings.current[i];
      if (!mesh) return;
      const t = sinceHit(`harp:${i}`, now);
      const shimmer = t < 1.5 ? Math.exp(-t * 2.5) : 0;
      mesh.position.x = string.x + Math.sin(t * 60) * 0.04 * shimmer;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.45 + shimmer * 2;
    });
    CRYSTALS.forEach((_, i) => {
      const mesh = crystals.current[i];
      if (!mesh) return;
      const t = sinceHit(`crystal:${i}`, now);
      mesh.rotation.y = now * 0.6 + i;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + (t < 2 ? Math.exp(-t * 2) * 2 : 0);
    });
  });

  const caveWidth = CAVE.x1 - CAVE.x0;
  const cliffDepth = CLIFF.front - CLIFF.back;
  return (
    <group>
      {/* the cliff, either side of the cave mouth */}
      {[
        { x0: CLIFF.x0, x1: CLIFF.caveX0 },
        { x0: CLIFF.caveX1, x1: CLIFF.x1 },
      ].map((part) => (
        <mesh key={part.x0} position={[(part.x0 + part.x1) / 2, CLIFF.top / 2, (CLIFF.front + CLIFF.back) / 2]} castShadow receiveShadow>
          <boxGeometry args={[part.x1 - part.x0, CLIFF.top, cliffDepth]} />
          <meshStandardMaterial color={ROCK} roughness={0.95} />
        </mesh>
      ))}
      {/* cave walls and floor */}
      {[CAVE.x0 - 2, CAVE.x1 + 2].map((x) => (
        <mesh key={x} position={[x, CLIFF.top / 2, (CLIFF.back + CAVE.back) / 2 - 1]} castShadow>
          <boxGeometry args={[4, CLIFF.top, CLIFF.back - CAVE.back + 2]} />
          <meshStandardMaterial color={ROCK} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[(CAVE.x0 + CAVE.x1) / 2, CLIFF.top / 2, CAVE.back - 1]}>
        <boxGeometry args={[caveWidth + 8, CLIFF.top, 2]} />
        <meshStandardMaterial color={ROCK} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(CAVE.x0 + CAVE.x1) / 2, 0.012, (CLIFF.front + CAVE.back) / 2]}>
        <planeGeometry args={[caveWidth, CLIFF.front - CAVE.back]} />
        <meshStandardMaterial color="#4a4560" roughness={1} />
      </mesh>
      {/* the waterfall over the cave mouth, and its pool */}
      <mesh position={[(CAVE.x0 + CAVE.x1) / 2, CLIFF.top / 2, CLIFF.front + 0.15]}>
        <planeGeometry args={[caveWidth + 0.6, CLIFF.top]} />
        <meshStandardMaterial
          ref={fall}
          map={texture}
          transparent
          opacity={0.92}
          depthWrite={false}
          emissive="#cfe9ff"
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh position={[(CAVE.x0 + CAVE.x1) / 2, CLIFF.top / 2, CLIFF.front + 0.35]}>
        <planeGeometry args={[caveWidth + 0.2, CLIFF.top]} />
        <meshStandardMaterial
          ref={sprayMaterial}
          map={spray}
          transparent
          opacity={0.45}
          depthWrite={false}
          emissive="#e6f4ff"
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* mist rising where the water lands */}
      <group ref={mist} position={[(CAVE.x0 + CAVE.x1) / 2, 0, CLIFF.front + 0.9]}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[(hash(i, 5) - 0.5) * 3.6, 0.5, (hash(i, 6) - 0.5) * 1.2]}>
            <sphereGeometry args={[0.6, 12, 8]} />
            <meshBasicMaterial color="#f2f9ff" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <Water kind="pool" geometry={poolGeometry} shore={POOL_SHORE} position={[POOL.x, 0.03, POOL.z]} />
      {/* the harp standing in the spray: a golden frame and glowing strings */}
      <group position={[0, 0, (HARP.zMin + HARP.zMax) / 2]}>
        {HARP_STRINGS.map((string, i) => (
          <mesh
            key={i}
            ref={(el) => {
              strings.current[i] = el;
            }}
            position={[string.x, 0.35 + harpLength(i) / 2, 0]}
          >
            <cylinderGeometry args={[0.03, 0.03, harpLength(i), 6]} />
            <meshStandardMaterial color="#fff6d8" emissive="#ffe9a8" emissiveIntensity={0.35} />
          </mesh>
        ))}
        {/* soundboard along the bottom, pillar at the tall end, curved neck across the top */}
        <mesh position={[(HARP_FIRST + HARP_LAST) / 2, 0.22, 0]} castShadow>
          <boxGeometry args={[HARP_LAST - HARP_FIRST + 0.9, 0.44, 0.5]} />
          <meshStandardMaterial color="#b0803a" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[HARP_FIRST - 0.35, HARP.height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.18, HARP.height, 12]} />
          <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.25} />
        </mesh>
        {HARP_STRINGS.slice(0, -1).map((string, i) => {
          const next = HARP_STRINGS[i + 1];
          const y0 = 0.35 + harpLength(i);
          const y1 = 0.35 + harpLength(i + 1);
          return (
            <mesh
              key={`neck${i}`}
              position={[(string.x + next.x) / 2, (y0 + y1) / 2 + 0.08, 0]}
              rotation={[0, 0, Math.atan2(y1 - y0, next.x - string.x)]}
              castShadow
            >
              <boxGeometry args={[Math.hypot(next.x - string.x, y1 - y0) + 0.06, 0.2, 0.22]} />
              <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.25} />
            </mesh>
          );
        })}
      </group>
      {/* singing crystals in the cave */}
      {CRYSTALS.map((crystal, i) => (
        <mesh
          key={i}
          ref={(el) => {
            crystals.current[i] = el;
          }}
          position={[crystal.x, 0.75, crystal.z]}
          scale={[0.45, 0.8, 0.45]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={crystal.color} emissive={crystal.color} emissiveIntensity={0.6} roughness={0.15} />
        </mesh>
      ))}
    </group>
  );
}
