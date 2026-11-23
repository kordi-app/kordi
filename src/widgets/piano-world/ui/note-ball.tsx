"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { BALL_RADIUS } from "../engine/ball";

/**
 * A cream ball wrapped in a strip of staff paper: an accent band with thin
 * trims and five staff lines, notes sitting on it, and a few loose notes
 * above and below so its spin shows from every side. The top and bottom
 * shade a touch warmer, so the ball looks round even in flat light.
 */
function makeBallTexture(accent: string) {
  const W = 512;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "#efe6d6");
  shade.addColorStop(0.3, "#fbf8f2");
  shade.addColorStop(0.7, "#fbf8f2");
  shade.addColorStop(1, "#e8ddca");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  // the band, edged with thin dark trims
  const top = 98;
  const bottom = 158;
  ctx.fillStyle = accent;
  ctx.fillRect(0, top, W, bottom - top);
  ctx.fillStyle = "#2a2521";
  ctx.fillRect(0, top - 5, W, 3);
  ctx.fillRect(0, bottom + 2, W, 3);

  // staff lines across the band
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let i = 0; i < 5; i++) ctx.fillRect(0, top + 10 + i * 9, W, 1.5);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // notes on the staff
  ctx.fillStyle = "#fbf8f2";
  ctx.font = "bold 44px system-ui, sans-serif";
  ["♪", "♫", "♩", "♪", "♫", "♩"].forEach((glyph, i) => ctx.fillText(glyph, 42 + i * 85, 128 + (i % 2 ? -5 : 5)));
  // loose notes in the cream above and below
  ctx.fillStyle = "#2a2521";
  ctx.font = "bold 40px system-ui, sans-serif";
  ["♪", "♫", "♪", "♫"].forEach((glyph, i) => ctx.fillText(glyph, 64 + i * 128, i % 2 ? 52 : 204));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Rendering only — position and spin are set by the scene each frame. */
export const NoteBall = forwardRef<THREE.Mesh, { accent: string }>(function NoteBall({ accent }, ref) {
  const texture = useMemo(() => makeBallTexture(accent), [accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 20]} />
      <meshStandardMaterial map={texture} roughness={0.38} />
    </mesh>
  );
});
