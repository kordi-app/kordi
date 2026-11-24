"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Accessory } from "@/entities/character/three";
import {
  ABYSS_FLOOR,
  ALTAR,
  CAVE_CELL,
  CAVE_COLS,
  CAVE_FEATURES,
  CAVE_ROWS,
  DAIS_STEPS,
  FLOOR_CELLS,
  ILLUSORY_REVEAL,
  ILLUSORY_WALL,
  NECKLACE_SPOT,
  STAR_RESTS,
  WALL_FACES,
  WALL_TOP,
  caveCell,
  caveRuntime,
  cellZ,
} from "../engine/cave";
import { CLIFF } from "../engine/island";
import type { RemotePlayer } from "../net/protocol";
import { useBuilt } from "./island/shared";

/**
 * The cave of sleeping stars (engine/cave.ts): rock, a chasm, two star rests and
 * the altar. Everything here is drawn dark; what you see is what light reaches
 * it — the faint glow round Kordi, and the cosmic crown's starlight (yours, and
 * anyone else's in here wearing one). Stars sleep in the walls: they wake as a
 * crown passes and stay softly lit behind it, so the way you came glows.
 */

const STONE = "#24202c";
const STONE_DEEP = "#15121b";
const DAIS = "#2f2a38";
const STAR_ASLEEP = new THREE.Color("#2a2340");
const STAR_AWAKE = [new THREE.Color("#d9ccff"), new THREE.Color("#ffe3a3"), new THREE.Color("#a8e6ff")];
const CROWN_LIGHT = "#e4dcff";
const REST_AWAKE = new THREE.Color("#ffd27a");
const REST_ASLEEP = new THREE.Color("#4a3f66");

/** A wall star wakes within this distance of a crown, and keeps this much glow once woken */
const WAKE_REACH = 8.5;
const WAKE_KEEP = 0.32;
/** Other people's crowns light the cave too: this many of the nearest */
const REMOTE_CROWN_LIGHTS = 3;

const hash = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export interface CaveSceneProps {
  player: THREE.Vector3;
  /** 0 (dark) … 1 (the crown's full light), eased by the world each frame */
  light: RefObject<number>;
  /** the necklace is already yours: the altar stands empty */
  owned: boolean;
  remotes: RefObject<Map<string, RemotePlayer>>;
}

export function CaveScene({ player, light, owned, remotes }: CaveSceneProps) {
  return (
    <>
      <CaveFloor />
      <CaveWalls />
      <Abyss />
      {CAVE_FEATURES.map((f, i) =>
        f.kind === "pillar" ? <BrokenPillar key={i} x={f.x} z={f.z} seed={i} /> : <Stalagmite key={i} x={f.x} z={f.z} seed={i} />,
      )}
      <WallStars player={player} light={light} remotes={remotes} />
      <StarRests />
      <Altar light={light} owned={owned} />
      <Dust player={player} light={light} />
      <CrownLights player={player} light={light} remotes={remotes} />
    </>
  );
}

// --- rock --------------------------------------------------------------------

/** A cell next to the abyss: its stone drops all the way down */
const besideAbyss = (r: number, c: number) =>
  [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ].some(([rr, cc]) => caveCell(rr, cc) === " ");

const rowOf = (z: number) => Math.round((z - cellZ(0)) / CAVE_CELL);
const colOf = (x: number) => Math.round(x / CAVE_CELL + (CAVE_COLS - 1) / 2);

function CaveFloor() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    FLOOR_CELLS.forEach((cell, i) => {
      // the bridge over the abyss is a thick slab, the rest a floor of flagstones
      const deep = besideAbyss(rowOf(cell.z), colOf(cell.x));
      const thickness = deep ? 2.4 : 0.6 + cell.top;
      matrix.makeScale(CAVE_CELL * 0.985, thickness, CAVE_CELL * 0.985).setPosition(cell.x, cell.top - thickness / 2, cell.z);
      m.setMatrixAt(i, matrix);
      m.setColorAt(i, color.set(STONE).lerp(new THREE.Color(STONE_DEEP), hash(i, 1) * 0.6));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, FLOOR_CELLS.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.95} />
    </instancedMesh>
  );
}

/** Rough boulders heaped along every rock cell that faces the cave; beside the abyss they go down into it */
const ROCKS = (() => {
  const rocks: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number }[] = [];
  WALL_FACES.forEach((cell, i) => {
    const deep = besideAbyss(cell.r, cell.c);
    // rock between the camera (to the south) and the cave stays low, so it never hides Kordi
    const cameraSide = caveCell(cell.r - 1, cell.c) !== "#" && caveCell(cell.r + 1, cell.c) === "#";
    for (let k = 0; k < 2; k++) {
      const tall = cameraSide ? 0.12 + hash(i, k + 3) * 0.1 : 0.45 + hash(i, k + 3) * 0.35;
      const sy = (WALL_TOP * tall) / 2 + (deep ? 3 : 0);
      rocks.push({
        x: cell.x + (hash(i, k) - 0.5) * 1.1,
        y: deep ? sy * 0.2 - 3 : sy * 0.55,
        z: cell.z + (hash(i, k + 7) - 0.5) * 1.1,
        sx: 1.05 + hash(i, k + 11) * 0.5,
        sy,
        sz: 1.05 + hash(i, k + 13) * 0.5,
        ry: hash(i, k + 17) * Math.PI,
      });
    }
  });
  return rocks;
})();

function CaveWalls() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    ROCKS.forEach((rock, i) => {
      dummy.position.set(rock.x, rock.y, rock.z);
      dummy.rotation.set(0, rock.ry, 0);
      dummy.scale.set(rock.sx, rock.sy, rock.sz);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, color.set(STONE).lerp(new THREE.Color(STONE_DEEP), hash(i, 5)));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, ROCKS.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} flatShading />
    </instancedMesh>
  );
}

/** Far below the bridge: a faint violet haze, so the drop reads as deep rather than black */
function Abyss() {
  const rows = [...Array(CAVE_ROWS).keys()].filter((r) => [...Array(CAVE_COLS).keys()].some((c) => caveCell(r, c) === " "));
  const z0 = cellZ(rows[0]) - CAVE_CELL / 2;
  const z1 = cellZ(rows[rows.length - 1]) + CAVE_CELL / 2;
  return (
    <group position={[0, ABYSS_FLOOR + 2, (z0 + z1) / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CAVE_COLS * CAVE_CELL, z1 - z0]} />
        <meshBasicMaterial color="#1a0f33" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[CAVE_COLS * CAVE_CELL, z1 - z0]} />
        <meshBasicMaterial color="#6b4fd8" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function BrokenPillar({ x, z, seed }: { x: number; z: number; seed: number }) {
  const tilt = (hash(seed, 2) - 0.5) * 0.2;
  return (
    <group position={[x, 0, z]} rotation={[tilt, hash(seed, 1) * Math.PI, 0]}>
      {/* the stump you can hop onto, its top broken off at a slant */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.72, 1, 10]} />
        <meshStandardMaterial color={DAIS} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.15, 1.02, 0.05]} rotation={[0.3, 0, 0.2]}>
        <coneGeometry args={[0.45, 0.28, 7]} />
        <meshStandardMaterial color={DAIS} roughness={0.9} flatShading />
      </mesh>
      {/* the rest of it, toppled beside */}
      <mesh position={[1.1, 0.28, 0.5]} rotation={[0, 0.6, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 1.2, 8]} />
        <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

function Stalagmite({ x, z, seed }: { x: number; z: number; seed: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, hash(seed, 3) * Math.PI, 0]}>
      <mesh position={[0, 1.3, 0]} castShadow>
        <coneGeometry args={[0.5, 2.6, 7]} />
        <meshStandardMaterial color={STONE} roughness={1} flatShading />
      </mesh>
      <mesh position={[0.35, 0.55, 0.2]}>
        <coneGeometry args={[0.25, 1.1, 6]} />
        <meshStandardMaterial color={STONE_DEEP} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

// --- the sleeping stars ---------------------------------------------------------

/** Small crystals set in the rock where it faces open cave, at different heights */
const WALL_STARS = (() => {
  const stars: { x: number; y: number; z: number; tint: number; size: number }[] = [];
  WALL_FACES.forEach((cell, i) => {
    const open = (
      [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const
    ).filter(([dr, dc]) => caveCell(cell.r + dr, cell.c + dc) === ".");
    open.forEach(([dr, dc], k) => {
      if (hash(i, k + 21) < 0.2) return; // not every stretch of rock has one
      const along = (hash(i, k + 23) - 0.5) * 1.4;
      stars.push({
        x: cell.x + dc * 0.95 + (dr !== 0 ? along : 0),
        y: 0.6 + hash(i, k + 25) * 2.4,
        z: cell.z + dr * 0.95 + (dc !== 0 ? along : 0),
        tint: Math.floor(hash(i, k + 27) * STAR_AWAKE.length),
        size: 0.11 + hash(i, k + 29) * 0.1,
      });
    });
  });
  return stars;
})();

/** Where a crown is shining this frame (mine and others'), and how brightly */
interface Shine {
  x: number;
  y: number;
  z: number;
  level: number;
}

/** Remote players wearing the cosmic crown, nearest first (the cave lights for them too) */
function crownedRemotes(remotes: Map<string, RemotePlayer>, player: THREE.Vector3, out: Shine[]) {
  out.length = 0;
  for (const p of remotes.values()) {
    if (p.look?.hat !== "star-crown") continue;
    out.push({ x: p.x, y: p.y ?? 0, z: p.z, level: 1 });
  }
  out.sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
  if (out.length > REMOTE_CROWN_LIGHTS) out.length = REMOTE_CROWN_LIGHTS;
  return out;
}

function WallStars({ player, light, remotes }: Pick<CaveSceneProps, "player" | "light" | "remotes">) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  /** how awake each star is, 0–1 (eases up fast near a crown, settles back to WAKE_KEEP once woken) */
  const wake = useMemo(() => new Float32Array(WALL_STARS.length), []);
  const scratch = useMemo(() => ({ color: new THREE.Color(), shines: [] as Shine[] }), []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    WALL_STARS.forEach((star, i) => {
      dummy.position.set(star.x, star.y, star.z);
      dummy.rotation.set(hash(i, 1) * 3, hash(i, 2) * 3, 0);
      dummy.scale.setScalar(star.size);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, STAR_ASLEEP);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    wake.fill(0);
  }, [wake]);
  useFrame(({ clock }, rawDelta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    const shines = crownedRemotes(remotes.current, player, scratch.shines);
    const mine = light.current ?? 0;
    if (mine > 0.01) shines.push({ x: player.x, y: player.y, z: player.z, level: mine });
    WALL_STARS.forEach((star, i) => {
      let near = 0;
      for (const s of shines) {
        const d = Math.hypot(star.x - s.x, star.y - (s.y + 1.4), star.z - s.z);
        near = Math.max(near, s.level * THREE.MathUtils.smoothstep(WAKE_REACH - d, 0, WAKE_REACH - 2));
      }
      const woken = wake[i] >= WAKE_KEEP ? WAKE_KEEP : 0;
      const target = Math.max(near, woken);
      // wake quickly, fall asleep slowly
      wake[i] += (target - wake[i]) * (1 - Math.exp(-dt * (target > wake[i] ? 6 : 0.8)));
      const twinkle = 0.85 + 0.15 * Math.sin(t * 2.3 + i * 1.7);
      scratch.color.copy(STAR_ASLEEP).lerp(STAR_AWAKE[star.tint], Math.min(1, wake[i] * twinkle));
      m.setColorAt(i, scratch.color);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, WALL_STARS.length]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Star rests: a ring of old stone with a star asleep over it; touched, it burns gold and lights the way back */
function StarRests() {
  const stars = useRef<(THREE.Mesh | null)[]>([]);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    STAR_RESTS.forEach((_, i) => {
      const awake = caveRuntime.rests[i];
      const star = stars.current[i];
      if (star) {
        star.rotation.y = t * (awake ? 1.2 : 0.3);
        star.position.y = 1.1 + Math.sin(t * 1.5 + i) * 0.08;
        const material = star.material as THREE.MeshBasicMaterial;
        material.color.copy(awake ? REST_AWAKE : REST_ASLEEP);
        star.scale.setScalar(awake ? 0.24 + Math.sin(t * 3) * 0.02 : 0.16);
      }
      const lamp = lights.current[i];
      if (lamp) lamp.intensity = awake ? 7 + Math.sin(t * 2.2 + i) * 0.8 : 0.6;
    });
  });
  return (
    <>
      {STAR_RESTS.map((rest, i) => (
        <group key={i} position={[rest.x, 0, rest.z]}>
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <cylinderGeometry args={[0.7, 0.8, 0.16, 12]} />
            <meshStandardMaterial color={DAIS} roughness={0.9} flatShading />
          </mesh>
          <mesh
            ref={(el) => {
              stars.current[i] = el;
            }}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial toneMapped={false} />
          </mesh>
          <pointLight
            ref={(el) => {
              lights.current[i] = el;
            }}
            position={[0, 1.3, 0]}
            color="#ffcf7a"
            distance={7}
            decay={1.6}
          />
        </group>
      ))}
    </>
  );
}

// --- the altar ---------------------------------------------------------------

function Altar({ light, owned }: Pick<CaveSceneProps, "light" | "owned">) {
  const necklace = useRef<THREE.Group>(null);
  const shaft = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.PointLight>(null);
  const shaftMaterial = useBuilt(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffe2a0",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const level = light.current ?? 0;
    // the necklace is there only in starlight, and only until someone takes it
    const showing = !owned && !caveRuntime.taken && level > 0.25;
    if (necklace.current) {
      necklace.current.visible = showing;
      necklace.current.rotation.y = t * 0.6;
      necklace.current.position.y = NECKLACE_SPOT.y + Math.sin(t * 1.3) * 0.08;
    }
    if (shaft.current) {
      shaft.current.rotation.y = t * 0.05;
      (shaft.current.material as THREE.MeshBasicMaterial).opacity = (showing ? 0.07 : 0.015) * level;
    }
    if (glow.current) glow.current.intensity = showing ? 5 * level : 0.8 * level;
  });
  return (
    <group position={[ALTAR.x, 0, ALTAR.z]}>
      {DAIS_STEPS.map((step) => (
        <mesh key={step.top} position={[0, step.top / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[step.half * 2, step.top, step.half * 2]} />
          <meshStandardMaterial color={DAIS} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, ALTAR.pedestalTop / 2, 0]} castShadow>
        <cylinderGeometry args={[ALTAR.pedestal * 0.75, ALTAR.pedestal, ALTAR.pedestalTop, 10]} />
        <meshStandardMaterial color={DAIS} roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, ALTAR.pedestalTop + 0.05, 0]}>
        <cylinderGeometry args={[ALTAR.pedestal * 1.1, ALTAR.pedestal * 0.9, 0.1, 14]} />
        <meshStandardMaterial color="#3a3346" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* light falling on the altar from somewhere far above */}
      <mesh ref={shaft} position={[0, ALTAR.pedestalTop + 6, 0]} material={shaftMaterial}>
        <cylinderGeometry args={[0.55, 1.3, 12, 18, 1, true]} />
      </mesh>
      <pointLight ref={glow} position={[0, NECKLACE_SPOT.y + 0.4, 0]} color="#ffd27a" distance={9} decay={1.5} />
      <group ref={necklace} position={[0, NECKLACE_SPOT.y, 0]}>
        {/* the necklace as it hangs on Kordi, lifted off its shoulders */}
        <group scale={1.6} position={[0, -0.64 * 1.6, 0]}>
          <Accessory accessory="gold-necklace" />
        </group>
      </group>
    </group>
  );
}

// --- air and light --------------------------------------------------------------

const DUST_COUNT = 140;
/** round Kordi, mostly ahead of it: a mote right in front of the camera would be a big square */
const DUST_BOX = { x: 16, y: 5, z: 14, zAhead: 10 };

/** Motes drifting down through whatever light there is */
function Dust({ player, light }: Pick<CaveSceneProps, "player" | "light">) {
  const points = useRef<THREE.Points>(null);
  const geometry = useBuilt(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3] = (hash(i, 1) - 0.5) * DUST_BOX.x;
      positions[i * 3 + 1] = hash(i, 2) * DUST_BOX.y;
      positions[i * 3 + 2] = DUST_BOX.zAhead * -1 + hash(i, 3) * DUST_BOX.z;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  });
  const material = useBuilt(
    () =>
      new THREE.PointsMaterial({
        color: "#e8e0ff",
        size: 0.07,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
  );
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const p = points.current;
    if (!p) return;
    // the box of motes travels with you; each wraps round inside it
    p.position.set(player.x, 0, player.z);
    const attribute = p.geometry.attributes.position;
    const positions = attribute.array as Float32Array;
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3 + 1] -= dt * (0.12 + hash(i, 4) * 0.15);
      if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] += DUST_BOX.y;
    }
    attribute.needsUpdate = true;
    (p.material as THREE.PointsMaterial).opacity = 0.12 + 0.5 * (light.current ?? 0);
  });
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/**
 * The light you see by: a faint glow round Kordi always (enough to see your
 * feet), the crown's starlight when you wear it, and the crowns of others nearby.
 */
function CrownLights({ player, light, remotes }: Pick<CaveSceneProps, "player" | "light" | "remotes">) {
  const mine = useRef<THREE.PointLight>(null);
  const others = useRef<(THREE.PointLight | null)[]>([]);
  const shines = useMemo<Shine[]>(() => [], []);
  useFrame(({ clock }) => {
    const level = light.current ?? 0;
    const flicker = 1 + Math.sin(clock.getElapsedTime() * 2.7) * 0.04;
    if (mine.current) {
      // a little in front (toward the camera), so it lights Kordi's face, not just the crown
      mine.current.position.set(player.x, player.y + 2.2, player.z + 1.8);
      mine.current.intensity = (2.2 + 34 * level) * flicker;
      mine.current.distance = 4 + 13 * level;
    }
    crownedRemotes(remotes.current, player, shines);
    others.current.forEach((lamp, i) => {
      if (!lamp) return;
      const s = shines[i];
      lamp.visible = s !== undefined;
      if (s) lamp.position.set(s.x, s.y + 2.4, s.z);
    });
  });
  return (
    <>
      <pointLight ref={mine} color={CROWN_LIGHT} decay={1.6} />
      {[...Array(REMOTE_CROWN_LIGHTS).keys()].map((i) => (
        <pointLight
          key={i}
          ref={(el) => {
            others.current[i] = el;
          }}
          color={CROWN_LIGHT}
          intensity={26}
          distance={14}
          decay={1.6}
          visible={false}
        />
      ))}
    </>
  );
}

/**
 * The cave's air follows its light: in the dark the fog closes right in; in
 * the crown's starlight it draws back and the sky light comes up a little.
 */
export function lightCave(
  scene: THREE.Scene,
  hemi: THREE.HemisphereLight | null,
  theme: { fog: readonly [number, number]; ambient: number },
  level: number,
) {
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.near = theme.fog[0] + 6 * level;
    scene.fog.far = theme.fog[1] + 24 * level;
  }
  if (hemi) hemi.intensity = theme.ambient + 0.4 * level;
}

// --- the way in ----------------------------------------------------------------

const SHIMMER_COUNT = 36;

/**
 * The illusory wall, seen from the island: nothing at all — unless you wear the
 * cosmic crown and come close, when stars shimmer over that stretch of rock.
 */
export function IllusoryWall({ player, crowned }: { player: THREE.Vector3; crowned: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useBuilt(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(SHIMMER_COUNT * 3);
    for (let i = 0; i < SHIMMER_COUNT; i++) {
      positions[i * 3] = (hash(i, 31) - 0.5) * ILLUSORY_WALL.width;
      positions[i * 3 + 1] = 0.2 + hash(i, 32) * 3;
      positions[i * 3 + 2] = hash(i, 33) * 0.06;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  });
  const material = useBuilt(
    () =>
      new THREE.PointsMaterial({
        color: "#d9ccff",
        size: 0.12,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
  );
  useFrame(({ clock }) => {
    const d = Math.hypot(player.x - ILLUSORY_WALL.x, player.z - ILLUSORY_WALL.z);
    const near = crowned ? THREE.MathUtils.smoothstep(ILLUSORY_REVEAL - d, 0, ILLUSORY_REVEAL - 2) : 0;
    const p = points.current;
    if (!p) return;
    (p.material as THREE.PointsMaterial).opacity = near * (0.55 + 0.35 * Math.sin(clock.getElapsedTime() * 2.1));
    p.visible = near > 0.01;
  });
  return (
    <points ref={points} geometry={geometry} material={material} position={[ILLUSORY_WALL.x, 0, CLIFF.front + 0.05]} visible={false} />
  );
}
