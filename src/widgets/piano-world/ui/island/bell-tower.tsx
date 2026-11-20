"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { localDayFraction } from "../../model/day-night";
import {
  BELFRY,
  BELL,
  MERLONS,
  MERLON_SIZE,
  RAIL_HEIGHT,
  STAIRS,
  STAIR_RAILS,
  STAIR_SIZE,
  STAIR_THICKNESS,
  TOWER,
  hash,
} from "../../model/island";
import { WOOD, GOLD, sinceHit } from "./shared";

/** Cut stone blocks with mortar lines, drawn once and tiled over the tower. */
function makeStoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#cdbfa6";
  ctx.fillRect(0, 0, 256, 256);
  const rows = 8;
  const h = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 ? 32 : 0;
    for (let c = -1; c < 4; c++) {
      const x = c * 64 + offset;
      const shade = 200 + Math.floor(hash(r * 7 + c, 3) * 34);
      ctx.fillStyle = `rgb(${shade + 22}, ${shade + 10}, ${shade - 12})`;
      ctx.fillRect(x + 2, r * h + 2, 60, h - 4);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const STONE_DARK = "#a8987c";
const TRIM = "#e9dfcb";
const SLATE = "#5b6b8c";
const LEVELS = [TOWER.top / 3, (TOWER.top * 2) / 3];

/** An arched opening set into a wall face (drawn just proud of it). */
function ArchWindow({ width, height, color = "#2f2a33" }: { width: number; height: number; color?: string }) {
  return (
    <group>
      <mesh position={[0, height / 2 - width / 4, 0]}>
        <planeGeometry args={[width, height - width / 2]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, height - width / 2 - width / 4, 0]}>
        <circleGeometry args={[width / 2, 20, 0, Math.PI]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {/* stone surround */}
      <mesh position={[0, height - width / 2 - width / 4, -0.01]}>
        <ringGeometry args={[width / 2, width / 2 + 0.16, 20, 1, 0, Math.PI]} />
        <meshStandardMaterial color={TRIM} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** A clock face whose hands follow the island's day (one turn of the hour hand per day). */
function ClockFace({ hands, face }: { hands: RefObject<(THREE.Group | null)[]>; face: number }) {
  return (
    <group>
      <mesh>
        <circleGeometry args={[1.25, 40]} />
        <meshStandardMaterial color="#fbf6ea" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[1.25, 1.42, 40]} />
        <meshStandardMaterial color={GOLD} metalness={0.25} roughness={0.4} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 1.05, Math.cos((i / 12) * Math.PI * 2) * 1.05, 0.02]}>
          <circleGeometry args={[i % 3 === 0 ? 0.09 : 0.05, 10]} />
          <meshStandardMaterial color="#2f2a33" />
        </mesh>
      ))}
      {[0.65, 0.95].map((length, i) => (
        <group
          key={length}
          position={[0, 0, 0.03 + i * 0.01]}
          ref={(el) => {
            hands.current[face * 2 + i] = el;
          }}
          userData={{ minute: i === 1 }}
        >
          <mesh position={[0, length / 2, 0]}>
            <boxGeometry args={[i ? 0.06 : 0.1, length, 0.02]} />
            <meshStandardMaterial color="#2f2a33" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, 0.06]}>
        <circleGeometry args={[0.09, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.25} />
      </mesh>
    </group>
  );
}

/** The four faces of the tower, as [rotation y, outward x, outward z]. */
const FACES: [number, number, number][] = [
  [0, 0, 1],
  [Math.PI / 2, 1, 0],
  [Math.PI, 0, -1],
  [-Math.PI / 2, -1, 0],
];

export function BellTower({ player }: { player: THREE.Vector3 }) {
  const stone = useMemo(() => {
    const texture = makeStoneTexture();
    texture.repeat.set(2.5, 6);
    return texture;
  }, []);
  useEffect(() => () => stone.dispose(), [stone]);
  const bell = useRef<THREE.Group>(null);
  const walls = useRef<THREE.MeshStandardMaterial>(null);
  const spire = useRef<THREE.MeshStandardMaterial>(null);
  const hands = useRef<(THREE.Group | null)[]>([]);
  const last = useRef(0);

  useFrame(({ clock }, delta) => {
    const now = clock.getElapsedTime();
    if (bell.current) {
      const t = sinceHit("bell", now);
      bell.current.rotation.z = t < 6 ? Math.sin(t * 5) * 0.45 * Math.exp(-t * 0.7) : 0;
    }
    // see-through when Kordi is behind the tower (or up on its roof, under the spire)
    const behind =
      player.z < TOWER.z + 1 && Math.abs(player.x - TOWER.x) < TOWER.half + 4 && player.z > TOWER.z - TOWER.half - 6;
    const onRoof = player.y > TOWER.top - 6 && Math.hypot(player.x - TOWER.x, player.z - TOWER.z) < TOWER.half + 3;
    const ease = 1 - Math.exp(-delta * 6);
    for (const [material, fade] of [
      [walls.current, behind && player.y < TOWER.top - 0.5],
      [spire.current, onRoof],
    ] as const) {
      if (!material) continue;
      material.opacity += ((fade ? 0.22 : 1) - material.opacity) * ease;
      material.depthWrite = material.opacity > 0.95;
    }
    // the clocks show the real local time
    if (now - last.current > 0.5) {
      last.current = now;
      const phase = localDayFraction(Date.now());
      for (const hand of hands.current) {
        if (!hand) continue;
        hand.rotation.z = -(hand.userData.minute ? phase * 24 : phase * 2) * Math.PI * 2;
      }
    }
  });

  const size = TOWER.half * 2;
  const roofY = TOWER.top;
  return (
    <group>
      <group position={[TOWER.x, 0, TOWER.z]}>
        {/* plinth */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[size + 0.8, 0.9, size + 0.8]} />
          <meshStandardMaterial color={STONE_DARK} roughness={0.95} />
        </mesh>
        {/* the shaft */}
        <mesh position={[0, roofY / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[size - 0.1, roofY, size - 0.1]} />
          <meshStandardMaterial ref={walls} map={stone} transparent roughness={0.9} />
        </mesh>
        {/* corner quoins */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * (TOWER.half - 0.15), roofY / 2, sz * (TOWER.half - 0.15)]} castShadow>
              <boxGeometry args={[0.55, roofY, 0.55]} />
              <meshStandardMaterial color={TRIM} roughness={0.8} />
            </mesh>
          )),
        )}
        {/* cornices between the storeys */}
        {LEVELS.map((y) => (
          <mesh key={y} position={[0, y, 0]} castShadow>
            <boxGeometry args={[size + 0.35, 0.3, size + 0.35]} />
            <meshStandardMaterial color={TRIM} roughness={0.8} />
          </mesh>
        ))}
        {/* each face: windows on the middle storey, a clock up top; the door at the front */}
        {FACES.map(([rot, ox, oz], f) => (
          <group key={f} position={[ox * (TOWER.half + 0.02), 0, oz * (TOWER.half + 0.02)]} rotation={[0, rot, 0]}>
            {[-1.6, 1.6].map((x) => (
              <group key={x} position={[x, LEVELS[0] + 1.1, 0]}>
                <ArchWindow width={0.9} height={2.4} />
              </group>
            ))}
            <group position={[0, LEVELS[1] + 2.4, 0.02]}>
              <ClockFace hands={hands} face={f} />
            </group>
            {f === 0 ? (
              <group position={[0, 0.9, 0.42]}>
                <ArchWindow width={1.6} height={2.9} color="#5a3b24" />
              </group>
            ) : (
              <group position={[0, 2.2, 0]}>
                <ArchWindow width={0.5} height={1.4} />
              </group>
            )}
          </group>
        ))}
        {/* roof deck, battlements and belfry */}
        <mesh position={[0, roofY - 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[size + 0.5, 0.4, size + 0.5]} />
          <meshStandardMaterial color={TRIM} roughness={0.8} />
        </mesh>
        {MERLONS.map((m, i) => (
          <mesh key={i} position={[m.x - TOWER.x, roofY + 0.38, m.z - TOWER.z]} castShadow>
            <boxGeometry args={[MERLON_SIZE, 0.8, MERLON_SIZE]} />
            <meshStandardMaterial color={TRIM} roughness={0.8} />
          </mesh>
        ))}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`b${sx}${sz}`} position={[sx * BELFRY.inset, roofY + BELFRY.height / 2, sz * BELFRY.inset]} castShadow>
              <cylinderGeometry args={[0.26, 0.32, BELFRY.height, 14]} />
              <meshStandardMaterial color={TRIM} roughness={0.7} />
            </mesh>
          )),
        )}
        {/* crossbeam the bell hangs from */}
        <mesh position={[0, roofY + 3.25, 0]} castShadow>
          <boxGeometry args={[BELFRY.inset * 2, 0.3, 0.4]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
        {/* the spire: a slate pyramid with a golden finial and a ♪ vane */}
        <group position={[0, roofY + BELFRY.height, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[BELFRY.inset * 2 + 0.9, 0.3, BELFRY.inset * 2 + 0.9]} />
            <meshStandardMaterial color={TRIM} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.3 + BELFRY.spire / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[(BELFRY.inset + 0.6) * Math.SQRT2, BELFRY.spire, 4]} />
            <meshStandardMaterial ref={spire} color={SLATE} transparent roughness={0.6} flatShading />
          </mesh>
          <mesh position={[0, 0.4 + BELFRY.spire, 0]}>
            <sphereGeometry args={[0.28, 16, 12]} />
            <meshStandardMaterial color={GOLD} metalness={0.3} roughness={0.3} />
          </mesh>
          <group position={[0, 1.1 + BELFRY.spire, 0]}>
            <mesh position={[0.1, 0.35, 0]}>
              <boxGeometry args={[0.07, 0.9, 0.07]} />
              <meshStandardMaterial color={GOLD} metalness={0.3} roughness={0.3} />
            </mesh>
            <mesh position={[-0.08, -0.1, 0]} scale={[1.25, 1, 0.5]}>
              <sphereGeometry args={[0.18, 14, 10]} />
              <meshStandardMaterial color={GOLD} metalness={0.3} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>
      {/* the bell swings from the crossbeam */}
      <group ref={bell} position={[BELL.x, BELL.y + 3.1, BELL.z]}>
        <mesh position={[0, -1.15, 0]} castShadow>
          <cylinderGeometry args={[0.35, BELL.radius, 1.6, 28, 1, true]} />
          <meshStandardMaterial color={GOLD} metalness={0.3} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <sphereGeometry args={[0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={GOLD} metalness={0.3} roughness={0.3} />
        </mesh>
        <mesh position={[0, -1.95, 0]}>
          <sphereGeometry args={[0.16, 14, 10]} />
          <meshStandardMaterial color="#8a6a2a" metalness={0.4} roughness={0.4} />
        </mesh>
      </group>
      <TowerStairs />
    </group>
  );
}

const SLAB_WHITE = new THREE.Color("#f3ecdc");
const SLAB_BLACK = new THREE.Color("#2c2620");
/** steps high enough to need a stone bracket under them */
const BRACKETED = STAIRS.filter((stair) => stair.top > 0.8);

/** The stairs as four instanced meshes: piano-key slabs, stone brackets, handrails and their posts. */
function TowerStairs() {
  const slabs = useRef<THREE.InstancedMesh>(null);
  const brackets = useRef<THREE.InstancedMesh>(null);
  const rails = useRef<THREE.InstancedMesh>(null);
  const posts = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    STAIRS.forEach((stair, i) => {
      slabs.current?.setMatrixAt(i, m.makeScale(STAIR_SIZE, STAIR_THICKNESS, STAIR_SIZE).setPosition(stair.x, stair.top - STAIR_THICKNESS / 2, stair.z));
      slabs.current?.setColorAt(i, i % 2 ? SLAB_WHITE : SLAB_BLACK);
    });
    BRACKETED.forEach((stair, i) => {
      // tucked under the slab, toward the tower wall
      const x = stair.x + (TOWER.x - stair.x) * 0.12;
      const z = stair.z + (TOWER.z - stair.z) * 0.12;
      brackets.current?.setMatrixAt(i, m.makeScale(0.5, 0.5, 0.5).setPosition(x, stair.top - STAIR_THICKNESS - 0.25, z));
    });
    STAIR_RAILS.forEach((rail, i) => {
      rails.current?.setMatrixAt(i, m.makeScale(rail.w, 0.08, rail.d).setPosition(rail.x, rail.top - 0.04, rail.z));
      posts.current?.setMatrixAt(i, m.makeScale(1, RAIL_HEIGHT, 1).setPosition(rail.x, rail.top - RAIL_HEIGHT / 2, rail.z));
    });
    for (const mesh of [slabs.current, brackets.current, rails.current, posts.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, []);

  return (
    <group>
      <instancedMesh ref={slabs} args={[undefined, undefined, STAIRS.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={brackets} args={[undefined, undefined, BRACKETED.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={rails} args={[undefined, undefined, STAIR_RAILS.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={posts} args={[undefined, undefined, STAIR_RAILS.length]}>
        <cylinderGeometry args={[0.045, 0.045, 1, 6]} />
        <meshStandardMaterial color="#2f2b27" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}
