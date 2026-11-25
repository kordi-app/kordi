import { expect, test, type Page } from "@playwright/test";

// the dev build's debug seam: window.__kordi (its declaration lives with the app)
import type {} from "../src/widgets/piano-world/lib/debug-seam";

/** Guest progress, as the world keeps it in this browser (src/shared/lib/storage.ts) */
export interface GuestProgress {
  /** course bests: having one means having that course's crown (night: the cosmic crown) */
  bests?: Partial<Record<"clouds" | "night" | "ruins", number>>;
  caveFound?: boolean;
  dreamFound?: boolean;
  musicBoxFound?: boolean;
  necklace?: boolean;
}

export async function seedGuest(page: Page, progress: GuestProgress) {
  await page.addInitScript((p: GuestProgress) => {
    const put = (key: string, value: unknown) => localStorage.setItem(`kordi:v1:${key}`, JSON.stringify(value));
    for (const [course, ms] of Object.entries(p.bests ?? {})) put(`world.course-best.${course}`, ms);
    if (p.caveFound) put("world.cave-found", true);
    if (p.dreamFound) put("world.dream-found", true);
    if (p.musicBoxFound) put("world.musicbox-found", true);
    if (p.necklace) put("world.necklace", true);
  }, progress);
}

/** Page errors (not the expected network failures: no API runs during these tests) */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/**
 * Wait until Kordi is in a region (its first frame has run). The first frame
 * compiles every shader in the region: on a CPU renderer the island's takes about
 * a minute (several on a CI runner), every time you come back to it too. So wait
 * as long as the test may run, never a fixed guess.
 */
export async function waitForRegion(page: Page, region: string) {
  await page.waitForFunction((r) => window.__kordi?.region === r, region, { timeout: test.info().timeout });
}

/** Open the world in a region (at the lowest graphics quality) and wait until Kordi is in it */
export async function openWorld(page: Page, region: string) {
  await page.goto(`/?region=${region}&quality=minimal`);
  await waitForRegion(page, region);
}

export const where = (page: Page) => page.evaluate(() => ({ ...window.__kordi!.pos, region: window.__kordi!.region }));

/** Put Kordi somewhere (applied on the next frame) */
export async function teleport(page: Page, to: { x: number; y: number; z: number }) {
  await page.evaluate((p) => {
    window.__kordi!.teleport = p;
  }, to);
}

/**
 * Hold a key until Kordi has moved this far (frames are slow on a CPU renderer,
 * so wait for the effect rather than for a fixed time).
 */
/**
 * Jump, holding the key as a player would (a tap is a short hop: the jump is
 * cut when you let go early), until Kordi is this far up.
 */
export async function jumpUntilUp(page: Page, height = 0.6) {
  const from = await where(page);
  await page.keyboard.down("Space");
  try {
    await expect
      .poll(async () => (await where(page)).y - from.y, { timeout: 10_000, intervals: [50] })
      .toBeGreaterThan(height);
  } finally {
    await page.keyboard.up("Space");
  }
}

export async function walkUntilMoved(page: Page, key: string, distance = 0.5) {
  const from = await where(page);
  await page.keyboard.down(key);
  try {
    await expect
      .poll(async () => {
        const now = await where(page);
        return Math.hypot(now.x - from.x, now.z - from.z);
      }, { timeout: 15_000 })
      .toBeGreaterThan(distance);
  } finally {
    await page.keyboard.up(key);
  }
}
