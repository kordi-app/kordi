"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_APPEARANCE, characterQueries, type Appearance, type RewardId } from "@/entities/character";
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
import { useSkyFound } from "./hooks/use-sky-found";
import { useDreamSea } from "./hooks/use-dream-sea";
import { useCave } from "./hooks/use-cave";
import type { CaveEvent } from "../engine/cave";
import { PlaceBanner, usePlaceBanner } from "./hud/place-banner";
import { LOST_NOTES, SERVER_MIN_STAY_SECONDS, WHALE_SONG, dreamRuntime, type DreamEvent } from "../engine/dream-sea";
import { midiToNoteName } from "@/shared/lib/music";
import { PROGRESSION, openSky, skyNow, skyRuntime, syncSky, type SkyEvent } from "../engine/sky-island";
import { quality } from "./quality";
import { CourseCard, DreamCard, MelodyCard } from "./hud/progress-cards";
import { EmoteBar, InteractPrompt, SpeechBubble, WarpPrompt } from "./hud/interaction-hud";
import { NameChip, NoteDisplay, RegionLabel, StatusStack } from "./hud/status";
import { TouchControls } from "./hud/touch-controls";
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
  const [celebrate, setCelebrate] = useState(0);
  const bumpCelebrate = useCallback(() => setCelebrate((n) => n + 1), []);

  const { region, regionRef, arrival, fading, travel, warp } = useRegionTravel();
  const { awake, wake } = useWarpStones();
  const { found: skyFound, markFound: markSkyFound } = useSkyFound();
  const dreamSea = useDreamSea();
  const { markFound: markDreamFound, adoptGuestWhale } = dreamSea;
  const cave = useCave();
  const { markFound: markCaveFound, takeGuestNecklace } = cave;
  const { banner, show: showBanner } = usePlaceBanner();
  /** notes found on this visit to the dream sea (for the card) */
  const [dreamNotes, setDreamNotes] = useState(0);
  const [whaleSang, setWhaleSang] = useState(false);
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

  /** Someone in the channel rang the midnight bell (or I joined while the stars were out). */
  const handleRemoteBell = useCallback(
    (leftMs: number, rung: boolean) => {
      if (!rung) {
        syncSky(skyNow(), leftMs / 1000);
        return;
      }
      const opened = openSky(skyNow(), leftMs / 1000, true);
      towerBell(opened ? 12 : 1);
      if (opened) say(copy.skyOpened);
    },
    [towerBell, say, copy],
  );
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
  } = useWorldPresence(name, region.id, !isGuest, handleRecord, handleRemoteBell, handleReward);

  /** I rang the bell: by day one stroke; at night midnight's twelve, and the channel hears it too. */
  const handleBell = useCallback(
    (midnight: boolean, opened: boolean) => {
      towerBell(opened ? 12 : 1);
      if (opened) say(copy.skyOpened);
      if (midnight) sendBell();
    },
    [towerBell, say, copy, sendBell],
  );

  const handleSky = useCallback(
    (event: SkyEvent) => {
      switch (event.kind) {
        case "pad":
          voice("crystal", event.midi, 0.7);
          break;
        case "constellation":
          // the last one's chord is the start of the orrery's progression instead
          if (!skyRuntime.done.every(Boolean)) progression([PROGRESSION[event.index]]);
          break;
        case "finished":
          progression(PROGRESSION);
          markSkyFound();
          bumpCelebrate();
          say(copy.skyFound);
          break;
      }
    },
    [voice, progression, markSkyFound, bumpCelebrate, say, copy],
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
  /** the whale carrying you home from the dream sea (cancelled by any trip, so it can't fire on a later visit) */
  const homeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** telling the server the whale sang, held back until it will believe it */
  const whaleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(homeTimer.current);
      clearTimeout(whaleTimer.current);
    },
    [],
  );
  /** a member took the necklace and the server hasn't answered yet (see the effect below) */
  const [necklacePending, setNecklacePending] = useState(false);
  /** whether I carry the cosmic crown's light, for callbacks that shouldn't re-subscribe to my look */
  const crownedRef = useRef(false);
  /** when I reached the dream sea (its socket opens with the region) */
  const dreamArrivedAt = useRef(0);
  useEffect(() => {
    if (region.dream) dreamArrivedAt.current = performance.now();
  }, [region.dream]);
  const handlePortal = useCallback(
    (to: RegionId) =>
      travel(to, (next) => {
        clearTimeout(homeTimer.current);
        clearTimeout(whaleTimer.current);
        silence();
        resetInteractions();
        if (next.course) enterCourse(next.course);
        if (next.dream) {
          // you found the cat's way in: from now on a link (or the pawprints) can bring you back
          markDreamFound();
          setDreamNotes(0);
          setWhaleSang(false);
          warpEffect("arrive");
        }
        if (next.cave) {
          // you walked through the wall: a link can bring you back from now on
          markCaveFound();
          warpEffect("arrive");
          showBanner(copy.regions.cave, crownedRef.current ? copy.caveLit : copy.caveDark, "place");
        }
        if (isOn()) switchInstrument(next.instrument);
      }),
    [travel, silence, resetInteractions, isOn, switchInstrument, enterCourse, markDreamFound, markCaveFound, warpEffect, showBanner, copy],
  );

  /** In the cave: a star rest woken, a fall into the abyss, the necklace taken. */
  const handleCave = useCallback(
    (event: CaveEvent) => {
      switch (event.kind) {
        case "rest":
          voice("crystal", 76, 0.6);
          setTimeout(() => voice("crystal", 83, 0.5), 180);
          say(copy.caveRest);
          return;
        case "fell":
          voice("bell", 38, 0.35);
          return;
        case "necklace": {
          // a slow golden arpeggio as it settles on you
          progression([[62, 66, 69, 74]]);
          bumpCelebrate();
          showBanner(copy.necklaceTitle, isGuest ? `${copy.necklaceFound} · ${copy.necklaceGuestNote}` : copy.necklaceFound, "treasure");
          // the world only hands it over once the server will believe it; members tell it now
          if (isGuest) takeGuestNecklace();
          else setNecklacePending(true);
        }
      }
    },
    [voice, say, copy, progression, bumpCelebrate, showBanner, isGuest, takeGuestNecklace],
  );

  /** In the dream sea: a lost note found, or the whale come to sing (and carry you home). */
  const handleDream = useCallback(
    (event: DreamEvent) => {
      if (event.kind === "note") {
        voice("crystal", event.midi, 0.85);
        const found = dreamRuntime.found.filter(Boolean).length;
        setDreamNotes(found);
        say(found >= LOST_NOTES.length ? copy.dreamReady : copy.dreamNote.replace("{note}", midiToNoteName(event.midi)));
        return;
      }
      setWhaleSang(true);
      // the whale sings its song whole again, low and slow
      progression(WHALE_SONG.map((midi) => [midi - 24, midi]));
      bumpCelebrate();
      if (isGuest) adoptGuestWhale();
      say(isGuest ? `${copy.whaleSings} · ${copy.petGuestNote}` : copy.whaleSings);
      // members: the server only believes it after a minute here (plus a margin for lag)
      const wait = Math.max(0, SERVER_MIN_STAY_SECONDS * 1000 + 1500 - (performance.now() - dreamArrivedAt.current));
      clearTimeout(whaleTimer.current);
      whaleTimer.current = setTimeout(sendWhale, wait);
      // then it carries you home (never before the server has heard)
      clearTimeout(homeTimer.current);
      homeTimer.current = setTimeout(
        () => {
          if (regionRef.current.dream) {
            warpEffect("depart");
            handlePortal("hall");
          }
        },
        Math.max(11_000, wait + 1500),
      );
    },
    [voice, say, copy, progression, bumpCelebrate, sendWhale, isGuest, adoptGuestWhale, regionRef, warpEffect, handlePortal],
  );

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
      onSky: handleSky,
      onDream: handleDream,
      onCatSignal: handleCatSignal,
      onCave: handleCave,
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
      handleSky,
      handleDream,
      handleCatSignal,
      handleCave,
    ],
  );

  // Members wear what they chose (and earned) on the server; guests wear the best crown
  // they've earned in this browser, put on automatically
  const { data: character } = useQuery({ ...characterQueries.me(), enabled: !isGuest });
  const rewards = isGuest ? course.localRewards : (character?.unlocked ?? NO_REWARDS);
  const guestWhale = dreamSea.guestWhale;
  const guestNecklace = cave.guestNecklace;
  const memberAppearance = character?.appearance;
  const inCave = region.cave === true;
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
  const hasNecklace = isGuest ? guestNecklace : rewards.includes("gold-necklace");
  // guests don't pick a hat: owning the cosmic crown is enough (they put it on in the cave)
  const cosmicCrown = isGuest ? rewards.includes("star-crown") : appearance.hat === "star-crown";
  useEffect(() => {
    crownedRef.current = cosmicCrown;
  }, [cosmicCrown]);
  // a member's take: tell the server, and keep telling it while still in the cave until the
  // necklace shows up in my unlocks. The server checks where it last heard I was, which can lag
  // a step behind (positions go out 10×/s), so it may say no at first; a dropped connection or a
  // fresh socket it doesn't trust yet too. Leave and come back, and the altar offers it again.
  useEffect(() => {
    if (!necklacePending || !inCave || hasNecklace) return;
    sendCave();
    const retry = setInterval(sendCave, 1_000);
    return () => clearInterval(retry);
  }, [necklacePending, inCave, hasNecklace, sendCave]);

  const target = region.feature === "melody" ? melody.target : null;
  const interactionScene = interactions.scene;
  const dreamFound = dreamSea.found;
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
      className="relative h-full w-full"
      // a touch pointerdown is not a user activation on iOS: unlock on the release/click too
      onPointerDown={startAudio}
      onPointerUp={startAudio}
      onTouchEnd={startAudio}
      onClick={startAudio}
    >
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
          presence={{ remotes, others: presenceInfo.others, sendPosition, takeBallNews, sendBall }}
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
      {region.dream ? <DreamCard found={dreamNotes} total={LOST_NOTES.length} sung={whaleSang} copy={copy} /> : null}
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
