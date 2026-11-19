"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RegionId, RegionTheme } from "../model/regions";
import { BOUNDS, CASE_H, KEYS, WHITE_H, WHITE_L } from "../model/layout";
import { decorFor, type DecorItem } from "../model/decor";

/**
 * Set dressing: a low fence around the walkable area, lamp posts along it,
 * and each region's own pieces (from model/decor.ts, which also makes them
 * solid). Cheap geometry, few real lights.
 */
export function RegionDecor({
  region,
  theme,
  party = false,
}: {
  region: RegionId;
  theme: RegionTheme;
  party?: boolean;
}) {
  if (region === "clouds") return null;
  return (
    <group>
      <Fence color={theme.keyboardCase} />
      {decorFor(region).map((item) => (
        <DecorPiece key={`${item.kind}-${item.x}-${item.z}`} item={item} theme={theme} />
      ))}
      {region === "neon" ? <NeonDecor party={party} /> : null}
      {region === "lounge" ? <Fireflies /> : null}
    </group>
  );
}

const FENCE_HEIGHT = 0.45;

/** A low rail marking the edge of the walkable area. */
function Fence({ color }: { color: string }) {
  const width = BOUNDS.x * 2 + 0.6;
  const depth = BOUNDS.zMax - BOUNDS.zMin + 0.6;
  const centerZ = (BOUNDS.zMax + BOUNDS.zMin) / 2;
  const rails: { position: [number, number, number]; size: [number, number, number] }[] = [
    { position: [0, FENCE_HEIGHT / 2, BOUNDS.zMax + 0.3], size: [width, FENCE_HEIGHT, 0.12] },
    { position: [0, FENCE_HEIGHT / 2, BOUNDS.zMin - 0.3], size: [width, FENCE_HEIGHT, 0.12] },
    { position: [BOUNDS.x + 0.3, FENCE_HEIGHT / 2, centerZ], size: [0.12, FENCE_HEIGHT, depth] },
    { position: [-BOUNDS.x - 0.3, FENCE_HEIGHT / 2, centerZ], size: [0.12, FENCE_HEIGHT, depth] },
  ];
  return (
    <group>
      {rails.map((rail, i) => (
        <mesh key={i} position={rail.position} castShadow receiveShadow>
          <boxGeometry args={rail.size} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function DecorPiece({ item, theme }: { item: DecorItem; theme: RegionTheme }) {
  switch (item.kind) {
    case "lamp":
      return (
        <group position={[item.x, 0, item.z]}>
          <mesh position={[0, 1.3, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 2.6, 10]} />
            <meshStandardMaterial color={theme.keyboardCase} roughness={0.5} />
          </mesh>
          <mesh position={[0, 2.75, 0]}>
            <sphereGeometry args={[0.22, 16, 12]} />
            <meshStandardMaterial
              color="#fff6e0"
              emissive={theme.dark ? theme.accent : "#ffd98a"}
              emissiveIntensity={theme.dark ? 1.4 : 0.6}
            />
          </mesh>
        </group>
      );
    case "column":
      return (
        <group position={[item.x, 0, item.z]}>
          <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.45, 0.5, 6.4, 20]} />
            <meshStandardMaterial color="#e9e2d2" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[1.3, 0.3, 1.3]} />
            <meshStandardMaterial color="#d6cdb9" roughness={0.9} />
          </mesh>
        </group>
      );
    case "floorLamp":
      return (
        <group position={[item.x, 0, item.z]}>
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
      );
  }
}

const WHITE_KEYS = KEYS.filter((k) => !k.black);

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
      <pointsMaterial color="#ffc070" size={0.12} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
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
        <mesh key={z} position={[0, 0.04, z]}>
          <boxGeometry args={[length, 0.06, 0.08]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} />
        </mesh>
      ))}
    </group>
  );
}
