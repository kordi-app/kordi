"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { BALL_RADIUS } from "../model/ball";

/** A cream ball with a band of notes around it, so its spin is visible. */
function makeBallTexture(accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fbf8f2";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 52, 256, 24);
  ctx.fillStyle = "#2a2521";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ["♪", "♫", "♪", "♫"].forEach((glyph, i) => ctx.fillText(glyph, 32 + i * 64, i % 2 ? 30 : 100));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Rendering only — position and spin are set by the scene each frame. */
export const NoteBall = forwardRef<THREE.Mesh, { accent: string }>(function NoteBall({ accent }, ref) {
  const texture = useMemo(() => makeBallTexture(accent), [accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 20]} />
      <meshStandardMaterial map={texture} roughness={0.45} />
    </mesh>
  );
});
