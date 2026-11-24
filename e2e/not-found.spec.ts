import { expect, test } from "@playwright/test";

/**
 * An address that doesn't exist gets the 404 page, not a server error. (It once
 * crashed: the page called a function from a "use client" module on the server.)
 *
 * The status is 200, not 404: the routes' loading.tsx starts streaming before the
 * catch-all route calls notFound(), so the status is already sent. A known Next.js
 * trade-off of streaming; the page still renders the 404 (and a noindex meta).
 */
test("an unknown address shows the 404 page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/ko/no-such-page");
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
  await expect(page.getByRole("link", { name: "홈으로" })).toBeVisible();
  expect(errors).toEqual([]);
});
