import { defineConfig, devices } from "@playwright/test";

/**
 * Playtests of the 3D piano world (e2e/). They drive a built app (built with the
 * debug seam on: window.__kordi reports where Kordi is and lets a test move it),
 * at the lowest graphics quality on a small screen: WebGL runs on SwiftShader,
 * the CPU, so no GPU is needed (CI included) but every pixel costs.
 *
 *   pnpm e2e              # builds and serves the app on :3456
 *   E2E_DEV=1 pnpm e2e    # a dev server instead: no build, but each page compiles on first visit
 */
const PORT = 3456;
const DEV = process.env.E2E_DEV === "1";
/** CI runners are a few times slower than a laptop at rendering on the CPU */
const SLOWER = process.env.CI ? 3 : 1;

export default defineConfig({
  testDir: "e2e",
  // a 3D scene compiling and rendering on the CPU is slow: be patient, one at a time
  timeout: 180_000 * SLOWER,
  expect: { timeout: 30_000 * SLOWER },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  // the copy the tests look for is Korean (the site's default locale)
  // a small screen: fewer pixels for the CPU to draw
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], locale: "ko-KR", viewport: { width: 960, height: 600 } } },
  ],
  webServer: {
    command: DEV ? `pnpm exec next dev -p ${PORT}` : `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 360_000,
    reuseExistingServer: !process.env.CI,
    env: {
      // never against production: whatever the .env files say, these tests talk to no API
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:9",
      // the debug seam in the build (src/widgets/piano-world/lib/debug-seam.ts)
      NEXT_PUBLIC_DEBUG_SEAM: "1",
    },
  },
});
