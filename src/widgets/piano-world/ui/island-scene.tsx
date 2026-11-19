"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { skyAt } from "../model/day-night";
import {
  BELL,
  BRIDGE_DEPTH,
  CAVE,
  CLIFF,
  CRYSTALS,
  DRUMS,
  HARP,
  HARP_STRINGS,
  ISLAND_BOUNDS,
  LAMPS,
  PATHS,
  PIPES,
  STAIRS,
  STAIR_SIZE,
  STAIR_THICKNESS,
  STREAM,
  TOWER,
  WARP_STONES,
  XYLO_BARS,
  XYLO_BAR_WIDTH,
  hash,
  islandHits,
  type WarpStone,
  type WarpStoneId,
} from "../model/island";

const GRASS = "#dfe8cf";
const PLAZA = "#f7f3ec";
const SAND = "#efe4c8";
const WATER = "#8fc3dc";
const PATH = "#d8d0bf";
const ROCK = "#a89f92";
const WOOD = "#8a6a4a";
/** Zones farther than this from Kordi aren't drawn (fog has swallowed them anyway) */
const DRAW_DISTANCE = 85;

/** Seconds since `tag` was last played (Infinity if never). */
function sinceHit(tag: string, now: number) {
  const at = islandHits.get(tag);
  return at === undefined ? Infinity : now - at;
}

/** A flat rounded rectangle lying on the ground (x/z extents in world units). */
function roundedRect(x0: number, x1: number, z0: number, z1: number, radius: number) {
  // Shape space is x / -z (the mesh is rotated flat), so world z0..z1 → shape y -z1..-z0
  const y0 = -z1;
  const y1 = -z0;
  const r = Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x1, y1 - r);
  shape.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x0 + r, y1);
  shape.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x0, y0 + r);
  shape.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return new THREE.ShapeGeometry(shape, 12);
}

/** Hides its children when Kordi is far away. */
function Zone({ x, z, player, children }: { x: number; z: number; player: THREE.Vector3; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = Math.hypot(player.x - x, player.z - z) < DRAW_DISTANCE;
  });
  return <group ref={group}>{children}</group>;
}

// --- ground, water, paths ----------------------------------------------------

function Ground() {
  const geometries = useMemo(() => {
    const { x, zMin, zMax } = ISLAND_BOUNDS;
    return {
      beach: roundedRect(-x - 9, x + 9, zMin - 9, zMax + 9, 22),
      grass: roundedRect(-x - 4, x + 4, zMin - 4, zMax + 4, 18),
      plaza: roundedRect(-34, 34, -9, 15, 6),
    };
  }, []);
  useEffect(() => () => Object.values(geometries).forEach((g) => g.dispose()), [geometries]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[700, 600]} />
        <meshStandardMaterial color={WATER} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} geometry={geometries.beach} receiveShadow>
        <meshStandardMaterial color={SAND} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} geometry={geometries.grass} receiveShadow>
        <meshStandardMaterial color={GRASS} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} geometry={geometries.plaza} receiveShadow>
        <meshStandardMaterial color={PLAZA} roughness={1} />
      </mesh>
      {/* the stream, banks to the sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[STREAM.x, 0.01, (STREAM.zMin + STREAM.zMax) / 2]} receiveShadow>
        <planeGeometry args={[STREAM.width, STREAM.zMax - STREAM.zMin + 10]} />
        <meshStandardMaterial color={WATER} roughness={0.25} metalness={0.15} />
      </mesh>
      {PATHS.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.008, p.z]} receiveShadow>
          <planeGeometry args={[p.w, p.d]} />
          <meshStandardMaterial color={PATH} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// --- xylophone bridge ----------------------------------------------------------

function XyloBridge() {
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    XYLO_BARS.forEach((bar, i) => {
      const mesh = bars.current[i];
      if (!mesh) return;
      const t = sinceHit(`xylo:${i}`, now);
      // struck: dips and rings back up
      const dip = t < 0.6 ? Math.sin(t * 30) * Math.exp(-t * 7) * 0.05 + Math.exp(-t * 9) * -0.05 : 0;
      mesh.position.y = bar.top - 0.07 + dip;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = t < 1 ? 0.6 * Math.exp(-t * 3) : 0;
    });
  });
  return (
    <group>
      {XYLO_BARS.map((bar, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              bars.current[i] = el;
            }}
            position={[bar.x, bar.top - 0.07, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[XYLO_BAR_WIDTH, 0.14, BRIDGE_DEPTH]} />
            <meshStandardMaterial color={bar.color} emissive={bar.color} emissiveIntensity={0} roughness={0.35} />
          </mesh>
          {/* the two rails each bar rests on */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[bar.x, (bar.top - 0.14) / 2, side * (BRIDGE_DEPTH / 2 - 0.35)]}>
              <boxGeometry args={[XYLO_BAR_WIDTH + 0.12, Math.max(0.05, bar.top - 0.14), 0.18]} />
              <meshStandardMaterial color={WOOD} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      {/* handrail posts at the ends */}
      {[XYLO_BARS[0].x - 0.6, XYLO_BARS[XYLO_BARS.length - 1].x + 0.6].flatMap((x) =>
        [-1, 1].map((side) => (
          <mesh key={`${x}-${side}`} position={[x, 0.6, side * (BRIDGE_DEPTH / 2 + 0.1)]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.2, 10]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  );
}

// --- drum valley -----------------------------------------------------------------

/** The skin sits just above the shell's cap so the two never z-fight */
const SKIN_LIFT = 0.015;

function DrumValley() {
  const skins = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    DRUMS.forEach((drum, i) => {
      const skin = skins.current[i];
      if (!skin) return;
      const t = sinceHit(`drum:${i}`, now);
      const thump = t < 0.5 ? Math.exp(-t * 10) : 0;
      skin.scale.set(1 + thump * 0.05, 1, 1 + thump * 0.05);
      skin.position.y = drum.top + SKIN_LIFT - thump * 0.08;
      (skin.material as THREE.MeshStandardMaterial).emissiveIntensity = thump * 0.5;
    });
  });
  return (
    <group>
      {DRUMS.map((drum, i) => (
        <group key={i} position={[drum.x, 0, drum.z]}>
          <mesh position={[0, drum.top / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[drum.r, drum.r * 1.04, drum.top, 36]} />
            <meshStandardMaterial color={drum.color} roughness={0.5} />
          </mesh>
          {/* gold rims */}
          {[drum.top - 0.04, 0.06].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[drum.r * 1.02, 0.05, 8, 40]} />
              <meshStandardMaterial color="#e3b341" metalness={0.5} roughness={0.3} />
            </mesh>
          ))}
          <mesh
            ref={(el) => {
              skins.current[i] = el;
            }}
            position={[0, drum.top + SKIN_LIFT, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <circleGeometry args={[drum.r * 0.98, 36]} />
            <meshStandardMaterial color="#f7f0e0" emissive="#fff4d6" emissiveIntensity={0} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- bell tower -----------------------------------------------------------------

function BellTower() {
  const bell = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!bell.current) return;
    const t = sinceHit("bell", clock.getElapsedTime());
    bell.current.rotation.z = t < 6 ? Math.sin(t * 5) * 0.45 * Math.exp(-t * 0.7) : 0;
  });
  const size = TOWER.half * 2;
  return (
    <group>
      <group position={[TOWER.x, 0, TOWER.z]}>
        {/* walls you can see Kordi through when the stairs wind round the back */}
        <mesh position={[0, TOWER.top / 2, 0]}>
          <boxGeometry args={[size - 0.2, TOWER.top, size - 0.2]} />
          <meshStandardMaterial color="#e9e0cf" transparent opacity={0.35} depthWrite={false} roughness={0.9} />
        </mesh>
        {/* corner pillars and floor bands */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * (TOWER.half - 0.3), TOWER.top / 2, sz * (TOWER.half - 0.3)]} castShadow>
              <boxGeometry args={[0.6, TOWER.top, 0.6]} />
              <meshStandardMaterial color="#d8ccb6" roughness={0.8} />
            </mesh>
          )),
        )}
        {[TOWER.top / 3, (TOWER.top * 2) / 3].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[size + 0.1, 0.25, size + 0.1]} />
            <meshStandardMaterial color="#d8ccb6" roughness={0.8} />
          </mesh>
        ))}
        {/* the roof you stand on */}
        <mesh position={[0, TOWER.top - 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[size + 0.4, 0.5, size + 0.4]} />
          <meshStandardMaterial color="#cbbda3" roughness={0.8} />
        </mesh>
        {/* the bell's arch */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 1.6, TOWER.top + 1.6, 0]} castShadow>
            <boxGeometry args={[0.3, 3.2, 0.3]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, TOWER.top + 3.25, 0]} castShadow>
          <boxGeometry args={[3.6, 0.3, 0.4]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
      </group>
      {/* the bell swings from the crossbeam */}
      <group ref={bell} position={[BELL.x, BELL.y + 3.1, BELL.z]}>
        <mesh position={[0, -1.15, 0]} castShadow>
          <cylinderGeometry args={[0.35, BELL.radius, 1.6, 28, 1, true]} />
          <meshStandardMaterial color="#e3b341" metalness={0.6} roughness={0.25} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <sphereGeometry args={[0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e3b341" metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh position={[0, -1.95, 0]}>
          <sphereGeometry args={[0.16, 14, 10]} />
          <meshStandardMaterial color="#8a6a2a" metalness={0.4} roughness={0.4} />
        </mesh>
      </group>
      {/* the stairs that wind up round it */}
      {STAIRS.map((stair, i) => (
        <mesh key={i} position={[stair.x, stair.top - STAIR_THICKNESS / 2, stair.z]} castShadow receiveShadow>
          <boxGeometry args={[STAIR_SIZE, STAIR_THICKNESS, STAIR_SIZE]} />
          <meshStandardMaterial color={i % 2 ? "#f3ecdc" : "#2c2620"} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

// --- pipe forest -----------------------------------------------------------------

const PIPE_COLOR = new THREE.Color("#c9b98f");
const PIPE_GLOW = new THREE.Color("#fff1c4");

function PipeForest() {
  const pipes = useRef<THREE.InstancedMesh>(null);
  const lips = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), color: new THREE.Color() }), []);

  useLayoutEffect(() => {
    const { matrix } = scratch;
    const q = new THREE.Quaternion();
    PIPES.forEach((pipe, i) => {
      matrix.compose(new THREE.Vector3(pipe.x, pipe.height / 2, pipe.z), q, new THREE.Vector3(pipe.r, pipe.height, pipe.r));
      pipes.current?.setMatrixAt(i, matrix);
      pipes.current?.setColorAt(i, PIPE_COLOR);
      // a darker band near the bottom: the pipe's mouth
      matrix.compose(new THREE.Vector3(pipe.x, 0.9, pipe.z), q, new THREE.Vector3(pipe.r * 1.04, 0.35, pipe.r * 1.04));
      lips.current?.setMatrixAt(i, matrix);
    });
    if (pipes.current) {
      pipes.current.instanceMatrix.needsUpdate = true;
      if (pipes.current.instanceColor) pipes.current.instanceColor.needsUpdate = true;
    }
    if (lips.current) lips.current.instanceMatrix.needsUpdate = true;
  }, [scratch]);

  useFrame(({ clock }) => {
    const mesh = pipes.current;
    if (!mesh) return;
    const now = clock.getElapsedTime();
    PIPES.forEach((_, i) => {
      const t = sinceHit(`pipe:${i}`, now);
      scratch.color.copy(PIPE_COLOR).lerp(PIPE_GLOW, t < 2 ? Math.exp(-t * 1.8) : 0);
      mesh.setColorAt(i, scratch.color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={pipes} args={[undefined, undefined, PIPES.length]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshStandardMaterial metalness={0.55} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={lips} args={[undefined, undefined, PIPES.length]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshStandardMaterial color="#3a3226" metalness={0.3} roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

// --- harp waterfall and the cave ----------------------------------------------------

function makeFallTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(220,240,255,0.55)";
  ctx.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 60; i++) {
    const x = hash(i, 7) * 64;
    const y = hash(i, 8) * 256;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + hash(i, 9) * 0.5})`;
    ctx.fillRect(x, y, 1.5 + hash(i, 10) * 2.5, 18 + hash(i, 11) * 50);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function HarpFalls() {
  const texture = useMemo(() => makeFallTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const strings = useRef<(THREE.Mesh | null)[]>([]);
  const crystals = useRef<(THREE.Mesh | null)[]>([]);
  const fall = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (fall.current?.map) fall.current.map.offset.y += delta * 1.6; // water falling
    const now = clock.getElapsedTime();
    HARP_STRINGS.forEach((string, i) => {
      const mesh = strings.current[i];
      if (!mesh) return;
      const t = sinceHit(`harp:${i}`, now);
      const shimmer = t < 1.5 ? Math.exp(-t * 2.5) : 0;
      mesh.position.x = string.x + Math.sin(t * 60) * 0.03 * shimmer;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + shimmer * 1.6;
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
          opacity={0.85}
          depthWrite={false}
          emissive="#cfe9ff"
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(CAVE.x0 + CAVE.x1) / 2, 0.015, CLIFF.front + 1.6]}>
        <circleGeometry args={[3.2, 32]} />
        <meshStandardMaterial color={WATER} roughness={0.2} metalness={0.2} transparent opacity={0.85} />
      </mesh>
      {/* harp strings of light standing in the spray */}
      {HARP_STRINGS.map((string, i) => (
        <mesh
          key={i}
          ref={(el) => {
            strings.current[i] = el;
          }}
          position={[string.x, HARP.height / 2, (HARP.zMin + HARP.zMax) / 2]}
        >
          <boxGeometry args={[0.04, HARP.height, HARP.zMax - HARP.zMin]} />
          <meshStandardMaterial color="#fff6d8" emissive="#ffe9a8" emissiveIntensity={0.35} transparent opacity={0.55} />
        </mesh>
      ))}
      {/* harp frame: a curved neck over the strings */}
      <mesh position={[(HARP_STRINGS[0].x + HARP_STRINGS[HARP_STRINGS.length - 1].x) / 2, HARP.height + 0.1, (HARP.zMin + HARP.zMax) / 2]}>
        <boxGeometry args={[HARP_STRINGS[HARP_STRINGS.length - 1].x - HARP_STRINGS[0].x + 0.6, 0.25, HARP.zMax - HARP.zMin + 0.2]} />
        <meshStandardMaterial color="#c9a25a" metalness={0.5} roughness={0.35} />
      </mesh>
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

// --- warp stones ----------------------------------------------------------------------

function WarpStoneMesh({ stone, awake }: { stone: WarpStone; awake: boolean }) {
  const rune = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!rune.current) return;
    const material = rune.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = awake ? 1.1 + Math.sin(clock.getElapsedTime() * 2.2 + stone.x) * 0.35 : 0.08;
    rune.current.rotation.y = clock.getElapsedTime() * (awake ? 1.2 : 0.2);
  });
  return (
    <group position={[stone.x, 0, stone.z]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.1, 1.25, 0.3, 8]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.8, 1.9, 0.5]} />
        <meshStandardMaterial color="#8d8a9c" roughness={0.8} />
      </mesh>
      <mesh ref={rune} position={[0, 2.55, 0]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color={awake ? "#7fd8ff" : "#6a6878"} emissive="#7fd8ff" emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}

// --- lamps and stars (night) --------------------------------------------------------------

function NightLights() {
  const posts = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const bulbMaterial = useRef<THREE.MeshStandardMaterial>(null);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    LAMPS.forEach((lamp, i) => {
      posts.current?.setMatrixAt(i, matrix.makeTranslation(lamp.x, 1.3, lamp.z));
      bulbs.current?.setMatrixAt(i, matrix.makeTranslation(lamp.x, 2.75, lamp.z));
    });
    if (posts.current) posts.current.instanceMatrix.needsUpdate = true;
    if (bulbs.current) bulbs.current.instanceMatrix.needsUpdate = true;
  }, []);

  const stars = useMemo(() => {
    const COUNT = 600;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // a dome far above and around the island
      const angle = hash(i, 21) * Math.PI * 2;
      const tilt = 0.15 + hash(i, 22) * 1.2;
      positions[i * 3] = Math.cos(angle) * Math.cos(tilt) * 160;
      positions[i * 3 + 1] = 20 + Math.sin(tilt) * 120;
      positions[i * 3 + 2] = Math.sin(angle) * Math.cos(tilt) * 160 - 40;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => stars.dispose(), [stars]);
  const starMaterial = useRef<THREE.PointsMaterial>(null);
  const last = useRef(0);

  useFrame(({ clock }) => {
    // the sky changes slowly: a few updates a second is plenty
    if (clock.getElapsedTime() - last.current < 0.25) return;
    last.current = clock.getElapsedTime();
    const { night } = skyAt(Date.now());
    if (bulbMaterial.current) bulbMaterial.current.emissiveIntensity = 0.1 + night * 2.2;
    if (starMaterial.current) {
      starMaterial.current.opacity = night * 0.9;
      starMaterial.current.visible = night > 0.02;
    }
  });

  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, LAMPS.length]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 2.6, 8]} />
        <meshStandardMaterial color="#2f2b27" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, LAMPS.length]}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial ref={bulbMaterial} color="#fff4d6" emissive="#ffcf7a" emissiveIntensity={0.1} />
      </instancedMesh>
      <points geometry={stars}>
        <pointsMaterial ref={starMaterial} color="#ffffff" size={0.9} sizeAttenuation transparent opacity={0} fog={false} depthWrite={false} />
      </points>
    </group>
  );
}

// --- the island ---------------------------------------------------------------------------

/**
 * Everything around the keyboard plaza. Static except for small reactions
 * the simulation triggers through islandHits, and the lamps and stars that
 * follow the day.
 */
export const IslandScene = memo(function IslandScene({
  player,
  awake,
}: {
  /** Kordi's live position (mutated in place), for drawing only what's near */
  player: THREE.Vector3;
  awake: ReadonlySet<WarpStoneId>;
}) {
  return (
    <group>
      <Ground />
      <NightLights />
      <Zone x={STREAM.x + 2} z={0} player={player}>
        <XyloBridge />
      </Zone>
      <Zone x={72} z={0} player={player}>
        <DrumValley />
      </Zone>
      {/* the tower is the landmark: always drawn, so it's there on the horizon */}
      <BellTower />
      <Zone x={-60} z={0} player={player}>
        <PipeForest />
      </Zone>
      <Zone x={(CAVE.x0 + CAVE.x1) / 2} z={CLIFF.front} player={player}>
        <HarpFalls />
      </Zone>
      {WARP_STONES.map((stone) => (
        <WarpStoneMesh key={stone.id} stone={stone} awake={awake.has(stone.id)} />
      ))}
    </group>
  );
});
