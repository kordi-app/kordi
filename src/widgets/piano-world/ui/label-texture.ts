"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * A rounded pill with text, drawn to a canvas texture — for name tags and
 * portal signs without loading a 3D font. Disposed when the text changes or
 * the owner unmounts.
 */
export function useLabelTexture(text: string, { background = "rgba(252, 251, 248, 0.92)", color = "#2a2521" } = {}) {
  const label = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "600 44px Pretendard Variable, Pretendard, system-ui, sans-serif";
    ctx.font = font;
    const width = Math.ceil(ctx.measureText(text).width) + 48;
    canvas.width = width;
    canvas.height = 76;
    ctx.font = font;
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, 76, 38);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, 40);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, aspect: width / 76 };
  }, [text, background, color]);

  useEffect(() => () => label.texture.dispose(), [label]);
  return label;
}
