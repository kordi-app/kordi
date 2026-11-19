"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { islandHits } from "../../model/island";

export const SAND = "#efe4c8";
export const ROCK = "#a89f92";
export const WOOD = "#8a6a4a";
export const GOLD = "#e3b341";
/** Zones farther than this from Kordi aren't drawn (fog has swallowed them anyway) */
export const DRAW_DISTANCE = 85;

/** Seconds since `tag` was last played (Infinity if never). */
export function sinceHit(tag: string, now: number) {
  const at = islandHits.get(tag);
  return at === undefined ? Infinity : now - at;
}

/** A flat rounded rectangle lying on the ground (x/z extents in world units). */
export function roundedRect(x0: number, x1: number, z0: number, z1: number, radius: number) {
  // Shape space is x / -z (the mesh is rotated flat), so world z0..z1 → shape y -z1..-z0
  const y0 = -z1;
  const y1 = -z0;
  const r = Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x1, y1 - r);
  shape.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x0 + r, y1);
  shape.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x0, y0 + r);
  shape.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return new THREE.ShapeGeometry(shape, 12);
}

/** Hides its children when Kordi is far away. */
export function Zone({ x, z, player, children }: { x: number; z: number; player: THREE.Vector3; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = Math.hypot(player.x - x, player.z - z) < DRAW_DISTANCE;
  });
  return <group ref={group}>{children}</group>;
}
