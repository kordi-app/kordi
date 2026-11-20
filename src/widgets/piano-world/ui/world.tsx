"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import type { VoiceId } from "@/shared/lib/audio";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOUNDS, CASE_H, SPAWN } from "../model/layout";
import {
  BOUNCE_BOOST,
  courseBlocked,
  courseCeiling,
  courseDepenetrate,
  courseRuntime,
  slideOffset,
  tickCourse,
  touchCrumble,
} from "../model/course";
import { interactablesIn, type EmoteId, type InteractableId } from "../model/interactables";
import { decorColliders } from "../model/decor";
import { skyAt } from "../model/day-night";
import { islandHits, type WarpStoneId } from "../model/island";
import { createAmbience, resetAmbience, stepAmbience, type AmbienceEvents } from "../lib/island-ambience";
import { aimSunLight, applySky, createSunAim } from "../lib/sun-light";
import { quality } from "../lib/quality";
import { ISLAND_TERRAIN } from "../model/nature";
import { terrainBlocked, terrainCeiling, terrainDepenetrate } from "../model/terrain";
import { BALL_RADIUS, ballSpawns, newBall, stepBall, type Ball } from "../model/ball";
import { NoteBall } from "./note-ball";
import {
  AIR_ACCEL,
  BODY_RADIUS,
  COYOTE_TIME,
  FALL_THRESHOLD,
  GRAVITY,
  GROUND_ACCEL,
  GROUND_FRICTION,
  HARD_LANDING,
  JUMP_BUFFER,
  JUMP_CUT_GRAVITY,
  JUMP_SPEED,
  SPEED,
  SPRING_BOOST,
  approach,
  groundAt,
  lerpAngle,
  resolveCircles,
  type Arrival,
  type CircleCollider,
  type InputState,
} from "../model/physics";
import { PORTAL_RADIUS, type RegionDef, type RegionId } from "../model/regions";
import type { RemotePlayer } from "../lib/use-world-presence";
import type { InteractionScene } from "../lib/use-interactions";
import { CourseScene } from "./course-scene";
import { EmoteBubble } from "./emote-bubble";
import { IslandScene } from "./island-scene";
import { debugSeam } from "../lib/debug-seam";
import { KordiModel, type Appearance, type HatId, type KordiMotion } from "@/entities/character";
import { PianoFloor } from "./piano-floor";
import { Portal } from "./portal";
import { RegionDecor } from "./region-decor";
import { RemoteKordi } from "./remote-kordi";
import { StepEffects, type StepEffectsApi } from "./step-effects";
import { TargetBeam } from "./target-beam";
import { ChordCardStand, DiscoBall, Jukebox, MusicBox, PianoCat, Teacher } from "./world-props";

/** The cat's footsteps are heard within this distance */
const CAT_EARSHOT = 9;
const PORTAL_HEIGHT_TOLERANCE = 1.2;
const EMOTE_BUBBLE_HEIGHT = 2.75;
const KORDI_SCALE = 1.6;
/** Shadows are drawn for this far around Kordi (half-width); the map size comes from the quality tier */
const SHADOW_EXTENT = 28;
/** how far back along the light the shadow camera sits (clears the tower top) */
const SHADOW_DISTANCE = 45;
/** How often the island's sky is recomputed (it changes slowly) */
const SKY_INTERVAL = 0.2;
/** The keyboard plaza: the melody game's card shows only while you're here */
const PLAZA_REACH = { x: 36, zMin: -10, zMax: 16 };

/** Things the world reports back to the page */
export interface WorldEvents {
  /** the key under you changed (null when off the keys or airborne) */
  onStep: (midi: number | null) => void;
  /** a remote player's key changed (or they left: null) */
  onRemoteStep: (id: string, midi: number | null) => void;
  /** course platform under you changed (null = the cloud floor) */
  onPlatform: (index: number | null) => void;
  onPortal: (to: RegionId) => void;
  /** moving ends an emote */
  onEmoteCancel: () => void;
  /** the interactable now in reach */
  onNearby: (id: InteractableId | null) => void;
  /** the key the cat is on, only while it's within earshot */
  onCatStep: (midi: number | null) => void;
  /** a note ball hit or rolled onto a key */
  onBallNote: (midi: number, velocity: number) => void;
  /** the island's terrain made a sound (bridge bar, drum, pipe, harp string, bell…) */
  onVoice: (voice: VoiceId, midi: number, velocity: number) => void;
  /** the warp stone now in reach (island only) */
  onWarpNearby: (id: WarpStoneId | null) => void;
  /** the named place on the island you're in (null between places) */
  onZone: (id: WarpStoneId | null) => void;
  /** whether you're on the keyboard plaza (the melody game only shows there) */
  onNearKeys: (near: boolean) => void;
}

export interface WorldPresence {
  remotes: RefObject<Map<string, RemotePlayer>>;
  others: { id: string; name: string }[];
  sendPosition: (
    x: number,
    y: number,
    z: number,
    h: number,
    m: number | null,
    e: EmoteId | null,
  ) => void;
}

export interface WorldDisplay {
  emote: EmoteId | null;
  /** melody game: the key to step on next */
  target: number | null;
  /** how my Kordi is dressed */
  appearance: Appearance;
  /** course reward items I own (their treasure no longer shows the crown) */
  rewards: readonly HatId[];
  interaction: InteractionScene;
  /** bump to fire confetti over Kordi */
  celebrate: number;
  /** warp stones you've woken (island) */
  awake: ReadonlySet<WarpStoneId>;
}

interface WorldProps {
  region: RegionDef;
  /** changes identity on every region entry; the player is placed here */
  arrival: Arrival;
  input: RefObject<InputState>;
  /** true once per jump press (reads and clears it) */
  takeJump: () => boolean;
  presence: WorldPresence;
  display: WorldDisplay;
  events: WorldEvents;
}

/**
 * The simulation and scene graph: moves Kordi with physics, follows with the
 * camera, detects keys / portals / interactables underfoot, and renders the
 * region. All per-frame state lives in refs; React state only changes when
 * something visible does (the emote bubble, who's here).
 */
export function World({ region, arrival, input, takeJump, presence, display, events }: WorldProps) {
  const { remotes, others, sendPosition } = presence;
  const { emote, target, appearance, rewards, interaction, celebrate, awake } = display;
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const hemi = useRef<THREE.HemisphereLight>(null);

  const kordi = useRef<THREE.Group>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const bubble = useRef<THREE.Group>(null);
  const lantern = useRef<THREE.Group>(null);
  const fx = useRef<StepEffectsApi>(null);
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0, emote: null, land: 0, stretch: 0, lean: 0, bank: 0 });
  /** Kordi's live position: one Vector3, mutated in place, shared with the island renderer */
  const [playerPos] = useState(() => new THREE.Vector3(SPAWN.x, CASE_H, SPAWN.z));
  const sim = useRef({
    pos: playerPos,
    heading: 0, // face the camera on arrival
    vx: 0,
    vz: 0,
    vy: 0,
    airborne: false,
    /** in the air because of a jump (not a fall) — no coyote jump then */
    jumped: false,
    /** launched by a neon spring: ignores the early-release cut */
    springing: false,
    sinceGrounded: 0,
    jumpBuffer: 0,
    lastForward: 0,
    bumpCooldown: 0,
    midi: null as number | null,
    platform: null as number | null,
    /** island terrain underfoot (ISLAND_TERRAIN.solids index) */
    solid: null as number | null,
    /** height of the last ground stood on: the camera follows this, not jumps */
    restY: 0,
  });
  /** island ambience: per-thing cooldowns, last position (for harp strings), stone in reach */
  /** island ambience (pipes, harp, bell, warp stones, places) between frames */
  const ambience = useRef(createAmbience());
  const view = useRef({ skyAt: -Infinity, nearKeys: true });
  /** where the sun light points (follows the sky on the island) */
  const sunAim = useRef(createSunAim());
  const lookTarget = useRef(new THREE.Vector3(SPAWN.x, 0.6, SPAWN.z - 1.2));
  const scratch = useRef({ camera: new THREE.Vector3(), look: new THREE.Vector3() });

  /** Portals only fire after you've stepped clear of every portal once (no ping-pong on arrival) */
  const portalArmed = useRef(false);
  const placedFor = useRef<Arrival | null>(null);
  const seen = useRef({ celebrate, hearts: interaction.hearts, lantern: interaction.lantern });
  const remoteNotes = useRef(new Map<string, number | null>());
  /** keys held down by me and everyone in the channel: read every frame by the floor (no React renders) */
  const pressed = useRef<Set<number>>(new Set());

  const cat = useRef({ pos: new THREE.Vector3(SPAWN.x, 0, 1.2), key: null as number | null, heard: null as number | null });
  const nearby = useRef<InteractableId | null>(null);

  const cameraOffset = useMemo(() => new THREE.Vector3(...region.camera), [region]);
  const spawns = useMemo(() => ballSpawns(region.id, SPAWN), [region]);
  const balls = useRef<Ball[]>([]);
  const ballMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const ballSpin = useRef({ axis: new THREE.Vector3(), turn: new THREE.Quaternion() });
  const items = useMemo(() => interactablesIn(region.id), [region]);
  const solids = useMemo<CircleCollider[]>(
    () => [
      ...items.filter((item) => item.solid > 0).map((item) => ({ x: item.x, z: item.z, radius: item.solid })),
      ...decorColliders(region.id),
    ],
    [items, region],
  );
  const course = region.course ?? null;
  const island = region.island ? ISLAND_TERRAIN : null;
  const ambienceEvents = useMemo<AmbienceEvents>(
    () => ({
      voice: events.onVoice,
      warpNearby: events.onWarpNearby,
      zone: events.onZone,
      bell: () => {
        const p = sim.current.pos;
        fx.current?.confetti(p.x, p.y, p.z);
      },
    }),
    [events],
  );

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = sim.current;
    const keys = input.current;

    // --- arrival: cut (don't glide) to the new spot while the screen is faded.
    // Runs first: everything below may index the new region's course with
    // `s.platform`, which must not still point into the previous course.
    if (placedFor.current !== arrival) {
      placedFor.current = arrival;
      s.pos.set(arrival.x, groundAt(region, arrival.x, arrival.z, 0).height, arrival.z);
      s.heading = 0;
      s.vx = s.vz = s.vy = 0;
      s.airborne = s.jumped = s.springing = false;
      s.platform = null;
      s.midi = null;
      s.solid = null;
      s.restY = s.pos.y;
      resetAmbience(ambience.current, s.pos.x, ambienceEvents);
      if (island) {
        // a shimmer where you land (portal arrivals and warps alike)
        fx.current?.ripple(s.pos.x, s.pos.y, s.pos.z, "#7fd8ff");
        fx.current?.notes(s.pos.x, s.pos.y, s.pos.z, "#7fd8ff");
      }
      portalArmed.current = false;
      camera.position.copy(s.pos).add(cameraOffset);
      lookTarget.current.set(s.pos.x, s.pos.y + 0.6, s.pos.z - 1.2);
      balls.current = spawns.map((spot) => newBall(spot.x, spot.z));
    }

    // the course's moving and crumbling platforms run on the shared clock
    const now = state.clock.getElapsedTime();
    if (course) {
      // ride along on a sliding platform (before anything else moves)
      if (!s.airborne && s.platform !== null) {
        s.pos.x += slideOffset(course, s.platform, now) - slideOffset(course, s.platform, courseRuntime.time);
      }
      tickCourse(course, now);
    }

    // --- walking: velocity eases toward the input direction (momentum, weaker in the air)
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let iz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const steering = ix !== 0 || iz !== 0;
    if (steering) {
      const length = Math.hypot(ix, iz);
      ix /= length;
      iz /= length;
    }
    const accel = (s.airborne ? AIR_ACCEL : steering ? GROUND_ACCEL : GROUND_FRICTION) * dt;
    s.vx = approach(s.vx, ix * SPEED, accel);
    s.vz = approach(s.vz, iz * SPEED, accel);

    const speed = Math.hypot(s.vx, s.vz);
    if (speed > 1e-3) {
      const bounds = course ? course.bounds : (region.bounds ?? BOUNDS);
      const nextX = THREE.MathUtils.clamp(s.pos.x + s.vx * dt, -bounds.x, bounds.x);
      const nextZ = THREE.MathUtils.clamp(s.pos.z + s.vz * dt, bounds.zMin, bounds.zMax);
      if (course) {
        // Course steps are solid: resolve each axis separately so you slide along a side
        if (!courseBlocked(course, nextX, s.pos.z, s.pos.y)) s.pos.x = nextX;
        else s.vx = 0;
        if (!courseBlocked(course, s.pos.x, nextZ, s.pos.y)) s.pos.z = nextZ;
        else s.vz = 0;
      } else if (island) {
        // island terrain is solid the same way
        if (!terrainBlocked(island, nextX, s.pos.z, s.pos.y)) s.pos.x = nextX;
        else s.vx = 0;
        if (!terrainBlocked(island, s.pos.x, nextZ, s.pos.y)) s.pos.z = nextZ;
        else s.vz = 0;
      } else {
        s.pos.x = nextX;
        s.pos.z = nextZ;
      }
    }
    if (island) {
      const out = terrainDepenetrate(island, s.pos.x, s.pos.z, s.pos.y);
      s.pos.x = out.x;
      s.pos.z = out.z;
    }
    if (course) {
      // steps move and appear on their own: if one ended up inside Kordi, step out of it
      const out = courseDepenetrate(course, s.pos.x, s.pos.z, s.pos.y);
      s.pos.x = THREE.MathUtils.clamp(out.x, -course.bounds.x, course.bounds.x);
      s.pos.z = THREE.MathUtils.clamp(out.z, course.bounds.zMin, course.bounds.zMax);
    }
    if (!course) {
      // props you can't walk through, and a gentle push away from other players
      const pushed = resolveCircles(s.pos.x, s.pos.z, BODY_RADIUS, solids);
      const nearbyPlayers: CircleCollider[] = [];
      for (const remote of remotes.current.values()) {
        if (Math.abs((remote.y ?? 0) - s.pos.y) < 1.5) {
          nearbyPlayers.push({ x: remote.x, z: remote.z, radius: BODY_RADIUS });
        }
      }
      const shoved = resolveCircles(pushed.x, pushed.z, BODY_RADIUS, nearbyPlayers);
      s.pos.x = THREE.MathUtils.lerp(pushed.x, shoved.x, 1 - Math.exp(-dt * 10)); // soft, not a wall
      s.pos.z = THREE.MathUtils.lerp(pushed.z, shoved.z, 1 - Math.exp(-dt * 10));
      // Bump: running into someone bounces you back with a little hop. Every
      // client does this for its own player, so both sides of a collision
      // bounce — no server physics needed.
      if (shoved.normal && s.bumpCooldown === 0) {
        const closing = -(s.vx * shoved.normal.x + s.vz * shoved.normal.z);
        if (closing > 1) {
          const kick = closing * 1.4 + 1.5;
          s.vx += shoved.normal.x * kick;
          s.vz += shoved.normal.z * kick;
          if (!s.airborne) {
            s.airborne = true;
            s.jumped = true;
            s.vy = 3.2;
          }
          motion.current.land = 0.5;
          s.bumpCooldown = 0.4;
        }
      }
      s.bumpCooldown = Math.max(0, s.bumpCooldown - dt);
      if (pushed.normal) {
        // stop pushing into the prop, keep sliding along it
        const into = s.vx * pushed.normal.x + s.vz * pushed.normal.z;
        if (into < 0) {
          s.vx -= into * pushed.normal.x;
          s.vz -= into * pushed.normal.z;
        }
      }
    }
    const previousHeading = s.heading;
    if (speed > 0.3) {
      s.heading = lerpAngle(s.heading, Math.atan2(s.vx, s.vz), 1 - Math.exp(-dt * 12));
    }

    const m = motion.current;
    // body language: acceleration along the facing direction → lean, turn rate → bank
    const forwardSpeed = s.vx * Math.sin(s.heading) + s.vz * Math.cos(s.heading);
    const forwardAccel = (forwardSpeed - s.lastForward) / Math.max(dt, 1e-3);
    s.lastForward = forwardSpeed;
    const turnRate = lerpAngle(0, s.heading - previousHeading, 1) / Math.max(dt, 1e-3);
    const ease = 1 - Math.exp(-dt * 8);
    m.lean = THREE.MathUtils.lerp(m.lean, THREE.MathUtils.clamp(forwardAccel / 20, -1, 1), ease);
    m.bank = THREE.MathUtils.lerp(
      m.bank,
      THREE.MathUtils.clamp((turnRate * speed) / 25, -1, 1),
      ease,
    );
    m.amount = THREE.MathUtils.lerp(m.amount, Math.min(speed / SPEED, 1), 1 - Math.exp(-dt * 10));
    m.phase += dt * 11 * m.amount;
    m.emote = emote;
    if (emote && steering) events.onEmoteCancel();

    // --- jumping, falling, landing
    const ground = groundAt(region, s.pos.x, s.pos.z, s.pos.y);
    if (takeJump()) s.jumpBuffer = JUMP_BUFFER;
    else s.jumpBuffer = Math.max(0, s.jumpBuffer - dt);
    s.sinceGrounded = s.airborne ? s.sinceGrounded + dt : 0;

    // forgiving jumps: buffered presses fire on landing, and you get a beat after leaving a ledge
    const canJump = !s.airborne || (s.sinceGrounded < COYOTE_TIME && !s.jumped);
    if (s.jumpBuffer > 0 && canJump) {
      s.airborne = true;
      s.jumped = true;
      s.springing = false;
      s.vy = JUMP_SPEED;
      s.jumpBuffer = 0;
    }

    if (s.airborne) {
      // let go of jump early and the rise is cut short (springs always go full height)
      const cut = s.vy > 0 && !keys.jumpHeld && !s.springing ? JUMP_CUT_GRAVITY : 1;
      s.vy -= GRAVITY * cut * dt;
      const nextY = s.pos.y + s.vy * dt;
      const ceiling =
        s.vy <= 0
          ? null
          : course
            ? courseCeiling(course, s.pos.x, s.pos.z, s.pos.y, nextY)
            : island
              ? terrainCeiling(island, s.pos.x, s.pos.z, s.pos.y, nextY)
              : null;
      if (ceiling !== null) {
        s.pos.y = ceiling; // bonk: head hit a step's underside
        s.vy = 0;
      } else {
        s.pos.y = nextY;
      }
      if (s.vy < 0 && s.pos.y <= ground.height) {
        const impact = -s.vy;
        s.pos.y = ground.height; // landing re-strikes the key below
        s.airborne = false;
        s.jumped = false;
        s.springing = false;
        s.vy = 0;
        if (impact > HARD_LANDING) {
          m.land = Math.min(1, (impact - HARD_LANDING) / 8 + 0.35);
          fx.current?.dust(s.pos.x, s.pos.y, s.pos.z);
        }
        // trampoline: land and get flung back up
        if (course && ground.platform !== null && course.platforms[ground.platform].behavior === "bounce") {
          s.airborne = true;
          s.jumped = true;
          s.springing = true;
          s.vy = JUMP_SPEED * BOUNCE_BOOST;
          m.land = 0.8;
        }
        // island drums: every landing is a beat, and the skin throws you back up
        const landed = island && ground.solid !== null ? island.solids[ground.solid] : null;
        if (landed?.bounce) {
          if (landed.sound) events.onVoice(landed.sound.voice, landed.sound.midi, Math.min(1, 0.45 + impact / 18));
          if (landed.tag) islandHits.set(landed.tag, now);
          fx.current?.notes(s.pos.x, s.pos.y, s.pos.z, region.theme.accent);
          s.airborne = true;
          s.jumped = true;
          s.springing = true;
          s.vy = JUMP_SPEED * landed.bounce;
          m.land = 0.8;
        }
      }
    } else if (s.pos.y - ground.height > FALL_THRESHOLD) {
      s.airborne = true; // walked off a ledge (coyote time starts now)
      s.vy = 0;
    } else {
      s.pos.y = THREE.MathUtils.lerp(s.pos.y, ground.height, 1 - Math.exp(-dt * 18));
      s.restY = ground.height;
    }
    // squash on landing eases out; stretch while rising fast
    m.land = Math.max(0, m.land - dt * 4);
    m.stretch = s.airborne ? THREE.MathUtils.clamp(s.vy / JUMP_SPEED, -0.4, 1) : 0;

    // --- what's underfoot: nothing is pressed while in the air
    const midi = s.airborne ? null : ground.midi;
    if (!s.airborne && ground.platform !== s.platform) {
      s.platform = ground.platform;
      events.onPlatform(ground.platform);
    }
    if (course && !s.airborne && s.platform !== null) touchCrumble(course, s.platform, now);
    // island terrain you walk onto plays its own instrument (drums sound on landing, above)
    const solidUnder = s.airborne ? null : ground.solid;
    if (island && solidUnder !== s.solid) {
      s.solid = solidUnder;
      const piece = solidUnder === null ? null : island.solids[solidUnder];
      if (piece?.sound && !piece.bounce) {
        events.onVoice(piece.sound.voice, piece.sound.midi, 0.75);
        if (piece.tag) islandHits.set(piece.tag, now);
        fx.current?.notes(s.pos.x, s.pos.y, s.pos.z, region.theme.accent);
      }
    }
    if (midi !== s.midi) {
      s.midi = midi;
      events.onStep(midi);
      if (midi !== null) {
        const accent = region.theme.accent;
        fx.current?.notes(s.pos.x, s.pos.y, s.pos.z, accent);
        if (region.feature === "echo") fx.current?.ripple(s.pos.x, s.pos.y, s.pos.z, accent);
        if (region.feature === "springs" && ground.black) {
          s.airborne = true;
          s.jumped = true;
          s.springing = true;
          s.vy = JUMP_SPEED * SPRING_BOOST;
        }
      }
    }
    sendPosition(s.pos.x, s.pos.y, s.pos.z, s.heading, midi, emote);
    if (debugSeam) {
      debugSeam.region = region.id;
      debugSeam.pos = { x: s.pos.x, y: s.pos.y, z: s.pos.z };
      debugSeam.airborne = s.airborne;
    }

    // --- note balls
    balls.current.forEach((ball, i) => {
      const note = stepBall(ball, dt, {
        ground: (x, z) => {
          const g = groundAt(region, x, z, 0);
          return { height: g.height, midi: g.midi };
        },
        colliders: solids,
        bounds: BOUNDS,
        player: { x: s.pos.x, y: s.pos.y, z: s.pos.z, vx: s.vx, vz: s.vz },
      });
      if (note) {
        events.onBallNote(note.midi, note.velocity);
        if (note.velocity > 0.3) fx.current?.notes(ball.x, ball.y - BALL_RADIUS, ball.z, region.theme.accent);
      }
      const mesh = ballMeshes.current[i];
      if (mesh) {
        mesh.position.set(ball.x, ball.y, ball.z);
        // roll: spin about the horizontal axis perpendicular to travel
        const travel = Math.hypot(ball.vx, ball.vz);
        if (travel > 1e-3) {
          const { axis, turn } = ballSpin.current;
          axis.set(ball.vz, 0, -ball.vx).normalize();
          turn.setFromAxisAngle(axis, (travel * dt) / BALL_RADIUS);
          mesh.quaternion.premultiply(turn);
        }
      }
    });

    // --- one-shot effects requested by the page
    if (seen.current.celebrate !== celebrate) {
      seen.current.celebrate = celebrate;
      fx.current?.confetti(s.pos.x, s.pos.y, s.pos.z);
    }
    if (seen.current.hearts !== interaction.hearts) {
      seen.current.hearts = interaction.hearts;
      fx.current?.hearts(cat.current.pos.x, cat.current.pos.y + 0.6, cat.current.pos.z);
    }
    if (seen.current.lantern !== interaction.lantern) {
      seen.current.lantern = interaction.lantern;
      const box = items.find((item) => item.id === "musicBox");
      if (box) fx.current?.lantern(box.x, 0, box.z);
    }

    // --- interactables in reach (the cat wanders, so its spot is live)
    let closest: InteractableId | null = null;
    let closestDistance = Infinity;
    for (const item of items) {
      const at = item.id === "cat" ? cat.current.pos : item;
      const distance = Math.hypot(s.pos.x - at.x, s.pos.z - at.z);
      if (distance < item.radius && distance < closestDistance) {
        closest = item.id;
        closestDistance = distance;
      }
    }
    if (closest !== nearby.current) {
      nearby.current = closest;
      events.onNearby(closest);
    }

    const catDistance = Math.hypot(s.pos.x - cat.current.pos.x, s.pos.z - cat.current.pos.z);
    const heard = region.id === "hall" && catDistance < CAT_EARSHOT ? cat.current.key : null;
    if (heard !== cat.current.heard) {
      cat.current.heard = heard;
      events.onCatStep(heard);
    }

    // --- the island's ambient instruments, warp stones and places
    if (island) stepAmbience(ambience.current, s.pos, now, ambienceEvents);

    const nearKeys = !island || (Math.abs(s.pos.x) < PLAZA_REACH.x && s.pos.z > PLAZA_REACH.zMin && s.pos.z < PLAZA_REACH.zMax);
    if (nearKeys !== view.current.nearKeys) {
      view.current.nearKeys = nearKeys;
      events.onNearKeys(nearKeys);
    }

    // --- portals
    const inside = region.portals.find(
      (portal) =>
        Math.hypot(s.pos.x - portal.x, s.pos.z - portal.z) < PORTAL_RADIUS &&
        Math.abs(s.pos.y - (portal.y ?? 0)) < PORTAL_HEIGHT_TOLERANCE,
    );
    if (!inside) {
      portalArmed.current = true;
    } else if (portalArmed.current && !s.airborne) {
      portalArmed.current = false;
      events.onPortal(inside.to);
    }

    // --- keys held by me and everyone else in the channel
    const down = pressed.current;
    down.clear();
    if (midi !== null) down.add(midi);
    for (const remote of remotes.current.values()) {
      if (remote.m !== null) down.add(remote.m);
      if (remoteNotes.current.get(remote.id) !== remote.m) {
        remoteNotes.current.set(remote.id, remote.m);
        events.onRemoteStep(remote.id, remote.m);
      }
    }
    for (const id of remoteNotes.current.keys()) {
      if (!remotes.current.has(id)) {
        remoteNotes.current.delete(id);
        events.onRemoteStep(id, null);
      }
    }

    // --- place things
    if (kordi.current) {
      kordi.current.position.copy(s.pos);
      kordi.current.rotation.y = s.heading;
    }
    lantern.current?.position.set(s.pos.x + 0.9, s.pos.y + 2.6, s.pos.z + 1.4);
    bubble.current?.position.set(s.pos.x, s.pos.y + EMOTE_BUBBLE_HEIGHT, s.pos.z);
    // The keyboard is 52 keys wide: the sun travels with Kordi so nearby shadows stay crisp.
    // On the island the sky (and the sun's angle) follows the wall clock, shared by everyone.
    if (island && now - view.current.skyAt > SKY_INTERVAL) {
      view.current.skyAt = now;
      const sky = skyAt(Date.now());
      applySky(scene, light.current, hemi.current, sky);
      sunAim.current.dir.set(...sky.lightDir);
    } else if (!island) {
      sunAim.current.dir.set(0.4, 0.8, 0.45).normalize();
    }
    if (light.current) {
      aimSunLight(light.current, sunAim.current, s.pos, { extent: SHADOW_EXTENT, mapSize: quality.shadowMap, distance: SHADOW_DISTANCE });
    }

    // The camera follows the ground you stand on (not your jumps); the course climbs with you
    const follow = 1 - Math.exp(-dt * 4);
    const cameraY = course ? s.pos.y : island ? s.restY : 0;
    const { camera: wantCamera, look } = scratch.current;
    camera.position.lerp(wantCamera.set(s.pos.x, cameraY, s.pos.z).add(cameraOffset), follow);
    lookTarget.current.lerp(look.set(s.pos.x, cameraY + 0.6, s.pos.z - 1.2), follow);
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
        shadow-mapSize={[quality.shadowMap, quality.shadowMap]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={SHADOW_DISTANCE * 2.5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={3}
      />
      <hemisphereLight ref={hemi} args={[region.theme.sky, region.theme.ground, region.theme.ambient]} />

      {course ? (
        <CourseScene
          key={course.id}
          course={course}
          pressed={pressed}
          rewardOwned={rewards.includes(course.id === "night" ? "star-crown" : "crown")}
        />
      ) : (
        <PianoFloor pressed={pressed} theme={region.theme} ground={!region.island} />
      )}
      {region.island ? <IslandScene player={playerPos} awake={awake} /> : null}
      <RegionDecor region={region.id} party={interaction.party} />
      {items.map((item) => {
        switch (item.id) {
          case "cat":
            return (
              <PianoCat
                key={item.id}
                petting={interaction.petting}
                onKey={(midi) => {
                  cat.current.key = midi;
                }}
                onPosition={(position) => cat.current.pos.copy(position)}
              />
            );
          case "chordCard":
            return <ChordCardStand key={item.id} item={item} />;
          case "teacher":
            return <Teacher key={item.id} item={item} />;
          case "musicBox":
            return <MusicBox key={item.id} item={item} playing={interaction.musicBoxPlaying} />;
          case "jukebox":
            return <Jukebox key={item.id} item={item} playing={interaction.jukeboxPlaying} />;
          case "discoBall":
            return <DiscoBall key={item.id} item={item} party={interaction.party} />;
        }
      })}
      {region.portals.map((portal) => (
        <Portal key={`${portal.to}-${portal.x}`} portal={portal} glow={region.theme.dark} />
      ))}
      {target !== null ? <TargetBeam midi={target} color={region.theme.accent} /> : null}
      <StepEffects ref={fx} />
      {spawns.map((_, i) => (
        <NoteBall
          key={`${region.id}-${i}`}
          accent={region.theme.accent}
          ref={(el) => {
            ballMeshes.current[i] = el;
          }}
        />
      ))}

      {/* scaled up so the character reads at a glance against the giant keys */}
      <KordiModel ref={kordi} motion={motion} scale={KORDI_SCALE} appearance={appearance} />
      {course?.beams ? (
        // a small lantern Kordi carries through the dark
        <group ref={lantern}>
          <pointLight color="#ffd9a0" intensity={14} distance={7} decay={2} />
        </group>
      ) : null}
      <group ref={bubble}>{emote ? <EmoteBubble emote={emote} /> : null}</group>
      {others.map((other) => (
        <RemoteKordi key={other.id} id={other.id} name={other.name} remotes={remotes} course={course !== null} />
      ))}
    </>
  );
}
