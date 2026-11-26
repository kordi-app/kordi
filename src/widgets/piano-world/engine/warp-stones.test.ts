import { describe, expect, it } from "vitest";
import { WARP_STONES } from "./island";
import { ALWAYS_AWAKE, awakeStones, stillToSend, toSend, warpStonesIn } from "./warp-stones";
import { WORLD_CONTRACT } from "./world-contract";

describe("warp stones", () => {
  it("are the ones the server keeps, and the plaza is awake from the start", () => {
    expect(WARP_STONES.map((s) => s.id)).toEqual(WORLD_CONTRACT.warpStones.stones);
    expect(ALWAYS_AWAKE).toEqual(["plaza"]);
  });

  it("are awake if the browser or the account has them, and the plaza always", () => {
    expect([...awakeStones([])]).toEqual(["plaza"]);
    expect(awakeStones(["drums"], ["tower", "plaza"])).toEqual(new Set(["plaza", "drums", "tower"]));
  });

  it("ignore anything stored or sent back that isn't a stone", () => {
    expect(warpStonesIn(["falls", "moon", 3, null])).toEqual(["falls"]);
    expect(warpStonesIn("drums")).toEqual([]);
    expect(awakeStones([], ["moon"])).toEqual(new Set(["plaza"]));
  });

  it("leave in the browser only what the account hasn't got yet", () => {
    // the drums were sent; the tower was woken while that request was out
    expect(stillToSend(["drums", "tower"], ["drums"])).toEqual(["tower"]);
    expect(stillToSend(["drums"], ["drums"])).toEqual([]);
  });

  it("send a guest's stones on signing in, but not the plaza", () => {
    expect(toSend(["plaza", "pipes", "falls"])).toEqual(["pipes", "falls"]);
    expect(toSend(["plaza"])).toEqual([]);
  });
});
