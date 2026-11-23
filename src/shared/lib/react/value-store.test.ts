import { describe, expect, it, vi } from "vitest";
import { createValueStore } from "./value-store";

describe("createValueStore", () => {
  it("notifies subscribers only when the value changes", () => {
    const store = createValueStore(1000);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(1000);
    expect(listener).not.toHaveBeenCalled();

    store.set(900);
    expect(store.get()).toBe(900);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set(800);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
