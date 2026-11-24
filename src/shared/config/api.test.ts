import { describe, expect, it } from "vitest";
import { isProductionUrl } from "./api";

describe("isProductionUrl", () => {
  it("knows the production API and its subdomains", () => {
    expect(isProductionUrl("https://api.kordi.online")).toBe(true);
    expect(isProductionUrl("wss://api.kordi.online/ws/world")).toBe(true);
    expect(isProductionUrl("https://kordi.online")).toBe(true);
  });

  it("leaves local servers and look-alikes alone", () => {
    expect(isProductionUrl("http://localhost:8080")).toBe(false);
    expect(isProductionUrl("https://notkordi.online")).toBe(false);
    expect(isProductionUrl("not a url")).toBe(false);
  });
});
