"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PortalDef } from "../model/regions";

/** The gate: an upright oval, taller than Kordi, standing just off the floor. */
const GATE_WIDTH = 1.5;
const GATE_HEIGHT = 2.5;
const GATE_CENTER_Y = GATE_HEIGHT / 2 + 0.1;
const SPARK_COUNT = 28;
/** How much of the camera's downward angle the gate leans back to meet (0–1). */
const GATE_LEAN = 0.65;

/** Deterministic 0–1 noise per index (render must stay pure, so no Math.random here). */
function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A swirl: bright core fading out, with curved spiral arms. Drawn white so
 * the material colour tints it per portal.
 */
function makeSwirlTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;

  const core = ctx.createRadialGradient(c, c, 0, c, c, c);
  core.addColorStop(0, "rgba(255,255,255,0.95)");
  core.addColorStop(0.35, "rgba(255,255,255,0.45)");
  core.addColorStop(0.8, "rgba(255,255,255,0.12)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // spiral arms
  ctx.lineCap = "round";
  for (let arm = 0; arm < 4; arm++) {
    const offset = (arm / 4) * Math.PI * 2;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.01) {
      const angle = offset + t * Math.PI * 2.4;
      const radius = 8 + t * (c - 14);
      const x = c + Math.cos(angle) * radius;
      const y = c + Math.sin(angle) * radius;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 7;
    ctx.stroke();
  }

  // fade the square's corners so only a soft disc remains
  ctx.globalCompositeOperation = "destination-in";
  const mask = ctx.createRadialGradient(c, c, c * 0.6, c, c, c);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.center.set(0.5, 0.5);
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

/**
 * A standing oval of see-through swirling light — the gate turns to face the camera, its
 * two swirl layers counter-rotate inside a glowing rim, light pools on the
 * floor and sparks drift up through it.
 */
export function Portal({ portal, glow }: { portal: PortalDef; glow: boolean }) {
  const gate = useRef<THREE.Group>(null);
  const swirlA = useRef<THREE.Mesh>(null);
  const swirlB = useRef<THREE.Mesh>(null);
  const rim = useRef<THREE.Mesh>(null);
  const pool = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.Points>(null);
  const scratch = useRef(new THREE.Vector3());

  const assets = useMemo(() => {
    const swirl = makeSwirlTexture();
    const swirlBack = swirl.clone(); // separate rotation state for the second layer
    const glowTexture = makeGlowTexture();
    const positions = new Float32Array(SPARK_COUNT * 3);
    const speeds = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) {
      positions[i * 3] = (hash(i, 1) - 0.5) * GATE_WIDTH * 0.8;
      positions[i * 3 + 1] = hash(i, 2) * GATE_HEIGHT;
      positions[i * 3 + 2] = (hash(i, 3) - 0.5) * 0.3;
      speeds[i] = 0.5 + hash(i, 4) * 0.8;
    }
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { swirl, swirlBack, glowTexture, sparkGeometry, speeds };
  }, []);

  useEffect(
    () => () => {
      assets.swirl.dispose();
      assets.swirlBack.dispose();
      assets.glowTexture.dispose();
      assets.sparkGeometry.dispose();
    },
    [assets],
  );

  useFrame(({ clock, camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();

    // Face the camera: turn fully toward it, and lean back part of the way —
    // the camera looks down from above, and an untilted oval would read as a
    // squashed circle, while a fully flat billboard would stop feeling grounded
    if (gate.current) {
      const world = gate.current.getWorldPosition(scratch.current);
      const dx = camera.position.x - world.x;
      const dz = camera.position.z - world.z;
      const pitch = Math.atan2(camera.position.y - world.y, Math.hypot(dx, dz));
      gate.current.rotation.set(-pitch * GATE_LEAN, Math.atan2(dx, dz), 0, "YXZ");
    }
    const spin = (mesh: THREE.Mesh | null, speed: number) => {
      const map = (mesh?.material as THREE.MeshBasicMaterial | undefined)?.map;
      if (map) map.rotation += dt * speed;
    };
    spin(swirlA.current, -1.6);
    spin(swirlB.current, 0.9);

    const pulse = 1 + Math.sin(t * 3) * 0.04;
    if (rim.current) rim.current.scale.set((GATE_WIDTH / 2) * pulse, (GATE_HEIGHT / 2) * pulse, 1);
    if (pool.current) pool.current.scale.set(pulse, pulse, 1);

    if (!sparks.current) return;
    const attribute = sparks.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    for (let i = 0; i < SPARK_COUNT; i++) {
      let y = array[i * 3 + 1] + assets.speeds[i] * dt;
      if (y > GATE_HEIGHT) {
        y = 0;
        array[i * 3] = (Math.random() - 0.5) * GATE_WIDTH * 0.8;
      }
      // narrow toward the oval's top and bottom so sparks stay inside it
      const along = (y - GATE_HEIGHT / 2) / (GATE_HEIGHT / 2);
      const halfWidth = (GATE_WIDTH / 2) * Math.sqrt(Math.max(0, 1 - along * along));
      array[i * 3] = THREE.MathUtils.clamp(array[i * 3], -halfWidth * 0.85, halfWidth * 0.85);
      array[i * 3 + 1] = y;
    }
    attribute.needsUpdate = true;
  });

  // Additive light only reads on dark backgrounds; on cream it washes to white
  const material = {
    transparent: true,
    depthWrite: false,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
    color: portal.color,
    side: THREE.DoubleSide,
  } as const;

  return (
    <group position={[portal.x, portal.y ?? 0, portal.z]} scale={portal.hidden ? 0.55 : 1}>
      {/* light pooling on the floor */}
      <mesh ref={pool} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[GATE_WIDTH * 1.8, GATE_WIDTH * 1.2]} />
        <meshBasicMaterial map={assets.glowTexture} {...material} opacity={portal.hidden ? 0.25 : 0.5} />
      </mesh>

      <group ref={gate} position={[0, GATE_CENTER_Y, 0]}>
        {/* the swirl, squeezed into an upright oval; two layers turn opposite ways */}
        <mesh ref={swirlB} scale={[GATE_WIDTH, GATE_HEIGHT, 1]} position={[0, 0, -0.02]}>
          <circleGeometry args={[0.5, 48]} />
          <meshBasicMaterial map={assets.swirlBack} {...material} opacity={portal.hidden ? 0.12 : 0.28} />
        </mesh>
        <mesh ref={swirlA} scale={[GATE_WIDTH * 0.92, GATE_HEIGHT * 0.92, 1]}>
          <circleGeometry args={[0.5, 48]} />
          <meshBasicMaterial map={assets.swirl} {...material} opacity={portal.hidden ? 0.2 : 0.45} />
        </mesh>
        {/* glowing rim */}
        <mesh ref={rim} scale={[GATE_WIDTH / 2, GATE_HEIGHT / 2, 1]}>
          <torusGeometry args={[1, 0.035, 8, 64]} />
          <meshBasicMaterial {...material} opacity={portal.hidden ? 0.3 : 0.7} />
        </mesh>
        {/* rising sparks inside the gate */}
        <points ref={sparks} geometry={assets.sparkGeometry} position={[0, -GATE_HEIGHT / 2, 0.05]}>
          <pointsMaterial map={assets.glowTexture} size={0.14} sizeAttenuation {...material} opacity={0.8} />
        </points>
      </group>
    </group>
  );
}
