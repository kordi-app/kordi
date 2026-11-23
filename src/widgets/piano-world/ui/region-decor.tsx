"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { REGIONS, type RegionId } from "../engine/regions";
import { BOUNDS, CASE_H, WHITE_H, WHITE_L, keysIn } from "../engine/layout";
import { decorFor, type DecorItem } from "../engine/decor";

/**
 * Set dressing: each region's own pieces (from engine/decor.ts, which also
 * makes them solid). Cheap geometry, few real lights.
 */
export function RegionDecor({
  region,
  party = false,
}: {
  region: RegionId;
  party?: boolean;
}) {
  if (region === "clouds" || region === "night" || region === "ruins") return null;
  return (
    <group>
      {decorFor(region).map((item) => (
        <DecorPiece key={`${item.kind}-${item.x}-${item.z}`} item={item} />
      ))}
      {region === "neon" ? <NeonDecor party={party} /> : null}
      {region === "lounge" ? <Fireflies /> : null}
    </group>
  );
}

function DecorPiece({ item }: { item: DecorItem }) {
  switch (item.kind) {
    case "column":
      return (
        <group position={[item.x, 0, item.z]}>
          {/* faceted shaft: the flat facets read as fluting under the sun */}
          <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.45, 0.5, 6.4, 16]} />
            <meshStandardMaterial color="#e9e2d2" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[1.3, 0.3, 1.3]} />
            <meshStandardMaterial color="#d6cdb9" roughness={0.9} />
          </mesh>
          {/* rounded moulding at the foot, and a capital with its slab on top */}
          <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <torusGeometry args={[0.5, 0.08, 8, 20]} />
            <meshStandardMaterial color="#ddd4c1" roughness={0.85} />
          </mesh>
          <mesh position={[0, 6.32, 0]} castShadow>
            <cylinderGeometry args={[0.62, 0.45, 0.28, 16]} />
            <meshStandardMaterial color="#ddd4c1" roughness={0.85} />
          </mesh>
          <mesh position={[0, 6.52, 0]} castShadow>
            <boxGeometry args={[1.3, 0.14, 1.3]} />
            <meshStandardMaterial color="#d6cdb9" roughness={0.9} />
          </mesh>
        </group>
      );
    case "floorLamp":
      return (
        <group position={[item.x, 0, item.z]}>
          {/* weighted base, pole, and a brass collar under the shade */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.28, 0.32, 0.08, 20]} />
            <meshStandardMaterial color="#1a1310" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 2.8, 8]} />
            <meshStandardMaterial color="#1a1310" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 2.68, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.08, 10]} />
            <meshStandardMaterial color="#c9a45c" metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, 2.9, 0]}>
            <coneGeometry args={[0.45, 0.5, 24, 1, true]} />
            <meshStandardMaterial color="#ffcf9a" emissive="#ff9a4a" emissiveIntensity={1.2} side={2} />
          </mesh>
          {/* a trim along the shade's lower rim, and the bulb glowing inside */}
          <mesh position={[0, 2.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.45, 0.018, 6, 24]} />
            <meshStandardMaterial color="#c9a45c" metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, 2.78, 0]}>
            <sphereGeometry args={[0.1, 12, 8]} />
            <meshBasicMaterial color="#fff1d6" toneMapped={false} />
          </mesh>
          <pointLight position={[0, 2.6, 0.4]} color="#ffb070" intensity={18} distance={9} decay={2} />
        </group>
      );
  }
}

const WHITE_KEYS = keysIn(REGIONS.neon.keys).filter((k) => !k.black);

/** Disco floor: a rainbow wave rolls across the white keys to a steady beat. */
function DiscoWave({ party }: { party: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const matrix = new THREE.Matrix4();
    WHITE_KEYS.forEach((key, i) => {
      matrix.makeTranslation(key.x, CASE_H + WHITE_H + 0.006, 0.9);
      instanced.setMatrixAt(i, matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const t = clock.getElapsedTime();
    WHITE_KEYS.forEach((key, i) => {
      // 120 BPM pulse riding a wave that travels along the keyboard
      const speed = party ? 2.4 : 1;
      const wave = Math.max(0, Math.sin(t * 3 * speed - key.x * 0.45));
      const beat = 0.55 + 0.45 * Math.max(0, Math.cos(t * Math.PI * 4 * speed));
      const strength = (party ? Math.max(wave, 0.35) : wave ** 3) * beat;
      color.setHSL((t * 0.08 + i * 0.02) % 1, 0.9, 0.55).multiplyScalar(strength);
      instanced.setColorAt(i, color);
    });
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, WHITE_KEYS.length]} rotation={[0, 0, 0]}>
      <boxGeometry args={[0.9, 0.004, 3]} />
      <meshBasicMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

/** Warm motes of light drifting over the lounge. */
function Fireflies() {
  const points = useRef<THREE.Points>(null);
  const COUNT = 50;
  const seeds = useMemo(() => {
    const hash = (i: number, salt: number) => {
      const x = Math.sin(i * 91.7 + salt * 47.3) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: COUNT }, (_, i) => ({
      x: (hash(i, 1) - 0.5) * BOUNDS.x * 2,
      y: 0.6 + hash(i, 2) * 3,
      z: (hash(i, 3) - 0.5) * 12,
      speed: 0.3 + hash(i, 4) * 0.6,
      phase: hash(i, 5) * Math.PI * 2,
    }));
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // soft round motes instead of square points
  const glow = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.7)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => glow.dispose(), [glow]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.getElapsedTime();
    const position = points.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    seeds.forEach((s, i) => {
      array[i * 3] = s.x + Math.sin(t * s.speed + s.phase) * 0.8;
      array[i * 3 + 1] = s.y + Math.sin(t * s.speed * 1.7 + s.phase) * 0.4;
      array[i * 3 + 2] = s.z + Math.cos(t * s.speed + s.phase) * 0.8;
    });
    position.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        map={glow}
        color="#ffc070"
        size={0.22}
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/** Glowing rails framing the keyboard. */
function NeonDecor({ party }: { party: boolean }) {
  const length = BOUNDS.x * 2;
  return (
    <group>
      <DiscoWave party={party} />
      {[
        { z: -WHITE_L / 2 - 0.7, color: "#ff4fd8" },
        { z: WHITE_L / 2 + 0.5, color: "#4fd8ff" },
      ].map(({ z, color }) => (
        <group key={z}>
          <mesh position={[0, 0.04, z]}>
            <boxGeometry args={[length, 0.06, 0.08]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} />
          </mesh>
          {/* a soft wash under the tube so it seems to light the floor */}
          <mesh position={[0, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[length, 0.5]} />
            <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
