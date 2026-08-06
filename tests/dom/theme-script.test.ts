import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
} from "../../src/features/theme/theme-script.ts";

function runBootScript() {
  // The script ships as a string in <head>, so run it the same way the browser
  // would rather than importing anything.
  new Function(THEME_BOOT_SCRIPT)();
}

function mockPrefersLight(light: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("prefers-color-scheme: light") ? light : !light,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("theme boot script", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
    vi.unstubAllGlobals();
  });

  it("defaults to dark when the OS prefers dark and nothing is stored", () => {
    mockPrefersLight(false);
    runBootScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("system");
  });

  it("follows the OS to light when nothing is stored", () => {
    mockPrefersLight(true);
    runBootScript();
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("system");
  });

  it.each(["light", "dark"] as const)(
    "honours a stored %s preference over the OS",
    (stored) => {
      // OS says the opposite, so this also proves the toggle beats the OS —
      // the whole reason for the class strategy over prefers-color-scheme.
      mockPrefersLight(stored === "dark");
      localStorage.setItem(THEME_STORAGE_KEY, stored);
      runBootScript();
      expect(document.documentElement.classList.contains(stored)).toBe(true);
      expect(document.documentElement.dataset.theme).toBe(stored);
      expect(document.documentElement.style.colorScheme).toBe(stored);
    },
  );

  it("treats a garbage stored value as system", () => {
    mockPrefersLight(false);
    localStorage.setItem(THEME_STORAGE_KEY, "chartreuse");
    runBootScript();
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("falls back to dark when storage throws", () => {
    mockPrefersLight(true);
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(() => runBootScript()).not.toThrow();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    getItem.mockRestore();
  });

  it("never leaves both classes applied", () => {
    mockPrefersLight(true);
    runBootScript();
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runBootScript();
    const classes = [...document.documentElement.classList];
    expect(classes).toContain("dark");
    expect(classes).not.toContain("light");
  });
});
