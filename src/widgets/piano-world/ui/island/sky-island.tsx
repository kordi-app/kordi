"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { skyAt } from "../../engine/day-night";
import {
  CONSTELLATIONS,
  ISLAND_GATE,
  ORRERY,
  SKY_ISLAND,
  STAR_PADS,
  STAR_RADIUS,
  STAR_STEPS,
  STAR_THICKNESS,
  gateOpenedAt,
  openGates,
  skyClosing,
  skyNow,
  skyRuntime,
} from "../../engine/sky-island";
import { mergeParts, useBuilt } from "./shared";

/**
 * The sky island and the star steps up to it, drawn from the same state the
 * terrain reads (engine/sky-island.ts): a star is here when you can stand on
 * it. Stars drop into place one per stroke of the midnight bell and flicker
 * before the sky closes.
 */

const STAR_GOLD = "#ffe9a8";
const STAR_DIM = "#8fa8d8";
const GRASS = "#7fd8c8";
const STONE = "#2c3352";

/** A five-pointed star outline (radius `outer`), in shape space. */
function starShape(outer: number, inner = outer * 0.48) {
  const shape = new THREE.Shape();
  for (let k = 0; k <= 10; k++) {
    const r = k % 2 === 0 ? outer : inner;
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    if (k === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return shape;
}

/** A thick star lying flat, its top face at y = 0 (a step you stand on). */
function starStepGeometry() {
  const g = new THREE.ExtrudeGeometry(starShape(STAR_RADIUS * 1.2), {
    depth: STAR_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  // lay it flat: the extrusion (shape-space z) runs downwards from y = 0
  return g.rotateX(Math.PI / 2);
}

/** The island's underside: a rough stone cone hanging below the lawn. */
function rockGeometry() {
  const { radius, thickness } = SKY_ISLAND;
  const rock = new THREE.CylinderGeometry(radius, radius * 0.18, 6, 14, 3).translate(0, -thickness - 3, 0);
  // knock the cone about a little so it reads as rock, not a funnel
  const p = rock.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > -thickness - 0.01) continue;
    const wobble = 1 + Math.sin(i * 12.9898) * 0.12;
    p.setX(i, p.getX(i) * wobble);
    p.setZ(i, p.getZ(i) * wobble);
  }
  rock.computeVertexNormals();
  return rock;
}

/** The lawn you walk on, its top at y = 0 */
const lawnGeometry = () =>
  new THREE.CylinderGeometry(SKY_ISLAND.radius, SKY_ISLAND.radius, SKY_ISLAND.thickness, 32).translate(0, -SKY_ISLAND.thickness / 2, 0);

/** A ring of crystals round the rim */

function crystalsGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.3;
    const h = 0.6 + ((k * 7) % 5) * 0.18;
    parts.push(
      new THREE.OctahedronGeometry(0.28, 0)
        .scale(1, h / 0.28, 1)
        .rotateZ(Math.sin(k) * 0.25)
        .translate(Math.cos(a) * (SKY_ISLAND.radius - 0.4), h * 0.6, Math.sin(a) * (SKY_ISLAND.radius - 0.4)),
    );
  }
  return mergeParts(parts);
}

/** The orrery: a pedestal, then rings turning round a little golden sun. */
function Orrery() {
  const rings = useRef<THREE.Group>(null);
  const sun = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    const now = skyNow();
    const finished = skyRuntime.finishedAt > -Infinity;
    const speed = finished ? 2.4 : 0.25;
    rings.current?.children.forEach((ring, i) => {
      ring.rotation.x += delta * speed * (0.6 + i * 0.35);
      ring.rotation.y += delta * speed * (0.3 + i * 0.2) * (i % 2 ? -1 : 1);
    });
    if (sun.current) {
      const glow = finished ? 0.75 + 0.25 * Math.sin(now * 4) : 0.45;
      sun.current.color.set(STAR_GOLD).multiplyScalar(glow + 0.3);
    }
  });
  return (
    <group position={[ORRERY.x - SKY_ISLAND.x, 0, ORRERY.z - SKY_ISLAND.z]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[ORRERY.radius * 0.7, ORRERY.radius, 0.8, 16]} />
        <meshStandardMaterial color="#c9b27a" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 8]} />
        <meshStandardMaterial color="#c9b27a" metalness={0.6} roughness={0.35} />
      </mesh>
      <group ref={rings} position={[0, 1.8, 0]}>
        {[1.0, 0.82, 0.64].map((r) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.035, 8, 48]} />
            <meshStandardMaterial color="#e3c27a" metalness={0.7} roughness={0.3} emissive="#6a4a10" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshBasicMaterial ref={sun} color={STAR_GOLD} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The star pads, and each constellation's lines once all its stars are lit. */
function Constellations() {
  const pads = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const lines = useRef<(THREE.Group | null)[]>([]);
  const padGeometry = useBuilt(() => new THREE.ShapeGeometry(starShape(0.55)).rotateX(-Math.PI / 2));
  useFrame(() => {
    const now = skyNow();
    STAR_PADS.forEach((pad, i) => {
      const material = pads.current[i];
      if (!material) return;
      const done = skyRuntime.done[pad.group];
      const lit = skyRuntime.lit[i] > -Infinity;
      // a lit star breathes until its constellation is done, then holds steady
      const level = done ? 1 : lit ? 0.75 + 0.25 * Math.sin(now * 5 + i) : 0.55 + 0.1 * Math.sin(now * 1.3 + i * 1.7);
      material.color.set(lit || done ? STAR_GOLD : STAR_DIM).multiplyScalar(level);
    });
    lines.current.forEach((group, k) => {
      if (group) group.visible = skyRuntime.done[k];
    });
  });

  return (
    <>
      {STAR_PADS.map((pad, i) => (
        <mesh key={i} geometry={padGeometry} position={[pad.x - SKY_ISLAND.x, 0.03, pad.z - SKY_ISLAND.z]}>
          <meshBasicMaterial
            ref={(m) => {
              pads.current[i] = m;
            }}
            color={STAR_DIM}
            toneMapped={false}
          />
        </mesh>
      ))}
      {CONSTELLATIONS.map((c, k) => (
        <group
          key={c.numeral}
          visible={false}
          ref={(g) => {
            lines.current[k] = g;
          }}
        >
          {c.pads.map((from, j) => {
            const a = STAR_PADS[from];
            const b = STAR_PADS[c.pads[(j + 1) % c.pads.length]];
            const length = Math.hypot(b.x - a.x, b.z - a.z);
            return (
              <mesh
                key={j}
                position={[(a.x + b.x) / 2 - SKY_ISLAND.x, 0.04, (a.z + b.z) / 2 - SKY_ISLAND.z]}
                rotation={[0, -Math.atan2(b.z - a.z, b.x - a.x), 0]}
              >
                <boxGeometry args={[length, 0.02, 0.07]} />
                <meshBasicMaterial color={STAR_GOLD} transparent opacity={0.8} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

/**
 * Light the whole sky and an eighth note made of stars hangs beyond the
 * island's far edge — and stays there on every night after (you found it).
 */
const NOTE_STARS: readonly [number, number][] = [
  // the head
  [-2.2, -0.6],
  [-1.5, -1.0],
  [-0.8, -0.5],
  [-1.5, -0.1],
  // the stem
  [-0.8, 1.2],
  [-0.8, 2.8],
  // the flag
  [0.4, 2.1],
  [1.1, 1.0],
];
const NOTE_LINES: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [2, 4],
  [4, 5],
  [5, 6],
  [6, 7],
];
/** Where the note hangs: past the island's back edge, low enough to be in view from up there */
const NOTE_AT = { x: SKY_ISLAND.x, y: SKY_ISLAND.top - 0.5, z: SKY_ISLAND.z - SKY_ISLAND.radius - 3 };
/** big enough to read from the island (~6 units tall), low enough to stay in view */
const NOTE_SCALE = 1.7;

function NoteConstellation({ found }: { found: boolean }) {
  const group = useRef<THREE.Group>(null);
  const nightCheck = useRef({ at: -Infinity, night: 0 });
  useFrame(() => {
    const now = skyNow();
    if (now - nightCheck.current.at > 1) nightCheck.current = { at: now, night: skyAt(Date.now()).night };
    if (group.current) {
      const earned = found || skyRuntime.finishedAt > -Infinity;
      group.current.visible = earned && (nightCheck.current.night > 0.5 || openGates(now) > ISLAND_GATE);
    }
  });
  return (
    <group ref={group} position={[NOTE_AT.x, NOTE_AT.y, NOTE_AT.z]} visible={false}>
      {NOTE_STARS.map(([x, y], i) => (
        <mesh key={i} position={[x * NOTE_SCALE, y * NOTE_SCALE, 0]}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshBasicMaterial color={STAR_GOLD} toneMapped={false} />
        </mesh>
      ))}
      {NOTE_LINES.map(([from, to]) => {
        const [ax, ay] = NOTE_STARS[from];
        const [bx, by] = NOTE_STARS[to];
        const length = Math.hypot(bx - ax, by - ay) * NOTE_SCALE;
        return (
          <mesh
            key={`${from}-${to}`}
            position={[((ax + bx) / 2) * NOTE_SCALE, ((ay + by) / 2) * NOTE_SCALE, 0]}
            rotation={[0, 0, Math.atan2(by - ay, bx - ax)]}
          >
            <boxGeometry args={[length, 0.07, 0.07]} />
            <meshBasicMaterial color={STAR_GOLD} transparent opacity={0.55} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Ease-out-back: overshoots a touch, so a star settles into place */
const settle = (t: number) => {
  const c = 1.7;
  const u = Math.min(1, Math.max(0, t)) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

export function SkyIsland({ found }: { found: boolean }) {
  const stepGeometry = useBuilt(starStepGeometry);
  const island = useBuilt(rockGeometry);
  const rim = useBuilt(lawnGeometry);
  const crystals = useBuilt(crystalsGeometry);
  const steps = useRef<(THREE.Mesh | null)[]>([]);
  const stepMaterials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const isle = useRef<THREE.Group>(null);

  useFrame(() => {
    const now = skyNow();
    const gates = openGates(now);
    const closing = skyClosing(now);
    // before it goes, everything flickers faster and faster
    const flicker = closing > 0 ? 0.55 + 0.45 * Math.sin(now * (6 + 24 * closing)) : 1;
    STAR_STEPS.forEach((step, i) => {
      const mesh = steps.current[i];
      if (!mesh) return;
      mesh.visible = i < gates;
      if (!mesh.visible) return;
      const t = settle((now - gateOpenedAt(i)) / 0.4);
      // falls into place from a little above, spinning slowly once it's there
      mesh.position.set(step.x, step.top + (1 - t) * 2.5, step.z);
      mesh.scale.setScalar(Math.max(0.01, t));
      mesh.rotation.y = now * 0.3 + i * 0.9;
      const material = stepMaterials.current[i];
      if (material) material.emissiveIntensity = 0.55 * flicker;
    });
    if (isle.current) {
      isle.current.visible = gates > ISLAND_GATE;
      const t = settle((now - gateOpenedAt(ISLAND_GATE)) / 0.8);
      isle.current.scale.setScalar(Math.max(0.01, t));
      isle.current.position.y = SKY_ISLAND.top + (1 - Math.min(1, t)) * 3;
    }
  });

  return (
    <group>
      {STAR_STEPS.map((step, i) => (
        <mesh
          key={i}
          geometry={stepGeometry}
          visible={false}
          ref={(m) => {
            steps.current[i] = m;
          }}
        >
          <meshStandardMaterial
            ref={(m) => {
              stepMaterials.current[i] = m;
            }}
            color="#f2c45a"
            emissive="#ffb22e"
            emissiveIntensity={0.55}
            roughness={0.35}
            metalness={0.2}
          />
        </mesh>
      ))}
      <group ref={isle} position={[SKY_ISLAND.x, SKY_ISLAND.top, SKY_ISLAND.z]} visible={false}>
        <mesh geometry={island} receiveShadow>
          <meshStandardMaterial color={STONE} roughness={0.95} emissive="#1a2140" emissiveIntensity={0.5} flatShading />
        </mesh>
        <mesh geometry={rim} receiveShadow>
          <meshStandardMaterial color={GRASS} roughness={0.6} emissive={GRASS} emissiveIntensity={0.25} />
        </mesh>
        <mesh geometry={crystals}>
          <meshStandardMaterial color="#cfe9ff" emissive="#7fb8ff" emissiveIntensity={0.9} roughness={0.2} transparent opacity={0.85} />
        </mesh>
        <pointLight color="#bcd7ff" intensity={30} distance={16} decay={2} position={[0, 3, 0]} />
        <Orrery />
        <Constellations />
      </group>
      <NoteConstellation found={found} />
    </group>
  );
}
