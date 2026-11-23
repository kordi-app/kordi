"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
import { WOOD, GOLD, mergeParts, paint, sinceHit, useBuilt } from "./shared";

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

/** The tower's two see-through parts, as boxes (world space): ground → roof, and roof → spire tip. */
const REACH = TOWER.half + 0.6;
const BODY_BOX = { x0: TOWER.x - REACH, x1: TOWER.x + REACH, y0: 0, y1: TOWER.top, z0: TOWER.z - REACH, z1: TOWER.z + REACH };
const TOP_BOX = { ...BODY_BOX, y0: TOWER.top, y1: TOWER.top + BELFRY.height + BELFRY.spire + 2 };
type Box = typeof BODY_BOX;
const scratchHead = new THREE.Vector3();

/** Does the segment a→b pass through the box? (slab test) */
function segmentHitsBox(a: THREE.Vector3, b: THREE.Vector3, box: Box) {
  let t0 = 0;
  let t1 = 1;
  for (const [from, to, lo, hi] of [
    [a.x, b.x, box.x0, box.x1],
    [a.y, b.y, box.y0, box.y1],
    [a.z, b.z, box.z0, box.z1],
  ] as const) {
    const d = to - from;
    if (Math.abs(d) < 1e-9) {
      if (from < lo || from > hi) return false;
      continue;
    }
    let near = (lo - from) / d;
    let far = (hi - from) / d;
    if (near > far) [near, far] = [far, near];
    t0 = Math.max(t0, near);
    t1 = Math.min(t1, far);
    if (t0 > t1) return false;
  }
  return true;
}

/** Every material under the groups, made fadeable (transparent, still fully opaque until faded). */
function collectFading(body: THREE.Group | null, tops: (THREE.Group | null)[]) {
  if (!body || tops.some((g) => !g)) return null;
  const gather = (groups: (THREE.Group | null)[]) => {
    const found = new Set<THREE.Material>();
    for (const group of groups) {
      group?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          m.transparent = true;
          m.needsUpdate = true;
          found.add(m);
        }
      });
    }
    return [...found];
  };
  return { body: gather([body]), top: gather(tops) };
}

/** The four faces of the tower, as [rotation y, outward x, outward z]. */
const FACES: [number, number, number][] = [
  [0, 0, 1],
  [Math.PI / 2, 1, 0],
  [Math.PI, 0, -1],
  [-Math.PI / 2, -1, 0],
];

const GLASS = "#2f2a33";
const DOOR_WOOD = "#5a3b24";
const IRON = "#2f2b27";
const CLOCK_Y = LEVELS[1] + 2.4;

/** Places a face-local part on face `f` (its wall plane, facing out). */
function onFace(geometry: THREE.BufferGeometry, f: number) {
  const [rot, ox, oz] = FACES[f];
  return geometry.applyMatrix4(new THREE.Matrix4().makeRotationY(rot).setPosition(ox * (TOWER.half + 0.02), 0, oz * (TOWER.half + 0.02)));
}

/**
 * An arched opening at (x, y, z) in face-local space: the opening itself
 * (pushed to `opening`) and its stone surround, jambs, sill and keystone
 * (pushed to `trim`).
 */
function archWindow(
  out: { opening: THREE.BufferGeometry[]; trim: THREE.BufferGeometry[] },
  [x, y, z]: [number, number, number],
  width: number,
  height: number,
  sill = true,
) {
  const archY = height - width / 2 - width / 4;
  const place = (g: THREE.BufferGeometry) => g.translate(x, y, z);
  out.opening.push(place(new THREE.PlaneGeometry(width, height - width / 2).translate(0, height / 2 - width / 4, 0)));
  out.opening.push(place(new THREE.CircleGeometry(width / 2, 20, 0, Math.PI).translate(0, archY, 0)));
  out.trim.push(place(new THREE.RingGeometry(width / 2, width / 2 + 0.16, 20, 1, 0, Math.PI).translate(0, archY, -0.01)));
  for (const side of [-1, 1]) {
    out.trim.push(place(new THREE.BoxGeometry(0.16, archY, 0.05).translate(side * (width / 2 + 0.08), archY / 2, -0.015)));
  }
  out.trim.push(place(new THREE.BoxGeometry(0.22, 0.3, 0.09).translate(0, archY + width / 2 + 0.1, 0.005)));
  if (sill) out.trim.push(place(new THREE.BoxGeometry(width + 0.36, 0.12, 0.24).translate(0, -0.06, 0.07)));
}

/**
 * The tower body's static details, as three merged geometries (was ~100
 * separate meshes): every window opening, the plank door, and all the pale
 * trim (quoins, cornices, corbel table, roof deck, window surrounds).
 */
function towerBodyGeometries() {
  const size = TOWER.half * 2;
  const roofY = TOWER.top;
  const windows = { opening: [] as THREE.BufferGeometry[], trim: [] as THREE.BufferGeometry[] };
  const door: THREE.BufferGeometry[] = [];
  FACES.forEach((_, f) => {
    const local = { opening: [] as THREE.BufferGeometry[], trim: [] as THREE.BufferGeometry[] };
    for (const x of [-1.6, 1.6]) archWindow(local, [x, LEVELS[0] + 1.1, 0], 0.9, 2.4);
    // a stone ring round the clock
    local.trim.push(new THREE.RingGeometry(1.4, 1.62, 40).translate(0, CLOCK_Y, 0.005));
    if (f === 0) {
      // the door: planks, iron straps and studs, a ring pull
      const doorParts = { opening: [] as THREE.BufferGeometry[], trim: local.trim };
      archWindow(doorParts, [0, 0.9, 0.42], 1.6, 2.9, false);
      // the doorway stands proud of the wall as a shallow stone portal
      local.trim.push(new THREE.BoxGeometry(2.3, 2.85, 0.38).translate(0, 0.9 + 2.85 / 2, 0.19));
      doorParts.opening.forEach((g) => door.push(paint(g, DOOR_WOOD)));
      for (const px of [-0.4, 0, 0.4]) door.push(paint(new THREE.BoxGeometry(0.03, 1.9, 0.02).translate(px, 0.9 + 0.95, 0.43), "#3e2817"));
      for (const sy of [0.45, 1.6]) door.push(paint(new THREE.BoxGeometry(1.5, 0.09, 0.03).translate(0, 0.9 + sy, 0.44), IRON));
      for (const sy of [0.45, 1.6]) {
        for (const sx of [-0.55, -0.2, 0.2, 0.55]) door.push(paint(new THREE.SphereGeometry(0.045, 6, 4).translate(sx, 0.9 + sy, 0.465), IRON));
      }
      door.push(paint(new THREE.TorusGeometry(0.12, 0.025, 6, 16).translate(0.42, 0.9 + 1.1, 0.48), IRON));
      // a worn step up onto the plinth
      door.push(paint(new THREE.BoxGeometry(2.2, 0.48, 0.5).translate(0, 0.24, 0.62), "#b9ab90"));
    } else {
      archWindow(local, [0, 2.2, 0], 0.5, 1.4);
    }
    local.opening.forEach((g) => windows.opening.push(onFace(g, f)));
    local.trim.forEach((g) => windows.trim.push(onFace(g, f)));
  });
  door.forEach((g) => onFace(g, 0));

  const trim = windows.trim;
  // quoins: alternating long and short blocks up each corner
  const course = 0.55;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let k = 0, y = 0.9; y < roofY - 0.4; k++, y += course) {
        const long = k % 2 === 0;
        const h = course - 0.05;
        const wx = long ? 0.75 : 0.55;
        const wz = long ? 0.55 : 0.75;
        trim.push(new THREE.BoxGeometry(wx, h, wz).translate(sx * (TOWER.half - 0.15 - (wx - 0.55) / 2), y + h / 2, sz * (TOWER.half - 0.15 - (wz - 0.55) / 2)));
      }
    }
  }
  // cornices between the storeys, each with a bevelled drip under it
  for (const y of LEVELS) {
    trim.push(new THREE.BoxGeometry(size + 0.35, 0.3, size + 0.35).translate(0, y, 0));
    trim.push(new THREE.BoxGeometry(size + 0.12, 0.12, size + 0.12).translate(0, y - 0.2, 0));
  }
  // a corbel table under the roof deck
  for (const [rot] of FACES) {
    const turn = new THREE.Matrix4().makeRotationY(rot);
    for (let k = -3; k <= 3; k++) {
      trim.push(new THREE.BoxGeometry(0.32, 0.38, 0.22).translate(k * 1.1, roofY - 0.58, TOWER.half + 0.06).applyMatrix4(turn));
    }
  }
  // roof deck (stays solid under Kordi's feet) and a moulded band under it
  trim.push(new THREE.BoxGeometry(size + 0.5, 0.4, size + 0.5).translate(0, roofY - 0.2, 0));
  trim.push(new THREE.BoxGeometry(size + 0.25, 0.12, size + 0.25).translate(0, roofY - 0.43, 0));

  return { opening: mergeParts(windows.opening), door: mergeParts(door), trim: mergeParts(trim) };
}

/** The four clock dials (face, gilt bezel, minute track, hour marks, boss) as one painted geometry. */
function clockDialsGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  FACES.forEach((_, f) => {
    const local: THREE.BufferGeometry[] = [
      paint(new THREE.CircleGeometry(1.25, 40), "#fbf6ea"),
      paint(new THREE.RingGeometry(1.25, 1.42, 40).translate(0, 0, 0.01), GOLD),
      paint(new THREE.RingGeometry(0.86, 0.89, 40).translate(0, 0, 0.012), "#8d8576"),
      paint(new THREE.CircleGeometry(0.09, 12).translate(0, 0, 0.06), GOLD),
    ];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const major = i % 3 === 0;
      // hour marks as little bars pointing at the centre
      local.push(
        paint(
          new THREE.PlaneGeometry(major ? 0.1 : 0.06, major ? 0.24 : 0.16)
            .rotateZ(-a)
            .translate(Math.sin(a) * 1.03, Math.cos(a) * 1.03, 0.02),
          GLASS,
        ),
      );
    }
    local.forEach((g) => parts.push(onFace(g.translate(0, CLOCK_Y, 0.02), f)));
  });
  return mergeParts(parts);
}

/** A clock hand with a short counterweighted tail and a pointed tip. */
function handGeometry(width: number, length: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -0.18);
  shape.lineTo(width / 2, -0.18);
  shape.lineTo(width / 2, length - 0.12);
  shape.lineTo(0, length);
  shape.lineTo(-width / 2, length - 0.12);
  shape.closePath();
  return mergeParts([new THREE.ShapeGeometry(shape), new THREE.CircleGeometry(width * 0.9, 10).translate(0, -0.2, 0)]);
}

/**
 * The roof-top stonework, merged: battlements with capping stones, the
 * belfry's turned columns with bases and capitals, lintels joining them, and
 * the spire's base slab.
 */
function towerTopGeometry() {
  const roofY = TOWER.top;
  const parts: THREE.BufferGeometry[] = [];
  for (const m of MERLONS) {
    const x = m.x - TOWER.x;
    const z = m.z - TOWER.z;
    parts.push(new THREE.BoxGeometry(MERLON_SIZE, 0.74, MERLON_SIZE).translate(x, roofY + 0.35, z));
    parts.push(new THREE.BoxGeometry(MERLON_SIZE + 0.12, 0.1, MERLON_SIZE + 0.12).translate(x, roofY + 0.77, z));
  }
  const h = BELFRY.height;
  const column = [
    [0.42, 0],
    [0.42, 0.16],
    [0.34, 0.24],
    [0.3, 0.38],
    [0.26, h - 0.5],
    [0.3, h - 0.42],
    [0.3, h - 0.36],
    [0.42, h - 0.3],
    [0.42, h],
    [0, h],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(new THREE.LatheGeometry(column, 12).translate(sx * BELFRY.inset, roofY, sz * BELFRY.inset));
    }
  }
  for (const [rot] of FACES) {
    parts.push(new THREE.BoxGeometry(BELFRY.inset * 2, 0.3, 0.34).translate(0, roofY + h - 0.15, BELFRY.inset).applyMatrix4(new THREE.Matrix4().makeRotationY(rot)));
  }
  parts.push(new THREE.BoxGeometry(BELFRY.inset * 2 + 0.9, 0.3, BELFRY.inset * 2 + 0.9).translate(0, roofY + h + 0.15, 0));
  return mergeParts(parts);
}

/**
 * The slate spire with a small louvred dormer on each face, painted in one
 * geometry (in spire-local space: its base slab's top at y = 0.3).
 */
function spireGeometry() {
  const base = BELFRY.inset + 0.6;
  const parts: THREE.BufferGeometry[] = [
    paint(new THREE.ConeGeometry(base * Math.SQRT2, BELFRY.spire, 4).rotateY(Math.PI / 4).translate(0, 0.3 + BELFRY.spire / 2, 0), SLATE),
  ];
  const y = 0.3 + 1.25;
  const out = base * (1 - 1.25 / BELFRY.spire) - 0.25;
  for (const [rot] of FACES) {
    const turn = new THREE.Matrix4().makeRotationY(rot);
    const dormer = [
      paint(new THREE.BoxGeometry(0.9, 0.9, 1.2).translate(0, y, out), TRIM),
      paint(new THREE.CylinderGeometry(0.62, 0.62, 1.34, 3).rotateX(Math.PI / 2).rotateZ(Math.PI).translate(0, y + 0.45 + 0.31, out + 0.05), SLATE),
      paint(new THREE.PlaneGeometry(0.5, 0.6).translate(0, y - 0.03, out + 0.61), GLASS),
    ];
    for (let k = 0; k < 3; k++) dormer.push(paint(new THREE.BoxGeometry(0.52, 0.04, 0.06).translate(0, y - 0.22 + k * 0.19, out + 0.63), "#4a4f60"));
    dormer.forEach((g) => parts.push(g.applyMatrix4(turn)));
  }
  return mergeParts(parts);
}

/** Finial, collar and ♪ vane on the spire's tip, merged (spire-local space). */
function spireGoldGeometry() {
  const tip = 0.3 + BELFRY.spire;
  return mergeParts([
    new THREE.CylinderGeometry(0.2, 0.26, 0.16, 12).translate(0, tip - 0.25, 0),
    new THREE.SphereGeometry(0.28, 16, 12).translate(0, tip + 0.1, 0),
    new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6).translate(0, tip + 0.55, 0),
    new THREE.BoxGeometry(0.07, 0.9, 0.07).translate(0.1, tip + 1.15, 0),
    new THREE.SphereGeometry(0.18, 14, 10).scale(1.25, 1, 0.5).translate(-0.08, tip + 0.7, 0),
  ]);
}

/** The bell's crown and the thickened sound-bow at its mouth (bell-local space). */
function bellTrimGeometry() {
  return mergeParts([
    new THREE.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, -0.35, 0),
    new THREE.TorusGeometry(BELL.radius, 0.06, 8, 32).rotateX(Math.PI / 2).translate(0, -1.93, 0),
    new THREE.TorusGeometry(0.39, 0.04, 6, 24).rotateX(Math.PI / 2).translate(0, -0.42, 0),
    new THREE.TorusGeometry(0.13, 0.04, 6, 14).translate(0, 0.08, 0),
  ]);
}

export function BellTower({ player }: { player: THREE.Vector3 }) {
  const stone = useMemo(() => {
    const texture = makeStoneTexture();
    texture.repeat.set(2.5, 6);
    return texture;
  }, []);
  useEffect(() => () => stone.dispose(), [stone]);
  const parts = useMemo(() => towerBodyGeometries(), []);
  useEffect(
    () => () => {
      parts.opening.dispose();
      parts.door.dispose();
      parts.trim.dispose();
    },
    [parts],
  );
  const dials = useBuilt(clockDialsGeometry);
  const hourHand = useBuilt(() => handGeometry(0.1, 0.65));
  const minuteHand = useBuilt(() => handGeometry(0.06, 0.95));
  const topStone = useBuilt(towerTopGeometry);
  const spire = useBuilt(spireGeometry);
  const spireGold = useBuilt(spireGoldGeometry);
  const bellTrim = useBuilt(bellTrimGeometry);
  const bell = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const fading = useRef<{ body: THREE.Material[]; top: THREE.Material[] } | null>(null);
  const hands = useRef<(THREE.Group | null)[]>([]);
  const last = useRef(0);

  useFrame(({ clock, camera }, delta) => {
    const now = clock.getElapsedTime();
    if (bell.current) {
      const t = sinceHit("bell", now);
      bell.current.rotation.z = t < 6 ? Math.sin(t * 5) * 0.45 * Math.exp(-t * 0.7) : 0;
    }
    // see-through whenever the tower stands between the camera and Kordi: the body
    // (ground to roof) and the top (belfry, spire, bell) each fade as a whole
    fading.current ??= collectFading(body.current, [top.current, bell.current]);
    if (fading.current) {
      const head = scratchHead.set(player.x, player.y + 0.8, player.z);
      const onRoof = player.y > TOWER.top - 1 && Math.abs(player.x - TOWER.x) < TOWER.half + 0.4 && Math.abs(player.z - TOWER.z) < TOWER.half + 0.4;
      const fadeBody = !onRoof && segmentHitsBox(camera.position, head, BODY_BOX);
      const fadeTop = onRoof || segmentHitsBox(camera.position, head, TOP_BOX);
      const ease = 1 - Math.exp(-delta * 6);
      for (const [materials, fade] of [
        [fading.current.body, fadeBody],
        [fading.current.top, fadeTop],
      ] as const) {
        for (const material of materials) {
          material.opacity += ((fade ? 0.22 : 1) - material.opacity) * ease;
          material.depthWrite = material.opacity > 0.95;
        }
      }
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
        <group ref={body}>
          {/* plinth */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[size + 0.8, 0.9, size + 0.8]} />
            <meshStandardMaterial color={STONE_DARK} roughness={0.95} />
          </mesh>
          {/* the shaft */}
          <mesh position={[0, roofY / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[size - 0.1, roofY, size - 0.1]} />
            <meshStandardMaterial map={stone} roughness={0.9} />
          </mesh>
          {/* quoins, cornices, corbels, roof deck and window surrounds */}
          <mesh geometry={parts.trim} castShadow receiveShadow>
            <meshStandardMaterial color={TRIM} roughness={0.78} />
          </mesh>
          <mesh geometry={parts.opening}>
            <meshStandardMaterial color={GLASS} roughness={0.35} metalness={0.1} />
          </mesh>
          <mesh geometry={parts.door}>
            <meshStandardMaterial vertexColors roughness={0.7} />
          </mesh>
          <mesh geometry={dials}>
            <meshStandardMaterial vertexColors roughness={0.5} metalness={0.15} />
          </mesh>
          {/* the clock hands: the clocks show the real local time */}
          {FACES.map(([rot, ox, oz], f) => (
            <group key={f} position={[ox * (TOWER.half + 0.02), CLOCK_Y, oz * (TOWER.half + 0.02)]} rotation={[0, rot, 0]}>
              {[hourHand, minuteHand].map((geometry, i) => (
                <group
                  key={i}
                  position={[0, 0, 0.05 + i * 0.01]}
                  ref={(el) => {
                    hands.current[f * 2 + i] = el;
                  }}
                  userData={{ minute: i === 1 }}
                >
                  <mesh geometry={geometry}>
                    <meshStandardMaterial color={GLASS} roughness={0.5} metalness={0.3} />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
        </group>
        {/* battlements, belfry and spire */}
        <group ref={top}>
          <mesh geometry={topStone} castShadow>
            <meshStandardMaterial color={TRIM} roughness={0.75} />
          </mesh>
          {/* crossbeam the bell hangs from */}
          <mesh position={[0, roofY + 3.25, 0]} castShadow>
            <boxGeometry args={[BELFRY.inset * 2, 0.3, 0.4]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
          {/* the spire: slate with dormers, a golden finial and a ♪ vane */}
          <group position={[0, roofY + BELFRY.height, 0]}>
            <mesh geometry={spire} castShadow>
              <meshStandardMaterial vertexColors roughness={0.6} flatShading />
            </mesh>
            <mesh geometry={spireGold}>
              <meshStandardMaterial color={GOLD} metalness={0.4} roughness={0.28} />
            </mesh>
          </group>
        </group>
      </group>
      {/* the bell swings from the crossbeam */}
      <group ref={bell} position={[BELL.x, BELL.y + 3.1, BELL.z]}>
        <mesh position={[0, -1.15, 0]} castShadow>
          <cylinderGeometry args={[0.35, BELL.radius, 1.6, 28, 1, true]} />
          <meshStandardMaterial color={GOLD} metalness={0.35} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={bellTrim}>
          <meshStandardMaterial color={GOLD} metalness={0.4} roughness={0.28} />
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
