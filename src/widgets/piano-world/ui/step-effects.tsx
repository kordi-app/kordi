"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface StepEffectsApi {
  /** ♪ notes popping up from a pressed key */
  notes: (x: number, y: number, z: number, color: string) => void;
  /** a ring of light spreading across the floor */
  ripple: (x: number, y: number, z: number, color: string) => void;
  /** a shower of confetti over a point */
  confetti: (x: number, y: number, z: number) => void;
}

const NOTE_POOL = 24;
const RIPPLE_POOL = 10;
const CONFETTI_POOL = 70;
const CONFETTI_COLORS = ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#b388ff", "#ff9a4a"];

interface Particle {
  life: number; // seconds remaining; <= 0 means free
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: number;
}

const freshPool = (n: number): Particle[] =>
  Array.from({ length: n }, () => ({
    life: 0,
    maxLife: 1,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    spin: 0,
  }));

function nextFree(pool: Particle[]) {
  let oldest = pool[0];
  for (const p of pool) {
    if (p.life <= 0) return p;
    if (p.life < oldest.life) oldest = p;
  }
  return oldest; // recycle the one closest to fading out
}

function makeNoteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♪", 32, 36);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Pooled, allocation-free transient effects. Callers fire them through the
 * imperative API; all animation happens here in one frame loop.
 */
export const StepEffects = forwardRef<StepEffectsApi>(function StepEffects(_, ref) {
  const noteTexture = useMemo(() => makeNoteTexture(), []);
  useEffect(() => () => noteTexture.dispose(), [noteTexture]);

  const notes = useRef(freshPool(NOTE_POOL));
  const ripples = useRef(freshPool(RIPPLE_POOL));
  const confetti = useRef(freshPool(CONFETTI_POOL));
  const noteSprites = useRef<(THREE.Sprite | null)[]>([]);
  const rippleMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const confettiMeshes = useRef<(THREE.Mesh | null)[]>([]);

  useImperativeHandle(ref, () => ({
    notes(x, y, z, color) {
      for (let i = 0; i < 3; i++) {
        const p = nextFree(notes.current);
        const index = notes.current.indexOf(p);
        p.maxLife = p.life = 1.1 + Math.random() * 0.4;
        p.pos.set(x + (Math.random() - 0.5) * 0.6, y + 0.3, z + (Math.random() - 0.5) * 0.6);
        p.vel.set((Math.random() - 0.5) * 0.8, 1.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4);
        const sprite = noteSprites.current[index];
        if (sprite) (sprite.material as THREE.SpriteMaterial).color.set(color);
      }
    },
    ripple(x, y, z, color) {
      const p = nextFree(ripples.current);
      const index = ripples.current.indexOf(p);
      p.maxLife = p.life = 1.4;
      p.pos.set(x, y + 0.02, z);
      const mesh = rippleMeshes.current[index];
      if (mesh) (mesh.material as THREE.MeshBasicMaterial).color.set(color);
    },
    confetti(x, y, z) {
      for (let i = 0; i < CONFETTI_POOL; i++) {
        const p = confetti.current[i];
        p.maxLife = p.life = 2.2 + Math.random() * 0.8;
        p.pos.set(x + (Math.random() - 0.5) * 1.5, y + 3 + Math.random() * 1.5, z + (Math.random() - 0.5) * 1.5);
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        p.vel.set(Math.cos(angle) * speed, 2 + Math.random() * 3, Math.sin(angle) * speed);
        p.spin = (Math.random() - 0.5) * 12;
      }
    },
  }));

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);

    notes.current.forEach((p, i) => {
      const sprite = noteSprites.current[i];
      if (!sprite) return;
      if (p.life <= 0) {
        sprite.visible = false;
        return;
      }
      p.life -= dt;
      p.vel.y -= 0.6 * dt;
      p.pos.addScaledVector(p.vel, dt);
      sprite.visible = true;
      sprite.position.copy(p.pos);
      const t = p.life / p.maxLife;
      (sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, t * 2);
      const size = 0.45 + (1 - t) * 0.15;
      sprite.scale.set(size, size, 1);
    });

    ripples.current.forEach((p, i) => {
      const mesh = rippleMeshes.current[i];
      if (!mesh) return;
      if (p.life <= 0) {
        mesh.visible = false;
        return;
      }
      p.life -= dt;
      const t = 1 - p.life / p.maxLife;
      mesh.visible = true;
      mesh.position.copy(p.pos);
      const radius = 0.4 + t * 2.6;
      mesh.scale.set(radius, radius, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.75;
    });

    confetti.current.forEach((p, i) => {
      const mesh = confettiMeshes.current[i];
      if (!mesh) return;
      if (p.life <= 0) {
        mesh.visible = false;
        return;
      }
      p.life -= dt;
      p.vel.y -= 6 * dt;
      p.vel.multiplyScalar(1 - 0.8 * dt); // air drag so pieces flutter down
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05) p.life = 0;
      mesh.visible = true;
      mesh.position.copy(p.pos);
      mesh.rotation.x += p.spin * dt;
      mesh.rotation.y += p.spin * 0.7 * dt;
    });
  });

  return (
    <group>
      {Array.from({ length: NOTE_POOL }, (_, i) => (
        <sprite
          key={`n${i}`}
          visible={false}
          ref={(el) => {
            noteSprites.current[i] = el;
          }}
        >
          <spriteMaterial map={noteTexture} transparent depthWrite={false} />
        </sprite>
      ))}
      {Array.from({ length: RIPPLE_POOL }, (_, i) => (
        <mesh
          key={`r${i}`}
          visible={false}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(el) => {
            rippleMeshes.current[i] = el;
          }}
        >
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {Array.from({ length: CONFETTI_POOL }, (_, i) => (
        <mesh
          key={`c${i}`}
          visible={false}
          ref={(el) => {
            confettiMeshes.current[i] = el;
          }}
        >
          <planeGeometry args={[0.12, 0.2]} />
          <meshBasicMaterial color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
});
