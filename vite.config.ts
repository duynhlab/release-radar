import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { generateCatalogModule } from "./scripts/lib/gen-catalog.ts";
import { copyReadmes, copyReleaseNotes } from "./scripts/lib/copy-release-notes.ts";
import { buildPrerenderPages } from "./src/lib/prerender-pages.ts";
import { SITE_URL } from "./src/lib/site.ts";

export default defineConfig(async () => {
  // Generated inputs must exist before the module graph is walked.
  // generateCatalogModule() validates data/index.json with IndexSchema and
  // throws a prettified Zod error, so a bad index fails the build right here.
  const { releaseIndex } = await generateCatalogModule();
  await copyReleaseNotes();
  await copyReadmes();

  return {
    // Vite 8 resolves tsconfig paths natively — no vite-tsconfig-paths.
    resolve: { tsconfigPaths: true },
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      tailwindcss(),
      tanstackStart({
        // `pages` is a sibling of `prerender`, and a plain array — which is why
        // this config is async: the list is derived from the validated catalog.
        pages: buildPrerenderPages(releaseIndex),
        prerender: {
          enabled: true,
          crawlLinks: false,
          // Defaults to TRUE. Left on, it prerenders beyond the explicit list.
          autoStaticPathsDiscovery: false,
          // Defaults to TRUE, which emits foo/index.html and makes Workers
          // Assets serve /foo as a 307 to /foo/. The legacy app serves all 77
          // URLs at 200 with no redirect; this keeps that contract.
          autoSubfolderIndex: false,
          failOnError: true,
          concurrency: 8,
        },
        sitemap: { enabled: true, host: SITE_URL },
      }),
      viteReact(),
    ],
  };
});
