"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CASE_H, PRESS_DEPTH, WHITE_L, keySpan, keysIn, type KeyDef, type KeyRange } from "../model/layout";

import type { RegionTheme } from "../model/regions";

/** the back edge of the keyboard case (the white keys end 0.6 in front of it) */
const BACK = -0.15 - (WHITE_L + 0.9) / 2;
/** the front face of the keyboard case */
const FRONT = -0.15 + (WHITE_L + 0.9) / 2;
/** Brass for the thin trims (nameboard inlay, front lip): reads on every case colour */
const TRIM = "#c9a45c";
/** The end blocks: same box as before, with softened edges (one shared shape for both). */
const CHEEK = new RoundedBoxGeometry(0.5, 0.4, WHITE_L + 0.9, 2, 0.06);

/** Underdamped: a pressed key overshoots a little and wobbles back, like a real key. */
const STIFFNESS = 420;
const DAMPING = 15;
/** How strongly a pressed key takes on the region's glow colour */
const GLOW_MIX = 0.55;
/** Resting keys vary this much in lightness, like real ivory, so a long row doesn't read as one flat strip */
const IVORY_VARIATION = 0.035;

/** Deterministic 0–1 noise per key (render must stay pure). */
function hash(i: number) {
  const x = Math.sin(i * 127.1 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * One key's shape, at its real size so the bevel isn't stretched: softly
 * rounded edges, and black keys taper toward the top like a real piano's.
 * Same bounding box as the plain block it replaces, so the top surface sits
 * exactly where the walkable key top is.
 */
function makeKeyGeometry(key: KeyDef) {
  const radius = key.black ? 0.07 : 0.045;
  const geometry = new RoundedBoxGeometry(key.width, key.height, key.length, 2, radius);
  if (key.black) {
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      // 0 at the bottom, 1 at the top: narrow the top a little
      const up = position.getY(i) / key.height + 0.5;
      const squeeze = 1 - 0.1 * up;
      position.setX(i, position.getX(i) * squeeze);
      position.setZ(i, position.getZ(i) * (1 - 0.03 * up));
    }
    geometry.computeVertexNormals();
  }
  return geometry;
}

/**
 * One row of keys (all white or all black) as a single instanced mesh. Each
 * frame it springs the keys that are pressed (or still settling) and recolours
 * only the ones whose state changed — no React renders while you walk.
 */
function KeyRow({
  keys,
  pressed,
  color,
  pressedColor,
  glow,
  roughness,
  shadows,
}: {
  keys: readonly KeyDef[];
  pressed: RefObject<ReadonlySet<number>>;
  color: string;
  pressedColor: string;
  glow: string | null;
  roughness: number;
  shadows: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const springs = useRef(keys.map(() => ({ y: 0, v: 0, down: false, painted: false })));
  const scratch = useMemo(
    () => ({
      matrix: new THREE.Matrix4(),
      rest: keys.map((key) =>
        new THREE.Color(color).offsetHSL(0, 0, (hash(key.midi) - 0.5) * 2 * IVORY_VARIATION),
      ),
      down: new THREE.Color(pressedColor).lerp(new THREE.Color(glow ?? pressedColor), glow ? GLOW_MIX : 0),
    }),
    [keys, color, pressedColor, glow],
  );
  // every key in a row shares one size: build the shape once at that size, so
  // instances only translate (a key that differed would scale to fit)
  const shape = keys[0];
  const geometry = useMemo(() => makeKeyGeometry(shape), [shape]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const place = useCallback(
    (key: KeyDef, y: number) =>
      scratch.matrix
        .makeScale(key.width / shape.width, key.height / shape.height, key.length / shape.length)
        .setPosition(key.x, CASE_H + key.height / 2 + y, key.z),
    [scratch, shape],
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    keys.forEach((key, i) => {
      m.setMatrixAt(i, place(key, 0));
      m.setColorAt(i, scratch.rest[i]);
      springs.current[i].painted = false;
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [keys, scratch, place]);

  useFrame((_, rawDelta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDelta, 1 / 30); // keep the spring stable on slow frames
    const down = pressed.current;
    let moved = false;
    let recoloured = false;
    keys.forEach((key, i) => {
      const spring = springs.current[i];
      const isDown = down.has(key.midi);
      if (isDown !== spring.down || !spring.painted) {
        spring.down = isDown;
        spring.painted = true;
        m.setColorAt(i, isDown ? scratch.down : scratch.rest[i]);
        recoloured = true;
      }
      const goal = isDown ? -PRESS_DEPTH : 0;
      if (Math.abs(spring.y - goal) < 1e-4 && Math.abs(spring.v) < 1e-4) return; // at rest
      spring.v += (-STIFFNESS * (spring.y - goal) - DAMPING * spring.v) * dt;
      spring.y += spring.v * dt;
      m.setMatrixAt(i, place(key, spring.y));
      moved = true;
    });
    if (moved) m.instanceMatrix.needsUpdate = true;
    if (recoloured && m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, keys.length]} castShadow={shadows} receiveShadow>
      <meshStandardMaterial roughness={roughness} />
    </instancedMesh>
  );
}

/** The giant keyboard Kordi walks on: the case and two instanced rows of keys. */
export const PianoFloor = memo(function PianoFloor({
  pressed,
  theme,
  ground = true,
  keys: range,
}: {
  /** keys held down right now (by you and everyone in the channel); read every frame */
  pressed: RefObject<ReadonlySet<number>>;
  theme: RegionTheme;
  /** the plain floor around the keyboard (the island draws its own) */
  ground?: boolean;
  /** build only this stretch of the keyboard (default all 88) */
  keys?: KeyRange;
}) {
  const { white, black, caseWidth, caseX, id } = useMemo(() => {
    const keys = keysIn(range);
    const { left, right } = keySpan(range);
    return {
      white: keys.filter((k) => !k.black),
      black: keys.filter((k) => k.black),
      caseWidth: right - left + 0.6,
      caseX: (left + right) / 2,
      id: range ? range.join("-") : "all",
    };
  }, [range]);
  return (
    <group>
      {ground ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[400, 300]} />
          <meshStandardMaterial color={theme.floor} roughness={1} />
        </mesh>
      ) : null}

      {/* keyboard case */}
      <mesh position={[caseX, CASE_H / 2, -0.15]} receiveShadow castShadow>
        <boxGeometry args={[caseWidth, CASE_H, WHITE_L + 0.9]} />
        <meshStandardMaterial color={theme.keyboardCase} roughness={0.5} />
      </mesh>
      {/* like a real piano: the fallboard behind the keys, a strip of red felt, and end blocks */}
      <mesh position={[caseX, CASE_H + 0.27, BACK + 0.15]} castShadow receiveShadow>
        <boxGeometry args={[caseWidth, 0.54, 0.3]} />
        <meshStandardMaterial color={theme.keyboardCase} roughness={0.35} />
      </mesh>
      <mesh position={[caseX, CASE_H + 0.025, BACK + 0.36]}>
        <boxGeometry args={[caseWidth - 0.2, 0.05, 0.12]} />
        <meshStandardMaterial color="#8c2f39" roughness={1} />
      </mesh>
      {/* a thin brass inlay along the fallboard's face, and a lip along the case front:
          flush with the surfaces, so nothing you stand on moves */}
      <mesh position={[caseX, CASE_H + 0.42, BACK + 0.302]}>
        <boxGeometry args={[caseWidth - 0.6, 0.035, 0.004]} />
        <meshStandardMaterial color={TRIM} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[caseX, CASE_H - 0.03, FRONT + 0.002]}>
        <boxGeometry args={[caseWidth, 0.03, 0.004]} />
        <meshStandardMaterial color={TRIM} metalness={0.55} roughness={0.35} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={CHEEK}
          position={[caseX + side * (caseWidth / 2 + 0.25), 0.2, -0.15]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={theme.keyboardCase} roughness={0.35} />
        </mesh>
      ))}

      <KeyRow
        key={`white-${id}`}
        keys={white}
        pressed={pressed}
        color={theme.white}
        pressedColor={theme.whitePressed}
        glow={theme.pressedGlow}
        roughness={0.5}
        shadows={false}
      />
      <KeyRow
        key={`black-${id}`}
        keys={black}
        pressed={pressed}
        color={theme.black}
        pressedColor={theme.blackPressed}
        glow={theme.pressedGlow}
        roughness={0.35}
        shadows
      />
    </group>
  );
});
