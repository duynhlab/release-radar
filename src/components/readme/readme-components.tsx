import type { MarkdownComponents } from "@tanstack/markdown/react";
import type { ComponentPropsWithoutRef } from "react";
import { NotePre, NoteTable } from "@/components/releases/markdown-components";
import { isAllowedNoteImage } from "@/lib/note-links";
import { resolveReadmeHref, resolveReadmeImageSrc } from "@/lib/readme-links";

/**
 * README variants of the note components. Headings need no entry: the AST
 * transform normalizes depths to h3–h6 and the default renderer emits the
 * real elements, styled by the `.rr-readme` block in app.css.
 *
 * The maps are per-repository because every resolved link is repo-relative;
 * the Readme component memoizes the rendered tree so this is built once per
 * README, not per render.
 */

function readmeLink(repository: string) {
  return function ReadmeLink({
    href,
    children,
    ...rest
  }: ComponentPropsWithoutRef<"a">) {
    const resolved = resolveReadmeHref(href, repository);
    if (!resolved) {
      return (
        <span data-blocked-href="" className="rr-notes__blocked">
          {children}
        </span>
      );
    }
    // `rest` first: a title from the markdown is fine, overriding href/target/
    // rel is not. Every surviving README link is off-site by construction.
    return (
      <a
        {...rest}
        href={resolved}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
      >
        {children}
      </a>
    );
  };
}

function readmeImage(repository: string) {
  return function ReadmeImage({
    src,
    alt,
    title,
  }: ComponentPropsWithoutRef<"img">) {
    const source = typeof src === "string" ? src : "";
    const resolved = resolveReadmeImageSrc(source, repository);
    if (resolved && isAllowedNoteImage(resolved)) {
      return (
        <img
          src={resolved}
          alt={alt ?? ""}
          title={title}
          loading="lazy"
          decoding="async"
          className="max-w-full rounded-control"
        />
      );
    }
    // Blocked: no network request, alt text preserved, and never <img src="">.
    // Unlike notes, a relative path still yields a useful link — the resolved
    // raw.githubusercontent-backed URL shows the image on GitHub.
    const label = alt?.trim() || "image";
    return resolved ? (
      <a
        href={resolved}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        data-blocked-image=""
        className="rr-notes__blocked"
      >
        {label}
      </a>
    ) : (
      <span data-blocked-image="" className="rr-notes__blocked">
        {label}
      </span>
    );
  };
}

export function readmeComponents(repository: string): MarkdownComponents {
  return {
    a: readmeLink(repository),
    img: readmeImage(repository),
    pre: NotePre,
    table: NoteTable,
  };
}
