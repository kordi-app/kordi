import { describe, expect, it } from "vitest";
import { safeNextPath, withNextParam } from "./safe-next-path";

describe("safeNextPath", () => {
  it("keeps same-site relative paths with their query", () => {
    expect(safeNextPath("/ko/score?id=3")).toBe("/ko/score?id=3");
    expect(safeNextPath("/")).toBe("/");
  });

  it.each([
    null,
    "",
    "score",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/\tevil",
    "/api/auth/logout",
    "/" + "a".repeat(600),
  ])("rejects %s", (raw) => {
    expect(safeNextPath(raw)).toBeNull();
  });
});

describe("withNextParam", () => {
  it("encodes the return path, or leaves it out when unsafe", () => {
    expect(withNextParam("/ko/login", "/ko/friends?tab=1")).toBe("/ko/login?next=%2Fko%2Ffriends%3Ftab%3D1");
    expect(withNextParam("/ko/login", "//evil.com")).toBe("/ko/login");
  });
});
