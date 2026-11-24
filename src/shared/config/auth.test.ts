import { describe, expect, it } from "vitest";
import { isPublicPath } from "./auth";

describe("isPublicPath", () => {
  it("opens chord practice to guests, but not today's review under it", () => {
    expect(isPublicPath("/chord-practice")).toBe(true);
    expect(isPublicPath("/chord-practice/review")).toBe(false);
    expect(isPublicPath("/chord-quiz")).toBe(false);
    expect(isPublicPath("/")).toBe(true);
  });
});
