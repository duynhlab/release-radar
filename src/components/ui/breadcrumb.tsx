import { Link } from "@tanstack/react-router";

/**
 * Two routes carried byte-identical breadcrumb JSX. The trailing crumb is the
 * current page, so it is text with aria-current rather than a link.
 */
export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-meta">
      <ol className="flex items-center gap-1.5 text-fg-muted">
        <li>
          <Link to="/" className="hover:text-fg">
            All tools
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-fg">
          {current}
        </li>
      </ol>
    </nav>
  );
}
