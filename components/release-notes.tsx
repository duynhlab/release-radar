import Markdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

// Notes are embedded under an h3 release card heading, so markdown headings
// must be demoted below h3 or the page's heading order breaks (axe
// heading-order): some upstream notes start with a top-level "#".
// Code blocks scroll horizontally, so they need keyboard focus (axe
// scrollable-region-focusable).
const noteComponents: Components = {
  h1: "h4",
  h2: "h4",
  h3: "h5",
  h4: "h5",
  h5: "h6",
  h6: "h6",
  pre: (props) => <pre tabIndex={0} {...props} />,
};

/**
 * Release notes come from third-party repositories — treat them as hostile
 * input. rehype-sanitize's default schema strips scripts, event handlers
 * and javascript: URLs. Rendered at build time (server component).
 */
export function ReleaseNotes({ markdown }: { markdown: string }) {
  return (
    <div className="prose-sm max-w-none space-y-3 break-words text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-blue-400 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-zinc-800 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-zinc-900 dark:[&_h4]:text-zinc-100 [&_h5]:text-sm [&_h5]:font-semibold [&_h5]:text-zinc-900 dark:[&_h5]:text-zinc-100 [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:text-zinc-900 dark:[&_h6]:text-zinc-100 [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-100 [&_pre]:p-3 dark:[&_pre]:bg-zinc-800 [&_ul]:space-y-1">
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
