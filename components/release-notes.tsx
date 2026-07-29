import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/**
 * Release notes come from third-party repositories — treat them as hostile
 * input. rehype-sanitize's default schema strips scripts, event handlers
 * and javascript: URLs. Rendered at build time (server component).
 */
export function ReleaseNotes({ markdown }: { markdown: string }) {
  return (
    <div className="prose-sm max-w-none space-y-3 break-words text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-blue-400 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-zinc-800 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-900 dark:[&_h3]:text-zinc-100 [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-100 [&_pre]:p-3 dark:[&_pre]:bg-zinc-800 [&_ul]:space-y-1">
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {markdown}
      </Markdown>
    </div>
  );
}
