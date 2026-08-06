import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** False during prerender and hydration, true once the client takes over. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
