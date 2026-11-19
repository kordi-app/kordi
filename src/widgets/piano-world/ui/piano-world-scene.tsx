"use client";

import { useCallback, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { cn } from "@/shared/lib/utils";
import type { PianoWorldCopy } from "../model/copy";
import { EMOTES } from "../model/interactables";
import type { RegionId } from "../model/regions";
import { useCourseRun } from "../lib/use-course-run";
import { useEmote } from "../lib/use-emote";
import { useInteractions } from "../lib/use-interactions";
import { useMelodyGame } from "../lib/use-melody-game";
import { useRegionTravel } from "../lib/use-region-travel";
import { useWorldAudio } from "../lib/use-world-audio";
import { useWorldControls } from "../lib/use-world-controls";
import { useWorldPresence } from "../lib/use-world-presence";
import { CourseCard, MelodyCard } from "./hud/progress-cards";
import { EmoteBar, InteractPrompt, SpeechBubble } from "./hud/interaction-hud";
import { NameChip, NoteDisplay, RegionLabel, StatusStack } from "./hud/status";
import { TouchControls } from "./hud/touch-controls";
import { ChordCardPanel, WishPanel } from "./interaction-panels";
import { World, type WorldDisplay, type WorldEvents } from "./world";

/**
 * Kordi's piano world: walk the keys, hop between regions through portals,
 * play with what's around and see who else is here. This component only
 * composes — state lives in the lib/ hooks, the simulation in <World>, the
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

  const { region, regionRef, arrival, fading, travel } = useRegionTravel();
  const melody = useMelodyGame(bumpCelebrate);
  const course = useCourseRun(bumpCelebrate);
  const { emote, play: playEmote, cancel: cancelEmote, toggle: toggleEmote } = useEmote();
  const { remotes, info: presenceInfo, sendPosition } = useWorldPresence(name, region.id);

  const { advance } = melody;
  const onStep = useCallback(
    (midi: number) => {
      if (regionRef.current.feature === "melody") advance(midi);
    },
    [advance, regionRef],
  );
  const audio = useWorldAudio(regionRef, onStep);
  const { startAudio, isOn, chime, switchInstrument, silence } = audio;
  const audioApi = useMemo(() => ({ startAudio, isOn, chime }), [startAudio, isOn, chime]);
  const interactions = useInteractions(copy, audioApi, bumpCelebrate);
  const { interact, nearbyRef, panelRef, setPanel, setNearby, reset: resetInteractions } = interactions;

  const { input, containerRef, visible, takeJump, pressDirection, pressJump } = useWorldControls({
    onGesture: startAudio,
    onInteract: () => {
      if (!nearbyRef.current || panelRef.current) return false;
      interact(nearbyRef.current);
      return true;
    },
    onEmote: (index) => playEmote(EMOTES[index]),
    onEscape: () => {
      if (!panelRef.current) return false;
      setPanel(null);
      return true;
    },
  });

  const handlePortal = useCallback(
    (to: RegionId) =>
      travel(to, (next) => {
        silence();
        resetInteractions();
        if (isOn()) switchInstrument(next.instrument);
      }),
    [travel, silence, resetInteractions, isOn, switchInstrument],
  );

  const { handlePlatform: handleCoursePlatform } = course;
  const handlePlatform = useCallback(
    (index: number | null) => {
      if (regionRef.current.feature === "course") handleCoursePlatform(index);
    },
    [handleCoursePlatform, regionRef],
  );

  const rerollName = useCallback(() => {
    const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
    setName(`${pick(copy.nameAdjectives)} ${pick(copy.nameNouns)}`);
  }, [copy]);

  const { handleStep, handleRemoteStep, handleCatStep, handleBallNote } = audio;
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
    }),
    [handleStep, handleRemoteStep, handleCatStep, handleBallNote, handlePlatform, handlePortal, cancelEmote, setNearby],
  );

  const display: WorldDisplay = {
    emote,
    target: region.feature === "melody" ? melody.target : null,
    crowned: course.crowned,
    interaction: interactions.scene,
    celebrate,
  };

  const { panel } = interactions;

  return (
    <div ref={containerRef} className="relative h-full w-full" onPointerDown={startAudio}>
      <Canvas
        shadows
        dpr={[1, 2]}
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
      {region.feature === "melody" ? (
        <MelodyCard melody={melody.melody} progress={melody.progress} copy={copy} />
      ) : null}
      {region.feature === "course" ? <CourseCard run={course.run} copy={copy} /> : null}
      <NoteDisplay note={audio.note} />
      <NameChip name={name} isGuest={isGuest} onReroll={rerollName} copy={copy} />
      <EmoteBar emote={emote} onToggle={toggleEmote} copy={copy} />
      <StatusStack info={presenceInfo} audio={audio.audio} copy={copy} />

      <SpeechBubble text={interactions.speech} />
      {panel ? null : (
        <InteractPrompt
          nearby={interactions.nearby}
          jukeboxPlaying={interactions.scene.jukeboxPlaying}
          onInteract={interact}
          copy={copy}
        />
      )}
      {panel?.kind === "chordCard" ? (
        <ChordCardPanel
          card={panel.card}
          copy={copy}
          onClose={() => setPanel(null)}
          onPlay={() => interactions.strum(panel.card.midi)}
        />
      ) : null}
      {panel?.kind === "wish" ? (
        <WishPanel copy={copy} onClose={() => setPanel(null)} onSend={interactions.sendWish} />
      ) : null}

      <TouchControls onDirection={pressDirection} onJump={pressJump} />
    </div>
  );
}
