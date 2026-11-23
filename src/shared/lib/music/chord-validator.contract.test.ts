import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateChord } from "./chord-validator";

/**
 * The server judges quiz answers with a Java port of validateChord, checked against
 * a fixture this validator produced (scripts/gen-chord-fixtures.mjs →
 * server/src/test/resources/chord-validator-fixtures.json). If this fails, the
 * validator changed since the fixture was written: re-run the script, port the
 * change to the server's ChordValidator, and run its ChordValidatorContractTest.
 * Skipped when the server repo isn't checked out next to the client.
 */
const fixturePath = path.resolve(
  process.env.KORDI_SERVER_DIR ?? path.resolve(__dirname, "../../../../../server"),
  "src/test/resources/chord-validator-fixtures.json",
);

describe.skipIf(!existsSync(fixturePath))("chord validator server contract", () => {
  it("still answers every fixture case the way the fixture says", () => {
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      cases: [string, number[], boolean][];
    };
    const drifted = fixture.cases.filter(([name, notes, expected]) => validateChord(name, notes) !== expected);
    expect(drifted).toEqual([]);
  });
});
