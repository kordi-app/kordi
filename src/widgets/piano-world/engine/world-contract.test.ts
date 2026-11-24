import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import contract from "./world-contract.json";

/**
 * The world contract is one file kept in both repos. When the server repo is
 * checked out next to the client (locally, and in CI), the two must match.
 * Skipped when it isn't (KORDI_SERVER_DIR points elsewhere if it lives elsewhere).
 */
const serverContract = path.resolve(
  process.env.KORDI_SERVER_DIR ?? path.resolve(__dirname, "../../../../../server"),
  "src/main/resources/world-contract.json",
);

describe.skipIf(!existsSync(serverContract))("world contract", () => {
  it("is the same file as the server's", () => {
    expect(contract).toEqual(JSON.parse(readFileSync(serverContract, "utf8")));
  });
});
