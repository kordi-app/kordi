"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOUNDS, CASE_H, SPAWN } from "../engine/layout";
import { bodyLanguage, createPlayerSim, jumpAndFall, placePlayer, walk, type Drift, type WalkEnv } from "../engine/player";
import type { CourseDef } from "../engine/course";
import type { Terrain } from "../engine/terrain";
import { interactablesIn, type InteractableId } from "../engine/interactables";
import { decorColliders } from "../engine/decor";
import { skyAt } from "../engine/day-night";
import { islandHits } from "../engine/island";
import { createAmbience, resetAmbience, stepAmbience, type AmbienceEvents } from "../audio/island-ambience";
import { aimSunLight, applySky, createSunAim } from "./sun-light";
import { quality } from "./quality";
import { SKY_DRIFT, SKY_OPEN_SECONDS, openSky, skyNow, tickSky } from "../engine/sky-island";
import { TERRAINS } from "../engine/terrains";
import { RegionScene } from "./region-scene";
import { ballSpawns } from "../engine/ball";
import { NoteBall } from "./note-ball";
import {
  HARD_LANDING,
  JUMP_BUFFER,
  JUMP_SPEED,
  SPRING_BOOST,
  groundAt,
  type Arrival,
  type CircleCollider,
  type InputState,
} from "../engine/physics";
import { PORTAL_RADIUS, isDrawn, isWalkThrough, type RegionDef } from "../engine/regions";
import { EmoteBubble } from "./emote-bubble";
import { debugSeam } from "../lib/debug-seam";
import type { KordiMotion } from "@/entities/character";
import { KordiModel } from "@/entities/character/three";
import { Portal } from "./portal";
import { RegionDecor } from "./region-decor";
import { RemoteKordi } from "./remote-kordi";
import { StepEffects, type StepEffectsApi } from "./step-effects";
import { TargetBeam } from "./target-beam";
import { ChordCardStand, DiscoBall, Jukebox, MusicBox, PianoCat, Teacher } from "./world-props";
import type { WorldDisplay, WorldEvents, WorldPresence } from "./world-types";
import type { FrameContext } from "./frame/context";
import { framesFor, type FrameInputs, type RegionFrame } from "./frame/region-frames";
import { createBallsFrame, enterBalls, stepBallsFrame } from "./frame/balls-frame";

export type { WorldDisplay, WorldEvents, WorldPresence } from "./world-types";

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

/** You hear the cat settle on its spot from this far */
const CAT_SIGNAL_EARSHOT = 22;
/** How often my pet echoes a key I step on, an octave up */
const PET_ECHO_CHANCE = 0.3;

/** It counts as night for the midnight bell from this far into dusk (day-night.ts: 0 day … 1 night) */
const MIDNIGHT = 0.6;


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
  const { remotes, others, sendPosition, takeBallNews, sendBall } = presence;
  const { emote, target, appearance, rewards, interaction, celebrate, awake, skyFound, dreamFound, hasNecklace, cosmicCrown } =
    display;
  /** the cave's light right now, 0 (dark) … 1 (the crown's full starlight): shared with its renderer */
  const caveLight = useRef(0);
  /** each region's and feature's own state between frames (see ./frame) */
  const frames = useRef({ balls: createBallsFrame() });
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
  const sim = useRef(createPlayerSim(playerPos));
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
  const items = useMemo(() => interactablesIn(region.id), [region]);
  const solids = useMemo<CircleCollider[]>(
    () => [
      ...items.filter((item) => item.solid > 0).map((item) => ({ x: item.x, z: item.z, radius: item.solid })),
      ...decorColliders(region.id),
    ],
    [items, region],
  );
  const course = region.course ?? null;
  /** how dark it is here, for a pet's glow: the dream is always night; the island follows the clock (set per frame) */
  const petGlow = useRef(0);
  const island = region.island === true;
  /** solid ground beyond the keys (the island's, the dream sea's, the cave's) */
  const terrain = region.terrain ? TERRAINS[region.terrain] : null;
  /** this region's own per-frame rules (see ./frame/region-frames), set up fresh on coming into it */
  const regionFrames = useRef<{ region: RegionDef | null; frames: RegionFrame[] }>({ region: null, frames: [] });
  /**
   * The objects each frame fills in and hands around: made once and reused, so
   * the 60-a-second loop doesn't leave garbage behind for the collector.
   */
  const perFrame = useRef<{
    ctx: FrameContext;
    inputs: FrameInputs;
    walk: WalkEnv;
    jump: { pressed: boolean; held: boolean; buffer: number };
    fall: { course: CourseDef | null; island: Terrain | null; drift: Drift | null };
  } | null>(null);
  const ambienceEvents = useMemo<AmbienceEvents>(
    () => ({
      voice: events.onVoice,
      warpNearby: events.onWarpNearby,
      bell: () => {
        const p = sim.current.pos;
        fx.current?.confetti(p.x, p.y, p.z);
        // the island's sky follows the local clock, so "midnight" is the ringer's
        const midnight = debugSeam?.night === true || skyAt(Date.now()).night > MIDNIGHT;
        const opened = midnight && openSky(skyNow(), SKY_OPEN_SECONDS, true);
        events.onBell(midnight, opened);
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
      placePlayer(s, arrival.x, groundAt(region, arrival.x, arrival.z, 0).height, arrival.z);
      resetAmbience(ambience.current, s.pos.x, ambienceEvents);
      if (island) {
        // a shimmer where you land (portal arrivals and warps alike)
        fx.current?.ripple(s.pos.x, s.pos.y, s.pos.z, "#7fd8ff");
        fx.current?.notes(s.pos.x, s.pos.y, s.pos.z, "#7fd8ff");
      }
      portalArmed.current = false;
      if (regionFrames.current.region !== region) {
        regionFrames.current = { region, frames: framesFor(region, { caveLight }) };
      }
      for (const frame of regionFrames.current.frames) frame.enter?.(state.clock.getElapsedTime());
      camera.position.copy(s.pos).add(cameraOffset);
      lookTarget.current.set(s.pos.x, s.pos.y + 0.6, s.pos.z - 1.2);
      enterBalls(frames.current.balls, region.id, spawns);
    }

    // playtests (development only): jump straight to a spot
    if (debugSeam?.teleport) {
      const { x, y, z } = debugSeam.teleport;
      debugSeam.teleport = null;
      placePlayer(s, x, y, z);
    }

    // the sky's star steps come and go: settle what's solid before anything moves
    const skyClock = skyNow();
    if (island) tickSky(skyClock);

    const now = state.clock.getElapsedTime();
    perFrame.current ??= {
      ctx: { s, dt, now, region, events, fx: null },
      inputs: {
        landing: null,
        steering: false,
        sitting: false,
        skyClock: 0,
        cosmicCrown: false,
        hasNecklace: false,
        scene,
        hemi: null,
      },
      walk: { bounds: BOUNDS, course: null, island: null, props: [], players: [] },
      jump: { pressed: false, held: false, buffer: JUMP_BUFFER },
      fall: { course: null, island: null, drift: null },
    };
    const reused = perFrame.current;
    const ctx = reused.ctx;
    ctx.s = s;
    ctx.dt = dt;
    ctx.now = now;
    ctx.region = region;
    ctx.events = events;
    ctx.fx = fx.current;
    // anything that moves on its own goes first (a course's sliding and crumbling steps, its dragon)
    const { frames: steps } = regionFrames.current;
    for (const frame of steps) frame.before?.(ctx);

    // --- walking, then body language
    // what you walk among this frame (other players move, so it's refilled every frame)
    const walkEnv = reused.walk;
    walkEnv.bounds = course ? course.bounds : (region.bounds ?? BOUNDS);
    walkEnv.course = course;
    walkEnv.island = terrain;
    walkEnv.props = solids;
    walkEnv.players = remotes.current.values();
    const { speed, steering } = walk(s, keys, dt, walkEnv, motion.current);
    const m = motion.current;
    bodyLanguage(s, m, dt, speed);
    m.emote = emote;
    if (emote && steering) events.onEmoteCancel();

    // --- jumping, falling, landing
    const ground = groundAt(region, s.pos.x, s.pos.z, s.pos.y);
    const jump = reused.jump;
    jump.pressed = takeJump();
    jump.held = keys.jumpHeld;
    const fall = reused.fall;
    fall.course = course;
    fall.island = terrain;
    fall.drift = island ? SKY_DRIFT : null;
    const landing = jumpAndFall(s, m, dt, ground, jump, fall);
    if (landing && landing.impact > HARD_LANDING) fx.current?.dust(s.pos.x, s.pos.y, s.pos.z);
    // the region's own rules once you've moved (the island's secrets, the cave, the dream…)
    const inputs = reused.inputs;
    inputs.landing = landing;
    inputs.steering = steering;
    inputs.sitting = emote === "sit";
    inputs.skyClock = skyClock;
    inputs.cosmicCrown = cosmicCrown;
    inputs.hasNecklace = hasNecklace;
    inputs.scene = scene;
    inputs.hemi = hemi.current;
    for (const frame of steps) frame.after?.(ctx, inputs);
    // squash on landing eases out; stretch while rising fast
    m.land = Math.max(0, m.land - dt * 4);
    m.stretch = s.airborne ? THREE.MathUtils.clamp(s.vy / JUMP_SPEED, -0.4, 1) : 0;

    // --- what's underfoot: nothing is pressed while in the air
    const midi = s.airborne ? null : ground.midi;
    if (!s.airborne && ground.platform !== s.platform) {
      s.platform = ground.platform;
      events.onPlatform(ground.platform);
    }
    // island terrain you walk onto plays its own instrument (drums sound on landing, above)
    const solidUnder = s.airborne ? null : ground.solid;
    if (terrain && solidUnder !== s.solid) {
      s.solid = solidUnder;
      const piece = solidUnder === null ? null : terrain.solids[solidUnder];
      if (piece?.sound && !piece.bounce) {
        events.onVoice(piece.sound.voice, piece.sound.midi, 0.75);
        if (piece.tag) islandHits.set(piece.tag, now);
        fx.current?.notes(s.pos.x, s.pos.y, s.pos.z, region.theme.accent);
      }
    }
    if (midi !== s.midi) {
      s.midi = midi;
      events.onStep(midi);
      // my whale sings along now and then, an octave up
      if (midi !== null && appearance.pet && Math.random() < PET_ECHO_CHANCE) events.onVoice("crystal", midi + 12, 0.3);
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

    // --- note balls, shared with the channel
    stepBallsFrame(ctx, frames.current.balls, solids, { takeBallNews, sendBall });

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
        isWalkThrough(portal) &&
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
      petGlow.current = sky.night;
      applySky(scene, light.current, hemi.current, sky);
      sunAim.current.dir.set(...sky.lightDir);
    } else if (!island) {
      sunAim.current.dir.set(0.4, 0.8, 0.45).normalize();
      petGlow.current = region.theme.petGlow ?? (region.theme.dark ? 0.6 : 0);
    }
    if (light.current) {
      aimSunLight(light.current, sunAim.current, s.pos, { extent: SHADOW_EXTENT, mapSize: quality.shadowMap, distance: SHADOW_DISTANCE });
    }

    // The camera follows the ground you stand on (not your jumps); the course climbs with you
    const follow = 1 - Math.exp(-dt * 4);
    // …except a long drift down from the sky, which it rides along
    const cameraY = course || s.drifting ? s.pos.y : terrain ? s.restY : 0;
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

      <RegionScene
        region={region}
        player={playerPos}
        pressed={pressed}
        rewards={rewards}
        caveLight={caveLight}
        hasNecklace={hasNecklace}
        cosmicCrown={cosmicCrown}
        remotes={remotes}
        awake={awake}
        skyFound={skyFound}
        dreamFound={dreamFound}
      />
      <RegionDecor region={region.id} party={interaction.party} pressed={pressed} />
      {items.map((item) => {
        switch (item.id) {
          case "cat":
            return (
              <PianoCat
                key={item.id}
                petting={interaction.petting}
                walkedAt={interaction.catWalkedAt}
                onKey={(midi) => {
                  cat.current.key = midi;
                }}
                onPosition={(position) => {
                  cat.current.pos.copy(position);
                  if (debugSeam) debugSeam.cat = { x: position.x, z: position.z };
                }}
                onSignal={(position) => {
                  if (playerPos.distanceTo(position) < CAT_SIGNAL_EARSHOT) events.onCatSignal();
                }}
              />
            );
          case "chordCard":
            return <ChordCardStand key={item.id} item={item} />;
          case "teacher":
            return <Teacher key={item.id} item={item} />;
          case "musicBox":
            return <MusicBox key={item.id} item={item} playing={interaction.musicBoxPlaying} />;
          case "jukebox":
            return <Jukebox key={item.id} item={item} playing />;
          case "discoBall":
            return <DiscoBall key={item.id} item={item} party={interaction.party} />;
        }
      })}
      {region.portals
        .filter(isDrawn)
        .map((portal) => (
          <Portal key={`${portal.to}-${portal.x}`} portal={portal} glow={region.theme.dark} />
        ))}
      {target !== null ? <TargetBeam midi={target} color={region.theme.accent} /> : null}
      <StepEffects ref={fx} />
      {spawns.map((_, i) => (
        <NoteBall
          key={`${region.id}-${i}`}
          accent={region.theme.accent}
          ref={(el) => {
            frames.current.balls.meshes[i] = el;
          }}
        />
      ))}

      {/* scaled up so the character reads at a glance against the giant keys */}
      <KordiModel ref={kordi} motion={motion} scale={KORDI_SCALE} appearance={appearance} glow={petGlow} />
      {course?.beams ? (
        // a small lantern Kordi carries through the dark
        <group ref={lantern}>
          <pointLight color="#ffd9a0" intensity={14} distance={7} decay={2} />
        </group>
      ) : null}
      <group ref={bubble}>{emote ? <EmoteBubble emote={emote} /> : null}</group>
      {others.map((other) => (
        <RemoteKordi key={other.id} id={other.id} name={other.name} remotes={remotes} course={course !== null} keys={region.keys} glow={petGlow} />
      ))}
    </>
  );
}
