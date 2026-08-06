import type { ReactNode } from "react";
import { AppHeader } from "./app-header";

export function AppShell({
  generatedAt,
  children,
}: {
  generatedAt: string;
  children: ReactNode;
}) {
  return (
    <>
      {/* First focusable element on the page. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-control focus-visible:bg-surface focus-visible:px-3 focus-visible:py-2 focus-visible:text-fg"
      >
        Skip to content
      </a>
      <AppHeader generatedAt={generatedAt} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6"
      >
        {children}
      </main>
      <footer className="border-t border-border py-5 text-center text-meta text-fg-subtle">
        Data synced twice daily from GitHub Releases · Generated statically
      </footer>
    </>
  );
}
