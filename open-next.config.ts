import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Pure SSG site: prerendered pages are served from Workers static assets —
// no R2/KV incremental cache needed.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
