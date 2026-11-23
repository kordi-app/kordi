#!/usr/bin/env node
/**
 * Contract fixture for the server's port of the chord validator.
 *
 * The server judges chord-quiz answers itself (com.kordi_api.quiz.judge.ChordValidator, a Java
 * port of src/shared/lib/music/chord-validator.ts). This script runs the TypeScript validator
 * over a broad set of (chord name, MIDI notes) cases and writes the answers to a JSON fixture
 * the server test (ChordValidatorContractTest) replays: both sides must agree on every case.
 *
 *   node scripts/gen-chord-fixtures.mjs   # needs ../server checked out next to the client
 *
 * Re-run after changing chord-validator.ts / chord-templates.ts (then port the change to Java)
 * or after adding chords to the seed. The fixture is committed in the server repo.
 *
 * Cases: every chord in the server's quiz seed (V2__seed_quiz_chords.sql) × root position,
 * every inversion, open/spread voicings, doubled tones, octave shifts, the 5th dropped, each
 * chord tone dropped, each other pitch class added, the chord moved a semitone, plus seeded
 * random note sets, unparseable names and empty input. TypeScript is loaded through Vite
 * (already a dev dependency), so no extra tooling is needed.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.resolve(root, process.env.KORDI_SERVER_DIR ?? "../server");
const seedPath = path.join(serverDir, "src/main/resources/db/migration/V2__seed_quiz_chords.sql");
const outPath = path.join(serverDir, "src/test/resources/chord-validator-fixtures.json");

const { module: validator } = await runnerImport(
  path.join(root, "src/shared/lib/music/chord-validator.ts"),
  { configFile: false, logLevel: "error" },
);
const { module: noteNames } = await runnerImport(
  path.join(root, "src/shared/lib/music/note-names.ts"),
  { configFile: false, logLevel: "error" },
);
const { validateChord } = validator;
const { NOTE_INDEX } = noteNames;

// ('C', 'MAJOR', 'C', 'C,E,G', 'EASY') → name "C", tones [0, 4, 7] (pitch classes, root first)
const seed = await readFile(seedPath, "utf8");
const ROW = /^\('([^']+)', '([A-Z0-9_]+)', '([^']+)', '([^']+)', '(EASY|MEDIUM|HARD)'\)/gm;
const chords = [...seed.matchAll(ROW)].map((m) => ({
  name: m[3],
  tones: m[4].split(",").map((n) => {
    const pc = NOTE_INDEX[n.trim()];
    if (pc === undefined) throw new Error(`unknown note ${n} in ${m[3]}`);
    return pc;
  }),
}));
if (chords.length === 0) throw new Error(`no chords found in ${seedPath}`);

/** Deterministic PRNG (mulberry32) so the fixture is stable across runs. */
function prng(seedValue) {
  let a = seedValue >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = prng(20261123);

/** Stack pitch classes upward from `base` (each note above the previous one). */
function stack(pcs, base) {
  const out = [];
  let prev = base - 1;
  for (const pc of pcs) {
    let note = prev + 1 + ((pc - (prev + 1)) % 12 + 12) % 12;
    out.push(note);
    prev = note;
  }
  return out;
}

const rotate = (arr, n) => [...arr.slice(n), ...arr.slice(0, n)];

const cases = [];
const seen = new Set();
function add(name, notes) {
  const key = `${name}|${notes.join(",")}`;
  if (seen.has(key)) return;
  seen.add(key);
  cases.push([name, notes, validateChord(name, notes)]);
}

for (const { name, tones } of chords) {
  const root = tones[0];
  const fifth = (root + 7) % 12;

  // root position, every inversion, in two octaves
  for (let inv = 0; inv < tones.length; inv++) {
    add(name, stack(rotate(tones, inv), 48));
    add(name, stack(rotate(tones, inv), 60));
  }
  // left-hand root + right-hand rest (open voicing), and a wide spread
  add(name, [36 + root, ...stack(tones.slice(1), 60)]);
  add(name, tones.map((pc, i) => 36 + pc + 12 * (i % 3)));
  // doubled root and doubled top tone
  add(name, [...stack(tones, 48), 60 + root + 12]);
  add(name, [...stack(tones, 60), stack(tones, 60).at(-1) + 12]);
  // unsorted input order
  add(name, stack(tones, 60).toReversed());
  // the 5th dropped (allowed on 7th chords only)
  if (tones.includes(fifth) && tones.length > 2) {
    add(name, stack(tones.filter((pc) => pc !== fifth), 60));
  }
  // each tone dropped (partial chords)
  if (tones.length > 2) {
    for (const drop of tones) add(name, stack(tones.filter((pc) => pc !== drop), 60));
  }
  // each other pitch class added (tensions allowed or not, and rival extensions)
  for (let pc = 0; pc < 12; pc++) {
    if (!tones.includes(pc)) add(name, stack([...tones, pc], 60));
  }
  // the whole chord a semitone up / down, a lone root, and nothing
  add(name, stack(tones.map((pc) => (pc + 1) % 12), 60));
  add(name, stack(tones.map((pc) => (pc + 11) % 12), 60));
  add(name, [60 + root]);
  add(name, []);
  // seeded random note sets: 2–7 notes over three octaves
  for (let i = 0; i < 4; i++) {
    const count = 2 + Math.floor(random() * 6);
    const notes = Array.from({ length: count }, () => 48 + Math.floor(random() * 36));
    add(name, notes);
  }
  // random subsets of the chord tones plus a random extra (near misses)
  for (let i = 0; i < 2; i++) {
    const subset = tones.filter(() => random() < 0.8);
    const extra = Math.floor(random() * 12);
    add(name, stack([...subset, extra], 48 + 12 * Math.floor(random() * 2)));
  }
}

// names the validator cannot parse, and the 6/9 alias spelled out
for (const name of ["", "H", "Cfoo", "C/E", "Cmaj", "c", "C6/9", "Cm6/9", "Bbm7", "Dbmaj7"]) {
  add(name, [60, 64, 67]);
  add(name, [60, 64, 67, 69, 74]);
  add(name, [58, 61, 65, 68]);
  add(name, [61, 65, 68, 72]);
}

const validCount = cases.filter((c) => c[2]).length;
const body = [
  "{",
  `  "generatedBy": "client/scripts/gen-chord-fixtures.mjs (runs src/shared/lib/music/chord-validator.ts validateChord, default rivals)",`,
  `  "chords": ${chords.length},`,
  `  "count": ${cases.length},`,
  `  "valid": ${validCount},`,
  `  "cases": [`,
  cases.map((c) => `    ${JSON.stringify(c)}`).join(",\n"),
  "  ]",
  "}",
  "",
].join("\n");
await writeFile(outPath, body);
console.log(
  `Wrote ${cases.length} cases (${validCount} valid, ${cases.length - validCount} invalid) ` +
    `for ${chords.length} chords to ${path.relative(root, outPath)}`,
);
