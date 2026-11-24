import { describe, expect, it } from "vitest";
import { isPublicPath } from "./auth";

describe("isPublicPath", () => {
  it("opens chord practice to guests, but not today's review under it", () => {
    expect(isPublicPath("/chord-practice")).toBe(true);
    expect(isPublicPath("/chord-practice/review")).toBe(false);
    expect(isPublicPath("/chord-quiz")).toBe(false);
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/score")).toBe(true);
    expect(isPublicPath("/friends")).toBe(false);
  });

  it("lets unknown paths through, so they reach the 404 page", () => {
    expect(isPublicPath("/does-not-exist")).toBe(true);
  });
});
