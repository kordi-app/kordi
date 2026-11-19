"use client";

import { memo, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CASE_H, KEYS, PRESS_DEPTH, WHITE_COUNT, WHITE_L, WHITE_W, type KeyDef } from "../model/layout";
import type { RegionTheme } from "../model/regions";

/** Underdamped: a pressed key overshoots a little and wobbles back, like a real key. */
const STIFFNESS = 420;
const DAMPING = 15;
/** How strongly a pressed key takes on the region's glow colour */
const GLOW_MIX = 0.55;

const WHITE_KEYS = KEYS.filter((k) => !k.black);
const BLACK_KEYS = KEYS.filter((k) => k.black);

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
      rest: new THREE.Color(color),
      down: new THREE.Color(pressedColor).lerp(new THREE.Color(glow ?? pressedColor), glow ? GLOW_MIX : 0),
    }),
    [color, pressedColor, glow],
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    keys.forEach((key, i) => {
      scratch.matrix.makeScale(key.width, key.height, key.length).setPosition(key.x, CASE_H + key.height / 2, key.z);
      m.setMatrixAt(i, scratch.matrix);
      m.setColorAt(i, scratch.rest);
      springs.current[i].painted = false;
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [keys, scratch]);

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
        m.setColorAt(i, isDown ? scratch.down : scratch.rest);
        recoloured = true;
      }
      const goal = isDown ? -PRESS_DEPTH : 0;
      if (Math.abs(spring.y - goal) < 1e-4 && Math.abs(spring.v) < 1e-4) return; // at rest
      spring.v += (-STIFFNESS * (spring.y - goal) - DAMPING * spring.v) * dt;
      spring.y += spring.v * dt;
      scratch.matrix
        .makeScale(key.width, key.height, key.length)
        .setPosition(key.x, CASE_H + key.height / 2 + spring.y, key.z);
      m.setMatrixAt(i, scratch.matrix);
      moved = true;
    });
    if (moved) m.instanceMatrix.needsUpdate = true;
    if (recoloured && m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, keys.length]} castShadow={shadows} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={roughness} />
    </instancedMesh>
  );
}

/** The giant keyboard Kordi walks on: the case and two instanced rows of keys. */
export const PianoFloor = memo(function PianoFloor({
  pressed,
  theme,
  ground = true,
}: {
  /** keys held down right now (by you and everyone in the channel); read every frame */
  pressed: RefObject<ReadonlySet<number>>;
  theme: RegionTheme;
  /** the plain floor around the keyboard (the island draws its own) */
  ground?: boolean;
}) {
  const caseWidth = WHITE_COUNT * WHITE_W + 0.6;
  return (
    <group>
      {ground ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[400, 300]} />
          <meshStandardMaterial color={theme.floor} roughness={1} />
        </mesh>
      ) : null}

      {/* keyboard case */}
      <mesh position={[0, CASE_H / 2, -0.15]} receiveShadow castShadow>
        <boxGeometry args={[caseWidth, CASE_H, WHITE_L + 0.9]} />
        <meshStandardMaterial color={theme.keyboardCase} roughness={0.5} />
      </mesh>

      <KeyRow
        keys={WHITE_KEYS}
        pressed={pressed}
        color={theme.white}
        pressedColor={theme.whitePressed}
        glow={theme.pressedGlow}
        roughness={0.5}
        shadows={false}
      />
      <KeyRow
        keys={BLACK_KEYS}
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
