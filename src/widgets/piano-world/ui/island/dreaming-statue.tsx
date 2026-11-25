"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MIRROR_STONE, PLINTH, STANDING_STONES, STATUE, statueRuntime } from "../../engine/statue";
import { quality } from "../quality";
import { mergeParts, paint, useBuilt } from "./shared";

/*
 * The dreaming statue in its ring of standing stones (engine/statue.ts): an
 * old stone Kordi asleep on a plinth, hugging a small harp, and the mirror
 * stone in front of it. Everything of stone is one merged mesh (one draw
 * call, one material); everything that glows — the mirror stone's filling
 * light, the statue's opened eyes, the "z"s drifting off its head — shares a
 * second.
 */

const STONE = "#9d998f";
const STONE_DARK = "#7d7970";
const STONE_PALE = "#b9b6ad";
const CARVED = "#4c4841";
const MOSS = "#6f8a4e";
const MOSS_DARK = "#56733f";
const MIRROR = "#cfd3dc";
const DREAM_GLOW = "#ffe9a8";

/** The figure is modelled at twice Kordi's model size, then grown by this: it should look over the head of whoever sits before it */
const FIGURE_SCALE = 1.3;
/** The middle of its bean body above the plinth's top, before FIGURE_SCALE */
const BODY_Y = 1.3;
/** Where its eyes are on the front of the body (above the plinth's top, before FIGURE_SCALE) */
const EYES: readonly [x: number, y: number, z: number][] = [
  [-0.36, BODY_Y + 0.55, 0.84],
  [0.36, BODY_Y + 0.55, 0.84],
];
/** The mirror stone's rim, where its light fills in a ring round whoever sits on it (their body hides the middle) */
const RIM = { inner: MIRROR_STONE.r * 0.72, outer: MIRROR_STONE.r * 0.9, segments: 48 };

const hash = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** A clump of moss: a squashed, rough ball */
const moss = (x: number, y: number, z: number, r: number, seed: number) =>
  paint(new THREE.IcosahedronGeometry(r, 1).scale(1, 0.38, 0.9).translate(x, y, z), hash(seed, 9) > 0.5 ? MOSS : MOSS_DARK);

/** Everything of stone, in the statue's own space (origin: the ground under the statue; it faces +z) */
function stoneGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const lathe = (points: number[][], segments: number) =>
    new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments, Math.PI / segments);

  // the plinth: a worn octagonal block with a bevelled top
  parts.push(
    paint(
      lathe(
        [
          [PLINTH.r + 0.08, 0],
          [PLINTH.r, PLINTH.top - 0.14],
          [PLINTH.r - 0.16, PLINTH.top],
          [0, PLINTH.top],
        ],
        8,
      ),
      STONE_DARK,
    ),
  );

  // Kordi, sitting: the bean body nodding forward in sleep, feet out in front (modelled on the plinth's top at y = 0)
  const figure: THREE.BufferGeometry[] = [];
  figure.push(paint(new THREE.CapsuleGeometry(1, 0.84, 5, 12).scale(1, 1, 0.9).rotateX(0.1).translate(0, BODY_Y, 0), STONE));
  for (const side of [-1, 1]) {
    figure.push(paint(new THREE.SphereGeometry(0.34, 8, 6).scale(1, 0.62, 1.35).translate(side * 0.5, 0.2, 1.05), STONE_DARK));
    // arms wrapped round the harp
    figure.push(
      paint(
        new THREE.SphereGeometry(0.3, 8, 6)
          .scale(1.7, 0.72, 0.8)
          .rotateY(side * -0.75)
          .translate(side * 0.7, BODY_Y - 0.12, 0.78),
        STONE,
      ),
    );
    // eyes closed: a little carved arc each, curving down
    const [ex, ey, ez] = EYES[side < 0 ? 0 : 1];
    figure.push(paint(new THREE.TorusGeometry(0.13, 0.032, 4, 8, Math.PI).rotateZ(Math.PI).rotateX(-0.2).translate(ex, ey + 0.05, ez + 0.02), CARVED));
  }
  // the small harp in its lap: a curved neck, a pillar, a soundboard, four strings
  const harp: THREE.BufferGeometry[] = [
    new THREE.TorusGeometry(0.42, 0.065, 5, 10, Math.PI * 0.75).rotateZ(Math.PI * 0.3).translate(0.06, 0.2, 0),
    new THREE.CylinderGeometry(0.06, 0.07, 0.95, 5).translate(-0.34, -0.1, 0),
    new THREE.BoxGeometry(0.72, 0.12, 0.2).rotateZ(0.5).translate(0.02, -0.48, 0),
    ...[-0.18, -0.04, 0.1, 0.24].map((x, i) => new THREE.BoxGeometry(0.025, 0.78 - i * 0.14, 0.025).translate(x, -0.06 + i * 0.06, 0)),
  ];
  for (const part of harp) figure.push(paint(part.rotateX(-0.18).translate(0, BODY_Y - 0.05, 1.05), STONE_PALE));
  // moss: it has sat here a long time
  figure.push(moss(-0.35, BODY_Y + 1.36, -0.1, 0.55, 1), moss(0.72, BODY_Y + 0.72, -0.25, 0.4, 2));
  for (const part of figure) parts.push(part.scale(FIGURE_SCALE, FIGURE_SCALE, FIGURE_SCALE).translate(0, PLINTH.top, 0));
  parts.push(moss(-1.15, PLINTH.top + 0.02, 1.0, 0.5, 3), moss(1.25, PLINTH.top + 0.02, -0.8, 0.55, 4));

  // the standing stones: rough five-sided slabs, leaning as they've settled, moss on the tall ones
  STANDING_STONES.forEach((stone, i) => {
    const x = stone.x - STATUE.x;
    const z = stone.z - STATUE.z;
    const slab = new THREE.CylinderGeometry(stone.r * 0.62, stone.r * 1.05, stone.height, 5)
      .scale(1, 1, 0.7)
      .translate(0, stone.height / 2 - 0.1, 0)
      .rotateZ(stone.lean)
      .rotateY(stone.turn)
      .translate(x, 0, z);
    parts.push(paint(slab, i % 3 === 0 ? STONE_DARK : i % 3 === 1 ? STONE : STONE_PALE));
    if (i % 2 === 0) parts.push(moss(x - Math.sin(stone.lean) * stone.height * 0.9, stone.height - 0.12, z, stone.r * 0.7, 10 + i));
    parts.push(moss(x + 0.3, 0.05, z + 0.35, stone.r * 0.8, 30 + i));
  });

  // the mirror stone: a low polished disc…
  const mx = MIRROR_STONE.x - STATUE.x;
  const mz = MIRROR_STONE.z - STATUE.z;
  parts.push(paint(new THREE.CylinderGeometry(MIRROR_STONE.r, MIRROR_STONE.r + 0.08, MIRROR_STONE.top, 20).translate(mx, MIRROR_STONE.top / 2, mz), MIRROR));
  // …a shallow groove round its rim, which is what fills with light
  parts.push(paint(new THREE.RingGeometry(RIM.inner, RIM.outer, 32).rotateX(-Math.PI / 2).translate(mx, MIRROR_STONE.top + 0.006, mz), STONE));
  return mergeParts(parts);
}

/** A flat letter z, about `size` tall, facing +z */
function zGeometry(size: number) {
  const s = size / 2;
  const t = size * 0.22;
  const shape = new THREE.Shape();
  shape.moveTo(-s, s);
  shape.lineTo(s, s);
  shape.lineTo(s, s - t);
  shape.lineTo(-s + t * 1.6, -s + t);
  shape.lineTo(s, -s + t);
  shape.lineTo(s, -s);
  shape.lineTo(-s, -s);
  shape.lineTo(-s, -s + t);
  shape.lineTo(s - t * 1.6, s - t);
  shape.lineTo(-s, s - t);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** How many "z"s are in the air at once, and how long each takes to drift up and away */
const Z_COUNT = quality.tier === "minimal" ? 2 : 3;
const Z_SECONDS = 4.2;
const Z_RISE = 2.3;
const EYES_OPEN_SECONDS = 0.35;
/** The top of its head above the ground */
const HEAD_Y = PLINTH.top + (BODY_Y + 1.42) * FIGURE_SCALE;

export function DreamingStatue() {
  const stone = useBuilt(stoneGeometry);
  const zShape = useBuilt(() => zGeometry(0.42));
  /** the dream's light: one unlit material for every glowing piece */
  const glow = useBuilt(() => new THREE.MeshBasicMaterial({ color: DREAM_GLOW, toneMapped: false, side: THREE.DoubleSide }));
  const rim = useRef<THREE.Mesh>(null);
  const fill = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null);
  const motes = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    const { progress, wokenAt } = statueRuntime;
    // the eyes open over a moment (wokenAt is on this same clock: the island's frame writes it)
    const awake = THREE.MathUtils.clamp((now - wokenAt) / EYES_OPEN_SECONDS, 0, 1);

    // the mirror stone's light runs round its rim as you sit (the ring is drawn only so far), and the whole stone lights once it's full
    if (rim.current) {
      const lit = Math.ceil(progress * RIM.segments);
      rim.current.visible = lit > 0;
      rim.current.geometry.setDrawRange(0, lit * 6);
    }
    if (fill.current) fill.current.visible = progress >= 1;
    if (eyes.current) {
      eyes.current.visible = awake > 0;
      eyes.current.children.forEach((eye) => eye.scale.setScalar(Math.max(0.001, awake)));
    }
    // "z"s drift up off its head, one after another, while it sleeps
    motes.current?.children.forEach((mote, i) => {
      const k = (now / Z_SECONDS + i / Z_COUNT) % 1;
      // grows as it leaves, shrinks away at the top; gone the moment the statue wakes
      const size = Math.sin(k * Math.PI) ** 0.6 * (0.55 + k * 0.75) * (1 - awake);
      mote.visible = size > 0.01;
      mote.position.set(0.7 + k * 1.1 + Math.sin(k * 7 + i) * 0.18, HEAD_Y + 0.3 + k * Z_RISE, 0.4);
      mote.rotation.z = Math.sin(k * 5 + i * 2) * 0.25;
      mote.scale.setScalar(Math.max(0.001, size));
    });
  });

  return (
    <group position={[STATUE.x, 0, STATUE.z]}>
      <mesh geometry={stone} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.92} />
      </mesh>
      {/* one material for all that glows; each piece shows and hides by its scale */}
      <group position={[MIRROR_STONE.x - STATUE.x, MIRROR_STONE.top + 0.012, MIRROR_STONE.z - STATUE.z]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* the ring starts at the back of the stone (towards the statue) and runs round */}
        <mesh ref={rim} visible={false} material={glow} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[RIM.inner, RIM.outer, RIM.segments, 1]} />
        </mesh>
        <mesh ref={fill} visible={false} material={glow} position={[0, 0, -0.004]}>
          <circleGeometry args={[RIM.inner, 28]} />
        </mesh>
      </group>
      <group ref={eyes} visible={false} position={[0, PLINTH.top, 0]} scale={FIGURE_SCALE}>
        {EYES.map(([x, y, z], i) => (
          <mesh key={i} material={glow} position={[x, y, z]} scale={0.001}>
            <sphereGeometry args={[0.13, 10, 8]} />
          </mesh>
        ))}
      </group>
      <group ref={motes}>
        {Array.from({ length: Z_COUNT }, (_, i) => (
          <mesh key={i} material={glow} geometry={zShape} />
        ))}
      </group>
    </group>
  );
}
