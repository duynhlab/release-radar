import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeAgo } from "@/components/ui/time-ago";
import { Tooltip } from "@/components/ui/tooltip";
import { ThemeToggle } from "./theme-toggle";

export const SOURCE_URL = "https://github.com/duynhlab/release-radar";

export function AppHeader({ generatedAt }: { generatedAt: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-fg">
          <span aria-hidden="true">📡</span>
          Release Radar
        </Link>
        <span className="ml-auto hidden text-xs text-fg-muted sm:inline">
          synced <TimeAgo iso={generatedAt} />
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
