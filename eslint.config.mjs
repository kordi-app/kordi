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
  // Also covers src/middleware.ts.
  { rules: { "no-restricted-imports": ["error", { patterns: [PUBLIC_API] }] } },

  // Unidirectional imports, one block per layer below app/.
  ...LAYERS.filter((l) => l !== "app").map(layerBoundary),

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
