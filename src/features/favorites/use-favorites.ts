import { useCallback, useSyncExternalStore } from "react";
import { createLocalStorageStore } from "@/lib/create-local-storage-store";

/**
 * v1 shape: a JSON string[] of tool ids.
 *
 * Deliberately NOT versioned in the key. The shape and the ids are unchanged
 * from the Next app, so a `:v2` suffix would migrate nothing while silently
 * orphaning every existing user's stars. If the shape ever does change, write
 * "release-radar:favorites:v2" and migrate on first read from this key — do not
 * rename this one.
 */
export const FAVORITES_STORAGE_KEY = "release-radar:favorites";
export const FAVORITES_SHAPE_VERSION = 1;

const EMPTY: ReadonlySet<string> = new Set<string>();

const store = createLocalStorageStore<ReadonlySet<string>>({
  key: FAVORITES_STORAGE_KEY,
  empty: EMPTY,
  parse(raw) {
    if (!raw) return EMPTY;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return EMPTY;
      return new Set(parsed.filter((v): v is string => typeof v === "string"));
    } catch {
      return EMPTY;
    }
  },
  serialize: (value) => JSON.stringify([...value]),
});

export function useFavorites(): {
  favorites: ReadonlySet<string>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
} {
  const favorites = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    // Server snapshot is empty, so prerendered HTML always shows zero stars and
    // hydration cannot mismatch.
    store.getServerSnapshot,
  );

  const toggleFavorite = useCallback((id: string) => {
    const next = new Set(store.getSnapshot());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    store.set(next);
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}

export const favoritesStore = store;
