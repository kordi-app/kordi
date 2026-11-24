import { afterEach, describe, expect, it, vi } from "vitest";
import { readStored, storageKey, writeStored } from "./storage";

function fakeStorage(fail = false) {
  const data = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => {
      if (fail) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (fail) throw new Error("blocked");
      data.set(k, v);
    },
  };
  vi.stubGlobal("window", { localStorage });
  return data;
}

describe("browser storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps values as JSON under the namespace", () => {
    const data = fakeStorage();
    writeStored("world.warp-stones", ["plaza", "tower"]);
    expect(data.get(storageKey("world.warp-stones"))).toBe('["plaza","tower"]');
    expect(readStored("world.warp-stones", [])).toEqual(["plaza", "tower"]);
  });

  it("falls back when there's nothing, garbage, or no storage at all", () => {
    const data = fakeStorage();
    expect(readStored("missing", 7)).toBe(7);
    data.set(storageKey("broken"), "{not json");
    expect(readStored("broken", 7)).toBe(7);

    fakeStorage(true);
    expect(readStored("anything", "fallback")).toBe("fallback");
    expect(() => writeStored("anything", 1)).not.toThrow();
  });
});
