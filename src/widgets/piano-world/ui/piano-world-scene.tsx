"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_APPEARANCE, characterQueries, type Appearance, type RewardId } from "@/entities/character";
import { cn } from "@/shared/lib/utils";
import type { PianoWorldCopy } from "./copy";
import { EMOTES } from "../engine/interactables";
import { WARP_STONES, warpArrival, type WarpStoneId } from "../engine/island";
import type { RegionDef, RegionFeature, RegionId } from "../engine/regions";
import { useCourseRun } from "./hooks/use-course-run";
import { useEmote } from "./hooks/use-emote";
import { useInteractions } from "./hooks/use-interactions";
import { useMelodyGame } from "./hooks/use-melody-game";
import { useRegionTravel } from "./hooks/use-region-travel";
import { useWorldAudio } from "../audio/use-world-audio";
import { useWorldControls } from "./hooks/use-world-controls";
import type { CaveReplyMessage, CourseRecordMessage } from "../net/protocol";
import { useWorldPresence } from "../net/use-world-presence";
import { useWarpStones } from "./hooks/use-warp-stones";
import { useAdaptiveQuality } from "./hooks/use-adaptive-quality";
import { useSkyEvents } from "./hooks/use-sky-events";
import { useDreamEvents } from "./hooks/use-dream-events";
import { useCaveEvents } from "./hooks/use-cave-events";
import { useMusicBoxEvents } from "./hooks/use-musicbox-events";
import type { WorldFeedback } from "./hooks/world-feedback";
import { PlaceBanner, usePlaceBanner } from "./hud/place-banner";
import { LOST_NOTES } from "../engine/dream-sea";
import { quality } from "./quality";
import { CourseCard, DreamCard, MelodyCard } from "./hud/progress-cards";
import { EmoteBar, InteractPrompt, SpeechBubble, WarpPrompt } from "./hud/interaction-hud";
import { NameChip, NoteDisplay, RegionLabel, StatusStack } from "./hud/status";
import { TouchControls } from "./hud/touch-controls";
import { WorldLoading } from "./hud/world-loading";
import { FirstFrames } from "./first-frames";
import { ChordCardPanel, WarpPanel, WishPanel } from "./interaction-panels";
import { World, type WorldDisplay, type WorldEvents } from "./world";
import { rememberGuestName, saveGuestName } from "./hooks/guest-name";

/** stable while a member's character loads, so the memoized display doesn't churn */
const NO_REWARDS: readonly RewardId[] = [];

/**
 * Kordi's piano world: walk the keys, hop between regions through portals,
 * play with what's around and see who else is here. This component only
 * composes — state lives in the ui/hooks/ hooks, the simulation in <World>, the
 * overlay in hud/.
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
  // the world renders on the client only (ssr: false), so storage is there on first render
  const [name, setName] = useState(() => (isGuest ? rememberGuestName(playerName) : playerName));
  const adaptive = useAdaptiveQuality();
  const [celebrate, setCelebrate] = useState(0);
  const bumpCelebrate = useCallback(() => setCelebrate((n) => n + 1), []);

  const { region, regionRef, arrival, fading, travel, warp } = useRegionTravel();
  const { awake, wake } = useWarpStones();
  const { banner, show: showBanner } = usePlaceBanner();
  /** the warp stone in reach, if any (the island only) */
  const [warpNearby, setWarpNearbyState] = useState<WarpStoneId | null>(null);
  /** the melody card only shows on the keyboard plaza */
  const [nearKeys, setNearKeys] = useState(true);
  /** the place whose scene has actually reached the screen (shaders compiled, first frame drawn) */
  const [drawnRegion, setDrawnRegion] = useState<RegionId | null>(null);
  /** the named place you're in on the island (shown as a banner on arrival) */
  const warpNearbyRef = useRef<WarpStoneId | null>(null);
  const melody = useMelodyGame(bumpCelebrate);
  const course = useCourseRun(bumpCelebrate, region.course?.id, !isGuest);
  const { emote, play: playEmote, cancel: cancelEmote, toggle: toggleEmote } = useEmote();
  const queryClient = useQueryClient();
  const { applyServerRecord } = course;
  const handleRecord = useCallback(
    (record: CourseRecordMessage) => {
      applyServerRecord(record);
      if (record.saved) void queryClient.invalidateQueries({ queryKey: ["ranking", "course", record.course] });
      // a first finish unlocks the crown and the server puts it on: refresh my look
      if (record.reward) void queryClient.invalidateQueries({ queryKey: characterQueries.me().queryKey });
    },
    [applyServerRecord, queryClient],
  );

  const { advance } = melody;
  const onStep = useCallback(
    (midi: number) => {
      if (regionRef.current.feature === "melody") advance(midi);
    },
    [advance, regionRef],
  );
  const audio = useWorldAudio(regionRef, onStep);
  const { handleStep, handleRemoteStep, handleCatStep, handleBallNote, voice } = audio;
  const { startAudio, isOn, chime, switchInstrument, silence, warpEffect, dragonEffect, towerBell, progression, syncMusic } =
    audio;
  // the region's background music follows the region and whether sound is on
  useEffect(() => {
    syncMusic(region.music);
  }, [syncMusic, region.music, audio.audio]);
  const audioApi = useMemo(() => ({ startAudio, isOn, chime }), [startAudio, isOn, chime]);
  const interactions = useInteractions(copy, audioApi, bumpCelebrate);
  const { interact, nearbyRef, panelRef, setPanel, setNearby, say, reset: resetInteractions } = interactions;

  /** how each region's events answer the player (sounds, a line, confetti) */
  const feedback = useMemo<WorldFeedback>(
    () => ({ copy, audio: { voice, progression, towerBell, warpEffect }, say, celebrate: bumpCelebrate }),
    [copy, voice, progression, towerBell, warpEffect, say, bumpCelebrate],
  );
  const sky = useSkyEvents(feedback);

  /** the cave's answer handler (the cave's hook needs presence first, so it's wired in below) */
  const caveReplyRef = useRef<(reply: CaveReplyMessage) => void>(() => {});
  /** The server gave me a reward item (members: the whale, the necklace): fetch my look, which now has it on. */
  const handleReward = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: characterQueries.me().queryKey });
  }, [queryClient]);
  const {
    remotes,
    takeBallNews,
    info: presenceInfo,
    sendPosition,
    sendBell,
    sendBall,
    sendWhale,
    sendCave,
  } = useWorldPresence(name, region.id, !isGuest, {
    onRecord: handleRecord,
    onBell: sky.handleRemoteBell,
    onReward: handleReward,
    onCaveReply: (reply) => caveReplyRef.current(reply),
  });

  /** I rang the bell: by day one stroke; at night midnight's twelve, and the channel hears it too. */
  const { ring } = sky;
  const handleBell = useCallback(
    (midnight: boolean, opened: boolean) => {
      ring(opened);
      if (midnight) sendBell();
    },
    [ring, sendBell],
  );

  const openWarp = useCallback(() => {
    const from = warpNearbyRef.current;
    if (from) setPanel({ kind: "warp", from });
  }, [setPanel]);

  /** Reaching a stone wakes it the first time (with a chime and a line). */
  const handleWarpNearby = useCallback(
    (id: WarpStoneId | null) => {
      warpNearbyRef.current = id;
      setWarpNearbyState(id);
      if (id && wake(id)) {
        say(copy.warpWoke.replace("{name}", copy.warpStones[id]));
        warpEffect("wake");
        bumpCelebrate();
      }
    },
    [wake, say, copy, warpEffect, bumpCelebrate],
  );

  const warpTo = useCallback(
    (to: WarpStoneId) => {
      const stone = WARP_STONES.find((s) => s.id === to);
      setPanel(null);
      if (!stone) return;
      silence();
      warpEffect("depart");
      warp(warpArrival(stone), () => warpEffect("arrive"));
    },
    [setPanel, silence, warp, warpEffect],
  );

  const { input, containerRef, visible, takeJump, pressDirection, pressJump } = useWorldControls({
    onGesture: startAudio,
    onInteract: () => {
      if (panelRef.current) return false;
      if (nearbyRef.current) {
        interact(nearbyRef.current);
        return true;
      }
      if (warpNearbyRef.current) {
        openWarp();
        return true;
      }
      return false;
    },
    onEmote: (index) => playEmote(EMOTES[index]),
    onEscape: () => {
      if (!panelRef.current) return false;
      setPanel(null);
      return true;
    },
  });

  const { handlePlatform: handleCoursePlatform, enter: enterCourse } = course;
  // Members wear what they chose (and earned) on the server; guests wear the best crown
  // they've earned in this browser, put on automatically
  const { data: character } = useQuery({ ...characterQueries.me(), enabled: !isGuest });
  const rewards = isGuest ? course.localRewards : (character?.unlocked ?? NO_REWARDS);
  const memberAppearance = character?.appearance;
  const inCave = region.feature === "cave";
  // guests don't pick a hat: owning the cosmic crown is enough (they put it on in the cave)
  const cosmicCrown = isGuest ? rewards.includes("star-crown") : memberAppearance?.hat === "star-crown";

  const online = presenceInfo.status === "online";
  const cave = useCaveEvents(feedback, { isGuest, inCave, online, cosmicCrown, rewards, sendCave, showBanner });
  const { handleReply: handleCaveReply } = cave;
  useEffect(() => {
    caveReplyRef.current = handleCaveReply;
  }, [handleCaveReply]);
  /** the portal hop, for the whale carrying you home (handlePortal is defined below) */
  const portalRef = useRef<(to: RegionId) => void>(() => {});
  const carryHome = useCallback(() => {
    if (regionRef.current.feature === "dream") portalRef.current("hall");
  }, [regionRef]);
  const dream = useDreamEvents(feedback, { isGuest, sendWhale, carryHome });
  const musicBox = useMusicBoxEvents(feedback, { showBanner });

  const { leave: leaveDream, enter: enterDream } = dream;
  const { enter: enterCave } = cave;
  const { enter: enterMusicBox, leave: leaveMusicBox } = musicBox;
  /** what each region's page side does as you come in (the scene's counterpart of the world's frames) */
  const arrivals = useMemo<Partial<Record<RegionFeature, (next: RegionDef) => void>>>(
    () => ({
      course: (next) => {
        if (next.course) enterCourse(next.course);
      },
      dream: enterDream,
      cave: enterCave,
      musicbox: enterMusicBox,
    }),
    [enterCourse, enterDream, enterCave, enterMusicBox],
  );
  const handlePortal = useCallback(
    (to: RegionId) =>
      travel(to, (next) => {
        leaveDream();
        leaveMusicBox();
        // you arrive on your feet (the statue takes you as you sit)
        cancelEmote();
        silence();
        resetInteractions();
        // every place you come to names itself across the screen (the cave and the music box
        // show their own line from their arrival, below, which replaces this one)
        const arrive = copy.regionArrive[next.id];
        if (arrive) showBanner(copy.regions[next.id], arrive, "place");
        arrivals[next.feature]?.(next);
        if (isOn()) switchInstrument(next.instrument);
      }),
    [
      travel,
      leaveDream,
      leaveMusicBox,
      cancelEmote,
      silence,
      resetInteractions,
      copy,
      showBanner,
      arrivals,
      isOn,
      switchInstrument,
    ],
  );
  useEffect(() => {
    portalRef.current = handlePortal;
  }, [handlePortal]);

  /** The cat settled on its spot: a soft two-note mew, for anyone near enough to wonder why. */
  const handleCatSignal = useCallback(() => {
    voice("crystal", 79, 0.45);
    setTimeout(() => voice("crystal", 74, 0.4), 260);
  }, [voice]);

  const handlePlatform = useCallback(
    (index: number | null) => {
      const active = regionRef.current.course;
      if (active) handleCoursePlatform(active, index);
    },
    [handleCoursePlatform, regionRef],
  );

  const rerollName = useCallback(() => {
    const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
    const next = `${pick(copy.nameAdjectives)} ${pick(copy.nameNouns)}`;
    setName(next);
    saveGuestName(next);
  }, [copy]);

  const events: WorldEvents = useMemo(
    () => ({
      onStep: handleStep,
      onRemoteStep: handleRemoteStep,
      onCatStep: handleCatStep,
      onBallNote: handleBallNote,
      onPlatform: handlePlatform,
      onPortal: handlePortal,
      onEmoteCancel: cancelEmote,
      onNearby: setNearby,
      onVoice: voice,
      onWarpNearby: handleWarpNearby,
      onNearKeys: setNearKeys,
      onDragon: dragonEffect,
      onBell: handleBell,
      onSky: sky.handleSky,
      onDream: dream.handleDream,
      onCatSignal: handleCatSignal,
      onCave: cave.handleCave,
      onStatueWake: musicBox.wake,
      onMusicBox: musicBox.handleMusicBox,
    }),
    [
      handleStep,
      handleRemoteStep,
      handleCatStep,
      handleBallNote,
      handlePlatform,
      handlePortal,
      cancelEmote,
      setNearby,
      voice,
      handleWarpNearby,
      dragonEffect,
      handleBell,
      sky.handleSky,
      dream.handleDream,
      handleCatSignal,
      cave.handleCave,
      musicBox.wake,
      musicBox.handleMusicBox,
    ],
  );

  const guestWhale = dream.guestWhale;
  const guestNecklace = cave.guestNecklace;
  const appearance = useMemo<Appearance>(
    () =>
      isGuest
        ? {
            ...DEFAULT_APPEARANCE,
            // the best crown earned: the storm temple's, then the night's, then the clouds' —
            // except in the cave, where the cosmic crown (if you have it) is the one that lights the way
            hat:
              (inCave && rewards.includes("star-crown")
                ? "star-crown"
                : (["flame-crown", "star-crown", "crown"] as const).find((hat) => rewards.includes(hat))) ?? null,
            accessory: guestNecklace ? "gold-necklace" : null,
            pet: guestWhale ? "moon-whale" : null,
          }
        : (memberAppearance ?? DEFAULT_APPEARANCE),
    [isGuest, rewards, guestWhale, guestNecklace, memberAppearance, inCave],
  );
  const hasNecklace = cave.hasNecklace;

  const target = region.feature === "melody" ? melody.target : null;
  const interactionScene = interactions.scene;
  const { dreamFound } = dream;
  const { skyFound } = sky;
  // memoized so a HUD-only re-render doesn't hand the 3D world a new object
  const display = useMemo<WorldDisplay>(
    () => ({
      emote,
      target,
      appearance,
      rewards,
      interaction: interactionScene,
      celebrate,
      awake,
      skyFound,
      dreamFound,
      hasNecklace,
      cosmicCrown,
    }),
    [emote, target, appearance, rewards, interactionScene, celebrate, awake, skyFound, dreamFound, hasNecklace, cosmicCrown],
  );

  const { panel } = interactions;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none select-none overscroll-none [-webkit-touch-callout:none]"
      // a touch pointerdown is not a user activation on iOS: unlock on the release/click too
      onPointerDown={startAudio}
      onPointerUp={startAudio}
      onTouchEnd={startAudio}
      onClick={startAudio}
    >
      <Canvas
        shadows={quality.shadows ? "percentage" : false}
        dpr={adaptive.dpr}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 12, 18], fov: 45, near: 0.1, far: 150 }}
      >
        {/* frames running slow step the quality ladder down; room to spare steps it back up
            (use-adaptive-quality.ts settles it when it keeps turning). The bounds are a share of
            the screen's refresh rate: drei's default asks for more than 60 fps on a 60 Hz screen
            to step back up, which vsync never gives. Its own flip-flop limit is off: it counts
            every step, so three steps down in a row would end the monitoring */}
        <PerformanceMonitor
          bounds={(refresh) => [refresh * 0.75, refresh * 0.95]}
          onDecline={adaptive.decline}
          onIncline={adaptive.incline}
          flipflops={Infinity}
        />
        <color attach="background" args={[region.theme.background]} />
        <fog attach="fog" args={[region.theme.background, ...region.theme.fog]} />
        <World
          region={region}
          arrival={arrival}
          input={input}
          takeJump={takeJump}
          presence={{ remotes, others: presenceInfo.others, sendPosition, takeBallNews, sendBall }}
          display={display}
          events={events}
        />
        <FirstFrames key={region.id} onDrawn={() => setDrawnRegion(region.id)} />
      </Canvas>

      <WorldLoading drawing={drawnRegion !== region.id} label={copy.worldDrawing} />

      {/* region transition */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-background transition-opacity duration-300 motion-reduce:transition-none",
          fading ? "opacity-100" : "opacity-0",
        )}
      />

      <RegionLabel region={region} copy={copy} />
      {region.feature === "melody" && nearKeys ? (
        <MelodyCard melody={melody.melody} progress={melody.progress} copy={copy} />
      ) : null}
      {region.feature === "course" ? <CourseCard run={course.run} isGuest={isGuest} copy={copy} /> : null}
      {region.feature === "dream" ? <DreamCard found={dream.notes} total={LOST_NOTES.length} sung={dream.sang} copy={copy} /> : null}
      <PlaceBanner banner={banner} />
      <NoteDisplay store={audio.noteStore} />
      <NameChip name={name} isGuest={isGuest} onReroll={rerollName} copy={copy} />
      <EmoteBar emote={emote} onToggle={toggleEmote} copy={copy} />
      <StatusStack info={presenceInfo} audio={audio.audio} copy={copy} />

      <SpeechBubble text={interactions.speech} />
      {panel ? null : interactions.nearby ? (
        <InteractPrompt
          nearby={interactions.nearby}
          onInteract={interact}
          copy={copy}
        />
      ) : warpNearby && region.island ? (
        <WarpPrompt onUse={openWarp} copy={copy} />
      ) : null}
      {panel?.kind === "chordCard" ? (
        <ChordCardPanel
          card={panel.card}
          copy={copy}
          onClose={() => setPanel(null)}
          onPlay={() => interactions.strum(panel.card.midi)}
        />
      ) : null}
      {panel?.kind === "warp" ? (
        <WarpPanel from={panel.from} awake={awake} copy={copy} onClose={() => setPanel(null)} onWarp={warpTo} />
      ) : null}
      {panel?.kind === "wish" ? (
        <WishPanel copy={copy} onClose={() => setPanel(null)} onSend={interactions.sendWish} />
      ) : null}

      <TouchControls onDirection={pressDirection} onJump={pressJump} />
    </div>
  );
}
