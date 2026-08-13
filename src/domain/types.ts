import { z } from "zod";

/**
 * Declaration order is display order: it drives the filter chips and
 * `getUsedCategories()`. It runs cluster → delivery → data → cross-cutting.
 *
 * A category names *what a tool is for*, never how it ships. `operator`,
 * `helm-chart`, `plugin` and `extension` describe 40% of the catalog and are
 * tags — `tempo`, `tempo-operator` and `tempo-datasource` are three artifacts of
 * one thing and belong on one page.
 */
export const CATEGORIES = [
  "kubernetes",
  "gitops",
  "iac",
  "observability",
  "database",
  "backup",
  "messaging",
  "networking",
  "security",
  "testing",
  "ai",
] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  kubernetes: "Kubernetes",
  gitops: "GitOps & Delivery",
  iac: "Infrastructure as Code",
  observability: "Monitoring & Observability",
  database: "Databases",
  backup: "Backup & Recovery",
  messaging: "Messaging & Workflow",
  networking: "Networking",
  security: "Security",
  testing: "Testing",
  ai: "AI & Agents",
};

const regexString = z
  .string()
  .min(1)
  .refine(
    (s) => {
      try {
        new RegExp(s);
        return true;
      } catch {
        return false;
      }
    },
    { error: "must be a valid regular expression" },
  );

export const ReleaseConfigSchema = z.object({
  strategy: z
    .enum(["github-releases", "github-tags", "manual"])
    .default("github-releases"),
  includePrerelease: z.boolean().default(false),
  tagPattern: regexString.optional(),
  ignorePattern: regexString.optional(),
});

export const GroupSchema = z.object({
  name: z.string().min(1),
  homepage: z.url().optional(),
});

export const ToolSchema = z.object({
  id: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      "id must be lowercase alphanumeric with hyphens",
    ),
  name: z.string().min(1),
  category: z.enum(CATEGORIES),
  repository: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "repository must be in owner/repo form"),
  description: z.string().min(1),
  homepage: z.url().optional(),
  documentation: z.url().optional(),
  tags: z.array(z.string().min(1)).default([]),
  group: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, "group must be a lowercase slug")
    .optional(),
  enabled: z.boolean().default(true),
  release: ReleaseConfigSchema.prefault({}),
});

export const CatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    groups: z
      .record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), GroupSchema)
      .default({}),
    tools: z.array(ToolSchema).min(1),
  })
  .superRefine((catalog, ctx) => {
    const seen = new Set<string>();
    for (const [i, tool] of catalog.tools.entries()) {
      if (seen.has(tool.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", i, "id"],
          message: `duplicate tool id "${tool.id}"`,
        });
      }
      seen.add(tool.id);
      if (tool.group && !(tool.group in catalog.groups)) {
        ctx.addIssue({
          code: "custom",
          path: ["tools", i, "group"],
          message: `unknown group "${tool.group}" — declare it under "groups:"`,
        });
      }
    }
  });

export const ReleaseSchema = z.object({
  id: z.union([z.number(), z.string()]),
  version: z.string(),
  name: z.string().nullable(),
  channel: z.enum(["stable", "prerelease"]),
  publishedAt: z.iso.datetime(),
  url: z.url(),
  notes: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
});

export const ToolReleasesFileSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime(),
  tool: z.object({
    id: z.string(),
    name: z.string(),
    repository: z.string(),
  }),
  releases: z.array(ReleaseSchema).max(20),
});

export const ToolReadmeFileSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime(),
  tool: z.object({
    id: z.string(),
    name: z.string(),
    repository: z.string(),
  }),
  // null means "synced fine, repo has no renderable README" — distinct from
  // the file being absent, which means the sync never ran for this tool.
  readme: z
    .object({
      markdown: z.string().min(1),
      path: z.string().min(1),
      htmlUrl: z.url(),
    })
    .nullable(),
});

export const IndexToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(CATEGORIES),
  repository: z.string(),
  description: z.string(),
  homepage: z.url().optional(),
  documentation: z.url().optional(),
  tags: z.array(z.string()),
  group: z.object({ id: z.string(), name: z.string() }).optional(),
  latest: ReleaseSchema.omit({ notes: true }).nullable(),
  previous: ReleaseSchema.pick({ version: true, publishedAt: true }).nullable(),
  releaseCount: z.number().int().min(0),
});

export const IndexSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime(),
  tools: z.array(IndexToolSchema),
});

export type Category = (typeof CATEGORIES)[number];
export type Group = z.infer<typeof GroupSchema>;
export type ReleaseConfig = z.infer<typeof ReleaseConfigSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export type Release = z.infer<typeof ReleaseSchema>;
export type ToolReleasesFile = z.infer<typeof ToolReleasesFileSchema>;
export type ToolReadmeFile = z.infer<typeof ToolReadmeFileSchema>;
export type ToolReadme = ToolReadmeFile["readme"];
export type IndexTool = z.infer<typeof IndexToolSchema>;
export type ReleaseIndex = z.infer<typeof IndexSchema>;
