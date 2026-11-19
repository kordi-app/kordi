"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import {
  ensureAudioStarted,
  getSampler,
  playNoteOff,
  playNoteOn,
} from "@/shared/lib/audio";
import { midiToNoteName } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";
import { BOUNDS, CASE_H, PRESS_DEPTH, keyAt } from "../model/layout";
import { KordiModel, type KordiMotion } from "./kordi-model";
import { PianoFloor } from "./piano-floor";

type Direction = "up" | "down" | "left" | "right";
type InputState = Record<Direction, boolean>;

const SPEED = 4.2;
const CAMERA_OFFSET = new THREE.Vector3(0, 7, 8.5);
const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

export interface PianoWorldCopy {
  title: string;
  hint: string;
  soundOff: string;
  soundLoading: string;
  soundOn: string;
}

type AudioState = "off" | "loading" | "on";

/** Shortest-path angle interpolation, so turning never spins the long way round. */
function lerpAngle(from: number, to: number, t: number) {
  const delta = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return from + delta * t;
}

function World({
  input,
  onKeyChange,
}: {
  input: React.RefObject<InputState>;
  onKeyChange: (midi: number | null) => void;
}) {
  const kordi = useRef<THREE.Group>(null);
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0 });
  const sim = useRef({
    pos: new THREE.Vector3(0, CASE_H, 3.6),
    heading: 0, // face the camera on arrival
    current: null as number | null,
  });
  const lookTarget = useRef(new THREE.Vector3());
  const [pressed, setPressed] = useState<number | null>(null);
  const camera = useThree((state) => state.camera);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = sim.current;
    const keys = input.current;

    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const moving = dx !== 0 || dz !== 0;

    if (moving) {
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      s.pos.x = THREE.MathUtils.clamp(s.pos.x + dx * SPEED * dt, -BOUNDS.x, BOUNDS.x);
      s.pos.z = THREE.MathUtils.clamp(s.pos.z + dz * SPEED * dt, BOUNDS.zMin, BOUNDS.zMax);
      s.heading = lerpAngle(s.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 12));
    }

    const m = motion.current;
    m.amount = THREE.MathUtils.lerp(m.amount, moving ? 1 : 0, 1 - Math.exp(-dt * 10));
    m.phase += dt * 11 * m.amount;

    // Which key is underfoot decides both the sound and the standing height
    const key = keyAt(s.pos.x, s.pos.z);
    const midi = key?.midi ?? null;
    if (midi !== s.current) {
      s.current = midi;
      setPressed(midi);
      onKeyChange(midi);
    }
    const surface = key ? CASE_H + key.height - PRESS_DEPTH : 0;
    s.pos.y = THREE.MathUtils.lerp(s.pos.y, surface, 1 - Math.exp(-dt * 18));

    if (kordi.current) {
      kordi.current.position.copy(s.pos);
      kordi.current.rotation.y = s.heading;
    }

    const follow = 1 - Math.exp(-dt * 4);
    camera.position.lerp(
      new THREE.Vector3().copy(s.pos).setY(0).add(CAMERA_OFFSET),
      follow,
    );
    lookTarget.current.lerp(new THREE.Vector3(s.pos.x, 0.6, s.pos.z - 1.2), follow);
    camera.lookAt(lookTarget.current);
  });

  return (
    <>
      <PianoFloor pressed={pressed} />
      {/* scaled up so the character reads at a glance against the giant keys */}
      <KordiModel ref={kordi} motion={motion} scale={1.6} />
    </>
  );
}

function DirectionButton({
  direction,
  onPress,
  className,
  children,
}: {
  direction: Direction;
  onPress: (direction: Direction, pressed: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const set = (pressed: boolean) => onPress(direction, pressed);
  return (
    <button
      type="button"
      aria-label={direction}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "flex size-12 touch-none select-none items-center justify-center rounded-xl border border-border bg-card/90 text-foreground shadow-sm active:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Kordi walking on a giant keyboard: arrow keys / WASD (or the on-screen pad
 * on touch screens) move the character, and the key underfoot sounds.
 */
export default function PianoWorldScene({ copy }: { copy: PianoWorldCopy }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const input = useRef<InputState>({ up: false, down: false, left: false, right: false });
  // Assume visible until the observer reports otherwise, so the first frame always draws
  const visibleRef = useRef(true);
  const [visible, setVisible] = useState(true);
  const [note, setNote] = useState<number | null>(null);
  const [audio, setAudio] = useState<AudioState>("off");
  const audioRef = useRef<AudioState>("off");
  const soundingRef = useRef<number | null>(null);

  // Browsers only allow audio after a user gesture — the first key or tap starts it
  const startAudio = useCallback(() => {
    if (audioRef.current !== "off") return;
    audioRef.current = "loading";
    setAudio("loading");
    ensureAudioStarted()
      .then(getSampler)
      .then(() => {
        audioRef.current = "on";
        setAudio("on");
      })
      .catch(() => {
        audioRef.current = "off";
        setAudio("off");
      });
  }, []);

  const handlePadPress = useCallback(
    (direction: Direction, pressed: boolean) => {
      input.current[direction] = pressed;
      if (pressed) startAudio();
    },
    [startAudio],
  );

  const handleKeyChange = useCallback((midi: number | null) => {
    setNote(midi);
    if (soundingRef.current !== null) playNoteOff(soundingRef.current);
    soundingRef.current = midi;
    if (midi !== null && audioRef.current === "on") playNoteOn(midi, 0.75);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.intersectionRatio > 0.4;
        setVisible(entry.isIntersecting);
      },
      { threshold: [0, 0.4] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    const onKeyDown = (e: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[e.code];
      if (!direction || !visibleRef.current || isTyping(e.target) || e.metaKey || e.ctrlKey) return;
      e.preventDefault(); // arrows would otherwise scroll the page
      input.current[direction] = true;
      startAudio();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[e.code];
      if (direction) input.current[direction] = false;
    };
    const releaseAll = () => {
      input.current = { up: false, down: false, left: false, right: false };
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
    };
  }, [startAudio]);

  // Silence the last note when leaving the page
  useEffect(
    () => () => {
      if (soundingRef.current !== null) playNoteOff(soundingRef.current);
    },
    [],
  );

  const audioLabel =
    audio === "on" ? copy.soundOn : audio === "loading" ? copy.soundLoading : copy.soundOff;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onPointerDown={startAudio}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 7, 12], fov: 42, near: 0.1, far: 100 }}
      >
        <color attach="background" args={["#fcfbf8"]} />
        <fog attach="fog" args={["#fcfbf8", 18, 38]} />
        <hemisphereLight args={["#ffffff", "#e8dfd0", 1.9]} />
        <directionalLight
          position={[6, 12, 6]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.0005}
        />
        <World input={input} onKeyChange={handleKeyChange} />
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 md:p-6">
        <div className="max-w-sm">
          <h1 className="text-[22px] font-semibold leading-tight -tracking-[0.02em] text-foreground md:text-headline-lg">
            {copy.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{copy.hint}</p>
        </div>
        <div
          aria-live="polite"
          className={cn(
            "min-w-16 rounded-xl border border-border bg-card/90 px-4 py-2 text-center text-3xl font-semibold tabular-nums text-foreground shadow-sm transition-opacity",
            note === null && "opacity-0",
          )}
        >
          {note !== null ? midiToNoteName(note) : "–"}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground md:bottom-5 md:left-6">
        <span
          className={cn(
            "size-1.5 rounded-full",
            audio === "on" ? "bg-success" : "bg-foreground/25",
          )}
        />
        {audioLabel}
      </div>

      {/* touch pad */}
      <div className="absolute bottom-4 right-4 hidden grid-cols-3 gap-1.5 pointer-coarse:grid">
        <span />
        <DirectionButton direction="up" onPress={handlePadPress}>
          <ArrowUp className="size-5" />
        </DirectionButton>
        <span />
        <DirectionButton direction="left" onPress={handlePadPress}>
          <ArrowLeft className="size-5" />
        </DirectionButton>
        <DirectionButton direction="down" onPress={handlePadPress}>
          <ArrowDown className="size-5" />
        </DirectionButton>
        <DirectionButton direction="right" onPress={handlePadPress}>
          <ArrowRight className="size-5" />
        </DirectionButton>
      </div>
    </div>
  );
}
