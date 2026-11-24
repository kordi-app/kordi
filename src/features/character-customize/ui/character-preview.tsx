"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { Appearance, KordiMotion } from "@/entities/character";
import { KordiModel } from "@/entities/character/three";

const IDLE: KordiMotion = { phase: 0, amount: 0, emote: null, land: 0, stretch: 0, lean: 0, bank: 0 };

/** Kordi turning slowly on a little stage; drag sideways to spin. */
function Turntable({ appearance, spin }: { appearance: Appearance; spin: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<KordiMotion>({ ...IDLE });
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(performance.now() / 2400) * 0.5 + spin.current;
    motion.current.phase += dt * 1.5; // a gentle idle bob
    motion.current.amount = 0.12;
  });
  return (
    <group ref={group}>
      <KordiModel motion={motion} appearance={appearance} />
    </group>
  );
}

export function CharacterPreview({ appearance }: { appearance: Appearance }) {
  const spin = useRef(0);
  const drag = useRef<number | null>(null);
  return (
    <div
      className="aspect-square w-full cursor-grab touch-none select-none rounded-2xl border border-border bg-muted/40 active:cursor-grabbing"
      onPointerDown={(e) => {
        drag.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        spin.current += (e.clientX - drag.current) * 0.012;
        drag.current = e.clientX;
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.05, 3.1], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0.72, 0)}>
        <hemisphereLight args={["#ffffff", "#e8dfd0", 1.6]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2} castShadow />
        <Turntable appearance={appearance} spin={spin} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.9, 48]} />
          <meshStandardMaterial color="#e9e2d6" roughness={1} />
        </mesh>
      </Canvas>
    </div>
  );
}
