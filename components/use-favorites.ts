"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "release-radar:favorites";
const EMPTY: ReadonlySet<string> = new Set();

// Snapshot must be referentially stable between reads, so cache it keyed on
// the raw localStorage string.
let snapshotCache: { raw: string | null; value: Set<string> } | null = null;
const localListeners = new Set<() => void>();

function readSnapshot(): ReadonlySet<string> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (!snapshotCache || snapshotCache.raw !== raw) {
    let ids: string[] = [];
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        ids = parsed.filter((v): v is string => typeof v === "string");
      }
    } catch {
      ids = [];
    }
    snapshotCache = { raw, value: new Set(ids) };
  }
  return snapshotCache.value;
}

function subscribe(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  localListeners.add(callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    localListeners.delete(callback);
  };
}

/**
 * Favorite tool ids persisted in localStorage, shared across components and
 * browser tabs. The server snapshot is empty so static HTML stays
 * deterministic.
 */
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);

  const toggleFavorite = useCallback((id: string) => {
    const next = new Set(readSnapshot());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Storage full or unavailable — favorites just won't persist.
    }
    for (const callback of localListeners) callback();
  }, []);

  return { favorites, toggleFavorite };
}
