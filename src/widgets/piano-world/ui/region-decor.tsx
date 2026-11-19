"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RegionId } from "../model/regions";
import { BOUNDS, CASE_H, KEYS, WHITE_H, WHITE_L } from "../model/layout";

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

const WHITE_KEYS = KEYS.filter((k) => !k.black);

/** Disco floor: a rainbow wave rolls across the white keys to a steady beat. */
function DiscoWave() {
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
      const wave = Math.max(0, Math.sin(t * 3 - key.x * 0.45));
      const beat = 0.55 + 0.45 * Math.max(0, Math.cos(t * Math.PI * 4));
      const strength = wave ** 3 * beat;
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
function NeonDecor() {
  const length = BOUNDS.x * 2;
  return (
    <group>
      <DiscoWave />
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
      <Fireflies />
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
