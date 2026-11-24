import { expect, test } from "@playwright/test";
import { collectErrors, jumpUntilUp, openWorld, seedGuest, walkUntilMoved } from "./world";

/**
 * Every other kind of region loads, draws, and lets you walk and jump without
 * an error: a jump course, the dream sea, the cave. (The island has its own
 * test, island.spec.ts: its first frame is too slow to pay twice.)
 */
for (const region of ["night", "whale", "cave"]) {
  test(`${region}: loads and you can walk and jump`, async ({ page }) => {
    const errors = collectErrors(page);
    await seedGuest(page, { bests: { clouds: 60_000, night: 90_000 }, caveFound: true, dreamFound: true });
    await openWorld(page, region);

    await walkUntilMoved(page, "KeyW");
    await jumpUntilUp(page);

    expect(errors).toEqual([]);
  });
}
