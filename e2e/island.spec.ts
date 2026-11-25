import { expect, test } from "@playwright/test";
import { collectErrors, jumpUntilUp, openWorld, seedGuest, teleport, walkUntilMoved, where } from "./world";

/**
 * The island (the grand hall) and the secret behind its cliff, in one visit:
 * the island's first frame is the slowest thing these tests do on a CPU
 * renderer (it compiles every shader on the island), so it's paid once.
 *
 * As a guest wearing the cosmic crown: walk and jump on the island, sit before
 * the dreaming statue and step the music box's tune back together, come home
 * by its winding key, walk into the illusory wall, come into the cave under
 * its banner, and take the necklace from the altar once you've been in long
 * enough.
 */
test("the island: the statue's music box, then through the illusory wall to the necklace", async ({ page }) => {
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

  await test.step("sit before the dreaming statue and it takes you into the music box", async () => {
    // engine/statue.ts: the mirror stone lies in front of the statue (76, −44)
    const mirror = { x: 76, y: 0.14, z: -39.4 };
    // standing on the mirror stone does nothing
    await teleport(page, mirror);
    await page.waitForTimeout(3_000);
    expect(await where(page)).toMatchObject({ region: "hall", x: mirror.x });
    // sitting on it does (the statue opens its eyes, then the dream takes you)
    await page.getByRole("button", { name: "앉기" }).click();
    await expect(page.getByText("석상이 천천히 눈을 떠요…")).toBeVisible();
    await page.waitForFunction(() => window.__kordi?.region === "musicbox", null, { timeout: 60_000 });
    await expect(page.getByText("오르골 속", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("석상이 꾸던 꿈이에요", { exact: false })).toBeVisible();
  });

  await test.step("step the tune's opening phrase on the comb, and the box plays again", async () => {
    // engine/music-box.ts: tooth i is at x = (i − 3.5) × 1.6; the comb's base lies in front of the teeth
    const toothX = (i: number) => (i - 3.5) * 1.6;
    const voicesFrom = await page.evaluate(() => window.__kordi!.voices.length);
    // "twinkle, twinkle, little star": C C G G A A G — each step comes onto the tooth from the base
    for (const tooth of [0, 0, 4, 4, 5, 5, 4]) {
      await teleport(page, { x: toothX(tooth), y: 0.3, z: -1.5 });
      await page.waitForTimeout(500);
      await teleport(page, { x: toothX(tooth), y: 0.5, z: -4.6 });
      await page.waitForTimeout(700);
    }
    await expect(page.getByText("오르골이 노래를 되찾았어요", { exact: false })).toBeVisible();
    // every step rang its tooth
    const rung = await page.evaluate((from) => window.__kordi!.voices.slice(from).map((v) => v.midi), voicesFrom);
    expect(rung.slice(0, 7)).toEqual([84, 84, 91, 91, 93, 93, 91]);
  });

  await test.step("leave by the winding key and come out in front of the statue", async () => {
    // the portal home (engine/music-box.ts MUSICBOX_HOME)
    await teleport(page, { x: 8, y: 0, z: 5.4 });
    await page.waitForFunction(() => window.__kordi?.region === "hall", null, { timeout: 120_000 });
    // off the mirror stone, and it doesn't take you straight back
    await page.waitForTimeout(4_000);
    const back = await where(page);
    expect(back.region).toBe("hall");
    expect(Math.hypot(back.x - 76, back.z + 39.4)).toBeGreaterThan(1.7);
    expect(Math.hypot(back.x - 76, back.z + 44)).toBeLessThan(9.5);
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
