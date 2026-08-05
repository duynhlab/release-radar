import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { AppError } from "./components/layout/app-error";
import { NotFound } from "./components/layout/not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    // Tool loaders fetch a ~30 KB notes asset, so wait for real hover intent.
    defaultPreloadDelay: 250,
    // The catalog is a build-time constant; nothing goes stale in a session.
    defaultStaleTime: Number.POSITIVE_INFINITY,
    scrollRestoration: true,
    defaultNotFoundComponent: () => <NotFound />,
    defaultErrorComponent: AppError,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
