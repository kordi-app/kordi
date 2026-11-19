"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DAY_MS, skyAt } from "../model/day-night";
import { woodland } from "../model/nature";
import { NatureScene } from "./nature-scene";
import { Water } from "./water";
import {
  BELFRY,
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
  MERLONS,
  MERLON_SIZE,
  PATHS,
  PIPES,
  RAIL_HEIGHT,
  STAIRS,
  STAIR_RAILS,
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

const SAND = "#efe4c8";
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

/** The painted ground: grass with lighter and darker patches, shade under the woods, dirt paths and the plaza. */
const GROUND = { x0: -ISLAND_BOUNDS.x - 4, x1: ISLAND_BOUNDS.x + 4, z0: ISLAND_BOUNDS.zMin - 4, z1: ISLAND_BOUNDS.zMax + 4 };
const PX_PER_UNIT = 10;

function paintGround() {
  const width = (GROUND.x1 - GROUND.x0) * PX_PER_UNIT;
  const height = (GROUND.z1 - GROUND.z0) * PX_PER_UNIT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const px = (x: number) => (x - GROUND.x0) * PX_PER_UNIT;
  const pz = (z: number) => (z - GROUND.z0) * PX_PER_UNIT;

  ctx.fillStyle = "#c3d9a0";
  ctx.fillRect(0, 0, width, height);
  // soft patches of lighter and darker grass
  const patches = ["#b4ce8e", "#cfe2b0", "#a9c784", "#d6e6b8", "#bcd696"];
  for (let i = 0; i < 1400; i++) {
    const x = GROUND.x0 + hash(i, 81) * (GROUND.x1 - GROUND.x0);
    const z = GROUND.z0 + hash(i, 82) * (GROUND.z1 - GROUND.z0);
    const r = (1 + hash(i, 83) * 6) * PX_PER_UNIT;
    const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r);
    const colour = patches[i % patches.length];
    g.addColorStop(0, colour);
    g.addColorStop(1, `${colour}00`);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = g;
    ctx.fillRect(px(x) - r, pz(z) - r, r * 2, r * 2);
  }
  // deeper green in the woods
  for (let z = GROUND.z0; z < GROUND.z1; z += 2) {
    for (let x = GROUND.x0; x < GROUND.x1; x += 2) {
      const wood = woodland(x, z);
      if (wood < 0.45) continue;
      ctx.globalAlpha = (wood - 0.45) * 0.55;
      ctx.fillStyle = "#7f9f5f";
      ctx.fillRect(px(x), pz(z), 2 * PX_PER_UNIT, 2 * PX_PER_UNIT);
    }
  }
  ctx.globalAlpha = 1;
  // the beach blends in at the edge
  ctx.strokeStyle = "#e8dcbc";
  ctx.lineWidth = 3 * PX_PER_UNIT;
  ctx.filter = `blur(${2 * PX_PER_UNIT}px)`;
  ctx.strokeRect(0, 0, width, height);
  ctx.filter = "none";

  const softRect = (x0: number, x1: number, z0: number, z1: number, colour: string, radius: number, blur: number) => {
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(px(x0), pz(z0), (x1 - x0) * PX_PER_UNIT, (z1 - z0) * PX_PER_UNIT, radius * PX_PER_UNIT);
    ctx.fill();
    ctx.restore();
  };
  // dirt paths with a worn, soft edge, then gravel specks
  for (const path of PATHS) {
    softRect(path.x - path.w / 2 - 0.4, path.x + path.w / 2 + 0.4, path.z - path.d / 2 - 0.4, path.z + path.d / 2 + 0.4, "#c9b48a", 1.4, 8);
    softRect(path.x - path.w / 2, path.x + path.w / 2, path.z - path.d / 2, path.z + path.d / 2, "#dccaa0", 1.2, 3);
  }
  // the drum valley's trodden ground and the tower court
  ctx.save();
  ctx.filter = `blur(${3 * PX_PER_UNIT}px)`;
  ctx.fillStyle = "#d9c79e";
  ctx.beginPath();
  ctx.ellipse(px(72), pz(0), 17 * PX_PER_UNIT, 15 * PX_PER_UNIT, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d8cfbd";
  ctx.beginPath();
  ctx.arc(px(TOWER.x), pz(TOWER.z), 9 * PX_PER_UNIT, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the keyboard plaza: pale stone with a border
  softRect(-35, 35, -9.5, 15.5, "#d9cfbd", 6.5, 4);
  softRect(-34, 34, -9, 15, "#f3eee4", 6, 1);
  for (let i = 0; i < 9000; i++) {
    const x = GROUND.x0 + hash(i, 91) * (GROUND.x1 - GROUND.x0);
    const z = GROUND.z0 + hash(i, 92) * (GROUND.z1 - GROUND.z0);
    if (!PATHS.some((p) => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2)) continue;
    ctx.fillStyle = hash(i, 93) > 0.5 ? "#bba57c" : "#ece0c4";
    ctx.fillRect(px(x), pz(z), 3, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // the shape's UVs are world x / −z: map the whole canvas over the island once
  texture.repeat.set(1 / (GROUND.x1 - GROUND.x0), 1 / (GROUND.z1 - GROUND.z0));
  texture.offset.set(-GROUND.x0 / (GROUND.x1 - GROUND.x0), GROUND.z1 / (GROUND.z1 - GROUND.z0));
  return texture;
}

/** Shore parameters for the water shaders (stable objects: they key the materials) */
const SEA_SHORE: [number, number, number, number] = [ISLAND_BOUNDS.x + 9, ISLAND_BOUNDS.zMin - 9, ISLAND_BOUNDS.zMax + 9, 22];
const STREAM_SHORE: [number, number, number, number] = [STREAM.x, STREAM.width / 2, 0, 0];
const POOL = { x: (CAVE.x0 + CAVE.x1) / 2, z: CLIFF.front + 1.6, r: 3.2 };
const POOL_SHORE: [number, number, number, number] = [POOL.x, POOL.z, POOL.r, CLIFF.front];

function Ground() {
  const assets = useMemo(() => {
    const { x, zMin, zMax } = ISLAND_BOUNDS;
    return {
      beach: roundedRect(-x - 9, x + 9, zMin - 9, zMax + 9, 22),
      grass: roundedRect(GROUND.x0, GROUND.x1, GROUND.z0, GROUND.z1, 18),
      sea: new THREE.PlaneGeometry(700, 600, 175, 150).rotateX(-Math.PI / 2),
      stream: new THREE.PlaneGeometry(STREAM.width, STREAM.zMax - STREAM.zMin + 10, 4, 60).rotateX(-Math.PI / 2),
      painted: paintGround(),
    };
  }, []);
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets]);

  return (
    <group>
      <Water kind="sea" geometry={assets.sea} shore={SEA_SHORE} position={[0, -0.3, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} geometry={assets.beach} receiveShadow>
        <meshStandardMaterial color={SAND} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} geometry={assets.grass} receiveShadow>
        <meshStandardMaterial map={assets.painted} roughness={1} />
      </mesh>
      {/* the stream, banks to the sea */}
      <Water kind="stream" geometry={assets.stream} shore={STREAM_SHORE} position={[STREAM.x, 0.02, (STREAM.zMin + STREAM.zMax) / 2]} />
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
              <meshStandardMaterial color="#e3b341" metalness={0.25} roughness={0.35} />
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
const GOLD = "#e3b341";
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

function BellTower({ player }: { player: THREE.Vector3 }) {
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
    // the clocks keep island time
    if (now - last.current > 0.5) {
      last.current = now;
      const phase = (Date.now() % DAY_MS) / DAY_MS;
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
      {/* the stairs: piano-key slabs on stone brackets, with a handrail */}
      {STAIRS.map((stair, i) => (
        <group key={i} position={[stair.x, stair.top, stair.z]}>
          <mesh position={[0, -STAIR_THICKNESS / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[STAIR_SIZE, STAIR_THICKNESS, STAIR_SIZE]} />
            <meshStandardMaterial color={i % 2 ? "#f3ecdc" : "#2c2620"} roughness={0.5} />
          </mesh>
          {stair.top > 0.8 ? (
            <mesh
              position={[(TOWER.x - stair.x) * 0.12, -STAIR_THICKNESS - 0.25, (TOWER.z - stair.z) * 0.12]}
              castShadow
            >
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
            </mesh>
          ) : null}
        </group>
      ))}
      {STAIR_RAILS.map((rail, i) => (
        <group key={i} position={[rail.x, rail.top, rail.z]}>
          <mesh position={[0, -0.04, 0]} castShadow>
            <boxGeometry args={[rail.w, 0.08, rail.d]} />
            <meshStandardMaterial color={WOOD} roughness={0.6} />
          </mesh>
          <mesh position={[0, -RAIL_HEIGHT / 2, 0]}>
            <cylinderGeometry args={[0.045, 0.045, RAIL_HEIGHT, 6]} />
            <meshStandardMaterial color="#2f2b27" roughness={0.6} />
          </mesh>
        </group>
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
        <meshStandardMaterial metalness={0.2} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={lips} args={[undefined, undefined, PIPES.length]}>
        <cylinderGeometry args={[1, 1, 1, 18]} />
        <meshStandardMaterial color="#3a3226" metalness={0.3} roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

// --- harp waterfall and the cave ----------------------------------------------------

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

function HarpFalls() {
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
  const mist = useRef<THREE.Group>(null);
  const poolGeometry = useMemo(() => new THREE.CircleGeometry(POOL.r, 48).rotateX(-Math.PI / 2), []);
  useEffect(() => () => poolGeometry.dispose(), [poolGeometry]);
  const strings = useRef<(THREE.Mesh | null)[]>([]);
  const crystals = useRef<(THREE.Mesh | null)[]>([]);
  const fall = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (fall.current?.map) fall.current.map.offset.y += delta * 1.5; // water falling
    if (sprayMaterial.current?.map) sprayMaterial.current.map.offset.y += delta * 2.3; // a faster sheet in front
    mist.current?.children.forEach((puff, i) => {
      const t = (clock.getElapsedTime() * 0.45 + i / 7) % 1;
      puff.position.y = 0.3 + t * 2.2;
      puff.scale.setScalar(1.2 + t * 1.8);
      ((puff as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - t);
    });
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
      {/* mist rising where the water lands */}
      <group ref={mist} position={[(CAVE.x0 + CAVE.x1) / 2, 0, CLIFF.front + 0.9]}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[(hash(i, 5) - 0.5) * 3.6, 0.5, (hash(i, 6) - 0.5) * 1.2]}>
            <sphereGeometry args={[0.6, 12, 8]} />
            <meshBasicMaterial color="#f2f9ff" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <Water kind="pool" geometry={poolGeometry} shore={POOL_SHORE} position={[POOL.x, 0.03, POOL.z]} />
      {/* the harp standing in the spray: a golden frame and glowing strings */}
      <group position={[0, 0, (HARP.zMin + HARP.zMax) / 2]}>
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
        {/* soundboard along the bottom, pillar at the tall end, curved neck across the top */}
        <mesh position={[(HARP_FIRST + HARP_LAST) / 2, 0.22, 0]} castShadow>
          <boxGeometry args={[HARP_LAST - HARP_FIRST + 0.9, 0.44, 0.5]} />
          <meshStandardMaterial color="#b0803a" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[HARP_FIRST - 0.35, HARP.height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.18, HARP.height, 12]} />
          <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.25} />
        </mesh>
        {HARP_STRINGS.slice(0, -1).map((string, i) => {
          const next = HARP_STRINGS[i + 1];
          const y0 = 0.35 + harpLength(i);
          const y1 = 0.35 + harpLength(i + 1);
          return (
            <mesh
              key={`neck${i}`}
              position={[(string.x + next.x) / 2, (y0 + y1) / 2 + 0.08, 0]}
              rotation={[0, 0, Math.atan2(y1 - y0, next.x - string.x)]}
              castShadow
            >
              <boxGeometry args={[Math.hypot(next.x - string.x, y1 - y0) + 0.06, 0.2, 0.22]} />
              <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.25} />
            </mesh>
          );
        })}
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
      <NatureScene player={player} />
      <NightLights />
      <Zone x={STREAM.x + 2} z={0} player={player}>
        <XyloBridge />
      </Zone>
      <Zone x={72} z={0} player={player}>
        <DrumValley />
      </Zone>
      {/* the tower is the landmark: always drawn, so it's there on the horizon */}
      <BellTower player={player} />
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
