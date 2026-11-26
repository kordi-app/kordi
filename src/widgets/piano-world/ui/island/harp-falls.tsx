"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ILLUSORY_WALL } from "../../engine/cave";
import { CAVE, CLIFF, CRYSTALS, HARP, HARP_STRINGS, hash } from "../../engine/island";
import { POOL } from "../../engine/water";
import { FallsSpray } from "./falls-spray";
import { ROCK, GOLD, mergeParts, paint, sinceHit, useBuilt } from "./shared";
import { Water } from "./water";

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


const HARP_Z = (HARP.zMin + HARP.zMax) / 2;
const SOUNDBOARD = "#b0803a";
const MOSS = "#8fb36a";
const MOSS_DARK = "#7a9f58";
const STRATA = ["#968c80", "#b6ad9f", "#9f9588"];
/** a crack in the face: the rock's own colour, in shadow */
const CRACK = "#7f766a";
/** The two cliff faces either side of the cave mouth */
const CLIFF_PARTS = [
  { x0: CLIFF.x0, x1: CLIFF.caveX0 },
  { x0: CLIFF.caveX1, x1: CLIFF.x1 },
];

/** A hairline crack down the cliff's face from y1 to y0, wandering a little */
function crack(x: number, y0: number, y1: number, seed: number) {
  const parts: THREE.BufferGeometry[] = [];
  const stretches = Math.max(2, Math.round((y1 - y0) / 0.7));
  const tall = (y1 - y0) / stretches;
  for (let k = 0; k < stretches; k++) {
    const lean = (hash(seed + k, 82) - 0.5) * 0.5;
    const wide = k === 0 ? 0.06 : 0.035 + hash(seed + k, 83) * 0.035;
    parts.push(paint(new THREE.BoxGeometry(wide, tall + 0.06, 0.04).rotateZ(lean).translate(x, y0 + (k + 0.5) * tall, CLIFF.front + 0.01), CRACK));
    // the next stretch starts where this one's top leaned to
    x -= Math.sin(lean) * tall;
  }
  return parts;
}

/** The cave's way in (cave.ts ILLUSORY_WALL): the dark of the mouth, its deeper dark, and the rock round it */
const MOUTH = { width: ILLUSORY_WALL.width + 0.5, height: 3.2 };
const MOUTH_DARK = "#2a2530";
const MOUTH_DEEP = "#0d0b12";
const MOUTH_ROCK = ["#857b6f", "#968c80", "#7a7166"];

/** Where the mouth's sides stop rising and its round top begins, as a share of its height */
const MOUTH_SPRING = 0.45;

/** A round-topped arch, `w` wide and `h` high at its crown, standing on y = 0 */
function archShape(w: number, h: number) {
  const shape = new THREE.Shape();
  const half = w / 2;
  const spring = h * MOUTH_SPRING;
  shape.moveTo(-half, 0);
  shape.lineTo(-half, spring);
  // over the top, from the left side round to the right
  shape.absellipse(0, spring, half, h - spring, Math.PI, 0, true);
  shape.lineTo(half, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 16);
}

/**
 * The mouth of the cave in the cliff: a dark arch going into the rock, darker
 * further in, ringed by rough stones (a low pile either side, then round over
 * the top) and rubble fallen at its foot. Walking into the dark is walking in.
 */
function caveMouth(x: number) {
  const front = CLIFF.front;
  const parts: THREE.BufferGeometry[] = [
    paint(archShape(MOUTH.width, MOUTH.height).translate(x, 0, front + 0.03), MOUTH_DARK),
    paint(archShape(MOUTH.width * 0.7, MOUTH.height * 0.8).translate(x, 0, front + 0.05), MOUTH_DEEP),
  ];
  const stone = (seed: number, size: number, px: number, py: number, pz: number, squash = 1) =>
    paint(
      new THREE.DodecahedronGeometry(size, 0)
        .scale(1, squash, 0.8)
        .rotateY(hash(seed, 92) * 3)
        .rotateZ((hash(seed, 93) - 0.5) * 0.6)
        .translate(px, py, pz),
      MOUTH_ROCK[seed % MOUTH_ROCK.length],
    );
  // either side, a low pile up to where the arch turns: the lowest stone the biggest
  const spring = MOUTH.height * MOUTH_SPRING;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const seed = (side > 0 ? 40 : 20) + k;
      const size = 0.6 - k * 0.12 + hash(seed, 94) * 0.08;
      const out = MOUTH.width / 2 + 0.22 + hash(seed, 95) * 0.12;
      parts.push(stone(seed, size, x + side * out, 0.35 + k * spring * 0.62, front + 0.28, 0.85));
    }
  }
  // then round over the top, following the arch
  const RING = 7;
  for (let k = 0; k <= RING; k++) {
    const a = Math.PI - (k / RING) * Math.PI;
    const seed = 80 + k;
    const size = 0.42 + hash(seed, 94) * 0.16;
    parts.push(
      stone(
        seed,
        size,
        x + Math.cos(a) * (MOUTH.width / 2 + 0.28),
        spring + Math.sin(a) * (MOUTH.height - spring + 0.28),
        front + 0.26,
        0.8,
      ),
    );
  }
  // rubble fallen at the foot, kept to the sides so the way in stays clear
  for (let k = 0; k < 5; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const seed = 60 + k;
    const size = 0.13 + hash(seed, 96) * 0.14;
    const px = x + side * (MOUTH.width / 2 - 0.1 + hash(seed, 97) * 0.9);
    parts.push(stone(seed, size, px, size * 0.5, front + 0.55 + hash(seed, 98) * 0.9, 0.6));
  }
  return parts;
}

/**
 * Dressing for the plain cliff boxes, one vertex-coloured mesh: rock strata
 * running along the face in broken ledges, hairline cracks, a mossy cap over
 * the top with tufts spilling down the front, and a stone lip the water pours
 * over.
 */
function cliffDressingGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  let n = 0;
  for (const part of CLIFF_PARTS) {
    for (const [layer, y] of [2.6, 5.9, 9.1].entries()) {
      // each ledge broken into a few runs of different length and height
      let x = part.x0 + 0.3;
      while (x < part.x1 - 0.6) {
        n++;
        const run = Math.min(part.x1 - 0.3 - x, 2.5 + hash(n, 61) * 5);
        const h = 0.3 + hash(n, 62) * 0.35;
        const out = 0.14 + hash(n, 63) * 0.18;
        // a ledge low enough to cross the cave's mouth breaks off where the rock opens
        const reach = MOUTH.width / 2 + 0.7;
        const overMouth = y < MOUTH.height + 0.6 && x < ILLUSORY_WALL.x + reach && x + run > ILLUSORY_WALL.x - reach;
        if (!overMouth) {
          parts.push(
            paint(
              new THREE.BoxGeometry(run, h, 0.4 + out).translate(x + run / 2, y + (hash(n, 64) - 0.5) * 0.5, CLIFF.front - 0.2 + out / 2 + 0.1),
              STRATA[(layer + n) % STRATA.length],
            ),
          );
        }
        x += run + 0.15 + hash(n, 65) * 0.8;
      }
    }
    // cracks down the face, here and there, none of them reaching the ground
    for (let x = part.x0 + 2.5 + hash(n, 78) * 3; x < part.x1 - 1.5; x += 5 + hash(Math.round(x * 10), 79) * 5) {
      if (Math.abs(x - ILLUSORY_WALL.x) < 3.5) continue;
      const y0 = 0.5 + hash(Math.round(x * 10), 80) * 3.5;
      parts.push(...crack(x, y0, y0 + 1.6 + hash(Math.round(x * 10), 81) * 2.2, Math.round(x * 10)));
    }
    // the mossy cap, a hair proud of the cliff all round
    const w = part.x1 - part.x0;
    parts.push(
      paint(new THREE.BoxGeometry(w + 0.3, 0.3, CLIFF.front - CLIFF.back + 0.4).translate((part.x0 + part.x1) / 2, CLIFF.top + 0.1, (CLIFF.front + CLIFF.back) / 2), MOSS),
    );
    for (let x = part.x0 + 0.8; x < part.x1 - 0.8; x += 1.6 + hash(Math.round(x * 10), 66) * 2.2) {
      const drop = 0.4 + hash(Math.round(x * 10), 67) * 1.1;
      parts.push(
        paint(
          new THREE.BoxGeometry(0.7 + hash(Math.round(x * 10), 68) * 1.2, drop, 0.18).translate(x, CLIFF.top - drop / 2 + 0.05, CLIFF.front + 0.12),
          MOSS_DARK,
        ),
      );
    }
  }
  // where the cliff opens: the cave's way in
  parts.push(...caveMouth(ILLUSORY_WALL.x));
  // the lip the falls pour over, spanning the cave mouth
  // (its front stops just behind the falling sheet, so the two never z-fight)
  parts.push(paint(new THREE.BoxGeometry(CAVE.x1 - CAVE.x0 + 1.4, 0.55, CLIFF.front - CLIFF.back + 0.3).translate((CAVE.x0 + CAVE.x1) / 2, CLIFF.top - 0.15, (CLIFF.front + CLIFF.back) / 2 - 0.05), "#8e8578"));
  parts.push(paint(new THREE.BoxGeometry(CAVE.x1 - CAVE.x0 + 1.6, 0.22, CLIFF.front - CLIFF.back + 0.6).translate((CAVE.x0 + CAVE.x1) / 2, CLIFF.top + 0.2, (CLIFF.front + CLIFF.back) / 2), MOSS));
  return mergeParts(parts);
}

/** Boulders tucked against the cliff foot, pebbles round the pool, stones under the crystals. */
const ROCKS: { x: number; y: number; z: number; s: number; flat: number; turn: number }[] = (() => {
  const out: { x: number; y: number; z: number; s: number; flat: number; turn: number }[] = [];
  let n = 0;
  for (const part of CLIFF_PARTS) {
    for (let x = part.x0 + 1; x < part.x1 - 0.5; x += 1.8 + hash(n, 71) * 2.6) {
      n++;
      if (x > POOL.x - POOL.r - 1.2 && x < POOL.x + POOL.r + 1.2) continue; // keep the pool's banks clear
      if (Math.abs(x - ILLUSORY_WALL.x) < MOUTH.width / 2 + 0.4) continue; // and the cave's mouth
      const s = 0.35 + hash(n, 72) * 0.5;
      out.push({ x, y: s * 0.3, z: CLIFF.front + s * 0.1, s, flat: 0.6 + hash(n, 73) * 0.3, turn: hash(n, 74) * 6 });
    }
  }
  // the pool's front rim (the cliff side is the falls)
  for (let k = 0; k < 11; k++) {
    const a = 0.4 + (k / 10) * (Math.PI - 0.8) + (hash(k, 75) - 0.5) * 0.15;
    const s = 0.16 + hash(k, 76) * 0.18;
    out.push({ x: POOL.x + Math.cos(a) * (POOL.r + 0.15), y: s * 0.15, z: POOL.z + Math.sin(a) * (POOL.r + 0.15), s, flat: 0.55, turn: hash(k, 77) * 6 });
  }
  CRYSTALS.forEach((crystal, i) => out.push({ x: crystal.x, y: 0.05, z: crystal.z, s: 0.55, flat: 0.45, turn: i }));
  return out;
})();

/**
 * Small shards clustered round each singing crystal (one mesh), coloured like
 * their crystal and glowing faintly in their own colour.
 */
function shardsGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  CRYSTALS.forEach((crystal, i) => {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + hash(i * 7 + k, 81) * 0.8;
      const h = 0.25 + hash(i * 7 + k, 82) * 0.3;
      const shard = new THREE.OctahedronGeometry(1, 0)
        .scale(0.11, h, 0.11)
        .rotateZ(-0.45) // lean outward…
        .rotateY(-a) // …away from the big crystal
        .translate(crystal.x + Math.cos(a) * 0.5, h * 0.55, crystal.z + Math.sin(a) * 0.5);
      parts.push(paint(shard, new THREE.Color(crystal.color).offsetHSL(0, 0, -0.08 * hash(k, 83))));
    }
  });
  return mergeParts(parts);
}

/** A standard material whose emissive takes the vertex colour, so each shard glows in its own hue. */
function shardMaterial() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, emissive: "#ffffff", emissiveIntensity: 0.45, flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n  totalEmissiveRadiance *= vColor.rgb;",
    );
  };
  material.customProgramCacheKey = () => "harp-shards";
  return material;
}

/**
 * The harp's whole frame as one vertex-coloured mesh: soundboard with an
 * inlaid strip and string eyelets, a turned pillar with base and crown, the
 * stepped neck with a tuning peg over every string, and a slim column with a
 * scroll closing the treble end.
 */
function harpFrameGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const boardW = HARP_LAST - HARP_FIRST + 0.9;
  const boardX = (HARP_FIRST + HARP_LAST) / 2;
  parts.push(paint(new THREE.BoxGeometry(boardW, 0.44, 0.5).translate(boardX, 0.22, 0), SOUNDBOARD));
  parts.push(paint(new THREE.BoxGeometry(boardW + 0.08, 0.08, 0.58).translate(boardX, 0.04, 0), "#8c6430"));
  parts.push(paint(new THREE.BoxGeometry(boardW - 0.2, 0.05, 0.16).translate(boardX, 0.445, 0), GOLD));
  HARP_STRINGS.forEach((string) => {
    parts.push(paint(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8).translate(string.x, 0.47, 0), "#5a3d1c"));
  });
  // the pillar: a turned column, flared foot, ringed capital and a crown
  const pillarX = HARP_FIRST - 0.35;
  const pillar = new THREE.LatheGeometry(
    [
      [0.3, 0],
      [0.3, 0.12],
      [0.2, 0.3],
      [0.16, 0.5],
      [0.14, 3.4],
      [0.19, 3.5],
      [0.14, 3.6],
      [0.15, HARP.height - 0.5],
      [0.24, HARP.height - 0.35],
      [0.24, HARP.height - 0.22],
      [0.17, HARP.height - 0.1],
      [0.17, HARP.height],
      [0, HARP.height],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    14,
  ).translate(pillarX, 0, 0);
  parts.push(paint(pillar, GOLD));
  parts.push(paint(new THREE.SphereGeometry(0.26, 14, 10).translate(pillarX, HARP.height + 0.2, 0), GOLD));
  parts.push(paint(new THREE.SphereGeometry(0.09, 10, 8).translate(pillarX, HARP.height + 0.5, 0), GOLD));
  // the neck: the same stepped segments as before, now with a peg over each string
  HARP_STRINGS.slice(0, -1).forEach((string, i) => {
    const next = HARP_STRINGS[i + 1];
    const y0 = 0.35 + harpLength(i);
    const y1 = 0.35 + harpLength(i + 1);
    const segment = new THREE.BoxGeometry(Math.hypot(next.x - string.x, y1 - y0) + 0.06, 0.2, 0.22)
      .rotateZ(Math.atan2(y1 - y0, next.x - string.x))
      .translate((string.x + next.x) / 2, (y0 + y1) / 2 + 0.08, 0);
    parts.push(paint(segment, GOLD));
  });
  HARP_STRINGS.forEach((string, i) => {
    const y = 0.35 + harpLength(i) + 0.08;
    parts.push(paint(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 6).rotateX(Math.PI / 2).translate(string.x, y, 0), "#f4e3b0"));
  });
  // the treble end: a slim column up from the soundboard, and a scroll on top
  const endX = HARP_LAST + 0.22;
  const endTop = 0.35 + harpLength(HARP_STRINGS.length - 1) + 0.08;
  parts.push(paint(new THREE.BoxGeometry(endX - HARP_LAST + 0.06, 0.2, 0.22).translate((HARP_LAST + endX) / 2, endTop, 0), GOLD));
  parts.push(paint(new THREE.CylinderGeometry(0.07, 0.09, endTop - 0.44, 10).translate(endX, 0.44 + (endTop - 0.44) / 2, 0), GOLD));
  parts.push(paint(new THREE.TorusGeometry(0.17, 0.06, 8, 18, Math.PI * 1.6).rotateZ(-Math.PI / 2).translate(endX + 0.05, endTop + 0.2, 0), GOLD));
  return mergeParts(parts);
}

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
  const poolGeometry = useMemo(() => new THREE.CircleGeometry(POOL.r, 48).rotateX(-Math.PI / 2), []);
  useEffect(() => () => poolGeometry.dispose(), [poolGeometry]);
  const strings = useRef<(THREE.Mesh | null)[]>([]);
  const crystals = useRef<(THREE.Mesh | null)[]>([]);
  const fall = useRef<THREE.MeshStandardMaterial>(null);
  const dressing = useBuilt(cliffDressingGeometry);
  const frame = useBuilt(harpFrameGeometry);
  const shards = useBuilt(shardsGeometry);
  const shardGlow = useBuilt(shardMaterial);
  const rocks = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = rocks.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const c = new THREE.Color();
    ROCKS.forEach((rock, i) => {
      q.setFromEuler(e.set(rock.turn * 0.3, rock.turn, rock.turn * 0.2));
      mesh.setMatrixAt(i, m.compose(p.set(rock.x, rock.y, rock.z), q, sc.set(rock.s * 1.15, rock.s * rock.flat, rock.s)));
      mesh.setColorAt(i, c.set(ROCK).offsetHSL(0, (hash(i, 78) - 0.5) * 0.06, (hash(i, 79) - 0.6) * 0.14));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  useFrame(({ clock }, delta) => {
    if (fall.current?.map) fall.current.map.offset.y += delta * 1.5; // water falling
    if (sprayMaterial.current?.map) sprayMaterial.current.map.offset.y += delta * 2.3; // a faster sheet in front
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
      <Water kind="pool" geometry={poolGeometry} shore={POOL_SHORE} position={[POOL.x, POOL.level, POOL.z]} />
      {/* mist rising and droplets thrown out where the water lands (one mesh, alive in its shader) */}
      <FallsSpray position={[(CAVE.x0 + CAVE.x1) / 2, POOL.level, CLIFF.front + 0.25]} halfWidth={caveWidth / 2} />
      {/* the harp standing in the spray: a golden frame and glowing strings */}
      <group position={[0, 0, HARP_Z]}>
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
        {/* soundboard, pillar, neck and treble column: one mesh */}
        <mesh geometry={frame} castShadow>
          <meshStandardMaterial vertexColors roughness={0.38} metalness={0.25} />
        </mesh>
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
      <mesh geometry={shards} material={shardGlow} />
      <mesh geometry={dressing} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </mesh>
      <instancedMesh ref={rocks} args={[undefined, undefined, ROCKS.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.92} flatShading />
      </instancedMesh>
    </group>
  );
}
