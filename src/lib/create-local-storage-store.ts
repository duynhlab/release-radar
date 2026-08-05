export interface LocalStorageStore<T> {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (next: T) => void;
}

/**
 * A useSyncExternalStore-compatible store backed by localStorage.
 *
 * The subtle part is snapshot identity: getSnapshot must be referentially
 * stable between reads or React re-renders forever, so the parsed value is
 * cached against the raw string. Extracted once and shared by favorites and
 * theme rather than written twice.
 */
export function createLocalStorageStore<T>(options: {
  key: string;
  parse: (raw: string | null) => T;
  serialize: (value: T) => string;
  empty: T;
}): LocalStorageStore<T> {
  const { key, parse, serialize, empty } = options;

  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;

  function readRaw(): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      // Safari private mode, blocked storage, etc.
      return null;
    }
  }

  function getSnapshot(): T {
    const raw = readRaw();
    if (!cache || cache.raw !== raw) {
      cache = { raw, value: parse(raw) };
    }
    return cache.value;
  }

  function notifyLocal() {
    // The storage event does not fire in the tab that wrote it, so same-tab
    // subscribers are fanned out manually.
    for (const listener of listeners) listener();
  }

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot,
    getServerSnapshot: () => empty,
    set(next) {
      try {
        localStorage.setItem(key, serialize(next));
      } catch {
        // Quota or unavailable — the value just will not persist.
      }
      cache = null;
      notifyLocal();
    },
  };
}
