import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// FSD layers, highest to lowest. See AGENTS.md for the architecture rules.
const LAYERS = ["app", "views", "widgets", "features", "entities", "shared"];

// Public API contract: reach a slice through its index.ts, never its
// internals. entities/*/server.ts is a second, server-only entry point —
// see the header comment in entities/user/index.ts.
const PUBLIC_API = {
  group: [
    "@/entities/*/**",
    "!@/entities/*/server",
    "@/features/*/**",
    "@/widgets/*/**",
    "@/views/*/**",
  ],
  message:
    'FSD: import a slice through its public API ("@/entities/user"), not its internals. Server-only entities APIs are the exception: "@/entities/user/server".',
};

// A layer may import only from layers below it, and never from a sibling
// slice of its own layer. Slices reach their own internals by relative path,
// so banning the layer's own "@/" alias is exactly the cross-import ban.
//
// ESLint replaces a rule rather than merging it, so every block that sets
// no-restricted-imports must carry PUBLIC_API too.
function layerBoundary(layer) {
  const index = LAYERS.indexOf(layer);
  const below = LAYERS.slice(index + 1);
  // shared/ has no slices, so its own alias stays usable inside it.
  const isSliced = layer !== "shared";
  return {
    files: [`src/${layer}/**`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: LAYERS.slice(0, isSliced ? index + 1 : index).map(
                (l) => `@/${l}/**`,
              ),
              message: isSliced
                ? `FSD: ${layer}/ may import only from ${below.join(", ")} — never upward, never from another ${layer} slice (compose in a higher layer instead).`
                : "FSD: shared/ is the lowest layer — it must not import from any domain layer.",
            },
            PUBLIC_API,
          ],
        },
      ],
    },
  };
}

// widgets/piano-world is a small game inside one widget, so it gets its own
// one-way layering (see the folders' header comments):
//   ui/     R3F scene, HUD and React hooks: may import engine, net, audio, lib
//   audio/  Tone.js band, grooves, island voices: may import engine, lib
//   net/    presence socket + typed protocol: may import engine, lib
//   engine/ pure game rules (physics, terrain, courses, regions…): no React,
//           no three, no sound, no network — and nothing from its siblings
//   lib/    dev-only instrumentation: imports nothing from the widget
// The FSD widgets patterns are carried along because ESLint replaces a rule's
// options rather than merging them.
const PIANO_WORLD = "src/widgets/piano-world";
const PIANO_WORLD_DEPS = {
  engine: ["ui", "net", "audio", "lib"],
  net: ["ui", "audio"],
  audio: ["ui", "net"],
  lib: ["engine", "ui", "net", "audio"],
};
const RENDER_PACKAGES = ["react", "react-dom", "react-dom/**", "three", "three/**", "@react-three/**"];

function pianoWorldBoundary([folder, banned]) {
  const patterns = [
    ...layerBoundary("widgets").rules["no-restricted-imports"][1].patterns,
    {
      // a sibling folder by relative path: "../ui/…", "../../net/…"
      regex: `^(\\.\\./)+(${banned.join("|")})(/|$)`,
      message: `piano-world: ${folder}/ must not import from ${banned.map((b) => `${b}/`).join(", ")} — layers point one way: ui → audio | net → engine.`,
    },
  ];
  if (folder === "engine") {
    patterns.push(
      {
        group: [...RENDER_PACKAGES, "tone", "@/shared/api", "@/shared/config/api"],
        message:
          "piano-world: engine/ is pure game rules — no React, three, Tone or network. Put rendering in ui/, sound in audio/, sockets in net/.",
      },
      {
        // VoiceId / InstrumentId are just names; playing them is audio/'s job
        group: ["@/shared/lib/audio"],
        allowTypeImports: true,
        message: "piano-world: engine/ may name sounds (import type) but not play them — that belongs in audio/.",
      },
    );
  }
  if (folder === "net" || folder === "audio") {
    patterns.push({
      group: RENDER_PACKAGES.filter((p) => !p.startsWith("react")),
      message: `piano-world: ${folder}/ does not render — three and @react-three belong in ui/.`,
    });
  }
  return {
    files: [`${PIANO_WORLD}/${folder}/**`],
    rules: { "no-restricted-imports": ["error", { patterns }] },
  };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // A leading underscore marks a binding kept for signature or API shape only.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // app/ is the top layer: nothing to ban but the public API contract.
  // Also covers src/proxy.ts.
  { rules: { "no-restricted-imports": ["error", { patterns: [PUBLIC_API] }] } },

  // Unidirectional imports, one block per layer below app/.
  ...LAYERS.filter((l) => l !== "app").map(layerBoundary),

  // Layers inside widgets/piano-world (after the widgets block, so they win).
  ...Object.entries(PIANO_WORLD_DEPS).map(pianoWorldBoundary),

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // tooling and build output, not app code
    ".claude/**",
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
