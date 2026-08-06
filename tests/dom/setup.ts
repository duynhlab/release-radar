import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Storage polyfill.
 *
 * Two things conspire here: this jsdom build exposes no `localStorage` on
 * `window` at all, and Node 26 defines its own `localStorage` global that is
 * disabled unless the process was started with --localstorage-file. So bare
 * `localStorage.getItem(...)` — what the app calls, and what a browser resolves
 * to window.localStorage — is undefined in tests.
 *
 * Methods live on the prototype and the class is published as `Storage` so
 * `vi.spyOn(Storage.prototype, "setItem")` still works; the quota-exhaustion
 * test depends on that.
 */
class MemoryStorage {
  #map = new Map<string, string>();

  get length(): number {
    return this.#map.size;
  }
  key(index: number): string | null {
    return [...this.#map.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.#map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.#map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.#map.delete(key);
  }
  clear(): void {
    this.#map.clear();
  }
}

const storage = new MemoryStorage();

for (const target of [globalThis, window] as unknown as Array<
  Record<string, unknown>
>) {
  Object.defineProperty(target, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}
Object.defineProperty(globalThis, "Storage", {
  value: MemoryStorage,
  configurable: true,
  writable: true,
});

// Auto-cleanup only runs when vitest globals are enabled, and they are not.
// Without this, rendered trees accumulate and getByTestId finds several matches.
afterEach(() => {
  cleanup();
});
