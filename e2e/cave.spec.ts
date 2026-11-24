import { expect, test } from "@playwright/test";
import { collectErrors, openWorld, seedGuest, teleport, where } from "./world";

/**
 * The cave of sleeping stars, as a guest wearing the cosmic crown: walk into the
 * illusory wall on the island's cliff, come into the cave under its banner, and
 * take the necklace from the altar once you've been in long enough.
 */
test("through the illusory wall to the necklace", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await seedGuest(page, { bests: { clouds: 60_000, night: 90_000 } });
  await openWorld(page, "hall");

  // pressed up against the cliff where the wall isn't (engine/cave.ts ILLUSORY_WALL)
  await teleport(page, { x: -75, y: 0, z: -45.5 });
  await page.waitForFunction(() => window.__kordi?.region === "cave", null, { timeout: 30_000 });
  await expect(page.getByText("별이 잠든 동굴", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("우주의 왕관이 잠든 별들을 깨워요")).toBeVisible();

  // on the dais top beside the pedestal; it's handed over after the server's minimum stay
  await teleport(page, { x: 0, y: 1.2, z: -50.6 });
  await expect(page.getByText("황금 목걸이", { exact: true })).toBeVisible({ timeout: 40_000 });
  expect((await where(page)).region).toBe("cave");

  expect(errors).toEqual([]);
});
