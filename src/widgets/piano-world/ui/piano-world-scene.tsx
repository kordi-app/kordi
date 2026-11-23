"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_APPEARANCE, characterQueries, type Appearance } from "@/entities/character";
import { cn } from "@/shared/lib/utils";
import type { PianoWorldCopy } from "./copy";
import { EMOTES } from "../engine/interactables";
import { WARP_STONES, warpArrival, type WarpStoneId } from "../engine/island";
import type { RegionId } from "../engine/regions";
import { useCourseRun } from "./hooks/use-course-run";
import { useEmote } from "./hooks/use-emote";
import { useInteractions } from "./hooks/use-interactions";
import { useMelodyGame } from "./hooks/use-melody-game";
import { useRegionTravel } from "./hooks/use-region-travel";
import { useWorldAudio } from "../audio/use-world-audio";
import { useWorldControls } from "./hooks/use-world-controls";
import type { CourseRecordMessage } from "../net/protocol";
import { useWorldPresence } from "../net/use-world-presence";
import { useWarpStones } from "./hooks/use-warp-stones";
import { quality } from "./quality";
import { CourseCard, MelodyCard } from "./hud/progress-cards";
import { EmoteBar, InteractPrompt, SpeechBubble, WarpPrompt } from "./hud/interaction-hud";
import { NameChip, NoteDisplay, RegionLabel, StatusStack } from "./hud/status";
import { TouchControls } from "./hud/touch-controls";
import { ChordCardPanel, WarpPanel, WishPanel } from "./interaction-panels";
import { World, type WorldDisplay, type WorldEvents } from "./world";

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
  const [name, setName] = useState(playerName);
  const [celebrate, setCelebrate] = useState(0);
  const bumpCelebrate = useCallback(() => setCelebrate((n) => n + 1), []);

  const { region, regionRef, arrival, fading, travel, warp } = useRegionTravel();
  const { awake, wake } = useWarpStones();
  /** the warp stone in reach, if any (the island only) */
  const [warpNearby, setWarpNearbyState] = useState<WarpStoneId | null>(null);
  /** the melody card only shows on the keyboard plaza */
  const [nearKeys, setNearKeys] = useState(true);
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
  const { remotes, info: presenceInfo, sendPosition } = useWorldPresence(name, region.id, !isGuest, handleRecord);

  const { advance } = melody;
  const onStep = useCallback(
    (midi: number) => {
      if (regionRef.current.feature === "melody") advance(midi);
    },
    [advance, regionRef],
  );
  const audio = useWorldAudio(regionRef, onStep);
  const { startAudio, isOn, chime, switchInstrument, silence, warpEffect, syncMusic } = audio;
  // the region's background music follows the region and whether sound is on
  useEffect(() => {
    syncMusic(region.music);
  }, [syncMusic, region.music, audio.audio]);
  const audioApi = useMemo(() => ({ startAudio, isOn, chime }), [startAudio, isOn, chime]);
  const interactions = useInteractions(copy, audioApi, bumpCelebrate);
  const { interact, nearbyRef, panelRef, setPanel, setNearby, say, reset: resetInteractions } = interactions;

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
  const handlePortal = useCallback(
    (to: RegionId) =>
      travel(to, (next) => {
        silence();
        resetInteractions();
        if (next.course) enterCourse(next.course);
        if (isOn()) switchInstrument(next.instrument);
      }),
    [travel, silence, resetInteractions, isOn, switchInstrument, enterCourse],
  );

  const handlePlatform = useCallback(
    (index: number | null) => {
      const active = regionRef.current.course;
      if (active) handleCoursePlatform(active, index);
    },
    [handleCoursePlatform, regionRef],
  );

  const rerollName = useCallback(() => {
    const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
    setName(`${pick(copy.nameAdjectives)} ${pick(copy.nameNouns)}`);
  }, [copy]);

  const { handleStep, handleRemoteStep, handleCatStep, handleBallNote, voice } = audio;
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
    ],
  );

  // Members wear what they chose (and earned) on the server; guests wear the best crown
  // they've earned in this browser, put on automatically
  const { data: character } = useQuery({ ...characterQueries.me(), enabled: !isGuest });
  const rewards = isGuest ? course.localRewards : (character?.unlocked ?? []);
  const appearance: Appearance = isGuest
    ? {
        ...DEFAULT_APPEARANCE,
        hat: rewards.includes("star-crown") ? "star-crown" : rewards.includes("crown") ? "crown" : null,
      }
    : (character?.appearance ?? DEFAULT_APPEARANCE);

  const display: WorldDisplay = {
    emote,
    target: region.feature === "melody" ? melody.target : null,
    appearance,
    rewards,
    interaction: interactions.scene,
    celebrate,
    awake,
  };

  const { panel } = interactions;

  return (
    <div ref={containerRef} className="relative h-full w-full" onPointerDown={startAudio}>
      <Canvas
        shadows="percentage"
        dpr={quality.dpr}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 12, 18], fov: 45, near: 0.1, far: 150 }}
      >
        <color attach="background" args={[region.theme.background]} />
        <fog attach="fog" args={[region.theme.background, ...region.theme.fog]} />
        <World
          region={region}
          arrival={arrival}
          input={input}
          takeJump={takeJump}
          presence={{ remotes, others: presenceInfo.others, sendPosition }}
          display={display}
          events={events}
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

      <RegionLabel region={region} copy={copy} />
      {region.feature === "melody" && nearKeys ? (
        <MelodyCard melody={melody.melody} progress={melody.progress} copy={copy} />
      ) : null}
      {region.feature === "course" ? <CourseCard run={course.run} isGuest={isGuest} copy={copy} /> : null}
      <NoteDisplay note={audio.note} />
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
