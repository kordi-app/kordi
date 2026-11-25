"use client";

import { memo } from "react";
import type * as THREE from "three";
import { CAVE, CLIFF, STREAM, WARP_STONES, type WarpStoneId } from "../engine/island";
import { STATUE } from "../engine/statue";
import { BellTower } from "./island/bell-tower";
import { DrumValley } from "./island/drum-valley";
import { Ground } from "./island/ground";
import { HarpFalls } from "./island/harp-falls";
import { NatureScene } from "./island/nature-scene";
import { NightLights } from "./island/night-lights";
import { PipeForest } from "./island/pipe-forest";
import { SkyIsland } from "./island/sky-island";
import { CatSpot } from "./island/cat-spot";
import { DreamingStatue } from "./island/dreaming-statue";
import { Zone } from "./island/shared";
import { WarpStoneMesh } from "./island/warp-stones";
import { XyloBridge } from "./island/xylo-bridge";

/**
 * Everything around the keyboard plaza. Static except for small reactions
 * the simulation triggers through islandHits, and the lamps and stars that
 * follow the day.
 */
export const IslandScene = memo(function IslandScene({
  player,
  awake,
  skyFound,
  dreamFound,
}: {
  /** Kordi's live position (mutated in place), for drawing only what's near */
  player: THREE.Vector3;
  awake: ReadonlySet<WarpStoneId>;
  skyFound: boolean;
  dreamFound: boolean;
}) {
  return (
    <group>
      <Ground />
      <NatureScene player={player} />
      <NightLights />
      <Zone x={STREAM.x + 2} z={0} player={player}>
        <XyloBridge />
      </Zone>
      <Zone x={72} z={0} player={player}>
        <DrumValley />
      </Zone>
      {/* the tower is the landmark: always drawn, so it's there on the horizon */}
      <BellTower player={player} />
      <SkyIsland found={skyFound} />
      <CatSpot found={dreamFound} />
      <Zone x={-60} z={0} player={player}>
        <PipeForest />
      </Zone>
      <Zone x={(CAVE.x0 + CAVE.x1) / 2} z={CLIFF.front} player={player}>
        <HarpFalls />
      </Zone>
      <Zone x={STATUE.x} z={STATUE.z} player={player}>
        <DreamingStatue />
      </Zone>
      {WARP_STONES.map((stone) => (
        <WarpStoneMesh key={stone.id} stone={stone} awake={awake.has(stone.id)} />
      ))}
    </group>
  );
});
