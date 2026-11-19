"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsUp } from "lucide-react";
import {
  ensureAudioStarted,
  getSampler,
  playNoteOff,
  playNoteOn,
} from "@/shared/lib/audio";
import { midiToNoteName } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";
import { BOUNDS, CASE_H, PRESS_DEPTH, SPAWN, keyAt } from "../model/layout";
import {
  useWorldPresence,
  type PresenceInfo,
  type RemotePlayer,
} from "../model/use-world-presence";
import { KordiModel, type KordiMotion } from "./kordi-model";
import { PianoFloor } from "./piano-floor";
import { RemoteKordi } from "./remote-kordi";

type Direction = "up" | "down" | "left" | "right";
type InputState = Record<Direction, boolean> & {
  /** set on Space / jump button; consumed by the next frame on the ground */
  jump: boolean;
};

const JUMP_SPEED = 7.5;
const GRAVITY = 22;

const SPEED = 4.2;
const CAMERA_OFFSET = new THREE.Vector3(0, 12, 14);
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
  soundOff: string;
  soundLoading: string;
  soundOn: string;
  /** "{channel}" and "{count}" are filled in */
  channel: string;
  online: string;
  connecting: string;
  full: string;
  offline: string;
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
  remotes,
  others,
  sendPosition,
  onRemoteNote,
  takeJump,
}: {
  input: React.RefObject<InputState>;
  /** true once per jump press (reads and clears it) */
  takeJump: () => boolean;
  onKeyChange: (midi: number | null) => void;
  remotes: React.RefObject<Map<string, RemotePlayer>>;
  others: { id: string; name: string }[];
  sendPosition: (x: number, z: number, h: number, m: number | null) => void;
  onRemoteNote: (id: string, midi: number | null) => void;
}) {
  const kordi = useRef<THREE.Group>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0 });
  const sim = useRef({
    pos: new THREE.Vector3(SPAWN.x, CASE_H, SPAWN.z),
    heading: 0, // face the camera on arrival
    current: null as number | null,
    vy: 0,
    airborne: false,
  });
  const lookTarget = useRef(new THREE.Vector3(SPAWN.x, 0.6, SPAWN.z - 1.2));
  const remoteNotes = useRef(new Map<string, number | null>());
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set());
  const pressedKey = useRef("");
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

    const key = keyAt(s.pos.x, s.pos.z);
    const surface = key ? CASE_H + key.height - PRESS_DEPTH : 0;

    if (takeJump()) {
      if (!s.airborne) {
        s.airborne = true;
        s.vy = JUMP_SPEED;
      }
    }
    if (s.airborne) {
      s.vy -= GRAVITY * dt;
      s.pos.y += s.vy * dt;
      if (s.vy < 0 && s.pos.y <= surface) {
        s.pos.y = surface; // landing re-strikes the key below
        s.airborne = false;
        s.vy = 0;
      }
    } else {
      s.pos.y = THREE.MathUtils.lerp(s.pos.y, surface, 1 - Math.exp(-dt * 18));
    }

    // The key underfoot sounds — nothing is pressed while in the air
    const midi = s.airborne ? null : (key?.midi ?? null);
    if (midi !== s.current) {
      s.current = midi;
      onKeyChange(midi);
    }
    sendPosition(s.pos.x, s.pos.z, s.heading, midi);

    // Keys held down by me and by everyone else in the channel
    const down = new Set<number>();
    if (midi !== null) down.add(midi);
    for (const remote of remotes.current.values()) {
      if (remote.m !== null) down.add(remote.m);
      if (remoteNotes.current.get(remote.id) !== remote.m) {
        remoteNotes.current.set(remote.id, remote.m);
        onRemoteNote(remote.id, remote.m);
      }
    }
    for (const id of remoteNotes.current.keys()) {
      if (!remotes.current.has(id)) {
        remoteNotes.current.delete(id);
        onRemoteNote(id, null);
      }
    }
    const signature = [...down].sort((a, b) => a - b).join(",");
    if (signature !== pressedKey.current) {
      pressedKey.current = signature;
      setPressed(down);
    }

    if (kordi.current) {
      kordi.current.position.copy(s.pos);
      kordi.current.rotation.y = s.heading;
    }

    // The keyboard is 52 keys wide: the sun travels with Kordi so shadows stay crisp nearby
    if (light.current) {
      light.current.position.set(s.pos.x + 6, 12, s.pos.z + 6);
      light.current.target.position.set(s.pos.x, 0, s.pos.z);
      light.current.target.updateMatrixWorld();
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
      <directionalLight
        ref={light}
        position={[SPAWN.x + 6, 12, SPAWN.z + 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0005}
      />
      <PianoFloor pressed={pressed} />
      {/* scaled up so the character reads at a glance against the giant keys */}
      <KordiModel ref={kordi} motion={motion} scale={1.6} />
      {others.map((other) => (
        <RemoteKordi key={other.id} id={other.id} name={other.name} remotes={remotes} />
      ))}
    </>
  );
}

const MAX_LISTED = 8;

/** Who else is here: channel, people in it, and everyone online. */
function PresencePanel({ info, copy }: { info: PresenceInfo; copy: PianoWorldCopy }) {
  if (info.status !== "online") {
    const label =
      info.status === "full" ? copy.full : info.status === "offline" ? copy.offline : copy.connecting;
    return (
      <div className="rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground">
        {label}
      </div>
    );
  }
  const listed = info.others.slice(0, MAX_LISTED);
  const hidden = info.others.length - listed.length;
  return (
    <div className="max-w-64 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs shadow-sm">
      <div className="flex items-center gap-2 text-foreground">
        <span className="size-1.5 rounded-full bg-success" />
        <span className="font-medium">
          {copy.channel.replace("{channel}", String(info.channel ?? ""))}
        </span>
        <span className="text-muted-foreground">
          {copy.online.replace("{count}", info.online.toLocaleString())}
        </span>
      </div>
      {listed.length > 0 ? (
        <p className="mt-1 truncate text-muted-foreground">
          {listed.map((p) => p.name).join(", ")}
          {hidden > 0 ? ` +${hidden}` : ""}
        </p>
      ) : null}
    </div>
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
export default function PianoWorldScene({
  copy,
  playerName,
}: {
  copy: PianoWorldCopy;
  playerName: string;
}) {
  const { remotes, info, sendPosition } = useWorldPresence(playerName);
  const containerRef = useRef<HTMLDivElement>(null);
  const input = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
  });
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

  const takeJump = useCallback(() => {
    const requested = input.current.jump;
    input.current.jump = false;
    return requested;
  }, []);

  // Other people's footsteps play too, quieter than your own
  const remoteSounding = useRef(new Map<string, number>());
  const handleRemoteNote = useCallback((id: string, midi: number | null) => {
    const previous = remoteSounding.current.get(id);
    if (previous !== undefined) playNoteOff(previous);
    remoteSounding.current.delete(id);
    if (midi !== null && audioRef.current === "on") {
      playNoteOn(midi, 0.35);
      remoteSounding.current.set(id, midi);
    }
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
      if (e.code === "Space" && visibleRef.current && !isTyping(e.target)) {
        e.preventDefault(); // Space would otherwise scroll the page
        if (!e.repeat) input.current.jump = true;
        startAudio();
        return;
      }
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
      input.current = { up: false, down: false, left: false, right: false, jump: false };
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
      for (const midi of remoteSounding.current.values()) playNoteOff(midi);
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
        camera={{ position: [0, 12, 18], fov: 45, near: 0.1, far: 150 }}
      >
        <color attach="background" args={["#fcfbf8"]} />
        <fog attach="fog" args={["#fcfbf8", 30, 60]} />
        <hemisphereLight args={["#ffffff", "#e8dfd0", 1.9]} />
        <World
          input={input}
          onKeyChange={handleKeyChange}
          remotes={remotes}
          others={info.others}
          sendPosition={sendPosition}
          onRemoteNote={handleRemoteNote}
          takeJump={takeJump}
        />
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute right-0 top-0 p-5 md:p-6">
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

      <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-start gap-2 md:bottom-5 md:left-6">
        <PresencePanel info={info} copy={copy} />
      <div className="flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground">
        <span
          className={cn(
            "size-1.5 rounded-full",
            audio === "on" ? "bg-success" : "bg-foreground/25",
          )}
        />
        {audioLabel}
      </div>
      </div>

      {/* touch controls */}
      <button
        type="button"
        aria-label="jump"
        onPointerDown={() => {
          input.current.jump = true;
          startAudio();
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute bottom-6 right-48 hidden size-14 touch-none select-none items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm active:bg-muted pointer-coarse:flex"
      >
        <ChevronsUp className="size-6" />
      </button>
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
