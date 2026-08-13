import { useCallback, useSyncExternalStore } from "react";
import { createLocalStorageStore } from "@/lib/create-local-storage-store";
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-script";

const store = createLocalStorageStore<ThemePreference>({
  key: THEME_STORAGE_KEY,
  empty: "system",
  parse: (raw) => (raw === "light" || raw === "dark" ? raw : "system"),
  serialize: (value) => value,
});

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function apply(preference: ThemePreference): void {
  const resolved = resolveTheme(preference);
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.dataset.theme = preference;
  el.style.colorScheme = resolved;
  // Browser chrome follows the resolved background; the boot script created
  // the meta if the head didn't ship one.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[resolved]);
}

const CYCLE: ThemePreference[] = ["system", "light", "dark"];

export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  cycle: () => void;
} {
  const preference = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const cycle = useCallback(() => {
    const current = store.getSnapshot();
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length] ?? "system";
    store.set(next);
    apply(next);
  }, []);

  return { preference, resolved: resolveTheme(preference), cycle };
}
