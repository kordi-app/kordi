import { test } from "@playwright/test";
import { jumpUntilUp, openWorld, seedGuest } from "./world";

/**
 * Clicking an on-screen button (an emote, say) mustn't steal the keyboard:
 * Space still jumps afterwards. (It once didn't: the clicked button kept focus,
 * and Space pressed the button again instead of jumping.)
 */
test("Space still jumps after clicking an on-screen button", async ({ page }) => {
  await seedGuest(page, { dreamFound: true });
  await openWorld(page, "whale");

  await page.getByRole("button", { name: "앉기" }).click();
  await jumpUntilUp(page);
});
