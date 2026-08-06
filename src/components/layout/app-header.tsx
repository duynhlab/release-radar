import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeAgo } from "@/components/ui/time-ago";
import { Tooltip } from "@/components/ui/tooltip";
import { HEADER_CONTAINER } from "./page-container";
import { ThemeToggle } from "./theme-toggle";

const SOURCE_URL = "https://github.com/duynhlab/release-radar";

export function AppHeader({ generatedAt }: { generatedAt: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className={`${HEADER_CONTAINER} flex h-14 items-center gap-3 px-4 sm:px-6`}>
        <Link to="/" className="flex items-center gap-2 text-body font-semibold text-fg">
          <span aria-hidden="true">📡</span>
          Release Radar
        </Link>
        {/* Stays mounted at every width: `hidden` is display:none, so the
            ml-auto that right-aligns the icon buttons was inert below sm and
            they packed against the logo with ~163px of dead space at 390px.
            Only the word is dropped on mobile — "is this data current?" is the
            whole product, so the timestamp itself belongs on every screen. */}
        <span className="ml-auto min-w-0 truncate text-meta text-fg-muted">
          <span className="hidden sm:inline">synced </span>
          <TimeAgo iso={generatedAt} />
        </span>
        <Tooltip label="Source on GitHub">
          <Button size="icon" variant="ghost" asChild>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Release Radar source code on GitHub"
            >
              <Github className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  );
}
