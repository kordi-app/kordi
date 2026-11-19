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

const CASE_COLOR = "#2f2b27";
const WHITE = "#fbf8f2";
const WHITE_PRESSED = "#e8dcc6";
const BLACK = "#24201c";
const BLACK_PRESSED = "#5b5048";

/** The giant keyboard Kordi walks on. Only `pressed` changes between renders. */
export const PianoFloor = memo(function PianoFloor({
  pressed,
}: {
  pressed: ReadonlySet<number>;
}) {
  const caseWidth = WHITE_COUNT * WHITE_W + 0.6;

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 80]} />
        <meshStandardMaterial color="#f7f3ec" roughness={1} />
      </mesh>

      {/* keyboard case */}
      <mesh position={[0, CASE_H / 2, -0.15]} receiveShadow castShadow>
        <boxGeometry args={[caseWidth, CASE_H, WHITE_L + 0.9]} />
        <meshStandardMaterial color={CASE_COLOR} roughness={0.5} />
      </mesh>

      {KEYS.map((key) => {
        const isPressed = pressed.has(key.midi);
        const y = CASE_H + key.height / 2 - (isPressed ? PRESS_DEPTH : 0);
        return (
          <mesh
            key={key.midi}
            position={[key.x, y, key.z]}
            castShadow={key.black}
            receiveShadow
          >
            <boxGeometry args={[key.width, key.height, key.length]} />
            <meshStandardMaterial
              color={
                key.black
                  ? isPressed
                    ? BLACK_PRESSED
                    : BLACK
                  : isPressed
                    ? WHITE_PRESSED
                    : WHITE
              }
              roughness={key.black ? 0.35 : 0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
});
