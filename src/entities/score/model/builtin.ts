import type { ScoreEntry } from "./types";

/**
 * Scores that ship with the app. Public-domain editions only — anything else
 * a player adds stays in their own browser (see features/score-library).
 */
export const BUILTIN_SCORES: ScoreEntry[] = [
  {
    id: "builtin:clair-de-lune",
    title: "Clair de lune",
    composer: "Claude Debussy",
    // Suite bergamasque III — Mutopia Project edition (public domain), after E. Fromont 1905
    source: { kind: "builtin", url: "/scores/clair-de-lune.musicxml" },
  },
];
