"use client";

import { memo } from "react";
import {
  CASE_H,
  KEYS,
  PRESS_DEPTH,
  WHITE_COUNT,
  WHITE_L,
  WHITE_W,
} from "../model/layout";
import type { RegionTheme } from "../model/regions";
import { useKeySprings } from "../lib/use-key-springs";

/** The giant keyboard Kordi walks on. Only `pressed` changes between renders. */
export const PianoFloor = memo(function PianoFloor({
  pressed,
  theme,
}: {
  pressed: ReadonlySet<number>;
  theme: RegionTheme;
}) {
  const caseWidth = WHITE_COUNT * WHITE_W + 0.6;
  const springRef = useKeySprings(
    KEYS.length,
    (i) => CASE_H + KEYS[i].height / 2,
    (i) => (pressed.has(KEYS[i].midi) ? -PRESS_DEPTH : 0),
  );

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 80]} />
        <meshStandardMaterial color={theme.floor} roughness={1} />
      </mesh>

      {/* keyboard case */}
      <mesh position={[0, CASE_H / 2, -0.15]} receiveShadow castShadow>
        <boxGeometry args={[caseWidth, CASE_H, WHITE_L + 0.9]} />
        <meshStandardMaterial color={theme.keyboardCase} roughness={0.5} />
      </mesh>

      {KEYS.map((key, i) => {
        const isPressed = pressed.has(key.midi);
        return (
          <mesh
            key={key.midi}
            ref={springRef(i)}
            position={[key.x, CASE_H + key.height / 2, key.z]}
            castShadow={key.black}
            receiveShadow
          >
            <boxGeometry args={[key.width, key.height, key.length]} />
            <meshStandardMaterial
              color={
                key.black
                  ? isPressed
                    ? theme.blackPressed
                    : theme.black
                  : isPressed
                    ? theme.whitePressed
                    : theme.white
              }
              emissive={isPressed && theme.pressedGlow ? theme.pressedGlow : "#000000"}
              emissiveIntensity={isPressed && theme.pressedGlow ? 0.9 : 0}
              roughness={key.black ? 0.35 : 0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
});
