import { copyReadmes, copyReleaseNotes } from "./lib/copy-release-notes.ts";
import { generateCatalogModule } from "./lib/gen-catalog.ts";

const { releaseIndex, changed } = await generateCatalogModule();
const notes = await copyReleaseNotes();
const readmes = await copyReadmes();

console.log(
  `Catalog module ${changed ? "updated" : "unchanged"}: ${releaseIndex.tools.length} tools`,
);
console.log(
  `Release note assets: ${notes.total} total, ${notes.written} written, ${notes.removed} removed`,
);
console.log(
  `README assets: ${readmes.total} total, ${readmes.written} written, ${readmes.removed} removed`,
);
