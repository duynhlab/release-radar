import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppError } from "@/components/layout/app-error";
import { AppShell } from "@/components/layout/app-shell";
import { NotFound } from "@/components/layout/not-found";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getIndex } from "@/data/catalog";
import { THEME_BOOT_SCRIPT } from "@/features/theme/theme-script";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
  // A few bytes, on every route: the header's sync status needs generatedAt.
  // Never the tool array.
  loader: () => ({ generatedAt: getIndex().generatedAt }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "theme-color", content: "#12161d" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "canonical", href: SITE_URL },
    ],
  }),
  errorComponent: AppError,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  const { generatedAt } = Route.useLoaderData();
  return (
    // suppressHydrationWarning and no className here: the boot script mutates
    // the class and data-theme of <html> before React sees it, so React must
    // not try to own those attributes. All layout classes live on <body>.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <TooltipProvider>
          <AppShell generatedAt={generatedAt}>{children}</AppShell>
        </TooltipProvider>
        <Scripts />
      </body>
    </html>
  );
}

export function RootOutlet() {
  return <Outlet />;
}
