"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PortalDef } from "../engine/regions";

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
 * A thin rune circle for the floor: two fine rings with short ticks and dots
 * between them, white so the material tints it.
 */
function makeRuneTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, c - 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c, c, c - 30, 0, Math.PI * 2);
  ctx.stroke();
  const marks = 24;
  for (let i = 0; i < marks; i++) {
    const a = (i / marks) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(c + cos * (c - 18), c + sin * (c - 18), 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c + cos * (c - 12), c + sin * (c - 12));
      ctx.lineTo(c + cos * (c - 24), c + sin * (c - 24));
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.center.set(0.5, 0.5);
  return texture;
}

/**
 * Swirl layers stacked front-to-back inside the gate. Each turns at its own
 * speed and sits at its own depth, so moving around the portal shows real
 * parallax — it reads as a volume of light rather than a picture of one.
 */
const LAYERS = [
  { z: -0.2, scale: 1, speed: 0.7, opacity: 0.16 },
  { z: -0.07, scale: 0.88, speed: -1.1, opacity: 0.22 },
  { z: 0.07, scale: 0.74, speed: 1.6, opacity: 0.28 },
  { z: 0.2, scale: 0.58, speed: -2.2, opacity: 0.34 },
] as const;
const ORBIT_COUNT = 26;

/**
 * A see-through vortex standing upright: stacked counter-rotating swirl
 * layers, a soft halo behind, motes orbiting around it in depth, sparks
 * rising inside, and light pooling on the floor. No hard outline — the edge
 * is just where the light fades.
 */
export function Portal({ portal, glow }: { portal: PortalDef; glow: boolean }) {
  const gate = useRef<THREE.Group>(null);
  const layers = useRef<(THREE.Mesh | null)[]>([]);
  const halo = useRef<THREE.Mesh>(null);
  const pool = useRef<THREE.Mesh>(null);
  const runes = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.Points>(null);
  const orbit = useRef<THREE.Points>(null);
  const scratch = useRef(new THREE.Vector3());
  // normal blending on light regions needs more opacity to read as light at all
  const fade = (portal.hidden ? 0.45 : 1) * (glow ? 1 : 1.9);

  const assets = useMemo(() => {
    const swirl = makeSwirlTexture();
    // each layer needs its own texture so it can spin independently
    const swirls = LAYERS.map((_, i) => (i === 0 ? swirl : swirl.clone()));
    const glowTexture = makeGlowTexture();
    const runeTexture = makeRuneTexture();

    const positions = new Float32Array(SPARK_COUNT * 3);
    const speeds = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) {
      positions[i * 3] = (hash(i, 1) - 0.5) * GATE_WIDTH * 0.8;
      positions[i * 3 + 1] = hash(i, 2) * GATE_HEIGHT;
      positions[i * 3 + 2] = (hash(i, 3) - 0.5) * 0.4;
      speeds[i] = 0.5 + hash(i, 4) * 0.8;
    }
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const orbitGeometry = new THREE.BufferGeometry();
    orbitGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ORBIT_COUNT * 3), 3));
    const orbitPhase = Float32Array.from({ length: ORBIT_COUNT }, (_, i) => hash(i, 5) * Math.PI * 2);

    return { swirls, glowTexture, runeTexture, sparkGeometry, speeds, orbitGeometry, orbitPhase };
  }, []);

  useEffect(
    () => () => {
      assets.swirls.forEach((t) => t.dispose());
      assets.glowTexture.dispose();
      assets.runeTexture.dispose();
      assets.sparkGeometry.dispose();
      assets.orbitGeometry.dispose();
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

    layers.current.forEach((mesh, i) => {
      const map = (mesh?.material as THREE.MeshBasicMaterial | undefined)?.map;
      if (map) map.rotation += dt * LAYERS[i].speed;
    });

    const pulse = 1 + Math.sin(t * 2.6) * 0.05;
    if (halo.current) halo.current.scale.set(GATE_WIDTH * 2.1 * pulse, GATE_HEIGHT * 1.6 * pulse, 1);
    if (pool.current) pool.current.scale.set(pulse, pulse, 1);
    // the rune circle turns slowly under the gate; the bright eye at its heart breathes
    if (runes.current) {
      const material = runes.current.material as THREE.MeshBasicMaterial;
      if (material.map) material.map.rotation = t * 0.25;
      material.opacity = (0.35 + Math.sin(t * 2.6) * 0.1) * fade;
    }
    if (core.current) {
      const flare = 0.55 + Math.sin(t * 3.3) * 0.12 + Math.sin(t * 7.1) * 0.05;
      core.current.scale.set(flare, flare, 1);
    }

    // motes circling the gate, sweeping in front of and behind it
    if (orbit.current) {
      const attribute = orbit.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      const array = attribute.array as Float32Array;
      for (let i = 0; i < ORBIT_COUNT; i++) {
        const angle = assets.orbitPhase[i] + t * (0.9 + (i % 3) * 0.25);
        array[i * 3] = Math.cos(angle) * GATE_WIDTH * 0.62;
        array[i * 3 + 1] = Math.sin(angle * 0.5 + assets.orbitPhase[i]) * GATE_HEIGHT * 0.42;
        array[i * 3 + 2] = Math.sin(angle) * 0.5;
      }
      attribute.needsUpdate = true;
    }

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
        <meshBasicMaterial map={assets.glowTexture} {...material} opacity={0.5 * fade} />
      </mesh>

      {/* a rune circle on the floor, turning slowly */}
      <mesh ref={runes} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <planeGeometry args={[GATE_WIDTH * 1.5, GATE_WIDTH * 1.5]} />
        <meshBasicMaterial map={assets.runeTexture} {...material} opacity={0.35 * fade} />
      </mesh>

      <group ref={gate} position={[0, GATE_CENTER_Y, 0]}>
        {/* soft halo behind, so the light seems to spill outward */}
        <mesh ref={halo} position={[0, 0, -0.32]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={assets.glowTexture} {...material} opacity={0.32 * fade} />
        </mesh>
        {/* stacked swirl layers, each at its own depth and speed */}
        {LAYERS.map((layer, i) => (
          <mesh
            key={i}
            ref={(el) => {
              layers.current[i] = el;
            }}
            position={[0, 0, layer.z]}
            scale={[GATE_WIDTH * layer.scale, GATE_HEIGHT * layer.scale, 1]}
          >
            <circleGeometry args={[0.5, 48]} />
            <meshBasicMaterial map={assets.swirls[i]} {...material} opacity={layer.opacity * fade} />
          </mesh>
        ))}
        {/* a bright eye at the heart of the swirl */}
        <mesh ref={core} position={[0, 0, 0.26]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={assets.glowTexture} {...material} opacity={0.5 * fade} />
        </mesh>
        {/* motes orbiting the gate in depth */}
        <points ref={orbit} geometry={assets.orbitGeometry}>
          <pointsMaterial map={assets.glowTexture} size={0.12} sizeAttenuation {...material} opacity={0.9 * fade} />
        </points>
        {/* sparks rising inside the gate */}
        <points ref={sparks} geometry={assets.sparkGeometry} position={[0, -GATE_HEIGHT / 2, 0]}>
          <pointsMaterial map={assets.glowTexture} size={0.12} sizeAttenuation {...material} opacity={0.75 * fade} />
        </points>
      </group>
    </group>
  );
}
