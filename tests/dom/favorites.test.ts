import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FAVORITES_STORAGE_KEY,
  favoritesStore,
} from "../../src/features/favorites/use-favorites.ts";

describe("favorites store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses the exact legacy key and shape", () => {
    // Pinned deliberately: the Next app wrote this key, and renaming it would
    // silently orphan every existing user's stars.
    expect(FAVORITES_STORAGE_KEY).toBe("release-radar:favorites");
  });

  it("reads a payload written by the legacy app", () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(["grafana", "loki"]),
    );
    const favorites = favoritesStore.getSnapshot();
    expect([...favorites].sort()).toEqual(["grafana", "loki"]);
  });

  it("returns a referentially stable snapshot while storage is unchanged", () => {
    // This is what stops useSyncExternalStore looping forever.
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["a"]));
    expect(favoritesStore.getSnapshot()).toBe(favoritesStore.getSnapshot());
  });

  it("produces a new snapshot after a write", () => {
    const before = favoritesStore.getSnapshot();
    favoritesStore.set(new Set(["vault"]));
    expect(favoritesStore.getSnapshot()).not.toBe(before);
    expect([...favoritesStore.getSnapshot()]).toEqual(["vault"]);
  });

  it.each([
    ["not json", "malformed"],
    ["{}", "an object"],
    ["[1,2,3]", "non-string entries"],
    ["null", "null"],
  ])("degrades to empty for %s (%s)", (payload) => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, payload);
    expect([...favoritesStore.getSnapshot()]).toEqual([]);
  });

  it("keeps only the string entries of a mixed array", () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(["ok", 42, null, "fine"]),
    );
    expect([...favoritesStore.getSnapshot()].sort()).toEqual(["fine", "ok"]);
  });

  it("does not throw when the quota is exhausted", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    expect(() => favoritesStore.set(new Set(["x"]))).not.toThrow();
    setItem.mockRestore();
  });

  it("serves an empty set on the server, so prerendered HTML shows no stars", () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["grafana"]));
    expect([...favoritesStore.getServerSnapshot()]).toEqual([]);
  });

  it("notifies same-tab subscribers, which the storage event does not", () => {
    const listener = vi.fn();
    const unsubscribe = favoritesStore.subscribe(listener);
    favoritesStore.set(new Set(["grafana"]));
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("ignores storage events for other keys", () => {
    const listener = vi.fn();
    const unsubscribe = favoritesStore.subscribe(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
