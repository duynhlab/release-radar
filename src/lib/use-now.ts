import { useSyncExternalStore } from "react";

const MINUTE_MS = 60_000;

function subscribeMinute(callback: () => void) {
  const id = setInterval(callback, 30_000);
  return () => clearInterval(id);
}

function getMinuteSnapshot(): number {
  // Quantized to the minute so the snapshot is referentially stable between
  // polls and React does not re-render on every tick.
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

/**
 * Minute-granularity clock whose *server* value is the data's generatedAt.
 *
 * This is what keeps the recency buckets hydration-safe. A route may be served
 * from a prerendered asset or rendered on the worker per request; using
 * Date.now() server-side would make prerendered HTML frozen at build time while
 * SSR HTML varied per request, and either way the client's first render must
 * reproduce the server's bytes exactly. Anchoring both to generatedAt makes
 * every path emit identical HTML.
 *
 * Cloudflare also freezes Date.now() between I/O operations as a Spectre
 * mitigation, so a worker render looks internally consistent while still
 * disagreeing with the visitor's clock at hydration — the platform makes this
 * bug harder to notice, not less real.
 *
 * Semantics, unchanged from the legacy app: in first-paint HTML "released
 * today" means within 24h of the sync; after hydration, within 24h of the
 * visitor's clock.
 */
export function useNow(fallbackIso: string): number {
  return useSyncExternalStore(subscribeMinute, getMinuteSnapshot, () =>
    new Date(fallbackIso).getTime(),
  );
}
