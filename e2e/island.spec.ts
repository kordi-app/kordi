import { expect, test } from "@playwright/test";
import { collectErrors, jumpUntilUp, openWorld, seedGuest, teleport, walkUntilMoved, where } from "./world";

/**
 * The island (the grand hall) and the secret behind its cliff, in one visit:
 * the island's first frame is the slowest thing these tests do on a CPU
 * renderer (it compiles every shader on the island), so it's paid once.
 *
 * As a guest wearing the cosmic crown: walk and jump on the island, walk into
 * the illusory wall, come into the cave under its banner, and take the
 * necklace from the altar once you've been in long enough.
 */
test("the island, then through the illusory wall to the necklace", async ({ page }) => {
  test.slow(); // the island's first frame, plus the cave's minimum stay
  const errors = collectErrors(page);
  await seedGuest(page, { bests: { clouds: 60_000, night: 90_000 } });
  await openWorld(page, "hall");

  await test.step("walk and jump on the island", async () => {
    await walkUntilMoved(page, "KeyW");
    await jumpUntilUp(page);
  });

  await test.step("pet the cat three times and it shows the way to its spot", async () => {
    // engine/cat-walk.ts SECRET_SPOT
    const spot = { x: -11, z: 30 };
    const catToSpot = async () => {
      const cat = await page.evaluate(() => window.__kordi!.cat!);
      return Math.hypot(cat.x - spot.x, cat.z - spot.z);
    };
    const before = await catToSpot();
    for (let i = 0; i < 3; i++) {
      // stand right by it (it wanders the keys) and pet it
      const cat = await page.evaluate(() => window.__kordi!.cat!);
      await teleport(page, { x: cat.x, y: 0.5, z: cat.z + 0.8 });
      await page.waitForTimeout(400);
      await page.keyboard.press("KeyE");
      await page.waitForTimeout(1_800); // it holds still while it's petted
    }
    await expect(page.getByText("고양이가 꼬리를 세우고 어딘가로 걸어가요", { exact: false })).toBeVisible();
    await expect.poll(catToSpot, { timeout: 20_000 }).toBeLessThan(before - 3);
  });

  await test.step("walk into the illusory wall", async () => {
    // pressed up against the cliff where the wall isn't (engine/cave.ts ILLUSORY_WALL)
    await teleport(page, { x: -75, y: 0, z: -45.5 });
    await page.waitForFunction(() => window.__kordi?.region === "cave", null, { timeout: 60_000 });
    await expect(page.getByText("별이 잠든 동굴", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("우주의 왕관이 잠든 별들을 깨워요")).toBeVisible();
  });

  await test.step("take the necklace", async () => {
    // on the dais top beside the pedestal; it's handed over after the server's minimum stay
    await teleport(page, { x: 0, y: 1.2, z: -50.6 });
    await expect(page.getByText("황금 목걸이", { exact: true })).toBeVisible({ timeout: 60_000 });
    expect((await where(page)).region).toBe("cave");
  });

  expect(errors).toEqual([]);
});
