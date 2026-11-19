"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOUNDS, CASE_H, SPAWN } from "../model/layout";
import { COURSE_BOUNDS, courseBlocked, courseCeiling } from "../model/course";
import { interactablesIn, type EmoteId, type InteractableId } from "../model/interactables";
import {
  FALL_THRESHOLD,
  GRAVITY,
  JUMP_SPEED,
  SPEED,
  SPRING_BOOST,
  groundAt,
  lerpAngle,
  type Arrival,
  type InputState,
} from "../model/physics";
import { PORTAL_RADIUS, type RegionDef, type RegionId } from "../model/regions";
import type { RemotePlayer } from "../lib/use-world-presence";
import type { InteractionScene } from "../lib/use-interactions";
import { CourseScene } from "./course-scene";
import { EmoteBubble } from "./emote-bubble";
import { KordiModel, type KordiMotion } from "./kordi-model";
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
  /** finished the hidden course at least once */
  crowned: boolean;
  interaction: InteractionScene;
  /** bump to fire confetti over Kordi */
  celebrate: number;
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
 * something visible does (pressed keys, emote bubble).
 */
export function World({ region, arrival, input, takeJump, presence, display, events }: WorldProps) {
  const { remotes, others, sendPosition } = presence;
  const { emote, target, crowned, interaction, celebrate } = display;
  const camera = useThree((state) => state.camera);

  const kordi = useRef<THREE.Group>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const bubble = useRef<THREE.Group>(null);
  const fx = useRef<StepEffectsApi>(null);
  const motion = useRef<KordiMotion>({ phase: 0, amount: 0, emote: null });
  const sim = useRef({
    pos: new THREE.Vector3(SPAWN.x, CASE_H, SPAWN.z),
    heading: 0, // face the camera on arrival
    vy: 0,
    airborne: false,
    midi: null as number | null,
    platform: null as number | null,
  });
  const lookTarget = useRef(new THREE.Vector3(SPAWN.x, 0.6, SPAWN.z - 1.2));
  const scratch = useRef({ camera: new THREE.Vector3(), look: new THREE.Vector3() });

  /** Portals only fire after you've stepped clear of every portal once (no ping-pong on arrival) */
  const portalArmed = useRef(false);
  const placedFor = useRef<Arrival | null>(null);
  const seen = useRef({ celebrate, hearts: interaction.hearts, lantern: interaction.lantern });
  const remoteNotes = useRef(new Map<string, number | null>());
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set());
  const pressedSignature = useRef("");

  const cat = useRef({ pos: new THREE.Vector3(SPAWN.x, 0, 1.2), key: null as number | null, heard: null as number | null });
  const nearby = useRef<InteractableId | null>(null);

  const cameraOffset = useMemo(() => new THREE.Vector3(...region.camera), [region]);
  const items = useMemo(() => interactablesIn(region.id), [region]);
  const course = region.feature === "course";

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = sim.current;
    const keys = input.current;

    // --- arrival: cut (don't glide) to the new spot while the screen is faded
    if (placedFor.current !== arrival) {
      placedFor.current = arrival;
      s.pos.set(arrival.x, groundAt(region, arrival.x, arrival.z, 0).height, arrival.z);
      s.heading = 0;
      s.vy = 0;
      s.airborne = false;
      portalArmed.current = false;
      camera.position.copy(s.pos).add(cameraOffset);
      lookTarget.current.set(s.pos.x, s.pos.y + 0.6, s.pos.z - 1.2);
    }

    // --- walking
    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      const bounds = course ? COURSE_BOUNDS : BOUNDS;
      const nextX = THREE.MathUtils.clamp(s.pos.x + dx * SPEED * dt, -bounds.x, bounds.x);
      const nextZ = THREE.MathUtils.clamp(s.pos.z + dz * SPEED * dt, bounds.zMin, bounds.zMax);
      // Course steps are solid: resolve each axis separately so you slide along a side
      if (!course || !courseBlocked(nextX, s.pos.z, s.pos.y)) s.pos.x = nextX;
      if (!course || !courseBlocked(s.pos.x, nextZ, s.pos.y)) s.pos.z = nextZ;
      s.heading = lerpAngle(s.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 12));
    }

    const m = motion.current;
    m.amount = THREE.MathUtils.lerp(m.amount, moving ? 1 : 0, 1 - Math.exp(-dt * 10));
    m.phase += dt * 11 * m.amount;
    m.emote = emote;
    if (emote && moving) events.onEmoteCancel();

    // --- jumping, falling, landing
    const ground = groundAt(region, s.pos.x, s.pos.z, s.pos.y);
    if (takeJump() && !s.airborne) {
      s.airborne = true;
      s.vy = JUMP_SPEED;
    }
    if (s.airborne) {
      s.vy -= GRAVITY * dt;
      const nextY = s.pos.y + s.vy * dt;
      const ceiling = course && s.vy > 0 ? courseCeiling(s.pos.x, s.pos.z, s.pos.y, nextY) : null;
      if (ceiling !== null) {
        s.pos.y = ceiling; // bonk: head hit a step's underside
        s.vy = 0;
      } else {
        s.pos.y = nextY;
      }
      if (s.vy < 0 && s.pos.y <= ground.height) {
        s.pos.y = ground.height; // landing re-strikes the key below
        s.airborne = false;
        s.vy = 0;
      }
    } else if (s.pos.y - ground.height > FALL_THRESHOLD) {
      s.airborne = true; // walked off a ledge
      s.vy = 0;
    } else {
      s.pos.y = THREE.MathUtils.lerp(s.pos.y, ground.height, 1 - Math.exp(-dt * 18));
    }

    // --- what's underfoot: nothing is pressed while in the air
    const midi = s.airborne ? null : ground.midi;
    if (!s.airborne && ground.platform !== s.platform) {
      s.platform = ground.platform;
      events.onPlatform(ground.platform);
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
          s.vy = JUMP_SPEED * SPRING_BOOST;
        }
      }
    }
    sendPosition(s.pos.x, s.pos.y, s.pos.z, s.heading, midi, emote);

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
    const down = new Set<number>();
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
    const signature = [...down].sort((a, b) => a - b).join(",");
    if (signature !== pressedSignature.current) {
      pressedSignature.current = signature;
      setPressed(down);
    }

    // --- place things
    if (kordi.current) {
      kordi.current.position.copy(s.pos);
      kordi.current.rotation.y = s.heading;
    }
    bubble.current?.position.set(s.pos.x, s.pos.y + EMOTE_BUBBLE_HEIGHT, s.pos.z);
    // The keyboard is 52 keys wide: the sun travels with Kordi so nearby shadows stay crisp
    if (light.current) {
      light.current.position.set(s.pos.x + 6, s.pos.y + 12, s.pos.z + 6);
      light.current.target.position.copy(s.pos);
      light.current.target.updateMatrixWorld();
    }

    // Keyboard regions keep the camera level (jumps don't bob the view); the course climbs with you
    const follow = 1 - Math.exp(-dt * 4);
    const cameraY = course ? s.pos.y : 0;
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
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0005}
      />
      <hemisphereLight args={[region.theme.sky, region.theme.ground, region.theme.ambient]} />

      {course ? <CourseScene pressed={pressed} /> : <PianoFloor pressed={pressed} theme={region.theme} />}
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

      {/* scaled up so the character reads at a glance against the giant keys */}
      <KordiModel ref={kordi} motion={motion} scale={KORDI_SCALE} crown={crowned} />
      <group ref={bubble}>{emote ? <EmoteBubble emote={emote} /> : null}</group>
      {others.map((other) => (
        <RemoteKordi key={other.id} id={other.id} name={other.name} remotes={remotes} course={course} />
      ))}
    </>
  );
}
