/*
 * The piano world is a small game inside one widget, layered one way
 * (enforced in eslint.config.mjs):
 *   ui/     R3F scene, HUD, React hooks          → may import engine, net, audio, lib
 *   audio/  Tone.js band and island voices       → may import engine, lib
 *   net/    presence socket + typed protocol     → may import engine, lib
 *   engine/ pure game rules: physics, terrain, courses, regions (no React/three/sound/network)
 *   lib/    dev-only instrumentation             → imports nothing from the widget
 * engine/course-contract.ts holds the course numbers the server also times runs by.
 */
export { PianoWorld } from "./ui/piano-world";
export type { PianoWorldCopy } from "./ui/copy";
