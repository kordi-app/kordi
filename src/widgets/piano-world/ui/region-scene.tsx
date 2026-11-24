"use client";

import type { RefObject } from "react";
import type * as THREE from "three";
import type { RewardId } from "@/entities/character";
import type { RegionDef } from "../engine/regions";
import type { WarpStoneId } from "../engine/island";
import type { RemotePlayer } from "../net/protocol";
import { CaveScene, IllusoryWall } from "./cave";
import { CourseScene } from "./course-scene";
import { DreamSea } from "./dream-sea";
import { REWARD_OF } from "./hooks/use-course-run";
import { IslandScene } from "./island-scene";
import { PianoFloor } from "./piano-floor";

export interface RegionSceneProps {
  region: RegionDef;
  /** Kordi's live position (renderers that follow or react to it) */
  player: THREE.Vector3;
  /** keys held down by everyone in the channel */
  pressed: RefObject<Set<number>>;
  rewards: readonly RewardId[];
  /** the cave's light, 0–1 (eased by the cave's frame) */
  caveLight: RefObject<number>;
  hasNecklace: boolean;
  cosmicCrown: boolean;
  remotes: RefObject<Map<string, RemotePlayer>>;
  awake: ReadonlySet<WarpStoneId>;
  skyFound: boolean;
  dreamFound: boolean;
}

/**
 * What a region is drawn on: a course's climb, the dream's sea of stars, the
 * cave's rock, or the keyboard floor; and on the island, the island itself
 * around the keys. The one place that picks a renderer by region.
 */
export function RegionScene(props: RegionSceneProps) {
  const { region, player } = props;
  return (
    <>
      <RegionGround {...props} />
      {region.island ? (
        <>
          <IslandScene player={player} awake={props.awake} skyFound={props.skyFound} dreamFound={props.dreamFound} />
          <IllusoryWall player={player} crowned={props.cosmicCrown} />
        </>
      ) : null}
    </>
  );
}

function RegionGround({ region, player, pressed, rewards, caveLight, hasNecklace, remotes }: RegionSceneProps) {
  if (region.course) {
    const course = region.course;
    return <CourseScene key={course.id} course={course} pressed={pressed} rewardOwned={rewards.includes(REWARD_OF[course.id])} />;
  }
  switch (region.feature) {
    case "dream":
      return <DreamSea player={player} />;
    case "cave":
      return <CaveScene player={player} light={caveLight} owned={hasNecklace} remotes={remotes} />;
    default:
      return <PianoFloor pressed={pressed} theme={region.theme} ground={!region.island} keys={region.keys} />;
  }
}
