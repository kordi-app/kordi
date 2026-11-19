"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PortalDef } from "../model/regions";

const COLUMN_HEIGHT = 2.8;
const COLUMN_RADIUS = 0.62;
const SPARK_COUNT = 36;

/**
 * Vertical gradient for the light column: bright at the floor, fading out
 * toward the top, with soft horizontal banding that scrolls upward.
 */
function makeColumnTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 128, 0, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 128);
  // faint bands give the upward flow something to show
  ctx.globalCompositeOperation = "destination-out";
  for (let y = 0; y < 128; y += 16) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, y, 4, 5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Soft round glow for the floor pool and the sparks. */
function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/** Deterministic 0–1 noise per index (render must stay pure, so no Math.random here). */
function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** A helix ribbon winding up the column. */
function makeHelix(turns: number, phase: number) {
  const points: THREE.Vector3[] = [];
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = phase + t * turns * Math.PI * 2;
    // narrows slightly as it rises, like a vortex
    const radius = COLUMN_RADIUS * (1.05 - t * 0.35);
    points.push(new THREE.Vector3(Math.cos(angle) * radius, t * COLUMN_HEIGHT, Math.sin(angle) * radius));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, 0.025, 6, false);
}

/**
 * A swirling column of light rising from a glowing pool — a gate you walk
 * into, not a sign. Unlit, and additive on dark regions so it glows; normal
 * blending on light ones so the colour survives.
 */
export function Portal({ portal, glow }: { portal: PortalDef; glow: boolean }) {
  const column = useRef<THREE.Mesh>(null);
  const spiral = useRef<THREE.Group>(null);
  const pool = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.Points>(null);

  const assets = useMemo(() => {
    const columnTexture = makeColumnTexture();
    const glow = makeGlowTexture();
    const helices = [makeHelix(1.6, 0), makeHelix(1.6, Math.PI), makeHelix(1.1, Math.PI / 2)];

    const positions = new Float32Array(SPARK_COUNT * 3);
    const speeds = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) {
      const angle = hash(i, 1) * Math.PI * 2;
      const radius = hash(i, 2) * COLUMN_RADIUS;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = hash(i, 3) * COLUMN_HEIGHT;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      speeds[i] = 0.5 + hash(i, 4) * 0.9;
    }
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { columnTexture, glow, helices, sparkGeometry, speeds };
  }, []);

  useEffect(
    () => () => {
      assets.columnTexture.dispose();
      assets.glow.dispose();
      assets.helices.forEach((h) => h.dispose());
      assets.sparkGeometry.dispose();
    },
    [assets],
  );

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    if (spiral.current) spiral.current.rotation.y = t * 1.6;
    if (pool.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.06;
      pool.current.scale.set(pulse, pulse, 1);
    }
    if (column.current) {
      const material = column.current.material as THREE.MeshBasicMaterial;
      material.opacity = (portal.hidden ? 0.28 : 0.55) + Math.sin(t * 3) * 0.08;
      if (material.map) material.map.offset.y -= dt * 0.35; // light flows upward
    }
    // sparks drift up and respawn at the floor
    if (!sparks.current) return;
    const attribute = sparks.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    for (let i = 0; i < SPARK_COUNT; i++) {
      let y = array[i * 3 + 1] + assets.speeds[i] * dt;
      if (y > COLUMN_HEIGHT * 1.1) {
        y = 0;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * COLUMN_RADIUS;
        array[i * 3] = Math.cos(angle) * radius;
        array[i * 3 + 2] = Math.sin(angle) * radius;
      }
      array[i * 3 + 1] = y;
    }
    attribute.needsUpdate = true;
  });

  // Additive light only reads on dark backgrounds; on cream it washes to white
  const additive = {
    transparent: true,
    depthWrite: false,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
    color: portal.color,
  } as const;

  return (
    <group
      position={[portal.x, (portal.y ?? 0) + 0.02, portal.z]}
      scale={portal.hidden ? 0.55 : 1}
    >
      {/* glowing pool on the floor */}
      <mesh ref={pool} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[COLUMN_RADIUS * 4, COLUMN_RADIUS * 4]} />
        <meshBasicMaterial map={assets.glow} {...additive} opacity={0.9} />
      </mesh>

      {/* the light column */}
      <mesh ref={column} position={[0, COLUMN_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[COLUMN_RADIUS * 0.75, COLUMN_RADIUS, COLUMN_HEIGHT, 32, 1, true]} />
        <meshBasicMaterial map={assets.columnTexture} {...additive} side={THREE.DoubleSide} opacity={0.55} />
      </mesh>

      {/* spiral ribbons */}
      <group ref={spiral}>
        {assets.helices.map((geometry, i) => (
          <mesh key={i} geometry={geometry}>
            <meshBasicMaterial {...additive} opacity={i === 2 ? 0.45 : 0.8} />
          </mesh>
        ))}
      </group>

      {/* rising sparks */}
      <points ref={sparks} geometry={assets.sparkGeometry}>
        <pointsMaterial map={assets.glow} size={0.16} sizeAttenuation {...additive} opacity={0.95} />
      </points>
    </group>
  );
}
