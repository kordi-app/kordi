"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsUp } from "lucide-react";
import {
  disposeSampler,
  ensureAudioStarted,
  getCurrentInstrumentId,
  loadInstrument,
  playNoteOff,
  playNoteOn,
  type InstrumentId,
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
import { Portal } from "./portal";
import { ChordCardStand, DiscoBall, Jukebox, MusicBox, PianoCat, Teacher } from "./world-props";
import { EmoteBubble } from "./emote-bubble";
import {
  EMOTES,
  EMOTE_ICON,
  EMOTE_SECONDS,
  interactablesIn,
  type EmoteId,
  type InteractableId,
} from "../model/interactables";
import { CHORD_CARD_COUNT, chordCard, type ChordCard, type ChordCardKey } from "../model/chord-cards";
import { FUR_ELISE, MUSIC_BOX, playSequence } from "../model/sequencer";
import { ChordCardPanel, WishPanel } from "./interaction-panels";
import { CourseScene } from "./course-scene";
import {
  COURSE,
  COURSE_BOUNDS,
  GOAL_INDEX,
  courseBlocked,
  courseCeiling,
  courseGround,
} from "../model/course";
import { StepEffects, type StepEffectsApi } from "./step-effects";
import { TargetBeam } from "./target-beam";
import { MELODIES } from "../model/melodies";
import { seventhChordOn } from "../model/harmony";
import { RegionDecor } from "./region-decor";
import {
  PORTAL_RADIUS,
  REGIONS,
  arrivalPoint,
  isRegionId,
  type RegionDef,
  type RegionId,
} from "../model/regions";

type Direction = "up" | "down" | "left" | "right";
type InputState = Record<Direction, boolean> & {
  /** set on Space / jump button; consumed by the next frame on the ground */
  jump: boolean;
};

const JUMP_SPEED = 7.5;
const GRAVITY = 22;

const SPEED = 4.2;
/** Below this, an unsupported player starts to fall rather than glide down. */
const FALL_THRESHOLD = 0.4;

interface Ground {
  height: number;
  /** note to sound, if standing on something playable */
  midi: number | null;
  black: boolean;
  /** course platform index, for progress tracking */
  platform: number | null;
}

/** What's underfoot in this region at (x, z), given the current height. */
function groundAt(region: RegionDef, x: number, z: number, y: number): Ground {
  if (region.feature === "course") {
    const hit = courseGround(x, z, y);
    return {
      height: hit.height,
      midi: hit.index === null ? null : COURSE[hit.index].midi,
      black: hit.index !== null && COURSE[hit.index].kind === "black",
      platform: hit.index,
    };
  }
  const key = keyAt(x, z);
  return {
    height: key ? CASE_H + key.height - PRESS_DEPTH : 0,
    midi: key?.midi ?? null,
    black: key?.black ?? false,
    platform: null,
  };
}
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

/** Overlay panels opened by interactables */
type Panel = { kind: "chordCard"; card: ChordCard } | { kind: "wish" };

export interface PianoWorldCopy {
  nameLabel: string;
  nameReroll: string;
  nameAdjectives: string[];
  nameNouns: string[];
  emotes: Record<EmoteId, string>;
  interact: Record<InteractableId | "jukeboxStop", string>;
  catReactions: string[];
  teacherTips: string[];
  cards: Record<ChordCardKey, string>;
  cardTitle: string;
  cardPlay: string;
  close: string;
  wishTitle: string;
  wishPlaceholder: string;
  wishNote: string;
  wishSend: string;
  wishSent: string;
  jukeboxNowPlaying: string;
  regions: Record<RegionId, string>;
  melodies: Record<(typeof MELODIES)[number]["key"], string>;
  melodyNext: string;
  melodyHint: string;
  melodyDone: string;
  melodyNextSong: string;
  courseTitle: string;
  courseHint: string;
  courseBest: string;
  courseDone: string;
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

/** Where to put the player on entering a region. A fresh object per entry. */
interface Arrival {
  x: number;
  z: number;
}

const FADE_MS = 260;

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
  region,
  arrival,
  onPortal,
  targetMidi,
  celebrate,
  onPlatform,
  crowned,
  emote,
  onEmoteCancel,
  onNearby,
  hearts,
  lantern,
  petting,
  party,
  musicBoxPlaying,
  jukeboxPlaying,
  onCatKey,
}: {
  emote: EmoteId | null;
  /** moving ends an emote */
  onEmoteCancel: () => void;
  /** the interactable now in reach (null when none) */
  onNearby: (id: InteractableId | null) => void;
  /** bump to fire hearts over the cat / a lantern from the music box */
  hearts: number;
  lantern: number;
  petting: boolean;
  party: boolean;
  musicBoxPlaying: boolean;
  jukeboxPlaying: boolean;
  /** the key the cat is on, only reported while it's within earshot */
  onCatKey: (midi: number | null) => void;
  /** course: the platform now underfoot (null = cloud floor / not a course) */
  onPlatform: (index: number | null) => void;
  /** finished the hidden course at least once */
  crowned: boolean;
  /** melody game: the key to step on next */
  targetMidi: number | null;
  /** bump to fire confetti over Kordi */
  celebrate: number;
  input: React.RefObject<InputState>;
  region: RegionDef;
  /** Changes identity on every region entry; the player is placed here */
  arrival: Arrival;
  onPortal: (to: RegionId) => void;
  /** true once per jump press (reads and clears it) */
  takeJump: () => boolean;
  onKeyChange: (midi: number | null) => void;
  remotes: React.RefObject<Map<string, RemotePlayer>>;
  others: { id: string; name: string }[];
  sendPosition: (
    x: number,
    y: number,
    z: number,
    h: number,
    m: number | null,
    e: EmoteId | null,
  ) => void;
  onRemoteNote: (id: string, midi: number | null) => void;
}) {
  const kordi = useRef<THREE.Group>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0, emote: null });
  const sim = useRef({
    pos: new THREE.Vector3(SPAWN.x, CASE_H, SPAWN.z),
    heading: 0, // face the camera on arrival
    current: null as number | null,
    vy: 0,
    airborne: false,
    platform: null as number | null,
  });
  const cameraOffset = useMemo(() => new THREE.Vector3(...region.camera), [region]);
  const lookTarget = useRef(new THREE.Vector3(SPAWN.x, 0.6, SPAWN.z - 1.2));
  const remoteNotes = useRef(new Map<string, number | null>());
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set());
  const pressedKey = useRef("");
  const camera = useThree((state) => state.camera);
  /** Portals only fire after you've stepped clear of every portal once (no ping-pong on arrival). */
  const portalArmed = useRef(false);
  const placedFor = useRef<Arrival | null>(null);
  const fx = useRef<StepEffectsApi>(null);
  const celebrated = useRef(celebrate);
  const fired = useRef({ hearts, lantern });
  const catPos = useRef(new THREE.Vector3(SPAWN.x, 0, 1.2));
  const catKey = useRef<number | null>(null);
  const catHeard = useRef<number | null>(null);
  const nearby = useRef<InteractableId | null>(null);
  const bubble = useRef<THREE.Group>(null);
  const items = useMemo(() => interactablesIn(region.id), [region]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = sim.current;
    const keys = input.current;

    if (placedFor.current !== arrival) {
      placedFor.current = arrival;
      s.pos.set(arrival.x, groundAt(region, arrival.x, arrival.z, 0).height, arrival.z);
      s.heading = 0;
      s.vy = 0;
      s.airborne = false;
      portalArmed.current = false;
      // Cut, don't glide, to the new spot — the screen is faded out meanwhile
      camera.position.copy(s.pos).add(cameraOffset);
      lookTarget.current.set(s.pos.x, s.pos.y + 0.6, s.pos.z - 1.2);
    }

    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const moving = dx !== 0 || dz !== 0;

    if (moving) {
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      const course = region.feature === "course";
      const bounds = course ? COURSE_BOUNDS : BOUNDS;
      const nextX = THREE.MathUtils.clamp(s.pos.x + dx * SPEED * dt, -bounds.x, bounds.x);
      const nextZ = THREE.MathUtils.clamp(s.pos.z + dz * SPEED * dt, bounds.zMin, bounds.zMax);
      // Course steps are solid: resolve each axis separately so you slide
      // along a step's side instead of sticking to it
      if (!course || !courseBlocked(nextX, s.pos.z, s.pos.y)) s.pos.x = nextX;
      if (!course || !courseBlocked(s.pos.x, nextZ, s.pos.y)) s.pos.z = nextZ;
      s.heading = lerpAngle(s.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 12));
    }

    const m = motion.current;
    m.amount = THREE.MathUtils.lerp(m.amount, moving ? 1 : 0, 1 - Math.exp(-dt * 10));
    m.phase += dt * 11 * m.amount;
    m.emote = emote;
    if (emote && moving) onEmoteCancel();

    const ground = groundAt(region, s.pos.x, s.pos.z, s.pos.y);
    const surface = ground.height;

    if (takeJump()) {
      if (!s.airborne) {
        s.airborne = true;
        s.vy = JUMP_SPEED;
      }
    }
    if (s.airborne) {
      s.vy -= GRAVITY * dt;
      const nextY = s.pos.y + s.vy * dt;
      const ceiling =
        region.feature === "course" && s.vy > 0
          ? courseCeiling(s.pos.x, s.pos.z, s.pos.y, nextY)
          : null;
      if (ceiling !== null) {
        s.pos.y = ceiling; // bonk: head hit a step's underside
        s.vy = 0;
      } else {
        s.pos.y = nextY;
      }
      if (s.vy < 0 && s.pos.y <= surface) {
        s.pos.y = surface; // landing re-strikes the key below
        s.airborne = false;
        s.vy = 0;
      }
    } else if (s.pos.y - surface > FALL_THRESHOLD) {
      // walked off a ledge
      s.airborne = true;
      s.vy = 0;
    } else {
      s.pos.y = THREE.MathUtils.lerp(s.pos.y, surface, 1 - Math.exp(-dt * 18));
    }

    // The key underfoot sounds — nothing is pressed while in the air
    const midi = s.airborne ? null : ground.midi;
    if (!s.airborne && ground.platform !== s.platform) {
      s.platform = ground.platform;
      onPlatform(ground.platform);
    }
    if (midi !== s.current) {
      s.current = midi;
      onKeyChange(midi);
      if (midi !== null) {
        const accent = region.theme.accent;
        fx.current?.notes(s.pos.x, s.pos.y, s.pos.z, accent);
        if (region.feature === "echo") fx.current?.ripple(s.pos.x, s.pos.y, s.pos.z, accent);
        // Neon: black keys are springs
        if (region.feature === "springs" && ground.black) {
          s.airborne = true;
          s.vy = JUMP_SPEED * 1.75;
        }
      }
    }
    if (celebrated.current !== celebrate) {
      celebrated.current = celebrate;
      fx.current?.confetti(s.pos.x, s.pos.y, s.pos.z);
    }
    sendPosition(s.pos.x, s.pos.y, s.pos.z, s.heading, midi, emote);

    // What's within reach? (the cat wanders, so its spot is live)
    let closest: InteractableId | null = null;
    let closestDistance = Infinity;
    for (const item of items) {
      const at = item.id === "cat" ? catPos.current : item;
      const distance = Math.hypot(s.pos.x - at.x, s.pos.z - at.z);
      if (distance < item.radius && distance < closestDistance) {
        closest = item.id;
        closestDistance = distance;
      }
    }
    if (closest !== nearby.current) {
      nearby.current = closest;
      onNearby(closest);
    }

    // The cat's footsteps are only heard when you're near it
    const catNear =
      region.id === "hall" && Math.hypot(s.pos.x - catPos.current.x, s.pos.z - catPos.current.z) < 9;
    const heard = catNear ? catKey.current : null;
    if (heard !== catHeard.current) {
      catHeard.current = heard;
      onCatKey(heard);
    }

    if (fired.current.hearts !== hearts) {
      fired.current.hearts = hearts;
      fx.current?.hearts(catPos.current.x, catPos.current.y + 0.6, catPos.current.z);
    }
    if (fired.current.lantern !== lantern) {
      fired.current.lantern = lantern;
      const box = itemById.get("musicBox");
      if (box) fx.current?.lantern(box.x, 0, box.z);
    }
    if (bubble.current) bubble.current.position.set(s.pos.x, s.pos.y + 2.75, s.pos.z);

    const inside = region.portals.find(
      (portal) =>
        Math.hypot(s.pos.x - portal.x, s.pos.z - portal.z) < PORTAL_RADIUS &&
        Math.abs(s.pos.y - (portal.y ?? 0)) < 1.2,
    );
    if (!inside) {
      portalArmed.current = true;
    } else if (portalArmed.current && !s.airborne) {
      portalArmed.current = false;
      onPortal(inside.to);
    }

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
      light.current.position.set(s.pos.x + 6, s.pos.y + 12, s.pos.z + 6);
      light.current.target.position.set(s.pos.x, s.pos.y, s.pos.z);
      light.current.target.updateMatrixWorld();
    }

    const follow = 1 - Math.exp(-dt * 4);
    // Keyboard regions keep the camera level (jumps don't bob the view);
    // the course climbs, so the camera climbs with you
    const cameraY = region.feature === "course" ? s.pos.y : 0;
    camera.position.lerp(
      new THREE.Vector3(s.pos.x, cameraY, s.pos.z).add(cameraOffset),
      follow,
    );
    lookTarget.current.lerp(new THREE.Vector3(s.pos.x, cameraY + 0.6, s.pos.z - 1.2), follow);
    camera.lookAt(lookTarget.current);
  });

  return (
    <>
      <directionalLight
        ref={light}
        position={[SPAWN.x + 6, 12, SPAWN.z + 6]}
        intensity={region.theme.sun}
        color={region.theme.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0005}
      />
      <hemisphereLight args={[region.theme.sky, region.theme.ground, region.theme.ambient]} />
      {region.feature === "course" ? (
        <CourseScene pressed={pressed} />
      ) : (
        <PianoFloor pressed={pressed} theme={region.theme} />
      )}
      <RegionDecor region={region.id} party={party} />
      {items.map((item) => {
        switch (item.id) {
          case "cat":
            return (
              <PianoCat
                key={item.id}
                petting={petting}
                onKey={(midi) => {
                  catKey.current = midi;
                }}
                onPosition={(position) => catPos.current.copy(position)}
              />
            );
          case "chordCard":
            return <ChordCardStand key={item.id} item={item} />;
          case "teacher":
            return <Teacher key={item.id} item={item} />;
          case "musicBox":
            return <MusicBox key={item.id} item={item} playing={musicBoxPlaying} />;
          case "jukebox":
            return <Jukebox key={item.id} item={item} playing={jukeboxPlaying} />;
          case "discoBall":
            return <DiscoBall key={item.id} item={item} party={party} />;
        }
      })}
      <group ref={bubble}>{emote ? <EmoteBubble emote={emote} /> : null}</group>
      {region.portals.map((portal) => (
        <Portal key={`${portal.to}-${portal.x}`} portal={portal} glow={region.theme.dark} />
      ))}
      {targetMidi !== null ? <TargetBeam midi={targetMidi} color={region.theme.accent} /> : null}
      <StepEffects ref={fx} />
      {/* scaled up so the character reads at a glance against the giant keys */}
      <KordiModel ref={kordi} motion={motion} scale={1.6} crown={crowned} />
      {others.map((other) => (
        <RemoteKordi
          key={other.id}
          id={other.id}
          name={other.name}
          remotes={remotes}
          course={region.feature === "course"}
        />
      ))}
    </>
  );
}

interface CourseRun {
  /** performance.now() when the climb began; null when not climbing */
  startedAt: number | null;
  /** highest platform index reached this attempt */
  reached: number;
  /** time of the run that just finished */
  finishedMs: number | null;
  best: number | null;
}

const COURSE_BEST_KEY = "kordi.world.course-best.v1";

/** Best time lives only in this browser; storage can be unavailable, so never throw. */
function readCourseBest(): number | null {
  try {
    const raw = window.localStorage.getItem(COURSE_BEST_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeCourseBest(ms: number) {
  try {
    window.localStorage.setItem(COURSE_BEST_KEY, String(Math.round(ms)));
  } catch {
    // private mode etc. — the crown just won't persist
  }
}

function formatTime(ms: number) {
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = (total % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}

function CourseCard({ run, copy }: { run: CourseRun; copy: PianoWorldCopy }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (run.startedAt === null) return;
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, [run.startedAt]);

  const elapsed =
    run.startedAt !== null ? now - run.startedAt : (run.finishedMs ?? 0);
  const progress = run.reached / GOAL_INDEX;

  return (
    <div className="pointer-events-none absolute left-1/2 top-5 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card/90 px-4 py-3 shadow-sm md:top-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          {run.finishedMs !== null && run.startedAt === null ? copy.courseDone : copy.courseTitle}
        </p>
        <p className="shrink-0 text-lg font-semibold tabular-nums text-foreground">
          {formatTime(elapsed)}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[#8f7cff] transition-[width] duration-300"
          style={{ width: `${Math.min(progress, 1) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {run.best !== null ? `${copy.courseBest} ${formatTime(run.best)}` : copy.courseHint}
      </p>
    </div>
  );
}

function MelodyCard({
  title,
  step,
  total,
  done,
  next,
  copy,
}: {
  title: string;
  step: number;
  total: number;
  done: boolean;
  next: number | null;
  copy: PianoWorldCopy;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-5 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card/90 px-4 py-3 shadow-sm md:top-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {done ? copy.melodyDone : `${step} / ${total}`}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-warning transition-[width] duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {next !== null ? `${copy.melodyNext} ${midiToNoteName(next)} · ${copy.melodyHint}` : copy.melodyNextSong}
      </p>
    </div>
  );
}

const MAX_LISTED = 8;

/** Who else is here: channel, people in it, and everyone online. */
function PresencePanel({ info, copy }: { info: PresenceInfo; copy: PianoWorldCopy }) {
  if (info.status === "disabled") return null;
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
  isGuest,
}: {
  copy: PianoWorldCopy;
  playerName: string;
  /** guests get a random musical name they can re-roll */
  isGuest: boolean;
}) {
  const [name, setName] = useState(playerName);
  // Region comes from ?region= so a place can be linked to directly
  const [regionId, setRegionId] = useState<RegionId>(() => {
    const param = new URLSearchParams(window.location.search).get("region");
    return isRegionId(param) ? param : "hall";
  });
  const region = REGIONS[regionId];
  const regionRef = useRef(region);
  const [arrival, setArrival] = useState<Arrival>(() => arrivalPoint(regionId, null));
  const [fading, setFading] = useState(false);
  const transitioning = useRef(false);

  // Each region is its own set of rooms on the server; changing region reconnects
  const { remotes, info, sendPosition } = useWorldPresence(name, regionId);
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
  /** Notes I'm currently holding (several in the lounge, where a step is a chord) */
  const soundingRef = useRef<number[]>([]);
  /** Cathedral: notes left ringing after you step off, released a moment later */
  const echoTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const remoteSounding = useRef(new Map<string, number>());

  const releaseAll = useCallback(() => {
    soundingRef.current.forEach(playNoteOff);
    soundingRef.current = [];
    echoTimers.current.forEach((timer, midi) => {
      clearTimeout(timer);
      playNoteOff(midi);
    });
    echoTimers.current.clear();
    for (const midi of remoteSounding.current.values()) playNoteOff(midi);
    remoteSounding.current.clear();
  }, []);

  /**
   * The audio engine holds one instrument for the whole app. Loads are
   * chained so a quick portal hop can't race two loads, and the last
   * requested instrument always wins.
   */
  const instrumentChain = useRef<Promise<void>>(Promise.resolve());
  const switchInstrument = useCallback(
    (id: InstrumentId) => {
      audioRef.current = "loading";
      setAudio("loading");
      instrumentChain.current = instrumentChain.current
        .then(() => ensureAudioStarted())
        .then(() => loadInstrument(id))
        .then(() => {
          if (regionRef.current.instrument !== id) return; // superseded by a later hop
          audioRef.current = "on";
          setAudio("on");
        })
        .catch(() => {
          audioRef.current = "off";
          setAudio("off");
        });
    },
    [],
  );

  // Browsers only allow audio after a user gesture — the first key or tap starts it
  const startAudio = useCallback(() => {
    if (audioRef.current !== "off") return;
    switchInstrument(regionRef.current.instrument);
  }, [switchInstrument]);

  // Leave the shared audio engine as we found it, so the free-play page
  // doesn't open on the organ because you visited the cathedral.
  useEffect(() => {
    const before = getCurrentInstrumentId();
    return () => {
      const now = getCurrentInstrumentId();
      if (now === before) return;
      if (before) void loadInstrument(before);
      else disposeSampler();
    };
  }, []);


  const handlePadPress = useCallback(
    (direction: Direction, pressed: boolean) => {
      input.current[direction] = pressed;
      if (pressed) startAudio();
    },
    [startAudio],
  );

  /** bumped to fire confetti (melody finished, course topped) */
  const [celebrate, setCelebrate] = useState(0);

  // --- hidden course: timer, best record and the crown reward -------------
  const [crowned, setCrowned] = useState(() => readCourseBest() !== null);
  const [course, setCourse] = useState<CourseRun>({
    startedAt: null,
    reached: 0,
    finishedMs: null,
    best: readCourseBest(),
  });
  const courseRef = useRef(course);
  const handlePlatform = useCallback((index: number | null) => {
    if (regionRef.current.feature !== "course") return;
    const run = courseRef.current;
    let next = run;
    if (index === null) {
      // back on the cloud floor: the attempt is over, start fresh next time
      if (run.startedAt !== null) next = { ...run, startedAt: null, reached: 0 };
    } else if (index === GOAL_INDEX) {
      if (run.startedAt !== null) {
        const finishedMs = performance.now() - run.startedAt;
        const best = run.best === null ? finishedMs : Math.min(run.best, finishedMs);
        writeCourseBest(best);
        setCrowned(true);
        setCelebrate((n) => n + 1);
        next = { startedAt: null, reached: GOAL_INDEX, finishedMs, best };
      }
    } else {
      next = {
        ...run,
        startedAt: run.startedAt ?? performance.now(),
        reached: Math.max(run.reached, index),
        finishedMs: run.startedAt === null ? null : run.finishedMs,
      };
    }
    if (next !== run) {
      courseRef.current = next;
      setCourse(next);
    }
  }, []);

  const [melody, setMelody] = useState({ song: 0, step: 0, done: false });
  const melodyRef = useRef(melody);

  const advanceMelody = useCallback((midi: number) => {
    const current = melodyRef.current;
    const song = MELODIES[current.song];
    if (current.done || song.notes[current.step] !== midi) return;
    const step = current.step + 1;
    if (step < song.notes.length) {
      melodyRef.current = { ...current, step };
      setMelody(melodyRef.current);
      return;
    }
    // Finished: celebrate, then line up the next tune
    melodyRef.current = { ...current, step, done: true };
    setMelody(melodyRef.current);
    setCelebrate((n) => n + 1);
    setTimeout(() => {
      melodyRef.current = { song: (current.song + 1) % MELODIES.length, step: 0, done: false };
      setMelody(melodyRef.current);
    }, 2800);
  }, []);

  /** How a step sounds depends on the region (see RegionFeature). */
  const handleKeyChange = useCallback(
    (midi: number | null) => {
      setNote(midi);
      const feature = regionRef.current.feature;

      // let go of what was held
      for (const held of soundingRef.current) {
        if (feature === "echo") {
          clearTimeout(echoTimers.current.get(held));
          echoTimers.current.set(
            held,
            setTimeout(() => {
              playNoteOff(held);
              echoTimers.current.delete(held);
            }, 1400),
          );
        } else {
          playNoteOff(held);
        }
      }
      soundingRef.current = [];
      if (midi === null) return;

      if (feature === "melody") advanceMelody(midi);
      if (audioRef.current !== "on") return;

      const notes = feature === "chords" ? seventhChordOn(midi) : [midi];
      notes.forEach((n, i) => {
        const pending = echoTimers.current.get(n);
        if (pending) {
          clearTimeout(pending);
          echoTimers.current.delete(n);
          playNoteOff(n); // restrike cleanly
        }
        playNoteOn(n, i === 0 ? 0.75 : 0.42);
      });
      soundingRef.current = notes;
    },
    [advanceMelody],
  );

  // --- emotes ------------------------------------------------------------
  const [emote, setEmote] = useState<EmoteId | null>(null);
  const emoteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playEmote = useCallback((next: EmoteId) => {
    clearTimeout(emoteTimer.current);
    setEmote(next);
    const seconds = EMOTE_SECONDS[next];
    if (Number.isFinite(seconds)) {
      emoteTimer.current = setTimeout(() => setEmote(null), seconds * 1000);
    }
  }, []);
  const cancelEmote = useCallback(() => {
    clearTimeout(emoteTimer.current);
    setEmote((current) => (current === null ? current : null));
  }, []);

  // --- interactables -------------------------------------------------------
  const [nearby, setNearby] = useState<InteractableId | null>(null);
  const nearbyRef = useRef<InteractableId | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const panelRef = useRef<Panel | null>(null);
  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [hearts, setHearts] = useState(0);
  const [lantern, setLantern] = useState(0);
  const [petting, setPetting] = useState(false);
  const [party, setParty] = useState(false);
  const [musicBoxPlaying, setMusicBoxPlaying] = useState(false);
  const [jukeboxPlaying, setJukeboxPlaying] = useState(false);
  const stopTune = useRef<(() => void) | null>(null);
  const draws = useRef({ card: 0, tip: 0, reaction: 0 });

  const openPanel = useCallback((next: Panel | null) => {
    panelRef.current = next;
    setPanel(next);
  }, []);

  const say = useCallback((text: string, ms = 3500) => {
    clearTimeout(speechTimer.current);
    setSpeech(text);
    speechTimer.current = setTimeout(() => setSpeech(null), ms);
  }, []);

  const stopMusic = useCallback(() => {
    stopTune.current?.();
    stopTune.current = null;
    setJukeboxPlaying(false);
    setMusicBoxPlaying(false);
  }, []);

  const handleNearby = useCallback((id: InteractableId | null) => {
    nearbyRef.current = id;
    setNearby(id);
  }, []);

  /** Strum a chord: notes start a beat apart and ring together. */
  const strum = useCallback((midi: number[]) => {
    if (audioRef.current !== "on") return;
    midi.forEach((note, i) => setTimeout(() => playNoteOn(note, 0.55), i * 90));
    setTimeout(() => midi.forEach(playNoteOff), 2200);
  }, []);

  const interact = useCallback(
    (id: InteractableId) => {
      startAudio();
      switch (id) {
        case "cat": {
          setPetting(true);
          setHearts((n) => n + 1);
          const reactions = copy.catReactions;
          say(reactions[draws.current.reaction++ % reactions.length]);
          if (audioRef.current === "on") {
            // a little purr: two soft high notes
            [88, 91].forEach((note, i) => setTimeout(() => playNoteOn(note, 0.25), i * 140));
            setTimeout(() => [88, 91].forEach(playNoteOff), 700);
          }
          setTimeout(() => setPetting(false), 1600);
          break;
        }
        case "chordCard": {
          // draws are random per press (an event, so randomness is fine here)
          const index = Math.floor(Math.random() * CHORD_CARD_COUNT);
          draws.current.card = index;
          const card = chordCard(index);
          openPanel({ kind: "chordCard", card });
          strum(card.midi);
          break;
        }
        case "teacher": {
          const tips = copy.teacherTips;
          say(tips[draws.current.tip++ % tips.length], 5000);
          break;
        }
        case "musicBox":
          openPanel({ kind: "wish" });
          break;
        case "jukebox":
          if (stopTune.current) {
            stopMusic();
          } else {
            setJukeboxPlaying(true);
            stopTune.current = playSequence(FUR_ELISE, 132, 0.55, () => {
              stopTune.current = null;
              setJukeboxPlaying(false);
            });
            say(copy.jukeboxNowPlaying);
          }
          break;
        case "discoBall":
          setParty(true);
          setCelebrate((n) => n + 1);
          setTimeout(() => setParty(false), 8000);
          break;
      }
    },
    [copy, openPanel, say, startAudio, stopMusic, strum],
  );

  const sendWish = useCallback(() => {
    // The wish text is never sent or stored anywhere — it only lives in the textarea
    openPanel(null);
    setLantern((n) => n + 1);
    stopMusic();
    setMusicBoxPlaying(true);
    stopTune.current = playSequence(MUSIC_BOX, 150, 0.4, () => {
      stopTune.current = null;
      setMusicBoxPlaying(false);
    });
    say(copy.wishSent);
  }, [copy, openPanel, say, stopMusic]);

  /** The cat's footsteps, very soft. */
  const catSounding = useRef<number | null>(null);
  const handleCatKey = useCallback((midi: number | null) => {
    if (catSounding.current !== null) playNoteOff(catSounding.current);
    catSounding.current = null;
    if (midi !== null && audioRef.current === "on") {
      playNoteOn(midi, 0.18);
      catSounding.current = midi;
    }
  }, []);

  const rerollName = useCallback(() => {
    const { nameAdjectives: adjectives, nameNouns: nouns } = copy;
    const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
    setName(`${pick(adjectives)} ${pick(nouns)}`);
  }, [copy]);

  const handlePortal = useCallback(
    (to: RegionId) => {
      if (transitioning.current) return;
      transitioning.current = true;
      const from = regionRef.current.id;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setFading(true);
      setTimeout(
        () => {
          releaseAll();
          stopMusic();
          openPanel(null);
          setNote(null);
          regionRef.current = REGIONS[to];
          setRegionId(to);
          setArrival(arrivalPoint(to, from));
          const url = new URL(window.location.href);
          if (to === "hall") url.searchParams.delete("region");
          else url.searchParams.set("region", to);
          window.history.replaceState(window.history.state, "", url);
          if (audioRef.current !== "off") switchInstrument(REGIONS[to].instrument);
          setFading(false);
          transitioning.current = false;
        },
        reduceMotion ? 0 : FADE_MS,
      );
    },
    [releaseAll, switchInstrument, stopMusic, openPanel],
  );

  const takeJump = useCallback(() => {
    const requested = input.current.jump;
    input.current.jump = false;
    return requested;
  }, []);

  // Other people's footsteps play too, quieter than your own
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
      if (e.code === "Escape" && panelRef.current) {
        openPanel(null);
        return;
      }
      if (isTyping(e.target) || !visibleRef.current || e.metaKey || e.ctrlKey) return;
      if ((e.code === "KeyE" || e.code === "Enter") && nearbyRef.current && !panelRef.current) {
        e.preventDefault();
        interact(nearbyRef.current);
        return;
      }
      const emoteIndex = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code);
      if (emoteIndex !== -1) {
        playEmote(EMOTES[emoteIndex]);
        return;
      }
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
  }, [startAudio, interact, openPanel, playEmote]);

  // Silence the last note when leaving the page
  useEffect(
    () => () => {
      releaseAll();
      stopTune.current?.();
    },
    [releaseAll],
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
        <color attach="background" args={[region.theme.background]} />
        <fog attach="fog" args={[region.theme.background, ...region.theme.fog]} />
        <World
          input={input}
          onKeyChange={handleKeyChange}
          remotes={remotes}
          others={info.others}
          sendPosition={sendPosition}
          onRemoteNote={handleRemoteNote}
          takeJump={takeJump}
          region={region}
          arrival={arrival}
          onPortal={handlePortal}
          targetMidi={
            region.feature === "melody" && !melody.done
              ? MELODIES[melody.song].notes[melody.step]
              : null
          }
          celebrate={celebrate}
          onPlatform={handlePlatform}
          crowned={crowned}
          emote={emote}
          onEmoteCancel={cancelEmote}
          onNearby={handleNearby}
          hearts={hearts}
          lantern={lantern}
          petting={petting}
          party={party}
          musicBoxPlaying={musicBoxPlaying}
          jukeboxPlaying={jukeboxPlaying}
          onCatKey={handleCatKey}
        />
      </Canvas>

      {/* region transition */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-background transition-opacity duration-300 motion-reduce:transition-none",
          fading ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="pointer-events-none absolute left-0 top-0 p-5 md:p-6">
        <div className="rounded-full border border-border bg-card/90 px-3.5 py-1.5 text-sm font-medium text-foreground shadow-sm">
          {copy.regions[regionId]}
        </div>
      </div>

      {region.feature === "course" ? <CourseCard run={course} copy={copy} /> : null}

      {region.feature === "melody" ? (
        <MelodyCard
          title={copy.melodies[MELODIES[melody.song].key]}
          step={melody.step}
          total={MELODIES[melody.song].notes.length}
          done={melody.done}
          next={melody.done ? null : MELODIES[melody.song].notes[melody.step]}
          copy={copy}
        />
      ) : null}

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

      {/* my name — guests can re-roll it */}
      <div className="absolute right-5 top-24 hidden md:block">
        <button
          type="button"
          disabled={!isGuest}
          onClick={rerollName}
          title={isGuest ? copy.nameReroll : undefined}
          className="rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-foreground shadow-sm enabled:hover:bg-muted"
        >
          <span className="text-muted-foreground">{copy.nameLabel}</span> {name}
          {isGuest ? <span className="ml-1.5 text-muted-foreground">↻</span> : null}
        </button>
      </div>

      {/* emote bar */}
      <div className="absolute right-5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
        {EMOTES.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => (emote === id ? cancelEmote() : playEmote(id))}
            title={`${i + 1} · ${copy.emotes[id]}`}
            aria-label={copy.emotes[id]}
            aria-pressed={emote === id}
            className={cn(
              "flex size-10 items-center justify-center rounded-xl border border-border bg-card/90 text-lg shadow-sm hover:bg-muted",
              emote === id && "ring-2 ring-foreground/30",
            )}
          >
            {EMOTE_ICON[id]}
          </button>
        ))}
      </div>

      {/* speech from NPCs, the cat, the jukebox… */}
      {speech ? (
        <div
          role="status"
          className="pointer-events-none absolute bottom-24 left-1/2 max-w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-card/95 px-4 py-2.5 text-center text-sm text-foreground shadow-md"
        >
          {speech}
        </div>
      ) : null}

      {/* "press E" prompt */}
      {nearby && !panel ? (
        <button
          type="button"
          onClick={() => interact(nearby)}
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-medium text-foreground shadow-md hover:bg-muted"
        >
          <kbd className="rounded border border-border bg-background px-1.5 text-xs text-muted-foreground pointer-coarse:hidden">
            E
          </kbd>
          {copy.interact[nearby === "jukebox" && jukeboxPlaying ? "jukeboxStop" : nearby]}
        </button>
      ) : null}

      {panel?.kind === "chordCard" ? (
        <ChordCardPanel card={panel.card} copy={copy} onClose={() => openPanel(null)} onPlay={() => strum(panel.card.midi)} />
      ) : null}
      {panel?.kind === "wish" ? (
        <WishPanel copy={copy} onClose={() => openPanel(null)} onSend={sendWish} />
      ) : null}

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
