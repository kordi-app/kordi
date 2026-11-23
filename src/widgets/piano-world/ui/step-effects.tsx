"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface StepEffectsApi {
  /** ♪ notes popping up from a pressed key */
  notes: (x: number, y: number, z: number, color: string) => void;
  /** a ring of light spreading across the floor */
  ripple: (x: number, y: number, z: number, color: string) => void;
  /** a shower of confetti over a point */
  confetti: (x: number, y: number, z: number) => void;
  /** ♥ hearts floating up (petting the cat) */
  hearts: (x: number, y: number, z: number) => void;
  /** a single soft light drifting up into the sky (a sent wish) */
  lantern: (x: number, y: number, z: number) => void;
  /** puffs of dust spreading from a hard landing */
  dust: (x: number, y: number, z: number) => void;
}

const NOTE_POOL = 24;
const LANTERN_POOL = 4;
const DUST_POOL = 16;
const DUST_PER_LANDING = 8;
const RIPPLE_POOL = 10;
const FLASH_POOL = 6;
const CONFETTI_POOL = 70;
const CONFETTI_COLORS = ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#b388ff", "#ff9a4a"];

interface Particle {
  life: number; // seconds remaining; <= 0 means free
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: number;
  /** 0–1, fixed per spawn: varies wobble and timing so a burst doesn't move in lockstep */
  seed: number;
}

const freshPool = (n: number): Particle[] =>
  Array.from({ length: n }, () => ({
    life: 0,
    maxLife: 1,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    spin: 0,
    seed: 0,
  }));

function nextFree(pool: Particle[]) {
  let oldest = pool[0];
  for (const p of pool) {
    if (p.life <= 0) return p;
    if (p.life < oldest.life) oldest = p;
  }
  return oldest; // recycle the one closest to fading out
}

/**
 * A white glyph (the sprite colour tints it) over a soft dark shadow — the
 * shadow stays dark whatever the tint, so notes read on the cream floor too.
 */
function makeGlyphTexture(glyph: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 50px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(20, 14, 10, 0.45)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(glyph, 32, 34);
  return new THREE.CanvasTexture(canvas);
}

/** A ripple: a bright thin rim with a soft glow trailing inside it. */
function makeRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.08)");
  gradient.addColorStop(0.84, "rgba(255,255,255,0.35)");
  gradient.addColorStop(0.92, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** Shared by every ripple and confetti piece (one each, never per particle). */
const RIPPLE_GEOMETRY = new THREE.PlaneGeometry(2, 2);
const CONFETTI_GEOMETRY = new THREE.PlaneGeometry(0.12, 0.2);

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,240,200,0.8)");
  gradient.addColorStop(1, "rgba(255,220,150,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Pooled, allocation-free transient effects. Callers fire them through the
 * imperative API; all animation happens here in one frame loop.
 */
export const StepEffects = forwardRef<StepEffectsApi>(function StepEffects(_, ref) {
  const textures = useMemo(
    () => ({
      note: makeGlyphTexture("♪"),
      notes2: makeGlyphTexture("♫"),
      heart: makeGlyphTexture("♥"),
      glow: makeGlowTexture(),
      ring: makeRingTexture(),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(textures).forEach((t) => t.dispose());
    },
    [textures],
  );
  const noteTexture = textures.note;
  const noteGlyphs = useMemo(() => [textures.note, textures.notes2], [textures]);
  const heartGlyphs = useMemo(() => [textures.heart], [textures]);
  const lanterns = useRef(freshPool(LANTERN_POOL));
  const dust = useRef(freshPool(DUST_POOL));
  const dustSprites = useRef<(THREE.Sprite | null)[]>([]);
  const lanternSprites = useRef<(THREE.Sprite | null)[]>([]);

  /** shared by ♪ and ♥: a few glyphs popping upward, fanning out from the spot */
  const burst = (glyphs: readonly THREE.Texture[], count: number, x: number, y: number, z: number, color: string) => {
    for (let i = 0; i < count; i++) {
      const p = nextFree(notes.current);
      const index = notes.current.indexOf(p);
      p.maxLife = p.life = 1.1 + Math.random() * 0.4;
      p.seed = Math.random();
      // fan the burst: spread each glyph to its own side rather than all straight up
      const fan = count > 1 ? i / (count - 1) - 0.5 : 0;
      p.pos.set(x + fan * 0.4 + (Math.random() - 0.5) * 0.2, y + 0.3, z + (Math.random() - 0.5) * 0.4);
      p.vel.set(fan * 1.4 + (Math.random() - 0.5) * 0.3, 1.7 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4);
      p.spin = -fan * 0.6; // lean away from the centre
      const sprite = noteSprites.current[index];
      if (sprite) {
        const material = sprite.material as THREE.SpriteMaterial;
        material.map = glyphs[(i + Math.floor(p.seed * 2)) % glyphs.length];
        material.color.set(color);
        material.needsUpdate = true;
      }
    }
  };

  const notes = useRef(freshPool(NOTE_POOL));
  const ripples = useRef(freshPool(RIPPLE_POOL));
  const confetti = useRef(freshPool(CONFETTI_POOL));
  const noteSprites = useRef<(THREE.Sprite | null)[]>([]);
  const rippleMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const flashes = useRef(freshPool(FLASH_POOL));
  const flashSprites = useRef<(THREE.Sprite | null)[]>([]);
  const confettiMesh = useRef<THREE.InstancedMesh>(null);
  /** per piece: x/y/z rotation, kept outside the Particle so the pool stays one shape */
  const confettiSpin = useRef(new Float32Array(CONFETTI_POOL * 3));
  const scratch = useMemo(() => ({ dummy: new THREE.Object3D(), color: new THREE.Color() }), []);

  // confetti colours are fixed per piece: paint them once
  useLayoutEffect(() => {
    const mesh = confettiMesh.current;
    if (!mesh) return;
    for (let i = 0; i < CONFETTI_POOL; i++) {
      mesh.setColorAt(i, scratch.color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
      scratch.dummy.scale.setScalar(0);
      scratch.dummy.updateMatrix();
      mesh.setMatrixAt(i, scratch.dummy.matrix);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  }, [scratch]);

  useImperativeHandle(ref, () => ({
    notes(x, y, z, color) {
      burst(noteGlyphs, 3, x, y, z, color);
      // a quick bloom of light right where the foot came down
      const f = nextFree(flashes.current);
      const index = flashes.current.indexOf(f);
      f.maxLife = f.life = 0.28;
      f.pos.set(x, y + 0.12, z);
      const sprite = flashSprites.current[index];
      if (sprite) (sprite.material as THREE.SpriteMaterial).color.set(color);
    },
    hearts(x, y, z) {
      burst(heartGlyphs, 5, x, y + 0.4, z, "#ff6b8a");
    },
    dust(x, y, z) {
      for (let i = 0; i < DUST_PER_LANDING; i++) {
        const p = nextFree(dust.current);
        const angle = (i / DUST_PER_LANDING) * Math.PI * 2 + Math.random() * 0.4;
        p.maxLife = p.life = 0.45 + Math.random() * 0.2;
        p.pos.set(x + Math.cos(angle) * 0.35, y + 0.08, z + Math.sin(angle) * 0.35);
        p.vel.set(Math.cos(angle) * 1.6, 0.35, Math.sin(angle) * 1.6);
      }
    },
    lantern(x, y, z) {
      const p = nextFree(lanterns.current);
      p.maxLife = p.life = 7;
      p.pos.set(x, y + 1.6, z);
      p.vel.set(0, 1.1, 0);
    },
    ripple(x, y, z, color) {
      const p = nextFree(ripples.current);
      const index = ripples.current.indexOf(p);
      p.maxLife = p.life = 1.1;
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
        p.seed = Math.random();
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
      p.vel.x *= 1 - 1.8 * dt; // the fan-out eases off as they rise
      p.pos.addScaledVector(p.vel, dt);
      const age = p.maxLife - p.life;
      const t = p.life / p.maxLife;
      sprite.visible = true;
      // drift side to side as they float, like a note on the air
      sprite.position.set(p.pos.x + Math.sin(age * 5 + p.seed * 6.28) * 0.08, p.pos.y, p.pos.z);
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = Math.min(1, t * 2.2);
      material.rotation = p.spin + Math.sin(age * 4 + p.seed * 6.28) * 0.25;
      // pop: overshoot to full size in the first moment, then settle
      const pop = age < 0.18 ? (age / 0.18) * 1.25 : 1 + 0.25 * Math.exp(-(age - 0.18) * 12);
      const size = (0.42 + (1 - t) * 0.12) * pop;
      sprite.scale.set(size, size, 1);
    });

    flashes.current.forEach((p, i) => {
      const sprite = flashSprites.current[i];
      if (!sprite) return;
      if (p.life <= 0) {
        sprite.visible = false;
        return;
      }
      p.life -= dt;
      const t = 1 - Math.max(0, p.life) / p.maxLife;
      sprite.visible = true;
      sprite.position.copy(p.pos);
      (sprite.material as THREE.SpriteMaterial).opacity = (1 - t) * (1 - t) * 0.8;
      const size = 0.5 + t * 1.1;
      sprite.scale.set(size, size, 1);
    });

    dust.current.forEach((p, i) => {
      const sprite = dustSprites.current[i];
      if (!sprite) return;
      if (p.life <= 0) {
        sprite.visible = false;
        return;
      }
      p.life -= dt;
      p.vel.multiplyScalar(1 - 5 * dt); // puffs slow quickly
      p.pos.addScaledVector(p.vel, dt);
      p.pos.y += 0.25 * dt; // and curl up a little as they spread
      const t = p.life / p.maxLife;
      sprite.visible = true;
      sprite.position.copy(p.pos);
      (sprite.material as THREE.SpriteMaterial).opacity = t * 0.55;
      const size = 0.25 + (1 - t) * 0.35;
      sprite.scale.set(size, size, 1);
    });

    lanterns.current.forEach((p, i) => {
      const sprite = lanternSprites.current[i];
      if (!sprite) return;
      if (p.life <= 0) {
        sprite.visible = false;
        return;
      }
      p.life -= dt;
      p.pos.y += p.vel.y * dt;
      p.pos.x += Math.sin(p.life * 1.7) * 0.25 * dt; // gentle sway
      sprite.visible = true;
      sprite.position.copy(p.pos);
      const t = p.life / p.maxLife;
      (sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, t * 3);
      const size = 0.9 + Math.sin(p.life * 6) * 0.08;
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
      // fast out, slow settle: the ring snaps outward and eases to its full size
      const eased = 1 - (1 - t) ** 3;
      const radius = 0.35 + eased * 2.2;
      mesh.scale.set(radius, radius, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) ** 1.5 * 0.85;
    });

    const confettiInstances = confettiMesh.current;
    if (confettiInstances) {
      const { dummy } = scratch;
      const spin = confettiSpin.current;
      let changed = false;
      let alive = false;
      confetti.current.forEach((p, i) => {
        if (p.life <= 0) {
          if (p.maxLife > 0) {
            // just finished: collapse it once, then leave it alone
            p.maxLife = 0;
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            confettiInstances.setMatrixAt(i, dummy.matrix);
            changed = true;
          }
          return;
        }
        alive = true;
        p.life -= dt;
        p.vel.y -= 6 * dt;
        p.vel.multiplyScalar(1 - 0.8 * dt); // air drag so pieces flutter down
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y < 0.05) p.life = 0;
        spin[i * 3] += p.spin * dt;
        spin[i * 3 + 1] += p.spin * 0.7 * dt;
        spin[i * 3 + 2] += p.spin * 0.3 * dt;
        // falling pieces swing side to side like real paper
        const swing = p.vel.y < 0 ? Math.sin((p.maxLife - p.life) * 7 + p.seed * 6.28) * 0.6 * dt : 0;
        p.pos.x += swing;
        dummy.position.copy(p.pos);
        dummy.rotation.set(spin[i * 3], spin[i * 3 + 1], spin[i * 3 + 2]);
        // shrink away in the last half-second instead of popping out
        dummy.scale.setScalar(Math.min(1, Math.max(0, p.life) * 2));
        dummy.updateMatrix();
        confettiInstances.setMatrixAt(i, dummy.matrix);
        changed = true;
      });
      if (changed) confettiInstances.instanceMatrix.needsUpdate = true;
      confettiInstances.visible = alive; // no draw call at all between showers
    }
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
      {Array.from({ length: DUST_POOL }, (_, i) => (
        <sprite
          key={`d${i}`}
          visible={false}
          ref={(el) => {
            dustSprites.current[i] = el;
          }}
        >
          <spriteMaterial map={textures.glow} color="#cfc6b6" transparent depthWrite={false} />
        </sprite>
      ))}
      {Array.from({ length: LANTERN_POOL }, (_, i) => (
        <sprite
          key={`l${i}`}
          visible={false}
          ref={(el) => {
            lanternSprites.current[i] = el;
          }}
        >
          <spriteMaterial map={textures.glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
      {Array.from({ length: RIPPLE_POOL }, (_, i) => (
        <mesh
          key={`r${i}`}
          visible={false}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={RIPPLE_GEOMETRY}
          ref={(el) => {
            rippleMeshes.current[i] = el;
          }}
        >
          <meshBasicMaterial map={textures.ring} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: FLASH_POOL }, (_, i) => (
        <sprite
          key={`f${i}`}
          visible={false}
          ref={(el) => {
            flashSprites.current[i] = el;
          }}
        >
          <spriteMaterial map={textures.glow} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {/* all the confetti in one draw call; idle pieces are scaled to nothing */}
      <instancedMesh ref={confettiMesh} args={[CONFETTI_GEOMETRY, undefined, CONFETTI_POOL]} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
});
