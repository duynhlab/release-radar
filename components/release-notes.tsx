import type { ComponentProps } from "react";
import Markdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

// Upstream notes use arbitrary heading levels (some start at "#", others at
// "###"), which breaks the page's heading outline (axe heading-order) no
// matter how they are remapped. Render them as styled paragraphs instead —
// the page outline stays valid and the visual hierarchy is preserved.
function noteHeading(className: string) {
  return function NoteHeading({
    node,
    ...props
  }: ComponentProps<"p"> & { node?: unknown }) {
    void node;
    return <p className={className} {...props} />;
  };
}

const primaryHeading = noteHeading(
  "text-base font-semibold text-zinc-900 dark:text-zinc-100",
);
const secondaryHeading = noteHeading(
  "text-sm font-semibold text-zinc-900 dark:text-zinc-100",
);

// Code blocks scroll horizontally, so they need keyboard focus (axe
// scrollable-region-focusable).
const noteComponents: Components = {
  h1: primaryHeading,
  h2: primaryHeading,
  h3: secondaryHeading,
  h4: secondaryHeading,
  h5: secondaryHeading,
  h6: secondaryHeading,
  pre: (props) => <pre tabIndex={0} {...props} />,
};

/**
 * Release notes come from third-party repositories — treat them as hostile
 * input. rehype-sanitize's default schema strips scripts, event handlers
 * and javascript: URLs. Rendered at build time (server component).
 */
export function ReleaseNotes({ markdown }: { markdown: string }) {
  return (
    <div className="prose-sm max-w-none space-y-3 break-words text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-blue-400 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-zinc-800 [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-100 [&_pre]:p-3 dark:[&_pre]:bg-zinc-800 [&_ul]:space-y-1">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={noteComponents}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
