"use client";

import { memo, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CASE_H, PRESS_DEPTH, WHITE_L, keySpan, keysIn, type KeyDef, type KeyRange } from "../model/layout";

/** the back edge of the keyboard case (the white keys end 0.6 in front of it) */
const BACK = -0.15 - (WHITE_L + 0.9) / 2;
import type { RegionTheme } from "../model/regions";

/** Underdamped: a pressed key overshoots a little and wobbles back, like a real key. */
const STIFFNESS = 420;
const DAMPING = 15;
/** How strongly a pressed key takes on the region's glow colour */
const GLOW_MIX = 0.55;

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
      {[-1, 1].map((side) => (
        <mesh key={side} position={[caseX + side * (caseWidth / 2 + 0.25), 0.2, -0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.4, WHITE_L + 0.9]} />
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
