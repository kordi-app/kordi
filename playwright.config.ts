import { defineConfig, devices } from "@playwright/test";

/**
 * Playtests of the 3D piano world (e2e/). They drive a development server, whose
 * debug seam (window.__kordi) reports where Kordi is and lets a test move it.
 * WebGL runs on SwiftShader, so no GPU is needed (CI included).
 *
 *   pnpm e2e            # starts its own dev server on :3456
 */
const PORT = 3456;

export default defineConfig({
  testDir: "e2e",
  // a 3D scene compiling and rendering on the CPU is slow: be patient, one at a time
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  // the copy the tests look for is Korean (the site's default locale)
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], locale: "ko-KR" } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    // never against production: whatever .env says, these tests talk to no API
    env: { NEXT_PUBLIC_API_URL: "http://127.0.0.1:9" },
  },
});
